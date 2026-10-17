// Testes da wiki no Edge, sem janela.
// Uso: node tests/rodar.js            (todos os cenários)
//      node tests/rodar.js busca npcs (só os cenários citados)
// Capturas de tela ficam em tests/.saida/. Sai com código 1 se alguma checagem falhar.
const fs = require('fs');
const path = require('path');
const { abrirEdge } = require('./lib/edge');
const { subirServidores } = require('./lib/servidores');
const { travar } = require('./lib/trava');

const pastaCenarios = path.join(__dirname, 'cenarios');
const saida = path.join(__dirname, '.saida');
fs.mkdirSync(saida, { recursive: true });

class Relatorio {
  constructor() { this.itens = []; }
  // fn devolve [ok, detalhe]; um erro conta como falha, com a mensagem.
  async passo(nome, fn) {
    const inicio = Date.now();
    try {
      const [ok, detalhe = ''] = await fn();
      this.itens.push({ nome, ok: Boolean(ok), detalhe: String(detalhe), ms: Date.now() - inicio });
    } catch (error) {
      this.itens.push({ nome, ok: false, detalhe: `erro: ${error.message}`, ms: Date.now() - inicio });
    }
  }
}

(async () => {
  const pedidos = process.argv.slice(2);
  const todos = fs.readdirSync(pastaCenarios).filter(file => file.endsWith('.js')).sort();
  const escolhidos = pedidos.length ? todos.filter(file => pedidos.includes(path.basename(file, '.js'))) : todos;
  if (!escolhidos.length) { console.error(`Nenhum cenário com esse nome. Existem: ${todos.map(file => path.basename(file, '.js')).join(', ')}`); process.exit(1); }

  // Um teste com navegador por vez neste PC (as sessões dividem o Foundry de teste e as portas).
  await travar();
  const servidores = await subirServidores();
  if (!servidores.rede) console.log('Sem IP de rede: os testes que simulam um jogador em outro aparelho serão pulados.');
  let falhas = 0;
  let porta = 9340;
  try {
    for (const file of escolhidos) {
      const cenario = require(path.join(pastaCenarios, file));
      const nome = path.basename(file, '.js');
      const relatorio = new Relatorio();
      const edge = await abrirEdge({ porta: porta++, saida, prefixo: `${nome}-` });
      const inicio = Date.now();
      try {
        await cenario({ edge, servidores, r: relatorio });
      } catch (error) {
        relatorio.itens.push({ nome: 'cenário', ok: false, detalhe: `parou com erro: ${error.message}` });
      } finally {
        const erros = edge.erros.filter(erro => !/favicon/.test(erro));
        relatorio.itens.push({ nome: 'sem erros de JS na página', ok: erros.length === 0, detalhe: erros.slice(0, 3).join(' | ') });
        await edge.fechar();
      }
      const ruins = relatorio.itens.filter(item => !item.ok);
      falhas += ruins.length;
      console.log(`\n${ruins.length ? '✗' : '✓'} ${nome} (${relatorio.itens.length - ruins.length}/${relatorio.itens.length}, ${Math.round((Date.now() - inicio) / 1000)} s)`);
      for (const item of relatorio.itens) {
        if (!item.ok || process.env.DETALHES) console.log(`  ${item.ok ? '✓' : '✗'} ${item.nome}${item.detalhe ? `: ${item.detalhe.slice(0, Number(process.env.LARGURA || 220))}` : ''}${process.env.DETALHES && item.ms > Number(process.env.LIMITE_MS || 2000) ? ` (${(item.ms / 1000).toFixed(1)} s)` : ''}`);
      }
    }
  } finally {
    await servidores.parar();
  }
  console.log(falhas ? `\n${falhas} checagem(ns) falharam.` : '\nTudo certo.');
  process.exit(falhas ? 1 : 0);
})().catch(error => { console.error(error.message); process.exit(1); });

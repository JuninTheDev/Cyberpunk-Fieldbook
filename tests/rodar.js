// Testes da wiki no Edge, sem janela.
// Uso: node tests/rodar.js            (todos os cenários)
//      node tests/rodar.js busca npcs (só os cenários citados)
// Capturas de tela ficam em tests/.saida/. Sai com código 1 se alguma checagem falhar, e com 2 se alguma parte foi
// pulada (o Foundry 14 que não está no PC, a mesa do servidor em uso): aí a rodada não vale como portão (o C54).
// PERMITIR_PULAR=1 sai com 0 mesmo com o pulo.
const fs = require('fs');
const path = require('path');
const { abrirEdge } = require('./lib/edge');
const { subirServidores } = require('./lib/servidores');
const { travar } = require('./lib/trava');
const { Relatorio, codigoDeSaida, resumo } = require('./lib/relatorio');

const pastaCenarios = path.join(__dirname, 'cenarios');
const saida = path.join(__dirname, '.saida');
fs.mkdirSync(saida, { recursive: true });

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
  let pulados = 0;
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
      const pulos = relatorio.itens.filter(item => item.pulado);
      falhas += ruins.length;
      pulados += pulos.length;
      const contados = relatorio.itens.length - pulos.length;
      console.log(`\n${ruins.length ? '✗' : pulos.length ? '–' : '✓'} ${nome} (${contados - ruins.length}/${contados}${pulos.length ? `, ${pulos.length} parte(s) pulada(s)` : ''}, ${Math.round((Date.now() - inicio) / 1000)} s)`);
      for (const item of relatorio.itens) {
        if (item.pulado) { console.log(`  – PULADO: ${item.nome}${item.detalhe ? `: ${item.detalhe}` : ''}`); continue; }
        if (!item.ok || process.env.DETALHES) console.log(`  ${item.ok ? '✓' : '✗'} ${item.nome}${item.detalhe ? `: ${item.detalhe.slice(0, Number(process.env.LARGURA || 220))}` : ''}${process.env.DETALHES && item.ms > Number(process.env.LIMITE_MS || 2000) ? ` (${(item.ms / 1000).toFixed(1)} s)` : ''}`);
      }
    }
  } finally {
    await servidores.parar();
  }
  const permitirPular = process.env.PERMITIR_PULAR === '1';
  console.log(`\n${resumo({ falhas, pulados, permitirPular })}`);
  process.exit(codigoDeSaida({ falhas, pulados, permitirPular }));
})().catch(error => { console.error(error.message); process.exit(1); });

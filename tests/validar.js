// Verificações independentes das outras sessões: sem Edge, portas ou Foundry.
// Uso: node tests/validar.js [sintaxe documentos base regressoes]
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const raiz = path.resolve(__dirname, '..');
const tarefas = {
  sintaxe: () => require('./lib/validacao-estatica').validarEstatico({ raiz, r }),
  documentos: () => require('./lib/documentos-estaticos').validarDocumentos({ raiz, r }),
  base: () => require('./lib/base-estatica').validarBase({ raiz, r }),
  regressoes: () => {
    // As regressões dos validadores também usam só dados temporários próprios.
    const pasta = path.join(__dirname, 'isolados');
    const arquivos = fs.readdirSync(pasta).filter(nome => nome.endsWith('.test.js')).sort().map(nome => path.join(pasta, nome));
    if (!arquivos.length) throw new Error('Nenhuma regressão isolada encontrada.');
    const resultado = spawnSync(process.execPath, ['--test', ...arquivos], { cwd: raiz, stdio: 'inherit', windowsHide: true });
    if (resultado.error) throw resultado.error;
    if (resultado.status !== 0) throw new Error(`As regressões isoladas falharam${resultado.signal ? ` (${resultado.signal})` : ''}.`);
  }
};
let checagens = 0;
let falhas = 0;
const r = {
  async passo(nome, fn) {
    checagens += 1;
    try {
      const [ok, detalhe = ''] = await fn();
      if (!ok) falhas += 1;
      if (!ok || process.env.DETALHES) console.log(`  ${ok ? '✓' : '✗'} ${nome}${detalhe ? `: ${detalhe}` : ''}`);
    } catch (error) {
      falhas += 1;
      console.error(`  ✗ ${nome}: ${error.message}`);
    }
  }
};

(async () => {
  const pedidos = process.argv.slice(2);
  if (pedidos.length === 1 && pedidos[0] === '--help') {
    console.log('Uso: node tests/validar.js [sintaxe documentos base regressoes]');
    console.log('Sem argumentos, executa todas as verificações. Não abre navegador, portas ou Foundry.');
    return;
  }
  const nomes = pedidos.length ? [...new Set(pedidos)] : Object.keys(tarefas);
  const desconhecidos = nomes.filter(nome => !Object.hasOwn(tarefas, nome));
  if (desconhecidos.length) throw new Error(`Verificação desconhecida: ${desconhecidos.join(', ')}. Use ${Object.keys(tarefas).join(', ')}.`);
  for (const nome of nomes) {
    const antes = falhas;
    const inicio = Date.now();
    try { await tarefas[nome](); } catch (error) { falhas += 1; console.error(`  ✗ ${error.message}`); }
    console.log(`${falhas === antes ? '✓' : '✗'} ${nome} (${Date.now() - inicio} ms)`);
  }
  console.log(falhas ? `${falhas} falha(s).` : `Tudo certo: ${checagens} verificações estáticas${nomes.includes('regressoes') ? ' e as regressões isoladas passaram' : ' passaram'}.`);
  process.exitCode = falhas ? 1 : 0;
})().catch(error => { console.error(error.message); process.exitCode = 1; });

// Conferências da base da campanha que só leem arquivos: sem navegador, servidor ou Foundry.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// r.passo(nome, fn) recebe uma função assíncrona que devolve [ok, detalhe].
// Retorna a base lida para que o cenário da wiki use as mesmas contagens nos testes de interface.
async function validarBase({ raiz, r }) {
  const pasta = path.join(raiz, 'documentos', 'morana');
  const B = require(path.join(raiz, 'campanha-base.js'));
  const texto = fs.readFileSync(path.join(pasta, 'base-da-campanha.md'), 'utf8');
  const base = B.ler(texto);
  // Os arquivos da wiki expõem os dados em window; cada invocação recebe um contexto próprio.
  const contexto = vm.createContext({ window: {} });
  for (const nome of ['mestre-npcs.js', 'campaign-map.js']) {
    const arquivo = path.join(raiz, nome);
    vm.runInContext(fs.readFileSync(arquivo, 'utf8'), contexto, { filename: arquivo });
  }
  const npcs = contexto.window.npcStatBlocks.data;
  const marcadores = contexto.window.campaignMapData.markers;

  await r.passo('a base lê sem erro e bate com as fichas de NPC, os pontos do mapa e o elenco do Foundry', async () => {
    const problemas = B.conferir(base, {
      fichas: [...npcs.mooks, ...npcs.lieutenants, ...npcs.bosses, ...npcs.boss, ...npcs.campaignCast].map(card => card.name),
      marcadores: marcadores.map(marker => marker.id),
      elenco: npcs.campaignCast.map(card => card.name)
    });
    const contagem = `${base.pessoas.length} pessoas, ${base.faccoes.length} facções, ${base.lugares.length} lugares, ${base.pecas.length} peças, ${base.relogios.map(item => `${item.chave} ${item.segmentos.length}`).join('/')}, ${base.segredos.length} segredos`;
    const ok = !problemas.length && base.pecas.length >= 1 && base.lugares.length >= 4 && base.pessoas.length >= 5 && base.relogios.every(item => item.segmentos.length > 0);
    return [ok, problemas.slice(0, 5).join(' · ') || contagem];
  });

  await r.passo('as citações dos documentos ({{base:...}} e {{doc:arquivo.md#secao}}) apontam para o que existe', async () => {
    const quebradas = [];
    for (const nome of fs.readdirSync(pasta).filter(arquivo => arquivo.endsWith('.md'))) {
      const doc = fs.readFileSync(path.join(pasta, nome), 'utf8');
      const expandido = B.expandir(doc, base, B.vazio(), {});
      for (const m of expandido.matchAll(/\*\((citação desconhecida|relógio "[^"]+" não existe)[^)]*\)\*/g)) quebradas.push(`${nome}: ${m[0]}`);
      for (const [, arquivo, secao] of doc.matchAll(/^\{\{doc:([\w.-]+\.md)#([\w-]+)\}\}\s*$/gm)) {
        const alvo = path.join(pasta, arquivo);
        if (!fs.existsSync(alvo) || !B.trechos(fs.readFileSync(alvo, 'utf8'), [secao])) quebradas.push(`${nome}: ${arquivo}#${secao}`);
      }
    }
    const citacoes = fs.readdirSync(pasta).filter(arquivo => arquivo.endsWith('.md')).reduce((total, nome) => total + (fs.readFileSync(path.join(pasta, nome), 'utf8').match(/^\{\{(base|doc):/gm) || []).length, 0);
    return [!quebradas.length && citacoes >= 3, quebradas.slice(0, 5).join(' · ') || `${citacoes} citações conferidas`];
  });

  await r.passo('as cópias e a trama antiga saíram: Quem é quem, a tabela do diário, o elenco escrito à mão e os documentos da história de antes', async () => {
    const ler = nome => fs.readFileSync(path.join(pasta, nome), 'utf8');
    const index = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
    // A história recomeçou depois da Sessão 1; a trama nova fica fora do repositório público.
    const antigos = ['quem-e-quem', 'dossie-da-campanha', 'fundacao-da-campanha', 'personagens-da-campanha', 'ganchos-dos-personagens', 'roteiro-da-campanha', 'sessao-01-a-maleta', 'sessao-02-o-hospital-queimado', 'sessao-03-a-coleira'];
    const casos = {
      'os documentos antigos não existem': antigos.every(nome => !fs.existsSync(path.join(pasta, `${nome}.md`))),
      'nada aponta para eles': antigos.every(nome => !index.includes(`${nome}.md`) && fs.readdirSync(pasta).every(arquivo => !arquivo.endsWith('.md') || !ler(arquivo).includes(`${nome}.md`))),
      'diário sem a tabela dos NPCs': !/\| Wakako Okada \| Ativa \|/.test(ler('diario-da-campanha.md')),
      'index.html sem o elenco escrito à mão': !/Contratante \/ aliada ambígua/.test(index) && !/const campaignClocks/.test(index)
    };
    const errados = Object.entries(casos).filter(([, ok]) => !ok).map(([nome]) => nome);
    return [!errados.length, errados.join(' · ') || `${Object.keys(casos).length} conferências`];
  });

  await r.passo('o Foundry recebe o texto da base: cada ator do elenco tem "Na campanha" com quem é e o lado', async () => {
    const sem = npcs.campaignCast.filter(card => {
      const pessoa = base.pessoas.find(item => item.campos.ficha === card.name);
      const html = pessoa ? B.paraFoundry(pessoa) : '';
      return !/<h3>Na campanha<\/h3>/.test(html) || !/<b>Quem é:<\/b>/.test(html) || !/<b>Lado:<\/b>/.test(html);
    }).map(card => card.name);
    return [!sem.length, sem.join(', ') || `${npcs.campaignCast.length} atores`];
  });

  return base;
}

module.exports = { validarBase };

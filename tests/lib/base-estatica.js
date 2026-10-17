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
    const ok = !problemas.length && base.pecas.length === 3 && base.relogios.map(item => item.segmentos.length).join() === '6,8,6' && base.pessoas.length >= 20;
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
    return [!quebradas.length && citacoes >= 15, quebradas.slice(0, 5).join(' · ') || `${citacoes} citações conferidas`];
  });

  await r.passo('as cópias saíram: Quem é quem, as tabelas da fundação, do diário e de Personagens, e as páginas escritas no index.html', async () => {
    const ler = nome => fs.readFileSync(path.join(pasta, nome), 'utf8');
    const index = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
    const casos = {
      'quem-e-quem.md não existe': !fs.existsSync(path.join(pasta, 'quem-e-quem.md')),
      'fundação sem a tabela das partes': !/\| A Chave \| Fragmento/.test(ler('fundacao-da-campanha.md')),
      'fundação sem a lista do relógio de Sato': !/^1\. \*\*Recuperar a Chave\*\*/m.test(ler('fundacao-da-campanha.md')),
      'diário sem a tabela dos NPCs': !/\| Wakako Okada \| Ativa \|/.test(ler('diario-da-campanha.md')),
      'Personagens sem o guia rápido': !/\| Wakako Okada \| Contratante e aliada ambígua \|/.test(ler('personagens-da-campanha.md')),
      'index.html sem o elenco escrito à mão': !/Contratante \/ aliada ambígua/.test(index) && !/const campaignClocks/.test(index),
      'Kobo: o guia diz o mesmo que a Sessão 2 (os Scavs só se o corpo ficou)': /Se o grupo deixou o corpo de Kobo/.test(ler('guia-night-city-2077.md')) && /Se o grupo deixou o corpo de Kobo para trás/.test(ler('sessao-02-o-hospital-queimado.md'))
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

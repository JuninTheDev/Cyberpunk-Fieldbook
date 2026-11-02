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

  await r.passo('Citado em: as seções dos documentos (#, ## e ###; o #### fica na de cima), os Também e os outros registros, sem o próprio', async () => {
    const pequena = B.ler([
      '## Pessoas', '### Ana Prata', '- **Quem é:** Fixer', '- **Também:** Prata', '- **Relações:** Trabalha para a Corpo Azul', '',
      '### Beto', '- **Quem é:** Mensageiro', 'Fala com Ana Prata toda semana.', '',
      '## Facções', '### Corpo Azul', '- **Quer:** tudo', '',
      '## Relógios', '### A virada', '- **Segmentos:** um; dois', 'Ana Prata marca o relógio.'
    ].join('\n'));
    const documentos = [
      { id: 'docUm', titulo: 'Um', texto: ['# Um', 'Ana Prata no começo.', '## Primeira parte', 'Prata aparece de novo. Beto também.', '### Detalhe', '#### Sub', 'Corpo Azul aqui.', '## `Código` e mais', 'Ana Prata.', '## Fala de **Beto**', 'nada', '## Notas', 'Beto.', '## Notas', 'Beto de novo.'].join('\r\n') },
      { id: 'docDois', titulo: 'Dois & três', texto: 'Só Prata.' }
    ];
    const mapa = B.citacoes(pequena, documentos);
    const resumo = id => { const c = mapa.get(id); return c ? { documentos: c.documentos.map(doc => `${doc.id}:${doc.secoes.map(secao => `${secao.secao}=${secao.titulo}`).join(',')}`), registros: c.registros.map(item => item.id) } : null; };
    const esperado = {
      'ana-prata': { documentos: ['docUm:primeira-parte=Primeira parte,codigo-e-mais=Código e mais', 'docDois:'], registros: ['beto', 'a-virada'] },
      // Duas seções com o mesmo título: o endereço leva à primeira, e o link aparece uma vez.
      beto: { documentos: ['docUm:primeira-parte=Primeira parte,fala-de=Fala de Beto,notas=Notas'], registros: [] },
      'corpo-azul': { documentos: ['docUm:detalhe=Detalhe'], registros: ['ana-prata'] },
      'a-virada': null
    };
    const errados = Object.entries(esperado).filter(([id, valor]) => JSON.stringify(resumo(id)) !== JSON.stringify(valor)).map(([id]) => `${id}: ${JSON.stringify(resumo(id))}`);
    const linha = B.citadoEm(mapa.get('ana-prata'));
    const linhaEsperada = '<b>Citado em:</b> <a href="#docUm">Um</a> (<a href="#docUm/primeira-parte">Primeira parte</a>, <a href="#docUm/codigo-e-mais">Código e mais</a>); <a href="#docDois">Dois &amp; três</a>; na base: <a href="#people/beto">Beto</a>, <a href="#notes/a-virada">A virada</a>';
    if (linha !== linhaEsperada) errados.push(`linha: ${linha}`);
    if (B.citadoEm(mapa.get('a-virada')) !== '') errados.push('a virada tem linha');
    // Na base de verdade: a Wakako aparece no Diário, a Mina pela relação com a Wakako, e nenhum registro cita a si mesmo.
    const docs = ['diario-da-campanha.md', 'handouts-da-campanha.md', 'sessao-zero.md', 'guia-night-city-2077.md'].map(nome => ({ id: nome, titulo: nome, texto: fs.readFileSync(path.join(pasta, nome), 'utf8') }));
    const real = B.citacoes(base, docs);
    const wakako = real.get('wakako-okada');
    if (!wakako || !wakako.documentos.some(doc => doc.id === 'diario-da-campanha.md' && doc.secoes.length)) errados.push('a Wakako sem o Diário');
    if (!(real.get('mina-kuroda') || { registros: [] }).registros.some(item => item.id === 'wakako-okada')) errados.push('a Mina sem a Wakako');
    const proprios = [...real.entries()].filter(([id, c]) => c.registros.some(item => item.id === id)).map(([id]) => id);
    if (proprios.length) errados.push(`citam a si mesmos: ${proprios.join(', ')}`);
    return [!errados.length, errados.slice(0, 4).join(' · ') || `${real.size} registros citados nos ${docs.length} documentos`];
  });

  await r.passo('[[Nome]]: acha o registro pelo nome ou pelos Também (sem ligar para maiúsculas e acentos), conta no Citado em, e nenhum documento tem link quebrado', async () => {
    const pequena = B.ler([
      '## Pessoas', '### Ana Prata', '- **Quem é:** Fixer', '- **Também:** Prata', '- **Lado:** [[corpo azul|a corpo]]', '',
      '### Beto', '- **Quem é:** Mensageiro', 'Deve a [[Ninguém]].', '',
      '## Facções', '### Corpo Azul', '- **Quer:** tudo', '',
      '## Relógios', '### A Virada', '- **Segmentos:** um; dois'
    ].join('\n'));
    const ana = pequena.todos.get('ana-prata');
    const doc = B.citacoes(pequena, [{ id: 'd', titulo: 'D', texto: '## Parte\nFala com [[ana prata|ela]].\n## Com [[Beto|o mensageiro]]\nnada' }]);
    const tabela = B.tabelaPessoas(pequena, B.vazio());
    const foundry = B.paraFoundry(ana);
    const casos = {
      'pelo nome': (B.registroDoLink(pequena, 'Ana Prata') || {}).id === 'ana-prata',
      'pelo Também, em minúsculas': (B.registroDoLink(pequena, 'prata') || {}).id === 'ana-prata',
      'com acento': (B.registroDoLink(pequena, 'Béto') || {}).id === 'beto',
      'um relógio': (B.registroDoLink(pequena, 'a virada') || {}).id === 'a-virada',
      'sem registro': B.registroDoLink(pequena, 'Ninguém') === null,
      'os quebrados de um texto': JSON.stringify(B.linksQuebrados(pequena, 'Com [[Ana Prata]], [[ Ninguém | alguém ]] e [[Fulano]].')) === '["Ninguém","Fulano"]',
      'a conferência acusa o da base': JSON.stringify(B.conferir(pequena)) === '["Beto: o link [[Ninguém]] não acha registro."]',
      'conta no Citado em, em minúsculas': JSON.stringify(doc.get('ana-prata')) === '{"documentos":[{"id":"d","titulo":"D","secoes":[{"secao":"parte","titulo":"Parte"}]}],"registros":[]}',
      'o título da seção sem os colchetes': JSON.stringify(doc.get('beto').documentos[0].secoes) === '[{"secao":"com","titulo":"Com o mensageiro"}]',
      'conta na base': JSON.stringify(B.citacoes(pequena, []).get('corpo-azul').registros.map(item => item.id)) === '["ana-prata"]',
      'na tabela, sem o "|" que quebra a coluna': tabela.includes('| [[corpo azul]] |'),
      'no Foundry, só o texto': foundry.includes('<b>Lado:</b> a corpo') && !foundry.includes('[[')
    };
    const errados = Object.entries(casos).filter(([, ok]) => !ok).map(([nome]) => nome);
    // Os documentos de verdade (os da campanha e os de Night City): nenhum [[Nome]] quebrado.
    const pastas = [pasta, path.join(raiz, 'documentos', 'night-city')];
    const quebrados = pastas.flatMap(dir => fs.readdirSync(dir).filter(nome => nome.endsWith('.md')).flatMap(nome => B.linksQuebrados(base, fs.readFileSync(path.join(dir, nome), 'utf8')).map(alvo => `${nome}: [[${alvo}]]`)));
    return [!errados.length && !quebrados.length, [...errados, ...quebrados].slice(0, 5).join(' · ') || `${Object.keys(casos).length} casos; nenhum link quebrado nos documentos`];
  });

  await r.passo('Relações "Nome (papel)": o nome vira [[link]] com o papel, o cartão do outro (de qualquer tipo) mostra a relação de volta, o texto solto fica como está e a conferência acusa o nome sem registro', async () => {
    const texto = [
      '## Pessoas', '### Ana Prata', '- **Quem é:** Fixer', '- **Também:** Prata',
      '- **Relações:** Beto (guarda);corpo azul  ( patroa ); Ninguém (amigo); trabalha no Bar Azul (às vezes) e mais; A Mala (dona)', '',
      '### Beto', '- **Quem é:** Mensageiro', '- **Relações:** Irmão da Prata (o mais novo) e sócio dela; viu (de longe) A Mala (aberta)', '',
      '## Facções', '### Corpo Azul', '- **Quer:** tudo', '- **Relações:** prata (contato); Bar Azul (sede)', '',
      '## Lugares', '### Bar Azul', '- **Distrito:** Watson', '- **Relações:** A Virada (ameaça)', '',
      '## Peças de Morana', '### A Mala', '- **O que é:** Uma mala', '- **Onde:** Com Ana', '- **Relações:** Beto (carrega); A Mala (ela mesma)', '',
      '## Relógios', '### A Virada', '- **Segmentos:** um; dois'
    ].join('\n');
    const pequena = B.ler(texto);
    const relacoesDe = id => B.cartao(pequena.todos.get(id), B.vazio(), pequena).split('\n').filter(linha => /^- \*\*Relações/.test(linha));
    const volta = Object.fromEntries([...B.relacoesDeVolta(pequena)].map(([id, lista]) => [id, lista.map(item => `${item.de.id}:${item.papel}`)]));
    const esperado = {
      // O "corpo azul" e o "prata" acham o registro pelo nome e pelo Também, sem ligar para maiúsculas; o link mostra o nome.
      'ana-prata': ['- **Relações:** [[Beto]] (guarda);[[Corpo Azul]] (patroa); Ninguém (amigo); trabalha no Bar Azul (às vezes) e mais; [[A Mala]] (dona)', '- **Relações de outros:** [[Corpo Azul]]: contato'],
      // O parêntese no meio da frase, ou antes do nome, não é relação: o campo fica como está.
      beto: ['- **Relações:** Irmão da Prata (o mais novo) e sócio dela; viu (de longe) A Mala (aberta)', '- **Relações de outros:** [[Ana Prata]]: guarda; [[A Mala]]: carrega'],
      'corpo-azul': ['- **Relações:** [[Ana Prata]] (contato); [[Bar Azul]] (sede)', '- **Relações de outros:** [[Ana Prata]]: patroa'],
      // A relação com um relógio vira o link dele (no Estado da campanha); o relógio não tem cartão.
      'bar-azul': ['- **Relações:** [[A Virada]] (ameaça)', '- **Relações de outros:** [[Corpo Azul]]: sede'],
      // A relação consigo mesma não volta.
      'a-mala': ['- **Relações:** [[Beto]] (carrega); [[A Mala]] (ela mesma)', '- **Relações de outros:** [[Ana Prata]]: dona']
    };
    const errados = Object.entries(esperado).filter(([id, linhas]) => JSON.stringify(relacoesDe(id)) !== JSON.stringify(linhas)).map(([id]) => `${id}: ${JSON.stringify(relacoesDe(id))}`);
    const casos = {
      'as relações da Ana': JSON.stringify(B.relacoes(pequena, pequena.todos.get('ana-prata')).map(item => `${item.nome}=${item.papel}=${item.item ? item.item.id : null}`)) === '["Beto=guarda=beto","corpo azul=patroa=corpo-azul","Ninguém=amigo=null","A Mala=dona=a-mala"]',
      'o texto solto não tem relação': B.relacoes(pequena, pequena.todos.get('beto')).length === 0,
      'as de volta': JSON.stringify(volta) === '{"beto":["ana-prata:guarda","a-mala:carrega"],"corpo-azul":["ana-prata:patroa"],"a-mala":["ana-prata:dona"],"ana-prata":["corpo-azul:contato"],"bar-azul":["corpo-azul:sede"],"a-virada":["bar-azul:ameaça"]}',
      'a conferência acusa o nome sem registro': JSON.stringify(B.conferir(pequena)) === '["Ana Prata: a relação com \\"Ninguém\\" não acha registro."]',
      'na citação {{base:item:beto}}': B.expandir('{{base:item:beto}}', pequena, B.vazio()).includes('- **Relações de outros:** [[Ana Prata]]: guarda; [[A Mala]]: carrega'),
      'em Pessoas e facções': ['- **Relações de outros:** [[Ana Prata]]: guarda; [[A Mala]]: carrega', '- **Relações:** [[Ana Prata]] (contato); [[Bar Azul]] (sede)'].every(linha => B.paginaPessoas(texto, B.vazio()).includes(linha)),
      'em Lugares e peças': ['- **Relações de outros:** [[Corpo Azul]]: sede', '- **Relações de outros:** [[Ana Prata]]: dona'].every(linha => B.paginaLugares(texto, B.vazio()).includes(linha))
    };
    errados.push(...Object.entries(casos).filter(([, ok]) => !ok).map(([nome]) => nome));
    // A base de verdade, como está: as Relações são texto solto, e os cartões mostram o campo como antes, sem as de volta.
    const mudados = [...base.todos.values()].filter(item => item.campos.relacoes && B.cartao(item, B.vazio(), base).split('\n').filter(linha => /^- \*\*Relações/.test(linha)).join('\n') !== `- **Relações:** ${item.campos.relacoes}`).map(item => item.id);
    if (mudados.length) errados.push(`na base de verdade, mudaram: ${mudados.join(', ')}`);
    return [!errados.length, errados.slice(0, 4).join(' · ') || `${Object.keys(esperado).length} cartões e ${Object.keys(casos).length} casos; ${[...base.todos.values()].filter(item => item.campos.relacoes).length} relações em texto solto na base, iguais`];
  });

  return base;
}

module.exports = { validarBase };

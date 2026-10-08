// Os documentos da campanha (documentos/): termos no padrão da wiki, acentuação, nomes de perícia, arquivos e links
// citados, e todos aparecendo na wiki do mestre. No navegador: o título não se repete e um link leva à ficha certa.
const fs = require('fs');
const path = require('path');

module.exports = async ({ edge, servidores, r }) => {
  const raiz = servidores.raiz;
  const pasta = path.join(raiz, 'documentos');
  const docs = [];
  for (const campanha of fs.readdirSync(pasta)) {
    const dir = path.join(pasta, campanha);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const nome of fs.readdirSync(dir).filter(file => file.endsWith('.md'))) docs.push({ arquivo: `documentos/${campanha}/${nome}`, nome, texto: fs.readFileSync(path.join(dir, nome), 'utf8') });
  }
  const linhas = doc => doc.texto.split(/\r?\n/).map((texto, index) => ({ texto, onde: `${doc.arquivo}:${index + 1}` }));
  // Sem o que está entre crases (nomes de arquivo, código) e sem o destino dos links ([texto](destino)).
  const semCodigo = texto => texto.replace(/`[^`]*`/g, ' ').replace(/\]\([^)]*\)/g, ']');
  const fold = texto => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

  await r.passo('termos no padrão da wiki (Gravemente Ferido, fixer, nomes de perícia)', async () => {
    const proibidos = [
      [/Seriamente Ferid/i, 'use "Gravemente Ferido"'],
      [/\*\*Canal:\*\*|\| Canal (que|de|ligad|veteran)/, 'o termo da wiki é "fixer"'],
      [/\bCybertech\b/, 'a perícia é "Cybertecnologia"'],
      [/Engana[cç][aã]o/i, 'não é perícia do RED: use Atuação ou Persuasão'],
      [/Eletr[oô]nica\/Tec\./, 'a perícia é "Tecnologia Eletrônica/Segurança"'],
      [/Resistir [àa] Tortura/, 'a perícia é "Resistir Tortura/Drogas"'],
      [/\*\*Bases:\*\*[^\n]*\bAutofire\b/, 'nas bases, a perícia é "Disparo Automático"']
    ];
    const achados = docs.flatMap(doc => linhas(doc).flatMap(({ texto, onde }) => proibidos.filter(([re]) => re.test(semCodigo(texto))).map(([, dica]) => `${onde} (${dica})`)));
    return [!achados.length, achados.slice(0, 6).join(' · ') || `${docs.length} documentos sem termos fora do padrão`];
  });

  await r.passo('acentuação: nenhuma palavra comum sem acento (não, você, sessão, também, código...)', async () => {
    const semAcento = ['nao', 'voce', 'voces', 'sessao', 'sessoes', 'tambem', 'ate', 'entao', 'alem', 'tres', 'historia', 'codigo', 'virus', 'policia', 'medico', 'medica', 'clinica', 'deposito', 'nucleo', 'informacao', 'informacoes', 'ninguem', 'alguem', 'tecnico', 'possivel', 'proprio', 'propria', 'unico', 'unica', 'estao', 'sao', 'mao', 'maos', 'acao', 'acoes', 'funcao', 'relogio', 'pericia', 'pericias'];
    const achados = docs.flatMap(doc => linhas(doc).flatMap(({ texto, onde }) => (semCodigo(texto).match(/\p{L}+/gu) || []).filter(palavra => semAcento.includes(palavra.toLowerCase())).map(palavra => `${onde} "${palavra}"`)));
    const porArquivo = [...new Set(achados.map(item => item.split(':')[0]))];
    return [!achados.length, achados.length ? `${achados.length} palavra(s) em ${porArquivo.join(', ')} · ${achados.slice(0, 4).join(' · ')}` : `${docs.length} documentos acentuados`];
  });

  await r.passo('nomes de perícia: as bases e os testes usam os nomes da página Perícias', async () => {
    const regras = fs.readFileSync(path.join(raiz, 'system-rules.js'), 'utf8');
    const pericias = [...regras.matchAll(/^\s*\['([^']+)', '([^']+)', '(INT|REF|DEX|TECH|COOL|WILL|LUCK|MOVE|BODY|EMP)'/gm)].map(m => m[1]);
    // Habilidades de Role, STATs e o que mais aparece junto de um DV sem ser perícia.
    const outros = ['Interface', 'Medicina', 'Iniciativa', 'Death Save', 'Programa', 'Enxame', 'Entidade', 'Tech Bag', 'INT', 'REF', 'DEX', 'TECH', 'COOL', 'WILL', 'MOVE', 'BODY', 'EMP'];
    const conhecidos = new Set([...pericias, ...outros].map(fold));
    const achados = [];
    const conferir = (nome, onde) => {
      for (const parte of nome.replace(/\*+/g, '').split(/\s+ou\s+|\s*\+\s*/)) {
        const chave = fold(parte.replace(/\s*\(.*$/, ''));
        if (chave && chave.length < 45 && !conhecidos.has(chave)) achados.push(`${onde} "${parte}"`);
      }
    };
    for (const doc of docs) for (const { texto, onde } of linhas(doc)) {
      const bases = texto.match(/\*\*Bases:\*\*(.*)$/);
      if (bases) for (const item of bases[1].split(',')) { const m = item.trim().match(/^(.+?)\s+\d+/); if (m) conferir(m[1], onde); }
      for (const m of semCodigo(texto).matchAll(/teste de ([A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ/ .-]*?)(?=\s*(\(|DV\b|contra\b|,|\.|;| para\b| revela| mostra| ou\b|$))/g)) conferir(m[1], onde);
    }
    return [!achados.length, achados.slice(0, 6).join(' · ') || `${pericias.length} perícias conferidas`];
  });

  await r.passo('arquivos citados existem e todo documento aparece na wiki do mestre', async () => {
    const existentes = new Set(docs.map(doc => doc.nome));
    const faltando = [];
    for (const doc of docs) for (const { texto, onde } of linhas(doc)) {
      for (const m of texto.matchAll(/`([\w-]+\.md)`|\]\(([\w-]+\.md)(#[\w-]+)?\)/g)) { const nome = m[1] || m[2]; if (!existentes.has(nome)) faltando.push(`${onde} ${nome}`); }
    }
    const index = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
    // Os do Protocolo Morana são páginas do index.html; os das outras campanhas, o servidor lista sozinho.
    const foraDaWiki = docs.filter(doc => doc.arquivo.startsWith('documentos/morana/') && !index.includes(`'${doc.arquivo}'`)).map(doc => doc.arquivo);
    return [!faltando.length && !foraDaWiki.length, [...faltando.map(item => `falta ${item}`), ...foraDaWiki.map(item => `fora da wiki: ${item}`)].slice(0, 6).join(' · ') || `${docs.length} documentos, todos na wiki`];
  });

  await r.passo('links para fichas (#npcs/...) apontam para uma ficha que existe', async () => {
    global.window = global.window || {};
    delete require.cache[require.resolve(path.join(raiz, 'mestre-npcs.js'))];
    require(path.join(raiz, 'mestre-npcs.js'));
    const dados = window.npcStatBlocks.data;
    const slug = texto => fold(texto).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const fichas = new Set([...dados.mooks, ...dados.lieutenants, ...dados.bosses, ...dados.boss, ...dados.campaignCast].map(card => slug(card.name)));
    fichas.add('protocolo-morana-o-elenco');
    const quebrados = docs.flatMap(doc => linhas(doc).flatMap(({ texto, onde }) => [...texto.matchAll(/\]\(#npcs\/([\w-]+)\)/g)].filter(m => !fichas.has(m[1])).map(m => `${onde} #npcs/${m[1]}`)));
    return [!quebrados.length, quebrados.slice(0, 6).join(' · ') || `${fichas.size} fichas; links conferidos`];
  });

  // ---------- Na wiki ----------
  await r.passo('na wiki: o título do documento não se repete, e o link da tabela abre a ficha da Iskra', async () => {
    await edge.ir(`${servidores.local}/#docQuemEQuem`, 1500);
    const repetidos = await edge.evaluate(`(() => { const t = document.querySelector('#content h2')?.textContent.trim(); return [...document.querySelectorAll('#md-doc h3')].filter(h => h.textContent.trim() === t).length; })()`);
    await edge.evaluate(`document.querySelector('#md-doc a[href="#npcs/iskra-voss"]').click()`);
    await edge.sleep(1200);
    const parou = await edge.evaluate(`({ pagina: wikiApp.currentPage(), foco: (document.querySelector('#content .flash')?.dataset.toc || '') })`);
    return [repetidos === 0 && parou.pagina === 'npcs' && parou.foco === 'Iskra Voss', `títulos repetidos ${repetidos} · ${JSON.stringify(parou)}`];
  });
  await r.passo('na wiki: a busca acha um ### dos documentos como resultado próprio', async () => {
    await edge.ir(`${servidores.local}/#home`, 800);
    await edge.evaluate(`(() => { const s = document.getElementById('search'); s.value = 'trava e a maleta'; s.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    await edge.sleep(400);
    const resultados = await edge.evaluate(`[...document.querySelectorAll('#content .result')].slice(0, 5).map(r => r.querySelector('strong').textContent)`);
    await edge.evaluate(`(() => { const s = document.getElementById('search'); s.value = ''; s.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    return [resultados.some(titulo => /A trava e a maleta/.test(titulo)), resultados.join(' | ')];
  });
};

// Conferências dos documentos que só leem arquivos: não abrem navegador, servidor nem Foundry.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Os scripts da wiki expõem dados em window. Cada leitura usa seu próprio contexto, sem alterar
// global.window/global.document ou o cache de require do runner e dos outros cenários.
function janelaDoScript(raiz, arquivo) {
  const contexto = vm.createContext({ window: { addEventListener() {} }, document: { addEventListener() {} } });
  vm.runInContext(fs.readFileSync(path.join(raiz, arquivo), 'utf8'), contexto, { filename: arquivo, timeout: 1000 });
  return contexto.window;
}

async function validarDocumentos({ raiz, r }) {
  const pasta = path.join(raiz, 'documentos');
  const docs = [];
  for (const campanha of fs.readdirSync(pasta).sort()) {
    const dir = path.join(pasta, campanha);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const nome of fs.readdirSync(dir).filter(file => file.endsWith('.md')).sort()) {
      docs.push({ arquivo: `documentos/${campanha}/${nome}`, nome, texto: fs.readFileSync(path.join(dir, nome), 'utf8') });
    }
  }
  const porArquivo = new Map(docs.map(doc => [doc.arquivo, doc]));
  // Um caminho explícito é relativo ao documento de origem, dentro de documentos/. Para os
  // nomes sem diretório da wiki, a campanha vem primeiro e night-city é a biblioteca comum.
  // Os documentos comuns antigos também citam campanhas por nome: só aceitamos esse fallback
  // quando há um único destino. Outra campanha nunca encobre um arquivo local que falta.
  const resolver = (origem, destino) => {
    const local = path.posix.normalize(path.posix.join(path.posix.dirname(origem.arquivo), destino));
    if (!local.startsWith('documentos/')) return null;
    if (porArquivo.has(local)) return local;
    if (destino.includes('/')) return null;
    const comum = `documentos/night-city/${destino}`;
    if (porArquivo.has(comum)) return comum;
    if (origem.arquivo.startsWith('documentos/night-city/')) {
      const candidatos = docs.filter(doc => doc.nome === destino);
      if (candidatos.length === 1) return candidatos[0].arquivo;
    }
    return null;
  };
  const linhas = doc => doc.texto.split(/\r?\n/).map((texto, index) => ({ texto, onde: `${doc.arquivo}:${index + 1}` }));
  // Sem nomes de arquivo/código, destinos de links e citações {{base:...}}/{{doc:...}}.
  const semCodigo = texto => texto.replace(/`[^`]*`/g, ' ').replace(/\]\([^)]*\)/g, ']').replace(/\{\{[^}]*\}\}/g, ' ');
  const fold = texto => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const arquivoMd = '[\\w./-]+\\.md';

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
    const faltando = [];
    for (const doc of docs) for (const { texto, onde } of linhas(doc)) {
      for (const m of texto.matchAll(new RegExp('`(' + arquivoMd + ')`|\\]\\((' + arquivoMd + ')(#[\\w-]+)?\\)', 'g'))) {
        const nome = m[1] || m[2];
        if (!resolver(doc, nome)) faltando.push(`${onde} ${nome}`);
      }
    }
    const index = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
    const foraDaWiki = docs.filter(doc => doc.arquivo.startsWith('documentos/morana/') && !index.includes(`'${doc.arquivo}'`)).map(doc => doc.arquivo);
    return [!faltando.length && !foraDaWiki.length, [...faltando.map(item => `falta ${item}`), ...foraDaWiki.map(item => `fora da wiki: ${item}`)].slice(0, 6).join(' · ') || `${docs.length} documentos, todos na wiki`];
  });

  await r.passo('links para fichas (#npcs/...) apontam para uma ficha que existe', async () => {
    const dados = janelaDoScript(raiz, 'mestre-npcs.js').npcStatBlocks.data;
    const slug = texto => fold(texto).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const fichas = new Set([...dados.mooks, ...dados.lieutenants, ...dados.bosses, ...dados.boss, ...dados.campaignCast, ...(dados.kit || [])].map(card => slug(card.name)));
    fichas.add('protocolo-morana-o-elenco');
    fichas.add('fichas-do-mission-kit');
    const quebrados = docs.flatMap(doc => linhas(doc).flatMap(({ texto, onde }) => [...texto.matchAll(/\]\(#npcs\/([\w-]+)\)/g)].filter(m => !fichas.has(m[1])).map(m => `${onde} #npcs/${m[1]}`)));
    return [!quebrados.length, quebrados.slice(0, 6).join(' · ') || `${fichas.size} fichas; links conferidos`];
  });

  const handoutsDoc = porArquivo.get('documentos/morana/handouts-da-campanha.md');
  const handouts = JSON.parse(JSON.stringify(janelaDoScript(raiz, 'jogadores-painel.js').playerManager.parseHandouts(handoutsDoc.texto)));
  const citacoes = handouts.reduce((soma, item) => soma + item.parts.length, 0);
  // A história recomeçou depois da Sessão 1 (2026-10-20): ficaram os handouts entregues (H-04 e H-05), e os novos
  // entram em ordem, sem repetir o código.
  await r.passo('handouts: os da Sessão 1 e os novos em ordem, cada um com título para os jogadores e citação; todo H-xx citado existe', async () => {
    const codigos = handouts.map(item => item.code);
    const esperados = [...new Set(codigos)].sort();
    if (!codigos.includes('H-04') || !codigos.includes('H-05')) esperados.push('os da Sessão 1');
    const semTitulo = handouts.filter(item => !new RegExp(`^- \\*\\*Para os jogadores:\\*\\*`, 'm').test(handoutsDoc.texto.split(`### ${item.code} `)[1].split('\n### ')[0])).map(item => item.code);
    const citados = new Set(docs.flatMap(doc => [...doc.texto.matchAll(/\bH-(\d{2})\b/g)].map(m => `H-${m[1]}`)));
    const inexistentes = [...citados].filter(code => !codigos.includes(code));
    const ok = codigos.join() === esperados.join() && handouts.every(item => item.parts.length) && !semTitulo.length && !inexistentes.length;
    return [ok, `${codigos.length} handouts, ${citacoes} citações · sem título: ${semTitulo.join(', ') || 'nenhum'} · citados que não existem: ${inexistentes.join(', ') || 'nenhum'}`];
  });

  await r.passo('links para seções (arquivo.md#secao) apontam para um título que existe', async () => {
    const slug = texto => fold(texto.replace(/\*\*|`|\*/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const secoes = new Map(docs.map(doc => [doc.arquivo, new Set(doc.texto.split(/\r?\n/).filter(linha => /^#{1,4}\s/.test(linha)).map(linha => slug(linha.replace(/^#+\s+/, ''))))]));
    const quebrados = docs.flatMap(doc => linhas(doc).flatMap(({ texto, onde }) => [...texto.matchAll(new RegExp('\\]\\((' + arquivoMd + ')#([\\w-]+)\\)', 'g'))].filter(m => !(secoes.get(resolver(doc, m[1])) || new Set()).has(m[2])).map(m => `${onde} ${m[1]}#${m[2]}`)));
    return [!quebrados.length, quebrados.slice(0, 6).join(' · ') || 'todos os links de seção conferidos'];
  });

  return { docs, handoutsDoc, handouts, citacoes };
}

module.exports = { validarDocumentos };

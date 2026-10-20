// A base da campanha: um registro para cada pessoa, facção, lugar, peça da trama, relógio e segredo, num arquivo só
// (documentos/<campanha>/base-da-campanha.md). Pessoas e facções, Lugares e peças, o Estado da campanha e as tabelas
// do Diário são visões desse arquivo, e os documentos citam a base em vez de copiar (uma linha {{base:pecas}} vira a
// tabela). O que muda na mesa (com quem está a maleta, quem morreu, o segredo revelado) fica no servidor, com os relógios
// (mesa.json: estado e segredos), e aparece em todas as visões.
//
// O arquivo: "## Pessoas", "## Outros nomes", "## Facções", "## Lugares", "## Peças de Morana", "## Relógios" e
// "## Segredos"; cada registro é um "### Nome", com os campos em linhas "- **Campo:** valor" e o resto (texto e
// falas em ">") para o mestre.
//
// No navegador: window.campaignBase. No Node (testes, build do Foundry): require('./campanha-base.js').
(function (raiz) {
  'use strict';

  const SECOES = { 'Pessoas': 'pessoa', 'Outros nomes': 'pessoa', 'Facções': 'faccao', 'Lugares': 'lugar', 'Peças de Morana': 'peca', 'Relógios': 'relogio', 'Segredos': 'segredo' };
  const CAMPOS = {
    'Também': 'tambem', 'Quem é': 'quem', 'Lado': 'lado', 'Onde': 'onde', 'Aparece': 'aparece', 'Ficha': 'ficha', 'Situação': 'situacao',
    'Para os jogadores': 'publico', 'Mais': 'mais', 'Relações': 'relacoes', 'Quer': 'quer', 'Rosto': 'rosto', 'O que é': 'oque',
    'Arquitetura': 'arquitetura', 'Mapa': 'mapa', 'Chave': 'chave', 'Segmentos': 'segmentos', 'Revela': 'revela', 'Distrito': 'distrito'
  };
  const NOMES_DOS_TIPOS = { pessoa: 'Pessoa', faccao: 'Facção', lugar: 'Lugar', peca: 'Peça de Morana', relogio: 'Relógio', segredo: 'Segredo' };
  // Onde cada tipo tem o cartão: pessoas e facções em Pessoas e facções; lugares e peças em Lugares e peças.
  const PAGINA_DO_TIPO = { pessoa: 'people', faccao: 'people', lugar: 'lugares', peca: 'lugares' };
  const SITUACOES = ['Ativa', 'Ativo', 'Ferida', 'Ferido', 'Capturada', 'Capturado', 'Escondida', 'Escondido', 'Oculta', 'Oculto', 'Desaparecida', 'Desaparecido', 'Morta', 'Morto', 'Aliada do grupo', 'Aliado do grupo'];
  const ATITUDES = ['', 'Hostil', 'Desconfiada', 'Neutra', 'Amigável', 'Aliada'];

  const dobrar = texto => String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const slug = texto => dobrar(texto).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const esc = texto => String(texto ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Numa célula de tabela em Markdown, "|" quebraria a coluna.
  const celula = texto => String(texto ?? '').replace(/\|/g, '/').replace(/\s+/g, ' ').trim();
  const lista = texto => String(texto || '').split(';').map(item => item.trim()).filter(Boolean);

  // ---------------- Leitura do arquivo ----------------
  function ler(texto) {
    const base = { pessoas: [], faccoes: [], lugares: [], pecas: [], relogios: [], segredos: [], todos: new Map(), erros: [] };
    const colecao = { pessoa: base.pessoas, faccao: base.faccoes, lugar: base.lugares, peca: base.pecas, relogio: base.relogios, segredo: base.segredos };
    let tipo = null;
    let grupo = '';
    let atual = null;
    const fechar = () => {
      if (!atual) return;
      atual.texto = atual.linhas.join('\n').replace(/^\s+|\s+$/g, '');
      delete atual.linhas;
      atual = null;
    };
    for (const linha of String(texto || '').replace(/^﻿/, '').replace(/\r/g, '').split('\n')) {
      const secao = linha.match(/^##\s+(.+?)\s*$/);
      if (secao) { fechar(); tipo = SECOES[secao[1]] || null; grupo = secao[1]; continue; }
      const titulo = linha.match(/^###\s+(.+?)\s*$/);
      if (titulo) {
        fechar();
        if (!tipo) continue;
        const nome = titulo[1];
        const id = slug(nome);
        if (base.todos.has(id)) base.erros.push(`"${nome}" aparece duas vezes na base.`);
        atual = { id, tipo, grupo, nome, campos: {}, linhas: [] };
        colecao[tipo].push(atual);
        base.todos.set(id, atual);
        continue;
      }
      if (/^#\s/.test(linha)) { fechar(); tipo = null; continue; }
      if (!atual) continue;
      const campo = linha.match(/^-\s+\*\*([^*]+?):\*\*\s*(.*)$/);
      if (campo && CAMPOS[campo[1]]) { atual.campos[CAMPOS[campo[1]]] = campo[2].trim(); continue; }
      atual.linhas.push(linha);
    }
    fechar();
    for (const item of base.todos.values()) {
      item.tambem = lista(item.campos.tambem);
      const fala = (item.texto.match(/^>\s?(.+)$/m) || [])[1];
      item.fala = fala ? fala.trim() : '';
    }
    for (const relogio of base.relogios) {
      relogio.chave = relogio.campos.chave || relogio.id;
      relogio.segmentos = lista(relogio.campos.segmentos);
      if (!relogio.segmentos.length) base.erros.push(`O relógio "${relogio.nome}" não tem segmentos.`);
    }
    return base;
  }

  // ---------------- O que muda na mesa ----------------
  // estado: { estado: { id: { situacao, onde, atitude, nota } }, segredos: { id: true } } (a mesa do servidor).
  const vazio = () => ({ estado: {}, segredos: {} });
  const doEstado = (estado, id) => ((estado && estado.estado) || {})[id] || {};
  const revelado = (estado, id) => Boolean(((estado && estado.segredos) || {})[id]);
  // O valor de agora (o da mesa, se o mestre mudou; senão o do começo da campanha).
  const agora = (item, estado, campo) => doEstado(estado, item.id)[campo] || item.campos[campo] || '';
  const mudou = (item, estado, campo) => Boolean(doEstado(estado, item.id)[campo]) && doEstado(estado, item.id)[campo] !== (item.campos[campo] || '');

  // ---------------- Visões em Markdown ----------------
  // As páginas geradas são Markdown (a wiki desenha, indexa na busca e liga ao glossário como os documentos).
  const linkDe = item => (PAGINA_DO_TIPO[item.tipo] ? `#${PAGINA_DO_TIPO[item.tipo]}/${item.id}` : '');
  const nomeComLink = item => (linkDe(item) ? `[**${item.nome}**](${linkDe(item)})` : `**${item.nome}**`);
  const fichaDe = item => (item.campos.ficha ? `[${item.campos.ficha}](#npcs/${slug(item.campos.ficha)})` : '—');
  const comMudanca = (item, estado, campo) => (mudou(item, estado, campo) ? `**${agora(item, estado, campo)}** (era: ${item.campos[campo] || '—'})` : agora(item, estado, campo));

  // Nas tabelas, o que mudou na mesa vem em negrito.
  const naTabela = (item, estado, campo) => { const valor = celula(agora(item, estado, campo)) || '—'; return mudou(item, estado, campo) ? `**${valor}**` : valor; };
  function tabelaPessoas(base, estado, grupo = null) {
    const pessoas = base.pessoas.filter(item => !grupo || item.grupo === grupo);
    return ['| Quem | Lado | Onde | Aparece | Situação | Ficha |', '|---|---|---|---|---|---|',
      ...pessoas.map(item => `| ${nomeComLink(item)} | ${celula(item.campos.lado)} | ${naTabela(item, estado, 'onde')} | ${celula(item.campos.aparece)} | ${naTabela(item, estado, 'situacao')} | ${fichaDe(item)} |`)].join('\n');
  }
  function tabelaFaccoes(base) {
    return ['| Força | O que quer | Aparece | Rosto |', '|---|---|---|---|',
      ...base.faccoes.map(item => `| ${nomeComLink(item)} | ${celula(item.campos.quer)} | ${celula(item.campos.aparece)} | ${celula(item.campos.rosto)} |`)].join('\n');
  }
  function tabelaPecas(base, estado) {
    return ['| Peça | O que é | Onde está agora |', '|---|---|---|',
      ...base.pecas.map(item => `| ${nomeComLink(item)} | ${celula(item.campos.oque)} | ${mudou(item, estado, 'onde') ? `**${celula(agora(item, estado, 'onde'))}** (no começo: ${celula(item.campos.onde)})` : celula(item.campos.onde)} |`)].join('\n');
  }
  function tabelaLugares(base, estado) {
    return ['| Lugar | Onde fica | Aparece | Situação |', '|---|---|---|---|',
      ...base.lugares.map(item => `| ${nomeComLink(item)} | ${celula(item.campos.distrito)} | ${celula(item.campos.aparece)} | ${naTabela(item, estado, 'situacao')} |`)].join('\n');
  }
  function relogio(item, valor = 0) {
    const passos = item.segmentos.map((passo, i) => `${i + 1}. ${i < valor ? '☑' : '☐'} ${passo}`);
    return [`**${item.nome}** (${item.segmentos.length} segmentos${valor ? `; marcados: ${valor}` : ''})`, '', ...passos, '', item.texto].join('\n').trim();
  }
  function segredos(base, estado) {
    return base.segredos.map(item => `- ${revelado(estado, item.id) ? '☑' : '☐'} **${item.nome}**${item.campos.revela ? ` (${item.campos.revela})` : ''}${item.texto ? `: ${item.texto.replace(/\s+/g, ' ')}` : ''}`).join('\n');
  }

  // Um cartão: os campos numa lista curta, o texto do mestre e as falas.
  function cartao(item, estado) {
    const linhas = [`### ${item.nome}`];
    if (item.campos.quem || item.campos.oque) linhas.push(`*${item.campos.quem || item.campos.oque}*`);
    const campos = [];
    const add = (rotulo, valor) => { if (valor) campos.push(`- **${rotulo}:** ${valor}`); };
    if (item.tipo === 'pessoa') {
      add('Lado', item.campos.lado);
      add('Onde', comMudanca(item, estado, 'onde'));
      add('Aparece', item.campos.aparece);
      add('Situação', comMudanca(item, estado, 'situacao'));
      add('Atitude com o grupo', doEstado(estado, item.id).atitude);
      add('Na mesa', doEstado(estado, item.id).nota);
      add('Relações', item.campos.relacoes);
      add('Para os jogadores', item.campos.publico);
      add('Ficha', item.campos.ficha ? fichaDe(item) : '');
      add('Mais', item.campos.mais);
    } else if (item.tipo === 'faccao') {
      add('Quer', item.campos.quer);
      add('Aparece', item.campos.aparece);
      add('Rosto', item.campos.rosto);
      add('Mais', item.campos.mais);
    } else if (item.tipo === 'peca') {
      add('Onde está agora', comMudanca(item, estado, 'onde'));
      add('Arquitetura NET', item.campos.arquitetura);
      add('Na mesa', doEstado(estado, item.id).nota);
      add('Mais', item.campos.mais);
    } else if (item.tipo === 'lugar') {
      add('Onde fica', item.campos.distrito);
      add('Aparece', item.campos.aparece);
      add('Situação', comMudanca(item, estado, 'situacao'));
      add('Para os jogadores', item.campos.publico);
      add('No mapa', item.campos.mapa ? `[ver no mapa de Night City](#campaignMap/${item.campos.mapa})` : '');
      add('Mais', item.campos.mais);
    }
    return [...linhas, '', ...campos, '', item.texto].join('\n').trim();
  }

  const FONTE = 'Gerado da [base da campanha](base-da-campanha.md): para mudar um nome, um lado ou um lugar, edite o registro lá, e esta página, as tabelas dos documentos e os cartões dos links mudam juntos. O que mudou na mesa (situação, onde está, atitude) se marca em **Estado da campanha**.';
  function paginaPessoas(texto, estado) {
    const base = ler(texto);
    const grupos = [...new Set(base.pessoas.map(item => item.grupo))];
    return [`# Pessoas e facções`, '', FONTE, '', '## Quem é quem', '', tabelaPessoas(base, estado),
      ...grupos.flatMap(nome => ['', `## ${nome === 'Pessoas' ? 'Elenco principal' : nome}`, '', ...base.pessoas.filter(item => item.grupo === nome).map(item => `${cartao(item, estado)}\n`)]),
      '', '## Forças', '', tabelaFaccoes(base), '', ...base.faccoes.map(item => `${cartao(item, estado)}\n`)].join('\n');
  }
  function paginaLugares(texto, estado) {
    const base = ler(texto);
    return [`# Lugares e peças`, '', FONTE, '', '## As peças de Morana', '', tabelaPecas(base, estado), '', ...base.pecas.map(item => `${cartao(item, estado)}\n`),
      '## Lugares da campanha', '', tabelaLugares(base, estado), '', ...base.lugares.map(item => `${cartao(item, estado)}\n`)].join('\n');
  }

  // ---------------- Citações da base nos documentos ----------------
  // Uma linha sozinha {{base:pecas}} (ou pessoas, faccoes, lugares, segredos, relogio:<chave>) vira a tabela de agora.
  function expandir(texto, base, estado, valores = {}) {
    if (!base) return texto;
    return String(texto).replace(/^\{\{base:([a-z]+)(?::([\w-]+))?\}\}\s*$/gm, (inteiro, qual, chave) => {
      if (qual === 'pessoas') return tabelaPessoas(base, estado, chave ? (base.pessoas.find(item => slug(item.grupo) === chave) || {}).grupo : null);
      if (qual === 'faccoes') return tabelaFaccoes(base);
      if (qual === 'pecas') return tabelaPecas(base, estado);
      if (qual === 'lugares') return tabelaLugares(base, estado);
      if (qual === 'segredos') return segredos(base, estado);
      if (qual === 'relogio') { const item = base.relogios.find(r => r.chave === chave); return item ? relogio(item, Number(valores[item.chave]) || 0) : `*(relógio "${chave}" não existe na base)*`; }
      const item = base.todos.get(qual === 'item' ? chave : '');
      if (item) return cartao(item, estado);
      return `*(citação desconhecida: ${inteiro.trim()})*`;
    });
  }

  // Trechos de um documento pelos títulos: [slug, ...] → o título e tudo até o próximo do mesmo nível (ou acima).
  function trechos(texto, quais) {
    const linhas = String(texto || '').replace(/\r/g, '').split('\n');
    const saida = [];
    for (const qual of quais) {
      const inicio = linhas.findIndex(linha => { const m = linha.match(/^(#{1,4})\s+(.+)$/); return m && slug(m[2]) === qual; });
      if (inicio < 0) continue;
      const nivel = linhas[inicio].match(/^#+/)[0].length;
      let fim = inicio + 1;
      while (fim < linhas.length && !(linhas[fim].match(/^(#{1,4})\s/) && linhas[fim].match(/^#+/)[0].length <= nivel)) fim++;
      saida.push(linhas.slice(inicio, fim).join('\n').trim());
    }
    return saida.join('\n\n');
  }

  // ---------------- Para o Foundry ----------------
  // O texto do ator do elenco: quem é, lado, onde e o texto do mestre, em HTML simples.
  function inline(texto, href = () => '') {
    return esc(texto)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, rotulo, alvo) => { const destino = href(alvo.replace(/&amp;/g, '&')); return destino ? `<a href="${esc(destino)}">${rotulo}</a>` : rotulo; })
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?![*\w])/g, '$1<i>$2</i>');
  }
  const paragrafos = (texto, href) => String(texto || '').split(/\n\s*\n/).map(bloco => bloco.trim()).filter(Boolean).map(bloco => (bloco.startsWith('>') ? `<blockquote>${inline(bloco.replace(/^>\s?/gm, ''), href)}</blockquote>` : `<p>${inline(bloco.replace(/\n/g, ' '), href)}</p>`)).join('');
  function paraFoundry(item) {
    const dados = [['Quem é', item.campos.quem], ['Lado', item.campos.lado], ['Onde', item.campos.onde], ['Aparece', item.campos.aparece], ['Relações', item.campos.relacoes]]
      .filter(([, valor]) => valor).map(([rotulo, valor]) => `<b>${rotulo}:</b> ${inline(valor)}`).join('<br>');
    return `<h3>Na campanha</h3><p>${dados}</p>${paragrafos(item.texto)}`;
  }

  // ---------------- Conferência (os testes usam) ----------------
  // fichas: nomes das fichas de NPC que existem; marcadores: ids do mapa; elenco: nomes das fichas da campanha.
  function conferir(base, { fichas = [], marcadores = [], elenco = [] } = {}) {
    const problemas = [...base.erros];
    const nomes = new Map();
    for (const item of base.todos.values()) {
      for (const nome of [item.nome, ...item.tambem]) {
        const outro = nomes.get(nome);
        if (outro && outro !== item.id) problemas.push(`"${nome}" é nome de dois registros (${outro} e ${item.id}).`);
        nomes.set(nome, item.id);
      }
      if (item.campos.ficha && fichas.length && !fichas.includes(item.campos.ficha)) problemas.push(`${item.nome}: a ficha "${item.campos.ficha}" não existe em Fichas de NPC.`);
      if (item.campos.mapa && marcadores.length && !marcadores.includes(item.campos.mapa)) problemas.push(`${item.nome}: o ponto "${item.campos.mapa}" não existe no mapa.`);
      if (item.tipo === 'pessoa' && !item.campos.quem) problemas.push(`${item.nome}: falta "Quem é".`);
      if (item.tipo === 'peca' && !item.campos.onde) problemas.push(`${item.nome}: falta "Onde" (no começo da campanha).`);
    }
    for (const nome of elenco) if (!base.pessoas.some(item => item.campos.ficha === nome)) problemas.push(`A ficha do elenco "${nome}" não tem registro na base.`);
    return problemas;
  }

  const api = { ler, slug, expandir, trechos, paginaPessoas, paginaLugares, tabelaPessoas, tabelaFaccoes, tabelaPecas, tabelaLugares, relogio, segredos, cartao, paraFoundry, inline, conferir, agora, vazio, NOMES_DOS_TIPOS, PAGINA_DO_TIPO, SITUACOES, ATITUDES };

  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }

  // ---------------- No navegador (wiki do mestre) ----------------
  // carregar(arquivo, mesa) antes de montar a wiki: lê a base e o estado da mesa. Depois, ligar(opções) acende os links
  // dos nomes e os cartões ao passar o mouse.
  const navegador = { ...api, base: null, arquivo: '', mesa: '', estado: vazio(), relogios: {}, pasta: '' };
  const docs = {};
  async function carregar(arquivo, mesa) {
    navegador.arquivo = arquivo;
    navegador.mesa = mesa || '';
    navegador.pasta = arquivo.replace(/[^/]*$/, '');
    const [texto, dadosDaMesa] = await Promise.all([
      fetch(encodeURI(arquivo), { cache: 'no-store' }).then(r => (r.ok ? r.text() : '')).catch(() => ''),
      mesa ? fetch(mesa, { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).catch(() => null) : null
    ]);
    navegador.base = texto ? ler(texto) : null;
    if (dadosDaMesa) usarMesa(dadosDaMesa);
    return navegador.base;
  }
  function usarMesa(dados) {
    navegador.estado = { estado: dados.estado || {}, segredos: dados.segredos || {} };
    navegador.relogios = dados.relogios || {};
  }

  // Grava o que mudou (junta o que vier em seguida e manda de uma vez).
  let pendente = null;
  let relogio2 = null;
  const ouvintes = new Set();
  function mudar(patch) {
    const e = navegador.estado;
    for (const [id, valores] of Object.entries(patch.estado || {})) {
      const junto = { ...(e.estado[id] || {}), ...valores };
      for (const chave of Object.keys(junto)) if (!junto[chave]) delete junto[chave];
      if (Object.keys(junto).length) e.estado[id] = junto; else delete e.estado[id];
    }
    for (const [id, valor] of Object.entries(patch.segredos || {})) { if (valor) e.segredos[id] = true; else delete e.segredos[id]; }
    pendente = { estado: { ...((pendente && pendente.estado) || {}) }, segredos: { ...((pendente && pendente.segredos) || {}) } };
    for (const [id, valores] of Object.entries(patch.estado || {})) pendente.estado[id] = { ...(pendente.estado[id] || {}), ...valores };
    Object.assign(pendente.segredos, patch.segredos || {});
    ouvintes.forEach(fn => fn('salvando'));
    clearTimeout(relogio2);
    relogio2 = setTimeout(enviar, 500);
  }
  async function enviar() {
    if (!pendente || !navegador.mesa) { ouvintes.forEach(fn => fn(navegador.mesa ? 'salvo' : 'local')); return; }
    const corpo = pendente;
    pendente = null;
    try {
      const resposta = await fetch(navegador.mesa, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
      if (!resposta.ok) throw new Error(resposta.status);
      ouvintes.forEach(fn => fn('salvo'));
    } catch {
      pendente = { estado: { ...corpo.estado, ...((pendente && pendente.estado) || {}) }, segredos: { ...corpo.segredos, ...((pendente && pendente.segredos) || {}) } };
      ouvintes.forEach(fn => fn('erro'));
    }
  }
  window.addEventListener('pagehide', () => { if (pendente) { clearTimeout(relogio2); enviar(); } });

  // A página Estado da campanha: os relógios (os mesmos de Notas e relógios), onde estão as peças, a situação de cada
  // pessoa e os segredos revelados. HTML montado na hora da wiki (entra na busca); os campos se ligam em ligarEstado.
  function paginaEstado() {
    const base = navegador.base;
    if (!base) return '<div class="callout">A base da campanha não carregou (abra a wiki pelo servidor).</div>';
    const relogios = base.relogios.map(item => `<div class="section" data-toc="${esc(item.nome)}"><h3>${esc(item.nome)}</h3>${paragrafos(item.texto, href)}<div class="clock" id="clock-${esc(item.chave)}"></div></div>`).join('');
    const pecas = `<div class="section" data-toc="Onde estão as peças"><h3>Onde estão as peças</h3><p>Com quem ou onde está cada parte de Morana agora. Vazio: onde estava no começo da campanha.</p><div class="table-wrap"><table class="bs-tabela"><thead><tr><th>Peça</th><th>No começo</th><th>Agora</th><th>Nota</th></tr></thead><tbody>${base.pecas.map(item => `<tr data-bs-id="${item.id}"><td><a href="${linkDe(item)}"><b>${esc(item.nome)}</b></a></td><td>${esc(item.campos.onde)}</td><td><input data-bs-campo="onde" placeholder="${esc(item.campos.onde)}" maxlength="200"></td><td><input data-bs-campo="nota" placeholder="o que o grupo sabe, quem procura…" maxlength="300"></td></tr>`).join('')}</tbody></table></div></div>`;
    const linhaPessoa = item => `<tr data-bs-id="${item.id}"><td><a href="${linkDe(item)}"><b>${esc(item.nome)}</b></a><br><small>${esc(item.campos.quem || '')}</small></td><td><input data-bs-campo="situacao" list="bs-situacoes" placeholder="${esc(item.campos.situacao || '—')}" maxlength="120"></td><td><input data-bs-campo="onde" placeholder="${esc(item.campos.onde || '—')}" maxlength="200"></td><td><select data-bs-campo="atitude">${ATITUDES.map(valor => `<option value="${esc(valor)}">${valor || '—'}</option>`).join('')}</select></td><td><input data-bs-campo="nota" placeholder="sabe que…, deve…, quer…" maxlength="300"></td></tr>`;
    const cabeca = '<thead><tr><th>Quem</th><th>Situação</th><th>Onde agora</th><th>Atitude com o grupo</th><th>Na mesa</th></tr></thead>';
    const grupos = [...new Set(base.pessoas.map(item => item.grupo))];
    const pessoas = `<div class="section" data-toc="Pessoas"><h3>Pessoas</h3><p>A situação de agora (viva, capturada, morta, onde está) e a atitude com o grupo. Aparece nos cartões de Pessoas e facções e no cartão do nome, em qualquer documento.</p><datalist id="bs-situacoes">${SITUACOES.map(valor => `<option value="${esc(valor)}">`).join('')}</datalist>${grupos.map((grupo, i) => {
      const tabela = `<div class="table-wrap"><table class="bs-tabela">${cabeca}<tbody>${base.pessoas.filter(item => item.grupo === grupo).map(linhaPessoa).join('')}</tbody></table></div>`;
      return i === 0 ? tabela : `<details class="bs-mais"><summary>${esc(grupo)} (${base.pessoas.filter(item => item.grupo === grupo).length})</summary>${tabela}</details>`;
    }).join('')}</div>`;
    const reveladas = `<div class="section" data-toc="Segredos revelados"><h3>Segredos revelados</h3><p>Marque quando o grupo descobrir. Fica no Diário e serve de lembrete do que ainda pode surpreender.</p><ul class="bs-segredos">${base.segredos.map(item => `<li><label><input type="checkbox" data-bs-segredo="${item.id}"> <b>${esc(item.nome)}</b>${item.campos.revela ? ` <small>(${esc(item.campos.revela)})</small>` : ''}</label>${item.texto ? `<br><small>${inline(item.texto.replace(/\s+/g, ' '), href)}</small>` : ''}</li>`).join('')}</ul></div>`;
    return `${relogios}${pecas}${pessoas}${reveladas}<p class="note-status" data-bs-status></p>`;
  }
  // Links dos textos da base nas páginas HTML: #pagina/secao e arquivo.md (a página daquele documento).
  let paginaDoArquivo = () => '';
  const href = alvo => (/^#[\w-]+(\/[\w-]+)?$/.test(alvo) ? alvo : (() => { const [arquivo, secao] = alvo.split('#'); const id = /\.md$/i.test(arquivo) ? paginaDoArquivo(arquivo) : ''; return id ? `#${id}${secao ? `/${secao}` : ''}` : ''; })());

  function ligarEstado(content) {
    const status = content.querySelector('[data-bs-status]');
    const mostrar = estado => { if (status) status.textContent = { salvando: 'Salvando no servidor…', salvo: 'Salvo no servidor: entra no backup e aparece em qualquer aparelho seu.', erro: 'Sem conexão com o servidor: tenta de novo na próxima mudança.', local: 'Sem servidor: as mudanças não ficam salvas.' }[estado] || ''; };
    ouvintes.clear();
    ouvintes.add(mostrar);
    const e = navegador.estado;
    content.querySelectorAll('[data-bs-id]').forEach(linha => {
      const id = linha.dataset.bsId;
      linha.querySelectorAll('[data-bs-campo]').forEach(campo => {
        campo.value = ((e.estado[id] || {})[campo.dataset.bsCampo]) || '';
        campo.addEventListener('change', () => mudar({ estado: { [id]: { [campo.dataset.bsCampo]: campo.value.trim() } } }));
      });
    });
    content.querySelectorAll('[data-bs-segredo]').forEach(caixa => {
      caixa.checked = Boolean(e.segredos[caixa.dataset.bsSegredo]);
      caixa.addEventListener('change', () => mudar({ segredos: { [caixa.dataset.bsSegredo]: caixa.checked } }));
    });
  }

  // ---------------- Links dos nomes e o cartão ao passar o mouse ----------------
  let buscadores = null;
  function montarBuscadores() {
    const formas = new Map();
    for (const item of navegador.base.todos.values()) {
      if (!PAGINA_DO_TIPO[item.tipo]) continue;
      for (const forma of [item.nome, ...item.tambem]) if (forma.length > 2 && !formas.has(forma)) formas.set(forma, item);
    }
    if (!formas.size) return null;
    const escapar = texto => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return { formas, regex: new RegExp(`(?<![\\p{L}\\p{N}])(${[...formas.keys()].sort((a, b) => b.length - a.length).map(escapar).join('|')})(?![\\p{L}\\p{N}])`, 'gu') };
  }
  const PULAR = 'h1, h2, h3, h4, h5, a, button, summary, code, pre, input, textarea, select, option, label, th, .page-toc, .page-tabs, .eyebrow, .ent-card, .npc-stats, .entry-tag';
  // Uma vez por nome em cada seção (num documento, cada título ## ou ###); nunca no próprio cartão.
  function secaoDe(no, raizDoc) {
    let filho = no.parentElement;
    while (filho && filho.parentElement !== raizDoc) filho = filho.parentElement;
    let titulo = filho;
    while (titulo && !/^H[3-5]$/.test(titulo.tagName)) titulo = titulo.previousElementSibling;
    return titulo || raizDoc;
  }
  function ligarNomes(root) {
    if (!navegador.base || !root) return;
    buscadores = buscadores || montarBuscadores();
    if (!buscadores) return;
    const documento = root.matches && root.matches('#md-doc') ? root : root.querySelector && root.querySelector('#md-doc');
    const usados = new Map();
    const caminhante = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nos = [];
    while (caminhante.nextNode()) nos.push(caminhante.currentNode);
    for (const no of nos) {
      const pai = no.parentElement;
      if (!pai || pai.closest(PULAR) || !no.data.trim()) continue;
      const escopo = documento && documento.contains(no) ? secaoDe(no, documento) : (pai.closest('.entry, .section, .person') || root);
      const tituloDoEscopo = slug(escopo.matches && escopo.matches('h3, h4, h5') ? escopo.textContent : (escopo.dataset && escopo.dataset.toc) || '');
      if (!usados.has(escopo)) usados.set(escopo, new Set());
      const usado = usados.get(escopo);
      buscadores.regex.lastIndex = 0;
      const achados = [];
      for (let m = buscadores.regex.exec(no.data); m; m = buscadores.regex.exec(no.data)) {
        const item = buscadores.formas.get(m[1]);
        if (!item || usado.has(item.id) || tituloDoEscopo === item.id) continue;
        usado.add(item.id);
        achados.push({ inicio: m.index, fim: m.index + m[1].length, item });
      }
      if (!achados.length) continue;
      const pedaco = document.createDocumentFragment();
      let de = 0;
      for (const { inicio, fim, item } of achados) {
        pedaco.append(no.data.slice(de, inicio));
        const link = document.createElement('a');
        link.className = `ent ent-${item.tipo}`;
        link.href = linkDe(item);
        link.dataset.ent = item.id;
        link.textContent = no.data.slice(inicio, fim);
        pedaco.append(link);
        de = fim;
      }
      pedaco.append(no.data.slice(de));
      no.replaceWith(pedaco);
    }
  }

  let cartaoFlutuante = null;
  function mostrarCartao(link) {
    const item = navegador.base && navegador.base.todos.get(link.dataset.ent);
    if (!item) return;
    const e = navegador.estado;
    const linhas = [];
    if (item.tipo === 'pessoa') {
      linhas.push(['Lado', item.campos.lado], ['Onde', agora(item, e, 'onde')], ['Situação', agora(item, e, 'situacao')], ['Atitude', doEstado(e, item.id).atitude], ['Aparece', item.campos.aparece]);
    } else if (item.tipo === 'faccao') linhas.push(['Quer', item.campos.quer], ['Rosto', item.campos.rosto]);
    else if (item.tipo === 'peca') linhas.push(['Onde está agora', agora(item, e, 'onde')], ['No começo', mudou(item, e, 'onde') ? item.campos.onde : '']);
    else if (item.tipo === 'lugar') linhas.push(['Onde fica', item.campos.distrito], ['Situação', agora(item, e, 'situacao')], ['Aparece', item.campos.aparece]);
    cartaoFlutuante = cartaoFlutuante || Object.assign(document.createElement('div'), { className: 'ent-card' });
    cartaoFlutuante.innerHTML = `<small>${NOMES_DOS_TIPOS[item.tipo]}</small><b>${esc(item.nome)}</b>${item.campos.quem || item.campos.oque ? `<p>${inline(item.campos.quem || item.campos.oque)}</p>` : ''}<dl>${linhas.filter(([, valor]) => valor).map(([rotulo, valor]) => `<dt>${rotulo}</dt><dd>${inline(valor)}</dd>`).join('')}</dl>${item.fala ? `<q>${inline(item.fala.replace(/^["“]|["”]$/g, ''))}</q>` : ''}`;
    document.body.append(cartaoFlutuante);
    const caixa = link.getBoundingClientRect();
    const largura = Math.min(320, window.innerWidth - 16);
    cartaoFlutuante.style.width = `${largura}px`;
    cartaoFlutuante.style.left = `${Math.max(8, Math.min(window.innerWidth - largura - 8, caixa.left))}px`;
    const altura = cartaoFlutuante.offsetHeight;
    const abaixo = caixa.bottom + 6 + altura < window.innerHeight;
    cartaoFlutuante.style.top = `${(abaixo ? caixa.bottom + 6 : Math.max(8, caixa.top - altura - 6)) + window.scrollY}px`;
    cartaoFlutuante.hidden = false;
  }
  const esconderCartao = () => { if (cartaoFlutuante) cartaoFlutuante.hidden = true; };

  // opções: { paginas: ids de página onde os nomes viram link; paginaDoArquivo(nome.md) → id da página }
  function ligar({ paginas = [], paginaDoArquivo: porArquivo } = {}) {
    if (porArquivo) paginaDoArquivo = porArquivo;
    const pode = new Set(paginas);
    document.addEventListener('wiki:pagina', evento => {
      esconderCartao();
      if (!pode.has(evento.detail.id)) return;
      const conteudo = document.getElementById('content');
      ligarNomes(conteudo);
      if (evento.detail.id === 'notes') ligarEstado(conteudo);
    });
    document.addEventListener('wiki:documento', evento => { if (pode.has(evento.detail.id)) ligarNomes(evento.detail.container); });
    document.addEventListener('wiki:mesa', evento => { if (evento.detail) usarMesa(evento.detail); });
    document.addEventListener('mouseover', evento => { const link = evento.target.closest && evento.target.closest('a.ent'); if (link) mostrarCartao(link); });
    document.addEventListener('mouseout', evento => { const link = evento.target.closest && evento.target.closest('a.ent'); if (link && !link.contains(evento.relatedTarget)) esconderCartao(); });
    document.addEventListener('focusin', evento => { if (evento.target.matches && evento.target.matches('a.ent')) mostrarCartao(evento.target); });
    document.addEventListener('focusout', esconderCartao);
    window.addEventListener('scroll', esconderCartao, { passive: true });
  }

  // Os relógios de agora: os da wiki (o mestre pode ter acabado de marcar um); antes de ela montar, os da mesa lida.
  const valoresDosRelogios = () => (raiz.wikiApp && raiz.wikiApp.clockState ? Object.fromEntries(raiz.wikiApp.clockState().map(item => [item.name, item.value])) : navegador.relogios);

  // {{doc:arquivo.md#secao}}: um trecho de outro documento da mesma pasta. Assíncrono.
  async function expandirComDocs(texto) {
    const pedidos = [...String(texto).matchAll(/^\{\{doc:([\w.-]+\.md)#([\w-]+)\}\}\s*$/gm)];
    for (const [, arquivo] of pedidos) {
      if (docs[arquivo] === undefined) docs[arquivo] = await fetch(encodeURI(navegador.pasta + arquivo), { cache: 'no-store' }).then(r => (r.ok ? r.text() : '')).catch(() => '');
    }
    const comDocs = String(texto).replace(/^\{\{doc:([\w.-]+\.md)#([\w-]+)\}\}\s*$/gm, (inteiro, arquivo, secao) => {
      const trecho = trechos(docs[arquivo], [secao]);
      const titulo = ((docs[arquivo] || '').match(/^﻿?#\s+(.+)$/m) || [])[1] || arquivo.replace(/\.md$/, '');
      return trecho ? `${trecho}\n\n*Do documento [${titulo}](${arquivo}#${secao}).*` : `*(seção "${secao}" não achada em ${arquivo})*`;
    });
    return expandir(comDocs, navegador.base, navegador.estado, valoresDosRelogios());
  }

  Object.assign(navegador, {
    carregar, mudar, ligar, ligarNomes, paginaEstado, expandirComDocs,
    // Para os documentos (transform): as citações {{base:...}} com o estado de agora.
    citar: texto => expandir(texto, navegador.base, navegador.estado, valoresDosRelogios()),
    pessoas: texto => paginaPessoas(texto, navegador.estado),
    lugares: texto => paginaLugares(texto, navegador.estado),
    // Os relógios para a wiki (config.clocks): { chave: [segmentos] }.
    relogiosDaWiki: () => Object.fromEntries((navegador.base ? navegador.base.relogios : []).map(item => [item.chave, item.segmentos])),
    elenco: () => (navegador.base ? navegador.base.pessoas.filter(item => item.campos.ficha && item.grupo === 'Pessoas').map(item => item.campos.ficha) : [])
  });
  raiz.campaignBase = navegador;
})(typeof window !== 'undefined' ? window : globalThis);

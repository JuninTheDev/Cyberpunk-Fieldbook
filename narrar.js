// A aba Narrar da sessão: só o que o mestre usa narrando (o texto para ler, as cenas, as escolhas de caminho e o painel
// Mesa com a hora e o alarme), tirado do próprio roteiro (uma fonte só; o roteiro fica no servidor, fora do git).
//
// A marcação no roteiro (o .md continua legível na aba Roteiro):
//   - logo depois de um título ## ou ###, a linha "- **Momento:** id" faz do título um cartão; "- **Consulta:** id", um
//     bloco de consulta (as válvulas, a NET, quem é quem), fora do fluxo. O id: letras sem acento, números e hífen.
//   - [Rótulo](momento:id) em qualquer lugar do texto vira um botão para o cartão (na aba Roteiro, fica só o rótulo).
//   - "**Escolha:** a pergunta" logo antes de uma lista em que cada item começa com [Rótulo](momento:id): os botões das
//     bifurcações. O botão abre o caminho; o grupo pode se dividir (até 3 cartões fixados na faixa).
//   - ">" dentro de um cartão é o texto para ler em voz alta; a citação que começa com "**" é uma caixa do mestre.
//   - As consultas "relogio" e "alarme", se existirem, alimentam o painel Mesa: a primeira tabela de cada uma (a hora ou o
//     degrau na primeira coluna; um [Rótulo](momento:id) numa linha vira o gatilho daquela hora ou daquele degrau).
//
// No Node (testes, o api-campanhas.js): require('./narrar.js') → { slug, temNarrar, ler, desenhar }.
// No navegador: window.fieldbookNarrar, com montar(content, opções) para a página da aba.
(function (raiz) {
  'use strict';

  const ID_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;
  const CAMPO_RE = /^\s*[-*]\s+\*\*(Momento|Consulta):\*\*\s*(.*)$/;
  const LINK_RE = /\[([^\]\n]+)\]\(momento:([^)\s]*)\)/g;
  const ESCOLHA_RE = /^\*\*Escolha:\*\*\s*(.*)$/;
  const HORA_RE = /^\**\s*(\d{1,2}):(\d{2})\b/;
  // Marcadores de uso privado: um link vira um token antes do markdown e um botão depois (o texto do roteiro não os traz).
  const ABRE = '';
  const FECHA = '';

  const dobrar = texto => String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const slug = texto => dobrar(texto).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, '');
  const temNarrar = texto => /^\s*[-*]\s+\*\*Momento:\*\*\s*\S/m.test(String(texto || ''));
  const escapar = texto => String(texto ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const semMarcas = texto => String(texto || '').replace(/\[([^\]\n]+)\]\(momento:[^)\s]*\)/g, '$1').replace(/\*\*(.+?)\*\*/g, '$1').trim();

  // ---------------- Leitura ----------------
  // { inicio, blocos: [{ id, tipo, titulo, linha, corpo }], relogio: [{ hora, minutos, texto, links }],
  //   alarme: [{ nome, texto, links }], avisos: [{ tipo, linha, texto }] }. "linha" conta do 1, como o editor.
  function ler(texto) {
    const linhas = String(texto || '').replace(/^﻿/, '').replace(/\r/g, '').replace(/[]/g, '').split('\n');
    const avisos = [];
    const titulos = [];
    linhas.forEach((linha, indice) => {
      const achado = linha.match(/^(#{1,4})\s+(.*)$/);
      if (achado) titulos.push({ nivel: achado[1].length, titulo: achado[2].trim(), linha: indice });
    });
    // Os campos ficam no bloco logo depois do título (linhas em branco no meio, tudo bem); a primeira linha que não é campo
    // encerra o bloco.
    const blocos = [];
    for (const titulo of titulos) {
      const campos = {};
      const linhasDosCampos = [];
      for (let i = titulo.linha + 1; i < linhas.length; i++) {
        if (!linhas[i].trim()) continue;
        const campo = linhas[i].match(CAMPO_RE);
        if (!campo) break;
        campos[campo[1]] = campo[2].trim();
        linhasDosCampos.push(i);
      }
      const tipo = campos.Momento !== undefined ? 'momento' : campos.Consulta !== undefined ? 'consulta' : null;
      if (!tipo) continue;
      const id = (tipo === 'momento' ? campos.Momento : campos.Consulta).trim();
      if (!ID_RE.test(id)) { avisos.push({ tipo: 'id', linha: titulo.linha + 1, texto: `"${titulo.titulo}": o id "${id}" não vale (use letras sem acento, números e hífen).` }); continue; }
      if (blocos.some(bloco => bloco.id === id)) { avisos.push({ tipo: 'repetido', linha: titulo.linha + 1, texto: `"${titulo.titulo}": o id "${id}" já existe; este bloco ficou de fora.` }); continue; }
      blocos.push({ id, tipo, titulo: titulo.titulo.replace(/^\d+\.\s+/, ''), nivel: titulo.nivel, linha: titulo.linha + 1, inicio: titulo.linha, campos: linhasDosCampos });
    }
    // O corpo de um bloco: do título até o próximo título de nível igual ou maior, sem os campos e sem os blocos filhos.
    const fim = bloco => { const proximo = titulos.find(t => t.linha > bloco.inicio && t.nivel <= bloco.nivel); return proximo ? proximo.linha : linhas.length; };
    for (const bloco of blocos) {
      const ate = fim(bloco);
      const fora = new Set(bloco.campos);
      for (const filho of blocos) if (filho !== bloco && filho.inicio > bloco.inicio && filho.inicio < ate) for (let i = filho.inicio; i < fim(filho); i++) fora.add(i);
      const corpo = [];
      for (let i = bloco.inicio + 1; i < ate; i++) if (!fora.has(i)) corpo.push({ texto: linhas[i], linha: i + 1 });
      bloco.corpo = corpo;
    }
    const porId = Object.fromEntries(blocos.map(bloco => [bloco.id, bloco]));
    // Os links: o destino tem de existir; e todo momento tem de ser alcançável a partir do primeiro.
    const ligacoes = {};
    for (const bloco of blocos) {
      ligacoes[bloco.id] = [];
      for (const { texto: linha, linha: numero } of bloco.corpo) {
        for (const achado of linha.matchAll(LINK_RE)) {
          const alvo = achado[2];
          if (!porId[alvo]) avisos.push({ tipo: 'link', linha: numero, texto: `"${bloco.titulo}": o link "${achado[1]}" leva a "${alvo}", que não existe.` });
          else ligacoes[bloco.id].push(alvo);
        }
      }
    }
    const momentos = blocos.filter(bloco => bloco.tipo === 'momento');
    const inicio = momentos.length ? momentos[0].id : null;
    if (inicio) {
      const vistos = new Set([inicio]);
      const fila = [inicio];
      // As consultas também levam a momentos (o relógio leva aos Lixeiros): contam como alcançáveis de qualquer lugar.
      for (const consulta of blocos.filter(bloco => bloco.tipo === 'consulta')) for (const alvo of ligacoes[consulta.id]) if (!vistos.has(alvo)) { vistos.add(alvo); fila.push(alvo); }
      while (fila.length) for (const alvo of ligacoes[fila.shift()] || []) if (!vistos.has(alvo)) { vistos.add(alvo); fila.push(alvo); }
      for (const momento of momentos) if (!vistos.has(momento.id)) avisos.push({ tipo: 'solto', linha: momento.linha, texto: `"${momento.titulo}": nenhum link leva a este momento.` });
    }
    return { inicio, blocos: blocos.map(({ id, tipo, titulo, linha, corpo }) => ({ id, tipo, titulo, linha, corpo })), relogio: tabelaDe(porId.relogio, 'relogio'), alarme: tabelaDe(porId.alarme, 'alarme'), avisos };
  }

  // A primeira tabela de uma consulta (o relógio ou o alarme), linha a linha.
  function tabelaDe(bloco, tipo) {
    if (!bloco) return [];
    const linhas = bloco.corpo.map(item => item.texto);
    const comeco = linhas.findIndex(linha => linha.startsWith('|'));
    if (comeco < 0) return [];
    const tabela = [];
    for (let i = comeco; i < linhas.length && linhas[i].startsWith('|'); i++) tabela.push(linhas[i]);
    const celulas = linha => linha.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(celula => celula.trim());
    const corpo = tabela.slice(1).filter(linha => !/^\|[\s:|-]+\|?\s*$/.test(linha)).map(celulas);
    const links = linha => [...linha.join(' ').matchAll(LINK_RE)].map(achado => ({ id: achado[2], rotulo: semMarcas(achado[1]) }));
    if (tipo === 'relogio') {
      return corpo.map(c => ({ c, hora: c[0].match(HORA_RE) })).filter(({ hora }) => hora).map(({ c, hora }) => ({
        hora: `${hora[1].padStart(2, '0')}:${hora[2]}`, minutos: Number(hora[1]) * 60 + Number(hora[2]), texto: semMarcas(c.slice(1).join(' · ')), links: links(c)
      }));
    }
    return corpo.filter(c => semMarcas(c[0])).map(c => ({ nome: semMarcas(c[0]), texto: semMarcas(c[c.length - 1]), links: links(c) }));
  }

  // ---------------- Desenho ----------------
  // O corpo de um cartão: os trechos de markdown comum, o texto para ler, as caixas do mestre e as escolhas.
  function trechos(corpo) {
    const linhas = corpo.map(item => item.texto);
    const saida = [];
    let comum = [];
    const fecharComum = () => { if (comum.join('').trim()) saida.push({ tipo: 'md', texto: comum.join('\n') }); comum = []; };
    for (let i = 0; i < linhas.length; i++) {
      const linha = linhas[i];
      if (linha.startsWith('>')) {
        fecharComum();
        const citacao = [];
        while (i < linhas.length && linhas[i].startsWith('>')) citacao.push(linhas[i++]);
        i--;
        const primeira = citacao.map(l => l.replace(/^>\s?/, '')).find(l => l.trim()) || '';
        saida.push({ tipo: primeira.trim().startsWith('**') ? 'mestre' : 'ler', texto: citacao.join('\n') });
        continue;
      }
      const escolha = linha.trim().match(ESCOLHA_RE);
      if (escolha) {
        fecharComum();
        const opcoes = [];
        let j = i + 1;
        while (j < linhas.length && !linhas[j].trim()) j++;
        while (j < linhas.length && /^\s*[-*]\s+/.test(linhas[j])) {
          const item = linhas[j].replace(/^\s*[-*]\s+/, '');
          const link = item.match(/^\[([^\]\n]+)\]\(momento:([^)\s]*)\)\s*[·:—-]?\s*(.*)$/);
          opcoes.push(link ? { id: link[2], rotulo: link[1], resto: link[3] } : { id: null, rotulo: item, resto: '' });
          j++;
        }
        saida.push({ tipo: 'escolha', pergunta: escolha[1], opcoes });
        i = j - 1;
        continue;
      }
      comum.push(linha);
    }
    fecharComum();
    return saida;
  }

  // O botão de ir a um momento (só ids válidos chegam a um atributo).
  const botaoIr = (id, rotulo, { visto = false, classe = 'narrar-ir' } = {}) => ID_RE.test(id)
    ? `<button type="button" class="${classe}" data-narrar-ir="${id}">${escapar(semMarcas(rotulo))}<span aria-hidden="true"> →</span>${visto ? ' <span class="narrar-visto">visto</span>' : ''}</button>`
    : `<span class="narrar-quebrado">${escapar(semMarcas(rotulo))} (link quebrado)</span>`;

  // Markdown com os links de momento virando botões: o link vira um token, o renderMarkdown escapa o resto, o token volta
  // como botão (o rótulo, escapado aqui).
  function comLinks(texto, render, existe, visitados) {
    const links = [];
    const marcado = texto.replace(LINK_RE, (inteiro, rotulo, id) => { links.push({ rotulo, id }); return `${ABRE}${links.length - 1}${FECHA}`; });
    return render(marcado).replace(new RegExp(`${ABRE}(\\d+)${FECHA}`, 'g'), (inteiro, n) => {
      const link = links[Number(n)];
      return existe(link.id) ? botaoIr(link.id, link.rotulo, { visto: visitados.has(link.id) }) : `<span class="narrar-quebrado">${escapar(semMarcas(link.rotulo))} (link quebrado)</span>`;
    });
  }

  // O cartão de um bloco: HTML pronto. render: o renderMarkdown da wiki (escapa o texto).
  function desenhar(modelo, idDoBloco, { renderMarkdown: render, visitados = new Set(), fixados = [] } = {}) {
    const bloco = modelo.blocos.find(item => item.id === idDoBloco);
    if (!bloco) return '';
    const existe = id => modelo.blocos.some(item => item.id === id);
    const partes = trechos(bloco.corpo).map((trecho, indice) => {
      if (trecho.tipo === 'md') return `<div class="narrar-texto">${comLinks(trecho.texto, render, existe, visitados)}</div>`;
      if (trecho.tipo === 'mestre') return `<div class="narrar-mestre">${comLinks(trecho.texto, render, existe, visitados)}</div>`;
      if (trecho.tipo === 'ler') {
        const texto = trecho.texto.split('\n').map(linha => linha.replace(/^>\s?/, '')).join('\n');
        return `<section class="narrar-ler" aria-label="Leia em voz alta"><p class="narrar-rotulo">Leia em voz alta</p>${comLinks(texto, render, existe, visitados)}</section>`;
      }
      const pergunta = `narrar-pergunta-${bloco.id}-${indice}`;
      return `<div class="narrar-escolha" role="group" aria-labelledby="${pergunta}"><p class="narrar-pergunta" id="${pergunta}">${escapar(semMarcas(trecho.pergunta))}</p><div class="narrar-opcoes">${trecho.opcoes.map(opcao => (opcao.id && existe(opcao.id)
        ? `<button type="button" class="narrar-opcao" data-narrar-ir="${opcao.id}"><b>${escapar(semMarcas(opcao.rotulo))}</b>${opcao.resto ? `<span>${escapar(semMarcas(opcao.resto))}</span>` : ''}${visitados.has(opcao.id) ? '<span class="narrar-visto">visto</span>' : ''}</button>`
        : `<span class="narrar-quebrado">${escapar(semMarcas(opcao.rotulo))} (sem link para um momento)</span>`)).join('')}</div></div>`;
    });
    const handouts = [...new Set(bloco.corpo.map(item => item.texto).join('\n').match(/\bH-\d{2,}\b/g) || [])];
    const fixado = fixados.includes(bloco.id);
    return `<article class="narrar-cartao narrar-${bloco.tipo}" data-narrar-cartao="${bloco.id}">
      <header class="narrar-cabeca"><p class="narrar-tipo">${bloco.tipo === 'momento' ? 'Cena' : 'Consulta'}</p><h3 class="narrar-titulo" tabindex="-1">${escapar(semMarcas(bloco.titulo))}</h3>${bloco.tipo === 'momento' ? `<button type="button" class="narrar-fixar" data-narrar-fixar="${bloco.id}" aria-pressed="${fixado}">${fixado ? 'Fixado' : 'Fixar'}</button>` : ''}</header>
      ${partes.join('')}
      ${handouts.length ? `<p class="narrar-handouts">Handouts desta cena: ${handouts.map(codigo => `<button type="button" class="narrar-handout" data-narrar-handout="${codigo}">${codigo}</button>`).join(' ')}</p>` : ''}
    </article>`;
  }

  const api = { slug, temNarrar, ler, desenhar, trechos };
  if (typeof module === 'object' && module.exports) { module.exports = api; return; }

  // ---------------- No navegador ----------------
  const MAX_FIXADOS = 3;
  const MAX_VISITADOS = 50;
  const roteirosComCampos = new Set();
  const chave = (campanha, roteiro) => `narrar:${campanha}:${roteiro}`;
  const pronta = () => (window.wikiApp ? Promise.resolve() : new Promise(ok => document.addEventListener('wiki:pronta', ok, { once: true })));
  const horaDe = minutos => { const m = ((minutos % 1440) + 1440) % 1440; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
  // As horas da madrugada contam depois da meia-noite: 00:30 vem depois de 23:00 se a noite começa à tarde ou à noite.
  const naNoite = (relogio, minutos) => (relogio.length && relogio[0].minutos >= 720 && minutos < 720 ? minutos + 1440 : minutos);

  function carregar(campanha, roteiro, modelo) {
    const salvo = (window.wikiApp && window.wikiApp.prefs.get(chave(campanha, roteiro))) || {};
    const existe = id => modelo.blocos.some(bloco => bloco.id === id);
    const inicioDaNoite = modelo.relogio.length ? naNoite(modelo.relogio, modelo.relogio[0].minutos) : null;
    return {
      atual: existe(salvo.atual) ? salvo.atual : null,
      fixados: (Array.isArray(salvo.fixados) ? salvo.fixados : []).filter(existe).slice(0, MAX_FIXADOS),
      visitados: (Array.isArray(salvo.visitados) ? salvo.visitados : []).filter(existe).slice(-MAX_VISITADOS),
      minutos: Number.isFinite(salvo.minutos) ? salvo.minutos : inicioDaNoite,
      alarme: Number.isInteger(salvo.alarme) && salvo.alarme >= 0 && salvo.alarme < modelo.alarme.length ? salvo.alarme : 0
    };
  }
  const guardar = (campanha, roteiro, estado) => window.wikiApp.prefs.set(chave(campanha, roteiro), estado);

  // O painel Mesa: a hora da missão (com o próximo evento e os gatilhos que já chegaram) e o degrau do alarme.
  function painel(modelo, estado) {
    const partes = [];
    if (modelo.relogio.length && estado.minutos !== null) {
      const agora = estado.minutos;
      const eventos = modelo.relogio.map(linha => ({ ...linha, quando: naNoite(modelo.relogio, linha.minutos) }));
      const proximo = eventos.find(evento => evento.quando > agora);
      const passados = eventos.filter(evento => evento.quando <= agora);
      const gatilhos = [...new Map(passados.flatMap(evento => evento.links).map(link => [link.id, link])).values()];
      partes.push(`<section class="narrar-bloco" aria-labelledby="narrar-hora-t"><p class="narrar-rotulo" id="narrar-hora-t">Hora da missão</p>
        <p class="narrar-hora" aria-live="polite">${horaDe(agora)}</p>
        <div class="narrar-botoes"><button type="button" class="narrar-passo" data-narrar-hora="-10" aria-label="Voltar 10 minutos">−10</button><button type="button" class="narrar-passo" data-narrar-hora="10" aria-label="Avançar 10 minutos">+10</button><button type="button" class="narrar-passo" data-narrar-hora="30" aria-label="Avançar 30 minutos">+30</button></div>
        ${passados.length ? `<p class="narrar-agora"><b>Agora:</b> ${escapar(passados[passados.length - 1].texto)}</p>` : ''}
        ${proximo ? `<p class="narrar-proximo"><b>${proximo.hora}</b> (em ${proximo.quando - agora} min): ${escapar(proximo.texto)}</p>` : '<p class="narrar-proximo">Fim do relógio.</p>'}
        ${gatilhos.length ? `<div class="narrar-gatilhos">${gatilhos.map(link => botaoIr(link.id, link.rotulo, { classe: 'narrar-ir narrar-gatilho' })).join('')}</div>` : ''}</section>`);
    }
    if (modelo.alarme.length) {
      const degrau = modelo.alarme[estado.alarme];
      partes.push(`<section class="narrar-bloco" aria-labelledby="narrar-alarme-t"><p class="narrar-rotulo" id="narrar-alarme-t">Alarme</p>
        <div class="narrar-degraus" role="group" aria-labelledby="narrar-alarme-t">${modelo.alarme.map((linha, indice) => `<button type="button" class="narrar-degrau" data-narrar-alarme="${indice}" aria-pressed="${indice === estado.alarme}">${escapar(linha.nome)}</button>`).join('')}</div>
        <p class="narrar-agora" aria-live="polite">${escapar(degrau.texto)}</p>
        ${degrau.links.length ? `<div class="narrar-gatilhos">${degrau.links.map(link => botaoIr(link.id, link.rotulo, { classe: 'narrar-ir narrar-gatilho' })).join('')}</div>` : ''}</section>`);
    }
    const consultas = modelo.blocos.filter(bloco => bloco.tipo === 'consulta');
    if (consultas.length) partes.push(`<section class="narrar-bloco" aria-labelledby="narrar-consultas-t"><p class="narrar-rotulo" id="narrar-consultas-t">Consultar</p><div class="narrar-lista">${consultas.map(bloco => botaoIr(bloco.id, bloco.titulo, { classe: 'narrar-consulta' })).join('')}</div></section>`);
    partes.push('<p class="narrar-rodape"><button type="button" class="narrar-link" data-narrar-recomecar>Recomeçar a sessão</button></p>');
    return partes.join('');
  }

  // A página da aba: lê o roteiro (o mesmo cache da aba Roteiro), desenha o cartão do momento do endereço (ou o último
  // aberto, ou o primeiro) e liga os botões. Recriada a cada troca de cena (o openPage, com o endereço #página/momento).
  async function montar(content, { campanha, roteiro, pagina, docRoteiro, docHandouts, alvo }) {
    const raizDaAba = content.querySelector('[data-narrar]');
    if (!raizDaAba) return;
    await pronta();
    const app = window.wikiApp;
    let texto;
    try { texto = await app.loadMarkdownDoc(docRoteiro); } catch {
      if (raizDaAba.isConnected) raizDaAba.innerHTML = `<div class="callout">O roteiro desta sessão não abriu. <button type="button" class="action" data-page="${escapar(docRoteiro)}">Abrir a aba Roteiro</button></div>`;
      return;
    }
    if (!raizDaAba.isConnected) return;
    const modelo = ler(texto);
    if (!modelo.inicio) { raizDaAba.innerHTML = '<div class="callout">Este roteiro não tem momentos marcados (<code>- **Momento:** id</code>).</div>'; return; }
    const estado = carregar(campanha, roteiro, modelo);
    const pedido = alvo && alvo.section;
    const existe = id => modelo.blocos.some(bloco => bloco.id === id);
    const sumiu = pedido && !existe(pedido) ? pedido : null;
    const atual = pedido && existe(pedido) ? pedido : estado.atual || modelo.inicio;
    estado.atual = atual;
    if (!estado.visitados.includes(atual)) estado.visitados = [...estado.visitados, atual].slice(-MAX_VISITADOS);
    guardar(campanha, roteiro, estado);

    const desenharTudo = () => {
      const visitados = new Set(estado.visitados);
      const momentos = modelo.blocos.filter(bloco => bloco.tipo === 'momento');
      const nome = id => semMarcas((modelo.blocos.find(bloco => bloco.id === id) || {}).titulo || id);
      const fixados = estado.fixados.map(id => `<button type="button" class="narrar-chip" data-narrar-ir="${id}"${id === atual ? ' aria-current="true"' : ''}>${escapar(nome(id))}</button>`).join('');
      const avisos = [...modelo.avisos.map(aviso => `Linha ${aviso.linha}: ${aviso.texto}`), ...(sumiu ? [`O momento "${sumiu}" saiu do roteiro; abri o ${nome(atual)}.`] : [])];
      raizDaAba.innerHTML = `
        ${avisos.length ? `<div class="callout narrar-avisos"><b>Avisos do roteiro (só você vê):</b><ul>${avisos.map(aviso => `<li>${escapar(aviso)}</li>`).join('')}</ul></div>` : ''}
        <div class="narrar-topo">
          <div class="narrar-faixa">
            <button type="button" class="narrar-abrir" data-narrar-cenas aria-expanded="false" aria-controls="narrar-cenas">Cenas</button>
            <div class="narrar-fixados" aria-label="Cartões fixados">${fixados}</div>
            ${modelo.alarme.length ? `<span class="narrar-selo narrar-selo-${estado.alarme}">${escapar(modelo.alarme[estado.alarme].nome)}</span>` : ''}
            <button type="button" class="narrar-abrir narrar-abrir-mesa" data-narrar-mesa aria-expanded="false" aria-controls="narrar-mesa">Mesa</button>
          </div>
          <nav class="narrar-cenas" id="narrar-cenas" hidden aria-label="Cenas da sessão">${momentos.map(bloco => `<button type="button" class="narrar-cena" data-narrar-ir="${bloco.id}"${bloco.id === atual ? ' aria-current="step"' : ''}>${escapar(semMarcas(bloco.titulo))}${visitados.has(bloco.id) && bloco.id !== atual ? ' <span class="narrar-visto">visto</span>' : ''}</button>`).join('')}</nav>
        </div>
        <div class="narrar-corpo">
          <div class="narrar-palco">${desenhar(modelo, atual, { renderMarkdown: app.renderMarkdown, visitados, fixados: estado.fixados })}</div>
          <section class="narrar-mesa" id="narrar-mesa" aria-label="Mesa: hora, alarme e consultas">${painel(modelo, estado)}</section>
        </div>`;
      app.linkGlossary(raizDaAba);
    };
    desenharTudo();
    // A troca de cena põe o foco no título do cartão (quem usa leitor de tela ouve onde está).
    if (pedido) raizDaAba.querySelector('.narrar-titulo')?.focus({ preventScroll: true });

    const salvarERedesenhar = () => { guardar(campanha, roteiro, estado); const mesaAberta = raizDaAba.querySelector('[data-narrar-mesa]')?.getAttribute('aria-expanded') === 'true'; desenharTudo(); if (mesaAberta) alternar('[data-narrar-mesa]', '#narrar-mesa', true); };
    // A lista das cenas abre e fecha pelo hidden; a Mesa, pela classe (na tela larga ela fica sempre à vista, na coluna).
    const alternar = (botaoSel, painelSel, forcar) => {
      const botao = raizDaAba.querySelector(botaoSel);
      const alvoDoBotao = raizDaAba.querySelector(painelSel);
      if (!botao || !alvoDoBotao) return;
      const abrir = forcar ?? botao.getAttribute('aria-expanded') !== 'true';
      botao.setAttribute('aria-expanded', String(abrir));
      if (alvoDoBotao.id === 'narrar-cenas') alvoDoBotao.hidden = !abrir;
      else alvoDoBotao.classList.toggle('aberta', abrir);
    };
    raizDaAba.addEventListener('click', async evento => {
      const ir = evento.target.closest('[data-narrar-ir]');
      if (ir) { app.openPage(pagina, { section: ir.dataset.narrarIr }); return; }
      const fixar = evento.target.closest('[data-narrar-fixar]');
      if (fixar) {
        const id = fixar.dataset.narrarFixar;
        estado.fixados = estado.fixados.includes(id) ? estado.fixados.filter(item => item !== id) : [...estado.fixados, id].slice(-MAX_FIXADOS);
        salvarERedesenhar();
        raizDaAba.querySelector('[data-narrar-fixar]')?.focus();
        return;
      }
      const hora = evento.target.closest('[data-narrar-hora]');
      if (hora && estado.minutos !== null) { estado.minutos += Number(hora.dataset.narrarHora); salvarERedesenhar(); raizDaAba.querySelector(`[data-narrar-hora="${hora.dataset.narrarHora}"]`)?.focus(); return; }
      const degrau = evento.target.closest('[data-narrar-alarme]');
      if (degrau) { estado.alarme = Number(degrau.dataset.narrarAlarme); salvarERedesenhar(); raizDaAba.querySelector(`[data-narrar-alarme="${estado.alarme}"]`)?.focus(); return; }
      if (evento.target.closest('[data-narrar-cenas]')) { alternar('[data-narrar-cenas]', '#narrar-cenas'); return; }
      if (evento.target.closest('[data-narrar-mesa]')) { alternar('[data-narrar-mesa]', '#narrar-mesa'); return; }
      const handout = evento.target.closest('[data-narrar-handout]');
      if (handout && docHandouts) { app.openPage(docHandouts, { section: handout.dataset.narrarHandout.toLowerCase() }); return; }
      if (evento.target.closest('[data-narrar-recomecar]')) {
        const certo = window.wikiPopup ? await window.wikiPopup.confirm({ title: 'Recomeçar a sessão', message: 'Zera a hora, o alarme, os cartões fixados e as cenas vistas desta sessão.', ok: 'Recomeçar' }) : window.confirm('Recomeçar a sessão?');
        if (!certo) return;
        app.prefs.set(chave(campanha, roteiro), null);
        app.openPage(pagina, { section: modelo.inicio });
      }
    });
    // As preferências chegam do servidor depois da primeira página: redesenha com o estado da conta.
    const aoChegar = () => {
      if (!raizDaAba.isConnected) { document.removeEventListener('wiki:preferencias', aoChegar); return; }
      Object.assign(estado, carregar(campanha, roteiro, modelo), { atual });
      desenharTudo();
    };
    document.addEventListener('wiki:preferencias', aoChegar);
  }

  // Na aba Roteiro, as linhas de marcação ("Momento: x", "Consulta: x") somem: são para a aba Narrar.
  function marcarRoteiro(id) { roteirosComCampos.add(id); }
  document.addEventListener('wiki:documento', evento => {
    const { id, container } = evento.detail || {};
    if (!roteirosComCampos.has(id) || !container) return;
    container.querySelectorAll('ul').forEach(lista => {
      const itens = [...lista.children];
      if (itens.length && itens.every(item => /^(Momento|Consulta):\s*\S/.test(item.textContent.trim()))) lista.remove();
    });
  });

  raiz.fieldbookNarrar = { ...api, montar, marcarRoteiro };
})(typeof window !== 'undefined' ? window : globalThis);

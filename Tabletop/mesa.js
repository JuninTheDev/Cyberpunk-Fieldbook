// A mesa da wiki no navegador: desenha a cena (mapa, grade, névoa, tokens, réguas, pings e cursores), recebe as
// mudanças ao vivo (Server-Sent Events de /api/mesa/eventos) e manda as operações (/api/mesa/op). O servidor decide
// tudo: este arquivo só desenha o que ele mandou e pede. Vai para os jogadores: nada de segredo aqui.
(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const config = window.mesaConfig || {};
  const rules = (window.systemRules && window.systemRules.data) || {};
  const STATS = ['INT', 'REF', 'DEX', 'TECH', 'COOL', 'WILL', 'LUCK', 'MOVE', 'BODY', 'EMP'];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  const initials = name => String(name || '?').replace(/"[^"]*"/g, ' ').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || '?';
  // No mapa, o apelido entre aspas (Jax "Ferrugem" Moreno → Ferrugem) ou o nome cortado: dois tokens lado a lado
  // não se cobrem. O nome inteiro fica no cartão e nas listas.
  const nomeCurto = name => { const apelido = String(name).match(/"([^"]+)"/); const nome = apelido ? apelido[1] : String(name); return nome.length > 18 ? `${nome.slice(0, 17)}…` : nome; };
  const hora = iso => { try { return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };
  const sinal = value => (value < 0 ? `− ${Math.abs(value)}` : `+ ${value}`);
  const woundClass = estado => ({ 'Sem ferimentos': 'ileso', 'Levemente Ferido': 'leve', 'Gravemente Ferido': 'grave', 'Mortalmente Ferido': 'mortal' })[estado] || '';
  const store = {
    get: key => { try { return localStorage.getItem(`mesa:${key}`); } catch { return null; } },
    set: (key, value) => { try { localStorage.setItem(`mesa:${key}`, value); } catch { /* sem armazenamento */ } }
  };

  const canvas = $('#tela');
  const ctx = canvas.getContext('2d');
  const S = {
    eu: null, campanha: null, campanhas: [], conexao: null, fonte: null,
    cena: null, tokens: new Map(), cenas: [], cenaAtiva: null, combate: null, registro: [], presenca: [], personagens: [], npcs: [], meus: [],
    vista: { x: 0, y: 0, escala: 1 }, alvoVista: null, cenaVista: null,
    selecionado: null, ferramenta: 'mover', nevoaModo: 'revelar', nevoaRaio: 3,
    fundo: null, imagens: new Map(), nevoaCanvas: null, nevoaEscala: 1, nevoaLocal: [],
    atividade: new Map(), pings: [], arrasto: null, minhaRegua: null, mouse: null,
    mostrarCursor: store.get('cursor') !== 'nao', sujo: true, dpr: 1, ultimoQuadro: 0, vezAnterior: null,
    previaGrade: null, ataque: null, escolhendoAlvo: false, defesas: [],
    visao: null, paredeTipo: 'parede', paredeSel: null, tileSel: null, tilePrevia: null, aparenciaAberta: false, luzSel: null, luzPrevia: null,
    // A ficha de jogo: as fichas que o mestre abriu na aba Fichas, a munição escolhida para recarregar cada arma e a
    // ficha que mudou enquanto alguém digitava nela (redesenha quando o campo perde o foco).
    fichasAbertas: new Set(), municaoEscolhida: new Map(), fichasPendentes: false,
    // A barra lateral aberta (no PC; no celular é a folha de baixo).
    barraAberta: true,
    // As notas no mapa: a escolhida na ferramenta Notas, o arrasto que ainda não voltou do servidor e a nota aberta.
    notaSel: null, notaPrevia: null, notaAberta: null,
    // O áudio: o que o servidor mandou (o que toca e, para o mestre, as playlists), as playlists abertas na aba Áudio e a
    // faixa com as opções abertas.
    audio: null, playlistsAbertas: new Set(), faixaAberta: null
  };
  const gm = () => S.eu && S.eu.papel === 'mestre';
  const grade = () => S.previaGrade || (S.cena && S.cena.grade) || { tamanho: 100, metros: 2, x: 0, y: 0, visivel: true };
  const redesenhar = () => { S.sujo = true; };

  // ---------------- Avisos ----------------
  function aviso(texto, tipo = '') {
    const item = document.createElement('div');
    item.className = `aviso ${tipo}`;
    item.textContent = texto;
    $('#avisos').append(item);
    setTimeout(() => item.remove(), tipo === 'erro' ? 6000 : 3500);
  }

  // ---------------- Servidor ----------------
  const comCampanha = pathname => `${pathname}?campanha=${encodeURIComponent(S.campanha || '')}`;
  async function op(tipo, dados = {}) {
    const response = await fetch(comCampanha('/api/mesa/op'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo, conexao: S.conexao, ...dados }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      aviso(data.erro || `A mesa recusou (${response.status}).`, 'erro');
      throw new Error(data.erro || String(response.status));
    }
    return data;
  }
  // Cursor, régua e ping: no máximo um envio a cada 90 ms, sempre com o mais recente.
  let pendente = null;
  let pendenteTimer = null;
  let ultimoEnvio = 0;
  function atividade(dados, imediato = false) {
    if (!S.conexao) return;
    pendente = { ...(pendente || {}), ...dados };
    const espera = 90 - (performance.now() - ultimoEnvio);
    if (imediato || espera <= 0) return enviarAtividade();
    if (!pendenteTimer) pendenteTimer = setTimeout(enviarAtividade, espera);
  }
  function enviarAtividade() {
    clearTimeout(pendenteTimer);
    pendenteTimer = null;
    if (!pendente) return;
    const body = JSON.stringify({ conexao: S.conexao, ...pendente });
    pendente = null;
    ultimoEnvio = performance.now();
    fetch(comCampanha('/api/mesa/atividade'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }).catch(() => {});
  }
  const compartilho = () => !gm() || S.mostrarCursor;

  function conectar() {
    if (S.fonte) S.fonte.close();
    const ligacao = $('#ligacao');
    ligacao.className = 'ligacao';
    ligacao.textContent = 'conectando…';
    const fonte = new EventSource(comCampanha('/api/mesa/eventos'));
    S.fonte = fonte;
    const on = (evento, fn) => fonte.addEventListener(evento, event => { try { fn(JSON.parse(event.data)); } catch (error) { console.error(`Mesa: ${evento}`, error); } });
    on('estado', data => { ligacao.className = 'ligacao ok'; ligacao.textContent = 'ao vivo'; aplicarEstado(data); });
    on('cena', data => { carregarCena(data.cena); renderTudo(); });
    on('cenas', data => { S.cenas = data.cenas; S.cenaAtiva = data.cenaAtiva; renderTopo(); renderCenaPainel(); });
    on('token', data => { guardarToken(data); renderDepoisDeToken(data.id); });
    on('token.sumir', data => { S.tokens.delete(data.id); if (S.selecionado === data.id) S.selecionado = null; renderDepoisDeToken(data.id); });
    on('nevoa', data => { if (S.cena && data.cena === S.cena.id) receberNevoa(data.tracos || []); });
    on('paredes', data => {
      if (!S.cena || data.cena !== S.cena.id) return;
      S.cena.paredes = data.paredes;
      if (S.visao) S.visao.versao = (S.visao.versao || 0) + 1;
      renderParedeOpcoes();
      renderCenaPainel();
      redesenhar();
    });
    on('luzes', data => { if (S.cena && data.cena === S.cena.id) { S.cena.luzes = data.luzes; renderCenaPainel(); redesenhar(); } });
    // As notas que um token do jogador vê aparecem e somem enquanto ele anda; o mestre pode abrir uma na tela de todos.
    on('notas', data => { if (S.cena && data.cena === S.cena.id) { S.cena.notas = data.notas; atualizarNotaAberta(); redesenhar(); } });
    on('nota.aberta', data => abrirNota(data));
    on('visao.esquecer', data => { if (S.cena && data.cena === S.cena.id) esquecerExplorado(); });
    on('combate', data => { S.combate = data; renderCombate(); renderVez(); redesenhar(); });
    on('registro', data => { S.registro.push(data); if (S.registro.length > 200) S.registro.shift(); adicionarRegistro(data); });
    on('registro.troca', trocarRegistro);
    on('defesa', data => { if (!S.defesas.some(item => item.ataque === data.ataque && item.alvo === data.alvo)) S.defesas.push(data); renderDefesas(); });
    on('defesa.fim', data => { S.defesas = S.defesas.filter(item => item.ataque !== data.ataque || (data.alvo && item.alvo !== data.alvo)); renderDefesas(); });
    on('registro.limpo', () => { S.registro = []; renderRegistro(); });
    on('presenca', data => { S.presenca = data; renderPresenca(); });
    on('audio', receberAudio);
    // A ficha de um personagem mudou (pela mesa, pela wiki ou pelo Foundry): o mestre recebe todas; o jogador, as dele.
    on('fichas', data => {
      if (data.personagens) S.personagens = data.personagens;
      if (data.meus) S.meus = data.meus;
      renderFichas();
      renderPericias();
      renderCartao();
    });
    on('atividade', receberAtividade);
    fonte.onerror = () => {
      ligacao.className = 'ligacao caiu';
      ligacao.textContent = fonte.readyState === EventSource.CLOSED ? 'fora do ar' : 'reconectando…';
      S.conexao = null;
      // Fechada de vez (sessão acabou, campanha sumiu): confere quem é quem de novo.
      if (fonte.readyState === EventSource.CLOSED) setTimeout(() => iniciar(), 3000);
    };
  }

  // ---------------- Estado ----------------
  function aplicarEstado(data) {
    // O servidor reiniciou com outra versão: esta página é a velha (a operação nova volta recusada). Pede para recarregar.
    if (S.versao && data.versao && data.versao !== S.versao) $('#atualizada').hidden = false;
    if (!S.versao) S.versao = data.versao;
    S.conexao = data.conexao;
    S.eu = data.eu;
    document.body.classList.toggle('mestre', gm());
    document.body.classList.toggle('jogador', !gm());
    S.campanhaInfo = data.campanha;
    S.combate = data.combate;
    S.registro = data.registro || [];
    S.presenca = data.presenca || [];
    S.defesas = data.defesas || [];
    S.cenas = data.cenas || [];
    S.cenaAtiva = data.cenaAtiva || null;
    S.personagens = data.personagens || [];
    S.npcs = data.npcs || [];
    S.meus = data.meus || [];
    S.audio = data.audio || null;
    if (tocador) tocador.aplicar(S.audio);
    carregarCena(data.cena);
    renderTudo();
    renderRegistro();
    renderDefesas();
  }
  function guardarToken(data) {
    const atual = S.tokens.get(data.id);
    // sx, sy: onde o servidor diz que o token está (a visão conta daí, não do lugar que o arrasto ainda não confirmou).
    const token = { ...data, vx: atual ? atual.vx : data.x, vy: atual ? atual.vy : data.y, sx: data.x, sy: data.y };
    // Arrastando este token agora: a posição na tela continua a do arrasto.
    S.tokens.set(data.id, token);
    redesenhar();
  }
  function carregarCena(cena) {
    const mesma = S.cena && cena && S.cena.id === cena.id;
    S.cena = cena ? { ...cena, tokens: undefined } : null;
    S.previaGrade = null;
    const antigos = S.tokens;
    S.tokens = new Map();
    for (const token of (cena && cena.tokens) || []) {
      const atual = mesma && antigos.get(token.id);
      S.tokens.set(token.id, { ...token, vx: atual ? atual.vx : token.x, vy: atual ? atual.vy : token.y, sx: token.x, sy: token.y });
    }
    if (!S.tokens.has(S.selecionado)) S.selecionado = null;
    S.arrasto = null;
    S.nevoaLocal = [];
    S.fundo = cena && cena.imagem ? midia(cena.imagem, cena.video, true) : null;
    // Só tocam os vídeos desta cena (os de outra, guardados, param).
    const daCena = new Set([cena && cena.imagem, ...((cena && cena.tiles) || []).map(tile => tile.imagem)].filter(Boolean));
    for (const [src, item] of S.imagens) {
      if (item.tagName !== 'VIDEO') continue;
      if (daCena.has(src)) item.play().catch(() => {}); else item.pause();
    }
    construirNevoa();
    prepararVisao();
    if (!mesma) { S.paredeSel = null; S.tileSel = null; S.luzSel = null; S.notaSel = null; }
    S.tilePrevia = null;
    S.luzPrevia = null;
    S.notaPrevia = null;
    renderNotaOpcoes();
    atualizarNotaAberta();
    renderLuzOpcoes();
    renderParedeOpcoes();
    renderTileOpcoes();
    if (cena && (!mesma || S.cenaVista !== cena.id)) { S.cenaVista = cena.id; enquadrar(); }
    $('#vazio').hidden = Boolean(cena);
    $('#vazio').innerHTML = gm() ? '<div><b>Nenhuma cena aberta</b>Crie uma cena na aba Cena: com um mapa ou só com a grade.</div>' : '<div><b>Esperando o mestre</b>O mestre ainda não abriu uma cena.</div>';
    redesenhar();
  }

  // ---------------- Névoa ----------------
  // O mesmo que o servidor usa para decidir o que cada um vê: os traços em ordem, o último que cobre o ponto vale.
  function construirNevoa() {
    const cena = S.cena;
    if (!cena || !cena.nevoa || !cena.nevoa.ativa) { S.nevoaCanvas = null; return; }
    const escala = Math.min(1, 2048 / Math.max(cena.largura, cena.altura));
    const tela = S.nevoaCanvas || document.createElement('canvas');
    tela.width = Math.max(1, Math.round(cena.largura * escala));
    tela.height = Math.max(1, Math.round(cena.altura * escala));
    S.nevoaCanvas = tela;
    S.nevoaEscala = escala;
    const c = tela.getContext('2d');
    c.globalCompositeOperation = 'source-over';
    c.fillStyle = '#040607';
    c.fillRect(0, 0, tela.width, tela.height);
    for (const traco of cena.nevoa.tracos) aplicarTraco(traco);
    for (const traco of S.nevoaLocal) aplicarTraco(traco);
    redesenhar();
  }
  function aplicarTraco(traco) {
    const tela = S.nevoaCanvas;
    if (!tela) return;
    const c = tela.getContext('2d');
    const e = S.nevoaEscala;
    if (traco.tudo) {
      if (traco.modo === 'revelar') c.clearRect(0, 0, tela.width, tela.height);
      return;
    }
    c.globalCompositeOperation = traco.modo === 'revelar' ? 'destination-out' : 'source-over';
    c.fillStyle = '#040607';
    c.beginPath();
    c.arc(traco.x * e, traco.y * e, traco.r * e, 0, Math.PI * 2);
    c.fill();
    c.globalCompositeOperation = 'source-over';
  }
  function receberNevoa(tracos) {
    S.cena.nevoa.tracos.push(...tracos);
    // Os meus traços voltam pelo servidor: saem da fila local (a ordem é a do envio).
    S.nevoaLocal.splice(0, Math.min(S.nevoaLocal.length, tracos.length));
    construirNevoa();
  }
  // A mesma conta do servidor: vale o último traço que cobre o ponto.
  function nevoaMostra(x, y) {
    const nevoa = S.cena && S.cena.nevoa;
    if (!nevoa || !nevoa.ativa) return true;
    let mostra = false;
    for (const traco of nevoa.tracos) if (traco.tudo || (x - traco.x) ** 2 + (y - traco.y) ** 2 <= traco.r ** 2) mostra = traco.modo === 'revelar';
    return mostra;
  }

  // ---------------- Luz e visão ----------------
  // Com a visão ligada, o jogador vê o que os tokens dele veem (mesa-visao.js, a mesma conta do servidor, que nem manda
  // os tokens fora da vista). Sem a luz global, cada token vê o alcance dele e o que uma luz ilumina. O que ele já viu
  // fica na penumbra, guardado neste navegador (como a exploração da névoa do Foundry); o mestre manda esquecer.
  // Para todos: o brilho colorido das luzes e a escuridão da cena, com as luzes abrindo clareiras.
  const VIS = window.mesaVisao;
  const chaveExplorado = () => `explorado:${S.campanha || ''}:${S.cena ? S.cena.id : ''}:${(S.eu && S.eu.conta) || ''}`;
  const luzDaCena = () => (S.cena && S.cena.luz) || { global: true, escuridao: 0 };
  const metrosEmPx = metros => (Number(metros) || 0) / (grade().metros || 2) * grade().tamanho;
  function prepararVisao() {
    const v = { chave: '', chaveLuzes: '', olhos: [], luzes: [], canvas: null, explorado: null, brilho: null, escuro: null, escala: 1, timer: null };
    clearTimeout(S.visao && S.visao.timer);
    S.visao = v;
    const cena = S.cena;
    if (!cena) return;
    v.escala = Math.min(0.5, 1024 / Math.max(cena.largura, cena.altura));
    const tela = () => { const item = document.createElement('canvas'); item.width = Math.max(1, Math.round(cena.largura * v.escala)); item.height = Math.max(1, Math.round(cena.altura * v.escala)); return item; };
    v.brilho = tela();
    v.escuro = tela();
    if (!cena.visao || gm()) return;
    v.canvas = tela();
    v.explorado = tela();
    const salvo = store.get(chaveExplorado());
    if (salvo) {
      const imagemSalva = new Image();
      imagemSalva.onload = () => { if (S.visao !== v) return; v.explorado.getContext('2d').drawImage(imagemSalva, 0, 0, v.explorado.width, v.explorado.height); v.chave = ''; redesenhar(); };
      imagemSalva.src = salvo;
    }
  }
  // Os olhos: os tokens do jogador, onde o servidor diz que estão, com o alcance da visão em px.
  const olhos = () => [...S.tokens.values()].filter(token => token.meu).map(token => ({ x: token.sx ?? token.x, y: token.sy ?? token.y, alcance: metrosEmPx(token.alcance ?? 30) }));
  const ambiente = () => ({ global: luzDaCena().global, luzes: ((S.cena && S.cena.luzes) || []).map(luz => ({ x: luz.x, y: luz.y, raio: Math.max(luz.claro, luz.penumbra) })) });
  const caminho = (c, pontos) => { c.beginPath(); pontos.forEach((ponto, i) => (i ? c.lineTo(ponto.x, ponto.y) : c.moveTo(ponto.x, ponto.y))); c.closePath(); };
  // As luzes com o polígono de cada uma (até onde a parede de luz deixa), refeitas quando elas ou as paredes mudam.
  function atualizarLuzes() {
    const v = S.visao;
    const cena = S.cena;
    const chave = JSON.stringify([cena.luzes || [], luzDaCena(), v.versao || 0]);
    if (chave === v.chaveLuzes) return false;
    v.chaveLuzes = chave;
    v.luzes = (cena.luzes || []).map(luz => {
      const raio = Math.max(luz.claro, luz.penumbra);
      return { ...luz, raio, poligono: raio > 0 ? VIS.poligono(cena.paredes || [], luz, cena.largura, cena.altura, margem(), { tipo: VIS.LUZ, raio }) : [] };
    });
    // O brilho: a cor de cada luz, forte no claro e sumindo na penumbra (só as que têm cor, como no Foundry).
    const b = v.brilho.getContext('2d');
    b.setTransform(1, 0, 0, 1, 0, 0);
    b.clearRect(0, 0, v.brilho.width, v.brilho.height);
    b.setTransform(v.escala, 0, 0, v.escala, 0, 0);
    v.temBrilho = false;
    for (const luz of v.luzes) {
      if (!luz.cor || luz.poligono.length < 3) continue;
      v.temBrilho = true;
      b.save();
      caminho(b, luz.poligono);
      b.clip();
      const gradiente = b.createRadialGradient(luz.x, luz.y, 0, luz.x, luz.y, luz.raio);
      gradiente.addColorStop(0, luz.cor);
      gradiente.addColorStop(Math.min(0.99, luz.claro / luz.raio || 0), luz.cor);
      gradiente.addColorStop(1, 'rgba(0, 0, 0, 0)');
      b.globalAlpha = Math.max(0.1, Math.min(1, luz.alpha ?? 0.5));
      b.fillStyle = gradiente;
      b.beginPath();
      b.arc(luz.x, luz.y, luz.raio, 0, Math.PI * 2);
      b.fill();
      b.restore();
    }
    // A escuridão: a cena toda escura (o mestre vê mais claro), e as luzes abrem a clareira (cheia no claro, metade na
    // penumbra).
    const escuridao = luzDaCena().escuridao || 0;
    const e = v.escuro.getContext('2d');
    e.setTransform(1, 0, 0, 1, 0, 0);
    e.clearRect(0, 0, v.escuro.width, v.escuro.height);
    v.temEscuro = escuridao > 0;
    if (v.temEscuro) {
      e.fillStyle = `rgba(4, 6, 7, ${escuridao * (gm() ? 0.55 : 0.85)})`;
      e.fillRect(0, 0, v.escuro.width, v.escuro.height);
      e.setTransform(v.escala, 0, 0, v.escala, 0, 0);
      e.globalCompositeOperation = 'destination-out';
      for (const luz of v.luzes) {
        if (luz.poligono.length < 3) continue;
        e.save();
        caminho(e, luz.poligono);
        e.clip();
        const gradiente = e.createRadialGradient(luz.x, luz.y, 0, luz.x, luz.y, luz.raio);
        gradiente.addColorStop(0, 'rgba(0, 0, 0, 1)');
        gradiente.addColorStop(Math.min(0.99, luz.claro / luz.raio || 0), 'rgba(0, 0, 0, 1)');
        gradiente.addColorStop(1, 'rgba(0, 0, 0, .5)');
        e.fillStyle = gradiente;
        e.beginPath();
        e.arc(luz.x, luz.y, luz.raio, 0, Math.PI * 2);
        e.fill();
        e.restore();
      }
      e.globalCompositeOperation = 'source-over';
    }
    return true;
  }
  // O que os olhos veem agora: dentro do polígono de cada olho, tudo (luz global) ou o alcance e as clareiras das luzes.
  function pintarVisivel(c, cor) {
    const v = S.visao;
    const global = luzDaCena().global;
    c.setTransform(v.escala, 0, 0, v.escala, 0, 0);
    c.fillStyle = cor;
    for (const olho of v.olhos) {
      if (olho.poligono.length < 3) continue;
      c.save();
      caminho(c, olho.poligono);
      c.clip();
      if (global) {
        c.fillRect(-margem().x, -margem().y, S.cena.largura + margem().x * 2, S.cena.altura + margem().y * 2);
      } else {
        c.beginPath();
        c.arc(olho.x, olho.y, olho.alcance, 0, Math.PI * 2);
        c.fill();
        for (const luz of v.luzes) {
          if (luz.poligono.length < 3) continue;
          c.save();
          caminho(c, luz.poligono);
          c.clip();
          c.beginPath();
          c.arc(luz.x, luz.y, luz.raio, 0, Math.PI * 2);
          c.fill();
          c.restore();
        }
      }
      c.restore();
    }
    c.setTransform(1, 0, 0, 1, 0, 0);
  }
  function atualizarVisao() {
    const v = S.visao;
    const cena = S.cena;
    if (!v || !v.brilho) return;
    const luzesMudaram = atualizarLuzes();
    if (!v.canvas) return;
    const meus = olhos();
    const chave = JSON.stringify([meus, v.versao || 0, v.chaveLuzes]);
    if (chave === v.chave && !luzesMudaram) return;
    v.chave = chave;
    v.olhos = meus.map(olho => ({ ...olho, poligono: VIS.poligono(cena.paredes || [], olho, cena.largura, cena.altura, margem()) }));
    if (v.olhos.length) {
      pintarVisivel(v.explorado.getContext('2d'), '#fff');
      clearTimeout(v.timer);
      v.timer = setTimeout(() => store.set(chaveExplorado(), v.explorado.toDataURL('image/png')), 1500);
    }
    // A sombra: preto onde nunca viu, penumbra onde já viu, limpo onde vê agora.
    const c = v.canvas.getContext('2d');
    c.globalCompositeOperation = 'source-over';
    c.fillStyle = '#040607';
    c.fillRect(0, 0, v.canvas.width, v.canvas.height);
    c.globalCompositeOperation = 'destination-out';
    c.globalAlpha = 0.45;
    c.drawImage(v.explorado, 0, 0);
    c.globalAlpha = 1;
    pintarVisivel(c, '#000');
    c.globalCompositeOperation = 'source-over';
  }
  function esquecerExplorado() {
    const v = S.visao;
    store.set(chaveExplorado(), '');
    if (!v || !v.explorado) return;
    v.explorado.getContext('2d').clearRect(0, 0, v.explorado.width, v.explorado.height);
    v.chave = '';
    redesenhar();
  }
  // O brilho e a escuridão (todos), por cima do mapa e dos tiles.
  function desenharLuz() {
    const v = S.visao;
    if (!v || !v.brilho) return;
    atualizarVisao();
    const cena = S.cena;
    if (v.temBrilho) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.drawImage(v.brilho, 0, 0, cena.largura, cena.altura);
      ctx.restore();
    }
    if (v.temEscuro) ctx.drawImage(v.escuro, 0, 0, cena.largura, cena.altura);
  }
  function desenharVisao(px) {
    atualizarVisao();
    const cena = S.cena;
    ctx.drawImage(S.visao.canvas, 0, 0, cena.largura, cena.altura);
    if (!S.visao.olhos.length) {
      const meio = meioLivre();
      rotulo('Nenhum token seu nesta cena: você vê só o que já explorou.', meio.x, meio.y, px, { tamanho: 13 });
    }
  }

  // Portas: o ícone no meio da porta. O jogador vê (e abre) a porta que um token dele vê; o mestre vê todas, também
  // as secretas, e tranca com Shift.
  const meioDe = parede => ({ x: (parede.c[0] + parede.c[2]) / 2, y: (parede.c[1] + parede.c[3]) / 2 });
  const ladoDaPorta = () => Math.max(grade().tamanho * 0.3, 16 / S.vista.escala);
  function portasVisiveis() {
    const cena = S.cena;
    if (!cena) return [];
    const portas = (cena.paredes || []).filter(parede => parede.porta);
    if (gm()) return portas;
    const meus = olhos();
    const luz = ambiente();
    // O meio da porta fica na própria porta: ela não tapa a si mesma (encostar não conta).
    return portas.filter(porta => {
      const meio = meioDe(porta);
      if (!nevoaMostra(meio.x, meio.y)) return false;
      return !cena.visao || VIS.pontoVisto(meus, meio, cena.paredes, luz);
    });
  }
  function portaEm(ponto) {
    const lado = ladoDaPorta();
    return portasVisiveis().find(porta => { const meio = meioDe(porta); return Math.abs(ponto.x - meio.x) <= lado / 2 && Math.abs(ponto.y - meio.y) <= lado / 2; }) || null;
  }
  function desenharPortas(px) {
    const lado = ladoDaPorta();
    for (const porta of portasVisiveis()) {
      const { x, y } = meioDe(porta);
      const cor = porta.porta === 2 ? '#8f7bff' : porta.estado === 2 ? '#ff3158' : porta.estado === 1 ? '#57e389' : '#00ffd2';
      ctx.fillStyle = 'rgba(11, 13, 15, .88)';
      ctx.fillRect(x - lado / 2, y - lado / 2, lado, lado);
      ctx.lineWidth = Math.max(2 * px, lado * 0.08);
      ctx.strokeStyle = cor;
      ctx.strokeRect(x - lado / 2, y - lado / 2, lado, lado);
      // A folha da porta: fechada, cheia; aberta, girada para fora do batente.
      const f = lado * 0.22;
      ctx.fillStyle = cor;
      if (porta.estado === 1) {
        ctx.beginPath();
        ctx.moveTo(x - f, y + f * 1.4); ctx.lineTo(x - f, y - f * 1.4); ctx.lineTo(x + f * 0.9, y - f * 0.9); ctx.lineTo(x + f * 0.9, y + f * 1.8);
        ctx.closePath();
        ctx.lineWidth = Math.max(1.5 * px, lado * 0.06);
        ctx.stroke();
      } else {
        ctx.fillRect(x - f, y - f * 1.4, f * 2, f * 2.8);
      }
      if (porta.estado === 2) {
        ctx.fillStyle = '#0b0d0f';
        ctx.beginPath();
        ctx.arc(x, y - f * 0.2, f * 0.38, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(x - f * 0.14, y - f * 0.2, f * 0.28, f * 0.9);
      }
    }
  }

  // ---------------- Paredes (mestre) ----------------
  // Os tipos que a ferramenta desenha, com os números do Foundry.
  const TIPOS_DE_PAREDE = {
    parede: { porta: 0, visao: 20, movimento: 20 },
    porta: { porta: 1, visao: 20, movimento: 20 },
    secreta: { porta: 2, visao: 20, movimento: 20 },
    janela: { porta: 0, visao: 0, movimento: 20 },
    limitada: { porta: 0, visao: 10, movimento: 20 }
  };
  function tipoDaParede(parede) {
    if (parede.porta === 1) return 'porta';
    if (parede.porta === 2) return 'secreta';
    if (!parede.visao) return 'janela';
    return parede.visao < 20 ? 'limitada' : 'parede';
  }
  const CORES_DE_PAREDE = { parede: '#f1f0df', porta: '#00ffd2', secreta: '#8f7bff', janela: '#4dd0ff', limitada: '#f8ef02' };
  function distanciaAoSegmento(p, parede) {
    const [x1, y1, x2, y2] = parede.c;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const t = Math.max(0, Math.min(1, ((p.x - x1) * dx + (p.y - y1) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(p.x - (x1 + t * dx), p.y - (y1 + t * dy));
  }
  function paredeEm(ponto) {
    let melhor = null;
    let menor = 9 / S.vista.escala;
    for (const parede of (S.cena && S.cena.paredes) || []) {
      const d = distanciaAoSegmento(ponto, parede);
      if (d <= menor) { menor = d; melhor = parede; }
    }
    return melhor;
  }
  // A ponta da parede gruda numa ponta que já existe (fecha o canto) ou na grade, de meio em meio quadrado. Shift solta.
  function encaixarParede(ponto, solto) {
    if (solto) return dentro(ponto);
    const raio = 12 / S.vista.escala;
    for (const parede of S.cena.paredes || []) {
      for (let i = 0; i < 2; i += 1) {
        const p = { x: parede.c[i * 2], y: parede.c[i * 2 + 1] };
        if (Math.hypot(p.x - ponto.x, p.y - ponto.y) <= raio) return p;
      }
    }
    const g = grade();
    if (g.tipo === 'nenhuma') return dentro(ponto);
    const meio = g.tamanho / 2;
    return dentro({ x: (g.x || 0) + Math.round((ponto.x - (g.x || 0)) / meio) * meio, y: (g.y || 0) + Math.round((ponto.y - (g.y || 0)) / meio) * meio });
  }
  function desenharParedes(px) {
    const linha = (c, cor, largura, tracejado) => {
      ctx.beginPath();
      ctx.moveTo(c[0], c[1]);
      ctx.lineTo(c[2], c[3]);
      ctx.setLineDash(tracejado ? [8 * px, 6 * px] : []);
      ctx.strokeStyle = 'rgba(11, 13, 15, .85)';
      ctx.lineWidth = largura + 3 * px;
      ctx.stroke();
      ctx.strokeStyle = cor;
      ctx.lineWidth = largura;
      ctx.stroke();
      ctx.setLineDash([]);
    };
    for (const parede of S.cena.paredes || []) {
      const tipo = tipoDaParede(parede);
      const escolhida = S.paredeSel === parede.id;
      linha(parede.c, escolhida ? '#f8ef02' : CORES_DE_PAREDE[tipo], (escolhida ? 5 : 3) * px, tipo === 'janela' || tipo === 'limitada' || (parede.porta && parede.estado === 1));
      for (let i = 0; i < 2; i += 1) {
        ctx.beginPath();
        ctx.arc(parede.c[i * 2], parede.c[i * 2 + 1], 3.5 * px, 0, Math.PI * 2);
        ctx.fillStyle = escolhida ? '#f8ef02' : CORES_DE_PAREDE[tipo];
        ctx.fill();
      }
    }
    if (gesto && gesto.tipo === 'parede' && gesto.moveu) linha([gesto.a.x, gesto.a.y, gesto.b.x, gesto.b.y], CORES_DE_PAREDE[S.paredeTipo], 4 * px, false);
  }
  function renderParedeOpcoes() {
    const caixa = $('#paredes-escolhida');
    const parede = S.paredeSel && S.cena && (S.cena.paredes || []).find(item => item.id === S.paredeSel);
    if (!parede) { S.paredeSel = null; caixa.hidden = true; caixa.innerHTML = ''; return; }
    const tipo = tipoDaParede(parede);
    caixa.hidden = false;
    caixa.innerHTML = `<span>Escolhida</span><select id="parede-tipo" aria-label="Tipo da parede">${Object.keys(TIPOS_DE_PAREDE).map(nome => `<option value="${nome}"${nome === tipo ? ' selected' : ''}>${{ parede: 'Parede', porta: 'Porta', secreta: 'Porta secreta', janela: 'Janela (vê, não passa)', limitada: 'Limitada (vê através de uma)' }[nome]}</option>`).join('')}</select><button class="botao vazado pequeno" type="button" data-parede-apagar>Apagar</button>`;
  }
  // ---------------- Luzes (mestre) ----------------
  // As luzes do cenário (as dos tokens andam com eles e mudam no cartão). O mestre recebe a luz com o id e os metros.
  const luzesDoCenario = () => ((S.cena && S.cena.luzes) || []).filter(luz => luz.id);
  const luzVista = luz => (S.luzPrevia && S.luzPrevia.id === luz.id ? { ...luz, ...S.luzPrevia } : luz);
  const luzEscolhida = () => luzesDoCenario().find(luz => luz.id === S.luzSel) || null;
  const raioDoIcone = () => 11 / S.vista.escala;
  const luzEm = ponto => [...luzesDoCenario()].reverse().find(luz => { const l = luzVista(luz); return Math.hypot(ponto.x - l.x, ponto.y - l.y) <= raioDoIcone() * 1.4; }) || null;
  function desenharLuzes(px) {
    for (const original of luzesDoCenario()) {
      const luz = luzVista(original);
      const escolhida = S.luzSel === luz.id;
      const r = raioDoIcone();
      if (escolhida) {
        ctx.setLineDash([6 * px, 5 * px]);
        ctx.lineWidth = 1.5 * px;
        ctx.strokeStyle = 'rgba(248, 239, 2, .8)';
        for (const raio of [luz.claro, luz.penumbra]) if (raio > 0) { ctx.beginPath(); ctx.arc(luz.x, luz.y, raio, 0, Math.PI * 2); ctx.stroke(); }
        ctx.setLineDash([]);
      }
      ctx.beginPath();
      ctx.arc(luz.x, luz.y, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(11, 13, 15, .88)';
      ctx.fill();
      ctx.lineWidth = 2 * px;
      ctx.strokeStyle = escolhida ? '#f8ef02' : (luz.cor || '#f1f0df');
      if (luz.escondido) ctx.setLineDash([4 * px, 3 * px]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      for (let i = 0; i < 8; i += 1) {
        const a = i * Math.PI / 4;
        ctx.moveTo(luz.x + Math.cos(a) * r * 0.3, luz.y + Math.sin(a) * r * 0.3);
        ctx.lineTo(luz.x + Math.cos(a) * r * 0.68, luz.y + Math.sin(a) * r * 0.68);
      }
      ctx.lineWidth = 1.5 * px;
      ctx.stroke();
    }
  }
  // A barra: os números da luz escolhida, ou os da próxima luz que o clique põe.
  function renderLuzOpcoes() {
    const luz = luzEscolhida();
    if (!luz) S.luzSel = null;
    $('#luz-titulo').textContent = luz ? 'Luz escolhida' : 'Clique no mapa para pôr uma luz';
    $('#luz-escolhida').hidden = !luz;
    if (!luz || $('#luzes-opcoes').contains(document.activeElement)) return;
    $('#luz-claro').value = luz.metros.claro;
    $('#luz-penumbra').value = luz.metros.penumbra;
    $('#luz-sem-cor').checked = !luz.cor;
    if (luz.cor) $('#luz-cor').value = luz.cor;
    $('#luz-escondida').checked = Boolean(luz.escondido);
  }
  const luzDoFormulario = () => ({ claro: Number($('#luz-claro').value) || 0, penumbra: Number($('#luz-penumbra').value) || 0, cor: $('#luz-sem-cor').checked ? null : $('#luz-cor').value });
  function apagarLuzEscolhida() {
    const luz = luzEscolhida();
    if (!luz || !confirm('Apagar esta luz?')) return;
    S.luzSel = null;
    renderLuzOpcoes();
    op('luz.apagar', { luz: luz.id }).catch(() => {});
  }

  // ---------------- Notas no mapa ----------------
  // Um alfinete no mapa que abre um handout (o título, a imagem, o texto) e, se tiver, uma página da wiki. O mestre põe e
  // muda pela ferramenta Notas (J); o jogador só recebe as que pode ver (o servidor decide) e abre com um clique.
  const notasDaCena = () => (S.cena && S.cena.notas) || [];
  const notaNaTela = nota => (S.notaPrevia && S.notaPrevia.id === nota.id ? { ...nota, ...S.notaPrevia } : nota);
  const raioDaNota = () => 13 / S.vista.escala;
  const notaEm = ponto => [...notasDaCena()].reverse().find(nota => { const n = notaNaTela(nota); return Math.hypot(ponto.x - n.x, ponto.y - n.y) <= raioDaNota() * 1.3; }) || null;
  const notaEscolhida = () => notasDaCena().find(nota => nota.id === S.notaSel) || null;
  function desenharNotas(px) {
    const r = raioDaNota();
    for (const original of notasDaCena()) {
      const nota = notaNaTela(original);
      const soMestre = nota.mostrar === 'mestre';
      const escolhida = gm() && S.ferramenta === 'notas' && S.notaSel === nota.id;
      ctx.globalAlpha = soMestre ? 0.65 : 1;
      ctx.beginPath();
      ctx.arc(nota.x, nota.y, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(11, 13, 15, .9)';
      ctx.fill();
      ctx.lineWidth = (escolhida ? 3 : 2) * px;
      ctx.strokeStyle = escolhida ? '#00ffd2' : nota.cor;
      if (soMestre) ctx.setLineDash([4 * px, 3 * px]);
      ctx.stroke();
      ctx.setLineDash([]);
      // A folha, com três linhas.
      const w = r * 0.8;
      const h = r * 1.05;
      ctx.beginPath();
      ctx.rect(nota.x - w / 2, nota.y - h / 2, w, h);
      for (const linha of [-0.18, 0.06, 0.3]) { ctx.moveTo(nota.x - w * 0.28, nota.y + h * linha); ctx.lineTo(nota.x + w * 0.28, nota.y + h * linha); }
      ctx.lineWidth = 1.5 * px;
      ctx.strokeStyle = nota.cor;
      ctx.stroke();
      ctx.globalAlpha = 1;
      rotulo(nota.titulo, nota.x, nota.y + r + 4 * px, px, { tamanho: 11, borda: nota.cor });
    }
  }
  // O editor do mestre: os campos da nota escolhida (quem está digitando não perde o que escreve).
  function renderNotaOpcoes() {
    const nota = notaEscolhida();
    if (!nota) S.notaSel = null;
    $('#nota-aviso').textContent = nota ? 'Nota escolhida (arraste para mover)' : 'Clique no mapa para pôr uma nota';
    $('#nota-escolhida').hidden = !nota;
    if (!nota) return;
    $('#nota-sem-imagem').hidden = !nota.midia;
    if ($('#notas-opcoes').contains(document.activeElement)) return;
    $('#nota-titulo').value = nota.titulo;
    $('#nota-texto').value = nota.texto;
    $('#nota-link').value = nota.link;
    $('#nota-mostrar').value = nota.mostrar;
    $('#nota-cor').value = nota.cor;
  }
  function apagarNotaEscolhida() {
    const nota = notaEscolhida();
    if (!nota || !confirm(`Apagar a nota "${nota.titulo}"?`)) return;
    S.notaSel = null;
    renderNotaOpcoes();
    op('nota.apagar', { nota: nota.id }).catch(() => {});
  }
  const editarNota = mudancas => { const nota = notaEscolhida(); if (nota) op('nota.editar', { nota: nota.id, ...mudancas }).catch(() => renderNotaOpcoes()); };
  $('#nota-titulo').addEventListener('change', event => editarNota({ titulo: event.target.value }));
  $('#nota-texto').addEventListener('change', event => editarNota({ texto: event.target.value }));
  $('#nota-link').addEventListener('change', event => editarNota({ link: event.target.value.trim() }));
  $('#nota-mostrar').addEventListener('change', event => editarNota({ mostrar: event.target.value }));
  $('#nota-cor').addEventListener('change', event => editarNota({ cor: event.target.value }));
  $('#nota-imagem').addEventListener('change', event => {
    const arquivo = event.target.files[0];
    event.target.value = '';
    if (arquivo) enviarMidia(arquivo).then(({ midia }) => editarNota({ midia })).catch(error => { if (error.message && !/^\d+$/.test(error.message)) aviso(error.message, 'erro'); });
  });
  $('#nota-sem-imagem').addEventListener('click', () => editarNota({ midia: '' }));
  $('#nota-apagar').addEventListener('click', apagarNotaEscolhida);
  $('#nota-abrir').addEventListener('click', () => { const nota = notaEscolhida(); if (nota) abrirNota(nota); });
  $('#nota-mostrar-todos').addEventListener('click', () => {
    const nota = notaEscolhida();
    if (nota) op('nota.mostrar', { nota: nota.id }).then(() => aviso(`"${nota.titulo}" abriu na tela dos jogadores.`)).catch(() => {});
  });
  // A nota aberta: o título, a imagem, o texto e o link para a página da wiki (abre noutra aba). O mestre também
  // mostra a todos daqui.
  function abrirNota(nota) {
    S.notaAberta = nota.id;
    const janela = $('#nota-janela');
    janela.style.setProperty('--cor', nota.cor || '');
    janela.innerHTML = `<div class="nota-janela-topo"><h2 id="nota-janela-titulo">${esc(nota.titulo)}</h2><button class="nota-janela-fechar" type="button" data-nota-fechar aria-label="Fechar">×</button></div>
      ${nota.imagem ? `<img src="${esc(nota.imagem)}" alt="${esc(nota.titulo)}">` : ''}
      ${nota.texto ? `<p class="nota-janela-texto">${esc(nota.texto)}</p>` : ''}
      ${nota.link || gm() ? `<div class="nota-janela-acoes">${nota.link ? `<a class="botao vazado pequeno" href="/${esc(nota.link)}" target="_blank" rel="noopener">Abrir na wiki ↗</a>` : ''}${gm() ? `<button class="botao pequeno" type="button" data-nota-mostrar="${esc(nota.id)}">Mostrar a todos</button>` : ''}</div>` : ''}`;
    janela.hidden = false;
  }
  function fecharNota() {
    S.notaAberta = null;
    $('#nota-janela').hidden = true;
  }
  $('#nota-janela').addEventListener('click', event => {
    if (event.target.closest('[data-nota-fechar]')) return fecharNota();
    const mostrar = event.target.closest('[data-nota-mostrar]');
    if (mostrar) op('nota.mostrar', { nota: mostrar.dataset.notaMostrar }).then(() => aviso('A nota abriu na tela dos jogadores.')).catch(() => {});
  });
  // A nota aberta mudou (o mestre editou) ou sumiu do mapa: a janela acompanha (a que o mestre mostrou fica).
  function atualizarNotaAberta() {
    if (!S.notaAberta) return;
    const nota = notasDaCena().find(item => item.id === S.notaAberta);
    if (nota) abrirNota(nota);
  }

  // ---------------- Tiles (mestre) ----------------
  // O tile como está na tela: o do servidor ou o arrasto que ainda não voltou dele.
  const tileVisto = tile => (S.tilePrevia && S.tilePrevia.id === tile.id ? { ...tile, ...S.tilePrevia } : tile);
  const tileEscolhido = () => (S.tileSel && S.cena && (S.cena.tiles || []).find(item => item.id === S.tileSel)) || null;
  // O ponto no sistema do tile (desfeita a rotação), a partir do canto de cima à esquerda.
  function noTile(tile, ponto) {
    const a = -(tile.rotacao || 0) * Math.PI / 180;
    const dx = ponto.x - (tile.x + tile.largura / 2);
    const dy = ponto.y - (tile.y + tile.altura / 2);
    return { x: dx * Math.cos(a) - dy * Math.sin(a) + tile.largura / 2, y: dx * Math.sin(a) + dy * Math.cos(a) + tile.altura / 2 };
  }
  function tileEm(ponto) {
    const tiles = (S.cena && S.cena.tiles) || [];
    for (let i = tiles.length - 1; i >= 0; i -= 1) {
      const tile = tileVisto(tiles[i]);
      const p = noTile(tile, ponto);
      if (p.x >= 0 && p.y >= 0 && p.x <= tile.largura && p.y <= tile.altura) return tiles[i];
    }
    return null;
  }
  // A alça amarela no canto de baixo à direita muda o tamanho.
  const alcaDoTile = () => 12 / S.vista.escala;
  const naAlca = (tile, ponto) => { const p = noTile(tile, ponto); return Math.abs(p.x - tile.largura) <= alcaDoTile() && Math.abs(p.y - tile.altura) <= alcaDoTile(); };
  // O canto do tile encaixa na grade (Shift solta).
  function encaixarCanto(ponto, solto) {
    const g = grade();
    if (solto || g.tipo === 'nenhuma') return { x: Math.round(ponto.x), y: Math.round(ponto.y) };
    return { x: (g.x || 0) + Math.round((ponto.x - (g.x || 0)) / g.tamanho) * g.tamanho, y: (g.y || 0) + Math.round((ponto.y - (g.y || 0)) / g.tamanho) * g.tamanho };
  }
  function desenharTileEscolhido(px) {
    const original = tileEscolhido();
    if (!original) return;
    const tile = tileVisto(original);
    const a = alcaDoTile();
    ctx.save();
    ctx.translate(tile.x + tile.largura / 2, tile.y + tile.altura / 2);
    if (tile.rotacao) ctx.rotate(tile.rotacao * Math.PI / 180);
    ctx.setLineDash([8 * px, 6 * px]);
    ctx.strokeStyle = '#f8ef02';
    ctx.lineWidth = 2 * px;
    ctx.strokeRect(-tile.largura / 2, -tile.altura / 2, tile.largura, tile.altura);
    ctx.setLineDash([]);
    ctx.fillStyle = '#f8ef02';
    ctx.fillRect(tile.largura / 2 - a / 2, tile.altura / 2 - a / 2, a, a);
    ctx.restore();
    rotulo(`${Math.round(tile.largura)} × ${Math.round(tile.altura)} px`, tile.x + tile.largura / 2, tile.y - 26 * px, px, { tamanho: 11 });
  }
  function renderTileOpcoes() {
    const caixa = $('#tile-escolhido');
    const tile = tileEscolhido();
    if (!tile) { S.tileSel = null; caixa.hidden = true; caixa.innerHTML = ''; return; }
    if (!caixa.hidden && caixa.contains(document.activeElement) && document.activeElement.matches('input')) return; // não troca debaixo de quem digita
    caixa.hidden = false;
    caixa.innerHTML = `<label>Transparência <input data-tile="alpha" type="range" min="0" max="1" step="0.05" value="${tile.alpha ?? 1}"></label>
      <label>Girar <input data-tile="rotacao" type="number" min="-360" max="360" step="15" value="${tile.rotacao || 0}"> graus</label>
      <label class="marcar"><input data-tile="escondido" type="checkbox"${tile.escondido ? ' checked' : ''}> Escondido dos jogadores</label>
      <div class="combate-acoes"><button class="botao vazado pequeno" type="button" data-tile-ordem="frente">Para a frente</button><button class="botao vazado pequeno" type="button" data-tile-ordem="tras">Para trás</button><button class="botao vazado pequeno perigo" type="button" data-tile-apagar>Apagar</button></div>`;
  }
  function apagarTileEscolhido() {
    const tile = tileEscolhido();
    if (!tile || !confirm('Apagar este tile?')) return;
    S.tileSel = null;
    renderTileOpcoes();
    op('tile.apagar', { tile: tile.id }).catch(() => {});
  }
  // Um arquivo para a mesa (mapa, tile ou imagem de token), com a medida natural.
  async function enviarMidia(arquivo) {
    const video = arquivo.type.startsWith('video/');
    const medida = await new Promise((resolve, reject) => {
      const item = document.createElement(video ? 'video' : 'img');
      const pronto = () => resolve({ largura: video ? item.videoWidth : item.naturalWidth, altura: video ? item.videoHeight : item.naturalHeight });
      if (video) { item.preload = 'metadata'; item.onloadedmetadata = pronto; } else item.onload = pronto;
      item.onerror = () => reject(new Error('Não deu para abrir esse arquivo.'));
      item.src = URL.createObjectURL(arquivo);
    });
    const response = await fetch(comCampanha('/api/mesa/midia'), { method: 'POST', headers: { 'Content-Type': arquivo.type }, body: arquivo });
    const resposta = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(resposta.erro || 'O arquivo não subiu.');
    return { midia: resposta.midia, ...medida };
  }
  async function novoTile(arquivo) {
    if (!S.cena) return;
    try {
      const { midia, largura, altura } = await enviarMidia(arquivo);
      // No meio da tela, do tamanho natural (o grande demais encolhe até metade da cena).
      const encolhe = Math.min(1, (S.cena.largura / 2) / (largura || 1), (S.cena.altura / 2) / (altura || 1));
      const w = Math.max(10, Math.round((largura || 200) * encolhe));
      const h = Math.max(10, Math.round((altura || 200) * encolhe));
      const meio = meioLivre();
      const { resultado } = await op('tile.criar', { cena: S.cena.id, midia, x: Math.round(meio.x - w / 2), y: Math.round(meio.y - h / 2), largura: w, altura: h });
      S.tileSel = resultado.tile;
      renderTileOpcoes();
      redesenhar();
    } catch (error) {
      if (error.message && !/^\d+$/.test(error.message)) aviso(error.message, 'erro');
    }
  }
  function apagarParedeEscolhida() {
    if (!S.paredeSel || !S.cena) return;
    const id = S.paredeSel;
    S.paredeSel = null;
    renderParedeOpcoes();
    op('parede.apagar', { cena: S.cena.id, paredes: [id] }).catch(() => {});
  }

  // ---------------- Vista ----------------
  function medirTela() {
    S.dpr = window.devicePixelRatio || 1;
    const { clientWidth, clientHeight } = canvas;
    canvas.width = Math.round(clientWidth * S.dpr);
    canvas.height = Math.round(clientHeight * S.dpr);
    // Celular girado, painel aberto: enquanto ninguém mexeu na vista, a cena continua inteira na tela.
    if (S.enquadrada) enquadrar();
    redesenhar();
  }
  const telaParaMundo = (sx, sy) => ({ x: sx / S.vista.escala + S.vista.x, y: sy / S.vista.escala + S.vista.y });
  // O pedaço do mapa que fica livre na tela (em px do canvas): sem a pastilha em cima, a coluna das ferramentas à
  // esquerda, o rodapé embaixo e a barra da direita (a faixa, mais o conteúdo quando aberta). No celular, a folha de
  // baixo some sozinha: não conta.
  function areaLivre() {
    const largura = canvas.clientWidth || 800;
    const altura = canvas.clientHeight || 600;
    const tela = canvas.getBoundingClientRect();
    const borda = seletor => { const elemento = $(seletor); return elemento && elemento.offsetParent ? elemento.getBoundingClientRect() : null; };
    const ferramentas = borda('#ferramentas');
    const pastilha = borda('#pastilha');
    const rodape = borda('#rodape');
    const painel = celular() ? null : borda('#painel');
    const x0 = ferramentas ? ferramentas.right - tela.left : 0;
    const y0 = pastilha ? pastilha.bottom - tela.top : 0;
    const x1 = painel ? painel.left - tela.left : largura;
    let y1 = rodape && rodape.height ? rodape.top - tela.top : altura;
    // No celular, a folha aberta cobre a parte de baixo: conta o mapa que sobra acima dela.
    if (celular() && $('#painel').classList.contains('aberto')) y1 = Math.min(y1, $('#painel').getBoundingClientRect().top - tela.top);
    return { x0, y0, x1: Math.max(x0 + 100, x1), y1: Math.max(y0 + 100, y1) };
  }
  // O ponto do mapa no meio da área livre (onde entra o token ou o tile novo).
  function meioLivre() {
    const livre = areaLivre();
    return telaParaMundo((livre.x0 + livre.x1) / 2, (livre.y0 + livre.y1) / 2);
  }
  // A cena inteira na área livre: o mapa e os tokens que esperam na margem, fora dele.
  function enquadrar() {
    if (!S.cena) return;
    const caixa = { x0: 0, y0: 0, x1: S.cena.largura, y1: S.cena.altura };
    for (const token of S.tokens.values()) {
      const r = raioDe(token) * 1.6;
      caixa.x0 = Math.min(caixa.x0, token.x - r); caixa.y0 = Math.min(caixa.y0, token.y - r);
      caixa.x1 = Math.max(caixa.x1, token.x + r); caixa.y1 = Math.max(caixa.y1, token.y + r);
    }
    const livre = areaLivre();
    const largura = livre.x1 - livre.x0;
    const altura = livre.y1 - livre.y0;
    const escala = Math.min(largura / (caixa.x1 - caixa.x0), altura / (caixa.y1 - caixa.y0)) * 0.94;
    S.vista = { escala, x: (caixa.x0 + caixa.x1) / 2 - (livre.x0 + largura / 2) / escala, y: (caixa.y0 + caixa.y1) / 2 - (livre.y0 + altura / 2) / escala };
    S.alvoVista = null;
    S.enquadrada = true;
    redesenhar();
  }
  function centrarEm(ponto, suave = true) {
    const livre = areaLivre();
    const alvo = { x: ponto.x - (livre.x0 + livre.x1) / 2 / S.vista.escala, y: ponto.y - (livre.y0 + livre.y1) / 2 / S.vista.escala };
    if (suave) S.alvoVista = alvo; else Object.assign(S.vista, alvo);
    S.enquadrada = false;
    redesenhar();
  }
  function zoomEm(sx, sy, fator) {
    S.enquadrada = false;
    const antes = telaParaMundo(sx, sy);
    S.vista.escala = Math.min(4, Math.max(0.05, S.vista.escala * fator));
    S.vista.x = antes.x - sx / S.vista.escala;
    S.vista.y = antes.y - sy / S.vista.escala;
    S.alvoVista = null;
    redesenhar();
  }

  // ---------------- Grade e medidas ----------------
  // Centro do quadrado (tokens de tamanho ímpar) ou cruzamento da grade (tamanho par), como no Foundry.
  function encaixar(ponto, tamanho = 1) {
    const g = grade();
    if (g.tipo === 'nenhuma') return dentro(ponto);
    const s = g.tamanho;
    const eixo = (valor, origem) => (tamanho % 2 ? origem + (Math.floor((valor - origem) / s) + 0.5) * s : origem + Math.round((valor - origem) / s) * s);
    return dentro({ x: eixo(ponto.x, g.x || 0), y: eixo(ponto.y, g.y || 0) });
  }
  // Dentro do mapa ou da margem em volta dele (o padding do Foundry: o token pode esperar ali, fora do mapa).
  const margem = () => (S.cena && S.cena.margem) || { x: 0, y: 0 };
  const dentro = ponto => {
    if (!S.cena) return ponto;
    const m = margem();
    return { x: Math.round(Math.min(S.cena.largura + m.x, Math.max(-m.x, ponto.x))), y: Math.round(Math.min(S.cena.altura + m.y, Math.max(-m.y, ponto.y))) };
  };
  // Diagonal vale 1 quadrado: o padrão do Foundry ("equidistante"), que o sistema da mesa não troca. 2 m por quadrado.
  // Sem grade, em linha reta. metros: a distância na unidade da cena (m; "bit" nas arquiteturas da NET).
  function medir(a, b) {
    const g = grade();
    if (g.tipo === 'nenhuma') return { quadrados: null, metros: Math.round(Math.hypot(b.x - a.x, b.y - a.y) / g.tamanho * g.metros * 10) / 10 };
    const quadrados = Math.round(Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) / g.tamanho);
    return { quadrados, metros: Math.round(quadrados * g.metros * 10) / 10 };
  }
  const emMetros = () => (grade().unidade || 'm') === 'm';
  function textoDistancia(a, b) {
    const { quadrados, metros } = medir(a, b);
    const unidade = grade().unidade || 'm';
    return `${quadrados === null ? '' : `${quadrados} ${quadrados === 1 ? 'quadrado' : 'quadrados'} · `}${metros} ${unidade}`;
  }
  const NOMES_DV = { pistol: 'Pistola', smg: 'SMG', shotgun: 'Espingarda', assault: 'Assalto', sniper: 'Sniper' };
  // DV por alcance, da tabela da wiki (system-rules.js, RED p. 173).
  function dvPorAlcance(metros) {
    const limites = rules.rangeBandLimits || [];
    const faixa = limites.findIndex(limite => metros <= limite);
    if (!rules.rangeDV || faixa < 0) return metros > 0 && limites.length ? 'Fora do alcance das armas' : '';
    return `DV ${rules.rangeDV.filter(arma => NOMES_DV[arma.id]).map(arma => `${NOMES_DV[arma.id]} ${arma.dv[faixa] ?? '—'}`).join(' · ')}`;
  }

  // ---------------- Desenho ----------------
  // Imagem ou vídeo (as cenas animadas do Foundry e os nós da NET): o vídeo toca mudo, em loop, e é desenhado a cada quadro.
  function midia(src, video = false, fundo = false) {
    let item = S.imagens.get(src);
    if (item) return item;
    if (video) {
      item = document.createElement('video');
      Object.assign(item, { muted: true, loop: true, playsInline: true, autoplay: true, preload: 'auto' });
      item.addEventListener('loadeddata', redesenhar);
      item.src = src;
      item.play().catch(() => {});
    } else {
      item = new Image();
      item.onload = redesenhar;
      item.src = src;
    }
    item.dataset.src = src;
    if (fundo) item.addEventListener('error', () => aviso('O mapa desta cena não carregou.', 'erro'));
    S.imagens.set(src, item);
    return item;
  }
  const pronta = item => Boolean(item) && (item.tagName === 'VIDEO' ? item.readyState >= 2 : item.complete && item.naturalWidth > 0);
  const larguraDe = item => (item.tagName === 'VIDEO' ? item.videoWidth : item.naturalWidth);
  const alturaDe = item => (item.tagName === 'VIDEO' ? item.videoHeight : item.naturalHeight);
  function imagem(src) {
    if (!src) return null;
    const item = midia(src);
    return pronta(item) ? item : null;
  }
  const temVideo = () => Boolean(S.cena) && (Boolean(S.cena.video) || (S.cena.tiles || []).some(tile => tile.video));
  const raioDe = token => (token.tamanho || 1) * grade().tamanho * 0.44;
  function tokenEm(ponto) {
    const lista = [...S.tokens.values()].reverse();
    return lista.find(token => (ponto.x - token.vx) ** 2 + (ponto.y - token.vy) ** 2 <= raioDe(token) ** 2) || null;
  }
  const podeMover = token => gm() || token.meu;

  function desenhar(agora) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cena = S.cena;
    if (!cena) return;
    const e = S.vista.escala * S.dpr;
    const px = 1 / S.vista.escala;
    ctx.setTransform(e, 0, 0, e, -S.vista.x * e, -S.vista.y * e);
    const m = margem();
    if (m.x || m.y) {
      ctx.fillStyle = '#0e1214';
      ctx.fillRect(-m.x, -m.y, cena.largura + m.x * 2, cena.altura + m.y * 2);
      ctx.setLineDash([10 * px, 8 * px]);
      ctx.strokeStyle = 'rgba(169, 174, 170, .25)';
      ctx.lineWidth = px;
      ctx.strokeRect(-m.x, -m.y, cena.largura + m.x * 2, cena.altura + m.y * 2);
      ctx.setLineDash([]);
    }
    ctx.fillStyle = '#12171a';
    ctx.fillRect(0, 0, cena.largura, cena.altura);
    if (pronta(S.fundo)) ctx.drawImage(S.fundo, 0, 0, cena.largura, cena.altura);
    desenharTiles(px);
    desenharLuz();
    desenharGrade(px);
    if (S.nevoaCanvas) {
      ctx.globalAlpha = gm() ? 0.55 : 1;
      ctx.drawImage(S.nevoaCanvas, 0, 0, cena.largura, cena.altura);
      ctx.globalAlpha = 1;
    }
    if (S.visao && S.visao.canvas) desenharVisao(px);
    ctx.strokeStyle = 'rgba(0, 255, 210, .35)';
    ctx.lineWidth = 2 * px;
    ctx.strokeRect(0, 0, cena.largura, cena.altura);
    if (gm() && S.ferramenta === 'paredes') desenharParedes(px);
    desenharNotas(px);
    for (const token of S.tokens.values()) {
      if (S.arrasto && S.arrasto.token === token.id) continue;
      desenharToken(token, token.vx, token.vy, agora, px);
    }
    if (gm() && S.ferramenta === 'tiles') desenharTileEscolhido(px);
    if (gm() && S.ferramenta === 'luzes') desenharLuzes(px);
    desenharPortas(px);
    if (S.arrasto) desenharArrasto(agora, px);
    if (S.minhaRegua) desenharRegua(S.minhaRegua.a, S.minhaRegua.b, S.eu.cor, px);
    for (const outro of S.atividade.values()) if (outro.regua && outro.regua.length === 2) desenharRegua(outro.regua[0], outro.regua[1], outro.cor, px, outro.nome);
    desenharPings(agora, px);
    desenharCursores(agora, px);
  }
  // Tiles: imagens e vídeos postos sobre o mapa (no Foundry, os objetos do cenário e os nós da NET). O escondido só o
  // mestre recebe, e vê pela metade.
  function desenharTiles(px) {
    for (const original of S.cena.tiles || []) {
      const tile = tileVisto(original);
      const item = midia(tile.imagem, tile.video);
      if (!pronta(item)) continue;
      ctx.save();
      ctx.globalAlpha = (tile.alpha ?? 1) * (tile.escondido ? 0.5 : 1);
      ctx.translate(tile.x + tile.largura / 2, tile.y + tile.altura / 2);
      if (tile.rotacao) ctx.rotate(tile.rotacao * Math.PI / 180);
      ctx.drawImage(item, -tile.largura / 2, -tile.altura / 2, tile.largura, tile.altura);
      if (tile.escondido) {
        ctx.globalAlpha = 1;
        ctx.setLineDash([8 * px, 6 * px]);
        ctx.strokeStyle = '#f8ef02';
        ctx.lineWidth = 1.5 * px;
        ctx.strokeRect(-tile.largura / 2, -tile.altura / 2, tile.largura, tile.altura);
      }
      ctx.restore();
    }
  }
  function desenharGrade(px) {
    const g = grade();
    if (!g.visivel || g.tamanho * S.vista.escala < 7) return;
    const inicio = telaParaMundo(0, 0);
    const fim = telaParaMundo(canvas.clientWidth, canvas.clientHeight);
    const x0 = Math.max(0, inicio.x);
    const y0 = Math.max(0, inicio.y);
    const x1 = Math.min(S.cena.largura, fim.x);
    const y1 = Math.min(S.cena.altura, fim.y);
    ctx.beginPath();
    for (let x = (g.x || 0) + Math.ceil((x0 - (g.x || 0)) / g.tamanho) * g.tamanho; x <= x1; x += g.tamanho) { ctx.moveTo(x, y0); ctx.lineTo(x, y1); }
    for (let y = (g.y || 0) + Math.ceil((y0 - (g.y || 0)) / g.tamanho) * g.tamanho; y <= y1; y += g.tamanho) { ctx.moveTo(x0, y); ctx.lineTo(x1, y); }
    ctx.strokeStyle = S.previaGrade ? 'rgba(248, 239, 2, .55)' : 'rgba(0, 255, 210, .16)';
    ctx.lineWidth = px;
    ctx.stroke();
  }
  function rotulo(texto, x, y, px, { cor = '#f1f0df', fundo = 'rgba(11, 13, 15, .85)', tamanho = 12, peso = 600, alinhar = 'center', borda = null } = {}) {
    ctx.font = `${peso} ${tamanho * px}px Oxanium, 'Segoe UI', sans-serif`;
    const linhas = String(texto).split('\n');
    const largura = Math.max(...linhas.map(linha => ctx.measureText(linha).width));
    const alto = tamanho * 1.3 * px;
    const pad = 5 * px;
    const left = alinhar === 'center' ? x - largura / 2 - pad : x;
    ctx.fillStyle = fundo;
    ctx.fillRect(left, y, largura + pad * 2, alto * linhas.length + pad);
    if (borda) { ctx.fillStyle = borda; ctx.fillRect(left, y, 2 * px, alto * linhas.length + pad); }
    ctx.fillStyle = cor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    linhas.forEach((linha, i) => ctx.fillText(linha, left + pad, y + pad / 2 + 1 * px + i * alto));
  }
  function desenharToken(token, x, y, agora, px, fantasma = false) {
    const g = grade().tamanho;
    const r = raioDe(token);
    ctx.save();
    if (token.escondido || fantasma) ctx.globalAlpha = fantasma ? 0.35 : 0.55;
    if (S.combate && S.combate.vez === token.id && !fantasma) {
      const pulso = (Math.sin(agora / 260) + 1) / 2;
      ctx.beginPath();
      ctx.arc(x, y, r + g * (0.07 + 0.05 * pulso), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 255, 210, ${0.45 + 0.5 * pulso})`;
      ctx.lineWidth = Math.max(g * 0.05, 2 * px);
      ctx.stroke();
    }
    ctx.shadowColor = 'rgba(0, 0, 0, .6)';
    ctx.shadowBlur = 10 * px;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = '#1c2123';
    ctx.fill();
    ctx.shadowBlur = 0;
    const foto = imagem(token.imagem);
    if (foto) {
      ctx.save();
      ctx.clip();
      const lado = Math.min(larguraDe(foto), alturaDe(foto));
      ctx.drawImage(foto, (larguraDe(foto) - lado) / 2, (alturaDe(foto) - lado) / 2, lado, lado, x - r, y - r, r * 2, r * 2);
      ctx.restore();
    } else {
      ctx.fillStyle = token.cor;
      ctx.font = `700 ${r * 0.72}px Oxanium, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(initials(token.nome), x, y + r * 0.04);
    }
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.lineWidth = Math.max(g * 0.055, 2 * px);
    ctx.strokeStyle = token.cor;
    if (token.escondido) ctx.setLineDash([g * 0.1, g * 0.07]);
    ctx.stroke();
    ctx.setLineDash([]);
    if (S.selecionado === token.id && !fantasma) {
      ctx.beginPath();
      ctx.arc(x, y, r + g * 0.09, 0, Math.PI * 2);
      ctx.lineWidth = Math.max(g * 0.03, 1.5 * px);
      ctx.strokeStyle = '#f8ef02';
      ctx.stroke();
    }
    // Estado de ferimento de quem não mostra o HP (NPC para os jogadores): um ponto colorido.
    if (!token.hp && token.estado && token.estado !== 'Sem ferimentos') {
      ctx.beginPath();
      ctx.arc(x + r * 0.72, y - r * 0.72, Math.max(r * 0.2, 4 * px), 0, Math.PI * 2);
      ctx.fillStyle = { 'Levemente Ferido': '#f8ef02', 'Gravemente Ferido': '#ff8a3d', 'Mortalmente Ferido': '#ff3158' }[token.estado];
      ctx.fill();
      ctx.lineWidth = 1.5 * px;
      ctx.strokeStyle = '#0b0d0f';
      ctx.stroke();
    }
    // Mortalmente Ferido: o anel vermelho pulsa. Morto: escurece e ganha o X. Suprimido: a marca embaixo.
    if (token.estado === 'Mortalmente Ferido' && !token.morto && !fantasma) {
      const pulso = (Math.sin(agora / 180) + 1) / 2;
      ctx.beginPath();
      ctx.arc(x, y, r + g * 0.04, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 49, 88, ${0.4 + 0.6 * pulso})`;
      ctx.lineWidth = Math.max(g * 0.04, 2 * px);
      ctx.stroke();
    }
    if (token.morto) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(5, 7, 8, .62)';
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - r * 0.55, y - r * 0.55); ctx.lineTo(x + r * 0.55, y + r * 0.55);
      ctx.moveTo(x + r * 0.55, y - r * 0.55); ctx.lineTo(x - r * 0.55, y + r * 0.55);
      ctx.strokeStyle = '#ff3158';
      ctx.lineWidth = Math.max(g * 0.07, 3 * px);
      ctx.stroke();
    }
    if (token.suprimido && !fantasma) rotulo('SUPRIMIDO', x, y - r - 18 * px, px, { tamanho: 9, cor: '#140a04', fundo: '#ff8a3d' });
    ctx.restore();
    if (fantasma) return;
    let base = y + r + 4 * px;
    if (token.hp && token.hp.max) {
      const largura = r * 1.7;
      const fracao = Math.max(0, Math.min(1, token.hp.atual / token.hp.max));
      const alto = Math.max(g * 0.06, 4 * px);
      ctx.fillStyle = 'rgba(11, 13, 15, .9)';
      ctx.fillRect(x - largura / 2 - px, base - px, largura + 2 * px, alto + 2 * px);
      ctx.fillStyle = fracao > 0.5 ? '#57e389' : fracao > 0 ? '#ff8a3d' : '#ff3158';
      ctx.fillRect(x - largura / 2, base, largura * fracao, alto);
      base += alto + 4 * px;
    }
    rotulo(nomeCurto(token.nome), x, base, Math.max(px, g * 0.0115), { tamanho: 12, cor: token.escondido ? '#a9aeaa' : '#f1f0df' });
  }
  function desenharArrasto(agora, px) {
    const token = S.tokens.get(S.arrasto.token);
    if (!token) return;
    const origem = S.arrasto.origem;
    const alvo = S.arrasto.alvo;
    desenharToken(token, origem.x, origem.y, agora, px, true);
    // O jogador não passa por parede nem porta fechada (o servidor recusa; aqui a linha já avisa).
    const bloqueado = !gm() && VIS.atravessa((S.cena && S.cena.paredes) || [], origem, alvo);
    ctx.beginPath();
    ctx.moveTo(origem.x, origem.y);
    ctx.lineTo(alvo.x, alvo.y);
    ctx.strokeStyle = bloqueado ? 'rgba(255, 49, 88, .9)' : 'rgba(248, 239, 2, .8)';
    ctx.lineWidth = 3 * px;
    ctx.setLineDash([10 * px, 6 * px]);
    ctx.stroke();
    ctx.setLineDash([]);
    desenharToken(token, S.arrasto.pos.x, S.arrasto.pos.y, agora, px);
    // Movimento do RED: MOVE × 2 m por Ação de Movimento; correndo, a Ação vira outro movimento (o dobro).
    const { metros } = medir(origem, alvo);
    let texto = textoDistancia(origem, alvo);
    let cor = '#f1f0df';
    if (token.move && emMetros()) {
      const andar = token.move * 2;
      texto += `\nMOVE ${token.move}: anda ${andar} m, corre ${andar * 2} m`;
      cor = metros <= andar ? '#57e389' : metros <= andar * 2 ? '#f8ef02' : '#ff3158';
    }
    if (bloqueado) { texto += '\nUma parede no caminho'; cor = '#ff3158'; }
    rotulo(texto, S.arrasto.pos.x + raioDe(token) + 8 * px, S.arrasto.pos.y - 20 * px, px, { alinhar: 'left', cor, borda: cor });
  }
  function desenharRegua(a, b, cor, px, nome = '') {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = 'rgba(11, 13, 15, .8)';
    ctx.lineWidth = 6 * px;
    ctx.stroke();
    ctx.strokeStyle = cor;
    ctx.lineWidth = 3 * px;
    ctx.stroke();
    for (const ponto of [a, b]) {
      ctx.beginPath();
      ctx.arc(ponto.x, ponto.y, 5 * px, 0, Math.PI * 2);
      ctx.fillStyle = cor;
      ctx.fill();
    }
    const dv = emMetros() ? dvPorAlcance(medir(a, b).metros) : '';
    const texto = `${nome ? `${nome}: ` : ''}${textoDistancia(a, b)}${dv ? `\n${dv}` : ''}`;
    // Acima da ponta: embaixo dela fica o nome do cursor de quem mede.
    rotulo(texto, b.x + 12 * px, b.y - (dv ? 52 : 30) * px, px, { alinhar: 'left', borda: cor, tamanho: 12 });
  }
  function desenharPings(agora, px) {
    S.pings = S.pings.filter(ping => agora - ping.inicio < 1800);
    for (const ping of S.pings) {
      const t = (agora - ping.inicio) / 1800;
      for (let i = 0; i < 3; i += 1) {
        const fase = (t + i / 3) % 1;
        ctx.beginPath();
        ctx.arc(ping.x, ping.y, (12 + fase * 70) * px, 0, Math.PI * 2);
        ctx.strokeStyle = ping.cor;
        ctx.globalAlpha = (1 - fase) * (1 - t * 0.5);
        ctx.lineWidth = 3 * px;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }
  function desenharCursores(agora, px) {
    for (const [id, outro] of S.atividade) {
      if (agora - outro.quando > 15000) { S.atividade.delete(id); continue; }
      if (!outro.cursor || agora - outro.quando > 6000) continue;
      const { x, y } = outro.cursor;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 14 * px, y + 5 * px);
      ctx.lineTo(x + 5 * px, y + 14 * px);
      ctx.closePath();
      ctx.fillStyle = outro.cor;
      ctx.fill();
      ctx.strokeStyle = '#0b0d0f';
      ctx.lineWidth = 1.5 * px;
      ctx.stroke();
      rotulo(outro.nome, x + 12 * px, y + 14 * px, px, { alinhar: 'left', tamanho: 11, cor: '#0b0d0f', fundo: outro.cor });
    }
  }

  // Um quadro por vez, só quando algo muda ou anima.
  function quadro(agora) {
    requestAnimationFrame(quadro);
    const dt = Math.min(0.05, (agora - (S.ultimoQuadro || agora)) / 1000);
    S.ultimoQuadro = agora;
    let anima = false;
    for (const token of S.tokens.values()) {
      const dx = token.x - token.vx;
      const dy = token.y - token.vy;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) { token.vx = token.x; token.vy = token.y; continue; }
      const passo = Math.min(1, dt * 10);
      token.vx += dx * passo;
      token.vy += dy * passo;
      anima = true;
    }
    if (S.alvoVista) {
      const passo = Math.min(1, dt * 6);
      S.vista.x += (S.alvoVista.x - S.vista.x) * passo;
      S.vista.y += (S.alvoVista.y - S.vista.y) * passo;
      if (Math.abs(S.alvoVista.x - S.vista.x) < 0.5 && Math.abs(S.alvoVista.y - S.vista.y) < 0.5) S.alvoVista = null;
      anima = true;
    }
    if (S.pings.length || S.atividade.size || temVideo()) anima = true;
    if (S.combate && S.combate.vez && S.tokens.has(S.combate.vez)) anima = true;
    if ([...S.tokens.values()].some(token => token.estado === 'Mortalmente Ferido' && !token.morto)) anima = true;
    if (S.sujo || anima) { S.sujo = false; desenhar(agora); posicionarHud(); }
  }

  // ---------------- Mouse, toque e teclado ----------------
  const ponteiros = new Map();
  let gesto = null;
  let seguraTimer = null;
  const posicao = event => { const caixa = canvas.getBoundingClientRect(); return { x: event.clientX - caixa.left, y: event.clientY - caixa.top }; };
  function fazerPing(ponto, puxar) {
    if (!S.cena) return;
    S.pings.push({ x: ponto.x, y: ponto.y, cor: S.eu.cor, inicio: performance.now() });
    atividade({ ping: { x: ponto.x, y: ponto.y, puxar: Boolean(puxar && gm()) } }, true);
    if (puxar && gm()) aviso('Todos foram trazidos para o ping.', 'destaque');
    redesenhar();
  }
  function pintar(ponto) {
    if (!gesto || gesto.tipo !== 'nevoa' || !S.cena || !S.cena.nevoa.ativa) return;
    const r = S.nevoaRaio * grade().tamanho;
    if (gesto.ultimo && Math.hypot(ponto.x - gesto.ultimo.x, ponto.y - gesto.ultimo.y) < r * 0.35) return;
    gesto.ultimo = ponto;
    const traco = { modo: gesto.modo, x: Math.round(ponto.x), y: Math.round(ponto.y), r: Math.round(r) };
    S.nevoaLocal.push(traco);
    aplicarTraco(traco);
    gesto.pontos.push({ x: traco.x, y: traco.y });
    if (!gesto.timer) gesto.timer = setTimeout(() => enviarNevoa(gesto), 120);
    redesenhar();
  }
  function enviarNevoa(g) {
    if (!g) return;
    clearTimeout(g.timer);
    g.timer = null;
    if (!g.pontos.length) return;
    const pontos = g.pontos.splice(0, 60);
    op('nevoa.traco', { cena: S.cena.id, modo: g.modo, r: Math.round(S.nevoaRaio * grade().tamanho), pontos }).catch(() => construirNevoa());
    if (g.pontos.length) g.timer = setTimeout(() => enviarNevoa(g), 120);
  }

  canvas.addEventListener('contextmenu', event => event.preventDefault());
  canvas.addEventListener('pointerdown', event => {
    canvas.setPointerCapture(event.pointerId);
    const tela = posicao(event);
    ponteiros.set(event.pointerId, tela);
    clearTimeout(seguraTimer);
    if (ponteiros.size === 2) {
      // Dois dedos: pinça (aproximar e arrastar o mapa). Cancela o que o primeiro dedo começou.
      if (gesto && gesto.tipo === 'token') S.arrasto = null;
      const [p1, p2] = [...ponteiros.values()];
      gesto = { tipo: 'pinca', distancia: Math.hypot(p1.x - p2.x, p1.y - p2.y), meio: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }, vista: { ...S.vista } };
      redesenhar();
      return;
    }
    if (ponteiros.size > 2 || !S.cena) return;
    const mundo = telaParaMundo(tela.x, tela.y);
    S.mouse = mundo;
    // Escolhendo o alvo do ataque: o clique num token marca o alvo (não troca a seleção).
    if (S.escolhendoAlvo && S.ataque) {
      const alvo = tokenEm(mundo);
      if (alvo && alvo.id !== S.ataque.token) { S.ataque.alvo = alvo.id; escolherAlvoNoMapa(false); }
      return;
    }
    if (event.button === 1 || event.button === 2) { gesto = { tipo: 'pan', inicio: tela, vista: { ...S.vista }, moveu: true }; return; }
    if (S.ferramenta === 'regua') {
      const a = event.shiftKey ? dentro(mundo) : encaixar(mundo);
      gesto = { tipo: 'regua', inicio: tela };
      S.minhaRegua = { a, b: a };
      clearTimeout(S.reguaTimer);
      return;
    }
    if (S.ferramenta === 'ping') { fazerPing(mundo, event.shiftKey); gesto = null; return; }
    if (S.ferramenta === 'nevoa' && gm()) {
      if (!S.cena.nevoa.ativa) { aviso('Ligue a névoa desta cena na aba Cena.'); return; }
      gesto = { tipo: 'nevoa', modo: event.altKey ? (S.nevoaModo === 'revelar' ? 'cobrir' : 'revelar') : S.nevoaModo, pontos: [], ultimo: null, timer: null };
      pintar(mundo);
      return;
    }
    if (S.ferramenta === 'luzes' && gm()) {
      const luz = luzEm(mundo);
      if (luz) {
        S.luzSel = luz.id;
        renderLuzOpcoes();
        gesto = { tipo: 'luz-mover', inicio: tela, luz: luz.id, desloc: { x: mundo.x - luz.x, y: mundo.y - luz.y } };
      } else if (S.luzSel) {
        // Com uma escolhida, o clique fora só solta a escolha (o próximo põe uma luz).
        S.luzSel = null;
        renderLuzOpcoes();
        gesto = { tipo: 'pan-talvez', inicio: tela, vista: { ...S.vista } };
      } else {
        gesto = { tipo: 'luz-nova', inicio: tela, vista: { ...S.vista }, ponto: dentro(mundo) };
      }
      redesenhar();
      return;
    }
    // Notas: clique numa escolhe (e arrastar move); com uma escolhida, o clique fora solta; senão, põe uma nota ali.
    if (S.ferramenta === 'notas' && gm()) {
      const nota = notaEm(mundo);
      if (nota) {
        S.notaSel = nota.id;
        renderNotaOpcoes();
        gesto = { tipo: 'nota-mover', inicio: tela, nota: nota.id, desloc: { x: mundo.x - nota.x, y: mundo.y - nota.y } };
      } else if (S.notaSel) {
        S.notaSel = null;
        renderNotaOpcoes();
        gesto = { tipo: 'pan-talvez', inicio: tela, vista: { ...S.vista } };
      } else {
        gesto = { tipo: 'nota-nova', inicio: tela, vista: { ...S.vista }, ponto: dentro(mundo) };
      }
      redesenhar();
      return;
    }
    if (S.ferramenta === 'tiles' && gm()) {
      const atual = tileEscolhido();
      if (atual && naAlca(tileVisto(atual), mundo)) { gesto = { tipo: 'tile-tamanho', inicio: tela, tile: atual.id }; return; }
      const tile = tileEm(mundo);
      if (tile) {
        S.tileSel = tile.id;
        renderTileOpcoes();
        gesto = { tipo: 'tile-mover', inicio: tela, tile: tile.id, desloc: { x: mundo.x - tile.x, y: mundo.y - tile.y } };
      } else {
        S.tileSel = null;
        renderTileOpcoes();
        gesto = { tipo: 'pan-talvez', inicio: tela, vista: { ...S.vista } };
      }
      redesenhar();
      return;
    }
    if (S.ferramenta === 'paredes' && gm()) {
      const a = encaixarParede(mundo, event.shiftKey);
      gesto = { tipo: 'parede', inicio: tela, a, b: a, perto: paredeEm(mundo) };
      return;
    }
    // A porta: clique abre ou fecha; o mestre tranca e destranca com Shift.
    const porta = portaEm(mundo);
    if (porta) {
      const estado = gm() && event.shiftKey ? (porta.estado === 2 ? 0 : 2) : undefined;
      op('porta', { parede: porta.id, ...(estado === undefined ? {} : { estado }) }).catch(() => {});
      gesto = null;
      return;
    }
    const token = tokenEm(mundo);
    if (token) {
      selecionar(token.id);
      gesto = { tipo: 'token-talvez', token: token.id, inicio: tela, pode: podeMover(token), desloc: { x: mundo.x - token.vx, y: mundo.y - token.vy }, origem: { x: token.x, y: token.y } };
    } else {
      // Sem token: o clique (sem arrastar) num alfinete abre a nota.
      const nota = notaEm(mundo);
      gesto = { tipo: 'pan-talvez', inicio: tela, vista: { ...S.vista }, nota: nota ? nota.id : null };
    }
    // Segurar parado faz um ping (com Shift, o mestre traz todos).
    const shift = event.shiftKey;
    seguraTimer = setTimeout(() => { if (gesto && !gesto.moveu && ponteiros.size === 1) { fazerPing(mundo, shift); gesto = null; } }, 600);
  });
  canvas.addEventListener('pointermove', event => {
    const tela = posicao(event);
    if (ponteiros.has(event.pointerId)) ponteiros.set(event.pointerId, tela);
    const mundo = telaParaMundo(tela.x, tela.y);
    S.mouse = mundo;
    if (S.cena && compartilho() && event.pointerType === 'mouse') atividade({ cursor: mundo });
    if (gesto && gesto.tipo === 'pinca' && ponteiros.size >= 2) {
      const [p1, p2] = [...ponteiros.values()];
      const distancia = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      const meio = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      const ancora = { x: gesto.meio.x / gesto.vista.escala + gesto.vista.x, y: gesto.meio.y / gesto.vista.escala + gesto.vista.y };
      S.enquadrada = false;
      S.vista.escala = Math.min(4, Math.max(0.05, gesto.vista.escala * distancia / Math.max(1, gesto.distancia)));
      S.vista.x = ancora.x - meio.x / S.vista.escala;
      S.vista.y = ancora.y - meio.y / S.vista.escala;
      S.alvoVista = null;
      redesenhar();
      return;
    }
    if (!gesto) {
      const sobre = S.ferramenta === 'mover' && S.cena && tokenEm(mundo);
      const clicavel = S.cena && ((S.ferramenta === 'mover' && (portaEm(mundo) || (!sobre && notaEm(mundo)))) || (S.ferramenta === 'notas' && notaEm(mundo)));
      canvas.style.cursor = clicavel ? 'pointer' : sobre && podeMover(sobre) ? 'grab' : '';
      return;
    }
    if (!gesto.moveu && Math.hypot(tela.x - gesto.inicio.x, tela.y - gesto.inicio.y) > 5) { gesto.moveu = true; clearTimeout(seguraTimer); }
    if (gesto.tipo === 'token-talvez' && gesto.moveu) {
      if (gesto.pode) {
        gesto.tipo = 'token';
        S.arrasto = { token: gesto.token, origem: gesto.origem, pos: gesto.origem, alvo: gesto.origem };
        canvas.classList.add('arrastando');
      } else {
        gesto = { tipo: 'pan', inicio: gesto.inicio, vista: { ...S.vista }, moveu: true };
      }
    }
    if (gesto.tipo === 'pan-talvez' && gesto.moveu) gesto.tipo = 'pan';
    if (gesto.tipo === 'luz-nova' && gesto.moveu) gesto = { tipo: 'pan', inicio: gesto.inicio, vista: gesto.vista, moveu: true };
    if (gesto.tipo === 'nota-nova' && gesto.moveu) gesto = { tipo: 'pan', inicio: gesto.inicio, vista: gesto.vista, moveu: true };
    if (gesto.tipo === 'nota-mover' && gesto.moveu) {
      S.notaPrevia = { id: gesto.nota, ...dentro({ x: mundo.x - gesto.desloc.x, y: mundo.y - gesto.desloc.y }) };
      redesenhar();
      return;
    }
    if (gesto.tipo === 'pan') {
      S.enquadrada = false;
      S.vista.x = gesto.vista.x - (tela.x - gesto.inicio.x) / S.vista.escala;
      S.vista.y = gesto.vista.y - (tela.y - gesto.inicio.y) / S.vista.escala;
      S.alvoVista = null;
      redesenhar();
    } else if (gesto.tipo === 'token' && S.arrasto) {
      const token = S.tokens.get(gesto.token);
      if (!token) { S.arrasto = null; gesto = null; return; }
      const pos = dentro({ x: mundo.x - gesto.desloc.x, y: mundo.y - gesto.desloc.y });
      // Shift solta fora da grade (no Foundry, o mesmo: snap = !shiftKey ao arrastar).
      S.arrasto.pos = pos;
      S.arrasto.alvo = event.shiftKey ? pos : encaixar(pos, token.tamanho);
      redesenhar();
    } else if (gesto.tipo === 'regua') {
      S.minhaRegua.b = event.shiftKey ? dentro(mundo) : encaixar(mundo);
      if (compartilho()) atividade({ regua: [S.minhaRegua.a, S.minhaRegua.b] });
      redesenhar();
    } else if (gesto.tipo === 'nevoa') {
      pintar(mundo);
    } else if (gesto.tipo === 'parede' && gesto.moveu) {
      gesto.b = encaixarParede(mundo, event.shiftKey);
      redesenhar();
    } else if (gesto.tipo === 'luz-mover' && gesto.moveu) {
      S.luzPrevia = { id: gesto.luz, ...dentro({ x: mundo.x - gesto.desloc.x, y: mundo.y - gesto.desloc.y }) };
      redesenhar();
    } else if ((gesto.tipo === 'tile-mover' || gesto.tipo === 'tile-tamanho') && gesto.moveu) {
      const tile = (S.cena.tiles || []).find(item => item.id === gesto.tile);
      if (!tile) return;
      if (gesto.tipo === 'tile-mover') {
        S.tilePrevia = { id: tile.id, ...encaixarCanto({ x: mundo.x - gesto.desloc.x, y: mundo.y - gesto.desloc.y }, event.shiftKey) };
      } else {
        // De meio em meio quadrado (Shift solta).
        const passo = event.shiftKey || grade().tipo === 'nenhuma' ? 1 : grade().tamanho / 2;
        const p = noTile(tile, mundo);
        S.tilePrevia = { id: tile.id, largura: Math.max(passo, Math.round(p.x / passo) * passo), altura: Math.max(passo, Math.round(p.y / passo) * passo) };
      }
      redesenhar();
    }
  });
  function terminarGesto(event, cancelar = false) {
    ponteiros.delete(event.pointerId);
    clearTimeout(seguraTimer);
    canvas.classList.remove('arrastando');
    if (!gesto) return;
    if (gesto.tipo === 'pinca') { if (ponteiros.size < 2) gesto = null; return; }
    const atual = gesto;
    gesto = null;
    if (atual.tipo === 'token' && S.arrasto) {
      const alvo = S.arrasto.alvo;
      S.arrasto = null;
      if (!cancelar) moverToken(atual.token, alvo);
      redesenhar();
    } else if (atual.tipo === 'pan-talvez' && !atual.moveu) {
      const nota = atual.nota && notasDaCena().find(item => item.id === atual.nota);
      if (nota && !cancelar) abrirNota(nota); else selecionar(null);
    } else if (atual.tipo === 'nota-nova' && !atual.moveu && !cancelar) {
      op('nota.criar', { cena: S.cena.id, x: atual.ponto.x, y: atual.ponto.y }).then(({ resultado }) => {
        S.notaSel = resultado.nota;
        renderNotaOpcoes();
        redesenhar();
        $('#nota-titulo').select();
      }).catch(() => {});
    } else if (atual.tipo === 'nota-mover' && S.notaPrevia && S.notaPrevia.id === atual.nota) {
      const { id, x, y } = S.notaPrevia;
      if (cancelar) { S.notaPrevia = null; redesenhar(); } else op('nota.editar', { nota: id, x, y }).catch(() => { S.notaPrevia = null; redesenhar(); });
    } else if (atual.tipo === 'regua') {
      // A régua fica um instante na tela e some para todos.
      S.reguaTimer = setTimeout(() => { S.minhaRegua = null; if (compartilho()) atividade({ regua: null }); redesenhar(); }, cancelar ? 0 : 1500);
    } else if (atual.tipo === 'nevoa') {
      enviarNevoa(atual);
    } else if (atual.tipo === 'luz-nova' && !atual.moveu && !cancelar) {
      op('luz.criar', { cena: S.cena.id, x: atual.ponto.x, y: atual.ponto.y, ...luzDoFormulario() }).then(({ resultado }) => { S.luzSel = resultado.luz; renderLuzOpcoes(); redesenhar(); }).catch(() => {});
    } else if (atual.tipo === 'luz-mover' && S.luzPrevia && S.luzPrevia.id === atual.luz) {
      const { id, x, y } = S.luzPrevia;
      if (cancelar) { S.luzPrevia = null; redesenhar(); } else op('luz.editar', { luz: id, x, y }).catch(() => { S.luzPrevia = null; redesenhar(); });
    } else if ((atual.tipo === 'tile-mover' || atual.tipo === 'tile-tamanho') && S.tilePrevia && S.tilePrevia.id === atual.tile) {
      // A prévia fica até a cena voltar do servidor (sem pulo); recusado, volta.
      const { id, ...mudancas } = S.tilePrevia;
      if (cancelar) { S.tilePrevia = null; redesenhar(); } else op('tile.editar', { tile: id, ...mudancas }).catch(() => { S.tilePrevia = null; redesenhar(); });
    } else if (atual.tipo === 'parede') {
      // Arrastou: uma parede nova do tipo escolhido. Clicou: escolhe a parede perto do clique (ou nenhuma).
      if (atual.moveu && !cancelar && (atual.a.x !== atual.b.x || atual.a.y !== atual.b.y)) {
        op('parede.criar', { cena: S.cena.id, paredes: [{ c: [atual.a.x, atual.a.y, atual.b.x, atual.b.y], ...TIPOS_DE_PAREDE[S.paredeTipo] }] }).catch(() => {});
      } else if (!atual.moveu) {
        S.paredeSel = atual.perto ? atual.perto.id : null;
        renderParedeOpcoes();
      }
      redesenhar();
    }
  }
  canvas.addEventListener('pointerup', event => terminarGesto(event));
  canvas.addEventListener('pointercancel', event => terminarGesto(event, true));
  canvas.addEventListener('pointerleave', () => { if (!gesto && S.cena && compartilho()) atividade({ cursor: null }); });
  canvas.addEventListener('wheel', event => {
    event.preventDefault();
    const tela = posicao(event);
    zoomEm(tela.x, tela.y, Math.exp(-event.deltaY * (event.deltaMode === 1 ? 0.05 : 0.0015)));
  }, { passive: false });

  function moverToken(id, alvo) {
    const token = S.tokens.get(id);
    if (!token || (alvo.x === token.x && alvo.y === token.y)) return;
    if (!gm() && VIS.atravessa((S.cena && S.cena.paredes) || [], token, alvo)) { aviso('Uma parede bloqueia o caminho.', 'erro'); return; }
    const antes = { x: token.x, y: token.y };
    // Já mostra no lugar novo; se o servidor recusar, volta.
    Object.assign(token, { x: alvo.x, y: alvo.y, vx: alvo.x, vy: alvo.y });
    redesenhar();
    op('token.mover', { token: id, x: alvo.x, y: alvo.y }).catch(() => {
      const ainda = S.tokens.get(id);
      if (ainda) Object.assign(ainda, antes);
      redesenhar();
    });
  }

  document.addEventListener('keydown', event => {
    if (event.target.closest('input, select, textarea') || event.ctrlKey || event.metaKey) return;
    const tecla = event.key;
    const token = S.selecionado && S.tokens.get(S.selecionado);
    if (tecla === 'v' || tecla === 'V') return escolherFerramenta('mover');
    if (tecla === 'r' || tecla === 'R') return escolherFerramenta('regua');
    if (tecla === 'p' || tecla === 'P') { if (S.mouse) fazerPing(S.mouse, event.shiftKey); return; }
    if ((tecla === 'n' || tecla === 'N') && gm()) return escolherFerramenta('nevoa');
    if ((tecla === 'w' || tecla === 'W') && gm()) return escolherFerramenta('paredes');
    if ((tecla === 't' || tecla === 'T') && gm()) return escolherFerramenta('tiles');
    if ((tecla === 'l' || tecla === 'L') && gm()) return escolherFerramenta('luzes');
    if ((tecla === 'j' || tecla === 'J') && gm()) return escolherFerramenta('notas');
    if (tecla === '0') return enquadrar();
    if (tecla === 'c' || tecla === 'C') return irAoMeuToken();
    if (tecla === 'b' || tecla === 'B') return celular() ? abrirPainel(!$('#painel').classList.contains('aberto')) : barraAberta(!S.barraAberta);
    if (tecla === 'Escape') {
      if (!$('#menu').hidden) return menuAberto(false);
      if (S.notaAberta || !$('#nota-janela').hidden) return fecharNota();
      if (S.escolhendoAlvo) return escolherAlvoNoMapa(false);
      if (S.notaSel) { S.notaSel = null; renderNotaOpcoes(); redesenhar(); return; }
      if (S.paredeSel) { S.paredeSel = null; renderParedeOpcoes(); redesenhar(); return; }
      if (S.tileSel) { S.tileSel = null; renderTileOpcoes(); redesenhar(); return; }
      if (S.luzSel) { S.luzSel = null; renderLuzOpcoes(); redesenhar(); return; }
      selecionar(null); escolherFerramenta('mover'); return;
    }
    if (S.ferramenta === 'paredes' && S.paredeSel && (tecla === 'Delete' || tecla === 'Backspace')) { event.preventDefault(); apagarParedeEscolhida(); return; }
    if (S.ferramenta === 'tiles' && S.tileSel && (tecla === 'Delete' || tecla === 'Backspace')) { event.preventDefault(); apagarTileEscolhido(); return; }
    if (S.ferramenta === 'luzes' && S.luzSel && (tecla === 'Delete' || tecla === 'Backspace')) { event.preventDefault(); apagarLuzEscolhida(); return; }
    if (S.ferramenta === 'notas' && S.notaSel && (tecla === 'Delete' || tecla === 'Backspace')) { event.preventDefault(); apagarNotaEscolhida(); return; }
    if (!token) return;
    const passos = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[tecla];
    if (passos && podeMover(token)) {
      event.preventDefault();
      const g = grade().tamanho;
      moverToken(token.id, dentro({ x: token.x + passos[0] * g, y: token.y + passos[1] * g }));
      return;
    }
    if (gm() && (tecla === 'h' || tecla === 'H')) op('token.editar', { token: token.id, escondido: !token.escondido }).catch(() => {});
    if (gm() && tecla === 'Delete' && confirm(`Tirar ${token.nome} da cena?`)) op('token.apagar', { token: token.id }).catch(() => {});
  });
  function irAoMeuToken() {
    const meu = [...S.tokens.values()].find(token => token.meu);
    if (!meu) return aviso('Você não tem token nesta cena.');
    selecionar(meu.id);
    centrarEm({ x: meu.x, y: meu.y });
  }

  function receberAtividade(data) {
    if (!S.cena || data.cena !== S.cena.id) return;
    const outro = S.atividade.get(data.de) || { nome: data.nome, cor: data.cor };
    Object.assign(outro, { nome: data.nome, cor: data.cor, quando: performance.now() });
    if ('cursor' in data) outro.cursor = data.cursor;
    if ('regua' in data) outro.regua = data.regua;
    if (data.ping) {
      S.pings.push({ x: data.ping.x, y: data.ping.y, cor: data.cor, inicio: performance.now() });
      if (data.ping.puxar) { centrarEm(data.ping); aviso(`${data.nome} trouxe todos para cá.`, 'destaque'); }
    }
    S.atividade.set(data.de, outro);
    redesenhar();
  }

  // ---------------- Ferramentas ----------------
  // O que aparece ao passar o mouse em cada ferramenta (o nome, o atalho e como usar). A dica de baixo fica só para o que
  // pede atenção na hora (escolher o alvo no mapa).
  function renderDicas() {
    const dicas = {
      mover: ['Mover · V', gm() ? 'Arraste tokens e o mapa. A roda aproxima. Segure o clique para ping (Shift traz todos). Shift solta fora da grade. Clique na porta abre e fecha; Shift tranca. Clique num alfinete abre a nota.' : 'Arraste o seu token e o mapa. A roda ou a pinça aproxima. Segure o clique para ping. As setas movem um quadrado. Clique na porta abre e fecha. Clique num alfinete abre a nota.'],
      regua: ['Régua · R', 'Arraste para medir: quadrados, metros e a DV por alcance. Shift mede fora da grade.'],
      ping: ['Ping · P', `Clique para chamar atenção para um ponto.${gm() ? ' Shift traz todos para ele.' : ''}`],
      nevoa: ['Névoa · N', 'Pinte para revelar; Alt cobre. Revelar tudo e Cobrir tudo ficam na aba Cena.'],
      paredes: ['Paredes e portas · W', 'Arraste para desenhar; a ponta gruda na grade e nas outras paredes (Shift solta). Clique numa parede para escolher; Delete apaga.'],
      tiles: ['Tiles · T', 'Clique num tile para escolher e arraste para mover (encaixa na grade; Shift solta). O quadrado amarelo muda o tamanho; Delete apaga.'],
      luzes: ['Luzes · L', 'Clique no mapa para pôr uma luz; clique numa luz para escolher e arraste para mover. Delete apaga.'],
      notas: ['Notas · J', 'Clique no mapa para pôr uma nota (um handout ou uma página da wiki); clique numa para editar e arraste para mover. Delete apaga. "Quem vê" decide se os jogadores veem o alfinete.'],
      centralizar: ['A cena inteira · 0', 'Enquadra o mapa e os tokens na tela.'],
      'meu-token': ['O seu token · C', 'Leva a tela até o seu token e escolhe ele.']
    };
    for (const botao of $$('#ferramentas button')) {
      const [titulo, texto] = dicas[botao.dataset.ferramenta || botao.dataset.acao] || [];
      if (titulo) botao.dataset.dica = `${titulo.toUpperCase()}\n${texto}`;
    }
  }
  function escolherFerramenta(nome) {
    if (['nevoa', 'paredes', 'tiles', 'luzes', 'notas'].includes(nome) && !gm()) return;
    S.ferramenta = nome;
    for (const botao of $$('[data-ferramenta]')) botao.classList.toggle('ativa', botao.dataset.ferramenta === nome);
    canvas.className = nome === 'mover' ? '' : nome;
    $('#nevoa-opcoes').hidden = nome !== 'nevoa';
    $('#paredes-opcoes').hidden = nome !== 'paredes';
    $('#tiles-opcoes').hidden = nome !== 'tiles';
    $('#luzes-opcoes').hidden = nome !== 'luzes';
    $('#notas-opcoes').hidden = nome !== 'notas';
    if (nome !== 'luzes' && S.luzSel) { S.luzSel = null; renderLuzOpcoes(); }
    if (nome !== 'notas' && S.notaSel) { S.notaSel = null; renderNotaOpcoes(); }
    if (nome !== 'paredes' && S.paredeSel) { S.paredeSel = null; renderParedeOpcoes(); }
    if (nome !== 'tiles' && S.tileSel) { S.tileSel = null; renderTileOpcoes(); }
    redesenhar();
  }
  for (const botao of $$('[data-ferramenta]')) botao.addEventListener('click', () => escolherFerramenta(botao.dataset.ferramenta));
  for (const botao of $$('#paredes-opcoes [data-tipo]')) {
    botao.addEventListener('click', () => {
      S.paredeTipo = botao.dataset.tipo;
      for (const outro of $$('#paredes-opcoes [data-tipo]')) outro.classList.toggle('ativo', outro === botao);
    });
  }
  $('#luzes-opcoes').addEventListener('change', event => {
    const luz = luzEscolhida();
    if (!luz) return;
    if (event.target.id === 'luz-escondida') op('luz.editar', { luz: luz.id, escondido: event.target.checked }).catch(() => {});
    else if (['luz-claro', 'luz-penumbra', 'luz-cor', 'luz-sem-cor'].includes(event.target.id)) op('luz.editar', { luz: luz.id, ...luzDoFormulario() }).catch(() => {});
    event.target.blur();
  });
  $('#luz-apagar').addEventListener('click', apagarLuzEscolhida);
  $('#tile-novo').addEventListener('change', event => { const escolhido = event.target.files[0]; event.target.value = ''; if (escolhido) novoTile(escolhido); });
  $('#tile-escolhido').addEventListener('change', event => {
    const campo = event.target.dataset.tile;
    const tile = tileEscolhido();
    if (!campo || !tile) return;
    const valor = campo === 'escondido' ? event.target.checked : Number(event.target.value);
    op('tile.editar', { tile: tile.id, [campo]: valor }).catch(() => {});
    event.target.blur();
  });
  $('#tile-escolhido').addEventListener('click', event => {
    const tile = tileEscolhido();
    if (!tile) return;
    const ordem = event.target.closest('[data-tile-ordem]');
    if (ordem) op('tile.editar', { tile: tile.id, ordem: ordem.dataset.tileOrdem }).catch(() => {});
    if (event.target.closest('[data-tile-apagar]')) apagarTileEscolhido();
  });
  $('#paredes-escolhida').addEventListener('click', event => { if (event.target.closest('[data-parede-apagar]')) apagarParedeEscolhida(); });
  $('#paredes-escolhida').addEventListener('change', event => {
    if (event.target.id !== 'parede-tipo' || !S.paredeSel) return;
    op('parede.editar', { parede: S.paredeSel, ...TIPOS_DE_PAREDE[event.target.value] }).catch(() => {});
  });
  $('[data-acao="centralizar"]').addEventListener('click', enquadrar);
  $('[data-acao="meu-token"]').addEventListener('click', irAoMeuToken);
  for (const botao of $$('#nevoa-opcoes [data-modo]')) {
    botao.addEventListener('click', () => {
      S.nevoaModo = botao.dataset.modo;
      for (const outro of $$('#nevoa-opcoes [data-modo]')) outro.classList.toggle('ativo', outro === botao);
    });
  }
  $('#nevoa-raio').addEventListener('input', event => {
    S.nevoaRaio = Number(event.target.value);
    $('#nevoa-raio-valor').textContent = `${S.nevoaRaio} ${S.nevoaRaio === 1 ? 'quadrado' : 'quadrados'}`;
  });

  // ---------------- Seleção e cartão do token ----------------
  function selecionar(id) {
    S.selecionado = id && S.tokens.has(id) ? id : null;
    const token = S.selecionado && S.tokens.get(S.selecionado);
    if (token && (gm() || token.meu)) { const valor = `token:${token.id}`; if ([...$('#rolar-quem').options].some(option => option.value === valor)) { $('#rolar-quem').value = valor; renderPericias(); } }
    renderCartao();
    redesenhar();
  }
  function cartaoDe(token) {
    if (token.personagem) return [...S.personagens, ...S.meus].find(item => item.id === token.personagem) || null;
    return null;
  }
  function renderCartao() {
    const caixa = $('#cartao');
    const token = S.selecionado && S.tokens.get(S.selecionado);
    renderHud();
    $('#cartao-vazio').hidden = Boolean(token);
    if (!token) { caixa.hidden = true; caixa.dataset.token = ''; return; }
    // Escrevendo a nota, o HP ou o ataque deste token: não troca o cartão debaixo de quem digita.
    if (caixa.dataset.token === token.id && !caixa.hidden && caixa.contains(document.activeElement) && document.activeElement.matches('textarea, input, select')) return;
    if (S.ataque && S.ataque.token !== token.id) S.ataque = null;
    caixa.dataset.token = token.id;
    const editaHp = gm() || token.meu;
    const tipo = token.tipo === 'pj' ? 'Personagem' : token.tipo === 'npc' ? 'NPC' : 'Token';
    const foto = token.imagem ? `style="--cor:${token.cor};background-image:url('${esc(token.imagem)}')"` : `style="--cor:${token.cor}"`;
    const npc = gm() && token.tipo === 'npc' ? S.npcs.find(item => item.id === token.npc) : null;
    const partes = [`<div class="cartao-topo"><span class="avatar" ${foto}>${token.imagem ? '' : esc(initials(token.nome))}</span><div><h3>${esc(token.nome)}</h3><small>${tipo}${npc ? ` · ${esc(npc.grupo)}${npc.pagina ? ` · p. ${npc.pagina}` : ''}` : ''}${token.escondido ? ' · escondido' : ''}</small></div><button class="cartao-fechar" type="button" data-cartao="fechar" aria-label="Fechar">×</button></div>`];
    if (token.hp) {
      const fracao = token.hp.max ? Math.max(0, Math.min(1, token.hp.atual / token.hp.max)) : 0;
      partes.push(`<div class="hp"><div class="hp-linha">${editaHp ? '<button class="botao vazado pequeno" data-hp="-5" type="button">−5</button><button class="botao vazado pequeno" data-hp="-1" type="button">−1</button>' : ''}
        ${editaHp ? `<input type="number" data-hp-atual value="${token.hp.atual}" aria-label="HP atual">` : `<b>${token.hp.atual}</b>`}<span>/ ${token.hp.max} HP</span>
        ${editaHp ? '<button class="botao vazado pequeno" data-hp="1" type="button">+1</button><button class="botao vazado pequeno" data-hp="5" type="button">+5</button>' : ''}</div>
        <div class="hp-barra"><i style="width:${fracao * 100}%;background:${fracao > 0.5 ? 'var(--g)' : fracao > 0 ? '#ff8a3d' : 'var(--r)'}"></i></div></div>`);
    }
    if (token.estado) partes.push(`<div class="estado ${woundClass(token.estado)}">${esc(token.estado)}${token.estado === 'Gravemente Ferido' ? ' · −2 em tudo' : token.estado === 'Mortalmente Ferido' ? ' · −4 em tudo, Death Save no turno' : ''}</div>`);
    const estados = [token.morto ? '<span class="tag falha">Morto</span>' : '', token.suprimido ? '<span class="tag lesao">Suprimido</span>' : ''].filter(Boolean);
    if (estados.length) partes.push(`<div>${estados.join('')}</div>`);
    if (gm() || token.meu) partes.push(htmlDaFichaDeCombate(token));
    const acoes = [];
    if ((gm() || token.meu) && !token.morto) acoes.push(`<button class="botao pequeno" type="button" data-cartao="atacar">${S.ataque && S.ataque.token === token.id ? 'Fechar o ataque' : 'Atacar'}</button>`);
    if (gm() || token.meu) acoes.push('<button class="botao vazado pequeno" type="button" data-cartao="rolar">Rolar</button>');
    const acesa = Boolean(token.luz && (token.luz.claro || token.luz.penumbra));
    if (gm() || token.meu) acoes.push(`<button class="botao vazado pequeno" type="button" data-cartao="lanterna">${acesa ? 'Apagar a luz' : 'Acender a lanterna'}</button>`);
    if ((gm() || token.meu) && token.hp && token.hp.atual < 1 && !token.morto) acoes.push('<button class="botao pequeno perigo" type="button" data-cartao="deathsave">Death Save</button>');
    if (gm()) {
      acoes.push(`<button class="botao vazado pequeno" type="button" data-cartao="esconder">${token.escondido ? 'Mostrar' : 'Esconder'}</button>`);
      if (token.tipo === 'pj') acoes.push('<button class="botao vazado pequeno" type="button" data-cartao="ficha">Atualizar da ficha</button>');
      if (S.combate && !S.combate.ordem.some(item => item.token === token.id)) acoes.push('<button class="botao vazado pequeno" type="button" data-cartao="combate">Pôr no combate</button>');
      if (token.hp && token.hp.atual < 1 && !token.morto) acoes.push('<button class="botao vazado pequeno" type="button" data-cartao="estabilizar">Estabilizar</button>');
      if (token.suprimido) acoes.push('<button class="botao vazado pequeno" type="button" data-cartao="suprimido">Tirar Suprimido</button>');
      acoes.push(`<button class="botao vazado pequeno" type="button" data-cartao="morto">${token.morto ? 'Não está morto' : 'Marcar morto'}</button>`);
      acoes.push('<button class="botao vazado pequeno perigo" type="button" data-cartao="apagar">Tirar da cena</button>');
    }
    if (acoes.length) partes.push(`<div class="cartao-acoes">${acoes.join('')}</div>`);
    if (S.ataque && S.ataque.token === token.id) partes.push(htmlDoAtaque(token));
    if (gm()) {
      partes.push(`<details class="dano-mestre"><summary>Dano à mão</summary><div class="campo-linha">
        <label class="campo cresce">Dano <input data-dm="valor" type="text" placeholder="12 ou 3d6" maxlength="10"></label>
        <label class="campo">Local <select data-dm="local"><option value="corpo">Corpo</option><option value="cabeca">Cabeça</option></select></label></div>
        <div class="campo-linha"><label class="marcar"><input data-dm="metade" type="checkbox"> Metade do SP</label><label class="marcar"><input data-dm="sem" type="checkbox"> Sem armadura</label>
        <button class="botao pequeno" type="button" data-cartao="dano">Aplicar</button></div></details>`);
      partes.push(`<details class="aparencia"${S.aparenciaAberta ? ' open' : ''}><summary>Aparência</summary><div class="campo-linha">
        <label class="campo cresce">Nome <input data-ap="nome" type="text" maxlength="40" value="${esc(token.nome)}"></label>
        <label class="campo">Tamanho <select data-ap="tamanho">${[1, 2, 3, 4].map(n => `<option value="${n}"${(token.tamanho || 1) === n ? ' selected' : ''}>${n} × ${n}</option>`).join('')}</select></label>
        <label class="campo">Cor <input data-ap="cor" type="color" value="${esc(token.cor)}"></label></div>
        <div class="campo-linha"><label class="campo">Visão (m) <input data-ap="alcance" type="number" min="0" max="1000" step="1" value="${token.alcance ?? 30}" title="Até onde vê no escuro (sem a luz global)"></label>
        <label class="campo">Luz clara (m) <input data-ap="luz-claro" type="number" min="0" max="60" step="0.5" value="${(token.luz && token.luz.claro) || 0}"></label>
        <label class="campo">Penumbra (m) <input data-ap="luz-penumbra" type="number" min="0" max="60" step="0.5" value="${(token.luz && token.luz.penumbra) || 0}"></label></div>
        ${token.tipo === 'pj' ? '<p class="nota">A imagem do personagem é o retrato da ficha.</p>' : `<div class="campo-linha"><label class="campo cresce">Imagem <input data-ap="imagem" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"></label>${token.imagem ? '<button class="link" type="button" data-cartao="sem-imagem">tirar a imagem</button>' : ''}</div>`}</details>`);
      partes.push(`<label>Nota do mestre<textarea data-cartao-notas placeholder="Só você vê.">${esc(token.notas || '')}</textarea></label>`);
    }
    caixa.style.setProperty('--cor', token.cor);
    caixa.innerHTML = partes.join('');
    caixa.hidden = false;
  }
  // ---------------- O HUD do token ----------------
  // Junto do token escolhido no mapa, como o Token HUD do Foundry: o nome, o HP (−, o número ou "−5"/"+5", +) e as ações
  // do momento. O resto (armas, munição, o ataque, a aparência, a nota) fica no cartão, na aba Token da barra.
  const ICONE = {
    mira: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/></svg>',
    dado: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 9h.01M15 15h.01M15 9h.01M9 15h.01M12 12h.01" stroke-width="3"/></svg>',
    lanterna: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10v4l-2 3v11H9V10L7 7z"/><path d="M12 13v2"/></svg>',
    caveira: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a7 7 0 0 0-4 12.7V19h8v-3.3A7 7 0 0 0 12 3z"/><path d="M9.5 11h.01M14.5 11h.01M10 19v2M14 19v2" stroke-width="2.5"/></svg>',
    olho: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/></svg>',
    olhoFechado: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 6.1A10 10 0 0 1 12 6c6.4 0 10 6 10 6a17 17 0 0 1-3 3.6M6.5 7.6C3.8 9.3 2 12 2 12s3.6 6 10 6a9.6 9.6 0 0 0 4.4-1"/></svg>',
    espadas: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4l11 11M13 17l4-4M15 15l4 4M20 4L9 15M7 13l4 4M9 15l-4 4"/></svg>',
    cartao: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6 16c.6-1.5 1.7-2 3-2s2.4.5 3 2M14 10h4M14 13h3"/></svg>'
  };
  function renderHud() {
    const hud = $('#hud');
    const token = S.selecionado && S.tokens.get(S.selecionado);
    if (!token) { hud.hidden = true; hud.dataset.token = ''; return; }
    // Digitando o HP no HUD: não troca o campo debaixo de quem digita.
    if (hud.dataset.token === token.id && hud.contains(document.activeElement) && document.activeElement.matches('input')) return;
    const meu = gm() || token.meu;
    const botao = (tipo, titulo, icone, classe = '') => `<button type="button" data-cartao="${tipo}" class="${classe}" title="${esc(titulo)}" aria-label="${esc(titulo)}">${ICONE[icone]}</button>`;
    const hp = !token.hp ? '' : meu
      ? `<span class="hud-hp"><button type="button" data-hp="-1" aria-label="Tirar 1 de HP">−</button><input data-hud-hp type="text" inputmode="numeric" value="${token.hp.atual}" aria-label="HP: o número, ou −5 e +5 para somar" title="Escreva o HP, ou −5 e +5 para somar"><span>/${token.hp.max}</span><button type="button" data-hp="1" aria-label="Dar 1 de HP">+</button></span>`
      : `<span class="hud-hp">${token.hp.atual}/${token.hp.max}</span>`;
    const acesa = Boolean(token.luz && (token.luz.claro || token.luz.penumbra));
    const acoes = [];
    if (meu && !token.morto) acoes.push(botao('atacar', 'Atacar', 'mira'));
    if (meu) acoes.push(botao('rolar', 'Rolar um teste', 'dado'));
    if (meu) acoes.push(botao('lanterna', acesa ? 'Apagar a luz' : 'Acender a lanterna', 'lanterna', acesa ? 'ativo' : ''));
    if (meu && token.hp && token.hp.atual < 1 && !token.morto) acoes.push(botao('deathsave', 'Death Save', 'caveira', 'perigo'));
    if (gm()) {
      acoes.push(botao('esconder', token.escondido ? 'Mostrar aos jogadores' : 'Esconder dos jogadores', token.escondido ? 'olhoFechado' : 'olho', token.escondido ? 'ativo' : ''));
      if (S.combate && !S.combate.ordem.some(item => item.token === token.id)) acoes.push(botao('combate', 'Pôr no combate', 'espadas'));
    }
    acoes.push(botao('abrir', 'Abrir o cartão: armas, munição, ataque e aparência', 'cartao'));
    hud.innerHTML = `<div class="hud-topo"><b>${esc(token.nome)}</b>${token.estado && token.estado !== 'Sem ferimentos' ? `<small class="estado ${woundClass(token.estado)}">${esc(token.estado)}</small>` : ''}${hp}</div><div class="hud-acoes">${acoes.join('')}</div>`;
    hud.style.setProperty('--cor', token.cor);
    hud.dataset.token = token.id;
    hud.hidden = false;
    S.hudPos = null;
    posicionarHud();
  }
  // Embaixo do token (em cima, se não couber), sempre dentro da área livre do mapa. Chamado a cada quadro desenhado.
  function posicionarHud() {
    const hud = $('#hud');
    if (hud.hidden) return;
    const token = S.tokens.get(hud.dataset.token);
    if (!token) return;
    hud.classList.toggle('arrastando', Boolean(S.arrasto && S.arrasto.token === token.id));
    const escala = S.vista.escala;
    const raio = raioDe(token) * escala;
    const x = (token.vx - S.vista.x) * escala;
    const y = (token.vy - S.vista.y) * escala;
    const livre = areaLivre();
    const largura = hud.offsetWidth;
    const altura = hud.offsetHeight;
    // Abaixo do nome do token (o rótulo que o mapa desenha embaixo dele).
    let topo = y + raio + 30;
    if (topo + altura > livre.y1 - 4) topo = y - raio - 8 - altura;
    const esquerda = Math.round(Math.min(Math.max(x - largura / 2, livre.x0 + 4), livre.x1 - largura - 4));
    topo = Math.round(Math.min(Math.max(topo, livre.y0 + 4), livre.y1 - altura - 4));
    const posicao = `${esquerda},${topo}`;
    if (posicao === S.hudPos) return;
    S.hudPos = posicao;
    hud.style.transform = `translate(${esquerda}px, ${topo}px)`;
  }
  // O cartão do token na barra (no celular, a folha de baixo).
  function abrirCartaoNaBarra() {
    abrirAba('token');
    if (celular()) abrirPainel(true);
  }

  // SP, Sorte, armas com o pente, lesões e o Death Save: o dono e o mestre recebem do servidor.
  function htmlDaFichaDeCombate(token) {
    const linhas = [];
    const sp = token.sp;
    const numeros = [];
    if (sp) numeros.push(`SP cabeça <b>${sp.cabeca.atual}</b>/${sp.cabeca.max}`, `corpo <b>${sp.corpo.atual}</b>/${sp.corpo.max}`);
    if (token.sorte) numeros.push(`Sorte <b>${token.sorte.atual}</b>/${token.sorte.max}`);
    if (token.deathSave) numeros.push(`Death Save +${token.deathSave}`);
    if (numeros.length) linhas.push(`<div class="numeros-combate">${numeros.join(' · ')}</div>`);
    if ((token.lesoes || []).length) linhas.push(`<div class="lesoes"><small>Lesões</small>${token.lesoes.map(nome => `<span class="tag lesao">${esc(nome)}</span>`).join('')}</div>`);
    const armas = token.armas || [];
    if (armas.length) {
      linhas.push(`<ul class="armas">${armas.map(arma => `<li><b>${esc(arma.nome)}</b><span>${esc(arma.dano)}${arma.pente ? ` · <span class="${arma.pente.atual ? '' : 'erro'}">${arma.pente.atual}/${arma.pente.max}</span>` : ''}${arma.pente && arma.municao ? ` · ${esc(arma.municao)}` : ''}</span>
        ${htmlDaRecarga(token, arma)}${htmlDe2077(token, arma)}</li>`).join('')}</ul>`);
    }
    return linhas.length ? `<div class="ficha-combate">${linhas.join('')}</div>` : '';
  }
  // Recarregar. O personagem recarrega com a munição da ficha (a caixa diminui) e escolhe qual, quando tem mais de uma
  // que serve; trocar devolve o que estava no pente. O NPC (arma.municoes não vem) recarrega de graça.
  function htmlDaRecarga(token, arma) {
    if (!arma.pente) return '';
    const caixas = arma.municoes;
    const cheia = arma.pente.atual >= arma.pente.max;
    if (!Array.isArray(caixas)) return cheia ? '' : `<button class="link" type="button" data-recarregar="${esc(arma.id)}">recarregar</button>`;
    if (!caixas.length) return cheia ? '' : '<small class="erro">sem munição na ficha</small>';
    const escolhida = S.municaoEscolhida.get(`${token.id}:${arma.id}`);
    const caixa = caixas.find(item => item.id === escolhida) || caixas.find(item => item.id === arma.municaoId) || caixas[0];
    const troca = caixa.id !== arma.municaoId;
    const escolha = caixas.length > 1
      ? `<select class="municao" data-municao-de="${esc(arma.id)}" aria-label="Munição para ${esc(arma.nome)}">${caixas.map(item => `<option value="${esc(item.id)}"${item.id === caixa.id ? ' selected' : ''}>${esc(item.nome)} (${item.qtd})</option>`).join('')}</select>`
      : `<small class="${caixa.qtd ? '' : 'erro'}">${caixa.qtd} na caixa</small>`;
    const pode = caixa.qtd > 0 && (troca || !cheia);
    return `${escolha}${pode ? `<button class="link" type="button" data-recarregar="${esc(arma.id)}" data-municao="${esc(caixa.id)}">${troca ? 'trocar a munição' : 'recarregar'}</button>` : ''}`;
  }
  // A classe de 2077 da arma (Mission Kit), os avisos e os botões de estado: carregar a Tech, manejar o ferrolho, a
  // coronha. O servidor confere tudo de novo no ataque.
  const CLASSE_2077 = { power: 'Power', smart: 'Smart', tech: 'Tech' };
  const DICA_2077 = {
    power: 'Power: a lesão crítica causa 10 de dano bônus em vez de 5. Tem o modo Ricochete.',
    smart: 'Smart: +1 nos ataques à distância; só dispara conectada (Neuroport, Interface Plugs ou Subdermal Grip).',
    tech: 'Tech: carregar gasta a Ação de Movimento; carregada, o próximo ataque ignora metade do SP e atravessa cobertura fina.'
  };
  function htmlDe2077(token, arma) {
    const kit = arma.kit;
    if (!kit) return '';
    const partes = [`<span class="tag kit kit-${esc(kit.classe)}" title="${esc(DICA_2077[kit.classe] || '')}">${esc(CLASSE_2077[kit.classe] || kit.classe)}${kit.rebuild ? ' (Rebuild)' : ''}</span>`];
    if (kit.classe === 'smart' && arma.smartMelhorada) partes.push('<span class="tag kit" title="Ignora escuridão, fumaça e neblina; errou por 5 ou menos, tenta de novo com 14 + 1d10.">Smart melhorada</span>');
    if (kit.classe === 'smart' && arma.distancia && token.cromo && !token.cromo.conexaoSmart) partes.push('<span class="tag falha" title="A arma Smart só dispara conectada: o Personal Link do Neuroport, Interface Plugs ou Subdermal Grip.">sem conexão Smart</span>');
    const botao = (acao, texto, dica, ativo = false) => `<button class="link${ativo ? ' ativo' : ''}" type="button" data-arma-acao="${acao}" data-arma="${esc(arma.id)}" title="${esc(dica)}">${texto}</button>`;
    if (kit.classe === 'tech') partes.push(botao('carregar', arma.carregada ? 'carregada' : 'carregar', arma.carregada ? 'Carregada: o próximo ataque ignora metade do SP. Clique para descarregar.' : `Carregar (${kit.cargaSemMovimento ? 'sem gastar a Ação de Movimento' : 'gasta a Ação de Movimento'}).`, arma.carregada));
    if (arma.ferrolho) partes.push(botao('ferrolho', 'manejar o ferrolho', 'Uma Ação para manejar o ferrolho antes de atirar de novo. Clique quando gastar a Ação.', true));
    if (kit.coronhaRetratil) partes.push(botao('coronha', arma.coronha ? 'coronha recolhida (−1)' : 'coronha estendida', arma.coronha ? 'Clique para estender (uma Ação).' : 'Clique para recolher (dá para esconder; −1 nos ataques).', arma.coronha));
    return `<div class="arma-2077">${partes.join('')}</div>`;
  }

  // ---------------- Ataque ----------------
  // Os modos e a DV como o servidor calcula (mesa-regras.js); aqui só para mostrar antes de atacar.
  const AUTOFOGO = new Set(['smg', 'heavySmg', 'assaultRifle']);
  const CORPO = new Set(['lightMelee', 'medMelee', 'heavyMelee', 'vHeavyMelee', 'briga', 'artesMarciais']);
  const EXPLOSIVO = new Set(['grenadeLauncher', 'rocketLauncher', 'thrownWeapon']);
  const LINHA_DV = { medPistol: 'pistol', heavyPistol: 'pistol', vHeavyPistol: 'pistol', smg: 'smg', heavySmg: 'smg', assaultRifle: 'assault', shotgun: 'shotgun', sniperRifle: 'sniper', bow: 'bow', grenadeLauncher: 'grenade', thrownWeapon: 'grenade', rocketLauncher: 'rocket' };
  const NOME_MODO = { tiro: 'Tiro', mirado: 'Mirado', ricochete: 'Ricochete', autofogo: 'Autofogo', supressivo: 'Supressivo', cartucho: 'Cartucho', corpo: 'Corpo a corpo', explosivo: 'Explosivo' };
  const armasDe = token => [...(token.armas || []), { id: 'briga', nome: 'Desarmado (briga)', classe: 'briga', dano: 'pelo BODY', pente: null }];
  // Os modos vêm do servidor com a arma (as de 2077 têm os delas); sem eles, pela classe.
  const modosDe = arma => (Array.isArray(arma.modos) && arma.modos.length ? arma.modos
    : CORPO.has(arma.classe) ? ['corpo'] : EXPLOSIVO.has(arma.classe) ? ['explosivo'] : AUTOFOGO.has(arma.classe) ? ['tiro', 'mirado', 'autofogo', 'supressivo'] : ['tiro', 'mirado']);
  function dvPrevia(classe, metros, autofogo) {
    const linha = (rules.rangeDV || []).find(item => item.id === LINHA_DV[classe]);
    const tabela = linha && (autofogo ? linha.autofire : linha.dv);
    const faixa = (rules.rangeBandLimits || []).findIndex(limite => metros <= limite);
    return tabela && faixa >= 0 && faixa < tabela.length ? tabela[faixa] : null;
  }
  function htmlDoAtaque(token) {
    const at = S.ataque;
    const armas = armasDe(token);
    const arma = armas.find(item => item.id === at.arma) || armas[0];
    at.arma = arma.id;
    const modos = modosDe(arma);
    if (!modos.includes(at.modo)) at.modo = modos[0];
    const alvos = [...S.tokens.values()].filter(item => item.id !== token.id && !item.morto)
      .map(item => ({ item, metros: medir(token, item).metros })).sort((a, b) => a.metros - b.metros);
    if (!alvos.some(({ item }) => item.id === at.alvo)) at.alvo = alvos.length ? alvos[0].item.id : '';
    const alvo = S.tokens.get(at.alvo);
    const kit = arma.kit || null;
    let previa = '';
    if (at.modo === 'supressivo') previa = 'Todos a até 25 m rolam WILL + Concentração contra o seu ataque. 10 balas.';
    else if (alvo) {
      const metros = medir(token, alvo).metros;
      if (at.modo === 'corpo') previa = metros > Math.max(2, grade().metros) ? `${metros} m: longe demais (corpo a corpo é até 2 m)` : `${metros} m · o alvo esquiva (DEX + Evasão)`;
      else if (at.modo === 'cartucho') previa = `DV 13 · se acertar, 3d6 em todos à sua frente até 6 m e à vista, na direção de ${alvo.nome}`;
      else {
        const dv = dvPrevia(arma.classe, metros, at.modo === 'autofogo');
        const ricochete = token.cromo && token.cromo.coprocessador ? ' · −2 (ricochete com o Ballistic Coprocessor)' : ' · −4 (ricochete: alvo atrás de cobertura ou fora da vista)';
        previa = `${metros} m · ${dv === null ? 'fora do alcance' : `DV ${dv}`}${at.modo === 'mirado' ? ' · −8 no ataque' : ''}${at.modo === 'ricochete' ? ricochete : ''}${at.modo === 'autofogo' ? ' · 10 balas' : ''}${at.modo === 'explosivo' ? ' · área de 10 × 10 m' : ''}`;
      }
    }
    // Os ajustes da arma (o servidor faz a mesma conta).
    const ajustes = [];
    if (kit && kit.classe === 'smart' && arma.distancia) ajustes.push('Smart +1');
    if (arma.excelente) ajustes.push('excelente +1');
    if (kit && kit.coronhaRetratil && arma.coronha) ajustes.push('coronha −1');
    if (kit && kit.classe === 'tech' && arma.carregada && at.modo !== 'supressivo') ajustes.push('carregada: ignora metade do SP');
    if (kit && kit.balas > 1 && ['tiro', 'mirado', 'ricochete', 'cartucho'].includes(at.modo)) ajustes.push(`${kit.balas} balas no tiro`);
    if (ajustes.length) previa += `${previa ? ' · ' : ''}${ajustes.join(' · ')}`;
    // A Kappa trava um segundo alvo a até 4 m do primeiro; a Palica dispara os dois canos.
    const segundos = kit && kit.doisAlvos && alvo && ['tiro', 'mirado', 'ricochete'].includes(at.modo)
      ? alvos.filter(({ item }) => item.id !== alvo.id && medir(alvo, item).metros <= 4) : null;
    if (!segundos || !segundos.some(({ item }) => item.id === at.alvo2)) at.alvo2 = '';
    const doisCanos = kit && kit.doisCanos && arma.pente && arma.pente.atual >= 2 && ['tiro', 'mirado', 'ricochete', 'cartucho'].includes(at.modo);
    if (!doisCanos) at.doisCanos = false;
    return `<div class="atacar">
      <label class="campo">Arma <select data-at="arma">${armas.map(item => `<option value="${esc(item.id)}"${item.id === arma.id ? ' selected' : ''}>${esc(item.nome)}${item.pente ? ` (${item.pente.atual}/${item.pente.max})` : ''}</option>`).join('')}</select></label>
      <div class="segmentado" role="radiogroup" aria-label="Modo">${modos.map(modo => `<button type="button" data-at-modo="${modo}" class="${modo === at.modo ? 'ativo' : ''}">${NOME_MODO[modo]}</button>`).join('')}</div>
      ${at.modo === 'mirado' ? `<div class="segmentado" role="radiogroup" aria-label="Onde">${[['cabeca', 'Cabeça'], ['perna', 'Perna'], ['item', 'Item na mão']].map(([valor, nome]) => `<button type="button" data-at-local="${valor}" class="${(at.local || 'cabeca') === valor ? 'ativo' : ''}">${nome}</button>`).join('')}</div>` : ''}
      ${at.modo === 'supressivo' ? '' : `<div class="campo-linha"><label class="campo cresce">Alvo <select data-at="alvo">${alvos.map(({ item, metros }) => `<option value="${esc(item.id)}"${item.id === at.alvo ? ' selected' : ''}>${esc(item.nome)} · ${metros} m</option>`).join('') || '<option value="">Ninguém na cena</option>'}</select></label>
        <button class="botao vazado pequeno" type="button" data-at="mapa">${S.escolhendoAlvo ? 'Clique no alvo…' : 'No mapa'}</button></div>`}
      ${segundos ? `<label class="campo">Segundo alvo (a até 4 m) <select data-at="alvo2"><option value="">Nenhum</option>${segundos.map(({ item }) => `<option value="${esc(item.id)}"${item.id === at.alvo2 ? ' selected' : ''}>${esc(item.nome)}</option>`).join('')}</select></label>` : ''}
      ${doisCanos ? `<label class="marcar"><input data-at-marcar="doisCanos" type="checkbox"${at.doisCanos ? ' checked' : ''}> Os dois canos (2 cartuchos, 4d6)</label>` : ''}
      <p class="previa">${esc(previa)}</p>
      <div class="campo-linha"><label class="campo mod">Mod <input data-at="mod" type="number" min="-30" max="30" value="${at.mod || 0}"></label>
        ${token.sorte ? `<label class="campo mod">Sorte <input data-at="sorte" type="number" min="0" max="${token.sorte.atual}" value="${at.sorte || 0}"></label>` : ''}
        <button class="botao" type="button" data-at="disparar">Atacar</button></div></div>`;
  }
  async function dispararAtaque(token) {
    const at = S.ataque;
    const resposta = await op('ataque', { atacante: token.id, arma: at.arma, modo: at.modo, local: at.local || 'cabeca', alvo: at.alvo, alvo2: at.alvo2 || undefined, doisCanos: Boolean(at.doisCanos), mod: Number(at.mod) || 0, sorte: Number(at.sorte) || 0 }).catch(() => null);
    if (!resposta) return;
    at.sorte = 0;
    if (resposta.resultado && !resposta.resultado.concluido) aviso('Esperando a defesa do alvo…');
    // O cartão do ataque aparece no chat: com a barra aberta, a aba vira a do chat; recolhida, ele aparece no canto.
    if (!chatFlutua()) abrirAba('rolagens', { expandir: false });
  }
  function escolherAlvoNoMapa(ligado) {
    S.escolhendoAlvo = ligado;
    canvas.classList.toggle('alvo', ligado);
    $('#dica').textContent = ligado ? 'Clique no token que você quer atacar (Esc cancela)' : '';
    renderCartao();
  }

  // Os cliques do cartão (na aba Token) e do HUD (no mapa) fazem o mesmo.
  function cliqueNoToken(event) {
    const token = S.selecionado && S.tokens.get(S.selecionado);
    if (!token) return;
    const doHud = event.currentTarget.id === 'hud';
    const hp = event.target.closest('[data-hp]');
    if (hp && token.hp) {
      op('token.editar', { token: token.id, hp: { atual: token.hp.atual + Number(hp.dataset.hp), max: token.hp.max } }).catch(() => {});
      return;
    }
    const recarregar = event.target.closest('[data-recarregar]');
    if (recarregar) {
      op('arma.recarregar', { token: token.id, arma: recarregar.dataset.recarregar, ...(recarregar.dataset.municao ? { municao: recarregar.dataset.municao } : {}) })
        .then(resposta => {
          S.municaoEscolhida.delete(`${token.id}:${recarregar.dataset.recarregar}`);
          const feito = resposta.resultado;
          if (feito && feito.municao) aviso(`${feito.arma}: ${feito.entrou} de ${feito.municao} no pente (sobram ${feito.sobra}).`);
        }).catch(() => {});
      return;
    }
    const acaoDaArma = event.target.closest('[data-arma-acao]');
    if (acaoDaArma) { op(`arma.${acaoDaArma.dataset.armaAcao}`, { token: token.id, arma: acaoDaArma.dataset.arma }).catch(() => {}); return; }
    const modo = event.target.closest('[data-at-modo]');
    if (modo) { S.ataque.modo = modo.dataset.atModo; renderCartao(); return; }
    const local = event.target.closest('[data-at-local]');
    if (local) { S.ataque.local = local.dataset.atLocal; renderCartao(); return; }
    const at = event.target.closest('[data-at]');
    if (at && at.dataset.at === 'mapa') { escolherAlvoNoMapa(!S.escolhendoAlvo); return; }
    if (at && at.dataset.at === 'disparar') { dispararAtaque(token); return; }
    const acao = event.target.closest('[data-cartao]');
    if (!acao) return;
    const tipo = acao.dataset.cartao;
    if (tipo === 'fechar') { S.ataque = null; selecionar(null); }
    if (tipo === 'abrir') abrirCartaoNaBarra();
    // Atacar: o formulário do ataque, no cartão (pelo HUD, abre o cartão com ele).
    if (tipo === 'atacar') {
      const aberto = S.ataque && S.ataque.token === token.id;
      if (!doHud || !aberto) S.ataque = aberto ? null : { token: token.id, arma: '', modo: '', local: 'cabeca', alvo: '', mod: 0, sorte: 0 };
      escolherAlvoNoMapa(false);
      if (doHud) abrirCartaoNaBarra();
    }
    // Rolar pelo token: a bandeja de rolagem, com ele em "Quem rola" (no chat do canto, se a barra estiver recolhida).
    if (tipo === 'rolar') {
      if (!chatFlutua()) { abrirAba('rolagens'); abrirPainel(true); }
      $('#rolar-quem').value = `token:${token.id}`;
      renderPericias();
      bandejaAberta(true);
      $('#rolar-pericia').focus();
    }
    if (tipo === 'deathsave') op('deathsave', { token: token.id }).catch(() => {});
    if (tipo === 'esconder') op('token.editar', { token: token.id, escondido: !token.escondido }).catch(() => {});
    if (tipo === 'ficha') op('token.ficha', { token: token.id }).then(() => aviso('Token atualizado com a ficha de agora.')).catch(() => {});
    if (tipo === 'combate') op('combate.adicionar', { token: token.id }).catch(() => {});
    if (tipo === 'estabilizar') op('estabilizar', { token: token.id }).catch(() => {});
    if (tipo === 'suprimido') op('token.estado', { token: token.id, suprimido: false }).catch(() => {});
    if (tipo === 'morto') op('token.estado', { token: token.id, morto: !token.morto }).catch(() => {});
    if (tipo === 'dano') {
      const valor = $('#cartao [data-dm="valor"]').value.trim();
      if (!valor) return aviso('Escreva o dano (um número ou dados, como 3d6).');
      op('dano.aplicar', { token: token.id, ...(/d/i.test(valor) ? { expressao: valor } : { valor: Number(valor) }), local: $('#cartao [data-dm="local"]').value, metade: $('#cartao [data-dm="metade"]').checked, semArmadura: $('#cartao [data-dm="sem"]').checked }).catch(() => {});
    }
    if (tipo === 'apagar' && confirm(`Tirar ${token.nome} da cena?`)) op('token.apagar', { token: token.id }).catch(() => {});
    if (tipo === 'sem-imagem') op('token.editar', { token: token.id, midia: '' }).catch(() => {});
    if (tipo === 'lanterna') {
      const acesa = Boolean(token.luz && (token.luz.claro || token.luz.penumbra));
      op('token.editar', { token: token.id, luz: acesa ? { claro: 0, penumbra: 0 } : { claro: 6, penumbra: 12 } }).catch(() => {});
    }
  }
  $('#cartao').addEventListener('click', cliqueNoToken);
  $('#hud').addEventListener('click', cliqueNoToken);
  // O HP no HUD: o número troca; "−5" e "+5" somam (como as barras do Token HUD do Foundry).
  $('#hud').addEventListener('change', event => {
    const token = S.selecionado && S.tokens.get(S.selecionado);
    if (!event.target.matches('[data-hud-hp]') || !token || !token.hp) return;
    const texto = event.target.value.trim().replace(/[−–]/g, '-');
    const numero = Number(texto);
    event.target.blur();
    if (!texto || !Number.isFinite(numero)) { renderHud(); return; }
    const atual = /^[+-]/.test(texto) ? token.hp.atual + numero : numero;
    op('token.editar', { token: token.id, hp: { atual: Math.round(atual), max: token.hp.max } }).catch(() => renderHud());
  });
  // Duplo clique no token escolhido abre o cartão dele (como a ficha no Foundry).
  canvas.addEventListener('dblclick', event => {
    const caixa = canvas.getBoundingClientRect();
    const token = tokenEm(telaParaMundo(event.clientX - caixa.left, event.clientY - caixa.top));
    if (token && token.id === S.selecionado) abrirCartaoNaBarra();
  });
  // O <details> da aparência fica aberto quando o cartão é refeito (o toggle não sobe: pega na captura).
  $('#cartao').addEventListener('toggle', event => { if (event.target.matches('.aparencia')) S.aparenciaAberta = event.target.open; }, true);
  $('#cartao').addEventListener('change', event => {
    const token = S.selecionado && S.tokens.get(S.selecionado);
    if (!token) return;
    if (event.target.matches('[data-hp-atual]') && token.hp) op('token.editar', { token: token.id, hp: { atual: Number(event.target.value), max: token.hp.max } }).catch(() => {});
    if (event.target.matches('[data-cartao-notas]')) op('token.editar', { token: token.id, notas: event.target.value }).catch(() => {});
    const aparencia = event.target.dataset.ap;
    if (aparencia === 'alcance') { op('token.editar', { token: token.id, alcance: Number(event.target.value) || 0 }).catch(() => {}); event.target.blur(); }
    if (aparencia === 'luz-claro' || aparencia === 'luz-penumbra') {
      op('token.editar', { token: token.id, luz: { claro: Number($('#cartao [data-ap="luz-claro"]').value) || 0, penumbra: Number($('#cartao [data-ap="luz-penumbra"]').value) || 0 } }).catch(() => {});
      event.target.blur();
    }
    if (aparencia === 'nome' || aparencia === 'cor' || aparencia === 'tamanho') { op('token.editar', { token: token.id, [aparencia]: aparencia === 'tamanho' ? Number(event.target.value) : event.target.value }).catch(() => {}); event.target.blur(); }
    if (aparencia === 'imagem' && event.target.files[0]) {
      enviarMidia(event.target.files[0]).then(({ midia }) => op('token.editar', { token: token.id, midia })).catch(error => { if (error.message && !/^\d+$/.test(error.message)) aviso(error.message, 'erro'); });
    }
    const campo = event.target.dataset.at;
    if (campo && S.ataque) {
      S.ataque[campo] = event.target.value;
      if (campo === 'arma' || campo === 'alvo') { event.target.blur(); renderCartao(); }
    }
    if (event.target.dataset.atMarcar && S.ataque) S.ataque[event.target.dataset.atMarcar] = event.target.checked;
    if (event.target.dataset.municaoDe) {
      S.municaoEscolhida.set(`${token.id}:${event.target.dataset.municaoDe}`, event.target.value);
      event.target.blur();
      renderCartao();
    }
  });

  // ---------------- Barra lateral ----------------
  // Como a do Foundry 14: a faixa de ícones fica sempre; o conteúdo abre por cima do mapa (o mapa não encolhe nem pula)
  // e recolhe pelo ícone da aba aberta, pela seta ou pela tecla B. Cada navegador lembra. No celular a barra é a folha de
  // baixo (o botão Painel), e recolher não vale.
  const celular = () => window.matchMedia('(max-width: 820px)').matches;
  // A aba aberta está à vista? (no PC, a barra aberta; no celular, a folha de baixo levantada)
  const barraVisivel = () => (celular() ? $('#painel').classList.contains('aberto') : S.barraAberta);
  function barraAberta(aberta, { lembrar = true } = {}) {
    S.barraAberta = aberta;
    document.body.classList.toggle('barra-recolhida', !aberta);
    // Recolhida, o conteúdo sai do Tab e do leitor de tela.
    $('#painel-conteudo').inert = !aberta && !celular();
    const seta = $('#barra-recolher');
    seta.setAttribute('aria-expanded', String(aberta));
    seta.title = aberta ? 'Recolher a barra (B)' : 'Abrir a barra (B)';
    seta.querySelector('.sr').textContent = aberta ? 'Recolher a barra' : 'Abrir a barra';
    posicionarChat();
    limparSelos();
    redesenhar(); // o HUD do token volta para dentro da área livre
    if (lembrar) store.set('barra', aberta ? 'aberta' : 'recolhida');
  }
  window.matchMedia('(max-width: 820px)').addEventListener('change', () => barraAberta(S.barraAberta, { lembrar: false }));
  const nomeDaAba = nome => (nome === 'fichas' ? (gm() ? 'Fichas' : 'Personagem') : { rolagens: 'Chat', combate: 'Combate', token: 'Token', audio: 'Áudio', cena: 'Cena' }[nome] || '');
  const abaVisivel = nome => barraVisivel() && $(`.abas [data-aba="${nome}"]`).classList.contains('ativa');
  // A bolinha da aba some quando a aba fica à vista.
  function limparSelos() {
    if (abaVisivel('combate')) $('#combate-selo').hidden = true;
    if (abaVisivel('rolagens')) $('#chat-selo').hidden = true;
  }
  // expandir: abrir a aba também abre a barra recolhida (o clique da pessoa); o que a página faz sozinha não abre.
  function abrirAba(nome, { expandir = true } = {}) {
    for (const botao of $$('.abas [data-aba]')) {
      const ativa = botao.dataset.aba === nome;
      botao.classList.toggle('ativa', ativa);
      botao.setAttribute('aria-selected', String(ativa));
    }
    for (const aba of $$('.aba')) aba.classList.toggle('ativa', aba.dataset.aba === nome);
    $('#painel-titulo').textContent = nomeDaAba(nome);
    store.set('aba', nome);
    if (expandir && !S.barraAberta) barraAberta(true);
    limparSelos();
  }
  for (const botao of $$('.abas [data-aba]')) {
    botao.addEventListener('click', () => {
      // O ícone da aba aberta recolhe a barra (como no Foundry); os outros abrem a aba deles.
      if (!celular() && S.barraAberta && botao.classList.contains('ativa')) barraAberta(false);
      else abrirAba(botao.dataset.aba);
    });
  }
  $('#barra-recolher').addEventListener('click', () => barraAberta(!S.barraAberta));
  function abrirPainel(aberto) {
    $('#painel').classList.toggle('aberto', aberto);
    $('#painel-abrir').setAttribute('aria-expanded', String(aberto));
    if (!aberto) folhaCheia(false);
    limparSelos();
    redesenhar(); // o HUD do token sobe para cima da folha
  }
  $('#painel-abrir').addEventListener('click', () => abrirPainel(!$('#painel').classList.contains('aberto')));
  // No celular, a folha tem duas alturas: metade (o mapa em cima) e a tela cheia. Tocar na alça troca; arrastar a alça
  // para cima enche, e para baixo baixa (da metade, fecha).
  function folhaCheia(cheia) {
    $('#painel').classList.toggle('cheia', cheia);
    $('#painel-alca').setAttribute('aria-expanded', String(cheia));
  }
  {
    const alca = $('#painel-alca');
    let inicio = null;
    let arrastou = false;
    alca.addEventListener('pointerdown', event => { inicio = event.clientY; arrastou = false; alca.setPointerCapture(event.pointerId); });
    alca.addEventListener('pointermove', event => { if (inicio !== null && Math.abs(event.clientY - inicio) > 12) arrastou = true; });
    alca.addEventListener('pointerup', event => {
      if (inicio === null) return;
      const desceu = event.clientY - inicio;
      inicio = null;
      if (!arrastou) return;
      if (desceu < -30) folhaCheia(true);
      else if (desceu > 30) { if ($('#painel').classList.contains('cheia')) folhaCheia(false); else abrirPainel(false); }
    });
    alca.addEventListener('click', () => { if (!arrastou) folhaCheia(!$('#painel').classList.contains('cheia')); });
  }

  // ---------------- Chat ----------------
  // A bandeja de rolagem (o teste de perícia, os dados e a lesão crítica) abre pelo dado da caixa do chat.
  function bandejaAberta(aberta) {
    $('#rolar').hidden = !aberta;
    $('#bandeja-abrir').setAttribute('aria-expanded', String(aberta));
  }
  $('#bandeja-abrir').addEventListener('click', () => bandejaAberta($('#rolar').hidden));
  // Com a barra recolhida (no PC), o chat fica no canto do mapa, como as notificações do chat do Foundry 14: a caixa vai
  // para lá, e as mensagens novas aparecem por cima dela e somem sozinhas (o mouse em cima segura; o ataque esperando a
  // defesa fica até resolver). No celular, a barra é a folha de baixo: o chat fica nela.
  const chatFlutua = () => !celular() && !S.barraAberta;
  function posicionarChat() {
    const flutua = chatFlutua();
    const caixa = $('#chat-caixa');
    const destino = flutua ? $('#chat-flutuante') : $('.aba[data-aba="rolagens"]');
    if (caixa.parentElement !== destino) destino.append(caixa);
    $('#chat-flutuante').hidden = !flutua;
    if (!flutua) $('#chat-novas').innerHTML = '';
  }
  const DURA_NO_CHAT = 9000;
  function mostrarNoChat(entrada) {
    const lista = $('#chat-novas');
    const seletor = `li[data-id="${CSS.escape(entrada.id)}"]`;
    const antes = lista.querySelector(seletor);
    if (antes) antes.outerHTML = htmlEntrada(entrada); else lista.insertAdjacentHTML('beforeend', htmlEntrada(entrada));
    lista.querySelector(seletor).dataset.ate = entrada.pendente ? '' : String(Date.now() + DURA_NO_CHAT);
    while (lista.children.length > 4) lista.firstElementChild.remove();
  }
  setInterval(() => {
    const lista = $('#chat-novas');
    if (!lista.children.length || $('#chat-flutuante').matches(':hover')) return;
    for (const li of [...lista.children]) {
      if (!li.dataset.ate || Number(li.dataset.ate) > Date.now() || li.classList.contains('saindo')) continue;
      li.classList.add('saindo');
      setTimeout(() => li.remove(), 500);
    }
  }, 1000);
  // Uma entrada nova no registro: no canto do mapa (a barra recolhida) ou a bolinha na aba (o chat fora de vista).
  function avisarDoChat(entrada) {
    if (chatFlutua()) mostrarNoChat(entrada);
    else if (!abaVisivel('rolagens') && !entrada.autor.meu) $('#chat-selo').hidden = false;
  }
  // Os avisos (as rolagens, os erros) sobem para não cobrir o chat do canto.
  new ResizeObserver(() => {
    const caixa = $('#chat-flutuante');
    document.body.style.setProperty('--avisos-baixo', caixa.hidden ? '16px' : `${Math.round(caixa.getBoundingClientRect().height) + 24}px`);
  }).observe($('#chat-flutuante'));

  // O menu (≡ na pastilha): voltar para a wiki, a campanha, a conta e os atalhos. Fecha ao clicar fora ou com Esc.
  function menuAberto(aberto) {
    $('#menu').hidden = !aberto;
    $('#menu-abrir').setAttribute('aria-expanded', String(aberto));
  }
  $('#menu-abrir').addEventListener('click', () => menuAberto($('#menu').hidden));
  document.addEventListener('pointerdown', event => { if (!$('#menu').hidden && !event.target.closest('#menu, #menu-abrir')) menuAberto(false); });

  function renderTudo() {
    for (const chave of Object.keys(assinaturas)) delete assinaturas[chave];
    renderTopo();
    renderDicas();
    renderPresenca();
    renderRolarQuem();
    renderCombate();
    renderVez();
    renderFichas();
    renderCenaPainel();
    renderAudio();
    renderSom();
    renderCartao();
    escolherFerramenta(S.ferramenta === 'nevoa' && !gm() ? 'mover' : S.ferramenta);
    if (!gm() && $('.abas [data-aba="cena"]').classList.contains('ativa')) abrirAba('rolagens', { expandir: false });
  }
  // Um token que só andou não muda as listas: elas só são refeitas quando muda o que mostram (refazer a lista a cada
  // passo fecharia o seletor aberto e perderia a rolagem do painel).
  const assinaturas = {};
  function mudou(chave, valor) {
    if (assinaturas[chave] === valor) return false;
    assinaturas[chave] = valor;
    return true;
  }
  function renderDepoisDeToken(id) {
    if (id === S.selecionado) renderCartao();
    const tokens = [...S.tokens.values()];
    if (mudou('quem', JSON.stringify(fontesDeRolagem()))) renderRolarQuem();
    if (mudou('fichas', JSON.stringify(gm() ? [S.cena && S.cena.id, tokens.map(token => token.personagem).filter(Boolean).sort()] : tokens.filter(token => token.meu).map(token => [token.personagem, token.hp])))) renderFichas();
    redesenhar();
  }
  function renderTopo() {
    const info = S.campanhaInfo || {};
    const chip = $('#campanha-nome');
    chip.textContent = info.nome || '';
    chip.style.color = info.cor || '';
    chip.hidden = S.campanhas.length > 1;
    const escolha = $('#campanha');
    escolha.hidden = S.campanhas.length < 2;
    if (!escolha.hidden) {
      escolha.innerHTML = S.campanhas.map(item => `<option value="${esc(item.id)}"${item.id === S.campanha ? ' selected' : ''}>${esc(item.nome)}</option>`).join('');
    }
    const ver = $('#cena-ver');
    ver.hidden = !gm() || !S.cenas.length;
    if (gm()) {
      ver.innerHTML = S.cenas.map(cena => `<option value="${esc(cena.id)}"${S.cena && cena.id === S.cena.id ? ' selected' : ''}>${cena.ativa ? '▶ ' : ''}${esc(cena.nome)}</option>`).join('');
    }
    $('#cena-ativar').hidden = !gm() || !S.cena || S.cena.id === S.cenaAtiva;
    $('#cena-nome').textContent = !gm() && S.cena ? S.cena.nome : gm() && S.cena && S.cena.id !== S.cenaAtiva ? 'Só você vê' : '';
    document.title = `${S.cena ? `${S.cena.nome} · ` : ''}Mesa · Night City Fieldbook`;
    // A aba Fichas é "Personagem" para o jogador.
    $('.abas [data-aba="fichas"]').title = nomeDaAba('fichas');
    const ativa = $('.abas [data-aba].ativa');
    if (ativa) $('#painel-titulo').textContent = nomeDaAba(ativa.dataset.aba);
    const conta = $('#conta');
    if (config.teste) {
      conta.hidden = false;
      conta.textContent = gm() ? 'Testar como jogador' : 'Sair';
      conta.title = gm() ? 'Só no teste: entrar com o código de um jogador de teste' : `Sair (${S.eu ? S.eu.nome : ''})`;
    } else {
      conta.hidden = gm();
      conta.textContent = 'Sair';
    }
  }
  $('#campanha').addEventListener('change', event => { S.campanha = event.target.value; store.set('campanha', S.campanha); S.cenaVista = null; conectar(); });
  $('#cena-ver').addEventListener('change', event => op('cena.ver', { cena: event.target.value === S.cenaAtiva ? null : event.target.value }).catch(() => {}));
  $('#cena-ativar').addEventListener('click', () => { if (S.cena) op('cena.ativar', { cena: S.cena.id }).then(() => op('cena.ver', { cena: null })).catch(() => {}); });
  $('#conta').addEventListener('click', async () => {
    if (gm() && config.teste) return mostrarEntrar();
    await fetch('/api/sair', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).catch(() => {});
    location.reload();
  });
  function renderPresenca() {
    $('#presenca').innerHTML = S.presenca.map(pessoa => `<span style="--cor:${esc(pessoa.cor)}" title="${pessoa.papel === 'mestre' ? 'Mestre' : 'Jogador'}">${esc(pessoa.nome)}</span>`).join('');
    renderChatPara();
  }
  // Para quem: todos, só o mestre, ou um sussurro a um jogador que está na mesa.
  function renderChatPara() {
    const select = $('#chat-para');
    const atual = select.value;
    const jogadores = S.presenca.filter(pessoa => pessoa.papel === 'jogador' && pessoa.conta && (!S.eu || pessoa.conta !== S.eu.conta));
    select.innerHTML = `<option value="todos">Todos</option><option value="mestre">${gm() ? 'Só eu (nota)' : 'Só o mestre'}</option>${jogadores.map(pessoa => `<option value="${esc(pessoa.conta)}">Sussurro: ${esc(pessoa.nome)}</option>`).join('')}`;
    if ([...select.options].some(option => option.value === atual)) select.value = atual;
  }
  $('#chat').addEventListener('submit', event => {
    event.preventDefault();
    const campo = $('#chat-texto');
    const texto = campo.value.trim();
    if (!texto) return;
    const para = $('#chat-para').value;
    // /r 2d6 rola os dados; fora de "Todos", a rolagem fica só com o mestre.
    const rolagem = texto.match(/^\/r(?:oll)?\s+(.+)$/i);
    const pedido = rolagem
      ? op('rolar', { modo: 'dados', expressao: rolagem[1], ...origemDaRolagem(), secreta: para !== 'todos' })
      : op('chat', { texto, para });
    pedido.then(() => { campo.value = ''; }).catch(() => {});
  });

  // ---------------- Rolagens ----------------
  function fontesDeRolagem() {
    const fontes = [];
    const tokens = [...S.tokens.values()].filter(token => gm() || token.meu);
    if (gm()) fontes.push({ valor: '', rotulo: 'Mestre (sem ficha)' });
    for (const token of tokens) fontes.push({ valor: `token:${token.id}`, rotulo: `${token.nome}${gm() ? ` (${token.tipo === 'pj' ? 'PJ' : token.tipo === 'npc' ? 'NPC' : 'token'})` : ''}` });
    const comToken = new Set(tokens.map(token => token.personagem).filter(Boolean));
    for (const ficha of gm() ? S.personagens : S.meus) if (!comToken.has(ficha.id)) fontes.push({ valor: `personagem:${ficha.id}`, rotulo: `${ficha.nome}${gm() ? ' (fora da cena)' : ''}` });
    if (!gm() && !fontes.length) fontes.push({ valor: '', rotulo: 'Sem personagem: só o dado' });
    return fontes;
  }
  function renderRolarQuem() {
    const select = $('#rolar-quem');
    const atual = select.value;
    const fontes = fontesDeRolagem();
    select.innerHTML = fontes.map(fonte => `<option value="${esc(fonte.valor)}">${esc(fonte.rotulo)}</option>`).join('');
    if (fontes.some(fonte => fonte.valor === atual)) select.value = atual;
    renderPericias();
  }
  function fonteEscolhida() {
    const [tipo, id] = ($('#rolar-quem').value || '').split(':');
    if (tipo === 'token') {
      const token = S.tokens.get(id);
      if (!token) return null;
      return { token, ficha: cartaoDe(token), pericias: token.tipo === 'npc' ? (token.pericias || []).map(item => ({ ...item, npc: true })) : (cartaoDe(token) || {}).pericias || [] };
    }
    if (tipo === 'personagem') {
      const ficha = [...S.personagens, ...S.meus].find(item => item.id === id);
      return ficha ? { ficha, pericias: ficha.pericias || [] } : null;
    }
    return null;
  }
  function renderPericias() {
    const fonte = fonteEscolhida();
    const select = $('#rolar-pericia');
    const atual = select.value;
    const pericias = fonte ? fonte.pericias : [];
    select.innerHTML = `<option value="">${pericias.length ? '— só STAT ou dado —' : 'Sem perícias'}</option>${pericias.map(item => `<option value="${esc(item.nome)}">${esc(item.pt)} · ${item.base}</option>`).join('')}`;
    if (pericias.some(item => item.nome === atual)) select.value = atual;
    select.disabled = !pericias.length;
    const stats = $('#rolar-stat');
    if (!stats.options.length) stats.innerHTML = `<option value="">—</option>${STATS.map(stat => `<option>${stat}</option>`).join('')}`;
    stats.disabled = !fonte || Boolean(select.value);
  }
  $('#rolar-quem').addEventListener('change', renderPericias);
  $('#rolar-pericia').addEventListener('change', renderPericias);
  function origemDaRolagem() {
    const [tipo, id] = ($('#rolar-quem').value || '').split(':');
    return tipo === 'token' ? { token: id } : tipo === 'personagem' ? { personagem: id } : {};
  }
  const secreta = () => $('#rolar-secreta').checked;
  $('#rolar').addEventListener('submit', event => {
    event.preventDefault();
    op('rolar', { modo: 'teste', ...origemDaRolagem(), pericia: $('#rolar-pericia').value || undefined, stat: $('#rolar-stat').disabled ? undefined : $('#rolar-stat').value || undefined, mod: Number($('#rolar-mod').value) || 0, secreta: secreta() }).catch(() => {});
  });
  for (const botao of $$('[data-dados]')) botao.addEventListener('click', () => op('rolar', { modo: 'dados', expressao: botao.dataset.dados, ...origemDaRolagem(), secreta: secreta() }).catch(() => {}));
  const rolarLivre = () => { const expressao = $('#dados-livre').value.trim(); if (expressao) op('rolar', { modo: 'dados', expressao, ...origemDaRolagem(), secreta: secreta() }).catch(() => {}); };
  $('#dados-livre-rolar').addEventListener('click', rolarLivre);
  $('#dados-livre').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); rolarLivre(); } });
  for (const botao of $$('[data-lesao]')) botao.addEventListener('click', () => op('rolar', { modo: 'lesao', local: botao.dataset.lesao, ...origemDaRolagem(), secreta: secreta() }).catch(() => {}));
  $('#registro-limpar').addEventListener('click', () => { if (confirm('Apagar o registro de rolagens desta mesa?')) op('registro.limpar').catch(() => {}); });

  // "REF 8 + Armas de uma Mão 6 − Gravemente Ferido 2 + d10 10 + d10 4"
  function contaDoTeste(r) {
    const termos = (r.partes || []).map((parte, i) => `${i ? `${parte.valor < 0 ? '−' : '+'} ` : parte.valor < 0 ? '−' : ''}${esc(parte.rotulo)} ${Math.abs(parte.valor)}`);
    termos.push(`${termos.length ? '+ ' : ''}<span class="${r.dado === 10 ? 'dado10' : r.dado === 1 ? 'dado1' : ''}">d10 ${r.dado}</span>`);
    if (r.extra) termos.push(`${r.extra > 0 ? '+' : '−'} <span class="${r.extra > 0 ? 'dado10' : 'dado1'}">d10 ${Math.abs(r.extra)}</span>`);
    return termos.join(' ');
  }
  const tagsDoCritico = r => [r.critico === 'sucesso' ? '<span class="tag sucesso">Sucesso crítico</span>' : '', r.critico === 'falha' ? '<span class="tag falha">Falha crítica</span>' : ''].filter(Boolean);
  const botaoDesfazer = entrada => (entrada.podeDesfazer ? `<div><button class="link" type="button" data-desfazer="${esc(entrada.id)}">desfazer</button></div>` : '');
  const lesoesHtml = lesoes => (lesoes || []).map(lesao => `<div class="reg-lesao"><b>${esc(lesao.nome)}</b> (+5 direto): ${esc(lesao.efeito)}</div>`).join('');
  // O dano de um alvo: "13 − SP 7 (cabeça ×2) → −17 HP (35 → 18) · SP cabeça 7 → 6". Sem o HP de NPC para os jogadores.
  function contaDoDano(d, multiplicador) {
    if (!d) return '';
    const hp = d.hp && d.hp.antes !== null && d.hp.antes !== undefined ? ` (${d.hp.antes} → ${d.hp.depois})` : '';
    const sp = d.ablacao ? ` · SP ${d.local === 'cabeca' ? 'cabeça' : 'corpo'} ${d.sp.antes} → ${d.sp.depois}` : '';
    return `${d.total}${multiplicador ? ` (2d6 × ${multiplicador})` : ''} − SP ${d.spEfetivo}${d.local === 'cabeca' ? ' (cabeça ×2)' : ''} → <b>−${d.perda} HP</b>${hp}${sp}`;
  }
  function htmlAtaque(entrada) {
    const a = entrada.ataque || {};
    const r = a.rolagem || {};
    const alvos = (a.alvos || []).map(alvo => alvo.nome).join(', ') || (a.modo === 'supressivo' ? 'todos a até 25 m' : '—');
    const linhas = [];
    if (entrada.pendente) linhas.push('<div class="reg-alvo">Esperando a defesa…</div>');
    else if (entrada.cancelado) linhas.push('<div class="reg-alvo">Cancelado: o servidor reiniciou no meio.</div>');
    else {
      for (const nota of a.notas || []) linhas.push(`<div class="reg-nota">${esc(nota)}</div>`);
      if (a.segunda) linhas.push(`<div class="reg-alvo">Segunda chance da munição Smart melhorada: <b>${a.segunda.total}</b> contra DV ${a.dv}.</div>`);
      if (a.errou) linhas.push(a.modo === 'cartucho' ? `<div class="reg-alvo">Errou o cartucho (DV ${a.dv}).</div>` : `<div class="reg-alvo">Errou${a.dv === null ? ' (fora do alcance)' : ` (DV ${a.dv})`}: o mestre decide onde caiu.</div>`);
      for (const alvo of a.alvos || []) {
        let defesa;
        if (alvo.escolha === 'esquivar') defesa = `esquivou com ${alvo.defesa ? alvo.defesa.total : '?'}`;
        else if (alvo.escolha === 'concentrar') defesa = `${alvo.defesa ? alvo.defesa.total : '?'} na Concentração`;
        else defesa = alvo.dv === null || alvo.dv === undefined ? (['tiro', 'mirado', 'ricochete', 'autofogo'].includes(a.modo) ? 'fora do alcance' : 'aguentou') : `aguentou (DV ${alvo.dv})`;
        if (alvo.segundaChance) defesa += `; segunda chance (Smart melhorada) ${alvo.segundaChance.total}`;
        if (alvo.redirecionado) defesa = `as balas Smart mudaram de alvo; ${defesa}`;
        if (a.modo === 'supressivo') linhas.push(`<div class="reg-alvo"><b>${esc(alvo.nome)}</b>: ${defesa} → ${alvo.acertou ? '<span class="tag lesao">Suprimido</span>' : 'resistiu'}</div>`);
        else if (!alvo.acertou) linhas.push(`<div class="reg-alvo"><b>${esc(alvo.nome)}</b>: ${defesa} → errou</div>`);
        else linhas.push(`<div class="reg-alvo"><b>${esc(alvo.nome)}</b>: ${defesa} → pegou. ${contaDoDano(alvo.dano, alvo.multiplicador)}</div>${lesoesHtml(alvo.dano && alvo.dano.lesoes)}`);
      }
    }
    const tags = r.partes ? tagsDoCritico(r) : [];
    if (entrada.desfeito) tags.push('<span class="tag secreta">Desfeito</span>');
    return `<li class="ataque${entrada.desfeito ? ' desfeito' : ''}" data-id="${esc(entrada.id)}" style="--cor:${esc(entrada.autor.cor)}">
      <div class="reg-topo"><span><b>${esc(a.atacante)}</b> → ${esc(alvos)}</span><span>${esc(hora(entrada.quando))}</span></div>
      <div class="reg-corpo"><span class="reg-rotulo">${esc(a.descricao || 'Ataque')} · ${esc(a.arma || '')}</span>${r.total !== undefined ? `<span class="reg-total">${r.total}</span>` : ''}</div>
      ${r.partes ? `<div class="reg-conta">${contaDoTeste(r)}</div>` : ''}${tags.length ? `<div>${tags.join('')}</div>` : ''}${linhas.join('')}${botaoDesfazer(entrada)}</li>`;
  }

  function htmlEntrada(entrada) {
    if (entrada.tipo === 'sistema') return `<li class="sistema" data-id="${esc(entrada.id)}">${esc(hora(entrada.quando))} · ${esc(entrada.texto)}</li>`;
    if (entrada.tipo === 'chat') {
      const para = Array.isArray(entrada.para) ? ` <small>→ ${esc(entrada.paraNome || 'Mestre')} (só vocês${entrada.paraNome === 'Mestre' ? '' : ' e o mestre'})</small>` : '';
      return `<li class="chat${entrada.para ? ' sussurro' : ''}" data-id="${esc(entrada.id)}" style="--cor:${esc(entrada.autor.cor)}"><div class="reg-topo"><span><b>${esc(entrada.autor.nome)}</b>${para}</span><span>${esc(hora(entrada.quando))}</span></div>
        <div class="reg-texto">${esc(entrada.texto).replace(/\n/g, '<br>')}</div></li>`;
    }
    if (entrada.tipo === 'ataque') return htmlAtaque(entrada);
    if (entrada.tipo === 'dano') {
      return `<li class="${entrada.desfeito ? 'desfeito' : ''}" data-id="${esc(entrada.id)}" style="--cor:${esc(entrada.autor.cor)}"><div class="reg-topo"><span><b>${esc(entrada.quem)}</b> sofreu dano</span><span>${esc(hora(entrada.quando))}</span></div>
        <div class="reg-alvo">${contaDoDano(entrada.dano)}</div>${lesoesHtml(entrada.dano && entrada.dano.lesoes)}${entrada.desfeito ? '<div><span class="tag secreta">Desfeito</span></div>' : ''}${botaoDesfazer(entrada)}</li>`;
    }
    if (entrada.tipo === 'deathsave') {
      const d = entrada.deathSave || {};
      return `<li class="${entrada.desfeito ? 'desfeito' : ''}" data-id="${esc(entrada.id)}" style="--cor:${esc(entrada.autor.cor)}"><div class="reg-topo"><span><b>${esc(entrada.quem)}</b> · Death Save</span><span>${esc(hora(entrada.quando))}</span></div>
        <div class="reg-corpo"><span class="reg-rotulo">d10 ${d.dado}${d.penalidade ? ` + ${d.penalidade}` : ''} contra BODY ${d.body}</span><span class="reg-total">${d.dado + (d.penalidade || 0)}</span></div>
        <div>${d.vive ? '<span class="tag sucesso">Vive (menor que o BODY)</span>' : `<span class="tag falha">Morreu${d.dado === 10 ? ' (10 natural)' : ''}</span>`}${entrada.desfeito ? '<span class="tag secreta">Desfeito</span>' : ''}</div>${botaoDesfazer(entrada)}</li>`;
    }
    const r = entrada.rolagem || {};
    const quem = entrada.quem || entrada.autor.nome;
    const por = entrada.quem && entrada.quem !== entrada.autor.nome ? ` <small>por ${esc(entrada.autor.nome)}</small>` : '';
    const tags = [];
    let conta = '';
    let extra = '';
    if (r.tipo === 'teste') {
      conta = contaDoTeste(r);
      tags.push(...tagsDoCritico(r));
    } else if (r.tipo === 'dados') {
      conta = `[${(r.dados || []).join(', ')}]${r.bonus ? ` ${sinal(r.bonus)}` : ''}`;
      if (r.lesao) tags.push('<span class="tag lesao">Dois 6: se for dano, lesão crítica (+5 direto no HP)</span>');
    } else if (r.tipo === 'lesao') {
      conta = `2d6: ${(r.dados || []).join(' + ')}`;
      if (r.lesao) extra = `<div class="reg-lesao"><b>${esc(r.lesao.nome)}</b>: ${esc(r.lesao.efeito)}${r.lesao.correcao && r.lesao.correcao !== '—' ? ` Correção rápida: ${esc(r.lesao.correcao)}.` : ''} Tratamento: ${esc(r.lesao.tratamento)}.</div>`;
    }
    if (entrada.secreta) tags.unshift(`<span class="tag secreta">${entrada.autor.papel === 'mestre' ? 'Secreta' : 'Só para o mestre'}</span>`);
    return `<li class="${entrada.secreta ? 'secreta' : ''}" data-id="${esc(entrada.id)}" style="--cor:${esc(entrada.autor.cor)}"><div class="reg-topo"><span><b>${esc(quem)}</b>${por}</span><span>${esc(hora(entrada.quando))}</span></div>
      <div class="reg-corpo"><span class="reg-rotulo">${esc(r.rotulo)}</span><span class="reg-total">${r.total}</span></div><div class="reg-conta">${conta}</div>${tags.length ? `<div>${tags.join('')}</div>` : ''}${extra}</li>`;
  }
  function renderRegistro() {
    const lista = $('#registro');
    lista.innerHTML = S.registro.map(htmlEntrada).join('');
    lista.scrollTop = lista.scrollHeight;
  }
  function adicionarRegistro(entrada) {
    const lista = $('#registro');
    const noFim = lista.scrollHeight - lista.scrollTop - lista.clientHeight < 60;
    lista.insertAdjacentHTML('beforeend', htmlEntrada(entrada));
    while (lista.children.length > 200) lista.firstElementChild.remove();
    if (noFim || entrada.autor.meu) lista.scrollTop = lista.scrollHeight;
    avisarDoChat(entrada);
    // A sua rolagem vira aviso só com o chat fora de vista (no registro ou no chat do canto, ela já aparece).
    if (entrada.tipo === 'rolagem' && entrada.autor.meu && !chatFlutua() && !abaVisivel('rolagens')) {
      const r = entrada.rolagem;
      aviso(`${r.rotulo}: ${r.total}${r.critico === 'sucesso' ? ' · sucesso crítico' : r.critico === 'falha' ? ' · falha crítica' : ''}`, r.critico === 'falha' ? 'erro' : 'destaque');
    }
  }
  // O cartão que mudou (o ataque resolvido, o desfeito) troca no lugar; quem não tinha (o alvo), recebe agora.
  function trocarRegistro(entrada) {
    const indice = S.registro.findIndex(item => item.id === entrada.id);
    if (indice >= 0) S.registro[indice] = entrada; else S.registro.push(entrada);
    const li = $(`#registro li[data-id="${CSS.escape(entrada.id)}"]`);
    if (li) { li.outerHTML = htmlEntrada(entrada); if (chatFlutua()) mostrarNoChat(entrada); } else adicionarRegistro(entrada);
    // Quem atacou ou quem foi atacado fica sabendo na hora (com o chat à vista, o cartão do ataque já mostra).
    const a = entrada.ataque;
    if (entrada.tipo === 'ataque' && !entrada.pendente && !entrada.desfeito && a && !chatFlutua() && !abaVisivel('rolagens')) {
      const meus = new Set([...S.tokens.values()].filter(token => token.meu).map(token => token.id));
      const envolvido = entrada.autor.meu || (a.alvos || []).some(alvo => meus.has(alvo.token));
      if (envolvido) {
        const partes = (a.alvos || []).map(alvo => (a.modo === 'supressivo' ? `${alvo.nome}: ${alvo.acertou ? 'Suprimido' : 'resistiu'}` : alvo.acertou ? `${alvo.nome}: −${alvo.dano ? alvo.dano.perda : 0} HP` : `${alvo.nome}: ${alvo.escolha === 'esquivar' ? 'esquivou' : 'errou'}`));
        aviso(`${a.descricao}: ${partes.join(' · ') || (a.errou ? 'errou' : '')}`, 'destaque');
      }
    }
  }
  for (const lista of [$('#registro'), $('#chat-novas')]) {
    lista.addEventListener('click', event => {
      const botao = event.target.closest('[data-desfazer]');
      if (botao && confirm('Desfazer? O HP, o SP, as lesões e a munição voltam como estavam.')) op('ataque.desfazer', { entrada: botao.dataset.desfazer }).catch(() => {});
    });
  }

  // ---------------- Defesa ----------------
  // A pergunta "Ataque!": para o jogador, a do personagem dele; para o mestre, a dos NPCs (a dos jogadores fica no
  // quadro da aba Chat, para responder por eles se demorarem).
  const doJogador = defesa => { const token = S.tokens.get(defesa.alvo); return Boolean(token && token.dono); };
  const numeroBr = valor => String(Math.round(valor * 10) / 10).replace('.', ',');
  function renderDefesas() {
    const fundo = $('#defesa');
    const caixa = $('#defesa-caixa');
    const fila = S.defesas.filter(defesa => !gm() || !doJogador(defesa));
    const atual = fila[0];
    clearInterval(S.relogioDefesa);
    renderDefesasDoMestre();
    if (!atual) { fundo.hidden = true; return; }
    const token = S.tokens.get(atual.alvo);
    const descricao = {
      esquivar: `Esquivar <small>DEX + Evasão + 1d10 · média ${numeroBr(atual.esquivaMedia)}</small>`,
      aguentar: `Aguentar <small>${atual.dv === null || atual.dv === undefined ? 'leva o golpe (ou a área já pegou)' : `o ataque precisa passar da DV ${atual.dv}`}</small>`,
      concentrar: 'Concentração <small>WILL + Concentração + 1d10 contra o ataque</small>'
    };
    caixa.innerHTML = `<h2>Ataque!</h2>
      <p><b>${esc(atual.atacante)}</b> · ${esc(atual.modo)} em <b>${esc(atual.alvoNome)}</b> com ${esc(atual.arma)} (${numeroBr(atual.metros)} m).</p>
      ${atual.total !== undefined ? `<p class="nota">Total do ataque: <b>${atual.total}</b> (só o mestre vê).</p>` : '<p class="nota">Você decide sem ver o total do ataque. Empate é seu.</p>'}
      <div class="opcoes-defesa">${atual.opcoes.map(escolha => `<button class="botao${escolha === atual.opcoes[0] ? '' : ' vazado'}" type="button" data-defesa="${escolha}">${descricao[escolha]}</button>`).join('')}</div>
      <div class="campo-linha">${token && token.sorte && token.sorte.atual ? `<label class="campo mod">Sorte <input id="defesa-sorte" type="number" min="0" max="${token.sorte.atual}" value="0"></label>` : ''}
        <label class="campo mod">Mod <input id="defesa-mod" type="number" min="-30" max="30" value="0"></label><span class="relogio" id="defesa-relogio"></span></div>
      ${fila.length > 1 ? `<p class="nota">Mais ${fila.length - 1} esperando.</p>` : ''}`;
    fundo.hidden = false;
    const relogio = () => {
      const resta = Math.max(0, Math.round((Date.parse(atual.prazo) - Date.now()) / 1000));
      const campo = $('#defesa-relogio');
      if (campo) campo.textContent = `Sem resposta em ${resta} s: ${atual.opcoes.includes('aguentar') ? 'aguenta' : 'rola sozinho'}.`;
    };
    relogio();
    S.relogioDefesa = setInterval(relogio, 500);
  }
  function renderDefesasDoMestre() {
    const caixa = $('#defesas-mestre');
    const lista = gm() ? S.defesas.filter(doJogador) : [];
    caixa.hidden = !lista.length;
    caixa.innerHTML = lista.map(defesa => `<div class="defesa-mestre"><span><b>${esc(defesa.alvoNome)}</b> decide a defesa (${esc(defesa.atacante)}, ${esc(defesa.arma)}, total ${defesa.total})</span>
      ${defesa.opcoes.map(escolha => `<button class="botao vazado pequeno" type="button" data-defesa-por="${esc(defesa.ataque)}|${esc(defesa.alvo)}|${escolha}">${{ esquivar: 'Esquivar', aguentar: 'Aguentar', concentrar: 'Concentrar' }[escolha]} por ele</button>`).join('')}</div>`).join('');
  }
  function responderDefesa(defesa, escolha, extra = {}) {
    op('ataque.defender', { ataque: defesa.ataque, alvo: defesa.alvo, escolha, ...extra }).then(() => {
      S.defesas = S.defesas.filter(item => item !== defesa);
      renderDefesas();
    }).catch(() => {});
  }
  $('#defesa-caixa').addEventListener('click', event => {
    const botao = event.target.closest('[data-defesa]');
    if (!botao) return;
    const fila = S.defesas.filter(defesa => !gm() || !doJogador(defesa));
    if (!fila[0]) return;
    responderDefesa(fila[0], botao.dataset.defesa, { sorte: Number(($('#defesa-sorte') || {}).value) || 0, mod: Number(($('#defesa-mod') || {}).value) || 0 });
  });
  $('#defesas-mestre').addEventListener('click', event => {
    const botao = event.target.closest('[data-defesa-por]');
    if (!botao) return;
    const [ataque, alvo, escolha] = botao.dataset.defesaPor.split('|');
    const defesa = S.defesas.find(item => item.ataque === ataque && item.alvo === alvo);
    if (defesa) responderDefesa(defesa, escolha);
  });

  // ---------------- Combate ----------------
  function renderCombate() {
    const caixa = $('#combate');
    const c = S.combate;
    if (!c) {
      caixa.innerHTML = gm()
        ? `<div class="bloco"><h3>Combate</h3><p class="nota">Iniciativa = REF + 1d10 (RED p. 168), rolada pelo servidor para cada token da cena. Empates rolam de novo.</p>
           <label class="marcar"><input type="checkbox" id="combate-escondidos"> Incluir os tokens escondidos</label>
           <button class="botao" type="button" data-combate="iniciar"${S.cena ? '' : ' disabled'}>Começar combate</button></div>`
        : '<div class="bloco"><h3>Combate</h3><p class="nota">Sem combate agora. Quando o mestre começar, a ordem aparece aqui.</p></div>';
      return;
    }
    const outraCena = gm() && S.cena && c.cena !== S.cena.id;
    const linhas = c.ordem.map(item => {
      const foto = item.imagem ? `style="--cor:${esc(item.cor)};background-image:url('${esc(item.imagem)}')"` : `style="--cor:${esc(item.cor)}"`;
      return `<li class="${item.token === c.vez ? 'na-vez' : ''}${item.escondido ? ' oculto' : ''}" style="--cor:${esc(item.cor)}" data-token="${esc(item.token)}">
        <span class="avatar" ${foto}>${item.imagem ? '' : esc(initials(item.nome))}</span><span class="nome">${esc(item.nome)}${item.meu ? ' <small>(você)</small>' : ''}${item.escondido ? ' <small>(escondido)</small>' : ''}${item.morto ? ' <span class="tag falha">Morto</span>' : item.mortal ? ' <span class="tag falha" title="Mortalmente Ferido">Mortal</span>' : ''}</span>
        ${gm() ? `<input type="number" value="${item.iniciativa}" data-iniciativa aria-label="Iniciativa"><button class="tirar" type="button" data-combate="remover" title="Tirar do combate">×</button>` : `<span class="ini">${item.iniciativa}</span>`}</li>`;
    }).join('');
    caixa.innerHTML = `<div class="combate-topo"><h3>Combate</h3><span class="rodada">Rodada ${c.rodada}</span></div>
      ${outraCena ? '<p class="nota">O combate é de outra cena.</p>' : ''}
      <ol class="ordem">${linhas}</ol>
      ${gm() ? `<div class="combate-acoes"><button class="botao vazado pequeno" type="button" data-combate="anterior">◀ Anterior</button><button class="botao" type="button" data-combate="proximo">Próximo ▶</button><button class="botao vazado pequeno perigo" type="button" data-combate="encerrar">Encerrar</button></div>
        <p class="nota">Mude o número para corrigir uma iniciativa. Token novo: selecione e use "Pôr no combate".</p>` : ''}`;
  }
  $('#combate').addEventListener('click', event => {
    const botao = event.target.closest('[data-combate]');
    if (!botao) {
      const linha = event.target.closest('[data-token]');
      if (linha && S.tokens.has(linha.dataset.token) && !event.target.matches('input')) { selecionar(linha.dataset.token); const t = S.tokens.get(linha.dataset.token); centrarEm({ x: t.x, y: t.y }); }
      return;
    }
    const acao = botao.dataset.combate;
    if (acao === 'iniciar') op('combate.iniciar', { cena: S.cena && S.cena.id, escondidos: $('#combate-escondidos') && $('#combate-escondidos').checked }).catch(() => {});
    if (acao === 'proximo') op('combate.proximo').catch(() => {});
    if (acao === 'anterior') op('combate.anterior').catch(() => {});
    if (acao === 'encerrar' && confirm('Encerrar o combate?')) op('combate.encerrar').catch(() => {});
    if (acao === 'remover') op('combate.remover', { token: botao.closest('[data-token]').dataset.token }).catch(() => {});
  });
  $('#combate').addEventListener('change', event => {
    if (event.target.matches('[data-iniciativa]')) op('combate.iniciativa', { token: event.target.closest('[data-token]').dataset.token, valor: Number(event.target.value) }).catch(() => {});
  });
  function renderVez() {
    const faixa = $('#vez');
    const c = S.combate;
    const atual = c && c.vez && S.cena && c.cena === S.cena.id && c.ordem.find(item => item.token === c.vez);
    if (!atual) { faixa.hidden = true; S.vezAnterior = null; return; }
    faixa.hidden = false;
    faixa.className = `vez${atual.meu ? ' minha' : ''}${c.deathSave ? ' perigo' : ''}`;
    // Mortalmente Ferido no começo da vez: o Death Save (quem controla o token, ou o mestre).
    const precisaDeathSave = c.deathSave === atual.token && (atual.meu || gm());
    faixa.innerHTML = `${esc(atual.meu ? `Sua vez: ${atual.nome}` : `Vez de ${atual.nome}`)} · rodada ${c.rodada}${c.deathSave === atual.token ? ' · Death Save!' : ''}${precisaDeathSave ? ' <button class="botao pequeno perigo" type="button" data-deathsave>Rolar o Death Save</button>' : ''}`;
    const chave = `${c.rodada}:${c.vez}`;
    if (S.vezAnterior !== chave) {
      if (atual.meu && S.vezAnterior !== null) aviso(c.deathSave === atual.token ? `${atual.nome}: Death Save antes de agir!` : `Sua vez, ${atual.nome}!`, 'destaque');
      if (!$('.abas [data-aba="combate"]').classList.contains('ativa') || !barraVisivel()) $('#combate-selo').hidden = false;
      S.vezAnterior = chave;
    }
  }

  $('#vez').addEventListener('click', event => {
    if (event.target.closest('[data-deathsave]') && S.combate && S.combate.deathSave) op('deathsave', { token: S.combate.deathSave }).catch(() => {});
  });

  // ---------------- Fichas (mestre) e Personagem (jogador) ----------------
  function centroDaVista() {
    return encaixar(meioLivre());
  }
  // ---------------- Ficha de jogo ----------------
  // O que muda na mesa e volta para a ficha da wiki: a Humanidade (e o EMP), o dinheiro, os Pontos de Melhoria, a
  // reputação e o inventário com o uso de cada item. O jogador troca o uso do que é dele; o mestre também muda os
  // números (com o motivo, que vai para o extrato) e a quantidade dos itens.
  const NOME_DO_USO = { equipado: 'Equipado', carregando: 'Carregando', guardado: 'Guardado' };
  const GRUPOS_DO_INVENTARIO = [['arma', 'Armas'], ['armadura', 'Armaduras'], ['item', 'Equipamento'], ['deck', 'Cyberdeck'], ['roupa', 'Roupa'], ['municao', 'Munição']];
  const NOME_DO_CAMPO = { dinheiro: 'Dinheiro', ip: 'Pontos de Melhoria', reputacao: 'Reputação', humanidade: 'Humanidade' };
  const eb = valor => `${Math.round(Number(valor) || 0).toLocaleString('pt-BR')}eb`;
  function htmlDosNumeros(ficha) {
    const jogo = ficha.jogo || {};
    const caixas = [
      jogo.humanidade ? ['Humanidade', `${jogo.humanidade.atual}/${jogo.humanidade.max}`, `EMP ${ficha.stats.EMP ?? '—'}`] : null,
      ['Dinheiro', eb(jogo.dinheiro), ''], ['IP', String(jogo.ip ?? 0), 'Pontos de Melhoria'], ['Reputação', String(jogo.reputacao ?? 0), '']
    ].filter(Boolean);
    return `<div class="ficha-numeros">${caixas.map(([rotulo, valor, extra]) => `<div><small>${rotulo}</small><b>${esc(valor)}</b>${extra ? `<small>${esc(extra)}</small>` : ''}</div>`).join('')}</div>
      ${jogo.penalidade ? `<p class="nota alerta">Armadura pesada vestida: −${jogo.penalidade} em REF, DEX e MOVE (já nos números).</p>` : ''}`;
  }
  function htmlDoAjuste(ficha) {
    const jogo = ficha.jogo || {};
    const campos = Object.entries(NOME_DO_CAMPO).filter(([campo]) => campo !== 'humanidade' || jogo.humanidade);
    return `<form class="ajuste" data-ajuste="${esc(ficha.id)}"><div class="campo-linha">
        <label class="campo cresce">Mudar <select name="campo">${campos.map(([campo, nome]) => `<option value="${campo}">${nome}</option>`).join('')}</select></label>
        <label class="campo mod">+ ou − <input name="delta" type="number" step="1" placeholder="0" required></label></div>
      <div class="campo-linha"><label class="campo cresce">Motivo <input name="motivo" type="text" maxlength="200" placeholder="Pagamento do fixer, terapia…"></label>
        <button class="botao pequeno" type="submit">Aplicar</button></div></form>`;
  }
  function htmlDoInventario(ficha) {
    const mestre = gm();
    const itens = (ficha.jogo && ficha.jogo.itens) || [];
    if (!itens.length) return '<p class="nota">Nenhum item na ficha.</p>';
    const linha = item => {
      const detalhe = item.tipo === 'arma' && item.pente ? `pente ${item.pente.atual}/${item.pente.max}${item.municao ? ` · ${item.municao}` : ''}`
        : item.tipo === 'armadura' && item.sp ? [item.sp.cabeca ? `SP ${item.sp.cabeca} na cabeça` : '', item.sp.corpo ? `SP ${item.sp.corpo} no corpo` : ''].filter(Boolean).join(' · ') : '';
      // A quantidade que muda no jogo (a munição gasta, a granada, o kit): o mestre acerta; o resto só mostra.
      const qtd = mestre && ['municao', 'item'].includes(item.tipo) ? `<input class="qtd" type="number" min="0" max="99999" value="${item.qtd}" data-qtd="${esc(item.id)}" data-ficha="${esc(ficha.id)}" aria-label="Quantidade: ${esc(item.nome)}">`
        : item.tipo === 'municao' || item.qtd !== 1 ? `<span class="qtd">×${item.qtd}</span>` : '';
      const uso = item.tipo === 'municao' ? '' : `<select data-uso="${esc(item.id)}" data-ficha="${esc(ficha.id)}" aria-label="Uso: ${esc(item.nome)}">${Object.entries(NOME_DO_USO).map(([valor, nome]) => `<option value="${valor}"${item.uso === valor ? ' selected' : ''}>${nome}</option>`).join('')}</select>`;
      return `<li class="uso-${esc(item.uso || 'municao')}"><span class="info"><b>${esc(item.nome)}</b>${detalhe ? `<small>${esc(detalhe)}</small>` : ''}</span>${qtd}${uso}</li>`;
    };
    return `${GRUPOS_DO_INVENTARIO.map(([tipo, titulo]) => {
      const lista = itens.filter(item => item.tipo === tipo);
      return lista.length ? `<div class="grupo-npc">${titulo}</div><ul class="inventario">${lista.map(linha).join('')}</ul>` : '';
    }).join('')}<p class="nota">A armadura vestida dá o SP. Guardado fica fora da mesa (em casa, no carro): a arma guardada não aparece no ataque.</p>`;
  }
  function htmlDoExtrato(ficha) {
    const extrato = (ficha.jogo && ficha.jogo.extrato) || [];
    if (!extrato.length) return '';
    const valor = (campo, numero) => (campo === 'dinheiro' ? eb(numero) : String(numero));
    const hora = quando => { const data = new Date(quando); return Number.isNaN(data.getTime()) ? '' : data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); };
    return `<details class="extrato"><summary>Últimas mudanças do mestre</summary><ul>${extrato.slice().reverse().map(linha => `<li><b>${esc(NOME_DO_CAMPO[linha.campo] || linha.campo)}</b> ${esc(valor(linha.campo, linha.antes))} → ${esc(valor(linha.campo, linha.depois))}${linha.motivo ? ` · ${esc(linha.motivo)}` : ''} <small>${esc(hora(linha.quando))}</small></li>`).join('')}</ul></details>`;
  }

  function renderFichas() {
    const caixa = $('#fichas');
    if (!S.eu) return;
    // Digitando um ajuste ou uma quantidade: não troca a ficha debaixo de quem digita (redesenha ao sair do campo).
    if (caixa.contains(document.activeElement) && document.activeElement.matches('.ajuste input, .ajuste select, input.qtd')) { S.fichasPendentes = true; return; }
    S.fichasPendentes = false;
    const foco = document.activeElement && caixa.contains(document.activeElement) ? document.activeElement.id : null;
    if (gm()) {
      const naCena = new Set([...S.tokens.values()].map(token => token.personagem).filter(Boolean));
      const filtro = (caixa.querySelector('#npc-busca') || {}).value || '';
      const busca = filtro.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
      const npcs = S.npcs.filter(npc => !busca || `${npc.nome} ${npc.grupo} ${npc.livro}`.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().includes(busca));
      const grupos = [...new Set(npcs.map(npc => npc.grupo))];
      const escondidos = (caixa.querySelector('#npc-escondido') || { checked: true }).checked;
      caixa.innerHTML = `<div class="bloco"><h3>Personagens da campanha</h3>
          ${S.personagens.length ? `<ul class="lista">${S.personagens.map(ficha => {
            const foto = ficha.retrato ? `style="background-image:url('${esc(ficha.retrato)}')"` : '';
            const hp = ficha.hp ? `HP ${ficha.hp.atual}/${ficha.hp.max}` : 'sem HP';
            const aberta = S.fichasAbertas.has(ficha.id);
            return `<li><span class="avatar" ${foto}>${ficha.retrato ? '' : esc(initials(ficha.nome))}</span><span class="info"><b>${esc(ficha.nome)}</b><small>${hp} · REF ${ficha.stats.REF ?? '—'} · MOVE ${ficha.stats.MOVE ?? '—'}${naCena.has(ficha.id) ? ' · na cena' : ''}${ficha.fonte === 'mesa' && !(ficha.jogo && ficha.jogo.mesa) ? ' · ficha do Foundry' : ''}</small></span>
              <button class="botao vazado pequeno${aberta ? ' ativo' : ''}" type="button" data-abrir-ficha="${esc(ficha.id)}" aria-expanded="${aberta}">Ficha</button>
              ${naCena.has(ficha.id) ? '' : `<button class="botao pequeno" type="button" data-por-personagem="${esc(ficha.id)}"${S.cena ? '' : ' disabled'}>Pôr</button>`}</li>
              ${aberta ? `<li class="ficha-aberta">${htmlDosNumeros(ficha)}${htmlDoAjuste(ficha)}${htmlDoInventario(ficha)}${htmlDoExtrato(ficha)}</li>` : ''}`;
          }).join('')}</ul>` : '<p class="nota">Nenhum personagem nesta campanha ainda.</p>'}</div>
        <div class="bloco"><h3>Fichas de NPC</h3>
          <input id="npc-busca" class="busca" type="search" placeholder="Buscar (Tyger, netrunner, Kit…)" value="${esc(filtro)}">
          <label class="marcar"><input id="npc-escondido" type="checkbox"${escondidos ? ' checked' : ''}> Entram escondidos (você revela na hora)</label>
          ${grupos.map(grupo => `<div class="grupo-npc">${esc(grupo)}</div><ul class="lista">${npcs.filter(npc => npc.grupo === grupo).map(npc => `<li><span class="info"><b>${esc(npc.nome)}</b><small>HP ${npc.hp} · REF ${npc.ref} · MOVE ${npc.move}${npc.pagina ? ` · p. ${npc.pagina}` : ''}</small></span><button class="botao pequeno" type="button" data-por-npc="${esc(npc.id)}"${S.cena ? '' : ' disabled'}>Pôr</button></li>`).join('')}</ul>`).join('') || '<p class="nota">Nenhuma ficha encontrada.</p>'}</div>
        <div class="bloco"><h3>Token livre</h3>
          <div class="form-grade"><label class="inteiro">Nome <input id="livre-nome" type="text" maxlength="40" placeholder="Drone, carro, porta…"></label>
          <label>HP <input id="livre-hp" type="number" min="0" max="999" value="0"></label><label>Cor <input id="livre-cor" type="color" value="#a9aeaa"></label></div>
          <button class="botao pequeno" type="button" data-por-livre${S.cena ? '' : ' disabled'}>Pôr na cena</button></div>`;
      if (foco) { const campo = caixa.querySelector(`#${foco}`); if (campo) { campo.focus(); if (campo.setSelectionRange && campo.type === 'search') campo.setSelectionRange(campo.value.length, campo.value.length); } }
      return;
    }
    if (!S.meus.length) { caixa.innerHTML = '<div class="bloco"><h3>Personagem</h3><p class="nota">Você não tem personagem nesta campanha. Crie um na wiki.</p></div>'; return; }
    caixa.innerHTML = S.meus.map(ficha => {
      const token = [...S.tokens.values()].find(item => item.personagem === ficha.id);
      const hp = token && token.hp ? token.hp : ficha.hp;
      const foto = ficha.retrato ? `style="background-image:url('${esc(ficha.retrato)}')"` : '';
      return `<div class="bloco"><div class="cartao-topo"><span class="avatar" ${foto} style="width:52px;height:52px">${ficha.retrato ? '' : esc(initials(ficha.nome))}</span><div><h3>${esc(ficha.nome)}</h3><small>${hp ? `HP ${hp.atual}/${hp.max}` : ''}${token ? ' · na cena' : ' · fora da cena'}</small></div></div>
        <div class="ficha-stats">${['INT', 'REF', 'DEX', 'TECH', 'COOL', 'WILL', 'LUCK', 'MOVE', 'BODY', 'EMP'].map(stat => `<div><b>${ficha.stats[stat] ?? '—'}</b><small>${stat}</small></div>`).join('')}</div>
        ${htmlDosNumeros(ficha)}
        <p class="nota">Toque numa perícia para rolar (STAT + perícia + 1d10).</p>
        <ul class="pericias">${(ficha.pericias || []).map(item => `<li><button type="button" data-pericia="${esc(item.nome)}" data-ficha="${esc(ficha.id)}"><span>${esc(item.pt)}<small>${esc(item.stat)} ${ficha.stats[item.stat] ?? 0} + ${item.nivel}</small></span><b>${item.base}</b></button></li>`).join('')}</ul>
        <h3>Inventário</h3>${htmlDoInventario(ficha)}${htmlDoExtrato(ficha)}</div>`;
    }).join('');
  }
  $('#fichas').addEventListener('click', event => {
    const botao = event.target.closest('button');
    if (!botao) return;
    if (botao.dataset.abrirFicha) {
      const id = botao.dataset.abrirFicha;
      if (S.fichasAbertas.has(id)) S.fichasAbertas.delete(id); else S.fichasAbertas.add(id);
      renderFichas();
      return;
    }
    if (botao.dataset.porPersonagem) op('token.criar', { cena: S.cena.id, personagem: botao.dataset.porPersonagem, ...centroDaVista() }).catch(() => {});
    if (botao.dataset.porNpc) op('token.criar', { cena: S.cena.id, npc: botao.dataset.porNpc, escondido: $('#npc-escondido').checked, ...centroDaVista() }).catch(() => {});
    if (botao.hasAttribute('data-por-livre')) op('token.criar', { cena: S.cena.id, livre: { nome: $('#livre-nome').value, hp: Number($('#livre-hp').value) || 0, cor: $('#livre-cor').value }, ...centroDaVista() }).catch(() => {});
    if (botao.dataset.pericia) {
      const token = [...S.tokens.values()].find(item => item.personagem === botao.dataset.ficha && item.meu);
      op('rolar', { modo: 'teste', ...(token ? { token: token.id } : { personagem: botao.dataset.ficha }), pericia: botao.dataset.pericia, secreta: secreta() }).catch(() => {});
    }
  });
  $('#fichas').addEventListener('input', event => { if (event.target.id === 'npc-busca') renderFichas(); });
  $('#fichas').addEventListener('change', event => {
    const campo = event.target;
    if (campo.dataset.uso) op('item.uso', { personagem: campo.dataset.ficha, item: campo.dataset.uso, uso: campo.value }).catch(() => renderFichas());
    if (campo.dataset.qtd) {
      campo.blur();
      op('item.qtd', { personagem: campo.dataset.ficha, item: campo.dataset.qtd, qtd: Number(campo.value) }).catch(() => renderFichas());
    }
  });
  $('#fichas').addEventListener('submit', event => {
    const form = event.target.closest('form.ajuste');
    if (!form) return;
    event.preventDefault();
    const dados = new FormData(form);
    op('personagem.ajustar', { personagem: form.dataset.ajuste, campo: dados.get('campo'), delta: Number(dados.get('delta')) || 0, motivo: String(dados.get('motivo') || '') })
      .then(() => { if (form.contains(document.activeElement)) document.activeElement.blur(); renderFichas(); }).catch(() => {});
  });
  // Saiu do campo que segurava a ficha: redesenha com o que chegou enquanto digitava.
  $('#fichas').addEventListener('focusout', () => { if (S.fichasPendentes) setTimeout(() => { if (S.fichasPendentes) renderFichas(); }, 0); });

  // ---------------- Áudio ----------------
  // O tocador (mesa-tocador.js) toca o que o servidor manda; aqui ficam o que cada um vê na aba Áudio e o botão de som
  // do topo. O mestre monta as playlists e toca; o navegador do mestre avisa quando a música acaba (audio.fim).
  const CANAIS = ['musica', 'ambiente'];
  const NOME_DO_CANAL = { musica: 'Música', ambiente: 'Ambiente' };
  const tempo = segundos => { const s = Math.max(0, Math.floor(segundos || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const avisosDeSom = new Set();
  const tocador = window.MesaTocador ? window.MesaTocador.criar({
    caixa: $('#tocador'),
    aoTerminar: (canal, alvo) => { if (gm()) op('audio.fim', { canal, faixa: alvo.faixa.id, inicio: alvo.inicio }).catch(() => {}); },
    // Um aviso por música (o erro se repete a cada conferência).
    aoErro: (canal, alvo, texto) => { const marca = `${alvo.faixa.id}@${alvo.inicio}`; if (!avisosDeSom.has(marca)) { avisosDeSom.add(marca); aviso(texto, 'erro'); } },
    aoMudar: () => { renderSom(); atualizarProgresso(); }
  }) : null;
  // O volume de cada canal fica neste aparelho.
  const nivelGuardado = canal => { const valor = Number(store.get(`som:${canal}`)); return store.get(`som:${canal}`) !== null && Number.isFinite(valor) ? Math.min(1, Math.max(0, valor)) : 0.8; };
  if (tocador) for (const canal of CANAIS) tocador.volume(canal, nivelGuardado(canal));
  // O navegador só deixa tocar depois de um clique na página: o primeiro clique (ou tecla) liga o som.
  const liberarSom = () => { if (tocador && tocador.bloqueado) tocador.liberar(); };
  document.addEventListener('pointerdown', liberarSom, true);
  document.addEventListener('keydown', liberarSom, true);

  function receberAudio(data) {
    S.audio = data;
    if (tocador) tocador.aplicar(data);
    renderAudio();
    renderSom();
    if (gm()) renderCenaPainel();
  }
  // O botão do topo: "Ligar o som" quando o navegador segurou; senão, o que toca (abre a aba Áudio).
  function renderSom() {
    const botao = $('#som');
    if (!tocador) { botao.hidden = true; return; }
    const tocando = CANAIS.map(canal => tocador.estado(canal)).filter(estado => estado.alvo);
    const segurado = tocador.bloqueado && tocando.some(estado => !estado.pausado);
    botao.hidden = !tocando.length;
    botao.classList.toggle('bloqueado', segurado);
    const principal = tocando.find(estado => !estado.pausado) || tocando[0];
    botao.textContent = segurado ? '♪ Ligar o som' : principal ? `♪ ${principal.alvo.faixa.nome}${principal.pausado ? ' (pausada)' : ''}` : '';
    botao.title = segurado ? 'O navegador só toca som depois de um clique na página' : 'Áudio: o que toca e o seu volume';
  }
  $('#som').addEventListener('click', () => {
    if (tocador && tocador.bloqueado) { tocador.liberar(); return; }
    abrirAba('audio');
    abrirPainel(true);
  });
  $('#tocador-min').addEventListener('click', () => {
    const minimizado = !$('#tocador').classList.contains('minimizado');
    $('#tocador').classList.toggle('minimizado', minimizado);
    $('#tocador-min').textContent = minimizado ? '▢' : '–';
    $('#tocador-min').title = minimizado ? 'Mostrar o vídeo' : 'Esconder o vídeo (a música continua)';
    store.set('tocador', minimizado ? 'min' : '');
  });
  if (store.get('tocador') === 'min') $('#tocador-min').click();

  // A posição de cada canal anda a cada segundo, sem refazer a aba (o controle que a pessoa arrasta fica onde está).
  let segurando = false;
  let audioPendente = false;
  function atualizarProgresso() {
    if (!tocador) return;
    for (const canal of CANAIS) {
      const barra = $(`#audio-painel [data-ir="${canal}"]`);
      if (!barra) continue;
      const estado = tocador.estado(canal);
      barra.max = String(Math.max(1, Math.round(estado.duracao * 10) / 10));
      if (!(segurando && document.activeElement === barra)) barra.value = String(Math.floor(estado.posicao * 10) / 10);
      const saida = $(`#audio-painel [data-tempo="${canal}"]`);
      if (saida) saida.textContent = `${tempo(estado.posicao)} / ${estado.duracao ? tempo(estado.duracao) : '–:––'}`;
    }
  }
  setInterval(atualizarProgresso, 1000);

  function htmlDoCanal(canal) {
    const alvo = S.audio && S.audio.canais ? S.audio.canais[canal] : null;
    const nivel = tocador ? tocador.estado(canal).nivel : 0.8;
    const pausada = Boolean(alvo && alvo.pausa !== null);
    return `<div class="canal" data-canal="${canal}">
        <div class="canal-topo"><b>${NOME_DO_CANAL[canal]}</b>${alvo ? `<span class="canal-faixa" title="${esc(alvo.faixa.nome)}">${esc(alvo.faixa.nome)}</span><small>${esc(alvo.playlist)}${alvo.faixa.youtube ? ' · YouTube' : ''}${alvo.faixa.repetir ? ' · repete' : ''}${pausada ? ' · pausada' : ''}</small>` : '<small>Nada tocando</small>'}</div>
        ${alvo ? `<div class="canal-barra"><input type="range" min="0" max="1" step="0.1" value="0" data-ir="${canal}" aria-label="Posição da música"${gm() ? '' : ' disabled'}><output data-tempo="${canal}">0:00</output></div>` : ''}
        ${gm() && alvo ? `<div class="combate-acoes"><button class="botao vazado pequeno" type="button" data-audio="${pausada ? 'continuar' : 'pausar'}" data-canal="${canal}">${pausada ? '▶ Continuar' : '❚❚ Pausar'}</button><button class="botao vazado pequeno" type="button" data-audio="proxima" data-canal="${canal}"${alvo.fila ? '' : ' title="É a última da fila: para depois dela"'}>⏭ Próxima</button><button class="botao vazado pequeno perigo" type="button" data-audio="parar" data-canal="${canal}">■ Parar</button></div>` : ''}
        <label class="campo">Seu volume <span class="faixa"><input type="range" min="0" max="1" step="0.01" value="${nivel}" data-volume="${canal}"><output>${Math.round(nivel * 100)}%</output></span></label>
      </div>`;
  }
  function htmlDaFaixa(playlist, faixa, tocando) {
    const aberta = S.faixaAberta === faixa.id;
    const outras = ((S.audio && S.audio.playlists) || []).filter(item => item.id !== playlist.id);
    return `<li class="${tocando.has(faixa.id) ? 'tocando' : ''}${aberta ? ' aberta' : ''}">
        <div class="musica-linha"><button class="musica-tocar" type="button" data-tocar-faixa="${esc(faixa.id)}" title="Tocar para todos" aria-label="Tocar ${esc(faixa.nome)}">▶</button>
        <span class="musica-nome" title="${esc(faixa.nome)}">${esc(faixa.nome)}</span><small>${faixa.youtube ? 'YouTube' : 'arquivo'}${faixa.repetir ? ' · ⟲' : ''}</small>
        <button class="musica-mais" type="button" data-faixa-abrir="${esc(faixa.id)}" aria-expanded="${aberta}" title="Volume, repetir, mover e apagar">⋯</button></div>
        ${aberta ? `<div class="musica-opcoes">
          <label class="campo">Volume da música (para todos) <span class="faixa"><input type="range" min="0" max="1" step="0.01" value="${faixa.volume}" data-faixa-volume="${esc(faixa.id)}"><output>${Math.round(faixa.volume * 100)}%</output></span></label>
          <label class="marcar"><input type="checkbox" data-faixa-repetir="${esc(faixa.id)}"${faixa.repetir ? ' checked' : ''}> Repetir esta música (ambiente, tema)</label>
          <div class="combate-acoes"><button class="botao vazado pequeno" type="button" data-faixa-mover="cima" data-faixa="${esc(faixa.id)}" title="Para cima">↑</button><button class="botao vazado pequeno" type="button" data-faixa-mover="baixo" data-faixa="${esc(faixa.id)}" title="Para baixo">↓</button>
          ${outras.length ? `<select data-faixa-playlist="${esc(faixa.id)}" aria-label="Mover para outra playlist"><option value="">Mover para…</option>${outras.map(item => `<option value="${esc(item.id)}">${esc(item.nome)}</option>`).join('')}</select>` : ''}
          <button class="link" type="button" data-faixa-renomear="${esc(faixa.id)}">renomear</button><button class="link perigo" type="button" data-faixa-apagar="${esc(faixa.id)}">apagar</button></div>
        </div>` : ''}
      </li>`;
  }
  function htmlDasPlaylists() {
    const playlists = (S.audio && S.audio.playlists) || [];
    const tocando = new Set(CANAIS.map(canal => S.audio && S.audio.canais && S.audio.canais[canal] && S.audio.canais[canal].faixa.id).filter(Boolean));
    const opcao = (valor, atual, texto) => `<option value="${valor}"${valor === atual ? ' selected' : ''}>${texto}</option>`;
    return `<div class="bloco"><h3>Playlists</h3>
      ${playlists.length ? playlists.map(playlist => `<details class="playlist" data-playlist="${esc(playlist.id)}"${S.playlistsAbertas.has(playlist.id) ? ' open' : ''}>
        <summary><span class="info"><b>${esc(playlist.nome)}</b><small>${NOME_DO_CANAL[playlist.canal]} · ${playlist.modo === 'aleatorio' ? 'aleatória' : 'em ordem'}${playlist.repetir ? ' · repete' : ''} · ${playlist.faixas.length} ${playlist.faixas.length === 1 ? 'música' : 'músicas'}</small></span>
          <button class="botao pequeno" type="button" data-tocar-playlist="${esc(playlist.id)}" title="Tocar a playlist para todos"${playlist.faixas.length ? '' : ' disabled'}>▶</button></summary>
        <ol class="musicas">${playlist.faixas.map(faixa => htmlDaFaixa(playlist, faixa, tocando)).join('')}</ol>
        <div class="campo-linha"><input type="text" class="cresce" data-yt-link="${esc(playlist.id)}" placeholder="Link do YouTube (vídeo ou playlist)" aria-label="Link do YouTube"><button class="botao vazado pequeno" type="button" data-yt-adicionar="${esc(playlist.id)}">Adicionar</button></div>
        <label class="botao vazado pequeno arquivo">Enviar música (MP3, OGG, M4A, WAV ou FLAC) <input type="file" accept="audio/*,.mp3,.ogg,.opus,.m4a,.wav,.flac" multiple data-enviar-audio="${esc(playlist.id)}"></label>
        <div class="form-grade">
          <label>Canal <select data-playlist-canal="${esc(playlist.id)}">${opcao('musica', playlist.canal, 'Música')}${opcao('ambiente', playlist.canal, 'Ambiente')}</select></label>
          <label>Ordem <select data-playlist-modo="${esc(playlist.id)}">${opcao('sequencia', playlist.modo, 'Em ordem')}${opcao('aleatorio', playlist.modo, 'Aleatória')}</select></label>
          <label class="marcar inteiro"><input type="checkbox" data-playlist-repetir="${esc(playlist.id)}"${playlist.repetir ? ' checked' : ''}> No fim, começar de novo</label>
        </div>
        <div class="combate-acoes"><button class="link" type="button" data-playlist-renomear="${esc(playlist.id)}">renomear</button><button class="link perigo" type="button" data-playlist-apagar="${esc(playlist.id)}">apagar a playlist</button></div>
      </details>`).join('') : '<p class="nota">Nenhuma playlist ainda. As do Foundry e a biblioteca do yt-jukebox vêm pelo importador.</p>'}
      <div class="campo-linha"><input id="nova-playlist" class="cresce" type="text" maxlength="60" placeholder="Nova playlist" aria-label="Nome da playlist nova"><select id="nova-playlist-canal" aria-label="Canal"><option value="musica">Música</option><option value="ambiente">Ambiente</option></select><button class="botao pequeno" type="button" data-nova-playlist>Criar</button></div>
      <p class="nota">Cada playlist toca no canal dela: a música e o ambiente tocam juntos. Tocar outra música no mesmo canal troca a que tocava.</p>
    </div>`;
  }
  function renderAudio() {
    const caixa = $('#audio-painel');
    // Arrastando um controle: refaz quando soltar.
    if (segurando) { audioPendente = true; return; }
    audioPendente = false;
    // O que o mestre está digitando (o link, o nome da playlist nova) continua lá depois de refazer.
    const digitado = $$('input[type=text]', caixa).map(campo => [campo.dataset.ytLink ? `[data-yt-link="${campo.dataset.ytLink}"]` : `#${campo.id}`, campo.value, campo === document.activeElement]);
    const segurado = tocador && tocador.bloqueado && CANAIS.some(canal => { const estado = tocador.estado(canal); return estado.alvo && !estado.pausado; });
    caixa.innerHTML = `<div class="bloco"><h3>Tocando agora</h3>
        ${segurado ? '<button class="botao pequeno" type="button" data-ligar-som>♪ Ligar o som</button><p class="nota">O navegador só toca som depois de um clique na página.</p>' : ''}
        ${CANAIS.map(htmlDoCanal).join('')}
        <p class="nota">O seu volume fica só neste aparelho.${gm() ? ' A música avança sozinha pela sua página: deixe a mesa aberta enquanto toca.' : ''}</p></div>
      ${gm() ? htmlDasPlaylists() : ''}`;
    for (const [seletor, valor, focado] of digitado) {
      const campo = caixa.querySelector(seletor);
      if (!campo) continue;
      campo.value = valor;
      if (focado) campo.focus();
    }
    atualizarProgresso();
  }
  const soltar = () => { if (!segurando) return; segurando = false; if (audioPendente) renderAudio(); };
  $('#audio-painel').addEventListener('pointerdown', event => { if (event.target.matches('input[type=range]')) segurando = true; });
  window.addEventListener('pointerup', () => setTimeout(soltar, 0));
  window.addEventListener('pointercancel', soltar);
  $('#audio-painel').addEventListener('toggle', event => {
    const detalhe = event.target.closest('details[data-playlist]');
    if (!detalhe) return;
    if (detalhe.open) S.playlistsAbertas.add(detalhe.dataset.playlist); else S.playlistsAbertas.delete(detalhe.dataset.playlist);
  }, true);
  $('#audio-painel').addEventListener('input', event => {
    const alvo = event.target;
    if (alvo.dataset.volume && tocador) {
      tocador.volume(alvo.dataset.volume, Number(alvo.value));
      store.set(`som:${alvo.dataset.volume}`, alvo.value);
    }
    if (alvo.matches('.faixa input[type=range]')) alvo.nextElementSibling.textContent = `${Math.round(Number(alvo.value) * 100)}%`;
    if (alvo.dataset.ir) { const saida = $(`#audio-painel [data-tempo="${alvo.dataset.ir}"]`); if (saida) saida.textContent = `${tempo(Number(alvo.value))} / ${tempo(Number(alvo.max))}`; }
  });
  $('#audio-painel').addEventListener('change', event => {
    const alvo = event.target;
    if (alvo.dataset.ir) op('audio.ir', { canal: alvo.dataset.ir, posicao: Number(alvo.value) }).catch(() => {});
    if (alvo.dataset.faixaVolume) op('audio.faixa.editar', { faixa: alvo.dataset.faixaVolume, volume: Number(alvo.value) }).catch(() => {});
    if (alvo.dataset.faixaRepetir) op('audio.faixa.editar', { faixa: alvo.dataset.faixaRepetir, repetir: alvo.checked }).catch(() => {});
    if (alvo.dataset.faixaPlaylist && alvo.value) op('audio.faixa.editar', { faixa: alvo.dataset.faixaPlaylist, playlist: alvo.value }).then(() => { S.playlistsAbertas.add(alvo.value); }).catch(() => {});
    if (alvo.dataset.playlistCanal) op('audio.playlist.editar', { playlist: alvo.dataset.playlistCanal, canal: alvo.value }).catch(() => {});
    if (alvo.dataset.playlistModo) op('audio.playlist.editar', { playlist: alvo.dataset.playlistModo, modo: alvo.value }).catch(() => {});
    if (alvo.dataset.playlistRepetir) op('audio.playlist.editar', { playlist: alvo.dataset.playlistRepetir, repetir: alvo.checked }).catch(() => {});
    if (alvo.dataset.enviarAudio && alvo.files.length) enviarMusicas(alvo.dataset.enviarAudio, [...alvo.files]);
  });
  $('#audio-painel').addEventListener('keydown', event => {
    if (event.key !== 'Enter') return;
    if (event.target.dataset.ytLink) { event.preventDefault(); adicionarYoutube(event.target.dataset.ytLink, event.target); }
    if (event.target.id === 'nova-playlist') { event.preventDefault(); criarPlaylist(); }
  });
  $('#audio-painel').addEventListener('click', event => {
    const botao = event.target.closest('button');
    if (!botao) return;
    // O botão de tocar fica dentro do summary: tocar não abre nem fecha a playlist.
    if (botao.closest('summary')) event.preventDefault();
    const d = botao.dataset;
    if (botao.hasAttribute('data-ligar-som') && tocador) tocador.liberar();
    if (d.audio) op(`audio.${d.audio}`, { canal: d.canal }).catch(() => {});
    if (d.tocarFaixa) op('audio.tocar', { faixa: d.tocarFaixa }).catch(() => {});
    if (d.tocarPlaylist) op('audio.tocar', { playlist: d.tocarPlaylist }).catch(() => {});
    if (d.faixaAbrir) { S.faixaAberta = S.faixaAberta === d.faixaAbrir ? null : d.faixaAbrir; renderAudio(); }
    if (d.faixaMover) op('audio.faixa.editar', { faixa: d.faixa, mover: d.faixaMover }).catch(() => {});
    if (d.faixaRenomear) {
      const faixa = ((S.audio && S.audio.playlists) || []).flatMap(item => item.faixas).find(item => item.id === d.faixaRenomear);
      const nome = faixa && prompt('Nome da música:', faixa.nome);
      if (nome && nome.trim()) op('audio.faixa.editar', { faixa: faixa.id, nome: nome.trim() }).catch(() => {});
    }
    if (d.faixaApagar) {
      const faixa = ((S.audio && S.audio.playlists) || []).flatMap(item => item.faixas).find(item => item.id === d.faixaApagar);
      if (faixa && confirm(`Tirar "${faixa.nome}" da playlist?`)) op('audio.faixa.apagar', { faixa: faixa.id }).catch(() => {});
    }
    if (d.playlistRenomear) {
      const playlist = S.audio.playlists.find(item => item.id === d.playlistRenomear);
      const nome = playlist && prompt('Nome da playlist:', playlist.nome);
      if (nome && nome.trim()) op('audio.playlist.editar', { playlist: playlist.id, nome: nome.trim() }).catch(() => {});
    }
    if (d.playlistApagar) {
      const playlist = S.audio.playlists.find(item => item.id === d.playlistApagar);
      if (playlist && confirm(`Apagar a playlist "${playlist.nome}" e as ${playlist.faixas.length} músicas dela?`)) op('audio.playlist.apagar', { playlist: playlist.id }).catch(() => {});
    }
    if (d.ytAdicionar) adicionarYoutube(d.ytAdicionar, $(`#audio-painel [data-yt-link="${d.ytAdicionar}"]`));
    if (botao.hasAttribute('data-nova-playlist')) criarPlaylist();
  });
  async function criarPlaylist() {
    const campo = $('#nova-playlist');
    const nome = campo.value.trim();
    if (!nome) { campo.focus(); return; }
    try {
      const { resultado } = await op('audio.playlist.criar', { nome, canal: $('#nova-playlist-canal').value });
      campo.value = '';
      S.playlistsAbertas.add(resultado.playlist);
      renderAudio();
    } catch { /* o aviso já saiu */ }
  }
  // O link de um vídeo vira uma música; o de uma playlist (list=), todas as músicas dela (o navegador abre a playlist
  // num player escondido). O título vem do servidor, um pouco depois.
  async function adicionarYoutube(playlistId, campo) {
    const texto = (campo && campo.value.trim()) || '';
    if (!texto) { if (campo) campo.focus(); return; }
    const lista = (texto.match(/[?&]list=([A-Za-z0-9_-]+)/) || [])[1];
    const video = (texto.match(/[?&]v=([A-Za-z0-9_-]{11})/) || [])[1] || '';
    try {
      if (lista && (!video || confirm('Esse link é de um vídeo dentro de uma playlist. Adicionar a playlist inteira? (Cancelar adiciona só o vídeo.)'))) {
        aviso('Abrindo a playlist no YouTube…');
        const ids = await window.MesaTocador.videosDaPlaylist(lista, video).catch(error => { aviso(error.message, 'erro'); throw error; });
        await op('audio.faixa.criar', { playlist: playlistId, faixas: ids.map(id => ({ youtube: id })) });
        aviso(`${ids.length} ${ids.length === 1 ? 'música adicionada' : 'músicas adicionadas'}. Os títulos chegam aos poucos.`);
      } else {
        await op('audio.faixa.criar', { playlist: playlistId, youtube: texto });
      }
      if (campo) campo.value = '';
      S.playlistsAbertas.add(playlistId);
    } catch { /* o aviso já saiu */ }
  }
  // O tipo pela extensão (o navegador diz "video/ogg" para .ogg, ou nada para .opus e .flac); o servidor confere o
  // começo do arquivo.
  const TIPO_DO_AUDIO = { mp3: 'audio/mpeg', ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg', m4a: 'audio/mp4', wav: 'audio/wav', flac: 'audio/flac', webm: 'audio/webm' };
  async function enviarMusicas(playlistId, arquivos) {
    for (const arquivo of arquivos) {
      const tipo = TIPO_DO_AUDIO[arquivo.name.split('.').pop().toLowerCase()] || arquivo.type;
      aviso(`Enviando ${arquivo.name}…`);
      try {
        const response = await fetch(comCampanha('/api/mesa/midia'), { method: 'POST', headers: { 'Content-Type': tipo }, body: arquivo });
        const resposta = await response.json().catch(() => ({}));
        if (!response.ok) { aviso(`${arquivo.name}: ${resposta.erro || 'não subiu.'}`, 'erro'); continue; }
        await op('audio.faixa.criar', { playlist: playlistId, midia: resposta.midia, nome: arquivo.name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim() });
        S.playlistsAbertas.add(playlistId);
      } catch { /* o aviso já saiu */ }
    }
  }

  // ---------------- Cena (mestre) ----------------
  // A música da cena: nenhuma, uma playlist inteira ou uma música dela ("playlist|faixa").
  function htmlDaMusicaDaCena(musica) {
    const atual = musica ? `${musica.playlist}|${musica.faixa || ''}` : '';
    const opcao = (valor, texto) => `<option value="${esc(valor)}"${valor === atual ? ' selected' : ''}>${esc(texto)}</option>`;
    return opcao('', 'Nenhuma') + ((S.audio && S.audio.playlists) || []).map(playlist => `<optgroup label="${esc(playlist.nome)}">${opcao(`${playlist.id}|`, `${playlist.nome}: a playlist inteira`)}${playlist.faixas.map(faixa => opcao(`${playlist.id}|${faixa.id}`, faixa.nome)).join('')}</optgroup>`).join('');
  }
  function renderCenaPainel() {
    const caixa = $('#cena-painel');
    if (!gm()) { caixa.innerHTML = ''; return; }
    if (caixa.contains(document.activeElement) && document.activeElement.matches('input, select, textarea')) return; // não apaga o que o mestre está digitando
    const cena = S.cena;
    const g = cena ? cena.grade : null;
    caixa.innerHTML = `<div class="bloco"><h3>Cenas</h3>
        ${S.cenas.length ? `<ul class="lista">${S.cenas.map(item => `<li class="${item.ativa ? 'ativa' : ''}"><span class="info"><b>${esc(item.nome)}</b><small>${item.ativa ? 'Aberta para os jogadores' : 'Escondida'} · ${item.tokens} ${item.tokens === 1 ? 'token' : 'tokens'}${cena && cena.id === item.id ? ' · você está vendo' : ''}</small></span>
          ${cena && cena.id === item.id ? '' : `<button class="botao vazado pequeno" type="button" data-cena-ver="${esc(item.id)}">Ver</button>`}
          ${item.ativa ? '' : `<button class="botao pequeno" type="button" data-cena-ativar="${esc(item.id)}">Abrir</button>`}
          <button class="link" type="button" data-cena-apagar="${esc(item.id)}">apagar</button></li>`).join('')}</ul>` : '<p class="nota">Nenhuma cena ainda.</p>'}</div>
      <div class="bloco"><h3>Nova cena</h3>
        <div class="form-grade"><label class="inteiro">Nome <input id="nova-nome" type="text" maxlength="60" placeholder="Beco atrás do clube"></label>
        <label class="inteiro">Mapa (imagem PNG, JPEG ou WebP, ou vídeo WebM ou MP4) <input id="nova-mapa" type="file" accept="image/png,image/jpeg,image/webp,video/webm,video/mp4"></label>
        <label>Grade (px) <input id="nova-grade" type="number" min="30" max="400" value="100"></label><label>Metros/quadrado <input id="nova-metros" type="number" min="0.5" max="100" step="0.5" value="2"></label>
        <label>Sem mapa: largura <input id="nova-largura" type="number" min="5" max="160" value="30" title="Em quadrados"></label><label>altura <input id="nova-altura" type="number" min="5" max="160" value="20" title="Em quadrados"></label></div>
        <p class="nota">Com mapa, a cena fica do tamanho da imagem; ajuste a grade depois, olhando o mapa. Sem mapa, a largura e a altura são em quadrados.</p>
        <button class="botao pequeno" type="button" data-nova-cena>Criar cena</button></div>
      ${cena ? `<div class="bloco"><h3>Esta cena</h3>
        ${cena.origem ? `<p class="nota">Importada do Foundry (mundo ${esc(cena.origem.mundo)}).</p>` : ''}
        <div class="form-grade"><label class="inteiro">Nome <input id="cena-nome-campo" type="text" maxlength="60" value="${esc(cena.nome)}"></label>
        <label>Grade <select id="grade-tipo"><option value="quadrada"${g.tipo !== 'nenhuma' ? ' selected' : ''}>Quadrada</option><option value="nenhuma"${g.tipo === 'nenhuma' ? ' selected' : ''}>Sem grade</option></select></label>
        <label>Unidade <input id="grade-unidade" type="text" maxlength="8" value="${esc(g.unidade || 'm')}"></label>
        <label>Grade (px) <input id="grade-tamanho" type="number" min="30" max="400" value="${g.tamanho}"></label><label>Vale (por quadrado) <input id="grade-metros" type="number" min="0.1" max="1000" step="0.5" value="${g.metros}"></label>
        <label>Margem (quadrados) <input id="cena-margem" type="number" min="0" max="40" value="${Math.round(((cena.margem && cena.margem.x) || 0) / g.tamanho)}" data-antes="${Math.round(((cena.margem && cena.margem.x) || 0) / g.tamanho)}" title="Em volta do mapa: o token pode esperar ali, fora do mapa"></label>
        <label>Deslocar X <input id="grade-x" type="number" min="0" max="399" value="${g.x}"></label><label>Deslocar Y <input id="grade-y" type="number" min="0" max="399" value="${g.y}"></label>
        <label class="marcar inteiro"><input id="grade-visivel" type="checkbox"${g.visivel ? ' checked' : ''}> Mostrar a grade</label></div>
        <p class="nota">A grade fica amarela enquanto você ajusta; ninguém mais vê até salvar.</p>
        <div class="combate-acoes"><button class="botao pequeno" type="button" data-salvar-cena>Salvar</button><button class="botao vazado pequeno" type="button" data-desfazer-grade>Desfazer</button></div></div>
      <div class="bloco"><h3>Névoa</h3>
        <label class="marcar"><input id="nevoa-ligada" type="checkbox"${cena.nevoa.ativa ? ' checked' : ''}> Névoa ligada nesta cena</label>
        <p class="nota">Com névoa, o jogador só recebe os tokens das áreas reveladas (o servidor nem manda os outros). Pinte com a ferramenta Névoa (N).</p>
        <div class="combate-acoes"><button class="botao vazado pequeno" type="button" data-nevoa="tudo"${cena.nevoa.ativa ? '' : ' disabled'}>Revelar tudo</button><button class="botao vazado pequeno" type="button" data-nevoa="limpar"${cena.nevoa.ativa ? '' : ' disabled'}>Cobrir tudo</button></div></div>
      <div class="bloco"><h3>Música da cena</h3>
        <label class="campo">Toca quando a cena abre <select id="cena-musica">${htmlDaMusicaDaCena(cena.musica)}</select></label>
        <p class="nota">Como a playlist da cena no Foundry. Se ela já está tocando, continua de onde está.</p></div>
      <div class="bloco"><h3>Luz</h3>
        <label class="marcar"><input id="luz-global" type="checkbox"${luzDaCena().global ? ' checked' : ''}> Luz global: a cena toda clara</label>
        <label class="campo">Escuridão <span class="faixa"><input id="luz-escuridao" type="range" min="0" max="1" step="0.05" value="${luzDaCena().escuridao || 0}"><output id="luz-escuridao-valor">${Math.round((luzDaCena().escuridao || 0) * 100)}%</output></span></label>
        <p class="nota">Sem a luz global, cada token vê o alcance dele (30 m, se você não mudar no cartão) e o que as luzes iluminam. ${contarLuzes(cena.luzes || [])}. A escuridão escurece a tela de todos, e as luzes abrem clareiras.</p>
        <div class="combate-acoes"><button class="botao vazado pequeno" type="button" data-ferramenta-luzes>Pôr luzes (L)</button></div></div>
      <div class="bloco"><h3>Visão e paredes</h3>
        <label class="marcar"><input id="visao-ligada" type="checkbox"${cena.visao ? ' checked' : ''}> Visão pelas paredes</label>
        <p class="nota">${contarParedes(cena.paredes || [])}. Com a visão ligada, cada jogador vê só o que os tokens dele veem, e o servidor nem manda os outros tokens. O que ele já viu fica na penumbra. Parede e porta fechada param o token do jogador, com a visão ligada ou não.</p>
        <div class="combate-acoes"><button class="botao vazado pequeno" type="button" data-ferramenta-paredes>Desenhar paredes (W)</button><button class="botao vazado pequeno" type="button" data-visao-esquecer${cena.visao ? '' : ' disabled'}>Esquecer o explorado</button></div></div>` : ''}
      <div class="bloco"><h3>Você</h3><label class="marcar"><input id="mostrar-cursor" type="checkbox"${S.mostrarCursor ? ' checked' : ''}> Mostrar meu cursor e minha régua aos jogadores</label></div>`;
  }
  function contarLuzes(luzes) {
    const doCenario = luzes.filter(luz => luz.id).length;
    const dosTokens = luzes.length - doCenario;
    if (!luzes.length) return 'Nenhuma luz ainda';
    return [doCenario ? `${doCenario} ${doCenario === 1 ? 'luz' : 'luzes'} no cenário` : '', dosTokens ? `${dosTokens} ${dosTokens === 1 ? 'token com luz' : 'tokens com luz'}` : ''].filter(Boolean).join(' e ');
  }
  function contarParedes(paredes) {
    if (!paredes.length) return 'Nenhuma parede ainda';
    const portas = paredes.filter(parede => parede.porta).length;
    const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
    return `${plural(paredes.length - portas, 'parede', 'paredes')} e ${plural(portas, 'porta', 'portas')}`;
  }
  function gradeDoFormulario() {
    const tipo = $('#grade-tipo').value;
    return { tipo, unidade: $('#grade-unidade').value.trim() || 'm', tamanho: Number($('#grade-tamanho').value) || 100, metros: Number($('#grade-metros').value) || 2, x: Number($('#grade-x').value) || 0, y: Number($('#grade-y').value) || 0, visivel: tipo !== 'nenhuma' && $('#grade-visivel').checked };
  }
  $('#cena-painel').addEventListener('input', event => {
    if (event.target.id && event.target.id.startsWith('grade-') && S.cena) { S.previaGrade = gradeDoFormulario(); redesenhar(); }
    if (event.target.id === 'luz-escuridao') $('#luz-escuridao-valor').textContent = `${Math.round(Number(event.target.value) * 100)}%`;
  });
  $('#cena-painel').addEventListener('change', event => {
    const id = event.target.id;
    if (id === 'nevoa-ligada' && S.cena) op('nevoa.ligar', { cena: S.cena.id, ativa: event.target.checked }).catch(() => {});
    if (id === 'visao-ligada' && S.cena) op('cena.editar', { cena: S.cena.id, visao: event.target.checked }).catch(() => {});
    if (id === 'luz-global' && S.cena) op('cena.editar', { cena: S.cena.id, luz: { global: event.target.checked } }).catch(() => {});
    if (id === 'cena-musica' && S.cena) {
      const [playlist, faixa] = event.target.value.split('|');
      op('cena.editar', { cena: S.cena.id, musica: playlist ? { playlist, faixa: faixa || null } : null }).catch(() => {});
      event.target.blur();
    }
    if (id === 'luz-escuridao' && S.cena) { op('cena.editar', { cena: S.cena.id, luz: { escuridao: Number(event.target.value) } }).catch(() => {}); event.target.blur(); }
    if (id === 'mostrar-cursor') {
      S.mostrarCursor = event.target.checked;
      store.set('cursor', S.mostrarCursor ? 'sim' : 'nao');
      if (!S.mostrarCursor) atividade({ cursor: null, regua: null }, true);
    }
  });
  $('#cena-painel').addEventListener('click', async event => {
    const botao = event.target.closest('button');
    if (!botao) return;
    if (botao.dataset.cenaVer) op('cena.ver', { cena: botao.dataset.cenaVer === S.cenaAtiva ? null : botao.dataset.cenaVer }).catch(() => {});
    if (botao.dataset.cenaAtivar) op('cena.ativar', { cena: botao.dataset.cenaAtivar }).then(() => op('cena.ver', { cena: null })).catch(() => {});
    if (botao.dataset.cenaApagar) { const item = S.cenas.find(cena => cena.id === botao.dataset.cenaApagar); if (item && confirm(`Apagar a cena "${item.nome}" e os tokens dela?`)) op('cena.apagar', { cena: item.id }).catch(() => {}); }
    if (botao.dataset.nevoa && S.cena && confirm(botao.dataset.nevoa === 'tudo' ? 'Revelar a cena inteira?' : 'Cobrir a cena inteira de névoa?')) op(`nevoa.${botao.dataset.nevoa}`, { cena: S.cena.id }).catch(() => {});
    if (botao.hasAttribute('data-ferramenta-paredes')) escolherFerramenta('paredes');
    if (botao.hasAttribute('data-ferramenta-luzes')) escolherFerramenta('luzes');
    if (botao.hasAttribute('data-visao-esquecer') && S.cena && confirm('Todos os jogadores esquecem o que já viram nesta cena?')) op('visao.esquecer', { cena: S.cena.id }).catch(() => {});
    if (botao.hasAttribute('data-desfazer-grade')) { S.previaGrade = null; document.activeElement.blur(); renderCenaPainel(); redesenhar(); }
    if (botao.hasAttribute('data-salvar-cena') && S.cena) {
      const grade = gradeDoFormulario();
      // A margem só vai se mudou (a do Foundry pode ser diferente na largura e na altura).
      const campoMargem = $('#cena-margem');
      const margemNova = campoMargem.value !== campoMargem.dataset.antes ? { margem: { x: Number(campoMargem.value) * grade.tamanho, y: Number(campoMargem.value) * grade.tamanho } } : {};
      await op('cena.editar', { cena: S.cena.id, nome: $('#cena-nome-campo').value, grade, ...margemNova }).catch(() => {});
      S.previaGrade = null;
      document.activeElement.blur();
      redesenhar();
    }
    if (botao.hasAttribute('data-nova-cena')) criarCena(botao);
  });
  async function criarCena(botao) {
    const nome = $('#nova-nome').value.trim() || 'Cena nova';
    const arquivo = $('#nova-mapa').files[0];
    const grade = { tamanho: Number($('#nova-grade').value) || 100, metros: Number($('#nova-metros').value) || 2 };
    botao.disabled = true;
    try {
      let dados = { nome, grade, largura: (Number($('#nova-largura').value) || 30) * grade.tamanho, altura: (Number($('#nova-altura').value) || 20) * grade.tamanho };
      if (arquivo) {
        botao.textContent = 'Enviando o mapa…';
        // A cena fica do tamanho do mapa: a imagem pela largura natural, o vídeo pelo tamanho do quadro.
        const { midia: imagem, largura, altura } = await enviarMidia(arquivo);
        dados = { nome, grade, imagem, largura, altura };
      }
      const { resultado } = await op('cena.criar', dados);
      aviso(`Cena "${nome}" criada.`);
      if (resultado && resultado.cena && S.cena && resultado.cena !== S.cena.id) op('cena.ver', { cena: resultado.cena === S.cenaAtiva ? null : resultado.cena }).catch(() => {});
    } catch (error) {
      if (error.message && !/^\d+$/.test(error.message)) aviso(error.message, 'erro');
    } finally {
      botao.disabled = false;
      botao.textContent = 'Criar cena';
      document.activeElement.blur();
      renderCenaPainel();
    }
  }

  // ---------------- Entrar ----------------
  function mostrarEntrar() {
    $('#entrar').hidden = false;
    $('#entrar-codigo').focus();
    const teste = $('#entrar-teste');
    if (config.teste && config.contas && config.contas.length) {
      teste.hidden = false;
      teste.innerHTML = `<p>Teste: entrar com um clique</p>${config.contas.map(conta => `<button class="botao vazado pequeno" type="button" data-codigo="${esc(conta.codigo)}">${esc(conta.nome)} · ${esc(conta.personagem)}</button>`).join('')}${gm() ? '<button class="link" type="button" data-fechar-entrar>Continuar como mestre</button>' : ''}`;
    }
  }
  async function entrar(codigo) {
    const response = await fetch('/api/entrar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { const erro = $('#entrar-erro'); erro.hidden = false; erro.textContent = data.erro || 'Não deu para entrar.'; return; }
    location.reload();
  }
  $('#atualizada-recarregar').addEventListener('click', () => location.reload());
  $('#entrar-form').addEventListener('submit', event => { event.preventDefault(); entrar($('#entrar-codigo').value.trim()); });
  $('#entrar-teste').addEventListener('click', event => {
    const botao = event.target.closest('button');
    if (!botao) return;
    if (botao.dataset.codigo) entrar(botao.dataset.codigo);
    if (botao.hasAttribute('data-fechar-entrar')) $('#entrar').hidden = true;
  });

  // ---------------- Começo ----------------
  async function iniciar() {
    let eu;
    try { eu = await (await fetch('/api/eu', { cache: 'no-store' })).json(); } catch { aviso('Sem conexão com a wiki.', 'erro'); setTimeout(iniciar, 4000); return; }
    if (eu.papel === 'visitante') { document.body.classList.add('jogador'); mostrarEntrar(); $('#ligacao').textContent = 'fora da mesa'; return; }
    S.campanhas = eu.campanhas || [];
    const pedida = new URLSearchParams(location.search).get('campanha') || store.get('campanha');
    S.campanha = (S.campanhas.find(item => item.id === pedida) || S.campanhas[0] || {}).id || '';
    if (!S.campanha) { aviso('Você não joga em nenhuma campanha.', 'erro'); return; }
    conectar();
  }

  new ResizeObserver(medirTela).observe(canvas);
  medirTela();
  barraAberta(store.get('barra') !== 'recolhida', { lembrar: false });
  abrirAba(store.get('aba') && document.querySelector(`.abas [data-aba="${store.get('aba')}"]`) ? store.get('aba') : 'rolagens', { expandir: false });
  if (document.fonts) document.fonts.load('600 12px Oxanium').then(redesenhar).catch(() => {});
  requestAnimationFrame(quadro);
  iniciar();
})();

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
    cena: null, tokens: new Map(), cenas: [], cenaAtiva: null, combate: null, registro: [], presenca: [], personagens: [], npcs: [], meusNpcs: [], npcEditando: null, npcMidia: undefined, retrato: null, meus: [],
    // A NET (M13): as arquiteturas da campanha (o mestre) e a que está aberta no editor.
    arquiteturas: [], arqEditando: null,
    // Os pontos de acesso: o escolhido na ferramenta NET, o arrasto, o ponto que as opções mostram e o que está sob o mouse.
    // A janela da NET: o netrun aberto, o netrunner, o andar escolhido no mapa, o netrun que espera o evento e os campos.
    pontoSel: null, pontoPrevia: null, pontoArrastando: false, pontoForm: null, pontoSobre: null,
    netAberto: null, netCorredor: null, netNo: null, netAbrir: null, netCampos: { mod: 0, sorte: 0, comando: '', virus: '' },
    // O Painel Tático: o token fixado, o painel de baixo aberto (perícias, equipamento), a busca, o HP sendo digitado.
    painel: { fixo: null, aberto: null, busca: '', segurando: false, pendente: false, roda: 0, rodaTimer: null, ultimoRetrato: '', mostra: null },
    // O estilo do painel: o padrão da mesa (do mestre), o rascunho da janela de estilo e a prévia que o painel mostra.
    estiloDaMesa: null, estiloRascunho: null, estiloPrevia: null, estiloMensagem: '',
    // Áreas e desenhos: a escolhida, a que está sendo desenhada, a que está sendo arrastada e as opções (o navegador lembra).
    areaSel: null, areaPrevia: null, areaMovida: null, areaArrastando: false,
    area: { forma: 'circulo', cor: '#ff3158', abertura: 90, largura: 2, espessura: 4, escondida: false },
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
    on('desenhos', data => {
      if (!S.cena || data.cena !== S.cena.id) return;
      S.cena.desenhos = data.desenhos;
      // A prévia e o arrasto ficam até a lista nova chegar (sem pulo).
      if (!S.areaArrastando) { S.areaPrevia = null; S.areaMovida = null; }
      if (S.areaSel && !areaEscolhida()) S.areaSel = null;
      renderAreasOpcoes();
      redesenhar();
    });
    on('nota.aberta', data => abrirNota(data));
    on('visao.esquecer', data => { if (S.cena && data.cena === S.cena.id) esquecerExplorado(); });
    on('combate', data => { S.combate = data; renderCombate(); renderVez(); renderPainelTatico(); redesenhar(); });
    on('registro', data => { S.registro.push(data); if (S.registro.length > 200) S.registro.shift(); adicionarRegistro(data); });
    on('registro.troca', trocarRegistro);
    on('defesa', data => { if (!S.defesas.some(item => item.ataque === data.ataque && item.alvo === data.alvo)) S.defesas.push(data); renderDefesas(); });
    on('defesa.fim', data => { S.defesas = S.defesas.filter(item => item.ataque !== data.ataque || (data.alvo && item.alvo !== data.alvo)); renderDefesas(); });
    on('registro.limpo', () => { S.registro = []; renderRegistro(); });
    on('presenca', data => { S.presenca = data; renderPresenca(); });
    on('audio', receberAudio);
    on('npcs', data => receberNpcs(data));
    on('arquiteturas', data => receberArquiteturas(data));
    on('net', data => receberNet(data));
    on('estiloDaMesa', data => receberEstiloDaMesa(data));
    // A ficha de um personagem mudou (pela mesa, pela wiki ou pelo Foundry): o mestre recebe todas; o jogador, as dele.
    on('fichas', data => {
      if (data.personagens) S.personagens = data.personagens;
      if (data.meus) S.meus = data.meus;
      renderFichas();
      renderPericias();
      renderCartao();
      if (S.retrato) renderRetratoJanela();
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
    S.meusNpcs = data.meusNpcs || [];
    S.arquiteturas = data.arquiteturas || [];
    S.meus = data.meus || [];
    S.estiloDaMesa = data.estiloDaMesa || null;
    if (S.retrato && !fichaDoPersonagem(S.retrato.id)) fecharRetrato();
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
    if (!mesma) { S.paredeSel = null; S.tileSel = null; S.luzSel = null; S.notaSel = null; S.pontoSel = null; S.netNo = null; }
    S.tilePrevia = null;
    S.luzPrevia = null;
    S.notaPrevia = null;
    S.pontoPrevia = null;
    renderNotaOpcoes();
    renderPontoOpcoes();
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
  // ---------------- Áreas e desenhos (M19) ----------------
  // Como os Measured Templates e os Drawings do Foundry: o círculo (a explosão), o cone, a linha, o retângulo e o traço
  // livre. Todos na cena veem (o escondido do mestre, só ele); quem fez muda e apaga. A área escolhida mostra quem está
  // dentro (o centro do token). As contas são as do mesa-areas.js.
  const MA = window.MesaAreas;
  const desenhosDaCena = () => (S.cena && S.cena.desenhos) || [];
  const areaEscolhida = () => desenhosDaCena().find(desenho => desenho.id === S.areaSel) || null;
  const corComAlfa = (hex, alfa) => { const n = parseInt(String(hex).slice(1), 16) || 0; return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alfa})`; };
  // O desenho como aparece agora: com o arrasto de quem está movendo.
  function areaVista(desenho) {
    const movida = S.areaMovida && S.areaMovida.id === desenho.id ? S.areaMovida : null;
    if (!movida) return desenho;
    return { ...desenho, x: desenho.x + movida.dx, y: desenho.y + movida.dy, ...(desenho.pontos ? { pontos: desenho.pontos.map(([x, y]) => [x + movida.dx, y + movida.dy]) } : {}) };
  }
  // De meio em meio quadrado (como a ponta do template do Foundry); sem grade, solto. preso: dentro do mapa (a origem
  // fica; a outra ponta, que só dá a direção e o tamanho, pode passar da borda).
  function encaixarMeio(ponto, preso = true) {
    const g = grade();
    const limite = preso ? dentro : p => p;
    if (g.tipo === 'nenhuma') return limite(ponto);
    const passo = g.tamanho / 2;
    return limite({ x: (g.x || 0) + Math.round((ponto.x - (g.x || 0)) / passo) * passo, y: (g.y || 0) + Math.round((ponto.y - (g.y || 0)) / passo) * passo });
  }
  // A área que está sendo arrastada, de a até b, com a forma e as opções escolhidas.
  function novaArea(forma, a, b) {
    const base = { tipo: forma, x: a.x, y: a.y, cor: S.area.cor, escondido: gm() && S.area.escondida, meu: true };
    const g = grade();
    if (forma === 'livre') return { ...base, pontos: [[Math.round(a.x), Math.round(a.y)]], espessura: S.area.espessura };
    if (forma === 'retangulo') return { ...base, x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) };
    const medida = { dist: Math.hypot(b.x - a.x, b.y - a.y), angulo: Math.round((Math.atan2(b.y - a.y, b.x - a.x) * 1800) / Math.PI) / 10 };
    if (forma === 'cone') medida.abertura = S.area.abertura;
    if (forma === 'linha') medida.largura = (S.area.largura / (g.metros || 2)) * g.tamanho;
    return { ...base, ...medida };
  }
  const tokensNaArea = area => [...S.tokens.values()].filter(token => MA.contem(area, { x: token.vx, y: token.vy }));
  function desenharUmaArea(d, px, destaque) {
    const pontos = MA.contorno(d);
    if (!pontos.length) return;
    ctx.save();
    ctx.beginPath();
    if (d.tipo === 'circulo') ctx.arc(d.x, d.y, d.dist, 0, Math.PI * 2);
    else {
      ctx.moveTo(pontos[0].x, pontos[0].y);
      for (const ponto of pontos.slice(1)) ctx.lineTo(ponto.x, ponto.y);
      if (d.tipo !== 'livre') ctx.closePath();
    }
    if (d.escondido) ctx.setLineDash([8 * px, 6 * px]);
    if (d.tipo === 'livre') {
      Object.assign(ctx, { lineCap: 'round', lineJoin: 'round', strokeStyle: d.cor, lineWidth: d.espessura, globalAlpha: d.escondido ? 0.6 : 0.95 });
      ctx.stroke();
      if (destaque) { ctx.globalAlpha = 0.35; ctx.lineWidth = d.espessura + 6 * px; ctx.stroke(); }
    } else {
      ctx.fillStyle = corComAlfa(d.cor, destaque ? 0.26 : 0.15);
      ctx.fill();
      ctx.strokeStyle = d.cor;
      ctx.lineWidth = (destaque ? 3 : 2) * px;
      ctx.stroke();
      if (d.tipo !== 'retangulo') {
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(d.x, d.y, 4 * px, 0, Math.PI * 2);
        ctx.fillStyle = d.cor;
        ctx.fill();
      }
    }
    ctx.restore();
    if (destaque && d.tipo !== 'livre') rotulo(MA.descrever(d, grade()), d.x, d.y - 34 * px, px, { borda: d.cor, tamanho: 12 });
  }
  function desenharAreas(px) {
    for (const desenho of desenhosDaCena()) desenharUmaArea(areaVista(desenho), px, desenho.id === S.areaSel);
    if (S.areaPrevia) desenharUmaArea(S.areaPrevia, px, true);
  }
  // Depois dos tokens: o anel em quem está na área escolhida (ou na que está sendo desenhada).
  function desenharTokensNaArea(px) {
    const area = S.areaPrevia || (areaEscolhida() && areaVista(areaEscolhida()));
    if (!area || area.tipo === 'livre') return;
    for (const token of tokensNaArea(area)) {
      ctx.beginPath();
      ctx.arc(token.vx, token.vy, raioDe(token) + 5 * px, 0, Math.PI * 2);
      ctx.strokeStyle = area.cor;
      ctx.lineWidth = 3 * px;
      ctx.stroke();
    }
  }

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
  // As opções das áreas: a forma e o que muda em cada uma (o navegador lembra). Com uma escolhida, a cor e a medida
  // mudam ela; e aparece quem está dentro.
  try { Object.assign(S.area, JSON.parse(store.get('area') || '{}')); } catch { /* sem nada guardado */ }
  if (!MA.TIPOS.includes(S.area.forma)) S.area.forma = 'circulo';
  function renderAreasOpcoes() {
    const caixa = $('#areas-opcoes');
    if (caixa.hidden && S.ferramenta !== 'areas') return;
    const escolhida = areaEscolhida();
    const forma = escolhida ? escolhida.tipo : S.area.forma;
    for (const botao of $$('[data-area-forma]')) botao.classList.toggle('ativo', botao.dataset.areaForma === S.area.forma);
    $('#area-abertura-campo').hidden = forma !== 'cone';
    $('#area-largura-campo').hidden = forma !== 'linha';
    $('#area-espessura-campo').hidden = forma !== 'livre';
    const g = grade();
    const campo = (id, valor) => { const el = $(id); if (document.activeElement !== el) el.value = valor; };
    campo('#area-cor', escolhida ? escolhida.cor : S.area.cor);
    campo('#area-abertura', escolhida && escolhida.tipo === 'cone' ? escolhida.abertura : S.area.abertura);
    campo('#area-largura', escolhida && escolhida.tipo === 'linha' ? MA.metros(escolhida.largura, g) : S.area.largura);
    campo('#area-espessura', escolhida && escolhida.tipo === 'livre' ? escolhida.espessura : S.area.espessura);
    $('#area-escondida').checked = escolhida ? Boolean(escolhida.escondido) : S.area.escondida;
    $('#area-dica').hidden = Boolean(escolhida);
    const caixaEscolhida = $('#area-escolhida');
    caixaEscolhida.hidden = !escolhida;
    if (escolhida) {
      const vista = areaVista(escolhida);
      const dentroDela = vista.tipo === 'livre' ? null : tokensNaArea(vista).map(token => token.nome);
      caixaEscolhida.innerHTML = `<b>${esc(MA.descrever(vista, g))}</b>${escolhida.escondido ? ' <small>(só você vê)</small>' : ''}
        ${dentroDela ? `<p class="nota">${dentroDela.length ? `Na área: ${esc(dentroDela.join(', '))}.` : 'Ninguém na área.'}</p>` : ''}
        ${escolhida.meu ? '<div class="combate-acoes"><button class="botao vazado pequeno perigo" type="button" data-area-apagar>Apagar</button></div>' : '<p class="nota">De outra pessoa: só quem fez muda.</p>'}`;
    }
    $('#area-escondida').closest('label').hidden = !gm();
  }
  function salvarOpcoesDaArea() { store.set('area', JSON.stringify(S.area)); }
  function apagarAreaEscolhida() {
    const escolhida = areaEscolhida();
    if (!escolhida || !escolhida.meu) return;
    S.areaSel = null;
    op('desenho.apagar', { desenho: escolhida.id }).catch(() => {});
    renderAreasOpcoes();
  }
  for (const botao of $$('[data-area-forma]')) botao.addEventListener('click', () => {
    S.area.forma = botao.dataset.areaForma;
    S.areaSel = null;
    salvarOpcoesDaArea();
    renderAreasOpcoes();
    redesenhar();
  });
  // Uma opção mudou: vale para as próximas e, com uma escolhida (sua), muda ela.
  $('#areas-opcoes').addEventListener('change', event => {
    const campo = event.target;
    const escolhida = areaEscolhida();
    const g = grade();
    const mudancas = {};
    if (campo.id === 'area-cor') { S.area.cor = campo.value; mudancas.cor = campo.value; }
    if (campo.id === 'area-abertura') { S.area.abertura = Math.min(180, Math.max(5, Number(campo.value) || 90)); if (escolhida && escolhida.tipo === 'cone') mudancas.abertura = S.area.abertura; }
    if (campo.id === 'area-largura') { S.area.largura = Math.min(40, Math.max(0.5, Number(campo.value) || 2)); if (escolhida && escolhida.tipo === 'linha') mudancas.largura = (S.area.largura / (g.metros || 2)) * g.tamanho; }
    if (campo.id === 'area-espessura') { S.area.espessura = Number(campo.value) || 4; if (escolhida && escolhida.tipo === 'livre') mudancas.espessura = S.area.espessura; }
    if (campo.id === 'area-escondida') { S.area.escondida = campo.checked; if (escolhida) mudancas.escondido = campo.checked; }
    salvarOpcoesDaArea();
    if (escolhida && escolhida.meu && Object.keys(mudancas).length) op('desenho.editar', { desenho: escolhida.id, mudancas }).catch(() => {});
  });
  $('#areas-opcoes').addEventListener('click', event => {
    if (event.target.closest('[data-area-apagar]')) apagarAreaEscolhida();
  });
  $('#area-limpar').addEventListener('click', () => { if (S.cena && confirm('Apagar as áreas e os desenhos que você fez nesta cena?')) op('desenho.limpar', { cena: S.cena.id }).catch(() => {}); });
  $('#area-limpar-todas').addEventListener('click', () => { if (S.cena && confirm('Apagar todas as áreas e os desenhos desta cena (os dos jogadores também)?')) op('desenho.limpar', { cena: S.cena.id, todos: true }).catch(() => {}); });

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

  // ---------------- A NET no mapa (M13) ----------------
  // O ponto de acesso: o marcador "NET" (como o do NET Architect no Foundry), que o mestre põe e configura pela ferramenta
  // NET (K). O jogador recebe os que vê (o oculto, não) e, no Mover, clica num para conectar o token dele.
  const pontosDaCena = () => (S.cena && S.cena.pontosNet) || [];
  const runsDaCena = () => (S.cena && S.cena.net) || [];
  const pontoNaTela = ponto => (S.pontoPrevia && S.pontoPrevia.id === ponto.id ? { ...ponto, ...S.pontoPrevia } : ponto);
  const raioDoPonto = () => Math.max(15 / S.vista.escala, grade().tamanho * 0.3);
  const pontoEm = mundo => [...pontosDaCena()].reverse().find(ponto => { const p = pontoNaTela(ponto); return Math.hypot(mundo.x - p.x, mundo.y - p.y) <= raioDoPonto(); }) || null;
  const pontoEscolhido = () => pontosDaCena().find(ponto => ponto.id === S.pontoSel) || null;
  // O mestre recebe os nomes de quem está conectado; o jogador, quantos.
  const conectadosAoPonto = ponto => (Array.isArray(ponto.conectados) ? ponto.conectados.length : Number(ponto.conectados) || 0);
  function hexagono(x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i + Math.PI / 6;
      if (i) ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); else ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath();
  }
  // O alcance do ponto como o servidor conta: na grade, em quadrados (a diagonal conta 1, como a régua); sem grade, o círculo.
  function desenharAlcance(ponto, px) {
    const g = grade();
    const alcance = Number(ponto.alcance) > 0 ? Number(ponto.alcance) : 2;
    ctx.beginPath();
    if (g.tipo === 'nenhuma') ctx.arc(ponto.x, ponto.y, (alcance / (g.metros || 2)) * g.tamanho, 0, Math.PI * 2);
    else { const lado = (Math.floor(alcance / (g.metros || 2) + 1e-9) + 0.5) * g.tamanho; ctx.rect(ponto.x - lado, ponto.y - lado, lado * 2, lado * 2); }
    ctx.fillStyle = 'rgba(0, 255, 210, .05)';
    ctx.fill();
    ctx.setLineDash([8 * px, 6 * px]);
    ctx.strokeStyle = 'rgba(0, 255, 210, .5)';
    ctx.lineWidth = 1.5 * px;
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // O hexágono "NET": ciano com arquitetura (o mestre vê cinza o que ainda não tem), o anel magenta com alguém conectado e,
  // para o mestre, tracejado o oculto. O alcance aparece na ferramenta NET e com o mouse em cima.
  function desenharPontos(px) {
    const r = raioDoPonto();
    const naFerramenta = gm() && S.ferramenta === 'net';
    for (const original of pontosDaCena()) {
      const ponto = pontoNaTela(original);
      if (naFerramenta || S.pontoSobre === ponto.id) desenharAlcance(ponto, px);
      const escolhido = naFerramenta && S.pontoSel === ponto.id;
      const oculto = gm() && ponto.oculto;
      ctx.globalAlpha = oculto ? 0.6 : 1;
      if (conectadosAoPonto(ponto)) {
        hexagono(ponto.x, ponto.y, r * 1.3);
        ctx.strokeStyle = 'rgba(255, 46, 136, .6)';
        ctx.lineWidth = r * 0.16;
        ctx.stroke();
      }
      hexagono(ponto.x, ponto.y, r);
      ctx.fillStyle = 'rgba(7, 16, 18, .9)';
      ctx.fill();
      ctx.lineWidth = Math.max(2 * px, r * 0.1) * (escolhido ? 1.4 : 1);
      ctx.strokeStyle = escolhido ? '#f8ef02' : !gm() || ponto.arquitetura ? '#00ffd2' : '#8a9696';
      if (oculto) ctx.setLineDash([4 * px, 3 * px]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#e8fffb';
      ctx.font = `700 ${r * 0.62}px Oxanium, 'Segoe UI', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('NET', ponto.x, ponto.y + r * 0.04);
      ctx.globalAlpha = 1;
      const extra = gm() ? [ponto.oculto && 'oculto', !ponto.arquitetura && 'sem arquitetura'].filter(Boolean).join(' · ') : '';
      rotulo(`${ponto.nome}${extra ? ` · ${extra}` : ''}`, ponto.x, ponto.y + r * 1.15, px, { tamanho: 11, cor: '#00ffd2', borda: oculto ? '#ff9fbf' : '#00ffd2' });
    }
  }
  // As opções do ponto escolhido. Quem está digitando num campo dele não perde o que escreve.
  function renderPontoOpcoes() {
    const ponto = pontoEscolhido();
    $('#ponto-aviso').textContent = ponto ? 'Ponto de acesso escolhido (arraste para mover)' : 'Clique no mapa para pôr um ponto de acesso';
    $('#ponto-escolhido').hidden = !ponto;
    if (!ponto) return;
    const nomes = Array.isArray(ponto.conectados) ? ponto.conectados : [];
    $('#ponto-conectados').textContent = nomes.length ? `Na NET por aqui: ${nomes.join(', ')}.` : 'Ninguém conectado.';
    $('#ponto-scanner-campo').hidden = !ponto.oculto;
    const digitando = $('#net-opcoes').contains(document.activeElement) && document.activeElement.matches('input[type="text"], input[type="number"]');
    if (digitando && S.pontoForm === ponto.id) return;
    S.pontoForm = ponto.id;
    $('#ponto-arquitetura').innerHTML = `<option value="">Escolha a arquitetura</option>${S.arquiteturas.map(arq => `<option value="${esc(arq.id)}"${arq.id === ponto.arquitetura ? ' selected' : ''}>${esc(arq.nome)}</option>`).join('')}`;
    $('#ponto-nome').value = ponto.nome;
    $('#ponto-alcance').value = ponto.alcance;
    $('#ponto-dv').value = ponto.dv || 0;
    $('#ponto-rank').value = ponto.rankMinimo;
    $('#ponto-deck').checked = ponto.exigeDeck;
    $('#ponto-oculto').checked = ponto.oculto;
    $('#ponto-scanner').value = ponto.dvScanner;
    $('#ponto-reiniciar').checked = ponto.reiniciar;
  }
  const editarPonto = mudancas => { const ponto = pontoEscolhido(); if (ponto) op('net.ponto.editar', { ponto: ponto.id, ...mudancas }).catch(() => { S.pontoForm = null; renderPontoOpcoes(); }); };
  $('#ponto-nome').addEventListener('change', event => editarPonto({ nome: event.target.value }));
  $('#ponto-arquitetura').addEventListener('change', event => {
    const ponto = pontoEscolhido();
    // Trocar a arquitetura recomeça o netrun: quem está conectado cai fora.
    if (ponto && conectadosAoPonto(ponto) && !confirm('Trocar a arquitetura desconecta quem está na NET por este ponto. Trocar?')) { S.pontoForm = null; renderPontoOpcoes(); return; }
    editarPonto({ arquitetura: event.target.value });
  });
  $('#ponto-alcance').addEventListener('change', event => editarPonto({ alcance: Number(event.target.value) || 0 }));
  $('#ponto-dv').addEventListener('change', event => editarPonto({ dv: Number(event.target.value) || 0 }));
  $('#ponto-rank').addEventListener('change', event => editarPonto({ rankMinimo: Number(event.target.value) || 0 }));
  $('#ponto-scanner').addEventListener('change', event => editarPonto({ dvScanner: Number(event.target.value) || 10 }));
  $('#ponto-deck').addEventListener('change', event => editarPonto({ exigeDeck: event.target.checked }));
  $('#ponto-oculto').addEventListener('change', event => editarPonto({ oculto: event.target.checked }));
  $('#ponto-reiniciar').addEventListener('change', event => editarPonto({ reiniciar: event.target.checked }));
  function apagarPontoEscolhido() {
    const ponto = pontoEscolhido();
    if (!ponto || !confirm(`Apagar o ponto de acesso "${ponto.nome}"?${conectadosAoPonto(ponto) ? ' Quem está conectado cai da NET.' : ''}`)) return;
    S.pontoSel = null;
    renderPontoOpcoes();
    op('net.ponto.apagar', { ponto: ponto.id }).catch(() => {});
  }
  $('#ponto-apagar').addEventListener('click', apagarPontoEscolhido);
  $('#ponto-conectar').addEventListener('click', () => {
    const ponto = pontoEscolhido();
    const token = S.selecionado && S.tokens.get(S.selecionado);
    if (!ponto) return;
    if (!token) return aviso('Escolha um token no mapa (no Mover) e volte aqui para conectá-lo.');
    op('net.conectar', { ponto: ponto.id, token: token.id }).then(() => abrirNet(ponto.id, token.id)).catch(() => {});
  });
  $('#ponto-abrir').addEventListener('click', () => {
    const ponto = pontoEscolhido();
    if (!ponto) return;
    if (!runsDaCena().some(run => run.ponto === ponto.id)) return aviso('Ninguém conectou neste ponto ainda.');
    abrirNet(ponto.id);
  });
  // Clicar no ponto (no Mover): conecta o token (o escolhido, se for seu; senão, o seu mais perto que não está na NET) e
  // abre a aba NET; já conectado ali, só abre. O mestre conecta o token escolhido; sem um, abre o netrun do ponto.
  function clicarNoPonto(ponto) {
    const run = runsDaCena().find(item => item.ponto === ponto.id);
    const escolhido = S.selecionado && S.tokens.get(S.selecionado);
    const longe = token => Math.hypot(token.x - ponto.x, token.y - ponto.y);
    const token = escolhido && (gm() || escolhido.meu) ? escolhido
      : gm() ? null : [...S.tokens.values()].filter(item => item.meu).sort((a, b) => Boolean(a.naNet) - Boolean(b.naNet) || longe(a) - longe(b))[0];
    if (!token) {
      if (run) return abrirNet(ponto.id);
      return aviso(gm() ? 'Escolha um token no mapa e clique no ponto de acesso para conectá-lo.' : 'Você não tem token nesta cena.');
    }
    if (run && run.corredores.some(corredor => corredor.token === token.id)) return abrirNet(ponto.id, token.id);
    op('net.conectar', { ponto: ponto.id, token: token.id }).then(() => abrirNet(ponto.id, token.id)).catch(() => {});
  }
  // A NET mudou (os pontos que cada um vê, os netruns dele): o mapa, as opções e a aba acompanham. O ponto que o mestre
  // está arrastando fica onde a mão está.
  function receberNet(data) {
    if (!S.cena || data.cena !== S.cena.id) return;
    S.cena.pontosNet = data.pontos || [];
    S.cena.net = data.runs || [];
    if (!S.pontoArrastando) S.pontoPrevia = null;
    renderPontoOpcoes();
    renderNetruns();
    if (S.netAbrir && runsDaCena().some(run => run.ponto === S.netAbrir)) abrirNet(S.netAbrir);
    redesenhar();
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
    // O Painel Tático aberto cobre a base do mapa.
    const tatico = S.painel && S.painel.mostra && !painelRecolhido() ? borda('#painel-tatico .pt-barra') : null;
    if (tatico) y1 = Math.min(y1, tatico.top - tela.top);
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
  const raioDe = token => (token.tamanho || 1) * grade().tamanho * 0.44 * (token.dentro && S.tokens.has(token.dentro) ? 0.5 : 1);
  // Veículos (M17): quem está dentro fica no lugar do veículo (o servidor conta dali), mas aparece numa roda em volta do
  // centro dele, menor, por cima (para escolher, atacar, ver o HP). Os de fora primeiro, os de dentro por cima.
  function posicaoDoToken(token) {
    const veiculo = token.dentro && S.tokens.get(token.dentro);
    if (!veiculo || !veiculo.veiculo) return { x: token.x, y: token.y };
    const ocupantes = veiculo.veiculo.ocupantes.filter(id => S.tokens.has(id));
    const i = Math.max(0, ocupantes.indexOf(token.id));
    const angulo = -Math.PI / 2 + (i * Math.PI * 2) / Math.max(1, ocupantes.length);
    const longe = ocupantes.length > 1 ? raioDe(veiculo) * 0.55 : 0;
    return { x: veiculo.vx + Math.cos(angulo) * longe, y: veiculo.vy + Math.sin(angulo) * longe };
  }
  const tokensNaOrdem = () => { const todos = [...S.tokens.values()]; return [...todos.filter(token => !token.dentro), ...todos.filter(token => token.dentro)]; };
  function tokenEm(ponto) {
    const lista = tokensNaOrdem().reverse();
    return lista.find(token => (ponto.x - token.vx) ** 2 + (ponto.y - token.vy) ** 2 <= raioDe(token) ** 2) || null;
  }
  const podeMover = token => gm() || token.meu || Boolean(token.veiculo && token.veiculo.dirijo);

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
    desenharAreas(px);
    if (gm() && S.ferramenta === 'paredes') desenharParedes(px);
    desenharNotas(px);
    desenharPontos(px);
    desenharAgarroes(px);
    for (const token of tokensNaOrdem()) {
      if (S.arrasto && S.arrasto.token === token.id) continue;
      desenharToken(token, token.vx, token.vy, agora, px);
    }
    desenharRotulosDosAgarroes(px);
    desenharTokensNaArea(px);
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
  // Os estados de um token que o mapa escreve em cima dele: [texto, cor do fundo].
  const estadosDoToken = token => [
    token.suprimido && ['SUPRIMIDO', '#ff8a3d'],
    token.inconsciente && ['INCONSCIENTE', '#a9aeaa'],
    token.caido && ['CAÍDO', '#f8ef02'],
    token.naNet && ['NA NET', '#00ffd2']
  ].filter(Boolean);
  // O agarrão no mapa (M9b): uma faixa entre quem agarra e quem é agarrado, por baixo dos dois, e um rótulo só para o par,
  // no meio, acima dos outros estados dos dois (desenhado depois dos tokens).
  const paresDeAgarrao = () => [...S.tokens.values()].filter(token => token.agarrao && token.agarrao.papel === 'agarrando' && S.tokens.has(token.agarrao.outro))
    .map(token => [token, S.tokens.get(token.agarrao.outro)]);
  function desenharAgarroes(px) {
    for (const [token, outro] of paresDeAgarrao()) {
      ctx.beginPath();
      ctx.moveTo(token.vx, token.vy);
      ctx.lineTo(outro.vx, outro.vy);
      ctx.strokeStyle = 'rgba(255, 49, 88, .7)';
      ctx.lineWidth = Math.max(grade().tamanho * 0.12, 4 * px);
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.lineCap = 'butt';
    }
  }
  function desenharRotulosDosAgarroes(px) {
    for (const [token, outro] of paresDeAgarrao()) {
      if (S.arrasto && (S.arrasto.token === token.id || S.arrasto.token === outro.id)) continue;
      const pilha = Math.max(estadosDoToken(token).length, estadosDoToken(outro).length);
      const topo = Math.min(token.vy - raioDe(token), outro.vy - raioDe(outro));
      const texto = token.agarrao.escudo ? 'ESCUDO HUMANO' : outro.agarrao && outro.agarrao.apertoDeFerro ? 'AGARRÃO · APERTO DE FERRO' : 'AGARRÃO';
      rotulo(texto, (token.vx + outro.vx) / 2, topo - (18 + pilha * 15) * px, px, { tamanho: 9, cor: '#140a04', fundo: '#ff3158' });
    }
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
    // Os estados que todos veem, empilhados em cima do token: Suprimido e os da luta (M9b). O agarrão tem um rótulo só,
    // no meio do par (desenharRotulosDosAgarroes).
    if (!fantasma) estadosDoToken(token).forEach(([texto, fundo], i) => rotulo(texto, x, y - r - (18 + i * 15) * px, px, { tamanho: 9, cor: '#140a04', fundo }));
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
    for (const token of tokensNaOrdem()) {
      const alvo = posicaoDoToken(token);
      const dx = alvo.x - token.vx;
      const dy = alvo.y - token.vy;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) { token.vx = alvo.x; token.vy = alvo.y; continue; }
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
    // Pontos de acesso: clique num escolhe (e arrastar move); com um escolhido, o clique fora solta; senão, põe um ali (no
    // centro do quadrado; Shift solta da grade).
    if (S.ferramenta === 'net' && gm()) {
      const ponto = pontoEm(mundo);
      if (ponto) {
        S.pontoSel = ponto.id;
        renderPontoOpcoes();
        gesto = { tipo: 'ponto-mover', inicio: tela, ponto: ponto.id, desloc: { x: mundo.x - ponto.x, y: mundo.y - ponto.y } };
        S.pontoArrastando = true;
      } else if (S.pontoSel) {
        S.pontoSel = null;
        renderPontoOpcoes();
        gesto = { tipo: 'pan-talvez', inicio: tela, vista: { ...S.vista } };
      } else {
        gesto = { tipo: 'ponto-novo', inicio: tela, vista: { ...S.vista }, lugar: event.shiftKey ? dentro(mundo) : encaixar(mundo) };
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
    // Áreas: clique numa escolhe (a sua, arrastar move); arrastar no vazio põe uma nova.
    if (S.ferramenta === 'areas') {
      const tolerancia = 6 / S.vista.escala;
      const acertada = [...desenhosDaCena()].reverse().find(desenho => MA.acerta(desenho, mundo, tolerancia));
      if (acertada) {
        S.areaSel = acertada.id;
        renderAreasOpcoes();
        gesto = { tipo: 'area-mover', inicio: tela, area: acertada.id, de: mundo, pode: acertada.meu };
        S.areaArrastando = true;
      } else {
        // No vazio: solta a escolhida e começa uma nova (o clique sem arrastar não põe nada).
        if (S.areaSel) { S.areaSel = null; renderAreasOpcoes(); }
        const forma = S.area.forma;
        const a = forma === 'livre' || event.shiftKey ? dentro(mundo) : encaixarMeio(mundo);
        gesto = { tipo: 'area-nova', inicio: tela, a, forma };
        S.areaPrevia = novaArea(forma, a, a);
        S.areaArrastando = true;
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
      // Sem token: o clique (sem arrastar) num ponto de acesso conecta; num alfinete, abre a nota.
      const ponto = pontoEm(mundo);
      const nota = ponto ? null : notaEm(mundo);
      gesto = { tipo: 'pan-talvez', inicio: tela, vista: { ...S.vista }, nota: nota ? nota.id : null, pontoNet: ponto ? ponto.id : null };
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
      // O ponto de acesso sob o mouse mostra o alcance (no Mover e na ferramenta NET).
      const ponto = S.cena && !sobre && (S.ferramenta === 'mover' || S.ferramenta === 'net') ? pontoEm(mundo) : null;
      if ((ponto ? ponto.id : null) !== S.pontoSobre) { S.pontoSobre = ponto ? ponto.id : null; redesenhar(); }
      const clicavel = S.cena && (ponto || (S.ferramenta === 'mover' && (portaEm(mundo) || (!sobre && notaEm(mundo)))) || (S.ferramenta === 'notas' && notaEm(mundo)));
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
    if (gesto.tipo === 'ponto-novo' && gesto.moveu) gesto = { tipo: 'pan', inicio: gesto.inicio, vista: gesto.vista, moveu: true };
    if (gesto.tipo === 'ponto-mover' && gesto.moveu) {
      const solto = dentro({ x: mundo.x - gesto.desloc.x, y: mundo.y - gesto.desloc.y });
      S.pontoPrevia = { id: gesto.ponto, ...(event.shiftKey ? solto : encaixar(solto)) };
      redesenhar();
      return;
    }
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
    } else if (gesto.tipo === 'area-nova' && S.areaPrevia) {
      if (gesto.forma === 'livre') {
        const ultimo = S.areaPrevia.pontos[S.areaPrevia.pontos.length - 1];
        if (Math.hypot(mundo.x - ultimo[0], mundo.y - ultimo[1]) * S.vista.escala >= 4 && S.areaPrevia.pontos.length < 1000) S.areaPrevia.pontos.push([Math.round(mundo.x), Math.round(mundo.y)]);
      } else S.areaPrevia = novaArea(gesto.forma, gesto.a, event.shiftKey ? mundo : encaixarMeio(mundo, false));
      redesenhar();
    } else if (gesto.tipo === 'area-mover' && gesto.moveu && gesto.pode) {
      const desenho = desenhosDaCena().find(item => item.id === gesto.area);
      if (desenho) {
        const solto = { x: desenho.x + mundo.x - gesto.de.x, y: desenho.y + mundo.y - gesto.de.y };
        const novo = desenho.tipo === 'livre' || event.shiftKey ? solto : encaixarMeio(solto);
        S.areaMovida = { id: desenho.id, dx: Math.round(novo.x - desenho.x), dy: Math.round(novo.y - desenho.y) };
        renderAreasOpcoes();
      }
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
      const solto = S.arrasto.pos;
      S.arrasto = null;
      const token = S.tokens.get(atual.token);
      const veiculo = token && !token.veiculo && [...S.tokens.values()].find(item => item.veiculo && item.id !== token.id && item.id !== token.dentro && Math.hypot(solto.x - item.vx, solto.y - item.vy) <= raioDe(item));
      if (cancelar || !token) { /* nada */ }
      else if (veiculo && (gm() || token.meu)) op('veiculo.embarcar', { token: token.id, veiculo: veiculo.id }).catch(() => {});
      else if (token.dentro) op('veiculo.descer', { token: token.id, x: alvo.x, y: alvo.y }).catch(() => {});
      else moverToken(atual.token, alvo);
      redesenhar();
    } else if (atual.tipo === 'pan-talvez' && !atual.moveu) {
      const nota = atual.nota && notasDaCena().find(item => item.id === atual.nota);
      const ponto = atual.pontoNet && pontosDaCena().find(item => item.id === atual.pontoNet);
      if (nota && !cancelar) abrirNota(nota); else if (ponto && !cancelar) clicarNoPonto(ponto); else selecionar(null);
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
    } else if (atual.tipo === 'ponto-novo' && !atual.moveu && !cancelar) {
      op('net.ponto.criar', { cena: S.cena.id, x: atual.lugar.x, y: atual.lugar.y }).then(({ resultado }) => {
        S.pontoSel = resultado.ponto;
        renderPontoOpcoes();
        redesenhar();
        $('#ponto-nome').select();
      }).catch(() => {});
    } else if (atual.tipo === 'ponto-mover') {
      // A prévia fica até a NET nova chegar (sem pulo).
      S.pontoArrastando = false;
      const previa = S.pontoPrevia && S.pontoPrevia.id === atual.ponto ? S.pontoPrevia : null;
      if (previa && !cancelar) op('net.ponto.editar', { ponto: previa.id, x: previa.x, y: previa.y }).catch(() => { S.pontoPrevia = null; redesenhar(); });
      else { S.pontoPrevia = null; redesenhar(); }
    } else if (atual.tipo === 'area-nova') {
      S.areaArrastando = false;
      const previa = S.areaPrevia;
      const minimo = 4 / S.vista.escala;
      const pronta = previa && !cancelar && (previa.tipo === 'livre' ? previa.pontos.length >= 2 : previa.tipo === 'retangulo' ? previa.w >= minimo && previa.h >= minimo : previa.dist >= minimo);
      if (!pronta) { S.areaPrevia = null; redesenhar(); return; }
      const { meu, ...desenho } = previa;
      op('desenho.criar', { cena: S.cena.id, desenho }).then(({ resultado }) => { S.areaSel = resultado.desenho; renderAreasOpcoes(); redesenhar(); }).catch(() => { S.areaPrevia = null; redesenhar(); });
    } else if (atual.tipo === 'area-mover') {
      S.areaArrastando = false;
      const movida = S.areaMovida;
      if (!movida || cancelar || (!movida.dx && !movida.dy)) { S.areaMovida = null; redesenhar(); return; }
      const desenho = desenhosDaCena().find(item => item.id === movida.id);
      const mudancas = desenho && desenho.tipo === 'livre' ? { dx: movida.dx, dy: movida.dy } : { x: desenho.x + movida.dx, y: desenho.y + movida.dy };
      op('desenho.editar', { desenho: movida.id, mudancas }).catch(() => { S.areaMovida = null; redesenhar(); });
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
    if (token.veiculo) for (const ocupante of token.veiculo.ocupantes) { const dentro = S.tokens.get(ocupante); if (dentro) Object.assign(dentro, { x: alvo.x, y: alvo.y }); }
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
    if ((tecla === 'k' || tecla === 'K') && gm()) return escolherFerramenta('net');
    if (tecla === 'a' || tecla === 'A') return escolherFerramenta('areas');
    if (tecla === '0') return enquadrar();
    if (tecla === 'c' || tecla === 'C') return irAoMeuToken();
    if ((tecla === 'h' || tecla === 'H') && S.painel.mostra) return painelAberto(painelRecolhido());
    if (tecla === 'b' || tecla === 'B') return celular() ? abrirPainel(!$('#painel').classList.contains('aberto')) : barraAberta(!S.barraAberta);
    if (tecla === 'Escape') {
      if (!$('#menu').hidden) return menuAberto(false);
      if (S.notaAberta || !$('#nota-janela').hidden) return fecharNota();
      if (S.escolhendoAlvo) return escolherAlvoNoMapa(false);
      if (S.notaSel) { S.notaSel = null; renderNotaOpcoes(); redesenhar(); return; }
      if (S.pontoSel) { S.pontoSel = null; renderPontoOpcoes(); redesenhar(); return; }
      if (S.areaSel) { S.areaSel = null; renderAreasOpcoes(); redesenhar(); return; }
      if (S.paredeSel) { S.paredeSel = null; renderParedeOpcoes(); redesenhar(); return; }
      if (S.tileSel) { S.tileSel = null; renderTileOpcoes(); redesenhar(); return; }
      if (S.luzSel) { S.luzSel = null; renderLuzOpcoes(); redesenhar(); return; }
      selecionar(null); escolherFerramenta('mover'); return;
    }
    if (S.ferramenta === 'paredes' && S.paredeSel && (tecla === 'Delete' || tecla === 'Backspace')) { event.preventDefault(); apagarParedeEscolhida(); return; }
    if (S.ferramenta === 'tiles' && S.tileSel && (tecla === 'Delete' || tecla === 'Backspace')) { event.preventDefault(); apagarTileEscolhido(); return; }
    if (S.ferramenta === 'luzes' && S.luzSel && (tecla === 'Delete' || tecla === 'Backspace')) { event.preventDefault(); apagarLuzEscolhida(); return; }
    if (S.ferramenta === 'notas' && S.notaSel && (tecla === 'Delete' || tecla === 'Backspace')) { event.preventDefault(); apagarNotaEscolhida(); return; }
    if (S.ferramenta === 'net' && S.pontoSel && (tecla === 'Delete' || tecla === 'Backspace')) { event.preventDefault(); apagarPontoEscolhido(); return; }
    if (S.ferramenta === 'areas' && S.areaSel && (tecla === 'Delete' || tecla === 'Backspace')) { event.preventDefault(); apagarAreaEscolhida(); return; }
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
      mover: ['Mover · V', gm() ? 'Arraste tokens e o mapa. A roda aproxima. Segure o clique para ping (Shift traz todos). Shift solta fora da grade. Clique na porta abre e fecha; Shift tranca. Clique num alfinete abre a nota. Clique num ponto de acesso (NET) conecta o token escolhido.' : 'Arraste o seu token e o mapa. A roda ou a pinça aproxima. Segure o clique para ping. As setas movem um quadrado. Clique na porta abre e fecha. Clique num alfinete abre a nota. Clique num ponto de acesso (NET) conecta o seu token.'],
      regua: ['Régua · R', 'Arraste para medir: quadrados, metros e a DV por alcance. Shift mede fora da grade.'],
      ping: ['Ping · P', `Clique para chamar atenção para um ponto.${gm() ? ' Shift traz todos para ele.' : ''}`],
      nevoa: ['Névoa · N', 'Pinte para revelar; Alt cobre. Revelar tudo e Cobrir tudo ficam na aba Cena.'],
      paredes: ['Paredes e portas · W', 'Arraste para desenhar; a ponta gruda na grade e nas outras paredes (Shift solta). Clique numa parede para escolher; Delete apaga.'],
      tiles: ['Tiles · T', 'Clique num tile para escolher e arraste para mover (encaixa na grade; Shift solta). O quadrado amarelo muda o tamanho; Delete apaga.'],
      luzes: ['Luzes · L', 'Clique no mapa para pôr uma luz; clique numa luz para escolher e arraste para mover. Delete apaga.'],
      areas: ['Áreas e desenhos · A', 'Arraste no mapa: o círculo (a explosão), o cone, a linha, o retângulo ou o traço livre. Clique num para escolher (mostra quem está dentro) e arraste para mover. Delete apaga. Todos na cena veem.'],
      notas: ['Notas · J', 'Clique no mapa para pôr uma nota (um handout ou uma página da wiki); clique numa para editar e arraste para mover. Delete apaga. "Quem vê" decide se os jogadores veem o alfinete.'],
      net: ['Pontos de acesso da NET · K', 'Clique no mapa para pôr um ponto de acesso; clique num para escolher (a arquitetura, o alcance, quem pode conectar) e arraste para mover. Delete apaga. No Mover, o jogador clica no ponto para conectar.'],
      centralizar: ['A cena inteira · 0', 'Enquadra o mapa e os tokens na tela.'],
      'meu-token': ['O seu token · C', 'Leva a tela até o seu token e escolhe ele.']
    };
    for (const botao of $$('#ferramentas button')) {
      const [titulo, texto] = dicas[botao.dataset.ferramenta || botao.dataset.acao] || [];
      if (titulo) botao.dataset.dica = `${titulo.toUpperCase()}\n${texto}`;
    }
  }
  function escolherFerramenta(nome) {
    if (['nevoa', 'paredes', 'tiles', 'luzes', 'notas', 'net'].includes(nome) && !gm()) return;
    S.ferramenta = nome;
    for (const botao of $$('[data-ferramenta]')) botao.classList.toggle('ativa', botao.dataset.ferramenta === nome);
    canvas.className = nome === 'mover' ? '' : nome;
    $('#nevoa-opcoes').hidden = nome !== 'nevoa';
    $('#paredes-opcoes').hidden = nome !== 'paredes';
    $('#tiles-opcoes').hidden = nome !== 'tiles';
    $('#luzes-opcoes').hidden = nome !== 'luzes';
    $('#notas-opcoes').hidden = nome !== 'notas';
    $('#net-opcoes').hidden = nome !== 'net';
    $('#areas-opcoes').hidden = nome !== 'areas';
    if (nome !== 'areas' && S.areaSel) S.areaSel = null;
    if (nome === 'areas') renderAreasOpcoes();
    if (nome !== 'luzes' && S.luzSel) { S.luzSel = null; renderLuzOpcoes(); }
    if (nome !== 'notas' && S.notaSel) { S.notaSel = null; renderNotaOpcoes(); }
    if (nome !== 'net' && S.pontoSel) { S.pontoSel = null; renderPontoOpcoes(); }
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
  // Veículos (M17) no cartão. O veículo: os assentos e quem está dentro (o primeiro dirige), com Descer e Assumir a
  // direção para quem pode. Quem está dentro: Descer. O seu token perto de um veículo com lugar: Entrar.
  function htmlDoVeiculo(token) {
    if (token.veiculo) {
      const ocupantes = token.veiculo.ocupantes.map(id => S.tokens.get(id)).filter(Boolean);
      const linha = (ocupante, i) => {
        const pode = gm() || ocupante.meu;
        return `<li><span class="info"><b>${esc(ocupante.nome)}</b><small>${i === 0 ? 'dirige' : 'passageiro'}</small></span>
          ${pode && i > 0 ? `<button class="botao vazado pequeno" type="button" data-cartao="motorista" data-ocupante="${esc(ocupante.id)}">Dirigir</button>` : ''}
          ${pode || token.veiculo.dirijo ? `<button class="botao vazado pequeno" type="button" data-cartao="descer" data-ocupante="${esc(ocupante.id)}">Descer</button>` : ''}</li>`;
      };
      return `<div class="veiculo-cartao"><div class="grupo-npc">Veículo · ${ocupantes.length}/${token.veiculo.assentos} assentos</div>
        ${ocupantes.length ? `<ul class="lista">${ocupantes.map(linha).join('')}</ul>` : '<p class="nota">Vazio. Arraste um token para cima dele para embarcar.</p>'}
        ${token.veiculo.dirijo ? '<p class="nota">Você dirige: arraste o veículo para mover todos dentro.</p>' : ''}</div>`;
    }
    if (!(gm() || token.meu)) return '';
    if (token.dentro) {
      const veiculo = S.tokens.get(token.dentro);
      return `<div class="veiculo-cartao"><p class="nota">Dentro de ${esc(veiculo ? veiculo.nome : 'um veículo')}.</p><div class="cartao-acoes"><button class="botao vazado pequeno" type="button" data-cartao="descer">Descer</button></div></div>`;
    }
    const g = grade().tamanho;
    const perto = [...S.tokens.values()].filter(item => item.veiculo && item.veiculo.ocupantes.length < item.veiculo.assentos && (gm() || Math.hypot(item.x - token.x, item.y - token.y) <= (item.tamanho || 1) * g * 0.5 + 2 * g));
    return perto.length ? `<div class="cartao-acoes">${perto.map(veiculo => `<button class="botao vazado pequeno" type="button" data-cartao="embarcar" data-veiculo="${esc(veiculo.id)}">Entrar: ${esc(veiculo.nome)}</button>`).join('')}</div>` : '';
  }
  function renderCartao() {
    const caixa = $('#cartao');
    const token = S.selecionado && S.tokens.get(S.selecionado);
    renderPainelTatico();
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
        ${editaHp ? `<input type="number" data-hp-atual value="${token.hp.atual}" aria-label="${token.veiculo ? 'SDP' : 'HP'} atual">` : `<b>${token.hp.atual}</b>`}<span>/ ${token.hp.max} ${token.veiculo ? 'SDP' : 'HP'}</span>
        ${editaHp ? '<button class="botao vazado pequeno" data-hp="1" type="button">+1</button><button class="botao vazado pequeno" data-hp="5" type="button">+5</button>' : ''}</div>
        <div class="hp-barra"><i style="width:${fracao * 100}%;background:${fracao > 0.5 ? 'var(--g)' : fracao > 0 ? '#ff8a3d' : 'var(--r)'}"></i></div></div>`);
    }
    if (token.estado) partes.push(`<div class="estado ${woundClass(token.estado)}">${esc(token.estado)}${token.estado === 'Gravemente Ferido' ? ' · −2 em tudo' : token.estado === 'Mortalmente Ferido' ? ' · −4 em tudo, Death Save no turno' : ''}</div>`);
    const estados = [token.morto ? '<span class="tag falha">Morto</span>' : '', token.suprimido ? '<span class="tag lesao">Suprimido</span>' : '',
      token.inconsciente ? '<span class="tag falha" title="Não age nem esquiva.">Inconsciente</span>' : '', token.caido ? '<span class="tag lesao" title="Levante-se (uma Ação) antes de andar.">Caído</span>' : '',
      token.agarrao ? `<span class="tag lesao" title="−2 em todas as ações para os dois.">${esc(textoDoAgarrao(token))}</span>` : ''].filter(Boolean);
    if (estados.length) partes.push(`<div>${estados.join('')}</div>`);
    if (gm() || token.meu) partes.push(htmlDaFichaDeCombate(token));
    if (gm() || token.meu) partes.push(htmlDaNet(token));
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
    const daLuta = htmlDaLuta(token);
    if (daLuta) partes.push(daLuta);
    const doVeiculo = htmlDoVeiculo(token);
    if (doVeiculo) partes.push(doVeiculo);
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
    cartao: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6 16c.6-1.5 1.7-2 3-2s2.4.5 3 2M14 10h4M14 13h3"/></svg>',
    // A luta (M9b): levantar-se e escapar do agarrão.
    levantar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20V6M6 11l6-6 6 6M5 21h14"/></svg>',
    corrente: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 14.5l-2 2a3 3 0 0 1-4-4l3-3a3 3 0 0 1 4 0M14.5 9.5l2-2a3 3 0 0 1 4 4l-3 3a3 3 0 0 1-4 0M4 4l3 3M20 20l-3-3"/></svg>',
    // As do Painel Tático.
    coracao: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/><path d="M5 12h4l1.5-3 2 6 1.5-3H19"/></svg>',
    alfinete: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l-1 6 3 3H7l3-3zM12 12v9"/></svg>',
    retrato: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="1"/><circle cx="12" cy="10" r="3"/><path d="M7 19c1-3 2.8-4 5-4s4 1 5 4"/></svg>',
    chave: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 6.5a4 4 0 0 0 5 5l-9 9a2.1 2.1 0 0 1-3-3l9-9a4 4 0 0 0-2-2z"/></svg>',
    paleta: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 0 0 0 18c1.1 0 1.6-.9 1.2-1.8-.5-1-.2-2.2 1.3-2.2H17a4 4 0 0 0 4-4c0-5.5-4-10-9-10z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="14.5" cy="7" r="1"/></svg>'
  };
  function renderHud() {
    const hud = $('#hud');
    const token = S.selecionado && S.tokens.get(S.selecionado);
    // Sem token, ou o Painel Tático aberto mostrando ele: o HUD não aparece.
    if (!token || painelMostra(token.id)) { hud.hidden = true; hud.dataset.token = ''; return; }
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
    // A luta (M9b): o que urge no seu token (o resto fica no cartão).
    const daLuta = (acao, titulo, icone) => `<button type="button" data-luta="${acao}" class="ativo" title="${esc(titulo)}" aria-label="${esc(titulo)}">${ICONE[icone]}</button>`;
    if (meu && !token.morto && !token.inconsciente && token.caido) acoes.push(daLuta('levantar', 'Levantar-se (uma Ação)', 'levantar'));
    if (meu && !token.morto && !token.inconsciente && token.agarrao && token.agarrao.papel === 'agarrado') acoes.push(daLuta('escapar', 'Escapar do agarrão (uma Ação)', 'corrente'));
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
        ${htmlDaArmaLargada(arma)}${htmlDaRecarga(token, arma)}${htmlDe2077(token, arma)}</li>`).join('')}</ul>`);
    }
    return linhas.length ? `<div class="ficha-combate">${linhas.join('')}</div>` : '';
  }
  // A arma que saiu da mão (M9b): a arremessada ou a que caiu no desarme fica no chão até pegar (uma Ação); a que ficou com
  // outro, só o mestre devolve.
  function htmlDaArmaLargada(arma) {
    if (!arma.largada) return '';
    const pode = !arma.com || gm();
    return `<span class="tag lesao">${arma.com ? `com ${esc(arma.com)}` : 'no chão'}</span>${pode ? `<button class="link" type="button" data-arma-acao="pegar" data-arma="${esc(arma.id)}" title="${arma.com ? 'Devolver a arma (o mestre).' : 'Pegar a arma do chão (uma Ação).'}">${arma.com ? 'devolver' : 'pegar'}</button>` : ''}`;
  }
  // "Agarrando o Guarda-costas · escudo humano", "Agarrado pela Nyx · Aperto de ferro".
  function textoDoAgarrao(token) {
    const ag = token.agarrao;
    if (!ag) return '';
    const outro = S.tokens.get(ag.outro);
    const nome = outro ? outro.nome : 'alguém';
    const extras = [ag.escudo ? (Number.isFinite(ag.escudoHp) ? `atrás do corpo (escudo com ${ag.escudoHp} HP)` : 'escudo humano') : '', ag.apertoDeFerro ? 'Aperto de ferro' : ''].filter(Boolean);
    return `${ag.papel === 'agarrando' ? `Agarrando ${nome}` : `Agarrado por ${nome}`}${extras.length ? ` · ${extras.join(' · ')}` : ''}`;
  }
  // A luta (M9b) no cartão: o agarrão (estrangular, derrubar, o escudo humano, soltar; escapar), levantar-se e os
  // movimentos das Artes Marciais que não pedem alvo (os que pedem ficam no Atacar, com a arma da forma). O mestre marca
  // caído e inconsciente.
  const movimentosDe = token => (token.luta && token.luta.movimentos) || [];
  function htmlDoRequisito(m, alvo = null) {
    if (m.bloqueio) return `✗ ${m.bloqueio}`;
    if (!m.requisito) return '';
    if (m.pronto === null) return `Pede: ${m.requisito} Fora do combate, você confirma.`;
    const ok = m.alvo ? (m.alvos || []).includes(alvo) : m.pronto;
    return ok ? `✓ ${m.requisito}` : `✗ ${m.falta || `Pede: ${m.requisito}`}`;
  }
  function htmlDaLuta(token) {
    if (!(gm() || token.meu) || token.morto) return '';
    const botao = (acao, texto, dica, classe = 'vazado') => `<button class="botao ${classe} pequeno" type="button" data-luta="${acao}" title="${esc(dica)}">${esc(texto)}</button>`;
    const doMovimento = id => {
      const m = movimentosDe(token).find(item => item.id === id);
      if (!m) return '';
      const falta = Boolean(m.bloqueio) || m.pronto === false;
      return `<button class="botao vazado pequeno${falta ? ' apagado' : ''}" type="button" data-movimento="${esc(m.id)}" title="${esc(`${m.efeito} ${htmlDoRequisito(m)}`.trim())}">${esc(m.nome)} (DV ${m.dv})</button>`;
    };
    const botoes = [];
    const ag = token.agarrao;
    const outro = ag && S.tokens.get(ag.outro);
    if (!token.inconsciente) {
      if (ag && ag.papel === 'agarrando') {
        botoes.push(botao('estrangular', 'Estrangular', 'Uma Ação: o seu BODY direto no HP, sem a armadura. Abaixo de 0, fica com 1 e desmaia; três rodadas seguidas, desmaia.'));
        botoes.push(botao('derrubar', 'Derrubar', 'Uma Ação: o seu BODY direto no HP, sem a armadura; cai, e o agarrão acaba.'));
        botoes.push(botao('escudo', ag.escudo ? 'Largar o escudo' : 'Escudo humano', ag.escudo ? 'Parar de usar quem você agarra como escudo.' : 'Uma Ação: os tiros em você vão em quem você agarra, que não esquiva (não o corpo a corpo, nem o tiro mirado na cabeça).', ag.escudo ? 'vazado ativo' : 'vazado'));
        if (!(outro && outro.agarrao && outro.agarrao.apertoDeFerro)) botoes.push(doMovimento('apertoDeFerro'));
      }
      if (ag && ag.papel === 'agarrado') {
        botoes.push(botao('escapar', 'Escapar', `Uma Ação: DEX + Briga contra quem o segura (o empate é dele)${ag.apertoDeFerro ? '; o Aperto de ferro tira mais 2' : ''}.`));
        botoes.push(doMovimento('escapeDeAgarrao'));
      }
      if (token.caido) {
        botoes.push(botao('levantar', 'Levantar-se', 'Uma Ação.'));
        botoes.push(doMovimento('recuperacao'));
      }
    }
    if (ag && (ag.papel === 'agarrando' || gm())) botoes.push(botao('soltar', 'Soltar', 'Quem agarra solta quando quiser.'));
    const marcas = gm() ? `<div class="cartao-acoes"><button class="link" type="button" data-luta="caido">${token.caido ? 'não está caído' : 'marcar caído'}</button>
      <button class="link" type="button" data-luta="inconsciente">${token.inconsciente ? 'acordou' : 'marcar inconsciente'}</button></div>` : '';
    const lista = botoes.filter(Boolean);
    if (!lista.length && !marcas) return '';
    return `<div class="luta-cartao"><div class="grupo-npc">Luta</div>${lista.length ? `<div class="cartao-acoes">${lista.join('')}</div>` : ''}${marcas}</div>`;
  }
  // O requisito "neste turno" de um movimento, antes de pedir: no combate, a mesa confere (o mestre confirma por cima);
  // fora dele, quem age confirma. Devolve true (confirmado), false (não precisa) ou null (não vai).
  function confirmarRequisito(token, id, alvo = null) {
    const m = movimentosDe(token).find(item => item.id === id);
    if (!m || !m.requisito) return false;
    if (m.pronto === null) return confirm(`${m.nome} pede: ${m.requisito}\n\nFora do combate, a mesa não confere. Aconteceu?`) ? true : null;
    const ok = m.alvo ? (m.alvos || []).includes(alvo) : m.pronto;
    if (ok) return false;
    if (gm()) return confirm(`${m.nome}: o registro do turno não mostra o requisito (${m.falta || m.requisito}).\n\nConfirmar como mestre (um acerto resolvido à mão)?`) ? true : null;
    aviso(`${m.nome}: ${m.falta || m.requisito}`, 'erro');
    return null;
  }
  async function fazerMovimento(token, id, extra = {}) {
    const confirmado = confirmarRequisito(token, id, extra.alvo || null);
    if (confirmado === null) return null;
    return op('luta.movimento', { token: token.id, movimento: id, ...extra, ...(confirmado ? { confirmado: true } : {}) }).catch(() => null);
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
  const R_GOLPES = new Set(['quebraOssos', 'pontoDePressao', 'voadora']);
  const EXPLOSIVO = new Set(['grenadeLauncher', 'rocketLauncher', 'thrownWeapon']);
  const LINHA_DV = { medPistol: 'pistol', heavyPistol: 'pistol', vHeavyPistol: 'pistol', smg: 'smg', heavySmg: 'smg', assaultRifle: 'assault', shotgun: 'shotgun', sniperRifle: 'sniper', bow: 'bow', grenadeLauncher: 'grenade', thrownWeapon: 'grenade', rocketLauncher: 'rocket' };
  const NOME_MODO = {
    tiro: 'Tiro', mirado: 'Mirado', ricochete: 'Ricochete', autofogo: 'Autofogo', supressivo: 'Supressivo', cartucho: 'Cartucho', corpo: 'Corpo a corpo', explosivo: 'Explosivo',
    arremesso: 'Arremessar', quebraOssos: 'Quebra-ossos', pontoDePressao: 'Ponto de pressão', voadora: 'Voadora',
    agarrar: 'Agarrar', desarmeCombinado: 'Desarme', quebraArmadura: 'Quebra-armadura', contraQueda: 'Contra-queda'
  };
  // A luta (M9b): a arma de cada forma de Artes Marciais vem do servidor (token.luta.artes), como a Briga vem daqui.
  const armasDe = token => [...(token.armas || []), { id: 'briga', nome: 'Desarmado (briga)', classe: 'briga', dano: 'pelo BODY', pente: null }, ...((token.luta && token.luta.artes) || [])];
  // Os modos vêm do servidor com a arma (as de 2077 têm os delas); sem eles, pela classe.
  const modosDe = arma => (Array.isArray(arma.modos) && arma.modos.length ? arma.modos
    : CORPO.has(arma.classe) ? ['corpo'] : EXPLOSIVO.has(arma.classe) ? ['explosivo'] : AUTOFOGO.has(arma.classe) ? ['tiro', 'mirado', 'autofogo', 'supressivo'] : ['tiro', 'mirado']);
  // O que não é ataque mas escolhe um alvo do mesmo jeito: o agarrão (na Briga) e os movimentos das Artes Marciais com alvo
  // (na arma da forma deles). Vão pela luta (mesa-luta.js).
  const MODOS_DA_LUTA = new Set(['agarrar', 'desarmeCombinado', 'quebraArmadura', 'contraQueda']);
  function modosDoAtaque(token, arma) {
    const modos = [...modosDe(arma)];
    if (arma.id === 'briga' && !token.agarrao) modos.push('agarrar');
    if (arma.classe === 'artesMarciais') for (const m of movimentosDe(token)) if (m.alvo && m.forma === arma.forma) modos.push(m.id);
    return modos;
  }
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
    const modos = modosDoAtaque(token, arma);
    if (!modos.includes(at.modo)) at.modo = modos[0];
    const alvos = [...S.tokens.values()].filter(item => item.id !== token.id && !item.morto)
      .map(item => ({ item, metros: medir(token, item).metros })).sort((a, b) => a.metros - b.metros);
    if (!alvos.some(({ item }) => item.id === at.alvo)) at.alvo = alvos.length ? alvos[0].item.id : '';
    const alvo = S.tokens.get(at.alvo);
    const kit = arma.kit || null;
    let previa = '';
    const movimento = movimentosDe(token).find(item => item.id === at.modo) || null;
    const corpoAte = at.modo === 'voadora' ? 4 : 2;
    if (at.modo === 'supressivo') previa = 'Todos a até 25 m rolam WILL + Concentração contra o seu ataque. 10 balas.';
    else if (alvo) {
      const metros = medir(token, alvo).metros;
      const longe = metros > Math.max(corpoAte, grade().metros) ? `${metros} m: longe demais (até ${corpoAte} m)` : '';
      if (at.modo === 'corpo') previa = longe || `${metros} m · o alvo esquiva (DEX + Evasão)`;
      else if (at.modo === 'agarrar') previa = longe || `${metros} m · os dois rolam DEX + Briga; o empate é de quem resiste. Agarrados, −2 em tudo para os dois.`;
      else if (movimento && (movimento.golpe || MODOS_DA_LUTA.has(at.modo))) {
        const requisito = htmlDoRequisito(movimento, alvo.id);
        previa = [longe || `${metros} m`, movimento.golpe ? 'o alvo esquiva (DEX + Evasão)' : `DV ${movimento.dv}`, movimento.efeito, requisito].filter(Boolean).join(' · ');
      } else if (at.modo === 'arremesso') {
        const dv = metros > 25 ? null : dvPrevia('thrownWeapon', metros);
        previa = `${metros} m · DEX + Atletismo · ${dv === null ? 'longe demais (até 25 m)' : `DV ${dv}`} · a arma fica no chão${CORPO.has(arma.classe) ? '; arremessada, não ignora metade do SP' : ''}`;
      } else if (at.modo === 'cartucho') previa = `DV 13 · se acertar, 3d6 em todos à sua frente até 6 m e à vista, na direção de ${alvo.nome}`;
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
      ${at.modo === 'quebraOssos' || at.modo === 'pontoDePressao' ? `<div class="segmentado" role="radiogroup" aria-label="Onde">${[['corpo', 'Corpo'], ['cabeca', 'Cabeça (−8)']].map(([valor, nome]) => `<button type="button" data-at-golpe="${valor}" class="${(at.golpe || 'corpo') === valor ? 'ativo' : ''}">${nome}</button>`).join('')}</div>` : ''}
      ${at.modo === 'desarmeCombinado' ? `<div class="segmentado" role="radiogroup" aria-label="O objeto">${[['ficar', 'Fica com você'], ['cair', 'Cai']].map(([valor, nome]) => `<button type="button" data-at-desarme="${valor}" class="${(at.desarme || 'ficar') === valor ? 'ativo' : ''}">${nome}</button>`).join('')}</div>` : ''}
      ${at.modo === 'supressivo' ? '' : `<div class="campo-linha"><label class="campo cresce">Alvo <select data-at="alvo">${alvos.map(({ item, metros }) => `<option value="${esc(item.id)}"${item.id === at.alvo ? ' selected' : ''}>${esc(item.nome)} · ${metros} m</option>`).join('') || '<option value="">Ninguém na cena</option>'}</select></label>
        <button class="botao vazado pequeno" type="button" data-at="mapa">${S.escolhendoAlvo ? 'Clique no alvo…' : 'No mapa'}</button></div>`}
      ${segundos ? `<label class="campo">Segundo alvo (a até 4 m) <select data-at="alvo2"><option value="">Nenhum</option>${segundos.map(({ item }) => `<option value="${esc(item.id)}"${item.id === at.alvo2 ? ' selected' : ''}>${esc(item.nome)}</option>`).join('')}</select></label>` : ''}
      ${doisCanos ? `<label class="marcar"><input data-at-marcar="doisCanos" type="checkbox"${at.doisCanos ? ' checked' : ''}> Os dois canos (2 cartuchos, 4d6)</label>` : ''}
      <p class="previa">${esc(previa)}</p>
      <div class="campo-linha"><label class="campo mod">Mod <input data-at="mod" type="number" min="-30" max="30" value="${at.mod || 0}"></label>
        ${token.sorte ? `<label class="campo mod">Sorte <input data-at="sorte" type="number" min="0" max="${token.sorte.atual}" value="${at.sorte || 0}"></label>` : ''}
        <button class="botao" type="button" data-at="disparar">${MODOS_DA_LUTA.has(at.modo) ? esc(NOME_MODO[at.modo]) : 'Atacar'}</button></div></div>`;
  }
  async function dispararAtaque(token) {
    const at = S.ataque;
    const ajuste = { mod: Number(at.mod) || 0, sorte: Number(at.sorte) || 0 };
    // O agarrão e os movimentos com alvo vão pela luta; o cartão deles aparece no chat.
    if (MODOS_DA_LUTA.has(at.modo)) {
      const feito = at.modo === 'agarrar' ? await op('luta.agarrar', { token: token.id, alvo: at.alvo, ...ajuste }).catch(() => null)
        : await fazerMovimento(token, at.modo, { alvo: at.alvo, ...(at.modo === 'desarmeCombinado' ? { ficar: at.desarme !== 'cair' } : {}), ...ajuste });
      if (!feito) return;
      at.sorte = 0;
      if (at.modo === 'agarrar') S.ataque = null;
      if (!chatFlutua()) abrirAba('rolagens', { expandir: false });
      return;
    }
    // O golpe com requisito (a Voadora): fora do combate, quem ataca confirma.
    const confirmado = R_GOLPES.has(at.modo) ? confirmarRequisito(token, at.modo) : false;
    if (confirmado === null) return;
    const local = R_GOLPES.has(at.modo) ? at.golpe || 'corpo' : at.local || 'cabeca';
    const resposta = await op('ataque', { atacante: token.id, arma: at.arma, modo: at.modo, local, alvo: at.alvo, alvo2: at.alvo2 || undefined, doisCanos: Boolean(at.doisCanos), ...ajuste, ...(confirmado ? { confirmado: true } : {}) }).catch(() => null);
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
    const golpe = event.target.closest('[data-at-golpe]');
    if (golpe) { S.ataque.golpe = golpe.dataset.atGolpe; renderCartao(); return; }
    const desarme = event.target.closest('[data-at-desarme]');
    if (desarme) { S.ataque.desarme = desarme.dataset.atDesarme; renderCartao(); return; }
    // A luta (M9b): o agarrão, levantar-se, as marcas do mestre e os movimentos sem alvo.
    const luta = event.target.closest('[data-luta]');
    if (luta) {
      const acao = luta.dataset.luta;
      if (acao === 'caido' || acao === 'inconsciente') op('token.estado', { token: token.id, [acao]: !token[acao] }).catch(() => {});
      else if (acao === 'escudo') op('luta.escudo', { token: token.id, ligar: !(token.agarrao && token.agarrao.escudo) }).catch(() => {});
      else op(`luta.${acao}`, { token: token.id }).catch(() => {});
      return;
    }
    const movimento = event.target.closest('[data-movimento]');
    if (movimento) { fazerMovimento(token, movimento.dataset.movimento); return; }
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
    if (tipo === 'embarcar') op('veiculo.embarcar', { token: token.id, veiculo: acao.dataset.veiculo }).catch(() => {});
    if (tipo === 'descer') op('veiculo.descer', { token: acao.dataset.ocupante || token.id }).catch(() => {});
    if (tipo === 'motorista') op('veiculo.motorista', { token: acao.dataset.ocupante || token.id }).catch(() => {});
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
    posicionarPainelTatico();
    redesenhar(); // o HUD do token volta para dentro da área livre
    if (lembrar) store.set('barra', aberta ? 'aberta' : 'recolhida');
  }
  window.matchMedia('(max-width: 820px)').addEventListener('change', () => barraAberta(S.barraAberta, { lembrar: false }));
  const nomeDaAba = nome => (nome === 'fichas' ? (gm() ? 'Fichas' : 'Personagem') : { rolagens: 'Chat', combate: 'Combate', token: 'Token', audio: 'Áudio', cena: 'Cena', net: 'NET' }[nome] || '');
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
    renderNetPainel();
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
    else if (id === S.painel.mostra || (!S.painel.mostra && !gm())) renderPainelTatico();
    const tokens = [...S.tokens.values()];
    if (mudou('quem', JSON.stringify(fontesDeRolagem()))) renderRolarQuem();
    if (runsDaCena().some(run => run.corredores.some(corredor => corredor.token === id))) renderNetruns();
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
        // O escudo humano (M9b): o agarrado recebe no lugar de quem o segura; morto, o corpo segura o dano até quebrar.
        if (alvo.escudoDe) defesa = `escudo humano de ${esc(alvo.escudoDe)}, não esquiva; ${defesa}`;
        const caiu = alvo.derrubado ? ` <span class="tag lesao">Caiu${alvo.derrubado === 'veiculo' ? ' (e sai da moto ou do veículo aberto: o mestre desce)' : ''}</span>` : '';
        if (a.modo === 'supressivo') linhas.push(`<div class="reg-alvo"><b>${esc(alvo.nome)}</b>: ${defesa} → ${alvo.acertou ? '<span class="tag lesao">Suprimido</span>' : 'resistiu'}</div>`);
        else if (!alvo.acertou) linhas.push(`<div class="reg-alvo"><b>${esc(alvo.nome)}</b>: ${defesa} → errou</div>`);
        else if (alvo.atrasDoCorpo && alvo.escudo) linhas.push(`<div class="reg-alvo"><b>${esc(alvo.nome)}</b>: atrás do corpo de ${esc(alvo.atrasDoCorpo)} → o escudo segurou ${alvo.escudo.total} (HP ${alvo.escudo.antes} → ${alvo.escudo.depois})${alvo.escudo.quebrou ? '; quebrou, e o agarrão acabou (o resto do dano se perde)' : ''}</div>`);
        else linhas.push(`<div class="reg-alvo"><b>${esc(alvo.nome)}</b>: ${defesa} → pegou. ${contaDoDano(alvo.dano, alvo.multiplicador)}${caiu}</div>${lesoesHtml(alvo.dano && alvo.dano.lesoes)}`);
      }
    }
    const tags = r.partes ? tagsDoCritico(r) : [];
    if (entrada.desfeito) tags.push('<span class="tag secreta">Desfeito</span>');
    return `<li class="ataque${entrada.desfeito ? ' desfeito' : ''}" data-id="${esc(entrada.id)}" style="--cor:${esc(entrada.autor.cor)}">
      <div class="reg-topo"><span><b>${esc(a.atacante)}</b> → ${esc(alvos)}</span><span>${esc(hora(entrada.quando))}</span></div>
      <div class="reg-corpo"><span class="reg-rotulo">${esc(a.descricao || 'Ataque')} · ${esc(a.arma || '')}</span>${r.total !== undefined ? `<span class="reg-total">${r.total}</span>` : ''}</div>
      ${r.partes ? `<div class="reg-conta">${contaDoTeste(r)}</div>` : ''}${tags.length ? `<div>${tags.join('')}</div>` : ''}${linhas.join('')}${botaoDesfazer(entrada)}</li>`;
  }

  // A luta (M9b): quem fez o quê em quem, as rolagens (o teste resistido traz as duas), o que aconteceu e o HP de quem
  // sofreu (o de NPC, só o mestre recebe).
  const TAG_DA_LUTA = { inseguro: 'falha', agarrou: 'sucesso', escapou: 'sucesso', passou: 'sucesso', estrangulou: 'lesao', derrubou: 'lesao', desmaiou: 'falha', resistiu: 'secreta', segurou: 'secreta', falhou: 'falha' };
  const NOME_DO_RESULTADO = { inseguro: 'Insegura', agarrou: 'Agarrou', escapou: 'Escapou', passou: 'Passou', estrangulou: 'Estrangulou', derrubou: 'Derrubou', desmaiou: 'Desmaiou', resistiu: 'Resistiu', segurou: 'Segurou', falhou: 'Não passou' };
  // A NET (M13) usa o mesmo cartão: o que o netrunner fez, a rolagem de Interface e o resultado.
  function htmlLuta(entrada, l = entrada.luta || {}, classe = 'luta') {
    const rolagens = (l.rolagens || []).map(item => {
      const tags = tagsDoCritico(item.rolagem);
      return `<div class="reg-corpo"><span class="reg-rotulo">${esc(item.quem)} · ${esc(item.rotulo)}</span><span class="reg-total">${item.rolagem.total}</span></div>
        <div class="reg-conta">${contaDoTeste(item.rolagem)}</div>${tags.length ? `<div>${tags.join('')}</div>` : ''}`;
    }).join('');
    const hp = l.hp ? ` <small>(HP ${l.hp.antes} → ${l.hp.depois})</small>` : '';
    const tags = [NOME_DO_RESULTADO[l.resultado] ? `<span class="tag ${TAG_DA_LUTA[l.resultado]}">${NOME_DO_RESULTADO[l.resultado]}</span>` : '', entrada.desfeito ? '<span class="tag secreta">Desfeito</span>' : ''].filter(Boolean);
    return `<li class="${classe}${entrada.desfeito ? ' desfeito' : ''}" data-id="${esc(entrada.id)}" style="--cor:${esc(entrada.autor.cor)}">
      <div class="reg-topo"><span><b>${esc(l.quem)}</b>${l.alvo ? ` → ${esc(l.alvo)}` : ''} · ${esc(l.titulo || 'Luta')}</span><span>${esc(hora(entrada.quando))}</span></div>
      ${rolagens}<div class="reg-alvo">${esc(l.frase || '')}${hp}</div>${(l.notas || []).map(nota => `<div class="reg-nota">${esc(nota)}</div>`).join('')}
      ${tags.length ? `<div>${tags.join('')}</div>` : ''}${botaoDesfazer(entrada)}</li>`;
  }

  function htmlEntrada(entrada) {
    if (entrada.tipo === 'sistema') return `<li class="sistema" data-id="${esc(entrada.id)}">${esc(hora(entrada.quando))} · ${esc(entrada.texto)}</li>`;
    if (entrada.tipo === 'luta') return htmlLuta(entrada);
    if (entrada.tipo === 'net') return htmlLuta(entrada, entrada.net || {}, 'luta net');
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
    } else if (r.tipo === 'instalacao') {
      // A instalação de cyberware: o total é a Humanidade perdida.
      conta = esc(r.conta || '');
      for (const texto of r.avisos || []) tags.push(`<span class="tag falha">${esc(texto)}</span>`);
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
    // A luta (o cartão do token pede, o chat está fora de vista): o que aconteceu vira aviso.
    if (entrada.tipo === 'luta' && entrada.autor.meu && entrada.luta && !chatFlutua() && !abaVisivel('rolagens')) aviso(entrada.luta.frase, 'destaque');
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
  // O cyberware que a loja entregou na mesa da wiki: o mestre escolhe onde instalar (do mínimo da peça ao hospital), se
  // cobra o lugar e como perde a Humanidade; o jogador vê o que espera e o que já está instalado.
  const NOME_DA_PERDA = { rolar: 'Rolar', fixa: 'Fixa', nenhuma: 'Nenhuma' };
  function htmlDoCyber(ficha) {
    const pecas = (ficha.jogo && ficha.jogo.cyber) || [];
    if (!pecas.length) return '';
    const mestre = gm();
    const linha = peca => {
      if (peca.instalado) return `<li class="uso-equipado"><span class="info"><b>${esc(peca.nome)}</b><small>instalado${peca.lugar ? ` · ${esc((peca.lugares.find(lugar => lugar.id === peca.lugar) || {}).onde || '')}` : ''} · Humanidade −${peca.perda}</small></span></li>`;
      const perda = peca.rolagem === '0' ? 'não perde Humanidade' : `perde ${peca.rolagem} de Humanidade (fixa ${peca.hl})`;
      if (!mestre) return `<li><span class="info"><b>${esc(peca.nome)}</b><small>esperando o mestre instalar · ${esc(perda)}</small></span></li>`;
      return `<li class="instalar-linha"><form class="instalar" data-instalar="${esc(peca.id)}" data-ficha="${esc(ficha.id)}" data-nome="${esc(peca.nome)}" data-rolagem="${esc(peca.rolagem)}">
          <span class="info"><b>${esc(peca.nome)}</b><small>${esc(perda)}${peca.borg ? ' · borgware: máxima −4' : peca.hl > 0 ? ' · máxima −2' : ''}</small></span>
          ${peca.lugares.length ? `<label class="campo">Onde <select name="lugar">${peca.lugares.map(lugar => `<option value="${esc(lugar.id)}" data-onde="${esc(lugar.onde)}" data-custo="${lugar.custo}">${esc(lugar.nome[0].toUpperCase() + lugar.nome.slice(1))} · DV${lugar.dv} · ${eb(lugar.custo)}</option>`).join('')}</select></label>` : '<p class="nota">Sem cirurgia: encaixa no soquete de chipware.</p>'}
          <div class="campo-linha"><label class="campo">Perda <select name="perda">${Object.entries(NOME_DA_PERDA).map(([valor, nome]) => `<option value="${valor}">${nome}${valor === 'rolar' ? ` ${esc(peca.rolagem)}` : valor === 'fixa' ? ` ${peca.hl}` : ''}</option>`).join('')}</select></label>
            ${peca.lugares.length ? '<label class="marcar" title="Cobrar do personagem o preço do lugar"><input name="cobrar" type="checkbox" checked> Cobrar</label>' : ''}<button class="botao pequeno" type="submit">Instalar</button></div></form></li>`;
    };
    return `<div class="grupo-npc">Cyberware da loja</div><ul class="inventario">${pecas.map(linha).join('')}</ul>
      ${mestre && pecas.some(peca => !peca.instalado) ? '<p class="nota">Sem cobrar: quando o Medtech do grupo instala (ele rola Cirurgia contra a DV) ou já foi pago.</p>' : ''}`;
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
    if (caixa.contains(document.activeElement) && document.activeElement.matches('.ajuste input, .ajuste select, input.qtd, .instalar select')) { S.fichasPendentes = true; return; }
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
              ${aberta ? `<li class="ficha-aberta"><div><button class="botao vazado pequeno" type="button" data-retrato="${esc(ficha.id)}">Retrato do painel</button></div>${htmlDosNumeros(ficha)}${htmlDoAjuste(ficha)}${htmlDoInventario(ficha)}${htmlDoCyber(ficha)}${htmlDoExtrato(ficha)}</li>` : ''}`;
          }).join('')}</ul>` : '<p class="nota">Nenhum personagem nesta campanha ainda.</p>'}</div>
        <div class="bloco"><div class="bloco-topo"><h3>Fichas de NPC</h3><button class="botao pequeno" type="button" data-npc-novo>Novo NPC</button></div>
          <input id="npc-busca" class="busca" type="search" placeholder="Buscar (Tyger, netrunner, Kit…)" value="${esc(filtro)}">
          <label class="marcar"><input id="npc-escondido" type="checkbox"${escondidos ? ' checked' : ''}> Entram escondidos (você revela na hora)</label>
          ${grupos.map(grupo => `<div class="grupo-npc">${esc(grupo)}</div><ul class="lista">${npcs.filter(npc => npc.grupo === grupo).map(npc => `<li><span class="info"><b>${esc(npc.nome)}</b><small>${npc.proprio ? `${npc.tipo && npc.tipo !== 'pessoa' ? `${TIPOS_DE_NPC[npc.tipo]} · ` : ''}seu · ` : ''}${npc.tipo === 'veiculo' ? 'SDP' : npc.tipo === 'ice' ? 'REZ' : 'HP'} ${npc.hp} · ${npc.tipo === 'ice' ? 'SPD' : 'REF'} ${npc.ref} · MOVE ${npc.move}${npc.pagina ? ` · p. ${npc.pagina}` : ''}</small></span>
            ${npc.proprio ? `<button class="botao vazado pequeno" type="button" data-npc-editar="${esc(npc.id)}">Editar</button>` : `<button class="botao vazado pequeno" type="button" data-npc-copiar="${esc(npc.id)}" title="Uma cópia sua desta ficha, para mudar">Copiar</button>`}
            <button class="botao pequeno" type="button" data-por-npc="${esc(npc.id)}"${S.cena ? '' : ' disabled'}>Pôr</button></li>`).join('')}</ul>`).join('') || '<p class="nota">Nenhuma ficha encontrada.</p>'}</div>
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
      return `<div class="bloco"><div class="cartao-topo"><span class="avatar" ${foto} style="width:52px;height:52px">${ficha.retrato ? '' : esc(initials(ficha.nome))}</span><div><h3>${esc(ficha.nome)}</h3><small>${hp ? `HP ${hp.atual}/${hp.max}` : ''}${token ? ' · na cena' : ' · fora da cena'}</small></div><button class="botao vazado pequeno" type="button" data-retrato="${esc(ficha.id)}">Retrato do painel</button></div>
        <div class="ficha-stats">${['INT', 'REF', 'DEX', 'TECH', 'COOL', 'WILL', 'LUCK', 'MOVE', 'BODY', 'EMP'].map(stat => `<div><b>${ficha.stats[stat] ?? '—'}</b><small>${stat}</small></div>`).join('')}</div>
        ${htmlDosNumeros(ficha)}
        <p class="nota">Toque numa perícia para rolar (STAT + perícia + 1d10).</p>
        <ul class="pericias">${(ficha.pericias || []).map(item => `<li><button type="button" data-pericia="${esc(item.nome)}" data-ficha="${esc(ficha.id)}"><span>${esc(item.pt)}<small>${esc(item.stat)} ${ficha.stats[item.stat] ?? 0} + ${item.nivel}</small></span><b>${item.base}</b></button></li>`).join('')}</ul>
        <h3>Inventário</h3>${htmlDoInventario(ficha)}${htmlDoCyber(ficha)}${htmlDoExtrato(ficha)}</div>`;
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
    if (botao.dataset.retrato) abrirRetrato(botao.dataset.retrato);
    if (botao.hasAttribute('data-npc-novo')) abrirNpc(null);
    if (botao.dataset.npcEditar) abrirNpc(botao.dataset.npcEditar);
    if (botao.dataset.npcCopiar) op('npc.copiar', { de: botao.dataset.npcCopiar }).then(data => { S.npcEditando = data.resultado.id; S.npcMidia = undefined; renderNpcJanela(); }).catch(() => {});
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
    const instalar = event.target.closest('form.instalar');
    if (instalar) {
      event.preventDefault();
      const dados = new FormData(instalar);
      const escolha = instalar.querySelector('[name="lugar"]');
      const lugar = escolha ? escolha.selectedOptions[0].dataset : { onde: 'sem cirurgia', custo: 0 };
      const perda = dados.get('perda');
      const cobrar = dados.get('cobrar') === 'on';
      const texto = `Instalar ${instalar.dataset.nome} ${lugar.onde}${!escolha ? '' : cobrar ? `, cobrando ${eb(lugar.custo)}` : ', sem cobrar'}, ${perda === 'nenhuma' || instalar.dataset.rolagem === '0' ? 'sem perder Humanidade' : perda === 'rolar' ? `rolando ${instalar.dataset.rolagem} de Humanidade` : 'com a perda fixa de Humanidade'}? Não dá para desfazer.`;
      if (!confirm(texto)) return;
      op('cyber.instalar', { personagem: instalar.dataset.ficha, item: instalar.dataset.instalar, lugar: dados.get('lugar') || '', perda, cobrar })
        .then(() => { if (instalar.contains(document.activeElement)) document.activeElement.blur(); renderFichas(); }).catch(() => {});
      return;
    }
    const form = event.target.closest('form.ajuste');
    if (!form) return;
    event.preventDefault();
    const dados = new FormData(form);
    op('personagem.ajustar', { personagem: form.dataset.ajuste, campo: dados.get('campo'), delta: Number(dados.get('delta')) || 0, motivo: String(dados.get('motivo') || '') })
      .then(() => { if (form.contains(document.activeElement)) document.activeElement.blur(); renderFichas(); }).catch(() => {});
  });
  // Saiu do campo que segurava a ficha: redesenha com o que chegou enquanto digitava.
  $('#fichas').addEventListener('focusout', () => { if (S.fichasPendentes) setTimeout(() => { if (S.fichasPendentes) renderFichas(); }, 0); });

  // ---------------- Painel Tático: o retrato de cada estado (M14) ----------------
  // O retrato do personagem no painel: uma imagem para cada estado de ferimento (arquivos da mesa), com o tamanho, o
  // deslocamento e o espelho. O dono configura (o mestre também); fica na mesa da campanha e vem com a ficha (painel).
  // As contas são as do mesa-painel.js, as mesmas do módulo do Foundry.
  const MP = window.MesaPainel;
  const fichaDoPersonagem = id => [...S.personagens, ...S.meus].find(ficha => ficha.id === id) || null;
  // Tudo o que é preciso para desenhar o retrato agora. reserva: o retrato da ficha da wiki (sem imagem do painel).
  function vistaDoRetrato(retrato, estado, reserva = '', efeitos = 'semImagem') {
    const r = MP.normalizarRetrato(retrato);
    const imagem = MP.imagemDoEstado(r.imagens, estado, reserva);
    return { ...r, estado, nomeDoEstado: MP.NOMES_DOS_ESTADOS[estado], src: imagem.midia ? urlDaMidia(imagem.midia) : imagem.reserva, propria: imagem.propria, modo: MP.modoDoRetrato(r),
      efeito: MP.efeitoDoRetrato({ estado, propria: imagem.propria, modo: efeitos }) };
  }
  // Livre: a imagem em pé sobre a barra, com o tamanho e o deslocamento do dono. Moldura: a imagem preenche o quadro.
  // trocou: a imagem ou o estado mudaram desde o último desenho (só então a troca anima). Sem imagem: as iniciais.
  function htmlDoRetrato(vista, { trocou = false, nome = '' } = {}) {
    const livre = vista.modo === 'livre';
    const estilo = livre
      ? `height: ${vista.escala}%; transform: translate(calc(-50% + ${vista.x}px), ${-vista.y}px)${vista.espelhar ? ' scaleX(-1)' : ''};`
      : (vista.espelhar ? 'transform: scaleX(-1);' : '');
    return `<div class="pt-retrato pt-retrato-${vista.modo}${vista.efeito ? ` pt-efeito-${vista.efeito}` : ''}${trocou ? ' pt-trocou' : ''}" data-estado="${vista.estado}">
      ${vista.src ? `<img class="pt-retrato-img" src="${esc(vista.src)}" alt="" draggable="false" style="${estilo}">` : `<span class="pt-retrato-iniciais">${esc(initials(nome || '?'))}</span>`}
      ${vista.estado === 'dead' ? '<span class="pt-flatline">FLATLINE</span>' : ''}
    </div>`;
  }
  // O estado de agora do personagem: o do token dele na cena (o HP e o Death Save), ou o da ficha.
  function estadoDoPersonagem(ficha) {
    const token = [...S.tokens.values()].find(item => item.personagem === ficha.id);
    if (token) return MP.estadoDoRetrato({ estado: token.estado, morto: token.morto });
    const hp = ficha.hp;
    if (!hp || !hp.max) return 'notWounded';
    return MP.estadoDoRetrato({ estado: hp.atual < 1 ? 'mortallyWounded' : hp.atual < Math.ceil(hp.max / 2) ? 'seriouslyWounded' : hp.atual < hp.max ? 'lightlyWounded' : 'notWounded' });
  }

  // A janela do retrato (o botão Retrato do painel na ficha, ou no painel): a prévia com a barra embaixo, os cinco
  // estados com a imagem de cada um e os ajustes. Nada grava até Salvar.
  function abrirRetrato(id) {
    const ficha = fichaDoPersonagem(id);
    if (!ficha) return;
    S.retrato = { id, rascunho: MP.normalizarRetrato(ficha.painel), estado: estadoDoPersonagem(ficha) };
    renderRetratoJanela();
  }
  function fecharRetrato() {
    S.retrato = null;
    const janela = $('#retrato-janela');
    janela.hidden = true;
    janela.innerHTML = '';
  }
  const previaDoRetrato = (ficha, r, estado) => `${htmlDoRetrato(vistaDoRetrato(r, estado, ficha.retrato, estiloDoPainel().efeitos), { nome: ficha.nome })}
    <div class="pt-rc-barra"><b>${esc(ficha.apelido || ficha.nome)}</b><span>${MP.NOMES_DOS_ESTADOS[estado]}</span></div>`;
  function renderRetratoJanela() {
    const janela = $('#retrato-janela');
    const ficha = S.retrato && fichaDoPersonagem(S.retrato.id);
    if (!ficha) { fecharRetrato(); return; }
    const { rascunho: r, estado } = S.retrato;
    const linhas = MP.ESTADOS.map(cada => {
      const efetiva = MP.imagemDoEstado(r.imagens, cada, ficha.retrato);
      const usa = cada === 'notWounded' ? (r.imagens[cada] ? '' : 'sem imagem: o retrato da ficha') : r.imagens[cada] ? '' : `usa ${efetiva.de ? MP.NOMES_DOS_ESTADOS[efetiva.de] : 'o retrato da ficha'}, com o efeito`;
      const src = efetiva.midia ? urlDaMidia(efetiva.midia) : efetiva.reserva;
      return `<li class="rc-linha${estado === cada ? ' ativa' : ''}">
        <button type="button" class="rc-miniatura" data-rc-ver="${cada}" aria-label="Ver ${MP.NOMES_DOS_ESTADOS[cada]} na prévia">${src ? `<img src="${esc(src)}" alt="">` : ''}</button>
        <span class="rc-nome"><b>${MP.NOMES_DOS_ESTADOS[cada]}</b>${usa ? `<small>${esc(usa)}</small>` : ''}</span>
        <label class="botao vazado pequeno">Imagem<input type="file" accept="image/png,image/jpeg,image/webp" data-rc-imagem="${cada}" hidden></label>
        ${r.imagens[cada] ? `<button type="button" class="link" data-rc-tirar="${cada}" aria-label="Tirar a imagem de ${MP.NOMES_DOS_ESTADOS[cada]}">×</button>` : '<span></span>'}
      </li>`;
    }).join('');
    const faixa = (nome, rotulo, min, max, passo, unidade) => `<label class="campo">${rotulo}<span class="rc-faixa"><input type="range" name="${nome}" min="${min}" max="${max}" step="${passo}" value="${r[nome]}"><output>${r[nome]}${unidade}</output></span></label>`;
    janela.innerHTML = `<form class="rc-form" novalidate>
      <div class="nota-janela-topo"><h2 id="retrato-janela-titulo">Retrato de ${esc(ficha.apelido || ficha.nome)}</h2><button class="nota-janela-fechar" type="button" data-rc-fechar aria-label="Fechar">×</button></div>
      <div class="rc">
        <div class="rc-previa">
          <div class="pt-rc-palco" style="--pt-retrato-altura: 260px">${previaDoRetrato(ficha, r, estado)}</div>
          <div class="rc-estados">${MP.ESTADOS.map(cada => `<button type="button" class="botao vazado pequeno${estado === cada ? ' ativo' : ''}" data-rc-ver="${cada}">${MP.NOMES_DOS_ESTADOS[cada]}</button>`).join('')}</div>
        </div>
        <div class="rc-campos">
          <p class="nota">Uma imagem para cada estado de ferimento: PNG com fundo transparente, de corpo inteiro ou da cintura para cima (umas 600 px de altura bastam). Cada estado é opcional: sem imagem, vale a do estado mais leve, com o efeito automático (tinta, falha de sinal, o cinza do morto).</p>
          <ul class="rc-linhas">${linhas}</ul>
          <div class="rc-ajustes">
            <label class="campo">Modo <select name="modo">
              <option value="auto"${r.modo === 'auto' ? ' selected' : ''}>Automático</option>
              <option value="livre"${r.modo === 'livre' ? ' selected' : ''}>Livre (em pé sobre o painel)</option>
              <option value="moldura"${r.modo === 'moldura' ? ' selected' : ''}>Moldura (dentro do painel)</option>
            </select></label>
            ${faixa('escala', 'Tamanho', 40, 250, 5, '%')}
            ${faixa('x', 'Para os lados', -300, 300, 2, ' px')}
            ${faixa('y', 'Para cima', -300, 300, 2, ' px')}
            <label class="marcar"><input type="checkbox" name="espelhar"${r.espelhar ? ' checked' : ''}> Espelhar</label>
          </div>
        </div>
      </div>
      <div class="nota-janela-acoes"><button class="botao" type="submit">Salvar</button><button class="botao vazado" type="button" data-rc-fechar>Cancelar</button><button class="botao vazado perigo" type="button" data-rc-limpar>Tirar tudo</button></div>
    </form>`;
    janela.hidden = false;
  }
  // Os ajustes do formulário para o rascunho; arrastando um controle, só a prévia muda.
  function lerAjustesDoRetrato(soPrevia) {
    const form = $('#retrato-janela form');
    if (!form || !S.retrato) return;
    const dados = new FormData(form);
    S.retrato.rascunho = MP.normalizarRetrato({ ...S.retrato.rascunho, modo: dados.get('modo'), escala: dados.get('escala'), x: dados.get('x'), y: dados.get('y'), espelhar: dados.get('espelhar') === 'on' });
    for (const campo of form.querySelectorAll('input[type="range"]')) campo.nextElementSibling.textContent = `${campo.value}${campo.name === 'escala' ? '%' : ' px'}`;
    const ficha = fichaDoPersonagem(S.retrato.id);
    if (soPrevia && ficha) form.querySelector('.pt-rc-palco').innerHTML = previaDoRetrato(ficha, S.retrato.rascunho, S.retrato.estado);
    else renderRetratoJanela();
  }
  const retratoJanela = $('#retrato-janela');
  retratoJanela.addEventListener('input', event => { if (event.target.matches('input[type="range"]')) lerAjustesDoRetrato(true); });
  retratoJanela.addEventListener('change', event => {
    const campo = event.target;
    if (campo.dataset.rcImagem) {
      if (!campo.files[0] || !S.retrato) return;
      const estado = campo.dataset.rcImagem;
      enviarMidia(campo.files[0]).then(({ midia }) => {
        if (!S.retrato) return;
        S.retrato.rascunho = MP.normalizarRetrato({ ...S.retrato.rascunho, imagens: { ...S.retrato.rascunho.imagens, [estado]: midia } });
        S.retrato.estado = estado;
        renderRetratoJanela();
      }).catch(error => aviso(error.message, 'erro'));
      return;
    }
    if (campo.matches('[name="modo"], [name="espelhar"], input[type="range"]')) lerAjustesDoRetrato(false);
  });
  retratoJanela.addEventListener('click', event => {
    const botao = event.target.closest('button');
    if (!botao || !S.retrato) return;
    if (botao.hasAttribute('data-rc-fechar')) fecharRetrato();
    else if (botao.dataset.rcVer) { S.retrato.estado = botao.dataset.rcVer; renderRetratoJanela(); }
    else if (botao.dataset.rcTirar) {
      const imagens = { ...S.retrato.rascunho.imagens };
      delete imagens[botao.dataset.rcTirar];
      S.retrato.rascunho = MP.normalizarRetrato({ ...S.retrato.rascunho, imagens });
      renderRetratoJanela();
    } else if (botao.hasAttribute('data-rc-limpar')) { S.retrato.rascunho = MP.normalizarRetrato({}); renderRetratoJanela(); }
  });
  retratoJanela.addEventListener('submit', event => {
    event.preventDefault();
    if (!S.retrato) return;
    const { id, rascunho } = S.retrato;
    const ficha = fichaDoPersonagem(id);
    op('retrato.salvar', { personagem: id, retrato: rascunho }).then(() => { fecharRetrato(); aviso(`Retrato de ${ficha ? ficha.apelido || ficha.nome : 'personagem'} salvo.`); }).catch(() => {});
  });
  retratoJanela.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); fecharRetrato(); } });
  // ---------------- Painel Tático: o estilo de cada um (M14) ----------------
  // O estilo fica neste navegador (cada jogador tem o seu), por cima do padrão da mesa (o mestre escolhe, o servidor
  // guarda). Com a janela aberta, o painel mostra o rascunho na hora; soltar o controle salva.
  const estiloProprio = () => { try { return JSON.parse(store.get('painel:estilo') || 'null'); } catch { return null; } };
  const estiloDoPainel = () => S.estiloPrevia || MP.normalizarEstilo(estiloProprio(), S.estiloDaMesa);
  function salvarEstilo(estilo) {
    store.set('painel:estilo', JSON.stringify(MP.normalizarEstilo(estilo, S.estiloDaMesa)));
    S.estiloPrevia = null;
    renderPainelTatico();
  }
  function abrirEstilo() {
    S.estiloRascunho = estiloDoPainel();
    S.estiloMensagem = '';
    renderEstiloJanela();
  }
  function fecharEstilo() {
    S.estiloRascunho = null;
    S.estiloPrevia = null;
    const janela = $('#estilo-janela');
    janela.hidden = true;
    janela.innerHTML = '';
    renderPainelTatico();
  }
  function renderEstiloJanela() {
    const janela = $('#estilo-janela');
    const e = S.estiloRascunho;
    if (!e) { janela.hidden = true; return; }
    const rolagem = janela.scrollTop;
    const visivel = chave => !e.ocultos.includes(chave);
    const opcoes = (lista, atual) => Object.entries(lista).map(([valor, rotulo]) => `<option value="${valor}"${valor === atual ? ' selected' : ''}>${esc(typeof rotulo === 'string' ? rotulo : rotulo.nome)}</option>`).join('');
    const faixa = (nome, rotulo, min, max, passo, unidade) => `<label class="campo">${rotulo}<span class="rc-faixa"><input type="range" name="${nome}" min="${min}" max="${max}" step="${passo}" value="${e[nome]}" data-unidade="${unidade}"><output>${e[nome]}${unidade}</output></span></label>`;
    const caixa = (nome, rotulo, marcado) => `<label class="marcar"><input type="checkbox" name="${nome}"${marcado ? ' checked' : ''}> ${rotulo}</label>`;
    const temas = Object.entries(MP.TEMAS).map(([chave, t]) => `<button type="button" class="es-tema${e.tema === chave ? ' ativo' : ''}" data-es-tema="${chave}" style="--a: ${t.acento}; --b: ${t.acento2}; --c2: ${t.destaque}; --f: ${t.fundo};"><span class="es-tema-cores"><i></i><i></i><i></i></span>${esc(t.nome)}</button>`).join('');
    const cor = (nome, rotulo) => `<label class="es-cor">${rotulo}<input type="color" name="${nome}" value="${e[nome]}"></label>`;
    const secoes = e.secoes.map((chave, i) => `<li>${caixa(`mostrar-${chave}`, MP.SECOES[chave], visivel(chave))}
        <span><button type="button" class="link" data-es-subir="${chave}"${i === 0 ? ' disabled' : ''} aria-label="Mais para o começo">▲</button><button type="button" class="link" data-es-descer="${chave}"${i === e.secoes.length - 1 ? ' disabled' : ''} aria-label="Mais para o fim">▼</button></span></li>`).join('');
    const proprio = Boolean(estiloProprio());
    janela.innerHTML = `<form class="es-form" novalidate>
      <div class="nota-janela-topo"><h2 id="estilo-janela-titulo">Estilo do painel</h2><button class="nota-janela-fechar" type="button" data-es-fechar aria-label="Fechar">×</button></div>
      <p class="nota">Vale para este navegador. O painel muda na hora.</p>
      <section><h3>Tema</h3><div class="es-temas">${temas}</div>
        <div class="es-cores">${cor('acento', 'Destaque')}${cor('acento2', 'Alerta')}${cor('destaque', 'Realce')}${cor('fundo', 'Fundo')}${cor('texto', 'Texto')}</div>
        ${e.tema === 'personalizado' ? '<p class="nota">Cores suas (escolher um tema troca as cinco).</p>' : ''}</section>
      <section><h3>Aparência</h3>
        <div class="es-grade"><label class="campo">Fonte <select name="fonte">${opcoes(MP.FONTES, e.fonte)}</select></label><label class="campo">Cantos <select name="cantos">${opcoes(MP.CANTOS, e.cantos)}</select></label>
          ${faixa('opacidade', 'Opacidade do fundo', 30, 100, 1, '%')}${faixa('desfoque', 'Desfoque atrás', 0, 20, 1, ' px')}</div>
        <div class="es-linha">${caixa('brilho', 'Brilho neon', e.brilho)}${caixa('scanlines', 'Linhas de varredura', e.scanlines)}${caixa('animacoes', 'Animações', e.animacoes)}${caixa('compacto', 'Compacto', e.compacto)}</div></section>
      <section><h3>Retrato</h3>
        <div class="es-grade">${faixa('retratoAltura', 'Altura do retrato', 120, 560, 10, ' px')}<label class="campo">Lado <select name="retratoLado">${opcoes(MP.LADOS, e.retratoLado)}</select></label>
          <label class="campo es-largo">Efeitos de ferimento <select name="efeitos">${opcoes(MP.EFEITOS, e.efeitos)}</select></label></div>
        <p class="nota">A imagem de cada estado é do personagem: o dono troca pelo botão de retrato do painel.</p></section>
      <section><h3>Tamanho e posição</h3>
        <div class="es-grade">${faixa('escala', 'Tamanho do painel', 50, 160, 5, '%')}
          <label class="campo">Posição <select name="posicao"><option value="base"${e.posicao === 'base' ? ' selected' : ''}>Na base do mapa</option><option value="livre"${e.posicao === 'livre' ? ' selected' : ''}>Onde eu arrastar</option></select></label>
          ${e.posicao === 'base' ? faixa('base', 'Distância da base', 0, 400, 2, ' px') : '<button type="button" class="botao vazado pequeno" data-es-base>Voltar para a base</button>'}</div>
        <p class="nota">Arraste o painel pela alça ⋮⋮; dois cliques nela voltam para a base.</p></section>
      <section><h3>Seções e peças</h3>
        <ol class="es-secoes">${secoes}</ol>
        <div class="es-pecas">${Object.entries(MP.PECAS).map(([chave, rotulo]) => caixa(`mostrar-${chave}`, rotulo, visivel(chave))).join('')}</div>
        <label class="campo">Botões de HP <input type="text" name="passosHp" value="${esc(e.passosHp)}" placeholder="-5 -1 +1 +5"></label></section>
      <section><h3>Compartilhar</h3>
        <p class="nota">Copie o código e mande para outro jogador; ele cola aqui. Leva o visual, não a posição. O código do Painel Tático do Foundry também serve.</p>
        <textarea class="es-codigo" readonly rows="2">${esc(MP.codigoDoEstilo(e))}</textarea>
        <div class="es-linha"><button type="button" class="botao vazado pequeno" data-es-copiar>Copiar código</button></div>
        <textarea name="colado" rows="2" placeholder="Cole aqui um código PT1:…"></textarea>
        <div class="es-linha"><button type="button" class="botao vazado pequeno" data-es-colar>Aplicar o código colado</button>${S.estiloMensagem ? `<span class="nota alerta">${esc(S.estiloMensagem)}</span>` : ''}</div></section>
      <div class="nota-janela-acoes"><button class="botao vazado" type="button" data-es-mesa${proprio ? '' : ' disabled'} title="Esquece o seu estilo e usa o do mestre">Voltar ao padrão da mesa</button>
        ${gm() ? '<button class="botao vazado" type="button" data-es-definir title="Quem não mudou o próprio estilo passa a ver este">Usar como padrão da mesa</button>' : ''}<button class="botao" type="button" data-es-fechar>Fechar</button></div>
    </form>`;
    janela.hidden = false;
    janela.scrollTop = rolagem;
  }
  // Os campos para o rascunho: arrastando, só a prévia (o painel muda na hora); soltando, salva.
  function lerEstilo(salvar) {
    const form = $('#estilo-janela form');
    if (!form || !S.estiloRascunho) return;
    const dados = new FormData(form);
    const ocultos = [...Object.keys(MP.SECOES), ...Object.keys(MP.PECAS)].filter(chave => form.querySelector(`[name="mostrar-${chave}"]`) && !dados.get(`mostrar-${chave}`));
    const cores = ['acento', 'acento2', 'destaque', 'fundo', 'texto'];
    const mudouCor = cores.some(chave => dados.get(chave) && dados.get(chave) !== S.estiloRascunho[chave]);
    const campos = Object.fromEntries([...dados.entries()].filter(([chave]) => !chave.startsWith('mostrar-') && chave !== 'colado'));
    for (const chave of ['brilho', 'scanlines', 'animacoes', 'compacto']) campos[chave] = dados.get(chave) === 'on';
    const novo = MP.normalizarEstilo({ ...S.estiloRascunho, ...campos, ocultos, tema: mudouCor ? 'personalizado' : S.estiloRascunho.tema });
    for (const campo of form.querySelectorAll('input[type="range"]')) campo.nextElementSibling.textContent = `${campo.value}${campo.dataset.unidade}`;
    const redesenhar = novo.posicao !== S.estiloRascunho.posicao || novo.tema !== S.estiloRascunho.tema;
    S.estiloRascunho = novo;
    S.estiloPrevia = novo;
    renderPainelTatico();
    if (!salvar) return;
    salvarEstilo(novo);
    S.estiloPrevia = novo;
    if (redesenhar) renderEstiloJanela();
  }
  function trocarEstilo(mudanca) {
    S.estiloRascunho = MP.normalizarEstilo({ ...S.estiloRascunho, ...mudanca });
    salvarEstilo(S.estiloRascunho);
    S.estiloPrevia = S.estiloRascunho;
    renderEstiloJanela();
  }
  const estiloJanela = $('#estilo-janela');
  estiloJanela.addEventListener('input', event => { if (event.target.name !== 'colado' && event.target.name !== 'passosHp') lerEstilo(false); });
  estiloJanela.addEventListener('change', event => { if (event.target.name !== 'colado') lerEstilo(true); });
  estiloJanela.addEventListener('submit', event => event.preventDefault());
  estiloJanela.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); fecharEstilo(); } });
  estiloJanela.addEventListener('click', event => {
    const botao = event.target.closest('button');
    if (!botao || !S.estiloRascunho) return;
    if (botao.hasAttribute('data-es-fechar')) { fecharEstilo(); return; }
    if (botao.dataset.esTema) { S.estiloRascunho = MP.aplicarTema(S.estiloRascunho, botao.dataset.esTema); trocarEstilo({}); return; }
    const mover = (secao, passo) => {
      const lista = [...S.estiloRascunho.secoes];
      const i = lista.indexOf(secao);
      const j = i + passo;
      if (i < 0 || j < 0 || j >= lista.length) return;
      [lista[i], lista[j]] = [lista[j], lista[i]];
      trocarEstilo({ secoes: lista });
    };
    if (botao.dataset.esSubir) { mover(botao.dataset.esSubir, -1); return; }
    if (botao.dataset.esDescer) { mover(botao.dataset.esDescer, 1); return; }
    if (botao.hasAttribute('data-es-base')) { trocarEstilo({ posicao: 'base', x: null, y: null }); return; }
    if (botao.hasAttribute('data-es-copiar')) {
      const codigo = MP.codigoDoEstilo(S.estiloRascunho);
      const campo = estiloJanela.querySelector('.es-codigo');
      (navigator.clipboard ? navigator.clipboard.writeText(codigo) : Promise.reject()).then(() => aviso('Código do estilo copiado.')).catch(() => { campo.select(); aviso('Selecionei o código: copie com Ctrl+C.'); });
      return;
    }
    if (botao.hasAttribute('data-es-colar')) {
      try {
        S.estiloRascunho = MP.lerCodigo(estiloJanela.querySelector('[name="colado"]').value, S.estiloRascunho);
        S.estiloMensagem = '';
        trocarEstilo({});
        aviso('Estilo aplicado.');
      } catch (error) { S.estiloMensagem = error.message; renderEstiloJanela(); }
      return;
    }
    if (botao.hasAttribute('data-es-mesa')) {
      store.set('painel:estilo', '');
      S.estiloRascunho = MP.normalizarEstilo(null, S.estiloDaMesa);
      S.estiloPrevia = null;
      renderPainelTatico();
      renderEstiloJanela();
      return;
    }
    if (botao.hasAttribute('data-es-definir') && gm()) op('painel.estiloDaMesa', { estilo: S.estiloRascunho }).then(() => aviso('Este é o estilo padrão da mesa agora (para quem não mudou o próprio).')).catch(() => {});
  });
  function receberEstiloDaMesa(data) {
    S.estiloDaMesa = data && data.estilo ? data.estilo : null;
    renderPainelTatico();
  }

  // Arrastar o painel pela alça: ele passa para a posição livre e grava onde ficou. Dois cliques voltam para a base.
  $('#painel-tatico').addEventListener('pointerdown', event => {
    const alca = event.target.closest('.pt-alca');
    if (!alca || event.button !== 0) return;
    event.preventDefault();
    const el = $('#painel-tatico');
    const palco = el.offsetParent.getBoundingClientRect();
    const caixa = el.getBoundingClientRect();
    const inicio = { x: event.clientX, y: event.clientY, esquerda: caixa.left - palco.left, topo: caixa.top - palco.top };
    el.classList.add('pt-arrastando');
    const mover = ev => {
      el.classList.remove('pt-posicao-base');
      el.classList.add('pt-posicao-livre');
      el.style.left = `${inicio.esquerda + ev.clientX - inicio.x}px`;
      el.style.top = `${inicio.topo + ev.clientY - inicio.y}px`;
      el.style.bottom = 'auto';
    };
    const soltar = () => {
      window.removeEventListener('pointermove', mover);
      el.classList.remove('pt-arrastando');
      const agora = el.getBoundingClientRect();
      if (Math.abs(agora.left - caixa.left) < 3 && Math.abs(agora.top - caixa.top) < 3) { posicionarPainelTatico(); return; }
      const pos = MP.dentroDaTela({ x: agora.left - palco.left, y: agora.top - palco.top, largura: agora.width, altura: agora.height, telaL: palco.width, telaA: palco.height });
      salvarEstilo({ ...estiloDoPainel(), posicao: 'livre', x: pos.x, y: pos.y });
      if (S.estiloRascunho) { S.estiloRascunho = estiloDoPainel(); S.estiloPrevia = S.estiloRascunho; renderEstiloJanela(); }
    };
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar, { once: true });
  });
  $('#painel-tatico').addEventListener('dblclick', event => {
    if (!event.target.closest('.pt-alca')) return;
    salvarEstilo({ ...estiloDoPainel(), posicao: 'base', x: null, y: null });
    if (S.estiloRascunho) { S.estiloRascunho = estiloDoPainel(); S.estiloPrevia = S.estiloRascunho; renderEstiloJanela(); }
  });

  // ---------------- Painel Tático: o painel na base da tela (M14) ----------------
  // Como o módulo do Foundry: o retrato em pé sobre a barra (um por estado de ferimento), o HP, a armadura, a
  // Humanidade, a Sorte, o Death Save, os atributos (um clique rola), as armas (ATK abre o ataque na barra, DMG rola o
  // dano), a iniciativa, o fim do turno, as perícias (★ favoritas na barra) e o equipamento. Mostra o token fixado, o
  // escolhido (o seu; o mestre, qualquer um) ou, sem nenhum, o personagem do jogador. H recolhe e abre; no celular,
  // fica recolhido (um toque abre a ficha na folha de baixo). Aberto, o HUD junto do token some (o painel faz o mesmo).
  const ESTADO_CSS = { notWounded: 'ok', lightlyWounded: 'leve', seriouslyWounded: 'grave', mortallyWounded: 'mortal', dead: 'morto' };
  const STATS_DO_PAINEL = ['INT', 'REF', 'DEX', 'TECH', 'COOL', 'WILL', 'LUCK', 'MOVE', 'BODY', 'EMP'];
  const NOME_DO_USO_CURTO = { equipado: 'Equipado', carregando: 'Carregado', guardado: 'Guardado' };
  const sinalDe = n => (n > 0 ? `+${n}` : String(n).replace('-', '−'));
  const painelRecolhido = () => celular() || (store.get('painel:recolhido') ?? (gm() ? '1' : '0')) === '1';
  const favoritasDe = id => { try { return JSON.parse(store.get(`painel:favoritas:${id}`) || '[]'); } catch { return []; } };
  // Quem aparece: o fixado, o token escolhido (o seu; o mestre, qualquer personagem ou NPC) ou o personagem do jogador.
  function quemNoPainel() {
    const podeVer = token => Boolean(token) && token.tipo !== 'livre' && (gm() || token.meu);
    const comFicha = token => ({ token, ficha: token.personagem ? cartaoDe(token) : null });
    if (S.painel.fixo) {
      const fixo = S.tokens.get(S.painel.fixo);
      if (podeVer(fixo)) return comFicha(fixo);
      S.painel.fixo = null;
    }
    const escolhido = S.selecionado && S.tokens.get(S.selecionado);
    if (podeVer(escolhido)) return comFicha(escolhido);
    if (gm()) return null;
    const meu = [...S.tokens.values()].find(token => token.meu && token.tipo === 'pj');
    if (meu) return comFicha(meu);
    return S.meus[0] ? { token: null, ficha: S.meus[0] } : null;
  }
  // O que o painel desenha, do token (o que a mesa sabe agora) e da ficha (os números da ficha de jogo).
  function dadosDoPainel({ token, ficha }) {
    const jogo = (ficha && ficha.jogo) || {};
    const estado = token ? MP.estadoDoRetrato({ estado: token.estado, morto: token.morto }) : estadoDoPersonagem(ficha);
    return {
      id: token ? token.id : `personagem:${ficha.id}`, token, ficha, estado,
      nome: token ? token.nome : ficha.nome, sub: ficha && ficha.apelido && ficha.apelido !== (token ? token.nome : ficha.nome) ? `“${ficha.apelido}”` : token && token.tipo === 'npc' ? 'NPC' : '',
      hp: token ? token.hp : ficha.hp, mexeHp: Boolean(token) && (gm() || token.meu),
      sp: (token && token.sp) || jogo.sp || null, humanidade: jogo.humanidade || null, sorte: (token && token.sorte) || jogo.sorte || null,
      deathSave: token ? Number(token.deathSave) || 0 : 0,
      stats: ficha ? ficha.stats || {} : (token && token.stats) || {},
      armas: (token && token.armas) || [], pericias: ficha ? ficha.pericias || [] : (token && token.pericias) || [],
      itens: (jogo.itens || []).filter(item => item.tipo !== 'municao'), reputacao: Number(jogo.reputacao) || 0,
      retrato: ficha ? ficha.painel : null, reserva: token ? token.imagem : ficha.retrato,
      origem: token ? { token: token.id } : { personagem: ficha.id }
    };
  }
  const meuTurno = token => Boolean(token && S.combate && S.combate.ordem && S.combate.ordem[S.combate.vez] && S.combate.ordem[S.combate.vez].token === token.id);
  // O painel mostra este token, aberto? (o HUD junto do token some.)
  const painelMostra = id => Boolean(S.painel.mostra) && S.painel.mostra === id && !painelRecolhido();

  function renderPainelTatico() {
    const el = $('#painel-tatico');
    if (S.painel.segurando) { S.painel.pendente = true; return; }
    S.painel.pendente = false;
    const estilo = estiloDoPainel();
    const quem = S.eu ? quemNoPainel() : null;
    const d = quem ? dadosDoPainel(quem) : null;
    const antes = S.painel.mostra;
    S.painel.mostra = d ? d.id : null;
    if (!d) {
      el.innerHTML = '';
      el.className = 'pt-vazio';
      document.body.style.setProperty('--painel-alto', '0px');
      if (antes) renderHud();
      return;
    }
    const recolhido = painelRecolhido();
    const vista = vistaDoRetrato(d.retrato, d.estado, d.reserva, estilo.efeitos);
    const marca = `${d.id}|${vista.src}|${vista.estado}`;
    const trocou = Boolean(S.painel.ultimoRetrato) && S.painel.ultimoRetrato !== marca;
    S.painel.ultimoRetrato = marca;
    const foco = document.activeElement && el.contains(document.activeElement) && document.activeElement.dataset.foco ? document.activeElement.dataset.foco : null;
    el.innerHTML = recolhido ? htmlDoPainelRecolhido(d, vista) : htmlDoPainel(d, vista, estilo, trocou);
    for (const [chave, valor] of Object.entries(MP.variaveisDoEstilo(estilo))) el.style.setProperty(chave, valor);
    el.className = [...MP.classesDoEstilo(estilo), `pt-ferimento-${ESTADO_CSS[d.estado]}`, ...(recolhido ? ['pt-recolhido'] : []), ...(meuTurno(d.token) ? ['pt-meu-turno'] : [])].join(' ');
    if (foco) { const campo = el.querySelector(`[data-foco="${foco}"]`); if (campo) { campo.focus(); if (campo.type === 'search') campo.setSelectionRange(campo.value.length, campo.value.length); } }
    if (S.painel.busca) filtrarPericiasDoPainel();
    posicionarPainelTatico();
    if (antes !== S.painel.mostra) renderHud();
  }
  // No meio da área livre do mapa (entre as ferramentas e a barra), na base. O chat do canto e os avisos sobem.
  function posicionarPainelTatico() {
    const el = $('#painel-tatico');
    if (!S.painel.mostra) return;
    const tela = canvas.getBoundingClientRect();
    const ferramentas = $('#ferramentas').offsetParent ? $('#ferramentas').getBoundingClientRect().right - tela.left : 0;
    const barra = !celular() && $('#painel').offsetParent ? $('#painel').getBoundingClientRect().left - tela.left : canvas.clientWidth;
    const estilo = estiloDoPainel();
    el.style.setProperty('--pt-largura-max', `${Math.max(360, Math.floor((barra - ferramentas - 24) / (estilo.escala / 100)))}px`);
    // Onde o jogador arrastou (dentro do mapa), ou na base, no meio da área livre.
    if (estilo.posicao === 'livre' && estilo.x !== null && estilo.y !== null) {
      const caixa = el.getBoundingClientRect();
      const pos = MP.dentroDaTela({ x: estilo.x, y: estilo.y, largura: caixa.width || 400, altura: caixa.height || 120, telaL: canvas.clientWidth, telaA: canvas.clientHeight });
      Object.assign(el.style, { left: `${pos.x}px`, top: `${pos.y}px`, bottom: 'auto' });
    } else {
      Object.assign(el.style, { left: `${Math.round((ferramentas + barra) / 2)}px`, top: '', bottom: '' });
      // Largo a ponto de cobrir quem está na mesa (embaixo, à esquerda): sobe acima dele.
      const rodape = $('#rodape').getBoundingClientRect();
      if (rodape.height && el.getBoundingClientRect().left < rodape.right + 8) el.style.bottom = `${estilo.base + Math.round(rodape.height) + 8}px`;
    }
    const alto = painelRecolhido() || estilo.posicao === 'livre' ? 0 : Math.round(el.getBoundingClientRect().height) + estilo.base + 8;
    document.body.style.setProperty('--painel-alto', `${alto}px`);
  }
  window.addEventListener('resize', () => posicionarPainelTatico());

  function htmlDoPainelRecolhido(d, vista) {
    const hp = d.hp ? `${d.hp.atual}/${d.hp.max}` : '';
    return `<div class="pt-casca pt-mini"><button type="button" class="pt-mini-botao" data-pt="recolher" title="${celular() ? 'Abrir a ficha' : 'Abrir o painel (H)'}">
      <span class="pt-mini-retrato">${vista.src ? `<img src="${esc(vista.src)}" alt="">` : esc(initials(d.nome))}</span>
      <span class="pt-mini-nome">${esc(d.nome)}</span>${hp ? `<span class="pt-mini-hp pt-estado-${ESTADO_CSS[d.estado]}">${ICONE.coracao} ${hp}</span>` : ''}<span class="pt-seta">▲</span></button></div>`;
  }
  function htmlDoPainel(d, vista, estilo, trocou) {
    const mostra = chave => !estilo.ocultos.includes(chave);
    const desenhos = { vitais: () => vitaisDoPainel(d, estilo, mostra), atributos: () => atributosDoPainel(d), armas: () => armasDoPainel(d), acoes: () => acoesDoPainel(d) };
    const secoes = estilo.secoes.filter(mostra).map(chave => desenhos[chave]()).filter(Boolean).join('');
    const livre = vista.modo === 'livre';
    const retrato = htmlDoRetrato(vista, { trocou, nome: d.nome });
    return `<div class="pt-casca${livre ? ' pt-casca-livre' : ''}">
      ${livre ? `${retrato}<button type="button" class="pt-retrato-alvo" data-pt="ficha" title="${esc(vista.nomeDoEstado)} · clique: a ficha · botão direito: o retrato"></button>` : ''}
      <div class="pt-barra">
        ${topoDoPainel(d, vista, mostra)}
        <div class="pt-corpo">
          ${livre ? '' : `<button type="button" class="pt-moldura-caixa" data-pt="ficha" title="Clique: a ficha · botão direito: o retrato">${retrato}</button>`}
          ${secoes}
        </div>
        ${mostra('favoritos') ? favoritasDoPainel(d) : ''}
      </div>
      ${S.painel.aberto ? subpainelDoPainel(d, S.painel.aberto) : ''}
    </div>`;
  }
  function topoDoPainel(d, vista, mostra) {
    const selos = [];
    if (meuTurno(d.token)) selos.push('<span class="pt-selo pt-selo-turno">▶ Seu turno</span>');
    if (d.token && d.token.suprimido) selos.push('<span class="pt-selo pt-selo-alerta" title="Suprimido: sai no fim do seu próximo turno.">Suprimido</span>');
    // A luta (M9b): caído, inconsciente e o agarrão.
    if (d.token && d.token.caido) selos.push('<span class="pt-selo pt-selo-alerta" title="Caído: levante-se (uma Ação) antes de andar.">Caído</span>');
    if (d.token && d.token.inconsciente) selos.push('<span class="pt-selo pt-selo-alerta" title="Inconsciente: não age nem esquiva.">Inconsciente</span>');
    if (d.token && d.token.agarrao) selos.push(`<span class="pt-selo pt-selo-alerta" title="${esc(textoDoAgarrao(d.token))}: −2 em todas as ações.">${d.token.agarrao.papel === 'agarrando' ? 'Agarrando' : 'Agarrado'}</span>`);
    const ferramenta = (acao, titulo, icone, ativa = false) => `<button type="button" class="${ativa ? 'pt-ativa' : ''}" data-pt="${acao}" title="${esc(titulo)}" aria-label="${esc(titulo)}">${icone}</button>`;
    return `<header class="pt-topo">
      <span class="pt-alca" title="Arraste para mover · dois cliques: de volta à base" aria-hidden="true">⋮⋮</span>
      ${mostra('identidade') ? `<button type="button" class="pt-nome" data-pt="ficha" title="Abrir a ficha">${esc(d.nome)}</button>${d.sub ? `<span class="pt-sub">${esc(d.sub)}</span>` : ''}` : ''}
      <span class="pt-estado pt-estado-${ESTADO_CSS[d.estado]}">${esc(vista.nomeDoEstado)}</span>
      ${selos.join('')}
      <span class="pt-ferramentas">
        ${d.token ? ferramenta('fixar', S.painel.fixo ? 'Soltar: o painel volta a seguir o token escolhido' : 'Fixar este personagem no painel', ICONE.alfinete, Boolean(S.painel.fixo)) : ''}
        ${d.ficha ? ferramenta('retrato', 'Retrato de cada estado', ICONE.retrato) : ''}
        ${ferramenta('estilo', 'Estilo do painel', ICONE.paleta, Boolean(S.estiloRascunho))}
        ${ferramenta('recolher', 'Recolher (H)', '▼')}
      </span>
    </header>`;
  }
  function vitaisDoPainel(d, estilo, mostra) {
    const fichas = [];
    const ficha = ({ rotulo, dica, valor, max, classe = '', acao = '' }) => `<${acao ? 'button type="button"' : 'div'} class="pt-ficha ${classe}"${acao ? ` data-pt="${acao}"` : ''} title="${esc(dica)}"><small>${rotulo}</small><span class="pt-ficha-valor">${valor}${max !== undefined ? `<em>/${max}</em>` : ''}</span></${acao ? 'button' : 'div'}>`;
    if (mostra('armadura') && d.sp) {
      for (const [local, rotulo, nome] of [['cabeca', 'SP cab.', 'na cabeça'], ['corpo', 'SP corpo', 'no corpo']]) {
        const sp = d.sp[local];
        fichas.push(sp && sp.max ? ficha({ rotulo, dica: `SP da armadura ${nome}`, valor: sp.atual, max: sp.max, classe: sp.atual < sp.max ? 'pt-gasta' : '' }) : ficha({ rotulo, dica: `Sem armadura ${nome}`, valor: '–', classe: 'pt-sem' }));
      }
    }
    if (mostra('humanidade') && d.humanidade) {
      const baixa = d.humanidade.atual <= Math.max(1, Math.floor(d.humanidade.max / 4));
      fichas.push(ficha({ rotulo: 'HUM', dica: baixa ? 'Humanidade baixa: risco de ciberpsicose' : 'Humanidade', valor: d.humanidade.atual, max: d.humanidade.max, classe: baixa ? 'pt-alerta' : '' }));
    }
    if (mostra('sorte') && d.sorte && d.sorte.max) fichas.push(ficha({ rotulo: 'Sorte', dica: 'Sorte: gaste na rolagem (o teste pela bandeja de dados)', valor: d.sorte.atual, max: d.sorte.max }));
    const mortal = d.hp && d.hp.atual < 1 && d.estado !== 'dead';
    if (mostra('deathSave') && d.token && d.hp) fichas.push(ficha({ rotulo: 'Death Save', dica: mortal ? `Death Save: role menos que o BODY com a penalidade ${d.deathSave}. Clique: rolar` : `Penalidade do Death Save: ${d.deathSave}`, valor: d.deathSave, classe: `pt-death${mortal ? ' pt-pulsa' : ''}`, acao: mortal && d.mexeHp ? 'deathsave' : '' }));
    let hp = '';
    if (d.hp && d.hp.max) {
      const pct = Math.round((Math.max(0, d.hp.atual) / Math.max(1, d.hp.max)) * 100);
      const grave = Math.round((Math.ceil(d.hp.max / 2) / Math.max(1, d.hp.max)) * 100);
      const passos = d.mexeHp ? MP.passosDeHp(estilo.passosHp) : [];
      const botao = n => `<button type="button" class="pt-passo ${n < 0 ? 'pt-menos' : 'pt-mais'}" data-pt="hp" data-valor="${n}">${sinalDe(n)}</button>`;
      hp = `<div class="pt-hp">${passos.filter(n => n < 0).map(botao).join('')}
        <div class="pt-hp-barra" title="${d.mexeHp ? 'HP · a roda do mouse soma ±1 (Shift: ±5)' : 'HP'}">
          <div class="pt-hp-cheio" style="width: ${pct}%"></div><div class="pt-hp-marca" style="left: ${grave}%"></div>
          <span class="pt-hp-texto">${ICONE.coracao}${d.mexeHp ? `<input class="pt-hp-campo" data-foco="hp" type="text" inputmode="numeric" value="${d.hp.atual}" aria-label="HP">` : `<b>${d.hp.atual}</b>`}<em>/ ${d.hp.max}</em></span>
        </div>${passos.filter(n => n > 0).map(botao).join('')}</div>`;
    }
    if (!hp && !fichas.length) return '';
    return `<section class="pt-secao pt-vitais">${hp}${fichas.length ? `<div class="pt-fichas">${fichas.join('')}</div>` : ''}</section>`;
  }
  function atributosDoPainel(d) {
    const stats = STATS_DO_PAINEL.filter(stat => d.stats[stat] !== undefined && d.stats[stat] !== null);
    if (!stats.length) return '';
    return `<section class="pt-secao pt-atributos"><div class="pt-grade-stats">${stats.map(stat => `<button type="button" class="pt-stat" data-pt="atributo" data-stat="${stat}" title="Rolar ${stat} + 1d10"><small>${stat}</small><b>${d.stats[stat]}</b></button>`).join('')}</div></section>`;
  }
  function armasDoPainel(d) {
    if (!d.token) return '';
    const linhas = d.armas.map(arma => {
      const pente = arma.pente && arma.pente.max ? arma.pente : null;
      const pilulas = arma.kit ? [`<span class="pt-pilula pt-classe-${esc(arma.kit.classe)}" title="${esc(DICA_2077[arma.kit.classe] || '')}">${esc(CLASSE_2077[arma.kit.classe] || arma.kit.classe)}</span>`] : [];
      return `<div class="pt-arma" data-arma="${esc(arma.id)}">
        <div class="pt-arma-info">
          <span class="pt-arma-nome">${esc(arma.nome)}</span>
          <span class="pt-arma-sub">${esc(arma.dano || '')}${arma.cdt ? ` · CdT ${arma.cdt}` : ''}${pente ? ` · <span class="${pente.atual === 0 ? 'pt-sem-bala' : ''}" title="${esc(arma.municao || 'Sem munição carregada')}">${pente.atual}/${pente.max}</span>` : ''}</span>
          ${pilulas.length ? `<span class="pt-pilulas">${pilulas.join('')}</span>` : ''}
        </div>
        <div class="pt-arma-botoes">
          ${pente && d.mexeHp ? `<button type="button" class="pt-icone" data-pt="recarregar" data-arma="${esc(arma.id)}" title="Recarregar" aria-label="Recarregar ${esc(arma.nome)}">↻</button>` : ''}
          ${d.mexeHp && !d.token.morto ? `<button type="button" class="pt-atk" data-pt="atacar" data-arma="${esc(arma.id)}" title="Atacar: o ataque abre na barra">ATK</button>` : ''}
          ${arma.dano ? `<button type="button" class="pt-dmg" data-pt="dano" data-arma="${esc(arma.id)}" title="Rolar o dano (${esc(arma.dano)})">DMG</button>` : ''}
        </div>
      </div>`;
    }).join('');
    return `<section class="pt-secao pt-armas">
      <header class="pt-armas-topo"><span class="pt-titulo">Armas</span>${d.ficha && d.itens.length && d.mexeHp ? `<button type="button" class="pt-icone" data-pt="painel" data-painel="equipamento" title="Equipar e guardar" aria-label="Equipar e guardar">${ICONE.chave}</button>` : ''}</header>
      <div class="pt-lista-armas">${linhas || '<p class="pt-vazio-texto">Nenhuma arma à mão.</p>'}</div>
    </section>`;
  }
  function acoesDoPainel(d) {
    const botao = (acao, rotulo, titulo, { painel = '', classe = '' } = {}) => `<button type="button" class="pt-acao ${classe}${painel && painel === S.painel.aberto ? ' pt-ativa' : ''}" data-pt="${acao}"${painel ? ` data-painel="${painel}"` : ''} title="${esc(titulo)}"><span>${rotulo}</span></button>`;
    const entrada = d.token && S.combate && S.combate.ordem ? S.combate.ordem.find(item => item.token === d.token.id) : null;
    const partes = [];
    if (entrada) partes.push(`<span class="pt-acao pt-iniciativa" title="A iniciativa no combate">Inic. ${entrada.iniciativa ?? '—'}</span>`);
    else if (gm() && d.token && S.combate) partes.push(botao('combate', 'Pôr no combate', 'Entra no combate com REF + 1d10'));
    if (meuTurno(d.token) && (gm() || d.token.meu)) partes.push(botao('fimDoTurno', 'Fim do turno', 'Passar a vez', { classe: 'pt-turno' }));
    if (d.stats.COOL !== undefined) partes.push(botao('facedown', 'Facedown', `Encarada: COOL + Reputação (${d.reputacao}) + 1d10`));
    if (d.pericias.length) partes.push(botao('painel', 'Perícias', 'Todas as perícias (★ favorita fica no painel)', { painel: 'pericias' }));
    if (d.token && d.mexeHp) partes.push(botao('rolar', 'Rolar', 'A bandeja de dados, com este token'));
    return partes.length ? `<section class="pt-secao pt-acoes">${partes.join('')}</section>` : '';
  }
  // As perícias: a do personagem tem STAT + nível; a do NPC, a base.
  const totalDaPericia = p => (p.base !== undefined ? p.base : 0);
  const contaDaPericia = (d, p) => (p.stat ? `${p.stat} ${d.stats[p.stat] ?? 0} + ${p.nivel}` : 'base');
  function favoritasDoPainel(d) {
    const chave = d.ficha ? d.ficha.id : d.token && d.token.npc ? d.token.npc : '';
    const favoritas = favoritasDe(chave);
    const lista = d.pericias.filter(p => favoritas.includes(p.nome));
    if (!lista.length) return '';
    return `<div class="pt-favoritas">${lista.map(p => `<button type="button" class="pt-favorita" data-pt="pericia" data-pericia="${esc(p.nome)}" title="${esc(contaDaPericia(d, p))}">★ ${esc(p.pt || p.nome)}<b>${totalDaPericia(p)}</b></button>`).join('')}</div>`;
  }
  function subpainelDoPainel(d, qual) {
    const titulos = { pericias: 'Perícias', equipamento: 'Equipamento' };
    let corpo = '';
    if (qual === 'pericias') {
      const chave = d.ficha ? d.ficha.id : d.token && d.token.npc ? d.token.npc : '';
      const favoritas = favoritasDe(chave);
      corpo = [...d.pericias].sort((a, b) => (a.pt || a.nome).localeCompare(b.pt || b.nome, 'pt')).map(p => `<div class="pt-linha" data-pt="pericia" data-pericia="${esc(p.nome)}" data-busca="${esc(plain(`${p.pt || ''} ${p.nome}`))}">
          <button type="button" class="pt-estrela${favoritas.includes(p.nome) ? ' pt-ativa' : ''}" data-pt="favorita" data-pericia="${esc(p.nome)}" title="Favorita (fica no painel)" aria-label="Favorita: ${esc(p.pt || p.nome)}">★</button>
          <span class="pt-linha-nome">${esc(p.pt || p.nome)}</span><small>${esc(contaDaPericia(d, p))}</small><b>${totalDaPericia(p)}</b></div>`).join('') || '<p class="pt-vazio-texto">Sem perícias.</p>';
    } else if (qual === 'equipamento') {
      corpo = d.itens.map(item => `<div class="pt-linha pt-linha-equip"><span class="pt-linha-nome">${esc(item.nome)}</span>
          <select data-pt-uso="${esc(item.id)}" aria-label="Uso: ${esc(item.nome)}">${Object.entries(NOME_DO_USO_CURTO).map(([valor, nome]) => `<option value="${valor}"${item.uso === valor ? ' selected' : ''}>${nome}</option>`).join('')}</select></div>`).join('') || '<p class="pt-vazio-texto">Nada para equipar.</p>';
    }
    return `<div class="pt-painel pt-painel-${qual}">
      <header><span>${titulos[qual]}</span>${qual === 'pericias' ? `<input type="search" class="pt-busca" data-foco="busca" placeholder="Buscar…" value="${esc(S.painel.busca)}">` : ''}<button type="button" class="pt-icone" data-pt="fecharPainel" title="Fechar" aria-label="Fechar">×</button></header>
      <div class="pt-painel-corpo">${corpo}</div>
    </div>`;
  }
  const plain = texto => String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  function filtrarPericiasDoPainel() {
    const filtro = plain(S.painel.busca.trim());
    for (const linha of $$('#painel-tatico .pt-painel-pericias .pt-linha')) linha.hidden = Boolean(filtro) && !linha.dataset.busca.includes(filtro);
  }

  // ---------------- Os cliques do painel ----------------
  function painelAberto(aberto) {
    if (celular()) return;
    store.set('painel:recolhido', aberto ? '0' : '1');
    renderPainelTatico();
    renderHud();
  }
  function rolarPeloPainel(d, corpo) { op('rolar', { ...d.origem, secreta: secreta(), ...corpo }).catch(() => {}); }
  $('#painel-tatico').addEventListener('click', event => {
    const alvo = event.target.closest('[data-pt]');
    if (!alvo || alvo.matches('input, select')) return;
    const quem = quemNoPainel();
    if (!quem) return;
    const d = dadosDoPainel(quem);
    const acao = alvo.dataset.pt;
    if (acao === 'recolher') {
      if (celular()) { if (d.token) selecionar(d.token.id); abrirCartaoNaBarra(); return; }
      painelAberto(painelRecolhido());
      return;
    }
    if (acao === 'ficha') { if (d.token) { selecionar(d.token.id); abrirCartaoNaBarra(); } else abrirAba('fichas'); return; }
    if (acao === 'retrato' && d.ficha) { abrirRetrato(d.ficha.id); return; }
    if (acao === 'estilo') { if (S.estiloRascunho) fecharEstilo(); else abrirEstilo(); return; }
    if (acao === 'fixar') { S.painel.fixo = S.painel.fixo ? null : d.token.id; renderPainelTatico(); return; }
    if (acao === 'painel') { S.painel.aberto = S.painel.aberto === alvo.dataset.painel ? null : alvo.dataset.painel; renderPainelTatico(); return; }
    if (acao === 'fecharPainel') { S.painel.aberto = null; renderPainelTatico(); return; }
    if (acao === 'hp' && d.token && d.hp) { op('token.editar', { token: d.token.id, hp: { atual: d.hp.atual + Number(alvo.dataset.valor), max: d.hp.max } }).catch(() => {}); return; }
    if (acao === 'deathsave') { op('deathsave', { token: d.token.id }).catch(() => {}); return; }
    if (acao === 'atributo') { rolarPeloPainel(d, { modo: 'teste', stat: alvo.dataset.stat }); return; }
    if (acao === 'pericia') { rolarPeloPainel(d, { modo: 'teste', pericia: alvo.dataset.pericia }); return; }
    if (acao === 'facedown') { rolarPeloPainel(d, { modo: 'teste', stat: 'COOL', mod: d.reputacao }); return; }
    if (acao === 'favorita') {
      const chave = d.ficha ? d.ficha.id : d.token.npc;
      const lista = favoritasDe(chave);
      const nome = alvo.dataset.pericia;
      store.set(`painel:favoritas:${chave}`, JSON.stringify(lista.includes(nome) ? lista.filter(item => item !== nome) : [...lista, nome]));
      renderPainelTatico();
      return;
    }
    const arma = d.armas.find(item => item.id === alvo.dataset.arma);
    if (acao === 'dano' && arma) { rolarPeloPainel(d, { modo: 'dados', expressao: arma.dano }); return; }
    if (acao === 'recarregar' && arma) {
      op('arma.recarregar', { token: d.token.id, arma: arma.id }).then(resposta => { const feito = resposta.resultado; if (feito && feito.municao) aviso(`${feito.arma}: ${feito.entrou} de ${feito.municao} no pente (sobram ${feito.sobra}).`); }).catch(() => {});
      return;
    }
    // Atacar: o formulário do ataque na barra, com esta arma (como o HUD).
    if (acao === 'atacar' && arma) {
      selecionar(d.token.id);
      S.ataque = { token: d.token.id, arma: arma.id, modo: '', local: 'cabeca', alvo: '', mod: 0, sorte: 0 };
      escolherAlvoNoMapa(false);
      abrirCartaoNaBarra();
      renderCartao();
      return;
    }
    if (acao === 'rolar') {
      if (!chatFlutua()) { abrirAba('rolagens'); abrirPainel(true); }
      $('#rolar-quem').value = `token:${d.token.id}`;
      renderPericias();
      bandejaAberta(true);
      return;
    }
    if (acao === 'combate') { op('combate.adicionar', { token: d.token.id }).catch(() => {}); return; }
    if (acao === 'fimDoTurno') op('combate.proximo', { vez: d.token.id }).catch(() => {});
  });
  $('#painel-tatico').addEventListener('contextmenu', event => {
    if (!event.target.closest('.pt-retrato-alvo, .pt-moldura-caixa, .pt-mini-retrato')) return;
    const quem = quemNoPainel();
    if (!quem || !quem.ficha) return;
    event.preventDefault();
    abrirRetrato(quem.ficha.id);
  });
  // O HP: o número troca; "−5" e "+5" somam (como no HUD). A roda do mouse na barra soma os passos e grava uma vez só.
  $('#painel-tatico').addEventListener('focusin', event => { if (event.target.matches('.pt-hp-campo')) S.painel.segurando = true; });
  $('#painel-tatico').addEventListener('focusout', event => {
    if (!event.target.matches('.pt-hp-campo')) return;
    S.painel.segurando = false;
    if (S.painel.pendente) setTimeout(renderPainelTatico, 0);
  });
  $('#painel-tatico').addEventListener('change', event => {
    const campo = event.target;
    const quem = quemNoPainel();
    if (!quem) return;
    const d = dadosDoPainel(quem);
    if (campo.matches('.pt-hp-campo') && d.token && d.hp) {
      const texto = campo.value.trim().replace(/[−–]/g, '-');
      const atual = /^[+-]\d+$/.test(texto) ? d.hp.atual + Number(texto) : Number(texto);
      S.painel.segurando = false;
      if (Number.isFinite(atual)) op('token.editar', { token: d.token.id, hp: { atual, max: d.hp.max } }).catch(() => renderPainelTatico());
      else renderPainelTatico();
      return;
    }
    if (campo.dataset.ptUso && d.ficha) op('item.uso', { personagem: d.ficha.id, item: campo.dataset.ptUso, uso: campo.value }).catch(() => renderPainelTatico());
  });
  $('#painel-tatico').addEventListener('keydown', event => { if (event.key === 'Enter' && event.target.matches('.pt-hp-campo')) event.target.blur(); });
  $('#painel-tatico').addEventListener('input', event => { if (event.target.matches('.pt-busca')) { S.painel.busca = event.target.value; filtrarPericiasDoPainel(); } });
  $('#painel-tatico').addEventListener('wheel', event => {
    if (!event.target.closest('.pt-hp-barra')) return;
    const quem = quemNoPainel();
    const d = quem && dadosDoPainel(quem);
    if (!d || !d.mexeHp || !d.hp) return;
    event.preventDefault();
    S.painel.roda += (event.deltaY < 0 ? 1 : -1) * (event.shiftKey ? 5 : 1);
    const campo = $('#painel-tatico .pt-hp-campo');
    if (campo) campo.value = Math.min(d.hp.max, d.hp.atual + S.painel.roda);
    clearTimeout(S.painel.rodaTimer);
    S.painel.rodaTimer = setTimeout(() => {
      const delta = S.painel.roda;
      S.painel.roda = 0;
      if (delta) op('token.editar', { token: d.token.id, hp: { atual: d.hp.atual + delta, max: d.hp.max } }).catch(() => {});
    }, 300);
  }, { passive: false });

  // ---------------- NPCs do mestre ----------------
  // A ficha de NPC do mestre (nova, copiada de uma da wiki, ou dele): a janela sobre o mapa. O servidor confere e grava;
  // a lista volta pelo evento npcs. A janela não se redesenha enquanto está aberta (não apaga o que se digita).
  const PERICIAS_DE_ATAQUE = [['Handgun', 'Armas de uma Mão'], ['Shoulder Arms', 'Armas de Ombro'], ['Heavy Weapons', 'Armas Pesadas'], ['Autofire', 'Disparo Automático'],
    ['Archery', 'Arquearia'], ['Melee Weapon', 'Armas Brancas'], ['Brawling', 'Briga'], ['Martial Arts', 'Artes Marciais']];
  const STATS_DE_NPC = ['INT', 'REF', 'DEX', 'TECH', 'COOL', 'WILL', 'MOVE', 'BODY', 'EMP'];
  const TIPOS_DE_NPC = { pessoa: 'Pessoa', ice: 'Black ICE', veiculo: 'Veículo' };
  const NPC_NOVO = { nome: '', grupo: 'Meus NPCs', tipo: 'pessoa', hp: 30, stats: Object.fromEntries(STATS_DE_NPC.map(stat => [stat, 5])), pericias: [], armas: [], sp: { cabeca: 0, corpo: 0 }, notas: '', midia: '' };
  const urlDaMidia = midia => comCampanha(`/api/mesa/midia/${encodeURIComponent(midia)}`);
  function linhaDeArma(arma = {}) {
    const conhecida = PERICIAS_DE_ATAQUE.some(([en]) => en === arma.pericia);
    return `<li class="npc-arma" data-classe="${esc(arma.classe || '')}" data-pericia="${esc(arma.pericia || '')}">
      <input name="arma-nome" type="text" maxlength="80" placeholder="Arma" value="${esc(arma.nome || '')}" aria-label="Arma">
      <input name="arma-dano" type="text" maxlength="20" placeholder="3d6" value="${esc(arma.dano || '')}" aria-label="Dano">
      <input name="arma-cdt" type="number" min="1" max="10" value="${Number(arma.cdt) || 1}" aria-label="CdT" title="Cadência de tiro (ataques por ação)">
      <select name="arma-pericia" aria-label="Perícia">${PERICIAS_DE_ATAQUE.map(([en, pt]) => `<option value="${en}"${arma.pericia === en ? ' selected' : ''}>${pt}</option>`).join('')}${arma.pericia && !conhecida ? `<option value="${esc(arma.pericia)}" selected>${esc(arma.pericia)}</option>` : ''}</select>
      <input name="arma-nota" type="text" maxlength="120" placeholder="Nota" value="${esc(arma.nota || '')}" aria-label="Nota da arma">
      <button type="button" class="link" data-npc-tirar-arma aria-label="Tirar a arma">×</button></li>`;
  }
  function imagemDoNpc(midia) {
    return `${midia ? `<img src="${esc(urlDaMidia(midia))}" alt="">` : '<span class="nota">Sem imagem: o token mostra as iniciais.</span>'}
      <label class="botao vazado pequeno">Imagem<input type="file" accept="image/*" data-npc-imagem hidden></label>${midia ? '<button type="button" class="link" data-npc-sem-imagem>tirar</button>' : ''}`;
  }
  function abrirNpc(id) {
    S.npcEditando = id || 'novo';
    S.npcMidia = undefined;
    renderNpcJanela();
  }
  function fecharNpc() {
    S.npcEditando = null;
    const janela = $('#npc-janela');
    janela.hidden = true;
    janela.innerHTML = '';
  }
  function renderNpcJanela() {
    const janela = $('#npc-janela');
    const novo = S.npcEditando === 'novo';
    // A cópia recém-feita chega pelo evento npcs: a janela abre quando ela chegar.
    const npc = novo ? NPC_NOVO : S.meusNpcs.find(item => item.id === S.npcEditando);
    if (!gm() || !npc) { janela.hidden = true; return; }
    const grupos = [...new Set(S.npcs.map(item => item.grupo))];
    janela.innerHTML = `<form class="npc-form" novalidate>
      <div class="nota-janela-topo"><h2 id="npc-janela-titulo">${novo ? 'Novo NPC' : esc(npc.nome)}</h2><button class="nota-janela-fechar" type="button" data-npc-fechar aria-label="Fechar">×</button></div>
      <div class="form-grade npc-grade">
        <label class="inteiro">Nome <input name="nome" type="text" maxlength="40" required value="${esc(npc.nome)}" placeholder="Capanga da Maelstrom"></label>
        <label>Grupo <input name="grupo" type="text" maxlength="40" list="npc-grupos" value="${esc(npc.grupo)}"></label>
        <label>Tipo <select name="tipo">${Object.entries(TIPOS_DE_NPC).map(([valor, nome]) => `<option value="${valor}"${npc.tipo === valor ? ' selected' : ''}>${nome}</option>`).join('')}</select></label>
        <label>HP <input name="hp" type="number" min="0" max="999" value="${npc.hp}"></label>
        <label>SP cabeça <input name="sp-cabeca" type="number" min="0" max="99" value="${npc.sp.cabeca}"></label>
        <label>SP corpo <input name="sp-corpo" type="number" min="0" max="99" value="${npc.sp.corpo}"></label>
        <label>Assentos <small>(veículo)</small> <input name="assentos" type="number" min="1" max="30" value="${npc.assentos || 2}"></label>
      </div>
      <datalist id="npc-grupos">${grupos.map(grupo => `<option value="${esc(grupo)}">`).join('')}</datalist>
      <div class="npc-stats">${STATS_DE_NPC.map(stat => `<label>${stat}<input name="stat-${stat}" type="number" min="0" max="99" value="${Number(npc.stats[stat]) || 0}"></label>`).join('')}</div>
      <p class="nota">Black ICE: o SPD no REF, o REZ no HP, e ATK, DEF e PER nas perícias. Veículo: o SDP no HP e a velocidade de combate no MOVE.</p>
      <label class="campo">Perícias, com a base (STAT + nível) <textarea name="pericias" rows="3" placeholder="Armas de uma Mão 14, Evasão 12, Percepção 10">${esc(npc.pericias.map(item => `${item.pt || item.nome} ${item.base}`).join(', '))}</textarea></label>
      <div class="grupo-npc">Armas</div>
      <ul class="npc-armas">${npc.armas.map(linhaDeArma).join('')}</ul>
      <div><button type="button" class="botao vazado pequeno" data-npc-arma>+ Arma</button></div>
      <label class="campo">Notas (só você vê; vão para o token) <textarea name="notas" rows="4" maxlength="4000">${esc(npc.notas || '')}</textarea></label>
      <div class="npc-imagem">${imagemDoNpc(npc.midia)}</div>
      <div class="nota-janela-acoes"><button class="botao" type="submit">Salvar</button><button class="botao vazado" type="button" data-npc-fechar>Cancelar</button>${novo ? '' : '<button class="botao vazado perigo" type="button" data-npc-apagar>Apagar</button>'}</div>
    </form>`;
    janela.hidden = false;
    janela.querySelector('[name="nome"]').focus();
  }
  // A ficha como o servidor recebe. A perícia é "nome base" (o nome em português ou em inglês).
  function npcDoFormulario(form) {
    const dados = new FormData(form);
    const pedacos = String(dados.get('pericias') || '').split(/[,;\n]+/).map(texto => texto.trim()).filter(Boolean);
    const semBase = pedacos.find(texto => !/^.*\S\s+\d{1,2}$/.test(texto));
    if (semBase) throw new Error(`Perícia sem a base: "${semBase}". Use o nome e o número, como Evasão 12.`);
    const armas = [...form.querySelectorAll('.npc-arma')].map(linha => {
      const valor = nome => linha.querySelector(`[name="${nome}"]`).value;
      const pericia = valor('arma-pericia');
      // A classe que veio do Foundry vale enquanto a perícia for a mesma.
      return { nome: valor('arma-nome').trim(), dano: valor('arma-dano').trim(), cdt: Number(valor('arma-cdt')) || 1, pericia, nota: valor('arma-nota').trim(),
        ...(linha.dataset.classe && linha.dataset.pericia === pericia ? { classe: linha.dataset.classe } : {}) };
    }).filter(arma => arma.nome);
    return {
      nome: String(dados.get('nome') || '').trim(), grupo: String(dados.get('grupo') || '').trim(), tipo: dados.get('tipo'), hp: Number(dados.get('hp')) || 0,
      stats: Object.fromEntries(STATS_DE_NPC.map(stat => [stat, Number(dados.get(`stat-${stat}`)) || 0])),
      pericias: pedacos.map(texto => texto.match(/^(.*\S)\s+(\d{1,2})$/)).map(([, nome, base]) => ({ nome, base: Number(base) })),
      armas, sp: { cabeca: Number(dados.get('sp-cabeca')) || 0, corpo: Number(dados.get('sp-corpo')) || 0 }, notas: String(dados.get('notas') || ''), assentos: Number(dados.get('assentos')) || 2,
      ...(S.npcMidia !== undefined ? { midia: S.npcMidia } : {})
    };
  }
  const npcJanela = $('#npc-janela');
  npcJanela.addEventListener('submit', event => {
    event.preventDefault();
    let npc;
    try { npc = npcDoFormulario(event.target); } catch (error) { aviso(error.message, 'erro'); return; }
    if (!npc.nome) { aviso('Dê um nome ao NPC.', 'erro'); return; }
    const id = S.npcEditando;
    op('npc.salvar', id === 'novo' ? { npc } : { id, npc }).then(() => { fecharNpc(); aviso(`${npc.nome}: ficha salva.`); }).catch(() => {});
  });
  npcJanela.addEventListener('click', event => {
    const botao = event.target.closest('button');
    if (!botao) return;
    if (botao.hasAttribute('data-npc-fechar')) fecharNpc();
    else if (botao.hasAttribute('data-npc-arma')) { npcJanela.querySelector('.npc-armas').insertAdjacentHTML('beforeend', linhaDeArma({ pericia: 'Handgun' })); npcJanela.querySelector('.npc-arma:last-child input').focus(); }
    else if (botao.hasAttribute('data-npc-tirar-arma')) botao.closest('.npc-arma').remove();
    else if (botao.hasAttribute('data-npc-sem-imagem')) { S.npcMidia = ''; npcJanela.querySelector('.npc-imagem').innerHTML = imagemDoNpc(''); }
    else if (botao.hasAttribute('data-npc-apagar')) {
      const npc = S.meusNpcs.find(item => item.id === S.npcEditando);
      if (npc && confirm(`Apagar a ficha de ${npc.nome}? Os tokens que já estão nas cenas ficam.`)) op('npc.apagar', { id: npc.id }).then(fecharNpc).catch(() => {});
    }
  });
  npcJanela.addEventListener('change', event => {
    if (!event.target.matches('[data-npc-imagem]') || !event.target.files[0]) return;
    enviarMidia(event.target.files[0]).then(({ midia }) => { S.npcMidia = midia; npcJanela.querySelector('.npc-imagem').innerHTML = imagemDoNpc(midia); }).catch(error => aviso(error.message, 'erro'));
  });
  npcJanela.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); fecharNpc(); } });
  function receberNpcs(data) {
    S.npcs = data.npcs || [];
    S.meusNpcs = data.meusNpcs || [];
    renderFichas();
    // A cópia recém-feita chegou: abre. A ficha aberta foi apagada (em outra aba): fecha.
    if (S.npcEditando && S.npcEditando !== 'novo') {
      const existe = S.meusNpcs.some(item => item.id === S.npcEditando);
      if (!existe && !npcJanela.hidden) fecharNpc();
      else if (existe && npcJanela.hidden) renderNpcJanela();
    }
  }

  // ---------------- A NET (M13) ----------------
  // A aba NET do mestre: as arquiteturas da campanha (Nova, Gerar pelas tabelas, os exemplos, Editar, Apagar). O editor
  // abre numa janela: a grade de andares (linha = andar, coluna = ramo; o andar 1 do ramo A sai do ponto de acesso), o +
  // cria, arrastar move (em cima de outro andar, os dois trocam), e o andar escolhido mostra o que há nele. A conta é a do
  // servidor (mesa-net.js).
  const NET = window.MesaNet;
  // O resumo de uma linha da arquitetura: "Senha DV 8", "Hellhound", "Efreet", "Netrunner: Spider".
  function resumoDaLinha(linha) {
    if (linha.tipo === 'ice') return NET.iceDe(linha.ice).nome;
    if (linha.tipo === 'demonio') return linha.nome || NET.demonioDe(linha.demonio).nome;
    if (linha.tipo === 'netrunner') {
      const ficha = [...S.meusNpcs, ...S.npcs].find(npc => npc.id === linha.npc);
      return `Netrunner${linha.nome || ficha ? `: ${linha.nome || ficha.nome}` : ''}`;
    }
    return `${NET.TIPOS_DE_ANDAR[linha.tipo]}${linha.dv ? ` DV ${linha.dv}` : ''}`;
  }
  function renderNetPainel() {
    const painel = $('#net-painel');
    renderNetruns();
    if (!gm()) { painel.innerHTML = ''; return; }
    const linhas = S.arquiteturas.map(arq => {
      const lida = NET.lerArquitetura(arq);
      const andares = Object.keys(lida.nos).length;
      return `<li><span class="info"><b>${esc(arq.nome)}</b><small>${andares} ${andares === 1 ? 'andar' : 'andares'} · ${lida.colunas} ${lida.colunas === 1 ? 'ramo' : 'ramos'} · DV ${lida.dv}${arq.origem ? ' · do Foundry' : ''}</small></span>
        <button class="botao vazado pequeno" type="button" data-arq-editar="${esc(arq.id)}">Editar</button></li>`;
    }).join('');
    painel.innerHTML = `<div class="grupo-npc">Arquiteturas da NET</div>
      <p class="nota">Só você vê. Ponha um ponto de acesso no mapa pela ferramenta NET (K) e escolha nele a arquitetura.</p>
      <div class="cartao-acoes"><button class="botao pequeno" type="button" data-arq-nova>+ Nova</button></div>
      <div class="campo-linha"><label class="campo cresce">Gerar pelas tabelas do CORE <select data-arq-dificuldade>${Object.entries(NET.DIFICULDADES).map(([id, nome]) => `<option value="${id}">${nome}</option>`).join('')}</select></label>
        <button class="botao vazado pequeno" type="button" data-arq-gerar>Gerar</button></div>
      <div class="campo-linha"><label class="campo cresce">Exemplo <select data-arq-exemplo>${NET.EXEMPLOS.map((exemplo, i) => `<option value="${i}">${esc(exemplo.nome)}</option>`).join('')}</select></label>
        <button class="botao vazado pequeno" type="button" data-arq-por-exemplo>Pôr</button></div>
      ${linhas ? `<ul class="lista arq-lista">${linhas}</ul>` : '<p class="nota">Nenhuma arquitetura ainda.</p>'}`;
  }
  $('#net-painel').addEventListener('click', event => {
    const botao = event.target.closest('button');
    if (!botao || !gm()) return;
    if (botao.hasAttribute('data-arq-nova')) abrirArquitetura(null);
    if (botao.dataset.arqEditar) abrirArquitetura(botao.dataset.arqEditar);
    if (botao.hasAttribute('data-arq-gerar')) {
      op('arquitetura.gerar', { dificuldade: $('#net-painel [data-arq-dificuldade]').value })
        .then(resposta => {
          const r = resposta.resultado;
          aviso(`Gerada: ${r.total} andares.`);
          // A lista nova pode chegar antes ou depois da resposta: abre agora, ou quando ela chegar.
          if (S.arquiteturas.some(arq => arq.id === r.id)) abrirArquitetura(r.id); else S.arqAbrir = r.id;
        }).catch(() => {});
    }
    if (botao.hasAttribute('data-arq-por-exemplo')) {
      const exemplo = NET.EXEMPLOS[Number($('#net-painel [data-arq-exemplo]').value)];
      if (exemplo) op('arquitetura.salvar', { arquitetura: exemplo }).then(() => aviso(`${exemplo.nome}: pronta.`)).catch(() => {});
    }
  });
  function receberArquiteturas(data) {
    S.arquiteturas = data.arquiteturas || [];
    renderNetPainel();
    S.pontoForm = null;
    renderPontoOpcoes();
    // A gerada agora: abre no editor. A aberta foi apagada (em outra aba): fecha.
    if (S.arqAbrir && S.arquiteturas.some(arq => arq.id === S.arqAbrir)) { abrirArquitetura(S.arqAbrir); S.arqAbrir = null; }
    if (S.arqEditando && S.arqEditando.id && !S.arquiteturas.some(arq => arq.id === S.arqEditando.id)) fecharArquitetura();
  }

  // O editor. S.arqEditando: a cópia sendo editada (nome, descrição, DV, as linhas) e o andar escolhido ("3b").
  function abrirArquitetura(id) {
    const arq = id ? S.arquiteturas.find(item => item.id === id) : null;
    S.arqEditando = arq
      ? { id: arq.id, nome: arq.nome, descricao: arq.descricao || '', dv: arq.dv || 0, andares: arq.andares.map(linha => ({ ...linha })), sel: '1a' }
      : { id: null, nome: 'Nova arquitetura', descricao: '', dv: 0, andares: [NET.novaLinha([])], sel: '1a' };
    renderArqJanela();
  }
  function fecharArquitetura() {
    S.arqEditando = null;
    const janela = $('#arq-janela');
    janela.hidden = true;
    janela.innerHTML = '';
  }
  const CELULA = { w: 92, h: 46, gx: 16, gy: 24 };
  // A grade em SVG: a entrada no alto, um retângulo por andar (com o resumo), a linha de cada andar até o pai, e um + em
  // cada lugar vazio da grade (até um andar e um ramo além dos que existem).
  function svgDaGrade(ed) {
    const lida = NET.lerArquitetura({ andares: ed.andares });
    const colunas = Math.min(NET.RAMOS.length, lida.colunas + 1);
    const andares = Math.min(NET.ANDAR_MAX, lida.andares + 1);
    const x = coluna => 8 + coluna * (CELULA.w + CELULA.gx);
    const y = andar => 8 + andar * (CELULA.h + CELULA.gy);
    const largura = x(colunas) - CELULA.gx + 8;
    const altura = y(andares + 1) - CELULA.gy + 8;
    const ondeEsta = id => (id === NET.ENTRADA ? { coluna: 0, andar: 0 } : { coluna: NET.RAMOS.indexOf(lida.nos[id].ramo), andar: lida.nos[id].andar });
    const linhas = Object.values(lida.nos).map(no => {
      const de = ondeEsta(no.pai);
      const para = ondeEsta(no.id);
      const x1 = x(de.coluna) + CELULA.w / 2;
      const y1 = y(de.andar) + CELULA.h;
      const x2 = x(para.coluna) + CELULA.w / 2;
      const y2 = y(para.andar);
      const meio = y2 - CELULA.gy / 2;
      return `<path d="M${x1} ${y1} V${meio} H${x2} V${y2}" />`;
    }).join('');
    const nos = Object.values(lida.nos).map(no => {
      const { coluna, andar } = ondeEsta(no.id);
      const resumo = no.conteudos.map(resumoDaLinha).join(', ');
      const curto = resumo.length > 15 ? `${resumo.slice(0, 14)}…` : resumo;
      const perigo = no.conteudos.some(c => c.tipo === 'ice' || c.tipo === 'demonio' || c.tipo === 'netrunner');
      return `<g class="arq-no${perigo ? ' perigo' : ''}${ed.sel === no.id ? ' escolhido' : ''}" data-pos="${no.id}" tabindex="0" role="button" aria-label="Andar ${no.andar}${no.ramo !== 'a' ? ` ramo ${no.ramo.toUpperCase()}` : ''}: ${esc(resumo)}">
        <title>${esc(resumo)}</title><rect x="${x(coluna)}" y="${y(andar)}" width="${CELULA.w}" height="${CELULA.h}" rx="4"/>
        <text x="${x(coluna) + 6}" y="${y(andar) + 15}" class="arq-id">${no.andar}${no.ramo.toUpperCase()}</text><text x="${x(coluna) + 6}" y="${y(andar) + 34}">${esc(curto)}</text></g>`;
    }).join('');
    const vazios = [];
    for (let andar = 1; andar <= andares; andar++) {
      for (let coluna = 0; coluna < colunas; coluna++) {
        const id = `${andar}${NET.RAMOS[coluna]}`;
        if (lida.nos[id]) continue;
        vazios.push(`<g class="arq-mais" data-pos="${id}" tabindex="0" role="button" aria-label="Criar o andar ${andar}${coluna ? ` no ramo ${NET.RAMOS[coluna].toUpperCase()}` : ''}"><rect x="${x(coluna)}" y="${y(andar)}" width="${CELULA.w}" height="${CELULA.h}" rx="4"/><text x="${x(coluna) + CELULA.w / 2}" y="${y(andar) + 29}">+</text></g>`);
      }
    }
    return `<svg class="arq-svg" viewBox="0 0 ${largura} ${altura}" width="${largura}" height="${altura}" role="group" aria-label="A grade de andares">
      <g class="arq-linhas-svg">${linhas}</g>
      <g class="arq-entrada"><rect x="${x(0)}" y="${y(0)}" width="${CELULA.w}" height="${CELULA.h}" rx="4"/><text x="${x(0) + 6}" y="${y(0) + 19}">Ponto de</text><text x="${x(0) + 6}" y="${y(0) + 34}">acesso</text></g>
      ${vazios.join('')}${nos}</svg>`;
  }
  // O andar escolhido: cada conteúdo com o tipo e o que ele pede (a DV, o modelo do Black ICE ou do demônio, a ficha do
  // netrunner inimigo), o nome e a descrição (o que o Eye-Dee e o Control revelam).
  function htmlDaLinhaDeArquitetura(linha, i) {
    const opcao = (valor, nome, atual) => `<option value="${esc(valor)}"${valor === atual ? ' selected' : ''}>${esc(nome)}</option>`;
    const campos = [`<label class="campo">Tipo <select data-arq-campo="tipo">${Object.entries(NET.TIPOS_DE_ANDAR).map(([id, nome]) => opcao(id, nome, linha.tipo)).join('')}</select></label>`];
    if (NET.COM_DV.includes(linha.tipo)) campos.push(`<label class="campo mod">DV <input data-arq-campo="dv" type="number" min="4" max="20" value="${linha.dv || NET.DV_SEM_ANDARES}"></label>`);
    if (linha.tipo === 'ice') campos.push(`<label class="campo cresce">Black ICE <select data-arq-campo="ice">${opcao('', 'Sem modelo (o mestre ajusta)', linha.ice)}${Object.entries(NET.BLACK_ICE).map(([id, ice]) => opcao(id, `${ice.nome} · ${ice.classe}`, linha.ice)).join('')}</select></label>`);
    if (linha.tipo === 'demonio') campos.push(`<label class="campo cresce">Demônio <select data-arq-campo="demonio">${Object.entries(NET.DEMONIOS).map(([id, d]) => opcao(id, `${d.nome} · REZ ${d.rez}`, linha.demonio)).join('')}</select></label>`);
    if (linha.tipo === 'netrunner') campos.push(`<label class="campo cresce">Ficha <select data-arq-campo="npc">${opcao('', '— só o nome —', linha.npc)}${[...S.meusNpcs, ...S.npcs].map(npc => opcao(npc.id, npc.nome, linha.npc)).join('')}</select></label>`);
    const comNome = ['demonio', 'netrunner', 'arquivo', 'controle'].includes(linha.tipo);
    const ice = linha.tipo === 'ice' ? NET.iceDe(linha.ice) : null;
    return `<li class="arq-linha" data-arq-linha="${i}"><div class="campo-linha">${campos.join('')}<button type="button" class="link" data-arq-tirar-linha aria-label="Tirar este conteúdo">×</button></div>
      ${ice ? `<p class="nota">PER ${ice.per} · SPD ${ice.spd} · ATK ${ice.atk} · DEF ${ice.def} · REZ ${ice.rez}. ${esc(ice.efeito)}</p>` : ''}
      ${comNome ? `<label class="campo">Nome <input data-arq-campo="nome" type="text" maxlength="60" value="${esc(linha.nome || '')}" placeholder="${linha.tipo === 'arquivo' ? 'Agenda do fixer' : linha.tipo === 'controle' ? 'Câmeras do pátio' : ''}"></label>` : ''}
      ${linha.tipo !== 'vazio' ? `<label class="campo">Descrição <textarea data-arq-campo="descricao" rows="2" maxlength="500" placeholder="${linha.tipo === 'arquivo' ? 'O que o Eye-Dee revela.' : linha.tipo === 'controle' ? 'O que o nó comanda.' : 'Só você vê.'}">${esc(linha.descricao || '')}</textarea></label>` : ''}</li>`;
  }
  function htmlDoAndarEscolhido(ed) {
    const pos = NET.lerPosicao(ed.sel);
    const linhas = pos ? ed.andares.map((linha, i) => ({ linha, i })).filter(({ linha }) => Number(linha.andar) === pos.andar && (linha.ramo || 'a') === pos.ramo) : [];
    if (!linhas.length) return '<p class="nota">Escolha um andar na grade, ou um + para criar. Arraste um andar para mover; em cima de outro, os dois trocam.</p>';
    return `<div class="grupo-npc">Andar ${pos.andar}${pos.ramo !== 'a' ? ` · ramo ${pos.ramo.toUpperCase()}` : ''}</div>
      <ul class="arq-linhas">${linhas.map(({ linha, i }) => htmlDaLinhaDeArquitetura(linha, i)).join('')}</ul>
      <div class="cartao-acoes"><button class="botao vazado pequeno" type="button" data-arq-mais-linha>+ Conteúdo</button><button class="botao vazado pequeno perigo" type="button" data-arq-tirar-andar>Apagar o andar</button></div>`;
  }
  function renderArqJanela() {
    const janela = $('#arq-janela');
    const ed = S.arqEditando;
    if (!gm() || !ed) { janela.hidden = true; janela.innerHTML = ''; return; }
    const lida = NET.lerArquitetura({ andares: ed.andares, dv: ed.dv });
    janela.innerHTML = `<form class="arq-form" novalidate>
      <div class="nota-janela-topo"><h2 id="arq-janela-titulo">${ed.id ? esc(ed.nome) : 'Nova arquitetura'}</h2><button class="nota-janela-fechar" type="button" data-arq-fechar aria-label="Fechar">×</button></div>
      <div class="campo-linha"><label class="campo cresce">Nome <input name="nome" type="text" maxlength="60" required value="${esc(ed.nome)}"></label>
        <label class="campo mod">DV <input name="dv" type="number" min="0" max="20" value="${ed.dv || 0}" title="A DV do Pathfinder, do Cloak e do Virus. 0: a maior dos andares (agora, ${lida.dv})."></label></div>
      <label class="campo">Descrição <textarea name="descricao" rows="2" maxlength="1000" placeholder="Só você vê.">${esc(ed.descricao)}</textarea></label>
      <div class="arq-corpo"><div class="arq-grade">${svgDaGrade(ed)}</div><div class="arq-andar">${htmlDoAndarEscolhido(ed)}</div></div>
      <div class="nota-janela-acoes"><button class="botao" type="submit">Salvar</button><button class="botao vazado" type="button" data-arq-fechar>Cancelar</button>${ed.id ? '<button class="botao vazado perigo" type="button" data-arq-apagar>Apagar</button>' : ''}</div>
    </form>`;
    janela.hidden = false;
  }
  // Refaz só a grade e o andar escolhido (o nome e a descrição não perdem o cursor).
  function renderArqCorpo() {
    const corpo = $('#arq-janela .arq-corpo');
    if (!corpo || !S.arqEditando) return renderArqJanela();
    corpo.innerHTML = `<div class="arq-grade">${svgDaGrade(S.arqEditando)}</div><div class="arq-andar">${htmlDoAndarEscolhido(S.arqEditando)}</div>`;
  }
  // O clique numa célula da grade: o andar escolhido, ou o andar novo no +.
  function escolherCelula(pos) {
    const ed = S.arqEditando;
    if (!ed || !NET.lerPosicao(pos)) return;
    if (!ed.andares.some(linha => `${linha.andar}${linha.ramo || 'a'}` === pos)) ed.andares = NET.criarAndar(ed.andares, pos);
    ed.sel = pos;
    renderArqCorpo();
  }
  const arqJanela = $('#arq-janela');
  arqJanela.addEventListener('submit', event => {
    event.preventDefault();
    const ed = S.arqEditando;
    if (!ed) return;
    if (!ed.nome.trim()) { aviso('Dê um nome à arquitetura.', 'erro'); return; }
    const arquitetura = { nome: ed.nome, descricao: ed.descricao, dv: Number(ed.dv) || 0, andares: ed.andares };
    op('arquitetura.salvar', ed.id ? { id: ed.id, arquitetura } : { arquitetura }).then(() => { fecharArquitetura(); aviso(`${arquitetura.nome}: salva.`); }).catch(() => {});
  });
  arqJanela.addEventListener('input', event => {
    const ed = S.arqEditando;
    if (!ed) return;
    if (['nome', 'descricao', 'dv'].includes(event.target.name)) ed[event.target.name] = event.target.value;
    const campo = event.target.dataset.arqCampo;
    const li = event.target.closest('[data-arq-linha]');
    if (campo && li && ['nome', 'descricao', 'dv'].includes(campo)) ed.andares[Number(li.dataset.arqLinha)][campo] = campo === 'dv' ? Number(event.target.value) || 0 : event.target.value;
  });
  arqJanela.addEventListener('change', event => {
    const ed = S.arqEditando;
    const campo = event.target.dataset.arqCampo;
    const li = event.target.closest('[data-arq-linha]');
    if (!ed || !campo || !li) return;
    const i = Number(li.dataset.arqLinha);
    // O tipo, o modelo e a ficha mudam o que a linha mostra: confere a linha e refaz.
    if (['tipo', 'ice', 'demonio', 'npc'].includes(campo)) {
      ed.andares[i] = NET.limparLinha({ ...ed.andares[i], [campo]: event.target.value, ...(campo === 'tipo' ? { dv: ed.andares[i].dv || NET.DV_SEM_ANDARES } : {}) });
      renderArqCorpo();
    } else if (campo === 'dv') renderArqCorpo();
  });
  arqJanela.addEventListener('click', event => {
    const ed = S.arqEditando;
    const celula = event.target.closest('[data-pos]');
    if (celula && ed && !S.arqArrastou) { escolherCelula(celula.dataset.pos); return; }
    const botao = event.target.closest('button');
    if (!botao || !ed) return;
    const pos = NET.lerPosicao(ed.sel);
    if (botao.hasAttribute('data-arq-fechar')) fecharArquitetura();
    else if (botao.hasAttribute('data-arq-mais-linha') && pos) { ed.andares = [...ed.andares, NET.limparLinha({ ...pos, tipo: 'senha', dv: NET.DV_SEM_ANDARES })]; renderArqCorpo(); }
    else if (botao.hasAttribute('data-arq-tirar-linha')) { ed.andares = ed.andares.filter((linha, i) => i !== Number(botao.closest('[data-arq-linha]').dataset.arqLinha)); renderArqCorpo(); }
    else if (botao.hasAttribute('data-arq-tirar-andar') && pos) { ed.andares = ed.andares.filter(linha => !(Number(linha.andar) === pos.andar && (linha.ramo || 'a') === pos.ramo)); renderArqCorpo(); }
    else if (botao.hasAttribute('data-arq-apagar') && ed.id && confirm(`Apagar a arquitetura ${ed.nome}?`)) op('arquitetura.apagar', { id: ed.id }).then(fecharArquitetura).catch(() => {});
  });
  arqJanela.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); fecharArquitetura(); return; }
    const celula = event.target.closest && event.target.closest('[data-pos]');
    if (celula && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); escolherCelula(celula.dataset.pos); }
  });
  // Arrastar um andar para outra célula da grade (em cima de outro andar, os dois trocam).
  arqJanela.addEventListener('pointerdown', event => {
    const no = event.target.closest('.arq-no');
    if (!no || !S.arqEditando || event.button !== 0) return;
    S.arqArrasto = { de: no.dataset.pos, x: event.clientX, y: event.clientY };
    S.arqArrastou = false;
  });
  window.addEventListener('pointermove', event => {
    const arrasto = S.arqArrasto;
    if (!arrasto) return;
    if (Math.hypot(event.clientX - arrasto.x, event.clientY - arrasto.y) > 6) S.arqArrastou = true;
    for (const celula of arqJanela.querySelectorAll('[data-pos].alvo')) celula.classList.remove('alvo');
    const sob = S.arqArrastou && document.elementFromPoint(event.clientX, event.clientY);
    const alvo = sob && sob.closest && sob.closest('#arq-janela [data-pos]');
    if (alvo && alvo.dataset.pos !== arrasto.de) alvo.classList.add('alvo');
  });
  window.addEventListener('pointerup', event => {
    const arrasto = S.arqArrasto;
    S.arqArrasto = null;
    if (!arrasto || !S.arqArrastou || !S.arqEditando) return;
    const sob = document.elementFromPoint(event.clientX, event.clientY);
    const alvo = sob && sob.closest && sob.closest('#arq-janela [data-pos]');
    if (alvo && alvo.dataset.pos !== arrasto.de) {
      S.arqEditando.andares = NET.moverAndar(S.arqEditando.andares, arrasto.de, alvo.dataset.pos);
      S.arqEditando.sel = alvo.dataset.pos;
      renderArqCorpo();
    }
    // O clique que vem depois do arrasto não escolhe a célula.
    setTimeout(() => { S.arqArrastou = false; }, 0);
  });

  // A NET no cartão: o rank de Interface, as Ações NET por turno, o cyberdeck equipado, os programas e o hardware.
  function htmlDaNet(token) {
    const n = token.netrunner;
    if (!n) return '';
    const programas = (n.programas || []).map(p => `<li><span class="info"><b>${esc(p.nome)}</b><small>${esc(NET.CLASSES_DE_PROGRAMA[p.classe] || 'Programa')}${p.atk ? ` · ATK ${p.atk}` : ''}${p.rez ? ` · REZ ${p.rezAtual}/${p.rez}` : ''}${p.qtd > 1 ? ` · ×${p.qtd}` : ''}</small></span>${p.destruido ? '<span class="tag falha">destruído</span>' : p.ativo ? '<span class="tag sucesso">ativo</span>' : ''}</li>`).join('');
    const hardware = (n.hardware || []).map(h => `<span class="tag">${esc(h.nome)}</span>`).join('');
    const deck = n.deck ? `<p class="nota"><b>${esc(n.deck.nome)}</b> · ${n.deck.slots} slots</p>` : token.tipo === 'pj' ? '<p class="nota">Sem cyberdeck equipado (na ficha, equipe um).</p>' : '';
    return `<div class="net-cartao"><div class="grupo-npc">NET · Interface ${n.rank} · ${n.acoes} Ações NET por turno</div>${deck}
      ${programas ? `<ul class="lista net-programas">${programas}</ul>` : n.deck ? '<p class="nota">Nenhum programa no deck.</p>' : ''}${hardware ? `<div>${hardware}</div>` : ''}</div>`;
  }

  // ---------------- A janela da NET (M13) ----------------
  // A aba NET mostra o netrun aberto: o do ponto que a pessoa clicou, ou o primeiro em que ela está. O jogador vê o mapa
  // que achou, o andar escolhido, as habilidades de Interface e o registro; o mestre vê a arquitetura inteira (o que eles
  // ainda não acharam fica tracejado), revela e reinicia. É a janela do NET Architect no Foundry.
  const CELULA_NET = { w: 66, h: 40, gx: 10, gy: 16 };
  const posicaoDoNo = id => (id === NET.ENTRADA ? { coluna: 0, andar: 0 } : { coluna: Math.max(0, NET.RAMOS.indexOf(String(id).replace(/^\d+/, ''))), andar: parseInt(id, 10) || 0 });
  const tituloDoNo = no => (no.id === NET.ENTRADA ? 'Ponto de acesso' : `Andar ${no.andar}${no.ramo !== 'a' ? ` · ramo ${no.ramo.toUpperCase()}` : ''}`);
  const inimigoAtivo = conteudo => Boolean(conteudo.inimigo) && !conteudo.feito;
  // O conteúdo como o mestre recebe, no formato do que vai para o jogador (o inimigo com os números da tabela).
  function conteudoDoMestre(c) {
    const base = { chave: c.chave, tipo: c.tipo, dv: c.dv, feito: c.feito, nome: c.nome, descricao: c.descricao };
    if (c.tipo === 'ice') {
      const ice = NET.iceDe(c.ice);
      return { ...base, inimigo: { nome: c.nomeInimigo, classe: ice.classe, per: ice.per, spd: ice.spd, atk: ice.atk, def: ice.def, efeito: ice.efeito, rez: ice.rez, rezAtual: c.rezAtual } };
    }
    if (c.tipo === 'demonio') {
      const demonio = NET.demonioDe(c.demonio);
      return { ...base, inimigo: { nome: c.nomeInimigo, classe: 'Demônio', interface: demonio.interface, acoes: demonio.acoes, rez: demonio.rez, rezAtual: c.rezAtual } };
    }
    if (c.tipo === 'netrunner') return { ...base, inimigo: { nome: c.nomeInimigo, classe: 'Netrunner inimigo', ativo: !c.feito } };
    return base;
  }
  // Os andares do netrun: os do jogador como vieram (o vizinho que ele não achou vem sem o conteúdo); os do mestre, todos,
  // com visto = o que os netrunners já acharam.
  function nosDoNetrun(run) {
    if (!run.completa) return run.nos;
    const vistos = new Set(run.vistos || []);
    return run.completa.map(no => ({ ...no, visto: Boolean(run.mapa) || vistos.has(no.id), conteudos: no.conteudos.map(conteudoDoMestre) }));
  }
  const resumoDoNo = no => (!no.conteudos ? '?' : no.conteudos.map(c => (c.inimigo ? c.inimigo.nome : `${NET.TIPOS_DE_ANDAR[c.tipo] || c.tipo}${c.dv ? ` DV ${c.dv}` : ''}`)).join(', ') || 'Vazio');
  // Os vizinhos de um andar: o de cima e os de baixo (para onde o netrunner vai).
  const vizinhosNoNetrun = (nos, id) => [id === NET.ENTRADA ? null : (nos.find(no => no.id === id) || {}).pai || null, ...nos.filter(no => no.pai === id).map(no => no.id)].filter(Boolean);
  function netrunAberto() {
    const runs = runsDaCena();
    return runs.find(run => run.ponto === S.netAberto) || runs.find(run => run.corredores.some(corredor => corredor.meu)) || runs[0] || null;
  }
  // O netrunner da janela: o escolhido (nas fichas de cima), o token escolhido no mapa ou o primeiro de quem olha.
  function corredorAberto(run) {
    const meus = run.corredores.filter(corredor => corredor.meu);
    return meus.find(corredor => corredor.token === S.netCorredor) || meus.find(corredor => corredor.token === S.selecionado) || meus[0] || null;
  }
  function abrirNet(ponto, token = null) {
    S.netAberto = ponto;
    if (token) S.netCorredor = token;
    S.netNo = null;
    // O netrun novo ainda não chegou (a resposta veio antes do evento): abre quando ele chegar.
    if (!runsDaCena().some(run => run.ponto === ponto)) { S.netAbrir = ponto; return; }
    S.netAbrir = null;
    renderNetruns();
    abrirAba('net');
  }
  // A aba NET: o mestre sempre; o jogador, enquanto tem um token na NET.
  function renderAbaDaNet() {
    const botao = $('.abas [data-aba="net"]');
    const mostra = gm() || runsDaCena().length > 0;
    botao.hidden = !mostra;
    if (!mostra && botao.classList.contains('ativa')) abrirAba('rolagens', { expandir: false });
  }

  function svgDoNetrun(run, nos, corredor, escolhido) {
    const { w, h, gx, gy } = CELULA_NET;
    const x = coluna => 6 + coluna * (w + gx);
    const y = andar => 6 + andar * (h + gy);
    const colunas = Math.max(1, ...nos.map(no => posicaoDoNo(no.id).coluna + 1));
    const andares = Math.max(0, ...nos.map(no => no.andar));
    const largura = x(colunas) - gx + 6;
    const altura = y(andares + 1) - gy + 6;
    const vizinhos = new Set(corredor ? vizinhosNoNetrun(nos, corredor.no) : []);
    const linhas = nos.map(no => {
      const de = posicaoDoNo(no.pai || NET.ENTRADA);
      const para = posicaoDoNo(no.id);
      return `<path${no.visto ? '' : ' class="nao-visto"'} d="M${x(de.coluna) + w / 2} ${y(de.andar) + h} V${y(para.andar) - gy / 2} H${x(para.coluna) + w / 2} V${y(para.andar)}"/>`;
    }).join('');
    const caixa = (no, rotuloDoNo) => {
      const { coluna, andar } = posicaoDoNo(no.id);
      const texto = no.id === NET.ENTRADA ? 'Entrada' : resumoDoNo(no);
      const classes = ['net-no', no.id === NET.ENTRADA && 'entrada', no.visto === false && 'nao-visto', (no.conteudos || []).some(inimigoAtivo) && 'perigo',
        corredor && corredor.no === no.id && 'aqui', vizinhos.has(no.id) && 'vizinho', escolhido === no.id && 'escolhido'].filter(Boolean).join(' ');
      const curto = texto.length > 9 ? `${texto.slice(0, 8)}…` : texto;
      // Quem está no andar: uma bolinha por netrunner (a de quem olha, em ciano).
      const marcas = run.corredores.filter(item => item.no === no.id).map((item, i) => `<circle class="net-marca${item.meu ? ' meu' : ''}" cx="${x(coluna) + w - 8 - i * 12}" cy="${y(andar) + 9}" r="5"><title>${esc(item.nome)}</title></circle>`).join('');
      return `<g class="${classes}" data-net-no="${esc(no.id)}" tabindex="0" role="button" aria-label="${esc(`${tituloDoNo(no)}: ${texto}`)}"><title>${esc(texto)}</title>
        <rect x="${x(coluna)}" y="${y(andar)}" width="${w}" height="${h}" rx="4"/><text x="${x(coluna) + 5}" y="${y(andar) + 15}" class="arq-id">${esc(rotuloDoNo)}</text><text x="${x(coluna) + 5}" y="${y(andar) + 32}">${esc(curto)}</text>${marcas}</g>`;
    };
    return `<svg class="arq-svg net-svg" viewBox="0 0 ${largura} ${altura}" width="${largura}" height="${altura}" role="group" aria-label="O mapa da arquitetura">
      <g class="arq-linhas-svg">${linhas}</g>${caixa({ id: NET.ENTRADA, andar: 0, ramo: 'a', visto: true }, 'Acesso')}${nos.map(no => caixa(no, `${no.andar}${no.ramo.toUpperCase()}`)).join('')}</svg>`;
  }
  // O andar escolhido no mapa: o que há nele (os inimigos com os números e a REZ) e, se for vizinho, o botão de ir.
  function htmlDoAndar(nos, corredor, id) {
    const no = id === NET.ENTRADA ? { id, andar: 0, ramo: 'a', visto: true, conteudos: [] } : nos.find(item => item.id === id);
    if (!no) return '<p class="nota">Escolha um andar no mapa.</p>';
    const vizinho = corredor && corredor.no !== id && vizinhosNoNetrun(nos, corredor.no).includes(id);
    const ir = vizinho ? `<button class="botao pequeno" type="button" data-net-ir="${esc(id)}">${no.pai === corredor.no ? 'Descer para cá' : 'Subir para cá'}</button>` : '';
    const cabeca = `<div class="net-andar-topo"><b>${esc(tituloDoNo(no))}</b>${gm() && no.visto === false ? '<span class="tag secreta">escondido deles</span>' : ''}${ir}</div>`;
    if (id === NET.ENTRADA) return `<div class="net-andar">${cabeca}<p class="nota">Onde a conexão começa. Andar pela arquitetura não gasta Ação NET; em combate, conectar, desconectar e cada habilidade gastam 1.</p></div>`;
    if (!no.conteudos) return `<div class="net-andar">${cabeca}<p class="nota">Ainda não revelado: chegue até ele ou use o Pathfinder.</p></div>`;
    const itens = no.conteudos.map(c => {
      if (c.inimigo) {
        const i = c.inimigo;
        const numeros = c.tipo === 'ice' ? [['PER', i.per], ['SPD', i.spd], ['ATK', i.atk], ['DEF', i.def]] : c.tipo === 'demonio' ? [['Interface', i.interface], ['Ações', i.acoes]] : [];
        const barra = i.rez ? `<div class="net-barra"><span style="width:${Math.max(0, Math.min(100, (Math.max(0, i.rezAtual) / i.rez) * 100))}%"></span><em>${i.rezAtual > 0 ? `REZ ${i.rezAtual}/${i.rez}` : 'derrubado'}</em></div>` : '';
        const texto = c.tipo === 'ice' ? i.efeito : c.tipo === 'demonio' ? 'Passa pelas senhas, sempre vence a velocidade e não se dribla com o Slide.' : c.feito ? 'Já caiu da NET.' : 'Defende com a Interface + 1d10 e ataca com o Zap.';
        return `<li class="net-item perigo${c.feito ? ' feito' : ''}"><div><b>${esc(i.nome)}</b> <small>${esc(i.classe || '')}</small>${numeros.length ? ` <span class="net-stats">${numeros.map(([rotuloDoNumero, valor]) => `${rotuloDoNumero} <b>${valor}</b>`).join(' · ')}</span>` : ''}</div>${barra}${texto ? `<p class="nota">${esc(texto)}</p>` : ''}</li>`;
      }
      const situacao = { senha: c.feito ? 'quebrada' : 'trancada', arquivo: c.feito ? 'copiado' : 'por identificar', controle: c.feito ? 'tomado' : 'livre' }[c.tipo] || '';
      // O que o arquivo guarda e o que o nó comanda: o jogador, depois de feito; o mestre, sempre.
      const segredo = (c.nome || c.descricao) && (gm() || c.feito) ? `<p class="nota">${c.nome ? `<b>${esc(c.nome)}</b>${c.descricao ? ': ' : ''}` : ''}${esc(c.descricao || '')}</p>` : '';
      return `<li class="net-item"><div><b>${esc(NET.TIPOS_DE_ANDAR[c.tipo] || c.tipo)}</b>${c.dv ? ` <small>DV ${c.dv}</small>` : ''}${situacao ? ` <span class="tag ${c.feito ? 'sucesso' : 'secreta'}">${situacao}</span>` : ''}</div>${segredo}</li>`;
    }).join('');
    return `<div class="net-andar">${cabeca}<ul class="net-itens">${itens || '<li class="nota">Andar vazio.</li>'}</ul></div>`;
  }
  // Quem está na NET: onde, as Ações NET (em combate, as que sobram neste turno; fora dele, livres), o HP e o Kraken.
  function htmlDoCorredor(nos, corredor, token) {
    const aqui = nos.find(no => no.id === corredor.no);
    const onde = corredor.no === NET.ENTRADA ? 'no ponto de acesso' : aqui ? `no andar ${aqui.andar}${aqui.ramo !== 'a' ? aqui.ramo.toUpperCase() : ''}` : 'na arquitetura';
    const pips = Array.from({ length: corredor.max }, (_, i) => `<i class="net-pip${i < corredor.acoes ? ' usado' : ''}"></i>`).join('');
    const acoes = corredor.emCombate
      ? `<span title="As Ações NET que sobram neste turno (voltam no turno do netrunner)">Ações NET <span class="net-pips">${pips}</span> <b>${Math.max(0, corredor.max - corredor.acoes)}/${corredor.max}</b></span>`
      : `<span title="Fora de combate as Ações NET não contam; em combate são ${corredor.max} por turno">Ações NET <b>livres</b> <small>(${corredor.max} por turno em combate)</small></span>`;
    const hp = token && token.hp && token.hp.max ? `<span>HP <b>${token.hp.atual}/${token.hp.max}</b></span>` : '';
    const rank = token && token.netrunner ? `Interface ${token.netrunner.rank} · ` : '';
    return `<div class="net-corredor"><div><b>${esc(corredor.nome)}</b> <small>${rank}${esc(onde)}</small></div><div class="net-numeros">${acoes}${hp}</div>
      ${corredor.preso > 0 ? '<p class="net-aviso">Preso pelo Kraken: não avança nem desconecta com segurança até o fim do próximo turno.</p>' : ''}</div>`;
  }
  // As habilidades de Interface do andar onde o netrunner está (as que não dá, apagadas, com o porquê), o modificador e a
  // Sorte da próxima rolagem, o vírus no fundo, o nó de controle tomado e a saída.
  function htmlDaHud(nos, corredor, token) {
    const aqui = nos.find(no => no.id === corredor.no);
    const conteudos = (aqui && aqui.conteudos) || [];
    const fundo = corredor.no !== NET.ENTRADA && Boolean(aqui) && !nos.some(no => no.pai === corredor.no);
    const temInimigo = conteudos.some(inimigoAtivo);
    const livre = tipo => conteudos.some(c => c.tipo === tipo && !c.feito);
    const semCombate = temInimigo ? 'O combate na NET ainda não chegou à mesa: o mestre narra.' : 'Sem inimigo ativo neste andar.';
    const pode = {
      pathfinder: [true], cloak: [true],
      backdoor: [livre('senha'), 'Sem senha trancada neste andar.'],
      eyedee: [livre('arquivo'), 'Sem arquivo por identificar neste andar.'],
      control: [livre('controle'), 'Sem nó de controle livre neste andar.'],
      virus: [fundo, 'Só no andar mais fundo da arquitetura.'],
      zap: [false, semCombate], slide: [false, semCombate]
    };
    const botoes = Object.entries(NET.HABILIDADES).map(([chave, info]) => {
      const [ok, motivo] = pode[chave] || [false, ''];
      return `<button class="botao pequeno${ok ? '' : ' vazado'}" type="button" data-net-hab="${chave}"${ok ? '' : ' disabled'} title="${esc(ok ? info.texto : motivo)}">${esc(info.nome)}</button>`;
    }).join('');
    const campos = S.netCampos;
    const controles = conteudos.filter(c => c.tipo === 'controle' && c.feito);
    return `<div class="net-hud"><div class="grupo-npc">Habilidades de Interface</div><div class="net-habilidades">${botoes}</div>
      <div class="campo-linha"><label class="campo mod">Mod <input data-net-campo="mod" type="number" min="-30" max="30" value="${campos.mod}"></label>
        ${token && token.sorte ? `<label class="campo mod" title="A Sorte gasta na próxima rolagem">Sorte <input data-net-campo="sorte" type="number" min="0" max="${token.sorte.atual}" value="${Math.min(campos.sorte, token.sorte.atual)}"></label>` : ''}</div>
      ${fundo ? `<label class="campo">O vírus <input data-net-campo="virus" type="text" maxlength="120" placeholder="O que ele faz (o mestre define a DV e o custo)" value="${esc(campos.virus)}"></label>` : ''}
      ${controles.length ? `<div class="net-controle"><div class="grupo-npc">Nó de controle tomado</div>
        <div class="campo-linha"><label class="campo cresce"><input data-net-campo="comando" type="text" maxlength="200" placeholder="O comando (abrir a porta, girar a torreta…)" value="${esc(campos.comando)}"></label><button class="botao pequeno" type="button" data-net-comandar>Comandar</button></div></div>` : ''}
      <div class="combate-acoes"><button class="botao vazado pequeno" type="button" data-net-desconectar${corredor.preso > 0 && !gm() ? ' disabled title="O Kraken te prende: só a desconexão insegura."' : ' title="Desconectar com segurança (1 Ação NET em combate)"'}>Desconectar</button>
        <button class="botao vazado pequeno perigo" type="button" data-net-desconectar="inseguro" title="Arrancar o plugue: a desconexão insegura">${gm() ? 'Derrubar da NET' : 'Desconexão insegura'}</button></div></div>`;
  }
  function htmlDoMestreNaNet(run, nos, escolhido) {
    const sel = nos.find(no => no.id === escolhido);
    return `<div class="net-mestre"><div class="grupo-npc">Mestre</div><div class="combate-acoes">
      ${sel && sel.visto === false ? `<button class="botao vazado pequeno" type="button" data-net-revelar="${esc(sel.id)}">Revelar este andar</button>` : ''}
      ${run.mapa ? '' : '<button class="botao vazado pequeno" type="button" data-net-revelar="tudo">Revelar o mapa</button>'}
      <button class="botao vazado pequeno perigo" type="button" data-net-reiniciar>Reiniciar a arquitetura</button></div></div>`;
  }
  // O registro do netrun (o mais novo em cima): o que cada um fez e, só aqui, o que o arquivo e o nó revelaram.
  const htmlDoRegistroDaNet = run => `<div class="grupo-npc">Registro da NET</div><ol class="net-log">${run.log.slice(-15).reverse().map(item => `<li class="${esc(item.tipo)}"><small>${esc(hora(item.t))}</small> ${esc(item.texto)}</li>`).join('') || '<li class="nota">Nada ainda.</li>'}</ol>`;

  function renderNetruns() {
    const caixa = $('#net-runs');
    renderAbaDaNet();
    const runs = runsDaCena();
    // Quem está digitando num campo da janela continua: o campo volta com o foco e o cursor no lugar.
    const ativo = document.activeElement;
    const campo = ativo && caixa.contains(ativo) ? ativo.dataset.netCampo : '';
    const cursor = campo && ativo.type === 'text' ? [ativo.selectionStart, ativo.selectionEnd] : null;
    if (!runs.length) {
      caixa.innerHTML = gm() ? '<div class="grupo-npc">Netruns nesta cena</div><p class="nota">Ninguém na NET. Ponha um ponto de acesso pela ferramenta NET (K); o jogador conecta clicando nele.</p>' : '';
      return;
    }
    const run = netrunAberto();
    S.netAberto = run.ponto;
    const nos = nosDoNetrun(run);
    const corredor = corredorAberto(run);
    if (corredor) S.netCorredor = corredor.token;
    const escolhido = S.netNo && (S.netNo === NET.ENTRADA || nos.some(no => no.id === S.netNo)) ? S.netNo : corredor ? corredor.no : NET.ENTRADA;
    const token = corredor && S.tokens.get(corredor.token);
    const meus = run.corredores.filter(item => item.meu);
    const outros = runs.length > 1 ? `<div class="net-chips">${runs.map(item => `<button class="${item === run ? 'ativo' : ''}" type="button" data-net-run="${esc(item.ponto)}">${esc(item.nome)} <small>${item.corredores.length}</small></button>`).join('')}</div>` : '';
    const chips = meus.length > 1 ? `<div class="net-chips">${meus.map(item => `<button class="${corredor && item.token === corredor.token ? 'ativo' : ''}" type="button" data-net-corredor="${esc(item.token)}">${esc(item.nome)}</button>`).join('')}</div>` : '';
    caixa.innerHTML = `${outros}<div class="net-topo"><b>${esc(run.arquitetura)}</b><span>DV ${run.dv}</span><small>${esc(run.nome)}</small>${run.mapa ? '<span class="tag sucesso">mapa revelado</span>' : ''}</div>
      ${chips}${corredor ? htmlDoCorredor(nos, corredor, token) : '<p class="nota">Ninguém conectado neste ponto agora.</p>'}
      <div class="net-mapa">${svgDoNetrun(run, nos, corredor, escolhido)}</div>
      ${htmlDoAndar(nos, corredor, escolhido)}
      ${corredor ? htmlDaHud(nos, corredor, token) : ''}
      ${gm() ? htmlDoMestreNaNet(run, nos, escolhido) : ''}
      ${htmlDoRegistroDaNet(run)}`;
    if (campo) {
      const novo = caixa.querySelector(`[data-net-campo="${campo}"]`);
      if (novo) { novo.focus(); if (cursor) novo.setSelectionRange(...cursor); }
    }
  }
  $('#net-runs').addEventListener('input', event => {
    const campo = event.target.dataset.netCampo;
    if (campo) S.netCampos[campo] = event.target.type === 'number' ? Number(event.target.value) || 0 : event.target.value;
  });
  $('#net-runs').addEventListener('keydown', event => {
    if ((event.key === 'Enter' || event.key === ' ') && event.target.closest('[data-net-no]')) { event.preventDefault(); event.target.closest('[data-net-no]').dispatchEvent(new MouseEvent('click', { bubbles: true })); }
    if (event.key === 'Enter' && event.target.dataset.netCampo === 'comando') $('#net-runs [data-net-comandar]').click();
  });
  $('#net-runs').addEventListener('click', event => {
    const alvo = event.target.closest('[data-net-run], [data-net-corredor], [data-net-no], [data-net-ir], [data-net-hab], [data-net-comandar], [data-net-desconectar], [data-net-revelar], [data-net-reiniciar]');
    const run = alvo && netrunAberto();
    if (!run) return;
    const corredor = corredorAberto(run);
    const pedir = (tipo, dados = {}) => op(tipo, { ponto: run.ponto, token: corredor && corredor.token, ...dados });
    if (alvo.dataset.netRun) { S.netAberto = alvo.dataset.netRun; S.netNo = null; renderNetruns(); return; }
    if (alvo.dataset.netCorredor) { S.netCorredor = alvo.dataset.netCorredor; S.netNo = null; renderNetruns(); return; }
    if (alvo.dataset.netNo) { S.netNo = alvo.dataset.netNo; renderNetruns(); return; }
    if (alvo.dataset.netRevelar) { op('net.revelar', { ponto: run.ponto, ...(alvo.dataset.netRevelar === 'tudo' ? { tudo: true } : { no: alvo.dataset.netRevelar }) }).catch(() => {}); return; }
    if (alvo.hasAttribute('data-net-reiniciar')) {
      if (confirm('Reiniciar a arquitetura? O Black ICE e as senhas voltam, o mapa some e quem está conectado volta ao ponto de acesso.')) op('net.reiniciar', { ponto: run.ponto }).catch(() => {});
      return;
    }
    if (!corredor) return;
    if (alvo.dataset.netIr) { S.netNo = null; pedir('net.mover', { destino: alvo.dataset.netIr }).catch(() => renderNetruns()); return; }
    if (alvo.dataset.netHab) {
      const habilidade = alvo.dataset.netHab;
      const { mod, sorte, virus } = S.netCampos;
      pedir('net.habilidade', { habilidade, mod, sorte, ...(habilidade === 'virus' ? { texto: virus } : {}) })
        .then(() => { Object.assign(S.netCampos, { mod: 0, sorte: 0 }, habilidade === 'virus' ? { virus: '' } : {}); renderNetruns(); }).catch(() => {});
      return;
    }
    if (alvo.hasAttribute('data-net-comandar')) {
      const texto = S.netCampos.comando.trim();
      if (!texto) { aviso('Escreva o comando.'); return; }
      pedir('net.comandar', { texto }).then(() => { S.netCampos.comando = ''; renderNetruns(); }).catch(() => {});
      return;
    }
    if (alvo.hasAttribute('data-net-desconectar')) {
      const inseguro = alvo.dataset.netDesconectar === 'inseguro';
      if (inseguro && !confirm(gm() ? `Derrubar ${corredor.nome} da NET (desconexão insegura)?` : 'Arrancar o plugue (desconexão insegura)?')) return;
      pedir('net.desconectar', { inseguro }).catch(() => {});
    }
  });

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

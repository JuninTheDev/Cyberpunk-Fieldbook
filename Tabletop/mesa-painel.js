// O Painel Tático da mesa da wiki (M14): as contas que não dependem da tela, compartilhadas pelo servidor
// (mesa-api.js) e pela página (mesa.js). Vem da logica.mjs do módulo do Foundry (foundry-painel-tatico): o estado do
// retrato, a imagem de cada estado, os temas, o estilo de cada jogador, o código para compartilhar o estilo e os
// botões de HP. A diferença: as imagens do retrato são arquivos da mesa (o nome do arquivo em /api/mesa/midia), e as
// fontes são as que a wiki já tem.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MesaPainel = api;
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';

  // ---------------- Estados do retrato ----------------
  // Os quatro do RED (pelo HP) e "Morto" (o Death Save que falhou, ou o mestre marcou).
  const ESTADOS = ['notWounded', 'lightlyWounded', 'seriouslyWounded', 'mortallyWounded', 'dead'];
  const NOMES_DOS_ESTADOS = {
    notWounded: 'Sem ferimentos',
    lightlyWounded: 'Levemente Ferido',
    seriouslyWounded: 'Gravemente Ferido',
    mortallyWounded: 'Mortalmente Ferido',
    dead: 'Morto'
  };
  // O estado da mesa (o nome em português que o servidor manda no token) para o do retrato.
  const DO_NOME = Object.fromEntries(Object.entries(NOMES_DOS_ESTADOS).map(([chave, nome]) => [nome, chave]));
  function estadoDoRetrato({ estado, morto = false } = {}) {
    if (morto) return 'dead';
    if (ESTADOS.includes(estado)) return estado;
    return DO_NOME[estado] || 'notWounded';
  }

  const limparNome = valor => (typeof valor === 'string' ? valor.trim() : '');

  // A imagem de um estado: a dele; sem ela, a do estado mais leve mais próximo, até a base (Sem ferimentos); sem
  // nenhuma, a reserva (o retrato da ficha). propria: a imagem é do próprio estado (o efeito automático não entra).
  function imagemDoEstado(imagens, estado, reserva = '') {
    const lista = imagens && typeof imagens === 'object' ? imagens : {};
    const indice = Math.max(0, ESTADOS.indexOf(estado));
    for (let i = indice; i >= 0; i--) {
      const midia = limparNome(lista[ESTADOS[i]]);
      if (midia) return { midia, propria: i === indice, de: ESTADOS[i] };
    }
    return { midia: '', reserva: reserva || '', propria: false, de: null };
  }

  // O efeito automático do estado no retrato (tinta vermelha, falha de sinal, cinza do morto): sempre, nunca, ou só
  // quando o estado não tem imagem própria.
  function efeitoDoRetrato({ estado, propria, modo = 'semImagem' }) {
    if (estado === 'notWounded' || modo === 'nunca') return '';
    if (modo === 'semImagem' && propria) return '';
    return estado;
  }

  function limitar(valor, min, max, padrao) {
    const n = Number(valor);
    if (valor === null || valor === undefined || valor === '' || !Number.isFinite(n)) return padrao;
    return Math.round(Math.min(max, Math.max(min, n)));
  }

  // O ajuste do retrato de um personagem (o dono configura): as imagens, o tamanho, o deslocamento, o espelho e o modo.
  // aceita(nome): o servidor confere se o arquivo existe na mesa (sem ela, vale qualquer nome).
  const RETRATO_PADRAO = Object.freeze({ imagens: {}, escala: 100, x: 0, y: 0, espelhar: false, modo: 'auto' });
  function normalizarRetrato(dados, aceita = () => true) {
    const d = dados && typeof dados === 'object' ? dados : {};
    const imagens = {};
    for (const estado of ESTADOS) {
      const midia = limparNome(d.imagens && d.imagens[estado]);
      if (midia && aceita(midia)) imagens[estado] = midia;
    }
    return {
      imagens,
      escala: limitar(d.escala, 40, 250, 100),
      x: limitar(d.x, -300, 300, 0),
      y: limitar(d.y, -300, 300, 0),
      espelhar: Boolean(d.espelhar),
      modo: ['auto', 'livre', 'moldura'].includes(d.modo) ? d.modo : 'auto'
    };
  }
  // Livre: o PNG sai da barra, em pé sobre ela. Moldura: a imagem num quadro dentro da barra. No automático, livre
  // quando o personagem tem alguma imagem do painel.
  const modoDoRetrato = retrato => (retrato.modo === 'auto' ? (Object.keys(retrato.imagens || {}).length ? 'livre' : 'moldura') : retrato.modo);

  // ---------------- Estilo ----------------
  const TEMAS = {
    morana: { nome: 'Morana', acento: '#00ffd2', acento2: '#ff2e63', destaque: '#f8ef02', fundo: '#060b0e', texto: '#e2f7f2' },
    arasaka: { nome: 'Arasaka', acento: '#ff1f3d', acento2: '#f2f2f2', destaque: '#ff8a00', fundo: '#0d0507', texto: '#f3e9ea' },
    militech: { nome: 'Militech', acento: '#c8d64b', acento2: '#ff7a1a', destaque: '#f2c230', fundo: '#0b0e07', texto: '#eef0e0' },
    netrunner: { nome: 'Netrunner', acento: '#b26bff', acento2: '#29e5f5', destaque: '#ff5ec4', fundo: '#0a0614', texto: '#efe6ff' },
    kangtao: { nome: 'Kang Tao', acento: '#e8c15a', acento2: '#3fd1c4', destaque: '#ff5a3c', fundo: '#0e0b05', texto: '#f5eedb' },
    nomade: { nome: 'Nômade', acento: '#ff9e3d', acento2: '#5ec8ff', destaque: '#ffe066', fundo: '#120c06', texto: '#f6ead8' },
    classico: { nome: 'Clássico (Combat HUD)', acento: '#e5233d', acento2: '#29e5f5', destaque: '#f5d647', fundo: '#0c0c10', texto: '#e8e8ec' },
    mono: { nome: 'Monocromático', acento: '#f0f0f0', acento2: '#ff4d4d', destaque: '#bdbdbd', fundo: '#080808', texto: '#f0f0f0' }
  };
  // Só as fontes que a wiki já tem (cyberpunk-css-main/fonts): nada baixado da internet. O código de estilo do Foundry
  // traz as fontes dele (Tektur, Jost…): elas viram a padrão.
  const FONTES = {
    oxanium: { nome: 'Oxanium', css: 'Oxanium, "Segoe UI", sans-serif' },
    blender: { nome: 'Blender Pro (a do 2077)', css: '"Blender Pro", Oxanium, sans-serif' },
    mono: { nome: 'Share Tech Mono', css: '"Share Tech Mono", Consolas, monospace' },
    sistema: { nome: 'A do sistema', css: '"Segoe UI", system-ui, sans-serif' }
  };
  const SECOES = { vitais: 'Vitais', atributos: 'Atributos', armas: 'Armas', acoes: 'Ações' };
  // Peças que cada jogador pode esconder.
  const PECAS = {
    armadura: 'Armadura (cabeça e corpo)',
    humanidade: 'Humanidade',
    sorte: 'Sorte',
    deathSave: 'Death Save',
    identidade: 'Nome e estado',
    favoritos: 'Perícias favoritas'
  };
  const CANTOS = { chanfrado: 'Chanfrados', reto: 'Retos', arredondado: 'Arredondados' };
  const LADOS = { esquerda: 'Esquerda', direita: 'Direita' };
  const EFEITOS = { semImagem: 'Só nos estados sem imagem própria', sempre: 'Sempre', nunca: 'Nunca' };

  const ESTILO_PADRAO = Object.freeze({
    tema: 'morana',
    acento: TEMAS.morana.acento,
    acento2: TEMAS.morana.acento2,
    destaque: TEMAS.morana.destaque,
    fundo: TEMAS.morana.fundo,
    texto: TEMAS.morana.texto,
    opacidade: 90,
    desfoque: 4,
    cantos: 'chanfrado',
    fonte: 'oxanium',
    brilho: true,
    scanlines: true,
    animacoes: true,
    escala: 100,
    retratoAltura: 330,
    retratoLado: 'esquerda',
    efeitos: 'semImagem',
    compacto: false,
    posicao: 'base',
    base: 12,
    x: null,
    y: null,
    secoes: ['vitais', 'atributos', 'armas', 'acoes'],
    ocultos: [],
    passosHp: '-5 -1 +1 +5'
  });

  const cor = (valor, padrao) => (typeof valor === 'string' && /^#[0-9a-f]{6}$/i.test(valor.trim()) ? valor.trim().toLowerCase() : padrao);
  const escolha = (valor, opcoes, padrao) => (Object.prototype.hasOwnProperty.call(opcoes, valor) ? valor : padrao);

  // Os botões de HP: números inteiros (de −100 a +100, sem o zero), na ordem digitada, no máximo oito.
  function passosDeHp(texto) {
    const numeros = String(texto ?? '').split(/[\s,;]+/).map(parte => parte.replace(/^\+/, '')).filter(parte => /^-?\d+$/.test(parte)).map(Number)
      .filter(n => n !== 0 && Math.abs(n) <= 100);
    const unicos = [...new Set(numeros)].slice(0, 8);
    return unicos.length ? unicos : [-5, -1, 1, 5];
  }

  // O estilo de um jogador sempre completo e válido: o que veio salvo, colado de um código ou digitado na janela.
  // base: o padrão da mesa (o mestre define), por baixo do que o jogador não mudou.
  function normalizarEstilo(dados, base = ESTILO_PADRAO) {
    const d = dados && typeof dados === 'object' ? dados : {};
    const b = { ...ESTILO_PADRAO, ...(base && typeof base === 'object' ? base : {}) };
    const tema = escolha(d.tema, { ...TEMAS, personalizado: 1 }, escolha(b.tema, { ...TEMAS, personalizado: 1 }, 'morana'));
    const secoesValidas = Object.keys(SECOES);
    const pedidas = Array.isArray(d.secoes) ? d.secoes : b.secoes;
    const secoes = [...new Set((Array.isArray(pedidas) ? pedidas : []).filter(s => secoesValidas.includes(s)))];
    for (const s of secoesValidas) if (!secoes.includes(s)) secoes.push(s);
    const ocultos = [...new Set((Array.isArray(d.ocultos) ? d.ocultos : Array.isArray(b.ocultos) ? b.ocultos : []).filter(p => Object.prototype.hasOwnProperty.call(PECAS, p) || secoesValidas.includes(p)))];
    const posicao = d.posicao === 'livre' || (d.posicao === undefined && b.posicao === 'livre') ? 'livre' : 'base';
    const bool = chave => (typeof d[chave] === 'boolean' ? d[chave] : Boolean(b[chave]));
    return {
      tema,
      acento: cor(d.acento, cor(b.acento, ESTILO_PADRAO.acento)),
      acento2: cor(d.acento2, cor(b.acento2, ESTILO_PADRAO.acento2)),
      destaque: cor(d.destaque, cor(b.destaque, ESTILO_PADRAO.destaque)),
      fundo: cor(d.fundo, cor(b.fundo, ESTILO_PADRAO.fundo)),
      texto: cor(d.texto, cor(b.texto, ESTILO_PADRAO.texto)),
      opacidade: limitar(d.opacidade, 30, 100, limitar(b.opacidade, 30, 100, ESTILO_PADRAO.opacidade)),
      desfoque: limitar(d.desfoque, 0, 20, limitar(b.desfoque, 0, 20, ESTILO_PADRAO.desfoque)),
      cantos: escolha(d.cantos, CANTOS, escolha(b.cantos, CANTOS, ESTILO_PADRAO.cantos)),
      fonte: escolha(d.fonte, FONTES, escolha(b.fonte, FONTES, ESTILO_PADRAO.fonte)),
      brilho: bool('brilho'),
      scanlines: bool('scanlines'),
      animacoes: bool('animacoes'),
      escala: limitar(d.escala, 50, 160, limitar(b.escala, 50, 160, ESTILO_PADRAO.escala)),
      retratoAltura: limitar(d.retratoAltura, 120, 560, limitar(b.retratoAltura, 120, 560, ESTILO_PADRAO.retratoAltura)),
      retratoLado: escolha(d.retratoLado, LADOS, escolha(b.retratoLado, LADOS, ESTILO_PADRAO.retratoLado)),
      efeitos: escolha(d.efeitos, EFEITOS, escolha(b.efeitos, EFEITOS, ESTILO_PADRAO.efeitos)),
      compacto: bool('compacto'),
      posicao,
      base: limitar(d.base, 0, 400, limitar(b.base, 0, 400, ESTILO_PADRAO.base)),
      x: posicao === 'livre' ? limitar(d.x ?? b.x, -4000, 8000, null) : null,
      y: posicao === 'livre' ? limitar(d.y ?? b.y, -4000, 8000, null) : null,
      secoes,
      ocultos,
      passosHp: typeof d.passosHp === 'string' ? passosDeHp(d.passosHp).map(n => (n > 0 ? `+${n}` : String(n))).join(' ') : typeof b.passosHp === 'string' ? b.passosHp : ESTILO_PADRAO.passosHp
    };
  }

  // Tema escolhido: as cores dele; mexer numa cor passa o tema para "personalizado".
  function aplicarTema(estilo, tema) {
    const t = TEMAS[tema];
    if (!t) return normalizarEstilo(estilo);
    return normalizarEstilo({ ...estilo, tema, acento: t.acento, acento2: t.acento2, destaque: t.destaque, fundo: t.fundo, texto: t.texto });
  }

  // ---------------- Compartilhar o estilo ----------------
  // Um código de texto (PT1:…) com o visual: o mesmo formato do módulo do Foundry (o código de lá serve aqui). A posição
  // na tela fica de fora (cada monitor é um).
  const PREFIXO = 'PT1:';
  const paraBase64 = texto => { let binario = ''; for (const byte of new TextEncoder().encode(texto)) binario += String.fromCharCode(byte); return btoa(binario); };
  const deBase64 = codigo => new TextDecoder().decode(Uint8Array.from(atob(codigo), c => c.charCodeAt(0)));

  function codigoDoEstilo(estilo) {
    const { posicao, x, y, base, ...visual } = normalizarEstilo(estilo);
    return PREFIXO + paraBase64(JSON.stringify(visual));
  }

  // Lê um código (ou o JSON puro). Mantém a posição do estilo atual. Erro com mensagem para o jogador.
  function lerCodigo(texto, atual = ESTILO_PADRAO) {
    const limpo = String(texto ?? '').trim();
    if (!limpo) throw new Error('Cole um código de estilo (começa com PT1:).');
    let dados;
    try {
      dados = JSON.parse(limpo.startsWith(PREFIXO) ? deBase64(limpo.slice(PREFIXO.length).replace(/\s+/g, '')) : limpo);
    } catch {
      throw new Error('Este código de estilo não é válido (copie de novo, inteiro).');
    }
    if (!dados || typeof dados !== 'object' || Array.isArray(dados)) throw new Error('Este código de estilo não é válido (copie de novo, inteiro).');
    const a = normalizarEstilo(atual);
    return normalizarEstilo({ ...dados, posicao: a.posicao, x: a.x, y: a.y, base: a.base });
  }

  // ---------------- Do estilo para a tela ----------------
  const rgb = hex => {
    const n = parseInt(String(hex).slice(1), 16);
    return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
  };

  function variaveisDoEstilo(estilo) {
    const e = normalizarEstilo(estilo);
    return {
      '--pt-acento': e.acento,
      '--pt-acento-rgb': rgb(e.acento),
      '--pt-acento2': e.acento2,
      '--pt-acento2-rgb': rgb(e.acento2),
      '--pt-destaque': e.destaque,
      '--pt-destaque-rgb': rgb(e.destaque),
      '--pt-fundo-rgb': rgb(e.fundo),
      '--pt-texto': e.texto,
      '--pt-texto-rgb': rgb(e.texto),
      '--pt-opacidade': String(e.opacidade / 100),
      '--pt-desfoque': `${e.desfoque}px`,
      '--pt-fonte': FONTES[e.fonte].css,
      '--pt-escala': String(e.escala / 100),
      '--pt-retrato-altura': `${e.retratoAltura}px`,
      '--pt-base': `${e.base}px`
    };
  }

  function classesDoEstilo(estilo) {
    const e = normalizarEstilo(estilo);
    return [
      `pt-cantos-${e.cantos}`,
      `pt-retrato-${e.retratoLado}`,
      `pt-posicao-${e.posicao}`,
      ...(e.brilho ? ['pt-brilho'] : []),
      ...(e.scanlines ? ['pt-scanlines'] : []),
      ...(e.animacoes ? [] : ['pt-sem-animacao']),
      ...(e.compacto ? ['pt-compacto'] : [])
    ];
  }

  // A posição livre cabe na tela: o painel não sai (pelo menos 60 px dele à vista).
  function dentroDaTela({ x, y, largura, altura, telaL, telaA }) {
    const sobra = 60;
    return {
      x: Math.round(Math.min(Math.max(x, sobra - largura), telaL - sobra)),
      y: Math.round(Math.min(Math.max(y, 0), telaA - Math.min(altura, sobra)))
    };
  }

  return {
    ESTADOS, NOMES_DOS_ESTADOS, estadoDoRetrato, imagemDoEstado, efeitoDoRetrato, RETRATO_PADRAO, normalizarRetrato, modoDoRetrato,
    TEMAS, FONTES, SECOES, PECAS, CANTOS, LADOS, EFEITOS, ESTILO_PADRAO, normalizarEstilo, aplicarTema, passosDeHp,
    codigoDoEstilo, lerCodigo, rgb, variaveisDoEstilo, classesDoEstilo, dentroDaTela
  };
});

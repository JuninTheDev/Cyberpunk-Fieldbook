// Painel Tático (o C25; o módulo painel-tatico da mesa do Foundry 12, dentro do sistema): as contas que não dependem do
// Foundry (o teste roda estas no Node). O estado do retrato, a imagem
// de cada estado, os temas, a normalização do estilo de cada jogador, o código para compartilhar o estilo e os
// botões de HP.

// ---------------- Estados do retrato ----------------
// Os quatro do sistema (pelo HP) e "Morto", que o sistema não calcula: vem do status de derrotado (o Fluxo de Combate
// põe no Death Save que falhou; o mestre também pode pôr pelo HUD do token).
export const ESTADOS = ['notWounded', 'lightlyWounded', 'seriouslyWounded', 'mortallyWounded', 'dead'];
export const NOMES_DOS_ESTADOS = {
  notWounded: 'Sem ferimentos',
  lightlyWounded: 'Levemente Ferido',
  seriouslyWounded: 'Gravemente Ferido',
  mortallyWounded: 'Mortalmente Ferido',
  dead: 'Morto'
};

// O estado de ferimento do sistema (regras.estadoDeFerimento: ileso, leve, grave, mortal) nos estados do retrato.
export const ESTADO_DO_FERIMENTO = { ileso: 'notWounded', leve: 'lightlyWounded', grave: 'seriouslyWounded', mortal: 'mortallyWounded' };

export function estadoDoRetrato({ estado, morto = false } = {}) {
  if (morto) return 'dead';
  return ESTADOS.includes(estado) ? estado : 'notWounded';
}

const limparCaminho = valor => (typeof valor === 'string' ? valor.trim() : '');

// A imagem de um estado: a dele; sem ela, a do estado mais leve mais próximo, até a base (Sem ferimentos); sem
// nenhuma, a reserva (a imagem do ator). `propria`: a imagem é do próprio estado (o efeito automático não entra).
export function imagemDoEstado(imagens, estado, reserva = '') {
  const lista = imagens && typeof imagens === 'object' ? imagens : {};
  const indice = Math.max(0, ESTADOS.indexOf(estado));
  for (let i = indice; i >= 0; i--) {
    const src = limparCaminho(lista[ESTADOS[i]]);
    if (src) return { src, propria: i === indice, de: ESTADOS[i] };
  }
  return { src: reserva || '', propria: false, de: null };
}

// O efeito automático do estado no retrato (tinta vermelha, falha de sinal, cinza do morto): sempre, nunca, ou só
// quando o estado não tem imagem própria.
export function efeitoDoRetrato({ estado, propria, modo = 'semImagem' }) {
  if (estado === 'notWounded' || modo === 'nunca') return '';
  if (modo === 'semImagem' && propria) return '';
  return estado;
}

// O ajuste do retrato de um ator (o dono configura): tamanho, deslocamento, espelho e o modo.
export const RETRATO_PADRAO = { imagens: {}, escala: 100, x: 0, y: 0, espelhar: false, modo: 'auto' };
export function normalizarRetrato(dados) {
  const d = dados && typeof dados === 'object' ? dados : {};
  const imagens = {};
  for (const estado of ESTADOS) {
    const src = limparCaminho(d.imagens && d.imagens[estado]);
    if (src) imagens[estado] = src;
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
// Livre: o PNG sai da barra (como na referência). Moldura: a imagem do ator num quadro dentro da barra. No automático,
// livre quando o ator tem alguma imagem do painel.
export const modoDoRetrato = retrato => (retrato.modo === 'auto' ? (Object.keys(retrato.imagens).length ? 'livre' : 'moldura') : retrato.modo);

// ---------------- Estilo ----------------
export const TEMAS = {
  morana: { nome: 'Morana', acento: '#00ffd2', acento2: '#ff2e63', destaque: '#f8ef02', fundo: '#060b0e', texto: '#e2f7f2' },
  arasaka: { nome: 'Arasaka', acento: '#ff1f3d', acento2: '#f2f2f2', destaque: '#ff8a00', fundo: '#0d0507', texto: '#f3e9ea' },
  militech: { nome: 'Militech', acento: '#c8d64b', acento2: '#ff7a1a', destaque: '#f2c230', fundo: '#0b0e07', texto: '#eef0e0' },
  netrunner: { nome: 'Netrunner', acento: '#b26bff', acento2: '#29e5f5', destaque: '#ff5ec4', fundo: '#0a0614', texto: '#efe6ff' },
  kangtao: { nome: 'Kang Tao', acento: '#e8c15a', acento2: '#3fd1c4', destaque: '#ff5a3c', fundo: '#0e0b05', texto: '#f5eedb' },
  nomade: { nome: 'Nômade', acento: '#ff9e3d', acento2: '#5ec8ff', destaque: '#ffe066', fundo: '#120c06', texto: '#f6ead8' },
  classico: { nome: 'Clássico (Combat HUD)', acento: '#e5233d', acento2: '#29e5f5', destaque: '#f5d647', fundo: '#0c0c10', texto: '#e8e8ec' },
  mono: { nome: 'Monocromático', acento: '#f0f0f0', acento2: '#ff4d4d', destaque: '#bdbdbd', fundo: '#080808', texto: '#f0f0f0' }
};
// Só fontes que já vêm no Foundry ou no sistema (as do tema da ficha; nada baixado da internet). As do CORE (Tektur, Jost,
// Rubik, Bruno Ace) não estão aqui: o estilo que veio com uma delas volta para a Rajdhani.
export const FONTES = {
  rajdhani: { nome: 'Rajdhani', css: '"Rajdhani", "Signika", sans-serif' },
  shareTech: { nome: 'Share Tech Mono', css: '"Share Tech Mono", "Courier New", monospace' },
  modesto: { nome: 'Modesto Condensed', css: '"Modesto Condensed", "Signika", serif' },
  signika: { nome: 'Signika', css: '"Signika", sans-serif' }
};
export const SECOES = { vitais: 'Vitais', atributos: 'Atributos', armas: 'Armas', acoes: 'Ações' };
// Peças que cada jogador pode esconder.
export const PECAS = {
  armadura: 'Armadura (cabeça e corpo)',
  escudo: 'Escudo',
  humanidade: 'Humanidade',
  sorte: 'Sorte',
  deathSave: 'Death Save',
  identidade: 'Nome, Role e estado',
  favoritos: 'Perícias favoritas',
  alvo: 'Alvo marcado',
  imagensDasArmas: 'Imagem das armas',
  desarmado: 'Desarmado e agarrão'
};
export const CANTOS = { chanfrado: 'Chanfrados', reto: 'Retos', arredondado: 'Arredondados' };
export const LADOS = { esquerda: 'Esquerda', direita: 'Direita' };
export const EFEITOS = { semImagem: 'Só nos estados sem imagem própria', sempre: 'Sempre', nunca: 'Nunca' };

export const ESTILO_PADRAO = Object.freeze({
  tema: 'morana',
  acento: TEMAS.morana.acento,
  acento2: TEMAS.morana.acento2,
  destaque: TEMAS.morana.destaque,
  fundo: TEMAS.morana.fundo,
  texto: TEMAS.morana.texto,
  opacidade: 90,
  desfoque: 4,
  cantos: 'chanfrado',
  fonte: 'rajdhani',
  brilho: true,
  scanlines: true,
  animacoes: true,
  escala: 100,
  retratoAltura: 330,
  retratoLado: 'esquerda',
  efeitos: 'semImagem',
  compacto: false,
  posicao: 'base',
  base: 74,
  x: null,
  y: null,
  secoes: ['vitais', 'atributos', 'armas', 'acoes'],
  ocultos: [],
  passosHp: '-5 -1 +1 +5'
});

function limitar(valor, min, max, padrao) {
  const n = Number(valor);
  if (valor === null || valor === undefined || valor === '' || !Number.isFinite(n)) return padrao;
  return Math.round(Math.min(max, Math.max(min, n)));
}
const cor = (valor, padrao) => (typeof valor === 'string' && /^#[0-9a-f]{6}$/i.test(valor.trim()) ? valor.trim().toLowerCase() : padrao);
const escolha = (valor, opcoes, padrao) => (Object.prototype.hasOwnProperty.call(opcoes, valor) ? valor : padrao);

// O estilo de um jogador sempre completo e válido: o que veio salvo, colado de um código ou digitado na janela.
export function normalizarEstilo(dados, base = ESTILO_PADRAO) {
  const d = dados && typeof dados === 'object' ? dados : {};
  const b = { ...ESTILO_PADRAO, ...(base && typeof base === 'object' ? base : {}) };
  const tema = escolha(d.tema, { ...TEMAS, personalizado: 1 }, escolha(b.tema, { ...TEMAS, personalizado: 1 }, 'morana'));
  const secoesValidas = Object.keys(SECOES);
  const pedidas = Array.isArray(d.secoes) ? d.secoes : b.secoes;
  const secoes = [...new Set((Array.isArray(pedidas) ? pedidas : []).filter(s => secoesValidas.includes(s)))];
  for (const s of secoesValidas) if (!secoes.includes(s)) secoes.push(s);
  const ocultos = [...new Set((Array.isArray(d.ocultos) ? d.ocultos : Array.isArray(b.ocultos) ? b.ocultos : []).filter(p => Object.prototype.hasOwnProperty.call(PECAS, p) || secoesValidas.includes(p)))];
  const posicao = d.posicao === 'livre' || (d.posicao === undefined && b.posicao === 'livre') ? 'livre' : 'base';
  const bool = (chave) => (typeof d[chave] === 'boolean' ? d[chave] : Boolean(b[chave]));
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
export function aplicarTema(estilo, tema) {
  const t = TEMAS[tema];
  if (!t) return normalizarEstilo(estilo);
  return normalizarEstilo({ ...estilo, tema, acento: t.acento, acento2: t.acento2, destaque: t.destaque, fundo: t.fundo, texto: t.texto });
}

// Os botões de HP: números inteiros (de −100 a +100, sem o zero), na ordem digitada, no máximo oito.
export function passosDeHp(texto) {
  const numeros = String(texto ?? '').split(/[\s,;]+/).map(parte => parte.replace(/^\+/, '')).filter(parte => /^-?\d+$/.test(parte)).map(Number)
    .filter(n => n !== 0 && Math.abs(n) <= 100);
  const unicos = [...new Set(numeros)].slice(0, 8);
  return unicos.length ? unicos : [-5, -1, 1, 5];
}

// ---------------- Compartilhar o estilo ----------------
// Um código de texto (PT1:…) com o visual: cores, fonte, tamanhos e seções. A posição na tela fica de fora (cada
// monitor é um).
const PREFIXO = 'PT1:';
const { atob, btoa, TextDecoder, TextEncoder } = globalThis;
const paraBase64 = texto => { let binario = ''; for (const byte of new TextEncoder().encode(texto)) binario += String.fromCharCode(byte); return btoa(binario); };
const deBase64 = codigo => new TextDecoder().decode(Uint8Array.from(atob(codigo), c => c.charCodeAt(0)));
// O estilo sem a posição na tela (cada monitor é um).
export const semPosicao = estilo => Object.fromEntries(Object.entries(estilo).filter(([chave]) => !['posicao', 'x', 'y', 'base'].includes(chave)));

export function codigoDoEstilo(estilo) {
  return PREFIXO + paraBase64(JSON.stringify(semPosicao(normalizarEstilo(estilo))));
}

// Lê um código (ou o JSON puro). Mantém a posição do estilo atual. Erro com mensagem para o jogador.
export function lerCodigo(texto, atual = ESTILO_PADRAO) {
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
export const rgb = hex => {
  const n = parseInt(String(hex).slice(1), 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
};

export function variaveisDoEstilo(estilo) {
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

export function classesDoEstilo(estilo) {
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

// A posição livre cabe na tela: a barra não sai (pelo menos 60 px dela à vista).
export function dentroDaTela({ x, y, largura, altura, telaL, telaA }) {
  const sobra = 60;
  return {
    x: Math.round(Math.min(Math.max(x, sobra - largura), telaL - sobra)),
    y: Math.round(Math.min(Math.max(y, 0), telaA - Math.min(altura, sobra)))
  };
}

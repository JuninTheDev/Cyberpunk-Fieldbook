// Os ícones próprios do sistema (o C49; decisão do usuário, 2026-10-26: neon de 2077, traço fino em ciano, vermelho e
// amarelo, com brilho, como o NetWire da wiki). Cada ícone é um desenho de 64 × 64 em traços simples (o "d" dos paths, os
// círculos), posto num molde comum: o fundo escuro com o canto cortado, a moldura na cor do grupo e o brilho. O build
// grava icones/neon/<nome>.svg; rode de novo depois de mudar um desenho: node build/icones.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CORES = { ciano: '#02d7f2', vermelho: '#ff2a4a', amarelo: '#fcee09' };

// Os desenhos: { cor, traços (paths "d" de linha), cheios (paths preenchidos), acento (paths na cor de acento: o amarelo,
// ou o vermelho quando a cor é amarela) }. Coordenadas de 64 × 64, com a área útil de 12 a 52.
const C = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
const ESCUDO = 'M32 12l16 6v12c0 11-7 18-16 22c-9-4-16-11-16-22V18z';
const CHAMA = 'M32 52c-8 0-12-6-12-12c0-8 7-11 8-20c4 3 6 7 6 11c2-2 3-4 3-7c5 4 7 10 7 16c0 6-4 12-12 12z';
const FLOCO = 'M32 14v36M16.4 23l31.2 18M16.4 41l31.2-18M28 16l4 4 4-4M28 48l4-4 4 4';
const OLHO = 'M12 32c6-9 13-13 20-13s14 4 20 13c-6 9-13 13-20 13s-14-4-20-13z';
const CORACAO = 'M32 50C20 41 14 34 14 26c0-6 4-10 9-10c4 0 7 2 9 6c2-4 5-6 9-6c5 0 9 4 9 10c0 8-6 15-18 24z';
const RAIO = 'M36 12L20 36h11l-4 16 17-25H33z';
export const DESENHOS = {
  // ---- Os estados do Foundry (CONFIG.statusEffects) ----
  morto: { cor: 'vermelho', tracos: ['M20 30c0-9 5-16 12-16s12 7 12 16c0 5-2 8-4 9v6H24v-6c-2-1-4-4-4-9z', 'M28 45v5M32 45v5M36 45v5'], cheios: [C(26, 31, 3.5), C(38, 31, 3.5)], acento: ['M30 39l2-3 2 3'] },
  inconsciente: { cor: 'ciano', tracos: ['M14 30c5 6 11 9 18 9s13-3 18-9', 'M20 36l-3 5M32 39v6M44 36l3 5'], acento: ['M38 14h8l-8 8h8'] },
  dormindo: { cor: 'ciano', tracos: ['M38 16a16 16 0 1 0 10 26a13 13 0 0 1-10-26z'], acento: ['M40 20h7l-7 7h7', 'M48 12h4l-4 4h4'] },
  atordoado: { cor: 'amarelo', tracos: [C(32, 34, 13), 'M32 34m-6 0a6 6 0 1 1 6 6'], acento: ['M16 16l3 3M48 16l-3 3M32 10v4'] },
  caido: { cor: 'ciano', tracos: ['M14 44h36', C(18, 36, 4), 'M23 37h20l5 3M28 37l4-6h7'], acento: ['M40 20l6-6M46 20v-6h-6'] },
  preso: { cor: 'vermelho', tracos: ['M16 16h32v32H16z', 'M26 16v32M38 16v32M16 26h32M16 38h32'], acento: [] },
  paralisado: { cor: 'amarelo', tracos: [C(32, 18, 5), 'M32 23v14M22 28h20M32 37l-7 12M32 37l7 12'], acento: ['M46 30l-4 6h5l-4 6'] },
  voando: { cor: 'ciano', tracos: ['M30 36C26 24 18 18 10 18c2 8 6 14 12 16M30 36c-6 0-12-2-16-6M34 36c4-12 12-18 20-18c-2 8-6 14-12 16M34 36c6 0 12-2 16-6'], acento: ['M32 28v18'] },
  cego: { cor: 'ciano', tracos: [OLHO, C(32, 32, 6)], acento: ['M14 50L50 14'] },
  surdo: { cor: 'ciano', tracos: ['M26 46c0-6-8-8-8-18c0-8 6-14 14-14s14 6 14 14c0 6-4 8-6 12c-2 4-2 10-8 10', 'M28 28c0-4 2-6 4-6s4 2 4 6'], acento: ['M14 50L50 14'] },
  silenciado: { cor: 'ciano', tracos: ['M14 26h8l10-8v28l-10-8h-8z'], acento: ['M40 26l10 12M50 26L40 38'] },
  medo: { cor: 'vermelho', tracos: ['M32 12l20 36H12z'], acento: ['M32 24v12', C(32, 42, 1)] },
  queimando: { cor: 'vermelho', tracos: [CHAMA], acento: ['M32 46c-3 0-5-2-5-5c0-4 3-5 4-9c3 3 6 5 6 9c0 3-2 5-5 5z'] },
  congelado: { cor: 'ciano', tracos: [FLOCO], acento: [] },
  choque: { cor: 'amarelo', tracos: [RAIO], acento: [] },
  corroendo: { cor: 'amarelo', tracos: ['M32 12c6 10 12 16 12 24a12 12 0 0 1-24 0c0-8 6-14 12-24z'], acento: [C(28, 38, 2), C(36, 32, 1.5), C(35, 42, 1.5)] },
  sangrando: { cor: 'vermelho', tracos: ['M32 12c6 10 12 16 12 24a12 12 0 0 1-24 0c0-8 6-14 12-24z'], cheios: ['M26 38a6 6 0 0 0 6 6'], acento: [] },
  doente: { cor: 'amarelo', tracos: [C(26, 27, 8), C(38, 27, 8), C(32, 38, 8)], acento: [C(32, 31, 2.5)] },
  envenenado: { cor: 'vermelho', tracos: ['M27 12h10M29 12v10l-9 16a8 8 0 0 0 7 12h10a8 8 0 0 0 7-12l-9-16V12'], acento: ['M24 40h16'] },
  maldito: { cor: 'vermelho', tracos: ['M32 12l18 32H14z', OLHO.replace('M12 32', 'M22 34').replace(/c6-9 13-13 20-13s14 4 20 13c-6 9-13 13-20 13s-14-4-20-13z/, 'c3-4 6-6 10-6s7 2 10 6c-3 4-6 6-10 6s-7-2-10-6z')], cheios: [C(32, 34, 2.5)], acento: [] },
  regenerando: { cor: 'amarelo', tracos: [CORACAO], acento: ['M32 26v14M25 33h14'] },
  degenerando: { cor: 'vermelho', tracos: [CORACAO], acento: ['M25 33h14'] },
  pairando: { cor: 'ciano', tracos: ['M18 26h28M24 26l-6-6M40 26l6-6', 'M22 32h20'], acento: ['M20 40h24M24 46h16'] },
  cavando: { cor: 'amarelo', tracos: ['M12 38h40', 'M32 12v18M24 22l8 8 8-8'], acento: ['M16 44l4 4M28 44l4 4M40 44l4 4'] },
  melhorado: { cor: 'amarelo', tracos: ['M18 34l14-14 14 14M18 46l14-14 14 14'], acento: [] },
  piorado: { cor: 'vermelho', tracos: ['M18 18l14 14 14-14M18 30l14 14 14-14'], acento: [] },
  invisivel: { cor: 'ciano', tracos: [C(32, 20, 6), 'M32 26v12M22 30h20M32 38l-8 12M32 38l8 12'], acento: [], tracejado: true },
  alvo: { cor: 'vermelho', tracos: [C(32, 32, 14), 'M32 12v10M32 42v10M12 32h10M42 32h10'], cheios: [C(32, 32, 2.5)], acento: [] },
  olho: { cor: 'ciano', tracos: [OLHO, C(32, 32, 7)], cheios: [C(32, 32, 3)], acento: [] },
  abencoado: { cor: 'amarelo', tracos: ['M32 12l5 13 14 1-11 9 4 14-12-8-12 8 4-14-11-9 14-1z'], acento: [] },
  escudoDeFogo: { cor: 'vermelho', tracos: [ESCUDO], acento: ['M32 42c-4 0-6-3-6-6c0-4 4-6 4-10c3 2 4 4 4 6c1-1 2-2 2-4c3 2 4 5 4 8c0 3-3 6-8 6z'] },
  escudoDeGelo: { cor: 'ciano', tracos: [ESCUDO], acento: ['M32 22v18M24 26l16 10M24 36l16-10'] },
  escudoMagico: { cor: 'ciano', tracos: [ESCUDO], acento: ['M24 26h6v8h8v-6h4M24 38h8', C(24, 26, 1.5), C(42, 28, 1.5)] },
  escudoSagrado: { cor: 'amarelo', tracos: [ESCUDO], acento: ['M32 22v18M25 29h14'] },
  // ---- Os estados do sistema ----
  suprimido: { cor: 'vermelho', tracos: ['M14 22h22M14 32h28M14 42h22'], acento: ['M40 18l8 4-8 4zM46 28l8 4-8 4zM40 38l8 4-8 4z'] },
  cobertura: { cor: 'ciano', tracos: ['M14 24h36v24H14z', 'M14 36h36M26 24v12M38 36v12M20 48V36M44 36v12'], acento: ['M24 18c2-4 6-6 10-6'] },
  agarrando: { cor: 'amarelo', tracos: ['M20 40V24a3 3 0 0 1 6 0v8M26 30v-8a3 3 0 0 1 6 0v8M32 30v-6a3 3 0 0 1 6 0v8M38 32v-4a3 3 0 0 1 6 0v10c0 8-6 14-14 14s-10-4-12-8l-4-8a3 3 0 0 1 5-3l3 4'], acento: [] },
  agarrado: { cor: 'vermelho', tracos: [C(32, 20, 5), 'M32 25v12M32 37l-7 12M32 37l7 12'], acento: ['M18 28h28M18 34h28'] },
  semAr: { cor: 'ciano', tracos: ['M30 14v14c0 8-14 6-14 18c0 4 3 6 6 6c4 0 8-4 8-10M34 14v14c0 8 14 6 14 18c0 4-3 6-6 6c-4 0-8-4-8-10'], acento: ['M44 14l6 6M50 14l-6 6'] },
  eletrocutado: { cor: 'amarelo', tracos: [C(32, 32, 19), RAIO], acento: [] },
  radiacao: { cor: 'amarelo', tracos: [C(32, 32, 19)], cheios: [C(32, 32, 3), 'M32 32L22 15a20 20 0 0 1 20 0zM32 32l20 0a20 20 0 0 1-10 17zM32 32L22 49a20 20 0 0 1-10-17z'], acento: [] },
  estase: { cor: 'ciano', tracos: ['M22 12h20v40H22z', 'M22 20h20M22 44h20'], acento: ['M32 26v12M27 29l10 6M27 35l10-6'] },
  conectado: { cor: 'ciano', tracos: ['M22 12v10M30 12v10M18 22h16v8a8 8 0 0 1-16 0z', 'M26 38v6c0 4 3 6 7 6h7'], acento: ['M44 44l6 6M44 50l3-3', C(46, 18, 4), 'M46 22v6'] },
  efeito: { cor: 'amarelo', tracos: [C(32, 32, 16), C(32, 32, 9)], acento: ['M32 10v6M32 48v6M10 32h6M48 32h6'] },
  // ---- As imagens padrão dos atores ----
  personagem: { cor: 'ciano', tracos: [C(32, 24, 10), 'M14 52c2-10 9-16 18-16s16 6 18 16'], acento: ['M22 24h20'] },
  capanga: { cor: 'vermelho', tracos: [C(32, 26, 10), 'M14 52c2-10 9-16 18-16s16 6 18 16', 'M28 12l4-4 4 4'], acento: ['M24 25h6M34 25h6'] },
  conteiner: { cor: 'amarelo', tracos: ['M14 22l18-8 18 8v22l-18 8-18-8z', 'M14 22l18 8 18-8M32 30v22'], acento: ['M23 18l18 8'] },
  blackice: { cor: 'vermelho', tracos: ['M32 10l20 22-20 22-20-22z', 'M24 30c0-5 4-8 8-8s8 3 8 8c0 3-1 4-2 5v4H26v-4c-1-1-2-2-2-5z'], cheios: [C(28.5, 30, 2), C(35.5, 30, 2)], acento: [] },
  demonio: { cor: 'vermelho', tracos: ['M22 22c-4-4-5-8-4-12c2 4 6 6 10 7M42 22c4-4 5-8 4-12c-2 4-6 6-10 7', 'M20 30c0-8 5-12 12-12s12 4 12 12c0 10-6 20-12 20s-12-10-12-20z'], acento: ['M25 32l5 2M39 32l-5 2M28 42h8'] },
  veiculo: { cor: 'ciano', tracos: ['M12 38v-8l6-10h28l6 10v8z', 'M18 30h28', C(20, 42, 4), C(44, 42, 4)], acento: ['M14 34h4M46 34h4'] },
  // ---- As imagens padrão dos itens ----
  arma: { cor: 'ciano', tracos: ['M12 22h36v8H30l-2 4h-6l-2 12h-8l3-16h-3z', 'M48 24h4'], acento: ['M30 30v4'] },
  armadura: { cor: 'ciano', tracos: ['M22 14h20l8 8-4 6v22H18V28l-4-6z', 'M26 14c0 4 2 8 6 8s6-4 6-8'], acento: ['M24 34h16M24 40h16'] },
  municao: { cor: 'amarelo', tracos: ['M18 26c0-6 3-10 4-12c1 2 4 6 4 12v24h-8zM30 26c0-6 3-10 4-12c1 2 4 6 4 12v24h-8zM42 26c0-6 3-10 4-12c1 2 4 6 4 12v24h-8z'], acento: ['M18 42h8M30 42h8M42 42h8'] },
  cyberware: { cor: 'ciano', tracos: ['M20 20h24v24H20z', 'M26 20v-6M32 20v-6M38 20v-6M26 44v6M32 44v6M38 44v6M20 26h-6M20 32h-6M20 38h-6M44 26h6M44 32h6M44 38h6'], acento: ['M26 26h12v12H26z'] },
  lesao: { cor: 'vermelho', tracos: [CORACAO], acento: ['M30 18l4 8-6 6 6 6-2 6'] },
  equipamento: { cor: 'amarelo', tracos: ['M12 24h40v24H12z', 'M24 24v-6h16v6', 'M12 34h40'], acento: ['M30 31h4v6h-4z'] },
  roupa: { cor: 'ciano', tracos: ['M24 14l8 6 8-6 12 6-4 10-6-2v24H22V28l-6 2-4-10z'], acento: ['M32 20v30'] },
  droga: { cor: 'vermelho', tracos: ['M18 40l18-18a8 8 0 0 1 12 12L30 52a8 8 0 0 1-12-12z', 'M27 31l12 12'], acento: [C(20, 18, 2), C(14, 26, 1.5), C(26, 12, 1.5)] },
  cyberdeck: { cor: 'ciano', tracos: ['M12 26h40v18H12z', 'M18 32h4M26 32h4M34 32h4M42 32h4M18 38h28'], acento: ['M32 26v-6c0-4 4-6 8-6h8'] },
  programa: { cor: 'amarelo', tracos: ['M24 20l-10 12 10 12M40 20l10 12-10 12'], acento: ['M36 16l-8 32'] },
  upgrade: { cor: 'amarelo', tracos: [C(32, 32, 10), 'M32 14v6M32 44v6M14 32h6M44 32h6M19 19l4 4M41 41l4 4M19 45l4-4M41 23l4-4'], acento: ['M32 27v10M27 32h10'] },
  arquitetura: { cor: 'vermelho', tracos: [C(32, 14, 4), C(20, 34, 4), C(44, 34, 4), C(32, 50, 4), 'M30 17l-8 14M34 17l8 14M22 37l8 10M42 37l-8 10M24 34h16'], acento: [] }
};

// Os glifos dos botões (a parte 2): o mesmo traço, sem o fundo, numa cor só, para a máscara CSS (styles/icones.css) pôr
// no lugar do glifo do Font Awesome nos botões do sistema: a ficha, os cartões, as janelas e os botões do HUD. A cor é a
// do botão (o tema) e o brilho é o drop-shadow; os ícones genéricos de interface (fechar, mais, setas) ficam com o FA.
const DADO = 'M32 10l19 11v22L32 54 13 43V21z';
export const GLIFOS = {
  d10: { tracos: ['M32 8l20 18-20 30-20-30z', 'M12 26l20 6 20-6M32 32v24'] },
  dados: { tracos: [DADO, 'M13 21l19 11 19-11M32 32v22'], cheios: [C(32, 21, 3), C(22, 38, 3), C(42, 38, 3)] },
  atacar: { tracos: [C(32, 32, 15), 'M32 8v14M32 42v14M8 32h14M42 32h14'] },
  mira: { tracos: [C(32, 32, 18), C(32, 32, 7), 'M32 6v8M32 50v8M6 32h8M50 32h8'] },
  regua: { tracos: [C(32, 32, 20), C(32, 32, 12)], cheios: [C(32, 32, 4)] },
  recarregar: { tracos: ['M48 22a18 18 0 1 0 2 16', 'M48 10v12H36'] },
  vida: { tracos: [CORACAO, 'M14 32h10l4-6 5 12 4-6h13'] },
  net: { tracos: [C(14, 32, 5), C(50, 16, 5), C(50, 48, 5), 'M19 32h12l14-14M31 32l14 14'] },
  favorito: { tracos: ['M32 10l6 14 15 1-12 10 4 15-13-8-13 8 4-15-12-10 15-1z'] },
  plugar: { tracos: ['M24 10v12M40 10v12M18 22h28v10a14 14 0 0 1-28 0z', 'M32 46v10'] },
  desplugar: { tracos: ['M24 10v10M40 10v10M18 20h28v8a14 14 0 0 1-28 0z', 'M32 42v6', 'M42 46l10 10M52 46L42 56'] },
  consertar: { tracos: ['M40 10a12 12 0 0 0-11 16L12 43a5 5 0 0 0 7 7l17-17a12 12 0 0 0 16-11l-7 4-7-4v-8z'] },
  briga: { tracos: ['M18 30V20a4 4 0 0 1 8 0v8M26 26v-8a4 4 0 0 1 8 0v8M34 26v-6a4 4 0 0 1 8 0v8M42 28a4 4 0 0 1 8 0v8c0 10-7 18-17 18c-8 0-15-6-15-14V32a4 4 0 0 1 8 0'] },
  fogo: { tracos: [CHAMA] },
  risco: { tracos: [C(26, 27, 9), C(38, 27, 9), C(32, 39, 9)], cheios: [C(32, 31, 3)] },
  chip: { tracos: ['M20 20h24v24H20z', 'M26 20v-7M32 20v-7M38 20v-7M26 44v7M32 44v7M38 44v7M20 26h-7M20 38h-7M44 26h7M44 38h7'] },
  eddies: { tracos: [C(32, 32, 20), 'M38 22c-2-2-4-3-7-3c-4 0-7 2-7 6c0 8 15 5 15 13c0 4-3 6-8 6c-3 0-6-1-8-3M32 14v6M32 44v6'] },
  letal: { tracos: ['M20 28c0-9 5-14 12-14s12 5 12 14c0 4-2 7-4 8v5H24v-5c-2-1-4-4-4-8z', 'M12 46l40 10M12 56l40-10'], cheios: [C(27, 28, 3), C(37, 28, 3)] },
  raio: { tracos: [RAIO] },
  ejetar: { tracos: ['M32 12l18 22H14z', 'M14 44h36v8H14z'] },
  netrunner: { tracos: [C(32, 24, 10), 'M14 54c2-10 9-16 18-16s16 6 18 16', 'M22 22h20v6H22z'] },
  rota: { tracos: [C(16, 46, 5), C(48, 18, 5), 'M21 46h14a8 8 0 0 0 0-16h-6a8 8 0 0 1 0-16h14'] },
  ampulheta: { tracos: ['M18 10h28M18 54h28M22 10c0 12 10 14 10 22s-10 10-10 22M42 10c0 12-10 14-10 22s10 10 10 22'] },
  desligar: { tracos: ['M22 18a18 18 0 1 0 20 0', 'M32 10v20'] },
  livro: { tracos: ['M32 18c-6-4-14-5-20-4v34c6-1 14 0 20 4c6-4 14-5 20-4V14c-6-1-14 0-20 4z', 'M32 18v34'] },
  retrato: { tracos: ['M14 10h36v44H14z', C(32, 28, 7), 'M20 50c2-7 6-11 12-11s10 4 12 11'] },
  tesoura: { tracos: [C(18, 46, 7), C(46, 46, 7), 'M23 41L46 10M41 41L18 10'] },
  contatos: { tracos: ['M16 10h32v44H16z', C(32, 27, 6), 'M22 46c1-6 5-9 10-9s9 3 10 9', 'M12 18h4M12 32h4M12 46h4'] },
  caixas: { tracos: ['M12 34h18v20H12zM34 34h18v20H34zM23 12h18v20H23z'] },
  maleta: { tracos: ['M10 22h44v30H10z', 'M24 22v-8h16v8', 'M10 34h44'] },
  banco: { tracos: ['M14 16c0-4 8-6 18-6s18 2 18 6v32c0 4-8 6-18 6s-18-2-18-6z', 'M14 16c0 4 8 6 18 6s18-2 18-6M14 32c0 4 8 6 18 6s18-2 18-6'] },
  agua: { tracos: ['M8 26c6-6 10-6 16 0s10 6 16 0 10-6 16 0M8 40c6-6 10-6 16 0s10 6 16 0 10-6 16 0'] },
  grupo: { tracos: [C(24, 24, 7), C(42, 26, 6), 'M10 52c1-9 7-14 14-14s13 5 14 14M38 40c8 0 13 5 16 12'] },
  pessoa: { tracos: [C(32, 22, 9), 'M14 54c2-11 9-17 18-17s16 6 18 17'] },
  cracha: { tracos: ['M14 14h36v40H14z', 'M26 8h12v10H26z', C(32, 32, 6), 'M22 48c1-5 5-8 10-8s9 3 10 8'] },
  mapa: { tracos: ['M10 16l14-6 16 6 14-6v38l-14 6-16-6-14 6z', 'M24 10v38M40 16v38'] },
  olhar: { tracos: [OLHO, C(32, 32, 7)] },
  busca: { tracos: [C(28, 28, 14), 'M38 38l14 14'] },
  ligar: { tracos: ['M26 38l12-12', 'M30 20l5-5a9 9 0 0 1 13 13l-5 5M34 44l-5 5a9 9 0 0 1-13-13l5-5'] },
  auto: { tracos: ['M12 52l30-30', 'M44 8v8M40 12h8M52 22v6M49 25h6M30 10v4M28 12h4'] },
  perigo: { tracos: ['M32 10l22 40H10z', 'M32 24v14'], cheios: [C(32, 44, 2.5)] },
  tokenDinamico: { tracos: [C(26, 14, 5), 'M26 19l-4 14 8 6v14M22 33l-6 12M26 22l10 6', 'M40 36h14M48 30l6 6-6 6'] },
  scanner: { tracos: ['M14 50L50 14', 'M18 18a24 24 0 0 0 28 28', C(46, 18, 4), 'M26 46l-8 8h20'] },
  entrar: { tracos: ['M36 10h14v44H36', 'M10 32h28M28 22l10 10-10 10'] },
  descer: { tracos: ['M28 10H14v44h14', 'M24 32h28M42 22l10 10-10 10'] },
  dirigir: { tracos: [C(32, 32, 20), C(32, 32, 5), 'M12 32h15M37 32h15M32 37v15'] },
  manobra: { tracos: ['M10 40v-8l6-10h24l6 10v8z', C(18, 44, 4), C(38, 44, 4), 'M46 12l4 8M54 18l-6 4M40 10l2 8'] }
};
// O glifo de cada classe do Font Awesome nos botões do sistema.
export const FA_PARA_GLIFO = {
  'fa-dice-d10': 'd10', 'fa-dice': 'dados', 'fa-dice-d20': 'dados', 'fa-crosshairs': 'atacar', 'fa-location-crosshairs': 'mira', 'fa-bullseye': 'regua',
  'fa-rotate': 'recarregar', 'fa-heart-pulse': 'vida', 'fa-network-wired': 'net', 'fa-star': 'favorito', 'fa-plug': 'plugar', 'fa-plug-circle-xmark': 'desplugar',
  'fa-screwdriver-wrench': 'consertar', 'fa-hand-fist': 'briga', 'fa-fire': 'fogo', 'fa-biohazard': 'risco', 'fa-microchip': 'chip', 'fa-coins': 'eddies',
  'fa-skull-crossbones': 'letal', 'fa-bolt': 'raio', 'fa-eject': 'ejetar', 'fa-user-astronaut': 'netrunner', 'fa-route': 'rota', 'fa-hourglass-half': 'ampulheta',
  'fa-power-off': 'desligar', 'fa-book-open': 'livro', 'fa-image-portrait': 'retrato', 'fa-scissors': 'tesoura', 'fa-address-book': 'contatos',
  'fa-boxes-stacked': 'caixas', 'fa-briefcase': 'maleta', 'fa-database': 'banco', 'fa-water': 'agua', 'fa-users': 'grupo', 'fa-user': 'pessoa',
  'fa-id-badge': 'cracha', 'fa-map': 'mapa', 'fa-eye': 'olhar', 'fa-magnifying-glass': 'busca', 'fa-link': 'ligar', 'fa-wand-magic-sparkles': 'auto',
  'fa-triangle-exclamation': 'perigo', 'fa-person-walking-arrow-right': 'tokenDinamico', 'fa-satellite-dish': 'scanner', 'fa-right-to-bracket': 'entrar',
  'fa-right-from-bracket': 'descer', 'fa-car': 'dirigir', 'fa-car-burst': 'manobra'
};
const svgDoGlifo = ({ tracos = [], cheios = [] }) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">${tracos.map(d => `<path d="${d}" fill="none" stroke="#000" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}${cheios.map(d => `<path d="${d}" fill="#000"/>`).join('')}</svg>
`;
export const svgDoGlifoNomeado = nome => svgDoGlifo(GLIFOS[nome]);
// Onde o glifo vale: os botões do sistema (a ficha, os cartões e as janelas, com a classe do sistema) e os do HUD do token
// que o sistema põe (o prefixo da classe) e o da régua de DV.
const ONDE = ['.cpr-fieldbook', '#token-hud .control-icon[class*="cpr-fieldbook-"]', '#token-hud .dv-table-selector'];
export function cssDosGlifos() {
  const em = classe => ONDE.map(onde => `${onde} i.${classe}::before`).join(',\n');
  const glifo = nome => `url("../icones/neon/glifos/${nome}.svg") center / contain no-repeat`;
  return [
    '/* Gerado por build/icones.mjs (o C49, parte 2): os glifos neon no lugar dos do Font Awesome nos botões do sistema. Não edite à mão. */',
    `${ONDE.map(onde => `${onde} i[class*="fa-"]`).join(',\n')} { filter: drop-shadow(0 0 2px currentColor); }`,
    '#token-hud .control-icon[class*="cpr-fieldbook-"] i, #token-hud .dv-table-selector i { color: #02d7f2; }',
    ...Object.entries(FA_PARA_GLIFO).map(([classe, nome]) => `${em(classe)} {\n  content: ""; display: inline-block; width: 1em; height: 1em; vertical-align: -0.125em; background-color: currentColor;\n  -webkit-mask: ${glifo(nome)}; mask: ${glifo(nome)};\n}`),
    ''
  ].join('\n');
}

const molde = ({ cor, tracos = [], cheios = [], acento = [], tracejado = false }) => {
  const principal = CORES[cor];
  const outra = cor === 'amarelo' ? CORES.vermelho : CORES.amarelo;
  const linha = (d, c, largura = 2.4) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${largura}" stroke-linecap="round" stroke-linejoin="round"${tracejado ? ' stroke-dasharray="3 3"' : ''}/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
<defs><filter id="brilho" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
<path d="M10 2h44l8 8v44l-8 8H10l-8-8V10z" fill="#0b0b10" fill-opacity="0.88" stroke="${principal}" stroke-opacity="0.55" stroke-width="1.5"/>
<path d="M2 18V10l8-8h8M46 62h8l8-8v-8" fill="none" stroke="${principal}" stroke-width="2.2" stroke-linecap="round"/>
<g filter="url(#brilho)">${tracos.map(d => linha(d, principal)).join('')}${cheios.map(d => `<path d="${d}" fill="${principal}"/>`).join('')}${acento.map(d => linha(d, outra, 2.2)).join('')}</g>
</svg>
`;
};
export const svgDoIcone = nome => molde(DESENHOS[nome]);

function main() {
  const pasta = path.join(raiz, 'icones', 'neon');
  fs.mkdirSync(pasta, { recursive: true });
  for (const nome of Object.keys(DESENHOS)) fs.writeFileSync(path.join(pasta, `${nome}.svg`), svgDoIcone(nome));
  console.log(`Ícones: ${Object.keys(DESENHOS).length} em icones/neon`);
  fs.mkdirSync(path.join(pasta, 'glifos'), { recursive: true });
  for (const nome of Object.keys(GLIFOS)) fs.writeFileSync(path.join(pasta, 'glifos', `${nome}.svg`), svgDoGlifoNomeado(nome));
  fs.writeFileSync(path.join(raiz, 'styles', 'icones.css'), cssDosGlifos());
  console.log(`Glifos: ${Object.keys(GLIFOS).length} em icones/neon/glifos, ${Object.keys(FA_PARA_GLIFO).length} classes em styles/icones.css`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();

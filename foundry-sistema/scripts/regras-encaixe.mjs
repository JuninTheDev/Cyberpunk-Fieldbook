// O encaixe da folha no molde, sem Foundry (o C53; pedido do usuário, 2026-11-01: tokens padronizados, feitos no ChatGPT,
// que se encaixem perfeitamente nos cortes, com todos os lados, e só o personagem muda). A IA não acerta a grade: as
// figuras passam da linha (nas folhas do Agente e do Qyan, os pés do Parado caíam na célula de baixo), o tamanho muda de
// uma folha para a outra e às vezes vem um fundo. Aqui cada figura é uma mancha inteira do que não é transparente (com os
// pedaços soltos perto dela), e vai para a sua posição pela ordem (as linhas de cima para baixo, as figuras da esquerda
// para a direita), com a mesma escala na folha toda (pela altura do Parado) e os pés na mesma linha, num quadro do mesmo
// tamanho para todo personagem. Os pixels são RGBA, linha por linha (o ImageData do canvas, ou um Buffer).
import { DIRECOES, NOMES_DAS_POSES, POSES_COM_DIRECAO } from './regras-token-dinamico.mjs';
import { DISPOSICAO_PADRAO, disposicaoValida, quadrosDaFolha, temFundo } from './regras-cortador.mjs';

export const QUADRO = 256; // o lado do quadro padronizado, em pixels
export const ALTURA_DE_PE = 0.75; // a altura da figura de pé (a mediana do Parado) no quadro
export const LINHA_DOS_PES = 0.875; // a linha dos pés no quadro (a figura de pé fica no meio)
export const MARGEM = 4;
export const DEITADAS = ['caido', 'incapacitado', 'morto']; // vão pelo centro; as outras, pelos pés
export const LIMIAR_DO_ALFA = 8;
export const TOLERANCIA_DO_FUNDO = 40;

const mediana = valores => {
  const v = [...valores].sort((a, b) => a - b);
  if (!v.length) return 0;
  const meio = Math.floor(v.length / 2);
  return v.length % 2 ? v[meio] : (v[meio - 1] + v[meio]) / 2;
};
const alturaDe = caixa => caixa.y1 - caixa.y0 + 1;
const larguraDe = caixa => caixa.x1 - caixa.x0 + 1;
const distanciaDaCor = (pixels, i, cor) => Math.hypot(pixels[i] - cor[0], pixels[i + 1] - cor[1], pixels[i + 2] - cor[2]);

// A cor do fundo liso: os quatro cantos opacos e parecidos (a média deles); null se a folha já é transparente nos cantos ou
// se os cantos não combinam (aí não há um fundo liso para tirar).
export function corDoFundo(pixels, largura, altura, tolerancia = TOLERANCIA_DO_FUNDO) {
  const cantos = [0, largura - 1, (altura - 1) * largura, altura * largura - 1].map(p => p * 4);
  if (cantos.some(i => pixels[i + 3] < 250)) return null;
  const cor = [0, 1, 2].map(c => Math.round(cantos.reduce((soma, i) => soma + pixels[i + c], 0) / 4));
  return cantos.every(i => distanciaDaCor(pixels, i, cor) <= tolerancia) ? cor : null;
}

// O fundo de cor viva (o verde puro que o prompt pede): um canal bem acima dos outros dois.
export const ehCroma = cor => Math.max(...cor) - Math.min(...cor) >= 150;

// Tira o fundo liso: o que tem a cor do fundo e se liga à borda da folha fica transparente (a cor parecida dentro da figura
// fica, como um terno preto num fundo escuro). No fundo de cor viva, também o que ficou preso entre o braço e o corpo (a
// cor não aparece no personagem), e a beirada da figura (até 2 pixels do fundo) fica transparente pelo quanto tem da cor
// do fundo, que sai dela (sem o halo verde); nos outros, a beirada perto da cor fica meio transparente. Muda os pixels no
// lugar e devolve quantos ficaram transparentes.
export function tirarFundo(pixels, largura, altura, cor, tolerancia = TOLERANCIA_DO_FUNDO) {
  const total = largura * altura;
  const fundo = new Uint8Array(total);
  const pilha = [];
  const tentar = p => {
    if (!fundo[p] && distanciaDaCor(pixels, p * 4, cor) <= tolerancia) { fundo[p] = 1; pilha.push(p); }
  };
  for (let x = 0; x < largura; x++) { tentar(x); tentar((altura - 1) * largura + x); }
  for (let y = 0; y < altura; y++) { tentar(y * largura); tentar(y * largura + largura - 1); }
  while (pilha.length) {
    const p = pilha.pop(), x = p % largura;
    if (x > 0) tentar(p - 1);
    if (x < largura - 1) tentar(p + 1);
    if (p >= largura) tentar(p - largura);
    if (p < (altura - 1) * largura) tentar(p + largura);
  }
  const croma = ehCroma(cor);
  if (croma) for (let p = 0; p < total; p++) if (!fundo[p] && distanciaDaCor(pixels, p * 4, cor) <= tolerancia) fundo[p] = 1;
  const beirada = new Uint8Array(total);
  let frente = [];
  for (let p = 0; p < total; p++) if (fundo[p]) frente.push(p);
  for (let passo = 0; passo < 2; passo++) {
    const proxima = [];
    for (const p of frente) {
      const x = p % largura;
      for (const q of [x > 0 ? p - 1 : -1, x < largura - 1 ? p + 1 : -1, p - largura, p + largura]) {
        if (q < 0 || q >= total || fundo[q] || beirada[q]) continue;
        beirada[q] = 1;
        proxima.push(q);
      }
    }
    frente = proxima;
  }
  const canal = cor.indexOf(Math.max(...cor)), outros = [0, 1, 2].filter(c => c !== canal);
  const faixa = cor[canal] - Math.max(cor[outros[0]], cor[outros[1]]);
  let tirados = 0;
  for (let p = 0; p < total; p++) {
    const i = p * 4;
    if (fundo[p]) { pixels[i + 3] = 0; tirados++; continue; }
    if (croma) {
      const resto = Math.max(pixels[i + outros[0]], pixels[i + outros[1]]);
      const quanto = Math.min(1, Math.max(0, (pixels[i + canal] - resto) / faixa));
      // Longe da beirada, só o que é mais fundo do que figura (o cabelo meio transparente; a roupa verde-escura fica).
      if (!beirada[p] && quanto <= 0.5) continue;
      pixels[i + 3] = Math.round(pixels[i + 3] * (1 - quanto));
      if (pixels[i + canal] > resto) pixels[i + canal] = resto;
    } else if (beirada[p]) {
      const distancia = distanciaDaCor(pixels, i, cor);
      if (distancia < 2 * tolerancia) pixels[i + 3] = Math.round(pixels[i + 3] * (distancia - tolerancia) / tolerancia);
    }
  }
  return tirados;
}

// As manchas: os pedaços ligados (pelas 8 vizinhas) do que não é transparente. Devolve os rótulos (a mancha de cada pixel,
// -1 no transparente) e a lista, com o tamanho e a caixa de cada uma.
export function manchas(pixels, largura, altura, limiar = LIMIAR_DO_ALFA) {
  const rotulos = new Int32Array(largura * altura).fill(-1);
  const lista = [];
  const pilha = [];
  for (let inicio = 0; inicio < rotulos.length; inicio++) {
    if (rotulos[inicio] >= 0 || pixels[inicio * 4 + 3] <= limiar) continue;
    const mancha = { id: lista.length, n: 0, x0: largura, y0: altura, x1: -1, y1: -1 };
    rotulos[inicio] = mancha.id;
    pilha.push(inicio);
    while (pilha.length) {
      const p = pilha.pop(), x = p % largura, y = (p - x) / largura;
      mancha.n++;
      if (x < mancha.x0) mancha.x0 = x;
      if (x > mancha.x1) mancha.x1 = x;
      if (y < mancha.y0) mancha.y0 = y;
      if (y > mancha.y1) mancha.y1 = y;
      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= altura) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, q = ny * largura + nx;
          if (nx < 0 || nx >= largura || rotulos[q] >= 0 || pixels[q * 4 + 3] <= limiar) continue;
          rotulos[q] = mancha.id;
          pilha.push(q);
        }
      }
    }
    lista.push(mancha);
  }
  return { rotulos, manchas: lista };
}

const juntar = (a, b) => ({ ids: [...a.ids, ...b.ids], n: a.n + b.n, x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) });
const distanciaDasCaixas = (a, b) => Math.hypot(Math.max(0, a.x0 - b.x1, b.x0 - a.x1), Math.max(0, a.y0 - b.y1, b.y0 - a.y1));

// As figuras: as manchas grandes (pelo menos 20% da mediana das maiores, tantas quantas a folha espera), cada uma com os
// pedaços pequenos que ficam perto dela (a arma solta da mão, um respingo); o pedaço longe de todas é sujeira e fica fora.
export function figurasDasManchas(lista, esperadas) {
  const ordem = [...lista].sort((a, b) => b.n - a.n);
  const referencia = mediana(ordem.slice(0, Math.max(1, esperadas)).map(m => m.n));
  const figuras = [], pedacos = [];
  for (const m of ordem) (m.n >= referencia * 0.2 ? figuras : pedacos).push({ ids: [m.id], n: m.n, x0: m.x0, y0: m.y0, x1: m.x1, y1: m.y1 });
  if (!figuras.length) return [];
  const alcance = 0.15 * mediana(figuras.map(alturaDe));
  for (const pedaco of pedacos) {
    let perto = -1, menor = Infinity;
    figuras.forEach((figura, i) => {
      const distancia = distanciaDasCaixas(pedaco, figura);
      if (distancia < menor) { menor = distancia; perto = i; }
    });
    if (menor <= alcance) figuras[perto] = juntar(figuras[perto], pedaco);
  }
  return figuras;
}

// As linhas de figuras: pela altura do centro, uma linha nova a cada salto maior que 35% da altura mediana; cada linha,
// da esquerda para a direita.
export function linhasDeFiguras(figuras) {
  if (!figuras.length) return [];
  const centro = f => (f.y0 + f.y1) / 2;
  const ordem = [...figuras].sort((a, b) => centro(a) - centro(b));
  const salto = 0.35 * mediana(figuras.map(alturaDe));
  const linhas = [[ordem[0]]];
  for (let i = 1; i < ordem.length; i++) {
    if (centro(ordem[i]) - centro(ordem[i - 1]) > salto) linhas.push([]);
    linhas.at(-1).push(ordem[i]);
  }
  return linhas.map(linha => linha.sort((a, b) => (a.x0 + a.x1) - (b.x0 + b.x1)));
}

const NOME_DA_LINHA = { parado: 'Parado', caminhando: 'Caminhando', mirando: 'Mirando', poses: 'poses', ignorar: 'ignorada' };

// A posição de cada figura: a linha da folha é a linha da disposição, e as figuras da linha vão, na ordem, para as chaves
// dela. Uma linha com figura a mais junta a menor à vizinha mais perto (a arma que se soltou), se estiver perto; com figura
// a menos, ou a mais longe das outras, o encaixe recusa a linha (não dá para saber qual falta).
export function posicoesDasFiguras(figuras, disposicao) {
  const disp = disposicaoValida(disposicao);
  const quadros = quadrosDaFolha(disp, 'molde');
  const linhas = linhasDeFiguras(figuras);
  if (linhas.length !== disp.linhas.length) {
    return { posicoes: [], erros: [`Achei ${linhas.length} linha(s) de figuras, e o molde tem ${disp.linhas.length}. Confira se a folha tem as mesmas linhas do molde, com as figuras separadas.`] };
  }
  const alcance = 0.25 * mediana(figuras.map(alturaDe));
  const posicoes = [], erros = [];
  linhas.forEach((linha, l) => {
    if (disp.linhas[l].tipo === 'ignorar') return;
    const chaves = quadros.filter(q => q.linha === l).map(q => q.chave);
    while (linha.length > chaves.length) {
      const menor = linha.reduce((a, b) => (b.n < a.n ? b : a));
      const outras = linha.filter(f => f !== menor);
      const vizinha = outras.reduce((a, b) => (distanciaDasCaixas(menor, b) < distanciaDasCaixas(menor, a) ? b : a));
      if (distanciaDasCaixas(menor, vizinha) > alcance) break;
      linha = outras.map(f => (f === vizinha ? juntar(vizinha, menor) : f)).sort((a, b) => (a.x0 + a.x1) - (b.x0 + b.x1));
    }
    if (linha.length !== chaves.length) {
      erros.push(`A linha ${l + 1} (${NOME_DA_LINHA[disp.linhas[l].tipo]}) tem ${linha.length} figura(s), e o molde pede ${chaves.length}. Duas figuras encostadas viram uma só: peça ao ChatGPT para separá-las.`);
      return;
    }
    linha.forEach((figura, i) => posicoes.push({ chave: chaves[i], linha: l, figura }));
  });
  return { posicoes, erros };
}

// O x do meio da figura: o centro de massa do que é dela (a passada larga e a arma estendida mudam a caixa, mas quase não
// mudam o centro, e o corpo fica no mesmo lugar do Parado para o Caminhando e o Mirando).
export function meioDaFigura(rotulos, largura, figura) {
  const ids = new Set(figura.ids);
  let soma = 0, n = 0;
  for (let y = figura.y0; y <= figura.y1; y++) {
    for (let x = figura.x0; x <= figura.x1; x++) if (ids.has(rotulos[y * largura + x])) { soma += x; n++; }
  }
  return n ? soma / n : (figura.x0 + figura.x1) / 2;
}

// A escala da folha: a figura de pé com ALTURA_DE_PE do quadro, pela mediana do Parado (sem o Parado, das poses com direção;
// sem elas, de todas as figuras de pé).
export function escalaDaFolha(posicoes, quadro = QUADRO) {
  const de = pose => posicoes.filter(p => p.chave.startsWith(`${pose}-`));
  const base = [de('parado'), POSES_COM_DIRECAO.flatMap(de), posicoes.filter(p => !DEITADAS.includes(p.chave))].find(lista => lista.length) ?? [];
  const referencia = mediana(base.map(p => alturaDe(p.figura)));
  return referencia ? (ALTURA_DE_PE * quadro) / referencia : 1;
}

// O plano: de onde sai cada figura na folha (a caixa dela) e onde entra no quadro. A mesma escala para todas (a figura que
// não cabe no quadro, como a deitada larga, diminui só ela); as de pé com o meio delas no meio do quadro e os pés na
// LINHA_DOS_PES; as deitadas no centro.
export function planoDoEncaixe(posicoes, { quadro = QUADRO } = {}) {
  const escala = escalaDaFolha(posicoes, quadro);
  const util = quadro - 2 * MARGEM;
  return posicoes.map(({ chave, figura }) => {
    const largura = larguraDe(figura), altura = alturaDe(figura);
    const s = Math.min(escala, util / largura, util / altura);
    const w = Math.round(largura * s), h = Math.round(altura * s);
    let x, y;
    if (DEITADAS.includes(chave)) {
      x = (quadro - w) / 2;
      y = (quadro - h) / 2;
    } else {
      const meio = figura.meio ?? (figura.x0 + figura.x1) / 2;
      x = quadro / 2 - (meio - figura.x0 + 0.5) * s;
      y = LINHA_DOS_PES * quadro - h;
    }
    x = Math.round(Math.min(Math.max(x, MARGEM), quadro - MARGEM - w));
    y = Math.round(Math.min(Math.max(y, MARGEM), quadro - MARGEM - h));
    return { chave, ids: figura.ids, origem: { x: figura.x0, y: figura.y0, largura, altura }, destino: { x, y, largura: w, altura: h }, reduzida: s < escala };
  });
}

// Os pixels só da figura, na caixa dela (o que é de outra figura que entrou na caixa fica transparente).
export function pixelsDaFigura(pixels, largura, rotulos, { ids, origem }) {
  const dela = new Set(ids);
  const saida = new Uint8ClampedArray(origem.largura * origem.altura * 4);
  for (let y = 0; y < origem.altura; y++) {
    for (let x = 0; x < origem.largura; x++) {
      const p = (origem.y + y) * largura + origem.x + x;
      if (!dela.has(rotulos[p])) continue;
      saida.set(pixels.subarray(p * 4, p * 4 + 4), (y * origem.largura + x) * 4);
    }
  }
  return saida;
}

// A máscara da figura num quadrado de lado × lado, esticada pela caixa (para comparar a forma de duas figuras).
export function mascaraDaFigura(rotulos, largura, figura, lado = 32) {
  const ids = new Set(figura.ids);
  const mascara = new Uint8Array(lado * lado);
  for (let j = 0; j < lado; j++) {
    for (let i = 0; i < lado; i++) {
      const x = figura.x0 + Math.floor((i + 0.5) * larguraDe(figura) / lado);
      const y = figura.y0 + Math.floor((j + 0.5) * alturaDe(figura) / lado);
      mascara[j * lado + i] = ids.has(rotulos[y * largura + x]) ? 1 : 0;
    }
  }
  return mascara;
}

// A parte em comum de duas máscaras (a interseção pela união), com a segunda espelhada ou não.
export function sobreposicao(a, b, lado, espelhar = false) {
  let comum = 0, uniao = 0;
  for (let j = 0; j < lado; j++) {
    for (let i = 0; i < lado; i++) {
      const va = a[j * lado + i], vb = b[j * lado + (espelhar ? lado - 1 - i : i)];
      if (va && vb) comum++;
      if (va || vb) uniao++;
    }
  }
  return uniao ? comum / uniao : 0;
}

// Os pares de lados: a direção e a do outro lado (45 e 315, 90 e 270, 135 e 225), uma o espelho da outra.
export const PARES_DE_LADO = DIRECOES.filter(d => d > 0 && d < 180).map(d => [d, 360 - d]);
export const FOLGA_DO_ESPELHO = 0.05;
export const ALTURA_FORA = { menor: 0.8, maior: 1.25 };
const nomeDaChave = chave => {
  const [pose, angulo] = chave.split('-');
  return POSES_COM_DIRECAO.includes(pose) ? `${NOMES_DAS_POSES[pose]} ${angulo}°` : NOMES_DAS_POSES[chave] ?? chave;
};

// Os avisos (a folha encaixa, mas vale olhar): a figura com direção bem maior ou menor que o Parado (a IA mudou o tamanho), e
// o par de lados virado para o mesmo lado (a forma de um combina mais com a do outro do que com o espelho dele).
export function avisosDoEncaixe(posicoes, rotulos, largura) {
  const avisos = [];
  const porChave = new Map(posicoes.map(p => [p.chave, p.figura]));
  const parado = mediana(posicoes.filter(p => p.chave.startsWith('parado-')).map(p => alturaDe(p.figura)));
  if (parado) {
    for (const { chave, figura } of posicoes) {
      if (!POSES_COM_DIRECAO.includes(chave.split('-')[0])) continue;
      const razao = alturaDe(figura) / parado;
      if (razao < ALTURA_FORA.menor || razao > ALTURA_FORA.maior) avisos.push(`${nomeDaChave(chave)} saiu ${razao < 1 ? 'menor' : 'maior'} que o Parado (${Math.round(razao * 100)}% da altura).`);
    }
  }
  for (const pose of POSES_COM_DIRECAO) {
    for (const [a, b] of PARES_DE_LADO) {
      const fa = porChave.get(`${pose}-${a}`), fb = porChave.get(`${pose}-${b}`);
      if (!fa || !fb) continue;
      const ma = mascaraDaFigura(rotulos, largura, fa), mb = mascaraDaFigura(rotulos, largura, fb);
      if (sobreposicao(ma, mb, 32) > sobreposicao(ma, mb, 32, true) + FOLGA_DO_ESPELHO) avisos.push(`${nomeDaChave(`${pose}-${a}`)} e ${b}° parecem virados para o mesmo lado (um devia ser o espelho do outro).`);
    }
  }
  return avisos;
}

// O encaixe inteiro: tira o fundo liso (muda os pixels), acha as figuras, as posições e o plano. Devolve { plano, rotulos,
// erros, avisos, fundo }; com erros, o plano fica vazio (o cortador não grava nada pela metade).
export function encaixarFolha(pixels, largura, altura, disposicao, { quadro = QUADRO } = {}) {
  const fundo = corDoFundo(pixels, largura, altura);
  if (fundo) tirarFundo(pixels, largura, altura, fundo);
  else if (temFundo([0, largura - 1, (altura - 1) * largura, altura * largura - 1].map(p => pixels[p * 4 + 3]))) {
    return { plano: [], rotulos: null, erros: ['A folha tem fundo, e ele não é de uma cor só: peça ao ChatGPT o fundo transparente (ou verde puro, liso).'], avisos: [], fundo };
  }
  const { rotulos, manchas: lista } = manchas(pixels, largura, altura);
  const figuras = figurasDasManchas(lista, quadrosDaFolha(disposicao, 'molde').length);
  if (!figuras.length) return { plano: [], rotulos, erros: ['A folha não tem nenhuma figura (está toda transparente).'], avisos: [], fundo };
  const { posicoes, erros } = posicoesDasFiguras(figuras, disposicao);
  if (erros.length) return { plano: [], rotulos, erros, avisos: [], fundo };
  for (const posicao of posicoes) posicao.figura.meio = meioDaFigura(rotulos, largura, posicao.figura);
  return { plano: planoDoEncaixe(posicoes, { quadro }), rotulos, erros: [], avisos: avisosDoEncaixe(posicoes, rotulos, largura), fundo };
}

// O molde para o ChatGPT: os quadros encaixados de uma folha que já existe, em cinza (o manequim: a pose e a direção, sem a
// roupa e as cores do personagem de antes), cada um a 3/4 do tamanho numa célula de 192 × 256, na mesma linha e coluna
// da folha. Com a disposição padrão, 1536 × 1024: o formato paisagem do ChatGPT.
export const MOLDE = { largura: 192, altura: 256, escala: 0.75 };
export function moldeDaDisposicao(disposicao = DISPOSICAO_PADRAO, quadro = QUADRO) {
  const disp = disposicaoValida(disposicao);
  const lado = Math.round(quadro * MOLDE.escala);
  const posicoes = quadrosDaFolha(disp, 'molde').map(({ linha, coluna, chave }) => ({
    chave, x: coluna * MOLDE.largura + Math.round((MOLDE.largura - lado) / 2), y: linha * MOLDE.altura + Math.round((MOLDE.altura - lado) / 2), lado
  }));
  return { largura: disp.colunas * MOLDE.largura, altura: disp.linhas.length * MOLDE.altura, posicoes };
}

// O cinza do manequim: a luz de cada pixel, entre 70 e 198 (o terno preto vira cinza, e o rosto, um cinza claro). Muda os
// pixels no lugar; o alfa fica.
export function cinzaDoManequim(pixels) {
  for (let i = 0; i < pixels.length; i += 4) {
    const luz = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
    pixels[i] = pixels[i + 1] = pixels[i + 2] = Math.round(70 + luz / 2);
  }
  return pixels;
}

// O prompt para o ChatGPT, pela disposição (as linhas, as direções na ordem do molde e as poses em cada coluna), com a
// descrição do personagem (sem ela, a segunda imagem) e as regras que o encaixe pede: o fundo transparente (ou o verde
// puro), as figuras separadas, o mesmo tamanho e nada de texto.
const DIRECAO_NO_MOLDE = {
  0: 'de frente (virado para baixo)', 45: 'virado para baixo e para a esquerda', 90: 'de perfil, virado para a esquerda',
  135: 'de costas, virado para cima e para a esquerda', 180: 'de costas (virado para cima)', 225: 'de costas, virado para cima e para a direita',
  270: 'de perfil, virado para a direita', 315: 'virado para baixo e para a direita'
};
const POSE_NO_MOLDE = {
  parado: 'Parado, em pé e relaxado', caminhando: 'Caminhando, no meio de um passo', mirando: 'Mirando, com a arma nas duas mãos, apontada para onde ele olha',
  'ferido-leve': 'ferido leve (em pé, curvado, com a mão no ferimento)', 'ferido-grave': 'ferido grave (de joelhos, apoiado numa mão)',
  caido: 'caído (no chão, tentando se levantar)', incapacitado: 'incapacitado (deitado de lado no chão)', morto: 'morto (de bruços no chão)'
};
export function promptDoChatGPT({ descricao = '', disposicao = DISPOSICAO_PADRAO } = {}) {
  const disp = disposicaoValida(disposicao);
  const personagem = String(descricao ?? '').trim().replace(/\.+$/, '');
  const direcoes = DIRECOES.slice(0, disp.colunas);
  const linhas = disp.linhas.map((linha, l) => {
    if (linha.tipo === 'ignorar') return `${l + 1}. Vazia.`;
    if (linha.tipo === 'poses') {
      const poses = linha.poses.map((pose, c) => (pose ? `na coluna ${c + 1}, ${POSE_NO_MOLDE[pose]}` : null)).filter(Boolean);
      return `${l + 1}. Uma pose por coluna, as outras colunas vazias: ${poses.join('; ')}.`;
    }
    return `${l + 1}. ${POSE_NO_MOLDE[linha.tipo]}, em ${direcoes.length} direções, uma por coluna: ${direcoes.map(d => DIRECAO_NO_MOLDE[d]).join('; ')}.`;
  });
  return [
    `Faça uma folha de sprites de um personagem para token de RPG (Cyberpunk RED), seguindo o molde da primeira imagem: ${disp.linhas.length} linhas e ${disp.colunas} colunas de figuras cinza, em vista de cima 3/4. Copie do molde a posição, a pose, a direção e o tamanho de cada figura. Troque só o manequim cinza pelo personagem, o mesmo em todas as figuras: o rosto, o cabelo, a roupa, as cores, os implantes e a arma.`,
    '',
    personagem ? `O personagem: ${personagem}.` : 'O personagem: o da segunda imagem.',
    'Se houver uma segunda imagem, ela mostra o personagem: siga o rosto, a roupa e as cores dela.',
    '',
    'A folha, linha por linha, da esquerda para a direita (esquerda e direita de quem olha a folha):',
    ...linhas,
    '',
    'Regras:',
    `- o mesmo formato do molde (${disp.colunas * MOLDE.largura} × ${disp.linhas.length * MOLDE.altura}, paisagem);`,
    '- fundo transparente (PNG); se não der, um verde puro e liso (#00FF00), sem sombra nem degradê, e sem esse verde no personagem;',
    '- cada figura inteira e separada das vizinhas, com espaço entre elas: nenhuma encosta na outra nem passa para a célula do lado;',
    '- o personagem do mesmo tamanho em todas as figuras, como no molde;',
    '- o mesmo estilo de ilustração, a mesma luz e as mesmas cores em todas as figuras;',
    '- sem texto, números, molduras, linhas de grade, sombra no chão ou cenário.'
  ].join('\n');
}

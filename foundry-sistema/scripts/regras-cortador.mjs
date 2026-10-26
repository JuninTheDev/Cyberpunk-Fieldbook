// O cortador da folha dos tokens dinâmicos, sem Foundry (o C45, parte 3; decisão do usuário, 2026-10-25: a folha inteira,
// com fundo transparente, e um cortador). A folha é uma grade: cada linha é uma pose com direção (as colunas são as 8
// direções, 0°, 45°... 315°, na ordem da folha; a calibração da janela do conjunto acerta o sentido) ou uma linha de poses
// sem direção (cada coluna diz qual pose é, ou nenhuma). Embaixo de cada célula pode haver uma faixa de rótulo, que fica
// fora. Todos os quadros saem com a mesma caixa (a união do que não é transparente em todas as células), para o tamanho
// não pular de um quadro para o outro. O nome segue o padrão que a janela lê: <nome>_<pose>_<ângulo>.webp e
// <nome>_<pose>.webp.
import { DIRECOES, POSES_COM_DIRECAO, POSES_SEM_DIRECAO } from './regras-token-dinamico.mjs';

export const TIPOS_DE_LINHA = [...POSES_COM_DIRECAO, 'poses', 'ignorar'];
// A disposição da folha de exemplo do usuário: Parado, Caminhando e Mirando, e as poses (Correndo, Salto, Agachado e
// Levantando ficam fora por decisão dele; depois, Ferido leve, Ferido grave, Incapacitado e Morto).
export const DISPOSICAO_PADRAO = {
  colunas: 8,
  linhas: [
    { tipo: 'parado' }, { tipo: 'caminhando' }, { tipo: 'mirando' },
    { tipo: 'poses', poses: ['', '', '', '', 'ferido-leve', 'ferido-grave', 'incapacitado', 'morto'] }
  ],
  rotulo: 0
};

// O nome-base do arquivo: minúsculas, sem acento e só letras, números e hífen (o "_" separa as partes do nome padronizado).
export const nomeBase = texto => String(texto ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'token';

// A disposição válida: colunas de 1 a 16, as linhas com tipo conhecido (as de poses com uma pose por coluna, vazias as
// desconhecidas), a faixa do rótulo de 0 a 60% da célula.
export function disposicaoValida(dados = {}) {
  const colunas = Math.min(16, Math.max(1, Math.trunc(Number(dados.colunas)) || 8));
  const linhas = (Array.isArray(dados.linhas) ? dados.linhas : []).slice(0, 16).map(linha => {
    const tipo = TIPOS_DE_LINHA.includes(linha?.tipo) ? linha.tipo : 'ignorar';
    if (tipo !== 'poses') return { tipo };
    const poses = Array.from({ length: colunas }, (_, i) => (POSES_SEM_DIRECAO.includes(linha?.poses?.[i]) ? linha.poses[i] : ''));
    return { tipo, poses };
  });
  const rotulo = Math.min(60, Math.max(0, Number(dados.rotulo) || 0));
  return { colunas, linhas, rotulo };
}

// As células: cada uma com a linha, a coluna e o retângulo na folha (sem a faixa do rótulo embaixo). Arredonda para pixels
// inteiros; a última coluna e a última linha vão até a borda.
export function celulasDaGrade({ largura, altura, colunas, linhas, rotulo = 0 }) {
  const celulas = [];
  for (let linha = 0; linha < linhas; linha++) {
    const y0 = Math.round(linha * altura / linhas), y1 = Math.round((linha + 1) * altura / linhas);
    const alturaUtil = Math.max(1, Math.round((y1 - y0) * (1 - rotulo / 100)));
    for (let coluna = 0; coluna < colunas; coluna++) {
      const x0 = Math.round(coluna * largura / colunas), x1 = Math.round((coluna + 1) * largura / colunas);
      celulas.push({ linha, coluna, x: x0, y: y0, largura: x1 - x0, altura: alturaUtil });
    }
  }
  return celulas;
}

// O que cada célula vira: { linha, coluna, chave, arquivo } (as ignoradas ficam fora).
export function quadrosDaFolha(disposicao, nome) {
  const { colunas, linhas } = disposicaoValida(disposicao);
  const base = nomeBase(nome);
  const quadros = [];
  linhas.forEach((linha, l) => {
    for (let c = 0; c < colunas; c++) {
      if (POSES_COM_DIRECAO.includes(linha.tipo) && c < DIRECOES.length) {
        const angulo = DIRECOES[c];
        quadros.push({ linha: l, coluna: c, chave: `${linha.tipo}-${angulo}`, arquivo: `${base}_${linha.tipo}_${String(angulo).padStart(3, '0')}.webp` });
      } else if (linha.tipo === 'poses' && linha.poses[c]) {
        quadros.push({ linha: l, coluna: c, chave: linha.poses[c], arquivo: `${base}_${linha.poses[c]}.webp` });
      }
    }
  });
  return quadros;
}

// A caixa do que não é transparente numa célula (alfa: os bytes de alfa da célula, linha por linha), relativa à célula; null
// se a célula está toda transparente.
export function caixaOpaca(alfa, largura, altura, limiar = 8) {
  let x0 = largura, y0 = altura, x1 = -1, y1 = -1;
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      if (alfa[y * largura + x] <= limiar) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, largura: x1 - x0 + 1, altura: y1 - y0 + 1 };
}

// A caixa comum: a união das caixas (as vazias ficam fora), com uma margem de pixels, dentro do tamanho da célula; sem
// nenhuma, a célula inteira.
export function caixaComum(caixas, { largura, altura, margem = 2 } = {}) {
  const validas = caixas.filter(Boolean);
  if (!validas.length) return { x: 0, y: 0, largura, altura };
  const x0 = Math.max(0, Math.min(...validas.map(c => c.x)) - margem);
  const y0 = Math.max(0, Math.min(...validas.map(c => c.y)) - margem);
  const x1 = Math.min(largura, Math.max(...validas.map(c => c.x + c.largura)) + margem);
  const y1 = Math.min(altura, Math.max(...validas.map(c => c.y + c.altura)) + margem);
  return { x: x0, y: y0, largura: x1 - x0, altura: y1 - y0 };
}

// A folha tem fundo? Os quatro cantos opacos (alfa acima do limiar) indicam que sim: o token mostraria o fundo.
export const temFundo = (cantos, limiar = 8) => cantos.length > 0 && cantos.every(alfa => alfa > limiar);

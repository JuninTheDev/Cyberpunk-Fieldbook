// O palco PIXI dos efeitos na mesa (o C80; o plano em foundry-sistema/efeitos-plano/PLANO.md, seção 5.1, e o anexo
// equipe/fx-visual.md, seções 2.3, 2.4, 3 a 5). Desenha os passos de um roteiro (regras-coreografia.mjs) neste
// navegador, sem módulo nenhum: o clarão do cano (P1) e o chão que acende em volta dele (P14), o traçante (P2), a
// faísca (P3), o sangue estilizado (P4), a poeira e as lascas (P5), o glitch (P9) e o eco da esquiva (P10) no token, o
// retículo e o rótulo do alvo (P11) e a marca da bala (P16). O texto (P15) continua no efeitos.mjs.
// - Onde: um contêiner do Foundry no canvas.primary, que fica sob a névoa e a iluminação (o jogador só vê o que a visão
//   dele alcança), acima dos tokens; a marca e o chão aceso num outro, abaixo dos tokens; o retículo na interface (por
//   cima da névoa: só entra o passo de um token que este navegador vê, o diretor já filtrou).
// - Um roteiro, um conjunto de contêineres, destruído no fim (e no canvasTearDown): nada fica na cena numa sessão longa.
//   O tempo é o do relógio (o performance.now): a aba que volta do segundo plano termina o que ficou para trás de uma vez,
//   e um temporizador de segurança encerra o roteiro que o ticker não andou.
// - Nunca mexe num documento nem na imagem do token: o eco e o glitch são cópias da textura dele, no nosso contêiner.
// - O sorteio (o espalhamento das faíscas) sai do id do evento: o mesmo desenho em todos os navegadores.
import { SISTEMA } from './config.mjs';

// O orçamento de partículas vivas (o plano, seção 4.6): 300 no completo, 120 no reduzido.
export const ORCAMENTO = Object.freeze({ completo: 300, reduzido: 120 });
const estado = { vivos: new Set(), criados: 0, destruidos: 0, particulas: 0, maiorParticulas: 0, pecas: {}, falhas: 0 };

// As cores (o tema e o anexo do fx-visual, seção 3).
const COR = {
  branco: 0xfffbe6, amarelo: 0xfcee09, ciano: 0x02d7f2, magenta: 0xff2a8a, vermelho: 0xff2a4a, laranja: 0xff9a3c,
  faisca: 0xffd28a, poeira: 0x8c8c8c, lasca: 0x3a3a3a, marca: 0x141414, metal: 0xd8f0ff
};
const DO_TRACANTE = { amarelo: [0xfff3b0, 0xff9a3c], laranja: [0xffe0a0, 0xff5a1f], azul: [0xe6fdff, 0x02d7f2] };
const DO_CLARAO = { pequeno: 0.25, medio: 0.4, grande: 0.6, flashbang: 1.5 };
const ADD = () => PIXI.BLEND_MODES.ADD;
const rad = graus => (graus * Math.PI) / 180;

// Um sorteio com semente (o mulberry32), pelo texto: o mesmo id dá os mesmos números em todo navegador.
function sorteio(texto) {
  let h = 2166136261;
  for (const letra of String(texto)) h = Math.imul(h ^ letra.charCodeAt(0), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const casa = () => canvas.grid?.size ?? 100;
const objetoDo = id => (id ? canvas.tokens?.get(id) ?? null : null);

// ---------------- As partículas (as faíscas, o sangue, a poeira) ----------------
// Um jorro é um Graphics só, redesenhado a cada quadro: riscos (a faísca, o sangue) ou bolas (a poeira, as lascas). O
// número respeita o orçamento: passou dele, o jorro sai pela metade.
function jorro(camada, { x, y, n, cor, direcao = null, abertura = 360, velocidade = [200, 500], vida = 300, gravidade = 0, risco = true, raio = 2, sorte, alpha = 1, blend = true }) {
  const limite = ORCAMENTO[camada.nivel] ?? ORCAMENTO.completo;
  let quantos = n;
  if (estado.particulas + quantos > limite) quantos = Math.max(2, Math.floor(quantos / 2));
  estado.particulas += quantos;
  estado.maiorParticulas = Math.max(estado.maiorParticulas, estado.particulas);
  const escala = casa() / 100;
  const partes = Array.from({ length: quantos }, () => {
    const angulo = direcao === null ? sorte() * 360 : direcao + (sorte() - 0.5) * abertura;
    const v = (velocidade[0] + sorte() * (velocidade[1] - velocidade[0])) * escala;
    return { vx: Math.cos(rad(angulo)) * v, vy: Math.sin(rad(angulo)) * v, tam: (0.6 + sorte() * 0.8) * raio * escala };
  });
  const g = camada.add(new PIXI.Graphics());
  if (blend) g.blendMode = ADD();
  return {
    duracao: vida,
    atualizar(p, ms) {
      const s = ms / 1000;
      g.clear();
      for (const parte of partes) {
        const px = x + parte.vx * s, py = y + parte.vy * s + 0.5 * gravidade * escala * s * s;
        const a = alpha * (1 - p);
        if (risco) {
          g.lineStyle(parte.tam, cor, a);
          g.moveTo(px - parte.vx * 0.03, py - parte.vy * 0.03).lineTo(px, py);
        } else {
          g.lineStyle(0);
          g.beginFill(cor, a).drawCircle(px, py, parte.tam * (1 + p)).endFill();
        }
      }
    },
    destruir() { estado.particulas -= quantos; g.destroy(); }
  };
}

// Um brilho redondo que nasce e some (o núcleo do impacto, o chão aceso do clarão): círculos concêntricos aditivos.
function brilho(camada, { x, y, raio, cor, duracao, alpha = 1, cresce = 0.3 }) {
  const g = camada.add(new PIXI.Graphics());
  g.blendMode = ADD();
  for (const [r, a] of [[1, 0.25], [0.66, 0.45], [0.33, 0.9]]) g.beginFill(cor, a).drawCircle(0, 0, raio * r).endFill();
  g.position.set(x, y);
  return {
    duracao,
    atualizar(p) { g.alpha = alpha * (1 - p); g.scale.set(1 + cresce * p); },
    destruir() { g.destroy(); }
  };
}

// Várias peças como uma: a duração é a da mais longa.
function juntas(...pecas) {
  const lista = pecas.filter(Boolean);
  const duracao = Math.max(0, ...lista.map(peca => peca.duracao));
  return {
    duracao,
    atualizar(_p, ms) { for (const peca of lista) peca.atualizar(Math.min(1, ms / peca.duracao), ms); },
    destruir() { for (const peca of lista) peca.destruir(); }
  };
}

// A cópia da imagem do token (o eco e o glitch): a mesma textura, no tamanho e na rotação da malha dele.
function copiaDoToken(camada, objeto, cor) {
  const malha = objeto?.mesh;
  if (!malha?.texture) return null;
  const copia = camada.add(new PIXI.Sprite(malha.texture));
  copia.anchor.set(0.5, 0.5);
  copia.width = Math.abs(malha.width);
  copia.height = Math.abs(malha.height);
  copia.rotation = malha.rotation ?? 0;
  copia.position.set(objeto.center.x, objeto.center.y);
  copia.tint = cor;
  copia.blendMode = ADD();
  return copia;
}

// ---------------- As peças ----------------
// Cada peça recebe o passo e o roteiro e devolve { duracao, atualizar(p, ms), destruir() }, ou null (nada a desenhar).
const PECAS = {
  // P1 e P14: a estrela de 4 pontas na borda do token voltada para o alvo, e o chão que acende em volta (não no reduzido).
  clarao(passo, r) {
    const tamanho = (DO_CLARAO[passo.chave?.split('.')[1]] ?? 0.4) * casa();
    const objeto = objetoDo(passo.token);
    const direcao = rad(passo.direcao ?? 0);
    const raio = objeto ? Math.min(objeto.w, objeto.h) / 2 : 0;
    const x = passo.para.x + Math.cos(direcao) * raio, y = passo.para.y + Math.sin(direcao) * raio;
    const tech = r.evento.arma?.classe2077 === 'tech';
    const g = r.alto.add(new PIXI.Graphics());
    g.blendMode = ADD();
    const longo = tamanho, curto = tamanho * 0.35;
    g.beginFill(tech ? COR.ciano : COR.amarelo, 0.85).drawPolygon([longo, 0, curto * 0.4, curto * 0.4, 0, curto, -curto * 0.4, curto * 0.4, -curto, 0, -curto * 0.4, -curto * 0.4, 0, -curto, curto * 0.4, -curto * 0.4]).endFill();
    g.beginFill(COR.branco, 1).drawCircle(0, 0, curto * 0.6).endFill();
    g.position.set(x, y);
    g.rotation = direcao;
    const estrela = {
      duracao: Math.max(50, passo.duracao),
      atualizar(p) { g.alpha = 1 - p; g.scale.set(0.8 + 0.4 * p); },
      destruir() { g.destroy(); }
    };
    // O chão aceso: de 2 a 3 m (a classe), por 120 ms, só para quem enxerga ali (fica sob a névoa); não no reduzido.
    const luz = passo.particulas === false ? null : brilho(r.baixo, { x, y, raio: casa() * (tamanho / casa() > 0.5 ? 1.5 : 1), cor: tech ? 0x7af3ff : 0xffcf80, duracao: 120, alpha: 0.35, cresce: 0.1 });
    return juntas(estrela, luz);
  },

  // P2: a cabeça brilhante e a cauda, do cano ao fim, no tempo do voo; a curva da Smart; o crítico congela um instante
  // antes de bater (a parada); o rastro de ar do fuzil de precisão fica 400 ms depois da chegada.
  tracante(passo, r) {
    const [cabeca, cauda] = DO_TRACANTE[passo.chave?.split('.')[1]] ?? DO_TRACANTE.amarelo;
    const escala = casa() / 100;
    const largura = (passo.largura ?? 2) * escala, comprimentoDaCauda = (passo.cauda ?? 50) * escala;
    const { de, para } = passo;
    const total = Math.hypot(para.x - de.x, para.y - de.y) || 1;
    const lado = r.sorte() < 0.5 ? -1 : 1;
    const curva = passo.curva ? Math.min(total * 0.15, casa() * 1.5) * lado : 0;
    const ponto = u => ({
      x: de.x + (para.x - de.x) * u - ((para.y - de.y) / total) * curva * Math.sin(Math.PI * u),
      y: de.y + (para.y - de.y) * u + ((para.x - de.x) / total) * curva * Math.sin(Math.PI * u)
    });
    const parada = passo.parada ?? 0, voo = Math.max(1, passo.duracao - parada);
    const onde = ms => (!parada || ms < 0.9 * voo ? ms / voo : ms < 0.9 * voo + parada ? 0.9 : (ms - parada) / voo);
    const g = r.alto.add(new PIXI.Graphics());
    g.blendMode = ADD();
    const sumir = 60, rastro = passo.rastro ? 400 : 0;
    return {
      duracao: passo.duracao + Math.max(sumir, rastro),
      atualizar(_p, ms) {
        g.clear();
        const u = Math.min(1, onde(ms));
        const depois = Math.max(0, ms - passo.duracao);
        const u0 = Math.max(0, u - comprimentoDaCauda / total) + (depois > 0 ? Math.min(1, depois / sumir) * (u - Math.max(0, u - comprimentoDaCauda / total)) : 0);
        if (rastro && depois > 0) {
          g.lineStyle(Math.max(1, largura * 0.5), 0xffffff, 0.25 * (1 - depois / rastro));
          g.moveTo(de.x, de.y).lineTo(para.x, para.y);
        }
        if (u0 >= u) return;
        // A cauda (6 trechos, mais clara perto da cabeça) e a cabeça.
        for (let k = 0; k < 6; k++) {
          const a = ponto(u0 + ((u - u0) * k) / 6), b = ponto(u0 + ((u - u0) * (k + 1)) / 6);
          g.lineStyle(largura * (0.5 + k / 10), cauda, 0.15 + (k / 6) * 0.6);
          g.moveTo(a.x, a.y).lineTo(b.x, b.y);
        }
        if (!depois) {
          const c = ponto(u);
          g.lineStyle(0);
          g.beginFill(cabeca, 1).drawCircle(c.x, c.y, largura).endFill();
        }
      },
      destruir() { g.destroy(); }
    };
  },

  // O que voa sem ser bala (a flecha, a faca, a chama, a granada): uma peça pequena em linha reta.
  projetil(passo, r) { return voador(passo, r, false); },
  // O arco do arremesso: a mesma peça, subindo e descendo.
  arco(passo, r) { return voador(passo, r, true); },

  // O impacto (o plano, seção 5.3), pelo desfecho: o núcleo que brilha no alvo; a armadura que segurou, o anel ciano que
  // racha; o escudo, o hexágono entre os dois que recebe o tiro e trinca; a estase, o anel gelado; o veículo, o brilho
  // metálico.
  impacto(passo, r) {
    const { x, y } = passo.para;
    const c = casa();
    const forte = passo.intensidade === 'forte' || passo.desfecho === 'morte';
    const nucleo = brilho(r.alto, { x, y, raio: c * (forte ? 0.3 : 0.2), cor: passo.desfecho === 'veiculo' ? COR.metal : 0xffe2b0, duracao: 160, cresce: 0.5 });
    if (passo.desfecho === 'armadura') return juntas(nucleo, anelQueRacha(r, x, y, c * 0.45, COR.ciano));
    if (passo.desfecho === 'estase') return juntas(nucleo, anelQueRacha(r, x, y, c * 0.5, 0xbff8ff, false));
    if (passo.desfecho === 'escudo') {
      const volta = passo.direcao === null || passo.direcao === undefined ? -90 : passo.direcao + 180;
      return juntas(nucleo, hexagono(r, x + Math.cos(rad(volta)) * c * 0.6, y + Math.sin(rad(volta)) * c * 0.6, c * 0.35, volta));
    }
    return nucleo;
  },

  // P4: o sangue estilizado (faíscas vermelhas neon, sem poça), saindo do lado oposto ao tiro. No reduzido e com o sangue
  // desligado, o diretor já trocou pela faísca.
  sangue(passo, r) {
    if (passo.particulas === false) return null;
    return jorro(r.alto, { x: passo.para.x, y: passo.para.y, n: 8 + Math.floor(r.sorte() * 8), cor: COR.vermelho, direcao: passo.direcao ?? null, abertura: 50, velocidade: [150, 380], vida: Math.max(300, passo.duracao), gravidade: 400, raio: 2.5, sorte: r.sorte });
  },

  // P3 e P5: a faísca que volta para o atirador (a armadura), a ciano (o escudo, a estase, o EMP) e, no chão e na parede,
  // a poeira, as lascas e umas faíscas. No reduzido, só um brilho pequeno.
  faisca(passo, r) {
    const { x, y } = passo.para;
    const tipo = passo.chave?.split('.')[1];
    if (passo.particulas === false) return brilho(r.alto, { x, y, raio: casa() * 0.15, cor: tipo === 'armadura' ? COR.faisca : COR.ciano, duracao: 150 });
    const volta = passo.direcao === null || passo.direcao === undefined ? null : passo.direcao + 180;
    if (tipo === 'chao') {
      return juntas(
        jorro(r.alto, { x, y, n: 5, cor: COR.poeira, velocidade: [20, 60], vida: 550, risco: false, raio: 7, sorte: r.sorte, alpha: 0.5, blend: false }),
        jorro(r.alto, { x, y, n: 5, cor: COR.lasca, velocidade: [120, 260], vida: 400, gravidade: 500, risco: false, raio: 1.6, sorte: r.sorte, blend: false }),
        jorro(r.alto, { x, y, n: 4, cor: COR.faisca, velocidade: [200, 420], vida: 200, sorte: r.sorte })
      );
    }
    const cor = tipo === 'armadura' ? COR.faisca : COR.ciano;
    return jorro(r.alto, { x, y, n: 8 + Math.floor(r.sorte() * 6), cor, direcao: tipo === 'emp' ? null : volta, abertura: 70, velocidade: [200, 500], vida: Math.max(200, passo.duracao), gravidade: 300, sorte: r.sorte });
  },

  // P10: o eco da esquiva: duas cópias do token (ciano e magenta) que escorregam para o lado da linha do tiro e somem.
  esquiva(passo, r) {
    const objeto = objetoDo(passo.token);
    const lado = r.sorte() < 0.5 ? -1 : 1;
    const direcao = rad((passo.direcao ?? 0) + 90 * lado);
    const copias = [copiaDoToken(r.alto, objeto, COR.ciano), copiaDoToken(r.alto, objeto, COR.magenta)].filter(Boolean);
    if (!copias.length) return null;
    const passoDoEco = casa() * 0.4;
    return {
      duracao: Math.max(300, passo.duracao * 2),
      atualizar(p) {
        copias.forEach((copia, i) => {
          const d = passoDoEco * Math.sin(Math.PI * Math.min(1, p * 1.2)) * (1 + i * 0.5);
          copia.position.set(objeto.center.x + Math.cos(direcao) * d, objeto.center.y + Math.sin(direcao) * d);
          copia.alpha = 0.45 * (1 - p);
        });
      },
      destruir() { for (const copia of copias) copia.destroy(); }
    };
  },

  // P9: o glitch no token (o crítico, a morte): a imagem em vermelho e ciano deslocadas e três faixas. No reduzido e no
  // modo fotossensível, sem piscar (o deslocamento só diminui), para nada passar de 3 piscadas por segundo.
  glitch(passo, r) {
    const objeto = objetoDo(passo.token);
    if (!objeto) return null;
    const copias = [copiaDoToken(r.alto, objeto, COR.vermelho), copiaDoToken(r.alto, objeto, COR.ciano)].filter(Boolean);
    const faixas = r.calmo ? null : r.alto.add(new PIXI.Graphics());
    if (faixas) faixas.blendMode = ADD();
    const largura = objeto.w, altura = objeto.h;
    const sorte = r.sorte;
    let quadro = -1;
    return {
      duracao: Math.max(200, passo.duracao),
      atualizar(p, ms) {
        const agora = Math.floor(ms / 40);
        const salto = r.calmo ? 1 - p : agora !== quadro ? (sorte() - 0.5) * 2 : null;
        if (salto === null) return;
        quadro = agora;
        copias.forEach((copia, i) => {
          copia.position.set(objeto.center.x + (i ? -1 : 1) * salto * largura * 0.06, objeto.center.y);
          copia.alpha = 0.5 * (1 - p);
        });
        if (!faixas) return;
        faixas.clear();
        for (let k = 0; k < 3; k++) {
          const fy = objeto.center.y + (sorte() - 0.5) * altura;
          faixas.beginFill(k % 2 ? COR.ciano : 0xffffff, 0.35 * (1 - p)).drawRect(objeto.center.x - largura / 2 + (sorte() - 0.5) * largura * 0.1, fy, largura, Math.max(2, altura * 0.04)).endFill();
        }
      },
      destruir() { for (const copia of copias) copia.destroy(); faixas?.destroy(); }
    };
  },

  // P11: o retículo que se fecha no alvo e o rótulo curto ("CRÍTICO", "SP −1", "FLATLINE") embaixo dele, na interface.
  hud(passo, r) {
    const objeto = objetoDo(passo.token);
    if (!objeto) return null;
    const cor = passo.estilo === 'defesa' ? COR.ciano : COR.vermelho;
    const g = r.hud.add(new PIXI.Graphics());
    const { PreciseText } = foundry.canvas.containers;
    const s = canvas.dimensions?.uiScale ?? 1;
    const rotulo = r.hud.add(new PreciseText(passo.rotulo ?? '', PreciseText.getTextStyle({ fontSize: 20 * s, fill: cor, stroke: 0x000000, strokeThickness: 4, fontWeight: 'bold' })));
    rotulo.anchor.set(0.5, 0);
    rotulo.position.set(objeto.center.x, objeto.center.y + objeto.h / 2 + 4 * s);
    const duracao = Math.max(500, passo.duracao + 200);
    return {
      duracao,
      atualizar(p, ms) {
        const fechar = Math.min(1, ms / 200);
        const meia = (objeto.w / 2) * (1.6 - 0.5 * fechar), meiaAltura = (objeto.h / 2) * (1.6 - 0.5 * fechar);
        const braco = Math.min(objeto.w, objeto.h) * 0.2;
        const alpha = ms > duracao - 150 ? (duracao - ms) / 150 : 1;
        g.clear();
        g.lineStyle(3 * s, cor, alpha);
        const { x, y } = objeto.center;
        for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
          const cx = x + sx * meia, cy = y + sy * meiaAltura;
          g.moveTo(cx, cy - sy * braco).lineTo(cx, cy).lineTo(cx - sx * braco, cy);
        }
        rotulo.alpha = alpha;
      },
      destruir() { g.destroy(); rotulo.destroy(); }
    };
  },

  // P16: a marca da bala no chão ou na parede: um furo escuro com quatro trincas, que some no fim (4 s).
  marca(passo, r) {
    const { x, y } = passo.para;
    const c = casa();
    const g = r.baixo.add(new PIXI.Graphics());
    g.beginFill(COR.marca, 0.8).drawCircle(0, 0, c * 0.05).endFill();
    g.lineStyle(Math.max(1, c * 0.012), COR.marca, 0.6);
    for (let k = 0; k < 4; k++) {
      const a = rad(k * 90 + r.sorte() * 60);
      g.moveTo(Math.cos(a) * c * 0.04, Math.sin(a) * c * 0.04).lineTo(Math.cos(a) * c * 0.11, Math.sin(a) * c * 0.11);
    }
    g.position.set(x, y);
    const duracao = Math.max(600, passo.duracao);
    return {
      duracao,
      atualizar(_p, ms) { g.alpha = ms > duracao - 600 ? (duracao - ms) / 600 : 1; },
      destruir() { g.destroy(); }
    };
  }
};

// O que voa sem ser bala: a flecha (um risco claro), a faca (girando), a chama (uma bola laranja que cresce), a granada,
// o foguete e o Molotov (uma bola escura com brilho). No arco, sobe e desce no meio do caminho.
const DO_VOADOR = { flecha: [0xe8e6d9, 'risco'], lamina: [0xd8f0ff, 'gira'], chama: [0xff7a1a, 'chama'], granada: [0x3a4a3a, 'bola'], foguete: [0xd0d0d0, 'bola'], molotov: [0x9a5a1a, 'bola'] };
function voador(passo, r, arco) {
  const [cor, forma] = DO_VOADOR[passo.chave?.split('.')[1]] ?? DO_VOADOR.granada;
  const { de, para } = passo;
  if (!de || !para) return null;
  const c = casa();
  const total = Math.hypot(para.x - de.x, para.y - de.y) || 1;
  const angulo = Math.atan2(para.y - de.y, para.x - de.x);
  const altura = arco ? Math.min(total * 0.25, c * 2) : 0;
  const g = r.alto.add(new PIXI.Graphics());
  if (forma === 'risco') g.lineStyle(Math.max(1.5, c * 0.02), cor, 1).moveTo(-c * 0.15, 0).lineTo(c * 0.15, 0);
  else if (forma === 'gira') g.lineStyle(Math.max(2, c * 0.03), cor, 1).moveTo(-c * 0.1, 0).lineTo(c * 0.1, 0);
  else if (forma === 'chama') { g.blendMode = ADD(); g.beginFill(cor, 0.7).drawCircle(0, 0, c * 0.12).endFill(); }
  else g.lineStyle(Math.max(1, c * 0.01), 0xffcf80, 0.8).beginFill(cor, 1).drawCircle(0, 0, c * 0.07).endFill();
  g.rotation = angulo;
  return {
    duracao: Math.max(1, passo.duracao),
    atualizar(p) {
      g.position.set(de.x + (para.x - de.x) * p, de.y + (para.y - de.y) * p - altura * Math.sin(Math.PI * p));
      if (forma === 'gira') g.rotation = angulo + p * Math.PI * 4;
      if (forma === 'chama') g.scale.set(0.6 + p * 1.4);
      g.alpha = p > 0.92 ? (1 - p) / 0.08 : 1;
    },
    destruir() { g.destroy(); }
  };
}

// O anel que se abre e racha em 6 arcos que se afastam (a armadura que segurou); sem rachar, só se abre (a estase).
function anelQueRacha(r, x, y, raio, cor, racha = true) {
  const g = r.alto.add(new PIXI.Graphics());
  g.blendMode = ADD();
  g.position.set(x, y);
  return {
    duracao: 320,
    atualizar(p) {
      g.clear();
      const abre = raio * (0.7 + 0.3 * Math.min(1, p * 2));
      const afasta = racha ? Math.max(0, p - 0.4) * raio * 0.6 : 0;
      for (let k = 0; k < 6; k++) {
        const meio = rad(k * 60 + 30);
        const cx = Math.cos(meio) * afasta, cy = Math.sin(meio) * afasta;
        g.lineStyle(Math.max(1.5, raio * 0.08), cor, 0.9 * (1 - p));
        g.moveTo(cx + Math.cos(rad(k * 60 + 4)) * abre, cy + Math.sin(rad(k * 60 + 4)) * abre);
        g.arc(cx, cy, abre, rad(k * 60 + 4), rad(k * 60 + 56));
      }
    },
    destruir() { g.destroy(); }
  };
}

// O hexágono do escudo balístico entre o atirador e o alvo: acende, recebe o tiro e trinca.
function hexagono(r, x, y, raio, direcao) {
  const g = r.alto.add(new PIXI.Graphics());
  g.blendMode = ADD();
  g.position.set(x, y);
  g.rotation = rad(direcao);
  const pontos = Array.from({ length: 6 }, (_v, k) => [Math.cos(rad(k * 60)) * raio * 0.5, Math.sin(rad(k * 60)) * raio]).flat();
  const trincas = Array.from({ length: 4 }, () => [r.sorte() - 0.5, r.sorte() - 0.5]);
  return {
    duracao: 420,
    atualizar(p) {
      g.clear();
      const a = p < 0.2 ? p / 0.2 : 1 - (p - 0.2) / 0.8;
      g.lineStyle(Math.max(1.5, raio * 0.08), COR.ciano, 0.9 * a).beginFill(COR.ciano, 0.15 * a).drawPolygon(pontos).endFill();
      if (p > 0.25) for (const [tx, ty] of trincas) g.lineStyle(1.5, 0xffffff, 0.8 * a).moveTo(0, 0).lineTo(tx * raio, ty * raio * 2);
    },
    destruir() { g.destroy(); }
  };
}

// ---------------- O roteiro no palco ----------------
// Os passos que o palco desenha; o resto (o som, o texto, e o que é das fases seguintes: a explosão, o golpe, a nuvem)
// fica com os outros tocadores.
export const DESENHA = Object.freeze(Object.keys(PECAS));

function falhou(erro) {
  estado.falhas++;
  if (erro instanceof TypeError || erro instanceof ReferenceError) console.error(`${SISTEMA} | palco`, erro);
}

// As três camadas de um roteiro, criadas no primeiro uso: acima dos tokens e abaixo deles (no primary), e na interface.
function camada(roteiro, nome) {
  const { primary } = foundry.canvas;
  let conteiner;
  if (nome === 'hud') {
    conteiner = canvas.interface.addChild(new PIXI.Container());
  } else {
    conteiner = new primary.PrimaryCanvasContainer();
    conteiner.elevation = roteiro.elevacao;
    conteiner.sortLayer = nome === 'alto' ? foundry.canvas.groups.PrimaryCanvasGroup.SORT_LAYERS.TOKENS : foundry.canvas.groups.PrimaryCanvasGroup.SORT_LAYERS.DRAWINGS;
    conteiner.sort = nome === 'alto' ? 1e9 : -1e9;
    canvas.primary.addChild(conteiner);
  }
  conteiner.name = `${SISTEMA}-efeitos-${nome}`;
  conteiner.eventMode = 'none';
  return conteiner;
}

class Roteiro {
  constructor(evento, passos, { nivel = 'completo', calmo = false } = {}) {
    this.evento = evento;
    this.passos = passos;
    this.nivel = nivel;
    this.calmo = calmo;
    this.proximo = 0;
    this.ativas = [];
    this.camadas = {};
    this.sorte = sorteio(`${evento.id}:${evento.fase}`);
    this.elevacao = Math.max(0, ...passos.map(p => objetoDo(p.token)?.document.elevation).filter(e => Number.isFinite(e)));
    this.inicio = performance.now();
    this.passo = () => this.andar();
    const lugar = nome => ({ add: objeto => { this.camadas[nome] ??= camada(this, nome); return this.camadas[nome].addChild(objeto); }, nivel });
    this.alto = lugar('alto');
    this.baixo = lugar('baixo');
    this.hud = lugar('hud');
    canvas.app.ticker.add(this.passo);
    // A segurança: o roteiro que o ticker não andou (a aba no segundo plano) se encerra sozinho.
    const fim = passos.reduce((maior, p) => Math.max(maior, p.t + Math.max(p.duracao ?? 0, 800)), 0);
    this.seguranca = setTimeout(() => this.encerrar(), fim + 3000);
    estado.vivos.add(this);
    estado.criados++;
    this.andar();
  }

  andar() {
    const agora = performance.now() - this.inicio;
    while (this.proximo < this.passos.length && this.passos[this.proximo].t <= agora) {
      const passo = this.passos[this.proximo++];
      try {
        const peca = PECAS[passo.passo]?.(passo, this);
        if (peca) {
          estado.pecas[passo.passo] = (estado.pecas[passo.passo] ?? 0) + 1;
          this.ativas.push({ peca, t: passo.t });
        }
      } catch (erro) { falhou(erro); }
    }
    this.ativas = this.ativas.filter(({ peca, t }) => {
      const ms = agora - t;
      try {
        peca.atualizar(Math.min(1, ms / peca.duracao), Math.min(ms, peca.duracao));
        if (ms < peca.duracao) return true;
      } catch (erro) { falhou(erro); }
      try { peca.destruir(); } catch (erro) { falhou(erro); }
      return false;
    });
    if (this.proximo >= this.passos.length && !this.ativas.length) this.encerrar();
  }

  encerrar() {
    if (!estado.vivos.has(this)) return;
    estado.vivos.delete(this);
    estado.destruidos++;
    canvas.app?.ticker.remove(this.passo);
    clearTimeout(this.seguranca);
    for (const { peca } of this.ativas) try { peca.destruir(); } catch (erro) { falhou(erro); }
    this.ativas = [];
    for (const conteiner of Object.values(this.camadas)) try { conteiner.destroy({ children: true }); } catch (erro) { falhou(erro); }
    this.camadas = {};
  }
}

// Desenha os passos de um evento neste navegador. passos: os do roteiro que o diretor já filtrou (o nível, a visão);
// nivel e calmo (o reduzido ou o fotossensível: nada pisca). Devolve se algo foi para o palco.
export function desenhar(evento, passos, opcoes = {}) {
  const lista = passos.filter(p => DESENHA.includes(p.passo)).sort((a, b) => a.t - b.t);
  if (!lista.length || !canvas?.ready || !canvas.primary || !canvas.app) return false;
  try {
    new Roteiro(evento, lista, opcoes);
    return true;
  } catch (erro) {
    falhou(erro);
    return false;
  }
}

// Encerra tudo o que está no palco (a cena que fecha).
export function limpar() {
  for (const roteiro of [...estado.vivos]) roteiro.encerrar();
}

export function registrarPalco() {
  Hooks.on('canvasTearDown', limpar);
}

// O que o G4 confere: os roteiros vivos e os já encerrados, as peças desenhadas de cada tipo, as partículas (agora e o
// pico), os nossos contêineres que ainda estão na cena e as falhas.
export const PALCO = {
  get vivos() { return estado.vivos.size; },
  get criados() { return estado.criados; },
  get destruidos() { return estado.destruidos; },
  get particulas() { return estado.particulas; },
  get maiorParticulas() { return estado.maiorParticulas; },
  get pecas() { return { ...estado.pecas }; },
  get falhas() { return estado.falhas; },
  get conteineres() {
    const nossos = filho => String(filho.name ?? '').startsWith(`${SISTEMA}-efeitos-`);
    return (canvas.primary?.children.filter(nossos).length ?? 0) + (canvas.interface?.children.filter(nossos).length ?? 0);
  },
  zerar() { estado.pecas = {}; estado.maiorParticulas = estado.particulas; return true; }
};

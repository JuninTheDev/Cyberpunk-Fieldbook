// Os perigos do ambiente (o C38), só as contas, sem Foundry (o G3 importa no Node). A fonte é a wiki, system-rules.js:555-563
// ("Outras formas de se ferir", p. 180–181): o fogo, o afogamento e a asfixia, a eletrocução, a queda, os venenos, as
// drogas como arma e a radiação. O CORE 0.92.4 não tem nenhum deles (só a munição de veneno). A janela, os cartões e os
// turnos ficam em perigos.mjs.
import { ehBaseNatural } from './regras.mjs';

export const PAGINA_DOS_PERIGOS = 'p. 180–181';
// A perícia da resistência ao veneno e à droga (WILL + Resistir Tortura/Drogas + 1d10) e a da queda (DEX + Atletismo).
export const PERICIA_DO_VENENO = 'resist-torture-drugs';
export const PERICIA_DA_QUEDA = 'athletics';
export const DV_DA_QUEDA = 15;
export const PERNA_QUEBRADA_NA_QUEDA = 'core_critical-injuries-body:broken-leg';
// "Toda lesão causa +5 de dano direto no HP" (a wiki, "Lesões críticas", p. 187): a decisão do usuário vale para a Perna
// Quebrada da queda.
export const BONUS_DA_LESAO = 5;
export const DANO_DA_ELETROCUCAO = '6d6';
// "Cai 40 m por turno; agarrar uma borda: Atletismo DV15": só o lembrete no cartão.
export const LEMBRETE_DA_QUEDA = 'Cai 40 m por turno; agarrar uma borda: Atletismo DV15.';
// Duas cyberpernas anulam a queda até 30 m.
export const QUEDA_DAS_CYBERPERNAS = 30;

// O catálogo: o nome de cada perigo e os níveis, na ordem da janela. Fogo e radiação: o dano no HP por turno; veneno: a
// DV e os dados direto no HP; droga: a DV e o efeito de quem falha.
export const PERIGOS = {
  fogo: {
    nome: 'Fogo', niveis: {
      brando: { rotulo: 'Brando (fogueira)', nome: 'Fogo brando', dano: 2 },
      intenso: { rotulo: 'Intenso (incêndio)', nome: 'Fogo intenso', dano: 4 },
      mortal: { rotulo: 'Mortal (termite)', nome: 'Fogo mortal', dano: 6 }
    }
  },
  afogamento: { nome: 'Afogamento e asfixia', niveis: {} },
  eletrocucao: { nome: 'Eletrocução', niveis: {} },
  queda: { nome: 'Queda', niveis: {}, metros: true },
  veneno: {
    nome: 'Veneno', niveis: {
      brando: { rotulo: 'Brando (DV11, 1d6)', nome: 'Veneno brando', dv: 11, dano: '1d6' },
      intenso: { rotulo: 'Intenso (DV13, 2d6)', nome: 'Veneno intenso', dv: 13, dano: '2d6' },
      mortal: { rotulo: 'Mortal (DV15, 3d6)', nome: 'Veneno mortal', dv: 15, dano: '3d6' }
    }
  },
  droga: {
    nome: 'Droga como arma', niveis: {
      dv11: { rotulo: 'DV11 (álcool)', nome: 'Álcool', dv: 11, efeito: 'embriaguez' },
      dv13: { rotulo: 'DV13 (tiopental)', nome: 'Tiopental', dv: 13, efeito: 'fica sugestionável' },
      dv15: { rotulo: 'DV15 (droga projetada)', nome: 'Droga projetada', dv: 15, efeito: 'o que o criador da droga quis' }
    }
  },
  radiacao: {
    nome: 'Radiação', niveis: {
      baixa: { rotulo: 'Baixa', nome: 'Radiação baixa', dano: 0 },
      alta: { rotulo: 'Alta (como fogo brando)', nome: 'Radiação alta', dano: 2 },
      extrema: { rotulo: 'Extrema (reator vazando; como fogo mortal)', nome: 'Radiação extrema', dano: 6 }
    }
  },
  // A batida de veículo (o C40; a wiki, system-rules.js:538, "Veículos", p. 189–192): os tokens selecionados estão no
  // veículo que bateu; os alvos marcados (T), o que foi atingido (perigos.mjs). As contas ficam em regras-veiculos.mjs.
  batida: { nome: 'Batida de veículo', niveis: {}, batida: true, pagina: 'p. 189–192' }
};

export const nivelDe = (perigo, nivel) => PERIGOS[perigo]?.niveis[nivel] ?? null;
export const niveisDe = perigo => Object.keys(PERIGOS[perigo]?.niveis ?? {});
// O nível que vale: o pedido, se o perigo o tem; senão o primeiro (sem níveis: '').
export const nivelValido = (perigo, nivel) => (nivelDe(perigo, nivel) ? nivel : niveisDe(perigo)[0] ?? '');

// O fogo no fim do turno (brando 2, intenso 4, mortal 6) e a radiação (baixa 0, alta 2, extrema 6), direto no HP.
export const danoDoFogo = nivel => nivelDe('fogo', nivel)?.dano ?? null;
export const danoDaRadiacao = nivel => nivelDe('radiacao', nivel)?.dano ?? null;

// O fogo não acumula: vale o maior. Sem fogo: "novo"; o novo maior que o atual: "trocar" (o novo toma o lugar); igual ou
// menor: "manter" (só a nota "já em chamas"). Vale também para a radiação.
export function fogoQueVale(atual, novo) {
  if (atual === null || atual === undefined) return 'novo';
  return Number(novo) > Number(atual) ? 'trocar' : 'manter';
}

// No RED, passar num teste é superar a DV.
export const superou = (total, dv) => Number(total) > Number(dv);

// O veneno: a DV e os dados direto no HP de quem falha. A droga: a DV e o efeito.
export const venenoDe = nivel => {
  const n = nivelDe('veneno', nivel);
  return n ? { dv: n.dv, dano: n.dano } : null;
};
export const drogaDe = nivel => {
  const n = nivelDe('droga', nivel);
  return n ? { dv: n.dv, efeito: n.efeito } : null;
};

// As cyberpernas que contam na queda: as fundações instaladas do encaixe cyberLeg, menos a base do membro natural (a Meat
// Leg do CORE). Cada item: { tipo, fundacional, instalado, catalogo, nome }.
export const contarCyberpernas = itens => itens.filter(item => item.tipo === 'cyberLeg' && item.fundacional && item.instalado
  && item.catalogo !== 'core_cyberware:meat-leg' && !ehBaseNatural({ nome: item.nome ?? '' })).length;

// A queda pelos metros: menos de 10 m, nada; duas cyberpernas e até 30 m, nada (nem dano, nem teste); senão 2d6 a cada
// 10 m (a armadura absorve) e o Atletismo DV15 contra a Perna Quebrada.
export function quedaDe(metros, cyberpernas = 0) {
  const m = Math.max(0, Number(metros) || 0);
  if (m < 10) return { motivo: 'baixa', dados: 0, formula: null, teste: false };
  if (cyberpernas >= 2 && m <= QUEDA_DAS_CYBERPERNAS) return { motivo: 'cyberpernas', dados: 0, formula: null, teste: false };
  const dados = Math.floor(m / 10) * 2;
  return { motivo: null, dados, formula: `${dados}d6`, teste: true };
}

// Os minutos que segura o fôlego: o BODY.
export const folegoEmMinutos = body => Math.max(0, Number(body) || 0);

// Os argumentos do /perigo ("/perigo fogo intenso", "/perigo queda 25", "/perigo veneno mortal", "/perigo batida"): o perigo, o nível
// e os metros que a janela já traz. Sem o comando: null. Um perigo que não existe fica vazio (a janela abre no primeiro).
const NOMES = {
  fogo: 'fogo', incendio: 'fogo', afogamento: 'afogamento', asfixia: 'afogamento', afogar: 'afogamento', eletrocucao: 'eletrocucao',
  choque: 'eletrocucao', queda: 'queda', cair: 'queda', veneno: 'veneno', droga: 'droga', radiacao: 'radiacao',
  batida: 'batida', colisao: 'batida'
};
const semAcento = texto => String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export function lerComandoPerigo(mensagem) {
  const partes = semAcento(mensagem).trim().split(/\s+/);
  if (partes[0] !== '/perigo') return null;
  const perigo = NOMES[partes[1]] ?? '';
  const resto = partes.slice(2);
  const numero = resto.map(p => /^(\d+(?:[.,]\d+)?)m?$/.exec(p)).find(Boolean);
  let nivel = '';
  for (const p of resto) {
    const candidato = perigo === 'droga' && /^(dv)?(11|13|15)$/.test(p) ? `dv${p.replace(/^dv/, '')}` : p;
    if (nivelDe(perigo, candidato)) { nivel = candidato; break; }
  }
  return { perigo, nivel, metros: perigo === 'queda' && numero ? Number(numero[1].replace(',', '.')) : null };
}

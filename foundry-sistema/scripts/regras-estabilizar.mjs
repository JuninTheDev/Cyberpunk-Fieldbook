// Estabilizar e a cura natural, a conta (o C36; a wiki, system-rules.js:552, "Estabilização e cura natural", p. 222–223;
// a coluna "Estabilizar" dos estados de ferimento, :208-212; o Death Save, :215; "Quem cura o quê", :553; o catálogo,
// system-catalog.js:74, :88 e :89). O CORE 0.92.4 não tem nenhum dos dois. Sem Foundry: o teste do G3 importa este
// arquivo; o resto está em estabilizar.mjs.
import { spComVariacao } from './regras-armadura.mjs';
import { PERICIAS_DO_TRATAMENTO } from './tratamento.mjs';

// A DV pelo estado de ferimento (regras.estadoDeFerimento): levemente 10, gravemente 13, mortalmente 15. Ileso não tem o
// que estabilizar.
export const DV_DE_ESTABILIZAR = { leve: 10, grave: 13, mortal: 15 };
export const dvDeEstabilizar = ferimento => DV_DE_ESTABILIZAR[ferimento] ?? null;

// As perícias que estabilizam (:553): Primeiros Socorros e Paramédico, as do tratamento; a Cybertecnologia não estabiliza,
// e a Cirurgia só trata.
export const PERICIAS_DE_ESTABILIZAR = ['primeirosSocorros', 'paramedico'].map(chave => ({ chave, ...PERICIAS_DO_TRATAMENTO[chave] }));

// O teste (TECH + a perícia + 1d10) precisa superar a DV: o empate falha (p. 128, como o tratamento). Passando, o
// mortalmente ferido volta a 1 HP, fica inconsciente por 1 minuto e o Death Save volta ao de base (:215: "até alguém
// estabilizar o personagem de volta a 1 HP"); os outros ficam com o HP que têm.
export function resultadoDeEstabilizar({ ferimento, total, hp }) {
  const dv = dvDeEstabilizar(ferimento);
  if (!dv) return null;
  if (!(Number(total) > dv)) return { dv, passou: false, hp };
  const mortal = ferimento === 'mortal';
  return { dv, passou: true, hp: mortal ? 1 : hp, inconsciente: mortal, zerarDeathSave: mortal };
}

// O descanso: por dia inteiro, o estabilizado recupera HP igual ao BODY (:552); com o Reinforced Antibodies instalado, o
// BODY × 2 (system-catalog.js:74). Nunca acima do máximo (o C31), e o HP não desce. Os dias são inteiros, de 1 para cima.
export function curaNatural({ dias, body, hp, max, anticorpos = false }) {
  if (!Number.isSafeInteger(dias) || dias < 1) return null;
  const porDia = Number(body) * (anticorpos ? 2 : 1);
  const antes = Number(hp);
  const depois = Math.max(antes, Math.min(Number(max), antes + porDia * dias));
  return { dias, porDia, antes, depois, recuperado: depois - antes };
}

// O Skin Weave e o Subdermal Armor recuperam 1 SP por dia de cura natural (system-catalog.js:88-89), em cada local, até o
// máximo. O SP fica no item de armadura do implante, como no CORE (o README, a armadura do C18).
export const spDepoisDoDescanso = (sp, dias) => Math.max(Number(sp.value), spComVariacao(sp, Number(dias)));

// Os implantes, pelo id do catálogo ou pelo nome. O Reinforced Antibodies da wiki é o Enhanced Antibodies do CORE
// (core_cyberware:enhanced-antibodies; a loja da wiki, loja-catalogo.js, o chama de "Anticorpos reforçados", com o texto
// do catálogo). O Skin Weave e o Subdermal Armor: o cyberware e o item de armadura dele têm o mesmo nome e o mesmo id.
export const ehAnticorpos = (nome, catalogo = '') => catalogo === 'core_cyberware:enhanced-antibodies'
  || /^((enhanced|reinforced) antibodies|anticorpos reforçados)$/i.test(String(nome).trim());
export function implanteDeSp(nome, catalogo = '') {
  const doCatalogo = /^core_(cyberware|armor):(skin-weave|subdermal-armor)$/.exec(catalogo)?.[2];
  if (doCatalogo) return doCatalogo;
  const texto = String(nome).trim();
  return /^skin weave$/i.test(texto) ? 'skin-weave' : /^subdermal armou?r$/i.test(texto) ? 'subdermal-armor' : null;
}

// O que a ficha mostra, junto do ferimento (a aba Combate do personagem, a página do capanga): a marca e, para quem edita a
// ficha, "Estabilizar" (ferido e sem a marca) e "Descansar" (ferido ou estabilizado: sem a marca, o descanso recusa).
export function curaNaFicha({ ferimento, estabilizado = false, editavel = false }) {
  const ferido = Boolean(dvDeEstabilizar(ferimento));
  return { mostrar: ferido || estabilizado, estabilizado, estabilizar: editavel && ferido && !estabilizado, descansar: editavel && (ferido || estabilizado) };
}

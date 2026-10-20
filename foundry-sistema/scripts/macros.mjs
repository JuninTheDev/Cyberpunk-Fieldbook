// A barra de macros e os favoritos (o C20; o hotbarDrop e o CPRMacro do CORE 0.92.4, e o "favorite" dos itens e das
// perícias do CORE). Arrastar da ficha para a barra, como no CORE: a arma vira a macro do ataque (o modo se escolhe no
// texto da macro: o ataque, o dano, o mirado, o autofogo, o supressivo e os modos de 2077 da arma), a perícia vira a macro
// do teste e o outro item, a que abre e fecha a ficha dele. A macro rola com o token controlado ou, sem nenhum, com o
// personagem do jogador, e acha a arma pelo nome, como no CORE: a mesma macro serve a quem tiver uma arma com esse nome.
// Os favoritos: a estrela da perícia (a mesma do Painel Tático) e a do item juntam os dois no painel Favoritos da aba
// Combate; a perícia favorita sem nível fica também na lista curta do painel geral, como o item preso do CORE fica
// visível na categoria fechada.
import { SISTEMA } from './config.mjs';
import { config } from './configuracoes.mjs';

// As perícias favoritas ficam numa flag do ator (as perícias daqui não são itens, como no CORE); o item, na dele.
export const FLAG_FAVORITAS = 'periciasFavoritas';
export const FLAG_FAVORITO = 'favorito';
// O que se arrasta da linha da perícia: o tipo e a perícia (a barra o recebe pelo gancho hotbarDrop).
export const ARRASTO_DA_PERICIA = 'PericiaCPR';
// A imagem da macro da perícia (o chip-skill do CORE não existe aqui).
export const IMAGEM_DA_PERICIA = 'icons/svg/d10-grey.svg';
const TIPOS_COM_PERICIA = ['personagem', 'capanga'];

// ---------------- As contas (o teste roda estas no Node) ----------------
// Os modos da macro da arma: o ataque, o mirado e o dano sempre; o autofogo e o supressivo das armas que têm; os de 2077
// da arma (combate.acoesDe2077: o ricochete, os dois canos).
export function modosDaMacro({ autofogo = 0, supressivo = false, modos2077 = [] } = {}) {
  return ['ataque', 'mirado', ...(autofogo ? ['autofogo'] : []), ...(supressivo ? ['supressivo'] : []), ...modos2077.map(m => m.modo), 'dano'];
}

// O que cada modo faz, para o texto da macro.
const DESCRICAO_DOS_MODOS = {
  ataque: 'o tiro ou o golpe, nos alvos marcados (T)',
  mirado: 'o tiro mirado (−8): pergunta o local (cabeça, perna ou item na mão)',
  autofogo: 'o autofogo da arma',
  supressivo: 'o fogo supressivo da arma',
  dano: 'só rola o dano'
};

// O texto da macro (o "command"), como o do CORE: as escolhas no alto, com os comentários, e a chamada embaixo. O nome vai
// entre aspas pelo JSON (as aspas e a barra invertida escapadas).
// arma: { tipo: 'arma', nome, modos: os de modosDaMacro, modos2077: [{ modo, rotulo }] }; perícia: { tipo: 'pericia', pericia }.
export function comandoDaMacro({ tipo, nome = '', pericia = '', modos = [], modos2077 = [] }) {
  const linhas = [
    '// A janela de rolagem: troque para true para rolar direto, sem ela (como o Ctrl + clique na ficha).',
    'const pularJanela = false;'
  ];
  if (tipo === 'pericia') {
    linhas.push('', '// Daqui para baixo, não mude.', `await game.system.api.macros.rolarPericia(${JSON.stringify(pericia)}, { pularJanela });`);
    return linhas.join('\n');
  }
  const descricao = modo => DESCRICAO_DOS_MODOS[modo] ?? `${modos2077.find(m => m.modo === modo)?.rotulo ?? modo} (2077)`;
  linhas.push(
    '',
    '// O que a macro faz com a arma. Troque "ataque" por um destes:',
    ...modos.map(modo => `//   "${modo}": ${descricao(modo)};`),
    'const modo = "ataque";',
    '',
    '// Daqui para baixo, não mude.',
    `await game.system.api.macros.usarArma(${JSON.stringify(nome)}, { pularJanela, modo });`
  );
  return linhas.join('\n');
}

// A janela na macro: a mesma do clique na ficha (o "Rolar direto" deste navegador inverte); pularJanela rola direto.
export const perguntarNaMacro = ({ pularJanela = false, rolarDireto = false } = {}) => !pularJanela && !rolarDireto;

// Põe ou tira um id da lista (a estrela).
export const alternarNaLista = (lista, id) => (lista.includes(id) ? lista.filter(item => item !== id) : [...lista, id]);

// As linhas da lista curta do painel geral: as perícias com nível (já na ordem) e, depois, as favoritas sem nível, pelo
// nome.
export const listaCurta = (comNivel, todas) => [...comNivel, ...todas.filter(p => p.favorita && !p.nivel).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))];

// ---------------- No Foundry ----------------
// O ator da macro: o do token controlado ou, sem nenhum, o personagem do jogador (o ChatMessage.getSpeaker do CORE).
function atorDaMacro() {
  return ChatMessage.getSpeakerActor(ChatMessage.getSpeaker());
}
const semAtor = () => ui.notifications.warn('Macro: selecione o token de um personagem (ou tenha um personagem seu).');

// A macro da arma: o ator usa a arma com esse nome, no modo escolhido.
export async function usarArma(nome, { pularJanela = false, modo = 'ataque' } = {}) {
  const ator = atorDaMacro();
  if (!ator) return semAtor();
  const arma = ator.items.find(item => item.type === 'arma' && item.name === nome);
  if (!arma) return ui.notifications.warn(`[${ator.name}] Não tem a arma: ${nome}`);
  if (!modosDaMacro(dadosDosModos(arma)).includes(modo)) return ui.notifications.warn(`[${ator.name}] ${nome}: o modo "${modo}" não existe nesta arma.`);
  const perguntar = perguntarNaMacro({ pularJanela, rolarDireto: config('rolarDireto') });
  if (modo === 'dano') return arma.rolarDano({ perguntar });
  if (modo === 'mirado') {
    const local = await perguntarLocalMirado(arma);
    return local ? arma.atacar({ local, perguntar }) : null;
  }
  return arma.atacar({ modo: modo === 'ataque' ? null : modo, perguntar });
}

// A macro da perícia: o ator rola a perícia.
export async function rolarPericia(id, { pularJanela = false } = {}) {
  const ator = atorDaMacro();
  if (!ator) return semAtor();
  if (!TIPOS_COM_PERICIA.includes(ator.type)) return ui.notifications.warn(`[${ator.name}] Não tem perícias.`);
  return ator.rolarPericia(id, { perguntar: perguntarNaMacro({ pularJanela, rolarDireto: config('rolarDireto') }) });
}

// Onde mirar (a ficha e a macro): cabeça, perna ou item na mão. Fechada, null.
export function perguntarLocalMirado(item) {
  return foundry.applications.api.DialogV2.wait({
    window: { title: `Mirar com ${item.name}` }, classes: [SISTEMA, 'mirar'], rejectClose: false,
    content: '<p>Onde mirar? O ataque leva −8.</p><ul><li><b>Cabeça:</b> o dano que passa da armadura dobra.</li><li><b>Perna:</b> se passar dano, Perna quebrada.</li><li><b>Item na mão:</b> se passar dano, o alvo larga o item.</li></ul>',
    buttons: [{ action: 'cabeca', label: 'Cabeça', default: true }, { action: 'perna', label: 'Perna' }, { action: 'item', label: 'Item na mão' }]
  });
}

const dadosDosModos = arma => ({ autofogo: arma.system.autofogo, supressivo: arma.system.supressivo, modos2077: arma.actor ? game.system.api.combate.acoesDe2077(arma).modos : [] });

// O que se arrasta da linha da perícia (a ficha, _onDragStart).
export const arrastoDaPericia = (ator, pericia) => ({ type: ARRASTO_DA_PERICIA, pericia, actorUuid: ator.uuid });

// O gancho hotbarDrop: a perícia e o item viram a macro do sistema (as outras coisas seguem o caminho do Foundry). Devolve
// false para o Foundry não criar a dele.
export function aoSoltarNaBarra(barra, dados, vaga) {
  let macro = null;
  if (dados?.type === ARRASTO_DA_PERICIA) macro = macroDaPericia(dados);
  else if (dados?.type === 'Item') macro = macroDoItem(fromUuidSync(dados.uuid));
  if (!macro) return true;
  criarOuReusar(macro).then(feita => game.user.assignHotbarMacro(feita, vaga)).catch(erro => console.error(`${SISTEMA} | macro na barra`, erro));
  return false;
}

// O nome leva o do usuário, como no CORE: a mesma arma de dois jogadores não vira uma macro só.
const nomeDaMacro = nome => `${game.user.name} - ${nome}`;

function macroDaPericia({ pericia, actorUuid }) {
  const ator = fromUuidSync(actorUuid);
  if (!pericia || !ator?.system?.pericia) return null;
  return { name: nomeDaMacro(ator.system.pericia(pericia).nome), type: 'script', img: IMAGEM_DA_PERICIA, command: comandoDaMacro({ tipo: 'pericia', pericia }) };
}

function macroDoItem(item) {
  if (!item) return null;
  if (item.type !== 'arma') return { name: nomeDaMacro(item.name), type: 'script', img: item.img, command: `await foundry.applications.ui.Hotbar.toggleDocumentSheet(${JSON.stringify(item.uuid)});` };
  const dados = dadosDosModos(item);
  return { name: nomeDaMacro(item.name), type: 'script', img: item.img, command: comandoDaMacro({ tipo: 'arma', nome: item.name, modos: modosDaMacro(dados), modos2077: dados.modos2077 }) };
}

// A macro igual (o nome e o texto) que o usuário já tem vai de novo para a barra, sem criar outra.
async function criarOuReusar(dados) {
  return game.macros.find(m => m.name === dados.name && m.command === dados.command && m.isOwner) ?? CONFIG.Macro.documentClass.create(dados, { displaySheet: false });
}

// As estrelas: a da perícia (a lista na flag do ator, que o Painel Tático também usa) e a do item.
export function alternarPericiaFavorita(ator, id) {
  return ator.setFlag(SISTEMA, FLAG_FAVORITAS, alternarNaLista(ator.getFlag(SISTEMA, FLAG_FAVORITAS) ?? [], id));
}
export function alternarItemFavorito(item) {
  return item.setFlag(SISTEMA, FLAG_FAVORITO, !item.getFlag(SISTEMA, FLAG_FAVORITO));
}

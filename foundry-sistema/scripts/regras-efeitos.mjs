// A aba Efeitos da ficha do personagem (o C34, parte 1): a conta de cada linha, sem o Foundry. Os três grupos são os do
// CORE (cpr-actor-sheet.js:213-306, prepareActiveEffectCategories: os que valem, os situacionais e os inativos); o estado
// segue a regra deste sistema (dados.mjs, DadosEfeito: o item fora do uso, o situacional, o scanner que não acumula), e
// quem liga e desliga, a da ficha do item.
import { ATIVACOES } from './config.mjs';

// Os efeitos que se ligam à mão: os da droga e os do equipamento de ativação manual (o botão da ficha do item).
export const ligaAMao = item => item.type === 'droga' || (item.type === 'equipamento' && item.system?.ativacao === 'manual');

// As mudanças de um efeito numa linha: a chave sem o "system.", o "+" da soma (ou o modo) e o valor.
export const resumoDasMudancas = mudancas => mudancas.map(c => `${c.key.replace(/^system\./, '')} ${c.type === 'add' ? '+' : c.type} ${c.value}`).join(' · ');

// O uso que liga o efeito de um item (o "usage" do CORE ao lado da origem, cpr-effects.hbs:54-60), pela regra do
// DadosEfeito.foraDeUso (dados.mjs): o cyberware instalado, a arma equipada, a armadura vestida, o programa ativo num deck,
// o equipamento pela ativação dele; a droga e o equipamento manual, ligado à mão; o resto vale sempre.
export function usoQueLiga(item) {
  if (item.type === 'cyberware') return 'instalado';
  if (item.type === 'arma') return 'equipada';
  if (item.type === 'armadura') return 'vestida';
  if (item.type === 'programa') return 'ativo num deck';
  if (ligaAMao(item)) return ATIVACOES.manual.toLowerCase();
  if (item.type === 'equipamento' && ATIVACOES[item.system?.ativacao]) return ATIVACOES[item.system.ativacao].toLowerCase();
  return 'sempre';
}

// O estado do efeito agora, na ordem em que o sistema decide: desligado; fora do uso que o liga (ou o item inoperante,
// pelo EMP); situacional (não soma sozinho: a janela de rolagem o oferece, ligado ou não por padrão; documentos.mjs,
// #efeitosSituacionais); vencido (a duração acabou); suprimido (o sistema o tira: o scanner que não acumula com outro do
// mesmo tipo); e o que vale. O grupo é o do CORE: "valendo" (os permanentes), "situacional" ou "parado" (os inativos).
export function estadoDoEfeito({ desligado = false, foraDeUso = false, inoperante = false, uso = '', situacional = false, ligadoPorPadrao = false, vencido = false, suprimido = false } = {}) {
  if (desligado) return { grupo: 'parado', chave: 'desligado', rotulo: 'DESLIGADO' };
  if (foraDeUso) return { grupo: 'parado', chave: 'fora-de-uso', rotulo: inoperante ? 'INOPERANTE (EMP)' : `FORA DE USO: VALE ${uso.toUpperCase()}` };
  if (situacional) return { grupo: 'situacional', chave: 'situacional', rotulo: `SITUACIONAL: ${ligadoPorPadrao ? 'LIGADO' : 'DESLIGADO'} NA JANELA` };
  if (vencido) return { grupo: 'parado', chave: 'vencido', rotulo: 'VENCIDO' };
  if (suprimido) return { grupo: 'parado', chave: 'suprimido', rotulo: 'SUPRIMIDO' };
  return { grupo: 'valendo', chave: 'valendo', rotulo: 'VALENDO' };
}

// Os botões de cada linha: ligar e desligar o efeito do próprio personagem (a primeira condição do cprShowEffectToggle do
// CORE, register-helpers.js:1035-1040) e o do item que se liga à mão (a regra da ficha do item, o alternarEfeito: os
// outros valem pelo uso do item); apagar, só o do personagem (cpr-effects.hbs:74-85: o apagar só aparece no efeito do
// próprio ator; o do item sai com ele). Editar (a ficha do efeito), todos.
export const controlesDoEfeito = ({ proprio = false, item = null } = {}) => ({ ligar: proprio || Boolean(item && ligaAMao(item)), apagar: proprio });

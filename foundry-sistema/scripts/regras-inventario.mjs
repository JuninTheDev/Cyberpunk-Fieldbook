// Wiki, Equipamento: Medscanner e Techscanner dão +2 e não acumulam com outro do mesmo tipo.
// O catálogo identifica também o scanner instalado num cyberbraço, mesmo que alguém o renomeie.
import { EMPILHAVEIS, parteValida } from './regras.mjs';

// CORE 0.92.4, CPRActorSheet._splitItem: duas pilhas, com uma parte entre 1 e total - 1.
// A quantidade é de unidades (balas ou doses), mesmo quando o preço é por lote.
export function divisaoDaPilha(tipo, total, parte) {
  if (!EMPILHAVEIS.includes(tipo) || !Number.isSafeInteger(total) || !Number.isSafeInteger(parte) || !parteValida(parte, total)) return null;
  return { restante: total - parte, nova: parte };
}

// CORE, CPRActor.automaticallyStackItems. Decisão do usuário no C17: reproduzir literalmente, inclusive a condição
// invertida dos upgrades: equipamento/roupa só juntam se a pilha encontrada já tem upgrades. Outros dados não entram.
export function mesmaPilha(origem, destino) {
  return EMPILHAVEIS.includes(origem.type) && origem.type === destino.type && origem.name === destino.name
    && (!['equipamento', 'roupa'].includes(origem.type) || destino.upgrades > 0);
}

export function tipoDeScanner({ name = '', catalogo = '', type }) {
  if (!['equipamento', 'cyberware'].includes(type)) return null;
  const id = catalogo ? catalogo.match(/^core_(?:gear|cyberware):(medscanner|techscanner)$/)?.[1] : name.toLowerCase();
  return ['medscanner', 'techscanner'].includes(id) ? id : null;
}

// Uma origem estável entre as ativas: desligar ou guardar a primeira deixa a segunda valer imediatamente.
export function scannerPreferido(candidatos, tipo) {
  return candidatos.filter(c => c.tipo === tipo && c.ativo).map(c => c.id).sort()[0] ?? null;
}

// Wiki, Equipamento; alcance de 100 m confirmado pelo usuário no C16. O flare é de uso único e dura uma hora.
export const LUZES = { flashlight: { alcance: 100 }, 'road-flare': { alcance: 100, segundos: 3600, descartavel: true } };
export function luzDoItem({ name = '', catalogo = '', type }) {
  if (type !== 'equipamento') return null;
  const id = catalogo ? catalogo.match(/^core_gear:(flashlight|road-flare)$/)?.[1] : { Flashlight: 'flashlight', 'Road Flare': 'road-flare' }[name];
  return LUZES[id] ?? null;
}
export const efeitoDaLuz = (nome, alcance) => ({ name: nome, type: 'base', transfer: true, disabled: true,
  system: { changes: [{ key: 'token.light.bright', type: 'upgrade', value: String(alcance), phase: 'initial', priority: null }] } });

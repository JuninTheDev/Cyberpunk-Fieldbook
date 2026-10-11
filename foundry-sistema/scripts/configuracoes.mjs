// Configurações do mundo (Configurações → Sistema), as mesmas do Fluxo de Combate, com os mesmos padrões da mesa.
import { SISTEMA } from './config.mjs';

export const config = chave => game.settings.get(SISTEMA, chave);

export function registrarConfiguracoes() {
  const registrar = (chave, dados) => game.settings.register(SISTEMA, chave, { config: true, scope: 'world', ...dados });
  registrar('exigeRef8', { name: 'Esquivar de tiros exige REF 8+', hint: 'Regra do livro (p. 172). Desligado, todo mundo pode trocar a DV pela Evasão. No corpo a corpo, qualquer um esquiva.', type: Boolean, default: true });
  registrar('jogadorRolaDano', { name: 'Quem atacou rola o dano', hint: 'O jogador que atacou rola o dano no computador dele (os dados aparecem para ele). Desligado, ou sem resposta, o mestre rola.', type: Boolean, default: true });
  registrar('tempo', {
    name: 'Tempo para o jogador responder (segundos)', hint: 'Passou disso, a janela fecha: o alvo aguenta (ou o mestre rola por ele). Depois de 8 s, o mestre ganha um cartão para responder por ele.',
    type: Number, default: 60, range: { min: 10, max: 300, step: 5 }
  });
  registrar('defesaDosNpcs', {
    name: 'Defesa dos NPCs', hint: 'Quando um NPC pode escolher (esquivar, aguentar, escudo): o mestre escolhe numa janela (vendo o total do ataque), ou o sistema escolhe pela esquiva média contra a DV.',
    type: String, default: 'mestre', choices: { mestre: 'O mestre escolhe', automatica: 'Automática' }
  });
  registrar('lesaoCritica', {
    name: 'Lesão crítica', hint: 'Dois ou mais 6 no dano: rola na tabela (cabeça só em tiro mirado na cabeça), sem repetir uma que o alvo já tem. Tiro mirado na perna que passa da armadura dá Perna quebrada.',
    type: String, default: 'ficha', choices: { ficha: 'Na ficha', anunciar: 'Só anunciar', nao: 'Desligada' }
  });
  registrar('mortalmenteFerido', { name: 'Mortalmente ferido sofre lesão a cada acerto', hint: 'Quem já está com HP abaixo de 1 ganha uma lesão crítica a cada ataque que o atinge.', type: Boolean, default: true });
  registrar('deathSave', {
    name: 'Death Save no começo do turno', hint: 'No combate, quem está mortalmente ferido rola o Death Save no começo do turno. Falhou: fica morto (status e combatente derrotado).',
    type: String, default: 'todos', choices: { todos: 'Jogadores e NPCs', jogadores: 'Só os jogadores', nao: 'Desligado' }
  });
  registrar('area', { name: 'Explosivos pegam toda a área', hint: 'Granadas e foguetes que acertam pegam todos os tokens na área de 10 × 10 m em volta do alvo, não só os marcados.', type: Boolean, default: true });
  registrar('supressao', { name: 'Fogo supressivo sem alvo pega todos à vista', hint: 'Sem alvo marcado, o fogo supressivo pega todos a até 25 m e sem parede no meio. Com alvos marcados, só eles.', type: Boolean, default: true });
}

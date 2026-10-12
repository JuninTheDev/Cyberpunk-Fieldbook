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
  // Armas de 2077 (as do cpr-2077 do Foundry 12, com os mesmos padrões).
  registrar('smartAtaque', {
    name: 'Ataque das armas Smart (2077)', hint: 'O suplemento diz que o ataque Smart é 10 + 1d10 (12 + 1d10 com várias balas), mas não diz se troca REF + perícia ou se é uma opção: a wiki manda combinar com a mesa. Substitui: o tiro da arma Smart é sempre o teste Smart (o autofogo e o mirado continuam REF + perícia). Alternativa: a arma ganha o botão "Smart", e o "Atacar" continua REF + perícia.',
    type: String, default: 'substitui', choices: { substitui: 'Substitui REF + perícia', alternativa: 'É uma alternativa (botão "Smart")' }
  });
  registrar('smartSemLink', {
    name: 'Arma Smart sem o Smart Link (2077)', hint: 'As armas Smart só funcionam com o cyberware Smart Link (suplemento p. 30). Sem ele: a arma não dispara, ou dispara como arma comum (REF + perícia, sem o teste Smart).',
    type: String, default: 'naoDispara', choices: { naoDispara: 'Não dispara', comum: 'Dispara como arma comum' }
  });
  registrar('cargaEsfria', { name: 'A carga Tech esfria uma rodada (2077)', hint: 'No combate, depois de uma carga (tiro ou rajada), a arma Tech só carrega de novo duas rodadas depois. Fora do combate, não conta.', type: Boolean, default: true });
  // Deste navegador, como o "invertRollCtrlFunction" do CORE.
  game.settings.register(SISTEMA, 'rolarDireto', {
    name: 'Rolar direto, sem a janela de rolagem', hint: 'Só neste navegador. Desligado (o padrão, como no CORE), o clique no atributo ou na perícia abre a janela de rolagem, e Ctrl + clique rola direto. Ligado, é o contrário. O teste direto usa a Sorte preparada na ficha e os situacionais ligados por padrão.',
    scope: 'client', config: true, type: Boolean, default: false
  });
}

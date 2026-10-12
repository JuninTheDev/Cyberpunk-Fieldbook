// Roles opcionais do suplemento de fã de 2077 (p. 2–6). Nos anos 2070 do Mission Kit valem as 10 Roles do RED (com os
// ajustes do Kit, que são de compra de itens e de quickhack, sem mudar o item de Role), e o Face e o Corpo do
// suplemento saíram. Fica o Lawman com Investigator no lugar de Backup, para a mesa que quiser.
import { SUPPLEMENT, coreDoc, itemFrom, para } from './lib.mjs';

const text = (...parts) => parts.map(part => para(part)).join('');

export function buildRoles() {
  // Lawman do suplemento de fã: Investigator no lugar de Backup. O bônus de caso é situacional (só com pista de caso ativo).
  const lawman = itemFrom(coreDoc('core_roles', 'Lawman'), {
    seed: 'role:lawman-2077', name: 'Lawman (Investigator, suplemento de fã)',
    system: {
      rank: 4, mainRoleAbility: 'Investigator', hasRoll: false, isSituational: true, onByDefault: false,
      bonuses: [{ name: 'Education' }, { name: 'Perception' }],
      source: { book: SUPPLEMENT, page: 6 },
      description: { value: text(
        '<b>Opcional, do suplemento de fã de 2077.</b> No Mission Kit, o Lawman é o do RED (Backup), e consegue os itens Caros do trabalho a partir do Rank 4.',
        '<b>Investigator</b> (suplemento p. 6), no lugar de Backup.',
        '<b>Casos ativos:</b> 1 no Rank 1, 2 no Rank 4 e 3 no Rank 7. Trocar de caso leva cerca de um dia de tempo livre.',
        '<b>Bônus de caso:</b> soma o Rank em Educação e Percepção quando lida com uma pista de um caso ativo (se não tiver relação, o mestre avisa). Vale por sessão até o Rank. Marque o bônus na janela de rolagem.'
      ) }
    }
  });
  return [lawman];
}

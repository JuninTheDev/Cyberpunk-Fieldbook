// Roles de 2077 que o sistema não tem (suplemento p. 2–6): Face, Corpo e o Lawman com Investigator.
// Feitas a partir dos itens de Role do RED. As especializações viram bônus de perícia na importação da wiki.
import { SUPPLEMENT, clone, coreDoc, itemFrom, para } from './lib.mjs';

const text = (...parts) => parts.map(part => para(part)).join('');

export function buildRoles() {
  const face = itemFrom(coreDoc('core_roles', 'Rockerboy'), {
    seed: 'role:face', name: 'Face',
    system: {
      rank: 4, mainRoleAbility: 'Charismatic Impact', hasRoll: true, bonuses: [],
      source: { book: SUPPLEMENT, page: 3 },
      description: { value: text(
        '<b>Face</b> (suplemento p. 3–4): o representante persuasivo, que substitui o Rockerboy. <b>Impacto Carismático:</b> Rank + 1d10 contra DV 8 (uma pessoa), 10 (grupo de até 6) ou 12 (grupo enorme). O Rank limita quem você influencia e o tamanho do favor.',
        '<b>Especializações:</b> Siren soma o Rank em Conversação e Cuidados Pessoais; Rockerboy, em Tocar Instrumento e Manha; Model, em Atuação e Comércio. A escolhida aparece nos bônus desta Role.'
      ) }
    }
  });

  // Corpo = Teamwork do Exec + Operator do Fixer (com o Haggle, que rola).
  const fixer = coreDoc('core_roles', 'Fixer');
  const corpo = itemFrom(coreDoc('core_roles', 'Exec'), {
    seed: 'role:corpo', name: 'Corpo',
    system: {
      rank: 4, mainRoleAbility: 'Teamwork', abilities: clone(fixer.system.abilities),
      source: { book: SUPPLEMENT, page: 5 },
      description: { value: text(
        '<b>Corpo</b> (suplemento p. 5–6): junta o Exec e o Fixer do RED.',
        '<b>Teamwork:</b> Signing Bonus, Corporate Housing e Corporate Health Insurance como no Exec. <b>Team Members foi removido:</b> os colegas da corporação ajudam enquanto ninguém pisar na bola.',
        '<b>Operator:</b> Contacts e Haggle como no Fixer. Reach igual, menos para montar Night Markets (só junto com fixers); o Corpo não agencia trabalhos. <b>Grease:</b> um grupo nos Ranks 1, 4 e 7 (Corpos, Gangues, Edgerunners, Mercadores, Nômades ou Netrunners).'
      ) }
    }
  });

  // Lawman de 2077: Investigator no lugar de Backup. O bônus de caso é situacional (só com pista de caso ativo).
  const lawman = itemFrom(coreDoc('core_roles', 'Lawman'), {
    seed: 'role:lawman-2077', name: 'Lawman (2077)',
    system: {
      rank: 4, mainRoleAbility: 'Investigator', hasRoll: false, isSituational: true, onByDefault: false,
      bonuses: [{ name: 'Education' }, { name: 'Perception' }],
      source: { book: SUPPLEMENT, page: 6 },
      description: { value: text(
        '<b>Investigator</b> (suplemento p. 6), no lugar de Backup.',
        '<b>Casos ativos:</b> 1 no Rank 1, 2 no Rank 4 e 3 no Rank 7. Trocar de caso leva cerca de um dia de tempo livre.',
        '<b>Bônus de caso:</b> soma o Rank em Educação e Percepção quando lida com uma pista de um caso ativo (se não tiver relação, o mestre avisa). Vale por sessão até o Rank. Marque o bônus na janela de rolagem.',
        '<b>Especializações:</b> Street Cop (Manha, Atletismo, Suborno), Undercover (Atuação, Furtividade, Guarda-roupa e Estilo) e Interrogator (Interrogatório, Persuasão, Percepção Humana). A escolhida entra nos bônus desta Role.'
      ) }
    }
  });
  return [face, corpo, lawman];
}

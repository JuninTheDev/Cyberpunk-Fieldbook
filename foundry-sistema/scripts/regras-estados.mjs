// A wiki, system-rules.js, combat.html: "Ações" (p. 168–169), "Movimento" (p. 169) e "Agarrar e arremessar" (p. 177).
import { STATUS_AGARRAO } from './config.mjs';

// Caído não usa Movimento até gastar a Ação Levantar-se. Agarrado não usa Movimento mesmo depois de se levantar.
// É a disponibilidade da Ação de Movimento, não uma redução do atributo MOVE.
export function movimentoPorEstado(statuses, move) {
  const caido = statuses.has('prone');
  const impedido = caido || statuses.has(STATUS_AGARRAO.agarrado);
  return { caido, metros: impedido ? 0 : move * 2, acoesParaLevantar: caido ? 1 : 0 };
}

// A wiki, system-rules.js, combat.html: "Ações" (p. 168–169), "Movimento" (p. 169) e "Agarrar e arremessar" (p. 177).
import { STATUS_AGARRAO } from './config.mjs';

// Caído não usa Movimento até gastar a Ação Levantar-se. Agarrado não usa Movimento mesmo depois de se levantar.
// É a disponibilidade da Ação de Movimento, não uma redução do atributo MOVE.
export function movimentoPorEstado(statuses, move) {
  const caido = statuses.has('prone');
  const impedido = caido || statuses.has(STATUS_AGARRAO.agarrado);
  return { caido, metros: impedido ? 0 : move * 2, acoesParaLevantar: caido ? 1 : 0 };
}

// Correr usa a Ação para ganhar outra Ação de Movimento (wiki, p. 168–169). O MOVE recebido já tem armadura,
// efeitos e ferimento; o total do turno inclui a Ação de Movimento normal, como walk/run do CORE 0.92.4.
export function corridaPorEstado(statuses, move, { dirigindo = false } = {}) {
  const bloqueio = statuses.has('prone') ? 'Está caído: levante-se antes de correr.'
    : statuses.has(STATUS_AGARRAO.agarrado) ? 'Está agarrado: não pode usar Ação de Movimento.'
      : dirigindo ? 'Quem dirige não usa Ações de Movimento.' : null;
  return { metros: bloqueio ? 0 : move * 2, total: bloqueio ? 0 : move * 4, acoes: 1, bloqueio };
}

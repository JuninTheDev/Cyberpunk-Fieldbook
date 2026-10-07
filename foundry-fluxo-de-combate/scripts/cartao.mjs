// O cartão do resultado de um ataque no chat: quem atacou, com o quê, e uma linha por alvo (a defesa, o que pegou,
// o dano na ficha, a armadura, as lesões críticas). O mestre tem o botão "Desfazer". Também o texto curto que sobe
// em cima do token ("Esquivou!", "−12 HP").
import { MODULE_ID } from './constantes.mjs';
import { LOCAIS, formatarMedia } from './regras.mjs';

const esc = texto => String(texto ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const config = chave => game.settings.get(MODULE_ID, chave);
const SELO = {
  acertou: 'Acertou', esquivou: 'Esquivou', errou: 'Errou', fora: 'Fora do alcance', semDv: 'Sem DV',
  ignorado: 'O mestre resolve', suprimido: 'Suprimido', firme: 'Firme'
};
const metros = valor => (valor === null || valor === undefined ? '' : `${formatarMedia(valor)} m`);

function detalhe(ctx, linha) {
  const ataque = ctx.dados.total;
  const dist = linha.distancia !== undefined && ctx.modo !== 'corpo' ? ` (${metros(linha.distancia)})` : '';
  switch (linha.resultado) {
    case 'ignorado': return 'Não é personagem nem capanga: o mestre resolve.';
    case 'fora': return linha.notas.length ? '' : `Fora do alcance da arma${dist}.`;
    case 'semDv': return 'A arma não tem tabela de DV e o mestre não deu uma.';
    case 'suprimido': return `Concentração ${linha.defesa} contra ${ataque}: gasta a próxima Ação de Movimento indo para a cobertura.`;
    case 'firme': return `Concentração ${linha.defesa} contra ${ataque}: fica onde está.`;
    default:
  }
  if (linha.escolha === 'esquivar') {
    if (ctx.modo === 'explosivo') return linha.pegou ? `Evasão ${linha.defesa} não passou do ataque ${ataque}: ficou na área.` : `Saiu da área: Evasão ${linha.defesa} contra ${ataque}.`;
    return linha.pegou ? `Ataque ${ataque} contra Evasão ${linha.defesa}.` : `Evasão ${linha.defesa} contra o ataque ${ataque}.`;
  }
  const escudo = linha.escolha === 'escudo' ? 'Pôs o escudo na frente. ' : '';
  if (ctx.modo === 'explosivo') return `${escudo}Na área da explosão.`;
  if (ctx.modo === 'cartucho') return linha.pegou === false ? `Ataque ${ataque} contra DV 13.` : `${escudo}Na frente do cartucho${dist}.`;
  if (ctx.modo === 'corpo') return `${escudo}${linha.escolha === 'aguentar' ? 'Não esquivou: o golpe pegou.' : ''}`;
  return `${escudo}Ataque ${ataque} contra DV ${linha.dv}${dist}.`;
}

function textoDoDano(linha) {
  const d = linha.dano;
  if (!d) return '';
  const partes = [];
  const rolado = `${d.rolado}${d.autofogo ? ` (2d6 × ${d.autofogo})` : d.formula && /^\d+d6$/.test(d.formula) ? ` em ${d.formula}` : ''}${d.bonus ? ` + ${d.bonus} da lesão crítica` : ''}`;
  if (d.escudo) partes.push(`O escudo segurou ${d.escudo}${d.perdeu ? ' e o resto passou' : ''}.`);
  const local = d.local === 'head' ? 'na cabeça, ×2 depois da armadura' : `no ${LOCAIS[d.local] || d.local}`;
  if (d.perdeu > 0) partes.push(`<b>${d.perdeu} de dano</b> ${local} (rolou ${rolado}) · HP ${d.hpAntes} → ${d.hpDepois}`);
  else if (!d.escudo) partes.push(`A armadura (SP ${d.sp}) segurou os ${rolado}.`);
  if (d.ablacao && d.temArmadura) partes.push(`SP ${d.sp} → ${Math.max(0, d.sp - d.ablacao)}`);
  if (d.reducao) partes.push(`redução de dano ${d.reducao}`);
  let estado = '';
  if (d.hpDepois < 1 && d.hpAntes >= 1) estado = ' <b class="fluxo-perigo">Mortalmente ferido!</b>';
  else if (d.serio && d.hpDepois < d.serio && d.hpAntes >= d.serio) estado = ' <b class="fluxo-alerta">Seriamente ferido.</b>';
  return `<p class="fluxo-dano">${partes.join(' · ')}${estado}</p>`;
}

function htmlDaLinha(ctx, linha) {
  const texto = detalhe(ctx, linha);
  const lesoes = linha.dano && linha.dano.lesoes.length ? `<p class="fluxo-lesao"><i class="fa-solid fa-bone"></i> Lesão crítica: ${linha.dano.lesoes.map(l => `<b>${esc(l.nome)}</b>`).join(', ')}${linha.dano.bonus ? ` (+${linha.dano.bonus} direto no HP)` : ''}.</p>` : '';
  const notas = linha.notas.map(nota => `<p class="fluxo-nota">${esc(nota)}</p>`).join('');
  return `<li class="fluxo-${linha.resultado}">
    <div class="fluxo-alvo"><img src="${esc(linha.img)}" alt=""><b>${esc(linha.nome)}</b><span class="fluxo-selo">${SELO[linha.resultado] || ''}</span></div>
    ${texto ? `<p>${texto}</p>` : ''}${textoDoDano(linha)}${lesoes}${notas}
  </li>`;
}

// Quem vê o cartão: todos, os envolvidos (mestre, quem atacou e os donos dos alvos) ou só o mestre.
function destinatarios(ctx) {
  const modo = config('resultado');
  if (modo === 'publico') return null;
  const ids = new Set(game.users.filter(user => user.isGM).map(user => user.id));
  if (modo === 'envolvidos') {
    ids.add(ctx.usuario.id);
    for (const linha of ctx.linhas) for (const user of game.users) if (linha.token.actor && linha.token.actor.testUserPermission(user, 'OWNER')) ids.add(user.id);
  }
  return [...ids];
}

export async function postarResultado(ctx) {
  const desfazer = ctx.linhas.filter(linha => linha.dano || linha.suprimido).map(linha => ({
    ator: linha.ator,
    dano: linha.dano ? { perdeu: linha.dano.perdeu, local: linha.dano.local, ablacao: linha.dano.temArmadura ? linha.dano.ablacao : 0, escudo: linha.dano.escudo } : null,
    lesoes: linha.dano ? linha.dano.lesoes.map(l => l.id).filter(Boolean) : [],
    suprimido: Boolean(linha.suprimido)
  }));
  const content = `<div class="fluxo-cartao">
    <header><i class="fa-solid fa-crosshairs"></i> <b>${esc(ctx.tokenAtq.name)}</b> · ${esc(ctx.arma.name)} <small>${esc(ctx.descricao)}</small></header>
    <p class="fluxo-cabecalho">Ataque <b>${ctx.dados.total}</b>${ctx.cabecalho ? ` ${esc(ctx.cabecalho)}` : ''}</p>
    ${ctx.linhas.length ? `<ol class="fluxo-alvos">${ctx.linhas.map(linha => htmlDaLinha(ctx, linha)).join('')}</ol>` : ''}
    ${ctx.notas.map(nota => `<p class="fluxo-nota">${esc(nota)}</p>`).join('')}
    ${desfazer.length ? '<footer><button type="button" data-fluxo-desfazer><i class="fa-solid fa-rotate-left"></i> Desfazer</button></footer>' : ''}
  </div>`;
  const whisper = destinatarios(ctx);
  return ChatMessage.create({
    content,
    speaker: ChatMessage.getSpeaker({ token: ctx.tokenAtq }),
    ...(whisper ? { whisper } : {}),
    flags: { [MODULE_ID]: { resultado: { ataque: ctx.dados.id, desfazer, desfeito: false } } }
  });
}

// Texto curto em cima do token.
export function resumoDoAlvo(ctx, linha) {
  if (linha.dano) {
    if (linha.dano.perdeu > 0) return { texto: `−${linha.dano.perdeu} HP${linha.dano.lesoes.length ? ' · crítico!' : ''}`, tipo: 'acerto' };
    return { texto: linha.dano.escudo ? 'No escudo' : 'A armadura segurou', tipo: 'defesa' };
  }
  const texto = { esquivou: 'Esquivou!', errou: 'Errou', fora: 'Fora do alcance', suprimido: 'Suprimido!', firme: 'Firme', acertou: 'Acertou' }[linha.resultado];
  return texto ? { texto, tipo: ['suprimido', 'acertou'].includes(linha.resultado) ? 'acerto' : 'erro' } : null;
}

// Botões dos cartões: "Desfazer" (mestre) e "Responder por ele" (cartão de espera, mestre).
export function ligarBotoes(mensagem, html, { desfazer, forcar }) {
  const raiz = html instanceof HTMLElement ? html : html[0];
  if (!raiz) return;
  for (const botao of raiz.querySelectorAll('[data-fluxo-desfazer], [data-fluxo-forcar]')) {
    if (!game.user.isGM) { botao.closest('footer, .fluxo-botoes')?.remove(); continue; }
    botao.addEventListener('click', async event => {
      event.preventDefault();
      botao.disabled = true;
      try {
        if (botao.hasAttribute('data-fluxo-desfazer')) await desfazer(mensagem);
        else forcar(botao.dataset.fluxoForcar, botao.dataset.escolha);
      } catch (error) {
        ui.notifications.warn(error.message);
        botao.disabled = false;
      }
    });
  }
}

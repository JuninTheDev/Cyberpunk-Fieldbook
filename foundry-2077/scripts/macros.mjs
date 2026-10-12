// Macros das armas de 2077 (regras do Mission Kit, armas2077.mjs): o Ricochete ataca pelo mesmo caminho da ficha (a
// janela de rolagem do sistema, a munição, a Sorte e o cartão; com o Fluxo de Combate e um alvo marcado, a defesa e o
// dano saem por ele), e Carregar arma Tech carrega (ou descarrega) a arma.
import { MODOS, perfil, atacarComModo, alternarCarga } from './armas2077.mjs';

const escape = text => String(text ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

function selectedActor() {
  const actor = canvas.tokens?.controlled[0]?.actor ?? game.user.character;
  if (!actor) ui.notifications.warn('Selecione o token do personagem (ou defina o personagem do seu usuário).');
  return actor;
}
const tokenDe = actor => canvas.tokens?.controlled.find(token => token.actor?.id === actor.id) ?? actor.getActiveTokens()[0] ?? null;
const armas = actor => actor.items.filter(item => perfil(item));

// Uma arma só: vai direto. Várias: pergunta qual (e o modo, se houver mais de um).
async function escolher({ titulo, opcoes, modos = null, botao = 'Atacar' }) {
  if (opcoes.length === 1 && !modos) return { arma: opcoes[0] };
  const { DialogV2 } = foundry.applications.api;
  const campoModo = modos ? `<div class="form-group"><label>Modo</label><select name="modo">${modos.map(([valor, rotulo]) => `<option value="${valor}">${rotulo}</option>`).join('')}</select></div>` : '';
  const resposta = await DialogV2.wait({
    window: { title: titulo, icon: 'fa-solid fa-crosshairs' },
    content: `<div class="cpr2077-dialog"><div class="form-group"><label>Arma</label><select name="arma">${opcoes.map(item => `<option value="${item.id}">${escape(item.name)}</option>`).join('')}</select></div>${campoModo}</div>`,
    buttons: [{ action: 'ok', label: botao, icon: 'fa-solid fa-dice-d10', default: true, callback: (evento, botao) => new FormDataExtended(botao.form).object }],
    rejectClose: false
  }).catch(() => null);
  if (!resposta) return null;
  return { arma: opcoes.find(item => item.id === resposta.arma), modo: resposta.modo };
}

async function atalho({ titulo, filtro, aviso, modo, modos }) {
  const actor = selectedActor();
  if (!actor) return null;
  const opcoes = armas(actor).filter(item => filtro(perfil(item)));
  if (!opcoes.length) return ui.notifications.warn(`${actor.name} ${aviso}`);
  const escolha = await escolher({ titulo, opcoes, modos: modos && modos(opcoes) });
  if (!escolha || !escolha.arma) return null;
  return atacarComModo({ actor, token: tokenDe(actor), arma: escolha.arma, modo: escolha.modo || modo });
}

export function ricochete() {
  return atalho({ titulo: 'Ricochete', filtro: p => p.ricocheteia, modo: MODOS.ricochete, aviso: 'não tem nenhuma arma Power que faça tiro único (a classe fica na ficha da arma).' });
}

// Carregar a arma Tech: gasta a Ação de Movimento, e o próximo ataque ignora metade do SP. De novo: descarrega.
export async function carregarTech() {
  const actor = selectedActor();
  if (!actor) return null;
  const opcoes = armas(actor).filter(item => perfil(item).classe === 'tech');
  if (!opcoes.length) return ui.notifications.warn(`${actor.name} não tem nenhuma arma Tech (a classe fica na ficha da arma ou vem de um Tech Rebuild).`);
  const escolha = await escolher({ titulo: 'Carregar arma Tech', opcoes, botao: 'Carregar' });
  if (!escolha || !escolha.arma) return null;
  return alternarCarga(actor, escolha.arma);
}

// No cliente de quem é atacado (o jogador do alvo, ou o mestre pelos NPCs): a janela "Ataque!" com as escolhas
// (esquivar, aguentar, usar o escudo) e, depois, a rolagem com a janela do próprio sistema (modificadores, Sorte).
// Sem escolha (corpo a corpo, fogo supressivo), vai direto para a rolagem. O total do ataque não aparece para o
// jogador: ele decide às cegas. Sem resposta no tempo da configuração, vale a escolha padrão (aguentar).
import { MODULE_ID, PERICIAS } from './constantes.mjs';
import { formatarMedia } from './regras.mjs';
import { rolarPericia, rolarDano, rolarDeathSave } from './sistema.mjs';

const { ApplicationV2 } = foundry.applications.api;
const esc = texto => String(texto ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ROTULO = { esquivar: 'esquiva', aguentar: 'aguenta', escudo: 'usa o escudo', concentrar: 'rola a Concentração' };

export class JanelaDeDefesa extends ApplicationV2 {
  constructor(dados, resolver) {
    super({ id: `${MODULE_ID}-defesa-${dados.ataque}-${dados.alvoId}` });
    this.dados = dados;
    this.resolver = resolver;
    this.respondida = false;
    this.inicio = Date.now();
  }

  static DEFAULT_OPTIONS = {
    classes: ['fluxo-de-combate', 'fluxo-defesa'],
    tag: 'section',
    window: { title: 'Ataque!', icon: 'fa-solid fa-crosshairs' },
    position: { width: 470, height: 'auto' },
    actions: { escolher: JanelaDeDefesa.#escolher }
  };

  // Abre a janela e espera a escolha: { escolha } ou null (o mestre desistiu de esperar ou respondeu por ele).
  static perguntar(dados, pergunta = null) {
    return new Promise(resolve => {
      const janela = new JanelaDeDefesa(dados, resolve);
      if (pergunta) pergunta.aoExpirar = () => janela.responder(null);
      janela.render({ force: true });
    });
  }

  get title() { return this.dados.mestre ? `Ataque em ${this.dados.alvo.nome}` : 'Você está sendo atacado!'; }

  responder(resposta) {
    if (this.respondida) return;
    this.respondida = true;
    clearInterval(this.relogio);
    this.resolver(resposta);
    // Sem animação: respondida, a janela some na hora (a próxima pode abrir logo em seguida).
    if (this.rendered) this.close({ animate: false });
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    clearInterval(this.relogio);
    const tempo = Number(this.dados.tempo) || 0;
    if (!tempo) return;
    const barra = this.element.querySelector('.fluxo-tempo span');
    this.relogio = setInterval(() => {
      const resta = Math.max(0, 1 - (Date.now() - this.inicio) / (tempo * 1000));
      if (barra) barra.style.width = `${resta * 100}%`;
      if (resta <= 0) this.responder({ escolha: this.dados.padrao, semResposta: true });
    }, 250);
  }

  _onClose(options) {
    super._onClose?.(options);
    // Fechar no X vale a escolha padrão.
    if (!this.respondida) this.responder({ escolha: this.dados.padrao, fechou: true });
  }

  static #escolher(event, alvo) {
    this.responder({ escolha: alvo.dataset.escolha });
  }

  async _renderHTML() {
    const d = this.dados;
    const botao = (escolha, icone, titulo, texto) => d.opcoes.includes(escolha)
      ? `<button type="button" data-action="escolher" data-escolha="${escolha}" class="fluxo-opcao fluxo-${escolha}"><i class="fa-solid ${icone}"></i><span><b>${titulo}</b><small>${texto}</small></span></button>` : '';
    const contraDv = d.dv !== null && d.dv !== undefined ? `O tiro precisa passar da <b>DV ${d.dv}</b> (${formatarMedia(d.distancia)} m).` : 'Sem tabela de DV para esta arma: o mestre decide.';
    const esquiva = d.esquiva ? `${esc(d.esquiva.texto)} (média ${formatarMedia(d.esquiva.media)})` : '';
    const textos = {
      esquivar: d.modo === 'explosivo'
        ? `Sair da área: ${esquiva} tem de passar do ataque.`
        : d.modo === 'corpo' ? `${esquiva} contra o golpe. Empate é seu.` : `${esquiva} vira a DV do ataque. Empate é seu.`,
      aguentar: { explosivo: 'Fica na área e leva o dano da explosão.', cartucho: 'Leva os 3d6 do cartucho.', corpo: 'O golpe pega.' }[d.modo] || contraDv,
      escudo: `${esc(d.escudo?.nome)} (${d.escudo?.hp ?? 0} HP) recebe o ataque todo. Sem esquiva.${['tiro', 'autofogo'].includes(d.modo) ? ` ${contraDv}` : ''}`
    };
    return `<div class="fluxo-defesa-corpo">
      <header class="fluxo-duelo">
        <figure><img src="${esc(d.atacante.img)}" alt=""><figcaption>${esc(d.atacante.nome)}</figcaption></figure>
        <i class="fa-solid fa-angles-right"></i>
        <figure><img src="${esc(d.alvo.img)}" alt=""><figcaption>${esc(d.alvo.nome)}</figcaption></figure>
      </header>
      <p class="fluxo-arma"><b>${esc(d.arma)}</b> · ${esc(d.descricao)}${d.distancia !== null && d.distancia !== undefined ? ` · ${formatarMedia(d.distancia)} m` : ''}</p>
      ${d.mestre ? `<p class="fluxo-total">Total do ataque: <b>${d.total}</b></p>` : '<p class="fluxo-nota">Você não vê o total do ataque: decida antes.</p>'}
      <div class="fluxo-opcoes">
        ${botao('esquivar', 'fa-person-running', d.modo === 'explosivo' ? 'Esquivar da explosão' : 'Esquivar', textos.esquivar)}
        ${botao('aguentar', 'fa-user-shield', d.modo === 'explosivo' ? 'Ficar' : 'Aguentar', textos.aguentar)}
        ${botao('escudo', 'fa-shield-halved', 'Usar o escudo', textos.escudo)}
      </div>
      ${d.tempo ? `<div class="fluxo-tempo"><span></span></div><p class="fluxo-nota">Sem resposta em ${d.tempo} s: ${ROTULO[d.padrao] || d.padrao}.</p>` : ''}
    </div>`;
  }

  _replaceHTML(html, content) { content.innerHTML = html; }
}

// Rola o que a escolha pede (Evasão ou Concentração) no cliente de quem escolheu. Devolve { escolha, total }.
export async function rolarEscolha({ actor, token, escolha, dados, pergunta = null }) {
  const pericia = { esquivar: ['evasao', 'dex'], concentrar: ['concentracao', 'will'] }[escolha];
  if (!pericia) return { escolha };
  const [chave, stat] = pericia;
  const rolagem = await rolarPericia({ actor, token, pericia: PERICIAS[chave], stat, titulo: dados.titulos[escolha], mods: (dados[chave === 'evasao' ? 'esquiva' : 'concentracao'] || {}).mods || [], janela: dados.janela, pergunta });
  return rolagem ? { escolha, total: rolagem.total } : null;
}

// ---------------- Perguntas do mestre (neste cliente) ----------------
export async function responderDefesa(dados, pergunta = null) {
  const token = await fromUuid(dados.token);
  const actor = token && token.actor;
  if (!actor) return null;
  let escolha = dados.opcoes.length === 1 ? dados.opcoes[0] : null;
  let comoFoi = {};
  if (escolha) {
    if (dados.janela && ['esquivar', 'concentrar'].includes(escolha)) ui.notifications.info(dados.aviso);
  } else {
    const resposta = await JanelaDeDefesa.perguntar(dados, pergunta);
    if (!resposta) return null;
    escolha = resposta.escolha;
    comoFoi = { semResposta: Boolean(resposta.semResposta), fechou: Boolean(resposta.fechou) };
  }
  if (pergunta && pergunta.expirou) return null;
  const rolagem = await rolarEscolha({ actor, token, escolha, dados, pergunta });
  return rolagem && { ...rolagem, ...comoFoi };
}

// Quem atacou rola o dano (janela de dano do sistema, com o multiplicador do autofogo e o local já preenchidos).
export async function responderDano(dados, pergunta = null) {
  const token = await fromUuid(dados.token);
  const actor = token && token.actor;
  const arma = actor && actor.items.get(dados.arma);
  if (!arma) return null;
  ui.notifications.info(dados.aviso);
  return rolarDano({ actor, token, arma, modo: dados.modo, mirado: dados.mirado, local: dados.local, multiplicador: dados.multiplicador, janela: dados.janela, pergunta, titulo: dados.titulo, formula: dados.formula, multiplicadorMax: dados.multiplicadorMax, ablacao: dados.ablacao, ignorarSP: dados.ignorarSP });
}

export async function responderDeathSave(dados, pergunta = null) {
  const token = await fromUuid(dados.token);
  const actor = token && token.actor;
  if (!actor) return null;
  ui.notifications.warn(dados.aviso);
  return rolarDeathSave({ actor, token, janela: dados.janela, pergunta });
}

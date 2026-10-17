// A janela de reação do alvo, como a "Ataque!" do Fluxo de Combate do Foundry 12, no visual do sistema: quem ataca e
// quem é atacado, a arma, a distância e as escolhas (esquivar, aguentar, o escudo, a Concentração), cada uma com a conta
// que vale (a esquiva média, a DV do alcance, os PV do escudo); no agarrão (agarrao.mjs), só "Resistir". O jogador não
// vê o total do ataque (menos com "Esconder o total do ataque" desligado); o mestre, pelos NPCs, vê. A barra mostra o
// tempo que resta: sem resposta no tempo, ou fechada no X, vale a escolha padrão. Quando o mestre desiste de esperar (ou
// responde pelo jogador), ele a fecha sem resposta (expirar). A do mestre, pelos NPCs, não tem tempo; fechada no X, fica
// sem resposta, e o sistema escolhe como na defesa automática (como a janela antiga).
import { caminho, SISTEMA } from './config.mjs';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const esc = texto => foundry.utils.escapeHTML(String(texto ?? ''));
const numero = valor => String(Math.round(valor * 10) / 10).replace('.', ',');
const ROTULO = { esquivar: 'esquiva', aguentar: 'aguenta', escudo: 'usa o escudo', concentrar: 'rola a Concentração', resistir: 'rola a resistência', vontade: 'rola a Vontade', interface: 'rola a Interface' };
const ICONES = { esquivar: 'fa-person-running', aguentar: 'fa-user-shield', escudo: 'fa-shield-halved', concentrar: 'fa-brain', resistir: 'fa-hand-fist', vontade: 'fa-network-wired', interface: 'fa-microchip' };

// O que cada escolha faz, com a conta (HTML: os nomes vêm escapados).
function textoDaEscolha(escolha, d) {
  const aDistancia = !['corpo', 'explosivo', 'cartucho', 'supressivo'].includes(d.modo);
  const contraDv = d.dv ? `O tiro precisa passar da <b>DV ${d.dv}</b>${d.metros ? ` (${numero(d.metros)} m)` : ''}.` : 'Sem a DV deste tiro: o mestre decide.';
  const esquiva = d.esquiva ? `${esc(d.esquiva.texto)} (média ${numero(d.esquiva.media)})` : '';
  if (escolha === 'esquivar') {
    if (d.modo === 'explosivo') return `Sair da área: ${esquiva} tem de passar do ataque.`;
    if (aDistancia) return `${esquiva} vira a DV do ataque. Empate é seu.`;
    return `${esquiva} contra o ${d.modo === 'corpo' ? 'golpe' : 'ataque'}. Empate é seu.`;
  }
  if (escolha === 'aguentar') return { explosivo: 'Fica na área e leva o dano da explosão.', cartucho: 'Leva os 3d6 do cartucho.', corpo: 'O golpe pega.' }[d.modo] ?? contraDv;
  if (escolha === 'escudo') return `${esc(d.escudo?.nome)} (${d.escudo?.pv ?? 0} PV) recebe o ataque todo. Sem esquiva.${aDistancia ? ` ${contraDv}` : ''}`;
  if (escolha === 'concentrar') return `${d.concentracao ? `${esc(d.concentracao.texto)} (média ${numero(d.concentracao.media)})` : 'WILL + Concentração + 1d10'} contra o ataque. Empate é seu. Perdeu: fica Suprimido e usa a próxima Ação de Movimento para ir para a cobertura (se não bastar, a Ação também).`;
  if (escolha === 'resistir') {
    const briga = d.briga ? `${esc(d.briga.texto)} (média ${numero(d.briga.media)})` : 'DEX + Briga + 1d10';
    if (d.modo === 'escapar') return `${briga} contra a fuga. Empate é seu. Perdeu: o agarrão acaba.`;
    return `${briga} contra o agarrão. Empate é seu. Perdeu: os dois ficam agarrados (−2 em todas as ações), e você não usa a Ação de Movimento.`;
  }
  if (escolha === 'vontade') {
    const vontade = d.vontade ? `${esc(d.vontade.texto)} (média ${numero(d.vontade.media)})` : 'WILL + 1d10';
    return `${vontade} contra o Jack In no seu Neuroport. Empate é seu. Ganhou: ele entra assim mesmo, mas você percebe. Perdeu: ele entra sem você perceber.`;
  }
  if (escolha === 'interface') {
    const interfaceNet = d.interface ? `${esc(d.interface.texto)} (média ${numero(d.interface.media)})` : 'Interface + 1d10';
    return `${interfaceNet} contra a expulsão. Empate é seu. Perdeu: você sai do Neuroport de ${esc(d.atacante?.nome)}.`;
  }
  return '';
}

export class JanelaDeDefesa extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: [SISTEMA, 'janela-defesa', 'defesa', 'themed', 'theme-dark'],
    position: { width: 480, height: 'auto' },
    window: { icon: 'fa-solid fa-crosshairs' },
    actions: { escolher: JanelaDeDefesa.#escolher }
  };

  static PARTS = { defesa: { template: caminho('templates/defesa.hbs') } };

  #resolver;
  #respondida = false;
  #relogio = null;
  #inicio = Date.now();

  constructor(dados, resolver) {
    super({ id: `${SISTEMA}-defesa-${foundry.utils.randomID()}` });
    this.dados = dados;
    this.#resolver = resolver;
  }

  // Abre a janela e espera: { escolha } (com fechou ou semResposta, quando valeu a padrão) ou null (o mestre a fechou;
  // ou, na do mestre, o X).
  static perguntar(dados, aoAbrir = null) {
    return new Promise(resolve => {
      const janela = new JanelaDeDefesa(dados, resolve);
      aoAbrir?.(janela);
      janela.render({ force: true });
    });
  }

  get title() {
    if (this.dados.modo === 'agarrar') return this.dados.mestre ? `Agarrão em ${this.dados.alvo.nome}` : 'Estão agarrando você!';
    if (this.dados.modo === 'escapar') return this.dados.mestre ? `Fuga do agarrão de ${this.dados.alvo.nome}` : 'Estão escapando do seu agarrão!';
    if (this.dados.modo === 'jackin') return this.dados.mestre ? `Jack In em ${this.dados.alvo.nome}` : 'Estão entrando no seu Neuroport!';
    if (this.dados.modo === 'expulsar') return this.dados.mestre ? `Expulsão de ${this.dados.alvo.nome}` : 'Estão expulsando você de um Neuroport!';
    return this.dados.mestre ? `Ataque em ${this.dados.alvo.nome}` : 'Você está sendo atacado!';
  }

  responder(resposta) {
    if (this.#respondida) return;
    this.#respondida = true;
    clearInterval(this.#relogio);
    this.#resolver(resposta);
    // Sem animação: respondida, a janela some na hora (a próxima pode abrir logo em seguida).
    if (this.rendered) this.close({ animate: false });
  }

  // O mestre desistiu de esperar (ou respondeu pelo jogador): fecha sem resposta.
  expirar() {
    this.responder(null);
  }

  async _prepareContext(options) {
    const contexto = await super._prepareContext(options);
    const d = this.dados;
    return Object.assign(contexto, {
      ...d, metrosTexto: d.metros ? numero(d.metros) : '', padraoTexto: ROTULO[d.padrao] ?? d.padrao, verTotal: d.mestre || Number.isFinite(d.total),
      opcoes: d.opcoes.map(escolha => ({
        escolha, icone: ICONES[escolha] ?? 'fa-circle',
        titulo: { esquivar: d.modo === 'explosivo' ? 'Esquivar da explosão' : 'Esquivar', aguentar: d.modo === 'explosivo' ? 'Ficar' : 'Aguentar', escudo: 'Usar o escudo', concentrar: 'Rolar a Concentração', resistir: 'Resistir', vontade: 'Resistir com a Vontade', interface: 'Resistir com a Interface' }[escolha] ?? escolha,
        texto: textoDaEscolha(escolha, d), padrao: escolha === d.padrao
      }))
    });
  }

  // A barra do tempo: sem resposta no tempo, vale a escolha padrão.
  _onRender(contexto, opcoes) {
    super._onRender(contexto, opcoes);
    clearInterval(this.#relogio);
    // Respondida antes de aparecer (o mestre desistiu enquanto ela abria): fecha.
    if (this.#respondida) {
      this.close({ animate: false });
      return;
    }
    const tempo = Number(this.dados.tempo) || 0;
    if (!tempo) return;
    const barra = this.element.querySelector('.tempo span');
    this.#relogio = setInterval(() => {
      const resta = Math.max(0, 1 - (Date.now() - this.#inicio) / (tempo * 1000));
      if (barra) barra.style.width = `${resta * 100}%`;
      if (resta <= 0) this.responder({ escolha: this.dados.padrao, semResposta: true });
    }, 250);
  }

  // Fechar no X vale a escolha padrão (na do mestre, fica sem resposta: o sistema escolhe).
  _onClose(opcoes) {
    super._onClose(opcoes);
    if (!this.#respondida) this.responder(this.dados.mestre ? null : { escolha: this.dados.padrao, fechou: true });
  }

  static #escolher(evento, alvo) {
    this.responder({ escolha: alvo.dataset.escolha });
  }
}

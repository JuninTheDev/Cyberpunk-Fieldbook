// A janela do extrato de Eurodólares, IP ou Reputação, como o ledger do CORE no Foundry 12: o saldo, o menu para somar,
// subtrair ou definir (com o motivo) e o histórico, do mais novo para o mais antigo, com quem mudou. O mestre pode
// tirar uma linha e escolher se a mudança também é desfeita. A janela acompanha o ator: muda junto quando ele muda.
import { caminho, EXTRATOS, SISTEMA } from './config.mjs';

const { ApplicationV2, DialogV2, HandlebarsApplicationMixin } = foundry.applications.api;
const quando = data => (data ? new Date(data).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '');
const sinal = numero => (numero > 0 ? `+${numero}` : numero < 0 ? `−${Math.abs(numero)}` : '0');
// A coluna "mudança": "+100 eb", "−30 eb" ou, quando foi definido, "= 50 (−20)".
const mudanca = (linha, unidade) => (linha.acao === 'definir' ? `= ${linha.saldo} (${sinal(linha.delta)})` : `${sinal(linha.delta)}${unidade ? ` ${unidade}` : ''}`);

export class JanelaDoExtrato extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: [SISTEMA, 'extrato', 'themed', 'theme-dark'],
    position: { width: 720, height: 600 },
    window: { resizable: true, icon: 'fa-solid fa-coins' },
    actions: { somar: JanelaDoExtrato.#mudar, subtrair: JanelaDoExtrato.#mudar, definir: JanelaDoExtrato.#mudar, apagar: JanelaDoExtrato.#apagar }
  };

  static PARTS = { extrato: { template: caminho('templates/extrato.hbs'), scrollable: ['.historico ol'] } };

  constructor({ ator, campo, ...opcoes }) {
    super({ ...opcoes, id: `${SISTEMA}-extrato-${ator.id}-${campo}`, window: { title: `${EXTRATOS[campo].rotulo}: ${ator.name}` } });
    this.ator = ator;
    this.campo = campo;
  }

  async _prepareContext(options) {
    const contexto = await super._prepareContext(options);
    const { rotulo, unidade } = EXTRATOS[this.campo];
    const linhas = this.ator.system.extratos[this.campo];
    return Object.assign(contexto, {
      rotulo, unidade, saldo: this.ator.system[this.campo], editavel: this.ator.isOwner, mestre: game.user.isGM,
      linhas: linhas.map((linha, indice) => ({
        indice, numero: indice + 1, quando: quando(linha.quando), saldo: linha.saldo, negativo: linha.saldo < 0, motivo: linha.motivo || (linha.acao === 'definir' ? 'mudança direta' : ''),
        usuario: linha.usuario, mudanca: mudanca(linha, unidade), classe: linha.delta > 0 ? 'entrou' : linha.delta < 0 ? 'saiu' : ''
      })).reverse()
    });
  }

  // Como a ficha: entra nas janelas do ator, que a redesenha a cada mudança (o ator do token também) e a fecha se for
  // apagado.
  async _onFirstRender(contexto, opcoes) {
    await super._onFirstRender(contexto, opcoes);
    this.ator.apps[this.id] = this;
  }

  _onClose(opcoes) {
    super._onClose(opcoes);
    delete this.ator.apps[this.id];
  }

  // Somar, subtrair ou definir: a quantia e o motivo dos campos da janela (a mudança redesenha a janela, com os campos
  // limpos). Como no CORE, perder mais do que tem só avisa.
  static async #mudar(evento, alvo) {
    const quantia = this.element.querySelector('[name="quantia"]').value;
    const motivo = this.element.querySelector('[name="motivo"]').value;
    if (quantia === '' || !Number.isFinite(Number(quantia))) { ui.notifications.warn('Ponha a quantia.'); return; }
    const linha = await this.ator.mudarComExtrato(this.campo, { acao: alvo.dataset.action, valor: Number(quantia), motivo });
    if (linha.delta < 0 && linha.saldo < 0) ui.notifications.warn(`${EXTRATOS[this.campo].rotulo}: saiu mais do que tinha (o saldo ficou em ${linha.saldo}).`);
  }

  // O mestre tira uma linha, e a janela pergunta, como a do CORE, se a mudança também é desfeita. Aqui a linha guarda a
  // diferença, então o saldo novo já vem calculado (o CORE lê o número no texto e pergunta se soma ou subtrai).
  static async #apagar(evento, alvo) {
    if (!game.user.isGM) return;
    const indice = Number(alvo.closest('[data-indice]').dataset.indice);
    const linha = this.ator.system.extratos[this.campo][indice];
    if (!linha) return;
    const saldo = this.ator.system[this.campo];
    const desfeito = saldo - linha.delta;
    const descricao = `<b>${mudanca(linha, EXTRATOS[this.campo].unidade)}</b>${linha.motivo ? `, ${foundry.utils.escapeHTML(linha.motivo)}` : ''}`;
    const escolha = await DialogV2.wait({
      window: { title: 'Tirar do extrato' }, classes: [SISTEMA, 'extrato-apagar'], rejectClose: false,
      content: linha.delta
        ? `<p>Tirar do histórico a linha ${descricao}.</p><p>A mudança também é desfeita? O saldo vai de ${saldo} para ${desfeito}.</p>`
        : `<p>Tirar do histórico a linha ${descricao}? O saldo não muda.</p>`,
      buttons: [
        ...(linha.delta ? [{ action: 'desfazer', label: `Desfazer: o saldo vai para ${desfeito}` }] : []),
        { action: 'tirar', label: 'Só tirar a linha', default: true },
        { action: 'cancelar', label: 'Cancelar' }
      ]
    });
    if (escolha !== 'desfazer' && escolha !== 'tirar') return;
    // A mesma linha, procurada de novo: o extrato pode ter mudado enquanto a pergunta estava aberta.
    const agora = this.ator.system.extratos[this.campo].findIndex(outra => ['quando', 'acao', 'delta', 'saldo', 'motivo', 'usuario'].every(chave => outra[chave] === linha[chave]));
    if (agora >= 0) await this.ator.apagarDoExtrato(this.campo, agora, { desfazer: escolha === 'desfazer' });
  }
}

// Abre (ou traz para a frente) o extrato de um valor do ator.
export function abrirExtrato(ator, campo = 'dinheiro') {
  const aberta = foundry.applications.instances.get(`${SISTEMA}-extrato-${ator.id}-${campo}`);
  return (aberta ?? new JanelaDoExtrato({ ator, campo })).render({ force: true });
}

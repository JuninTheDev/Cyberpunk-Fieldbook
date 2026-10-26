// Veículo com token próprio (C46): ficha curta no visual do capanga. Catálogo, SDP e blindagem do C15.
import { prepararAcessibilidade } from './acessibilidade.mjs';
import { carregarCatalogo, itemDoCatalogo } from './catalogo.mjs';
import { caminho, SISTEMA } from './config.mjs';
import { dadosDoVeiculoDoCatalogo } from './regras-ator-veiculo.mjs';
import { TIPOS_DE_VEICULO } from './regras-veiculos.mjs';

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

export class FichaVeiculo extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: [SISTEMA, 'ficha-personagem', 'ficha-capanga', 'ficha-veiculo', 'themed', 'theme-dark'],
    position: { width: 720, height: 680 }, window: { resizable: true },
    form: { submitOnChange: true },
    actions: { escolherVeiculo: FichaVeiculo.escolherVeiculo, ablarChassis: FichaVeiculo.ablarChassis, consertarChassis: FichaVeiculo.consertarChassis }
  };

  // Uma parte por elemento raiz (o Foundry 14 exige um só por parte), como a ficha do capanga.
  static PARTS = {
    topo: { template: caminho('templates/veiculo/topo.hbs') },
    corpo: { template: caminho('templates/veiculo/corpo.hbs'), scrollable: [''] },
    rodape: { template: caminho('templates/veiculo/rodape.hbs') }
  };

  async _prepareContext(opcoes) {
    const contexto = await super._prepareContext(opcoes);
    const ator = this.actor;
    const catalogo = this.isEditable ? await carregarCatalogo() : {};
    return Object.assign(contexto, {
      ator, sistema: ator.system, fonte: ator._source.system, editavel: this.isEditable, versao: game.system.version,
      naCena: ator.isToken, nomeNaFicha: this.token?.name ?? ator.name, tipos: TIPOS_DE_VEICULO,
      modelos: Object.fromEntries(Object.entries(catalogo).filter(([, item]) => item.type === 'veiculo')
        .sort(([, a], [, b]) => a.name.localeCompare(b.name, 'pt-BR')).map(([id, item]) => [id, item.name])),
      notasRicas: await foundry.applications.ux.TextEditor.implementation.enrichHTML(ator.system.notas, { relativeTo: ator, secrets: ator.isOwner })
    });
  }

  async _onRender(contexto, opcoes) {
    await super._onRender(contexto, opcoes);
    prepararAcessibilidade(this.element);
  }

  _onChangeForm(configuracao, evento) {
    if (evento.target.name === 'catalogoVeiculo') return;
    return super._onChangeForm(configuracao, evento);
  }

  _processFormData(evento, form, formData) {
    const dados = super._processFormData(evento, form, formData);
    delete dados.catalogoVeiculo;
    return dados;
  }

  async _processSubmitData(evento, form, dados, opcoes) {
    if (!this.isEditable || !this.actor.isOwner) return;
    if (this.token && typeof dados.name === 'string' && dados.name !== this.token.name) await this.token.update({ name: dados.name });
    return super._processSubmitData(evento, form, dados, opcoes);
  }

  static async escolherVeiculo() {
    if (!this.isEditable || !this.actor.isOwner) return;
    const ator = this.actor;
    const seletor = this.element.querySelector('[name="catalogoVeiculo"]');
    const id = seletor?.value;
    if (!id) return;
    const dados = dadosDoVeiculoDoCatalogo(await itemDoCatalogo(id));
    const atual = await fromUuid(ator.uuid);
    // A ficha pode ter perdido a permissão ou mudado a seleção durante a leitura do catálogo.
    if (!dados || !this.isEditable || !ator.isOwner || this.actor !== ator || seletor.value !== id || atual !== ator) return;
    if (this.token) await this.token.update({ name: dados.name });
    return ator.update(dados);
  }

  static ablarChassis() {
    if (!this.isEditable || !this.actor.isOwner) return;
    const s = this.actor.system;
    return this.actor.update({ 'system.ablacao': s.ablacao + Math.min(1, s.blindagem.sp) });
  }

  static consertarChassis() {
    if (!this.isEditable || !this.actor.isOwner) return;
    return this.actor.update({ 'system.ablacao': 0 });
  }
}

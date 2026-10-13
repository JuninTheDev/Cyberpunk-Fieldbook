// Fichas do Black ICE e do demônio (o cpr-black-ice-sheet e o cpr-demon-sheet do CORE): uma página curta, no visual da
// ficha do personagem, com a imagem, o nome, a REZ, os números (clique para rolar o número + 1d10, pela janela do
// modificador do mestre; Ctrl + clique rola direto) e as notas; no Black ICE, também a classe, o efeito, o dano e o custo.
// O modelo da wiki (os 12 Black ICE e os 3 demônios do RED, das tabelas da wiki) preenche o nome e os números, como o
// "configurar pelo programa" do Black ICE do CORE. Na ficha de um token, o nome muda também o do token, como no capanga.
import { caminho, CLASSES_BLACK_ICE, SISTEMA } from './config.mjs';
import { config } from './configuracoes.mjs';
import { BLACK_ICE, DEMONIOS } from './gerado.mjs';
import { fichaDoModelo, NUMEROS_DA_NET } from './regras.mjs';

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;
// A janela abre no clique; Ctrl (ou ⌘) + clique rola direto. "Rolar direto" (deste navegador) inverte.
const comJanela = evento => Boolean(evento?.ctrlKey || evento?.metaKey) === Boolean(config('rolarDireto'));
const MODELOS = { blackice: BLACK_ICE, demonio: DEMONIOS };

class FichaDaNet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    // O visual da ficha do personagem (as classes dela no tema.css).
    classes: [SISTEMA, 'ficha-personagem', 'ficha-net', 'themed', 'theme-dark'],
    position: { width: 640, height: 'auto' },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: { rolarDaNet: FichaDaNet.#rolar }
  };

  async _prepareContext(options) {
    const contexto = await super._prepareContext(options);
    const ator = this.actor;
    const s = ator.system;
    return Object.assign(contexto, {
      ator, sistema: s, fonte: ator._source.system, editavel: this.isEditable, versao: game.system.version,
      // Na ficha de um token, o nome é o do token (o que a cena mostra).
      naCena: ator.isToken, nomeNaFicha: this.token?.name ?? ator.name,
      modelos: Object.fromEntries(MODELOS[ator.type].map(modelo => [modelo.id, modelo.nome])),
      numeros: NUMEROS_DA_NET[ator.type].map(numero => ({ ...numero, valor: s[numero.id] })),
      notasRicas: await foundry.applications.ux.TextEditor.implementation.enrichHTML(s.notas, { relativeTo: ator, secrets: ator.isOwner })
    });
  }

  // O modelo da wiki escolhido preenche o nome e os números (regras.fichaDoModelo). Na ficha de um token, o nome muda
  // também o do token na cena.
  async _processSubmitData(evento, form, dados, opcoes) {
    const id = dados.system?.modelo;
    const modelo = id && id !== this.actor.system.modelo ? MODELOS[this.actor.type].find(m => m.id === id) : null;
    if (modelo) foundry.utils.mergeObject(dados, fichaDoModelo(modelo));
    if (this.token && typeof dados.name === 'string' && dados.name !== this.token.name) await this.token.update({ name: dados.name });
    return super._processSubmitData(evento, form, dados, opcoes);
  }

  static #rolar(evento, alvo) { return this.actor.rolarDaNet(alvo.dataset.numero, { perguntar: comJanela(evento) }); }
}

export class FichaBlackIce extends FichaDaNet {
  static DEFAULT_OPTIONS = { classes: ['ficha-black-ice'] };
  static PARTS = { ficha: { template: caminho('templates/net/black-ice.hbs') } };

  async _prepareContext(options) {
    return Object.assign(await super._prepareContext(options), { classesDoIce: CLASSES_BLACK_ICE });
  }
}

export class FichaDemonio extends FichaDaNet {
  static DEFAULT_OPTIONS = { classes: ['ficha-demonio'] };
  static PARTS = { ficha: { template: caminho('templates/net/demonio.hbs') } };
}

// Ficha do contêiner (o cpr-container-sheet do CORE 0.92.4), no visual da ficha do personagem: à esquerda, a imagem, o
// nome, com quem trocar, os Eurodólares (o saque não tem) e as configurações do mestre (o tipo e as permissões); à
// direita, os itens por categoria, com a quantidade, o preço e os botões de pegar e apagar. Arrastar um item para a
// ficha o põe no contêiner (o mestre, ou o jogador com "Criar e pôr itens"); para tirar, o jogador usa o "Pegar".
import { CATEGORIAS_DO_CONTEINER, caminho, PERMISSOES_DO_CONTEINER, SISTEMA, TIPOS_DE_CONTEINER } from './config.mjs';
import { levarItem, parceirosDoUsuario, pegarDoConteiner } from './conteiner.mjs';
import { abrirExtrato } from './extrato.mjs';
import { EMPILHAVEIS, parteSugerida, parteValida, precoNaLista, quantidadeDe } from './regras.mjs';
import { perguntarDivisao } from './pilhas.mjs';
import { divisaoDaPilha } from './regras-inventario.mjs';

const { HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;
// As permissões que o mestre marca à mão em cada tipo (a ficha do CORE): no personalizado, todas; na loja, o estoque
// infinito; no saque e no esconderijo, nenhuma (o tipo decide).
const MARCAVEIS = { personalizado: Object.keys(PERMISSOES_DO_CONTEINER), loja: ['estoqueInfinito'], saque: [], esconderijo: [] };
// As do personalizado que são dos jogadores (o "Os jogadores podem" do CORE).
const DOS_JOGADORES = ['criar', 'apagar', 'mudar', 'vender', 'mover'];

export class FichaConteiner extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: [SISTEMA, 'ficha-personagem', 'ficha-conteiner', 'themed', 'theme-dark'],
    position: { width: 940, height: 720 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      editarItem: FichaConteiner.#editarItem,
      criarItem: FichaConteiner.#criarItem,
      apagarItem: FichaConteiner.#apagarItem,
      pegarTudo: FichaConteiner.#pegarTudo,
      pegarParte: FichaConteiner.#pegarParte,
      abrirExtrato: FichaConteiner.#abrirExtrato,
      dividirPilha: FichaConteiner.#dividirPilha
    }
  };

  static PARTS = { ficha: { template: caminho('templates/conteiner.hbs'), scrollable: ['.coluna-principal'] } };

  // Com quem a ficha troca (o "Trocar com" do CORE): o escolhido nesta janela; sem escolha, o personagem do usuário.
  parceiro = null;

  get #parceiro() {
    const parceiros = parceirosDoUsuario();
    return parceiros.find(ator => ator.id === this.parceiro) ?? (this.parceiro === '' ? null : parceiros.find(ator => ator.id === game.user.character?.id) ?? null);
  }

  async _prepareContext(options) {
    const contexto = await super._prepareContext(options);
    const ator = this.actor;
    const s = ator.system;
    const mestre = game.user.isGM;
    const podeCriar = mestre || s.permissoes.criar;
    // O que está instalado em outro item do contêiner aparece no item de cima ("com ...").
    const ids = new Set(ator.items.map(item => item.id));
    const instaladoEmOutro = item => Boolean(item.system.instaladoEm && ids.has(item.system.instaladoEm));
    const linha = item => {
      const quantidade = quantidadeDe(item.type, item.system);
      const instalados = ator.items.filter(outro => outro.system.instaladoEm === item.id).map(outro => outro.name);
      return {
        id: item.id, nome: item.name, img: item.img, empilhavel: EMPILHAVEIS.includes(item.type), quantidade, emParte: quantidade > 1,
        divisivel: (mestre || s.permissoes.mudar) && Boolean(divisaoDaPilha(item.type, item.system.quantidade, 1)),
        preco: precoNaLista(item.type, item.system), instalados: instalados.join(', ')
      };
    };
    const categorias = CATEGORIAS_DO_CONTEINER.map(tipo => ({
      tipo, rotulo: game.i18n.localize(`TYPES.Item.${tipo}`),
      itens: ator.items.filter(item => item.type === tipo && !instaladoEmOutro(item)).sort((a, b) => a.name.localeCompare(b.name)).map(linha)
    })).filter(categoria => categoria.itens.length || podeCriar);
    const marcavel = chave => ({ chave, rotulo: PERMISSOES_DO_CONTEINER[chave], ligada: s.permissoes[chave] });
    const parceiro = this.#parceiro;
    return Object.assign(contexto, {
      ator, sistema: s, mestre, versao: game.system.version, naCena: ator.isToken,
      tipos: TIPOS_DE_CONTEINER,
      comDinheiro: s.tipo !== 'saque',
      gerais: MARCAVEIS[s.tipo].filter(chave => !DOS_JOGADORES.includes(chave)).map(marcavel),
      dosJogadores: MARCAVEIS[s.tipo].filter(chave => DOS_JOGADORES.includes(chave)).map(marcavel),
      parceiros: parceirosDoUsuario().map(p => ({ id: p.id, nome: p.name, escolhido: p.id === parceiro?.id })),
      categorias, podeCriar, podeApagar: mestre || s.permissoes.apagar, deGraca: s.permissoes.deGraca,
      notasRicas: await foundry.applications.ux.TextEditor.implementation.enrichHTML(s.notas, { relativeTo: ator, secrets: ator.isOwner })
    });
  }

  // O "Trocar com" não é campo do ator: só muda o escolhido desta janela.
  async _onRender(contexto, opcoes) {
    await super._onRender(contexto, opcoes);
    this.element.querySelector('select.parceiro')?.addEventListener('change', evento => {
      evento.stopPropagation();
      this.parceiro = evento.currentTarget.value;
    });
  }

  // Arrastar um item para o contêiner: o mestre, ou o jogador com "Criar e pôr itens" (o players-create do CORE). Da
  // ficha de outro ator, o item sai de lá (levarItem); do diretório ou de um compêndio, entra uma cópia. Reordenar na
  // própria ficha não muda nada.
  async _onDropItem(evento, item) {
    if (!this.actor.isOwner) return null;
    if (this.actor.uuid === item.parent?.uuid) return super._onDropItem(evento, item);
    if (!game.user.isGM && !this.actor.system.permissoes.criar) {
      ui.notifications.warn(`${this.actor.name}: sem permissão para pôr itens aqui (o mestre libera nas configurações do contêiner).`);
      return null;
    }
    if (!CATEGORIAS_DO_CONTEINER.includes(item.type)) { ui.notifications.warn(`${item.name}: só itens entram no contêiner.`); return null; }
    return levarItem(item, this.actor, { manterNaOrigem: !item.parent });
  }

  #item(alvo) { return this.actor.items.get(alvo.closest('[data-item-id]')?.dataset.itemId); }

  // O item abre na ficha dele; o jogador só muda com "Mudar os itens" (FichaItem.isEditable).
  static #editarItem(evento, alvo) { return this.#item(alvo)?.sheet.render(true); }
  static #dividirPilha(evento, alvo) { return perguntarDivisao(this.#item(alvo)); }

  // O "+" da categoria (o item-create do CORE): o mestre, ou o jogador com "Criar e pôr itens". O item novo tem o nome
  // do tipo e abre para ser preenchido.
  static async #criarItem(evento, alvo) {
    if (!game.user.isGM && !this.actor.system.permissoes.criar) return;
    const tipo = alvo.dataset.tipo;
    const [criado] = await this.actor.createEmbeddedDocuments('Item', [{ name: game.i18n.localize(`TYPES.Item.${tipo}`), type: tipo }]);
    criado?.sheet.render(true);
  }

  // Apagar: o mestre, ou o jogador com "Apagar itens" (o players-delete do CORE). O que está instalado no item sai junto.
  static async #apagarItem(evento, alvo) {
    const item = this.#item(alvo);
    if (!item || (!game.user.isGM && !this.actor.system.permissoes.apagar)) return;
    const ok = await DialogV2.confirm({ window: { title: 'Apagar item' }, content: `<p>Apagar <b>${foundry.utils.escapeHTML(item.name)}</b> do contêiner?</p>` });
    if (!ok) return;
    const ids = [item.id];
    for (let i = 0; i < ids.length; i++) ids.push(...this.actor.items.filter(outro => outro.system.instaladoEm === ids[i]).map(outro => outro.id));
    await this.actor.deleteEmbeddedDocuments('Item', ids);
  }

  static #pegarTudo(evento, alvo) {
    const item = this.#item(alvo);
    return item && pegarDoConteiner(this.actor, item, { para: this.#parceiro });
  }

  // Pegar uma parte da pilha (o purchaseFraction do CORE): a janela pergunta quantos, começando na metade.
  static async #pegarParte(evento, alvo) {
    const item = this.#item(alvo);
    if (!item) return;
    const pilha = quantidadeDe(item.type, item.system);
    const resposta = await DialogV2.prompt({
      window: { title: 'Pegar uma parte' }, classes: [SISTEMA, 'pegar-parte'], rejectClose: false,
      content: `<p>Pegar uma parte de <b>${foundry.utils.escapeHTML(item.name)}</b> (tem ${pilha}).</p><label>Quantos <input type="number" name="quantidade" value="${parteSugerida(pilha)}" min="1" max="${pilha - 1}" step="1" autofocus></label>`,
      ok: { label: 'Pegar', callback: (ev, botao) => Number(botao.form.elements.quantidade.value) }
    });
    if (resposta === null || resposta === undefined) return;
    if (!parteValida(resposta, pilha)) { ui.notifications.warn(`Ponha um número de 1 a ${pilha - 1}; para pegar a pilha toda, use o "Pegar tudo".`); return; }
    return pegarDoConteiner(this.actor, item, { para: this.#parceiro, quantidade: resposta });
  }

  // O extrato dos Eurodólares da loja: só o mestre (no CORE, o livro-caixa do contêiner é do mestre).
  static #abrirExtrato() { return game.user.isGM ? abrirExtrato(this.actor, 'dinheiro') : null; }
}

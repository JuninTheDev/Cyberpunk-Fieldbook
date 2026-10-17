// Ficha da arquitetura da NET (o netarch do CORE, com o que o NET Architect da mesa junta): a lista dos andares, um
// conteúdo por linha (o andar, o ramo, o tipo; o DV da senha, do arquivo e do nó de controle; qual Black ICE, demônio ou
// netrunner inimigo; o nome e o que tem lá), e o mapa que ela forma (arquitetura.lerArquitetura): o andar 1 do ramo A
// sai do ponto de acesso, e um ramo novo sai do andar de cima do ramo à esquerda. "Gerar pelas tabelas" troca os andares
// pelos das tabelas do livro (arquitetura.gerarAndares), na dificuldade escolhida. O mapa é também o editor visual (o
// editor.mjs do NET Architect da mesa): quem edita arrasta um andar para outra célula (em cima de outro andar, os dois
// trocam) e cria um andar pelo "+" de uma célula vazia; a tabela das linhas faz o papel do painel do editor da mesa.
import { ANDAR_MAX, COM_DV, criarAndar, DIFICULDADES, ENTRADA, gerarAndares, lerArquitetura, moverAndar, novaLinha, RAMOS, TIPOS_DE_ANDAR } from './arquitetura.mjs';
import { caminho, SISTEMA } from './config.mjs';
import { BLACK_ICE, DEMONIOS, TABELAS_DA_NET } from './gerado.mjs';

const { DialogV2, HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;
const ICES = Object.fromEntries(BLACK_ICE.map(ice => [ice.id, ice.nome]));
const NOMES_DOS_DEMONIOS = Object.fromEntries(DEMONIOS.map(demonio => [demonio.id, demonio.nome]));

// O que a célula do mapa mostra de cada conteúdo: "Senha DV 8", "Hellhound", "Demônio: Efreet".
function rotuloDoConteudo(conteudo, atores) {
  const nome = conteudo.nome ? ` (${conteudo.nome})` : '';
  if (conteudo.tipo === 'ice') return `${ICES[conteudo.ice] ?? 'Black ICE'}${nome}`;
  if (conteudo.tipo === 'demonio') return `Demônio: ${NOMES_DOS_DEMONIOS[conteudo.demonio] ?? conteudo.demonio}${nome}`;
  if (conteudo.tipo === 'netrunner') return `Netrunner: ${conteudo.nome || atores[conteudo.ator] || '?'}`;
  return `${TIPOS_DE_ANDAR[conteudo.tipo]}${conteudo.dv ? ` DV ${conteudo.dv}` : ''}${nome}`;
}

export class FichaArquitetura extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    // O tema escuro da ficha do item (styles/tema.css).
    classes: [SISTEMA, 'ficha-item', 'ficha-arquitetura', 'themed', 'theme-dark'],
    position: { width: 900, height: 760 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: { novaLinha: FichaArquitetura.#novaLinha, tirarLinha: FichaArquitetura.#tirarLinha, gerar: FichaArquitetura.#gerar, criarAndar: FichaArquitetura.#criarAndar }
  };

  static PARTS = {
    ficha: { template: caminho('templates/arquitetura.hbs'), scrollable: [''] }
  };

  async _prepareContext(options) {
    const contexto = await super._prepareContext(options);
    const item = this.item;
    const fonte = item._source.system;
    const arq = lerArquitetura({ nome: item.name, ...fonte });
    // Os netrunners inimigos: os personagens e os capangas do mundo.
    const atores = Object.fromEntries(game.actors.filter(ator => ['personagem', 'capanga'].includes(ator.type)).map(ator => [ator.uuid, ator.name]));
    // O mapa: uma linha por andar (do 1 ao mais fundo), uma coluna por ramo. Na célula, os conteúdos e, quando o nó não
    // sai do andar de cima no mesmo ramo, de onde ele sai. Quem edita vê uma linha e uma coluna a mais, com o "+" em cada
    // célula vazia.
    const editavel = this.isEditable;
    const ramosDoMapa = [...RAMOS].slice(0, Math.min(RAMOS.length, arq.colunas + (editavel ? 1 : 0)));
    const mapa = Array.from({ length: Math.min(ANDAR_MAX, arq.andares + (editavel ? 1 : 0)) }, (_, i) => ({
      andar: i + 1,
      celulas: ramosDoMapa.map(ramo => {
        const posicao = `${i + 1}${ramo}`;
        const no = arq.nos[posicao];
        if (!no) return editavel ? { vazio: true, posicao, rotulo: `Criar o andar ${i + 1} no ramo ${ramo.toUpperCase()}` } : null;
        const desvio = no.pai !== ENTRADA && no.pai !== `${i}${ramo}` ? no.pai.toUpperCase() : '';
        return { id: no.id.toUpperCase(), posicao, conteudos: no.conteudos.map(conteudo => rotuloDoConteudo(conteudo, atores)), desvio };
      })
    }));
    return Object.assign(contexto, {
      item, fonte, editavel,
      linhas: fonte.andares.map((linha, indice) => ({
        ...linha, indice, temDv: COM_DV.includes(linha.tipo), ehIce: linha.tipo === 'ice', ehDemonio: linha.tipo === 'demonio', ehNetrunner: linha.tipo === 'netrunner'
      })),
      tipos: TIPOS_DE_ANDAR, ramos: Object.fromEntries([...RAMOS].map(ramo => [ramo, ramo.toUpperCase()])), ices: ICES, demonios: NOMES_DOS_DEMONIOS, atores,
      dvDaArquitetura: arq.dv, mapa, ramosDoMapa: ramosDoMapa.map(ramo => ramo.toUpperCase()),
      descricaoRica: await foundry.applications.ux.TextEditor.implementation.enrichHTML(fonte.descricao, { relativeTo: item })
    });
  }

  // Arrastar os andares no mapa (o editor visual): o andar vai para a célula onde cai, vazia ou não.
  _onRender(contexto, opcoes) {
    super._onRender(contexto, opcoes);
    if (!this.isEditable) return;
    for (const no of this.element.querySelectorAll('.mapa-net .no[draggable]')) {
      no.addEventListener('dragstart', evento => {
        evento.dataTransfer.setData('text/plain', no.dataset.posicao);
        evento.dataTransfer.effectAllowed = 'move';
        no.classList.add('arrastando');
      });
      no.addEventListener('dragend', () => no.classList.remove('arrastando'));
    }
    for (const alvo of this.element.querySelectorAll('.mapa-net [data-posicao]')) {
      alvo.addEventListener('dragover', evento => { evento.preventDefault(); evento.dataTransfer.dropEffect = 'move'; alvo.classList.add('sobre'); });
      alvo.addEventListener('dragleave', () => alvo.classList.remove('sobre'));
      alvo.addEventListener('drop', evento => {
        evento.preventDefault();
        evento.stopPropagation();
        alvo.classList.remove('sobre');
        const andares = this.item._source.system.andares;
        const movidos = moverAndar(andares, evento.dataTransfer.getData('text/plain'), alvo.dataset.posicao);
        if (movidos !== andares) this.item.update({ 'system.andares': movidos });
      });
    }
  }

  // Os andares do formulário chegam como um objeto ({ 0: {...}, 1: {...} }), e o ArrayField do Foundry 14 os põe na
  // lista pelo índice; o que a linha não mostra (o Black ICE de uma linha que virou senha) volta ao valor inicial.

  static #novaLinha() {
    const andares = this.item._source.system.andares;
    return this.item.update({ 'system.andares': [...andares, novaLinha(andares)] });
  }
  // A dificuldade pela janela; os dados rolam sem cartão (como as tabelas do CORE), e cada andar guarda a tabela, a
  // rolagem e o resultado.
  static async #gerar() {
    const substitui = this.item._source.system.andares.length ? ' <b>Os andares de agora saem.</b>' : '';
    const dificuldade = await DialogV2.wait({
      window: { title: `${this.item.name}: gerar pelas tabelas` }, classes: [SISTEMA, 'gerar-arquitetura'], rejectClose: false,
      content: `<p>As tabelas do livro (RED p. 210–211): 3d6 andares, um ramo a mais a cada 7+ no 1d10, os 2 primeiros andares pelo lobby e os outros pela tabela da dificuldade.${substitui}</p>`,
      buttons: Object.entries(DIFICULDADES).map(([action, label]) => ({ action, label }))
    });
    if (!DIFICULDADES[dificuldade]) return null;
    const { andares } = await gerarAndares({ dificuldade, tabelas: TABELAS_DA_NET, rolar: async formula => (await new Roll(formula).evaluate()).total });
    return this.item.update({ 'system.andares': andares });
  }
  static #criarAndar(evento, alvo) {
    return this.item.update({ 'system.andares': criarAndar(this.item._source.system.andares, alvo.dataset.posicao) });
  }
  static #tirarLinha(evento, alvo) {
    const indice = Number(alvo.dataset.indice);
    return this.item.update({ 'system.andares': this.item._source.system.andares.filter((linha, i) => i !== indice) });
  }
}

// A janela da NET (a janela.mjs do NET Architect), por enquanto o começo dela: quem está na NET e onde, o mapa que os
// jogadores enxergam (os andares vistos e, como "?", os vizinhos de quem está conectado), o registro do netrun e o botão de
// desconectar. Abre para o dono do token conectado e para o mestre (a dele mostra todos). Andar, as habilidades, o deck e
// os inimigos vêm nas próximas partes do C8.
import { ENTRADA, RAMOS, TIPOS_DE_ANDAR } from '../arquitetura.mjs';
import { caminho, SISTEMA } from '../config.mjs';
import { estadoDoTile, pontoDoTile } from './estado.mjs';
import { pedir } from './socket.mjs';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

// O que a célula do mapa mostra de cada conteúdo visto.
function textoDoConteudo(conteudo) {
  if (conteudo.inimigo) return `${conteudo.inimigo.nome}${conteudo.inimigo.rez ? ` (REZ ${conteudo.inimigo.rezAtual}/${conteudo.inimigo.rez})` : ''}`;
  return `${TIPOS_DE_ANDAR[conteudo.tipo] ?? conteudo.tipo}${conteudo.dv ? ` DV ${conteudo.dv}` : ''}${conteudo.feito ? ' (aberto)' : ''}`;
}

export class JanelaDaNet extends HandlebarsApplicationMixin(ApplicationV2) {
  // As janelas abertas neste cliente, pela chave do Tile e de quem vê (o mestre ou o token).
  static abertas = new Map();
  static #chave = (tile, gm, tokenId) => `${tile.id}:${gm ? 'mestre' : tokenId}`;

  static abrir(tile, { gm = false, tokenId = null } = {}) {
    const chave = JanelaDaNet.#chave(tile, gm, tokenId);
    const janela = JanelaDaNet.abertas.get(chave) ?? new JanelaDaNet(tile, { gm, tokenId });
    JanelaDaNet.abertas.set(chave, janela);
    janela.render({ force: true });
    return janela;
  }

  static redesenhar(filtro = () => true) {
    for (const janela of JanelaDaNet.abertas.values()) if (filtro(janela)) janela.render();
  }

  constructor(tile, { gm = false, tokenId = null } = {}) {
    super({ id: `${SISTEMA}-net-${tile.id}-${gm ? 'mestre' : tokenId}` });
    Object.assign(this, { tile, gm, tokenId });
  }

  static DEFAULT_OPTIONS = {
    classes: [SISTEMA, 'janela-net', 'themed', 'theme-dark'],
    window: { icon: 'fa-solid fa-network-wired', resizable: true },
    position: { width: 600, height: 'auto' },
    actions: { desconectar: JanelaDaNet.#desconectar }
  };

  static PARTS = { corpo: { template: caminho('templates/netrun/janela.hbs'), scrollable: ['.registro ol'] } };

  get title() {
    return `NET: ${pontoDoTile(this.tile)?.nome ?? 'Ponto de acesso'}${this.gm ? ' (mestre)' : ''}`;
  }

  _onClose(opcoes) {
    super._onClose(opcoes);
    JanelaDaNet.abertas.delete(JanelaDaNet.#chave(this.tile, this.gm, this.tokenId));
  }

  async _prepareContext() {
    const est = estadoDoTile(this.tile) ?? { nos: [], corredores: [], log: [] };
    const lugarDe = id => est.nos.find(no => no.id === id);
    const corredores = est.corredores.map(corredor => {
      const no = lugarDe(corredor.no);
      return {
        ...corredor, eu: corredor.token === this.tokenId, podeDesconectar: this.gm || corredor.token === this.tokenId,
        onde: corredor.no === ENTRADA ? 'no ponto de acesso' : `no andar ${no?.andar ?? '?'}${no && no.ramo !== 'a' ? ` (ramo ${no.ramo.toUpperCase()})` : ''}`
      };
    });
    const colunas = Math.max(1, ...est.nos.map(no => RAMOS.indexOf(no.ramo) + 1));
    const andares = Math.max(0, ...est.nos.map(no => no.andar));
    const ramos = [...RAMOS].slice(0, colunas);
    const quemEsta = id => est.corredores.filter(corredor => corredor.no === id).map(corredor => corredor.nome);
    const mapa = Array.from({ length: andares }, (_, i) => ({
      andar: i + 1,
      celulas: ramos.map(ramo => {
        const no = lugarDe(`${i + 1}${ramo}`);
        return no ? { id: no.id, rotulo: no.id.toUpperCase(), visto: no.visto, conteudos: (no.conteudos ?? []).map(conteudo => ({ texto: textoDoConteudo(conteudo), feito: conteudo.feito })), corredores: quemEsta(no.id) } : null;
      })
    }));
    return {
      nome: pontoDoTile(this.tile)?.nome ?? 'Ponto de acesso', arquitetura: est.nome ?? '', dv: est.dv, corredores, ramos: ramos.map(ramo => ramo.toUpperCase()), mapa,
      naEntrada: quemEsta(ENTRADA), registro: [...(est.log ?? [])].reverse()
    };
  }

  static async #desconectar(evento, alvo) {
    try {
      await pedir('desconectar', { tile: this.tile.uuid, token: alvo.dataset.token });
    } catch (falha) {
      ui.notifications.warn(falha.message);
    }
  }
}

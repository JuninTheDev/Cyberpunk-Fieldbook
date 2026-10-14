// A janela da NET (a janela.mjs do NET Architect): quem está na NET e onde, o mapa (o jogador vê o que os jogadores
// enxergam; o mestre, a arquitetura inteira, com o que ainda está escondido), o andar escolhido no mapa (com "Ir para
// cá" nos vizinhos), as habilidades de Interface contra os andares e contra os inimigos (o Zap e o Slide, com o alvo), o
// comando no nó de controle tomado, a situação do netrunner (o fogo, o Kraken, o Skunk, o Wisp), o deck (ativar,
// desativar e atacar com os programas), o registro e, para o mestre, o painel dele (a vez dos inimigos, revelar, a REZ
// dos inimigos, zerar as Ações NET, derrubar, reiniciar). Abre para o dono do token conectado e para o mestre, que age
// pelo netrunner escolhido. O combate (os inimigos na iniciativa) vem na próxima parte do C8.
import { ENTRADA, RAMOS, TIPOS_DE_ANDAR } from '../arquitetura.mjs';
import { caminho, CLASSES_PROGRAMA, SISTEMA } from '../config.mjs';
import { HABILIDADES_DE_INTERFACE, programaDeAtaque } from '../regras.mjs';
import { STATUS_EM_CHAMAS } from './constantes.mjs';
import { arquiteturaDoPonto, emCombate, estadoDoTile, pontoDoTile } from './estado.mjs';
import { ehInimigo, HABILIDADES_NA_NET, inimigoAtivo, inimigoPublico, netrunnerDo } from './regras-da-net.mjs';
import { pedir } from './socket.mjs';

const { ApplicationV2, DialogV2, HandlebarsApplicationMixin } = foundry.applications.api;
const INIMIGOS = ['ice', 'demonio', 'netrunner'];
const SITUACAO = { senha: ['trancada', 'quebrada'], arquivo: ['por identificar', 'identificado'], controle: ['livre', 'tomado'] };

// O conteúdo de um andar como a janela mostra: o nome, o DV, a situação (a senha quebrada, o arquivo identificado, o nó
// tomado, a REZ do inimigo ou ele derrubado) e o que o arquivo é e o que o nó controla (no estado público, só depois de
// feitos; o mestre vê sempre); do inimigo, os números da wiki e o efeito.
function conteudoNaJanela(conteudo) {
  if (INIMIGOS.includes(conteudo.tipo)) {
    const inimigo = conteudo.inimigo ?? { nome: TIPOS_DE_ANDAR[conteudo.tipo] };
    const numeros = conteudo.tipo === 'ice' ? `PER ${inimigo.per} · SPD ${inimigo.spd} · ATK ${inimigo.atk} · DEF ${inimigo.def}`
      : conteudo.tipo === 'demonio' ? `Interface ${inimigo.interface} · ${inimigo.acoes} Ações NET · combate ${inimigo.valorDeCombate}` : '';
    const situacao = conteudo.tipo === 'netrunner' ? (conteudo.feito ? 'fora da NET' : 'na NET') : conteudo.feito ? 'derrubado' : `REZ ${inimigo.rezAtual}/${inimigo.rez}`;
    return { inimigo: true, chave: conteudo.chave, nome: inimigo.nome, tipo: TIPOS_DE_ANDAR[conteudo.tipo], feito: conteudo.feito, situacao, oQue: [numeros, inimigo.efeito].filter(Boolean).join('. '), comRez: Boolean(inimigo.rez) };
  }
  const [antes, depois] = SITUACAO[conteudo.tipo] ?? [];
  return {
    nome: TIPOS_DE_ANDAR[conteudo.tipo] ?? conteudo.tipo, dv: conteudo.dv, feito: conteudo.feito, situacao: conteudo.feito ? depois : antes,
    oQue: [conteudo.nome, conteudo.descricao].filter(Boolean).join(': ')
  };
}
const textoCurto = conteudo => (conteudo.inimigo ? `${conteudo.nome} (${conteudo.situacao})` : `${conteudo.nome}${conteudo.dv ? ` DV ${conteudo.dv}` : ''}${conteudo.feito ? ` (${conteudo.situacao})` : ''}`);

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
    for (const janela of JanelaDaNet.abertas.values()) if (janela.rendered && filtro(janela)) janela.render();
  }

  constructor(tile, { gm = false, tokenId = null } = {}) {
    super({ id: `${SISTEMA}-net-${tile.id}-${gm ? 'mestre' : tokenId}` });
    Object.assign(this, { tile, gm, tokenId, selecionado: null, ocupado: false, textos: { virus: '', comando: '' } });
  }

  static DEFAULT_OPTIONS = {
    classes: [SISTEMA, 'janela-net', 'themed', 'theme-dark'],
    window: { icon: 'fa-solid fa-network-wired', resizable: true },
    position: { width: 780, height: 'auto' },
    actions: {
      desconectar: JanelaDaNet.#desconectar, desconectarInseguro: JanelaDaNet.#desconectarInseguro, selecionar: JanelaDaNet.#selecionar, mover: JanelaDaNet.#mover,
      habilidade: JanelaDaNet.#habilidade, comandar: JanelaDaNet.#comandar, escolherCorredor: JanelaDaNet.#escolherCorredor, revelar: JanelaDaNet.#revelar,
      zerarAcoes: JanelaDaNet.#zerarAcoes, reiniciar: JanelaDaNet.#reiniciar, ajustarRez: JanelaDaNet.#ajustarRez, inimigoAtaca: JanelaDaNet.#inimigoAtaca,
      apagarFogo: JanelaDaNet.#apagarFogo, programa: JanelaDaNet.#programa
    }
  };

  static PARTS = { corpo: { template: caminho('templates/netrun/janela.hbs'), scrollable: ['.registro ol', '.mapa'] } };

  get title() {
    return `NET: ${pontoDoTile(this.tile)?.nome ?? 'Ponto de acesso'}${this.gm ? ' (mestre)' : ''}`;
  }

  _onClose(opcoes) {
    super._onClose(opcoes);
    JanelaDaNet.abertas.delete(JanelaDaNet.#chave(this.tile, this.gm, this.tokenId));
  }

  // O texto do vírus e do comando sobrevive aos redesenhos (cada mudança no Tile redesenha a janela).
  _onRender(contexto, opcoes) {
    super._onRender(contexto, opcoes);
    for (const campo of this.element.querySelectorAll('[data-texto]')) campo.addEventListener('input', evento => { this.textos[campo.dataset.texto] = evento.target.value; });
  }

  // Os andares desta janela: para o jogador, os que os jogadores enxergam; para o mestre, a arquitetura inteira, com a
  // marca do que os jogadores ainda não viram.
  #andares(est, arq) {
    if (!this.gm || !arq) return (est.nos ?? []).map(no => ({ ...no, publico: true }));
    const publicos = new Set((est.nos ?? []).filter(no => no.visto).map(no => no.id));
    const feitos = new Set(est.feitos ?? []);
    const estado = { ices: est.ices ?? [], fora: est.fora ?? [] };
    return Object.values(arq.nos).map(no => ({
      id: no.id, andar: no.andar, ramo: no.ramo, pai: no.pai, visto: true, publico: publicos.has(no.id) || Boolean(est.mapa),
      conteudos: no.conteudos.map(conteudo => (ehInimigo(conteudo)
        ? { ...conteudo, inimigo: inimigoPublico(estado, conteudo), feito: !inimigoAtivo(estado, conteudo) }
        : { ...conteudo, feito: feitos.has(conteudo.chave) }))
    }));
  }

  async _prepareContext() {
    const ponto = pontoDoTile(this.tile) ?? {};
    const est = estadoDoTile(this.tile) ?? { nos: [], corredores: [], log: [] };
    // O mestre age pelo netrunner escolhido (o primeiro, se o escolhido saiu da NET).
    if (this.gm && !est.corredores.some(corredor => corredor.token === this.tokenId)) this.tokenId = est.corredores[0]?.token ?? null;
    const arq = this.gm ? await arquiteturaDoPonto(ponto).catch(() => null) : null;
    const andares = this.#andares(est, arq);
    const porId = Object.fromEntries(andares.map(no => [no.id, no]));
    const meu = est.corredores.find(corredor => corredor.token === this.tokenId) ?? null;
    const aqui = meu?.no ?? null;
    const vizinhos = new Set(aqui ? [porId[aqui]?.pai, ...andares.filter(no => no.pai === aqui).map(no => no.id)].filter(Boolean) : []);
    // O andar escolhido que sumiu do mapa (a arquitetura editada no meio da corrida) volta para onde o netrunner está, ou
    // para o ponto de acesso.
    if (this.selecionado !== ENTRADA && !porId[this.selecionado]) this.selecionado = porId[aqui] ? aqui : ENTRADA;
    const selecionado = this.selecionado;
    const ondeEsta = id => (id === ENTRADA ? 'no ponto de acesso' : porId[id] ? `no andar ${porId[id].andar}${porId[id].ramo !== 'a' ? ` (ramo ${porId[id].ramo.toUpperCase()})` : ''}` : 'na arquitetura');
    const quemEsta = id => est.corredores.filter(corredor => corredor.no === id).map(corredor => corredor.nome);

    // O mapa: uma linha por andar, uma coluna por ramo.
    const colunas = Math.max(1, ...andares.map(no => RAMOS.indexOf(no.ramo) + 1));
    const ramos = [...RAMOS].slice(0, colunas);
    const mapa = Array.from({ length: Math.max(0, ...andares.map(no => no.andar)) }, (_, i) => ({
      andar: i + 1,
      celulas: ramos.map(ramo => {
        const no = porId[`${i + 1}${ramo}`];
        if (!no) return null;
        const conteudos = (no.conteudos ?? []).map(conteudoNaJanela);
        const classes = [no.visto ? '' : 'desconhecido', no.id === aqui ? 'atual' : '', vizinhos.has(no.id) ? 'vizinho' : '', no.id === selecionado ? 'selecionado' : '',
          no.publico ? '' : 'escondido', no.visto && conteudos.length && conteudos.every(conteudo => conteudo.feito) ? 'feito' : ''].filter(Boolean).join(' ');
        return { id: no.id, rotulo: no.id.toUpperCase(), visto: no.visto, classes, conteudos: conteudos.map(textoCurto), corredores: quemEsta(no.id) };
      })
    }));

    // O andar escolhido no mapa.
    const escolhido = porId[selecionado];
    const andar = {
      id: selecionado, entrada: selecionado === ENTRADA, visto: selecionado === ENTRADA || Boolean(escolhido?.visto), escondido: Boolean(escolhido && !escolhido.publico),
      titulo: selecionado === ENTRADA ? 'Ponto de acesso' : `Andar ${escolhido.andar}${escolhido.ramo !== 'a' ? ` · ramo ${escolhido.ramo.toUpperCase()}` : ''}`,
      conteudos: (escolhido?.conteudos ?? []).map(conteudoNaJanela), ir: Boolean(meu) && vizinhos.has(selecionado)
    };

    // O netrunner por quem esta janela age: a Interface, as Ações NET, a Sorte preparada na ficha e as habilidades que
    // dão aqui (pelo que há no andar onde ele está).
    let netrunner = null;
    if (meu) {
      const token = this.tile.parent.tokens.get(meu.token);
      const ator = token?.actor ?? null;
      const conteudosAqui = porId[aqui]?.conteudos ?? [];
      const naoFeito = tipo => conteudosAqui.some(conteudo => conteudo.tipo === tipo && !conteudo.feito);
      const fundo = aqui !== ENTRADA && !andares.some(no => no.pai === aqui);
      const pronto = Boolean(ator && netrunnerDo(ator).deck && ator.system.rankDeInterface);
      const combate = Boolean(token && emCombate(token));
      // Os inimigos ativos aqui: o alvo do Zap (qualquer um) e do Slide (o Black ICE; uma vez por turno em combate).
      const inimigos = conteudosAqui.filter(conteudo => ehInimigo(conteudo) && !conteudo.feito);
      if (!inimigos.some(conteudo => conteudo.chave === this.textos.alvo)) this.textos.alvo = inimigos[0]?.chave ?? '';
      const pode = {
        pathfinder: true, cloak: true, backdoor: naoFeito('senha'), eyedee: naoFeito('arquivo'), control: naoFeito('controle'), virus: fundo,
        zap: inimigos.length > 0, slide: inimigos.some(conteudo => conteudo.tipo === 'ice') && !(combate && meu.slides > 0)
      };
      netrunner = {
        nome: meu.nome, rank: ator?.system.rankDeInterface ?? 0, onde: ondeEsta(aqui), pronto, combate, sobram: Math.max(0, meu.max - meu.acoes), max: meu.max,
        sorte: ator?.sortePreparada ?? 0, fundo, textos: this.textos,
        controle: conteudosAqui.some(conteudo => conteudo.tipo === 'controle' && conteudo.feito),
        alvos: inimigos.length > 1 ? inimigos.map(conteudo => ({ chave: conteudo.chave, nome: textoCurto(conteudoNaJanela(conteudo)), escolhido: conteudo.chave === this.textos.alvo })) : [],
        // A situação: o fogo do Hellhound (com o botão de apagar), a prisão do Kraken, o −2 no Slide do Skunk ativo e a Ação
        // NET a menos do Wisp.
        emChamas: Boolean(ator?.statuses?.has(STATUS_EM_CHAMAS)), preso: meu.preso > 0, menosAcoes: Boolean(meu.menosAcoes),
        skunk: (n => (n ? '−' + (2 * n) : ''))((meu.skunks ?? []).filter(chave => andares.some(no => (no.conteudos ?? []).some(conteudo => conteudo.chave === chave && !conteudo.feito))).length),
        // O deck: os programas instalados no deck equipado. Ativar ou desativar (em combate, uma vez por rodada; o que tem
        // REZ, não em 0); atacar, com o programa de ataque ativo e um alvo da classe dele no andar.
        deck: ator ? netrunnerDo(ator).deck?.name ?? '' : '',
        programas: (ator ? netrunnerDo(ator).programas : []).map(programa => {
          const s = programa.system;
          const naRodada = combate && (meu.programasNaRodada ?? []).includes(programa.id);
          const antipessoal = s.classe === 'antipersonnelattacker';
          const comAlvo = inimigos.some(conteudo => (conteudo.tipo === 'netrunner') === antipessoal);
          return {
            id: programa.id, nome: programa.name, classe: CLASSES_PROGRAMA[s.classe] ?? s.classe, ativo: s.ativo,
            numeros: [s.atk ? `ATK ${s.atk}` : '', s.def ? `DEF ${s.def}` : '', s.rez ? `REZ ${programa.rezAtual}/${s.rez}` : ''].filter(Boolean).join(' · '),
            podeMudar: pronto && !this.ocupado && !naRodada && (s.ativo || !s.rez || programa.rezAtual > 0),
            podeAtacar: pronto && !this.ocupado && programaDeAtaque(s.classe) && s.ativo && comAlvo
          };
        }),
        habilidades: Object.keys(HABILIDADES_NA_NET).map(id => {
          const { rotulo, custo, dica } = HABILIDADES_DE_INTERFACE.find(habilidade => habilidade.id === id);
          return { id, rotulo, dica: `${custo}. ${dica}`, pode: pronto && pode[id] && !this.ocupado };
        })
      };
    }

    const corredores = est.corredores.map(corredor => ({
      ...corredor, eu: corredor.token === this.tokenId, podeDesconectar: this.gm || corredor.token === this.tokenId, onde: ondeEsta(corredor.no)
    }));
    return {
      nome: ponto.nome ?? 'Ponto de acesso', arquitetura: est.nome ?? '', dv: est.dv, mapaRevelado: Boolean(est.mapa), gm: this.gm, ocupado: this.ocupado,
      corredores, ramos: ramos.map(ramo => ramo.toUpperCase()), mapa, naEntrada: quemEsta(ENTRADA),
      entrada: { classes: [aqui === ENTRADA ? 'atual' : '', vizinhos.has(ENTRADA) ? 'vizinho' : '', selecionado === ENTRADA ? 'selecionado' : ''].filter(Boolean).join(' ') },
      andar, netrunner, registro: [...(est.log ?? [])].reverse(),
      mestre: this.gm && {
        revelarAndar: andar.escondido && !andar.entrada, revelarMapa: !est.mapa, comCorredor: Boolean(meu), semNinguem: !est.corredores.length,
        inimigos: andar.conteudos.filter(conteudo => conteudo.inimigo && conteudo.comRez),
        // A vez dos inimigos: os que podem atacar o netrunner escolhido (os ativos no andar dele, menos o Black ICE que ele
        // driblou com o Slide).
        ataques: meu ? (porId[aqui]?.conteudos ?? []).filter(conteudo => ehInimigo(conteudo) && !conteudo.feito && (conteudo.tipo !== 'ice' || !(meu.escapou ?? []).includes(conteudo.chave)))
          .map(conteudo => ({ chave: conteudo.chave, nome: conteudo.inimigo?.nome ?? conteudo.tipo, contra: meu.nome })) : []
      }
    };
  }

  // O pedido ao mestre ativo, com a janela "ocupada" enquanto ele resolve (a rolagem sai no chat).
  async #pedir(op, dados = {}) {
    if (this.ocupado) return null;
    this.ocupado = true;
    this.render();
    try {
      return await pedir(op, { tile: this.tile.uuid, token: this.tokenId, ...dados });
    } catch (falha) {
      ui.notifications.warn(falha.message);
      return null;
    } finally {
      this.ocupado = false;
      if (this.rendered) this.render();
    }
  }

  static async #desconectar(evento, alvo) {
    try {
      await pedir('desconectar', { tile: this.tile.uuid, token: alvo.dataset.token });
    } catch (falha) {
      ui.notifications.warn(falha.message);
    }
  }

  static async #desconectarInseguro() {
    if (!this.gm) {
      const certo = await DialogV2.confirm({ window: { title: 'Desconexão insegura' }, content: '<p>Arrancar o plugue? Sai na hora, sem gastar Ação NET; o Black ICE que te encontrou e ainda está ativo age de graça.</p>', rejectClose: false });
      if (!certo) return;
    }
    await this.#pedir('desconectar', { inseguro: true, motivo: this.gm ? 'o mestre derrubou' : '' });
  }

  static #selecionar(evento, alvo) {
    this.selecionado = alvo.dataset.no;
    this.render();
  }

  static async #mover(evento, alvo) {
    if (await this.#pedir('mover', { destino: alvo.dataset.no })) this.selecionado = alvo.dataset.no;
  }

  static async #habilidade(evento, alvo) {
    const habilidade = alvo.dataset.habilidade;
    if (await this.#pedir('habilidade', { habilidade, texto: habilidade === 'virus' ? this.textos.virus : '', alvo: this.textos.alvo }) && habilidade === 'virus') this.textos.virus = '';
  }

  static async #comandar() {
    if (await this.#pedir('comandar', { texto: this.textos.comando })) this.textos.comando = '';
  }

  static #escolherCorredor(evento, alvo) {
    if (!this.gm) return;
    this.tokenId = alvo.dataset.token;
    this.render();
  }

  static async #revelar(evento, alvo) {
    await this.#pedir('revelar', { no: alvo.dataset.no, tudo: Boolean(alvo.dataset.tudo) });
  }

  static async #ajustarRez(evento, alvo) {
    await this.#pedir('ajustarRez', { alvo: alvo.dataset.alvo, delta: Number(alvo.dataset.delta) || 0, cheia: Boolean(alvo.dataset.cheia) });
  }

  static async #inimigoAtaca(evento, alvo) {
    await this.#pedir('inimigoAtaca', { alvo: alvo.dataset.alvo });
  }

  static async #programa(evento, alvo) {
    await this.#pedir('programa', { programa: alvo.dataset.programa, acao: alvo.dataset.acao, alvo: this.textos.alvo });
  }

  static async #apagarFogo() {
    await this.#pedir('apagarFogo');
  }

  static async #zerarAcoes() {
    await this.#pedir('zerarAcoes');
  }

  static async #reiniciar() {
    const certo = await DialogV2.confirm({ window: { title: 'Reiniciar a arquitetura' }, content: '<p>O Black ICE e os demônios de volta, as senhas e os nós trancados, o mapa escondido e o registro do começo.</p>', rejectClose: false });
    if (certo) await this.#pedir('reiniciar');
  }
}

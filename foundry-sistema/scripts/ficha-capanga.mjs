// Ficha do capanga (o mook do CORE): uma página só, para o mestre ver o NPC de uma vez. O cabeçalho (o HP, a SP, a
// iniciativa e a esquiva; se é a ficha do ator ou a de um token), o painel geral da ficha do personagem (atributos,
// vitais, perícias, armadura vestida, cyberware instalado e lesões), a tabela de armas com os ataques, os itens e as notas.
// As ações são as da ficha do personagem. Arrastar um item para a ficha já equipa ou instala (regras.AO_RECEBER_CAPANGA).
// Quem só tem a permissão Limitada vê a imagem, o nome e as notas, como no CORE.
import { ehArmaDoCyberware } from './armas-cyberware.mjs';
import { caminho, USOS } from './config.mjs';
import { bloco, FichaPersonagem } from './ficha-personagem.mjs';
import { AO_RECEBER_CAPANGA } from './regras.mjs';
import { divisaoDaPilha } from './regras-inventario.mjs';

const modelo = arquivo => caminho(`templates/capanga/${arquivo}.hbs`);

export class FichaCapanga extends FichaPersonagem {
  static DEFAULT_OPTIONS = {
    classes: ['ficha-capanga'],
    position: { width: 980, height: 860 }
  };

  static PARTS = {
    topo: { template: modelo('topo') },
    corpo: { template: modelo('corpo'), templates: [bloco('geral'), bloco('armas'), bloco('agarrao')], scrollable: [''] },
    rodape: { template: modelo('rodape') }
  };

  // Sem abas: tudo numa página.
  static TABS = {};

  // A ficha limitada (o cpr-mook-sheet-limited.hbs do CORE): o jogador que o mestre deixou só com a permissão Limitada vê
  // a imagem, o nome e as notas, numa janela menor. O mestre vê sempre a ficha inteira.
  static #limitado = ator => !game.user.isGM && Boolean(ator?.limited);
  _initializeApplicationOptions(options) {
    const opcoes = super._initializeApplicationOptions(options);
    if (FichaCapanga.#limitado(options.document)) Object.assign(opcoes.position, { width: 560, height: 'auto' });
    return opcoes;
  }
  _configureRenderParts(options) {
    if (!FichaCapanga.#limitado(this.actor)) return super._configureRenderParts(options);
    return { limitado: { template: modelo('limitado'), templates: [], scrollable: [''] } };
  }

  async _prepareContext(options) {
    const contexto = await super._prepareContext(options);
    const ordem = Object.keys(CONFIG.Item.dataModels);
    // Todos os itens, menos as lesões (no painel geral) e a arma do cyberware (na tabela de armas; ela sai com ele), por
    // tipo e nome, com o botão de cada tipo.
    const itens = this.actor.items.filter(item => item.type !== 'lesao' && !ehArmaDoCyberware(item))
      .sort((a, b) => ordem.indexOf(a.type) - ordem.indexOf(b.type) || a.name.localeCompare(b.name, 'pt-BR'))
      .map(item => ({ id: item.id, nome: item.name, img: item.img, divisivel: Boolean(divisaoDaPilha(item.type, item.system.quantidade, 1)), tipo: game.i18n.localize(CONFIG.Item.typeLabels[item.type]), detalhe: detalheDoItem(item), ...botaoDoItem(item) }));
    // Na ficha de um token, o nome é o do token (o que a cena mostra).
    return Object.assign(contexto, { capanga: true, naCena: this.actor.isToken, nomeNaFicha: this.token?.name ?? this.actor.name, itensDoCapanga: itens });
  }

  // Mudar o nome na ficha de um token muda também o do token na cena, como o mook do CORE (_changeMookName); os outros
  // capangas do mesmo ator ficam com o deles.
  async _processSubmitData(evento, form, dados, opcoes) {
    if (this.token && typeof dados.name === 'string' && dados.name !== this.token.name) await this.token.update({ name: dados.name });
    return super._processSubmitData(evento, form, dados, opcoes);
  }

  // Arrastar um item para o capanga já equipa ou instala, como o mook do CORE. O cyberware rola a perda de Humanidade,
  // como o botão Instalar; com Shift, a média. Reordenar na própria ficha não muda nada.
  async _onDropItem(evento, item) {
    const daFicha = this.actor.uuid === item.parent?.uuid;
    const criado = await super._onDropItem(evento, item);
    const acao = criado && !daFicha ? AO_RECEBER_CAPANGA[criado.type] : null;
    if (acao === 'instalar') await this.actor.instalarCyberware(criado, { rolar: !evento.shiftKey });
    // O item já equipado na origem foi conferido pelo drop da ficha do personagem; não tente uma segunda vez.
    else if (acao && !(item.system.equipada && (item.type === 'arma' || (item.type === 'armadura' && item.system.escudo)))) await criado.update(acao);
    return criado;
  }
}

// O detalhe de cada item na lista: o dano e o pente da arma, a SP da armadura, os tiros da munição, a quantidade.
function detalheDoItem(item) {
  const s = item.system;
  if (item.type === 'arma') return [item.danoDaArma, s.pente.max ? `pente ${s.pente.value}/${s.pente.max}` : ''].filter(Boolean).join(' · ');
  if (item.type === 'armadura') return ['cabeca', 'corpo'].filter(local => s.sp[local].max).map(local => `${local === 'cabeca' ? 'cabeça' : 'corpo'} ${s.sp[local].value}/${s.sp[local].max}`).join(' · ');
  if (item.type === 'municao') return `${s.quantidade} tiros`;
  return s.quantidade > 1 ? `×${s.quantidade}` : '';
}

// O botão de cada tipo: a arma e a armadura equipam (a armadura veste), o cyberware instala, o que tem uso passa por
// equipado, carregando e guardado.
function botaoDoItem(item) {
  const s = item.system;
  if (item.type === 'arma') return { acao: 'equipar', ligado: s.equipada, rotulo: s.equipada ? 'Equipada' : 'Guardada' };
  if (item.type === 'armadura') return { acao: 'equipar', ligado: s.equipada, rotulo: s.equipada ? 'Vestida' : 'Guardada' };
  if (item.type === 'cyberware') {
    return { acao: 'instalar', ligado: s.instalado, rotulo: s.instalado ? 'Instalado' : 'Instalar', dica: s.instalado ? 'Tirar (a Humanidade perdida não volta)' : 'Instalar: rola a perda de Humanidade (Shift: a média)' };
  }
  if (s.uso) return { acao: 'mudarUso', ligado: s.uso === 'equipado', rotulo: USOS[s.uso] ?? s.uso, dica: 'Equipado, carregando ou guardado' };
  return {};
}

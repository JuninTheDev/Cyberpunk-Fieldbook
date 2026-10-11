// Ficha do personagem (ApplicationV2 do Foundry 14): cabeçalho com os vitais, e abas de atributos e combate, perícias,
// equipamento, cyberware e notas. Rola pela ficha: clique no atributo, na perícia ou nos botões da arma.
import { ATRIBUTOS, caminho, ESTILOS_ROUPA, QUALIDADES, SIGLA, SISTEMA, TIPOS_CYBERWARE, TIPOS_ROUPA, USOS } from './config.mjs';
import { FAMILIAS, PERICIAS } from './gerado.mjs';

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;
const parte = arquivo => ({ template: caminho(`templates/personagem/${arquivo}.hbs`) });

export class FichaPersonagem extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: [SISTEMA, 'ficha-personagem'],
    position: { width: 820, height: 860 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      rolarAtributo: FichaPersonagem.#rolarAtributo,
      rolarPericia: FichaPersonagem.#rolarPericia,
      atacar: FichaPersonagem.#atacar,
      mirar: FichaPersonagem.#mirar,
      deathSave: FichaPersonagem.#deathSave,
      zerarDeathSave: FichaPersonagem.#zerarDeathSave,
      rolarDano: FichaPersonagem.#rolarDano,
      recarregar: FichaPersonagem.#recarregar,
      equipar: FichaPersonagem.#equipar,
      mudarUso: FichaPersonagem.#mudarUso,
      instalar: FichaPersonagem.#instalar,
      editarItem: FichaPersonagem.#editarItem,
      apagarItem: FichaPersonagem.#apagarItem
    }
  };

  static PARTS = {
    cabecalho: parte('cabecalho'),
    tabs: { template: 'templates/generic/tab-navigation.hbs' },
    principal: { ...parte('principal'), scrollable: [''] },
    pericias: { ...parte('pericias'), scrollable: [''] },
    equipamento: { ...parte('equipamento'), scrollable: [''] },
    cyberware: { ...parte('cyberware'), scrollable: [''] },
    notas: { ...parte('notas'), scrollable: [''] }
  };

  static TABS = {
    primary: {
      tabs: [
        { id: 'principal', label: 'Atributos e combate' }, { id: 'pericias', label: 'Perícias' }, { id: 'equipamento', label: 'Equipamento' },
        { id: 'cyberware', label: 'Cyberware' }, { id: 'notas', label: 'Notas' }
      ],
      initial: 'principal'
    }
  };

  async _prepareContext(options) {
    const contexto = await super._prepareContext(options);
    const ator = this.actor;
    const s = ator.system;
    const fonte = ator._source.system;
    const itens = tipo => ator.items.filter(item => item.type === tipo).sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name, 'pt-BR'));
    const linhaArma = arma => {
      const { partes } = arma.partesDoAtaque();
      return { id: arma.id, nome: arma.name, img: arma.img, sistema: arma.system, ataque: partes.reduce((soma, p) => soma + p.valor, 0), municao: arma.municaoCarregada?.name ?? '', qualidade: QUALIDADES[arma.system.qualidade] ?? '' };
    };
    // Perícias: as comuns sempre (nível 0 também), e as de família que o personagem tem, no grupo da família.
    const linhaPericia = id => {
      const p = s.pericia(id);
      return { ...p, sigla: SIGLA[p.atributo], total: s.atributos[p.atributo].valor + p.nivel + p.bonus + s.penalidade };
    };
    // Inventário: um detalhe de cada tipo e o uso (o botão passa por equipado, carregando e guardado).
    const vezes = item => (item.system.quantidade > 1 ? `×${item.system.quantidade}` : '');
    const linhaDoInventario = (item, ...detalhes) => ({
      id: item.id, nome: item.name, img: item.img, detalhe: detalhes.filter(Boolean).join(' · '), equipado: item.system.uso === 'equipado', usoNome: USOS[item.system.uso] ?? item.system.uso
    });
    const grupos = new Map();
    const noGrupo = (grupo, linha) => { if (!grupos.has(grupo)) grupos.set(grupo, []); grupos.get(grupo).push(linha); };
    for (const p of PERICIAS) noGrupo(p.grupo, linhaPericia(p.id));
    for (const [id, propria] of Object.entries(s.pericias)) if (propria.familia) noGrupo(FAMILIAS[propria.familia]?.grupo || 'Educação', linhaPericia(id));
    return Object.assign(contexto, {
      ator, sistema: s, fonte, editavel: this.isEditable,
      atributos: ATRIBUTOS.map(chave => ({ chave, sigla: SIGLA[chave], valor: s.atributos[chave].valor, base: fonte.atributos[chave].valor })),
      armas: itens('arma').map(linhaArma),
      armaduras: itens('armadura'),
      lesoes: itens('lesao').map(item => ({ id: item.id, nome: item.name, img: item.img, sistema: item.system, resumo: item.system.descricao.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' Paliativo:')[0] })),
      deathSavePenalidade: s.deathSave.base + s.deathSave.penalidade,
      municoes: itens('municao'),
      inventario: [
        { titulo: 'Equipamento', vazio: 'Sem equipamento.', itens: itens('equipamento').map(item => linhaDoInventario(item, vezes(item), item.effects.filter(e => e.active).map(e => e.name).join(', '))) },
        { titulo: 'Roupas', vazio: 'Sem roupas.', itens: itens('roupa').map(item => linhaDoInventario(item, vezes(item), TIPOS_ROUPA[item.system.tipo], ESTILOS_ROUPA[item.system.estilo])) },
        { titulo: 'Drogas', vazio: 'Sem drogas.', itens: itens('droga').map(item => linhaDoInventario(item, `${item.system.quantidade} ${item.system.quantidade === 1 ? 'dose' : 'doses'}`)) }
      ],
      cyberwares: itens('cyberware').map(item => ({ id: item.id, nome: item.name, img: item.img, sistema: item.system, tipo: TIPOS_CYBERWARE[item.system.tipo] ?? item.system.tipo, efeitos: item.effects.map(e => e.name).join(', ') })),
      grupos: [...grupos.entries()].sort(([a], [b]) => a.localeCompare(b, 'pt-BR')).map(([nome, pericias]) => ({ nome, pericias: pericias.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')) })),
      habilidades: Object.entries(s.role.habilidades).map(([nome, rank]) => ({ nome, rank })),
      notasRicas: await foundry.applications.ux.TextEditor.implementation.enrichHTML(s.notas, { relativeTo: ator, secrets: ator.isOwner })
    });
  }

  async _preparePartContext(partId, contexto, options) {
    contexto = await super._preparePartContext(partId, contexto, options);
    if (contexto.tabs?.[partId]) contexto.tab = contexto.tabs[partId];
    return contexto;
  }

  // ---------------- Ações ----------------
  #item(alvo) {
    return this.actor.items.get(alvo.closest('[data-item-id]')?.dataset.itemId);
  }
  static #rolarAtributo(evento, alvo) { return this.actor.rolarAtributo(alvo.dataset.atributo); }
  static #rolarPericia(evento, alvo) { return this.actor.rolarPericia(alvo.dataset.pericia); }
  static #atacar(evento, alvo) { return this.#item(alvo)?.atacar({ local: alvo.dataset.local || 'corpo', modo: alvo.dataset.modo || null }); }
  // Tiro (ou golpe) mirado: escolhe o local e ataca.
  static async #mirar(evento, alvo) {
    const item = this.#item(alvo);
    if (!item) return null;
    const local = await foundry.applications.api.DialogV2.wait({
      window: { title: `Mirar com ${item.name}` }, classes: [SISTEMA, 'mirar'], rejectClose: false,
      content: '<p>Onde mirar? O ataque leva −8.</p><ul><li><b>Cabeça:</b> o dano que passa da armadura dobra.</li><li><b>Perna:</b> se passar dano, Perna quebrada.</li><li><b>Item na mão:</b> se passar dano, o alvo larga o item.</li></ul>',
      buttons: [{ action: 'cabeca', label: 'Cabeça', default: true }, { action: 'perna', label: 'Perna' }, { action: 'item', label: 'Item na mão' }]
    });
    return local ? item.atacar({ local }) : null;
  }
  static #deathSave() { return this.actor.rolarDeathSave(); }
  static #zerarDeathSave() { return this.actor.zerarDeathSave(); }
  static #rolarDano(evento, alvo) { return this.#item(alvo)?.rolarDano(); }
  static #recarregar(evento, alvo) { return this.#item(alvo)?.recarregar(); }
  static #equipar(evento, alvo) {
    const item = this.#item(alvo);
    return item?.update({ 'system.equipada': !item.system.equipada });
  }
  static #mudarUso(evento, alvo) {
    const item = this.#item(alvo);
    if (!item) return null;
    const ordem = Object.keys(USOS);
    return item.update({ 'system.uso': ordem[(ordem.indexOf(item.system.uso) + 1) % ordem.length] });
  }
  static #instalar(evento, alvo) {
    const item = this.#item(alvo);
    if (!item) return null;
    return item.system.instalado ? this.actor.desinstalarCyberware(item) : this.actor.instalarCyberware(item, { rolar: !evento.shiftKey });
  }
  static #editarItem(evento, alvo) { return this.#item(alvo)?.sheet.render(true); }
  static async #apagarItem(evento, alvo) {
    const item = this.#item(alvo);
    if (!item) return;
    const ok = await foundry.applications.api.DialogV2.confirm({ window: { title: 'Apagar item' }, content: `<p>Apagar <b>${foundry.utils.escapeHTML(item.name)}</b> da ficha?</p>` });
    if (ok) await item.delete();
  }
}

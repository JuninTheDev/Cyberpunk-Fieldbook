// A janela "Personagens da wiki" (só o mestre), com o botão na aba de Atores: cada personagem da wiki com onde ele está
// (neste mundo; no Foundry 12; o ator do Foundry 14 apagado ou em outro mundo) e o que dá para fazer aqui (importar da
// criação, importar da ficha da mesa, importar de novo quando o ator deste Foundry sumiu, abrir a ficha) e os pedidos da
// loja que esperam o mestre (aprovar, que entrega na hora, ou recusar). Os avisos da última importação ficam no alto.
import { caminho, SISTEMA } from './config.mjs';
import * as wiki from './wiki.mjs';
import { mudouDeCampanha } from './wiki-campanha.mjs';
import { estadoDeEnvioDaWiki } from './wiki-avisos.mjs';

const { ApplicationV2, DialogV2, HandlebarsApplicationMixin } = foundry.applications.api;
const atorDa = wikiId => game.actors.find(ator => ator.getFlag(SISTEMA, 'wiki')?.id === wikiId && !ator.getFlag(SISTEMA, 'saiu')) ?? null;
const quando = data => (data ? new Date(data).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '');

export class JanelaDaWiki extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: `${SISTEMA}-wiki`,
    classes: [SISTEMA, 'janela-wiki'],
    position: { width: 680, height: 640 },
    window: { title: 'Personagens da wiki', icon: 'fa-solid fa-address-book', resizable: true },
    actions: {
      importar: JanelaDaWiki.#importar,
      importarDaMesa: JanelaDaWiki.#importarDaMesa,
      abrir: JanelaDaWiki.#abrir,
      atualizar: JanelaDaWiki.#atualizar,
      avisos: JanelaDaWiki.#avisos,
      aprovar: JanelaDaWiki.#aprovar,
      recusar: JanelaDaWiki.#recusar,
      recarregar: JanelaDaWiki.#recarregar
    }
  };

  static PARTS = { lista: { template: caminho('templates/wiki.hbs'), scrollable: [''] } };

  // O resultado da última ação (importação ou pedido), com os avisos.
  #ultimo = null;

  async _prepareContext(options) {
    const contexto = await super._prepareContext(options);
    const jogadores = { '': 'Sem dono', ...Object.fromEntries(game.users.filter(u => !u.isGM).map(u => [u.id, u.name])) };
    try {
      const { personagens, pedidos, campanha, avisos, ajuda } = await wiki.personagensDaWiki();
      const dono = nome => game.users.find(u => !u.isGM && u.name.toLowerCase() === String(nome || '').toLowerCase())?.id ?? '';
      return Object.assign(contexto, {
        ultimo: this.#ultimo, jogadores, campanha, avisos, ajuda,
        personagens: personagens.map(p => {
          const ator = atorDa(p.id);
          // Onde ele está: neste mundo; senão, o vínculo deste Foundry (o ator apagado, ou em outro mundo), o do Foundry 12 e
          // a ficha da mesa. Uma wiki sem os vínculos à parte (foundry12, foundry14) cai no "Importado em outro mundo".
          const no14 = p.foundry14;
          const nomeDe = vinculo => vinculo.nomeAtor || vinculo.ator;
          const frases = ator ? [`Neste mundo: ${ator.name}.`] : [
            no14?.removido ? `O ator do Foundry 14 (${nomeDe(no14)}) foi apagado em ${quando(no14.removido)}.` : no14 ? `No Foundry 14, o ator ${nomeDe(no14)} não está neste mundo.` : '',
            p.foundry12 ? `No Foundry 12: ${nomeDe(p.foundry12)}.` : '',
            p.mesa ? `Ficha da mesa do Foundry ${p.mesa.geracao ?? 12}${p.mesa.hp ? ` (HP ${p.mesa.hp.atual}/${p.mesa.hp.max})` : ''}, de ${quando(p.mesa.recebido)}.` : ''
          ].filter(Boolean);
          if (estadoDeEnvioDaWiki(p)) frases.push(`Enviado pelo jogador em ${quando(p.envio.quando)}: ${ator ? 'aguarda atualização' : 'aguarda importação'}.`);
          const crossover = mudouDeCampanha(p);
          const situacao = crossover ? `Veio de outra campanha. Ao importar, traz a ficha completa se o mundo antigo já a mandou; sem ela, vem a criação da wiki. ${frases.join(' ')}`
            : frases.join(' ') || (p.foundry?.importado ? 'Importado em outro mundo.' : 'Ainda não foi para o Foundry.');
          return {
            id: p.id, nome: p.nome || 'Sem nome', campanhaNome: campanha?.erro ? campanha.lista.find(c => c.id === p.campanha)?.nome || p.campanha : '', apelido: p.apelido, role: p.role ? p.role[0].toUpperCase() + p.role.slice(1) : '', donoNome: p.donoNome || 'sem dono', ator: Boolean(ator),
            mesa: Boolean(p.mesa), mesaDoFoundry: p.mesa?.geracao ?? 12, reimportar: Boolean(no14), situacao, donoSugerido: dono(p.donoNome)
          };
        }),
        pedidos: pedidos.map(({ wikiId, nome, pedido }) => ({
          wikiId, nome, id: pedido.id, total: pedido.total, erro: pedido.erro || '', nota: pedido.nota || '', temAtor: !campanha?.erro && Boolean(atorDa(wikiId)), podeRecusar: !campanha?.erro,
          itens: (pedido.itens || []).map(linha => `${linha.nome}${linha.qtd > 1 ? ` ×${linha.qtd}` : ''}`).join(', ')
        }))
      });
    } catch (erro) {
      return Object.assign(contexto, { erro: erro.message, ultimo: this.#ultimo, jogadores, personagens: [], pedidos: [] });
    }
  }

  async #importarCom(alvo, importar) {
    const id = alvo.closest('[data-wiki-id]')?.dataset.wikiId;
    if (!id) return null;
    const dono = this.element.querySelector(`select[name="dono-${id}"]`)?.value || '';
    alvo.disabled = true;
    try {
      const { ator, notas } = await importar(id, dono);
      this.#ultimo = { titulo: `${ator.name}: importado.`, notas };
    } catch (erro) {
      this.#ultimo = { titulo: 'A importação não deu certo.', notas: [erro.message], erro: true };
    }
    return this.render();
  }

  static #importar(evento, alvo) { return this.#importarCom(alvo, wiki.importarPersonagem); }
  static #importarDaMesa(evento, alvo) { return this.#importarCom(alvo, wiki.importarDaMesa); }

  static async #atualizar(evento, alvo) {
    const ator = atorDa(alvo.closest('[data-wiki-id]')?.dataset.wikiId);
    if (!ator) return;
    alvo.disabled = true;
    try {
      const resultado = await wiki.atualizarDaWiki(ator);
      if (resultado) this.#ultimo = { titulo: ator.name + ': ' + (resultado.pendente ? 'atualização parcial' : 'atualizado') + '.', notas: resultado.notas };
    } catch (erro) {
      this.#ultimo = { titulo: 'A atualização não deu certo.', notas: [erro.message], erro: true };
    }
    return this.render();
  }

  static #avisos() { return wiki.avisosDaWiki({ manual: true }); }

  static #abrir(evento, alvo) {
    return atorDa(alvo.closest('[data-wiki-id]')?.dataset.wikiId)?.sheet.render(true);
  }

  // Aprovar entrega na hora (ou tenta de novo um pedido aprovado que deu erro).
  static async #aprovar(evento, alvo) {
    const linha = alvo.closest('[data-pedido]');
    alvo.disabled = true;
    try {
      const resultado = await wiki.aprovarPedido(linha.dataset.wikiId, linha.dataset.pedido);
      this.#ultimo = { titulo: resultado.ok ? `${resultado.ator}: pedido entregue.` : `${resultado.ator}: o pedido não foi entregue.`, notas: resultado.notas, erro: !resultado.ok };
    } catch (erro) {
      this.#ultimo = { titulo: 'O pedido não foi aprovado.', notas: [erro.message], erro: true };
    }
    return this.render();
  }

  static async #recusar(evento, alvo) {
    const linha = alvo.closest('[data-pedido]');
    const motivo = await DialogV2.prompt({
      window: { title: 'Recusar o pedido' }, classes: [SISTEMA, 'recusar-pedido'], rejectClose: false,
      content: '<label>Motivo (o jogador vê) <input type="text" name="motivo" autofocus></label>',
      ok: { label: 'Recusar', callback: (evt, botao) => botao.form.elements.motivo.value }
    });
    if (motivo === null || motivo === undefined) return null;
    try {
      await wiki.recusarPedido(linha.dataset.wikiId, linha.dataset.pedido, motivo);
      this.#ultimo = { titulo: 'Pedido recusado.', notas: motivo ? [`Motivo: ${motivo}`] : [] };
    } catch (erro) {
      this.#ultimo = { titulo: 'O pedido não foi recusado.', notas: [erro.message], erro: true };
    }
    return this.render();
  }

  static #recarregar() { return this.render(); }
}

let janela = null;
export function abrirJanelaDaWiki() {
  if (!game.user.isGM) return ui.notifications.warn('Só o mestre usa a janela dos personagens da wiki.');
  janela ??= new JanelaDaWiki();
  return janela.render({ force: true });
}

// O botão no alto da aba de Atores, só para o mestre.
export function botaoNaAbaDeAtores(app, html) {
  if (!game.user.isGM) return;
  const acoes = html.querySelector('.header-actions');
  if (!acoes || acoes.querySelector('[data-cprf-wiki]')) return;
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.dataset.cprfWiki = '';
  botao.innerHTML = '<i class="fa-solid fa-address-book" inert></i><span>Personagens da wiki</span>';
  botao.addEventListener('click', () => abrirJanelaDaWiki());
  acoes.append(botao);
}

// A oficina do mestre (o C71 do plano das modificações de armas): o mestre cria ou muda uma modificação de arma sem
// programar, por um formulário (o nome, a raridade, o tipo, os slots, onde serve, o texto e até dois efeitos de um menu),
// e o validarMod recusa o que a regra da casa não deixa, com o motivo. A modificação vira um item do mundo, na pasta
// "Arsenal do mestre" (ou na ficha de um ator), no formato das do catálogo (o conteudo-mods.mjs): um upgrade de arma com a
// regra na flag "mod". As contas ficam no regras-oficina.mjs.
import { SISTEMA } from './config.mjs';
import { iconeNeon } from './regras-icones.mjs';
import * as R from './regras-oficina.mjs';
import { CLASSES, TIPOS } from './regras-modificacoes.mjs';
import { DIFICULDADES } from './regras-pedido-teste.mjs';

const { DialogV2 } = foundry.applications.api;
const esc = valor => foundry.utils.escapeHTML(String(valor ?? ''));
export const PASTA = 'Arsenal do mestre';
const opcoes = (lista, escolhido) => Object.entries(lista).map(([id, nome]) => `<option value="${esc(id)}"${id === escolhido ? ' selected' : ''}>${esc(nome)}</option>`).join('');

// Um efeito do formulário (o índice no nome dos campos).
function campoDoEfeito(i, efeito = {}) {
  const alvos = new Set(efeito.alvos ?? []);
  const caixa = (id, nome) => `<label><input type="checkbox" name="e${i}alvos" value="${id}"${alvos.has(id) ? ' checked' : ''}> ${nome}</label>`;
  return `<fieldset class="efeito-da-oficina" data-efeito="${i}"><legend>Efeito ${i + 1}</legend>
    <div class="form-group"><label>O que faz <select name="e${i}tipo"><option value="">Nenhum</option>${opcoes(R.EFEITOS, efeito.tipo ?? '')}</select></label></div>
    <div class="form-group" data-campo="valor"><label>Valor <input name="e${i}valor" type="number" step="1" value="${esc(efeito.valor ?? '')}"></label></div>
    <div class="form-group" data-campo="situacao"><label>Situação <select name="e${i}situacao">${opcoes(R.SITUACOES, efeito.situacao ?? 'perto')}</select></label></div>
    <div class="form-group" data-campo="metros"><label>De <input name="e${i}metrosMin" type="number" min="0" step="1" value="${esc(efeito.metrosMin ?? '')}"></label>
      <label>até <input name="e${i}metrosMax" type="number" min="0" step="1" value="${esc(efeito.metrosMax ?? '')}"> m</label></div>
    <div class="form-group" data-campo="alvos">${caixa('veiculo', 'Veículo')}${caixa('objeto', 'Objeto')}${caixa('cobertura', 'Cobertura')}${caixa('pessoa', 'Gente')}</div>
    <div class="form-group" data-campo="manual"><label>A situação <input name="e${i}manual" type="text" maxlength="80" value="${esc(efeito.manual ?? '')}" placeholder="no escuro, contra a gangue tal"></label></div>
    <div class="form-group" data-campo="dados"><label>Dano a mais <select name="e${i}dados">${R.DADOS_DE_DANO.map(d => `<option${d === efeito.dados ? ' selected' : ''}>${d}</option>`).join('')}</select></label></div>
    <div class="form-group" data-campo="oculta"><label>A arma <select name="e${i}oculta"><option value="sim"${efeito.valor === 'sim' ? ' selected' : ''}>se esconde</option><option value="nao"${efeito.valor === 'nao' ? ' selected' : ''}>não se esconde</option></select></label></div>
    <div class="form-group" data-campo="rotulo"><label>Rótulo <input name="e${i}rotulo" type="text" maxlength="80" value="${esc(efeito.rotulo ?? '')}" placeholder="vazio: o da situação"></label></div>
  </fieldset>`;
}

// O que cada tipo de efeito pede no formulário.
const CAMPOS = {
  situacao: ['valor', 'situacao', 'rotulo'], sempre: ['valor', 'rotulo'], dano: ['alvos', 'dados', 'rotulo'], pente: ['valor', 'rotulo'], ocultavel: ['oculta', 'rotulo'], emperra: ['valor', 'rotulo'], instavel: ['rotulo']
};
const PELA_SITUACAO = { perto: ['metros'], faixa: ['metros'], longe: ['metros'], alvo: ['alvos'], manual: ['manual'] };

// Lê o formulário (os nomes dos campos acima) no formato do regras-oficina.modDoFormulario.
function lerFormulario(form) {
  const f = form.elements;
  const efeitos = [0, 1].map(i => {
    const tipo = f[`e${i}tipo`].value;
    return {
      tipo, valor: tipo === 'ocultavel' ? f[`e${i}oculta`].value : f[`e${i}valor`].value, situacao: f[`e${i}situacao`].value, metrosMin: f[`e${i}metrosMin`].value, metrosMax: f[`e${i}metrosMax`].value,
      alvos: [...form.querySelectorAll(`[name="e${i}alvos"]:checked`)].map(caixa => caixa.value), manual: f[`e${i}manual`].value, dados: f[`e${i}dados`].value, rotulo: f[`e${i}rotulo`].value
    };
  });
  return { nome: f.nome.value, raridade: f.raridade.value, tipo: f.tipo.value, tamanho: f.tamanho.value, serve: f.serve.value, classe: f.classe.value, dv: f.dv.value, texto: f.texto.value, efeitos };
}

// Os personagens que podem receber a modificação nova (o "Onde nasce" da janela): os que têm um jogador dono.
const personagensDosJogadores = () => game.actors.filter(ator => ator.type === 'personagem' && ator.hasPlayerOwner).sort((a, b) => a.name.localeCompare(b.name));

// A janela da oficina (só o mestre). item: o upgrade da oficina para mudar (a janela vem com o que ele tem); ator: onde
// criar. Sem os dois, a janela pergunta onde ela nasce: no mundo, na pasta "Arsenal do mestre", ou na ficha de um
// personagem (a lendária só na ficha: o C101). Devolve o item criado ou mudado; fechada, null.
export async function abrir({ item = null, ator = null } = {}) {
  if (!game.user.isGM) { ui.notifications.warn('Só o mestre usa a oficina.'); return null; }
  let dados = item?.getFlag(SISTEMA, 'oficina') ?? { tipo: 'tatica', tamanho: 1, serve: 'distancia', raridade: 'rara', efeitos: [] };
  const escolheOnde = !item && !ator;
  let onde = '';
  const campoOnde = () => (escolheOnde ? `<div class="form-group"><label>Onde nasce <select name="onde"><option value="">No mundo (Arsenal do mestre)</option>${personagensDosJogadores().map(a => `<option value="${esc(a.id)}"${a.id === onde ? ' selected' : ''}>Na ficha de ${esc(a.name)}</option>`).join('')}</select></label></div>
        <p class="nota" data-aviso-do-mundo>${esc(R.AVISO_DO_MUNDO)}</p>` : '');
  for (;;) {
    const lido = await DialogV2.wait({
      window: { title: item ? `Oficina do mestre: ${item.name}` : 'Oficina do mestre', icon: 'fa-solid fa-screwdriver-wrench' },
      classes: [SISTEMA, 'oficina-do-mestre', 'themed', 'theme-dark'],
      position: { width: 560 },
      rejectClose: false,
      content: `<p class="nota">A regra da casa vale aqui também: nenhum bônus fixo no ataque, +1 só numa situação, o dano a mais nunca contra gente. A raridade é só um rótulo.</p>
        <div class="form-group"><label>Nome <input name="nome" type="text" maxlength="60" value="${esc(dados.nome)}" required></label></div>
        <div class="form-group"><label>Raridade <select name="raridade">${opcoes(R.RARIDADES, dados.raridade)}</select></label>
          <label>Tipo <select name="tipo">${opcoes(TIPOS, dados.tipo)}</select></label>
          <label>Slots <select name="tamanho">${[0, 1, 2].map(n => `<option${String(n) === String(dados.tamanho) ? ' selected' : ''}>${n}</option>`).join('')}</select></label></div>
        <div class="form-group"><label>Serve em <select name="serve">${opcoes(R.ONDE_SERVE, dados.serve)}</select></label>
          <label>Classe <select name="classe"><option value="">qualquer</option>${opcoes(CLASSES, dados.classe ?? '')}</select></label>
          <label>DV da instalação <select name="dv">${DIFICULDADES.map(({ dv, nome }) => `<option value="${dv}"${dv === R.dvDaOficina(dados.dv) ? ' selected' : ''}>${dv} (${esc(nome)})</option>`).join('')}</select></label></div>
        <div class="form-group"><label>O que ela é <textarea name="texto" rows="3" maxlength="600" placeholder="O que a mesa vê, e o que o efeito não cobre (o mestre resolve).">${esc(dados.texto)}</textarea></label></div>
        ${campoDoEfeito(0, dados.efeitos?.[0])}${campoDoEfeito(1, dados.efeitos?.[1])}
        ${campoOnde()}`,
      buttons: [
        { action: 'salvar', label: item ? 'Salvar' : 'Criar', icon: 'fa-solid fa-hammer', default: true, callback: (evento, botao) => ({ ...lerFormulario(botao.form), onde: botao.form.elements.onde?.value ?? '' }) },
        { action: 'cancelar', label: 'Cancelar', icon: 'fa-solid fa-xmark' }
      ],
      render: (evento, janela) => {
        const form = janela.element.querySelector('form') ?? janela.element;
        const mostrar = () => {
          for (const bloco of form.querySelectorAll('[data-efeito]')) {
            const i = bloco.dataset.efeito;
            const tipo = form.elements[`e${i}tipo`].value;
            const visiveis = new Set([...(CAMPOS[tipo] ?? []), ...(tipo === 'situacao' ? PELA_SITUACAO[form.elements[`e${i}situacao`].value] ?? [] : [])]);
            for (const campo of bloco.querySelectorAll('[data-campo]')) campo.style.display = visiveis.has(campo.dataset.campo) ? '' : 'none';
          }
          form.elements.tamanho.disabled = form.elements.tipo.value === 'defeito';
        };
        form.addEventListener('change', mostrar);
        mostrar();
      }
    });
    if (!lido || typeof lido !== 'object') return null;
    ({ onde, ...dados } = lido);
    const destino = (onde && game.actors.get(onde)) || ator;
    const { raridade, erro } = R.modDoFormulario(dados);
    const motivo = erro ?? R.ondeNasce(raridade, Boolean(destino ?? item?.parent)).erro;
    if (!motivo) return criar(dados, { item, ator: destino });
    ui.notifications.warn(`A oficina não fez a modificação: ${motivo}.`);
  }
}

// Cria (ou muda) a modificação sem a janela: a API e os testes do G4. dados: o do formulário (regras-oficina.
// modDoFormulario). Devolve o item; com o formulário errado, um erro com o motivo.
export async function criar(dados, { item = null, ator = null } = {}) {
  if (!game.user.isGM) throw new Error('Só o mestre usa a oficina.');
  const id = item?.getFlag(SISTEMA, 'mod')?.id ?? R.idDaOficina(dados?.nome, foundry.utils.randomID(6));
  const { mod, raridade, texto, erro } = R.modDoFormulario(dados, id);
  if (erro) throw new Error(`A oficina não fez a modificação: ${erro}.`);
  const onde = R.ondeNasce(raridade, Boolean(ator ?? item?.parent));
  if (onde.erro) throw new Error(`A oficina não fez a modificação: ${onde.erro}.`);
  const guardado = foundry.utils.deepClone(dados);
  const flags = { [SISTEMA]: { mod, raridade, oficina: guardado, origem: { fonte: 'oficina', livro: 'Oficina do mestre' } } };
  const system = { descricao: R.descricaoDaMod(mod, { raridade, texto }), alvo: 'arma', tamanho: mod.tamanho };
  if (item) {
    // A regra e o formulário trocam inteiros (o update junta os objetos: um encaixe tirado ficaria).
    await item.update({ [`flags.${SISTEMA}.-=mod`]: null, [`flags.${SISTEMA}.-=oficina`]: null });
    await item.update({ name: mod.nome, system, flags });
    return item;
  }
  const data = {
    name: mod.nome, type: 'upgrade', img: iconeNeon('upgrade'),
    system: { ...system, instaladoEm: '', modificadores: { pente: 0, ataque: 0, sdp: 0, assentos: 0 }, preco: 0 }, flags
  };
  if (ator) return (await ator.createEmbeddedDocuments('Item', [data]))[0];
  const pasta = game.folders.find(f => f.type === 'Item' && f.name === PASTA) ?? await CONFIG.Folder.documentClass.create({ name: PASTA, type: 'Item', color: '#7a1d2c' });
  return Item.implementation.create({ ...data, folder: pasta.id, ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE } });
}

// O botão "Oficina do mestre" na aba de Itens (só o mestre).
function botaoNaAbaDeItens(app, html) {
  if (!game.user.isGM || html.querySelector('[data-oficina-do-mestre]')) return;
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.dataset.oficinaDoMestre = '';
  botao.innerHTML = '<i class="fa-solid fa-screwdriver-wrench" inert></i><span>Oficina do mestre</span>';
  botao.addEventListener('click', () => abrir());
  (html.querySelector('.directory-footer') ?? html).append(botao);
}

export function registrarOficina() {
  Hooks.on('renderItemDirectory', botaoNaAbaDeItens);
}

export const API = { abrir, criar, ...R };

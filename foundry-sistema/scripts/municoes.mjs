// Munições RED (wiki, system-catalog.js, p. 344–347). O mestre aplica; o dono do alvo rola a resistência.
// Os estados de um minuto usam o relógio do mundo, não o relógio real. O cartão também permite encerrá-los à mão.
import { jogadorDe, pedir, souOMestreAtivo } from './combate.mjs';
import { SISTEMA } from './config.mjs';
import { config } from './configuracoes.mjs';
import { lesaoCritica } from './lesoes.mjs';
import { MUNICAO_SEM_DANO, municaoPoeFogo, RESISTENCIAS_MUNICAO, vulneraveisAoEmp } from './regras.mjs';
import { STATUS_EM_CHAMAS } from './netrun/constantes.mjs';
import { testar } from './rolagens.mjs';

export const STATUS_FOGO = STATUS_EM_CHAMAS;
const esc = texto => foundry.utils.escapeHTML(String(texto));
const catalogo = item => item.getFlag(SISTEMA, 'catalogo') ?? '';
const ativos = ator => ator.items.filter(i => !i.inoperante && (i.type === 'cyberware' ? i.system.instalado : ['carregando', 'equipado'].includes(i.system.uso)));
const tem = (itens, id) => itens.some(i => catalogo(i) === id);
const registro = (ctx, linha) => linha.municao ??= { ator: linha.token.actor.uuid, ataque: ctx.pedido.id, efeitos: [], itens: [], emp: [] };
const marca = (ataque, tipo, minuto = true) => ({ ataque, tipo, ...(minuto ? { fim: game.time.worldTime + 60 } : {}) });
const selecoesEmp = new Set();

// A mesma janela de rolagem dos outros testes, incluindo a Sorte e os situacionais; sem resposta, o mestre rola. É do
// fluxo do ataque: o cartão fica público, fora do modo do seletor do chat (o C33).
export async function rolarResistencia({ ator: uuid, pericia, dv, nome }, { perguntar = false, aoAbrir = null } = {}) {
  const ator = await fromUuid(uuid);
  const resultado = await ator?.rolarPericia(pericia, { perguntar, aoAbrir, sabor: `${nome}: supere a DV${dv}`, modo: 'public' });
  return resultado ? { total: resultado.total } : null;
}

// Segunda tentativa da Inteligente RED: 10 + 1d10; a Sorte é a única soma permitida (não é a arma Smart de 2077).
export async function rolarInteligente({ ator: uuid }, { perguntar = false, aoAbrir = null } = {}) {
  const ator = await fromUuid(uuid);
  if (!ator) return null;
  let sorte = ator.sortePreparada;
  if (perguntar) {
    const escolha = await foundry.applications.api.DialogV2.wait({
      window: { title: 'Munição Inteligente: segunda tentativa' }, classes: [SISTEMA, 'janela-rolagem'],
      content: `<p>10 + 1d10 contra a mesma DV. Só a Sorte pode somar; o alvo pode se esquivar de novo.</p><label>Sorte <input name="sorte" type="number" value="${sorte}" min="0" max="${ator.system.sorte.value}" step="1"></label>`,
      buttons: [{ action: 'rolar', label: 'Rolar', callback: (evento, botao) => ({ sorte: Number(botao.form.elements.sorte.value) || 0 }) }], rejectClose: false,
      render: (evento, janela) => aoAbrir?.(janela)
    }).catch(() => null);
    if (!escolha || typeof escolha !== 'object') return null;
    sorte = escolha.sorte;
  }
  const r = await testar(ator, { rotulo: 'Munição Inteligente: segunda tentativa', partes: [{ rotulo: 'Inteligente', valor: 10 }], sorte,
    modo: config('escondeAtaque') ? 'gm' : 'public', categoria: 'ataque', semFalhaCritica: ator.system.consciencia.semFalhaCritica, dados: { ataque: true, inteligente: true } });
  return { total: r.total, critico: r.critico, mensagem: r.mensagem.id };
}

async function efeitoTemporario(ator, estado, dados) {
  const [efeito] = await ator.createEmbeddedDocuments('ActiveEffect', [{
    type: 'base', system: { changes: [] }, ...dados, flags: { [SISTEMA]: { municao: estado } },
    ...(estado.fim !== undefined ? { duration: { seconds: 60, startTime: game.time.worldTime } } : {})
  }]);
  return efeito.id;
}

async function lesaoTemporaria(ctx, linha, id) {
  const feita = await lesaoCritica(linha.token.actor, { id, falar: false });
  // Uma lesão anterior não vira temporária, nem é apagada quando o minuto acaba.
  if (feita?.item) {
    await feita.item.setFlag(SISTEMA, 'municao', marca(ctx.pedido.id, 'lesao'));
    registro(ctx, linha).itens.push(feita.item.id);
  }
  if (feita) linha.notas.push(`${feita.nome} por 1 minuto, sem dano bônus.`);
}

export async function aplicarMunicaoSemDano(ctx, linhas) {
  const municao = ctx.arma.municaoCarregada;
  const tipo = municao?.system.efeito;
  const texto = MUNICAO_SEM_DANO[tipo];
  if (!texto) return false;
  for (const linha of linhas) {
    linha.notas.push(`${municao.name}: não causa dano da arma. ${texto[0].toUpperCase()}${texto.slice(1)}`);
    const regra = RESISTENCIAS_MUNICAO[tipo];
    if (!regra) continue; // A fumaça continua sendo uma área que o mestre resolve.
    const ator = linha.token.actor;
    const emUso = ativos(ator);
    const nasal = tem(emUso, 'core_cyberware:nasal-filters');
    const olhosDeCarne = ator.items.filter(i => i.type === 'cyberware' && i.system.instalado && catalogo(i) === 'core_cyberware:cybereye').length < 2;
    const protegeOlhos = emUso.filter(i => catalogo(i) === 'core_cyberware:anti-dazzle').length >= 2;
    const protegeOuvidos = tem(emUso, 'core_cyberware:level-damper') || tem(emUso, 'core_gear:auto-level-dampening-ear-protectors');
    if ((nasal && tipo === 'teargas')
      || (tipo === 'teargas' && !olhosDeCarne) || (tipo === 'flashbang' && protegeOlhos && protegeOuvidos)) {
      linha.notas.push('Protegido contra o efeito desta munição.');
      continue;
    }
    const dados = { ator: ator.uuid, pericia: regra.pericia, dv: regra.dv, nome: municao.name };
    const dono = jogadorDe(ator);
    const teste = (dono ? await pedir(dono, 'municao', dados) : null) ?? await rolarResistencia(dados);
    if (!teste) continue;
    const estado = registro(ctx, linha);
    estado.efeito = tipo;
    estado.resistencia = { total: teste.total, dv: regra.dv, passou: teste.total > regra.dv };
    linha.notas.push(`Resistência: ${teste.total} contra DV${regra.dv}: ${estado.resistencia.passou ? 'resistiu' : 'falhou'}.`);
    if (estado.resistencia.passou) continue;
    if (regra.dano) {
      const roll = await new Roll(regra.dano).evaluate();
      ctx.rolagens.push(roll);
      const hpAntes = ator.system.hp.value;
      await ator.update({ 'system.hp.value': hpAntes - roll.total });
      await acordarComDano(ator);
      linha.dano = { local: 'corpo', dano: roll.total, bonus: 0, hpAntes, hpDepois: ator.system.hp.value, recebido: roll.total,
        entrou: roll.total, bruto: roll.total, passou: true, sp: 0, spEfetivo: 0, ablado: 0, escudoAblado: 0, lesoes: [], critico: false, formula: regra.dano };
      linha.notas.push(`${regra.dano}: ${roll.total} direto no HP, sem armadura, ablação ou crítico.`);
    } else if (tipo === 'sleep') {
      if (!ator.statuses.has('prone')) {
        await ator.toggleStatusEffect('prone', { active: true });
        estado.caido = ator.effects.find(e => e.statuses.has('prone'))?.id;
      }
      estado.efeitos.push(await efeitoTemporario(ator, marca(ctx.pedido.id, 'sono'), { name: 'Sonífera: inconsciente', img: 'icons/svg/sleep.svg', statuses: ['unconscious'] }));
      linha.notas.push('Inconsciente por 1 minuto; dano ou uma Ação de outra pessoa acorda.');
    } else if (tipo === 'flashbang' || tipo === 'teargas') {
      if (tipo === 'teargas' || !protegeOlhos) await lesaoTemporaria(ctx, linha, 'core_critical-injuries-head:damaged-eye');
      if (tipo === 'flashbang' && !protegeOuvidos) await lesaoTemporaria(ctx, linha, 'core_critical-injuries-head:damaged-ear');
    } else if (tipo === 'emp') {
      estado.empResolvido = false;
      linha.notas.push('EMP: o mestre escolhe até 2 itens eletrônicos vulneráveis pelo botão do cartão; ficam inoperantes por 1 minuto.');
    }
  }
  return true;
}

export async function incendiar(ctx, linha) {
  if (!municaoPoeFogo(ctx.arma.municaoCarregada?.system.efeito, linha.dano)) return;
  const ator = linha.token.actor;
  const estado = registro(ctx, linha);
  estado.efeito = 'incendiary';
  if (!ator.statuses.has(STATUS_FOGO)) {
    estado.efeitos.push(await efeitoTemporario(ator, marca(ctx.pedido.id, 'fogo', false), { name: 'Em chamas', img: 'icons/svg/fire.svg', statuses: [STATUS_FOGO] }));
  }
  linha.notas.push('Em chamas: 2 HP no fim de cada turno. Uma Ação apaga; não acumula.');
}

export async function apagarFogo(ator) {
  if (!ator?.isOwner) return false;
  await ator.toggleStatusEffect(STATUS_FOGO, { active: false });
  return true;
}

export async function acordarComDano(ator) {
  const efeitos = ator.effects.filter(e => e.getFlag(SISTEMA, 'municao')?.tipo === 'sono');
  if (efeitos.length) await ator.deleteEmbeddedDocuments('ActiveEffect', efeitos.map(e => e.id)).catch(() => {});
}

export async function fogoNoFimDoTurno(combate) {
  const anterior = combate.previous;
  const ator = combate.scene?.tokens.get(anterior?.tokenId)?.actor;
  const efeito = ator?.effects.find(e => e.getFlag(SISTEMA, 'municao')?.tipo === 'fogo');
  if (!efeito) return;
  const turno = `${combate.id}:${anterior.round}:${anterior.turn}`;
  if (efeito.getFlag(SISTEMA, 'fimDoTurno') === turno) return;
  await efeito.setFlag(SISTEMA, 'fimDoTurno', turno);
  await ator.update({ 'system.hp.value': ator.system.hp.value - 2 });
  await acordarComDano(ator);
  await ChatMessage.implementation.create({ speaker: ChatMessage.implementation.getSpeaker({ actor: ator }),
    content: `<div class="${SISTEMA} cartao"><p><b>${esc(ator.name)}</b>: em chamas, perdeu 2 HP no fim do turno (sem armadura).</p></div>` });
}

// A seleção é do mestre (wiki). A macro Get EMP'd do CORE apenas sorteia nomes; aqui, a escolha para os itens de fato.
export async function escolherEmp(mensagem, uuid) {
  if (!souOMestreAtivo() || mensagem.getFlag(SISTEMA, 'desfeito')) return false;
  const chave = `${mensagem.id}:${uuid}`;
  if (selecoesEmp.has(chave)) return false;
  selecoesEmp.add(chave);
  try {
    return await aplicarSelecaoEmp(mensagem, uuid);
  } finally {
    selecoesEmp.delete(chave);
  }
}

function linhaEmpPendente(ataque, uuid) {
  const linha = ataque?.linhas.find(l => l.municao?.ator === uuid && l.municao.efeito === 'emp');
  return linha?.municao.resistencia?.passou === false && !linha.municao.empResolvido ? linha : null;
}

async function aplicarSelecaoEmp(mensagem, uuid) {
  let ataque = foundry.utils.deepClone(mensagem.getFlag(SISTEMA, 'ataque'));
  let linha = linhaEmpPendente(ataque, uuid);
  if (!linha) return false;
  let ator = await fromUuid(uuid);
  if (!ator) return false;
  const itens = vulneraveisAoEmp(ator.items.contents).filter(i => !i.inoperante);
  const quantidade = Math.min(2, itens.length);
  let idsEscolhidos = [];
  if (quantidade) {
    const opcoes = itens.map(i => `<option value="${i.id}">${esc(i.name)}</option>`).join('');
    const resposta = await foundry.applications.api.DialogV2.prompt({ window: { title: `EMP: ${ator.name}` },
      content: `<p>Escolha ${quantidade} ${quantidade === 1 ? 'item' : 'itens'} para parar por 1 minuto. Um cybermembro parado fica pendurado, como desmembrado.</p><select name="primeiro">${opcoes}</select>${quantidade === 2 ? `<select name="segundo"><option value="">Escolha outro item</option>${opcoes}</select>` : ''}`,
      ok: { label: 'Desligar', callback: (evento, botao) => [...new Set(['primeiro', 'segundo'].map(k => botao.form.elements[k]?.value).filter(Boolean))] }, rejectClose: false
    }).catch(() => null);
    if (!resposta) return false;
    if (resposta.length !== quantidade || resposta.some(id => !itens.some(i => i.id === id))) { ui.notifications.warn(`Escolha ${quantidade} itens diferentes para o EMP.`); return false; }
    idsEscolhidos = resposta;
  }
  // A janela pode ficar aberta enquanto o ataque é desfeito, o mestre muda ou um item ganha proteção.
  ator = await fromUuid(uuid);
  if (!ator || !souOMestreAtivo() || mensagem.getFlag(SISTEMA, 'desfeito')) return false;
  ataque = foundry.utils.deepClone(mensagem.getFlag(SISTEMA, 'ataque'));
  linha = linhaEmpPendente(ataque, uuid);
  if (!linha) return false;
  const vulneraveis = vulneraveisAoEmp(ator.items.contents).filter(i => !i.inoperante);
  if (idsEscolhidos.length !== Math.min(2, vulneraveis.length) || idsEscolhidos.some(id => !vulneraveis.some(atual => atual.id === id))) return false;
  const escolhidos = idsEscolhidos.map(id => ator.items.get(id));
  const estado = linha.municao;
  for (const item of escolhidos) { await item.setFlag(SISTEMA, 'emp', marca(ataque.id, 'emp')); estado.emp.push(item.id); }
  estado.empResolvido = true;
  const lista = foundry.utils.deepClone(mensagem.getFlag(SISTEMA, 'desfazer'));
  const desfazer = lista.find(l => l.ator === uuid);
  if (desfazer) desfazer.municao = estado;
  await mensagem.update({ [`flags.${SISTEMA}.ataque`]: ataque, [`flags.${SISTEMA}.desfazer`]: lista });
  await ChatMessage.implementation.create({ speaker: ChatMessage.implementation.getSpeaker({ actor: ator }),
    content: `<div class="${SISTEMA} cartao"><p>EMP em <b>${esc(ator.name)}</b>: ${escolhidos.length ? escolhidos.map(i => esc(i.name)).join(', ') + ' inoperantes por 1 minuto' : 'nenhum eletrônico vulnerável'}.</p></div>` });
  return true;
}

export async function desfazerMunicao(ator, estado, { desfazer = true } = {}) {
  if (!estado) return;
  const proprios = (ids, colecao) => ids.filter(id => colecao.get(id)?.getFlag(SISTEMA, 'municao')?.ataque === estado.ataque);
  const efeitos = proprios(estado.efeitos, ator.effects), itens = proprios(estado.itens, ator.items);
  if (efeitos.length) await ator.deleteEmbeddedDocuments('ActiveEffect', efeitos);
  if (itens.length) await ator.deleteEmbeddedDocuments('Item', itens);
  if (desfazer && estado.caido && ator.effects.has(estado.caido)) await ator.deleteEmbeddedDocuments('ActiveEffect', [estado.caido]);
  for (const id of estado.emp) if (ator.items.get(id)?.getFlag(SISTEMA, 'emp')?.ataque === estado.ataque) await ator.items.get(id).unsetFlag(SISTEMA, 'emp');
}

export async function encerrarEfeitos(mensagem, uuid) {
  if (!game.user.isGM) return false;
  for (const entrada of (mensagem.getFlag(SISTEMA, 'desfazer') ?? []).filter(entrada => entrada.ator === uuid)) {
    const ator = await fromUuid(entrada.ator);
    if (ator) await desfazerMunicao(ator, entrada.municao, { desfazer: false });
  }
  return true;
}

export async function expirarTemporarios() {
  if (!souOMestreAtivo()) return;
  const atores = new Set([...game.actors, ...game.scenes.contents.flatMap(c => c.tokens.filter(t => !t.actorLink).map(t => t.actor).filter(Boolean))]);
  for (const ator of atores) {
    const expirou = estado => Number.isFinite(estado?.fim) && estado.fim <= game.time.worldTime;
    for (const [tipo, colecao] of [['ActiveEffect', ator.effects], ['Item', ator.items]]) {
      const ids = colecao.filter(d => expirou(d.getFlag(SISTEMA, 'municao'))).map(d => d.id);
      if (ids.length) await ator.deleteEmbeddedDocuments(tipo, ids);
    }
    for (const item of ator.items) if (expirou(item.getFlag(SISTEMA, 'emp'))) await item.unsetFlag(SISTEMA, 'emp');
  }
}

export function registrarMunicoes() {
  let expiracao = Promise.resolve();
  Hooks.on('updateWorldTime', () => { expiracao = expiracao.then(expirarTemporarios).catch(e => console.error(`${SISTEMA} | munições`, e)); });
  Hooks.on('preUpdateActor', (ator, mudancas, opcoes) => { if (mudancas.system?.hp?.value < ator.system.hp?.value) opcoes.cprfAcordar = true; });
  Hooks.on('updateActor', (ator, mudancas, opcoes) => { if (opcoes.cprfAcordar && souOMestreAtivo()) acordarComDano(ator).catch(e => console.error(`${SISTEMA} | sonífera`, e)); });
}

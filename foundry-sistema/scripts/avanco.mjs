// O avanço por IP da wiki (system-rules.js:712, p. 411). O CORE 0.92.4 só tem o ledger.
import { SISTEMA } from './config.mjs';
import { PERICIAS } from './gerado.mjs';
import { linhaDoExtrato } from './regras.mjs';
import { avancoComIp } from './regras-avanco.mjs';

// Um avanço por ator neste cliente, inclusive durante a confirmação; o clique duplo não compra o nível seguinte.
const emAndamento = new Set();
const permitido = ator => ator?.type === 'personagem' && ator.isOwner
  && (ator.parent ? ator.parent.actor === ator : ator.collection?.get(ator.id) === ator)
  && (!ator.pack || !game.packs.get(ator.pack)?.locked);
const mesmaLinha = (a, b) => Object.keys(b).every(chave => a?.[chave] === b[chave]);

// Um gancho pode retirar campos da atualização. Volta só o que ainda é desta compra, sem apagar mudanças posteriores.
async function compensarAvanco(ator, agora, linha, pericia, periciaAntes) {
  const mudancas = {}, esperados = {};
  const fonte = ator._source.system, plano = agora.plano;
  if (foundry.utils.getProperty(ator._source, agora.caminho) === plano.nivelNovo) {
    const criada = pericia && periciaAntes === undefined && Object.entries(fonte.pericias[pericia]).every(([chave, valor]) =>
      chave === 'nivel' ? valor === plano.nivelNovo : ['familia', 'nome', 'atributo'].includes(chave) && valor === '');
    if (criada) {
      mudancas[`system.pericias.${pericia}`] = new foundry.data.operators.ForcedDeletion();
      esperados[`system.pericias.${pericia}`] = undefined;
    } else mudancas[agora.caminho] = esperados[agora.caminho] = plano.nivel;
  }
  if (fonte.pontosDeMelhoria === plano.saldo) mudancas['system.pontosDeMelhoria'] = esperados['system.pontosDeMelhoria'] = agora.saldo;
  const indice = fonte.extratos.pontosDeMelhoria.findLastIndex(outra => mesmaLinha(outra, linha));
  if (indice >= 0) mudancas['system.extratos.pontosDeMelhoria'] = fonte.extratos.pontosDeMelhoria.filter((outra, i) => i !== indice);
  if (!Object.keys(mudancas).length) return true;
  try {
    const voltou = await ator.update(mudancas, { cprfExtrato: true });
    return Boolean(voltou) && Object.entries(esperados).every(([caminho, valor]) => foundry.utils.getProperty(ator._source, caminho) === valor)
      && !ator._source.system.extratos.pontosDeMelhoria.some(outra => mesmaLinha(outra, linha));
  } catch { return false; }
}

function lerAvanco(ator, { pericia, role }) {
  const fonte = ator._source.system;
  let nome, nivel, dificil = false, caminho, tipo;
  if (pericia && !role && (PERICIAS.some(p => p.id === pericia) || Object.hasOwn(fonte.pericias, pericia))) {
    const p = ator.system.pericia(pericia);
    if (!p.nome) return null;
    nome = p.nome;
    dificil = p.dificil;
    nivel = fonte.pericias[pericia]?.nivel ?? 0;
    caminho = `system.pericias.${pericia}.nivel`;
    tipo = 'pericia';
  } else if (!pericia && ['role', 'roleSecundaria'].includes(role) && fonte[role].nome) {
    nome = fonte[role].nome;
    nivel = fonte[role].rank;
    caminho = `system.${role}.rank`;
    tipo = 'role';
  } else return null;
  const saldo = fonte.pontosDeMelhoria;
  return { nome, dificil, nivel, caminho, tipo, saldo, plano: avancoComIp({ tipo, nivel, dificil, saldo }) };
}

// O nível, o débito e a linha do extrato entram juntos, como o saldo e a linha em AtorCPR.mudarComExtrato.
export async function avancarComIp(ator, escolha = {}) {
  if (!permitido(ator) || emAndamento.has(ator.uuid)) return null;
  emAndamento.add(ator.uuid);
  try {
    const antes = lerAvanco(ator, escolha);
    if (!antes) return null;
    if (!antes.plano.ok) { ui.notifications.warn(antes.plano.motivo); return null; }
    const esc = foundry.utils.escapeHTML;
    const { nivelNovo, custo } = antes.plano;
    const confirmou = await foundry.applications.api.DialogV2.confirm({
      window: { title: 'Gastar IP' }, classes: [SISTEMA, 'gastar-ip'], rejectClose: false,
      content: `<p>${esc(antes.nome)} ${antes.nivel} → ${nivelNovo} por ${custo} IP? Você tem ${antes.saldo}.</p>`
    });
    if (!confirmou || !permitido(ator)) return null;
    const agora = lerAvanco(ator, escolha);
    if (!agora || ['nome', 'nivel', 'dificil', 'caminho', 'tipo', 'saldo'].some(chave => agora[chave] !== antes[chave])) {
      ui.notifications.warn('A perícia, a Role ou o saldo mudou. Confira e tente de novo.');
      return null;
    }
    const plano = agora.plano;
    if (!plano.ok) { ui.notifications.warn(plano.motivo); return null; }
    const motivo = `${agora.nome} ${plano.nivel} → ${plano.nivelNovo}`;
    const linha = linhaDoExtrato({ acao: 'subtrair', antes: agora.saldo, saldo: plano.saldo, motivo, usuario: game.user.name });
    const linhas = [...ator._source.system.extratos.pontosDeMelhoria, linha];
    const periciaAntes = escolha.pericia ? structuredClone(ator._source.system.pericias[escolha.pericia]) : undefined;
    const atualizado = await ator.update({
      [agora.caminho]: plano.nivelNovo, 'system.pontosDeMelhoria': plano.saldo, 'system.extratos.pontosDeMelhoria': linhas
    }, { cprfExtrato: true });
    if (!atualizado || foundry.utils.getProperty(ator._source, agora.caminho) !== plano.nivelNovo
      || ator._source.system.pontosDeMelhoria !== plano.saldo
      || !ator._source.system.extratos.pontosDeMelhoria.some(outra => mesmaLinha(outra, linha))) {
      const voltou = await compensarAvanco(ator, agora, linha, escolha.pericia, periciaAntes);
      ui.notifications.warn(voltou ? 'O avanço foi recusado; nenhuma compra foi concluída.' : 'Não foi possível devolver todo o avanço recusado. Confira o nível, os IP e o extrato com o mestre.');
      return null;
    }
    await ChatMessage.implementation.create({
      speaker: ChatMessage.implementation.getSpeaker({ actor: ator }),
      content: `<div class="${SISTEMA} cartao avanco"><p><b>${esc(ator.name)}</b>: ${esc(motivo)} por ${custo} IP.</p><p>Saldo: ${plano.saldo} IP.</p></div>`,
      flags: { [SISTEMA]: { avanco: { ator: ator.uuid, motivo, custo, saldo: plano.saldo } } }
    });
    return plano;
  } finally { emAndamento.delete(ator.uuid); }
}

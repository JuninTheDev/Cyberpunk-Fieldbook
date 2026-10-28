// Pilhas no inventário: o CORE 0.92.4 (CPRActorSheet._splitItem). A criação direta não junta: importações e a
// divisão precisam manter documentos distintos. A fila relê o estado ao executar; é do mesmo cliente.
import { SISTEMA } from './config.mjs';
import { parteSugerida } from './regras.mjs';
import { divisaoDaPilha } from './regras-inventario.mjs';

const filas = new Map();
export function naFilaDoInventario(atores, tarefa) {
  const chaves = [...new Set(atores.filter(Boolean).map(ator => ator.uuid))];
  const anterior = Promise.all(chaves.map(chave => filas.get(chave)?.catch(() => null)));
  const atual = anterior.then(tarefa);
  for (const chave of chaves) filas.set(chave, atual);
  return atual.finally(() => { for (const chave of chaves) if (filas.get(chave) === atual) filas.delete(chave); });
}

const podeMudar = ator => ator?.isOwner && (ator.type !== 'conteiner' || game.user.isGM || ator.system.permissoes.mudar);
export const upgradesDaPilha = item => item.actor?.items.filter(outro => outro.type === 'upgrade' && outro.system.instaladoEm === item.id).length ?? 0;

export function dividirPilha(item, quantidade) {
  return naFilaDoInventario([item.actor], async () => {
    const ator = item.actor, atual = ator?.items.get(item.id);
    if (!podeMudar(ator) || !atual) return null;
    const divisao = divisaoDaPilha(atual.type, atual.system.quantidade, quantidade);
    if (!divisao) { ui.notifications.warn('Escolha uma quantidade inteira entre 1 e uma a menos que a pilha atual.'); return null; }
    // O CORE copia nome, tipo, imagem, sistema e efeitos; flags de uso e de entrega ficam só no original.
    const fonte = atual.toObject();
    const catalogo = atual.getFlag(SISTEMA, 'catalogo');
    const dados = { name: fonte.name, type: fonte.type, img: fonte.img, system: { ...fonte.system, quantidade: divisao.nova }, effects: fonte.effects,
      ...(catalogo ? { flags: { [SISTEMA]: { catalogo } } } : {}) };
    const [nova] = await ator.createEmbeddedDocuments('Item', [dados]);
    if (!nova) return null;
    const apagarNova = async () => {
      await ator.deleteEmbeddedDocuments('Item', [nova.id]);
      if (ator.items.has(nova.id)) throw new Error('Não foi possível apagar a nova pilha; confira as quantidades antes de tentar novamente.');
    };
    // Recarga, consumo ou outro cliente podem ter mudado o estoque enquanto a criação aguardava o servidor.
    const restante = ator.items.has(atual.id) && divisaoDaPilha(atual.type, atual.system.quantidade, quantidade);
    if (!restante) {
      await apagarNova();
      ui.notifications.warn('O estoque mudou; confira a quantidade antes de dividir novamente.');
      return null;
    }
    const quantidadeAnterior = atual.system.quantidade;
    try {
      await atual.update({ 'system.quantidade': restante.restante });
      if (atual.system.quantidade !== restante.restante) throw new Error('Não foi possível atualizar a pilha original.');
    } catch (erro) {
      if (ator.items.get(atual.id)?.system.quantidade !== quantidadeAnterior) {
        await ator.updateEmbeddedDocuments('Item', [{ _id: atual.id, 'system.quantidade': quantidadeAnterior }]);
        if (ator.items.get(atual.id)?.system.quantidade !== quantidadeAnterior) throw new Error('Não foi possível restaurar a pilha original; a nova pilha foi mantida.', { cause: erro });
      }
      await apagarNova();
      throw erro;
    }
    return nova;
  });
}

export async function perguntarDivisao(item) {
  if (!item || !podeMudar(item.actor) || !divisaoDaPilha(item.type, item.system.quantidade, 1)) return null;
  // _splitItem do CORE avisa, mas não interrompe (inclusive em munição/droga, sem installedUpgrades).
  if (!['equipamento', 'roupa'].includes(item.type) || upgradesDaPilha(item)) ui.notifications.warn('Retire os upgrades antes de dividir a pilha.');
  const quantidade = await foundry.applications.api.DialogV2.prompt({
    window: { title: 'Dividir pilha' }, classes: [SISTEMA, 'dividir-pilha'],
    content: `<p>Dividir <b>${foundry.utils.escapeHTML(item.name)}</b> (tem ${item.system.quantidade}).</p><label>Quantos na nova pilha <input type="number" name="quantidade" value="${parteSugerida(item.system.quantidade)}" min="1" max="${item.system.quantidade - 1}" step="1" autofocus></label>`,
    ok: { label: 'Dividir', callback: (evento, botao) => Number(botao.form.elements.quantidade.value) }, rejectClose: false
  });
  if (quantidade === null || quantidade === undefined) return null;
  return item.dividirPilha(quantidade);
}

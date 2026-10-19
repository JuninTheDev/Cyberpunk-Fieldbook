// O contêiner (o container do CORE 0.92.4): levar um item de um ator para outro (arrastar entre as fichas, pegar do
// saque ou do esconderijo), pegar com quem a ficha troca e a trava (o jogador só move o token do contêiner com a
// permissão "Mover o contêiner", o players-move do CORE).
import { EMPILHAVEIS, quantidadeDe } from './regras.mjs';
import { mesmaPilha } from './regras-inventario.mjs';
import { naFilaDoInventario, upgradesDaPilha } from './pilhas.mjs';

// O item e tudo o que está instalado nele, nos andares de baixo (o upgrade na arma, a arma no veículo, o programa no
// deck, a opção na fundação).
function arvoreDe(item) {
  const ator = item.parent;
  const arvore = [item];
  for (let i = 0; i < arvore.length; i++) arvore.push(...(ator?.items.filter(outro => outro.system.instaladoEm === arvore[i].id) ?? []));
  return arvore;
}

// Leva o item (com o que está instalado nele) para o destino, como o CORE quando um item vai de uma ficha para outra:
// cria no destino e tira da origem. O item em pilha (regras.EMPILHAVEIS) soma no mesmo item do destino (o tipo e o
// nome), e "quantidade" leva só uma parte da pilha. Com manterNaOrigem (o estoque infinito, ou o item que veio do
// diretório ou de um compêndio), a origem fica como estava. O que chega vem guardado (equipada = false): quem recebe
// equipa pela conferência das mãos. O cyberware instalado não sai (como no CORE): desinstale antes.
export function levarItem(item, destino, opcoes = {}) {
  return naFilaDoInventario([item.parent, destino], () => transferirItem(item, destino, opcoes));
}
async function transferirItem(item, destino, { quantidade = null, manterNaOrigem = false } = {}) {
  const origem = item.parent ?? null;
  if (!destino.isOwner || origem?.uuid === destino.uuid) return null;
  if (origem && !origem.items.has(item.id)) return null;
  if (item.type === 'cyberware' && item.system.instalado) { ui.notifications.warn(`${item.name}: cyberware instalado não sai da ficha; desinstale antes.`); return null; }
  if (origem && !manterNaOrigem && !origem.isOwner) { ui.notifications.warn(`${item.name}: sem permissão para tirar da ficha de ${origem.name}.`); return null; }
  const pilha = quantidadeDe(item.type, item.system);
  if (quantidade !== null && (!EMPILHAVEIS.includes(item.type) || !Number.isSafeInteger(quantidade) || quantidade < 1 || quantidade > pilha)) {
    ui.notifications.warn('Escolha uma quantidade inteira disponível na pilha.'); return null;
  }
  const parte = quantidade !== null && quantidade < pilha;
  const levar = parte ? quantidade : pilha;
  const arvore = parte ? [item] : arvoreDe(item);
  // O CORE examina só o primeiro homônimo, mesmo quando a condição dos upgrades o impede de juntar.
  const candidato = destino.items.find(outro => outro.type === item.type && outro.name === item.name);
  const mesmo = candidato && mesmaPilha(item, { type: candidato.type, name: candidato.name, upgrades: upgradesDaPilha(candidato) }) ? candidato : null;
  const originais = arvore.map(parteDaArvore => parteDaArvore.toObject());
  const quantidadeAnterior = mesmo?.system.quantidade;
  let criado, dados = [], retirando = false;
  try {
    if (mesmo) {
      const novaQuantidade = quantidadeAnterior + levar;
      if (!Number.isSafeInteger(novaQuantidade)) throw new Error('A quantidade da pilha excede o limite seguro.');
      await mesmo.update({ 'system.quantidade': novaQuantidade });
      if (destino.items.get(mesmo.id)?.system.quantidade !== novaQuantidade) throw new Error('Não foi possível somar os itens na pilha do destino.');
      criado = mesmo;
    } else {
      // Ids novos, com a montagem (o instaladoEm) apontando para eles; o item de cima sai do que o segurava na origem.
      const ids = new Map(arvore.map(parteDaArvore => [parteDaArvore.id, foundry.utils.randomID()]));
      dados = arvore.map((parteDaArvore, i) => {
        const d = parteDaArvore.inCompendium ? game.items.fromCompendium(parteDaArvore, { clearFolder: true }) : parteDaArvore.toObject();
        d._id = ids.get(parteDaArvore.id);
        if ('instaladoEm' in d.system) d.system.instaladoEm = i === 0 ? '' : ids.get(d.system.instaladoEm) ?? '';
        if ('equipada' in d.system) d.system.equipada = false;
        if (i === 0 && EMPILHAVEIS.includes(item.type)) d.system.quantidade = levar;
        return d;
      });
      const criados = await destino.createEmbeddedDocuments('Item', dados, { keepId: true });
      criado = destino.items.get(dados[0]._id);
      if (criados.length !== dados.length || dados.some(d => !destino.items.has(d._id))) throw new Error('Não foi possível criar todos os itens no destino.');
    }
    if (origem && !manterNaOrigem) {
      // Consumo ou outro cliente podem mudar o estoque enquanto o destino aguarda o servidor.
      const atual = origem.items.get(item.id);
      if (!atual || quantidadeDe(atual.type, atual.system) !== pilha) throw new Error('O estoque da origem mudou; confira a quantidade antes de transferir novamente.');
      retirando = true;
      if (parte) {
        await atual.update({ 'system.quantidade': pilha - levar });
        if (origem.items.get(item.id)?.system.quantidade !== pilha - levar) throw new Error('Não foi possível retirar a quantidade da origem.');
      } else {
        await origem.deleteEmbeddedDocuments('Item', originais.map(d => d._id));
        if (originais.some(d => origem.items.has(d._id))) throw new Error('Não foi possível retirar todos os itens da origem.');
      }
    }
    return criado;
  } catch (erro) {
    // Uma remoção pode ter apagado só parte da árvore: recupere a origem antes de desfazer a cópia.
    if (retirando) {
      const faltantes = originais.filter(d => !origem.items.has(d._id));
      if (faltantes.length) await origem.createEmbeddedDocuments('Item', faltantes, { keepId: true });
      if (originais.some(d => !origem.items.has(d._id))) throw new Error('Não foi possível restaurar a origem; os itens do destino foram mantidos.', { cause: erro });
      if (parte && origem.items.get(item.id).system.quantidade !== pilha) {
        await origem.updateEmbeddedDocuments('Item', [{ _id: item.id, 'system.quantidade': pilha }]);
        if (origem.items.get(item.id)?.system.quantidade !== pilha) throw new Error('Não foi possível restaurar a quantidade da origem; os itens do destino foram mantidos.', { cause: erro });
      }
    }
    if (mesmo) {
      if (destino.items.get(mesmo.id)?.system.quantidade !== quantidadeAnterior) {
        await destino.updateEmbeddedDocuments('Item', [{ _id: mesmo.id, 'system.quantidade': quantidadeAnterior }]);
        if (destino.items.get(mesmo.id)?.system.quantidade !== quantidadeAnterior) throw new Error('Não foi possível desfazer a soma na pilha do destino.', { cause: erro });
      }
    } else {
      const ids = dados.filter(d => destino.items.has(d._id)).map(d => d._id);
      if (ids.length) await destino.deleteEmbeddedDocuments('Item', ids);
      if (ids.some(id => destino.items.has(id))) throw new Error('Não foi possível apagar os itens criados no destino.', { cause: erro });
    }
    throw erro;
  }
}

// Os personagens com quem o usuário pode trocar (o "Trocar com" do CORE): os dele; o do usuário vem primeiro.
export const parceirosDoUsuario = () => game.actors.filter(ator => ator.type === 'personagem' && ator.isOwner);

// Pegar do contêiner (o "Pegar" do CORE, nos itens de graça: o saque e o esconderijo): o item vai para o personagem com
// quem a ficha troca, inteiro ou só uma parte da pilha (quantidade); sai do contêiner, menos no estoque infinito. Como
// no CORE, quem pega precisa ser dono do contêiner (todos os jogadores são, desde a criação).
export async function pegarDoConteiner(conteiner, item, { para = null, quantidade = null } = {}) {
  if (!conteiner.isOwner) { ui.notifications.warn(`${conteiner.name}: sem permissão para mexer neste contêiner.`); return null; }
  if (!para) { ui.notifications.warn('Escolha com quem trocar: o personagem que recebe o item.'); return null; }
  if (!para.isOwner) { ui.notifications.warn(`${para.name}: sem permissão para pôr itens nesta ficha.`); return null; }
  if (!conteiner.system.permissoes.deGraca) { ui.notifications.warn(`${conteiner.name}: os itens daqui têm preço.`); return null; }
  return levarItem(item, para, { quantidade, manterNaOrigem: conteiner.system.permissoes.estoqueInfinito });
}

// A trava: o jogador que tenta mover o token de um contêiner sem a permissão "Mover o contêiner" ganha o aviso, e o
// token fica onde está (o warn-on-moving-locked-container do CORE). O mestre move sempre.
export function registrarConteiner() {
  Hooks.on('preMoveToken', token => {
    if (token.actor?.type !== 'conteiner' || game.user.isGM || token.actor.system.permissoes.mover) return;
    ui.notifications.warn(`${token.name}: o contêiner está travado no lugar; só o mestre o move (a permissão "Mover o contêiner").`);
    return false;
  });
}

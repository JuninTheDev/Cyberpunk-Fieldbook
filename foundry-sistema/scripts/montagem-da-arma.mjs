// Pôr o upgrade na arma sem depender do arrasto (o C75; pedido do usuário de 2026-11-26: no inventário "não é possível
// arrastar" o upgrade até a bancada; "um botão que mostre todos os upgrades que o personagem tem no inventário e podem ser
// colocados naquela arma"). Dos dois lados: na bancada da arma (o C74), o "Escolher do inventário" lista as peças soltas do
// personagem (os acessórios e as modificações), com o que cabe e o motivo do que não cabe; no inventário, o "Instalar em…"
// do upgrade solto lista as armas dele. O acessório entra na hora (o documentos.mjs confere os slots, como no arrasto); a
// modificação vai pelo Tech (o C72): o jogador pede ao mestre, e o mestre abre a janela dele.
import { SISTEMA } from './config.mjs';
import { abrirInstalacao, instalacaoDe, pedirInstalacao } from './instalacao-mod.mjs';
import { modCabe } from './regras-modificacoes.mjs';
import { acessorioCabe, classeDoRebuild, rebuildCabe } from './regras.mjs';

const { DialogV2 } = foundry.applications.api;
const esc = valor => foundry.utils.escapeHTML(String(valor ?? ''));

// O acessório cabe na arma? Os slots, o carregador (um por vez) e o Rebuild de 2077 (o C47), como no _preUpdate.
export function compatibilidadeDoAcessorio(arma, acessorio) {
  const outros = arma.instalados.filter(item => item.id !== acessorio.id);
  const usados = outros.reduce((soma, item) => soma + arma.tamanhoNaArma(item), 0);
  const rebuild = classeDoRebuild(acessorio.getFlag(SISTEMA, 'arma2077'));
  if (rebuild) {
    const classe2077 = arma.getFlag(SISTEMA, 'arma2077')?.classe ?? null;
    return rebuildCabe({ rebuild, arma: arma.system, usados,
      outroRebuild: outros.some(item => classeDoRebuild(item.getFlag(SISTEMA, 'arma2077'))), classe2077 });
  }
  return acessorioCabe({
    slots: arma.system.slots, usados, tamanho: Number(acessorio.system.tamanho) || 0,
    carregador: Boolean(acessorio.system.modificadores?.pente),
    temCarregador: outros.some(item => item.type === 'upgrade' && item.system.modificadores?.pente)
  });
}

// A peça que vai numa arma: o acessório de arma ou a modificação (o defeito, não: ele vem do mestre). null: não vai.
export const tipoDaPeca = item => {
  if (item?.type !== 'upgrade') return null;
  if (item.modificacao) return instalacaoDe(item) ? 'modificacao' : null;
  return item.system.alvo === 'arma' ? 'acessorio' : null;
};
// Cabe nesta arma? { cabe, motivo }.
export function pecaCabe(arma, peca) {
  if (arma?.estadoDaQuebra) return { cabe: false, motivo: arma.estadoDaQuebra === 'reliquia' ? 'a arma é uma relíquia' : 'a arma está quebrada' };
  if (tipoDaPeca(peca) === 'modificacao') return modCabe(arma.paraModificacoes, arma.modificacoes.map(item => item.modificacao), peca.modificacao);
  return compatibilidadeDoAcessorio(arma, peca);
}
const soltas = ator => ator?.items.filter(item => tipoDaPeca(item) && !item.system.instaladoEm) ?? [];
const armasDe = ator => ator?.items.filter(item => item.type === 'arma' && !item.system.instaladoEm) ?? [];
// As peças soltas do personagem para a arma, as que cabem primeiro: [{ peca, tipo, cabe, motivo }].
export const pecasParaArma = arma => soltas(arma.actor).map(peca => ({ peca, tipo: tipoDaPeca(peca), ...pecaCabe(arma, peca) }))
  .sort((a, b) => Number(b.cabe) - Number(a.cabe) || a.peca.name.localeCompare(b.peca.name, 'pt-BR'));
// As armas do personagem para a peça solta: [{ arma, cabe, motivo }].
export const armasParaPeca = peca => armasDe(peca.actor).map(arma => ({ arma, ...pecaCabe(arma, peca) }))
  .sort((a, b) => Number(b.cabe) - Number(a.cabe) || a.arma.name.localeCompare(b.arma.name, 'pt-BR'));

// Põe a peça na arma: o acessório entra na hora; a modificação vai pelo Tech (o jogador pede; o mestre abre a janela).
export async function instalarPeca(peca, arma) {
  const tipo = tipoDaPeca(peca);
  if (!tipo || peca.actor?.id !== arma.actor?.id) return null;
  if (tipo === 'modificacao') return game.user.isGM ? abrirInstalacao({ mod: peca, arma }) : pedirInstalacao(peca, { arma });
  const { cabe, motivo } = pecaCabe(arma, peca);
  if (!cabe) { ui.notifications.warn(`${peca.name} não cabe em ${arma.name}: ${motivo}.`); return null; }
  await peca.update({ 'system.instaladoEm': arma.id });
  return peca.system.instaladoEm === arma.id ? peca : null;
}

const ROTULOS = { acessorio: 'Acessório', modificacao: 'Modificação' };
const botaoDaPeca = (tipo, cabe) => (!cabe ? '' : tipo === 'modificacao' && !game.user.isGM ? 'Pedir a instalação' : 'Instalar');
// Uma janela com uma lista e um botão por linha; o clique fecha e devolve o id da linha.
function escolherNaLista({ titulo, classe, intro, linhas, vazio }) {
  const corpo = linhas.length
    ? `<ul class="lista-da-montagem">${linhas.map(l => `<li class="${l.cabe ? 'cabe' : 'nao-cabe'}"><div><b>${esc(l.nome)}</b><small>${esc(l.detalhe)}</small>${l.cabe ? '' : `<small class="motivo">${esc(l.motivo)}</small>`}</div>${l.botao ? `<button type="button" data-escolher="${esc(l.id)}">${esc(l.botao)}</button>` : ''}</li>`).join('')}</ul>`
    : `<p class="nota">${esc(vazio)}</p>`;
  return new Promise(resolve => {
    let escolhido = null;
    const janela = new DialogV2({
      window: { title: titulo, icon: 'fa-solid fa-screwdriver-wrench' }, classes: [SISTEMA, classe, 'themed', 'theme-dark'],
      position: { width: 480 }, content: `<p>${esc(intro)}</p>${corpo}`,
      buttons: [{ action: 'fechar', label: 'Fechar', icon: 'fa-solid fa-xmark', default: true }],
      submit: () => resolve(escolhido)
    });
    janela.addEventListener('close', () => resolve(escolhido));
    janela.render({ force: true }).then(() => {
      for (const botao of janela.element.querySelectorAll('[data-escolher]')) {
        botao.addEventListener('click', evento => { evento.preventDefault(); escolhido = botao.dataset.escolher; janela.close(); });
      }
    });
  });
}
// O "Escolher do inventário" da bancada.
export async function abrirEscolha(arma) {
  if (!arma?.actor?.isOwner) return null;
  const linhas = pecasParaArma(arma).map(({ peca, tipo, cabe, motivo }) => ({
    id: peca.id, nome: peca.name, cabe, motivo, botao: botaoDaPeca(tipo, cabe),
    detalhe: `${ROTULOS[tipo]} · ${tipo === 'modificacao' ? peca.modificacao.tamanho : Number(peca.system.tamanho) || 0} slot(s)`
  }));
  const id = await escolherNaLista({
    titulo: `Escolher do inventário: ${arma.nomeDeExibicao ?? arma.name}`, classe: 'escolha-da-montagem', linhas,
    intro: 'Os acessórios e as modificações soltos do personagem. O acessório entra na hora; a modificação vai pelo Tech.',
    vazio: `${arma.actor.name} não tem acessório nem modificação solta no inventário.`
  });
  const peca = id ? arma.actor.items.get(id) : null;
  return peca ? instalarPeca(peca, arma) : null;
}
// O "Instalar em…" do upgrade solto no inventário.
export async function abrirInstalarEm(peca) {
  const tipo = tipoDaPeca(peca);
  if (!tipo || !peca.actor?.isOwner || peca.system.instaladoEm) return null;
  const linhas = armasParaPeca(peca).map(({ arma, cabe, motivo }) => ({
    id: arma.id, nome: arma.nomeDeExibicao ?? arma.name, cabe, motivo, botao: botaoDaPeca(tipo, cabe),
    detalhe: tipo === 'modificacao' ? `modificações ${arma.slotsDeModificacao.usados}/${arma.slotsDeModificacao.total}` : `acessórios ${arma.slotsUsados}/${arma.system.slots}`
  }));
  const id = await escolherNaLista({
    titulo: `Instalar ${peca.name}`, classe: 'instalar-em-arma', linhas,
    intro: tipo === 'modificacao' ? 'A modificação é permanente e vai pelo Tech (o teste dele).' : 'O acessório sai quando quiser, pela bancada ou pela ficha dele.',
    vazio: `${peca.actor.name} não tem arma.`
  });
  const arma = id ? peca.actor.items.get(id) : null;
  return arma ? instalarPeca(peca, arma) : null;
}

export const API = { compatibilidadeDoAcessorio, tipoDaPeca, pecaCabe, pecasParaArma, armasParaPeca, instalarPeca, abrirEscolha, abrirInstalarEm };

// O dano da NET aplicado pelo mestre (o C6 e o C7 do ROADMAP; o "apply damage" do CORE, com o dano "brain"): pelos botões
// do cartão do dano de um programa de ataque, do Zap ou do Black ICE, nos alvos marcados (T). No cérebro: o HP, sem a
// armadura (o Shield e o Armor da wiki, AtorCPR.receberDanoNoCerebro; o Shield não para o Black ICE). Num programa: um
// programa ativo do alvo, com REZ, escolhido na janela, perde a REZ e, em 0, desativa (ItemCPR.perderRez); o do Black ICE
// anti-programa, desativado, é destruído (o cartão avisa, e o mestre apaga). Na REZ: o Black ICE ou o demônio marcado
// perde a REZ (AtorCPR.receberDanoNaRez). O resultado vai num cartão.
import { ATORES_DA_NET, caminho, SISTEMA } from './config.mjs';

const { DialogV2 } = foundry.applications.api;
const esc = texto => foundry.utils.escapeHTML(String(texto ?? ''));

// Os alvos marcados do mestre que levam o dano da NET: na REZ, o Black ICE e o demônio; no cérebro e num programa, quem
// tem HP (personagem e capanga).
const COM_HP = ['personagem', 'capanga'];
const alvosDaNet = onde => [...game.user.targets].map(token => token.document ?? token).filter(token => (onde === 'rez' ? ATORES_DA_NET : COM_HP).includes(token.actor?.type));
const ONDE = { cerebro: 'no cérebro', programa: 'num programa', rez: 'na REZ' };

// Um programa ativo do alvo, com REZ, para o dano do anti-programa (ou do Zap). Sem nenhum, null (a wiki: o anti-programa
// caça o netrunner que não tem programas ativos).
async function escolherPrograma(ator, dano) {
  const programas = ator.items.filter(item => item.type === 'programa' && item.system.ativo && item.instaladoNo && item.rezAtual > 0);
  if (!programas.length) return null;
  if (programas.length === 1) return programas[0];
  const opcoes = programas.map(p => `<option value="${p.id}">${esc(p.name)} (REZ ${p.rezAtual}/${p.system.rez})</option>`).join('');
  const id = await DialogV2.prompt({
    window: { title: `${dano} de dano num programa de ${ator.name}` }, classes: [SISTEMA, 'escolher-programa'], rejectClose: false,
    content: `<label>Programa ativo <select name="programa" autofocus>${opcoes}</select></label>`,
    ok: { label: 'Aplicar', callback: (evento, botao) => botao.form.elements.programa.value }
  });
  return id ? ator.items.get(id) : null;
}

export async function aplicarDanoDeNet(mensagem, onde) {
  const dados = mensagem.getFlag(SISTEMA, 'danoDePrograma');
  if (!dados || !game.user.isGM) return null;
  const alvos = alvosDaNet(onde);
  if (!alvos.length) { ui.notifications.warn(onde === 'rez' ? 'Marque o Black ICE ou o demônio (T) que leva o dano.' : 'Marque o alvo (T) do dano da NET.'); return null; }
  const linhas = [];
  for (const token of alvos) {
    const ator = token.actor;
    if (onde === 'cerebro') {
      const r = await ator.receberDanoNoCerebro(dados.total, { dePrograma: !dados.zap, deBlackIce: Boolean(dados.blackIce) });
      linhas.push({ nome: token.name, texto: r.shield ? 'o Shield anulou o dano e se desativou' : `perdeu ${r.recebido} HP no cérebro (${r.hpAntes} → ${r.hpDepois})${r.reduzido ? `; o Armor reduziu ${r.reduzido}` : ''}` });
      continue;
    }
    if (onde === 'rez') {
      const r = await ator.receberDanoNaRez(dados.total);
      linhas.push({ nome: token.name, texto: `perdeu ${r.perdeu} de REZ (${r.antes} → ${r.depois})${r.desativado ? ' e foi desativado' : ''}` });
      continue;
    }
    const programa = await escolherPrograma(ator, dados.total);
    if (!programa) { linhas.push({ nome: token.name, texto: 'sem programa ativo com REZ: o anti-programa caça o netrunner (o mestre decide)' }); continue; }
    const antes = programa.rezAtual;
    await programa.perderRez(dados.total);
    const zerou = programa.rezAtual === 0;
    const fim = zerou && dados.destroi ? ' e desativou: o Black ICE anti-programa o destrói (o mestre apaga o programa)' : zerou ? ' e desativou' : '';
    linhas.push({ nome: token.name, texto: `o ${programa.name} perdeu ${antes - programa.rezAtual} de REZ (${antes} → ${programa.rezAtual})${fim}` });
  }
  const content = await foundry.applications.handlebars.renderTemplate(caminho('templates/chat/dano-net.hbs'), { total: dados.total, onde: ONDE[onde], linhas });
  return ChatMessage.implementation.create({ content, flags: { [SISTEMA]: { danoDaNet: { onde, total: dados.total, linhas } } } });
}

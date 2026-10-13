// O dano da NET aplicado pelo mestre (o C6 do ROADMAP; o "apply damage" do CORE, com o dano "brain"): pelos botões do
// cartão do dano de um programa de ataque ou do Zap, nos alvos marcados (T). No cérebro: o HP, sem a armadura (o Shield e
// o Armor da wiki, AtorCPR.receberDanoNoCerebro). Num programa: um programa ativo do alvo, com REZ, escolhido na janela,
// perde a REZ e, em 0, desativa (ItemCPR.perderRez). O resultado vai num cartão.
import { caminho, SISTEMA } from './config.mjs';

const { DialogV2 } = foundry.applications.api;
const esc = texto => foundry.utils.escapeHTML(String(texto ?? ''));

// Os alvos marcados do mestre que levam dano da NET (quem tem HP: personagem e capanga).
const alvosDaNet = () => [...game.user.targets].map(token => token.document ?? token).filter(token => ['personagem', 'capanga'].includes(token.actor?.type));

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
  const alvos = alvosDaNet();
  if (!alvos.length) { ui.notifications.warn('Marque o alvo (T) do dano da NET.'); return null; }
  const linhas = [];
  for (const token of alvos) {
    const ator = token.actor;
    if (onde === 'cerebro') {
      const r = await ator.receberDanoNoCerebro(dados.total, { dePrograma: !dados.zap });
      linhas.push({ nome: token.name, texto: r.shield ? 'o Shield anulou o dano e se desativou' : `perdeu ${r.recebido} HP no cérebro (${r.hpAntes} → ${r.hpDepois})${r.reduzido ? `; o Armor reduziu ${r.reduzido}` : ''}` });
      continue;
    }
    const programa = await escolherPrograma(ator, dados.total);
    if (!programa) { linhas.push({ nome: token.name, texto: 'sem programa ativo com REZ: o anti-programa caça o netrunner (o mestre decide)' }); continue; }
    const antes = programa.rezAtual;
    await programa.perderRez(dados.total);
    linhas.push({ nome: token.name, texto: `o ${programa.name} perdeu ${antes - programa.rezAtual} de REZ (${antes} → ${programa.rezAtual})${programa.rezAtual === 0 ? ' e desativou' : ''}` });
  }
  const content = await foundry.applications.handlebars.renderTemplate(caminho('templates/chat/dano-net.hbs'), { total: dados.total, onde: onde === 'cerebro' ? 'no cérebro' : 'num programa', linhas });
  return ChatMessage.implementation.create({ content, flags: { [SISTEMA]: { danoDaNet: { onde, total: dados.total, linhas } } } });
}

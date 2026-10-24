// Reconhecimento (wiki, p. 193): ao conhecer alguém, um d10 estritamente abaixo do nível de Reputação.
// Má fama usa a magnitude, decisão do usuário no C41.3; o valor assinado da ficha e o Facedown continuam os mesmos.
import { caminho, SISTEMA } from './config.mjs';
import { dadosDoCartao } from './dados-do-cartao.mjs';
import { modoDaMesa } from './mesa.mjs';
import { nivelDeReconhecimento, reconhecimentoPorReputacao } from './regras-reputacao.mjs';

const emCurso = new WeakSet();
const pode = ator => ['personagem', 'capanga'].includes(ator?.type) && ator.isOwner;
const mudou = () => { ui.notifications.warn('A ficha ou a permissão mudou durante o reconhecimento. Role novamente.'); return null; };

// É uma rolagem avulsa do dono: não altera recursos nem pede um mestre ou um alvo. O encontro e o sentido da fama
// são narrados pela mesa. Não usar testar(), que acrescentaria crítico, Sorte e modificadores ao d10 simples.
export async function rolarReputacao(ator, { modo } = {}) {
  if (!pode(ator) || emCurso.has(ator)) return null;
  emCurso.add(ator);
  try {
    if (await fromUuid(ator.uuid) !== ator || !pode(ator)) return null;
    const reputacao = ator.system.reputacao;
    const nivel = nivelDeReconhecimento(reputacao);
    if (nivel === null) {
      ui.notifications.warn('O reconhecimento usa Reputação inteira de −10 a 10. Confira o valor da ficha.');
      return null;
    }
    const nome = ator.name, usuario = game.user.id, modoDoTeste = modoDaMesa(modo);
    const aindaValido = async () => {
      const atual = await fromUuid(ator.uuid);
      return atual === ator && pode(ator) && game.user.id === usuario && ator.name === nome && ator.system.reputacao === reputacao;
    };
    const roll = await new Roll('1d10').evaluate();
    if (!await aindaValido()) return mudou();
    const resumo = { ator: ator.uuid, reputacao, nivel, total: roll.total, reconhecido: reconhecimentoPorReputacao(reputacao, roll.total) };
    const content = await foundry.applications.handlebars.renderTemplate(caminho('templates/chat/reputacao.hbs'), {
      ...resumo, nome, dados: dadosDoCartao(roll, { critico: false })
    });
    if (!await aindaValido()) return mudou();
    const mensagem = await ChatMessage.implementation.create({
      speaker: ChatMessage.implementation.getSpeaker({ actor: ator }), content, rolls: [roll],
      flags: { [SISTEMA]: { reconhecimento: resumo } }
    }, { messageMode: modoDoTeste });
    if (!mensagem) return null;
    return { ...resumo, roll, mensagem };
  } finally { emCurso.delete(ator); }
}

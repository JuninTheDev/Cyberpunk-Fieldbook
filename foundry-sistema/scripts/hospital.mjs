// A conta do hospital (o C41, parte 4; regras em regras-hospital.mjs): o botão "Hospital" das lesões críticas, só do
// mestre, abre a janela com a maior DV da visita, as noites no leito e o plano do Trauma Team (o da ficha, que ele pode
// trocar), com o total na hora. "Cobrar" tira o total dos Eurodólares pelo extrato (como o extrato, sair mais do que tem
// só avisa) e põe o cartão com a conta e o Desfazer, que devolve o dinheiro uma vez.
import { SISTEMA } from './config.mjs';
import { contaDoHospital, custoDaVisita, CUSTO_DO_LEITO, DVS_DA_VISITA, MAXIMO_DE_NOITES, PLANOS_DO_TRAUMA_TEAM, planoDoTraumaTeam } from './regras-hospital.mjs';

const esc = texto => foundry.utils.escapeHTML(String(texto ?? ''));
const eb = valor => `${Number(valor).toLocaleString('pt-BR')}eb`;
const rotuloDaDv = dv => (dv ? `DV${dv}${dv === 17 ? ' ou mais' : ''}: ${eb(custoDaVisita(dv))}` : 'Nenhuma (só o leito)');
const contasEmAndamento = new WeakSet();

// O que a conta diz, em partes: a visita, o leito e o plano.
function partes(conta) {
  const lista = [];
  if (conta.dv) lista.push(conta.incluida ? `visita DV${conta.dv} incluída no Trauma Team Executivo (seria ${eb(conta.doLivro)})` : `visita DV${conta.dv}: ${eb(conta.visita)}`);
  if (conta.noites) lista.push(`${conta.noites} ${conta.noites === 1 ? 'noite' : 'noites'} no leito: ${eb(conta.leito)}`);
  return lista;
}

function conteudo(dados) {
  const fim = dados.desfeito
    ? '<p class="resultado">Desfeita: o dinheiro voltou.</p>'
    : '<div class="botoes"><button type="button" data-cprf-acao="desfazerHospital">Desfazer</button></div>';
  return `<div class="${SISTEMA} cartao hospital${dados.desfeito ? ' desfeito' : ''}"><header><h3>Conta do hospital: ${esc(dados.nome)}</h3></header>`
    + `<p>${partes(dados).map(esc).join('; ')}.</p><p class="resultado">Total: <b>${eb(dados.total)}</b> pelo extrato (${esc(PLANOS_DO_TRAUMA_TEAM[dados.plano])}).</p>${fim}</div>`;
}

// O botão: a janela e a cobrança. Devolve a conta cobrada ou null.
export async function abrirContaDoHospital(ator) {
  if (!game.user.isGM || ator?.type !== 'personagem' || fromUuidSync(ator.uuid) !== ator || contasEmAndamento.has(ator)) return null;
  contasEmAndamento.add(ator);
  try {
    return await cobrarConta(ator);
  } finally {
    contasEmAndamento.delete(ator);
  }
}

async function cobrarConta(ator) {
  const { DialogV2 } = foundry.applications.api;
  const plano = planoDoTraumaTeam(ator.system.traumaTeam);
  const ler = campos => contaDoHospital({ dv: Number(campos.dv.value), noites: Number(campos.noites.value), plano: campos.plano.value });
  const escolha = await DialogV2.prompt({
    window: { title: `Conta do hospital: ${ator.name}` }, classes: [SISTEMA, 'conta-hospital'], rejectClose: false,
    content: `<p>A maior DV tratada na visita dá o custo; o leito é ${eb(CUSTO_DO_LEITO)} por noite. O Trauma Team Executivo inclui a cirurgia; o Prata a cobra pelo preço do hospital.</p>`
      + `<label>Maior DV da visita <select name="dv">${DVS_DA_VISITA.map(dv => `<option value="${dv}">${rotuloDaDv(dv)}</option>`).join('')}</select></label>`
      + `<label>Noites no leito <input type="number" name="noites" min="0" max="${MAXIMO_DE_NOITES}" step="1" value="0"></label>`
      + `<label>Trauma Team <select name="plano">${Object.entries(PLANOS_DO_TRAUMA_TEAM).map(([id, nome]) => `<option value="${id}"${id === plano ? ' selected' : ''}>${nome}${id === plano ? ' (o da ficha)' : ''}</option>`).join('')}</select></label>`
      + `<p class="total">Total: <output name="total">${eb(0)}</output> (Eurodólares de ${esc(ator.name)}: ${eb(Number(ator.system.dinheiro) || 0)})</p>`,
    render: (evento, dialogo) => {
      const form = dialogo.element.querySelector('form');
      const atualizar = () => { const conta = ler(form.elements); form.elements.total.value = conta.erro ?? eb(conta.total); };
      form.addEventListener('input', atualizar);
      form.addEventListener('change', atualizar);
      atualizar();
    },
    ok: { label: 'Cobrar', callback: (evento, botao) => ler(botao.form.elements) }
  });
  if (!escolha) return null;
  if (escolha.erro) { ui.notifications.warn(escolha.erro); return null; }
  if (fromUuidSync(ator.uuid) !== ator) return null;
  if (!escolha.total) { ui.notifications.info('Nada a cobrar: sem visita nem leito.'); return null; }
  const linha = await ator.mudarComExtrato('dinheiro', { acao: 'subtrair', valor: escolha.total, motivo: `Hospital: ${partes(escolha).join('; ')}` });
  if (linha.saldo < 0) ui.notifications.warn(`Eurodólares: saiu mais do que tinha (o saldo ficou em ${linha.saldo}).`);
  const dados = { ...escolha, ator: ator.uuid, nome: ator.name, desfeito: false };
  await ChatMessage.implementation.create({
    speaker: ChatMessage.implementation.getSpeaker({ actor: ator }), content: conteudo(dados),
    whisper: game.users.filter(user => user.isGM || ator.testUserPermission(user, 'OWNER')).map(user => user.id),
    flags: { [SISTEMA]: { hospital: dados } }
  });
  return escolha;
}

// O Desfazer do cartão (só o mestre): o total volta pelo extrato, uma vez; o cartão diz que foi desfeita.
export async function desfazerContaDoHospital(mensagem) {
  const dados = mensagem.getFlag(SISTEMA, 'hospital');
  if (!game.user.isGM || !dados) return null;
  if (dados.desfeito) { ui.notifications.warn('Esta conta já foi desfeita.'); return null; }
  const ator = await fromUuid(dados.ator);
  if (!ator) { ui.notifications.warn(`${dados.nome} não existe mais.`); return null; }
  await mensagem.update({ content: conteudo({ ...dados, desfeito: true }), [`flags.${SISTEMA}.hospital.desfeito`]: true });
  return ator.mudarComExtrato('dinheiro', { acao: 'somar', valor: dados.total, motivo: 'Desfeita: conta do hospital' });
}

export const API = { abrirContaDoHospital, desfazerContaDoHospital };

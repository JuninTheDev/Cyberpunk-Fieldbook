// Os perigos do ambiente (o C38; a wiki, system-rules.js:555-563, "Outras formas de se ferir", p. 180–181): o mestre
// aplica pela janela "Perigo do ambiente" (o /perigo no chat ou o botão do HUD do token) nos tokens controlados (sem
// nenhum, nos alvos marcados). As contas ficam em regras-perigos.mjs; aqui, a janela, a aplicação, os cartões, o Desfazer
// e o que acontece a cada turno (turnos.mjs chama):
// - fogo: o estado "Em chamas", com o dano no efeito (flags.fogo.dano e flags.perigo), cobrado aqui no fim do turno (o
//   netrun/index.mjs pula o fogo ativo do perigo); não acumula (vale o maior), e o maior toma o lugar do fogo que já
//   estava (o da munição incendiária, o do Hellhound e o do Overheat);
// - afogamento e asfixia: o cartão diz o fôlego (BODY minutos); "Sem ar" liga o estado, e no começo de cada turno o BODY
//   sai do HP;
// - eletrocução: 6d6 agora (a armadura absorve) e de novo no fim de cada turno, até "Afastou-se";
// - queda: 2d6 a cada 10 m (a armadura absorve) e o Atletismo DV15 contra a Perna Quebrada (com os +5 no HP); duas
//   cyberpernas anulam até 30 m;
// - veneno e droga: o dono rola WILL + Resistir Tortura/Drogas no computador dele, como a resistência da munição;
// - radiação: baixa só no cartão; alta e extrema como o fogo (2 e 6 no fim do turno), mas só sai da zona pelo cartão;
// - batida de veículo (o C40; a wiki, system-rules.js:538, p. 189–192): os tokens selecionados estão no veículo que
//   bateu, os alvos marcados (T) foram atingidos. O Traumatismo Cervical (com os +5) em todos; 6d6 no veículo de quem
//   dirige (o SDP menos o SP, uma vez por veículo); quem está a pé desvia com DEX + Evasão contra DV13 ou leva 6d6 no
//   corpo (a armadura absorve). O C46, parte 4: quem está num token de veículo (o motorista ou o passageiro) não está a pé,
//   e os 6d6 vão no veículo daquele token (no ligado, no item; no de NPC, no ator do token), uma vez por veículo.
import { jogadorDe, pedir, souOMestreAtivo } from './combate.mjs';
import { SISTEMA } from './config.mjs';
import { lesaoCritica } from './lesoes.mjs';
import { rolarResistencia } from './municoes.mjs';
import { STATUS_EM_CHAMAS } from './netrun/constantes.mjs';
import * as R from './regras-perigos.mjs';
import * as RL from './regras-lesoes.mjs';
import * as RV from './regras-veiculos.mjs';
import { tokenDaPessoa, veiculoDaTripulacao, veiculoDirigidoPor } from './tripulacao.mjs';
import { iconeDoEstado } from './regras-icones.mjs';

export const STATUS_SEM_AR = 'cprf-sem-ar';
export const STATUS_ELETROCUTADO = 'cprf-eletrocutado';
export const STATUS_RADIACAO = 'cprf-radiacao';
const ESTADOS = [
  { id: STATUS_SEM_AR, name: 'Sem ar', img: iconeDoEstado(STATUS_SEM_AR) },
  { id: STATUS_ELETROCUTADO, name: 'Eletrocutado', img: iconeDoEstado(STATUS_ELETROCUTADO) },
  { id: STATUS_RADIACAO, name: 'Na radiação', img: iconeDoEstado(STATUS_RADIACAO) }
];
// O botão do cartão que tira cada estado.
const SAIDA = { [STATUS_SEM_AR]: 'Respirou', [STATUS_ELETROCUTADO]: 'Afastou-se', [STATUS_RADIACAO]: 'Saiu da zona' };

const { DialogV2 } = foundry.applications.api;
const esc = texto => foundry.utils.escapeHTML(String(texto ?? ''));
const comHp = ator => ['personagem', 'capanga'].includes(ator?.type);
const corpo = ator => Number(ator.system.atributos.body.valor) || 0;
const temLesao = (ator, id) => ator.items.some(item => item.type === 'lesao' && item.getFlag(SISTEMA, 'catalogo') === id);
const temPernaQuebrada = ator => temLesao(ator, R.PERNA_QUEBRADA_NA_QUEDA);
const cyberpernasDe = ator => R.contarCyberpernas(ator.items.filter(item => item.type === 'cyberware').map(item => ({
  tipo: item.system.tipo, fundacional: item.system.fundacional, instalado: item.system.instalado, catalogo: item.getFlag(SISTEMA, 'catalogo') ?? '', nome: item.name
})));

// O ator de um Actor, de um Token, de um TokenDocument ou de um uuid.
async function atorDe(alvo) {
  const doc = typeof alvo === 'string' ? await fromUuid(alvo) : alvo;
  const documento = doc?.document ?? doc;
  return documento instanceof Actor ? documento : documento?.actor ?? null;
}

// O TokenDocument de um Token, de um TokenDocument ou de um uuid; o do ator sintético. O ator do mundo: null (a batida
// procura o token dele na cena, tripulacao.tokenDaPessoa).
async function tokenDoAlvo(alvo) {
  const doc = typeof alvo === 'string' ? await fromUuid(alvo) : alvo;
  const documento = doc?.document ?? doc;
  return documento?.documentName === 'Token' ? documento : documento?.token ?? null;
}

// Os tokens da vez: o do HUD primeiro, com os outros controlados; sem ele, os controlados; sem nenhum, os alvos marcados.
function tokensDaVez(primeiro = null) {
  const controlados = (canvas?.tokens?.controlled ?? []).map(token => token.document);
  const lista = primeiro ? [primeiro, ...controlados.filter(token => token.id !== primeiro.id)]
    : controlados.length ? controlados : [...game.user.targets].map(token => token.document);
  return lista.filter(token => comHp(token?.actor));
}
// A batida (o C40): no veículo, os tokens da vez sem a volta para os alvos marcados (o do HUD ou o do cartão primeiro, com
// os controlados); atingidos, os alvos marcados que não estão no veículo. Um token, ou o ator sem token (o do cartão).
const controlados = () => (canvas?.tokens?.controlled ?? []).map(token => token.document).filter(token => comHp(token?.actor));
const marcados = () => [...game.user.targets].map(token => token.document).filter(token => comHp(token?.actor));
const atorDoToken = token => (token instanceof Actor ? token : token?.actor ?? null);
const fora = (lista, outros) => lista.filter(token => !outros.some(outro => atorDoToken(outro) === atorDoToken(token)));
const noVeiculoDaVez = (primeiro = null) => (primeiro ? [primeiro, ...fora(controlados(), [primeiro])] : controlados());

// ---------------- A janela ----------------
const opcoesDoNivel = (perigo, escolhido) => R.niveisDe(perigo).map(id => `<option value="${id}"${id === escolhido ? ' selected' : ''}>${esc(R.nivelDe(perigo, id).rotulo)}</option>`).join('');

// A janela "Perigo do ambiente" (só o mestre): o perigo, o nível ou os metros, e os tokens da vez. perigo, nivel e metros
// preenchem a janela (os argumentos do /perigo); tokens: os do HUD (ou o do cartão da direção, na batida). Na batida, a
// janela mostra os do veículo e os atingidos. Aplicado, devolve o resumo do aplicar; fechada, null.
export async function abrir({ perigo = '', nivel = '', metros = null, tokens = null } = {}) {
  if (!game.user.isGM) { ui.notifications.warn('Só o mestre aplica um perigo do ambiente.'); return null; }
  const alvos = tokens ?? tokensDaVez();
  if (!alvos.length) { ui.notifications.warn('Perigo do ambiente: selecione os tokens (ou marque os alvos) que o sofrem.'); return null; }
  const noVeiculo = tokens ?? noVeiculoDaVez();
  const atingidos = fora(marcados(), noVeiculo);
  const nomes = lista => (lista.length ? lista.map(token => esc(token.name)).join(', ') : 'ninguém');
  const inicial = R.PERIGOS[perigo] ? perigo : 'fogo';
  const opcoes = Object.entries(R.PERIGOS).map(([id, p]) => `<option value="${id}"${id === inicial ? ' selected' : ''}>${esc(p.nome)}</option>`).join('');
  const escolha = await DialogV2.wait({
    window: { title: 'Perigo do ambiente', icon: 'fa-solid fa-triangle-exclamation' },
    classes: [SISTEMA, 'perigo-do-ambiente', 'themed', 'theme-dark'],
    position: { width: 420 },
    rejectClose: false,
    content: `<div class="form-group"><label>Perigo <select name="perigo">${opcoes}</select></label></div>
      <div class="form-group" data-campo="nivel"><label>Nível <select name="nivel">${opcoesDoNivel(inicial, R.nivelValido(inicial, nivel))}</select></label></div>
      <div class="form-group" data-campo="metros"><label>Metros <input name="metros" type="number" min="0" step="1" value="${Number(metros) >= 0 && metros !== null ? Number(metros) : 10}"></label></div>
      <p class="nota" data-campo="em">Em: ${alvos.map(token => esc(token.name)).join(', ')}.</p>
      <div data-campo="batida"><p class="nota" data-lista="noVeiculo">No veículo (os selecionados): ${nomes(noVeiculo)}.</p>
      <p class="nota" data-lista="atingidos">Atingidos (os alvos marcados): ${nomes(atingidos)}.</p></div>
      <p class="nota" data-campo="pagina">${esc(R.PAGINA_DOS_PERIGOS)}</p>`,
    buttons: [
      { action: 'aplicar', label: 'Aplicar', icon: 'fa-solid fa-check', default: true, callback: (evento, botao) => ({
        perigo: botao.form.elements.perigo.value, nivel: botao.form.elements.nivel.value, metros: Number(botao.form.elements.metros.value) || 0
      }) },
      { action: 'cancelar', label: 'Cancelar', icon: 'fa-solid fa-xmark' }
    ],
    render: (evento, janela) => {
      const formulario = janela.element.querySelector('form') ?? janela.element;
      const campo = nome => formulario.querySelector(`[name="${nome}"]`);
      const mostrar = () => {
        const p = campo('perigo').value;
        formulario.querySelector('[data-campo="nivel"]').style.display = R.niveisDe(p).length ? '' : 'none';
        formulario.querySelector('[data-campo="metros"]').style.display = R.PERIGOS[p].metros ? '' : 'none';
        formulario.querySelector('[data-campo="em"]').style.display = R.PERIGOS[p].batida ? 'none' : '';
        formulario.querySelector('[data-campo="batida"]').style.display = R.PERIGOS[p].batida ? '' : 'none';
        formulario.querySelector('[data-campo="pagina"]').textContent = R.PERIGOS[p].pagina ?? R.PAGINA_DOS_PERIGOS;
      };
      campo('perigo').addEventListener('change', () => {
        campo('nivel').innerHTML = opcoesDoNivel(campo('perigo').value, '');
        mostrar();
      });
      mostrar();
    }
  });
  if (!escolha || typeof escolha !== 'object') return null;
  if (R.PERIGOS[escolha.perigo]?.batida) return aplicar({ perigo: escolha.perigo, atores: noVeiculo, atingidos });
  return aplicar({ ...escolha, atores: alvos });
}

// O botão do HUD do token (só o mestre vê), como o da DV (regua-dv.mjs): abre a janela com este token e os outros
// controlados.
export function botaoNoHud(app, elemento) {
  if (!game.user.isGM) return;
  const doc = app?.document ?? app?.object?.document;
  if (!comHp(doc?.actor)) return;
  const coluna = (elemento instanceof HTMLElement ? elemento : app?.element)?.querySelector?.('.col.left');
  if (!doc || !coluna || coluna.querySelector(`.${SISTEMA}-perigo`)) return;
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = `control-icon ${SISTEMA}-perigo`;
  botao.dataset.tooltip = 'Perigo do ambiente';
  botao.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
  botao.addEventListener('click', evento => {
    evento.preventDefault();
    evento.stopPropagation();
    app.close?.();
    abrir({ tokens: tokensDaVez(doc) }).catch(erro => console.error(`${SISTEMA} | perigo`, erro));
  });
  coluna.append(botao);
}

// ---------------- A aplicação ----------------
// A resistência pela janela de rolagem do dono (a Sorte e os situacionais), como a da munição (municoes.mjs, o tratador
// "municao" do combate/socket.mjs); sem dono, ou sem resposta, o mestre rola. Também a direção sob pressão (direcao.mjs).
export async function resistir(ator, { pericia, dv, nome }) {
  const dados = { ator: ator.uuid, pericia, dv, nome };
  const dono = jogadorDe(ator);
  const teste = (dono ? await pedir(dono, 'municao', dados) : null) ?? await rolarResistencia(dados);
  return teste ? { total: teste.total, dv, passou: R.superou(teste.total, dv) } : null;
}

// O dano direto no HP. Quem dorme pela Sonífera acorda com ele pelo gancho do municoes.mjs (registrarMunicoes), como
// com qualquer HP perdido.
async function danoDireto(ator, valor) {
  const hpAntes = ator.system.hp.value;
  await ator.update({ 'system.hp.value': hpAntes - valor });
  return { hpAntes, hpDepois: ator.system.hp.value };
}
// O dano no corpo: a armadura absorve, e a ablação é a de sempre (documentos.mjs, receberDano).
async function danoNoCorpo(ator, dano) {
  return ator.receberDano({ dano, local: 'corpo' });
}

// O resumo do receberDano para o Desfazer (o desfazerDano: o HP perdido e o SP de cada armadura, pela diferença).
const danoParaDesfazer = (resumo, perdeu) => ({ perdeu, armaduraId: resumo?.armaduraId ?? null, lugar: resumo?.lugar ?? null, ablado: resumo?.ablado ?? 0, armaduras: resumo?.armaduras ?? [] });
const ativoCom = (ator, status) => ator.effects.find(efeito => efeito.active && efeito.statuses.has(status)) ?? null;

// Uma fila por chave (o ator na aplicação, a mensagem nos botões), como o filasDasLesoes de lesoes.mjs: duas aplicações
// ao mesmo tempo no mesmo ator, ou dois botões do mesmo cartão, rodam uma depois da outra e leem o que a anterior deixou.
const filasDosAtores = new Map();
const filasDasMensagens = new Map();
function naFila(filas, chave, tarefa) {
  const atual = (filas.get(chave) ?? Promise.resolve()).then(tarefa);
  const fim = atual.then(() => {}, () => {});
  filas.set(chave, fim);
  fim.then(() => { if (filas.get(chave) === fim) filas.delete(chave); });
  return atual;
}
const textoDoDano = (formula, total, resumo) => `${formula}: ${total} contra SP ${resumo.sp}: ${resumo.passou ? `perdeu ${resumo.recebido} HP (${resumo.hpAntes} → ${resumo.hpDepois})` : 'a armadura segurou'}${resumo.ablado ? `; a armadura perdeu ${resumo.ablado} de SP` : ''}.`;

// Liga um estado do perigo (o efeito do status, com as flags), se ainda não está ligado. Devolve o efeito criado, ou null.
async function ligar(ator, status, flags = {}) {
  if (ator.statuses.has(status)) return null;
  const efeito = await ActiveEffect.implementation.fromStatusEffect(status, { parent: ator });
  efeito.updateSource({ [`flags.${SISTEMA}`]: { ...flags, perigo: true } });
  return ActiveEffect.implementation.create(efeito.toObject(), { parent: ator, keepId: true });
}

// O fogo e a radiação não acumulam: vale o maior (regras-perigos.fogoQueVale), entre os efeitos ativos (um desligado na
// configuração do efeito não conta). O maior toma o lugar de todos os que têm o status, ativos ou não (o fogo da munição
// incendiária, do Hellhound e do Overheat, todos "Em chamas"; o queimar da NET lê o primeiro), e o Desfazer os recria.
async function acender(ator, linha, { status, chave, dano, de }) {
  const existentes = ator.effects.filter(efeito => efeito.statuses.has(status));
  const ativos = existentes.filter(efeito => efeito.active);
  const atual = ativos.length ? Math.max(...ativos.map(efeito => Number(efeito.getFlag(SISTEMA, chave)?.dano) || 2)) : null;
  const decisao = R.fogoQueVale(atual, dano);
  if (decisao === 'manter') return { decisao, atual };
  if (existentes.length) {
    linha.desfazer.trocados.push(...existentes.map(efeito => efeito.toObject()));
    await ator.deleteEmbeddedDocuments('ActiveEffect', existentes.map(efeito => efeito.id));
  }
  const criado = await ligar(ator, status, { [chave]: { dano, de } });
  if (criado) linha.desfazer.estados.push(criado.id);
  return { decisao, atual };
}

// Depois de esperar uma rolagem (o resistir): o ator lido de novo pelo uuid (o vivo). Apagado no meio (o token tirado da
// cena), a linha diz isso, e o perigo para nele (null).
function aindaNaMesa(ator, linha) {
  const atual = vivo(ator);
  if (comHp(atual)) return atual;
  linha.notas.push(`${ator.name} saiu da mesa durante a rolagem: o perigo parou aqui.`);
  return null;
}

const APLICAR = {
  async fogo(ator, linha, { nivel }) {
    const n = R.nivelDe('fogo', nivel);
    const { decisao, atual } = await acender(ator, linha, { status: STATUS_EM_CHAMAS, chave: 'fogo', dano: n.dano, de: n.nome });
    linha.notas.push(decisao === 'manter'
      ? `Já em chamas (${atual} no HP por turno): o fogo não acumula, vale o maior.`
      : `${n.nome}: em chamas, ${n.dano} direto no HP no fim de cada turno (sem armadura), até gastar uma Ação para se apagar.${decisao === 'trocar' ? ` Tomou o lugar do fogo de ${atual}.` : ''}`);
    linha.botoes.push(botaoDeApagar(ator));
  },
  async afogamento(ator, linha) {
    linha.notas.push(`Segura o fôlego por ${R.folegoEmMinutos(corpo(ator))} minutos (o BODY). Depois, sem ar: ${corpo(ator)} direto no HP no começo de cada turno.`);
    if (ator.statuses.has(STATUS_SEM_AR)) linha.notas.push('Já está sem ar.');
    linha.botoes.push(`<button type="button" data-cprf-perigo="semAr" data-ator="${ator.uuid}">Sem ar</button>`, botaoDeSaida(ator, STATUS_SEM_AR));
  },
  async eletrocucao(ator, linha, ctx) {
    const roll = await new Roll(R.DANO_DA_ELETROCUCAO).evaluate();
    ctx.rolagens.push(roll);
    const resumo = await danoNoCorpo(ator, roll.total);
    linha.desfazer.dano = danoParaDesfazer(resumo, resumo.hpAntes - resumo.hpDepois);
    linha.notas.push(textoDoDano(R.DANO_DA_ELETROCUCAO, roll.total, resumo));
    const criado = await ligar(ator, STATUS_ELETROCUTADO);
    if (criado) linha.desfazer.estados.push(criado.id);
    linha.notas.push(`Eletrocutado: mais ${R.DANO_DA_ELETROCUCAO} no fim de cada turno, até se afastar da fonte.`);
    linha.botoes.push(botaoDeSaida(ator, STATUS_ELETROCUTADO));
  },
  async queda(ator, linha, ctx) {
    const queda = R.quedaDe(ctx.metros, cyberpernasDe(ator));
    if (queda.motivo === 'baixa') { linha.notas.push(`Caiu ${ctx.metros} m: menos de 10 m, sem dano.`); return; }
    if (queda.motivo === 'cyberpernas') { linha.notas.push(`Caiu ${ctx.metros} m: duas cyberpernas anulam a queda até ${R.QUEDA_DAS_CYBERPERNAS} m (nem dano, nem teste).`); return; }
    const roll = await new Roll(queda.formula).evaluate();
    ctx.rolagens.push(roll);
    const resumo = await danoNoCorpo(ator, roll.total);
    // O Desfazer leva só a perda do impacto e a dos +5: o que mudou no HP enquanto se esperava o Atletismo (um ataque no
    // meio) não entra. O do impacto já vale se o resto não terminar.
    let bonus = 0;
    linha.desfazer.dano = danoParaDesfazer(resumo, resumo.hpAntes - resumo.hpDepois);
    linha.notas.push(`Caiu ${ctx.metros} m: ${textoDoDano(queda.formula, roll.total, resumo)}`);
    const teste = await resistir(ator, { pericia: R.PERICIA_DA_QUEDA, dv: R.DV_DA_QUEDA, nome: 'Queda: Atletismo contra a Perna Quebrada' });
    linha.teste = teste;
    ator = aindaNaMesa(ator, linha);
    if (!ator) return;
    if (!teste) linha.notas.push('Sem o teste de Atletismo: o mestre decide a Perna Quebrada.');
    else if (teste.passou) linha.notas.push(`Atletismo ${teste.total} contra DV${teste.dv}: evitou a Perna Quebrada.`);
    else if (temPernaQuebrada(ator)) linha.notas.push(`Atletismo ${teste.total} contra DV${teste.dv}: falhou, mas já tinha a Perna Quebrada (sem lesão nova e sem os +${R.BONUS_DA_LESAO}).`);
    else {
      const feita = await lesaoCritica(ator, { id: R.PERNA_QUEBRADA_NA_QUEDA, falar: false });
      if (feita?.item) {
        linha.desfazer.lesoes.push(feita.item.id);
        linha.lesao = feita.nome;
        const { hpAntes, hpDepois } = await danoDireto(ator, R.BONUS_DA_LESAO);
        bonus = hpAntes - hpDepois;
        linha.notas.push(`Atletismo ${teste.total} contra DV${teste.dv}: falhou. Lesão crítica: ${feita.nome}, +${R.BONUS_DA_LESAO} direto no HP (fica com ${hpDepois}).`);
      } else linha.notas.push(`Atletismo ${teste.total} contra DV${teste.dv}: falhou, mas a Perna Quebrada não entrou na ficha.`);
    }
    linha.desfazer.dano = danoParaDesfazer(resumo, resumo.hpAntes - resumo.hpDepois + bonus);
  },
  async veneno(ator, linha, ctx) {
    const n = R.nivelDe('veneno', ctx.nivel);
    const teste = await resistir(ator, { pericia: R.PERICIA_DO_VENENO, dv: n.dv, nome: n.nome });
    linha.teste = teste;
    ator = aindaNaMesa(ator, linha);
    if (!ator) return;
    if (!teste) { linha.notas.push('Sem a rolagem de resistência.'); return; }
    if (teste.passou) { linha.notas.push(`Resistência ${teste.total} contra DV${n.dv}: resistiu.`); return; }
    const roll = await new Roll(n.dano).evaluate();
    ctx.rolagens.push(roll);
    const { hpAntes, hpDepois } = await danoDireto(ator, roll.total);
    linha.desfazer.dano = { perdeu: hpAntes - hpDepois };
    linha.notas.push(`Resistência ${teste.total} contra DV${n.dv}: falhou. ${n.dano}: ${roll.total} direto no HP, sem armadura (${hpAntes} → ${hpDepois}).`);
  },
  async droga(ator, linha, ctx) {
    const n = R.nivelDe('droga', ctx.nivel);
    const teste = await resistir(ator, { pericia: R.PERICIA_DO_VENENO, dv: n.dv, nome: n.nome });
    linha.teste = teste;
    if (!teste) linha.notas.push('Sem a rolagem de resistência.');
    else linha.notas.push(`Resistência ${teste.total} contra DV${n.dv}: ${teste.passou ? 'resistiu' : `falhou: ${n.efeito}`}.`);
  },
  async radiacao(ator, linha, { nivel }) {
    const n = R.nivelDe('radiacao', nivel);
    if (!n.dano) { linha.notas.push(`${n.nome}: adoece com o tempo, a critério do mestre.`); return; }
    const { decisao, atual } = await acender(ator, linha, { status: STATUS_RADIACAO, chave: 'radiacao', dano: n.dano, de: n.nome });
    linha.notas.push(decisao === 'manter'
      ? `Já na radiação (${atual} no HP por turno): não acumula, vale a maior.`
      : `${n.nome}: ${n.dano} direto no HP no fim de cada turno, enquanto estiver na zona (não se apaga com uma Ação).${decisao === 'trocar' ? ` Tomou o lugar da radiação de ${atual}.` : ''}`);
    linha.botoes.push(botaoDeSaida(ator, STATUS_RADIACAO));
  },
  // A batida (o C40): linha.papel diz se o ator estava no veículo que bateu ("veiculo") ou foi atingido ("atingido"). O C46,
  // parte 4: dentro de um token de veículo (linha.token, o token dele), o veículo batido é o daquele token (o ator dele, que
  // no ligado grava no item), também para o passageiro; fora, o que ele dirige (o do C40).
  async batida(ator, linha, ctx) {
    const veiculo = veiculoDirigidoPor(ator, linha.token);
    const dentro = veiculoDaTripulacao(tokenDaPessoa(ator, linha.token));
    const batido = dentro?.actor ?? veiculo;
    if (linha.papel === 'atingido' && !batido) {
      linha.notas.push('Atingido a pé.');
      const teste = await resistir(ator, { pericia: RV.PERICIA_DE_DESVIAR, dv: RV.DV_DESVIAR_A_PE, nome: 'Batida: desviar do veículo (DEX + Evasão)' });
      linha.teste = teste;
      ator = aindaNaMesa(ator, linha);
      if (!ator) return;
      if (!teste) { linha.notas.push('Sem o teste de Evasão: o mestre decide.'); return; }
      if (teste.passou) { linha.notas.push(`Evasão ${teste.total} contra DV${teste.dv}: desviou do veículo.`); return; }
      const roll = await new Roll(RV.DANO_DA_BATIDA).evaluate();
      ctx.rolagens.push(roll);
      const resumo = await danoNoCorpo(ator, roll.total);
      linha.desfazer.dano = danoParaDesfazer(resumo, resumo.hpAntes - resumo.hpDepois);
      linha.notas.push(`Evasão ${teste.total} contra DV${teste.dv}: falhou. ${textoDoDano(RV.DANO_DA_BATIDA, roll.total, resumo)}`);
      const bonus = await lesaoDaBatida(ator, linha);
      linha.desfazer.dano = danoParaDesfazer(resumo, resumo.hpAntes - resumo.hpDepois + bonus);
      return;
    }
    const sem = dentro ? `No veículo ${batido.name}, sem dirigir.` : 'No veículo, sem dirigir.';
    linha.notas.push(linha.papel === 'atingido' ? (veiculo ? `Atingido, dirigindo ${veiculo.name}.` : `Atingido no veículo ${batido.name}, sem dirigir.`)
      : veiculo ? `No veículo, dirigindo ${veiculo.name}.` : sem);
    if (batido) await baterOVeiculo(batido, linha, ctx);
    const bonus = await lesaoDaBatida(ator, linha);
    if (bonus) linha.desfazer.dano = { perdeu: bonus };
  }
};

// Os 6d6 da batida no veículo (o receberDanoVeicular: o SDP menos o SP, com a ablação). Uma vez por veículo: a lista do
// aplicar não repete o ator, mas o motorista e os passageiros do mesmo token de veículo (o C46, parte 4) são linhas
// diferentes.
async function baterOVeiculo(veiculo, linha, ctx) {
  ctx.batidos ??= new Set();
  if (ctx.batidos.has(veiculo.uuid)) { linha.notas.push(`${veiculo.name}: os ${RV.DANO_DA_BATIDA} já entraram nesta batida.`); return; }
  ctx.batidos.add(veiculo.uuid);
  const roll = await new Roll(RV.DANO_DA_BATIDA).evaluate();
  ctx.rolagens.push(roll);
  const conta = await veiculo.receberDanoVeicular({ dano: roll.total });
  if (!conta) { linha.notas.push(`${veiculo.name}: o dano no veículo não entrou.`); return; }
  linha.desfazer.veiculos.push({ veiculo: veiculo.uuid, perdeu: conta.perdeu, ablado: conta.ablado });
  linha.notas.push(`${veiculo.name}: ${RV.DANO_DA_BATIDA}: ${roll.total} contra SP ${conta.sp}: ${conta.passou ? `perdeu ${conta.perdeu} de SDP (${conta.antes} → ${conta.depois})` : 'a blindagem segurou'}${conta.ablado ? `; a blindagem perdeu ${conta.ablado} de SP` : ''}.`);
}

// O Traumatismo Cervical da batida, com os +5 direto no HP (a decisão do usuário, como a Perna Quebrada da queda); quem já
// o tem não ganha outro nem os +5. Devolve o HP que os +5 tiraram.
async function lesaoDaBatida(ator, linha) {
  if (temLesao(ator, RV.LESAO_DA_BATIDA)) { linha.notas.push(`Já tinha o Traumatismo Cervical: sem lesão nova e sem os +${R.BONUS_DA_LESAO}.`); return 0; }
  const feita = await lesaoCritica(ator, { id: RV.LESAO_DA_BATIDA, falar: false });
  if (!feita?.item) { linha.notas.push('O Traumatismo Cervical não entrou na ficha.'); return 0; }
  linha.desfazer.lesoes.push(feita.item.id);
  linha.lesao = feita.nome;
  const { hpAntes, hpDepois } = await danoDireto(ator, R.BONUS_DA_LESAO);
  linha.notas.push(`Lesão crítica: ${feita.nome}, +${R.BONUS_DA_LESAO} direto no HP (${hpAntes} → ${hpDepois}).`);
  return hpAntes - hpDepois;
}

const botaoDeApagar = ator => `<button type="button" data-cprf-acao="apagarFogo" data-ator="${ator.uuid}">Apagar fogo (uma Ação)</button>`;
const botaoDeSaida = (ator, status) => `<button type="button" data-cprf-perigo="tirar" data-estado="${status}" data-ator="${ator.uuid}">${SAIDA[status]}</button>`;
const temOQueDesfazer = entrada => Boolean(entrada.dano || entrada.estados.length || entrada.trocados.length || entrada.lesoes.length || entrada.veiculos?.length);

// Aplica um perigo sem a janela (a macro, o G4 e a janela): perigo (as chaves de regras-perigos.PERIGOS), nivel, metros (a
// queda) e atores (Actor, Token, TokenDocument ou uuid). Na batida, atores são os do veículo que bateu e atingidos, o que
// foi atingido (quem está nas duas listas fica só no veículo). Só o mestre ativo. Devolve o resumo por ator, com o id do
// cartão.
export async function aplicar({ perigo, nivel = '', metros = 0, atores = [], atingidos = [] } = {}) {
  if (!souOMestreAtivo()) { ui.notifications.warn('Só o mestre ativo aplica um perigo do ambiente.'); return null; }
  const regra = R.PERIGOS[perigo];
  if (!regra) { ui.notifications.warn(`Perigo do ambiente desconhecido: ${perigo}.`); return null; }
  const lista = [];
  const papeis = new Map(), tokens = new Map();
  for (const [papel, alvos] of [['veiculo', atores], ['atingido', regra.batida ? atingidos : []]]) {
    for (const alvo of [alvos].flat()) {
      const ator = await atorDe(alvo);
      if (comHp(ator) && !lista.includes(ator)) { lista.push(ator); papeis.set(ator, papel); }
      // O token de cada um (a batida acha o veículo em que ele está, o C46 parte 4): o primeiro que vier.
      if (comHp(ator) && !tokens.get(ator)) tokens.set(ator, await tokenDoAlvo(alvo));
    }
  }
  if (!lista.length) { ui.notifications.warn('Perigo do ambiente: selecione os tokens (ou marque os alvos) que o sofrem.'); return null; }
  const ctx = { perigo, nivel: R.nivelValido(perigo, nivel), metros: Math.max(0, Number(metros) || 0), rolagens: [], linhas: [] };
  for (const ator of lista) {
    const linha = { ator, papel: papeis.get(ator), token: tokens.get(ator) ?? null, hpAntes: null, notas: [], botoes: [], teste: null, lesao: null,
      desfazer: { ator: ator.uuid, dano: null, estados: [], trocados: [], lesoes: [], veiculos: [] } };
    // Na fila do ator: o perigo lê os efeitos e o HP que a aplicação anterior no mesmo ator deixou. Um erro no meio (o
    // ator apagado durante a rolagem) fica numa nota da linha: os outros seguem, e o cartão sai com o Desfazer do que já
    // aconteceu.
    await naFila(filasDosAtores, ator.uuid, async () => {
      linha.hpAntes = ator.system.hp.value;
      try {
        await APLICAR[perigo](ator, linha, ctx);
      } catch (erro) {
        console.warn(`${SISTEMA} | perigo`, erro);
        linha.notas.push(`Não terminou: ${erro?.message ?? erro}`);
      }
    });
    ctx.linhas.push(linha);
  }
  const titulo = R.nivelDe(perigo, ctx.nivel)?.nome ?? (perigo === 'queda' ? `Queda de ${ctx.metros} m` : regra.nome);
  const desfazer = ctx.linhas.map(linha => linha.desfazer);
  const comDesfazer = perigo === 'afogamento' || desfazer.some(temOQueDesfazer);
  const content = `<div class="${SISTEMA} cartao perigo"><header><h3>Perigo: ${esc(titulo)}</h3><span class="sabor">${esc(regra.pagina ?? R.PAGINA_DOS_PERIGOS)}</span></header>
    <ol class="alvos">${ctx.linhas.map(linha => `<li class="alvo"><div class="linha"><img src="${esc(linha.ator.token?.texture?.src || linha.ator.img)}" alt=""><b>${esc(linha.ator.name)}</b></div>
      ${linha.notas.map(nota => `<p class="nota">${esc(nota)}</p>`).join('')}${linha.botoes.length ? `<div class="botoes">${linha.botoes.join('')}</div>` : ''}</li>`).join('')}</ol>
    ${perigo === 'queda' ? `<p class="nota">${esc(R.LEMBRETE_DA_QUEDA)}</p>` : ''}
    ${comDesfazer ? '<div class="botoes"><button type="button" data-cprf-perigo="desfazer">Desfazer</button></div>' : ''}</div>`;
  const mensagem = await ChatMessage.implementation.create({
    speaker: lista.length === 1 ? ChatMessage.implementation.getSpeaker({ actor: lista[0] }) : { alias: 'Perigo do ambiente' }, content, rolls: ctx.rolagens,
    flags: { [SISTEMA]: { perigo: { tipo: 'aplicacao', perigo, nivel: ctx.nivel, metros: ctx.metros, desfazer } } }
  });
  return {
    mensagem: mensagem.id, perigo, nivel: ctx.nivel, metros: ctx.metros,
    atores: ctx.linhas.map(linha => ({ ator: linha.ator.uuid, nome: linha.ator.name, papel: linha.papel, hpAntes: linha.hpAntes, hpDepois: linha.ator.system.hp.value, teste: linha.teste, lesao: linha.lesao,
      veiculos: linha.desfazer.veiculos, notas: linha.notas }))
  };
}

// ---------------- Os turnos (turnos.mjs, no mestre ativo) ----------------
// Cada tick marca no efeito o turno em que já aplicou (como o fogoNoFimDoTurno, municoes.mjs), para não aplicar duas vezes;
// a flag vale depois de recarregar a página. Os ticks do mesmo ator rodam na fila dele (naVezDoAtor): o segundo de dois
// ganchos ao mesmo tempo já lê a marca do primeiro.
async function marcar(efeito, chave, turno) {
  if (efeito.getFlag(SISTEMA, chave) === turno) return false;
  await efeito.setFlag(SISTEMA, chave, turno);
  return true;
}

// O momento do turno, tirado na hora do updateCombat (turnos.mjs, antes de qualquer await): quem acabou o turno
// (combate.previous) e quem começa (combate.combatant, também o combatente do Death Save), com a chave de cada turno.
// Depois dos await (o Death Save do jogador espera o prazo inteiro), o combate pode já estar em outro turno.
export function momentoDoTurno(combate) {
  const anterior = combate.previous;
  // Pelo combatente: vale também no combate sem cena (o token da cena só se o combatente já saiu).
  const doFim = combate.combatants.get(anterior?.combatantId)?.actor ?? (anterior?.tokenId ? combate.scene?.tokens.get(anterior.tokenId)?.actor : null) ?? null;
  const combatente = combate.combatant ?? null;
  // O combatente sem token (posto no combate pelo ator): o ator dele.
  const doComeco = combatente?.token?.actor ?? combatente?.actor ?? null;
  return {
    fim: doFim ? { ator: doFim, turno: `${combate.id}:${anterior.round}:${anterior.turn}` } : null,
    comeco: combatente ? { ator: doComeco, combatente, turno: `${combate.id}:${combate.round}:${combate.turn}` } : null
  };
}

// Os ticks de um ator esperam a vez na fila dele (com o aplicar): o fogo e a radiação no mesmo fim de turno leem o HP que
// o anterior deixou. Antes de gravar, o ator é lido de novo pelo uuid: apagado no meio (a limpeza de um teste, o token
// tirado da cena), o tick desiste.
// Também o controle da direção no começo do turno (direcao.mjs).
const vivo = ator => (ator?.uuid ? fromUuidSync(ator.uuid) : null);
export function naVezDoAtor(ator, tarefa) {
  if (!comHp(ator)) return Promise.resolve();
  return naFila(filasDosAtores, ator.uuid, () => {
    const atual = vivo(ator);
    return comHp(atual) ? tarefa(atual) : null;
  });
}
// Para quem espera os ticks pendentes (a limpeza dos testes): resolve quando as filas dos atores esvaziam.
export async function esperarOsPerigos() {
  while (filasDosAtores.size) await Promise.all([...filasDosAtores.values()]);
}

async function cartaoDoTurno(ator, { perigo, titulo, texto, botao, dano, rolls = [], pagina = R.PAGINA_DOS_PERIGOS }) {
  if (!vivo(ator)) return null;
  const content = `<div class="${SISTEMA} cartao perigo"><header><h3>${esc(titulo)}: ${esc(ator.name)}</h3><span class="sabor">${esc(pagina)}</span></header>
    <p class="nota">${esc(texto)}</p><div class="botoes">${botao}<button type="button" data-cprf-perigo="desfazer">Desfazer</button></div></div>`;
  return ChatMessage.implementation.create({
    speaker: ChatMessage.implementation.getSpeaker({ actor: ator }), content, rolls,
    flags: { [SISTEMA]: { perigo: { tipo: 'turno', perigo, desfazer: [{ ator: ator.uuid, dano, estados: [], trocados: [], lesoes: [] }] } } }
  });
}

// O fim do turno (o momento.fim), só os efeitos ativos: o fogo do perigo (o dano do efeito, direto no HP; o fogo da NET e
// o da munição queimam pelos deles), a eletrocução (6d6, a armadura absorve) e a radiação alta ou extrema (direto no HP).
export function perigosNoFimDoTurno({ fim = null } = {}) {
  return naVezDoAtor(fim?.ator, async ator => {
    const fogo = ator.effects.find(efeito => efeito.active && efeito.statuses.has(STATUS_EM_CHAMAS) && efeito.getFlag(SISTEMA, 'perigo'));
    if (fogo && await marcar(fogo, 'fimDoTurno', fim.turno) && vivo(ator)) {
      const dano = Number(fogo.getFlag(SISTEMA, 'fogo')?.dano) || 2;
      const { hpAntes, hpDepois } = await danoDireto(ator, dano);
      await cartaoDoTurno(ator, { perigo: 'fogo', titulo: 'Em chamas', botao: botaoDeApagar(ator),
        texto: `No fim do turno: ${dano} direto no HP, sem armadura (${hpAntes} → ${hpDepois}). Uma Ação apaga o fogo.`, dano: { perdeu: hpAntes - hpDepois } });
    }
    const choque = ativoCom(ator, STATUS_ELETROCUTADO);
    if (choque && await marcar(choque, 'fimDoTurno', fim.turno) && vivo(ator)) {
      const roll = await new Roll(R.DANO_DA_ELETROCUCAO).evaluate();
      const resumo = await danoNoCorpo(ator, roll.total);
      await cartaoDoTurno(ator, { perigo: 'eletrocucao', titulo: 'Eletrocutado', botao: botaoDeSaida(ator, STATUS_ELETROCUTADO), rolls: [roll],
        texto: `No fim do turno: ${textoDoDano(R.DANO_DA_ELETROCUCAO, roll.total, resumo)}`, dano: danoParaDesfazer(resumo, resumo.hpAntes - resumo.hpDepois) });
    }
    const zona = ativoCom(ator, STATUS_RADIACAO);
    if (zona && await marcar(zona, 'fimDoTurno', fim.turno) && vivo(ator)) {
      const dano = Number(zona.getFlag(SISTEMA, 'radiacao')?.dano) || 2;
      const { hpAntes, hpDepois } = await danoDireto(ator, dano);
      await cartaoDoTurno(ator, { perigo: 'radiacao', titulo: 'Na radiação', botao: botaoDeSaida(ator, STATUS_RADIACAO),
        texto: `No fim do turno: ${dano} direto no HP, sem armadura (${hpAntes} → ${hpDepois}).`, dano: { perdeu: hpAntes - hpDepois } });
    }
  });
}

// As Costelas quebradas (a wiki, system-rules.js:33; regras-lesoes.mjs): no fim do turno em que andou mais de 4 m a pé, o
// dano bônus da lesão de novo, direto no HP, com o cartão e o Desfazer dos ticks. Os metros vêm do CombateCPR._onEndTurn
// (iniciativa.mjs), que lê o histórico de movimento antes de o Foundry zerá-lo no começo do turno seguinte. A marca no item
// da lesão (como a do efeito nos outros ticks) impede cobrar duas vezes o mesmo turno.
export function costelasNoFimDoTurno(ator, { metros = 0, turno = '' } = {}) {
  return naVezDoAtor(ator, async atual => {
    if (!RL.costelasDoem(atual.items, metros)) return;
    const lesao = atual.items.find(item => item.type === 'lesao' && item.getFlag(SISTEMA, 'catalogo') === RL.COSTELAS_QUEBRADAS && !item.getFlag(SISTEMA, 'corrigida'));
    if (!lesao || !await marcar(lesao, 'fimDoTurno', turno) || !vivo(atual)) return;
    const { hpAntes, hpDepois } = await danoDireto(atual, RL.DANO_DAS_COSTELAS);
    const pagina = lesao.system.fonte?.pagina ? `Lesões críticas, p. ${lesao.system.fonte.pagina}` : 'Lesões críticas';
    await cartaoDoTurno(atual, { perigo: 'costelas', titulo: lesao.name, botao: '', pagina,
      texto: `No fim do turno: andou ${Math.round(metros * 10) / 10} m a pé (mais de ${RL.METROS_DAS_COSTELAS} m), e o dano bônus da lesão volta: ${RL.DANO_DAS_COSTELAS} direto no HP, sem armadura (${hpAntes} → ${hpDepois}).`,
      dano: { perdeu: hpAntes - hpDepois } });
  });
}

// O começo do turno (o momento.comeco), depois do Death Save: quem está sem ar (o efeito ativo) perde o BODY, direto no HP.
export function perigosNoComecoDoTurno({ comeco = null } = {}) {
  return naVezDoAtor(comeco?.ator, async ator => {
    const semAr = ativoCom(ator, STATUS_SEM_AR);
    if (!semAr || !await marcar(semAr, 'comecoDoTurno', comeco.turno) || !vivo(ator)) return;
    const dano = corpo(ator);
    const { hpAntes, hpDepois } = await danoDireto(ator, dano);
    await cartaoDoTurno(ator, { perigo: 'afogamento', titulo: 'Sem ar', botao: botaoDeSaida(ator, STATUS_SEM_AR),
      texto: `No começo do turno: ${dano} direto no HP, o BODY (${hpAntes} → ${hpDepois}).`, dano: { perdeu: hpAntes - hpDepois } });
  });
}

// ---------------- Os botões dos cartões (só o mestre) ----------------
// Desfaz o cartão: o HP e o SP (o desfazerDano, pela diferença), os estados ligados, o fogo trocado (só se o que tomou o
// lugar dele ainda está lá: apagado depois, o antigo também teria apagado) e a lesão criada. Uma vez por cartão, na fila
// da mensagem (com o "Sem ar"), lendo a flag de agora.
export function desfazer(mensagem) {
  return naFila(filasDasMensagens, mensagem.id, () => desfazerJa(game.messages.get(mensagem.id) ?? mensagem));
}
async function desfazerJa(mensagem) {
  const dados = mensagem.getFlag(SISTEMA, 'perigo');
  if (!game.user.isGM || !dados) return false;
  if (!dados.desfazer?.some(temOQueDesfazer) || mensagem.getFlag(SISTEMA, 'desfeito')) { ui.notifications.warn('Este perigo já foi desfeito (ou não há o que desfazer).'); return false; }
  for (const entrada of dados.desfazer) {
    const ator = await fromUuid(entrada.ator);
    if (!ator) continue;
    // Na fila do ator, como os ticks: um tick que grava o HP ao mesmo tempo não apaga o que o Desfazer devolve.
    await naFila(filasDosAtores, ator.uuid, async () => {
      if (entrada.dano) await ator.desfazerDano(entrada.dano);
      // O SDP e a ablação do veículo (a batida), pela diferença (o desfazerDanoVeicular): o item do próprio ator (o C40) ou
      // o ator do token de veículo em que ele estava (o C46, parte 4: o de NPC ou o ligado, que grava no item).
      for (const batido of entrada.veiculos ?? []) {
        let veiculo = ator.items.get(batido.veiculo.split('.').at(-1));
        if (veiculo?.uuid !== batido.veiculo) veiculo = await fromUuid(batido.veiculo);
        if (veiculo?.type === 'veiculo' && veiculo.uuid === batido.veiculo) await veiculo.desfazerDanoVeicular(batido);
      }
      const nossos = entrada.estados.filter(id => ator.effects.has(id));
      if (nossos.length) await ator.deleteEmbeddedDocuments('ActiveEffect', nossos);
      const voltar = nossos.length ? entrada.trocados.filter(efeito => !ator.effects.has(efeito._id)) : [];
      if (voltar.length) await ator.createEmbeddedDocuments('ActiveEffect', voltar, { keepId: true });
      const lesoes = entrada.lesoes.filter(id => ator.items.has(id));
      if (lesoes.length) await ator.deleteEmbeddedDocuments('Item', lesoes);
    });
  }
  await mensagem.update({ [`flags.${SISTEMA}.desfeito`]: true });
  return true;
}

// "Sem ar" (o fôlego acabou): liga o estado; o Desfazer do cartão também o tira. Na fila da mensagem: dois "Sem ar" do
// mesmo cartão (atores diferentes) gravam a lista um depois do outro, cada um com a flag de agora.
function semAr(mensagem, { ator: uuid }) {
  return naFila(filasDasMensagens, mensagem.id, async () => {
    const atual = game.messages.get(mensagem.id) ?? mensagem;
    const ator = await fromUuid(uuid);
    if (!ator || atual.getFlag(SISTEMA, 'desfeito')) return null;
    const criado = await ligar(ator, STATUS_SEM_AR);
    if (!criado) return null;
    const dados = foundry.utils.deepClone(atual.getFlag(SISTEMA, 'perigo'));
    dados.desfazer.find(entrada => entrada.ator === uuid)?.estados.push(criado.id);
    await atual.update({ [`flags.${SISTEMA}.perigo`]: dados });
    return criado;
  });
}

// "Respirou", "Afastou-se" e "Saiu da zona": tira o estado.
async function tirar(mensagem, { ator: uuid, estado }) {
  const ator = await fromUuid(uuid);
  if (!ator || !SAIDA[estado]) return false;
  await ator.toggleStatusEffect(estado, { active: false });
  return true;
}

// "Batida" (o cartão da direção que perdeu o controle, direcao.mjs): a janela já na batida, com o token do motorista (ou o
// ator, sem token) entre os do veículo, junto dos controlados.
async function batida(mensagem, { ator: uuid }) {
  const doc = uuid ? await fromUuid(uuid) : null;
  const primeiro = doc instanceof Actor ? doc.getActiveTokens(false, true)[0] ?? doc : doc;
  if (!comHp(atorDoToken(primeiro))) { ui.notifications.warn('Batida: o motorista deste cartão não está mais na mesa.'); return null; }
  return abrir({ perigo: 'batida', tokens: noVeiculoDaVez(primeiro) });
}

const ACOES = { desfazer, semAr, tirar, batida };
// Um clique por vez em cada botão de cada cartão, neste cliente (o cliquesEmAndamento do combate/cartao.mjs).
const cliquesEmAndamento = new Set();
export function ligarBotoes(mensagem, html) {
  for (const botao of html.querySelectorAll('[data-cprf-perigo]')) {
    if (!game.user.isGM) { botao.remove(); continue; }
    botao.addEventListener('click', async evento => {
      evento.preventDefault();
      const { cprfPerigo: acao, ator = '', estado = '' } = botao.dataset;
      const chave = `${mensagem.id}:${acao}:${ator}:${estado}`;
      if (cliquesEmAndamento.has(chave)) return;
      cliquesEmAndamento.add(chave);
      try {
        await ACOES[acao]?.(mensagem, botao.dataset);
      } finally {
        cliquesEmAndamento.delete(chave);
      }
    });
  }
  if (mensagem.getFlag(SISTEMA, 'desfeito')) html.querySelector('.cartao.perigo')?.classList.add('desfeito');
}

// No init: os estados novos (como o "Em chamas", netrun/token.mjs), o /perigo (só o mestre; a mensagem não vai ao chat),
// o botão do HUD e os botões dos cartões.
export function registrarPerigos() {
  for (const estado of ESTADOS) if (!CONFIG.statusEffects.some(efeito => efeito.id === estado.id)) CONFIG.statusEffects.push(estado);
  Hooks.on('chatMessage', (_, mensagem) => {
    const comando = R.lerComandoPerigo(mensagem);
    if (!comando) return true;
    if (!game.user.isGM) ui.notifications.warn('Só o mestre aplica um perigo do ambiente.');
    else abrir(comando).catch(erro => console.error(`${SISTEMA} | perigo`, erro));
    return false;
  });
  Hooks.on('renderTokenHUD', botaoNoHud);
  Hooks.on('renderChatMessageHTML', ligarBotoes);
}

export const API = { abrir, aplicar, regras: R };

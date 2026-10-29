// C46: o veículo fora da iniciativa (master:Tabletop/README.md:109; mesa-api.js:1590) e o novo tipo nos caminhos que
// só aceitam personagens. As classes reais da iniciativa e os seletores rodam com o mínimo de ambiente em uma VM.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { migrarDados } from '../../foundry-sistema/scripts/migracao.mjs';
import { AVISO_INICIATIVA_VEICULO, podeEntrarNaIniciativa } from '../../foundry-sistema/scripts/regras-iniciativa.mjs';

const ler = relativo => fs.readFileSync(new URL('../../' + relativo, import.meta.url), 'utf8');
const funcaoDaFonte = (fonte, nome, ambiente = {}) => {
  const trecho = fonte.match(new RegExp(`(?:export )?((?:async )?function ${nome}\\([\\s\\S]+?\\n})`))?.[1];
  assert.ok(trecho, `a função real ${nome}`);
  return vm.runInNewContext(`${trecho}; ${nome}`, ambiente);
};

test('C46 iniciativa: o veículo não age; personagem, capanga e atores da NET conservam a iniciativa', () => {
  assert.equal(podeEntrarNaIniciativa('veiculo'), false);
  for (const tipo of ['personagem', 'capanga', 'blackice', 'demonio']) assert.equal(podeEntrarNaIniciativa(tipo), true, tipo);
  assert.equal(AVISO_INICIATIVA_VEICULO, 'O veículo não entra na iniciativa; quem age é o motorista.');
  // No CORE não há ator de veículo. O contêiner já é recusado e o restante do lote continua (cpr-combat.js:68-78).
  const core = ler('cyberpunk-red-core/modules/combat/cpr-combat.js');
  assert.match(core, /if \(actor\.constructor\.name === "CPRContainerActor"\) \{[\s\S]+?continue; \/\/ Skip one iteration/);
});

function iniciativaDaFonte() {
  class Combatant {
    async _preCreate() { this.preCriado = true; return this.permitido; }
    async rollInitiative(formula) { this.formulaRolada = formula; return this; }
  }
  class Combat {
    async rollInitiative(ids, opcoes) { this.rolagens.push({ ids: [...ids], opcoes }); return this; }
  }
  const recados = [];
  const ambiente = {
    Combat, Combatant, AVISO_INICIATIVA_VEICULO, podeEntrarNaIniciativa,
    ATORES_DA_NET: ['blackice', 'demonio'], config: () => false,
    ui: { notifications: { info: texto => recados.push(texto) } }
  };
  const fonte = ler('foundry-sistema/scripts/iniciativa.mjs').replace(/^import .+;\r?\n/gm, '').replaceAll('export class', 'class');
  const classes = vm.runInNewContext(`${fonte}\n({ CombatenteCPR, CombateCPR })`, ambiente);
  return { ...classes, recados };
}

test('C46 rastreador: criar combatente de veículo é recusado com info; o veto do Foundry aos demais é preservado', async () => {
  const { CombatenteCPR, recados } = iniciativaDaFonte();
  const veiculo = Object.assign(new CombatenteCPR(), { actor: { type: 'veiculo' }, permitido: true });
  assert.equal(await veiculo._preCreate({}, {}, {}), false);
  assert.equal(veiculo.preCriado, undefined);
  assert.deepEqual(recados, [AVISO_INICIATIVA_VEICULO]);
  for (const permitido of [undefined, false]) {
    const personagem = Object.assign(new CombatenteCPR(), { actor: { type: 'personagem' }, permitido });
    assert.equal(await personagem._preCreate({}, {}, {}), permitido);
    assert.equal(personagem.preCriado, true);
  }
});

test('C46 rolar iniciativa: um veículo antigo no combate é pulado e o lote conserva personagem e NET', async () => {
  const { CombateCPR, recados } = iniciativaDaFonte();
  const combate = Object.assign(new CombateCPR(), { rolagens: [], combatants: new Map([
    ['v', { actor: { type: 'veiculo', situacionaisDaIniciativa: () => assert.fail('veículo não tem teste de iniciativa') }, isOwner: true }],
    ['p', { actor: { type: 'personagem' }, isOwner: true }],
    ['c', { actor: { type: 'capanga' }, isOwner: true }],
    ['i', { actor: { type: 'blackice' }, isOwner: true }],
    ['d', { actor: { type: 'demonio' }, isOwner: true }]
  ]) });
  const opcoes = { updateTurn: false };
  assert.equal(await combate.rollInitiative(['v', 'i', 'p', 'd', 'c'], opcoes), combate);
  assert.deepEqual(combate.rolagens, [{ ids: ['p', 'c'], opcoes }, { ids: ['i'], opcoes }, { ids: ['d'], opcoes }]);
  assert.deepEqual(recados, [AVISO_INICIATIVA_VEICULO]);
  combate.rolagens.length = 0;
  await combate.rollInitiative('v');
  assert.deepEqual(combate.rolagens, []);
});

test('C46 API do combatente: o veículo não rola diretamente; o personagem conserva a fórmula pedida', async () => {
  const { CombatenteCPR, recados } = iniciativaDaFonte();
  const veiculo = Object.assign(new CombatenteCPR(), { actor: { type: 'veiculo' } });
  assert.equal(await veiculo.rollInitiative('99'), veiculo);
  assert.equal(veiculo.formulaRolada, undefined);
  assert.deepEqual(recados, [AVISO_INICIATIVA_VEICULO]);
  const personagem = Object.assign(new CombatenteCPR(), { actor: { type: 'personagem' } });
  assert.equal(await personagem.rollInitiative('1d10 + 8'), personagem);
  assert.equal(personagem.formulaRolada, '1d10 + 8');
});

test('C46 migração: o ator novo atravessa os passos antigos sem mudar seus dados nem os do veículo como item', () => {
  const catalogo = JSON.parse(ler('foundry-sistema/dados/catalogo.json')).itens;
  const item = structuredClone(Object.values(catalogo).find(entrada => entrada.type === 'veiculo'));
  const dados = { name: item.name, type: 'veiculo', system: structuredClone(item.system), items: [], effects: [] };
  const antes = structuredClone(dados);
  assert.deepEqual(migrarDados(dados, { documento: 'Actor', catalogo }), antes);
  assert.deepEqual(dados, antes);
  assert.deepEqual(migrarDados(item, { documento: 'Item', catalogo }), item);
});

test('C46 wiki: o veículo não serializa nem envia ficha de personagem, mesmo com uma flag da wiki', async () => {
  const fonte = ler('foundry-sistema/scripts/wiki.mjs');
  const veiculo = { type: 'veiculo', get system() { assert.fail('a wiki não lê o SDP como HP'); }, getFlag() { return { id: 'wiki01' }; } };
  assert.equal(funcaoDaFonte(fonte, 'fichaParaAWiki')(veiculo), null);
  assert.equal(await funcaoDaFonte(fonte, 'mandarFicha')(veiculo), null);
  // Nem o agendamento automático consulta permissão, cria timer ou tenta enviar o ator de veículo.
  assert.equal(funcaoDaFonte(fonte, 'agendarVolta')({ type: 'veiculo', documentName: 'Actor', getFlag: veiculo.getFlag }), undefined);
  const personagem = { type: 'personagem', getFlag: (sistema, chave) => (chave === 'wiki' ? { id: 'wiki01' } : null) };
  const atores = [veiculo, personagem];
  const game = { actors: { get: () => veiculo, find: teste => atores.find(teste) } };
  const ligado = funcaoDaFonte(fonte, 'atorLigado', { game, SISTEMA: 'cpr-fieldbook' });
  assert.equal(ligado({}, 'wiki01'), personagem);
  assert.equal(ligado({ foundry14: { ator: 'veiculo01' } }, 'wiki01'), null);
  const janela = ler('foundry-sistema/scripts/janela-wiki.mjs');
  const selecionar = vm.runInNewContext(janela.match(/const atorDa = (.+);/)[1], { game, SISTEMA: 'cpr-fieldbook' });
  assert.equal(selecionar('wiki01'), personagem);
});

test('C46 Painel Tático: veículo selecionado ou fixado fica fora; o personagem controlado continua aparecendo', () => {
  class Actor {}
  class TokenDocument {}
  const personagem = Object.assign(new Actor(), { type: 'personagem', isOwner: true });
  const veiculo = Object.assign(new Actor(), { type: 'veiculo', isOwner: true });
  const tokenVeiculo = Object.assign(new TokenDocument(), { actor: veiculo });
  const tokenPersonagem = Object.assign(new TokenDocument(), { actor: personagem });
  const fonte = ler('foundry-sistema/scripts/painel/painel.mjs');
  const inicio = fonte.indexOf('  #escolherAtor() {');
  const trecho = fonte.slice(inicio, fonte.indexOf('  // O ator, um item', inicio)).replace('#escolherAtor', 'escolherAtor');
  const canvas = { tokens: { controlled: [{ actor: veiculo, document: tokenVeiculo }] } };
  const Painel = vm.runInNewContext(`class Painel { ${trecho} }; Painel`, {
    Actor, TokenDocument, canvas, TIPOS_DE_ATOR: ['personagem', 'capanga'], config: () => false, fromUuidSync: () => tokenVeiculo
  });
  const painel = new Painel();
  painel.escolherAtor();
  assert.equal(painel.actor, null);
  painel.fixo = 'Scene.cena.Token.veiculo';
  painel.escolherAtor();
  assert.equal(painel.actor, null);
  assert.equal(painel.fixo, null);
  canvas.tokens.controlled.push({ actor: personagem, document: tokenPersonagem });
  painel.escolherAtor();
  assert.equal(painel.actor, personagem);
  assert.equal(painel.token, tokenPersonagem);
});

test('C46 perigos: o HUD do veículo não oferece perigo de quem tem HP; a seleção e a aplicação conservam o filtro', () => {
  const fonte = ler('foundry-sistema/scripts/perigos.mjs');
  const comHp = vm.runInNewContext(fonte.match(/const comHp = (.+);/)[1]);
  assert.equal(comHp({ type: 'veiculo' }), false);
  assert.equal(comHp({ type: 'personagem' }), true);
  assert.equal(comHp({ type: 'capanga' }), true);
  const botao = funcaoDaFonte(fonte, 'botaoNoHud', { comHp, game: { user: { isGM: true } } });
  const app = { document: { actor: { type: 'veiculo' } }, get element() { assert.fail('o HUD do veículo não monta o botão de perigos'); } };
  assert.equal(botao(app), undefined);
  // Os mesmos filtros já existentes barram o SDP nas APIs de perigo e nos ticks de quem tem HP.
  assert.ok(fonte.includes('return lista.filter(token => comHp(token?.actor));'));
  assert.ok(fonte.includes('if (comHp(ator) && !lista.includes(ator))'));
  assert.ok(fonte.includes('if (!comHp(ator)) return Promise.resolve();'));
});

// C46: os números vêm do catálogo do CORE e do schema vehicle-datamodel.js, não de uma ficha humana.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { dadosDoVeiculoDoCatalogo, tokenDoVeiculo } from '../../foundry-sistema/scripts/regras-ator-veiculo.mjs';
import { TIPOS_DE_VEICULO, tipoDoVeiculo } from '../../foundry-sistema/scripts/regras-veiculos.mjs';

const ler = caminho => readFileSync(new URL(caminho, import.meta.url), 'utf8');
const catalogo = JSON.parse(ler('../../foundry-sistema/dados/catalogo.json')).itens;
const dados = ler('../../foundry-sistema/scripts/dados.mjs');
const normal = valor => JSON.parse(JSON.stringify(valor));

test('C46: cada veículo do catálogo preenche o ator com SDP, assentos, MOVE, velocidade, tipo e imagem próprios', () => {
  const veiculos = Object.values(catalogo).filter(item => item.type === 'veiculo');
  assert.equal(veiculos.length, 14);
  for (const item of veiculos) {
    const antes = structuredClone(item);
    const ator = dadosDoVeiculoDoCatalogo(item);
    assert.equal(ator.name, item.name);
    assert.equal(ator.img, item.img);
    assert.deepEqual(ator.system.sdp, item.system.sdp);
    assert.deepEqual(ator.system.velocidade, item.system.velocidade);
    assert.equal(ator.system.assentos, item.system.assentos);
    assert.equal(ator.system.tipo, tipoDoVeiculo({ nome: item.name }));
    assert.equal(ator.system.sp, 0);
    assert.equal(ator.system.ablacao, 0);
    ator.system.sdp.value = 0;
    ator.system.velocidade.combate = 0;
    assert.deepEqual(item, antes, 'O catálogo continua intacto');
  }
  assert.equal(dadosDoVeiculoDoCatalogo(catalogo['core_weapons:assault-rifle']), null);
  assert.equal(dadosDoVeiculoDoCatalogo(null), null);
});

// Executa os schemas reais com campos que guardam a configuração, como os testes de crítico dos itens.
function modelos() {
  class Campo { constructor(opcoes) { this.opcoes = opcoes; } }
  class Schema { constructor(fields) { this.fields = fields; } }
  const fields = { NumberField: Campo, StringField: Campo, BooleanField: Campo, HTMLField: Campo, SchemaField: Schema, TypedObjectField: Campo };
  const cabecalho = dados.slice(dados.indexOf('const inteiro ='), dados.indexOf('const custoMensal ='));
  const trecho = nome => {
    const inicio = dados.indexOf(`export class ${nome} `);
    return dados.slice(inicio, dados.indexOf('\n}\r', inicio) + 3).replace('export ', '');
  };
  return runInNewContext(`${cabecalho}\n${trecho('DadosVeiculo')}\n${trecho('DadosAtorVeiculo')}\n({ item: DadosVeiculo, ator: DadosAtorVeiculo })`, {
    fields, foundry: { abstract: { TypeDataModel: class {} } }, TIPOS_DE_VEICULO, fonte: () => new Schema({})
  });
}

test('C46: ator e item dividem os campos físicos sem mudar os padrões do veículo do CORE', () => {
  const core = ler('../../cyberpunk-red-core/modules/datamodels/item/vehicle-datamodel.js');
  const m = modelos(), ator = m.ator.defineSchema(), item = m.item.defineSchema();
  for (const campo of ['sdp', 'assentos', 'velocidade', 'tipo', 'sp', 'ablacao']) assert.deepEqual(normal(ator[campo]), normal(item[campo]), campo);
  const inicial = campo => Number(core.match(new RegExp(`${campo}: new fields.NumberField\\(\\{[\\s\\S]*?initial: (\\d+)`))[1]);
  assert.equal(ator.sdp.fields.value.opcoes.initial, inicial('sdp'));
  assert.equal(ator.sdp.fields.max.opcoes.initial, inicial('sdp'));
  assert.equal(ator.assentos.opcoes.initial, inicial('seats'));
  assert.equal(ator.velocidade.fields.combate.opcoes.initial, inicial('speedCombat'));
  assert.equal(ator.velocidade.fields.narrativa.opcoes.initial, '');
  assert.equal(ator.notas.opcoes.initial, '');
  assert.equal(ator.sp.opcoes.min, 0);
  assert.equal(ator.ablacao.opcoes.min, 0);
});

test('C46: a preparação conserva a ablação e limita SDP sem criar HP, atributos ou lesões', () => {
  const { ator } = modelos();
  const veiculo = { sdp: { value: 70, max: 50 }, sp: 13, ablacao: 2 };
  ator.prototype.prepareDerivedData.call(veiculo);
  assert.deepEqual(veiculo.sdp, { value: 50, max: 50 });
  assert.deepEqual(normal(veiculo.blindagem), { sp: 11, max: 13 });
  veiculo.ablacao = 20;
  ator.prototype.prepareDerivedData.call(veiculo);
  assert.deepEqual(normal(veiculo.blindagem), { sp: 0, max: 13 });
  assert.equal(veiculo.ablacao, 20);
  assert.equal(veiculo.hp, undefined);
});

test('C46: token novo fica solto, 2 por 2 e com SDP na barra; uma cópia conserva as escolhas explícitas', () => {
  assert.deepEqual(tokenDoVeiculo(), { actorLink: false, width: 2, height: 2, bar1: { attribute: 'sdp' } });
  const proto = { actorLink: true, width: 3, height: 4, bar1: { attribute: null }, texture: { src: 'carro.webp' } };
  assert.deepEqual(tokenDoVeiculo(proto), proto);
  assert.deepEqual(tokenDoVeiculo({ texture: { src: 'carro.webp' } }).bar1, { attribute: 'sdp' });
});

function ficha(ambiente = {}) {
  const fonte = ler('../../foundry-sistema/scripts/ficha-veiculo.mjs').replace(/^import .+;\r?\n/gm, '').replace('export class', 'class');
  return runInNewContext(`${fonte}\nFichaVeiculo`, {
    foundry: { applications: { api: { HandlebarsApplicationMixin: Base => Base }, sheets: { ActorSheetV2: class {} } } },
    SISTEMA: 'cpr-fieldbook', caminho: String, dadosDoVeiculoDoCatalogo, itemDoVeiculo: () => null, ...ambiente
  });
}

test('C46 ficha: catálogo só aplica o veículo escolhido, mantém notas e relê permissão depois de carregar', async () => {
  const id = 'core_vehicles:helicopter', selecao = { value: id }, gravados = [];
  const ator = { uuid: 'Actor.carro', isOwner: true, update: async dados => { gravados.push(dados); return dados; } };
  const Ficha = ficha({ itemDoCatalogo: async () => catalogo[id], fromUuid: async () => ator });
  const contexto = { isEditable: true, actor: ator, element: { querySelector: () => selecao } };
  const resultado = await Ficha.escolherVeiculo.call(contexto);
  assert.deepEqual(resultado, dadosDoVeiculoDoCatalogo(catalogo[id]));
  assert.equal(Object.hasOwn(resultado.system, 'notas'), false);
  const Revogada = ficha({ itemDoCatalogo: async () => { ator.isOwner = false; return catalogo[id]; }, fromUuid: async () => ator });
  await Revogada.escolherVeiculo.call(contexto);
  assert.equal(gravados.length, 1);
  ator.isOwner = true;
  const Trocada = ficha({ itemDoCatalogo: async () => { selecao.value = 'outro'; return catalogo[id]; }, fromUuid: async () => ator });
  await Trocada.escolherVeiculo.call(contexto);
  assert.equal(gravados.length, 1);
});

test('C46 ficha: o veículo ligado recusa o catálogo, inclusive se o vínculo chegar durante a leitura', async () => {
  const id = 'core_vehicles:helicopter', gravados = [];
  let ligado = true, leituras = 0;
  const ator = { uuid: 'Actor.carro', isOwner: true, update: async dados => gravados.push(dados) };
  const Ficha = ficha({
    itemDoVeiculo: () => ligado ? {} : null,
    itemDoCatalogo: async () => { leituras++; ligado = true; return catalogo[id]; },
    fromUuid: async () => ator
  });
  const contexto = { isEditable: true, actor: ator, element: { querySelector: () => ({ value: id }) } };
  await Ficha.escolherVeiculo.call(contexto);
  assert.equal(leituras, 0);
  ligado = false;
  await Ficha.escolherVeiculo.call(contexto);
  assert.equal(leituras, 1);
  assert.deepEqual(gravados, []);
});

test('C46 ficha: abrir o dono relê o vínculo e a visibilidade, também na ficha só de leitura', () => {
  const abertos = [];
  const dono = { visible: true, sheet: { render: opcoes => abertos.push(normal(opcoes)) } };
  let item = { parent: dono };
  const Ficha = ficha({ itemDoVeiculo: () => item });
  const contexto = { actor: {}, isEditable: false };
  Ficha.abrirDono.call(contexto);
  assert.deepEqual(abertos, [{ force: true }]);
  dono.visible = false;
  assert.equal(Ficha.abrirDono.call(contexto), null);
  item = null;
  assert.equal(Ficha.abrirDono.call(contexto), null);
  assert.equal(abertos.length, 1);
});

test('C46 ficha: −1 e Consertar respeitam o zero e a permissão, inclusive com ablação maior que o SP máximo', async () => {
  const Ficha = ficha(), mudancas = [];
  const contexto = { isEditable: true, actor: { isOwner: true, system: { sp: 13, ablacao: 2, blindagem: { sp: 11 } }, update: async dados => mudancas.push(normal(dados)) } };
  await Ficha.ablarChassis.call(contexto);
  await Ficha.consertarChassis.call(contexto);
  assert.deepEqual(mudancas, [{ 'system.ablacao': 3 }, { 'system.ablacao': 0 }]);
  contexto.actor.system.ablacao = 20; contexto.actor.system.blindagem.sp = 0;
  await Ficha.ablarChassis.call(contexto);
  assert.deepEqual(mudancas.at(-1), { 'system.ablacao': 20 });
  for (const permitido of ['isEditable', 'isOwner']) {
    if (permitido === 'isEditable') contexto.isEditable = false;
    else { contexto.isEditable = true; contexto.actor.isOwner = false; }
    await Ficha.ablarChassis.call(contexto); await Ficha.consertarChassis.call(contexto); await Ficha.escolherVeiculo.call(contexto);
  }
  assert.equal(mudancas.length, 3);
});

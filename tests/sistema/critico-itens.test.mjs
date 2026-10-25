// C43: os campos de crítico da arma e da munição, pelo CORE 0.93 (attackable-schema e ammo-datamodel).
// O schema real é executado com campos que só guardam suas opções; as regras de dano são testadas em formulas.test.mjs.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const ler = caminho => readFileSync(new URL(caminho, import.meta.url), 'utf8');
const dados = ler('../../foundry-sistema/scripts/dados.mjs');
const core = arquivo => ler(`../../fvtt-cyberpunk-red-core-dev/src/modules/datamodels/item/${arquivo}`);
class Campo {
  constructor(opcoes) { this.opcoes = opcoes; }
}
class Schema extends Campo {
  constructor(campos) { super({}); this.fields = campos; }
}
const fields = { NumberField: Campo, StringField: Campo, BooleanField: Campo, HTMLField: Campo, ArrayField: Campo, SchemaField: Schema };
const inteiro = (initial = 0, opcoes = {}) => new Campo({ required: true, nullable: false, integer: true, initial, ...opcoes });
function schema(nome) {
  const inicio = dados.indexOf('  static defineSchema() {', dados.indexOf(`export class ${nome} `));
  assert.ok(inicio >= 0, `sem o schema ${nome}`);
  const metodo = dados.slice(inicio, dados.indexOf('\n  }', inicio) + 4).replace('static ', '');
  return runInNewContext(`({ ${metodo} }).defineSchema()`, {
    fields, inteiro, texto: () => new Campo({}), recurso: () => new Schema({}), fonte: () => new Schema({})
  });
}
const inicialDoCore = (texto, campo) => {
  const resultado = texto.match(new RegExp(`${campo}: new fields\\.NumberField\\(\\{[\\s\\S]*?initial: (\\d+)`));
  assert.ok(resultado, `sem ${campo} no CORE`);
  return Number(resultado[1]);
};

test('C43, schema: arma mantém os dois seis do CORE e o bônus do perfil nas armas existentes', () => {
  const fonte = core('mixins/attackable-schema.js');
  const critico = schema('DadosArma').critico.fields;
  assert.equal(critico.seis.opcoes.initial, inicialDoCore(fonte, 'count'));
  assert.equal(critico.seis.opcoes.min, 0);
  assert.equal(critico.seis.opcoes.integer, true);
  // null é o padrão de 5 do RED e 10 da Power já existente; zero continua sendo um bônus explícito.
  assert.equal(critico.bonus.opcoes.initial, null);
  assert.equal(critico.bonus.opcoes.nullable, true);
  assert.equal(critico.bonus.opcoes.min, 0);
  assert.equal(critico.bonus.opcoes.integer, true);
  assert.equal(inicialDoCore(fonte, 'bonus'), 5);
});

test('C43, schema: munição começa sem substituir a arma e oferece os dois seis e +5 do CORE', () => {
  const fonte = core('ammo-datamodel.js');
  const critico = schema('DadosMunicao').critico.fields;
  assert.match(fonte, /override: new fields.BooleanField\(\{ initial: false \}\)/);
  assert.equal(critico.substitui.opcoes.initial, false);
  for (const [campo, origem] of [['seis', 'count'], ['bonus', 'bonus']]) {
    assert.equal(critico[campo].opcoes.initial, inicialDoCore(fonte, origem));
    assert.equal(critico[campo].opcoes.min, 0);
    assert.equal(critico[campo].opcoes.integer, true);
    assert.equal(critico[campo].opcoes.nullable, false);
  }
});

// Testes de referência do C43, parte 3 (da 0.93 do CORE), sem Foundry: o tema do sistema no resto do Foundry, o
// "Theme Foundry" do CORE (a configuração de cada navegador, ligada por padrão; as mesmas variáveis de tema do Foundry
// trocadas pela paleta do sistema; as janelas ApplicationV1 de fora).
// Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { ATRIBUTO_DO_TEMA, aplicarTemaNoFoundry } from '../../foundry-sistema/scripts/tema-foundry.mjs';

const raiz = new URL('../../', import.meta.url);
const ler = caminho => fs.readFileSync(new URL(caminho, raiz), 'utf8');
const nosso = ler('foundry-sistema/styles/tema-foundry.css');
const doCore = ler('fvtt-cyberpunk-red-core-dev/src/css/variables/foundry.css');
const variaveis = css => new Set([...css.matchAll(/^\s*(--[\w-]+)\s*:/gm)].map(m => m[1]));

test('Tema no Foundry: a configuração é a do CORE 0.93 (de cada navegador, ligada por padrão) e o init a aplica', async () => {
  const doCoreConfig = ler('fvtt-cyberpunk-red-core-dev/src/modules/system/settings.js').match(/register\(game\.system\.id, "themeFoundry", \{[\s\S]*?\n {2}\}\);/)?.[0];
  assert.ok(doCoreConfig, 'o themeFoundry do CORE');
  assert.match(doCoreConfig, /scope: "client"/);
  assert.match(doCoreConfig, /type: Boolean/);
  assert.match(doCoreConfig, /default: true/);

  const registradas = new Map();
  globalThis.game = { settings: { register: (_sistema, chave, dados) => registradas.set(chave, dados) } };
  try {
    const { registrarConfiguracoes } = await import('../../foundry-sistema/scripts/configuracoes.mjs');
    registrarConfiguracoes();
  } finally { delete globalThis.game; }
  const tema = registradas.get('temaNoFoundry');
  assert.equal(tema.scope, 'client');
  assert.equal(tema.config, true);
  assert.equal(tema.type, Boolean);
  assert.equal(tema.default, true);
  assert.equal(typeof tema.onChange, 'function');
  assert.match(ler('foundry-sistema/scripts/sistema.mjs'), /aplicarTemaNoFoundry\(game\.settings\.get\(SISTEMA, 'temaNoFoundry'\)\)/);
});

test('Tema no Foundry: ligar e desligar põem e tiram o atributo do <html>', () => {
  const atributos = new Set();
  const documento = { documentElement: { toggleAttribute: (nome, ligado) => { if (ligado) atributos.add(nome); else atributos.delete(nome); } } };
  aplicarTemaNoFoundry(true, documento);
  assert.deepEqual([...atributos], ['data-cprf-tema-foundry']);
  aplicarTemaNoFoundry(false, documento);
  assert.equal(atributos.size, 0);
  assert.equal(ATRIBUTO_DO_TEMA, 'data-cprf-tema-foundry');
  // Sem documento (o Node), não quebra.
  assert.doesNotThrow(() => aplicarTemaNoFoundry(true, undefined));
});

test('Tema no Foundry: as mesmas variáveis de tema do Foundry que o CORE troca, todas pela paleta do tema.css', () => {
  const doCoreVariaveis = variaveis(doCore), nossas = variaveis(nosso);
  assert.equal(doCoreVariaveis.size, 109);
  assert.deepEqual([...doCoreVariaveis].filter(v => !nossas.has(v)), []);
  assert.deepEqual([...nossas].filter(v => !doCoreVariaveis.has(v)), []);

  // Cada cor da paleta usada aqui existe no bloco da paleta do tema.css, que também vale no <html> com o atributo.
  const tema = ler('foundry-sistema/styles/tema.css');
  const bloco = tema.match(/([^{}]*)\{\s*--cp-fundo:[^}]*\}/);
  assert.ok(bloco, 'o bloco da paleta');
  assert.match(bloco[1], /html\[data-cprf-tema-foundry\]/);
  const paleta = variaveis(bloco[0].slice(bloco[0].indexOf('{')).replace(/;\s*/g, ';\n'));
  const usadas = new Set([...nosso.matchAll(/var\((--cp-[\w-]+)\)/g)].map(m => m[1]));
  assert.ok(usadas.size >= 8);
  assert.deepEqual([...usadas].filter(v => !paleta.has(v)), []);
});

test('Tema no Foundry: só com o atributo, e as janelas ApplicationV1 (.window-app) ficam com o visual do Foundry, como no CORE', () => {
  assert.match(doCore, /ApplicationV1 windows retain Foundry's legacy compatibility styling/);
  const seletores = [...nosso.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(^|\})\s*([^{}@]+)\{/g)].map(m => m[2].trim()).filter(s => !s.startsWith('--'));
  const doTopo = seletores.filter(s => s.startsWith(':where(') || s.startsWith('html'));
  assert.ok(doTopo.length >= 8);
  for (const seletor of doTopo) {
    assert.match(seletor, /html\[data-cprf-tema-foundry\]/, seletor);
    if (seletor.startsWith(':where(')) assert.match(seletor, /:not\(\.window-app, \.window-app \*\)/, seletor);
  }
  // No system.json, logo depois do tema.css, na camada do sistema (que vem depois das variáveis do Foundry).
  const estilos = JSON.parse(ler('foundry-sistema/system.json')).styles.map(e => `${e.src}|${e.layer}`);
  assert.equal(estilos[estilos.indexOf('styles/tema.css|system') + 1], 'styles/tema-foundry.css|system');
});

// A marcação das fichas e o teclado passam pelo clique delegado do ApplicationV2 do Foundry 14.
// Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import { prepararAcessibilidade } from '../../foundry-sistema/scripts/acessibilidade.mjs';

const raiz = new URL('../../foundry-sistema/templates/', import.meta.url);
const arquivos = ['personagem', 'capanga'].flatMap(pasta => readdirSync(new URL(pasta + '/', raiz))
  .filter(nome => nome.endsWith('.hbs')).map(nome => pasta + '/' + nome))
  .concat(['item.hbs', 'janela-rolagem.hbs', 'defesa.hbs']);

// As condições não são texto; as interpolações são os nomes que o Foundry vai preencher.
function elementosDo(modelo) {
  const html = modelo.replace(/{{!--[\s\S]*?--}}/g, '').replace(/{{{?([\s\S]*?)}}}?/g,
    (_, expressao) => /^(#|\/|else\b|!)/.test(expressao.trim()) ? '' : 'DADO');
  const elementos = [], pilha = [];
  for (const parte of html.matchAll(/<\/?[a-z][^>]*>|[^<]+/gi)) {
    const trecho = parte[0];
    if (trecho.startsWith('</')) { pilha.pop(); continue; }
    if (!trecho.startsWith('<')) { for (const pai of pilha) pai.texto += trecho; continue; }
    const tag = /^<([\w-]+)/.exec(trecho)[1];
    const atributos = Object.fromEntries([...trecho.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, nome, valor]) => [nome, valor]));
    const elemento = { tag, atributos, texto: '', rotulado: pilha.some(pai => pai.tag === 'label'), trecho };
    elementos.push(elemento);
    if (!['img', 'input', 'br', 'hr', 'wbr', 'source', 'area', 'meta', 'link'].includes(tag)) pilha.push(elemento);
  }
  return elementos;
}

for (const arquivo of arquivos) {
  test('Acessibilidade da marcação: ' + arquivo, () => {
    const elementos = elementosDo(readFileSync(new URL(arquivo, raiz), 'utf8'));
    for (const { tag, atributos: a, texto, rotulado, trecho } of elementos) {
      if ('data-action' in a) {
        const nativo = ['button', 'input', 'select', 'textarea'].includes(tag) || (tag === 'a' && 'href' in a);
        assert.ok(nativo || (['button', 'tab'].includes(a.role) && a.tabindex === '0'), 'Fora do teclado: ' + trecho);
      }
      if (tag === 'button' || 'data-action' in a) {
        const legivel = texto.replace(/&(?:[a-z]+|#\d+);/gi, '').trim();
        if (!/[\p{L}\p{N}]/u.test(legivel)) assert.ok(a['aria-label']?.trim(), 'Controle só de ícone sem nome: ' + trecho);
      }
      if (['input', 'select', 'textarea', 'prose-mirror'].includes(tag) && a.type !== 'hidden') {
        assert.ok(rotulado || a['aria-label']?.trim() || a['aria-labelledby']?.trim(), 'Campo sem rótulo: ' + trecho);
      }
      if (['favoritarPericia', 'favoritarItem', 'equipar', 'vestir', 'instalar', 'alternarEfeito'].includes(a['data-action'])) {
        assert.ok(a['aria-pressed']?.trim(), 'Estado só pela cor: ' + trecho);
      }
      // A lista que recolhe (o C34) diz se está aberta.
      if (a['data-action'] === 'recolherLista') assert.ok(a['aria-expanded']?.trim(), 'Recolhida só pelo ícone: ' + trecho);
    }
    if (arquivo === 'item.hbs') {
      assert.ok(elementos.some(e => e.tag === 'nav' && e.atributos.role === 'tablist'));
      for (const aba of elementos.filter(e => e.atributos['data-action'] === 'tab')) {
        assert.equal(aba.atributos.role, 'tab');
        assert.ok(aba.atributos['aria-selected']);
      }
    }
  });
}

// Uma moldura guarda o ouvinte entre renderizações; o ícone filho resolve para o mesmo controle do clique.
function moldura() {
  const ouvintes = [], cliques = [];
  const alvo = {
    matches: seletor => seletor.includes('tabindex'),
    closest: () => null,
    dispatchEvent: evento => cliques.push({ alvo, evento })
  };
  const filho = { closest: seletor => seletor === '[data-action]' ? alvo : null };
  const elemento = {
    contains: controle => controle === alvo,
    querySelectorAll: () => [],
    addEventListener: (tipo, ouvinte, captura) => ouvintes.push({ tipo, ouvinte, captura }),
    ownerDocument: { defaultView: { MouseEvent: class {
      constructor(tipo, opcoes) { this.type = tipo; Object.assign(this, opcoes); }
    } } }
  };
  const tecla = (key, extra = {}) => {
    const evento = { key, target: filho, preventDefault() { this.defaultPrevented = true; }, ...extra };
    for (const { tipo, ouvinte } of ouvintes) if (tipo === 'keydown') ouvinte(evento);
    return evento;
  };
  return { elemento, alvo, filho, ouvintes, cliques, tecla };
}

test('Teclado: Enter e espaço seguem o clique, com o mesmo alvo e os modificadores; renderizar de novo não duplica', () => {
  const m = moldura();
  prepararAcessibilidade(m.elemento);
  prepararAcessibilidade(m.elemento);
  assert.equal(m.ouvintes.filter(o => o.tipo === 'keydown').length, 1);
  for (const key of ['Enter', ' ']) {
    const evento = m.tecla(key, { ctrlKey: true, metaKey: false, shiftKey: true, altKey: false });
    assert.equal(evento.defaultPrevented, true);
    const clique = m.cliques.at(-1);
    assert.equal(clique.alvo, m.alvo);
    assert.deepEqual({ ...clique.evento }, { type: 'click', bubbles: true, cancelable: true, button: 0, ctrlKey: true, metaKey: false, shiftKey: true, altKey: false });
  }
  assert.equal(m.cliques.length, 2);
});

test('Teclado: não captura o teclado nativo, a edição, ações desabilitadas nem teclas já tratadas; segurar não repete', () => {
  for (const extra of [{ key: 'Tab' }, { key: 'Escape' }, { defaultPrevented: true }, { isComposing: true }]) {
    const m = moldura();
    prepararAcessibilidade(m.elemento);
    m.tecla('Enter', extra);
    assert.equal(m.cliques.length, 0, JSON.stringify(extra));
  }
  for (const caso of ['nativo', 'desabilitado', 'inerte', 'fora', 'sem papel']) {
    const m = moldura();
    if (caso === 'nativo') m.filho.closest = seletor => seletor === '[data-action]' ? m.alvo : m.filho;
    if (caso === 'desabilitado') m.alvo.matches = () => true;
    if (caso === 'inerte') m.alvo.closest = () => m.alvo;
    if (caso === 'fora') m.elemento.contains = () => false;
    if (caso === 'sem papel') m.alvo.matches = () => false;
    prepararAcessibilidade(m.elemento);
    const evento = m.tecla(' ');
    assert.equal(m.cliques.length, 0, caso);
    assert.equal(evento.defaultPrevented, undefined, caso);
  }
  const m = moldura();
  prepararAcessibilidade(m.elemento);
  assert.equal(m.tecla(' ', { repeat: true }).defaultPrevented, true);
  assert.equal(m.cliques.length, 0);
});

test('Leitor de tela: o nome das notas chega ao botão de editar e ao campo aberto, inclusive após redesenhar', () => {
  const m = moldura(), atributosDoBotao = {}, atributosDoCampo = {};
  let aberto = false;
  const editor = {
    getAttribute: () => 'Notas',
    matches: seletor => seletor === 'prose-mirror[aria-label]',
    querySelector: seletor => seletor === 'button.toggle' ? { setAttribute: (chave, valor) => { atributosDoBotao[chave] = valor; } }
      : aberto ? { setAttribute: (chave, valor) => { atributosDoCampo[chave] = valor; } } : null
  };
  m.elemento.querySelectorAll = () => [editor];
  prepararAcessibilidade(m.elemento);
  assert.equal(atributosDoBotao['aria-label'], 'Editar Notas');
  assert.deepEqual(atributosDoCampo, {});
  const open = m.ouvintes.find(o => o.tipo === 'open');
  assert.equal(open.captura, true);
  aberto = true;
  open.ouvinte({ target: editor });
  assert.deepEqual(atributosDoCampo, { 'aria-label': 'Notas', role: 'textbox', 'aria-multiline': 'true' });
  delete atributosDoBotao['aria-label'];
  prepararAcessibilidade(m.elemento);
  assert.equal(atributosDoBotao['aria-label'], 'Editar Notas');
  assert.equal(m.ouvintes.filter(o => o.tipo === 'open').length, 1);
});

test('Leitor de tela: favorito, cyberware e aba expõem o estado atual, em vez de um estado fixo', () => {
  const geral = readFileSync(new URL('personagem/bloco-geral.hbs', raiz), 'utf8');
  const cyberware = readFileSync(new URL('personagem/cyberware.hbs', raiz), 'utf8');
  const item = readFileSync(new URL('item.hbs', raiz), 'utf8');
  assert.match(geral, /data-action="favoritarPericia"[^>]*aria-pressed="{{#if favorita}}true{{else}}false{{\/if}}"/);
  assert.match(cyberware, /data-action="instalar"[^>]*aria-pressed="{{#if sistema.instalado}}true{{else}}false{{\/if}}"/);
  assert.match(item, /role="tab"[^>]*aria-selected="{{#if active}}true{{else}}false{{\/if}}"/);
});

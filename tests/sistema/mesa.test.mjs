// A mesa e o chat (o C33; foundry-sistema/scripts/mesa.mjs), como no CORE 0.92.4: o modo do seletor do chat nos cartões
// das rolagens avulsas (o ChatDataSetup, cpr-chat.js:21-50) e "Mostrar aos jogadores" no clique direito da imagem das
// fichas (cpr-imageContextMenu.js:10-30). Sem Foundry: os ganchos, o ContextMenu e o ImagePopout são de mentira; quem
// recebe cada modo o Foundry 14 decide (ChatMessage.applyMode), e o G4 confere nos dois navegadores.
// Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import test from 'node:test';
import { FICHAS_COM_RETRATO, modoDaMesa, modoDoCartao, podeMostrarImagem, registrarMesa } from '../../foundry-sistema/scripts/mesa.mjs';

const pasta = new URL('../../foundry-sistema/', import.meta.url);
const ler = arquivo => readFileSync(new URL(arquivo, pasta), 'utf8');
const doCore = arquivo => readFileSync(new URL(`../../cyberpunk-red-core/${arquivo}`, import.meta.url), 'utf8');

// Os globais de mentira de um teste, devolvidos no fim.
function comGlobais(globais, corpo) {
  const anteriores = Object.fromEntries(Object.keys(globais).map(nome => [nome, globalThis[nome]]));
  Object.assign(globalThis, globais);
  try {
    return corpo();
  } finally {
    for (const [nome, valor] of Object.entries(anteriores)) { if (valor === undefined) delete globalThis[nome]; else globalThis[nome] = valor; }
  }
}

// O texto de cada chamada (do nome ao parêntese que fecha) de um método no código.
function chamadas(texto, metodo) {
  const lista = [];
  for (let i = texto.indexOf(`${metodo}(`); i >= 0; i = texto.indexOf(`${metodo}(`, i + 1)) {
    let fim = i + metodo.length;
    let nivel = 0;
    do {
      if (texto[fim] === '(') nivel++;
      if (texto[fim] === ')') nivel--;
      fim++;
    } while (nivel > 0 && fim < texto.length);
    lista.push(texto.slice(i, fim));
  }
  return lista;
}
// O corpo de um método de classe (dois espaços de recuo) ou de uma função do módulo, pela assinatura.
function corpo(texto, assinatura, fecho = '\n  }') {
  const inicio = texto.indexOf(assinatura);
  assert.ok(inicio >= 0, `não achei ${assinatura}`);
  return texto.slice(inicio, texto.indexOf(fecho, inicio));
}

test('O modo do cartão (o ChatDataSetup do CORE): o do fluxo vale; sem ele, o do seletor do chat, em cada modo do Foundry 14', () => {
  assert.ok(doCore('modules/chat/cpr-chat.js').includes('rollMode: modeOverride || game.settings.get("core", "rollMode"),'));
  for (const daMesa of ['public', 'gm', 'blind', 'self', 'ic']) {
    assert.equal(modoDoCartao(undefined, daMesa), daMesa);
    assert.equal(modoDoCartao('public', daMesa), 'public');
    assert.equal(modoDoCartao('gm', daMesa), 'gm');
  }
  assert.equal(modoDoCartao(undefined, undefined), 'public');
  assert.equal(modoDoCartao(null, ''), 'public');
  const lidas = [];
  comGlobais({ game: { settings: { get: (escopo, chave) => { lidas.push(`${escopo}.${chave}`); return 'blind'; } } } }, () => {
    assert.equal(modoDaMesa(), 'blind');
    assert.equal(modoDaMesa(undefined), 'blind');
    assert.equal(modoDaMesa('public'), 'public');
  });
  assert.deepEqual([...new Set(lidas)], ['core.messageMode']);
});

test('As rolagens avulsas (o atributo, o Facedown, a perícia, a Role, o Backup, o Death Save, o dano à parte, a Humanidade e o /red) saem no modo do seletor do chat', () => {
  // No CORE, todas passam pelo RenderRollCard, que usa o ChatDataSetup sem o modeOverride.
  assert.ok(doCore('modules/chat/cpr-chat.js').includes('const chatOptions = this.ChatDataSetup(html);'));
  const documentos = ler('scripts/documentos.mjs');
  for (const [assinatura, esperado] of [
    ['  rolarAtributo(chave, {', 'modo: modoDaMesa(modo)'],
    ['  rolarFacedown({', 'modo: modoDaMesa(modo)'],
    ['  rolarPericia(id, {', 'modo: modoDaMesa(modo)'],
    ['  rolarRole(id, {', 'modo: modoDaMesa(modo)'],
    ['  async rolarBackup({', '{ messageMode: modoDaMesa(modo) }'],
    ['  async rolarDeathSave({', '{ messageMode: modoDaMesa(modo) }'],
    ['  rolarHumanidade({', 'rolarPerdaDeHumanidade(this, { modo: modoDaMesa(modo) })'],
    ['  rolarDano(opcoes = {}) {', 'modo: modoDaMesa(opcoes.modo)']
  ]) assert.ok(corpo(documentos, assinatura).includes(esperado), `${assinatura.trim()} sem ${esperado}`);
  // O Backup do Lawman, pela rolagem de Role, leva o modo pedido.
  assert.ok(corpo(documentos, '  rolarRole(id, {').includes('this.rolarBackup({ ...opcoes, modo })'));
  assert.ok(corpo(ler('scripts/humanidade.mjs'), 'export async function rolarPerdaDeHumanidade(item, { modo } = {})', '\n}').includes('}, { messageMode: modo });'));
  const red = corpo(ler('scripts/rolagens.mjs'), 'export async function executarComandoRed(', '\n}');
  assert.equal(red.split('modo: modoDaMesa()').length - 1, 1, 'o /red de d10 (o teste)');
  assert.equal(red.split('{ messageMode: modoDaMesa() }').length - 1, 1, 'o /red de outro dado (o dano e a soma)');
});

test('Os fluxos que chamam as rolagens da ficha pedem o modo deles: o combate, a NET, a droga, a terapia, o tratamento e o Death Save do turno', () => {
  // As fichas, o Painel Tático e as macros são as rolagens avulsas; o documentos.mjs tem as definições.
  const avulsas = new Set(['ficha-personagem.mjs', 'ficha-capanga.mjs', 'ficha-item.mjs', 'ficha-net.mjs', 'painel/acoes.mjs', 'painel/painel.mjs', 'macros.mjs', 'documentos.mjs']);
  const raiz = new URL('scripts/', pasta);
  const arquivos = [];
  const andar = relativo => {
    for (const nome of readdirSync(new URL(relativo, raiz))) {
      const caminho = `${relativo}${nome}`;
      if (statSync(new URL(caminho, raiz)).isDirectory()) andar(`${caminho}/`);
      else if (nome.endsWith('.mjs')) arquivos.push(caminho);
    }
  };
  andar('');
  const vistas = {};
  for (const arquivo of arquivos.filter(a => !avulsas.has(a))) {
    const texto = readFileSync(new URL(arquivo, raiz), 'utf8');
    for (const metodo of ['.rolarAtributo', '.rolarFacedown', '.rolarPericia', '.rolarRole', '.rolarBackup', '.rolarDeathSave']) {
      for (const chamada of chamadas(texto, metodo)) {
        vistas[arquivo] = (vistas[arquivo] ?? 0) + 1;
        assert.match(chamada, /\bmodo\s*:/, `${arquivo}: ${chamada}`);
      }
    }
  }
  // Os fluxos de hoje: o agarrão e o Neuroport (o "esconder o total do ataque"), as Artes Marciais, a resistência à munição,
  // a droga, a terapia, o tratamento (dois) e o Death Save do turno (o do mestre e o do jogador).
  assert.deepEqual(vistas, {
    'agarrao.mjs': 1, 'artes-marciais.mjs': 1, 'combate/socket.mjs': 1, 'drogas.mjs': 1, 'municoes.mjs': 1, 'neuroport.mjs': 1,
    'terapia.mjs': 1, 'tratamento.mjs': 2, 'turnos.mjs': 1
  });
  // O combate e a NET não usam o modo do chat.
  for (const arquivo of arquivos.filter(a => a.startsWith('combate/') || a.startsWith('netrun/') || ['combate.mjs', 'net.mjs', 'neuroport.mjs'].includes(a))) {
    assert.ok(!readFileSync(new URL(arquivo, raiz), 'utf8').includes('modoDaMesa'), arquivo);
  }
});

test('"Mostrar aos jogadores" (o cpr-imageContextMenu.js do CORE): só o mestre e o dono têm a opção', () => {
  assert.equal(podeMostrarImagem({ isGM: true }, { isOwner: false }), true);
  assert.equal(podeMostrarImagem({ isGM: false }, { isOwner: true }), true);
  assert.equal(podeMostrarImagem({ isGM: false }, { isOwner: false }), false);
  assert.equal(podeMostrarImagem(null, null), false);
});

test('"Mostrar aos jogadores": o clique direito no retrato de cada ficha abre o ImagePopout com a imagem e o nome e o mostra a todos', () => {
  const fonte = doCore('modules/utils/cpr-imageContextMenu.js');
  for (const trecho of ['title: data.name,', 'popout.render(true);', 'popout.shareImage(true);']) assert.ok(fonte.includes(trecho), trecho);
  // As fichas do sistema pelo nome da classe (o gancho render<Classe> vale para as filhas) e o retrato de cada uma.
  assert.deepEqual(FICHAS_COM_RETRATO, ['FichaPersonagem', 'FichaDaNet', 'FichaConteiner', 'FichaItem', 'FichaArquitetura']);
  const fichas = ['personagem', 'capanga', 'net', 'conteiner', 'item', 'arquitetura'].map(nome => ler(`scripts/ficha-${nome}.mjs`)).join('\n');
  for (const classe of [...FICHAS_COM_RETRATO.map(nome => `class ${nome} `), 'class FichaCapanga extends FichaPersonagem ', 'class FichaBlackIce extends FichaDaNet ', 'class FichaDemonio extends FichaDaNet ']) {
    assert.ok(fichas.includes(classe), classe);
  }
  for (const modelo of ['personagem/topo', 'capanga/topo', 'capanga/limitado', 'net/black-ice', 'net/demonio', 'conteiner', 'item', 'arquitetura']) {
    assert.match(ler(`templates/${modelo}.hbs`), /<img class="retrato[ "]/, modelo);
  }

  const ganchos = new Map();
  const menus = [];
  const janelas = [];
  const globais = {
    Hooks: { on: (nome, fn) => ganchos.set(nome, fn) },
    game: { user: { isGM: false } },
    foundry: { applications: {
      ux: { ContextMenu: class { constructor(container, seletor, itens, opcoes) { menus.push({ container, seletor, itens, opcoes }); } } },
      apps: { ImagePopout: class {
        constructor(opcoes) { this.opcoes = opcoes; this.passos = []; janelas.push(this); }
        render(opcoes) { this.passos.push(['render', opcoes]); }
        shareImage() { this.passos.push(['shareImage']); }
      } }
    } }
  };
  comGlobais(globais, () => {
    registrarMesa();
    assert.deepEqual([...ganchos.keys()], FICHAS_COM_RETRATO.map(nome => `render${nome}`));
    const documento = { isOwner: false, img: 'retratos/fulano.webp', name: 'Fulano', uuid: 'Actor.fulano' };
    const ficha = { document: documento };
    const elemento = {};
    // Quem só observa não ganha o menu (o clique direito fica o do navegador).
    ganchos.get('renderFichaPersonagem')(ficha, elemento);
    assert.equal(menus.length, 0);
    // O mestre ganha um menu por janela, no retrato, fixo; o redesenho não põe outro.
    globais.game.user.isGM = true;
    ganchos.get('renderFichaPersonagem')(ficha, elemento);
    ganchos.get('renderFichaPersonagem')(ficha, elemento);
    assert.equal(menus.length, 1);
    const [{ container, seletor, itens, opcoes }] = menus;
    assert.equal(container, elemento);
    assert.equal(seletor, 'img.retrato');
    assert.deepEqual(opcoes, { jQuery: false, fixed: true });
    assert.deepEqual(itens.map(item => [item.label, item.icon]), [['Mostrar aos jogadores', 'fa-solid fa-eye']]);
    // A opção some de quem perdeu a permissão com a ficha aberta, e aparece para o dono.
    assert.equal(itens[0].visible(), true);
    globais.game.user.isGM = false;
    assert.equal(itens[0].visible(), false);
    documento.isOwner = true;
    assert.equal(itens[0].visible(), true);
    // O dono de outra ficha (o item) ganha o menu dela.
    ganchos.get('renderFichaItem')({ document: documento }, {});
    assert.equal(menus.length, 2);
    // O clique: a imagem e o nome, aberta aqui e mostrada a todos.
    itens[0].onClick();
    assert.equal(janelas.length, 1);
    assert.deepEqual(janelas[0].opcoes, { src: 'retratos/fulano.webp', window: { title: 'Fulano' } });
    assert.deepEqual(janelas[0].passos, [['render', { force: true }], ['shareImage']]);
  });
});

test('O sistema liga a mesa no init; a ficha do token solto que foi apagado (o close-unlinked-sheet-on-delete.js do CORE) fica com o Foundry 14', () => {
  assert.ok(doCore('modules/hooks/token/close-unlinked-sheet-on-delete.js').includes('if (!tokenDocument.isLinked) {'));
  // O Foundry 14 fecha as janelas do ator sintético no TokenDocument._onDelete: nenhum gancho do sistema; o G4 confere
  // nos dois navegadores.
  const sistema = ler('scripts/sistema.mjs');
  assert.ok(sistema.includes("import { registrarMesa } from './mesa.mjs';") && sistema.includes('  registrarMesa();'));
});

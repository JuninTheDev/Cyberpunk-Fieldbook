// Testes de referência das regras puras do sistema do Foundry 14 (foundry-sistema/scripts/regras.mjs) e do conteúdo
// gerado (gerado.mjs, dados/catalogo.json), sem Foundry. Cada caso tem o valor esperado e a fonte da regra: a wiki da
// mesa (system-rules.js, carregado aqui como no navegador) ou o CORE.
// Uso: node --test "tests/sistema/*.test.mjs"   (o glob: com a pasta, o Node 24 tenta rodar a pasta como arquivo)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import * as regras from '../../foundry-sistema/scripts/regras.mjs';
import { FAMILIAS, PERICIAS, TABELAS_DV, TABELAS_LESAO } from '../../foundry-sistema/scripts/gerado.mjs';
import { CLASSES_PROGRAMA, ESTILOS_ROUPA, TIPOS_CYBERWARE, TIPOS_ROUPA } from '../../foundry-sistema/scripts/config.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
// Um arquivo da wiki que se pendura em window, rodado num contexto separado.
const daWiki = (arquivo, chave) => {
  const contexto = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(raiz, arquivo), 'utf8'), contexto);
  return contexto.window[chave];
};
const wiki = daWiki('system-rules.js', 'systemRules').data;
const catalogo = JSON.parse(fs.readFileSync(path.join(raiz, 'foundry-sistema', 'dados', 'catalogo.json'), 'utf8')).itens;

// ---------------- Derivados e ferimentos ----------------
test('HP máximo: 10 + 5 × (BODY + WILL) / 2, arredondado para cima (wiki)', () => {
  assert.equal(regras.hpMaximo(6, 7), 45);
  assert.equal(regras.hpMaximo(5, 5), 35);
  assert.equal(regras.hpMaximo(8, 7), 50);
});

test('Ferimentos: gravemente abaixo da metade arredondada para cima (−2), mortalmente abaixo de 1 (−4) (wiki)', () => {
  assert.deepEqual([regras.estadoDeFerimento(45, 45).chave, regras.estadoDeFerimento(23, 45).chave, regras.estadoDeFerimento(22, 45).chave, regras.estadoDeFerimento(0, 45).chave], ['ileso', 'leve', 'grave', 'mortal']);
  assert.equal(regras.estadoDeFerimento(22, 45).penalidade, -2);
  assert.equal(regras.estadoDeFerimento(-3, 45).penalidade, -4);
});

test('Humanidade máxima: EMP × 10, menos 2 por peça instalada com perda e 4 por borgware (wiki e CORE _calcMaxHumanity)', () => {
  assert.equal(regras.humanidadeMaxima(5), 50);
  assert.equal(regras.humanidadeMaxima(5, [{ tipo: 'neuralWare', perda: 14 }]), 48, 'Kerenzikov');
  assert.equal(regras.humanidadeMaxima(5, [{ tipo: 'fashionware', perda: 0 }]), 50, 'peça sem perda não reduz');
  assert.equal(regras.humanidadeMaxima(5, [{ tipo: 'borgware', perda: 14 }]), 46, 'borgware reduz 4');
  assert.equal(regras.humanidadeMaxima(6, [{ tipo: 'cyberArm', perda: 7 }, { tipo: 'neuralWare', perda: 7 }, { tipo: 'borgware', perda: 0 }]), 52,
    'o CORE tira 4 de todo borgware, até sem perda');
});

test('EMP de agora: Humanidade / 10 para baixo, nunca acima da base (wiki)', () => {
  assert.equal(regras.empAtual(36, 5), 3);
  assert.equal(regras.empAtual(47, 5), 4);
  assert.equal(regras.empAtual(80, 5), 5);
  assert.equal(regras.empAtual(0, 5), 0);
});

test('Mortalmente ferido: −6 MOVE, mínimo 1 (wiki)', () => {
  assert.equal(regras.moveFinal(8, true), 2);
  assert.equal(regras.moveFinal(5, true), 1);
  assert.equal(regras.moveFinal(5, false), 5);
  assert.equal(regras.moveFinal(0, false), 1, 'lesões e armadura também param no 1');
});

test('Consciência de Combate do Solo pelos pontos (wiki, e o bonusRatio do CORE)', () => {
  const tudo = regras.consciencia({ 'Initiative Reaction': 2, 'Precision Attack': 3, 'Threat Detection': 2, 'Spot Weakness': 2, 'Damage Deflection': 3, 'Fumble Recovery': 4 });
  assert.deepEqual(tudo, { iniciativa: 2, ataque: 1, percepcao: 2, pontoFraco: 2, deflexao: 1, semFalhaCritica: true });
  assert.deepEqual(regras.consciencia({ 'Precision Attack': 2, 'Damage Deflection': 1, 'Fumble Recovery': 3 }), { iniciativa: 0, ataque: 0, percepcao: 0, pontoFraco: 0, deflexao: 0, semFalhaCritica: false });
  assert.deepEqual(regras.consciencia(), { iniciativa: 0, ataque: 0, percepcao: 0, pontoFraco: 0, deflexao: 0, semFalhaCritica: false }, 'sem Role');
  assert.equal(regras.consciencia({ 'Damage Deflection': 12 }).deflexao, 5, 'a Deflexão para em 5 (system-catalog.js)');
});

// ---------------- Dano e armadura (CORE _applyDamage) ----------------
test('Redução no dano que entra (Deflexão de Dano): tira do que passou mais o bônus, sem curar', () => {
  assert.equal(regras.aplicarDano({ dano: 17, sp: 11, reducao: 1, hpAtual: 40 }).recebido, 5);
  assert.equal(regras.aplicarDano({ dano: 11, bonus: 0, sp: 11, reducao: 1, hpAtual: 40 }).recebido, 0, 'nada entrou: nada a reduzir');
});

test('Dano contra armadura: só o bônus do crítico quando não passa; cabeça ×2; ablação quando passa', () => {
  const segurou = regras.aplicarDano({ dano: 10, bonus: 5, sp: 11, hpAtual: 40 });
  assert.deepEqual([segurou.recebido, segurou.passou, segurou.ablar], [5, false, false]);
  const cabeca = regras.aplicarDano({ dano: 15, sp: 11, local: 'cabeca', hpAtual: 40 });
  assert.deepEqual([cabeca.bruto, cabeca.recebido, cabeca.ablar], [8, 8, true]);
  const igual = regras.aplicarDano({ dano: 11, sp: 11, hpAtual: 40 });
  assert.equal(igual.recebido, 0, 'dano igual ao SP não passa');
});

test('Arma branca ignora metade do SP: SP 11 → 6, como o CORE e o Fluxo (decisão de 2026-10-11)', () => {
  const branca = regras.aplicarDano({ dano: 10, sp: 11, ignorarPct: 50, hpAtual: 40 });
  assert.deepEqual([branca.spEfetivo, branca.recebido], [6, 4]);
  assert.equal(regras.aplicarDano({ dano: 10, sp: 10, ignorarPct: 50, hpAtual: 40 }).spEfetivo, 5);
});

test('Arma que ignora armadura abaixo de um SP passa direto; não letal deixa 1 HP', () => {
  assert.equal(regras.aplicarDano({ dano: 5, sp: 7, ignorarAbaixo: 8, hpAtual: 40 }).recebido, 5);
  assert.equal(regras.aplicarDano({ dano: 30, sp: 0, letal: false, hpAtual: 12 }).recebido, 11);
  assert.equal(regras.aplicarDano({ dano: 30, sp: 0, letal: false, hpAtual: 0 }).recebido, 0);
});

test('Crítico do dano: dois ou mais 6 (wiki, p. 187)', () => {
  assert.equal(regras.danoCritico([6, 2, 6]), true);
  assert.equal(regras.danoCritico([6, 6, 6, 1]), true);
  assert.equal(regras.danoCritico([6, 5, 4]), false);
  assert.equal(regras.BONUS_CRITICO, 5);
});

// ---------------- Death Save e Lesão Crítica ----------------
test('Death Save: menos que BODY passa; o 10 natural sempre falha (CORE processDeathSave)', () => {
  assert.equal(regras.passouNoDeathSave({ natural: 3, total: 3, body: 5 }), true);
  assert.equal(regras.passouNoDeathSave({ natural: 5, total: 5, body: 5 }), false, 'igual a BODY falha');
  assert.equal(regras.passouNoDeathSave({ natural: 10, total: 10, body: 12 }), false);
});

test('Tabelas de Lesão Crítica: cada resultado do 2d6 dá a lesão da tabela da wiki (corpo e cabeça)', () => {
  for (const [local, tabelaDaWiki] of [['corpo', wiki.critBody], ['cabeca', wiki.critHead]]) {
    for (const [resultado, nome] of tabelaDaWiki) {
      const id = regras.lesaoNaTabela(TABELAS_LESAO[local], resultado);
      assert.ok(id, `${local} ${resultado}: sem lesão`);
      assert.equal(catalogo[id]?.name, nome, `${local} ${resultado}`);
    }
  }
});

// ---------------- Defesa (Fluxo de Combate) ----------------
test('Defesa: tiro só com REF 8+, corpo a corpo sempre, sem perna ninguém; supressivo só Concentração', () => {
  const opcoes = (modo, ref, extra = {}) => regras.opcoesDeDefesa({ modo, esquiva: regras.podeEsquivar({ modo, ref, ...extra }) }).join();
  assert.equal(opcoes('tiro', 6), 'aguentar');
  assert.equal(opcoes('tiro', 8), 'esquivar,aguentar');
  assert.equal(opcoes('corpo', 2), 'esquivar');
  assert.equal(opcoes('corpo', 9, { semPerna: true }), 'aguentar');
  assert.equal(opcoes('supressivo', 9), 'concentrar');
  assert.equal(regras.opcoesDeDefesa({ modo: 'tiro', esquiva: false, escudo: true }).join(), 'aguentar,escudo');
});

test('Acerto: empate é do defensor; no explosivo, a esquiva tem de passar do ataque; sem DV, o mestre decide', () => {
  assert.equal(regras.acertou({ modo: 'tiro', escolha: 'esquivar', ataque: 15, defesa: 15 }), false);
  assert.equal(regras.acertou({ modo: 'explosivo', escolha: 'esquivar', ataque: 15, defesa: 15 }), true);
  assert.equal(regras.acertou({ modo: 'tiro', escolha: 'aguentar', ataque: 16, dv: 16 }), false);
  assert.equal(regras.acertou({ modo: 'tiro', escolha: 'aguentar', ataque: 17, dv: 16 }), true);
  assert.equal(regras.acertou({ modo: 'tiro', escolha: 'aguentar', ataque: 17, dv: null }), null);
  assert.equal(regras.acertou({ modo: 'supressivo', escolha: 'concentrar', ataque: 15, defesa: 14 }), true, 'perdeu a Concentração: suprimido');
});

test('Modos pela munição e pelo botão; balas de cada modo; local da armadura', () => {
  assert.equal(regras.classificar({ municao: 'grenade' }), 'explosivo');
  assert.equal(regras.classificar({ tipoDeArma: 'rocketLauncher' }), 'explosivo');
  assert.equal(regras.classificar({ municao: 'shotgunShell' }), 'cartucho');
  assert.equal(regras.classificar({ municao: 'shotgunSlug' }), 'tiro');
  assert.equal(regras.classificar({ aDistancia: false }), 'corpo');
  assert.equal(regras.classificar({ pedido: 'autofogo' }), 'autofogo');
  assert.deepEqual([regras.balasDoModo('tiro'), regras.balasDoModo('autofogo'), regras.balasDoModo('supressivo')], [1, 10, 10]);
  assert.deepEqual([regras.localDaArmadura('cabeca'), regras.localDaArmadura('perna'), regras.localDaArmadura('item')], ['cabeca', 'corpo', 'corpo']);
});

test('Autofogo: quanto passou da defesa, no mínimo 1, até o máximo da arma', () => {
  assert.equal(regras.multiplicadorDeAutofogo(31, 20, 4), 4);
  assert.equal(regras.multiplicadorDeAutofogo(22, 20, 4), 2);
  assert.equal(regras.multiplicadorDeAutofogo(21, 20, 4), 1);
  assert.equal(regras.tabelasCandidatas('DV Pistol', 'autofogo')[0], 'DV Pistol (Autofire)');
  assert.deepEqual(regras.tabelasCandidatas('DV SMG (Autofire)', 'autofogo'), ['DV SMG (Autofire)']);
});

test('Área do explosivo: o centro do token dentro do quadrado de 10 × 10 m', () => {
  assert.equal(regras.dentroDaArea({ x: 0, y: 0 }, { x: 250, y: -250 }, 250), true);
  assert.equal(regras.dentroDaArea({ x: 0, y: 0 }, { x: 251, y: 0 }, 250), false);
});

// ---------------- Conteúdo gerado contra a wiki ----------------
// As tabelas de DV do CORE, faixa por faixa, contra a tabela de alcance da wiki (rangeDV). Faixa sem DV na wiki é fora
// do alcance.
const TABELA_DO_CORE = {
  pistol: ['DV Pistol', null], smg: ['DV SMG', 'DV SMG (Autofire)'], shotgun: ['DV Shotgun (Slug)', null],
  assault: ['DV Assault Rifle', 'DV Assault Rifle (Autofire)'], sniper: ['DV Sniper Rifle', null], bow: ['DV Bows & Crossbows', null],
  grenade: ['DV Grenade Launcher', null], rocket: ['DV Rocket Launcher', null]
};
test('Tabelas de DV: as do CORE batem com a tabela de alcance da wiki, faixa por faixa (com o autofogo)', () => {
  const inicios = [0, ...wiki.rangeBandLimits.slice(0, -1).map(limite => limite + 1)];
  const diferencas = [];
  for (const linha of wiki.rangeDV) {
    const [normal, autofogo] = TABELA_DO_CORE[linha.id];
    for (const [nome, dvs] of [[normal, linha.dv], [autofogo, linha.autofire]]) {
      if (!nome || !dvs) continue;
      dvs.forEach((dv, faixa) => {
        const doCore = regras.dvPelaDistancia(TABELAS_DV[nome], inicios[faixa]);
        const esperado = dv ?? null;
        if ((doCore.fora ? null : doCore.dv) !== esperado) diferencas.push(`${nome} ${wiki.rangeBands[faixa]}: CORE ${doCore.fora ? 'fora' : doCore.dv}, wiki ${esperado ?? 'fora'}`);
      });
    }
  }
  assert.deepEqual(diferencas, []);
});

test('Perícias: o atributo e o "x2" de cada perícia batem com a tabela de perícias da wiki', () => {
  const diferencas = [];
  for (const [nome, en, atributo, , dificil] of wiki.skills) {
    const nossa = PERICIAS.find(p => p.en === en) ?? Object.values(FAMILIAS).find(f => f.en === en);
    if (!nossa) { diferencas.push(`${en}: não existe no sistema`); continue; }
    if (nossa.atributo !== atributo.toLowerCase()) diferencas.push(`${en}: ${nossa.atributo} no sistema, ${atributo} na wiki`);
    if (nossa.dificil !== dificil) diferencas.push(`${en}: x2 ${nossa.dificil} no sistema, ${dificil} na wiki`);
    if (nossa.nome !== nome) diferencas.push(`${en}: "${nossa.nome}" no sistema, "${nome}" na wiki`);
  }
  assert.deepEqual(diferencas, []);
});

test('Catálogo: todo item da loja da wiki dos tipos que o sistema tem (armas, armaduras, munição, cyberware, equipamento, roupa, droga, cyberdeck, programa e upgrade) existe nele', () => {
  // Array.from: o que vem do vm é de outro "realm", e o deepEqual estrito compara o protótipo. O conteúdo de 2077 ainda
  // não tem tipo aqui.
  const itens = Array.from(daWiki('loja-catalogo.js', 'shopCatalog').itens);
  const tipos = /^core_(weapons|armor|ammo|cyberware|gear|clothing|drugs|programs|upgrades):/;
  const faltam = itens.filter(item => tipos.test(item.id) && !catalogo[item.id]).map(item => item.id);
  assert.ok(itens.filter(item => tipos.test(item.id)).length > 400, 'a loja da wiki tem os itens do CORE');
  assert.deepEqual(faltam, []);
});

// Armas exóticas sem dano no CORE: o efeito delas é especial (a Shrieker dá lesão no ouvido; a Air Pistol dispara tinta
// ou ácido) e não é automático nem no CORE.
const SEM_DANO = ['core_weapons:air-pistol', 'core_weapons:microwaver', 'core_weapons:shrieker'];
test('Catálogo: a ablação da munição segue a tabela de munição da wiki (perfurante 2; borracha, biotoxina e venenosa 0)', () => {
  // As linhas da tabela "Munição" de system-catalog.js: o tipo e o que ele faz.
  const texto = fs.readFileSync(path.join(raiz, 'system-catalog.js'), 'utf8');
  const secao = texto.slice(texto.indexOf('data-toc="Munição"'), texto.indexOf('data-toc="Acessórios de arma"'));
  const linhas = Object.fromEntries([...secao.matchAll(/\['<b>([^<]+)<\/b>[^']*', '[^']*', '[^']*', '([^']*)'\]/g)].map(([, nome, efeito]) => [nome, efeito]));
  const EFEITO = { Perfurante: 'armorPiercing', Biotoxina: 'biotoxin', Venenosa: 'poison', Borracha: 'rubber' };
  const esperada = nome => (/ablação é de 2/.test(linhas[nome]) ? 2 : /(Não causa|nem) ablação/.test(linhas[nome]) ? 0 : null);
  assert.deepEqual(Object.keys(EFEITO).map(esperada), [2, 0, 0, 0], 'a tabela de munição da wiki mudou');
  for (const [nome, efeito] of Object.entries(EFEITO)) {
    const municoes = Object.values(catalogo).filter(item => item.type === 'municao' && item.system.efeito === efeito);
    assert.ok(municoes.length, `${nome}: nenhuma munição no catálogo`);
    for (const municao of municoes) assert.equal(municao.system.ablacao, esperada(nome), `${municao.name}: ablação`);
  }
});

test('Munição que não causa dano: as mesmas da tabela de munição da wiki, com o texto dela, e todas no catálogo', () => {
  const texto = fs.readFileSync(path.join(raiz, 'system-catalog.js'), 'utf8');
  const secao = texto.slice(texto.indexOf('data-toc="Munição"'), texto.indexOf('data-toc="Acessórios de arma"'));
  const linhas = Object.fromEntries([...secao.matchAll(/\['<b>([^<]+)<\/b>[^']*', '[^']*', '[^']*', '([^']*)'\]/g)].map(([, nome, efeito]) => [nome, efeito]));
  const EFEITO = { Biotoxina: 'biotoxin', EMP: 'emp', Flashbang: 'flashbang', Venenosa: 'poison', Sonífera: 'sleep', Fumaça: 'smoke', 'Gás lacrimogêneo': 'teargas' };
  // Toda linha da wiki que diz "Não causa dano" (e a fumaça, que só cobre a área) está no sistema, e nenhuma a mais.
  const daWikiSemDano = Object.keys(linhas).filter(nome => /^Não causa dano/.test(linhas[nome]) || nome === 'Fumaça').map(nome => EFEITO[nome]);
  assert.deepEqual(daWikiSemDano.sort(), Object.keys(regras.MUNICAO_SEM_DANO).sort());
  for (const [nome, efeito] of Object.entries(EFEITO)) {
    assert.ok(linhas[nome].includes(regras.MUNICAO_SEM_DANO[efeito]), `${nome}: o texto do sistema não é o da wiki`);
    assert.ok(Object.values(catalogo).some(item => item.type === 'municao' && item.system.efeito === efeito), `${nome}: nenhuma munição no catálogo`);
  }
});

test('Tipos de cyberware: todo tipo do catálogo tem rótulo na ficha (senão o select da ficha do item troca o tipo ao salvar)', () => {
  const tipos = [...new Set(Object.values(catalogo).filter(item => item.type === 'cyberware').map(item => item.system.tipo))];
  assert.deepEqual(tipos.filter(tipo => !TIPOS_CYBERWARE[tipo]), []);
});

test('Inventário: o efeito do equipamento vale conforme a ativação e o uso', () => {
  const tabela = ['equipado', 'carregando', 'manual'].map(ativacao => ['equipado', 'carregando', 'guardado'].map(uso => regras.efeitoValeNoUso(ativacao, uso)));
  assert.deepEqual(tabela, [[true, false, false], [true, true, false], [true, true, true]]);
});

test('Catálogo: equipamento, roupa e droga como o CORE (ativação pelo usage, efeitos da droga desligados, rótulos de roupa)', () => {
  const ativacao = id => catalogo[id].system.ativacao;
  assert.deepEqual(['core_gear:agent', 'core_gear:medscanner', 'core_gear:linear-frame-beta', 'core_gear:flashlight'].map(ativacao), ['carregando', 'equipado', 'equipado', 'manual']);
  const porTipo = tipo => Object.values(catalogo).filter(item => item.type === tipo);
  assert.deepEqual([porTipo('equipamento').length, porTipo('roupa').length, porTipo('droga').length], [51, 90, 10]);
  // As duas bases externas do pack de equipamento entram como cyberware, sem perda de Humanidade.
  assert.deepEqual(['core_gear:battleglove', 'core_gear:smart-glasses'].map(id => [catalogo[id].type, catalogo[id].system.fundacional, catalogo[id].system.perdaHumanidade.media]),
    [['cyberware', true, 0], ['cyberware', true, 0]]);
  for (const droga of porTipo('droga')) {
    assert.ok(droga.effects.every(efeito => efeito.disabled), `${droga.name}: efeito ligado`);
    if (droga.system.consumo) assert.ok(droga.effects.some(efeito => efeito.name === droga.system.consumo), `${droga.name}: o efeito "${droga.system.consumo}" não existe`);
  }
  for (const roupa of porTipo('roupa')) assert.ok(TIPOS_ROUPA[roupa.system.tipo] && ESTILOS_ROUPA[roupa.system.estilo], `${roupa.name}: tipo ou estilo sem rótulo`);
});

test('Catálogo: programas com ATK, DEF, REZ, classe e custo da página de NET da wiki; cyberdecks com os slots da loja', () => {
  // As linhas dos programas do RED em system-net.js: { name: 'Eraser', tag: 'Booster', stats: programStats(0, 0, 7, '20eb') }.
  const texto = fs.readFileSync(path.join(raiz, 'system-net.js'), 'utf8');
  const daWikiNet = Object.fromEntries([...texto.matchAll(/\{ name: '([^']+)', tag: '([^']+)', stats: programStats\((\d+), (\d+), (\d+), '(\d+)eb'\)/g)]
    .map(([, nome, classe, atk, def, rez, custo]) => [nome, { classe, numeros: [atk, def, rez, custo].map(Number) }]));
  // Os programas do RED (os quickhacks e daemons de 2077 têm o teste deles).
  const programas = Object.entries(catalogo).filter(([id, item]) => item.type === 'programa' && id.startsWith('core_')).map(([, item]) => item);
  assert.equal(programas.length, 15);
  for (const p of programas) {
    const wiki = daWikiNet[p.name];
    assert.ok(wiki, `${p.name}: não está na página de NET da wiki`);
    assert.deepEqual([p.system.atk, p.system.def, p.system.rez, p.system.preco], wiki.numeros, `${p.name}: ATK, DEF, REZ e custo`);
    assert.equal(CLASSES_PROGRAMA[p.system.classe], wiki.classe, `${p.name}: classe`);
  }
  const loja = Array.from(daWiki('loja-catalogo.js', 'shopCatalog').itens).filter(item => item.deck && item.id.startsWith('core_'));
  assert.equal(loja.length, 3);
  for (const deck of loja) assert.equal(catalogo[deck.id]?.system.slots, deck.deck.slots, `${deck.id}: slots`);
});

test('Upgrades: os slots da loja da wiki; o pente de cada carregador e o padrão de cada arma, pela tabela de carregadores da wiki', () => {
  const loja = Array.from(daWiki('loja-catalogo.js', 'shopCatalog').itens);
  // Acessórios e hardware: os slots que a loja mostra.
  const upgrades = loja.filter(item => item.acessorio || item.hardware);
  assert.equal(upgrades.length, 32);
  for (const item of upgrades) assert.equal(catalogo[item.id]?.system.tamanho, (item.acessorio || item.hardware).tamanho, `${item.id}: slots`);
  // Tabela de carregadores (system-catalog.js): [classe, padrão, estendido, tambor].
  const texto = fs.readFileSync(path.join(raiz, 'system-catalog.js'), 'utf8');
  const bloco = texto.slice(texto.indexOf('Tabela de carregadores'), texto.indexOf('Qualidade da arma'));
  const tabela = Object.fromEntries([...bloco.matchAll(/\['([^']+)', '(\d+)', '(\d+)', '(\d+)'\]/g)].map(([, classe, ...pentes]) => [classe, pentes.map(Number)]));
  const CLASSES = {
    'Medium Pistol': 'Pistola média', 'Heavy Pistol': 'Pistola pesada', 'Very Heavy Pistol': 'Pistola muito pesada', SMG: 'SMG', 'Heavy SMG': 'SMG pesada',
    Shotgun: 'Espingarda', 'Assault Rifle': 'Rifle de assalto', 'Sniper Rifle': 'Rifle de precisão', 'Grenade Launcher': 'Lança-granadas', 'Rocket Launcher': 'Lança-mísseis'
  };
  assert.equal(Object.keys(tabela).length, 10, 'a tabela de carregadores da wiki mudou');
  for (const [en, pt] of Object.entries(CLASSES)) {
    const [padrao, estendido, tambor] = tabela[pt];
    const id = en.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    assert.equal(catalogo[`core_weapons:${id}`].system.pente.max, padrao, `${en}: pente padrão`);
    assert.equal(catalogo[`core_upgrades:extended-magazine-${id}`].system.modificadores.pente, estendido, `${en}: carregador estendido`);
    assert.equal(catalogo[`core_upgrades:drum-magazine-${id}`].system.modificadores.pente, tambor, `${en}: carregador tambor`);
  }
  // Smartgun Link: +1 nos ataques à distância. A luneta de precisão (+1 a 51 m ou mais) é situacional: fica de fora.
  assert.deepEqual(['smartgun-link', 'sniping-scope'].map(id => catalogo[`core_upgrades:${id}`].system.modificadores.ataque), [1, 0]);
  // Armas: os slots de acessório da loja; de longo alcance e não exótica, 3 (wiki).
  for (const item of loja.filter(i => i.id.startsWith('core_weapons:'))) {
    assert.equal(catalogo[item.id].system.slots, item.arma.slots, `${item.id}: slots`);
    if (item.arma.distancia && !item.arma.exotica) assert.equal(item.arma.slots, 3, `${item.id}: arma de longo alcance com ${item.arma.slots} slots`);
  }
});

test('Veículos: os terrestres com o PDE, os assentos, o MOVE e o custo da tabela da wiki; a Oficina da Família do Nomad toda no catálogo', () => {
  // A tabela de veículos terrestres de system-rules.js: [nome, PDE, assentos, MOVE, custo].
  const texto = fs.readFileSync(path.join(raiz, 'system-rules.js'), 'utf8');
  const bloco = texto.slice(texto.indexOf("'Veículo terrestre'"));
  const tabela = Object.fromEntries([...bloco.slice(0, bloco.indexOf("'dense'")).matchAll(/\['([^']+)', '(\d+)', '(\d+)', '(\d+)', '([\d.]+)eb'\]/g)]
    .map(([, nome, sdp, assentos, move, custo]) => [nome, [sdp, assentos, move, custo.replace('.', '')].map(Number)]));
  const NOMES = { roadbike: 'Moto estradeira', superbike: 'Superbike', 'compact-groundcar': 'Carro compacto', 'high-performance-groundcar': 'Carro esportivo', 'super-groundcar': 'Supercarro' };
  assert.equal(Object.keys(tabela).length, 5, 'a tabela de veículos da wiki mudou');
  for (const [id, nome] of Object.entries(NOMES)) {
    const s = catalogo[`core_vehicles:${id}`].system;
    assert.deepEqual([s.sdp.max, s.assentos, s.velocidade.combate, s.preco], tabela[nome], nome);
  }
  // A Oficina da Família (system-criacao.js): o importador acha cada veículo e upgrade pelo nome do CORE.
  const oficina = daWiki('system-criacao.js', 'systemCreation').nomadMotorpool;
  const id = nome => nome.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  for (const v of oficina.veiculos) assert.equal(catalogo[`core_vehicles:${id(v.id)}`]?.type, 'veiculo', v.id);
  for (const u of oficina.upgrades) assert.equal(catalogo[`core_upgrades:${id(u.id)}`]?.system.alvo, 'veiculo', u.id);
  // Os dois upgrades com número, como a descrição da Oficina: +20 SDP e mais dois assentos.
  const desc = nome => oficina.upgrades.find(u => u.id === nome).desc;
  assert.ok(/\+20 SDP/.test(desc('Heavy Chassis')) && catalogo['core_upgrades:heavy-chassis'].system.modificadores.sdp === 20);
  assert.ok(/Mais dois assentos/.test(desc('Seating Upgrade')) && catalogo['core_upgrades:seating-upgrade'].system.modificadores.assentos === 2);
});

test('Catálogo de 2077: todo item que a loja da wiki vende existe, com os números dos compêndios do cpr-2077 que a loja registra', () => {
  // A loja (loja-catalogo.js) é gerada dos compêndios do cpr-2077, e o sistema converte direto da wiki
  // (build/conteudo-2077.mjs): os dois têm de dar o mesmo. O "exotica" da loja é outra coisa (a classe da arma fora das
  // do RED) e fica de fora.
  const loja = Array.from(daWiki('loja-catalogo.js', 'shopCatalog').itens).filter(item => /^(armas|cyberware|netrunning)-2077:/.test(item.id));
  assert.equal(loja.length, 150);
  const id = nome => nome.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  for (const item of loja) {
    const nosso = catalogo[item.id];
    assert.ok(nosso, `${item.id}: não está no catálogo`);
    const s = nosso.system;
    const igual = (campo, a, b) => assert.deepEqual(a, b, `${item.id}: ${campo}`);
    igual('preço', s.preco, item.preco);
    if (item.arma) {
      const a = item.arma;
      igual('números da arma', [s.tipo, s.pericia, s.dano, s.cdt, s.pente.max, s.maos, s.ocultavel, s.slots], [a.tipo, id(a.pericia), a.dano, a.cdt, a.pente, a.maos, a.oculta, a.slots]);
      igual('munição', Array.from(s.municoes), Array.from(a.municao));
      assert.ok(['power', 'tech', 'smart'].includes(nosso.flags['cpr-fieldbook'].arma2077.classe), `${item.id}: classe de 2077`);
    } else if (item.municao) {
      igual('munição', [s.tipo, s.efeito], [item.municao.variedade, item.municao.tipo]);
    } else if (item.cyber) {
      const c = item.cyber;
      igual('cyberware', [s.tipo, s.fundacional, s.tamanho, s.perdaHumanidade.media, s.perdaHumanidade.formula, s.local], [c.tipo, c.base, c.tamanho, c.hl, c.rolagem, c.instalacao]);
    } else if (item.deck) {
      igual('deck', [s.slots, s.ram], [item.deck.slots, item.deck.ram]);
    } else if (item.programa) {
      igual('tamanho', s.tamanho, item.programa.tamanho);
      if (s.classe === 'daemon') igual('REZ do daemon', s.rez, item.programa.rez);
    }
  }
});

test('Catálogo: armas com dano em dados (menos as exóticas sem dano), perícia que existe e tabela de DV que existe', () => {
  const pericias = new Set([...PERICIAS.map(p => p.id), ...Object.keys(FAMILIAS)]);
  const problemas = [];
  for (const [id, item] of Object.entries(catalogo).filter(([, item]) => item.type === 'arma')) {
    const s = item.system;
    if (SEM_DANO.includes(id) ? s.dano !== '0' : !/^\d+d\d+/.test(s.dano)) problemas.push(`${id}: dano ${s.dano}`);
    if (!pericias.has(s.pericia)) problemas.push(`${id}: perícia ${s.pericia}`);
    if (s.aDistancia && s.tabelaDV && !TABELAS_DV[s.tabelaDV]) problemas.push(`${id}: tabela ${s.tabelaDV}`);
  }
  assert.deepEqual(problemas, []);
});

// ---------------- Armas de 2077 ----------------
// As regras da página de 2077 da wiki (system-2077.js: "Os três tipos", "Ricochete (Power)", "Carga Tech" e "Armas
// Smart") e o texto de cada arma, contra o perfil que o sistema monta da flag arma2077 do catálogo.
const perfilDe = id => {
  const item = catalogo[id];
  assert.ok(item, `${id}: não está no catálogo`);
  return regras.perfil2077(item.flags['cpr-fieldbook']?.arma2077, item.system);
};
const linhaDaWiki = id => wiki.rangeDV.find(linha => linha.id === id);

test('Armas de 2077: o perfil pela flag do catálogo (a rajada e as balas que cada Tech diz no texto; o 12 + 1d10 das Smart de várias balas)', () => {
  // "Na carga Tech (rajada), dispara 2 balas" (Kenshin), "3 balas" (Omaha), "exige 10 balas no pente e gasta essas 10"
  // (Quasar), "dispara as 30 balas do pente" (Senkoh). Sem rajada: a Achilles, a Nekomata, a Burya e a Satara.
  const tech = id => { const p = perfilDe(`armas-2077:${id}`); return [p.classe, p.rajadaTech, p.rajadaTech ? p.balasDaRajadaTech : 0]; };
  assert.deepEqual(tech('arasaka-jke-x2-kenshin'), ['tech', 2, 2]);
  assert.deepEqual(tech('militech-m-76e-omaha'), ['tech', 3, 3]);
  assert.deepEqual(tech('darra-polytechnic-dr-12-quasar'), ['tech', 3, 10]);
  assert.deepEqual(tech('arasaka-senkoh-lx'), ['tech', 3, 30]);
  for (const id of ['militech-m-179-achilles', 'tsunami-nekomata', 'techtronika-rt-46-burya', 'rostovic-db-2-satara']) assert.deepEqual(tech(id), ['tech', 0, 0], id);
  // "Dispara três balas Smart: o teste Smart passa a 12 + 1d10" (Yukimura, Shingen, Zhuo...); as outras, 10 + 1d10.
  assert.equal(perfilDe('armas-2077:arasaka-hjke-11-yukimura').smart, 12);
  assert.equal(perfilDe('armas-2077:arasaka-tki-20-shingen').smart, 12);
  assert.equal(perfilDe('armas-2077:kang-tao-l-69-zhuo').smart, 12);
  assert.equal(perfilDe('armas-2077:tsunami-ashura').smart, 10);
  assert.equal(perfilDe('armas-2077:rostovic-db-4-palica').smart, 10);
  // Power: ricocheteia, menos as que "não disparam menos de três balas" (Nowaki, Masamune) e as de Disparo Automático.
  assert.equal(perfilDe('armas-2077:constitutional-arms-liberty').ricocheteia, true);
  assert.equal(perfilDe('armas-2077:nokota-d5-copperhead').ricocheteia, true);
  assert.equal(perfilDe('armas-2077:arasaka-nowaki').ricocheteia, false);
  assert.equal(perfilDe('armas-2077:arasaka-hjsh-18-masamune').ricocheteia, false);
  assert.equal(perfilDe('armas-2077:militech-mk-31-hmg').ricocheteia, false);
  // As armas do livro-base não são de 2077.
  assert.equal(perfilDe('core_weapons:heavy-pistol'), null);
  // Toda arma do catálogo de 2077 tem classe; nenhuma Power ou Smart tem rajada Tech.
  for (const [id, item] of Object.entries(catalogo).filter(([id, item]) => id.startsWith('armas-2077:') && item.type === 'arma')) {
    const p = perfilDe(id);
    assert.ok(p, `${id}: sem perfil de 2077`);
    if (p.classe !== 'tech') assert.equal(p.rajadaTech, 0, id);
    if (p.classe !== 'smart') assert.equal(p.smart, 0, id);
    assert.ok(item.system.descricao.includes('Neste sistema:'), `${id}: a descrição não diz o que o sistema faz`);
  }
});

test('Ricochete (wiki): tiro único com a perícia da arma, DV da tabela de autofogo (pistolas na linha da SMG), um dado a menos; +2 do Ballistic Coprocessor', () => {
  assert.equal(regras.classificar({ pedido: 'ricochete' }), 'ricochete');
  assert.equal(regras.balasDoModo('ricochete'), 1);
  assert.equal(regras.tabelaDoRicochete('heavyPistol'), 'DV SMG (Autofire)');
  assert.equal(regras.tabelaDoRicochete('medPistol'), 'DV SMG (Autofire)');
  assert.equal(regras.tabelaDoRicochete('heavySmg'), 'DV SMG (Autofire)');
  assert.equal(regras.tabelaDoRicochete('assaultRifle'), 'DV Assault Rifle (Autofire)');
  assert.deepEqual(regras.tabelasCandidatas('DV Pistol', 'ricochete', 'heavyPistol'), ['DV SMG (Autofire)']);
  assert.deepEqual(regras.tabelasCandidatas('DV Assault Rifle', 'ricochete', 'assaultRifle'), ['DV Assault Rifle (Autofire)']);
  // A 10 m: a coluna de 7–12 m da tabela de autofogo da wiki.
  assert.equal(regras.dvPelaDistancia(TABELAS_DV[regras.tabelaDoRicochete('heavyPistol')], 10).dv, linhaDaWiki('smg').autofire[1]);
  assert.equal(regras.dvPelaDistancia(TABELAS_DV[regras.tabelaDoRicochete('assaultRifle')], 10).dv, linhaDaWiki('assault').autofire[1]);
  assert.equal(regras.umDadoAMenos('3d6'), '2d6');
  assert.equal(regras.umDadoAMenos('5d6'), '4d6');
  assert.equal(regras.umDadoAMenos('1d6'), '1d6');
  assert.equal(regras.BONUS_COPROCESSADOR, 2);
  assert.equal(regras.descreverAtaque({ modo: 'ricochete' }), 'Ricochete');
  // Quem não ricocheteia: o aviso, antes de gastar a bala.
  const liberty = perfilDe('armas-2077:constitutional-arms-liberty');
  assert.equal(regras.impedimento2077({ modo: 'ricochete', perfil: liberty }), null);
  assert.match(regras.impedimento2077({ modo: 'ricochete', perfil: perfilDe('armas-2077:arasaka-nowaki') }), /Power de tiro único/);
  assert.match(regras.impedimento2077({ modo: 'ricochete', perfil: perfilDe('armas-2077:arasaka-jke-x2-kenshin') }), /Power de tiro único/);
  assert.match(regras.impedimento2077({ modo: 'ricochete', perfil: perfilDe('armas-2077:budget-arms-carnage'), pelaMunicao: 'cartucho' }), /tiro único/);
  assert.match(regras.impedimento2077({ modo: 'ricochete', perfil: null }), /Power de tiro único/);
});

test('Carga Tech (wiki): metade passa da cobertura fina e um quarto da grossa; a armadura perde 4 de SP (2 através de cobertura); a rajada usa a tabela de autofogo da SMG e passa só 25% da fina', () => {
  const { nenhuma, fina, grossa } = regras.COBERTURAS;
  assert.deepEqual([nenhuma.carga, fina.carga, grossa.carga], [1, 0.5, 0.25]);
  assert.deepEqual([nenhuma.rajadaTech, fina.rajadaTech, grossa.rajadaTech], [1, 0.25, 0]);
  assert.deepEqual([nenhuma.ablacao, fina.ablacao, grossa.ablacao], [4, 2, 2]);
  // O que atravessa: a fração do rolado, para baixo.
  assert.equal(regras.atravessarCobertura(13, 1), 13);
  assert.equal(regras.atravessarCobertura(13, 0.5), 6);
  assert.equal(regras.atravessarCobertura(13, 0.25), 3);
  assert.equal(regras.atravessarCobertura(3, 0.25), 0);
  // A carga é tiro único; a rajada, autofogo carregado (tabela da SMG, perícia Disparo Automático, até o ×N da arma).
  assert.equal(regras.classificar({ pedido: 'carga' }), 'carga');
  assert.equal(regras.balasDoModo('carga'), 1);
  assert.equal(regras.balasDoModo('rajadaTech', { rajadaTech: 2 }), 2);
  assert.equal(regras.balasDoModo('rajadaTech'), regras.BALAS_RAJADA);
  assert.deepEqual(regras.tabelasCandidatas('DV Pistol', 'rajadaTech', 'medPistol'), ['DV SMG (Autofire)']);
  assert.deepEqual(regras.tabelasCandidatas('DV Sniper Rifle', 'carga', 'sniperRifle'), ['DV Sniper Rifle']);
  assert.equal(regras.multiplicadorDeAutofogo(25, 17, perfilDe('armas-2077:arasaka-jke-x2-kenshin').rajadaTech), 2);
  assert.equal(regras.descreverAtaque({ modo: 'carga', cobertura: 'fina' }), 'Carga Tech através de cobertura fina');
  assert.equal(regras.descreverAtaque({ modo: 'rajadaTech', cobertura: 'nenhuma' }), 'Rajada Tech');
  // O que impede: arma que não é Tech, rajada numa arma de tiro único, rajada contra cobertura grossa, a carga com
  // cartucho (a Satara, que ainda não está no sistema).
  const kenshin = perfilDe('armas-2077:arasaka-jke-x2-kenshin');
  const achilles = perfilDe('armas-2077:militech-m-179-achilles');
  assert.equal(regras.impedimento2077({ modo: 'carga', perfil: kenshin, cobertura: 'grossa' }), null);
  assert.equal(regras.impedimento2077({ modo: 'rajadaTech', perfil: kenshin, cobertura: 'fina' }), null);
  assert.match(regras.impedimento2077({ modo: 'rajadaTech', perfil: kenshin, cobertura: 'grossa' }), /não atravessa cobertura grossa/);
  assert.match(regras.impedimento2077({ modo: 'rajadaTech', perfil: achilles }), /só faz a carga em tiro único/);
  assert.match(regras.impedimento2077({ modo: 'carga', perfil: perfilDe('armas-2077:constitutional-arms-liberty') }), /não é uma arma Tech/);
  assert.match(regras.impedimento2077({ modo: 'carga', perfil: perfilDe('armas-2077:rostovic-db-2-satara'), pelaMunicao: 'cartucho' }), /Satara/);
});

test('Carga Tech: depois de uma carga a arma esfria uma rodada (carrega de novo na rodada R + 2), só no mesmo combate', () => {
  const marca = { combate: 'c1', rodada: 3 };
  assert.equal(regras.rodadaDaProximaCarga(marca, { id: 'c1', rodada: 3 }), 5);
  assert.equal(regras.rodadaDaProximaCarga(marca, { id: 'c1', rodada: 4 }), 5);
  assert.equal(regras.rodadaDaProximaCarga(marca, { id: 'c1', rodada: 5 }), null);
  assert.equal(regras.rodadaDaProximaCarga(marca, { id: 'c2', rodada: 3 }), null);
  assert.equal(regras.rodadaDaProximaCarga(null, { id: 'c1', rodada: 3 }), null);
  assert.equal(regras.rodadaDaProximaCarga(marca, null), null);
});

test('Teste Smart (wiki): 10 + 1d10 (12 com várias balas) no tiro da arma Smart, só com o Smart Link; o autofogo e o mirado continuam REF + perícia', () => {
  const yukimura = perfilDe('armas-2077:arasaka-hjke-11-yukimura');
  const ashura = perfilDe('armas-2077:tsunami-ashura');
  const comLink = { smartLink: true };
  assert.equal(regras.testeSmart({ perfil: yukimura, modo: 'tiro', ...comLink }), 12);
  assert.equal(regras.testeSmart({ perfil: ashura, modo: 'tiro', ...comLink }), 10);
  assert.equal(regras.testeSmart({ perfil: perfilDe('armas-2077:kang-tao-l-69-zhuo'), modo: 'cartucho', ...comLink }), 12);
  assert.equal(regras.testeSmart({ perfil: yukimura, modo: 'tiro' }), 0);
  assert.equal(regras.testeSmart({ perfil: yukimura, modo: 'tiro', local: 'cabeca', ...comLink }), 0);
  assert.equal(regras.testeSmart({ perfil: perfilDe('armas-2077:arasaka-tki-20-shingen'), modo: 'autofogo', ...comLink }), 0);
  assert.equal(regras.testeSmart({ perfil: perfilDe('armas-2077:arasaka-jke-x2-kenshin'), modo: 'tiro', ...comLink }), 0);
  // Na configuração "alternativa", só pelo botão "Smart".
  assert.equal(regras.testeSmart({ perfil: yukimura, modo: 'tiro', smartAtaque: 'alternativa', ...comLink }), 0);
  assert.equal(regras.testeSmart({ perfil: yukimura, modo: 'tiro', pedido: 'smart', smartAtaque: 'alternativa', ...comLink }), 12);
  assert.equal(regras.descreverAtaque({ modo: 'tiro', smart: 12 }), 'Tiro Smart');
  // Sem o Smart Link: não dispara (o padrão) ou dispara como comum.
  assert.match(regras.impedimento2077({ modo: 'tiro', perfil: yukimura }), /só dispara com o cyberware Smart Link/);
  assert.match(regras.impedimento2077({ modo: 'autofogo', perfil: perfilDe('armas-2077:arasaka-tki-20-shingen') }), /Smart Link/);
  assert.equal(regras.impedimento2077({ modo: 'tiro', perfil: yukimura, smartSemLink: 'comum' }), null);
  assert.equal(regras.impedimento2077({ modo: 'tiro', perfil: yukimura, smartLink: true }), null);
  assert.match(regras.impedimento2077({ modo: 'tiro', perfil: yukimura, pedido: 'smart', smartSemLink: 'comum' }), /precisa do Smart Link/);
  assert.match(regras.impedimento2077({ modo: 'tiro', perfil: perfilDe('armas-2077:constitutional-arms-liberty'), pedido: 'smart' }), /não é uma arma Smart/);
  // O Smart Link e o Ballistic Coprocessor do catálogo (pelo nome, ou pelo id do catálogo depois de renomeados); o
  // Smartgun Link do livro-base é outro (um acessório de arma).
  assert.equal(regras.ehSmartLink(catalogo['cyberware-2077:smart-link'].name), true);
  assert.equal(regras.ehSmartLink('Smartlink'), true);
  assert.equal(regras.ehSmartLink('Smartgun Link'), false);
  assert.equal(regras.ehSmartLink('O link da Vee', 'cyberware-2077:smart-link'), true);
  assert.equal(regras.ehCoprocessador(catalogo['cyberware-2077:ballistic-coprocessor'].name), true);
  assert.equal(regras.ehCoprocessador('Smart Link'), false);
});

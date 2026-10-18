// Testes de referência das regras puras do sistema do Foundry 14 (foundry-sistema/scripts/regras.mjs) e do conteúdo
// gerado (gerado.mjs, dados/catalogo.json), sem Foundry. Cada caso tem o valor esperado e a fonte da regra: a wiki da
// mesa (system-rules.js, carregado aqui como no navegador) ou o CORE.
// Uso: node --test "tests/sistema/*.test.mjs"   (o glob: com a pasta, o Node 24 tenta rodar a pasta como arquivo)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import * as regras from '../../foundry-sistema/scripts/regras.mjs';
import * as arquitetura from '../../foundry-sistema/scripts/arquitetura.mjs';
import * as netrun from '../../foundry-sistema/scripts/netrun/regras-da-net.mjs';
import { PONTO_PADRAO } from '../../foundry-sistema/scripts/netrun/constantes.mjs';
import { arquiteturasDaCampanha, EXEMPLOS as ARQUITETURAS_DE_EXEMPLO } from '../../foundry-sistema/build/arquiteturas.mjs';
import { BLACK_ICE, DEMONIOS, FAMILIAS, HABILIDADES_DE_ROLE, PERICIAS, ROLES, ROLES_ANTIGAS, TABELAS_DA_NET, TABELAS_DV, TABELAS_LESAO } from '../../foundry-sistema/scripts/gerado.mjs';
import { ATORES_DA_NET, CLASSES_BLACK_ICE, CLASSES_PROGRAMA, enderecoPadraoDaWiki, ESTILOS_ROUPA, LIFEPATH, TIPOS_CYBERWARE, TIPOS_ROUPA, USOS } from '../../foundry-sistema/scripts/config.mjs';

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

test('Editor de Dor: tira o −2 de gravemente ferido, não o −4 de mortalmente ferido (wiki e CORE getWoundStateMods)', () => {
  const texto = fs.readFileSync(path.join(raiz, 'system-catalog.js'), 'utf8');
  assert.match(texto, /\['Pain Editor', 'Ignora penalidades de Seriously Wounded\.'/, 'a regra da wiki mudou');
  const [ileso, grave, mortal] = [45, 20, 0].map(hp => regras.estadoDeFerimento(hp, 45));
  assert.deepEqual([grave, mortal].map(f => regras.penalidadeDoFerimento(f)), [-2, -4], 'sem o Editor');
  assert.deepEqual([ileso, grave, mortal].map(f => regras.penalidadeDoFerimento(f, true)), [0, 0, -4], 'com o Editor');
});

test('Endereço padrão da wiki: wiki.<domínio> com a mesa em mesa.<domínio>; senão, localhost:8000 (como o cpr-2077)', () => {
  assert.equal(enderecoPadraoDaWiki({ protocol: 'https:', hostname: 'mesa.edgerunnersstorys.app' }), 'https://wiki.edgerunnersstorys.app');
  assert.equal(enderecoPadraoDaWiki({ protocol: 'http:', hostname: 'localhost' }), 'http://localhost:8000');
  assert.equal(enderecoPadraoDaWiki({ protocol: 'http:', hostname: '192.168.0.10' }), 'http://localhost:8000');
  assert.equal(enderecoPadraoDaWiki(), 'http://localhost:8000', 'sem endereço (fora do navegador)');
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
  // Os do CORE (a droga do Mission Kit, Immunoblockers, tem o teste dela).
  const porTipo = tipo => Object.entries(catalogo).filter(([id, item]) => id.startsWith('core_') && item.type === tipo).map(([, item]) => item);
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
  // Acessórios e hardware: os slots que a loja mostra (os do CORE e os três Rebuilds do Mission Kit).
  const upgrades = loja.filter(item => item.acessorio || item.hardware);
  assert.equal(upgrades.length, 35);
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
  // A wiki de 2026-10-17 (C29): o Mission Kit e o que a revisão do suplemento de fã deixou (eram 157 antes).
  assert.equal(loja.length, 112, 'o Mission Kit e o suplemento de fã revisado');
  // E o catálogo de 2077 é a loja e mais os quickhacks, que não se compram (o teste do Mission Kit, abaixo).
  const naLoja = new Set(loja.map(item => item.id));
  const sobra = Object.keys(catalogo).filter(chave => /^(armas|cyberware|netrunning)-2077:/.test(chave) && !naLoja.has(chave));
  assert.deepEqual(sobra.filter(chave => catalogo[chave].system?.classe !== 'quickhack'), [], 'o catálogo de 2077 fora da loja');
  assert.equal(sobra.length, 16, 'os 16 quickhacks');
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
      // Os decks com marca não têm RAM desde a revisão da wiki de 2026-10-16 (a loja: null); o sistema guarda 0, que a
      // ficha não mostra.
      igual('deck', [s.slots, s.ram], [item.deck.slots, item.deck.ram ?? 0]);
    } else if (item.programa) {
      igual('tamanho', s.tamanho, item.programa.tamanho);
      if (s.classe === 'daemon') igual('REZ do daemon', s.rez, item.programa.rez);
    }
  }
});

test('Loja inteira: o que a loja da wiki vende e o sistema ainda não tem é só o Black Chrome (pendente no ROADMAP)', () => {
  const faltam = Array.from(daWiki('loja-catalogo.js', 'shopCatalog').itens).filter(item => !catalogo[item.id]);
  const foraDoBlackChrome = faltam.filter(item => !Array.from(item.tags || []).includes('blackchrome')).map(item => item.id);
  assert.deepEqual(foraDoBlackChrome, [], 'itens fora do Black Chrome que o importador recusaria');
});

test('Mission Kit: o Neuroport é base, os Rebuilds ocupam 2 slots, a munição Smart melhorada é Smart e os quickhacks do Kit não se compram', () => {
  const s = id => catalogo[id]?.system;
  assert.deepEqual([s('cyberware-2077:neuroport').fundacional, s('cyberware-2077:neuroport').tipo, s('cyberware-2077:neuroport').perdaHumanidade.formula], [true, 'neuralWare', '2d6']);
  assert.deepEqual(['power', 'smart', 'tech'].map(c => [s(`armas-2077:${c}-rebuild`).alvo, s(`armas-2077:${c}-rebuild`).tamanho]), [['arma', 2], ['arma', 2], ['arma', 2]]);
  assert.deepEqual([s('armas-2077:smart-melhorada-rifle').efeito, s('armas-2077:smart-melhorada-rifle').quantidade, s('armas-2077:smart-melhorada-granada').preco], ['smart', 10, 500]);
  assert.equal(catalogo['cyberware-2077:immunoblockers']?.type, 'droga');
  const kit = Object.values(catalogo).filter(item => item.system.classe === 'quickhack' && item.system.fonte.livro === 'Cyberpunk Edgerunners Mission Kit');
  assert.ok(kit.length >= 10 && kit.every(item => item.system.preco === 0), `${kit.length} quickhacks do Kit, todos sem preço`);
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

test('Armas de 2077: o perfil pela flag do catálogo (a classe de cada uma; a Smart, a Power e a Tech nos testes delas)', () => {
  // A classe das Tech (a rajada carregada do suplemento saiu com o Kit: o teste do Tech).
  for (const id of ['arasaka-jke-x2-kenshin', 'militech-m-76e-omaha', 'arasaka-senkoh-lx', 'militech-m-179-achilles', 'tsunami-nekomata', 'techtronika-rt-46-burya', 'rostovic-db-2-satara']) assert.equal(perfilDe(`armas-2077:${id}`).classe, 'tech', id);
  // Power: ricocheteia (o Kit, ciclo 114: as de três balas também; a Mk.31 HMG saiu da wiki); a de Disparo Automático,
  // não (o teste do Power).
  assert.equal(perfilDe('armas-2077:constitutional-arms-liberty').ricocheteia, true);
  assert.equal(perfilDe('armas-2077:nokota-d5-copperhead').ricocheteia, true);
  assert.equal(perfilDe('armas-2077:arasaka-nowaki').ricocheteia, true);
  assert.equal(perfilDe('armas-2077:arasaka-hjsh-18-masamune').ricocheteia, true);
  // As armas do livro-base não são de 2077.
  assert.equal(perfilDe('core_weapons:heavy-pistol'), null);
  // Toda arma do catálogo de 2077 tem classe.
  for (const [id, item] of Object.entries(catalogo).filter(([id, item]) => id.startsWith('armas-2077:') && item.type === 'arma')) {
    const p = perfilDe(id);
    assert.ok(p, `${id}: sem perfil de 2077`);
    assert.equal(p.smart, p.classe === 'smart', id);
    assert.ok(item.system.descricao.includes('Neste sistema:'), `${id}: a descrição não diz o que o sistema faz`);
  }
});

test('Power (Mission Kit, p. 31–32, a wiki de 2026-10-17, como o foundry-2077): a lesão crítica causa 10 de dano bônus; o Ricochete dá −4 no ataque (−2 com o Ballistic Coprocessor; no tiro mirado, só a penalidade dele), com o alcance e a DV da arma e o dano de sempre; com cartucho, o leque sai da superfície', () => {
  const de2077 = fs.readFileSync(path.join(raiz, 'system-2077.js'), 'utf8');
  assert.ok(de2077.includes("section('Power', 'Kit p. 31–32', list(['Quando a arma causa uma <b>lesão crítica</b>, o dano bônus da lesão sobe <b>5</b>: 10 em vez de 5.', '<b>Ricochete:</b> você acerta um alvo que sabe onde está, mas que fica atrás de cobertura ou fora da linha de visão, ricocheteando o tiro numa superfície. O ataque tem <b>−4</b>; num <b>tiro mirado</b>, vale só a penalidade do tiro mirado. Precisa de um caminho livre entre o ponto do ricochete e o alvo.', 'O alcance continua sendo a distância entre você e o alvo.', 'Para ricochetear um <b>cartucho</b>, escolha uma superfície a até 6 m de você"));
  assert.ok(de2077.includes("'O Ballistic Coprocessor reduz a penalidade do ricochete para −2.'"));
  // O crítico: 10 na Power, 5 nas outras (e nas do livro-base).
  assert.equal(regras.BONUS_CRITICO_POWER, 10);
  assert.equal(regras.bonusDoCritico(perfilDe('armas-2077:constitutional-arms-liberty')), 10);
  assert.equal(regras.bonusDoCritico(perfilDe('armas-2077:arasaka-hjke-11-yukimura')), 5);
  assert.equal(regras.bonusDoCritico(null), regras.BONUS_CRITICO);
  // A penalidade: −4; −2 com o coprocessador; no mirado, só o −8 dele.
  assert.deepEqual([regras.PENALIDADE_RICOCHETE, regras.PENALIDADE_RICOCHETE_COM_COPROCESSADOR], [-4, -2]);
  assert.equal(regras.penalidadeDoRicochete(), -4);
  assert.equal(regras.penalidadeDoRicochete({ coprocessador: true }), -2);
  assert.equal(regras.penalidadeDoRicochete({ mirado: true }), 0);
  assert.equal(regras.penalidadeDoRicochete({ mirado: true, coprocessador: true }), 0);
  // O alcance e a DV: a tabela da arma, como o tiro (saíram a tabela de autofogo e o dado a menos do suplemento).
  assert.equal(regras.classificar({ pedido: 'ricochete' }), 'ricochete');
  assert.equal(regras.balasDoModo('ricochete'), 1);
  assert.deepEqual(regras.tabelasCandidatas('DV Pistol', 'ricochete'), ['DV Pistol']);
  assert.deepEqual(regras.tabelasCandidatas('DV Assault Rifle', 'ricochete'), regras.tabelasCandidatas('DV Assault Rifle', 'tiro'));
  assert.equal(regras.dvPelaDistancia(TABELAS_DV['DV Pistol'], 10).dv, linhaDaWiki('pistol').dv[1]);
  assert.equal(regras.tabelaDoRicochete, undefined);
  assert.equal(regras.umDadoAMenos, undefined);
  assert.equal(regras.BONUS_COPROCESSADOR, undefined);
  // A descrição: o tiro é o modo Ricochete; o mirado e o cartucho dizem o ricochete.
  assert.equal(regras.descreverAtaque({ modo: 'ricochete' }), 'Ricochete');
  assert.equal(regras.descreverAtaque({ modo: 'ricochete', local: 'cabeca', ricochete: { penalidade: 0 } }), 'Tiro mirado na cabeça, ricochete');
  assert.equal(regras.descreverAtaque({ modo: 'cartucho', ricochete: { penalidade: -4, cartucho: true } }), 'Espingarda com cartucho, ricochete');
  // Quem ricocheteia: toda Power de longo alcance do catálogo (as de três balas e as de cartucho também); a de Disparo
  // Automático e a corpo a corpo, não; as Smart e as Tech, não.
  const armas = Object.entries(catalogo).filter(([id, item]) => id.startsWith('armas-2077:') && item.type === 'arma');
  for (const [id] of armas) assert.equal(perfilDe(id).ricocheteia, perfilDe(id).classe === 'power', id);
  assert.equal(armas.filter(([id]) => perfilDe(id).classe === 'power').length, 25);
  assert.equal(regras.perfil2077({ classe: 'power' }, { pericia: 'autofire' }).ricocheteia, false);
  assert.equal(regras.perfil2077({ classe: 'power' }, { aDistancia: false }).ricocheteia, false);
  // O aviso, antes de gastar a bala.
  const liberty = perfilDe('armas-2077:constitutional-arms-liberty');
  assert.equal(regras.impedimento2077({ modo: 'ricochete', perfil: liberty }), null);
  assert.equal(regras.impedimento2077({ modo: 'ricochete', perfil: perfilDe('armas-2077:arasaka-nowaki') }), null);
  assert.equal(regras.impedimento2077({ modo: 'cartucho', pedido: 'ricochete', perfil: perfilDe('armas-2077:rostovic-db-4-igla'), pelaMunicao: 'cartucho' }), null);
  assert.match(regras.impedimento2077({ modo: 'ricochete', perfil: liberty, pelaMunicao: 'explosivo' }), /explosivo, não/);
  assert.equal(regras.impedimento2077({ modo: 'ricochete', perfil: perfilDe('armas-2077:arasaka-jke-x2-kenshin') }), 'só as armas Power de longo alcance ricocheteiam.');
  assert.equal(regras.impedimento2077({ modo: 'ricochete', perfil: null }), 'só as armas Power de longo alcance ricocheteiam.');
  // O texto "Neste sistema" das Power.
  assert.match(catalogo['armas-2077:constitutional-arms-liberty'].system.descricao, /o botão Ricochete \(−4 no ataque, −2 com o Ballistic Coprocessor/);
  for (const [id, item] of armas) assert.equal('semRicochete' in item.flags['cpr-fieldbook'].arma2077, false, id);
});

test('Tech (Mission Kit, p. 32, a wiki de 2026-10-17, como o foundry-2077): carregar gasta a Ação de Movimento e dura até disparar ou 20 rodadas; carregada, o próximo ataque que não seja explosivo é de CDT 1, atravessa cobertura fina e ignora metade do SP (arredondada para cima); saíram a carga e a rajada do suplemento', () => {
  const de2077 = fs.readFileSync(path.join(raiz, 'system-2077.js'), 'utf8');
  assert.ok(de2077.includes("section('Tech', 'Kit p. 32', list(['A mira vê o <b>contorno dos alvos</b> através de cobertura fina.', '<b>Carregar:</b> você gasta a <b>Ação de Movimento</b>, e a arma fica carregada até disparar ou por 60 segundos (20 rodadas).', 'Carregada, o <b>próximo ataque</b> que não seja explosivo é de <b>CDT 1</b>, atravessa <b>cobertura fina</b> e <b>ignora metade do SP</b> do alvo (arredondado para cima). A cobertura atravessada não perde HP"));
  assert.deepEqual(regras.CARGA_TECH, { rodadas: 20, ignorarPct: 50 });
  // A metade do SP, arredondada para cima (a conta do aplicarDano): SP 11 conta 6; 10, 5; 7, 4; 1, 1.
  for (const [sp, conta] of [[11, 6], [10, 5], [7, 4], [1, 1]]) assert.equal(regras.aplicarDano({ dano: 20, sp, ignorarPct: regras.CARGA_TECH.ignorarPct }).spEfetivo, conta, String(sp));
  // A carga vale no mesmo combate até 20 rodadas depois; fora dele, até disparar.
  assert.equal(regras.cargaValida(null, null), false);
  assert.equal(regras.cargaValida({ combate: null, rodada: null }, null), true);
  assert.equal(regras.cargaValida({ combate: null, rodada: null }, { id: 'c1', rodada: 5 }), true);
  assert.equal(regras.cargaValida({ combate: 'c1', rodada: 1 }, { id: 'c1', rodada: 20 }), true);
  assert.equal(regras.cargaValida({ combate: 'c1', rodada: 1 }, { id: 'c1', rodada: 21 }), false);
  assert.equal(regras.cargaValida({ combate: 'c1', rodada: 1 }, { id: 'c2', rodada: 30 }), true);
  assert.equal(regras.cargaValida({ combate: 'c1', rodada: 1 }, null), true);
  // O ataque que gasta a carga: o tiro (e o mirado), o autofogo, o cartucho; o explosivo e o fogo supressivo, não.
  for (const modo of ['tiro', 'autofogo', 'cartucho']) assert.equal(regras.gastaACarga(modo), true, modo);
  for (const modo of ['explosivo', 'supressivo']) assert.equal(regras.gastaACarga(modo), false, modo);
  assert.equal(regras.descreverAtaque({ modo: 'tiro', carga: { combate: null, rodada: null } }), 'Tiro, carregado');
  assert.equal(regras.descreverAtaque({ modo: 'tiro', local: 'cabeca', carga: { combate: null, rodada: null } }), 'Tiro mirado na cabeça, carregado');
  // Saíram a carga e a rajada do suplemento: a cobertura que segurava parte do dano, a ablação de 4 e 2, o esfriar e a
  // tabela da rajada; os modos "carga" e "rajadaTech" e as flags da rajada no catálogo.
  for (const nome of ['COBERTURAS', 'atravessarCobertura', 'rodadaDaProximaCarga', 'TABELA_DA_RAJADA_TECH']) assert.equal(regras[nome], undefined, nome);
  assert.equal(regras.MODOS.carga, undefined);
  assert.equal(regras.MODOS.rajadaTech, undefined);
  assert.equal(regras.classificar({ pedido: 'carga' }), 'tiro');
  const armas = Object.entries(catalogo).filter(([id, item]) => id.startsWith('armas-2077:') && item.type === 'arma');
  const tech = armas.filter(([id]) => perfilDe(id).classe === 'tech').map(([id]) => id.replace('armas-2077:', ''));
  assert.deepEqual(tech.sort(), ['arasaka-jke-x2-kenshin', 'arasaka-senkoh-lx', 'militech-m-179-achilles', 'militech-m-76e-omaha', 'rostovic-db-2-satara', 'techtronika-rt-46-burya', 'tsunami-nekomata']);
  for (const [id, item] of armas) {
    assert.deepEqual(['techRajada', 'techBalas'].filter(chave => chave in item.flags['cpr-fieldbook'].arma2077), [], id);
    assert.equal('rajadaTech' in perfilDe(id), false, id);
  }
  assert.match(catalogo['armas-2077:arasaka-jke-x2-kenshin'].system.descricao, /o botão Carregar \(a Ação de Movimento; a carga fica até disparar ou por 20 rodadas\)/);
});

test('Smart (Mission Kit, a wiki de 2026-10-17): só dispara ligada pelo Personal Link (o do Neuroport) ou pelo Subdermal Grip; +1 nos ataques à distância; sem o teste Smart do suplemento; o Smart Link antigo vale o Subdermal Grip', () => {
  const de2077 = fs.readFileSync(path.join(raiz, 'system-2077.js'), 'utf8');
  assert.ok(de2077.includes("section('Smart', 'Kit p. 32', list(['A arma precisa estar <b>conectada</b> a você por um <b>Personal Link</b> (o Interface Plug que vem no Neuroport) ou por um <b>Subdermal Grip</b>. Sem conexão, não dispara.', '<b>+1</b> nos ataques à distância com a arma.'"));
  assert.ok(de2077.includes('o <b>Smart Link</b> (o Subdermal Grip)'));
  assert.ok(fs.readFileSync(path.join(raiz, 'system-rules.js'), 'utf8').includes('que já traz o Neural Link, o Personal Link (os Plugs de Interface)'));
  assert.equal(regras.BONUS_SMART, 1);
  assert.equal(regras.testeSmart, undefined, 'saiu o teste Smart do suplemento');
  const yukimura = perfilDe('armas-2077:arasaka-hjke-11-yukimura');
  assert.equal(yukimura.smart, true);
  assert.equal(perfilDe('armas-2077:constitutional-arms-liberty').smart, false);
  // Sem a ligação, não dispara (em qualquer modo); com ela, sim. A arma que não é Smart não pede ligação.
  assert.match(regras.impedimento2077({ modo: 'tiro', perfil: yukimura }), /só dispara ligada pelo Personal Link \(o Interface Plug do Neuroport\) ou pelo Subdermal Grip/);
  assert.match(regras.impedimento2077({ modo: 'autofogo', perfil: perfilDe('armas-2077:arasaka-tki-20-shingen') }), /Personal Link/);
  assert.equal(regras.impedimento2077({ modo: 'tiro', perfil: yukimura, ligadaSmart: true }), null);
  assert.equal(regras.impedimento2077({ modo: 'tiro', perfil: perfilDe('armas-2077:constitutional-arms-liberty') }), null);
  assert.equal(regras.descreverAtaque({ modo: 'tiro' }), 'Tiro');
  // A ligação: pelo id do catálogo ou pelo nome. O Smartgun Link do livro-base é um acessório de arma, não a ligação.
  for (const id of ['cyberware-2077:neuroport', 'core_cyberware:interface-plugs', 'core_cyberware:subdermal-grip']) assert.equal(regras.ehLigacaoSmart(catalogo[id].name), true, id);
  assert.equal(regras.ehLigacaoSmart('Os plugs da Vee', 'core_cyberware:interface-plugs'), true);
  assert.equal(regras.ehLigacaoSmart('Smart Link'), true, 'o de antes vale o Subdermal Grip');
  assert.equal(regras.ehLigacaoSmart('O link da Vee', 'cyberware-2077:smart-link'), true);
  assert.equal(regras.ehLigacaoSmart('Smartgun Link'), false);
  assert.equal(regras.ehLigacaoSmart('Kiroshi Optics'), false);
  assert.equal(catalogo['cyberware-2077:smart-link'], undefined, 'o Smart Link saiu do catálogo');
  assert.equal(regras.ehCoprocessador(catalogo['cyberware-2077:ballistic-coprocessor'].name), true);
  assert.equal(regras.ehCoprocessador('Smart Link'), false);
  // Os dois canos (a Palica, Smart, e a Testera, Power) sobem o dano para 4d6, e os dois alvos são da Kappa.
  assert.ok(de2077.includes('Disparar os <b>dois canos</b> de uma vez gasta os 2 cartuchos e o dano sobe para <b>4d6</b>.'));
  assert.ok(de2077.includes('Trava em <b>dois alvos</b> a até 4 m um do outro: se o ataque errar o primeiro, as balas Smart vão para o segundo.'));
  assert.deepEqual(perfilDe('armas-2077:rostovic-db-4-palica').doisCanos, { dano: '4d6' });
  assert.deepEqual(perfilDe('armas-2077:rostovic-db-2-testera').doisCanos, { dano: '4d6' });
  assert.equal(perfilDe('armas-2077:tsunami-kappa').doisAlvos, true);
  assert.equal(yukimura.doisAlvos, false);
  // Nenhuma arma do catálogo de 2077 guarda as flags do teste Smart do suplemento.
  for (const [id, item] of Object.entries(catalogo).filter(([id, item]) => id.startsWith('armas-2077:') && item.type === 'arma')) {
    const flag = item.flags['cpr-fieldbook'].arma2077;
    assert.deepEqual(['smartVariasBalas', 'smartDoisAlvos', 'smartDoisCanos'].filter(chave => chave in flag), [], id);
  }
});

test('Munição Smart melhorada (Mission Kit, p. 32): só na arma Smart; sem as penalidades de visão; errou a DV por 5 ou menos, a segunda chance com 14 + 1d10 no lugar de STAT + perícia + bônus, com as penalidades do primeiro tiro', () => {
  const de2077 = fs.readFileSync(path.join(raiz, 'system-2077.js'), 'utf8');
  assert.ok(de2077.includes("'Só funciona em arma Smart; uma arma com Smartgun Link não conta.', 'Ignora as penalidades de escuridão, fumaça, neblina e de qualquer outra coisa que atrapalhe a visão.', '<b>Segunda chance:</b> se o ataque à distância errar a DV por <b>5 ou menos</b>, você tenta de novo na hora, com <b>14 + 1d10</b> (dá para somar Sorte) no lugar de STAT + perícia + bônus, contra a mesma DV. As penalidades do primeiro tiro continuam valendo.'"));
  assert.ok(de2077.includes('Aceita a <b>munição Smart melhorada</b> dos tipos que dispara. Com outra munição, fica só o +1.'));
  assert.deepEqual(regras.SEGUNDA_CHANCE, { base: 14, margem: 5 });
  // Só na arma Smart, e só com a melhorada (a Smart do CORE não tem a flag).
  const melhorada = catalogo['armas-2077:smart-melhorada-pistola-media'].flags['cpr-fieldbook'].arma2077;
  const doCore = catalogo['core_ammo:medium-pistol-smart'].flags['cpr-fieldbook'].arma2077;
  const yukimura = perfilDe('armas-2077:arasaka-hjke-11-yukimura');
  assert.equal(regras.smartMelhoradaVale({ perfil: yukimura, municao: melhorada }), true);
  assert.equal(regras.smartMelhoradaVale({ perfil: yukimura, municao: doCore }), false);
  assert.equal(regras.smartMelhoradaVale({ perfil: perfilDe('armas-2077:constitutional-arms-liberty'), municao: melhorada }), false);
  assert.equal(regras.smartMelhoradaVale({ perfil: null, municao: melhorada }), false, 'uma arma comum (a do Smartgun Link) não conta');
  // As penalidades de visão: as dos modificadores comuns que falam de luz, fumaça e escuridão; as outras ficam.
  assert.deepEqual(regras.MODIFICADORES_COMUNS.filter(regras.ehPenalidadeDeVisao).map(m => [m.id, m.valor]), [['pouca-luz', -1], ['encoberta', -4]]);
  assert.equal(regras.ehPenalidadeDeVisao({ rotulo: 'Exausto', valor: -4 }), false);
  // Errou por 5 ou menos (a DV, ou a esquiva que faz as vezes dela): 10 contra 15, sim; 9, não; o empate (15) também.
  assert.equal(regras.cabeSegundaChance({ ataque: 10, contra: 15 }), true);
  assert.equal(regras.cabeSegundaChance({ ataque: 15, contra: 15 }), true);
  assert.equal(regras.cabeSegundaChance({ ataque: 9, contra: 15 }), false);
  assert.equal(regras.cabeSegundaChance({ ataque: 16, contra: 15 }), false, 'acertou');
  assert.equal(regras.cabeSegundaChance({ ataque: 10, contra: null }), false, 'sem DV, o mestre decide');
  // A segunda chance: 14 no lugar de REF + perícia + os bônus (a arma, a Smart, a luneta), com as penalidades (o mirado,
  // a coronha, as lesões, o modificador do mestre).
  const primeiro = [{ rotulo: 'REF', valor: 8 }, { rotulo: 'Armas de uma Mão', valor: 4 }, { rotulo: 'Arma', valor: 1 }, { rotulo: 'Arma Smart', valor: 1 }, { rotulo: 'Mirado', valor: -8 }, { rotulo: 'Lesões', valor: -2 }];
  assert.deepEqual(regras.partesDaSegundaChance(primeiro), [{ rotulo: 'Segunda chance', valor: 14 }, { rotulo: 'Mirado', valor: -8 }, { rotulo: 'Lesões', valor: -2 }]);
  assert.deepEqual(regras.partesDaSegundaChance(), [{ rotulo: 'Segunda chance', valor: 14 }]);
  // As 9 munições do Kit dizem o que o sistema faz, e a regra da wiki.
  const doKit = Object.entries(catalogo).filter(([, item]) => item.flags['cpr-fieldbook']?.arma2077?.smartMelhorada);
  assert.equal(doKit.length, 9);
  for (const [id, item] of doKit) {
    assert.match(item.system.descricao, /Neste sistema:<\/b> numa arma Smart ligada, as penalidades de visão da janela de rolagem/, id);
    assert.ok(!item.system.descricao.includes('ainda não está automatizada'), id);
  }
});

test('Balas por tiro (a wiki de 2026-10-17, como o foundry-2077): o tiro único das Smart de três balas e da Masamune e da Nowaki gasta 3 (com menos, dispara o que tem e causa o dano menor); a Zhuo gasta 8 cartuchos Smart melhorados e não dispara com menos', () => {
  const de2077 = fs.readFileSync(path.join(raiz, 'system-2077.js'), 'utf8');
  assert.ok(de2077.includes('No <b>tiro único</b>, gasta <b>3 balas</b> e causa <b>3d6</b>; com menos de 3 no pente, dispara o que tem e causa 2d6. O autofogo (×3) gasta 10 balas.'), 'Yukimura');
  assert.ok(de2077.includes('no tiro único gasta <b>3 balas</b> e causa 5d6 (com menos de 3, esvazia e causa 4d6)'), 'Nowaki');
  assert.ok(de2077.includes('<b>Só aceita cartucho Smart melhorado</b> e gasta <b>8 cartuchos por ataque</b>; com menos de 8, a trava de segurança não deixa disparar. Pelo tanto de munição, causa <b>4d6</b> em vez dos 3d6 do cartucho.'), 'Zhuo');
  const tres = { 'kang-tao-a-22b-chao': '2d6', 'tsunami-kappa': '2d6', 'arasaka-hjke-11-yukimura': '2d6', 'arasaka-tki-20-shingen': '2d6', 'arasaka-nowaki': '4d6', 'arasaka-hjsh-18-masamune': '4d6' };
  for (const [id, menos] of Object.entries(tres)) {
    const p = perfilDe(`armas-2077:${id}`);
    assert.deepEqual([p.balasPorTiro, p.danoComMenos, p.minimoDeBalas, p.danoFixo, p.soSmartMelhorada], [3, menos, 0, null, false], id);
  }
  const zhuo = perfilDe('armas-2077:kang-tao-l-69-zhuo');
  assert.deepEqual([zhuo.balasPorTiro, zhuo.danoComMenos, zhuo.minimoDeBalas, zhuo.danoFixo, zhuo.soSmartMelhorada], [8, null, 8, '4d6', true]);
  // As outras de 2077 gastam o de sempre.
  const liberty = perfilDe('armas-2077:constitutional-arms-liberty');
  assert.equal(liberty.balasPorTiro, 1);
  assert.equal(regras.balasPorTiro({ modo: 'tiro', perfil: liberty, pente: 12 }), null);
  // O tiro único (o tiro e o mirado, o ricochete, o cartucho): 3 balas; com 2 ou 1 no pente, dispara o que tem e causa o
  // dano menor; vazio, 1 (o "pente vazio" de sempre).
  const yukimura = perfilDe('armas-2077:arasaka-hjke-11-yukimura');
  assert.deepEqual(regras.balasPorTiro({ modo: 'tiro', perfil: yukimura, pente: 30 }), { balas: 3, danoComMenos: null });
  assert.deepEqual(regras.balasPorTiro({ modo: 'tiro', perfil: yukimura, pente: 3 }), { balas: 3, danoComMenos: null });
  assert.deepEqual(regras.balasPorTiro({ modo: 'tiro', perfil: yukimura, pente: 2 }), { balas: 2, danoComMenos: '2d6' });
  assert.deepEqual(regras.balasPorTiro({ modo: 'tiro', perfil: yukimura, pente: 1 }), { balas: 1, danoComMenos: '2d6' });
  assert.deepEqual(regras.balasPorTiro({ modo: 'tiro', perfil: yukimura, pente: 0 }), { balas: 1, danoComMenos: '2d6' });
  assert.deepEqual(regras.MODOS_DE_TIRO_UNICO, ['tiro', 'ricochete', 'cartucho']);
  // O autofogo e o fogo supressivo gastam os 10 de sempre, e os dois canos, os 2 cartuchos.
  for (const modo of ['autofogo', 'supressivo', 'explosivo']) assert.equal(regras.balasPorTiro({ modo, perfil: yukimura, pente: 30 }), null, modo);
  assert.equal(regras.balasPorTiro({ modo: 'cartucho', perfil: yukimura, pente: 30, doisCanos: true }), null);
  // A Zhuo: 8 cartuchos; com menos de 8, a trava não deixa disparar; só a munição Smart melhorada.
  assert.deepEqual(regras.balasPorTiro({ modo: 'cartucho', perfil: zhuo, pente: 32 }), { balas: 8, danoComMenos: null });
  const ligada = { modo: 'cartucho', perfil: zhuo, ligadaSmart: true };
  assert.equal(regras.impedimento2077({ ...ligada, pente: 7, municao: { smartMelhorada: true } }), 'só dispara com 8 no pente (tem 7): é a trava de segurança.');
  assert.equal(regras.impedimento2077({ ...ligada, pente: 8, municao: { smartMelhorada: false } }), 'só aceita munição Smart melhorada.');
  assert.equal(regras.impedimento2077({ ...ligada, pente: 8, municao: { smartMelhorada: true } }), null);
  assert.equal(regras.impedimento2077({ modo: 'tiro', perfil: yukimura, ligadaSmart: true, pente: 1, municao: { smartMelhorada: false } }), null, 'a Yukimura não tem trava nem munição própria');
  // O texto "Neste sistema" das nove.
  for (const id of [...Object.keys(tres), 'kang-tao-l-69-zhuo']) assert.match(catalogo[`armas-2077:${id}`].system.descricao, /O tiro único gasta (3 balas|8 cartuchos)/, id);
  assert.match(catalogo['armas-2077:kang-tao-l-69-zhuo'].system.descricao, /O tiro único gasta 8 cartuchos \(com menos de 8 no pente, não dispara\) e causa 4d6\. Só carrega a munição Smart melhorada\./);
});

test('Regras de cada modelo do Kit (a wiki de 2026-10-17, como o foundry-2077): o tiro mirado da Unity (4d6), a lesão de quem dispara a Carnage sem BODY 10 e a Burya sem cromo no braço, o ferrolho da Grad e a carga da Burya, da Omaha e da Nekomata', () => {
  const de2077 = fs.readFileSync(path.join(raiz, 'system-2077.js'), 'utf8');
  for (const trecho of [
    'No <b>tiro mirado</b>, o dano sobe para <b>4d6</b>.',
    'Quem dispara sem <b>BODY 10</b> ou mais sofre a lesão crítica <b>Músculo Rompido</b> (se ainda não tiver).',
    'Carrega <b>sem gastar a Ação de Movimento</b>. Quem dispara sem <b>Grafted Muscle and Bone Lace</b> ou um <b>cyberbraço</b> sofre a lesão crítica <b>Braço Quebrado</b> (se ainda não tiver).',
    'Depois de cada disparo, é preciso <b>uma Ação para manejar o ferrolho</b> antes de atirar de novo.',
    '<b>Carregado</b>, vê o contorno dos alvos e atira através de cobertura <b>fina e grossa</b>.',
    '<b>Carregada</b>, fica assim até o fim do turno em que disparou, continua com <b>CDT 2</b> e gasta até <b>3 balas</b> por ataque (com menos de 3 no pente, esvazia).'
  ]) assert.ok(de2077.includes(trecho), trecho);
  // O perfil de cada uma.
  const unity = perfilDe('armas-2077:constitutional-arms-unity');
  const carnage = perfilDe('armas-2077:budget-arms-carnage');
  const burya = perfilDe('armas-2077:techtronika-rt-46-burya');
  const grad = perfilDe('armas-2077:techtronika-spt32-grad');
  const nekomata = perfilDe('armas-2077:tsunami-nekomata');
  const omaha = perfilDe('armas-2077:militech-m-76e-omaha');
  assert.equal(unity.danoMirado, '4d6');
  assert.deepEqual([carnage.exigeBody, carnage.lesao], [10, 'Torn Muscle']);
  assert.deepEqual([burya.lesaoSemCromo, burya.cargaSemMovimento], ['Broken Arm', true]);
  assert.equal(grad.ferrolho, true);
  assert.equal(nekomata.cargaGrossa, true);
  assert.deepEqual([omaha.cargaAteFimDoTurno, omaha.balasNaCarga, omaha.cdtNaCarga], [true, 3, 2]);
  const kenshin = perfilDe('armas-2077:arasaka-jke-x2-kenshin');
  assert.deepEqual([kenshin.danoMirado, kenshin.exigeBody, kenshin.ferrolho, kenshin.cargaGrossa, kenshin.cargaAteFimDoTurno, kenshin.balasNaCarga], [null, 0, false, false, false, 0]);
  // A lesão de quem dispara: a do catálogo do CORE, se ainda não tem.
  assert.equal(catalogo[regras.idDaLesao2077('Torn Muscle')].name, 'Músculo rompido');
  assert.equal(catalogo[regras.idDaLesao2077('Broken Arm')].name, 'Braço quebrado');
  assert.deepEqual(regras.lesoesDoAtirador({ perfil: carnage, body: 6 }), [{ id: 'core_critical-injuries-body:torn-muscle', nome: 'Músculo rompido', motivo: 'tem BODY 6 (a arma pede 10)' }]);
  assert.deepEqual(regras.lesoesDoAtirador({ perfil: carnage, body: 10 }), []);
  assert.deepEqual(regras.lesoesDoAtirador({ perfil: carnage, body: 6, tem: ['core_critical-injuries-body:torn-muscle'] }), []);
  assert.deepEqual(regras.lesoesDoAtirador({ perfil: burya, body: 6 }), [{ id: 'core_critical-injuries-body:broken-arm', nome: 'Braço quebrado', motivo: 'não tem Grafted Muscle and Bone Lace nem cyberbraço' }]);
  assert.deepEqual(regras.lesoesDoAtirador({ perfil: burya, body: 6, cromo: true }), []);
  assert.deepEqual(regras.lesoesDoAtirador({ perfil: unity, body: 2 }), []);
  // O cromo que aguenta a Burya: o Grafted Muscle and Bone Lace ou o cyberbraço (a fundação).
  const cromo = id => regras.ehCromoNoBraco({ nome: catalogo[id].name, catalogo: id, tipo: catalogo[id].system.tipo, fundacional: catalogo[id].system.fundacional });
  assert.equal(cromo('core_cyberware:grafted-muscle-and-bone-lace'), true);
  assert.equal(cromo('core_cyberware:cyberarm'), true);
  assert.equal(cromo('core_cyberware:subdermal-grip'), false);
  // O cyberbraço de outro nome conta pela fundação; uma opção do braço, não.
  assert.equal(regras.ehCromoNoBraco({ nome: 'Braço da Vee', tipo: 'cyberArm', fundacional: true }), true);
  assert.equal(regras.ehCromoNoBraco({ nome: 'Popup Shield', tipo: 'cyberArm', fundacional: false }), false);
  // O ferrolho: com ele pendente, a Grad não dispara.
  assert.equal(regras.impedimento2077({ modo: 'tiro', perfil: grad, ferrolhoPendente: true }), 'gaste uma Ação para manejar o ferrolho antes de atirar de novo (o botão "Manejar o ferrolho").');
  assert.equal(regras.impedimento2077({ modo: 'tiro', perfil: grad }), null);
  assert.equal(regras.impedimento2077({ modo: 'tiro', perfil: unity, ferrolhoPendente: true }), null);
  // A carga da Omaha: depois do tiro, vale até o fim daquele turno; fora do combate, acaba no tiro. Até 3 balas por ataque.
  const carregou = { combate: 'c1', rodada: 1 };
  const disparou = { ...carregou, disparou: { rodada: 2, turno: 1 } };
  assert.equal(regras.cargaValida(disparou, { id: 'c1', rodada: 2, turno: 1 }), true);
  assert.equal(regras.cargaValida(disparou, { id: 'c1', rodada: 2, turno: 2 }), false);
  assert.equal(regras.cargaValida(disparou, { id: 'c1', rodada: 3, turno: 1 }), false);
  assert.equal(regras.cargaValida({ combate: null, rodada: null, disparou: { rodada: null, turno: null } }, null), false);
  assert.equal(regras.balasDaCarga({ modo: 'tiro', perfil: omaha, pente: 9 }), 3);
  assert.equal(regras.balasDaCarga({ modo: 'tiro', perfil: omaha, pente: 2 }), 2);
  assert.equal(regras.balasDaCarga({ modo: 'autofogo', perfil: omaha, pente: 9 }), null);
  assert.equal(regras.balasDaCarga({ modo: 'tiro', perfil: kenshin, pente: 9 }), null);
  // O que a carga atravessa: a Nekomata, a grossa também.
  assert.equal(regras.coberturaDaCarga(kenshin), 'cobertura fina');
  assert.equal(regras.coberturaDaCarga(nekomata), 'cobertura fina e grossa');
  // O texto "Neste sistema" de cada uma.
  const neste = id => catalogo[`armas-2077:${id}`].system.descricao;
  assert.match(neste('constitutional-arms-unity'), /No tiro mirado, o dano é 4d6\./);
  assert.match(neste('budget-arms-carnage'), /Quem dispara com BODY menor que 10 sofre a lesão crítica Músculo rompido/);
  assert.match(neste('techtronika-rt-46-burya'), /O botão Carregar não gasta a Ação de Movimento\. .*Quem dispara sem Grafted Muscle and Bone Lace nem cyberbraço sofre a lesão crítica Braço quebrado|Quem dispara sem Grafted Muscle and Bone Lace nem cyberbraço sofre a lesão crítica Braço quebrado.*O botão Carregar não gasta a Ação de Movimento/);
  assert.match(neste('techtronika-spt32-grad'), /o botão "Manejar o ferrolho" \(uma Ação\) libera o próximo/);
  assert.match(neste('tsunami-nekomata'), /Carregada, atravessa cobertura fina e grossa\./);
  assert.match(neste('militech-m-76e-omaha'), /Carregada, fica até o fim do turno em que disparou, com CDT 2 e até 3 balas por ataque\./);
});

test('Armas de 2077, regras de cada modelo (o texto de cada arma na wiki): os dois canos da Palica e da Testera (4d6), os dois alvos da Kappa, a coronha da Dian e a Lexington do Kit, sem autofogo', () => {
  // "Disparar os dois canos de uma vez gasta os 2 cartuchos e o dano sobe para 4d6" (Palica, desde o Kit; antes, o teste
  // Smart subia para 12 + 1d10); "dá para disparar os dois de uma vez, e o dano sobe para 4d6" (Testera); "trava em dois
  // alvos a até 4 m um do outro" (Kappa); "os ataques têm −1 até estendê-la" (Dian). A Lexington do Kit não tem regra
  // própria nem autofogo (o suplemento dava "autofogo (2) gastando só 7 balas por ataque").
  const palica = perfilDe('armas-2077:rostovic-db-4-palica');
  const testera = perfilDe('armas-2077:rostovic-db-2-testera');
  assert.deepEqual(palica.doisCanos, { dano: '4d6' });
  assert.deepEqual(testera.doisCanos, { dano: '4d6' });
  assert.equal(perfilDe('armas-2077:rostovic-db-4-igla').doisCanos, null);
  assert.equal(perfilDe('armas-2077:rostovic-db-2-satara').doisCanos, null);
  assert.equal(perfilDe('armas-2077:tsunami-kappa').doisAlvos, true);
  assert.equal(perfilDe('armas-2077:arasaka-hjke-11-yukimura').doisAlvos, false);
  assert.equal(perfilDe('armas-2077:kang-tao-g-58-dian').coronhaRetratil, true);
  // A coronha dobrável da Ajax e da Sidewinder só esconde: sem −1 no texto.
  assert.equal(perfilDe('armas-2077:militech-m251s-ajax').coronhaRetratil, false);
  assert.equal(perfilDe('armas-2077:nokota-d5-sidewinder').coronhaRetratil, false);
  assert.equal(regras.PENALIDADE_CORONHA, -1);
  assert.ok(fs.readFileSync(path.join(raiz, 'system-2077.js'), 'utf8').includes("weapon('Militech M-10AF Lexington', 'Pistola pesada Power, exótica', 'padrão', 'Armas de uma Mão', '3d6', '21 (pistola pesada)', 2, 1, 'Sim', '1.000eb', '—'"));
  assert.equal(catalogo['armas-2077:militech-m-10af-lexington'].system.autofogo, 0);
  assert.equal(perfilDe('armas-2077:militech-m-10af-lexington').balasDoAutofogo, regras.BALAS_RAJADA);
  assert.equal(perfilDe('armas-2077:nokota-d5-copperhead').balasDoAutofogo, regras.BALAS_RAJADA);
  // O cartucho também ricocheteia (o Kit: "para ricochetear um cartucho, escolha uma superfície a até 6 m de você").
  assert.equal(testera.ricocheteia, true);
  assert.equal(perfilDe('armas-2077:rostovic-db-4-igla').ricocheteia, true);
  assert.equal(perfilDe('armas-2077:budget-arms-carnage').ricocheteia, true);
  // Os dois canos: 2 cartuchos; a Palica, como toda arma Smart, só dispara ligada.
  assert.equal(regras.balasDoModo('cartucho', { doisCanos: true }), 2);
  assert.equal(regras.balasDoModo('autofogo', { autofogo: 7 }), 7);
  assert.equal(regras.balasDoModo('autofogo'), regras.BALAS_RAJADA);
  assert.equal(regras.impedimento2077({ modo: 'cartucho', perfil: testera, pedido: 'doisCanos', pelaMunicao: 'cartucho' }), null);
  assert.equal(regras.impedimento2077({ modo: 'cartucho', perfil: palica, pedido: 'doisCanos', pelaMunicao: 'cartucho', ligadaSmart: true }), null);
  assert.match(regras.impedimento2077({ modo: 'cartucho', perfil: palica, pedido: 'doisCanos', pelaMunicao: 'cartucho' }), /só dispara ligada/);
  assert.match(regras.impedimento2077({ modo: 'cartucho', perfil: perfilDe('armas-2077:rostovic-db-4-igla'), pedido: 'doisCanos' }), /não dispara os dois canos/);
  assert.match(regras.impedimento2077({ modo: 'tiro', perfil: null, pedido: 'doisCanos' }), /não dispara os dois canos/);
  assert.equal(regras.descreverAtaque({ modo: 'cartucho', doisCanos: true }), 'Espingarda com cartucho, os dois canos');
  // Os dois alvos: as balas mudam de alvo a até 4 m do primeiro (meio metro de folga para a grade).
  assert.equal(regras.ALCANCE_DOS_DOIS_ALVOS, 4);
  assert.equal(regras.mudaDeAlvo(2), true);
  assert.equal(regras.mudaDeAlvo(4.5), true);
  assert.equal(regras.mudaDeAlvo(4.6), false);
  assert.equal(regras.mudaDeAlvo(null), false);
});

// ---------------- Ficha ----------------
test('Duas Roles (a wiki de 2026-10-17, "Duas Roles na criação", regra da mesa; o personagem-roles.js da wiki): a segunda Role tem o Rank e as habilidades dela, e os derivados das duas valem na ficha (a Interface do Netrunner, o Moto do Nomad, a Consciência de Combate do Solo, as perícias do Medtech)', () => {
  const regrasDaWiki = fs.readFileSync(path.join(raiz, 'system-rules.js'), 'utf8');
  assert.ok(regrasDaWiki.includes("section('Duas Roles na criação', 'regra da mesa', '<p>No criador, escolha a Role principal e, se quiser, uma segunda Role diferente. Combine com o mestre os Ranks de cada uma, de 1 a 10. Cada Role tem suas habilidades e seu Lifepath; a principal define os STATs, as perícias e o único pacote de equipamento e orçamento inicial."));
  // A wiki guarda a segunda na roleSecundaria e manda as duas na lista "roles" do resultado (a principal primeiro).
  const papeis = createRequire(import.meta.url)(path.join(raiz, 'personagem-roles.js'));
  const doc = papeis.normalizar({ role: 'solo', rankRole: 5, habilidades: { 'Initiative Reaction': 3 }, roleSecundaria: { id: 'netrunner', rank: 3 } });
  assert.deepEqual(papeis.lista(doc).map(role => [role.id, role.rank]), [['solo', 5], ['netrunner', 3]]);
  assert.throws(() => papeis.normalizar({ role: 'solo', roleSecundaria: { id: 'solo', rank: 2 } }), /diferente da principal/);
  assert.deepEqual(papeis.lista({ role: 'nomad' }).map(role => [role.id, role.rank]), [['nomad', 4]], 'o personagem antigo: uma Role no Rank 4');
  // Os derivados: o Solo principal e o Netrunner segundo.
  const soloNetrunner = regras.derivadosDasRoles([{ id: 'solo', rank: 5, habilidades: { 'Initiative Reaction': 3, 'Damage Deflection': 2 } }, { id: 'netrunner', rank: 3, habilidades: {} }], HABILIDADES_DE_ROLE);
  assert.equal(soloNetrunner.rankDeInterface, 3);
  assert.deepEqual([soloNetrunner.consciencia.iniciativa, soloNetrunner.consciencia.deflexao], [3, 1]);
  assert.deepEqual(soloNetrunner.bonusDeRole, {});
  // O Netrunner principal e o Solo segundo: a Interface e a Consciência de Combate, ao contrário.
  const netrunnerSolo = regras.derivadosDasRoles([{ id: 'netrunner', rank: 6, habilidades: {} }, { id: 'solo', rank: 2, habilidades: { 'Threat Detection': 2 } }], HABILIDADES_DE_ROLE);
  assert.deepEqual([netrunnerSolo.rankDeInterface, netrunnerSolo.consciencia.percepcao], [6, 2]);
  // O Nomad segundo: o Moto pelo Rank dele; o Medtech segundo: as perícias das especialidades dele.
  const comNomad = regras.derivadosDasRoles([{ id: 'medtech', rank: 4, habilidades: { Surgery: 2, 'Medical Tech (Pharmaceuticals)': 1 } }, { id: 'nomad', rank: 2, habilidades: {} }], HABILIDADES_DE_ROLE);
  assert.deepEqual(comNomad.bonusDeRole['drive-land-vehicle'], { rotulo: 'Moto', valor: 2 });
  assert.deepEqual([comNomad.periciasDeRole['Surgery Skill'], comNomad.periciasDeRole['Medical Tech Skill']], [4, 1]);
  assert.equal(comNomad.rankDeInterface, 0);
  // Uma Role só dá o mesmo de antes (as contas de cada derivado); sem Role, nada.
  const solo = { id: 'solo', rank: 4, habilidades: { 'Precision Attack': 3 } };
  assert.deepEqual(regras.derivadosDasRoles([solo], HABILIDADES_DE_ROLE), {
    consciencia: regras.consciencia(solo.habilidades), bonusDeRole: regras.bonusDeRole({ roleId: 'solo', rank: 4 }),
    periciasDeRole: regras.periciasDerivadas(HABILIDADES_DE_ROLE.solo?.derivadas, solo.habilidades), rankDeInterface: 0
  });
  assert.deepEqual(regras.derivadosDasRoles([], HABILIDADES_DE_ROLE), { consciencia: regras.consciencia({}), bonusDeRole: {}, periciasDeRole: {}, rankDeInterface: 0 });
});

test('Ficha: as Roles e as habilidades de Role (Solo, Tech, Medtech) são as do criador da wiki; as da Consciência de Combate são as que as regras leem', () => {
  const contexto = { window: {} };
  for (const arquivo of ['system-catalog.js', 'system-rules.js', 'system-criacao.js']) vm.runInNewContext(fs.readFileSync(path.join(raiz, arquivo), 'utf8'), contexto);
  const { roles, roleAbilities } = contexto.window.systemCreation;
  // Array.from: os arrays do contexto da wiki (vm) são de outro reino, e o deepStrictEqual compara o protótipo.
  assert.deepEqual(ROLES.map(role => [role.id, role.nome, role.habilidade, role.resumo]), Array.from(roles, role => [role.id, role.nome, role.habilidade, role.resumo]));
  assert.deepEqual(Object.keys(HABILIDADES_DE_ROLE), Object.keys(roleAbilities));
  for (const [id, wikiRole] of Object.entries(roleAbilities)) {
    const nossa = HABILIDADES_DE_ROLE[id];
    assert.deepEqual(nossa.itens.map(item => [item.id, item.nome, item.desc]), Array.from(wikiRole.itens, item => [item.id, item.nome, item.desc]), id);
    assert.deepEqual([nossa.titulo, nossa.pontos, nossa.max, nossa.nota], [wikiRole.titulo, wikiRole.pontos, wikiRole.max, wikiRole.nota], id);
  }
  // As chaves das seis habilidades do Solo são as que regras.consciencia lê: 4 pontos em cada uma valem tudo.
  const c = regras.consciencia(Object.fromEntries(HABILIDADES_DE_ROLE.solo.itens.map(item => [item.id, 4])));
  assert.deepEqual([c.iniciativa, c.ataque, c.pontoFraco, c.percepcao, c.deflexao, c.semFalhaCritica], [4, 1, 4, 4, 2, true]);
});

test('Ficha: o Lifepath tem os campos e os rótulos do criador da wiki (criador.js), com o campo do resultado de onde cada um vem', () => {
  const criador = fs.readFileSync(path.join(raiz, 'criador.js'), 'utf8');
  const inicio = criador.indexOf('const lifepathFields = [');
  const bloco = criador.slice(inicio, criador.indexOf('];', inicio));
  const campos = [...bloco.matchAll(/\['(\w+)', '([^']+)', '(\w+)'\]/g)].map(([, , rotulo, wiki]) => ({ rotulo, wiki }));
  assert.equal(campos.length, 13);
  for (const campo of campos) assert.ok(LIFEPATH.some(l => l.rotulo === campo.rotulo && l.wiki === campo.wiki), `${campo.rotulo} (${campo.wiki})`);
  // Os quatro que o criador monta à parte: amigos, inimigos, amores e o Lifepath da Role.
  for (const wiki of ['friends', 'enemies', 'tragicLoveAffairs', 'roleLifepath']) {
    assert.ok(LIFEPATH.some(l => l.wiki === wiki), wiki);
    assert.ok(criador.includes(`texts.${wiki} =`), `${wiki} no criador`);
  }
  assert.equal(LIFEPATH.length, 17);
  assert.equal(new Set(LIFEPATH.map(l => l.chave)).size, 17);
});

test('Capanga (o mook do CORE): um tipo de ator a mais, com o nome em português; ao receber um item, instala o cyberware e equipa o que o CORE equipa (o "equippable": arma, armadura, roupa, cyberdeck, droga e equipamento)', () => {
  const sistema = JSON.parse(fs.readFileSync(path.join(raiz, 'foundry-sistema', 'system.json'), 'utf8'));
  // O Black ICE e o demônio vieram no ciclo 43 (o C7).
  assert.deepEqual(Object.keys(sistema.documentTypes.Actor), ['personagem', 'capanga', 'blackice', 'demonio']);
  for (const tipo of ['capanga', 'blackice', 'demonio']) assert.deepEqual(sistema.documentTypes.Actor[tipo], { htmlFields: ['notas'] }, tipo);
  const idioma = JSON.parse(fs.readFileSync(path.join(raiz, 'foundry-sistema', 'lang', 'pt-BR.json'), 'utf8'));
  assert.equal(idioma.TYPES.Actor.capanga, 'Capanga');
  assert.equal(idioma.TYPES.Actor.blackice, 'Black ICE');
  assert.equal(idioma.TYPES.Actor.demonio, 'Demônio');
  // O que se equipa no CORE 0.92.4 (os modelos com EquippableSchema, em modules/datamodels/item), com os tipos daqui; o
  // cyberware instala (o handleMookDraggedItem do CORE, em modules/actor/cpr-actor.js).
  const EQUIPAVEIS_DO_CORE = { armor: 'armadura', clothing: 'roupa', cyberdeck: 'cyberdeck', drug: 'droga', gear: 'equipamento', weapon: 'arma' };
  assert.deepEqual(Object.keys(regras.AO_RECEBER_CAPANGA).sort(), [...Object.values(EQUIPAVEIS_DO_CORE), 'cyberware'].sort());
  assert.equal(regras.AO_RECEBER_CAPANGA.cyberware, 'instalar');
  for (const tipo of ['arma', 'armadura']) assert.deepEqual(regras.AO_RECEBER_CAPANGA[tipo], { 'system.equipada': true }, tipo);
  for (const tipo of ['roupa', 'cyberdeck', 'droga', 'equipamento']) assert.deepEqual(regras.AO_RECEBER_CAPANGA[tipo], { 'system.uso': 'equipado' }, tipo);
  for (const tipo of Object.keys(regras.AO_RECEBER_CAPANGA)) assert.ok(sistema.documentTypes.Item[tipo], tipo);
  assert.ok(Object.hasOwn(USOS, 'equipado'));
  // O resto fica como veio.
  for (const tipo of ['municao', 'programa', 'upgrade', 'veiculo', 'lesao']) assert.equal(regras.AO_RECEBER_CAPANGA[tipo], undefined, tipo);
});

test('Facedown (wiki, "Reputação e facedown" e o cartão rápido, RED p. 194; o CPRFacedownRoll do CORE): COOL + Reputação + 1d10, teste enfrentado, com o empate e o que acontece com quem perde; o ferimento entra, porque a wiki o dá em "todas as ações", como as lesões', () => {
  const regrasDaWiki = fs.readFileSync(path.join(raiz, 'system-rules.js'), 'utf8');
  assert.ok(regrasDaWiki.includes("formula('Facedown: COOL + Reputação + 1d10 (reputação de covarde conta negativa)')"));
  assert.ok(regrasDaWiki.includes("formula('COOL + Reputação + 1d10')"));
  assert.ok(regrasDaWiki.includes('<p>Empate: nada acontece. O perdedor escolhe <b>recuar</b> ou sofrer <b>−2 em ações contra esse oponente</b> até derrotá-lo uma vez.</p>'));
  assert.equal(regras.FACEDOWN.formula, 'COOL + Reputação + 1d10');
  assert.equal(regras.FACEDOWN.dica, 'Teste enfrentado. Empate: nada acontece. Quem perde recua ou fica com −2 nas ações contra o outro até derrotá-lo uma vez.');
  assert.match(regrasDaWiki, /'Gravemente Ferido[^\]]*'−2 em todas as ações'/);
  assert.match(regrasDaWiki, /'Concussão', '−2 em todas as ações\.'/);
});

test('Interface do Netrunner (wiki, "Habilidades de Interface", "Ações por turno" e "Black ICE", RED p. 197–207 e Kit p. 26–27; o CPR.interfaceAbilities do CORE): as 10 habilidades com o nome e o custo da wiki (o Breach no lugar do Backdoor, o Scanner como Ação NET, o Quickhack), a Defesa e a Velocidade, as Ações NET pelo Rank e os boosters do catálogo na habilidade deles', () => {
  const regrasDaWiki = fs.readFileSync(path.join(raiz, 'system-rules.js'), 'utf8');
  const inicio = regrasDaWiki.indexOf("section('Habilidades de Interface'");
  const trecho = regrasDaWiki.slice(inicio, regrasDaWiki.indexOf("section('Combate na NET'", inicio));
  const linhas = [...trecho.matchAll(/\['([^']+)', '([^']+)', '([^']+)', '([^']+)'\]/g)].map(([, nome, custo]) => [nome, custo]).filter(([nome]) => nome !== 'Habilidade');
  assert.equal(linhas.length, 10);
  assert.match(trecho, /o Backdoor do livro-base se chama Breach, e o Scanner deixou de ser Ação Carnal/);
  // As 9 do CORE (CPR.interfaceAbilities; o Backdoor com o nome do Kit, a chave do CORE) e o Quickhack do Kit, na ordem e
  // com o nome e o custo da tabela da wiki.
  const dez = regras.HABILIDADES_DE_INTERFACE.slice(0, 10);
  assert.deepEqual(dez.map(h => h.id), ['scanner', 'backdoor', 'cloak', 'control', 'eyedee', 'pathfinder', 'slide', 'virus', 'zap', 'quickhack']);
  dez.forEach((h, i) => {
    assert.equal(linhas[i][0], h.rotulo, h.id);
    assert.equal(h.custo, linhas[i][1], h.id);
  });
  assert.deepEqual(regras.HABILIDADES_DE_INTERFACE.slice(10).map(h => h.id), ['defesa', 'velocidade']);
  assert.match(regrasDaWiki, /formula\('Interface \+ 1d10 &gt; DV'\)/);
  assert.match(regrasDaWiki, /Ao encontrar Black ICE à espreita: <b>Interface \+ bônus de velocidade \+ 1d10<\/b> contra <b>SPD do ICE \+ 1d10<\/b>/);
  // As Ações NET pelo Rank, pela tabela da wiki: 2 do Rank 1 ao 3, 3 do 4 ao 6, 4 do 7 ao 9 e 5 no 10; sem Interface, 0.
  assert.ok(regrasDaWiki.includes("table(['Rank de Interface', '1–3', '4–6', '7–9', '10'], [['Ações NET', '2', '3', '4', '5']], 'dense')"));
  assert.deepEqual([0, 1, 3, 4, 6, 7, 9, 10].map(regras.acoesDeNet), [0, 2, 2, 3, 3, 4, 4, 5]);
  // Os boosters do catálogo somam +2 na habilidade deles (no CORE: "+2 to Cloak Checks while Rezzed").
  const boosters = Object.fromEntries(['eraser', 'see-ya', 'speedy-gonzalvez', 'worm'].map(id => [id, catalogo[`core_programs:${id}`].effects.flatMap(e => e.system.changes.map(c => `${c.key}=${c.value}`))]));
  assert.deepEqual(boosters, {
    eraser: ['system.bonus.interface.cloak=2'], 'see-ya': ['system.bonus.interface.pathfinder=2'], 'speedy-gonzalvez': ['system.bonus.interface.velocidade=2'], worm: ['system.bonus.interface.backdoor=2']
  });
  for (const id of ['eraser', 'see-ya', 'speedy-gonzalvez', 'worm']) assert.match(catalogo[`core_programs:${id}`].system.descricao, /while Rezzed/, id);
});

test('Programas no combate da NET (wiki, "Como ler os cartões", "Programas: ataque", "Programas" e "Combate na NET"; o CORE): o ataque é Interface + ATK + 1d10; o anti-programa só afeta programas (em programa e em Black ICE) e o anti-pessoal só netrunners (no cérebro), com o dano do catálogo igual ao da wiki; a REZ em 0 desativa', () => {
  const regrasDaWiki = fs.readFileSync(path.join(raiz, 'system-rules.js'), 'utf8');
  const net = fs.readFileSync(path.join(raiz, 'system-net.js'), 'utf8');
  assert.ok(net.includes('<b>ATK:</b> soma no ataque do programa (Interface + ATK + 1d10).'));
  assert.ok(net.includes('<b>REZ:</b> os "pontos de vida" do programa; em 0 ele fica desativado.'));
  assert.ok(net.includes('Anti-pessoal afeta netrunners; anti-programa afeta programas'));
  assert.ok(net.includes('Desativam sozinhos depois de usados.'));
  assert.ok(regrasDaWiki.includes("formula('Interface + ATK do programa + 1d10 vs Interface + 1d10 (ou DEF do programa + 1d10)')"));
  // As classes de ataque e o alvo de cada dano.
  assert.deepEqual(Object.fromEntries(Object.entries(regras.DANO_DE_PROGRAMA).map(([classe, danos]) => [classe, danos.map(dano => dano.id)])),
    { antiprogramattacker: ['padrao', 'blackIce'], antipersonnelattacker: ['padrao'] });
  assert.deepEqual(['antiprogramattacker', 'antipersonnelattacker', 'booster', 'defender'].map(regras.programaDeAtaque), [true, true, false, false]);
  // O dano do catálogo é o da tabela da wiki: o Banhammer 3d6 em programa e 2d6 em Black ICE; o Sword, o contrário; o
  // Hellbolt 2d6 e o Vrizzbolt 1d6 no cérebro.
  assert.ok(regrasDaWiki.includes("['Banhammer', 'Anti-programa', '1 / 0 / 0', '3d6 REZ em programa não Black ICE; 2d6 em Black ICE.'"));
  assert.ok(regrasDaWiki.includes("['Sword', 'Anti-programa', '1 / 0 / 0', '3d6 REZ em Black ICE; 2d6 em programa não Black ICE.'"));
  assert.ok(regrasDaWiki.includes("['Hellbolt', 'Anti-pessoal', '2 / 0 / 0', '2d6 direto no cérebro;"));
  assert.ok(regrasDaWiki.includes("['Vrizzbolt', 'Anti-pessoal', '1 / 0 / 0', '1d6 direto no cérebro"));
  const dano = id => catalogo[`core_programs:${id}`].system.dano;
  assert.deepEqual([dano('banhammer').padrao, dano('banhammer').blackIce, dano('sword').padrao, dano('sword').blackIce, dano('hellbolt').padrao, dano('vrizzbolt').padrao],
    ['3d6', '2d6', '2d6', '3d6', '2d6', '1d6']);
  // A fórmula que não rola (o efeito do programa é outro) e a REZ.
  assert.deepEqual(['0', '', ' 0 ', '2d6'].map(regras.formulaDeDano), ['', '', '', '2d6']);
  assert.equal(regras.formulaDeDano(dano('deckkrash').padrao), '');
  assert.deepEqual([regras.rezAtual(7, 0), regras.rezAtual(7, 3), regras.rezAtual(7, 9), regras.rezAtual(7, -2)], [7, 4, 0, 7]);
});

test('Dano da NET (wiki, "Combate na NET", os defensores e o Zap; o CORE, o dano "brain"): no cérebro, direto no HP, sem a armadura; o Shield anula o primeiro dano de programa e se desativa; o Armor reduz 4; o anti-pessoal entra no cérebro, o anti-programa num programa, o Zap nos dois', () => {
  const regrasDaWiki = fs.readFileSync(path.join(raiz, 'system-rules.js'), 'utf8');
  assert.ok(regrasDaWiki.includes("['Armor', 'Defensor', '0 / 0 / 7', 'Reduz em 4 todo dano cerebral."));
  assert.ok(regrasDaWiki.includes("['Shield', 'Defensor', '0 / 0 / 7', 'Anula o primeiro dano cerebral de programa não Black ICE e se desativa."));
  assert.ok(regrasDaWiki.includes("'1d6 de dano no REZ de um programa ou direto no cérebro de um netrunner.'"));
  assert.equal(regras.REDUCAO_DO_ARMOR, 4);
  assert.deepEqual(regras.danoNoCerebro({ dano: 7 }), { recebido: 7, shield: false, reduzido: 0 });
  assert.deepEqual(regras.danoNoCerebro({ dano: 7, armor: true }), { recebido: 3, shield: false, reduzido: 4 });
  assert.deepEqual(regras.danoNoCerebro({ dano: 3, armor: true }), { recebido: 0, shield: false, reduzido: 3 });
  assert.deepEqual(regras.danoNoCerebro({ dano: 7, shield: true, armor: true }), { recebido: 0, shield: true, reduzido: 0 });
  // Sem dano, o Shield não se gasta.
  assert.deepEqual(regras.danoNoCerebro({ dano: 0, shield: true }), { recebido: 0, shield: false, reduzido: 0 });
  // O ciclo 44 (o C7) juntou o dano em Black ICE, o Zap na REZ, o Zap do demônio e o Black ICE.
  assert.deepEqual(regras.ONDE_O_DANO_ENTRA, {
    antipersonnelattacker: { padrao: ['cerebro'] }, antiprogramattacker: { padrao: ['programa'], blackIce: ['rez'] }, zap: ['cerebro', 'programa', 'rez'], zapDoDemonio: ['cerebro', 'programa'],
    blackIce: { antipersonnel: ['cerebro'], antiprogram: ['programa'] }
  });
});

test('Black ICE e demônio como atores (wiki, "Black ICE" e "Demônios", RED p. 204–212; o blackIce e o demon do CORE): as tabelas da wiki no gerado, a ficha pelo modelo, os números que rolam e a iniciativa no topo da fila', () => {
  const regrasDaWiki = fs.readFileSync(path.join(raiz, 'system-rules.js'), 'utf8');
  // As 12 linhas da tabela de Black ICE da wiki, na ordem dela.
  assert.deepEqual(BLACK_ICE.map(ice => ice.id), ['asp', 'giant', 'hellhound', 'kraken', 'liche', 'raven', 'scorpion', 'skunk', 'wisp', 'dragon', 'killer', 'sabertooth']);
  assert.ok(regrasDaWiki.includes("['Hellhound', 'Anti-pessoal', '6', '6', '6', '2', '20', '2d6 no cérebro; deck e roupa pegam fogo (2 no HP por turno).', '500eb']"));
  assert.deepEqual(BLACK_ICE.find(ice => ice.id === 'hellhound'), {
    id: 'hellhound', nome: 'Hellhound', classe: 'antipersonnel', per: 6, spd: 6, atk: 6, def: 2, rez: 20, efeito: '2d6 no cérebro; deck e roupa pegam fogo (2 no HP por turno).', dano: '2d6', custo: 500
  });
  assert.ok(regrasDaWiki.includes("['Dragon', 'Anti-programa', '6', '4', '6', '6', '30', '6d6 no REZ de um programa; se desativar, destrói.', '1.000eb']"));
  assert.deepEqual(BLACK_ICE.find(ice => ice.id === 'dragon'), {
    id: 'dragon', nome: 'Dragon', classe: 'antiprogram', per: 6, spd: 4, atk: 6, def: 6, rez: 30, efeito: '6d6 no REZ de um programa; se desativar, destrói.', dano: '6d6', custo: 1000
  });
  // Cada linha volta igual ao texto da wiki (a classe pelo nome, o custo com o ponto do milhar).
  const custoNaWiki = custo => `${String(custo).replace(/\B(?=(\d{3})+$)/g, '.')}eb`;
  for (const ice of BLACK_ICE) {
    const linha = [ice.nome, ice.classe === 'antiprogram' ? 'Anti-programa' : 'Anti-pessoal', ice.per, ice.spd, ice.atk, ice.def, ice.rez, ice.efeito, custoNaWiki(ice.custo)].map(valor => `'${valor}'`).join(', ');
    assert.ok(regrasDaWiki.includes(`[${linha}]`), ice.nome);
    assert.ok(CLASSES_BLACK_ICE[ice.classe], ice.nome);
  }
  // O dano é o do efeito; sem dano no efeito (o Asp, o −1d6 em INT do Liche, o −1d6 no MOVE do Scorpion, o Skunk), vazio.
  assert.deepEqual(Object.fromEntries(BLACK_ICE.map(ice => [ice.id, ice.dano])), {
    asp: '', giant: '3d6', hellhound: '2d6', kraken: '3d6', liche: '', raven: '1d6', scorpion: '', skunk: '', wisp: '1d6', dragon: '6d6', killer: '4d6', sabertooth: '6d6'
  });
  // Os 3 demônios.
  assert.ok(regrasDaWiki.includes("[['Imp', '15', '3', '2', '14'], ['Efreet', '25', '4', '3', '14'], ['Balron', '30', '7', '4', '14']]"));
  assert.deepEqual(DEMONIOS, [
    { id: 'imp', nome: 'Imp', rez: 15, interface: 3, acoes: 2, valorDeCombate: 14 },
    { id: 'efreet', nome: 'Efreet', rez: 25, interface: 4, acoes: 3, valorDeCombate: 14 },
    { id: 'balron', nome: 'Balron', rez: 30, interface: 7, acoes: 4, valorDeCombate: 14 }
  ]);
  // A ficha pelo modelo: o nome, os números e a REZ cheia.
  assert.deepEqual(regras.fichaDoModelo(BLACK_ICE.find(ice => ice.id === 'hellhound')), {
    name: 'Hellhound',
    system: { modelo: 'hellhound', classe: 'antipersonnel', per: 6, spd: 6, atk: 6, def: 2, efeito: '2d6 no cérebro; deck e roupa pegam fogo (2 no HP por turno).', dano: '2d6', custo: 500, rez: { value: 20, max: 20 } }
  });
  assert.deepEqual(regras.fichaDoModelo(DEMONIOS[1]), { name: 'Efreet', system: { modelo: 'efreet', interface: 4, acoes: 3, valorDeCombate: 14, rez: { value: 25, max: 25 } } });
  // Os números que rolam (o número + 1d10): PER, SPD, ATK e DEF do Black ICE; a Interface e o Valor de combate do demônio
  // (a wiki: "defende com Interface + 1d10"; "ataca com drones e torretas usando o valor de combate + 1d10").
  assert.deepEqual(regras.NUMEROS_DA_NET.blackice.map(n => n.id), ['per', 'spd', 'atk', 'def']);
  assert.deepEqual(regras.NUMEROS_DA_NET.demonio.map(n => n.id), ['interface', 'valorDeCombate']);
  assert.ok(regrasDaWiki.includes('Sem DEF: defende com Interface + 1d10. Só usa Zap e Control.'));
  assert.ok(regrasDaWiki.includes('Ataca com drones e torretas usando o valor de combate + 1d10.'));
  assert.deepEqual(ATORES_DA_NET, ['blackice', 'demonio']);
  // A iniciativa: o Black ICE "entra no topo da fila de iniciativa"; o demônio "entra no topo da iniciativa". Um a mais que
  // a maior dos outros; 30 se ninguém rolou (o CORE).
  assert.ok(regrasDaWiki.includes('Depois ele entra no <b>topo da fila de iniciativa</b>'));
  assert.ok(regrasDaWiki.includes('Entra no topo da iniciativa quando detecta um intruso'));
  assert.equal(regras.iniciativaNoTopo([]), 30);
  assert.equal(regras.iniciativaNoTopo([null, undefined]), 30);
  assert.equal(regras.iniciativaNoTopo([12, null, 8, 15]), 16);
  assert.equal(regras.iniciativaNoTopo([0]), 1);
});

test('Dano da NET com o Black ICE e o demônio (wiki, "Black ICE", "Como ler os cartões" e os programas; o NET Architect da mesa; o _applyDamage do Black ICE e do demônio no CORE): o Black ICE anti-pessoal no cérebro e o anti-programa num programa, que desativado é destruído; o dano "em Black ICE" dos programas e o Zap do netrunner na REZ do Black ICE e do demônio; o Zap do demônio no intruso; a REZ não passa de 0', () => {
  const regrasDaWiki = fs.readFileSync(path.join(raiz, 'system-rules.js'), 'utf8');
  const netDaWiki = fs.readFileSync(path.join(raiz, 'system-net.js'), 'utf8');
  assert.ok(netDaWiki.includes('Anti-pessoal afeta netrunners; anti-programa afeta programas (e caça o netrunner se ele não tiver programas ativos).'));
  assert.ok(regrasDaWiki.includes("'6d6 no REZ de um programa; se desativar, destrói.'"));
  assert.ok(regrasDaWiki.includes("['Sword', 'Anti-programa', '1 / 0 / 0', '3d6 REZ em Black ICE; 2d6 em programa não Black ICE.', '50eb']"));
  assert.ok(regrasDaWiki.includes("'Anula o primeiro dano cerebral de programa não Black ICE e se desativa."));
  assert.ok(regrasDaWiki.includes("'1d6 de dano no REZ de um programa ou direto no cérebro de um netrunner.'"));
  assert.ok(regrasDaWiki.includes('Sem DEF: defende com Interface + 1d10. Só usa Zap e Control.'));
  // O Black ICE, pela classe; o dano "em Black ICE" dos programas na REZ; o Zap do netrunner nos três; o do demônio, no intruso.
  assert.deepEqual(regras.ONDE_O_DANO_ENTRA.blackIce, { antipersonnel: ['cerebro'], antiprogram: ['programa'] });
  assert.deepEqual(regras.ONDE_O_DANO_ENTRA.antiprogramattacker, { padrao: ['programa'], blackIce: ['rez'] });
  assert.deepEqual(regras.ONDE_O_DANO_ENTRA.zap, ['cerebro', 'programa', 'rez']);
  assert.deepEqual(regras.ONDE_O_DANO_ENTRA.zapDoDemonio, ['cerebro', 'programa']);
  // A REZ do Black ICE e do demônio depois do dano: até 0.
  assert.equal(regras.rezDepoisDoDano(20, 6), 14);
  assert.equal(regras.rezDepoisDoDano(5, 7), 0);
  assert.equal(regras.rezDepoisDoDano(5, -3), 5);
  assert.equal(regras.rezDepoisDoDano(5, 2.9), 3);
});

test('Black ICE próprio do netrunner (wiki, "Black ICE": "Black ICE próprio ocupa 2 slots no deck"; o programa blackice do CORE): os 12 da tabela da wiki no catálogo, como programas da classe Black ICE, com o tipo, PER, SPD, ATK, DEF, a REZ, o dano do efeito, o custo e 2 slots; fora da loja da wiki', () => {
  const regrasDaWiki = fs.readFileSync(path.join(raiz, 'system-rules.js'), 'utf8');
  assert.ok(regrasDaWiki.includes('Black ICE próprio ocupa <b>2 slots</b> no deck.'));
  assert.equal(CLASSES_PROGRAMA.blackice, 'Black ICE');
  // Na ordem da tabela da wiki.
  assert.deepEqual(Object.keys(catalogo).filter(id => id.startsWith('black-ice:')), BLACK_ICE.map(ice => `black-ice:${ice.id}`));
  for (const ice of BLACK_ICE) {
    const p = catalogo[`black-ice:${ice.id}`];
    assert.deepEqual([p.type, p.name, p.img], ['programa', ice.nome, 'icons/svg/ice-aura.svg'], ice.nome);
    const s = p.system;
    assert.deepEqual(
      [s.classe, s.tipoDeIce, s.per, s.spd, s.atk, s.def, s.rez, s.dano.padrao, s.dano.blackIce, s.preco, s.tamanho, s.descricao],
      ['blackice', ice.classe, ice.per, ice.spd, ice.atk, ice.def, ice.rez, ice.dano || '0', '0', ice.custo, 2, `<p>${ice.efeito}</p>`], ice.nome);
    assert.equal(p.flags['cpr-fieldbook'].catalogo, `black-ice:${ice.id}`);
  }
  // O Hellhound, conferido contra a linha da tabela da wiki.
  assert.deepEqual(catalogo['black-ice:hellhound'].system.dano, { padrao: '2d6', blackIce: '0' });
  assert.equal(catalogo['black-ice:asp'].system.dano.padrao, '0');
  // A loja da wiki não vende Black ICE: o netrunner recebe pelo compêndio de Netrunning (o mestre dá).
  assert.ok(!Array.from(daWiki('loja-catalogo.js', 'shopCatalog').itens).some(item => item.id.startsWith('black-ice:') || /hellhound|sabertooth/i.test(item.en ?? '')));
});

test('Arquitetura da NET (wiki, "Montando uma arquitetura", RED p. 209–211; o netarch do CORE; o NET Architect da mesa): os andares viram os nós do mapa, com o pai de cada um (o ramo novo sai do andar de cima do ramo à esquerda), os fundos e os vizinhos; o DV da arquitetura é o maior dos andares; o Pathfinder revela andares até um DV maior que o resultado', () => {
  const regrasDaWiki = fs.readFileSync(path.join(raiz, 'system-rules.js'), 'utf8');
  assert.ok(regrasDaWiki.includes("[['Básica', '6', '2', '—'], ['Padrão', '8', '4', '2 ou menos'], ['Incomum', '10', '6', '4 ou menos'], ['Avançada', '12', '8', '6 ou menos']]"));
  assert.equal(arquitetura.DV_SEM_ANDARES, 6);
  assert.deepEqual(Object.keys(arquitetura.TIPOS_DE_ANDAR), ['senha', 'arquivo', 'controle', 'ice', 'demonio', 'netrunner', 'vazio']);
  // A clínica de ripperdoc do NET Architect: o ramo B sai do andar 2 (o 3b), e os dois ramos descem até o 5.
  const clinica = arquitetura.lerArquitetura({ nome: 'Clínica', andares: [
    { andar: 1, ramo: 'a', tipo: 'senha', dv: 8 }, { andar: 2, ramo: 'a', tipo: 'ice', ice: 'wisp' }, { andar: 3, ramo: 'a', tipo: 'arquivo', dv: 8 },
    { andar: 4, ramo: 'a', tipo: 'ice', ice: 'killer' }, { andar: 5, ramo: 'a', tipo: 'arquivo', dv: 10 },
    { andar: 3, ramo: 'b', tipo: 'controle', dv: 8 }, { andar: 4, ramo: 'b', tipo: 'senha', dv: 10 }, { andar: 5, ramo: 'b', tipo: 'controle', dv: 10 }
  ] });
  const pais = Object.fromEntries(Object.values(clinica.nos).map(no => [no.id, no.pai]));
  assert.deepEqual(pais, { '1a': 'entrada', '2a': '1a', '3a': '2a', '3b': '2a', '4a': '3a', '4b': '3b', '5a': '4a', '5b': '4b' });
  assert.deepEqual(clinica.filhos['2a'], ['3a', '3b']);
  assert.ok(arquitetura.ehFundo(clinica, '5a') && arquitetura.ehFundo(clinica, '5b') && !arquitetura.ehFundo(clinica, '3b') && !arquitetura.ehFundo(clinica, arquitetura.ENTRADA));
  assert.deepEqual(arquitetura.vizinhos(clinica, '2a'), ['1a', '3a', '3b']);
  assert.deepEqual([clinica.dv, clinica.colunas, clinica.andares], [10, 2, 5]);
  // Um ramo com buraco: o 4B sai do andar de cima do ramo à esquerda (o 3A), e não do 2B, mais acima no mesmo ramo.
  const buraco = arquitetura.lerArquitetura({ andares: ['1a', '2a', '2b', '3a', '4b'].map(id => ({ andar: Number(id[0]), ramo: id[1], tipo: 'vazio' })) });
  assert.deepEqual([buraco.nos['2b'].pai, buraco.nos['4b'].pai], ['1a', '3a']);
  // O DV do item manda (dv > 0); sem DV nos andares, a básica (6).
  assert.equal(arquitetura.lerArquitetura({ andares: [{ andar: 1, tipo: 'senha', dv: 8 }], dv: 12 }).dv, 12);
  assert.equal(arquitetura.lerArquitetura({ andares: [{ andar: 1, tipo: 'ice', ice: 'asp' }] }).dv, 6);
  // O armazém da TLB (o exemplo do livro): dois Black ICE no mesmo andar viram um andar com dois conteúdos.
  const armazem = arquitetura.lerArquitetura({ andares: [
    { andar: 1, ramo: 'a', tipo: 'ice', ice: 'hellhound' }, { andar: 1, ramo: 'a', tipo: 'ice', ice: 'killer' }, { andar: 2, ramo: 'a', tipo: 'senha', dv: 8 },
    { andar: 3, ramo: 'a', tipo: 'ice', ice: 'hellhound' }, { andar: 4, ramo: 'a', tipo: 'controle', dv: 8, descricao: 'Torreta automática' }
  ] });
  assert.deepEqual(armazem.nos['1a'].conteudos.map(c => [c.tipo, c.ice, c.dv]), [['ice', 'hellhound', null], ['ice', 'killer', null]]);
  assert.deepEqual([armazem.nos['4a'].conteudos[0].tipo, armazem.nos['4a'].conteudos[0].descricao, armazem.dv], ['controle', 'Torreta automática', 8]);
  // O Pathfinder (RED p. 199): até 20, todos; com 3, a senha DV 8 do andar 1 aparece e barra o resto; com 9, o 4b (DV 10) e
  // o 5a aparecem, mas o 5b, atrás do 4b, não; do 3b com 9, só o 4b.
  assert.equal(arquitetura.revelarPathfinder(clinica, arquitetura.ENTRADA, 20).length, 8);
  assert.deepEqual(arquitetura.revelarPathfinder(clinica, arquitetura.ENTRADA, 3), ['1a']);
  assert.deepEqual(arquitetura.revelarPathfinder(clinica, arquitetura.ENTRADA, 9), ['1a', '2a', '3a', '3b', '4a', '4b', '5a']);
  assert.deepEqual(arquitetura.revelarPathfinder(clinica, '3b', 9), ['4b']);
  // As linhas que não valem: andar fora de 1 a 18 sai; ramo desconhecido vira A; tipo desconhecido vira andar vazio.
  const torta = arquitetura.lerArquitetura({ andares: [{ andar: 0, tipo: 'senha' }, { andar: 19, tipo: 'senha' }, { andar: 1, ramo: 'ab', tipo: 'xyz' }] });
  assert.deepEqual(Object.keys(torta.nos), ['1a']);
  assert.equal(torta.nos['1a'].conteudos[0].tipo, 'vazio');
  // A linha nova da ficha: o andar seguinte ao mais fundo do ramo A, uma senha DV 6.
  assert.deepEqual(arquitetura.novaLinha([{ andar: 3, ramo: 'a' }, { andar: 7, ramo: 'b' }]), { andar: 4, ramo: 'a', tipo: 'senha', dv: 6, ice: '', demonio: '', ator: '', nome: '', descricao: '' });
  assert.equal(arquitetura.novaLinha().andar, 1);
});

test('Arquiteturas da NET do compêndio (o documento da campanha na wiki, lido como o build do cpr-2077 o lê; os exemplos do NET Architect): as 4 da campanha com os andares, os ramos e o que tem em cada andar; a seção sem tabela fica de fora; um andar errado para o build', () => {
  const campanha = arquiteturasDaCampanha(raiz);
  assert.deepEqual(campanha.map(a => a.name), [
    'O retransmissor RT-07 (depósito de Kabuki)', 'O Gatilho (hospital queimado, Northside)', 'A Coleira (datafort da Militech, Arroyo)', 'O Núcleo (rede de emergência, sob o City Center)'
  ]);
  for (const a of campanha) assert.deepEqual([a.type, a.img, a.flags['cpr-fieldbook'].campanha], ['arquitetura', 'icons/svg/tower.svg', 'morana'], a.name);
  const ler = prefixo => arquitetura.lerArquitetura(campanha.find(a => a.name.startsWith(prefixo)).system);
  // O Gatilho: os 6 andares da sessão 2 (o Raven no 2, o Hellhound no 5, o arquivo DV 12 no 6) e a senha do handout.
  const gatilho = ler('O Gatilho');
  assert.equal(Object.keys(gatilho.nos).length, 6);
  assert.deepEqual([gatilho.nos['2a'].conteudos[0].ice, gatilho.nos['5a'].conteudos[0].ice, gatilho.nos['6a'].conteudos[0].tipo, gatilho.nos['6a'].conteudos[0].dv, gatilho.dv], ['raven', 'hellhound', 'arquivo', 12, 12]);
  assert.match(gatilho.nos['1a'].conteudos[0].descricao, /ALA-B-14-2070/);
  // A Coleira: o ramo B sai do andar 3 (o 4B sai do 3A); os fundos 8A e 5B. O Núcleo: o 6B sai do 5A; o nó de controle do 9.
  const coleira = ler('A Coleira');
  assert.equal(coleira.nos['4b'].pai, '3a');
  assert.ok(arquitetura.ehFundo(coleira, '8a') && arquitetura.ehFundo(coleira, '5b'));
  const nucleo = ler('O Núcleo');
  assert.deepEqual([nucleo.nos['6b'].pai, nucleo.nos['9a'].conteudos[0].tipo, Object.keys(nucleo.nos).length], ['5a', 'controle', 11]);
  // A descrição: o cabeçalho e os parágrafos da seção, com o negrito; a seção sem tabela ("Morana na NET") fica de fora.
  assert.ok(campanha[0].system.descricao.startsWith('<p><b>Protocolo Morana</b> · 5 andares · do documento Arquiteturas da campanha</p><p>Sessão 1.'));
  assert.ok(campanha.find(a => a.name.startsWith('O Núcleo')).system.descricao.includes('<p><b>Morana como Entidade:</b>'));
  assert.ok(!campanha.some(a => a.name === 'Morana na NET'));
  // Os 3 exemplos do NET Architect (o armazém do livro com dois Black ICE no andar 1).
  assert.deepEqual(ARQUITETURAS_DE_EXEMPLO.map(a => a.name), ['Armazém da TLB (exemplo do livro)', 'Apartamento de um fixer', 'Clínica de ripperdoc (ramificada)']);
  assert.deepEqual(arquitetura.lerArquitetura(ARQUITETURAS_DE_EXEMPLO[0].system).nos['1a'].conteudos.map(c => c.ice), ['hellhound', 'killer']);
  // Um andar errado para o build, com o nome da arquitetura e o andar.
  const temporaria = fs.mkdtempSync(path.join(os.tmpdir(), 'cprf-arquiteturas-'));
  try {
    fs.mkdirSync(path.join(temporaria, 'documentos', 'morana'), { recursive: true });
    const com = linha => fs.writeFileSync(path.join(temporaria, 'documentos', 'morana', 'arquiteturas-da-campanha.md'), `# X\n\n## Teste\n\n| Andar | Ramo | Conteúdo | DV | O que tem |\n|---|---|---|---|---|\n${linha}\n`);
    com('| 1 | A | Black ICE: Dragao | — | |');
    assert.throws(() => arquiteturasDaCampanha(temporaria), /"Teste": Black ICE desconhecido: Black ICE: Dragao/);
    com('| 19 | A | Senha | 8 | |');
    assert.throws(() => arquiteturasDaCampanha(temporaria), /andar inválido: 19/);
    com('| 2 | A | Senha | 3 | |');
    assert.throws(() => arquiteturasDaCampanha(temporaria), /DV inválido no andar 2: 3/);
    com('| 2 | A | Torreta | 8 | |');
    assert.throws(() => arquiteturasDaCampanha(temporaria), /conteúdo desconhecido no andar 2: Torreta/);
  } finally {
    fs.rmSync(temporaria, { recursive: true, force: true });
  }
});

test('Arquitetura pelas tabelas (wiki, "Montando uma arquitetura", RED p. 210–211; as tabelas e o _netarchGenerateFromTables do CORE): o lobby igual ao da wiki; as 4 dificuldades com o DV delas; 3d6 andares, um ramo a cada 7+ no 1d10, sem repetir um resultado (menos arquivo e nó de controle), o ramo novo no andar 3 e um Black ICE por linha', async () => {
  const regrasDaWiki = fs.readFileSync(path.join(raiz, 'system-rules.js'), 'utf8');
  assert.ok(regrasDaWiki.includes('<b>Dois primeiros andares (lobby), 1d6:</b> 1 arquivo DV6 · 2 senha DV6 · 3 senha DV8 · 4 Skunk · 5 Wisp · 6 Killer.'));
  assert.ok(regrasDaWiki.includes('<b>Andares:</b> 3d6. Role 1d10: com 7+, a arquitetura tem um ramo (role de novo para mais). Não ramifica antes do 2º andar'));
  // O lobby do CORE é o da wiki.
  assert.deepEqual(TABELAS_DA_NET.lobby.formula, '1d6');
  assert.deepEqual(TABELAS_DA_NET.lobby.resultados.map(r => [r.min, r.rotulo]), [[1, 'Arquivo DV 6'], [2, 'Senha DV 6'], [3, 'Senha DV 8'], [4, 'Skunk'], [5, 'Wisp'], [6, 'Killer']]);
  // As 4 dificuldades (3d6, de 3 a 18), com o DV da tabela de dificuldades da wiki nas senhas, nos arquivos e nos nós.
  assert.deepEqual(arquitetura.DIFICULDADES, { basica: 'Básica', padrao: 'Padrão', incomum: 'Incomum', avancada: 'Avançada' });
  for (const [id, dv] of [['basica', 6], ['padrao', 8], ['incomum', 10], ['avancada', 12]]) {
    const tabela = TABELAS_DA_NET[id];
    assert.equal(tabela.formula, '3d6', id);
    assert.deepEqual(tabela.resultados.map(r => r.min), Array.from({ length: 16 }, (_, i) => i + 3), id);
    assert.deepEqual([...new Set(tabela.resultados.flatMap(r => r.conteudos).filter(c => c.dv).map(c => c.dv))], [dv], id);
  }
  // Vários Black ICE num resultado: um por linha.
  assert.deepEqual(TABELAS_DA_NET.avancada.resultados.find(r => r.min === 17), {
    min: 17, max: 17, rotulo: 'Raven, Wisp, Hellhound', conteudos: [{ tipo: 'ice', ice: 'raven' }, { tipo: 'ice', ice: 'wisp' }, { tipo: 'ice', ice: 'hellhound' }]
  });
  assert.deepEqual(TABELAS_DA_NET.avancada.resultados.find(r => r.min === 3).conteudos.map(c => c.ice), ['hellhound', 'hellhound', 'hellhound']);
  // A geração com os dados fixos: 6 andares (3d6), um ramo (8 no 1d10, depois 2); o lobby 1 e 1 (o arquivo pode repetir);
  // na padrão, 9 (a senha), 9 de novo (não repete: rola outra vez), 3 (Hellhound ×2), 18 (Liche e Raven) e 11 (o nó).
  const fila = [6, 8, 2, 1, 1, 9, 9, 3, 18, 11];
  const gerada = await arquitetura.gerarAndares({ dificuldade: 'padrao', tabelas: TABELAS_DA_NET, rolar: () => fila.shift() });
  assert.deepEqual([gerada.total, gerada.ramosAMais, fila.length], [6, 1, 0]);
  assert.deepEqual(gerada.andares.map(l => `${l.andar}${l.ramo} ${l.tipo} ${l.dv || l.ice}`), [
    '1a arquivo 6', '2a arquivo 6', '3a senha 8', '3b ice hellhound', '3b ice hellhound', '4b ice liche', '4b ice raven', '5b controle 8'
  ]);
  assert.deepEqual([gerada.andares[0].descricao, gerada.andares[3].descricao], ['Lobby, 1: Arquivo DV 6', 'Padrão, 3: Hellhound ×2']);
  // O ramo B começa no andar 3 e sai do 2A (a wiki: não ramifica antes do 2º andar); o DV da arquitetura é o da padrão.
  const mapa = arquitetura.lerArquitetura({ andares: gerada.andares });
  assert.deepEqual([mapa.nos['3b'].pai, mapa.nos['4b'].pai, mapa.nos['5b'].pai, mapa.dv], ['2a', '3b', '4b', 8]);
  // O 1d10 sempre 7 ou mais: o ramo para no H (7 a mais), sem rolar o oitavo.
  let rolagensDoD10 = 0;
  const rolarCheio = formula => {
    if (formula !== '1d10') return formula === '1d6' ? 1 : 10;
    rolagensDoD10 += 1;
    return 10;
  };
  const cheia = await arquitetura.gerarAndares({ dificuldade: 'basica', tabelas: TABELAS_DA_NET, rolar: rolarCheio });
  assert.deepEqual([cheia.ramosAMais, rolagensDoD10], [7, 7]);
});

test('Ponto de acesso à NET (wiki, "Netrunning": o deck externo "a até 6 m do ponto de acesso ou do alvo, sem parede no meio (8 m com o Range Upgrade)"; o Range Upgrade do CORE; o NET Architect da mesa): a distância do token ao Tile, o alcance, o que falta para conectar e o mapa que os jogadores enxergam (os andares vistos e, como "?", os vizinhos de quem está na NET)', () => {
  const regrasDaWiki = fs.readFileSync(path.join(raiz, 'system-rules.js'), 'utf8');
  assert.ok(regrasDaWiki.includes('<b>Deck externo:</b> a até <b>6 m</b> do ponto de acesso ou do alvo, sem parede no meio (8 m com o Range Upgrade).'));
  // O deck na Neuroport Cyberdeck Port (20 m contra arquiteturas, o Kit) ainda não está no sistema (ROADMAP, C9).
  assert.ok(regrasDaWiki.includes('<b>Deck na Neuroport Cyberdeck Port:</b> <b>20 m</b> contra arquiteturas NET'));
  assert.ok(regrasDaWiki.includes('<b>Sair do alcance conectado</b> = desconexão insegura'));
  assert.equal(PONTO_PADRAO.alcance, 6);
  // A cena com quadrados de 100 px e 2 m; o Tile de 2×2 quadrados em (1000, 1000). A distância vai do centro do token à
  // borda mais próxima do Tile.
  const cena = { grid: { size: 100, distance: 2 } };
  const tile = { parent: cena, x: 1000, y: 1000, width: 200, height: 200 };
  const token = (x, y, lado = 1) => ({ x, y, width: lado, height: lado });
  assert.equal(netrun.distancia(tile, token(1050, 1050)), 0);
  assert.equal(netrun.distancia(tile, token(1300, 1000)), 3);
  assert.equal(netrun.distancia(tile, token(700, 1000, 2)), 4);
  assert.equal(netrun.distancia(tile, token(1500, 1500)), Math.hypot(3.5, 3.5) * 2);
  // O token do Foundry andando: o x dele ainda é o de antes, e o _source já é o destino (Foundry 14).
  assert.equal(netrun.distancia(tile, { ...token(1050, 1050), _source: token(1300, 1000) }), 3);
  // O netrunner: o deck equipado, os programas instalados nele e o Range Upgrade (pelo catálogo ou pelo nome, instalado no
  // deck equipado).
  const ator = (rank, ...itens) => ({ system: { rankDeInterface: rank }, items: itens });
  const deck = { id: 'deck', type: 'cyberdeck', name: 'Deck', system: { uso: 'equipado' } };
  const reserva = { id: 'reserva', type: 'cyberdeck', name: 'Reserva', system: { uso: 'carregando' } };
  const range = { id: 'r', type: 'upgrade', name: 'Range Upgrade', system: { instaladoEm: 'deck' }, flags: { 'cpr-fieldbook': { catalogo: netrun.RANGE_UPGRADE } } };
  const programa = { id: 'p1', type: 'programa', name: 'Sword', system: { instaladoEm: 'deck' } };
  const solto = { id: 'p2', type: 'programa', name: 'Armor', system: { instaladoEm: '' } };
  const n = netrun.netrunnerDo(ator(4, reserva, deck, programa, solto, range));
  assert.deepEqual([n.deck.id, n.programas.map(item => item.id), n.rank, n.rangeUpgrade], ['deck', ['p1'], 4, true]);
  assert.equal(netrun.netrunnerDo(ator(4, deck, { ...range, name: 'Melhoria de alcance' })).rangeUpgrade, true);
  assert.equal(netrun.netrunnerDo(ator(4, deck, { ...range, flags: {} })).rangeUpgrade, true);
  assert.equal(netrun.netrunnerDo(ator(4, deck, { ...range, system: { instaladoEm: '' } })).rangeUpgrade, false);
  assert.equal(netrun.netrunnerDo(ator(4, { ...deck, system: { uso: 'carregando' } }, range)).rangeUpgrade, false);
  // O alcance: o do ponto (vazio, um quadrado da cena); com o Range Upgrade, 2 a mais (os 8 m da wiki).
  assert.equal(netrun.alcanceDo({ alcance: 6 }, cena), 6);
  assert.equal(netrun.alcanceDo({ alcance: 0 }, cena), 2);
  assert.equal(netrun.alcanceDo({ alcance: 6 }, cena, n), 8);
  assert.equal(netrun.alcanceDo({ alcance: 6 }, cena, netrun.netrunnerDo(ator(4, deck))), 6);
  // O que falta para conectar: o deck equipado (se o ponto exige) e a Interface mínima.
  assert.deepEqual(netrun.faltasPara(PONTO_PADRAO, ator(1, deck)), []);
  assert.deepEqual(netrun.faltasPara({ exigeDeck: true, rankMinimo: 5 }, ator(0, reserva)), ['um cyberdeck equipado', 'Interface 5 (tem 0)']);
  assert.deepEqual(netrun.faltasPara({ exigeDeck: false, rankMinimo: 0 }, ator(0)), []);
  // O mapa que os jogadores enxergam (o que o mestre ativo grava no Tile).
  const clinica = arquitetura.lerArquitetura({ nome: 'Clínica', andares: [
    { andar: 1, ramo: 'a', tipo: 'senha', dv: 8 }, { andar: 2, ramo: 'a', tipo: 'ice', ice: 'wisp' }, { andar: 3, ramo: 'a', tipo: 'arquivo', dv: 8 },
    { andar: 3, ramo: 'b', tipo: 'demonio', demonio: 'efreet' }, { andar: 4, ramo: 'b', tipo: 'netrunner', nome: 'Raposa' }
  ] });
  const estado = mudancas => ({ mapa: false, vistos: [], feitos: [], ices: [], corredores: [], ...mudancas });
  assert.deepEqual(netrun.vistaPublica(clinica, estado()), []);
  // Na entrada: o andar 1 aparece como "?", sem o conteúdo.
  assert.deepEqual(netrun.vistaPublica(clinica, estado({ corredores: [{ no: arquitetura.ENTRADA }] })), [{ id: '1a', andar: 1, ramo: 'a', pai: 'entrada', visto: false }]);
  // No 2A, com o 1A e o 2A vistos: o 3A e o 3B (o ramo novo) como "?"; a senha aberta e o Wisp com a REZ que sobrou.
  const vista = netrun.vistaPublica(clinica, estado({ vistos: ['1a', '2a'], feitos: ['1a.0'], ices: [{ chave: '2a.0', rez: 5 }], corredores: [{ no: '2a' }] }));
  assert.deepEqual(vista.map(no => [no.id, no.visto]), [['1a', true], ['2a', true], ['3a', false], ['3b', false]]);
  assert.deepEqual(vista[0].conteudos, [{ chave: '1a.0', tipo: 'senha', dv: 8, feito: true }]);
  const wisp = BLACK_ICE.find(ice => ice.id === 'wisp');
  assert.deepEqual(vista[1].conteudos[0].inimigo, { nome: wisp.nome, classe: wisp.classe, per: wisp.per, spd: wisp.spd, atk: wisp.atk, def: wisp.def, efeito: wisp.efeito, rez: wisp.rez, rezAtual: 5 });
  assert.equal(vista[2].conteudos, undefined);
  // O mapa revelado pelo mestre: todos os andares com o conteúdo; o demônio com a REZ da tabela e o netrunner inimigo pelo nome.
  const todo = netrun.vistaPublica(clinica, estado({ mapa: true }));
  assert.deepEqual(todo.map(no => [no.id, no.visto]), [['1a', true], ['2a', true], ['3a', true], ['3b', true], ['4b', true]]);
  const efreet = DEMONIOS.find(demonio => demonio.id === 'efreet');
  assert.deepEqual(todo[3].conteudos[0].inimigo, { nome: efreet.nome, interface: efreet.interface, acoes: efreet.acoes, valorDeCombate: efreet.valorDeCombate, rez: efreet.rez, rezAtual: efreet.rez });
  assert.deepEqual(todo[4].conteudos[0].inimigo, { nome: 'Raposa', ativo: true });
});

test('Andar e as habilidades contra os andares (wiki, "Ações NET" e "Habilidades de Interface", RED p. 198–201; o NET Architect da mesa): andar não é Ação NET e vai até a próxima obstrução (a senha trava a descida); Interface + 1d10 > DV; o alvo de cada habilidade no andar; o Pathfinder, o Cloak e o Virus; as Ações NET contam só em combate', () => {
  const regrasDaWiki = fs.readFileSync(path.join(raiz, 'system-rules.js'), 'utf8');
  assert.ok(regrasDaWiki.includes("formula('Interface + 1d10 &gt; DV')"));
  assert.ok(regrasDaWiki.includes('<b>Não são Ações NET:</b> andar pela arquitetura (até a próxima obstrução) e copiar arquivos para o deck.'));
  assert.ok(regrasDaWiki.includes("['Faz um nó de controle falhar até o vírus ser removido', '10', '2']"));
  // O terminal: a senha no 1A, o arquivo no 2A, o nó de controle no 3A e o ramo B (o 3B, vazio, o mais fundo) saindo do 2A.
  const arq = arquitetura.lerArquitetura({ nome: 'Terminal', andares: [
    { andar: 1, ramo: 'a', tipo: 'senha', dv: 6 }, { andar: 2, ramo: 'a', tipo: 'arquivo', dv: 8, nome: 'Folha de pagamento', descricao: 'Os salários da clínica.' },
    { andar: 3, ramo: 'a', tipo: 'controle', dv: 8, descricao: 'As câmeras do saguão' }, { andar: 3, ramo: 'b', tipo: 'vazio' }, { andar: 4, ramo: 'a', tipo: 'ice', ice: 'hellhound' }
  ] });
  const est = { mapa: false, vistos: [], feitos: [], ices: [], corredores: [] };
  const eu = { nome: 'Deck', no: arquitetura.ENTRADA, acoes: 0, max: 3 };
  assert.equal(netrun.resumoDoAndar(arq, '1a'), 'Senha DV 6');
  assert.equal(netrun.resumoDoAndar(arq, '3b'), 'Andar vazio');
  assert.equal(netrun.resumoDoAndar(arq, '4a'), 'Hellhound');
  // Andar: só aos vizinhos; da entrada ao 1A; a senha do 1A trava a descida até ser quebrada; subir é livre.
  assert.equal(netrun.motivoParaNaoAndar(arq, est, eu, '2a'), 'Só dá para ir a um andar vizinho.');
  assert.equal(netrun.motivoParaNaoAndar(arq, est, eu, '1a'), null);
  eu.no = '1a';
  assert.equal(netrun.motivoParaNaoAndar(arq, est, eu, '2a'), 'A senha deste andar (DV 6) trava a descida: use Breach.');
  assert.equal(netrun.motivoParaNaoAndar(arq, est, eu, arquitetura.ENTRADA), null);
  // O alvo: a senha daqui (o Eye-Dee e o Control não têm alvo neste andar); o Virus só no fundo; o Zap não é contra andar.
  assert.equal(netrun.alvoDaHabilidade(arq, est, eu, 'backdoor').alvo.chave, '1a.0');
  assert.equal(netrun.alvoDaHabilidade(arq, est, eu, 'eyedee').erro, 'Não há arquivo por identificar neste andar.');
  assert.equal(netrun.alvoDaHabilidade(arq, est, eu, 'control').erro, 'Não há nó de controle livre neste andar.');
  assert.deepEqual(netrun.alvoDaHabilidade(arq, est, eu, 'pathfinder'), { alvo: null });
  assert.equal(netrun.alvoDaHabilidade(arq, est, eu, 'virus').erro, 'O Virus só vai no andar mais fundo da arquitetura.');
  assert.equal(netrun.alvoDaHabilidade(arq, est, eu, 'zap').erro, 'Não há inimigo ativo neste andar.');
  assert.equal(netrun.alvoDaHabilidade(arq, est, eu, 'scanner').erro, 'Esta habilidade não se usa na NET.');
  // Breach (o Backdoor do RED, com o nome do Kit): 6 contra a DV 6 não passa (tem de passar da DV); 9 quebra, e a senha não
  // é mais alvo nem trava a descida.
  const { alvo: senha } = netrun.alvoDaHabilidade(arq, est, eu, 'backdoor');
  assert.deepEqual(netrun.resolverHabilidade(arq, est, eu, { chave: 'backdoor', alvo: senha, total: 6 }), { texto: 'Breach (6 contra DV 6): Deck não passou a senha.', tipo: 'falha' });
  assert.deepEqual(est.feitos, []);
  assert.deepEqual(netrun.resolverHabilidade(arq, est, eu, { chave: 'backdoor', alvo: senha, total: 9 }), { texto: 'Breach (9 contra DV 6): Deck quebrou a senha.', tipo: 'ok' });
  assert.deepEqual(est.feitos, ['1a.0']);
  assert.equal(netrun.alvoDaHabilidade(arq, est, eu, 'backdoor').erro, 'Não há senha trancada neste andar.');
  assert.equal(netrun.motivoParaNaoAndar(arq, est, eu, '2a'), null);
  // Eye-Dee no 2A: identificado, o registro conta o que o arquivo é; o mapa público mostra o nome e a descrição só agora.
  eu.no = '2a';
  est.vistos = ['1a', '2a'];
  const { alvo: arquivo } = netrun.alvoDaHabilidade(arq, est, eu, 'eyedee');
  assert.equal(netrun.vistaPublica(arq, { ...est, corredores: [eu] }).find(no => no.id === '2a').conteudos[0].descricao, undefined);
  assert.deepEqual(netrun.resolverHabilidade(arq, est, eu, { chave: 'eyedee', alvo: arquivo, total: 10 }), { texto: 'Eye-Dee (10 contra DV 8): Deck identificou o arquivo (Folha de pagamento: Os salários da clínica).', tipo: 'ok' });
  // (o diário do arquivo copiado vem do motor, arquivos.mjs: aqui não há nenhum.)
  assert.deepEqual(netrun.vistaPublica(arq, { ...est, corredores: [eu] }).find(no => no.id === '2a').conteudos[0], { chave: '2a.0', tipo: 'arquivo', dv: 8, feito: true, nome: 'Folha de pagamento', descricao: 'Os salários da clínica.', diario: '' });
  // Pathfinder do 2A com 7: o 3A (o nó DV 8, maior que 7) aparece e barra o 4A; o 3B aparece. De novo, nada novo.
  assert.deepEqual(netrun.resolverHabilidade(arq, est, eu, { chave: 'pathfinder', total: 7 }), { texto: 'Pathfinder (7): Deck revelou 2 andares.', tipo: 'ok' });
  assert.deepEqual(est.vistos, ['1a', '2a', '3a', '3b']);
  assert.deepEqual(netrun.resolverHabilidade(arq, est, eu, { chave: 'pathfinder', total: 7 }), { texto: 'Pathfinder (7): nada novo à vista.', tipo: 'falha' });
  // Control no 3A; o Cloak põe o total como a DV dos rastros; o Virus no 3B (o fundo), contra a DV do mestre.
  eu.no = '3a';
  const { alvo: no } = netrun.alvoDaHabilidade(arq, est, eu, 'control');
  assert.deepEqual(netrun.resolverHabilidade(arq, est, eu, { chave: 'control', alvo: no, total: 11 }), { texto: 'Control (11 contra DV 8): Deck tomou o nó de controle (As câmeras do saguão).', tipo: 'ok' });
  assert.deepEqual(netrun.resolverHabilidade(arq, est, eu, { chave: 'cloak', total: 13 }), { texto: 'Cloak (13): Deck escondeu os rastros (DV 13 para achá-los).', tipo: 'ok' });
  assert.equal(eu.rastro, 13);
  eu.no = '3b';
  assert.deepEqual(netrun.alvoDaHabilidade(arq, est, eu, 'virus'), { alvo: null });
  assert.deepEqual(netrun.resolverHabilidade(arq, est, eu, { chave: 'virus', total: 12, dvVirus: 10, texto: 'Apaga a portaria' }), { texto: 'Virus (12 contra DV 10): Deck deixou o vírus “Apaga a portaria” (DV 12 para tirá-lo).', tipo: 'ok' });
  assert.equal(netrun.resolverHabilidade(arq, est, eu, { chave: 'virus', total: 10, dvVirus: 10, texto: 'x' }).tipo, 'falha');
  // As Ações NET: fora de combate não contam; em combate, as do Rank (3); o mestre passa do limite; o Virus pede as dele.
  assert.equal(netrun.gastarAcoes(eu, { emCombate: false, quantas: 5 }), null);
  assert.equal(eu.acoes, 0);
  assert.equal(netrun.gastarAcoes(eu, { emCombate: true }), null);
  assert.equal(netrun.gastarAcoes(eu, { emCombate: true, quantas: 2 }), null);
  assert.equal(netrun.gastarAcoes(eu, { emCombate: true }), 'Sem Ações NET neste turno (3 de 3).');
  assert.equal(eu.acoes, 3);
  assert.equal(netrun.gastarAcoes(eu, { emCombate: true, mestre: true }), null);
  assert.equal(eu.acoes, 4);
});

test('Os inimigos no andar (o NET Architect da mesa; wiki, "Habilidades de Interface": o Zap e o Slide, RED p. 199–201): o Black ICE e o demônio seguram a descida, e o Black ICE driblado pelo Slide e o derrubado não; o netrunner inimigo não segura; o Zap tira da REZ (o empate é da defesa) e derruba em 0; o Slide, uma vez por turno; a REZ entre 0 e a da tabela', () => {
  const regrasDaWiki = fs.readFileSync(path.join(raiz, 'system-rules.js'), 'utf8');
  assert.ok(regrasDaWiki.includes("['Slide', '1 Ação NET (1×/turno)', 'contra PER do Black ICE + 1d10', 'Foge de um Black ICE não demoníaco para um andar vizinho (não atravessa senha).']"));
  assert.ok(regrasDaWiki.includes("['Zap', '1 Ação NET', 'contra DEF do programa + 1d10 ou Interface + 1d10', '1d6 de dano no REZ de um programa ou direto no cérebro de um netrunner.']"));
  const arq = arquitetura.lerArquitetura({ andares: [
    { andar: 1, ramo: 'a', tipo: 'ice', ice: 'hellhound' }, { andar: 1, ramo: 'a', tipo: 'netrunner', nome: 'Raposa' },
    { andar: 2, ramo: 'a', tipo: 'demonio', demonio: 'imp' }, { andar: 3, ramo: 'a', tipo: 'vazio' }
  ] });
  const est = { mapa: false, vistos: [], feitos: [], ices: [], fora: [], corredores: [] };
  const eu = { nome: 'Deck', no: '1a', escapou: [], acoes: 0, max: 3 };
  const hellhound = BLACK_ICE.find(ice => ice.id === 'hellhound');
  const imp = DEMONIOS.find(demonio => demonio.id === 'imp');
  const [ice, raposa] = netrun.conteudosDoNo(arq, '1a');
  // No 1A: o Hellhound e a Raposa estão ativos; só o Hellhound segura a descida; subir é livre.
  assert.deepEqual(netrun.inimigosAtivos(arq, est, '1a').map(conteudo => conteudo.chave), ['1a.0', '1a.1']);
  assert.deepEqual(netrun.quemSegura(arq, est, eu).map(conteudo => conteudo.chave), ['1a.0']);
  assert.equal(netrun.motivoParaNaoAndar(arq, est, eu, '2a'), 'O Hellhound deste andar te segura: derrube a REZ dele ou use o Slide.');
  assert.equal(netrun.motivoParaNaoAndar(arq, est, eu, arquitetura.ENTRADA), null);
  assert.equal(netrun.resumoDoAndar(arq, '1a'), 'Hellhound, Raposa');
  // O alvo: o Zap em qualquer inimigo (o pedido, a Raposa); o Slide só no Black ICE.
  assert.equal(netrun.alvoDaHabilidade(arq, est, eu, 'zap').alvo.chave, '1a.0');
  assert.equal(netrun.alvoDaHabilidade(arq, est, eu, 'zap', '1a.1').alvo.chave, '1a.1');
  assert.equal(netrun.alvoDaHabilidade(arq, est, eu, 'slide', '1a.1').alvo.chave, '1a.0');
  // O Zap: o empate é da defesa; acertando, o dano sai da REZ do Hellhound; na Raposa, vai ao cérebro.
  assert.deepEqual(netrun.resolverZap(est, eu, ice, { total: 9, defesa: 9 }), { texto: 'Zap (9 contra 9): Deck errou o Hellhound.', tipo: 'falha', acertou: false });
  assert.deepEqual(netrun.resolverZap(est, eu, ice, { total: 10, defesa: 5, dano: 4 }), { texto: `Zap (10 contra 5): Deck acertou o Hellhound: 4 de REZ, fica com ${hellhound.rez - 4}.`, tipo: 'ok', acertou: true });
  assert.equal(netrun.rezDe(est, ice), hellhound.rez - 4);
  assert.deepEqual(netrun.resolverZap(est, eu, raposa, { total: 10, defesa: 5, dano: 3 }), { texto: 'Zap (10 contra 5): Deck acertou Raposa: 3 no cérebro.', tipo: 'ok', acertou: true });
  // O Slide: o empate é do ICE; passando, o Hellhound não segura mais.
  assert.deepEqual(netrun.resolverSlide(eu, ice, { total: 8, per: 8 }), { texto: 'Slide (8 contra 8): o Hellhound não larga Deck.', tipo: 'falha' });
  assert.deepEqual(netrun.resolverSlide(eu, ice, { total: 11, per: 8 }), { texto: 'Slide (11 contra 8): Deck escapou do Hellhound e pode seguir para um andar vizinho.', tipo: 'ok' });
  assert.deepEqual(netrun.quemSegura(arq, est, eu), []);
  assert.equal(netrun.motivoParaNaoAndar(arq, est, eu, '2a'), null);
  // O Slide é uma vez por turno, em combate; fora de combate, não há turno.
  assert.equal(netrun.motivoParaNaoSlide({ slides: 1 }, true), 'O Slide é uma vez por turno.');
  assert.equal(netrun.motivoParaNaoSlide({ slides: 1 }, false), null);
  assert.equal(netrun.motivoParaNaoSlide({}, true), null);
  // No 2A, o demônio segura e não se dribla; derrubado (a REZ não passa de 0 para baixo), não segura nem é alvo.
  Object.assign(eu, { no: '2a', escapou: [] });
  const [demonio] = netrun.conteudosDoNo(arq, '2a');
  assert.equal(netrun.motivoParaNaoAndar(arq, est, eu, '3a'), 'O demônio Imp te segura: derrube a REZ dele (o Slide não funciona contra demônios).');
  assert.equal(netrun.alvoDaHabilidade(arq, est, eu, 'slide').erro, 'Não há Black ICE ativo neste andar (o Slide não funciona contra demônios nem netrunners).');
  assert.deepEqual(netrun.resolverZap(est, eu, demonio, { total: 12, defesa: 4, dano: 6 }), { texto: `Zap (12 contra 4): Deck acertou o Imp: 6 de REZ, fica com ${imp.rez - 6}.`, tipo: 'ok', acertou: true });
  assert.equal(netrun.mudarRez(est, demonio, -3), 0);
  assert.equal(netrun.motivoParaNaoAndar(arq, est, eu, '3a'), null);
  assert.equal(netrun.alvoDaHabilidade(arq, est, eu, 'zap').erro, 'Não há inimigo ativo neste andar.');
  // O mapa dos jogadores: o Imp derrubado fica "feito", com os números da wiki; a Raposa, na NET.
  est.vistos = ['1a', '2a'];
  const mapa = netrun.vistaPublica(arq, { ...est, corredores: [eu] });
  assert.deepEqual(mapa.find(no => no.id === '2a').conteudos[0], {
    chave: '2a.0', tipo: 'demonio', dv: null, feito: true, inimigo: { nome: 'Imp', interface: imp.interface, acoes: imp.acoes, valorDeCombate: imp.valorDeCombate, rez: imp.rez, rezAtual: 0 }
  });
  assert.deepEqual(mapa.find(no => no.id === '1a').conteudos[1].inimigo, { nome: 'Raposa', ativo: true });
  // A REZ cheia de volta (o mestre) e o conteúdo pela chave.
  assert.equal(netrun.mudarRez(est, demonio, Infinity), imp.rez);
  assert.equal(netrun.acharConteudo(arq, '2a.0').no.id, '2a');
  assert.equal(netrun.acharConteudo(arq, '9z.0'), null);
});

test('Os ataques dos inimigos e os efeitos do Black ICE (wiki, "Black ICE", RED p. 204–207; o NET Architect da mesa): a velocidade no encontro (o empate não é do ICE), o ataque contra a Interface + 1d10 (o empate é da defesa), quem pode atacar, o efeito de cada um dos 12 da tabela, o Kraken, o Wisp, o Skunk, a desconexão insegura e o hardware do deck (o Insulated Wiring e a KRASH Barrier)', () => {
  const regrasDaWiki = fs.readFileSync(path.join(raiz, 'system-rules.js'), 'utf8');
  assert.ok(regrasDaWiki.includes('Ao encontrar Black ICE à espreita: <b>Interface + bônus de velocidade + 1d10</b> contra <b>SPD do ICE + 1d10</b>. Se o ICE vencer, você sofre o efeito na hora.'));
  assert.ok(regrasDaWiki.includes('Depois ele entra no <b>topo da fila de iniciativa</b> e ataca uma vez por turno (ATK + 1d10 contra Interface + 1d10) até ser desativado ou driblado com Slide.'));
  assert.ok(regrasDaWiki.includes("['Insulated Wiring', 'O deck não pega fogo por efeito de programa.', '1', '100eb'], ['KRASH Barrier', 'Imune a efeitos que forçam desconexão.', '2', '100eb']"));
  // O efeito de cada Black ICE da tabela: os que dão dano no cérebro têm a fórmula; os anti-programa, no REZ de um programa.
  assert.deepEqual(Object.keys(netrun.EFEITOS_DO_ICE).sort(), BLACK_ICE.map(ice => ice.id).sort());
  for (const ice of BLACK_ICE) {
    const efeito = netrun.efeitoDoIce(ice.id);
    assert.equal(Boolean(efeito.programa), ice.classe === 'antiprogram', ice.id);
    if (efeito.cerebro || efeito.programa) assert.ok(regras.formulaDeDano(ice.dano), ice.id);
  }
  assert.deepEqual(netrun.efeitoDoIce('feito-pelo-mestre'), { cerebro: true });
  assert.deepEqual(netrun.efeitoDoIce('liche').penalidade, ['int', 'ref', 'dex']);
  assert.deepEqual(netrun.efeitoDoIce('scorpion').penalidade, ['move']);
  const arq = arquitetura.lerArquitetura({ andares: [
    { andar: 1, ramo: 'a', tipo: 'ice', ice: 'skunk' }, { andar: 1, ramo: 'a', tipo: 'ice', ice: 'kraken' }, { andar: 1, ramo: 'a', tipo: 'demonio', demonio: 'imp' },
    { andar: 1, ramo: 'a', tipo: 'netrunner', nome: 'Raposa' }, { andar: 2, ramo: 'a', tipo: 'ice', ice: 'skunk' }, { andar: 3, ramo: 'a', tipo: 'vazio' }
  ] });
  const est = { mapa: false, vistos: [], feitos: [], ices: [], fora: [], corredores: [] };
  const eu = { nome: 'Deck', no: '1a', escapou: [], engajado: ['1a.0', '1a.1', '1a.2', '1a.3'], acoes: 0, max: 3 };
  const [skunk, kraken, imp, raposa] = netrun.conteudosDoNo(arq, '1a');
  // A velocidade: o ICE que passa age na hora; o empate é do netrunner (a wiki: "se o ICE vencer").
  assert.deepEqual(netrun.resolverVelocidade(eu, kraken, { meu: 9, dele: 9 }), { iceVence: false, texto: 'Velocidade (9 contra 9): Deck viu o Kraken a tempo.', tipo: 'ok' });
  assert.deepEqual(netrun.resolverVelocidade(eu, kraken, { meu: 8, dele: 9 }), { iceVence: true, texto: 'Velocidade (8 contra 9): o Kraken foi mais rápido e age na hora.', tipo: 'falha' });
  // O ataque: o Black ICE ataca; o demônio e o netrunner inimigo usam o Zap; o empate é da defesa.
  assert.deepEqual(netrun.resolverAtaque(eu, kraken, { ataque: 12, defesa: 12 }), { acertou: false, texto: 'O Kraken ataca (12 contra 12), e Deck se defende.', tipo: 'ok' });
  assert.deepEqual(netrun.resolverAtaque(eu, kraken, { ataque: 13, defesa: 12 }), { acertou: true, texto: 'O Kraken ataca (13 contra 12) e acerta Deck.', tipo: 'falha' });
  assert.equal(netrun.resolverAtaque(eu, imp, { ataque: 9, defesa: 4 }).texto, 'O Imp usa o Zap (9 contra 4) e acerta Deck.');
  assert.equal(netrun.resolverAtaque(eu, raposa, { ataque: 9, defesa: 4 }).texto, 'Raposa usa o Zap (9 contra 4) e acerta Deck.');
  // Quem ataca: todos os ativos do andar; o Black ICE driblado com o Slide, não.
  assert.deepEqual(netrun.inimigosQueAtacam(arq, est, eu).map(conteudo => conteudo.chave), ['1a.0', '1a.1', '1a.2', '1a.3']);
  eu.escapou = ['1a.1'];
  assert.deepEqual(netrun.inimigosQueAtacam(arq, est, eu).map(conteudo => conteudo.chave), ['1a.0', '1a.2', '1a.3']);
  // A desconexão insegura: o Black ICE encontrado e ativo age (o driblado também; a wiki), menos o que causou a queda;
  // o demônio e o netrunner inimigo, não; o derrubado, não.
  assert.deepEqual(netrun.iceDaQueda(arq, est, eu).map(conteudo => conteudo.chave), ['1a.0', '1a.1']);
  assert.deepEqual(netrun.iceDaQueda(arq, est, eu, '1a.1').map(conteudo => conteudo.chave), ['1a.0']);
  // O Skunk: −2 no Slide por Skunk ativo que acertou (acumula); o derrubado não conta.
  eu.skunks = ['1a.0', '2a.0'];
  assert.equal(netrun.penalidadeDoSkunk(arq, est, eu), -4);
  netrun.mudarRez(est, skunk, 0);
  assert.equal(netrun.penalidadeDoSkunk(arq, est, eu), -2);
  assert.deepEqual(netrun.iceDaQueda(arq, est, eu).map(conteudo => conteudo.chave), ['1a.1']);
  // O Kraken: até o fim do próximo turno, não avança nem desconecta com segurança (a prisão anda no começo do turno).
  Object.assign(eu, { preso: netrun.PRISAO_DO_KRAKEN, escapou: ['1a.1'] });
  netrun.mudarRez(est, imp, 0);
  assert.equal(netrun.motivoParaNaoAndar(arq, est, eu, '2a'), 'O Kraken te prende: até o fim do seu próximo turno, não dá para avançar.');
  assert.equal(netrun.motivoParaNaoAndar(arq, est, eu, arquitetura.ENTRADA), null);
  assert.equal(netrun.motivoParaNaoDesconectar(eu), 'O Kraken te prende: até o fim do seu próximo turno, só a desconexão insegura.');
  // O começo do turno: a prisão anda (2 → 1, ainda preso; 1 → 0, livre), o Wisp tira 1 Ação NET (mínimo 2 livres) e o
  // Slide volta.
  Object.assign(eu, { acoes: 3, menosAcoes: 1, slides: 1 });
  assert.equal(netrun.comecoDoTurno(eu), 1);
  assert.deepEqual([eu.acoes, eu.menosAcoes, eu.preso, eu.slides], [1, 0, 1, 0]);
  assert.ok(netrun.motivoParaNaoDesconectar(eu));
  assert.equal(netrun.comecoDoTurno(eu), 0);
  assert.deepEqual([eu.acoes, eu.preso], [0, 0]);
  assert.equal(netrun.motivoParaNaoDesconectar(eu), null);
  assert.equal(netrun.motivoParaNaoAndar(arq, est, eu, '2a'), null);
  assert.equal(netrun.comecoDoTurno({ max: 2, menosAcoes: 1 }), 0);
  // O hardware do deck: o Insulated Wiring e a KRASH Barrier, pelo catálogo ou pelo nome, instalados no deck equipado.
  const deck = { id: 'deck', type: 'cyberdeck', name: 'Deck', system: { uso: 'equipado' } };
  const hardware = (catalogo, nome, instaladoEm = 'deck') => ({ id: catalogo, type: 'upgrade', name: nome, system: { instaladoEm }, flags: { 'cpr-fieldbook': { catalogo } } });
  const n = netrun.netrunnerDo({ system: { rankDeInterface: 4 }, items: [deck, hardware('core_upgrades:insulated-wiring', 'Fiação isolada'), { ...hardware('x', 'KRASH Barrier'), flags: {} }] });
  assert.deepEqual([n.isolado, n.krash, n.rangeUpgrade], [true, true, false]);
  const semHardware = netrun.netrunnerDo({ system: {}, items: [deck, hardware('core_upgrades:krash-barrier', 'KRASH Barrier', '')] });
  assert.deepEqual([semHardware.isolado, semHardware.krash, semHardware.rangeUpgrade], [false, false, false]);
});

test('O deck na janela da NET (wiki, "Ações NET": "Ativar ou desativar um programa: 1 Ação NET. Cada programa uma vez por rodada"; "Programas: ataque": "Desativam sozinhos depois de usados"; "Combate na NET"): uma vez por rodada em combate, a REZ em 0 que não ativa, o alvo do anti-programa e do anti-pessoal, e o ataque do programa (o empate é da defesa)', () => {
  const regrasDaWiki = fs.readFileSync(path.join(raiz, 'system-rules.js'), 'utf8');
  const paginaDaNet = fs.readFileSync(path.join(raiz, 'system-net.js'), 'utf8');
  assert.ok(regrasDaWiki.includes('<b>Ativar ou desativar um programa</b>: 1 Ação NET. Cada programa uma vez por rodada.'));
  assert.ok(regrasDaWiki.includes("'Programa anti-pessoal só afeta netrunners; anti-programa só afeta programas.'"));
  assert.ok(paginaDaNet.includes('Desativam sozinhos depois de usados.'));
  const programa = (nome, classe, extra = {}) => ({ id: nome, name: nome, system: { classe, rez: 0, rezPerdida: 0, ativo: false, ...extra } });
  const sword = programa('Sword', 'antiprogramattacker');
  const hellbolt = programa('Hellbolt', 'antipersonnelattacker');
  const armor = programa('Armor', 'defender', { rez: 7, rezPerdida: 7 });
  const eu = { nome: 'Deck', no: '1a', programasNaRodada: ['Sword'] };
  // Uma vez por rodada, só em combate.
  assert.equal(netrun.motivoParaNaoMudarPrograma(sword, eu, { emCombate: true, ativar: true }), 'Cada programa só pode ser ativado ou desativado uma vez por rodada.');
  assert.equal(netrun.motivoParaNaoMudarPrograma(sword, eu, { emCombate: false, ativar: true }), null);
  // O programa com REZ em 0 não ativa (desativar, sim); o de ataque, sem REZ, ativa.
  assert.equal(netrun.motivoParaNaoMudarPrograma(armor, eu, { emCombate: false, ativar: true }), 'Armor está com a REZ em 0.');
  assert.equal(netrun.motivoParaNaoMudarPrograma(armor, eu, { emCombate: false, ativar: false }), null);
  assert.equal(netrun.motivoParaNaoMudarPrograma(hellbolt, eu, { emCombate: true, ativar: true }), null);
  // O alvo: o anti-programa no Black ICE e no demônio; o anti-pessoal no netrunner inimigo; o de outra classe, recusado.
  const arq = arquitetura.lerArquitetura({ andares: [
    { andar: 1, ramo: 'a', tipo: 'ice', ice: 'hellhound' }, { andar: 1, ramo: 'a', tipo: 'demonio', demonio: 'imp' }, { andar: 1, ramo: 'a', tipo: 'netrunner', nome: 'Raposa' }
  ] });
  const est = { mapa: false, vistos: [], feitos: [], ices: [], fora: [], corredores: [] };
  assert.equal(netrun.alvoDoPrograma(arq, est, eu, sword).alvo.chave, '1a.0');
  assert.equal(netrun.alvoDoPrograma(arq, est, eu, sword, '1a.1').alvo.chave, '1a.1');
  assert.equal(netrun.alvoDoPrograma(arq, est, eu, sword, '1a.2').erro, 'Sword é anti-programa: só afeta o Black ICE e os demônios.');
  assert.equal(netrun.alvoDoPrograma(arq, est, eu, hellbolt).alvo.chave, '1a.2');
  assert.equal(netrun.alvoDoPrograma(arq, est, eu, hellbolt, '1a.0').erro, 'Hellbolt é anti-pessoal: só afeta netrunners.');
  // O ataque: o empate é da defesa; acertando, o dano em Black ICE sai da REZ (20 − 11).
  const [ice] = netrun.conteudosDoNo(arq, '1a');
  assert.deepEqual(netrun.resolverAtaqueDePrograma(est, eu, sword, ice, { ataque: 8, defesa: 8 }), { texto: 'Sword (8 contra 8): Deck errou o Hellhound.', tipo: 'falha', acertou: false });
  assert.deepEqual(netrun.resolverAtaqueDePrograma(est, eu, sword, ice, { ataque: 12, defesa: 8, dano: 11 }), { texto: 'Sword (12 contra 8): Deck acertou o Hellhound: 11 de REZ, fica com 9.', tipo: 'ok', acertou: true });
  // O netrunner inimigo fora da NET não é mais alvo.
  est.fora = ['1a.2'];
  assert.equal(netrun.alvoDoPrograma(arq, est, eu, hellbolt).erro, 'Não há netrunner inimigo ativo neste andar.');
});

test('O combate na NET (o NET Architect da mesa; wiki, "Black ICE" e "Demônios", RED p. 204 e 212: o Black ICE "entra no topo da fila de iniciativa"): a frase da chegada só com quem segura a descida, e quem o inimigo ataca na vez dele', () => {
  const regrasDaWiki = fs.readFileSync(path.join(raiz, 'system-rules.js'), 'utf8');
  assert.ok(regrasDaWiki.includes('Depois ele entra no <b>topo da fila de iniciativa</b> e ataca uma vez por turno (ATK + 1d10 contra Interface + 1d10) até ser desativado ou driblado com Slide.'));
  assert.ok(regrasDaWiki.includes('Entra no topo da iniciativa quando detecta um intruso'));
  const arq = arquitetura.lerArquitetura({ andares: [
    { andar: 1, ramo: 'a', tipo: 'ice', ice: 'hellhound' }, { andar: 1, ramo: 'a', tipo: 'netrunner', nome: 'Raposa' },
    { andar: 2, ramo: 'a', tipo: 'demonio', demonio: 'imp' }, { andar: 2, ramo: 'a', tipo: 'ice', ice: 'wisp' }, { andar: 3, ramo: 'a', tipo: 'netrunner', nome: 'Lobo' }
  ] });
  const deck = { nome: 'Deck', token: 't1', no: '1a', escapou: [] };
  const outro = { nome: 'Outro', token: 't2', no: '2a', escapou: [] };
  const est = { mapa: false, vistos: [], feitos: [], ices: [], fora: [], corredores: [deck, outro] };
  // A frase da chegada: só quem segura a descida (o netrunner inimigo, não; o encontro fala dele).
  assert.equal(netrun.fraseDaChegada(arq, est, deck), 'Hellhound está neste andar: o Black ICE e o demônio seguram a descida até caírem.');
  assert.equal(netrun.fraseDaChegada(arq, est, outro), 'Imp e Wisp estão neste andar: o Black ICE e o demônio seguram a descida até caírem.');
  assert.equal(netrun.fraseDaChegada(arq, est, { ...deck, no: '3a' }), null);
  // Na vez do inimigo, ele ataca os netrunners do andar dele.
  const nomes = chave => netrun.alvosDoInimigo(arq, est, chave).map(corredor => corredor.nome);
  assert.deepEqual(nomes('1a.0'), ['Deck']);
  assert.deepEqual(nomes('1a.1'), ['Deck']);
  assert.deepEqual(nomes('2a.0'), ['Outro']);
  assert.deepEqual(nomes('3a.0'), []);
  // O Black ICE driblado com o Slide não ataca quem o driblou; o netrunner inimigo, sim.
  deck.escapou = ['1a.0'];
  assert.deepEqual(nomes('1a.0'), []);
  assert.deepEqual(nomes('1a.1'), ['Deck']);
  // O demônio com a REZ em 0 e o netrunner inimigo fora da NET não atacam.
  netrun.mudarRez(est, netrun.conteudosDoNo(arq, '2a')[0], 0);
  est.fora = ['1a.1'];
  assert.deepEqual(nomes('2a.0'), []);
  assert.deepEqual(nomes('1a.1'), []);
  assert.deepEqual(nomes('2a.1'), ['Outro']);
});

test('O jogador rola na NET (o NET Architect da mesa, o rolagens.mjs): quem rola (o jogador que pediu; na reação, o dono conectado; senão, o mestre) e a resposta dele (o total; a ação cancelada; sem resposta, o mestre rola)', () => {
  const mestre = { name: 'Mestre', isGM: true, active: true };
  const jogador = { name: 'Jogador', isGM: false, active: true };
  const ausente = { name: 'Ausente', isGM: false, active: false };
  // Desligado, o mestre rola sempre.
  assert.equal(netrun.quemRolaNaNet({ ligado: false, pediu: jogador, reacao: false, dono: jogador }), null);
  // A ação: o jogador que pediu rola; o mestre que pediu rola ele mesmo.
  assert.equal(netrun.quemRolaNaNet({ ligado: true, pediu: jogador, reacao: false, dono: null }), jogador);
  assert.equal(netrun.quemRolaNaNet({ ligado: true, pediu: mestre, reacao: false, dono: jogador }), null);
  // A reação pedida pelo mestre (o ataque do inimigo): o dono conectado; desconectado, ou sem dono, o mestre.
  assert.equal(netrun.quemRolaNaNet({ ligado: true, pediu: mestre, reacao: true, dono: jogador }), jogador);
  assert.equal(netrun.quemRolaNaNet({ ligado: true, pediu: mestre, reacao: true, dono: ausente }), null);
  assert.equal(netrun.quemRolaNaNet({ ligado: true, pediu: mestre, reacao: true, dono: null }), null);
  // A resposta: o total (até 0); a ação cancelada é recusada; a reação fechada e o prazo vencido, o mestre rola.
  const quem = { jogador: 'Jogador', netrunner: 'Deck' };
  assert.deepEqual(netrun.respostaDoJogador({ total: 12 }, { reacao: false, ...quem }), { total: 12 });
  assert.deepEqual(netrun.respostaDoJogador({ total: 0 }, { reacao: true, ...quem }), { total: 0 });
  assert.deepEqual(netrun.respostaDoJogador({ cancelado: true }, { reacao: false, ...quem }), { erro: 'Rolagem cancelada: nada aconteceu.' });
  assert.deepEqual(netrun.respostaDoJogador({ cancelado: true }, { reacao: true, ...quem }), { registro: 'Jogador fechou a janela: o mestre rolou por Deck.' });
  assert.deepEqual(netrun.respostaDoJogador(null, { reacao: false, ...quem }), { registro: 'Jogador não rolou a tempo: o mestre rolou por Deck.' });
});

test('Sorte (wiki, RED p. 130): os pontos preparados para o próximo teste vão de 0 até a Sorte que resta', () => {
  assert.equal(regras.sorteParaGastar(2, 5), 2);
  assert.equal(regras.sorteParaGastar(7, 5), 5);
  assert.equal(regras.sorteParaGastar(-1, 5), 0);
  assert.equal(regras.sorteParaGastar(2.7, 5), 2);
  assert.equal(regras.sorteParaGastar('x', 5), 0);
  assert.equal(regras.sorteParaGastar(3, 0), 0);
});

test('Pontos de Role por Rank: no Rank 4 dão os números que o criador da wiki dá (Solo 4, Tech 8, Medtech 4, até 4 em cada); o Tech ganha 2 por Rank', () => {
  for (const [id, wikiRole] of Object.entries(HABILIDADES_DE_ROLE)) {
    assert.deepEqual(regras.pontosDeRole(id, 4), { total: wikiRole.pontos, max: wikiRole.max }, id);
  }
  assert.deepEqual(regras.pontosDeRole('tech', 6), { total: 12, max: 6 });
  assert.deepEqual(regras.pontosDeRole('medtech', 2), { total: 2, max: 2 });
  assert.equal(regras.pontosDeRole('netrunner', 4), null);
});

test('Extrato (o ledger do CORE, cpr-actor-sheet.js _gainLedger/_loseLedger/_setLedger): somar soma o valor como veio, subtrair sempre tira, definir troca o saldo', () => {
  assert.equal(regras.novoSaldo(500, 'somar', 100), 600);
  assert.equal(regras.novoSaldo(500, 'somar', -100), 400);
  assert.equal(regras.novoSaldo(500, 'subtrair', 100), 400);
  assert.equal(regras.novoSaldo(500, 'subtrair', -100), 400);
  assert.equal(regras.novoSaldo(50, 'subtrair', 80), -30);
  assert.equal(regras.novoSaldo(500, 'definir', 50), 50);
  assert.equal(regras.novoSaldo(500, 'somar', 12.9), 512);
  assert.equal(regras.novoSaldo(500, 'somar', 'x'), 500);
  // A linha: a diferença e o saldo depois, o motivo sem espaços nas pontas e quem mudou.
  const linha = regras.linhaDoExtrato({ acao: 'subtrair', antes: 500, saldo: 400, motivo: '  Munição  ', usuario: 'Gamemaster', quando: '2026-10-12T10:00:00.000Z' });
  assert.deepEqual(linha, { quando: '2026-10-12T10:00:00.000Z', acao: 'subtrair', delta: -100, saldo: 400, motivo: 'Munição', usuario: 'Gamemaster' });
  const inicial = regras.linhaDoExtrato({ acao: 'definir', antes: 0, saldo: 2500 });
  assert.deepEqual([inicial.delta, inicial.saldo, inicial.motivo, inicial.usuario], [2500, 2500, '', '']);
  assert.match(inicial.quando, /^\d{4}-\d\d-\d\dT\d\d:\d\d/);
});

test('Bônus de Role nas perícias (o item de Role do CORE, getRoleMods): das 10 Roles do RED, só o Moto do Nomad soma o Rank, nas seis perícias de veículo', () => {
  const moto = regras.bonusDeRole({ roleId: 'nomad', rank: 4 });
  assert.deepEqual(Object.keys(moto).sort(), [...regras.PERICIAS_DO_MOTO].sort());
  assert.ok(Object.values(moto).every(b => b.rotulo === 'Moto' && b.valor === 4));
  assert.equal(regras.bonusDeRole({ roleId: 'nomad', rank: 6 })['drive-land-vehicle'].valor, 6);
  assert.deepEqual(ROLES.map(r => r.id).sort(), ['exec', 'fixer', 'lawman', 'media', 'medtech', 'netrunner', 'nomad', 'rockerboy', 'solo', 'tech']);
  for (const roleId of ROLES.map(r => r.id).filter(id => id !== 'nomad')) assert.deepEqual(regras.bonusDeRole({ roleId, rank: 4 }), {}, roleId);
  assert.deepEqual(regras.bonusDeRole({ roleId: 'nomad', rank: 0 }), {});
});

test('As Roles do RED (wiki, desde o Mission Kit): as 10 do criador, sem especializações; as que saíram (Face e Corpo) viram a do RED de onde vinham; o Moto soma "a Dirigir, Pilotar e Tech de veículos"', () => {
  // O Moto: as seis perícias de veículo do CORE, e a frase da wiki.
  assert.deepEqual([...regras.PERICIAS_DO_MOTO].sort(), PERICIAS.filter(p => /Vehicle/.test(p.en)).map(p => p.id).sort());
  assert.match(fs.readFileSync(path.join(raiz, 'system-catalog.js'), 'utf8'), /<b>Moto:<\/b> soma o Rank a Dirigir, Pilotar e Tech de veículos terrestres, aéreos e marítimos/);
  // As Roles e as que saíram são as do criador da wiki (o roleAliases), e nenhuma tem especialização.
  const contexto = { window: {} };
  for (const arquivo of ['system-catalog.js', 'system-rules.js', 'system-criacao.js']) vm.runInNewContext(fs.readFileSync(path.join(raiz, arquivo), 'utf8'), contexto);
  const { roles, roleAliases } = contexto.window.systemCreation;
  assert.deepEqual(ROLES_ANTIGAS, { ...roleAliases });
  assert.deepEqual(ROLES_ANTIGAS, { face: 'rockerboy', corpo: 'exec' });
  assert.ok(Array.from(roles).every(role => !role.especializacoes) && ROLES.every(role => !role.especializacoes));
  // A wiki de 2026-10-17 (C29): o Face e o Corpo estão nas "Regras que saíram" do suplemento ("valem as dez Roles do
  // RED"); antes, "Com o Mission Kit, valem as 10 do RED, e os personagens que eram Face ou Corpo viram Rockerboy e Exec".
  const de2077 = fs.readFileSync(path.join(raiz, 'system-2077.js'), 'utf8');
  assert.ok(de2077.includes("section('Regras que saíram'"));
  assert.ok(de2077.includes('<b>Roles:</b> o Face e o Corpo (valem as dez Roles do RED), o Lawman com Investigator e o desconto do clã do Nomad.'));
  // A Role pelo nome, pelo id ou pela antiga.
  const id = nome => regras.acharRole(nome, ROLES, ROLES_ANTIGAS)?.id ?? null;
  assert.deepEqual(['Nomad', 'nomad', ' Rockerboy ', 'Face', 'face', 'Corpo', 'Exec', 'Cowboy', '', null].map(id), ['nomad', 'nomad', 'rockerboy', 'rockerboy', 'rockerboy', 'exec', 'exec', null, null, null]);
});

test('Rolagens de Role do RED (wiki, "As dez Roles do RED"; o item de Role do CORE): o Impacto Carismático e a Credibilidade (Rank + 1d10), a pechincha do Fixer (COOL + Negociação + Operator + 1d10) e o Backup do Lawman (1d10 até o Rank, e o d6 das rodadas)', () => {
  const catalogoDaWiki = fs.readFileSync(path.join(raiz, 'system-catalog.js'), 'utf8');
  assert.match(catalogoDaWiki, /<b>Impacto Carismático:<\/b>[^']*Rolagem: Rank \+ 1d10; DV 8 para uma pessoa, 10 para até seis, 12 para um grupo maior\./);
  assert.match(catalogoDaWiki, /<b>Credibility:<\/b>[^']*Rank \+ 1d10, pelo menos duas vezes por semana/);
  assert.match(catalogoDaWiki, /Haggling é um teste enfrentado de COOL \+ Trading \+ Operator \+ 1d10\./);
  assert.match(catalogoDaWiki, /<b>Backup \/ Reforços:<\/b> como ação, rola 1d10 e obtém resposta se o resultado for igual ou inferior ao Rank\. Um d6 determina em quantas rodadas chega o grupo; um 6 chama uma força um nível acima \(no Rank 10, dois grupos\)\./);
  assert.deepEqual(Object.keys(regras.ROLAGENS_DE_ROLE).sort(), ['fixer', 'lawman', 'media', 'medtech', 'rockerboy', 'tech']);
  assert.deepEqual(['rockerboy', 'media', 'fixer', 'lawman'].flatMap(id => regras.ROLAGENS_DE_ROLE[id]).map(r => [r.id, r.formula]), [
    ['impacto-carismatico', 'Rank + 1d10'], ['credibilidade', 'Rank + 1d10'], ['pechinchar', 'COOL + Negociação + Operator + 1d10'], ['backup', '1d10 até o Rank']
  ]);
  for (const id of Object.keys(regras.ROLAGENS_DE_ROLE)) assert.ok(ROLES.some(role => role.id === id), id);
  // A pechincha usa Trading (Negociação aqui), que é de COOL.
  const trading = PERICIAS.find(p => p.id === regras.ROLAGENS_DE_ROLE.fixer[0].pericia);
  assert.deepEqual([trading.en, trading.nome, trading.atributo], ['Trading', 'Negociação', 'cool']);
  // O Backup: vem com o d10 até o Rank; o 6 do d6 chama uma força um nível acima; no Rank 10, dois grupos.
  assert.deepEqual(regras.backup({ d10: 3, rank: 4, d6: 5 }), { veio: true, rodadas: 5, acima: false, grupos: 1 });
  assert.deepEqual(regras.backup({ d10: 4, rank: 4, d6: 6 }), { veio: true, rodadas: 6, acima: true, grupos: 1 });
  assert.deepEqual(regras.backup({ d10: 5, rank: 4 }), { veio: false, rodadas: null, acima: false, grupos: 0 });
  assert.deepEqual(regras.backup({ d10: 10, rank: 10, d6: 2 }), { veio: true, rodadas: 2, acima: false, grupos: 2 });
});

test('Rolagens de Role do Tech e do Medtech (wiki, "As dez Roles do RED", e o criador; o item de Role do CORE): as quatro Expertises (TECH + uma perícia de TECH a escolher + os pontos + 1d10) e a Cirurgia e a Tecnologia Médica (TECH + a perícia + 1d10), com o nível que vem das especialidades', () => {
  const catalogoDaWiki = fs.readFileSync(path.join(raiz, 'system-catalog.js'), 'utf8');
  assert.match(catalogoDaWiki, /<b>Maker \/ Artífice:<\/b> cada avanço concede um Rank em duas especialidades distintas\. Field Expertise soma o Rank a testes técnicos relevantes e permite reparos temporários; Upgrade Expertise melhora um item; Fabrication produz itens existentes; Invention projeta um item ou upgrade novo com aprovação do GM\./);
  assert.match(catalogoDaWiki, /<b>Medicine:<\/b> a cada Rank, coloca 1 ponto em uma especialidade\. Surgery aumenta a perícia Surgery em 2 por ponto \(máximo 10\); Pharmaceuticals aumenta Medical Tech e libera fármacos; Cryosystem Operation aumenta Medical Tech e libera cryopumps\/cryotanks\./);
  // As derivadas do criador (a Cirurgia e a Tecnologia Médica do Medtech) vão para o gerado.mjs como estão. JSON: os objetos
  // do contexto da wiki (vm) são de outro reino.
  const { roleAbilities } = daWiki('system-criacao.js', 'systemCreation');
  assert.deepEqual(HABILIDADES_DE_ROLE.medtech.derivadas, JSON.parse(JSON.stringify(roleAbilities.medtech.derivadas)));
  assert.deepEqual(Object.keys(HABILIDADES_DE_ROLE).filter(id => HABILIDADES_DE_ROLE[id].derivadas), ['medtech']);
  // Tech: uma rolagem por Expertise, com a chave e o nome do criador; TECH + uma perícia de TECH a escolher + os pontos.
  const { tech, medtech } = regras.ROLAGENS_DE_ROLE;
  assert.deepEqual(tech.map(r => [r.especialidade, r.rotulo]), HABILIDADES_DE_ROLE.tech.itens.map(item => [item.id, item.nome]));
  for (const r of tech) assert.deepEqual([r.atributo, r.escolherPericia, r.formula], ['tech', true, 'TECH + perícia + pontos + 1d10'], r.id);
  // As perícias de TECH para escolher: as 15 comuns e as de Tocar Instrumento (família).
  assert.equal(PERICIAS.filter(p => p.atributo === 'tech').length, 15);
  assert.deepEqual(Object.keys(FAMILIAS).filter(id => FAMILIAS[id].atributo === 'tech'), ['play-instrument']);
  // Medtech: a Cirurgia e a Tecnologia Médica, com TECH, pelas derivadas.
  assert.deepEqual(medtech.map(r => [r.id, r.derivada, r.atributo, r.formula]), [
    ['cirurgia', 'Surgery Skill', 'tech', 'TECH + Cirurgia + 1d10'], ['tecnologia-medica', 'Medical Tech Skill', 'tech', 'TECH + Tecnologia Médica + 1d10']
  ]);
  // O nível: a Cirurgia é 2 por ponto, até 10; a Tecnologia Médica, Farmacêutica + Criossistemas. Ponto negativo vale 0.
  const derivadas = HABILIDADES_DE_ROLE.medtech.derivadas;
  assert.deepEqual(regras.periciasDerivadas(derivadas, { Surgery: 2 }), { 'Surgery Skill': 4, 'Medical Tech Skill': 0 });
  assert.deepEqual(regras.periciasDerivadas(derivadas, { Surgery: 6 }), { 'Surgery Skill': 10, 'Medical Tech Skill': 0 });
  assert.deepEqual(regras.periciasDerivadas(derivadas, { Surgery: -1, 'Medical Tech (Pharmaceuticals)': 1, 'Medical Tech (Cryosystem Operation)': 2 }), { 'Surgery Skill': 0, 'Medical Tech Skill': 3 });
  assert.deepEqual(regras.periciasDerivadas(undefined, { Surgery: 2 }), {});
});

test('Janela de rolagem: os modificadores comuns são os da tabela da wiki (RED p. 130), com o valor de cada um', () => {
  const regrasDaWiki = fs.readFileSync(path.join(raiz, 'system-rules.js'), 'utf8');
  for (const { rotulo, valor } of regras.MODIFICADORES_COMUNS.filter(m => m.valor < 0)) assert.ok(regrasDaWiki.includes(`['${rotulo}', '−${Math.abs(valor)}']`), rotulo);
  assert.match(regrasDaWiki, /<b>Perícia complementar:<\/b>[^']*dá \+1/);
  assert.match(regrasDaWiki, /<b>Tempo extra:<\/b> aceitar levar 4× mais tempo dá \+1/);
  assert.deepEqual(regras.MODIFICADORES_COMUNS.filter(m => m.valor > 0).map(m => [m.id, m.valor]), [['complementar', 1], ['tempo-extra', 1]]);
  assert.equal(new Set(regras.MODIFICADORES_COMUNS.map(m => m.id)).size, 12);
});

test('Sem situacionais de Role no RED: o Investigator do Lawman e a Interface do Netrunner de 2077 saíram com o Mission Kit (a wiki de 2026-10-17: o Investigator nas "Regras que saíram", sem a seção de opcional)', () => {
  assert.equal(regras.situacionaisDeRole, undefined);
  const texto2077 = fs.readFileSync(path.join(raiz, 'system-2077.js'), 'utf8');
  // Antes da wiki de 2026-10-17 (C29), o Investigator ficava "como opcional" numa seção própria; agora saiu.
  assert.ok(texto2077.includes('o Lawman com Investigator e o desconto do clã do Nomad.'));
  assert.doesNotMatch(texto2077, /section\('Lawman com Investigator \(suplemento de fã\)'/);
  assert.doesNotMatch(texto2077, /Ficam, como opcionais, as duas regras abaixo\./);
});

test('Situacionais do CORE no catálogo: cada mudança situacional vira um efeito à parte, com o alvo e o "ligado por padrão" do CORE; o que vale sempre fica no efeito de sempre', () => {
  const sit = id => catalogo[id].effects.filter(e => e.system.situacional?.sim).map(e => [e.system.situacional.alvo, e.system.changes.map(c => `${c.key.replace('system.bonus.', '')}=${c.value}`).join(), e.system.situacional.ligadoPorPadrao]);
  assert.deepEqual(sit('core_cyberware:amplified-hearing'), [['Percepção pela audição', 'pericias.perception=2', false]]);
  assert.deepEqual(sit('core_cyberware:image-enhance'), [['Leitura Labial', 'pericias.lip-reading=2', false], ['Esconder/Revelar Objeto', 'pericias.conceal-reveal-object=2', false], ['Percepção pela visão', 'pericias.perception=2', false]]);
  assert.deepEqual(sit('core_critical-injuries-body:crushed-fingers'), [['Todas as ações com as mãos', 'todasAcoes=-4', false]]);
  assert.deepEqual(sit('core_critical-injuries-head:broken-jaw'), [['Todas as ações com a fala', 'todasAcoes=-4', false]]);
  assert.deepEqual(sit('core_critical-injuries-head:damaged-ear'), [['Percepção pela audição', 'pericias.perception=-2', false]]);
  assert.deepEqual(sit('core_critical-injuries-head:lost-ear'), [['Percepção pela audição', 'pericias.perception=-4', false]]);
  assert.deepEqual(sit('core_critical-injuries-head:damaged-eye'), [['Percepção pela visão', 'pericias.perception=-2', true]]);
  assert.deepEqual(sit('core_critical-injuries-head:lost-eye'), [['Percepção pela visão', 'pericias.perception=-4', true]]);
  assert.deepEqual(sit('core_gear:agent'), [['Guarda-roupa e Estilo', 'pericias.wardrobe-style=2', false]]);
  // O Olho perdido continua com o −4 nos tiros, que vale sempre; o Agent, com o +2 em Pesquisa em Biblioteca.
  const sempre = id => catalogo[id].effects.filter(e => !e.system.situacional).flatMap(e => e.system.changes.map(c => `${c.key.replace('system.bonus.', '')}=${c.value}`));
  assert.deepEqual(sempre('core_critical-injuries-head:lost-eye'), ['distancia=-4']);
  assert.deepEqual(sempre('core_gear:agent'), ['pericias.library-search=2']);
  // A iniciativa do Sandevistan (+3, ligada por padrão). A luneta não vira efeito: a regra dela é a da distância.
  assert.deepEqual(sit('core_cyberware:sandevistan'), [['Iniciativa', 'iniciativa=3', true]]);
  assert.ok(!JSON.stringify(catalogo['core_upgrades:sniping-scope'].effects ?? []).includes('situacional'));
});

test('Luneta de precisão (wiki: "+1 em tiro único ou tiro mirado contra alvo a 51 m ou mais. Não acumula com cyberware óptico"): o tiro único, a distância e o óptico', () => {
  for (const modo of ['tiro', 'smart', 'ricochete', 'carga', 'doisCanos']) assert.equal(regras.ehTiroUnico(modo), true, modo);
  for (const modo of ['autofogo', 'supressivo', 'rajadaTech', 'cartucho', 'explosivo']) assert.equal(regras.ehTiroUnico(modo), false, modo);
  assert.equal(regras.lunetaVale({ metros: 51 }), true);
  assert.equal(regras.lunetaVale({ metros: 50.9 }), false);
  assert.equal(regras.lunetaVale({ metros: null }), false);
  assert.equal(regras.lunetaVale({ metros: 80, bonusOptico: 1 }), false);
  assert.deepEqual(regras.LUNETA, { valor: 1, metros: 51 });
  assert.equal(regras.ehLuneta('Sniping Scope'), true);
  assert.equal(regras.ehLuneta('Luneta', 'core_upgrades:sniping-scope'), true);
  assert.equal(regras.ehLuneta('Infrared Nightvision Scope'), false);
  const loja = fs.readFileSync(path.join(raiz, 'system-catalog.js'), 'utf8');
  assert.match(loja, /\+1 em tiro único ou tiro mirado contra alvo a 51 m ou mais\. Não acumula com cyberware óptico\./);
});

test('TeleOptics pela wiki (decisão do usuário): +1 no tiro mirado a 51 m ou mais; o de 2077 saiu da wiki de 2026-10-17 e vale o do RED; uma vez só; o catálogo sem o +1 de sempre do CORE', () => {
  const catalogoDaWiki = fs.readFileSync(path.join(raiz, 'system-catalog.js'), 'utf8');
  assert.match(catalogoDaWiki, /\['TeleOptics', 'Visão detalhada até 800 m; \+1 em tiros mirados contra alvos a 51 m ou mais\.'/);
  const de2077 = fs.readFileSync(path.join(raiz, 'system-2077.js'), 'utf8');
  assert.ok(de2077.includes('<b>Cyberware que repete um do RED</b> (vale o do RED): o <b>Kerenzikov</b>, o <b>TeleOptics</b>,'));
  assert.doesNotMatch(de2077, /ware\('TeleOptics \(2077\)'/, 'o TeleOptics de 2077 saiu da wiki');
  const red = 'core_cyberware:teleoptics';
  assert.deepEqual(Object.keys(regras.TELEOPTICS), [red]);
  assert.equal(regras.tipoDeTeleOptics('TeleOptics'), red);
  // O de 2077 que um ator ainda tenha (de antes da wiki de 2026-10-17): pelo id antigo do catálogo ou pelo nome, o do RED.
  assert.equal(regras.tipoDeTeleOptics('Olhos', 'cyberware-2077:teleoptics-2077'), red);
  assert.equal(regras.tipoDeTeleOptics('TeleOptics (2077)'), red);
  assert.equal(regras.tipoDeTeleOptics('Kiroshi Optics'), null);
  assert.deepEqual(regras.teleopticsNoTiro([red, red, null], { mirado: true }), [red]);
  assert.deepEqual(regras.teleopticsNoTiro([red], { mirado: false }), []);
  assert.equal(regras.deLonge(51), true);
  assert.equal(regras.deLonge(50.9), false);
  assert.equal(regras.deLonge(undefined), false);
  assert.deepEqual(catalogo[red].effects, []);
  assert.equal(catalogo['cyberware-2077:teleoptics-2077'], undefined, 'o catálogo sem o de 2077');
});

test('A conta da defesa na janela de reação (como a "Ataque!" do Fluxo): as partes do teste, a penalidade com o sinal, o 1d10 e a média', () => {
  assert.deepEqual(regras.contaDaDefesa([{ rotulo: 'DEX', valor: 7 }, { rotulo: 'Evasão', valor: 2 }]), { texto: 'DEX 7 + Evasão 2 + 1d10', media: 14.5 });
  assert.deepEqual(regras.contaDaDefesa([{ rotulo: 'WILL', valor: 7 }, { rotulo: 'Concentração', valor: 1 }, { rotulo: 'Gravemente ferido', valor: -2 }]),
    { texto: 'WILL 7 + Concentração 1 − Gravemente ferido 2 + 1d10', media: 11.5 });
  assert.deepEqual(regras.contaDaDefesa([{ rotulo: 'DEX', valor: 0 }]), { texto: 'DEX 0 + 1d10', media: 5.5 });
});

test('Agarrar (wiki, "Agarrar e arremessar", p. 177, e o teste resistido, p. 128): DEX + Briga + 1d10 dos dois lados; quem agarra precisa superar (empate é do defensor); agarrados, os dois com −2', () => {
  const texto = fs.readFileSync(path.join(raiz, 'system-rules.js'), 'utf8');
  assert.match(texto, /os dois rolam DEX \+ Briga \+ 1d10\. Quem vence agarra/, 'a regra da wiki mudou');
  assert.match(texto, /Agarrados: <b>−2 em todas as ações<\/b>/, 'a regra da wiki mudou');
  assert.match(texto, /Quando outra pessoa resiste, o teste dela vira a DV\. <b>Empate: o defensor vence\.<\/b>/, 'a regra da wiki mudou');
  assert.equal(regras.venceuOAgarrao(14, 13), true);
  assert.equal(regras.venceuOAgarrao(13, 13), false, 'empate é do defensor');
  assert.equal(regras.venceuOAgarrao(9, 13), false);
  assert.equal(regras.AGARRAO.penalidade, -2);
});

test('Estrangular e Derrubar (wiki, p. 177): o BODY de quem agarra direto no HP; estrangulando, abaixo de 0 fica com 1 e desmaia, e na terceira rodada seguida desmaia; escapar é o teste de agarrar vencido', () => {
  const texto = fs.readFileSync(path.join(raiz, 'system-rules.js'), 'utf8');
  assert.match(texto, /<b>Estrangular<\/b> \(Ação\): dano igual ao BODY direto no HP, ignorando armadura\. Se levaria abaixo de 0, fica com 1 HP e desmaia\. Três rodadas seguidas: desmaia\./, 'a regra da wiki mudou');
  assert.match(texto, /<b>Derrubar<\/b> \(Ação\): dano igual ao BODY direto no HP; o alvo cai e o agarrão acaba\./, 'a regra da wiki mudou');
  assert.match(texto, /o defensor escapa com um teste de agarrar vencido \(Ação\)/, 'a regra da wiki mudou');
  assert.deepEqual(regras.danoDoAgarrao({ hp: 20, body: 6, estrangular: true, vezes: 1 }), { hp: 14, desmaiou: false, motivo: null });
  assert.deepEqual(regras.danoDoAgarrao({ hp: 8, body: 6, estrangular: true, vezes: 3 }), { hp: 2, desmaiou: true, motivo: 'tresRodadas' });
  assert.deepEqual(regras.danoDoAgarrao({ hp: 4, body: 6, estrangular: true, vezes: 1 }), { hp: 1, desmaiou: true, motivo: 'abaixoDeZero' });
  assert.deepEqual(regras.danoDoAgarrao({ hp: 6, body: 6, estrangular: true, vezes: 1 }), { hp: 0, desmaiou: false, motivo: null }, 'chegar a 0 não é abaixo de 0 (a wiki)');
  assert.deepEqual(regras.danoDoAgarrao({ hp: 0, body: 6, estrangular: true }), { hp: 0, desmaiou: true, motivo: 'abaixoDeZero' }, 'não cura quem já está abaixo de 1');
  assert.deepEqual(regras.danoDoAgarrao({ hp: 4, body: 6 }), { hp: -2, desmaiou: false, motivo: null }, 'derrubar não tem o limite do estrangular');
});

test('Fundação e opções do cyberware (wiki, system-catalog.js e system-2077.js): os slots de cada fundação no catálogo; a opção vai na fundação do mesmo tipo, e o Sensor Array recebe as do Cyberaudio; as de categoria não pedem fundação; sem as placas e o Kiroshi de 2077, que saíram da wiki de 2026-10-17', () => {
  const wikiCatalogo = fs.readFileSync(path.join(raiz, 'system-catalog.js'), 'utf8');
  const wiki2077 = fs.readFileSync(path.join(raiz, 'system-2077.js'), 'utf8');
  for (const trecho of ['Pré-requisito para Neuralware; oferece cinco slots de opção.', 'Implante-base para opções ópticas; três slots de opção por olho.', 'Implante-base com três slots de opção.',
    'Membro-base com quatro slots', 'Membro-base com três slots', 'Acrescenta cinco slots de opção ao Cyberaudio.', 'Fashionware, cyberware interno e externo usam slots de categoria']) {
    assert.ok(wikiCatalogo.includes(trecho), `a regra da wiki mudou: ${trecho}`);
  }
  // O Neuroport (5 slots de opção); a revisão do suplemento (C29): o Kiroshi vale o Cybereye, e as placas saíram.
  for (const trecho of ['com <b>5 slots de opção</b>', 'o <b>Basic Kiroshi Optics</b> (o Cybereye, com opções de graça)',
    '<b>Skin Weave</b> de 2077 e as placas <b>Carapace</b>, <b>Countershell</b>, <b>Nano-plating</b>, <b>ProxiShield</b> e <b>RangeGuard</b>: o sistema de placas do suplemento, que o RED não tem']) {
    assert.ok(wiki2077.includes(trecho), `a regra da wiki mudou: ${trecho}`);
  }
  for (const id of ['basic-kiroshi-optics', 'skin-weave', 'subdermal-armour-2077', 'carapace', 'countershell', 'nano-plating', 'proxishield', 'rangeguard']) assert.equal(catalogo[`cyberware-2077:${id}`], undefined, id);
  const fundacoes = ['core_cyberware:neural-link', 'core_cyberware:cybereye', 'core_cyberware:cyberaudio-suite', 'core_cyberware:cyberarm', 'core_cyberware:cyberleg', 'core_cyberware:sensor-array',
    'cyberware-2077:neuroport'];
  assert.deepEqual(fundacoes.map(id => catalogo[id].system.slots), [5, 3, 3, 4, 3, 5, 5], 'o Sensor Array tem 3 no CORE; vale a wiki');
  // A única fundação de 2077 que ficou: o Neuroport, com as opções de neuralware.
  assert.deepEqual(Object.keys(catalogo).filter(id => id.startsWith('cyberware-2077:') && catalogo[id].system.fundacional), ['cyberware-2077:neuroport']);
  const item = id => ({ tipo: catalogo[id].system.tipo, catalogo: id, slots: catalogo[id].system.slots, tamanho: catalogo[id].system.tamanho });
  const cabe = (fundacao, opcao, usados = 0) => regras.cabeNaFundacao({ fundacao: item(fundacao), opcao: item(opcao), usados });
  assert.deepEqual(cabe('core_cyberware:neural-link', 'core_cyberware:kerenzikov'), { cabe: true, motivo: null });
  assert.deepEqual(cabe('core_cyberware:neural-link', 'core_cyberware:kerenzikov', 4), { cabe: true, motivo: null }, 'o quinto slot');
  assert.deepEqual(cabe('core_cyberware:neural-link', 'core_cyberware:kerenzikov', 5), { cabe: false, motivo: 'slots' });
  assert.deepEqual(cabe('core_cyberware:cybereye', 'core_cyberware:dartgun', 2), { cabe: false, motivo: 'slots' }, 'o Dartgun ocupa 3');
  assert.deepEqual(cabe('core_cyberware:neural-link', 'core_cyberware:anti-dazzle'), { cabe: false, motivo: 'encaixe' });
  assert.equal(cabe('core_cyberware:sensor-array', 'core_cyberware:amplified-hearing').cabe, true);
  assert.deepEqual(cabe('cyberware-2077:neuroport', 'core_cyberware:kerenzikov'), { cabe: true, motivo: null });
  assert.deepEqual(cabe('cyberware-2077:neuroport', 'core_cyberware:amplified-hearing'), { cabe: false, motivo: 'encaixe' });
  assert.deepEqual(['core_cyberware:kerenzikov', 'core_cyberware:amplified-hearing', 'core_cyberware:hidden-holster', 'core_cyberware:techhair'].map(id => regras.pedeFundacao(item(id))), [true, true, false, false]);
  // A placa que um ator ainda tenha (de antes; o catálogo a tinha como cyberware externo) não pede fundação, como o
  // cyberware externo do RED.
  assert.equal(regras.pedeFundacao({ tipo: 'cyberwareExternal', catalogo: 'cyberware-2077:carapace', slots: 0, tamanho: 1 }), false);
  assert.equal(regras.encaixeDaOpcao({ tipo: 'cyberwareExternal', catalogo: 'cyberware-2077:carapace' }), 'cyberwareExternal');
});

test('Estrangular, as "três rodadas seguidas" (wiki, p. 177): no mesmo combate, a rodada de antes conta junto; pular uma rodada recomeça; na mesma rodada não conta outra; fora de combate, toda vez conta', () => {
  assert.equal(regras.vezesEstrangulando(null, {}), 1);
  assert.equal(regras.vezesEstrangulando({ combate: null, rodada: null, vezes: 2 }, {}), 3);
  assert.equal(regras.vezesEstrangulando({ combate: 'c', rodada: 2, vezes: 1 }, { combate: 'c', rodada: 3 }), 2);
  assert.equal(regras.vezesEstrangulando({ combate: 'c', rodada: 2, vezes: 2 }, { combate: 'c', rodada: 4 }), 1, 'pulou uma rodada');
  assert.equal(regras.vezesEstrangulando({ combate: 'c', rodada: 3, vezes: 2 }, { combate: 'c', rodada: 3 }), 2, 'na mesma rodada');
  assert.equal(regras.vezesEstrangulando({ combate: 'c', rodada: 2, vezes: 2 }, { combate: 'd', rodada: 3 }), 1, 'outro combate');
  assert.equal(regras.vezesEstrangulando({ combate: null, rodada: null, vezes: 2 }, { combate: 'c', rodada: 1 }), 1, 'o combate começou');
});

test('O texto em cima do token (como o Fluxo de Combate): o HP perdido, o crítico, a armadura e o escudo que seguraram, e cada resultado sem dano', () => {
  const dano = (hpAntes, hpDepois, extra = {}) => ({ hpAntes, hpDepois, lesoes: [], ...extra });
  assert.deepEqual(regras.textoNoToken({ resultado: 'acertou', dano: dano(45, 33) }), { texto: '−12 HP', estilo: 'acerto' });
  assert.deepEqual(regras.textoNoToken({ resultado: 'acertou', dano: dano(45, 30, { lesoes: [{ nome: 'Braço quebrado' }] }) }), { texto: '−15 HP · crítico!', estilo: 'acerto' });
  assert.deepEqual(regras.textoNoToken({ resultado: 'acertou', dano: dano(45, 45) }), { texto: 'A armadura segurou', estilo: 'defesa' });
  assert.deepEqual(regras.textoNoToken({ resultado: 'acertou', dano: dano(45, 45, { escudo: 'Bullet Proof Shield' }) }), { texto: 'No escudo', estilo: 'defesa' });
  assert.deepEqual(['esquivou', 'errou', 'fora', 'suprimido', 'firme', 'acertou'].map(resultado => regras.textoNoToken({ resultado })), [
    { texto: 'Esquivou!', estilo: 'erro' }, { texto: 'Errou', estilo: 'erro' }, { texto: 'Fora do alcance', estilo: 'erro' },
    { texto: 'Suprimido!', estilo: 'acerto' }, { texto: 'Firme', estilo: 'erro' }, { texto: 'Acertou', estilo: 'acerto' }
  ]);
  assert.equal(regras.textoNoToken({ resultado: 'semDv' }), null);
});

test('Reflex Tuner (wiki, 2077: "depois de ser atingido, +1 para se esquivar pelo resto da rodada"): o item pelo catálogo e pelo nome, e o +1', () => {
  const de2077 = fs.readFileSync(path.join(raiz, 'system-2077.js'), 'utf8');
  assert.match(de2077, /ware\('Reflex Tuner'.*depois de ser atingido, <b>\+1 para se esquivar<\/b> pelo resto da rodada\./);
  assert.equal(regras.REFLEX_TUNER, 1);
  assert.equal(regras.ehReflexTuner('Outro nome', 'cyberware-2077:reflex-tuner'), true);
  assert.equal(regras.ehReflexTuner(' Reflex Tuner '), true);
  assert.equal(regras.ehReflexTuner('Reflex Booster'), false);
  assert.equal(regras.ehReflexTuner('Kerenzikov'), false);
  assert.equal(catalogo['cyberware-2077:reflex-tuner']?.name, 'Reflex Tuner');
});

test('Dano com o modificador do mestre (a janela de rolagem): entra depois do multiplicador do autofogo, como o CORE', () => {
  assert.equal(regras.expressaoDoDano('5d6'), '5d6');
  assert.equal(regras.expressaoDoDano('5d6', { modificador: 2 }), '5d6 + 2');
  assert.equal(regras.expressaoDoDano('5d6', { modificador: -3 }), '5d6 - 3');
  assert.equal(regras.expressaoDoDano('2d6', { multiplicador: 3 }), '2d6 * 3');
  assert.equal(regras.expressaoDoDano('2d6', { multiplicador: 3, modificador: 2 }), '2d6 * 3 + 2');
  assert.equal(regras.expressaoDoDano('3d6 + 2', { multiplicador: 2, modificador: 1 }), '(3d6 + 2) * 2 + 1');
});

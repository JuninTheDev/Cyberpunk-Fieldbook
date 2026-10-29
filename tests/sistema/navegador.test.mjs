// O navegador de itens e atores (o C43, parte 3; o document browser do CORE 0.93, em fvtt-cyberpunk-red-core-dev): a conta
// pura de regras-navegador.mjs com os valores do CORE (o BATCH_SIZE, os tipos de fora, o ciclo do tristate, os filtros do
// CPR.browserFilters e os casos dos testes dele, tests/playwright/items/document-browser.spec.mjs e
// source-document-browser.spec.mjs); a regra do índice (cpr-browser-index.js:35: o que o compêndio traz é o que os
// filtros e as linhas leem), com o catálogo; as partes da janela com um só elemento raiz; e o menu dos compêndios.
// Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as nav from '../../foundry-sistema/scripts/regras-navegador.mjs';
import { categoriaDoPreco } from '../../foundry-sistema/scripts/regras.mjs';
import { registrarCompendiosDoNavegador } from '../../foundry-sistema/scripts/configuracoes.mjs';

const raiz = new URL('../../', import.meta.url);
const ler = arquivo => readFileSync(new URL(arquivo, raiz), 'utf8');
const DO_CORE = 'fvtt-cyberpunk-red-core-dev/src/modules/';
const janelaDoCore = ler(DO_CORE + 'apps/browser/cpr-document-browser.js');
const configDoCore = ler(DO_CORE + 'system/config.js');
const sistema = JSON.parse(ler('foundry-sistema/system.json'));
const TIPOS = Object.keys(sistema.documentTypes.Item);
const catalogo = Object.values(JSON.parse(ler('foundry-sistema/dados/catalogo.json')).itens);
const doCatalogo = nome => catalogo.find(item => item.name === nome);

const entrada = (nome, tipo, system = {}, origem = 'mundo', classe = 'Item') =>
  nav.entradaDoNavegador({ system }, { uuid: `${origem}.${nome}`, nome, img: '', classe, tipo, origem, rotuloDaOrigem: origem === 'mundo' ? 'Mundo' : 'Armas' });
const doItem = (item, origem = 'cpr-fieldbook.armas') => nav.entradaDoNavegador(item, { uuid: item.name, nome: item.name, img: item.img, classe: 'Item', tipo: item.type, origem, rotuloDaOrigem: 'Armas' });
const nomes = (lista, estado) => nav.filtrarEntradas(lista, estado, TIPOS).map(e => e.nome);
// Um clique no tristate, como o do CORE: do estado de agora ao próximo.
const clicar = (estado, alvo) => nav.aplicarTristate(estado, alvo, nav.PROXIMO_ESTADO[nav.estadoDoTristate(estado, alvo)]);

test('C43.3: o lote de 50, o ciclo do tristate e o que fica de fora vêm do CORE', () => {
  assert.equal(nav.LOTE, Number(janelaDoCore.match(/static BATCH_SIZE = (\d+);/)[1]));
  // const cycle = { include: "only", only: "exclude", exclude: "include" } (cpr-document-browser.js:1187).
  const ciclo = Object.fromEntries([...janelaDoCore.match(/const cycle = \{([^}]*)\}/)[1].matchAll(/(\w+): "(\w+)"/g)].map(([, de, para]) => [de, para]));
  const nomeDo = { include: 'incluir', only: 'so', exclude: 'excluir' };
  assert.deepEqual(nav.PROXIMO_ESTADO, Object.fromEntries(Object.entries(ciclo).map(([de, para]) => [nomeDo[de], nomeDo[para]])));
  // O browserExcludedItemTypes (config.js:1097): a perícia e a Role não são itens aqui; fica a lesão crítica.
  assert.deepEqual(JSON.parse(configDoCore.match(/CPR\.browserExcludedItemTypes = (\[[^\]]*\]);/)[1]), ['skill', 'criticalInjury', 'role']);
  assert.deepEqual(nav.TIPOS_FORA_DO_NAVEGADOR, ['lesao']);
  assert.ok(TIPOS.includes('lesao') && !TIPOS.includes('skill') && !TIPOS.includes('role'));
  // O browserIgnoredPacks (config.js:1105-1118) tira os compêndios das lesões: o nosso é o "lesoes".
  assert.ok(configDoCore.includes('`${CPR.systemId}.core_critical-injuries-body`'));
  assert.ok(sistema.packs.some(pacote => pacote.name === 'lesoes' && pacote.type === 'Item'));
  assert.deepEqual(nav.COMPENDIOS_FORA_DO_NAVEGADOR, ['cpr-fieldbook.lesoes']);
  // O isPackEligible (cpr-browser-index.js:264-268) e o #isPackActive (:290-293): por padrão, todos ligados.
  assert.equal(nav.compendioElegivel({ id: 'cpr-fieldbook.lesoes', packageType: 'system', system: 'cpr-fieldbook' }), false);
  assert.equal(nav.compendioElegivel({ id: 'cpr-fieldbook.armas', packageType: 'system', system: 'cpr-fieldbook' }), true);
  assert.equal(nav.compendioElegivel({ id: 'world.meus-itens', packageType: 'world' }), true);
  assert.equal(nav.compendioElegivel({ id: 'outro.itens', packageType: 'module', system: 'dnd5e' }), false);
  assert.equal(nav.compendioAtivo({}, 'cpr-fieldbook.armas'), true);
  assert.equal(nav.compendioAtivo(undefined, 'cpr-fieldbook.armas'), true);
  assert.equal(nav.compendioAtivo({ 'cpr-fieldbook.armas': false }, 'cpr-fieldbook.armas'), false);
  assert.equal(nav.compendioAtivo({ 'cpr-fieldbook.armas': false }, 'cpr-fieldbook.armaduras'), true);
  // Os atores e o arrastar, só o mestre (o #sanitizeMode, :188-191; o draggable, :308-310).
  assert.equal(nav.modoDoNavegador('ator', true), 'ator');
  assert.equal(nav.modoDoNavegador('ator', false), 'item');
  assert.equal(nav.modoDoNavegador('outro', true), 'item');
  assert.equal(nav.podeArrastar(true), true);
  assert.equal(nav.podeArrastar(false), false);
});

test('C43.3: os filtros de cada tipo são os do CPR.browserFilters do CORE, nos nossos tipos e campos', () => {
  const bloco = configDoCore.slice(configDoCore.indexOf('CPR.browserFilters = {'), configDoCore.indexOf('\n};', configDoCore.indexOf('CPR.browserFilters = {')));
  const numerosDaArma = configDoCore.slice(configDoCore.indexOf('CPR.browserWeaponStatFilters = ['), configDoCore.indexOf('CPR.browserFilters = {'));
  const defs = texto => [...texto.matchAll(/id: "(\w+)",\s*type: "(\w+)"/g)].map(([, id, tipo]) => ({ id, tipo }));
  const doCore = {};
  const partes = bloco.split(/^ {2}(\w+): \[/m).slice(1);
  for (let i = 0; i < partes.length; i += 2) doCore[partes[i]] = [...defs(partes[i + 1]), ...(partes[i + 1].includes('...CPR.browserWeaponStatFilters') ? defs(numerosDaArma) : [])];
  // Cada tipo do CORE, o nosso, e cada filtro dele, o nosso equivalente (no campo do nosso modelo, dados.mjs).
  const EQUIVALENTES = {
    weapon: ['arma', { weaponType: 'tipo', rof: 'cdt', autofire: 'autofogo', damage: 'dano', concealable: 'ocultavel', hands: 'maos' }],
    ammo: ['municao', { ammoType: 'efeito', ammoVariety: 'tipo' }],
    cyberware: ['cyberware', { cyberwareType: 'tipo', isFoundational: 'fundacional', providesHardening: 'endurecido', isWeapon: 'arma' }],
    clothing: ['roupa', { clothingType: 'tipo', clothingStyle: 'estilo' }],
    armor: ['armadura', { armorLocation: 'local', armorSp: 'sp' }],
    cyberdeck: ['cyberdeck', { slots: 'slots' }],
    drug: ['droga', { drugType: 'tipo' }],
    program: ['programa', { programClass: 'classe' }],
    itemUpgrade: ['upgrade', { upgradeType: 'alvo' }]
  };
  const TIPO_DO_FILTRO = { set: 'conjunto', range: 'faixa', damage: 'dano', boolean: 'booleano', toggle: 'alternancia' };
  assert.deepEqual(Object.keys(doCore), Object.keys(EQUIVALENTES));
  assert.deepEqual(Object.keys(nav.FILTROS_POR_TIPO), Object.values(EQUIVALENTES).map(([tipo]) => tipo));
  for (const [tipoDoCore, [tipo, ids]] of Object.entries(EQUIVALENTES)) {
    assert.deepEqual(doCore[tipoDoCore].map(def => def.id).sort(), Object.keys(ids).sort(), tipoDoCore);
    const nossos = Object.fromEntries(nav.FILTROS_POR_TIPO[tipo].map(def => [def.id, def]));
    assert.deepEqual(Object.keys(nossos).sort(), Object.values(ids).sort(), tipo);
    for (const def of doCore[tipoDoCore]) assert.equal(nossos[ids[def.id]].tipo, TIPO_DO_FILTRO[def.tipo], `${tipo}.${ids[def.id]}`);
  }
  // A arma do cyberware: os números da arma do CORE (sem as Mãos), no campo arma.
  assert.deepEqual(nav.FILTROS_POR_TIPO.cyberware.find(def => def.id === 'arma').filtros.map(def => [def.id, def.campo]),
    [['cdt', 'system.arma.cdt'], ['autofogo', 'system.arma.autofogo'], ['dano', 'system.arma.dano'], ['ocultavel', 'system.arma.ocultavel']]);
  // Nenhum campo inventado: cada campo do system de um filtro existe nos itens do catálogo daquele tipo.
  for (const [tipo, lista] of Object.entries(nav.FILTROS_POR_TIPO)) {
    for (const def of lista.flatMap(def => [def, ...(def.filtros ?? [])]).filter(def => def.campo?.startsWith('system.'))) {
      assert.ok(catalogo.some(item => item.type === tipo && nav.ler(item, def.campo) !== undefined), `${tipo}: ${def.campo}`);
    }
  }
});

test('C43.3: o índice traz o que os filtros e as linhas leem (cpr-browser-index.js:35), sem um campo dentro do outro', () => {
  // O servidor monta a projeção com setProperty: "system.dano" e "system.dano.blackIce" juntos quebram o índice.
  for (const a of nav.CAMPOS_DO_ITEM) for (const b of nav.CAMPOS_DO_ITEM) if (a !== b) assert.ok(!b.startsWith(`${a}.`), `${b} dentro de ${a}`);
  // A linha do índice de um compêndio só tem os campos pedidos: ela dá os mesmos números, o mesmo local da armadura, o
  // mesmo tipo da droga, o mesmo SP e os mesmos valores de cada filtro que o item inteiro.
  const definir = (alvo, caminho, valor) => { const chaves = caminho.split('.'); const ultima = chaves.pop(); let atual = alvo; for (const chave of chaves) atual = atual[chave] ??= {}; atual[ultima] = valor; };
  const doIndice = item => { const linha = { name: item.name, type: item.type }; for (const campo of nav.CAMPOS_DO_ITEM) { const valor = nav.ler(item, campo); if (valor !== undefined) definir(linha, campo, structuredClone(valor)); } return linha; };
  const arquitetura = { name: 'Clínica', type: 'arquitetura', system: { descricao: '<p>x</p>', dv: 0, preco: 0, andares: [{ andar: 1, ramo: 'a', tipo: 'senha', dv: 6 }, { andar: 1, ramo: 'a', tipo: 'arquivo', dv: 6 }, { andar: 2, ramo: 'b', tipo: 'senha', dv: 8 }] } };
  let comNumeros = 0;
  for (const item of [...catalogo, arquitetura]) {
    const inteiro = doItem(item), doCompendio = doItem(doIndice(item));
    assert.deepEqual(nav.chipsDoItem(doCompendio), nav.chipsDoItem(inteiro), item.name);
    if (nav.chipsDoItem(inteiro).length) comNumeros += 1;
    assert.equal(doCompendio.localDaArmadura, inteiro.localDaArmadura, item.name);
    assert.equal(doCompendio.tipoDeDroga, inteiro.tipoDeDroga, item.name);
    assert.deepEqual(nav.spDaArmadura(doCompendio), nav.spDaArmadura(inteiro), item.name);
    assert.equal(nav.ler(doCompendio, 'system.preco'), nav.ler(inteiro, 'system.preco'), item.name);
    for (const def of (nav.FILTROS_POR_TIPO[item.type] ?? []).flatMap(def => [def, ...(def.filtros ?? [])]).filter(def => def.campo)) {
      assert.deepEqual(nav.ler(doCompendio, def.campo), nav.ler(inteiro, def.campo), `${item.name}: ${def.campo}`);
    }
    assert.equal(nav.ler(doCompendio, 'system.alvo'), nav.ler(inteiro, 'system.alvo'), item.name);
  }
  assert.ok(comNumeros > 400, `os números de ${comNumeros} itens`);
  assert.deepEqual(nav.chipsDoItem(doItem(arquitetura)), ['2 andares']);
  assert.deepEqual(nav.CAMPOS_DO_ATOR, ['img']);
});

test('C43.3: os números das linhas, na ordem do CORE (item-chips.js: o ataque, o pente, o ocultável e o eletrônico, depois os do tipo)', () => {
  // O Assault Rifle (Excellent) do catálogo (o CORE 0.92.4): 5d6, ROF 1, autofogo 4, supressivo, +1, pente 25, 2 mãos.
  assert.deepEqual(nav.chipsDoItem(doItem(doCatalogo('Assault Rifle (Excellent)'))), ['Dano 5d6', 'CDT 1', 'Autofogo (4)', 'Fogo supressivo', 'Ataque +1', 'Pente 25', 'Mãos 2']);
  assert.deepEqual(nav.chipsDoItem(doItem(doCatalogo('Bullet Proof Shield'))), ['PV do escudo 10/10']);
  assert.deepEqual(nav.chipsDoItem(doItem(doCatalogo('Heavy Armorjack (Body)'))), ['SP corpo 13/13', 'Penalidade 2']);
  // O cyberware que é arma: o ataque antes do eletrônico e do que é do cyberware (a perda, o lugar).
  assert.deepEqual(nav.chipsDoItem(doItem(doCatalogo('Wolvers'))), ['Dano 3d6', 'CDT 2', 'Eletrônico', 'Humanidade 2d6', 'Instala: clínica']);
  assert.deepEqual(nav.chipsDoItem(doItem(doCatalogo('Neural Link'))), ['Eletrônico', 'Humanidade 2d6', 'Fundacional', 'Instala: clínica', 'Slots 5']);
  // O Black ICE: ATK, DEF e REZ, e PER e SPD; o dano contra Black ICE "0" não aparece.
  assert.deepEqual(nav.chipsDoItem(doItem(doCatalogo('Hellhound'))), ['ATK 6', 'DEF 2', 'REZ 20', 'PER 6', 'SPD 6']);
  // Um programa comum mostra o ATK e a DEF também com 0 (o "number" do CORE), sem PER e SPD.
  assert.deepEqual(nav.chipsDoItem(entrada('Sword', 'programa', { classe: 'antiprogramattacker', atk: 1, def: 0, rez: 0, per: 3, spd: 3 })), ['ATK 1', 'DEF 0', 'REZ 0']);
  assert.deepEqual(nav.chipsDoItem(entrada('Carro', 'veiculo', { assentos: 4, sdp: { value: 30, max: 50 }, velocidade: { combate: 20 } })), ['Assentos 4', 'SDP 50', 'MOVE 20']);
  assert.deepEqual(nav.chipsDoItem(entrada('Nada', 'lesao', {})), []);
  // A linha: o preço com a categoria (regras.categoriaDoPreco, a do contêiner) e a origem; o ator não tem números nem preço.
  const linha = nav.linhaDoNavegador(doItem(doCatalogo('Assault Rifle (Excellent)')), { rotuloDoTipo: 'Arma', categoria: categoriaDoPreco, ehMestre: true });
  assert.deepEqual([linha.preco, linha.categoria, linha.origem, linha.rotuloDoTipo, linha.arrastavel], ['1.000 eb', 'Muito Caro', 'Armas', 'Arma', true]);
  assert.equal(nav.linhaDoNavegador(doItem(doCatalogo('Assault Rifle (Excellent)')), { categoria: categoriaDoPreco }).arrastavel, false);
  const ator = nav.linhaDoNavegador(entrada('Solo', 'personagem', {}, 'cpr-fieldbook.exemplos', 'Actor'), { rotuloDoTipo: 'Personagem' });
  assert.deepEqual([ator.chips, ator.preco, ator.categoria, ator.classe], [[], '', '', 'Actor']);
});

test('C43.3: o nome, o tipo em "só estes", o preço e a origem, como nos testes do CORE', () => {
  // document-browser.spec.mjs:145-201: a busca pelo nome isola os itens do teste; o tipo em "só estes" deixa só a arma.
  const lista = [entrada('Escopo blade', 'arma'), entrada('Escopo crate', 'equipamento'), entrada('Outro', 'arma')];
  const estado = nav.estadoVazio();
  estado.nome = '  ESCOPO ';
  assert.deepEqual(nomes(lista, estado), ['Escopo blade', 'Escopo crate']);
  clicar(estado, { grupo: 'tipo', tipo: 'arma' });
  assert.equal(estado.tipos.arma, 'so');
  assert.deepEqual(nomes(lista, estado), ['Escopo blade']);
  // O terceiro clique (excluídos) tira o tipo; o quarto volta a incluir.
  clicar(estado, { grupo: 'tipo', tipo: 'arma' });
  assert.deepEqual(nomes(lista, estado), ['Escopo crate']);
  clicar(estado, { grupo: 'tipo', tipo: 'arma' });
  assert.deepEqual(nomes(lista, estado), ['Escopo blade', 'Escopo crate']);
  // document-browser.spec.mjs:400-463: 50, 200 e 500; o mínimo 100 deixa os dois de cima, e o máximo 300, o do meio.
  const precos = [entrada('Preço 1 cheap', 'equipamento', { preco: 50 }), entrada('Preço 2 mid', 'equipamento', { preco: 200 }), entrada('Preço 3 dear', 'equipamento', { preco: 500 }), entrada('Preço 4 sem', 'personagem', {}, 'mundo', 'Actor')];
  const caro = nav.estadoVazio();
  caro.preco.min = 100;
  assert.deepEqual(nomes(precos, caro), ['Preço 2 mid', 'Preço 3 dear']);
  caro.preco.max = 300;
  assert.deepEqual(nomes(precos, caro), ['Preço 2 mid']);
  // source-document-browser.spec.mjs:298-371: a origem; o mundo esconde o compêndio, e o compêndio, o mundo.
  const origens = [entrada('Do mundo', 'equipamento'), entrada('Do compêndio', 'equipamento', {}, 'cpr-fieldbook.equipamento')];
  const deOnde = nav.estadoVazio();
  assert.equal(deOnde.origem, 'qualquer');
  assert.deepEqual(Object.keys(nav.ORIGENS), ['qualquer', 'mundo', 'compendio']);
  assert.deepEqual(nomes(origens, deOnde), ['Do compêndio', 'Do mundo']);
  deOnde.origem = 'mundo';
  assert.deepEqual(nomes(origens, deOnde), ['Do mundo']);
  deOnde.origem = 'compendio';
  assert.deepEqual(nomes(origens, deOnde), ['Do compêndio']);
});

test('C43.3: o filtro de dentro em "só estes" promove o tipo, e a promoção volta; o "só estes" do clique fica (document-browser.spec.mjs:203-288)', () => {
  const lista = [entrada('Lâmina', 'arma', { tipo: 'heavyMelee' }), entrada('Pistola', 'arma', { tipo: 'medPistol' }), entrada('Caixa', 'equipamento')];
  const estado = nav.estadoVazio();
  const opcao = { grupo: 'conjunto', tipo: 'arma', filtro: 'tipo', valor: 'heavyMelee' };
  clicar(estado, opcao);
  assert.equal(nav.estadoDoTristate(estado, opcao), 'so');
  assert.equal(estado.tipos.arma, 'so');
  assert.ok(estado.promovidos.has('arma'));
  assert.deepEqual(nomes(lista, estado), ['Lâmina']);
  // O próximo clique (excluídos): sem filtro de dentro em "só estes", a caixa que o filtro promoveu volta a incluídos.
  clicar(estado, opcao);
  assert.equal(nav.estadoDoTristate(estado, opcao), 'excluir');
  assert.equal(estado.tipos.arma, 'incluir');
  assert.ok(!estado.promovidos.has('arma'));
  assert.deepEqual(nomes(lista, estado), ['Pistola', 'Caixa']);
  // O "só estes" posto pelo clique na caixa sobrevive ao filtro de dentro.
  const manual = nav.estadoVazio();
  clicar(manual, { grupo: 'tipo', tipo: 'arma' });
  clicar(manual, opcao);
  clicar(manual, opcao);
  assert.equal(nav.estadoDoTristate(manual, opcao), 'excluir');
  assert.equal(manual.tipos.arma, 'so');
  assert.deepEqual(nomes(lista, manual), ['Pistola']);
  // O booleano e a alternância também promovem; com dois de dentro, a promoção só volta sem nenhum em "só estes".
  const dois = nav.estadoVazio();
  const fundacional = { grupo: 'booleano', tipo: 'cyberware', filtro: 'fundacional' }, arma = { grupo: 'alternancia', tipo: 'cyberware', filtro: 'arma' };
  clicar(dois, fundacional);
  clicar(dois, arma);
  clicar(dois, fundacional);
  assert.equal(dois.tipos.cyberware, 'so');
  clicar(dois, arma);
  assert.equal(dois.tipos.cyberware, 'incluir');
});

test('C43.3: os upgrades pelo item onde instalam, depois pelo nome, e os tipos na ordem do system.json (document-browser.spec.mjs:290-398)', () => {
  const lista = [entrada('beta arma', 'upgrade', { alvo: 'arma' }), entrada('zulu deck', 'upgrade', { alvo: 'cyberdeck' }), entrada('yankee carro', 'upgrade', { alvo: 'veiculo' }),
    entrada('omega deck', 'upgrade', { alvo: 'cyberdeck' }), entrada('alpha carro', 'upgrade', { alvo: 'veiculo' }), entrada('Zeta', 'armadura'), entrada('Alfa', 'veiculo'), entrada('Meio', 'arma')];
  assert.deepEqual(nomes(lista, nav.estadoVazio()), ['Meio', 'Zeta', 'beta arma', 'omega deck', 'zulu deck', 'alpha carro', 'yankee carro', 'Alfa']);
  const estado = nav.estadoVazio();
  clicar(estado, { grupo: 'conjunto', tipo: 'upgrade', filtro: 'alvo', valor: 'veiculo' });
  assert.equal(estado.tipos.upgrade, 'so');
  assert.deepEqual(nomes(lista, estado), ['alpha carro', 'yankee carro']);
  // As opções do conjunto: as do sistema (os três lugares de config.ALVOS_UPGRADE), ou os valores do índice, em ordem.
  assert.deepEqual(nav.opcoesDoConjunto(nav.FILTROS_POR_TIPO.upgrade[0], lista, 'upgrade').map(([valor]) => valor), ['arma', 'cyberdeck', 'veiculo']);
  const armas = [entrada('A', 'arma', { tipo: 'smg' }), entrada('B', 'arma', { tipo: 'assaultRifle' }), entrada('C', 'arma', { tipo: 'smg' }), entrada('D', 'municao', { tipo: 'rifle' })];
  assert.deepEqual(nav.opcoesDoConjunto(nav.FILTROS_POR_TIPO.arma[0], armas, 'arma'), [['assaultRifle', 'assaultRifle'], ['smg', 'smg']]);
});

test('C43.3: as faixas, os dados do dano, o booleano, a alternância e os derivados, cada um só no tipo dele (config.js:902-1090)', () => {
  // O SP da armadura só dos locais que ela usa (cpr-document-browser.js:889-893): o máximo 7 não pega a placa de 18 pelo 0
  // da cabeça; o escudo vale pelo PV.
  const placa = entrada('Placa', 'armadura', { sp: { cabeca: { value: 0, max: 0 }, corpo: { value: 18, max: 18 } } });
  const escudo = entrada('Escudo', 'armadura', { escudo: true, pvEscudo: { value: 10, max: 10 }, sp: { cabeca: { value: 0, max: 0 }, corpo: { value: 0, max: 0 } } });
  const capacete = entrada('Capacete', 'armadura', { sp: { cabeca: { value: 7, max: 7 }, corpo: { value: 0, max: 0 } } });
  const traje = entrada('Traje', 'armadura', { sp: { cabeca: { value: 11, max: 11 }, corpo: { value: 11, max: 11 } } });
  assert.deepEqual([placa, escudo, capacete, traje].map(e => e.localDaArmadura), ['corpo', 'escudo', 'cabeca', 'ambos']);
  const sp = nav.estadoVazio();
  nav.mudarFaixa(sp, 'armadura', 'sp', 'max', '7');
  assert.deepEqual(nomes([placa, escudo, capacete, traje], sp), ['Capacete']);
  nav.mudarFaixa(sp, 'armadura', 'sp', 'max', '');
  nav.mudarFaixa(sp, 'armadura', 'sp', 'min', '10');
  assert.deepEqual(nomes([placa, escudo, capacete, traje], sp), ['Escudo', 'Placa', 'Traje']);
  // Os dados antes do "d" (o #dieCount, :947-950; "3d6xkh2" é 3, o dano fixo é 0, config.js:912).
  assert.deepEqual(['3d6xkh2', '4d6', ' 2D6+1', '0', '', undefined].map(nav.dadosDoDano), [3, 4, 2, 0, 0, 0]);
  const armas = [entrada('Faca', 'arma', { dano: '1d6', cdt: 2, ocultavel: true }), entrada('Fuzil', 'arma', { dano: '5d6', cdt: 1, autofogo: 4 }), entrada('Mochila', 'equipamento', { ocultavel: false })];
  const pesado = nav.estadoVazio();
  nav.mudarFaixa(pesado, 'arma', 'dano', 'min', '4');
  // O filtro da arma não esconde o equipamento.
  assert.deepEqual(nomes(armas, pesado), ['Fuzil', 'Mochila']);
  const cdt = nav.estadoVazio();
  nav.mudarFaixa(cdt, 'arma', 'cdt', 'min', '2');
  assert.deepEqual(nomes(armas, cdt), ['Faca', 'Mochila']);
  const oculta = nav.estadoVazio();
  clicar(oculta, { grupo: 'booleano', tipo: 'arma', filtro: 'ocultavel' });
  assert.deepEqual(nomes(armas, oculta), ['Faca']);
  clicar(oculta, { grupo: 'booleano', tipo: 'arma', filtro: 'ocultavel' });
  assert.deepEqual(nomes(armas, oculta), ['Fuzil', 'Mochila']);
  // A alternância da arma do cyberware: em "só estes", só os que atacam, com os filtros de dentro.
  const cyber = [entrada('Wolvers', 'cyberware', { arma: { ataca: true, dano: '3d6', cdt: 2 } }), entrada('Popup', 'cyberware', { arma: { ataca: true, dano: '2d6', cdt: 1 } }), entrada('Olho', 'cyberware', { arma: { ataca: false } })];
  const ataca = nav.estadoVazio();
  nav.mudarFaixa(ataca, 'cyberware', 'cdt', 'min', '2');
  // Fora de "só estes", os filtros de dentro não valem.
  assert.deepEqual(nomes(cyber, ataca), ['Olho', 'Popup', 'Wolvers']);
  clicar(ataca, { grupo: 'alternancia', tipo: 'cyberware', filtro: 'arma' });
  assert.deepEqual(nomes(cyber, ataca), ['Wolvers']);
  clicar(ataca, { grupo: 'alternancia', tipo: 'cyberware', filtro: 'arma' });
  assert.deepEqual(nomes(cyber, ataca), ['Olho']);
  // A droga pelo preço (o #drugTypeFor, cpr-browser-index.js:427-432): sem preço, farmacêutica.
  assert.deepEqual([0, 50, undefined].map(preco => nav.tipoDeDroga('droga', { preco })), ['farmaceutica', 'rua', undefined]);
  assert.equal(nav.tipoDeDroga('equipamento', { preco: 0 }), undefined);
  // O campo vazio ou que não é número é sem limite.
  assert.deepEqual(nav.mudarFaixa(nav.estadoVazio(), 'arma', 'maos', 'max', 'abc').faixas.arma.maos, { min: null, max: null });
});

test('C43.3: os lotes de 50, com o cabeçalho onde o tipo muda, também entre um lote e outro (cpr-document-browser.js:1469-1507)', () => {
  const lista = [...Array.from({ length: 60 }, (_, i) => entrada(`Arma ${i}`, 'arma')), ...Array.from({ length: 60 }, (_, i) => entrada(`Armadura ${i}`, 'armadura'))];
  const um = nav.proximoLote(lista, 0, null);
  assert.deepEqual([um.itens.length, um.itens[0], um.feitos, um.ultimoTipo, um.acabou], [51, { cabecalho: true, tipo: 'arma' }, 50, 'arma', false]);
  assert.deepEqual([um.itens[1].par, um.itens[2].par], [true, false]);
  const dois = nav.proximoLote(lista, um.feitos, um.ultimoTipo);
  assert.deepEqual(dois.itens.filter(item => item.cabecalho), [{ cabecalho: true, tipo: 'armadura' }]);
  assert.equal(dois.itens.findIndex(item => item.cabecalho), 10);
  assert.deepEqual([dois.itens.length, dois.feitos, dois.acabou, dois.itens[0].par], [51, 100, false, true]);
  const tres = nav.proximoLote(lista, dois.feitos, dois.ultimoTipo);
  assert.deepEqual([tres.itens.length, tres.itens.some(item => item.cabecalho), tres.feitos, tres.acabou], [20, false, 120, true]);
  assert.deepEqual(nav.proximoLote([], 0, null), { itens: [], feitos: 0, ultimoTipo: null, acabou: true });
});

// Os elementos no nível de cima do template, sem os comentários e as expressões do Handlebars (o mesmo contador de
// partes-da-ficha-veiculo.test.mjs).
const VAZIOS = new Set(['img', 'input', 'br', 'hr', 'meta', 'link', 'source', 'area', 'col', 'embed', 'param', 'track', 'wbr']);
function raizes(html) {
  const limpo = html.replace(/\{\{!--[\s\S]*?--\}\}/g, '').replace(/\{\{[^}]*\}\}\}?/g, '');
  let profundidade = 0;
  let quantas = 0;
  for (const [, fecha, tag, auto] of limpo.matchAll(/<(\/?)([a-zA-Z][\w-]*)[^>]*?(\/?)>/g)) {
    if (fecha) { profundidade -= 1; continue; }
    if (profundidade === 0) quantas += 1;
    if (!auto && !VAZIOS.has(tag.toLowerCase())) profundidade += 1;
  }
  return quantas;
}

test('C43.3: cada parte das janelas é um template com um só elemento raiz (handlebars-application.mjs:172), e o CSS entra no sistema', () => {
  const codigo = ler('foundry-sistema/scripts/navegador.mjs');
  const partes = [...codigo.matchAll(/static PARTS = \{([\s\S]*?)\n {2}\};|static PARTS = \{([^\n]*)\};/g)].map(([, varias, uma]) => varias ?? uma);
  const templates = partes.flatMap(texto => [...texto.matchAll(/^\s*(\w+): \{ template: modelo\('([\w-]+)'\)|(\w+): \{ template: modelo\('([\w-]+)'\)/gm)].map(m => m[2] ?? m[4]));
  assert.deepEqual(templates, ['busca', 'filtros', 'resultados', 'compendios']);
  for (const nome of [...templates, 'tristate']) assert.equal(raizes(ler(`foundry-sistema/templates/navegador/${nome}.hbs`)), 1, `${nome}.hbs`);
  // O lote não é parte: entra no fim da lista, com o cabeçalho e as linhas.
  assert.ok(!templates.includes('lote'));
  assert.ok(sistema.styles.some(estilo => estilo.src === 'styles/navegador.css' && estilo.layer === 'system'));
  // A janela está na lista das temáticas do tema.css (as variáveis --cp-*, o cabeçalho e o corpo).
  const tema = ler('foundry-sistema/styles/tema.css');
  assert.equal(tema.split('.cpr-fieldbook.navegador,').length - 1, 1);
  assert.equal((tema.match(/\.janela-net, \.navegador, \.navegador-compendios\) \.window-(header|content)/g) ?? []).length, 2);
});

test('C43.3: o menu dos compêndios, só do mestre, e o registro do mundo, escondido, com todos por padrão (settings.js:124-148)', () => {
  const menus = new Map(), registros = new Map();
  const anterior = globalThis.game;
  globalThis.game = { settings: { registerMenu: (s, chave, dados) => menus.set(`${s}.${chave}`, dados), register: (s, chave, dados) => registros.set(`${s}.${chave}`, dados) } };
  class Janela {}
  const aoMudar = () => {};
  try { registrarCompendiosDoNavegador(Janela, aoMudar); } finally { if (anterior === undefined) delete globalThis.game; else globalThis.game = anterior; }
  const menu = menus.get('cpr-fieldbook.navegadorCompendiosMenu');
  assert.equal(menu.type, Janela);
  assert.equal(menu.restricted, true);
  const registro = registros.get('cpr-fieldbook.navegadorCompendios');
  assert.deepEqual([registro.scope, registro.config, registro.type, registro.default, registro.onChange], ['world', false, Object, {}, aoMudar]);
  // O navegador lê a mesma chave.
  assert.match(ler('foundry-sistema/scripts/navegador.mjs'), /export const CONFIG_COMPENDIOS = 'navegadorCompendios';/);
});

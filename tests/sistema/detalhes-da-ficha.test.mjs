// C34, parte 1: os detalhes da ficha do CORE 0.92.4, sem Foundry. A aba Efeitos (o estado de cada efeito, o uso que o
// liga e os botões; foundry-sistema/scripts/regras-efeitos.mjs), o +1 à mão na penalidade do Death Save e as listas que
// recolhem e expandem (regras-inventario.mjs). Os valores esperados saem do código do CORE, lido aqui.
// Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { ATIVACOES } from '../../foundry-sistema/scripts/config.mjs';
import { controlesDoEfeito, estadoDoEfeito, ligaAMao, resumoDasMudancas, usoQueLiga } from '../../foundry-sistema/scripts/regras-efeitos.mjs';
import { alternarRecolhida, listaDoGrupo, marcarRecolhidas } from '../../foundry-sistema/scripts/regras-inventario.mjs';

const pasta = new URL('../../foundry-sistema/', import.meta.url);
const ler = arquivo => readFileSync(new URL(arquivo, pasta), 'utf8');
const doCore = arquivo => readFileSync(new URL(`../../cyberpunk-red-core/${arquivo}`, import.meta.url), 'utf8');
// O corpo de um método: da assinatura até a primeira linha que fecha no mesmo recuo.
const corpo = (texto, assinatura, fim = '\n  }') => {
  const inicio = texto.indexOf(assinatura);
  assert.ok(inicio >= 0, `sem ${assinatura.trim()}`);
  return texto.slice(inicio, texto.indexOf(fim, inicio) + fim.length);
};

test('C34, os efeitos: os três grupos do CORE (os que valem, os situacionais e os inativos: desligados ou suprimidos)', () => {
  const core = corpo(doCore('modules/actor/sheet/cpr-actor-sheet.js'), '  async prepareActiveEffectCategories() {');
  for (const grupo of ['permanent', 'situational', 'inactive']) assert.ok(core.includes(`${grupo}: {`), grupo);
  assert.ok(core.includes('if (e.disabled || e.system.isSuppressed) {'));
  assert.deepEqual(estadoDoEfeito(), { grupo: 'valendo', chave: 'valendo', rotulo: 'VALENDO' });
  assert.deepEqual(estadoDoEfeito({ desligado: true }), { grupo: 'parado', chave: 'desligado', rotulo: 'DESLIGADO' });
  // Desligado vem antes de tudo: o efeito desligado não vale nem a janela o oferece.
  assert.equal(estadoDoEfeito({ desligado: true, foraDeUso: true, situacional: true, suprimido: true }).chave, 'desligado');
  assert.deepEqual(estadoDoEfeito({ foraDeUso: true, uso: 'instalado', suprimido: true }), { grupo: 'parado', chave: 'fora-de-uso', rotulo: 'FORA DE USO: VALE INSTALADO' });
  assert.equal(estadoDoEfeito({ foraDeUso: true, inoperante: true, uso: 'equipada', suprimido: true }).rotulo, 'INOPERANTE (EMP)');
});

test('C34, os efeitos: o situacional fica no grupo dele, e só se o item está em uso (a janela de rolagem do sistema)', () => {
  // A janela oferece o situacional ligado e no uso, vencido ou não (documentos.mjs, #efeitosSituacionais).
  const documentos = ler('scripts/documentos.mjs');
  assert.ok(documentos.includes('if (!dados?.situacional?.sim || efeito.disabled || dados.foraDeUso) continue;'));
  assert.deepEqual(estadoDoEfeito({ situacional: true, ligadoPorPadrao: true, suprimido: true }), { grupo: 'situacional', chave: 'situacional', rotulo: 'SITUACIONAL: LIGADO NA JANELA' });
  assert.equal(estadoDoEfeito({ situacional: true, suprimido: true }).rotulo, 'SITUACIONAL: DESLIGADO NA JANELA');
  assert.equal(estadoDoEfeito({ situacional: true, vencido: true, suprimido: true }).grupo, 'situacional');
  assert.equal(estadoDoEfeito({ situacional: true, foraDeUso: true, uso: 'instalado', suprimido: true }).chave, 'fora-de-uso');
  // Vencido (a duração do Foundry) e suprimido (o scanner que não acumula), sem efeito agora.
  assert.deepEqual(estadoDoEfeito({ vencido: true, suprimido: true }), { grupo: 'parado', chave: 'vencido', rotulo: 'VENCIDO' });
  assert.deepEqual(estadoDoEfeito({ suprimido: true }), { grupo: 'parado', chave: 'suprimido', rotulo: 'SUPRIMIDO' });
});

test('C34, os efeitos: o uso que liga o efeito de cada tipo de item, o do DadosEfeito.foraDeUso', () => {
  const foraDeUso = corpo(ler('scripts/dados.mjs'), '  get foraDeUso() {');
  assert.ok(foraDeUso.includes("if (item.type === 'cyberware') return !item.system.instalado;"));
  assert.ok(foraDeUso.includes("if (item.type === 'arma' || item.type === 'armadura') return !item.system.equipada;"));
  assert.ok(foraDeUso.includes("if (item.type === 'programa') return !item.system.ativo || !item.instaladoNo;"));
  assert.equal(usoQueLiga({ type: 'cyberware', system: {} }), 'instalado');
  assert.equal(usoQueLiga({ type: 'arma', system: {} }), 'equipada');
  assert.equal(usoQueLiga({ type: 'armadura', system: {} }), 'vestida');
  assert.equal(usoQueLiga({ type: 'programa', system: {} }), 'ativo num deck');
  assert.equal(usoQueLiga({ type: 'droga', system: {} }), ATIVACOES.manual.toLowerCase());
  assert.equal(usoQueLiga({ type: 'equipamento', system: { ativacao: 'equipado' } }), 'só equipado');
  assert.equal(usoQueLiga({ type: 'equipamento', system: { ativacao: 'carregando' } }), 'equipado ou carregando');
  assert.equal(usoQueLiga({ type: 'equipamento', system: { ativacao: 'manual' } }), 'ligado à mão');
  assert.equal(usoQueLiga({ type: 'roupa', system: {} }), 'sempre');
  assert.equal(resumoDasMudancas([{ key: 'system.bonus.pericias.perception', type: 'add', value: '1' }, { key: 'system.atributos.ref.valor', type: 'override', value: '9' }]),
    'bonus.pericias.perception + 1 · atributos.ref.valor override 9');
});

test('C34, os efeitos: liga e desliga o do personagem (o CORE) e o do item ligado à mão (a ficha do item); apaga só o do personagem', () => {
  // O CORE: o do próprio ator sempre liga e desliga (a primeira condição) e só ele se copia e se apaga.
  assert.ok(corpo(doCore('modules/system/register-helpers.js'), 'Handlebars.registerHelper("cprShowEffectToggle"', '\n  });').includes('if (effect.sourceName === name) return true;'));
  const efeitosDoCore = doCore('templates/actor/character/right-pane/cpr-effects.hbs');
  const doAtor = efeitosDoCore.slice(efeitosDoCore.indexOf('{{#if (cprCompare effect.sourceName "===" ../../actor.name) }}'));
  assert.ok(doAtor.indexOf('data-action="delete"') > 0 && doAtor.indexOf('data-action="delete"') < doAtor.indexOf('{{/if}}'));
  // A regra de ligar à mão é uma só: a ficha do item a importa.
  const fichaItem = ler('scripts/ficha-item.mjs');
  assert.match(fichaItem, /import \{ ligaAMao, resumoDasMudancas \} from '\.\/regras-efeitos\.mjs';/);
  assert.ok(!/const ligaAMao\s*=/.test(fichaItem));
  assert.equal(ligaAMao({ type: 'droga', system: {} }), true);
  assert.deepEqual(controlesDoEfeito({ proprio: true }), { ligar: true, apagar: true });
  assert.deepEqual(controlesDoEfeito({ item: { type: 'droga', system: {} } }), { ligar: true, apagar: false });
  assert.deepEqual(controlesDoEfeito({ item: { type: 'equipamento', system: { ativacao: 'manual' } } }), { ligar: true, apagar: false });
  for (const item of [{ type: 'equipamento', system: { ativacao: 'carregando' } }, { type: 'cyberware', system: {} }, { type: 'arma', system: {} }, { type: 'roupa', system: {} }]) {
    assert.deepEqual(controlesDoEfeito({ item }), { ligar: false, apagar: false }, item.type);
  }
  // A ficha confere a regra de novo no clique, e o apagar é só do efeito do próprio ator.
  const ficha = ler('scripts/ficha-personagem.mjs');
  assert.ok(corpo(ficha, '  static #alternarEfeito(').includes('controlesDoEfeito({ proprio: !item, item }).ligar ? efeito.update({ disabled: !efeito.disabled }) : null'));
  assert.ok(corpo(ficha, '  static async #apagarEfeito(').includes('efeito?.parent !== this.actor'));
});

test('C34, o Death Save: o +1 à mão soma 1 à penalidade, ao lado do "zerar", nas duas fichas e só para quem edita', () => {
  assert.ok(corpo(doCore('modules/actor/cpr-actor.js'), '  increaseDeathPenalty() {').includes('this.system.derivedStats.deathSave.penalty + 1;'));
  assert.ok(corpo(ler('scripts/documentos.mjs'), '  subirDeathSave() {').includes("this.update({ 'system.deathSave.penalidade': this.system.deathSave.penalidade + 1 })"));
  assert.ok(ler('scripts/ficha-personagem.mjs').includes('subirDeathSave: FichaPersonagem.#subirDeathSave,'));
  // O personagem tem o Death Save no painel geral e na aba Combate; o capanga, no painel geral (o mook do CORE também tem).
  assert.ok(doCore('templates/actor/cpr-mook-sheet.hbs').includes('increase-deathsave-value'));
  for (const arquivo of ['templates/personagem/bloco-geral.hbs', 'templates/personagem/combate.hbs']) {
    const linhas = ler(arquivo).split(/\r?\n/);
    const zerar = linhas.findIndex(linha => linha.includes('data-action="zerarDeathSave"'));
    assert.ok(zerar >= 0, arquivo);
    assert.match(linhas[zerar + 1], /^\s*{{#if editavel}}<a class="subir" data-action="subirDeathSave"[^>]*>\+1<\/a>{{\/if}}$/, arquivo);
  }
});

test('C34, as listas: recolher põe, expandir tira; o ator sem nenhuma sai da flag do usuário', () => {
  assert.deepEqual(alternarRecolhida([], 'arma'), ['arma']);
  assert.deepEqual(alternarRecolhida(['arma'], 'droga'), ['arma', 'droga']);
  assert.deepEqual(alternarRecolhida(['arma', 'droga'], 'arma'), ['droga']);
  assert.equal(alternarRecolhida(['arma'], 'arma'), null);
  // O CORE guarda por usuário (uma configuração escondida) e não no ator; aqui, uma flag do usuário, como a árvore dos
  // instalados (arvore-itens.mjs).
  const configuracoes = doCore('modules/system/settings.js');
  assert.match(configuracoes.slice(configuracoes.indexOf('"userSettings"')), /^"userSettings", \{\s+name: "User Settings",\s+scope: "client",\s+config: false,/);
  assert.ok(ler('scripts/arvore-itens.mjs').includes('await game.user.setFlag(SISTEMA, FLAG_ABERTOS,'));
  const recolher = corpo(ler('scripts/ficha-personagem.mjs'), '  static async #recolherLista(');
  assert.ok(recolher.includes('await game.user.setFlag(SISTEMA, FLAG_RECOLHIDAS, { [this.actor.id]: novas ?? new foundry.data.operators.ForcedDeletion() });'));
  assert.ok(!recolher.includes('this.actor.update') && !recolher.includes('isEditable'));
});

test('C34, as listas: o grupo de perícias recolhido esconde as dele, menos as favoritas, como o item preso do CORE', () => {
  assert.match(corpo(doCore('modules/actor/sheet/cpr-actor-sheet.js'), '  _expandButton(event) {'), /if \(\$\(lineItem\)\.hasClass\("item"\) && !\$\(lineItem\)\.hasClass\("favorite"\)\) \{/);
  const linhas = [{ grupo: 'Luta' }, { id: 'brawling', favorita: false }, { id: 'evasion', favorita: true }, { grupo: 'Educação' }, { id: 'education', favorita: false }];
  assert.deepEqual(marcarRecolhidas(linhas, [listaDoGrupo('Luta')]), [
    { grupo: 'Luta', lista: 'pericias-Luta' }, { id: 'brawling', favorita: false, recolhida: true }, { id: 'evasion', favorita: true, recolhida: false },
    { grupo: 'Educação', lista: 'pericias-Educação' }, { id: 'education', favorita: false, recolhida: false }
  ]);
  assert.ok(marcarRecolhidas(linhas, []).every(linha => !linha.recolhida));
  // A busca não abre o grupo: no CORE, o filtro só decide se a linha existe, e a recolhida continua com o "hide".
  const categoria = doCore('templates/actor/character/right-pane/tabs/skills/cpr-skills-category.hbs').split(/\r?\n/);
  const filtro = categoria.findIndex(linha => linha.includes('{{#if (cprSheetContentFilter'));
  assert.match(categoria[filtro + 1], /collapsedSections[^}]*"skillTab-VAR"[^}]*\)\) }} hide/);
  // Aqui, a recolhida é uma classe (o CSS a esconde) e a busca, o hidden (#filtrar): uma não desfaz a outra.
  const tema = ler('styles/tema.css');
  assert.ok(tema.includes('.cpr-fieldbook.ficha-personagem .painel.recolhida ol.itens > li[data-item-id]:not(:has(.estrela.ligada)),'));
  assert.ok(tema.includes('.cpr-fieldbook.ficha-personagem .lista-pericias li.pericia.recolhida { display: none; }'));
  assert.ok(!corpo(ler('scripts/ficha-personagem.mjs'), '  #filtrar() {').includes('recolhida'));
});

test('C34, as listas: o nome de cada lista da aba Equipamento e de cada grupo de perícias recolhe, pelo mesmo bloco', () => {
  // Um link com papel de botão: o _toggleDisabled do Foundry 14 desliga os controles do formulário na ficha de quem só vê.
  const bloco = ler('templates/personagem/bloco-recolher.hbs');
  assert.match(bloco, /<a class="recolher" data-action="recolherLista" data-lista="{{lista}}" role="button" tabindex="0" aria-expanded="{{#if \(lookup @root.recolhida lista\)}}false{{else}}true{{\/if}}"/);
  assert.ok(!/<button[^>]*recolherLista/.test(bloco));
  const chamada = '{{> "systems/cpr-fieldbook/templates/personagem/bloco-recolher.hbs"';
  const equipamento = ler('templates/personagem/equipamento.hbs');
  const listas = [...equipamento.matchAll(/{{> "systems\/cpr-fieldbook\/templates\/personagem\/bloco-recolher\.hbs" lista=("?)(\w+)\1/g)].map(([, , lista]) => lista);
  assert.deepEqual(listas, ['municao', 'arma', 'armadura', 'tipo', 'upgrade', 'veiculo']);
  // Cada painel recolhido leva a classe, pelo mesmo id do botão dele.
  for (const lista of ['municao', 'arma', 'armadura', 'upgrade', 'veiculo']) assert.ok(equipamento.includes(`{{#if recolhida.${lista}}} recolhida{{/if}}">`), lista);
  assert.ok(equipamento.includes('{{#if (lookup @root.recolhida tipo)}} recolhida{{/if}}">'));
  const geral = ler('templates/personagem/bloco-geral.hbs');
  assert.ok(geral.includes(`<li class="grupo-pericias">${chamada} lista=lista titulo=grupo}}</li>`));
  assert.ok(geral.includes('{{#if recolhida}} recolhida{{/if}}" data-pericia="{{id}}">'));
  // O bloco entra nas partes que o usam: a aba Perícias e a Equipamento do personagem e o corpo do capanga.
  const doBloco = "bloco('recolher')";
  const ficha = ler('scripts/ficha-personagem.mjs');
  assert.ok(ficha.includes(`pericias: { ...aba('pericias'), templates: [bloco('geral'), bloco('lesoes'), ${doBloco}] },`));
  assert.ok(ficha.includes(`equipamento: { ...aba('equipamento'), templates: [${doBloco}] },`));
  assert.ok(ler('scripts/ficha-capanga.mjs').includes(`bloco('lesoes'), ${doBloco}]`));
  // E a aba Efeitos, no fim das abas.
  assert.ok(ficha.includes("{ id: 'vida', label: 'Vida', icon: 'fa-solid fa-book-open' }, { id: 'efeitos', label: 'Efeitos', icon: 'fa-solid fa-bolt' }"));
  assert.ok(ficha.includes("efeitos: aba('efeitos'),"));
});

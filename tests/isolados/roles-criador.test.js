const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const raiz = path.resolve(__dirname, '../..');
const fontes = ['personagem-roles.js', 'personagem-cyberware.js', 'system-criacao.js', 'system-rules.js', 'system-net.js', 'loja-catalogo.js', 'criador.js', 'conta.js']
  .map(nome => [nome, fs.readFileSync(path.join(raiz, nome), 'utf8')]);
const simples = valor => JSON.parse(JSON.stringify(valor));
const escapar = texto => String(texto ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

// Só os pontos de contato do formulário: o teste chama a lógica real de setup/eventos em VM, sem DOM/navegador.
function ambiente({ atrasarPut = false } = {}) {
  const elemento = () => ({
    innerHTML: '', dataset: {}, classList: { toggle() {} }, addEventListener() {}, scrollIntoView() {},
    querySelectorAll: () => [], querySelector: () => null
  });
  const root = elemento();
  const nos = Object.fromEntries(['#cc-save', '#cc-summary', '#cc-help', '#cc-step', '#cc-recover'].map(id => [id, elemento()]));
  nos['#cc-help'].firstElementChild = elemento();
  root.querySelector = seletor => nos[seletor] || null;
  const timers = new Map();
  const navegacoes = [];
  const aguardando = [];
  let proximoTimer = 0;
  let carregado = null;
  let salvo = null;
  const contexto = vm.createContext({
    window: { matchMedia: () => ({ matches: true }) },
    document: { addEventListener() {}, querySelectorAll: () => [] },
    location: { protocol: 'http:' }, console,
    setTimeout: fn => { const id = ++proximoTimer; timers.set(id, fn); return id; },
    clearTimeout: id => timers.delete(id),
    fetch: async (url, opcoes = {}) => {
      let dados;
      if (url === 'api/eu') dados = { papel: 'jogador' };
      else if (url.startsWith('api/loja/regras')) dados = {};
      else if (opcoes.method === 'PUT') {
        salvo = JSON.parse(opcoes.body);
        if (atrasarPut) await new Promise(resolve => aguardando.push(resolve));
        dados = { personagem: { ...salvo, versao: 2, atualizado: '2026-01-01T12:00:00Z' } };
      }
      else dados = { personagem: carregado };
      return { status: 200, json: async () => dados };
    }
  });
  for (const [nome, codigo] of fontes) vm.runInContext(codigo, contexto, { filename: nome });
  const regras = contexto.window.characterCreator.regras;
  const doc = (role = 'solo', metodo = 'pacote') => ({
    ...regras.blank(), id: 'teste', nome: 'Exemplo', role, metodo, sorteio: { linha: 1 }, lingua: 'Portuguese', casa: 'Heywood'
  });
  return {
    regras, doc, root, nos, contexto, navegacoes,
    pendentes: () => aguardando.length,
    liberarSalvamento: () => aguardando.shift()(),
    async abrir(personagem) {
      carregado = personagem;
      await contexto.window.characterCreator.pages.criador.setup({ querySelector: () => root }, {
        escapeHtml: escapar, target: { section: personagem.id }, openPage: (pagina, alvo) => navegacoes.push({ pagina, alvo }), rollDice: () => 1,
        storage: { get: () => '', set() {} }
      });
    },
    async salvar() {
      await root.onclick({ target: alvo('[data-cc-sheet]') });
      return salvo;
    }
  };
}

function alvo(seletor, dataset = {}, value = '', role = '') {
  const objeto = {
    dataset, value, matches: consulta => consulta === seletor,
    closest: consulta => consulta === seletor ? objeto : consulta === '[data-role-context]' && role ? { dataset: { roleContext: role } } : null
  };
  return objeto;
}

test('segunda Role preserva STATs, perícias, pacote e orçamento únicos da principal', () => {
  const { regras, doc } = ambiente();
  for (const metodo of ['ratoderua', 'edgerunner', 'pacote']) {
    const principal = doc('solo', metodo);
    const dupla = { ...principal, roleSecundaria: { id: 'medtech', rank: 2, habilidades: { Surgery: 2 } } };
    const antes = regras.result(principal);
    const depois = regras.result(dupla);
    assert.deepEqual(simples(depois.stats), simples(antes.stats));
    assert.deepEqual(simples(depois.pericias), simples(antes.pericias));
    assert.deepEqual(simples(depois.itens), simples(antes.itens));
    assert.deepEqual(simples(depois.dinheiro), simples(antes.dinheiro));
    assert.deepEqual(simples(depois.role), simples(depois.roles[0]));
    assert.equal(depois.roles[0].rank, 4);
    assert.equal(depois.roles[1].rank, 2);
    assert.equal(depois.roles[1].habilidades.find(item => item.nome === 'Surgery Skill').rank, 4);
  }
});

test('Exec secundária ganha terno uma vez e moradia corporativa só no Rank 2', () => {
  const { regras, doc } = ambiente();
  for (const metodo of ['ratoderua', 'edgerunner', 'pacote']) {
    const personagem = { ...doc('solo', metodo), roleSecundaria: { id: 'exec', rank: 1 } };
    const terno = regras.inventory(personagem).filter(entry => entry.id.startsWith('core_clothing:businesswear-'));
    assert.equal(terno.length, 3);
    assert.equal(new Set(terno.map(entry => entry.id)).size, 3);
    personagem.moradia = 'conapt-corp';
    assert.equal(regras.housing(personagem).tipo, 'conteiner');
    personagem.roleSecundaria.rank = 2;
    assert.equal(regras.housing(personagem).tipo, 'conapt-corp');
    assert.equal(regras.housing(personagem).aluguel, 0);
    const exec = doc('exec', metodo);
    const ids = regras.inventory(exec).map(entry => entry.id).filter(id => id.startsWith('core_clothing:businesswear-'));
    assert.equal(ids.length, new Set(ids).size, `terno duplicado em ${metodo}`);
  }
});

test('Nomad secundária exporta oficina pelo seu Rank sem mudar a Role principal', () => {
  const { regras, doc } = ambiente();
  const personagem = { ...doc(), rankRole: 3, roleSecundaria: { id: 'nomad', rank: 1, oficina: ['v:Roadbike', 'v:Jetski'] } };
  const resultado = regras.result(personagem);
  assert.deepEqual(simples(resultado.veiculos.map(item => item.nome)), ['Moto Estradeira']);
  assert.equal(resultado.role.id, 'solo');
  assert.equal(resultado.role.rank, 3);
  assert.ok(!regras.pending(personagem).some(item => /Oficina da Família/.test(item.text)));
  personagem.roleSecundaria.rank = 3;
  assert.ok(regras.pending(personagem).some(item => /Oficina da Família.*1 escolha/.test(item.text)));
});

test('ficha mostra habilidades separadas e quickhacks gratuitos pelo Rank da segunda Role', () => {
  const { regras, doc } = ambiente();
  const personagem = { ...doc(), habilidades: { 'Initiative Reaction': 4 }, roleSecundaria: { id: 'netrunner', rank: 1 } };
  const ficha = regras.sheetHtml(personagem);
  assert.match(ficha.lede, /Solo Rank 4 \/ Netrunner Rank 1/);
  assert.match(ficha.resumo, /Reação de Iniciativa/);
  assert.match(ficha.resumo, /Impair Movement/);
  assert.ok(!/Overheat/.test(ficha.resumo));
  assert.ok(regras.quickhacksAt(2).some(hack => hack.name === 'Overheat'));
  assert.match(regras.foundryBox(personagem, 'jogador'), /Foundry 14 ainda aceita uma Role/);
});

test('snapshot legado singular não inventa a segunda Role da criação na ficha da mesa', () => {
  const { regras, doc } = ambiente();
  const personagem = { ...doc(), roleSecundaria: { id: 'medtech', rank: 2 }, foundry: { importado: '2026-01-01' }, mesa: {
    stats: {}, role: { nome: 'Solo', rank: 5, habilidades: [['Initiative Reaction', 5]] }
  } };
  let ficha = regras.sheetHtml(personagem);
  assert.match(ficha.lede, /Solo Rank 5/);
  assert.ok(!/Medtech/.test(ficha.lede));
  personagem.mesa.roles = [personagem.mesa.role, { nome: 'Medtech', rank: 2, habilidades: [['Surgery', 2], ['Surgery Skill', 4]] }];
  ficha = regras.sheetHtml(personagem);
  assert.match(ficha.lede, /Medtech Rank 2/);
  assert.match(ficha.resumo, /Cirurgia/);
});

test('cartões e conta usam resumo com duas Roles mesmo quando mesa contém só HP', () => {
  const { regras, contexto } = ambiente();
  const resumo = { role: 'solo', foundry: { importado: '2026-01-01' }, mesa: { hp: { atual: 20, max: 30 } }, roles: [{ id: 'solo', rank: 5 }, { id: 'tech', rank: 2 }] };
  assert.equal(regras.rolesLabel(resumo), 'Solo Rank 5 / Tech Rank 2');
  assert.equal(contexto.window.playerAccount.rolesLabel(resumo), 'Solo Rank 5 / Tech Rank 2');
});

test('eventos do criador preservam a principal ao escolher/trocar secundária e salvam sua distribuição', async () => {
  const mundo = ambiente();
  const personagem = { ...mundo.doc(), rankRole: 3, habilidades: { 'Initiative Reaction': 3 } };
  await mundo.abrir(personagem);
  mundo.root.onchange({ target: alvo('[data-role-secondary]', {}, 'medtech') });
  mundo.root.onchange({ target: alvo('[data-role-rank]', { roleRank: 'secundaria' }, '2') });
  mundo.root.onclick({ target: alvo('[data-hab-plus]', { habPlus: 'Surgery' }, '', 'medtech') });
  mundo.root.onclick({ target: alvo('[data-hab-plus]', { habPlus: 'Surgery' }, '', 'medtech') });
  let salvo = await mundo.salvar();
  assert.equal(salvo.role, 'solo');
  assert.equal(salvo.rankRole, 3);
  assert.deepEqual(salvo.habilidades, { 'Initiative Reaction': 3 });
  assert.equal(salvo.roleSecundaria.habilidades.Surgery, 2);
  assert.equal(salvo.resultado.roles[1].habilidades.find(item => item.nome === 'Surgery Skill').rank, 4);
  mundo.root.onchange({ target: alvo('[data-role-secondary]', {}, 'tech') });
  salvo = await mundo.salvar();
  assert.deepEqual(salvo.habilidades, { 'Initiative Reaction': 3 });
  assert.deepEqual(salvo.roleSecundaria.habilidades, {});
  assert.equal(salvo.resultado.roles[1].rank, 1);
  assert.match(mundo.nos['#cc-step'].innerHTML, /data-role-context="tech"/);
});

test('Lifepaths das duas Roles e oficina secundária sobrevivem aos eventos e ao salvamento', async () => {
  const mundo = ambiente();
  await mundo.abrir({ ...mundo.doc(), roleSecundaria: { id: 'nomad', rank: 1, habilidades: {}, oficina: [], lifepath: {} } });
  mundo.root.onchange({ target: alvo('[data-oficina]', { oficina: '0' }, 'v:Roadbike', 'nomad') });
  mundo.root.onclick({ target: alvo('[data-step]', { step: '4' }) });
  mundo.root.onclick({ target: alvo('[data-rlp-all]', {}, '', 'solo') });
  mundo.root.onclick({ target: alvo('[data-rlp-all]', {}, '', 'nomad') });
  const salvo = await mundo.salvar();
  assert.ok(Object.keys(salvo.lifepath.role).length > 0);
  assert.ok(Object.keys(salvo.roleSecundaria.lifepath).length > 0);
  assert.deepEqual(salvo.roleSecundaria.oficina, ['v:Roadbike']);
  assert.match(salvo.resultado.lifepath.roleLifepath, /Solo:/);
  assert.match(salvo.resultado.lifepath.roleLifepath, /Nomad:/);
  assert.equal(salvo.resultado.veiculos[0].nome, 'Moto Estradeira');
});

test('personagem importado mantém escolhas de Role e Rank no fieldset desabilitado', async () => {
  const mundo = ambiente();
  await mundo.abrir({ ...mundo.doc(), foundry: { importado: '2026-01-01' }, roleSecundaria: { id: 'tech', rank: 2 } });
  const html = mundo.nos['#cc-step'].innerHTML;
  assert.match(html, /<fieldset disabled class="cc-locked">[\s\S]*data-role-secondary[\s\S]*<\/fieldset>/);
  assert.match(html, /data-role-rank="principal"/);
  assert.match(html, /data-role-rank="secundaria"/);
});

test('edição de nome de personagem legado não acrescenta campos de Role bloqueados', async () => {
  const mundo = ambiente();
  await mundo.abrir({ ...mundo.doc(), foundry: { importado: '2026-01-01' } });
  mundo.root.oninput({ target: alvo('[data-campo]', { campo: 'nome' }, 'Nome novo') });
  const salvo = await mundo.salvar();
  assert.equal(salvo.nome, 'Nome novo');
  assert.ok(!Object.hasOwn(salvo, 'rankRole'));
  assert.ok(!Object.hasOwn(salvo, 'roleSecundaria'));
  assert.equal(salvo.resultado.role.rank, 4);
});

test('Ficha, Loja e slot de cyberware aguardam o PUT antes de navegar', async t => {
  for (const fluxo of ['ficha', 'loja', 'cyberware']) await t.test(fluxo, async () => {
    const mundo = ambiente({ atrasarPut: true });
    await mundo.abrir(mundo.doc());
    mundo.root.onchange({ target: alvo('[data-role-secondary]', {}, 'medtech') });
    let target = alvo(fluxo === 'ficha' ? '[data-cc-sheet]' : '[data-cc-shop]');
    if (fluxo === 'cyberware') {
      target = alvo('[data-cy-loja]', { cyLoja: 'neuralWare', cyBase: '1', cyNome: 'Neuralware' });
      const closest = target.closest;
      target.closest = seletor => seletor === '.cy-screen' ? {} : closest(seletor);
    }
    const clicou = mundo.root.onclick({ target });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(mundo.pendentes(), 1, 'o salvamento deve ter começado');
    assert.deepEqual(mundo.navegacoes, [], 'não deve consultar a página de destino antes de concluir o PUT');
    mundo.liberarSalvamento();
    await clicou;
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(mundo.navegacoes.length, 1);
    assert.equal(mundo.navegacoes[0].pagina, fluxo === 'ficha' ? 'ficha' : 'loja');
    assert.equal(mundo.navegacoes[0].alvo.section, 'teste');
    if (fluxo === 'cyberware') assert.deepEqual(simples(mundo.navegacoes[0].alvo.cyber), { tipo: 'neuralWare', base: true, nome: 'Neuralware' });
  });
});

// A wiki da mesa e este sistema:
// - Importar da wiki: o personagem criado no criador da wiki vira um ator deste sistema, com STATs, perícias, Role,
//   Humanidade, dinheiro e o equipamento montado (armas carregadas, armaduras vestidas, cyberware instalado, programas
//   no deck, acessórios na arma, veículos da família). Os itens vêm de dados/catalogo.json pelo mesmo id da loja da wiki
//   ("core_weapons:assault-rifle"); o que não existir vira um aviso, e o resto entra.
// - Na mesa: a cada mudança num ator importado, o mestre ativo manda a ficha de volta, e a wiki a mostra.
// - O vínculo deste Foundry: a importação, a ficha da mesa e o ator apagado vão para a wiki com geracao: 14 (o vínculo do
//   Foundry 14, ao lado do vínculo do 12, que o módulo cpr-2077 grava). Um não derruba o outro.
import { ehArmaMontadaEmItem } from './armas-cyberware.mjs';
import { planejarAtualizacao } from './wiki-atualizacao.mjs';
import { aplicarRetrato, retratoMudou } from './wiki-retrato.mjs';
export { avisosDaWiki } from './wiki-avisos.mjs';
import { carregarCatalogo } from './catalogo.mjs';
import { ATRIBUTOS, enderecoPadraoDaWiki, LIFEPATH, SISTEMA, USOS } from './config.mjs';
import { roleDaWiki } from './dados.mjs';
import { FAMILIAS, PERICIAS } from './gerado.mjs';
import { ehBaseNatural, ladoValido, linhaDoExtrato, moradiaDaMesa, moradiaDaWiki, moradiaParaAWiki, periciaPropria } from './regras.mjs';
import { mudouDeCampanha, pertenceACampanha, prepararAtorTransferido, resolverCampanha, vinculoDaGeracao14 } from './wiki-campanha.mjs';

// O Foundry deste sistema, para o vínculo na wiki (o do 12 é o do módulo cpr-2077).
const GERACAO = 14;

// O extrato de quem chega da wiki: uma linha para cada valor que não começa em zero (o dinheiro inicial, como o
// cpr-2077 fazia no ledger do CORE).
const extratosIniciais = (valores, motivo) => Object.fromEntries(Object.entries(valores).map(([campo, valor]) =>
  [campo, valor ? [linhaDoExtrato({ acao: 'definir', antes: 0, saldo: valor, motivo, usuario: game.user.name })] : []]));

// A Role com o nome do RED: as do suplemento de fã que saíram (Face, Corpo) viram a de onde vinham, como a wiki faz.
const nomeDaRole = nome => roleDaWiki(nome)?.nome ?? String(nome ?? '');

// O Lifepath que o criador da wiki manda pronto, em texto (resultado.lifepath, com os nomes do CORE).
const lifepathDaWiki = lifepath => Object.fromEntries(LIFEPATH.map(({ chave, wiki }) => [chave, String(lifepath?.[wiki] ?? '')]));

export { carregarCatalogo, enderecoPadraoDaWiki };

export function registrarWiki() {
  game.settings.register(SISTEMA, 'wikiUrl', {
    name: 'Endereço da wiki',
    hint: 'De onde o mestre importa os personagens (o servidor da wiki da mesa). Vazio: wiki.seudominio quando a mesa abre em mesa.seudominio, ou http://localhost:8000 com tudo no mesmo computador.',
    scope: 'world', config: true, type: String, default: '', onChange: () => { cacheDaCampanha = null; }
  });
  game.settings.register(SISTEMA, 'wikiCampanha', {
    name: 'Campanha da wiki',
    hint: 'O id da campanha deste mundo (na página Campanhas da wiki). Vazio: a que tem este Mundo do Foundry; com uma campanha só, ela. O importador, a ficha e os pedidos ficam com os personagens dela.',
    scope: 'world', config: true, type: String, default: '', onChange: () => { cacheDaCampanha = null; }
  });
  game.settings.register(SISTEMA, 'wikiMesa', {
    name: 'Mandar a ficha para a wiki',
    hint: 'Para o mestre: a cada mudança num personagem que veio da wiki (HP, dinheiro, itens, munição…), manda a ficha para a wiki, que mostra em "Na mesa".',
    scope: 'client', config: true, type: Boolean, default: true
  });
  registrarVoltaParaWiki();
}

const wikiUrl = () => String(game.settings.get(SISTEMA, 'wikiUrl') || enderecoPadraoDaWiki(globalThis.location)).trim().replace(/\/+$/, '');
// Com o cookie da wiki (o mestre entra na wiki neste navegador) e sem cache: a ficha muda o tempo todo.
async function wikiFetch(rota, { method = 'GET', body } = {}) {
  // A ficha de um personagem: com o "roles=2", a wiki manda também o de duas Roles (o C23), e com o "locais=1", o de lado
  // no cyberware (o C30). Sem eles, recusa a um Foundry.
  const lida = method === 'GET' && /^\/api\/personagens\/[^/?]+$/.test(rota) ? `${rota}?roles=2&locais=1` : rota;
  let resposta;
  try {
    resposta = await fetch(`${wikiUrl()}${lida}`, { method, credentials: 'include', cache: 'no-store', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new Error(`Não consegui falar com a wiki em ${wikiUrl()}. Confira o endereço nas configurações do sistema.`);
  }
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw Object.assign(new Error(dados.erro || `a wiki respondeu ${resposta.status}`), { status: resposta.status });
  return dados;
}

// Campanha deste mundo, como o tableCampaign do cpr-2077. Sem a API das campanhas, a wiki continua sem filtro.
let cacheDaCampanha = null;
const chaveDaCampanha = () => `${wikiUrl()}:${game.world.id}:${String(game.settings.get(SISTEMA, 'wikiCampanha') || '').trim()}`;
export async function campanhaDoMundo() {
  const configurada = String(game.settings.get(SISTEMA, 'wikiCampanha') || '').trim();
  const prefixo = `${wikiUrl()}:${game.world.id}:`;
  const chave = chaveDaCampanha();
  let chaveResolvida = chave;
  if (cacheDaCampanha?.chave === chave && Date.now() - cacheDaCampanha.quando < 60000) return cacheDaCampanha.valor;
  let valor = null;
  try {
    const { campanhas = [] } = await wikiFetch('/api/campanhas');
    if (chave !== chaveDaCampanha()) return campanhaDoMundo();
    valor = resolverCampanha(campanhas, configurada, game.world.id);
    if (valor?.id && !configurada && campanhas.length === 1 && souOMestreAtivo()) {
      await game.settings.set(SISTEMA, 'wikiCampanha', valor.id).then(() => { chaveResolvida = `${prefixo}${valor.id}`; }).catch(() => null);
    }
  } catch { valor = null; }
  if (chaveResolvida !== chaveDaCampanha()) return campanhaDoMundo();
  cacheDaCampanha = { chave: chaveResolvida, quando: Date.now(), valor };
  return valor;
}

const ajudaDaCampanha = campanha => `${campanha.erro} Escolha a Campanha da wiki nas configurações do sistema, ou cadastre o Mundo do Foundry (${game.world.id}) na página Campanhas da wiki.`;
function conferirCampanha(doc, campanha, pedido = false) {
  if (pedido && campanha?.erro) throw new Error(ajudaDaCampanha(campanha));
  if (campanha?.id && doc.campanha && !pertenceACampanha(doc, campanha)) throw new Error(`${doc.nome || 'Este personagem'} é de outra campanha da wiki: importe no mundo dela.`);
}

// A API antiga só aceita type character. A casca identifica o transporte; o ator do sistema vai inteiro dentro dela.
const transferenciasEmCurso = new Set();
async function mandarTransferidos(personagens, campanha) {
  const notas = [];
  if (!campanha?.id || !souOMestreAtivo()) return notas;
  for (const doc of personagens.filter(p => !p.publico && mudouDeCampanha(p) && vinculoDaGeracao14(p)?.campanha === campanha.id)) {
    const ator = game.actors.get(vinculoDaGeracao14(doc).ator);
    if (!ator || ator.getFlag(SISTEMA, 'wiki')?.id !== doc.id || ator.getFlag(SISTEMA, 'saiu') || transferenciasEmCurso.has(doc.id)) continue;
    transferenciasEmCurso.add(doc.id);
    try {
      const anterior = await wikiFetch(`/api/personagens/${doc.id}/ator`).catch(erro => { if (erro.status === 404) return null; throw erro; });
      if (anterior) {
        prepararAtorTransferido(anterior, doc, '', { id: doc.campanha }, new Date().toISOString());
      } else {
        const transporte = { name: ator.name, type: 'character', flags: { [SISTEMA]: { crossover: { geracao: GERACAO, ator: ator.toObject() } } } };
        await wikiFetch(`/api/personagens/${doc.id}/ator`, { method: 'PUT', body: { campanha: campanha.id, ator: transporte } });
      }
      await ator.setFlag(SISTEMA, 'saiu', { para: doc.campanha, quando: new Date().toISOString() });
      ui.notifications.info(`Wiki: ${ator.name} foi para outra campanha. A ficha foi para a wiki; o ator deste mundo fica parado.`);
    } catch (erro) { notas.push(`Crossover de ${ator.name}: ${erro.message}`); }
    finally { transferenciasEmCurso.delete(doc.id); }
  }
  return notas;
}

async function importarTransferido(doc, transferencia, donoId, campanha) {
  const dados = prepararAtorTransferido(transferencia, doc, donoId, campanha, new Date().toISOString());
  const ator = await Actor.implementation.create(dados, { keepEmbeddedIds: true });
  if (!ator || !game.actors.has(ator.id)) throw new Error('O Foundry não criou o ator da transferência.');
  const entregues = [...new Set(ator.items.map(item => item.getFlag(SISTEMA, 'wikiUid')).filter(Boolean))];
  // A transferência só sai da wiki depois de o vínculo novo ser confirmado. Uma falha não deixa uma cópia sem vínculo.
  try {
    // O _preCreate do personagem põe visão e barra de HP: no crossover vale o protótipo que veio do mundo antigo.
    if (dados.prototypeToken) await ator.update({ prototypeToken: dados.prototypeToken });
    await wikiFetch(`/api/personagens/${doc.id}/foundry`, { method: 'PUT', body: { ator: ator.id, nomeAtor: ator.name, versao: doc.versao, entregues, geracao: GERACAO, campanha: doc.campanha } });
  } catch (erro) {
    await ator.delete().catch(() => null);
    if (game.actors.has(ator.id)) {
      await ator.setFlag(SISTEMA, 'saiu', { para: doc.campanha, incompleto: true }).catch(() => null);
      throw new Error(`${erro.message} O Foundry não apagou o ator incompleto (${ator.name}, ${ator.id}): confira e remova essa cópia antes de tentar de novo. A transferência continua na wiki.`);
    }
    throw erro;
  }
  const notas = ['Veio do mundo da campanha antiga com a ficha completa, incluindo os itens, efeitos e extratos.'];
  await wikiFetch(`/api/personagens/${doc.id}/ator`, { method: 'DELETE' }).catch(erro => notas.push(`A wiki não apagou a transferência (${erro.message}).`));
  await mandarFicha(ator).catch(erro => notas.push(`A ficha da mesa não voltou à wiki (${erro.message}).`));
  return { ator, notas };
}


const slug = texto => String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const FAMILIA_POR_NOME = Object.fromEntries(Object.entries(FAMILIAS).map(([id, f]) => [f.en, id]));

// "Language (Streetslang)" → família "language", nome "Streetslang". A wiki também manda a família em `base`.
function periciaDaWiki({ nome, nivel, base }) {
  const comum = PERICIAS.find(p => p.en === nome);
  if (comum) return [comum.id, { nivel, familia: '', nome: '' }];
  const [, familiaEn, especifico] = nome.match(/^(.+?) \((.+)\)$/) || [null, base, ''];
  const familia = FAMILIA_POR_NOME[familiaEn] || FAMILIA_POR_NOME[base];
  if (!familia) return null;
  return [`${familia}-${slug(especifico || nome)}`, { nivel, familia, nome: especifico || nome }];
}

// As Roles do resultado do criador (a lista "roles"; o de antes só tem a "role"): no máximo duas, a principal primeiro,
// com o Rank (a de antes, 4) e as habilidades.
function rolesDoResultado(r, notas) {
  const lista = Array.isArray(r.roles) && r.roles.length ? r.roles : [r.role].filter(Boolean);
  if (lista.length > 2) notas.push(`A wiki mandou ${lista.length} Roles: ficaram as duas primeiras.`);
  return lista.slice(0, 2).map(role => ({
    nome: nomeDaRole(role.nome || role.id), rank: Number(role.rank) || 4,
    habilidades: Object.fromEntries((role.habilidades || []).map(h => (Array.isArray(h) ? [h[0], Number(h[1]) || 0] : [h.nome, Number(h.rank) || 0])))
  }));
}

// As Roles da ficha da mesa: a lista "roles" do Foundry 12 (a principal primeiro) ou, na de antes, a "role".
function rolesDaMesa(m, r, notas) {
  const lista = Array.isArray(m.roles) && m.roles.length ? m.roles : [m.role ?? r.role].filter(Boolean);
  const [principal, segunda] = rolesDoResultado({ roles: lista }, notas);
  return { role: principal ?? { nome: '', rank: 4, habilidades: {} }, roleSecundaria: segunda ?? { nome: '', rank: 0, habilidades: {} } };
}

// Munição e inventário entram em pilha (um item com a quantidade); o resto, em cópias separadas.
const EM_PILHA = ['municao', 'equipamento', 'roupa', 'droga'];

// Os dados de cada item da wiki prontos para entrar no ator, com o uid da wiki na flag (para a munição achar a arma).
// instalarCyberware: na importação, sim (o criador já descontou a Humanidade); num pedido da loja, não (a instalação na
// ficha rola a Humanidade).
function itensDaWiki(catalogo, entradas, notas, { instalarCyberware = true } = {}) {
  const itens = [];
  for (const entrada of entradas) {
    const base = catalogo[entrada.id];
    if (!base) { notas.push(`${entrada.nome || entrada.id}: ainda não existe neste sistema.`); continue; }
    const copias = EM_PILHA.includes(base.type) ? 1 : Math.max(1, Number(entrada.qtd) || 1);
    for (let i = 0; i < copias; i++) {
      const data = foundry.utils.deepClone(base);
      if (entrada.renomear) data.name = entrada.renomear;
      foundry.utils.setProperty(data, `flags.${SISTEMA}.wikiUid`, entrada.uid);
      if (data.type === 'municao') data.system.quantidade = Number(entrada.qtd) || 0;
      else if (EM_PILHA.includes(data.type)) data.system.quantidade = Math.max(1, Number(entrada.qtd) || 1);
      // Uso escolhido na montagem da wiki; sem ele (personagem antigo), armas e armaduras equipadas.
      if (data.type === 'arma' || data.type === 'armadura') data.system.equipada = entrada.uso ? entrada.uso === 'equipado' : true;
      // No inventário, o uso vem igual (equipado, carregando, guardado); sem ele, fica o padrão do item.
      else if ('uso' in data.system && Object.hasOwn(USOS, entrada.uso ?? '')) data.system.uso = entrada.uso;
      // O criador da wiki já descontou a Humanidade do cyberware: entra instalado, sem rolar de novo.
      if (data.type === 'cyberware') data.system.instalado = instalarCyberware;
      // O lado do cyberbraço, da cyberperna e do cyberolho (o C30): o da montagem da wiki, se vale para o tipo.
      if (data.type === 'cyberware') data.system.lado = ladoValido(entrada.local, data.system.tipo);
      if (entrada.semHumanidade) data.system.perdaHumanidade = { formula: '0', media: 0, sofrida: 0 };
      itens.push(data);
    }
  }
  return itens;
}

// Carrega cada arma com a munição escolhida na wiki: o pente enche e sai da munição.
// Os veículos da família do Nomad, com os upgrades de cada um: os itens e onde cada upgrade fica ({ uid, em }, como as
// entradas da montagem, para o instalarNoLugar).
function veiculosDaWiki(catalogo, veiculos, notas) {
  const itens = [];
  const lugares = [];
  const doCatalogo = (prefixo, entrada) => catalogo[`${prefixo}:${slug(entrada.foundry?.nome || entrada.nome)}`];
  const comUid = (base, uid) => { const data = foundry.utils.deepClone(base); foundry.utils.setProperty(data, `flags.${SISTEMA}.wikiUid`, uid); return data; };
  for (const veiculo of veiculos) {
    const base = doCatalogo('core_vehicles', veiculo);
    if (!base) { notas.push(`${veiculo.nome}: veículo que ainda não existe neste sistema.`); continue; }
    const data = comUid(base, veiculo.uid);
    data.system.familia = Boolean(veiculo.familia);
    itens.push(data);
    for (const upgrade of veiculo.upgrades || []) {
      const baseDoUpgrade = doCatalogo('core_upgrades', upgrade);
      if (!baseDoUpgrade) { notas.push(`${upgrade.nome} (${veiculo.nome}): upgrade que ainda não existe neste sistema.`); continue; }
      itens.push(comUid(baseDoUpgrade, upgrade.uid));
      lugares.push({ uid: upgrade.uid, em: veiculo.uid });
    }
  }
  return { itens, lugares };
}

// Os itens do ator que vieram de uma entrada da wiki (pelo uid gravado na importação).
const porUid = (ator, uid) => ator.items.filter(item => item.getFlag(SISTEMA, 'wikiUid') === uid);

async function carregarArmas(ator, entradas) {
  for (const entrada of entradas.filter(e => e.municao)) {
    const [municao] = porUid(ator, entrada.municao);
    if (!municao) continue;
    for (const arma of porUid(ator, entrada.uid).filter(item => item.type === 'arma' && item.system.pente.max)) {
      await arma.update({ 'system.carregada': municao.id });
      await arma.recarregar();
    }
  }
}

// Cada programa, hardware e acessório no lugar em que a montagem da wiki o pôs ("em": o uid do pai): o cyberdeck ou a
// arma, ou o upgrade no veículo; e a opção de cyberware na fundação dela (ciclo 83), como a wiki montou.
const recebe = item => ['cyberdeck', 'arma', 'veiculo'].includes(item.type) || (item.type === 'cyberware' && item.system.fundacional);
// O que entra no pai: no cyberware, só a opção de cyberware; nos outros, o que não é cyberware.
const entraEm = (pai, item) => 'instaladoEm' in item.system && item.id !== pai.id && (pai.type === 'cyberware') === (item.type === 'cyberware') && !item.system.fundacional
  && (item.type !== 'arma' || pai.type === 'veiculo');
async function instalarNoLugar(ator, entradas) {
  const mudancas = [];
  for (const entrada of entradas.filter(e => e.em)) {
    const [pai] = porUid(ator, entrada.em).filter(recebe);
    if (!pai) continue;
    for (const item of porUid(ator, entrada.uid).filter(item => entraEm(pai, item))) mudancas.push({ _id: item.id, 'system.instaladoEm': pai.id });
  }
  // A montagem da wiki entra como veio (o C11, parte 4: sem a conferência dos slots do acessório).
  if (mudancas.length) await ator.updateEmbeddedDocuments('Item', mudancas, { montagemDaWiki: true });
}

export async function importarPersonagem(id, donoId = '') {
  if (!game.user.isGM) throw new Error('Só o mestre importa personagens da wiki.');
  const { personagem: doc } = await wikiFetch(`/api/personagens/${id}`);
  const campanha = await campanhaDoMundo();
  conferirCampanha(doc, campanha);
  const crossover = mudouDeCampanha(doc) || (!vinculoDaGeracao14(doc) && doc.estadoFoundry === 'outra-mesa');
  if (crossover) {
    const transferencia = await wikiFetch(`/api/personagens/${id}/ator`).catch(erro => { if (erro.status === 404) return null; throw erro; });
    if (transferencia) return importarTransferido(doc, transferencia, donoId, campanha);
  }
  const catalogo = await carregarCatalogo();
  const r = doc.resultado;
  if (!r) throw new Error('Este personagem ainda não tem ficha pronta: abra no criador da wiki e deixe salvar.');
  const notas = [];
  if (crossover) notas.push('Veio de outra campanha, mas a ficha da mesa antiga ainda não chegou: o ator foi criado pela ficha da criação da wiki.');

  const stat = chave => Number(r.stats?.[chave.toUpperCase()]) || 1;
  const pericias = {};
  for (const p of r.pericias || []) {
    const par = periciaDaWiki(p);
    if (par) pericias[par[0]] = par[1]; else notas.push(`Perícia ${p.nome} não existe neste sistema.`);
  }
  // As Roles do resultado: a principal e, se tiver, a segunda (a regra da mesa).
  const [principal, segunda] = rolesDoResultado(r, notas);
  const ownership = { default: 0, ...(donoId ? { [donoId]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER } : {}) };
  const notasHtml = [doc.aparencia && `<p>${foundry.utils.escapeHTML(doc.aparencia)}</p>`, doc.notas && `<p>${foundry.utils.escapeHTML(doc.notas)}</p>`,
    `<p><i>Criado na wiki${doc.apelido ? ` (${foundry.utils.escapeHTML(doc.apelido)})` : ''}. Importado em ${new Date().toLocaleDateString('pt-BR')}.</i></p>`].filter(Boolean).join('');

  const veiculos = veiculosDaWiki(catalogo, r.veiculos || [], notas);
  const ator = await Actor.implementation.create({
    name: doc.nome || 'Sem nome', type: 'personagem', ownership,
    system: {
      atributos: Object.fromEntries(ATRIBUTOS.map(chave => [chave, { valor: stat(chave) }])),
      hp: { value: Number(r.derivados?.hp) || 0 },
      humanidade: { value: Number(r.humanidade?.atual ?? r.humanidade?.max) || 0 },
      sorte: { value: stat('luck') },
      pericias,
      role: principal ?? { nome: '', rank: 4, habilidades: {} },
      roleSecundaria: segunda ?? { nome: '', rank: 0, habilidades: {} },
      dinheiro: Number(r.dinheiro?.saldo) || 0,
      extratos: extratosIniciais({ dinheiro: Number(r.dinheiro?.saldo) || 0 }, 'Dinheiro inicial (criador da wiki)'),
      apelido: doc.apelido || '',
      lifepath: lifepathDaWiki(r.lifepath),
      ...moradiaDaWiki(r.moradia),
      notas: notasHtml
    },
    items: [...itensDaWiki(catalogo, r.itens || [], notas), ...veiculos.itens],
    flags: { [SISTEMA]: { wiki: { id: doc.id, versao: doc.versao, importado: new Date().toISOString(), roles: [principal, segunda].filter(Boolean).map(role => role.nome) } } }
  });
  // Primeiro os acessórios (um carregador muda o tamanho do pente), depois a munição.
  await instalarNoLugar(ator, [...(r.itens || []), ...veiculos.lugares]);
  await carregarArmas(ator, r.itens || []);
  // O veículo entra inteiro: o SDP de agora é o máximo, já com os upgrades.
  const deVeiculo = ator.items.filter(item => item.type === 'veiculo');
  if (deVeiculo.length) await ator.updateEmbeddedDocuments('Item', deVeiculo.map(item => ({ _id: item.id, 'system.sdp.value': item.system.sdp.max })));

  // A wiki passa a mostrar o personagem como "no Foundry".
  // Entregues: o histórico e o que entrou na ficha. O que virou aviso fica de fora, para uma atualização futura trazê-lo.
  const retrato = await aplicarRetrato(ator, doc, wikiUrl());
  notas.push(...retrato.notas);
  const anteriores = doc.foundry14?.entregues ?? doc.foundry12?.entregues ?? doc.foundry?.entregues ?? [];
  const entregues = [...new Set([...anteriores, ...ator.items.map(item => item.getFlag(SISTEMA, 'wikiUid')).filter(Boolean)])];
  await ator.setFlag(SISTEMA, 'wiki', { ...ator.getFlag(SISTEMA, 'wiki'), entregues, ...(retrato.aplicado ? { retrato: retrato.aplicado } : {}) });
  await wikiFetch(`/api/personagens/${doc.id}/foundry`, { method: 'PUT', body: { ator: ator.id, nomeAtor: ator.name, versao: doc.versao, entregues, geracao: GERACAO, ...(campanha?.id ? { campanha: campanha.id } : {}) } })
    .catch(error => notas.push(`A wiki não marcou a importação (${error.message}).`));
  return { ator, notas };
}

// ---------------- Atualizar da wiki ----------------
// foundry-2077/scripts/wiki.mjs, atualizarDaWiki e pendingAssembly: revisão por grupo, sem repor itens gastos,
// dinheiro ou recursos de jogo. A montagem só encaixa o que está solto e carrega uma arma ainda sem munição escolhida.
const atualizando = new Set();
const uidsDoAtor = ator => ator.items.map(item => item.getFlag(SISTEMA, 'wikiUid')).filter(Boolean);

function planoDaWiki(ator, doc) {
  const notas = [];
  const pericias = Object.fromEntries((doc.resultado.pericias || []).flatMap(p => {
    const par = periciaDaWiki(p);
    if (!par) notas.push(`Perícia ${p.nome} não existe neste sistema.`);
    return par ? [par] : [];
  }));
  const plano = planejarAtualizacao({ sistema: ator.toObject().system, atributosBase: ator._source.system.atributos, vinculo: ator.getFlag(SISTEMA, 'wiki'), itens: ator.items.map(item => ({ uid: item.getFlag(SISTEMA, 'wikiUid') })) }, doc, {
    pericias, roles: rolesDoResultado(doc.resultado, notas), lifepath: lifepathDaWiki(doc.resultado.lifepath), moradia: moradiaDaWiki(doc.resultado.moradia)
  });
  plano.notas.push(...notas);
  if (retratoMudou(doc, ator.getFlag(SISTEMA, 'wiki')?.retrato)) plano.grupos.push({ chave: 'retrato', titulo: 'Retrato', linhas: ['Imagem da ficha e do token'] });
  const montagem = montagemDaAtualizacao(ator, doc.resultado.itens || []);
  if (montagem.linhas.length) plano.grupos.push({ chave: 'montagem', titulo: 'Montagem (encaixar e carregar)', linhas: montagem.linhas });
  return plano;
}

function montagemDaAtualizacao(ator, entradas) {
  const mudancas = [], carregar = [], linhas = [];
  for (const entrada of entradas) {
    const pais = entrada.em ? porUid(ator, entrada.em).filter(recebe) : [];
    for (const item of porUid(ator, entrada.uid)) {
      if (pais.length === 1 && entraEm(pais[0], item) && !item.system.instaladoEm) {
        mudancas.push({ _id: item.id, 'system.instaladoEm': pais[0].id });
        linhas.push(`${item.name} → ${pais[0].name}`);
      }
      const balas = entrada.municao ? porUid(ator, entrada.municao).filter(i => i.type === 'municao' && i.system.quantidade > 0) : [];
      if (item.type === 'arma' && item.system.pente.max && !item.system.carregada && balas.length === 1) {
        carregar.push({ item, municao: balas[0] });
        linhas.push(`${item.name}: carregar com ${balas[0].name}`);
      }
    }
  }
  return { mudancas, carregar, linhas };
}

export async function atualizarDaWiki(ator) {
  if (!game.user.isGM) throw new Error('Só o mestre atualiza personagens da wiki.');
  const vinculo = ator?.getFlag(SISTEMA, 'wiki');
  if (!vinculo?.id || ator.isToken || ator.type !== 'personagem' || game.actors.get(ator.id) !== ator) throw new Error('Este ator não veio da wiki neste mundo.');
  // O ator que foi para outra campanha (o C27, parte 2) fica parado: a ficha agora é do mundo da campanha nova.
  if (ator.getFlag(SISTEMA, 'saiu')) throw new Error('Este ator foi para outra campanha da wiki: atualize no mundo dela.');
  if (atualizando.has(ator.id)) throw new Error('Já há uma atualização da wiki em andamento neste personagem.');
  atualizando.add(ator.id);
  try {
    const { personagem: doc } = await wikiFetch(`/api/personagens/${vinculo.id}`);
    if (!doc.resultado) throw new Error('Este personagem ainda não tem ficha pronta na wiki.');
    const campanha = await campanhaDoMundo();
    conferirCampanha(doc, campanha);
    if (doc.foundry14?.ator && doc.foundry14.ator !== ator.id) throw new Error('Este é um ator antigo: atualize o ator ligado à wiki.');
    // O histórico da wiki cobre também atores importados antes da marca local de entregues.
    const entregues = [...new Set([...(vinculo.entregues || []), ...(doc.foundry14?.entregues || []), ...uidsDoAtor(ator)])];
    const recibos = () => [...new Set([...entregues, ...(ator.getFlag(SISTEMA, 'wiki')?.entregues || []), ...uidsDoAtor(ator)])];
    const comHistorico = { ...doc };
    const planejar = () => {
      const plano = planoDaWiki(ator, comHistorico);
      plano.novosItens = plano.novosItens.filter(item => !recibos().includes(item.uid));
      const grupo = plano.grupos.find(g => g.chave === 'itens');
      if (grupo) {
        grupo.linhas = plano.novosItens.map(item => `${item.nome || item.id}${item.qtd > 1 ? ` ×${item.qtd}` : ''}`);
        if (!grupo.linhas.length) plano.grupos = plano.grupos.filter(g => g !== grupo);
      }
      return plano;
    };
    const plano = planejar();
    let escolhidos = [];
    if (plano.grupos.length) {
      const esc = foundry.utils.escapeHTML;
      const conteudo = plano.grupos.map(g => `<fieldset><label><input type="checkbox" name="${g.chave}" ${g.bloqueado ? 'disabled' : 'checked'}> ${esc(g.titulo)}</label><ul>${g.linhas.map(l => `<li>${esc(l)}</li>`).join('')}</ul></fieldset>`).join('');
      escolhidos = await foundry.applications.api.DialogV2.prompt({
        window: { title: `Atualizar ${ator.name} da wiki` }, classes: [SISTEMA, 'atualizar-wiki'], rejectClose: false,
        content: `${conteudo}<p>Itens gastos ou perdidos e os recursos da mesa continuam como estão. Grupos desmarcados continuam pendentes.</p>`,
        ok: { label: 'Aplicar', callback: (evento, botao) => [...botao.form.querySelectorAll('input:checked:not(:disabled)')].map(input => input.name) }
      });
      if (!Array.isArray(escolhidos)) return null;
    }
    const { personagem: agora } = await wikiFetch(`/api/personagens/${vinculo.id}`);
    if (!game.user.isGM || game.actors.get(ator.id) !== ator || ator.getFlag(SISTEMA, 'wiki')?.id !== vinculo.id) throw new Error('O ator ou a permissão mudou: abra a atualização de novo.');
    if (agora.versao !== doc.versao || JSON.stringify(agora.resultado) !== JSON.stringify(doc.resultado) || agora.retrato !== doc.retrato || agora.retratoLink !== doc.retratoLink || agora.foundry14?.ator !== doc.foundry14?.ator) throw new Error('O personagem mudou na wiki: abra a atualização de novo.');
    if (JSON.stringify(planejar()) !== JSON.stringify(plano)) throw new Error('A ficha mudou durante a revisão: abra a atualização de novo.');
    const notas = [...plano.notas];
    for (const grupo of plano.grupos.filter(g => escolhidos.includes(g.chave) && Object.keys(g.atualizacao || {}).length && !g.bloqueado)) {
      const mudancas = { ...grupo.atualizacao };
      // As habilidades da Role são um TypedObjectField: substituir também retira as que saíram na wiki.
      for (const chave of ['system.role', 'system.roleSecundaria']) if (mudancas[chave]) {
        for (const [campo, valor] of Object.entries(mudancas[chave])) mudancas[`${chave}.${campo}`] = valor;
        delete mudancas[chave];
      }
      for (const chave of Object.keys(mudancas).filter(c => c.endsWith('.habilidades'))) mudancas[chave] = foundry.data.operators.ForcedReplacement.create(mudancas[chave]);
      await ator.update(mudancas);
    }
    if (escolhidos.includes('roles') && !planoDaWiki(ator, doc).grupos.some(g => g.chave === 'roles')) {
      await ator.setFlag(SISTEMA, 'wiki', { ...ator.getFlag(SISTEMA, 'wiki'), roles: plano.rolesVinculadas });
    }
    if (escolhidos.includes('itens')) {
      const catalogo = await carregarCatalogo();
      const entradas = plano.novosItens.filter(item => !uidsDoAtor(ator).includes(item.uid));
      const dados = itensDaWiki(catalogo, entradas, notas);
      for (const data of dados) data._id = foundry.utils.randomID();
      if (dados.length) await ator.createEmbeddedDocuments('Item', dados, { keepId: true });
      if (dados.some(data => !ator.items.get(data._id))) notas.push('O Foundry não confirmou todos os itens novos: confira a ficha antes de concluir a atualização.');
      // Grave só os UIDs que realmente ficaram no ator; criação recusada não consome a entrega.
      entregues.push(...uidsDoAtor(ator));
      await ator.setFlag(SISTEMA, 'wiki', { ...ator.getFlag(SISTEMA, 'wiki'), entregues: recibos() });
      await instalarNoLugar(ator, entradas);
      await carregarArmas(ator, entradas);
    }
    if (escolhidos.includes('montagem')) {
      const montagem = montagemDaAtualizacao(ator, doc.resultado.itens || []);
      if (montagem.mudancas.length) await ator.updateEmbeddedDocuments('Item', montagem.mudancas, { montagemDaWiki: true });
      for (const { item, municao } of montagem.carregar) {
        await item.update({ 'system.carregada': municao.id });
        await item.recarregar();
      }
    }
    if (escolhidos.includes('retrato')) {
      const retrato = await aplicarRetrato(ator, doc, wikiUrl());
      notas.push(...retrato.notas);
      if (retrato.aplicado) await ator.setFlag(SISTEMA, 'wiki', { ...ator.getFlag(SISTEMA, 'wiki'), retrato: retrato.aplicado });
    }
    await ator.setFlag(SISTEMA, 'wiki', { ...ator.getFlag(SISTEMA, 'wiki'), entregues: recibos() });
    let pendente = planejar().grupos.length > 0 || notas.length > 0;
    if (!pendente) {
      const { personagem: depois } = await wikiFetch(`/api/personagens/${doc.id}`);
      if (depois.versao !== doc.versao || depois.retrato !== doc.retrato || depois.retratoLink !== doc.retratoLink || depois.foundry14?.ator !== doc.foundry14?.ator) {
        pendente = true;
        notas.push('A wiki mudou durante a aplicação: revise de novo antes de marcar a sincronização.');
      }
    }
    if (!pendente) {
      await wikiFetch(`/api/personagens/${doc.id}/foundry`, { method: 'PUT', body: { ator: ator.id, nomeAtor: ator.name, versao: doc.versao, entregues: recibos(), geracao: GERACAO, ...(campanha?.id ? { campanha: campanha.id } : {}) } });
      await ator.setFlag(SISTEMA, 'wiki', { ...ator.getFlag(SISTEMA, 'wiki'), versao: doc.versao });
    }
    if (pendente) notas.push('Há grupos ou avisos pendentes: a wiki continua esperando a atualização.');
    ui.notifications.info(`${ator.name}: ${pendente ? 'atualização parcial da wiki' : 'atualizado da wiki'}.`);
    return { ator, notas, pendente };
  } finally {
    atualizando.delete(ator.id);
  }
}


// ---------------- Na mesa: a ficha volta para a wiki ----------------
// O formato é o do módulo cpr-2077 no Foundry 12 (os tipos e os usos do CORE, as perícias pelo nome em inglês), para a
// wiki mostrar a ficha da mesa sem mudar nada. Os STATs vão como estão agora na mesa (com a armadura pesada e o
// ferimento descontados, a EMP de agora): a wiki soma STAT + nível direto.
const TIPO_NA_WIKI = {
  arma: 'weapon', armadura: 'armor', municao: 'ammo', cyberware: 'cyberware', equipamento: 'gear', roupa: 'clothing', droga: 'drug', cyberdeck: 'cyberdeck',
  programa: 'program', upgrade: 'itemUpgrade', veiculo: 'vehicle'
};
const USO_NA_WIKI = { equipado: 'equipped', carregando: 'carried', guardado: 'owned' };
const nomeDaPericia = (id, propria) => PERICIAS.find(p => p.id === id)?.en ?? (FAMILIAS[propria.familia] ? `${FAMILIAS[propria.familia].en} (${propria.nome})` : propria.atributo ? propria.nome : id);

export function fichaParaAWiki(ator) {
  const s = ator.system;
  const usoDe = item => (['arma', 'armadura'].includes(item.type) ? (item.system.equipada ? 'equipped' : 'carried') : USO_NA_WIKI[item.system.uso] || '');
  // A arma do cyberware e a do acessório (o C11) não vão: a wiki conhece o item, e a arma volta dele quando ele está
  // instalado.
  const itens = ator.items.filter(item => TIPO_NA_WIKI[item.type] && !ehArmaMontadaEmItem(item)).map(item => {
    const x = item.system;
    // O id do Foundry distingue as cópias de mesmo nome e uid. A montagem volta por ele, não pela ordem da lista.
    const linha = { id: item.id, nome: item.name, tipo: TIPO_NA_WIKI[item.type], qtd: 'quantidade' in x ? x.quantidade : 1, uso: usoDe(item), uid: item.getFlag(SISTEMA, 'wikiUid') || '' };
    const catalogo = item.getFlag(SISTEMA, 'catalogo');
    if (catalogo) linha.catalogo = catalogo;
    // Vazio também é informação: uma cópia solta não deve ser instalada pelo fallback de nomes do Foundry 12.
    if ('instaladoEm' in x) linha.instaladoEm = x.instaladoEm || '';
    if (item.type === 'arma') {
      Object.assign(linha, {
        dano: item.danoDaArma, cdt: x.cdt, pericia: PERICIAS.find(p => p.id === x.pericia)?.en ?? x.pericia, distancia: x.aDistancia, maos: x.maos,
        pente: x.aDistancia ? { atual: x.pente.value, max: x.pente.max } : null, municao: item.municaoCarregada?.name ?? '', carregada: x.carregada || ''
      });
      const veicular = item.getFlag(SISTEMA, 'armaVeicular');
      if (veicular) linha.armaVeicular = foundry.utils.deepClone(veicular);
    }
    if (item.type === 'armadura') Object.assign(linha, { cabeca: x.sp.cabeca.max ? x.sp.cabeca.value : 0, corpo: x.sp.corpo.max ? x.sp.corpo.value : 0 });
    // O lado (o C30): "local" no instalado, "localPlanejado" no que espera instalar, como o cpr-2077; e o tipo, o tamanho e
    // os slots, que a aba Cyberware da wiki desenha.
    if (item.type === 'cyberware') {
      Object.assign(linha, { instalado: x.instalado, base: x.fundacional, cyber: { tipo: x.tipo, tamanho: x.tamanho, slots: x.fundacional ? x.slots : 0 } });
      if (item.ladoDoCyberware) linha[x.instalado ? 'local' : 'localPlanejado'] = item.ladoDoCyberware;
      // A peça única no membro natural (o C30, parte 2), como a wiki marca na montagem.
      if (item.noMembroNatural) linha.natural = true;
    }
    if (item.type === 'veiculo') {
      const base = item._source.system;
      linha.veiculo = {
        sdp: { value: x.sdp.value, max: base.sdp.max }, familia: x.familia, sp: base.sp ?? 0, ablacao: x.ablacao ?? 0,
        janelas: foundry.utils.deepClone(base.janelas ?? {}), ativo: s.veiculo === item.id, dirigindo: s.veiculo === item.id && Boolean(s.dirigindo)
      };
    }
    // Os ids distinguem as cópias de mesmo nome (duas Mãos de ferramentas, uma em cada cyberbraço).
    if (item.instalados.length) Object.assign(linha, { dentro: item.instalados.map(dentro => dentro.name), dentroIds: item.instalados.map(dentro => dentro.id) });
    return linha;
  });
  return {
    ator: ator.id, nomeAtor: ator.name, quando: new Date().toISOString(), geracao: GERACAO,
    stats: Object.fromEntries(Object.entries(s.atributos).map(([chave, atributo]) => [chave.toUpperCase(), chave === 'emp' ? s.empAtual : atributo.valor])),
    hp: { atual: s.hp.value, max: s.hp.max }, humanidade: { atual: s.humanidade.value, max: s.humanidade.max }, sorte: { atual: s.sorte.value, max: s.sorte.max },
    sp: { cabeca: s.armadura.cabeca.sp, corpo: s.armadura.corpo.sp }, dinheiro: s.dinheiro, ip: s.pontosDeMelhoria, reputacao: s.reputacao,
    role: s.role.nome ? { nome: s.role.nome, rank: s.role.rank, habilidades: Object.entries(s.role.habilidades) } : null,
    roles: s.roles.map(role => ({ ...(role.id ? { id: role.id } : {}), nome: role.nome, rank: role.rank, habilidades: Object.entries(role.habilidades) })),
    pericias: Object.entries(s.pericias).filter(([, propria]) => propria.nivel > 0)
      .map(([id, propria]) => ({ nome: nomeDaPericia(id, propria), nivel: propria.nivel, stat: s.pericia(id).atributo.toUpperCase() })),
    lesoes: ator.items.filter(item => item.type === 'lesao').map(item => item.name),
    moradia: moradiaParaAWiki(s),
    itens
  };
}

// Manda a ficha de um ator importado da wiki (o "wiki" na flag do sistema).
export async function mandarFicha(ator) {
  const vinculo = ator?.getFlag(SISTEMA, 'wiki');
  if (!vinculo?.id || ator.getFlag(SISTEMA, 'saiu')) return null;
  const campanha = await campanhaDoMundo();
  if (campanha?.erro) return null;
  return wikiFetch(`/api/personagens/${vinculo.id}/mesa`, { method: 'PUT', body: { ...fichaParaAWiki(ator), ...(campanha?.id ? { campanha: campanha.id } : {}) } });
}

// Quem manda: o mestre ativo, com a configuração ligada. Espera 4 s depois da última mudança (um ataque muda HP, SP e
// munição de uma vez). Um erro avisa no console uma vez, até a próxima volta dar certo.
const ESPERA_DA_VOLTA = 4000;
const esperando = new Map();
let avisouFalha = false;
// Atores que a wiki recusou por não serem mais os ligados ao personagem (ele foi importado de novo noutro ator, como no
// "Importar da mesa"): param de mandar, sem aviso. Só o ator ligado grava a ficha da mesa.
const atoresAntigos = new Set();
const souQuemManda = () => game.user.isGM && (!game.users.activeGM || game.users.activeGM.id === game.user.id) && game.settings.get(SISTEMA, 'wikiMesa');
async function mandarAgora(id) {
  const ator = game.actors.get(id);
  if (!ator || atoresAntigos.has(id)) return;
  await mandarFicha(ator).then(() => { avisouFalha = false; }).catch(erro => {
    if (/ator antigo|outra campanha/.test(erro.message)) { atoresAntigos.add(id); return; }
    if (!avisouFalha) { avisouFalha = true; console.warn(`${SISTEMA} | Na mesa (wiki):`, erro.message); }
  });
}
function agendarVolta(ator) {
  if (!ator || ator.documentName !== 'Actor' || ator.isToken || !ator.getFlag(SISTEMA, 'wiki') || !souQuemManda()) return;
  clearTimeout(esperando.get(ator.id));
  esperando.set(ator.id, setTimeout(() => { esperando.delete(ator.id); mandarAgora(ator.id); }, ESPERA_DA_VOLTA));
}

// Manda já o que está esperando (macros e testes).
export async function mandarPendentes() {
  const ids = [...esperando.keys()];
  for (const id of ids) clearTimeout(esperando.get(id));
  esperando.clear();
  await Promise.all(ids.map(mandarAgora));
}

function registrarVoltaParaWiki() {
  Hooks.on('updateActor', ator => agendarVolta(ator));
  for (const gancho of ['createItem', 'updateItem', 'deleteItem']) Hooks.on(gancho, item => agendarVolta(item.parent));
  // A cada minuto (e logo depois de entrar), o mestre ativo entrega os pedidos aprovados na wiki. Sem falar com a wiki
  // (fora do ar, endereço errado), não avisa nada: o mestre vê o erro quando entregar pela macro.
  Hooks.once('ready', () => {
    const tentar = () => { if (souOMestreAtivo()) entregarPedidos().catch(erro => console.debug(`${SISTEMA} | pedidos da wiki:`, erro.message)); };
    setTimeout(tentar, 5000);
    setInterval(tentar, 60000);
  });
  // Ao entrar: manda todos os atores da wiki uma vez.
  Hooks.once('ready', () => { for (const ator of game.actors) agendarVolta(ator); });
  // O ator ligado apagado: a wiki fica sabendo (no vínculo deste Foundry), e o personagem pode ser importado de novo.
  Hooks.on('deleteActor', ator => {
    const vinculo = ator.getFlag(SISTEMA, 'wiki');
    if (!vinculo?.id || ator.isToken || !souOMestreAtivo()) return;
    wikiFetch(`/api/personagens/${vinculo.id}/foundry`, { method: 'PUT', body: { geracao: GERACAO, ator: ator.id, removido: true } })
      .catch(erro => console.debug(`${SISTEMA} | wiki: ator apagado`, erro.message));
  });
}

// ---------------- Pedidos da loja ----------------
// O jogador pede na loja da wiki, o mestre aprova na página do personagem na wiki, e o mestre ativo entrega aqui: cria os
// itens (no lugar e com a munição que o jogador pediu), desconta o dinheiro e marca o pedido como entregue. Cada item leva
// o uid "pedido:<id>:<n>" que a wiki deu: se a entrega cair no meio, a próxima não cria em dobro. O cyberware chega sem
// instalar. Sem dinheiro na mesa, o pedido fica aprovado, com o erro, e a wiki mostra "Tentar de novo".
const souOMestreAtivo = () => game.user.isGM && (!game.users.activeGM || game.users.activeGM.id === game.user.id);

export async function entregarPedido(ator, wikiId, pedido) {
  if (!game.user.isGM) throw new Error('Só o mestre entrega os pedidos da wiki.');
  const campanha = await campanhaDoMundo();
  const { personagem } = await wikiFetch(`/api/personagens/${wikiId}`);
  conferirCampanha(personagem, campanha, true);
  if (ator.getFlag(SISTEMA, 'saiu') || atorLigado(personagem, wikiId)?.id !== ator.id) throw new Error('O pedido precisa do ator ligado à campanha deste mundo.');
  const prefixo = `pedido:${pedido.id}:`;
  const notas = [];
  const jaEntregue = ator.items.some(item => String(item.getFlag(SISTEMA, 'wikiUid') || '').startsWith(prefixo));
  if (!jaEntregue) {
    if (ator.system.dinheiro < pedido.total) {
      const erro = `Dinheiro insuficiente na mesa: ${ator.system.dinheiro}eb de ${pedido.total}eb.`;
      await wikiFetch(`/api/personagens/${wikiId}/pedidos/${pedido.id}/erro`, { method: 'POST', body: { erro, ator: ator.id } }).catch(() => null);
      return { ok: false, notas: [erro] };
    }
    const linhas = (pedido.itens || []).map(linha => ({ ...linha, uso: 'carregando' }));
    const dados = itensDaWiki(await carregarCatalogo(), linhas, notas, { instalarCyberware: false });
    if (dados.length) await ator.createEmbeddedDocuments('Item', dados);
    await instalarNoLugar(ator, linhas);
    await carregarArmas(ator, linhas);
    await ator.mudarComExtrato('dinheiro', { acao: 'subtrair', valor: pedido.total, motivo: `Compra na wiki: ${(pedido.itens || []).map(linha => linha.nome).join(', ')}` });
    if (linhas.some(linha => linha.cyber)) notas.push('Cyberware: instale pela ficha (a instalação rola a Humanidade).');
  }
  await wikiFetch(`/api/personagens/${wikiId}/pedidos/${pedido.id}/entregue`, { method: 'POST', body: { avisos: notas, ator: ator.id } });
  return { ok: true, notas };
}

// O ator ligado ao personagem na wiki (o da última importação), mesmo com uma cópia antiga neste mundo. A wiki guarda o
// vínculo de cada Foundry à parte (o foundry14 e o foundry12), e o "foundry" que ela mostra é o do 12 quando o personagem
// está nos dois, como os que vieram da mesa pelo "Importar da mesa". Como a wiki na entrega, vale o ator deste mundo que é
// um dos ligados; com vínculo e sem nenhum deles aqui, é uma cópia, e não entrega (a wiki a recusaria como "ator antigo",
// 409). Sem vínculo nenhum, o que tiver a flag do personagem.
function atorLigado(personagem, wikiId) {
  const vinculos = [personagem?.foundry14, personagem?.foundry12, personagem?.foundry].filter(vinculo => vinculo?.ator && !vinculo.removido);
  const ligado = vinculos.map(vinculo => game.actors.get(vinculo.ator)).find(ator => ator?.getFlag(SISTEMA, 'wiki')?.id === wikiId && !ator.getFlag(SISTEMA, 'saiu'));
  if (ligado || vinculos.length) return ligado ?? null;
  return game.actors.find(ator => ator.getFlag(SISTEMA, 'wiki')?.id === wikiId && !ator.getFlag(SISTEMA, 'saiu')) ?? null;
}

// Os pedidos aprovados dos personagens que estão neste mundo (pelo id da wiki na flag do ator).
export async function entregarPedidos() {
  if (!souOMestreAtivo()) return [];
  const { personagens = [] } = await wikiFetch('/api/personagens');
  const campanha = await campanhaDoMundo();
  const avisos = await mandarTransferidos(personagens, campanha);
  for (const aviso of avisos) console.debug(`${SISTEMA} | ${aviso}`);
  if (campanha?.erro) return [];
  const resultados = [];
  for (const resumo of personagens.filter(p => !p.publico && pertenceACampanha(p, campanha) && p.pedidos?.aprovados)) {
    // Só o ator ligado ao personagem na wiki (o da última importação) entrega, mesmo que haja uma cópia antiga neste mundo.
    const ator = atorLigado(resumo, resumo.id);
    if (!ator) continue;
    const { personagem } = await wikiFetch(`/api/personagens/${resumo.id}`);
    for (const pedido of (personagem?.pedidos || []).filter(p => p.status === 'aprovado' && !p.erro)) {
      const resultado = await entregarPedido(ator, resumo.id, pedido).catch(erro => ({ ok: false, notas: [erro.message] }));
      if (resultado.ok) ui.notifications.info(`Wiki: pedido de ${ator.name} entregue na ficha.${resultado.notas.length ? ` ${resultado.notas.join(' ')}` : ''}`);
      else ui.notifications.warn(`Wiki: o pedido de ${ator.name} não foi entregue. ${resultado.notas.join(' ')}`);
      resultados.push({ ator: ator.name, pedido: pedido.id, ...resultado });
    }
  }
  return resultados;
}

// ---------------- Importar da mesa (a migração do Foundry 12) ----------------
// A campanha migra pela ficha "Na mesa" que o Foundry 12 (o módulo cpr-2077) manda para a wiki: o ator sai com o estado
// de jogo (HP, Humanidade, Sorte, dinheiro, IP, reputação, Role, perícias, lesões e os itens como estão: equipados,
// guardados, com o pente carregado, com o SP que sobrou, com o que está dentro de cada um). Os STATs base vêm da criação:
// a mesa manda os de agora, já com a armadura e as lesões, que aqui voltam a valer pelos itens.
// Cada item acha o catálogo pelo uid da wiki (da criação, de um pedido ou da família do Nomad) ou, sem uid (o que o
// mestre deu no Foundry 12), pelo nome do CORE, do mesmo tipo.
const TIPO_DA_WIKI = Object.fromEntries(Object.entries(TIPO_NA_WIKI).map(([nosso, doCore]) => [doCore, nosso]));
const USO_DA_WIKI = Object.fromEntries(Object.entries(USO_NA_WIKI).map(([nosso, doCore]) => [doCore, nosso]));

function idNoCatalogo(catalogo, doc, item) {
  const tipo = TIPO_DA_WIKI[item.tipo];
  if (catalogo[item.catalogo] && (!tipo || catalogo[item.catalogo].type === tipo)) return item.catalogo;
  const r = doc.resultado || {};
  if (item.uid) {
    const comuns = [...(r.itens || []), ...(doc.pedidos || []).flatMap(pedido => pedido.itens || [])]
      .filter(entrada => entrada.uid === item.uid).map(entrada => entrada.id);
    const familia = (r.veiculos || []).flatMap(v => [['core_vehicles', v], ...(v.upgrades || []).map(u => ['core_upgrades', u])])
      .filter(([, entrada]) => entrada.uid === item.uid).map(([prefixo, entrada]) => `${prefixo}:${slug(entrada.foundry?.nome || entrada.nome)}`);
    const encontrados = [...new Set([...comuns, ...familia].filter(id => catalogo[id] && (!tipo || catalogo[id].type === tipo)))];
    // Um uid repetido com modelos diferentes não pode escolher o primeiro por acaso.
    if (encontrados.length) return encontrados.length === 1 ? encontrados[0] : null;
  }
  return Object.entries(catalogo).find(([, base]) => base.name === item.nome && (!tipo || base.type === tipo))?.[0] ?? null;
}

export async function importarDaMesa(id, donoId = '') {
  if (!game.user.isGM) throw new Error('Só o mestre importa personagens da wiki.');
  const catalogo = await carregarCatalogo();
  const { personagem: doc } = await wikiFetch(`/api/personagens/${id}`);
  const campanha = await campanhaDoMundo();
  conferirCampanha(doc, campanha);
  const m = doc.mesa;
  if (!Array.isArray(m?.itens)) throw new Error('Este personagem ainda não tem a ficha da mesa na wiki: o Foundry 12 manda quando o ator muda.');
  const r = doc.resultado || {};
  const notas = [];

  const statBase = chave => Number(r.stats?.[chave.toUpperCase()]) || Number(m.stats?.[chave.toUpperCase()]) || 1;
  const pericias = {};
  for (const p of m.pericias || []) {
    // A que não é do livro nem de família (a do item de perícia do CORE, com o STAT dela) entra como perícia própria.
    const par = periciaDaWiki({ nome: p.nome, nivel: Number(p.nivel) || 0 }) ?? periciaPropria({ nome: p.nome, atributo: p.stat, nivel: p.nivel }, ATRIBUTOS);
    if (par) pericias[par[0]] = par[1]; else notas.push(`Perícia ${p.nome} não existe neste sistema.`);
  }

  // Os itens, com o estado da mesa. As linhas que acharam o catálogo ficam na mesma ordem dos dados criados.
  const linhas = [];
  const dados = [];
  for (const item of m.itens) {
    // A base do membro natural do Foundry 12 (Meat Arm, Meat Leg) não entra: a peça dela fica no membro natural, com o lado.
    if (ehBaseNatural(item)) continue;
    const idDoItem = idNoCatalogo(catalogo, doc, item);
    if (!idDoItem) { notas.push(`${item.nome}: não achei no catálogo deste sistema; crie à mão.`); continue; }
    const data = foundry.utils.deepClone(catalogo[idDoItem]);
    const s = data.system;
    data.name = item.nome || data.name;
    if (item.uid) foundry.utils.setProperty(data, `flags.${SISTEMA}.wikiUid`, item.uid);
    if (data.type === 'municao') s.quantidade = Math.max(0, Number(item.qtd) || 0);
    else if (EM_PILHA.includes(data.type)) s.quantidade = Math.max(1, Number(item.qtd) || 1);
    if (data.type === 'arma' || data.type === 'armadura') s.equipada = item.uso === 'equipped';
    else if ('uso' in s && USO_DA_WIKI[item.uso]) s.uso = USO_DA_WIKI[item.uso];
    if (data.type === 'arma' && item.pente) s.pente.value = Math.max(0, Number(item.pente.atual) || 0);
    if (data.type === 'arma' && item.armaVeicular) {
      foundry.utils.setProperty(data, `flags.${SISTEMA}.armaVeicular`, foundry.utils.deepClone(item.armaVeicular));
      s.equipada = false;
      s.maos = 0;
      s.slots = 0;
      // A metralhadora instalada tem o pente próprio da instalação, não o do rifle que serviu de modelo.
      if (item.armaVeicular.soAutofogo) {
        s.supressivo = false;
        if (Number.isFinite(item.pente?.max)) s.pente.max = Math.max(0, item.pente.max);
      }
    }
    if (data.type === 'armadura') {
      for (const local of ['cabeca', 'corpo']) if (s.sp[local].max) s.sp[local].value = Math.min(s.sp[local].max, Math.max(0, Number(item[local]) || 0));
    }
    // O Foundry 12 já descontou a Humanidade do cyberware: o valor vem da mesa, e o instalado fica como estava.
    if (data.type === 'cyberware') s.instalado = Boolean(item.instalado);
    // O lado (o C30): o instalado na mesa ou, sem ele, o planejado na wiki.
    if (data.type === 'cyberware') s.lado = ladoValido(item.local || item.localPlanejado, s.tipo);
    if (data.type === 'veiculo' && item.veiculo) {
      const v = item.veiculo;
      for (const chave of ['value', 'max']) if (Number.isFinite(v.sdp?.[chave])) s.sdp[chave] = Math.max(0, v.sdp[chave]);
      if (typeof v.familia === 'boolean') s.familia = v.familia;
      for (const chave of ['sp', 'ablacao']) if (Number.isFinite(v[chave])) s[chave] = Math.max(0, v[chave]);
      if (v.janelas && typeof v.janelas === 'object' && !Array.isArray(v.janelas)) s.janelas = foundry.utils.deepClone(v.janelas);
    }
    linhas.push(item);
    dados.push(data);
  }
  // As lesões, pelo nome do CORE (o original das traduzidas) ou pelo nome daqui.
  for (const nome of m.lesoes || []) {
    const lesao = Object.values(catalogo).find(base => base.type === 'lesao' && (base.flags?.[SISTEMA]?.nomeOriginal === nome || base.name === nome));
    if (lesao) dados.push(foundry.utils.deepClone(lesao)); else notas.push(`Lesão ${nome}: não achei na tabela deste sistema.`);
  }

  const ownership = { default: 0, ...(donoId ? { [donoId]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER } : {}) };
  const origem = `ator ${foundry.utils.escapeHTML(String(m.ator || '?'))}, ${m.quando ? new Date(m.quando).toLocaleString('pt-BR') : 'sem data'}`;
  const rolesImportadas = rolesDaMesa(m, r, notas);
  const ator = await Actor.implementation.create({
    name: doc.nome || m.nomeAtor || 'Sem nome', type: 'personagem', ownership,
    system: {
      atributos: Object.fromEntries(ATRIBUTOS.map(chave => [chave, { valor: statBase(chave) }])),
      hp: { value: Number(m.hp?.atual) || 0 }, humanidade: { value: Number(m.humanidade?.atual) || 0 }, sorte: { value: Number(m.sorte?.atual) || 0 },
      pericias,
      ...rolesImportadas,
      dinheiro: Number(m.dinheiro) || 0, pontosDeMelhoria: Number(m.ip) || 0, reputacao: Number(m.reputacao) || 0,
      extratos: extratosIniciais({ dinheiro: Number(m.dinheiro) || 0, pontosDeMelhoria: Number(m.ip) || 0, reputacao: Number(m.reputacao) || 0 }, 'Migrado da ficha da mesa do Foundry 12'),
      apelido: doc.apelido || '', lifepath: lifepathDaWiki(r.lifepath),
      ...moradiaDaMesa(m.moradia, r.moradia),
      notas: `<p><i>Migrado da ficha da mesa do Foundry 12 (${origem}) em ${new Date().toLocaleDateString('pt-BR')}.</i></p>`
    },
    flags: { [SISTEMA]: { wiki: { id: doc.id, versao: doc.versao, importado: new Date().toISOString(), origem: 'mesa', roles: [rolesImportadas.role, rolesImportadas.roleSecundaria].filter(role => rolesDoResultado(r, []).some(recebida => recebida.nome === role.nome)).map(role => role.nome) } } }
  });
  // Cada item com o id escolhido aqui: o Foundry não garante a ordem do que cria, e cada linha da mesa precisa achar o
  // item dela.
  for (const data of dados) data._id = foundry.utils.randomID();
  await ator.createEmbeddedDocuments('Item', dados, { keepId: true });
  const criados = dados.map(data => ator.items.get(data._id));

  // Os ids originais voltam como ids novos; cópias de mesmo nome/uid continuam distintas. Dados do Foundry 12, que
  // só mandavam os nomes de dentro, conservam a montagem antiga. Um id duplicado não resolve para uma cópia arbitrária.
  const mudancas = [];
  const usados = new Set();
  const porOrigem = new Map();
  const linhaPorCriado = new Map();
  linhas.forEach((linha, indice) => {
    const item = criados[indice];
    linhaPorCriado.set(item.id, linha);
    if (linha.id) porOrigem.set(linha.id, porOrigem.has(linha.id) ? null : item);
  });
  const peloId = (id, aceita) => {
    const item = porOrigem.get(id);
    return item && aceita(item) ? item : null;
  };
  linhas.forEach((linha, indice) => {
    const item = criados[indice];
    if (linha.instaladoEm) {
      const pai = peloId(linha.instaladoEm, pai => recebe(pai) && entraEm(pai, item));
      if (pai) {
        usados.add(item.id);
        mudancas.push({ _id: item.id, 'system.instaladoEm': pai.id });
      } else notas.push(`${item.name}: não achei o item de origem onde estava instalado.`);
    }
    if (item.type === 'arma' && Object.hasOwn(linha, 'carregada') && linha.carregada) {
      const municao = peloId(linha.carregada, outro => outro.type === 'municao');
      if (municao) mudancas.push({ _id: item.id, 'system.carregada': municao.id });
      else notas.push(`${item.name}: não achei a munição de origem do pente.`);
    }
    if (item.type === 'arma' && linha.armaVeicular?.upgrade) {
      const upgrade = peloId(linha.armaVeicular.upgrade, outro => outro.type === 'upgrade' && outro.system.alvo === 'veiculo');
      mudancas.push({ _id: item.id, [`flags.${SISTEMA}.armaVeicular.upgrade`]: upgrade?.id ?? '' });
      if (!upgrade) notas.push(`${item.name}: não achei o upgrade de origem da arma instalada.`);
    }
  });
  const livrePorNome = (nome, aceita) => criados.find(item => !usados.has(item.id) && !Object.hasOwn(linhaPorCriado.get(item.id) ?? {}, 'instaladoEm') && item.name === nome && aceita(item));
  linhas.forEach((item, indice) => {
    const pai = criados[indice];
    if (pai.type === 'arma' && !Object.hasOwn(item, 'carregada') && item.municao) {
      const municao = livrePorNome(item.municao, outro => outro.type === 'municao');
      if (municao) mudancas.push({ _id: pai.id, 'system.carregada': municao.id });
    }
    for (const nome of (item.dentro || []).filter(nome => nome !== item.municao)) {
      if (pai.type === 'cyberware' && !pai.system.fundacional) continue;
      const filho = livrePorNome(nome, outro => entraEm(pai, outro));
      if (!filho) continue;
      usados.add(filho.id);
      mudancas.push({ _id: filho.id, 'system.instaladoEm': pai.id });
    }
  });
  if (mudancas.length) {
    const porItem = new Map();
    for (const mudanca of mudancas) porItem.set(mudanca._id, { ...porItem.get(mudanca._id), ...mudanca });
    await ator.updateEmbeddedDocuments('Item', [...porItem.values()], { montagemDaWiki: true });
  }

  const ativos = linhas.flatMap((linha, indice) => linha.veiculo?.ativo && criados[indice].type === 'veiculo' ? [{ item: criados[indice], dirigindo: Boolean(linha.veiculo.dirigindo) }] : []);
  if (ativos.length === 1) await ator.update({ 'system.veiculo': ativos[0].item.id, 'system.dirigindo': ativos[0].dirigindo });
  else if (ativos.length > 1) notas.push('Mais de um veículo veio como ativo: escolha na ficha qual está em uso.');

  const retrato = await aplicarRetrato(ator, doc, wikiUrl());
  notas.push(...retrato.notas);
  const anteriores = doc.foundry14?.entregues ?? doc.foundry12?.entregues ?? doc.foundry?.entregues ?? [];
  const entregues = [...new Set([...anteriores, ...ator.items.map(item => item.getFlag(SISTEMA, 'wikiUid')).filter(Boolean)])];
  await ator.setFlag(SISTEMA, 'wiki', { ...ator.getFlag(SISTEMA, 'wiki'), entregues, ...(retrato.aplicado ? { retrato: retrato.aplicado } : {}) });
  await wikiFetch(`/api/personagens/${doc.id}/foundry`, { method: 'PUT', body: { ator: ator.id, nomeAtor: ator.name, versao: doc.versao, entregues, geracao: GERACAO, ...(campanha?.id ? { campanha: campanha.id } : {}) } })
    .catch(error => notas.push(`A wiki não marcou a importação (${error.message}).`));
  return { ator, notas };
}

// ---------------- Para a janela do mestre ----------------
// Os personagens da wiki (o mestre vê todos) e os pedidos que esperam o mestre: os pendentes e os aprovados que deram
// erro (o "Tentar de novo").
export async function personagensDaWiki() {
  const { personagens = [], papel } = await wikiFetch('/api/personagens');
  const campanha = await campanhaDoMundo();
  const avisos = await mandarTransferidos(personagens, campanha);
  const lista = personagens.filter(p => !p.publico && pertenceACampanha(p, campanha));
  const comPedidos = lista.filter(p => p.pedidos?.pendentes || p.pedidos?.aprovados);
  const docs = await Promise.all(comPedidos.map(p => wikiFetch(`/api/personagens/${p.id}`).then(r => r.personagem).catch(() => null)));
  const pedidos = docs.filter(Boolean).flatMap(doc => (doc.pedidos || [])
    .filter(pedido => pedido.status === 'pendente' || (pedido.status === 'aprovado' && pedido.erro))
    .map(pedido => ({ wikiId: doc.id, nome: doc.nome || 'Sem nome', pedido })));
  return { personagens: lista, pedidos, papel, campanha, avisos, ajuda: campanha?.erro ? ajudaDaCampanha(campanha) : '' };
}

// Aprovar na wiki e entregar já, no ator deste mundo. Um aprovado que deu erro é aprovado de novo (a wiki limpa o erro).
export async function aprovarPedido(wikiId, pedidoId) {
  if (!game.user.isGM) throw new Error('Só o mestre aprova os pedidos da wiki.');
  // Como na entrega de cada minuto: só o ator ligado ao personagem entrega. Confere antes de aprovar.
  const { personagem: antes } = await wikiFetch(`/api/personagens/${wikiId}`);
  conferirCampanha(antes, await campanhaDoMundo(), true);
  const ator = atorLigado(antes, wikiId);
  if (!ator) {
    throw new Error(game.actors.some(a => a.getFlag(SISTEMA, 'wiki')?.id === wikiId)
      ? 'Neste mundo só há uma cópia antiga deste personagem: a wiki entrega ao ator ligado (o da última importação).'
      : 'Este personagem ainda não está neste mundo: importe antes.');
  }
  await wikiFetch(`/api/personagens/${wikiId}/pedidos/${pedidoId}/aprovar`, { method: 'POST', body: {} });
  const { personagem } = await wikiFetch(`/api/personagens/${wikiId}`);
  const pedido = (personagem?.pedidos || []).find(p => p.id === pedidoId);
  if (!pedido) throw new Error('O pedido sumiu da wiki.');
  return { ator: ator.name, ...(await entregarPedido(ator, wikiId, pedido)) };
}

export async function recusarPedido(wikiId, pedidoId, motivo = '') {
  if (!game.user.isGM) throw new Error('Só o mestre recusa os pedidos da wiki.');
  const { personagem } = await wikiFetch(`/api/personagens/${wikiId}`);
  conferirCampanha(personagem, await campanhaDoMundo(), true);
  return wikiFetch(`/api/personagens/${wikiId}/pedidos/${pedidoId}/recusar`, { method: 'POST', body: { motivo } });
}

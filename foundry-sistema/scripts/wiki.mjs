// Importar da wiki: o personagem criado no criador da wiki vira um ator deste sistema, com STATs, perícias, Role,
// Humanidade, dinheiro e o equipamento (armas carregadas, armaduras vestidas, cyberware instalado).
// Os itens vêm de dados/catalogo.json pelo mesmo id da loja da wiki ("core_weapons:assault-rifle"). O que ainda não
// existe neste sistema (equipamento, roupas, programas, veículos) vira um aviso, e o resto entra.
import { carregarCatalogo } from './catalogo.mjs';
import { ATRIBUTOS, SISTEMA } from './config.mjs';
import { FAMILIAS, PERICIAS } from './gerado.mjs';

export { carregarCatalogo };

export function registrarWiki() {
  game.settings.register(SISTEMA, 'wikiUrl', {
    name: 'Endereço da wiki', hint: 'De onde o mestre importa os personagens (o servidor da wiki da mesa).',
    scope: 'world', config: true, type: String, default: 'http://localhost:8000'
  });
}

const wikiUrl = () => String(game.settings.get(SISTEMA, 'wikiUrl') || '').replace(/\/+$/, '');
// Com o cookie da wiki (o mestre entra na wiki neste navegador) e sem cache: a ficha muda o tempo todo.
async function wikiFetch(rota, { method = 'GET', body } = {}) {
  let resposta;
  try {
    resposta = await fetch(`${wikiUrl()}${rota}`, { method, credentials: 'include', cache: 'no-store', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new Error(`Não consegui falar com a wiki em ${wikiUrl()}. Confira o endereço nas configurações do sistema.`);
  }
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(dados.erro || `a wiki respondeu ${resposta.status}`);
  return dados;
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

// Os dados de cada item da wiki prontos para entrar no ator, com o uid da wiki na flag (para a munição achar a arma).
function itensDaWiki(catalogo, entradas, notas) {
  const itens = [];
  for (const entrada of entradas) {
    const base = catalogo[entrada.id];
    if (!base) { notas.push(`${entrada.nome || entrada.id}: ainda não existe neste sistema.`); continue; }
    const copias = base.type === 'municao' ? 1 : Math.max(1, Number(entrada.qtd) || 1);
    for (let i = 0; i < copias; i++) {
      const data = foundry.utils.deepClone(base);
      if (entrada.renomear) data.name = entrada.renomear;
      foundry.utils.setProperty(data, `flags.${SISTEMA}.wikiUid`, entrada.uid);
      if (data.type === 'municao') data.system.quantidade = Number(entrada.qtd) || 0;
      // Uso escolhido na montagem da wiki; sem ele (personagem antigo), armas e armaduras equipadas.
      if (data.type === 'arma' || data.type === 'armadura') data.system.equipada = entrada.uso ? entrada.uso === 'equipado' : true;
      // O criador da wiki já descontou a Humanidade do cyberware: entra instalado, sem rolar de novo.
      if (data.type === 'cyberware') data.system.instalado = true;
      if (entrada.semHumanidade) data.system.perdaHumanidade = { formula: '0', media: 0, sofrida: 0 };
      itens.push(data);
    }
  }
  return itens;
}

// Carrega cada arma com a munição escolhida na wiki: o pente enche e sai da munição.
async function carregarArmas(ator, entradas) {
  const porUid = uid => ator.items.filter(item => item.getFlag(SISTEMA, 'wikiUid') === uid);
  for (const entrada of entradas.filter(e => e.municao)) {
    const [municao] = porUid(entrada.municao);
    if (!municao) continue;
    for (const arma of porUid(entrada.uid).filter(item => item.type === 'arma' && item.system.pente.max)) {
      await arma.update({ 'system.carregada': municao.id });
      await arma.recarregar();
    }
  }
}

export async function importarPersonagem(id, donoId = '') {
  if (!game.user.isGM) throw new Error('Só o mestre importa personagens da wiki.');
  const catalogo = await carregarCatalogo();
  const { personagem: doc } = await wikiFetch(`/api/personagens/${id}`);
  const r = doc.resultado;
  if (!r) throw new Error('Este personagem ainda não tem ficha pronta: abra no criador da wiki e deixe salvar.');
  const notas = [];

  const stat = chave => Number(r.stats?.[chave.toUpperCase()]) || 1;
  const pericias = {};
  for (const p of r.pericias || []) {
    const par = periciaDaWiki(p);
    if (par) pericias[par[0]] = par[1]; else notas.push(`Perícia ${p.nome} não existe neste sistema.`);
  }
  const habilidades = Object.fromEntries((r.role?.habilidades || []).map(h => [h.nome, h.rank]));
  const ownership = { default: 0, ...(donoId ? { [donoId]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER } : {}) };
  const notasHtml = [doc.aparencia && `<p>${foundry.utils.escapeHTML(doc.aparencia)}</p>`, doc.notas && `<p>${foundry.utils.escapeHTML(doc.notas)}</p>`,
    `<p><i>Criado na wiki${doc.apelido ? ` (${foundry.utils.escapeHTML(doc.apelido)})` : ''}. Importado em ${new Date().toLocaleDateString('pt-BR')}.</i></p>`].filter(Boolean).join('');

  const ator = await Actor.implementation.create({
    name: doc.nome || 'Sem nome', type: 'personagem', ownership,
    system: {
      atributos: Object.fromEntries(ATRIBUTOS.map(chave => [chave, { valor: stat(chave) }])),
      hp: { value: Number(r.derivados?.hp) || 0 },
      humanidade: { value: Number(r.humanidade?.atual ?? r.humanidade?.max) || 0 },
      sorte: { value: stat('luck') },
      pericias,
      role: { nome: r.role?.nome || '', rank: Number(r.role?.rank) || 4, habilidades },
      dinheiro: Number(r.dinheiro?.saldo) || 0,
      notas: notasHtml
    },
    items: itensDaWiki(catalogo, r.itens || [], notas),
    flags: { [SISTEMA]: { wiki: { id: doc.id, versao: doc.versao, importado: new Date().toISOString() } } }
  });
  await carregarArmas(ator, r.itens || []);
  for (const veiculo of r.veiculos || []) notas.push(`${veiculo.nome}: veículos ainda não existem neste sistema.`);

  // A wiki passa a mostrar o personagem como "no Foundry".
  const entregues = [...(r.itens || []).map(item => item.uid), ...(r.veiculos || []).map(veiculo => veiculo.uid)];
  await wikiFetch(`/api/personagens/${doc.id}/foundry`, { method: 'PUT', body: { ator: ator.id, nomeAtor: ator.name, versao: doc.versao, entregues } })
    .catch(error => notas.push(`A wiki não marcou a importação (${error.message}).`));
  return { ator, notas };
}

// Arquiteturas como documentos reutilizáveis: o compêndio do mundo "Arquiteturas da NET", com itens
// NET Architecture do sistema. Na primeira vez, o mestre ativo cria o compêndio (escondido dos jogadores)
// com três arquiteturas de exemplo.
import { MODULE_ID, PACK_NAME, CONTEUDO_DO_TIPO, ICE_PREFIXO } from './constantes.mjs';

const ROTULO = 'Arquiteturas da NET';
export const packDoMundo = () => game.packs.get(`world.${PACK_NAME}`) || null;

// Um andar no formato do item netarch do sistema.
const andar = (floor, branch, tipo, { dv = 'N/A', ice = '--', descricao = '' } = {}) => ({
  floor: String(floor), branch, content: CONTEUDO_DO_TIPO[tipo], dv: tipo === 'ice' ? 'N/A' : String(dv), blackice: tipo === 'ice' ? `${ICE_PREFIXO}${ice}` : '--', description: descricao
});
const arquitetura = (nome, descricao, andares) => ({
  name: nome, type: 'netarch',
  system: { description: { value: `<p>${descricao}</p>` }, floors: andares.map((item, index) => ({ ...item, index })) },
  flags: { [MODULE_ID]: { exemplo: true } }
});

export const EXEMPLOS = [
  arquitetura('Armazém da TLB (exemplo do livro)', 'O exemplo do livro-base (RED p. 218): quatro andares, 13.500eb.', [
    andar(1, 'a', 'ice', { ice: 'hellhound' }), andar(1, 'a', 'ice', { ice: 'killer' }),
    andar(2, 'a', 'senha', { dv: 8 }),
    andar(3, 'a', 'ice', { ice: 'hellhound' }),
    andar(4, 'a', 'controle', { dv: 8, descricao: 'Torreta automática do armazém (e as câmeras do pátio).' })
  ]),
  arquitetura('Apartamento de um fixer', 'Arquitetura básica de uma casa: senha, a agenda do fixer e as câmeras.', [
    andar(1, 'a', 'senha', { dv: 6 }),
    andar(2, 'a', 'arquivo', { dv: 6, descricao: 'Agenda de contatos: três clientes em Watson e um encontro marcado no Afterlife amanhã.' }),
    andar(3, 'a', 'controle', { dv: 6, descricao: 'Câmeras do corredor e a fechadura da porta.' })
  ]),
  arquitetura('Clínica de ripperdoc (ramificada)', 'Dois ramos: o administrativo (A) e o centro cirúrgico (B), que sai do andar 2.', [
    andar(1, 'a', 'senha', { dv: 8 }),
    andar(2, 'a', 'ice', { ice: 'wisp' }),
    andar(3, 'a', 'arquivo', { dv: 8, descricao: 'Prontuários: quem instalou o quê nos últimos seis meses.' }),
    andar(4, 'a', 'ice', { ice: 'killer' }),
    andar(5, 'a', 'arquivo', { dv: 10, descricao: 'Lista de clientes com cyberware ilegal, com os pagamentos em dinheiro vivo.' }),
    andar(3, 'b', 'controle', { dv: 8, descricao: 'Portas do centro cirúrgico e o elevador de serviço.' }),
    andar(4, 'b', 'senha', { dv: 10 }),
    andar(5, 'b', 'controle', { dv: 10, descricao: 'Os dois drones de segurança da clínica.' })
  ])
];

// Cria o compêndio do mundo na primeira vez (mestre ativo) e põe os exemplos.
export async function garantirCompendio() {
  let pack = packDoMundo();
  if (pack) return pack;
  // No v12 a classe é global só pelo nome (não é propriedade de globalThis); no v13, fica em foundry.documents.collections.
  const Colecao = foundry.documents?.collections?.CompendiumCollection ?? CompendiumCollection;
  pack = await Colecao.createCompendium({ name: PACK_NAME, label: ROTULO, type: 'Item', system: game.system.id });
  try { await pack.configure({ ownership: { PLAYER: 'NONE', TRUSTED: 'NONE', ASSISTANT: 'OWNER' } }); } catch (error) { console.warn(`${MODULE_ID} | permissões do compêndio`, error); }
  await Item.createDocuments(EXEMPLOS, { pack: pack.collection });
  ui.notifications.info(`NET Architect: compêndio “${ROTULO}” criado com ${EXEMPLOS.length} arquiteturas de exemplo.`);
  return pack;
}

// Todas as arquiteturas que o mestre pode escolher: o compêndio do mundo, os itens do mundo e outros compêndios de itens.
export async function arquiteturasDisponiveis() {
  const lista = [];
  const pack = packDoMundo();
  const vistos = new Set();
  const juntar = (fonte, uuid, nome) => { if (!vistos.has(uuid)) { vistos.add(uuid); lista.push({ fonte, uuid, nome }); } };
  if (pack) for (const item of await pack.getIndex({ fields: ['type'] })) if (item.type === 'netarch') juntar(ROTULO, item.uuid || `Compendium.${pack.collection}.Item.${item._id}`, item.name);
  for (const item of game.items.filter(entrada => entrada.type === 'netarch')) juntar('Itens do mundo', item.uuid, item.name);
  for (const outro of game.packs.filter(entrada => entrada.documentName === 'Item' && entrada !== pack)) {
    let indice;
    try { indice = await outro.getIndex({ fields: ['type'] }); } catch { continue; }
    for (const item of indice) if (item.type === 'netarch') juntar(outro.metadata.label, item.uuid || `Compendium.${outro.collection}.Item.${item._id}`, item.name);
  }
  return lista.sort((a, b) => a.fonte.localeCompare(b.fonte) || a.nome.localeCompare(b.nome));
}

export async function novaArquitetura() {
  const pack = await garantirCompendio();
  const [item] = await Item.createDocuments([arquitetura('Nova arquitetura', 'Edite os andares na aba de andares.', [andar(1, 'a', 'senha', { dv: 6 })])], { pack: pack.collection });
  return item;
}

// Migração dos dados do mundo entre versões do sistema (o dataModelVersion e o MigrationRunner do CORE,
// modules/system/migrate). A versão dos dados do mundo fica na configuração escondida "versaoDosDados", e cada passo leva
// os dados até a versão dele. No ready, o mestre ativo confere o mundo: os itens e os atores (com os itens deles), os
// tokens não ligados e os compêndios do mundo. Se algum passo muda alguma coisa, pergunta antes (com o aviso do backup) e
// grava; se nada muda (o mundo novo, ou já no formato novo), só grava a versão. Os compêndios do sistema saem do build já
// no formato novo, e os dos módulos ficam como estão (como no CORE).
//
// Passo novo: no fim de PASSOS, com a versão seguinte, o nome e item(dados, contexto) e/ou ator(dados, contexto).
// - A função recebe uma cópia dos dados do documento (o toObject) e a muda no lugar.
// - Só mexe no formato antigo: rodar de novo não muda nada. O mundo em que a migração parou no meio roda tudo de novo.
// - O contexto tem o catálogo (pelo id da loja) e, no item de um ator, os dados do ator.
// Renomear ou mudar o formato de um campo do modelo vai no migrateData do modelo (dados.mjs), que converte na leitura; os
// passos daqui são para o que precisa do catálogo, dos efeitos ou de outro documento.
import { carregarCatalogo } from './catalogo.mjs';
import { SISTEMA } from './config.mjs';
import { cabeNaFundacao, pedeFundacao } from './regras.mjs';

const doCatalogo = dados => dados.flags?.[SISTEMA]?.catalogo ?? '';

// ---------------- Os passos ----------------
// O +1 de sempre do CORE no TeleOptics (no tiro mirado e no tiro único), que o catálogo trouxe até o ciclo 26.
const CHAVES_DO_TELEOPTICS_DO_CORE = ['system.bonus.tiroMirado', 'system.bonus.tiroUnico'];
const efeitoDoTeleOpticsDoCore = efeito => {
  const mudancas = efeito.system?.changes ?? [];
  return mudancas.length > 0 && mudancas.every(m => CHAVES_DO_TELEOPTICS_DO_CORE.includes(m.key) && m.type === 'add' && Number(m.value) === 1);
};
// Os tipos de cyberware do catálogo que a ficha do item não conhecia até o ciclo 7: salvar a ficha os trocava por
// fashionware, a primeira opção.
const TIPOS_QUE_VIRAVAM_FASHIONWARE = ['cyberEye', 'cyberAudioSuite', 'cyberwareInternal', 'cyberwareExternal'];
// O efeito de um booster de Interface (system.bonus.interface), que o catálogo traz desde o ciclo 40.
const efeitoDeInterface = efeito => (efeito.system?.changes ?? []).some(mudanca => String(mudanca.key).startsWith('system.bonus.interface.'));
// O cyberware como a regra do encaixe o lê (regras.cabeNaFundacao), nos dados: sem os slots (de antes do ciclo 82), os do
// catálogo.
const encaixeNosDados = (dados, catalogo) => ({
  tipo: dados.system?.tipo ?? '', catalogo: doCatalogo(dados), tamanho: Number(dados.system?.tamanho) || 0,
  slots: Number(dados.system?.slots) || Number(catalogo?.[doCatalogo(dados)]?.system?.slots) || 0
});

export const PASSOS = [
  {
    versao: 1,
    nome: 'O TeleOptics do RED sem o +1 de sempre do CORE (vale a regra da wiki, pela distância, desde o ciclo 26)',
    item(dados) {
      if (dados.type !== 'cyberware' || doCatalogo(dados) !== 'core_cyberware:teleoptics') return;
      dados.effects = (dados.effects ?? []).filter(efeito => !efeitoDoTeleOpticsDoCore(efeito));
    }
  },
  {
    versao: 2,
    nome: 'O tipo do cyberware que a ficha do item trocava por Fashionware (até o ciclo 7) volta ao do catálogo',
    item(dados, { catalogo }) {
      if (dados.type !== 'cyberware' || dados.system?.tipo !== 'fashionware') return;
      const tipo = catalogo?.[doCatalogo(dados)]?.system?.tipo;
      if (TIPOS_QUE_VIRAVAM_FASHIONWARE.includes(tipo)) dados.system.tipo = tipo;
    }
  },
  {
    versao: 3,
    nome: 'Os boosters de Interface (Eraser, See Ya, Speedy Gonzalvez e Worm) ganham o +2 na habilidade deles, que o catálogo passou a trazer no ciclo 40',
    item(dados, { catalogo }) {
      if (dados.type !== 'programa' || (dados.effects ?? []).some(efeitoDeInterface)) return;
      const efeitos = (catalogo?.[doCatalogo(dados)]?.effects ?? []).filter(efeitoDeInterface);
      if (efeitos.length) dados.effects = [...(dados.effects ?? []), ...structuredClone(efeitos)];
    }
  },
  {
    versao: 4,
    nome: 'A fundação e as opções do cyberware (ciclo 82): a fundação ganha os slots do catálogo, e cada opção já instalada vai na primeira fundação instalada do mesmo ator em que cabe (a que não couber fica sem fundação, marcada na ficha; a decisão do usuário de 2026-10-16)',
    // No ator, antes dos itens: os slots da fundação vêm do catálogo quando ela ainda não os tem.
    ator(dados, { catalogo }) {
      const cyber = (dados.items ?? []).filter(item => item.type === 'cyberware' && item.system);
      const fundacoes = cyber.filter(item => item.system.fundacional && item.system.instalado);
      const tamanho = item => Number(item.system.tamanho) || 0;
      const usados = new Map(fundacoes.map(fundacao => [fundacao._id, cyber.filter(item => item.system.instaladoEm === fundacao._id).reduce((soma, item) => soma + tamanho(item), 0)]));
      const soltas = cyber.filter(item => !item.system.fundacional && item.system.instalado && !item.system.instaladoEm && pedeFundacao(encaixeNosDados(item, catalogo)));
      for (const opcao of soltas) {
        const fundacao = fundacoes.find(f => cabeNaFundacao({ fundacao: encaixeNosDados(f, catalogo), opcao: encaixeNosDados(opcao, catalogo), usados: usados.get(f._id) }).cabe);
        if (!fundacao) continue;
        opcao.system.instaladoEm = fundacao._id;
        usados.set(fundacao._id, usados.get(fundacao._id) + tamanho(opcao));
      }
    },
    item(dados, { catalogo }) {
      if (dados.type !== 'cyberware' || !dados.system?.fundacional || dados.system.slots) return;
      const slots = Number(catalogo?.[doCatalogo(dados)]?.system?.slots) || 0;
      if (slots) dados.system.slots = slots;
    }
  },
  {
    versao: 5,
    nome: 'Eletrônico e proteção EMP dos itens antigos do catálogo (C14)',
    item(dados, { catalogo }) {
      const fonte = catalogo?.[doCatalogo(dados)]?.system;
      if (!fonte || !('endurecido' in fonte) || dados.flags?.[SISTEMA]?.eletronicaMigrada) return;
      // Equipamento já tinha Eletrônico antes do C14: preserva a edição do usuário nesse campo.
      if (dados.type !== 'equipamento') dados.system.eletronico = fonte.eletronico;
      dados.system.endurecido = fonte.endurecido;
      dados.flags[SISTEMA].eletronicaMigrada = true;
    }
  }
];
export const VERSAO_DOS_DADOS = PASSOS.at(-1)?.versao ?? 0;
export const passosDepoisDe = versao => PASSOS.filter(passo => passo.versao > versao);

// Os dados de um documento ('Actor' ou 'Item') depois dos passos, numa cópia: os de entrada ficam como estavam. Num ator,
// cada passo muda o ator e depois os itens dele, como no CORE.
export function migrarDados(dados, { documento, passos = PASSOS, catalogo = {} }) {
  const copia = structuredClone(dados);
  for (const passo of passos) {
    if (documento === 'Item') { passo.item?.(copia, { catalogo, ator: null }); continue; }
    passo.ator?.(copia, { catalogo });
    for (const item of copia.items ?? []) passo.item?.(item, { catalogo, ator: copia });
  }
  return copia;
}

// ---------------- O plano: o que muda em cada documento ----------------
// O campo que some vai no update como APAGAR (no Foundry, o _del: o "-=" saiu no 14).
export const APAGAR = Symbol('apagar');
const ehObjeto = valor => valor !== null && typeof valor === 'object' && !Array.isArray(valor);
const iguais = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Os campos que mudaram, para o update: o que mudou num objeto vai por dentro, a lista e o valor vão inteiros, e o campo
// que sumiu vai como APAGAR. Sem mudança, um objeto vazio.
export function diferenca(antes = {}, depois = {}) {
  const saida = {};
  for (const chave of new Set([...Object.keys(antes), ...Object.keys(depois)])) {
    if (!(chave in depois)) { saida[chave] = APAGAR; continue; }
    const [a, d] = [antes[chave], depois[chave]];
    if (ehObjeto(a) && ehObjeto(d)) {
      const dentro = diferenca(a, d);
      if (Object.keys(dentro).length) saida[chave] = dentro;
    } else if (!iguais(a, d)) saida[chave] = d;
  }
  return saida;
}

// As coleções embutidas, pelo nome no toObject e o nome do documento.
const COLECOES = { items: 'Item', effects: 'ActiveEffect' };

// O plano de um documento: os campos que mudam (fora as coleções) e, em cada coleção embutida, o que sai, o que entra e o
// que muda, com o plano de cada um.
export function planoDeMudanca(antes, depois) {
  const semColecoes = dados => Object.fromEntries(Object.entries(dados).filter(([chave]) => !(chave in COLECOES)));
  const plano = { campos: diferenca(semColecoes(antes), semColecoes(depois)), colecoes: {} };
  for (const [chave, nome] of Object.entries(COLECOES)) {
    const velhos = new Map((antes[chave] ?? []).map(dados => [dados._id, dados]));
    const novos = depois[chave] ?? [];
    const ficam = new Set(novos.map(dados => dados._id).filter(Boolean));
    const apagar = [...velhos.keys()].filter(id => !ficam.has(id));
    const criar = novos.filter(dados => !dados._id || !velhos.has(dados._id));
    const mudar = novos.filter(dados => dados._id && velhos.has(dados._id))
      .map(dados => ({ _id: dados._id, plano: planoDeMudanca(velhos.get(dados._id), dados) }))
      .filter(mudanca => !planoVazio(mudanca.plano));
    if (apagar.length || criar.length || mudar.length) plano.colecoes[nome] = { apagar, criar, mudar };
  }
  return plano;
}
export const planoVazio = plano => !Object.keys(plano.campos).length && !Object.keys(plano.colecoes).length;

// ---------------- No Foundry ----------------
const TIPOS_DOS_COMPENDIOS = ['Actor', 'Item'];
const esc = texto => foundry.utils.escapeHTML(String(texto ?? ''));
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

// Os campos do plano no formato do update do Foundry 14: o APAGAR vira o _del.
const paraOUpdate = campos => Object.fromEntries(Object.entries(campos).map(([chave, valor]) => [chave, valor === APAGAR ? _del : ehObjeto(valor) ? paraOUpdate(valor) : valor]));

async function aplicar(documento, plano) {
  if (Object.keys(plano.campos).length) await documento.update(paraOUpdate(plano.campos));
  for (const [nome, { apagar, criar, mudar }] of Object.entries(plano.colecoes)) {
    if (apagar.length) await documento.deleteEmbeddedDocuments(nome, apagar);
    if (criar.length) await documento.createEmbeddedDocuments(nome, criar, { keepId: true });
    for (const { _id, plano: doEmbutido } of mudar) await aplicar(documento.getEmbeddedDocument(nome, _id), doEmbutido);
  }
}

// O token não ligado guarda só o que difere do ator do mundo (o delta). Sem nada guardado, ele é o ator do mundo, que a
// migração já levou.
const tokenComDados = token => {
  const delta = token.delta?._source;
  return Boolean(delta && ((delta.items?.length ?? 0) || (delta.effects?.length ?? 0) || Object.keys(delta.system ?? {}).length || Object.keys(delta.flags ?? {}).length));
};

// Os grupos que a migração confere, na ordem em que grava: os atores dos tokens leem o ator do mundo já migrado. Cada
// grupo dá a lista e, no dos tokens, como chegar ao ator (lido na hora: o Foundry pode montar o ator do token de novo).
async function gruposDoMundo() {
  const tokens = game.scenes.contents.flatMap(cena => cena.tokens.contents).filter(token => !token.actorLink && token.actor && tokenComDados(token));
  const compendios = game.packs.filter(pacote => pacote.metadata.packageType === 'world' && TIPOS_DOS_COMPENDIOS.includes(pacote.documentName));
  const grupos = [
    { rotulo: ['item do mundo', 'itens do mundo'], fontes: game.items.contents },
    { rotulo: ['ator do mundo', 'atores do mundo'], fontes: game.actors.contents },
    { rotulo: ['token não ligado', 'tokens não ligados'], fontes: tokens, ler: token => token.actor, talvez: true }
  ];
  for (const pacote of compendios) grupos.push({ rotulo: [`documento do compêndio ${pacote.metadata.label}`, `documentos do compêndio ${pacote.metadata.label}`], fontes: await pacote.getDocuments(), pacote });
  for (const grupo of grupos) grupo.documentos = () => grupo.fontes.map(fonte => (grupo.ler ? grupo.ler(fonte) : fonte)).filter(Boolean);
  return grupos;
}

const planoDe = (documento, contexto) => {
  const antes = documento.toObject();
  return planoDeMudanca(antes, migrarDados(antes, { ...contexto, documento: documento.documentName }));
};

async function perguntar({ desde, grupos, contagem, passos }) {
  const linhas = grupos.map((grupo, i) => [grupo, contagem[i]]).filter(([, n]) => n)
    .map(([grupo, n]) => `<li>${grupo.talvez ? 'até ' : ''}${esc(plural(n, ...grupo.rotulo))}</li>`).join('');
  const escolha = await foundry.applications.api.DialogV2.wait({
    window: { title: 'Migração dos dados do sistema' }, classes: [SISTEMA, 'migracao'], position: { width: 520 }, rejectClose: false,
    content: `<p>Os dados deste mundo são da versão ${desde} do sistema Cyberpunk RED — Fieldbook, e esta é a ${VERSAO_DOS_DADOS}. A migração muda:</p><ul>${linhas}</ul>`
      + `<p>Os passos:</p><ul>${passos.map(passo => `<li>${esc(passo.nome)}</li>`).join('')}</ul>`
      + '<p><b>Antes, faça o backup do mundo</b> (na tela de configuração do Foundry, em Manage Backups). A migração não se desfaz.</p>'
      + '<p>Depois: os dados ficam como estão, e o sistema pergunta de novo quando o mundo abrir.</p>',
    buttons: [{ action: 'migrar', label: 'Migrar agora', icon: 'fa-solid fa-database' }, { action: 'depois', label: 'Depois', default: true }]
  });
  return escolha === 'migrar';
}

// Migra o mundo da versão guardada (ou de "desde") até a atual. perguntar: false migra sem a pergunta (macros e testes).
// Devolve { versao, mudados, adiado?, erro? }.
export async function migrarMundo({ desde = game.settings.get(SISTEMA, 'versaoDosDados'), perguntar: pergunta = true } = {}) {
  const passos = passosDepoisDe(desde);
  const contexto = { passos, catalogo: await carregarCatalogo() };
  const grupos = await gruposDoMundo();
  const contagem = grupos.map(grupo => grupo.documentos().filter(documento => !planoVazio(planoDe(documento, contexto))).length);
  const total = contagem.reduce((soma, n) => soma + n, 0);
  if (!total) {
    await game.settings.set(SISTEMA, 'versaoDosDados', VERSAO_DOS_DADOS);
    return { versao: VERSAO_DOS_DADOS, mudados: 0 };
  }
  if (pergunta && !(await perguntar({ desde, grupos, contagem, passos }))) return { versao: desde, mudados: 0, adiado: true };

  const progresso = ui.notifications.info('Migrando os dados do sistema…', { progress: true });
  const mudados = [];
  let atual = null;
  try {
    for (const [i, grupo] of grupos.entries()) {
      if (!contagem[i]) continue;
      // O compêndio trancado abre só durante a migração.
      const trancado = Boolean(grupo.pacote?.locked);
      if (trancado) await grupo.pacote.configure({ locked: false });
      try {
        for (const documento of grupo.documentos()) {
          // O plano de novo, com os dados de agora: o token mostra o ator do mundo, que já pode ter mudado.
          const plano = planoDe(documento, contexto);
          if (planoVazio(plano)) continue;
          atual = documento;
          await aplicar(documento, plano);
          mudados.push(documento.name);
          progresso.update({ pct: Math.min(1, mudados.length / total) });
        }
      } finally {
        if (trancado) await grupo.pacote.configure({ locked: true });
      }
    }
  } catch (erro) {
    progresso.remove();
    console.error(`${SISTEMA} | a migração dos dados parou em ${atual?.uuid ?? '?'}:`, erro);
    ui.notifications.error(`A migração dos dados parou em ${atual?.name ?? '?'} (${erro.message}). O mundo continua na versão ${desde}: corrija e abra o mundo de novo, e os passos rodam outra vez.`, { permanent: true });
    return { versao: desde, mudados: mudados.length, erro: erro.message };
  }
  progresso.update({ pct: 1 });
  await game.settings.set(SISTEMA, 'versaoDosDados', VERSAO_DOS_DADOS);
  ui.notifications.info(`Migração dos dados concluída: ${plural(mudados.length, 'documento mudou', 'documentos mudaram')} (versão ${desde} → ${VERSAO_DOS_DADOS}).`);
  // O registro fica no chat, só para os mestres.
  await ChatMessage.implementation.create({
    speaker: { alias: 'Migração dos dados' }, whisper: game.users.filter(usuario => usuario.isGM).map(usuario => usuario.id),
    content: `<div class="${SISTEMA} cartao migracao"><p>Versão ${desde} → ${VERSAO_DOS_DADOS} dos dados do sistema.</p><p>Os passos:</p><ul>${passos.map(passo => `<li>${esc(passo.nome)}</li>`).join('')}</ul>`
      + `<p>Mudaram:</p><ul>${mudados.map(nome => `<li>${esc(nome)}</li>`).join('')}</ul></div>`,
    flags: { [SISTEMA]: { migracao: { de: desde, para: VERSAO_DOS_DADOS, mudados } } }
  });
  return { versao: VERSAO_DOS_DADOS, mudados: mudados.length };
}

// No ready: só o mestre ativo, e só com os dados de uma versão anterior.
export async function conferirMigracao() {
  if (!game.user.isGM || game.users.activeGM?.id !== game.user.id) return;
  const versao = game.settings.get(SISTEMA, 'versaoDosDados');
  if (versao > VERSAO_DOS_DADOS) {
    ui.notifications.warn(`Os dados deste mundo são da versão ${versao} do sistema, mais nova que a deste sistema (${VERSAO_DOS_DADOS}). Atualize o sistema antes de jogar.`, { permanent: true });
    return;
  }
  if (versao < VERSAO_DOS_DADOS) await migrarMundo();
}

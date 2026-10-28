// A revisão seletiva do atualizarDaWiki do cpr-2077 (foundry-2077/scripts/wiki.mjs): sem recursos gastos em jogo.
// Os valores da wiki chegam normalizados pelos mesmos conversores da importação. Este módulo não usa o Foundry.
import { ATRIBUTOS, LIFEPATH, SISTEMA } from './config.mjs';

const igual = (a, b) => {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const chaves = Object.keys(a);
  return chaves.length === Object.keys(b).length && chaves.every(chave => Object.hasOwn(b, chave) && igual(a[chave], b[chave]));
};

// O planRoles da mesa só retira Roles criadas pelo importador. Aqui são campos do ator: a flag guarda os nomes que
// podem sair. Uma Role acrescentada à mão ocupa seu lugar até o mestre resolver o conflito pela ficha.
function planejarRoles(sistema, vinculo, roles) {
  const atuais = [sistema.role, sistema.roleSecundaria].filter(role => role?.nome);
  const importadas = new Set(vinculo.roles || []);
  const manuais = atuais.filter(role => !importadas.has(role.nome) && !roles.some(nova => nova.nome === role.nome));
  const desejadas = [...roles, ...manuais];
  if (desejadas.length > 2) {
    const aviso = `Roles manuais preservadas (${manuais.map(role => role.nome).join(', ')}): não há espaço para as Roles da wiki. Ajuste pela ficha.`;
    return { linhas: [aviso], atualizacao: {}, bloqueado: true, notas: [aviso], vinculadas: [...importadas] };
  }
  const [principal, segunda] = desejadas;
  const atualizacao = {};
  const linhas = [];
  const camposDaRole = role => ({ nome: role.nome, rank: role.rank, habilidades: role.habilidades });
  const campos = [
    ['role', { ...camposDaRole(principal), notas: sistema.role?.notas || '' }],
    ['roleSecundaria', segunda ? camposDaRole(segunda) : { nome: '', rank: 0, habilidades: {} }]
  ];
  for (const [campo, nova] of campos) {
    const antes = sistema[campo] || {};
    if (igual(antes, nova)) continue;
    atualizacao[`system.${campo}`] = nova;
    const habilidades = Object.entries(nova.habilidades || {}).map(([nome, pontos]) => `${nome}: ${pontos}`).join(', ');
    linhas.push(`${campo === 'role' ? 'Role principal' : 'Segunda Role'}: ${antes.nome || '—'} → ${nova.nome || '—'}${nova.nome ? `, Rank ${antes.rank ?? 0} → ${nova.rank}${habilidades ? ` (${habilidades})` : ''}` : ''}`);
  }
  return {
    linhas, atualizacao, notas: [],
    vinculadas: roles.filter(role => importadas.has(role.nome) || !atuais.some(atual => atual.nome === role.nome)).map(role => role.nome)
  };
}

export function planejarAtualizacao({ sistema = {}, atributosBase = sistema.atributos, vinculo = {}, itens = [] } = {}, doc = {}, { pericias = {}, roles = [], lifepath = {}, moradia = {} } = {}) {
  const grupos = [];
  const notas = [];
  const r = doc.resultado || {};
  const grupo = (chave, titulo, linhas, atualizacao = {}) => {
    if (linhas.length) grupos.push({ chave, titulo, linhas, atualizacao });
  };

  // Os efeitos temporários alteram os STATs preparados. A comparação usa a fonte, conservando HP, Humanidade e Sorte.
  const stats = {};
  const linhasStats = [];
  for (const chave of ATRIBUTOS) {
    const recebido = r.stats?.[chave.toUpperCase()];
    if (recebido === undefined || recebido === null || recebido === '' || !Number.isFinite(Number(recebido))) continue;
    const valor = Number(recebido);
    const antes = atributosBase?.[chave]?.valor;
    if (antes === valor) continue;
    stats[`system.atributos.${chave}.valor`] = valor;
    linhasStats.push(`${chave.toUpperCase()} ${antes ?? '—'} → ${valor}`);
  }
  grupo('stats', 'STATs', linhasStats, stats);

  // applySkills da mesa só altera o nível das perícias recebidas; perícias próprias e especializações manuais ficam.
  const mudancasPericias = {};
  const linhasPericias = [];
  for (const [id, recebida] of Object.entries(pericias)) {
    const atual = sistema.pericias?.[id];
    if (atual?.nivel === recebida.nivel) continue;
    if (atual) mudancasPericias[`system.pericias.${id}.nivel`] = recebida.nivel;
    else mudancasPericias[`system.pericias.${id}`] = { ...recebida };
    linhasPericias.push(`${recebida.nome || id}: ${atual?.nivel ?? '—'} → ${recebida.nivel}`);
  }
  grupo('pericias', 'Perícias', linhasPericias, mudancasPericias);

  let rolesVinculadas = [...(vinculo.roles || [])];
  if (roles.length) {
    const plano = planejarRoles(sistema, vinculo, roles);
    grupo('roles', 'Roles (Ranks e sub-habilidades)', plano.linhas, plano.atualizacao);
    if (plano.bloqueado) grupos.at(-1).bloqueado = true;
    notas.push(...plano.notas);
    rolesVinculadas = plano.vinculadas;
  }

  // O atualizarDaWiki não recria equipamento perdido ou gasto. O recibo continua valendo mesmo sem a cópia na ficha;
  // UIDs presentes completam a flag de atores importados antes de ela existir (importarPersonagem/importarDaMesa).
  const entregues = new Set([...(vinculo.entregues || []), ...itens.map(item => item.uid || item.flags?.[SISTEMA]?.wikiUid).filter(Boolean)]);
  const novosItens = (r.itens || []).filter(entrada => {
    if (!entrada.uid || entregues.has(entrada.uid)) return false;
    entregues.add(entrada.uid);
    return true;
  });
  grupo('itens', 'Itens novos', novosItens.map(item => `${item.nome || item.id}${item.qtd > 1 ? ` ×${item.qtd}` : ''}`));

  const mudancasLifepath = {};
  const linhasLifepath = [];
  for (const { chave, rotulo } of LIFEPATH) {
    if (!Object.hasOwn(lifepath, chave) || (sistema.lifepath?.[chave] || '') === lifepath[chave]) continue;
    mudancasLifepath[`system.lifepath.${chave}`] = lifepath[chave];
    linhasLifepath.push(`${rotulo}: ${lifepath[chave] || '—'}`);
  }
  grupo('lifepath', 'Lifepath', linhasLifepath, mudancasLifepath);

  const mudancasMoradia = {};
  const linhasMoradia = [];
  for (const [chave, titulo] of [['moradia', 'Moradia'], ['estiloDeVida', 'Estilo de vida'], ['traumaTeam', 'Trauma Team'], ['moda', 'Moda']]) {
    if (!Object.hasOwn(moradia, chave) || igual(sistema[chave], moradia[chave])) continue;
    mudancasMoradia[`system.${chave}`] = moradia[chave];
    const entrada = moradia[chave];
    linhasMoradia.push(`${titulo}: ${typeof entrada === 'string' ? entrada || '—' : `${entrada.descricao || '—'} (${entrada.custo} eb/mês)`}`);
  }
  grupo('moradia', 'Moradia e estilo de vida', linhasMoradia, mudancasMoradia);
  return { grupos, novosItens, notas, rolesVinculadas };
}

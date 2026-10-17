// Personagens do criador da wiki: "Importar da wiki" (aba de Atores) e "Atualizar da wiki" (cabeçalho da ficha).
// A wiki grava em cada personagem um `resultado` pronto: perícias com o nome do Foundry, itens com o compêndio
// de onde vêm, Lifepath em texto e dinheiro. Aqui é só montar o ator com isso.
// Quem é o mestre para a wiki: em casa, o computador onde a wiki roda; no servidor, o navegador que entrou
// como mestre na wiki (o cookie vai junto: wiki.dominio e mesa.dominio são o mesmo site).
const MODULE_ID = 'cpr-2077';
// Endereço padrão da wiki: com o Foundry em mesa.dominio, a wiki fica em wiki.dominio; em casa, localhost:8000.
const defaultWikiUrl = () => /^mesa\./.test(location.hostname) ? `${location.protocol}//wiki.${location.hostname.slice(5)}` : 'http://localhost:8000';

export function registerWikiSettings() {
  game.settings.register(MODULE_ID, 'wikiUrl', {
    name: 'Endereço da wiki',
    hint: 'Onde o Foundry busca os personagens do criador da wiki. Vazio: wiki.seudominio quando a mesa abre em mesa.seudominio, ou http://localhost:8000 com tudo no mesmo computador.',
    scope: 'world', config: true, type: String, default: ''
  });
  game.settings.register(MODULE_ID, 'wikiMesa', {
    name: 'Mandar a ficha para a wiki',
    hint: 'Para o mestre: a cada mudança num personagem que veio da wiki (HP, dinheiro, itens, munição…), manda a ficha para a wiki, que mostra em "Na mesa".',
    scope: 'client', config: true, type: Boolean, default: true
  });
  game.settings.register(MODULE_ID, 'wikiAvisos', {
    name: 'Avisos da wiki',
    hint: 'Para o mestre: ao entrar e a cada minuto, confere se algum jogador enviou um personagem pela wiki e avisa (uma vez por envio).',
    scope: 'client', config: true, type: Boolean, default: true
  });
  game.settings.register(MODULE_ID, 'wikiCampanha', {
    name: 'Campanha da wiki',
    hint: 'A campanha da wiki que este mundo joga: o importador, a ficha na wiki, os avisos e os pedidos ficam só com os personagens dela. Vazio: a campanha cujo "Mundo do Foundry" (página Campanhas da wiki) é este mundo; com uma campanha só, ela. Para escolher na mão, escreva o id da campanha (aparece ao lado do nome, na página Campanhas da wiki).',
    scope: 'world', config: true, type: String, default: '', onChange: () => { campaignCache = null; }
  });
}

const wikiUrl = () => String(game.settings.get(MODULE_ID, 'wikiUrl') || defaultWikiUrl()).trim().replace(/\/+$/, '');

// ---------------- Campanha deste mundo ----------------
// A wiki tem várias campanhas no mesmo universo; cada mundo do Foundry joga uma. Resolve: a configurada; senão a que
// tem este mundo como "Mundo do Foundry"; senão, com uma campanha só, ela.
//   null          → wiki de antes das campanhas (ou fora do ar): tudo como antes, sem filtro;
//   { id, nome }  → a campanha deste mundo;
//   { erro }      → há campanhas, mas não deu para saber qual: mostra tudo e não entrega pedidos (avisa o mestre).
let campaignCache = null;
async function tableCampaign() {
  const configured = String(game.settings.get(MODULE_ID, 'wikiCampanha') || '').trim();
  if (campaignCache && Date.now() - campaignCache.at < 60_000 && campaignCache.configured === configured) return campaignCache.value;
  let value = null;
  try {
    const list = (await wikiFetch('/api/campanhas')).campanhas || [];
    const found = configured ? list.find(item => item.id === configured) : list.find(item => item.mundo && item.mundo === game.world.id) || (list.length === 1 ? list[0] : null);
    value = found || (list.length ? { erro: configured ? `A campanha "${configured}" não existe na wiki.` : 'Este mundo não está ligado a nenhuma campanha da wiki.', lista: list } : null);
    // Com uma campanha só, este mundo é dela: grava na configuração, para continuar nela quando aparecer a segunda.
    if (found && !configured && list.length === 1 && game.user.isGM && (!game.users.activeGM || game.users.activeGM.id === game.user.id)) {
      campaignCache = { at: Date.now(), configured: found.id, value: found };
      await game.settings.set(MODULE_ID, 'wikiCampanha', found.id).catch(() => null);
    }
  } catch { value = null; }
  campaignCache = { at: Date.now(), configured: String(game.settings.get(MODULE_ID, 'wikiCampanha') || '').trim(), value };
  return value;
}
// O personagem é da campanha deste mundo? Sem campanha resolvida, todos (como antes das campanhas).
const ofTable = (item, campaign) => !campaign?.id || item.campanha === campaign.id;
const unresolvedHelp = campaign => `${campaign.erro} Ligue este mundo a uma: Configurações do módulo → Campanha da wiki, ou o "Mundo do Foundry" (${game.world.id}) na página Campanhas da wiki.`;
const esc = text => foundry.utils.escapeHTML ? foundry.utils.escapeHTML(String(text ?? '')) : String(text ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

async function wikiFetch(path, { method = 'GET', body } = {}) {
  // O contrato de duas Roles também é usado pelos pedidos e pela montagem. Importadores antigos não o anunciam.
  const endpoint = method === 'GET' && /^\/api\/personagens\/[^/?]+$/.test(path) ? `${path}?roles=2&locais=1` : path;
  let response;
  try {
    response = await fetch(`${wikiUrl()}${endpoint}`, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined, cache: 'no-store', credentials: 'include' });
  } catch {
    throw new Error(`Não consegui falar com a wiki em ${wikiUrl()}. Confira o endereço em Configurações do módulo → Endereço da wiki.`);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.erro || `A wiki respondeu ${response.status}.`);
  return data;
}
// A wiki não reconheceu este navegador como o do mestre.
const notGmMessage = () => `A wiki não reconheceu você como mestre. Neste navegador, entre como mestre na wiki (${wikiUrl()}/mestre) e tente de novo.`;

// ---------------- Itens dos compêndios ----------------
const packCache = new Map();
async function fromPack(packId, name) {
  const pack = game.packs.get(packId);
  if (!pack) throw new Error(`Falta o compêndio ${packId}.`);
  if (!packCache.has(packId)) packCache.set(packId, await pack.getIndex());
  const entry = packCache.get(packId).find(item => item.name === name);
  if (!entry) return null;
  const doc = await pack.getDocument(entry._id);
  const data = doc.toObject();
  delete data._id;
  return data;
}

const EQUIPPED = { equipado: 'equipped', carregando: 'carried', guardado: 'owned' };
// O CORE usa installLocation para Shopping/Clínica/Hospital, não para o lado do corpo.
const CYBER_LOCATIONS = {
  'braco-esquerdo': { tipo: 'cyberArm', nome: 'Braço esquerdo' }, 'braco-direito': { tipo: 'cyberArm', nome: 'Braço direito' },
  'olho-esquerdo': { tipo: 'cyberEye', nome: 'Olho esquerdo' }, 'olho-direito': { tipo: 'cyberEye', nome: 'Olho direito' },
  'perna-esquerda': { tipo: 'cyberLeg', nome: 'Perna esquerda' }, 'perna-direita': { tipo: 'cyberLeg', nome: 'Perna direita' }
};
const CYBER_NEEDS_BASE = new Set(['neuralWare', 'cyberEye', 'cyberAudioSuite', 'cyberArm', 'cyberLeg', 'borgware']);
function cyberLocal(value, type) {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value !== 'string' || !CYBER_LOCATIONS[value] || CYBER_LOCATIONS[value].tipo !== type) throw new Error('Local anatômico inválido ou incompatível com o cyberware.');
  return value;
}
const cyberLocalName = value => CYBER_LOCATIONS[value]?.nome || 'Local não definido';
const plannedLocal = item => {
  const value = item.getFlag(MODULE_ID, 'wikiLocal');
  return CYBER_LOCATIONS[value]?.tipo === item.system.type ? value : '';
};
const parentItems = (actor, item) => actor.items.filter(parent => parent.system.installedItems?.list?.includes(item.id));
// Só o caminho real de instalação define onde a peça está. A intenção de uma peça guardada não vira instalação.
function actualCyberLocal(actor, item, seen = new Set()) {
  if (seen.has(item.id)) return '';
  seen.add(item.id);
  const parents = parentItems(actor, item);
  if (parents.length === 1) return actualCyberLocal(actor, parents[0], seen);
  if (parents.length > 1 || !actor.system.installedItems?.list?.includes(item.id)) return '';
  return plannedLocal(item);
}
function installedInActor(actor, item, seen = new Set()) {
  if (seen.has(item.id)) return false;
  seen.add(item.id);
  if (actor.system.installedItems?.list?.includes(item.id)) return true;
  return parentItems(actor, item).some(parent => installedInActor(actor, parent, new Set(seen)));
}
const referencedItems = (actor, reference) => String(reference || '').startsWith('foundry:')
  ? [actor.items.get(reference.slice('foundry:'.length))].filter(Boolean) : itemsByUid(actor, reference);

// Dados de um item da wiki prontos para entrar no ator.
async function itemData(entry) {
  const data = await fromPack(entry.foundry.pack, entry.foundry.nome);
  if (!data) return null;
  const s = data.system || {};
  if (entry.renomear) data.name = entry.renomear;
  const catalogName = data.name;
  const local = data.type === 'cyberware' ? cyberLocal(entry.local, s.type) : '';
  // O cyberware grátis de 2077 não custa Humanidade (nem reduz a máxima).
  if (entry.semHumanidade && s.humanityLoss) {
    s.humanityLoss = { static: 0, roll: '0' };
    s.price = { ...(s.price || {}), market: 0 };
  }
  // Munição e itens de pilha usam `amount`; o resto entra como cópias separadas.
  const stacks = 'amount' in s;
  if (stacks) s.amount = entry.qtd;
  // Uso escolhido na montagem da wiki; sem ele (personagem antigo), armas e armaduras equipadas e o resto carregando.
  if ('equipped' in s) s.equipped = EQUIPPED[entry.uso] || (['weapon', 'armor'].includes(data.type) ? 'equipped' : data.type === 'clothing' ? s.equipped : 'carried');
  data.flags = { ...(data.flags || {}), [MODULE_ID]: { ...((data.flags || {})[MODULE_ID] || {}), wikiUid: entry.uid } };
  if (data.type === 'cyberware') {
    Object.assign(data.flags[MODULE_ID], { wikiLocal: local, wikiEm: entry.em || '', wikiCatalogId: entry.id || '', wikiNomeCatalogo: catalogName });
    if (s.isFoundational && local) data.name = `${catalogName} — ${cyberLocalName(local)}`;
  }
  return Array.from({ length: stacks ? 1 : Math.max(1, entry.qtd) }, () => foundry.utils.deepClone(data));
}

// Monta o equipamento como na wiki (sem janela e sem rolar):
//   1. as bases de cyberware no ator;
//   2. cada item no lugar escolhido: acessório na arma, programa e hardware no cyberdeck, opção de cyberware na base;
//      opções que exigem base só entram com um pai explícito; interno/externo/fashionware usam as bases do corpo;
//   3. a munição em cada arma, e a arma recarregada (o que entra no pente sai da munição).
// Os pais são achados pelo uid da wiki gravado em cada item: no Atualizar da wiki, o pai pode já estar na ficha.
const itemsByUid = (actor, uid) => actor.items.filter(item => item.getFlag(MODULE_ID, 'wikiUid') === uid);
const installedSomewhere = (actor, item) => (item.type === 'cyberware' && item.system.isInstalled) || actor.items.some(other => other.system.installedItems?.list?.includes(item.id));

function pendingCyberLocation(actor, entries) {
  const lines = [];
  for (const entry of entries) for (const item of itemsByUid(actor, entry.uid).filter(item => item.type === 'cyberware')) {
    const local = entry.local !== undefined ? cyberLocal(entry.local, item.system.type) : '';
    const installed = installedInActor(actor, item);
    if (entry.local !== undefined && local !== plannedLocal(item)) lines.push(`${item.name}: local → ${cyberLocalName(local)}`);
    if (entry.em === '-' || (!entry.em && !item.system.isFoundational && CYBER_NEEDS_BASE.has(item.system.type))) continue;
    if (local && !installed) lines.push(`${item.name}: ainda não instalado em ${cyberLocalName(local)}`);
    if (local && installed && actualCyberLocal(actor, item) !== local) lines.push(`${item.name}: instalado em outro local; ajuste pela ficha do Foundry para ${cyberLocalName(local)}`);
    if (entry.em) {
      const targets = referencedItems(actor, entry.em);
      const parents = parentItems(actor, item);
      if (targets.length !== 1 || parents.length !== 1 || parents[0].id !== targets[0].id) lines.push(`${item.name}: o encaixe escolhido continua pendente; ajuste pela ficha do Foundry`);
    }
  }
  return lines;
}

// O que da montagem da wiki ainda não está na ficha: tudo o que o assemble faria (a lista mostra exatamente o que o
// Atualizar da wiki vai aplicar). Acontece com atores importados antes da montagem existir, ou com algo tirado na mão.
function pendingAssembly(actor, entries) {
  const lines = [];
  const cyber = entries.filter(item => item.cyber).flatMap(entry => itemsByUid(actor, entry.uid).map(item => ({ entry, item }))).filter(({ item }) => item.type === 'cyberware');
  lines.push(...pendingCyberLocation(actor, entries));
  for (const { item } of cyber.filter(({ item }) => item.system.isFoundational && !actor.system.installedItems.list.includes(item.id))) lines.push(`${item.name}: instalar`);
  for (const { entry, item } of cyber.filter(({ entry, item }) => !entry.em && !item.system.isFoundational && !CYBER_NEEDS_BASE.has(item.system.type) && !installedSomewhere(actor, item))) lines.push(`${item.name}: instalar na base do corpo`);
  for (const entry of entries.filter(item => item.municao)) {
    const ammo = itemsByUid(actor, entry.municao)[0];
    if (!ammo) continue;
    for (const weapon of itemsByUid(actor, entry.uid).filter(item => item.type === 'weapon')) {
      if (!weapon.getInstalledItems?.('ammo')?.length) lines.push(`${weapon.name}: carregar com ${ammo.name}`);
    }
  }
  for (const entry of entries.filter(item => item.em)) {
    const targets = referencedItems(actor, entry.em);
    const target = targets.length === 1 ? targets[0] : null;
    if (!target) continue;
    for (const item of itemsByUid(actor, entry.uid)) if (!installedSomewhere(actor, item)) lines.push(`${item.name} → ${target.name}`);
  }
  return lines;
}

async function assemble(actor, entries) {
  const notes = [];
  const byUid = uid => itemsByUid(actor, uid);
  const cyber = entries.flatMap(entry => byUid(entry.uid)).filter(item => item.type === 'cyberware');
  const entryFor = item => entries.find(entry => entry.uid === item.getFlag(MODULE_ID, 'wikiUid'));
  const occupied = new Set();
  for (const item of actor.itemTypes.cyberware.filter(item => item.system.isFoundational && installedInActor(actor, item))) {
    const entry = entryFor(item);
    const local = entry?.local !== undefined ? cyberLocal(entry.local, item.system.type) : plannedLocal(item);
    if (local && occupied.has(local)) throw new Error(`Duas bases instaladas ocupariam ${cyberLocalName(local)}. Ajuste o local pela ficha antes de aplicar.`);
    if (local) occupied.add(local);
  }
  // Guarda mudanças de planejamento em peças da criação. Não move uma peça já instalada nem cobra Humanidade.
  const plans = [];
  for (const item of cyber) {
    const entry = entryFor(item);
    const update = { _id: item.id };
    if (entry.local !== undefined) {
      const local = cyberLocal(entry.local, item.system.type);
      if (local !== plannedLocal(item)) update[`flags.${MODULE_ID}.wikiLocal`] = local;
      const catalogName = item.getFlag(MODULE_ID, 'wikiNomeCatalogo') || item.name;
      if (item.system.isFoundational && (local || item.getFlag(MODULE_ID, 'wikiNomeCatalogo'))) {
        const name = local ? `${catalogName} — ${cyberLocalName(local)}` : catalogName;
        if (item.name !== name) update.name = name;
        if (!item.getFlag(MODULE_ID, 'wikiNomeCatalogo')) update[`flags.${MODULE_ID}.wikiNomeCatalogo`] = catalogName;
      }
    }
    if (entry.em !== undefined && entry.em !== item.getFlag(MODULE_ID, 'wikiEm')) update[`flags.${MODULE_ID}.wikiEm`] = entry.em;
    if (Object.keys(update).length > 1) plans.push(update);
  }
  if (plans.length) await actor.updateEmbeddedDocuments('Item', plans);
  const bases = cyber.filter(item => item.system.isFoundational && !actor.system.installedItems.list.includes(item.id));
  for (const base of bases) {
    const local = plannedLocal(base);
    const same = local && actor.itemTypes.cyberware.some(item => item.id !== base.id && item.system.isFoundational && installedInActor(actor, item) && actualCyberLocal(actor, item) === local);
    const duplicates = local && cyber.filter(item => item.system.isFoundational && plannedLocal(item) === local).length > 1;
    if (same || duplicates) { notes.push(`${base.name}: já existe outra base em ${cyberLocalName(local)}; ficou sem instalar.`); continue; }
    await actor.installItems([base]);
  }

  for (const entry of entries.filter(item => item.em)) {
    const targets = referencedItems(actor, entry.em);
    const target = targets.length === 1 ? targets[0] : null;
    const items = byUid(entry.uid).filter(item => item.type !== 'cyberware' && !installedSomewhere(actor, item));
    if (!target || !items.length) continue;
    const ok = await target.installItems(items).catch(() => false);
    if (ok === false) notes.push(`${items[0].name}: não coube em ${target.name}; ficou no inventário.`);
  }
  const pending = new Set(cyber.filter(item => !item.system.isFoundational && !installedSomewhere(actor, item)));
  // Repete para permitir opção dentro de opção (por exemplo, chip no socket), sem depender da ordem dos rows.
  for (let pass = 0; pass < cyber.length && pending.size; pass++) {
    let progress = false;
    for (const item of [...pending]) {
      const entry = entryFor(item);
      // O frontend exporta em='' tanto para "comprar solto" quanto para uma base que ficou indefinida. Um lado
      // planejado não autoriza escolher o pai. Só as bases nativas do corpo têm instalação automática sem UID.
      if (entry.em === '-' || (!entry.em && CYBER_NEEDS_BASE.has(item.system.type))) { pending.delete(item); continue; }
      const local = plannedLocal(item);
      let targets = entry.em && entry.em !== '-' ? referencedItems(actor, entry.em) : actor.itemTypes.cyberware.filter(base => base.system.isFoundational && base.system.type === item.system.type);
      targets = targets.filter(base => base.id !== item.id && base.type === 'cyberware' && base.system.type === item.system.type && installedInActor(actor, base)
        && (!local || actualCyberLocal(actor, base) === local) && base.availableInstallSlots() >= item.system.size);
      if (targets.length !== 1) continue;
      const ok = await targets[0].installItems([item]).catch(() => false);
      if (ok === false) continue;
      pending.delete(item);
      progress = true;
    }
    if (!progress) break;
  }
  for (const item of pending) {
    const entry = entryFor(item);
    notes.push(`${item.name}: ${entry.em && entry.em !== '-' ? 'o encaixe escolhido não está disponível' : 'escolha uma base única com espaço'}${plannedLocal(item) ? ` em ${cyberLocalName(plannedLocal(item))}` : ''}; ficou no inventário, sem instalar.`);
  }
  // Uma intenção nova nunca desinstala silenciosamente uma peça que o mestre já instalou na mesa.
  notes.push(...pendingCyberLocation(actor, entries).filter(line => /instalado em outro local|ajuste pela ficha/.test(line)));

  for (const entry of entries.filter(item => item.municao)) {
    const ammo = byUid(entry.municao)[0];
    if (!ammo) continue;
    for (const weapon of byUid(entry.uid).filter(item => item.type === 'weapon')) {
      if (weapon.getInstalledItems?.('ammo')?.length) continue; // já carregada
      const ok = await weapon.installItems([ammo]).catch(() => false);
      if (ok === false) { notes.push(`${weapon.name}: não consegui carregar ${ammo.name}.`); continue; }
      await weapon.reload().catch(error => notes.push(`${weapon.name}: não consegui recarregar (${error.message}).`));
    }
  }
  return notes;
}

// ---------------- Perícias e Role ----------------
const specialPacks = {
  Language: 'cyberpunk-red-core.core_skills-languages', Science: 'cyberpunk-red-core.core_skills-science',
  'Martial Arts': 'cyberpunk-red-core.core_skills-martial-arts', 'Play Instrument': 'cyberpunk-red-core.core_skills-play-instrument'
};
async function applySkills(actor, skills, home) {
  const updates = [];
  const creates = [];
  const missing = [];
  for (const skill of skills) {
    const existing = actor.items.find(item => item.type === 'skill' && item.name === skill.nome);
    if (existing) {
      const update = { _id: existing.id, 'system.level': skill.nivel };
      if (skill.nome === 'Local Expert (Your Home)' && home) update['system.description.value'] = `<p>Bairro: <b>${esc(home)}</b>.</p>`;
      updates.push(update);
    } else if (skill.base && specialPacks[skill.base]) {
      const data = await fromPack(specialPacks[skill.base], skill.nome);
      if (data) { data.system.level = skill.nivel; creates.push(data); } else missing.push(skill.nome);
    } else missing.push(skill.nome);
  }
  if (updates.length) await actor.updateEmbeddedDocuments('Item', updates);
  if (creates.length) await actor.createEmbeddedDocuments('Item', creates);
  return missing.map(name => `Perícia ${name} não existe no Foundry.`);
}
const ROLE_IDS = new Set(['rockerboy', 'solo', 'netrunner', 'tech', 'medtech', 'media', 'exec', 'lawman', 'fixer', 'nomad']);
const changingRoles = new Set();
const canonicalRole = value => {
  const name = String(value || '').trim().toLowerCase();
  return ROLE_IDS.has(name) ? name : ({ face: 'rockerboy', corpo: 'exec' }[name] || '');
};
const roleId = role => canonicalRole(role?.getFlag?.(MODULE_ID, 'wikiRole')) || canonicalRole(role?.id)
  || canonicalRole(role?.foundry?.nome) || canonicalRole(role?.nome) || canonicalRole(role?.name);

function rolesOfResult(result) {
  const roles = Array.isArray(result.roles) && result.roles.length ? result.roles : [result.role].filter(Boolean);
  if (!roles.length || roles.length > 2) throw new Error('Escolha uma ou duas Roles na wiki antes de importar.');
  const ids = new Set();
  const normalized = roles.map(role => {
    const id = roleId(role);
    const rank = role.rank ?? 4; // personagens antigos não mandavam o Rank
    if (!id || ids.has(id)) throw new Error('As Roles da wiki precisam ser válidas e diferentes.');
    if (!Number.isInteger(rank) || rank < 1 || rank > 10) throw new Error(`${role.nome || id}: o Rank precisa estar entre 1 e 10.`);
    ids.add(id);
    return { ...role, id, rank };
  });
  const primary = roleId(result.role) || normalized[0].id;
  if (!ids.has(primary)) throw new Error('A Role principal não está na lista de Roles da wiki.');
  return normalized.sort((a, b) => Number(b.id === primary) - Number(a.id === primary));
}

function roleAbilities(role, system) {
  const ranks = new Map((role.habilidades || []).map(entry => [entry.nome, entry.rank]));
  const abilities = system.abilities || [];
  for (const [name, rank] of ranks) {
    if (!Number.isInteger(rank) || rank < 0 || !abilities.some(ability => ability.name === name)) {
      throw new Error(`${role.nome || role.id}: a sub-habilidade ${name} não pode ser aplicada nesta ficha.`);
    }
  }
  return abilities.map(ability => ranks.has(ability.name) ? { ...ability, rank: ranks.get(ability.name) } : ability);
}

// Confere compêndios e sub-habilidades antes de criar ou mudar qualquer documento. Uma Role manual que já existe é
// reaproveitada pelo nome, mas não recebe a marca do importador: só as criadas por ele podem ser retiradas depois.
async function planRoles(actor, result) {
  const roles = rolesOfResult(result);
  const existing = actor?.itemTypes.role || [];
  const entries = [];
  const lines = [];
  for (const role of roles) {
    const item = existing.find(item => item.getFlag(MODULE_ID, 'wikiRole') === role.id)
      || existing.find(item => roleId(item) === role.id);
    if (item) {
      const abilities = roleAbilities(role, item.system);
      const update = { _id: item.id, 'system.rank': role.rank, 'system.abilities': abilities };
      const changed = item.system.rank !== role.rank || JSON.stringify(item.system.abilities || []) !== JSON.stringify(abilities);
      if (item.system.rank !== role.rank) lines.push(`${item.name}: Rank ${item.system.rank} → ${role.rank}`);
      for (const ability of abilities) {
        const before = (item.system.abilities || []).find(entry => entry.name === ability.name);
        if (before?.rank !== ability.rank) lines.push(`${item.name} · ${ability.name}: ${before?.rank ?? 0} → ${ability.rank}`);
      }
      entries.push({ role, item, ...(changed ? { update } : {}) });
      continue;
    }
    if (!role.foundry) throw new Error(`${role.nome || role.id}: a wiki não informou o compêndio da Role.`);
    const data = await fromPack(role.foundry.pack, role.foundry.nome);
    if (!data || data.type !== 'role') throw new Error(`Role ${role.foundry.nome} não encontrada em ${role.foundry.pack}.`);
    data.system.rank = role.rank;
    data.system.abilities = roleAbilities(role, data.system);
    if (role.especializacao) {
      data.system.bonuses = [...(data.system.bonuses || []), ...role.especializacao.pericias.filter(name => !(data.system.bonuses || []).some(b => b.name === name)).map(name => ({ name }))];
      data.system.description.value += `<p><b>Especialização:</b> ${esc(role.especializacao.nome)}.</p>`;
    }
    data.flags = { ...(data.flags || {}), [MODULE_ID]: { ...data.flags?.[MODULE_ID], wikiRole: role.id } };
    entries.push({ role, data });
    lines.push(`Acrescentar Role ${data.name}, Rank ${role.rank}`);
  }
  const removed = existing.filter(item => item.getFlag(MODULE_ID, 'wikiRole') && !roles.some(role => role.id === item.getFlag(MODULE_ID, 'wikiRole')));
  for (const item of removed) lines.push(`Retirar Role da wiki: ${item.name}`);
  const net = entries.find(entry => entry.role.id === 'netrunner');
  if (actor && net?.item && actor.system.roleInfo?.activeNetRole !== net.item.id) lines.push(`Usar ${net.item.name} para as rolagens de Interface`);
  return { entries, removed, lines, primary: roles[0].id };
}

async function applyRoles(actor, plan) {
  if (changingRoles.has(actor.id)) throw new Error('Já há uma atualização de Roles em andamento neste personagem.');
  const created = [];
  const previous = plan.entries.filter(entry => entry.update).map(entry => ({ _id: entry.item.id,
    'system.rank': entry.item.system.rank, 'system.abilities': foundry.utils.deepClone(entry.item.system.abilities || []) }));
  const removed = plan.removed.map(item => item.toObject());
  const active = { 'system.roleInfo.activeRole': actor.system.roleInfo?.activeRole || '', 'system.roleInfo.activeNetRole': actor.system.roleInfo?.activeNetRole || '' };
  changingRoles.add(actor.id);
  clearTimeout(syncTimers.get(actor.id));
  syncTimers.delete(actor.id);
  try {
    for (const entry of plan.entries.filter(entry => entry.data)) {
      const [item] = await actor.createEmbeddedDocuments('Item', [entry.data]);
      if (!item) throw new Error(`Não consegui criar a Role ${entry.data.name}.`);
      created.push(item.id);
    }
    const updates = plan.entries.filter(entry => entry.update).map(entry => entry.update);
    if (updates.length) await actor.updateEmbeddedDocuments('Item', updates);
    if (plan.removed.length) await actor.deleteEmbeddedDocuments('Item', plan.removed.map(item => item.id));
    const primary = actor.itemTypes.role.find(item => roleId(item) === plan.primary);
    const net = actor.itemTypes.role.find(item => roleId(item) === 'netrunner' || /interface/i.test(item.system.mainRoleAbility || ''));
    await actor.update({ 'system.roleInfo.activeRole': primary?.name || '', 'system.roleInfo.activeNetRole': net?.id || '' });
    // Um hook pode recusar uma criação/atualização sem lançar erro. Confere o que ficou no ator antes de sincronizar.
    for (const entry of plan.entries) {
      const item = actor.itemTypes.role.find(item => item.getFlag(MODULE_ID, 'wikiRole') === entry.role.id)
        || actor.itemTypes.role.find(item => roleId(item) === entry.role.id);
      if (!item || item.system.rank !== entry.role.rank || (entry.role.habilidades || []).some(ability =>
        !item.system.abilities?.some(current => current.name === ability.nome && current.rank === ability.rank))) {
        throw new Error(`A Role ${entry.role.nome || entry.role.id} não ficou igual à da wiki.`);
      }
    }
    if (plan.removed.some(item => actor.items.get(item.id))) throw new Error('O Foundry não retirou a antiga Role da wiki.');
    if (actor.system.roleInfo.activeRole !== primary?.name || actor.system.roleInfo.activeNetRole !== (net?.id || '')) {
      throw new Error('O Foundry não confirmou a seleção das Roles.');
    }
  } catch (error) {
    // O Foundry não tem uma transação para todos os documentos. Tenta voltar as Roles ao estado anterior e deixa a
    // importação pendente se algum passo falhou; nenhuma falha vira um resultadoHash sincronizado.
    const failures = [];
    const undo = async fn => { try { await fn(); } catch (error) { failures.push(error.message); } };
    const fresh = created.filter(id => actor.items.get(id));
    if (fresh.length) await undo(() => actor.deleteEmbeddedDocuments('Item', fresh));
    const missing = removed.filter(item => !actor.items.get(item._id));
    if (missing.length) await undo(() => actor.createEmbeddedDocuments('Item', missing, { keepId: true }));
    const updates = previous.filter(item => actor.items.get(item._id));
    if (updates.length) await undo(() => actor.updateEmbeddedDocuments('Item', updates));
    await undo(() => actor.update(active));
    throw new Error(`Não foi possível aplicar as Roles: ${error.message}${failures.length ? ` Confira a ficha: também houve falha ao desfazer (${failures.join('; ')}).` : ' As Roles anteriores foram restauradas.'}`);
  } finally {
    changingRoles.delete(actor.id);
  }
}

// Veículos da família do Nomad (Oficina da Família), com os upgrades instalados em cada um.
async function addVehicles(actor, vehicles = []) {
  const notes = [];
  const family = '<p><b>Veículo da família</b> (Oficina da Família, habilidade Moto): só um fica com o Nomad de cada vez, trocado de um dia para o outro. Destruído, a família conserta em uma semana, por 500eb.</p>';
  for (const entry of vehicles) {
    const data = await fromPack(entry.foundry.pack, entry.foundry.nome).catch(() => null);
    if (!data) { notes.push(`${entry.nome}: não achei no compêndio ${entry.foundry.pack}.`); continue; }
    data.system.description = { ...(data.system.description || {}), value: family + (data.system.description?.value || '') };
    data.flags = { ...(data.flags || {}), [MODULE_ID]: { wikiUid: entry.uid, familia: true } };
    const [vehicle] = await actor.createEmbeddedDocuments('Item', [data]);
    const upgrades = [];
    for (const upgrade of entry.upgrades || []) {
      const item = await fromPack(upgrade.foundry.pack, upgrade.foundry.nome).catch(() => null);
      if (!item) { notes.push(`${upgrade.nome}: não achei no compêndio ${upgrade.foundry.pack}.`); continue; }
      item.flags = { ...(item.flags || {}), [MODULE_ID]: { wikiUid: upgrade.uid } };
      upgrades.push(item);
    }
    if (!upgrades.length) continue;
    const created = await actor.createEmbeddedDocuments('Item', upgrades);
    const installed = await vehicle.installItems(created).catch(error => { notes.push(`${vehicle.name}: os upgrades ficaram no inventário (${error.message}).`); return null; });
    if (installed === false) notes.push(`${vehicle.name}: os upgrades ficaram no inventário, sem instalar.`);
  }
  return notes;
}

// ---------------- Retrato ----------------
// O retrato da wiki: a imagem enviada (servida pela wiki) ou um link https colado pelo jogador.
// A imagem é copiada para a pasta do mundo: os jogadores, que não falam com a wiki, também veem.
// Um link de fora que não deixa baixar (sem CORS) entra como link, se terminar em extensão de imagem.
const portraitOf = doc => doc.retrato || (/^https:\/\/[^\s"'<>]+$/.test(doc.retratoLink || '') ? doc.retratoLink : '');
const IMAGE_EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' };
const Picker = () => foundry.applications?.apps?.FilePicker?.implementation ?? FilePicker;

async function ensureFolder(folder) {
  try { await Picker().browse('data', folder); } catch { await Picker().createDirectory('data', folder); }
}
async function copyPortrait(doc, source) {
  const url = /^https:\/\//.test(source) ? source : `${wikiUrl()}/${source.replace(/^\/+/, '')}`;
  // O retrato enviado só sai para quem é da campanha (o mestre, aqui): vai o cookie da wiki junto. Link de fora, sem.
  const response = await fetch(url, { cache: 'no-store', ...(url.startsWith(`${wikiUrl()}/`) ? { credentials: 'include' } : {}) });
  if (!response.ok) throw new Error(`a imagem respondeu ${response.status}`);
  const blob = await response.blob();
  const ext = IMAGE_EXT[blob.type];
  if (!ext) throw new Error(`não é uma imagem (${blob.type || 'sem tipo'})`);
  const folder = `worlds/${game.world.id}/retratos-wiki`;
  await ensureFolder(folder);
  // Nome novo a cada troca: o navegador de ninguém fica com a imagem antiga no cache.
  const name = `${doc.id}-${Date.now().toString(36)}.${ext}`;
  const result = await Picker().upload('data', folder, new File([blob], name, { type: blob.type }), {}, { notify: false });
  if (!result?.path) throw new Error('o Foundry não gravou a imagem');
  return result.path;
}
// Põe o retrato na ficha e no token (o do protótipo e os já colocados no mapa). Devolve o que aplicou e os avisos.
async function applyPortrait(actor, doc) {
  const source = portraitOf(doc);
  if (!source) return { applied: '', notes: [] };
  let img;
  try {
    img = await copyPortrait(doc, source);
  } catch (error) {
    const external = /^https:\/\//.test(source);
    if (!external || !/\.(png|jpe?g|webp|gif|avif|svg)(\?.*)?$/i.test(source)) return { applied: '', notes: [`Retrato: não consegui trazer a imagem (${error.message}). Ponha à mão na ficha.`] };
    img = source;
  }
  try {
    await actor.update({ img, 'prototypeToken.texture.src': img });
    for (const token of actor.getDependentTokens?.({ linked: true }) || []) await token.update({ 'texture.src': img });
  } catch (error) {
    return { applied: '', notes: [`Retrato: o Foundry recusou a imagem (${error.message}).`] };
  }
  return { applied: source, notes: [] };
}

// ---------------- Moradia e estilo de vida ----------------
// Moradia, estilo de vida, Trauma Team e moda nos campos de Estilo de vida da ficha.
// A moda vai em `fashion.desription`: o sistema escreveu o nome do campo assim (v0.92.4); `description` fica
// junto para quando corrigirem.
function lifestyleUpdate(home = {}) {
  const fashion = home.moda ? `<p><b>${esc(home.moda.nome)}:</b> ${esc(home.moda.desc)}</p>` : '';
  return {
    'system.lifestyle.housing': { cost: home.aluguel || 0, description: home.moradia || '' },
    'system.lifestyle.lifeStyle': { cost: home.custoEstilo || 0, description: home.estilo || '' },
    'system.lifestyle.traumaTeam': { cost: home.traumaTeam?.custo || 0, description: home.traumaTeam?.nome || '' },
    'system.lifestyle.fashion': { desription: fashion, description: fashion }
  };
}

// ---------------- Crossover ----------------
// O mestre levou o personagem para outra campanha na wiki (Mover). O mundo da campanha antiga manda a ficha do ator
// para a wiki (uma vez, sozinho, nos avisos) e para de mandar a ficha da mesa; o mundo da campanha nova cria o ator
// igualzinho, com tudo o que aconteceu na mesa antiga.
async function sendMovedAway(list, campaign) {
  const moved = (list.personagens || []).filter(item => !item.publico && item.estadoFoundry === 'outra-mesa' && item.foundry?.campanha === campaign.id && !item.transferencia);
  for (const item of moved) {
    const actor = actorOf(item.id);
    if (!actor) continue;
    try {
      await wikiFetch(`/api/personagens/${item.id}/ator`, { method: 'PUT', body: { campanha: campaign.id, ator: actor.toObject() } });
      await actor.setFlag(MODULE_ID, 'saiu', { para: item.campanha, quando: new Date().toISOString() });
      ui.notifications.info(`Wiki: ${actor.name} foi para outra campanha. A ficha deste mundo foi para a wiki, e o mundo da campanha nova importa com tudo. O ator fica aqui, parado.`);
    } catch (error) {
      console.warn(`${MODULE_ID} | crossover de ${actor.name}:`, error.message);
    }
  }
}
// O ator como veio do mundo antigo. Os ids dos itens ficam (o cyberware instalado e a munição na arma apontam para
// eles); o dono é escolhido aqui (os jogadores de cada mundo são outros); o retrato é copiado de novo para este mundo.
async function importTransferred(doc, transfer, ownerId, campaign) {
  const data = foundry.utils.deepClone(transfer.ator);
  delete data._id;
  delete data.folder;
  data.ownership = { default: 0, ...(ownerId ? { [ownerId]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER } : {}) };
  const previous = data.flags?.[MODULE_ID]?.wiki || {};
  if (data.flags?.[MODULE_ID]) delete data.flags[MODULE_ID].saiu;
  foundry.utils.setProperty(data, `flags.${MODULE_ID}.wiki`, { ...previous, id: doc.id, versao: doc.versao, importado: new Date().toISOString(), veioDe: transfer.de });
  // Com `system`, o create do sistema não acrescenta as perícias e o cyberware de base (o ator já tem).
  const created = await CONFIG.Actor.documentClass.create(data, { keepEmbeddedIds: true });
  const actor = game.actors.get(created.id);
  const notes = [`Veio do mundo da campanha antiga com tudo o que aconteceu lá (ficha mandada em ${new Date(transfer.quando).toLocaleString('pt-BR')}).`];
  if (portraitOf(doc)) {
    const portrait = await applyPortrait(actor, doc);
    notes.push(...portrait.notes);
    if (portrait.applied) await actor.setFlag(MODULE_ID, 'wiki', { ...actor.getFlag(MODULE_ID, 'wiki'), retrato: portrait.applied });
  }
  const link = actor.getFlag(MODULE_ID, 'wiki');
  await wikiFetch(`/api/personagens/${doc.id}/foundry`, { method: 'PUT', body: { ator: actor.id, nomeAtor: actor.name, versao: doc.versao, entregues: link.entregues || [], ...(campaign?.id ? { campanha: campaign.id } : {}) } });
  await wikiFetch(`/api/personagens/${doc.id}/ator`, { method: 'DELETE' }).catch(() => null);
  await syncActor(actor).catch(() => null);
  return { actor, notes };
}

// ---------------- Importar ----------------
async function importCharacter(id, ownerId, campaign = undefined) {
  if (campaign === undefined) campaign = await tableCampaign();
  const { personagem: doc } = await wikiFetch(`/api/personagens/${id}`);
  if (campaign?.id && doc.campanha && doc.campanha !== campaign.id) throw new Error(`${doc.nome || 'Este personagem'} é de outra campanha da wiki: importe no mundo dela.`);
  // Veio de outra campanha: com a ficha que o mundo antigo mandou, o ator vem como estava lá.
  if (doc.estadoFoundry === 'outra-mesa') {
    const transfer = await wikiFetch(`/api/personagens/${id}/ator`).catch(() => null);
    if (transfer?.ator) return importTransferred(doc, transfer, ownerId, campaign);
  }
  const r = doc.resultado;
  if (!r) throw new Error('Este personagem ainda não tem ficha pronta: abra no criador da wiki e deixe salvar.');
  const rolePlan = await planRoles(null, r);
  const notes = [];

  const ownership = { default: 0 };
  if (ownerId) ownership[ownerId] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
  // A classe do sistema (CONFIG.Actor.documentClass) é que põe as perícias e os encaixes de cyberware num personagem novo;
  // Actor.create na classe base pularia isso. O create do sistema também exige a lista `items`.
  const ActorClass = CONFIG.Actor.documentClass;
  const newActor = await ActorClass.create({ name: doc.nome || 'Sem nome', type: 'character', items: [], ownership });
  const actor = game.actors.get(newActor.id);

  // STATs e derivados. A EMP atual já vem descontada da Humanidade.
  const stat = key => Number(r.stats[key]) || 1;
  await actor.update({
    'system.stats.int.value': stat('INT'), 'system.stats.ref.value': stat('REF'), 'system.stats.dex.value': stat('DEX'), 'system.stats.tech.value': stat('TECH'),
    'system.stats.cool.value': stat('COOL'), 'system.stats.will.value': stat('WILL'), 'system.stats.move.value': stat('MOVE'), 'system.stats.body.value': stat('BODY'),
    'system.stats.luck.value': stat('LUCK'), 'system.stats.luck.max': stat('LUCK'), 'system.stats.emp.max': stat('EMP'), 'system.stats.emp.value': r.humanidade.emp,
    'system.derivedStats.hp.max': r.derivados.hp, 'system.derivedStats.hp.value': r.derivados.hp,
    'system.derivedStats.humanity.max': r.humanidade.max, 'system.derivedStats.humanity.value': r.humanidade.max
  });
  notes.push(...await applySkills(actor, r.pericias, r.casa));
  try {
    await applyRoles(actor, rolePlan);
  } catch (error) {
    try { await actor.delete(); } catch (cleanup) { throw new Error(`${error.message} O ator incompleto ficou na lista: ${cleanup.message}`); }
    throw error;
  }

  // Itens, agrupados por compêndio.
  const datas = [];
  for (const entry of r.itens) {
    const data = await itemData(entry).catch(() => null);
    if (data) datas.push(...data); else notes.push(`${entry.nome}: não achei no compêndio ${entry.foundry?.pack}.`);
  }
  const created = await actor.createEmbeddedDocuments('Item', datas);
  notes.push(...await assemble(actor, r.itens));
  notes.push(...await addVehicles(actor, r.veiculos));

  // Humanidade: o valor que a wiki calculou; a máxima o sistema recalcula pelo cyberware instalado.
  await actor.update({ 'system.derivedStats.humanity.value': r.humanidade.atual });
  await actor.setMaxHumanity();

  const description = [
    doc.aparencia ? `<p>${esc(doc.aparencia)}</p>` : '',
    doc.notas ? `<p>${esc(doc.notas)}</p>` : '',
    `<p><i>Criado na wiki (${rolePlan.entries.map(entry => `${esc(entry.role.nome)} ${entry.role.rank}`).join(' / ')}, ${esc(doc.apelido || '')}). Importado em ${new Date().toLocaleDateString('pt-BR')}.</i></p>`
  ].join('');
  await actor.update({
    'system.lifepath': r.lifepath,
    ...lifestyleUpdate(r.moradia),
    'system.information.alias': doc.apelido || '',
    'system.information.description': description
  });
  actor.setLedgerProperty('wealth', r.dinheiro.saldo, 'Dinheiro inicial (criador da wiki)');
  const portrait = await applyPortrait(actor, doc);
  notes.push(...portrait.notes);

  // Entregues: os itens e os veículos da família (com os upgrades), para o Atualizar da wiki não trazer de novo.
  const delivered = [...r.itens.map(item => item.uid), ...(r.veiculos || []).flatMap(vehicle => [vehicle.uid, ...(vehicle.upgrades || []).map(upgrade => upgrade.uid)])];
  await actor.setFlag(MODULE_ID, 'wiki', { id: doc.id, versao: doc.versao, entregues: delivered, importado: new Date().toISOString(), retrato: portrait.applied, rolePrincipal: rolePlan.primary });
  if (doc.estadoFoundry === 'outra-mesa') notes.push('Veio de outra campanha, mas a ficha da mesa antiga não tinha chegado: o ator saiu como foi criado na wiki.');
  await wikiFetch(`/api/personagens/${doc.id}/foundry`, { method: 'PUT', body: { ator: actor.id, nomeAtor: actor.name, versao: doc.versao, entregues: delivered, ...(campaign?.id ? { campanha: campaign.id } : {}) } });
  // A wiki passa a mostrar a ficha da mesa logo depois da importação.
  await syncActor(actor).catch(() => null);
  return { actor, notes };
}

// Estado de cada personagem na wiki (estadoFoundry): os enviados ao mestre e ainda não levados ao Foundry, e os que
// vieram de outra campanha (outra-mesa).
const WAITING = ['enviado', 'enviado-mudou', 'avisado', 'outra-mesa'];
const STATE_LABELS = { novo: 'não enviado', enviado: 'enviado, esperando', 'enviado-mudou': 'enviado, esperando', importado: 'já importado', mudou: 'já importado, mudou na wiki', avisado: 'já importado, mudou na wiki', 'outra-mesa': 'veio de outra campanha' };
const stateLabel = item => (item.estadoFoundry === 'outra-mesa' ? `veio de outra campanha${item.transferencia ? ', com a ficha da mesa antiga' : ', sem a ficha da mesa antiga'}` : STATE_LABELS[item.estadoFoundry] || (item.foundry ? 'já importado' : 'não enviado'));
// O ator deste mundo que veio deste personagem (outro mundo pode ter importado o mesmo).
const actorOf = id => game.actors.find(actor => actor.getFlag(MODULE_ID, 'wiki')?.id === id) || null;
// O jogador do Foundry com o mesmo nome do dono na wiki, se houver.
const sameName = (a, b) => String(a || '').trim().toLocaleLowerCase('pt-BR') === String(b || '').trim().toLocaleLowerCase('pt-BR');

export async function importarDaWiki(preselect = '') {
  if (!game.user.isGM) return ui.notifications.warn('Só o mestre importa personagens da wiki.');
  let list;
  try { list = await wikiFetch('/api/personagens'); } catch (error) { return ui.notifications.error(error.message); }
  if (list.papel !== 'mestre') return ui.notifications.error(notGmMessage());
  // Só os da campanha deste mundo; os enviados (e os que vieram de outra campanha) primeiro.
  const campaign = await tableCampaign();
  const characters = (list.personagens || []).filter(item => !item.publico && ofTable(item, campaign)).sort((a, b) => Number(WAITING.includes(b.estadoFoundry)) - Number(WAITING.includes(a.estadoFoundry)));
  if (!characters.length) return ui.notifications.info(campaign?.id ? `Nenhum personagem de ${campaign.nome} na wiki ainda.` : 'Nenhum personagem na wiki ainda.');
  const chosen = characters.find(item => item.id === preselect) || characters[0];
  const players = game.users.filter(user => !user.isGM);
  const ownerOf = item => (players.find(user => sameName(user.name, item.donoNome)) || {}).id || '';
  const campaignName = id => ((campaign?.lista || []).find(item => item.id === id) || {}).nome || id;
  const which = campaign?.id ? `<p class="notes">Campanha da wiki deste mundo: <b>${esc(campaign.nome)}</b>.</p>`
    : campaign?.erro ? `<p class="notes cpr2077-chat-note warning">${esc(unresolvedHelp(campaign))} Por enquanto, a lista tem os personagens de todas as campanhas.</p>` : '';
  const content = `<form class="cpr2077-wiki">${which}
    <div class="form-group"><label>Personagem</label><select name="id">${characters.map(item => `<option value="${item.id}"${item === chosen ? ' selected' : ''}>${campaign?.erro ? `[${esc(campaignName(item.campanha))}] ` : ''}${esc(item.nome || 'Sem nome')}${item.apelido ? ` "${esc(item.apelido)}"` : ''} · ${esc(item.donoNome || 'sem dono')} · ${esc(stateLabel(item))}</option>`).join('')}</select></div>
    <div class="form-group"><label>Dono no Foundry</label><select name="owner"><option value="">Só o mestre</option>${players.map(user => `<option value="${user.id}"${user.id === ownerOf(chosen) ? ' selected' : ''}>${esc(user.name)}</option>`).join('')}</select></div>
    <p class="notes">Cria um ator novo com STATs, perícias, Role, equipamento, cyberware instalado, Lifepath, dinheiro e retrato (na ficha e no token). Para um ator que já veio da wiki, use <b>Atualizar da wiki</b> no topo da ficha dele.</p>
    <p class="notes">Quem veio de outra campanha chega com a ficha da mesa antiga, se o mundo dela já mandou (ele manda sozinho, na primeira vez que abrir depois da mudança). Sem ela, o ator sai como foi criado na wiki.</p></form>`;
  return Dialog.prompt({
    title: 'Importar personagem da wiki', content, label: 'Importar',
    // Trocar o personagem escolhe o jogador do Foundry com o mesmo nome do dono na wiki.
    render: html => {
      const form = $(html).find('form')[0];
      form?.id?.addEventListener('change', () => { const item = characters.find(entry => entry.id === form.id.value); if (item) form.owner.value = ownerOf(item); });
    },
    callback: async html => {
      const form = html[0].querySelector('form');
      try {
        ui.notifications.info('Importando da wiki…');
        const { actor, notes } = await importCharacter(form.id.value, form.owner.value, campaign);
        if (notes.length) ChatMessage.create({ whisper: [game.user.id], content: `<p><b>${esc(actor.name)}</b> importado da wiki. Avisos:</p><ul>${notes.map(note => `<li>${esc(note)}</li>`).join('')}</ul>` });
        ui.notifications.info(`${actor.name} importado da wiki.`);
        actor.sheet.render(true);
      } catch (error) {
        console.error(`${MODULE_ID} | importar da wiki`, error);
        ui.notifications.error(`Importar da wiki: ${error.message}`);
      }
    },
    rejectClose: false
  });
}

// ---------------- Atualizar da wiki ----------------
// Mostra o que mudou na wiki desde a importação e aplica o que o mestre marcar. Só retira Roles criadas por este
// importador e removidas da wiki, com a retirada explícita na revisão; outros itens e Roles manuais ficam.
export async function atualizarDaWiki(actor) {
  const link = actor?.getFlag(MODULE_ID, 'wiki');
  if (!link) return ui.notifications.warn('Este ator não veio da wiki.');
  let doc;
  try { doc = (await wikiFetch(`/api/personagens/${link.id}`)).personagem; } catch (error) { return ui.notifications.error(error.message); }
  // Depois de um crossover, a ficha é do mundo da campanha nova.
  const campaign = await tableCampaign();
  if (campaign?.id && doc.campanha && doc.campanha !== campaign.id) return ui.notifications.warn(`${actor.name} agora é de outra campanha na wiki: a ficha dele é do mundo dela.`);
  const r = doc.resultado || {};
  let rolePlan;
  try { rolePlan = await planRoles(actor, r); } catch (error) { return ui.notifications.error(error.message); }
  const roleChanges = rolePlan.lines;
  const keys = { INT: 'int', REF: 'ref', DEX: 'dex', TECH: 'tech', COOL: 'cool', WILL: 'will', LUCK: 'luck', MOVE: 'move', BODY: 'body', EMP: 'emp' };
  const statChanges = Object.entries(keys).filter(([key, field]) => (field === 'emp' ? actor.system.stats.emp.max : actor.system.stats[field].value) !== r.stats?.[key]).map(([key, field]) => `${key} ${field === 'emp' ? actor.system.stats.emp.max : actor.system.stats[field].value} → ${r.stats[key]}`);
  const skillChanges = (r.pericias || []).filter(skill => { const item = actor.items.find(i => i.type === 'skill' && i.name === skill.nome); return !item || item.system.level !== skill.nivel; }).map(skill => `${skill.nome} → ${skill.nivel}`);
  const newItems = (r.itens || []).filter(item => !(link.entregues || []).includes(item.uid));
  const lifepathChanged = Object.entries(r.lifepath || {}).some(([field, text]) => (actor.system.lifepath?.[field] || '') !== text);
  // Retrato novo na wiki (ou ator importado antes do retrato). Tirar o retrato na wiki não apaga a imagem da ficha.
  const portraitChanged = Boolean(portraitOf(doc)) && portraitOf(doc) !== (link.retrato || '');
  // Moradia, estilo de vida e Trauma Team: compara custo e descrição com a ficha.
  const home = lifestyleUpdate(r.moradia);
  const ls = actor.system.lifestyle || {};
  const homeLines = [['housing', 'Moradia'], ['lifeStyle', 'Estilo de vida'], ['traumaTeam', 'Trauma Team']]
    .filter(([key]) => (ls[key]?.cost || 0) !== home[`system.lifestyle.${key}`].cost || (ls[key]?.description || '') !== home[`system.lifestyle.${key}`].description)
    .map(([key, label]) => `${label}: ${home[`system.lifestyle.${key}`].description || '—'} (${home[`system.lifestyle.${key}`].cost}eb/mês)`);
  const synced = delivered => wikiFetch(`/api/personagens/${doc.id}/foundry`, { method: 'PUT', body: { ator: actor.id, nomeAtor: actor.name, versao: doc.versao, entregues: delivered, ...(campaign?.id ? { campanha: campaign.id } : {}) } });
  // Nada que este botão aplique (a mudança foi em moradia ou dinheiro, por exemplo): a wiki para de mostrar "mudou".
  const mountLines = pendingAssembly(actor, (r.itens || []).filter(item => (link.entregues || []).includes(item.uid)));
  if (!statChanges.length && !skillChanges.length && !newItems.length && !roleChanges.length && !lifepathChanged && !portraitChanged && !homeLines.length && !mountLines.length) {
    await actor.setFlag(MODULE_ID, 'wiki', { ...link, rolePrincipal: rolePlan.primary });
    await synced(link.entregues || []);
    return ui.notifications.info('Nada para aplicar: a ficha já está igual à da wiki.');
  }
  const section = (name, title, lines) => lines.length ? `<div class="form-group"><label><input type="checkbox" name="${name}" checked> ${title}</label></div><ul>${(name === 'roles' ? lines : lines.slice(0, 12)).map(line => `<li>${esc(line)}</li>`).join('')}${name !== 'roles' && lines.length > 12 ? `<li>e mais ${lines.length - 12}</li>` : ''}</ul>` : '';
  const content = `<form class="cpr2077-wiki">${section('stats', 'STATs', statChanges)}${section('skills', 'Perícias', skillChanges)}${section('roles', 'Roles (Ranks e sub-habilidades)', roleChanges)}${section('items', 'Itens novos', newItems.map(item => `${item.nome}${item.qtd > 1 ? ` ×${item.qtd}` : ''}`))}${lifepathChanged ? section('lifepath', 'Lifepath', ['texto do Lifepath']) : ''}${portraitChanged ? section('portrait', 'Retrato', ['imagem da ficha e do token']) : ''}${section('lifestyle', 'Moradia e estilo de vida', homeLines)}${section('mount', 'Montagem (carregar armas, encaixar e instalar)', mountLines)}<p class="notes">As retiradas de Roles da wiki estão listadas acima. Roles manuais e equipamentos perdidos ou gastos no jogo continuam como estão.</p></form>`;
  return Dialog.prompt({
    title: `Atualizar ${actor.name} da wiki`, content, label: 'Aplicar',
    callback: async html => {
      const form = html[0].querySelector('form');
      const checked = name => Boolean(form[name]?.checked);
      if (checked('roles')) await applyRoles(actor, rolePlan);
      if (checked('stats')) {
        const update = {};
        for (const [key, field] of Object.entries(keys)) {
          if (field === 'emp') update['system.stats.emp.max'] = r.stats.EMP;
          else update[`system.stats.${field}.value`] = r.stats[key];
        }
        update['system.stats.luck.max'] = r.stats.LUCK;
        await actor.update(update);
      }
      if (checked('skills')) await applySkills(actor, r.pericias, r.casa);
      let delivered = link.entregues || [];
      if (checked('items') && newItems.length) {
        const datas = [];
        for (const entry of newItems) datas.push(...((await itemData(entry).catch(() => null)) || []));
        const created = await actor.createEmbeddedDocuments('Item', datas);
        await assemble(actor, newItems);
        delivered = [...delivered, ...newItems.map(item => item.uid)];
      }
      if (checked('lifepath')) await actor.update({ 'system.lifepath': r.lifepath });
      if (checked('lifestyle')) await actor.update(home);
      if (checked('mount')) for (const note of await assemble(actor, r.itens || [])) ui.notifications.warn(note);
      let portrait = link.retrato || '';
      if (checked('portrait')) {
        const result = await applyPortrait(actor, doc);
        if (result.applied) portrait = result.applied;
        for (const note of result.notes) ui.notifications.warn(note);
      }
      const cyberPending = pendingCyberLocation(actor, r.itens || []);
      if (cyberPending.length) {
        await actor.setFlag(MODULE_ID, 'wiki', { ...link, entregues: delivered, retrato: portrait, rolePrincipal: rolePlan.primary });
        return ui.notifications.warn(`A montagem do cyberware continua pendente: ${cyberPending.slice(0, 3).join('; ')}.`);
      }
      if (roleChanges.length && !checked('roles')) {
        await actor.setFlag(MODULE_ID, 'wiki', { ...link, entregues: delivered, retrato: portrait });
        return ui.notifications.warn('As Roles não foram aplicadas: a atualização da wiki continua pendente.');
      }
      await actor.setFlag(MODULE_ID, 'wiki', { ...link, versao: doc.versao, entregues: delivered, retrato: portrait, rolePrincipal: rolePlan.primary });
      await synced(delivered);
      ui.notifications.info(`${actor.name} atualizado da wiki.`);
    },
    rejectClose: false
  });
}

// ---------------- Na mesa: a ficha do Foundry de volta para a wiki ----------------
// Depois da importação o Foundry manda. A cada mudança num ator que veio da wiki (HP, dinheiro, itens, munição…),
// o Foundry do mestre manda um retrato da ficha para a wiki, alguns segundos depois da última mudança; a ficha da
// wiki mostra em "Na mesa". Só um mestre manda (o ativo).
const strip = html => String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
// Os slots de uma base de cyberware como estão na ficha (um upgrade pode mudar): os livres mais os usados.
const totalSlots = item => {
  const used = item.system.installedItems?.usedSlots || 0;
  const free = typeof item.availableInstallSlots === 'function' ? item.availableInstallSlots() : NaN;
  return Number.isFinite(free) ? free + used : item.system.installedItems?.slots || 0;
};
function tableSnapshot(actor) {
  const s = actor.system;
  const nameOf = id => actor.items.get(id)?.name || '';
  const armorSp = (is, key) => Math.max(0, ...actor.itemTypes.armor.filter(item => item.system.equipped === 'equipped' && item.system[is]).map(item => (item.system[key]?.sp || 0) - (item.system[key]?.ablation || 0)));
  const primary = actor.getFlag(MODULE_ID, 'wiki')?.rolePrincipal;
  const role = actor.itemTypes.role.find(item => primary && roleId(item) === primary)
    || actor.itemTypes.role.find(item => item.name === s.roleInfo?.activeRole) || actor.itemTypes.role[0];
  const roleSnapshot = item => ({ ...(roleId(item) ? { id: roleId(item) } : {}), nome: item.name, rank: item.system.rank,
    habilidades: (item.system.abilities || []).map(ability => [ability.name, ability.rank]) });
  const roles = role ? [role, ...actor.itemTypes.role.filter(item => item.id !== role.id)] : [];
  const items = actor.items.filter(item => !['skill', 'role', 'criticalInjury'].includes(item.type)).filter(item => {
    // As bases do próprio corpo (Internal, External, Fashionware) o sistema cria sozinho: ficam de fora.
    return !(item.type === 'cyberware' && item.system.isFoundational && !item.getFlag(MODULE_ID, 'wikiUid'));
  }).map(item => {
    const x = item.system;
    const entry = { id: item.id, nome: item.name, tipo: item.type, qtd: 'amount' in x ? x.amount : 1, uso: x.equipped || '', uid: item.getFlag(MODULE_ID, 'wikiUid') || '' };
    if (item.type === 'weapon') Object.assign(entry, { dano: x.damage, cdt: x.rof, pericia: x.weaponSkill, distancia: Boolean(x.isRanged), maos: x.handsReq || 1,
      pente: x.isRanged ? { atual: x.magazine?.value || 0, max: x.magazine?.max || 0 } : null, municao: (item.getInstalledItems?.('ammo') || [])[0]?.name || '' });
    if (item.type === 'armor') Object.assign(entry, { cabeca: x.isHeadLocation ? (x.headLocation?.sp || 0) - (x.headLocation?.ablation || 0) : 0, corpo: x.isBodyLocation ? (x.bodyLocation?.sp || 0) - (x.bodyLocation?.ablation || 0) : 0 });
    // O tipo, o tamanho e os slots vão para a aba Cyberware da ficha da wiki (o grupo do RED e os quadrados de cada base).
    if (item.type === 'cyberware') {
      const ref = parent => ({ id: parent.id, uid: parent.getFlag(MODULE_ID, 'wikiUid') || '', nome: parent.name });
      const parents = parentItems(actor, item);
      Object.assign(entry, { instalado: installedInActor(actor, item), base: Boolean(x.isFoundational),
        local: actualCyberLocal(actor, item), localPlanejado: plannedLocal(item),
        pai: parents.length === 1 ? ref(parents[0]) : null,
        ...(parents.length > 1 ? { pais: parents.map(ref) } : {}),
        nomeCatalogo: item.getFlag(MODULE_ID, 'wikiNomeCatalogo') || item.name,
        idCatalogo: item.getFlag(MODULE_ID, 'wikiCatalogId') || '',
        emPlanejado: item.getFlag(MODULE_ID, 'wikiEm') || '',
        cyber: { tipo: x.type || '', tamanho: x.size ?? 1, slots: x.isFoundational ? totalSlots(item) : 0 } });
    }
    if (x.installedItems?.list?.length) {
      entry.dentro = x.installedItems.list.map(nameOf).filter(Boolean);
      entry.dentroIds = x.installedItems.list.filter(id => actor.items.get(id));
      entry.dentroUids = entry.dentroIds.map(id => actor.items.get(id).getFlag(MODULE_ID, 'wikiUid')).filter(Boolean);
    }
    return entry;
  });
  return {
    ator: actor.id, nomeAtor: actor.name, quando: new Date().toISOString(),
    stats: Object.fromEntries(Object.entries(s.stats || {}).map(([key, value]) => [key.toUpperCase(), value.value])),
    hp: { atual: s.derivedStats?.hp?.value ?? 0, max: s.derivedStats?.hp?.max ?? 0 },
    humanidade: { atual: s.derivedStats?.humanity?.value ?? 0, max: s.derivedStats?.humanity?.max ?? 0 },
    sorte: { atual: s.stats?.luck?.value ?? 0, max: s.stats?.luck?.max ?? 0 },
    sp: { cabeca: armorSp('isHeadLocation', 'headLocation'), corpo: armorSp('isBodyLocation', 'bodyLocation') },
    dinheiro: s.wealth?.value ?? 0, ip: s.improvementPoints?.value ?? 0, reputacao: s.reputation?.value ?? 0,
    role: role ? roleSnapshot(role) : null,
    roles: roles.map(roleSnapshot),
    pericias: actor.itemTypes.skill.filter(skill => skill.system.level > 0).map(skill => ({ nome: skill.name, nivel: skill.system.level, stat: String(skill.system.stat || '').toUpperCase() })),
    lesoes: actor.itemTypes.criticalInjury.map(injury => injury.name),
    moradia: Object.fromEntries(['housing', 'lifeStyle', 'traumaTeam'].map(key => [key, { custo: s.lifestyle?.[key]?.cost || 0, descricao: strip(s.lifestyle?.[key]?.description) }])),
    itens: items
  };
}
// Ator que foi para outra campanha (crossover) ou que não é mais o ligado ao personagem (importado de novo noutro
// mundo, como na migração para o Foundry 14): para de mandar. A wiki também recusa (409) nos dois casos.
const movedAway = new Set();
async function syncActor(actor) {
  const link = actor?.getFlag(MODULE_ID, 'wiki');
  if (!link || actor.getFlag(MODULE_ID, 'saiu') || movedAway.has(actor.id)) return null;
  const campaign = await tableCampaign();
  return wikiFetch(`/api/personagens/${link.id}/mesa`, { method: 'PUT', body: { ...tableSnapshot(actor), ...(campaign?.id ? { campanha: campaign.id } : {}) } })
    .catch(error => { if (/outra campanha|ator antigo/.test(error.message)) movedAway.add(actor.id); throw error; });
}
const syncTimers = new Map();
let syncWarned = false;
const isSyncGm = () => game.user.isGM && (!game.users.activeGM || game.users.activeGM.id === game.user.id) && game.settings.get(MODULE_ID, 'wikiMesa');
function scheduleSync(actor) {
  if (!actor || changingRoles.has(actor.id) || actor.documentName !== 'Actor' || !actor.getFlag(MODULE_ID, 'wiki') || !isSyncGm()) return;
  clearTimeout(syncTimers.get(actor.id));
  syncTimers.set(actor.id, setTimeout(() => {
    syncTimers.delete(actor.id);
    syncActor(actor).then(() => { syncWarned = false; }).catch(error => { if (!syncWarned) { syncWarned = true; console.warn(`${MODULE_ID} | Na mesa (wiki):`, error.message); } });
  }, 4000));
}
export function registerTableSync() {
  Hooks.on('updateActor', actor => scheduleSync(actor));
  for (const hook of ['createItem', 'updateItem', 'deleteItem']) Hooks.on(hook, item => scheduleSync(item.parent));
  // Ao entrar: manda todos os atores da wiki uma vez (os importados antes desta versão também).
  Hooks.once('ready', () => { if (isSyncGm()) for (const actor of game.actors) scheduleSync(actor); });
}

// ---------------- Avisos ----------------
// Para o mestre: ao entrar e a cada minuto, pergunta à wiki quem foi enviado. Cada envio avisa uma vez neste navegador.
const SEEN_KEY = `${MODULE_ID}.wiki-avisos`;
const seenKeys = () => { try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'); } catch { return []; } };
const markSeen = keys => { try { localStorage.setItem(SEEN_KEY, JSON.stringify([...new Set([...seenKeys(), ...keys])].slice(-300))); } catch { /* navegador sem localStorage */ } };
// Quem veio de outra campanha avisa de novo quando chega a ficha da mesa antiga.
const sendKey = item => `${item.id}:${item.envio?.quando || ''}${item.estadoFoundry === 'outra-mesa' ? `:outra:${item.transferencia?.quando || ''}` : ''}`;
let unresolvedWarned = false;
let waitingDialog = null;
let quietError = false;

// ---------------- Pedidos da campanha ----------------
// O jogador pede na loja da wiki; o mestre aprova (na wiki ou aqui); o Foundry do mestre ativo entrega o aprovado:
// cria os itens, encaixa e carrega como o jogador pediu e desconta o dinheiro. Cyberware chega sem instalar: instale pela
// ficha, que cobra a instalação e rola a Humanidade. Cada item entregue leva o uid "pedido:<id>:<n>": nada sai em dobro.
const isActiveGm = () => game.user.isGM && (!game.users.activeGM || game.users.activeGM.id === game.user.id);
async function deliverOrder(actor, wikiId, pedido) {
  const prefix = `pedido:${pedido.id}:`;
  const notes = [];
  const already = actor.items.some(item => String(item.getFlag(MODULE_ID, 'wikiUid') || '').startsWith(prefix));
  if (!already) {
    const wealth = Number(actor.system.wealth?.value) || 0;
    if (wealth < pedido.total) {
      const erro = `Dinheiro insuficiente na mesa: ${wealth}eb de ${pedido.total}eb.`;
      await wikiFetch(`/api/personagens/${wikiId}/pedidos/${pedido.id}/erro`, { method: 'POST', body: { erro, ator: actor.id } }).catch(() => null);
      return { ok: false, notes: [erro] };
    }
    const datas = [];
    for (const line of pedido.itens) {
      const data = await itemData({ ...line, uso: 'carregando' }).catch(() => null);
      if (data) datas.push(...data); else notes.push(`${line.nome}: não achei no compêndio ${line.foundry?.pack}.`);
    }
    if (datas.length) await actor.createEmbeddedDocuments('Item', datas);
    // Montagem do pedido: acessório na arma, programa no deck, munição na arma (cyberware fica de fora).
    notes.push(...await assemble(actor, pedido.itens.filter(line => !line.cyber)));
    await actor.setLedgerProperty('wealth', wealth - pedido.total, `Compra na wiki: ${pedido.itens.map(line => line.nome).join(', ')}`);
    if (pedido.itens.some(line => line.cyber)) notes.push('Cyberware: instale pela ficha (o sistema cobra a instalação e rola a Humanidade).');
  }
  await wikiFetch(`/api/personagens/${wikiId}/pedidos/${pedido.id}/entregue`, { method: 'POST', body: { avisos: notes, ator: actor.id } });
  return { ok: true, notes };
}
// Aprovar aqui e entregar na hora.
async function approveAndDeliver(wikiId, pedido) {
  const actor = actorOf(wikiId);
  if (!actor) return ui.notifications.warn('Este personagem ainda não está neste mundo: importe antes.');
  try {
    if (pedido.status === 'pendente') await wikiFetch(`/api/personagens/${wikiId}/pedidos/${pedido.id}/aprovar`, { method: 'POST', body: {} });
    const result = await deliverOrder(actor, wikiId, pedido);
    if (result.ok) ui.notifications.info(`${actor.name}: pedido entregue.${result.notes.length ? ` ${result.notes.join(' ')}` : ''}`);
    else ui.notifications.warn(`${actor.name}: ${result.notes.join(' ')}`);
  } catch (error) {
    ui.notifications.error(`Pedido da wiki: ${error.message}`);
  }
}
async function refuseOrder(wikiId, pedido) {
  const motivo = await Dialog.prompt({ title: 'Recusar o pedido', content: '<form class="cpr2077-wiki"><div class="form-group"><label>Motivo (o jogador vê)</label><input type="text" name="motivo"></div></form>', label: 'Recusar', callback: html => html[0].querySelector('[name="motivo"]').value, rejectClose: false });
  if (motivo === null || motivo === undefined) return;
  await wikiFetch(`/api/personagens/${wikiId}/pedidos/${pedido.id}/recusar`, { method: 'POST', body: { motivo } }).catch(error => ui.notifications.error(error.message));
}
// Pedidos de todos os personagens deste mundo: entrega os aprovados e devolve os que esperam o mestre.
async function pendingOrders(list, { deliver = true } = {}) {
  const pending = [];
  for (const item of (list.personagens || []).filter(entry => !entry.publico && entry.pedidos && (entry.pedidos.pendentes || entry.pedidos.aprovados))) {
    // Só o ator ligado ao personagem na wiki entrega (o da última importação, mesmo que haja uma cópia antiga neste
    // mundo). Sem ele aqui, o personagem foi importado noutro mundo (a migração para o Foundry 14): este não entrega.
    const linked = item.foundry?.ator ? game.actors.get(item.foundry.ator) : null;
    const actor = linked?.getFlag(MODULE_ID, 'wiki')?.id === item.id ? linked : actorOf(item.id);
    if (!actor || (item.foundry?.ator && item.foundry.ator !== actor.id)) continue;
    const doc = (await wikiFetch(`/api/personagens/${item.id}`).catch(() => ({}))).personagem;
    for (const pedido of (doc?.pedidos || [])) {
      if (pedido.status === 'aprovado' && !pedido.erro && deliver) {
        const result = await deliverOrder(actor, item.id, pedido).catch(error => ({ ok: false, notes: [error.message] }));
        if (result.ok) ui.notifications.info(`Wiki: pedido de ${actor.name} entregue na ficha.`);
        else ui.notifications.warn(`Wiki: pedido de ${actor.name} não foi entregue. ${result.notes.join(' ')}`);
      } else if (pedido.status === 'pendente' || (pedido.status === 'aprovado' && pedido.erro)) pending.push({ wikiId: item.id, nome: doc.nome || actor.name, pedido });
    }
  }
  return pending;
}

// Uma linha por personagem: Importar (ainda não está neste mundo) ou Atualizar (o ator já existe); e uma linha por
// pedido da campanha esperando o mestre, com Aprovar (entrega na hora) e Recusar.
function showWaiting(waiting, orders = []) {
  const rows = waiting.map(item => {
    const actor = actorOf(item.id);
    const action = actor
      ? `<button type="button" data-wiki-update="${item.id}"><i class="fas fa-sync"></i> Atualizar</button>`
      : `<button type="button" data-wiki-import="${item.id}"><i class="fas fa-file-import"></i> Importar</button>`;
    const sent = item.envio ? new Date(item.envio.quando).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
    const detail = item.estadoFoundry === 'outra-mesa' ? esc(stateLabel(item)) : `Enviado em ${sent}${actor ? ` · mudou desde a importação (${esc(actor.name)})` : ''}`;
    return `<li class="cpr2077-wiki-row"><span><b>${esc(item.nome || 'Sem nome')}</b>${item.apelido ? ` "${esc(item.apelido)}"` : ''} · ${esc(item.donoNome || 'sem dono')}<br><small>${detail}</small></span>${action}</li>`;
  }).join('');
  const orderRows = orders.map(({ wikiId, nome, pedido }, index) => `<li class="cpr2077-wiki-row"><span><b>${esc(nome)}</b> pediu ${pedido.total}eb${pedido.erro ? ` · <i>${esc(pedido.erro)}</i>` : ''}<br><small>${pedido.itens.map(item => `${esc(item.nome)}${item.qtd > 1 ? ` ×${item.qtd}` : ''}`).join(', ')}${pedido.nota ? ` · “${esc(pedido.nota)}”` : ''}</small></span>
    <span class="cpr2077-wiki-actions"><button type="button" data-order-approve="${index}"><i class="fas fa-check"></i> ${pedido.status === 'aprovado' ? 'Tentar de novo' : 'Aprovar'}</button><button type="button" data-order-refuse="${index}"><i class="fas fa-times"></i> Recusar</button></span></li>`).join('');
  if (waitingDialog?.rendered) waitingDialog.close();
  waitingDialog = new Dialog({
    title: 'Personagens da wiki',
    content: `${rows ? `<p>Os jogadores enviaram estes personagens pela wiki.</p><ul class="cpr2077-wiki-list">${rows}</ul>` : ''}
      ${orderRows ? `<p>Pedidos da loja da campanha. Aprovar entrega na hora: os itens entram na ficha e o dinheiro sai.</p><ul class="cpr2077-wiki-list">${orderRows}</ul>` : ''}
      <p class="notes">Dá para fazer depois: aba Atores → Importar da wiki, Atualizar da wiki no topo da ficha, ou a Loja do personagem na wiki.</p>`,
    buttons: { later: { icon: '<i class="fas fa-clock"></i>', label: 'Depois' } },
    default: 'later',
    render: html => {
      $(html).find('[data-wiki-import]').on('click', event => { const id = event.currentTarget.dataset.wikiImport; waitingDialog.close(); importarDaWiki(id); });
      $(html).find('[data-wiki-update]').on('click', event => { const actor = actorOf(event.currentTarget.dataset.wikiUpdate); waitingDialog.close(); if (actor) atualizarDaWiki(actor); });
      $(html).find('[data-order-approve]').on('click', event => { const order = orders[Number(event.currentTarget.dataset.orderApprove)]; waitingDialog.close(); approveAndDeliver(order.wikiId, order.pedido); });
      $(html).find('[data-order-refuse]').on('click', event => { const order = orders[Number(event.currentTarget.dataset.orderRefuse)]; waitingDialog.close(); refuseOrder(order.wikiId, order.pedido); });
    }
  }, { width: 480 });
  waitingDialog.render(true);
}

// `manual`: aberto pelo mestre (mostra todos os enviados e pedidos, e os erros); senão só avisa dos novos.
// O mestre ativo também entrega aqui os pedidos já aprovados na wiki.
export async function avisosDaWiki({ manual = false } = {}) {
  if (!game.user.isGM) return;
  let list;
  try { list = await wikiFetch('/api/personagens'); } catch (error) {
    if (manual) ui.notifications.error(error.message);
    else if (!quietError) { quietError = true; console.warn(`${MODULE_ID} | avisos da wiki:`, error.message); }
    return;
  }
  quietError = false;
  if (list.papel !== 'mestre') {
    if (manual) ui.notifications.error(notGmMessage());
    return;
  }
  // Só a campanha deste mundo. Sem saber qual (há campanhas e o mundo não está ligado), não entrega pedido nenhum.
  const campaign = await tableCampaign();
  if (campaign?.erro && (manual || !unresolvedWarned)) { unresolvedWarned = true; ui.notifications.warn(`Wiki: ${unresolvedHelp(campaign)}`, { permanent: manual }); }
  if (campaign?.id && isActiveGm()) await sendMovedAway(list, campaign);
  const mine = { ...list, personagens: (list.personagens || []).filter(item => ofTable(item, campaign)) };
  const orders = await pendingOrders(mine, { deliver: isActiveGm() && !campaign?.erro });
  const showNotices = manual || game.settings.get(MODULE_ID, 'wikiAvisos');
  if (!showNotices) return;
  const waiting = mine.personagens.filter(item => !item.publico && WAITING.includes(item.estadoFoundry));
  const seen = seenKeys();
  const orderKey = order => `pedido:${order.pedido.id}:${order.pedido.erro || ''}`;
  const fresh = waiting.filter(item => !seen.includes(sendKey(item)));
  const freshOrders = orders.filter(order => !seen.includes(orderKey(order)));
  if (manual && !waiting.length && !orders.length) return ui.notifications.info('Nada esperando na wiki.');
  if (!manual && !fresh.length && !freshOrders.length) return;
  markSeen([...waiting.map(sendKey), ...orders.map(orderKey)]);
  const arrived = fresh.filter(item => item.estadoFoundry === 'outra-mesa');
  const sentNow = fresh.filter(item => item.estadoFoundry !== 'outra-mesa');
  if (sentNow.length) ui.notifications.info(`Wiki: ${sentNow.map(item => item.nome || 'Sem nome').join(', ')} ${sentNow.length > 1 ? 'foram enviados' : 'foi enviado'} para você.`);
  if (arrived.length) ui.notifications.info(`Wiki: ${arrived.map(item => item.nome || 'Sem nome').join(', ')} ${arrived.length > 1 ? 'vieram' : 'veio'} de outra campanha para esta.`);
  if (freshOrders.length) ui.notifications.info(`Wiki: ${freshOrders.length > 1 ? `${freshOrders.length} pedidos da loja esperando você` : `${freshOrders[0].nome} fez um pedido na loja`}.`);
  showWaiting(waiting, orders);
}

export function registerWikiWatch() {
  Hooks.once('ready', () => {
    if (!game.user.isGM) return;
    // Os pedidos aprovados são entregues mesmo com os avisos desligados.
    const tick = () => avisosDaWiki();
    setTimeout(tick, 3000);
    setInterval(tick, 60 * 1000);
  });
}

// ---------------- Botões ----------------
export function registerWikiButtons() {
  Hooks.on('renderActorDirectory', (app, html) => {
    if (!game.user.isGM) return;
    const root = html[0] || html;
    if (root.querySelector('.cpr2077-wiki-import')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cpr2077-wiki-import';
    button.innerHTML = '<i class="fas fa-file-import"></i> Importar da wiki';
    button.addEventListener('click', () => importarDaWiki());
    (root.querySelector('.header-actions') || root.querySelector('.directory-header') || root).append(button);
  });
  Hooks.on('getActorSheetHeaderButtons', (sheet, buttons) => {
    if (!game.user.isGM || !sheet.actor?.getFlag(MODULE_ID, 'wiki')) return;
    buttons.unshift({ label: 'Atualizar da wiki', class: 'cpr2077-wiki-update', icon: 'fas fa-sync', onclick: () => atualizarDaWiki(sheet.actor) });
  });
}

// Montagem da wiki num ator que já está na mesa (o mesmo que a seção Montagem do Atualizar da wiki).
async function wikiDocOf(actor) {
  const link = actor?.getFlag(MODULE_ID, 'wiki');
  if (!link) throw new Error('Este ator não veio da wiki.');
  return { link, doc: (await wikiFetch(`/api/personagens/${link.id}`)).personagem };
}
async function montagemPendente(actor) {
  const { link, doc } = await wikiDocOf(actor);
  return pendingAssembly(actor, ((doc.resultado || {}).itens || []).filter(item => (link.entregues || []).includes(item.uid)));
}
async function aplicarMontagem(actor) {
  const { doc } = await wikiDocOf(actor);
  return assemble(actor, (doc.resultado || {}).itens || []);
}

// Pedidos da campanha deste mundo (o mesmo filtro dos avisos).
async function ordersOfThisTable() {
  const [list, campaign] = [await wikiFetch('/api/personagens'), await tableCampaign()];
  return pendingOrders({ ...list, personagens: (list.personagens || []).filter(item => ofTable(item, campaign)) }, { deliver: !campaign?.erro });
}
export const wikiApi = { entregarPedidos: ordersOfThisTable, campanhaDaWiki: tableCampaign, importarDaWiki, atualizarDaWiki, avisosDaWiki: () => avisosDaWiki({ manual: true }), importarPersonagem: importCharacter, enviarParaWiki: syncActor, fichaDaMesa: tableSnapshot, montagemPendente, aplicarMontagem };

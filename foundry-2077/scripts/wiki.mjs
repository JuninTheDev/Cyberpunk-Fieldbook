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
  let response;
  try {
    response = await fetch(`${wikiUrl()}${path}`, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined, cache: 'no-store', credentials: 'include' });
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

// Dados de um item da wiki prontos para entrar no ator.
async function itemData(entry) {
  const data = await fromPack(entry.foundry.pack, entry.foundry.nome);
  if (!data) return null;
  const s = data.system || {};
  if (entry.renomear) data.name = entry.renomear;
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
  return Array.from({ length: stacks ? 1 : Math.max(1, entry.qtd) }, () => foundry.utils.deepClone(data));
}

// Monta o equipamento como na wiki (sem janela e sem rolar):
//   1. as bases de cyberware no ator;
//   2. cada item no lugar escolhido: acessório na arma, programa e hardware no cyberdeck, opção de cyberware na base;
//      a opção sem lugar vai numa base do mesmo tipo com espaço (as do corpo, interno/externo/fashionware, já vêm na ficha);
//   3. a munição em cada arma, e a arma recarregada (o que entra no pente sai da munição).
// Os pais são achados pelo uid da wiki gravado em cada item: no Atualizar da wiki, o pai pode já estar na ficha.
const itemsByUid = (actor, uid) => actor.items.filter(item => item.getFlag(MODULE_ID, 'wikiUid') === uid);
const installedSomewhere = (actor, item) => (item.type === 'cyberware' && item.system.isInstalled) || actor.items.some(other => other.system.installedItems?.list?.includes(item.id));

// O que da montagem da wiki ainda não está na ficha: tudo o que o assemble faria (a lista mostra exatamente o que o
// Atualizar da wiki vai aplicar). Acontece com atores importados antes da montagem existir, ou com algo tirado na mão.
function pendingAssembly(actor, entries) {
  const lines = [];
  const cyber = entries.filter(item => item.cyber).flatMap(entry => itemsByUid(actor, entry.uid).map(item => ({ entry, item }))).filter(({ item }) => item.type === 'cyberware');
  for (const { item } of cyber.filter(({ item }) => item.system.isFoundational && !actor.system.installedItems.list.includes(item.id))) lines.push(`${item.name}: instalar`);
  for (const { entry, item } of cyber.filter(({ entry, item }) => !entry.em && !item.system.isFoundational && !installedSomewhere(actor, item))) lines.push(`${item.name}: instalar numa base do mesmo tipo`);
  for (const entry of entries.filter(item => item.municao)) {
    const ammo = itemsByUid(actor, entry.municao)[0];
    if (!ammo) continue;
    for (const weapon of itemsByUid(actor, entry.uid).filter(item => item.type === 'weapon')) {
      if (!weapon.getInstalledItems?.('ammo')?.length) lines.push(`${weapon.name}: carregar com ${ammo.name}`);
    }
  }
  for (const entry of entries.filter(item => item.em)) {
    const target = itemsByUid(actor, entry.em)[0];
    if (!target) continue;
    for (const item of itemsByUid(actor, entry.uid)) if (!installedSomewhere(actor, item)) lines.push(`${item.name} → ${target.name}`);
  }
  return lines;
}

async function assemble(actor, entries) {
  const notes = [];
  const byUid = uid => itemsByUid(actor, uid);
  const cyber = entries.flatMap(entry => byUid(entry.uid)).filter(item => item.type === 'cyberware');
  const bases = cyber.filter(item => item.system.isFoundational && !actor.system.installedItems.list.includes(item.id));
  for (const base of bases) await actor.installItems([base]);

  for (const entry of entries.filter(item => item.em)) {
    const target = byUid(entry.em)[0];
    const items = byUid(entry.uid).filter(item => !installedSomewhere(actor, item));
    if (!target || !items.length) continue;
    const ok = await target.installItems(items).catch(() => false);
    if (ok === false) notes.push(`${items[0].name}: não coube em ${target.name}; ficou no inventário.`);
  }
  for (const item of cyber.filter(cw => !cw.system.isFoundational && !installedSomewhere(actor, cw))) {
    const current = actor.items.get(item.id);
    const options = actor.itemTypes.cyberware.filter(cw => cw.system.isFoundational && cw.system.type === current.system.type && actor.system.installedItems.list.includes(cw.id));
    const target = options.find(base => base.availableInstallSlots() >= current.system.size);
    if (target) await target.installItems([current]);
    else notes.push(`${current.name}: sem base com espaço; ficou no inventário, sem instalar.`);
  }

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
async function addRole(actor, role) {
  if (!role || !role.foundry) return ['Sem Role.'];
  const data = await fromPack(role.foundry.pack, role.foundry.nome);
  if (!data) return [`Role ${role.foundry.nome} não encontrada em ${role.foundry.pack}.`];
  data.system.rank = role.rank || 4;
  // Sub-habilidades (Solo, Tech, Medtech): os pontos distribuídos na wiki, pelo nome que o item de Role usa.
  const notes = [];
  const ranks = new Map((role.habilidades || []).map(entry => [entry.nome, entry.rank]));
  if (ranks.size) {
    data.system.abilities = (data.system.abilities || []).map(ability => ranks.has(ability.name) ? { ...ability, rank: ranks.get(ability.name) } : ability);
    for (const name of ranks.keys()) if (!data.system.abilities.some(ability => ability.name === name)) notes.push(`Role: a sub-habilidade ${name} não existe no item ${data.name}.`);
  }
  // A especialização (Face, Lawman) soma o Rank nas perícias dela.
  if (role.especializacao) data.system.bonuses = [...(data.system.bonuses || []), ...role.especializacao.pericias.filter(name => !(data.system.bonuses || []).some(b => b.name === name)).map(name => ({ name }))];
  if (role.especializacao) data.system.description.value += `<p><b>Especialização:</b> ${esc(role.especializacao.nome)}.</p>`;
  const [created] = await actor.createEmbeddedDocuments('Item', [data]);
  await actor.update({ 'system.roleInfo.activeRole': created.name });
  return notes;
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
  notes.push(...await addRole(actor, r.role));

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
    `<p><i>Criado na wiki (${esc((r.role || {}).nome || '')}, ${esc(doc.apelido || '')}). Importado em ${new Date().toLocaleDateString('pt-BR')}.</i></p>`
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
  await actor.setFlag(MODULE_ID, 'wiki', { id: doc.id, versao: doc.versao, entregues: delivered, importado: new Date().toISOString(), retrato: portrait.applied });
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
// Mostra o que mudou na wiki desde a importação e aplica o que o mestre marcar. Nunca apaga item da ficha.
export async function atualizarDaWiki(actor) {
  const link = actor?.getFlag(MODULE_ID, 'wiki');
  if (!link) return ui.notifications.warn('Este ator não veio da wiki.');
  let doc;
  try { doc = (await wikiFetch(`/api/personagens/${link.id}`)).personagem; } catch (error) { return ui.notifications.error(error.message); }
  // Depois de um crossover, a ficha é do mundo da campanha nova.
  const campaign = await tableCampaign();
  if (campaign?.id && doc.campanha && doc.campanha !== campaign.id) return ui.notifications.warn(`${actor.name} agora é de outra campanha na wiki: a ficha dele é do mundo dela.`);
  const r = doc.resultado || {};
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
  const synced = delivered => wikiFetch(`/api/personagens/${doc.id}/foundry`, { method: 'PUT', body: { ator: actor.id, nomeAtor: actor.name, versao: doc.versao, entregues: delivered, ...(campaign?.id ? { campanha: campaign.id } : {}) } }).catch(() => null);
  // Nada que este botão aplique (a mudança foi em moradia ou dinheiro, por exemplo): a wiki para de mostrar "mudou".
  const mountLines = pendingAssembly(actor, (r.itens || []).filter(item => (link.entregues || []).includes(item.uid)));
  if (!statChanges.length && !skillChanges.length && !newItems.length && !lifepathChanged && !portraitChanged && !homeLines.length && !mountLines.length) {
    await synced(link.entregues || []);
    return ui.notifications.info('Nada para aplicar: a ficha já está igual à da wiki.');
  }
  const section = (name, title, lines) => lines.length ? `<div class="form-group"><label><input type="checkbox" name="${name}" checked> ${title}</label></div><ul>${lines.slice(0, 12).map(line => `<li>${esc(line)}</li>`).join('')}${lines.length > 12 ? `<li>e mais ${lines.length - 12}</li>` : ''}</ul>` : '';
  const content = `<form class="cpr2077-wiki">${section('stats', 'STATs', statChanges)}${section('skills', 'Perícias', skillChanges)}${section('items', 'Itens novos', newItems.map(item => `${item.nome}${item.qtd > 1 ? ` ×${item.qtd}` : ''}`))}${lifepathChanged ? section('lifepath', 'Lifepath', ['texto do Lifepath']) : ''}${portraitChanged ? section('portrait', 'Retrato', ['imagem da ficha e do token']) : ''}${section('lifestyle', 'Moradia e estilo de vida', homeLines)}${section('mount', 'Montagem (carregar armas, encaixar e instalar)', mountLines)}<p class="notes">Nada é apagado da ficha: itens perdidos ou gastos no jogo continuam como estão.</p></form>`;
  return Dialog.prompt({
    title: `Atualizar ${actor.name} da wiki`, content, label: 'Aplicar',
    callback: async html => {
      const form = html[0].querySelector('form');
      const checked = name => Boolean(form[name]?.checked);
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
      await actor.setFlag(MODULE_ID, 'wiki', { ...link, versao: doc.versao, entregues: delivered, retrato: portrait });
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
  const role = actor.itemTypes.role.find(item => item.name === s.roleInfo?.activeRole) || actor.itemTypes.role[0];
  const items = actor.items.filter(item => !['skill', 'role', 'criticalInjury'].includes(item.type)).filter(item => {
    // As bases do próprio corpo (Internal, External, Fashionware) o sistema cria sozinho: ficam de fora.
    return !(item.type === 'cyberware' && item.system.isFoundational && !item.getFlag(MODULE_ID, 'wikiUid'));
  }).map(item => {
    const x = item.system;
    const entry = { nome: item.name, tipo: item.type, qtd: 'amount' in x ? x.amount : 1, uso: x.equipped || '', uid: item.getFlag(MODULE_ID, 'wikiUid') || '' };
    if (item.type === 'weapon') Object.assign(entry, { dano: x.damage, cdt: x.rof, pericia: x.weaponSkill, distancia: Boolean(x.isRanged), maos: x.handsReq || 1,
      pente: x.isRanged ? { atual: x.magazine?.value || 0, max: x.magazine?.max || 0 } : null, municao: (item.getInstalledItems?.('ammo') || [])[0]?.name || '' });
    if (item.type === 'armor') Object.assign(entry, { cabeca: x.isHeadLocation ? (x.headLocation?.sp || 0) - (x.headLocation?.ablation || 0) : 0, corpo: x.isBodyLocation ? (x.bodyLocation?.sp || 0) - (x.bodyLocation?.ablation || 0) : 0 });
    // O tipo, o tamanho e os slots vão para a aba Cyberware da ficha da wiki (o grupo do RED e os quadrados de cada base).
    if (item.type === 'cyberware') Object.assign(entry, { instalado: Boolean(x.isInstalled), base: Boolean(x.isFoundational),
      cyber: { tipo: x.type || '', tamanho: x.size ?? 1, slots: x.isFoundational ? totalSlots(item) : 0 } });
    if (x.installedItems?.list?.length) entry.dentro = x.installedItems.list.map(nameOf).filter(Boolean);
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
    role: role ? { nome: role.name, rank: role.system.rank, habilidades: (role.system.abilities || []).map(ability => [ability.name, ability.rank]) } : null,
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
  if (!actor || actor.documentName !== 'Actor' || !actor.getFlag(MODULE_ID, 'wiki') || !isSyncGm()) return;
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

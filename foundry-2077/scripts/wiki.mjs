// Personagens do criador da wiki: "Importar da wiki" (aba de Atores) e "Atualizar da wiki" (cabeçalho da ficha).
// A wiki grava em cada personagem um `resultado` pronto: perícias com o nome do Foundry, itens com o compêndio
// de onde vêm, Lifepath em texto e dinheiro. Aqui é só montar o ator com isso.
// O mestre importa do computador onde a wiki roda: para a wiki, o pedido vem deste computador (é o mestre).
const MODULE_ID = 'cpr-2077';

export function registerWikiSettings() {
  game.settings.register(MODULE_ID, 'wikiUrl', {
    name: 'Endereço da wiki',
    hint: 'Onde o Foundry busca os personagens do criador da wiki. Use o endereço deste computador (http://localhost:8000).',
    scope: 'client', config: true, type: String, default: 'http://localhost:8000'
  });
}

const wikiUrl = () => String(game.settings.get(MODULE_ID, 'wikiUrl') || 'http://localhost:8000').replace(/\/+$/, '');
const esc = text => foundry.utils.escapeHTML ? foundry.utils.escapeHTML(String(text ?? '')) : String(text ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

async function wikiFetch(path, { method = 'GET', body } = {}) {
  let response;
  try {
    response = await fetch(`${wikiUrl()}${path}`, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
  } catch {
    throw new Error(`Não consegui falar com a wiki em ${wikiUrl()}. Ela está aberta neste computador? (Configurações do módulo → Endereço da wiki.)`);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.erro || `A wiki respondeu ${response.status}.`);
  return data;
}

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
  if (['weapon', 'armor'].includes(data.type) && 'equipped' in s) s.equipped = 'equipped';
  else if ('equipped' in s && !['cyberware', 'clothing'].includes(data.type)) s.equipped = 'carried';
  data.flags = { ...(data.flags || {}), [MODULE_ID]: { ...((data.flags || {})[MODULE_ID] || {}), wikiUid: entry.uid } };
  return Array.from({ length: stacks ? 1 : Math.max(1, entry.qtd) }, () => foundry.utils.deepClone(data));
}

// Instala o cyberware: as bases no ator, as opções numa base do mesmo tipo com espaço. Sem janela e sem rolar.
async function installCyberware(actor, created) {
  const notes = [];
  const cyber = created.filter(item => item.type === 'cyberware');
  for (const item of cyber.filter(cw => cw.system.isFoundational)) await actor.installItems([actor.items.get(item.id)]);
  for (const item of cyber.filter(cw => !cw.system.isFoundational)) {
    const current = actor.items.get(item.id);
    const bases = actor.itemTypes.cyberware.filter(cw => cw.system.isFoundational && cw.system.type === current.system.type && actor.system.installedItems.list.includes(cw.id));
    const target = bases.find(base => base.availableInstallSlots() >= current.system.size);
    if (target) await target.installItems([current]);
    else notes.push(`${current.name}: sem base com espaço; ficou no inventário, sem instalar.`);
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
  // A especialização (Face, Lawman) soma o Rank nas perícias dela.
  if (role.especializacao) data.system.bonuses = [...(data.system.bonuses || []), ...role.especializacao.pericias.filter(name => !(data.system.bonuses || []).some(b => b.name === name)).map(name => ({ name }))];
  if (role.especializacao) data.system.description.value += `<p><b>Especialização:</b> ${esc(role.especializacao.nome)}.</p>`;
  const [created] = await actor.createEmbeddedDocuments('Item', [data]);
  await actor.update({ 'system.roleInfo.activeRole': created.name });
  return [];
}

// ---------------- Importar ----------------
async function importCharacter(id, ownerId) {
  const { personagem: doc } = await wikiFetch(`/api/personagens/${id}`);
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
  notes.push(...await installCyberware(actor, created));

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
    'system.lifestyle.housing': { cost: r.moradia.aluguel || 0, description: r.moradia.moradia || '' },
    'system.lifestyle.lifeStyle': { cost: r.moradia.custoEstilo || 0, description: r.moradia.estilo || '' },
    'system.information.alias': doc.apelido || '',
    'system.information.description': description
  });
  actor.setLedgerProperty('wealth', r.dinheiro.saldo, 'Dinheiro inicial (criador da wiki)');

  const delivered = r.itens.map(item => item.uid);
  await actor.setFlag(MODULE_ID, 'wiki', { id: doc.id, versao: doc.versao, entregues: delivered, importado: new Date().toISOString() });
  await wikiFetch(`/api/personagens/${doc.id}/foundry`, { method: 'PUT', body: { ator: actor.id, nomeAtor: actor.name, versao: doc.versao, entregues: delivered } });
  return { actor, notes };
}

export async function importarDaWiki() {
  if (!game.user.isGM) return ui.notifications.warn('Só o mestre importa personagens da wiki.');
  let list;
  try { list = await wikiFetch('/api/personagens'); } catch (error) { return ui.notifications.error(error.message); }
  if (list.papel !== 'mestre') return ui.notifications.error('A wiki não reconheceu você como mestre: importe do computador onde a wiki roda (Foundry em localhost).');
  const characters = (list.personagens || []).filter(item => !item.publico);
  if (!characters.length) return ui.notifications.info('Nenhum personagem na wiki ainda.');
  const players = game.users.filter(user => !user.isGM);
  const content = `<form class="cpr2077-wiki">
    <div class="form-group"><label>Personagem</label><select name="id">${characters.map(item => `<option value="${item.id}">${esc(item.nome || 'Sem nome')}${item.apelido ? ` "${esc(item.apelido)}"` : ''} · ${esc(item.donoNome || 'sem dono')}${item.foundry ? ' · já importado' : ''}</option>`).join('')}</select></div>
    <div class="form-group"><label>Dono no Foundry</label><select name="owner"><option value="">Só o mestre</option>${players.map(user => `<option value="${user.id}">${esc(user.name)}</option>`).join('')}</select></div>
    <p class="notes">Cria um ator novo com STATs, perícias, Role, equipamento, cyberware instalado, Lifepath e dinheiro.</p></form>`;
  return Dialog.prompt({
    title: 'Importar personagem da wiki', content, label: 'Importar',
    callback: async html => {
      const form = html[0].querySelector('form');
      try {
        ui.notifications.info('Importando da wiki…');
        const { actor, notes } = await importCharacter(form.id.value, form.owner.value);
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
  const r = doc.resultado || {};
  const keys = { INT: 'int', REF: 'ref', DEX: 'dex', TECH: 'tech', COOL: 'cool', WILL: 'will', LUCK: 'luck', MOVE: 'move', BODY: 'body', EMP: 'emp' };
  const statChanges = Object.entries(keys).filter(([key, field]) => (field === 'emp' ? actor.system.stats.emp.max : actor.system.stats[field].value) !== r.stats?.[key]).map(([key, field]) => `${key} ${field === 'emp' ? actor.system.stats.emp.max : actor.system.stats[field].value} → ${r.stats[key]}`);
  const skillChanges = (r.pericias || []).filter(skill => { const item = actor.items.find(i => i.type === 'skill' && i.name === skill.nome); return !item || item.system.level !== skill.nivel; }).map(skill => `${skill.nome} → ${skill.nivel}`);
  const newItems = (r.itens || []).filter(item => !(link.entregues || []).includes(item.uid));
  const lifepathChanged = Object.entries(r.lifepath || {}).some(([field, text]) => (actor.system.lifepath?.[field] || '') !== text);
  if (!statChanges.length && !skillChanges.length && !newItems.length && !lifepathChanged) return ui.notifications.info('Nada mudou na wiki desde a importação.');
  const section = (name, title, lines) => lines.length ? `<div class="form-group"><label><input type="checkbox" name="${name}" checked> ${title}</label></div><ul>${lines.slice(0, 12).map(line => `<li>${esc(line)}</li>`).join('')}${lines.length > 12 ? `<li>e mais ${lines.length - 12}</li>` : ''}</ul>` : '';
  const content = `<form class="cpr2077-wiki">${section('stats', 'STATs', statChanges)}${section('skills', 'Perícias', skillChanges)}${section('items', 'Itens novos', newItems.map(item => `${item.nome}${item.qtd > 1 ? ` ×${item.qtd}` : ''}`))}${lifepathChanged ? section('lifepath', 'Lifepath', ['texto do Lifepath']) : ''}<p class="notes">Nada é apagado da ficha: itens perdidos ou gastos no jogo continuam como estão.</p></form>`;
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
        await installCyberware(actor, created);
        delivered = [...delivered, ...newItems.map(item => item.uid)];
      }
      if (checked('lifepath')) await actor.update({ 'system.lifepath': r.lifepath });
      await actor.setFlag(MODULE_ID, 'wiki', { ...link, versao: doc.versao, entregues: delivered });
      await wikiFetch(`/api/personagens/${doc.id}/foundry`, { method: 'PUT', body: { ator: actor.id, nomeAtor: actor.name, versao: doc.versao, entregues: delivered } }).catch(() => null);
      ui.notifications.info(`${actor.name} atualizado da wiki.`);
    },
    rejectClose: false
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

export const wikiApi = { importarDaWiki, atualizarDaWiki, importarPersonagem: importCharacter };

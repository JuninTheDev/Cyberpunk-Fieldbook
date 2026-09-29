// Macros das armas de 2077: ataque Smart, ricochete (Power) e carga Tech.
// Só rolam e explicam no chat: não mudam fichas, munição nem armadura.
const MODULE_ID = 'cpr-2077';
const flag = (item, key) => item.flags?.[MODULE_ID]?.[key];
const escape = text => String(text ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

function selectedActor() {
  const actor = canvas.tokens?.controlled[0]?.actor ?? game.user.character;
  if (!actor) ui.notifications.warn('Selecione o token do personagem (ou defina o personagem do seu usuário).');
  return actor;
}

const weaponsOfClass = (actor, classe) => actor.items.filter(item => flag(item, 'classe') === classe && (item.type === 'weapon' || (item.type === 'cyberware' && item.system.isWeapon)) && item.system.isRanged);
const hasCyberware = (actor, key, pattern) => actor.items.some(item => item.type === 'cyberware' && (flag(item, key) || pattern.test(item.name)));

// d10 do RED: um 10 soma mais um d10; um 1 subtrai mais um d10 (só uma vez).
async function rollD10() {
  const first = await new Roll('1d10').evaluate();
  const rolls = [first];
  let total = first.total;
  let note = '';
  if (first.total === 10 || first.total === 1) {
    const extra = await new Roll('1d10').evaluate();
    rolls.push(extra);
    total = first.total === 10 ? 10 + extra.total : 1 - extra.total;
    note = first.total === 10 ? `sucesso crítico: +${extra.total}` : `falha crítica: −${extra.total}`;
  }
  return { total, rolls, note, natural: first.total };
}

// Dano: dois ou mais 6 nos dados causam lesão crítica (RED p. 187).
async function rollDamage(formula) {
  const roll = await new Roll(formula).evaluate();
  const sixes = roll.dice.flatMap(die => die.results).filter(result => result.result === 6).length;
  return { roll, total: roll.total, critical: sixes >= 2 };
}

// Tabelas de DV do próprio sistema (compêndio "DV Rolltables").
async function dvTable(name) {
  const pack = game.packs.get('cyberpunk-red-core.internal_dv-tables');
  if (!pack || !name) return [];
  const entry = (await pack.getIndex()).find(item => item.name === name);
  if (!entry) return [];
  const table = await pack.getDocument(entry._id);
  return table.results.contents
    .map(result => ({ from: result.range[0], to: result.range[1], dv: Number.parseInt(result.text, 10) }))
    .filter(row => Number.isFinite(row.dv))
    .sort((a, b) => a.from - b.from);
}

const skillBase = (actor, skill) => (actor.system.stats?.ref?.value ?? 0) + (actor.getSkillLevel?.(skill) ?? 0);
const qualityBonus = weapon => weapon.system.quality === 'excellent' ? 1 : 0;
const oneDieLess = formula => formula.replace(/^(\d+)d6/, (match, dice) => `${Math.max(1, Number(dice) - 1)}d6`);

// Diálogo comum: arma, distância (preenche a DV pela tabela), DV, modificador e campos extras.
async function askAttack({ title, weapons, tableFor, extra = '' }) {
  const options = weapons.map(weapon => `<option value="${weapon.id}">${escape(weapon.name)}</option>`).join('');
  const content = `<form class="cpr2077-dialog">
      <div class="form-group"><label>Arma</label><select name="weapon">${options}</select></div>
      <div class="form-group"><label>Distância</label><select name="range"></select></div>
      <div class="form-group"><label>DV</label><input type="number" name="dv" value="15"></div>
      <div class="form-group"><label>Modificador</label><input type="number" name="mod" value="0"></div>
      ${extra}</form>`;
  const fillRanges = async html => {
    const form = html[0].querySelector('form');
    const weapon = weapons.find(item => item.id === form.weapon.value);
    const rows = await dvTable(tableFor(weapon, form));
    form.range.innerHTML = rows.length ? rows.map(row => `<option value="${row.dv}">${row.from}–${row.to} m: DV ${row.dv}</option>`).join('') : '<option value="">(sem tabela: digite a DV)</option>';
    if (rows.length) form.dv.value = rows[0].dv;
  };
  return Dialog.wait({
    title,
    content,
    render: html => {
      const form = html[0].querySelector('form');
      fillRanges(html);
      form.weapon.addEventListener('change', () => fillRanges(html));
      form.querySelectorAll('[data-refresh]').forEach(field => field.addEventListener('change', () => fillRanges(html)));
      form.range.addEventListener('change', () => { if (form.range.value) form.dv.value = form.range.value; });
    },
    buttons: {
      roll: {
        icon: '<i class="fas fa-dice-d10"></i>', label: 'Rolar',
        callback: html => {
          const form = html[0].querySelector('form');
          return { weapon: weapons.find(item => item.id === form.weapon.value), dv: Number(form.dv.value) || 0, mod: Number(form.mod.value) || 0, form };
        }
      }
    },
    default: 'roll',
    close: () => null
  });
}

const line = (label, value) => `<p><b>${label}:</b> ${value}</p>`;
function card({ title, weapon, lines, hit, footer }) {
  return `<div class="cpr2077-chat"><h3>${escape(title)}</h3><p class="cpr2077-chat-weapon">${escape(weapon.name)}</p>${lines.join('')}<p class="cpr2077-chat-result ${hit ? 'hit' : 'miss'}">${hit ? 'Acertou' : 'Errou'}</p>${footer || ''}</div>`;
}
const attackLine = (parts, d10, total, dv) => line('Ataque', `${parts} + 1d10 (${d10.natural}${d10.note ? `, ${d10.note}` : ''}) = <b>${total}</b> contra DV ${dv}`);
const damageLine = (damage, label = 'Dano') => line(label, `<b>${damage.total}</b> (${damage.roll.formula})${damage.critical ? ' · <b>lesão crítica</b> (dois 6)' : ''}`);
const jamLine = (weapon, d10) => weapon.system.quality === 'poor' && d10.natural === 1 ? '<p class="cpr2077-chat-note">Arma de qualidade ruim: a falha crítica emperra a arma (uma Ação para desemperrar).</p>' : '';

async function post(actor, content, rolls) {
  return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content, rolls, sound: CONFIG.sounds.dice });
}

// ---------------- Ataque Smart ----------------
export async function ataqueSmart() {
  const actor = selectedActor();
  if (!actor) return;
  const weapons = weaponsOfClass(actor, 'smart');
  if (!weapons.length) return ui.notifications.warn(`${actor.name} não tem nenhuma arma Smart do compêndio "Armas de 2077".`);
  const answer = await askAttack({
    title: 'Ataque Smart', weapons, tableFor: weapon => weapon.system.dvTable,
    extra: '<div class="form-group"><label>Várias balas Smart (12 + 1d10)</label><input type="checkbox" name="multi"></div>'
  });
  if (!answer) return;
  const { weapon, dv, mod, form } = answer;
  const multi = form.multi.checked || flag(weapon, 'smartMulti');
  const base = multi ? 12 : 10;
  const d10 = await rollD10();
  const total = base + mod + d10.total;
  const hit = total > dv;
  const rolls = [...d10.rolls];
  const lines = [attackLine(`${base}${mod ? ` ${mod > 0 ? '+' : '−'} ${Math.abs(mod)}` : ''}`, d10, total, dv)];
  if (!hasCyberware(actor, 'smartLink', /smart ?(gun )?link/i)) lines.unshift('<p class="cpr2077-chat-note warning">Sem Smart Link instalado: a arma não funciona como Smart.</p>');
  if (hit) { const damage = await rollDamage(weapon.system.damage); rolls.push(damage.roll); lines.push(damageLine(damage)); }
  const footer = `${jamLine(weapon, d10)}<p class="cpr2077-chat-note">Regra inferida das descrições das armas Smart (suplemento p. 30–50). O alvo pode esquivar como de costume.</p>`;
  return post(actor, card({ title: 'Ataque Smart', weapon, lines, hit, footer }), rolls);
}

// ---------------- Ricochete (armas Power) ----------------
const smgLike = ['medPistol', 'heavyPistol', 'vHeavyPistol', 'smg', 'heavySmg'];
export async function ricochete() {
  const actor = selectedActor();
  if (!actor) return;
  const weapons = weaponsOfClass(actor, 'power').filter(weapon => weapon.system.weaponSkill !== 'Autofire');
  if (!weapons.length) return ui.notifications.warn(`${actor.name} não tem nenhuma arma Power (compêndio "Armas de 2077") que faça tiro único.`);
  const answer = await askAttack({ title: 'Ricochete', weapons, tableFor: weapon => smgLike.includes(weapon.system.weaponType) ? 'DV SMG (Autofire)' : 'DV Assault Rifle (Autofire)' });
  if (!answer) return;
  const { weapon, dv, mod } = answer;
  const skill = weapon.system.weaponSkill;
  const coprocessor = hasCyberware(actor, 'ballisticCoprocessor', /ballistic coprocessor/i) ? 2 : 0;
  const base = skillBase(actor, skill) + qualityBonus(weapon) + coprocessor + mod;
  const d10 = await rollD10();
  const total = base + d10.total;
  const hit = total > dv;
  const rolls = [...d10.rolls];
  const parts = `REF + ${escape(skill)}${qualityBonus(weapon) ? ' + 1 (excelente)' : ''}${coprocessor ? ' + 2 (Ballistic Coprocessor)' : ''}${mod ? ` ${mod > 0 ? '+' : '−'} ${Math.abs(mod)}` : ''} = ${base}`;
  const lines = [attackLine(parts, d10, total, dv)];
  if (hit) { const damage = await rollDamage(oneDieLess(weapon.system.damage)); rolls.push(damage.roll); lines.push(damageLine(damage, 'Dano (um dado a menos)')); }
  const footer = `${jamLine(weapon, d10)}<p class="cpr2077-chat-note">Tiro único ricocheteado num alvo atrás de cobertura, cuja posição você conhece. A DV vem da tabela de autofogo (pistolas e SMGs usam a da SMG). Alvos com REF 8+ podem esquivar (suplemento p. 32).</p>`;
  return post(actor, card({ title: 'Ricochete', weapon, lines, hit, footer }), rolls);
}

// ---------------- Carga Tech ----------------
const coverText = {
  none: { label: 'sem cobertura', single: 1, burst: 1, ablation: 4 },
  thin: { label: 'cobertura fina', single: 0.5, burst: 0.25, ablation: 2 },
  thick: { label: 'cobertura grossa', single: 0.25, burst: 0, ablation: 2 }
};
export async function cargaTech() {
  const actor = selectedActor();
  if (!actor) return;
  const weapons = weaponsOfClass(actor, 'tech');
  if (!weapons.length) return ui.notifications.warn(`${actor.name} não tem nenhuma arma Tech do compêndio "Armas de 2077".`);
  const answer = await askAttack({
    title: 'Carga Tech', weapons,
    tableFor: (weapon, form) => form.mode.value === 'burst' ? 'DV SMG (Autofire)' : weapon.system.dvTable,
    extra: `<div class="form-group"><label>Modo</label><select name="mode" data-refresh><option value="single">Tiro único</option><option value="burst">Rajada</option></select></div>
      <div class="form-group"><label>Alvo</label><select name="cover"><option value="none">Sem cobertura</option><option value="thin">Atrás de cobertura fina</option><option value="thick">Atrás de cobertura grossa</option></select></div>`
  });
  if (!answer) return;
  const { weapon, dv, mod, form } = answer;
  const mode = form.mode.value;
  const cover = coverText[form.cover.value];
  const techMode = flag(weapon, 'techModo') || '';
  const burstSize = Number((techMode.match(/rajada de (\d)/) || [])[1] || 0);
  if (mode === 'burst' && !burstSize) return ui.notifications.warn(`${weapon.name} só faz a carga em tiro único (${techMode || 'sem rajada'}).`);
  const skill = mode === 'burst' ? 'Autofire' : weapon.system.weaponSkill;
  const base = skillBase(actor, skill) + (mode === 'burst' ? 0 : qualityBonus(weapon)) + mod;
  const d10 = await rollD10();
  const total = base + d10.total;
  const hit = total > dv;
  const rolls = [...d10.rolls];
  const lines = [line('Modo', mode === 'burst' ? `rajada carregada (até ×${burstSize})` : 'tiro único carregado'), attackLine(`REF + ${escape(skill)} = ${base}`, d10, total, dv)];
  if (hit) {
    const damage = mode === 'burst' ? await rollDamage('2d6') : await rollDamage(weapon.system.damage);
    const multiplier = mode === 'burst' ? Math.min(total - dv, burstSize) : 1;
    const full = damage.total * multiplier;
    const through = Math.floor(full * (mode === 'burst' ? cover.burst : cover.single));
    rolls.push(damage.roll);
    lines.push(damageLine({ ...damage, total: full }, mode === 'burst' ? `Dano (2d6 × ${multiplier})` : 'Dano'));
    if (form.cover.value !== 'none') lines.push(line('Através da cobertura', through ? `<b>${through}</b> chegam ao alvo (${cover.label}); o resto fica na cobertura` : `nada atravessa a ${cover.label}`));
    lines.push(line('Armadura', `se o dano passar da armadura, ela perde <b>${cover.ablation} de SP</b> em vez de 1`));
  }
  const footer = `${jamLine(weapon, d10)}<p class="cpr2077-chat-note">Depois da carga, a arma precisa de <b>uma rodada para esfriar</b> antes de carregar de novo (suplemento p. 32).</p>`;
  return post(actor, card({ title: 'Carga Tech', weapon, lines, hit, footer }), rolls);
}

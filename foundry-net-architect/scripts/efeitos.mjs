// Efeitos do Black ICE na ficha (RED p. 204–207), aplicados pelo mestre ativo quando o ICE acerta (ou ganha na
// velocidade, ou numa desconexão insegura). Com "Efeitos do Black ICE na ficha" desligado, só vão para o registro.
//   Asp: destrói um programa aleatório · Giant: 3d6 no cérebro e desconexão insegura · Hellhound: 2d6 e fogo
//   Kraken: 3d6 e preso até o fim do próximo turno · Liche: −1d6 em INT, REF e DEX (1 hora) · Raven: desativa
//   um defensor e 1d6 · Scorpion: −1d6 no MOVE (1 hora) · Skunk: −2 em Slide · Wisp: 1d6 e −1 Ação NET
//   Dragon, Killer, Sabertooth: dano no REZ de um programa ativo; se cair, é destruído.
import { MODULE_ID, STATUS_FOGO, iceDaChave } from './constantes.mjs';
import * as rolagens from './rolagens.mjs';

export const automatico = () => game.settings.get(MODULE_ID, 'danoAutomatico');
const sorteia = lista => (lista.length ? lista[Math.floor(Math.random() * lista.length)] : null);
const ICONE = nome => `systems/cyberpunk-red-core/icons/netrunning/${nome}.png`;

// Dano no cérebro: direto no HP, sem armadura. O programa Armor ativo tira 4.
export async function danoNoCerebro(ctx, total, fonte = '') {
  const { est, token, corredor, registrar, netrunnerDo } = ctx;
  const actor = token.actor;
  const armor = netrunnerDo(actor).programas.some(programa => programa.system.isRezzed && /^armor$/i.test(programa.name));
  const final = Math.max(0, total - (armor ? 4 : 0));
  const hp = actor.system.derivedStats && actor.system.derivedStats.hp;
  const nota = `${armor ? ' (Armor tirou 4)' : ''}${fonte ? ` · ${fonte}` : ''}`;
  if (hp && automatico()) {
    const novo = Math.max(0, Number(hp.value) - final);
    await actor.update({ 'system.derivedStats.hp.value': novo });
    registrar(est, `${corredor.nome} levou ${final} no cérebro${nota}: HP ${novo}/${hp.max}.`, 'ice');
  } else registrar(est, `${corredor.nome} leva ${final} no cérebro${nota}: aplique no HP.`, 'ice');
  return final;
}

// Programa destruído: sai do deck, fica desativado e com "(destruído)" no nome (o mestre apaga se quiser).
export async function destruirPrograma(actor, programa) {
  const deck = (actor.itemTypes.cyberdeck || []).find(item => (item.system.installedPrograms || []).some(p => p.id === programa.id));
  if (deck && typeof deck.uninstallItems === 'function') {
    try { await deck.uninstallItems([programa]); } catch (error) { console.warn(`${MODULE_ID} | desinstalar ${programa.name}`, error); }
  }
  await programa.update({ name: `${programa.name.replace(/ \(destruído\)$/, '')} (destruído)`, 'system.isRezzed': false, 'system.rez.value': 0, [`flags.${MODULE_ID}.destruido`]: true });
}

// Penalidade por 1 hora (tempo do mundo) como Active Effect na ficha.
async function penalidade(actor, { nome, img, efeito, campos, valor }) {
  await actor.createEmbeddedDocuments('ActiveEffect', [{
    name: nome, img, origin: actor.uuid,
    duration: { seconds: 3600, startTime: game.time.worldTime },
    changes: campos.map(key => ({ key, mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: String(-valor) })),
    // As rolagens do sistema leem a categoria e o "situacional" de cada mudança (CPRMod): sem isso, quebram.
    flags: {
      [MODULE_ID]: { efeito },
      'cyberpunk-red-core': { changes: { cats: Object.fromEntries(campos.map((_, i) => [i, 'stat'])), situational: Object.fromEntries(campos.map((_, i) => [i, { isSituational: false, onByDefault: false }])) } }
    }
  }]);
}

async function rolarSimples(titulo, formula, alias) {
  const roll = await new Roll(formula).evaluate();
  await roll.toMessage({ speaker: { alias }, flavor: titulo });
  return roll.total;
}

// ---------------- Fogo (Hellhound) ----------------
export const emChamas = actor => Boolean(actor && actor.statuses && actor.statuses.has(STATUS_FOGO));
const deckIsolado = actor => (actor.itemTypes.cyberdeck || []).some(deck => {
  const instalados = typeof deck.getInstalledItems === 'function' ? deck.getInstalledItems() : [];
  return instalados.some(item => /insulated/i.test(item.name));
});
export async function incendiar(actor) {
  if (emChamas(actor) || deckIsolado(actor)) return false;
  await actor.toggleStatusEffect(STATUS_FOGO, { active: true });
  return true;
}
export async function apagarFogo(actor) {
  if (emChamas(actor)) await actor.toggleStatusEffect(STATUS_FOGO, { active: false });
}
// 2 de dano no HP no fim de cada turno de quem está em chamas (vale também fora da NET).
export async function queimar(actor, alias) {
  if (!emChamas(actor)) return 0;
  const hp = actor.system.derivedStats && actor.system.derivedStats.hp;
  if (!hp) return 0;
  const novo = Math.max(0, Number(hp.value) - 2);
  if (automatico()) await actor.update({ 'system.derivedStats.hp.value': novo });
  await ChatMessage.create({ speaker: { alias: alias || actor.name }, content: `<p><b>${actor.name}</b> está em chamas: ${automatico() ? `2 de dano no HP (fica com ${novo}/${hp.max})` : '2 de dano no HP (aplique)'}. Uma Ação Carnal apaga o fogo.</p>` });
  return 2;
}

// ---------------- O efeito de cada Black ICE ----------------
export async function aplicarEfeitoDoIce(ctx, conteudo) {
  const { est, token, corredor, registrar, netrunnerDo } = ctx;
  const actor = token.actor;
  const chave = conteudo.ice || '';
  const ice = iceDaChave(chave);
  registrar(est, `${ice.nome}: ${ice.efeito}`, 'ice');
  const auto = automatico();
  const programas = () => netrunnerDo(actor).programas.filter(programa => !programa.getFlag(MODULE_ID, 'destruido'));
  const rolarDano = titulo => rolagens.dano({ titulo: `${ice.nome}: ${titulo}`, formula: ice.dano || '1d6', alias: ice.nome });
  switch (chave) {
    case 'asp': {
      const alvo = sorteia(programas());
      if (!alvo) registrar(est, 'O Asp não achou programa no deck.', 'info');
      else if (auto) { const nome = alvo.name; await destruirPrograma(actor, alvo); registrar(est, `O Asp destruiu ${nome}.`, 'ice'); }
      else registrar(est, `O Asp destrói ${alvo.name} (aplique na ficha).`, 'ice');
      return;
    }
    case 'raven': {
      const alvo = sorteia(programas().filter(programa => programa.system.isRezzed && programa.system.class === 'defender'));
      if (alvo && auto) { await alvo.update({ 'system.isRezzed': false }); registrar(est, `O Raven desativou ${alvo.name}.`, 'ice'); }
      await danoNoCerebro(ctx, await rolarDano('dano no cérebro'), 'Raven');
      return;
    }
    case 'liche':
    case 'scorpion': {
      const valor = await rolarSimples(`${ice.nome}: ${chave === 'liche' ? '−1d6 em INT, REF e DEX' : '−1d6 no MOVE'} por 1 hora`, '1d6', ice.nome);
      const campos = chave === 'liche' ? ['system.stats.int.value', 'system.stats.ref.value', 'system.stats.dex.value'] : ['system.stats.move.value'];
      if (auto) await penalidade(actor, { nome: `${ice.nome} (−${valor}, 1 hora)`, img: ICONE(ice.nome), efeito: chave, campos, valor });
      registrar(est, `${corredor.nome}: −${valor} em ${chave === 'liche' ? 'INT, REF e DEX' : 'MOVE'} por 1 hora${auto ? '' : ' (aplique na ficha)'}.`, 'ice');
      return;
    }
    case 'skunk': {
      corredor.skunks = [...new Set([...(corredor.skunks || []), conteudo.chave])];
      registrar(est, `${corredor.nome} leva −2 em Slide enquanto este Skunk estiver ativo.`, 'ice');
      return;
    }
    case 'kraken': {
      await danoNoCerebro(ctx, await rolarDano('dano no cérebro'), 'Kraken');
      corredor.preso = 2;
      registrar(est, `O Kraken prende ${corredor.nome}: até o fim do próximo turno, não avança nem desconecta com segurança.`, 'ice');
      return;
    }
    case 'giant': {
      await danoNoCerebro(ctx, await rolarDano('dano no cérebro'), 'Giant');
      corredor.expulso = conteudo.chave;
      return;
    }
    case 'hellhound': {
      await danoNoCerebro(ctx, await rolarDano('dano no cérebro'), 'Hellhound');
      if (auto) {
        const pegou = await incendiar(actor);
        registrar(est, pegou ? `${corredor.nome} pegou fogo: 2 no HP no fim de cada turno, até gastar uma Ação Carnal para se apagar.` : `O fogo do Hellhound não pegou (deck isolado ou já em chamas).`, 'ice');
      }
      return;
    }
    case 'wisp': {
      await danoNoCerebro(ctx, await rolarDano('dano no cérebro'), 'Wisp');
      corredor.menosAcoes = 1;
      return;
    }
    case 'dragon':
    case 'killer':
    case 'sabertooth': {
      const alvo = sorteia(programas().filter(programa => programa.system.isRezzed));
      if (!alvo) { registrar(est, `O ${ice.nome} não achou programa ativo para atacar.`, 'info'); return; }
      const total = await rolarDano('dano no programa');
      const rez = Math.max(0, (Number(alvo.system.rez && alvo.system.rez.value) || 0) - total);
      if (!auto) { registrar(est, `${alvo.name} leva ${total} de REZ (aplique; se cair, é destruído).`, 'ice'); return; }
      if (rez <= 0) { const nome = alvo.name; await destruirPrograma(actor, alvo); registrar(est, `${nome} levou ${total} de REZ, caiu e foi destruído.`, 'ice'); }
      else { await alvo.update({ 'system.rez.value': rez }); registrar(est, `${alvo.name} levou ${total} de REZ (fica com ${rez}).`, 'ice'); }
      return;
    }
    default:
      await danoNoCerebro(ctx, await rolarDano('dano no cérebro'), ice.nome);
  }
}

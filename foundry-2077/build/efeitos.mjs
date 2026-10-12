// Efeitos ativos dos itens de 2077: o que a descrição promete, aplicado pelo próprio sistema.
//
// Três jeitos de aplicar, conforme o texto do suplemento:
//  - sempre: o bônus vale enquanto o implante estiver instalado (ou a arma equipada);
//  - situacional: o bônus aparece como opção na janela de rolagem, para marcar quando a condição valer;
//  - desligado: bônus fora das rolagens (SP, MOVE, STAT) que só vale às vezes; o jogador liga o efeito na ficha.
// Berserk e Sandevistan vêm desligados: ativar o sistema operacional é ligar o efeito.
import { effectDoc, keyEffects } from './lib.mjs';

// Categoria de cada chave, como no CPR.activeEffectKeys do sistema.
const categories = {
  'bonuses.initiative': 'combat', 'bonuses.aimedShot': 'combat', 'bonuses.singleShot': 'combat', 'bonuses.melee': 'combat',
  'bonuses.ranged': 'combat', 'bonuses.autofire': 'combat', 'bonuses.universalDamage': 'combat',
  'bonuses.universalDamageReduction': 'combat', 'bonuses.deathSavePenalty': 'combat',
  'bonuses.evasion': 'skill', 'bonuses.perception': 'skill', 'bonuses.athletics': 'skill', 'bonuses.stealth': 'skill',
  'bonuses.defense': 'netrun', 'bonuses.hasPainSuppression': 'misc'
};
const category = key => key.startsWith('system.stats.') ? 'stat' : categories[key];

// Atalhos para escrever a tabela.
const add = (key, value) => ({ key, value });
const situational = (key, value, onByDefault = false) => ({ key, value, situational: true, onByDefault });
const painSuppression = { key: 'bonuses.hasPainSuppression', value: 1, mode: 5 };
const stat = (name, value) => add(`system.stats.${name}.value`, value);
const sniperScope = [situational('bonuses.singleShot', 1), situational('bonuses.aimedShot', 1)];

// nome do item → { usage?, efeitos: [{ nome, desligado?, descricao, mods }] }
const table = {
  // ---------------- Cyberware ----------------
  'Adrenaline Converter': { efeitos: [{ nome: 'Adrenaline Converter', descricao: '+2 na iniciativa.', mods: [add('bonuses.initiative', 2)] }] },
  'Kerenzikov (2077)': { efeitos: [{ nome: 'Kerenzikov (2077)', descricao: '+1 em tiros mirados.', mods: [add('bonuses.aimedShot', 1)] }] },
  'Reflex Tuner': { efeitos: [{ nome: 'Reflex Tuner (depois de ser atingido)', descricao: '+1 para se esquivar pelo resto da rodada depois de ser atingido.', mods: [situational('bonuses.evasion', 1)] }] },
  Stabber: { efeitos: [{ nome: 'Stabber (arma de lâmina)', descricao: '+1 de dano com armas de lâmina.', mods: [situational('bonuses.universalDamage', 1)] }] },
  'Visual Cortex Support': { efeitos: [{ nome: 'Visual Cortex Support', descricao: '+1 em Percepção.', mods: [add('bonuses.perception', 1)] }] },
  'TeleOptics (2077)': { efeitos: [{ nome: 'TeleOptics (alvo a 51 m ou mais)', descricao: '+1 em tiro único ou mirado contra alvos a 51 m ou mais. Não acumula com a mira de sniper da arma.', mods: [situational('bonuses.singleShot', 1), situational('bonuses.aimedShot', 1)] }] },
  'Clutch Padding': { efeitos: [{ nome: 'Clutch Padding (1 vez a cada 24 h)', descricao: 'Ignora o primeiro aumento da penalidade do Death Save. Depois, 24 horas para recarregar.', mods: [situational('bonuses.deathSavePenalty', -1)] }] },
  'Epimorphic Skeleton / Titanium Bones': { efeitos: [{ nome: 'Epimorphic Skeleton', descricao: '+2 BODY (até 10), como o Grafted Muscle and Bone Lace.', mods: [stat('body', 2)] }] },
  'Kinetic Frame / Scarab': { efeitos: [{ nome: 'Kinetic Frame (se não se moveu)', desligado: true, descricao: '+1 de SP se você não se moveu. Ligue enquanto estiver parado.', mods: [add('bonuses.universalDamageReduction', 1)] }] },
  ThreatEvac: { efeitos: [{ nome: 'ThreatEvac (2 turnos ao ficar Gravemente Ferido)', desligado: true, descricao: 'Ao ficar Gravemente Ferido, ignora os efeitos do estado de ferimento e das lesões críticas por dois turnos. Ligue quando disparar; recarrega em 24 horas.', mods: [painSuppression] }] },
  Carapace: { efeitos: [{ nome: 'Carapace (ataque de lado ou de trás)', desligado: true, descricao: '+1 de SP contra ataques de lado ou de trás.', mods: [add('bonuses.universalDamageReduction', 1)] }] },
  'Nano-plating': { efeitos: [{ nome: 'Nano-plating (depois de ser atingido ou de se mover)', desligado: true, descricao: '+1 de SP depois de ser atingido ou de se mover, até o início do seu próximo turno.', mods: [add('bonuses.universalDamageReduction', 1)] }] },
  ProxiShield: { efeitos: [{ nome: 'ProxiShield (contra corpo a corpo)', desligado: true, descricao: '+1 de SP contra ataques corpo a corpo.', mods: [add('bonuses.universalDamageReduction', 1)] }] },
  RangeGuard: { efeitos: [{ nome: 'RangeGuard (contra ataques à distância)', desligado: true, descricao: '+1 de SP contra ataques à distância.', mods: [add('bonuses.universalDamageReduction', 1)] }] },
  'Pain Editor (2077)': { efeitos: [{ nome: 'Pain Editor (2077)', descricao: 'Ignora as penalidades de Gravemente Ferido.', mods: [painSuppression] }] },
  Microgenerator: { efeitos: [{ nome: 'Microgenerator (segundo ataque corpo a corpo)', descricao: '+1 no segundo ataque corpo a corpo depois do primeiro.', mods: [situational('bonuses.melee', 1)] }] },
  'Shock Absorber': { efeitos: [{ nome: 'Shock Absorber', descricao: '+2 no teste de autofogo.', mods: [add('bonuses.autofire', 2)] }] },
  "Jenkins' Tendons": { efeitos: [{ nome: "Jenkins' Tendons (em linha reta)", desligado: true, descricao: '+2 de MOVE andando em linha reta.', mods: [stat('move', 2)] }] },
  'Leeroy Ligament System': { efeitos: [{ nome: 'Leeroy Ligament System', descricao: '+2 de MOVE.', mods: [stat('move', 2)] }] },
  'Lynx Paws': { efeitos: [{ nome: 'Lynx Paws (mover-se em silêncio)', descricao: '+2 em Furtividade para se mover em silêncio.', mods: [situational('bonuses.stealth', 2)] }] },

  // ---------------- Berserk e Sandevistan: ativar = ligar o efeito ----------------
  'Biodyne Berserk': { usage: 'toggled', efeitos: [{ nome: 'Biodyne Berserk ativo', desligado: true, descricao: '+3 BODY e MOVE (BODY até 10); ignora Gravemente Ferido. SP 11 e +1 de dano corpo a corpo por dado: aplique à parte.', mods: [stat('body', 3), stat('move', 3), painSuppression] }] },
  'Militech Berserk': { usage: 'toggled', efeitos: [{ nome: 'Militech Berserk ativo', desligado: true, descricao: '+4 BODY e MOVE; ignora Gravemente e Mortalmente Ferido. SP 11, +2 de dano corpo a corpo por dado e a regeneração: aplique à parte.', mods: [stat('body', 4), stat('move', 4), painSuppression] }] },
  'Moore Tech Berserk': { usage: 'toggled', efeitos: [{ nome: 'Moore Tech Berserk ativo', desligado: true, descricao: '+2 BODY e MOVE (BODY até 10); ignora Gravemente Ferido; +1 de dano corpo a corpo e de arremesso. SP 7: aplique à parte.', mods: [stat('body', 2), stat('move', 2), painSuppression, situational('bonuses.universalDamage', 1, true)] }] },
  'Zetatech Berserk': { usage: 'toggled', efeitos: [{ nome: 'Zetatech Berserk ativo', desligado: true, descricao: '+3 BODY e MOVE (BODY até 10); ignora Gravemente Ferido; +3 de dano corpo a corpo e de arremesso. SP 12 sem ablação: aplique à parte.', mods: [stat('body', 3), stat('move', 3), painSuppression, situational('bonuses.universalDamage', 3, true)] }] },
  'Dynalar Sandevistan': { usage: 'toggled', efeitos: [{ nome: 'Dynalar Sandevistan ativo', desligado: true, descricao: '+2 DEX, REF e MOVE (DEX e REF até 10).', mods: [stat('dex', 2), stat('ref', 2), stat('move', 2)] }] },
  'Militech Falcon Sandevistan': { usage: 'toggled', efeitos: [{ nome: 'Militech Falcon Sandevistan ativo', desligado: true, descricao: '+3 DEX, REF e MOVE (DEX e REF até 10).', mods: [stat('dex', 3), stat('ref', 3), stat('move', 3)] }] },
  'QianT Warp Dancer Sandevistan': { usage: 'toggled', efeitos: [{ nome: 'QianT Warp Dancer Sandevistan ativo', desligado: true, descricao: '+2 DEX, REF e MOVE (DEX e REF até 10).', mods: [stat('dex', 2), stat('ref', 2), stat('move', 2)] }] },
  'Zetatech Sandevistan': { usage: 'toggled', efeitos: [{ nome: 'Zetatech Sandevistan ativo', desligado: true, descricao: '+2 DEX, REF e MOVE (DEX e REF até 10).', mods: [stat('dex', 2), stat('ref', 2), stat('move', 2)] }] },

  // ---------------- Armas: valem com a arma equipada ----------------
  'Budget Arms Guillotine': { efeitos: [{ nome: 'Mira de sniper (alvo a mais de 50 m)', descricao: '+1 em tiro único ou mirado contra alvos a mais de 50 m.', mods: sniperScope }] },
  'Midnight Arms SOR-22': { efeitos: [{ nome: 'Mira de sniper (alvo a mais de 50 m)', descricao: '+1 em tiro único ou mirado contra alvos a mais de 50 m.', mods: sniperScope }] },
  'Militech M-179 Achilles': { efeitos: [{ nome: 'Mira de sniper (alvo a mais de 50 m)', descricao: '+1 em tiro único ou mirado contra alvos a mais de 50 m.', mods: sniperScope }] },
  'Techtronika SPT32 Grad': { efeitos: [{ nome: 'Mira de sniper (alvo a mais de 50 m)', descricao: '+1 em tiro único ou mirado contra alvos a mais de 50 m.', mods: sniperScope }] },
  'Tsunami Nekomata': { efeitos: [{ nome: 'Mira de sniper (alvo a mais de 50 m)', descricao: '+1 em tiro único ou mirado contra alvos a mais de 50 m.', mods: sniperScope }] },
  'Arasaka Nowaki': { efeitos: [{ nome: 'Arasaka Nowaki (entre 13 e 50 m)', descricao: '+1 em tiros únicos entre 13 e 50 m.', mods: [situational('bonuses.singleShot', 1)] }] },
  'Arasaka HJSH-18 Masamune': { efeitos: [{ nome: 'Arasaka Masamune (entre 13 e 50 m)', descricao: '+1 em tiros únicos entre 13 e 50 m.', mods: [situational('bonuses.singleShot', 1)] }] },
  'Tsunami Kyubi': { efeitos: [{ nome: 'Tsunami Kyubi (entre 13 e 50 m)', descricao: '+1 em tiros únicos ou mirados entre 13 e 50 m.', mods: [situational('bonuses.singleShot', 1), situational('bonuses.aimedShot', 1)] }] },
  'Techtronika VST-37 Pozhar': { efeitos: [{ nome: 'Pozhar: coice no autofogo', descricao: '−2 no teste de autofogo com a Pozhar (vem marcado; desmarque se atirar com outra arma).', mods: [situational('bonuses.autofire', -2, true)] }] },
  'Kang Tao G-58 Dian': { efeitos: [{ nome: 'Kang Tao Dian: coronha recolhida', descricao: '−1 nos ataques com a coronha recolhida, até estendê-la de novo (uma Ação).', mods: [situational('bonuses.ranged', -1)] }] },

  // ---------------- White ICE: soma o Rating na defesa NET ----------------
  'Heaven Pup': { usage: 'toggled', efeitos: [{ nome: 'Heaven Pup (Rating 1)', descricao: '+1 nos testes NET de defesa.', mods: [add('bonuses.defense', 1)] }] },
  'Heaven Dog': { usage: 'toggled', efeitos: [{ nome: 'Heaven Dog (Rating 2)', descricao: '+2 nos testes NET de defesa.', mods: [add('bonuses.defense', 2)] }] },
  'Heaven Hound': { usage: 'toggled', efeitos: [{ nome: 'Heaven Hound (Rating 3)', descricao: '+3 nos testes NET de defesa.', mods: [add('bonuses.defense', 3)] }] },
  'Kami Chip': { usage: 'toggled', efeitos: [{ nome: 'Kami Chip (Rating 4)', descricao: '+4 nos testes NET de defesa.', mods: [add('bonuses.defense', 4)] }] }
};

// Uso padrão por tipo de item: implante vale instalado; arma, equipada.
const defaultUsage = { cyberware: 'installed', weapon: 'equipped', program: 'toggled' };

// Devolve { usage, effects } do item, ou null se ele não tiver efeito mecânico.
export function effectsFor(name, type, img) {
  const entry = table[name];
  if (!entry) return null;
  return {
    usage: entry.usage || defaultUsage[type],
    effects: entry.efeitos.map(effect => effectDoc({
      seed: `${name}:${effect.nome}`, name: effect.nome, img, disabled: Boolean(effect.desligado), description: effect.descricao,
      changes: effect.mods.map(mod => ({ ...mod, category: category(mod.key) }))
    }))
  };
}

export const effectItemNames = () => Object.keys(table);

// Põe os efeitos e o uso (instalado, equipado, ligado) num item já montado.
export function applyEffects(item) {
  const found = effectsFor(item.name, item.type, item.img);
  if (!found) return item;
  item.system.usage = found.usage;
  item.effects = found.effects;
  // Uma linha na descrição diz como cada efeito funciona na ficha.
  const how = effect => {
    const flags = Object.values(effect.flags['cyberpunk-red-core'].changes.situational);
    if (effect.disabled) return found.usage === 'toggled' ? 'vem desligado: ligue o efeito ao ativar' : 'vem desligado: ligue o efeito na ficha quando a condição valer';
    if (flags.every(flag => flag.isSituational)) return 'aparece como opção na janela de rolagem';
    return { installed: 'vale com o implante instalado', equipped: 'vale com a arma equipada', toggled: 'vale enquanto o efeito estiver ligado' }[found.usage];
  };
  const lines = found.effects.map(effect => `${effect.description} <i>(${how(effect)})</i>`).join(' ');
  item.system.description.value += `<p><b>Efeito na ficha:</b> ${lines}</p>`;
  return keyEffects(item);
}

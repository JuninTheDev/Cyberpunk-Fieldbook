// O conteúdo do suplemento de fã "Cyberpunk 2077" que a mesa usa: armas (e as flechettes das armas Tech), cyberware e
// netrunning (cyberdecks, quickhacks e daemons). Vem da própria wiki (system-2077.js e system-net.js), os mesmos dados de
// que o módulo cpr-2077 gera os compêndios do Foundry 12 (foundry-2077/build): as regras de conversão são as dele, e os
// ids são os da loja da wiki ("armas-2077:<nome>", "cyberware-2077:<nome>", "netrunning-2077:<nome>").
// As regras próprias de 2077 (ricochete, carga Tech, teste Smart) ainda não estão neste sistema: a classe e as opções de
// cada arma ficam na flag arma2077, para quando estiverem.
// Uso: chamado por build/conteudo.mjs.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const SUPLEMENTO = 'Cyberpunk 2077 (suplemento)';
const SISTEMA = 'cpr-fieldbook';

// Os dados de 2077 como a página da wiki os carrega (os arquivos penduram em window).
function dadosDaWiki(raizDaWiki) {
  const contexto = { window: {} };
  for (const arquivo of ['system-catalog.js', 'system-rules.js', 'system-net.js', 'system-2077.js']) {
    vm.runInNewContext(fs.readFileSync(path.join(raizDaWiki, arquivo), 'utf8'), contexto);
  }
  const { system2077, systemNet } = contexto.window;
  return { armas: system2077.data.weapons, cyberware: system2077.data.cyberware, net: systemNet.data };
}

// Como no cpr-2077 (build/lib.mjs): o primeiro número do preço, sem o ponto dos milhares; e a perda de Humanidade, o valor
// fixo do suplemento com a rolagem equivalente do RED (2d6 ≈ 7, 4d6 ≈ 14).
const precoEm = texto => {
  const numero = String(texto).replace(/\.(?=\d{3})/g, '').match(/\d+/);
  return numero ? Number(numero[0]) : null;
};
function perdaDeHumanidade(texto) {
  const media = parseInt(String(texto), 10) || 0;
  const formula = { 0: '0', 2: '1d6/2', 3: '1d6', 7: '2d6', 14: '4d6', 21: '6d6' }[media] ?? `${Math.max(1, Math.round(media / 3.5))}d6`;
  return { formula, media, sofrida: 0 };
}
const paragrafo = (html, rotulo) => (html ? `<p>${rotulo ? `<b>${rotulo}:</b> ` : ''}${html}</p>` : '');
const fonteNaWiki = pagina => `<p><i>Suplemento Cyberpunk 2077, p. ${pagina}.</i></p>`;
const fonte = pagina => ({ livro: SUPLEMENTO, pagina });
const NUMEROS = { um: 1, uma: 1, dois: 2, duas: 2, três: 3 };

// ---------------- Armas (suplemento p. 32–50) ----------------
const PAGINA_DO_GRUPO = { pistols: 32, revolvers: 35, smgs: 38, shotguns: 40, rifles: 44, machineGuns: 47, snipers: 48 };
const TIPOS_DE_ARMA = [
  [/^pistola média/, 'medPistol'], [/^pistola pesada/, 'heavyPistol'], [/^pistola muito pesada/, 'vHeavyPistol'], [/^smg pesada/, 'heavySmg'],
  [/^smg/, 'smg'], [/^espingarda/, 'shotgun'], [/^rifle de assalto/, 'assaultRifle'], [/^metralhadora/, 'assaultRifle'], [/^rifle (de precisão|sniper)/, 'sniperRifle']
];
const TABELA_DV = {
  medPistol: 'DV Pistol', heavyPistol: 'DV Pistol', vHeavyPistol: 'DV Pistol', smg: 'DV SMG', heavySmg: 'DV SMG', shotgun: 'DV Shotgun (Slug)',
  assaultRifle: 'DV Assault Rifle', sniperRifle: 'DV Sniper Rifle'
};
const MUNICAO_PADRAO = {
  medPistol: ['medPistol'], heavyPistol: ['heavyPistol'], vHeavyPistol: ['vHeavyPistol'], smg: ['medPistol'], heavySmg: ['heavyPistol'], shotgun: ['shotgunShell'],
  assaultRifle: ['rifle'], sniperRifle: ['rifle']
};
const PERICIAS = { 'Armas de uma Mão': 'handgun', 'Armas de Ombro': 'shoulder-arms', 'Armas Pesadas': 'heavy-weapons', 'Disparo Automático': 'autofire', 'Armas Brancas': 'melee-weapon' };
const QUALIDADES = { padrão: 'standard', ruim: 'poor', excelente: 'excellent' };
const REGRA_DA_CLASSE = {
  power: 'Power: o modo Ricochete (tiro único num alvo atrás de cobertura).',
  tech: 'Tech: a carga Tech (atravessa cobertura e abla a armadura). Usa flechettes.',
  smart: 'Smart: só dispara com o cyberware Smart Link; o tiro único é o teste Smart (10 + 1d10).'
};
// Armas que o livro só descreve em texto: o dano e a DV do autofogo seguem a Tsunami Arms Helix do livro-base.
const SO_AUTOFOGO = new Set(['Constitutional Arms M2067 Defender', 'Militech Mk.31 HMG']);

function arma(raw, grupo) {
  const tipoNaWiki = raw.kind.toLowerCase();
  const [, tipo] = TIPOS_DE_ARMA.find(([padrao]) => padrao.test(tipoNaWiki));
  const classe = /smart/i.test(raw.kind) ? 'smart' : /tech/i.test(raw.kind) ? 'tech' : 'power';
  const exotica = /exótic/.test(tipoNaWiki);
  const qualidade = QUALIDADES[raw.quality] || 'standard';
  const recursos = raw.features && raw.features !== '—' ? raw.features : '';
  const soAutofogo = SO_AUTOFOGO.has(raw.name);
  const pericia = soAutofogo ? 'autofire' : PERICIAS[raw.skill.split(' (')[0]];
  if (!pericia) throw new Error(`Perícia desconhecida em ${raw.name}: ${raw.skill}`);
  const municoes = /cartucho/.test(raw.magazine) ? ['shotgunShell'] : /balote/.test(raw.magazine) ? ['shotgunSlug', 'shotgunShell']
    : /pistola média/.test(raw.magazine) ? ['medPistol'] : /pistola pesada/.test(raw.magazine) ? ['heavyPistol'] : /rifle/.test(raw.magazine) ? ['rifle'] : MUNICAO_PADRAO[tipo];
  const slotsNoTexto = `${raw.text} ${recursos}`.match(/(\d|um|uma|dois|duas|três) slots? de acessório/i);
  const slots = /sem acessórios/i.test(recursos) ? 0 : slotsNoTexto ? (NUMEROS[slotsNoTexto[1].toLowerCase()] ?? Number(slotsNoTexto[1])) : exotica ? 0 : 3;
  const textoCompleto = `${raw.text} ${raw.tip || ''}`;
  const pagina = PAGINA_DO_GRUPO[grupo];
  return {
    name: raw.name, type: 'arma', img: 'icons/svg/target.svg',
    system: {
      descricao: `<p><b>${raw.kind}</b> · qualidade ${raw.quality}</p>${paragrafo(raw.text)}${paragrafo(recursos, 'Recursos')}${paragrafo(REGRA_DA_CLASSE[classe], 'Classe')}`
        + `${paragrafo('as regras de 2077 (ricochete, carga Tech e teste Smart) ainda não estão neste sistema: veja a página de 2077 da wiki.', 'Neste sistema')}`
        + `${paragrafo(raw.tip, 'Na mesa')}${fonteNaWiki(pagina)}`,
      tipo, pericia, dano: soAutofogo ? '2d6' : (String(raw.damage).match(/\d+d6/) || ['3d6'])[0], cdt: Number(raw.rof) || 1,
      pente: { value: 0, max: parseInt(raw.magazine, 10) || 0 }, municoes, aDistancia: true, maos: parseInt(raw.hands, 10) || 1,
      autofogo: soAutofogo ? 4 : Number((recursos.match(/autofogo \((\d)\)/i) || [])[1] || 0), supressivo: /supressivo/i.test(recursos),
      // Como as armas excelentes do livro-base: +1 no ataque (RED p. 342).
      bonusAtaque: qualidade === 'excellent' ? 1 : 0, qualidade, ocultavel: /^sim/i.test(raw.conceal),
      tabelaDV: soAutofogo ? 'DV Assault Rifle (Autofire)' : TABELA_DV[tipo], ignorarArmadura: 0, ignorarAbaixo: 0, slots, equipada: false,
      preco: precoEm(raw.cost) ?? 500, fonte: fonte(pagina)
    },
    flags: {
      [SISTEMA]: {
        arma2077: {
          classe, exotica, grupo,
          // Smart: várias balas (12 + 1d10), a Kappa (dois alvos), a Palica (dois canos).
          smartVariasBalas: /12 \+ 1d10/.test(textoCompleto) && !/dois canos/i.test(textoCompleto),
          smartDoisAlvos: classe === 'smart' && /dois alvos/i.test(textoCompleto),
          smartDoisCanos: classe === 'smart' && /dois canos/i.test(textoCompleto),
          // Tech: a rajada da carga (0: só tiro único).
          techRajada: classe === 'tech' ? Number((recursos.match(/carga Tech \(rajada de (\d)\)/i) || [])[1] || 0) : 0,
          // Power: as que só disparam rajadas de três não ricocheteiam.
          semRicochete: classe === 'power' && (/só rajada de três balas/i.test(recursos) || pericia === 'autofire'),
          coronhaRetratil: /coronha recolhida/i.test(textoCompleto)
        }
      }
    }
  };
}

// Flechettes das armas Tech: as mesmas regras e o preço da munição perfurante do calibre (suplemento p. 31).
const FLECHETTES = [
  ['core_ammo:medium-pistol-armor-piercing', 'pistola média'], ['core_ammo:heavy-pistol-armor-piercing', 'pistola pesada'],
  ['core_ammo:very-heavy-pistol-armor-piercing', 'pistola muito pesada'], ['core_ammo:rifle-armor-piercing', 'rifle'], ['core_ammo:shotgun-slug-armor-piercing', 'espingarda']
];
function flechettes(itensDoCore) {
  return FLECHETTES.map(([id, calibre]) => {
    const base = structuredClone(itensDoCore[id]);
    if (!base) throw new Error(`O catálogo do CORE não tem ${id}, molde das flechettes.`);
    return {
      ...base, name: `Flechettes Tech (${calibre})`,
      system: {
        ...base.system, fonte: fonte(31),
        descricao: `<p>Munição das armas <b>Tech</b> de ${calibre}. As armas Tech não aceitam pente maior e usam flechettes, que custam e ablam como a munição perfurante das armas Power.</p>${fonteNaWiki(31)}`
      },
      effects: [], flags: { [SISTEMA]: { arma2077: { classe: 'tech' } } }
    };
  });
}

// ---------------- Cyberware (suplemento p. 27–30, 13 e 24–26) ----------------
const INSTALACOES = { Loja: 'mall', Clínica: 'clinic', Hospital: 'hospital' };
// Categoria da wiki → [tipo de cyberware, é base (abre slots)?]. A ordem importa: "Cyberware externo (placa base)" é base.
const CATEGORIAS = [
  [/^Fashionware/, 'fashionware', false], [/^Neuralware/, 'neuralWare', false], [/^Cyberóptico \(base\)/, 'cyberEye', true], [/^Cyberóptico \(opção\)/, 'cyberEye', false],
  [/^Cyberware interno/, 'cyberwareInternal', false], [/placa base/, 'cyberwareExternal', true], [/^Opção de placa/, 'cyberwareExternal', false],
  [/^Cyberware externo/, 'cyberwareExternal', false], [/^Opção de cyberbraço|^Cyberbraços/, 'cyberArm', false], [/^Opção de cyberperna/, 'cyberLeg', false]
];
const PAGINA_DO_CYBERWARE = { fashionware: 27, neural: 27, optics: 28, internal: 28, external: 29, limbs: 30 };

function cyberware(raw, grupo) {
  const [, tipo, fundacional] = CATEGORIAS.find(([padrao]) => padrao.test(raw.category));
  const texto = String(raw.text ?? '').replace(/<[^>]+>/g, '');
  const pagina = PAGINA_DO_CYBERWARE[grupo];
  return {
    name: raw.name, type: 'cyberware', img: 'icons/svg/clockwork.svg',
    system: {
      descricao: `<p><b>${raw.category}</b> · instalação: ${raw.install} · Humanidade ${raw.humanity} · ${raw.cost}</p>${paragrafo(raw.text)}${paragrafo(raw.tip, 'Na mesa')}${fonteNaWiki(pagina)}`,
      tipo, fundacional, tamanho: fundacional ? 0 : /ocupa dois slots/i.test(texto) ? 2 : 1, perdaHumanidade: perdaDeHumanidade(raw.humanity),
      local: INSTALACOES[raw.install] || 'clinic', instalado: false, preco: precoEm(raw.cost) ?? 0, fonte: fonte(pagina)
    }
  };
}

// Cartões (neuralware de netrunning, Berserk e Sandevistan): { name, tag, stats: [[rótulo, valor]], text, extra, tip }.
const doCartao = (cartao, rotulo) => (cartao.stats.find(([nome]) => nome === rotulo) || [])[1];
const detalhes = cartao => cartao.stats.map(([rotulo, valor]) => `${rotulo}: ${valor}`).join(' · ');
function cyberwareDoCartao(cartao, categoria, pagina) {
  return {
    name: cartao.name, type: 'cyberware', img: 'icons/svg/clockwork.svg',
    system: {
      descricao: `<p><b>${categoria}</b> · ${detalhes(cartao)}</p>${paragrafo(cartao.text)}${cartao.extra || ''}${paragrafo(cartao.tip, 'Na mesa')}${fonteNaWiki(pagina)}`,
      tipo: 'neuralWare', fundacional: false, tamanho: 1, perdaHumanidade: perdaDeHumanidade(doCartao(cartao, 'Perda de Humanidade')), local: 'clinic', instalado: false,
      preco: precoEm(doCartao(cartao, 'Custo') ?? doCartao(cartao, 'Preço')) ?? 0, fonte: fonte(pagina)
    }
  };
}

// ---------------- Netrunning (suplemento p. 13–23) ----------------
const QUALIDADE_DO_DECK = { Excelente: 'excellent', Padrão: 'standard', Ruim: 'poor' };
// Linha da tabela de cyberdecks: [fabricante, modelo, RAM, slots, cooling, qualidade e especialidade, custo, descrição].
function deck([fabricante, modelo, ram, slots, resfriamento, especial, custo, sabor]) {
  return {
    name: `${fabricante} ${modelo}`, type: 'cyberdeck', img: 'icons/svg/net.svg',
    system: {
      descricao: `<p><b>Cyberdeck de 2077</b> · RAM ${ram} · slots ${slots} · Cooling ${resfriamento} · ${custo}</p><p>${especial}</p><p><i>${sabor}</i></p>`
        + '<p>Em 2077 o cyberdeck é um <b>sistema operacional instalado no Neural Link</b>, sem perda de Humanidade. A <b>RAM</b> paga os quickhacks; o <b>Cooling</b> é quanta RAM volta por rodada.</p>'
        + fonteNaWiki(14),
      slots: Number(slots) || 0, ram: Number(ram) || 0, resfriamento: Number(resfriamento) || 0, qualidade: QUALIDADE_DO_DECK[especial.split('.')[0]] || 'standard',
      uso: 'carregando', preco: precoEm(custo) ?? 500, fonte: fonte(14)
    }
  };
}
// Quickhacks e daemons viram programas: o sistema não rola nada sozinho, a ficha mostra o cartão.
function programaDoCartao(cartao, { classe, pagina, rez = 0, ram = 0 }) {
  return {
    name: cartao.name, type: 'programa', img: 'icons/svg/lightning.svg',
    system: {
      descricao: `<p><b>${cartao.tag}</b> · ${detalhes(cartao)}</p>${paragrafo(cartao.text)}${cartao.extra || ''}${cartao.icon ? paragrafo(`<i>${cartao.icon}</i>`, 'Na NET') : ''}${paragrafo(cartao.tip, 'Na mesa')}${fonteNaWiki(pagina)}`,
      classe, atk: 0, def: 0, rez, ram, dano: { padrao: '0', blackIce: '0' }, tamanho: 1, instaladoEm: '',
      preco: precoEm(doCartao(cartao, 'Preço') ?? doCartao(cartao, 'Custo')) ?? 100, fonte: fonte(pagina)
    }
  };
}

// Tudo de 2077, pelo id da loja da wiki. itensDoCore: o catálogo do CORE (moldes das flechettes).
export function converter2077({ raizDaWiki, itensDoCore, slug }) {
  const { armas, cyberware: grupos, net } = dadosDaWiki(raizDaWiki);
  const itens = {};
  const guardar = (prefixo, item) => {
    const id = `${prefixo}:${slug(item.name)}`;
    if (itens[id]) throw new Error(`Dois itens de 2077 com o mesmo id: ${id}.`);
    item.effects = item.effects || [];
    item.flags = { ...(item.flags || {}), [SISTEMA]: { ...(item.flags?.[SISTEMA] || {}), catalogo: id, origem: { fonte: 'wiki', suplemento: SUPLEMENTO } } };
    itens[id] = item;
  };
  for (const [grupo, lista] of Object.entries(armas)) for (const entrada of lista) guardar('armas-2077', arma(entrada.raw, grupo));
  for (const item of flechettes(itensDoCore)) guardar('armas-2077', item);
  for (const [grupo, lista] of Object.entries(grupos)) for (const entrada of lista) guardar('cyberware-2077', cyberware(entrada.raw, grupo));
  for (const cartao of net.neuralware) guardar('cyberware-2077', cyberwareDoCartao(cartao, 'Neuralware de netrunning (opção do Neural Link)', 13));
  for (const cartao of [...net.berserks, ...net.sandevistans]) guardar('cyberware-2077', cyberwareDoCartao(cartao, `${cartao.tag} (instalado no Neural Link)`, 24));
  for (const linha of net.decks) guardar('netrunning-2077', deck(linha));
  for (const cartao of Object.values(net.quickhacks).flat()) {
    guardar('netrunning-2077', programaDoCartao(cartao, { classe: 'quickhack', pagina: 16, ram: Number(doCartao(cartao, 'RAM')) || 0 }));
  }
  for (const cartao of net.daemons) guardar('netrunning-2077', programaDoCartao(cartao, { classe: 'daemon', pagina: 21, rez: Number(doCartao(cartao, 'REZ')) || 0 }));
  return itens;
}

// O conteúdo de 2077 que a mesa usa: o do Cyberpunk Edgerunners Mission Kit (a base) e o do suplemento de fã adaptado
// (o que o Kit não cobre). Armas, os Rebuilds e a munição Smart melhorada do Kit, cyberware (o Neuroport e as opções),
// a droga Immunoblockers e netrunning (cyberdecks, quickhacks e daemons). Vem da própria wiki (system-2077.js e
// system-net.js), os mesmos dados de que o módulo cpr-2077 gera os compêndios do Foundry 12 (foundry-2077/build): as
// regras de conversão são as dele, e os ids são os da loja da wiki ("armas-2077:<nome>", "cyberware-2077:<nome>",
// "netrunning-2077:<nome>").
// A classe, a origem e as regras de cada arma (o "regras" da wiki) ficam na flag arma2077, como o cpr-2077 guarda as
// dele. Os modos dos ciclos 17 e 18 (regras.mjs: o ricochete, a carga Tech, o teste Smart e as regras próprias da
// Palica, da Testera, da Kappa e da Dian) leem dela as opções de cada arma. Esses modos ainda seguem o suplemento de fã:
// as regras de Power, Smart e Tech do Kit ainda não estão no sistema (ROADMAP).
// Uso: chamado por build/conteudo.mjs.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const KIT = 'Cyberpunk Edgerunners Mission Kit';
const SUPLEMENTO = 'Cyberpunk 2077 (suplemento de fã)';
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
// fixo do livro com a rolagem equivalente do RED (2d6 ≈ 7, 4d6 ≈ 14).
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
const fonteNaWiki = (livro, pagina) => `<p><i>${livro === KIT ? KIT : 'Suplemento de fã Cyberpunk 2077'}, p. ${pagina}.</i></p>`;
const fonte = (livro, pagina) => ({ livro, pagina });
const NUMEROS = { um: 1, uma: 1, dois: 2, duas: 2, três: 3 };
const ORIGENS = { kit: 'Mission Kit', fa: 'suplemento de fã' };

// ---------------- Armas (Mission Kit p. 31–35 e suplemento de fã p. 32–50) ----------------
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
// As regras de Power, Smart e Tech do Mission Kit (p. 31–32), como a wiki as descreve.
const REGRA_DA_CLASSE = {
  power: 'Power (Mission Kit): a lesão crítica causa 5 de dano bônus a mais (10 em vez de 5). O Ricochete dá −4 no ataque para acertar um alvo atrás de cobertura ou fora da linha de visão.',
  smart: 'Smart (Mission Kit): +1 nos ataques à distância, e só dispara conectada pelo Personal Link (o Interface Plug do Neuroport) ou pelo Subdermal Grip. Com a munição Smart melhorada, ignora escuridão, fumaça e neblina, e errar a DV por 5 ou menos dá uma segunda chance com 14 + 1d10.',
  tech: 'Tech (Mission Kit): a mira vê o contorno dos alvos através de cobertura fina. Carregar gasta a Ação de Movimento; carregada, o próximo ataque é de CDT 1, atravessa cobertura fina e ignora metade do SP do alvo.'
};
// O que os botões da arma fazem neste sistema: os modos dos ciclos 17 e 18, que ainda seguem o suplemento de fã. As
// regras do Kit (o parágrafo "Classe") ainda não estão automatizadas, e o mestre as aplica.
const NESTE_SISTEMA = {
  power: 'o botão Ricochete ainda segue o suplemento de fã: DV da tabela de autofogo e um dado a menos de dano (+2 com o Ballistic Coprocessor); as que só disparam rajadas ou cartucho não ricocheteiam. O −4 do Kit e o +5 na lesão crítica, o mestre aplica.',
  tech: 'o botão Carga ainda segue o suplemento de fã: pergunta a cobertura do alvo, deixa nela o que não atravessa e abla 4 de SP (2 através de cobertura), e a arma esfria uma rodada. A carga do Kit (a Ação de Movimento, CDT 1, metade do SP), o mestre aplica.',
  smart: 'o tiro ainda segue o suplemento de fã: é o teste Smart (pela configuração do mundo, no lugar de REF + perícia ou num botão à parte), e sem o Smart Link instalado a arma não dispara (ou dispara como comum, pela configuração). O +1 do Kit e o Personal Link, o mestre aplica.'
};
const SO_COM_O_MESTRE = 'O que mais o texto acima disser de próprio deste modelo, o mestre resolve.';
// O que o sistema faz das regras próprias de cada modelo, pela flag arma2077.
function proprioNoSistema(flag) {
  const frases = [];
  if (flag.smartDoisCanos) frases.push('O botão "Dois canos" dispara os dois de uma vez: teste Smart 12 + 1d10, gastando os 2 cartuchos.');
  if (flag.doisCartuchosDano) frases.push(`O botão "Dois canos" dispara os dois cartuchos de uma vez: ${flag.doisCartuchosDano} de dano.`);
  if (flag.smartDoisAlvos) frases.push('Com dois alvos marcados, se o tiro Smart não pegar o primeiro, as balas vão para o segundo, a até 4 m dele.');
  if (flag.coronhaRetratil) frases.push('O botão "Recolher" recolhe a coronha: dá para esconder a arma, e os ataques têm −1 até estender.');
  if (flag.balasDoAutofogo) frases.push(`O autofogo gasta ${flag.balasDoAutofogo} balas.`);
  return frases.join(' ');
}
// Nos itens do Kit sem botão (os Rebuilds, a munição Smart melhorada).
const KIT_SEM_AUTOMACAO = paragrafo('as regras de Power, Smart e Tech do Kit ainda não estão automatizadas aqui: veja a página de 2077 da wiki.', 'Neste sistema');
// As regras próprias de cada arma (system-2077.js, "regras"), guardadas na flag arma2077 como o cpr-2077 guarda as dele.
const REGRAS = ['balas', 'danoComMenos', 'minimoDeBalas', 'danoFixo', 'danoMirado', 'exigeBody', 'lesao', 'lesaoSemCromo', 'cargaSemMovimento',
  'cargaAteFimDoTurno', 'balasNaCarga', 'cdtNaCarga', 'cargaGrossa', 'ferrolho', 'soCartucho', 'soSmartMelhorada', 'doisAlvos', 'doisCanos'];
// Armas que o livro só descreve em texto: o dano e a DV do autofogo seguem a Tsunami Arms Helix do livro-base.
const SO_AUTOFOGO = new Set(['Constitutional Arms M2067 Defender', 'Militech Mk.31 HMG']);

function arma(raw, grupo) {
  const tipoNaWiki = raw.kind.toLowerCase();
  const [, tipo] = TIPOS_DE_ARMA.find(([padrao]) => padrao.test(tipoNaWiki));
  const classe = /smart/i.test(raw.kind) ? 'smart' : /tech/i.test(raw.kind) ? 'tech' : 'power';
  const exotica = /exótic/.test(tipoNaWiki);
  const kit = raw.origem === 'kit';
  const regras = raw.regras || {};
  const qualidade = QUALIDADES[raw.quality] || 'standard';
  const recursos = raw.features && raw.features !== '—' ? raw.features : '';
  const soAutofogo = SO_AUTOFOGO.has(raw.name);
  const pericia = soAutofogo ? 'autofire' : PERICIAS[raw.skill.split(' (')[0]];
  if (!pericia) throw new Error(`Perícia desconhecida em ${raw.name}: ${raw.skill}`);
  // Balote e cartucho: a espingarda que diz balote (no pente ou no dano) ou que carrega um por cano usa os dois.
  const balotesECartuchos = /balote/.test(`${raw.magazine} ${raw.damage}`) || (tipo === 'shotgun' && /um por cano/.test(raw.magazine));
  const municoes = regras.soCartucho || /cartucho/.test(raw.magazine) ? ['shotgunShell'] : balotesECartuchos ? ['shotgunSlug', 'shotgunShell']
    : /pistola média/.test(raw.magazine) ? ['medPistol'] : /pistola pesada/.test(raw.magazine) ? (tipo === 'vHeavyPistol' ? ['vHeavyPistol'] : ['heavyPistol'])
      : /pistola muito pesada/.test(raw.magazine) ? ['vHeavyPistol'] : /rifle/.test(raw.magazine) ? ['rifle'] : MUNICAO_PADRAO[tipo];
  const slotsNoTexto = `${raw.text} ${recursos}`.match(/(\d|um|uma|dois|duas|três) slots? de acessório/i);
  // A arma exótica já vem com a classe e não tem slot; a comum é como uma arma com Rebuild: 3 slots, 2 do Rebuild.
  const slots = /sem acessórios/i.test(recursos) ? 0 : slotsNoTexto ? (NUMEROS[slotsNoTexto[1].toLowerCase()] ?? Number(slotsNoTexto[1])) : exotica ? 0 : 1;
  const [livro, pagina] = kit ? [KIT, regras.pagina || 32] : [SUPLEMENTO, PAGINA_DO_GRUPO[grupo]];
  const textoCompleto = `${raw.text} ${raw.tip || ''}`;
  // As opções que os modos dos ciclos 17 e 18 leem: das regras da wiki (raw.regras) quando ela as tem; senão, do texto.
  const arma2077 = {
    classe, exotica, origem: kit ? 'kit' : 'fa', grupo,
    // Smart: várias balas por tiro (o teste 12 + 1d10), a Kappa (dois alvos), a Palica (dois canos).
    smartVariasBalas: classe === 'smart' && !regras.doisCanos && !/dois canos/i.test(textoCompleto) && (Number(regras.balas) > 1 || /12 \+ 1d10/.test(textoCompleto)),
    smartDoisAlvos: classe === 'smart' && Boolean(regras.doisAlvos || /dois alvos/i.test(textoCompleto)),
    smartDoisCanos: classe === 'smart' && Boolean(regras.doisCanos || /dois canos/i.test(textoCompleto)),
    // A Testera: os dois cartuchos de uma vez, com o dano deles.
    doisCartuchosDano: classe !== 'smart' ? (recursos.match(/os dois cartuchos juntos: (\d+d6)/i) || [])[1] || null : null,
    // Tech: a rajada da carga (o multiplicador máximo; 0: só tiro único) e as balas que ela gasta, quando o texto diz.
    // Com o Kit, nenhuma arma faz rajada carregada.
    techRajada: classe === 'tech' ? Number((recursos.match(/carga Tech \(rajada de (\d)\)/i) || [])[1] || 0) : 0,
    techBalas: classe === 'tech' ? Number((raw.text.match(/(?:dispara|exige) (?:as )?(\d+) balas/i) || [])[1] || 0) : 0,
    // O autofogo que gasta menos balas (0: as 10 do autofogo).
    balasDoAutofogo: Number((recursos.match(/usa só (\d+) balas por rajada/i) || [])[1] || 0),
    // Power: as que só disparam rajadas de três não ricocheteiam.
    semRicochete: classe === 'power' && (/só rajada de três balas/i.test(recursos) || pericia === 'autofire'),
    // A Dian: coronha retrátil, −1 recolhida.
    coronhaRetratil: /coronha recolhida/i.test(textoCompleto)
  };
  for (const chave of REGRAS) if (regras[chave] !== undefined) arma2077[chave] = regras[chave];
  const proprio = proprioNoSistema(arma2077);
  return {
    name: raw.name, type: 'arma', img: 'icons/svg/target.svg',
    system: {
      descricao: `<p><b>${raw.kind}</b> · qualidade ${raw.quality} · ${ORIGENS[arma2077.origem]}</p>${paragrafo(raw.text)}${paragrafo(recursos, 'Recursos')}${paragrafo(REGRA_DA_CLASSE[classe], 'Classe')}`
        + `${paragrafo(`${NESTE_SISTEMA[classe]}${proprio ? ` ${proprio}` : ''} ${SO_COM_O_MESTRE}`, 'Neste sistema')}`
        + `${paragrafo(raw.tip, 'Na mesa')}${fonteNaWiki(livro, pagina)}`,
      tipo, pericia, dano: soAutofogo ? '2d6' : (String(raw.damage).match(/\d+d6/) || ['3d6'])[0], cdt: Number(raw.rof) || 1,
      pente: { value: 0, max: parseInt(raw.magazine, 10) || 0 }, municoes, aDistancia: true, maos: parseInt(raw.hands, 10) || 1,
      autofogo: soAutofogo ? 4 : Number((recursos.match(/autofogo \((\d)\)/i) || [])[1] || 0), supressivo: /supressivo/i.test(recursos),
      // Como as armas excelentes do livro-base: +1 no ataque (RED p. 342).
      bonusAtaque: qualidade === 'excellent' ? 1 : 0, qualidade, falhaCritica: 'jammed', ocultavel: /^sim/i.test(raw.conceal),
      tabelaDV: soAutofogo ? 'DV Assault Rifle (Autofire)' : TABELA_DV[tipo], ignorarArmadura: 0, ignorarAbaixo: 0, slots, equipada: false,
      preco: precoEm(raw.cost) ?? 500, fonte: fonte(livro, pagina)
    },
    flags: { [SISTEMA]: { arma2077 } }
  };
}

// Os Rebuilds (Kit p. 31–32): acessórios de 2 slots que dão a classe à arma.
const REBUILDS = [
  ['Power Rebuild', 'power', 'A arma é reforçada para aguentar o esforço extremo, com mais precisão: vira uma arma <b>Power</b>. Serve em qualquer arma de longo alcance que não seja exótica.'],
  ['Smart Rebuild', 'smart', 'O miolo da arma é refeito com a mira Smart, que usa as balas girojato melhoradas: vira uma arma <b>Smart</b>. Serve em qualquer arma de longo alcance que não seja exótica, mas não numa arma com Smartgun Link.'],
  ['Tech Rebuild', 'tech', 'A arma é refeita com módulos de lançamento eletromagnético: vira uma arma <b>Tech</b>. Serve em qualquer arma de longo alcance que não seja exótica, menos lança-granadas e lança-foguetes.']
];
function rebuilds() {
  return REBUILDS.map(([nome, classe, texto]) => ({
    name: nome, type: 'upgrade', img: 'icons/svg/upgrade.svg',
    system: {
      descricao: `<p><b>Rebuild</b> · 2 slots · 1.000eb (Muito Caro) · 1 hora para instalar ou tirar · só um por arma</p>${paragrafo(texto)}${paragrafo(REGRA_DA_CLASSE[classe], 'Classe')}`
        + `<p>Numa arma exótica, o Rebuild entra num slot só, se a arma tiver um livre.</p>${KIT_SEM_AUTOMACAO}${fonteNaWiki(KIT, 31)}`,
      alvo: 'arma', tamanho: 2, instaladoEm: '', modificadores: { pente: 0, ataque: 0, sdp: 0, assentos: 0 }, preco: 1000, fonte: fonte(KIT, 31)
    },
    flags: { [SISTEMA]: { arma2077: { rebuild: classe } } }
  }));
}

// Munição Smart melhorada (Kit p. 32): 50eb por 10 balas, balotes, cartuchos ou flechas; 500eb por granada ou foguete.
// O molde é a munição do CORE do mesmo calibre.
const SMART_MELHORADA = [
  ['core_ammo:medium-pistol-smart', 'pistola média'], ['core_ammo:heavy-pistol-smart', 'pistola pesada'], ['core_ammo:very-heavy-pistol-smart', 'pistola muito pesada'],
  ['core_ammo:rifle-smart', 'rifle'], ['core_ammo:shotgun-slug-smart', 'balote'], ['core_ammo:shotgun-shell-basic', 'cartucho'], ['core_ammo:arrow-smart', 'flecha'],
  ['core_ammo:grenade-armor-piercing', 'granada'], ['core_ammo:rocket-smart', 'foguete']
];
const REGRA_SMART_MELHORADA = 'Só funciona em arma <b>Smart</b> (não numa arma com Smartgun Link). Ignora as penalidades de escuridão, fumaça, neblina e de qualquer outra coisa que atrapalhe a visão. Se o ataque à distância errar a DV por <b>5 ou menos</b>, você tenta de novo na hora com <b>14 + 1d10</b> (dá para somar Sorte) contra a mesma DV, com as penalidades do primeiro tiro.';
function smartMelhorada(itensDoCore) {
  return SMART_MELHORADA.map(([id, calibre]) => {
    const base = structuredClone(itensDoCore[id]);
    if (!base) throw new Error(`O catálogo do CORE não tem ${id}, molde da munição Smart melhorada.`);
    const explosivo = ['granada', 'foguete'].includes(calibre);
    return {
      ...base, name: `Smart melhorada (${calibre})`,
      system: {
        ...base.system, efeito: 'smart', ablacao: 1, quantidade: explosivo ? 1 : 10, preco: explosivo ? 500 : 50, fonte: fonte(KIT, 32),
        descricao: `<p><b>Munição Smart melhorada</b> de ${calibre} · ${explosivo ? '500eb (Caro) cada' : '50eb (Oneroso) por 10'}</p><p>${REGRA_SMART_MELHORADA}</p>${KIT_SEM_AUTOMACAO}${fonteNaWiki(KIT, 32)}`
      },
      effects: [], flags: { [SISTEMA]: { arma2077: { smartMelhorada: true } } }
    };
  });
}

// ---------------- Cyberware (Kit p. 35–37; suplemento de fã p. 27–30, 13 e 24–26) ----------------
const INSTALACOES = { Loja: 'mall', Clínica: 'clinic', Hospital: 'hospital' };
// Categoria da wiki → [tipo de cyberware, é base (abre slots)?]. A ordem importa: "Cyberware externo (placa base)" é base.
const CATEGORIAS = [
  [/^Neuroport \(base\)/, 'neuralWare', true],
  [/^Fashionware/, 'fashionware', false], [/^Neuralware/, 'neuralWare', false], [/^Cyberóptico \(base\)/, 'cyberEye', true], [/^Cyberóptico \(opção\)/, 'cyberEye', false],
  [/^Cyberware interno/, 'cyberwareInternal', false], [/placa base/, 'cyberwareExternal', true], [/^Opção de placa/, 'cyberwareExternal', false],
  [/^Cyberware externo/, 'cyberwareExternal', false], [/^Opção de cyberbraço|^Cyberbraços/, 'cyberArm', false], [/^Opção de cyberperna/, 'cyberLeg', false]
];
// Grupo da wiki → página do suplemento de fã; as do Kit têm a página do Kit.
const PAGINA_DO_CYBERWARE = { neuroport: 36, fashionware: 27, neural: 27, optics: 28, internal: 28, external: 29, limbs: 30 };
const PAGINA_DO_KIT = { neuroport: 36, neural: 35, limbs: 36 };

// Os slots de opção das fundações de 2077, pela wiki (system-2077.js): o Neuroport traz o Neural Link "com 5 slots de
// opção"; as Basic Kiroshi Optics, "dois slots de opção para cyberolho" (o par); o Skin Weave, "dois slots de placa"; o
// Subdermal Armour, "um slot de placa".
const SLOTS_2077 = { Neuroport: 5, 'Basic Kiroshi Optics': 2, 'Skin Weave': 2, 'Subdermal Armour (2077)': 1 };
function cyberware(raw, grupo) {
  const categoria = CATEGORIAS.find(([padrao]) => padrao.test(raw.category));
  if (!categoria) throw new Error(`Categoria de cyberware desconhecida em ${raw.name}: ${raw.category}`);
  const [, tipo, fundacional] = categoria;
  const texto = String(raw.text ?? '').replace(/<[^>]+>/g, '');
  const kit = raw.origem === 'kit';
  const [livro, pagina] = kit ? [KIT, PAGINA_DO_KIT[grupo] || 36] : [SUPLEMENTO, PAGINA_DO_CYBERWARE[grupo]];
  return {
    name: raw.name, type: 'cyberware', img: 'icons/svg/clockwork.svg',
    system: {
      descricao: `<p><b>${raw.category}</b> · instalação: ${raw.install} · Humanidade ${raw.humanity} · ${raw.cost} · ${kit ? 'Mission Kit' : 'suplemento de fã'}</p>${paragrafo(raw.text)}${paragrafo(raw.tip, 'Na mesa')}${fonteNaWiki(livro, pagina)}`,
      tipo, fundacional, tamanho: fundacional ? 0 : /ocupa dois slots/i.test(texto) ? 2 : 1, slots: fundacional ? (SLOTS_2077[raw.name] ?? 0) : 0, instaladoEm: '', perdaHumanidade: perdaDeHumanidade(raw.humanity),
      local: INSTALACOES[raw.install] || 'clinic', instalado: false, preco: precoEm(raw.cost) ?? 0, fonte: fonte(livro, pagina)
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
      descricao: `<p><b>${categoria}</b> · ${detalhes(cartao)}</p>${paragrafo(cartao.text)}${cartao.extra || ''}${paragrafo(cartao.tip, 'Na mesa')}${fonteNaWiki(SUPLEMENTO, pagina)}`,
      tipo: 'neuralWare', fundacional: false, tamanho: 1, slots: 0, instaladoEm: '', perdaHumanidade: perdaDeHumanidade(doCartao(cartao, 'Perda de Humanidade')), local: 'clinic', instalado: false,
      preco: precoEm(doCartao(cartao, 'Custo') ?? doCartao(cartao, 'Preço')) ?? 0, fonte: fonte(SUPLEMENTO, pagina)
    }
  };
}

// A droga do Mission Kit (Kit p. 31). Os efeitos são de Humanidade e o mestre os resolve: a droga não tem efeito na ficha.
const IMMUNOBLOCKERS = '<p><b>Droga do Mission Kit</b> · 100eb (Premium) a dose · não vicia</p><p><b>Efeito primário:</b> recupera 2d6 de Humanidade, sem passar da Humanidade máxima que a terapia permite. Dura um mês, mas pode acabar antes, num momento estressante (o mestre decide).</p><p><b>Efeito secundário (DV21):</b> perde a Humanidade ganha com a droga, e alucinações dão −2 em todo teste por 60 segundos (20 rodadas). Se nesse tempo não injetar 2 doses de Immunoblockers (uma Ação), perde 4d6 de Humanidade no fim dos 60 segundos (sem mexer na máxima). Abaixo de 0: ciberpsicose extrema, e o mestre pode dar +2 em todo teste até a Humanidade voltar a ser positiva.</p>';
const immunoblockers = () => ({
  name: 'Immunoblockers', type: 'droga', img: 'icons/svg/pill.svg',
  system: { descricao: IMMUNOBLOCKERS + fonteNaWiki(KIT, 31), quantidade: 1, uso: 'carregando', consumo: '', preco: 100, fonte: fonte(KIT, 31) }
});

// ---------------- Netrunning (Kit p. 16–17; suplemento de fã p. 13–23) ----------------
const QUALIDADE_DO_DECK = { Excelente: 'excellent', Padrão: 'standard', Ruim: 'poor' };
// Linha da tabela de cyberdecks: [fabricante, modelo, RAM, slots, cooling, qualidade e especialidade, custo, descrição].
function deck([fabricante, modelo, ram, slots, resfriamento, especial, custo, sabor]) {
  return {
    name: `${fabricante} ${modelo}`, type: 'cyberdeck', img: 'icons/svg/net.svg',
    system: {
      descricao: `<p><b>Cyberdeck de 2077</b> · RAM ${ram} · slots ${slots} · Cooling ${resfriamento} · ${custo}</p><p>${especial}</p><p><i>${sabor}</i></p>`
        + '<p>Em 2077 o cyberdeck é um <b>sistema operacional instalado no Neural Link</b>, sem perda de Humanidade. A <b>RAM</b> paga os quickhacks; o <b>Cooling</b> é quanta RAM volta por rodada.</p>'
        + fonteNaWiki(SUPLEMENTO, 14),
      slots: Number(slots) || 0, ram: Number(ram) || 0, resfriamento: Number(resfriamento) || 0, qualidade: QUALIDADE_DO_DECK[especial.split('.')[0]] || 'standard',
      uso: 'carregando', preco: precoEm(custo) ?? 500, fonte: fonte(SUPLEMENTO, 14)
    }
  };
}
// Quickhacks e daemons viram programas: o sistema não rola nada sozinho, a ficha mostra o cartão. Os quickhacks do Kit
// não se compram (todo netrunner faz os do nível dele, pelo Rank de Interface); os do fã têm preço opcional.
function programaDoCartao(cartao, { classe, pagina, rez = 0, ram = 0 }) {
  const kit = cartao.raw?.origem === 'kit';
  const livro = kit ? KIT : SUPLEMENTO;
  return {
    name: cartao.name, type: 'programa', img: 'icons/svg/lightning.svg',
    system: {
      descricao: `<p><b>${cartao.tag}</b> · ${detalhes(cartao)}</p>${paragrafo(cartao.text)}${cartao.extra || ''}${cartao.icon ? paragrafo(`<i>${cartao.icon}</i>`, 'Na NET') : ''}${paragrafo(cartao.tip, 'Na mesa')}${fonteNaWiki(livro, pagina)}`,
      classe, atk: 0, def: 0, rez, ram, dano: { padrao: '0', blackIce: '0' }, tamanho: 1, instaladoEm: '',
      preco: kit ? 0 : precoEm(doCartao(cartao, 'Preço (opcional)') ?? doCartao(cartao, 'Preço') ?? doCartao(cartao, 'Custo')) ?? 100, fonte: fonte(livro, pagina)
    }
  };
}

// Tudo de 2077, pelo id da loja da wiki. itensDoCore: o catálogo do CORE (moldes da munição Smart melhorada).
export function converter2077({ raizDaWiki, itensDoCore, slug }) {
  const { armas, cyberware: grupos, net } = dadosDaWiki(raizDaWiki);
  const itens = {};
  const guardar = (prefixo, item) => {
    const id = `${prefixo}:${slug(item.name)}`;
    if (itens[id]) throw new Error(`Dois itens de 2077 com o mesmo id: ${id}.`);
    item.effects = item.effects || [];
    item.flags = { ...(item.flags || {}), [SISTEMA]: { ...(item.flags?.[SISTEMA] || {}), catalogo: id, origem: { fonte: 'wiki', livro: item.system.fonte.livro } } };
    itens[id] = item;
  };
  for (const [grupo, lista] of Object.entries(armas)) for (const entrada of lista) guardar('armas-2077', arma(entrada.raw, grupo));
  for (const item of rebuilds()) guardar('armas-2077', item);
  for (const item of smartMelhorada(itensDoCore)) guardar('armas-2077', item);
  for (const [grupo, lista] of Object.entries(grupos)) for (const entrada of lista) guardar('cyberware-2077', cyberware(entrada.raw, grupo));
  for (const cartao of net.neuralware) guardar('cyberware-2077', cyberwareDoCartao(cartao, 'Neuralware de netrunning (opção do Neural Link)', 13));
  for (const cartao of [...net.berserks, ...net.sandevistans]) guardar('cyberware-2077', cyberwareDoCartao(cartao, `${cartao.tag} (instalado no Neural Link)`, 24));
  guardar('cyberware-2077', immunoblockers());
  for (const linha of net.decks) guardar('netrunning-2077', deck(linha));
  for (const cartao of Object.values(net.quickhacks).flat()) {
    guardar('netrunning-2077', programaDoCartao(cartao, { classe: 'quickhack', pagina: 16, ram: Number(doCartao(cartao, 'RAM')) || 0 }));
  }
  for (const cartao of net.daemons) guardar('netrunning-2077', programaDoCartao(cartao, { classe: 'daemon', pagina: 21, rez: Number(doCartao(cartao, 'REZ')) || 0 }));
  return itens;
}

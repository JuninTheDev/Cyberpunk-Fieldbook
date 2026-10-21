// As armas de 2077 na mesa da wiki: o perfil de cada arma (a classe Power, Smart ou Tech e as regras próprias do
// Cyberpunk Edgerunners Mission Kit, p. 31–35), lido do system-2077.js como o build do módulo do Foundry lê
// (foundry-2077/build/armas.mjs). E o que a ficha diz de cada arma (o Rebuild instalado, a munição carregada, a
// qualidade) e do cromo do personagem (a conexão Smart, o Ballistic Coprocessor, o braço que aguenta a Burya).
// As regras em si ficam em mesa-regras.js; aqui não há rede nem arquivo.
'use strict';

// As regras próprias que a wiki marca em cada arma (as mesmas flags do build do Foundry).
const CHAVES = ['balas', 'danoComMenos', 'minimoDeBalas', 'danoFixo', 'danoMirado', 'exigeBody', 'lesao', 'lesaoSemCromo', 'cargaSemMovimento',
  'cargaAteFimDoTurno', 'balasNaCarga', 'cdtNaCarga', 'cargaGrossa', 'ferrolho', 'soCartucho', 'soSmartMelhorada', 'doisAlvos', 'doisCanos'];
const plano = texto => String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, "'").toLowerCase().trim();

// Uma linha crua do system-2077.js (raw) → o perfil. A classe vem do tipo ("Pistola pesada Power, exótica"); o autofogo
// e o fogo supressivo, dos recursos ("Autofogo (3); fogo supressivo"), como no build do Foundry.
function perfilDaLinha(raw) {
  const recursos = raw.features && raw.features !== '—' ? String(raw.features) : '';
  const perfil = {
    classe: /smart/i.test(raw.kind) ? 'smart' : /tech/i.test(raw.kind) ? 'tech' : 'power', rebuild: false,
    autofogo: Number((recursos.match(/autofogo \((\d)\)/i) || [])[1] || 0), supressivo: /supressivo/i.test(recursos), excelente: raw.quality === 'excelente'
  };
  for (const chave of CHAVES) if (raw.regras && raw.regras[chave] !== undefined) perfil[chave] = raw.regras[chave];
  if (/cartucho/.test(String(raw.magazine))) perfil.soCartucho = true;
  if (/coronha recolhida/i.test(`${raw.text} ${raw.tip || ''}`)) perfil.coronhaRetratil = true;
  return perfil;
}
// As armas de 2077 por nome. dados: window.system2077.data.weapons ({ pistols: [{ raw }], ... }).
function tabela(dados) {
  const mapa = new Map();
  for (const lista of Object.values(dados || {})) {
    for (const entrada of Array.isArray(lista) ? lista : []) if (entrada && entrada.raw && entrada.raw.name) mapa.set(plano(entrada.raw.name), perfilDaLinha(entrada.raw));
  }
  return mapa;
}
// O perfil de uma arma: o dela (pelo nome, em inglês ou como está na ficha) ou o do Rebuild instalado numa arma de longo
// alcance. Sem nenhum dos dois: null (a arma segue as regras do RED). O Rebuild não mexe no autofogo da arma.
function perfil(armas2077, nomes, rebuild = null, distancia = true) {
  for (const nome of nomes) {
    const achado = nome && armas2077 && armas2077.get(plano(nome));
    if (achado) return { ...achado };
  }
  return rebuild && distancia ? { classe: rebuild, rebuild: true } : null;
}

// ---------------- O que a ficha diz ----------------
const REBUILD = /^(power|smart|tech) rebuild$/i;
const rebuildEntre = nomes => {
  for (const nome of nomes) { const achado = String(nome || '').trim().match(REBUILD); if (achado) return achado[1].toLowerCase(); }
  return null;
};
// A munição carregada: é cartucho de espingarda (null quando não se sabe) e é Smart melhorada? A Smart do RED (para o
// Smartgun Link) não conta: a melhorada é a do Kit.
function municaoDe(cat, nome) {
  const texto = `${cat ? `${cat.id} ${cat.en || ''} ${cat.nome || ''}` : ''} ${nome || ''}`;
  const variedade = cat && cat.municao ? cat.municao.variedade : '';
  const cartucho = variedade ? variedade === 'shotgunShell' : /cartucho|shotgun shell|\bshells?\b/i.test(texto) ? true : /balote|\bslugs?\b/i.test(texto) ? false : null;
  return { cartucho, smartMelhorada: /smart-melhorada|smart melhorada|improved smart/i.test(texto) };
}
const excelenteDe = (cat, nome) => Boolean((cat && Array.isArray(cat.tags) && cat.tags.includes('excelente')) || /\((excelente|excellent)\)/i.test(nome || ''));

// O cromo que as regras de 2077 olham. pecas: [{ nome, tipo, base }] do cyberware instalado.
const CONEXAO = /^(neuroport|interface plugs?|personal link|subdermal grip|smart ?link)\b/i;
const COPROCESSADOR = /ballistic coprocessor/i;
const BRACO_FORTE = /muscle (and|&) bone lace|epimorphic skeleton|titanium bones|^cyberarm\b/i;
const cromoDe = pecas => ({
  conexaoSmart: pecas.some(peca => CONEXAO.test(String(peca.nome || '').trim())),
  coprocessador: pecas.some(peca => COPROCESSADOR.test(peca.nome || '')),
  bracoForte: pecas.some(peca => BRACO_FORTE.test(String(peca.nome || '').trim()) || (peca.tipo === 'cyberArm' && peca.base))
});

// O que a ficha diz das armas (pelo id que a mesa usa, o mesmo do personagem-jogo.js) e do cromo. Do Foundry (doc.mesa,
// se ele mandou os itens) ou da criação (doc.resultado). cromo é null quando a ficha não tem a lista de itens: aí a mesa
// não cobra a conexão Smart nem o braço da Burya. catalogo: { item(id), porNome(nome) } (loja-catalogo.js).
function daFicha(doc, catalogo = {}) {
  const item = id => (catalogo.item ? catalogo.item(id) : null);
  const porNome = nome => (nome && catalogo.porNome ? catalogo.porNome(nome) : null);
  const armas = {};
  const pecas = [];
  const mesa = doc && doc.mesa && Array.isArray(doc.mesa.itens) ? doc.mesa : null;
  if (mesa) {
    for (const entrada of mesa.itens) {
      if (!entrada) continue;
      if (entrada.tipo === 'cyberware' && entrada.instalado) pecas.push({ nome: entrada.nomeCatalogo || entrada.nome, tipo: entrada.cyber && entrada.cyber.tipo, base: Boolean(entrada.base) });
      if (entrada.tipo !== 'weapon') continue;
      const cat = porNome(entrada.nome);
      armas[`foundry:${entrada.id}`] = { nomes: [entrada.nome, cat && cat.en, cat && cat.nome], rebuild: rebuildEntre(entrada.dentro || []), municao: entrada.municao ? municaoDe(porNome(entrada.municao), entrada.municao) : null, excelente: excelenteDe(cat, entrada.nome) };
    }
    return { armas, cromo: cromoDe(pecas) };
  }
  const criadas = Array.isArray(doc && doc.resultado && doc.resultado.itens) ? doc.resultado.itens : null;
  if (!criadas) return { armas, cromo: null };
  // Mais o que a loja entregou na mesa da wiki (doc.jogo.compras). O cyberware comprado só conta depois de instalado.
  const linhas = [...criadas, ...(doc.jogo && Array.isArray(doc.jogo.compras) ? doc.jogo.compras : [])];
  for (const linha of linhas) {
    const cat = linha && item(linha.id);
    if (!cat) continue;
    if (cat.cyber && (!linha.pedido || linha.instalado)) pecas.push({ nome: cat.en || cat.nome, tipo: cat.cyber.tipo, base: false });
    if (!cat.arma) continue;
    const dentro = linhas.filter(outra => outra.em && outra.em === linha.uid).map(outra => { const peca = item(outra.id); return (peca && peca.en) || outra.nome; });
    const carregada = linha.municao ? linhas.find(outra => outra.uid === linha.municao) : null;
    armas[linha.uid || linha.id] = { nomes: [cat.en, cat.nome, linha.nome], rebuild: rebuildEntre(dentro), municao: carregada ? municaoDe(item(carregada.id), carregada.nome) : null, excelente: excelenteDe(cat) };
  }
  return { armas, cromo: cromoDe(pecas) };
}

// A arma como a mesa guarda: o perfil de 2077 (kit), a qualidade excelente e a munição carregada (cartucho? Smart
// melhorada?). fato: o que daFicha diz dela (nada para os NPCs: só o nome).
function comPerfil(arma, armas2077, fato = null) {
  const kit = perfil(armas2077, fato ? fato.nomes : [arma.nome], fato ? fato.rebuild : null, arma.distancia !== false);
  return {
    ...arma, kit, excelente: Boolean((fato && fato.excelente) || (kit && kit.excelente)),
    cartucho: fato && fato.municao ? fato.municao.cartucho : null, smartMelhorada: Boolean(fato && fato.municao && fato.municao.smartMelhorada)
  };
}

module.exports = { CHAVES, perfilDaLinha, tabela, perfil, daFicha, comPerfil, municaoDe, cromoDe };

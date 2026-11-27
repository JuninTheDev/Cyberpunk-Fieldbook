// A regra pura da coreografia dos efeitos na mesa (o C78; o plano em foundry-sistema/efeitos-plano/PLANO.md e o anexo
// equipe/fx-coreografia.md, seções 3.3 a 3.6). Sem o Foundry: lê o resultado já resolvido do combate (o resumo do cartão
// e as posições dos tokens na hora da decisão), monta o evento (v1) e o transforma num roteiro, a lista ordenada dos
// passos com o tempo (t, em ms), a duração, a posição e a chave do catálogo (catalogo-efeitos.mjs) de cada um. O diretor
// (o C79) decide quem vê e quando; os tocadores (o C80 e o C81) desenham e tocam. Nada aqui muda o combate: a regra só
// lê o resultado, e um evento inválido vira um roteiro vazio.
import { CATALOGO, srcPermitido, temEfeito } from './catalogo-efeitos.mjs';
import { MUNICAO_SEM_DANO, textoNoToken } from './regras.mjs';

export { CATALOGO, srcPermitido };

export const VERSAO_DO_EVENTO = 1;
export const TIPOS_DE_EVENTO = ['ataque', 'agarrao', 'movimento', 'net', 'quickhack', 'veiculo', 'perigo', 'corpo', 'recarga', 'equipamento'];
// O disparo (o momento A, antes da defesa: o C82) e o desfecho (o momento B, o cartão do resultado).
export const FASES = ['disparo', 'desfecho'];
export const MODOS_DO_EFEITO = ['tiro', 'autofogo', 'supressivo', 'cartucho', 'explosivo', 'corpo', 'ricochete', 'doisCanos', 'arremesso'];
export const RESULTADOS_DO_EFEITO = ['acertou', 'errou', 'esquivou', 'fora', 'semDv', 'suprimido', 'firme', 'semDestino', 'semRepeticao'];
export const PASSOS = ['clarao', 'som', 'tracante', 'projetil', 'arco', 'impacto', 'sangue', 'faisca', 'esquiva', 'golpe', 'avanco', 'explosao',
  'onda', 'tremor', 'nuvem', 'texto', 'anel', 'tomba', 'glitch', 'feixe', 'tela', 'chamas', 'hud', 'marca', 'luz'];
// O desfecho de um alvo atingido (o plano, seção 5.3: o primeiro que vale), que decide o desenho do impacto.
export const DESFECHOS = ['morte', 'critico', 'veiculo', 'carne', 'escudo', 'estase', 'armadura', 'acerto'];
// A marca no chão e na parede (o buraco da bala) some em 4 s (a decisão 11 do plano, a recomendação).
export const MARCA_DURA = 4000;
// A luz do clarão (o C102, a decisão 12 do plano: "Sim"): uma luz de verdade por 0,1 s, de 2 m (3 m no clarão grande).
export const LUZ = Object.freeze({ duracao: 100, raio: 2, raioGrande: 3 });
export const ESTILOS_DO_TEXTO = ['acerto', 'erro', 'defesa'];
// Os limites da validação: o supressivo de 25 m numa cena cheia passa de 20 alvos; o texto de hoje tem menos de 30
// caracteres ("−12 HP · crítico!").
export const LIMITES = Object.freeze({ alvos: 40, texto: 80, tamanho: 40000 });

// Os níveis, do mais cheio ao vazio. A configuração "Efeitos na mesa" (animacoes) guarda os valores de antes, que
// continuam valendo: o auto é o completo, o texto é o só o texto, o nao é o nada.
export const NIVEIS = ['completo', 'reduzido', 'texto', 'nada'];
export const MAPA_DO_ANTIGO = Object.freeze({ auto: 'completo', reduzido: 'reduzido', texto: 'texto', nao: 'nada' });
// O teto de um roteiro (ms): passou disso, ele se comprime (o comprimir).
export const TETO = Object.freeze({ completo: 3500, reduzido: 1500 });
export const METROS_DA_CASA = 2;
const RAIO_SUPRESSIVO = 25;
const ALCANCE_DO_CARTUCHO = 6;
const LADO_DA_AREA = 10;

// O nível que vale neste navegador: o menor entre o da mesa (o teto do mestre) e o do jogador; o "mesa" segue o mestre.
export function nivelEfetivo(mundo, cliente = 'mesa') {
  const daMesa = de(MAPA_DO_ANTIGO, mundo) ?? (NIVEIS.includes(mundo) ? mundo : 'completo');
  const deste = NIVEIS.includes(cliente) ? cliente : daMesa;
  return NIVEIS[Math.max(NIVEIS.indexOf(daMesa), NIVEIS.indexOf(deste))];
}

// ---------------- Os perfis ----------------
// O perfil diz como a arma aparece e soa: a família (o roteiro), o clarão do cano, o que voa (o traçante, a flecha, a
// granada, a chama), o golpe do corpo a corpo e as chaves dos sons. Só chaves do catálogo, nunca um caminho de arquivo.
const tiro = (som, clarao, extra = {}) => ({ familia: 'tiro', clarao, projetil: 'tracante', golpe: null, som: `tiro.${som}`, rajada: 'rajada.padrao', recarga: 'recarga.pistola', tremor: false, ...extra });
const explosivo = (som, clarao, projetil) => ({ familia: 'explosivo', clarao, projetil, golpe: null, som: `tiro.${som}`, rajada: null, recarga: 'recarga.padrao', tremor: true });
const lancado = projetil => ({ familia: 'arremesso', clarao: null, projetil, golpe: null, som: 'arremesso.lancar', rajada: null, recarga: null, tremor: projetil === 'granada' });
const golpe = (tipo, extra = {}) => ({ familia: 'corpo', clarao: null, projetil: null, golpe: tipo, som: `golpe.${tipo}`, rajada: null, recarga: null, tremor: false, ...extra });
export const PERFIS = Object.freeze({
  'pistola-leve': tiro('pistola-leve', 'pequeno'),
  pistola: tiro('pistola', 'medio'),
  'pistola-pesada': tiro('pistola-pesada', 'medio'),
  submetralhadora: tiro('submetralhadora', 'pequeno', { rajada: 'rajada.submetralhadora' }),
  'submetralhadora-pesada': tiro('submetralhadora', 'medio', { rajada: 'rajada.submetralhadora' }),
  fuzil: tiro('fuzil', 'medio', { rajada: 'rajada.fuzil', recarga: 'recarga.fuzil' }),
  'fuzil-de-precisao': tiro('fuzil-de-precisao', 'grande', { recarga: 'recarga.fuzil' }),
  espingarda: tiro('espingarda', 'grande', { recarga: 'recarga.espingarda' }),
  'lanca-chamas': tiro('lanca-chamas', null, { projetil: 'chama', rajada: null, recarga: 'recarga.padrao' }),
  arco: tiro('arco', null, { projetil: 'flecha', rajada: null, recarga: null }),
  'lanca-granadas': explosivo('lanca-granadas', 'pequeno', 'granada'),
  'lanca-foguetes': explosivo('lanca-foguetes', 'grande', 'foguete'),
  arremesso: lancado('lamina'),
  granada: lancado('granada'),
  molotov: lancado('molotov'),
  'lamina-leve': golpe('corte'),
  lamina: golpe('corte'),
  'contundente-pesado': golpe('contundente'),
  'contundente-muito-pesado': golpe('contundente', { tremor: true }),
  soco: golpe('soco'),
  'golpe-marcial': golpe('chute'),
  garra: golpe('garra'),
  mantis: golpe('corte', { brilho: true }),
  chicote: golpe('chicote'),
  gorilla: golpe('soco', { tremor: true })
});
export const PERFIL_PADRAO = 'pistola';
// O traço do traçante de cada classe (o anexo do fx-visual, seção 4.1): a largura da cabeça e o comprimento da cauda (px,
// numa casa de 100 px), e o rastro de ar que fica no fuzil de precisão. O tempo do voo é o mesmo para todas: a diferença
// se lê na largura e na cauda.
export const TRACOS = Object.freeze({
  'pistola-leve': { largura: 2, cauda: 40 }, pistola: { largura: 3, cauda: 60 }, 'pistola-pesada': { largura: 3, cauda: 70 },
  submetralhadora: { largura: 2, cauda: 50 }, 'submetralhadora-pesada': { largura: 2, cauda: 50 }, fuzil: { largura: 3, cauda: 90 },
  'fuzil-de-precisao': { largura: 4, cauda: 140, rastro: true }, espingarda: { largura: 4, cauda: 60 }
});
const TRACO_PADRAO = Object.freeze({ largura: 2, cauda: 50 });

// O padrão pela classe da arma: todo tipo de arma do catálogo tem um (o G3 confere as 198 armas).
export const PERFIL_DO_TIPO = Object.freeze({
  medPistol: 'pistola-leve', heavyPistol: 'pistola', vHeavyPistol: 'pistola-pesada',
  smg: 'submetralhadora', heavySmg: 'submetralhadora-pesada',
  assaultRifle: 'fuzil', sniperRifle: 'fuzil-de-precisao', shotgun: 'espingarda', bow: 'arco',
  grenadeLauncher: 'lanca-granadas', rocketLauncher: 'lanca-foguetes', thrownWeapon: 'arremesso',
  lightMelee: 'lamina-leve', medMelee: 'lamina', heavyMelee: 'contundente-pesado', vHeavyMelee: 'contundente-muito-pesado',
  unarmed: 'soco', martialArts: 'golpe-marcial'
});
// As armas que não parecem com a classe delas (pelo id do catálogo): o lança-chamas é do tipo espingarda, o Molotov é
// uma arma de arremesso.
export const PERFIL_DO_CATALOGO = Object.freeze({
  'core_weapons:flamethrower': 'lanca-chamas',
  'dlc_black-chrome-plus:molotov-cocktail': 'molotov'
});
// A arma de um cyberware (armas-cyberware.mjs), pelo id do catálogo do cyberware: as garras, a lâmina do Mantis, o
// chicote do Monowire e do Slice 'N Dice, o punho pesado da Gorilla e dos Big Knucks.
export const PERFIL_DA_ORIGEM = Object.freeze({
  'core_cyberware:wolvers': 'garra', 'core_cyberware:rippers': 'garra', 'core_cyberware:scratchers': 'garra',
  'core_cyberware:big-knucks': 'gorilla', 'core_cyberware:slice-n-dice': 'chicote',
  'cyberware-2077:mantis-blade': 'mantis', 'cyberware-2077:monowire': 'chicote', 'cyberware-2077:gorilla-arm': 'gorilla'
});

const CHAVE_DE_PERFIL = /^[a-z0-9-]{1,40}$/;
const COR = /^#[0-9a-f]{6}$/i;
const de = (mapa, chave) => (typeof chave === 'string' && Object.hasOwn(mapa ?? {}, chave) ? mapa[chave] : null);

// Os perfis que o mestre criou (a configuração do mundo efeitosPerfis, a fase 5 do plano): cada um herda um perfil do
// sistema (base) e troca os sons (só os caminhos permitidos) e a cor. Um perfil sem base conhecida, ou com o nome de um do
// sistema, fica de fora.
export function perfisDoMestre(doMestre = null) {
  const saida = {};
  for (const [chave, perfil] of Object.entries(doMestre?.perfis ?? {})) {
    const base = de(PERFIS, perfil?.base);
    if (!CHAVE_DE_PERFIL.test(chave) || Object.hasOwn(PERFIS, chave) || !base) continue;
    const sons = Object.fromEntries(['disparo', 'rajada', 'impacto', 'recarga'].map(nome => [nome, perfil.sons?.[nome]]).filter(([, src]) => srcPermitido(src)));
    saida[chave] = { ...base, base: perfil.base, sons, ...(COR.test(perfil.cor ?? '') ? { corPropria: perfil.cor } : {}) };
  }
  return saida;
}

// O perfil de uma arma, da camada mais específica à mais geral: o do item (a flag efeito, só uma chave), o do mestre para
// aquele item do catálogo, o do cyberware de origem, o da arma especial do catálogo, a granada na arma de arremesso, o do
// mestre para a classe e o padrão da classe. A chave que não existe (ou um caminho de arquivo no lugar dela) é ignorada.
// null: a arma de um tipo sem perfil (o G3 confere que nenhuma do catálogo fica assim).
export function perfilDaArma({ tipo = '', catalogo = '', origem = '', municao = null, classe2077 = null, doItem = null, doMestre = null } = {}) {
  const perfis = { ...perfisDoMestre(doMestre), ...PERFIS };
  const valida = chave => (typeof chave === 'string' && CHAVE_DE_PERFIL.test(chave) && Object.hasOwn(perfis, chave) ? chave : null);
  const chave = valida(doItem) ?? valida(de(doMestre?.catalogo, catalogo)) ?? de(PERFIL_DA_ORIGEM, origem) ?? de(PERFIL_DO_CATALOGO, catalogo)
    ?? (tipo === 'thrownWeapon' && municao?.tipo === 'grenade' ? 'granada' : null) ?? valida(de(doMestre?.tipos, tipo)) ?? de(PERFIL_DO_TIPO, tipo);
  return chave ? { chave, ...perfis[chave], ...modificadores(perfis[chave], { classe2077, municao }) } : null;
}

// O que a classe de 2077 e a munição mudam por cima do perfil: a cor do traçante (a incendiária laranja, o EMP e a Tech
// azuis), a curva da Smart, a Tech que atravessa, o clarão maior da Power e a borracha sem sangue.
const CLARAO_MAIOR = { pequeno: 'medio', medio: 'grande', grande: 'grande' };
function modificadores(perfil, { classe2077 = null, municao = null } = {}) {
  const efeito = municao?.efeito ?? null;
  return {
    cor: efeito === 'incendiary' ? 'laranja' : efeito === 'emp' || classe2077 === 'tech' ? 'azul' : 'amarelo',
    curva: classe2077 === 'smart' || efeito === 'smart',
    atravessa: classe2077 === 'tech',
    semSangue: efeito === 'rubber',
    ...(classe2077 === 'power' && perfil?.clarao ? { clarao: CLARAO_MAIOR[perfil.clarao] } : {})
  };
}

// O perfil que um evento usa (no cliente que toca): a chave guardada no evento, com os modificadores da arma dele.
function perfilDoEvento(arma, doMestre) {
  const perfis = { ...perfisDoMestre(doMestre), ...PERFIS };
  const perfil = de(perfis, arma?.perfil) ?? PERFIS[PERFIL_PADRAO];
  const traco = de(TRACOS, perfil.base) ?? de(TRACOS, arma?.perfil) ?? TRACO_PADRAO;
  return { ...perfil, traco, ...modificadores(perfil, { classe2077: arma?.classe2077, municao: arma?.municao }) };
}

// ---------------- O evento ----------------
const ID = /^[A-Za-z0-9_-]{1,64}$/;
const PALAVRA = /^[A-Za-z0-9_-]{0,40}$/;
const finito = valor => typeof valor === 'number' && Number.isFinite(valor);
const numeroOu = (valor, padrao = null) => (finito(valor) ? valor : padrao);
const noMapa = p => p && typeof p === 'object' && finito(p.x) && finito(p.y) && Math.abs(p.x) <= 1e6 && Math.abs(p.y) <= 1e6;

// O dano de uma linha do cartão, só o que o efeito usa: quanto passou, se foi crítico, se parou no escudo ou na estase.
function danoDaLinha(linha) {
  const dano = linha.dano;
  if (dano) {
    const perdeu = Math.max(0, numeroOu(dano.hpAntes, 0) - numeroOu(dano.hpDepois, 0));
    const lesoes = Array.isArray(dano.lesoes) ? dano.lesoes.length : 0;
    return { perdeu, passou: perdeu > 0, critico: lesoes > 0, lesoes, escudo: Boolean(dano.escudo), estase: Boolean(dano.estase), ablado: numeroOu(Number(dano.ablado), 0), veicular: false };
  }
  const veicular = linha.veicular;
  if (!veicular) return null;
  const perdeu = Math.max(0, numeroOu(Number(veicular.perdeu), 0));
  return { perdeu, passou: perdeu > 0, critico: false, lesoes: 0, escudo: false, estase: false, ablado: numeroOu(Number(veicular.ablado), 0), veicular: true };
}

const lugarDe = p => (noMapa(p) ? { x: Math.round(p.x), y: Math.round(p.y) } : null);

// O evento do desfecho de um ataque, montado no mestre a partir do resumo do cartão (combate/cartao.mjs) e das posições
// na hora da decisão: a origem (o token de quem atacou, ou null no dano à parte pelo cartão), os alvos na ordem das
// linhas (o id do token, o centro e se está escondido), a arma (o tipo, o id do catálogo, o cyberware de origem, a classe
// de 2077, a munição carregada) e a área do explosivo. O texto de cada alvo é o de hoje (regras.textoNoToken).
export function eventoDoAtaque(resumo, { cena = '', origem = null, alvos = [], arma = {}, balas = null, area = null, queda = null, fase = 'desfecho', doMestre = null } = {}) {
  const perfil = perfilDaArma({ ...arma, doMestre });
  const municao = arma?.municao ? { tipo: String(arma.municao.tipo ?? ''), efeito: String(arma.municao.efeito ?? '') } : null;
  const linhas = (resumo?.linhas ?? []).map((linha, i) => ({ linha, pos: alvos[i] })).filter(({ pos }) => pos?.token && noMapa(pos));
  const centro = p => (noMapa(p) ? { x: Math.round(p.x), y: Math.round(p.y), lado: numeroOu(p.lado, LADO_DA_AREA) } : null);
  return {
    v: VERSAO_DO_EVENTO, id: String(resumo?.id ?? ''), tipo: 'ataque', fase, cena: String(cena ?? ''),
    origem: noMapa(origem) ? { token: origem.token ?? null, ...lugarDe(origem), tamanho: numeroOu(origem.tamanho, 1), rotacao: numeroOu(origem.rotacao, 0) } : null,
    arma: { perfil: perfil?.chave ?? PERFIL_PADRAO, tipo: arma?.tipo ?? null, classe2077: arma?.classe2077 ?? null, municao, montada: Boolean(arma?.montada), cyber: Boolean(arma?.origem), doisCanos: Boolean(arma?.doisCanos) },
    modo: MODOS_DO_EFEITO.includes(resumo?.modo) ? resumo.modo : 'tiro', local: resumo?.local ?? null, arremesso: Boolean(resumo?.arremesso),
    balas: numeroOu(balas), area: centro(area), queda: lugarDe(queda),
    alvos: linhas.map(({ linha, pos }) => {
      const dano = danoDaLinha(linha);
      return {
        token: pos.token, ...lugarDe(pos), tamanho: numeroOu(pos.tamanho, 1), escondido: Boolean(pos.escondido),
        resultado: RESULTADOS_DO_EFEITO.includes(linha.resultado) ? linha.resultado : 'errou', escolha: linha.escolha ?? null,
        segunda: Boolean(linha.segundaTentativa || linha.segundaChance), multiplicador: numeroOu(linha.multiplicador), dano,
        estados: { mortal: Boolean(linha.dano && linha.dano.hpAntes >= 1 && linha.dano.hpDepois < 1), derrubado: Boolean(linha.derrubado), fogo: linha.municao?.efeito === 'incendiary', suprimido: Boolean(linha.suprimido) },
        municao: linha.municao?.efeito ? { efeito: String(linha.municao.efeito), resistiu: linha.municao.resistencia ? Boolean(linha.municao.resistencia.passou) : null } : null
      };
    }),
    texto: linhas.map(({ linha, pos }) => {
      const texto = textoNoToken(linha);
      return texto ? { token: pos.token, ...texto } : null;
    }).filter(Boolean)
  };
}

// A validação do evento (no cliente que vai tocar, de novo): null quando está certo, senão o motivo. O tipo e a fase
// conhecidos, até 40 alvos, os números finitos, os ids no formato do Foundry, os textos curtos e, na arma, só chaves
// (nunca um caminho de arquivo: o caminho vive no catálogo e nos perfis do mestre).
export function validarEvento(evento) {
  if (!evento || typeof evento !== 'object' || Array.isArray(evento)) return 'o evento não é um objeto';
  let tamanho;
  try { tamanho = JSON.stringify(evento).length; } catch { return 'o evento não é JSON'; }
  if (tamanho > LIMITES.tamanho) return 'o evento é grande demais';
  if (evento.v !== VERSAO_DO_EVENTO) return 'a versão';
  if (!TIPOS_DE_EVENTO.includes(evento.tipo)) return 'o tipo';
  if (!FASES.includes(evento.fase)) return 'a fase';
  if (!ID.test(evento.id ?? '')) return 'o id';
  if (!ID.test(evento.cena ?? '')) return 'a cena';
  const { origem } = evento;
  if (origem !== null && origem !== undefined) {
    if (!noMapa(origem) || (origem.token != null && !ID.test(origem.token)) || (origem.tamanho != null && !(finito(origem.tamanho) && origem.tamanho > 0 && origem.tamanho <= 50))
      || (origem.rotacao != null && !finito(origem.rotacao))) return 'a origem';
  }
  if (evento.tipo === 'ataque' && !MODOS_DO_EFEITO.includes(evento.modo)) return 'o modo';
  const { arma } = evento;
  if (arma != null) {
    if (typeof arma !== 'object' || !CHAVE_DE_PERFIL.test(arma.perfil ?? '')) return 'a arma';
    if ([arma.tipo, arma.classe2077, arma.municao?.tipo, arma.municao?.efeito].some(valor => valor != null && !(typeof valor === 'string' && PALAVRA.test(valor)))) return 'a arma';
  }
  if (evento.balas != null && !(finito(evento.balas) && evento.balas >= 0 && evento.balas <= 100)) return 'as balas';
  for (const area of [evento.area, evento.queda]) {
    if (area != null && (!noMapa(area) || (area.lado != null && !(finito(area.lado) && area.lado > 0 && area.lado <= 100)))) return 'a área';
  }
  if (!Array.isArray(evento.alvos) || evento.alvos.length > LIMITES.alvos) return 'os alvos';
  for (const alvo of evento.alvos) {
    if (!alvo || typeof alvo !== 'object' || !ID.test(alvo.token ?? '') || !noMapa(alvo)) return 'um alvo';
    if (!RESULTADOS_DO_EFEITO.includes(alvo.resultado)) return 'o resultado de um alvo';
    if (alvo.multiplicador != null && !(finito(alvo.multiplicador) && alvo.multiplicador >= 0 && alvo.multiplicador <= 10)) return 'o multiplicador';
    if (alvo.tamanho != null && !(finito(alvo.tamanho) && alvo.tamanho > 0 && alvo.tamanho <= 50)) return 'o tamanho de um alvo';
    const { dano } = alvo;
    if (dano != null && (typeof dano !== 'object' || [dano.perdeu, dano.lesoes, dano.ablado].some(valor => valor != null && !(finito(valor) && valor >= 0 && valor <= 1000)))) return 'o dano de um alvo';
    if (alvo.municao != null && !(typeof alvo.municao.efeito === 'string' && PALAVRA.test(alvo.municao.efeito))) return 'a munição de um alvo';
  }
  if (!Array.isArray(evento.texto) || evento.texto.length > LIMITES.alvos) return 'os textos';
  for (const texto of evento.texto) {
    if (!texto || !ID.test(texto.token ?? '') || typeof texto.texto !== 'string' || !texto.texto || texto.texto.length > LIMITES.texto) return 'um texto';
    if (/[\u0000-\u001f<>]/.test(texto.texto) || !ESTILOS_DO_TEXTO.includes(texto.estilo)) return 'um texto';
  }
  return null;
}

// ---------------- O roteiro ----------------
const entre = (valor, min, max) => Math.min(max, Math.max(min, valor));
const distancia = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
const emMetros = (px, casa) => (px / casa) * METROS_DA_CASA;
const emPixels = (metros, casa) => (metros / METROS_DA_CASA) * casa;
const ponto = p => ({ x: Math.round(p.x), y: Math.round(p.y) });
// O ângulo (graus) de a até b, e o ponto a partir de a numa direção e numa distância.
const angulo = (a, b) => (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
const naDirecao = (a, graus, comprimento) => ponto({ x: a.x + Math.cos((graus * Math.PI) / 180) * comprimento, y: a.y + Math.sin((graus * Math.PI) / 180) * comprimento });
// A direção em que o token olha (o rotation do Foundry: 0 para baixo, no sentido do relógio) em graus do atan2.
export const direcaoDoToken = rotacao => 90 + numeroOu(rotacao, 0);
// Um número fixo por evento (o lado do erro): o mesmo roteiro em todos os clientes.
const semente = id => [...String(id)].reduce((soma, letra) => (soma * 31 + letra.charCodeAt(0)) >>> 0, 7);
// O voo da bala: 4 ms por metro, de 80 a 400 ms.
const vooDoTiro = metros => Math.round(entre(4 * metros, 80, 400));
// Onde a bala que errou termina: passa do alvo 1,5 casa e sai 0,75 casa de lado (o lado pela semente).
function passarDo(de, alvo, lado, casa) {
  const comprimento = distancia(de, alvo) || 1;
  const ux = (alvo.x - de.x) / comprimento, uy = (alvo.y - de.y) / comprimento;
  return ponto({ x: alvo.x + ux * 1.5 * casa - uy * lado * 0.75 * casa, y: alvo.y + uy * 1.5 * casa + ux * lado * 0.75 * casa });
}

const novo = (t, passo, campos = {}) => ({ t: Math.max(0, Math.round(t)), duracao: 0, passo, de: null, para: null, token: null, chave: null, intensidade: 'normal', ...campos });
const SEM_DISPARO = ['fora', 'semDv', 'semDestino', 'semRepeticao'];

// O que voa no tiro: o traçante (da cor da munição, com o traço da classe) ou o projetil do perfil (a flecha, a chama).
const caminhoDo = perfil => (!perfil.projetil || perfil.projetil === 'tracante'
  ? { passo: 'tracante', chave: `tracante.${perfil.cor}`, traco: { largura: perfil.traco?.largura ?? TRACO_PADRAO.largura, cauda: perfil.traco?.cauda ?? TRACO_PADRAO.cauda, ...(perfil.traco?.rastro ? { rastro: true } : {}) } }
  : { passo: 'projetil', chave: `projetil.${perfil.projetil}`, traco: {} });

// O desfecho de um alvo atingido, o primeiro que vale (o plano, seção 5.3): a morte, o crítico, o veículo, a carne (o dano
// passou), o escudo, a estase, a armadura que segurou, e o acerto sem o dano ainda (o mestre aplica no cartão).
export function desfechoDoAlvo(alvo) {
  const dano = alvo?.dano;
  if (!dano) return 'acerto';
  if (alvo.estados?.mortal) return 'morte';
  if (dano.critico) return 'critico';
  if (dano.veicular) return 'veiculo';
  if (dano.passou) return 'carne';
  if (dano.escudo) return 'escudo';
  if (dano.estase) return 'estase';
  return 'armadura';
}
// O rótulo do HUD no alvo (o P11): "FLATLINE" na morte, "CRÍTICO" no crítico e o "SP −N" da armadura que segurou e
// ablou (na carne, o "−N HP" do texto já conta o que passou).
const ROTULO_DO_HUD = { morte: 'FLATLINE', critico: 'CRÍTICO' };
const rotuloDoHud = (desfecho, dano) => ROTULO_DO_HUD[desfecho] ?? (desfecho === 'armadura' && dano?.ablado > 0 ? `SP −${dano.ablado}` : null);

// O impacto num alvo atingido, no tempo t: o golpe na carne (ou na estrutura do veículo), o sangue se o dano passou da
// armadura, a faísca se a armadura, o escudo ou a estase seguraram, o som do crítico e o fogo que fica (a incendiária).
// O desfecho vai no impacto (o desenho dele), e a direção do tiro (de: de onde veio; o centro, na explosão) vai junto
// para o sangue sair do lado oposto e a faísca voltar. No último impacto de um alvo: o glitch no crítico e na morte e o
// HUD com o rótulo, depois do texto.
function impactos(passos, t, alvo, perfil, { ultimo = true, golpeDoCorpo = false, de = null } = {}) {
  const dano = alvo.dano;
  const contundente = golpeDoCorpo && !['corte', 'garra', 'chicote'].includes(perfil.golpe);
  const chave = dano?.veicular ? 'impacto.estrutura' : contundente ? 'impacto.contundente' : 'impacto.carne';
  const desfecho = desfechoDoAlvo(alvo);
  const direcao = noMapa(de) && distancia(de, alvo) > 0 ? Math.round(angulo(de, alvo)) : null;
  passos.push(novo(t, 'impacto', { para: ponto(alvo), token: alvo.token, chave, intensidade: dano?.critico ? 'forte' : 'normal', duracao: 200, desfecho, direcao }));
  if (dano?.passou && !dano.veicular && !perfil.semSangue) passos.push(novo(t, 'sangue', { para: ponto(alvo), token: alvo.token, chave: 'sangue.estilizado', duracao: 400, direcao }));
  else if (dano && (dano.escudo || dano.estase)) passos.push(novo(t, 'faisca', { para: ponto(alvo), token: alvo.token, chave: 'faisca.escudo', duracao: 250, direcao }));
  else if (dano && (!dano.passou || dano.veicular)) passos.push(novo(t, 'faisca', { para: ponto(alvo), token: alvo.token, chave: 'faisca.armadura', duracao: 250, direcao }));
  if (!ultimo) return;
  if (desfecho === 'morte' || desfecho === 'critico') passos.push(novo(t + 100, 'glitch', { para: ponto(alvo), token: alvo.token, chave: 'glitch.padrao', duracao: desfecho === 'morte' ? 600 : 300 }));
  const rotulo = rotuloDoHud(desfecho, dano);
  if (rotulo) passos.push(novo(t + 50, 'hud', { para: ponto(alvo), token: alvo.token, rotulo, estilo: desfecho === 'morte' || desfecho === 'critico' ? 'acerto' : 'defesa', duracao: 500 }));
  if (dano?.critico) passos.push(novo(t, 'som', { para: ponto(alvo), token: alvo.token, chave: 'impacto.critico' }));
  if (golpeDoCorpo && perfil.tremor) passos.push(novo(t, 'tremor', { para: ponto(alvo), duracao: 200, intensidade: 'leve' }));
  if (alvo.estados?.fogo) passos.push(novo(t, 'chamas', { para: ponto(alvo), token: alvo.token, chave: 'chamas.token', persistente: true }));
}

// O disparo na origem: o clarão do cano (se a arma tem) e o som.
function disparo(passos, evento, perfil, som = perfil.som, forte = false) {
  const { origem } = evento;
  if (!origem) return;
  // A direção do cano: para o primeiro alvo (ou o centro da área), senão para onde o token olha.
  const mira = evento.area ?? evento.queda ?? evento.alvos[0] ?? null;
  const direcao = Math.round(noMapa(mira) && distancia(origem, mira) > 0 ? angulo(origem, mira) : direcaoDoToken(origem.rotacao));
  if (perfil.clarao) passos.push(novo(0, 'clarao', { para: ponto(origem), token: origem.token, chave: `clarao.${perfil.clarao}`, duracao: 80, intensidade: forte || perfil.clarao === 'grande' ? 'forte' : 'normal', direcao }));
  // A luz do clarão (o C102): no centro de quem atira, sem o token no passo (o "fonte" é só para a altura): quem não via o
  // atirador não vê o clarão desenhado, mas a luz acende para ele também, e o Foundry decide quem a enxerga (a linha de
  // visão, as paredes) e, por ela, quem passa a ver o atirador.
  if (perfil.clarao) passos.push(novo(0, 'luz', { para: ponto(origem), fonte: origem.token, raio: perfil.clarao === 'grande' ? LUZ.raioGrande : LUZ.raio, duracao: LUZ.duracao }));
  if (som) passos.push(novo(0, 'som', { para: ponto(origem), token: origem.token, chave: som }));
}

// O tiro único (o mirado, o ricochete, os dois canos): o traçante até o alvo, o impacto na chegada e o texto 60 ms depois.
// O erro passa do alvo e acaba numa faísca no chão; a esquiva desliza o alvo para o lado antes da chegada.
function roteiroDoTiro(evento, perfil, { casa }, tempos) {
  const passos = [];
  disparo(passos, evento, perfil);
  const caminho = caminhoDo(perfil);
  const canos = evento.modo === 'doisCanos' || evento.arma?.doisCanos ? 2 : 1;
  const lado = semente(evento.id) % 2 ? 1 : -1;
  evento.alvos.forEach((alvo, i) => {
    const base = i * 150;
    if (SEM_DISPARO.includes(alvo.resultado)) { tempos.set(alvo.token, base + 100); return; }
    if (!evento.origem) { impactos(passos, base, alvo, perfil); tempos.set(alvo.token, base + 60); return; }
    const voo = vooDoTiro(emMetros(distancia(evento.origem, alvo), casa));
    const acerta = alvo.resultado === 'acertou';
    const fim = acerta ? ponto(alvo) : passarDo(evento.origem, alvo, i % 2 ? -lado : lado, casa);
    // O crítico: o traçante congela 60 ms antes de bater (o hit-stop do plano, seção 5.3).
    const parada = acerta && alvo.dano?.critico ? 60 : 0;
    for (let cano = 0; cano < canos; cano++) {
      passos.push(novo(base + 40 + cano * 30, caminho.passo, { de: ponto(evento.origem), para: fim, chave: caminho.chave, duracao: voo + parada, acerta, curva: perfil.curva || alvo.segunda, atravessa: perfil.atravessa, ...caminho.traco, ...(parada ? { parada } : {}) }));
    }
    const chegada = base + 40 + voo + parada + (canos - 1) * 30;
    if (acerta) impactos(passos, chegada, alvo, perfil, { de: evento.origem });
    else {
      if (alvo.resultado === 'esquivou') passos.push(novo(chegada - 60, 'esquiva', { para: ponto(alvo), token: alvo.token, duracao: 160, direcao: Math.round(angulo(evento.origem, alvo)) }));
      passos.push(novo(chegada, 'faisca', { para: fim, chave: 'faisca.chao', duracao: 200 }));
      passos.push(novo(chegada, 'marca', { para: fim, chave: 'marca.bala', duracao: MARCA_DURA, persistente: true }));
    }
    tempos.set(alvo.token, chegada + 60);
  });
  return passos;
}

// O autofogo: até 6 traçantes, um a cada 70 ms, num leque de ±4°; os que acertam são min(multiplicador, traçantes), cada
// um com o impacto na chegada; o texto depois do último impacto.
function roteiroDoAutofogo(evento, perfil, { casa }, tempos) {
  const passos = [];
  disparo(passos, evento, perfil, perfil.rajada ?? 'rajada.padrao');
  const caminho = caminhoDo(perfil);
  const n = Math.min(Math.max(1, evento.balas ?? 10), 6);
  evento.alvos.forEach((alvo, i) => {
    const base = i * (n * 70 + 200);
    if (SEM_DISPARO.includes(alvo.resultado)) { tempos.set(alvo.token, base + 100); return; }
    if (!evento.origem) { impactos(passos, base, alvo, perfil); tempos.set(alvo.token, base + 60); return; }
    const voo = vooDoTiro(emMetros(distancia(evento.origem, alvo), casa));
    const acertos = alvo.resultado === 'acertou' ? Math.min(Math.max(1, alvo.multiplicador ?? 1), n) : 0;
    const direcao = angulo(evento.origem, alvo);
    const alem = distancia(evento.origem, alvo) + 1.5 * casa;
    let ultimo = base + 40 + (n - 1) * 70 + voo;
    for (let k = 0; k < n; k++) {
      const leque = n > 1 ? -4 + (8 * k) / (n - 1) : 0;
      const acerta = k < acertos;
      const t = base + 40 + k * 70;
      passos.push(novo(t, caminho.passo, { de: ponto(evento.origem), para: acerta ? ponto(alvo) : naDirecao(evento.origem, direcao + leque + (leque < 0 ? -3 : 3), alem), chave: caminho.chave, duracao: voo, acerta, curva: perfil.curva, atravessa: perfil.atravessa, ...caminho.traco }));
      if (acerta) { impactos(passos, t + voo, alvo, perfil, { ultimo: k === acertos - 1, de: evento.origem }); ultimo = t + voo; }
    }
    if (alvo.resultado === 'esquivou') passos.push(novo(base + 40 + voo - 60, 'esquiva', { para: ponto(alvo), token: alvo.token, duracao: 160, direcao: Math.round(direcao) }));
    tempos.set(alvo.token, ultimo + 60);
  });
  return passos;
}

// O fogo supressivo: a varredura de 1,2 s, com 8 traçantes entre os ângulos dos afetados (sem alvo, numa faixa de 60° na
// direção do token), e os textos "Suprimido!" e "Firme" a cada 120 ms, do mais perto ao mais longe. Sem impacto nem sangue.
function roteiroDoSupressivo(evento, perfil, { casa }, tempos) {
  const passos = [];
  const { origem } = evento;
  disparo(passos, evento, perfil, perfil.rajada ?? 'rajada.padrao');
  const porDistancia = [...evento.alvos].sort((a, b) => (origem ? distancia(origem, a) - distancia(origem, b) : 0));
  porDistancia.forEach((alvo, j) => tempos.set(alvo.token, 300 + j * 120));
  if (!origem) return passos;
  const caminho = caminhoDo(perfil);
  // Os ângulos em volta do primeiro alvo (de −180° a +180° dele): os alvos dos dois lados do 180° não viram uma volta inteira.
  const referencia = evento.alvos.length ? angulo(origem, evento.alvos[0]) : 0;
  const angulos = evento.alvos.map(alvo => referencia + ((((angulo(origem, alvo) - referencia) % 360) + 540) % 360) - 180).sort((a, b) => a - b);
  const centro = direcaoDoToken(origem.rotacao);
  const [menor, maior] = !angulos.length ? [centro - 30, centro + 30] : angulos.length === 1 ? [angulos[0] - 10, angulos[0] + 10] : [angulos[0], angulos.at(-1)];
  const longe = evento.alvos.length ? Math.max(...evento.alvos.map(alvo => distancia(origem, alvo))) + casa : emPixels(RAIO_SUPRESSIVO, casa);
  const voo = vooDoTiro(emMetros(longe, casa));
  for (let k = 0; k < 8; k++) {
    passos.push(novo(40 + k * 150, caminho.passo, { de: ponto(origem), para: naDirecao(origem, menor + ((maior - menor) * k) / 7, longe), chave: caminho.chave, duracao: voo, acerta: false, ...caminho.traco }));
  }
  return passos;
}

// O cartucho da espingarda: o clarão forte e um leque de 5 traçantes curtos (o cone de 6 m), que chegam juntos; os
// impactos simultâneos nos que foram pegos, e nada nos que ficaram fora.
function roteiroDoCartucho(evento, perfil, { casa }, tempos) {
  const passos = [];
  const { origem } = evento;
  disparo(passos, evento, perfil, perfil.som, true);
  const chegada = 120;
  if (origem) {
    const caminho = caminhoDo(perfil);
    const mira = evento.alvos.find(alvo => alvo.resultado === 'acertou') ?? evento.alvos[0];
    const direcao = mira ? angulo(origem, mira) : direcaoDoToken(origem.rotacao);
    const comprimento = emPixels(ALCANCE_DO_CARTUCHO, casa);
    [-20, -10, 0, 10, 20].forEach((ajuste, k) => {
      passos.push(novo(40, caminho.passo, { de: ponto(origem), para: naDirecao(origem, direcao - 15 + 7.5 * k, comprimento), chave: caminho.chave, duracao: 80 + ajuste, acerta: false, ...caminho.traco }));
    });
  }
  for (const alvo of evento.alvos) {
    if (alvo.resultado === 'acertou') impactos(passos, chegada, alvo, perfil, { de: origem });
    tempos.set(alvo.token, chegada + 60);
  }
  return passos;
}

// O explosivo: o projetil reto do lançador (de 300 a 600 ms) ou o arco do arremesso (de 600 a 900 ms) até o centro, a
// explosão, a onda até a borda da área, o tremor depois da explosão e os impactos de quem foi pego pela distância do
// centro (+20 ms por metro). A granada que errou vai até o alvo e some, sem explosão, até o mestre marcar onde caiu (a
// queda). As granadas sem dano: a fumaça fica (a nuvem com o fim pelo tempo do mundo), o gás é uma nuvem curta, o
// flashbang é o clarão e a tela branca em quem falhou, o EMP são as faíscas, a Arachnid é a teia.
const NUVENS = { smoke: 'nuvem.fumaca', teargas: 'nuvem.gas', biotoxin: 'nuvem.toxina', poison: 'nuvem.toxina', sleep: 'nuvem.sono' };
function roteiroDoExplosivo(evento, perfil, { casa, agora }, tempos) {
  const passos = [];
  const { origem } = evento;
  const centro = evento.area ?? evento.queda ?? null;
  const destino = centro ?? evento.alvos[0] ?? null;
  const arremesso = evento.arremesso || perfil.familia === 'arremesso';
  let chegada = 0;
  if (origem && destino) {
    const metros = emMetros(distancia(origem, destino), casa);
    const chave = `projetil.${perfil.projetil && perfil.projetil !== 'tracante' ? perfil.projetil : 'granada'}`;
    if (arremesso) {
      const voo = Math.round(entre(600 + 10 * metros, 600, 900));
      passos.push(novo(0, 'som', { para: ponto(origem), token: origem.token, chave: perfil.som ?? 'arremesso.lancar' }));
      passos.push(novo(0, 'arco', { de: ponto(origem), para: ponto(destino), chave, duracao: voo }));
      chegada = voo;
    } else {
      disparo(passos, evento, perfil);
      const voo = Math.round(entre(300 + 6 * metros, 300, 600));
      passos.push(novo(20, 'projetil', { de: ponto(origem), para: ponto(destino), chave, duracao: voo }));
      chegada = 20 + voo;
    }
  }
  if (!centro) {
    for (const alvo of evento.alvos) tempos.set(alvo.token, chegada + 60);
    return passos;
  }
  const efeito = evento.arma?.municao?.efeito ?? '';
  const semDano = Object.hasOwn(MUNICAO_SEM_DANO, efeito);
  const fogo = efeito === 'incendiary' || perfil.projetil === 'molotov';
  const explosao = efeito === 'emp' ? 'explosao.emp' : semDano ? 'explosao.leve' : fogo ? 'explosao.fogo' : 'explosao.frag';
  const raio = emPixels(numeroOu(centro.lado, LADO_DA_AREA) / 2, casa);
  passos.push(novo(chegada, 'explosao', { para: ponto(centro), chave: explosao, duracao: 400, intensidade: semDano ? 'leve' : 'forte' }));
  passos.push(novo(chegada, 'som', { para: ponto(centro), chave: explosao }));
  if (efeito === 'flashbang') passos.push(novo(chegada, 'clarao', { para: ponto(centro), chave: 'clarao.flashbang', duracao: 150, intensidade: 'forte' }));
  if (!semDano || efeito === 'emp') passos.push(novo(chegada, 'onda', { para: ponto(centro), chave: efeito === 'emp' ? 'onda.emp' : 'onda.choque', duracao: 250, raio: Math.round(raio) }));
  if (!semDano) passos.push(novo(chegada + 20, 'tremor', { para: ponto(centro), duracao: 300, intensidade: 'forte' }));
  if (efeito === 'smoke') passos.push(novo(chegada, 'nuvem', { para: ponto(centro), chave: NUVENS.smoke, lado: numeroOu(centro.lado, LADO_DA_AREA), persistente: true, fim: numeroOu(agora, 0) + 60 }));
  else if (Object.hasOwn(NUVENS, efeito)) passos.push(novo(chegada, 'nuvem', { para: ponto(centro), chave: NUVENS[efeito], lado: numeroOu(centro.lado, LADO_DA_AREA), duracao: 2000 }));
  const porDistancia = [...evento.alvos].sort((a, b) => distancia(centro, a) - distancia(centro, b));
  for (const alvo of porDistancia) {
    const t = chegada + 20 * emMetros(distancia(centro, alvo), casa);
    if (alvo.resultado === 'acertou') {
      const falhou = alvo.municao?.resistiu === false;
      if (!semDano) impactos(passos, t, alvo, perfil, { de: centro });
      else if (efeito === 'flashbang' && falhou) passos.push(novo(t, 'tela', { token: alvo.token, chave: 'tela.flash', duracao: 600, intensidade: 'forte' }));
      else if (efeito === 'emp') passos.push(novo(t, 'faisca', { para: ponto(alvo), token: alvo.token, chave: 'faisca.emp', duracao: 300 }));
      else if (efeito === 'arachnid') passos.push(novo(t, 'anel', { para: ponto(alvo), token: alvo.token, chave: 'anel.teia', persistente: true }));
    } else if (alvo.resultado === 'esquivou') passos.push(novo(t - 60, 'esquiva', { para: ponto(alvo), token: alvo.token, duracao: 160 }));
    tempos.set(alvo.token, Math.round(t) + 60);
  }
  return passos;
}

// O corpo a corpo: quem ataca avança (120 ms de ida, 120 de volta), o golpe aos 80 ms (o arco da lâmina, o soco, a garra,
// o chicote em linha até o alvo), o impacto aos 120 e o texto aos 180; a esquiva aos 60.
function roteiroDoCorpo(evento, perfil, _opcoes, tempos) {
  const passos = [];
  const { origem } = evento;
  const corpo = perfil.familia === 'corpo' ? perfil : PERFIS.soco;
  evento.alvos.forEach((alvo, i) => {
    const base = i * 300;
    if (origem) {
      passos.push(novo(base, 'avanco', { de: ponto(origem), para: ponto(alvo), token: origem.token, duracao: 240 }));
      passos.push(novo(base + 80, 'golpe', { de: ponto(origem), para: ponto(alvo), token: origem.token, chave: `golpe.${corpo.golpe}`, duracao: corpo.golpe === 'chicote' ? 150 : 120, brilho: Boolean(corpo.brilho) }));
      passos.push(novo(base + 80, 'som', { para: ponto(origem), token: origem.token, chave: corpo.som }));
    }
    if (alvo.resultado === 'acertou') impactos(passos, base + 120, alvo, corpo, { golpeDoCorpo: true, de: origem });
    else if (alvo.resultado === 'esquivou') passos.push(novo(base + 60, 'esquiva', { para: ponto(alvo), token: alvo.token, duracao: 160 }));
    tempos.set(alvo.token, base + 180);
  });
  return passos;
}

// A arma arremessada que não explode (a faca, o bumerangue): a lâmina gira em arco até o alvo.
function roteiroDoArremesso(evento, perfil, { casa }, tempos) {
  const passos = [];
  const { origem } = evento;
  const lado = semente(evento.id) % 2 ? 1 : -1;
  if (origem) passos.push(novo(0, 'som', { para: ponto(origem), token: origem.token, chave: 'arremesso.lancar' }));
  evento.alvos.forEach((alvo, i) => {
    const base = i * 150;
    if (SEM_DISPARO.includes(alvo.resultado) || !origem) {
      if (!origem && alvo.resultado === 'acertou') impactos(passos, base, alvo, perfil);
      tempos.set(alvo.token, base + 100);
      return;
    }
    const voo = Math.round(entre(300 + 10 * emMetros(distancia(origem, alvo), casa), 300, 600));
    const acerta = alvo.resultado === 'acertou';
    const fim = acerta ? ponto(alvo) : passarDo(origem, alvo, lado, casa);
    passos.push(novo(base, 'arco', { de: ponto(origem), para: fim, chave: 'projetil.lamina', duracao: voo, acerta }));
    if (acerta) impactos(passos, base + voo, alvo, perfil, { de: origem });
    else {
      if (alvo.resultado === 'esquivou') passos.push(novo(base + voo - 60, 'esquiva', { para: ponto(alvo), token: alvo.token, duracao: 160, direcao: Math.round(angulo(origem, alvo)) }));
      passos.push(novo(base + voo, 'faisca', { para: fim, chave: 'faisca.chao', duracao: 200 }));
      passos.push(novo(base + voo, 'marca', { para: fim, chave: 'marca.bala', duracao: MARCA_DURA, persistente: true }));
    }
    tempos.set(alvo.token, base + voo + 60);
  });
  return passos;
}

// Os eventos que não são o desfecho de um ataque (as fases seguintes do plano): o disparo (o momento A, o C82), o
// agarrão (o C84), o corpo (o Death Save e a morte, o C86), a NET e o quickhack (o C89), a recarga (o C87). O resto, só o
// texto por enquanto.
function roteiroDoOutro(evento, perfil, _opcoes, tempos) {
  const passos = [];
  const { origem } = evento;
  if (evento.fase === 'disparo') {
    if (perfil.familia === 'corpo') return passos;
    disparo(passos, evento, perfil, perfil.familia === 'arremesso' ? 'arremesso.lancar' : evento.modo === 'autofogo' || evento.modo === 'supressivo' ? perfil.rajada ?? 'rajada.padrao' : perfil.som);
    return passos;
  }
  if (evento.tipo === 'recarga') {
    if (origem) passos.push(novo(0, 'som', { para: ponto(origem), token: origem.token, chave: perfil.recarga ?? 'recarga.padrao' }));
    return passos;
  }
  for (const alvo of evento.alvos) {
    if (evento.tipo === 'agarrao') {
      if (origem) passos.push(novo(0, 'avanco', { de: ponto(origem), para: ponto(alvo), token: origem.token, duracao: 240 }));
      if (alvo.resultado === 'acertou') passos.push(novo(240, 'anel', { para: ponto(alvo), token: alvo.token, chave: 'anel.agarrao', persistente: true }));
      if (alvo.estados?.derrubado) {
        passos.push(novo(240, 'tomba', { para: ponto(alvo), token: alvo.token, duracao: 400 }));
        passos.push(novo(260, 'tremor', { para: ponto(alvo), duracao: 200, intensidade: 'leve' }));
      }
      tempos.set(alvo.token, 300);
    } else if (evento.tipo === 'corpo') {
      const morreu = alvo.resultado === 'acertou';
      passos.push(novo(0, 'som', { para: ponto(alvo), token: alvo.token, chave: morreu ? 'corpo.flatline' : 'corpo.batimento', duracao: morreu ? 1500 : 600 }));
      if (morreu) passos.push(novo(0, 'glitch', { para: ponto(alvo), token: alvo.token, chave: 'glitch.padrao', duracao: 1500 }));
      tempos.set(alvo.token, 200);
    } else if ((evento.tipo === 'net' || evento.tipo === 'quickhack') && alvo.resultado === 'acertou') {
      passos.push(novo(0, 'glitch', { para: ponto(alvo), token: alvo.token, chave: 'glitch.padrao', duracao: 400 }));
      tempos.set(alvo.token, 200);
    }
  }
  return passos;
}

const ROTEIROS = {
  tiro: roteiroDoTiro, ricochete: roteiroDoTiro, doisCanos: roteiroDoTiro, autofogo: roteiroDoAutofogo, supressivo: roteiroDoSupressivo,
  cartucho: roteiroDoCartucho, explosivo: roteiroDoExplosivo, corpo: roteiroDoCorpo, arremesso: roteiroDoArremesso
};

// Os passos do evento, antes do nível e do teto. casa: o tamanho da casa da cena (px); agora: o tempo do mundo (s), para
// o fim do que dura.
export function montarPassos(evento, { casa = 100, agora = 0, doMestre = null } = {}) {
  const perfil = perfilDoEvento(evento.arma, doMestre);
  const tempos = new Map();
  const opcoes = { casa: finito(casa) && casa > 0 ? casa : 100, agora };
  let escolhido = evento.tipo !== 'ataque' || evento.fase !== 'desfecho' ? roteiroDoOutro : ROTEIROS[evento.modo] ?? roteiroDoTiro;
  if ((escolhido === roteiroDoTiro) && (evento.arremesso || perfil.familia === 'arremesso')) escolhido = roteiroDoArremesso;
  if (escolhido === roteiroDoTiro && perfil.familia === 'corpo') escolhido = roteiroDoCorpo;
  if (escolhido === roteiroDoTiro && perfil.familia === 'explosivo') escolhido = roteiroDoExplosivo;
  const passos = escolhido(evento, perfil, opcoes, tempos);
  const fim = passos.reduce((maior, p) => Math.max(maior, p.t + (p.persistente ? 0 : p.duracao)), 0);
  for (const texto of evento.texto ?? []) {
    passos.push(novo(tempos.get(texto.token) ?? fim, 'texto', { token: texto.token, texto: texto.texto, estilo: texto.estilo, duracao: 600 }));
  }
  return passos.sort((a, b) => a.t - b.t);
}

// O nível de cada navegador: o completo é tudo; o reduzido fica com um traçante por ataque, sem partículas, sem tremor e
// sem sangue (a faísca no lugar) e com a nuvem só no contorno, e o som continua; o texto deixa só os textos, todos na hora
// (o "Só o texto" de hoje); o nada é vazio. À parte: o sangue desligado vira faísca, o tremor desligado sai, e o modo
// fotossensível do Foundry tira o tremor, a tela branca e o clarão forte.
export function filtrarPeloNivel(passos, { nivel = 'completo', sangue = true, tremor = true, fotossensivel = false } = {}) {
  if (!NIVEIS.includes(nivel) || nivel === 'nada') return [];
  if (nivel === 'texto') return passos.filter(p => p.passo === 'texto').map(p => ({ ...p, t: 0 }));
  const reduzido = nivel === 'reduzido';
  let tracantes = 0;
  const saida = [];
  for (const passo of passos) {
    if (passo.passo === 'tremor' && (reduzido || !tremor || fotossensivel)) continue;
    // A luz do clarão pisca a cena: sai no reduzido e no fotossensível (o C102).
    if (passo.passo === 'luz' && (reduzido || fotossensivel)) continue;
    if (fotossensivel && (passo.passo === 'tela' || (passo.passo === 'clarao' && passo.intensidade === 'forte'))) continue;
    if (passo.passo === 'tracante' && reduzido && tracantes++ > 0) continue;
    const trocado = passo.passo === 'sangue' && (reduzido || !sangue) ? { passo: 'faisca', chave: 'faisca.armadura' } : {};
    saida.push({ ...passo, ...trocado, particulas: !reduzido, ...(reduzido && passo.passo === 'nuvem' ? { contorno: true } : {}) });
  }
  return saida;
}

// O teto (ms): o roteiro que passa dele perde os traçantes extras (fica o que acerta e até 3 dos outros) e, se ainda
// passa, tem os tempos e as durações comprimidos na mesma proporção. Os textos nunca saem. O que dura (a nuvem, o fogo)
// conta só pelo começo.
const fimDe = passos => passos.reduce((fim, p) => Math.max(fim, p.t + (p.persistente ? 0 : p.duracao)), 0);
export function comprimir(passos, teto) {
  let lista = passos.map(p => ({ ...p }));
  if (!(teto > 0) || fimDe(lista) <= teto) return lista;
  let soltos = 0;
  lista = lista.filter(p => p.passo !== 'tracante' || p.acerta || soltos++ < 3);
  const fim = fimDe(lista);
  if (fim > teto) {
    const fator = teto / fim;
    lista = lista.map(p => ({ ...p, t: Math.floor(p.t * fator), duracao: p.persistente ? p.duracao : Math.floor(p.duracao * fator) }));
  }
  return lista.sort((a, b) => a.t - b.t);
}

// O roteiro de um evento, pronto para o diretor: valida, monta, aplica o nível do navegador e o teto. O evento inválido
// (ou o nível nada) é o roteiro vazio.
export function roteiro(evento, { nivel = 'completo', sangue = true, tremor = true, fotossensivel = false, casa = 100, agora = 0, doMestre = null } = {}) {
  if (!NIVEIS.includes(nivel) || nivel === 'nada' || validarEvento(evento)) return [];
  const passos = filtrarPeloNivel(montarPassos(evento, { casa, agora, doMestre }), { nivel, sangue, tremor, fotossensivel });
  return comprimir(passos, TETO[nivel] ?? TETO.completo);
}

// ---------------- O diretor (o C79): o que é puro ----------------
// "Efeitos neste navegador" (efeitosIntensidade): o automático, ou o nível que o jogador escolhe (nunca acima do da mesa).
export const INTENSIDADES = ['auto', 'completo', 'reduzido', 'texto', 'nada'];
// O automático: o reduzido no celular, no Safari (o WebKit), no computador fraco (até 2 núcleos) e com o modo
// fotossensível do Foundry; senão, o da mesa.
export const nivelAutomatico = ({ fotossensivel = false, celular = false, webkit = false, nucleos = 8 } = {}) =>
  (fotossensivel || celular || webkit || (finito(nucleos) && nucleos <= 2) ? 'reduzido' : 'mesa');
// O nível deste navegador a partir das duas configurações (a da mesa, animacoes, e a dele) e do aparelho.
export function nivelDoNavegador(mundo, escolha = 'auto', aparelho = {}) {
  const cliente = escolha === 'auto' || !INTENSIDADES.includes(escolha) ? nivelAutomatico(aparelho) : escolha;
  return nivelEfetivo(mundo, cliente);
}

// O que este navegador vê do roteiro: sai o passo num token que ele não vê (o escondido, o fora da visão) e, com o token
// de quem atacou fora da vista, tudo o que sai dele (o clarão, o som no cano, o traçante): o jogador vê o impacto no
// alvo, mas não descobre de onde veio o tiro. visivel(id): o teste de visão do Foundry neste cliente. A luz do clarão (o
// C102) fica mesmo sem ver quem atirou: no escuro, é ela que o revela, para quem tem a linha de visão até ali; mas sai
// quando o mestre escondeu o token (oculto(id): o hidden, neste cliente de jogador), que nenhuma luz revela.
export function passosVisiveis(passos, { visivel = () => true, origem = null, oculto = () => false } = {}) {
  const veOrigem = !origem || Boolean(visivel(origem));
  const vistos = new Map();
  const ve = token => {
    if (!vistos.has(token)) vistos.set(token, Boolean(visivel(token)));
    return vistos.get(token);
  };
  const escondida = passo => passo.passo === 'luz' && Boolean(passo.fonte) && Boolean(oculto(passo.fonte));
  // Sem ver quem atirou, a direção do tiro também sai (o sangue e a faísca não apontam de onde veio).
  return passos.filter(passo => (!passo.token || ve(passo.token)) && (veOrigem || (!passo.de && passo.token !== origem)) && !escondida(passo))
    .map(passo => (veOrigem || passo.direcao == null ? passo : { ...passo, direcao: null }));
}

// O tiro que errou segue até a parede (o C80; o plano, seção 5.2): o traçante (ou o projetil reto) que não acerta é
// prolongado até "alcance" px além do fim e, se bate numa parede no caminho, para nela; a faísca e a marca do fim vão
// junto, para a parede, no tempo da chegada. colidir(de, ate): o ponto da primeira parede, ou null (o Foundry, no
// cliente: todos têm as mesmas paredes, e o mesmo roteiro dá o mesmo ponto). O voo cresce na mesma proporção, até o
// dobro.
export function pararNaParede(passos, colidir, { alcance = 0 } = {}) {
  const movidos = new Map();
  const lugar = p => `${p.x},${p.y}`;
  const saida = passos.map(passo => {
    if (!['tracante', 'projetil'].includes(passo.passo) || passo.acerta !== false || !noMapa(passo.de) || !noMapa(passo.para)) return passo;
    const total = distancia(passo.de, passo.para);
    if (!(total > 0)) return passo;
    const alem = ponto({ x: passo.para.x + ((passo.para.x - passo.de.x) / total) * alcance, y: passo.para.y + ((passo.para.y - passo.de.y) / total) * alcance });
    let batida = null;
    try { batida = colidir(passo.de, alem); } catch { batida = null; }
    if (!noMapa(batida)) return passo;
    const para = ponto(batida);
    const duracao = Math.round(entre(passo.duracao * (distancia(passo.de, para) / total), 20, 2 * passo.duracao));
    if (!movidos.has(lugar(passo.para))) movidos.set(lugar(passo.para), { para, t: passo.t + duracao });
    return { ...passo, para, duracao, parede: true };
  });
  return saida.map(passo => {
    const movido = ['faisca', 'marca'].includes(passo.passo) && !passo.token && noMapa(passo.para) ? movidos.get(lugar(passo.para)) : null;
    return movido ? { ...passo, para: movido.para, t: movido.t, parede: true } : passo;
  }).sort((a, b) => a.t - b.t);
}

// Quando o próximo evento pode começar: no fim do último passo; o texto e o que dura contam só pelo começo (o texto sobe
// sozinho, e esperar por ele atrasaria a mesa).
export const fimDoTocar = passos => passos.reduce((fim, p) => Math.max(fim, p.t + (p.persistente || p.passo === 'texto' ? 0 : p.duracao)), 0);
// Só os textos, na hora: o evento que esperou demais (a fila cheia).
export const soTexto = passos => passos.filter(p => p.passo === 'texto').map(p => ({ ...p, t: 0 }));
// A fila deste navegador: até 3 eventos esperando; o que passa disso sai pelos mais velhos, que viram só o texto na hora,
// para o efeito nunca ficar muito atrás do jogo. Devolve a fila nova e os que saíram.
export const ESPERA_MAXIMA = 3;
export function entrarNaFila(fila, item, maximo = ESPERA_MAXIMA) {
  const nova = [...fila, item];
  const sairam = nova.length > maximo ? nova.splice(0, nova.length - maximo) : [];
  return { fila: nova, sairam };
}

// As chaves do catálogo que um roteiro e os perfis usam (o G3 confere que todas existem no catálogo).
export const chavesDoRoteiro = passos => [...new Set(passos.map(p => p.chave).filter(Boolean))];
export const chavesDosPerfis = () => [...new Set(Object.values(PERFIS).flatMap(p => [p.som, p.rajada, p.recarga, p.golpe && `golpe.${p.golpe}`]).filter(Boolean))];
export const chaveConhecida = temEfeito;

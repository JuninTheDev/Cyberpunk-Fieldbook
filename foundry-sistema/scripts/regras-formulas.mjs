// C43: as contas e a leitura dos modificadores de dados, sem depender do Foundry.
import { bonusDoCritico } from './regras.mjs';

// Wiki, system-rules.js:457 e :487; CORE 0.93, cpr-die-extended.js:255–294.
// O dado extra entra uma vez, somado no máximo ou subtraído no 1. O CORE deixa o d1 simples.
export function resultadoRed(natural, extra = 0, faces = 10, limiar = faces) {
  const multiplicadorExtra = faces <= 1 ? 0 : natural >= limiar ? 1 : natural === 1 ? -1 : 0;
  return {
    total: natural + extra * multiplicadorExtra,
    critico: multiplicadorExtra > 0 ? 'sucesso' : multiplicadorExtra < 0 ? 'falha' : null,
    multiplicadorExtra
  };
}

// CORE 0.93, cpr-die-extended.js:100–117: o Foundry junta letras vizinhas (dmgab2), mas os parâmetros
// pertencem ao modificador que os antecede. Os nomes do Die são recebidos para preservar também kh, xo, etc.
export function separarModificadores(tokens, palavras = ['red', 'crit', 'dmg', 'ab', 'cd']) {
  const nomes = (Array.isArray(palavras) ? [...palavras] : Object.keys(palavras)).sort((a, b) => b.length - a.length);
  const separar = token => {
    const comando = token.match(/[A-Za-z]+/)?.[0]?.toLowerCase();
    if (!comando || (nomes.includes(comando) && !/[A-Za-z]/.test(token.slice(comando.length)))) return [token];
    const partes = [];
    let restante = token;
    while (restante) {
      const nome = nomes.find(palavra => restante.toLowerCase().startsWith(palavra));
      if (!nome) break;
      restante = restante.slice(nome.length);
      const parametros = restante.match(/^[^A-Za-z\s(){}[\]+\-*/]+/)?.[0] ?? '';
      restante = restante.slice(parametros.length);
      partes.push(nome + parametros);
    }
    return partes.length ? [...partes, ...(restante ? [restante] : [])] : [token];
  };
  return (Array.isArray(tokens) ? tokens : [tokens]).flatMap(separar);
}

// CORE 0.93, cpr-die-extended.js:303–323: número solto é o limiar; zero é a sentinela "nunca".
export function lerModificadorDano(modificador, faces = 6) {
  const partes = modificador.match(/^dmg([0-9]+)?([<>=]+)?([0-9]+)?$/i);
  if (!partes) return null;
  const [, primeiro, comparacao, segundo] = partes;
  const solto = primeiro && !comparacao && !segundo;
  return {
    quantidade: primeiro === '0' ? 0 : solto || primeiro === undefined ? 2 : Number(primeiro),
    comparacao: comparacao || '>=',
    limiar: primeiro !== '0' && solto ? Number(primeiro) : segundo === undefined ? faces : Number(segundo)
  };
}

// CORE 0.93, cpr-die-extended.js:348–377 e add-damage-application.js:19–20, :39–44.
// Os marcadores só descrevem o dano: não mudam o total dos dados; ab e cd só valem junto de dmg.
export function parametrosDoDano(modificadores, faces = 6) {
  const partes = separarModificadores(modificadores);
  const marcadores = partes.map(parte => lerModificadorDano(parte, faces)).filter(Boolean);
  if (!marcadores.length) return null;
  const resultado = { ...marcadores.at(-1), ablacao: 1, bonus: 5 };
  for (const parte of partes) {
    const ablacao = parte.match(/^ab([0-9]+)?$/i);
    const bonus = parte.match(/^cd([0-9]+)?$/i);
    if (ablacao) resultado.ablacao = ablacao[1] === undefined ? 1 : Number(ablacao[1]);
    if (bonus) resultado.bonus = bonus[1] === undefined ? 5 : Number(bonus[1]);
  }
  return resultado;
}

// Wiki, system-rules.js:463 e :549: o padrão da arma conta seis e soma +5. O marcador dmg pode
// escolher outro limiar/comparação, como o CORE 0.93 (cpr-die-extended.js:328–334).
export function danoCriticoConfigurado(resultados, { quantidade = 2, bonus = 5, comparacao = '=', limiar = 6 } = {}) {
  const comparar = valor => {
    switch (comparacao) {
      case '=': return valor === limiar;
      case '<': return valor < limiar;
      case '<=': return valor <= limiar;
      case '>': return valor > limiar;
      case '>=': return valor >= limiar;
      default: return false;
    }
  };
  const critico = quantidade > 0 && resultados.filter(comparar).length >= quantidade;
  return { critico, bonus: critico ? bonus : 0 };
}

// CORE 0.93, item/mixins/cpr-attackable.js:280–296; os campos nos modelos attackable-schema.js:29–60
// e ammo-datamodel.js:60–90.
// a munição que substitui leva a regra inteira; seis 0 nunca causa crítico e bônus 0 mantém a lesão.
// O bônus vazio da arma preserva a Power da wiki (system-2077.js:156), pelo perfil já usado no sistema.
export function resolverCriticoDaArma(systemArma = {}, systemMunicao = null, perfil = null) {
  const substitui = systemMunicao?.critico?.substitui === true;
  const critico = (substitui ? systemMunicao.critico : systemArma.critico) ?? {};
  return {
    quantidade: critico.seis ?? 2,
    bonus: critico.bonus ?? (substitui ? 5 : bonusDoCritico(perfil)),
    comparacao: '=', limiar: 6
  };
}

// CORE 0.93, sanitize-damage-formula.js:30–55. No campo de dano do item, as opções vêm da ficha;
// removê-las só na cauda de cada dado preserva modificadores normais, referências e sabores da fórmula.
export function sanitizarFormulaDano(formula) {
  if (typeof formula !== 'string' || !formula) return { formula, removidos: [] };
  const removidos = new Set();
  const limpa = formula.replace(/(\d*[dD]\d+)([^\s(){}[\]+\-*/]*)/g, (termo, dado, modificadores) => {
    const restantes = modificadores.replace(/(?:dmg[0-9]*(?:[<>=]+[0-9]+)?|(?:ab|cd|red)[0-9]*)/gi, marcador => {
      removidos.add(marcador.match(/^[a-z]+/i)[0].toLowerCase());
      return '';
    });
    return dado + restantes;
  });
  return { formula: limpa, removidos: ['dmg', 'ab', 'cd', 'red'].filter(marcador => removidos.has(marcador)) };
}

export const retirarMarcadoresDano = formula => sanitizarFormulaDano(formula).formula;

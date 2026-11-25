// As modificações de armas (o C66): a regra da casa que o usuário decidiu em 2026-11-23 (o ROADMAP, "As modificações de
// armas"), ligada à Invention Expertise do Tech (RED p. 147–148: o Tech inventa upgrades com a aprovação do mestre). Os
// acessórios do livro (os slots de acessório, as lunetas, os carregadores, o Smartgun Link, os Rebuilds) não mudam. Aqui
// ficam as contas, sem o Foundry: os slots de modificação, o formato de cada modificação (a condição e o efeito), onde ela
// cabe e o que entra no ataque. A página da regra na wiki e a lista das modificações vêm no C68; a rolagem, no C67.
import { armaExotica } from './regras.mjs';

// Os slots de modificação, à parte dos de acessório: 2 em toda arma (a branca também); 1 na exótica e na de qualidade
// ruim; o defeito (sorteado) dá +1, até 3, e só cabe um defeito por arma.
export const SLOTS = { normal: 2, reduzido: 1, porDefeito: 1, maximo: 3, defeitos: 1 };
// O ataque: nenhuma modificação dá bônus fixo; no máximo uma de ataque por arma, de +1 numa situação; e a arma soma até +3
// por rolagem (a qualidade, os acessórios e as modificações juntos; o RED já chega a +3: a excelente, o Smartgun Link e
// a luneta a 51 m).
export const BONUS_DE_ATAQUE = 1;
export const TETO_DA_ARMA = 3;

export const TIPOS = { tatica: 'Tática', sabor: 'Sabor', defeito: 'Defeito' };
// As classes das armas do Mission Kit (p. 31–32): a modificação que só serve numa delas (o defletor de ricochete, na Power;
// a carga silenciosa, na Tech; o C68).
export const CLASSES = { power: 'Power', smart: 'Smart', tech: 'Tech' };
// O que um efeito muda: o ataque (soma; o positivo só com condição e até +1), o dano (os dados a mais, nunca contra gente:
// a condição tem de dizer o alvo, sem "pessoa"), o pente (soma), se a arma se esconde e até que número do dado ela emperra
// (o gatilho sensível: no 1 e no 2).
export const ALVOS = {
  ataque: 'Ataque', dano: 'Dano', pente: 'Pente', ocultavel: 'Ocultável', emperraAte: 'Emperra até'
};
// Os alvos de um ataque que a condição conhece.
export const ALVOS_DO_ATAQUE = ['pessoa', 'veiculo', 'objeto', 'cobertura'];
const DADOS = /^[1-9]d(6|10)$/;

// A condição de um efeito (a folha ou a combinação), contra o contexto do ataque { modo, mirado, aDistancia, metros,
// municao, alvo, dono }. Devolve true, false ou null (o sistema não sabe: a janela de rolagem pergunta).
const FOLHAS = ['modo', 'mirado', 'aDistancia', 'metros', 'municao', 'alvo', 'dono', 'manual'];
export function avaliar(condicao, contexto = {}) {
  if (condicao === undefined || condicao === null) return true;
  if (condicao.todos) {
    const valores = condicao.todos.map(c => avaliar(c, contexto));
    return valores.includes(false) ? false : valores.includes(null) ? null : true;
  }
  if (condicao.algum) {
    const valores = condicao.algum.map(c => avaliar(c, contexto));
    return valores.includes(true) ? true : valores.includes(null) ? null : false;
  }
  if (condicao.nao) {
    const valor = avaliar(condicao.nao, contexto);
    return valor === null ? null : !valor;
  }
  const sabido = chave => contexto[chave] !== undefined && contexto[chave] !== null;
  if ('modo' in condicao) return sabido('modo') ? condicao.modo.includes(contexto.modo) : null;
  if ('municao' in condicao) return sabido('municao') ? condicao.municao.includes(contexto.municao) : null;
  if ('alvo' in condicao) return sabido('alvo') ? condicao.alvo.includes(contexto.alvo) : null;
  if ('metros' in condicao) {
    if (!sabido('metros')) return null;
    const metros = Number(contexto.metros);
    return metros >= (condicao.metros.min ?? 0) && metros <= (condicao.metros.max ?? Infinity);
  }
  for (const chave of ['mirado', 'aDistancia', 'dono']) if (chave in condicao) return sabido(chave) ? Boolean(contexto[chave]) === condicao[chave] : null;
  // "manual" (no escuro, contra a gangue tal): só quem joga sabe.
  return null;
}

function validarCondicao(condicao, fundo = 0) {
  if (fundo > 4) return 'a condição tem combinações demais uma dentro da outra';
  if (!condicao || typeof condicao !== 'object' || Array.isArray(condicao)) return 'a condição não é um objeto';
  const chaves = Object.keys(condicao);
  if (chaves.length !== 1) return 'cada condição diz uma coisa só (use "todos" ou "algum" para juntar)';
  const [chave] = chaves;
  const valor = condicao[chave];
  if (chave === 'todos' || chave === 'algum') {
    if (!Array.isArray(valor) || !valor.length) return `"${chave}" precisa de uma lista de condições`;
    return valor.map(c => validarCondicao(c, fundo + 1)).find(Boolean) ?? '';
  }
  if (chave === 'nao') return validarCondicao(valor, fundo + 1);
  if (!FOLHAS.includes(chave)) return `a condição "${chave}" não existe`;
  if (['modo', 'municao', 'alvo'].includes(chave)) {
    if (!Array.isArray(valor) || !valor.length || valor.some(v => typeof v !== 'string' || !v)) return `"${chave}" precisa de uma lista de nomes`;
    if (chave === 'alvo' && valor.some(v => !ALVOS_DO_ATAQUE.includes(v))) return `o alvo é ${ALVOS_DO_ATAQUE.join(', ')}`;
    return '';
  }
  if (chave === 'metros') {
    const { min = 0, max = Infinity, ...resto } = valor ?? {};
    if (Object.keys(resto).length || !Number.isFinite(Number(min)) || Number(min) < 0 || (max !== Infinity && !(Number(max) >= Number(min)))) return '"metros" é { min, max }, com o máximo depois do mínimo';
    return '';
  }
  if (chave === 'manual') return typeof valor === 'string' && valor.trim() ? '' : '"manual" é o texto da situação';
  return typeof valor === 'boolean' ? '' : `"${chave}" é sim ou não`;
}

// As folhas "alvo" que a condição exige (para o dano: a condição tem de excluir a pessoa). Só as que valem em todo caso:
// as de "todos", ou uma folha sozinha.
function alvosExigidos(condicao) {
  if (!condicao) return null;
  if (condicao.alvo) return condicao.alvo;
  if (condicao.todos) return condicao.todos.map(alvosExigidos).find(Boolean) ?? null;
  return null;
}

// A modificação, como fica na flag do item (o upgrade instalado na arma, a partir do C67):
// { versao: 1, id, nome, tipo, tamanho, encaixe?: { aDistancia?, tipos? }, efeitos: [{ rotulo, quando?, grupo?,
//   ligadoPorPadrao?, entao: [{ alvo, valor }] }] }. Devolve o motivo da recusa, ou '' quando vale.
export function validarMod(mod) {
  if (!mod || typeof mod !== 'object') return 'a modificação está vazia';
  if (mod.versao !== 1) return 'a versão da modificação não é a 1';
  if (typeof mod.id !== 'string' || !/^[a-z0-9:-]{1,80}$/.test(mod.id)) return 'o id da modificação é só letras minúsculas, números, ":" e "-"';
  if (typeof mod.nome !== 'string' || !mod.nome.trim() || mod.nome.length > 60) return 'o nome tem de 1 a 60 letras';
  if (!TIPOS[mod.tipo]) return `o tipo é ${Object.keys(TIPOS).join(', ')}`;
  if (!Number.isInteger(mod.tamanho) || mod.tamanho < 0 || mod.tamanho > 2) return 'a modificação ocupa de 0 a 2 slots';
  if (mod.tipo === 'defeito' && mod.tamanho !== 0) return 'o defeito não ocupa slot: ele dá um';
  if (mod.encaixe !== undefined) {
    const { aDistancia, tipos, classe, ...resto } = mod.encaixe ?? {};
    if (Object.keys(resto).length || (aDistancia !== undefined && typeof aDistancia !== 'boolean') || (tipos !== undefined && (!Array.isArray(tipos) || !tipos.length))
      || (classe !== undefined && !CLASSES[classe])) return 'o encaixe é { aDistancia, tipos, classe }';
  }
  if (!Array.isArray(mod.efeitos) || mod.efeitos.length > 4) return 'a modificação tem até 4 efeitos';
  for (const efeito of mod.efeitos) {
    if (typeof efeito?.rotulo !== 'string' || !efeito.rotulo.trim() || efeito.rotulo.length > 80) return 'cada efeito tem um rótulo de 1 a 80 letras';
    if (efeito.quando !== undefined) {
      const motivo = validarCondicao(efeito.quando);
      if (motivo) return `${efeito.rotulo}: ${motivo}`;
    }
    if (!Array.isArray(efeito.entao) || !efeito.entao.length || efeito.entao.length > 3) return `${efeito.rotulo}: o efeito muda de 1 a 3 coisas`;
    for (const { alvo, valor } of efeito.entao) {
      if (!ALVOS[alvo]) return `${efeito.rotulo}: "${alvo}" não é ${Object.keys(ALVOS).join(', ')}`;
      if (alvo === 'ataque') {
        if (!Number.isInteger(valor) || valor < -4 || valor > BONUS_DE_ATAQUE) return `${efeito.rotulo}: o ataque vai de −4 a +${BONUS_DE_ATAQUE}`;
        if (valor > 0 && efeito.quando === undefined) return `${efeito.rotulo}: o bônus de ataque precisa de uma situação (nenhuma modificação dá bônus fixo)`;
      }
      if (alvo === 'dano') {
        if (typeof valor !== 'string' || !DADOS.test(valor)) return `${efeito.rotulo}: o dano a mais é um dado (1d6, 2d6, 1d10)`;
        const alvos = alvosExigidos(efeito.quando);
        if (!alvos || alvos.includes('pessoa')) return `${efeito.rotulo}: o dano a mais nunca vale contra gente (a condição diz o alvo, sem "pessoa")`;
      }
      if (alvo === 'pente' && (!Number.isInteger(valor) || valor < -20 || valor > 20)) return `${efeito.rotulo}: o pente muda de −20 a +20`;
      if (alvo === 'ocultavel' && typeof valor !== 'boolean') return `${efeito.rotulo}: ocultável é sim ou não`;
      if (alvo === 'emperraAte' && (!Number.isInteger(valor) || valor < 1 || valor > 3)) return `${efeito.rotulo}: a arma emperra até o 1, o 2 ou o 3`;
      if (['pente', 'ocultavel', 'emperraAte'].includes(alvo) && efeito.quando !== undefined) return `${efeito.rotulo}: ${ALVOS[alvo].toLowerCase()} muda a arma sempre, sem situação`;
    }
  }
  return '';
}

// A modificação de ataque: a que tem um efeito de ataque positivo (só cabe uma por arma).
export const ehDeAtaque = mod => (mod?.efeitos ?? []).some(efeito => efeito.entao.some(({ alvo, valor }) => alvo === 'ataque' && valor > 0));

// Os slots de modificação da arma: 2; 1 na exótica e na de qualidade ruim; o defeito dá +1, até 3. exotica: o que a arma diz
// (as de 2077 trazem na flag); sem isso, a de longo alcance com menos de 3 slots de acessório (regras.armaExotica).
export function slotsDeModificacao({ aDistancia = true, slots = 3, qualidade = 'standard', exotica = null } = {}, defeitos = 0) {
  const reduzida = (exotica ?? (aDistancia && armaExotica({ slots }))) || qualidade === 'poor';
  const base = reduzida ? SLOTS.reduzido : SLOTS.normal;
  return Math.min(SLOTS.maximo, base + Math.min(SLOTS.defeitos, defeitos) * SLOTS.porDefeito);
}

// A modificação nova cabe na arma? arma: { aDistancia, slots, qualidade, tipo, classe }; instaladas: as modificações que já
// estão nela. Devolve { cabe, motivo }.
export function modCabe(arma, instaladas, nova) {
  const recusa = motivo => ({ cabe: false, motivo });
  const invalida = validarMod(nova);
  if (invalida) return recusa(invalida);
  const { aDistancia, tipos, classe } = nova.encaixe ?? {};
  if (aDistancia !== undefined && Boolean(arma.aDistancia) !== aDistancia) return recusa(aDistancia ? 'esta modificação só serve em arma de longo alcance' : 'esta modificação só serve em arma branca');
  if (tipos && !tipos.includes(arma.tipo)) return recusa('esta modificação não serve neste tipo de arma');
  if (classe && arma.classe !== classe) return recusa(`esta modificação só serve em arma ${CLASSES[classe]}`);
  if (instaladas.some(mod => mod.id === nova.id)) return recusa('a arma já tem esta modificação');
  const defeitos = instaladas.filter(mod => mod.tipo === 'defeito').length + (nova.tipo === 'defeito' ? 1 : 0);
  if (defeitos > SLOTS.defeitos) return recusa('só cabe um defeito por arma');
  if (ehDeAtaque(nova) && instaladas.some(ehDeAtaque)) return recusa('só cabe uma modificação de ataque por arma');
  const usados = instaladas.reduce((soma, mod) => soma + mod.tamanho, 0) + nova.tamanho;
  const total = slotsDeModificacao(arma, defeitos);
  if (usados > total) return recusa(`não há slot de modificação livre (a arma tem ${total})`);
  return { cabe: true, motivo: '' };
}

// O que as modificações da arma põem no ataque. Cada efeito de ataque vira um situacional da janela de rolagem ({ id,
// rotulo, valor, ligado }): ligado quando a condição vale, desligado (ou ligadoPorPadrao) quando o sistema não sabe, e
// fora quando não vale. O efeito sem condição (só os negativos: um defeito) é parte fixa. A mesma modificação duas vezes
// não soma, e no mesmo grupo (o "de longe" da luneta, por exemplo) só o maior vale.
export function efeitosDoAtaque(mods, contexto = {}) {
  const partes = [];
  const situacionais = [];
  const vistos = new Set();
  const doGrupo = new Map();
  for (const mod of mods) {
    if (vistos.has(mod.id)) continue;
    vistos.add(mod.id);
    mod.efeitos.forEach((efeito, indice) => {
      const valor = efeito.entao.filter(m => m.alvo === 'ataque').reduce((soma, m) => soma + m.valor, 0);
      if (!valor) return;
      const rotulo = `${mod.nome}: ${efeito.rotulo}`;
      if (efeito.quando === undefined) { partes.push({ rotulo, valor }); return; }
      const vale = avaliar(efeito.quando, contexto);
      if (vale === false) return;
      const situacional = { id: `${mod.id}#${indice}`, rotulo, valor, ligado: vale === true || Boolean(efeito.ligadoPorPadrao) };
      if (!efeito.grupo) { situacionais.push(situacional); return; }
      const outro = doGrupo.get(efeito.grupo);
      if (!outro || valor > outro.valor) doGrupo.set(efeito.grupo, situacional);
    });
  }
  return { partes, situacionais: [...situacionais, ...doGrupo.values()] };
}

// Os dados a mais no dano: { rotulo, dados, ligado } quando a condição vale (ligado) ou o sistema não sabe (ligadoPorPadrao).
export function efeitosDoDano(mods, contexto = {}) {
  const lista = [];
  const vistos = new Set();
  for (const mod of mods) {
    if (vistos.has(mod.id)) continue;
    vistos.add(mod.id);
    for (const efeito of mod.efeitos) {
      const vale = avaliar(efeito.quando, contexto);
      if (vale === false) continue;
      for (const { alvo, valor } of efeito.entao) if (alvo === 'dano') lista.push({ rotulo: `${mod.nome}: ${efeito.rotulo}`, dados: valor, ligado: vale === true || Boolean(efeito.ligadoPorPadrao) });
    }
  }
  return lista;
}

// O que as modificações mudam na arma de vez: o pente (soma), se ela se esconde (o "não se esconde" ganha) e até que
// número ela emperra (o maior). null: nenhuma muda.
export function derivadosDaArma(mods) {
  const derivados = { pente: 0, ocultavel: null, emperraAte: null };
  const vistos = new Set();
  for (const mod of mods) {
    if (vistos.has(mod.id)) continue;
    vistos.add(mod.id);
    for (const efeito of mod.efeitos) {
      for (const { alvo, valor } of efeito.entao) {
        if (alvo === 'pente') derivados.pente += valor;
        if (alvo === 'ocultavel') derivados.ocultavel = derivados.ocultavel === false ? false : valor;
        if (alvo === 'emperraAte') derivados.emperraAte = Math.max(derivados.emperraAte ?? 0, valor);
      }
    }
  }
  return derivados;
}

// O defeito que emperra (o gatilho sensível): o d10 natural até o número dele emperra a arma, de qualquer qualidade.
export const emperraPelaMod = (natural, emperraAte) => Boolean(emperraAte) && Number(natural) >= 1 && Number(natural) <= emperraAte;

// O efeito numa linha, para a ficha: "Mira de médio alcance: +1 no ataque (tiro único ou mirado de 13 a 50 m)".
const sinal = valor => (valor > 0 ? `+${valor}` : `−${Math.abs(valor)}`);
export function descreverEfeito(efeito) {
  const mudancas = efeito.entao.map(({ alvo, valor }) => {
    if (alvo === 'ataque') return `${sinal(valor)} no ataque`;
    if (alvo === 'dano') return `+${valor} no dano`;
    if (alvo === 'pente') return `${sinal(valor)} no pente`;
    if (alvo === 'ocultavel') return valor ? 'a arma se esconde' : 'a arma não se esconde';
    const numeros = Array.from({ length: valor }, (_, i) => i + 1);
    return `emperra no ${numeros.length > 1 ? `${numeros.slice(0, -1).join(', no ')} e no ${numeros.at(-1)}` : numeros[0]}`;
  }).join(', ');
  return `${mudancas} (${efeito.rotulo})`;
}

// O teto da arma numa rolagem: os bônus positivos que vêm da arma (a qualidade, a arma Smart, os acessórios, a luneta e
// as modificações) somam até +3; o que passa vira uma parte negativa. As penalidades não contam. null: não passou.
export function parteDoTeto(valores) {
  const positivos = valores.filter(valor => Number(valor) > 0).reduce((soma, valor) => soma + Number(valor), 0);
  const excesso = positivos - TETO_DA_ARMA;
  return excesso > 0 ? { rotulo: `Teto da arma (+${TETO_DA_ARMA})`, valor: -excesso } : null;
}

/* Quem pode instalar uma modificação: o Tech do personagem ou o mestre (C74). */
export function podeInstalarModificacao({ mestre = false, roles = [] } = {}) {
  const nome = valor => String(valor ?? '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
  return Boolean(mestre) || (Array.isArray(roles) && roles.some(role => ['tech', 'tecnico'].includes(nome(role))));
}

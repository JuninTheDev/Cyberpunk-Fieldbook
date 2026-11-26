// A oficina do mestre (o C71 do plano das modificações de armas): as contas, sem o Foundry. O formulário da oficina
// (oficina.mjs) vira uma modificação no formato do regras-modificacoes.mjs, e o validarMod diz se ela vale pela regra da
// casa (nenhum bônus fixo no ataque, +1 só numa situação, o dano a mais nunca contra gente). O menu de efeitos cobre as
// formas das 26 modificações da wiki (system-modificacoes.js). A raridade (do catálogo, rara, lendária) é só um rótulo:
// decisão do usuário de 2026-11-24 ("Sem limite próprio"). E o sorteio do defeito (1d6, de novo quando não serve na arma:
// a página da regra, "Os defeitos").
import { ALVOS_DO_ATAQUE, CLASSES, TIPOS, validarMod } from './regras-modificacoes.mjs';

export const RARIDADES = { catalogo: 'Do catálogo', rara: 'Rara', lendaria: 'Lendária' };
export const ONDE_SERVE = { qualquer: 'qualquer arma', distancia: 'arma de longo alcance', autofogo: 'arma de longo alcance com autofogo', branca: 'arma branca' };
// O que um efeito do menu faz (o alvo do regras-modificacoes.ALVOS e se pede uma situação).
export const EFEITOS = {
  situacao: 'Ataque numa situação', sempre: 'Ataque sempre (só negativo)', dano: 'Dano a mais contra coisas', pente: 'Pente',
  ocultavel: 'Se esconde ou não', emperra: 'Emperra até o número', instavel: 'Instável (falha como a ruim)'
};
// As situações do menu (as condições das modificações da wiki).
export const SITUACOES = {
  perto: 'Tiro único ou mirado até X m', faixa: 'Tiro único ou mirado de X a Y m', longe: 'A X m ou mais', autofogo: 'No autofogo',
  mirado: 'No tiro mirado', alvo: 'Contra um tipo de alvo', estranho: 'Na mão de quem não é o dono', arremesso: 'Arremessada',
  manual: 'Outra (quem joga liga)'
};
const NOMES_DOS_ALVOS = { pessoa: 'gente', veiculo: 'veículos', objeto: 'objetos', cobertura: 'cobertura' };
export const DADOS_DE_DANO = ['1d6', '2d6', '1d10'];
// A oficina guarda até dois efeitos (as modificações da wiki têm no máximo dois).
export const MAXIMO_DE_EFEITOS = 2;

const texto = (valor, limite) => String(valor ?? '').replace(/\s+/g, ' ').trim().slice(0, limite);
const numero = valor => (valor === '' || valor === null || valor === undefined ? NaN : Number(valor));
const lista = valor => (Array.isArray(valor) ? valor : valor ? [valor] : []).map(String);
const juntar = nomes => (nomes.length > 1 ? `${nomes.slice(0, -1).join(', ')} e ${nomes.at(-1)}` : nomes[0] ?? '');

// O id da modificação da oficina: "oficina:" com o nome sem acento e um sufixo (o oficina.mjs sorteia), no formato do
// validarMod.
export function idDaOficina(nome, sufixo) {
  const base = String(nome ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'mod';
  return `oficina:${base}-${String(sufixo ?? '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12) || '0'}`;
}

// A situação do menu vira a condição { quando } e o rótulo dela. Devolve { quando, rotulo } ou { erro }.
function situacaoDe(efeito) {
  const min = numero(efeito.metrosMin);
  const max = numero(efeito.metrosMax);
  const alvos = lista(efeito.alvos).filter(alvo => ALVOS_DO_ATAQUE.includes(alvo));
  switch (efeito.situacao) {
    case 'perto': return Number.isFinite(max) ? { quando: { todos: [{ modo: ['tiro'] }, { metros: { max } }] }, rotulo: `tiro único ou mirado a até ${max} m` } : { erro: 'diga até quantos metros' };
    case 'faixa': return Number.isFinite(min) && Number.isFinite(max) ? { quando: { todos: [{ modo: ['tiro'] }, { metros: { min, max } }] }, rotulo: `tiro único ou mirado de ${min} a ${max} m` } : { erro: 'diga de quantos a quantos metros' };
    case 'longe': return Number.isFinite(min) ? { quando: { metros: { min } }, rotulo: `a ${min} m ou mais` } : { erro: 'diga a partir de quantos metros' };
    case 'autofogo': return { quando: { modo: ['autofogo'] }, rotulo: 'no autofogo' };
    case 'mirado': return { quando: { mirado: true }, rotulo: 'no tiro mirado' };
    case 'arremesso': return { quando: { arremesso: true }, rotulo: 'arremessada' };
    case 'alvo': return alvos.length ? { quando: { alvo: alvos }, rotulo: `contra ${juntar(alvos.map(alvo => NOMES_DOS_ALVOS[alvo]))}` } : { erro: 'marque o tipo de alvo' };
    case 'estranho': return { quando: { dono: false }, rotulo: 'na mão de quem não é o dono' };
    case 'manual': return texto(efeito.manual, 80) ? { quando: { manual: texto(efeito.manual, 80) }, rotulo: texto(efeito.manual, 80) } : { erro: 'escreva a situação' };
    default: return { erro: 'escolha a situação' };
  }
}

// Um efeito do formulário vira o efeito da modificação ({ rotulo, quando?, entao }). Devolve { efeito } ou { erro }.
function efeitoDe(efeito) {
  const valor = numero(efeito.valor);
  const proprio = texto(efeito.rotulo, 80);
  const com = (rotulo, entao, quando) => ({ efeito: { rotulo: proprio || rotulo, ...(quando ? { quando } : {}), entao } });
  switch (efeito.tipo) {
    case 'situacao': {
      const situacao = situacaoDe(efeito);
      if (situacao.erro) return situacao;
      if (!Number.isInteger(valor) || !valor) return { erro: 'o ataque numa situação muda de −4 a +1 (sem o zero)' };
      return com(situacao.rotulo, [{ alvo: 'ataque', valor }], situacao.quando);
    }
    case 'sempre': return Number.isInteger(valor) && valor < 0 ? com('sempre', [{ alvo: 'ataque', valor }]) : { erro: 'o ataque sempre é só negativo (nenhuma modificação dá bônus fixo)' };
    case 'dano': {
      const alvos = lista(efeito.alvos).filter(alvo => ALVOS_DO_ATAQUE.includes(alvo));
      if (!alvos.length) return { erro: 'marque contra o que vale o dano a mais' };
      return com(`contra ${juntar(alvos.map(alvo => NOMES_DOS_ALVOS[alvo]))}`, [{ alvo: 'dano', valor: String(efeito.dados || '') }], { alvo: alvos });
    }
    case 'pente': return Number.isInteger(valor) && valor ? com(`pente ${valor > 0 ? '+' : ''}${valor}`, [{ alvo: 'pente', valor }]) : { erro: 'o pente muda de −20 a +20 (sem o zero)' };
    case 'ocultavel': {
      const sim = efeito.valor === true || efeito.valor === 'sim';
      return com(sim ? 'se esconde' : 'não se esconde', [{ alvo: 'ocultavel', valor: sim }]);
    }
    case 'emperra': return Number.isInteger(valor) ? com(`emperra ${valor === 1 ? 'no 1' : `do 1 ao ${valor}`}`, [{ alvo: 'emperraAte', valor }]) : { erro: 'diga até que número a arma emperra' };
    // A instável (o C73): na falha crítica, a arma falha como a de qualidade ruim.
    case 'instavel': return com('instável', [{ alvo: 'instavel', valor: true }]);
    default: return { erro: 'escolha o que o efeito faz' };
  }
}

// O formulário da oficina vira a modificação. dados: { nome, raridade, tipo, tamanho, serve, classe, texto, efeitos: [{
// tipo, valor, situacao, metrosMin, metrosMax, alvos, manual, dados, rotulo }] }; id: o da modificação (idDaOficina).
// Devolve { mod, raridade, texto } ou { erro } (o primeiro motivo, com o número do efeito).
export function modDoFormulario(dados = {}, id = idDaOficina(dados.nome, '0')) {
  const nome = texto(dados.nome, 60);
  if (!nome) return { erro: 'dê um nome à modificação' };
  const tipo = TIPOS[dados.tipo] ? dados.tipo : 'tatica';
  const tamanho = tipo === 'defeito' ? 0 : Math.trunc(numero(dados.tamanho));
  const encaixe = {
    ...(dados.serve === 'distancia' ? { aDistancia: true } : dados.serve === 'autofogo' ? { aDistancia: true, autofogo: true } : dados.serve === 'branca' ? { aDistancia: false } : {}),
    ...(CLASSES[dados.classe] ? { classe: dados.classe } : {})
  };
  const efeitos = [];
  const pedidos = (Array.isArray(dados.efeitos) ? dados.efeitos : []).filter(efeito => efeito && efeito.tipo);
  if (pedidos.length > MAXIMO_DE_EFEITOS) return { erro: `a oficina guarda até ${MAXIMO_DE_EFEITOS} efeitos` };
  for (const [indice, pedido] of pedidos.entries()) {
    const { efeito, erro } = efeitoDe(pedido);
    if (erro) return { erro: `efeito ${indice + 1}: ${erro}` };
    efeitos.push(efeito);
  }
  const mod = { versao: 1, id, nome, tipo, tamanho, ...(Object.keys(encaixe).length ? { encaixe } : {}), efeitos };
  const invalida = validarMod(mod);
  if (invalida) return { erro: invalida };
  return { mod, raridade: RARIDADES[dados.raridade] ? dados.raridade : 'catalogo', texto: texto(dados.texto, 600) };
}

// Onde a modificação serve, em palavras (como o serveEm da wiki).
export function serveEm(mod) {
  const { aDistancia, tipos, classe, autofogo } = mod.encaixe ?? {};
  if (classe) return `arma ${CLASSES[classe]}`;
  if (tipos) return tipos.join(' ou ');
  if (autofogo) return ONDE_SERVE.autofogo;
  return aDistancia === true ? ONDE_SERVE.distancia : aDistancia === false ? ONDE_SERVE.branca : ONDE_SERVE.qualquer;
}

// A descrição do item da oficina (como a das modificações do catálogo, no conteudo-mods.mjs), com o texto do mestre.
export function descricaoDaMod(mod, { raridade = 'catalogo', texto: textoDoMestre = '' } = {}) {
  const ocupa = mod.tamanho ? `${mod.tamanho} slot${mod.tamanho > 1 ? 's' : ''} de modificação` : 'nenhum slot (dá +1)';
  const limpo = String(textoDoMestre).replace(/[<>&]/g, letra => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[letra]);
  return `<p><b>Modificação de arma</b> · ${RARIDADES[raridade] ?? RARIDADES.catalogo} · ${TIPOS[mod.tipo]} · ${ocupa} · serve em ${serveEm(mod)}</p>`
    + `${limpo ? `<p>${limpo}</p>` : ''}<p>Permanente: não sai da arma; só o Tech tira, e tirar destrói.</p><p><i>Oficina do mestre.</i></p>`;
}

// O sorteio do defeito: 1d6 na tabela (a ordem da página da regra) e de novo quando o defeito não serve na arma. defeitos:
// as modificações de defeito, na ordem; cabe(mod): se serve na arma; rolar(): o 1d6. Devolve { mod, rolagens } ou null
// (nenhum serve, ou o dado não acerta um que sirva em 30 rolagens).
export function sortearDefeito({ defeitos = [], cabe = () => true, rolar, tentativas = 30 }) {
  if (!defeitos.some(cabe)) return null;
  const rolagens = [];
  for (let i = 0; i < tentativas; i++) {
    const valor = rolar();
    rolagens.push(valor);
    const mod = defeitos[valor - 1];
    if (mod && cabe(mod)) return { mod, rolagens };
  }
  return null;
}

// A chave do defeito escondido no servidor da wiki: o uuid da arma (o ator e o item; o crossover leva os dois ids).
export const chaveDoDefeito = arma => String(arma?.uuid ?? '');
export const CHAVE_DO_DEFEITO = /^[A-Za-z0-9._-]{1,160}$/;

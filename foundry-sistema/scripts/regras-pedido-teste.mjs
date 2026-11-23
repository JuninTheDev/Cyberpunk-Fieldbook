// O pedido de teste do mestre (o C65): as contas, sem o Foundry. A janela, o cartão e o socket ficam no pedido-teste.mjs.
// A fonte é a wiki (system-rules.js): o teste básico é STAT + Perícia + 1d10 e precisa SUPERAR a DV (o empate não
// passa, p. 128–130), e a escala de DV é a da página (9 Simples a 29 Lendário, p. 129).
import { ATRIBUTOS, SIGLA } from './config.mjs';
import { FAMILIAS, PERICIAS } from './gerado.mjs';

// A escala de DV da wiki (system-rules.js, "Escala de DV").
export const DIFICULDADES = [
  { dv: 9, nome: 'Simples' }, { dv: 13, nome: 'Comum' }, { dv: 15, nome: 'Difícil' }, { dv: 17, nome: 'Profissional' },
  { dv: 21, nome: 'Heroico' }, { dv: 24, nome: 'Incrível' }, { dv: 29, nome: 'Lendário' }
];
export const nomeDaDv = dv => DIFICULDADES.find(d => d.dv === dv)?.nome ?? '';

// Quem vê o resultado (o messageMode das rolagens do Foundry 14): todos; o mestre e quem rolou; só o mestre (às cegas,
// nem quem rolou vê o total).
export const MODOS = { publico: { nome: 'Todos', mensagem: 'public' }, privado: { nome: 'O mestre e quem rolou', mensagem: 'gm' }, cegas: { nome: 'Só o mestre (às cegas)', mensagem: 'blind' } };

// Os STATs que se testam sozinhos (STAT + 1d10, p. 129): todos menos o MOVE, que não é teste.
export const ATRIBUTOS_DO_TESTE = ATRIBUTOS.filter(chave => chave !== 'move');

// Passou: o total supera a DV (o empate não passa). Sem DV (o mestre decide): null.
export function passou(total, dv) {
  const numero = valor => (valor === null || valor === undefined || valor === '' ? NaN : Number(valor));
  if (!Number.isFinite(numero(dv)) || !Number.isFinite(numero(total))) return null;
  return Number(total) > Number(dv);
}

// A DV do pedido: um número de 1 a 99 (a da escala ou outra) ou null (sem DV).
export function dvValida(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  const dv = Math.trunc(Number(valor));
  return Number.isFinite(dv) && dv >= 1 && dv <= 99 ? dv : null;
}

const normalizar = texto => String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// O que se testa: { tipo: 'pericia', id } (do livro), { tipo: 'familia', familia, tipoDaFamilia } (Linguagem, Especialista
// Local, Ciências, Artes Marciais, Tocar Instrumento: a do ator com esse nome, ou a melhor dele) ou { tipo: 'atributo',
// chave }. O rótulo, para o cartão.
export function rotuloDoTeste(teste) {
  if (teste?.tipo === 'atributo') return SIGLA[teste.chave] ?? '';
  if (teste?.tipo === 'familia') {
    const familia = FAMILIAS[teste.familia];
    return familia ? `${familia.nome}${teste.tipoDaFamilia ? ` (${teste.tipoDaFamilia})` : ''}` : '';
  }
  return PERICIAS.find(p => p.id === teste?.id)?.nome ?? '';
}
export function testeValido(teste) {
  if (teste?.tipo === 'atributo') return ATRIBUTOS_DO_TESTE.includes(teste.chave);
  if (teste?.tipo === 'familia') return Boolean(FAMILIAS[teste.familia]);
  return teste?.tipo === 'pericia' && PERICIAS.some(p => p.id === teste.id);
}

// Acha o teste pelo nome (o /teste do chat): a perícia em português, em inglês ou pelo id; a família (com o tipo depois:
// "linguagem japones"); ou o STAT pela sigla. O nome mais longo que casa com o começo do texto ganha ("percepcao humana"
// é a Percepção Humana, não a Percepção). Devolve { teste, resto } ou null.
export function acharTeste(texto) {
  const alvo = normalizar(texto);
  if (!alvo) return null;
  const candidatos = [
    ...PERICIAS.flatMap(p => [p.nome, p.en, p.id].map(nome => ({ nome: normalizar(nome), teste: { tipo: 'pericia', id: p.id } }))),
    ...Object.entries(FAMILIAS).flatMap(([id, f]) => [f.nome, f.en, id].map(nome => ({ nome: normalizar(nome), familia: id }))),
    ...ATRIBUTOS_DO_TESTE.map(chave => ({ nome: normalizar(SIGLA[chave]), teste: { tipo: 'atributo', chave } }))
  ].filter(c => c.nome && (alvo === c.nome || alvo.startsWith(`${c.nome} `)));
  if (!candidatos.length) return null;
  const melhor = candidatos.sort((a, b) => b.nome.length - a.nome.length)[0];
  const resto = alvo.slice(melhor.nome.length).trim();
  // O tipo da família como foi escrito (com os acentos): as palavras depois do nome dela.
  if (melhor.familia) return { teste: { tipo: 'familia', familia: melhor.familia, tipoDaFamilia: String(texto).trim().split(/\s+/).slice(melhor.nome.split(' ').length).join(' ') }, resto: '' };
  return { teste: melhor.teste, resto };
}

// O /teste do chat (só o mestre): "/teste percepção 15", "/teste furtividade", "/teste cool 13", "/teste linguagem
// japonês". Um número no fim é a DV. Sem nada depois, a janela abre vazia. Não é o comando: null.
export function lerComandoTeste(mensagem) {
  const texto = String(mensagem ?? '').trim();
  const [comando, ...resto] = texto.split(/\s+/);
  if (comando?.toLowerCase() !== '/teste') return null;
  let partes = resto;
  let dv = null;
  const ultimo = partes.at(-1);
  if (ultimo && /^(dv)?\d{1,2}$/i.test(ultimo)) { dv = dvValida(ultimo.replace(/^dv/i, '')); partes = partes.slice(0, -1); }
  if (!partes.length) return { teste: null, dv };
  const achado = acharTeste(partes.join(' '));
  if (!achado || achado.resto) return { teste: null, dv, erro: `Não achei o teste "${partes.join(' ')}". Use o nome da perícia (Percepção, Furtividade...) ou do STAT (COOL, BODY...).` };
  return { teste: achado.teste, dv };
}

// A perícia de uma família no ator: a com o nome pedido ("Japonês"), ou, sem nome, a de nível maior. pericias: as do
// ator ({ id, familia, nome, nivel }, o system.pericias com a chave). Sem nenhuma da família: null (o ator testa o STAT
// dela, sem a perícia).
export function periciaDaFamilia(pericias, familia, tipoDaFamilia = '') {
  const daFamilia = pericias.filter(p => p.familia === familia);
  if (!daFamilia.length) return null;
  const nome = normalizar(tipoDaFamilia);
  if (nome) return daFamilia.find(p => normalizar(p.nome) === nome)?.id ?? null;
  return [...daFamilia].sort((a, b) => (b.nivel ?? 0) - (a.nivel ?? 0))[0].id;
}
export const atributoDaFamilia = familia => FAMILIAS[familia]?.atributo ?? 'int';

// O que cada um vê de uma linha do cartão. mestre: tudo. Os outros, pelo modo: em "Todos", o total e se passou; em "O
// mestre e quem rolou", só o dono da linha; "às cegas", ninguém. A DV, só com "Mostrar a DV". O estado (esperando, rolou,
// não rolou) todos veem.
export function oQueVe({ modo = 'publico', mostrarDv = false } = {}, { mestre = false, dono = false } = {}) {
  if (mestre) return { total: true, passou: true, dv: true };
  const resultado = modo === 'publico' || (modo === 'privado' && dono);
  return { total: resultado, passou: resultado, dv: Boolean(mostrarDv) };
}

// O resumo do pedido: quantos rolaram, quantos passaram (com DV) e quantos faltam. linhas: [{ estado, total }].
export function resumoDoPedido(linhas, dv) {
  const rolaram = linhas.filter(l => l.estado === 'rolou');
  const comDv = dvValida(dv) !== null;
  return {
    total: linhas.length, rolaram: rolaram.length, faltam: linhas.filter(l => l.estado === 'esperando').length,
    passaram: comDv ? rolaram.filter(l => passou(l.total, dv)).length : null,
    maior: rolaram.length ? Math.max(...rolaram.map(l => Number(l.total) || 0)) : null
  };
}

// Uma linha nova recebe o resultado só se ainda espera (o primeiro resultado vale: o clique duplo e a rolagem do mestre
// por cima da do jogador não contam duas vezes). Devolve as linhas novas ou null (não mudou).
export function registrarResultado(linhas, indice, { total, critico = null, mensagem = null, porMestre = false }) {
  const linha = linhas[indice];
  if (!linha || linha.estado !== 'esperando' || !Number.isFinite(Number(total))) return null;
  return linhas.map((l, i) => (i === indice ? { ...l, estado: 'rolou', total: Number(total), critico, mensagem, porMestre: Boolean(porMestre) } : l));
}

// Encerrar: quem ainda espera vira "não rolou".
export const encerrar = linhas => linhas.map(l => (l.estado === 'esperando' ? { ...l, estado: 'naoRolou' } : l));

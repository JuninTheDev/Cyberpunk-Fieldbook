// A identidade da arma (o C69, do plano das modificações de armas; o ROADMAP, "As modificações de armas"): o que faz cada
// arma ser única para quem a carrega, sem número nenhum. O nome próprio ("Velha Senhora · Militech M-10AF"), a frase, a
// aparência, quem a fez, de quem ela é e o diário, que conta sozinho os abates, os críticos, o primeiro sangue e as sessões
// em que ela lutou, e guarda os marcos que a mesa anota. Aqui ficam as contas, sem o Foundry; o item e os ganchos, no
// identidade.mjs.
//
// Os contadores saem dos eventos: o "Desfazer" do ataque tira os eventos do golpe pela chave dele, e a conta volta
// sozinha. O único número guardado à parte é o "antes" da arma que voltou da wiki (o C70): a wiki guarda só os eventos mais
// novos, e o que ela contava a mais fica ali. A nota do mestre não fica aqui: é outra flag, que não vai para a wiki.

export const VERSAO = 1;
export const TIPOS_DE_EVENTO = { origem: 'Origem', sessao: 'Sessão', primeiroSangue: 'Primeiro sangue', abate: 'Abate', critico: 'Crítico', marco: 'Marco' };
// Os abates que viram aviso (sussurrado ao dono e ao mestre, uma vez cada).
export const MARCOS_DE_ABATES = [5, 10, 25, 50, 100];
export const LIMITES = { apelido: 40, frase: 140, aparencia: 280, feitaPor: 60, texto: 200 };
// O diário que vai para a wiki: os eventos mais novos.
export const NA_WIKI = 30;

const texto = (valor, limite) => String(valor ?? '').replace(/\s+/g, ' ').trim().slice(0, limite);
const inteiro = valor => Math.max(0, Math.floor(Number(valor) || 0));

// O que a arma já contava antes dos eventos guardados (o C70): os abates, os críticos, as sessões e o primeiro sangue.
// Sem nada, null.
function normalizarAntes(antes) {
  if (!antes || typeof antes !== 'object') return null;
  const sangue = antes.primeiroSangue && typeof antes.primeiroSangue === 'object' && typeof antes.primeiroSangue.data === 'string'
    ? { data: antes.primeiroSangue.data, alvo: texto(antes.primeiroSangue.alvo, 80) } : null;
  const atual = { abates: inteiro(antes.abates), criticos: inteiro(antes.criticos), sessoes: inteiro(antes.sessoes), primeiroSangue: sangue };
  return atual.abates || atual.criticos || atual.sessoes || sangue ? atual : null;
}

// A identidade como fica na flag "arma" do item, com o que falta preenchido. Um valor estranho (de outra versão, de um
// script) vira o padrão, e nunca quebra a ficha.
export function normalizar(identidade) {
  const fonte = identidade && typeof identidade === 'object' ? identidade : {};
  const dono = fonte.dono && typeof fonte.dono === 'object' && typeof fonte.dono.id === 'string' && fonte.dono.id
    ? { id: fonte.dono.id, nome: texto(fonte.dono.nome, 80) } : null;
  const eventos = (Array.isArray(fonte.eventos) ? fonte.eventos : []).filter(evento => evento && TIPOS_DE_EVENTO[evento.tipo] && typeof evento.data === 'string');
  const antes = normalizarAntes(fonte.antes);
  return {
    versao: VERSAO,
    apelido: texto(fonte.apelido, LIMITES.apelido), frase: texto(fonte.frase, LIMITES.frase), aparencia: texto(fonte.aparencia, LIMITES.aparencia),
    feitaPor: texto(fonte.feitaPor, LIMITES.feitaPor), dono, eventos,
    avisados: (Array.isArray(fonte.avisados) ? fonte.avisados : []).filter(numero => MARCOS_DE_ABATES.includes(numero)),
    ...(antes ? { antes } : {})
  };
}

// "Velha Senhora · Militech M-10AF": o nome próprio com o modelo; sem nome próprio, só o modelo.
export const nomeDeExibicao = (modelo, apelido) => (texto(apelido, LIMITES.apelido) ? `${texto(apelido, LIMITES.apelido)} · ${modelo}` : modelo);

// De quem é a arma: o dono guardado; sem dono (a arma de antes do C69), quem a carrega.
export const ehDono = (identidade, idDoAtor) => {
  const dono = normalizar(identidade).dono;
  return dono ? dono.id === idDoAtor : true;
};

export function contadores(identidade) {
  const { eventos, antes } = normalizar(identidade);
  const conta = tipo => eventos.filter(evento => evento.tipo === tipo).length;
  const sangue = eventos.find(evento => evento.tipo === 'primeiroSangue') ?? null;
  return {
    abates: conta('abate') + (antes?.abates ?? 0), criticos: conta('critico') + (antes?.criticos ?? 0), sessoes: conta('sessao') + (antes?.sessoes ?? 0),
    primeiroSangue: sangue ? { data: sangue.data, alvo: sangue.alvo ?? '' } : antes?.primeiroSangue ?? null
  };
}

// Os eventos de um golpe que acertou: o primeiro sangue (o primeiro HP que a arma tira de alguém), o abate (o alvo passa
// de 1 HP ou mais para menos de 1: mortalmente ferido ou morto) e o crítico (o dano com a lesão crítica). chave: a do
// golpe (o ataque e o alvo), para o "Desfazer" e para não contar duas vezes.
export function eventosDoGolpe(identidade, { chave, alvo, hpAntes, hpDepois, critico = false, data }) {
  const jaSangrou = Boolean(contadores(identidade).primeiroSangue);
  const base = { chave, data, alvo: texto(alvo, 80) };
  const eventos = [];
  if (!jaSangrou && Number(hpDepois) < Number(hpAntes)) eventos.push({ ...base, tipo: 'primeiroSangue' });
  if (Number(hpAntes) >= 1 && Number(hpDepois) < 1) eventos.push({ ...base, tipo: 'abate' });
  if (critico) eventos.push({ ...base, tipo: 'critico' });
  return eventos;
}

// A sessão: o dia em que a arma lutou (o primeiro ataque com ela no dia), uma vez por dia. data: ISO.
export const diaDe = data => {
  const dia = new Date(data);
  return `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, '0')}-${String(dia.getDate()).padStart(2, '0')}`;
};
export const eventoDeSessao = data => ({ chave: `sessao:${diaDe(data)}`, tipo: 'sessao', data });

// O marco que a mesa anota (o dono ou o mestre): uma linha de texto.
export function eventoDeMarco(textoDoMarco, { data, por = '' }) {
  const linha = texto(textoDoMarco, LIMITES.texto);
  return linha ? { chave: `marco:${data}`, tipo: 'marco', data, texto: linha, por: texto(por, 80) } : null;
}

// Junta os eventos novos, sem repetir o mesmo tipo com a mesma chave (o dano refeito, a sessão do mesmo dia). Devolve a
// identidade nova e o marco de abates alcançado agora (o número), se houver um que ainda não foi avisado.
export function juntarEventos(identidade, novos) {
  const atual = normalizar(identidade);
  const vistos = new Set(atual.eventos.map(evento => `${evento.tipo}|${evento.chave}`));
  const eventos = [...atual.eventos];
  for (const evento of novos.filter(Boolean)) {
    const marca = `${evento.tipo}|${evento.chave}`;
    if (vistos.has(marca)) continue;
    vistos.add(marca);
    eventos.push(evento);
  }
  const abates = eventos.filter(evento => evento.tipo === 'abate').length + (atual.antes?.abates ?? 0);
  const marco = [...MARCOS_DE_ABATES].reverse().find(numero => abates >= numero && !atual.avisados.includes(numero)) ?? null;
  const avisados = marco ? [...new Set([...atual.avisados, ...MARCOS_DE_ABATES.filter(numero => numero <= marco)])] : atual.avisados;
  return { identidade: { ...atual, eventos, avisados }, marco };
}

// O "Desfazer" do ataque: tira os eventos do golpe (a chave dele). O aviso de marco já dado continua dado.
export function tirarEventos(identidade, chave) {
  const atual = normalizar(identidade);
  return { ...atual, eventos: atual.eventos.filter(evento => evento.chave !== chave) };
}

// O evento numa linha do diário.
const dataCurta = data => {
  const dia = new Date(data);
  return Number.isNaN(dia.getTime()) ? '' : `${String(dia.getDate()).padStart(2, '0')}/${String(dia.getMonth() + 1).padStart(2, '0')}/${dia.getFullYear()}`;
};
export function descreverEvento(evento) {
  const quando = dataCurta(evento.data);
  const linha = {
    origem: () => evento.texto,
    sessao: () => 'Lutou nesta sessão',
    primeiroSangue: () => `Primeiro sangue: ${evento.alvo}`,
    abate: () => `Abate: ${evento.alvo}`,
    critico: () => `Crítico em ${evento.alvo}`,
    marco: () => `${evento.texto}${evento.por ? ` (${evento.por})` : ''}`
  }[evento.tipo]?.() ?? '';
  return quando ? `${quando}: ${linha}` : linha;
}

// O diário na ficha: os mais novos primeiro.
export const diario = (identidade, limite = Infinity) => normalizar(identidade).eventos.slice().reverse().slice(0, limite)
  .map(evento => ({ tipo: evento.tipo, rotulo: TIPOS_DE_EVENTO[evento.tipo], texto: descreverEvento(evento) }));

// O que volta para a wiki (o C70 desenha o cartão da arma): a identidade e os contadores, sem a nota do mestre (outra flag)
// e só com os eventos mais novos.
export function paraAWiki(identidade) {
  const atual = normalizar(identidade);
  const { abates, criticos, sessoes, primeiroSangue } = contadores(atual);
  return {
    apelido: atual.apelido, frase: atual.frase, aparencia: atual.aparencia, feitaPor: atual.feitaPor, dono: atual.dono?.nome ?? '',
    abates, criticos, sessoes, primeiroSangue,
    diario: atual.eventos.slice(-NA_WIKI).map(({ tipo, data, alvo, texto: linha, por }) => ({ tipo, data, ...(alvo ? { alvo } : {}), ...(linha ? { texto: linha } : {}), ...(por ? { por } : {}) }))
  };
}

// A identidade que volta da wiki (o C70): o que o paraAWiki mandou, quando o mestre importa o personagem de novo (pela
// ficha da mesa ou pela criação, depois que a ficha da mesa chegou). Sem dono: quem recebe a arma agora vira o dono (o
// identidade.identidadeAoCriar). A wiki guarda só os eventos mais novos: o que ela contava a mais (os abates, os
// críticos, as sessões e o primeiro sangue mais velhos) fica no "antes", e os marcos de abates até ali contam como
// avisados. Os eventos ganham a chave de novo (a sessão pelo dia, para o mesmo dia não contar duas vezes).
export function daWiki(fonte) {
  if (!fonte || typeof fonte !== 'object') return null;
  const chaveDe = (evento, indice) => ({ sessao: () => eventoDeSessao(evento.data).chave, origem: () => 'origem', marco: () => `marco:${evento.data}` }[evento.tipo]?.() ?? `wiki:${indice}`);
  const lidos = (Array.isArray(fonte.diario) ? fonte.diario : []).filter(evento => evento && TIPOS_DE_EVENTO[evento.tipo] && typeof evento.data === 'string' && !Number.isNaN(new Date(evento.data).getTime()));
  const eventos = lidos.map((evento, indice) => ({ ...evento, chave: chaveDe(evento, indice) }));
  const guardados = contadores({ eventos });
  const sangue = fonte.primeiroSangue && typeof fonte.primeiroSangue === 'object' ? fonte.primeiroSangue : null;
  const antes = {
    abates: inteiro(fonte.abates) - guardados.abates, criticos: inteiro(fonte.criticos) - guardados.criticos, sessoes: inteiro(fonte.sessoes) - guardados.sessoes,
    primeiroSangue: guardados.primeiroSangue ? null : sangue
  };
  const abates = inteiro(fonte.abates);
  return normalizar({
    apelido: fonte.apelido, frase: fonte.frase, aparencia: fonte.aparencia, feitaPor: fonte.feitaPor, eventos, antes,
    avisados: MARCOS_DE_ABATES.filter(numero => numero <= abates)
  });
}

// A origem, quando a arma entra na ficha de um personagem pela primeira vez: de onde ela veio.
export function eventoDeOrigem({ nome, wikiUid = '', data }) {
  const de = String(wikiUid).startsWith('pedido:') ? `Comprada na loja da wiki por ${nome}` : wikiUid ? `Veio da wiki com ${nome}` : `Chegou às mãos de ${nome}`;
  return { chave: 'origem', tipo: 'origem', data, texto: de };
}

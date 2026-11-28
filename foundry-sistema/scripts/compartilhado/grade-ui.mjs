// A tela do inventário em grade (o C109; o plano em inventario-plano/PLANO.md, seção 7): a mesma na ficha do Foundry e,
// depois, na página da wiki. Sem framework e sem o Foundry: quem usa dá os lugares, os itens e o que fazer com cada
// intenção (mover, dividir, arrumar, abrir), e a tela só desenha e pergunta. A regra (o que cabe) é a de regras-grade.mjs,
// que quem usa passa em "conferir", para a sombra dizer antes de soltar.
//
// Como se mexe: arrastar com o mouse ou o dedo (a sombra verde onde cabe, vermelha onde não; R gira no meio do arraste);
// tocar no item e tocar no destino (no celular, o arraste de dedo erra muito); pelo teclado, Enter pega o item, as setas
// andam, PageUp e PageDown trocam de lugar, R gira, Enter solta e Esc desiste. Dois cliques abrem o item.
import { dimensoes, encaixesDoItem, ENCAIXES, tamanhoDoItem } from './regras-grade.mjs';

// ---------------- O modelo (puro) ----------------
const esc = texto => String(texto ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// O que a tela desenha: os encaixes (com quem os ocupa, o par de mãos inclusive), as listas e as grades, cada uma com os
// itens e o lugar deles. itens: [{ id, name, img, qtd, grade, ...os campos da regra }]. Os sem lugar ou sem tamanho ficam
// de fora (o veículo é um lugar; o que está dentro de outro vai com ele). O item que já traz o tamanho e os encaixes que
// ocupa (a linha da ficha da mesa na wiki, que não tem os dados do item; o C110) vale por eles.
const tamanhoDe = item => item.tamanho ?? tamanhoDoItem(item);
export function modeloDaGrade(lugares, itens, { body = 0 } = {}) {
  const comLugar = itens.filter(item => item.grade && tamanhoDe(item));
  const noLugar = id => comLugar.filter(item => item.grade.lugar === id);
  return lugares.map(lugar => {
    if (lugar.tipo === 'encaixe') {
      const dono = comLugar.find(item => ENCAIXES[item.grade.lugar] && (item.ocupa ?? encaixesDoItem(item, item.grade.lugar, body) ?? [item.grade.lugar]).includes(lugar.id));
      return { ...lugar, item: dono ?? null, deOutro: Boolean(dono && dono.grade.lugar !== lugar.id) };
    }
    if (lugar.tipo === 'lista') return { ...lugar, itens: noLugar(lugar.id) };
    return {
      ...lugar,
      itens: noLugar(lugar.id).map(item => ({ ...item, ...dimensoes(tamanhoDe(item), item.grade.girado) }))
    };
  });
}

// A grade da ficha que o Foundry mandou para a wiki (o "Na mesa", o C110): os lugares do personagem e os itens com o
// lugar, o tamanho e os encaixes que o Foundry contou. Sem os lugares (o Foundry 12, ou o 14 de antes do C110), null.
export function gradeDaMesa(mesa) {
  if (!Array.isArray(mesa?.lugares) || !mesa.lugares.length) return null;
  const itens = (Array.isArray(mesa.itens) ? mesa.itens : []).filter(linha => linha?.grade?.lugar && linha.tamanho)
    .map(linha => ({ id: String(linha.id ?? ''), name: String(linha.nome ?? ''), qtd: Number(linha.qtd) || 1, grade: linha.grade, tamanho: linha.tamanho, ...(Array.isArray(linha.ocupa) ? { ocupa: linha.ocupa } : {}) }));
  return { lugares: mesa.lugares, itens, organizar: itens.filter(item => item.grade.lugar === 'organizar').length, emCombate: Boolean(mesa.emCombate) };
}

const rotuloDoItem = item => `${item.name}${Number(item.qtd) > 1 ? ` (${item.qtd})` : ''}`;
// titulo: a dica do navegador (a wiki; o Foundry tem a dele, pelo data-tooltip).
const botaoDoItem = (item, { editavel, selecionado, titulo }, estilo = '') => `<button type="button" class="grade-item${item.l >= 2 ? ' largo' : ''}${item.id === selecionado ? ' selecionado' : ''}" data-item-id="${esc(item.id)}"${estilo ? ` style="${estilo}"` : ''} aria-label="${esc(rotuloDoItem(item))}" aria-pressed="${item.id === selecionado}"${editavel ? '' : ' aria-disabled="true"'} data-tooltip="${esc(rotuloDoItem(item))}"${titulo ? ` title="${esc(rotuloDoItem(item))}"` : ''}>${item.img ? `<img src="${esc(item.img)}" alt="" draggable="false">` : ''}<span class="nome">${esc(item.name)}</span>${Number(item.qtd) > 1 ? `<span class="qtd">${esc(item.qtd)}</span>` : ''}</button>`;

// O HTML da tela, a partir do modelo. Os nomes e as imagens são escapados (o nome vem do jogador).
export function htmlDaGrade(modelo, { editavel = true, selecionado = '', organizar = 0, titulo = false } = {}) {
  const opcoes = { editavel, selecionado, titulo };
  const encaixes = modelo.filter(lugar => lugar.tipo === 'encaixe');
  const listas = modelo.filter(lugar => lugar.tipo === 'lista' && lugar.id !== 'organizar');
  const grades = modelo.filter(lugar => lugar.tipo === 'grade');
  const aOrganizar = modelo.find(lugar => lugar.id === 'organizar');
  const encaixe = lugar => `<div class="grade-encaixe${lugar.item ? ' ocupado' : ''}" data-lugar="${esc(lugar.id)}"><span class="rotulo">${esc(lugar.nome)}</span>${
    lugar.item ? (lugar.deOutro ? `<span class="par" data-item-id="${esc(lugar.item.id)}">${esc(lugar.item.name)}</span>` : botaoDoItem(lugar.item, opcoes)) : '<span class="vazio">—</span>'}</div>`;
  const lista = lugar => `<div class="grade-lista" data-lugar="${esc(lugar.id)}"><span class="rotulo">${esc(lugar.nome)}</span><div class="itens">${lugar.itens.map(item => botaoDoItem(item, opcoes)).join('') || '<span class="vazio">—</span>'}</div></div>`;
  const grade = lugar => `<div class="grade-bloco"><span class="rotulo">${esc(lugar.nome)} <small>${lugar.l}×${lugar.a}</small></span><div class="grade-lugar" data-lugar="${esc(lugar.id)}" style="--l: ${lugar.l}; --a: ${lugar.a}">${
    lugar.itens.map(item => botaoDoItem(item, opcoes, `grid-column: ${item.grade.x + 1} / span ${item.l}; grid-row: ${item.grade.y + 1} / span ${item.a}`)).join('')}</div></div>`;
  // Sem corpo (o contêiner: só o Conteúdo), a tela tem uma coluna só.
  const semCorpo = !encaixes.length && !listas.length;
  return `<div class="grade-inventario${editavel ? ' editavel' : ''}${semCorpo ? ' sem-corpo' : ''}">
${semCorpo ? '' : `<div class="grade-corpo">${encaixes.map(encaixe).join('')}${listas.map(lista).join('')}</div>`}
<div class="grade-grades">${grades.map(grade).join('')}</div>
${aOrganizar ? `<div class="grade-organizar${organizar ? ' com-itens' : ''}">${lista(aOrganizar)}</div>` : ''}
</div>`;
}

// O destino pelo ponto do ponteiro numa grade: o quadrado sob o ponteiro, menos o quadrado do item onde ele foi pego.
// caixa: o retângulo da grade na tela ({ left, top, width, height }); pega: { x, y }, o quadrado do item.
export function destinoDoPonto(lugar, caixa, ponto, pega = { x: 0, y: 0 }, girado = false) {
  const coluna = Math.floor(((ponto.x - caixa.left) / caixa.width) * lugar.l);
  const linha = Math.floor(((ponto.y - caixa.top) / caixa.height) * lugar.a);
  return { lugar: lugar.id, x: coluna - pega.x, y: linha - pega.y, girado };
}

// O cursor do teclado: as setas andam dentro do lugar (sem passar da borda), PageUp e PageDown trocam de lugar (o
// primeiro quadrado do outro), R gira. Devolve o cursor novo, ou null para a tecla que não é do cursor.
export function moverCursor(cursor, tecla, lugares) {
  const indice = lugares.findIndex(lugar => lugar.id === cursor.lugar);
  const lugar = lugares[indice];
  if (!lugar) return null;
  const naGrade = lugar.tipo === 'grade';
  const passo = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[tecla];
  if (passo) {
    if (!naGrade) return { ...cursor };
    return { ...cursor, x: Math.max(0, Math.min(lugar.l - 1, cursor.x + passo[0])), y: Math.max(0, Math.min(lugar.a - 1, cursor.y + passo[1])) };
  }
  if (tecla === 'PageDown' || tecla === 'PageUp') {
    const proximo = lugares[(indice + (tecla === 'PageDown' ? 1 : -1) + lugares.length) % lugares.length];
    return { ...cursor, lugar: proximo.id, x: 0, y: 0 };
  }
  if (tecla === 'r' || tecla === 'R') return { ...cursor, girado: !cursor.girado };
  return null;
}

// ---------------- Na tela ----------------
// As grades abertas neste documento (o C109, parte 2): o arraste que começa numa pode terminar noutra (a ficha do
// personagem e a do saque abertas lado a lado), que diz se o item cabe e o recebe.
const GRADES = new Map();
export const gradesAbertas = () => GRADES.size;

// Desenha em raiz e liga os gestos. opcoes: { lugares, itens, body, editavel, selecionado, conferir(item, destino) =>
// motivo ou null, aoMover(item, destino), aoDividir(item), aoAbrir(item), aoSelecionar(id), receber(item, destino) }.
// receber: o item de outra grade solto nesta (sem ele, esta não recebe). Devolve o que desliga os gestos da janela (o
// window recebe o arraste) e tira a grade do registro.
export function ligarGrade(raiz, opcoes) {
  const { lugares, itens, body = 0, editavel = true, conferir = () => null, aoMover = () => {}, aoDividir = () => {}, aoAbrir = () => {}, aoSelecionar = () => {}, receber = null } = opcoes;
  let selecionado = opcoes.selecionado ?? '';
  const modelo = modeloDaGrade(lugares, itens, { body });
  raiz.innerHTML = htmlDaGrade(modelo, { editavel, selecionado, organizar: modelo.find(lugar => lugar.id === 'organizar')?.itens.length ?? 0 });
  const doc = raiz.ownerDocument;
  const janela = doc.defaultView;
  const itemDe = id => itens.find(item => item.id === id);
  const lugarDe = id => lugares.find(lugar => lugar.id === id);
  const propria = { raiz, lugares, conferir, receber };
  GRADES.set(raiz, propria);
  const elementoDoLugar = (id, emQual = raiz) => [...emQual.querySelectorAll('[data-lugar]')].find(el => el.dataset.lugar === id);
  const limparSombra = () => {
    for (const outra of GRADES.keys()) {
      for (const el of outra.querySelectorAll('.grade-sombra')) el.remove();
      for (const el of outra.querySelectorAll('.alvo-ok, .alvo-nao')) el.classList.remove('alvo-ok', 'alvo-nao');
    }
  };
  // A sombra do destino, na grade dele (esta ou outra): na grade, o retângulo; no encaixe e na lista, o lugar aceso.
  const sombra = (item, destino, grade = propria) => {
    limparSombra();
    const el = destino && elementoDoLugar(destino.lugar, grade.raiz);
    if (!el) return null;
    const motivo = grade.conferir(item, destino);
    if (el.classList.contains('grade-lugar')) {
      const { l, a } = dimensoes(tamanhoDoItem(item), destino.girado);
      const s = doc.createElement('div');
      s.className = `grade-sombra ${motivo ? 'nao' : 'ok'}`;
      s.style.gridColumn = `${Math.max(1, destino.x + 1)} / span ${l}`;
      s.style.gridRow = `${Math.max(1, destino.y + 1)} / span ${a}`;
      if (motivo) s.title = motivo;
      el.append(s);
    } else el.classList.add(motivo ? 'alvo-nao' : 'alvo-ok');
    return motivo;
  };
  // Soltar pede sempre: quem usa confere de novo e diz o motivo da recusa (a sombra vermelha só avisa antes).
  const soltarEm = (item, destino) => { limparSombra(); if (destino) aoMover(item, destino); };

  // O destino sob um ponto da tela, nesta grade ou noutra aberta: { grade, destino }.
  const destinoNoPonto = (ponto, pega, girado) => {
    const sob = doc.elementFromPoint(ponto.x, ponto.y)?.closest?.('[data-lugar]');
    const grade = sob && [...GRADES.values()].find(outra => outra.raiz.contains(sob));
    const lugar = grade?.lugares.find(outro => outro.id === sob.dataset.lugar);
    if (!lugar || (grade !== propria && !grade.receber)) return null;
    if (lugar.tipo !== 'grade') return { grade, destino: { lugar: lugar.id, x: 0, y: 0, girado: false } };
    return { grade, destino: destinoDoPonto(lugar, sob.getBoundingClientRect(), ponto, pega, girado) };
  };

  // O arraste: começa depois de 5 px (antes disso, é um toque); o item some do caminho do ponteiro.
  let arraste = null;
  const mover = evento => {
    if (!arraste) return;
    const ponto = { x: evento.clientX, y: evento.clientY };
    if (!arraste.ativo && Math.hypot(ponto.x - arraste.inicio.x, ponto.y - arraste.inicio.y) < 5) return;
    if (!arraste.ativo) { arraste.ativo = true; arraste.el.classList.add('arrastando'); }
    arraste.ponto = ponto;
    arraste.alvo = destinoNoPonto(ponto, arraste.pega, arraste.girado);
    if (arraste.alvo) sombra(arraste.item, arraste.alvo.destino, arraste.alvo.grade); else limparSombra();
  };
  const terminar = evento => {
    if (!arraste) return;
    const { ativo, item, alvo, el } = arraste;
    arraste = null;
    el.classList.remove('arrastando');
    if (!ativo) return tocar(item.id, evento);
    if (alvo?.grade && alvo.grade !== propria) { limparSombra(); return alvo.grade.receber(item, alvo.destino); }
    soltarEm(item, alvo?.destino ?? null);
  };
  const teclaDoArraste = evento => {
    if (!arraste?.ativo) return;
    if (evento.key === 'Escape') { arraste.el.classList.remove('arrastando'); arraste = null; limparSombra(); return; }
    if (evento.key !== 'r' && evento.key !== 'R') return;
    evento.preventDefault();
    arraste.girado = !arraste.girado;
    arraste.pega = { x: 0, y: 0 };
    if (arraste.ponto) { arraste.alvo = destinoNoPonto(arraste.ponto, arraste.pega, arraste.girado); if (arraste.alvo) sombra(arraste.item, arraste.alvo.destino, arraste.alvo.grade); }
  };

  // O toque: o primeiro escolhe o item; o segundo, num lugar, o põe lá; no mesmo item, desiste.
  const tocar = (id, evento) => {
    if (!editavel) return;
    if (evento?.shiftKey && Number(itemDe(id)?.qtd) > 1) return aoDividir(itemDe(id));
    selecionado = selecionado === id ? '' : id;
    aoSelecionar(selecionado);
    for (const el of raiz.querySelectorAll('.grade-item')) { el.classList.toggle('selecionado', el.dataset.itemId === selecionado); el.setAttribute('aria-pressed', String(el.dataset.itemId === selecionado)); }
  };
  raiz.addEventListener('pointerdown', evento => {
    const el = evento.target.closest?.('.grade-item');
    if (!editavel || !el || evento.button > 0) return;
    const item = itemDe(el.dataset.itemId);
    if (!item) return;
    evento.preventDefault();
    const caixa = el.getBoundingClientRect();
    const t = item.grade?.lugar && lugarDe(item.grade.lugar)?.tipo === 'grade' ? dimensoes(tamanhoDoItem(item), item.grade.girado) : { l: 1, a: 1 };
    const pega = { x: Math.min(t.l - 1, Math.floor(((evento.clientX - caixa.left) / Math.max(1, caixa.width)) * t.l)), y: Math.min(t.a - 1, Math.floor(((evento.clientY - caixa.top) / Math.max(1, caixa.height)) * t.a)) };
    arraste = { item, el, inicio: { x: evento.clientX, y: evento.clientY }, pega: t.l > 1 || t.a > 1 ? pega : { x: 0, y: 0 }, girado: Boolean(item.grade?.girado), ativo: false, alvo: null };
  });
  // O segundo toque num lugar vazio (a grade, o encaixe ou a lista) com um item escolhido.
  raiz.addEventListener('click', evento => {
    if (!editavel || !selecionado || evento.target.closest('.grade-item')) return;
    const sob = evento.target.closest('[data-lugar]');
    const item = itemDe(selecionado);
    if (!sob || !item) return;
    const lugar = lugarDe(sob.dataset.lugar);
    const destino = lugar?.tipo === 'grade' ? destinoDoPonto(lugar, sob.getBoundingClientRect(), { x: evento.clientX, y: evento.clientY }, { x: 0, y: 0 }, Boolean(item.grade?.girado)) : { lugar: lugar.id, x: 0, y: 0, girado: false };
    selecionado = '';
    aoSelecionar('');
    soltarEm(item, destino);
  });
  raiz.addEventListener('dblclick', evento => {
    const el = evento.target.closest('.grade-item, .par');
    if (el) aoAbrir(itemDe(el.dataset.itemId));
  });

  // O teclado: Enter pega; com o item pego, o cursor anda (moverCursor) e Enter solta.
  let cursor = null;
  raiz.addEventListener('keydown', evento => {
    const el = evento.target.closest?.('.grade-item');
    if (!editavel) return;
    if (cursor) {
      if (evento.key === 'Escape') { cursor = null; limparSombra(); evento.preventDefault(); return; }
      if (evento.key === 'Enter' || evento.key === ' ') { evento.preventDefault(); const { item, ...destino } = cursor; cursor = null; soltarEm(item, destino); return; }
      const novo = moverCursor(cursor, evento.key, lugares);
      if (!novo) return;
      evento.preventDefault();
      cursor = { ...novo, item: cursor.item };
      sombra(cursor.item, cursor);
      return;
    }
    if (!el || (evento.key !== 'Enter' && evento.key !== ' ')) return;
    evento.preventDefault();
    const item = itemDe(el.dataset.itemId);
    if (!item?.grade) return;
    cursor = { item, lugar: item.grade.lugar, x: item.grade.x ?? 0, y: item.grade.y ?? 0, girado: Boolean(item.grade.girado) };
    sombra(item, cursor);
  });

  janela.addEventListener('pointermove', mover);
  janela.addEventListener('pointerup', terminar);
  janela.addEventListener('keydown', teclaDoArraste);
  return () => {
    if (GRADES.get(raiz) === propria) GRADES.delete(raiz);
    janela.removeEventListener('pointermove', mover);
    janela.removeEventListener('pointerup', terminar);
    janela.removeEventListener('keydown', teclaDoArraste);
  };
}

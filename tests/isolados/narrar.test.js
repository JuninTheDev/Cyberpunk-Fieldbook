// A aba Narrar (narrar.js): a leitura dos momentos marcados no roteiro, os links, as escolhas, o relógio e o alarme, os
// avisos e o desenho do cartão (com o texto escapado). O roteiro daqui é inventado: a trama de verdade fica no servidor.
const test = require('node:test');
const assert = require('node:assert');
const narrar = require('../../narrar.js');

const ROTEIRO = [
  '# Sessão de teste',
  '',
  'Um parágrafo antes de tudo.',
  '',
  '## Página de mesa',
  '',
  '### O relógio',
  '',
  '- **Consulta:** relogio',
  '',
  '| Hora | Na casa |',
  '|---|---|',
  '| 22:00 | A porta abre. |',
  '| 00:30 | O guarda dorme. |',
  '| 01:30 | O carro chega: [O carro](momento:carro). |',
  '',
  '### O alarme',
  '',
  '- **Consulta:** alarme',
  '',
  '| Degrau | O que faz subir | O que a casa faz |',
  '|---|---|---|',
  '| **Calmo** | — | Nada. |',
  '| **Cerco** | Um tiro. | Todos acordam. [A fuga](momento:fuga) |',
  '',
  '## 1. A abertura',
  '',
  '- **Momento:** abertura',
  '',
  '> A chuva cai no telhado.',
  '>',
  '> Alguém bate na porta.',
  '',
  'Entregue o **H-01**.',
  '',
  '### Um subtítulo sem marca',
  '',
  'Fica dentro da abertura. Depois: [A entrada](momento:entrada).',
  '',
  '## 2. A entrada',
  '',
  '- **Momento:** entrada',
  '',
  '> **Nota do mestre.** Esta citação é do mestre, não se lê.',
  '',
  '**Escolha:** Por onde o grupo entra?',
  '',
  '- [A janela](momento:janela) · Atletismo DV13',
  '- [O telhado](momento:telhado) · sem câmeras',
  '',
  '### Caminho 1 · A janela',
  '',
  '- **Momento:** janela',
  '- **Quem brilha:** fica no corpo',
  '',
  '> Uma janela aberta.',
  '',
  '- **Se der certo** → [O carro](momento:carro).',
  '',
  '### Caminho 2 · O telhado',
  '',
  '- **Momento:** telhado',
  '',
  'Vai para [um lugar que não existe](momento:sumiu).',
  '',
  '## 3. O carro',
  '',
  '- **Momento:** carro',
  '',
  'O carro chega.',
  '',
  '## 4. A fuga',
  '',
  '- **Momento:** fuga',
  '',
  'Correm.',
  '',
  '## 5. Um esquecido',
  '',
  '- **Momento:** esquecido',
  '',
  'Ninguém chega aqui.',
  '',
  '### H-01 · O bilhete',
  '',
  '> Venha sozinho.'
].join('\n');

test('os momentos e as consultas: o id, o título sem o número, a ordem e o primeiro momento', () => {
  const modelo = narrar.ler(ROTEIRO);
  assert.equal(modelo.inicio, 'abertura');
  assert.deepEqual(modelo.blocos.map(bloco => `${bloco.tipo}:${bloco.id}`), ['consulta:relogio', 'consulta:alarme', 'momento:abertura', 'momento:entrada', 'momento:janela', 'momento:telhado', 'momento:carro', 'momento:fuga', 'momento:esquecido']);
  assert.equal(modelo.blocos.find(bloco => bloco.id === 'abertura').titulo, 'A abertura');
  assert.equal(modelo.blocos.find(bloco => bloco.id === 'janela').linha, 51);
});

test('o corpo: sem as linhas de marcação, com os subtítulos sem marca e sem os momentos filhos', () => {
  const modelo = narrar.ler(ROTEIRO);
  const corpo = id => modelo.blocos.find(bloco => bloco.id === id).corpo.map(item => item.texto).join('\n');
  assert.match(corpo('abertura'), /Um subtítulo sem marca/);
  assert.doesNotMatch(corpo('abertura'), /Momento:/);
  assert.doesNotMatch(corpo('entrada'), /Uma janela aberta/);
  // Só "Momento" e "Consulta" são marcação; os outros campos do roteiro ficam no texto.
  assert.match(corpo('janela'), /Quem brilha:/);
  assert.doesNotMatch(corpo('janela'), /\*\*Momento:\*\*/);
});

test('o relógio e o alarme saem das consultas, com os gatilhos', () => {
  const modelo = narrar.ler(ROTEIRO);
  assert.deepEqual(modelo.relogio.map(linha => [linha.hora, linha.minutos]), [['22:00', 1320], ['00:30', 30], ['01:30', 90]]);
  assert.deepEqual(modelo.relogio[2].links, [{ id: 'carro', rotulo: 'O carro' }]);
  assert.deepEqual(modelo.alarme.map(linha => linha.nome), ['Calmo', 'Cerco']);
  assert.equal(modelo.alarme[1].texto, 'Todos acordam. A fuga');
  assert.deepEqual(modelo.alarme[1].links, [{ id: 'fuga', rotulo: 'A fuga' }]);
});

test('os avisos: o link para um momento que não existe e o momento a que nada leva', () => {
  const { avisos } = narrar.ler(ROTEIRO);
  assert.deepEqual(avisos.map(aviso => [aviso.tipo, aviso.linha]), [['link', 64], ['solto', 78]]);
  assert.match(avisos[0].texto, /"sumiu", que não existe/);
});

test('ids: o repetido e o com acento ficam de fora, com aviso', () => {
  const { blocos, avisos } = narrar.ler('## A\n\n- **Momento:** um\n\n## B\n\n- **Momento:** um\n\n## C\n\n- **Momento:** ação\n');
  assert.deepEqual(blocos.map(bloco => bloco.id), ['um']);
  assert.deepEqual(avisos.map(aviso => aviso.tipo), ['repetido', 'id']);
});

test('CRLF e BOM dão o mesmo que LF', () => {
  const lf = narrar.ler(ROTEIRO);
  const crlf = narrar.ler(`﻿${ROTEIRO.split('\n').join('\r\n')}`);
  assert.deepEqual(crlf, lf);
});

test('temNarrar: só com a linha de momento', () => {
  assert.equal(narrar.temNarrar(ROTEIRO), true);
  assert.equal(narrar.temNarrar('# Roteiro\n\n- **Consulta:** x\n\nTexto.'), false);
  assert.equal(narrar.temNarrar(''), false);
});

test('os trechos: o texto para ler, a caixa do mestre e a escolha com as opções', () => {
  const modelo = narrar.ler(ROTEIRO);
  const tipos = id => narrar.trechos(modelo.blocos.find(bloco => bloco.id === id).corpo).map(trecho => trecho.tipo);
  assert.deepEqual(tipos('abertura'), ['ler', 'md']);
  assert.deepEqual(tipos('entrada'), ['mestre', 'escolha']);
  const escolha = narrar.trechos(modelo.blocos.find(bloco => bloco.id === 'entrada').corpo)[1];
  assert.equal(escolha.pergunta, 'Por onde o grupo entra?');
  assert.deepEqual(escolha.opcoes, [{ id: 'janela', rotulo: 'A janela', resto: 'Atletismo DV13' }, { id: 'telhado', rotulo: 'O telhado', resto: 'sem câmeras' }]);
});

// Um renderMarkdown de mentira: escapa como o da wiki e põe cada linha num parágrafo.
const escapar = texto => String(texto).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const render = texto => texto.split('\n').filter(linha => linha.trim()).map(linha => `<p>${escapar(linha)}</p>`).join('');

test('o cartão: o texto para ler com rótulo, os botões dos links e das escolhas, o visto, o fixado e o handout', () => {
  const modelo = narrar.ler(ROTEIRO);
  const abertura = narrar.desenhar(modelo, 'abertura', { renderMarkdown: render, visitados: new Set(['entrada']), fixados: ['abertura'] });
  assert.match(abertura, /<p class="narrar-rotulo">Leia em voz alta<\/p><p>A chuva cai no telhado.<\/p><p>Alguém bate na porta.<\/p>/);
  assert.match(abertura, /data-narrar-ir="entrada">A entrada<span aria-hidden="true"> →<\/span> <span class="narrar-visto">visto<\/span>/);
  assert.match(abertura, /data-narrar-fixar="abertura" aria-pressed="true">Fixado/);
  assert.match(abertura, /data-narrar-handout="H-01">H-01/);
  const entrada = narrar.desenhar(modelo, 'entrada', { renderMarkdown: render });
  assert.match(entrada, /role="group" aria-labelledby="narrar-pergunta-entrada-1"/);
  assert.match(entrada, /data-narrar-ir="janela"><b>A janela<\/b><span>Atletismo DV13<\/span>/);
  assert.doesNotMatch(entrada, /Leia em voz alta/);
  // O link quebrado não vira botão.
  const telhado = narrar.desenhar(modelo, 'telhado', { renderMarkdown: render });
  assert.match(telhado, /narrar-quebrado">um lugar que não existe \(link quebrado\)/);
  assert.doesNotMatch(telhado, /data-narrar-ir="sumiu"/);
  assert.equal(narrar.desenhar(modelo, 'nao-existe', { renderMarkdown: render }), '');
});

test('o texto do roteiro não vira HTML: rótulos, perguntas e corpo saem escapados', () => {
  const perigoso = [
    '## <img src=x onerror=alert(1)>',
    '',
    '- **Momento:** a',
    '',
    '<script>alert(1)</script> 0',
    '',
    '**Escolha:** <b onmouseover=x>?</b>',
    '',
    '- [<i>"rótulo"</i>](momento:b) · <svg onload=x>',
    '',
    '## B',
    '',
    '- **Momento:** b',
    '',
    'Fim.'
  ].join('\n');
  const html = narrar.desenhar(narrar.ler(perigoso), 'a', { renderMarkdown: render });
  assert.doesNotMatch(html, /<script|<img|<svg|<b onmouseover|<i>/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(html, /data-narrar-ir="b"><b>&lt;i&gt;&quot;rótulo&quot;&lt;\/i&gt;<\/b>/);
  // Os marcadores de uso privado que vierem no texto saem antes (não viram um botão de mentira).
  assert.doesNotMatch(html, /data-narrar-ir="a"/);
});

// Fonte: foundry-2077/scripts/wiki.mjs, portraitOf/copyPortrait/applyPortrait/atualizarDaWiki; api-personagens.js,
// rota extra === 'retrato'. O caminho enviado, os links HTTPS, os tipos aceitos e a marca original são os da mesa.
import assert from 'node:assert/strict';
import test from 'node:test';
import { aceitaLinkDireto, extensaoDoRetrato, requisicaoDoRetrato, retratoDaWiki, retratoMudou } from '../../foundry-sistema/scripts/wiki-retrato.mjs';

const retratoEnviado = 'api/personagens/edgerunner-1/retrato?v=1792500000000';
const link = 'https://imagens.exemplo/rosto.png';

test('retrato da wiki: a imagem enviada tem preferência; sem ela, só um link HTTPS válido', () => {
  assert.equal(retratoDaWiki({ retrato: retratoEnviado, retratoLink: link }), retratoEnviado);
  assert.equal(retratoDaWiki({ retrato: null, retratoLink: link }), link);
  assert.equal(retratoDaWiki({ retrato: `/${retratoEnviado}` }), `/${retratoEnviado}`);
  assert.equal(retratoDaWiki({ retrato: link }), link);
  assert.equal(retratoDaWiki(), '');
  for (const retratoLink of ['http://imagens.exemplo/rosto.png', 'javascript:alert(1)', 'data:image/png;base64,AAAA', '//imagens.exemplo/rosto.png', 'https://imagens.exemplo/ro sto.png', 'https://imagens.exemplo/"rosto.png', 'https://imagens.exemplo/<rosto>.png']) {
    assert.equal(retratoDaWiki({ retratoLink }), '', retratoLink);
  }
  assert.equal(retratoDaWiki({ retrato: '../fora-da-wiki.png' }), '');
});

test('atualizar o retrato: marca a fonte, detecta a troca e preserva a imagem da ficha se a wiki tirar a dela', () => {
  assert.equal(retratoMudou({ retrato: retratoEnviado }), true);
  assert.equal(retratoMudou({ retrato: retratoEnviado }, retratoEnviado), false);
  assert.equal(retratoMudou({ retrato: `${retratoEnviado}1` }, retratoEnviado), true);
  assert.equal(retratoMudou({ retratoLink: link }, retratoEnviado), true);
  assert.equal(retratoMudou({}, retratoEnviado), false);
});

test('baixar o retrato: sem cache, cookie na wiki e sem cookie em link de fora', () => {
  assert.deepEqual(requisicaoDoRetrato(retratoEnviado, 'https://wiki.exemplo/'), {
    url: `https://wiki.exemplo/${retratoEnviado}`, opcoes: { cache: 'no-store', credentials: 'include' }
  });
  assert.deepEqual(requisicaoDoRetrato(`/${retratoEnviado}`, 'http://localhost:8000'), {
    url: `http://localhost:8000/${retratoEnviado}`, opcoes: { cache: 'no-store', credentials: 'include' }
  });
  assert.deepEqual(requisicaoDoRetrato(`https://wiki.exemplo/${retratoEnviado}`, 'https://wiki.exemplo'), {
    url: `https://wiki.exemplo/${retratoEnviado}`, opcoes: { cache: 'no-store', credentials: 'include' }
  });
  assert.deepEqual(requisicaoDoRetrato(link, 'https://wiki.exemplo'), {
    url: link, opcoes: { cache: 'no-store', credentials: 'omit' }
  });
  assert.equal(requisicaoDoRetrato('https://wiki.exemplo.evil/rosto.png', 'https://wiki.exemplo').opcoes.credentials, 'omit');
});

test('copiar o retrato: extensão pelos tipos de imagem aceitos; SVG e HTML não são copiados', () => {
  for (const [tipo, extensao] of Object.entries({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' })) {
    assert.equal(extensaoDoRetrato(tipo), extensao, tipo);
  }
  for (const tipo of ['image/svg+xml', 'text/html', 'application/octet-stream', '', undefined, 'constructor', '__proto__']) assert.equal(extensaoDoRetrato(tipo), '', String(tipo));
});

test('sem download: só o link HTTPS com extensão de imagem é usado direto; caminho privado da wiki nunca', () => {
  for (const extensao of ['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif', 'svg', 'PNG']) assert.equal(aceitaLinkDireto(`https://imagens.exemplo/rosto.${extensao}?v=2`), true, extensao);
  for (const fonte of [retratoEnviado, 'http://imagens.exemplo/rosto.png', 'https://imagens.exemplo/rosto', 'https://imagens.exemplo/rosto.html', 'https://imagens.exemplo/rosto.png/arquivo', 'https://imagens.exemplo/ro sto.png']) assert.equal(aceitaLinkDireto(fonte), false, fonte);
});

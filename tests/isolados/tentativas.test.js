// O limite de tentativas da senha do mestre e dos códigos dos jogadores: dez erradas a cada dez minutos por endereço.
// O endereço é o de quem chegou, e só um intermediário nesta máquina pode dizê-lo: no servidor, o Caddy, no fim do
// X-Forwarded-For; em casa, o túnel do Cloudflare, no CF-Connecting-IP. Um cabeçalho que o próprio visitante manda
// (o CF-Connecting-IP no servidor, o começo do X-Forwarded-For, qualquer um vindo da rede de casa) não troca o
// endereço, senão cada pedido com um valor novo teria dez tentativas novas.
const assert = require('node:assert/strict');
const test = require('node:test');
const { criarServidorIsolado } = require('../lib/servidor-isolado');
const { ipDoCliente, limiteDeTentativas } = require('../../api-personagens');

const errarSenha = (pedir, headers = {}, ip) => pedir('/api/mestre/entrar', { method: 'POST', body: { senha: 'errada' }, headers, ip });
const errarCodigo = (pedir, headers = {}, ip) => pedir('/api/entrar', { method: 'POST', body: { codigo: 'NC-0000-0000' }, headers, ip });
// As respostas de onze tentativas seguidas, cada uma com os cabeçalhos que "cabecalhos(i)" monta.
async function onze(errar, pedir, cabecalhos, ip) {
  const status = [];
  for (let i = 1; i <= 11; i += 1) status.push((await errar(pedir, cabecalhos(i), ip)).status);
  return status;
}
const DEZ_E_PARA = [403, 403, 403, 403, 403, 403, 403, 403, 403, 403, 429];

test('no servidor, trocar o CF-Connecting-IP a cada pedido não dá tentativas novas (a senha do mestre e o código)', async t => {
  const { pedir } = criarServidorIsolado(t);
  // O Caddy põe o endereço de quem chegou no X-Forwarded-For; o CF-Connecting-IP vem do visitante.
  const caddy = i => ({ 'x-forwarded-for': '203.0.113.9', 'cf-connecting-ip': `10.9.${i}.1` });
  assert.deepEqual(await onze(errarSenha, pedir, caddy), DEZ_E_PARA);
  const codigos = await onze(errarCodigo, pedir, i => ({ 'x-forwarded-for': '203.0.113.10', 'cf-connecting-ip': `10.8.${i}.1` }));
  assert.equal(codigos[10], 429);
  assert.ok(codigos.slice(0, 10).every(s => s !== 429), JSON.stringify(codigos));
});

test('no servidor, o começo do X-Forwarded-For é do visitante: vale o fim, que o Caddy escreve', async t => {
  const { pedir } = criarServidorIsolado(t);
  assert.deepEqual(await onze(errarSenha, pedir, i => ({ 'x-forwarded-for': `10.7.${i}.1, 203.0.113.11` })), DEZ_E_PARA);
});

test('no servidor, cada endereço tem as suas dez, e a resposta diz quantas restam', async t => {
  const { pedir } = criarServidorIsolado(t);
  const de = ip => ({ 'x-forwarded-for': ip });
  for (let i = 0; i < 10; i += 1) await errarSenha(pedir, de('203.0.113.20'));
  assert.equal((await errarSenha(pedir, de('203.0.113.20'))).status, 429);
  const outro = await errarSenha(pedir, de('203.0.113.21'));
  assert.equal(outro.status, 403);
  assert.equal(outro.json.restantes, 9);
});

test('a senha certa zera as tentativas daquele endereço', async t => {
  const { pedir, senha } = criarServidorIsolado(t);
  const de = { 'x-forwarded-for': '203.0.113.30' };
  for (let i = 0; i < 9; i += 1) await errarSenha(pedir, de);
  assert.equal((await pedir('/api/mestre/entrar', { method: 'POST', body: { senha }, headers: de })).status, 200);
  const depois = await errarSenha(pedir, de);
  assert.equal(depois.status, 403);
  assert.equal(depois.json.restantes, 9);
});

test('o código certo do jogador zera as tentativas daquele endereço', async t => {
  const { pedir, entrarComoMestre } = criarServidorIsolado(t);
  const cookie = await entrarComoMestre();
  const { conta } = (await pedir('/api/contas', { method: 'POST', cookie, body: { nome: 'Ana (teste)' } })).json;
  const de = { 'x-forwarded-for': '203.0.113.40' };
  for (let i = 0; i < 9; i += 1) assert.equal((await errarCodigo(pedir, de)).status, 403);
  assert.equal((await pedir('/api/entrar', { method: 'POST', body: { codigo: conta.codigo }, headers: de })).status, 200);
  // Sem zerar, a próxima errada seria a 11ª.
  assert.equal((await errarCodigo(pedir, de)).status, 403);
});

test('em casa, pelo túnel do Cloudflare, o CF-Connecting-IP é quem chegou: cada visitante tem as suas dez', async t => {
  const { pedir } = criarServidorIsolado(t, { env: { MODO: 'local' } });
  assert.deepEqual(await onze(errarSenha, pedir, () => ({ 'cf-connecting-ip': '198.51.100.5', 'x-forwarded-for': '198.51.100.5' })), DEZ_E_PARA);
  assert.equal((await errarSenha(pedir, { 'cf-connecting-ip': '198.51.100.6', 'x-forwarded-for': '198.51.100.6' })).status, 403);
});

test('em casa, quem chega pela rede direto não troca de endereço com um cabeçalho', async t => {
  const { pedir } = criarServidorIsolado(t, { env: { MODO: 'local' } });
  const status = await onze(errarSenha, pedir, i => ({ 'cf-connecting-ip': `10.6.${i}.1`, 'x-forwarded-for': `10.5.${i}.1` }), '192.168.0.20');
  assert.deepEqual(status, DEZ_E_PARA);
});

test('o ipDoCliente: o endereço de cada caminho', () => {
  const pedido = (ip, headers = {}) => ({ socket: { remoteAddress: ip }, headers });
  assert.equal(ipDoCliente(pedido('127.0.0.1', { 'x-forwarded-for': '10.1.1.1, 203.0.113.9', 'cf-connecting-ip': '10.2.2.2' }), { hospedado: true }), '203.0.113.9');
  assert.equal(ipDoCliente(pedido('::1', { 'x-forwarded-for': '203.0.113.9' }), { hospedado: true }), '203.0.113.9');
  assert.equal(ipDoCliente(pedido('127.0.0.1'), { hospedado: true }), '127.0.0.1');
  assert.equal(ipDoCliente(pedido('127.0.0.1', { 'cf-connecting-ip': '198.51.100.5', 'x-forwarded-for': '198.51.100.5' })), '198.51.100.5');
  // Em casa, pelo túnel, vale o CF-Connecting-IP, mesmo sem o X-Forwarded-For.
  assert.equal(ipDoCliente(pedido('127.0.0.1', { 'cf-connecting-ip': '198.51.100.8' })), '198.51.100.8');
  assert.equal(ipDoCliente(pedido('127.0.0.1', { 'x-forwarded-for': '198.51.100.7' })), '198.51.100.7');
  assert.equal(ipDoCliente(pedido('192.168.0.20', { 'cf-connecting-ip': '10.2.2.2', 'x-forwarded-for': '10.1.1.1' })), '192.168.0.20');
  assert.equal(ipDoCliente(pedido('192.168.0.20', { 'x-forwarded-for': '10.1.1.1' }), { hospedado: true }), '192.168.0.20');
});

test('o limite esquece as entradas vencidas quando o mapa passa do teto', () => {
  let agora = 0;
  const limite = limiteDeTentativas({ maximo: 2, janela: 1000, teto: 50, agora: () => agora });
  for (let i = 0; i < 60; i += 1) limite.excedeu(`10.0.0.${i}`);
  assert.ok(limite.tamanho >= 50);
  agora = 2000;
  limite.excedeu('10.9.9.9');
  assert.equal(limite.tamanho, 1);
  // Dentro da janela, a conta continua: duas valem, a terceira passa do limite.
  assert.deepEqual([limite.excedeu('a'), limite.excedeu('a'), limite.excedeu('a')], [false, false, true]);
  assert.equal(limite.restantes('a'), 0);
  assert.equal(limite.restantes('nunca-errou'), 2);
  agora = 3500;
  assert.equal(limite.excedeu('a'), false);
});

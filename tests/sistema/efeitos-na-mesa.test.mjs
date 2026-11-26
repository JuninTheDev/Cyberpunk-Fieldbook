// Os efeitos na mesa (o plano de foundry-sistema/efeitos-plano/PLANO.md). O C77: o texto em cima do token só na visão de
// quem vê, o socket só para quem vê o cartão, a pasta dos efeitos instalada e a licença de cada arquivo dela (o
// repositório é público: só CC0, CC-BY ou nosso).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { destinatariosDoTexto, textoNaVisao } from '../../foundry-sistema/scripts/regras.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const sistema = path.join(raiz, 'foundry-sistema');
const leia = arquivo => fs.readFileSync(path.join(sistema, arquivo), 'utf8');

test('C77: o texto em cima do token só na visão de quem vê; o mestre sempre vê', () => {
  const visto = () => true;
  const naoVisto = () => false;
  // O mestre: mesmo escondido, mesmo fora da visão.
  assert.equal(textoNaVisao({ gm: true, escondido: true, testar: naoVisto }), true);
  // O jogador: o escondido nunca, nem na visão, nem sem a visão dos tokens.
  assert.equal(textoNaVisao({ escondido: true, testar: visto }), false);
  assert.equal(textoNaVisao({ escondido: true, visaoDosTokens: false }), false);
  // Com a visão dos tokens: só o que está na visão (ou o próprio token, com a visão ativa).
  assert.equal(textoNaVisao({ testar: visto }), true);
  assert.equal(textoNaVisao({ testar: naoVisto }), false);
  assert.equal(textoNaVisao({ proprio: true, testar: naoVisto }), true);
  // Sem como testar, não vê (com a visão dos tokens); a cena sem a visão dos tokens mostra para todos.
  assert.equal(textoNaVisao({}), false);
  assert.equal(textoNaVisao({ visaoDosTokens: false, testar: naoVisto }), true);
});

test('C77: o texto vai pelo socket só para quem vê o cartão, menos quem já desenhou', () => {
  // O cartão de todos: o envio a todos (null).
  assert.equal(destinatariosDoTexto(null, 'mestre'), null);
  assert.equal(destinatariosDoTexto(undefined, 'mestre'), null);
  // Só o mestre: ninguém mais (o próprio mestre já desenhou).
  assert.deepEqual(destinatariosDoTexto(['mestre'], 'mestre'), []);
  // Os envolvidos: os outros, sem repetir.
  assert.deepEqual(destinatariosDoTexto(['mestre', 'assistente', 'jogador', 'jogador'], 'mestre'), ['assistente', 'jogador']);
});

test('C77: o socket só aceita o texto vindo de um mestre, e o cartão manda só para quem vê', () => {
  const socket = leia('scripts/combate/socket.mjs');
  assert.match(socket, /mensagem\.tipo === 'texto' && quem\?\.isGM/, 'o texto de um jogador (pelo console) não aparece no token de ninguém');
  const cartao = leia('scripts/combate/cartao.mjs');
  assert.match(cartao, /destinatariosDoTexto\(para, game\.user\.id\)/);
  assert.match(cartao, /\{ recipients: outros \}/);
  assert.match(cartao, /animar\(linha\.token, resumo\.estilo, para\)/, 'a animação respeita quem vê o cartão');
});

test('C77: o efeitos.mjs usa a API do Foundry 14 (foundry.utils.srcExists) e não tem mais o Diwako (só até o Foundry 12)', () => {
  const efeitos = leia('scripts/efeitos.mjs');
  assert.match(efeitos, /foundry\.utils\.srcExists/);
  assert.doesNotMatch(efeitos, /foundry\.canvas\.srcExists/, 'obsoleto no 14, sai no 16');
  assert.doesNotMatch(efeitos, /diwako-cpred-additions|DIWAKO|AudioHelper/, 'o som do Diwako não toca no 14');
  assert.match(efeitos, /\.forUsers\(para\)/, 'a animação do Sequencer só para quem vê o cartão');
});

test('C77: o instalar.mjs leva a pasta efeitos/ para o Foundry (senão o arquivo novo não chega à mesa)', () => {
  const lista = leia('instalar.mjs').match(/for \(const item of \[([^\]]+)\]\)/);
  assert.ok(lista, 'a lista das pastas do instalar.mjs');
  assert.ok(lista[1].includes("'efeitos'"), 'a pasta efeitos/ na lista');
  assert.ok(fs.existsSync(path.join(sistema, 'efeitos', 'CREDITOS.md')));
  assert.ok(fs.existsSync(path.join(sistema, 'efeitos', 'LICENCAS.csv')));
});

// A licença de cada arquivo da pasta efeitos/: o repositório é público (a auditoria de 2026-11-16), e o push instala na
// mesa. Só entra o CC0, o CC-BY (com o crédito no CREDITOS.md) e o que é nosso. Nada de CC-BY-SA, NC, ND, Sonniss,
// Pixabay, Patreon, PSFX ou JB2A (o plano, seção 7).
export const LICENCAS_PERMITIDAS = ['CC0', 'CC-BY-3.0', 'CC-BY-4.0', 'nosso'];
const CABECALHO = 'arquivo;licenca;autor;fonte';

export function lerLicencas(texto) {
  const linhas = texto.replace(/\r/g, '').split('\n').filter(linha => linha.trim());
  if (linhas[0] !== CABECALHO) return { erro: `o cabeçalho tem de ser "${CABECALHO}"`, linhas: [] };
  return { linhas: linhas.slice(1).map(linha => { const [arquivo, licenca, autor, fonte] = linha.split(';').map(c => c?.trim() ?? ''); return { arquivo, licenca, autor, fonte }; }) };
}

export function conferirLicencas(arquivos, { linhas }) {
  const problemas = [];
  const porArquivo = new Map();
  for (const linha of linhas) {
    if (porArquivo.has(linha.arquivo)) problemas.push(`${linha.arquivo}: duas linhas`);
    porArquivo.set(linha.arquivo, linha);
    if (!LICENCAS_PERMITIDAS.includes(linha.licenca)) problemas.push(`${linha.arquivo}: a licença "${linha.licenca}" não pode ir no repositório público`);
    if (linha.licenca !== 'nosso' && (!linha.autor || !linha.fonte)) problemas.push(`${linha.arquivo}: falta o autor ou a fonte`);
    if (!arquivos.includes(linha.arquivo)) problemas.push(`${linha.arquivo}: está no LICENCAS.csv e não na pasta`);
  }
  for (const arquivo of arquivos) if (!porArquivo.has(arquivo)) problemas.push(`${arquivo}: sem a linha no LICENCAS.csv`);
  return problemas;
}

const arquivosDaPasta = (pasta, base = pasta) => fs.readdirSync(pasta, { withFileTypes: true }).flatMap(item => {
  const caminho = path.join(pasta, item.name);
  return item.isDirectory() ? arquivosDaPasta(caminho, base) : [path.relative(base, caminho).replace(/\\/g, '/')];
});

test('C77: a conferência das licenças recusa o arquivo sem linha, a licença proibida e a linha sem arquivo', () => {
  const ok = { linhas: [{ arquivo: 'sons/tiro.webm', licenca: 'CC0', autor: 'Kenney', fonte: 'https://kenney.nl/assets/sci-fi-sounds' }, { arquivo: 'texturas/brilho.webp', licenca: 'nosso', autor: '', fonte: '' }] };
  assert.deepEqual(conferirLicencas(['sons/tiro.webm', 'texturas/brilho.webp'], ok), []);
  assert.deepEqual(conferirLicencas(['sons/tiro.webm', 'texturas/brilho.webp', 'sons/sonniss.webm'], ok), ['sons/sonniss.webm: sem a linha no LICENCAS.csv']);
  assert.deepEqual(conferirLicencas(['a.webm'], { linhas: [{ arquivo: 'a.webm', licenca: 'CC-BY-SA-3.0', autor: 'Q009', fonte: 'x' }] }), ['a.webm: a licença "CC-BY-SA-3.0" não pode ir no repositório público']);
  assert.deepEqual(conferirLicencas(['a.webm'], { linhas: [{ arquivo: 'a.webm', licenca: 'CC-BY-4.0', autor: '', fonte: 'x' }] }), ['a.webm: falta o autor ou a fonte']);
  assert.deepEqual(conferirLicencas([], { linhas: [{ arquivo: 'sumiu.webm', licenca: 'CC0', autor: 'a', fonte: 'b' }] }), ['sumiu.webm: está no LICENCAS.csv e não na pasta']);
  assert.ok(lerLicencas('arquivo,licenca\n').erro);
  assert.deepEqual(lerLicencas('arquivo;licenca;autor;fonte\r\nx.webm;CC0;Kenney;https://kenney.nl\r\n').linhas, [{ arquivo: 'x.webm', licenca: 'CC0', autor: 'Kenney', fonte: 'https://kenney.nl' }]);
});

test('C77: cada arquivo da pasta efeitos/ tem a linha dele no LICENCAS.csv, com uma licença que pode ir no repositório público', () => {
  const pasta = path.join(sistema, 'efeitos');
  const registro = lerLicencas(fs.readFileSync(path.join(pasta, 'LICENCAS.csv'), 'utf8'));
  assert.equal(registro.erro, undefined, registro.erro);
  const arquivos = arquivosDaPasta(pasta).filter(arquivo => !['CREDITOS.md', 'LICENCAS.csv'].includes(arquivo));
  assert.deepEqual(conferirLicencas(arquivos, registro), []);
});

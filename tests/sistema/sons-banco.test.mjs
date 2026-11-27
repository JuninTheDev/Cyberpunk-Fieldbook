// O banco de sons do sistema (o C103): a receita (build/sons-receita.mjs) com os sons que o usuário escolheu na audição,
// o banco.json e o LICENCAS.csv que o build/sons.mjs gerou dela, e os arquivos (Ogg Opus mono, pequenos). Sem o ffmpeg e
// sem o Foundry: o G4 decodifica cada arquivo no Edge e toca o banco (tests/cenarios/v14.js, o passo do C103).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { PASTA_DO_BANCO, chavesDeSom, conferirBanco } from '../../foundry-sistema/scripts/regras-sons.mjs';
import { ALVO, FONTES, PICO, RECEITA, SEM_SOM, VARIACOES, alcance, alcanceDoSom, arquivoDaVariacao, linhaDeLicenca, niveisDosGrupos } from '../../foundry-sistema/build/sons-receita.mjs';
import { LICENCAS_PERMITIDAS, lerLicencas } from './efeitos-na-mesa.test.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const efeitos = path.join(raiz, 'foundry-sistema', 'efeitos');
const banco = JSON.parse(fs.readFileSync(path.join(efeitos, 'sons', 'banco.json'), 'utf8'));
const licencas = lerLicencas(fs.readFileSync(path.join(efeitos, 'LICENCAS.csv'), 'utf8')).linhas;
const PASTA = PASTA_DO_BANCO.replace(/sons\/$/, '');
const oggs = (pasta = path.join(efeitos, 'sons')) => fs.readdirSync(pasta, { withFileTypes: true })
  .flatMap(item => (item.isDirectory() ? oggs(path.join(pasta, item.name)) : item.name.endsWith('.ogg') ? [path.join(pasta, item.name)] : []));

test('C103: a receita tem cada som do motor, menos os que ficaram sem som na audição, de uma fonte que pode ir no repositório', () => {
  assert.deepEqual([...Object.keys(RECEITA), ...Object.keys(SEM_SOM)].sort(), chavesDeSom().sort());
  assert.deepEqual(Object.keys(SEM_SOM), []);
  for (const [chave, r] of Object.entries(RECEITA)) {
    assert.ok(FONTES[r.origem], `${chave}: a origem ${r.origem}`);
    assert.ok(LICENCAS_PERMITIDAS.includes(FONTES[r.origem].licenca), chave);
    assert.ok(ALVO[chave.split('.')[0]], `${chave}: o grupo sem alvo`);
    assert.ok(r.tom > 0.5 && r.tom <= 1, `${chave}: o tom ${r.tom}`);
    assert.ok(r.rel || r.familias?.length || r.expressoes?.length, `${chave}: de onde tirar`);
  }
  // Alguns dos escolhidos (a página da audição, 2026-11-27).
  assert.equal(RECEITA['tiro.pistola'].conjunto, 'walther-9mm');
  assert.equal(RECEITA['tiro.pistola'].rel, 'Walther PPQ/X_39P.wav');
  assert.equal(RECEITA['tiro.pistola-pesada'].tom, 0.9);
  assert.equal(RECEITA['rajada.fuzil'].rel, 'AK-47/C_27P.wav');
  assert.equal(RECEITA['corpo.flatline'].origem, 'gerado');
  // A explosão leve, da 2ª rodada (nenhum dos estouros da 1ª serviu): o pop e o chiado, gerado, em 3 variações.
  assert.equal(RECEITA['explosao.leve'].conjunto, 'pop-chiado');
  assert.equal(RECEITA['explosao.leve'].origem, 'gerado');
  assert.equal(RECEITA['explosao.leve'].expressoes.length, 3);
  assert.ok(RECEITA['explosao.leve'].expressoes.every(x => /seed=\d+/.test(x) && x.endsWith('[out0]')));
  assert.deepEqual(RECEITA['recarga.padrao'].familias, ['metalClick', 'metalLatch']);
});

test('C103: o nome de cada arquivo, a linha da licença e o nível dos grupos (a mistura do anexo, todos descendo juntos)', () => {
  assert.equal(arquivoDaVariacao('tiro.pistola-leve', 1), 'sons/tiro/pistola-leve-1.ogg');
  assert.equal(arquivoDaVariacao('corpo.flatline', 3), 'sons/corpo/flatline-3.ogg');
  assert.equal(linhaDeLicenca('tiro.pistola', 2, 'Walther PPQ/X_39P.wav, 1.40 s'),
    'sons/tiro/pistola-2.ogg;CC0;Ben Jaszczak, Brian Nelson, Kevin Heras, Matthew Nanney;https://opengameart.org/content/the-free-firearm-sound-library (Walther PPQ/X_39P.wav, 1.40 s)');
  assert.equal(linhaDeLicenca('golpe.soco', 1, 'impactSoft_medium_000.ogg'), 'sons/golpe/soco-1.ogg;CC0;Kenney;https://kenney.nl/assets/impact-sounds (impactSoft_medium_000.ogg)');
  assert.equal(linhaDeLicenca('corpo.flatline', 1, ''), 'sons/corpo/flatline-1.ogg;nosso;Cyberpunk-Fieldbook;Gerado pelo build/sons.mjs (o ffmpeg)');
  assert.equal(PICO, -1.5);
  assert.equal(VARIACOES, 4);
  // O que uma tomada alcança: o alvo, ou o pico com o limite do limitador do grupo (o tiro: 9 dB).
  assert.equal(alcance('tiro', { m: -20, pico: -10 }), -12);
  assert.equal(alcance('tiro', { m: -30, pico: -10 }), -30 - 1.5 + 10 + 9);
  assert.equal(alcance('tiro', { m: -30, pico: -2 }), -30 - 1.5 + 2 + 9);
  assert.equal(alcance('recarga', { m: -35, pico: -5 }), -35 - 1.5 + 5 + 3);
  assert.equal(alcance('recarga', { m: -30, pico: -5 }), -24);
  assert.equal(alcanceDoSom('tiro', [{ m: -30, pico: -2 }, { m: -20, pico: -10 }, { m: -25, pico: -1 }]), -16.5);
  assert.equal(alcanceDoSom('tiro', [{ m: -30, pico: -2 }, { m: -20, pico: -10 }]), -20.5);
  // O grupo que não chega ao alvo puxa todos o mesmo tanto; o grupo inteiro fica no mesmo nível.
  assert.deepEqual(niveisDosGrupos({ tiro: [-12, -17.5, -14], explosao: [-10], recarga: [-24, -26] }), { tiro: -17.5, explosao: -15.5, recarga: -29.5 });
  assert.deepEqual(niveisDosGrupos({ tiro: [-12], golpe: [-16] }), { tiro: -12, golpe: -16 });
  assert.deepEqual(niveisDosGrupos({ golpe: [-15] }), { golpe: -16 });
});

test('C103: o banco.json do sistema tem os sons da receita, de 1 a 4 variações cada, com os nomes do build, e passa na conferência', () => {
  assert.deepEqual(conferirBanco(banco, { sistema: true }), []);
  assert.deepEqual(Object.keys(banco.sons), Object.keys(RECEITA));
  for (const [chave, lista] of Object.entries(banco.sons)) {
    assert.ok(lista.length >= 1 && lista.length <= VARIACOES, `${chave}: ${lista.length} variações`);
    assert.deepEqual(lista, lista.map((_, i) => `${PASTA}${arquivoDaVariacao(chave, i + 1)}`));
  }
  // As tomadas de cada som que o usuário ouviu: a biblioteca de armas tem de 2 a 4 em cada arquivo.
  assert.equal(banco.sons['tiro.pistola'].length, 3);
  assert.equal(banco.sons['tiro.tech'].length, 4);
  assert.equal(banco.sons['corpo.flatline'].length, 1);
  assert.equal(banco.sons['corpo.batimento'].length, 2);
  assert.equal(banco.sons['explosao.frag'].length, 3);
  assert.equal(Object.values(banco.sons).flat().length, 105);
});

test('C103: cada arquivo do banco está na pasta e tem a linha dele no LICENCAS.csv, com a licença, o autor e o link da fonte da receita; nenhum .ogg sobra', () => {
  const citados = Object.entries(banco.sons).flatMap(([chave, lista]) => lista.map(src => [chave, src.slice(PASTA.length)]));
  const naPasta = oggs().map(f => path.relative(efeitos, f).replace(/\\/g, '/')).sort();
  assert.deepEqual(naPasta, citados.map(([, a]) => a).sort());
  const porArquivo = new Map(licencas.map(linha => [linha.arquivo, linha]));
  for (const [chave, arquivo] of citados) {
    const linha = porArquivo.get(arquivo);
    const fonte = FONTES[RECEITA[chave].origem];
    assert.ok(linha, `${arquivo} sem a linha`);
    assert.equal(linha.licenca, fonte.licenca, arquivo);
    assert.equal(linha.autor, fonte.autor, arquivo);
    assert.ok(linha.fonte.startsWith(fonte.link || fonte.fonte), `${arquivo}: a fonte ${linha.fonte}`);
  }
  assert.equal(licencas.filter(linha => linha.arquivo.endsWith('.ogg')).length, citados.length);
});

// O cabeçalho de um Ogg Opus (RFC 7845): a primeira página com o OpusHead (os canais e a taxa de entrada), a segunda com o
// OpusTags (os comentários, que só dizem o codificador: nada do nome nem do caminho da fonte).
function cabecalhoOpus(buffer) {
  const pagina = inicio => {
    assert.equal(buffer.toString('latin1', inicio, inicio + 4), 'OggS');
    const segmentos = buffer[inicio + 26];
    const tamanho = [...buffer.subarray(inicio + 27, inicio + 27 + segmentos)].reduce((a, b) => a + b, 0);
    return { dados: inicio + 27 + segmentos, fim: inicio + 27 + segmentos + tamanho };
  };
  const comentarios = inicio => {
    const lista = [];
    let i = inicio + 4;
    for (let n = buffer.readUInt32LE(inicio); n > 0; n--) { const t = buffer.readUInt32LE(i); lista.push(buffer.toString('utf8', i + 4, i + 4 + t)); i += 4 + t; }
    return lista;
  };
  const p1 = pagina(0), p2 = pagina(p1.fim);
  const vendor = buffer.readUInt32LE(p2.dados + 8);
  return {
    head: buffer.toString('latin1', p1.dados, p1.dados + 8), canais: buffer[p1.dados + 9], taxa: buffer.readUInt32LE(p1.dados + 12),
    tags: buffer.toString('latin1', p2.dados, p2.dados + 8), comentarios: comentarios(p2.dados + 12 + vendor)
  };
}

test('C103: cada arquivo é Ogg Opus mono de 48 kHz, sem os metadados da fonte, pequeno, e a pasta dos efeitos fica bem abaixo do teto de 10 MB', () => {
  let total = 0;
  for (const arquivo of oggs()) {
    const buffer = fs.readFileSync(arquivo);
    const nome = path.relative(efeitos, arquivo);
    assert.deepEqual(cabecalhoOpus(buffer), { head: 'OpusHead', canais: 1, taxa: 48000, tags: 'OpusTags', comentarios: ['encoder=Lavc libopus'] }, nome);
    assert.ok(buffer.length > 1000 && buffer.length < 64 * 1024, `${nome}: ${buffer.length} bytes`);
    total += buffer.length;
  }
  assert.ok(total > 300 * 1024 && total < 2 * 1024 * 1024, `os sons: ${total} bytes`);
  const pasta = dir => fs.readdirSync(dir, { withFileTypes: true }).reduce((s, i) => s + (i.isDirectory() ? pasta(path.join(dir, i.name)) : fs.statSync(path.join(dir, i.name)).size), 0);
  assert.ok(pasta(efeitos) < 10 * 1024 * 1024);
});

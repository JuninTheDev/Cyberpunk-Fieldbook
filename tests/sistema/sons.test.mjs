// O som dos efeitos na mesa (o C81): a conta pura do regras-sons.mjs (a categoria, o banco, a variação pela semente, o
// pitch, o volume pela distância, o motivo de não tocar e as vozes) e o lexical do motor (sons.mjs), do diretor e das
// configurações. Sem o Foundry: o G4 confere o som tocado de verdade (tests/cenarios/v14.js, o passo do C81).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  BANCO_VAZIO, CATEGORIAS, CATEGORIA_PADRAO, PAN_MAXIMO, PASTA_DO_BANCO, REPETIDO_MS, SEM_OUVINTE, SONS_NA_MESA, TETO_DE_VOZES, VOLUME_PADRAO,
  abrirVoz, arquivosDoSom, atenuacao, categoriaDoSom, chavesDeSom, conferirBanco, escolherVariacao, motivoParaNaoTocar, ouvirDe, pitchDoSom,
  repetido, sementeDoPasso, sorteador, variacaoDoVolume, volumeDoSom
} from '../../foundry-sistema/scripts/regras-sons.mjs';
import { CATALOGO, PROPRIO } from '../../foundry-sistema/scripts/catalogo-efeitos.mjs';
import { chavesDosPerfis } from '../../foundry-sistema/scripts/regras-coreografia.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const sistema = path.join(raiz, 'foundry-sistema');
const leia = arquivo => fs.readFileSync(path.join(sistema, arquivo), 'utf8');
const perto = (a, b, folga = 1e-9) => Math.abs(a - b) <= folga;
const SONS = `${PASTA_DO_BANCO}tiro`;
const banco = { versao: 1, sons: { 'tiro.pistola': [`${SONS}/pistola-1.ogg`, `${SONS}/pistola-2.ogg`, `${SONS}/pistola-3.ogg`], 'impacto.carne': [`${SONS}/carne-1.ogg`] } };

test('C81: a categoria de cada som (o volume, o pitch, o raio, as vozes, a prioridade e o contexto), com o crítico e a morte para todos', () => {
  assert.deepEqual(categoriaDoSom('tiro.pistola'), { volume: 0.55, pitch: 0.03, raio: 150, vozes: 8, prioridade: 3, contexto: 'environment' });
  assert.equal(categoriaDoSom('rajada.fuzil').raio, 150);
  assert.deepEqual(categoriaDoSom('explosao.frag'), { volume: 0.8, pitch: 0.02, raio: 300, vozes: 2, prioridade: 5, contexto: 'environment' });
  assert.deepEqual(categoriaDoSom('recarga.pistola'), { volume: 0.25, pitch: 0.1, raio: 15, vozes: 2, prioridade: 1, contexto: 'environment' });
  // O crítico: o volume e o pitch do impacto, sem o raio, na interface, com a prioridade do crítico.
  assert.deepEqual(categoriaDoSom('impacto.critico'), { volume: 0.45, pitch: 0.07, raio: null, vozes: 4, prioridade: 4, contexto: 'interface' });
  assert.equal(categoriaDoSom('impacto.carne').raio, 40);
  assert.deepEqual(categoriaDoSom('corpo.flatline'), { volume: 0.4, pitch: 0, raio: null, vozes: 2, prioridade: 4, contexto: 'interface' });
  assert.equal(categoriaDoSom('nada.disso'), CATEGORIA_PADRAO);
  assert.equal(categoriaDoSom(undefined), CATEGORIA_PADRAO);
  // Toda chave de som que os perfis das armas pedem tem uma categoria, e a explosão é a mais alta.
  for (const chave of chavesDosPerfis()) assert.ok(Object.hasOwn(CATEGORIAS, chave.split('.')[0]), chave);
  assert.equal(Math.max(...Object.values(CATEGORIAS).map(c => c.volume)), CATEGORIAS.explosao.volume);
  assert.equal(VOLUME_PADRAO, 0.7);
  assert.deepEqual(SONS_NA_MESA, ['posicional', 'todos', 'nao']);
  assert.deepEqual(TETO_DE_VOZES, { pc: 16, celular: 10 });
  assert.ok(chavesDeSom().includes('tiro.pistola') && chavesDeSom().includes('corpo.flatline') && !chavesDeSom().includes('tracante.amarelo'));
});

test('C81: a conferência do banco recusa a chave fora do catálogo, o arquivo que não é áudio ou de fora, o repetido e, no do sistema, o fora da pasta', () => {
  assert.deepEqual(conferirBanco(banco, { sistema: true }), []);
  assert.deepEqual(conferirBanco(BANCO_VAZIO, { sistema: true }), []);
  assert.deepEqual(conferirBanco({ versao: 2, sons: {} }), ['o banco tem de ser { versao: 1, sons: {} }']);
  assert.deepEqual(conferirBanco(null), ['o banco tem de ser { versao: 1, sons: {} }']);
  assert.deepEqual(conferirBanco({ versao: 1, sons: [] }), ['o banco tem de ser { versao: 1, sons: {} }']);
  assert.deepEqual(conferirBanco({ versao: 1, sons: { 'tiro.malorian': [`${SONS}/m.ogg`] } }), ['tiro.malorian: a chave não está no catálogo']);
  assert.deepEqual(conferirBanco({ versao: 1, sons: { 'tiro.pistola': [] } }), ['tiro.pistola: sem arquivos']);
  assert.deepEqual(conferirBanco({ versao: 1, sons: { 'tiro.pistola': [`${SONS}/a.ogg`, `${SONS}/a.ogg`] } }), ['tiro.pistola: um arquivo repetido']);
  for (const ruim of ['https://exemplo.com/tiro.ogg', `${SONS}/../../x.ogg`, `${SONS}/tiro.webm`, `${SONS}/tiro.png`, 'tiro.ogg']) {
    assert.deepEqual(conferirBanco({ versao: 1, sons: { 'tiro.pistola': [ruim] } }), [`tiro.pistola: o arquivo ${ruim} não é um áudio com o caminho permitido`], ruim);
  }
  // O de um mundo vale no navegador (o G4, as macros), mas não no banco do sistema, que vai no git.
  assert.deepEqual(conferirBanco({ versao: 1, sons: { 'tiro.pistola': ['worlds/mesa/sons/t.ogg'] } }), []);
  assert.deepEqual(conferirBanco({ versao: 1, sons: { 'tiro.pistola': ['worlds/mesa/sons/t.ogg'] } }, { sistema: true }), [`tiro.pistola: o arquivo worlds/mesa/sons/t.ogg fora de ${PASTA_DO_BANCO}`]);
});

test('C81: os arquivos de um som: o áudio que vem antes do "proprio:" (o do mestre), senão o banco; o vídeo do JB2A não é som; a chave sem nada não toca', () => {
  assert.deepEqual(arquivosDoSom('tiro.pistola', banco), banco.sons['tiro.pistola']);
  // O impacto em carne tem o .webm do JB2A antes do "proprio:": é a animação, não o som.
  assert.ok(CATALOGO['impacto.carne'][0].endsWith('.webm') && CATALOGO['impacto.carne'].at(-1) === `${PROPRIO}impacto.carne`);
  assert.deepEqual(arquivosDoSom('impacto.carne', banco), banco.sons['impacto.carne']);
  assert.deepEqual(arquivosDoSom('tiro.pistola', banco, { 'tiro.pistola': ['worlds/mesa/sons/meu.ogg', 'https://fora.com/x.ogg'] }), ['worlds/mesa/sons/meu.ogg']);
  assert.deepEqual(arquivosDoSom('tiro.fuzil', banco), []);
  assert.deepEqual(arquivosDoSom('tiro.malorian', banco), []);
  assert.deepEqual(arquivosDoSom('tiro.pistola', { versao: 1, sons: { 'tiro.pistola': ['https://fora.com/x.ogg', `${SONS}/ok.ogg`] } }), [`${SONS}/ok.ogg`]);
  assert.deepEqual(arquivosDoSom('tiro.pistola'), []);
});

test('C81: a variação pela semente (a mesma em todos os navegadores), sem repetir a última; o pitch e o volume de cada toque', () => {
  const a = sorteador('ev1:desfecho:tiro.pistola:0'), b = sorteador('ev1:desfecho:tiro.pistola:0'), c = sorteador('ev2:desfecho:tiro.pistola:0');
  const sa = [a(), a(), a()], sb = [b(), b(), b()], sc = [c(), c(), c()];
  assert.deepEqual(sa, sb);
  assert.notDeepEqual(sa, sc);
  for (const x of [...sa, ...sc]) assert.ok(x >= 0 && x < 1, String(x));
  assert.equal(sementeDoPasso({ id: 'ev1', fase: 'desfecho' }, { chave: 'tiro.pistola', t: 0 }), 'ev1:desfecho:tiro.pistola:0');
  assert.notEqual(sementeDoPasso({ id: 'ev1', fase: 'desfecho' }, { chave: 'tiro.pistola', t: 60 }), sementeDoPasso({ id: 'ev1', fase: 'desfecho' }, { chave: 'tiro.pistola', t: 0 }));
  // A variação: o sorteio escolhe; a última deste navegador nunca se repete (com mais de uma).
  assert.equal(escolherVariacao(3, 0), 0);
  assert.equal(escolherVariacao(3, 0.5), 1);
  assert.equal(escolherVariacao(3, 0.999), 2);
  assert.equal(escolherVariacao(3, 0.5, 1), 2);
  assert.equal(escolherVariacao(3, 0.999, 2), 0);
  assert.equal(escolherVariacao(1, 0.7, 0), 0);
  assert.equal(escolherVariacao(0, 0.7), -1);
  const vistas = new Set(Array.from({ length: 200 }, (_, i) => escolherVariacao(5, sorteador(`s${i}`)())));
  assert.deepEqual([...vistas].sort(), [0, 1, 2, 3, 4]);
  // O pitch: ±3% no tiro, 0 no corpo (a interface é previsível); o volume: ±1,5 dB.
  assert.ok(perto(pitchDoSom(categoriaDoSom('tiro.pistola'), 0), 0.97) && perto(pitchDoSom(categoriaDoSom('tiro.pistola'), 1), 1.03));
  assert.equal(pitchDoSom(categoriaDoSom('tiro.pistola'), 0.5), 1);
  assert.equal(pitchDoSom(categoriaDoSom('corpo.flatline'), 0.9), 1);
  assert.ok(perto(variacaoDoVolume(0), 10 ** (-1.5 / 20)) && perto(variacaoDoVolume(1), 10 ** (1.5 / 20)) && variacaoDoVolume(0.5) === 1);
});

test('C81: o volume pela distância (o cosseno do Foundry, o maior entre os ouvintes, sem passar do volume da camada) e o pan, no máximo 0,6', () => {
  assert.equal(atenuacao(0, 100), 1);
  assert.ok(perto(atenuacao(50, 100), 0.5));
  // A curva é o cosseno do Foundry, não a reta: a um quarto do raio, 0,854 (a reta daria 0,75); a três quartos, 0,146.
  assert.ok(perto(atenuacao(25, 100), (Math.cos(Math.PI / 4) + 1) / 2) && perto(atenuacao(25, 100), 0.8535533905932737));
  assert.ok(perto(atenuacao(75, 100), 0.14644660940672627));
  assert.ok(perto(atenuacao(100, 100), 0));
  assert.equal(atenuacao(101, 100), 0);
  assert.equal(atenuacao(10, 0), 0);
  assert.equal(atenuacao(Number.NaN, 100), 0);
  // Dois ouvintes: vale o mais perto, com o pan dele (o som à direita: positivo; à esquerda: negativo).
  const origem = { x: 1000, y: 500 };
  const r = ouvirDe(origem, [{ x: 0, y: 500 }, { x: 900, y: 500 }], 1000);
  assert.ok(perto(r.volume, atenuacao(100, 1000)) && perto(r.pan, 0.1), JSON.stringify(r));
  assert.equal(ouvirDe(origem, [{ x: 1900, y: 500 }], 1000).pan, -PAN_MAXIMO);
  assert.equal(ouvirDe(origem, [{ x: 100, y: 500 }], 1000).pan, PAN_MAXIMO);
  assert.deepEqual(ouvirDe(origem, [{ x: 'a', y: 1 }], 1000), { volume: 0, pan: 0 });
  // O volume do som: a camada × a variação × a distância. O tiro (150 m; 50 px por metro: 7500 px).
  const metro = 50;
  const perto1 = volumeDoSom({ chave: 'tiro.pistola', origem, ouvintes: [{ x: 1000, y: 500 }], metro });
  assert.deepEqual(perto1, { volume: 0.55, pan: 0, posicional: true });
  const meio = volumeDoSom({ chave: 'tiro.pistola', origem, ouvintes: [{ x: 1000 + 3750, y: 500 }], metro });
  assert.ok(perto(meio.volume, 0.55 * 0.5) && meio.posicional && meio.pan === -0.5, JSON.stringify(meio));
  assert.equal(volumeDoSom({ chave: 'recarga.pistola', origem, ouvintes: [{ x: 1000 + 800, y: 500 }], metro }).volume, 0);
  // Sem ouvinte: pela metade, sem a posição; "Para todos": sem a distância; o crítico e a morte: sempre sem a distância.
  assert.deepEqual(volumeDoSom({ chave: 'tiro.pistola', origem, ouvintes: [], metro }), { volume: 0.55 * SEM_OUVINTE, pan: 0, posicional: false, semOuvinte: true });
  assert.deepEqual(volumeDoSom({ chave: 'tiro.pistola', origem, ouvintes: [{ x: 9e9, y: 0 }], metro, sonsNaMesa: 'todos' }), { volume: 0.55, pan: 0, posicional: false });
  assert.deepEqual(volumeDoSom({ chave: 'corpo.flatline', origem, ouvintes: [{ x: 9e9, y: 0 }], metro }), { volume: 0.4, pan: 0, posicional: false });
  assert.deepEqual(volumeDoSom({ chave: 'tiro.pistola', origem: null, ouvintes: [{ x: 0, y: 0 }], metro }), { volume: 0.55, pan: 0, posicional: false });
  // A variação de volume entra por cima (o sorteio 1: +1,5 dB).
  assert.ok(perto(volumeDoSom({ chave: 'tiro.pistola', origem, ouvintes: [{ x: 1000, y: 500 }], metro, sorteio: 1 }).volume, 0.55 * 10 ** (1.5 / 20)));
});

test('C81: o som não toca com a mesa sem som, o volume no zero, o áudio travado (antes do primeiro clique), sem arquivo ou longe demais, nessa ordem', () => {
  const ok = { sonsNaMesa: 'posicional', volumeAqui: 0.7, travado: false, arquivos: ['a.ogg'], volume: 0.5 };
  assert.equal(motivoParaNaoTocar(ok), null);
  assert.equal(motivoParaNaoTocar({ ...ok, sonsNaMesa: 'todos' }), null);
  assert.equal(motivoParaNaoTocar({ ...ok, sonsNaMesa: 'nao', volumeAqui: 0, travado: true }), 'desligado');
  assert.equal(motivoParaNaoTocar({ ...ok, sonsNaMesa: 'outro' }), 'desligado');
  assert.equal(motivoParaNaoTocar({ ...ok, volumeAqui: 0, travado: true }), 'mudo');
  assert.equal(motivoParaNaoTocar({ ...ok, volumeAqui: Number.NaN }), 'mudo');
  assert.equal(motivoParaNaoTocar({ ...ok, travado: true, arquivos: [] }), 'travado');
  assert.equal(motivoParaNaoTocar({ ...ok, arquivos: [], volume: 0 }), 'semArquivo');
  assert.equal(motivoParaNaoTocar({ ...ok, volume: 0 }), 'longe');
  assert.equal(motivoParaNaoTocar(), 'semArquivo');
});

test('C81: as vozes: a categoria cheia corta a mais velha dela; o teto cheio corta a mais velha de menor prioridade, ou a nova não entra; o repetido em 40 ms', () => {
  const voz = (id, categoria, prioridade, inicio) => ({ id, categoria, prioridade, inicio });
  assert.deepEqual(abrirVoz([], { categoria: 'tiro', prioridade: 3 }), { entra: true, cortar: [] });
  // A recarga tem 2 vozes: a terceira corta a mais velha das recargas.
  assert.deepEqual(abrirVoz([voz(1, 'recarga', 1, 10), voz(2, 'recarga', 1, 5), voz(3, 'tiro', 3, 1)], { categoria: 'recarga', prioridade: 1 }), { entra: true, cortar: [2] });
  // O teto de 4: sai a mais velha de menor prioridade (a recarga 7, de 1), não o tiro mais velho.
  const cheio = [voz(5, 'tiro', 3, 1), voz(6, 'impacto', 2, 2), voz(7, 'recarga', 1, 3), voz(8, 'recarga', 1, 4)];
  assert.deepEqual(abrirVoz(cheio, { categoria: 'tiro', prioridade: 3 }, 4), { entra: true, cortar: [7] });
  // Todas de prioridade maior que a nova: a nova não entra, e ninguém sai.
  const fortes = [voz(1, 'explosao', 5, 1), voz(2, 'explosao', 5, 2), voz(3, 'tiro', 3, 3), voz(4, 'tiro', 3, 4)];
  assert.deepEqual(abrirVoz(fortes, { categoria: 'recarga', prioridade: 1 }, 4), { entra: false, cortar: [] });
  // A categoria cheia e o teto cheio: sai a mais velha da categoria, e o teto já cabe.
  assert.deepEqual(abrirVoz([voz(1, 'explosao', 5, 1), voz(2, 'explosao', 5, 2)], { categoria: 'explosao', prioridade: 5 }, 2), { entra: true, cortar: [1] });
  const ultimos = new Map([['a.ogg', 1000]]);
  assert.equal(repetido(ultimos, 'a.ogg', 1000 + REPETIDO_MS - 1), true);
  assert.equal(repetido(ultimos, 'a.ogg', 1000 + REPETIDO_MS), false);
  assert.equal(repetido(ultimos, 'b.ogg', 1000), false);
});

test('C81: o banco do sistema (efeitos/sons/banco.json) passa na conferência, só com arquivos da pasta, e cada um tem a linha dele no LICENCAS.csv', () => {
  const doSistema = JSON.parse(leia('efeitos/sons/banco.json'));
  assert.deepEqual(conferirBanco(doSistema, { sistema: true }), []);
  const licencas = leia('efeitos/LICENCAS.csv').replace(/\r/g, '').split('\n').slice(1).map(linha => linha.split(';')[0]);
  assert.ok(licencas.includes('sons/banco.json'));
  for (const src of Object.values(doSistema.sons).flat()) {
    const arquivo = src.slice('systems/cpr-fieldbook/efeitos/'.length);
    assert.ok(fs.existsSync(path.join(sistema, 'efeitos', arquivo)), `${arquivo} não está na pasta`);
    assert.ok(licencas.includes(arquivo), `${arquivo} sem a linha no LICENCAS.csv`);
  }
});

test('C81: lexical: o motor manda o som ao barramento, sem o playAtPosition nem o AudioHelper.play, descarta o travado, põe o pitch e para tudo na troca de cena; o diretor toca o passo som; as configurações', () => {
  const sons = leia('scripts/sons.mjs');
  assert.match(sons, /som\.destination = destino\.entrada;/);
  assert.match(sons, /limitador\.connect\(contexto\.gainNode \?\? contexto\.destination\);/);
  assert.match(sons, /entrada\.gain\.value = volumeAqui\(\);/);
  assert.match(sons, /travado: travadoAqui\(cat\.contexto\), arquivos, volume/);
  assert.match(sons, /if \(game\.audio\?\.locked \|\| !contexto \|\| contexto\.state === 'closed'\) return true;\r?\n  if \(contexto\.state === 'running'\) return false;\r?\n  const ativado = globalThis\.navigator\?\.userActivation\?\.hasBeenActive \?\? true;\r?\n  if \(!ativado\) return true;\r?\n  contexto\.resume\(\)\.catch\(falhou\);/);
  assert.match(sons, /if \(!contexto \|\| game\.audio\.locked\) return null;/);
  assert.match(sons, /if \(this\.sourceNode\?\.playbackRate\) this\.sourceNode\.playbackRate\.value = this\.taxa;/);
  assert.match(sons, /som\.taxa = taxa;/);
  assert.match(sons, /Hooks\.on\('canvasTearDown', pararTudo\);/);
  assert.match(sons, /game\.audio\?\.unlock\?\.then\(preCarregar\)/);
  assert.match(sons, /if \(usarBanco\(banco\)\.length\) estado\.falhas\+\+;/);
  assert.match(sons, /const erros = R\.conferirBanco\(banco\);/);
  assert.doesNotMatch(sons, /\.playAtPosition\(|AudioHelper\.play\(|game\.socket|\.update\(|setFlag/);
  const diretor = leia('scripts/coreografia.mjs');
  assert.match(diretor, /som: \(evento, passo\) => tocarSom\(evento, passo\)/);
  assert.match(diretor, /registrarPalco\(\);\r?\n  registrarSons\(\);/);
  assert.match(diretor, /palco: PALCO, sons: SONS,/);
  const configuracoes = leia('scripts/configuracoes.mjs');
  assert.match(configuracoes, /registrar\('efeitosSons', \{[\s\S]*?type: String, default: 'posicional', choices: \{ posicional: 'Pela distância', todos: 'Para todos, sem a distância', nao: 'Nenhum' \}/);
  assert.match(configuracoes, /registrar\('efeitosVolume', \{[\s\S]*?scope: 'client', type: Number, default: VOLUME_PADRAO, range: \{ min: 0, max: 1, step: 0\.05 \}, onChange: valor => aplicarVolume\(valor\)/);
});

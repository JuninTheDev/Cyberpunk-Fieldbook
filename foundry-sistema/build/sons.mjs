// O build do banco de sons do sistema (o C103): da receita (sons-receita.mjs) aos arquivos de efeitos/sons/, ao
// efeitos/sons/banco.json e às linhas dos sons no efeitos/LICENCAS.csv. Roda no PC, com o ffmpeg; o servidor só recebe os
// arquivos prontos pelo git.
//
// Uso: node build/sons.mjs [--medir]
//   SONS_FONTES: a pasta dos pacotes baixados (padrão: foundry-sistema/.cache/sons-fontes), com ffsl/ e kenney-*/;
//   FFMPEG: o ffmpeg (padrão: o do PATH). O ffprobe não é preciso.
//   --medir: só mede e mostra o nível de cada grupo, sem escrever nada.
//
// Cada tomada: em mono a 48 kHz, o tom, o passa-alta de 40 Hz, o silêncio cortado no começo e no fim, a duração máxima do
// grupo, os fades de 4 ms e 60 ms; o ganho até o nível do grupo, com o limitador no pico de verdade; o Ogg Opus mono a
// 64 kbps (o quadro de 10 ms no tiro e na rajada, para o ataque ficar preciso), sem metadados.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FONTES, ALVO, PICO, RECEITA, VARIACOES, arquivoDaVariacao, linhaDeLicenca, niveisDosGrupos, alcanceDoSom } from './sons-receita.mjs';

const sistema = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FONTES_DIR = process.env.SONS_FONTES || path.join(sistema, '.cache', 'sons-fontes');
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const EFEITOS = path.join(sistema, 'efeitos');
const TEMP = path.join(sistema, '.cache', 'sons-temp');
const PASTA_DO_BANCO = 'systems/cpr-fieldbook/efeitos/';
const medirSo = process.argv.includes('--medir');

const ff = args => {
  const r = spawnSync(FFMPEG, ['-hide_banner', '-nostats', ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.error) throw new Error(`o ffmpeg não rodou (${FFMPEG}): ${r.error.message}`);
  if (r.status !== 0) throw new Error(`ffmpeg ${args.join(' ')}\n${r.stderr.slice(-1500)}`);
  return r.stderr;
};

// A medida: o maior LUFS-M e o pico de verdade (o apad deixa o som curto chegar à janela de 400 ms).
function medir(arquivo) {
  const log = ff(['-i', arquivo, '-af', 'apad=pad_dur=0.5,ebur128=peak=true', '-f', 'null', '-']);
  const m = [...log.matchAll(/ M:\s*(-?[0-9.]+|-inf)/g)].map(x => Number(x[1])).filter(Number.isFinite);
  const tp = log.match(/True peak:\s*\n\s*Peak:\s*(-?[0-9.]+|-inf)/);
  return { m: m.length ? Math.max(...m) : -70, pico: tp ? Number(tp[1]) : 0 };
}

// As tomadas de um arquivo da biblioteca de armas: o que fica entre os silêncios (a -40 dB), com a cauda até o teto.
function tomadasFfsl(rel, teto) {
  const arquivo = path.join(FONTES_DIR, FONTES.ffsl.pasta, rel);
  const log = ff(['-i', arquivo, '-af', 'silencedetect=noise=-40dB:d=0.4', '-f', 'null', '-']);
  const duracao = Number(log.match(/Duration: (\d+):(\d+):([0-9.]+)/).slice(1).reduce((t, x) => t * 60 + Number(x), 0));
  const marcas = [...log.matchAll(/silence_(start|end): ([0-9.]+)/g)].map(m => [m[1], Number(m[2])]);
  const trechos = [];
  let abre = marcas[0]?.[0] === 'start' && marcas[0][1] > 0 ? 0 : null;
  for (const [tipo, t] of marcas) {
    if (tipo === 'end') abre = t;
    else if (abre !== null) { if (t - abre > 0.05) trechos.push([abre, t]); abre = null; }
  }
  if (abre !== null && duracao - abre > 0.05) trechos.push([abre, duracao]);
  return trechos.slice(0, VARIACOES).map(([inicio], i) => {
    const comeco = Math.max(0, inicio - 0.01);
    const seguinte = trechos[i + 1]?.[0] ?? duracao;
    return { arquivo, origem: `${rel}, ${comeco.toFixed(2)} s`, inicio: comeco, duracao: Math.min(teto, seguinte - 0.05 - comeco) };
  });
}

// Os arquivos de uma família da Kenney (impactPunch_heavy_000.ogg, knifeSlice2.ogg, ...).
function tomadasKenney(origem, familias) {
  const pasta = path.join(FONTES_DIR, FONTES[origem].pasta);
  const nomes = fs.readdirSync(pasta).sort();
  return familias.flatMap(familia => nomes.filter(n => new RegExp(`^${familia}(_?\\d+)?\\.ogg$`).test(n)))
    .slice(0, VARIACOES).map(n => ({ arquivo: path.join(pasta, n), origem: n }));
}

// O preparo de um som: cada tomada cortada, em mono, num WAV temporário, com a medida.
function preparar(chave) {
  const r = RECEITA[chave];
  const { teto } = ALVO[chave.split('.')[0]];
  const tomadas = r.origem === 'ffsl' ? tomadasFfsl(r.rel, teto)
    : r.origem === 'gerado' ? r.expressoes.map(expr => ({ expr, origem: '' }))
      : tomadasKenney(r.origem, r.familias);
  const tom = r.tom !== 1 ? `asetrate=48000*${r.tom},aresample=48000,` : '';
  const prontas = tomadas.map((t, i) => {
    const bruto = path.join(TEMP, `${chave}-${i + 1}.wav`);
    const entrada = t.expr ? ['-f', 'lavfi', '-i', t.expr] : ['-ss', String(t.inicio ?? 0), ...(t.duracao ? ['-t', String(t.duracao)] : []), '-i', t.arquivo];
    // O som gerado não tem silêncio nas pontas (e o silenceremove o apagaria inteiro).
    const corte = t.expr ? '' : 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-60dB,areverse,';
    ff(['-y', ...entrada, '-af', `aformat=sample_rates=48000,aformat=channel_layouts=mono,${tom}highpass=f=40,${corte}atrim=end=${teto},afade=t=in:d=0.004,areverse,afade=t=in:d=0.06,areverse`, '-ar', '48000', '-c:a', 'pcm_f32le', bruto]);
    return { ...t, bruto, ...medir(bruto) };
  // A tomada vazia ou quase muda (um estalo solto entre os silêncios da gravação) fica de fora.
  }).filter(t => Number.isFinite(t.pico) && t.m > -50);
  if (!prontas.length) throw new Error(`${chave}: nenhuma tomada com som`);
  return prontas;
}

// O ganho até o nível: o limitador come parte dele, então até três rodadas medindo depois dele (no máximo 10 dB a mais
// que a primeira conta).
function codificar(chave, t, n, nivel) {
  const destino = path.join(EFEITOS, arquivoDaVariacao(chave, n));
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  // O limitador meio dB abaixo do pico: o Opus passa um pouco do pico de verdade da entrada.
  const limite = 10 ** ((PICO - 0.5) / 20);
  const filtro = g => `volume=${g.toFixed(2)}dB,alimiter=limit=${limite.toFixed(3)}:attack=1:release=60:level=false`;
  const provar = path.join(TEMP, 'provar.wav');
  let ganho = nivel - t.m;
  for (let rodada = 0; rodada < 3; rodada++) {
    ff(['-y', '-i', t.bruto, '-af', filtro(ganho), '-c:a', 'pcm_f32le', provar]);
    const falta = nivel - medir(provar).m;
    if (Math.abs(falta) < 0.3) break;
    ganho = Math.min(nivel - t.m + 10, ganho + falta);
  }
  const quadro = /^(tiro|rajada)\./.test(chave) ? ['-frame_duration', '10'] : [];
  ff(['-y', '-i', t.bruto, '-af', filtro(ganho), '-map_metadata', '-1', '-fflags', '+bitexact', '-c:a', 'libopus', '-b:a', '64k', '-application', 'audio', ...quadro, '-ac', '1', destino]);
  return { ...medir(destino), bytes: fs.statSync(destino).size };
}

fs.mkdirSync(TEMP, { recursive: true });
const preparados = Object.fromEntries(Object.keys(RECEITA).map(chave => [chave, preparar(chave)]));
const grupos = [...new Set(Object.keys(RECEITA).map(chave => chave.split('.')[0]))];
const nivel = niveisDosGrupos(Object.fromEntries(grupos.map(g => [g, Object.entries(preparados).filter(([c]) => c.startsWith(`${g}.`)).map(([, ts]) => alcanceDoSom(g, ts))])));
for (const g of grupos) {
  const porSom = Object.entries(preparados).filter(([c]) => c.startsWith(`${g}.`)).map(([c, ts]) => `${c.split('.')[1]} ${alcanceDoSom(g, ts).toFixed(1)}`);
  console.log(`${g}: ${nivel[g].toFixed(1)} LUFS-M (alvo ${ALVO[g].lufs}): ${porSom.join(', ')}`);
}
if (!medirSo) {
  fs.rmSync(path.join(EFEITOS, 'sons'), { recursive: true, force: true });
  const banco = { versao: 1, sons: {} };
  const licencas = [];
  let total = 0;
  for (const [chave, tomadas] of Object.entries(preparados)) {
    banco.sons[chave] = tomadas.map((t, i) => {
      const feito = codificar(chave, t, i + 1, nivel[chave.split('.')[0]]);
      total += feito.bytes;
      licencas.push(linhaDeLicenca(chave, i + 1, t.origem));
      return `${PASTA_DO_BANCO}${arquivoDaVariacao(chave, i + 1)}`;
    });
  }
  fs.writeFileSync(path.join(EFEITOS, 'sons', 'banco.json'), `${JSON.stringify(banco, null, 2)}\n`);
  // O LICENCAS.csv: as linhas que não são de som ficam; as dos sons, de novo, na ordem do banco.
  const csv = path.join(EFEITOS, 'LICENCAS.csv');
  const antes = fs.readFileSync(csv, 'utf8').split('\n').filter(linha => linha.trim());
  const fica = antes.filter(linha => !/^sons\/[^;]+\.ogg;/.test(linha));
  fs.writeFileSync(csv, `${[...fica, ...licencas].join('\n')}\n`);
  console.log(`${Object.keys(banco.sons).length} sons, ${licencas.length} arquivos, ${(total / 1024).toFixed(0)} KB`);
}
fs.rmSync(TEMP, { recursive: true, force: true });

// A receita do banco de sons do sistema (o C103; o anexo efeitos-plano/equipe/fx-audio.md, seções 7.1 e 7.2): de onde
// vem cada som que o usuário escolheu na audição de 2026-11-27, e o alvo de cada grupo. Pura, sem o ffmpeg: o G3 confere
// que o banco.json e o LICENCAS.csv batem com ela (tests/sistema/sons.test.mjs). Quem faz os arquivos é o build/sons.mjs.

// As fontes e as licenças (o LICENCAS.csv leva a linha de cada arquivo). Só CC0 e o que é nosso (a decisão 7 do PLANO).
export const FONTES = Object.freeze({
  ffsl: { fonte: 'The Free Firearm Sound Library (OpenGameArt)', autor: 'Ben Jaszczak, Brian Nelson, Kevin Heras, Matthew Nanney', link: 'https://opengameart.org/content/the-free-firearm-sound-library', licenca: 'CC0', pasta: 'ffsl/x/Prepared SFX Library' },
  'kenney-impact-sounds': { fonte: 'Kenney, Impact Sounds', autor: 'Kenney', link: 'https://kenney.nl/assets/impact-sounds', licenca: 'CC0', pasta: 'kenney-impact-sounds/x/Audio' },
  'kenney-sci-fi-sounds': { fonte: 'Kenney, Sci-fi Sounds', autor: 'Kenney', link: 'https://kenney.nl/assets/sci-fi-sounds', licenca: 'CC0', pasta: 'kenney-sci-fi-sounds/x/Audio' },
  'kenney-interface-sounds': { fonte: 'Kenney, Interface Sounds', autor: 'Kenney', link: 'https://kenney.nl/assets/interface-sounds', licenca: 'CC0', pasta: 'kenney-interface-sounds/x/Audio' },
  'kenney-digital-audio': { fonte: 'Kenney, Digital Audio', autor: 'Kenney', link: 'https://kenney.nl/assets/digital-audio', licenca: 'CC0', pasta: 'kenney-digital-audio/x/Audio' },
  'kenney-rpg-audio': { fonte: 'Kenney, RPG Audio', autor: 'Kenney', link: 'https://kenney.nl/assets/rpg-audio', licenca: 'CC0', pasta: 'kenney-rpg-audio/x/Audio' },
  gerado: { fonte: 'Gerado pelo build/sons.mjs (o ffmpeg)', autor: 'Cyberpunk-Fieldbook', link: '', licenca: 'nosso', pasta: '' }
});

// O alvo de cada grupo (o anexo, 7.2): o pico de loudness momentânea (LUFS-M máx.), a duração máxima de uma variação (s)
// e quanto o limitador pode segurar do pico (dB; o tiro e a explosão têm o pico muito acima do corpo do som).
export const ALVO = Object.freeze({
  tiro: { lufs: -12, teto: 1.4, limite: 9 },
  rajada: { lufs: -12, teto: 3.2, limite: 9 },
  explosao: { lufs: -10, teto: 2.6, limite: 6 },
  golpe: { lufs: -16, teto: 0.9, limite: 6 },
  impacto: { lufs: -16, teto: 1.0, limite: 6 },
  arremesso: { lufs: -16, teto: 0.8, limite: 0 },
  recarga: { lufs: -24, teto: 1.6, limite: 3 },
  glitch: { lufs: -24, teto: 1.0, limite: 0 },
  corpo: { lufs: -24, teto: 1.6, limite: 0 }
});
// O pico de verdade de todo arquivo (dBTP), com a folga do Opus.
export const PICO = -1.5;
// Quantas variações no máximo por som.
export const VARIACOES = 4;

// Os sons gerados (o aevalsrc e o anoisesrc do ffmpeg): cada expressão é uma variação.
const bip = (f, d) => `aevalsrc='0.6*sin(2*PI*${f}*t)*if(lt(t,${d}),1,0)':d=${d + 0.05}:s=48000`;
const coracao = (f, a) => `aevalsrc='${a}*(exp(-t*28)*sin(2*PI*${f}*t)+0.7*exp(-(t-0.2)*28)*sin(2*PI*${f}*(t-0.2))*gte(t,0.2))':d=0.6:s=48000`;
const sopro = (f, d) => `anoisesrc=d=${d}:c=pink:a=0.6:s=48000:seed=${f},bandpass=f=${f}:width_type=h:w=${Math.round(f * 0.8)},afade=t=in:d=${(d * 0.45).toFixed(2)},afade=t=out:st=${(d * 0.45).toFixed(2)}:d=${(d * 0.55).toFixed(2)}`;
const estrondo = (lp, d) => `anoisesrc=d=${d}:c=brown:a=0.9:s=48000:seed=${lp},lowpass=f=${lp},afade=t=out:st=0.05:d=${d - 0.1}:curve=exp`;

// Cada som: o conjunto escolhido na audição (o id dele na página), a origem e o que tirar dela (os arquivos da biblioteca
// de armas, com as tomadas entre os silêncios; as famílias da Kenney; as expressões geradas) e o tom (1 = o original).
const ffsl = (conjunto, nome, rel, tom = 1) => ({ conjunto, nome, origem: 'ffsl', rel, tom });
const kenney = (conjunto, nome, pacote, familias, tom = 1) => ({ conjunto, nome, origem: `kenney-${pacote}`, familias, tom });
const gerado = (conjunto, nome, expressoes) => ({ conjunto, nome, origem: 'gerado', expressoes, tom: 1 });

export const RECEITA = Object.freeze({
  'tiro.pistola-leve': ffsl('ruger-22', 'Ruger Mark III (.22)', 'Ruger Mark III/R_35P.wav'),
  'tiro.pistola': ffsl('walther-9mm', 'Walther PPQ (9 mm)', 'Walther PPQ/X_39P.wav'),
  'tiro.pistola-pesada': ffsl('1911-45-grave', '1911 (.45), mais grave', '1911/A_42P.wav', 0.9),
  'tiro.submetralhadora': ffsl('gustav-9mm', 'Carl Gustav M45 (9 mm)', 'Carl Gustav M45/G_31P.wav'),
  'tiro.fuzil': ffsl('ar15', 'AR-15 (5,56)', 'AR-15/D_32P.wav'),
  'tiro.fuzil-de-precisao': ffsl('springfield-1917', 'Springfield 1917 (.30-06)', '1917/B_24P.wav'),
  'tiro.espingarda': ffsl('nova', 'Benelli Nova (calibre 12)', 'Nova/O_21P.wav'),
  'tiro.arco': kenney('faca-sacada', 'Faca sacada (Kenney RPG)', 'rpg-audio', ['drawKnife']),
  'tiro.lanca-granadas': ffsl('mossberg-grave', 'Mossberg bem mais grave', 'Mossberg/N_30P.wav', 0.6),
  'tiro.lanca-foguetes': kenney('propulsor', 'Propulsor (Kenney Sci-fi)', 'sci-fi-sounds', ['thrusterFire']),
  'tiro.lanca-chamas': kenney('propulsor', 'Propulsor (Kenney Sci-fi)', 'sci-fi-sounds', ['thrusterFire']),
  'tiro.tech': kenney('laser-grande', 'Laser grande (Kenney Sci-fi)', 'sci-fi-sounds', ['laserLarge']),
  'rajada.padrao': ffsl('ppsh-curta', 'PPSh, rajada curta', 'PPSh/P_32P.wav'),
  'rajada.submetralhadora': ffsl('ppsh-longa', 'PPSh, rajada longa', 'PPSh/P_34P.wav'),
  'rajada.fuzil': ffsl('ak47-longa', 'AK-47, rajada longa', 'AK-47/C_27P.wav'),
  'arremesso.lancar': gerado('sopro', 'Sopro (gerado)', [sopro(900, 0.4), sopro(1100, 0.35), sopro(800, 0.45)]),
  'golpe.corte': kenney('faca-sacada', 'Lâmina no ar (Kenney RPG)', 'rpg-audio', ['drawKnife']),
  'golpe.contundente': kenney('placa-pesada', 'Placa pesada (Kenney Impact)', 'impact-sounds', ['impactPlate_heavy']),
  'golpe.soco': kenney('macio-medio', 'Pancada macia (Kenney Impact)', 'impact-sounds', ['impactSoft_medium']),
  'golpe.chute': kenney('macio-pesado', 'Pancada macia pesada (Kenney Impact)', 'impact-sounds', ['impactSoft_heavy']),
  'golpe.garra': kenney('faca-grave', 'Faca cortando, mais grave', 'rpg-audio', ['knifeSlice', 'chop'], 0.8),
  'golpe.chicote': kenney('faca-sacada', 'Lâmina no ar (Kenney RPG)', 'rpg-audio', ['drawKnife']),
  'impacto.carne': kenney('macio-medio', 'Pancada macia (Kenney Impact)', 'impact-sounds', ['impactSoft_medium']),
  'impacto.contundente': kenney('madeira-pesada', 'Madeira pesada (Kenney Impact)', 'impact-sounds', ['impactWood_heavy']),
  'impacto.estrutura': kenney('placa-media', 'Placa (Kenney Impact)', 'impact-sounds', ['impactPlate_medium']),
  'impacto.critico': kenney('erro', 'Erro de interface (Kenney Interface)', 'interface-sounds', ['error']),
  'explosao.frag': gerado('estrondo', 'Estrondo (gerado)', [estrondo(500, 2.2), estrondo(420, 2.4), estrondo(600, 2.0)]),
  'explosao.fogo': gerado('estrondo-longo', 'Estrondo longo (gerado)', [estrondo(300, 2.6), estrondo(350, 2.5)]),
  'explosao.emp': kenney('campo-de-forca', 'Campo de força (Kenney Sci-fi)', 'sci-fi-sounds', ['forceField']),
  'corpo.flatline': gerado('monitor-1000', 'O monitor parado, 1 kHz (gerado)', [bip(1000, 1.5)]),
  'corpo.batimento': gerado('coracao', 'O coração, tum-tum (gerado)', [coracao(55, 0.9), coracao(60, 0.9)]),
  'glitch.padrao': kenney('lixo-espacial', 'Ruído digital (Kenney Digital)', 'digital-audio', ['spaceTrash']),
  'recarga.pistola': kenney('trava-metal', 'Trava e clique de metal (Kenney RPG)', 'rpg-audio', ['metalLatch', 'metalClick']),
  'recarga.fuzil': kenney('trava-metal', 'Trava e clique de metal (Kenney RPG)', 'rpg-audio', ['metalLatch', 'metalClick']),
  'recarga.espingarda': kenney('trava-metal', 'Trava e clique de metal (Kenney RPG)', 'rpg-audio', ['metalLatch', 'metalClick']),
  'recarga.padrao': kenney('clique', 'Clique de metal (Kenney RPG)', 'rpg-audio', ['metalClick', 'metalLatch'])
});
// Os sons de que nenhum candidato serviu na audição: ficam fora do banco (não tocam) até o usuário escolher outro.
export const SEM_SOM = Object.freeze({ 'explosao.leve': 'nenhum candidato serviu na audição de 2026-11-27' });

// O nome do arquivo de uma variação, dentro de efeitos/: sons/<grupo>/<nome>-<n>.ogg ("tiro.pistola-leve" e 1:
// sons/tiro/pistola-leve-1.ogg).
export function arquivoDaVariacao(chave, n) {
  const [grupo, nome] = chave.split('.');
  return `sons/${grupo}/${nome}-${n}.ogg`;
}

// A linha do LICENCAS.csv de uma variação (arquivo;licenca;autor;fonte): a fonte leva o link e de onde saiu a tomada.
export function linhaDeLicenca(chave, n, origem = '') {
  const f = FONTES[RECEITA[chave].origem];
  const fonte = [f.link || f.fonte, origem && `(${origem})`].filter(Boolean).join(' ');
  return [arquivoDaVariacao(chave, n), f.licenca, f.autor, fonte].join(';');
}

// O nível de cada grupo (LUFS-M), pelo que cada som alcança ({ tiro: [-16.5, -12, ...], ... }): todo som de um grupo no
// mesmo nível (a pistola e o laser), e a mistura entre os grupos a do anexo (a explosão 2 dB acima do tiro, a recarga 12
// abaixo). Se um som não chega ao alvo do grupo sem passar do pico, todos os grupos descem o que falta a ele.
export function niveisDosGrupos(alcances) {
  const falta = Math.max(0, ...Object.entries(alcances).map(([grupo, xs]) => ALVO[grupo].lufs - Math.min(...xs)));
  return Object.fromEntries(Object.keys(alcances).map(grupo => [grupo, ALVO[grupo].lufs - falta]));
}
// O que uma tomada alcança: até o alvo do grupo, ou até o pico com o limitador segurando o limite do grupo.
export function alcance(grupo, { m, pico }) {
  return Math.min(ALVO[grupo].lufs, m + PICO - pico + ALVO[grupo].limite);
}
// O que o grupo alcança pelas tomadas de um som: a do meio (a mais alta que mais da metade alcança, sem o limitador
// comer a outra metade).
export function alcanceDoSom(grupo, tomadas) {
  const xs = tomadas.map(t => alcance(grupo, t)).sort((a, b) => a - b);
  return xs[Math.floor((xs.length - 1) / 2)];
}

// O Dice So Nice (o C42; o dice-so-nice-preset.js do CORE 0.92.4, cyberpunk-red-core/modules/hooks/external): com o
// módulo ativo, as cores de dados do CORE entram na lista do DSN, a do jogador como a preferida. Os dois conjuntos de
// faces da Q-Workshop do CORE ficam de fora: a permissão de uso é do projeto do CORE (o CREDITS.md dele, "3D Dice
// Preset"), não das imagens. A conta pura fica aqui, sem o Foundry no topo do módulo.

// Os nomes são os do lang do CORE (CPR.module.dsn.*; o pt-BR dele deixa em inglês os dois nomes próprios).
export const GRUPO_DO_DSN = 'Cyberpunk RED';

// As cores, na ordem e com os modos do CORE ("preferred" vale até o jogador escolher outra; "default" só entra na lista).
export function coresDoDiceSoNice(corDoJogador) {
  const vidro = { edge: '#000000', material: 'glass', category: GRUPO_DO_DSN };
  return [
    [{ name: 'user', description: '- A cor do jogador -', background: corDoJogador, ...vidro }, 'preferred'],
    [{ name: 'red', description: 'Blood over Chrome', background: '#E64539', ...vidro }, 'default'],
    [{ name: 'yellow', description: 'Wet Work', background: '#FFF300', ...vidro }, 'default']
  ];
}

export function registrarDiceSoNice() {
  Hooks.once('diceSoNiceReady', dice3d => {
    for (const [cores, modo] of coresDoDiceSoNice(game.user.color?.css)) dice3d.addColorset(cores, modo);
  });
}

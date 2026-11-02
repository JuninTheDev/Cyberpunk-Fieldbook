// Os pontos do mapa do mestre: a posição, a categoria, o código, o ato e a nota do ponto. O nome, o distrito, o texto,
// o gancho, o encontro e as pistas vêm do lugar da base que tem o ponto no campo Mapa (campanha-base.js).
window.campaignMapData = {
  width: 5600,
  height: 5320,
  images: {
    base: 'nightcity-map-base.webp',
    reference: 'nightcity-map-reference.webp'
  },
  categories: {
    plot: { label: 'Campanha / pista principal', color: '#ff3158' },
    encounter: { label: 'Encontro', color: '#f8ef02' },
    secondary: { label: 'Gancho secundário', color: '#00ffd2' },
    server: { label: 'Servidor / objetivo', color: '#ff8a4c' },
    clue: { label: 'Pista / investigação', color: '#85b8ff' }
  },
  markers: [
    {
      id: 'wakako-jig-jig', code: 'W', x: 2650, y: 1800, category: 'plot', act: 'Sessão 01',
      note: 'O marcador segue o ponto 68 do mapa fornecido. Na lore oficial, o ponto 68 corresponde à Jig-Jig Street, em Japantown, Westbrook, onde fica o pachinko parlour de Wakako.'
    },
    {
      id: 'kabuki-depot', code: 'S1', x: 2450, y: 1350, category: 'plot', act: 'Sessão 01'
    },
    {
      id: 'arasaka-docks', code: 'AD', x: 1720, y: 1060, category: 'plot', act: 'Sessão 01',
      note: 'O marcador segue o ponto 64 do mapa fornecido.'
    }
  ]
};

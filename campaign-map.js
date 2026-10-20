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
      id: 'wakako-jig-jig', code: 'W', title: 'Pachinko de Wakako', district: 'Jig-Jig Street / Japantown / Westbrook / ponto 68', x: 2650, y: 1800,
      category: 'plot', act: 'Sessão 01', summary: 'Onde Wakako contratou o grupo para buscar a maleta.',
      hook: 'Wakako contratou o grupo para buscar uma maleta num armazém de Kabuki. Ainda não recebeu a maleta, nem notícia.',
      encounter: 'Mina Kuroda observa os visitantes. Se houver confronto, Wakako controla o ritmo e oferece uma saída antes de escalar a violência.',
      clue: 'O que Wakako sabe da maleta, e para quem a queria, fica para a nova trama.',
      note: 'O marcador segue o ponto 68 do mapa fornecido. Na lore oficial, o ponto 68 corresponde à Jig-Jig Street, em Japantown, Westbrook, onde fica o pachinko parlour de Wakako.'
    },
    {
      id: 'kabuki-depot', code: 'S1', title: 'Armazém de Kabuki', district: 'Kabuki / Watson / território Tyger Claws', x: 2450, y: 1350,
      category: 'plot', act: 'Sessão 01', summary: 'Onde o grupo achou o mensageiro morto, com a maleta presa ao pulso.',
      hook: 'O grupo trocou tiros com Dan, um funcionário, que pagou 150eb para sair vivo. O mensageiro já estava morto; Ricky cortou o braço dele para levar a maleta.',
      encounter: 'Vega e a equipe chegaram e houve combate. Vega recuou quando a maleta começou a dar sinais.',
      clue: 'Os dois corpos ficaram no armazém: o do mensageiro, sem o braço esquerdo, e o de Kobo, com o comunicador de "I.".'
    },
    {
      id: 'arasaka-docks', code: 'AD', title: 'Arasaka Industrial Docks', district: 'Northside / Watson / ponto 64', x: 1720, y: 1060,
      category: 'plot', act: 'Sessão 01', summary: 'O destino da maleta na ordem de recuperação da Arasaka.',
      hook: 'A ordem que Vega levava manda entregar o ativo "Morana" aqui até as 06:00.',
      encounter: 'Segurança Arasaka pesada, guindastes, containers e drones de inspeção.',
      clue: 'O que a Arasaka quer com o ativo fica para a nova trama.'
    }
  ]
};

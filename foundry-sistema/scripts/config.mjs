// Constantes do sistema: atributos, locais do corpo e rótulos. Os nomes curtos dos atributos ficam em inglês, como na
// wiki e no livro ("REF 8+", "DEX + Evasão").
export const SISTEMA = 'cpr-fieldbook';
export const caminho = arquivo => `systems/${SISTEMA}/${arquivo}`;
// Endereço padrão da wiki, como no módulo cpr-2077: com o Foundry em mesa.<domínio> (o servidor da mesa), a wiki fica em
// wiki.<domínio>; com tudo no mesmo computador, em localhost:8000.
export const enderecoPadraoDaWiki = ({ protocol = 'http:', hostname = '' } = {}) => (/^mesa\./.test(hostname) ? `${protocol}//wiki.${hostname.slice(5)}` : 'http://localhost:8000');

export const ATRIBUTOS = ['int', 'ref', 'dex', 'tech', 'cool', 'will', 'luck', 'move', 'body', 'emp'];
export const SIGLA = { int: 'INT', ref: 'REF', dex: 'DEX', tech: 'TECH', cool: 'COOL', will: 'WILL', luck: 'LUCK', move: 'MOVE', body: 'BODY', emp: 'EMP' };

export const LOCAIS = { corpo: 'corpo', cabeca: 'cabeça' };

export const DEFESAS = { esquivar: 'Esquivar', aguentar: 'Aguentar' };

// As marcas do agarrão (agarrao.mjs): quem agarra e quem é agarrado (efeitos de status do Foundry).
export const STATUS_AGARRAO = { agarrando: `${SISTEMA}-agarrando`, agarrado: `${SISTEMA}-agarrado` };

export const QUALIDADES = { poor: 'Ruim', standard: 'Padrão', excellent: 'Excelente' };

// Inventário (equipamento, roupa e droga): o uso de cada item, como na montagem da wiki.
export const USOS = { equipado: 'Equipado', carregando: 'Carregando', guardado: 'Guardado' };
// Quando os efeitos de um equipamento valem (do "usage" do CORE): só equipado (Medscanner, Linear Frame), equipado ou
// carregando (Agent, Techscanner), ou quando alguém liga o efeito na ficha do item.
export const ATIVACOES = { equipado: 'Só equipado', carregando: 'Equipado ou carregando', manual: 'Ligado à mão' };
// Roupas: tipo e estilo do CORE, com os nomes da loja da wiki ("hats" a loja ainda não traduz).
export const TIPOS_ROUPA = {
  top: 'Parte de cima', bottoms: 'Parte de baixo', jacket: 'Jaqueta', footwear: 'Calçado', jewelry: 'Joias', mirrorshades: 'Óculos espelhados',
  glasses: 'Óculos', contactLenses: 'Lentes de contato', hats: 'Chapéu'
};
export const ESTILOS_ROUPA = {
  asiaPop: 'Asia Pop', bagLadyChic: 'Bag Lady Chic', bohemian: 'Boêmio', businesswear: 'Roupa de negócios', gangColors: 'Cores de gangue',
  genericChic: 'Genérico Chic', highFashion: 'Alta moda', leisurewear: 'Roupa de lazer', nomadLeathers: 'Couro nômade', urbanFlash: 'Flash urbano'
};

// Lifepath (RED p. 40–70), com os rótulos do criador de personagens da wiki (criador.js, lifepathFields) e o campo do
// resultado da wiki de onde cada um vem (os nomes do CORE).
export const LIFEPATH = [
  { chave: 'origem', rotulo: 'Origem cultural', wiki: 'culturalOrigin' }, { chave: 'personalidade', rotulo: 'Personalidade', wiki: 'personality' },
  { chave: 'roupa', rotulo: 'Estilo de roupa', wiki: 'clothingStyle' }, { chave: 'cabelo', rotulo: 'Penteado', wiki: 'hairStyle' },
  { chave: 'adorno', rotulo: 'Adorno', wiki: 'affectations' }, { chave: 'valor', rotulo: 'O que mais valoriza', wiki: 'valueMost' },
  { chave: 'pessoas', rotulo: 'O que sente pelas pessoas', wiki: 'aboutPeople' }, { chave: 'pessoa', rotulo: 'Pessoa mais valiosa', wiki: 'valuedPerson' },
  { chave: 'posse', rotulo: 'Posse mais valiosa', wiki: 'valuedPossession' }, { chave: 'familia', rotulo: 'Família original', wiki: 'familyBackground' },
  { chave: 'infancia', rotulo: 'Ambiente de infância', wiki: 'childhoodEnvironment' }, { chave: 'crise', rotulo: 'Crise familiar', wiki: 'familyCrisis' },
  { chave: 'meta', rotulo: 'Meta de vida', wiki: 'lifeGoals' }, { chave: 'amigos', rotulo: 'Amigos', wiki: 'friends' },
  { chave: 'inimigos', rotulo: 'Inimigos', wiki: 'enemies' }, { chave: 'amores', rotulo: 'Amores trágicos', wiki: 'tragicLoveAffairs' },
  { chave: 'role', rotulo: 'Lifepath da Role', wiki: 'roleLifepath' }
];

// Os valores com extrato (o ledger do CORE no Foundry 12): o rótulo e a unidade.
export const EXTRATOS = {
  dinheiro: { rotulo: 'Eurodólares', unidade: 'eb' },
  pontosDeMelhoria: { rotulo: 'Pontos de Melhoria', unidade: 'IP' },
  reputacao: { rotulo: 'Reputação', unidade: '' }
};

// Upgrades: onde cada um instala (o "type" do itemUpgrade do CORE).
export const ALVOS_UPGRADE = { arma: 'Arma', cyberdeck: 'Cyberdeck', veiculo: 'Veículo' };

// Armas de 2077: a classe (as regras de cada uma estão em regras.mjs).
export const CLASSES_2077 = { power: 'Power', tech: 'Tech', smart: 'Smart' };

// Programas: a classe do CORE, com o nome da página de NET da wiki (o Black ICE próprio do netrunner também), e os
// quickhacks e daemons de 2077.
export const CLASSES_PROGRAMA = {
  booster: 'Booster', defender: 'Defensor', antiprogramattacker: 'Ataque anti-programa', antipersonnelattacker: 'Ataque anti-pessoal', blackice: 'Black ICE',
  quickhack: 'Quickhack (2077)', daemon: 'Daemon (2077)'
};

// Os atores da NET (o blackIce e o demon do CORE): sem corpo, atributos, HP nem Sorte; rolam os números deles + 1d10.
export const ATORES_DA_NET = ['blackice', 'demonio'];
// A classe do Black ICE: a do CORE (blackIceType), com o nome da tabela da wiki.
export const CLASSES_BLACK_ICE = { antipersonnel: 'Anti-pessoal', antiprogram: 'Anti-programa', other: 'Outro' };

// As chaves são as do conteúdo convertido do CORE (system.tipo do cyberware); os rótulos, os da loja da wiki.
export const TIPOS_CYBERWARE = {
  fashionware: 'Fashionware', neuralWare: 'Neuralware', cyberEye: 'Cyberolho', cyberAudioSuite: 'Cyberaudio',
  cyberwareInternal: 'Interno', cyberwareExternal: 'Externo', cyberArm: 'Cyberbraço', cyberLeg: 'Cyberperna', borgware: 'Borgware'
};

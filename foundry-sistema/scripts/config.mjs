// Constantes do sistema: atributos, locais do corpo e rótulos. Os nomes curtos dos atributos ficam em inglês, como na
// wiki e no livro ("REF 8+", "DEX + Evasão").
export const SISTEMA = 'cpr-fieldbook';
export const caminho = arquivo => `systems/${SISTEMA}/${arquivo}`;

export const ATRIBUTOS = ['int', 'ref', 'dex', 'tech', 'cool', 'will', 'luck', 'move', 'body', 'emp'];
export const SIGLA = { int: 'INT', ref: 'REF', dex: 'DEX', tech: 'TECH', cool: 'COOL', will: 'WILL', luck: 'LUCK', move: 'MOVE', body: 'BODY', emp: 'EMP' };

export const LOCAIS = { corpo: 'corpo', cabeca: 'cabeça' };

export const DEFESAS = { esquivar: 'Esquivar', aguentar: 'Aguentar' };

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

// Upgrades: onde cada um instala (o "type" do itemUpgrade do CORE).
export const ALVOS_UPGRADE = { arma: 'Arma', cyberdeck: 'Cyberdeck', veiculo: 'Veículo' };

// Armas de 2077: a classe (as regras de cada uma ainda não estão neste sistema).
export const CLASSES_2077 = { power: 'Power', tech: 'Tech', smart: 'Smart' };

// Programas: a classe do CORE, com o nome da página de NET da wiki, e os quickhacks e daemons de 2077.
export const CLASSES_PROGRAMA = {
  booster: 'Booster', defender: 'Defensor', antiprogramattacker: 'Ataque anti-programa', antipersonnelattacker: 'Ataque anti-pessoal',
  quickhack: 'Quickhack (2077)', daemon: 'Daemon (2077)'
};

// As chaves são as do conteúdo convertido do CORE (system.tipo do cyberware); os rótulos, os da loja da wiki.
export const TIPOS_CYBERWARE = {
  fashionware: 'Fashionware', neuralWare: 'Neuralware', cyberEye: 'Cyberolho', cyberAudioSuite: 'Cyberaudio',
  cyberwareInternal: 'Interno', cyberwareExternal: 'Externo', cyberArm: 'Cyberbraço', cyberLeg: 'Cyberperna', borgware: 'Borgware'
};

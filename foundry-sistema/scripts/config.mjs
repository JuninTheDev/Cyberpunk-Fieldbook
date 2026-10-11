// Constantes do sistema: atributos, locais do corpo e rótulos. Os nomes curtos dos atributos ficam em inglês, como na
// wiki e no livro ("REF 8+", "DEX + Evasão").
export const SISTEMA = 'cpr-fieldbook';
export const caminho = arquivo => `systems/${SISTEMA}/${arquivo}`;

export const ATRIBUTOS = ['int', 'ref', 'dex', 'tech', 'cool', 'will', 'luck', 'move', 'body', 'emp'];
export const SIGLA = { int: 'INT', ref: 'REF', dex: 'DEX', tech: 'TECH', cool: 'COOL', will: 'WILL', luck: 'LUCK', move: 'MOVE', body: 'BODY', emp: 'EMP' };

export const LOCAIS = { corpo: 'corpo', cabeca: 'cabeça' };

export const DEFESAS = { esquivar: 'Esquivar', aguentar: 'Aguentar' };

export const QUALIDADES = { poor: 'Ruim', standard: 'Padrão', excellent: 'Excelente' };

export const TIPOS_CYBERWARE = {
  fashionware: 'Fashionware', neuralWare: 'Neuralware', cyberOptic: 'Cyberóptico', cyberAudio: 'Cyberaudio',
  internalBodyCyberware: 'Interno', externalBodyCyberware: 'Externo', cyberArm: 'Cyberbraço', cyberLeg: 'Cyberperna', borgware: 'Borgware'
};

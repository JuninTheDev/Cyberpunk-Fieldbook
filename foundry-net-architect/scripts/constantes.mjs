// Constantes do NET Architect: ids, flags, habilidades de Interface e a tabela de Black ICE do livro-base
// (RED p. 204–207, os mesmos números e textos da wiki; tests/cenarios/netarquiteto.js confere contra a wiki).

export const MODULE_ID = 'net-architect';
export const SYSTEM_ID = 'cyberpunk-red-core';
export const STATUS_ID = 'net-architect-conectado';
export const PACK_NAME = 'arquiteturas-net';

// Flags: no Tile, a configuração do ponto de acesso e o estado da arquitetura (só o que os jogadores podem ver);
// no Token, a conexão.
export const FLAG_PONTO = 'pontoDeAcesso';
export const FLAG_ESTADO = 'estado';
export const FLAG_CONEXAO = 'conexao';

// Ações NET por turno pelo rank de Interface (RED p. 197).
export const acoesPorRank = rank => (rank >= 10 ? 5 : rank >= 7 ? 4 : rank >= 4 ? 3 : 2);

// Habilidades de Interface (RED p. 199). `alvo` diz onde a habilidade vale.
export const HABILIDADES = {
  pathfinder: { nome: 'Pathfinder', alvo: 'arquitetura', texto: 'Revela o mapa da arquitetura (contra o DV da arquitetura).' },
  backdoor: { nome: 'Breach', alvo: 'senha', texto: 'Quebra a senha deste andar (contra o DV da senha). É o Backdoor do RED, que nos anos 2070 se chama Breach.' },
  eyedee: { nome: 'Eye-Dee', alvo: 'arquivo', texto: 'Identifica e copia o arquivo deste andar (contra o DV do arquivo).' },
  control: { nome: 'Control', alvo: 'controle', texto: 'Assume o nó de controle deste andar (contra o DV do nó).' },
  zap: { nome: 'Zap', alvo: 'ice', texto: 'Ataca o Black ICE deste andar: 1d6 de REZ se vencer a defesa dele.' },
  slide: { nome: 'Slide', alvo: 'ice', texto: 'Escapa do Black ICE deste andar (contra a PER dele): depois dá para seguir.' },
  cloak: { nome: 'Cloak', alvo: 'arquitetura', texto: 'Apaga os rastros da sua passagem (contra o DV da arquitetura).' },
  virus: { nome: 'Virus', alvo: 'fundo', texto: 'Deixa um vírus no andar mais fundo (contra o DV da arquitetura).' },
  scanner: { nome: 'Scanner', alvo: 'fora', texto: 'Procura pontos de acesso: só fora da NET.' }
};

// Conteúdo dos andares no item `netarch` do sistema.
export const CONTEUDO = {
  'CPR.netArchitecture.floor.options.password': 'senha',
  'CPR.netArchitecture.floor.options.file': 'arquivo',
  'CPR.netArchitecture.floor.options.controlnode': 'controle',
  'CPR.global.programClass.blackice': 'ice'
};
export const CONTEUDO_DO_TIPO = Object.fromEntries(Object.entries(CONTEUDO).map(([chave, tipo]) => [tipo, chave]));
export const NOME_DO_TIPO = { senha: 'Senha', arquivo: 'Arquivo', controle: 'Nó de controle', ice: 'Black ICE', demonio: 'Demônio', netrunner: 'Netrunner inimigo', vazio: 'Andar vazio' };
export const ICE_PREFIXO = 'CPR.netArchitecture.floor.options.blackIce.';

// Black ICE do livro-base. `dano` é a rolagem do efeito (no cérebro, ou no REZ de um programa no anti-programa);
// vazio quando o efeito não tem dano (o mestre aplica pelo texto).
export const BLACK_ICE = {
  asp: { nome: 'Asp', classe: 'Anti-pessoal', per: 4, spd: 6, atk: 2, def: 2, rez: 15, dano: '', efeito: 'Destrói um programa aleatório do deck.' },
  giant: { nome: 'Giant', classe: 'Anti-pessoal', per: 2, spd: 2, atk: 8, def: 4, rez: 25, dano: '3d6', efeito: '3d6 no cérebro e desconexão insegura (sofre os outros Black ICE ativos).' },
  hellhound: { nome: 'Hellhound', classe: 'Anti-pessoal', per: 6, spd: 6, atk: 6, def: 2, rez: 20, dano: '2d6', efeito: '2d6 no cérebro; deck e roupa pegam fogo (2 no HP por turno).' },
  kraken: { nome: 'Kraken', classe: 'Anti-pessoal', per: 6, spd: 2, atk: 8, def: 4, rez: 30, dano: '3d6', efeito: '3d6 no cérebro; até o fim do próximo turno, não avança nem desconecta com segurança.' },
  liche: { nome: 'Liche', classe: 'Anti-pessoal', per: 8, spd: 2, atk: 6, def: 2, rez: 25, dano: '', efeito: '−1d6 em INT, REF e DEX por 1 hora.' },
  raven: { nome: 'Raven', classe: 'Anti-pessoal', per: 6, spd: 4, atk: 4, def: 2, rez: 15, dano: '1d6', efeito: 'Desativa um programa defensor aleatório e causa 1d6 no cérebro.' },
  scorpion: { nome: 'Scorpion', classe: 'Anti-pessoal', per: 2, spd: 6, atk: 2, def: 2, rez: 15, dano: '', efeito: '−1d6 no MOVE por 1 hora.' },
  skunk: { nome: 'Skunk', classe: 'Anti-pessoal', per: 2, spd: 4, atk: 4, def: 2, rez: 10, dano: '', efeito: '−2 em Slide até ser desativado (acumula entre Skunks).' },
  wisp: { nome: 'Wisp', classe: 'Anti-pessoal', per: 4, spd: 4, atk: 4, def: 2, rez: 15, dano: '1d6', efeito: '1d6 no cérebro e −1 Ação NET no próximo turno (mínimo 2).' },
  dragon: { nome: 'Dragon', classe: 'Anti-programa', per: 6, spd: 4, atk: 6, def: 6, rez: 30, dano: '6d6', efeito: '6d6 no REZ de um programa; se desativar, destrói.' },
  killer: { nome: 'Killer', classe: 'Anti-programa', per: 4, spd: 8, atk: 6, def: 2, rez: 20, dano: '4d6', efeito: '4d6 no REZ de um programa; se desativar, destrói.' },
  sabertooth: { nome: 'Sabertooth', classe: 'Anti-programa', per: 8, spd: 6, atk: 6, def: 2, rez: 25, dano: '6d6', efeito: '6d6 no REZ de um programa; se desativar, destrói.' }
};
// Black ICE sem tipo escolhido no item ("--"): o mestre ajusta pelo REZ na janela.
export const ICE_GENERICO = { nome: 'Black ICE', classe: 'Anti-pessoal', per: 4, spd: 4, atk: 4, def: 2, rez: 15, dano: '1d6', efeito: '1d6 no cérebro (Black ICE sem tipo no item: ajuste pela mesa).' };
export const iceDaChave = chave => (chave && BLACK_ICE[chave]) || ICE_GENERICO;

// Demônios (RED p. 212, os números da wiki): Black ICE inteligente. Sempre vencem a velocidade, senhas não os param,
// não têm PER, SPD nem DEF (defendem com Interface + 1d10, então não dá Slide) e só usam Zap e Control.
export const DEMONIOS = {
  imp: { nome: 'Imp', rez: 15, interface: 3, acoes: 2, combate: 14 },
  efreet: { nome: 'Efreet', rez: 25, interface: 4, acoes: 3, combate: 14 },
  balron: { nome: 'Balron', rez: 30, interface: 7, acoes: 4, combate: 14 }
};
export const demonioDaChave = chave => DEMONIOS[chave] || DEMONIOS.imp;

// Status no token: conectado (já registrado) e em chamas (Hellhound, até gastar uma Ação Carnal).
export const STATUS_FOGO = 'net-architect-fogo';
// Pasta dos atores de Black ICE e demônios que entram no combate, e dos arquivos copiados (diários).
export const PASTA_ATORES = 'NET Architect: Black ICE e demônios';
export const PASTA_ARQUIVOS = 'Arquivos da NET';

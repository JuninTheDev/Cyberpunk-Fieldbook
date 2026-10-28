// A NET na mesa (o NET Architect da mesa, dentro do sistema; o C8 do ROADMAP): as flags do Tile (o ponto de acesso e o
// estado público da arquitetura), do Token (a conexão; o inimigo no combate) e do ator do inimigo, o status do token
// conectado e o ponto de acesso novo.
import { caminho } from '../config.mjs';
import { iconeNeon } from '../regras-icones.mjs';

export const FLAG_PONTO = 'pontoDeAcesso';
export const FLAG_ESTADO = 'netrun';
export const FLAG_CONEXAO = 'conexaoNaNet';
// O token do inimigo no combate: { tile, chave } (o ponto de acesso e o conteúdo da arquitetura).
export const FLAG_INIMIGO = 'inimigoDaNet';
// O ator do Black ICE ou do demônio da arquitetura: o modelo da wiki ("ice:hellhound"), um ator por modelo.
export const FLAG_MODELO = 'modeloDaNet';
export const STATUS_CONECTADO = 'cprf-conectado-na-net';
// O fogo do Hellhound (a wiki: "deck e roupa pegam fogo (2 no HP por turno)"), até uma Ação Carnal apagar.
export const STATUS_EM_CHAMAS = 'cprf-em-chamas';
// O ícone neon do C49 (o antigo, icones/conectado.svg, fica no pacote).
export const ICONE_CONECTADO = iconeNeon('conectado');
export const IMAGEM_DO_TERMINAL = caminho('icones/terminal.svg');

// O ponto de acesso novo: o nome, a arquitetura (o uuid do item), o DV (vazio: o da arquitetura), o alcance em metros
// (6, o do RED), os requisitos (o cyberdeck equipado, a Interface mínima), se é oculto (e o DV do Scanner para achá-lo), se
// reinicia as defesas sem ninguém conectado, os nós de controle ligados à cena e quem já achou o ponto oculto.
export const PONTO_PADRAO = {
  ativo: true, nome: 'Ponto de acesso', arquitetura: '', dv: null, alcance: 6, exigeDeck: true, rankMinimo: 1, oculto: false, dvScanner: 10, reiniciar: true,
  ligacoes: [], revelados: []
};

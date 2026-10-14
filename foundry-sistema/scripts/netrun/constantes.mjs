// A NET na mesa (o NET Architect da mesa, dentro do sistema; o C8 do ROADMAP): as flags do Tile (o ponto de acesso e o
// estado público da arquitetura) e do Token (a conexão), o status do token conectado e o ponto de acesso novo.
import { caminho } from '../config.mjs';

export const FLAG_PONTO = 'pontoDeAcesso';
export const FLAG_ESTADO = 'netrun';
export const FLAG_CONEXAO = 'conexaoNaNet';
export const STATUS_CONECTADO = 'cprf-conectado-na-net';
export const ICONE_CONECTADO = caminho('icones/conectado.svg');
export const IMAGEM_DO_TERMINAL = caminho('icones/terminal.svg');

// O ponto de acesso novo: o nome, a arquitetura (o uuid do item), o DV (vazio: o da arquitetura), o alcance em metros
// (6, o do RED), os requisitos (o cyberdeck equipado, a Interface mínima), se é oculto (e o DV do Scanner para achá-lo), se
// reinicia as defesas sem ninguém conectado, os nós de controle ligados à cena e quem já achou o ponto oculto.
export const PONTO_PADRAO = {
  ativo: true, nome: 'Ponto de acesso', arquitetura: '', dv: null, alcance: 6, exigeDeck: true, rankMinimo: 1, oculto: false, dvScanner: 10, reiniciar: true,
  ligacoes: [], revelados: []
};

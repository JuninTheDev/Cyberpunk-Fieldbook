// As arquiteturas da NET do compêndio do sistema ("Arquiteturas da NET", escondido dos jogadores): as da campanha, do
// documento da wiki (documentos/morana/arquiteturas-da-campanha.md: cada "## Nome" com a tabela de andares, como o build
// do cpr-2077 as lê), e os três exemplos do NET Architect da mesa (o armazém da TLB do livro, o apartamento de um fixer e
// a clínica de ripperdoc). O documento é a fonte: o mestre lê a mesma arquitetura na wiki e no Foundry. Sem Foundry: os
// testes rodam este arquivo no Node.
import fs from 'node:fs';
import path from 'node:path';
import { BLACK_ICE } from '../scripts/gerado.mjs';

export const IMAGEM = 'icons/svg/tower.svg';
const CONTEUDOS = { senha: 'senha', arquivo: 'arquivo', 'nó de controle': 'controle' };
const IDS_DE_ICE = BLACK_ICE.map(ice => ice.id);
const escapar = texto => String(texto).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const emLinha = texto => escapar(texto).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
const linha = (andar, ramo, tipo, { dv = 0, ice = '', descricao = '' } = {}) => ({ andar, ramo, tipo, dv, ice, demonio: '', ator: '', nome: '', descricao });
const arquitetura = (nome, descricao, andares, flags = {}) => ({
  name: nome, type: 'arquitetura', img: IMAGEM,
  system: { descricao, dv: 0, andares, preco: 0, fonte: { livro: '', pagina: 0 } },
  flags: { 'cpr-fieldbook': flags }
});

export const documentoDaCampanha = raizDaWiki => path.join(raizDaWiki, 'documentos', 'morana', 'arquiteturas-da-campanha.md');

// Cada seção com a tabela (Andar | Ramo | Conteúdo | DV | O que tem) vira uma arquitetura; as seções sem tabela (as
// regras gerais) ficam de fora. Um andar que não vale para o RED para o build, com o nome da arquitetura e o andar.
export function arquiteturasDaCampanha(raizDaWiki) {
  const texto = fs.readFileSync(documentoDaCampanha(raizDaWiki), 'utf8').replace(/\r/g, '');
  const itens = [];
  for (const secao of texto.split(/^## /m).slice(1)) {
    const [titulo, ...linhas] = secao.split('\n');
    const nome = titulo.trim();
    const tabela = linhas.filter(texto => texto.startsWith('|')).slice(2);
    if (!tabela.length) continue;
    const problema = mensagem => new Error(`arquiteturas-da-campanha.md, "${nome}": ${mensagem}`);
    const andares = tabela.map(texto => {
      const [andar, ramo, conteudo, dv, nota = ''] = texto.split('|').slice(1, -1).map(celula => celula.trim());
      const ice = conteudo.match(/^Black ICE: (\w+)$/i)?.[1]?.toLowerCase();
      if (ice && !IDS_DE_ICE.includes(ice)) throw problema(`Black ICE desconhecido: ${conteudo}`);
      const tipo = ice ? 'ice' : CONTEUDOS[conteudo.toLowerCase()];
      if (!tipo) throw problema(`conteúdo desconhecido no andar ${andar}: ${conteudo} (use Senha, Arquivo, Nó de controle ou Black ICE: Nome)`);
      if (!/^(1[0-8]|[1-9])$/.test(andar)) throw problema(`andar inválido: ${andar} (de 1 a 18)`);
      if (!/^[a-h]$/i.test(ramo)) throw problema(`ramo inválido no andar ${andar}: ${ramo} (de A a H)`);
      if (!ice && !/^([4-9]|1\d|20)$/.test(dv)) throw problema(`DV inválido no andar ${andar}: ${dv} (de 4 a 20)`);
      return linha(Number(andar), ramo.toLowerCase(), tipo, { dv: ice ? 0 : Number(dv), ice: ice ?? '', descricao: nota });
    });
    const sobre = linhas.filter(texto => texto.trim() && !texto.startsWith('|')).map(texto => `<p>${emLinha(texto.replace(/^- /, ''))}</p>`).join('');
    itens.push(arquitetura(nome, `<p><b>Protocolo Morana</b> · ${andares.length} andares · do documento Arquiteturas da campanha</p>${sobre}`, andares, { campanha: 'morana' }));
  }
  if (!itens.length) throw new Error('arquiteturas-da-campanha.md: nenhuma arquitetura com tabela de andares');
  return itens;
}

// Os exemplos do NET Architect da mesa (compendio.mjs dele), no formato do sistema.
export const EXEMPLOS = [
  arquitetura('Armazém da TLB (exemplo do livro)', '<p>O exemplo do livro-base (RED p. 218): quatro andares, 13.500eb.</p>', [
    linha(1, 'a', 'ice', { ice: 'hellhound' }), linha(1, 'a', 'ice', { ice: 'killer' }),
    linha(2, 'a', 'senha', { dv: 8 }),
    linha(3, 'a', 'ice', { ice: 'hellhound' }),
    linha(4, 'a', 'controle', { dv: 8, descricao: 'Torreta automática do armazém (e as câmeras do pátio).' })
  ], { exemplo: true }),
  arquitetura('Apartamento de um fixer', '<p>Arquitetura básica de uma casa: senha, a agenda do fixer e as câmeras.</p>', [
    linha(1, 'a', 'senha', { dv: 6 }),
    linha(2, 'a', 'arquivo', { dv: 6, descricao: 'Agenda de contatos: três clientes em Watson e um encontro marcado no Afterlife amanhã.' }),
    linha(3, 'a', 'controle', { dv: 6, descricao: 'Câmeras do corredor e a fechadura da porta.' })
  ], { exemplo: true }),
  arquitetura('Clínica de ripperdoc (ramificada)', '<p>Dois ramos: o administrativo (A) e o centro cirúrgico (B), que sai do andar 2.</p>', [
    linha(1, 'a', 'senha', { dv: 8 }),
    linha(2, 'a', 'ice', { ice: 'wisp' }),
    linha(3, 'a', 'arquivo', { dv: 8, descricao: 'Prontuários: quem instalou o quê nos últimos seis meses.' }),
    linha(4, 'a', 'ice', { ice: 'killer' }),
    linha(5, 'a', 'arquivo', { dv: 10, descricao: 'Lista de clientes com cyberware ilegal, com os pagamentos em dinheiro vivo.' }),
    linha(3, 'b', 'controle', { dv: 8, descricao: 'Portas do centro cirúrgico e o elevador de serviço.' }),
    linha(4, 'b', 'senha', { dv: 10 }),
    linha(5, 'b', 'controle', { dv: 10, descricao: 'Os dois drones de segurança da clínica.' })
  ], { exemplo: true })
];

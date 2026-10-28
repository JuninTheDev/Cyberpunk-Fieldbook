// Os arquivos do Eye-Dee (o arquivos.mjs do NET Architect da mesa): o Eye-Dee que passa copia o arquivo para um diário na
// pasta "Arquivos da NET", que os donos do netrunner podem abrir (a wiki, "Ações NET": copiar arquivos para o deck não é
// Ação NET). O chat avisa, só o mestre e eles, com o link. O mesmo arquivo identificado de novo (depois do "Reiniciar" do
// mestre) não faz outro diário: quem o identificou agora também passa a abrir o de antes. O estado do ponto guarda os
// diários: arquivos: [{ chave, uuid, nome }].
import { SISTEMA } from '../config.mjs';

export const PASTA_DOS_ARQUIVOS = 'Arquivos da NET';
// O diário do arquivo: { chave, arquitetura } (o conteúdo e o uuid da arquitetura).
export const FLAG_ARQUIVO = 'arquivoDaNet';

const esc = texto => String(texto ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Onde o arquivo estava: a arquitetura, o andar e o ramo (o nome do diário é "Arquivo: " e isto).
export const lugarDoArquivo = (arq, no) => `${arq.nome} · andar ${no.andar}${no.ramo !== 'a' ? ` (ramo ${no.ramo.toUpperCase()})` : ''}`;

// A página do diário: o nome do arquivo (ou "Arquivo"), o que ele é e de onde veio.
export function paginaDoArquivo({ conteudo, corredor, lugar, ponto, quando }) {
  return {
    name: conteudo.nome || 'Arquivo', type: 'text',
    text: { content: `<p>${esc(conteudo.descricao || 'Arquivo sem descrição.')}</p><hr><p><i>Copiado por ${esc(corredor.nome)} em ${esc(lugar)} (DV ${conteudo.dv ?? '—'}), pelo ponto de acesso ${esc(ponto.nome || '')}, em ${esc(quando)}.</i></p>` }
  };
}

// O diário de um arquivo já copiado (o uuid), ou ''.
export const diarioDe = (est, chave) => (est?.arquivos ?? []).find(item => item.chave === chave)?.uuid ?? '';

// ---------------- No Foundry (o mestre ativo) ----------------
const leitoresDo = ator => game.users.filter(user => !user.isGM && ator.testUserPermission(user, 'OWNER'));

async function pasta() {
  return game.folders.find(item => item.type === 'JournalEntry' && item.name === PASTA_DOS_ARQUIVOS)
    ?? CONFIG.Folder.documentClass.create({ name: PASTA_DOS_ARQUIVOS, type: 'JournalEntry', color: '#004d40' });
}

// Copia o arquivo que o Eye-Dee identificou. Devolve o registro ({ chave, uuid, nome }). O registro de um diário que o
// mestre apagou sai, e um diário novo entra no lugar.
export async function copiarArquivo({ est, arq, ponto, conteudo, corredor, token }) {
  const ator = token.actor;
  const leitores = leitoresDo(ator);
  const OBSERVER = CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
  const existente = (est.arquivos ?? []).find(item => item.chave === conteudo.chave && fromUuidSync(item.uuid));
  if (existente) {
    const diario = fromUuidSync(existente.uuid);
    const novos = leitores.filter(user => (diario.ownership[user.id] ?? 0) < OBSERVER);
    if (novos.length) await diario.update(Object.fromEntries(novos.map(user => [`ownership.${user.id}`, OBSERVER])));
    return existente;
  }
  const lugar = lugarDoArquivo(arq, arq.nos[corredor.no]);
  const nome = `Arquivo: ${lugar}`;
  const quando = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  const diario = await CONFIG.JournalEntry.documentClass.create({
    name: nome, folder: (await pasta()).id,
    ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE, ...Object.fromEntries(leitores.map(user => [user.id, OBSERVER])) },
    pages: [paginaDoArquivo({ conteudo, corredor, lugar, ponto, quando })],
    flags: { [SISTEMA]: { [FLAG_ARQUIVO]: { chave: conteudo.chave, arquitetura: ponto.arquitetura } } }
  });
  const registro = { chave: conteudo.chave, uuid: diario.uuid, nome };
  est.arquivos = [...(est.arquivos ?? []).filter(item => item.chave !== conteudo.chave), registro];
  await ChatMessage.implementation.create({
    speaker: ChatMessage.implementation.getSpeaker({ actor: ator, token }),
    whisper: [...new Set([...game.users.filter(user => user.isGM).map(user => user.id), ...leitores.map(user => user.id)])],
    content: `<p><b>${esc(corredor.nome)}</b> copiou um arquivo para o deck: @UUID[${diario.uuid}]{${esc(nome)}}</p>`
  });
  return registro;
}

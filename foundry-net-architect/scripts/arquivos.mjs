// Arquivos como handouts: o Eye-Dee que passa copia o arquivo para um diário ("Arquivos da NET"), que o dono do
// netrunner pode abrir (copiar arquivos não é Ação NET, RED p. 198). O chat avisa com o link.
import { MODULE_ID, PASTA_ARQUIVOS } from './constantes.mjs';

const esc = texto => String(texto ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function pasta() {
  return game.folders.find(item => item.type === 'JournalEntry' && item.name === PASTA_ARQUIVOS)
    || Folder.create({ name: PASTA_ARQUIVOS, type: 'JournalEntry', color: '#004d40', sorting: 'm' });
}

const donos = actor => game.users.filter(user => !user.isGM && actor.testUserPermission(user, 'OWNER'));

export async function copiarArquivo({ est, arq, ponto, no, conteudo, corredor, token }) {
  const existente = (est.arquivos || []).find(item => item.chave === conteudo.chave && fromUuidSync(item.uuid));
  const actor = token.actor;
  const leitores = donos(actor);
  if (existente) {
    const diario = fromUuidSync(existente.uuid);
    const ownership = { ...diario.ownership };
    for (const user of leitores) if ((ownership[user.id] || 0) < CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER) ownership[user.id] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
    await diario.update({ ownership });
    return existente;
  }
  const lugar = `${arq.nome} · andar ${no.andar}${no.ramo !== 'a' ? ` (ramo ${no.ramo.toUpperCase()})` : ''}`;
  const nome = `Arquivo: ${lugar}`;
  const ownership = { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE };
  for (const user of leitores) ownership[user.id] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
  const quando = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  const [diario] = await JournalEntry.createDocuments([{
    name: nome, folder: (await pasta()).id, ownership,
    pages: [{
      name: 'Arquivo', type: 'text',
      text: { content: `<p>${esc(conteudo.descricao || 'Arquivo sem descrição.')}</p><hr><p><i>Copiado por ${esc(corredor.nome)} em ${esc(lugar)} (DV ${conteudo.dv || '—'}), pelo ponto de acesso ${esc(ponto.nome || '')}, em ${esc(quando)}.</i></p>` }
    }],
    flags: { [MODULE_ID]: { arquivo: conteudo.chave, arquitetura: ponto.arquitetura } }
  }]);
  const registro = { chave: conteudo.chave, uuid: diario.uuid, nome };
  est.arquivos = [...(est.arquivos || []), registro];
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor, token }),
    whisper: [...new Set([...game.users.filter(user => user.isGM).map(user => user.id), ...leitores.map(user => user.id)])],
    content: `<p><b>${esc(corredor.nome)}</b> copiou um arquivo para o deck: @UUID[${diario.uuid}]{${esc(nome)}}</p>`
  });
  return registro;
}

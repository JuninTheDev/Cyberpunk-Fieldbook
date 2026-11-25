// O defeito escondido (o C71 do plano das modificações de armas): o mestre sorteia um defeito para a arma de um personagem
// (1d6 na tabela da página da regra; de novo quando não serve nela) e ele fica guardado no servidor da wiki, só do mestre
// (campanhas/<id>/defeitos.json): o jogador dono da arma lê as flags dela pelo console, então o segredo não fica no
// Foundry. Decisão do usuário de 2026-11-24 ("Só depois de revelado"): escondido, o defeito não muda nada nem dá o slot a
// mais. Na primeira falha crítica com a arma, o mestre recebe o "Revelar o defeito" (numa janela dele: nada do defeito
// passa pelo chat, nem sussurrado, porque a mensagem sussurrada chega ao navegador do jogador): aí o defeito entra na arma
// (o item do catálogo, instalado), com o efeito e o slot, e o diário da arma anota. O que o mestre sabe fica num cache no
// navegador dele, lido da wiki quando o mundo abre.
import { SISTEMA } from './config.mjs';
import { carregarCatalogo, campanhaDoMundo, wikiFetch } from './wiki.mjs';
import { registrarEventos, temIdentidade } from './identidade.mjs';
import { eventoDeMarco } from './regras-identidade.mjs';
import { modCabe } from './regras-modificacoes.mjs';
import { chaveDoDefeito, sortearDefeito } from './regras-oficina.mjs';

const esc = valor => foundry.utils.escapeHTML(String(valor ?? ''));
const cache = new Map();
const souOMestreAtivo = () => game.user.isGM && game.users.activeGM?.id === game.user.id;

async function rotaDaCampanha() {
  const campanha = await campanhaDoMundo();
  if (!campanha?.id || campanha.erro) throw new Error('Este mundo não está ligado a uma campanha da wiki: o defeito escondido fica no servidor dela (escolha a Campanha da wiki nas configurações do sistema).');
  return `/api/campanhas/${encodeURIComponent(campanha.id)}/defeitos`;
}

// Lê os defeitos escondidos da campanha (só o mestre; o mundo sem campanha fica sem).
export async function carregar() {
  if (!game.user.isGM) return cache;
  const campanha = await campanhaDoMundo();
  if (!campanha?.id || campanha.erro) return cache;
  const { defeitos = {} } = await wikiFetch(`/api/campanhas/${encodeURIComponent(campanha.id)}/defeitos`);
  cache.clear();
  for (const [chave, defeito] of Object.entries(defeitos)) cache.set(chave, defeito);
  return cache;
}

// O defeito escondido da arma (só no navegador do mestre), ou null.
export const defeitoEscondido = arma => (game.user.isGM && arma ? cache.get(chaveDoDefeito(arma)) ?? null : null);

// As modificações de defeito do catálogo, na ordem da tabela da página da regra (a do build).
async function defeitosDoCatalogo() {
  const catalogo = await carregarCatalogo();
  return Object.entries(catalogo).filter(([id, item]) => id.startsWith('mods-armas:') && item.flags?.[SISTEMA]?.mod?.tipo === 'defeito')
    .map(([id, item]) => ({ id, mod: item.flags[SISTEMA].mod, base: item }));
}
const instaladas = arma => arma.modificacoes.map(item => item.modificacao);

// Sorteia e esconde um defeito na arma. rolar: o 1d6 (a API e os testes); sem ele, o dado do Foundry. Devolve
// { defeito, rolagens } ou null.
export async function esconder(arma, { rolar = () => Math.ceil(CONFIG.Dice.randomUniform() * 6) } = {}) {
  if (!game.user.isGM) { ui.notifications.warn('Só o mestre esconde um defeito.'); return null; }
  if (!temIdentidade(arma)) { ui.notifications.warn('O defeito escondido é para a arma de um personagem.'); return null; }
  if (instaladas(arma).some(mod => mod.tipo === 'defeito')) { ui.notifications.warn(`${arma.name} já tem um defeito: só cabe um por arma.`); return null; }
  if (defeitoEscondido(arma)) { ui.notifications.warn(`${arma.name} já tem um defeito escondido.`); return null; }
  const rota = await rotaDaCampanha();
  const lista = await defeitosDoCatalogo();
  const porMod = new Map(lista.map(entrada => [entrada.mod, entrada]));
  const sorteio = sortearDefeito({ defeitos: lista.map(entrada => entrada.mod), cabe: mod => modCabe(arma.paraModificacoes, instaladas(arma), mod).cabe, rolar });
  if (!sorteio) { ui.notifications.warn(`Nenhum defeito da tabela serve em ${arma.name}.`); return null; }
  const { mod } = porMod.get(sorteio.mod);
  const defeito = { mod: mod.id, nome: mod.nome, arma: arma.nomeDeExibicao, ator: arma.actor?.name ?? '' };
  await wikiFetch(rota, { method: 'PUT', body: { chave: chaveDoDefeito(arma), defeito } });
  cache.set(chaveDoDefeito(arma), { ...defeito, quando: new Date().toISOString() });
  // Na tela do mestre, e não no chat: a mensagem sussurrada também chega ao navegador do jogador (o G4 viu).
  ui.notifications.info(`Defeito escondido em ${arma.nomeDeExibicao} (${arma.actor?.name ?? ''}): ${mod.nome} (1d6: ${sorteio.rolagens.join(', ')}). Ele só vale depois de revelado: na primeira falha crítica com a arma, você escolhe revelar.`, { permanent: true });
  arma.sheet?.rendered && arma.sheet.render();
  return { defeito, rolagens: sorteio.rolagens };
}

// Tira o defeito escondido sem revelar (o mestre mudou de ideia).
export async function tirar(arma) {
  if (!game.user.isGM || !defeitoEscondido(arma)) return false;
  await wikiFetch(await rotaDaCampanha(), { method: 'PUT', body: { chave: chaveDoDefeito(arma), defeito: null } });
  cache.delete(chaveDoDefeito(arma));
  arma.sheet?.rendered && arma.sheet.render();
  return true;
}

// Revela o defeito: o item do catálogo entra na arma (com o efeito e o slot), a wiki esquece o segredo, a mesa vê e o
// diário da arma anota. Devolve o item do defeito, ou null.
export async function revelar(arma) {
  if (!game.user.isGM) return null;
  const escondido = defeitoEscondido(arma);
  if (!escondido || !arma.actor) return null;
  const entrada = (await defeitosDoCatalogo()).find(item => item.mod.id === escondido.mod);
  if (!entrada) { ui.notifications.warn(`O defeito ${escondido.nome} não está no catálogo deste sistema.`); return null; }
  const { cabe, motivo } = modCabe(arma.paraModificacoes, instaladas(arma), entrada.mod);
  if (!cabe) { ui.notifications.warn(`O defeito ${escondido.nome} não entra em ${arma.name}: ${motivo}.`); return null; }
  const data = foundry.utils.deepClone(entrada.base);
  data.system.instaladoEm = arma.id;
  const [item] = await arma.actor.createEmbeddedDocuments('Item', [data]);
  await wikiFetch(await rotaDaCampanha(), { method: 'PUT', body: { chave: chaveDoDefeito(arma), defeito: null } });
  cache.delete(chaveDoDefeito(arma));
  await ChatMessage.implementation.create({
    speaker: { alias: arma.actor.name },
    content: `<div class="${SISTEMA} defeito-revelado"><p><b>${esc(arma.nomeDeExibicao)}: o defeito se revelou.</b> ${esc(entrada.mod.nome)}.</p>${entrada.base.system?.descricao ? `<div class="descricao">${entrada.base.system.descricao}</div>` : ''}</div>`
  });
  await registrarEventos(arma, [eventoDeMarco(`O defeito se revelou: ${entrada.mod.nome}`, { data: new Date().toISOString(), por: 'mestre' })]).catch(erro => console.warn(`${SISTEMA} | o diário de ${arma.name}:`, erro));
  arma.sheet?.rendered && arma.sheet.render();
  return item;
}

// A falha crítica no ataque com a arma que tem um defeito escondido: o mestre ativo escolhe numa janela dele, e não no
// chat (a mensagem sussurrada ao mestre também chega, com o texto, ao navegador do jogador: nem a existência do defeito
// passa por lá).
async function aoCriarMensagem(mensagem) {
  const teste = mensagem.getFlag(SISTEMA, 'teste');
  if (!souOMestreAtivo() || !teste?.ataque || teste.critico !== 'falha' || !teste.arma) return;
  const arma = fromUuidSync(teste.arma);
  const escondido = defeitoEscondido(arma);
  if (!escondido) return;
  const escolha = await foundry.applications.api.DialogV2.wait({
    window: { title: 'Defeito escondido', icon: 'fa-solid fa-eye' },
    classes: [SISTEMA, 'defeito-escondido', 'themed', 'theme-dark'],
    rejectClose: false,
    content: `<p><b>Falha crítica com ${esc(arma.nomeDeExibicao)}</b> (${esc(arma.actor?.name)}). O defeito escondido pode se revelar agora: <b>${esc(escondido.nome)}</b>.</p><p>Revelado, ele entra na arma (o efeito e o slot) e a mesa vê.</p>`,
    buttons: [
      { action: 'revelar', label: 'Revelar o defeito', icon: 'fa-solid fa-eye', default: true },
      { action: 'depois', label: 'Agora não', icon: 'fa-solid fa-xmark' }
    ]
  });
  if (escolha === 'revelar') await revelar(arma);
}

export function registrarDefeitos() {
  Hooks.on('createChatMessage', mensagem => { aoCriarMensagem(mensagem).catch(erro => console.error(`${SISTEMA} | defeito escondido`, erro)); });
  Hooks.once('ready', () => { if (game.user.isGM) carregar().catch(erro => console.warn(`${SISTEMA} | os defeitos escondidos não vieram da wiki: ${erro.message}`)); });
}

export const API = { carregar, defeitoEscondido, esconder, tirar, revelar };

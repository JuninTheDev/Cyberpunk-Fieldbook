// Os tokens dinâmicos (o C45, partes 1 e 2; as regras em regras-token-dinamico.mjs): o conjunto de imagens fica no ator
// (flags.cpr-fieldbook.tokenDinamico) e vale para todos os tokens dele (o capanga de token solto herda). A imagem escolhida
// vai para o token (texture.src), e todos veem a mesma:
// - no movimento e no giro: no mesmo update (o preUpdateToken), com o giro novo que o Foundry 14 pôs nele (o
//   core.tokenAutoRotate), sem gravação a mais;
// - quando o ator muda (o HP, a arma equipada, os estados, a estase): um update nos tokens dele, pelo mestre ativo (sem
//   mestre, por quem mudou);
// - no token novo na cena (o preCreateToken).
// Com o conjunto ligado, a imagem não gira (lockRotation); desligado, o token volta à imagem de antes (a base) e ao giro de
// antes. O botão "Token dinâmico" do HUD do token (o dono) abre a janela: a pasta (ler os nomes padronizados), a grade das
// imagens e a calibração dos ângulos da folha. A parte 2: o Caminhando desenhado na tela de cada um durante o movimento, a
// transição da troca pelo estado (a configuração "Token dinâmico: transição") e a pré-carga das imagens.
import { SISTEMA } from './config.mjs';
import { estaseDe } from './cryo.mjs';
import { ANIMACAO_DA_DIRECAO, animacaoDaTroca, CHAVES, chaveDaImagem, conjuntoValido, DIRECOES, imagemDoToken, imagensDaPasta, imagensDoConjunto, NOMES_DAS_POSES, POSES_COM_DIRECAO, POSES_SEM_DIRECAO, TRANSICOES } from './regras-token-dinamico.mjs';

export const FLAG_TOKEN_DINAMICO = 'tokenDinamico';
const esc = texto => foundry.utils.escapeHTML(String(texto ?? ''));
const { ApplicationV2 } = foundry.applications.api;

export const conjuntoDe = ator => { const dados = ator?.getFlag?.(SISTEMA, FLAG_TOKEN_DINAMICO); return dados ? conjuntoValido(dados) : null; };
const ativoEm = ator => { const conjunto = ator?.type === 'veiculo' ? null : conjuntoDe(ator); return conjunto?.ativo ? conjunto : null; };

// O estado do ator que muda a pose.
export function estadoDoAtor(ator) {
  const estados = ator?.statuses ?? new Set();
  return {
    ferimento: ator?.system?.ferimento?.chave ?? 'ileso', morto: estados.has(CONFIG.specialStatusEffects.DEFEATED), inconsciente: estados.has('unconscious'),
    estase: Boolean(estaseDe(ator)), caido: estados.has('prone'), armado: Boolean(ator?.items?.some(item => item.type === 'arma' && item.system.equipada))
  };
}

// A imagem para o token (o documento), com o giro dado (o novo, antes de gravar); null sem o conjunto ligado.
export function imagemPara(token, rotacao = token.rotation) {
  const conjunto = ativoEm(token.actor);
  if (!conjunto) return null;
  return imagemDoToken(conjunto, estadoDoAtor(token.actor), rotacao)?.src || conjunto.base || null;
}

// Os tokens de um ator que existem de fato (sem as cópias de prévia): o do token solto, ou os ligados ao ator do mundo, em
// todas as cenas. Sempre a instância que está na cena do mundo: a lista do ator pode guardar uma instância velha do mesmo
// token (vista no G4 completo), e o update dela não chega à da cena.
const tokensDo = ator => {
  const vivos = (ator?.getDependentTokens?.({ linked: !ator.isToken, concreteOnly: true }) ?? [])
    .map(token => game.scenes.get(token.parent?.id)?.tokens.get(token.id)).filter(Boolean);
  return [...new Map(vivos.map(token => [token.uuid, token])).values()];
};

// Grava no token, com a transição escolhida na configuração (a parte 2), e confere: durante uma animação, o Foundry 14 põe
// os valores animados no próprio documento (o Token#_animate faz o mergeObject do #animationData nele), e a textura de uma
// transição que não acabou fica no texture.src preparado (visto no G4 completo, com o Edge sem janela, que atrasa as
// animações); o reset refaz pelo gravado, e o token na tela é redesenhado.
async function gravarNoToken(token, dados) {
  await token.update(dados, { animation: animacaoDaTroca(game.settings.get(SISTEMA, 'transicaoDoToken')) });
  if (token.texture.src === token._source.texture.src) return;
  token.reset();
  await token.object?.draw?.();
}

// Grava a imagem certa em cada token do ator (os que mudam).
export async function aplicarNoAtor(ator) {
  if (!ativoEm(ator)) return [];
  const mudados = [];
  for (const token of tokensDo(ator)) {
    const src = imagemPara(token);
    if (!src || src === token._source.texture.src || !token.canUserModify(game.user, 'update')) continue;
    await gravarNoToken(token, { 'texture.src': src });
    mudados.push(token);
  }
  return mudados;
}

// Quem grava quando o ator muda: o mestre ativo; sem mestre, quem mudou. Várias mudanças juntas viram uma (50 ms).
const pendentes = new Map();
function agendar(ator, userId) {
  if (!ator || ator.documentName !== 'Actor' || !ativoEm(ator)) return;
  const responsavel = game.users.activeGM ? game.users.activeGM.isSelf : userId === game.user.id;
  if (!responsavel) return;
  clearTimeout(pendentes.get(ator.uuid));
  pendentes.set(ator.uuid, setTimeout(() => {
    pendentes.delete(ator.uuid);
    aplicarNoAtor(ator).catch(erro => console.warn(`${SISTEMA} | token dinâmico`, erro));
  }, 50));
}
const atorDe = documento => {
  const pai = documento?.parent;
  return pai?.documentName === 'Actor' ? pai : pai?.parent?.documentName === 'Actor' ? pai.parent : null;
};

// Salva o conjunto da janela: a base (a imagem de antes) e o giro de antes ficam guardados da primeira vez; ligado, a
// imagem não gira; desligado, volta tudo.
export async function salvarConjunto(ator, dados) {
  if (ator?.type === 'veiculo') return null;
  const antes = conjuntoDe(ator);
  const base = antes?.base || ator.prototypeToken.texture.src;
  const travaAntes = antes ? Boolean(ator.getFlag(SISTEMA, FLAG_TOKEN_DINAMICO)?.travaAntes) : Boolean(ator.prototypeToken.lockRotation);
  const novo = { ...conjuntoValido({ ...dados, base }), travaAntes };
  await ator.update({ [`flags.${SISTEMA}.${FLAG_TOKEN_DINAMICO}`]: novo, 'prototypeToken.lockRotation': novo.ativo ? true : travaAntes, 'prototypeToken.texture.src': novo.ativo ? (imagemDoToken(novo, estadoDoAtor(ator), 0)?.src || base) : base });
  if (novo.ativo) await preCarregar([], [novo]);
  for (const token of tokensDo(ator)) {
    if (!token.canUserModify(game.user, 'update')) continue;
    await gravarNoToken(token, novo.ativo ? { lockRotation: true, 'texture.src': imagemPara(token) || base } : { lockRotation: travaAntes, 'texture.src': base });
  }
  return novo;
}

// O retrato da wiki (wiki-retrato.mjs) com o conjunto ligado: vira a base, e os tokens ficam com a imagem do conjunto.
export async function trocarBase(ator, img) {
  const conjunto = ativoEm(ator);
  if (!conjunto) return false;
  await ator.update({ [`flags.${SISTEMA}.${FLAG_TOKEN_DINAMICO}.base`]: img });
  await aplicarNoAtor(ator);
  return true;
}

export class JanelaTokenDinamico extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    tag: 'form', classes: [SISTEMA, 'token-dinamico', 'themed', 'theme-dark'],
    position: { width: 900, height: 'auto' }, window: { icon: 'fa-solid fa-person-walking-arrow-right', resizable: true },
    form: { handler: JanelaTokenDinamico.#salvar, closeOnSubmit: true },
    actions: { escolher: JanelaTokenDinamico.#escolher, escolherPasta: JanelaTokenDinamico.#escolherPasta, lerPasta: JanelaTokenDinamico.#lerPasta }
  };

  constructor({ ator, ...opcoes }) {
    super({ ...opcoes, id: `${SISTEMA}-token-dinamico-${ator.id}`, window: { title: `Token dinâmico: ${ator.name}` } });
    this.ator = ator;
  }

  async _prepareContext() {
    return { conjunto: conjuntoDe(this.ator) ?? conjuntoValido({}) };
  }

  async _renderHTML({ conjunto }) {
    const celula = chave => {
      const src = conjunto.imagens[chave];
      return `<div class="celula" data-chave="${chave}"><button type="button" data-action="escolher" data-chave="${chave}" data-tooltip="Escolher a imagem (botão direito: tirar)">${src ? `<img src="${esc(src)}" alt="">` : '<i class="fa-solid fa-plus"></i>'}</button><input type="hidden" name="imagens.${chave}" value="${esc(src)}"></div>`;
    };
    const linhas = POSES_COM_DIRECAO.map(pose => `<tr><th>${NOMES_DAS_POSES[pose]}</th>${DIRECOES.map(direcao => `<td>${celula(chaveDaImagem(pose, direcao))}</td>`).join('')}</tr>`).join('');
    const opcao = (valor, rotulo, atual) => `<option value="${valor}"${String(valor) === String(atual) ? ' selected' : ''}>${rotulo}</option>`;
    const total = CHAVES.filter(chave => conjunto.imagens[chave]).length;
    return `<div class="token-dinamico-corpo">
      <label class="linha"><input type="checkbox" name="ativo"${conjunto.ativo ? ' checked' : ''}> Ligado: a imagem do token muda pela direção, pela arma e pelo ferimento (e não gira)</label>
      <div class="linha"><label>Pasta <input type="text" name="pasta" value="${esc(conjunto.pasta)}" placeholder="tokens/personagem"></label>
        <button type="button" data-action="escolherPasta"><i class="fa-solid fa-folder-open"></i> Escolher</button>
        <button type="button" data-action="lerPasta" data-tooltip="Preenche a grade pelos nomes: nome_parado_045.webp, nome_mirando_270.png, nome_ferido-leve.webp, nome_morto.webp"><i class="fa-solid fa-wand-magic-sparkles"></i> Ler a pasta</button></div>
      <div class="linha"><label>O 0° da folha fica no giro <select name="angulos.inicio">${DIRECOES.map(d => opcao(d, `${d}°`, conjunto.angulos.inicio)).join('')}</select></label>
        <label>Sentido <select name="angulos.sentido">${opcao('horario', 'O mesmo do Foundry', conjunto.angulos.sentido)}${opcao('antihorario', 'O contrário', conjunto.angulos.sentido)}</select></label></div>
      <p class="dica">O Foundry gira o token para onde ele anda: 0° virado para baixo (para a câmera), 90° para a esquerda, 180° para cima, 270° para a direita. Se a folha conta diferente, acerte o 0° e o sentido.</p>
      <table class="grade"><thead><tr><th></th>${DIRECOES.map(d => `<th>${d}°</th>`).join('')}</tr></thead><tbody>${linhas}</tbody></table>
      <div class="fixas">${POSES_SEM_DIRECAO.map(pose => `<div class="fixa"><span>${NOMES_DAS_POSES[pose]}</span>${celula(pose)}</div>`).join('')}</div>
      <p class="dica">${total} de ${CHAVES.length} imagens. O que faltar cai na mais geral (a direção mais perto; Mirando e Caminhando no Parado; Ferido grave no leve; Caído e Morto no Incapacitado); sem nenhuma, a imagem de antes.</p>
      <footer><button type="submit"><i class="fa-solid fa-floppy-disk"></i> Salvar</button></footer>
    </div>`;
  }

  _replaceHTML(resultado, conteudo) {
    conteudo.innerHTML = resultado;
    for (const botao of conteudo.querySelectorAll('[data-action="escolher"]')) {
      botao.addEventListener('contextmenu', evento => { evento.preventDefault(); this.#definir(botao.dataset.chave, ''); });
    }
  }

  #definir(chave, src) {
    const celula = this.element.querySelector(`.celula[data-chave="${chave}"]`);
    if (!celula) return;
    celula.querySelector('input').value = src;
    celula.querySelector('button').innerHTML = src ? `<img src="${esc(src)}" alt="">` : '<i class="fa-solid fa-plus"></i>';
  }

  static #escolher(evento, alvo) {
    const atual = this.element.querySelector(`input[name="imagens.${alvo.dataset.chave}"]`)?.value ?? '';
    new foundry.applications.apps.FilePicker.implementation({ type: 'image', current: atual, callback: src => this.#definir(alvo.dataset.chave, src) }).render(true);
  }

  static #escolherPasta() {
    const campo = this.element.querySelector('[name="pasta"]');
    new foundry.applications.apps.FilePicker.implementation({ type: 'folder', current: campo.value, callback: pasta => { campo.value = pasta; } }).render(true);
  }

  // "Ler a pasta": os arquivos com o nome padronizado preenchem a grade (os que não casam ficam como estão).
  static async #lerPasta() {
    const pasta = this.element.querySelector('[name="pasta"]').value.trim();
    if (!pasta) return ui.notifications.warn('Escolha a pasta antes.');
    let arquivos;
    try {
      arquivos = (await foundry.applications.apps.FilePicker.implementation.browse('data', pasta)).files ?? [];
    } catch (erro) {
      return ui.notifications.warn(`Não consegui ler a pasta (${erro.message}). Só quem pode procurar arquivos (o mestre, em geral) lê a pasta.`);
    }
    const imagens = imagensDaPasta(arquivos);
    const achadas = CHAVES.filter(chave => imagens[chave]);
    for (const chave of achadas) this.#definir(chave, imagens[chave]);
    ui.notifications.info(`${achadas.length} ${achadas.length === 1 ? 'imagem achada' : 'imagens achadas'} em ${pasta}.`);
    return achadas.length;
  }

  static async #salvar(evento, formulario, dados) {
    await salvarConjunto(this.ator, foundry.utils.expandObject(dados.object));
  }
}

export function abrirTokenDinamico(ator) {
  if (!ator?.isOwner || ator.type === 'veiculo') return null;
  return new JanelaTokenDinamico({ ator }).render({ force: true });
}

// O botão no HUD do token, para quem é dono do ator.
function botaoNoHud(app, elemento) {
  const doc = app?.document ?? app?.object?.document;
  const coluna = (elemento instanceof HTMLElement ? elemento : app?.element)?.querySelector?.('.col.left');
  if (!doc?.actor?.isOwner || doc.actor.type === 'veiculo' || !coluna || coluna.querySelector(`.${SISTEMA}-token-dinamico`)) return;
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = `control-icon ${SISTEMA}-token-dinamico${ativoEm(doc.actor) ? ' active' : ''}`;
  botao.dataset.tooltip = 'Token dinâmico';
  botao.innerHTML = '<i class="fa-solid fa-person-walking-arrow-right"></i>';
  botao.addEventListener('click', evento => { evento.preventDefault(); evento.stopPropagation(); app.close?.(); abrirTokenDinamico(doc.actor); });
  coluna.append(botao);
}

// ---------------- A parte 2: o Caminhando na tela, a pré-carga e a transição ----------------
// O Caminhando: durante a animação do movimento, cada computador desenha o quadro da direção em que o token anda naquele
// trecho (o giro que o Foundry anima por trecho, no próprio documento, mesmo com o lockRotation), sem gravar nada; armado,
// o Mirando (a pose manda, como no estado). Acabou o movimento, o token é redesenhado com a imagem gravada. Troca o
// desenho só quando o quadro muda (o getTexture cria uma textura nova a cada chamada).
const quadros = new WeakMap();
const andando = new WeakSet();
export const quadroDesenhado = token => quadros.get(token) ?? null;

function desenhar(token, src) {
  if (!src || quadros.get(token) === src || !token.mesh) return;
  const textura = foundry.canvas.getTexture(src);
  if (!textura) { foundry.canvas.loadTexture(src).catch(() => null); return; }
  quadros.set(token, src);
  token.texture = textura;
  token.mesh.texture = textura;
  token.renderFlags.set({ refreshMesh: true, refreshSize: true });
}

function quadroDoMovimento(token) {
  const documento = token.document;
  const conjunto = ativoEm(documento?.actor);
  if (!conjunto || token.destroyed) return;
  desenhar(token, imagemDoToken(conjunto, { ...estadoDoAtor(documento.actor), andando: true }, documento.rotation)?.src);
  if (andando.has(token)) return;
  andando.add(token);
  Promise.resolve(token.movementAnimationPromise).catch(() => null).finally(() => {
    andando.delete(token);
    if (!quadros.has(token)) return;
    quadros.delete(token);
    if (!token.destroyed) token.renderFlags.set({ redraw: true });
  });
}

// A classe do token do sistema: só acrescenta o Caminhando à atualização de cada quadro da animação.
export function classeDoToken(Base) {
  return class TokenCPR extends Base {
    _onAnimationUpdate(mudancas, contexto) {
      super._onAnimationUpdate(mudancas, contexto);
      if (contexto?.name === this.movementAnimationName) quadroDoMovimento(this);
    }
  };
}

// A pré-carga: as imagens dos conjuntos ligados (os dos tokens dados e os conjuntos dados), para a troca (e o Caminhando)
// não piscar.
export async function preCarregar(tokens, conjuntos = []) {
  const fontes = new Set();
  for (const conjunto of [...(tokens ?? []).map(token => ativoEm(token?.actor)), ...conjuntos]) {
    if (conjunto?.ativo) for (const src of imagensDoConjunto(conjunto)) fontes.add(src);
  }
  if (fontes.size) await foundry.canvas.TextureLoader.loader.load([...fontes], { displayProgress: false });
  return [...fontes];
}

// A configuração da transição e a classe do token (no init, à parte dos ganchos: os testes do G3 registram só os ganchos).
export function registrarTelaDoTokenDinamico() {
  game.settings.register(SISTEMA, 'transicaoDoToken', {
    name: 'Token dinâmico: transição', hint: 'Como a imagem do token dinâmico troca quando o estado muda (a arma, o ferimento, caído, morto). A troca pela direção é sempre na hora.',
    scope: 'world', config: true, type: String, choices: TRANSICOES, default: 'glitch'
  });
  CONFIG.Token.objectClass = classeDoToken(CONFIG.Token.objectClass);
}

export function registrarTokenDinamico() {
  Hooks.on('canvasReady', tela => { preCarregar(tela.scene?.tokens).catch(erro => console.warn(`${SISTEMA} | token dinâmico`, erro)); });
  Hooks.on('createToken', token => { preCarregar([token]).catch(() => null); });
  // O giro do movimento (ou à mão) troca a imagem no mesmo update.
  // A troca pela direção é na hora (o movimento já anima o token, e o Caminhando é desenhado por cima).
  Hooks.on('preUpdateToken', (token, mudancas, opcoes) => {
    if (!('rotation' in mudancas) || foundry.utils.hasProperty(mudancas, 'texture.src')) return;
    const src = imagemPara(token, mudancas.rotation);
    if (!src || src === token._source.texture.src) return;
    foundry.utils.setProperty(mudancas, 'texture.src', src);
    opcoes.animation = { ...(opcoes.animation ?? {}), ...ANIMACAO_DA_DIRECAO };
  });
  // O token novo na cena já nasce com a imagem certa e em pé.
  Hooks.on('preCreateToken', (token, dados) => {
    const src = imagemPara(token, dados.rotation ?? 0);
    if (src) token.updateSource({ 'texture.src': src, lockRotation: true });
  });
  Hooks.on('updateActor', (ator, mudancas, opcoes, userId) => agendar(ator, userId));
  for (const gancho of ['createItem', 'updateItem', 'deleteItem', 'createActiveEffect', 'updateActiveEffect', 'deleteActiveEffect']) {
    Hooks.on(gancho, (documento, ...resto) => agendar(atorDe(documento), resto.at(-1)));
  }
  Hooks.on('renderTokenHUD', botaoNoHud);
}

export const API = { abrir: abrirTokenDinamico, salvarConjunto, aplicarNoAtor, imagemPara, estadoDoAtor, conjuntoDe, preCarregar, quadroDesenhado };

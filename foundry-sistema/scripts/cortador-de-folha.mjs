// O cortador da folha dos tokens dinâmicos (o C45, parte 3; as regras em regras-cortador.mjs): a janela "Cortar uma folha"
// (pelo botão da janela do token dinâmico, ou game.system.api.tokenDinamico.cortarFolha) abre a folha, mostra a grade por
// cima, e "Cortar e salvar" corta cada célula com a mesma caixa, grava cada quadro em WebP na pasta, com o nome padronizado,
// e põe os quadros no conjunto do ator (ligado, se marcado). A folha precisa ter fundo transparente: com os cantos opacos,
// o cortador recusa (o token mostraria o fundo). Enviar arquivos pede a permissão de upload do Foundry (o mestre, em geral).
// O C53 (as regras em regras-encaixe.mjs): com "Encaixar as figuras" (ligado na janela; na API, encaixar: true), o cortador
// acha cada figura inteira em vez de cortar pela grade, e cada quadro sai com QUADRO × QUADRO, a mesma escala e os pés na
// mesma linha, para todo personagem; o fundo liso sai. E o kit do ChatGPT: o molde cinza (os quadros encaixados de uma folha
// que já existe) para baixar e o prompt para copiar.
import { SISTEMA } from './config.mjs';
import { caixaComum, caixaOpaca, celulasDaGrade, DISPOSICAO_PADRAO, disposicaoValida, nomeBase, quadrosDaFolha, temFundo, TIPOS_DE_LINHA } from './regras-cortador.mjs';
import { cinzaDoManequim, encaixarFolha, LINHA_DOS_PES, moldeDaDisposicao, pixelsDaFigura, promptDoChatGPT, QUADRO } from './regras-encaixe.mjs';
import { NOMES_DAS_POSES, POSES_SEM_DIRECAO } from './regras-token-dinamico.mjs';
import { conjuntoDe, salvarConjunto } from './token-dinamico.mjs';
import { garantirPasta } from './pastas.mjs';

const esc = texto => foundry.utils.escapeHTML(String(texto ?? ''));
const { ApplicationV2 } = foundry.applications.api;
const ROTULO_DA_LINHA = { parado: 'Parado (8 direções)', caminhando: 'Caminhando (8 direções)', mirando: 'Mirando (8 direções)', poses: 'Poses (uma por coluna)', ignorar: 'Ignorar' };
export const ARQUIVO_DO_MOLDE = 'molde-do-token.png';

async function carregarImagem(src) {
  const imagem = document.createElement('img');
  imagem.src = src;
  await imagem.decode();
  return imagem;
}

// A folha desenhada num canvas (para ler os pixels).
async function lerFolha(src) {
  const imagem = await carregarImagem(src);
  const largura = imagem.naturalWidth, altura = imagem.naturalHeight;
  const tela = document.createElement('canvas');
  tela.width = largura;
  tela.height = altura;
  const pincel = tela.getContext('2d', { willReadFrequently: true });
  pincel.drawImage(imagem, 0, 0);
  return { tela, pincel, largura, altura };
}

const comoBlob = (tela, tipo, qualidade) => new Promise(resolver => tela.toBlob(resolver, tipo, qualidade));

// O encaixe da folha: cada figura no seu quadro (um canvas de QUADRO × QUADRO). Devolve { quadros: [{ chave, tela }],
// avisos, erros }; com erros, sem quadros.
export async function encaixarNoMolde(folha, disposicao = DISPOSICAO_PADRAO) {
  const { pincel, largura, altura } = await lerFolha(folha);
  const dados = pincel.getImageData(0, 0, largura, altura);
  const { plano, rotulos, erros, avisos } = encaixarFolha(dados.data, largura, altura, disposicao);
  const quadros = plano.map(item => {
    const figura = document.createElement('canvas');
    figura.width = item.origem.largura;
    figura.height = item.origem.altura;
    const doPincel = figura.getContext('2d');
    const pixels = doPincel.createImageData(item.origem.largura, item.origem.altura);
    pixels.data.set(pixelsDaFigura(dados.data, largura, rotulos, item));
    doPincel.putImageData(pixels, 0, 0);
    const tela = document.createElement('canvas');
    tela.width = tela.height = QUADRO;
    const p = tela.getContext('2d');
    p.imageSmoothingQuality = 'high';
    p.drawImage(figura, item.destino.x, item.destino.y, item.destino.largura, item.destino.altura);
    return { chave: item.chave, tela };
  });
  return { quadros, avisos, erros };
}

// O molde para o ChatGPT: os quadros encaixados de uma folha que já existe, em cinza, nas posições de moldeDaDisposicao.
// Devolve { tela, avisos, erros }; com erros, sem tela.
export async function moldeDaFolha(folha, disposicao = DISPOSICAO_PADRAO) {
  const { quadros, avisos, erros } = await encaixarNoMolde(folha, disposicao);
  if (erros.length) return { tela: null, avisos, erros };
  const molde = moldeDaDisposicao(disposicao);
  const tela = document.createElement('canvas');
  tela.width = molde.largura;
  tela.height = molde.altura;
  const pincel = tela.getContext('2d', { willReadFrequently: true });
  pincel.imageSmoothingQuality = 'high';
  for (const { chave, x, y, lado } of molde.posicoes) {
    const quadro = quadros.find(q => q.chave === chave);
    if (quadro) pincel.drawImage(quadro.tela, x, y, lado, lado);
  }
  const dados = pincel.getImageData(0, 0, tela.width, tela.height);
  cinzaDoManequim(dados.data);
  pincel.putImageData(dados, 0, 0);
  return { tela, avisos, erros };
}

// Grava os quadros (cada um num canvas) na pasta, com os nomes padronizados, e põe no conjunto do ator. Devolve { imagens }
// ou { erro }.
async function gravarQuadros({ ator, pasta, quadros, ligar }) {
  const FP = foundry.applications.apps.FilePicker.implementation;
  // Cada nível da pasta (o Foundry não cria a pasta-mãe: "tokens/qyan" sem "tokens" falhava calado).
  try { await garantirPasta(pasta); } catch (erro) { return { erro: `Não consegui preparar a pasta ${pasta}: ${erro.message}.` }; }
  const imagens = {};
  for (const { chave, arquivo, tela } of quadros) {
    const blob = await comoBlob(tela, 'image/webp', 0.92);
    const gravado = await FP.upload('data', pasta, new File([blob], arquivo, { type: 'image/webp' }), {}, { notify: false });
    // Sem o arquivo gravado, o conjunto não muda: o token não aponta para imagens que não existem.
    if (!gravado?.path) return { erro: `O Foundry não gravou ${arquivo} em ${pasta}: o conjunto do token não mudou.` };
    imagens[chave] = `${pasta}/${arquivo}`;
  }
  const antes = conjuntoDe(ator) ?? {};
  await salvarConjunto(ator, { ...antes, ativo: Boolean(ligar || antes.ativo), pasta, imagens: { ...(antes.imagens ?? {}), ...imagens } });
  return { imagens };
}

// Corta a folha e põe os quadros no conjunto do ator. Devolve { quadros, caixa, imagens } (com o encaixe, também os avisos)
// ou { erro }.
export async function cortarFolha({ ator, folha, nome, pasta, disposicao = DISPOSICAO_PADRAO, ligar = true, encaixar = false }) {
  if (!ator?.isOwner) return { erro: 'Só o dono do ator corta a folha dele.' };
  if (!game.user.can('FILES_UPLOAD')) return { erro: 'Cortar a folha envia arquivos: precisa da permissão de upload do Foundry (o mestre, em geral).' };
  if (!folha || !pasta) return { erro: 'Escolha a folha e a pasta.' };
  if (encaixar) {
    const disp = disposicaoValida(disposicao);
    const quadros = quadrosDaFolha(disp, nome);
    if (!quadros.length) return { erro: 'Nenhuma célula vira quadro: diga o que é cada linha.' };
    const { quadros: telas, avisos, erros } = await encaixarNoMolde(folha, disp);
    if (erros.length) return { erro: erros.join(' ') };
    const feito = await gravarQuadros({ ator, pasta, ligar, quadros: quadros.map(q => ({ ...q, tela: telas.find(t => t.chave === q.chave).tela })) });
    return feito.erro ? feito : { quadros: quadros.length, caixa: { x: 0, y: 0, largura: QUADRO, altura: QUADRO }, imagens: feito.imagens, avisos };
  }
  const { tela, pincel, largura, altura } = await lerFolha(folha);
  const alfaEm = (x, y) => pincel.getImageData(x, y, 1, 1).data[3];
  if (temFundo([alfaEm(0, 0), alfaEm(largura - 1, 0), alfaEm(0, altura - 1), alfaEm(largura - 1, altura - 1)])) {
    return { erro: 'A folha tem fundo (os cantos não são transparentes): exporte com o fundo transparente, ou o token mostra o fundo.' };
  }
  const disp = disposicaoValida(disposicao);
  const quadros = quadrosDaFolha(disp, nome);
  if (!quadros.length) return { erro: 'Nenhuma célula vira quadro: diga o que é cada linha.' };
  const celulas = celulasDaGrade({ largura, altura, colunas: disp.colunas, linhas: disp.linhas.length, rotulo: disp.rotulo });
  const celulaDe = quadro => celulas.find(c => c.linha === quadro.linha && c.coluna === quadro.coluna);
  // A caixa comum, pelo que não é transparente em cada célula usada.
  const caixas = quadros.map(quadro => {
    const c = celulaDe(quadro);
    const dados = pincel.getImageData(c.x, c.y, c.largura, c.altura).data;
    const alfa = new Uint8Array(c.largura * c.altura);
    for (let i = 0; i < alfa.length; i++) alfa[i] = dados[i * 4 + 3];
    return caixaOpaca(alfa, c.largura, c.altura);
  });
  const usadas = quadros.map(celulaDe);
  const caixa = caixaComum(caixas, { largura: Math.min(...usadas.map(c => c.largura)), altura: Math.min(...usadas.map(c => c.altura)) });
  const recortados = quadros.map(quadro => {
    const c = celulaDe(quadro);
    const saida = document.createElement('canvas');
    saida.width = caixa.largura;
    saida.height = caixa.altura;
    saida.getContext('2d').drawImage(tela, c.x + caixa.x, c.y + caixa.y, caixa.largura, caixa.altura, 0, 0, caixa.largura, caixa.altura);
    return { ...quadro, tela: saida };
  });
  const feito = await gravarQuadros({ ator, pasta, ligar, quadros: recortados });
  return feito.erro ? feito : { quadros: quadros.length, caixa, imagens: feito.imagens };
}

const moldeSalvo = () => { try { return game.settings.get(SISTEMA, 'moldeDaFolha') ?? ''; } catch { return ''; } };

export class JanelaCortador extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    tag: 'form', classes: [SISTEMA, 'cortador-de-folha', 'themed', 'theme-dark'],
    position: { width: 760, height: 'auto' }, window: { icon: 'fa-solid fa-scissors', resizable: true },
    form: { handler: JanelaCortador.#cortar, closeOnSubmit: false, submitOnChange: false },
    actions: {
      escolherFolha: JanelaCortador.#escolherFolha, escolherPasta: JanelaCortador.#escolherPasta, maisLinha: JanelaCortador.#maisLinha, menosLinha: JanelaCortador.#menosLinha,
      escolherMolde: JanelaCortador.#escolherMolde, baixarMolde: JanelaCortador.#baixarMolde, copiarPrompt: JanelaCortador.#copiarPrompt
    }
  };

  // O encaixe da prévia, guardado pela folha e pela disposição (redesenhar não encaixa de novo).
  #encaixe = null;

  constructor({ ator, ...opcoes }) {
    super({ ...opcoes, id: `${SISTEMA}-cortador-${ator.id}`, window: { title: `Cortar uma folha: ${ator.name}` } });
    this.ator = ator;
    const nome = nomeBase(ator.name);
    this.estado = { folha: '', nome, pasta: `tokens/${nome}`, ligar: true, encaixar: true, molde: moldeSalvo(), descricao: '', disposicao: foundry.utils.deepClone(DISPOSICAO_PADRAO) };
  }

  // O que está nos campos (para redesenhar a grade e a janela sem perder o que foi digitado).
  #lerCampos() {
    const campos = this.element?.querySelector('form') ?? this.element;
    if (!campos?.elements) return;
    const e = campos.elements;
    const disp = this.estado.disposicao;
    this.estado.folha = e.folha?.value ?? this.estado.folha;
    this.estado.nome = e.nome?.value ?? this.estado.nome;
    this.estado.pasta = e.pasta?.value ?? this.estado.pasta;
    this.estado.ligar = e.ligar?.checked ?? this.estado.ligar;
    this.estado.encaixar = e.encaixar?.checked ?? this.estado.encaixar;
    this.estado.molde = e.molde?.value ?? this.estado.molde;
    this.estado.descricao = e.descricao?.value ?? this.estado.descricao;
    disp.colunas = Number(e.colunas?.value) || disp.colunas;
    disp.rotulo = Number(e.rotulo?.value) || 0;
    disp.linhas = disp.linhas.map((linha, l) => ({ tipo: e[`linha-${l}`]?.value ?? linha.tipo, poses: Array.from({ length: disp.colunas }, (_, c) => e[`pose-${l}-${c}`]?.value ?? linha.poses?.[c] ?? '') }));
    this.estado.disposicao = disposicaoValida(disp);
  }

  async _renderHTML() {
    const { folha, nome, pasta, ligar, encaixar, molde, descricao, disposicao } = this.estado;
    const disp = disposicaoValida(disposicao);
    const opcao = (valor, rotulo, atual) => `<option value="${valor}"${valor === atual ? ' selected' : ''}>${esc(rotulo)}</option>`;
    const linhas = disp.linhas.map((linha, l) => `<div class="linha-da-folha"><span>Linha ${l + 1}</span><select name="linha-${l}">${TIPOS_DE_LINHA.map(t => opcao(t, ROTULO_DA_LINHA[t], linha.tipo)).join('')}</select>${linha.tipo === 'poses'
      ? `<div class="poses">${Array.from({ length: disp.colunas }, (_, c) => `<select name="pose-${l}-${c}" data-tooltip="Coluna ${c + 1}">${opcao('', '—', linha.poses[c])}${POSES_SEM_DIRECAO.map(p => opcao(p, NOMES_DAS_POSES[p], linha.poses[c])).join('')}</select>`).join('')}</div>` : ''}</div>`).join('');
    return `<div class="cortador-corpo">
      <fieldset class="chatgpt"><legend><i class="fa-solid fa-wand-magic-sparkles"></i> Fazer a folha no ChatGPT</legend>
        <div class="linha"><label>Molde (uma folha que já existe) <input type="text" name="molde" value="${esc(molde)}" placeholder="tokens/agente/folha.png"></label><button type="button" data-action="escolherMolde"><i class="fa-solid fa-image"></i> Escolher</button></div>
        <label class="descricao">O personagem (opcional se você mandar a imagem dele) <textarea name="descricao" rows="2" placeholder="Qyan, netrunner de casaco preto e gravata vermelha, implante no olho esquerdo">${esc(descricao)}</textarea></label>
        <div class="linha"><button type="button" data-action="baixarMolde"><i class="fa-solid fa-download"></i> Baixar o molde</button><button type="button" data-action="copiarPrompt"><i class="fa-solid fa-copy"></i> Copiar o prompt</button></div>
        <p class="dica">No ChatGPT, mande o molde, a imagem do personagem (se tiver) e o prompt. Baixe a imagem que ele fizer e escolha-a como a folha aqui embaixo (o Escolher envia o arquivo para o Foundry).</p>
      </fieldset>
      <div class="linha"><label>Folha <input type="text" name="folha" value="${esc(folha)}" placeholder="tokens/folha.png"></label><button type="button" data-action="escolherFolha"><i class="fa-solid fa-image"></i> Escolher</button></div>
      <div class="linha"><label>Nome nos arquivos <input type="text" name="nome" value="${esc(nome)}"></label><label>Pasta <input type="text" name="pasta" value="${esc(pasta)}"></label><button type="button" data-action="escolherPasta"><i class="fa-solid fa-folder-open"></i></button></div>
      <div class="linha"><label><input type="checkbox" name="encaixar"${encaixar ? ' checked' : ''}> Encaixar as figuras no molde (cada figura inteira, do mesmo tamanho e com os pés na mesma linha, em quadros de ${QUADRO} × ${QUADRO}; para a folha feita por IA)</label></div>
      <div class="linha"><label>Colunas <input type="number" name="colunas" min="1" max="16" value="${disp.colunas}"></label><label>Faixa do rótulo embaixo de cada célula <input type="number" name="rotulo" min="0" max="60" value="${disp.rotulo}">%</label>
        <button type="button" data-action="maisLinha"><i class="fa-solid fa-plus"></i> Linha</button><button type="button" data-action="menosLinha"><i class="fa-solid fa-minus"></i> Linha</button></div>
      ${linhas}
      <canvas class="previa" width="720" height="10"></canvas>
      <ul class="avisos"></ul>
      <p class="dica">A folha precisa de fundo transparente (encaixando, um fundo de uma cor só também sai). Nas linhas de 8 direções, as colunas são 0°, 45°... 315° na ordem da folha (o sentido se acerta na calibração da janela do token dinâmico). Pela grade, todos os quadros saem com o mesmo tamanho, aparados pelo que não é transparente; encaixando, a prévia mostra os quadros como vão ficar, com a linha dos pés.</p>
      <footer><label><input type="checkbox" name="ligar"${ligar ? ' checked' : ''}> Ligar o token dinâmico ao terminar</label><button type="submit"><i class="fa-solid fa-scissors"></i> Cortar e salvar</button></footer>
    </div>`;
  }

  _replaceHTML(resultado, conteudo) {
    conteudo.innerHTML = resultado;
    // Um tratador só (o conteúdo fica entre os desenhos da janela).
    conteudo.onchange = evento => {
      if (!evento.target.name) return;
      this.#lerCampos();
      if (['molde', 'descricao'].includes(evento.target.name)) return;
      if (['colunas'].includes(evento.target.name) || evento.target.name.startsWith('linha-')) this.render();
      else this.#desenharPrevia();
    };
    this.#desenharPrevia();
  }

  // A prévia: pela grade, a folha reduzida, com a grade e a faixa do rótulo escurecida; encaixando, os quadros encaixados,
  // com a linha dos pés, e os erros e avisos embaixo.
  async #desenharPrevia() {
    const tela = this.element?.querySelector('canvas.previa');
    const lista = this.element?.querySelector('ul.avisos');
    const { folha, disposicao, encaixar } = this.estado;
    if (lista) lista.innerHTML = '';
    if (!tela || !folha) return;
    const disp = disposicaoValida(disposicao);
    if (encaixar) return this.#desenharEncaixe(tela, lista, folha, disp);
    let imagem;
    try { imagem = await carregarImagem(folha); } catch { return; }
    const escala = tela.width / imagem.naturalWidth;
    tela.height = Math.round(imagem.naturalHeight * escala);
    const pincel = tela.getContext('2d');
    pincel.clearRect(0, 0, tela.width, tela.height);
    pincel.drawImage(imagem, 0, 0, tela.width, tela.height);
    const celulas = celulasDaGrade({ largura: imagem.naturalWidth, altura: imagem.naturalHeight, colunas: disp.colunas, linhas: disp.linhas.length, rotulo: disp.rotulo });
    const alturaDaLinha = imagem.naturalHeight / Math.max(1, disp.linhas.length);
    pincel.strokeStyle = '#f3e600';
    for (const c of celulas) {
      pincel.strokeRect(c.x * escala, c.y * escala, c.largura * escala, c.altura * escala);
      pincel.fillStyle = 'rgba(0, 0, 0, 0.55)';
      pincel.fillRect(c.x * escala, (c.y + c.altura) * escala, c.largura * escala, (alturaDaLinha - c.altura) * escala);
    }
  }

  async #desenharEncaixe(tela, lista, folha, disp) {
    const chave = `${folha}|${JSON.stringify(disp)}`;
    if (this.#encaixe?.chave !== chave) this.#encaixe = { chave, promessa: encaixarNoMolde(folha, disp) };
    let resultado;
    try { resultado = await this.#encaixe.promessa; } catch { return; }
    if (this.#encaixe?.chave !== chave || this.estado.encaixar === false) return;
    const { quadros, avisos, erros } = resultado;
    const lado = tela.width / disp.colunas;
    tela.height = Math.round(lado * disp.linhas.length);
    const pincel = tela.getContext('2d');
    pincel.clearRect(0, 0, tela.width, tela.height);
    for (const { linha, coluna, chave: daCelula } of quadrosDaFolha(disp, 'previa')) {
      const quadro = quadros.find(q => q.chave === daCelula);
      if (quadro) pincel.drawImage(quadro.tela, coluna * lado, linha * lado, lado, lado);
    }
    pincel.strokeStyle = 'rgba(243, 230, 0, 0.45)';
    for (let l = 0; l < disp.linhas.length; l++) {
      pincel.beginPath();
      pincel.moveTo(0, (l + LINHA_DOS_PES) * lado);
      pincel.lineTo(tela.width, (l + LINHA_DOS_PES) * lado);
      pincel.stroke();
    }
    if (lista) lista.innerHTML = [...erros.map(t => `<li class="erro">${esc(t)}</li>`), ...avisos.map(t => `<li>${esc(t)}</li>`)].join('');
  }

  static #escolherFolha() {
    this.#lerCampos();
    new foundry.applications.apps.FilePicker.implementation({ type: 'image', current: this.estado.folha, callback: src => { this.estado.folha = src; this.element.querySelector('[name="folha"]').value = src; this.#desenharPrevia(); } }).render(true);
  }

  static #escolherPasta() {
    this.#lerCampos();
    new foundry.applications.apps.FilePicker.implementation({ type: 'folder', current: this.estado.pasta, callback: pasta => { this.estado.pasta = pasta; this.element.querySelector('[name="pasta"]').value = pasta; } }).render(true);
  }

  static #escolherMolde() {
    this.#lerCampos();
    new foundry.applications.apps.FilePicker.implementation({ type: 'image', current: this.estado.molde, callback: src => { this.estado.molde = src; this.element.querySelector('[name="molde"]').value = src; } }).render(true);
  }

  // Baixa o molde (o PNG cinza) e guarda a folha usada como molde, para a próxima vez.
  static async #baixarMolde() {
    this.#lerCampos();
    const { molde, disposicao } = this.estado;
    if (!molde) return ui.notifications.warn('Escolha o molde: uma folha que já existe (a do Agente, a do Qyan...).');
    try {
      const feito = await moldeDaFolha(molde, disposicao);
      if (feito.erros.length) return ui.notifications.warn(`O molde não encaixou: ${feito.erros.join(' ')}`);
      foundry.utils.saveDataToFile(await comoBlob(feito.tela, 'image/png'), 'image/png', ARQUIVO_DO_MOLDE);
      await game.settings.set(SISTEMA, 'moldeDaFolha', molde);
      ui.notifications.info(`Molde baixado (${ARQUIVO_DO_MOLDE}): mande no ChatGPT, com o prompt.`);
    } catch (erro) {
      ui.notifications.error(`Não consegui fazer o molde (${erro.message}).`);
    }
  }

  static async #copiarPrompt() {
    this.#lerCampos();
    const { descricao, disposicao } = this.estado;
    await game.clipboard.copyPlainText(promptDoChatGPT({ descricao, disposicao }));
    ui.notifications.info('Prompt copiado: cole no ChatGPT, com o molde e a imagem do personagem.');
  }

  static #maisLinha() {
    this.#lerCampos();
    this.estado.disposicao.linhas.push({ tipo: 'ignorar' });
    this.render();
  }

  static #menosLinha() {
    this.#lerCampos();
    if (this.estado.disposicao.linhas.length > 1) this.estado.disposicao.linhas.pop();
    this.render();
  }

  static async #cortar() {
    this.#lerCampos();
    const { folha, nome, pasta, ligar, encaixar, disposicao } = this.estado;
    const botao = this.element.querySelector('button[type="submit"]');
    botao.disabled = true;
    try {
      const feito = await cortarFolha({ ator: this.ator, folha, nome, pasta, disposicao, ligar, encaixar });
      if (feito.erro) return ui.notifications.warn(feito.erro);
      if (feito.avisos?.length) ui.notifications.warn(`${feito.quadros} quadros salvos em ${pasta}, mas confira: ${feito.avisos.join(' ')}`, { permanent: true });
      else ui.notifications.info(`${feito.quadros} quadros cortados e salvos em ${pasta}.`);
      await this.close();
    } catch (erro) {
      ui.notifications.error(`Não consegui cortar a folha (${erro.message}).`);
    } finally {
      if (this.rendered) botao.disabled = false;
    }
  }
}

export function abrirCortador(ator) {
  if (!ator?.isOwner || ator.type === 'veiculo') return null;
  return new JanelaCortador({ ator }).render({ force: true });
}

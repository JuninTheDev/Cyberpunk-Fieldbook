// O cortador da folha dos tokens dinâmicos (o C45, parte 3; as regras em regras-cortador.mjs): a janela "Cortar uma folha"
// (pelo botão da janela do token dinâmico, ou game.system.api.tokenDinamico.cortarFolha) abre a folha, mostra a grade por
// cima, e "Cortar e salvar" corta cada célula com a mesma caixa, grava cada quadro em WebP na pasta, com o nome padronizado,
// e põe os quadros no conjunto do ator (ligado, se marcado). A folha precisa ter fundo transparente: com os cantos opacos,
// o cortador recusa (o token mostraria o fundo). Enviar arquivos pede a permissão de upload do Foundry (o mestre, em geral).
import { SISTEMA } from './config.mjs';
import { caixaComum, caixaOpaca, celulasDaGrade, DISPOSICAO_PADRAO, disposicaoValida, nomeBase, quadrosDaFolha, temFundo, TIPOS_DE_LINHA } from './regras-cortador.mjs';
import { NOMES_DAS_POSES, POSES_SEM_DIRECAO } from './regras-token-dinamico.mjs';
import { conjuntoDe, salvarConjunto } from './token-dinamico.mjs';

const esc = texto => foundry.utils.escapeHTML(String(texto ?? ''));
const { ApplicationV2 } = foundry.applications.api;
const ROTULO_DA_LINHA = { parado: 'Parado (8 direções)', caminhando: 'Caminhando (8 direções)', mirando: 'Mirando (8 direções)', poses: 'Poses (uma por coluna)', ignorar: 'Ignorar' };

async function carregarImagem(src) {
  const imagem = document.createElement('img');
  imagem.src = src;
  await imagem.decode();
  return imagem;
}

// Corta a folha e põe os quadros no conjunto do ator. Devolve { quadros, caixa, imagens } ou { erro }.
export async function cortarFolha({ ator, folha, nome, pasta, disposicao = DISPOSICAO_PADRAO, ligar = true }) {
  if (!ator?.isOwner) return { erro: 'Só o dono do ator corta a folha dele.' };
  if (!game.user.can('FILES_UPLOAD')) return { erro: 'Cortar a folha envia arquivos: precisa da permissão de upload do Foundry (o mestre, em geral).' };
  if (!folha || !pasta) return { erro: 'Escolha a folha e a pasta.' };
  const imagem = await carregarImagem(folha);
  const largura = imagem.naturalWidth, altura = imagem.naturalHeight;
  const tela = document.createElement('canvas');
  tela.width = largura;
  tela.height = altura;
  const pincel = tela.getContext('2d', { willReadFrequently: true });
  pincel.drawImage(imagem, 0, 0);
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
  const FP = foundry.applications.apps.FilePicker.implementation;
  try { await FP.createDirectory('data', pasta, {}); } catch { /* a pasta já existe */ }
  const imagens = {};
  for (const quadro of quadros) {
    const c = celulaDe(quadro);
    const saida = document.createElement('canvas');
    saida.width = caixa.largura;
    saida.height = caixa.altura;
    saida.getContext('2d').drawImage(tela, c.x + caixa.x, c.y + caixa.y, caixa.largura, caixa.altura, 0, 0, caixa.largura, caixa.altura);
    const blob = await new Promise(resolver => saida.toBlob(resolver, 'image/webp', 0.92));
    await FP.upload('data', pasta, new File([blob], quadro.arquivo, { type: 'image/webp' }), {}, { notify: false });
    imagens[quadro.chave] = `${pasta}/${quadro.arquivo}`;
  }
  const antes = conjuntoDe(ator) ?? {};
  await salvarConjunto(ator, { ...antes, ativo: Boolean(ligar || antes.ativo), pasta, imagens: { ...(antes.imagens ?? {}), ...imagens } });
  return { quadros: quadros.length, caixa, imagens };
}

export class JanelaCortador extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    tag: 'form', classes: [SISTEMA, 'cortador-de-folha', 'themed', 'theme-dark'],
    position: { width: 760, height: 'auto' }, window: { icon: 'fa-solid fa-scissors', resizable: true },
    form: { handler: JanelaCortador.#cortar, closeOnSubmit: false, submitOnChange: false },
    actions: { escolherFolha: JanelaCortador.#escolherFolha, escolherPasta: JanelaCortador.#escolherPasta, maisLinha: JanelaCortador.#maisLinha, menosLinha: JanelaCortador.#menosLinha }
  };

  constructor({ ator, ...opcoes }) {
    super({ ...opcoes, id: `${SISTEMA}-cortador-${ator.id}`, window: { title: `Cortar uma folha: ${ator.name}` } });
    this.ator = ator;
    const nome = nomeBase(ator.name);
    this.estado = { folha: '', nome, pasta: `tokens/${nome}`, ligar: true, disposicao: foundry.utils.deepClone(DISPOSICAO_PADRAO) };
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
    disp.colunas = Number(e.colunas?.value) || disp.colunas;
    disp.rotulo = Number(e.rotulo?.value) || 0;
    disp.linhas = disp.linhas.map((linha, l) => ({ tipo: e[`linha-${l}`]?.value ?? linha.tipo, poses: Array.from({ length: disp.colunas }, (_, c) => e[`pose-${l}-${c}`]?.value ?? linha.poses?.[c] ?? '') }));
    this.estado.disposicao = disposicaoValida(disp);
  }

  async _renderHTML() {
    const { folha, nome, pasta, ligar, disposicao } = this.estado;
    const disp = disposicaoValida(disposicao);
    const opcao = (valor, rotulo, atual) => `<option value="${valor}"${valor === atual ? ' selected' : ''}>${esc(rotulo)}</option>`;
    const linhas = disp.linhas.map((linha, l) => `<div class="linha-da-folha"><span>Linha ${l + 1}</span><select name="linha-${l}">${TIPOS_DE_LINHA.map(t => opcao(t, ROTULO_DA_LINHA[t], linha.tipo)).join('')}</select>${linha.tipo === 'poses'
      ? `<div class="poses">${Array.from({ length: disp.colunas }, (_, c) => `<select name="pose-${l}-${c}" data-tooltip="Coluna ${c + 1}">${opcao('', '—', linha.poses[c])}${POSES_SEM_DIRECAO.map(p => opcao(p, NOMES_DAS_POSES[p], linha.poses[c])).join('')}</select>`).join('')}</div>` : ''}</div>`).join('');
    return `<div class="cortador-corpo">
      <div class="linha"><label>Folha <input type="text" name="folha" value="${esc(folha)}" placeholder="tokens/folha.png"></label><button type="button" data-action="escolherFolha"><i class="fa-solid fa-image"></i> Escolher</button></div>
      <div class="linha"><label>Nome nos arquivos <input type="text" name="nome" value="${esc(nome)}"></label><label>Pasta <input type="text" name="pasta" value="${esc(pasta)}"></label><button type="button" data-action="escolherPasta"><i class="fa-solid fa-folder-open"></i></button></div>
      <div class="linha"><label>Colunas <input type="number" name="colunas" min="1" max="16" value="${disp.colunas}"></label><label>Faixa do rótulo embaixo de cada célula <input type="number" name="rotulo" min="0" max="60" value="${disp.rotulo}">%</label>
        <button type="button" data-action="maisLinha"><i class="fa-solid fa-plus"></i> Linha</button><button type="button" data-action="menosLinha"><i class="fa-solid fa-minus"></i> Linha</button></div>
      ${linhas}
      <canvas class="previa" width="720" height="10"></canvas>
      <p class="dica">A folha precisa de fundo transparente. Nas linhas de 8 direções, as colunas são 0°, 45°... 315° na ordem da folha (o sentido se acerta na calibração da janela do token dinâmico). Todos os quadros saem com o mesmo tamanho, aparados pelo que não é transparente.</p>
      <footer><label><input type="checkbox" name="ligar"${ligar ? ' checked' : ''}> Ligar o token dinâmico ao terminar</label><button type="submit"><i class="fa-solid fa-scissors"></i> Cortar e salvar</button></footer>
    </div>`;
  }

  _replaceHTML(resultado, conteudo) {
    conteudo.innerHTML = resultado;
    // Um tratador só (o conteúdo fica entre os desenhos da janela).
    conteudo.onchange = evento => {
      if (!evento.target.name) return;
      this.#lerCampos();
      if (['colunas'].includes(evento.target.name) || evento.target.name.startsWith('linha-')) this.render();
      else this.#desenharPrevia();
    };
    this.#desenharPrevia();
  }

  // A prévia: a folha reduzida, com a grade e a faixa do rótulo escurecida.
  async #desenharPrevia() {
    const tela = this.element?.querySelector('canvas.previa');
    const { folha, disposicao } = this.estado;
    if (!tela || !folha) return;
    let imagem;
    try { imagem = await carregarImagem(folha); } catch { return; }
    const escala = tela.width / imagem.naturalWidth;
    tela.height = Math.round(imagem.naturalHeight * escala);
    const pincel = tela.getContext('2d');
    pincel.clearRect(0, 0, tela.width, tela.height);
    pincel.drawImage(imagem, 0, 0, tela.width, tela.height);
    const disp = disposicaoValida(disposicao);
    const celulas = celulasDaGrade({ largura: imagem.naturalWidth, altura: imagem.naturalHeight, colunas: disp.colunas, linhas: disp.linhas.length, rotulo: disp.rotulo });
    const alturaDaLinha = imagem.naturalHeight / Math.max(1, disp.linhas.length);
    pincel.strokeStyle = '#f3e600';
    for (const c of celulas) {
      pincel.strokeRect(c.x * escala, c.y * escala, c.largura * escala, c.altura * escala);
      pincel.fillStyle = 'rgba(0, 0, 0, 0.55)';
      pincel.fillRect(c.x * escala, (c.y + c.altura) * escala, c.largura * escala, (alturaDaLinha - c.altura) * escala);
    }
  }

  static #escolherFolha() {
    this.#lerCampos();
    new foundry.applications.apps.FilePicker.implementation({ type: 'image', current: this.estado.folha, callback: src => { this.estado.folha = src; this.element.querySelector('[name="folha"]').value = src; this.#desenharPrevia(); } }).render(true);
  }

  static #escolherPasta() {
    this.#lerCampos();
    new foundry.applications.apps.FilePicker.implementation({ type: 'folder', current: this.estado.pasta, callback: pasta => { this.estado.pasta = pasta; this.element.querySelector('[name="pasta"]').value = pasta; } }).render(true);
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
    const { folha, nome, pasta, ligar, disposicao } = this.estado;
    const botao = this.element.querySelector('button[type="submit"]');
    botao.disabled = true;
    try {
      const feito = await cortarFolha({ ator: this.ator, folha, nome, pasta, disposicao, ligar });
      if (feito.erro) return ui.notifications.warn(feito.erro);
      ui.notifications.info(`${feito.quadros} quadros cortados e salvos em ${pasta}.`);
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

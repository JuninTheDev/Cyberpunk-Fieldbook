// A árvore do diretório do CORE 0.92.4, pelo renderItemDirectory do ApplicationV2 (HTMLElement, sem jQuery).
import { SISTEMA } from './config.mjs';
import { podeConsultarItem } from './instalados.mjs';
import { arvoreDeInstalados } from './regras-instalados.mjs';

const buscas = new WeakMap(), consultas = new WeakMap(), gravacoes = new WeakMap();

export function abrirConsultaDeInstalado(id) {
  const item = game.items.get(id);
  if (!podeConsultarItem(item)) return null;
  let consulta = consultas.get(item);
  if (!consulta) {
    const Ficha = item.sheet.constructor;
    class ConsultaDeInstalado extends Ficha {
      get isEditable() { return false; }
      _processSubmitData() { /* Uma consulta não grava, inclusive por envio programático do formulário. */ }
      _onClickAction(evento, alvo) {
        if (Object.hasOwn(Ficha.DEFAULT_OPTIONS.actions ?? {}, alvo.dataset.action)) return;
        return super._onClickAction(evento, alvo);
      }
    }
    consulta = new ConsultaDeInstalado({ document: item, uniqueId: `consulta-${item.id}`, ownershipConfig: false, sheetConfig: false });
    consultas.set(item, consulta);
  }
  consulta.render({ force: true });
  return consulta;
}

function guardarExpansao(id, aberto) {
  const usuario = game.user;
  const gravar = (gravacoes.get(usuario) ?? Promise.resolve()).catch(() => {}).then(() => usuario.setFlag(SISTEMA, `instaladosAbertos.${id}`, aberto));
  gravacoes.set(usuario, gravar);
  gravar.catch(erro => console.error(`${SISTEMA} | árvore dos instalados`, erro));
}

export function montarArvoreNoDiretorio(aplicacao, elemento) {
  // Os renders parciais conservam parte do DOM: remover só o que este gancho acrescentou evita duplicar controles.
  for (const anterior of elemento.querySelectorAll('.cprf-arvore-instalados, .cprf-expandir-instalados')) anterior.remove();
  for (const linha of elemento.querySelectorAll('.cprf-item-instalado')) linha.classList.remove('cprf-item-instalado');
  const linhas = new Map([...elemento.querySelectorAll('li[data-document-id], li[data-entry-id]')]
    .map(linha => [linha.dataset.documentId ?? linha.dataset.entryId, linha]).filter(([id]) => game.items.has(id)));
  const itens = game.items.filter(item => linhas.has(item.id) && podeConsultarItem(item));
  const arvore = arvoreDeInstalados(itens), doc = elemento.ownerDocument, grupos = [];
  for (const raiz of arvore.filter(raiz => raiz.linhas.length)) {
    const pai = linhas.get(raiz.id), item = game.items.get(raiz.id);
    const botao = doc.createElement('button'); botao.type = 'button'; botao.className = 'cprf-expandir-instalados';
    botao.setAttribute('aria-label', `Itens instalados em ${item.name}`);
    botao.dataset.aberto = String(game.user.getFlag(SISTEMA, 'instaladosAbertos')?.[raiz.id] === true);
    const bloco = doc.createElement('li'); bloco.className = 'cprf-arvore-instalados'; bloco.dataset.raiz = raiz.id;
    const lista = doc.createElement('ol'); lista.setAttribute('aria-label', `Itens instalados em ${item.name}`); bloco.append(lista);
    for (const filho of raiz.linhas) {
      const entrada = doc.createElement('li'), ver = doc.createElement('button');
      entrada.style.paddingInlineStart = `${filho.profundidade * 12}px`;
      ver.type = 'button'; ver.className = 'cprf-consultar-instalado'; ver.dataset.itemId = filho.id;
      ver.textContent = game.items.get(filho.id).name; ver.title = `Consultar ${ver.textContent}`;
      ver.addEventListener('click', evento => { evento.preventDefault(); evento.stopPropagation(); abrirConsultaDeInstalado(filho.id); });
      entrada.append(ver); lista.append(entrada);
    }
    const atualizar = () => {
      const aberto = botao.dataset.aberto === 'true';
      botao.setAttribute('aria-expanded', String(aberto)); botao.textContent = aberto ? '▾' : '▸'; bloco.hidden = !aberto;
    };
    botao.addEventListener('click', evento => {
      evento.preventDefault(); evento.stopPropagation();
      botao.dataset.aberto = String(botao.dataset.aberto !== 'true'); atualizar();
      guardarExpansao(raiz.id, botao.dataset.aberto === 'true');
    });
    atualizar(); pai.append(botao); pai.after(bloco); grupos.push({ botao, bloco });
  }
  // Durante a busca, o Foundry filtra as linhas originais. Não esconda nelas um componente só porque o pai não bateu.
  const sincronizarBusca = () => {
    const buscando = Boolean(elemento.querySelector('input[name="search"], input[type="search"]')?.value.trim());
    for (const raiz of arvore) for (const filho of raiz.linhas) linhas.get(filho.id).classList.toggle('cprf-item-instalado', !buscando);
    for (const { botao, bloco } of grupos) {
      botao.hidden = buscando;
      bloco.hidden = buscando || botao.dataset.aberto !== 'true';
    }
  };
  const anterior = buscas.get(elemento);
  if (anterior) elemento.removeEventListener('input', anterior);
  elemento.addEventListener('input', sincronizarBusca); buscas.set(elemento, sincronizarBusca); sincronizarBusca();
}

export function registrarDiretorioDeItens() { Hooks.on('renderItemDirectory', montarArvoreNoDiretorio); }

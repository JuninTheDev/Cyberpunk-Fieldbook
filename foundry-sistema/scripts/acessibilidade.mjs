// O ApplicationV2 delega o clique ao [data-action] mais próximo e entrega esse elemento ao tratador.
// O teclado usa o mesmo caminho, inclusive os modificadores (Ctrl, Shift e os demais).
const preparados = new WeakSet();

// O prose-mirror não copia o nome do elemento externo para o botão de editar nem para o campo que abre.
function nomearEditor(editor) {
  const nome = editor.getAttribute('aria-label');
  editor.querySelector('button.toggle')?.setAttribute('aria-label', `Editar ${nome}`);
  const campo = editor.querySelector('[contenteditable="true"]');
  if (campo) {
    campo.setAttribute('aria-label', nome);
    campo.setAttribute('role', 'textbox');
    campo.setAttribute('aria-multiline', 'true');
  }
}

export function prepararAcessibilidade(elemento) {
  for (const editor of elemento.querySelectorAll('prose-mirror[aria-label]')) nomearEditor(editor);
  if (preparados.has(elemento)) return;
  preparados.add(elemento);
  // O evento open do editor não borbulha no Foundry 14; a captura também atende editores de partes redesenhadas.
  elemento.addEventListener('open', evento => {
    if (evento.target.matches('prose-mirror[aria-label]')) nomearEditor(evento.target);
  }, true);
  elemento.addEventListener('keydown', evento => {
    if (evento.defaultPrevented || evento.isComposing || !['Enter', ' '].includes(evento.key)) return;
    const alvo = evento.target.closest('[data-action]');
    if (!alvo || !elemento.contains(alvo) || !alvo.matches('[role="button"][tabindex="0"], [role="tab"][tabindex="0"]')) return;
    // Botões e campos já têm teclado nativo; não dispare uma segunda ação nem capture a edição de um campo filho.
    if (evento.target.closest('button, a[href], input, select, textarea, [contenteditable="true"]')) return;
    if (alvo.matches(':disabled, [aria-disabled="true"]') || alvo.closest('[inert]')) return;
    evento.preventDefault();
    if (evento.repeat) return;
    const { ctrlKey, metaKey, shiftKey, altKey } = evento;
    alvo.dispatchEvent(new elemento.ownerDocument.defaultView.MouseEvent('click', {
      bubbles: true, cancelable: true, button: 0, ctrlKey, metaKey, shiftKey, altKey
    }));
  });
}

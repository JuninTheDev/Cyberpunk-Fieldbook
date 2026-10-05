// Pop-ups da wiki, no lugar das caixas do navegador (alert, confirm e prompt): janelas no visual da wiki,
// com Esc ou clique fora para cancelar, e avisos rápidos no canto da tela que somem sozinhos.
// Tudo devolve uma Promise:
//   wikiPopup.confirm({ title, message, html, ok, cancel, danger })  → true ou false
//   wikiPopup.prompt({ title, message, label, value, placeholder, ok, multiline, maxlength, danger }) → texto ou null
//   wikiPopup.alert({ title, message, html, ok })                     → quando fechar
//   wikiPopup.copy({ title, message, value })                         → quando fechar (campo pronto para copiar)
//   wikiPopup.toast(texto, { tone: 'ok' | 'bad', ms })                → aviso no canto, sem esperar ninguém
// `message` é texto puro; `html` só recebe conteúdo já escapado.
(() => {
  const esc = text => String(text ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const supported = typeof HTMLDialogElement === 'function';
  let counter = 0;

  // A janela: título, texto, um campo opcional e os botões. Devolve o valor do botão escolhido
  // (o do campo, se o botão for o de confirmar) ou `cancelValue` com Esc ou clique fora.
  function open({ title, message = '', html = '', field = null, ok, cancel, danger = false, cancelValue, extra = '', quietOk = false }) {
    return new Promise(resolve => {
      const id = `popup-${++counter}`;
      const before = document.activeElement;
      const dialog = document.createElement('dialog');
      dialog.className = `popup${danger ? ' popup-danger' : ''}`;
      dialog.setAttribute('aria-labelledby', `${id}-title`);
      const input = field ? (field.multiline
        ? `<textarea id="${id}-field" rows="3"${field.maxlength ? ` maxlength="${field.maxlength}"` : ''} placeholder="${esc(field.placeholder || '')}"${field.readOnly ? ' readonly' : ''}>${esc(field.value || '')}</textarea>`
        : `<input id="${id}-field" type="text" value="${esc(field.value || '')}"${field.maxlength ? ` maxlength="${field.maxlength}"` : ''} placeholder="${esc(field.placeholder || '')}"${field.readOnly ? ' readonly' : ''} autocomplete="off">`) : '';
      dialog.innerHTML = `<form method="dialog" class="popup-box">
        <h2 class="popup-title" id="${id}-title">${esc(title)}</h2>
        <div class="popup-body">${message ? `<p>${esc(message)}</p>` : ''}${html}${field ? `<label class="popup-field" for="${id}-field">${field.label ? `<span>${esc(field.label)}</span>` : ''}${input}</label>` : ''}</div>
        <div class="popup-buttons">${extra}${cancel ? `<button type="button" class="action popup-cancel" data-popup-cancel>${esc(cancel)}</button>` : ''}<button type="submit" class="action${danger ? ' cc-danger' : ''}${quietOk ? ' popup-cancel' : ''}" data-popup-ok>${esc(ok)}</button></div>
      </form>`;
      document.body.append(dialog);
      const fieldEl = dialog.querySelector(`#${id}-field`);
      let done = false;
      const finish = value => {
        if (done) return;
        done = true;
        dialog.classList.add('popup-closing');
        setTimeout(() => {
          dialog.close();
          dialog.remove();
          if (before && typeof before.focus === 'function' && document.contains(before)) before.focus();
        }, 120);
        resolve(value);
      };
      dialog.querySelector('form').addEventListener('submit', event => {
        event.preventDefault();
        finish(field && !field.readOnly ? fieldEl.value : true);
      });
      dialog.addEventListener('click', event => {
        if (event.target.closest('[data-popup-cancel]')) return finish(cancelValue);
        // Clique no fundo escuro (fora da caixa) cancela.
        if (event.target === dialog) {
          const box = dialog.querySelector('.popup-box').getBoundingClientRect();
          if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) finish(cancelValue);
        }
      });
      dialog.addEventListener('cancel', event => { event.preventDefault(); finish(cancelValue); });
      dialog.showModal();
      // Foco: no campo; numa ação perigosa, no Cancelar (Enter sem querer não apaga nada); senão, no botão principal.
      if (fieldEl) { fieldEl.focus(); if (field.readOnly || field.selectAll) fieldEl.select(); }
      else (danger && cancel ? dialog.querySelector('[data-popup-cancel]') : dialog.querySelector('[data-popup-ok]')).focus();
      if (field && field.onReady) field.onReady(fieldEl, dialog);
    });
  }

  function confirm({ title = 'Confirmar', message = '', html = '', ok = 'Confirmar', cancel = 'Cancelar', danger = false } = {}) {
    if (!supported) return Promise.resolve(window.confirm([title, message].filter(Boolean).join('\n\n')));
    return open({ title, message, html, ok, cancel, danger, cancelValue: false }).then(Boolean);
  }

  function prompt({ title = 'Escreva', message = '', html = '', label = '', value = '', placeholder = '', ok = 'OK', cancel = 'Cancelar', multiline = false, maxlength = 0, danger = false } = {}) {
    if (!supported) return Promise.resolve(window.prompt([title, message, label].filter(Boolean).join('\n\n'), value));
    return open({ title, message, html, ok, cancel, danger, cancelValue: null, field: { label, value, placeholder, multiline, maxlength, selectAll: Boolean(value) } });
  }

  function alert({ title = 'Aviso', message = '', html = '', ok = 'Entendi' } = {}) {
    if (!supported) { window.alert([title, message].filter(Boolean).join('\n\n')); return Promise.resolve(); }
    return open({ title, message, html, ok, cancelValue: undefined }).then(() => undefined);
  }

  // Mostra um texto pronto para copiar (quando o navegador não deixa copiar sozinho, como fora do HTTPS).
  function copy({ title = 'Copiar', message = '', value = '' } = {}) {
    if (!supported) { window.prompt(title, value); return Promise.resolve(); }
    return open({
      title, message, ok: 'Fechar', cancelValue: undefined, quietOk: true,
      extra: '<button type="button" class="action popup-copy" data-popup-copy>Copiar</button>',
      field: {
        value, readOnly: true,
        onReady(fieldEl, dialog) {
          const button = dialog.querySelector('[data-popup-copy]');
          button.onclick = async () => {
            fieldEl.select();
            let copied = false;
            try { await navigator.clipboard.writeText(value); copied = true; } catch { try { copied = document.execCommand('copy'); } catch { /* sem cópia */ } }
            button.textContent = copied ? 'Copiado' : 'Selecione e copie';
          };
        }
      }
    }).then(() => undefined);
  }

  // Avisos rápidos no canto: empilham, somem sozinhos e saem com um clique.
  function toast(text, { tone = '', ms = 4000 } = {}) {
    let stack = document.querySelector('.toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      stack.setAttribute('role', 'status');
      stack.setAttribute('aria-live', 'polite');
      document.body.append(stack);
    }
    const item = document.createElement('div');
    item.className = `toast${tone ? ` toast-${tone}` : ''}`;
    item.textContent = text;
    const close = () => { item.classList.add('toast-out'); setTimeout(() => item.remove(), 200); };
    item.onclick = close;
    stack.append(item);
    setTimeout(close, ms);
    return item;
  }

  window.wikiPopup = { confirm, prompt, alert, copy, toast };
})();

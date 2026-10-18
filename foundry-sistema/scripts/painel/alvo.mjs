// Escolher o alvo no mapa antes do ataque. O cursor vira uma mira:
// - clique num token: ele vira o alvo (os outros alvos saem) e o ataque segue;
// - clique no chão: o ataque segue sem alvo;
// - Esc, o botão direito ou um clique fora do mapa: cancela o ataque.
const PAINEL = '#painel-tatico';
let ativo = false;
const ultimo = { x: 0, y: 0 };
window.addEventListener('pointermove', evento => { ultimo.x = evento.clientX; ultimo.y = evento.clientY; }, true);

export const escolhendo = () => ativo;

function tokenSob(evento, ignorar) {
  const tokens = (canvas.tokens?.placeables || []).filter(token => token.visible && token.id !== ignorar);
  const emCima = tokens.find(token => token.hover);
  if (emCima) return emCima;
  try {
    const ponto = canvas.canvasCoordinatesFromClient({ x: evento.clientX, y: evento.clientY });
    return tokens.filter(token => token.bounds.contains(ponto.x, ponto.y)).sort((a, b) => b.zIndex - a.zIndex)[0] || null;
  } catch {
    return null;
  }
}

// Devolve 'alvo' (marcou um), 'sem' (clicou no chão) ou null (cancelou).
export function escolherAlvo({ atacante = null } = {}) {
  if (!canvas?.ready || ativo) return Promise.resolve(null);
  ativo = true;
  const rotulo = document.createElement('div');
  rotulo.id = 'painel-tatico-mira';
  rotulo.innerHTML = '<i class="fa-solid fa-crosshairs"></i><span>Escolha o alvo</span><small>chão: sem alvo · Esc: cancela</small>';
  rotulo.style.left = `${ultimo.x}px`;
  rotulo.style.top = `${ultimo.y}px`;
  document.body.append(rotulo);
  document.body.classList.add('painel-tatico-mirando');

  return new Promise(resolver => {
    let feito = false;
    const mover = evento => { rotulo.style.left = `${evento.clientX}px`; rotulo.style.top = `${evento.clientY}px`; };
    const terminar = resultado => {
      if (feito) return;
      feito = true;
      window.removeEventListener('pointermove', mover, true);
      window.removeEventListener('pointerdown', aoClicar, true);
      window.removeEventListener('contextmenu', aoMenu, true);
      window.removeEventListener('keydown', aoTeclar, true);
      // O clique que escolheu não pode chegar ao mapa (selecionaria o token do alvo).
      const engolir = evento => { evento.preventDefault(); evento.stopImmediatePropagation(); };
      window.addEventListener('click', engolir, true);
      window.addEventListener('pointerup', engolir, true);
      setTimeout(() => { window.removeEventListener('click', engolir, true); window.removeEventListener('pointerup', engolir, true); }, 350);
      rotulo.remove();
      document.body.classList.remove('painel-tatico-mirando');
      ativo = false;
      resolver(resultado);
    };
    const aoClicar = evento => {
      if (evento.target?.closest?.(PAINEL)) {
        // O botão de cancelar do próprio painel; o resto do painel fica parado durante a escolha.
        if (evento.target.closest('[data-acao="cancelarMira"]')) { evento.preventDefault(); evento.stopImmediatePropagation(); terminar(null); }
        return;
      }
      const noMapa = evento.target?.id === 'board' || Boolean(evento.target?.closest?.('#board'));
      if (!noMapa) { terminar(null); return; }
      if (evento.button !== 0) return;
      evento.preventDefault();
      evento.stopImmediatePropagation();
      const token = tokenSob(evento, atacante);
      if (!token) { terminar('sem'); return; }
      token.setTarget(true, { user: game.user, releaseOthers: true });
      terminar('alvo');
    };
    const aoMenu = evento => { evento.preventDefault(); evento.stopImmediatePropagation(); terminar(null); };
    const aoTeclar = evento => { if (evento.key === 'Escape') { evento.preventDefault(); evento.stopImmediatePropagation(); terminar(null); } };
    window.addEventListener('pointermove', mover, true);
    window.addEventListener('pointerdown', aoClicar, true);
    window.addEventListener('contextmenu', aoMenu, true);
    window.addEventListener('keydown', aoTeclar, true);
  });
}

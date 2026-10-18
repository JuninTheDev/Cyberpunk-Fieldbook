// Recorta pelo navegador e confere os pixels da imagem realmente servida, além da prévia.
// Usa a trava e os servidores descartáveis de tests/rodar.js; não acessa a campanha real.
module.exports = async ({ edge, servidores, r }) => {
  const base = servidores.local;
  const esperar = async expressao => {
    for (let i = 0; i < 60; i++) {
      if (await edge.evaluate(expressao)) return;
      await edge.sleep(100);
    }
    throw new Error(`A tela não chegou ao estado esperado: ${expressao}`);
  };
  const clicar = seletor => edge.evaluate(`document.querySelector(${JSON.stringify(seletor)}).click()`);
  const fechado = () => esperar(`!document.querySelector('dialog.cc-crop')`);
  const zoom = valor => edge.evaluate(`(() => { const s = document.querySelector('[data-crop-zoom]'); s.value = ${valor}; s.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  const setas = (key, vezes = 100) => edge.evaluate(`(() => { const c = document.querySelector('.cc-crop-preview'); for (let i = 0; i < ${vezes}; i++) c.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(key)}, bubbles: true })); })()`);
  const abrirRecorte = async () => { await clicar('[data-portrait-adjust]'); await esperar(`!!document.querySelector('dialog.cc-crop[open]')`); };
  const ler = async id => (await (await fetch(`${base}/api/personagens/${id}`)).json()).personagem;
  const salvar = async () => {
    await clicar('[data-crop-save]'); await fechado();
    await esperar(`/Salvo/.test(document.querySelector('#cc-save')?.textContent || '')`);
  };
  const pixels = url => edge.evaluate(`(async () => {
    const image = new Image(); image.src = ${JSON.stringify(url)};
    await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const g = canvas.getContext('2d'); g.drawImage(image, 0, 0);
    return { largura: canvas.width, altura: canvas.height, cor: [...g.getImageData(canvas.width / 2, canvas.height / 2, 1, 1).data] };
  })()`);
  const vermelho = p => p.cor[0] > 180 && p.cor[1] < 90 && p.cor[2] < 110;
  const azul = p => p.cor[0] < 90 && p.cor[1] < 150 && p.cor[2] > 180;

  await edge.ir(`${base}/#personagens`, 900);
  const doc = await edge.evaluate(`(async () => {
    const doc = { ...characterCreator.regras.blank(), nome: 'Retrato do teste', role: 'solo', metodo: 'pacote' };
    const response = await fetch('api/personagens', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(doc) });
    return (await response.json()).personagem;
  })()`);
  const id = doc.id;
  const rota = `/api/personagens/${id}/retrato`;
  const abrir = async () => {
    await edge.evaluate(`wikiApp.openPage('criador', { section: ${JSON.stringify(id)} })`);
    await esperar(`!!document.querySelector('[data-portrait-file]')`);
  };
  // Um retrato anterior permite provar que cancelar e falhar não o substituem.
  await edge.evaluate(`(async () => {
    const c = document.createElement('canvas'); c.width = c.height = 32;
    c.getContext('2d').fillRect(0, 0, 32, 32);
    await fetch(${JSON.stringify(rota)}, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imagem: c.toDataURL() }) });
    const originalFetch = window.fetch;
    window.testeRetrato = { envios: 0, falhar: false };
    window.fetch = async (...args) => {
      if (String(args[0]).includes(${JSON.stringify(rota.slice(1))}) && args[1]?.method === 'POST') {
        testeRetrato.envios++;
        if (testeRetrato.falhar) { testeRetrato.falhar = false; return new Response(JSON.stringify({ erro: 'Falha simulada; tente novamente.' }), { status: 503 }); }
      }
      return originalFetch(...args);
    };
    const canvas = document.createElement('canvas'); canvas.width = 2400; canvas.height = 1200;
    const g = canvas.getContext('2d'); g.scale(2, 2);
    for (const [i, cor] of ['#e32737', '#3cc45b', '#2c70de'].entries()) { g.fillStyle = cor; g.fillRect(i * 400, 0, 400, 600); }
    g.fillStyle = '#fff'; g.fillRect(580, 280, 40, 40);
    testeRetrato.arquivo = new File([await new Promise(ok => canvas.toBlob(ok, 'image/png'))], 'retrato.png', { type: 'image/png' });
    testeRetrato.enviar = (arquivo = testeRetrato.arquivo) => {
      const lista = new DataTransfer(); lista.items.add(arquivo);
      const campo = document.querySelector('[data-portrait-file]'); campo.files = lista.files;
      campo.dispatchEvent(new Event('change', { bubbles: true }));
    };
  })()`);
  await abrir();
  const anterior = (await ler(id)).retrato;
  const bytesAnteriores = Buffer.from(await (await fetch(base + '/' + anterior)).arrayBuffer());
  const enviar = async () => {
    await edge.evaluate(`testeRetrato.enviar()`);
    await esperar(`!!document.querySelector('dialog.cc-crop[open]')`);
  };

  await r.passo('cancelar, Escape e clique fora conservam o retrato sem enviar a foto', async () => {
    await enviar(); await clicar('[data-crop-cancel]'); await fechado();
    await enviar();
    for (const type of ['keyDown', 'keyUp']) await edge.send('Input.dispatchKeyEvent', { type, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await fechado(); await enviar();
    for (const type of ['mousePressed', 'mouseReleased']) await edge.send('Input.dispatchMouseEvent', { type, x: 2, y: 2, button: 'left', clickCount: 1 });
    await fechado();
    const atual = await ler(id);
    const bytes = Buffer.from(await (await fetch(base + '/' + atual.retrato)).arrayBuffer());
    const envios = await edge.evaluate(`testeRetrato.envios`);
    return [envios === 0 && atual.retrato === anterior && bytes.equals(bytesAnteriores), `envios ${envios} · foto anterior conservada ${bytes.equals(bytesAnteriores)}`];
  });
  await r.passo('arquivo inválido avisa e conserva o retrato', async () => {
    await edge.evaluate(`testeRetrato.enviar(new File(['texto'], 'invalida.png', { type: 'image/png' }))`);
    await esperar(`/Não consegui ler/.test(document.querySelector('[data-portrait-msg]')?.textContent || '')`);
    const estado = await edge.evaluate(`({ modal: !!document.querySelector('dialog.cc-crop'), envios: testeRetrato.envios })`);
    return [!estado.modal && estado.envios === 0 && (await ler(id)).retrato === anterior, JSON.stringify(estado)];
  });
  await r.passo('zoom, arraste e teclado escolhem os pixels salvos; a fonte inteira é conservada', async () => {
    await enviar(); await zoom(300);
    const antes = await edge.evaluate(`document.querySelector('.cc-crop-preview').toDataURL()`);
    const ponto = await edge.evaluate(`(() => { const r = document.querySelector('.cc-crop-preview').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
    await edge.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...ponto, button: 'left', clickCount: 1 });
    await edge.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: ponto.x + 65, y: ponto.y, buttons: 1 });
    await edge.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: ponto.x + 65, y: ponto.y, button: 'left', clickCount: 1 });
    const arrastou = antes !== await edge.evaluate(`document.querySelector('.cc-crop-preview').toDataURL()`);
    await setas('ArrowRight'); await edge.shot('recorte-desktop'); await salvar();
    const atual = await ler(id), p = await pixels(base + '/' + atual.retrato);
    const fonte = await pixels(`${base}${rota}?original=1`);
    return [arrastou && p.largura === 512 && p.altura === 512 && vermelho(p) && atual.retratoOriginal === true && atual.retratoRecorte.zoom === 3 && Math.abs(atual.retratoRecorte.x - 1 / 12) < 0.001 && fonte.largura === 1536 && fonte.altura === 768,
      `arraste ${arrastou} · recorte ${JSON.stringify(p)} · posição ${JSON.stringify(atual.retratoRecorte)} · fonte ${fonte.largura}×${fonte.altura}`];
  });
  await r.passo('ajustar depois recupera a área fora do recorte; falha permite tentar novamente', async () => {
    const antes = await ler(id);
    const fonteAntes = Buffer.from(await (await fetch(`${base}${rota}?original=1`)).arrayBuffer());
    await abrirRecorte();
    const zoomAnterior = await edge.evaluate(`document.querySelector('[data-crop-zoom]').value`);
    await clicar('[data-crop-cancel]'); await fechado();
    const cancelou = (await ler(id)).retrato === antes.retrato;
    await abrirRecorte(); await clicar('[data-crop-reset]');
    const reset = await edge.evaluate(`document.querySelector('[data-crop-zoom]').value`);
    await zoom(200); await setas('ArrowLeft');
    await edge.evaluate(`testeRetrato.falhar = true`); await clicar('[data-crop-save]');
    await esperar(`/Falha simulada/.test(document.querySelector('[data-crop-msg]')?.textContent || '')`);
    const conservou = (await ler(id)).retrato === antes.retrato;
    const retry = await edge.evaluate(`!document.querySelector('[data-crop-save]').disabled && document.querySelector('[data-crop-zoom]').value === '200'`);
    await salvar();
    const atual = await ler(id), p = await pixels(base + '/' + atual.retrato);
    const fonteDepois = Buffer.from(await (await fetch(`${base}${rota}?original=1`)).arrayBuffer());
    return [zoomAnterior === '300' && cancelou && reset === '100' && conservou && retry && azul(p) && atual.retratoRecorte.zoom === 2 && Math.abs(atual.retratoRecorte.x - 0.875) < 0.001 && fonteAntes.equals(fonteDepois),
      `zoom reaberto ${zoomAnterior} · reset ${reset} · cancelou ${cancelou} · falha conservou ${conservou} · nova foto ${JSON.stringify(p)}`];
  });
  await r.passo('celular: o diálogo cabe na tela e o toque muda a posição salva', async () => {
    await edge.celular(true); await edge.send('Emulation.setTouchEmulationEnabled', { enabled: true });
    await abrirRecorte();
    const layout = await edge.evaluate(`(() => {
      const d = document.querySelector('dialog.cc-crop').getBoundingClientRect(), b = document.querySelector('[data-crop-save]').getBoundingClientRect(), c = document.querySelector('.cc-crop-preview').getBoundingClientRect();
      return { cabe: d.left >= 0 && d.right <= innerWidth && d.top >= 0 && d.bottom <= innerHeight && b.bottom <= innerHeight && document.documentElement.scrollWidth <= innerWidth, x: c.x + c.width / 2, y: c.y + c.height / 2 };
    })()`);
    await edge.shot('recorte-celular');
    await edge.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: layout.x, y: layout.y }] });
    await edge.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: layout.x, y: layout.y + 60 }] });
    await edge.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await salvar();
    const atual = await ler(id), p = await pixels(base + '/' + atual.retrato);
    await edge.send('Emulation.setTouchEmulationEnabled', { enabled: false }); await edge.celular(false);
    return [layout.cabe && atual.retratoRecorte.y < 0.49 && azul(p), `cabe ${layout.cabe} · posição vertical ${atual.retratoRecorte.y} · cor ${p.cor}`];
  });
  await r.passo('recarregar mantém o recorte e a ficha usa o mesmo enquadramento quadrado', async () => {
    const antes = await ler(id);
    await edge.ir(`${base}/#criador/${id}`, 700);
    await esperar(`!!document.querySelector('[data-portrait-adjust]')`);
    await abrirRecorte();
    const zoomSalvo = await edge.evaluate(`document.querySelector('[data-crop-zoom]').value`);
    await clicar('[data-crop-cancel]'); await fechado();
    await edge.evaluate(`wikiApp.openPage('ficha', { section: ${JSON.stringify(id)} })`);
    await esperar(`!!document.querySelector('.cc-sheet .cc-identity img.cc-portrait')?.naturalWidth`);
    const ficha = await edge.evaluate(`(() => { const i = document.querySelector('.cc-sheet .cc-identity img.cc-portrait'), r = i.getBoundingClientRect(); return { largura: r.width, altura: r.height, arquivo: i.getAttribute('src') }; })()`);
    await edge.shot('ficha');
    await edge.evaluate(`wikiApp.openPage('personagens')`);
    await esperar(`!!document.querySelector('.cc-card img.cc-thumb')`);
    const miniatura = await edge.evaluate(`[...document.querySelectorAll('.cc-card img.cc-thumb')].some(i => i.getAttribute('src') === ${JSON.stringify(antes.retrato)})`);
    return [zoomSalvo === '200' && ficha.arquivo === antes.retrato && Math.abs(ficha.largura - ficha.altura) < 1 && miniatura,
      `zoom ${zoomSalvo} · ficha ${ficha.largura}×${ficha.altura} · miniatura ${miniatura}`];
  });
  await r.passo('sair da página fecha o recorte sem mudar o personagem', async () => {
    await abrir(); const antes = await ler(id);
    await abrirRecorte();
    await edge.evaluate(`wikiApp.openPage('personagens')`); await fechado();
    const atual = await ler(id);
    return [atual.retrato === antes.retrato && JSON.stringify(atual.retratoRecorte) === JSON.stringify(antes.retratoRecorte), 'foto e posição conservadas'];
  });
  await r.passo('resposta atrasada da remoção não altera a página aberta depois', async () => {
    const anterior = await ler(id);
    await fetch(`${base}/api/personagens/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...anterior, retratoLink: 'https://example.com/antiga.png' }) });
    await abrir();
    await edge.evaluate(`(() => {
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        const response = await originalFetch(...args);
        if (String(args[0]).includes(${JSON.stringify(rota.slice(1))}) && args[1]?.method === 'DELETE') {
          await new Promise(ok => { window.liberarRemocao = ok; });
        }
        return response;
      };
    })()`);
    await clicar('[data-portrait-remove]');
    await esperar(`!!window.liberarRemocao`);
    await edge.evaluate(`wikiApp.openPage('personagens')`);
    await esperar(`!!document.querySelector('[data-cc-new]')`);
    await edge.evaluate(`window.liberarRemocao()`); await edge.sleep(200);
    const naLista = await edge.evaluate(`!!document.querySelector('[data-cc-new]') && !document.querySelector('[data-portrait-file]') && !document.querySelector('dialog.cc-crop')`);
    const atual = await ler(id);
    return [naLista && !atual.retrato && !atual.retratoLink, `remoção concluída, link limpo e lista preservada ${naLista}`];
  });
};

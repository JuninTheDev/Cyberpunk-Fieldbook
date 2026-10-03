// Alerta de arquivo revertido: num clone temporário do repositório (nunca no projeto real),
// volta campaign-map.js para a versão a6ab001 e confere o aviso no servidor e na wiki do mestre.
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { subir } = require('../lib/servidores');

module.exports = async ({ edge, servidores, r }) => {
  const git = (args, cwd) => execFileSync('git', args, { cwd, encoding: 'utf8', windowsHide: true });

  await r.passo('projeto real: nenhum arquivo revertido agora', async () => {
    const saude = await (await fetch(`${servidores.local}/api/saude`)).json();
    return [saude.git && saude.revertidos.length === 0, JSON.stringify(saude)];
  });
  if (servidores.rede) {
    await r.passo('/api/saude é só do mestre', async () => { const s = (await fetch(`${servidores.rede}/api/saude`)).status; return [s === 403, `HTTP ${s}`]; });
  }

  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-teste-reversao-'));
  let servidor = null;
  try {
    git(['clone', '--quiet', servidores.raiz, pasta]);
    // O clone recebe as mudanças ainda sem commit do projeto (o motor e o servidor que estão sendo testados).
    for (const arquivo of git(['diff', '--name-only', 'HEAD'], servidores.raiz).split('\n').filter(Boolean)) {
      if (fs.existsSync(path.join(servidores.raiz, arquivo))) fs.copyFileSync(path.join(servidores.raiz, arquivo), path.join(pasta, arquivo));
    }
    fs.writeFileSync(path.join(pasta, 'campaign-map.js'), git(['show', 'a6ab001:campaign-map.js'], pasta));
    servidor = await subir(8767, { HOST: '127.0.0.1', GM_KEY: '' }, pasta);

    await r.passo('clone com campaign-map.js antigo: o servidor acusa a6ab001', async () => {
      const saude = await (await fetch('http://127.0.0.1:8767/api/saude')).json();
      const item = saude.revertidos.find(x => x.arquivo === 'campaign-map.js');
      return [saude.revertidos.length === 1 && item && item.commit === 'a6ab001', JSON.stringify(saude.revertidos)];
    });
    await r.passo('wiki do mestre mostra a faixa de alerta', async () => {
      await edge.ir('http://127.0.0.1:8767/', 2500);
      const texto = await edge.evaluate(`document.getElementById('health-banner')?.textContent || ''`);
      return [texto.includes('campaign-map.js') && texto.includes('a6ab001'), texto.slice(0, 160)];
    });
    await edge.shot('alerta');
    await r.passo('visão dos jogadores nunca mostra o alerta', async () => {
      await edge.ir('http://127.0.0.1:8767/jogadores.html', 2000);
      return [!(await edge.evaluate(`!!document.getElementById('health-banner')`)), ''];
    });
  } finally {
    if (servidor) servidor.kill();
    await edge.sleep(400);
    try { fs.rmSync(pasta, { recursive: true, force: true }); } catch { /* o Windows às vezes segura a pasta por um instante */ }
  }
  await r.passo('projeto real continua sem alerta na wiki do mestre', async () => {
    await edge.ir(`${servidores.local}/`, 2500);
    return [!(await edge.evaluate(`!!document.getElementById('health-banner')`)), ''];
  });
};

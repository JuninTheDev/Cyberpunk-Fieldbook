// Foundry de teste: o Foundry instalado no PC, ligado sem janela numa pasta de dados própria
// (%LOCALAPPDATA%\FieldbookTeste\foundry), com um mundo "teste-wiki". Nunca toca nos mundos de verdade.
// A licença vale para uma mesa por vez: o cenário só roda com a mesa do servidor vazia.
const { execFileSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { sleep } = require('./edge');

const PROGRAMA = 'C:\\Program Files\\Foundry Virtual Tabletop\\resources\\app';
const DADOS_REAIS = path.join(process.env.LOCALAPPDATA || '', 'FoundryVTT');
const PASTA = path.join(process.env.LOCALAPPDATA || '', 'FieldbookTeste', 'foundry');
const PORTA = 30999;
const MUNDO = 'teste-wiki';
const raiz = path.resolve(__dirname, '..', '..');

const entrada = () => ['main.mjs', 'main.js'].map(file => path.join(PROGRAMA, file)).find(file => fs.existsSync(file));
const disponivel = () => Boolean(entrada()) && fs.existsSync(path.join(DADOS_REAIS, 'Config', 'license.json')) && fs.existsSync(path.join(DADOS_REAIS, 'Data', 'systems', 'cyberpunk-red-core'));

// Pasta de teste: licença, configuração, sistema (copiado uma vez), mundo vazio e o módulo com o código atual.
// O build completo (compêndios) só roda na primeira vez ou com FOUNDRY_BUILD=1; os scripts são copiados sempre.
function preparar() {
  const config = path.join(PASTA, 'Config');
  const data = path.join(PASTA, 'Data');
  fs.mkdirSync(config, { recursive: true });
  fs.copyFileSync(path.join(DADOS_REAIS, 'Config', 'license.json'), path.join(config, 'license.json'));
  // Sem descoberta de IP: o Foundry consultaria o site dele, e enquanto isso a entrada do mestre quebra.
  fs.writeFileSync(path.join(config, 'options.json'), JSON.stringify({ port: PORTA, upnp: false, noIPDiscovery: true, hostname: null, localHostname: 'localhost', routePrefix: null, compressStatic: false, fullscreen: false, language: 'en.core', updateChannel: 'stable' }, null, 2));
  const sistema = path.join(data, 'systems', 'cyberpunk-red-core');
  const versao = dir => { try { return JSON.parse(fs.readFileSync(path.join(dir, 'system.json'), 'utf8')).version; } catch { return ''; } };
  const sistemaReal = path.join(DADOS_REAIS, 'Data', 'systems', 'cyberpunk-red-core');
  if (versao(sistema) !== versao(sistemaReal)) {
    fs.rmSync(sistema, { recursive: true, force: true });
    fs.cpSync(sistemaReal, sistema, { recursive: true });
  }
  const mundo = path.join(data, 'worlds', MUNDO);
  if (!fs.existsSync(path.join(mundo, 'world.json'))) {
    fs.mkdirSync(mundo, { recursive: true });
    fs.writeFileSync(path.join(mundo, 'world.json'), JSON.stringify({ id: MUNDO, title: 'Teste da wiki', description: 'Mundo do teste automático do importador da wiki. Pode apagar.', system: 'cyberpunk-red-core', coreVersion: '12.343', compatibility: { minimum: '12', verified: '12.343' }, version: '1.0.0' }, null, 2));
  }
  const modulo = path.join(data, 'modules', 'cpr-2077');
  const fonte = path.join(raiz, 'foundry-2077');
  if (process.env.FOUNDRY_BUILD || !fs.existsSync(path.join(modulo, 'packs'))) {
    execFileSync(process.execPath, ['build/build.mjs'], { cwd: fonte, env: { ...process.env, FOUNDRY_DATA: data }, stdio: 'ignore' });
  }
  for (const pasta of ['scripts', 'styles']) {
    fs.rmSync(path.join(modulo, pasta), { recursive: true, force: true });
    fs.cpSync(path.join(fonte, pasta), path.join(modulo, pasta), { recursive: true });
  }
  fs.copyFileSync(path.join(fonte, 'module.json'), path.join(modulo, 'module.json'));
}

// Apaga os atores do mundo de teste entre uma rodada e outra (o mundo fica, os personagens não).
function limparMundo() {
  fs.rmSync(path.join(PASTA, 'Data', 'worlds', MUNDO, 'data', 'actors'), { recursive: true, force: true });
}

async function subir() {
  if (!(await fetch(`http://localhost:${PORTA}/api/status`).then(() => false, () => true))) throw new Error(`A porta ${PORTA} já está em uso.`);
  const log = fs.openSync(path.join(PASTA, 'servidor.log'), 'w');
  const proc = spawn(process.execPath, [entrada(), `--dataPath=${PASTA}`, `--port=${PORTA}`, `--world=${MUNDO}`, '--noupnp', '--noupdate', '--noipdiscovery'], { cwd: PROGRAMA, stdio: ['ignore', log, log], windowsHide: true });
  for (let i = 0; i < 90; i++) {
    await sleep(500);
    try {
      const status = await (await fetch(`http://localhost:${PORTA}/api/status`)).json();
      if (status.active && status.world === MUNDO) return { url: `http://localhost:${PORTA}`, parar: async () => { proc.kill(); await sleep(800); fs.closeSync(log); } };
    } catch { /* ainda subindo */ }
  }
  proc.kill();
  throw new Error(`O Foundry de teste não abriu o mundo (veja ${path.join(PASTA, 'servidor.log')}).`);
}

// Entra no mundo como Gamemaster (sem senha no mundo de teste) e espera o jogo ficar pronto.
async function entrarComoMestre(edge, url) {
  await edge.send('Page.navigate', { url: `${url}/join` });
  for (let i = 0; i < 60; i++) {
    await sleep(300);
    const pronto = await edge.evaluate(`(() => { const s = document.querySelector('select[name="userid"]'); return !!(s && [...s.options].some(o => /Gamemaster/i.test(o.textContent))); })()`).catch(() => false);
    if (pronto) break;
  }
  await edge.evaluate(`(() => {
    const select = document.querySelector('select[name="userid"]');
    select.value = [...select.options].find(o => /Gamemaster/i.test(o.textContent)).value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    const form = select.closest('form');
    (form.querySelector('button[name="join"]') || form.querySelector('button[type="submit"]')).click();
  })()`);
  await esperarJogo(edge);
}
async function esperarJogo(edge) {
  for (let i = 0; i < 120; i++) {
    await sleep(500);
    if (await edge.evaluate('!!(window.game && game.ready)').catch(() => false)) return;
  }
  throw new Error('O mundo de teste não ficou pronto no navegador.');
}

// Liga o módulo cpr-2077 no mundo (precisa recarregar a página para valer).
async function ativarModulo(edge) {
  const ativo = await edge.evaluate(`!!game.modules.get('cpr-2077')?.active`);
  if (ativo) return;
  await edge.evaluate(`game.settings.set('core', 'moduleConfiguration', { ...game.settings.get('core', 'moduleConfiguration'), 'cpr-2077': true })`);
  await edge.evaluate('location.reload()').catch(() => {});
  await sleep(1500);
  await esperarJogo(edge);
}

module.exports = { disponivel, preparar, limparMundo, subir, entrarComoMestre, ativarModulo, PORTA };

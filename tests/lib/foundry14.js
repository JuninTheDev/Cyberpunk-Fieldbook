// Foundry 14 de teste: o Foundry 14 instalado no PC, ligado sem janela numa pasta de dados própria
// (%LOCALAPPDATA%\FieldbookTeste\foundry14), com o sistema Cyberpunk RED — Fieldbook (foundry-sistema/) e um mundo
// "teste-sistema" que começa vazio a cada rodada. Da pasta de dados do Foundry do PC só sai a licença.
// A licença vale para uma mesa por vez: o cenário só roda com a mesa do servidor vazia.
//   FOUNDRY14_APP=...   pasta resources\app do Foundry 14 (padrão: a instalação do Windows em AppData\Local\Programs)
//   FOUNDRY14_DADOS=... pasta de dados do Foundry 14 do PC, de onde vem a licença (padrão: AppData\Local\FoundryVTT)
const { execFileSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { sleep } = require('./edge');

const LOCAL = process.env.LOCALAPPDATA || '';
const PROGRAMA = process.env.FOUNDRY14_APP || path.join(LOCAL, 'Programs', 'Foundry Virtual Tabletop', 'resources', 'app');
const DADOS_REAIS = process.env.FOUNDRY14_DADOS || path.join(LOCAL, 'FoundryVTT');
const PASTA = path.join(LOCAL, 'FieldbookTeste', 'foundry14');
const PORTA = 31014;
const MUNDO = 'teste-sistema';
const SISTEMA = 'cpr-fieldbook';
const raiz = path.resolve(__dirname, '..', '..');

const entrada = () => ['main.mjs', 'main.js'].map(file => path.join(PROGRAMA, file)).find(file => fs.existsSync(file));
function versao() {
  try { return JSON.parse(fs.readFileSync(path.join(PROGRAMA, 'package.json'), 'utf8')).release || null; } catch { return null; }
}
const licenca = () => path.join(DADOS_REAIS, 'Config', 'license.json');
const disponivel = () => Boolean(entrada()) && versao()?.generation === 14 && fs.existsSync(licenca());
// Por que o cenário não roda (para o relatório), ou '' quando roda.
function motivoIndisponivel() {
  if (!entrada()) return `Foundry 14 não encontrado em ${PROGRAMA}`;
  if (versao()?.generation !== 14) return `o Foundry em ${PROGRAMA} é a versão ${versao()?.generation}, não a 14`;
  if (!fs.existsSync(licenca())) return `sem licença ativada em ${licenca()} (abra o Foundry 14 uma vez e digite a chave)`;
  return '';
}

// Pasta de teste: licença, configuração, o sistema com o código atual e um mundo vazio.
function preparar() {
  const config = path.join(PASTA, 'Config');
  const data = path.join(PASTA, 'Data');
  fs.mkdirSync(config, { recursive: true });
  fs.copyFileSync(licenca(), path.join(config, 'license.json'));
  // Sem UPnP, sem descoberta de IP pela internet e sem a pergunta da telemetria na primeira abertura.
  fs.writeFileSync(path.join(config, 'options.json'), JSON.stringify({ port: PORTA, upnp: false, noIPDiscovery: true, hostname: null, localHostname: 'localhost', routePrefix: null, compressStatic: false, fullscreen: false, language: 'en.core', updateChannel: 'stable', telemetry: false }, null, 2));
  // A pasta de teste pode ainda não ter o log do Foundry: o instalar só confia na versão porque o programa é o 14.
  execFileSync(process.execPath, ['instalar.mjs'], { cwd: path.join(raiz, 'foundry-sistema'), env: { ...process.env, FOUNDRY_DATA: data, FOUNDRY_VERSAO: String(versao().generation) }, stdio: 'ignore' });
  // O mundo começa do zero: sem atores, itens, mensagens nem usuários (o Foundry cria o Gamemaster ao abrir).
  const mundo = path.join(data, 'worlds', MUNDO);
  fs.rmSync(mundo, { recursive: true, force: true });
  fs.mkdirSync(mundo, { recursive: true });
  const build = `${versao().generation}.${versao().build}`;
  fs.writeFileSync(path.join(mundo, 'world.json'), JSON.stringify({ id: MUNDO, title: 'Teste do sistema', description: 'Mundo do teste automático do sistema Cyberpunk RED — Fieldbook. Pode apagar.', system: SISTEMA, coreVersion: build, compatibility: { minimum: '14', verified: build }, version: '1.0.0' }, null, 2));
}

async function subir() {
  if (!(await fetch(`http://localhost:${PORTA}/api/status`).then(() => false, () => true))) throw new Error(`A porta ${PORTA} já está em uso.`);
  // Um Foundry encerrado à força deixa a trava da pasta (Config/options.json.lock); com a porta livre, ela é velha.
  fs.rmSync(path.join(PASTA, 'Config', 'options.json.lock'), { recursive: true, force: true });
  const log = fs.openSync(path.join(PASTA, 'servidor.log'), 'w');
  const proc = spawn(process.execPath, [entrada(), `--dataPath=${PASTA}`, `--port=${PORTA}`, `--world=${MUNDO}`, '--noupnp', '--noupdate', '--noipdiscovery'], { cwd: PROGRAMA, stdio: ['ignore', log, log], windowsHide: true });
  for (let i = 0; i < 120; i++) {
    await sleep(500);
    try {
      const status = await (await fetch(`http://localhost:${PORTA}/api/status`)).json();
      if (!(status.active && status.world === MUNDO)) continue;
      // O Foundry 14 aceita conexões antes de saber os próprios endereços (Express#getIPAddresses, logo depois de
      // "Server started"). Quem entra nesse intervalo derruba o envio do mundo ("reading 'local'" no log).
      await sleep(2000);
      return { url: `http://localhost:${PORTA}`, parar: async () => {
        const saiu = new Promise(resolve => { proc.once('exit', resolve); setTimeout(resolve, 8000); });
        proc.kill();
        await saiu;
        fs.closeSync(log);
        fs.rmSync(path.join(PASTA, 'Config', 'options.json.lock'), { recursive: true, force: true });
      } };
    } catch { /* ainda subindo */ }
  }
  proc.kill();
  throw new Error(`O Foundry 14 de teste não abriu o mundo (veja ${path.join(PASTA, 'servidor.log')}).`);
}

// A corrida dos endereços (ver subir): o envio do mundo caiu porque o Foundry ainda não sabia os próprios endereços
// ("reading 'local'" no servidor.log, em Express#getInvitationLinks), mesmo depois da espera de 2 s.
const semEnderecos = () => {
  try { return /reading 'local'/.test(fs.readFileSync(path.join(PASTA, 'servidor.log'), 'utf8')); } catch { return false; }
};

// Entra com um usuário pelo nome (sem senha no mundo de teste) e espera o jogo ficar pronto. Se o mundo não ficou pronto
// pela corrida dos endereços, entra de novo uma vez (aí o Foundry já os sabe); qualquer outro motivo, ou a segunda vez,
// derruba o passo como antes.
async function entrarComo(edge, url, nome) {
  try {
    await entrarUmaVez(edge, url, nome);
  } catch (erro) {
    if (!semEnderecos()) throw erro;
    console.log('  (o Foundry de teste ainda não sabia os próprios endereços ao enviar o mundo: entrando de novo)');
    await entrarUmaVez(edge, url, nome);
  }
}
async function entrarUmaVez(edge, url, nome) {
  const padrao = nome instanceof RegExp ? nome : new RegExp(`^\\s*${nome}\\s*$`);
  const seletor = 'select[name="userId"], select[name="userid"]';
  await edge.send('Page.navigate', { url: `${url}/join` });
  for (let i = 0; i < 60; i++) {
    await sleep(300);
    const pronto = await edge.evaluate(`(() => { const s = document.querySelector(${JSON.stringify(seletor)}); return !!(s && [...s.options].some(o => ${padrao}.test(o.textContent))); })()`).catch(() => false);
    if (pronto) break;
  }
  await edge.evaluate(`(() => {
    // O tour de boas-vindas do Foundry abre sozinho num mundo novo e cobre a tela: fica marcado como visto
    // (configuração do cliente "core.tourProgress", guardada no localStorage).
    localStorage.setItem('core.tourProgress', JSON.stringify({ core: { welcome: 3 } }));
    const select = document.querySelector(${JSON.stringify(seletor)});
    select.value = [...select.options].find(o => ${padrao}.test(o.textContent)).value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    const form = select.closest('form');
    (form.querySelector('button[name="join"]') || form.querySelector('button[type="submit"]')).click();
  })()`);
  await esperarJogo(edge);
}
const entrarComoMestre = (edge, url) => entrarComo(edge, url, /Gamemaster/i);

// Avisos e erros do console, com a pilha, desde o começo de cada página (chame antes de entrar no mundo). Os avisos de
// compatibilidade do Foundry (API depreciada) saem como console.warn com "Deprecated since Version".
async function capturarAvisos(edge) {
  await edge.send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => {
    window.__avisos = [];
    for (const nivel of ['warn', 'error']) {
      const original = console[nivel].bind(console);
      console[nivel] = (...args) => {
        try {
          const texto = args.map(a => (a instanceof Error ? a.stack || a.message : String(a))).join(' ').slice(0, 1500);
          window.__avisos.push({ nivel, texto, pilha: (new Error().stack || '').split('\\n').slice(2, 12).join(' | ') });
        } catch { /* nunca atrapalhar o console */ }
        return original(...args);
      };
    }
  })();` });
}
// Os avisos e erros que vêm do sistema (no texto ou na pilha).
const avisosDoSistema = edge => edge.evaluate(`(window.__avisos || []).filter(a => /systems\\/${SISTEMA}\\//.test(a.texto + ' ' + a.pilha)).map(a => a.nivel + ': ' + a.texto.slice(0, 300))`);

async function esperarJogo(edge) {
  for (let i = 0; i < 120; i++) {
    await sleep(500);
    if (await edge.evaluate('!!(window.game && game.ready)').catch(() => false)) return;
  }
  throw new Error('O mundo de teste não ficou pronto no navegador.');
}

module.exports = { disponivel, motivoIndisponivel, preparar, subir, entrarComo, entrarComoMestre, esperarJogo, capturarAvisos, avisosDoSistema, versao, PORTA, PASTA, SISTEMA };

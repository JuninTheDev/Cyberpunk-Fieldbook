// Executa o servidor e a API reais em memória: sem listen, navegador, Foundry ou rede.
// Cada instância recebe seus próprios dados temporários; nenhuma porta é reservada.
const fs = require('node:fs');
const { createRequire, wrap } = require('node:module');
const os = require('node:os');
const path = require('node:path');
const { Readable, Writable } = require('node:stream');
const vm = require('node:vm');

function criarServidorIsolado(t) {
  const raiz = path.resolve(__dirname, '../..');
  const dados = fs.mkdtempSync(path.join(os.tmpdir(), 'fieldbook-api-isolada-'));
  t.after(() => {
    if (path.dirname(dados) !== path.resolve(os.tmpdir()) || !path.basename(dados).startsWith('fieldbook-api-isolada-')) {
      throw new Error('A limpeza deve ficar na pasta temporária criada por este teste.');
    }
    fs.rmSync(dados, { recursive: true, force: true });
  });
  const arquivo = path.join(raiz, 'server.js');
  const carregar = createRequire(arquivo);
  const senha = 'somente-neste-teste';
  let atender;
  const env = {
    HOST: '127.0.0.1', PORT: '0', MODO: 'hospedado', GM_KEY: senha,
    DADOS: dados, SYSTEMD_DIR: path.join(dados, 'systemd-inexistente')
  };
  const requireIsolado = nome => {
    if (nome === 'http') return { createServer(fn) { atender = fn; return { listen() {} }; } };
    if (nome === 'child_process') return { execFile() { throw new Error('Este teste não permite iniciar serviços ou processos externos.'); } };
    if (nome === './revertidos') return { runGit: async () => '', findRevertedFiles: async () => [] };
    return carregar(nome);
  };
  const iniciar = vm.runInNewContext(wrap(fs.readFileSync(arquivo, 'utf8')), {
    Buffer, URL, console, setTimeout, clearTimeout, process: { env, pid: process.pid },
    fetch() { throw new Error('Este teste não permite acesso à rede.'); }
  }, { filename: arquivo });
  iniciar({}, requireIsolado, { exports: {} }, arquivo, raiz);
  if (!atender) throw new Error('O servidor não registrou o atendimento das requisições.');

  function pedir(url, { method = 'GET', body, cookie, headers = {} } = {}) {
    return new Promise((resolve, reject) => {
      const texto = body === undefined ? '' : typeof body === 'string' ? body : JSON.stringify(body);
      const request = Readable.from(texto ? [texto] : []);
      request.url = url;
      request.method = method;
      request.headers = Object.fromEntries(Object.entries({
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        ...(cookie ? { cookie } : {}), ...headers
      }).map(([key, value]) => [key.toLowerCase(), value]));
      request.socket = { remoteAddress: '127.0.0.1' };
      const partes = [];
      const response = new Writable({ write(chunk, encoding, done) { partes.push(Buffer.from(chunk)); done(); } });
      response.headersSent = false;
      response.writeHead = (status, cabecalhos = {}) => {
        response.status = status;
        response.cabecalhos = Object.fromEntries(Object.entries(cabecalhos).map(([key, value]) => [key.toLowerCase(), value]));
        response.headersSent = true;
        return response;
      };
      const prazo = setTimeout(() => reject(new Error(`A requisição ${method} ${url} não terminou.`)), 5000);
      const falhou = error => { clearTimeout(prazo); reject(error); };
      response.once('error', falhou);
      response.once('finish', () => {
        clearTimeout(prazo);
        const text = Buffer.concat(partes).toString('utf8');
        let json = null;
        try { json = JSON.parse(text); } catch { /* uma resposta de arquivo ou texto */ }
        resolve({ status: response.status, headers: response.cabecalhos, text, json });
      });
      try { Promise.resolve(atender(request, response)).catch(falhou); } catch (error) { falhou(error); }
    });
  }

  const cookieDe = resposta => (resposta.headers['set-cookie'] || '').split(';')[0];
  const entrarComoMestre = async () => {
    const resposta = await pedir('/api/mestre/entrar', { method: 'POST', body: { senha } });
    if (resposta.status !== 200) throw new Error(`Login do mestre falhou: ${resposta.text}`);
    return cookieDe(resposta);
  };
  return { pedir, atender, cookieDe, entrarComoMestre, senha, dados };
}

module.exports = { criarServidorIsolado };

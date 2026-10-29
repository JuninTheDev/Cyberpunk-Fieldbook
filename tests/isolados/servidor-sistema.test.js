// O C28 do sistema do Foundry 14: o servidor/atualizar.sh instala no Foundry 14 o foundry-sistema/ do master quando a
// versão dele (ou a do documento das arquiteturas da campanha) não é a instalada, com a mesa do 14 vazia, e o
// iniciar-foundry.sh reabre o mundo que estava aberto. Roda os scripts de verdade, num repositório de mentira com origin e
// com comandos de mentira (systemctl, runuser e getent) na frente do PATH; o /api/status do Foundry é um status.json que o
// curl de verdade lê por um file:// (o bash do Git põe o curl dele na frente do PATH; sem o arquivo, o curl falha, como
// com o Foundry desligado), e o instalar.mjs também é de mentira. Sem servidor nem Foundry. Precisa do bash: no Windows, o do Git (o "bash" do PATH pode ser o do WSL); sem ele, pula.
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const raiz = path.join(__dirname, '..', '..');

function acharBash() {
  if (process.platform !== 'win32') return spawnSync('bash', ['-c', 'true']).status === 0 ? 'bash' : null;
  const execucao = spawnSync('git', ['--exec-path'], { encoding: 'utf8' }).stdout?.trim();
  const candidatos = [execucao && path.join(execucao, '..', '..', '..', 'bin', 'bash.exe'), 'C:\\Program Files\\Git\\bin\\bash.exe'];
  return candidatos.find(caminho => caminho && fs.existsSync(caminho)) ?? null;
}
const BASH = acharBash();
// Roda e confere a saída 0, com a saída do script na mensagem.
const certo = r => { assert.equal(r.status, 0, `${r.stdout}${r.stderr}`); return r; };

const escrever = (arquivo, texto) => { fs.mkdirSync(path.dirname(arquivo), { recursive: true }); fs.writeFileSync(arquivo, texto.replace(/\r\n/g, '\n')); };
// Os caminhos vão para o bash com barras normais (o Git Bash entende C:/...).
const p = caminho => caminho.replace(/\\/g, '/');

function preparar() {
  const t = fs.mkdtempSync(path.join(os.tmpdir(), 'servidor-sistema-'));
  const pasta = nome => path.join(t, nome);
  // Os comandos de mentira: o systemctl guarda o estado do foundry14 num arquivo e anota cada comando.
  escrever(pasta('bin/systemctl'), `#!/usr/bin/env bash
echo "$*" >> "${p(pasta('systemctl.log'))}"
estado=$(cat "${p(pasta('foundry14.estado'))}" 2>/dev/null || echo inactive)
case "$1" in
  is-active) [ "$estado" = active ] ;;
  stop) [ "\${@: -1}" = foundry14 ] && echo inactive > "${p(pasta('foundry14.estado'))}" ;;
  start) [ "\${@: -1}" = foundry14 ] && echo active > "${p(pasta('foundry14.estado'))}" ;;
esac
`);
  escrever(pasta('bin/runuser'), '#!/usr/bin/env bash\nwhile [ "$1" != -- ]; do shift; done\nshift\nexec "$@"\n');
  escrever(pasta('bin/getent'), `#!/usr/bin/env bash\necho "mesa:x:1000:1000::${p(pasta('home'))}:/bin/bash"\n`);
  fs.mkdirSync(pasta('home'));
  fs.mkdirSync(pasta('dados'));
  fs.mkdirSync(pasta('foundry14/data/Data'), { recursive: true });
  const git = (cwd, ...args) => {
    const r = spawnSync('git', ['-c', 'core.autocrlf=false', '-c', 'user.name=Teste', '-c', 'user.email=teste@example.com', ...args], { cwd, encoding: 'utf8' });
    assert.equal(r.status, 0, `git ${args.join(' ')}: ${r.stderr}`);
    return r.stdout.trim();
  };
  // O repositório: o origin, a cópia de quem publica (dev) e a do servidor (wiki), com os scripts de verdade.
  git(t, 'init', '-q', '--bare', '-b', 'master', 'origin.git');
  git(t, 'clone', '-q', 'origin.git', 'dev');
  for (const script of ['atualizar.sh', 'atualizar-sistema.sh', 'atualizar-modulo.sh', 'iniciar-foundry.sh']) {
    escrever(pasta(`dev/servidor/${script}`), fs.readFileSync(path.join(raiz, 'servidor', script), 'utf8'));
  }
  // O instalar.mjs de mentira: anota cada instalação (com o Foundry 14 parado ou não) e falha se houver o FALHAR.
  escrever(pasta('dev/foundry-sistema/instalar.mjs'), `import fs from 'node:fs';
if (fs.existsSync(${JSON.stringify(pasta('FALHAR'))})) { console.error('Erro: o build dos compêndios falhou'); process.exit(1); }
const estado = fs.existsSync(${JSON.stringify(pasta('foundry14.estado'))}) ? fs.readFileSync(${JSON.stringify(pasta('foundry14.estado'))}, 'utf8').trim() : 'inactive';
fs.appendFileSync(${JSON.stringify(pasta('instalacoes.log'))}, [process.env.FOUNDRY_DATA, process.env.FOUNDRY_VERSAO, estado].join(' ') + '\\n');
`);
  escrever(pasta('dev/foundry-sistema/system.json'), '{ "id": "cpr-fieldbook", "version": "1" }\n');
  escrever(pasta('dev/documentos/morana/arquiteturas-da-campanha.md'), '# Arquiteturas\n');
  escrever(pasta('dev/index.html'), '<p>wiki</p>\n');
  const publicar = mensagem => { git(pasta('dev'), 'add', '-A'); git(pasta('dev'), 'commit', '-q', '-m', mensagem); git(pasta('dev'), 'push', '-q', 'origin', 'HEAD:master'); };
  publicar('Primeira');
  git(t, 'clone', '-q', 'origin.git', 'wiki');
  git(pasta('wiki'), 'config', 'core.autocrlf', 'false');
  const env = {
    ...process.env, PATH: `${pasta('bin')}${path.delimiter}${process.env.PATH}`, FIELDBOOK_WIKI: p(pasta('wiki')), FIELDBOOK_DADOS: p(pasta('dados')),
    FOUNDRY14_DADOS: p(pasta('foundry14/data')), FOUNDRY_STATUS: `file:///${p(pasta('status.json')).replace(/^\//, '')}`, GIT_CONFIG_PARAMETERS: "'core.autocrlf=false'"
  };
  const rodar = (script, ...args) => spawnSync(BASH, [p(path.join(pasta('wiki'), 'servidor', script)), ...args], { env, encoding: 'utf8' });
  const ler = nome => (fs.existsSync(pasta(nome)) ? fs.readFileSync(pasta(nome), 'utf8') : '');
  const linhas = nome => ler(nome).split('\n').filter(Boolean);
  const mesa14 = (estado, status = null) => {
    fs.writeFileSync(pasta('foundry14.estado'), `${estado}\n`);
    if (status) fs.writeFileSync(pasta('status.json'), JSON.stringify(status)); else fs.rmSync(pasta('status.json'), { force: true });
  };
  return { t, pasta, git, publicar, rodar, ler, linhas, mesa14, limpar: () => fs.rmSync(t, { recursive: true, force: true }) };
}

test('C28: com o Foundry 12 no ar, o atualizar.sh instala o sistema do master no 14 sem parar nada, uma vez por versão', { skip: !BASH && 'sem o bash', timeout: 120000 }, t => {
  const s = preparar();
  t.after(s.limpar);
  s.mesa14('inactive');
  const primeira = s.rodar('atualizar.sh');
  assert.equal(primeira.status, 0, primeira.stderr + primeira.stdout);
  assert.deepEqual(s.linhas('instalacoes.log'), [`${p(s.pasta('foundry14/data'))}/Data 14 inactive`]);
  const versao = s.ler('dados/.sistema-instalado').trim();
  assert.match(versao, /^[0-9a-f]{40}:[0-9a-f]{40}$/, 'a versão do foundry-sistema/ e a do documento das arquiteturas');
  assert.match(s.ler('dados/atualizacoes.log'), /sistema do Foundry 14 instalado/);
  assert.ok(!s.linhas('systemctl.log').some(l => /^(stop|start)/.test(l)), s.ler('systemctl.log'));
  // A mesma versão: nada de novo. Uma publicação fora do sistema também não reinstala.
  certo(s.rodar('atualizar.sh'));
  fs.writeFileSync(s.pasta('dev/index.html'), '<p>wiki nova</p>\n');
  s.publicar('Só a wiki');
  certo(s.rodar('atualizar.sh'));
  assert.match(s.ler('wiki/index.html'), /wiki nova/);
  assert.equal(s.linhas('instalacoes.log').length, 1);
  // O documento das arquiteturas da campanha entra num compêndio: mudar só ele reinstala.
  fs.writeFileSync(s.pasta('dev/documentos/morana/arquiteturas-da-campanha.md'), '# Arquiteturas\n\nOutra\n');
  s.publicar('Arquitetura nova');
  certo(s.rodar('atualizar.sh'));
  assert.equal(s.linhas('instalacoes.log').length, 2);
  assert.notEqual(s.ler('dados/.sistema-instalado').trim(), versao);
  assert.equal(s.ler('dados/.sistema-instalado').trim(), s.rodar('atualizar-sistema.sh', '--versao').stdout.trim());
});

test('C28: com gente na mesa do 14, o sistema espera (o .sistema-pendente); com a mesa vazia, para, instala e reabre o mesmo mundo', { skip: !BASH && 'sem o bash', timeout: 120000 }, t => {
  const s = preparar();
  t.after(s.limpar);
  s.mesa14('active', { active: true, world: 'protocolo-morana', users: 2, version: '14.369' });
  certo(s.rodar('atualizar.sh'));
  assert.equal(s.linhas('instalacoes.log').length, 0);
  assert.ok(fs.existsSync(s.pasta('dados/.sistema-pendente')));
  assert.ok(!s.linhas('systemctl.log').some(l => /^(stop|start)/.test(l)));
  // A mesa esvaziou (o mundo continua aberto): no minuto seguinte, para o 14, instala com ele parado e liga de novo.
  s.mesa14('active', { active: true, world: 'protocolo-morana', users: 0, version: '14.369' });
  certo(s.rodar('atualizar.sh'));
  assert.deepEqual(s.linhas('instalacoes.log').map(l => l.split(' ').at(-1)), ['inactive']);
  assert.deepEqual(s.linhas('systemctl.log').filter(l => /^(stop|start)/.test(l)), ['stop foundry14', 'start foundry14']);
  assert.equal(s.ler('foundry14.estado').trim(), 'active');
  assert.ok(!fs.existsSync(s.pasta('dados/.sistema-pendente')));
  assert.equal(s.ler('foundry14/data/.mundo-ao-ligar').trim(), 'protocolo-morana');
  // O iniciar-foundry.sh abre esse mundo uma vez (o --world do Foundry) e apaga o aviso.
  s.git(s.pasta('wiki'), 'status', '--short');
  const app = s.pasta('app');
  escrever(path.join(app, 'resources/app/main.mjs'), '');
  escrever(s.pasta('node-falso'), '#!/usr/bin/env bash\necho "$*"\n');
  const iniciar = () => spawnSync(BASH, [p(s.pasta('wiki/servidor/iniciar-foundry.sh')), p(app), p(s.pasta('foundry14/data')), p(s.pasta('node-falso'))], { encoding: 'utf8' });
  const comMundo = iniciar();
  assert.equal(comMundo.status, 0, comMundo.stderr);
  assert.match(comMundo.stdout, /main\.mjs --dataPath=\S+foundry14\/data --world=protocolo-morana$/m);
  assert.ok(!fs.existsSync(s.pasta('foundry14/data/.mundo-ao-ligar')));
  assert.doesNotMatch(iniciar().stdout, /--world/);
  // Com a mesa ocupada, o --agora (o instalar-sistema-v14.sh) instala mesmo assim; sem mundo aberto, não deixa o aviso.
  s.mesa14('active', { active: false, world: null, users: 3, version: '14.369' });
  const agora = s.rodar('atualizar-sistema.sh', '--agora');
  assert.equal(agora.status, 0, agora.stderr + agora.stdout);
  assert.equal(s.linhas('instalacoes.log').length, 2);
  assert.ok(!fs.existsSync(s.pasta('foundry14/data/.mundo-ao-ligar')));
  assert.equal(s.ler('foundry14.estado').trim(), 'active');
});

test('C28: o erro na instalação registra uma vez e religa o 14; a mesma versão não tenta de novo, a próxima tenta', { skip: !BASH && 'sem o bash', timeout: 120000 }, t => {
  const s = preparar();
  t.after(s.limpar);
  s.mesa14('active', { active: true, world: 'protocolo-morana', users: 0, version: '14.369' });
  fs.writeFileSync(s.pasta('FALHAR'), '');
  certo(s.rodar('atualizar.sh'));
  assert.equal(s.ler('foundry14.estado').trim(), 'active', 'o 14 volta ligado mesmo com o erro');
  assert.match(s.ler('dados/atualizacoes.log'), /sistema do Foundry 14: ERRO: Erro: o build dos compêndios falhou \(tudo em sistema-ultimo-erro.log\)/);
  assert.match(s.ler('dados/sistema-ultimo-erro.log'), /o build dos compêndios falhou/);
  assert.equal(s.ler('dados/.sistema-falhou').trim(), s.rodar('atualizar-sistema.sh', '--versao').stdout.trim());
  const comandos = s.linhas('systemctl.log').length;
  certo(s.rodar('atualizar.sh'));
  assert.equal(s.linhas('systemctl.log').filter(l => /^(stop|start)/.test(l)).length, 2, 'não para o 14 a cada minuto');
  assert.ok(s.linhas('systemctl.log').length >= comandos);
  // Consertado e publicado de novo: instala.
  fs.rmSync(s.pasta('FALHAR'));
  fs.writeFileSync(s.pasta('dev/foundry-sistema/system.json'), '{ "id": "cpr-fieldbook", "version": "2" }\n');
  s.publicar('Sistema consertado');
  certo(s.rodar('atualizar.sh'));
  assert.equal(s.linhas('instalacoes.log').length, 1);
  assert.ok(!fs.existsSync(s.pasta('dados/.sistema-falhou')));
  assert.match(s.ler('dados/atualizacoes.log'), /sistema do Foundry 14 instalado/);
});

test('C28: sem o Foundry 14 preparado, ou sem o foundry-sistema/ no master, não há o que instalar nem o que esperar', { skip: !BASH && 'sem o bash', timeout: 120000 }, t => {
  const s = preparar();
  t.after(s.limpar);
  fs.rmSync(s.pasta('foundry14/data/Data'), { recursive: true });
  assert.equal(s.rodar('atualizar-sistema.sh').status, 3);
  certo(s.rodar('atualizar.sh'));
  assert.ok(!fs.existsSync(s.pasta('dados/.sistema-pendente')));
  assert.ok(!fs.existsSync(s.pasta('dados/.sistema-falhou')));
  assert.equal(s.linhas('instalacoes.log').length, 0);
  fs.mkdirSync(s.pasta('foundry14/data/Data'));
  s.git(s.pasta('dev'), 'rm', '-q', '-r', 'foundry-sistema');
  s.git(s.pasta('dev'), 'commit', '-q', '-m', 'Sem o sistema');
  s.git(s.pasta('dev'), 'push', '-q', 'origin', 'HEAD:master');
  certo(s.rodar('atualizar.sh'));
  assert.equal(s.rodar('atualizar-sistema.sh', '--versao').stdout.trim(), '');
  assert.equal(s.rodar('atualizar-sistema.sh').status, 3);
  assert.equal(s.linhas('instalacoes.log').length, 0);
});

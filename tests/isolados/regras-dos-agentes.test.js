// O hook dos agentes (.claude/hooks/regras-dos-agentes.js): as regras do AGENTS.md que o Claude Code confere antes de a
// ferramenta rodar. Cada regra tem o caso que ela pega e os vizinhos que ela não pode pegar (a mensagem de um commit
// que fala do sed -i, o grep que procura o publicar.bat, as capturas de tests/.saida). As edições usam um repositório de
// mentira na pasta descartável. Sem Claude Code: o script roda com o JSON na entrada, como o PreToolUse o chama.
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const raiz = path.join(__dirname, '..', '..');
const SCRIPT = path.join(raiz, '.claude', 'hooks', 'regras-dos-agentes.js');
const { decidir } = require(SCRIPT);

const comando = (texto, ferramenta = 'Bash') => decidir({ tool_name: ferramenta, tool_input: { command: texto } });
const decisao = (texto, ferramenta) => (comando(texto, ferramenta) || { decisao: 'segue' }).decisao;

test('o sed -i é recusado, em qualquer forma; o sed sem -i e o texto que fala dele seguem', () => {
  for (const texto of [
    "sed -i 's/a/b/' AGENTS.md",
    "sed -Ei.bak 's/a/b/' README.md",
    "sed --in-place=.bak 's/a/b/' README.md",
    "find . -name '*.md' -exec sed -i 's/a/b/' {} \\;",
    "ls *.md | xargs /usr/bin/sed -i 's/a/b/'",
    'bash -c "sed -i s/a/b/ AGENTS.md"'
  ]) assert.equal(decisao(texto), 'deny', texto);
  assert.match(comando("sed -i 's/a/b/' x").motivo, /CRLF/);
  // Num comando com uma pergunta e uma recusa, vale a recusa.
  assert.equal(decisao('ssh ubuntu@203.0.113.7 uptime; sed -i s/a/b/ AGENTS.md'), 'deny');
  for (const texto of [
    "sed -n '1,20p' AGENTS.md",
    "sed -E 's/-i/x/' README.md",
    'grep -rn "sed -i" AGENTS.md',
    "git commit -m \"$(cat <<'EOF'\nO hook recusa o sed -i e o git push --force; o publicar.bat é do usuário.\nEOF\n)\"",
    "git commit -F - <<EOF\nnunca sed -i nem rm tests/sistema\nEOF"
  ]) assert.equal(decisao(texto), 'segue', texto);
  assert.equal(decisao("git commit -m @'\nnunca sed -i; publicar.ps1\n'@", 'PowerShell'), 'segue');
  // Um apóstrofo dentro da here-string desfaz o par das aspas: só a regra da here-string esconde o texto.
  assert.equal(decisao("git commit -m @'\nRegra da caixa d'água: nunca sed -i\n'@", 'PowerShell'), 'segue');
});

test('o push forçado é recusado; o push e o pull comuns seguem', () => {
  for (const texto of ['git push --force origin HEAD:master', 'git push -f', 'git -C ../wt push origin +HEAD:master', 'git push --force-with-lease origin master', 'git push -uf origin x', 'GIT_TRACE=1 git push --force']) {
    assert.equal(decisao(texto), 'deny', texto);
  }
  for (const texto of ['git push origin HEAD:master', 'git pull --no-rebase', 'git push --follow-tags origin master', 'git fetch -f origin']) {
    assert.equal(decisao(texto), 'segue', texto);
  }
});

test('os scripts de publicar do usuário não rodam; ler e procurar neles segue', () => {
  for (const [texto, ferramenta] of [
    ['./publicar.bat'],
    ['cmd //c publicar.bat'],
    ['& .\\publicar.ps1', 'PowerShell'],
    ['& "C:\\Users\\x\\Cyberpunk-Fieldbook\\publicar.ps1"', 'PowerShell'],
    ['powershell -ExecutionPolicy Bypass -File publicar.ps1', 'PowerShell'],
    ['start "" abrir-online.bat', 'PowerShell'],
    ['call publicar.bat'],
    ['git add -A && ./atualizar-modulo.bat']
  ]) assert.equal(decisao(texto, ferramenta), 'deny', texto);
  for (const [texto, ferramenta] of [['cat publicar.ps1'], ['Get-Content publicar.ps1', 'PowerShell'], ['grep -n "publicar.bat" README.md'], ['git diff -- publicar.ps1']]) {
    assert.equal(decisao(texto, ferramenta), 'segue', texto);
  }
});

test('matar o node, o Edge ou o Foundry pelo nome é recusado; pelo PID segue', () => {
  for (const [texto, ferramenta] of [
    ['taskkill /F /IM node.exe'],
    ['taskkill /IM "Foundry Virtual Tabletop.exe" /F'],
    ['Stop-Process -Name msedge -Force', 'PowerShell'],
    ['Get-Process node | Stop-Process', 'PowerShell'],
    ['pkill node'],
    ['killall msedge'],
    ['wmic process where "name=\'node.exe\'" delete'],
    ['powershell -Command "taskkill /IM node.exe /F"', 'PowerShell']
  ]) assert.equal(decisao(texto, ferramenta), 'deny', texto);
  assert.match(comando('taskkill /F /IM node.exe').motivo, /PID/);
  for (const [texto, ferramenta] of [
    ['taskkill /F /PID 1234'],
    ['Stop-Process -Id 1234 -Force', 'PowerShell'],
    ['Get-Process node | Where-Object { $_.Id -eq 1234 } | Stop-Process', 'PowerShell'],
    ['Get-Process node', 'PowerShell'],
    ['node tests/rodar.js v14']
  ]) assert.equal(decisao(texto, ferramenta), 'segue', texto);
});

test('entrar no servidor e rodar os scripts dele pergunta ao usuário; o teste dos scripts segue', () => {
  for (const texto of [
    "ssh -i chave ubuntu@203.0.113.7 'cat /srv/fieldbook/dados/mesa.json'",
    'scp roteiro.md ubuntu@203.0.113.7:/srv/fieldbook/',
    'ssh.exe ubuntu@203.0.113.7 uptime',
    'bash servidor/instalar-sistema-v14.sh',
    './servidor/atualizar.sh'
  ]) assert.equal(decisao(texto), 'ask', texto);
  for (const texto of ['node --test tests/isolados/servidor-sistema.test.js', 'cat servidor/atualizar.sh', 'git log -- servidor/atualizar-sistema.sh', 'bash -n servidor/instalar-sistema-v14.sh && echo sintaxe-ok']) {
    assert.equal(decisao(texto), 'segue', texto);
  }
});

test('apagar a trava dos testes pergunta; ler a trava segue', () => {
  for (const [texto, ferramenta] of [
    ['rm "$LOCALAPPDATA/FieldbookTeste/testes.trava"'],
    ['Remove-Item "$env:LOCALAPPDATA\\FieldbookTeste\\testes.trava"', 'PowerShell'],
    ['node -e "require(\'fs\').unlinkSync(process.env.LOCALAPPDATA + \'/FieldbookTeste/testes.trava\')"'],
    // O script do Node num heredoc dentro das aspas: o texto de dentro também conta.
    ["node -e \"$(cat <<'EOF'\nrequire('fs').unlinkSync(process.env.LOCALAPPDATA + '/FieldbookTeste/testes.trava')\nEOF\n)\""]
  ]) assert.equal(decisao(texto, ferramenta), 'ask', texto);
  assert.equal(decisao('cat "$LOCALAPPDATA/FieldbookTeste/testes.trava"'), 'segue');
});

test('apagar um teste pergunta; as capturas de tests/.saida e as pastas descartáveis seguem', () => {
  for (const [texto, ferramenta] of [
    ['rm tests/sistema/armadura.test.mjs'],
    ['git rm tests/cenarios/v14.js'],
    ['rm -rf tests'],
    ['Remove-Item -Recurse tests\\sistema', 'PowerShell'],
    ['rm -f "C:/x/wt-v14/tests/lib/trava.js"']
  ]) assert.equal(decisao(texto, ferramenta), 'ask', texto);
  for (const [texto, ferramenta] of [
    ['rm -rf tests/.saida/v14-ficha-1.png'],
    ['rm -rf tests/.saida'],
    ['Remove-Item -Recurse -Force "$env:LOCALAPPDATA\\FieldbookTeste\\wiki-testes-edge-123"', 'PowerShell'],
    ['rm -rf mytests/x']
  ]) assert.equal(decisao(texto, ferramenta), 'segue', texto);
});

test('o pedido sem comando, outra ferramenta ou um defeito na entrada seguem', () => {
  assert.equal(decidir({ tool_name: 'Bash', tool_input: {} }), null);
  assert.equal(decidir({ tool_name: 'Read', tool_input: { file_path: 'system-rules.js' } }), null);
  assert.equal(decidir(null), null);
});

// Um repositório de mentira (só a pasta .git) na pasta descartável, para as regras das edições.
function repositorio() {
  const base = path.join(process.env.LOCALAPPDATA || os.tmpdir(), 'FieldbookTeste');
  fs.mkdirSync(base, { recursive: true });
  const pasta = fs.mkdtempSync(path.join(base, 'regras-dos-agentes-'));
  fs.mkdirSync(path.join(pasta, '.git'));
  return pasta;
}

test('as edições na fonte das regras, no Foundry 12, nos scripts do usuário e nos hooks perguntam; o resto segue', t => {
  const pasta = repositorio();
  t.after(() => fs.rmSync(pasta, { recursive: true, force: true }));
  const editar = (relativo, ferramenta = 'Edit', extra = {}) => (decidir({ tool_name: ferramenta, tool_input: { file_path: path.join(pasta, ...relativo.split('/')), old_string: 'a', new_string: 'b', content: 'b', ...extra } }) || { decisao: 'segue' });

  for (const relativo of ['system-rules.js', 'system-2077.js', 'foundry-2077/module.json', 'foundry-painel-tatico/scripts/painel.js', 'publicar.ps1', '.claude/settings.json', '.claude/hooks/regras-dos-agentes.js']) {
    assert.equal(editar(relativo).decisao, 'ask', relativo);
    assert.equal(editar(relativo, 'Write').decisao, 'ask', relativo);
  }
  assert.match(editar('system-rules.js').motivo, /fonte das regras/);
  assert.match(editar('foundry-net-architect/x.js').motivo, /Foundry 12/);
  for (const relativo of ['foundry-sistema/scripts/combate/cartao.mjs', 'api-campanhas.js', 'documentos/system-notas.js', '.claude/skills/fechar-sessao/SKILL.md', 'AGENTS.md', 'tests/sistema/novo.test.mjs']) {
    assert.equal(editar(relativo).decisao, 'segue', relativo);
  }
  // Fora de um repositório, as regras do repositório não valem.
  const solta = fs.mkdtempSync(path.join(path.dirname(pasta), 'solta-'));
  t.after(() => fs.rmSync(solta, { recursive: true, force: true }));
  assert.equal(decidir({ tool_name: 'Edit', tool_input: { file_path: path.join(solta, 'system-rules.js'), old_string: 'a', new_string: 'b' } }), null);
});

test('uma edição que tira um assert ou um passo do G4 pergunta; a que acrescenta ou mantém segue', t => {
  const pasta = repositorio();
  t.after(() => fs.rmSync(pasta, { recursive: true, force: true }));
  const teste = path.join(pasta, 'tests', 'sistema', 'armadura.test.mjs');
  const cenario = path.join(pasta, 'tests', 'cenarios', 'v14.js');
  const editar = (arquivo, old_string, new_string) => (decidir({ tool_name: 'Edit', tool_input: { file_path: arquivo, old_string, new_string } }) || { decisao: 'segue' });

  const dois = "assert.equal(sp, 11);\nassert.deepEqual(camadas, [11, 7]);";
  const tira = editar(teste, dois, 'assert.equal(sp, 11);');
  assert.equal(tira.decisao, 'ask');
  assert.match(tira.motivo, /tira 1 checagem/);
  assert.equal(editar(teste, dois, `${dois}\nassert.ok(ablou);`).decisao, 'segue');
  assert.equal(editar(teste, dois, dois.replace('11, 7', '11, 6')).decisao, 'segue');
  assert.equal(editar(cenario, "await r.passo('a', async () => {});\nawait r.passo('b', async () => {});", "await r.passo('a', async () => {});").decisao, 'ask');

  // O Write num teste que existe compara com o arquivo do disco; um teste novo segue.
  fs.mkdirSync(path.dirname(teste), { recursive: true });
  fs.writeFileSync(teste, dois);
  const escrever = content => (decidir({ tool_name: 'Write', tool_input: { file_path: teste, content } }) || { decisao: 'segue' }).decisao;
  assert.equal(escrever('assert.equal(sp, 11);'), 'ask');
  assert.equal(escrever(`${dois}\nassert.ok(x);`), 'segue');
  assert.equal(decidir({ tool_name: 'Write', tool_input: { file_path: path.join(pasta, 'tests', 'sistema', 'novo.test.mjs'), content: '' } }), null);
});

test('o script fala o protocolo do PreToolUse: o JSON na entrada, a decisão na saída, nada quando segue', () => {
  const rodar = entrada => spawnSync(process.execPath, [SCRIPT], { input: entrada, encoding: 'utf8' });
  const recusado = rodar(JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: "sed -i 's/a/b/' x" } }));
  assert.equal(recusado.status, 0, recusado.stderr);
  const saida = JSON.parse(recusado.stdout).hookSpecificOutput;
  assert.equal(saida.hookEventName, 'PreToolUse');
  assert.equal(saida.permissionDecision, 'deny');
  assert.match(saida.permissionDecisionReason, /CRLF/);

  for (const entrada of [JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'git status' } }), 'isto não é JSON', '']) {
    const r = rodar(entrada);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, '', entrada);
  }
});

test('o .claude/settings.json chama o script em toda ferramenta que ele confere', () => {
  const config = JSON.parse(fs.readFileSync(path.join(raiz, '.claude', 'settings.json'), 'utf8'));
  const grupos = config.hooks.PreToolUse;
  const nosso = grupos.flatMap(g => g.hooks.map(h => ({ ...h, matcher: g.matcher }))).find(h => (h.args || []).some(a => a.endsWith('/.claude/hooks/regras-dos-agentes.js')));
  assert.ok(nosso, 'o hook não está no settings.json');
  assert.equal(nosso.type, 'command');
  assert.equal(nosso.command, 'node');
  assert.equal(nosso.args[0], '${CLAUDE_PROJECT_DIR}/.claude/hooks/regras-dos-agentes.js');
  for (const ferramenta of ['Bash', 'PowerShell', 'Edit', 'Write', 'NotebookEdit']) {
    assert.ok(new RegExp(`^(${nosso.matcher})$`).test(ferramenta), ferramenta);
  }
  assert.ok(fs.existsSync(SCRIPT));
});

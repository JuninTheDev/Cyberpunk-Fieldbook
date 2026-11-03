// As regras do AGENTS.md ("Nunca", "O G4 neste PC", "Publicar") que dá para conferir antes de a ferramenta rodar. O Claude
// Code chama este script no PreToolUse (o .claude/settings.json) com o pedido em JSON na entrada; ele devolve "deny" (não
// roda) ou "ask" (pergunta ao usuário), com o motivo, ou nada (segue). Vale para toda sessão do Claude Code no
// repositório, os workers inclusive; o Codex e o Antigravity não passam por aqui.
//   deny → o que nunca está certo: o sed -i, o push forçado, rodar os scripts de publicar do usuário, matar processo pelo
//          nome (o node é a wiki do usuário, o Foundry e os testes das outras sessões; o msedge é o navegador dele);
//   ask  → o que é decisão do usuário: entrar no servidor, os módulos do Foundry 12, a fonte das regras (system-*.js), os
//          scripts de publicar e os hooks, apagar a trava dos testes, tirar um teste ou uma checagem.
// Não é uma caixa de areia: um script que escreve o arquivo por conta própria passa. É a trava do engano honesto.
const fs = require('node:fs');
const path = require('node:path');

const SCRIPTS_DO_USUARIO = /^(publicar\.(ps1|bat)|atualizar-modulo\.bat|abrir-online\.(ps1|bat))$/i;
const FOUNDRY_12 = /^(foundry-2077|foundry-fluxo-de-combate|foundry-net-architect|foundry-painel-tatico)\//;
const PROCESSO_DIVIDIDO = /^["']?(node|msedge|foundry)/i;
const APAGAR = /^(rm|del|erase|rmdir|rd|remove-item|ri|unlink)$/i;
// Uma checagem de teste: um assert do G3 e dos isolados, ou um passo do cenário do G4 (r.passo).
const CHECAGEM = /\bassert(\.\w+)?\s*\(|\.passo\s*\(/g;

const negar = motivo => ({ decisao: 'deny', motivo });
const perguntar = motivo => ({ decisao: 'ask', motivo });

// Tira do comando o que é texto, não comando: o corpo dos heredocs e das here-strings do PowerShell, e o que está entre
// aspas, que vira uma marca (\u0000N\u0000). Assim a mensagem de um commit que fala do sed -i não conta como sed -i.
function separarTextos(comando) {
  const textos = [];
  const marcar = trecho => `\u0000${textos.push(trecho) - 1}\u0000`;
  const semCorpos = comando
    .replace(/<<-?\s*(['"]?)(\w+)\1[^\n]*\n[\s\S]*?\n\s*\2[ \t]*(?=\n|$)/g, corpo => marcar(corpo))
    .replace(/@(['"])\r?\n[\s\S]*?\r?\n\1@/g, corpo => marcar(corpo));
  const semAspas = semCorpos.replace(/'[^']*'|"(?:\\.|[^"\\])*"/g, trecho => marcar(trecho));
  const devolver = texto => texto.replace(/\u0000(\d+)\u0000/g, (_, n) => devolver(textos[Number(n)]));
  return { semAspas, devolver };
}

const tirarAspas = palavra => palavra.replace(/^(['"])([\s\S]*)\1$/, '$2');

// A palavra que o trecho executa, sem os prefixos que só chamam outro programa (cmd /c, call, start, powershell -File,
// bash script.sh), sem o ./ e sem a pasta.
function programa(palavras) {
  let i = 0;
  while (i < palavras.length && /^\w+=/.test(palavras[i])) i += 1;
  for (;;) {
    const palavra = (palavras[i] || '').toLowerCase();
    if (['call', 'exec', 'sudo', 'nohup', 'time'].includes(palavra)) i += 1;
    else if (palavra === 'start') { i += 1; while (/^(\/\w+|""|'')$/.test(palavras[i] || '')) i += 1; }
    else if (/^cmd(\.exe)?$/.test(palavra) && /^\/\/?[ck]$/i.test(palavras[i + 1] || '')) i += 2;
    else if (/^(powershell|pwsh)(\.exe)?$/.test(palavra) || /^(bash|sh)(\.exe)?$/.test(palavra)) {
      const shell = /^(bash|sh)/.test(palavra);
      i += 1;
      while (/^-/.test(palavras[i] || '')) {
        const opcao = palavras[i].toLowerCase();
        i += 1;
        // O bash -n só confere a sintaxe do script: não roda nada.
        if (shell && /^-[a-z]*n[a-z]*$/.test(opcao)) return '';
        if (opcao === '-file') break;
        if (/^-(executionpolicy|ex|ep|windowstyle)$/.test(opcao)) i += 1;
      }
      if (i >= palavras.length) return '';
    } else break;
  }
  return path.basename(tirarAspas(palavras[i] || '').replace(/\\/g, '/'));
}

// O que fazer com um trecho do comando (entre ;, &&, ||, | ou uma quebra de linha).
function conferirTrecho(trecho, inteiro) {
  const palavras = trecho.trim().split(/\s+/).filter(Boolean);
  const nome = programa(palavras.map(inteiro));
  const minusculo = nome.toLowerCase().replace(/\.exe$/, '');
  const texto = inteiro(trecho);
  // O sed pode vir depois de outro programa (find -exec, xargs): conta a palavra sed em qualquer lugar do trecho.
  const sed = palavras.findIndex(p => /^(.*[\\/])?sed(\.exe)?$/i.test(p));

  if (sed >= 0 && palavras.slice(sed + 1).some(p => /^-[a-z]*i/i.test(p) || p.startsWith('--in-place'))) {
    return negar('O sed -i troca o CRLF por LF (AGENTS.md, "Nunca"). Edite com a ferramenta de edição ou com um script do Node, mantendo o final de linha do arquivo.');
  }
  if (minusculo === 'git' && palavras.includes('push') && palavras.some(p => /^(--force\S*|-[a-z]*f[a-z]*|\+\S+)$/i.test(p))) {
    return negar('Nunca force o push (AGENTS.md, "O ciclo"): traga o que os outros publicaram com git pull --no-rebase e junte.');
  }
  if (SCRIPTS_DO_USUARIO.test(nome)) {
    return negar(`O ${nome} é do usuário (AGENTS.md, "Nunca", "Publicar"): só ele roda.`);
  }
  if (minusculo === 'taskkill' && /\/im\s+["']?(node|msedge|foundry)/i.test(texto)
    || /^(stop-process|spps|kill)$/.test(minusculo) && /\s-n(ame)?\s+["']?(node|msedge|foundry)/i.test(texto)
    || /^(pkill|killall)$/.test(minusculo) && palavras.slice(1).some(p => PROCESSO_DIVIDIDO.test(inteiro(p)))
    || minusculo === 'wmic' && /name\s*=\s*\\?["']?(node|msedge|foundry)[\s\S]*\b(delete|terminate)\b/i.test(texto)) {
    return negar('Pare o processo pelo PID, nunca pelo nome (AGENTS.md, "O G4 neste PC"): o node é a wiki do usuário, o Foundry e os testes das outras sessões, e o msedge é o navegador dele.');
  }
  if (/^(ssh|scp|sftp|rsync)$/.test(minusculo)) {
    return perguntar('Entrar no servidor ou rodar algo nele só quando o usuário pedir (AGENTS.md, "O servidor").');
  }
  if (/\.sh$/.test(minusculo) && /(^|[\s\\/])servidor[\\/][^\\/\s]+\.sh/.test(texto.replace(/["']/g, ''))) {
    return perguntar(`O ${nome} roda no servidor (AGENTS.md, "O servidor"). Aqui, ele se testa pelo tests/isolados/servidor-sistema.test.js.`);
  }
  const apaga = APAGAR.test(minusculo) || minusculo === 'git' && palavras.includes('rm');
  if (/testes\.trava/i.test(texto) && (apaga || /unlink|rmSync|\brm\s*\(/.test(texto))) {
    return perguntar('Não apague a trava de um teste vivo (AGENTS.md, "O G4 neste PC"): a de um teste interrompido vale como solta sozinha.');
  }
  // A pasta tests/ inteira ou algo dentro dela, menos as capturas de tests/.saida.
  if (apaga && palavras.slice(1).some(p => /(^|[\\/])tests([\\/]*$|[\\/](?!\.saida([\\/]|$)).)/i.test(tirarAspas(inteiro(p))))) {
    return perguntar('Nenhum teste se tira para passar (AGENTS.md, "Nunca"). Confirme que apagar este arquivo de tests/ é o que o item pede.');
  }
  // bash -c "...", powershell -Command "...": confere o comando de dentro também.
  const dentro = trecho.match(/^\s*(?:bash|sh|powershell|pwsh)(?:\.exe)?\s+(?:-\w+\s+)*-(?:c|command)\s+(\u0000\d+\u0000)/i);
  if (dentro) return conferirComando(tirarAspas(inteiro(dentro[1])));
  return null;
}

function conferirComando(comando) {
  const { semAspas, devolver } = separarTextos(String(comando || ''));
  if (/get-process\s+(-name\s+)?(node|msedge|foundry)\S*\s*\|\s*(stop-process|spps|kill)\b/i.test(semAspas)) {
    return negar('Pare o processo pelo PID, nunca pelo nome (AGENTS.md, "O G4 neste PC"): o node é a wiki do usuário, o Foundry e os testes das outras sessões, e o msedge é o navegador dele.');
  }
  const decisoes = semAspas.split(/&&|\|\||[;|&\n]/).map(trecho => conferirTrecho(trecho, devolver)).filter(Boolean);
  return decisoes.find(d => d.decisao === 'deny') || decisoes[0] || null;
}

// O caminho do arquivo dentro do repositório (com barras normais), ou null fora de um repositório.
function caminhoNoRepositorio(arquivo) {
  const absoluto = path.resolve(arquivo);
  for (let pasta = path.dirname(absoluto); ; pasta = path.dirname(pasta)) {
    if (fs.existsSync(path.join(pasta, '.git'))) return path.relative(pasta, absoluto).replace(/\\/g, '/');
    if (path.dirname(pasta) === pasta) return null;
  }
}

const contarChecagens = texto => (String(texto || '').match(CHECAGEM) || []).length;

function conferirEdicao(ferramenta, entrada) {
  const arquivo = entrada.file_path || entrada.notebook_path;
  if (!arquivo) return null;
  const relativo = caminhoNoRepositorio(arquivo);
  if (relativo === null) return null;

  if (FOUNDRY_12.test(relativo)) {
    return perguntar(`O ${relativo.split('/')[0]} é do Foundry 12 da mesa (AGENTS.md, "Nunca"): serve de referência, não se mexe.`);
  }
  if (/^system-[\w-]+\.js$/.test(relativo)) {
    return perguntar(`O ${relativo} é a fonte das regras (AGENTS.md, "Nunca"): não muda para um teste passar, e regra nova só com a fonte e um teste de referência.`);
  }
  if (SCRIPTS_DO_USUARIO.test(relativo)) {
    return perguntar(`O ${relativo} é do usuário (AGENTS.md, "Nunca", "Publicar").`);
  }
  if (/^\.claude\/(hooks\/|settings\.json$)/.test(relativo)) {
    return perguntar('Os hooks são as regras dos agentes: mudar ou desligar um deles é decisão do usuário.');
  }
  if (/^tests\//.test(relativo)) {
    let antes = 0;
    let depois = 0;
    if (ferramenta === 'Edit') {
      antes = contarChecagens(entrada.old_string);
      depois = contarChecagens(entrada.new_string);
    } else if (ferramenta === 'Write' && fs.existsSync(arquivo)) {
      antes = contarChecagens(fs.readFileSync(arquivo, 'utf8'));
      depois = contarChecagens(entrada.content);
    }
    if (depois < antes) {
      return perguntar(`Esta mudança tira ${antes - depois} checagem(ns) do ${relativo} (asserts ou passos do G4). Nenhum teste se tira nem se afrouxa para passar (AGENTS.md, "Nunca").`);
    }
  }
  return null;
}

// A decisão para um pedido do PreToolUse: { decisao: 'deny' | 'ask', motivo } ou null.
function decidir(pedido) {
  const ferramenta = pedido && pedido.tool_name;
  const entrada = (pedido && pedido.tool_input) || {};
  if (ferramenta === 'Bash' || ferramenta === 'PowerShell') return conferirComando(entrada.command);
  if (ferramenta === 'Edit' || ferramenta === 'Write' || ferramenta === 'NotebookEdit') return conferirEdicao(ferramenta, entrada);
  return null;
}

module.exports = { decidir };

if (require.main === module) {
  let texto = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', parte => { texto += parte; });
  process.stdin.on('end', () => {
    let resposta = null;
    // Um defeito aqui não pode travar as sessões: na dúvida, segue.
    try { resposta = decidir(JSON.parse(texto)); } catch { resposta = null; }
    if (resposta) {
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: resposta.decisao, permissionDecisionReason: resposta.motivo }
      }));
    }
  });
}

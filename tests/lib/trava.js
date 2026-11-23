// Um teste com navegador por vez neste PC. As sessões (a worktree e o clone de cada agente) dividem o Foundry 14 de
// teste, a pasta descartável %LOCALAPPDATA%\FieldbookTeste e as portas (a 31014, a 8765 e as do Edge a partir da 9340).
// A trava é um arquivo na pasta descartável, com o processo que a tem e a pasta de onde ele roda; quem chega espera ela
// sair. A de um processo que já não existe (um teste interrompido) vale como solta, e a ilegível que ficou para trás
// também, depois de um minuto.
const fs = require('fs');
const os = require('os');
const path = require('path');

const TRAVA = path.join(process.env.LOCALAPPDATA || os.tmpdir(), 'FieldbookTeste', 'testes.trava');
const ILEGIVEL = 60000;

const vivo = pid => { try { process.kill(pid, 0); return true; } catch (error) { return error.code === 'EPERM'; } };
const lerTexto = arquivo => { try { return fs.readFileSync(arquivo, 'utf8'); } catch { return null; } };
const ler = arquivo => { try { return JSON.parse(lerTexto(arquivo)); } catch { return null; } };
const idade = arquivo => { try { return Date.now() - fs.statSync(arquivo).mtimeMs; } catch { return 0; } };
// Apaga a trava velha só se ela ainda é a que foi lida (o C60): duas sessões esperando o mesmo teste morto liam o dono
// morto, uma apagava e gravava a dela, e a outra apagava a da primeira; ficavam dois G4 ao mesmo tempo.
function soltarSeAinda(arquivo, lida) {
  if (lerTexto(arquivo) !== lida) return false;
  fs.rmSync(arquivo, { force: true });
  return true;
}
// O teto da espera: um PID reaproveitado pelo Windows deixa o dono morto "vivo" para sempre (TRAVA_MAX_MS; 6 h).
const TETO = Number(process.env.TRAVA_MAX_MS || 6 * 3600000);

// Espera a vez e pega a trava. Devolve a função que a solta (que também roda na saída do processo).
async function travar({ arquivo = TRAVA, espera = 5000, teto = TETO, avisar = texto => console.log(texto) } = {}) {
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  let avisou = false;
  const comeco = Date.now();
  for (;;) {
    try {
      fs.writeFileSync(arquivo, JSON.stringify({ pid: process.pid, pasta: path.resolve(__dirname, '..', '..'), desde: new Date().toISOString() }), { flag: 'wx' });
      const soltar = () => { if (ler(arquivo)?.pid === process.pid) fs.rmSync(arquivo, { force: true }); };
      process.on('exit', soltar);
      return soltar;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
    const lida = lerTexto(arquivo);
    let dono = null;
    try { dono = JSON.parse(lida); } catch { /* ilegível */ }
    if (dono ? !vivo(dono.pid) : idade(arquivo) > ILEGIVEL) { soltarSeAinda(arquivo, lida); continue; }
    if (Date.now() - comeco > teto) throw new Error(`A trava (${arquivo}) continua com outro teste depois de ${Math.round(teto / 60000)} min: confira se ele está vivo (o pid ${dono?.pid ?? '?'}).`);
    if (!avisou) {
      avisar(`Outro teste está rodando${dono ? ` (${dono.pasta}, desde ${dono.desde})` : ''}: esperando ele terminar (a trava: ${arquivo}).`);
      avisou = true;
    }
    await new Promise(resolve => setTimeout(resolve, espera));
  }
}

module.exports = { travar, soltarSeAinda, TRAVA };

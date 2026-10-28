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
const ler = arquivo => { try { return JSON.parse(fs.readFileSync(arquivo, 'utf8')); } catch { return null; } };
const idade = arquivo => { try { return Date.now() - fs.statSync(arquivo).mtimeMs; } catch { return 0; } };

// Espera a vez e pega a trava. Devolve a função que a solta (que também roda na saída do processo).
async function travar({ arquivo = TRAVA, espera = 5000, avisar = texto => console.log(texto) } = {}) {
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  let avisou = false;
  for (;;) {
    try {
      fs.writeFileSync(arquivo, JSON.stringify({ pid: process.pid, pasta: path.resolve(__dirname, '..', '..'), desde: new Date().toISOString() }), { flag: 'wx' });
      const soltar = () => { if (ler(arquivo)?.pid === process.pid) fs.rmSync(arquivo, { force: true }); };
      process.on('exit', soltar);
      return soltar;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
    const dono = ler(arquivo);
    if (dono ? !vivo(dono.pid) : idade(arquivo) > ILEGIVEL) { fs.rmSync(arquivo, { force: true }); continue; }
    if (!avisou) {
      avisar(`Outro teste está rodando${dono ? ` (${dono.pasta}, desde ${dono.desde})` : ''}: esperando ele terminar (a trava: ${arquivo}).`);
      avisou = true;
    }
    await new Promise(resolve => setTimeout(resolve, espera));
  }
}

module.exports = { travar, TRAVA };

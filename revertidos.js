// Alerta de arquivo revertido. A pasta fica no OneDrive, que já voltou arquivos da campanha para versões
// antigas sem avisar. Um arquivo modificado que é idêntico a uma versão antiga do git (e não à atual) foi revertido.
// Usado pelo server.js (faixa vermelha na wiki do mestre) e pelo publicar.ps1 (não deixa publicar a versão antiga).
// Na linha de comando: node revertidos.js → lista os revertidos e sai com código 1 se houver algum.
const { execFile } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const runGit = (root, args) => new Promise(resolve => {
  execFile('git', args, { cwd: root, maxBuffer: 20 * 1024 * 1024, windowsHide: true }, (error, stdout) => resolve(error ? null : stdout));
});
// Hash que o git daria ao conteúdo; com e sem CRLF, porque commits antigos guardaram CRLF.
const blobHash = buffer => crypto.createHash('sha1').update(`blob ${buffer.length}\0`).update(buffer).digest('hex');

async function findRevertedFiles(root) {
  const status = await runGit(root, ['status', '--porcelain', '-z']);
  if (status === null) return null; // sem git ou fora de um repositório: sem alerta
  const modified = status.split('\0').filter(line => /^( M|M |MM)/.test(line)).map(line => line.slice(3));
  const reverted = [];
  for (const file of modified) {
    let raw;
    try { raw = fs.readFileSync(path.join(root, file)); } catch { continue; }
    const head = (await runGit(root, ['rev-parse', `HEAD:${file}`]) || '').trim();
    const hashes = new Set([blobHash(raw), blobHash(Buffer.from(raw.toString('utf8').replace(/\r\n/g, '\n'), 'utf8'))]);
    if (hashes.has(head)) continue; // só o fim de linha mudou
    for (const hash of hashes) {
      const commits = (await runGit(root, ['log', '--all', '--format=%h', `--find-object=${hash}`, '--', file]) || '').trim().split('\n').filter(Boolean);
      if (commits.length) { reverted.push({ arquivo: file, commit: commits[commits.length - 1] }); break; }
    }
  }
  return reverted;
}

module.exports = { findRevertedFiles, runGit };

if (require.main === module) {
  findRevertedFiles(__dirname).then(reverted => {
    for (const { arquivo, commit } of reverted || []) console.log(`${arquivo} voltou para a versão ${commit}. Para restaurar: git checkout HEAD -- "${arquivo}"`);
    process.exit(reverted && reverted.length ? 1 : 0);
  });
}

const fs = require('fs');
const http = require('http');
const path = require('path');

const root = __dirname;
const port = Number(process.env.PORT || 8000);
// A wiki contém segredos do mestre: por padrão só este computador acessa.
// Para abrir na rede local (ex.: tablet do mestre), rode com HOST=0.0.0.0.
const host = process.env.HOST || '127.0.0.1';
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

http.createServer((request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch {
    response.writeHead(400);
    response.end('Bad request');
    return;
  }

  if (pathname === '/') pathname = '/index.html';
  const filePath = path.resolve(root, `.${pathname}`);
  if (!filePath.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  fs.stat(filePath, (error, stats) => {
    if (error || !stats.isFile()) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }

    response.writeHead(200, {
      'Content-Length': stats.size,
      'Content-Type': contentTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream'
    });
    fs.createReadStream(filePath).pipe(response);
  });
}).listen(port, host, () => {
  console.log(`Night City wiki: http://localhost:${port}`);
  if (host !== '127.0.0.1') console.log(`Aberta na rede (${host}:${port}). Quem estiver na mesma rede pode ver os segredos do mestre.`);
});
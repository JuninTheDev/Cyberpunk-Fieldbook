// O que um jogador (qualquer aparelho que não seja o do mestre) pode baixar, numa lista só: o server.js a lê (require)
// para liberar os arquivos, e o sw.js (a wiki instalada no celular) também (importScripts) para guardá-los. Eram duas
// listas iguais à mão, e um arquivo novo só numa delas quebrava a instalação no celular (o cache.addAll falha inteiro) ou
// deixava a wiki sem ele sem rede (a fase 3 da auditoria de 2026-11-16).
// Os arquivos de regras não têm notas de campanha; elas ficam no index.html. O que o mestre publica em cada campanha
// não é arquivo: vem pela API (/api/visao), só para quem joga nela. O wiki-nomes.js (os nomes que viram link) é só o
// código, sem dados: os nomes dos jogadores também vêm pela API.
(lista => {
  if (typeof module === 'object' && module.exports) module.exports = lista;
  else self.ARQUIVOS_PUBLICOS = lista;
})({
  // Guardados no aparelho quando a wiki é instalada (e de novo a cada publicação que muda um deles).
  guardados: [
    '/jogadores.html', '/mestre.html', '/wiki.css', '/netwire.css', '/netwire.js', '/wiki-app.js', '/wiki-nomes.js', '/nightcity-map.js',
    '/system-catalog.js', '/system-rules.js', '/system-net.js', '/system-2077.js', '/system-blackchrome.js', '/system-modificacoes.js', '/system-glossario.js',
    '/system-criacao.js', '/personagem-roles.js', '/personagem-cyberware.js', '/personagem-jogo.js', '/loja-catalogo.js', '/popup.js', '/criador.js', '/conta.js',
    '/cyberpunk-css-main/cyberpunk-css-main/cyberpunk.css',
    // A wiki instalada no celular: o manifesto e os ícones.
    '/manifest.webmanifest', '/icones/icone-192.png', '/icones/icone-512.png'
  ],
  // Liberados, mas não guardados na instalação: o mapa-base (guardado quando é aberto), o próprio service worker, esta
  // lista e o ícone em SVG.
  servidos: ['/nightcity-map-base.webp', '/sw.js', '/arquivos-publicos.js', '/icones/icone.svg']
});

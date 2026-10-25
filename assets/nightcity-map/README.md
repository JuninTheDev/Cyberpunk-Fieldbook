# Mapa detalhado de Night City

Tiles WebP do mapa local fornecido para a mesa, com cartografia CD PROJEKT RED / Piggyback.
O site não consulta a CDN de origem nem executa os scripts de download do projeto original.

| Nível | Grade | Arquivos |
| --- | --- | --- |
| 3 | 7 × 7 | 49 |
| 4 | 14 × 14 | 196 |
| 5 | 28 × 27 | 756 |
| 6 | 56 × 54 | 3.024 |
| 7 | 112 × 108 | 12.096 |

Total: **16.121 tiles**, **143.956.688 bytes** (137,3 MiB), cada um com 256 × 256 pixels.
A grade é XYZ: o X cresce para a direita e o Y para baixo, sem inversão TMS.
O enquadramento é de 7.168 × 6.912 pixels no nível 5 (28.672 × 27.648 no nível 7).
Os níveis 3 e 4 têm margem inferior: o renderer recorta essa sobra para conservar o enquadramento.

`nightcity-map.js` carrega apenas a região visível, com a visão geral por baixo enquanto chega o detalhe.
O service worker guarda até 256 tiles recentes; regiões ainda não visitadas precisam de conexão.
O servidor libera publicamente somente caminhos `tiles/{3..7}/{x}/{y}.webp` com coordenadas inteiras não negativas.
Os pontos da campanha continuam vindo de `campaign-map.js` para o mestre e da API de publicação para os jogadores.

As coordenadas públicas existentes permanecem no espaço 5.600 × 5.320. O registro geográfico em `nightcity-map.js`
converte esse espaço para pixels do nível 5:

```text
x = 1,2417435565 × xAntigo + 89,8348954
y = 1,2423296961 × yAntigo + 44,6123878
```

O alinhamento foi conferido no aeroporto, nos docks, no centro e nas fazendas solares.

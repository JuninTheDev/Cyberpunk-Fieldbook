// C46.3: a tripulação do token, sem Foundry. Referência: master, Tabletop/mesa-api.js (M17).
const numero = (valor, padrao = 0) => Number.isFinite(Number(valor)) ? Number(valor) : padrao;
const tamanho = valor => Math.max(0.01, numero(valor, 1));

// M17, mesa-api.js:1302-1315: dono do ocupante, capacidade e até 2 quadrados da borda; mestre de longe.
// Decisão desta parte: personagem/capanga pode entrar num veículo visível de NPC ou de outro dono.
// A distância já vem em quadrados, descontada a metade do tamanho do veículo, como no M17.
export function motivoEmbarque({ tipo, dono = false, mestre = false, visivel = false, dentro = false,
  ocupantes = [], assentos = 0, distancia = Infinity } = {}) {
  if (!['personagem', 'capanga'].includes(tipo)) return 'Só personagens e capangas podem embarcar.';
  if (!mestre && !dono) return 'Esse token não é seu.';
  if (!mestre && !visivel) return 'Você não vê esse veículo.';
  if (dentro) return 'Desça do outro veículo antes.';
  if (ocupantes.length >= Math.max(0, Math.trunc(numero(assentos)))) return 'O veículo está cheio.';
  if (!mestre && (!Number.isFinite(distancia) || distancia > 2)) return 'Chegue mais perto do veículo.';
  return '';
}

// M17, mesa-api.js:691-693 e :1336-1342: o primeiro dirige; assumir só troca a ordem dos que já estão dentro.
export function ordemMotorista(ocupantes = [], id) {
  if (!ocupantes.includes(id)) return [...ocupantes];
  return [id, ...ocupantes.filter(outro => outro !== id)];
}

function medidas(token, grade) {
  const largura = tamanho(token.width), altura = tamanho(token.height);
  return { largura, altura, x: numero(token.x) + largura * grade / 2, y: numero(token.y) + altura * grade / 2 };
}

// M17, mesa-api.js:1315: alcance e visão partem do centro do veículo; mesa.js:1346-1358: metade e por cima.
// Os tamanhos e a ordenação são do token, sem escrever na textura que o C45 troca. No Foundry, x/y são o canto.
export function posicaoEmbarcada(veiculo, ocupante, grade, indice = 0) {
  const g = tamanho(grade), v = medidas(veiculo, g);
  const width = tamanho(ocupante.width) / 2, height = tamanho(ocupante.height) / 2;
  return { x: v.x - width * g / 2, y: v.y - height * g / 2, width, height,
    elevation: numero(veiculo.elevation), sort: numero(veiculo.sort) + Math.max(0, Math.trunc(numero(indice))) + 1 };
}

// M17, mesa-api.js:699-705: tente os quatro lados antes das diagonais. O chamador escolhe o primeiro livre,
// conferindo paredes, outros tokens e limites. A borda retangular usa as dimensões reais dos tokens do Foundry.
export function posicoesDeSaida(veiculo, ocupante, grade) {
  const g = tamanho(grade), v = medidas(veiculo, g);
  const largura = tamanho(ocupante.width), altura = tamanho(ocupante.height);
  const dx = (v.largura + largura) * g / 2, dy = (v.altura + altura) * g / 2;
  return [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [-1, -1], [1, -1]]
    .map(([x, y]) => ({ x: v.x + x * dx - largura * g / 2, y: v.y + y * dy - altura * g / 2 }));
}

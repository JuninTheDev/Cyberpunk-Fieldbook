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

// ---------------- O resto pelo ator (o C46, parte 4) ----------------
// O veículo que a pessoa dirige. A wiki, system-rules.js:538 (p. 189–192): ao ligar o veículo, "o MOVE do veículo passa a
// ser o dele e ele não usa mais Ações de Movimento"; M17, mesa-api.js:691-693: o primeiro da tripulação dirige. Dentro de
// um token de veículo (dentro: os ocupantes e o veículo, o que guarda o estado), o motorista dirige aquele veículo, também
// quando não é dele, e o passageiro não dirige nenhum; fora, o do C40 (proprio: o item em uso com "Dirigindo"), menos quando
// esse veículo tem token na cena da pessoa (proprioNaCena): aí ele se dirige de dentro. Devolve o veículo, ou null.
export function veiculoDaDirecao({ tokenId = null, dentro = null, proprio = null, proprioNaCena = false } = {}) {
  if (dentro) return tokenId && dentro.ocupantes?.[0] === tokenId ? dentro.veiculo ?? null : null;
  return proprio && !proprioNaCena ? proprio : null;
}

// Quem dispara a arma montada no veículo. O CORE 0.92.4 (os upgrades Onboard, RED p. 163–164;
// babele/en/cyberpunk-red-core.core_upgrades.json:166, :170 e :174): o lança-chamas e a metralhadora, "The driver may fire
// it using an Action"; a arma branca, "The driver may attack with it using an Action"; a wiki, system-criacao.js:267 (o
// lança-chamas): "O motorista dispara com a Ação". Dentro de um token de veículo (dentro),
// só o motorista, e só as armas daquele veículo (doVeiculo); fora, se o veículo da arma tem token na cena de quem atira
// (naCena), ninguém: ela se usa de dentro; sem o token, o C15 (dono: quem atira é o dono da arma; emUso: com o veículo dela
// em uso). Devolve o motivo da recusa, ou ''.
export function motivoDoAssento({ dentro = false, motorista = false, doVeiculo = false, naCena = false, dono = true, emUso = false } = {}) {
  if (dentro && !doVeiculo) return 'Esta arma montada é de outro veículo.';
  if (dentro) return motorista ? '' : 'Só o motorista dispara a arma montada do veículo.';
  if (naCena || !dono) return 'Entre no veículo como motorista para usar a arma montada.';
  return emUso ? '' : 'Selecione o veículo desta arma antes de atacar.';
}

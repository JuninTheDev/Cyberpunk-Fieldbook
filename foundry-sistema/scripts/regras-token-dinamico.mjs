// Os tokens dinâmicos, sem Foundry (o C45, parte 1; pedido do usuário, 2026-10-25, pela folha de exemplo dele): a imagem
// do token sai da pose (pelo estado do ator) e da direção (pelo giro do token, que o Foundry 14 faz sozinho no movimento,
// o `core.tokenAutoRotate`). A arte é em vista de cima 3/4, em 8 direções, e não gira (o `lockRotation`).
// - As poses com direção: Parado, Caminhando (só durante o movimento, a parte 2) e Mirando (armado).
// - As poses sem direção (a 0°, viradas para a câmera): Ferido leve, Ferido grave, Caído, Incapacitado e Morto.
// - A ordem (decisões do usuário): morto, Morto; mortalmente ferido, inconsciente ou em estase, Incapacitado; caído, a pose
//   Caído (sem ela, a Incapacitado); armado, Mirando na direção; parado e ferido (leve ou grave), a pose de ferido; senão,
//   Parado na direção. Andando, a direção manda sobre o ferimento.
// - Faltou a imagem: a mais geral (a direção mais perto da mesma pose; Mirando e Caminhando caem no Parado; o Ferido grave,
//   no leve; o Caído e o Morto, no Incapacitado; depois, no Parado); sem nenhuma, a imagem de antes (a base).

export const DIRECOES = [0, 45, 90, 135, 180, 225, 270, 315];
export const POSES_COM_DIRECAO = ['parado', 'caminhando', 'mirando'];
export const POSES_SEM_DIRECAO = ['ferido-leve', 'ferido-grave', 'caido', 'incapacitado', 'morto'];
export const NOMES_DAS_POSES = {
  parado: 'Parado', caminhando: 'Caminhando', mirando: 'Mirando',
  'ferido-leve': 'Ferido leve', 'ferido-grave': 'Ferido grave', caido: 'Caído', incapacitado: 'Incapacitado', morto: 'Morto'
};
export const EXTENSOES_DE_IMAGEM = ['png', 'webp', 'jpg', 'jpeg', 'gif', 'svg', 'avif', 'webm', 'mp4'];

// A chave de cada imagem no conjunto: "parado-45", "mirando-270", "morto".
export const chaveDaImagem = (pose, direcao = null) => (POSES_COM_DIRECAO.includes(pose) ? `${pose}-${direcao}` : pose);
export const CHAVES = [...POSES_COM_DIRECAO.flatMap(pose => DIRECOES.map(direcao => chaveDaImagem(pose, direcao))), ...POSES_SEM_DIRECAO];

const normalizar = graus => ((Number(graus) % 360) + 360) % 360;

// A direção da arte (uma das 8) pelo giro do token. O Foundry gira 0° virado para baixo (para a câmera), 90° para a esquerda
// e 270° para a direita; a calibração da folha diz onde fica o 0° dela (inicio) e se ela conta no mesmo sentido do Foundry
// ('horario') ou no contrário ('antihorario'). Fica a mais perto.
export function direcaoDaArte(rotacao, { inicio = 0, sentido = 'horario' } = {}) {
  const giro = sentido === 'antihorario' ? -normalizar(rotacao) : normalizar(rotacao);
  const angulo = normalizar(giro + Number(inicio || 0));
  return DIRECOES[Math.round(angulo / 45) % 8];
}

// A pose pelo estado do ator (ferimento: as chaves de regras.estadoDeFerimento; andando: durante o movimento).
export function poseDoToken({ ferimento = 'ileso', morto = false, inconsciente = false, estase = false, caido = false, armado = false, andando = false } = {}) {
  if (morto) return 'morto';
  if (ferimento === 'mortal' || inconsciente || estase) return 'incapacitado';
  if (caido) return 'caido';
  if (armado) return 'mirando';
  if (andando) return 'caminhando';
  if (ferimento === 'grave') return 'ferido-grave';
  if (ferimento === 'leve') return 'ferido-leve';
  return 'parado';
}

const distancia = (a, b) => { const d = Math.abs(normalizar(a) - normalizar(b)); return Math.min(d, 360 - d); };
const imagem = (imagens, chave) => (typeof imagens?.[chave] === 'string' ? imagens[chave].trim() : '');

// A imagem da pose com direção: a da direção; sem ela, a da direção mais perto (no empate, a do sentido horário).
function daDirecao(imagens, pose, direcao) {
  const ordem = [...DIRECOES].sort((a, b) => distancia(a, direcao) - distancia(b, direcao) || normalizar(a - direcao) - normalizar(b - direcao));
  for (const outra of ordem) {
    const src = imagem(imagens, chaveDaImagem(pose, outra));
    if (src) return { src, pose, direcao: outra };
  }
  return null;
}

const RECUO = { 'ferido-grave': 'ferido-leve', 'ferido-leve': 'parado', caido: 'incapacitado', morto: 'incapacitado', incapacitado: 'parado', mirando: 'parado', caminhando: 'parado' };

// A imagem do token: { src, pose, direcao } ou null (sem nenhuma imagem no conjunto: fica a base).
export function imagemDoToken(conjunto, estado, rotacao = 0) {
  const imagens = conjunto?.imagens ?? {};
  const direcao = direcaoDaArte(rotacao, conjunto?.angulos);
  for (let pose = poseDoToken(estado); pose; pose = RECUO[pose]) {
    if (POSES_COM_DIRECAO.includes(pose)) {
      const achou = daDirecao(imagens, pose, direcao);
      if (achou) return achou;
    } else {
      const src = imagem(imagens, pose);
      if (src) return { src, pose, direcao: null };
    }
  }
  return null;
}

// O nome padronizado: <qualquer coisa>_<pose>_<ângulo>.<ext> para as poses com direção ("ricky_parado_045.webp") e
// <qualquer coisa>_<pose>.<ext> para as outras ("ricky_ferido-leve.png", "ricky_morto.webp"). Aceita "_" ou "-" entre as
// partes, maiúsculas e o ângulo com ou sem zeros. Devolve a chave ou null.
export function chaveDoArquivo(caminho) {
  const nome = String(caminho ?? '').split(/[\\/]/).pop().toLowerCase();
  const extensao = nome.split('.').pop();
  if (!EXTENSOES_DE_IMAGEM.includes(extensao) || !nome.includes('.')) return null;
  const base = nome.slice(0, -(extensao.length + 1));
  const comDirecao = /(?:^|[_-])(parado|caminhando|mirando)[_-](\d{1,3})$/.exec(base);
  if (comDirecao) {
    const direcao = Number(comDirecao[2]);
    return DIRECOES.includes(direcao) ? chaveDaImagem(comDirecao[1], direcao) : null;
  }
  const semDirecao = /(?:^|[_-])(ferido[_-]leve|ferido[_-]grave|caido|incapacitado|morto)$/.exec(base);
  return semDirecao ? semDirecao[1].replace('_', '-') : null;
}

// O conjunto a partir dos arquivos de uma pasta: cada chave com o seu (o primeiro, em ordem alfabética, se houver dois).
export function imagensDaPasta(arquivos = []) {
  const imagens = Object.fromEntries(CHAVES.map(chave => [chave, '']));
  for (const arquivo of [...arquivos].sort()) {
    const chave = chaveDoArquivo(arquivo);
    if (chave && !imagens[chave]) imagens[chave] = arquivo;
  }
  return imagens;
}

// O conjunto guardado no ator, sempre completo (todas as chaves; as que faltam, vazias), com a calibração válida.
export function conjuntoValido(dados = {}) {
  const imagens = Object.fromEntries(CHAVES.map(chave => [chave, imagem(dados?.imagens, chave)]));
  const inicio = DIRECOES.includes(Number(dados?.angulos?.inicio)) ? Number(dados.angulos.inicio) : 0;
  const sentido = dados?.angulos?.sentido === 'antihorario' ? 'antihorario' : 'horario';
  return { ativo: Boolean(dados?.ativo), pasta: String(dados?.pasta ?? '').trim(), base: String(dados?.base ?? '').trim(), angulos: { inicio, sentido }, imagens };
}

// A transição da troca de imagem pelo estado (a parte 2): os filtros do Foundry 14 (o TextureTransitionFilter); "nenhuma"
// troca na hora. A troca pela direção é sempre na hora (o movimento já anima o token).
export const TRANSICOES = { glitch: 'Glitch', fade: 'Esmaecer', hologram: 'Holograma', nenhuma: 'Nenhuma (troca na hora)' };
export const animacaoDaTroca = escolha => (escolha === 'nenhuma' ? { duration: 0 } : { transition: Object.hasOwn(TRANSICOES, escolha) ? escolha : 'glitch' });
export const ANIMACAO_DA_DIRECAO = { duration: 0 };

// As imagens do conjunto, sem repetir (a pré-carga, para a troca não piscar).
export const imagensDoConjunto = conjunto => [...new Set(CHAVES.map(chave => imagem(conjunto?.imagens, chave)).filter(Boolean))];

// ---------------- O andar (o C52; pedido do usuário, 2026-11-01) ----------------
// O Foundry 14 anima o movimento a 6 casas por segundo (CONFIG.Token.movement.defaultSpeed): três casas passam em meio
// segundo, e o Caminhando, um quadro só por direção, mal aparece. O token com o conjunto ligado anda no ritmo da
// configuração "Token dinâmico: velocidade do andar" (casas por segundo), e os passos são contados pela distância andada,
// para os pés não escorregarem quando o ritmo muda: a cada meia casa, um passo.
export const VELOCIDADE_DO_ANDAR = { padrao: 3, minimo: 1, maximo: 12, passo: 0.5 };
export const velocidadeDoAndar = valor => {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero > 0 ? Math.min(VELOCIDADE_DO_ANDAR.maximo, Math.max(VELOCIDADE_DO_ANDAR.minimo, numero)) : VELOCIDADE_DO_ANDAR.padrao;
};
export const PASSOS_POR_CASA = 2;
// Os passos (a configuração "Token dinâmico: passos"): o Caminhando e o Parado da mesma direção alternados, um quadro por
// passo (o andar de dois quadros, com a folha que já existe); ou só o Caminhando, como antes do C52.
export const PASSOS = { alternar: 'Caminhando e Parado alternados (um passo cada)', caminhando: 'Só o Caminhando (como antes)' };
export const modoDosPassos = escolha => (escolha === 'caminhando' ? 'caminhando' : 'alternar');
// O passo em que o token está (0, 1, 2...), pelas casas andadas desde o começo do movimento.
export const passoDoAndar = casas => Math.max(0, Math.floor((Number(casas) || 0) * PASSOS_POR_CASA + 1e-9));

// A imagem do quadro do movimento: a do estado andando (o Caminhando; armado, o Mirando, que não alterna; caído ou
// incapacitado, a pose deles); com os passos alternados, nos passos ímpares, o Parado da direção do Caminhando desenhado
// (sem ele, o da direção mais perto). Sem o Caminhando (a pose já caiu no Parado), não há o que alternar.
export function imagemDoAndar(conjunto, estado, rotacao = 0, casas = 0, modo = 'alternar') {
  const andando = imagemDoToken(conjunto, { ...estado, andando: true }, rotacao);
  if (andando?.pose !== 'caminhando' || modoDosPassos(modo) !== 'alternar' || passoDoAndar(casas) % 2 === 0) return andando;
  return daDirecao(conjunto?.imagens ?? {}, 'parado', andando.direcao) ?? andando;
}

// O balanço: o corpo sobe no meio de cada passo e volta no fim dele (um arco por passo), até 4% da altura do token.
export const BALANCO_DO_PASSO = 0.04;
export function balancoDoPasso(casas, altura) {
  const fracao = ((Number(casas) || 0) * PASSOS_POR_CASA) % 1;
  return Math.max(0, Number(altura) || 0) * BALANCO_DO_PASSO * Math.sin(Math.PI * fracao);
}

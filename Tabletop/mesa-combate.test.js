// Testes do combate da mesa da wiki: as regras sozinhas (mesa-regras.js) e o caminho inteiro pela API (ataque, defesa às
// cegas, dano na ficha, lesão crítica, Death Save, desfazer, Sorte e munição), com os dados rolados de propósito.
const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const R = require('./mesa-regras');
const { sleep, montar } = require('./teste-ajuda');

global.window = global;
require(path.join(__dirname, '..', 'system-rules.js'));
const regras = window.systemRules.data;

test('regras: classe da arma, DV pelo alcance, armadura, briga e Death Save', () => {
  assert.equal(R.classeDaArma({ nome: 'Pistola muito pesada', pericia: 'Handgun' }), 'heavyPistol');
  assert.equal(R.classeDaArma({ nome: 'Espingarda (qualidade ruim)', pericia: 'Shoulder Arms' }), 'shotgun');
  assert.equal(R.classeDaArma({ nome: 'Katana', pericia: 'Melee Weapon', distancia: false }), 'medMelee');
  assert.equal(R.classeDaArma({ classe: 'smg', nome: 'qualquer' }), 'smg');
  assert.deepEqual(R.modosDaArma({ classe: 'assaultRifle' }), ['tiro', 'mirado', 'autofogo', 'supressivo']);
  assert.deepEqual(R.modosDaArma({ classe: 'lightMelee' }), ['corpo', 'arremesso'], 'a arma branca também se arremessa');
  assert.deepEqual(R.modosDaArma({ classe: 'briga' }), ['corpo']);
  assert.equal(R.dvPelaDistancia(regras, 'heavyPistol', 10), 15, 'pistola a 10 m: DV 15');
  assert.equal(R.dvPelaDistancia(regras, 'smg', 16, true), 20, 'autofogo de SMG a 16 m: DV 20');
  assert.equal(R.dvPelaDistancia(regras, 'heavyPistol', 300), null, 'pistola a 300 m: fora do alcance');
  assert.equal(R.dvPelaDistancia(regras, 'smg', 150, true), null, 'autofogo só até 100 m');
  assert.deepEqual(R.contaDoDano({ dados: [6, 6, 1], total: 13, sp: 7, local: 'cabeca' }), { total: 13, spEfetivo: 7, passou: 6, hp: 12, ablacao: 1, lesao: true });
  assert.equal(R.contaDoDano({ dados: [6], total: 6, sp: 7, metadeDoSp: true }).hp, 2, 'arma branca: metade do SP, arredondado para cima (4)');
  assert.deepEqual(R.contaDoDano({ dados: [2, 2], total: 4, sp: 11 }), { total: 4, spEfetivo: 11, passou: 0, hp: 0, ablacao: 0, lesao: false });
  assert.equal(R.contaDoDano({ dados: [6, 6], total: 24, sp: 0, autofogo: true }).lesao, true, 'autofogo: os dois dados 6');
  assert.equal(R.danoDeBriga(4), '1d6');
  assert.equal(R.danoDeBriga(6), '2d6');
  assert.equal(R.danoDeBriga(8), '3d6');
  assert.equal(R.danoDeBriga(11), '4d6');
  assert.equal(R.sobreviveu({ dado: 3, penalidade: 2, body: 6 }), true);
  assert.equal(R.sobreviveu({ dado: 4, penalidade: 2, body: 6 }), false, 'igual ao BODY não basta: tem de ser menor');
  assert.equal(R.sobreviveu({ dado: 10, penalidade: -20, body: 20 }), false, '10 natural sempre falha');
  assert.deepEqual(R.spDaFicha('Kevlar · SP 7 na cabeça e no corpo'), { cabeca: { atual: 7, max: 7 }, corpo: { atual: 7, max: 7 } });
  assert.equal(R.multiplicadorDeAutofogo(30, 20, 'smg'), 3, 'SMG: até ×3');
  assert.equal(R.multiplicadorDeAutofogo(30, 20, 'assaultRifle'), 4, 'rifle de assalto: até ×4');
  assert.equal(R.acertou({ modo: 'tiro', escolha: 'esquivar', ataque: 17, defesa: 17 }), false, 'empate: defensor vence');
  assert.equal(R.podeEsquivar({ modo: 'tiro', ref: 7 }), false, 'de tiro, REF 7 não esquiva');
  assert.equal(R.podeEsquivar({ modo: 'tiro', ref: 8 }), true, 'REF 8 esquiva');
  assert.equal(R.podeEsquivar({ modo: 'corpo', ref: 2 }), true, 'no corpo a corpo, qualquer um esquiva');
  assert.equal(R.podeEsquivar({ modo: 'corpo', ref: 9, semPerna: true }), false, 'sem a perna, ninguém esquiva');
  assert.equal(R.acertou({ modo: 'tiro', escolha: 'aguentar', ataque: 25, dv: null }), false, 'fora do alcance erra');
});

// Um Solo com a ficha da criação: pistola pesada carregada, SMG carregada, faca e Armorjack leve no corpo (SP 11).
const fichaSolo = {
  nome: 'Jax "Ferrugem" Moreno', role: 'solo',
  stats: { REF: 8, DEX: 7, MOVE: 6, BODY: 7, WILL: 6, LUCK: 5 },
  resultado: {
    stats: { REF: 8, DEX: 7, MOVE: 6, BODY: 7, WILL: 6, LUCK: 5 }, derivados: { hp: 45 },
    pericias: [['Handgun', 'REF', 6], ['Evasion', 'DEX', 6], ['Autofire', 'REF', 4], ['Melee Weapon', 'DEX', 4], ['Brawling', 'DEX', 4], ['Concentration', 'WILL', 3]].map(([nome, stat, nivel]) => ({ nome, stat, nivel })),
    itens: [
      { uid: 'u1', id: 'core_weapons:heavy-pistol', nome: 'Pistola pesada', qtd: 1, uso: 'equipado', municao: 'u9' },
      { uid: 'u2', id: 'core_weapons:smg', nome: 'SMG', qtd: 1, uso: 'carregando', municao: 'u10' },
      { uid: 'u3', id: 'core_weapons:light-melee', nome: 'Faca', qtd: 1, uso: 'carregando' },
      { uid: 'u4', id: 'core_armor:light-armorjack-body', nome: 'Armorjack leve (corpo)', qtd: 1, uso: 'equipado' },
      { uid: 'u9', id: 'core_ammo:heavy-pistol-basic', nome: 'Munição de pistola pesada', qtd: 30, uso: 'carregando' },
      { uid: 'u10', id: 'core_ammo:medium-pistol-basic', nome: 'Munição de pistola média', qtd: 50, uso: 'carregando' }
    ]
  }
};
const fichaApoio = { nome: 'Iris "Nyx" Tanaka', role: 'netrunner', stats: { REF: 6, INT: 8 }, resultado: { stats: { REF: 6, INT: 8 }, derivados: { hp: 40 }, pericias: [] } };

// Cena de 100 px = 2 m. O Jax no quadrado (1, 1); o Guarda-costas (REF 6, Evasão 7, Kevlar SP 7, 35 HP) a 8 quadrados = 16 m.
async function arena(t, opcoes) {
  const m = await montar(t, opcoes);
  const ana = await m.jogador('Ana', fichaSolo);
  const bruno = await m.jogador('Bruno', fichaApoio);
  const cena = (await m.op('cena.criar', { nome: 'Arena', largura: 3000, altura: 2000, grade: { tamanho: 100 } })).json.resultado.cena;
  const jax = (await m.op('token.criar', { cena, personagem: ana.personagem.id, x: 150, y: 150 })).json.resultado.token;
  const nyx = (await m.op('token.criar', { cena, personagem: bruno.personagem.id, x: 250, y: 150 })).json.resultado.token;
  const capanga = (await m.op('token.criar', { cena, npc: 'mooks:0', x: 950, y: 150 })).json.resultado.token;
  const ultima = async cookie => { const registro = (await m.pedir('/api/mesa/estado', { cookie })).json.registro; return registro[registro.length - 1]; };
  const token = async (id, cookie) => (await m.pedir('/api/mesa/estado', { cookie })).json.cena.tokens.find(item => item.id === id);
  return { m, ana, bruno, cena, jax, nyx, capanga, ultima, token };
}

test('tiro: o NPC com REF abaixo de 8 aguenta contra a DV; dano na armadura, ablação e uma bala a menos', async t => {
  const a = await arena(t);
  const ficha = await a.token(a.jax, a.ana.cookie);
  assert.deepEqual(ficha.sp.corpo, { atual: 11, max: 11 }, 'a armadura da criação vem do catálogo');
  assert.deepEqual(ficha.armas.find(arma => arma.id === 'u1').pente, { atual: 8, max: 8 }, 'a pistola vem carregada');
  // REF 8 + Armas de uma Mão 6 + 7 = 21 contra DV 20 (pistola a 16 m). Dano 3d6 = 12 contra SP 7: passam 5.
  a.m.fila.push(7, 5, 4, 3);
  const tiro = await a.m.op('ataque', { atacante: a.jax, arma: 'u1', modo: 'tiro', alvo: a.capanga }, a.ana.cookie);
  assert.equal(tiro.status, 200, tiro.text);
  assert.equal(tiro.json.resultado.concluido, true, 'sem escolha para o alvo, resolve na hora');
  const capanga = await a.token(a.capanga);
  assert.deepEqual(capanga.hp, { atual: 30, max: 35 });
  assert.deepEqual(capanga.sp.corpo, { atual: 6, max: 7 }, 'a armadura perde 1 SP');
  assert.equal((await a.token(a.jax, a.ana.cookie)).armas.find(arma => arma.id === 'u1').pente.atual, 7);
  const cartao = await a.ultima(a.bruno.cookie);
  assert.equal(cartao.tipo, 'ataque');
  assert.equal(cartao.pendente, false);
  assert.equal(cartao.ataque.rolagem.total, 21);
  assert.deepEqual([cartao.ataque.alvos[0].dv, cartao.ataque.alvos[0].acertou, cartao.ataque.alvos[0].dano.passou], [20, true, 5]);
  assert.equal(cartao.ataque.alvos[0].dano.hp, null, 'o HP do NPC não vai para os jogadores, nem pelo cartão');
  assert.equal(cartao.podeDesfazer, undefined, 'só o mestre desfaz');
  assert.equal((await a.ultima()).ataque.alvos[0].dano.hp.depois, 30, 'o mestre vê o HP');
  // A ficha do personagem guarda a bala gasta.
  const doc = (await a.m.pedir(`/api/personagens/${a.ana.personagem.id}`, { cookie: a.ana.cookie })).json.personagem;
  assert.equal(doc.jogo.armas.u1.pente, 7);
});

test('defesa às cegas: só quem controla o alvo é perguntado, e sem o total', async t => {
  const a = await arena(t);
  const visaoAna = await a.m.ouvir(a.ana.cookie);
  const visaoBruno = await a.m.ouvir(a.bruno.cookie);
  const mestre = await a.m.ouvir();
  // Guarda-costas: Armas de uma Mão 10 (base) + 6 = 16, com a pistola muito pesada.
  a.m.fila.push(6);
  const tiro = await a.m.op('ataque', { atacante: a.capanga, arma: 'npc:1', modo: 'tiro', alvo: a.jax });
  assert.equal(tiro.json.resultado.concluido, false);
  const pergunta = await visaoAna.esperar(item => item.evento === 'defesa');
  assert.ok(pergunta, 'a Ana é perguntada');
  assert.deepEqual(pergunta.data.opcoes, ['esquivar', 'aguentar'], 'REF 8: pode esquivar');
  assert.equal(pergunta.data.dv, 20);
  assert.equal(pergunta.data.total, undefined, 'o jogador decide sem ver o total');
  assert.equal(pergunta.data.esquivaMedia, 7 + 6 + 5.5);
  assert.equal((await mestre.esperar(item => item.evento === 'defesa')).data.total, 16, 'o mestre vê o total');
  await sleep(100);
  assert.equal(visaoBruno.eventos.filter(item => item.evento === 'defesa').length, 0, 'o Bruno não é perguntado');
  assert.equal((await a.ultima(a.ana.cookie)), undefined, 'o cartão pendente não aparece para o alvo');
  assert.equal((await a.m.op('ataque.defender', { ataque: tiro.json.resultado.ataque, alvo: a.jax, escolha: 'esquivar' }, a.bruno.cookie)).status, 403);
  // DEX 7 + Evasão 6 + 4 = 17 contra 16: esquivou.
  a.m.fila.push(4);
  assert.equal((await a.m.op('ataque.defender', { ataque: tiro.json.resultado.ataque, alvo: a.jax, escolha: 'esquivar' }, a.ana.cookie)).status, 200);
  assert.ok(await visaoAna.esperar(item => item.evento === 'defesa.fim'));
  const cartao = await a.ultima(a.bruno.cookie);
  assert.deepEqual([cartao.ataque.alvos[0].escolha, cartao.ataque.alvos[0].defesa.total, cartao.ataque.alvos[0].acertou], ['esquivar', 17, false]);
  assert.deepEqual((await a.token(a.jax, a.ana.cookie)).hp, { atual: 45, max: 45 });
});

test('sem resposta no prazo, o alvo aguenta', async t => {
  const a = await arena(t, { prazoDefesa: 300 });
  // 10 + 10 + 3 = 23 contra DV 20: pega. Dano 4d6 = 4 × 3 = 12 contra SP 11: passa 1.
  a.m.fila.push(10, 3, 3, 3, 3, 3);
  await a.m.op('ataque', { atacante: a.capanga, arma: 'npc:1', modo: 'tiro', alvo: a.jax });
  await sleep(700);
  const cartao = await a.ultima(a.bruno.cookie);
  assert.equal(cartao.pendente, false);
  assert.deepEqual([cartao.ataque.alvos[0].escolha, cartao.ataque.alvos[0].acertou], ['aguentar', true]);
  assert.deepEqual((await a.token(a.jax, a.ana.cookie)).hp, { atual: 44, max: 45 });
  assert.equal((await a.m.pedir(`/api/personagens/${a.ana.personagem.id}`, { cookie: a.ana.cookie })).json.personagem.jogo.hp.atual, 44, 'o dano foi para a ficha');
});

test('tiro mirado na cabeça: −8, o dano que passa ×2 e lesão crítica com dois 6', async t => {
  const a = await arena(t);
  // 14 − 8 + 10 + 9 = 25 contra 20. Dano [6, 6, 1] = 13 contra SP 7 na cabeça: passam 6 × 2 = 12; lesão (2d6 = 7) +5.
  a.m.fila.push(10, 9, 6, 6, 1, 3, 4);
  const tiro = await a.m.op('ataque', { atacante: a.jax, arma: 'u1', modo: 'mirado', local: 'cabeca', alvo: a.capanga }, a.ana.cookie);
  assert.equal(tiro.status, 200, tiro.text);
  const capanga = await a.token(a.capanga);
  assert.deepEqual(capanga.hp, { atual: 35 - 12 - 5, max: 35 });
  assert.deepEqual(capanga.sp.cabeca, { atual: 6, max: 7 });
  assert.equal(capanga.lesoes.length, 1);
  assert.equal(capanga.lesoes[0], regras.critHead.find(linha => linha[0] === 7)[1], 'a lesão vem da tabela da cabeça');
  const cartao = await a.ultima();
  assert.ok(cartao.ataque.rolagem.partes.some(parte => parte.rotulo === 'Mirado' && parte.valor === -8));
});

test('autofogo: 10 balas, dano 2d6 × quanto passou (até ×3), e recarregar', async t => {
  const a = await arena(t);
  // REF 8 + Disparo Automático 4 + 10 + 8 = 30 contra DV 20 do autofogo de SMG a 16 m: passou 10, ×3 no máximo.
  a.m.fila.push(10, 8, 3, 4);
  await a.m.op('ataque', { atacante: a.jax, arma: 'u2', modo: 'autofogo', alvo: a.capanga }, a.ana.cookie);
  const cartao = await a.ultima();
  assert.equal(cartao.ataque.alvos[0].multiplicador, 3);
  assert.deepEqual((await a.token(a.capanga)).hp, { atual: 35 - (7 * 3 - 7), max: 35 });
  assert.equal((await a.token(a.jax, a.ana.cookie)).armas.find(arma => arma.id === 'u2').pente.atual, 20);
  await a.m.op('ataque', { atacante: a.jax, arma: 'u2', modo: 'autofogo', alvo: a.capanga }, a.ana.cookie);
  await a.m.op('ataque', { atacante: a.jax, arma: 'u2', modo: 'autofogo', alvo: a.capanga }, a.ana.cookie);
  const sem = await a.m.op('ataque', { atacante: a.jax, arma: 'u2', modo: 'autofogo', alvo: a.capanga }, a.ana.cookie);
  assert.equal(sem.status, 400, 'sem 10 balas no pente, não dá');
  assert.equal((await a.m.op('ataque', { atacante: a.jax, arma: 'u1', modo: 'autofogo', alvo: a.capanga }, a.ana.cookie)).status, 200, 'a pistola não faz autofogo: vira tiro');
  // A caixa tinha 50: 30 foram para o pente na montagem, e a recarga põe as 20 que sobraram.
  const recarga = await a.m.op('arma.recarregar', { token: a.jax, arma: 'u2' }, a.ana.cookie);
  assert.equal(recarga.status, 200, recarga.text);
  assert.deepEqual(recarga.json.resultado, { arma: 'SMG', municao: 'Munição de pistola média', entrou: 20, sobra: 0 });
  assert.equal((await a.token(a.jax, a.ana.cookie)).armas.find(arma => arma.id === 'u2').pente.atual, 20);
  const vazia = await a.m.op('arma.recarregar', { token: a.jax, arma: 'u2' }, a.ana.cookie);
  assert.equal(vazia.status, 400);
  assert.match(vazia.json.erro, /Sem munição para SMG/);
  assert.equal((await a.m.op('arma.recarregar', { token: a.nyx, arma: 'u2' }, a.ana.cookie)).status, 403, 'só o dono recarrega');
});

test('corpo a corpo: alcance de 2 m, o alvo sempre esquiva e a faca ignora metade do SP', async t => {
  const a = await arena(t);
  assert.equal((await a.m.op('ataque', { atacante: a.jax, arma: 'u3', alvo: a.capanga }, a.ana.cookie)).status, 400, 'a 16 m não dá');
  await a.m.op('token.mover', { token: a.capanga, x: 150, y: 250 });
  // DEX 7 + Armas Brancas 4 + 5 = 16; o Guarda-costas esquiva: Evasão 7 + 2 = 9. Dano 1d6 = 6 contra metade de 7 (4): passam 2.
  a.m.fila.push(5, 2, 6);
  const golpe = await a.m.op('ataque', { atacante: a.jax, arma: 'u3', alvo: a.capanga }, a.ana.cookie);
  assert.equal(golpe.status, 200, golpe.text);
  const cartao = await a.ultima();
  assert.deepEqual([cartao.ataque.modo, cartao.ataque.alvos[0].escolha, cartao.ataque.alvos[0].defesa.total], ['corpo', 'esquivar', 9]);
  assert.deepEqual((await a.token(a.capanga)).hp, { atual: 33, max: 35 });
  // Briga: BODY 7 → 3d6, sem desconto na armadura.
  a.m.fila.push(9, 1, 6, 6, 6);
  await a.m.op('ataque', { atacante: a.jax, arma: 'briga', alvo: a.capanga }, a.ana.cookie);
  const briga = await a.ultima();
  assert.equal(briga.ataque.alvos[0].dano.spEfetivo, 6, 'briga não ignora armadura');
});

test('Mortalmente Ferido: lesão a cada acerto, Death Save no começo da vez, a morte e a vez pulada', async t => {
  const a = await arena(t);
  await a.m.op('token.editar', { token: a.capanga, hp: { atual: 0, max: 35 } });
  // Iniciativa: Jax 8 + 2 = 10, Guarda-costas 6 + 9 = 15: o Guarda-costas começa, Mortalmente Ferido.
  a.m.fila.push(2, 9);
  await a.m.op('combate.iniciar', { tokens: [a.jax, a.capanga] });
  assert.equal((await a.m.pedir('/api/mesa/estado')).json.combate.deathSave, a.capanga);
  assert.equal((await a.m.op('deathsave', { token: a.capanga }, a.ana.cookie)).status, 403);
  // 3 + 0 < BODY 6: vive, e o próximo Death Save tem +1.
  a.m.fila.push(3);
  await a.m.op('deathsave', { token: a.capanga });
  let capanga = await a.token(a.capanga);
  assert.deepEqual([capanga.morto, capanga.deathSave], [undefined, 1]);
  assert.equal((await a.m.pedir('/api/mesa/estado')).json.combate.deathSave, null);
  // Um tiro que pega num Mortalmente Ferido traz mais uma lesão crítica (+5).
  a.m.fila.push(9, 1, 1, 1, 3, 4);
  await a.m.op('ataque', { atacante: a.jax, arma: 'u1', alvo: a.capanga }, a.ana.cookie);
  capanga = await a.token(a.capanga);
  assert.equal(capanga.lesoes.length, 1);
  assert.equal(capanga.hp.atual, -5);
  // 10 natural: falha. Morto, e todos veem.
  a.m.fila.push(10);
  await a.m.op('deathsave', { token: a.capanga });
  assert.equal((await a.token(a.capanga, a.ana.cookie)).morto, true);
  await a.m.op('combate.proximo');
  await a.m.op('combate.proximo');
  const combate = (await a.m.pedir('/api/mesa/estado')).json.combate;
  assert.deepEqual([combate.vez, combate.rodada], [a.jax, 2], 'quem morreu perde a vez');
  assert.equal((await a.m.op('ataque', { atacante: a.capanga, arma: 'npc:1', alvo: a.jax })).status, 400, 'morto não ataca');
});

test('desfazer volta o HP, o SP, as lesões e a bala', async t => {
  const a = await arena(t);
  a.m.fila.push(7, 6, 6, 3);
  await a.m.op('ataque', { atacante: a.jax, arma: 'u1', alvo: a.capanga }, a.ana.cookie);
  const cartao = await a.ultima();
  assert.equal(cartao.podeDesfazer, true);
  assert.notDeepEqual((await a.token(a.capanga)).hp, { atual: 35, max: 35 });
  assert.equal((await a.m.op('ataque.desfazer', { entrada: cartao.id }, a.ana.cookie)).status, 403);
  assert.equal((await a.m.op('ataque.desfazer', { entrada: cartao.id })).status, 200);
  const capanga = await a.token(a.capanga);
  assert.deepEqual([capanga.hp, capanga.sp.corpo, capanga.lesoes], [{ atual: 35, max: 35 }, { atual: 7, max: 7 }, []]);
  assert.equal((await a.token(a.jax, a.ana.cookie)).armas.find(arma => arma.id === 'u1').pente.atual, 8);
  assert.equal((await a.m.op('ataque.desfazer', { entrada: cartao.id })).status, 409);
  assert.equal((await a.ultima()).desfeito, true);
});

test('Sorte soma no ataque e sai da ficha; fogo supressivo deixa Suprimido quem perde', async t => {
  const a = await arena(t);
  assert.equal((await a.m.op('ataque', { atacante: a.jax, arma: 'u1', alvo: a.capanga, sorte: 9 }, a.ana.cookie)).status, 400, 'não gasta mais Sorte do que tem');
  // 1 natural (falha crítica, −1): 14 + 2 de Sorte + 1 − 1 = 16 contra 20, errou (sem dados de dano).
  a.m.fila.push(1, 1);
  await a.m.op('ataque', { atacante: a.jax, arma: 'u1', alvo: a.capanga, sorte: 2 }, a.ana.cookie);
  const cartao = await a.ultima();
  assert.ok(cartao.ataque.rolagem.partes.some(parte => parte.rotulo === 'Sorte' && parte.valor === 2));
  assert.deepEqual((await a.token(a.jax, a.ana.cookie)).sorte, { atual: 3, max: 5 });
  assert.equal((await a.m.pedir(`/api/personagens/${a.ana.personagem.id}`, { cookie: a.ana.cookie })).json.personagem.jogo.sorte, 3);
  // Supressivo (REF 8 + Disparo Automático 4 + 5 = 17): a Nyx (WILL 0, 9) perde; o Guarda-costas (Concentração 6, 10 + 3) resiste.
  a.m.fila.push(5, 9, 10, 3);
  const supressivo = await a.m.op('ataque', { atacante: a.jax, arma: 'u2', modo: 'supressivo' }, a.ana.cookie);
  assert.equal(supressivo.status, 200, supressivo.text);
  assert.equal((await a.token(a.nyx, a.bruno.cookie)).suprimido, true);
  assert.equal((await a.token(a.capanga, a.ana.cookie)).suprimido, undefined);
  assert.equal((await a.token(a.jax, a.ana.cookie)).armas.find(arma => arma.id === 'u2').pente.atual, 20, 'fogo supressivo gasta 10 balas');
});

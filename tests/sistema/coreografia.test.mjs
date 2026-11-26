// A regra pura da coreografia dos efeitos na mesa e o catálogo (o C78; os 17 testes da seção 6.1 do anexo
// foundry-sistema/efeitos-plano/equipe/fx-coreografia.md e o teste do catálogo). Sem o Foundry: do evento ao roteiro.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { CATALOGO, PROPRIO, candidatosDoEfeito, conferirCatalogo } from '../../foundry-sistema/scripts/catalogo-efeitos.mjs';
import {
  MAPA_DO_ANTIGO, NIVEIS, PASSOS, PERFIL_DO_TIPO, PERFIS, TETO, chavesDoRoteiro, chavesDosPerfis, comprimir, direcaoDoToken, eventoDoAtaque,
  filtrarPeloNivel, montarPassos, nivelEfetivo, perfilDaArma, perfisDoMestre, roteiro, srcPermitido, validarEvento
} from '../../foundry-sistema/scripts/regras-coreografia.mjs';
import { textoNoToken } from '../../foundry-sistema/scripts/regras.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const sistema = path.join(raiz, 'foundry-sistema');
const leia = arquivo => fs.readFileSync(path.join(sistema, arquivo), 'utf8');

// A cena dos testes: casas de 100 px e 2 m. O Atirador no canto; o alvo a 25 casas (50 m: o voo de 200 ms).
const CASA = 100;
const ATIRADOR = { token: 'Atirador00000001', x: 150, y: 150, tamanho: 1, rotacao: 0 };
const ALVO = 'Alvo000000000001';
const alvoEm = (token, x, y, extra = {}) => ({
  token, x, y, tamanho: 1, escondido: false, resultado: 'acertou', escolha: 'aguentar', segunda: false, multiplicador: null, dano: null,
  estados: { mortal: false, derrubado: false, fogo: false, suprimido: false }, municao: null, ...extra
});
const dano = (perdeu, extra = {}) => ({ perdeu, passou: perdeu > 0, critico: false, lesoes: 0, escudo: false, estase: false, ablado: 0, veicular: false, ...extra });
const arma = (perfil = 'fuzil', extra = {}) => ({ perfil, tipo: 'assaultRifle', classe2077: null, municao: { tipo: 'rifle', efeito: 'basic' }, montada: false, cyber: false, doisCanos: false, ...extra });
const evento = (campos = {}) => ({
  v: 1, id: 'ataque0000000001', tipo: 'ataque', fase: 'desfecho', cena: 'cena000000000001', origem: ATIRADOR, arma: arma(), modo: 'tiro',
  local: null, arremesso: false, balas: null, area: null, queda: null, alvos: [], texto: [], ...campos
});
const textoDe = (token, texto, estilo = 'acerto') => ({ token, texto, estilo });
const nomes = passos => passos.map(p => p.passo);
const de = (passos, nome) => passos.filter(p => p.passo === nome);
const fim = passos => passos.reduce((maior, p) => Math.max(maior, p.t + (p.persistente ? 0 : p.duracao)), 0);
const naoDesce = passos => passos.every((p, i) => i === 0 || p.t >= passos[i - 1].t);
const distancia = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
const anguloAte = (a, b) => (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;

test('C78, 1: toda arma do catálogo tem perfil; a granada na arma de arremesso, o Molotov, o lança-chamas e as cyberarmas têm o deles', () => {
  const catalogo = JSON.parse(fs.readFileSync(path.join(sistema, 'dados', 'catalogo.json'), 'utf8'));
  const armas = Object.values(catalogo.itens).filter(item => item.type === 'arma');
  assert.ok(armas.length >= 198, `as armas do catálogo: ${armas.length}`);
  // A lista inteira, não uma amostra (a lição do ciclo 208).
  const sem = armas.filter(item => !perfilDaArma({
    tipo: item.system.tipo, catalogo: item.flags?.['cpr-fieldbook']?.catalogo, classe2077: item.flags?.['cpr-fieldbook']?.arma2077?.classe ?? null,
    municao: item.system.municoes?.length ? { tipo: item.system.municoes[0] } : null
  })).map(item => `${item.name} (${item.system.tipo})`);
  assert.deepEqual(sem, []);
  for (const tipo of new Set(armas.map(item => item.system.tipo))) assert.ok(Object.hasOwn(PERFIL_DO_TIPO, tipo), `o tipo ${tipo} sem o padrão da classe`);
  for (const chave of Object.values(PERFIL_DO_TIPO)) assert.ok(Object.hasOwn(PERFIS, chave), `o perfil ${chave}`);
  const doCatalogo = nome => armas.find(item => item.name === nome);
  const perfilDe = (item, extra = {}) => perfilDaArma({ tipo: item.system.tipo, catalogo: item.flags['cpr-fieldbook'].catalogo, municao: item.system.municoes?.length ? { tipo: item.system.municoes[0] } : null, ...extra })?.chave;
  assert.equal(perfilDe(doCatalogo('Thrown Weapon')), 'granada');
  assert.equal(perfilDe(doCatalogo('Molotov Cocktail')), 'molotov');
  assert.equal(perfilDe(doCatalogo('Flamethrower')), 'lanca-chamas');
  assert.equal(perfilDe(doCatalogo('Ranger Combat Boomerang')), 'arremesso');
  assert.equal(perfilDe(doCatalogo('Assault Rifle')), 'fuzil');
  // A arma de cyberware pelo cyberware de origem: o Monowire é o chicote; o Mantis, a lâmina com brilho; as Wolvers, a
  // garra; a Gorilla, o soco pesado.
  assert.equal(perfilDaArma({ tipo: 'medMelee', origem: 'cyberware-2077:monowire' }).chave, 'chicote');
  assert.equal(perfilDaArma({ tipo: 'medMelee', origem: 'cyberware-2077:mantis-blade' }).brilho, true);
  assert.equal(perfilDaArma({ tipo: 'medMelee', origem: 'core_cyberware:wolvers' }).chave, 'garra');
  assert.equal(perfilDaArma({ tipo: 'unarmed', origem: 'cyberware-2077:gorilla-arm' }).tremor, true);
  // A Power de 2077: o clarão maior; a Tech: o azul que atravessa; a Smart: a curva.
  assert.equal(perfilDaArma({ tipo: 'heavyPistol', classe2077: 'power' }).clarao, 'grande');
  assert.deepEqual([perfilDaArma({ tipo: 'assaultRifle', classe2077: 'tech' }).cor, perfilDaArma({ tipo: 'assaultRifle', classe2077: 'tech' }).atravessa], ['azul', true]);
  assert.equal(perfilDaArma({ tipo: 'smg', classe2077: 'smart' }).curva, true);
  assert.equal(perfilDaArma({ tipo: 'nenhum' }), null);
});

test('C78, 2: o tiro que acertou: o clarão, o som, o traçante, o impacto e o sangue na chegada, e o texto depois', () => {
  const r = roteiro(evento({ alvos: [alvoEm(ALVO, 2650, 150, { dano: dano(12) })], texto: [textoDe(ALVO, '−12 HP')] }), { casa: CASA });
  assert.deepEqual(nomes(r), ['clarao', 'som', 'tracante', 'impacto', 'sangue', 'texto']);
  const [tracante] = de(r, 'tracante'), [impacto] = de(r, 'impacto'), [texto] = de(r, 'texto');
  assert.equal(tracante.t, 40);
  assert.equal(tracante.duracao, 200, 'o voo: 4 ms por metro (50 m)');
  assert.equal(impacto.t, tracante.t + tracante.duracao, 'o impacto na chegada do traçante');
  assert.equal(de(r, 'sangue')[0].t, impacto.t);
  assert.equal(texto.t, impacto.t + 60);
  assert.deepEqual(tracante.para, { x: 2650, y: 150 });
  assert.deepEqual(tracante.de, { x: 150, y: 150 });
  assert.equal(impacto.token, ALVO);
  assert.equal(texto.texto, '−12 HP');
  assert.ok(naoDesce(r), 'o t nunca desce');
  // O voo tem piso e teto: 80 ms de perto, 400 de longe.
  assert.equal(de(roteiro(evento({ alvos: [alvoEm(ALVO, 250, 150, { dano: dano(3) })] }), { casa: CASA }), 'tracante')[0].duracao, 80);
  assert.equal(de(roteiro(evento({ alvos: [alvoEm(ALVO, 9000, 150, { dano: dano(3) })] }), { casa: CASA }), 'tracante')[0].duracao, 400);
});

test('C78, 3: o errou e o esquivou: nenhum impacto no alvo, o traçante passa dele, a esquiva antes da chegada e o texto de hoje', () => {
  for (const resultado of ['errou', 'esquivou']) {
    const linha = { resultado, dano: null };
    const e = eventoDoAtaque({ id: 'ataque0000000001', modo: 'tiro', linhas: [linha] }, { cena: 'cena000000000001', origem: ATIRADOR, alvos: [{ token: ALVO, x: 2650, y: 150 }], arma: { tipo: 'assaultRifle' } });
    const r = roteiro(e, { casa: CASA });
    assert.equal(r.filter(p => ['impacto', 'sangue'].includes(p.passo) && p.token === ALVO).length, 0, resultado);
    const [tracante] = de(r, 'tracante');
    assert.ok(distancia(tracante.para, { x: 2650, y: 150 }) > CASA / 2, `${resultado}: o fim fora do centro do alvo`);
    assert.equal(tracante.acerta, false);
    const chegada = tracante.t + tracante.duracao;
    assert.equal(de(r, 'faisca')[0].t, chegada, 'a faísca no chão');
    assert.equal(de(r, 'texto')[0].texto, textoNoToken(linha).texto);
    if (resultado === 'esquivou') {
      const [esquiva] = de(r, 'esquiva');
      assert.equal(esquiva.token, ALVO);
      assert.ok(esquiva.t < chegada && esquiva.t + esquiva.duracao > chegada, 'a esquiva começa antes da chegada');
    } else assert.equal(de(r, 'esquiva').length, 0);
  }
  // O "fora do alcance" e o "sem DV": nenhum traçante, só o disparo e o texto.
  const fora = roteiro(evento({ alvos: [alvoEm(ALVO, 2650, 150, { resultado: 'fora' })], texto: [textoDe(ALVO, 'Fora do alcance', 'erro')] }), { casa: CASA });
  assert.deepEqual(nomes(fora), ['clarao', 'som', 'texto']);
});

test('C78, 4: a armadura, o escudo e a estase seguraram: a faísca no lugar do sangue', () => {
  const chaves = extra => {
    const r = roteiro(evento({ alvos: [alvoEm(ALVO, 2650, 150, { dano: dano(0, extra) })] }), { casa: CASA });
    assert.equal(de(r, 'sangue').length, 0);
    return de(r, 'faisca').map(p => p.chave);
  };
  assert.deepEqual(chaves({}), ['faisca.armadura']);
  assert.deepEqual(chaves({ escudo: true }), ['faisca.escudo']);
  assert.deepEqual(chaves({ estase: true }), ['faisca.escudo']);
  // E o texto é o de hoje, do estilo defesa.
  assert.deepEqual(textoNoToken({ resultado: 'acertou', dano: { hpAntes: 20, hpDepois: 20 } }), { texto: 'A armadura segurou', estilo: 'defesa' });
  // A borracha passou da armadura: o impacto, sem sangue nem faísca; o veículo: a faísca na estrutura.
  const borracha = roteiro(evento({ arma: arma('fuzil', { municao: { tipo: 'rifle', efeito: 'rubber' } }), alvos: [alvoEm(ALVO, 2650, 150, { dano: dano(5) })] }), { casa: CASA });
  assert.deepEqual(nomes(borracha).filter(n => ['impacto', 'sangue', 'faisca'].includes(n)), ['impacto']);
  const veiculo = roteiro(evento({ alvos: [alvoEm(ALVO, 2650, 150, { dano: dano(5, { veicular: true }) })] }), { casa: CASA });
  assert.deepEqual([de(veiculo, 'impacto')[0].chave, de(veiculo, 'sangue').length, de(veiculo, 'faisca')[0].chave], ['impacto.estrutura', 0, 'faisca.armadura']);
});

test('C78, 5: o autofogo de 10 balas: 6 traçantes a cada 70 ms, os que acertam pelo multiplicador e o texto depois do último impacto', () => {
  const rajada = multiplicador => roteiro(evento({ modo: 'autofogo', balas: 10, alvos: [alvoEm(ALVO, 2650, 150, { multiplicador, dano: dano(15) })], texto: [textoDe(ALVO, '−15 HP')] }), { casa: CASA });
  const r = rajada(3);
  const tracantes = de(r, 'tracante');
  assert.equal(tracantes.length, 6);
  assert.deepEqual(tracantes.map(p => p.t), [40, 110, 180, 250, 320, 390]);
  assert.equal(tracantes.filter(p => p.acerta).length, 3);
  assert.equal(de(r, 'impacto').length, 3);
  const ultimo = Math.max(...de(r, 'impacto').map(p => p.t));
  assert.ok(de(r, 'texto')[0].t > ultimo, 'o texto depois do último impacto');
  assert.equal(de(r, 'som')[0].chave, 'rajada.fuzil', 'o som da rajada do fuzil');
  // O multiplicador acima de 6: os 6 acertam; o errou: nenhum.
  assert.equal(de(rajada(9), 'impacto').length, 6);
  const errou = roteiro(evento({ modo: 'autofogo', balas: 10, alvos: [alvoEm(ALVO, 2650, 150, { resultado: 'errou' })] }), { casa: CASA });
  assert.deepEqual([de(errou, 'tracante').length, de(errou, 'impacto').length], [6, 0]);
  // O leque de ±4° em volta da linha do alvo (os que erram).
  const angulos = de(errou, 'tracante').map(p => anguloAte(ATIRADOR, p.para));
  assert.ok(Math.max(...angulos.map(Math.abs)) <= 7.01, `o leque: ${angulos}`);
});

test('C78, 6: o supressivo de 3 afetados: os textos a cada 120 ms pela distância, sem sangue; sem alvo, a faixa de 60°', () => {
  const longe = alvoEm('Longe00000000001', 2150, 150, { resultado: 'firme' });
  const perto = alvoEm('Perto00000000001', 550, 150, { resultado: 'suprimido' });
  const meio = alvoEm('Meio000000000001', 150, 1350, { resultado: 'suprimido' });
  const r = roteiro(evento({ modo: 'supressivo', alvos: [longe, perto, meio], texto: [textoDe(longe.token, 'Firme', 'erro'), textoDe(perto.token, 'Suprimido!'), textoDe(meio.token, 'Suprimido!')] }), { casa: CASA });
  const textos = de(r, 'texto');
  assert.deepEqual(textos.map(p => [p.token, p.t]), [[perto.token, 300], [meio.token, 420], [longe.token, 540]]);
  assert.equal(r.filter(p => ['sangue', 'impacto'].includes(p.passo)).length, 0);
  assert.equal(de(r, 'tracante').length, 8);
  // Os ângulos dos traçantes em volta de uma direção (de −180° a +180° dela).
  const emVolta = (passos, direcao) => de(passos, 'tracante').map(p => ((((anguloAte(ATIRADOR, p.para) - direcao) % 360) + 540) % 360) - 180);
  for (const rotacao of [0, 90, 200]) {
    const sem = roteiro(evento({ modo: 'supressivo', origem: { ...ATIRADOR, rotacao } }), { casa: CASA });
    const angulos = emVolta(sem, direcaoDoToken(rotacao));
    assert.ok(Math.max(...angulos) - Math.min(...angulos) <= 60.5 && Math.max(...angulos) - Math.min(...angulos) >= 59.5, `a faixa (${rotacao}°): ${angulos}`);
    assert.ok(Math.abs((Math.max(...angulos) + Math.min(...angulos)) / 2) < 1, `a faixa na direção do token (${rotacao}°)`);
  }
  // Os alvos dos dois lados do 180° (um a 170°, outro a −170°): a varredura de 20°, não a volta inteira.
  const atras = [alvoEm('Cima000000000001', ATIRADOR.x - 1000, ATIRADOR.y - 176), alvoEm('Baixo00000000001', ATIRADOR.x - 1000, ATIRADOR.y + 176)].map(a => ({ ...a, resultado: 'suprimido' }));
  const varredura = emVolta(roteiro(evento({ modo: 'supressivo', alvos: atras }), { casa: CASA }), 180);
  assert.ok(Math.max(...varredura) - Math.min(...varredura) <= 21, `a varredura: ${varredura}`);
});

test('C78, 7: o cartucho: 5 traçantes que chegam juntos e os impactos simultâneos; quem ficou fora, sem impacto', () => {
  const pego = alvoEm(ALVO, 450, 150, { dano: dano(8) });
  const outro = alvoEm('Outro00000000001', 450, 250, { dano: dano(8) });
  const fora = alvoEm('Fora000000000001', 1850, 150, { resultado: 'fora' });
  const r = roteiro(evento({ modo: 'cartucho', arma: arma('espingarda', { tipo: 'shotgun', municao: { tipo: 'shotgunShell', efeito: 'basic' } }), alvos: [pego, outro, fora] }), { casa: CASA });
  const tracantes = de(r, 'tracante');
  assert.equal(tracantes.length, 5);
  const chegadas = tracantes.map(p => p.t + p.duracao);
  assert.ok(Math.max(...chegadas) - Math.min(...chegadas) <= 60, `±30 ms: ${chegadas}`);
  const impactos = de(r, 'impacto');
  assert.deepEqual(impactos.map(p => p.token).sort(), [ALVO, outro.token].sort());
  assert.equal(new Set(impactos.map(p => p.t)).size, 1, 'os impactos juntos');
  assert.equal(r.filter(p => p.token === fora.token && p.passo !== 'texto').length, 0);
  assert.equal(de(r, 'clarao')[0].intensidade, 'forte');
});

test('C78, 8: o explosivo que explodiu (os impactos pela distância do centro, o tremor depois) e o que errou (sem explosão, até o mestre marcar a queda)', () => {
  const centro = { x: 1650, y: 650, lado: 10 };
  const alvos = [alvoEm('Dois000000000001', 1850, 650, { dano: dano(10) }), alvoEm('Zero000000000001', 1650, 650, { dano: dano(10) }), alvoEm('Um00000000000001', 1750, 650, { dano: dano(10) })];
  const lancador = arma('lanca-granadas', { tipo: 'grenadeLauncher', municao: { tipo: 'grenade', efeito: 'armorPiercing' } });
  const r = roteiro(evento({ modo: 'explosivo', arma: lancador, area: centro, alvos }), { casa: CASA });
  const [explosao] = de(r, 'explosao');
  assert.equal(explosao.chave, 'explosao.frag');
  assert.deepEqual(explosao.para, { x: 1650, y: 650 });
  const [projetil] = de(r, 'projetil');
  assert.equal(explosao.t, projetil.t + projetil.duracao, 'a explosão na chegada do projetil');
  assert.ok(de(r, 'tremor')[0].t > explosao.t, 'o tremor depois da explosão');
  assert.equal(de(r, 'onda')[0].raio, 250, 'a onda até a borda da área (5 m)');
  const impactos = de(r, 'impacto');
  assert.deepEqual(impactos.map(p => p.token), ['Zero000000000001', 'Um00000000000001', 'Dois000000000001']);
  assert.deepEqual(impactos.map(p => p.t - explosao.t), [0, 40, 80], '+20 ms por metro');
  // O arremesso: o arco em vez do projetil reto.
  const granada = roteiro(evento({ modo: 'explosivo', arremesso: true, arma: arma('granada', { tipo: 'thrownWeapon', municao: { tipo: 'grenade', efeito: 'basic' } }), area: centro, alvos }), { casa: CASA });
  assert.deepEqual([de(granada, 'arco').length, de(granada, 'projetil').length], [1, 0]);
  assert.ok(de(granada, 'arco')[0].duracao >= 600 && de(granada, 'arco')[0].duracao <= 900);
  // Errou: o evento sem a área e sem a queda; nenhuma explosão.
  const e = eventoDoAtaque({ id: 'ataque0000000001', modo: 'explosivo', linhas: [{ resultado: 'errou' }] }, { cena: 'cena000000000001', origem: ATIRADOR, alvos: [{ token: ALVO, x: 1650, y: 650 }], arma: { tipo: 'grenadeLauncher', municao: { tipo: 'grenade', efeito: 'basic' } } });
  assert.deepEqual([e.area, e.queda], [null, null]);
  const errou = roteiro(e, { casa: CASA });
  assert.deepEqual(['explosao', 'onda', 'tremor', 'impacto'].map(n => de(errou, n).length), [0, 0, 0, 0]);
  assert.equal(de(errou, 'projetil').length, 1, 'o projetil até o alvo');
  // O mestre marcou onde caiu: a explosão ali.
  const caiu = roteiro({ ...e, queda: { x: 1250, y: 650 } }, { casa: CASA });
  assert.deepEqual(de(caiu, 'explosao')[0]?.para, { x: 1250, y: 650 });
});

test('C78, 9: as granadas sem dano: a fumaça fica até o fim do minuto; o flashbang na tela só de quem falhou; o EMP, as faíscas; o fogo e a teia ficam', () => {
  const centro = { x: 1650, y: 650, lado: 10 };
  const granada = efeito => arma('lanca-granadas', { tipo: 'grenadeLauncher', municao: { tipo: 'grenade', efeito } });
  const fumaca = roteiro(evento({ modo: 'explosivo', arma: granada('smoke'), area: centro, alvos: [alvoEm(ALVO, 1650, 650)] }), { casa: CASA, agora: 1000 });
  const [nuvem] = de(fumaca, 'nuvem');
  assert.deepEqual([nuvem.chave, nuvem.persistente, nuvem.fim, nuvem.lado], ['nuvem.fumaca', true, 1060, 10]);
  assert.equal(de(fumaca, 'explosao')[0].chave, 'explosao.leve', 'o "puf"');
  assert.deepEqual([de(fumaca, 'tremor').length, de(fumaca, 'impacto').length], [0, 0]);
  const falhou = alvoEm('Falhou0000000001', 1650, 650, { municao: { efeito: 'flashbang', resistiu: false } });
  const resistiu = alvoEm('Resistiu00000001', 1750, 650, { municao: { efeito: 'flashbang', resistiu: true } });
  const flash = roteiro(evento({ modo: 'explosivo', arma: granada('flashbang'), area: centro, alvos: [falhou, resistiu] }), { casa: CASA });
  assert.deepEqual(de(flash, 'tela').map(p => p.token), [falhou.token]);
  assert.equal(de(flash, 'clarao').filter(p => p.chave === 'clarao.flashbang').length, 1);
  const emp = roteiro(evento({ modo: 'explosivo', arma: granada('emp'), area: centro, alvos: [falhou, resistiu] }), { casa: CASA });
  assert.deepEqual(de(emp, 'faisca').map(p => [p.token, p.chave]).sort(), [[falhou.token, 'faisca.emp'], [resistiu.token, 'faisca.emp']].sort());
  assert.equal(de(emp, 'onda')[0].chave, 'onda.emp');
  const fogo = roteiro(evento({ modo: 'explosivo', arma: granada('incendiary'), area: centro, alvos: [alvoEm(ALVO, 1650, 650, { dano: dano(6), estados: { fogo: true } })] }), { casa: CASA });
  assert.equal(de(fogo, 'explosao')[0].chave, 'explosao.fogo');
  assert.deepEqual(de(fogo, 'chamas').map(p => [p.token, p.persistente]), [[ALVO, true]]);
  const teia = roteiro(evento({ modo: 'explosivo', arma: granada('arachnid'), area: centro, alvos: [alvoEm(ALVO, 1650, 650)] }), { casa: CASA });
  assert.deepEqual(de(teia, 'anel').map(p => [p.chave, p.persistente]), [['anel.teia', true]]);
  // O gás: uma nuvem curta, que não fica.
  const gas = roteiro(evento({ modo: 'explosivo', arma: granada('teargas'), area: centro, alvos: [] }), { casa: CASA });
  assert.deepEqual([de(gas, 'nuvem')[0].chave, Boolean(de(gas, 'nuvem')[0].persistente)], ['nuvem.gas', false]);
});

test('C78, 10: o corpo a corpo pela classe: a lâmina, o contundente, o soco, o chicote do Monowire e a garra; o avanço sempre antes do golpe', () => {
  const casos = { lamina: ['golpe.corte', 'impacto.carne'], 'contundente-pesado': ['golpe.contundente', 'impacto.contundente'], soco: ['golpe.soco', 'impacto.contundente'],
    chicote: ['golpe.chicote', 'impacto.carne'], garra: ['golpe.garra', 'impacto.carne'], 'golpe-marcial': ['golpe.chute', 'impacto.contundente'] };
  for (const [perfil, [golpe, impacto]] of Object.entries(casos)) {
    const r = roteiro(evento({ modo: 'corpo', arma: arma(perfil, { tipo: 'medMelee', municao: null }), alvos: [alvoEm(ALVO, 250, 150, { dano: dano(7) })] }), { casa: CASA });
    const [avanco] = de(r, 'avanco'), [passo] = de(r, 'golpe');
    assert.ok(avanco && avanco.t < passo.t, `${perfil}: o avanço antes do golpe`);
    assert.equal(avanco.token, ATIRADOR.token);
    assert.deepEqual([passo.chave, de(r, 'impacto')[0].chave], [golpe, impacto], perfil);
    assert.deepEqual([avanco.t, passo.t, de(r, 'impacto')[0].t, de(r, 'texto').length ? de(r, 'texto')[0].t : 180], [0, 80, 120, 180]);
  }
  // A esquiva aos 60; o pesado (a Gorilla) treme.
  const esquivou = roteiro(evento({ modo: 'corpo', arma: arma('lamina', { tipo: 'medMelee', municao: null }), alvos: [alvoEm(ALVO, 250, 150, { resultado: 'esquivou' })] }), { casa: CASA });
  assert.deepEqual([de(esquivou, 'esquiva')[0].t, de(esquivou, 'impacto').length], [60, 0]);
  const gorilla = roteiro(evento({ modo: 'corpo', arma: arma('gorilla', { tipo: 'unarmed', municao: null }), alvos: [alvoEm(ALVO, 250, 150, { dano: dano(7) })] }), { casa: CASA });
  assert.equal(de(gorilla, 'tremor').length, 1);
  // A arma branca no modo tiro (o perfil é de corpo a corpo) também vira o corpo a corpo.
  assert.equal(de(roteiro(evento({ modo: 'tiro', arma: arma('lamina', { tipo: 'medMelee', municao: null }), alvos: [alvoEm(ALVO, 250, 150)] }), { casa: CASA }), 'golpe').length, 1);
});

test('C78, 11: os níveis: o reduzido, o só o texto e o nada; o sangue e o tremor desligados; o modo fotossensível', () => {
  const rajada = evento({ modo: 'autofogo', balas: 10, alvos: [alvoEm(ALVO, 2650, 150, { multiplicador: 3, dano: dano(15) })], texto: [textoDe(ALVO, '−15 HP')] });
  const granada = evento({ modo: 'explosivo', arma: arma('lanca-granadas', { tipo: 'grenadeLauncher', municao: { tipo: 'grenade', efeito: 'flashbang' } }), area: { x: 1650, y: 650, lado: 10 },
    alvos: [alvoEm(ALVO, 1650, 650, { municao: { efeito: 'flashbang', resistiu: false } })] });
  const explosao = evento({ modo: 'explosivo', arma: arma('lanca-granadas', { tipo: 'grenadeLauncher', municao: { tipo: 'grenade', efeito: 'basic' } }), area: { x: 1650, y: 650, lado: 10 }, alvos: [alvoEm(ALVO, 1650, 650, { dano: dano(9) })] });
  const reduzido = roteiro(rajada, { nivel: 'reduzido', casa: CASA });
  assert.equal(de(reduzido, 'tracante').length, 1, 'um traçante por ataque');
  assert.equal(de(reduzido, 'sangue').length, 0);
  assert.ok(de(reduzido, 'faisca').length > 0, 'a faísca no lugar do sangue');
  assert.ok(reduzido.every(p => p.particulas === false), 'sem partículas');
  assert.ok(de(reduzido, 'som').length > 0, 'o som continua');
  assert.equal(de(roteiro(explosao, { nivel: 'reduzido', casa: CASA }), 'tremor').length, 0);
  assert.ok(roteiro(rajada, { casa: CASA }).every(p => p.particulas === true));
  const texto = roteiro(rajada, { nivel: 'texto', casa: CASA });
  assert.deepEqual(texto.map(p => [p.passo, p.t, p.texto]), [['texto', 0, '−15 HP']]);
  assert.deepEqual(roteiro(rajada, { nivel: 'nada', casa: CASA }), []);
  assert.deepEqual(roteiro(rajada, { nivel: 'outro', casa: CASA }), []);
  const semSangue = roteiro(rajada, { sangue: false, casa: CASA });
  assert.equal(de(semSangue, 'sangue').length, 0);
  assert.equal(de(semSangue, 'faisca').length, de(roteiro(rajada, { casa: CASA }), 'sangue').length);
  assert.equal(de(roteiro(explosao, { tremor: false, casa: CASA }), 'tremor').length, 0);
  assert.equal(de(roteiro(explosao, { casa: CASA }), 'tremor').length, 1);
  const foto = roteiro(granada, { fotossensivel: true, casa: CASA });
  assert.deepEqual([de(foto, 'tela').length, foto.filter(p => p.passo === 'clarao' && p.intensidade === 'forte').length], [0, 0]);
  assert.equal(de(roteiro(granada, { casa: CASA }), 'tela').length, 1);
  assert.equal(de(roteiro(explosao, { fotossensivel: true, casa: CASA }), 'tremor').length, 0);
  // A nuvem do reduzido: só o contorno.
  const fumaca = evento({ modo: 'explosivo', arma: arma('lanca-granadas', { tipo: 'grenadeLauncher', municao: { tipo: 'grenade', efeito: 'smoke' } }), area: { x: 1650, y: 650, lado: 10 } });
  assert.equal(de(roteiro(fumaca, { nivel: 'reduzido', casa: CASA }), 'nuvem')[0].contorno, true);
  // O filtro sozinho, sem o roteiro inteiro.
  assert.deepEqual(filtrarPeloNivel([{ t: 0, passo: 'tremor', duracao: 10 }], { nivel: 'completo' }).map(p => p.passo), ['tremor']);
});

test('C78, 12: o nível efetivo é o menor entre o da mesa e o do navegador; os valores antigos da configuração valem', () => {
  assert.deepEqual(MAPA_DO_ANTIGO, { auto: 'completo', reduzido: 'reduzido', texto: 'texto', nao: 'nada' });
  assert.equal(nivelEfetivo('auto', 'mesa'), 'completo');
  assert.equal(nivelEfetivo('auto'), 'completo');
  assert.equal(nivelEfetivo('texto', 'mesa'), 'texto');
  assert.equal(nivelEfetivo('nao', 'completo'), 'nada', 'o jogador nunca passa do teto do mestre');
  assert.equal(nivelEfetivo('auto', 'reduzido'), 'reduzido');
  assert.equal(nivelEfetivo('reduzido', 'completo'), 'reduzido');
  assert.equal(nivelEfetivo('auto', 'texto'), 'texto');
  assert.equal(nivelEfetivo('texto', 'reduzido'), 'texto');
  assert.equal(nivelEfetivo('auto', 'nada'), 'nada');
  assert.equal(nivelEfetivo('qualquer', 'outro'), 'completo', 'o desconhecido: o padrão de hoje (auto)');
  for (const mundo of NIVEIS) for (const cliente of NIVEIS) {
    assert.equal(nivelEfetivo(mundo, cliente), NIVEIS[Math.max(NIVEIS.indexOf(mundo), NIVEIS.indexOf(cliente))]);
  }
});

test('C78, 13: o teto: nenhum roteiro passa de 3,5 s no completo nem de 1,5 s no reduzido; o supressivo de 40 alvos se comprime sem perder um texto', () => {
  const muitos = Array.from({ length: 40 }, (_, i) => alvoEm(`Alvo${String(i).padStart(12, '0')}`, 300 + (i % 8) * 200, 300 + Math.floor(i / 8) * 200, { resultado: i % 3 ? 'suprimido' : 'firme' }));
  const supressivo = evento({ modo: 'supressivo', alvos: muitos, texto: muitos.map(a => textoDe(a.token, a.resultado === 'firme' ? 'Firme' : 'Suprimido!')) });
  assert.ok(fim(montarPassos(supressivo, { casa: CASA })) > TETO.completo, 'sem o teto, o supressivo cheio passa dele');
  const eventos = [
    supressivo,
    evento({ alvos: [alvoEm(ALVO, 9000, 150, { dano: dano(12, { critico: true, lesoes: 1 }) })], texto: [textoDe(ALVO, '−12 HP · crítico!')] }),
    evento({ modo: 'autofogo', balas: 10, alvos: [alvoEm(ALVO, 9000, 150, { multiplicador: 4, dano: dano(15) }), alvoEm('Outro00000000001', 9000, 950, { multiplicador: 2, dano: dano(15) })] }),
    evento({ modo: 'explosivo', arremesso: true, arma: arma('granada', { tipo: 'thrownWeapon', municao: { tipo: 'grenade', efeito: 'basic' } }), area: { x: 9000, y: 650, lado: 10 }, alvos: muitos.slice(0, 12).map(a => ({ ...a, resultado: 'acertou', dano: dano(9) })) }),
    evento({ modo: 'cartucho', alvos: muitos.slice(0, 6).map(a => ({ ...a, resultado: 'acertou', dano: dano(9) })) }),
    evento({ modo: 'corpo', arma: arma('lamina', { tipo: 'medMelee', municao: null }), alvos: muitos.slice(0, 6).map(a => ({ ...a, resultado: 'acertou', dano: dano(9) })) })
  ];
  for (const [i, e] of eventos.entries()) {
    for (const nivel of ['completo', 'reduzido']) {
      const r = roteiro(e, { nivel, casa: CASA });
      assert.ok(fim(r) <= TETO[nivel], `o evento ${i} no ${nivel}: ${fim(r)} ms`);
      assert.equal(de(r, 'texto').length, e.texto.length, `o evento ${i} no ${nivel}: os textos`);
      assert.ok(naoDesce(r));
    }
  }
  const comprimido = roteiro(supressivo, { casa: CASA });
  assert.equal(de(comprimido, 'texto').length, 40);
  assert.ok(de(comprimido, 'tracante').length < 8, 'os traçantes extras saem');
  // O comprimir sozinho: o que cabe fica igual; o que dura conta só pelo começo.
  const curto = [{ t: 0, passo: 'som', duracao: 100 }, { t: 100, passo: 'texto', duracao: 600 }];
  assert.deepEqual(comprimir(curto, 3500), curto);
  assert.deepEqual(comprimir([{ t: 3000, passo: 'nuvem', duracao: 60000, persistente: true }], 3500)[0].t, 3000);
});

test('C78, 14: a validação do evento e o caminho de arquivo permitido', () => {
  const certo = evento({ alvos: [alvoEm(ALVO, 2650, 150, { dano: dano(12) })], texto: [textoDe(ALVO, '−12 HP')] });
  assert.equal(validarEvento(certo), null);
  const errado = mudanca => validarEvento({ ...certo, ...mudanca });
  for (const [motivo, mudanca] of [
    ['o tipo', { tipo: 'outro' }], ['a fase', { fase: 'antes' }], ['a versão', { v: 2 }], ['o modo', { modo: 'laser' }], ['o id', { id: '' }], ['a cena', { cena: '../x' }],
    ['os alvos', { alvos: Array.from({ length: 41 }, (_, i) => alvoEm(`Alvo${String(i).padStart(12, '0')}`, 100, 100)) }],
    ['o NaN', { alvos: [alvoEm(ALVO, Number.NaN, 150)] }], ['o infinito', { origem: { ...ATIRADOR, x: Infinity } }],
    ['o resultado', { alvos: [alvoEm(ALVO, 10, 10, { resultado: 'explodiu' })] }],
    ['o texto longo', { texto: [textoDe(ALVO, 'x'.repeat(81))] }], ['o texto com HTML', { texto: [textoDe(ALVO, '<img src=x>')] }], ['o estilo', { texto: [textoDe(ALVO, 'oi', 'vermelho')] }],
    ['o caminho na arma', { arma: arma('worlds/mundo/fx/ak.ogg') }], ['o endereço na munição', { arma: arma('fuzil', { municao: { tipo: 'rifle', efeito: 'http://mal/x.ogg' } }) }],
    ['o token com uuid', { alvos: [alvoEm('Scene.x.Token.y', 10, 10)] }], ['a área', { area: { x: 1, y: Number.NaN } }]
  ]) assert.notEqual(errado(mudanca), null, motivo);
  assert.notEqual(validarEvento(null), null);
  assert.notEqual(validarEvento([]), null);
  assert.deepEqual(roteiro({ ...certo, tipo: 'outro' }, { casa: CASA }), [], 'o evento inválido: o roteiro vazio');
  // O caminho de um arquivo de efeito: só dentro do servidor e com a extensão de mídia.
  for (const src of ['http://mal.com/a.ogg', 'https://mal.com/a.ogg', '//mal.com/a.ogg', 'systems/cpr-fieldbook/../../a.ogg', 'data:audio/ogg;base64,AAAA',
    'systems/cpr-fieldbook/efeitos/a.js', 'systems/cpr-fieldbook/efeitos/a.ogg.exe', 'systems/outro/a.ogg', 'C:\\Users\\a.ogg', '/systems/cpr-fieldbook/a.ogg',
    'worlds/../a.ogg', 'modules/x/a.ogg?v=1', 'modules/x/%2e%2e/a.ogg', '', null, 42]) assert.equal(srcPermitido(src), false, String(src));
  for (const src of ['systems/cpr-fieldbook/efeitos/sons/tiro-fuzil.ogg', 'modules/JB2A_DnD5e/Library/Generic/Impact/Impact_07_Regular_Orange_400x400.webm',
    'worlds/edgerunners-escoria/fx/ak-tiro.mp3', 'systems/cpr-fieldbook/efeitos/sprites/explosao.webp', 'worlds/mesa/fx/cano.PNG', 'modules/meus-sons/rua/eco.wav']) assert.equal(srcPermitido(src), true, src);
});

test('C78, 15: os perfis em camadas: o do item, o do mestre para o item do catálogo, o do mestre para a classe e o padrão; um caminho no lugar da chave não vale', () => {
  const doMestre = {
    perfis: {
      'fuzil-pesado': { base: 'fuzil', sons: { disparo: 'worlds/mesa/fx/ak-tiro.ogg', rajada: 'http://mal.com/rajada.ogg', recarga: 'worlds/mesa/fx/../x.ogg' }, cor: '#ffb347' },
      'sem-base': { base: 'nao-existe' }, fuzil: { base: 'pistola' }, 'Maiuscula': { base: 'fuzil' }
    },
    catalogo: { 'core_weapons:assault-rifle': 'fuzil-pesado', 'core_weapons:heavy-pistol': 'worlds/mesa/fx/x.ogg' },
    tipos: { smg: 'fuzil-pesado' }
  };
  const proprios = perfisDoMestre(doMestre);
  assert.deepEqual(Object.keys(proprios), ['fuzil-pesado'], 'sem base, com o nome de um do sistema ou fora do formato: fora');
  assert.deepEqual(proprios['fuzil-pesado'].sons, { disparo: 'worlds/mesa/fx/ak-tiro.ogg' }, 'só os caminhos permitidos');
  assert.equal(proprios['fuzil-pesado'].familia, 'tiro', 'herda da base');
  const fuzil = { tipo: 'assaultRifle', catalogo: 'core_weapons:assault-rifle', doMestre };
  assert.equal(perfilDaArma(fuzil).chave, 'fuzil-pesado', 'o do mestre para o item do catálogo');
  assert.equal(perfilDaArma({ ...fuzil, doItem: 'lamina' }).chave, 'lamina', 'o do item vence');
  assert.equal(perfilDaArma({ ...fuzil, doItem: 'worlds/mesa/fx/ak.ogg' }).chave, 'fuzil-pesado', 'o caminho no item: ignorado');
  assert.equal(perfilDaArma({ ...fuzil, doItem: 'nao-existe' }).chave, 'fuzil-pesado', 'a chave desconhecida: ignorada');
  assert.equal(perfilDaArma({ tipo: 'assaultRifle', catalogo: 'core_weapons:assault-rifle' }).chave, 'fuzil', 'sem o mestre: o padrão');
  assert.equal(perfilDaArma({ tipo: 'heavyPistol', catalogo: 'core_weapons:heavy-pistol', doMestre }).chave, 'pistola', 'o caminho no lugar da chave do mestre: ignorado');
  assert.equal(perfilDaArma({ tipo: 'smg', doMestre }).chave, 'fuzil-pesado', 'o do mestre para a classe');
  assert.equal(perfilDaArma({ tipo: 'smg', catalogo: 'core_weapons:flamethrower', doMestre }).chave, 'lanca-chamas', 'a arma especial do catálogo antes da classe');
  assert.equal(perfilDaArma({ tipo: 'smg', doItem: 'constructor' }).chave, 'submetralhadora', 'nada do protótipo');
  assert.equal(perfilDaArma({ tipo: 'constructor' }), null);
  // O evento leva só a chave; o roteiro acha o perfil do mestre pela mesma configuração.
  const e = eventoDoAtaque({ id: 'ataque0000000001', modo: 'tiro', linhas: [{ resultado: 'acertou', dano: null }] }, { cena: 'cena000000000001', origem: ATIRADOR, alvos: [{ token: ALVO, x: 2650, y: 150 }], arma: fuzil, doMestre });
  assert.equal(e.arma.perfil, 'fuzil-pesado');
  assert.equal(validarEvento(e), null);
  assert.equal(de(roteiro(e, { casa: CASA, doMestre }), 'som')[0].chave, 'tiro.fuzil');
});

test('C78, 16: o evento a partir do resumo do cartão e das posições; o texto é o de hoje', () => {
  const resumo = {
    id: 'Pedido0000000001', modo: 'tiro', arremesso: false, local: 'cabeca', descricao: 'Mirado na cabeça', ataque: 17, atacante: 'Atiradora', arma: 'Assault Rifle',
    linhas: [
      { nome: 'Alvo', resultado: 'acertou', escolha: 'aguentar', multiplicador: null, dano: { hpAntes: 30, hpDepois: 18, lesoes: [{ item: 'x' }], escudo: false, estase: false, ablado: 1, lugar: 'cabeca' }, municao: null, segundaTentativa: null },
      { nome: 'Outro', resultado: 'esquivou', escolha: 'esquivar', dano: null, municao: null },
      { nome: 'Caído', resultado: 'acertou', dano: { hpAntes: 3, hpDepois: 0, lesoes: [] }, municao: { efeito: 'incendiary' } },
      { nome: 'Sem token', resultado: 'acertou', dano: { hpAntes: 10, hpDepois: 5, lesoes: [] } }
    ]
  };
  const alvos = [{ token: ALVO, x: 2650, y: 150 }, { token: 'Outro00000000001', x: 2650, y: 550, escondido: true }, { token: 'Caido00000000001', x: 2650, y: 950 }];
  const e = eventoDoAtaque(resumo, { cena: 'cena000000000001', origem: ATIRADOR, alvos, arma: { tipo: 'assaultRifle', catalogo: 'core_weapons:assault-rifle', municao: { tipo: 'rifle', efeito: 'basic' } }, balas: 1 });
  assert.equal(validarEvento(e), null);
  assert.deepEqual({ v: e.v, id: e.id, tipo: e.tipo, fase: e.fase, cena: e.cena, modo: e.modo, local: e.local, balas: e.balas, perfil: e.arma.perfil },
    { v: 1, id: 'Pedido0000000001', tipo: 'ataque', fase: 'desfecho', cena: 'cena000000000001', modo: 'tiro', local: 'cabeca', balas: 1, perfil: 'fuzil' });
  assert.deepEqual(e.origem, { token: ATIRADOR.token, x: 150, y: 150, tamanho: 1, rotacao: 0 });
  assert.equal(e.alvos.length, 3, 'a linha sem posição fica de fora');
  assert.deepEqual(e.alvos[0].dano, { perdeu: 12, passou: true, critico: true, lesoes: 1, escudo: false, estase: false, ablado: 1, veicular: false });
  assert.deepEqual([e.alvos[0].estados.mortal, e.alvos[2].estados.mortal, e.alvos[2].estados.fogo], [false, true, true]);
  assert.deepEqual([e.alvos[1].resultado, e.alvos[1].escondido, e.alvos[1].dano], ['esquivou', true, null]);
  assert.deepEqual(e.texto, resumo.linhas.slice(0, 3).map((linha, i) => ({ token: alvos[i].token, ...textoNoToken(linha) })));
  assert.deepEqual(e.texto.map(t => t.texto), ['−12 HP · crítico!', 'Esquivou!', '−3 HP']);
  // Só dados: o evento sobrevive ao JSON (vai na flag do cartão e pelo socket).
  assert.deepEqual(JSON.parse(JSON.stringify(e)), e);
  // O dano à parte pelo cartão: sem origem, só os impactos e os textos.
  const aParte = eventoDoAtaque({ ...resumo, linhas: resumo.linhas.slice(0, 1) }, { cena: 'cena000000000001', alvos: alvos.slice(0, 1), arma: { tipo: 'assaultRifle' } });
  assert.equal(aParte.origem, null);
  assert.deepEqual(nomes(roteiro(aParte, { casa: CASA })), ['impacto', 'sangue', 'som', 'texto']);
  // O veículo: o dano na estrutura.
  const veiculo = eventoDoAtaque({ id: 'Pedido0000000001', modo: 'tiro', linhas: [{ resultado: 'acertou', veicular: { perdeu: 7, ablado: 1 } }] }, { cena: 'cena000000000001', origem: ATIRADOR, alvos: [{ token: ALVO, x: 2650, y: 150 }], arma: { tipo: 'assaultRifle' } });
  assert.deepEqual(veiculo.alvos[0].dano, { perdeu: 7, passou: true, critico: false, lesoes: 0, escudo: false, estase: false, ablado: 1, veicular: true });
});

test('C78, 17: lexical: os ouvintes que tocam efeito conferem o remetente mestre; o cartão não espera o efeito; a regra é pura', () => {
  const scripts = path.join(sistema, 'scripts');
  const todos = fs.readdirSync(scripts, { recursive: true }).filter(f => String(f).endsWith('.mjs')).map(f => path.join('scripts', String(f)));
  for (const arquivo of todos) {
    for (const linha of leia(arquivo).split(/\r?\n/)) {
      if (/tipo\s*===\s*'(texto|efeito)'/.test(linha)) assert.match(linha, /isGM/, `${arquivo}: ${linha.trim()}`);
    }
  }
  const cartao = leia('scripts/combate/cartao.mjs');
  assert.doesNotMatch(cartao, /await\s+(mostrarNaMesa|animar|tocar|textoFlutuante)\s*\(/, 'o cartão não espera o efeito');
  for (const arquivo of ['scripts/regras-coreografia.mjs', 'scripts/catalogo-efeitos.mjs']) {
    const codigo = leia(arquivo).replace(/\/\/.*$/gm, '');
    assert.doesNotMatch(codigo, /\b(game|canvas|ui|foundry|CONFIG|Hooks|PIXI)\.|\bdocument\.|\bwindow\./, `${arquivo} sem o Foundry`);
    assert.doesNotMatch(codigo, /\bfetch\(|import\(/, `${arquivo} não busca nada`);
  }
});

test('C78: o catálogo dos efeitos: o "proprio:" no fim de cada chave, os caminhos permitidos, e toda chave que um roteiro ou um perfil usa existe', () => {
  assert.deepEqual(conferirCatalogo(), []);
  assert.ok(Object.keys(CATALOGO).length >= 60);
  for (const [chave, lista] of Object.entries(CATALOGO)) assert.equal(lista.at(-1), `${PROPRIO}${chave}`);
  // O conferidor pega o catálogo errado.
  assert.equal(conferirCatalogo({ 'tiro.x': ['proprio:tiro.y'] }).length, 1);
  assert.equal(conferirCatalogo({ 'tiro.x': ['http://mal.com/a.ogg', 'proprio:tiro.x'] }).length, 1);
  assert.equal(conferirCatalogo({ 'tiro.x': ['proprio:tiro.x', 'proprio:tiro.x'] }).length, 1);
  assert.equal(conferirCatalogo({ 'tiro.x': [] }).length, 1);
  assert.equal(conferirCatalogo({ TiroX: ['proprio:TiroX'] }).length, 1);
  // Os candidatos: os do mestre antes, os do catálogo, e o "proprio:" no fim; os caminhos ruins saem.
  assert.deepEqual(candidatosDoEfeito('tiro.fuzil', { 'tiro.fuzil': ['worlds/mesa/fx/ak.ogg', 'http://mal.com/a.ogg', 'proprio:outro'] }), ['worlds/mesa/fx/ak.ogg', 'proprio:tiro.fuzil']);
  assert.deepEqual(candidatosDoEfeito('impacto.carne').at(-1), 'proprio:impacto.carne');
  assert.ok(candidatosDoEfeito('impacto.carne')[0].startsWith('modules/JB2A_DnD5e/'), 'o JB2A de hoje antes do próprio');
  assert.deepEqual(candidatosDoEfeito('nao.existe'), []);
  assert.deepEqual(candidatosDoEfeito('constructor'), []);
  // As chaves dos perfis e de todos os roteiros (todos os modos, os tipos e os níveis) existem no catálogo.
  for (const chave of chavesDosPerfis()) assert.ok(Object.hasOwn(CATALOGO, chave), `o perfil usa ${chave}`);
  const centro = { x: 1650, y: 650, lado: 10 };
  const comDano = alvoEm(ALVO, 2650, 150, { multiplicador: 3, dano: dano(12, { critico: true, lesoes: 1 }), estados: { fogo: true, derrubado: true } });
  const eventos = [];
  for (const perfil of Object.keys(PERFIS)) {
    for (const modo of ['tiro', 'autofogo', 'supressivo', 'cartucho', 'corpo', 'ricochete', 'doisCanos', 'arremesso']) {
      for (const resultado of ['acertou', 'errou', 'esquivou']) eventos.push(evento({ modo, arma: arma(perfil), alvos: [{ ...comDano, resultado }] }));
    }
    for (const efeito of ['basic', 'incendiary', 'smoke', 'teargas', 'biotoxin', 'poison', 'sleep', 'flashbang', 'emp', 'arachnid', 'rubber']) {
      eventos.push(evento({ modo: 'explosivo', arma: arma(perfil, { municao: { tipo: 'grenade', efeito } }), area: centro, alvos: [{ ...comDano, municao: { efeito, resistiu: false } }] }));
    }
    for (const tipo of ['agarrao', 'corpo', 'net', 'quickhack', 'recarga', 'movimento']) eventos.push(evento({ tipo, arma: arma(perfil), alvos: [comDano] }));
    eventos.push(evento({ fase: 'disparo', arma: arma(perfil), alvos: [comDano] }));
  }
  for (const classe2077 of ['smart', 'tech', 'power']) eventos.push(evento({ arma: arma('fuzil', { classe2077 }), alvos: [comDano] }));
  const usadas = new Set();
  for (const e of eventos) {
    assert.equal(validarEvento(e), null);
    const passos = montarPassos(e, { casa: CASA });
    for (const passo of passos) assert.ok(PASSOS.includes(passo.passo), `o passo ${passo.passo}`);
    for (const chave of chavesDoRoteiro(passos)) usadas.add(chave);
  }
  for (const chave of usadas) assert.ok(Object.hasOwn(CATALOGO, chave), `um roteiro usa ${chave}`);
  assert.ok(usadas.size >= 40, `as chaves usadas: ${usadas.size}`);
});

// Referência: a tabela de lesões da wiki (system-rules.js:33 e :50), conferida pelo texto, e o dano bônus do crítico
// (p. 187). Crânio rachado: "Tiros mirados na cabeça multiplicam o dano que passa da armadura por 3 em vez de 2."
// Costelas quebradas: "No fim de cada turno em que andar mais de 4 m a pé, sofre de novo o dano bônus da lesão direto no
// HP." A correção rápida desliga o efeito até o "Voltou" (tratamento.mjs). Sem Foundry nem navegador.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { aplicarDano, BONUS_CRITICO } from '../../foundry-sistema/scripts/regras.mjs';
import {
  COSTELAS_QUEBRADAS, costelasDoem, CRANIO_RACHADO, DANO_DAS_COSTELAS, METROS_DAS_COSTELAS, metrosAPe, vezesNaCabeca
} from '../../foundry-sistema/scripts/regras-lesoes.mjs';

const wiki = fs.readFileSync(new URL('../../system-rules.js', import.meta.url), 'utf8');
const lesao = (catalogo, corrigida = false) => ({ type: 'lesao', flags: { 'cpr-fieldbook': { catalogo, ...(corrigida ? { corrigida: true } : {}) } } });

test('Lesões com conta: os textos da wiki são os que o sistema aplica', () => {
  assert.match(wiki, /'Crânio rachado', 'Tiros mirados na cabeça multiplicam o dano que passa da armadura por 3 em vez de 2\./);
  assert.match(wiki, /'Costelas quebradas', 'No fim de cada turno em que andar mais de 4 m a pé, sofre de novo o dano bônus da lesão direto no HP\.'/);
  assert.equal(METROS_DAS_COSTELAS, 4);
  assert.equal(DANO_DAS_COSTELAS, BONUS_CRITICO);
  assert.equal(DANO_DAS_COSTELAS, 5);
});

test('Crânio rachado: o que passa da armadura na cabeça entra ×3; o bônus do crítico e o corpo não mudam; corrigida, ×2', () => {
  assert.equal(vezesNaCabeca([]), 2);
  assert.equal(vezesNaCabeca([lesao(CRANIO_RACHADO)]), 3);
  assert.equal(vezesNaCabeca([lesao(CRANIO_RACHADO, true)]), 2, 'a correção rápida desliga o efeito');
  assert.equal(vezesNaCabeca([lesao(COSTELAS_QUEBRADAS)]), 2);
  assert.equal(vezesNaCabeca([{ type: 'arma', flags: { 'cpr-fieldbook': { catalogo: CRANIO_RACHADO } } }]), 2);
  // 15 contra SP 11: passam 4. Na cabeça, 8 (×2) ou 12 (×3); o bônus de 5 do crítico entra uma vez.
  assert.equal(aplicarDano({ dano: 15, sp: 11, local: 'cabeca' }).recebido, 8);
  assert.equal(aplicarDano({ dano: 15, sp: 11, local: 'cabeca', naCabeca: 3 }).recebido, 12);
  assert.equal(aplicarDano({ dano: 15, bonus: 5, sp: 11, local: 'cabeca', naCabeca: 3 }).recebido, 17);
  assert.equal(aplicarDano({ dano: 15, sp: 11, local: 'corpo', naCabeca: 3 }).recebido, 4);
  assert.equal(aplicarDano({ dano: 10, sp: 11, local: 'cabeca', naCabeca: 3 }).recebido, 0, 'o que não passa não multiplica');
  assert.equal(aplicarDano({ dano: 20, sp: 11, local: 'cabeca', direto: true, naCabeca: 3 }).recebido, 20, 'direto no HP: o lugar do corpo não multiplica');
});

test('Costelas quebradas: só mais de 4 m a pé no turno; corrigida ou sem a lesão, nada', () => {
  assert.equal(costelasDoem([lesao(COSTELAS_QUEBRADAS)], 6), true);
  assert.equal(costelasDoem([lesao(COSTELAS_QUEBRADAS)], 4), false, 'exatamente 4 m não é mais de 4');
  assert.equal(costelasDoem([lesao(COSTELAS_QUEBRADAS)], 4.5), true);
  assert.equal(costelasDoem([lesao(COSTELAS_QUEBRADAS, true)], 10), false);
  assert.equal(costelasDoem([lesao(CRANIO_RACHADO)], 10), false);
});

test('Costelas quebradas: os metros a pé do histórico de movimento, sem o deslocamento forçado nem o salto mágico', () => {
  // Cada ponto diz como o token chegou a ele; o medir de mentira conta 2 m por ponto do trecho seguido.
  const medir = trecho => (trecho.length - 1) * 2;
  const ponto = action => ({ x: 0, y: 0, action });
  assert.equal(metrosAPe([], medir), 0);
  assert.equal(metrosAPe([ponto('walk')], medir), 0, 'só a origem');
  assert.equal(metrosAPe([ponto('walk'), ponto('walk'), ponto('walk')], medir), 4);
  assert.equal(metrosAPe([ponto('walk'), ponto('walk'), ponto('walk'), ponto('walk')], medir), 6);
  // No veículo (a tripulação anda pelo 'displace'), nada; descer do veículo e andar, sim.
  assert.equal(metrosAPe([ponto('walk'), ponto('displace'), ponto('displace'), ponto('displace')], medir), 0);
  assert.equal(metrosAPe([ponto('walk'), ponto('walk'), ponto('displace'), ponto('walk'), ponto('walk')], medir), 6);
  assert.equal(metrosAPe([ponto('walk'), ponto('blink'), ponto('walk')], medir), 2);
  // O trecho é medido inteiro (a regra das diagonais da cena vale para o caminho, não para cada passo).
  const trechos = [];
  metrosAPe([ponto('walk'), ponto('walk'), ponto('walk'), ponto('displace'), ponto('walk')], trecho => { trechos.push(trecho.length); return 0; });
  assert.deepEqual(trechos, [3, 2]);
});

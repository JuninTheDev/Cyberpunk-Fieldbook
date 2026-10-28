// Testes de referência do Cryopump e do Cryotank (o C41, parte 4; foundry-sistema/scripts/regras-cryo.mjs), sem Foundry:
// a cobertura, a DV, a recarga e os pontos do Medtech pela wiki (system-catalog.js, "Equipamento médico" e "Criossistema
// do Medtech, por Rank"); as cargas e as pessoas; a cobertura que leva o dano antes; e a cura no dobro do tanque (o
// descanso do C36).
// Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { capacidadeDoCryopump, cargasDoCryopump, coberturaDaEstase, COBERTURA_DA_ESTASE, dispositivoCryo, DV_DO_CRYOTANK, estaseDeuCerto, estaseProtege, multiplicadorDaCura, planoDaEstase, pontosDeCriossistemas, RECARGA_DO_CRYOPUMP } from '../../foundry-sistema/scripts/regras-cryo.mjs';
import { curaNatural } from '../../foundry-sistema/scripts/regras-estabilizar.mjs';

test('Cryo (wiki, Equipamento médico): a cobertura, a DV do tanque, a recarga e os pontos do Medtech são os do texto da wiki', () => {
  const catalogo = fs.readFileSync(new URL('../../system-catalog.js', import.meta.url), 'utf8');
  assert.ok(catalogo.includes(`A bolsa vale como cobertura de ${COBERTURA_DA_ESTASE.cryopump} HP`));
  assert.ok(catalogo.includes(`Recarga: ${RECARGA_DO_CRYOPUMP}eb por carga.`));
  assert.ok(catalogo.includes(`Com Tecnologia Médica DV${DV_DO_CRYOTANK}, mantém 1 pessoa em estase`));
  assert.ok(catalogo.includes(`Vale como cobertura de ${COBERTURA_DA_ESTASE.cryotank} HP.`));
  assert.ok(catalogo.includes("['4', 'Mais 2 Cryotanks; o Cryopump passa a 2 cargas e 2 pessoas.'], ['5', 'Mais 3 Cryotanks; o Cryopump passa a 3 cargas.']"));
  assert.deepEqual([1, 3, 4, 5, 9].map(capacidadeDoCryopump), [
    { cargas: 1, pessoas: 1 }, { cargas: 1, pessoas: 1 }, { cargas: 2, pessoas: 2 }, { cargas: 3, pessoas: 2 }, { cargas: 3, pessoas: 2 }]);
});

test('Cryo: o dispositivo pelo catálogo ou pelo nome; os pontos de Criossistemas da Role principal ou da segunda', () => {
  assert.equal(dispositivoCryo('Qualquer', 'core_gear:cryopump'), 'cryopump');
  assert.equal(dispositivoCryo(' Cryotank '), 'cryotank');
  assert.equal(dispositivoCryo('Medscanner', 'core_gear:medscanner'), null);
  const habilidades = pontos => ({ habilidades: { 'Medical Tech (Cryosystem Operation)': pontos } });
  assert.equal(pontosDeCriossistemas({ role: habilidades(2), roleSecundaria: habilidades(4) }), 4);
  assert.equal(pontosDeCriossistemas({ role: habilidades(5) }), 5);
  assert.equal(pontosDeCriossistemas({ role: { habilidades: {} } }), 0);
  // Sem nada guardado, o Cryopump está cheio; o guardado não passa da capacidade.
  assert.deepEqual([cargasDoCryopump(undefined, 5), cargasDoCryopump(0, 5), cargasDoCryopump(7, 4), cargasDoCryopump(1, 1)], [3, 0, 2, 1]);
});

test('Cryo: o Cryopump gasta a carga; vazio, só com a recarga (50eb por carga, se der o dinheiro); as pessoas pelo Rank', () => {
  assert.deepEqual(planoDaEstase({ tipo: 'cryopump', pontos: 1 }), { tipo: 'cryopump', hp: 15, rola: false, dv: null, recarga: 0, recarregadas: 0, cargasDepois: 0 });
  assert.equal(planoDaEstase({ tipo: 'cryopump', cargas: 0, pontos: 1 }).erro, 'O Cryopump está sem carga: recarregue (50eb por carga).');
  assert.deepEqual(planoDaEstase({ tipo: 'cryopump', cargas: 0, pontos: 5, recarregar: true, dinheiro: 150 }),
    { tipo: 'cryopump', hp: 15, rola: false, dv: null, recarga: 150, recarregadas: 3, cargasDepois: 2 });
  assert.equal(planoDaEstase({ tipo: 'cryopump', cargas: 0, pontos: 5, recarregar: true, dinheiro: 149 }).erro, 'Dinheiro insuficiente para a recarga: tem 149eb, e 3 cargas custam 150eb.');
  // Com carga, recarregar não muda nada.
  assert.equal(planoDaEstase({ tipo: 'cryopump', cargas: 1, pontos: 1, recarregar: true }).recarga, 0);
  assert.equal(planoDaEstase({ tipo: 'cryopump', pontos: 1, ocupados: 1 }).erro, 'O Cryopump já tem 1 pessoa em estase (cabe 1).');
  assert.equal(planoDaEstase({ tipo: 'cryopump', pontos: 4, ocupados: 1 }).cargasDepois, 1);
  assert.equal(planoDaEstase({ tipo: 'cryopump', pontos: 4, ocupados: 2 }).erro, 'O Cryopump já tem 2 pessoas em estase (cabem 2).');
  assert.equal(planoDaEstase({ tipo: 'outro' }).erro, 'Escolha o Cryopump ou o Cryotank.');
});

test('Cryo (p. 128): o Cryotank rola Tecnologia Médica e precisa superar a DV13; cabe 1 pessoa', () => {
  assert.deepEqual(planoDaEstase({ tipo: 'cryotank' }), { tipo: 'cryotank', hp: 30, rola: true, dv: 13, recarga: 0, cargasDepois: null });
  assert.equal(planoDaEstase({ tipo: 'cryotank', ocupados: 1 }).erro, 'O Cryotank já tem alguém em estase (cabe 1 pessoa).');
  assert.deepEqual([12, 13, 14].map(estaseDeuCerto), [false, false, true]);
});

test('Cryo (a cobertura, p. 182–183): a bolsa leva o dano antes, a sobra se perde; só o explosivo que a destrói passa; sem Death Save com 1 HP ou mais', () => {
  assert.deepEqual(coberturaDaEstase({ hp: 15, dano: 9 }), { absorveu: 9, hp: 6, passa: false });
  assert.deepEqual(coberturaDaEstase({ hp: 6, dano: 20 }), { absorveu: 6, hp: 0, passa: false });
  assert.deepEqual(coberturaDaEstase({ hp: 6, dano: 20, explosivo: true }), { absorveu: 6, hp: 0, passa: true });
  assert.deepEqual(coberturaDaEstase({ hp: 30, dano: 12, explosivo: true }), { absorveu: 12, hp: 18, passa: false });
  assert.deepEqual([estaseProtege({ hp: 1 }), estaseProtege({ hp: 0 }), estaseProtege(null)], [true, false, false]);
});

test('Cryo + C36: no Cryotank (com cobertura), o descanso cura no dobro; no Cryopump, no ritmo normal', () => {
  assert.equal(multiplicadorDaCura({ tipo: 'cryotank', hp: 30 }), 2);
  assert.equal(multiplicadorDaCura({ tipo: 'cryotank', hp: 0 }), 1);
  assert.equal(multiplicadorDaCura({ tipo: 'cryopump', hp: 15 }), 1);
  assert.equal(multiplicadorDaCura(null), 1);
  // BODY 6, 2 dias, de 0 a 40: 12 por dia no tanque (24); com o Reinforced Antibodies, 24 por dia.
  assert.equal(curaNatural({ dias: 2, body: 6, hp: 0, max: 40, multiplicador: 2 }).depois, 24);
  assert.equal(curaNatural({ dias: 1, body: 6, hp: 0, max: 40, anticorpos: true, multiplicador: 2 }).porDia, 24);
  assert.equal(curaNatural({ dias: 1, body: 6, hp: 0, max: 40 }).porDia, 6);
});

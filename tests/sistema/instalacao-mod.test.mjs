// A instalação da modificação de arma pelo Tech (o C72, parte 1): as decisões do usuário de 2026-11-25 (o teste é TECH +
// Tecnologia de Armas + a Especialização de Upgrade contra a DV da categoria de preço, 13/17/21, em 1 hora, e na falha a
// modificação não entra nem se perde; quem instala é o Tech da mesa ou o mestre, com o Tech NPC), a página da regra na wiki
// (system-modificacoes.js, "A instalação") e a rolagem da Role que a ficha faz (regras.ROLAGENS_DE_ROLE).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import * as M from '../../foundry-sistema/scripts/regras-modificacoes.mjs';
import * as P from '../../foundry-sistema/scripts/regras-pedido-teste.mjs';
import { ROLAGENS_DE_ROLE } from '../../foundry-sistema/scripts/regras.mjs';

const ler = arquivo => fs.readFileSync(new URL(`../../${arquivo}`, import.meta.url), 'utf8');
const contexto = { window: {} };
vm.runInNewContext(ler('system-modificacoes.js'), contexto);
const pagina = Object.values(contexto.window.systemModificacoes.pages).map(p => p.html).join(' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
const catalogo = JSON.parse(ler('foundry-sistema/dados/catalogo.json')).itens;
const doCatalogo = id => ({ mod: catalogo[`mods-armas:${id}`].flags['cpr-fieldbook'].mod, preco: catalogo[`mods-armas:${id}`].system.preco });

test('C72: a DV da instalação pela categoria de preço, o tempo e o teste do Tech', () => {
  const tatica = { versao: 1, id: 'x', nome: 'X', tipo: 'tatica', tamanho: 1, efeitos: [] };
  const comPreco = eb => M.instalacaoDaMod(tatica, eb);
  assert.deepEqual([10, 50, 51, 100, 101, 500, 1000].map(eb => comPreco(eb).dv), [13, 13, 17, 17, 21, 21, 21]);
  assert.deepEqual([50, 100, 500].map(eb => comPreco(eb).categoria), ['Oneroso', 'Premium', 'Caro']);
  // A sem preço (a da oficina, a lendária): a DV do Caro.
  assert.deepEqual([0, undefined, 'x', -5].map(eb => comPreco(eb).dv), [21, 21, 21, 21]);
  assert.equal(comPreco(0).categoria, 'sem preço, a do Caro');
  assert.equal(comPreco(50).tempo, '1 hora');
  assert.deepEqual(comPreco(50).teste, { tipo: 'role', id: 'upgrade', pericia: 'weaponstech' });
  // O teste é uma cópia: mexer nele não muda a regra.
  comPreco(50).teste.pericia = 'handgun';
  assert.equal(M.TESTE_DA_INSTALACAO.pericia, 'weaponstech');
  // O defeito não se instala pelo Tech (vem do mestre), e o que não é modificação também não.
  assert.equal(M.instalacaoDaMod({ ...tatica, tipo: 'defeito', tamanho: 0 }, 0), null);
  assert.equal(M.instalacaoDaMod(null, 100), null);
});

test('C72: as modificações da wiki pelo catálogo do 14 (as de 50, 100 e 500eb) e os defeitos', () => {
  const dvs = ids => ids.map(id => { const { mod, preco } = doCatalogo(id); return M.instalacaoDaMod(mod, preco)?.dv ?? null; });
  const porPreco = eb => Object.entries(catalogo).filter(([id, item]) => id.startsWith('mods-armas:') && item.system.preco === eb).map(([id]) => id.slice('mods-armas:'.length));
  assert.ok(porPreco(50).length && porPreco(100).length && porPreco(500).length);
  assert.ok(dvs(porPreco(50)).every(dv => dv === 13));
  assert.ok(dvs(porPreco(100)).every(dv => dv === 17));
  assert.ok(dvs(porPreco(500)).every(dv => dv === 21));
  const defeitos = Object.entries(catalogo).filter(([id, item]) => id.startsWith('mods-armas:') && item.flags['cpr-fieldbook'].mod.tipo === 'defeito');
  assert.equal(defeitos.length, 6);
  assert.ok(defeitos.every(([id]) => dvs([id.slice('mods-armas:'.length)])[0] === null));
});

test('C72: o pedido de teste rola a Especialização de Upgrade com a perícia de TECH', () => {
  const upgrade = ROLAGENS_DE_ROLE.tech.find(rolagem => rolagem.id === 'upgrade');
  assert.equal(upgrade.especialidade, 'Upgrade Expertise');
  assert.equal(upgrade.atributo, 'tech');
  assert.ok(upgrade.escolherPericia);
  const teste = M.TESTE_DA_INSTALACAO;
  assert.ok(P.testeValido(teste));
  assert.equal(P.rotuloDoTeste(teste), 'Especialização de Upgrade (Tecnologia de Armas)');
  // A perícia tem de ser de TECH (a do "varying" do CORE), e a Expertise pede uma.
  assert.equal(P.testeValido({ tipo: 'role', id: 'upgrade', pericia: 'handgun' }), false);
  assert.equal(P.testeValido({ tipo: 'role', id: 'upgrade' }), false);
  assert.equal(P.testeValido({ tipo: 'role', id: 'nao-existe', pericia: 'weaponstech' }), false);
  // As rolagens que não pedem perícia valem sem ela; o Backup do Lawman não é teste (1d10 contra o Rank).
  assert.ok(P.testeValido({ tipo: 'role', id: 'impacto-carismatico' }));
  assert.equal(P.rotuloDoTeste({ tipo: 'role', id: 'impacto-carismatico' }), 'Impacto Carismático');
  assert.equal(P.testeValido({ tipo: 'role', id: 'backup' }), false);
  assert.equal(P.rotuloDoTeste({ tipo: 'role', id: 'backup' }), '');
  // Os tipos de antes continuam.
  assert.ok(P.testeValido({ tipo: 'pericia', id: 'perception' }));
  assert.equal(P.testeValido({ tipo: 'pericia', id: 'weaponstechx' }), false);
});

test('C72: a página da regra diz o teste, a tabela de DV, o tempo, a falha, o Tech NPC e quem tira', () => {
  assert.match(pagina, /Quem instala é o Tech: TECH \+ Tecnologia de Armas \+ Especialização de Upgrade \+ 1d10, contra a DV da categoria de preço da modificação\. Leva 1 hora\./);
  for (const { dv } of M.DVS_DA_INSTALACAO) assert.ok(pagina.includes(String(dv)), `a DV ${dv} na página`);
  // A tabela, sem as tags: a categoria e a DV de cada linha, juntas.
  assert.match(pagina, /Oneroso \(até 50eb\)13Premium \(100eb\)17Caro \(500eb\), e a sem preço \(a da oficina do mestre, a lendária\)21/);
  assert.match(pagina, /Na falha, a modificação não entra e não se perde/);
  assert.match(pagina, /Sem um Tech no grupo, um Tech NPC instala/);
  assert.match(pagina, /"Pedir a instalação"/);
  assert.doesNotMatch(pagina, /ainda não está decidido/);
  // Tirar (o pedido do usuário de 2026-11-25: "apenas o mestre pode tirar"): só o mestre, e ela se destrói.
  assert.match(pagina, /Só o mestre tira \(na história, o Tech\), e tirar destrói a modificação\. Ela também sai com a arma, quando a arma se vai\./);
  assert.doesNotMatch(pagina, /Só o Tech tira/);
});

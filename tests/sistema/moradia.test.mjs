// Testes de referência do C22: moradia, estilo de vida, moda e Trauma Team (o lifestyle do CORE 0.92.4 e o módulo
// cpr-2077 da mesa, pelas regras da wiki em system-rules.js, system-criacao.js e criador.js).
// Uso: node --test "tests/sistema/*.test.mjs"
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { custoMensalDeMoradia, moradiaDaMesa, moradiaDaWiki, moradiaParaAWiki } from '../../foundry-sistema/scripts/regras.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const daWiki = (arquivo, chave) => {
  const contexto = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(raiz, arquivo), 'utf8'), contexto);
  return contexto.window[chave];
};
// A tabela de moradia do criador da wiki (system-criacao.js, housing): as moradias, os estilos, o Trauma Team e as modas.
const H = daWiki('system-criacao.js', 'systemCreation').housing;
const pelo = (lista, id) => H[lista].find(item => item.id === id);

test('Moradia da wiki (moradiaDaWiki): o resultado.moradia do criador (criador.js, housing) nos quatro campos do ator, como o lifestyleUpdate do cpr-2077', () => {
  // O padrão do criador (housing.padrao.geral): o contêiner de carga e o Kibble, sem Trauma Team nem moda.
  const conteiner = pelo('moradias', H.padrao.geral.moradia);
  const kibble = pelo('estilos', H.padrao.geral.estilo);
  const padrao = moradiaDaWiki({
    tipo: conteiner.id, moradia: conteiner.nome, aluguel: conteiner.aluguel, estiloId: kibble.id, estilo: kibble.nome, custoEstilo: kibble.custo,
    traumaTeam: null, moda: null
  });
  assert.deepEqual(padrao, {
    moradia: { custo: 1000, descricao: 'Contêiner de carga' },
    estiloDeVida: { custo: 100, descricao: 'Kibble' },
    traumaTeam: { custo: 0, descricao: '' },
    moda: ''
  });

  // A quitinete, o Prepak genérico, o Trauma Team Prata e a alta moda, como o criador os monta.
  const quitinete = pelo('moradias', 'quitinete');
  const generico = pelo('estilos', 'generico');
  const prata = pelo('traumaTeam', 'prata');
  const altaModa = pelo('modas', 'alta-moda');
  const completo = moradiaDaWiki({
    moradia: quitinete.nome, aluguel: quitinete.aluguel, estilo: generico.nome, custoEstilo: generico.custo,
    traumaTeam: { id: prata.id, nome: prata.nome, custo: prata.custo }, moda: { id: altaModa.id, nome: altaModa.nome, desc: altaModa.desc }
  });
  assert.deepEqual(completo, {
    moradia: { custo: 1500, descricao: 'Quitinete' },
    estiloDeVida: { custo: 300, descricao: 'Prepak genérico' },
    traumaTeam: { custo: 500, descricao: 'Trauma Team Prata' },
    moda: 'Alta moda: Sempre na tendência do momento e nas grifes caras, sejam quais forem.'
  });

  // Vazio, nulo ou negativo: o custo não fica abaixo de 0 e os textos ficam vazios.
  assert.deepEqual(moradiaDaWiki(null), {
    moradia: { custo: 0, descricao: '' },
    estiloDeVida: { custo: 0, descricao: '' },
    traumaTeam: { custo: 0, descricao: '' },
    moda: ''
  });
  assert.equal(moradiaDaWiki({ aluguel: -50 }).moradia.custo, 0);
  assert.equal(moradiaDaWiki({ moda: '  Couro nômade  ' }).moda, 'Couro nômade');
});

test('Moradia na ficha da mesa (moradiaParaAWiki e moradiaDaMesa): o formato do cpr-2077 que a wiki mostra em "Na mesa" e a migração de volta', () => {
  const sistema = {
    moradia: { custo: 1500, descricao: 'Quitinete' },
    estiloDeVida: { custo: 300, descricao: 'Prepak genérico' },
    traumaTeam: { custo: 500, descricao: 'Trauma Team Prata' },
    moda: 'Kitsch: Uma volta ao passado, com cores fortes e moda chamativa: estilo acima de substância.'
  };
  const naMesa = moradiaParaAWiki(sistema);
  assert.deepEqual(naMesa, {
    housing: { custo: 1500, descricao: 'Quitinete' },
    lifeStyle: { custo: 300, descricao: 'Prepak genérico' },
    traumaTeam: { custo: 500, descricao: 'Trauma Team Prata' }
  });

  // Na migração da mesa, os três custos e descrições vêm de doc.mesa.moradia, e a moda vem do resultado da criação.
  const kitsch = pelo('modas', 'kitsch');
  const daCriacao = {
    moradia: 'Contêiner de carga', aluguel: 1000, estilo: 'Kibble', custoEstilo: 100,
    traumaTeam: null, moda: { id: kitsch.id, nome: kitsch.nome, desc: kitsch.desc }
  };
  assert.deepEqual(moradiaDaMesa(naMesa, daCriacao), sistema);

  // A ficha da mesa sem a moradia (a de antes do C22): vale o resultado da criação.
  assert.deepEqual(moradiaDaMesa(undefined, daCriacao), moradiaDaWiki(daCriacao));
});

test('Custo mensal (custoMensalDeMoradia): o aluguel, o estilo de vida e o Trauma Team, pagos no dia 1º (o passo 6 do criador da wiki)', () => {
  assert.equal(custoMensalDeMoradia({
    moradia: { custo: 1000, descricao: 'Contêiner de carga' },
    estiloDeVida: { custo: 100, descricao: 'Kibble' },
    traumaTeam: { custo: 0, descricao: '' }
  }), 1100);
  assert.equal(custoMensalDeMoradia({
    moradia: { custo: 2500, descricao: 'Apartamento de dois quartos' },
    estiloDeVida: { custo: 600, descricao: 'Prepak bom' },
    traumaTeam: { custo: 1000, descricao: 'Trauma Team Executivo' }
  }), 4100);
  assert.equal(custoMensalDeMoradia({}), 0);
});

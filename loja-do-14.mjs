// A loja da wiki (loja-catalogo.js) com os dados do catálogo do Foundry 14 (foundry-sistema/dados/catalogo.json): o
// preço e, das armas, o dano, a CDT, o pente, as mãos, se é à distância e se é oculta (a fase 3 da auditoria de
// 2026-11-16, decisão do usuário: "O catálogo do 14"). Os textos em português (o nome, o grupo, a descrição, as
// etiquetas) continuam os do foundry-2077/build/loja.mjs, que lê os compêndios do CORE: o catálogo do 14 corrige o que o
// CORE traz errado (a Pepper Shaker com dano 0, por exemplo), e a loja mostrava o do CORE.
// Uso: node loja-do-14.mjs (depois do foundry-2077/build/loja.mjs, e a cada build do catálogo do 14). O teste
// tests/isolados/catalogos.test.js confere que a loja e o catálogo batem.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const raiz = path.dirname(fileURLToPath(import.meta.url));
const arquivoLoja = path.join(raiz, 'loja-catalogo.js');
const CABECALHO = '// Gerado por foundry-2077/build/loja.mjs a partir dos compêndios do Foundry, com o preço e as armas do catálogo do Foundry 14 (loja-do-14.mjs). Não edite à mão.';

// O que a loja guarda de cada arma, lido do item do catálogo do 14.
export const armaDo14 = s => ({ dano: s.dano, cdt: s.cdt, pente: s.pente?.max ?? 0, maos: s.maos, distancia: Boolean(s.aDistancia), oculta: Boolean(s.ocultavel) });

// O resumo da arma ("2d6 · CDT 1 · pente 30 · 1 mão · oculta · Armas de uma Mão"): troca o dano, a CDT, o pente e as mãos.
function resumoDaArma(resumo, arma) {
  const partes = String(resumo || '').split(' · ');
  if (!partes.length) return resumo;
  partes[0] = String(arma.dano);
  return partes.map(parte => parte.replace(/^CDT \d+$/, `CDT ${arma.cdt}`).replace(/^pente \d+$/, `pente ${arma.pente}`)
    .replace(/^\d+ mãos?$/, `${arma.maos} ${arma.maos > 1 ? 'mãos' : 'mão'}`)).join(' · ');
}

export function lojaComO14(loja, catalogo) {
  const porId = new Map(Object.values(catalogo.itens).map(item => [item.flags['cpr-fieldbook'].catalogo, item]));
  const mudancas = [];
  const semPar = [];
  for (const item of loja.itens) {
    const doCatalogo = porId.get(item.id);
    if (!doCatalogo) { semPar.push(item.id); continue; }
    const preco = doCatalogo.system.preco ?? 0;
    if (item.preco !== preco) { mudancas.push(`${item.id}: preço ${item.preco} → ${preco}`); item.preco = preco; }
    if (item.arma) {
      const novo = armaDo14(doCatalogo.system);
      for (const [campo, valor] of Object.entries(novo)) {
        if (item.arma[campo] !== valor) { mudancas.push(`${item.id}: ${campo} ${item.arma[campo]} → ${valor}`); item.arma[campo] = valor; }
      }
      item.resumo = resumoDaArma(item.resumo, item.arma);
    }
  }
  return { loja, mudancas, semPar };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const texto = fs.readFileSync(arquivoLoja, 'utf8');
  const contexto = { window: {} };
  vm.runInNewContext(texto, contexto);
  const catalogo = JSON.parse(fs.readFileSync(path.join(raiz, 'foundry-sistema', 'dados', 'catalogo.json'), 'utf8'));
  const { loja, mudancas, semPar } = lojaComO14(contexto.window.shopCatalog, catalogo);
  if (semPar.length) throw new Error(`Itens da loja fora do catálogo do 14: ${semPar.join(', ')}`);
  const nl = texto.includes('\r\n') ? '\r\n' : '\n';
  fs.writeFileSync(arquivoLoja, `${CABECALHO}${nl}window.shopCatalog = ${JSON.stringify(loja)};${nl}`);
  console.log(mudancas.length ? `A loja com o catálogo do 14: ${mudancas.length} mudança(s)\n  ${mudancas.join('\n  ')}` : 'A loja já batia com o catálogo do 14.');
}

// As modificações de armas (o C68): a regra da casa da mesa, da própria wiki (system-modificacoes.js, a fonte única), com os
// ids da loja ("mods-armas:<id>"). Cada uma vira um upgrade de arma com a regra na flag "mod" (o C67: o sistema confere,
// instala nos slots de modificação e põe os efeitos no ataque; scripts/regras-modificacoes.mjs). Os defeitos entram no
// catálogo com o preço 0: não se compram (o mestre sorteia).
// Uso: chamado por build/conteudo.mjs.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { iconeNeon } from '../scripts/regras-icones.mjs';
import { validarMod } from '../scripts/regras-modificacoes.mjs';

const SISTEMA = 'cpr-fieldbook';
export const LIVRO_DAS_MODS = 'Regra da casa (Night City Fieldbook)';

export function modsDaWiki(raizDaWiki) {
  const contexto = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(raizDaWiki, 'system-modificacoes.js'), 'utf8'), contexto);
  return contexto.window.systemModificacoes;
}

export function converterMods({ raizDaWiki, slug }) {
  const wiki = modsDaWiki(raizDaWiki);
  const itens = {};
  for (const entrada of wiki.data.mods) {
    // A regra sai do vm como objeto de outro contexto: o JSON a traz para cá (e é o que fica no catálogo).
    const mod = JSON.parse(JSON.stringify(wiki.regra(entrada)));
    const invalida = validarMod(mod);
    if (invalida) throw new Error(`A modificação ${entrada.nome} não vale: ${invalida}.`);
    const id = `mods-armas:${slug(entrada.id)}`;
    if (itens[id]) throw new Error(`Duas modificações com o mesmo id: ${id}.`);
    const ocupa = mod.tamanho ? `${mod.tamanho} slot de modificação` : 'nenhum slot (dá +1)';
    itens[id] = {
      name: entrada.nome, type: 'upgrade', img: iconeNeon('upgrade'),
      system: {
        descricao: `<p><b>Modificação de arma</b> · ${wiki.grupos[entrada.grupo]} · ${ocupa} · serve em ${wiki.serveEm(entrada)} · ${wiki.preco(entrada.eb)}</p>`
          + `<p>${entrada.texto}</p><p><b>Na mesa:</b> ${entrada.mesa}</p><p>Permanente: não sai da arma; só o Tech tira, e tirar destrói.</p><p><i>${LIVRO_DAS_MODS}: Modificações de armas.</i></p>`,
        alvo: 'arma', tamanho: mod.tamanho, instaladoEm: '', modificadores: { pente: 0, ataque: 0, sdp: 0, assentos: 0 }, preco: entrada.eb, fonte: { livro: LIVRO_DAS_MODS, pagina: 0 }
      },
      effects: [],
      flags: { [SISTEMA]: { mod, catalogo: id, origem: { fonte: 'wiki', livro: LIVRO_DAS_MODS } } }
    };
  }
  return itens;
}

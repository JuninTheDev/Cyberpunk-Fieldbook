// O retrato da wiki, como foundry-2077/scripts/wiki.mjs: portraitOf, copyPortrait e applyPortrait. A imagem enviada
// entra na pasta do mundo para todos a verem; um link HTTPS sem CORS pode ficar como link direto de imagem.
// api-personagens.js, rota extra === 'retrato': a imagem enviada usa api/personagens/<id>/retrato?v=<data>.
import { garantirPasta } from './pastas.mjs';

const HTTPS = /^https:\/\/[^\s"'<>]+$/;
const CAMINHO_DA_WIKI = /^\/?api\/personagens\/[a-zA-Z0-9_-]+\/retrato(?:\?[^\s"'<>]*)?$/;
const EXTENSOES = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' };

export function retratoDaWiki(doc = {}) {
  if (typeof doc.retrato === 'string' && (CAMINHO_DA_WIKI.test(doc.retrato) || HTTPS.test(doc.retrato))) return doc.retrato;
  return HTTPS.test(doc.retratoLink || '') ? doc.retratoLink : '';
}

// Tirar a imagem na wiki não apaga a escolhida na ficha (atualizarDaWiki no módulo da mesa).
export const retratoMudou = (doc, marca = '') => Boolean(retratoDaWiki(doc)) && retratoDaWiki(doc) !== marca;

export const extensaoDoRetrato = tipo => Object.hasOwn(EXTENSOES, tipo) ? EXTENSOES[tipo] : '';
export const aceitaLinkDireto = fonte => HTTPS.test(fonte) && /\.(png|jpe?g|webp|gif|avif|svg)(\?.*)?$/i.test(fonte);

// O cookie só acompanha a imagem servida pela wiki. Links de fora não recebem credenciais do navegador.
export function requisicaoDoRetrato(fonte, enderecoWiki) {
  const base = String(enderecoWiki).replace(/\/+$/, '');
  const url = HTTPS.test(fonte) ? fonte : `${base}/${fonte.replace(/^\/+/, '')}`;
  return { url, opcoes: { cache: 'no-store', credentials: url.startsWith(`${base}/`) ? 'include' : 'omit' } };
}

const SeletorDeArquivo = () => foundry.applications.apps.FilePicker.implementation;

export async function copiarRetrato(doc, fonte, enderecoWiki) {
  const { url, opcoes } = requisicaoDoRetrato(fonte, enderecoWiki);
  const resposta = await fetch(url, opcoes);
  if (!resposta.ok) throw new Error(`a imagem respondeu ${resposta.status}`);
  const imagem = await resposta.blob();
  const extensao = extensaoDoRetrato(imagem.type);
  if (!extensao) throw new Error(`não é uma imagem (${imagem.type || 'sem tipo'})`);
  const pasta = `worlds/${game.world.id}/retratos-wiki`;
  await garantirPasta(pasta);
  // Nome novo em cada troca: os navegadores dos jogadores deixam de mostrar o retrato antigo do cache.
  const nome = `${doc.id}-${Date.now().toString(36)}.${extensao}`;
  const gravada = await SeletorDeArquivo().upload('data', pasta, new File([imagem], nome, { type: imagem.type }), {}, { notify: false });
  if (!gravada?.path) throw new Error('o Foundry não gravou a imagem');
  return gravada.path;
}

// A marca devolvida é a fonte da wiki, não a cópia local; quem importa ou atualiza a grava junto do vínculo.
export async function aplicarRetrato(ator, doc, enderecoWiki) {
  const fonte = retratoDaWiki(doc);
  if (!fonte) return { aplicado: '', notas: [] };
  let img;
  try {
    img = await copiarRetrato(doc, fonte, enderecoWiki);
  } catch (erro) {
    if (!aceitaLinkDireto(fonte)) return { aplicado: '', notas: [`Retrato: não consegui trazer a imagem (${erro.message}). Ponha à mão na ficha.`] };
    img = fonte;
  }
  try {
    // Com o token dinâmico ligado (o C45), o retrato vira a base do conjunto, e o token fica com a imagem dele.
    const { trocarBase } = await import('./token-dinamico.mjs');
    if (await trocarBase(ator, img)) await ator.update({ img });
    else {
      await ator.update({ img, 'prototypeToken.texture.src': img });
      for (const token of ator.getDependentTokens?.({ linked: true, concreteOnly: true }) || []) await token.update({ 'texture.src': img });
    }
  } catch (erro) {
    return { aplicado: '', notas: [`Retrato: o Foundry recusou a imagem (${erro.message}).`] };
  }
  return { aplicado: fonte, notas: [] };
}

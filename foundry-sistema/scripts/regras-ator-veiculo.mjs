// C46: o catálogo do C15 fornece os números do NPC, com as mesmas chaves do item. Sem Foundry.
import { tipoDoVeiculo } from './regras-veiculos.mjs';

export function dadosDoVeiculoDoCatalogo(item) {
  if (item?.type !== 'veiculo') return null;
  const s = item.system;
  return {
    name: item.name, img: item.img,
    system: {
      sdp: { value: s.sdp.value, max: s.sdp.max }, assentos: s.assentos,
      velocidade: { combate: s.velocidade.combate, narrativa: s.velocidade.narrativa },
      tipo: tipoDoVeiculo({ tipo: s.tipo, nome: item.name }), sp: s.sp ?? 0, ablacao: 0
    }
  };
}

// Mesa da wiki, master:Tabletop/README.md, seção Veículos (M17): SDP na barra e 2 quadrados.
// Como o capanga, cada token solto conserva o próprio estado; cópias preservam o protótipo explícito.
export function tokenDoVeiculo(prototipo = {}) {
  return { actorLink: false, width: 2, height: 2, ...prototipo,
    bar1: { attribute: 'sdp', ...prototipo.bar1 } };
}

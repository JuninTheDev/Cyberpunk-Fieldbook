// C46.2, decisão do usuário: o item conserva o estado; o ator ligado só o espelha. Sem Foundry.
import { somaDeUpgrades } from './regras.mjs';
import { protecoesDoVeiculo, tipoDoVeiculo, TIPOS_DE_VEICULO } from './regras-veiculos.mjs';

const inteiro = valor => Number.isFinite(Number(valor)) ? Math.max(0, Math.trunc(Number(valor))) : 0;
const fonteDoItem = item => item?._source?.system ?? item?.system ?? {};
const instalados = (item, itens) => Array.from(itens).filter(outro => outro.type === 'upgrade' && outro.system?.instaladoEm === (item.id ?? item._id));

// CORE, modules/item/mixins/cpr-upgradable.js:32-43; wiki, system-criacao.js:269 e :271: +2 assentos e +20 SDP.
// O _source evita somar de novo os upgrades que DadosVeiculo já preparou. Chassis SP13: CORE,
// babele/en/cyberpunk-red-core.core_upgrades.json:7-9; conserva-se a ablação, sem tocar nos vidros ou nas armas.
export function estadoDoItemVeiculo(item, itens = []) {
  if (item?.type !== 'veiculo') return null;
  const s = fonteDoItem(item), upgrades = instalados(item, itens);
  const max = somaDeUpgrades(inteiro(s.sdp?.max), upgrades.map(upgrade => upgrade.system.modificadores?.sdp));
  return {
    name: item.name, img: item.img,
    system: {
      sdp: { value: Math.min(inteiro(s.sdp?.value), max), max },
      assentos: somaDeUpgrades(inteiro(s.assentos), upgrades.map(upgrade => upgrade.system.modificadores?.assentos)),
      velocidade: { combate: inteiro(s.velocidade?.combate), narrativa: String(s.velocidade?.narrativa ?? '') },
      tipo: tipoDoVeiculo({ tipo: s.tipo, nome: item.name }),
      sp: Math.max(inteiro(s.sp), protecoesDoVeiculo(upgrades).sp), ablacao: inteiro(s.ablacao)
    }
  };
}

function valorEm(dados, chave) {
  if (Object.hasOwn(dados, chave)) return dados[chave];
  return chave.split('.').reduce((valor, parte) => valor?.[parte], dados);
}

// A ficha mostra máximos preparados: antes de gravar no item, tira os bônus dos upgrades. Campos derivados iguais
// não viram base persistida (retirar o Chassis deve retirar também os seus 13 SP). Notas e flags ficam no ator.
export function alteracoesDoVeiculoNoItem(item, itens = [], alteracoesAtor = {}) {
  const atual = estadoDoItemVeiculo(item, itens);
  if (!atual) return {};
  const s = fonteDoItem(item), upgrades = instalados(item, itens), mudancas = {};
  const copiar = (chave, normalizar = valor => valor) => {
    const valor = valorEm(alteracoesAtor, chave);
    if (valor !== undefined) {
      const normal = normalizar(valor);
      if (normal !== valorEm(atual, chave)) mudancas[chave] = normal;
    }
  };
  copiar('name', String); copiar('img', String);
  copiar('system.velocidade.combate', inteiro); copiar('system.velocidade.narrativa', String);
  copiar('system.ablacao', inteiro);
  const tipo = valorEm(alteracoesAtor, 'system.tipo');
  if (tipo !== undefined && Object.hasOwn(TIPOS_DE_VEICULO, tipo) && tipo !== s.tipo
    && (tipo === '' || tipo !== atual.system.tipo)) mudancas['system.tipo'] = tipo;
  const sp = valorEm(alteracoesAtor, 'system.sp');
  if (sp !== undefined) {
    const max = Math.max(inteiro(sp), protecoesDoVeiculo(upgrades).sp);
    if (max !== atual.system.sp) mudancas['system.sp'] = max;
  }
  for (const [chave, campo] of [['system.sdp.max', 'sdp'], ['system.assentos', 'assentos']]) {
    const valor = valorEm(alteracoesAtor, chave);
    if (valor === undefined || inteiro(valor) === valorEm(atual, chave)) continue;
    const bonus = upgrades.reduce((soma, upgrade) => soma + (Number(upgrade.system.modificadores?.[campo]) || 0), 0);
    mudancas[chave] = Math.max(0, inteiro(valor) - bonus);
  }
  const max = somaDeUpgrades(mudancas['system.sdp.max'] ?? inteiro(s.sdp?.max), upgrades.map(upgrade => upgrade.system.modificadores?.sdp));
  const valor = valorEm(alteracoesAtor, 'system.sdp.value');
  const limitado = Math.min(valor === undefined ? atual.system.sdp.value : inteiro(valor), max);
  if (limitado !== atual.system.sdp.value || limitado !== inteiro(s.sdp?.value)) mudancas['system.sdp.value'] = limitado;
  return mudancas;
}

// Os dois ponteiros precisam concordar com o dono do item: uma cópia do personagem não herda o ator do original.
export function vinculoVeicularValido(ator, item) {
  const dono = item?.parent ?? item?.actor;
  const vinculo = ator?.flags?.['cpr-fieldbook']?.veiculoItem;
  return Boolean(ator?.type === 'veiculo' && item?.type === 'veiculo' && ator.id && item.id && dono?.id && !ator.isToken && !dono.isToken
    && vinculo?.atorId === dono.id && vinculo?.itemId === item.id
    && item.flags?.['cpr-fieldbook']?.veiculoAtor === ator.id);
}

// Só uma ligação recíproca grava no item; o NPC ou uma ligação antiga inválida conserva o estado no ator.
export function destinoDaEscritaVeicular(ator, item) {
  return vinculoVeicularValido(ator, item) ? 'item' : 'ator';
}

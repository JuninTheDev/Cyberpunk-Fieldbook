// A régua com Andar e Correr (o C44; o drag-ruler.js do CORE 0.92.4, que pintava o caminho do token pelas faixas walk e
// run do módulo Drag Ruler). O Foundry 14 não precisa do módulo: a TokenRuler já tem o estilo de cada trecho da linha
// (_getSegmentStyle), o de cada quadrado da grade (_getGridHighlightStyle), os pontos que desenha (_shouldRenderWaypoint)
// e o rótulo (_getWaypointLabelContext). O gasto é o custo do movimento até o ponto (measurement.cost), o número que o
// rótulo mostra; no combate, ele já soma o que o token andou no turno (o histórico, que o Foundry zera a cada turno).
import { SISTEMA } from './config.mjs';
import { corridaDe, movimentoDe } from './estados.mjs';
import { corDaFaixa, faixaDoGasto, faixasDaRegua, faixasDoVeiculo, rotuloDaFaixa } from './regras-regua.mjs';

// As faixas do ator do token, com a configuração deste navegador ligada: o personagem e o capanga (Andar e Correr) e o
// veículo (o C46, parte 4: a velocidade de combate, o system.velocidade.combate do ator, que no ligado é o espelho do item).
export function faixasDoToken(token) {
  const ator = token?.actor;
  if (!ator || !['personagem', 'capanga', 'veiculo'].includes(ator.type) || !game.settings.get(SISTEMA, 'reguaAndarCorrer')) return null;
  if (ator.type === 'veiculo') return faixasDoVeiculo(ator.system.velocidade?.combate);
  return faixasDaRegua(movimentoDe(ator), corridaDe(ator));
}

const faixaDoPonto = (regua, waypoint) => {
  const faixas = faixasDoToken(regua.token);
  return faixas ? faixaDoGasto(waypoint?.measurement?.cost, faixas) : null;
};
const comACor = (estilo, faixa) => (faixa ? { ...estilo, color: corDaFaixa(faixa) } : estilo);

// "Andar", "Correr" ou "Velocidade de combate" ao lado dos metros, como a DV do C26 (regua-dv.mjs), que se registra depois
// e fica no fim.
function acrescentarFaixaNoContexto(context, faixa) {
  const rotulo = rotuloDaFaixa(faixa);
  if (!context || !rotulo) return context;
  context.faixa = faixa;
  if (context.cost) context.cost.units = context.cost.units ? `${context.cost.units} · ${rotulo}` : rotulo;
  else context.units = context.units ? `${context.units} · ${rotulo}` : rotulo;
  return context;
}

export function registrarReguaMovimento() {
  const proto = foundry.canvas?.placeables?.tokens?.TokenRuler?.prototype;
  if (!proto?._getSegmentStyle || proto._cprfFaixasOriginais) return;
  const original = proto._cprfFaixasOriginais = {
    desenhar: proto._shouldRenderWaypoint, trecho: proto._getSegmentStyle, grade: proto._getGridHighlightStyle, rotulo: proto._getWaypointLabelContext
  };
  // Na grade, o caminho tem um ponto por quadrado, e o último de cada faixa também se desenha: a linha muda de cor ali (o
  // Foundry não põe marca nem rótulo nesses pontos). Na cena sem grade, cada trecho sai na cor de onde termina.
  proto._shouldRenderWaypoint = function _shouldRenderWaypoint(waypoint) {
    if (original.desenhar.call(this, waypoint)) return true;
    return Boolean(waypoint?.next) && faixaDoPonto(this, waypoint) !== faixaDoPonto(this, waypoint.next);
  };
  proto._getSegmentStyle = function _getSegmentStyle(waypoint) {
    const estilo = original.trecho.call(this, waypoint);
    return estilo?.width > 0 ? comACor(estilo, faixaDoPonto(this, waypoint)) : estilo;
  };
  proto._getGridHighlightStyle = function _getGridHighlightStyle(waypoint, offset) {
    const estilo = original.grade.call(this, waypoint, offset);
    return (estilo?.alpha ?? 0.5) > 0 ? comACor(estilo, faixaDoPonto(this, waypoint)) : estilo;
  };
  proto._getWaypointLabelContext = function _getWaypointLabelContext(waypoint, state) {
    return acrescentarFaixaNoContexto(original.rotulo.call(this, waypoint, state), faixaDoPonto(this, waypoint));
  };
}

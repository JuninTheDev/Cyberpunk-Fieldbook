// O botão de tabela de DV no HUD do token e o rótulo da régua com a DV da distância (CORE add-dv-token-hud.js,
// HudInterface.SetDvTable e overrides.js). No Foundry 14, o botão entra no renderTokenHUD e a DV sai no
// _getWaypointLabelContext da TokenRuler (e da Ruler). A escolha fica na flag cprDvTable do TokenDocument.
import { SISTEMA } from './config.mjs';
import { TABELAS_DV } from './gerado.mjs';
import { opcoesDeTabelaDv, rotuloDvDaRegua } from './regras.mjs';

const { DialogV2 } = foundry.applications.api;
const esc = texto => foundry.utils.escapeHTML(String(texto ?? ''));

export function tabelaDvDoToken(token) {
  const doc = token?.document ?? token;
  if (!doc?.getFlag) return null;
  const flag = doc.getFlag(SISTEMA, 'cprDvTable') ?? doc.flags?.['cyberpunk-red-core']?.cprDvTable ?? null;
  if (!flag) return null;
  return typeof flag === 'string' ? flag : flag.name ?? null;
}

export async function definirTabelaDv(token, tabela) {
  const doc = token?.document ?? token;
  if (!doc) return null;
  const nome = typeof tabela === 'string' ? tabela.trim() : tabela?.name ?? '';
  if (!nome) {
    await doc.unsetFlag(SISTEMA, 'cprDvTable');
    return null;
  }
  await doc.setFlag(SISTEMA, 'cprDvTable', nome);
  return nome;
}

export async function escolherTabelaDv(token) {
  const doc = token?.document ?? token;
  if (!doc) return null;
  const atual = tabelaDvDoToken(doc) ?? '';
  const opcoes = ['', ...opcoesDeTabelaDv(TABELAS_DV)].map(nome => (
    `<option value="${esc(nome)}"${nome === atual ? ' selected' : ''}>${esc(nome || '— Nenhuma —')}</option>`
  )).join('');
  const escolha = await DialogV2.wait({
    window: { title: 'Medir DV (régua)', icon: 'fa-solid fa-bullseye' },
    classes: [SISTEMA, 'escolher-tabela-dv', 'themed', 'theme-dark'],
    position: { width: 380 },
    rejectClose: false,
    content: `<div class="form-group"><label>Tabela de DV <select name="dvTable">${opcoes}</select></label></div>`,
    buttons: [
      { action: 'salvar', label: 'Confirmar', icon: 'fa-solid fa-check', default: true, callback: (evento, botao) => ({ tabela: botao.form.elements.dvTable.value }) },
      { action: 'cancelar', label: 'Cancelar', icon: 'fa-solid fa-xmark' }
    ]
  });
  if (!escolha || typeof escolha !== 'object') return undefined;
  return definirTabelaDv(doc, escolha.tabela);
}

export function botaoDvNoHud(app, elemento) {
  const doc = app?.document ?? app?.object?.document;
  const coluna = (elemento instanceof HTMLElement ? elemento : app?.element)?.querySelector?.('.col.left');
  if (!doc || !coluna || coluna.querySelector('.dv-table-selector')) return;
  const atual = tabelaDvDoToken(doc);
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = `control-icon dv-table-selector${atual ? ' active' : ''}`;
  botao.dataset.cprfAcao = 'escolherTabelaDv';
  botao.dataset.tooltip = atual ? `Medir DV (${atual})` : 'Medir DV';
  botao.innerHTML = '<i class="fa-solid fa-bullseye"></i>';
  botao.addEventListener('click', evento => {
    evento.preventDefault();
    evento.stopPropagation();
    app.close?.();
    escolherTabelaDv(doc);
  });
  coluna.append(botao);
}

function acrescentarDvNoContexto(context, token, waypoint) {
  if (!context) return context;
  const tabela = tabelaDvDoToken(token);
  const rotulo = rotuloDvDaRegua(tabela, waypoint?.measurement?.distance, TABELAS_DV);
  if (!rotulo) return context;
  context.dv = rotulo;
  if (context.cost) context.cost.units = context.cost.units ? `${context.cost.units} · ${rotulo}` : rotulo;
  else context.units = context.units ? `${context.units} · ${rotulo}` : rotulo;
  return context;
}

export function registrarReguaDv() {
  Hooks.on('renderTokenHUD', (app, elemento) => botaoDvNoHud(app, elemento));
  const protoTokenRuler = foundry.canvas?.placeables?.tokens?.TokenRuler?.prototype;
  if (protoTokenRuler?._getWaypointLabelContext && !protoTokenRuler._cprfDvOriginal) {
    const original = protoTokenRuler._getWaypointLabelContext;
    protoTokenRuler._cprfDvOriginal = original;
    protoTokenRuler._getWaypointLabelContext = function _getWaypointLabelContext(waypoint, state) {
      return acrescentarDvNoContexto(original.call(this, waypoint, state), this.token?.document, waypoint);
    };
  }
  const protoRuler = foundry.canvas?.interaction?.Ruler?.prototype;
  if (protoRuler?._getWaypointLabelContext && !protoRuler._cprfDvOriginal) {
    const original = protoRuler._getWaypointLabelContext;
    protoRuler._cprfDvOriginal = original;
    protoRuler._getWaypointLabelContext = function _getWaypointLabelContext(waypoint, state) {
      const token = canvas?.tokens?.controlled?.find(t => tabelaDvDoToken(t)) ?? canvas?.tokens?.controlled?.[0];
      return acrescentarDvNoContexto(original.call(this, waypoint, state), token?.document, waypoint);
    };
  }
}

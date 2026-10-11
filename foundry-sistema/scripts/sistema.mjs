// Ponto de entrada do sistema Cyberpunk RED — Fieldbook (Foundry 14): registra os modelos de dados, os documentos,
// as fichas, o crítico do d10, as configurações, o combate, os turnos e a importação da wiki. A API fica em
// game.system.api (macros e testes).
import * as combate from './combate.mjs';
import { caminho, SISTEMA } from './config.mjs';
import { registrarConfiguracoes } from './configuracoes.mjs';
import {
  DadosArma, DadosArmadura, DadosCyberdeck, DadosCyberware, DadosDroga, DadosEfeito, DadosEquipamento, DadosLesao, DadosMunicao, DadosPersonagem, DadosPrograma, DadosRoupa, DadosUpgrade
} from './dados.mjs';
import { AtorCPR, ItemCPR } from './documentos.mjs';
import { FichaItem } from './ficha-item.mjs';
import { FichaPersonagem } from './ficha-personagem.mjs';
import * as lesoes from './lesoes.mjs';
import * as regras from './regras.mjs';
import { registrarCritico, rolarDano, testar } from './rolagens.mjs';
import { aoMudarTurno } from './turnos.mjs';
import * as wiki from './wiki.mjs';

Hooks.once('init', () => {
  CONFIG.Actor.documentClass = AtorCPR;
  CONFIG.Item.documentClass = ItemCPR;
  CONFIG.Actor.dataModels.personagem = DadosPersonagem;
  Object.assign(CONFIG.Item.dataModels, {
    arma: DadosArma, armadura: DadosArmadura, municao: DadosMunicao, cyberware: DadosCyberware, lesao: DadosLesao, equipamento: DadosEquipamento, roupa: DadosRoupa, droga: DadosDroga,
    cyberdeck: DadosCyberdeck, programa: DadosPrograma, upgrade: DadosUpgrade
  });
  CONFIG.ActiveEffect.dataModels.base = DadosEfeito;
  CONFIG.statusEffects.push({ id: combate.STATUS_SUPRIMIDO, name: 'Suprimido', img: caminho('icones/suprimido.svg') });
  registrarCritico();
  registrarConfiguracoes();

  const { DocumentSheetConfig } = foundry.applications.apps;
  DocumentSheetConfig.registerSheet(Actor, SISTEMA, FichaPersonagem, { types: ['personagem'], makeDefault: true, label: 'Ficha do RED' });
  DocumentSheetConfig.registerSheet(Item, SISTEMA, FichaItem, {
    types: ['arma', 'armadura', 'municao', 'cyberware', 'lesao', 'equipamento', 'roupa', 'droga', 'cyberdeck', 'programa', 'upgrade'], makeDefault: true, label: 'Item do RED'
  });

  wiki.registrarWiki();
  game.system.api = { combate, lesoes, regras, testar, rolarDano, wiki };
});

Hooks.once('ready', () => {
  combate.registrarCombate();
});

Hooks.on('updateCombat', aoMudarTurno);
Hooks.on('renderChatMessageHTML', combate.ligarBotoes);

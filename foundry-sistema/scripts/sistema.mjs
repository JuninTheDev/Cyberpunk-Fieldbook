// Ponto de entrada do sistema Cyberpunk RED — Fieldbook (Foundry 14): registra os modelos de dados, os documentos,
// as fichas, o crítico do d10, as configurações, o combate, os turnos, a NET na mesa, a importação da wiki e a migração
// dos dados. A API fica em game.system.api (macros e testes).
import * as agarrao from './agarrao.mjs';
import * as artesMarciais from './artes-marciais.mjs';
import { registrarArmasDoCyberware, sincronizarArmaMontada } from './armas-cyberware.mjs';
import * as neuroport from './neuroport.mjs';
import * as combate from './combate.mjs';
import { levarItem, pegarDoConteiner, registrarConteiner } from './conteiner.mjs';
import * as drogas from './drogas.mjs';
import { caminho, SISTEMA, STATUS_AGARRAO } from './config.mjs';
import { registrarConfiguracoes } from './configuracoes.mjs';
import {
  DadosArma, DadosArmadura, DadosArquitetura, DadosBlackIce, DadosConteiner, DadosCyberdeck, DadosCyberware, DadosDemonio, DadosDroga, DadosEfeito, DadosEquipamento, DadosLesao, DadosMunicao, DadosPersonagem, DadosPrograma,
  DadosRoupa, DadosUpgrade, DadosVeiculo
} from './dados.mjs';
import { AtorCPR, ItemCPR } from './documentos.mjs';
import { FichaCapanga } from './ficha-capanga.mjs';
import { FichaArquitetura } from './ficha-arquitetura.mjs';
import { FichaConteiner } from './ficha-conteiner.mjs';
import { FichaItem } from './ficha-item.mjs';
import { FichaBlackIce, FichaDemonio } from './ficha-net.mjs';
import { FichaPersonagem } from './ficha-personagem.mjs';
import { abrirExtrato } from './extrato.mjs';
import { registrarIceRezzado } from './ice-rezzado.mjs';
import { CombateCPR, CombatenteCPR } from './iniciativa.mjs';
import { abrirJanelaDaWiki, botaoNaAbaDeAtores } from './janela-wiki.mjs';
import * as lesoes from './lesoes.mjs';
import * as macros from './macros.mjs';
import * as migracao from './migracao.mjs';
import * as municoes from './municoes.mjs';
import { registrarNet } from './netrun/index.mjs';
import { registrarPainel } from './painel/index.mjs';
import * as regras from './regras.mjs';
import * as reguaDv from './regua-dv.mjs';
import { executarComandoRed, registrarCritico, rolarDano, testar } from './rolagens.mjs';
import * as terapia from './terapia.mjs';
import { aoMudarTurno, redesenharFichas } from './turnos.mjs';
import * as wiki from './wiki.mjs';
import { registrarAvisosDaWiki } from './wiki-avisos.mjs';

Hooks.once('init', () => {
  CONFIG.Actor.documentClass = AtorCPR;
  CONFIG.Item.documentClass = ItemCPR;
  CONFIG.Combat.documentClass = CombateCPR;
  CONFIG.Combatant.documentClass = CombatenteCPR;
  CONFIG.Actor.dataModels.personagem = DadosPersonagem;
  // O capanga (o mook do CORE) tem os dados do personagem, como no CORE (o mook e o character dividem o CommonSchema): as
  // regras e o combate são os mesmos. Mudam a ficha e o token, que fica solto (documentos.mjs).
  CONFIG.Actor.dataModels.capanga = DadosPersonagem;
  // O Black ICE e o demônio (o blackIce e o demon do CORE): os atores da NET, com a ficha curta e o token solto.
  CONFIG.Actor.dataModels.blackice = DadosBlackIce;
  CONFIG.Actor.dataModels.demonio = DadosDemonio;
  // O contêiner (o container do CORE): a loja, o saque, o esconderijo ou um personalizado, com as permissões do tipo.
  CONFIG.Actor.dataModels.conteiner = DadosConteiner;
  Object.assign(CONFIG.Item.dataModels, {
    arma: DadosArma, armadura: DadosArmadura, municao: DadosMunicao, cyberware: DadosCyberware, lesao: DadosLesao, equipamento: DadosEquipamento, roupa: DadosRoupa, droga: DadosDroga,
    cyberdeck: DadosCyberdeck, programa: DadosPrograma, upgrade: DadosUpgrade, veiculo: DadosVeiculo,
    // A arquitetura da NET (o netarch do CORE, com o NET Architect da mesa).
    arquitetura: DadosArquitetura
  });
  CONFIG.ActiveEffect.dataModels.base = DadosEfeito;
  CONFIG.statusEffects.push({ id: combate.STATUS_SUPRIMIDO, name: 'Suprimido', img: caminho('icones/suprimido.svg') });
  CONFIG.statusEffects.push({ id: combate.STATUS_COBERTURA, name: 'Em cobertura', img: 'icons/svg/shield.svg' });
  CONFIG.statusEffects.push({ id: STATUS_AGARRAO.agarrando, name: 'Agarrando', img: 'icons/svg/combat.svg' });
  CONFIG.statusEffects.push({ id: STATUS_AGARRAO.agarrado, name: 'Agarrado', img: 'icons/svg/net.svg' });
  registrarCritico();
  registrarConfiguracoes();
  // O Painel Tático (o C25): as configurações deste navegador e a tecla H; a barra monta no ready.
  registrarPainel();
  municoes.registrarMunicoes();
  drogas.registrarDrogas();

  const { DocumentSheetConfig } = foundry.applications.apps;
  DocumentSheetConfig.registerSheet(Actor, SISTEMA, FichaPersonagem, { types: ['personagem'], makeDefault: true, label: 'Ficha do RED' });
  DocumentSheetConfig.registerSheet(Actor, SISTEMA, FichaCapanga, { types: ['capanga'], makeDefault: true, label: 'Ficha de capanga do RED' });
  DocumentSheetConfig.registerSheet(Actor, SISTEMA, FichaBlackIce, { types: ['blackice'], makeDefault: true, label: 'Ficha de Black ICE do RED' });
  DocumentSheetConfig.registerSheet(Actor, SISTEMA, FichaDemonio, { types: ['demonio'], makeDefault: true, label: 'Ficha de demônio do RED' });
  DocumentSheetConfig.registerSheet(Actor, SISTEMA, FichaConteiner, { types: ['conteiner'], makeDefault: true, label: 'Ficha de contêiner do RED' });
  DocumentSheetConfig.registerSheet(Item, SISTEMA, FichaItem, {
    types: ['arma', 'armadura', 'municao', 'cyberware', 'lesao', 'equipamento', 'roupa', 'droga', 'cyberdeck', 'programa', 'upgrade', 'veiculo'], makeDefault: true, label: 'Item do RED'
  });
  DocumentSheetConfig.registerSheet(Item, SISTEMA, FichaArquitetura, { types: ['arquitetura'], makeDefault: true, label: 'Arquitetura da NET do RED' });

  wiki.registrarWiki();
  registrarAvisosDaWiki({ listar: wiki.personagensDaWiki, abrir: abrirJanelaDaWiki });
  // O Black ICE próprio do netrunner: o token que o programa ativo põe na cena (no mestre ativo).
  registrarIceRezzado();
  // A trava do contêiner: o jogador só move o token dele com a permissão "Mover o contêiner".
  registrarConteiner();
  // O cyberware e o acessório que são arma (o C11): instalados, a arma ligada a eles; tirados ou apagados, ela sai.
  registrarArmasDoCyberware();
  reguaDv.registrarReguaDv();
  game.system.api = { agarrao, artesMarciais, neuroport, combate, drogas, lesoes, macros, migracao, municoes, regras, reguaDv, terapia, testar, executarComandoRed, rolarDano, wiki, abrirJanelaDaWiki, abrirExtrato, conteiner: { levarItem, pegarDoConteiner }, armasMontadas: { sincronizarArmaMontada } };
  // A NET na mesa (o NET Architect dentro do sistema): o ponto de acesso nos Tiles, a conexão e a janela da NET.
  registrarNet();
});

Hooks.once('ready', () => {
  combate.registrarCombate();
  agarrao.registrarAgarrao();
  artesMarciais.registrarArtesMarciais();
  neuroport.registrarNeuroport();
  municoes.expirarTemporarios().catch(erro => console.error(`${SISTEMA} | munições`, erro));
  // A migração dos dados do mundo: só o mestre ativo, e só com os dados de uma versão anterior.
  migracao.conferirMigracao().catch(erro => console.error(`${SISTEMA} | migração dos dados:`, erro));
});

Hooks.on('updateCombat', aoMudarTurno);
Hooks.on('deleteCombat', redesenharFichas);
Hooks.on('renderChatMessageHTML', combate.ligarBotoes);
Hooks.on('renderActorDirectory', botaoNaAbaDeAtores);
// A barra de macros (o C20): a arma, a perícia e o item arrastados da ficha viram a macro do sistema.
Hooks.on('hotbarDrop', macros.aoSoltarNaBarra);

// Documentos do sistema: o ator (testes, Death Save, dano na ficha, instalar cyberware) e o item (ataque, dano,
// recarregar).
import { ATORES_DA_NET, caminho, EXTRATOS, SIGLA, SISTEMA, STATUS_AGARRAO } from './config.mjs';
import { roleDaWiki } from './dados.mjs';
import { escolherArmaduraMonitorada, mudarSPMonitorado, mostrarSPNoToken } from './armadura-monitorada.mjs';
import { imagemPadrao } from './imagens-padrao.mjs';
import { perguntarModificador, perguntarTeste } from './janela-rolagem.mjs';
import {
  acessorioCabe, AGARRAO, aplicarDano, artesMarciaisLiberadas, backup, BONUS_SMART, cabeNaFundacao, DANO_DE_PROGRAMA, danoDesarmado, danoNoCerebro, deLonge, FACEDOWN, formulaDeDano, HABILIDADES_DE_INTERFACE, ehCoprocessador, ehDesarmada, ehLuneta, ehReflexTuner, ehLigacaoSmart, ehTiroUnico, ficaNoMembroNatural, formaDasArtesMarciais, fundacaoDoLado, ladoEfetivo, linhaDoExtrato, nomeDoLado, LOCAIS_MIRADOS, localDaArmadura, LONGE, LUNETA, lunetaVale, novoSaldo, passouNoDeathSave,
  NUMEROS_DA_NET, ONDE_O_DANO_ENTRA, pedeFundacao, PENALIDADE_CORONHA, perfil2077, permissoesDoTipo, programaDeAtaque, REFLEX_TUNER, rezAtual, rezDepoisDoDano, ROLAGENS_DE_ROLE, sorteParaGastar, TELEOPTICS, teleopticsNoTiro,
  tipoDeTeleOptics, maosDaArma, maosLivres, ehSmartgunLink, smartgunLinkVale, perfilPelaMunicao, hpDepoisDoMaximo
} from './regras.mjs';
import { dadosDoCartao } from './dados-do-cartao.mjs';
import { rolarPerdaDeHumanidade } from './humanidade.mjs';
import { modoDaMesa } from './mesa.mjs';
import { avisarCiberpsicose, estadoMental } from './terapia.mjs';
import { rolarDano, testar } from './rolagens.mjs';
import { rolarReputacao } from './reputacao.mjs';
import { PORTA_DO_DECK } from './netrun/regras-da-net.mjs';
import * as veiculos from './veiculos.mjs';
import { ehArmaMontadaEmItem, idDaOrigem, motivoDaArmaMontada } from './armas-cyberware.mjs';
import { descarga, efeitoDaLuz, luzDoItem } from './regras-inventario.mjs';
import { dividirPilha } from './pilhas.mjs';
import { armadurasDoLocal, spComVariacao } from './regras-armadura.mjs';

// Os botões do mestre no cartão do dano da NET (net.mjs, aplicarDanoDeNet).
const ROTULOS_DA_NET = { cerebro: 'No cérebro dos alvos', programa: 'Num programa do alvo', rez: 'Na REZ do Black ICE ou demônio alvo' };
// O que o cartão do dano do Black ICE diz, pela classe.
const DANO_DO_ICE = { antipersonnel: 'no cérebro', antiprogram: 'num programa' };
const botoesDaNet = ondes => ondes.map(onde => ({ onde, rotulo: ROTULOS_DA_NET[onde] }));

// O cyberware como a regra do encaixe o lê (regras.cabeNaFundacao): o tipo, o id do catálogo, os slots e o tamanho.
export const encaixeDe = item => ({ tipo: item.system.tipo, catalogo: item.getFlag(SISTEMA, 'catalogo') ?? '', slots: item.system.slots, tamanho: item.system.tamanho });

export class AtorCPR extends Actor {
  static getDefaultArtwork(dados) {
    const img = imagemPadrao('Actor', dados.type);
    return img ? { img, texture: { src: img } } : super.getDefaultArtwork(dados);
  }
  escolherArmaduraMonitorada(local, id = '') { return escolherArmaduraMonitorada(this, local, id); }
  mostrarSPNoToken(local) { return mostrarSPNoToken(this, local); }
  modifyTokenAttribute(atributo, valor, delta = false, barra = true) {
    if (atributo.startsWith('spMonitorado.')) return mudarSPMonitorado(this, atributo, valor, delta);
    return super.modifyTokenAttribute(atributo, valor, delta, barra);
  }
  get veiculoAtivo() { return veiculos.veiculoAtivo(this); }
  usarVeiculo(id = '') { return veiculos.usarVeiculo(this, id); }
  dirigirVeiculo(dirigindo = true) { return veiculos.dirigirVeiculo(this, dirigindo); }
  get maosLivres() {
    const armas = this.items.filter(item => item.type === 'arma' && !item.system.instaladoEm).map(item => item.system);
    const escudos = this.items.filter(item => item.type === 'armadura' && item.system.escudo && item.system.equipada).length;
    return maosLivres({ armas, escudos, bonus: this.system.bonus.maos, body: this.system.atributos.body.valor });
  }
  // O canHoldWeapon do CORE: cabe no que ainda sobra das mãos do ator.
  podeEmpunhar(arma) {
    const precisa = arma.type === 'armadura' ? 1 : maosDaArma(arma.system, this.system.atributos.body.valor);
    return precisa <= this.maosLivres;
  }

  // Personagem novo: o token fica ligado à ficha, com o HP na barra. Capanga novo (o mook do CORE): o token fica solto, e
  // cada um na cena tem o próprio HP; o que já vem com o token (uma cópia, o compêndio) fica como veio. Black ICE e demônio
  // novos (o blackIce e o demon do CORE): o token solto, com a REZ na barra. O contêiner novo (o container do CORE): o
  // token solto e neutro, todos os jogadores donos (a ficha só funciona assim, como no CORE: quem pega ou compra muda o
  // contêiner) e as permissões do tipo.
  async _preCreate(dados, opcoes, usuario) {
    if ((await super._preCreate(dados, opcoes, usuario)) === false) return false;
    const token = { bar1: { attribute: 'hp' }, sight: { enabled: true },
      ...(!Object.hasOwn(dados.prototypeToken ?? {}, 'bar2') ? { bar2: { attribute: 'spMonitorado.corpo' } } : {}) };
    if (this.type === 'personagem') this.updateSource({ prototypeToken: { actorLink: true, ...token } });
    if (this.type === 'capanga' && !dados.prototypeToken) this.updateSource({ prototypeToken: { actorLink: false, ...token } });
    if (ATORES_DA_NET.includes(this.type) && !dados.prototypeToken) this.updateSource({ prototypeToken: { actorLink: false, bar1: { attribute: 'rez' } } });
    if (this.type === 'conteiner') {
      if (!dados.prototypeToken) this.updateSource({ prototypeToken: { actorLink: false, disposition: CONST.TOKEN_DISPOSITIONS.NEUTRAL } });
      if (dados.ownership?.default === undefined) this.updateSource({ ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER } });
      this.updateSource({ 'system.permissoes': permissoesDoTipo(this._source.system.tipo, this._source.system.permissoes) });
    }
  }

  // O extrato fica completo: uma mudança de Eurodólares, IP ou Reputação que não veio de mudarComExtrato (uma macro, o
  // campo mudado por fora) entra como "definir", sem motivo. No contêiner, o tipo novo liga as permissões dele (o
  // setContainerType do CORE), e o dinheiro também tem o extrato.
  async _preUpdate(mudancas, opcoes, usuario) {
    if ((await super._preUpdate(mudancas, opcoes, usuario)) === false) return false;
    // A ciberpsicose (o C21; terapia.mjs): o estado mental de antes, para o aviso quando a Humanidade ou a EMP o pioram.
    if (['personagem', 'capanga'].includes(this.type) && ['system.humanidade.value', 'system.atributos.emp.valor'].some(campo => foundry.utils.hasProperty(mudancas, campo))) {
      opcoes.cprfEstadoMental = estadoMental(this.system.humanidade.value, this.system.atributos.emp.valor);
    }
    if (['personagem', 'capanga'].includes(this.type)) this.#dentroDoMaximo(mudancas);
    const tipo = foundry.utils.getProperty(mudancas, 'system.tipo');
    if (this.type === 'conteiner' && tipo !== undefined && tipo !== this._source.system.tipo) {
      const pedidas = foundry.utils.getProperty(mudancas, 'system.permissoes') ?? {};
      foundry.utils.setProperty(mudancas, 'system.permissoes', permissoesDoTipo(tipo, { ...this._source.system.permissoes, ...pedidas }));
    }
    if (!['personagem', 'conteiner'].includes(this.type) || opcoes.cprfExtrato) return;
    for (const campo of Object.keys(EXTRATOS)) {
      const novo = foundry.utils.getProperty(mudancas, `system.${campo}`);
      if (novo === undefined || Number(novo) === this._source.system[campo]) continue;
      const linha = linhaDoExtrato({ acao: 'definir', antes: this._source.system[campo], saldo: Number(novo), usuario: usuario?.name ?? game.users.get(usuario)?.name ?? '' });
      foundry.utils.setProperty(mudancas, `system.extratos.${campo}`, [...this._source.system.extratos[campo], linha]);
    }
  }

  // O HP e a Humanidade dentro do máximo (o C31), no que se grava pelo ator (a ficha, o Painel, o Desfazer, a cura à mão):
  // o valor pedido para no máximo de depois da mudança, e o BODY ou a WILL que mudam levam junto o HP cheio
  // (regras.hpDepoisDoMaximo). O máximo de depois sai de uma cópia temporária do ator, sem token nem cena, que prepara os
  // efeitos como o original (o Grafted Muscle que soma no BODY, o Linear Frame que o fixa). A Humanidade só fica no máximo:
  // a cheia não sobe junto com a EMP (o setMaxHumanity do CORE só a leva quando a máxima desce, cpr-actor.js:1773-1788).
  #dentroDoMaximo(mudancas) {
    const mudou = chave => {
      const novo = foundry.utils.getProperty(mudancas, `system.atributos.${chave}.valor`);
      return novo !== undefined && novo !== this._source.system.atributos[chave].valor;
    };
    const hp = foundry.utils.getProperty(mudancas, 'system.hp.value');
    const humanidade = foundry.utils.getProperty(mudancas, 'system.humanidade.value');
    const mudaHp = mudou('body') || mudou('will'), mudaHumanidade = mudou('emp');
    if (hp === undefined && humanidade === undefined && !mudaHp && !mudaHumanidade) return;
    const depois = mudaHp || mudaHumanidade ? this.clone({ system: { atributos: foundry.utils.getProperty(mudancas, 'system.atributos') } }, { parent: null }).system : this.system;
    const fonte = this._source.system;
    if (hp !== undefined || mudaHp) {
      const novo = hp !== undefined ? Math.min(hp, depois.hp.max) : hpDepoisDoMaximo(fonte.hp.value, this.system.hp.max, depois.hp.max);
      if (novo !== (hp ?? fonte.hp.value)) foundry.utils.setProperty(mudancas, 'system.hp.value', novo);
    }
    if (humanidade !== undefined || mudaHumanidade) {
      const novo = Math.min(humanidade ?? fonte.humanidade.value, depois.humanidade.max);
      if (novo !== (humanidade ?? fonte.humanidade.value)) foundry.utils.setProperty(mudancas, 'system.humanidade.value', novo);
    }
  }

  // O máximo do HP que muda por um item ou um efeito (o C31: o Grafted Muscle instalado ou tirado, o Linear Frame vestido,
  // o efeito ligado ou desligado): o HP cheio vai junto, e o que passa do máximo novo para nele. O estado de antes fica nas
  // opções da operação, e só o cliente de quem mudou grava, como no aviso da ciberpsicose. Criar um item não entra: a
  // importação da mesa cria o ator antes dos itens, com o HP que ele tinha com eles.
  _preUpdateDescendantDocuments(...args) { super._preUpdateDescendantDocuments(...args); this.#hpAntesDoItem(...args.slice(-2)); }
  _onUpdateDescendantDocuments(...args) { super._onUpdateDescendantDocuments(...args); this.#hpDepoisDoItem(...args.slice(-2)); }
  _preDeleteDescendantDocuments(...args) { super._preDeleteDescendantDocuments(...args); this.#hpAntesDoItem(...args.slice(-2)); }
  _onDeleteDescendantDocuments(...args) { super._onDeleteDescendantDocuments(...args); this.#hpDepoisDoItem(...args.slice(-2)); }
  #hpAntesDoItem(opcoes, usuarioId) {
    if (usuarioId === game.user.id && ['personagem', 'capanga'].includes(this.type)) opcoes.cprfHp ??= { value: this._source.system.hp.value, max: this.system.hp.max };
  }
  #hpDepoisDoItem(opcoes, usuarioId) {
    const antes = opcoes.cprfHp;
    if (!antes || usuarioId !== game.user.id || this.system.hp.max === antes.max) return;
    const novo = hpDepoisDoMaximo(antes.value, antes.max, this.system.hp.max);
    if (novo !== this._source.system.hp.value) this.update({ 'system.hp.value': novo }).catch(erro => console.error(`${SISTEMA} | HP no máximo`, erro));
  }

  // O aviso da ciberpsicose (terapia.mjs), no cliente de quem mudou a Humanidade ou a EMP.
  _onUpdate(mudancas, opcoes, usuarioId) {
    super._onUpdate(mudancas, opcoes, usuarioId);
    if (opcoes.cprfEstadoMental && usuarioId === game.user.id) {
      Promise.resolve(avisarCiberpsicose(this, opcoes.cprfEstadoMental)).catch(erro => console.error(`${SISTEMA} | ciberpsicose`, erro));
    }
  }

  // Muda Eurodólares, IP ou Reputação com o extrato, como o ledger do CORE: somar, subtrair (sempre tira) ou definir, com
  // o motivo e quem mudou. O valor e a linha entram na mesma atualização.
  async mudarComExtrato(campo, { acao, valor, motivo = '' }) {
    if (!EXTRATOS[campo]) throw new Error(`Sem extrato: ${campo}`);
    const antes = this._source.system[campo];
    const saldo = novoSaldo(antes, acao, valor);
    const linha = linhaDoExtrato({ acao, antes, saldo, motivo, usuario: game.user.name });
    await this.update({ [`system.${campo}`]: saldo, [`system.extratos.${campo}`]: [...this._source.system.extratos[campo], linha] }, { cprfExtrato: true });
    return linha;
  }

  // Tira uma linha do extrato (só o mestre, como no CORE). Com desfazer, o saldo também volta a diferença daquela linha;
  // sem, não muda.
  apagarDoExtrato(campo, indice, { desfazer = false } = {}) {
    const linhas = this._source.system.extratos[campo];
    if (!linhas[indice]) return null;
    const mudancas = { [`system.extratos.${campo}`]: linhas.filter((outra, i) => i !== indice) };
    if (desfazer) mudancas[`system.${campo}`] = this._source.system[campo] - linhas[indice].delta;
    return this.update(mudancas, { cprfExtrato: true });
  }

  // Partes fixas que entram em todo teste: a penalidade de ferimento, a das lesões (−2 em todas as ações) e a do agarrão
  // (agarrao.mjs: agarrados, os dois têm −2 em todas as ações; a wiki, p. 177).
  #penalidade() {
    const { penalidade, ferimento, bonus } = this.system;
    const partes = penalidade ? [{ rotulo: ferimento.rotulo, valor: penalidade }] : [];
    if (bonus.todasAcoes) partes.push({ rotulo: 'Lesões', valor: bonus.todasAcoes });
    if (Object.values(STATUS_AGARRAO).some(status => this.statuses.has(status))) partes.push({ rotulo: 'Agarrão', valor: AGARRAO.penalidade });
    return partes;
  }

  // Os situacionais que a janela de rolagem oferece num teste ({ id, rotulo, valor, ligado }): os efeitos situacionais dos
  // itens em uso (na perícia ou na família dela; "todas as ações" em todo teste). O teste sem a janela usa os ligados por
  // padrão, como o CORE.
  situacionaisDoTeste(periciaId = null) {
    return this.#efeitosSituacionais(this.#chavesDoTeste(periciaId));
  }
  // As chaves dos efeitos que valem num teste: a perícia, a família dela e todas as ações.
  #chavesDoTeste(periciaId) {
    const familia = periciaId ? this.system.pericias[periciaId]?.familia : '';
    return new Set(['system.bonus.todasAcoes', ...[periciaId, familia].filter(Boolean).map(id => `system.bonus.pericias.${id}`)]);
  }
  // Os efeitos situacionais dos itens em uso que mexem nestas chaves.
  #efeitosSituacionais(chaves) {
    const lista = [];
    for (const efeito of this.allApplicableEffects()) {
      const dados = efeito.system;
      if (!dados?.situacional?.sim || efeito.disabled || dados.foraDeUso) continue;
      const valor = dados.changes.filter(mudanca => chaves.has(mudanca.key)).reduce((soma, mudanca) => soma + (Number(mudanca.value) || 0), 0);
      const origem = efeito.parent instanceof Item ? efeito.parent.name : efeito.name;
      if (valor) lista.push({ id: efeito.uuid, rotulo: `${origem}: ${dados.situacional.alvo}`, valor, ligado: dados.situacional.ligadoPorPadrao });
    }
    return lista;
  }
  // Os situacionais de um ataque: os efeitos na perícia da arma e em todas as ações (os de Role não: são de teste) e, num
  // tiro único ou mirado com arma à distância, os bônus de longe (a 51 m ou mais, wiki), ligados quando a regra vale: os
  // TeleOptics instalados que servem nesse tiro (regras.teleopticsNoTiro) e a luneta de precisão da arma, que não acumula
  // com cyberware óptico (regras.lunetaVale).
  situacionaisDoAtaque(arma, { pericia, modo, local = 'corpo', metros = null }) {
    const lista = this.#efeitosSituacionais(this.#chavesDoTeste(pericia));
    if (!arma.system.aDistancia || !ehTiroUnico(modo)) return lista;
    const mirado = Boolean(LOCAIS_MIRADOS[local]);
    const tiro = mirado ? 'tiro mirado' : 'tiro único';
    const instalados = this.items.filter(item => item.type === 'cyberware' && item.system.instalado && !item.inoperante).map(item => tipoDeTeleOptics(item.name, item.getFlag(SISTEMA, 'catalogo')));
    const teleoptics = teleopticsNoTiro(instalados, { mirado });
    for (const tipo of teleoptics) lista.push({ id: tipo, rotulo: `${TELEOPTICS[tipo].nome}: ${tiro} a ${LONGE} m ou mais`, valor: 1, ligado: deLonge(metros) });
    const luneta = arma.instalados.find(item => item.type === 'upgrade' && !item.inoperante && ehLuneta(item.name, item.getFlag(SISTEMA, 'catalogo')));
    if (luneta) {
      const bonusOptico = (mirado ? this.system.bonus.tiroMirado : this.system.bonus.tiroUnico) + (teleoptics.length && deLonge(metros) ? 1 : 0);
      lista.push({ id: luneta.uuid, rotulo: `${luneta.name}: alvo a ${LUNETA.metros} m ou mais`, valor: LUNETA.valor, ligado: lunetaVale({ metros, bonusOptico }) });
    }
    return lista;
  }
  // Os situacionais da iniciativa (o Sandevistan, ligado por padrão no CORE).
  situacionaisDaIniciativa() {
    return this.#efeitosSituacionais(new Set(['system.bonus.iniciativa']));
  }
  // As partes fixas da iniciativa (REF + 1d10, p. 168): o REF, o cyberware e a Reação de Iniciativa do Solo.
  partesDaIniciativa() {
    const { atributos, bonus, consciencia } = this.system;
    return [{ rotulo: 'REF', valor: atributos.ref.valor }, { rotulo: 'Cyberware', valor: bonus.iniciativa }, { rotulo: 'Reação de Iniciativa', valor: consciencia.iniciativa }].filter(parte => parte.valor);
  }
  // Os situacionais que entram: os escolhidos na janela ou, sem ela, os ligados por padrão.
  #situacionais(escolhidos, periciaId = null) {
    return (escolhidos ?? this.situacionaisDoTeste(periciaId).filter(s => s.ligado)).map(({ rotulo, valor }) => ({ rotulo, valor }));
  }

  // O teste, com ou sem a janela de rolagem (perguntar). A janela mostra as partes fixas e oferece os situacionais, os
  // modificadores comuns, um modificador do mestre e a Sorte; fechada ou cancelada, não rola.
  // aoAbrir: recebe a janela de rolagem quando ela abre (o pedido do mestre a fecha quando o prazo acaba).
  async #testarComJanela({ rotulo, perguntar, partes, situacionais }, { aoAbrir = null, ...opcoes } = {}) {
    if (!perguntar) return testar(this, { rotulo, partes: partes(null), ...opcoes });
    const fixas = partes([]);
    const escolha = await perguntarTeste(this, { rotulo, partes: fixas, situacionais: situacionais(), aoAbrir });
    if (!escolha) return null;
    return testar(this, { rotulo, partes: [...fixas, ...escolha.partes], sorte: escolha.sorte, ...opcoes });
  }

  // Atributo + 1d10 (p. 129).
  partesDoAtributo(chave, { situacionais = null } = {}) {
    return [{ rotulo: SIGLA[chave], valor: this.system.atributos[chave].valor }, ...this.#penalidade(), ...this.#situacionais(situacionais)];
  }
  // As rolagens avulsas (o atributo, o Facedown, a perícia, a Role, o Backup e o Death Save) saem no modo do seletor do
  // chat (mesa.modoDaMesa, o C33); os fluxos que as chamam (a droga, a terapia, o tratamento, as Artes Marciais, a
  // resistência à munição, o Death Save do turno) pedem o modo deles.
  rolarAtributo(chave, { perguntar = false, modo, ...opcoes } = {}) {
    return this.#testarComJanela({
      rotulo: SIGLA[chave], perguntar, partes: situacionais => this.partesDoAtributo(chave, { situacionais }), situacionais: () => this.situacionaisDoTeste()
    }, { ...opcoes, modo: modoDaMesa(modo) });
  }

  // Facedown (regras.FACEDOWN): COOL + Reputação + 1d10, com as penalidades e os situacionais de todas as ações, como os
  // outros testes. A wiki dá o ferimento em "todas as ações", como as lesões; o CPRFacedownRoll do CORE só põe as lesões
  // (ver as dúvidas no MIGRATION_STATUS).
  partesDoFacedown({ situacionais = null } = {}) {
    const [cool, ...resto] = this.partesDoAtributo('cool', { situacionais });
    return [cool, { rotulo: 'Reputação', valor: this.system.reputacao }, ...resto];
  }
  rolarFacedown({ perguntar = false, modo, ...opcoes } = {}) {
    return this.#testarComJanela({
      rotulo: FACEDOWN.rotulo, perguntar, partes: situacionais => this.partesDoFacedown({ situacionais }), situacionais: () => this.situacionaisDoTeste()
    }, { sabor: FACEDOWN.dica, ...opcoes, modo: modoDaMesa(modo) });
  }

  // Ser reconhecido pela fama é só 1d10 abaixo da Reputação, separado do Facedown (wiki, p. 193).
  rolarReputacao(opcoes = {}) { return rolarReputacao(this, opcoes); }

  // A Interface do Netrunner (regras.HABILIDADES_DE_INTERFACE; o CPRInterfaceRoll do CORE): o Rank de Interface + 1d10,
  // com o bônus dos programas ativos naquela habilidade, as penalidades e os situacionais de todas as ações (e os da
  // habilidade). Sem Interface (quem não é Netrunner), não rola.
  situacionaisDaInterface(id) {
    return this.#efeitosSituacionais(new Set(['system.bonus.todasAcoes', `system.bonus.interface.${id}`]));
  }
  partesDaInterface(id, { situacionais = null } = {}) {
    const { bonus, rankDeInterface } = this.system;
    const partes = [{ rotulo: 'Interface', valor: rankDeInterface }];
    if (bonus.interface[id]) partes.push({ rotulo: 'Programas', valor: bonus.interface[id] });
    const escolhidos = situacionais ?? this.situacionaisDaInterface(id).filter(s => s.ligado);
    return [...partes, ...this.#penalidade(), ...escolhidos.map(({ rotulo, valor }) => ({ rotulo, valor }))];
  }
  // extras: as partes a mais da situação (o Skunk no Slide, na NET).
  rolarInterface(id, { perguntar = false, extras = [], ...opcoes } = {}) {
    const habilidade = HABILIDADES_DE_INTERFACE.find(h => h.id === id);
    if (!habilidade || !this.system.rankDeInterface) return null;
    return this.#testarComJanela({
      rotulo: habilidade.rotulo, perguntar, partes: situacionais => [...this.partesDaInterface(id, { situacionais }), ...extras], situacionais: () => this.situacionaisDaInterface(id)
    }, { sabor: `${habilidade.custo}. ${habilidade.dica}`, ...opcoes });
  }
  // O Jack In (neuroport.mjs; a wiki, "Quickhacks no Neuroport"): Interface + 1d10 contra a WILL + 1d10 do alvo, sem o
  // bônus de programa (não é uma das habilidades), com as penalidades e os situacionais de todas as ações. O teste do
  // firewall de fábrica, antes dele, é a mesma conta (rotulo: 'Firewall de fábrica').
  rolarJackIn({ perguntar = false, rotulo = 'Jack In', ...opcoes } = {}) {
    if (!this.system.rankDeInterface) return null;
    return this.#testarComJanela({
      rotulo, perguntar, partes: situacionais => this.partesDaInterface('jackin', { situacionais }), situacionais: () => this.situacionaisDaInterface('jackin')
    }, opcoes);
  }
  // O ataque de um programa (regras.DANO_DE_PROGRAMA; o CPRInterfaceRoll "attack" do CORE): o Rank de Interface + o ATK
  // do programa + 1d10, com as penalidades e os situacionais de todas as ações, pela janela de rolagem. Só os programas de
  // ataque, num deck, de quem tem Interface.
  partesDoAtaqueDePrograma(programa, { situacionais = null } = {}) {
    const escolhidos = situacionais ?? this.situacionaisDoTeste().filter(s => s.ligado);
    return [{ rotulo: 'Interface', valor: this.system.rankDeInterface }, { rotulo: 'ATK', valor: programa.system.atk }, ...this.#penalidade(), ...escolhidos.map(({ rotulo, valor }) => ({ rotulo, valor }))];
  }
  rolarAtaqueDePrograma(programa, { perguntar = false, ...opcoes } = {}) {
    if (!programa || programa.parent !== this || programa.inoperante || !programaDeAtaque(programa.system.classe) || !programa.instaladoNo || !this.system.rankDeInterface) return null;
    return this.#testarComJanela({
      rotulo: `${programa.name}: ataque`, perguntar, partes: situacionais => this.partesDoAtaqueDePrograma(programa, { situacionais }), situacionais: () => this.situacionaisDoTeste()
    }, { sabor: 'Contra a Interface + 1d10 do netrunner ou a DEF + 1d10 do programa. O programa de ataque desativa sozinho depois de usado.', ...opcoes });
  }

  // O dano do Zap (a wiki e o CORE): 1d6 no REZ de um programa ou direto no cérebro de um netrunner, com os botões do
  // mestre para aplicar: o do netrunner também na REZ de um Black ICE ou demônio; o do demônio, só no intruso. Sem os
  // botões (botoes: false), para o motor da NET, que aplica o dano sozinho.
  async rolarDanoDoZap({ botoes = true } = {}) {
    const roll = await new Roll('1d6').evaluate();
    const content = await foundry.applications.handlebars.renderTemplate(caminho('templates/chat/dano.hbs'), {
      rotulo: 'Dano: Zap (no REZ de um programa ou no cérebro)', total: roll.total, critico: null, net: true, dados: dadosDoCartao(roll),
      botoes: botoes ? botoesDaNet(this.type === 'demonio' ? ONDE_O_DANO_ENTRA.zapDoDemonio : ONDE_O_DANO_ENTRA.zap) : []
    });
    await ChatMessage.implementation.create({ speaker: ChatMessage.implementation.getSpeaker({ actor: this }), content, rolls: [roll], flags: { [SISTEMA]: { danoDePrograma: { zap: true, total: roll.total } } } });
    return roll;
  }

  // O programa deste ator ativo (num deck) pelo id do catálogo ou pelo nome (os defensores que mudam o dano no cérebro).
  programaAtivo(id) {
    return this.items.find(item => item.type === 'programa' && item.system.ativo && item.instaladoNo && !item.inoperante
      && (item.getFlag(SISTEMA, 'catalogo') === `core_programs:${id}` || item.name.toLowerCase() === id)) ?? null;
  }
  // O dano no cérebro (regras.danoNoCerebro): direto no HP, sem a armadura nem crítico. O Shield ativo anula o primeiro
  // dano de programa que não é Black ICE (o Zap não é programa) e se desativa; o Armor ativo reduz 4.
  async receberDanoNoCerebro(dano, { dePrograma = true, deBlackIce = false } = {}) {
    const [shield, armor] = [this.programaAtivo('shield'), this.programaAtivo('armor')];
    const conta = danoNoCerebro({ dano, shield: Boolean(shield) && dePrograma && !deBlackIce, armor: Boolean(armor) });
    if (conta.shield) await shield.update({ 'system.ativo': false });
    const hpAntes = this.system.hp.value;
    if (conta.recebido) await this.update({ 'system.hp.value': hpAntes - conta.recebido });
    return { ...conta, dano, hpAntes, hpDepois: this.system.hp.value };
  }

  // O dano do Black ICE (o do efeito, da tabela da wiki; no CORE, o do programa ligado ao token), sem crítico, com os
  // botões do mestre pela classe (regras.ONDE_O_DANO_ENTRA.blackIce): o anti-pessoal no cérebro (o Shield não para Black
  // ICE), o anti-programa num programa, que desativado é destruído.
  async rolarDanoDoIce() {
    const formula = this.type === 'blackice' ? formulaDeDano(this.system.dano) : '';
    if (!formula) return null;
    if (!foundry.dice.Roll.validate(formula)) { ui.notifications.warn(`${this.name}: o dano "${formula}" não é uma rolagem.`); return null; }
    const roll = await new Roll(formula).evaluate();
    const onde = DANO_DO_ICE[this.system.classe];
    const content = await foundry.applications.handlebars.renderTemplate(caminho('templates/chat/dano.hbs'), {
      rotulo: `Dano: ${this.name}${onde ? ` (${onde})` : ''}`, total: roll.total, critico: null, net: true, dados: dadosDoCartao(roll), botoes: botoesDaNet(ONDE_O_DANO_ENTRA.blackIce[this.system.classe] ?? [])
    });
    await ChatMessage.implementation.create({
      speaker: ChatMessage.implementation.getSpeaker({ actor: this }), content, rolls: [roll],
      flags: { [SISTEMA]: { danoDePrograma: { blackIce: true, destroi: this.system.classe === 'antiprogram', total: roll.total } } }
    });
    return roll;
  }
  // O dano na REZ do Black ICE e do demônio (o _applyDamage deles no CORE): sem armadura nem crítico, até 0
  // (regras.rezDepoisDoDano). Em 0, ele é desativado.
  async receberDanoNaRez(dano) {
    if (!ATORES_DA_NET.includes(this.type)) return null;
    const antes = this.system.rez.value;
    const depois = rezDepoisDoDano(antes, dano);
    if (depois !== antes) await this.update({ 'system.rez.value': depois });
    return { dano, antes, depois, perdeu: antes - depois, desativado: depois === 0 };
  }

  // O Black ICE e o demônio rolam os números deles + 1d10 (regras.NUMEROS_DA_NET; o createStatRoll do CORE), com o crítico
  // do d10. Sem Sorte nem penalidade: a janela (perguntar) só tem o modificador do mestre, como a do CORE para eles.
  async rolarDaNet(id, { perguntar = false, ...opcoes } = {}) {
    const numero = NUMEROS_DA_NET[this.type]?.find(n => n.id === id);
    if (!numero) return null;
    const partes = [{ rotulo: numero.rotulo, valor: Number(this.system[id]) || 0 }];
    if (perguntar) {
      const escolha = await perguntarModificador({ titulo: `${this.name}: ${numero.rotulo}`, linhas: [`${numero.rotulo} ${partes[0].valor} + 1d10`] });
      if (!escolha) return null;
      if (escolha.modificador) partes.push({ rotulo: 'Modificador do mestre', valor: escolha.modificador });
    }
    return testar(this, { rotulo: numero.rotulo, partes, sabor: numero.dica, categoria: 'net', ...opcoes });
  }

  // Atributo + perícia + 1d10, com o bônus dos efeitos (cyberware, drogas), o da Role (o Moto do Nomad) e os situacionais.
  partesDaPericia(id, { situacionais = null } = {}) {
    const p = this.system.pericia(id);
    const partes = [{ rotulo: SIGLA[p.atributo], valor: this.system.atributos[p.atributo].valor }, { rotulo: p.nome, valor: p.nivel }];
    if (p.bonus) partes.push({ rotulo: 'Bônus', valor: p.bonus });
    if (p.role) partes.push({ rotulo: p.role.rotulo, valor: p.role.valor });
    // O Reflex Tuner (2077): +1 para se esquivar pelo resto da rodada em que foi atingido.
    if (id === 'evasion' && this.reflexTunerAtivo) partes.push({ rotulo: 'Reflex Tuner', valor: REFLEX_TUNER });
    return { pericia: p, partes: [...partes, ...this.#penalidade(), ...this.#situacionais(situacionais, id)] };
  }
  // extras: partes a mais, fixas (o −2 do Aperto de ferro na fuga do agarrão; artes-marciais.mjs).
  rolarPericia(id, { perguntar = false, extras = [], modo, ...opcoes } = {}) {
    return this.#testarComJanela({
      rotulo: this.system.pericia(id).nome, perguntar, partes: situacionais => [...this.partesDaPericia(id, { situacionais }).partes, ...extras], situacionais: () => this.situacionaisDoTeste(id)
    }, { ...opcoes, modo: modoDaMesa(modo) });
  }

  // As rolagens de habilidade de Role do RED (regras.ROLAGENS_DE_ROLE), como o _createRoleRoll do CORE: o Rank da
  // habilidade (na pechincha do Fixer, com COOL e Negociação), os pontos da Expertise do Tech (com TECH e a perícia
  // escolhida) ou o nível da perícia do Medtech (com TECH), as penalidades e os situacionais de todas as ações (e os da
  // perícia), com a janela de rolagem. O Backup do Lawman é outra rolagem (rolarBackup). Sem a rolagem nesta Role: null.
  // A rolagem é da Role que a tem (a principal ou a segunda, a regra da mesa): o Rank e as habilidades são os dela.
  rolagemDeRole(id) {
    return this.#roleDaRolagem(id)?.rolagem ?? null;
  }
  #roleDaRolagem(id) {
    for (const chave of ['role', 'roleSecundaria']) {
      const dados = this.system[chave];
      const role = dados.nome ? roleDaWiki(dados.nome) : null;
      const rolagem = role && ROLAGENS_DE_ROLE[role.id]?.find(entrada => entrada.id === id);
      if (rolagem) return { rolagem, role: dados };
    }
    return null;
  }
  partesDaRole(id, { situacionais = null, pericia = null } = {}) {
    const { rolagem, role } = this.#roleDaRolagem(id);
    const { atributos, periciasDeRole } = this.system;
    const valor = rolagem.especialidade ? Math.max(0, Number(role.habilidades[rolagem.especialidade]) || 0) : rolagem.derivada ? periciasDeRole[rolagem.derivada] ?? 0 : role.rank;
    const habilidade = { rotulo: rolagem.habilidade ?? rolagem.rotulo, valor };
    const periciaId = rolagem.pericia ?? (rolagem.escolherPericia ? pericia : null);
    if (!periciaId) {
      const atributo = rolagem.atributo ? [{ rotulo: SIGLA[rolagem.atributo], valor: atributos[rolagem.atributo].valor }] : [];
      return [...atributo, habilidade, ...this.#penalidade(), ...this.#situacionais(situacionais)];
    }
    // Atributo e perícia (e o bônus dela), a habilidade, as penalidades e os situacionais.
    const { partes } = this.partesDaPericia(periciaId, { situacionais });
    partes.splice(2, 0, habilidade);
    return partes;
  }
  // As Expertises do Tech rolam com a perícia que vem em pericia (o "varying" do CORE: uma do atributo da rolagem); sem
  // ela, ou com uma de outro atributo, não rolam.
  rolarRole(id, { perguntar = false, pericia = null, modo, ...opcoes } = {}) {
    const rolagem = this.rolagemDeRole(id);
    if (!rolagem) return null;
    if (rolagem.backup) return this.rolarBackup({ ...opcoes, modo });
    if (rolagem.escolherPericia && (!pericia || this.system.pericia(pericia).atributo !== rolagem.atributo)) return null;
    const periciaId = rolagem.pericia ?? (rolagem.escolherPericia ? pericia : null);
    const rotulo = rolagem.escolherPericia ? `${rolagem.rotulo} (${this.system.pericia(pericia).nome})` : rolagem.rotulo;
    return this.#testarComJanela({
      rotulo, perguntar, partes: situacionais => this.partesDaRole(id, { situacionais, pericia }), situacionais: () => this.situacionaisDoTeste(periciaId)
    }, { sabor: rolagem.dica, ...opcoes, modo: modoDaMesa(modo) });
  }

  // O Backup do Lawman (regras.backup): 1d10 contra o Rank (o do Lawman, principal ou segunda) e, vindo, o d6 das
  // rodadas.
  async rolarBackup({ falar = true, modo } = {}) {
    const rank = this.system.roles.find(role => role.id === 'lawman')?.rank ?? this.system.role.rank;
    const d10 = await new Roll('1d10').evaluate();
    const d6 = d10.total <= rank ? await new Roll('1d6').evaluate() : null;
    const resultado = { ...backup({ d10: d10.total, rank, d6: d6?.total ?? null }), d10: d10.total, d6: d6?.total ?? null, rank };
    if (falar) {
      const rolls = d6 ? [d10, d6] : [d10];
      const dados = dadosDoCartao(rolls, { critico: false, total: false });
      const content = await foundry.applications.handlebars.renderTemplate(caminho('templates/chat/backup.hbs'), { nome: this.name, ...resultado, dados });
      await ChatMessage.implementation.create({ speaker: ChatMessage.implementation.getSpeaker({ actor: this }), content, rolls, flags: { [SISTEMA]: { backup: resultado } } }, { messageMode: modoDaMesa(modo) });
    }
    return resultado;
  }

  // Death Save (p. 186): 1d10 + penalidades contra BODY, sem crítico. Passou: a próxima fica 1 mais difícil. Com a janela
  // (perguntar), o modificador do mestre (sem a Sorte: ela é só dos testes); fechada, null.
  async rolarDeathSave({ falar = true, perguntar = false, aoAbrir = null, modo } = {}) {
    const { base, penalidade, body } = this.system.deathSave;
    let modificador = 0;
    if (perguntar) {
      const linhas = [`1d10 + ${base} (lesões) + ${penalidade} (Death Saves anteriores)`, `Passa com menos que BODY ${body}; o 10 natural sempre falha`];
      const escolha = await perguntarModificador({ titulo: `Death Save de ${this.name}`, linhas, aoAbrir });
      if (!escolha) return null;
      modificador = escolha.modificador;
    }
    const soma = base + penalidade + modificador;
    const roll = await new Roll(`1d10 ${soma < 0 ? '-' : '+'} ${Math.abs(soma)}`).evaluate();
    const natural = roll.dice[0].results[0].result;
    const passou = passouNoDeathSave({ natural, total: roll.total, body });
    if (passou) await this.update({ 'system.deathSave.penalidade': penalidade + 1 });
    if (falar) {
      const mestre = modificador ? `${modificador < 0 ? '−' : '+'} ${Math.abs(modificador)}` : '';
      const content = await foundry.applications.handlebars.renderTemplate(caminho('templates/chat/death-save.hbs'), { nome: this.name, total: roll.total, body, base, penalidade, mestre, passou, natural, dados: dadosDoCartao(roll, { critico: false }) });
      await ChatMessage.implementation.create({ speaker: ChatMessage.implementation.getSpeaker({ actor: this }), content, rolls: [roll], flags: { [SISTEMA]: { deathSave: { total: roll.total, passou } } } }, { messageMode: modoDaMesa(modo) });
    }
    return { roll, total: roll.total, natural, passou };
  }

  // Estabilizou: a penalidade dos Death Saves volta a zero.
  zerarDeathSave() {
    return this.update({ 'system.deathSave.penalidade': 0 });
  }
  // O +1 à mão (o C34; o increaseDeathPenalty do CORE, cpr-actor.js:668-675): a penalidade dos Death Saves sobe 1, sem
  // rolar, como a do Death Save que passa.
  subirDeathSave() {
    return this.update({ 'system.deathSave.penalidade': this.system.deathSave.penalidade + 1 });
  }

  // Sorte (RED p. 130): os pontos preparados na ficha para o próximo teste (+1 por ponto), que saem da Sorte quando ele
  // rola (rolagens.mjs, testar). No começo da sessão, a Sorte volta ao máximo (a STAT LUCK). O Black ICE e o demônio não
  // têm Sorte.
  get sortePreparada() {
    return this.system.sorte ? sorteParaGastar(this.getFlag(SISTEMA, 'sorte'), this.system.sorte.value) : 0;
  }
  prepararSorte(pontos) {
    return this.setFlag(SISTEMA, 'sorte', sorteParaGastar(pontos, this.system.sorte.value));
  }
  // Gasta os pontos de Sorte (até a que resta) e zera os preparados.
  gastarSorte(pontos) {
    return this.update({ 'system.sorte.value': this.system.sorte.value - sorteParaGastar(pontos, this.system.sorte.value), [`flags.${SISTEMA}.sorte`]: 0 });
  }
  gastarSortePreparada() {
    return this.gastarSorte(this.sortePreparada);
  }
  recarregarSorte() {
    return this.update({ 'system.sorte.value': this.system.sorte.max, [`flags.${SISTEMA}.sorte`]: 0 });
  }

  // Cyberware instalado que as armas de 2077 procuram: a ligação da arma Smart (o Personal Link, o Neuroport ou o
  // Subdermal Grip) e o Ballistic Coprocessor (ricochete).
  #instalado(teste) {
    return this.items.some(item => item.type === 'cyberware' && item.system.instalado && !item.inoperante && teste(item.name, item.getFlag(SISTEMA, 'catalogo')));
  }
  get temLigacaoSmart() { return this.#instalado(ehLigacaoSmart); }
  get temCoprocessador() { return this.#instalado(ehCoprocessador); }
  get temReflexTuner() { return this.#instalado(ehReflexTuner); }

  // O Reflex Tuner vale nesta rodada: o ator foi atingido nela (a marca "atingido" que o ataque põe, no combate em curso).
  get reflexTunerAtivo() {
    if (!this.temReflexTuner) return false;
    const marca = this.getFlag(SISTEMA, 'atingido');
    const combate = marca && game.combats.get(marca.combate);
    return Boolean(combate?.started && combate.round === marca.rodada);
  }

  // O escudo equipado com mais pontos (que ainda segura algo), ou null.
  get escudo() {
    return this.items.filter(item => item.type === 'armadura' && item.system.equipada && item.system.escudo && item.system.pvEscudo.value > 0)
      .sort((a, b) => b.system.pvEscudo.value - a.system.pvEscudo.value)[0] ?? null;
  }

  // Aplica um dano já rolado (no cliente do mestre). Devolve o resumo para o cartão e para o "Desfazer".
  // local: "corpo", "cabeca", "perna" ou "item" (a armadura do corpo protege a perna e o item na mão).
  // escudo: o alvo se protegeu com o escudo, que leva o dano antes; só explosivo passa de um escudo destruído.
  // reducao: o que sai do dano que entra (a Deflexão de Dano do Solo).
  async receberDano({ dano, bonus = 0, local = 'corpo', ignorarPct = 0, ignorarAbaixo = 0, ablacao = 1, letal = true, escudo = false, explosivo = false, reducao = 0 }) {
    const hpAntes = this.system.hp.value;
    const resumo = { local, dano, bonus, hpAntes, ablado: 0, armaduras: [], escudoAblado: 0, armadura: null, armaduraId: null };
    const protecao = escudo ? this.escudo : null;
    if (protecao) {
      resumo.escudoAblado = Math.min(dano + bonus, protecao.system.pvEscudo.value);
      await protecao.update({ 'system.pvEscudo.value': protecao.system.pvEscudo.value - resumo.escudoAblado });
      resumo.escudo = protecao.name;
      resumo.escudoId = protecao.id;
      if (!explosivo || protecao.system.pvEscudo.value > 0) return { ...resumo, sp: 0, spEfetivo: 0, passou: false, bruto: 0, entrou: 0, recebido: 0, hpDepois: hpAntes };
    }
    const lugar = localDaArmadura(local);
    const armadura = this.system.armadura[lugar] || { sp: 0, item: null };
    const conta = aplicarDano({ dano, bonus, sp: armadura.sp, local, ignorarPct, ignorarAbaixo, reducao, letal, hpAtual: hpAntes });
    await this.update({ 'system.hp.value': hpAntes - conta.recebido });
    if (conta.ablar && ablacao) {
      resumo.armaduras = await this.ablarArmaduras(lugar, ablacao);
      const principal = resumo.armaduras.find(fonte => fonte.item === armadura.item);
      resumo.ablado = principal?.ablado ?? 0;
      resumo.armaduraId = principal?.item ?? null;
      resumo.armadura = principal ? this.items.get(principal.item)?.name : null;
    }
    // entrou: o dano que chegou ao corpo antes das reduções (o que passou da armadura e o bônus do crítico).
    return { ...resumo, ...conta, entrou: conta.bruto + bonus, sp: armadura.sp, lugar, hpDepois: this.system.hp.value };
  }

  // Desfaz um dano aplicado: o HP perdido, o SP da armadura e os pontos do escudo voltam. Pela diferença, e não pelo
  // valor de antes: o que aconteceu com o ator depois (outro ataque, uma cura) continua valendo. O HP não passa do máximo
  // (o _reverseDamage do CORE, cpr-actor.js:1544-1556; aqui, o _preUpdate).
  async desfazerDano({ perdeu = 0, armaduraId, lugar, ablado = 0, armaduras = null, escudoId, escudoAblado = 0 }) {
    if (perdeu) await this.update({ 'system.hp.value': this.system.hp.value + perdeu });
    // O cartão antigo tem uma só fonte. O novo guarda cada ID e quanto de SP realmente perdeu, inclusive no zero.
    const fontes = armaduras ?? (armaduraId && ablado ? [{ item: armaduraId, ablado }] : []);
    const mudancas = fontes.flatMap(fonte => {
      const item = this.items.get(fonte.item), sp = item?.system.sp?.[lugar];
      return sp ? [{ _id: item.id, [`system.sp.${lugar}.value`]: spComVariacao(sp, fonte.ablado) }] : [];
    });
    if (mudancas.length) await this.updateEmbeddedDocuments('Item', mudancas);
    const escudo = escudoId && this.items.get(escudoId);
    if (escudo && escudoAblado) await escudo.update({ 'system.pvEscudo.value': escudo.system.pvEscudo.value + escudoAblado });
  }

  // CORE _ablateArmor: todas as armaduras vestidas do local, não só a de maior SP. O escudo tem sua própria trilha.
  async ablarArmaduras(local, quantidade = 1) {
    if (!this.isOwner || !Number.isSafeInteger(quantidade) || quantidade < 1 || (this.type === 'conteiner' && !game.user.isGM && !this.system.permissoes.mudar)) return [];
    const fontes = armadurasDoLocal(this.items, local).map(item => ({ item: item.id,
      ablado: item.system.sp[local].value - spComVariacao(item.system.sp[local], -quantidade) })).filter(fonte => fonte.ablado > 0);
    if (fontes.length) await this.updateEmbeddedDocuments('Item', fontes.map(fonte => ({ _id: fonte.item,
      [`system.sp.${local}.value`]: this.items.get(fonte.item).system.sp[local].value - fonte.ablado })));
    return fontes;
  }

  // Instala um cyberware: a Humanidade cai pela perda rolada (ou pela média, para quem prefere) e o efeito passa a valer. A
  // Humanidade pode ficar negativa, como no CORE (loseHumanityValue): é a ciberpsicose extrema da wiki (o C21).
  // A opção entra na fundação escolhida (instaladoEm), se ainda cabe, ou na primeira instalada em que cabe; sem nenhuma,
  // entra sem fundação, com o recado (a ficha marca; a fashionware e o cyberware interno e externo não pedem uma).
  async instalarCyberware(item, { rolar = true } = {}) {
    if (item.system.instalado) return null;
    const fundacao = item.system.fundacional ? null : this.fundacaoPara(item);
    const { formula, media } = item.system.perdaHumanidade;
    let perda = media;
    if (rolar && formula && formula !== '0') {
      const roll = await new Roll(formula).evaluate();
      perda = roll.total;
      await roll.toMessage({ speaker: ChatMessage.implementation.getSpeaker({ actor: this }), flavor: `Perda de Humanidade: ${item.name}` });
    }
    // A perda sai da Humanidade de antes da peça, como no CORE: instalada, a peça já baixa a máxima em 2, e a atual lida
    // depois já vem limitada à máxima nova (o C31; dados.mjs). Descontar dela tiraria os 2 a mais.
    const maxAntes = this.system.humanidade.max;
    await item.update({ 'system.instalado': true, 'system.perdaHumanidade.sofrida': perda, 'system.instaladoEm': fundacao?.id ?? '' });
    await this.update({ 'system.humanidade.value': Math.min(this._source.system.humanidade.value, maxAntes) - perda });
    // A peça única sem fundação do lado fica no membro natural (o C30): o recado diz onde.
    if (!fundacao && item.noMembroNatural) ui.notifications.info(`${item.name} ficou no membro natural (${nomeDoLado(item.ladoDoCyberware).toLowerCase()}).`);
    else if (!fundacao && !item.system.fundacional && pedeFundacao(encaixeDe(item))) ui.notifications.info(`${item.name} entrou sem fundação: nenhuma instalada tem o encaixe e o slot livre.`);
    return perda;
  }

  // As fundações instaladas (deste ator) em que a opção cabe (regras.cabeNaFundacao, sem contar a própria opção nos
  // slots): a ficha da opção e o "+ Opção" escolhem por elas.
  fundacoesPara(item) {
    const cabe = fundacao => cabeNaFundacao({ fundacao: encaixeDe(fundacao), opcao: encaixeDe(item), usados: fundacao.instalados.filter(outro => outro.id !== item.id).reduce((soma, outro) => soma + outro.system.tamanho, 0) }).cabe;
    return this.items.filter(outro => outro.type === 'cyberware' && outro.system.fundacional && outro.system.instalado && outro.id !== item.id && cabe(outro));
  }
  // A fundação onde a opção entra ao instalar: a que ela já aponta, se ainda cabe; senão, a do lado dela (o C30: a opção com
  // lado não vai para a fundação do outro lado; a sem lado, para qualquer uma).
  fundacaoPara(item) {
    const fundacoes = this.fundacoesPara(item);
    const opcao = { lado: item.system.lado, tipo: item.system.tipo };
    const doLado = fundacoes.filter(fundacao => fundacaoDoLado(opcao, { lado: fundacao.ladoDoCyberware, tipo: fundacao.system.tipo }));
    return fundacoes.find(fundacao => fundacao.id === item.system.instaladoEm) ?? doLado.find(fundacao => fundacao.ladoDoCyberware) ?? doLado[0] ?? null;
  }
  // As opções deste ator que cabem na fundação e ainda não estão nela (o "+ Opção" da aba Cyberware).
  opcoesPara(fundacao) {
    return this.items.filter(item => item.type === 'cyberware' && !item.system.fundacional && item.system.instaladoEm !== fundacao.id && this.fundacoesPara(item).includes(fundacao));
  }
  // "+ Opção": a opção vai na fundação; a que ainda não está instalada se instala nela (com a perda de Humanidade).
  async instalarOpcao(opcao, fundacao, { rolar = true } = {}) {
    if (!this.fundacoesPara(opcao).includes(fundacao)) return null;
    await opcao.update({ 'system.instaladoEm': fundacao.id });
    return opcao.system.instalado ? true : this.instalarCyberware(opcao, { rolar });
  }

  // Tirar o cyberware não devolve a Humanidade perdida: o máximo volta a subir sozinho (a peça deixa de contar), e a
  // Humanidade só volta com terapia. Fontes: a wiki ("Humanidade, terapia e drogas": não dá para recuperar toda a
  // Humanidade sem tirar cyberware, porque cada peça reduz o máximo) e o CORE (uninstallCyberware só recalcula o máximo).
  // A fundação que sai deixa as opções dela instaladas, sem fundação (com o recado).
  async desinstalarCyberware(item) {
    if (!item.system.instalado) return;
    const opcoes = item.instalados;
    await item.update({ 'system.instalado': false, 'system.perdaHumanidade.sofrida': 0, 'system.instaladoEm': '' });
    if (!opcoes.length) return;
    await this.updateEmbeddedDocuments('Item', opcoes.map(opcao => ({ _id: opcao.id, 'system.instaladoEm': '' })));
    ui.notifications.info(`${item.name} saiu: ${opcoes.map(opcao => opcao.name).join(', ')} ${opcoes.length === 1 ? 'ficou' : 'ficaram'} sem fundação.`);
  }
}

export class ItemCPR extends Item {
  static getDefaultArtwork(dados) {
    const img = imagemPadrao('Item', dados.type);
    return img ? { img } : super.getDefaultArtwork(dados);
  }
  dividirPilha(quantidade) { return dividirPilha(this, quantidade); }

  async _preCreate(dados, opcoes, usuario) {
    if ((await super._preCreate(dados, opcoes, usuario)) === false) return false;
    if (this.type === 'arma' && this.system.instaladoEm) this.updateSource({ 'system.equipada': false });
  }
  // O EMP não desinstala nem guarda o item. A fundação parada leva suas opções; os estados originais ficam intactos.
  get inoperante() {
    const pendentes = [this], vistos = new Set();
    while (pendentes.length) {
      const item = pendentes.pop();
      if (!item || vistos.has(item.id)) continue;
      vistos.add(item.id);
      if (item.getFlag(SISTEMA, 'emp')) return true;
      pendentes.push(item.actor?.items.get(item.system.instaladoEm));
      if (item.type === 'cyberdeck' && item.getFlag(SISTEMA, 'naPorta')) {
        pendentes.push(...(item.actor?.items.filter(porta => porta.type === 'cyberware' && porta.system.instalado
          && (porta.getFlag(SISTEMA, 'catalogo') === PORTA_DO_DECK || porta.name === 'Neuroport Cyberdeck Port')) ?? []));
      }
    }
    return false;
  }
  // A nova equipagem passa pela mesma conferência na ficha do personagem, na do item e no drop do capanga.
  // Guardar e editar uma arma já equipada continuam possíveis, inclusive num estado antigo com excesso de armas.
  async _preUpdate(mudancas, opcoes, usuario) {
    if ((await super._preUpdate(mudancas, opcoes, usuario)) === false) return false;
    const sistema = { ...this.system, ...mudancas.system };
    // O acessório que entra numa arma (o C11, parte 4): os slots dela e um carregador por vez. A montagem que vem da wiki
    // (a importação e a migração da mesa) preserva o estado recebido, como a equipagem (o C12).
    const destino = foundry.utils.getProperty(mudancas, 'system.instaladoEm');
    if (this.type === 'upgrade' && destino && destino !== this.system.instaladoEm && this.actor && !opcoes.montagemDaWiki) {
      const arma = this.actor.items.get(destino);
      if (arma?.type === 'arma') {
        const outros = arma.instalados.filter(item => item.id !== this.id);
        const { cabe, motivo } = acessorioCabe({
          slots: arma.system.slots, usados: outros.reduce((soma, item) => soma + (Number(item.system.tamanho) || 0), 0), tamanho: Number(sistema.tamanho) || 0,
          carregador: Boolean(sistema.modificadores?.pente), temCarregador: outros.some(item => item.type === 'upgrade' && item.system.modificadores.pente)
        });
        if (!cabe) {
          ui.notifications.warn(`${this.name} não cabe em ${arma.name}: ${motivo}.`);
          return false;
        }
      }
    }
    if (this.type === 'arma' && sistema.instaladoEm && this.actor) {
      if (mudancas.system?.instaladoEm && this.actor.items.get(sistema.instaladoEm)?.type !== 'veiculo') {
        ui.notifications.warn('Monte a arma num veículo deste personagem.');
        return false;
      }
      // A arma montada não vai para as mãos, mesmo se uma macro tentar equipá-la.
      if (sistema.equipada) foundry.utils.setProperty(mudancas, 'system.equipada', false);
      return;
    }
    if (!(this.type === 'arma' || (this.type === 'armadura' && sistema.escudo)) || !this.actor || this.system.equipada || mudancas.system?.equipada !== true) return;
    const arma = { type: this.type, system: sistema };
    if (!this.actor.podeEmpunhar(arma)) {
      ui.notifications.warn(`${this.actor.name} não tem mãos livres para equipar ${this.name}.`);
      mudancas.system.equipada = false;
    }
  }

  // Cyberdeck, arma, veículo e a fundação do cyberware: os itens instalados neles (programas, hardware, acessórios,
  // upgrades, as opções do cyberware, no mesmo ator) e os slots que ocupam.
  get instalados() {
    const recebe = ['cyberdeck', 'arma', 'veiculo'].includes(this.type) || (this.type === 'cyberware' && this.system.fundacional);
    return recebe ? this.actor?.items.filter(item => item.system.instaladoEm === this.id) ?? [] : [];
  }

  get slotsUsados() {
    return this.instalados.reduce((soma, item) => soma + (Number(item.system.tamanho) || 0), 0);
  }

  // A REZ atual do programa (regras.rezAtual); null nos outros itens.
  get rezAtual() {
    return this.type === 'programa' ? rezAtual(this.system.rez, this.system.rezPerdida) : null;
  }
  // O programa perde REZ no combate da NET; em 0, desativa (a wiki: "em 0 ele fica desativado").
  perderRez(quanto = 1) {
    if (this.type !== 'programa' || !this.system.rez) return null;
    const perdida = Math.min(this.system.rez, this.system.rezPerdida + Math.max(0, Math.trunc(Number(quanto) || 0)));
    return this.update({ 'system.rezPerdida': perdida, ...(rezAtual(this.system.rez, perdida) === 0 ? { 'system.ativo': false } : {}) });
  }
  restaurarRez() {
    return this.type === 'programa' ? this.update({ 'system.rezPerdida': 0 }) : null;
  }
  // "Rolar Humanidade" no cyberware (as maquetes do usuário): a perda rolada sem instalar, num cartão com o "Aplicar" do
  // mestre (humanidade.mjs), no modo do seletor do chat (o C33).
  rolarHumanidade({ modo } = {}) {
    return rolarPerdaDeHumanidade(this, { modo: modoDaMesa(modo) });
  }
  // "Usar" o equipamento ligado à mão (as maquetes do usuário): liga os efeitos dele, ou desliga, se algum está ligado.
  // No equipamento de ativação à mão, o efeito vale pelo liga e desliga, e não pelo uso (dados.mjs). Os outros: null.
  get usavelAMao() {
    return this.type === 'equipamento' && this.system.ativacao === 'manual' && (this.effects.size > 0 || Boolean(this.luz));
  }
  get luz() { return luzDoItem({ name: this.name, type: this.type, catalogo: this.getFlag(SISTEMA, 'catalogo') }); }
  get emUso() {
    return this.usavelAMao && this.effects.some(efeito => efeito.active);
  }
  async usar() {
    if (!this.usavelAMao || this.inoperante) return null;
    const desligar = this.emUso;
    const luz = this.luz;
    if (!desligar && luz?.descartavel) {
      if (this.system.quantidade < 1) { ui.notifications.warn(`${this.name}: sem unidades.`); return null; }
      await this.update({ 'system.quantidade': this.system.quantidade - 1 });
    }
    // As lanternas anteriores ao C16 não tinham efeito: o build descartava a chave ATL do CORE.
    if (luz && !this.effects.size) await this.createEmbeddedDocuments('ActiveEffect', [efeitoDaLuz(this.name, luz.alcance)]);
    return this.updateEmbeddedDocuments('ActiveEffect', this.effects.map(efeito => ({ _id: efeito.id, disabled: desligar,
      ...(!desligar && luz?.segundos ? { duration: { value: luz.segundos, units: 'seconds' }, start: { time: game.time.worldTime } } : {}) })));
  }
  // "Consertar" a armadura (as maquetes do usuário): o SP de cada local volta ao máximo, e o chat diz que o personagem a
  // consertou. A wiki só diz que a armadura perde o SP "até ser reparada" (p. 186), sem o teste, o custo ou o tempo: o
  // mestre narra o conserto (a decisão do usuário de 2026-10-16). Inteira, só avisa.
  async consertar() {
    if (this.type !== 'armadura' || !this.isOwner || (this.actor?.type === 'conteiner' && !game.user.isGM && !this.actor.system.permissoes.mudar)) return null;
    const locais = ['cabeca', 'corpo'].filter(local => this.system.sp[local].max && this.system.sp[local].value < this.system.sp[local].max);
    if (!locais.length) {
      ui.notifications.info(`${this.name} já está inteira.`);
      return null;
    }
    const mudancas = locais.map(local => ({ local, antes: this.system.sp[local].value, depois: this.system.sp[local].max }));
    await this.update(Object.fromEntries(mudancas.map(m => [`system.sp.${m.local}.value`, m.depois])));
    const nome = foundry.utils.escapeHTML(this.actor?.name ?? 'Alguém');
    const partes = mudancas.map(m => `o SP ${m.local === 'cabeca' ? 'da cabeça' : 'do corpo'} volta de ${m.antes} para ${m.depois}`).join(', e ');
    return ChatMessage.implementation.create({
      speaker: ChatMessage.implementation.getSpeaker({ actor: this.actor }),
      content: `<div class="${SISTEMA} cartao conserto"><p><b>${nome}</b> consertou ${foundry.utils.escapeHTML(this.name)}: ${partes}.</p></div>`,
      flags: { [SISTEMA]: { conserto: { item: this.uuid, mudancas } } }
    });
  }
  // O dano de um programa de ataque (regras.DANO_DE_PROGRAMA): a fórmula contra o que ele pode atingir, sem crítico (na
  // NET não há, como no CORE). O cartão diz onde o dano entra.
  async rolarDanoDePrograma(contra = 'padrao', { falar = true } = {}) {
    const alvo = DANO_DE_PROGRAMA[this.system.classe]?.find(dano => dano.id === contra);
    const formula = alvo && formulaDeDano(this.system.dano[contra]);
    if (!formula) return null;
    const roll = await new Roll(formula).evaluate();
    const resultado = { roll, total: roll.total, contra, formula };
    if (falar) {
      const content = await foundry.applications.handlebars.renderTemplate(caminho('templates/chat/dano.hbs'), {
        rotulo: `Dano: ${this.name} (${alvo.rotulo})`, total: roll.total, critico: null, net: true, dados: dadosDoCartao(roll), botoes: botoesDaNet(ONDE_O_DANO_ENTRA[this.system.classe]?.[contra] ?? [])
      });
      resultado.mensagem = await ChatMessage.implementation.create({
        speaker: ChatMessage.implementation.getSpeaker({ actor: this.actor }), content, rolls: [roll], flags: { [SISTEMA]: { danoDePrograma: { programa: this.uuid, contra, total: roll.total } } }
      });
    }
    return resultado;
  }

  // O item (do mesmo ator) onde este está instalado, ou null: o deck de um programa, a arma de um acessório, o veículo da
  // arma montada, o cyberware ou o acessório da arma deles.
  get instaladoNo() {
    const id = this.system.instaladoEm;
    const item = (id && this.actor?.items.get(id)) || null;
    if (this.type !== 'arma') return item;
    return item?.type === 'veiculo' || (['cyberware', 'upgrade'].includes(item?.type) && idDaOrigem(this) === item.id) ? item : null;
  }
  // Por que a arma montada (no veículo, no cyberware ou no acessório) não ataca nem recarrega agora ('' se pode).
  motivoVeicular(modo) { return ehArmaMontadaEmItem(this) ? motivoDaArmaMontada(this) : veiculos.motivoVeicular(this, modo); }
  prepararArmaVeicular() { return veiculos.prepararArma(this); }
  adicionarJanela(nome) { return veiculos.adicionarJanela(this, nome); }
  removerJanela(id) { return veiculos.removerJanela(this, id); }
  ajustarVidros() { return veiculos.ajustarVidros(this); }
  receberDanoNoVidro(dados) { return veiculos.receberDanoNoVidro(this, dados); }
  desfazerDanoNoVidro(dados) { return veiculos.desfazerDanoNoVidro(this, dados); }
  receberDanoVeicular(dados) { return veiculos.receberDanoVeicular(this, dados); }
  desfazerDanoVeicular(dados) { return veiculos.desfazerDanoVeicular(this, dados); }
  // O cyberware instalado que pede uma fundação (regras.pedeFundacao) e está sem nenhuma: a ficha marca.
  get semFundacao() {
    const s = this.system;
    return this.type === 'cyberware' && s.instalado && !s.fundacional && !this.instaladoNo && pedeFundacao(encaixeDe(this)) && !this.noMembroNatural;
  }
  // A peça única instalada, com lado e sem fundação do mesmo tipo naquele lado, fica no membro natural (o C30, parte 2;
  // regras.ficaNoMembroNatural). Uma por membro: a primeira (na ordem dos itens) fica; as outras pedem uma fundação.
  get noMembroNatural() {
    const s = this.system;
    if (this.type !== 'cyberware' || s.fundacional || !s.instalado || this.instaladoNo || !this.actor) return false;
    const ladosComFundacao = this.actor.items.filter(outro => outro.type === 'cyberware' && outro.system.fundacional && outro.system.instalado && outro.system.tipo === s.tipo).map(outro => outro.ladoDoCyberware);
    const fica = item => item.type === 'cyberware' && !item.system.fundacional && item.system.instalado && !item.instaladoNo && ficaNoMembroNatural({ ...encaixeDe(item), lado: item.system.lado }, ladosComFundacao);
    return fica(this) && this.actor.items.find(outro => fica(outro) && outro.system.tipo === s.tipo && outro.system.lado === s.lado) === this;
  }
  // O lado do cyberware (o C30): o da fundação para a opção instalada nela; o próprio para a fundação e a peça solta.
  get ladoDoCyberware() {
    if (this.type !== 'cyberware') return '';
    const pai = this.instaladoNo;
    const fundacao = !this.system.fundacional && pai?.type === 'cyberware' && pai.system.fundacional ? { lado: pai.system.lado, tipo: pai.system.tipo } : null;
    return ladoEfetivo({ lado: this.system.lado, tipo: this.system.tipo, fundacao });
  }

  // A classe de 2077 da arma (Power, Tech, Smart) e o que ela pode fazer (regras.mjs, perfil2077), ou null.
  get perfil2077() {
    return this.type === 'arma' ? perfil2077(this.getFlag(SISTEMA, 'arma2077'), this.system) : null;
  }

  // A coronha retrátil está recolhida agora? (a flag coronhaRecolhida, que o botão da ficha troca)
  get coronhaRecolhida() {
    return Boolean(this.perfil2077?.coronhaRetratil && this.getFlag(SISTEMA, 'coronhaRecolhida'));
  }

  // A munição no pente (um item de munição do mesmo ator), ou null.
  get municaoCarregada() {
    return this.type === 'arma' && this.system.carregada ? this.actor?.items.get(this.system.carregada) ?? null : null;
  }

  // O dano da arma: o do item ou, na Briga e nas Artes Marciais com o "Dano pelo BODY" ligado (o padrão, como o CORE),
  // o da tabela do BODY do dono (o C10; regras.danoDesarmado). O cyberbraço que conta é a fundação instalada. Com a munição
  // que muda a arma (perfilPelaMunicao: o C11, parte 2b), o dela.
  get danoDaArma() {
    const s = this.system;
    const pelaMunicao = this.perfilPelaMunicao;
    if (pelaMunicao) return pelaMunicao.dano;
    const body = this.actor?.system.atributos?.body?.valor;
    if (this.type !== 'arma' || !ehDesarmada(s.tipo) || !s.danoPeloBody || body === undefined) return s.dano;
    const cyberbraco = this.actor.items.some(item => item.type === 'cyberware' && item.system.instalado && item.system.fundacional && item.system.tipo === 'cyberArm');
    return danoDesarmado({ body, tipo: s.tipo, cyberbraco });
  }
  // A perícia com que a arma ataca: a dela ou, na arma de Artes Marciais da família toda, a forma do dono (o C10).
  get periciaDaArma() {
    return this.type === 'arma' ? formaDasArtesMarciais(this.system.pericia, this.actor?.system.pericias) : '';
  }
  // Por que a arma não ataca agora, ou '': as Artes Marciais pedem pelo menos 1 ponto numa forma (o C10).
  get motivoSemAtaque() {
    const ator = this.actor;
    if (this.type !== 'arma' || this.system.tipo !== 'martialArts' || !ator?.system.pericia) return '';
    return artesMarciaisLiberadas(ator.system.pericia(this.periciaDaArma).nivel) ? '' : 'as Artes Marciais pedem pelo menos 1 ponto numa forma (Aikido, Judô, Karatê ou Taekwondo).';
  }
  // O catálogo do cyberware ou do acessório de onde vem a arma (o C11), ou ''.
  get origemDaArma() {
    return ehArmaMontadaEmItem(this) ? this.instaladoNo?.getFlag(SISTEMA, 'catalogo') ?? '' : '';
  }
  // A arma pela munição no pente (o C11, parte 2b: o Projectile Launch System com granada é lança-granadas), ou null.
  get perfilPelaMunicao() {
    return this.type === 'arma' ? perfilPelaMunicao(this.origemDaArma, this.municaoCarregada?.system.tipo) : null;
  }
  // A tabela de DV da arma: a dela ou a da munição no pente (perfilPelaMunicao).
  get tabelaDaArma() {
    return this.perfilPelaMunicao?.tabelaDV ?? this.system.tabelaDV;
  }

  // Atributo + perícia + bônus da arma + 1d10 (p. 172–176): REF para tiro, DEX para corpo a corpo. Autofogo, fogo
  // supressivo e a rajada Tech usam a perícia Autofogo. As lesões tiram dos tiros (olho) ou do corpo a corpo (músculo).
  // A arma Smart de 2077 (o Kit) dá +1 nos ataques à distância. As Artes Marciais usam a forma do dono (periciaDaArma).
  // pericia: a de um golpe das Artes Marciais (a forma do movimento; artes-marciais.mjs), no lugar da da arma.
  partesDoAtaque(modo = null, { pericia: periciaDoGolpe = null } = {}) {
    const ator = this.actor;
    const atributo = this.system.aDistancia ? 'ref' : 'dex';
    const pericia = ['autofogo', 'supressivo'].includes(modo) ? 'autofire' : periciaDoGolpe ?? this.periciaDaArma;
    const { pericia: p, partes } = ator.partesDaPericia(pericia, { situacionais: [] });
    partes[0] = { rotulo: SIGLA[atributo], valor: ator.system.atributos[atributo].valor };
    if (this.system.bonusAtaque) partes.splice(2, 0, { rotulo: 'Arma', valor: this.system.bonusAtaque });
    if (this.system.aDistancia && this.perfil2077?.smart) partes.push({ rotulo: 'Arma Smart', valor: BONUS_SMART });
    const daLesao = this.system.aDistancia ? ator.system.bonus.distancia : ator.system.bonus.corpoACorpo;
    if (daLesao) partes.push({ rotulo: 'Lesões', valor: daLesao });
    if (ator.system.consciencia.ataque) partes.push({ rotulo: 'Ataque de Precisão', valor: ator.system.consciencia.ataque });
    // A coronha retrátil recolhida (a Dian, de 2077): dá para esconder a arma, mas o ataque leva −1 até estender.
    if (this.coronhaRecolhida) partes.push({ rotulo: 'Coronha recolhida', valor: PENALIDADE_CORONHA });
    // Acessórios com bônus de ataque (o Smartgun Link: só à distância e com os plugs de interface ou o plug subdérmico, o C11,
    // parte 4). O mesmo acessório duas vezes não faz nada (wiki).
    const vale = item => !ehSmartgunLink(item.name, item.getFlag(SISTEMA, 'catalogo')) || smartgunLinkVale({ aDistancia: this.system.aDistancia, ligado: ator.temLigacaoSmart });
    const comBonus = new Map(this.instalados.filter(item => item.type === 'upgrade' && !item.inoperante && item.system.modificadores.ataque && vale(item)).map(item => [item.name, item.system.modificadores.ataque]));
    for (const [rotulo, valor] of comBonus) partes.push({ rotulo, valor });
    return { pericia: p, partes };
  }

  // Ataque: o fluxo de ataque, defesa e dano fica em combate.mjs (registrado no init).
  atacar(opcoes = {}) {
    return game.system.api.combate.atacar(this, opcoes);
  }

  // O dano rolado à parte, pela ficha: o cartão tem os botões do mestre (aplicar nos alvos marcados, rolar a lesão), no
  // modo do seletor do chat (o C33). O dano do fluxo do ataque não passa por aqui (combate/socket.mjs).
  rolarDano(opcoes = {}) {
    return rolarDano(this, { falar: true, paraAplicar: true, ...opcoes, modo: modoDaMesa(opcoes.modo) });
  }

  // A munição que entra nesta arma: o tipo dela e, na que só aceita a Smart melhorada (a Zhuo), só essa; com alguma no
  // estoque.
  municaoCompativel(municao) {
    return municao?.type === 'municao' && municao.system.quantidade > 0 && (!this.system.municoes.length || this.system.municoes.includes(municao.system.tipo))
      && (!this.perfil2077?.soSmartMelhorada || Boolean(municao.getFlag(SISTEMA, 'arma2077')?.smartMelhorada));
  }

  // Enche o pente com a munição escolhida (o "Trocar a munição" do Painel Tático) ou com a carregada ou, sem ela, com a
  // primeira munição compatível do ator.
  async recarregar({ municao: escolhida = null } = {}) {
    if (this.type !== 'arma' || !this.system.pente.max) return null;
    if (this.system.instaladoEm || this.getFlag(SISTEMA, 'armaVeicular')) {
      const regra = this.getFlag(SISTEMA, 'armaVeicular');
      const motivo = this.motivoVeicular(regra?.soAutofogo ? 'autofogo' : null);
      if (motivo || (regra?.semRecargaDirigindo && this.actor?.system.dirigindo)) {
        ui.notifications.warn(motivo || 'Não é possível recarregar esta arma enquanto dirige.');
        return null;
      }
    }
    const municao = [escolhida?.parent === this.actor ? escolhida : null, this.municaoCarregada, ...(this.actor?.items ?? [])].find(item => item && this.municaoCompativel(item));
    if (!municao) { ui.notifications.warn(`${this.name}: sem munição compatível.`); return null; }
    // O que sobrou no pente volta para a munição que estava nele.
    const anterior = this.municaoCarregada;
    if (anterior && anterior.id !== municao.id && this.system.pente.value) await anterior.update({ 'system.quantidade': anterior.system.quantidade + this.system.pente.value });
    const sobra = anterior?.id === municao.id ? this.system.pente.value : 0;
    const entra = Math.min(this.system.pente.max - sobra, municao.system.quantidade);
    await municao.update({ 'system.quantidade': municao.system.quantidade - entra });
    await this.update({ 'system.carregada': municao.id, 'system.pente.value': sobra + entra });
    return { municao: municao.name, pente: sobra + entra };
  }

  // Descarregar (o C32; o unload do CORE, cpr-loadable.js:57-62, e a opção vazia da troca, :131-134): o pente vai a 0, as
  // balas voltam para a munição que estava nele (regras-inventario.descarga), e a arma fica sem munição carregada, como a
  // vendida para a loja (conteiner.venderParaALoja). A carga Tech e o carregador do acessório não mudam. Sem a munição na
  // ficha (apagada ou levada para outra), as balas não têm para onde voltar: avisa e não mexe.
  async descarregar() {
    if (this.type !== 'arma' || !this.system.pente.value) return null;
    const municao = this.municaoCarregada;
    if (!municao) { ui.notifications.warn(`${this.name}: a munição do pente não está mais na ficha; acerte o pente na ficha da arma.`); return null; }
    const { pente, estoque } = descarga(this.system.pente.value, municao.system.quantidade);
    await municao.update({ 'system.quantidade': estoque });
    await this.update({ 'system.pente.value': pente, 'system.carregada': '' });
    return { municao: municao.name, estoque };
  }
}

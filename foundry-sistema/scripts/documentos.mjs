// Documentos do sistema: o ator (testes, Death Save, dano na ficha, instalar cyberware) e o item (ataque, dano,
// recarregar).
import { ATORES_DA_NET, caminho, EXTRATOS, SIGLA, SISTEMA } from './config.mjs';
import { roleDaWiki } from './dados.mjs';
import { perguntarModificador, perguntarTeste } from './janela-rolagem.mjs';
import {
  aplicarDano, backup, DANO_DE_PROGRAMA, danoNoCerebro, deLonge, FACEDOWN, formulaDeDano, HABILIDADES_DE_INTERFACE, ehCoprocessador, ehLuneta, ehReflexTuner, ehSmartLink, ehTiroUnico, linhaDoExtrato, LOCAIS_MIRADOS, localDaArmadura, LONGE, LUNETA, lunetaVale, novoSaldo, passouNoDeathSave,
  NUMEROS_DA_NET, ONDE_O_DANO_ENTRA, PENALIDADE_CORONHA, perfil2077, programaDeAtaque, REFLEX_TUNER, rezAtual, ROLAGENS_DE_ROLE, sorteParaGastar, TELEOPTICS, teleopticsNoTiro, tipoDeTeleOptics
} from './regras.mjs';
import { rolarDano, testar } from './rolagens.mjs';

// Os botões do mestre no cartão do dano da NET (net.mjs, aplicarDanoDeNet).
const ROTULOS_DA_NET = { cerebro: 'No cérebro dos alvos', programa: 'Num programa do alvo' };
const botoesDaNet = ondes => ondes.map(onde => ({ onde, rotulo: ROTULOS_DA_NET[onde] }));

export class AtorCPR extends Actor {
  // Personagem novo: o token fica ligado à ficha, com o HP na barra. Capanga novo (o mook do CORE): o token fica solto, e
  // cada um na cena tem o próprio HP; o que já vem com o token (uma cópia, o compêndio) fica como veio. Black ICE e demônio
  // novos (o blackIce e o demon do CORE): o token solto, com a REZ na barra.
  async _preCreate(dados, opcoes, usuario) {
    if ((await super._preCreate(dados, opcoes, usuario)) === false) return false;
    const token = { bar1: { attribute: 'hp' }, sight: { enabled: true } };
    if (this.type === 'personagem') this.updateSource({ prototypeToken: { actorLink: true, ...token } });
    if (this.type === 'capanga' && !dados.prototypeToken) this.updateSource({ prototypeToken: { actorLink: false, ...token } });
    if (ATORES_DA_NET.includes(this.type) && !dados.prototypeToken) this.updateSource({ prototypeToken: { actorLink: false, bar1: { attribute: 'rez' } } });
  }

  // O extrato fica completo: uma mudança de Eurodólares, IP ou Reputação que não veio de mudarComExtrato (uma macro, o
  // campo mudado por fora) entra como "definir", sem motivo.
  async _preUpdate(mudancas, opcoes, usuario) {
    if ((await super._preUpdate(mudancas, opcoes, usuario)) === false) return false;
    if (this.type !== 'personagem' || opcoes.cprfExtrato) return;
    for (const campo of Object.keys(EXTRATOS)) {
      const novo = foundry.utils.getProperty(mudancas, `system.${campo}`);
      if (novo === undefined || Number(novo) === this._source.system[campo]) continue;
      const linha = linhaDoExtrato({ acao: 'definir', antes: this._source.system[campo], saldo: Number(novo), usuario: usuario?.name ?? game.users.get(usuario)?.name ?? '' });
      foundry.utils.setProperty(mudancas, `system.extratos.${campo}`, [...this._source.system.extratos[campo], linha]);
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

  // Partes fixas que entram em todo teste: a penalidade de ferimento e a das lesões (−2 em todas as ações).
  #penalidade() {
    const { penalidade, ferimento, bonus } = this.system;
    const partes = penalidade ? [{ rotulo: ferimento.rotulo, valor: penalidade }] : [];
    if (bonus.todasAcoes) partes.push({ rotulo: 'Lesões', valor: bonus.todasAcoes });
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
    const instalados = this.items.filter(item => item.type === 'cyberware' && item.system.instalado).map(item => tipoDeTeleOptics(item.name, item.getFlag(SISTEMA, 'catalogo')));
    const teleoptics = teleopticsNoTiro(instalados, { mirado });
    for (const tipo of teleoptics) lista.push({ id: tipo, rotulo: `${TELEOPTICS[tipo].nome}: ${tiro} a ${LONGE} m ou mais`, valor: 1, ligado: deLonge(metros) });
    const luneta = arma.instalados.find(item => item.type === 'upgrade' && ehLuneta(item.name, item.getFlag(SISTEMA, 'catalogo')));
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
  async #testarComJanela({ rotulo, perguntar, partes, situacionais }, opcoes) {
    if (!perguntar) return testar(this, { rotulo, partes: partes(null), ...opcoes });
    const fixas = partes([]);
    const escolha = await perguntarTeste(this, { rotulo, partes: fixas, situacionais: situacionais() });
    if (!escolha) return null;
    return testar(this, { rotulo, partes: [...fixas, ...escolha.partes], sorte: escolha.sorte, ...opcoes });
  }

  // Atributo + 1d10 (p. 129).
  partesDoAtributo(chave, { situacionais = null } = {}) {
    return [{ rotulo: SIGLA[chave], valor: this.system.atributos[chave].valor }, ...this.#penalidade(), ...this.#situacionais(situacionais)];
  }
  rolarAtributo(chave, { perguntar = false, ...opcoes } = {}) {
    return this.#testarComJanela({
      rotulo: SIGLA[chave], perguntar, partes: situacionais => this.partesDoAtributo(chave, { situacionais }), situacionais: () => this.situacionaisDoTeste()
    }, opcoes);
  }

  // Facedown (regras.FACEDOWN): COOL + Reputação + 1d10, com as penalidades e os situacionais de todas as ações, como os
  // outros testes. A wiki dá o ferimento em "todas as ações", como as lesões; o CPRFacedownRoll do CORE só põe as lesões
  // (ver as dúvidas no MIGRATION_STATUS).
  partesDoFacedown({ situacionais = null } = {}) {
    const [cool, ...resto] = this.partesDoAtributo('cool', { situacionais });
    return [cool, { rotulo: 'Reputação', valor: this.system.reputacao }, ...resto];
  }
  rolarFacedown({ perguntar = false, ...opcoes } = {}) {
    return this.#testarComJanela({
      rotulo: FACEDOWN.rotulo, perguntar, partes: situacionais => this.partesDoFacedown({ situacionais }), situacionais: () => this.situacionaisDoTeste()
    }, { sabor: FACEDOWN.dica, ...opcoes });
  }

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
  rolarInterface(id, { perguntar = false, ...opcoes } = {}) {
    const habilidade = HABILIDADES_DE_INTERFACE.find(h => h.id === id);
    if (!habilidade || !this.system.rankDeInterface) return null;
    return this.#testarComJanela({
      rotulo: habilidade.rotulo, perguntar, partes: situacionais => this.partesDaInterface(id, { situacionais }), situacionais: () => this.situacionaisDaInterface(id)
    }, { sabor: `${habilidade.custo}. ${habilidade.dica}`, ...opcoes });
  }
  // O ataque de um programa (regras.DANO_DE_PROGRAMA; o CPRInterfaceRoll "attack" do CORE): o Rank de Interface + o ATK
  // do programa + 1d10, com as penalidades e os situacionais de todas as ações, pela janela de rolagem. Só os programas de
  // ataque, num deck, de quem tem Interface.
  partesDoAtaqueDePrograma(programa, { situacionais = null } = {}) {
    const escolhidos = situacionais ?? this.situacionaisDoTeste().filter(s => s.ligado);
    return [{ rotulo: 'Interface', valor: this.system.rankDeInterface }, { rotulo: 'ATK', valor: programa.system.atk }, ...this.#penalidade(), ...escolhidos.map(({ rotulo, valor }) => ({ rotulo, valor }))];
  }
  rolarAtaqueDePrograma(programa, { perguntar = false, ...opcoes } = {}) {
    if (!programa || programa.parent !== this || !programaDeAtaque(programa.system.classe) || !programa.instaladoNo || !this.system.rankDeInterface) return null;
    return this.#testarComJanela({
      rotulo: `${programa.name}: ataque`, perguntar, partes: situacionais => this.partesDoAtaqueDePrograma(programa, { situacionais }), situacionais: () => this.situacionaisDoTeste()
    }, { sabor: 'Contra a Interface + 1d10 do netrunner ou a DEF + 1d10 do programa. O programa de ataque desativa sozinho depois de usado.', ...opcoes });
  }

  // O dano do Zap (a wiki e o CORE): 1d6 no REZ de um programa ou direto no cérebro de um netrunner, com os botões do
  // mestre para aplicar.
  async rolarDanoDoZap() {
    const roll = await new Roll('1d6').evaluate();
    const content = await foundry.applications.handlebars.renderTemplate(caminho('templates/chat/dano.hbs'), {
      rotulo: 'Dano: Zap (no REZ de um programa ou no cérebro)', total: roll.total, critico: null, dados: await roll.render(), botoes: botoesDaNet(ONDE_O_DANO_ENTRA.zap)
    });
    await ChatMessage.implementation.create({ speaker: ChatMessage.implementation.getSpeaker({ actor: this }), content, rolls: [roll], flags: { [SISTEMA]: { danoDePrograma: { zap: true, total: roll.total } } } });
    return roll;
  }

  // O programa deste ator ativo (num deck) pelo id do catálogo ou pelo nome (os defensores que mudam o dano no cérebro).
  programaAtivo(id) {
    return this.items.find(item => item.type === 'programa' && item.system.ativo && item.instaladoNo
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
    return testar(this, { rotulo: numero.rotulo, partes, sabor: numero.dica, ...opcoes });
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
  rolarPericia(id, { perguntar = false, ...opcoes } = {}) {
    return this.#testarComJanela({
      rotulo: this.system.pericia(id).nome, perguntar, partes: situacionais => this.partesDaPericia(id, { situacionais }).partes, situacionais: () => this.situacionaisDoTeste(id)
    }, opcoes);
  }

  // As rolagens de habilidade de Role do RED (regras.ROLAGENS_DE_ROLE), como o _createRoleRoll do CORE: o Rank da
  // habilidade (na pechincha do Fixer, com COOL e Negociação), os pontos da Expertise do Tech (com TECH e a perícia
  // escolhida) ou o nível da perícia do Medtech (com TECH), as penalidades e os situacionais de todas as ações (e os da
  // perícia), com a janela de rolagem. O Backup do Lawman é outra rolagem (rolarBackup). Sem a rolagem nesta Role: null.
  rolagemDeRole(id) {
    const role = roleDaWiki(this.system.role.nome);
    return (role && ROLAGENS_DE_ROLE[role.id]?.find(rolagem => rolagem.id === id)) || null;
  }
  partesDaRole(id, { situacionais = null, pericia = null } = {}) {
    const rolagem = this.rolagemDeRole(id);
    const { atributos, periciasDeRole, role } = this.system;
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
  rolarRole(id, { perguntar = false, pericia = null, ...opcoes } = {}) {
    const rolagem = this.rolagemDeRole(id);
    if (!rolagem) return null;
    if (rolagem.backup) return this.rolarBackup(opcoes);
    if (rolagem.escolherPericia && (!pericia || this.system.pericia(pericia).atributo !== rolagem.atributo)) return null;
    const periciaId = rolagem.pericia ?? (rolagem.escolherPericia ? pericia : null);
    const rotulo = rolagem.escolherPericia ? `${rolagem.rotulo} (${this.system.pericia(pericia).nome})` : rolagem.rotulo;
    return this.#testarComJanela({
      rotulo, perguntar, partes: situacionais => this.partesDaRole(id, { situacionais, pericia }), situacionais: () => this.situacionaisDoTeste(periciaId)
    }, { sabor: rolagem.dica, ...opcoes });
  }

  // O Backup do Lawman (regras.backup): 1d10 contra o Rank e, vindo, o d6 das rodadas.
  async rolarBackup({ falar = true } = {}) {
    const rank = this.system.role.rank;
    const d10 = await new Roll('1d10').evaluate();
    const d6 = d10.total <= rank ? await new Roll('1d6').evaluate() : null;
    const resultado = { ...backup({ d10: d10.total, rank, d6: d6?.total ?? null }), d10: d10.total, d6: d6?.total ?? null, rank };
    if (falar) {
      const rolls = d6 ? [d10, d6] : [d10];
      const dados = (await Promise.all(rolls.map(roll => roll.render()))).join('');
      const content = await foundry.applications.handlebars.renderTemplate(caminho('templates/chat/backup.hbs'), { nome: this.name, ...resultado, dados });
      await ChatMessage.implementation.create({ speaker: ChatMessage.implementation.getSpeaker({ actor: this }), content, rolls, flags: { [SISTEMA]: { backup: resultado } } });
    }
    return resultado;
  }

  // Death Save (p. 186): 1d10 + penalidades contra BODY, sem crítico. Passou: a próxima fica 1 mais difícil. Com a janela
  // (perguntar), o modificador do mestre (sem a Sorte: ela é só dos testes); fechada, null.
  async rolarDeathSave({ falar = true, perguntar = false, aoAbrir = null } = {}) {
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
      const content = await foundry.applications.handlebars.renderTemplate(caminho('templates/chat/death-save.hbs'), { nome: this.name, total: roll.total, body, base, penalidade, mestre, passou, natural, dados: await roll.render() });
      await ChatMessage.implementation.create({ speaker: ChatMessage.implementation.getSpeaker({ actor: this }), content, rolls: [roll], flags: { [SISTEMA]: { deathSave: { total: roll.total, passou } } } });
    }
    return { roll, total: roll.total, natural, passou };
  }

  // Estabilizou: a penalidade dos Death Saves volta a zero.
  zerarDeathSave() {
    return this.update({ 'system.deathSave.penalidade': 0 });
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

  // Cyberware instalado que as armas de 2077 procuram: o Smart Link (armas Smart) e o Ballistic Coprocessor (ricochete).
  #instalado(teste) {
    return this.items.some(item => item.type === 'cyberware' && item.system.instalado && teste(item.name, item.getFlag(SISTEMA, 'catalogo')));
  }
  get temSmartLink() { return this.#instalado(ehSmartLink); }
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
    const resumo = { local, dano, bonus, hpAntes, ablado: 0, escudoAblado: 0, armadura: null, armaduraId: null };
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
    const item = conta.ablar && armadura.item ? this.items.get(armadura.item) : null;
    if (item && ablacao) {
      const atual = item.system.sp[lugar].value;
      resumo.ablado = Math.min(ablacao, atual);
      await item.update({ [`system.sp.${lugar}.value`]: atual - resumo.ablado });
      resumo.armadura = item.name;
      resumo.armaduraId = item.id;
    }
    // entrou: o dano que chegou ao corpo antes das reduções (o que passou da armadura e o bônus do crítico).
    return { ...resumo, ...conta, entrou: conta.bruto + bonus, sp: armadura.sp, lugar, hpDepois: this.system.hp.value };
  }

  // Desfaz um dano aplicado: o HP perdido, o SP da armadura e os pontos do escudo voltam. Pela diferença, e não pelo
  // valor de antes: o que aconteceu com o ator depois (outro ataque, uma cura) continua valendo.
  async desfazerDano({ perdeu = 0, armaduraId, lugar, ablado = 0, escudoId, escudoAblado = 0 }) {
    if (perdeu) await this.update({ 'system.hp.value': this.system.hp.value + perdeu });
    const armadura = armaduraId && this.items.get(armaduraId);
    if (armadura && ablado) await armadura.update({ [`system.sp.${lugar}.value`]: armadura.system.sp[lugar].value + ablado });
    const escudo = escudoId && this.items.get(escudoId);
    if (escudo && escudoAblado) await escudo.update({ 'system.pvEscudo.value': escudo.system.pvEscudo.value + escudoAblado });
  }

  // Instala um cyberware: a Humanidade cai pela perda rolada (ou pela média, para quem prefere) e o efeito passa a valer.
  async instalarCyberware(item, { rolar = true } = {}) {
    if (item.system.instalado) return null;
    const { formula, media } = item.system.perdaHumanidade;
    let perda = media;
    if (rolar && formula && formula !== '0') {
      const roll = await new Roll(formula).evaluate();
      perda = roll.total;
      await roll.toMessage({ speaker: ChatMessage.implementation.getSpeaker({ actor: this }), flavor: `Perda de Humanidade: ${item.name}` });
    }
    await item.update({ 'system.instalado': true, 'system.perdaHumanidade.sofrida': perda });
    await this.update({ 'system.humanidade.value': Math.max(0, this.system.humanidade.value - perda) });
    return perda;
  }

  // Tirar o cyberware não devolve a Humanidade perdida: o máximo volta a subir sozinho (a peça deixa de contar), e a
  // Humanidade só volta com terapia. Fontes: a wiki ("Humanidade, terapia e drogas": não dá para recuperar toda a
  // Humanidade sem tirar cyberware, porque cada peça reduz o máximo) e o CORE (uninstallCyberware só recalcula o máximo).
  async desinstalarCyberware(item) {
    if (!item.system.instalado) return;
    await item.update({ 'system.instalado': false, 'system.perdaHumanidade.sofrida': 0 });
  }
}

export class ItemCPR extends Item {
  // Cyberdeck, arma e veículo: os itens instalados neles (programas, hardware, acessórios, upgrades, no mesmo ator) e os
  // slots que ocupam.
  get instalados() {
    return ['cyberdeck', 'arma', 'veiculo'].includes(this.type) ? this.actor?.items.filter(item => item.system.instaladoEm === this.id) ?? [] : [];
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
        rotulo: `Dano: ${this.name} (${alvo.rotulo})`, total: roll.total, critico: null, dados: await roll.render(), botoes: botoesDaNet(ONDE_O_DANO_ENTRA[this.system.classe]?.[contra] ?? [])
      });
      resultado.mensagem = await ChatMessage.implementation.create({
        speaker: ChatMessage.implementation.getSpeaker({ actor: this.actor }), content, rolls: [roll], flags: { [SISTEMA]: { danoDePrograma: { programa: this.uuid, contra, total: roll.total } } }
      });
    }
    return resultado;
  }

  // O item (do mesmo ator) onde este está instalado, ou null: o deck de um programa, a arma de um acessório.
  get instaladoNo() {
    const id = this.system.instaladoEm;
    return (id && this.actor?.items.get(id)) || null;
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

  // Atributo + perícia + bônus da arma + 1d10 (p. 172–176): REF para tiro, DEX para corpo a corpo. Autofogo, fogo
  // supressivo e a rajada Tech usam a perícia Autofogo. As lesões tiram dos tiros (olho) ou do corpo a corpo (músculo).
  // smart: o teste Smart das armas de 2077 (10 ou 12) no lugar do atributo, da perícia e do bônus dela; o resto fica.
  partesDoAtaque(modo = null, { smart = 0 } = {}) {
    const ator = this.actor;
    const atributo = this.system.aDistancia ? 'ref' : 'dex';
    const pericia = ['autofogo', 'supressivo', 'rajadaTech'].includes(modo) ? 'autofire' : this.system.pericia;
    const { pericia: p, partes } = ator.partesDaPericia(pericia, { situacionais: [] });
    partes[0] = { rotulo: SIGLA[atributo], valor: ator.system.atributos[atributo].valor };
    if (smart) partes.splice(0, p.bonus ? 3 : 2, { rotulo: 'Teste Smart', valor: smart });
    if (this.system.bonusAtaque) partes.splice(smart ? 1 : 2, 0, { rotulo: 'Arma', valor: this.system.bonusAtaque });
    const daLesao = this.system.aDistancia ? ator.system.bonus.distancia : ator.system.bonus.corpoACorpo;
    if (daLesao) partes.push({ rotulo: 'Lesões', valor: daLesao });
    if (ator.system.consciencia.ataque) partes.push({ rotulo: 'Ataque de Precisão', valor: ator.system.consciencia.ataque });
    // A coronha retrátil recolhida (a Dian, de 2077): dá para esconder a arma, mas o ataque leva −1 até estender.
    if (this.coronhaRecolhida) partes.push({ rotulo: 'Coronha recolhida', valor: PENALIDADE_CORONHA });
    // Acessórios com bônus de ataque (o Smartgun Link). O mesmo acessório duas vezes não faz nada (wiki).
    const comBonus = new Map(this.instalados.filter(item => item.type === 'upgrade' && item.system.modificadores.ataque).map(item => [item.name, item.system.modificadores.ataque]));
    for (const [rotulo, valor] of comBonus) partes.push({ rotulo, valor });
    return { pericia: p, partes };
  }

  // Ataque: o fluxo de ataque, defesa e dano fica em combate.mjs (registrado no init).
  atacar(opcoes = {}) {
    return game.system.api.combate.atacar(this, opcoes);
  }

  rolarDano(opcoes = {}) {
    return rolarDano(this, { falar: true, ...opcoes });
  }

  // Enche o pente com a munição carregada ou, sem ela, com a primeira munição compatível do ator.
  async recarregar() {
    if (this.type !== 'arma' || !this.system.pente.max) return null;
    const compativel = municao => municao.type === 'municao' && municao.system.quantidade > 0 && (!this.system.municoes.length || this.system.municoes.includes(municao.system.tipo));
    const municao = [this.municaoCarregada, ...(this.actor?.items ?? [])].find(item => item && compativel(item));
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
}

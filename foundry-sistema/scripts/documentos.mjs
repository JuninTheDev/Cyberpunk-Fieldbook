// Documentos do sistema: o ator (testes, Death Save, dano na ficha, instalar cyberware) e o item (ataque, dano,
// recarregar).
import { caminho, SIGLA, SISTEMA } from './config.mjs';
import { aplicarDano, localDaArmadura, passouNoDeathSave } from './regras.mjs';
import { rolarDano, testar } from './rolagens.mjs';

export class AtorCPR extends Actor {
  // Personagem novo: o token fica ligado à ficha, com o HP na barra.
  async _preCreate(dados, opcoes, usuario) {
    if ((await super._preCreate(dados, opcoes, usuario)) === false) return false;
    if (this.type === 'personagem') this.updateSource({ prototypeToken: { actorLink: true, bar1: { attribute: 'hp' }, sight: { enabled: true } } });
  }

  // Partes fixas que entram em todo teste: a penalidade de ferimento e a das lesões (−2 em todas as ações).
  #penalidade() {
    const { penalidade, ferimento, bonus } = this.system;
    const partes = penalidade ? [{ rotulo: ferimento.rotulo, valor: penalidade }] : [];
    if (bonus.todasAcoes) partes.push({ rotulo: 'Lesões', valor: bonus.todasAcoes });
    return partes;
  }

  // Atributo + 1d10 (p. 129).
  rolarAtributo(chave, opcoes = {}) {
    const valor = this.system.atributos[chave].valor;
    return testar(this, { rotulo: SIGLA[chave], partes: [{ rotulo: SIGLA[chave], valor }, ...this.#penalidade()], ...opcoes });
  }

  // Atributo + perícia + 1d10, com o bônus dos efeitos (cyberware, drogas).
  partesDaPericia(id) {
    const p = this.system.pericia(id);
    const partes = [{ rotulo: SIGLA[p.atributo], valor: this.system.atributos[p.atributo].valor }, { rotulo: p.nome, valor: p.nivel }];
    if (p.bonus) partes.push({ rotulo: 'Bônus', valor: p.bonus });
    return { pericia: p, partes: [...partes, ...this.#penalidade()] };
  }
  rolarPericia(id, opcoes = {}) {
    const { pericia, partes } = this.partesDaPericia(id);
    return testar(this, { rotulo: pericia.nome, partes, ...opcoes });
  }

  // Death Save (p. 186): 1d10 + penalidades contra BODY, sem crítico. Passou: a próxima fica 1 mais difícil.
  async rolarDeathSave({ falar = true } = {}) {
    const { base, penalidade, body } = this.system.deathSave;
    const roll = await new Roll(`1d10 + ${base + penalidade}`).evaluate();
    const natural = roll.dice[0].results[0].result;
    const passou = passouNoDeathSave({ natural, total: roll.total, body });
    if (passou) await this.update({ 'system.deathSave.penalidade': penalidade + 1 });
    if (falar) {
      const content = await foundry.applications.handlebars.renderTemplate(caminho('templates/chat/death-save.hbs'), { nome: this.name, total: roll.total, body, base, penalidade, passou, natural, dados: await roll.render() });
      await ChatMessage.implementation.create({ speaker: ChatMessage.implementation.getSpeaker({ actor: this }), content, rolls: [roll], flags: { [SISTEMA]: { deathSave: { total: roll.total, passou } } } });
    }
    return { roll, total: roll.total, natural, passou };
  }

  // Estabilizou: a penalidade dos Death Saves volta a zero.
  zerarDeathSave() {
    return this.update({ 'system.deathSave.penalidade': 0 });
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

  // Tirar o cyberware devolve a Humanidade perdida na instalação (sem terapia, para simplificar por enquanto).
  async desinstalarCyberware(item) {
    if (!item.system.instalado) return;
    const perda = item.system.perdaHumanidade.sofrida;
    await item.update({ 'system.instalado': false, 'system.perdaHumanidade.sofrida': 0 });
    await this.update({ 'system.humanidade.value': Math.min(this.system.humanidade.max, this.system.humanidade.value + perda) });
  }
}

export class ItemCPR extends Item {
  // Cyberdeck: os itens instalados nele (no mesmo ator) e os slots que ocupam.
  get instalados() {
    return this.type === 'cyberdeck' ? this.actor?.items.filter(item => item.system.instaladoEm === this.id) ?? [] : [];
  }

  get slotsUsados() {
    return this.instalados.reduce((soma, item) => soma + (Number(item.system.tamanho) || 0), 0);
  }

  // O cyberdeck onde o item está instalado (no mesmo ator), ou null.
  get deck() {
    const id = this.system.instaladoEm;
    const deck = id ? this.actor?.items.get(id) : null;
    return deck?.type === 'cyberdeck' ? deck : null;
  }

  // A munição no pente (um item de munição do mesmo ator), ou null.
  get municaoCarregada() {
    return this.type === 'arma' && this.system.carregada ? this.actor?.items.get(this.system.carregada) ?? null : null;
  }

  // Atributo + perícia + bônus da arma + 1d10 (p. 172–176): REF para tiro, DEX para corpo a corpo. Autofogo e fogo
  // supressivo usam a perícia Autofogo. As lesões tiram dos tiros (olho) ou do corpo a corpo (músculo).
  partesDoAtaque(modo = null) {
    const ator = this.actor;
    const atributo = this.system.aDistancia ? 'ref' : 'dex';
    const pericia = modo === 'autofogo' || modo === 'supressivo' ? 'autofire' : this.system.pericia;
    const { pericia: p, partes } = ator.partesDaPericia(pericia);
    partes[0] = { rotulo: SIGLA[atributo], valor: ator.system.atributos[atributo].valor };
    if (this.system.bonusAtaque) partes.splice(2, 0, { rotulo: 'Arma', valor: this.system.bonusAtaque });
    const daLesao = this.system.aDistancia ? ator.system.bonus.distancia : ator.system.bonus.corpoACorpo;
    if (daLesao) partes.push({ rotulo: 'Lesões', valor: daLesao });
    if (ator.system.consciencia.ataque) partes.push({ rotulo: 'Ataque de Precisão', valor: ator.system.consciencia.ataque });
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

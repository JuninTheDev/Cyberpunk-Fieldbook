// Modelos de dados (TypeDataModel do Foundry 14): o personagem, o Black ICE e o demônio, as armas, armaduras, munição e
// cyberware, e o efeito que só vale com o item em uso. Os campos persistidos ficam no schema; o resto (HP máximo, SP,
// bônus dos efeitos) é calculado na preparação, a cada vez.
import { ANDAR_MAX, RAMOS, TIPOS_DE_ANDAR } from './arquitetura.mjs';
import { ALVOS_UPGRADE, ATIVACOES, ATRIBUTOS, CLASSES_BLACK_ICE, EXTRATOS, LIFEPATH, USOS } from './config.mjs';
import { FAMILIAS, HABILIDADES_DE_ROLE, PERICIAS, ROLES, ROLES_ANTIGAS } from './gerado.mjs';
import * as regras from './regras.mjs';

const { fields } = foundry.data;
const inteiro = (initial = 0, opcoes = {}) => new fields.NumberField({ required: true, nullable: false, integer: true, initial, ...opcoes });
const texto = (initial = '') => new fields.StringField({ required: true, blank: true, initial });
const recurso = (value, max) => new fields.SchemaField({ value: inteiro(value), max: inteiro(max) });
const fonte = () => new fields.SchemaField({ livro: texto(), pagina: inteiro(0) });

// Todas as chaves de perícia que um efeito pode somar: as comuns e as famílias (Linguagem etc.).
export const CHAVES_PERICIAS = [...PERICIAS.map(p => p.id), ...Object.keys(FAMILIAS)];

// A Role da wiki pelo nome que está na ficha ou pelo id (regras.acharRole: Face e Corpo são a do RED de onde vinham).
export const roleDaWiki = nome => regras.acharRole(nome, ROLES, ROLES_ANTIGAS);

export class DadosPersonagem extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      atributos: new fields.SchemaField(Object.fromEntries(ATRIBUTOS.map(chave => [chave, new fields.SchemaField({ valor: inteiro(5, { min: 0 }) })]))),
      hp: recurso(40, 40),
      humanidade: recurso(50, 50),
      sorte: recurso(5, 5),
      // Pela chave da perícia ("handgun", "language-streetslang"). As de família guardam qual família e o nome.
      pericias: new fields.TypedObjectField(new fields.SchemaField({
        nivel: inteiro(0, { min: 0 }),
        familia: texto(),
        nome: texto()
      })),
      role: new fields.SchemaField({
        nome: texto(),
        rank: inteiro(4, { min: 0 }),
        habilidades: new fields.TypedObjectField(inteiro(0))
      }),
      // Sobe 1 a cada Death Save que passa; volta a zero quando o personagem estabiliza (botão na ficha).
      deathSave: new fields.SchemaField({ penalidade: inteiro(0, { min: 0 }) }),
      dinheiro: inteiro(0),
      pontosDeMelhoria: inteiro(0),
      reputacao: inteiro(0),
      // O apelido (o nome de rua) e o Lifepath, em texto (a wiki manda pronto do criador).
      apelido: texto(),
      lifepath: new fields.SchemaField(Object.fromEntries(LIFEPATH.map(({ chave }) => [chave, texto()]))),
      // O extrato de Eurodólares, IP e Reputação (o ledger do CORE): cada mudança com a data, a diferença, o saldo, o
      // motivo e quem mudou (AtorCPR.mudarComExtrato e o _preUpdate).
      extratos: new fields.SchemaField(Object.fromEntries(Object.keys(EXTRATOS).map(campo => [campo, new fields.ArrayField(new fields.SchemaField({
        quando: texto(), acao: texto('definir'), delta: inteiro(0), saldo: inteiro(0), motivo: texto(), usuario: texto()
      }))]))),
      notas: new fields.HTMLField({ required: true, blank: true, initial: '' })
    };
  }

  // Antes dos efeitos: os bônus começam em zero (os efeitos de cyberware e drogas somam nestas chaves, só na memória).
  prepareBaseData() {
    // todasAcoes, corpoACorpo e distancia vêm das lesões (Concussão, Músculo Rompido, Olho Perdido).
    this.bonus = {
      iniciativa: 0, tiroMirado: 0, tiroUnico: 0, maos: 0, ataque: 0, todasAcoes: 0, corpoACorpo: 0, distancia: 0, supressaoDeDor: false,
      pericias: Object.fromEntries(CHAVES_PERICIAS.map(id => [id, 0])),
      // Os boosters ativos somam na habilidade de Interface deles (Eraser no Cloak, Speedy Gonzalvez na Velocidade...).
      interface: Object.fromEntries(regras.HABILIDADES_DE_INTERFACE.map(({ id }) => [id, 0]))
    };
  }

  // Depois dos efeitos da fase "initial": derivados com os atributos já modificados.
  prepareDerivedData() {
    const a = this.atributos;
    // Armadura pesada (p. 97): a maior penalidade das armaduras vestidas sai de REF, DEX e MOVE.
    const armaduras = this.parent.items.filter(item => item.type === 'armadura' && item.system.equipada && !item.system.escudo);
    this.penalidadeArmadura = armaduras.reduce((maior, item) => Math.max(maior, Math.abs(item.system.penalidade)), 0);
    for (const chave of ['ref', 'dex', 'move']) a[chave].valor = Math.max(0, a[chave].valor - this.penalidadeArmadura);
    this.hp.max = regras.hpMaximo(a.body.valor, a.will.valor);
    const instalados = this.parent.items.filter(item => item.type === 'cyberware' && item.system.instalado)
      .map(item => ({ tipo: item.system.tipo, perda: item.system.perdaHumanidade.media }));
    this.humanidade.max = regras.humanidadeMaxima(a.emp.valor, instalados);
    this.sorte.max = a.luck.valor;
    this.empAtual = regras.empAtual(this.humanidade.value, a.emp.valor);
    this.ferimento = regras.estadoDeFerimento(this.hp.value, this.hp.max);
    // Mortalmente ferido: −6 MOVE. As lesões, a armadura e o ferimento tiram MOVE, mas o mínimo é 1 (wiki).
    a.move.valor = regras.moveFinal(a.move.valor, this.ferimento.chave === 'mortal');
    // Consciência de Combate do Solo (pelos pontos de cada habilidade da Role).
    this.consciencia = regras.consciencia(this.role.habilidades);
    // Os bônus de Role nas perícias (o Moto do Nomad), como o item de Role do CORE, e as perícias que só o Medtech tem (a
    // Cirurgia e a Tecnologia Médica), pelas especialidades de Medicina.
    const roleId = roleDaWiki(this.role.nome)?.id;
    this.bonusDeRole = regras.bonusDeRole({ roleId, rank: this.role.rank });
    this.periciasDeRole = regras.periciasDerivadas(HABILIDADES_DE_ROLE[roleId]?.derivadas, this.role.habilidades);
    // A Interface é o Rank do Netrunner (só ele tem), e ela dá as Ações NET por turno.
    this.rankDeInterface = roleId === 'netrunner' ? Math.max(0, this.role.rank) : 0;
    this.acoesDeNet = regras.acoesDeNet(this.rankDeInterface);
    // Editor de dor (supressão de dor): tira só a penalidade de gravemente ferido, não a de mortalmente ferido.
    this.penalidade = regras.penalidadeDoFerimento(this.ferimento, this.bonus.supressaoDeDor);
    // Death Save: a penalidade de base vem das lesões que a aumentam; a outra sobe a cada sucesso.
    const lesoes = this.parent.items.filter(item => item.type === 'lesao');
    this.deathSave.base = lesoes.filter(item => item.system.aumentaDeathSave).length;
    this.deathSave.body = a.body.valor;
    // Sem a perna, não esquiva (Perna Desmembrada).
    this.semPerna = lesoes.some(item => item.getFlag('cpr-fieldbook', 'catalogo') === 'core_critical-injuries-body:dismembered-leg' || item.name === 'Dismembered Leg');
    // SP de cada local: a maior das armaduras equipadas que cobrem o local.
    const maior = local => armaduras.reduce((melhor, item) => (item.system.sp[local].max > 0 && item.system.sp[local].value > (melhor?.system.sp[local].value ?? -1) ? item : melhor), null);
    this.armadura = Object.fromEntries(['cabeca', 'corpo'].map(local => {
      const item = maior(local);
      return [local, { sp: item ? item.system.sp[local].value : 0, max: item ? item.system.sp[local].max : 0, item: item?.id ?? null }];
    }));
    this.iniciativa = a.ref.valor + this.bonus.iniciativa + this.consciencia.iniciativa;
  }

  // Nível, atributo e bônus de uma perícia, pela chave. Perícia que o personagem não tem vale 0 no nível.
  pericia(id) {
    const propria = this.pericias[id];
    const base = PERICIAS.find(p => p.id === id);
    const familia = FAMILIAS[propria?.familia || ''];
    const atributo = base?.atributo || familia?.atributo || 'int';
    const nome = base ? base.nome : `${familia?.nome || ''}${propria?.nome ? ` (${propria.nome})` : ''}`;
    // Os efeitos somam na perícia e na família dela; a Detecção de Ameaça do Solo soma na Percepção.
    const bonus = (this.bonus.pericias[id] || 0) + (propria?.familia ? this.bonus.pericias[propria.familia] || 0 : 0)
      + (id === 'perception' ? this.consciencia?.percepcao || 0 : 0);
    // O bônus da Role ({ rotulo, valor }), na perícia ou na família dela.
    const role = this.bonusDeRole?.[id] ?? (propria?.familia ? this.bonusDeRole?.[propria.familia] : null) ?? null;
    return { id, nome, atributo, nivel: propria?.nivel ?? 0, bonus, role, dificil: Boolean(base?.dificil ?? familia?.dificil) };
  }
}

// ---------------- Os atores da NET ----------------
// O Black ICE (o blackIce do CORE): a classe, PER, SPD, ATK, DEF, a REZ e o custo, com o efeito e o dano da tabela da
// wiki. modelo é o id dela ("hellhound"; vazio no feito à mão).
export class DadosBlackIce extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      modelo: texto(),
      classe: new fields.StringField({ required: true, blank: false, initial: 'antipersonnel', choices: Object.keys(CLASSES_BLACK_ICE) }),
      per: inteiro(0, { min: 0 }),
      spd: inteiro(0, { min: 0 }),
      atk: inteiro(0, { min: 0 }),
      def: inteiro(0, { min: 0 }),
      rez: recurso(10, 10),
      efeito: texto(),
      dano: texto(),
      custo: inteiro(100, { min: 0 }),
      notas: new fields.HTMLField({ required: true, blank: true, initial: '' })
    };
  }
}

// O demônio (o demon do CORE): a REZ, a Interface, as Ações NET e o Valor de combate.
export class DadosDemonio extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      modelo: texto(),
      rez: recurso(10, 10),
      interface: inteiro(0, { min: 0 }),
      acoes: inteiro(2, { min: 0 }),
      valorDeCombate: inteiro(14, { min: 0 }),
      notas: new fields.HTMLField({ required: true, blank: true, initial: '' })
    };
  }
}

// ---------------- Itens ----------------
export class DadosArma extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      descricao: new fields.HTMLField({ required: true, blank: true, initial: '' }),
      tipo: texto(),
      pericia: texto('handgun'),
      dano: texto('2d6'),
      cdt: inteiro(1, { min: 0 }),
      pente: recurso(0, 0),
      municoes: new fields.ArrayField(new fields.StringField()),
      // Id (no ator) do item de munição que está no pente.
      carregada: texto(),
      aDistancia: new fields.BooleanField({ initial: true }),
      maos: inteiro(1, { min: 0 }),
      autofogo: inteiro(0, { min: 0 }),
      supressivo: new fields.BooleanField({ initial: false }),
      bonusAtaque: inteiro(0),
      qualidade: texto('standard'),
      ocultavel: new fields.BooleanField({ initial: false }),
      tabelaDV: texto(),
      ignorarArmadura: inteiro(0, { min: 0, max: 100 }),
      ignorarAbaixo: inteiro(0, { min: 0 }),
      // Slots de acessório (3 na arma de longo alcance que não é exótica).
      slots: inteiro(0, { min: 0 }),
      equipada: new fields.BooleanField({ initial: false }),
      preco: inteiro(0, { min: 0 }),
      fonte: fonte()
    };
  }

  // Com um carregador instalado (um upgrade do mesmo ator com instaladoEm = esta arma), o pente é o dele. A wiki diz que
  // só cabe um carregador por vez; com mais de um, vale o maior.
  prepareDerivedData() {
    const item = this.parent;
    const pente = Math.max(0, ...(item?.actor?.items.filter(outro => outro.type === 'upgrade' && outro.system.instaladoEm === item.id).map(a => a.system.modificadores.pente) ?? []));
    if (pente) this.pente.max = pente;
  }
}

export class DadosArmadura extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      descricao: new fields.HTMLField({ required: true, blank: true, initial: '' }),
      sp: new fields.SchemaField({ cabeca: recurso(0, 0), corpo: recurso(11, 11) }),
      penalidade: inteiro(0),
      escudo: new fields.BooleanField({ initial: false }),
      pvEscudo: recurso(0, 0),
      equipada: new fields.BooleanField({ initial: false }),
      preco: inteiro(0, { min: 0 }),
      fonte: fonte()
    };
  }
}

export class DadosMunicao extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      descricao: new fields.HTMLField({ required: true, blank: true, initial: '' }),
      tipo: texto(),
      efeito: texto('basic'),
      quantidade: inteiro(0, { min: 0 }),
      ablacao: inteiro(1, { min: 0 }),
      preco: inteiro(0, { min: 0 }),
      fonte: fonte()
    };
  }
}

export class DadosCyberware extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      descricao: new fields.HTMLField({ required: true, blank: true, initial: '' }),
      tipo: texto(),
      fundacional: new fields.BooleanField({ initial: false }),
      tamanho: inteiro(0, { min: 0 }),
      // Fórmula e média do livro; "sofrida" é o quanto custou na instalação (volta se tirar).
      perdaHumanidade: new fields.SchemaField({ formula: texto('0'), media: inteiro(0, { min: 0 }), sofrida: inteiro(0, { min: 0 }) }),
      local: texto('mall'),
      instalado: new fields.BooleanField({ initial: false }),
      preco: inteiro(0, { min: 0 }),
      fonte: fonte()
    };
  }
}

// Inventário: equipamento, roupa e droga, em pilha (a quantidade) e com o uso da montagem da wiki.
const usoDoItem = initial => new fields.StringField({ required: true, blank: false, initial, choices: Object.keys(USOS) });

export class DadosEquipamento extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      descricao: new fields.HTMLField({ required: true, blank: true, initial: '' }),
      quantidade: inteiro(1, { min: 0 }),
      uso: usoDoItem('carregando'),
      ativacao: new fields.StringField({ required: true, blank: false, initial: 'carregando', choices: Object.keys(ATIVACOES) }),
      eletronico: new fields.BooleanField({ initial: false }),
      ocultavel: new fields.BooleanField({ initial: false }),
      preco: inteiro(0, { min: 0 }),
      fonte: fonte()
    };
  }
}

export class DadosRoupa extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      descricao: new fields.HTMLField({ required: true, blank: true, initial: '' }),
      quantidade: inteiro(1, { min: 0 }),
      uso: usoDoItem('equipado'),
      tipo: texto(),
      estilo: texto(),
      preco: inteiro(0, { min: 0 }),
      fonte: fonte()
    };
  }
}

// Droga: as doses. Os efeitos vêm desligados (o CORE também); quem usa liga o efeito na ficha do item. "consumo" é o
// nome do efeito principal, para quando o sistema souber consumir.
export class DadosDroga extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      descricao: new fields.HTMLField({ required: true, blank: true, initial: '' }),
      quantidade: inteiro(1, { min: 0 }),
      uso: usoDoItem('carregando'),
      consumo: texto(),
      preco: inteiro(0, { min: 0 }),
      fonte: fonte()
    };
  }
}

// NET: o cyberdeck (os slots) e os programas. instaladoEm: o id, no mesmo ator, do cyberdeck onde o programa está; vazio,
// fora de deck.
export class DadosCyberdeck extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      descricao: new fields.HTMLField({ required: true, blank: true, initial: '' }),
      slots: inteiro(7, { min: 0 }),
      // Os decks de 2077: a RAM que paga os quickhacks e o Cooling (quanta RAM volta por rodada).
      ram: inteiro(0, { min: 0 }),
      resfriamento: inteiro(0, { min: 0 }),
      qualidade: texto('standard'),
      uso: usoDoItem('carregando'),
      preco: inteiro(0, { min: 0 }),
      fonte: fonte()
    };
  }
}

export class DadosPrograma extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      descricao: new fields.HTMLField({ required: true, blank: true, initial: '' }),
      classe: texto(),
      atk: inteiro(0),
      def: inteiro(0),
      rez: inteiro(0, { min: 0 }),
      // O custo em RAM do quickhack de 2077.
      ram: inteiro(0, { min: 0 }),
      // O dano do programa de ataque: contra programa e netrunner, e contra Black ICE.
      dano: new fields.SchemaField({ padrao: texto('0'), blackIce: texto('0') }),
      tamanho: inteiro(1, { min: 0 }),
      instaladoEm: texto(),
      // Ativo (rezzado, o isRezzed do CORE): os efeitos do programa (os boosters) só valem assim, instalado num deck.
      ativo: new fields.BooleanField({ initial: false }),
      // A REZ perdida no combate da NET (a atual é rez − rezPerdida; regras.rezAtual).
      rezPerdida: inteiro(0, { min: 0 }),
      // O Black ICE próprio do netrunner (a classe blackice; o blackIceType do CORE): o tipo, PER e SPD. O ATK, a DEF, a REZ
      // e o dano são os de todo programa.
      tipoDeIce: new fields.StringField({ required: true, blank: false, initial: 'antipersonnel', choices: Object.keys(CLASSES_BLACK_ICE) }),
      per: inteiro(0, { min: 0 }),
      spd: inteiro(0, { min: 0 }),
      preco: inteiro(0, { min: 0 }),
      fonte: fonte()
    };
  }
}

// A arquitetura da NET (o netarch do CORE, com os demônios e os netrunners inimigos do NET Architect da mesa): uma linha
// por conteúdo, no andar (1 a 18) e no ramo (a a h). O DV é o da senha, do arquivo e do nó de controle; o Black ICE e o
// demônio, pelo modelo da wiki; o netrunner inimigo, pela ficha (o uuid). O DV da arquitetura (o Pathfinder, o Cloak, o
// Virus) é o maior dos andares, ou o daqui (dv > 0).
export class DadosArquitetura extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      descricao: new fields.HTMLField({ required: true, blank: true, initial: '' }),
      dv: inteiro(0, { min: 0 }),
      andares: new fields.ArrayField(new fields.SchemaField({
        andar: inteiro(1, { min: 1, max: ANDAR_MAX }),
        ramo: new fields.StringField({ required: true, blank: false, initial: 'a', choices: [...RAMOS] }),
        tipo: new fields.StringField({ required: true, blank: false, initial: 'senha', choices: Object.keys(TIPOS_DE_ANDAR) }),
        dv: inteiro(6, { min: 0 }),
        ice: texto(),
        demonio: texto(),
        ator: texto(),
        nome: texto(),
        descricao: texto()
      })),
      preco: inteiro(0, { min: 0 }),
      fonte: fonte()
    };
  }
}

// Upgrade: o acessório de arma, o hardware de cyberdeck e o upgrade de veículo. alvo: onde instala; instaladoEm: o id,
// no mesmo ator, do item onde está. Os modificadores do CORE que o sistema aplica no item pai: o pente do carregador
// (troca o tamanho), o bônus de ataque (soma; Smartgun Link), e o SDP e os assentos do veículo (somam).
export class DadosUpgrade extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      descricao: new fields.HTMLField({ required: true, blank: true, initial: '' }),
      alvo: new fields.StringField({ required: true, blank: false, initial: 'arma', choices: Object.keys(ALVOS_UPGRADE) }),
      tamanho: inteiro(1, { min: 0 }),
      instaladoEm: texto(),
      modificadores: new fields.SchemaField({ pente: inteiro(0, { min: 0 }), ataque: inteiro(0), sdp: inteiro(0), assentos: inteiro(0) }),
      preco: inteiro(0, { min: 0 }),
      fonte: fonte()
    };
  }
}

// Veículo (RED p. 189–192): o SDP (a wiki chama de PDE), os assentos e a velocidade (a de combate é o MOVE do veículo; a
// narrativa, em texto). familia: veículo da família do Nomad. Os upgrades instalados nele (instaladoEm) somam SDP e
// assentos.
export class DadosVeiculo extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      descricao: new fields.HTMLField({ required: true, blank: true, initial: '' }),
      sdp: recurso(50, 50),
      assentos: inteiro(2, { min: 0 }),
      velocidade: new fields.SchemaField({ combate: inteiro(20, { min: 0 }), narrativa: texto() }),
      familia: new fields.BooleanField({ initial: false }),
      preco: inteiro(0, { min: 0 }),
      fonte: fonte()
    };
  }

  prepareDerivedData() {
    const item = this.parent;
    const upgrades = item?.actor?.items.filter(outro => outro.type === 'upgrade' && outro.system.instaladoEm === item.id) ?? [];
    for (const upgrade of upgrades) {
      this.sdp.max += upgrade.system.modificadores.sdp;
      this.assentos += upgrade.system.modificadores.assentos;
    }
  }
}

export class DadosLesao extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      descricao: new fields.HTMLField({ required: true, blank: true, initial: '' }),
      local: texto('corpo'),
      aumentaDeathSave: new fields.BooleanField({ initial: false }),
      // DVs de cada perícia (0 = aquela perícia não serve).
      paliativo: new fields.SchemaField({ primeirosSocorros: inteiro(0, { min: 0 }), paramedico: inteiro(0, { min: 0 }) }),
      tratamento: new fields.SchemaField({ paramedico: inteiro(0, { min: 0 }), cirurgia: inteiro(0, { min: 0 }) }),
      fonte: fonte()
    };
  }
}

// Efeito que vem de um item só vale com o item em uso: cyberware instalado, arma ou armadura equipada, equipamento no uso
// que a ativação pede. O Foundry 14 pergunta isso ao modelo de dados do efeito (ActiveEffect#isSuppressed →
// system.isSuppressed); null deixa o core decidir (efeito desligado ou expirado), como nos efeitos ligados à mão.
// O efeito situacional (do CORE: a Percepção pela audição, todas as ações com as mãos) não soma sozinho: a janela de
// rolagem o oferece no teste certo, ligado ou não por padrão; o rolar direto usa os ligados por padrão.
export class DadosEfeito extends foundry.data.ActiveEffectTypeDataModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      situacional: new fields.SchemaField({ sim: new fields.BooleanField({ initial: false }), ligadoPorPadrao: new fields.BooleanField({ initial: false }), alvo: texto() })
    };
  }

  // O item está fora do uso que o efeito pede? null quando o efeito não vem de item.
  get foraDeUso() {
    const item = this.parent?.parent;
    if (!(item instanceof Item)) return null;
    if (item.type === 'cyberware') return !item.system.instalado;
    if (item.type === 'arma' || item.type === 'armadura') return !item.system.equipada;
    if (item.type === 'programa') return !item.system.ativo || !item.instaladoNo;
    if (item.type === 'equipamento' && item.system.ativacao !== 'manual') return !regras.efeitoValeNoUso(item.system.ativacao, item.system.uso);
    return null;
  }

  get isSuppressed() {
    return this.situacional.sim || this.foraDeUso;
  }
}

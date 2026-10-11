// Modelos de dados (TypeDataModel do Foundry 14): o personagem, as armas, armaduras, munição e cyberware, e o efeito
// que só vale com o item em uso. Os campos persistidos ficam no schema; o resto (HP máximo, SP, bônus dos efeitos)
// é calculado na preparação, a cada vez.
import { ATRIBUTOS } from './config.mjs';
import { FAMILIAS, PERICIAS } from './gerado.mjs';
import * as regras from './regras.mjs';

const { fields } = foundry.data;
const inteiro = (initial = 0, opcoes = {}) => new fields.NumberField({ required: true, nullable: false, integer: true, initial, ...opcoes });
const texto = (initial = '') => new fields.StringField({ required: true, blank: true, initial });
const recurso = (value, max) => new fields.SchemaField({ value: inteiro(value), max: inteiro(max) });
const fonte = () => new fields.SchemaField({ livro: texto(), pagina: inteiro(0) });

// Todas as chaves de perícia que um efeito pode somar: as comuns e as famílias (Linguagem etc.).
export const CHAVES_PERICIAS = [...PERICIAS.map(p => p.id), ...Object.keys(FAMILIAS)];

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
      notas: new fields.HTMLField({ required: true, blank: true, initial: '' })
    };
  }

  // Antes dos efeitos: os bônus começam em zero (os efeitos de cyberware e drogas somam nestas chaves, só na memória).
  prepareBaseData() {
    // todasAcoes, corpoACorpo e distancia vêm das lesões (Concussão, Músculo Rompido, Olho Perdido).
    this.bonus = {
      iniciativa: 0, tiroMirado: 0, tiroUnico: 0, maos: 0, ataque: 0, todasAcoes: 0, corpoACorpo: 0, distancia: 0, supressaoDeDor: false,
      pericias: Object.fromEntries(CHAVES_PERICIAS.map(id => [id, 0]))
    };
  }

  // Depois dos efeitos da fase "initial": derivados com os atributos já modificados.
  prepareDerivedData() {
    const a = this.atributos;
    // Armadura pesada (p. 97): a maior penalidade das armaduras vestidas sai de REF, DEX e MOVE.
    const armaduras = this.parent.items.filter(item => item.type === 'armadura' && item.system.equipada && !item.system.escudo);
    this.penalidadeArmadura = armaduras.reduce((maior, item) => Math.max(maior, Math.abs(item.system.penalidade)), 0);
    for (const chave of ['ref', 'dex', 'move']) a[chave].valor = Math.max(0, a[chave].valor - this.penalidadeArmadura);
    // As lesões e a armadura tiram MOVE, mas o mínimo é 1 (p. 187).
    if (a.move.valor < 1) a.move.valor = 1;
    this.hp.max = regras.hpMaximo(a.body.valor, a.will.valor);
    this.humanidade.max = regras.humanidadeMaxima(a.emp.valor);
    this.sorte.max = a.luck.valor;
    this.empAtual = regras.empAtual(this.humanidade.value, a.emp.valor);
    this.ferimento = regras.estadoDeFerimento(this.hp.value, this.hp.max);
    // Editor de dor (supressão de dor) tira a penalidade de ferimento.
    this.penalidade = this.bonus.supressaoDeDor ? 0 : this.ferimento.penalidade;
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
    this.iniciativa = a.ref.valor + this.bonus.iniciativa;
  }

  // Nível, atributo e bônus de uma perícia, pela chave. Perícia que o personagem não tem vale 0 no nível.
  pericia(id) {
    const propria = this.pericias[id];
    const base = PERICIAS.find(p => p.id === id);
    const familia = FAMILIAS[propria?.familia || ''];
    const atributo = base?.atributo || familia?.atributo || 'int';
    const nome = base ? base.nome : `${familia?.nome || ''}${propria?.nome ? ` (${propria.nome})` : ''}`;
    const bonus = (this.bonus.pericias[id] || 0) + (propria?.familia ? this.bonus.pericias[propria.familia] || 0 : 0);
    return { id, nome, atributo, nivel: propria?.nivel ?? 0, bonus, dificil: Boolean(base?.dificil ?? familia?.dificil) };
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
      equipada: new fields.BooleanField({ initial: false }),
      preco: inteiro(0, { min: 0 }),
      fonte: fonte()
    };
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

// Efeito que vem de um item só vale com o item em uso: cyberware instalado, arma ou armadura equipada.
// O Foundry 14 pergunta isso ao modelo de dados do efeito (ActiveEffect#isSuppressed → system.isSuppressed); null deixa
// o core decidir (efeito expirado).
export class DadosEfeito extends foundry.data.ActiveEffectTypeDataModel {
  get isSuppressed() {
    const item = this.parent?.parent;
    if (!(item instanceof Item)) return null;
    if (item.type === 'cyberware') return !item.system.instalado;
    if (item.type === 'arma' || item.type === 'armadura') return !item.system.equipada;
    return null;
  }
}

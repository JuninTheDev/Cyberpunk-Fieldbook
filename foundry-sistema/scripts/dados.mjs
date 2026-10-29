// Modelos de dados (TypeDataModel do Foundry 14): o personagem, o Black ICE e o demônio, as armas, armaduras, munição e
// cyberware, e o efeito que só vale com o item em uso. Os campos persistidos ficam no schema; o resto (HP máximo, SP,
// bônus dos efeitos) é calculado na preparação, a cada vez.
import { ANDAR_MAX, RAMOS, TIPOS_DE_ANDAR } from './arquitetura.mjs';
import { ALVOS_UPGRADE, ATIVACOES, ATRIBUTOS, CLASSES_BLACK_ICE, EXTRATOS, LIFEPATH, PERMISSOES_DO_CONTEINER, SISTEMA, TIPOS_DE_CONTEINER, TIPOS_QUE_A_LOJA_COMPRA, USOS } from './config.mjs';
import { FAMILIAS, HABILIDADES_DE_ROLE, PERICIAS, ROLES, ROLES_ANTIGAS } from './gerado.mjs';
import * as regras from './regras.mjs';
import { protecoesDoVeiculo, TIPOS_DE_VEICULO } from './regras-veiculos.mjs';
import { scannerPreferido, tipoDeScanner } from './regras-inventario.mjs';
import { armaduraDoLocal, armaduraMonitoradaDoLocal } from './regras-armadura.mjs';
import { penalidadeDeDeathSave } from './tratamento.mjs';
import { corpoComQuadro } from './regras-black-chrome.mjs';

const { fields } = foundry.data;
const inteiro = (initial = 0, opcoes = {}) => new fields.NumberField({ required: true, nullable: false, integer: true, initial, ...opcoes });
const texto = (initial = '') => new fields.StringField({ required: true, blank: true, initial });
const recurso = (value, max) => new fields.SchemaField({ value: inteiro(value), max: inteiro(max) });
// CORE 0.92.4, vehicle-datamodel.js:19-44: SDP, assentos e velocidades. O ator e o item mantêm as mesmas chaves;
// SP e ablação são os do C15, sem mudar o estado persistido dos itens existentes.
const estadoDoVeiculo = () => ({
  sdp: recurso(50, 50),
  assentos: inteiro(2, { min: 0 }),
  velocidade: new fields.SchemaField({ combate: inteiro(20, { min: 0 }), narrativa: texto() }),
  tipo: new fields.StringField({ required: true, blank: true, initial: '', choices: Object.keys(TIPOS_DE_VEICULO) }),
  sp: inteiro(0, { min: 0 }),
  ablacao: inteiro(0, { min: 0 })
});
const custoMensal = () => new fields.SchemaField({ custo: inteiro(0, { min: 0 }), descricao: texto() });
// A arma do cyberware e do acessório de arma (o C11; o isWeapon do cyberware e o secondaryWeapon do itemUpgrade do CORE,
// com os campos do attackable e do loadable): montado, o item ataca pela arma ligada a ele (armas-cyberware.mjs), com
// estes campos. pente: o tamanho do pente (0, sem munição).
const armaMontada = (extras = {}) => new fields.SchemaField({
  ataca: new fields.BooleanField({ initial: false }),
  tipo: texto(),
  pericia: texto('melee-weapon'),
  dano: texto('1d6'),
  cdt: inteiro(1, { min: 0 }),
  aDistancia: new fields.BooleanField({ initial: false }),
  pente: inteiro(0, { min: 0 }),
  municoes: new fields.ArrayField(new fields.StringField()),
  autofogo: inteiro(0, { min: 0 }),
  supressivo: new fields.BooleanField({ initial: false }),
  bonusAtaque: inteiro(0),
  qualidade: texto('standard'),
  falhaCritica: texto('jammed'),
  ocultavel: new fields.BooleanField({ initial: false }),
  tabelaDV: texto(),
  ignorarArmadura: inteiro(0, { min: 0, max: 100 }),
  ignorarAbaixo: inteiro(0, { min: 0 }),
  ...extras
});
const fonte = () => new fields.SchemaField({ livro: texto(), pagina: inteiro(0) });
const eletronica = (eletronico = false) => ({ eletronico: new fields.BooleanField({ initial: eletronico }), endurecido: new fields.BooleanField({ initial: false }) });
// O extrato de um valor (o ledger do CORE): cada mudança com a data, a diferença, o saldo, o motivo e quem mudou.
const extrato = () => new fields.ArrayField(new fields.SchemaField({
  quando: texto(), acao: texto('definir'), delta: inteiro(0), saldo: inteiro(0), motivo: texto(), usuario: texto()
}));

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
      armaduraMonitorada: new fields.SchemaField({ cabeca: texto(), corpo: texto() }),
      // Campos reconhecidos nativamente pelo HUD v14; o valor é sempre recalculado dos itens.
      spMonitorado: new fields.SchemaField({ cabeca: recurso(0, 0), corpo: recurso(0, 0) }),
      // Pela chave da perícia ("handgun", "language-streetslang"). As de família guardam qual família e o nome.
      pericias: new fields.TypedObjectField(new fields.SchemaField({
        nivel: inteiro(0, { min: 0 }),
        familia: texto(),
        nome: texto(),
        // O STAT da perícia própria (regras.periciaPropria); nas do livro e nas de família, vazio.
        atributo: texto()
      })),
      role: new fields.SchemaField({
        nome: texto(),
        rank: inteiro(4, { min: 0 }),
        habilidades: new fields.TypedObjectField(inteiro(0)),
        // As notas da Role (as maquetes do usuário): texto livre, na aba Role.
        notas: texto()
      }),
      // A segunda Role (a regra da mesa "Duas Roles na criação"; o C23): o nome vazio é nenhuma. A principal define os
      // STATs, as perícias e o pacote; a segunda tem o Rank e as habilidades dela.
      roleSecundaria: new fields.SchemaField({
        nome: texto(),
        rank: inteiro(0, { min: 0 }),
        habilidades: new fields.TypedObjectField(inteiro(0))
      }),
      // Sobe 1 a cada Death Save que passa; volta a zero quando o personagem estabiliza (botão na ficha).
      deathSave: new fields.SchemaField({ penalidade: inteiro(0, { min: 0 }) }),
      dinheiro: inteiro(0),
      pontosDeMelhoria: inteiro(0),
      reputacao: inteiro(0),
      // Um veículo em uso por vez, inclusive entre os da família do Nomad (wiki, p. 161).
      veiculo: texto(),
      dirigindo: new fields.BooleanField({ initial: false }),
      // O apelido (o nome de rua) e o Lifepath, em texto (a wiki manda pronto do criador).
      apelido: texto(),
      lifepath: new fields.SchemaField(Object.fromEntries(LIFEPATH.map(({ chave }) => [chave, texto()]))),
      // Moradia, estilo de vida, Trauma Team e moda (o lifestyle do CORE; o C22): os três primeiros com o custo mensal
      // (pago no dia 1º) e a descrição; a moda, só a descrição.
      moradia: custoMensal(),
      estiloDeVida: custoMensal(),
      traumaTeam: custoMensal(),
      moda: texto(),
      // O extrato de Eurodólares, IP e Reputação (o ledger do CORE): cada mudança com a data, a diferença, o saldo, o
      // motivo e quem mudou (AtorCPR.mudarComExtrato e o _preUpdate).
      extratos: new fields.SchemaField(Object.fromEntries(Object.keys(EXTRATOS).map(campo => [campo, extrato()]))),
      // As notas de ciberpsicose (as maquetes do usuário): os episódios, em texto livre, na aba Cyberware.
      notasCiberpsicose: texto(),
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
    // O BODY do quadro linear externo vestido (o efeito dele vai aqui; o C48, parte 3): 0, sem quadro.
    this.atributos.body.quadro = 0;
  }

  // Depois dos efeitos da fase "initial": derivados com os atributos já modificados.
  prepareDerivedData() {
    const a = this.atributos;
    // O quadro linear externo (o C48, parte 3; a decisão do usuário, como a wiki): o BODY dele vale para tudo, menos o HP e
    // o Death Save, que ficam pelo BODY sem ele.
    const corpo = corpoComQuadro(a.body.valor, a.body.quadro);
    a.body.valor = corpo.valor;
    // Armadura pesada (p. 97): a maior penalidade das armaduras vestidas sai de REF, DEX e MOVE.
    const armaduras = this.parent.items.filter(item => item.type === 'armadura' && item.system.equipada && !item.system.escudo);
    this.penalidadeArmadura = armaduras.reduce((maior, item) => Math.max(maior, Math.abs(item.system.penalidade)), 0);
    for (const chave of ['ref', 'dex', 'move']) a[chave].valor = Math.max(0, a[chave].valor - this.penalidadeArmadura);
    this.hp.max = regras.hpMaximo(corpo.daVida, a.will.valor);
    const instalados = this.parent.items.filter(item => item.type === 'cyberware' && item.system.instalado)
      .map(item => ({ tipo: item.system.tipo, perda: item.system.perdaHumanidade.media }));
    this.humanidade.max = regras.humanidadeMaxima(a.emp.valor, instalados);
    // O atual nunca passa do máximo, venha de onde vier (o C31; o CORE, cpr-actor.js:370-380): o HP e a Humanidade, aqui na
    // memória. Abaixo, fica (a Humanidade negativa é a ciberpsicose extrema; o C21). O que se grava também para no máximo
    // (AtorCPR._preUpdate).
    this.hp.value = Math.min(this.hp.value, this.hp.max);
    this.humanidade.value = Math.min(this.humanidade.value, this.humanidade.max);
    this.sorte.max = a.luck.valor;
    this.empAtual = regras.empAtual(this.humanidade.value, a.emp.valor);
    this.ferimento = regras.estadoDeFerimento(this.hp.value, this.hp.max);
    // Mortalmente ferido: −6 MOVE. As lesões, a armadura e o ferimento tiram MOVE, mas o mínimo é 1 (wiki).
    a.move.valor = regras.moveFinal(a.move.valor, this.ferimento.chave === 'mortal');
    // As Roles (a principal e a segunda) e o que cada uma dá: a Consciência de Combate do Solo (pelos pontos de cada
    // habilidade), os bônus nas perícias (o Moto do Nomad, como o item de Role do CORE), as perícias que só o Medtech tem
    // (a Cirurgia e a Tecnologia Médica, pelas especialidades de Medicina) e a Interface, que é o Rank do Netrunner e dá as
    // Ações NET por turno.
    // A principal conta sempre (as habilidades valem mesmo sem o nome da Role, como antes); a segunda, se tiver nome.
    // this.roles: as que têm nome (o que vai para a wiki).
    const comoRole = role => ({ id: roleDaWiki(role.nome)?.id ?? null, nome: role.nome, rank: role.rank, habilidades: role.habilidades });
    const roles = [comoRole(this.role), ...(this.roleSecundaria.nome ? [comoRole(this.roleSecundaria)] : [])];
    this.roles = roles.filter(role => role.nome);
    Object.assign(this, regras.derivadosDasRoles(roles, HABILIDADES_DE_ROLE));
    this.acoesDeNet = regras.acoesDeNet(this.rankDeInterface);
    // Editor de dor (supressão de dor): tira só a penalidade de gravemente ferido, não a de mortalmente ferido.
    this.penalidade = regras.penalidadeDoFerimento(this.ferimento, this.bonus.supressaoDeDor);
    // Death Save: a penalidade de base vem das lesões que a aumentam; a outra sobe a cada sucesso.
    const lesoes = this.parent.items.filter(item => item.type === 'lesao');
    this.deathSave.base = penalidadeDeDeathSave(lesoes);
    this.deathSave.body = corpo.daVida;
    // Sem a perna, não esquiva (Perna Desmembrada).
    this.semPerna = lesoes.some(item => item.getFlag('cpr-fieldbook', 'catalogo') === 'core_critical-injuries-body:dismembered-leg' || item.name === 'Dismembered Leg');
    // SP de cada local: a maior das armaduras equipadas que cobrem o local.
    this.armadura = Object.fromEntries(['cabeca', 'corpo'].map(local => {
      const item = armaduraDoLocal(this.parent.items, local);
      return [local, { sp: item ? item.system.sp[local].value : 0, max: item ? item.system.sp[local].max : 0, item: item?.id ?? null }];
    }));
    this.spMonitorado = Object.fromEntries(['cabeca', 'corpo'].map(local => {
      const item = armaduraMonitoradaDoLocal(this.parent.items, local, this.armaduraMonitorada[local]);
      return [local, { value: item?.system.sp[local].value ?? 0, max: item?.system.sp[local].max ?? 0 }];
    }));
    this.iniciativa = a.ref.valor + this.bonus.iniciativa + this.consciencia.iniciativa;
  }

  // Nível, atributo e bônus de uma perícia, pela chave. Perícia que o personagem não tem vale 0 no nível.
  pericia(id) {
    const propria = this.pericias[id];
    const base = PERICIAS.find(p => p.id === id);
    const familia = FAMILIAS[propria?.familia || ''];
    // A própria (sem livro nem família): o nome e o STAT dela.
    const ehPropria = !base && !familia && Boolean(propria?.atributo);
    const atributo = base?.atributo || familia?.atributo || (ATRIBUTOS.includes(propria?.atributo) ? propria.atributo : 'int');
    const nome = base ? base.nome : ehPropria ? propria.nome : `${familia?.nome || ''}${propria?.nome ? ` (${propria.nome})` : ''}`;
    // Os efeitos somam na perícia e na família dela; a Detecção de Ameaça do Solo soma na Percepção.
    const bonus = (this.bonus.pericias[id] || 0) + (propria?.familia ? this.bonus.pericias[propria.familia] || 0 : 0)
      + (id === 'perception' ? this.consciencia?.percepcao || 0 : 0);
    // O bônus da Role ({ rotulo, valor }), na perícia ou na família dela.
    const role = this.bonusDeRole?.[id] ?? (propria?.familia ? this.bonusDeRole?.[propria.familia] : null) ?? null;
    return { id, nome, atributo, nivel: propria?.nivel ?? 0, bonus, role, dificil: Boolean(base?.dificil ?? familia?.dificil), propria: ehPropria };
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

// ---------------- O contêiner ----------------
// O contêiner (o container do CORE 0.92.4): a loja, o saque, o esconderijo ou um personalizado. O tipo liga as permissões
// dos jogadores (regras.permissoesDoTipo, no _preCreate e no _preUpdate do ator); no personalizado, o mestre marca cada
// uma. O dinheiro, com o extrato, é o da loja (no saque, a ficha não mostra, como o "N/A" do CORE).
export class DadosConteiner extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      tipo: new fields.StringField({ required: true, blank: false, initial: 'loja', choices: Object.keys(TIPOS_DE_CONTEINER) }),
      permissoes: new fields.SchemaField(Object.fromEntries(Object.keys(PERMISSOES_DO_CONTEINER).map(chave => [chave, new fields.BooleanField({ initial: chave === 'vender' })]))),
      dinheiro: inteiro(0),
      extratos: new fields.SchemaField({ dinheiro: extrato() }),
      // O que a loja compra dos jogadores (o vendor do CORE): cada tipo, se compra e por quantos por cento do preço.
      compra: new fields.SchemaField(Object.fromEntries(TIPOS_QUE_A_LOJA_COMPRA.map(tipo => [tipo, new fields.SchemaField({
        compra: new fields.BooleanField({ initial: true }), porcentagem: inteiro(100, { min: 0 })
      })]))),
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
      // CORE 0.93, attackable-schema.js:29-57: zero seis impede o crítico; bônus zero só tira o dano extra.
      // O bônus vazio conserva o do perfil existente (5 do RED, 10 da Power), sem migrar armas antigas.
      critico: new fields.SchemaField({
        seis: inteiro(2, { min: 0 }),
        bonus: new fields.NumberField({ required: true, nullable: true, integer: true, initial: null, min: 0 })
      }),
      cdt: inteiro(1, { min: 0 }),
      pente: recurso(0, 0),
      municoes: new fields.ArrayField(new fields.StringField()),
      // Id (no ator) do item de munição que está no pente.
      carregada: texto(),
      instaladoEm: texto(),
      aDistancia: new fields.BooleanField({ initial: true }),
      maos: inteiro(1, { min: 0 }),
      autofogo: inteiro(0, { min: 0 }),
      supressivo: new fields.BooleanField({ initial: false }),
      bonusAtaque: inteiro(0),
      qualidade: texto('standard'),
      // O critFailEffect do CORE: consequência informada no cartão quando a arma ruim tem falha crítica.
      falhaCritica: texto('jammed'),
      ocultavel: new fields.BooleanField({ initial: false }),
      tabelaDV: texto(),
      ignorarArmadura: inteiro(0, { min: 0, max: 100 }),
      // Briga e Artes Marciais (o C10): o dano pela tabela do BODY do dono (o unarmedAutomaticCalculation do CORE).
      danoPeloBody: new fields.BooleanField({ initial: true }),
      ignorarAbaixo: inteiro(0, { min: 0 }),
      // Slots de acessório (3 na arma de longo alcance que não é exótica).
      slots: inteiro(0, { min: 0 }),
      // A Combinação do Black Chrome (o C48, parte 2): o outro modo da arma (o nome dele e os campos de arma), que vira uma
      // arma ligada a esta, como a do acessório (armas-cyberware.mjs). ataca: false nas outras armas.
      combinacao: armaMontada({ modo: texto() }),
      equipada: new fields.BooleanField({ initial: false }),
      preco: inteiro(0, { min: 0 }),
      fonte: fonte()
    };
  }

  // Com um carregador instalado (um upgrade do mesmo ator com instaladoEm = esta arma), o pente é o dele. A wiki diz que
  // só cabe um carregador por vez; com mais de um, vale o maior.
  prepareDerivedData() {
    const item = this.parent;
    this.pente.max = regras.penteComCarregador(this.pente.max, item?.actor?.items.filter(outro => outro.type === 'upgrade' && outro.system.instaladoEm === item.id).map(a => a.system.modificadores.pente));
  }
}

export class DadosArmadura extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...eletronica(),
      descricao: new fields.HTMLField({ required: true, blank: true, initial: '' }),
      sp: new fields.SchemaField({ cabeca: recurso(0, 0), corpo: recurso(11, 11) }),
      penalidade: inteiro(0),
      escudo: new fields.BooleanField({ initial: false }),
      pvEscudo: recurso(0, 0),
      // A aparência de moda do Black Chrome (o C48, parte 3): o estilo de roupa que a armadura parece (config.ESTILOS_ROUPA),
      // ou vazio.
      moda: texto(),
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
      // O pacote em que o preço vale (o C48; 0 = o da variedade, regras.precoDaUnidade).
      lote: inteiro(0, { min: 0 }),
      ablacao: inteiro(1, { min: 0 }),
      // CORE 0.93, ammo-datamodel.js:60-86: só a munição que pede substitui o crítico da arma.
      critico: new fields.SchemaField({
        substitui: new fields.BooleanField({ initial: false }),
        seis: inteiro(2, { min: 0 }),
        bonus: inteiro(5, { min: 0 })
      }),
      preco: inteiro(0, { min: 0 }),
      fonte: fonte()
    };
  }
}

export class DadosCyberware extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...eletronica(true),
      descricao: new fields.HTMLField({ required: true, blank: true, initial: '' }),
      tipo: texto(),
      fundacional: new fields.BooleanField({ initial: false }),
      tamanho: inteiro(0, { min: 0 }),
      // A fundação: os slots de opção que ela abre (o CORE e a wiki). A opção: o id, no mesmo ator, da fundação onde está;
      // vazio, sem fundação (regras.pedeFundacao: a fashionware e o cyberware interno e externo usam os slots de categoria).
      slots: inteiro(0, { min: 0 }),
      instaladoEm: texto(),
      // O lado do cyberbraço, da cyberperna e do cyberolho (regras.LADOS_DO_CYBERWARE, os ids da wiki); vazio, sem lado. A
      // opção numa fundação fica no lado da fundação (o ladoDoCyberware do item).
      lado: texto(),
      // Fórmula e média do livro; "sofrida" é o quanto custou na instalação (volta se tirar).
      perdaHumanidade: new fields.SchemaField({ formula: texto('0'), media: inteiro(0, { min: 0 }), sofrida: inteiro(0, { min: 0 }) }),
      local: texto('mall'),
      instalado: new fields.BooleanField({ initial: false }),
      // O cyberware que é arma (o C11; o isWeapon do CORE): instalado, ataca pela arma ligada a ele.
      arma: armaMontada(),
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
      ...eletronica(),
      descricao: new fields.HTMLField({ required: true, blank: true, initial: '' }),
      quantidade: inteiro(1, { min: 0 }),
      uso: usoDoItem('carregando'),
      ativacao: new fields.StringField({ required: true, blank: false, initial: 'carregando', choices: Object.keys(ATIVACOES) }),
      ocultavel: new fields.BooleanField({ initial: false }),
      preco: inteiro(0, { min: 0 }),
      fonte: fonte()
    };
  }
}

export class DadosRoupa extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...eletronica(),
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
      ...eletronica(true),
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
      ...eletronica(),
      descricao: new fields.HTMLField({ required: true, blank: true, initial: '' }),
      alvo: new fields.StringField({ required: true, blank: false, initial: 'arma', choices: Object.keys(ALVOS_UPGRADE) }),
      tamanho: inteiro(1, { min: 0 }),
      instaladoEm: texto(),
      modificadores: new fields.SchemaField({ pente: inteiro(0, { min: 0 }), ataque: inteiro(0), sdp: inteiro(0), assentos: inteiro(0) }),
      // O acessório que é arma (o C11; o secondaryWeapon do CORE: a baioneta, a arma sob o cano): instalado numa arma, ataca
      // pela arma ligada a ele, com a arma onde está equipada.
      arma: armaMontada(),
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
      ...estadoDoVeiculo(),
      familia: new fields.BooleanField({ initial: false }),
      // O Black Chrome (o C48, parte 4): o Acesso Nômade (o Rank de Moto a partir do qual o Nomad pega o veículo para a
      // frota da família; 0, sem) e os vidros à prova de balas que o veículo já traz de fábrica (o chassi blindado é o sp).
      acessoNomade: inteiro(0, { min: 0 }),
      vidros: inteiro(0, { min: 0 }),
      // Cada janela perde HP separadamente (CORE, Bulletproof Glass). O máximo fica persistido para não curar o vidro.
      janelas: new fields.TypedObjectField(new fields.SchemaField({ nome: texto('Janela'), hp: recurso(0, 0) })),
      preco: inteiro(0, { min: 0 }),
      fonte: fonte()
    };
  }

  prepareDerivedData() {
    const item = this.parent;
    const upgrades = item?.actor?.items.filter(outro => outro.type === 'upgrade' && outro.system.instaladoEm === item.id) ?? [];
    const protecoes = protecoesDoVeiculo(upgrades, { vidros: this.vidros });
    const max = Math.max(this.sp, protecoes.sp);
    this.blindagem = { max, sp: Math.max(0, max - this.ablacao) };
    this.vidroMax = protecoes.vidro;
    // Os upgrades somam no SDP e nos assentos, positivos ou negativos (o C43), nunca abaixo de 0; o SDP de agora não passa
    // do máximo.
    this.sdp.max = regras.somaDeUpgrades(this.sdp.max, upgrades.map(upgrade => upgrade.system.modificadores.sdp));
    this.sdp.value = Math.min(this.sdp.value, this.sdp.max);
    this.assentos = regras.somaDeUpgrades(this.assentos, upgrades.map(upgrade => upgrade.system.modificadores.assentos));
  }
}

// C46, parte 1: presença física na cena. A posse e os upgrades continuam no item até as partes seguintes.
export class DadosAtorVeiculo extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return { ...estadoDoVeiculo(), notas: new fields.HTMLField({ required: true, blank: true, initial: '' }) };
  }

  prepareDerivedData() {
    this.sdp.value = Math.max(0, Math.min(this.sdp.value, this.sdp.max));
    this.blindagem = { max: this.sp, sp: Math.max(0, this.sp - this.ablacao) };
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
    if (item.inoperante) return true;
    if (item.type === 'cyberware') return !item.system.instalado;
    if (item.type === 'arma' || item.type === 'armadura') return !item.system.equipada;
    if (item.type === 'programa') return !item.system.ativo || !item.instaladoNo;
    if (item.type === 'equipamento' && item.system.ativacao !== 'manual') return !regras.efeitoValeNoUso(item.system.ativacao, item.system.uso);
    return null;
  }

  get isSuppressed() {
    if (this.situacional.sim || this.foraDeUso) return true;
    const item = this.parent?.parent;
    const tipo = item instanceof Item && tipoDeScanner({ name: item.name, type: item.type, catalogo: item.getFlag(SISTEMA, 'catalogo') });
    if (tipo && item.actor) {
      const candidatos = item.actor.items.contents.flatMap(outro => {
        const grupo = tipoDeScanner({ name: outro.name, type: outro.type, catalogo: outro.getFlag(SISTEMA, 'catalogo') });
        return grupo ? outro.effects.map(efeito => ({ id: efeito.uuid, tipo: grupo, ativo: !efeito.disabled && !efeito.system.foraDeUso && !efeito.duration.expired })) : [];
      });
      if (scannerPreferido(candidatos, tipo) !== this.parent.uuid) return true;
    }
    // null preserva a expiração nativa do Foundry; false substituiria duration.expired.
    return null;
  }
}

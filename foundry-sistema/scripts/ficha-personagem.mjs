// Ficha do personagem (ApplicationV2 do Foundry 14), no visual do modelo da mesa ("Modelo de ficha/"): o cabeçalho com
// a Role, o nome, o apelido e os indicadores (HP, Sorte, dinheiro, IP, reputação), e as abas Perícias (o painel geral:
// atributos, vitais, perícias, armadura, armas, cyberware e lesões), Combate, Equipamento, Cyberware, Role, NET e Vida
// (o Lifepath e as notas). Rola pela ficha: clique no atributo, na perícia ou nos botões da arma.
import { ALVOS_UPGRADE, ATRIBUTOS, caminho, CLASSES_2077, CLASSES_BLACK_ICE, CLASSES_PROGRAMA, ESTILOS_ROUPA, EXTRATOS, LIFEPATH, QUALIDADES, SIGLA, SISTEMA, TIPOS_CYBERWARE, TIPOS_ROUPA, USOS } from './config.mjs';
import { config } from './configuracoes.mjs';
import { abrirExtrato } from './extrato.mjs';
import { acoesDe2077 } from './combate.mjs';
import { roleDaWiki } from './dados.mjs';
import { FAMILIAS, HABILIDADES_DE_ROLE, PERICIAS, ROLES } from './gerado.mjs';
import { DANO_DE_PROGRAMA, formulaDeDano, HABILIDADES_DE_INTERFACE, pontosDeRole, programaDeAtaque, ROLAGENS_DE_ROLE } from './regras.mjs';

const { HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;
const parte = arquivo => ({ template: caminho(`templates/personagem/${arquivo}.hbs`) });
const aba = arquivo => ({ ...parte(arquivo), scrollable: [''] });
// Os blocos que a ficha do capanga também usa (partials: o Foundry os carrega e registra pelo caminho).
export const bloco = arquivo => caminho(`templates/personagem/bloco-${arquivo}.hbs`);
const porcento = (valor, max) => (max > 0 ? Math.max(0, Math.min(100, Math.round((valor / max) * 100))) : 0);
const slug = texto => String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// A janela de rolagem abre no clique; Ctrl (ou ⌘) + clique rola direto. "Rolar direto" (deste navegador) inverte.
const comJanela = evento => Boolean(evento?.ctrlKey || evento?.metaKey) === Boolean(config('rolarDireto'));
// As perícias mais altas ficam em destaque no painel geral, como no modelo.
const EM_DESTAQUE = 6;

export class FichaPersonagem extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    // O visual do modelo é escuro: a ficha fica no tema escuro do Foundry, qualquer que seja o tema da interface.
    classes: [SISTEMA, 'ficha-personagem', 'themed', 'theme-dark'],
    position: { width: 1060, height: 900 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      rolarAtributo: FichaPersonagem.#rolarAtributo,
      rolarPericia: FichaPersonagem.#rolarPericia,
      rolarRole: FichaPersonagem.#rolarRole,
      rolarFacedown: FichaPersonagem.#rolarFacedown,
      rolarInterface: FichaPersonagem.#rolarInterface,
      rolarDanoDoZap: FichaPersonagem.#rolarDanoDoZap,
      ativarPrograma: FichaPersonagem.#ativarPrograma,
      atacarComPrograma: FichaPersonagem.#atacarComPrograma,
      rolarDanoDePrograma: FichaPersonagem.#rolarDanoDePrograma,
      perderRez: FichaPersonagem.#perderRez,
      restaurarRez: FichaPersonagem.#restaurarRez,
      alternarPericias: FichaPersonagem.#alternarPericias,
      novaPericia: FichaPersonagem.#novaPericia,
      tirarPericia: FichaPersonagem.#tirarPericia,
      atacar: FichaPersonagem.#atacar,
      mirar: FichaPersonagem.#mirar,
      deathSave: FichaPersonagem.#deathSave,
      zerarDeathSave: FichaPersonagem.#zerarDeathSave,
      rolarDano: FichaPersonagem.#rolarDano,
      recarregar: FichaPersonagem.#recarregar,
      prepararSorte: FichaPersonagem.#prepararSorte,
      abrirExtrato: FichaPersonagem.#abrirExtrato,
      recarregarSorte: FichaPersonagem.#recarregarSorte,
      alternarCoronha: FichaPersonagem.#alternarCoronha,
      equipar: FichaPersonagem.#equipar,
      mudarUso: FichaPersonagem.#mudarUso,
      instalar: FichaPersonagem.#instalar,
      editarItem: FichaPersonagem.#editarItem,
      apagarItem: FichaPersonagem.#apagarItem
    }
  };

  static PARTS = {
    topo: parte('topo'),
    tabs: { template: 'templates/generic/tab-navigation.hbs' },
    pericias: { ...aba('pericias'), templates: [bloco('geral')] },
    combate: { ...aba('combate'), templates: [bloco('armas')] },
    equipamento: aba('equipamento'),
    cyberware: aba('cyberware'),
    role: aba('role'),
    net: aba('net'),
    vida: aba('vida'),
    rodape: parte('rodape')
  };

  static TABS = {
    primary: {
      tabs: [
        { id: 'pericias', label: 'Perícias', icon: 'fa-solid fa-list-check' }, { id: 'combate', label: 'Combate', icon: 'fa-solid fa-crosshairs' },
        { id: 'equipamento', label: 'Equipamento', icon: 'fa-solid fa-briefcase' }, { id: 'cyberware', label: 'Cyberware', icon: 'fa-solid fa-microchip' },
        { id: 'role', label: 'Role', icon: 'fa-solid fa-id-badge' }, { id: 'net', label: 'NET', icon: 'fa-solid fa-network-wired' },
        { id: 'vida', label: 'Vida', icon: 'fa-solid fa-book-open' }
      ],
      initial: 'pericias'
    }
  };

  // Todas as perícias ou só as que têm nível (o painel geral). Sem escolha, todas quando nenhuma tem nível.
  #todasAsPericias = null;

  async _prepareContext(options) {
    const contexto = await super._prepareContext(options);
    const ator = this.actor;
    const s = ator.system;
    const fonte = ator._source.system;
    const itens = tipo => ator.items.filter(item => item.type === tipo).sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name, 'pt-BR'));
    // Armas de 2077: os botões dos modos, os avisos e o teste Smart no lugar de REF + perícia (combate.mjs).
    const linhaArma = arma => {
      const de2077 = acoesDe2077(arma);
      const { partes } = arma.partesDoAtaque(null, { smart: de2077.smart });
      return { id: arma.id, nome: arma.name, img: arma.img, sistema: arma.system, ataque: partes.reduce((soma, p) => soma + p.valor, 0), municao: arma.municaoCarregada?.name ?? '', qualidade: QUALIDADES[arma.system.qualidade] ?? '', acessorios: arma.instalados.map(item => item.name).join(', '),
        classe2077: CLASSES_2077[arma.perfil2077?.classe] ?? '', modos2077: de2077.modos, alternar2077: de2077.alternar, avisos2077: de2077.avisos,
        dicaAtaque: de2077.dicaAtaque, balasAutofogo: de2077.balasAutofogo,
        resumo: [arma.system.dano, `CDT ${arma.system.cdt}`, arma.system.pente.max ? `${arma.system.pente.value}/${arma.system.pente.max}` : ''].filter(Boolean).join(' // ') };
    };
    const armas = itens('arma').map(linhaArma);

    // Perícias: as comuns sempre (nível 0 também) e as de família que o personagem tem. No painel geral, só as que têm
    // nível (das mais altas para as mais baixas) ou todas, no grupo de cada uma.
    const linhaPericia = id => {
      const p = s.pericia(id);
      const total = s.atributos[p.atributo].valor + p.nivel + p.bonus + (p.role?.valor ?? 0) + s.penalidade;
      return { ...p, familia: Boolean(s.pericias[id]?.familia), sigla: SIGLA[p.atributo], total,
        dica: `${SIGLA[p.atributo]} + ${p.nome} + 1d10${p.bonus ? ` (bônus +${p.bonus})` : ''}${p.role ? ` (${p.role.rotulo} +${p.role.valor})` : ''}`,
        dicaTotal: `Atributo + nível${p.bonus ? ' + bônus' : ''}${p.role ? ` + ${p.role.rotulo}` : ''}${s.penalidade ? ` ${s.penalidade} do ferimento` : ''}, sem o dado` };
    };
    const todas = [...PERICIAS.map(p => linhaPericia(p.id)), ...Object.entries(s.pericias).filter(([, propria]) => propria.familia).map(([id]) => linhaPericia(id))];
    const comNivel = todas.filter(p => p.nivel > 0).sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, 'pt-BR'));
    comNivel.slice(0, EM_DESTAQUE).forEach(p => { p.alta = true; });
    const mostrarTodas = this.#todasAsPericias ?? comNivel.length === 0;
    // Tirar uma perícia de família só na lista completa, onde a lista se edita.
    if (mostrarTodas) for (const p of todas) p.tirar = p.familia;
    const grupoDe = p => PERICIAS.find(base => base.id === p.id)?.grupo ?? FAMILIAS[s.pericias[p.id]?.familia]?.grupo ?? 'Educação';
    const grupos = Map.groupBy(todas, grupoDe);
    const linhasDePericia = mostrarTodas
      ? [...grupos.entries()].sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
        .flatMap(([grupo, lista]) => [{ grupo }, ...lista.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))])
      : comNivel;

    // Inventário: um detalhe de cada tipo e o uso (o botão passa por equipado, carregando e guardado).
    const vezes = item => (item.system.quantidade > 1 ? `×${item.system.quantidade}` : '');
    const linhaDoInventario = (item, ...detalhes) => ({
      id: item.id, nome: item.name, img: item.img, detalhe: detalhes.filter(Boolean).join(' · '), equipado: item.system.uso === 'equipado', guardado: item.system.uso === 'guardado',
      usoNome: USOS[item.system.uso] ?? item.system.uso
    });
    const sp = (armadura, local) => (armadura.system.sp[local].max ? `${local === 'cabeca' ? 'cabeça' : 'corpo'} ${armadura.system.sp[local].value}/${armadura.system.sp[local].max}` : '');
    const armaduras = itens('armadura').map(armadura => ({
      id: armadura.id, nome: armadura.name, img: armadura.img, equipada: armadura.system.equipada,
      detalhe: [sp(armadura, 'cabeca'), sp(armadura, 'corpo'), armadura.system.escudo ? `escudo ${armadura.system.pvEscudo.value}/${armadura.system.pvEscudo.max} PV` : '',
        armadura.system.penalidade ? `penalidade ${armadura.system.penalidade}` : ''].filter(Boolean).join(' · ')
    }));
    const cyberwares = itens('cyberware').map(item => ({ id: item.id, nome: item.name, img: item.img, sistema: item.system, tipo: TIPOS_CYBERWARE[item.system.tipo] ?? item.system.tipo, efeitos: item.effects.map(e => e.name).join(', ') }));
    // As lesões, com o paliativo e o tratamento (as DVs de cada perícia).
    const dvs = pares => pares.filter(([, dv]) => dv).map(([pericia, dv]) => `${pericia} DV${dv}`).join(' ou ');
    const lesoes = itens('lesao').map(item => {
      const { paliativo, tratamento } = item.system;
      const p = dvs([['Primeiros Socorros', paliativo.primeirosSocorros], ['Paramédico', paliativo.paramedico]]);
      const t = dvs([['Paramédico', tratamento.paramedico], ['Cirurgia', tratamento.cirurgia]]);
      return { id: item.id, nome: item.name, img: item.img, sistema: item.system, tratar: [p && `PALIATIVO: ${p}`, t && `TRATAMENTO: ${t}`].filter(Boolean).join(' // '),
        resumo: item.system.descricao.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' Paliativo:')[0] };
    });

    // Iniciativa e esquiva (a esquiva média, sem o dado).
    const esquiva = ator.partesDaPericia('evasion').partes.reduce((soma, p) => soma + p.valor, 0);
    // O Facedown sem o dado (COOL, Reputação e as penalidades), com a conta na dica.
    const partesDoFacedown = ator.partesDoFacedown({ situacionais: [] });
    const facedown = { valor: partesDoFacedown.reduce((soma, p) => soma + p.valor, 0), dica: `${partesDoFacedown.map(p => `${p.rotulo} ${p.valor}`).join(' + ')} + 1d10: teste enfrentado` };
    const bonusDeIniciativa = s.iniciativa - s.atributos.ref.valor;

    // A Role: a do RED da wiki e as especialidades (Solo, Tech, Medtech) com os pontos; o efeito de cada uma do Solo.
    const role = roleDaWiki(s.role.nome);
    const especialidades = role && HABILIDADES_DE_ROLE[role.id];
    const efeitoDoSolo = {
      'Initiative Reaction': s.consciencia.iniciativa && `+${s.consciencia.iniciativa} na Iniciativa`,
      'Precision Attack': s.consciencia.ataque && `+${s.consciencia.ataque} no ataque`,
      'Spot Weakness': s.consciencia.pontoFraco && `+${s.consciencia.pontoFraco} no dano`,
      'Threat Detection': s.consciencia.percepcao && `+${s.consciencia.percepcao} em Percepção`,
      'Damage Deflection': s.consciencia.deflexao && `−${s.consciencia.deflexao} no dano sofrido`,
      'Fumble Recovery': s.consciencia.semFalhaCritica && 'sem falha crítica'
    };
    // As especialidades e as perícias que vêm delas (as do Medtech: a ficha calcula, não ficam entre as outras).
    const daEspecialidade = new Set([...(especialidades?.itens ?? []), ...(especialidades?.derivadas ?? [])].map(item => item.id));
    // Os bônus da Role nas perícias (regras.bonusDeRole): o Moto do Nomad soma sempre.
    const nomeDaPericia = id => PERICIAS.find(p => p.id === id)?.nome ?? FAMILIAS[id]?.nome ?? id;
    const ativos = Object.entries(s.bonusDeRole);
    const bonusDaRole = ativos.length ? { rotulo: ativos[0][1].rotulo, valor: ativos[0][1].valor, pericias: ativos.map(([id]) => nomeDaPericia(id)).join(', ') } : null;

    // NET: os cyberdecks (com o que está instalado) e os programas; a Interface é o Rank do Netrunner.
    const decks = itens('cyberdeck').map(deck => linhaDoInventario(deck, deck.system.ram ? `RAM ${deck.system.ram}` : '', `${deck.slotsUsados}/${deck.system.slots} slots`, deck.instalados.map(item => item.name).join(', ')));
    // A Interface: as rolagens (com o valor sem o dado) pelo cyberdeck equipado, como o CORE, e as Ações NET pelo Rank.
    const net = {
      rank: s.rankDeInterface, acoes: s.acoesDeNet, deck: itens('cyberdeck').find(deck => deck.system.uso === 'equipado')?.name ?? '',
      habilidades: HABILIDADES_DE_INTERFACE.map(h => ({ ...h, valor: ator.partesDaInterface(h.id, { situacionais: [] }).reduce((soma, p) => soma + p.valor, 0) }))
    };

    return Object.assign(contexto, {
      ator, sistema: s, fonte, editavel: this.isEditable, versao: game.system.version, daWiki: Boolean(ator.getFlag(SISTEMA, 'wiki')), sortePreparada: ator.sortePreparada,
      roles: ROLES,
      // Eurodólares, IP e Reputação: o botão do cabeçalho abre o extrato (como o ledger do CORE).
      extratos: [['dinheiro', 'EURODÓLARES'], ['pontosDeMelhoria', 'IP'], ['reputacao', 'REPUTAÇÃO']].map(([campo, sigla]) => ({
        campo, sigla, valor: s[campo], dica: `${EXTRATOS[campo].rotulo}: somar, subtrair ou definir, com o motivo; e o histórico`
      })),
      extratoRecente: s.extratos.dinheiro.slice(-5).reverse().map(linha => ({
        mudanca: linha.acao === 'definir' ? `= ${linha.saldo} eb` : `${linha.delta > 0 ? '+' : '−'}${Math.abs(linha.delta)} eb`, saldo: linha.saldo, motivo: linha.motivo, usuario: linha.usuario,
        quando: linha.quando ? new Date(linha.quando).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '',
        classe: linha.delta > 0 ? 'entrou' : linha.delta < 0 ? 'saiu' : ''
      })),
      atributos: ATRIBUTOS.map(chave => ({ chave, sigla: SIGLA[chave], valor: s.atributos[chave].valor, base: fonte.atributos[chave].valor })),
      vitais: { hp: porcento(s.hp.value, s.hp.max), humanidade: porcento(s.humanidade.value, s.humanidade.max), grave: Math.ceil(s.hp.max / 2) },
      deathSavePenalidade: s.deathSave.base + s.deathSave.penalidade,
      todasAsPericias: mostrarTodas, linhasDePericia, periciasComNivel: comNivel.length, periciasSemNivel: todas.length - comNivel.length, periciasTotal: todas.length,
      armas, armasEquipadas: armas.filter(arma => arma.sistema.equipada),
      armaduras, armadurasVestidas: armaduras.filter(armadura => armadura.equipada),
      cyberwares, cyberInstalado: cyberwares.filter(item => item.sistema.instalado).map(item => ({ ...item, detalhe: [item.tipo, item.sistema.perdaHumanidade.sofrida ? `Humanidade −${item.sistema.perdaHumanidade.sofrida}` : ''].filter(Boolean).join(' // ') })),
      lesoes,
      iniciativa: { valor: s.iniciativa, dica: `REF ${s.atributos.ref.valor}${bonusDeIniciativa ? ` + ${bonusDeIniciativa} (cyberware e Role)` : ''}` },
      esquiva, podeEsquivarTiro: s.atributos.ref.valor >= 8, facedown,
      municoes: itens('municao'),
      inventario: [
        { titulo: 'EQUIPAMENTO', vazio: 'Sem equipamento.', itens: itens('equipamento').map(item => linhaDoInventario(item, vezes(item), item.effects.filter(e => e.active).map(e => e.name).join(', '))) },
        { titulo: 'ROUPAS', vazio: 'Sem roupas.', itens: itens('roupa').map(item => linhaDoInventario(item, vezes(item), TIPOS_ROUPA[item.system.tipo], ESTILOS_ROUPA[item.system.estilo])) },
        { titulo: 'DROGAS', vazio: 'Sem drogas.', itens: itens('droga').map(item => linhaDoInventario(item, `${item.system.quantidade} ${item.system.quantidade === 1 ? 'dose' : 'doses'}`)) }
      ],
      decks,
      programas: itens('programa').map(p => ({
        id: p.id, nome: p.name, img: p.img,
        detalhe: [
          CLASSES_PROGRAMA[p.system.classe] ?? p.system.classe,
          p.system.classe === 'quickhack' ? `RAM ${p.system.ram}` : p.system.classe === 'daemon' ? `REZ ${p.system.rez}`
            : p.system.classe === 'blackice' ? `${CLASSES_BLACK_ICE[p.system.tipoDeIce] ?? p.system.tipoDeIce} · PER ${p.system.per} · SPD ${p.system.spd} · ATK ${p.system.atk} · DEF ${p.system.def}`
              : `ATK ${p.system.atk} · DEF ${p.system.def}`,
          p.instaladoNo ? `no ${p.instaladoNo.name}` : 'fora do deck'
        ].join(' · '),
        // O de ataque (num deck, com Interface) ataca e rola o dano; o que tem REZ ativa, perde e restaura REZ.
        ataque: programaDeAtaque(p.system.classe) && Boolean(p.instaladoNo) && s.rankDeInterface > 0 && { total: s.rankDeInterface + p.system.atk },
        danos: programaDeAtaque(p.system.classe) && p.instaladoNo && s.rankDeInterface > 0
          ? DANO_DE_PROGRAMA[p.system.classe].map(dano => ({ ...dano, formula: formulaDeDano(p.system.dano[dano.id]) })).filter(dano => dano.formula) : [],
        rez: p.system.rez && !['quickhack', 'daemon'].includes(p.system.classe) ? { atual: p.rezAtual, max: p.system.rez } : null,
        ativo: p.system.ativo, podeAtivar: Boolean(p.instaladoNo) && !programaDeAtaque(p.system.classe)
      })),
      net,
      veiculos: itens('veiculo').map(v => ({
        id: v.id, nome: v.name, img: v.img,
        detalhe: [`SDP ${v.system.sdp.value}/${v.system.sdp.max}`, `${v.system.assentos} assentos`, `MOVE ${v.system.velocidade.combate}`, v.system.familia ? 'da família' : '', v.instalados.map(i => i.name).join(', ')].filter(Boolean).join(' · ')
      })),
      upgrades: itens('upgrade').map(u => ({
        id: u.id, nome: u.name, img: u.img,
        detalhe: [ALVOS_UPGRADE[u.system.alvo] ?? u.system.alvo, `${u.system.tamanho} ${u.system.tamanho === 1 ? 'slot' : 'slots'}`, u.instaladoNo ? `em ${u.instaladoNo.name}` : 'não instalado'].join(' · ')
      })),
      roleDaWiki: role, bonusDaRole, rolagensDaRole: (role && ROLAGENS_DE_ROLE[role.id]) ?? [],
      especialidades: especialidades && this.#especialidades(especialidades, role, efeitoDoSolo),
      outrasHabilidades: Object.entries(s.role.habilidades).filter(([nome]) => !daEspecialidade.has(nome)).map(([nome, pontos]) => ({ nome, pontos })),
      lifepath: LIFEPATH.map(({ chave, rotulo }) => ({ chave, rotulo, valor: s.lifepath[chave], largo: ['amigos', 'inimigos', 'amores', 'role'].includes(chave), linhas: chave === 'role' ? 4 : 2 })),
      notasRicas: await foundry.applications.ux.TextEditor.implementation.enrichHTML(s.notas, { relativeTo: ator, secrets: ator.isOwner })
    });
  }

  // As especialidades da Role com os pontos de cada uma e a conferência do Rank (regras.mjs, pontosDeRole): o total
  // distribuído contra o do Rank e cada uma contra o máximo. Só avisa: quem decide é a mesa.
  #especialidades(especialidades, role, efeitoDoSolo) {
    const { habilidades, rank } = this.actor.system.role;
    const { total, max } = pontosDeRole(role.id, rank);
    const itens = especialidades.itens.map(item => {
      const pontos = Number(habilidades[item.id]) || 0;
      return { ...item, pontos, acima: pontos > max, efeito: role.id === 'solo' ? efeitoDoSolo[item.id] || '' : '' };
    });
    const distribuidos = itens.reduce((soma, item) => soma + item.pontos, 0);
    // As perícias que vêm das especialidades (a Cirurgia e a Tecnologia Médica do Medtech), com o nível e a conta.
    const nomeDe = id => itens.find(item => item.id === id)?.nome ?? id;
    const derivadas = (especialidades.derivadas ?? []).map(({ id, de, max: teto }) => ({
      id, nome: ROLAGENS_DE_ROLE[role.id]?.find(rolagem => rolagem.derivada === id)?.rotulo ?? id, nivel: this.actor.system.periciasDeRole[id] ?? 0,
      conta: `${Object.entries(de).map(([especialidade, fator]) => (fator === 1 ? nomeDe(especialidade) : `${fator} por ponto de ${nomeDe(especialidade)}`)).join(' + ')}${teto ? `, até ${teto}` : ''}`
    }));
    return { ...especialidades, itens, derivadas, distribuidos, total, max, rank, passou: distribuidos > total, sobra: Math.max(0, total - distribuidos), acima: itens.filter(item => item.acima).map(item => item.nome).join(', ') };
  }

  async _preparePartContext(partId, contexto, options) {
    contexto = await super._preparePartContext(partId, contexto, options);
    if (contexto.tabs?.[partId]) contexto.tab = contexto.tabs[partId];
    return contexto;
  }

  // ---------------- Ações ----------------
  #item(alvo) {
    return this.actor.items.get(alvo.closest('[data-item-id]')?.dataset.itemId);
  }
  static #rolarAtributo(evento, alvo) { return this.actor.rolarAtributo(alvo.dataset.atributo, { perguntar: comJanela(evento) }); }
  static #rolarPericia(evento, alvo) { return this.actor.rolarPericia(alvo.dataset.pericia, { perguntar: comJanela(evento) }); }
  static #rolarFacedown(evento) { return this.actor.rolarFacedown({ perguntar: comJanela(evento) }); }
  static #rolarInterface(evento, alvo) { return this.actor.rolarInterface(alvo.dataset.habilidade, { perguntar: comJanela(evento) }); }
  static #rolarDanoDoZap() { return this.actor.rolarDanoDoZap(); }
  // O programa ativo (rezzado): os boosters somam na habilidade deles.
  static #ativarPrograma(evento, alvo) {
    const item = this.#item(alvo);
    return item?.update({ 'system.ativo': !item.system.ativo });
  }
  static #atacarComPrograma(evento, alvo) { return this.actor.rolarAtaqueDePrograma(this.#item(alvo), { perguntar: comJanela(evento) }); }
  static #rolarDanoDePrograma(evento, alvo) { return this.#item(alvo)?.rolarDanoDePrograma(alvo.dataset.contra); }
  static #perderRez(evento, alvo) { return this.#item(alvo)?.perderRez(1); }
  static #restaurarRez(evento, alvo) { return this.#item(alvo)?.restaurarRez(); }
  // As Expertises do Tech perguntam antes a perícia do teste.
  static async #rolarRole(evento, alvo) {
    const id = alvo.dataset.rolagem;
    const perguntar = comJanela(evento);
    const rolagem = this.actor.rolagemDeRole(id);
    const pericia = rolagem?.escolherPericia ? await this.#escolherPericia(rolagem) : null;
    if (rolagem?.escolherPericia && !pericia) return null;
    return this.actor.rolarRole(id, { perguntar, pericia });
  }
  // A perícia de uma Expertise do Tech: as do atributo da rolagem (o "varying" do item de Role do CORE), as comuns e as de
  // família que o personagem tem, da mais alta para a mais baixa. Fechada, null.
  #escolherPericia(rolagem) {
    const s = this.actor.system;
    const ids = [...PERICIAS.map(p => p.id), ...Object.entries(s.pericias).filter(([, propria]) => propria.familia).map(([id]) => id)];
    const pericias = ids.map(id => s.pericia(id)).filter(p => p.atributo === rolagem.atributo)
      .sort((a, b) => b.nivel - a.nivel || a.nome.localeCompare(b.nome, 'pt-BR'));
    const opcoes = pericias.map(p => `<option value="${p.id}">${foundry.utils.escapeHTML(p.nome)} (${p.nivel})</option>`).join('');
    return DialogV2.prompt({
      window: { title: rolagem.rotulo }, classes: [SISTEMA, 'escolher-pericia'], rejectClose: false,
      content: `<label>Perícia de ${SIGLA[rolagem.atributo]} <select name="pericia" autofocus>${opcoes}</select></label><p class="dica">${rolagem.formula}</p>`,
      ok: { label: 'Usar esta perícia', callback: (evento, botao) => botao.form.elements.pericia.value }
    });
  }
  static #alternarPericias() {
    this.#todasAsPericias = !(this.#todasAsPericias ?? !Object.values(this.actor.system.pericias).some(p => p.nivel > 0));
    return this.render();
  }
  // Uma perícia de família nova (uma Linguagem, um Especialista Local...): a chave é a família e o nome, como na
  // importação da wiki ("language-streetslang").
  static async #novaPericia() {
    const opcoes = Object.entries(FAMILIAS).map(([id, f]) => `<option value="${id}">${foundry.utils.escapeHTML(f.nome)}</option>`).join('');
    const resposta = await DialogV2.prompt({
      window: { title: 'Perícia de família' }, classes: [SISTEMA, 'nova-pericia'], rejectClose: false,
      content: `<label>Família <select name="familia">${opcoes}</select></label><label>Qual (a língua, o lugar, a ciência...) <input type="text" name="nome" autofocus></label>`,
      ok: { label: 'Acrescentar', callback: (evento, botao) => ({ familia: botao.form.elements.familia.value, nome: botao.form.elements.nome.value.trim() }) }
    });
    if (!resposta?.nome) return null;
    const chave = `${resposta.familia}-${slug(resposta.nome)}`;
    if (this.actor.system.pericias[chave]) { ui.notifications.warn(`${this.actor.name} já tem essa perícia.`); return null; }
    return this.actor.update({ [`system.pericias.${chave}`]: { familia: resposta.familia, nome: resposta.nome, nivel: 0 } });
  }
  static async #tirarPericia(evento, alvo) {
    const chave = alvo.dataset.pericia;
    const nome = this.actor.system.pericia(chave).nome;
    const ok = await DialogV2.confirm({ window: { title: 'Tirar perícia' }, content: `<p>Tirar <b>${foundry.utils.escapeHTML(nome)}</b> da ficha?</p>` });
    return ok ? this.actor.update({ [`system.pericias.${chave}`]: new foundry.data.operators.ForcedDeletion() }) : null;
  }
  static #atacar(evento, alvo) { return this.#item(alvo)?.atacar({ local: alvo.dataset.local || 'corpo', modo: alvo.dataset.modo || null, perguntar: comJanela(evento) }); }
  // Tiro (ou golpe) mirado: escolhe o local e ataca.
  static async #mirar(evento, alvo) {
    const item = this.#item(alvo);
    if (!item) return null;
    const local = await DialogV2.wait({
      window: { title: `Mirar com ${item.name}` }, classes: [SISTEMA, 'mirar'], rejectClose: false,
      content: '<p>Onde mirar? O ataque leva −8.</p><ul><li><b>Cabeça:</b> o dano que passa da armadura dobra.</li><li><b>Perna:</b> se passar dano, Perna quebrada.</li><li><b>Item na mão:</b> se passar dano, o alvo larga o item.</li></ul>',
      buttons: [{ action: 'cabeca', label: 'Cabeça', default: true }, { action: 'perna', label: 'Perna' }, { action: 'item', label: 'Item na mão' }]
    });
    return local ? item.atacar({ local, perguntar: comJanela(evento) }) : null;
  }
  static #deathSave(evento) { return this.actor.rolarDeathSave({ perguntar: comJanela(evento) }); }
  static #zerarDeathSave() { return this.actor.zerarDeathSave(); }
  static #rolarDano(evento, alvo) { return this.#item(alvo)?.rolarDano({ perguntar: comJanela(evento) }); }
  static #recarregar(evento, alvo) { return this.#item(alvo)?.recarregar(); }
  // Sorte: um ponto a mais ou a menos para o próximo teste; no começo da sessão, volta ao máximo.
  static #prepararSorte(evento, alvo) { return this.actor.prepararSorte(this.actor.sortePreparada + Number(alvo.dataset.delta)); }
  static #recarregarSorte() { return this.actor.recarregarSorte(); }
  static #abrirExtrato(evento, alvo) { return abrirExtrato(this.actor, alvo.dataset.campo); }
  // A coronha retrátil (a Dian, de 2077): recolhida, dá para esconder a arma, e os ataques têm −1.
  static #alternarCoronha(evento, alvo) {
    const item = this.#item(alvo);
    return item?.setFlag(SISTEMA, 'coronhaRecolhida', !item.coronhaRecolhida);
  }
  static #equipar(evento, alvo) {
    const item = this.#item(alvo);
    return item?.update({ 'system.equipada': !item.system.equipada });
  }
  static #mudarUso(evento, alvo) {
    const item = this.#item(alvo);
    if (!item) return null;
    const ordem = Object.keys(USOS);
    return item.update({ 'system.uso': ordem[(ordem.indexOf(item.system.uso) + 1) % ordem.length] });
  }
  static #instalar(evento, alvo) {
    const item = this.#item(alvo);
    if (!item) return null;
    return item.system.instalado ? this.actor.desinstalarCyberware(item) : this.actor.instalarCyberware(item, { rolar: !evento.shiftKey });
  }
  static #editarItem(evento, alvo) { return this.#item(alvo)?.sheet.render(true); }
  static async #apagarItem(evento, alvo) {
    const item = this.#item(alvo);
    if (!item) return;
    const ok = await DialogV2.confirm({ window: { title: 'Apagar item' }, content: `<p>Apagar <b>${foundry.utils.escapeHTML(item.name)}</b> da ficha?</p>` });
    if (ok) await item.delete();
  }
}

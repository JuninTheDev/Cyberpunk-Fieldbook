// Importador do Foundry de ponta a ponta: um personagem feito na wiki de teste é importado num Foundry de
// verdade (o do PC, sem janela, com pasta e mundo próprios; tests/lib/foundry.js) e o ator é conferido.
// Só roda com a mesa do servidor vazia: a licença do Foundry vale para uma mesa por vez.
const fs = require('fs');
const path = require('path');
const foundry = require('../lib/foundry');

// Mesa do servidor ocupada? A wiki online diz (/api/estado); sem endereço configurado, não dá para saber.
async function mesaOcupada(raiz) {
  let wiki = process.env.WIKI_ONLINE || '';
  try { wiki = wiki || fs.readFileSync(path.join(raiz, 'servidor', 'endereco.txt'), 'utf8').trim(); } catch { /* sem servidor */ }
  if (!wiki) return '';
  try {
    const estado = await (await fetch(`${wiki.replace(/\/+$/, '')}/api/estado`, { signal: AbortSignal.timeout(8000) })).json();
    return estado.mesa && estado.mesa.usuarios > 0 ? `${estado.mesa.usuarios} pessoa(s) na mesa do servidor` : '';
  } catch { return ''; }
}

module.exports = async ({ edge, servidores, r }) => {
  if (!foundry.disponivel()) { await r.passo('Foundry não instalado neste PC: cenário pulado', async () => [true, '']); return; }
  const ocupada = await mesaOcupada(servidores.raiz);
  if (ocupada) { await r.passo(`mesa do servidor em uso (${ocupada}): cenário pulado`, async () => [true, '']); return; }

  const wiki = servidores.local;
  const api = async (caminho, method = 'GET', body) => (await fetch(`${wiki}${caminho}`, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined })).json();
  const texto = seletor => edge.evaluate(`(document.querySelector(${JSON.stringify(seletor)}) || {}).textContent || ''`);

  // ---------- Personagem na wiki ----------
  // Criado pela API e aberto no criador, que calcula o `resultado` (o que o Foundry importa) e salva.
  const lifepath = { origem: 1, personalidade: 1, roupa: 1, cabelo: 1, adorno: 1, valor: 1, pessoas: 1, pessoa: 1, posse: 1, familia: 1, infancia: 1, crise: 1, meta: 1, amigos: [], inimigos: [], amores: [], role: {} };
  async function criar(doc) {
    const { personagem } = await api('/api/personagens', 'POST', { ...doc, lifepath: { ...lifepath, ...(doc.lifepath || {}) } });
    await edge.ir(`${wiki}/#criador/${personagem.id}`, 1200);
    await edge.evaluate(`document.querySelector('.cc-steps [data-step="7"]').click()`);
    for (let i = 0; i < 30 && !/Salvo/.test(await texto('#cc-save')); i++) await edge.sleep(200);
    return (await api(`/api/personagens/${personagem.id}`)).personagem;
  }
  let solo, tech, medtech, nomad, netrunner, montado;
  const base = { metodo: 'ratoderua', sorteio: { linha: 6 }, lingua: 'Portuguese', casa: 'Heywood' };
  await r.passo('wiki: Solo (Rato de Rua) com o resultado calculado pelo criador', async () => {
    solo = await criar({ ...base, nome: 'Teste Foundry', apelido: 'Lab', role: 'solo', habilidades: { 'Initiative Reaction': 2, 'Threat Detection': 2 }, moradia: 'quitinete', estiloVida: 'bom', traumaTeam: 'prata', estiloModa: 'kitsch' });
    return [solo.resultado && solo.resultado.itens.length > 5 && solo.resultado.moradia.mensal === 2600, `${solo.resultado?.itens.length} itens · ${solo.resultado?.moradia.mensal}eb/mês`];
  });
  await r.passo('wiki: Tech, Medtech e Nomad com as sub-habilidades e a Oficina da Família', async () => {
    tech = await criar({ ...base, nome: 'Teste Tech', role: 'tech', habilidades: { 'Field Expertise': 4, 'Upgrade Expertise': 2, 'Fabrication Expertise': 2 } });
    medtech = await criar({ ...base, nome: 'Teste Medtech', role: 'medtech', tipos: { Science: 'Biology' }, habilidades: { Surgery: 2, 'Medical Tech (Pharmaceuticals)': 1, 'Medical Tech (Cryosystem Operation)': 1 } });
    nomad = await criar({ ...base, nome: 'Teste Nomad', role: 'nomad', escolhas: {}, oficina: ['v:Compact Groundcar', 'u:0:Heavy Chassis', 'u:0:Housing Capacity', 'v:Roadbike'] });
    const veic = nomad.resultado?.veiculos || [];
    return [tech.resultado?.role?.habilidades?.length === 4 && medtech.resultado?.role?.habilidades?.some(h => h.nome === 'Surgery Skill' && h.rank === 4) && veic.length === 2 && veic[0].upgrades.length === 2,
      `tech ${tech.resultado?.role?.habilidades?.length} · medtech ${JSON.stringify(medtech.resultado?.role?.habilidades)} · nomad ${veic.map(v => `${v.nome}+${v.upgrades.length}`).join(', ')}`];
  });

  await r.passo('wiki: Netrunner com o kit do RED e um Solo do Pacote Completo com a montagem mudada', async () => {
    netrunner = await criar({ ...base, nome: 'Teste Netrunner', role: 'netrunner' });
    // Rifle, luneta, munição e dois cyberbraços; o lança-granadas vai no segundo braço (o padrão seria o primeiro).
    const itens = [['rifle', 'core_weapons:assault-rifle', 1], ['luneta', 'core_upgrades:sniping-scope', 1], ['municao', 'core_ammo:rifle-basic', 50],
      ['braco1', 'core_cyberware:cyberarm', 1], ['braco2', 'core_cyberware:cyberarm', 1], ['lanca', 'core_cyberware:popup-grenade-launcher', 1]].map(([uid, id, qtd]) => ({ uid: `loja:${uid}`, id, qtd }));
    montado = await criar({ nome: 'Teste Montagem', role: 'solo', metodo: 'pacote', lingua: 'Portuguese', casa: 'Heywood', itens, montagem: { 'loja:lanca': { em: 'loja:braco2' } } });
    const linhas = Object.fromEntries((montado.resultado?.itens || []).map(item => [item.uid, item]));
    const deckUid = ((netrunner.resultado?.itens || []).find(item => item.id === 'core_gear:cyberdeck') || {}).uid;
    const deck = (netrunner.resultado?.itens || []).filter(item => item.em && item.em === deckUid);
    return [linhas['loja:luneta']?.em === 'loja:rifle' && linhas['loja:rifle']?.municao === 'loja:municao' && linhas['loja:lanca']?.em === 'loja:braco2' && deck.length >= 4,
      `luneta em ${linhas['loja:luneta']?.em} · rifle com ${linhas['loja:rifle']?.municao} · lança-granadas em ${linhas['loja:lanca']?.em} · ${deck.length} programas no deck`];
  });

  // ---------- Foundry ----------
  foundry.limparMundo();
  foundry.preparar();
  const mesa = await foundry.subir();
  const errosAntes = edge.erros.length;
  try {
    await r.passo('Foundry de teste: entra como Gamemaster com o módulo ativo', async () => {
      await foundry.entrarComoMestre(edge, mesa.url);
      await foundry.ativarModulo(edge);
      await edge.evaluate(`game.settings.set('cpr-2077', 'wikiUrl', ${JSON.stringify(wiki)})`);
      const info = await edge.evaluate(`({ gm: game.user.isGM, modulo: !!game.modules.get('cpr-2077')?.active, api: typeof game.modules.get('cpr-2077')?.api?.importarPersonagem })`);
      return [info.gm && info.modulo && info.api === 'function', JSON.stringify(info)];
    });

    // Resumo do ator importado, para as conferências.
    const importar = id => edge.evaluate(`(async () => {
      const { actor, notes } = await game.modules.get('cpr-2077').api.importarPersonagem(${JSON.stringify(id)}, '');
      const s = actor.system;
      const role = actor.itemTypes.role[0];
      return {
        nome: actor.name, notas: notes,
        stats: Object.fromEntries(Object.entries(s.stats).map(([k, v]) => [k, v.value])),
        hp: s.derivedStats.hp.max, humanidade: s.derivedStats.humanity,
        role: role && { nome: role.name, rank: role.system.rank, abilities: role.system.abilities.map(a => [a.name, a.rank]) },
        tipos: Object.fromEntries(Object.entries(actor.itemTypes).map(([k, v]) => [k, v.length])),
        cyberInstalado: actor.itemTypes.cyberware.filter(c => c.system.isInstalled).map(c => c.name),
        armas: actor.itemTypes.weapon.map(w => ({ nome: w.name, equip: w.system.equipped, pente: w.system.magazine?.value, max: w.system.magazine?.max })),
        armaduras: actor.itemTypes.armor.map(a => ({ nome: a.name, equip: a.system.equipped })),
        lifestyle: s.lifestyle, dinheiro: s.wealth?.value,
        veiculos: actor.itemTypes.vehicle.map(v => ({ nome: v.name, upgrades: v.system.installedItems.list.map(id => actor.items.get(id)?.name).filter(Boolean) }))
      };
    })()`);
    const habilidades = ator => Object.fromEntries((ator.role?.abilities || []).map(([nome, rank]) => [nome, rank]));

    let ator;
    await r.passo('importa o Solo: STATs, HP, Role Rank 4 e cyberware instalado', async () => {
      ator = await importar(solo.id);
      const st = solo.resultado.stats;
      const statsOk = ['int', 'ref', 'dex', 'tech', 'cool', 'will', 'move', 'body'].every(k => ator.stats[k] === st[k.toUpperCase()]);
      return [ator.nome === 'Teste Foundry' && statsOk && ator.hp === solo.resultado.derivados.hp && ator.role?.nome === 'Solo' && ator.role.rank === 4 && ator.cyberInstalado.length >= 3,
        `HP ${ator.hp} · ${ator.role?.nome} ${ator.role?.rank} · cyber instalado: ${ator.cyberInstalado.join(', ')} · avisos: ${ator.notas.join(' | ') || 'nenhum'}`];
    });
    await r.passo('importa o Solo: armas carregadas, armaduras vestidas, dinheiro', async () => {
      const equip = [...ator.armas, ...ator.armaduras].every(item => item.equip === 'equipped');
      const carregadas = ator.armas.filter(arma => arma.max > 0).every(arma => arma.pente === arma.max);
      return [ator.armas.length > 0 && ator.armaduras.length > 0 && equip && carregadas && ator.dinheiro === solo.resultado.dinheiro.saldo,
        `armas: ${ator.armas.map(a => `${a.nome} ${a.pente}/${a.max}`).join(', ')} · armaduras: ${ator.armaduras.map(a => a.nome).join(', ')} · ${ator.dinheiro}eb`];
    });
    await r.passo('Solo: Consciência de Combate com os pontos da wiki', async () => {
      const h = habilidades(ator);
      return [h['Initiative Reaction'] === 2 && h['Threat Detection'] === 2 && h['Precision Attack'] === 0, JSON.stringify(h)];
    });
    await r.passo('Solo: moradia, estilo de vida, Trauma Team e moda na ficha', async () => {
      const l = ator.lifestyle;
      return [l.housing.cost === 1500 && /Quitinete/.test(l.housing.description) && l.lifeStyle.cost === 600 && l.traumaTeam.cost === 500 && /Prata/.test(l.traumaTeam.description) && /Kitsch/.test(l.fashion.desription || l.fashion.description || ''),
        JSON.stringify({ moradia: l.housing, estilo: l.lifeStyle, tt: l.traumaTeam, moda: (l.fashion.desription || '').slice(0, 30) })];
    });
    await edge.shot('ator');
    await r.passo('na mesa: a wiki recebe a ficha do Foundry logo depois da importação', async () => {
      const doc = (await api(`/api/personagens/${solo.id}`)).personagem;
      const m = doc.mesa || {};
      const rifle = (m.itens || []).find(item => item.nome === 'Assault Rifle');
      return [m.hp?.max === 45 && m.hp.atual === 45 && rifle?.pente?.atual === 25 && m.sp?.corpo === 11 && m.role?.nome === 'Solo', JSON.stringify({ hp: m.hp, sp: m.sp, rifle: rifle?.pente, municao: rifle?.municao, itens: (m.itens || []).length })];
    });
    await r.passo('na mesa: perder HP e gastar munição no Foundry chega na wiki sozinho', async () => {
      await edge.evaluate(`(async () => {
        const actor = game.actors.find(a => a.getFlag('cpr-2077', 'wiki')?.id === ${JSON.stringify(solo.id)});
        await actor.update({ 'system.derivedStats.hp.value': 30 });
        const rifle = actor.itemTypes.weapon.find(w => w.name === 'Assault Rifle');
        await rifle.update({ 'system.magazine.value': 10 });
      })()`);
      let m = {};
      for (let i = 0; i < 30; i++) { await edge.sleep(500); m = (await api(`/api/personagens/${solo.id}`)).personagem.mesa || {}; if (m.hp?.atual === 30) break; }
      const rifle = (m.itens || []).find(item => item.nome === 'Assault Rifle');
      return [m.hp?.atual === 30 && rifle?.pente?.atual === 10, `HP ${m.hp?.atual} · rifle ${rifle?.pente?.atual}`];
    });
    await r.passo('Tech: as quatro especialidades de Artífice', async () => {
      const h = habilidades(await importar(tech.id));
      return [h['Field Expertise'] === 4 && h['Upgrade Expertise'] === 2 && h['Fabrication Expertise'] === 2 && h['Invention Expertise'] === 0, JSON.stringify(h)];
    });
    await r.passo('Medtech: especialidades e as perícias Cirurgia (2 por ponto) e Tecnologia Médica', async () => {
      const a = await importar(medtech.id);
      const h = habilidades(a);
      return [h.Surgery === 2 && h['Surgery Skill'] === 4 && h['Medical Tech (Pharmaceuticals)'] === 1 && h['Medical Tech (Cryosystem Operation)'] === 1 && h['Medical Tech Skill'] === 2 && !a.notas.length, `${JSON.stringify(h)} · avisos: ${a.notas.join(' | ') || 'nenhum'}`];
    });
    // O que está instalado em cada item do ator (arma, deck, cyberbraço), pelo uid da wiki.
    const instalados = id => edge.evaluate(`(() => {
      const actor = game.actors.find(a => a.getFlag('cpr-2077', 'wiki')?.id === ${JSON.stringify(id)});
      return actor.items.filter(i => i.system.installedItems?.list?.length).map(i => ({ uid: i.getFlag('cpr-2077', 'wikiUid') || '', nome: i.name, pente: i.system.magazine?.value, dentro: i.system.installedItems.list.map(x => actor.items.get(x)?.name) }))
        .concat(actor.itemTypes.ammo.map(a => ({ uid: a.getFlag('cpr-2077', 'wikiUid') || '', nome: a.name, sobra: a.system.amount })));
    })()`);
    await r.passo('Netrunner: os programas do pacote dentro do cyberdeck', async () => {
      await importar(netrunner.id);
      const deck = (await instalados(netrunner.id)).find(item => item.nome === 'Cyberdeck');
      return [deck && deck.dentro.length >= 4, JSON.stringify(deck)];
    });
    await r.passo('montagem: luneta no rifle, rifle carregado (sobram 25), lança-granadas no segundo braço', async () => {
      await importar(montado.id);
      const itens = await instalados(montado.id);
      const rifle = itens.find(item => item.uid === 'loja:rifle');
      const municao = itens.find(item => item.uid === 'loja:municao');
      const braco1 = itens.find(item => item.uid === 'loja:braco1');
      const braco2 = itens.find(item => item.uid === 'loja:braco2');
      return [rifle && rifle.dentro.includes('Sniping Scope') && rifle.pente === 25 && municao?.sobra === 25 && braco2?.dentro.includes('Popup Grenade Launcher') && !(braco1?.dentro || []).includes('Popup Grenade Launcher'),
        JSON.stringify(itens)];
    });
    await r.passo('Nomad: veículos da família, com os upgrades instalados', async () => {
      const a = await importar(nomad.id);
      const carro = a.veiculos.find(v => v.nome === 'Compact Groundcar');
      return [a.veiculos.length === 2 && carro && carro.upgrades.includes('Heavy Chassis') && carro.upgrades.includes('Housing Capacity') && a.veiculos.some(v => v.nome === 'Roadbike'),
        `${JSON.stringify(a.veiculos)} · avisos: ${a.notas.join(' | ') || 'nenhum'}`];
    });
  } finally {
    // Sai do Foundry antes de desligar (senão a página reclama da conexão perdida).
    await edge.send('Page.navigate', { url: 'about:blank' });
    await edge.sleep(500);
    // Erros do próprio Foundry não contam como erro da wiki; os do módulo, sim.
    const doFoundry = edge.erros.splice(errosAntes);
    const doModulo = doFoundry.filter(erro => /cpr-2077/.test(erro));
    edge.erros.push(...doModulo);
    await mesa.parar();
  }

  // ---------- A ficha da wiki com a mesa ----------
  await r.passo('ficha da wiki: depois da importação mostra a mesa (HP 30/45, rifle 10/25)', async () => {
    await edge.ir(`${wiki}/#ficha/${solo.id}`, 1500);
    const t = (await texto('#cc-root')).replace(/\s+/g, ' ');
    await edge.shot('ficha-mesa');
    await edge.evaluate(`document.querySelector('[data-toc="Combate"]').scrollIntoView()`);
    await edge.shot('ficha-mesa-combate');
    return [/Na mesa/.test(t) && /HP 30\/45/.test(t) && /10\/25/.test(t) && /Consciência de Combate/.test(t), (t.match(/Vitais.{0,120}/) || [''])[0]];
  });
};

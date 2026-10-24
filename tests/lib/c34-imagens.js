// C34.3 no navegador, chamado por tests/cenarios/v14.js.
// Lê documentos persistidos e os SVGs servidos pelo Foundry; não chama diretamente a função que escolhe a imagem.
module.exports = async function imagensPadrao(r, edge) {
  await r.passo('C34.3: ícones padrão por tipo no ator, token e item do mundo ou da ficha; cópia, imagem explícita Foundry e textura própria são preservadas', async () => {
    const info = await edge.evaluate(`(async () => {
      const atores = [], itens = [];
      const porTipo = {
        ator: { personagem: 'Default_CPR_Mystery_Man.svg', capanga: 'Default_Mook.svg', conteiner: 'Default_Container.svg', blackice: 'default-blackice.svg', demonio: 'default-demon.svg' },
        item: { arma: 'Default_Weapon.svg', armadura: 'Default_Armor.svg', municao: 'Default_Ammo.svg', cyberware: 'Default_Cyberware.svg', lesao: 'Default_Critical_Injury.svg', equipamento: 'Default_Gear.svg', roupa: 'Default_Clothing.svg', droga: 'Default_Gear.svg', cyberdeck: 'Default_Cyberdeck.svg', programa: 'Default_Program.svg', upgrade: 'Default_Gear.svg', veiculo: 'Default_Vehicle.svg', arquitetura: 'Default_Net_Architecture.svg' }
      };
      const caminho = nome => 'systems/cpr-fieldbook/icones/padrao/' + nome;
      const criarAtor = async dados => { const a = await Actor.implementation.create(dados); atores.push(a); return a; };
      const criarItem = async dados => { const i = await Item.implementation.create(dados); itens.push(i); return i; };
      const retrato = ator => [ator.img, ator.prototypeToken.texture.src];
      try {
        const padraoAtores = [];
        for (const [type, arquivo] of Object.entries(porTipo.ator)) {
          const a = await criarAtor({ name: 'C34.3 Ícone ' + type, type });
          const salvo = game.actors.get(a.id);
          padraoAtores.push({ tipo: type, esperado: caminho(arquivo), retrato: retrato(salvo) });
        }
        const padraoItens = [];
        for (const [type, arquivo] of Object.entries(porTipo.item)) {
          const i = await criarItem({ name: 'C34.3 Ícone ' + type, type });
          padraoItens.push({ tipo: type, esperado: caminho(arquivo), img: game.items.get(i.id).img });
        }
        const dono = atores[0];
        const criados = await dono.createEmbeddedDocuments('Item', Object.keys(porTipo.item).map(type => ({ name: 'C34.3 Item da ficha ' + type, type })));
        const embutidos = criados.map(i => ({ tipo: i.type, esperado: caminho(porTipo.item[i.type]), img: dono.items.get(i.id).img }));
        const custom = await criarAtor({ name: 'C34.3 Retrato próprio', type: 'capanga', img: 'icons/svg/shield.svg' });
        const copia = await criarAtor({ ...custom.toObject(), _id: undefined, name: 'C34.3 Cópia do retrato' });
        const generico = await criarAtor({ name: 'C34.3 Retrato Foundry explícito', type: 'capanga', img: 'icons/svg/mystery-man.svg' });
        const textura = await criarAtor({ name: 'C34.3 Textura própria', type: 'capanga', prototypeToken: { texture: { src: 'icons/svg/shield.svg' } } });
        const texturaGenerica = await criarAtor({ name: 'C34.3 Textura Foundry explícita', type: 'capanga', prototypeToken: { texture: { src: 'icons/svg/mystery-man.svg' } } });
        const aninhado = await criarAtor({ name: 'C34.3 Inventário na criação', type: 'personagem', items: [
          { name: 'C34.3 Arma aninhada em branco', type: 'arma' },
          { name: 'C34.3 Arma aninhada própria', type: 'arma', img: 'icons/svg/shield.svg' },
          { name: 'C34.3 Arma aninhada Foundry', type: 'arma', img: 'icons/svg/item-bag.svg' }
        ] });
        const itemCustom = await criarItem({ name: 'C34.3 Item próprio', type: 'arma', img: 'icons/svg/shield.svg' });
        const itemGenerico = await criarItem({ name: 'C34.3 Item Foundry explícito', type: 'arma', img: 'icons/svg/item-bag.svg' });
        const preservados = await dono.createEmbeddedDocuments('Item', [
          { name: 'C34.3 Próprio da ficha', type: 'arma', img: 'icons/svg/shield.svg' },
          { name: 'C34.3 Foundry da ficha', type: 'arma', img: 'icons/svg/item-bag.svg' }
        ]);
        const embutidoCustom = preservados.find(i => i.name === 'C34.3 Próprio da ficha');
        const embutidoGenerico = preservados.find(i => i.name === 'C34.3 Foundry da ficha');
        const vazio = await criarItem({ name: 'C34.3 Imagem vazia', type: 'arma', img: '' });
        const arquivos = [...new Set([...Object.values(porTipo.ator), ...Object.values(porTipo.item)])];
        const servidos = await Promise.all(arquivos.map(async arquivo => {
          const resposta = await fetch(caminho(arquivo));
          return resposta.ok && /<svg\\b/.test(await resposta.text());
        }));
        return { padraoAtores, padraoItens, embutidos, servidos, quantidadeArquivos: arquivos.length,
          custom: retrato(custom), copia: retrato(copia), generico: retrato(generico), textura: retrato(textura), texturaGenerica: retrato(texturaGenerica),
          aninhados: ['C34.3 Arma aninhada em branco', 'C34.3 Arma aninhada própria', 'C34.3 Arma aninhada Foundry'].map(nome => aninhado.items.getName(nome)?.img),
          itensPreservados: [itemCustom.img, itemGenerico.img, embutidoCustom.img, embutidoGenerico.img], vazio: vazio.img };
      } finally {
        for (const a of atores.reverse()) await a?.delete();
        for (const i of itens.reverse()) await i?.delete();
      }
    })()`);
    const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const mook = 'systems/cpr-fieldbook/icones/padrao/Default_Mook.svg';
    const ok = info.padraoAtores.length === 5 && info.padraoAtores.every(a => igual(a.retrato, [a.esperado, a.esperado]))
      && info.padraoItens.length === 13 && info.padraoItens.every(i => i.img === i.esperado)
      && info.embutidos.length === 13 && info.embutidos.every(i => i.img === i.esperado)
      && igual(info.custom, ['icons/svg/shield.svg', 'icons/svg/shield.svg']) && igual(info.copia, info.custom)
      && igual(info.generico, ['icons/svg/mystery-man.svg', 'icons/svg/mystery-man.svg'])
      && igual(info.textura, [mook, 'icons/svg/shield.svg']) && igual(info.texturaGenerica, [mook, mook])
      && igual(info.aninhados, ['systems/cpr-fieldbook/icones/padrao/Default_Weapon.svg', 'icons/svg/shield.svg', 'icons/svg/item-bag.svg'])
      && igual(info.itensPreservados, ['icons/svg/shield.svg', 'icons/svg/item-bag.svg', 'icons/svg/shield.svg', 'icons/svg/item-bag.svg'])
      && info.vazio === 'systems/cpr-fieldbook/icones/padrao/Default_Weapon.svg'
      && info.quantidadeArquivos === 16 && info.servidos.length === 16 && info.servidos.every(Boolean);
    return [ok, JSON.stringify(info)];
  });
};

module.exports = async (r, edge, jogador) => {
  await r.passo('C34.3: SP monitorado na barra, escolha pela ficha, edicao pelo HUD, reparo, C18, fallback e token solto', async () => {
    const info = await edge.evaluate(`(async () => {
      const esperar = async f => { for (let i=0;i<60&&!f();i++) await new Promise(r=>setTimeout(r,100)); if(!f()) throw Error('C34: espera esgotada'); };
      const atores=[],tokens=[]; const cenaAnterior=canvas.scene;let cena;
      const criar = async type => {
        const a=await Actor.implementation.create({name:'C34 SP '+type,type,ownership:{[game.users.getName('Jogador').id]:3},
          system:{atributos:{body:{valor:8},will:{valor:8}},hp:{value:50}},items:[
          {name:'Forte C34',type:'armadura',system:{equipada:true,sp:{corpo:{value:11,max:13}}}},
          {name:'Leve C34',type:'armadura',system:{equipada:true,sp:{corpo:{value:4,max:7},cabeca:{value:5,max:7}}}},
          {name:'Guardada C34',type:'armadura',system:{equipada:false,sp:{corpo:{value:18,max:18}}}}
        ]});atores.push(a);return a;
      };
      try {
        cena=await Scene.implementation.create({name:'C34 SP isolado',width:2500,height:2000,grid:{size:100},tokenVision:false});
        await cena.activate();await cena.view();
        const a=await criar('personagem'), modelo=await criar('capanga');
        const forte=a.items.getName('Forte C34'),leve=a.items.getName('Leve C34');
        const personalizado=await Actor.implementation.create({name:'C34 barra propria',type:'capanga',prototypeToken:{bar2:{attribute:'humanidade'}}});atores.push(personalizado);
        const padroes=[a.prototypeToken.bar2.attribute,modelo.prototypeToken.bar2.attribute,personalizado.prototypeToken.bar2.attribute];
        const [doc]=await cena.createEmbeddedDocuments('Token',[(await a.getTokenDocument({x:1200,y:900,actorLink:true,displayBars:50})).toObject()]);tokens.push(doc.id);
        await esperar(()=>canvas.tokens.get(doc.id));
        await a.sheet.render({force:true});a.sheet.changeTab('combate','primary');
        const botao=a.sheet.element.querySelector('.protecao-armadura [data-local="corpo"] [data-action="escolherArmaduraMonitorada"]');botao.click();
        await esperar(()=>document.querySelector('.application.dialog select[name="armadura"]'));
        const select=document.querySelector('.application.dialog select[name="armadura"]');const opcoes=[...select.options].map(o=>o.value);
        select.value=leve.id;select.closest('.application.dialog').querySelector('button[data-action="ok"]').click();
        await esperar(()=>a.system.armaduraMonitorada.corpo===leve.id);
        await a.mostrarSPNoToken('corpo');
        const escolhida={valor:a.system.spMonitorado.corpo.value,efetiva:a.system.armadura.corpo.sp,barra:doc.getBarAttribute('bar2'),opcoes};
        await canvas.tokens.hud.bind(canvas.tokens.get(doc.id));
        const campo=canvas.tokens.hud.element.querySelector('input[name="bar2"]');const editavel=Boolean(campo&&!campo.disabled);
        campo.value='-1';campo.dispatchEvent(new Event('change',{bubbles:true}));
        await esperar(()=>leve.system.sp.corpo.value===3&&forte.system.sp.corpo.value===10);
        await canvas.tokens.hud.close();
        const hud={editavel,pecas:[forte.system.sp.corpo.value,leve.system.sp.corpo.value],hp:a.system.hp.value};
        await a.modifyTokenAttribute('spMonitorado.corpo',6,false,true);
        const reparo=[forte.system.sp.corpo.value,leve.system.sp.corpo.value];
        await Promise.all([a.modifyTokenAttribute('spMonitorado.corpo',-1,true),a.modifyTokenAttribute('spMonitorado.corpo',-1,true)]);
        const duas=[forte.system.sp.corpo.value,leve.system.sp.corpo.value];
        await a.escolherArmaduraMonitorada('cabeca',leve.id);await a.modifyTokenAttribute('spMonitorado.cabeca',-2,true);
        const cabeca=[leve.system.sp.cabeca.value,leve.system.sp.corpo.value];
        const dano=await a.receberDano({dano:12});
        const combate={sp:dano.sp,hp:a.system.hp.value,pecas:[forte.system.sp.corpo.value,leve.system.sp.corpo.value]};
        await a.desfazerDano({...dano,perdeu:dano.recebido});
        const desfeito={hp:a.system.hp.value,pecas:[forte.system.sp.corpo.value,leve.system.sp.corpo.value]};
        await a.escolherArmaduraMonitorada('corpo','nenhuma');const nenhuma=[a.system.spMonitorado.corpo.value,a.system.armadura.corpo.sp];
        const recusadas=[await a.escolherArmaduraMonitorada('corpo',a.items.getName('Guardada C34').id),await a.escolherArmaduraMonitorada('corpo','inexistente')];
        await a.escolherArmaduraMonitorada('corpo',leve.id);await leve.update({'system.equipada':false});const guardada=a.system.spMonitorado.corpo.value;
        await leve.update({'system.equipada':true});await leve.delete();const apagada=a.system.spMonitorado.corpo.value;
        const [solto]=await cena.createEmbeddedDocuments('Token',[(await modelo.getTokenDocument({x:1400,y:900,actorLink:false})).toObject()]);tokens.push(solto.id);
        const b=solto.actor;await b.escolherArmaduraMonitorada('corpo',b.items.getName('Leve C34').id);await b.modifyTokenAttribute('spMonitorado.corpo',-1,true);await b.mostrarSPNoToken('cabeca');
        const sintetico={solto:b.isToken,pecas:b.items.map(i=>i.system.sp.corpo.value),modelo:modelo.items.map(i=>i.system.sp.corpo.value),barra:solto.bar2.attribute,modeloBarra:modelo.prototypeToken.bar2.attribute};
        await a.modifyTokenAttribute('hp',-1,true);const hpNormal=a.system.hp.value;
        return {padroes,escolhida:{...escolhida,opcoes:opcoes.map(id=>id===leve.id?'leve':id===forte.id?'forte':id)},hud,reparo,duas,cabeca,combate,desfeito,nenhuma,recusadas,guardada,apagada,sintetico,hpNormal};
      } finally {
        if(canvas.tokens.hud.rendered)await canvas.tokens.hud.close();
        for(const id of tokens){const t=cena?.tokens.get(id);if(t?.actor?.sheet.rendered)await t.actor.sheet.close();}
        if(tokens.length&&cena)await cena.deleteEmbeddedDocuments('Token',tokens.filter(id=>cena.tokens.has(id)));
        for(const a of atores.reverse()){if(a.sheet.rendered)await a.sheet.close();await a.delete();}
        if(cena)await cena.delete();
        if(cenaAnterior&&game.scenes.has(cenaAnterior.id)){await cenaAnterior.activate();await cenaAnterior.view();}
      }
    })()`);
    const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
    const ok=eq(info.padroes,['spMonitorado.corpo','spMonitorado.corpo','humanidade'])
      &&info.escolhida.valor===4&&info.escolhida.efetiva===11&&info.escolhida.barra.editable&&info.escolhida.barra.value===4&&info.escolhida.barra.max===7
      &&eq(info.escolhida.opcoes,['','nenhuma','forte','leve'])&&info.hud.editavel&&eq(info.hud.pecas,[10,3])&&info.hud.hp===50
      &&eq(info.reparo,[10,6])&&eq(info.duas,[8,4])&&eq(info.cabeca,[3,4])&&info.combate.sp===8&&info.combate.hp===46&&eq(info.combate.pecas,[7,3])
      &&info.desfeito.hp===50&&eq(info.desfeito.pecas,[8,4])&&eq(info.nenhuma,[0,8])&&info.recusadas.every(v=>v===null)&&info.guardada===8&&info.apagada===8
      &&info.sintetico.solto&&eq(info.sintetico.pecas,[10,3,18])&&eq(info.sintetico.modelo,[11,4,18])&&info.sintetico.barra==='spMonitorado.cabeca'&&info.sintetico.modeloBarra==='spMonitorado.corpo'&&info.hpNormal===49;
    return [ok,JSON.stringify(info)];
  });

  await r.passo('C34.3: o dono edita o SP e o observador nao escolhe, nao edita nem configura barra',async()=>{
    let id;
    try{
      id=await edge.evaluate(`(async()=>{const u=game.users.getName('Jogador');const a=await Actor.implementation.create({name:'C34 permissao SP',type:'personagem',ownership:{[u.id]:3},items:[{name:'Colete C34 permissao',type:'armadura',system:{equipada:true,sp:{corpo:{value:11,max:11}}}}]});return a.id;})()`);
      const dono=await jogador.evaluate(`(async()=>{for(let i=0;i<50&&!game.actors.has('${id}');i++)await new Promise(r=>setTimeout(r,100));const a=game.actors.get('${id}');await a.escolherArmaduraMonitorada('corpo',a.items.contents[0].id);await a.modifyTokenAttribute('spMonitorado.corpo',-1,true);return {owner:a.isOwner,sp:a.system.spMonitorado.corpo.value};})()`);
      await edge.evaluate(`game.actors.get('${id}').update({ownership:{[game.users.getName('Jogador').id]:2}}).then(()=>true)`);
      const observador=await jogador.evaluate(`(async()=>{const a=game.actors.get('${id}');for(let i=0;i<50&&a.isOwner;i++)await new Promise(r=>setTimeout(r,100));const item=a.items.contents[0];const recusas=[await a.escolherArmaduraMonitorada('corpo','nenhuma'),await a.modifyTokenAttribute('spMonitorado.corpo',-1,true),await a.mostrarSPNoToken('corpo')];await a.sheet.render({force:true});const botoes=a.sheet.element.querySelectorAll('[data-action="escolherArmaduraMonitorada"],[data-action="mostrarSPNoToken"]').length;await a.sheet.close();return {owner:a.isOwner,recusas:recusas.map(v=>v===null),sp:item.system.sp.corpo.value,botoes};})()`);
      return [dono.owner&&dono.sp===10&&!observador.owner&&observador.recusas.every(Boolean)&&observador.sp===10&&observador.botoes===0,JSON.stringify({dono,observador})];
    }finally{if(id)await edge.evaluate(`game.actors.get('${id}')?.delete().then(()=>true)`);}
  });

  await r.passo('C34.3: arvore de instalados preserva permissao, busca nativa, montagem e abertura das fichas',async()=>{
    let ids=[];
    try{
      ids=await edge.evaluate(`(async()=>{
        const dono=game.users.getName('Jogador').id;const itens=[];
        const criar=async(name,pai='',privado=false)=>{const i=await Item.implementation.create({name,type:'cyberware',system:{instaladoEm:pai},ownership:{default:0,[dono]:privado?0:3}});itens.push(i.id);return i;};
        const raiz=await criar('C34 Raiz');const filho=await criar('C34 Buscavel <em>filho</em>',raiz.id);await criar('C34 Neto',filho.id);await criar('C34 Privado',raiz.id,true);
        const paiPrivado=await criar('C34 Pai privado','',true);await criar('C34 Orfao visivel',paiPrivado.id);return itens;
      })()`);
      const ler=navegador=>navegador.evaluate(`(async()=>{
        const esperar=async f=>{for(let i=0;i<60&&!f();i++)await new Promise(r=>setTimeout(r,100));if(!f())throw Error('C34 arvore: espera');};
        await esperar(()=>game.items.has('${ids[1]}'));const app=ui.items;await app.render({force:true});
        const raiz=()=>app.element;const bloco=()=>raiz().querySelector('[data-cpr-arvore-pai="${ids[0]}"]');const botao=()=>raiz().querySelector('[data-cpr-arvore-alternar="${ids[0]}"]');
        await esperar(botao);if(botao().getAttribute('aria-expanded')!=='true')botao().click();await esperar(()=>bloco()&&!bloco().hidden);
        const antes={filhos:[...bloco().querySelectorAll('[data-cpr-item-instalado]')].map(e=>e.dataset.cprItemInstalado),texto:bloco().textContent,html:!!bloco().querySelector('em'),quantidade:raiz().querySelectorAll('[data-cpr-arvore-alternar="${ids[0]}"]').length};
        bloco().querySelector('[data-cpr-item-instalado="${ids[1]}"] button').click();await esperar(()=>game.items.get('${ids[1]}').sheet.rendered);const abriu=game.items.get('${ids[1]}').sheet.rendered;await game.items.get('${ids[1]}').sheet.close();
        const input=raiz().querySelector('search input');input.value='Buscavel';input.dispatchEvent(new Event('input',{bubbles:true}));await new Promise(r=>setTimeout(r,400));
        const buscando={classe:raiz().classList.contains('cpr-arvore-buscando'),arvoreOculta:bloco().hidden,filho:getComputedStyle(raiz().querySelector('li.item[data-entry-id="${ids[1]}"]')).display!=='none'};
        input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));await new Promise(r=>setTimeout(r,400));
        const limpa={filhoOculto:getComputedStyle(raiz().querySelector('li.item[data-entry-id="${ids[1]}"]')).display==='none',arvore:!bloco().hidden};
        await app.render({force:true});await esperar(botao);
        const {desenharArvoreItens}=await import('/systems/cpr-fieldbook/scripts/arvore-itens.mjs');desenharArvoreItens(app,raiz());desenharArvoreItens(app,raiz());
        const redesenho={quantidade:raiz().querySelectorAll('[data-cpr-arvore-alternar="${ids[0]}"]').length,aberta:botao().getAttribute('aria-expanded')==='true'};
        return {antes,abriu,buscando,limpa,redesenho,orfao:!!raiz().querySelector('li.item[data-entry-id="${ids[5]}"]'),montagem:game.items.get('${ids[1]}').system.instaladoEm};
      })()`);
      const mestre=await ler(edge),jogadorInfo=await ler(jogador);
      await edge.evaluate(`game.items.get('${ids[1]}').update({'system.instaladoEm':''}).then(()=>true)`);
      const montagemAtualiza=async(navegador,aninhado)=>navegador.evaluate(`(async()=>{const conferir=()=>Boolean(ui.items.element.querySelector('li.item[data-entry-id="${ids[1]}"][data-cpr-arvore-aninhado]'))===${aninhado};for(let i=0;i<60&&!conferir();i++)await new Promise(r=>setTimeout(r,100));return conferir();})()`);
      const desmontou=[await montagemAtualiza(edge,false),await montagemAtualiza(jogador,false)];
      await edge.evaluate(`game.items.get('${ids[1]}').update({'system.instaladoEm':'${ids[0]}'}).then(()=>true)`);
      const remontou=[await montagemAtualiza(edge,true),await montagemAtualiza(jogador,true)];
      const ok=[mestre,jogadorInfo].every(v=>v.antes.quantidade===1&&!v.antes.html&&v.abriu&&v.buscando.classe&&v.buscando.arvoreOculta&&v.buscando.filho&&v.limpa.filhoOculto&&v.limpa.arvore&&v.redesenho.quantidade===1&&v.redesenho.aberta&&v.orfao&&v.montagem===ids[0])
        &&mestre.antes.filhos.includes(ids[3])&&jogadorInfo.antes.filhos.length===2&&!jogadorInfo.antes.filhos.includes(ids[3])&&!jogadorInfo.antes.texto.includes('Privado')&&desmontou.every(Boolean)&&remontou.every(Boolean);
      return [ok,JSON.stringify({mestre,jogador:jogadorInfo,desmontou,remontou})];
    }finally{if(ids.length){
      for(const navegador of [jogador,edge])await navegador.evaluate(`(async()=>{const i=game.items.get('${ids[1]}');if(i?.sheet.rendered)await i.sheet.close();await game.user.update({'flags.cpr-fieldbook.itensInstaladosAbertos.-=${ids[0]}':null});return true;})()`);
      await edge.evaluate(`(async()=>{for(const id of ${JSON.stringify([...ids].reverse())}){const i=game.items.get(id);if(i?.sheet.rendered)await i.sheet.close();await i?.delete();}return true;})()`);
    }}
  });
};

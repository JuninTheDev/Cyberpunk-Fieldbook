import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { montarArvoreNoDiretorio } from '../../foundry-sistema/scripts/diretorio-itens.mjs';
// Verificação opcional do DOM sem Foundry. Instalação isolada: npm install --prefix tests/.saida/dom --no-save --no-package-lock linkedom@0.18.12
// Depois: node tests/sistema/instalados-dom.mjs. O G3 continua sem esta dependência; o G4 confere a integração real.
const require = createRequire(import.meta.url);
const dependencias = process.env.FIELDBOOK_DOM_DEPS ?? fileURLToPath(new URL('../.saida/dom/', import.meta.url));
const { parseHTML } = require(require.resolve('linkedom', { paths: [dependencias] }));
const esperar=()=>new Promise(r=>setTimeout(r,20));
for(const atributo of ['data-document-id','data-entry-id']){
 const {document,window}=parseHTML('<html><body><section id="items"><input name="search" type="search"><ol><li '+atributo+'="pai">Arma</li><li '+atributo+'="filho">Filho</li><li '+atributo+'="neto">Neto</li><li '+atributo+'="secreto">Secreto</li><li '+atributo+'="orfao">Órfão</li></ol></section></body></html>');
 let consulta=null;
 class Ficha{static DEFAULT_OPTIONS={actions:{usar:()=>{}}};constructor(o){this.document=o.document;}render(){consulta=this;}}
 const fazer=(id,pai,nome=id,visivel=true)=>({id,name:nome,type:'upgrade',system:{instaladoEm:pai},sheet:new Ficha({}),testUserPermission:()=>visivel});
 const p=fazer('pai','');p.type='arma';
 const f=fazer('filho','pai','<img src=x onerror=alert(1)>'),n=fazer('neto','filho'),s=fazer('secreto','pai','SEGREDO',false),o=fazer('orfao','paiOculto');
 const itens=[p,f,n,s,o], flags={},chamadas=[];
 globalThis.game={items:{get:id=>itens.find(i=>i.id===id),has:id=>itens.some(i=>i.id===id),filter:fn=>itens.filter(fn)},user:{getFlag:()=>flags,async setFlag(escopo,chave,valor){chamadas.push([chave,valor]);await new Promise(r=>setTimeout(r,chamadas.length===1?8:0));flags[chave.split('.')[1]]=valor;}}};
 const html=document.getElementById('items');
 const row=id=>[...html.querySelectorAll('li['+atributo+']')].find(e=>e.getAttribute(atributo)===id);
 const botao=()=>html.querySelector('.cprf-expandir-instalados'),bloco=()=>html.querySelector('.cprf-arvore-instalados');
 const click=e=>e.dispatchEvent(new window.Event('click',{bubbles:true,cancelable:true}));
 montarArvoreNoDiretorio({},html);
 assert.equal(html.querySelectorAll('.cprf-expandir-instalados').length,1);
 assert.equal(row('filho').classList.contains('cprf-item-instalado'),true);
 assert.equal(row('orfao').classList.contains('cprf-item-instalado'),false);
 assert.equal(row('secreto').classList.contains('cprf-item-instalado'),false);
 assert.equal(bloco().querySelectorAll('button').length,2);
 assert.equal(bloco().querySelector('img')===null,true,'nome deve ser texto, sem HTML executável');
 assert.equal(bloco().querySelector('button').textContent,'<img src=x onerror=alert(1)>');
 assert.equal(botao().getAttribute('aria-expanded'),'false');assert.equal(bloco().hidden,true);
 click(botao());click(botao());await esperar();
 assert.equal(flags.pai,false,'dois cliques rápidos conservam o último estado');assert.equal(bloco().hidden,true,'recolher precisa esconder a lista');
 click(botao());await esperar();
 assert.equal(flags.pai,true);assert.equal(chamadas.length,3);assert.equal(bloco().hidden,false);
 montarArvoreNoDiretorio({},html);montarArvoreNoDiretorio({},html);
 assert.equal(html.querySelectorAll('.cprf-expandir-instalados').length,1);
 assert.equal(html.querySelectorAll('.cprf-arvore-instalados').length,1);
 assert.equal(botao().getAttribute('aria-expanded'),'true');
 const campo=html.querySelector('input');campo.value='Filho';campo.dispatchEvent(new window.Event('input',{bubbles:true}));
 assert.equal(row('filho').classList.contains('cprf-item-instalado'),false);
 assert.equal(botao().hidden,true);assert.equal(bloco().hidden,true);
 campo.value='';campo.dispatchEvent(new window.Event('input',{bubbles:true}));
 assert.equal(row('filho').classList.contains('cprf-item-instalado'),true);assert.equal(bloco().hidden,false);
 const consultar=bloco().querySelector('button');click(consultar);assert.equal(consulta.document.id,'filho');assert.equal(consulta.isEditable,false);
 consulta=null;f.testUserPermission=()=>false;click(consultar);assert.equal(consulta,null,'botão antigo precisa reler a permissão');
 console.log(atributo+': montagem, expansão, persistência, busca, idempotência, texto seguro e consulta aprovados');
}

// A mesa e o chat (o C33), como no CORE 0.92.4: o modo do seletor do chat nos cartões das rolagens avulsas e "Mostrar aos
// jogadores" no clique direito da imagem das fichas. A ficha do token solto que foi apagado (o
// close-unlinked-sheet-on-delete.js do CORE) o Foundry 14 já fecha sozinho: o TokenDocument._onDelete chama o _onDelete
// do ator sintético, que fecha as janelas dele e as dos itens dele.

// O modo do cartão (o ChatDataSetup do CORE, cpr-chat.js:21-50: o modeOverride ou o modo do chat): vale o do fluxo que
// pede o seu (o ataque escondido, "gm"; os fluxos que continuam públicos, "public"); sem ele, o do seletor do chat. Os
// modos são os do Foundry 14 (CONFIG.ChatMessage.modes: public, gm, blind, self, ic), e o Foundry os aplica ao criar a
// mensagem (ChatMessage._preCreate, pelo messageMode das opções): no "gm", o mestre e quem rolou; no "blind", só o mestre
// (quem rolou vê que rolou, sem o resultado: o isContentVisible); no "self", só quem rolou; o "ic" de um cartão com
// rolagem vira "public".
export const modoDoCartao = (pedido, daMesa) => pedido || daMesa || 'public';
export const modoDaMesa = pedido => modoDoCartao(pedido, game.settings.get('core', 'messageMode'));

// "Mostrar aos jogadores" no clique direito da imagem da ficha (o cpr-imageContextMenu.js do CORE, :10-30): a imagem abre
// num ImagePopout com o nome no título e vai para todos na mesa (o ImagePopout#shareImage do Foundry 14). O CORE põe o
// menu em quem abre a ficha; aqui só o mestre e o dono têm a opção, como o botão "Mostrar" do próprio ImagePopout é só do
// mestre. As fichas pelo nome da classe: o gancho render<Classe> vale também para as filhas (o capanga, o Black ICE e o
// demônio).
export const FICHAS_COM_RETRATO = ['FichaPersonagem', 'FichaDaNet', 'FichaConteiner', 'FichaItem', 'FichaArquitetura'];
export const podeMostrarImagem = (usuario, documento) => Boolean(usuario?.isGM || documento?.isOwner);

export function mostrarImagem(documento) {
  const janela = new foundry.applications.apps.ImagePopout({ src: documento.img, window: { title: documento.name } });
  janela.render({ force: true });
  janela.shareImage();
  return janela;
}

// Um menu por janela: o elemento da ficha fica o mesmo nos redesenhos, e o menu pega a imagem nova pelo seletor. Fixo
// (fixed): solto, o ContextMenu se põe dentro do alvo, e dentro de uma <img> ele não aparece.
const comMenu = new WeakSet();
function menuDaImagem(ficha, elemento) {
  if (comMenu.has(elemento) || !podeMostrarImagem(game.user, ficha.document)) return;
  comMenu.add(elemento);
  new foundry.applications.ux.ContextMenu(elemento, 'img.retrato', [{
    label: 'Mostrar aos jogadores', icon: 'fa-solid fa-eye',
    visible: () => podeMostrarImagem(game.user, ficha.document),
    onClick: () => mostrarImagem(ficha.document)
  }], { jQuery: false, fixed: true });
}

export function registrarMesa() {
  for (const ficha of FICHAS_COM_RETRATO) Hooks.on(`render${ficha}`, menuDaImagem);
}

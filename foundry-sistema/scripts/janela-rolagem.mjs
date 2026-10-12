// A janela de rolagem, como a do CORE no Foundry 12: antes de um teste, o jogador confere as partes fixas, liga os
// situacionais (os dos itens e os da Role), marca os modificadores comuns do livro (a tabela da wiki), soma um
// modificador do mestre e põe a Sorte; o total sem o dado acompanha. Quem chama decide se ela abre (na ficha, Ctrl +
// clique pula a janela, e a configuração "Rolar direto" inverte).
import { caminho, SISTEMA } from './config.mjs';
import { MODIFICADORES_COMUNS } from './regras.mjs';

const { DialogV2 } = foundry.applications.api;
const sinal = valor => (valor < 0 ? `−${Math.abs(valor)}` : `+${valor}`);
const comSinal = lista => lista.map((item, indice) => ({ ...item, indice, texto: sinal(item.valor) }));

// Devolve { partes, sorte }: os modificadores escolhidos e a Sorte. null se o jogador fechar ou cancelar.
export async function perguntarTeste(ator, { rotulo, partes, situacionais = [] }) {
  const sorteMax = ator.system.sorte.value;
  const base = partes.reduce((soma, parte) => soma + parte.valor, 0);
  const content = await foundry.applications.handlebars.renderTemplate(caminho('templates/janela-rolagem.hbs'), {
    partes: comSinal(partes), situacionais: comSinal(situacionais), comuns: comSinal(MODIFICADORES_COMUNS), sorte: Math.min(ator.sortePreparada, sorteMax), sorteMax, base
  });
  const escolha = form => {
    const marcados = (nome, lista) => [...form.querySelectorAll(`[name="${nome}"]:checked`)].map(caixa => lista[Number(caixa.value)]);
    const extras = [...marcados('situacional', situacionais), ...marcados('comum', MODIFICADORES_COMUNS)].map(({ rotulo: nome, valor }) => ({ rotulo: nome, valor }));
    const outro = Math.trunc(Number(form.elements.outro.value) || 0);
    if (outro) extras.push({ rotulo: 'Modificador do mestre', valor: outro });
    return { partes: extras, sorte: Math.max(0, Math.min(sorteMax, Math.trunc(Number(form.elements.sorte.value) || 0))) };
  };
  const resposta = await DialogV2.wait({
    window: { title: `Teste: ${rotulo}`, icon: 'fa-solid fa-dice-d10' }, classes: [SISTEMA, 'janela-rolagem', 'themed', 'theme-dark'], position: { width: 560 },
    rejectClose: false, content,
    buttons: [
      { action: 'rolar', label: 'Rolar', icon: 'fa-solid fa-dice-d10', default: true, callback: (evento, botao) => escolha(botao.form) },
      { action: 'cancelar', label: 'Cancelar', icon: 'fa-solid fa-xmark' }
    ],
    // O total sem o dado, a cada mudança.
    render: (evento, janela) => {
      const form = janela.element.querySelector('form.dialog-form');
      const total = form.querySelector('.total-sem-dado');
      const atualizar = () => {
        const { partes: extras, sorte } = escolha(form);
        total.textContent = base + extras.reduce((soma, parte) => soma + parte.valor, 0) + sorte;
      };
      form.addEventListener('input', atualizar);
      form.addEventListener('change', atualizar);
      atualizar();
    }
  });
  return resposta && typeof resposta === 'object' ? resposta : null;
}

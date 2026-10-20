// Quando o instalar.mjs gera os compêndios de novo: sem a marca da última geração, com uma fonte mais nova que ela, ou com
// uma fonte que falta (o documento das arquiteturas, quando a campanha não tem nenhuma): não dá para saber se ela saiu
// depois da última geração. Sem Foundry: o G3 testa este arquivo no Node.
import fs from 'node:fs';
import path from 'node:path';

// fonte: a pasta do sistema; marca: o arquivo da última geração; fontes: os caminhos, relativos à fonte.
export function precisaGerar(fonte, marca, fontes) {
  if (!fs.existsSync(marca)) return true;
  const gerado = fs.statSync(marca).mtimeMs;
  return fontes.some(arquivo => {
    const alvo = path.join(fonte, arquivo);
    return !fs.existsSync(alvo) || fs.statSync(alvo).mtimeMs > gerado;
  });
}

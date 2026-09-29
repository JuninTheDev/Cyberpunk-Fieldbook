# Cyberpunk RED: 2077 (módulo do Foundry VTT)

Módulo para o Foundry VTT 12 e o sistema **Cyberpunk RED - CORE** (v0.92.4). Traz o conteúdo do suplemento de fã "Cyberpunk 2077":

- **Compêndios:**
  - armas Power, Tech e Smart;
  - cyberware;
  - netrunning de 2077 (cyberdecks, quickhacks, daemons, White ICE);
  - veículos adaptados do jogo;
  - NPCs prontos (só o mestre vê);
  - regras em diários.
- **Economia de 2077:** uma configuração do módulo que troca as categorias de preço pelas do suplemento.
- **Macros:** Ataque Smart, Ricochete e Carga Tech. Só rolam e explicam no chat.

O conteúdo é gerado a partir da wiki da mesa (`system-2077.js`, `system-net.js`, `mestre-npcs.js`), então a wiki e o Foundry nunca divergem.

## Gerar ou atualizar o módulo

Com o Foundry fechado (ou sem nenhum mundo que use o módulo aberto), nesta pasta:

```
node build/extract-core.mjs   # só na primeira vez ou quando o sistema atualizar
node build/build.mjs
```

- **`extract-core.mjs`:** lê os compêndios do sistema e guarda uma cópia em `.cache/`, fora do git. Dali vêm os moldes de cada tipo de item, as perícias, as tabelas de DV e as classes de veículo.
- **`build.mjs`:**
  - confere tudo contra os valores que o sistema aceita;
  - compila os compêndios com a ferramenta oficial `@foundryvtt/foundryvtt-cli` (via `npx`);
  - grava o módulo em `%LOCALAPPDATA%/FoundryVTT/Data/modules/cpr-2077`.

Depois é só ativar **Cyberpunk RED: 2077** em *Configurar módulos* no mundo.

## Arquivos

| Arquivo | Para que serve |
|---|---|
| `module.json` | Manifesto do módulo. |
| `scripts/cpr-2077.mjs` | Configuração da economia de 2077 e API das macros. |
| `scripts/macros.mjs` | Ataque Smart, Ricochete e Carga Tech. |
| `styles/cpr-2077.css` | Visual dos diários e das mensagens no chat. |
| `data/veiculos-2077.json` | Veículos do jogo e a classe do RED usada em cada um. |
| `data/npcs-faccoes.json` | Variantes de facção sobre as fichas do livro. |
| `data/leia-primeiro.html` | O diário "Leia primeiro" do módulo. |
| `build/*.mjs` | Geração dos compêndios. |

## Adaptações

- **Veículos:** o suplemento não traz veículos. Os carros do jogo usam os números de uma classe do RED ou do Black Chrome, indicada na descrição de cada um.
- **Metralhadoras só de autofogo** (Defender, Mk.31): seguem a Tsunami Arms Helix do livro-base, com dano 2d6 × multiplicador de autofogo.
- **Ataque Smart** (10 + 1d10): regra inferida das descrições das armas.
- **Inconsistências do livro:** quando o livro se contradiz (dano, pente, perícia), o item usa o texto e a descrição mostra o valor da tabela.

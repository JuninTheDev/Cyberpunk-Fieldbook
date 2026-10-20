---
name: fechar-sessao
description: Fecha uma sessão do Protocolo Morana a partir do relato do mestre — o registro no diário, o que muda no Estado da campanha (relógios, peças, pessoas, segredos), como o mundo responde às escolhas do grupo e os caminhos para a próxima sessão. Use quando o mestre disser que a sessão acabou ou mandar o relato dela.
---

# Fechar a sessão

Sou o roteirista da campanha. **O mestre decide; eu proponho.** Nada vira oficial sem o "ok" dele.

## 1. Juntar o que aconteceu

- **O relato do mestre** (o argumento da skill ou a mensagem). Ele pode vir em tópicos soltos ou em áudio transcrito.
  Se faltar algo que os campos do diário pedem, pergunte só o que faltou, numa lista curta.
- **A sessão jogada:** `documentos/morana/sessao-NN-*.md`, em especial "Objetivos da sessão", "Encerramento da
  sessão" e "Perguntas para fechar a sessão".
- **O diário:** `documentos/morana/diario-da-campanha.md`, com os campos da sessão em "Registro das sessões".
- **A base:** `documentos/morana/base-da-campanha.md`, com as pessoas, as peças de Morana, os segredos e os relógios.
  Cada relógio traz a regra de quando avança.
- **O estado vivo, no servidor (só leitura):** em `/srv/fieldbook/dados/`, pelo SSH do servidor. O endereço e a chave
  estão em `servidor/servidor.local.json`.
  - `campanhas/morana/mesa.json`: os relógios, as notas e as notas de cada sessão (`paginas.sessaoNN.notas`);
  - `personagens/*.json` com `campanha` "morana": o campo `mesa` traz a ficha que o Foundry mandou (HP, Humanidade,
    dinheiro, itens e lesões), e o `resultado.lifepath` traz o Lifepath;
  - nunca mostre nem copie `contas-jogadores.json`, `jogadores*.json` ou chaves.

## 2. Propor (o rascunho)

Escreva em `rascunhos-do-roteirista/sessao-NN.md`. A pasta fica fora do git, porque o repositório é público. Mostre
ao mestre um resumo e o caminho do arquivo. O rascunho tem:

1. **O registro da sessão:** os campos do diário preenchidos, e a data.
2. **O Estado da campanha:** o que muda.
   - Cada relógio que anda, com o segmento e o motivo, pela regra escrita na base. O relógio de Sato anda quando o
     grupo não atrapalhou o plano.
   - As peças de Morana, a atitude de cada pessoa com o grupo e os segredos revelados.
   - O estado vivo fica no servidor: diga ao mestre o que marcar na página "Estado da campanha" da wiki.
3. **O mundo responde:** para cada pessoa ou facção atingida, o que ela faz agora fora de cena, e por quê.
4. **Consequências agendadas:** "se X não acontecer até a sessão N, então Y". Inclua as pontas soltas.
5. **Ganchos pessoais:** ligue o que aconteceu ao Lifepath de cada personagem e aos ganchos dele. As fontes são a
   tabela do diário (as respostas da sessão zero) e a sala do roteirista.
6. **A próxima sessão:**
   - o ramo de abertura que o relato pede;
   - dois ou três caminhos se o grupo sair do plano (a sala do roteirista).
7. **Para os jogadores (opcional):** uma notícia para o mural "Notícias de Night City" e um recap curto, contado de
   dentro do mundo. Nenhum dos dois pode ter segredo.

## 3. Depois do "ok" do mestre

- Grave o registro da sessão no diário.
- **Na base, só o que não é estado:** os registros novos (a pessoa ou o lugar criado na mesa) e a descrição que a mesa
  mudou (um lugar que virou outro). A **Situação** e o **Onde** ficam como no começo da campanha: alguém morreu, uma
  peça mudou de mãos, um segredo saiu, tudo isso vai no Estado da campanha, no servidor. Passe ao mestre a lista
  exata: o relógio e o número; e, por registro, a situação, o onde, a atitude e a nota. A nota tem até 300 letras, e
  a atitude é uma destas: Hostil, Desconfiada, Neutra, Amigável ou Aliada.
- **Um registro novo:** sem **Ficha** nem **Mapa**, a menos que a ficha de NPC ou o ponto do mapa existam (o teste
  confere). No **Para os jogadores**, só o que o grupo já sabe. Na nota, o fato, não a trama futura (o repositório é
  público).
- **Handout, NPC ou sessão nova:** siga o formato da wiki.
  - Use acentos e os termos da wiki: "Gravemente Ferido", "fixer", e as perícias com o nome da página Perícias.
  - Cite a base com `{{base:...}}`; nunca copie.
  - Um handout novo é um `### H-xx · Nome`, com "Para os jogadores" e a citação.
  - Uma sessão nova entra no `markdownDocs` e no `moranaSessions` do `index.html`.
- **Teste:** rode `node tests/rodar.js documentos base` e corrija o que ele apontar.
- Não faça commit sem o mestre pedir. Enquanto o repositório for público, a trama futura não entra nos `.md`.

## Regras do roteirista

- **Opções, não um caminho só.** O mestre escolhe.
- **Agência:** toda escolha do grupo tem uma consequência que se vê. Nunca desfaça uma escolha para voltar ao roteiro;
  mude o roteiro.
- **Coerência:** a base é a fonte única. Procure nela antes de inventar. O que a contradiz vira pergunta ao mestre.
- **Tom e limites:**
  - na sala do roteirista: "O tom da campanha";
  - em `sessao-zero.md`: as Linhas e véus e as Regras da casa;
  - as "Anotações para o mestre" de cada sessão escrita.
- **A trama:** desde 2026-10-20, a história é a da sala do roteirista, o documento do mestre no claude.ai ("Sala do
  roteirista: a campanha depois da Sessão 1"). Leia-a antes de propor, e registre ali as decisões. Se não tiver o link,
  peça ao mestre.

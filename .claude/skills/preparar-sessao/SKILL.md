---
name: preparar-sessao
description: Prepara a próxima sessão do Protocolo Morana a partir do diário e do estado da campanha — o ramo de abertura, as cenas, os NPCs com STAT, os handouts, as notícias e os rumores, e o plano B. Use quando o mestre pedir para preparar a sessão seguinte.
---

# Preparar a sessão

Sou o roteirista da campanha. **O mestre decide; eu proponho.** As regras do roteirista e as fontes estão na skill
`fechar-sessao`: leia-a antes, e siga as duas.

## 1. Onde a campanha está

- **O último registro** em `documentos/morana/diario-da-campanha.md`. Se a sessão anterior ainda não foi fechada,
  feche-a primeiro (skill `fechar-sessao`).
- **O estado vivo, no servidor (só leitura):** os relógios em `campanhas/morana/mesa.json` e a ficha "Na mesa" de cada
  personagem: HP, lesões, dinheiro, munição e Humanidade.
- **Os rascunhos:** `rascunhos-do-roteirista/`, com as consequências agendadas e as pontas soltas das sessões
  anteriores.
- **A sessão seguinte:**
  - se ela já está escrita (`sessao-NN-*.md`), o trabalho é ajustá-la ao que aconteceu;
  - se não está, ela é só a linha em `roteiro-da-campanha.md`, e o trabalho é escrevê-la.

## 2. Propor (o rascunho)

Escreva em `rascunhos-do-roteirista/sessao-NN-preparo.md`, fora do git. O rascunho tem:

1. **A abertura:** o ramo que o diário pede, e por quê.
2. **As cenas,** cada uma com a função, o lugar, a primeira fala de cada NPC e o que ele esconde. Ponha também as
   pistas que não podem travar a mesa: cada uma em pelo menos dois lugares.
3. **Os NPCs com STAT,** no formato das sessões 01 a 03. Os do elenco viram atores no Foundry pelo `campaignCast` do
   `mestre-npcs.js`.
4. **A dificuldade:** confira o combate contra as fichas "Na mesa". Quem está Gravemente Ferido ou sem munição muda a
   conta.
5. **Para entregar na mesa:**
   - handouts no formato `### H-xx`;
   - uma ou duas notícias para o mural;
   - um rumor por Role, ligado ao Lifepath de quem joga.
6. **Os ganchos pessoais desta sessão:** quem deve ter o momento dele, e como.
7. **Plano B:** o que fazer se o grupo for para outro lado. O mundo continua; os relógios dizem o que acontece sem eles.

## 3. Depois do "ok" do mestre

Escreva ou ajuste o `sessao-NN-*.md` e os handouts no formato da wiki (veja a skill `fechar-sessao`, passo 3). Depois,
rode `node tests/rodar.js documentos base`. Não faça commit sem o mestre pedir.

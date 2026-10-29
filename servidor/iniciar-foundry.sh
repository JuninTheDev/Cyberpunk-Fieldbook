#!/usr/bin/env bash
# Inicia o Foundry (chamado pelo foundry.service e pelo foundry14.service). Procura o arquivo de entrada, que muda de
# lugar entre versões do Foundry. O Foundry 14 roda com outro Node (o 24, em /opt/node24), que vem no terceiro argumento.
# A instalação do sistema do Foundry 14 (atualizar-sistema.sh) para o Foundry com um mundo aberto e deixa o id dele em
# <pasta de dados>/.mundo-ao-ligar: na volta, o Foundry abre esse mundo (o --world do Foundry), uma vez só.
# Uso: iniciar-foundry.sh <pasta do programa> <pasta de dados> [node]
set -euo pipefail
app=$1
dados=$2
node=${3:-/usr/bin/node}
mundo=''
if [ -f "$dados/.mundo-ao-ligar" ]; then
  mundo=$(head -n 1 "$dados/.mundo-ao-ligar" | tr -cd 'A-Za-z0-9_-')
  rm -f "$dados/.mundo-ao-ligar"
fi
for entrada in resources/app/main.mjs resources/app/main.js main.mjs main.js; do
  if [ -f "$app/$entrada" ]; then exec "$node" "$app/$entrada" --dataPath="$dados" ${mundo:+"--world=$mundo"}; fi
done
echo "Não achei o Foundry em $app. Rode sudo bash servidor/instalar.sh com o link do Foundry." >&2
exit 1

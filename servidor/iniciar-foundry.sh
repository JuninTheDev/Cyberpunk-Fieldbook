#!/usr/bin/env bash
# Inicia o Foundry (chamado pelo foundry.service). Procura o arquivo de entrada, que muda de lugar
# entre versões do Foundry. Uso: iniciar-foundry.sh <pasta do programa> <pasta de dados>
set -euo pipefail
app=$1
dados=$2
for entrada in resources/app/main.mjs resources/app/main.js main.mjs main.js; do
  if [ -f "$app/$entrada" ]; then exec /usr/bin/node "$app/$entrada" --dataPath="$dados"; fi
done
echo "Não achei o Foundry em $app. Rode sudo bash servidor/instalar.sh com o link do Foundry." >&2
exit 1

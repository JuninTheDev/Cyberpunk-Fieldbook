#!/usr/bin/env bash
# Gera o módulo cpr-2077 direto na pasta do Foundry do servidor e instala os outros módulos da wiki
# (foundry-*/instalar.mjs, como o NET Architect e o Fluxo de Combate, menos o foundry-sistema/, que é do Foundry 14):
# o mesmo que o atualizar-modulo.bat faz no PC.
# O instalar do Fluxo de Combate também apaga o Evasion Workflow (cpred-evasion-workflow), que fazia o mesmo.
# Os compêndios ficam travados com o Foundry aberto: para o Foundry, gera e liga de novo. Por isso só roda
# com ninguém conectado, a não ser com --agora (derruba quem estiver na mesa).
# Uso: sudo bash servidor/atualizar-modulo.sh [--agora]
# Sai com 0 (gerado), 2 (fica para depois: mesa ocupada ou Foundry sem o sistema) ou 1 (erro).
set -euo pipefail
WIKI=/srv/fieldbook/wiki
DATA=/srv/foundry/data/Data
como_mesa() { runuser -u mesa -- env HOME="$(getent passwd mesa | cut -d: -f6)" FOUNDRY_DATA="$DATA" "$@"; }

[ -d "$DATA/systems/cyberpunk-red-core" ] || { echo "O sistema Cyberpunk RED ainda não está instalado no Foundry do servidor: fica para depois."; exit 2; }
conectados=$(curl -fsS --max-time 3 http://127.0.0.1:30000/api/status 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(Number(JSON.parse(s).users)||0)}catch{console.log(0)}})' || echo 0)
if [ "$conectados" != "0" ] && [ "${1:-}" != "--agora" ]; then
  echo "Mesa com $conectados conectado(s): o módulo fica para depois."
  exit 2
fi

systemctl stop foundry
trap 'systemctl start foundry' EXIT
# Uma cópia vinda do Windows pode chegar sem permissão de escrita: o build precisa regravar a pasta do módulo
# (e o instalar do Fluxo de Combate, apagar a do Evasion Workflow).
for pasta in "$DATA"/modules/cpr-2077 "$DATA"/modules/net-architect "$DATA"/modules/fluxo-de-combate "$DATA"/modules/cpred-evasion-workflow; do
  [ -d "$pasta" ] && chown -R mesa:mesa "$pasta" && chmod -R u+rwX "$pasta"
done
cd "$WIKI/foundry-2077"
# Cópia dos compêndios do sistema: na primeira vez, sempre que o sistema for atualizado no Foundry e quando a lista do
# extrator mudar (os compêndios do Black Chrome entraram assim, com o sistema na mesma versão, e o build ficou sem eles).
sistema=$(node -p "require('$DATA/systems/cyberpunk-red-core/system.json').version")
copia=$(node -p "try { require('./.cache/core/versao.json').version } catch { '' }")
if [ "$sistema" != "$copia" ] || [ build/extract-core.mjs -nt .cache/core/versao.json ]; then como_mesa node build/extract-core.mjs; fi
como_mesa node build/build.mjs
# O build também regrava o catálogo da loja; no servidor vale o do GitHub.
como_mesa git -C "$WIKI" checkout -q -- loja-catalogo.js 2>/dev/null || true
# Módulos só de scripts (sem compêndio compilado): instalar é copiar. O foundry-sistema/ fica de fora: é o sistema para o
# Foundry 14 (protótipo), e a mesa do servidor é Foundry 12.
for instalar in "$WIKI"/foundry-*/instalar.mjs; do
  case "$instalar" in */foundry-sistema/*) continue ;; esac
  [ -f "$instalar" ] && como_mesa node "$instalar"
done
echo "Módulos atualizados."

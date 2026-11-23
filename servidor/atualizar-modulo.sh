#!/usr/bin/env bash
# Gera o módulo cpr-2077 direto na pasta do Foundry do servidor e instala os outros módulos da wiki
# (foundry-*/instalar.mjs, como o NET Architect e o Fluxo de Combate, menos o foundry-sistema/, que é do Foundry 14):
# o mesmo que o atualizar-modulo.bat faz no PC.
# O instalar do Fluxo de Combate também apaga o Evasion Workflow (cpred-evasion-workflow), que fazia o mesmo.
# Os compêndios ficam travados com o Foundry aberto: para o Foundry, gera e liga de novo. Por isso só roda
# com ninguém conectado, a não ser com --agora (derruba quem estiver na mesa). Com o Foundry 14 no ar (a mesa trocada
# pela wiki), o 12 está parado: gera sem parar nada e não liga o 12 no fim (ligar o 12 desligaria o 14).
# Uso: sudo bash servidor/atualizar-modulo.sh [--agora]
# Sai com 0 (gerado), 2 (fica para depois: mesa ocupada ou Foundry sem o sistema) ou 1 (erro).
set -euo pipefail
WIKI=/srv/fieldbook/wiki
DATA=/srv/foundry/data/Data
como_mesa() { if [ "$(id -u)" -eq 0 ]; then runuser -u mesa -- env HOME="$(getent passwd mesa | cut -d: -f6)" FOUNDRY_DATA="$DATA" "$@"; else env FOUNDRY_DATA="$DATA" "$@"; fi; }
# O systemctl que muda alguma coisa: como root direto; como o usuário da mesa (o fieldbook-atualizar.service), pelo sudo,
# que libera só esses comandos (servidor/servicos.sh).
servico() { if [ "$(id -u)" -eq 0 ]; then systemctl "$@"; else sudo -n systemctl "$@"; fi; }

[ -d "$DATA/systems/cyberpunk-red-core" ] || { echo "O sistema Cyberpunk RED ainda não está instalado no Foundry do servidor: fica para depois."; exit 2; }
if ! systemctl is-active --quiet foundry14; then
  status=$(curl -fsS --max-time 5 http://127.0.0.1:30000/api/status 2>/dev/null || true)
  conectados=$(printf '%s' "$status" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(Number(JSON.parse(s).users)||0)}catch{console.log("?")}})' || echo '?')
  # Sem resposta com o 12 ligado, não se sabe quem está na mesa (travado ou ligando): fica para depois, como com gente
  # (a auditoria de 2026-11-16; antes, contava como vazia). Com o 12 parado, não há mesa.
  if [ "$conectados" = '?' ]; then
    if systemctl is-active --quiet foundry && [ "${1:-}" != "--agora" ]; then
      echo "O Foundry está ligado e não respondeu ao /api/status (travado ou ligando): o módulo fica para depois."
      exit 2
    fi
    conectados=0
  fi
  if [ "$conectados" != "0" ] && [ "${1:-}" != "--agora" ]; then
    echo "Mesa com $conectados conectado(s): o módulo fica para depois."
    exit 2
  fi
  servico stop foundry
  trap 'servico start foundry' EXIT
fi
# Uma cópia vinda do Windows pode chegar sem permissão de escrita: o build precisa regravar a pasta do módulo
# (e o instalar do Fluxo de Combate, apagar a do Evasion Workflow).
# Como o usuário da mesa (o atualizar.sh), só o chmod do que já é dele; o chown, só rodado com sudo.
for pasta in "$DATA"/modules/cpr-2077 "$DATA"/modules/net-architect "$DATA"/modules/fluxo-de-combate "$DATA"/modules/cpred-evasion-workflow; do
  [ -d "$pasta" ] || continue
  if [ "$(id -u)" -eq 0 ]; then chown -R mesa:mesa "$pasta"; fi
  chmod -R u+rwX "$pasta" 2>/dev/null || echo "Aviso: $pasta tem arquivos de outro dono (rode: sudo bash $WIKI/servidor/atualizar-modulo.sh)."
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

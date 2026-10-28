#!/usr/bin/env bash
# Instala no Foundry 14 do servidor (/srv/foundry14) o sistema Cyberpunk RED — Fieldbook, o foundry-sistema/ do master
# (desde o C28 do ROADMAP do sistema). O atualizar.sh chama a cada minuto quando a versão do master não é a instalada:
# a marca /srv/fieldbook/dados/.sistema-instalado guarda a do foundry-sistema/ e a do documento das arquiteturas da
# campanha, que entra num compêndio. O instalar-sistema-v14.sh chama com --agora.
# Os compêndios ficam travados com o Foundry aberto: com o 14 no ar, ele para enquanto instala, só com ninguém na mesa
# (a não ser com --agora, que derruba quem estiver nela), e volta com o mesmo mundo aberto (o iniciar-foundry.sh lê o
# .mundo-ao-ligar). Com o 12 no ar, o 14 já está parado: instala sem parar nada.
# Precisa de internet na primeira vez (o build dos compêndios usa a ferramenta oficial do Foundry pelo npx).
# Uso: sudo bash servidor/atualizar-sistema.sh [--agora] [--pacote <id do mundo do Foundry 12>] | --versao
#   --pacote: gera também o módulo "Arquivo da mesa": as cenas, os diários e as playlists de um mundo do Foundry 12, com
#             os arquivos que elas usam (só lê o mundo).
#   --versao: só escreve a versão do master (a que a marca guarda depois de instalar).
# Sai com 0 (instalado), 2 (fica para depois: a mesa do 14 ocupada), 3 (não se aplica: sem o Foundry 14 preparado ou
# sem o foundry-sistema/) ou 1 (erro).
set -euo pipefail
# As pastas e o endereço trocam só no teste (tests/isolados/servidor-sistema.test.js).
WIKI=${FIELDBOOK_WIKI:-/srv/fieldbook/wiki}
DADOS=${FIELDBOOK_DADOS:-/srv/fieldbook/dados}
F14=${FOUNDRY14_DADOS:-/srv/foundry14/data}
F12=${FOUNDRY12_DATA:-/srv/foundry/data/Data}
STATUS=${FOUNDRY_STATUS:-http://127.0.0.1:30000/api/status}
como_mesa() { runuser -u mesa -- env HOME="$(getent passwd mesa | cut -d: -f6)" "$@"; }
versao() {
  local sistema documento
  sistema=$(como_mesa git -C "$WIKI" rev-parse -q --verify 'HEAD:foundry-sistema' 2>/dev/null) || return 0
  documento=$(como_mesa git -C "$WIKI" rev-parse -q --verify 'HEAD:documentos/morana/arquiteturas-da-campanha.md' 2>/dev/null || true)
  echo "$sistema:$documento"
}

agora=''
mundo12=''
while [ $# -gt 0 ]; do
  case $1 in
    --versao) versao; exit 0 ;;
    --agora) agora=1 ;;
    --pacote) mundo12=${2:-}; shift
      [ -n "$mundo12" ] && [ -f "$F12/worlds/$mundo12/world.json" ] || { echo "Mundo do Foundry 12 não encontrado: '$mundo12' (os mundos ficam em $F12/worlds)." >&2; exit 1; } ;;
    *) echo "Opção desconhecida: $1" >&2; exit 1 ;;
  esac
  shift
done

[ -d "$F14/Data" ] || { echo "O Foundry 14 ainda não está preparado (sudo bash $WIKI/servidor/instalar-foundry14.sh): nada a instalar."; exit 3; }
[ -f "$WIKI/foundry-sistema/instalar.mjs" ] || { echo "O master não tem o foundry-sistema/: nada a instalar."; exit 3; }
alvo=$(versao)

estava=inactive
mundo=''
if systemctl is-active --quiet foundry14; then
  estava=active
  # Quantos estão na mesa e o mundo aberto (o /api/status do Foundry; sem resposta, ele está ligando: ninguém na mesa).
  read -r conectados mundo < <(curl -fsS --max-time 3 "$STATUS" 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{let j={};try{j=JSON.parse(s)}catch{}console.log(`${Number(j.users)||0} ${j.active&&j.world?j.world:""}`)})' || echo 0)
  if [ "${conectados:-0}" != 0 ] && [ -z "$agora" ]; then
    echo "Mesa do Foundry 14 com $conectados conectado(s): o sistema fica para depois."
    exit 2
  fi
fi
trap 'if [ "$estava" = active ] && ! systemctl is-active --quiet foundry14; then systemctl start foundry14; fi' EXIT
if [ "$estava" = active ]; then
  if [ -n "$mundo" ]; then como_mesa bash -c 'printf "%s\n" "$1" > "$2"' _ "$mundo" "$F14/.mundo-ao-ligar"; fi
  systemctl stop foundry14
fi

echo "Sistema do master: $(como_mesa git -C "$WIKI" log -1 --format='%h %s' -- foundry-sistema)"
como_mesa env FOUNDRY_DATA="$F14/Data" FOUNDRY_VERSAO=14 node "$WIKI/foundry-sistema/instalar.mjs"
if [ -n "$mundo12" ]; then
  como_mesa node "$WIKI/foundry-sistema/migracao/pacote-das-cenas.mjs" --data "$F12" --mundo "$mundo12" --saida "$F14/Data/modules"
fi
printf '%s\n' "$alvo" > "$DADOS/.sistema-instalado"
echo "Pronto."

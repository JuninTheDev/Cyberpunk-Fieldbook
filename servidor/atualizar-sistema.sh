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
# Sai com 0 (instalado), 2 (fica para depois: a mesa do 14 ocupada, o 14 sem responder ou uma sessão marcada na
# Agenda), 3 (não se aplica: sem o Foundry 14 preparado ou
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
  # Quantos estão na mesa e o mundo aberto (o /api/status do Foundry). Sem resposta (travado, a memória no limite ou
  # ligando), não se sabe quem está na mesa: fica para depois, como com gente, e o próximo minuto tenta de novo (a
  # auditoria de 2026-11-16; antes, contava como vazia e parava o 14 com os jogadores dentro).
  status=$(curl -fsS --max-time 5 "$STATUS" 2>/dev/null || true)
  read -r conectados mundo < <(printf '%s' "$status" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{let j;try{j=JSON.parse(s)}catch{console.log("?");return}console.log(`${Number(j.users)||0} ${j.active&&j.world?j.world:""}`)})' || echo '?')
  if [ "${conectados:-?}" = '?' ] && [ -z "$agora" ]; then
    echo "O Foundry 14 está ligado e não respondeu ao /api/status (travado ou ligando): o sistema fica para depois."
    exit 2
  fi
  if [ "${conectados:-?}" != 0 ] && [ "${conectados:-?}" != '?' ] && [ -z "$agora" ]; then
    echo "Mesa do Foundry 14 com $conectados conectado(s): o sistema fica para depois."
    exit 2
  fi
  # A sessão marcada na Agenda da wiki (de 1 h antes do começo até 30 min depois do fim; sem duração, 4 h): o 14 não para
  # nem com a mesa vazia (o grupo entrando, um intervalo).
  sessao=$(node -e 'const fs=require("fs");let a;try{a=JSON.parse(fs.readFileSync(process.argv[1],"utf8"))}catch{process.exit(0)}const agora=Date.now();const s=(a.sessoes||[]).find(s=>{const i=Date.parse(s.inicio);if(!Number.isFinite(i))return false;const fim=i+(Number(s.duracao)||240)*60000;return agora>=i-3600000&&agora<=fim+1800000});if(s)console.log(`${s.titulo||"sessão"}, ${s.inicio}`)' "$DADOS/agenda.json" 2>/dev/null || true)
  if [ -n "$sessao" ] && [ -z "$agora" ]; then
    echo "Sessão marcada na Agenda ($sessao): o sistema fica para depois."
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

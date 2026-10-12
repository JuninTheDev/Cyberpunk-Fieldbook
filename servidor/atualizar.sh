#!/usr/bin/env bash
# Puxa do GitHub o que o mestre publicou (publicar.bat). Roda a cada minuto (fieldbook-atualizar.timer), como root.
# - Páginas, regras, lore e estilos: valem na hora (o servidor lê os arquivos a cada pedido).
# - server.js e a API: reinicia a wiki (2 segundos fora do ar).
# - Módulos do Foundry (foundry-2077/ e os outros foundry-*/, e o que o build do cpr-2077 lê da wiki: as fichas de NPC,
#   as regras system-*.js, as arquiteturas e a base da campanha): gera e instala de novo assim que a mesa estiver vazia.
# O registro fica em /srv/fieldbook/dados/atualizacoes.log.
set -euo pipefail
WIKI=/srv/fieldbook/wiki
DADOS=/srv/fieldbook/dados
LOG=$DADOS/atualizacoes.log
como_mesa() { runuser -u mesa -- env HOME="$(getent passwd mesa | cut -d: -f6)" "$@"; }
git_mesa() { como_mesa git -C "$WIKI" "$@"; }

git_mesa fetch -q origin
antes=$(git_mesa rev-parse HEAD)
depois=$(git_mesa rev-parse '@{u}')
if [ "$antes" != "$depois" ]; then
  mudou=$(git_mesa diff --name-only "$antes" "$depois")
  # O servidor nunca edita a pasta: o GitHub manda (até o loja-catalogo.js que o build do módulo regrava).
  git_mesa reset -q --hard "$depois"
  echo "$(date '+%F %T') no ar: $(git_mesa log -1 --format='%h %s')" >> "$LOG"
  if grep -qE '^(server\.js|api-[^/]+\.js|revertidos\.js)$' <<<"$mudou"; then
    systemctl restart fieldbook
    echo "$(date '+%F %T') wiki reiniciada (servidor mudou)" >> "$LOG"
  fi
  if grep -q '^servidor/instalar\.sh$' <<<"$mudou"; then
    echo "$(date '+%F %T') AVISO: servidor/instalar.sh mudou. Para valer, rode: sudo bash $WIKI/servidor/instalar.sh" >> "$LOG"
  fi
  # foundry-sistema/ é o sistema para o Foundry 14 (protótipo): não vai para a mesa do servidor (Foundry 12). Filtrado
  # numa variável, e não num pipe com grep -q: com pipefail, o SIGPIPE do primeiro grep daria falso negativo.
  daMesa=$(grep -v '^foundry-sistema/' <<<"$mudou" || true)
  if grep -qE '^(foundry-[^/]*/|mestre-npcs\.js$|system-[a-z0-9-]*\.js$|campanha-base\.js$|documentos/morana/(arquiteturas|base)-da-campanha\.md$)' <<<"$daMesa"; then touch "$DADOS/.modulo-pendente"; fi
fi

# Módulo do Foundry: precisa parar o Foundry por uns segundos, então só com ninguém na mesa.
# Se der erro, registra uma vez e espera a próxima publicação do módulo (ou: sudo bash servidor/atualizar-modulo.sh).
if [ -f "$DADOS/.modulo-pendente" ]; then
  codigo=0
  saida=$(bash "$WIKI/servidor/atualizar-modulo.sh" 2>&1) || codigo=$?
  case $codigo in
    0) rm -f "$DADOS/.modulo-pendente"; echo "$(date '+%F %T') módulo do Foundry atualizado" >> "$LOG" ;;
    2) ;; # mesa ocupada ou Foundry sem o sistema: tenta no próximo minuto
    *) rm -f "$DADOS/.modulo-pendente"
       printf '%s\n' "$saida" > "$DADOS/modulo-ultimo-erro.log"
       motivo=$(grep -m 1 -E 'Error|Erro|erro|Falha|falha' <<<"$saida" || tail -n 1 <<<"$saida")
       echo "$(date '+%F %T') módulo do Foundry: ERRO: $motivo (tudo em modulo-ultimo-erro.log)" >> "$LOG" ;;
  esac
fi

#!/usr/bin/env bash
# Instala no Foundry 14 do servidor (/srv/foundry14) o sistema Cyberpunk RED — Fieldbook, o foundry-sistema/ da branch
# sistema-v14, que ainda não está no master. Com --pacote, gera também o módulo "Arquivo da mesa": as cenas, os
# diários e as playlists de um mundo do Foundry 12, com os arquivos que elas usam (só lê o mundo).
# O Foundry 14 para enquanto instala (os compêndios ficam travados com ele aberto) e volta se estava ligado.
# Precisa de internet (o build dos compêndios usa a ferramenta oficial do Foundry pelo npx).
# Uso: sudo bash servidor/instalar-sistema-v14.sh [--pacote <id do mundo do Foundry 12>]
set -euo pipefail
[ "$(id -u)" -eq 0 ] || { echo "Rode com sudo."; exit 1; }
WIKI=/srv/fieldbook/wiki
DADOS=/srv/foundry14/data
F12=/srv/foundry/data/Data
como_mesa() { runuser -u mesa -- env HOME="$(getent passwd mesa | cut -d: -f6)" "$@"; }
[ -d "$DADOS/Data" ] || { echo "O Foundry 14 ainda não está preparado. Rode antes: sudo bash $WIKI/servidor/instalar-foundry14.sh" >&2; exit 1; }
mundo=''
if [ "${1:-}" = --pacote ]; then
  mundo=${2:-}
  [ -n "$mundo" ] && [ -f "$F12/worlds/$mundo/world.json" ] || { echo "Mundo do Foundry 12 não encontrado: '$mundo' (os mundos ficam em $F12/worlds)." >&2; exit 1; }
fi

tmp=$(mktemp -d)
estava=$(systemctl is-active foundry14 2>/dev/null || true)
trap 'rm -rf "$tmp"; if [ "$estava" = active ] && ! systemctl is-active -q foundry14; then systemctl start foundry14; fi' EXIT
chown mesa:mesa "$tmp"
# A branch do sistema, sem mexer na cópia do master que a wiki usa.
como_mesa git -C "$WIKI" fetch -q origin sistema-v14
como_mesa bash -c "git -C '$WIKI' archive origin/sistema-v14 foundry-sistema | tar -x -C '$tmp'"
# O compêndio das arquiteturas traz as da campanha (documentos/morana/arquiteturas-da-campanha.md, fora da
# foundry-sistema/): vai o documento da wiki do servidor (o master), o mesmo que o módulo do Foundry 12 usa.
como_mesa mkdir -p "$tmp/documentos/morana"
como_mesa cp "$WIKI/documentos/morana/arquiteturas-da-campanha.md" "$tmp/documentos/morana/"
echo "Sistema da sistema-v14 em $(como_mesa git -C "$WIKI" log -1 --format='%h %s' origin/sistema-v14)"

if [ "$estava" = active ]; then systemctl stop foundry14; fi
como_mesa env FOUNDRY_DATA="$DADOS/Data" FOUNDRY_VERSAO=14 node "$tmp/foundry-sistema/instalar.mjs"
if [ -n "$mundo" ]; then
  como_mesa node "$tmp/foundry-sistema/migracao/pacote-das-cenas.mjs" --data "$F12" --mundo "$mundo" --saida "$DADOS/Data/modules"
fi
echo "Pronto."

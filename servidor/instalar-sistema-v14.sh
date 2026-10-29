#!/usr/bin/env bash
# Instala agora no Foundry 14 do servidor (/srv/foundry14) o sistema Cyberpunk RED — Fieldbook, o foundry-sistema/ do
# master. Desde o C28, o atualizar.sh já faz isso sozinho a cada publicação, com a mesa do 14 vazia; este é o jeito à
# mão, que não espera a mesa esvaziar (servidor/atualizar-sistema.sh --agora). Com --pacote, gera também o módulo
# "Arquivo da mesa": as cenas, os diários e as playlists de um mundo do Foundry 12, com os arquivos que elas usam (só lê
# o mundo).
# Uso: sudo bash servidor/instalar-sistema-v14.sh [--pacote <id do mundo do Foundry 12>]
set -euo pipefail
[ "$(id -u)" -eq 0 ] || { echo "Rode com sudo."; exit 1; }
WIKI=/srv/fieldbook/wiki
codigo=0
bash "$WIKI/servidor/atualizar-sistema.sh" --agora "$@" || codigo=$?
case $codigo in
  0) ;;
  3) echo "Rode antes: sudo bash $WIKI/servidor/instalar-foundry14.sh" >&2; exit 1 ;;
  *) exit "$codigo" ;;
esac

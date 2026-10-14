#!/usr/bin/env bash
# Recebe o que o enviar-para-servidor.bat mandou do PC, na mudança para o servidor: dados da wiki
# (personagens, retratos, códigos, Publicar, regras da loja), PDFs e a pasta Data do Foundry.
# Antes, guarda uma cópia do que já estava no servidor em /srv/backups/antes-de-receber-*.tar.gz.
# Uso: sudo bash servidor/receber.sh <pasta com dados.tar.gz, pdfs.tar e/ou foundry.tar.gz>
set -euo pipefail
[ "$(id -u)" -eq 0 ] || { echo "Rode com sudo."; exit 1; }
PASTA=${1:?Uso: sudo bash receber.sh <pasta enviada>}
WIKI=/srv/fieldbook/wiki
DADOS=/srv/fieldbook/dados
FOUNDRY_DATA=/srv/foundry/data/Data

copia="/srv/backups/antes-de-receber-$(date +%F-%H%M).tar.gz"
tar -czf "$copia" -C / --warning=no-file-changed srv/fieldbook/dados srv/foundry/data/Data/worlds 2>/dev/null || true
echo "Cópia do que havia no servidor: $copia"

if [ -f "$PASTA/dados.tar.gz" ]; then
  systemctl stop fieldbook
  tar -xzf "$PASTA/dados.tar.gz" -C "$DADOS" --no-same-permissions
  chown -R mesa:mesa "$DADOS"
  # O tar do Windows traz permissões do PC (pastas sem escrita, arquivos abertos a todos): normaliza.
  chmod -R u+rwX,go-rwx "$DADOS"
  systemctl start fieldbook
  echo "Dados da wiki: recebidos."
fi
if [ -f "$PASTA/pdfs.tar" ]; then
  tar -xf "$PASTA/pdfs.tar" -C "$WIKI"
  chown mesa:mesa "$WIKI"/*.pdf 2>/dev/null || true
  echo "PDFs: recebidos (só o mestre abre)."
fi
if [ -f "$PASTA/foundry.tar.gz" ]; then
  systemctl stop foundry 2>/dev/null || true
  mkdir -p "$FOUNDRY_DATA"
  tar -xzf "$PASTA/foundry.tar.gz" -C "$FOUNDRY_DATA" --no-same-permissions
  chown -R mesa:mesa /srv/foundry/data
  chmod -R u+rwX,go-w /srv/foundry/data
  touch "$DADOS/.modulo-pendente" # o módulo cpr-2077 é gerado de novo aqui, com a versão do GitHub
  # Com o Foundry 14 no ar (a mesa trocada pela wiki), o 12 fica parado: ligá-lo desligaria o 14.
  systemctl is-active --quiet foundry14 || systemctl start foundry 2>/dev/null || true
  echo "Foundry: mundos, sistemas e módulos recebidos."
fi
rm -rf "$PASTA"
echo "Pronto."

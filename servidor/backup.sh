#!/usr/bin/env bash
# Backup diário (fieldbook-backup.timer, 4h30): dados da wiki (personagens, retratos, códigos, Publicar,
# regras da loja) e o Foundry (mundos e configuração). Guarda 14 dias em /srv/backups.
# O mestre baixa o mais recente pela wiki: barra lateral → Baixar backup.
# Os mapas e imagens soltas da pasta Data do Foundry não entram (são grandes e você tem no PC).
set -euo pipefail
DEST=/srv/backups
arquivo="$DEST/backup-$(date +%F).tar.gz"
partes=(srv/fieldbook/dados srv/foundry/data/Data/worlds srv/foundry/data/Config)
existentes=()
for parte in "${partes[@]}"; do [ -e "/$parte" ] && existentes+=("$parte"); done
# Código 1 do tar = algum arquivo mudou durante a cópia (o Foundry aberto): o backup vale mesmo assim.
tar -czf "$arquivo.tmp" -C / --warning=no-file-changed "${existentes[@]}" || [ $? -eq 1 ]
mv "$arquivo.tmp" "$arquivo"
chgrp mesa "$arquivo"; chmod 640 "$arquivo"
find "$DEST" -name 'backup-*.tar.gz' -mtime +14 -delete
echo "Backup: $arquivo ($(du -h "$arquivo" | cut -f1))"

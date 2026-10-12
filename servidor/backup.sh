#!/usr/bin/env bash
# Backup diário (fieldbook-backup.timer, 4h30): dados da wiki (personagens, retratos, códigos, Publicar,
# regras da loja) e o Foundry (mundos e configuração). Guarda 14 dias em /srv/backups.
# O mestre baixa o mais recente pela wiki: barra lateral → Baixar backup.
# Os arquivos do Foundry que ficam fora dos mundos (mapas, vídeos, músicas e retratos) vão num pacote à parte,
# arquivos-<data>.tar, feito só quando algum deles muda. Guarda os 3 mais recentes. O servidor\baixar-backup.bat
# traz os dois para o PC.
set -euo pipefail
DEST=/srv/backups
DATA=/srv/foundry/data/Data
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

# ---------------- Arquivos soltos do Foundry ----------------
# O que não se baixa de novo de lugar nenhum:
# - tudo da raiz da pasta Data, menos modules/, systems/ e worlds/;
# - a pasta modules/Mapas, que não é módulo (são mapas guardados ali);
# - as pastas do sistema CORE onde ficaram retratos, tokens e o fundo do mundo. Reinstalar o sistema apaga essas pastas.
# Os módulos e sistemas de verdade se reinstalam. Vai sem compressão: imagem, vídeo e música já vêm comprimidos.
[ -d "$DATA" ] || exit 0
soltos=()
while IFS= read -r -d '' item; do soltos+=("${item#/}"); done < <(find "$DATA" -mindepth 1 -maxdepth 1 ! -name modules ! -name systems ! -name worlds -print0)
for pasta in modules/Mapas systems/cyberpunk-red-core/icons/compendium/default systems/cyberpunk-red-core/images; do
  [ -d "$DATA/$pasta" ] && soltos+=("${DATA#/}/$pasta")
done
[ ${#soltos[@]} -gt 0 ] || exit 0
# Mudou desde o último pacote? Compara a lista de tudo o que entraria (caminho, tamanho e data de cada arquivo).
lista=$(cd / && find "${soltos[@]}" -type f -printf '%p %s %T@\n' | sort | sha256sum | cut -d' ' -f1)
ultimo=$(find "$DEST" -maxdepth 1 -name 'arquivos-*.tar' -printf '%f\n' | sort | tail -n 1)
if [ -n "$ultimo" ] && [ "$(cat "$DEST/$ultimo.lista" 2>/dev/null || true)" = "$lista" ]; then
  echo "Arquivos soltos: nada mudou desde $ultimo"
  exit 0
fi
pacote="$DEST/arquivos-$(date +%F).tar"
tar -cf "$pacote.tmp" -C / --warning=no-file-changed "${soltos[@]}" || [ $? -eq 1 ]
mv "$pacote.tmp" "$pacote"
echo "$lista" > "$pacote.lista"
chgrp mesa "$pacote" "$pacote.lista"; chmod 640 "$pacote" "$pacote.lista"
find "$DEST" -maxdepth 1 -name 'arquivos-*.tar' -printf '%f\n' | sort | head -n -3 | while read -r velho; do rm -f "$DEST/$velho" "$DEST/$velho.lista"; done
echo "Arquivos soltos: $pacote ($(du -h "$pacote" | cut -f1))"

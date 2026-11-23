#!/usr/bin/env bash
# Backup diário (fieldbook-backup.timer, 4h30): dados da wiki (personagens, retratos, códigos, Publicar,
# regras da loja), o Foundry (mundos e configuração) e a configuração do servidor (o /etc/fieldbook.env, com as senhas e
# as chaves da IA; o Caddyfile; os serviços; o sudo). Guarda 14 dias em /srv/backups, cada um com o .sha256 ao lado.
# O mestre baixa o mais recente pela wiki (barra lateral → Baixar backup) ou pelo servidor\baixar-backup.bat do PC.
# Roda como root de uma cópia em /usr/local/sbin (o servidor/servicos.sh instala): mudou aqui, rode o servicos.sh.
# Os arquivos do Foundry que ficam fora dos mundos (mapas, vídeos, músicas e retratos) vão num pacote à parte,
# arquivos-<data>.tar, feito só quando algum deles muda. Guarda os 3 mais recentes. O servidor\baixar-backup.bat
# traz os dois para o PC.
# O Foundry 14 (/srv/foundry14), quando instalado ao lado do 12, entra igual: mundos, configuração e arquivos soltos.
# O banco dos mundos (o LevelDB) aberto pode sair pela metade: com a mesa vazia, o Foundry ligado para enquanto copia os
# mundos (alguns segundos) e volta com o mesmo mundo aberto; com gente na mesa (ou sem resposta), copia ligado, como
# antes, e o registro avisa (a auditoria de 2026-11-16).
set -euo pipefail
# As pastas e o endereço trocam só no teste (tests/isolados/servidor-sistema.test.js).
RAIZ=${FIELDBOOK_RAIZ:-/}
DEST=${FIELDBOOK_BACKUPS:-/srv/backups}
STATUS=${FOUNDRY_STATUS:-http://127.0.0.1:30000/api/status}
arquivo="$DEST/backup-$(date +%F).tar.gz"
# Os mundos e a configuração dos Foundry; o resto não depende deles.
mundos=(srv/foundry/data/Data/worlds srv/foundry/data/Config srv/foundry14/data/Data/worlds srv/foundry14/data/Config)
resto=(srv/fieldbook/dados etc/fieldbook.env etc/caddy/Caddyfile etc/systemd/system/fieldbook.service
  etc/systemd/system/fieldbook-atualizar.service etc/systemd/system/fieldbook-atualizar.timer
  etc/systemd/system/fieldbook-backup.service etc/systemd/system/fieldbook-backup.timer etc/systemd/system/foundry.service
  etc/systemd/system/foundry14.service etc/sudoers.d/fieldbook-mesa etc/sudoers.d/fieldbook-atualizar etc/logrotate.d/fieldbook)
existentes() { local parte; for parte in "$@"; do [ -e "$RAIZ/$parte" ] && printf '%s\n' "$parte"; done; return 0; }

# ---------------- O Foundry ligado ----------------
religar=''
pasta=''
trap 'rm -rf "$arquivo.tmp" "$DEST/.mundos.tmp" ${pasta:+"$pasta"}; if [ -n "$religar" ] && ! systemctl is-active --quiet "$religar"; then systemctl start "$religar"; fi' EXIT
modo='com o Foundry desligado'
for servico in foundry14 foundry; do
  systemctl is-active --quiet "$servico" || continue
  if [ "$servico" = foundry14 ]; then dados_do=$RAIZ/srv/foundry14/data; else dados_do=$RAIZ/srv/foundry/data; fi
  read -r conectados mundo < <(curl -fsS --max-time 5 "$STATUS" 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{let j;try{j=JSON.parse(s)}catch{console.log("?");return}console.log(`${Number(j.users)||0} ${j.active&&j.world?j.world:""}`)})' || echo '?')
  if [ "${conectados:-?}" = 0 ]; then
    # O iniciar-foundry.sh abre de novo o mundo que estava aberto.
    if [ -n "${mundo:-}" ]; then printf '%s\n' "$mundo" > "$dados_do/.mundo-ao-ligar"; chown mesa:mesa "$dados_do/.mundo-ao-ligar" 2>/dev/null || true; fi
    systemctl stop "$servico"
    religar=$servico
    modo="com o $servico parado enquanto copiava os mundos"
  else
    modo="com o $servico ligado (${conectados:-?} na mesa): o banco dos mundos pode ter saído pela metade"
  fi
  break
done

# ---------------- O backup ----------------
# Os mundos primeiro (com o Foundry parado, se parou), num tar à parte; o Foundry volta; depois, tudo num arquivo só.
mapfile -t partes_mundos < <(existentes "${mundos[@]}")
mapfile -t partes_resto < <(existentes "${resto[@]}")
# Código 1 do tar = algum arquivo mudou durante a cópia (o Foundry aberto): o backup vale mesmo assim.
if [ ${#partes_mundos[@]} -gt 0 ]; then
  tar -cf "$DEST/.mundos.tmp" -C "$RAIZ" --warning=no-file-changed "${partes_mundos[@]}" || [ $? -eq 1 ]
fi
if [ -n "$religar" ]; then systemctl start "$religar"; religar=''; fi
pasta=$(mktemp -d "$DEST/.backup-XXXX")
if [ -f "$DEST/.mundos.tmp" ]; then tar -xf "$DEST/.mundos.tmp" -C "$pasta"; rm -f "$DEST/.mundos.tmp"; fi
juntar=(-C "$pasta" .)
[ ${#partes_resto[@]} -gt 0 ] && juntar+=(-C "$RAIZ" "${partes_resto[@]}")
tar -czf "$arquivo.tmp" --warning=no-file-changed "${juntar[@]}" || [ $? -eq 1 ]
mv "$arquivo.tmp" "$arquivo"
(cd "$DEST" && sha256sum "$(basename "$arquivo")" > "$(basename "$arquivo").sha256")
chgrp mesa "$arquivo" "$arquivo.sha256" 2>/dev/null || true
chmod 640 "$arquivo" "$arquivo.sha256"
find "$DEST" -maxdepth 1 \( -name 'backup-*.tar.gz' -o -name 'backup-*.tar.gz.sha256' \) -mtime +14 -delete
# As cópias de antes de receber (o receber.sh) ficam 30 dias; dos backups completos, os 2 mais recentes.
find "$DEST" -maxdepth 1 -name 'antes-de-receber-*.tar.gz' -mtime +30 -delete
find "$DEST" -maxdepth 1 -name 'foundry12-completo-*.tar' -printf '%f\n' | sort | head -n -2 | while read -r velho; do rm -f "$DEST/$velho" "$DEST/$velho.sha256"; done
echo "Backup: $arquivo ($(du -h "$arquivo" | cut -f1)), $modo"

# ---------------- Arquivos soltos do Foundry ----------------
# O que não se baixa de novo de lugar nenhum:
# - tudo da raiz da pasta Data, menos modules/, systems/ e worlds/;
# - a pasta modules/Mapas, que não é módulo (são mapas guardados ali);
# - as pastas do sistema CORE onde ficaram retratos, tokens e o fundo do mundo. Reinstalar o sistema apaga essas pastas.
# Os módulos e sistemas de verdade se reinstalam (o "Arquivo da mesa" do Foundry 14 se gera de novo do 12). Vai sem
# compressão: imagem, vídeo e música já vêm comprimidos.
soltos=()
for rel in srv/foundry/data/Data srv/foundry14/data/Data; do
  DATA=$RAIZ/$rel
  [ -d "$DATA" ] || continue
  while IFS= read -r -d '' item; do soltos+=("$rel/${item##*/}"); done < <(find "$DATA" -mindepth 1 -maxdepth 1 ! -name modules ! -name systems ! -name worlds -print0)
  for sub in modules/Mapas systems/cyberpunk-red-core/icons/compendium/default systems/cyberpunk-red-core/images; do
    [ -d "$DATA/$sub" ] && soltos+=("$rel/$sub")
  done
done
[ ${#soltos[@]} -gt 0 ] || exit 0
# Mudou desde o último pacote? Compara a lista de tudo o que entraria (caminho, tamanho e data de cada arquivo).
lista=$(cd "$RAIZ" && find "${soltos[@]}" -type f -printf '%p %s %T@\n' | sort | sha256sum | cut -d' ' -f1)
ultimo=$(find "$DEST" -maxdepth 1 -name 'arquivos-*.tar' -printf '%f\n' | sort | tail -n 1)
if [ -n "$ultimo" ] && [ "$(cat "$DEST/$ultimo.lista" 2>/dev/null || true)" = "$lista" ]; then
  echo "Arquivos soltos: nada mudou desde $ultimo"
  exit 0
fi
pacote="$DEST/arquivos-$(date +%F).tar"
tar -cf "$pacote.tmp" -C "$RAIZ" --warning=no-file-changed "${soltos[@]}" || [ $? -eq 1 ]
mv "$pacote.tmp" "$pacote"
echo "$lista" > "$pacote.lista"
chgrp mesa "$pacote" "$pacote.lista" 2>/dev/null || true
chmod 640 "$pacote" "$pacote.lista"
find "$DEST" -maxdepth 1 -name 'arquivos-*.tar' -printf '%f\n' | sort | head -n -3 | while read -r velho; do rm -f "$DEST/$velho" "$DEST/$velho.lista"; done
echo "Arquivos soltos: $pacote ($(du -h "$pacote" | cut -f1))"

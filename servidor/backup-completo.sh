#!/usr/bin/env bash
# Backup completo da mesa, para guardar fora do servidor antes de uma mudança grande (a troca para o Foundry 14):
# o programa e a pasta de dados do Foundry inteiros (mundos, mapas, vídeos, músicas, retratos, módulos, sistemas e a
# configuração), os dados da wiki e a configuração dos serviços. Fica em /srv/backups/foundry12-completo-<data>.tar,
# com o .sha256 ao lado; o backup diário não apaga.
# Com o Foundry ligado, ele para só o tempo de copiar os mundos e a configuração (alguns segundos), para o banco dos
# mundos sair inteiro; o resto vai com ele ligado, de volta na tela de configuração (os compêndios ficam fechados).
# Para jogar depois, inicie o mundo como sempre. Só roda com ninguém na mesa. Com o Foundry desligado, continua
# desligado.
# Fora do pacote: o /etc/fieldbook.env (senhas; o instalar.sh refaz) e a pasta da wiki (está no GitHub).
# Uso: sudo bash servidor/backup-completo.sh   e depois, no PC, baixe o arquivo e confira o .sha256.
set -euo pipefail
DEST=/srv/backups
ARQ="$DEST/foundry12-completo-$(date +%F).tar"
mkdir -p "$DEST"
PARADO=$(mktemp -d "$DEST/.parado-XXXX")
estava=$(systemctl is-active foundry 2>/dev/null || true)
# Dê o que der, o Foundry termina como estava e a cópia temporária some.
trap 'rm -rf "$PARADO" "$ARQ.parcial"; if [ "$estava" = active ] && ! systemctl is-active -q foundry; then systemctl start foundry; fi' EXIT

if [ "$estava" = active ]; then
  conectados=$({ curl -fsS --max-time 3 http://127.0.0.1:30000/api/status 2>/dev/null || true; } | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(Number(JSON.parse(s).users)||0)}catch{console.log(0)}})')
  if [ "$conectados" != "0" ]; then
    echo "Mesa com $conectados conectado(s): nada foi feito. Rode de novo com a mesa vazia."
    exit 2
  fi
fi

inicio=$(date +%s)
[ "$estava" = active ] && systemctl stop foundry
mkdir -p "$PARADO/srv/foundry/data/Data"
cp -a /srv/foundry/data/Data/worlds "$PARADO/srv/foundry/data/Data/"
cp -a /srv/foundry/data/Config "$PARADO/srv/foundry/data/"
rm -rf "$PARADO/srv/foundry/data/Config/options.json.lock"
if [ "$estava" = active ]; then
  systemctl start foundry
  echo "Foundry parado por $(( $(date +%s) - inicio )) s."
fi

partes=(srv/foundry srv/fieldbook/dados etc/caddy/Caddyfile)
for unidade in foundry.service fieldbook.service fieldbook-atualizar.service fieldbook-atualizar.timer fieldbook-backup.service fieldbook-backup.timer; do
  [ -f "/etc/systemd/system/$unidade" ] && partes+=("etc/systemd/system/$unidade")
done
# Código 1 do tar = algum arquivo mudou durante a cópia (os dados da wiki estão no ar): o pacote vale mesmo assim.
tar -cf "$ARQ.parcial" -C / --warning=no-file-changed \
  --exclude=srv/foundry/data/Data/worlds --exclude=srv/foundry/data/Config --exclude=srv/foundry/data/Logs \
  "${partes[@]}" || [ $? -eq 1 ]
tar -rf "$ARQ.parcial" -C "$PARADO" srv
mv "$ARQ.parcial" "$ARQ"
chgrp mesa "$ARQ"; chmod 640 "$ARQ"
(cd "$DEST" && sha256sum "$(basename "$ARQ")" > "$(basename "$ARQ").sha256" && chgrp mesa "$(basename "$ARQ").sha256" && chmod 640 "$(basename "$ARQ").sha256")
echo "Backup completo: $ARQ ($(du -h "$ARQ" | cut -f1), $(tar -tf "$ARQ" | wc -l) itens) em $(( $(date +%s) - inicio )) s."

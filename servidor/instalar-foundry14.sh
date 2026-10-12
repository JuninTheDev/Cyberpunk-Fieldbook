#!/usr/bin/env bash
# Prepara o Foundry 14 no servidor, ao lado do Foundry 12, sem mexer na mesa atual:
# - 2 GB de swap: a máquina tem 1 GB de RAM, e o Foundry com a wiki e o build dos compêndios passa disso;
# - o Node 24 em /opt/node24: o Foundry 14 exige o 24. A wiki e o Foundry 12 continuam no Node do sistema;
# - o programa em /srv/foundry14/app, do zip em /srv/foundry14. Baixe o zip com o link da sua conta (foundryvtt.com →
#   Purchased Licenses → versão 14, Linux), que vale poucos minutos;
# - os dados em /srv/foundry14/data, com a mesma porta (30000) e o mesmo endereço (mesa.<domínio>). Na primeira vez,
#   copia a licença e a senha de administrador do Foundry 12;
# - o serviço foundry14.service, que não liga sozinho e não roda junto com o 12: ligar um desliga o outro, uma mesa por
#   vez, como a licença pede. O Caddy não muda.
# Pode rodar de novo: refaz o que faltar e troca o programa quando o zip for outro.
# Uso: sudo bash servidor/instalar-foundry14.sh [zip]   (padrão: o zip mais novo em /srv/foundry14)
# Trocar de mesa: sudo systemctl start foundry14 (o 12 para) · sudo systemctl start foundry (o 14 para).
# Na virada, para valer também depois de reiniciar o servidor: sudo systemctl disable foundry && sudo systemctl enable foundry14
set -euo pipefail
[ "$(id -u)" -eq 0 ] || { echo "Rode com sudo."; exit 1; }
USUARIO=mesa
WIKI=/srv/fieldbook/wiki
BASE=/srv/foundry14
APP=$BASE/app
DADOS=$BASE/data
NODE=/opt/node24
F12=/srv/foundry/data
verde() { printf '\033[32m%s\033[0m\n' "$*"; }

# ---------------- Swap ----------------
if ! swapon --show=NAME --noheadings | grep -qx /swapfile; then
  verde "Swap de 2 GB"
  if [ ! -f /swapfile ]; then fallocate -l 2G /swapfile; chmod 600 /swapfile; mkswap /swapfile >/dev/null; fi
  swapon /swapfile
fi
grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
# A swap só entra quando a memória acaba de verdade.
echo 'vm.swappiness=10' > /etc/sysctl.d/90-fieldbook-swap.conf
sysctl -q -p /etc/sysctl.d/90-fieldbook-swap.conf

# ---------------- Node 24 ----------------
if ! "$NODE/bin/node" -v 2>/dev/null | grep -q '^v24\.'; then
  verde "Node 24 em $NODE"
  tmp=$(mktemp -d)
  curl -fsSL https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt -o "$tmp/SHASUMS256.txt"
  arquivo=$(grep -oE 'node-v24\.[0-9]+\.[0-9]+-linux-x64\.tar\.xz' "$tmp/SHASUMS256.txt" | head -n 1)
  curl -fsSL "https://nodejs.org/dist/latest-v24.x/$arquivo" -o "$tmp/$arquivo"
  # O arquivo tem de bater com o SHA-256 que o próprio site do Node publica.
  (cd "$tmp" && grep " $arquivo\$" SHASUMS256.txt | sha256sum -c --quiet -)
  rm -rf "$NODE" && mkdir -p "$NODE"
  tar -xJf "$tmp/$arquivo" -C "$NODE" --strip-components=1
  rm -rf "$tmp"
fi
echo "Node do Foundry 14: $("$NODE/bin/node" -v)"

# ---------------- Programa ----------------
zip=${1:-$(ls -t "$BASE"/FoundryVTT-*.zip 2>/dev/null | head -n 1 || true)}
if [ -z "$zip" ] || [ ! -f "$zip" ]; then
  echo "Não achei o zip do Foundry 14 em $BASE. Baixe com o link da sua conta e rode de novo." >&2
  exit 1
fi
versao=$(basename "$zip" .zip)
if [ "$(cat "$APP/.instalado" 2>/dev/null || true)" != "$versao" ]; then
  verde "Instalando $versao"
  systemctl stop foundry14 2>/dev/null || true
  rm -rf "$APP.novo" && mkdir -p "$APP.novo"
  unzip -q "$zip" -d "$APP.novo"
  rm -rf "$APP" && mv "$APP.novo" "$APP"
  echo "$versao" > "$APP/.instalado"
fi

# ---------------- Dados ----------------
mkdir -p "$DADOS/Config" "$DADOS/Data"
if [ ! -f "$DADOS/Config/options.json" ]; then
  # O mesmo endereço e o mesmo proxy do Foundry 12 (o Caddy na frente, com HTTPS na 443).
  /usr/bin/node -e '
    const fs = require("fs");
    const [doF12, destino, dados] = process.argv.slice(1);
    let base = {};
    try { base = JSON.parse(fs.readFileSync(doF12, "utf8")); } catch {}
    const opcoes = { port: 30000, hostname: base.hostname ?? null, proxySSL: base.proxySSL ?? false, proxyPort: base.proxyPort ?? null, upnp: false,
      compressStatic: true, compressSocket: true, dataPath: dados, language: base.language || "en.core", telemetry: false, updateChannel: "stable", world: null };
    fs.writeFileSync(destino, JSON.stringify(opcoes, null, 2));
  ' "$F12/Config/options.json" "$DADOS/Config/options.json" "$DADOS"
fi
# A licença e a senha de administrador vêm do Foundry 12, na primeira vez.
for arquivo in license.json admin.txt; do
  if [ ! -f "$DADOS/Config/$arquivo" ] && [ -f "$F12/Config/$arquivo" ]; then cp -p "$F12/Config/$arquivo" "$DADOS/Config/$arquivo"; fi
done
chown -R "$USUARIO:$USUARIO" "$BASE"

# ---------------- Serviço ----------------
cat > /etc/systemd/system/foundry14.service <<EOF
[Unit]
Description=Foundry VTT 14 (mesa nova, ao lado do 12)
After=network-online.target
Wants=network-online.target
# Uma mesa por vez (a licença vale para uma): ligar este desliga o Foundry 12, e ligar o 12 desliga este.
Conflicts=foundry.service

[Service]
User=$USUARIO
WorkingDirectory=$APP
ExecStart=/bin/bash $WIKI/servidor/iniciar-foundry.sh $APP $DADOS $NODE/bin/node
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
verde "Foundry 14 pronto em $APP ($(cat "$APP/.instalado")), desligado."
echo "Ligar (desliga o Foundry 12): sudo systemctl start foundry14"
echo "Voltar ao Foundry 12:        sudo systemctl start foundry"

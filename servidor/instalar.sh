#!/usr/bin/env bash
# Monta o servidor da mesa num Ubuntu 24.04 novo (Oracle Cloud, ARM): a wiki, o Foundry, o Caddy (HTTPS),
# a atualização automática pelo GitHub e o backup diário. Pode rodar de novo sem estragar nada: refaz
# a configuração e mantém os dados.
#
# Uso (veja servidor/README.md): copie para o servidor com scp e rode lá:
#   sudo bash instalar.sh
# Todas as perguntas vêm no começo (domínio, senha do mestre, link do Foundry, chave do GitHub); o resto roda sozinho.
set -euo pipefail

[ "$(id -u)" -eq 0 ] || { echo "Rode com sudo: sudo bash instalar.sh"; exit 1; }

USUARIO=mesa
WIKI=/srv/fieldbook/wiki
DADOS=/srv/fieldbook/dados
BACKUPS=/srv/backups
FOUNDRY_APP=/srv/foundry/app
FOUNDRY_DADOS=/srv/foundry/data
AMBIENTE=/etc/fieldbook.env
REPO_PADRAO=git@github.com:JuninTheDev/Cyberpunk-Fieldbook.git

# Roda um comando como o usuário da mesa, com a casa dele (sem isso git e npm procuram a pasta do root).
como_mesa() { runuser -u "$USUARIO" -- env HOME="$(getent passwd "$USUARIO" | cut -d: -f6)" "$@"; }
verde() { printf '\n\033[32m== %s ==\033[0m\n' "$*"; }
amarelo() { printf '\033[33m%s\033[0m\n' "$*"; }

# ---------------- Perguntas ----------------
# Numa segunda rodada, o que já foi respondido fica como padrão (Enter mantém).
DOMINIO_ATUAL=$(sed -n 's/^FOUNDRY_URL=https:\/\/mesa\.//p' "$AMBIENTE" 2>/dev/null || true)
read -rp "Domínio (ex.: nightcity.com.br)${DOMINIO_ATUAL:+ [$DOMINIO_ATUAL]}: " DOMINIO
DOMINIO=${DOMINIO:-$DOMINIO_ATUAL}
DOMINIO=${DOMINIO#https://}; DOMINIO=${DOMINIO#http://}; DOMINIO=${DOMINIO%%/*}
[[ "$DOMINIO" =~ ^[a-z0-9.-]+\.[a-z]{2,}$ ]] || { echo "Domínio inválido: '$DOMINIO'"; exit 1; }

REPO_ATUAL=$(como_mesa git -C "$WIKI" remote get-url origin 2>/dev/null || true)
read -rp "Repositório no GitHub [${REPO_ATUAL:-$REPO_PADRAO}]: " REPO
REPO=${REPO:-${REPO_ATUAL:-$REPO_PADRAO}}

GM_KEY=$(sed -n 's/^GM_KEY=//p' "$AMBIENTE" 2>/dev/null || true)
if [ -n "$GM_KEY" ]; then
  read -rsp "Senha do mestre na wiki (Enter = manter a atual): " NOVA; echo
else
  read -rsp "Senha do mestre na wiki (Enter = gerar uma forte): " NOVA; echo
fi
if [ -n "$NOVA" ]; then
  [ "${#NOVA}" -ge 10 ] || { echo "Use pelo menos 10 caracteres."; exit 1; }
  [[ "$NOVA" != *[\"\\\$\`\ ]* ]] || { echo "A senha não pode ter aspas, barra invertida, \$, crase nem espaço."; exit 1; }
  GM_KEY=$NOVA
fi
GERADA=""
if [ -z "$GM_KEY" ]; then GM_KEY=$(tr -dc 'A-Za-z0-9' </dev/urandom | head -c 24); GERADA=1; fi

# O link do Foundry vale só 5 minutos: baixa na hora, antes da parte demorada.
FOUNDRY_ZIP=""
if [ ! -f "$FOUNDRY_APP/.instalado" ]; then
  echo
  echo "Link do Foundry: foundryvtt.com → sua conta → Purchased Licenses → versão 12 (a mesma do seu PC),"
  echo "sistema Linux/NodeJS → botão 'Timed URL' (vale 5 minutos)."
  read -rp "Cole o link (Enter = instalar o Foundry depois): " LINK_FOUNDRY
  if [ -n "$LINK_FOUNDRY" ]; then
    verde "Baixando o Foundry"
    if curl -fL --progress-bar -o /tmp/foundry.zip "$LINK_FOUNDRY"; then FOUNDRY_ZIP=/tmp/foundry.zip
    else amarelo "Não consegui baixar (o link vence em 5 minutos). Continuo sem o Foundry; rode o script de novo com um link novo."; fi
  fi
fi

# ---------------- apt sem perguntas ----------------
# Sem isso o Ubuntu 24.04 para no meio perguntando quais serviços reiniciar ou se troca arquivos de configuração.
export DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a
APT=(apt-get -y -q -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold)

# ---------------- Usuário e GitHub ----------------
# A última pergunta: a chave do GitHub. Depois disso o resto roda sozinho.
verde "Usuário '$USUARIO' e acesso ao repositório no GitHub"
command -v git >/dev/null || { apt-get update -q; "${APT[@]}" install git; }
id -u "$USUARIO" >/dev/null 2>&1 || useradd --create-home --shell /bin/bash "$USUARIO"
CASA=$(getent passwd "$USUARIO" | cut -d: -f6)
# Chave de implantação: só leitura, só deste repositório.
como_mesa mkdir -p "$CASA/.ssh"
chmod 700 "$CASA/.ssh"
[ -f "$CASA/.ssh/github" ] || como_mesa ssh-keygen -q -t ed25519 -N '' -C "servidor-da-mesa" -f "$CASA/.ssh/github"
cat > "$CASA/.ssh/config" <<EOF
Host github.com
  IdentityFile ~/.ssh/github
  IdentitiesOnly yes
EOF
grep -q '^github.com ' "$CASA/.ssh/known_hosts" 2>/dev/null || ssh-keyscan -t ed25519 github.com 2>/dev/null >> "$CASA/.ssh/known_hosts"
chown -R "$USUARIO:$USUARIO" "$CASA/.ssh"
until como_mesa git ls-remote "$REPO" >/dev/null 2>&1; do
  echo
  amarelo "O servidor ainda não lê o repositório. No GitHub: repositório → Settings → Deploy keys → Add deploy key,"
  amarelo "título 'servidor da mesa', cole a linha abaixo (sem marcar 'Allow write access') e salve:"
  echo
  cat "$CASA/.ssh/github.pub"
  echo
  read -rp "Depois de salvar no GitHub, aperte Enter para conferir de novo..." _
done
echo "GitHub: acesso ok. Daqui em diante não há mais perguntas (leva uns 5 a 10 minutos)."

# ---------------- Pacotes ----------------
verde "Atualizando o Ubuntu e instalando os programas"
apt-get update -q
"${APT[@]}" upgrade
"${APT[@]}" install git unzip curl ca-certificates gnupg debian-keyring debian-archive-keyring apt-transport-https iptables-persistent unattended-upgrades

if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  "${APT[@]}" install nodejs
fi

if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -q
  "${APT[@]}" install caddy
fi

# ---------------- Firewall ----------------
# A imagem da Oracle bloqueia tudo menos o SSH. Libera só o HTTPS (80 é para o certificado e o redirecionamento).
verde "Liberando as portas 80 e 443"
for porta in 80 443; do
  iptables -C INPUT -p tcp --dport "$porta" -m conntrack --ctstate NEW -j ACCEPT 2>/dev/null || iptables -I INPUT 1 -p tcp --dport "$porta" -m conntrack --ctstate NEW -j ACCEPT
done
iptables -C INPUT -p udp --dport 443 -j ACCEPT 2>/dev/null || iptables -I INPUT 1 -p udp --dport 443 -j ACCEPT
netfilter-persistent save >/dev/null

# ---------------- Pastas e a wiki ----------------
verde "Pastas e a wiki"
mkdir -p /srv/fieldbook "$DADOS" "$BACKUPS" "$FOUNDRY_APP" "$FOUNDRY_DADOS/Config" "$FOUNDRY_DADOS/Data"
chown "$USUARIO:$USUARIO" /srv/fieldbook "$DADOS" /srv/foundry "$FOUNDRY_APP" "$FOUNDRY_DADOS" "$FOUNDRY_DADOS/Config" "$FOUNDRY_DADOS/Data"
chown "root:$USUARIO" "$BACKUPS"; chmod 750 "$BACKUPS"
if [ -d "$WIKI/.git" ]; then
  como_mesa git -C "$WIKI" remote set-url origin "$REPO"
  como_mesa git -C "$WIKI" fetch -q origin
  como_mesa git -C "$WIKI" reset -q --hard '@{u}'
else
  como_mesa git clone -q "$REPO" "$WIKI"
fi
echo "Wiki em $WIKI ($(como_mesa git -C "$WIKI" log -1 --format='%h %s'))"

# ---------------- Configuração da wiki ----------------
umask 027
cat > "$AMBIENTE" <<EOF
# Configuração da wiki no servidor (lida pelo fieldbook.service). Mudou? sudo systemctl restart fieldbook
MODO=hospedado
HOST=127.0.0.1
PORT=8000
GM_KEY=$GM_KEY
DADOS=$DADOS
BACKUPS=$BACKUPS
FOUNDRY_URL=https://mesa.$DOMINIO
EOF
chown "root:$USUARIO" "$AMBIENTE"; chmod 640 "$AMBIENTE"
umask 022

# ---------------- Foundry ----------------
if [ -n "$FOUNDRY_ZIP" ]; then
  verde "Instalando o Foundry"
  como_mesa unzip -q -o "$FOUNDRY_ZIP" -d "$FOUNDRY_APP"
  rm -f "$FOUNDRY_ZIP"
  touch "$FOUNDRY_APP/.instalado"
fi
# O Foundry atrás do Caddy: endereço público com HTTPS na porta 443. Só cria na primeira vez
# (depois o próprio Foundry mexe nesse arquivo pela tela de configuração).
if [ ! -f "$FOUNDRY_DADOS/Config/options.json" ]; then
  cat > "$FOUNDRY_DADOS/Config/options.json" <<EOF
{
  "port": 30000,
  "hostname": "mesa.$DOMINIO",
  "proxySSL": true,
  "proxyPort": 443,
  "upnp": false,
  "compressStatic": true
}
EOF
  chown "$USUARIO:$USUARIO" "$FOUNDRY_DADOS/Config/options.json"
fi

# ---------------- Serviços ----------------
verde "Serviços: wiki, Foundry, atualização automática e backup"
cat > /etc/systemd/system/fieldbook.service <<EOF
[Unit]
Description=Night City Fieldbook (wiki)
After=network-online.target
Wants=network-online.target

[Service]
User=$USUARIO
WorkingDirectory=$WIKI
EnvironmentFile=$AMBIENTE
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/foundry.service <<EOF
[Unit]
Description=Foundry VTT (mesa)
After=network-online.target
Wants=network-online.target

[Service]
User=$USUARIO
WorkingDirectory=$FOUNDRY_APP
ExecStart=/bin/bash $WIKI/servidor/iniciar-foundry.sh $FOUNDRY_APP $FOUNDRY_DADOS
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/fieldbook-atualizar.service <<EOF
[Unit]
Description=Puxa do GitHub o que o mestre publicou

[Service]
Type=oneshot
ExecStart=/bin/bash $WIKI/servidor/atualizar.sh
EOF
cat > /etc/systemd/system/fieldbook-atualizar.timer <<EOF
[Unit]
Description=Confere o GitHub a cada minuto

[Timer]
OnBootSec=2min
OnUnitActiveSec=1min
AccuracySec=10s

[Install]
WantedBy=timers.target
EOF

cat > /etc/systemd/system/fieldbook-backup.service <<EOF
[Unit]
Description=Backup diário da wiki e do Foundry

[Service]
Type=oneshot
ExecStart=/bin/bash $WIKI/servidor/backup.sh
EOF
cat > /etc/systemd/system/fieldbook-backup.timer <<EOF
[Unit]
Description=Backup diário às 4h30

[Timer]
OnCalendar=*-*-* 04:30:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

# ---------------- Caddy (HTTPS) ----------------
cat > /etc/caddy/Caddyfile <<EOF
# Gerado por servidor/instalar.sh. O Caddy pega e renova os certificados HTTPS sozinho.
wiki.$DOMINIO {
	encode zstd gzip
	header {
		Strict-Transport-Security "max-age=31536000"
		X-Content-Type-Options "nosniff"
		Referrer-Policy "same-origin"
		-Server
	}
	reverse_proxy 127.0.0.1:8000
}

mesa.$DOMINIO {
	reverse_proxy 127.0.0.1:30000
}

# O domínio puro e o www levam para a wiki.
$DOMINIO, www.$DOMINIO {
	redir https://wiki.$DOMINIO{uri}
}
EOF

systemctl daemon-reload
systemctl enable --now fieldbook.service fieldbook-atualizar.timer fieldbook-backup.timer >/dev/null
systemctl restart fieldbook.service
# Com o Foundry 14 escolhido como mesa (pela wiki ou na virada), o 12 fica parado: ligá-lo desligaria o 14.
if [ -f "$FOUNDRY_APP/.instalado" ] && ! systemctl is-enabled --quiet foundry14.service 2>/dev/null; then systemctl enable --now foundry.service >/dev/null; systemctl restart foundry.service; fi
systemctl enable caddy >/dev/null
systemctl reload-or-restart caddy

# ---------------- Pronto ----------------
verde "Pronto"
echo "Wiki:  https://wiki.$DOMINIO"
echo "Mesa:  https://mesa.$DOMINIO"
[ -f "$FOUNDRY_APP/.instalado" ] || amarelo "O Foundry ainda não foi instalado: rode este script de novo com o link do Foundry."
if [ -n "$GERADA" ]; then
  echo
  amarelo "Senha do mestre (anote, ela não aparece de novo): $GM_KEY"
fi
echo
echo "Próximos passos (servidor/README.md):"
echo " 1. Abra https://mesa.$DOMINIO AGORA e defina a senha de administrador do Foundry."
echo " 2. No seu PC, rode servidor\\enviar-para-servidor.bat para trazer personagens, códigos e mundos."
echo " 3. Entre como mestre em https://wiki.$DOMINIO/mestre"
if [ -f /var/run/reboot-required ]; then
  echo
  amarelo "O Ubuntu instalou atualizações que pedem reinício: quando puder, rode 'sudo reboot' (tudo volta sozinho)."
fi

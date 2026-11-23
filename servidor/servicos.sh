#!/usr/bin/env bash
# Os serviços da mesa no servidor: a wiki, o Foundry 12, a atualização automática, o backup diário, a swap, o sudo da
# atualização e a rotação do registro. O instalar.sh chama no fim. Para refazer só isto, sem o apt e sem as perguntas:
#   sudo bash /srv/fieldbook/wiki/servidor/servicos.sh
# Desde a auditoria de 2026-11-16, nada da pasta da wiki roda como root sozinho:
# - a atualização (a cada minuto) roda como o usuário da mesa, que já é o dono da pasta e dos dados; para parar e ligar
#   os Foundry e reiniciar a wiki, o sudo libera só esses comandos, inteiros (/etc/sudoers.d/fieldbook-atualizar);
# - o backup (todo dia), que precisa do root (o /etc e o Foundry parado), roda de uma cópia em /usr/local/sbin, que só
#   muda quando este script roda de novo.
# Antes, o root rodava a cada minuto os scripts da pasta da wiki, que o usuário da mesa pode mudar.
set -euo pipefail

[ "$(id -u)" -eq 0 ] || { echo "Rode com sudo: sudo bash servicos.sh"; exit 1; }

USUARIO=mesa
WIKI=/srv/fieldbook/wiki
DADOS=/srv/fieldbook/dados
FOUNDRY_APP=/srv/foundry/app
FOUNDRY_DADOS=/srv/foundry/data
AMBIENTE=/etc/fieldbook.env
verde() { printf '\n\033[32m== %s ==\033[0m\n' "$*"; }

# ---------------- Swap ----------------
# 1 GB de memória para a wiki e um Foundry: 2 GB de swap, usada só no aperto (o instalar-foundry14.sh fazia o mesmo).
verde "Swap"
if ! swapon --show=NAME --noheadings | grep -qx /swapfile; then
  if [ ! -f /swapfile ]; then fallocate -l 2G /swapfile; chmod 600 /swapfile; mkswap /swapfile >/dev/null; fi
  swapon /swapfile
fi
grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
echo 'vm.swappiness=10' > /etc/sysctl.d/90-fieldbook-swap.conf
sysctl -q -p /etc/sysctl.d/90-fieldbook-swap.conf
swapon --show=NAME,SIZE --noheadings

# ---------------- Serviços ----------------
verde "Serviços: wiki, Foundry, atualização automática e backup"
# A wiki no Node 24 (o do Foundry 14, /opt/node24), quando existe: o 20 do sistema saiu do suporte. O Foundry 12 continua
# no dele.
NODE_WIKI=/usr/bin/node
[ -x /opt/node24/bin/node ] && NODE_WIKI=/opt/node24/bin/node
echo "A wiki roda no $("$NODE_WIKI" -v) ($NODE_WIKI)."

cat > /etc/systemd/system/fieldbook.service <<EOF
[Unit]
Description=Night City Fieldbook (wiki)
After=network-online.target
Wants=network-online.target

[Service]
User=$USUARIO
WorkingDirectory=$WIKI
EnvironmentFile=$AMBIENTE
ExecStart=$NODE_WIKI server.js
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
User=$USUARIO
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

# O backup roda como root de uma cópia que só este script troca (a da pasta da wiki muda a cada publicação).
install -m 0755 -o root -g root "$WIKI/servidor/backup.sh" /usr/local/sbin/fieldbook-backup
cat > /etc/systemd/system/fieldbook-backup.service <<EOF
[Unit]
Description=Backup diário da wiki e do Foundry

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/fieldbook-backup
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

# ---------------- O sudo da atualização ----------------
# Só os comandos que a atualização usa, inteiros: reiniciar a wiki (o server.js mudou) e parar e ligar os Foundry
# (instalar o sistema do 14 e os módulos do 12 com a mesa vazia). A troca de mesa pela wiki tem a regra dela
# (/etc/sudoers.d/fieldbook-mesa, do instalar-foundry14.sh).
regra=$(mktemp)
cat > "$regra" <<EOF
# Gerado por servidor/servicos.sh: a atualização automática (fieldbook-atualizar.service, como $USUARIO).
$USUARIO ALL=(root) NOPASSWD: /usr/bin/systemctl restart fieldbook, /usr/bin/systemctl stop foundry14, /usr/bin/systemctl start foundry14, /usr/bin/systemctl stop foundry, /usr/bin/systemctl start foundry
EOF
if visudo -cqf "$regra"; then
  install -m 0440 -o root -g root "$regra" /etc/sudoers.d/fieldbook-atualizar
else
  echo "A regra do sudo não passou no visudo: a atualização não vai conseguir reiniciar a wiki nem instalar o sistema." >&2
fi
rm -f "$regra"

# A atualização, agora como $USUARIO, regrava as marcas e o registro: o que o root criou na pasta de dados passa para ele.
find "$DADOS" -maxdepth 1 -user root -exec chown "$USUARIO:$USUARIO" {} +

# ---------------- O registro ----------------
# O atualizacoes.log cresce a cada publicação: um por mês, guardando os 12 últimos.
cat > /etc/logrotate.d/fieldbook <<EOF
$DADOS/atualizacoes.log {
  monthly
  rotate 12
  compress
  missingok
  notifempty
  su $USUARIO $USUARIO
}
EOF

systemctl daemon-reload
systemctl enable --now fieldbook.service fieldbook-atualizar.timer fieldbook-backup.timer >/dev/null
systemctl restart fieldbook.service
systemctl is-active fieldbook.service fieldbook-atualizar.timer fieldbook-backup.timer | paste -sd' '

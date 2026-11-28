#!/usr/bin/env bash
# Puxa do GitHub o que o mestre publicou (publicar.bat). Roda a cada minuto (fieldbook-atualizar.timer) como o usuário
# da mesa, o dono da pasta e dos dados (desde a auditoria de 2026-11-16; antes, como root). Para o systemctl, o sudo
# libera só os comandos que ele usa (servidor/servicos.sh). Rodado à mão com sudo, também funciona.
# - Páginas, regras, lore e estilos: valem na hora (o servidor lê os arquivos a cada pedido).
# - server.js, a API e o que ela carrega (campanha-base.js, wiki-nomes.js e a regra da grade do inventário, que a fila
#   do C111 confere): reinicia a wiki (2 segundos fora do ar).
#   Antes, confere a sintaxe; depois, que a wiki respondeu. Se não, volta para a versão de antes e não tenta de novo a
#   mesma (a marca .commit-recusado): a wiki não fica fora do ar por uma publicação quebrada. A próxima publicação tenta.
# - Módulos do Foundry (foundry-2077/ e os outros foundry-*/, e o que o build do cpr-2077 lê da wiki: as fichas de NPC,
#   as regras system-*.js, as arquiteturas e a base da campanha): gera e instala de novo assim que a mesa estiver vazia.
# - O sistema do Foundry 14 (foundry-sistema/, e o documento das arquiteturas da campanha, que entra num compêndio dele):
#   instala de novo no Foundry 14 assim que a mesa dele estiver vazia (servidor/atualizar-sistema.sh, desde o C28).
# O registro fica em /srv/fieldbook/dados/atualizacoes.log.
set -euo pipefail
# As pastas trocam só no teste (tests/isolados/servidor-sistema.test.js).
WIKI=${FIELDBOOK_WIKI:-/srv/fieldbook/wiki}
DADOS=${FIELDBOOK_DADOS:-/srv/fieldbook/dados}
LOG=$DADOS/atualizacoes.log
RECUSADO=$DADOS/.commit-recusado
# Onde a wiki responde, para conferir depois de reiniciar (a porta do /etc/fieldbook.env). O teste troca.
porta=$(sed -n 's/^PORT=//p' /etc/fieldbook.env 2>/dev/null || true)
SAUDE=${FIELDBOOK_SAUDE:-http://127.0.0.1:${porta:-8000}/api/estado}
ESPERA=${FIELDBOOK_ESPERA:-30}
# Como o usuário da mesa: quem roda já é ele (o serviço); à mão, com sudo, o runuser troca.
como_mesa() { if [ "$(id -u)" -eq 0 ]; then runuser -u mesa -- env HOME="$(getent passwd mesa | cut -d: -f6)" "$@"; else "$@"; fi; }
git_mesa() { como_mesa git -C "$WIKI" "$@"; }
# O systemctl que muda alguma coisa: como root direto; como a mesa, pelo sudo (só os comandos do sudoers).
servico() { if [ "$(id -u)" -eq 0 ]; then systemctl "$@"; else sudo -n systemctl "$@"; fi; }
registrar() { echo "$(date '+%F %T') $*" >> "$LOG"; }
# Os arquivos que o servidor carrega com erro de sintaxe (vazio: nenhum).
com_erro() {
  local ruins=() arquivo
  for arquivo in server.js revertidos.js campanha-base.js wiki-nomes.js foundry-sistema/scripts/compartilhado/regras-grade.mjs $(cd "$WIKI" && ls api-*.js 2>/dev/null); do
    [ -f "$WIKI/$arquivo" ] || continue
    como_mesa node --check "$WIKI/$arquivo" >/dev/null 2>&1 || ruins+=("$arquivo")
  done
  echo "${ruins[*]:-}"
}
# A wiki respondendo, até $ESPERA segundos.
respondeu() {
  local i
  for ((i = 0; i < ESPERA; i++)); do
    curl -fsS --max-time 3 "$SAUDE" >/dev/null 2>&1 && return 0
    sleep 1
  done
  return 1
}
# Volta para a versão de antes e não tenta de novo a recusada.
voltar() {
  git_mesa reset -q --hard "$antes"
  printf '%s\n' "$depois" > "$RECUSADO"
  registrar "ERRO: $1. Voltou para $(git_mesa log -1 --format='%h') e não tenta de novo a $(git_mesa rev-parse --short "$depois"): publique um conserto"
}

git_mesa fetch -q origin
antes=$(git_mesa rev-parse HEAD)
depois=$(git_mesa rev-parse '@{u}')
if [ "$antes" != "$depois" ] && [ "$depois" != "$(cat "$RECUSADO" 2>/dev/null || true)" ]; then
  mudou=$(git_mesa diff --name-only "$antes" "$depois")
  # O servidor nunca edita a pasta: o GitHub manda (até o loja-catalogo.js que o build do módulo regrava).
  git_mesa reset -q --hard "$depois"
  registrar "no ar: $(git_mesa log -1 --format='%h %s')"
  if grep -qE '^(server\.js|api-[^/]+\.js|revertidos\.js|campanha-base\.js|wiki-nomes\.js|foundry-sistema/scripts/compartilhado/regras-grade\.mjs)$' <<<"$mudou"; then
    ruins=$(com_erro)
    if [ -n "$ruins" ]; then
      voltar "erro de sintaxe em $ruins (a wiki não reiniciou)"
      exit 0
    fi
    servico restart fieldbook
    if respondeu; then
      registrar "wiki reiniciada (servidor mudou)"
    else
      voltar "a wiki não respondeu em $ESPERA s depois de reiniciar"
      servico restart fieldbook
      if respondeu; then registrar "wiki reiniciada na versão de antes"; else registrar "ERRO: a wiki também não respondeu na versão de antes"; fi
      exit 0
    fi
  fi
  if grep -q '^servidor/instalar\.sh$' <<<"$mudou"; then
    registrar "AVISO: servidor/instalar.sh mudou. Para valer, rode: sudo bash $WIKI/servidor/instalar.sh"
  fi
  # Os serviços e o backup rodam de cópias que só o servicos.sh troca (o root não roda a pasta da wiki sozinho).
  if grep -qE '^servidor/(servicos|backup)\.sh$' <<<"$mudou"; then
    registrar "AVISO: os serviços ou o backup mudaram. Para valer, rode: sudo bash $WIKI/servidor/servicos.sh"
  fi
  # foundry-sistema/ é o sistema do Foundry 14: não vai para os módulos do Foundry 12 (vai pelo atualizar-sistema.sh,
  # abaixo). Filtrado numa variável, e não num pipe com grep -q: com pipefail, o SIGPIPE do primeiro grep daria falso
  # negativo.
  daMesa=$(grep -v '^foundry-sistema/' <<<"$mudou" || true)
  if grep -qE '^(foundry-[^/]*/|mestre-npcs\.js$|system-[a-z0-9-]*\.js$|campanha-base\.js$|documentos/morana/(arquiteturas|base)-da-campanha\.md$)' <<<"$daMesa"; then touch "$DADOS/.modulo-pendente"; fi
fi

# Módulo do Foundry: precisa parar o Foundry por uns segundos, então só com ninguém na mesa.
# Se der erro, registra uma vez e espera a próxima publicação do módulo (ou: sudo bash servidor/atualizar-modulo.sh).
if [ -f "$DADOS/.modulo-pendente" ]; then
  codigo=0
  saida=$(bash "$WIKI/servidor/atualizar-modulo.sh" 2>&1) || codigo=$?
  case $codigo in
    0) rm -f "$DADOS/.modulo-pendente"; echo "$(date '+%F %T') módulo do Foundry atualizado" >> "$LOG" ;;
    2) ;; # mesa ocupada ou Foundry sem o sistema: tenta no próximo minuto
    *) rm -f "$DADOS/.modulo-pendente"
       printf '%s\n' "$saida" > "$DADOS/modulo-ultimo-erro.log"
       motivo=$(grep -m 1 -E 'Error|Erro|erro|Falha|falha' <<<"$saida" || tail -n 1 <<<"$saida")
       echo "$(date '+%F %T') módulo do Foundry: ERRO: $motivo (tudo em modulo-ultimo-erro.log)" >> "$LOG" ;;
  esac
fi

# O sistema do Foundry 14: instala quando a versão do master não é a instalada (a marca .sistema-instalado), também
# depois de um minuto perdido. A mesa do 14 ocupada deixa o .sistema-pendente (a barra lateral do mestre mostra) e tenta
# no próximo minuto. Se der erro, registra uma vez e espera outra versão (ou: sudo bash servidor/instalar-sistema-v14.sh).
sistema=$(bash "$WIKI/servidor/atualizar-sistema.sh" --versao 2>/dev/null || true)
if [ -n "$sistema" ] && [ "$sistema" != "$(cat "$DADOS/.sistema-instalado" 2>/dev/null || true)" ] \
    && [ "$sistema" != "$(cat "$DADOS/.sistema-falhou" 2>/dev/null || true)" ]; then
  codigo=0
  saida=$(bash "$WIKI/servidor/atualizar-sistema.sh" 2>&1) || codigo=$?
  case $codigo in
    0) rm -f "$DADOS/.sistema-pendente" "$DADOS/.sistema-falhou"; echo "$(date '+%F %T') sistema do Foundry 14 instalado" >> "$LOG" ;;
    2) touch "$DADOS/.sistema-pendente" ;; # mesa do 14 ocupada: tenta no próximo minuto
    3) rm -f "$DADOS/.sistema-pendente" ;; # sem o Foundry 14 preparado: nada a instalar
    *) rm -f "$DADOS/.sistema-pendente"
       printf '%s\n' "$sistema" > "$DADOS/.sistema-falhou"
       printf '%s\n' "$saida" > "$DADOS/sistema-ultimo-erro.log"
       motivo=$(grep -m 1 -E 'Error|Erro|erro|Falha|falha' <<<"$saida" || tail -n 1 <<<"$saida")
       echo "$(date '+%F %T') sistema do Foundry 14: ERRO: $motivo (tudo em sistema-ultimo-erro.log)" >> "$LOG" ;;
  esac
fi

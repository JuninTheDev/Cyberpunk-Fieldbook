# Traz para o PC o backup mais recente do servidor (dados da wiki e mundos do Foundry): uma cópia fora do
# servidor, caso a máquina da Oracle se perca. Guarda os 8 mais recentes em $HOME\Backups\Night City Fieldbook
# (fora do OneDrive). Usa o servidor e a chave SSH salvos pelo enviar-para-servidor.bat.
# Uso: dois cliques em servidor\baixar-backup.bat
#      servidor\baixar-backup.bat -Agendar   → roda sozinho todo domingo ao meio-dia (ou quando o PC ligar depois disso)
#      servidor\baixar-backup.bat -Desagendar
param([switch]$Agendar, [switch]$Desagendar, [switch]$Silencioso)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$config = Join-Path $PSScriptRoot 'servidor.local.json'
$destination = Join-Path $HOME 'Backups\Night City Fieldbook'
$taskName = 'Night City Fieldbook - baixar backup'
$keep = 8

function Write-Log($text) {
  if ($Silencioso) { Add-Content -Path (Join-Path $destination 'registro.txt') -Value "$(Get-Date -Format 'yyyy-MM-dd HH:mm') $text" -Encoding UTF8 }
  else { Write-Host $text }
}
function Stop-WithMessage($text) {
  Write-Log "ERRO: $text"
  if (-not $Silencioso) { Write-Host ''; Read-Host 'Aperte Enter para sair' | Out-Null }
  exit 1
}
function Finish($text) {
  Write-Log $text
  if (-not $Silencioso) { Write-Host ''; Read-Host 'Aperte Enter para sair' | Out-Null }
  exit 0
}
New-Item -ItemType Directory -Force $destination | Out-Null

# ---------------- Agendamento ----------------
if ($Desagendar) {
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
  Finish 'Agendamento removido.'
}
if ($Agendar) {
  if (-not (Test-Path $config)) { Stop-WithMessage 'Rode o baixar-backup.bat uma vez sem -Agendar (ou o enviar-para-servidor.bat) para salvar o servidor e a chave.' }
  $action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$PSCommandPath`" -Silencioso"
  $trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At 12:00
  $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RunOnlyIfNetworkAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 1)
  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description 'Copia o backup mais recente do servidor da wiki para este PC.' -Force | Out-Null
  Finish "Agendado: todo domingo ao meio-dia (ou na primeira vez que o PC ligar depois). Os backups ficam em $destination; o registro, em registro.txt."
}

# ---------------- Servidor e chave ----------------
foreach ($tool in 'ssh', 'scp') {
  if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) { Stop-WithMessage "Não achei o comando '$tool' (Configurações → Recursos opcionais → Cliente OpenSSH)." }
}
$saved = $null
if (Test-Path $config) { $saved = Get-Content $config -Raw | ConvertFrom-Json }
if (-not $saved) {
  if ($Silencioso) { Stop-WithMessage 'Servidor e chave não configurados.' }
  $server = Read-Host 'Servidor (ex.: ubuntu@203.0.113.10)'
  $key = (Read-Host 'Arquivo da chave SSH (ex.: C:\Users\voce\.ssh\oracle.key)').Trim('"')
  if (-not $server -or -not (Test-Path $key)) { Stop-WithMessage 'Faltou o servidor ou a chave não existe.' }
  [System.IO.File]::WriteAllText($config, (@{ servidor = $server; chave = $key } | ConvertTo-Json), (New-Object System.Text.UTF8Encoding $false))
  $saved = Get-Content $config -Raw | ConvertFrom-Json
}
$server = $saved.servidor
$sshArgs = @('-i', $saved.chave, '-o', 'StrictHostKeyChecking=accept-new', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=20')

# ---------------- Baixar ----------------
# Os backups são do root e do grupo mesa: o servidor faz uma cópia temporária que o usuário do SSH pode ler.
# Sem aspas duplas nos comandos remotos: o PowerShell 5.1 as estraga ao passar para o ssh.
$names = @(& ssh @sshArgs $server "sudo find /srv/backups -maxdepth 1 -name 'backup-*.tar.gz' -printf '%f\n'")
if ($LASTEXITCODE -ne 0) { Stop-WithMessage 'Não consegui entrar no servidor (confira a internet, o IP e a chave).' }
$name = $names | ForEach-Object { "$_".Trim() } | Where-Object { $_ -match '^backup-[0-9-]+\.tar\.gz$' } | Sort-Object | Select-Object -Last 1
if (-not $name) { Finish 'O servidor ainda não fez nenhum backup (ele faz um por dia, às 4h30).' }
$target = Join-Path $destination $name
if (Test-Path $target) { Finish "Já tenho o backup mais recente: $name" }

Write-Log "Baixando $name…"
& ssh @sshArgs $server "sudo install -m 600 -o `$(id -un) /srv/backups/$name /tmp/$name"
& scp @sshArgs "${server}:/tmp/$name" "$target.parcial"
$ok = $LASTEXITCODE -eq 0
& ssh @sshArgs $server "rm -f /tmp/$name" | Out-Null
if (-not $ok) { Remove-Item -Force "$target.parcial" -ErrorAction SilentlyContinue; Stop-WithMessage 'O download falhou. Rode de novo.' }
Move-Item -Force "$target.parcial" $target

# Fica com os mais recentes.
Get-ChildItem $destination -Filter 'backup-*.tar.gz' | Sort-Object Name -Descending | Select-Object -Skip $keep | Remove-Item -Force
$size = (Get-Item $target).Length / 1MB
Finish ('Backup salvo: {0} ({1:N1} MB) em {2}' -f $name, $size, $destination)

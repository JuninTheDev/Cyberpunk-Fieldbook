# Publica a wiki no servidor. Confere se o OneDrive não voltou nenhum arquivo para uma versão antiga,
# mostra o que mudou, faz o commit e manda para o GitHub. O servidor confere o GitHub a cada minuto:
# o script espera a versão nova aparecer na wiki online e avisa.
# Uso: dois cliques em publicar.bat.
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
Set-Location $PSScriptRoot
$addressFile = Join-Path $PSScriptRoot 'servidor\endereco.txt'

function Stop-WithMessage($text) { Write-Host ''; Write-Host $text -ForegroundColor Red; Read-Host 'Aperte Enter para sair' | Out-Null; exit 1 }
function Finish($text) { Write-Host ''; Write-Host $text -ForegroundColor Green; Read-Host 'Aperte Enter para sair' | Out-Null; exit 0 }

foreach ($tool in 'git', 'node') {
  if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) { Stop-WithMessage "Não achei o '$tool' neste PC." }
}

# 1. Arquivo revertido pelo OneDrive: publicar levaria a versão antiga para o servidor.
$reverted = & node revertidos.js
if ($LASTEXITCODE -ne 0) {
  $reverted | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
  Stop-WithMessage 'O OneDrive voltou arquivo(s) para uma versão antiga. Restaure com o comando acima e rode de novo. Nada foi publicado.'
}

# 2. O que vai: mudanças ainda sem commit e commits que ainda não foram para o GitHub.
$changes = @(git status --porcelain)
git fetch -q origin
$ahead = [int](git rev-list --count '@{u}..HEAD')
$behind = [int](git rev-list --count 'HEAD..@{u}')
if ($behind -gt 0) { Stop-WithMessage "O GitHub tem $behind mudança(s) que este PC não tem (feitas em outro computador?). Rode 'git pull' antes." }
if (-not $changes.Count -and -not $ahead) { Finish 'Nada novo para publicar: o GitHub já tem tudo.' }
if ($changes.Count) {
  Write-Host 'Vai publicar:' -ForegroundColor Cyan
  git status --short
  Write-Host ''
  $message = Read-Host 'Descreva a mudança em poucas palavras (Enter = "Atualização da wiki")'
  if (-not $message.Trim()) { $message = 'Atualização da wiki' }
  # A mensagem vai por arquivo (UTF-8 sem BOM): acentos chegam certos no git.
  $messageFile = Join-Path $env:TEMP 'publicar-mensagem.txt'
  [System.IO.File]::WriteAllText($messageFile, $message, (New-Object System.Text.UTF8Encoding $false))
  git add -A
  git commit -q -F $messageFile
  if ($LASTEXITCODE -ne 0) { Stop-WithMessage 'O commit falhou (veja a mensagem acima).' }
}
git push -q
if ($LASTEXITCODE -ne 0) { Stop-WithMessage 'O GitHub recusou o envio (veja a mensagem acima). Nada mudou no servidor.' }
$commit = (git rev-parse HEAD).Trim()
Write-Host "Enviado para o GitHub: $(git log -1 --format='%h %s')"

# 3. Espera o servidor colocar no ar.
if (-not (Test-Path $addressFile)) {
  $typed = Read-Host 'Endereço da wiki online, para conferir quando entrar no ar (ex.: https://wiki.seudominio.com.br; Enter = pular)'
  if (-not $typed.Trim()) { Finish 'Publicado no GitHub. O servidor coloca no ar em até 1 minuto.' }
  [System.IO.File]::WriteAllText($addressFile, $typed.Trim().TrimEnd('/'), (New-Object System.Text.UTF8Encoding $false))
}
$address = (Get-Content $addressFile -Raw).Trim().TrimEnd('/')
Write-Host "Esperando $address colocar no ar (até 2 minutos)…"
for ($i = 0; $i -lt 40; $i++) {
  Start-Sleep -Seconds 3
  try {
    $state = Invoke-RestMethod -Uri "$address/api/estado" -TimeoutSec 5 -Headers @{ 'Cache-Control' = 'no-cache' }
    if ($state.versao -and $state.versao.commit -and $commit.StartsWith($state.versao.commit)) { Finish "No ar! $address" }
  } catch { }
}
Stop-WithMessage "O GitHub recebeu, mas o servidor ainda não mostrou a versão nova. Confira $address daqui a pouco; se não mudar, veja o registro no servidor: /srv/fieldbook/dados/atualizacoes.log"

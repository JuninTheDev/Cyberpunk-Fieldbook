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
# Os arquivos novos (ainda fora do git) só vão com um "s": o GitHub é público, e um roteiro ou um rascunho deixado na
# pasta iria junto (a auditoria de 2026-11-16). As mudanças nos arquivos que o git já tem vão sempre.
$mudados = @(git status --porcelain --untracked-files=no)
$novos = @(git ls-files --others --exclude-standard --directory)
$levarNovos = $false
if ($changes.Count) {
  if ($mudados.Count) {
    Write-Host 'Vai publicar:' -ForegroundColor Cyan
    git status --short --untracked-files=no
  }
  if ($novos.Count) {
    Write-Host ''
    Write-Host "Arquivos novos, ainda fora do git ($($novos.Count)):" -ForegroundColor Yellow
    $novos | Select-Object -First 30 | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
    if ($novos.Count -gt 30) { Write-Host "  e mais $($novos.Count - 30)" -ForegroundColor Yellow }
    $levarNovos = (Read-Host 'Publicar também os arquivos novos? O GitHub é público: qualquer um lê. (s = sim; Enter = não)').Trim().ToLower() -eq 's'
    if (-not $levarNovos) { Write-Host 'Os arquivos novos ficam só neste PC.' -ForegroundColor Yellow }
  }
}
if ($mudados.Count -or $levarNovos) {
  Write-Host ''
  $message = Read-Host 'Descreva a mudança em poucas palavras (Enter = "Atualização da wiki")'
  if (-not $message.Trim()) { $message = 'Atualização da wiki' }
  # A mensagem vai por arquivo (UTF-8 sem BOM): acentos chegam certos no git.
  $messageFile = Join-Path $env:TEMP 'publicar-mensagem.txt'
  [System.IO.File]::WriteAllText($messageFile, $message, (New-Object System.Text.UTF8Encoding $false))
  if ($levarNovos) { git add -A } else { git add -u }
  git commit -q -F $messageFile
  if ($LASTEXITCODE -ne 0) { Stop-WithMessage 'O commit falhou (veja a mensagem acima).' }
} elseif (-not $ahead) {
  Finish 'Nada publicado: só havia arquivos novos, e eles ficaram neste PC.'
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

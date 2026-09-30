# Abre o Foundry e a wiki dos jogadores para quem está fora da sua rede, pelo túnel do Cloudflare.
# Não precisa mexer no roteador: o cloudflared abre uma conexão de saída e o Cloudflare dá um link público.
# Uso: dois cliques em "abrir-online.bat". Deixe a janela aberta durante a sessão; Enter fecha o acesso.
param(
  [int]$FoundryPort = 30000,
  [int]$WikiPort = 8000,
  [switch]$SemWiki,
  # Só para testes: não pergunta nada e fecha sozinho depois deste tempo.
  [int]$TesteSegundos = 0
)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$lore = $PSScriptRoot
$logs = Join-Path $env:TEMP 'abrir-online'
New-Item -ItemType Directory -Force $logs | Out-Null
$started = @()

function Write-Box($lines, $color) {
  Write-Host ''
  Write-Host ('=' * 64) -ForegroundColor $color
  foreach ($line in $lines) { Write-Host "  $line" -ForegroundColor $color }
  Write-Host ('=' * 64) -ForegroundColor $color
}
function Test-Port($port) { [bool](Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) }
function Stop-Started { foreach ($process in $script:started) { if (-not $process.HasExited) { Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue } } }
function Exit-WithPause($code) { if (-not $TesteSegundos) { Read-Host 'Aperte Enter para sair' | Out-Null }; exit $code }

# Abre um túnel rápido e devolve o link público (https://....trycloudflare.com).
function Start-Tunnel($name, $port) {
  $log = Join-Path $logs "$name.log"
  Remove-Item $log -ErrorAction SilentlyContinue
  $process = Start-Process -FilePath $cloudflared -ArgumentList @('tunnel', '--no-autoupdate', '--url', "http://localhost:$port") -RedirectStandardError $log -WindowStyle Hidden -PassThru
  $script:started += $process
  for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 1
    if ($process.HasExited) { break }
    $match = Select-String -Path $log -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($match) { return $match.Matches[0].Value }
  }
  Write-Host "Não consegui abrir o túnel do $name. Veja o registro em $log" -ForegroundColor Red
  return $null
}

# ---------------- Conferências ----------------
$cloudflared = (Get-Command cloudflared -ErrorAction SilentlyContinue).Source
if (-not $cloudflared) { $cloudflared = 'C:\Program Files (x86)\cloudflared\cloudflared.exe' }
if (-not (Test-Path $cloudflared)) {
  Write-Box @('O cloudflared não está instalado.', 'Instale com: winget install --id Cloudflare.cloudflared') Red
  Exit-WithPause 1
}

if (-not (Test-Port $FoundryPort)) {
  Write-Box @("O Foundry não está aberto (porta $FoundryPort).", 'Abra o Foundry e rode este script de novo.') Red
  Exit-WithPause 1
}

# Sem senha de administrador, qualquer um com o link entra na tela de configuração do Foundry.
$adminKey = Join-Path $env:LOCALAPPDATA 'FoundryVTT\Config\admin.txt'
if (-not (Test-Path $adminKey)) {
  Write-Box @(
    'ATENÇÃO: o Foundry está SEM senha de administrador.',
    'Com o link, qualquer pessoa poderia abrir a tela de configuração',
    'e fechar ou apagar mundos.',
    '',
    'Para criar: feche o mundo (Voltar à configuração), vá em',
    'Configuration e preencha "Administrator Password".'
  ) Red
  if (-not $TesteSegundos) {
    $answer = Read-Host 'Digite SIM para abrir mesmo assim (ou só Enter para cancelar)'
    if ($answer -ne 'SIM') { exit 1 }
  }
}

# A wiki: usa o servidor que já está rodando, se for a versão que entende o túnel; senão, liga um.
$wikiReady = $false
if (-not $SemWiki) {
  if (Test-Port $WikiPort) {
    try {
      $response = Invoke-WebRequest -Uri "http://127.0.0.1:$WikiPort/jogadores.json" -UseBasicParsing -Method Head -TimeoutSec 5
      $wikiReady = $response.Headers['X-Wiki-Servidor'] -eq '2'
    } catch { $wikiReady = $false }
    if (-not $wikiReady) {
      Write-Box @(
        "O servidor da wiki na porta $WikiPort é a versão antiga, que não entende o túnel:",
        'por ele, os jogadores veriam a wiki do mestre.',
        'Feche aquele servidor (Ctrl+C na janela dele) e rode este script de novo.',
        'O Foundry vai ser aberto normalmente; só a wiki fica de fora.'
      ) Yellow
    }
  } else {
    $env:HOST = '0.0.0.0'
    $env:PORT = "$WikiPort"
    $server = Start-Process -FilePath 'node' -ArgumentList 'server.js' -WorkingDirectory $lore -RedirectStandardOutput (Join-Path $logs 'wiki.log') -RedirectStandardError (Join-Path $logs 'wiki-erros.log') -WindowStyle Hidden -PassThru
    $script:started += $server
    for ($i = 0; $i -lt 10 -and -not (Test-Port $WikiPort); $i++) { Start-Sleep -Milliseconds 500 }
    $wikiReady = Test-Port $WikiPort
  }
}

# ---------------- Túneis ----------------
try {
  Write-Host 'Abrindo o túnel do Foundry...' -ForegroundColor Cyan
  $foundryUrl = Start-Tunnel 'foundry' $FoundryPort
  $wikiUrl = $null
  if ($wikiReady) {
    Write-Host 'Abrindo o túnel da wiki...' -ForegroundColor Cyan
    $wikiUrl = Start-Tunnel 'wiki' $WikiPort
  }
  if (-not $foundryUrl) { Stop-Started; Exit-WithPause 1 }

  $lines = @('Mande estes links aos jogadores:', '', "Foundry: $foundryUrl")
  if ($wikiUrl) { $lines += "Wiki (visão dos jogadores): $wikiUrl" }
  $lines += @('', 'O link do Foundry já foi copiado (Ctrl+V para colar).', 'Os links mudam cada vez que você abre este script.')
  Write-Box $lines Green
  Set-Clipboard -Value $foundryUrl
  if ($wikiUrl) { Write-Host "Para abrir a wiki do mestre por fora: $wikiUrl/?mestre=SUA_SENHA (servidor ligado com GM_KEY)." -ForegroundColor DarkGray }
  Write-Host 'Lembre: cada usuário do mundo precisa ter senha no Foundry.' -ForegroundColor Yellow

  if ($TesteSegundos) {
    Write-Output "FOUNDRY=$foundryUrl"
    Write-Output "WIKI=$wikiUrl"
    Start-Sleep -Seconds $TesteSegundos
  } else {
    Read-Host "`nDeixe esta janela aberta durante a sessão. Aperte Enter para fechar o acesso" | Out-Null
  }
} finally {
  Stop-Started
  Write-Host 'Acesso de fora fechado.' -ForegroundColor Cyan
}

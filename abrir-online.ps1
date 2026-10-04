# Abre o Foundry e a wiki dos jogadores para quem está fora da sua rede, pelo túnel do Cloudflare.
# Não precisa mexer no roteador: o cloudflared abre uma conexão de saída e o Cloudflare dá um link público.
# Uso: dois cliques em "abrir-online.bat". Deixe a janela aberta durante a sessão; Enter fecha o acesso.
#
# O script só mostra um link depois de testá-lo pelo lado de fora (pelo próprio Cloudflare), e confere
# os túneis a cada minuto: se um cair, abre de novo e mostra o link novo.
param(
  [int]$FoundryPort = 30000,
  [int]$WikiPort = 8000,
  [switch]$SemWiki,
  # Só para testes: não pergunta nada, não mexe na área de transferência e fecha sozinho depois deste tempo.
  [int]$TesteSegundos = 0
)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$lore = $PSScriptRoot
# O modo de teste usa outra pasta: nunca mexe nos registros de uma sessão de verdade aberta ao mesmo tempo.
$logs = Join-Path $env:TEMP $(if ($TesteSegundos) { 'abrir-online-teste' } else { 'abrir-online' })
New-Item -ItemType Directory -Force $logs | Out-Null
$started = @()

function Write-Box($lines, $color) {
  Write-Host ''
  Write-Host ('=' * 64) -ForegroundColor $color
  foreach ($line in $lines) { Write-Host "  $line" -ForegroundColor $color }
  Write-Host ('=' * 64) -ForegroundColor $color
}
function Test-Port($port) { [bool](Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) }
function Stop-Started { foreach ($process in $script:started) { if ($process -and -not $process.HasExited) { Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue } } }
function Exit-WithPause($code) { if (-not $TesteSegundos) { Read-Host 'Aperte Enter para sair' | Out-Null }; exit $code }

# Código HTTP da resposta, sem seguir redirecionamento (0 se não respondeu).
function Get-Status($url) {
  try {
    return [int](Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 15 -MaximumRedirection 0 -ErrorAction Stop).StatusCode
  } catch {
    $response = $_.Exception.Response
    if ($response) { return [int]$response.StatusCode }
    return 0
  }
}
# Responde? Qualquer resposta abaixo de 500 conta (o Foundry, por exemplo, redireciona / para /join).
function Test-Url($url) { $status = Get-Status $url; return ($status -gt 0 -and $status -lt 500) }

# Abre um túnel rápido e devolve { Url, Process, Log, Path }. Usa 127.0.0.1: "localhost" pode virar o IPv6 ::1,
# e a wiki só escuta em IPv4.
function Start-Tunnel($name, $port, $path) {
  $log = Join-Path $logs "$name.log"
  Remove-Item $log -ErrorAction SilentlyContinue
  $process = Start-Process -FilePath $cloudflared -ArgumentList @('tunnel', '--no-autoupdate', '--url', "http://127.0.0.1:$port") -RedirectStandardError $log -WindowStyle Hidden -PassThru
  $script:started += $process
  for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 1
    if ($process.HasExited) { break }
    $match = Select-String -Path $log -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($match) { return @{ Name = $name; Port = $port; Url = $match.Matches[0].Value; Process = $process; Log = $log; Path = $path } }
  }
  Write-Host "Não consegui abrir o túnel do $name. Veja o registro em $log" -ForegroundColor Red
  return $null
}

# Espera o link funcionar de fora. Primeiro pergunta ao DNS do próprio Cloudflare (1.1.1.1), e só depois
# acessa: se o DNS de casa (ou o de um jogador) perguntar cedo demais, ele guarda "não existe" por um tempo.
function Wait-Reachable($tunnel) {
  $hostName = ([Uri]$tunnel.Url).Host
  $resolved = $false
  for ($i = 0; $i -lt 60 -and -not $resolved; $i++) {
    try { $resolved = [bool](Resolve-DnsName -Name $hostName -Server 1.1.1.1 -Type A -DnsOnly -ErrorAction Stop | Where-Object { $_.IPAddress }) } catch { $resolved = $false }
    if (-not $resolved) { Start-Sleep -Seconds 1 }
  }
  for ($i = 0; $i -lt 15; $i++) {
    if (Test-Url "$($tunnel.Url)$($tunnel.Path)") { return $true }
    Start-Sleep -Seconds 2
  }
  return $false
}

function Open-Tunnel($name, $port, $path) {
  $label = @{ foundry = "do Foundry"; wiki = "da wiki" }[$name]
  Write-Host "Abrindo o túnel $label..." -ForegroundColor Cyan
  $tunnel = Start-Tunnel $name $port $path
  if (-not $tunnel) { return $null }
  Write-Host "  Testando o link de fora ($($tunnel.Url))..." -ForegroundColor DarkGray
  if (Wait-Reachable $tunnel) {
    Write-Host "  Pronto: o link $label funciona de fora." -ForegroundColor Green
  } else {
    Write-Host "  O link $label ainda não respondeu de fora. Pode levar mais um minuto; veja $($tunnel.Log)" -ForegroundColor Yellow
  }
  return $tunnel
}

function Show-Links($tunnels, $title) {
  $lines = @($title, '')
  foreach ($tunnel in $tunnels) {
    if ($tunnel.Name -eq 'foundry') { $lines += "Foundry: $($tunnel.Url)" } else { $lines += "Wiki (visão dos jogadores): $($tunnel.Url)" }
  }
  $lines += @('', 'Os links mudam cada vez que você abre este script.', 'Teste você mesmo no celular, com o Wi-Fi desligado (4G).')
  if (-not $TesteSegundos) { $lines += 'O link do Foundry já foi copiado (Ctrl+V para colar).' }
  Write-Box $lines Green
  $foundry = $tunnels | Where-Object { $_.Name -eq 'foundry' } | Select-Object -First 1
  if ($foundry -and -not $TesteSegundos) { Set-Clipboard -Value $foundry.Url }
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

# Sem um mundo aberto, quem chega pelo link cai na tela de configuração, e não na de entrada.
if ((Get-Status "http://127.0.0.1:$FoundryPort/join") -ne 200) {
  Write-Box @(
    'Nenhum mundo está aberto no Foundry.',
    'Os jogadores cairiam na tela de configuração, e não na de entrada.',
    'Lance o mundo (Launch World) e rode este script de novo.'
  ) Yellow
  if (-not $TesteSegundos) {
    $answer = Read-Host 'Aperte Enter para sair, ou digite SEGUIR para abrir mesmo assim'
    if ($answer -ne 'SEGUIR') { exit 1 }
  }
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
    $server = Start-Process -FilePath 'node' -ArgumentList 'server.js' -WorkingDirectory $lore -RedirectStandardOutput (Join-Path $logs 'wiki-servidor.log') -RedirectStandardError (Join-Path $logs 'wiki-erros.log') -WindowStyle Hidden -PassThru
    $script:started += $server
    for ($i = 0; $i -lt 10 -and -not (Test-Port $WikiPort); $i++) { Start-Sleep -Milliseconds 500 }
    $wikiReady = Test-Port $WikiPort
  }
}

# ---------------- Túneis ----------------
try {
  $tunnels = @()
  $foundryTunnel = Open-Tunnel 'foundry' $FoundryPort '/join'
  if (-not $foundryTunnel) { Stop-Started; Exit-WithPause 1 }
  $tunnels += $foundryTunnel
  if ($wikiReady) {
    $wikiTunnel = Open-Tunnel 'wiki' $WikiPort '/jogadores.html'
    if ($wikiTunnel) { $tunnels += $wikiTunnel }
  }
  Show-Links $tunnels 'Mande estes links aos jogadores:'
  if ($wikiReady) { Write-Host 'Para abrir a wiki do mestre por fora: link-da-wiki/?mestre=SUA_SENHA (servidor ligado com GM_KEY).' -ForegroundColor DarkGray }
  Write-Host 'Lembre: cada usuário do mundo precisa ter senha no Foundry.' -ForegroundColor Yellow
  if ($TesteSegundos) { foreach ($tunnel in $tunnels) { Write-Output "$($tunnel.Name.ToUpper())=$($tunnel.Url)" } }

  # Vigia: a cada minuto confere se cada túnel continua de pé e respondendo de fora.
  if (-not $TesteSegundos) { Write-Host "`nDeixe esta janela aberta durante a sessão. Aperte Enter para fechar o acesso." -ForegroundColor Cyan }
  $deadline = if ($TesteSegundos) { (Get-Date).AddSeconds($TesteSegundos) } else { [datetime]::MaxValue }
  $nextCheck = (Get-Date).AddSeconds(60)
  while ((Get-Date) -lt $deadline) {
    if (-not $TesteSegundos -and [Console]::KeyAvailable -and [Console]::ReadKey($true).Key -eq 'Enter') { break }
    if ((Get-Date) -ge $nextCheck) {
      $status = @()
      $changed = $false
      for ($i = 0; $i -lt $tunnels.Count; $i++) {
        $tunnel = $tunnels[$i]
        $ok = -not $tunnel.Process.HasExited -and (Test-Url "$($tunnel.Url)$($tunnel.Path)")
        if (-not $ok) {
          # Uma segunda tentativa antes de reabrir: um minuto ruim de internet não precisa trocar o link.
          Start-Sleep -Seconds 5
          $ok = -not $tunnel.Process.HasExited -and (Test-Url "$($tunnel.Url)$($tunnel.Path)")
        }
        if (-not $ok) {
          Write-Host "$(Get-Date -Format 'HH:mm') O túnel $(@{ foundry = 'do Foundry'; wiki = 'da wiki' }[$tunnel.Name]) caiu. Abrindo de novo..." -ForegroundColor Red
          if (-not $tunnel.Process.HasExited) { Stop-Process -Id $tunnel.Process.Id -Force -ErrorAction SilentlyContinue }
          $new = Open-Tunnel $tunnel.Name $tunnel.Port $tunnel.Path
          if ($new) { $tunnels[$i] = $new; $changed = $true }
        }
        $status += "$($tunnels[$i].Name) $(if ($ok) { 'ok' } else { 'reaberto' })"
      }
      if ($changed) { Show-Links $tunnels 'ATENÇÃO: um link mudou. Mande os links novos aos jogadores:' }
      Write-Host "$(Get-Date -Format 'HH:mm') $($status -join ' · ')" -ForegroundColor DarkGray
      $nextCheck = (Get-Date).AddSeconds(60)
    }
    Start-Sleep -Milliseconds 300
  }
} finally {
  Stop-Started
  Write-Host 'Acesso de fora fechado.' -ForegroundColor Cyan
}

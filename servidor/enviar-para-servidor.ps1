# Leva do PC para o servidor o que não vai pelo GitHub, uma vez, na mudança para o servidor:
#   - dados da wiki: personagens e retratos, códigos dos jogadores, painel Publicar, regras da loja;
#   - os PDFs dos livros (no servidor, só o mestre abre);
#   - a pasta Data do Foundry: mundos, sistemas, módulos e imagens.
# Uso: dois cliques em servidor\enviar-para-servidor.bat. Pergunta o endereço do servidor e a chave SSH
# (o arquivo .key que a Oracle deu ao criar a máquina) e lembra deles para a próxima vez.
param([switch]$SoDados)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$wiki = Split-Path $PSScriptRoot -Parent
$config = Join-Path $PSScriptRoot 'servidor.local.json'

function Stop-WithMessage($text) { Write-Host ''; Write-Host $text -ForegroundColor Red; Read-Host 'Aperte Enter para sair' | Out-Null; exit 1 }
function Ask-YesNo($question) { $answer = Read-Host "$question [S/n]"; return -not ($answer -match '^[nN]') }

foreach ($tool in 'ssh', 'scp') {
  if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) { Stop-WithMessage "Não achei o comando '$tool'. Ele vem com o Windows 10/11 (Configurações → Recursos opcionais → Cliente OpenSSH)." }
}
# O tar do Windows: o do Git leria "C:\..." como endereço de outra máquina.
$tar = Join-Path $env:SystemRoot 'System32\tar.exe'
if (-not (Test-Path $tar)) { Stop-WithMessage 'Não achei o tar do Windows (vem com o Windows 10 de 2018 em diante).' }

# ---------------- Servidor e chave ----------------
$saved = $null
if (Test-Path $config) { $saved = Get-Content $config -Raw | ConvertFrom-Json }
$server = Read-Host "Servidor (ex.: ubuntu@203.0.113.10)$(if ($saved) { " [$($saved.servidor)]" })"
if (-not $server -and $saved) { $server = $saved.servidor }
$key = Read-Host "Arquivo da chave SSH (.key da Oracle)$(if ($saved) { " [$($saved.chave)]" })"
if (-not $key -and $saved) { $key = $saved.chave }
$key = $key.Trim('"')
if (-not $server -or -not (Test-Path $key)) { Stop-WithMessage 'Faltou o servidor ou a chave não existe.' }
# O ssh do Windows recusa chave que outros usuários do PC podem ler.
& icacls $key /inheritance:r /grant:r "$($env:USERNAME):R" | Out-Null
[System.IO.File]::WriteAllText($config, (@{ servidor = $server; chave = $key } | ConvertTo-Json), (New-Object System.Text.UTF8Encoding $false))

$sshArgs = @('-i', $key, '-o', 'StrictHostKeyChecking=accept-new')
Write-Host 'Testando a conexão…'
$check = & ssh @sshArgs $server 'test -d /srv/fieldbook/wiki && echo pronto'
if ($check -ne 'pronto') { Stop-WithMessage 'Não consegui entrar no servidor, ou ele ainda não foi montado (rode antes o servidor/instalar.sh nele).' }

# ---------------- Pacotes ----------------
$out = Join-Path $env:TEMP 'mesa-envio'
Remove-Item -Recurse -Force $out -ErrorAction SilentlyContinue
New-Item -ItemType Directory $out | Out-Null

if (Ask-YesNo 'Enviar os dados da wiki (personagens, retratos, códigos, Publicar, regras da loja)?') {
  $items = @('contas-jogadores.json', 'regras-loja.json', 'jogadores.json', 'jogadores-mestre.json', 'personagens', 'campanhas.json', 'campanhas', 'noticias-night-city.json', 'sessoes-jogadores.json', 'preferencias') | Where-Object { Test-Path (Join-Path $wiki $_) }
  & $tar -czf (Join-Path $out 'dados.tar.gz') -C $wiki --exclude 'personagens/apagados' @items
  Write-Host "  dados da wiki: $($items -join ', ')"
}
$pdfs = @(Get-ChildItem -Path $wiki -Filter '*.pdf' | ForEach-Object Name)
if (-not $SoDados -and $pdfs.Count -and (Ask-YesNo "Enviar os $($pdfs.Count) PDFs dos livros?")) {
  & $tar -cf (Join-Path $out 'pdfs.tar') -C $wiki @pdfs
}
$foundryData = Join-Path $env:LOCALAPPDATA 'FoundryVTT\Data'
if (-not $SoDados -and (Test-Path $foundryData) -and (Ask-YesNo "Enviar a pasta Data do Foundry ($foundryData)?")) {
  while (Get-Process | Where-Object { $_.ProcessName -match 'Foundry' }) {
    Read-Host 'O Foundry está aberto neste PC. Feche (os mundos precisam estar fechados para a cópia) e aperte Enter' | Out-Null
  }
  Write-Host '  compactando o Foundry (pode demorar se houver muitas imagens)…'
  & $tar -czf (Join-Path $out 'foundry.tar.gz') -C $foundryData --exclude 'logs' .
}
$files = @(Get-ChildItem $out)
if (-not $files.Count) { Write-Host 'Nada para enviar.'; exit 0 }
$size = ($files | Measure-Object Length -Sum).Sum / 1MB
Write-Host ('Enviando {0:N0} MB…' -f $size)

# ---------------- Envio ----------------
& ssh @sshArgs $server 'rm -rf /tmp/mesa-envio && mkdir -p /tmp/mesa-envio'
& scp @sshArgs $files.FullName "${server}:/tmp/mesa-envio/"
if ($LASTEXITCODE -ne 0) { Stop-WithMessage 'O envio falhou. Rode de novo.' }
& ssh @sshArgs $server 'sudo bash /srv/fieldbook/wiki/servidor/receber.sh /tmp/mesa-envio'
if ($LASTEXITCODE -ne 0) { Stop-WithMessage 'O servidor não conseguiu receber (veja a mensagem acima).' }
Remove-Item -Recurse -Force $out
Write-Host ''
Write-Host 'Pronto: o servidor recebeu tudo.' -ForegroundColor Green
Read-Host 'Aperte Enter para sair' | Out-Null

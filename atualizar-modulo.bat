@echo off
rem Atualiza os modulos do Foundry com o que esta na wiki:
rem cpr-2077 (compendios, importador de personagens e avisos da wiki)
rem NET Architect (pontos de acesso a NET nos Tiles)
rem e Fluxo de Combate (ataque, esquiva e dano; tira o Evasion Workflow).
rem Os compendios ficam travados com o Foundry aberto: feche antes.
cd /d "%~dp0foundry-2077"
echo.
echo  Atualizar os modulos "Cyberpunk RED: 2077", "NET Architect" e "Fluxo de Combate" no Foundry
echo  ------------------------------------------------------------------------------------------
echo  Feche o Foundry antes de continuar (ou pelo menos o mundo que usa o modulo).
echo.
pause
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao encontrado. Instale em https://nodejs.org e rode de novo.
  pause
  exit /b 1
)
if not exist ".cache\core\versao.json" (
  echo Primeira vez: lendo os compendios do sistema Cyberpunk RED...
  node build\extract-core.mjs
  if errorlevel 1 goto erro
)
node build\build.mjs
if errorlevel 1 goto erro
node ..\foundry-net-architect\instalar.mjs
if errorlevel 1 goto erro
node ..\foundry-fluxo-de-combate\instalar.mjs
if errorlevel 1 goto erro
echo.
echo  Pronto. Abra o Foundry e entre no mundo.
echo  Em Configurar modulos, "Cyberpunk RED: 2077", "NET Architect" e "Fluxo de Combate" precisam estar ativos.
echo  O Evasion Workflow saiu: o Fluxo de Combate faz o mesmo.
echo  Os personagens enviados pela wiki aparecem sozinhos para o mestre.
echo.
pause
exit /b 0

:erro
echo.
echo  Algo deu errado (veja a mensagem acima).
echo  Se falou em compendio aberto ou travado, feche o Foundry e rode de novo.
echo.
pause
exit /b 1

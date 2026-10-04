@echo off
rem Atualiza o modulo cpr-2077 do Foundry com o que esta na wiki:
rem compendios, importador de personagens e avisos da wiki.
rem Os compendios ficam travados com o Foundry aberto: feche antes.
cd /d "%~dp0foundry-2077"
echo.
echo  Atualizar o modulo "Cyberpunk RED: 2077" no Foundry
echo  ---------------------------------------------------
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
echo.
echo  Pronto. Abra o Foundry e entre no mundo.
echo  Em Configurar modulos, "Cyberpunk RED: 2077" precisa estar ativo.
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

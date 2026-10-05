@echo off
rem Leva do PC para o servidor, uma vez, o que nao vai pelo GitHub: personagens, codigos, PDFs e o Foundry.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0enviar-para-servidor.ps1" %*

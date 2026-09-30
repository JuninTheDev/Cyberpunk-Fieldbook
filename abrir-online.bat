@echo off
rem Abre o Foundry e a wiki dos jogadores para quem esta fora da sua rede (tunel do Cloudflare).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0abrir-online.ps1" %*

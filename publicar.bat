@echo off
rem Publica a wiki: manda o que mudou para o GitHub e o servidor coloca no ar em ate 1 minuto.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0publicar.ps1" %*

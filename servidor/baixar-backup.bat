@echo off
rem Traz para este PC o backup mais recente do servidor. Com -Agendar, faz isso sozinho todo domingo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0baixar-backup.ps1" %*

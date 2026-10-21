@echo off
rem Mesa da wiki, versao de teste: liga em http://localhost:8010 (Ctrl+C desliga).
rem Para apagar os dados de teste e comecar de novo: testar-mesa.bat --limpar
cd /d "%~dp0"
node testar.js %*
pause

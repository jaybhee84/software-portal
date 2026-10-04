@echo off
cd /d "%~dp0"
node --watch --env-file-if-exists=.env scripts/dev.mjs
pause

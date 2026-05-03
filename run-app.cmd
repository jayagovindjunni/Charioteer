@echo off
cd /d "%~dp0"
call npm.cmd run build
"C:\Program Files\nodejs\node.exe" "%~dp0server.js"

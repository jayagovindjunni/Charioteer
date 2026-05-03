@echo off
cd /d "%~dp0"
start "Charioteer API" "%~dp0run-api.cmd"
"C:\Program Files\nodejs\node.exe" "%~dp0node_modules\vite\bin\vite.js" --host 127.0.0.1 --port 5173

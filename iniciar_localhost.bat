@echo off
title Servidor Localhost - Garcia
cd /d "%~dp0"
set PORT=8080

echo ============================================
echo  Servidor local: http://localhost:%PORT%
echo  Pressione CTRL+C para parar
echo ============================================

start "" "http://localhost:%PORT%/index.html"

where python >nul 2>nul
if %errorlevel%==0 (
    python -m http.server %PORT%
    goto :fim
)

where npx >nul 2>nul
if %errorlevel%==0 (
    npx -y serve -l %PORT% .
    goto :fim
)

echo Python ou Node.js nao encontrado. Instale um deles para continuar.

:fim
pause

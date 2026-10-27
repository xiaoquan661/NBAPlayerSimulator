@echo off
setlocal
cd /d "%~dp0"

set "PORT=8765"
set "URL=http://127.0.0.1:%PORT%/index.html"

echo ==========================================
echo   NBA Local Server
echo   Folder: %~dp0
echo   URL:    %URL%
echo ==========================================
echo.

start "NBA Local Server" /min powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\serve-static.ps1" -Port %PORT%

ping -n 3 127.0.0.1 >nul
start "" "%URL%"

echo Server started. Browser is opening.
echo Close the "NBA Local Server" window to stop the server.
echo.
pause
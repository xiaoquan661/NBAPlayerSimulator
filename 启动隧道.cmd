@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title NBA Tunnel

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\start-tunnel.ps1" -Port 8765

if errorlevel 1 (
    echo.
    echo Tunnel failed. Check the message above.
    pause
)

endlocal

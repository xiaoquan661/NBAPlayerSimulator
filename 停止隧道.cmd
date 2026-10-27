@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title Stop NBA Tunnel

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$pidFile = Join-Path '%~dp0tools' 'cf.pid';" ^
  "if (Test-Path $pidFile) {" ^
  "  $id = (Get-Content $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1);" ^
  "  if ($id -match '^\d+$') { Stop-Process -Id ([int]$id) -Force -ErrorAction SilentlyContinue; Write-Host ('Tunnel stopped (PID ' + $id + ').') -ForegroundColor Green }" ^
  "  else { Write-Host 'PID file is invalid.' -ForegroundColor Yellow }" ^
  "  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue" ^
  "} else {" ^
  "  Write-Host 'No tunnel PID file found. It may already be stopped.' -ForegroundColor Yellow" ^
  "}"

echo.
pause
endlocal

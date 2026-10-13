@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0iniciar-vocal.ps1"
if errorlevel 1 (
  echo.
  echo No se pudo iniciar V.O.C.A.L. Revisa el mensaje anterior.
  pause
)
endlocal

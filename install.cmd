@echo off
rem ============================================================
rem  dsh-eye one-click installer entry for cmd.exe
rem  (PowerShell users can also run install.ps1 directly)
rem  Usage: install.cmd [-SkipSetup] [-Force]
rem ============================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1" %*
if errorlevel 1 (
  echo.
  echo Install failed. Run "powershell -ExecutionPolicy Bypass -File install.ps1" for details.
  pause
)

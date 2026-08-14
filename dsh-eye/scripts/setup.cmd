@echo off
rem ============================================================
rem  dsh-eye config wizard entry for cmd.exe
rem  (PowerShell users can run setup.ps1 directly)
rem  Usage: setup.cmd [-DryRun] [-Unset] [-BaseUrl URL] ...
rem ============================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1" %*
if errorlevel 1 (
  echo.
  echo Setup failed. Run "powershell -ExecutionPolicy Bypass -File setup.ps1" for details.
  pause
)

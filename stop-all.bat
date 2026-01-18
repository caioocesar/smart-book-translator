@echo off
REM Smart Book Translator - Complete Stop Script (Windows)
REM Stops everything: backend, frontend, Docker, and frees WSL memory

echo.
echo Stopping Smart Book Translator (complete cleanup)...
echo.

powershell.exe -ExecutionPolicy Bypass -File "%~dp0stop-all.ps1"

pause

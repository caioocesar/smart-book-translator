@echo off
REM Smart Book Translator - Stop Docker Containers (Windows Batch)
REM This is a simple wrapper that calls the PowerShell script

echo.
echo Stopping Docker containers and freeing WSL memory...
echo.

powershell.exe -ExecutionPolicy Bypass -File "%~dp0stop-docker.ps1"

pause

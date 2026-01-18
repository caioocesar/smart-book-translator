@echo off
echo ========================================
echo  Ollama Installation for Windows
echo ========================================
echo.
echo This script will install Ollama on your system.
echo.
echo [INFO] You need Administrator privileges to install Ollama.
echo [INFO] The installer will open in a few seconds...
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [WARNING] Not running as Administrator!
    echo.
    echo Please right-click this file and select "Run as administrator"
    echo.
    pause
    exit /b 1
)

echo [OK] Running with Administrator privileges
echo.

REM Method 1: Direct download and install (simplest)
echo Downloading Ollama installer...
echo.

REM Create temp directory
set TEMP_DIR=%TEMP%\ollama-install
if not exist "%TEMP_DIR%" mkdir "%TEMP_DIR%"

REM Download using PowerShell
powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://ollama.com/download/OllamaSetup.exe' -OutFile '%TEMP_DIR%\OllamaSetup.exe'}"

if errorlevel 1 (
    echo.
    echo [ERROR] Failed to download Ollama installer
    echo.
    echo Please download manually from: https://ollama.com/download
    echo.
    pause
    exit /b 1
)

echo [OK] Download completed!
echo.

echo Running Ollama installer...
echo Please follow the installation wizard.
echo.

REM Run installer
start /wait "" "%TEMP_DIR%\OllamaSetup.exe"

echo.
echo Cleaning up...
del /f /q "%TEMP_DIR%\OllamaSetup.exe" 2>nul
rmdir "%TEMP_DIR%" 2>nul

echo.
echo ========================================
echo  Verifying Installation
echo ========================================
echo.

REM Wait a moment for PATH to update
timeout /t 3 /nobreak >nul

REM Check if Ollama is installed
where ollama >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Ollama command not found in PATH
    echo.
    echo This is normal! You need to:
    echo   1. Close this window
    echo   2. Restart your computer
    echo   3. Open the Smart Book Translator app
    echo.
    echo Ollama will be available after restart.
) else (
    echo [OK] Ollama installed successfully!
    echo.
    
    REM Get version
    for /f "delims=" %%i in ('ollama --version 2^>^&1') do set OLLAMA_VERSION=%%i
    echo Version: %OLLAMA_VERSION%
    echo.
    
    echo Starting Ollama service...
    start /B ollama serve
    
    timeout /t 3 /nobreak >nul
    
    echo [OK] Ollama service started!
    echo.
    echo Ollama is running at: http://localhost:11434
)

echo.
echo ========================================
echo  Installation Complete!
echo ========================================
echo.
echo Next steps:
echo   1. Restart your computer (if Ollama not found)
echo   2. Open Smart Book Translator
echo   3. Go to Settings ^> LLM Enhancement
echo   4. Click "Download Model" to get llama3.2:3b
echo.
echo For more information: https://ollama.com
echo.
pause

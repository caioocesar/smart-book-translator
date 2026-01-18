@echo off
echo ========================================
echo  Docker Desktop Installation
echo ========================================
echo.
echo This script will help you install Docker Desktop for Windows.
echo.
echo [INFO] Docker is required for LibreTranslate (local translation)
echo [INFO] You need Administrator privileges to install Docker
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

REM Check if Docker is already installed
docker --version >nul 2>&1
if not errorlevel 1 (
    echo [INFO] Docker is already installed!
    echo.
    docker --version
    echo.
    
    set /p response="Do you want to reinstall Docker? (y/N): "
    if /i not "%response%"=="y" (
        echo.
        echo Installation cancelled.
        pause
        exit /b 0
    )
)

echo Step 1: Downloading Docker Desktop installer...
echo.
echo [INFO] This is a large file (~500MB), please be patient...
echo.

REM Create temp directory
set TEMP_DIR=%TEMP%\docker-install
if not exist "%TEMP_DIR%" mkdir "%TEMP_DIR%"

REM Download Docker Desktop
echo Downloading from Docker.com...
powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://desktop.docker.com/win/main/amd64/Docker%%20Desktop%%20Installer.exe' -OutFile '%TEMP_DIR%\DockerDesktopInstaller.exe'}"

if errorlevel 1 (
    echo.
    echo [ERROR] Failed to download Docker Desktop installer
    echo.
    echo Please download manually from: https://www.docker.com/get-started
    echo.
    pause
    exit /b 1
)

echo.
echo [OK] Download completed!
echo.

echo Step 2: Running Docker Desktop installer...
echo.
echo [INFO] Please follow the installation wizard
echo [INFO] Installation may take 5-10 minutes
echo.

REM Run installer
start /wait "" "%TEMP_DIR%\DockerDesktopInstaller.exe" install --quiet --accept-license

if errorlevel 1 (
    echo.
    echo [WARNING] Installer returned an error code
    echo [INFO] This may be normal - Docker might still be installed
    echo.
)

echo.
echo Cleaning up...
del /f /q "%TEMP_DIR%\DockerDesktopInstaller.exe" 2>nul
rmdir "%TEMP_DIR%" 2>nul

echo.
echo ========================================
echo  Installation Complete!
echo ========================================
echo.

echo [IMPORTANT] You MUST restart your computer now!
echo.
echo After restart:
echo   1. Docker Desktop will start automatically
echo   2. Wait for Docker to fully start (1-2 minutes)
echo   3. Open Smart Book Translator
echo   4. LibreTranslate will auto-start
echo.

set /p response="Do you want to restart now? (Y/n): "
if /i not "%response%"=="n" (
    echo.
    echo Restarting computer in 10 seconds...
    echo Press Ctrl+C to cancel
    timeout /t 10
    shutdown /r /t 0
) else (
    echo.
    echo [WARNING] Remember to restart your computer manually!
    echo Docker will not work until you restart.
    echo.
    pause
)

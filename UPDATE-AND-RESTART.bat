@echo off
chcp 65001 >nul
title Smart Book Translator - Update and Restart
echo.
echo ========================================
echo   SMART BOOK TRANSLATOR - UPDATE
echo ========================================
echo.
echo This script will:
echo   1. Stop running servers
echo   2. Rebuild the frontend
echo   3. Restart the application
echo.
echo Please wait...
echo.

REM Step 1: Stop running servers
echo [1/3] Stopping running servers...
echo.

REM Kill any running node processes for this app
tasklist /FI "WINDOWTITLE eq Backend Server*" 2>nul | find /I /N "cmd.exe">nul
if "%ERRORLEVEL%"=="0" (
    echo   Stopping Backend Server...
    taskkill /FI "WINDOWTITLE eq Backend Server*" /F >nul 2>&1
)

tasklist /FI "WINDOWTITLE eq Frontend Dev Server*" 2>nul | find /I /N "cmd.exe">nul
if "%ERRORLEVEL%"=="0" (
    echo   Stopping Frontend Dev Server...
    taskkill /FI "WINDOWTITLE eq Frontend Dev Server*" /F >nul 2>&1
)

REM Give processes time to close
timeout /t 2 /nobreak >nul
echo   [OK] Servers stopped
echo.

REM Step 2: Rebuild frontend (this picks up the latest code changes)
echo [2/3] Rebuilding frontend with latest changes...
echo.
echo   This will take 10-30 seconds...
echo.

cd /d "%~dp0frontend"
call npm run build >nul 2>&1

if errorlevel 1 (
    echo   [WARNING] Frontend build had some warnings, but continuing...
) else (
    echo   [OK] Frontend rebuilt successfully!
)
echo.

cd /d "%~dp0"

REM Step 3: Restart the application
echo [3/3] Restarting application...
echo.

REM Check if Docker is available and clean up existing LibreTranslate containers
echo Checking Docker status...
docker --version >nul 2>&1
if errorlevel 1 (
    echo [INFO] Docker is not installed - LibreTranslate will not be available
    echo.
    goto :skip_docker_cleanup
)

echo [OK] Docker is installed
docker ps >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Docker is installed but not running
    echo [INFO] Please start Docker Desktop if you want LibreTranslate
    echo.
    goto :skip_docker_cleanup
)

echo [OK] Docker is running
echo.
echo Checking for stopped/failed LibreTranslate containers...

REM Only remove STOPPED or EXITED containers, not running ones
for /f "tokens=*" %%i in ('docker ps -a --filter "name=libretranslate" --filter "status=exited" --format "{{.ID}}" 2^>nul') do (
    echo   Removing stopped container: %%i
    docker rm -f %%i >nul 2>&1
)

for /f "tokens=*" %%i in ('docker ps -a --filter "ancestor=libretranslate/libretranslate" --filter "status=exited" --format "{{.ID}}" 2^>nul') do (
    echo   Removing stopped container: %%i
    docker rm -f %%i >nul 2>&1
)

REM Check if there's already a running container
docker ps --filter "name=libretranslate" --format "{{.ID}}" 2>nul | findstr /r "." >nul
if %errorlevel% equ 0 (
    echo [INFO] LibreTranslate container is already running
    echo [INFO] The backend will connect to it automatically
) else (
    echo [OK] No running containers found - backend will start a new one
)
echo.

:skip_docker_cleanup

echo Starting Backend...
start "Backend Server" cmd /k "cd /d "%~dp0backend" && npm start"
echo.
echo Waiting 3 seconds for backend to initialize...
timeout /t 3 /nobreak >nul
echo.
echo Starting Frontend...
start "Frontend Dev Server" cmd /k "cd /d "%~dp0frontend" && npm run dev"
echo.
echo Waiting 10 seconds for frontend to initialize...
timeout /t 10 /nobreak >nul
echo.
echo Opening browser...
start http://localhost:3000
echo.
echo ========================================
echo   UPDATE COMPLETE - APPLICATION STARTED!
echo ========================================
echo.
echo Two windows should now be open:
echo   - Backend Server (running on port 5000)
echo   - Frontend Dev Server (running on port 3000)
echo.
echo Your browser should open automatically.
echo If not, go to: http://localhost:3000
echo.
echo IMPORTANT: Press Ctrl+F5 in your browser to force refresh
echo            and clear any cached old code!
echo.
echo To stop the application:
echo   - Close both server windows
echo   - Or run: stop-all.bat
echo.
echo You can now close this window.
echo.
pause

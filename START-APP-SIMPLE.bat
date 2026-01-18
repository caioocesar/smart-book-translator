@echo off
chcp 65001 >nul
title Smart Book Translator - Launcher
echo.
echo ========================================
echo   SMART BOOK TRANSLATOR - LAUNCHER
echo ========================================
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
REM This prevents killing containers that are still booting
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
echo   APPLICATION STARTED!
echo ========================================
echo.
echo Two windows should now be open:
echo   - Backend Server (running on port 5000)
echo   - Frontend Dev Server (running on port 3000)
echo.
echo Your browser should open automatically.
echo If not, go to: http://localhost:3000
echo.
echo Note: LibreTranslate will auto-start if Docker is running.
echo       The backend will handle container cleanup automatically.
echo.
echo To stop the application:
echo   - Close both server windows
echo   - Or run: stop-all.bat
echo.
echo You can now close this window.
echo.
pause

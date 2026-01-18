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
echo Cleaning up existing LibreTranslate containers (if any)...

REM Remove containers by name (suppress errors if none found)
for /f "tokens=*" %%i in ('docker ps -a --filter "name=libretranslate" --format "{{.ID}}" 2^>nul') do (
    echo   Removing container: %%i
    docker rm -f %%i >nul 2>&1
)

REM Remove containers by image (suppress errors if none found)
for /f "tokens=*" %%i in ('docker ps -a --filter "ancestor=libretranslate/libretranslate" --format "{{.ID}}" 2^>nul') do (
    echo   Removing container: %%i
    docker rm -f %%i >nul 2>&1
)

echo [OK] Docker cleanup completed
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

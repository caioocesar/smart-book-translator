@echo off
echo ========================================
echo  Restart LibreTranslate (Docker)
echo ========================================
echo.

REM Check if Docker is running
docker ps >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running!
    echo.
    echo Please start Docker Desktop and try again.
    echo.
    pause
    exit /b 1
)

echo [OK] Docker is running
echo.

echo Step 1: Checking LibreTranslate status...
echo.

REM Check if container is running
docker ps --filter "name=libretranslate" --format "{{.ID}}" 2>nul | findstr /r "." >nul
if %errorlevel% equ 0 (
    echo [INFO] Found running container - restarting it...
    for /f "tokens=*" %%i in ('docker ps -q --filter "name=libretranslate"') do (
        echo Restarting container: %%i
        docker restart %%i
    )
    goto :wait_for_init
) else (
    echo [INFO] No running container found
)

echo.
echo Step 2: Cleaning up stopped containers...
echo.

REM Only remove STOPPED/EXITED containers
for /f "tokens=*" %%i in ('docker ps -aq --filter "ancestor=libretranslate/libretranslate" --filter "status=exited"') do (
    echo Removing stopped container: %%i
    docker rm %%i
)

for /f "tokens=*" %%i in ('docker ps -aq --filter "name=libretranslate" --filter "status=exited"') do (
    echo Removing stopped container: %%i
    docker rm %%i
)

echo.
echo [OK] Cleanup completed!
echo.

echo Step 3: Starting new LibreTranslate container...
echo.
echo This may take 10-30 seconds on first run (downloading image)...
echo.

REM Start new container with optimized settings
docker run -d -p 5001:5000 --name libretranslate -e LT_LOAD_ONLY=en,pt,es,fr,de,it,ja,zh --restart unless-stopped libretranslate/libretranslate:latest

:wait_for_init

if errorlevel 1 (
    echo.
    echo [ERROR] Failed to start LibreTranslate!
    echo.
    echo Possible causes:
    echo   - Port 5001 is already in use
    echo   - Docker image download failed
    echo   - Insufficient disk space
    echo.
    pause
    exit /b 1
)

echo.
echo [OK] Container started!
echo.

echo Step 4: Waiting for LibreTranslate to initialize...
echo.
echo This takes 1-2 minutes (loading language models)
echo.

REM Wait and show progress
for /L %%i in (1,1,30) do (
    echo [%%i/30] Waiting... ^(%%i0 seconds^)
    timeout /t 3 /nobreak >nul
)

echo.
echo ========================================
echo  LibreTranslate Restarted!
echo ========================================
echo.

echo Status:
docker ps --filter "name=libretranslate" --format "table {{.ID}}\t{{.Status}}\t{{.Ports}}"

echo.
echo LibreTranslate should be running at: http://localhost:5001
echo.
echo You can now:
echo   1. Open Smart Book Translator
echo   2. The status should show "RUNNING"
echo   3. Start translating!
echo.
pause

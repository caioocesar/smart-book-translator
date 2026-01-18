@echo off
echo ========================================
echo  Restart All Translation Services
echo ========================================
echo.
echo This script will restart:
echo   1. LibreTranslate (Docker)
echo   2. Ollama (LLM)
echo.

pause

echo.
echo ========================================
echo  Part 1: Restarting LibreTranslate
echo ========================================
echo.

REM Check if Docker is running
docker ps >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Docker is not running!
    echo [INFO] Skipping LibreTranslate restart
    echo.
    echo Please start Docker Desktop manually and run:
    echo   RESTART-LIBRETRANSLATE.bat
    echo.
) else (
    echo Checking LibreTranslate status...
    
    REM Check if container is already running
    docker ps --filter "name=libretranslate" --format "{{.ID}}" 2>nul | findstr /r "." >nul
    if %errorlevel% equ 0 (
        echo [INFO] LibreTranslate container is already running
        echo [INFO] Restarting it...
        for /f "tokens=*" %%i in ('docker ps -q --filter "name=libretranslate"') do docker restart %%i 2>nul
    ) else (
        echo Cleaning up stopped containers...
        REM Only remove STOPPED containers
        for /f "tokens=*" %%i in ('docker ps -aq --filter "ancestor=libretranslate/libretranslate" --filter "status=exited"') do docker rm -f %%i 2>nul
        for /f "tokens=*" %%i in ('docker ps -aq --filter "name=libretranslate" --filter "status=exited"') do docker rm -f %%i 2>nul
        
        echo Starting new LibreTranslate container...
        docker run -d -p 5001:5000 --name libretranslate -e LT_LOAD_ONLY=en,pt,es,fr,de,it,ja,zh --restart unless-stopped libretranslate/libretranslate:latest
    )
    
    if errorlevel 1 (
        echo [ERROR] Failed to start LibreTranslate
    ) else (
        echo [OK] LibreTranslate started successfully!
    )
)

echo.
echo ========================================
echo  Part 2: Restarting Ollama
echo ========================================
echo.

REM Check if Ollama is installed
where ollama >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Ollama is not installed!
    echo [INFO] Skipping Ollama restart
    echo.
    echo To install Ollama, run:
    echo   INSTALL-OLLAMA.bat
    echo.
) else (
    echo Stopping Ollama service...
    taskkill /F /IM ollama.exe >nul 2>&1
    
    timeout /t 2 /nobreak >nul
    
    echo Starting Ollama service...
    start /B ollama serve
    
    timeout /t 3 /nobreak >nul
    
    curl -s http://localhost:11434 >nul 2>&1
    if errorlevel 1 (
        echo [WARNING] Ollama may not be responding yet
    ) else (
        echo [OK] Ollama started successfully!
    )
)

echo.
echo ========================================
echo  Restart Complete!
echo ========================================
echo.

echo Waiting for services to initialize (60 seconds)...
echo.

for /L %%i in (1,1,20) do (
    echo [%%i/20] Please wait... ^(%%i seconds^)
    timeout /t 3 /nobreak >nul
)

echo.
echo ========================================
echo  Status Summary
echo ========================================
echo.

echo LibreTranslate:
docker ps --filter "name=libretranslate" --format "  Status: {{.Status}}" 2>nul
if errorlevel 1 (
    echo   Status: Not running or Docker unavailable
)

echo.
echo Ollama:
curl -s http://localhost:11434 >nul 2>&1
if errorlevel 1 (
    echo   Status: Not responding
) else (
    echo   Status: Running
)

echo.
echo ========================================
echo  Next Steps
echo ========================================
echo.
echo 1. Open Smart Book Translator
echo 2. Wait 1-2 minutes for full initialization
echo 3. Check status by clicking "🏠 Local" in header
echo 4. Start translating!
echo.
pause

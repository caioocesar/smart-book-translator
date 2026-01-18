@echo off
echo ========================================
echo  Restart Ollama Service
echo ========================================
echo.

REM Check if Ollama is installed
where ollama >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Ollama is not installed!
    echo.
    echo Please install Ollama first:
    echo   - Right-click INSTALL-OLLAMA.bat
    echo   - Select "Run as administrator"
    echo.
    echo Or download from: https://ollama.com
    echo.
    pause
    exit /b 1
)

echo [OK] Ollama is installed
echo.

echo Step 1: Stopping Ollama service...
echo.

REM Stop all Ollama processes
taskkill /F /IM ollama.exe >nul 2>&1
if errorlevel 1 (
    echo [INFO] No Ollama processes were running
) else (
    echo [OK] Stopped existing Ollama processes
)

echo.
timeout /t 2 /nobreak >nul

echo Step 2: Starting Ollama service...
echo.

REM Start Ollama in background
start /B ollama serve

echo [OK] Ollama service started
echo.

echo Step 3: Verifying service is running...
echo.

timeout /t 3 /nobreak >nul

REM Check if Ollama is responding
curl -s http://localhost:11434 >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Ollama service may not be responding yet
    echo [INFO] Wait a few more seconds and try again
) else (
    echo [OK] Ollama service is responding!
)

echo.
echo ========================================
echo  Ollama Service Restarted!
echo ========================================
echo.

echo Ollama is running at: http://localhost:11434
echo.

REM Show Ollama version
echo Version:
ollama --version

echo.
echo Installed models:
ollama list

echo.
echo You can now:
echo   1. Open Smart Book Translator
echo   2. Go to Settings ^> LLM Enhancement
echo   3. Use LLM enhancements in translations
echo.
pause

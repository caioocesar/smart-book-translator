@echo off
setlocal enabledelayedexpansion
echo ========================================
echo  Smart Book Translator - Install and Build
echo ========================================
echo.
echo This script will:
echo  1. Clean old installer files
echo  2. Install all dependencies (if needed)
echo  3. Install Ollama (optional AI enhancement)
echo  4. Build frontend
echo  5. Build Windows installer (NSIS + Portable)
echo  6. Open the dist folder
echo.
echo [INFO] This script does NOT require admin privileges.
echo [INFO] If you see permission errors, make sure:
echo        - No installer files are open
echo        - Antivirus is not blocking file access
echo        - You have write permissions to this folder
echo.

REM Check if we can write to the current directory
echo Checking write permissions...
> "%TEMP%\test_write_permissions.tmp" echo test 2>nul
if errorlevel 1 (
    echo [WARNING] Cannot write to temp folder. This may cause issues.
    echo [INFO] Try running as administrator if problems occur.
) else (
    del "%TEMP%\test_write_permissions.tmp" >nul 2>&1
    echo [OK] Write permissions OK.
)
echo.

REM Step 1: Clean old installer files
echo ========================================
echo  Step 1: Cleaning old installer files
echo ========================================
echo.

REM Check if dist folder exists, create if not
if not exist "electron\dist\" (
    echo Creating dist folder...
    mkdir "electron\dist" 2>nul
    if errorlevel 1 (
        echo [WARNING] Could not create dist folder. May need admin privileges.
        echo [INFO] Continuing anyway - build process will create it...
    )
)

REM Try to clean old files (non-critical step)
if exist "electron\dist\*.exe" (
    echo Removing old installer files...
    echo [INFO] If you see permission errors, close any open installer files and try again.
    echo.
    
    REM Try to delete files one by one for better error handling
    for %%f in ("electron\dist\*.exe") do (
        del /f /q "%%f" 2>nul
        if errorlevel 1 (
            echo [WARNING] Could not delete: %%f
            echo [INFO] File may be locked or require admin privileges.
            echo [INFO] You can manually delete it later. Continuing...
        )
    )
    
    REM Check if any files remain
    set /a filesRemaining=0
    for %%f in ("electron\dist\*.exe") do set /a filesRemaining+=1
    
    if !filesRemaining! EQU 0 (
        echo [OK] Old installer files removed successfully.
    ) else (
        echo [WARNING] Some old installer files could not be removed.
        echo [INFO] This is usually OK - new files will be created with different names.
        echo [INFO] You can manually delete old files from electron\dist\ later if needed.
    )
) else (
    echo [OK] No old installer files to clean.
)
echo.

REM Step 2: Check and install dependencies
echo ========================================
echo  Step 2: Checking dependencies
echo ========================================
echo.

if not exist "frontend\node_modules\" (
    echo [!] Dependencies not installed yet.
    echo [*] Installing dependencies... This will take 2-5 minutes.
    echo.
    call npm run install:all
    if errorlevel 1 (
        echo.
        echo ========================================
        echo  [ERROR] Failed to install dependencies!
        echo ========================================
        echo.
        echo Please check your internet connection and try again.
        echo.
        pause
        exit /b 1
    )
echo.
echo [OK] Dependencies installed successfully!
echo.
) else (
    echo [OK] Dependencies already installed.
    echo.
)

REM Step 3: Install Ollama (optional)
echo ========================================
echo  Step 3: Installing Ollama (Optional)
echo ========================================
echo.
echo Ollama enhances translations with AI (formality, structure, glossary).
echo This is OPTIONAL but recommended for better translation quality.
echo.

REM Check if Ollama is already installed
where ollama >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Ollama is already installed!
    for /f "delims=" %%i in ('ollama --version 2^>^&1') do set OLLAMA_VERSION=%%i
    echo Version: %OLLAMA_VERSION%
    echo.
    goto :skip_ollama_install
)

REM Check common installation paths
set OLLAMA_FOUND=0
if exist "C:\Program Files\Ollama\ollama.exe" set OLLAMA_FOUND=1
if exist "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" set OLLAMA_FOUND=1

if %OLLAMA_FOUND% equ 1 (
    echo [OK] Ollama is installed but not in PATH (restart computer to fix)
    echo.
    goto :skip_ollama_install
)

echo [!] Ollama is not installed yet.
echo.
choice /C YN /M "Do you want to install Ollama now? (Recommended)"

if errorlevel 2 (
    echo.
    echo [INFO] Skipping Ollama installation.
    echo [INFO] You can install it later by running: INSTALL-OLLAMA.bat
    echo.
    goto :skip_ollama_install
)

echo.
echo [*] Installing Ollama...
echo [*] This will download and install Ollama (~100MB)
echo [*] Please follow the installation wizard when it appears.
echo.

REM Create temp directory
set TEMP_DIR=%TEMP%\ollama-install
if not exist "%TEMP_DIR%" mkdir "%TEMP_DIR%"

REM Download Ollama installer
echo Downloading Ollama installer (~100MB)...
echo This should take 30-60 seconds on a good connection.
echo.
powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest -Uri 'https://ollama.com/download/OllamaSetup.exe' -OutFile '%TEMP_DIR%\OllamaSetup.exe' -TimeoutSec 300}" 2>nul

if errorlevel 1 (
    echo [WARNING] Failed to download Ollama installer
    echo [INFO] You can install it manually later from: https://ollama.com/download
    echo [INFO] Or run: INSTALL-OLLAMA.bat
    echo.
    goto :skip_ollama_install
)

echo [OK] Download completed!
echo.
echo Running Ollama installer...
echo Please follow the installation wizard.
echo.

REM Run installer and wait for completion
start /wait "" "%TEMP_DIR%\OllamaSetup.exe"

echo.
echo Cleaning up...
del /f /q "%TEMP_DIR%\OllamaSetup.exe" 2>nul
rmdir "%TEMP_DIR%" 2>nul

echo.
echo [OK] Ollama installation completed!
echo.
echo [INFO] IMPORTANT: You may need to restart your computer for Ollama to work.
echo [INFO] After restart, the app will auto-detect and start Ollama.
echo.

:skip_ollama_install

REM Step 4: Build frontend
echo ========================================
echo  Step 4: Building frontend
echo ========================================
echo.
echo Building React frontend...
echo.

call npm run build:frontend

if errorlevel 1 (
    echo.
    echo ========================================
    echo  [ERROR] Frontend build failed!
    echo ========================================
    echo.
    echo Please check the error messages above.
    echo.
    pause
    exit /b 1
)

echo.
echo [OK] Frontend built successfully!
echo.

REM Step 5: Build installer
echo ========================================
echo  Step 5: Building Windows Installer
echo ========================================
echo.
echo This will create:
echo  1. NSIS Installer (next-next-finish style)
echo  2. Portable version (no installation needed)
echo.
echo Please wait 3-5 minutes...
echo.

call npm run build:installer:win

if errorlevel 1 (
    echo.
    echo ========================================
    echo  [ERROR] Installer build failed!
    echo ========================================
    echo.
    echo Please check the error messages above.
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo  [SUCCESS] All Done!
echo ========================================
echo.
echo Your installers are ready in:
echo  electron\dist\
echo.
echo Files created:
echo  - Smart Book Translator-Setup-1.0.0.exe  (INSTALLER)
echo  - Smart Book Translator-1.0.0-Portable.exe  (PORTABLE)
echo.
echo Opening folder...
echo.

REM Open the dist folder
start "" "%~dp0electron\dist"

echo.
echo ========================================
echo  What to do next:
echo ========================================
echo.
echo 1. Test the installer on your machine
echo 2. Share the installer with others
echo 3. Users just double-click and follow next-next-finish!
echo.
echo [INFO] If you installed Ollama, remember to:
echo        - Restart your computer for PATH update
echo        - Open the app and download AI model (Settings ^> LLM Enhancement)
echo.
pause

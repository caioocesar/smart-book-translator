@echo off
echo ========================================
echo  Smart Book Translator - Build Installer
echo ========================================
echo.

REM Check if node_modules exists in frontend
if not exist "frontend\node_modules\" (
    echo [!] Dependencies not installed yet.
    echo [*] Installing dependencies... This will take 2-5 minutes.
    echo.
    call npm run install:all
    if errorlevel 1 (
        echo.
        echo [ERROR] Failed to install dependencies!
        echo Please check your internet connection and try again.
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

echo ========================================
echo  Building Windows Installer...
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
    echo  [ERROR] Build Failed!
    echo ========================================
    echo.
    echo Please check the error messages above.
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo  [SUCCESS] Installer Built!
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
pause

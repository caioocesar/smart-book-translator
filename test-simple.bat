@echo off
echo ========================================
echo   Testing Node.js and Project Structure
echo ========================================
echo.

echo Current directory:
cd
echo.

echo Checking Node.js...
where node
if errorlevel 1 (
    echo [ERROR] Node.js not found in PATH
    echo.
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo Node.js version:
node -v
echo.

echo npm version:
npm -v
echo.

echo Checking project folders...
if exist "backend" (
    echo [OK] backend folder exists
) else (
    echo [ERROR] backend folder NOT found
)

if exist "frontend" (
    echo [OK] frontend folder exists
) else (
    echo [ERROR] frontend folder NOT found
)

if exist "backend\node_modules" (
    echo [OK] backend\node_modules exists
) else (
    echo [INFO] backend\node_modules NOT found - need to run npm install
)

if exist "frontend\node_modules" (
    echo [OK] frontend\node_modules exists
) else (
    echo [INFO] frontend\node_modules NOT found - need to run npm install
)

echo.
echo ========================================
echo   Test Complete
echo ========================================
echo.
echo If you see this message, the basic setup is OK.
echo You can now try running smart-book-translator.bat
echo.
pause

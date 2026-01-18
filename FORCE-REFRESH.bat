@echo off
chcp 65001 >nul
title Force Browser Refresh
echo.
echo ========================================
echo   FORCE BROWSER REFRESH INSTRUCTIONS
echo ========================================
echo.
echo Your source code is up to date!
echo The issue is browser caching.
echo.
echo TO SEE YOUR CHANGES:
echo.
echo   1. Go to your browser (http://localhost:3000)
echo.
echo   2. Press ONE of these key combinations:
echo      - Ctrl + Shift + R  (Chrome, Firefox, Edge)
echo      - Ctrl + F5         (Alternative)
echo      - Shift + F5        (Alternative)
echo.
echo   3. The page will reload and clear the cache
echo.
echo   4. You should now see: "Apply all glossary terms to translation"
echo      Instead of: "Use all glossary entries"
echo.
echo ========================================
echo.
echo STILL NOT WORKING?
echo.
echo Option A: Clear browser cache manually
echo   - Chrome: Ctrl+Shift+Delete, select "Cached images and files"
echo   - Firefox: Ctrl+Shift+Delete, select "Cache"
echo   - Edge: Ctrl+Shift+Delete, select "Cached data and files"
echo.
echo Option B: Use Incognito/Private mode
echo   - This bypasses all cache
echo   - Go to: http://localhost:3000
echo.
echo Option C: Run CLEAR-CACHE-AND-START.bat
echo   - This clears Vite cache and restarts everything
echo.
echo ========================================
echo.
pause

@echo off
cd /d "%~dp0"

echo.
echo ========================================
echo   PPC Sync - %DATE% %TIME%
echo ========================================
echo.

echo [1/2] Fetching campaigns...
node fetch-ppc-campaigns.js
if %ERRORLEVEL% neq 0 (
    echo ERROR: fetch-ppc-campaigns.js failed
    pause
    exit /b 1
)

echo.
echo [2/2] Fetching metrics (takes ~10-15 min)...
node fetch-ppc-metrics.js
if %ERRORLEVEL% neq 0 (
    echo ERROR: fetch-ppc-metrics.js failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo   DONE - Sheet updated successfully
echo ========================================
echo.

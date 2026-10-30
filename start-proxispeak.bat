@echo off
title ProxiSpeak - Starting Workspace
cls
echo ========================================================
echo          PROXISPEAK - VIRTUAL OFFICE LAUNCHER
echo ========================================================
echo.
echo [1/2] Starting ProxiSpeak Backend Server on port 5000...
start "ProxiSpeak Backend Server (Port 5000)" cmd /k "cd /d %~dp0server && node src/server.js"

echo [INFO] Waiting 2 seconds for backend to initialize...
timeout /t 2 /nobreak > nul

echo [2/2] Starting ProxiSpeak Frontend Client on port 5173...
start "ProxiSpeak Frontend Client (Port 5173)" cmd /k "cd /d %~dp0client && npm run dev"

echo.
echo ========================================================
echo  Both Servers are successfully running!
echo  - Backend:  http://localhost:5000
echo  - Frontend: http://localhost:5173
echo.
echo  Keep the two opened command prompt windows running.
echo ========================================================
echo.
pause

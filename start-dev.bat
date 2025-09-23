@echo off
echo ========================================
echo Starting Loyalty Program Development Servers
echo ========================================

echo.
echo Cleaning ports 3000 and 3001...
npm run clean-ports

echo.
echo Starting Backend Server (Port 3001)...
start "Backend Server" cmd /c "cd /d backend && npm start && pause"

echo.
echo Waiting 3 seconds for backend to start...
timeout /t 3 /nobreak >nul

echo.
echo Starting Frontend Server (Port 3000)...
start "Frontend Server" cmd /c "set VITE_PORT=3000 && npm run dev && pause"

echo.
echo ========================================
echo Both servers are starting up!
echo ========================================
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:3000
echo ========================================
echo.
echo Press any key to close this window...
pause >nul
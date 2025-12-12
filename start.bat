@echo off
echo Starting GD Platform...
echo.

echo Checking if MongoDB is running...
tasklist /FI "IMAGENAME eq mongod.exe" 2>NUL | find /I /N "mongod.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo ✅ MongoDB is running
) else (
    echo ❌ MongoDB is not running
    echo Please start MongoDB first:
    echo   - Run as Administrator: net start MongoDB
    echo   - Or start manually: mongod
    echo.
    pause
    exit
)

echo.
echo Starting backend server...
start "Backend" cmd /k "cd backend && npm run dev"

timeout /t 3 /nobreak >nul

echo Starting frontend...
start "Frontend" cmd /k "cd frontend && npm start"

echo.
echo ✅ Both servers are starting...
echo Backend: http://localhost:5001
echo Frontend: http://localhost:3000
echo.
pause
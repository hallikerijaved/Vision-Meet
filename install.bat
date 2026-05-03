@echo off
echo Installing GD Platform...
echo.

echo [1/3] Installing root dependencies...
npm install

echo.
echo [2/3] Installing backend dependencies...
cd backend
npm install
cd ..

echo.
echo [3/3] Installing frontend dependencies...
cd frontend
npm install
cd ..

echo.
echo ✅ Installation complete!
echo.
echo To start the application:
echo   npm run dev
echo.
echo Make sure MongoDB is running before starting the app.
pause
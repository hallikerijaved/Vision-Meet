@echo off
echo ========================================
echo Installing AI Mock Interview Feature
echo ========================================
echo.

cd backend
echo Installing @google/generative-ai package...
call npm install @google/generative-ai
echo.

echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo Next Steps:
echo 1. Get Gemini API key from: https://makersuite.google.com/app/apikey
echo 2. Add to backend/.env: GEMINI_API_KEY=your_key_here
echo 3. Restart backend server: npm run dev
echo.
pause

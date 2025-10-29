@echo off
echo ========================================
echo   Stock Analysis System - Startup Script
echo ========================================
echo.

echo [1/2] Checking dependencies...
python -c "import fastapi, uvicorn, pandas, numpy; print('✓ Dependencies OK')" 2>nul
if %errorlevel% neq 0 (
    echo ✗ Missing dependencies. Please run: pip install -r requirements.txt
    pause
    exit /b 1
)

echo [2/2] Starting server...
echo.
echo Access URLs:
echo   - Home: http://localhost:8000
echo   - API Docs: http://localhost:8000/api/docs
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

python backend\main.py
pause

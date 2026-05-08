@echo off
chcp 65001 >nul
echo ========================================
echo    QR Management Server
echo ========================================
echo.
cd /d "%~dp0"
if not exist "scripts\start-server-port-8080.bat" (
    echo Khong tim thay file scripts\start-server-port-8080.bat
    echo Vui long kiem tra lai duong dan
    pause
    exit /b 1
)
call scripts\start-server-port-8080.bat
if errorlevel 1 (
    echo.
    echo Co loi khi khoi dong server!
    pause
    exit /b 1
)



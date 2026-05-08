@echo off
chcp 65001 >nul
echo ========================================
echo    QR Management Server - Port 8080
echo    Ho tro truy cap tu Internet
echo ========================================
echo.

echo [1/3] Kiem tra Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo Khong tim thay Node.js!
    echo Vui long cai dat Node.js tu: https://nodejs.org
    pause
    exit /b 1
)
echo Node.js da cai dat
echo.

echo [2/3] Cai dat dependencies...
call npm install
if errorlevel 1 (
    echo Khong the cai dat dependencies
    pause
    exit /b 1
)
echo Dependencies da cai dat
echo.

echo [3/3] Khoi dong server tren port 8080...
echo.

set PORT=8080
set EXTERNAL_ACCESS=true

echo Server se chay tai:
echo    - Local:    http://localhost:8080
echo    - LAN:      http://[YOUR-IP]:8080
echo    - Internet: http://[PUBLIC-IP]:8080 (neu da cau hinh port forwarding)
echo.
echo Available modules:
echo    - donghang (Dong hang)
echo    - khophoi (Kho phoi)
echo    - sanxuat (San xuat)
echo    - thanhpham (Thanh pham)
echo    - hangsan (Hang San)
echo    - hangton (Hang Ton)
echo    - tonghop (Tong Hop)
echo.
echo Luu y:
echo    - Server dang chay tren port 8080
echo    - Ho tro truy cap tu Internet neu da cau hinh port forwarding
echo    - Router can forward port 8080 to 8080
echo.
echo Nhan Ctrl+C de dung server
echo.

cd /d "%~dp0\.."
if not exist "sync-server-external.js" (
    echo Khong tim thay file sync-server-external.js
    echo Vui long kiem tra lai duong dan
    pause
    exit /b 1
)
node sync-server-external.js
if errorlevel 1 (
    echo.
    echo Server da dung hoac co loi!
    pause
)


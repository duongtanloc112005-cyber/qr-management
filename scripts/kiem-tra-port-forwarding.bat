@echo off
chcp 65001 >nul
echo ========================================
echo    Kiểm tra Port Forwarding
echo ========================================
echo.

echo [1/4] Kiểm tra IP Local...
setlocal enabledelayedexpansion
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    set LOCAL_IP=%%a
    set LOCAL_IP=!LOCAL_IP: =!
    echo    IP Local: !LOCAL_IP!
    goto :found_ip
)
:found_ip
echo.

echo [2/4] Kiểm tra IP Công cộng...
echo    Đang lấy IP công cộng...
powershell -Command "(Invoke-WebRequest -Uri 'https://api.ipify.org' -UseBasicParsing).Content" > %TEMP%\public_ip.txt
set /p PUBLIC_IP=<%TEMP%\public_ip.txt
echo    IP Công cộng: %PUBLIC_IP%
del %TEMP%\public_ip.txt
echo.

echo [3/4] Kiểm tra Server đang chạy...
netstat -ano | findstr ":8080" | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo    ✅ Server đang chạy trên port 8080
) else (
    echo    ❌ Server KHÔNG chạy trên port 8080
    echo    💡 Chạy start-server.bat để khởi động server
)
echo.

echo [4/4] Kiểm tra Firewall...
netsh advfirewall firewall show rule name="QR Management Server" >nul 2>&1
if %errorlevel% equ 0 (
    echo    ✅ Firewall đã mở port 8080
) else (
    echo    ⚠️  Firewall chưa có rule cho port 8080
    echo    💡 Chạy mo-firewall-port-8080.bat để mở firewall
)
echo.

echo ========================================
echo    THÔNG TIN CẤU HÌNH PORT FORWARDING
echo ========================================
echo.
echo 📋 Cấu hình trên Router:
echo.
echo    Tên rule: QRManagement (hoặc tên tùy chọn)
echo    Protocol: TCP
echo    Port ngoài (External Port): 8080
echo    Port trong (Internal Port): 8080
echo    IP trong (Internal IP): !LOCAL_IP! ⚠️ QUAN TRỌNG!
echo    Status: Enabled
echo.
echo 🌐 URL truy cập từ Internet:
echo    http://%PUBLIC_IP%:8080
echo.
echo 🔍 Kiểm tra:
echo    1. Đăng nhập router: http://192.168.1.1 (hoặc IP router)
echo    2. Tìm mục: Port Forwarding / Virtual Server / NAT
echo    3. Kiểm tra IP trong có đúng là: !LOCAL_IP!
echo    4. Nếu sai, cập nhật lại IP trong thành: !LOCAL_IP!
echo.
echo ⚠️  LƯU Ý:
echo    - IP Local có thể thay đổi khi khởi động lại
echo    - Nếu IP thay đổi, cần cập nhật lại Port Forwarding
echo    - Cân nhắc cấu hình IP tĩnh (Static IP) trên router
echo.
pause


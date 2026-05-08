@echo off
chcp 65001 >nul
echo ========================================
echo    Mở Windows Firewall - Port 8080
echo ========================================
echo.

REM Kiểm tra quyền Administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ LỖI: Script này cần quyền Administrator!
    echo.
    echo 💡 HƯỚNG DẪN:
    echo    1. Click chuột phải vào file này
    echo    2. Chọn "Run as administrator"
    echo    3. Hoặc mở PowerShell/CMD với quyền Administrator rồi chạy script
    echo.
    pause
    exit /b 1
)

echo ✅ Đã có quyền Administrator
echo.

echo [1/3] Kiểm tra IP hiện tại...
ipconfig | findstr IPv4
echo.
echo ⚠️  LƯU Ý: Ghi nhớ IP này để cấu hình Port Forwarding trên router!
echo.

echo [2/3] Kiểm tra rule Firewall đã tồn tại chưa...
netsh advfirewall firewall show rule name="QR Management Server" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Rule "QR Management Server" đã tồn tại
    echo.
    echo Bạn muốn:
    echo    1. Xóa rule cũ và tạo mới
    echo    2. Giữ nguyên (bỏ qua)
    echo.
    set /p choice="Chọn (1 hoặc 2): "
    if "!choice!"=="1" (
        echo.
        echo 🗑️  Xóa rule cũ...
        netsh advfirewall firewall delete rule name="QR Management Server" >nul 2>&1
        echo ✅ Đã xóa rule cũ
    ) else (
        echo.
        echo ℹ️  Giữ nguyên rule hiện tại
        goto :check_port
    )
)

echo [3/3] Tạo rule mới cho port 8080...
netsh advfirewall firewall add rule name="QR Management Server" dir=in action=allow protocol=TCP localport=8080
if %errorlevel% equ 0 (
    echo.
    echo ✅ Đã mở thành công port 8080 trong Windows Firewall!
    echo.
) else (
    echo.
    echo ❌ Lỗi khi tạo rule Firewall!
    pause
    exit /b 1
)

:check_port
echo.
echo 🔍 Kiểm tra rule đã tạo...
netsh advfirewall firewall show rule name="QR Management Server"
echo.
echo ✅ Hoàn thành!
echo.
echo 📋 CÁC BƯỚC TIẾP THEO:
echo.
echo    1. ✅ Firewall đã mở port 8080
echo    2. ⚠️  CẦN LÀM: Cấu hình Port Forwarding trên router
echo       - IP trong: [IP của máy bạn - xem ở trên]
echo       - Port trong: 8080
echo       - Port ngoài: 8080
echo.
echo    3. Sau khi cấu hình router, truy cập:
echo       http://[IP-CÔNG-CỘNG]:8080
echo.
pause



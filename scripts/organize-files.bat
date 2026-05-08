@echo off
chcp 65001 >nul
echo ========================================
echo    TỔ CHỨC LẠI CÁC FILE TRONG THƯ MỤC
echo ========================================
echo.

echo [1/5] Tạo thư mục...
if not exist "scripts" mkdir scripts
if not exist "docs" mkdir docs
if not exist "html" mkdir html
echo ✅ Đã tạo thư mục
echo.

echo [2/5] Di chuyển file .bat vào scripts\...
move /Y *.bat scripts\ 2>nul
echo ✅ Đã di chuyển file .bat
echo.

echo [3/5] Di chuyển file hướng dẫn (.md) vào docs\...
move /Y *GUIDE.md docs\ 2>nul
move /Y HUONG-*.md docs\ 2>nul
move /Y CACH-*.md docs\ 2>nul
move /Y EXTERNAL-*.md docs\ 2>nul
move /Y PORT-*.md docs\ 2>nul
move /Y OFFLINE-*.md docs\ 2>nul
move /Y UI-*.md docs\ 2>nul
move /Y OPTIMIZATION*.md docs\ 2>nul
echo ✅ Đã di chuyովển file hướng dẫn
echo.

echo [4/5] Di chuyển file HTML vào html\...
move /Y *.html html\ 2>nul
echo ✅ Đã di chuyển file HTML
echo.

echo [5/5] Tạo file shortcut để chạy script...
echo @echo off > start-server.bat
echo cd /d "%%~dp0" >> start-server.bat
echo call scripts\start-server-port-8080.bat >> start-server.bat
echo ✅ Đã tạo file start-server.bat ở thư mục gốc
echo.

echo ========================================
echo    HOÀN TẤT!
echo ========================================
echo.
echo 📁 Cấu trúc thư mục mới:
echo    - scripts\    - Chứa tất cả file .bat
echo    - docs\       - Chứa tất cả file hướng dẫn .md
echo    - html\       - Chứa tất cả file HTML
echo.
echo 🚀 Để chạy server: Double-click start-server.bat
echo    hoặc: scripts\start-server-port-8080.bat
echo.
pause



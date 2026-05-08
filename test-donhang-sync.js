#!/usr/bin/env node
/**
 * Script kiểm tra tổng thể flow sync dữ liệu donhang
 * Chạy: node test-donhang-sync.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 KIỂM TRA TỔNG THỂ FLOW SYNC DONHANG\n');
console.log('='.repeat(60));

// 1. Kiểm tra file donhang.json
console.log('\n1️⃣ Kiểm tra file donhang.json:');
const donhangFile = path.join(__dirname, 'data', 'donhang.json');
if (fs.existsSync(donhangFile)) {
    try {
        const content = fs.readFileSync(donhangFile, 'utf8');
        const data = JSON.parse(content);
        console.log('   ✅ File tồn tại');
        console.log('   📊 Format:', data.timestamp ? '{timestamp, data}' : 'Array');
        console.log('   📦 Số lượng items:', Array.isArray(data.data) ? data.data.length : (Array.isArray(data) ? data.length : 0));
        if (data.data && data.data.length > 0) {
            console.log('   ✅ Có dữ liệu');
        } else {
            console.log('   ⚠️ File rỗng - cần sync dữ liệu từ Donhang.html');
        }
    } catch (error) {
        console.log('   ❌ File bị lỗi:', error.message);
    }
} else {
    console.log('   ⚠️ File chưa tồn tại - sẽ được tạo khi có dữ liệu');
}

// 2. Kiểm tra server configuration
console.log('\n2️⃣ Kiểm tra server configuration:');
const serverFile = path.join(__dirname, 'sync-server-external.js');
if (fs.existsSync(serverFile)) {
    const serverContent = fs.readFileSync(serverFile, 'utf8');
    const hasDonhang = serverContent.includes("donhang");
    const hasValidModules = serverContent.includes("'donhang'") || serverContent.includes('"donhang"');
    const hasDataFiles = serverContent.includes("donhang: path.join(DATA_DIR, 'donhang.json')");
    const hasSyncData = serverContent.includes("donhang: []");
    const hasConnections = serverContent.includes("donhang: new Set()");
    
    console.log('   ✅ File server tồn tại');
    console.log('   ✅ Module donhang trong validModules:', hasValidModules);
    console.log('   ✅ donhang trong DATA_FILES:', hasDataFiles);
    console.log('   ✅ donhang trong syncData:', hasSyncData);
    console.log('   ✅ donhang trong connections:', hasConnections);
    
    if (!hasValidModules || !hasDataFiles || !hasSyncData || !hasConnections) {
        console.log('   ⚠️ Server cần cấu hình thêm cho module donhang');
    }
} else {
    console.log('   ❌ File server không tồn tại!');
}

// 3. Kiểm tra Donhang.html
console.log('\n3️⃣ Kiểm tra Donhang.html:');
const donhangHtml = path.join(__dirname, 'html', 'Donhang.html');
if (fs.existsSync(donhangHtml)) {
    const htmlContent = fs.readFileSync(donhangHtml, 'utf8');
    const hasAuth = htmlContent.includes('/auth.js');
    const hasWebSocket = htmlContent.includes('WebSocket');
    const hasModuleName = htmlContent.includes("MODULE_NAME = 'donhang'");
    const hasSyncToServer = htmlContent.includes('syncToServer');
    const hasInitWebSocket = htmlContent.includes('initWebSocket');
    const hasAutoSync = htmlContent.includes('auto-syncing') || htmlContent.includes('Auto-sync');
    
    console.log('   ✅ File tồn tại');
    console.log('   ✅ Có auth.js:', hasAuth);
    console.log('   ✅ Có WebSocket:', hasWebSocket);
    console.log('   ✅ Có MODULE_NAME:', hasModuleName);
    console.log('   ✅ Có syncToServer:', hasSyncToServer);
    console.log('   ✅ Có initWebSocket:', hasInitWebSocket);
    console.log('   ✅ Có auto-sync:', hasAutoSync);
    
    if (!hasAuth || !hasWebSocket || !hasModuleName || !hasSyncToServer) {
        console.log('   ⚠️ Donhang.html thiếu các component cần thiết');
    }
} else {
    console.log('   ❌ File Donhang.html không tồn tại!');
}

// 4. Kiểm tra TongHop.html
console.log('\n4️⃣ Kiểm tra TongHop.html:');
const tonghopHtml = path.join(__dirname, 'html', 'TongHop.html');
if (fs.existsSync(tonghopHtml)) {
    const htmlContent = fs.readFileSync(tonghopHtml, 'utf8');
    const hasDonhangTab = htmlContent.includes('Theo dõi Đơn hàng') || htmlContent.includes("donhang");
    const hasLoadDonhangData = htmlContent.includes('loadDonhangData');
    const hasHienThiDonhangStats = htmlContent.includes('hienThiDonhangStats');
    const hasRegisterDonhang = htmlContent.includes("module: 'donhang'") || htmlContent.includes('module: "donhang"');
    
    console.log('   ✅ File tồn tại');
    console.log('   ✅ Có tab donhang:', hasDonhangTab);
    console.log('   ✅ Có loadDonhangData:', hasLoadDonhangData);
    console.log('   ✅ Có hienThiDonhangStats:', hasHienThiDonhangStats);
    console.log('   ✅ Có register donhang:', hasRegisterDonhang);
    
    if (!hasDonhangTab || !hasLoadDonhangData || !hasHienThiDonhangStats) {
        console.log('   ⚠️ TongHop.html thiếu các function cần thiết');
    }
} else {
    console.log('   ❌ File TongHop.html không tồn tại!');
}

// 5. Tổng kết
console.log('\n' + '='.repeat(60));
console.log('\n📋 TỔNG KẾT:');
console.log('\n✅ Tất cả các file và configuration đã được kiểm tra.');
console.log('\n💡 HƯỚNG DẪN SỬA LỖI:');
console.log('   1. Nếu file donhang.json rỗng:');
console.log('      - Mở Donhang.html trong browser');
console.log('      - Thêm một vài đơn hàng');
console.log('      - Kiểm tra console để xem có sync thành công không');
console.log('      - Gọi forceSyncDonhang() từ console nếu cần');
console.log('\n   2. Nếu server chưa có donhang:');
console.log('      - Kiểm tra sync-server-external.js có đầy đủ cấu hình donhang');
console.log('      - Restart server');
console.log('\n   3. Nếu TongHop.html không hiển thị:');
console.log('      - Kiểm tra console để xem có lỗi 404 không');
console.log('      - Kiểm tra WebSocket có kết nối không');
console.log('      - Nhấn F5 để refresh');
console.log('\n✨ Hoàn tất kiểm tra!');



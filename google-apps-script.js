// ===== GOOGLE APPS SCRIPT - REALTIME MIRROR =====
// Copy toàn bộ code này vào Google Apps Script
// Deploy > Manage deployments > Edit > New version > Deploy

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var module = data.module || 'unknown';
    var items = data.items || [];
    var action = data.action || 'sync'; // 'sync' = mirror realtime, 'archive' = chỉ thêm/cập nhật
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // Tìm hoặc tạo sheet cho module
    var sheet = ss.getSheetByName(module);
    if (!sheet) {
      sheet = ss.insertSheet(module);
    }

    // Đảm bảo header đúng
    var headerRow = ['STT', 'Mã gốc', 'Mã', 'Trạng thái', 'Đợt hàng', 'Loại hàng',
                     'Loại SX', 'Màu', 'Size', 'Thời gian', 'Ghi chú', 'Ngày đồng bộ'];
    var currentHeader = sheet.getRange(1, 1, 1, 12).getValues()[0];
    if (currentHeader[0] !== 'STT') {
      sheet.clear();
      sheet.getRange(1, 1, 1, 12).setValues([headerRow]);
      sheet.getRange(1, 1, 1, 12).setFontWeight('bold');
      sheet.getRange(1, 1, 1, 12).setBackground('#4285f4');
      sheet.getRange(1, 1, 1, 12).setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }

    var now = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm:ss');

    // === ACTION: SYNC (mirror realtime) ===
    // Xóa dòng không còn trong hệ thống, thêm/cập nhật dòng mới
    if (action === 'sync') {
      // Tạo map maGoc từ items hiện tại
      var currentMaGocSet = {};
      for (var i = 0; i < items.length; i++) {
        currentMaGocSet[items[i].maGoc] = items[i];
      }

      // Lấy dữ liệu hiện có trong sheet
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        var existingData = sheet.getRange(2, 1, lastRow - 1, 12).getValues();
        var rowsToDelete = [];

        // Tìm dòng cần xóa (không còn trong hệ thống)
        for (var r = existingData.length - 1; r >= 0; r--) {
          var existingMaGoc = existingData[r][1]; // Cột B = Mã gốc
          if (!currentMaGocSet[existingMaGoc]) {
            rowsToDelete.push(r + 2); // +2 vì header ở dòng 1, index bắt đầu từ 0
          }
        }

        // Xóa từ dưới lên để không bị lệch index
        for (var d = 0; d < rowsToDelete.length; d++) {
          sheet.deleteRow(rowsToDelete[d]);
        }
      }

      // Cập nhật lastRow sau khi xóa
      lastRow = sheet.getLastRow();

      // Lấy lại danh sách maGoc còn trong sheet
      var existingMaGoc = {};
      if (lastRow > 1) {
        var remaining = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
        for (var k = 0; k < remaining.length; k++) {
          existingMaGoc[remaining[k][0]] = k + 2;
        }
      }

      // Thêm/cập nhật items
      var newRows = [];
      var updateCount = 0;
      var nextSTT = lastRow;

      for (var j = 0; j < items.length; j++) {
        var item = items[j];
        if (existingMaGoc[item.maGoc]) {
          // Cập nhật dòng đã tồn tại
          var rowNum = existingMaGoc[item.maGoc];
          var currentSTT = sheet.getRange(rowNum, 1).getValue();
          var row = [currentSTT, item.maGoc||'', item.ma||'', item.trangThai||'',
                     item.dotHang||'', item.loaiHang||'', item.loaiSX||'',
                     item.mau||'', (item.size||'').toString().toUpperCase(),
                     item.thoiGian||'', item.ghiChu||'', now];
          sheet.getRange(rowNum, 1, 1, 12).setValues([row]);
          updateCount++;
        } else {
          nextSTT++;
          newRows.push([nextSTT - 1, item.maGoc||'', item.ma||'', item.trangThai||'',
                        item.dotHang||'', item.loaiHang||'', item.loaiSX||'',
                        item.mau||'', (item.size||'').toString().toUpperCase(),
                        item.thoiGian||'', item.ghiChu||'', now]);
        }
      }

      if (newRows.length > 0) {
        lastRow = sheet.getLastRow();
        sheet.getRange(lastRow + 1, 1, newRows.length, 12).setValues(newRows);
      }

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        action: 'sync',
        message: 'Mirror: ' + items.length + ' items (cập nhật: ' + updateCount + ', mới: ' + newRows.length + ')',
        module: module
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // === ACTION: ARCHIVE (chỉ thêm/cập nhật, KHÔNG xóa) ===
    // Dùng khi xóa tự động lúc 00:00 - giữ nguyên dữ liệu cũ trên Sheets
    if (action === 'archive') {
      var lastRow = sheet.getLastRow();
      var existingMaGoc = {};
      if (lastRow > 1) {
        var existingData = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
        for (var i = 0; i < existingData.length; i++) {
          existingMaGoc[existingData[i][0]] = i + 2;
        }
      }

      var newRows = [];
      var updateCount = 0;
      var nextSTT = lastRow;

      for (var j = 0; j < items.length; j++) {
        var item = items[j];
        if (existingMaGoc[item.maGoc]) {
          var rowNum = existingMaGoc[item.maGoc];
          var currentSTT = sheet.getRange(rowNum, 1).getValue();
          var row = [currentSTT, item.maGoc||'', item.ma||'', item.trangThai||'',
                     item.dotHang||'', item.loaiHang||'', item.loaiSX||'',
                     item.mau||'', (item.size||'').toString().toUpperCase(),
                     item.thoiGian||'', item.ghiChu||'', now];
          sheet.getRange(rowNum, 1, 1, 12).setValues([row]);
          updateCount++;
        } else {
          nextSTT++;
          newRows.push([nextSTT - 1, item.maGoc||'', item.ma||'', item.trangThai||'',
                        item.dotHang||'', item.loaiHang||'', item.loaiSX||'',
                        item.mau||'', (item.size||'').toString().toUpperCase(),
                        item.thoiGian||'', item.ghiChu||'', now]);
        }
      }

      if (newRows.length > 0) {
        lastRow = sheet.getLastRow();
        sheet.getRange(lastRow + 1, 1, newRows.length, 12).setValues(newRows);
      }

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        action: 'archive',
        message: 'Archive: ' + items.length + ' items (KHÔNG xóa dòng cũ)',
        module: module
      })).setMimeType(ContentService.MimeType.JSON);
    }

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: 'Google Sheets Sync API - Realtime Mirror'
  })).setMimeType(ContentService.MimeType.JSON);
}

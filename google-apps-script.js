// ===== GOOGLE APPS SCRIPT =====
// Copy toàn bộ code này vào Google Apps Script (Extensions > Apps Script)
// Sau đó Deploy > New deployment > Web app > Anyone > Deploy
// Copy URL Web App và paste vào biến GOOGLE_SHEETS_URL trong sync-server.js

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var module = data.module || 'unknown';
    var items = data.items || [];
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // Tìm hoặc tạo sheet cho module
    var sheet = ss.getSheetByName(module);
    if (!sheet) {
      sheet = ss.insertSheet(module);
      // Tạo header
      sheet.getRange(1, 1, 1, 11).setValues([[
        'Mã gốc', 'Mã', 'Trạng thái', 'Đợt hàng', 'Loại hàng',
        'Loại SX', 'Màu', 'Size', 'Thời gian', 'Ghi chú', 'Ngày đồng bộ'
      ]]);
      // Định dạng header
      sheet.getRange(1, 1, 1, 11).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    if (items.length === 0) {
      return ContentService.createTextOutput(JSON.stringify({
        success: true, message: 'Không có dữ liệu mới'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var now = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm:ss');

    // Lấy danh sách maGoc đã có trong sheet
    var lastRow = sheet.getLastRow();
    var existingMaGoc = {};
    if (lastRow > 1) {
      var existingData = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (var i = 0; i < existingData.length; i++) {
        existingMaGoc[existingData[i][0]] = i + 2; // row number
      }
    }

    var newRows = [];
    var updateCount = 0;

    for (var j = 0; j < items.length; j++) {
      var item = items[j];
      var row = [
        item.maGoc || '',
        item.ma || '',
        item.trangThai || '',
        item.dotHang || '',
        item.loaiHang || '',
        item.loaiSX || '',
        item.mau || '',
        (item.size || '').toString().toUpperCase(),
        item.thoiGian || '',
        item.ghiChu || '',
        now
      ];

      if (existingMaGoc[item.maGoc]) {
        // Cập nhật dòng đã tồn tại
        sheet.getRange(existingMaGoc[item.maGoc], 1, 1, 11).setValues([row]);
        updateCount++;
      } else {
        newRows.push(row);
      }
    }

    // Thêm dòng mới
    if (newRows.length > 0) {
      sheet.getRange(lastRow + 1, 1, newRows.length, 11).setValues(newRows);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Đã đồng bộ ' + items.length + ' dòng (mới: ' + newRows.length + ', cập nhật: ' + updateCount + ')',
      module: module,
      newCount: newRows.length,
      updateCount: updateCount
    })).setMimeType(ContentService.MimeType.JSON);

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
    message: 'Google Sheets Sync API đang hoạt động'
  })).setMimeType(ContentService.MimeType.JSON);
}

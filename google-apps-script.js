// ===== GOOGLE APPS SCRIPT =====
// Copy toàn bộ code này vào Google Apps Script (Extensions > Apps Script)
// Sau đó Deploy > Manage deployments > Edit > New version > Deploy
// Copy URL Web App và paste vào biến GOOGLE_SHEETS_URL trong Railway Variables

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
    }

    // Luôn đảm bảo header đúng ở dòng 1
    var headerRow = ['STT', 'Mã gốc', 'Mã', 'Trạng thái', 'Đợt hàng', 'Loại hàng',
                     'Loại SX', 'Màu', 'Size', 'Thời gian', 'Ghi chú', 'Ngày đồng bộ'];
    var currentHeader = sheet.getRange(1, 1, 1, 12).getValues()[0];
    if (currentHeader[0] !== 'STT') {
      // Xóa tất cả và tạo header mới
      sheet.clear();
      sheet.getRange(1, 1, 1, 12).setValues([headerRow]);
      sheet.getRange(1, 1, 1, 12).setFontWeight('bold');
      sheet.getRange(1, 1, 1, 12).setBackground('#4285f4');
      sheet.getRange(1, 1, 1, 12).setFontColor('#ffffff');
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
      var existingData = sheet.getRange(2, 2, lastRow - 1, 1).getValues(); // Cột B = Mã gốc
      for (var i = 0; i < existingData.length; i++) {
        existingMaGoc[existingData[i][0]] = i + 2; // row number
      }
    }

    var newRows = [];
    var updateCount = 0;
    var nextSTT = lastRow; // STT tiếp theo

    for (var j = 0; j < items.length; j++) {
      var item = items[j];

      if (existingMaGoc[item.maGoc]) {
        // Cập nhật dòng đã tồn tại (giữ nguyên STT cũ)
        var existingRow = existingMaGoc[item.maGoc];
        var currentSTT = sheet.getRange(existingRow, 1).getValue();
        var row = [
          currentSTT,
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
        sheet.getRange(existingRow, 1, 1, 12).setValues([row]);
        updateCount++;
      } else {
        nextSTT++;
        var newRow = [
          nextSTT - 1, // STT bắt đầu từ 1
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
        newRows.push(newRow);
      }
    }

    // Thêm dòng mới
    if (newRows.length > 0) {
      sheet.getRange(lastRow + 1, 1, newRows.length, 12).setValues(newRows);
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

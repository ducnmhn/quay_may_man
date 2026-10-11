/**
 * GOOGLE APPS SCRIPT CHO VÒNG QUAY MAY MẮN
 * Dán mã này vào: Tiện ích mở rộng -> Apps Script (Extensions -> Apps Script)
 * trên Google Sheet: https://docs.google.com/spreadsheets/d/1CxYKuncyzvKDDMlCCWGyBCKQlMYUYSROw3ocuHzuWMk/edit
 */

// Hàm xử lý khi nhận request POST
function doPost(e) {
  var lock = LockService.getScriptLock();
  // Khóa tối đa 10 giây để tránh ghi đè đồng thời khi nhiều người quay cùng lúc
  lock.tryLock(10000);

  try {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = doc.getActiveSheet();

    // 1. Nếu Sheet chưa có tiêu đề, tự động tạo dòng tiêu đề chuyên nghiệp
    if (sheet.getLastRow() === 0) {
      var headers = [
        "Thời Gian",
        "Họ và Tên",
        "Số Điện Thoại",
        "Giải Thưởng",
        "Mã Trúng Thưởng",
        "Trạng Thái Trao Quà"
      ];
      sheet.appendRow(headers);
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground("#1E3A8A");
      headerRange.setFontColor("#FFFFFF");
      headerRange.setFontWeight("bold");
      headerRange.setHorizontalAlignment("center");
      sheet.setFrozenRows(1);
    }

    // 2. Phân tích dữ liệu gửi lên
    var data;
    if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = e.parameter;
      }
    } else {
      data = e.parameter;
    }

    var fullName = data.fullName || data.name || "Khách hàng ẩn danh";
    var phoneNumber = data.phoneNumber || data.phone || "";
    var prize = data.prize || data.prizeName || "Quà tặng";
    var luckyCode = data.luckyCode || ("LUCKY-" + Math.floor(100000 + Math.random() * 900000));
    var timestamp = data.timestamp || Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");

    // 3. Ghi dữ liệu vào dòng tiếp theo
    sheet.appendRow([
      timestamp,
      fullName,
      "'" + phoneNumber, // Thêm dấu ' để Google Sheet giữ nguyên số 0 ở đầu sđt
      prize,
      luckyCode,
      "Chưa trao quà"
    ]);

    // Format căn giữa cho thời gian, sđt, mã và trạng thái
    var lastRow = sheet.getLastRow();
    sheet.getRange(lastRow, 1).setHorizontalAlignment("center");
    sheet.getRange(lastRow, 3).setHorizontalAlignment("center");
    sheet.getRange(lastRow, 5).setHorizontalAlignment("center");
    sheet.getRange(lastRow, 6).setHorizontalAlignment("center");

    // Trả về kết quả JSON thành công
    return ContentService
      .createTextOutput(JSON.stringify({
        status: "success",
        message: "Lưu thông tin trúng thưởng thành công!",
        data: {
          fullName: fullName,
          phoneNumber: phoneNumber,
          prize: prize,
          luckyCode: luckyCode,
          timestamp: timestamp
        }
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        status: "error",
        message: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } finally {
    lock.releaseLock();
  }
}

// Hàm kiểm tra trạng thái hoạt động Web App qua trình duyệt
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: "online",
      message: "Vòng Quay May Mắn Apps Script Webhook đang hoạt động bình thường!",
      time: new Date().toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

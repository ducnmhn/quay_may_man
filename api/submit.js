module.exports = async function handler(req, res) {
  // Chỉ nhận method POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const { fullName, phoneNumber, prize, luckyCode, timestamp } = req.body;

    // Kiểm tra dữ liệu bắt buộc
    if (!fullName || !phoneNumber) {
      return res.status(400).json({ success: false, message: 'Thiếu họ tên hoặc số điện thoại.' });
    }

    const appsScriptUrl = process.env.APPS_SCRIPT_URL;
    if (!appsScriptUrl) {
      console.error('Lỗi: Chưa cấu hình biến môi trường APPS_SCRIPT_URL.');
      return res.status(500).json({ 
        success: false, 
        message: 'Lỗi cấu hình hệ thống (Thiếu APPS_SCRIPT_URL). Vui lòng cấu hình biến môi trường.' 
      });
    }

    // Gửi dữ liệu sang Google Apps Script
    const response = await fetch(appsScriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        prize: prize || 'Quà tặng may mắn',
        luckyCode: luckyCode || ('LUCKY-' + Math.floor(100000 + Math.random() * 900000)),
        timestamp: timestamp || new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
      }),
    });

    const resultText = await response.text();
    let resultJson;
    try {
      resultJson = JSON.parse(resultText);
    } catch (e) {
      resultJson = { message: resultText };
    }

    if (response.ok) {
      return res.status(200).json({ success: true, data: resultJson });
    } else {
      return res.status(response.status).json({ success: false, error: resultJson });
    }
  } catch (error) {
    console.error('Lỗi xử lý API proxy:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Đã xảy ra lỗi khi gửi thông tin trúng thưởng.', 
      error: error.message 
    });
  }
};

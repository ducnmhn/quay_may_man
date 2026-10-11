const http = require('http');
const fs = require('fs');
const path = require('path');

// Đọc file .env nếu có
let appsScriptUrl = '';
try {
  const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  const match = envContent.match(/^APPS_SCRIPT_URL\s*=\s*(.+)$/m);
  if (match) {
    appsScriptUrl = match[1].trim();
  }
} catch (e) {
  console.log('Chưa tìm thấy file .env hoặc không đọc được.');
}

console.log('====================================');
console.log('VÒNG QUAY MAY MẮN - SERVER LOCAL');
console.log('Apps Script URL đích:', appsScriptUrl || '(Chưa cấu hình)');
console.log('====================================');

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // API submit thông tin trúng thưởng
  if (req.method === 'POST' && req.url === '/api/submit') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        console.log('Đã nhận thông tin trúng thưởng:', payload);

        if (!payload.fullName || !payload.phoneNumber) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: false, message: 'Vui lòng cung cấp Họ tên và Số điện thoại hợp lệ.' }));
        }

        if (!appsScriptUrl) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ 
            success: false, 
            message: 'Chưa cấu hình APPS_SCRIPT_URL trong file .env!' 
          }));
        }

        // Forward dữ liệu tới Google Apps Script
        const response = await fetch(appsScriptUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fullName: payload.fullName.trim(),
            phoneNumber: payload.phoneNumber.trim(),
            prize: payload.prize || 'Quà tặng may mắn',
            luckyCode: payload.luckyCode || ('LUCKY-' + Math.floor(100000 + Math.random() * 900000)),
            timestamp: payload.timestamp || new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
          })
        });

        const resultText = await response.text();
        let resultJson;
        try {
          resultJson = JSON.parse(resultText);
        } catch (e) {
          resultJson = { message: resultText };
        }

        console.log('Phản hồi từ Google Apps Script:', resultJson);
        res.writeHead(response.ok ? 200 : response.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: response.ok, data: resultJson }));
      } catch (err) {
        console.error('Lỗi khi gửi tới Google Apps Script:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: err.message }));
      }
    });
    return;
  }

  // Static file server
  let cleanUrl = req.url.split('?')[0].split('#')[0];
  if (cleanUrl.endsWith('/') && cleanUrl.length > 1) {
    cleanUrl = cleanUrl.slice(0, -1);
  }

  let filePath = '.' + cleanUrl;
  if (filePath === './') {
    filePath = './index.html';
  } else if (!fs.existsSync(filePath) && fs.existsSync(filePath + '.html')) {
    filePath = filePath + '.html';
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
  };

  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>404 Không tìm thấy trang</h1>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end('Lỗi máy chủ: ' + error.code + ' ..\n');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Máy chủ đang chạy tại: http://localhost:${PORT}`);
});

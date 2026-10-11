/**
 * VÒNG QUAY MAY MẮN - THIÊN VÂN CLINIC
 * Tự động đọc danh sách giải thưởng & tỉ lệ % từ file prizes.json
 */

// Fallback prizes nếu không tải được prizes.json
const FALLBACK_PRIZES = [
  { id: 1, name: "Khám da cùng BS", fullName: "Miễn phí Khám da cùng BS", percent: 30, redirectUrl: "https://zalo.me/app/link/tn64rqrlkb", color: "#3E4D3C", textColor: "#FFFFFF", icon: "🩺" },
  { id: 2, name: "Chăm sóc da cơ bản", fullName: "Miễn phí 01 buổi Chăm sóc da cơ bản", percent: 30, redirectUrl: "https://zalo.me/app/link/4jacs1cqhd", color: "#C5A880", textColor: "#232B22", icon: "💆" },
  { id: 3, name: "Mua 1 tặng 1 Trẻ hóa", fullName: "Mua 1 tặng 1 Dịch vụ trẻ hóa", percent: 15, redirectUrl: "https://zalo.me/app/link/gcehf0pj2d", color: "#5D6E5A", textColor: "#FFFFFF", icon: "✨" },
  { id: 4, name: "Giảm 20% CN cao", fullName: "Giảm giá 20% Dịch vụ công nghệ cao", percent: 10, redirectUrl: "https://zalo.me/app/link/ab04b0w652", color: "#8C7355", textColor: "#FFFFFF", icon: "💎" },
  { id: 5, name: "Giảm 15% Phác đồ", fullName: "Giảm 15% Dịch vụ điều trị da theo phác đồ", percent: 5, redirectUrl: "https://zalo.me/app/link/hmk68oyzzt", color: "#4A5D47", textColor: "#FFFFFF", icon: "📋" },
  { id: 6, name: "Giảm 10% Chuyên sâu", fullName: "Giảm 10% Chăm sóc da chuyên sâu", percent: 5, redirectUrl: "https://zalo.me/app/link/ox8luyhita", color: "#B89B72", textColor: "#232B22", icon: "💧" },
  { id: 7, name: "Tặng 03 Mặt nạ", fullName: "Quà tặng: 03 mặt nạ dưỡng ẩm", percent: 5, redirectUrl: "https://zalo.me/app/link/d4qrw3rlpc", color: "#2D382B", textColor: "#FFFFFF", icon: "🎁" }
];

const DEFAULT_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzSdaIJyKlp9DA9u5xdreNZh4bGpIA7wriPyuEWnWB99PsLO_QwNAKu2EGtTyeOxIXS/exec";

class LuckyWheelGame {
  constructor() {
    this.canvas = document.getElementById('wheelCanvas');
    this.ctx = this.canvas.getContext('2d');
    
    // State
    this.prizes = FALLBACK_PRIZES;
    this.currentRotation = 0; // radian
    this.isSpinning = false;
    this.currentWinningPrize = null;
    this.currentLuckyCode = '';
    this.isMuted = false;
    this.countdownTimer = null;
    
    // Web Audio Context
    this.audioCtx = null;
    this.initAudioContext();

    // DOM Elements
    this.spinCenterBtn = document.getElementById('spinCenterBtn');
    this.spinLargeBtn = document.getElementById('spinLargeBtn');
    this.pointerEl = document.getElementById('wheelPointer');
    this.soundToggleBtn = document.getElementById('soundToggleBtn');
    
    // Modal Elements
    this.congratsModal = document.getElementById('congratsModal');
    this.modalPrizeName = document.getElementById('modalPrizeName');
    this.modalLuckyCode = document.getElementById('modalLuckyCode');
    this.claimForm = document.getElementById('claimForm');
    this.fullNameInput = document.getElementById('fullName');
    this.phoneNumberInput = document.getElementById('phoneNumber');
    this.btnSubmitClaim = document.getElementById('btnSubmitClaim');
    this.claimSuccessCard = document.getElementById('claimSuccessCard');
    this.formSection = document.getElementById('formSection');
    this.countdownDisplay = document.getElementById('countdownDisplay');

    // Setup
    this.setupLEDLighting();
    this.initCanvasSize();
    this.bindEvents();

    // Tải cấu hình giải thưởng từ file prizes.json
    this.loadPrizesFromJson();
  }

  // Tải danh sách giải thưởng và tỉ lệ % từ file prizes.json
  async loadPrizesFromJson() {
    try {
      const response = await fetch('prizes.json?v=' + Date.now());
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length >= 2) {
          this.prizes = data;
          console.log('Đã tải thành công cấu hình giải thưởng từ prizes.json:', this.prizes);
        }
      }
    } catch (err) {
      console.warn('Dùng danh sách giải thưởng mặc định do chưa fetch được prizes.json (hoặc mở trực tiếp file://):', err);
    }
    this.drawWheel();
  }

  initAudioContext() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      this.audioCtx = new AudioContext();
    }
  }

  playTickSound() {
    if (this.isMuted || !this.audioCtx) return;
    try {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, this.audioCtx.currentTime + 0.04);
      
      gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.04);
      
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.04);
    } catch (e) {}
  }

  playWinFanfare() {
    if (this.isMuted || !this.audioCtx) return;
    try {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, index) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        const startTime = this.audioCtx.currentTime + index * 0.12;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.35, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.5);
      });
    } catch (e) {}
  }

  setupLEDLighting() {
    const container = document.getElementById('ledBulbsContainer');
    if (!container) return;
    container.innerHTML = '';
    const bulbCount = 24;
    const radius = 50;
    
    for (let i = 0; i < bulbCount; i++) {
      const angle = (i / bulbCount) * 2 * Math.PI;
      const x = 50 + radius * Math.cos(angle);
      const y = 50 + radius * Math.sin(angle);
      
      const bulb = document.createElement('div');
      bulb.className = `led-bulb ${i % 2 === 0 ? '' : 'alt'}`;
      bulb.style.left = `${x}%`;
      bulb.style.top = `${y}%`;
      bulb.id = `led-${i}`;
      container.appendChild(bulb);
    }

    let ledOffset = 0;
    setInterval(() => {
      ledOffset = (ledOffset + 1) % 2;
      for (let i = 0; i < bulbCount; i++) {
        const bulb = document.getElementById(`led-${i}`);
        if (bulb) {
          if ((i + ledOffset) % 2 === 0) {
            bulb.classList.add('alt');
          } else {
            bulb.classList.remove('alt');
          }
        }
      }
    }, 450);
  }

  initCanvasSize() {
    const rect = this.canvas.getBoundingClientRect();
    const size = Math.floor(Math.min(rect.width, rect.height)) || 330;
    const dpr = Math.min(window.devicePixelRatio || 2, 3);

    this.canvas.width = Math.floor(size * dpr);
    this.canvas.height = Math.floor(size * dpr);
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
    this.wheelSize = size;
  }

  drawWheel() {
    const ctx = this.ctx;
    const size = this.wheelSize;
    const center = size / 2;
    const radius = center - 8;
    const numPrizes = this.prizes.length;
    const arcAngle = (2 * Math.PI) / numPrizes;

    ctx.clearRect(0, 0, size, size);

    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(this.currentRotation);

    // Vẽ từng nan quạt
    for (let i = 0; i < numPrizes; i++) {
      const prize = this.prizes[i];
      const startAngle = i * arcAngle;
      const endAngle = startAngle + arcAngle;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startAngle, endAngle);
      ctx.closePath();

      // Tô màu nan quạt
      ctx.fillStyle = prize.color;
      ctx.fill();

      // Đường viền ngăn cách
      ctx.strokeStyle = "rgba(197, 168, 128, 0.4)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Vẽ chữ và icon
      ctx.save();
      ctx.rotate(startAngle + arcAngle / 2);
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";

      const fontSize = Math.max(9, Math.min(13, Math.round(radius / 13.5)));
      const iconSize = Math.max(11, Math.min(16, Math.round(radius / 11.5)));

      ctx.fillStyle = prize.textColor || "#FFFFFF";
      ctx.font = `600 ${fontSize}px 'Manrope', sans-serif`;
      
      const displayText = `${prize.name}`;
      const iconOffset = prize.icon ? (iconSize + 6) : 4;
      ctx.fillText(displayText, radius - iconOffset - 6, 0);

      if (prize.icon) {
        ctx.font = `${iconSize}px sans-serif`;
        ctx.fillText(prize.icon, radius - 6, 0);
      }

      ctx.restore();
    }

    // Vòng tròn viền trong
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.restore();
  }

  // Thuật toán chọn giải thưởng có trọng số (Weighted Probability Selection)
  selectWinningPrizeIndex() {
    const totalPercent = this.prizes.reduce((sum, p) => sum + Number(p.percent), 0);
    let random = Math.random() * totalPercent;

    for (let i = 0; i < this.prizes.length; i++) {
      if (random < Number(this.prizes[i].percent)) {
        return i;
      }
      random -= Number(this.prizes[i].percent);
    }
    return this.prizes.length - 1;
  }

  spin() {
    if (this.isSpinning) return;
    this.isSpinning = true;
    this.spinCenterBtn.disabled = true;
    this.spinLargeBtn.disabled = true;

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const numPrizes = this.prizes.length;
    const arcAngle = (2 * Math.PI) / numPrizes;

    // 1. Xác định giải trúng theo đúng tỉ lệ % trong prizes.json
    const winningIndex = this.selectWinningPrizeIndex();
    const winningPrize = this.prizes[winningIndex];
    this.currentWinningPrize = winningPrize;
    this.currentLuckyCode = 'TV-' + Math.floor(100000 + Math.random() * 900000);

    // 2. Tính góc quay dừng chính xác vào giữa nan quạt
    const safeOffset = (Math.random() * 0.7 - 0.35) * arcAngle;
    const targetSliceCenter = winningIndex * arcAngle + arcAngle / 2 + safeOffset;
    const pointerAngle = 3 * Math.PI / 2;

    const currentAngleMod = this.currentRotation % (2 * Math.PI);
    let deltaAngle = pointerAngle - targetSliceCenter - currentAngleMod;
    while (deltaAngle < 0) {
      deltaAngle += 2 * Math.PI;
    }

    const fullSpins = 7 * 2 * Math.PI;
    const totalRotationChange = fullSpins + deltaAngle;
    const startRotation = this.currentRotation;

    const spinDuration = 5500;
    const startTime = performance.now();
    let lastTickIndex = -1;

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / spinDuration, 1);

      const easeProgress = 1 - Math.pow(1 - progress, 3.5);
      this.currentRotation = startRotation + totalRotationChange * easeProgress;
      this.drawWheel();

      const currentWheelAngle = this.currentRotation % (2 * Math.PI);
      const relativePointerAngle = (pointerAngle - currentWheelAngle + 2 * Math.PI) % (2 * Math.PI);
      const currentSlice = Math.floor(relativePointerAngle / arcAngle);

      if (currentSlice !== lastTickIndex) {
        lastTickIndex = currentSlice;
        this.playTickSound();
        this.pointerEl.classList.add('tick');
        setTimeout(() => this.pointerEl.classList.remove('tick'), 60);
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.isSpinning = false;
        this.spinCenterBtn.disabled = false;
        this.spinLargeBtn.disabled = false;
        this.onSpinComplete(winningPrize);
      }
    };

    requestAnimationFrame(animate);
  }

  onSpinComplete(prize) {
    this.playWinFanfare();
    this.triggerConfetti();

    this.modalPrizeName.textContent = prize.fullName || prize.name;
    this.modalLuckyCode.textContent = this.currentLuckyCode;

    this.formSection.style.display = 'block';
    this.claimSuccessCard.classList.remove('active');
    this.claimForm.reset();
    this.clearErrors();

    setTimeout(() => {
      this.congratsModal.classList.add('active');
    }, 450);
  }

  triggerConfetti() {
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#5D6E5A', '#C5A880', '#A68A63', '#3E4D3C', '#F4EFEA']
      });
      setTimeout(() => {
        confetti({ particleCount: 70, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#5D6E5A', '#C5A880'] });
        confetti({ particleCount: 70, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#5D6E5A', '#C5A880'] });
      }, 300);
    }
  }

  validateName(name) {
    return name.trim().length >= 2;
  }

  validatePhone(phone) {
    const clean = phone.replace(/[\s.-]/g, '');
    const regex = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;
    return regex.test(clean);
  }

  clearErrors() {
    document.querySelectorAll('.form-group').forEach(group => group.classList.remove('invalid'));
  }

  async submitClaimForm(e) {
    e.preventDefault();
    this.clearErrors();

    const fullName = this.fullNameInput.value.trim();
    const phoneNumber = this.phoneNumberInput.value.trim();

    let isValid = true;
    if (!this.validateName(fullName)) {
      document.getElementById('nameGroup').classList.add('invalid');
      isValid = false;
    }

    if (!this.validatePhone(phoneNumber)) {
      document.getElementById('phoneGroup').classList.add('invalid');
      isValid = false;
    }

    if (!isValid) return;

    this.btnSubmitClaim.classList.add('loading');
    this.btnSubmitClaim.disabled = true;

    const prizeDisplayName = this.currentWinningPrize 
      ? (this.currentWinningPrize.fullName || this.currentWinningPrize.name) 
      : "Ưu đãi Thiên Vân";

    const payload = {
      fullName: fullName,
      phoneNumber: phoneNumber,
      prize: prizeDisplayName,
      luckyCode: this.currentLuckyCode,
      timestamp: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
    };

    try {
      let isSuccess = false;
      let errorMsg = '';

      // Cách 1: Gửi qua /api/submit
      try {
        const response = await fetch('/api/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const resData = await response.json();
          if (resData.success) {
            isSuccess = true;
          } else {
            errorMsg = resData.message || 'Lỗi từ máy chủ';
          }
        }
      } catch (proxyError) {
        console.warn('Proxy /api/submit không khả dụng, thử gửi trực tiếp sang Google Apps Script...', proxyError);
      }

      // Cách 2: Gửi trực tiếp nếu không qua proxy
      if (!isSuccess) {
        try {
          await fetch(DEFAULT_APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          isSuccess = true;
        } catch (directErr) {
          console.error('Lỗi khi gửi trực tiếp tới Apps Script:', directErr);
        }
      }

      if (isSuccess) {
        document.getElementById('summaryName').textContent = fullName;
        document.getElementById('summaryPhone').textContent = phoneNumber;
        document.getElementById('summaryPrize').textContent = payload.prize;
        document.getElementById('summaryCode').textContent = payload.luckyCode;

        this.formSection.style.display = 'none';
        this.claimSuccessCard.classList.add('active');
        this.triggerConfetti();

        // Tự động chuyển hướng sang trang liên kết Zalo tương ứng của giải thưởng
        const redirectUrl = this.currentWinningPrize && this.currentWinningPrize.redirectUrl;
        if (redirectUrl) {
          const redirectNotice = document.createElement('p');
          redirectNotice.style.cssText = 'color: #8C7355; font-size: 0.85rem; margin-top: 10px; font-style: italic;';
          redirectNotice.textContent = 'Đang tự động chuyển hướng đến nhận ưu đãi trên Zalo...';
          this.claimSuccessCard.appendChild(redirectNotice);

          setTimeout(() => {
            window.location.href = redirectUrl;
          }, 1500);
        }
      } else {
        alert(errorMsg || 'Không thể lưu thông tin. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại!');
      }

    } catch (err) {
      console.error('Lỗi submit:', err);
      alert('Đã xảy ra lỗi kết nối. Vui lòng thử lại!');
    } finally {
      this.btnSubmitClaim.classList.remove('loading');
      this.btnSubmitClaim.disabled = false;
    }
  }

  showToast(message) {
    const toast = document.getElementById('toastMsg');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }

  bindEvents() {
    this.spinCenterBtn.addEventListener('click', () => this.spin());
    this.spinLargeBtn.addEventListener('click', () => this.spin());

    this.soundToggleBtn.addEventListener('click', () => {
      this.isMuted = !this.isMuted;
      this.soundToggleBtn.innerHTML = this.isMuted 
        ? `<svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27l4.73 4.73H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`
        : `<svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
      this.showToast(this.isMuted ? 'Đã tắt âm thanh' : 'Đã bật âm thanh');
    });

    document.getElementById('modalCloseBtn').addEventListener('click', () => {
      this.congratsModal.classList.remove('active');
    });
    
    // Nút Hoàn tất chuyển hướng ngay tới link Zalo tương ứng
    document.getElementById('btnCloseFinal').addEventListener('click', () => {
      const redirectUrl = this.currentWinningPrize && this.currentWinningPrize.redirectUrl;
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        this.congratsModal.classList.remove('active');
      }
    });

    this.claimForm.addEventListener('submit', (e) => this.submitClaimForm(e));

    window.addEventListener('resize', () => {
      this.initCanvasSize();
      this.drawWheel();
    });

    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.initCanvasSize();
        this.drawWheel();
      }, 150);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.luckyWheel = new LuckyWheelGame();
});

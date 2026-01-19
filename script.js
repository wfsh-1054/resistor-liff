// ================= 設定區 =================
const LIFF_ID = "2008918191-8EM4f0JH"; 
// =========================================

const resistorData = {
    black:  { hex: '#212121', name: '黑', val: 0, mult: 1, tol: null },
    brown:  { hex: '#795548', name: '棕', val: 1, mult: 10, tol: 1 },
    red:    { hex: '#F44336', name: '紅', val: 2, mult: 100, tol: 2 },
    orange: { hex: '#FF9800', name: '橙', val: 3, mult: 1000, tol: null },
    yellow: { hex: '#FFEB3B', name: '黃', val: 4, mult: 10000, tol: null },
    green:  { hex: '#4CAF50', name: '綠', val: 5, mult: 100000, tol: 0.5 },
    blue:   { hex: '#2196F3', name: '藍', val: 6, mult: 1000000, tol: 0.25 },
    violet: { hex: '#9C27B0', name: '紫', val: 7, mult: 10000000, tol: 0.1 },
    grey:   { hex: '#9E9E9E', name: '灰', val: 8, mult: null, tol: 0.05 },
    white:  { hex: '#FFFFFF', name: '白', val: 9, mult: null, tol: null },
    gold:   { hex: '#D4AF37', name: '金', val: null, mult: 0.1, tol: 5 },
    silver: { hex: '#E0E0E0', name: '銀', val: null, mult: 0.01, tol: 10 }
};

const els = {
    selects: ['b1', 'b2', 'b3', 'b4', 'b5'].map(id => document.getElementById(id)),
    bands: ['v1', 'v2', 'v3', 'v4', 'v5'].map(id => document.getElementById(id)),
    val: document.getElementById('res-val'),
    tol: document.getElementById('res-tol'),
    btnShare: document.getElementById('btn-share'), // 我們將共用這個按鈕
    statusDot: document.getElementById('status-dot'),
    statusText: document.getElementById('status-text'),
    captureArea: document.getElementById('capture-area')
};

// 初始化控制項
function initControls() {
    const createOption = (key, data) => {
        const opt = document.createElement('option');
        opt.value = key; opt.textContent = data.name;
        opt.style.color = data.hex === '#FFFFFF' ? '#000' : data.hex; 
        return opt;
    };
    const filters = [
        d => d.val !== null, d => d.val !== null, d => d.val !== null,
        d => d.mult !== null, d => d.tol !== null   
    ];
    els.selects.forEach((sel, idx) => {
        Object.keys(resistorData).forEach(k => {
            if (filters[idx](resistorData[k])) sel.appendChild(createOption(k, resistorData[k]));
        });
        sel.addEventListener('change', calculate);
    });
    // 預設值: 10k 5%
    ['brown', 'black', 'black', 'red', 'gold'].forEach((v, i) => els.selects[i].value = v);
}

// 視覺化邏輯
function getGradient(hex) {
    return `linear-gradient(to bottom, rgba(255,255,255,0.4) 0%, ${hex} 20%, ${hex} 80%, rgba(0,0,0,0.2) 100%)`;
}

function calculate() {
    const s = els.selects.map(sel => sel.value);
    const d = s.map(k => resistorData[k]);
    els.bands.forEach((band, i) => band.style.background = getGradient(d[i].hex));

    const baseVal = (d[0].val * 100) + (d[1].val * 10) + d[2].val;
    const totalOhms = baseVal * d[3].mult;
    
    let displayVal = '';
    if (totalOhms >= 1e6) displayVal = (totalOhms / 1e6).toFixed(2).replace(/\.00$/, '') + ' MΩ';
    else if (totalOhms >= 1e3) displayVal = (totalOhms / 1e3).toFixed(2).replace(/\.00$/, '') + ' kΩ';
    else displayVal = totalOhms.toFixed(2).replace(/\.00$/, '') + ' Ω';

    els.val.textContent = displayVal;
    els.tol.textContent = `誤差 ±${d[4].tol}%`;
}

// LIFF 初始化 (依然保留，為了確認環境)
async function initLiff() {
    try {
        await liff.init({ liffId: LIFF_ID, withLoginOnExternalBrowser: false });
        updateStatus(true, "準備就緒");
    } catch (err) {
        updateStatus(false, "LIFF 初始化異常", true);
    }
}

function updateStatus(isOnline, text, isError = false) {
    els.statusText.textContent = text;
    els.statusDot.className = 'status-dot ' + (isError ? 'error' : (isOnline ? 'active' : ''));
}

// ========== 核心：原生圖片分享功能 ==========
async function nativeShareImage() {
    const btn = els.btnShare;
    const originalText = btn.innerHTML;
    
    // 1. UI 顯示處理中
    btn.innerHTML = '🖼️ 產生圖片中...';
    btn.disabled = true;

    try {
        // 2. 截圖
        const canvas = await html2canvas(els.captureArea, { scale: 3, backgroundColor: "#ffffff" });
        
        // 3. 將 Canvas 轉為 Blob 物件
        canvas.toBlob(async (blob) => {
            if (!blob) {
                throw new Error("圖片產生失敗");
            }

            // 4. 建立檔案物件
            const file = new File([blob], "resistor.png", { type: "image/png" });
            const shareData = {
                files: [file],
                title: '五環電阻計算結果',
                text: `阻值：${els.val.textContent} / ${els.tol.textContent}`
            };

            // 5. 檢查瀏覽器是否支援檔案分享
            if (navigator.canShare && navigator.canShare(shareData)) {
                btn.innerHTML = '🚀 請選擇分享對象';
                try {
                    await navigator.share(shareData);
                    btn.innerHTML = '✅ 分享成功';
                } catch (err) {
                    // 使用者取消分享不視為錯誤
                    console.log("分享取消"); 
                    btn.innerHTML = originalText;
                }
            } else {
                // 如果不支援 Web Share API (如電腦版)，則改為下載
                alert("您的裝置不支援直接分享圖片，將改為下載。");
                const link = document.createElement('a');
                link.download = 'resistor.png';
                link.href = canvas.toDataURL();
                link.click();
            }

            // 復原按鈕
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }, 2000);

        }, 'image/png');

    } catch (err) {
        console.error(err);
        alert("分享失敗：" + err.message);
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// 綁定事件：將原來的兩個按鈕功能合併，或只保留一個分享按鈕
// 建議您在 HTML 中只留一個大大的「分享圖片」按鈕即可
els.btnShare.addEventListener('click', nativeShareImage);
// 如果您 HTML 還留著下載按鈕，也可以綁定同一個函式
if(els.btnDl) els.btnDl.addEventListener('click', nativeShareImage);


window.onload = () => {
    initControls();
    calculate();
    initLiff();
};

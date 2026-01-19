// ================= 設定區 =================
const LIFF_ID = "2008918191-8EM4f0JH"; 
// =========================================

// Resistor Data (保持不變)
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
    btnFlex: document.getElementById('btn-flex'),
    btnImg: document.getElementById('btn-img'),
    statusDot: document.getElementById('status-dot'),
    statusText: document.getElementById('status-text'),
    captureArea: document.getElementById('capture-area')
};

// 全域變數儲存圖片 Blob
let currentImageBlob = null;

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
    ['brown', 'black', 'black', 'red', 'gold'].forEach((v, i) => els.selects[i].value = v);
}

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

    return { displayVal, tol: d[4].tol, colors: d.map(x => x.hex) };
}

async function initLiff() {
    try {
        await liff.init({ liffId: LIFF_ID, withLoginOnExternalBrowser: false });
        if (liff.isLoggedIn()) {
            updateStatus(true, "LIFF 已連線 (v4.0 Debug)");
        } else {
            updateStatus(false, "訪客模式 (v4.0 Debug)");
        }
    } catch (err) {
        updateStatus(false, "初始化失敗: " + err.message, true);
        alert("LIFF 初始化錯誤: " + err.message);
    }
}

function updateStatus(isOnline, text, isError = false) {
    els.statusText.textContent = text;
    els.statusDot.className = 'status-dot ' + (isError ? 'error' : (isOnline ? 'active' : ''));
}

// ========== Debug 版 Flex Message ==========
async function shareFlexMsg() {
    if (!liff.isLoggedIn()) {
        liff.login(); return;
    }

    // 檢查 API 是否可用
    if (!liff.isApiAvailable('shareTargetPicker')) {
        alert("錯誤：您的 LINE 版本或此 LIFF 設定不支援 shareTargetPicker API。請檢查 Developer Console 的權限。");
        return;
    }

    const result = calculate();
    const colorBoxes = result.colors.map(hex => ({
        type: "box", layout: "vertical", backgroundColor: hex,
        width: "16px", height: "16px", cornerRadius: "16px",
        margin: "sm", borderColor: "#dddddd", borderWidth: "1px"
    }));

    const flexMsg = {
        type: "flex",
        altText: `電阻計算結果：${result.displayVal}`,
        contents: {
            type: "bubble",
            body: {
                type: "box", layout: "vertical",
                contents: [
                    { type: "text", text: "電阻計算結果", weight: "bold", color: "#06c755", size: "sm" },
                    { type: "text", text: result.displayVal, weight: "bold", size: "xxl", margin: "md" },
                    { type: "text", text: `誤差 ±${result.tol}%`, size: "sm", color: "#888888", margin: "xs" },
                    { type: "box", layout: "horizontal", margin: "lg", justifyContent: "center", contents: colorBoxes }
                ]
            }
        }
    };

    try {
        console.log("正在發送 Flex...");
        const res = await liff.shareTargetPicker([flexMsg]);
        if (res) {
            alert("Flex 發送成功！"); // 如果這裡跳出來但沒收到，就是 JSON 格式被 LINE 濾掉了
        } else {
            alert("使用者關閉了分享視窗");
        }
    } catch (err) {
        alert("Flex 發送報錯: " + err.code + "\n" + err.message);
    }
}

// ========== 兩段式圖片分享 (解決手機延遲問題) ==========
async function prepareAndShareImage() {
    const btn = els.btnImg;
    
    // 狀態 1: 如果按鈕顯示「確認分享」，代表圖片已準備好，直接呼叫原生分享
    if (btn.dataset.ready === "true" && currentImageBlob) {
        try {
            const file = new File([currentImageBlob], "resistor.png", { type: "image/png" });
            const shareData = { files: [file], title: '電阻計算結果' };
            
            if (navigator.canShare && navigator.canShare(shareData)) {
                await navigator.share(shareData); // 這裡不會有延遲，因為圖片早就好了
                // 分享後重置按鈕
                resetImgBtn();
            } else {
                throw new Error("不支援分享");
            }
        } catch (err) {
            // 如果原生分享失敗，改為下載
            const link = document.createElement('a');
            link.download = 'resistor.png';
            link.href = URL.createObjectURL(currentImageBlob);
            link.click();
            resetImgBtn();
        }
        return;
    }

    // 狀態 2: 第一次點擊，開始截圖
    const originalText = btn.innerHTML;
    btn.innerHTML = '📷 截圖運算中...';
    btn.disabled = true;

    try {
        const canvas = await html2canvas(els.captureArea, { scale: 3, backgroundColor: "#ffffff" });
        canvas.toBlob((blob) => {
            currentImageBlob = blob;
            // 截圖完成，改變按鈕狀態，讓使用者點第二次
            btn.innerHTML = '🚀 點此發送圖片';
            btn.dataset.ready = "true"; // 標記為準備就緒
            btn.style.backgroundColor = "#ff9800"; // 換個顏色提示
            btn.disabled = false;
        }, 'image/png');
    } catch (err) {
        alert("截圖失敗: " + err.message);
        resetImgBtn();
    }
}

function resetImgBtn() {
    const btn = els.btnImg;
    btn.innerHTML = '<span class="icon">🖼️</span> 產生圖片並分享';
    btn.dataset.ready = "false";
    btn.style.backgroundColor = ""; // 恢復原色
    btn.disabled = false;
    currentImageBlob = null;
}

// 綁定事件
els.btnFlex.addEventListener('click', shareFlexMsg);
els.btnImg.addEventListener('click', prepareAndShareImage);

window.onload = () => {
    initControls();
    calculate();
    initLiff();
};

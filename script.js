// ================= 設定區 =================
const LIFF_ID = "2008918191-8EM4f0JH"; 
// =========================================

// 電阻色碼資料結構
const resistorData = {
    black:  { hex: '#212121', name: '黑', val: 0, mult: 1, tol: null },
    brown:  { hex: '#795548', name: '棕', val: 1, mult: 10, tol: 1 },
    red:    { hex: '#f44336', name: '紅', val: 2, mult: 100, tol: 2 },
    orange: { hex: '#ff9800', name: '橙', val: 3, mult: 1000, tol: null },
    yellow: { hex: '#ffeb3b', name: '黃', val: 4, mult: 10000, tol: null },
    green:  { hex: '#4caf50', name: '綠', val: 5, mult: 100000, tol: 0.5 },
    blue:   { hex: '#2196f3', name: '藍', val: 6, mult: 1000000, tol: 0.25 },
    violet: { hex: '#9c27b0', name: '紫', val: 7, mult: 10000000, tol: 0.1 },
    grey:   { hex: '#9e9e9e', name: '灰', val: 8, mult: null, tol: 0.05 },
    white:  { hex: '#ffffff', name: '白', val: 9, mult: null, tol: null },
    gold:   { hex: '#d4af37', name: '金', val: null, mult: 0.1, tol: 5 },
    silver: { hex: '#e0e0e0', name: '銀', val: null, mult: 0.01, tol: 10 }
};

// DOM 元素快取
const els = {
    selects: ['b1', 'b2', 'b3', 'b4', 'b5'].map(id => document.getElementById(id)),
    bands: ['v1', 'v2', 'v3', 'v4', 'v5'].map(id => document.getElementById(id)),
    val: document.getElementById('res-val'),
    tol: document.getElementById('res-tol'),
    btnShare: document.getElementById('btn-share'),
    btnDl: document.getElementById('btn-download'),
    statusDot: document.getElementById('status-dot'),
    statusText: document.getElementById('status-text'),
    captureArea: document.getElementById('capture-area')
};

// 初始化選單
function initControls() {
    const createOption = (key, data) => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = data.name;
        // 為了在選單中顯示顏色小方塊 (部分瀏覽器支援)
        opt.style.color = data.hex === '#ffffff' ? '#000' : data.hex; 
        return opt;
    };

    const filters = [
        d => d.val !== null, // 環 1-3: 有數值
        d => d.val !== null,
        d => d.val !== null,
        d => d.mult !== null, // 環 4: 有倍率
        d => d.tol !== null   // 環 5: 有誤差
    ];

    els.selects.forEach((sel, idx) => {
        Object.keys(resistorData).forEach(colorKey => {
            if (filters[idx](resistorData[colorKey])) {
                sel.appendChild(createOption(colorKey, resistorData[colorKey]));
            }
        });
        sel.addEventListener('change', calculate);
    });

    // 設定預設值: 棕 黑 黑 紅 金 (10kΩ 5%)
    els.selects[0].value = 'brown';
    els.selects[1].value = 'black';
    els.selects[2].value = 'black';
    els.selects[3].value = 'red';
    els.selects[4].value = 'gold';
}

// 產生立體漸層色
function getGradient(hex) {
    // 簡單的亮暗處理模擬圓柱體反光
    return `linear-gradient(to bottom, 
        rgba(255,255,255,0.4) 0%, 
        ${hex} 20%, 
        ${hex} 80%, 
        rgba(0,0,0,0.2) 100%)`;
}

// 主計算邏輯
function calculate() {
    const s = els.selects.map(sel => sel.value); // 取得選中的顏色 Key
    const d = s.map(k => resistorData[k]);       // 對應到資料物件

    // 1. 更新色環視覺
    els.bands.forEach((band, i) => {
        band.style.background = getGradient(d[i].hex);
    });

    // 2. 計算數值
    // 五環公式: (百位+十位+個位) * 倍率
    const baseVal = (d[0].val * 100) + (d[1].val * 10) + d[2].val;
    const totalOhms = baseVal * d[3].mult;
    
    // 3. 格式化顯示
    let displayVal = '';
    if (totalOhms >= 1e6) {
        displayVal = (totalOhms / 1e6).toFixed(2).replace(/\.00$/, '') + ' MΩ';
    } else if (totalOhms >= 1e3) {
        displayVal = (totalOhms / 1e3).toFixed(2).replace(/\.00$/, '') + ' kΩ';
    } else {
        displayVal = totalOhms.toFixed(2).replace(/\.00$/, '') + ' Ω';
    }

    els.val.textContent = displayVal;
    els.tol.textContent = `誤差 ±${d[4].tol}%`;

    return { displayVal, tol: d[4].tol, colors: d.map(x => x.hex) };
}

// LIFF 初始化
async function initLiff() {
    try {
        await liff.init({
            liffId: LIFF_ID,
            withLoginOnExternalBrowser: false // 電腦版不強制跳轉
        });

        if (liff.isLoggedIn()) {
            updateStatus(true, "LIFF 已連線 (已登入)");
        } else {
            updateStatus(false, "訪客模式 (點擊分享需登入)");
        }
    } catch (err) {
        console.error(err);
        updateStatus(false, "初始化失敗", true);
    }
}

function updateStatus(isOnline, text, isError = false) {
    els.statusText.textContent = text;
    els.statusDot.className = 'status-dot ' + (isError ? 'error' : (isOnline ? 'active' : ''));
}

// 分享 Flex Message 邏輯
async function shareResult() {
    if (!liff.isLoggedIn()) {
        if (confirm("分享功能需要登入 LINE，是否前往登入？")) {
            liff.login();
        }
        return;
    }

    const result = calculate(); // 獲取當前計算結果

    // 建立一個看起來像電阻的 Flex Message
    const flexContent = {
        type: "flex",
        altText: `電阻計算結果：${result.displayVal}`,
        contents: {
            type: "bubble",
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    { type: "text", text: "五環電阻計算器", weight: "bold", color: "#1DB446", size: "sm" },
                    { type: "text", text: result.displayVal, weight: "bold", size: "3xl", margin: "md" },
                    { type: "text", text: `誤差 ±${result.tol}%`, size: "md", color: "#aaaaaa" },
                    { type: "separator", margin: "lg" },
                    // 模擬色環顏色條
                    {
                        type: "box",
                        layout: "horizontal",
                        margin: "lg",
                        contents: result.colors.map(hex => ({
                            type: "box",
                            layout: "vertical",
                            backgroundColor: hex,
                            width: "20px",
                            height: "20px",
                            cornerRadius: "20px",
                            margin: "xs",
                            borderColor: "#dddddd",
                            borderWidth: "1px"
                        }))
                    }
                ]
            },
            footer: {
                type: "box",
                layout: "vertical",
                contents: [{
                    type: "button",
                    action: { type: "uri", label: "開啟計算器", uri: "https://liff.line.me/" + LIFF_ID },
                    style: "primary",
                    color: "#00b900"
                }]
            }
        }
    };

    try {
        const res = await liff.shareTargetPicker([flexContent]);
        if (res) alert("分享成功！");
    } catch (err) {
        console.error(err);
        alert("分享失敗，請確認 LINE 版本");
    }
}

// 下載圖片邏輯
function downloadImage() {
    const originalBtnText = els.btnDl.innerHTML;
    els.btnDl.innerHTML = '處理中...';
    
    html2canvas(els.captureArea, { scale: 2, backgroundColor: "#ffffff" }).then(canvas => {
        const link = document.createElement('a');
        link.download = `resistor_${els.val.textContent.replace(' ','')}.png`;
        link.href = canvas.toDataURL();
        link.click();
        els.btnDl.innerHTML = originalBtnText;
    });
}

// 綁定事件
els.btnShare.addEventListener('click', shareResult);
els.btnDl.addEventListener('click', downloadImage);

// 程式進入點
window.onload = () => {
    initControls();
    calculate();
    initLiff(); // 開始 LIFF 初始化
};

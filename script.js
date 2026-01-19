// ================= 設定區 =================
const LIFF_ID = "2008918191-8EM4f0JH"; 
// =========================================

const resistorData = {
    black:  { hex: '#212121', name: '黑', val: 0, mult: 1, tol: null },
    brown:  { hex: '#795548', name: '棕', val: 1, mult: 10, tol: 1 },
    red:    { hex: '#F44336', name: '紅', val: 2, mult: 100, tol: 2 }, // 改為大寫標準碼
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

function initControls() {
    const createOption = (key, data) => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = data.name;
        opt.style.color = data.hex === '#FFFFFF' ? '#000' : data.hex; 
        return opt;
    };

    const filters = [
        d => d.val !== null, 
        d => d.val !== null,
        d => d.val !== null,
        d => d.mult !== null, 
        d => d.tol !== null   
    ];

    els.selects.forEach((sel, idx) => {
        Object.keys(resistorData).forEach(colorKey => {
            if (filters[idx](resistorData[colorKey])) {
                sel.appendChild(createOption(colorKey, resistorData[colorKey]));
            }
        });
        sel.addEventListener('change', calculate);
    });

    els.selects[0].value = 'brown';
    els.selects[1].value = 'black';
    els.selects[2].value = 'black';
    els.selects[3].value = 'red';
    els.selects[4].value = 'gold';
}

function getGradient(hex) {
    return `linear-gradient(to bottom, rgba(255,255,255,0.4) 0%, ${hex} 20%, ${hex} 80%, rgba(0,0,0,0.2) 100%)`;
}

function calculate() {
    const s = els.selects.map(sel => sel.value);
    const d = s.map(k => resistorData[k]);

    els.bands.forEach((band, i) => {
        band.style.background = getGradient(d[i].hex);
    });

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

// ================= LIFF 核心邏輯 =================

async function initLiff() {
    try {
        await liff.init({ liffId: LIFF_ID, withLoginOnExternalBrowser: false });
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

// 修正後的 Flex Message 分享邏輯
async function shareResult() {
    if (!liff.isLoggedIn()) {
        if (confirm("分享功能需要登入 LINE，是否前往登入？")) liff.login();
        return;
    }

    const result = calculate();
    
    // 建立顏色球物件 (確保 hex 碼正確)
    const colorBubbles = result.colors.map(hex => ({
        type: "box",
        layout: "vertical",
        backgroundColor: hex,
        width: "16px",
        height: "16px",
        cornerRadius: "16px",
        borderColor: "#dddddd",
        borderWidth: "1px",
        margin: "sm" // 使用 sm 間距避免擠壓
    }));

    // 嚴謹的 Flex Message JSON
    const flexContent = {
        type: "flex",
        altText: `電阻計算結果：${result.displayVal}`,
        contents: {
            type: "bubble",
            size: "kilo", // 稍微縮小尺寸增加相容性
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    { type: "text", text: "五環電阻計算器", weight: "bold", color: "#1DB446", size: "xs" },
                    { type: "text", text: result.displayVal, weight: "bold", size: "xxl", margin: "md", wrap: true },
                    { type: "text", text: `誤差 ±${result.tol}%`, size: "sm", color: "#aaaaaa", margin: "xs" },
                    { type: "separator", margin: "lg" },
                    {
                        type: "box",
                        layout: "horizontal", // 色環展示區
                        margin: "lg",
                        justifyContent: "center", // 置中對齊
                        contents: colorBubbles
                    }
                ]
            },
            footer: {
                type: "box",
                layout: "vertical",
                contents: [{
                    type: "button",
                    action: { 
                        type: "uri", 
                        label: "我也要算", 
                        uri: "https://liff.line.me/" + LIFF_ID 
                    },
                    style: "primary",
                    color: "#00b900",
                    height: "sm"
                }]
            }
        }
    };

    try {
        const res = await liff.shareTargetPicker([flexContent]);
        if (res) alert("✅ 分享成功！");
    } catch (err) {
        console.error("分享失敗:", err);
        alert("❌ 分享失敗：" + err.message);
    }
}

// 修正後的圖片下載邏輯 (改為彈窗長按)
function downloadImage() {
    const btn = els.btnDl;
    const originalText = btn.innerHTML;
    btn.innerHTML = '🖼️ 產生中...';
    btn.disabled = true;

    // 建立彈窗容器
    if (!document.getElementById('img-modal')) {
        const modal = document.createElement('div');
        modal.id = 'img-modal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <img id="generated-img" src="" alt="電阻圖">
                <div class="modal-tip">請「長按圖片」來儲存</div>
            </div>
            <button class="close-btn" onclick="document.getElementById('img-modal').classList.remove('show')">關閉</button>
        `;
        document.body.appendChild(modal);
    }

    html2canvas(els.captureArea, { scale: 3, backgroundColor: "#ffffff" }).then(canvas => {
        const imgData = canvas.toDataURL("image/png");
        const modal = document.getElementById('img-modal');
        const img = document.getElementById('generated-img');
        
        img.src = imgData;
        modal.classList.add('show'); // 顯示彈窗

        // 恢復按鈕
        btn.innerHTML = originalText;
        btn.disabled = false;
    }).catch(err => {
        alert("圖片產生失敗");
        btn.innerHTML = originalText;
        btn.disabled = false;
    });
}

// 綁定事件
els.btnShare.addEventListener('click', shareResult);
els.btnDl.addEventListener('click', downloadImage);

window.onload = () => {
    initControls();
    calculate();
    initLiff(); 
};

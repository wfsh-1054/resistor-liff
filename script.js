// ================= 設定區 =================
const LIFF_ID = "2008918191-8EM4f0JH"; 
// =========================================

// Resistor Data
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
    // Default: 10k 5%
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

// ========== LIFF 初始化 ==========
async function initLiff() {
    try {
        await liff.init({ liffId: LIFF_ID, withLoginOnExternalBrowser: false });
        if (liff.isLoggedIn()) {
            updateStatus(true, "LIFF 已連線 (已登入)");
        } else {
            updateStatus(false, "訪客模式");
        }
    } catch (err) {
        updateStatus(false, "初始化失敗", true);
    }
}

function updateStatus(isOnline, text, isError = false) {
    els.statusText.textContent = text;
    els.statusDot.className = 'status-dot ' + (isError ? 'error' : (isOnline ? 'active' : ''));
}

// ========== 功能 1: Flex Message 分享 ==========
async function shareFlexMsg() {
    if (!liff.isLoggedIn()) {
        if(confirm("Flex 分享需要登入 LINE，是否前往登入？")) liff.login();
        return;
    }

    const result = calculate();
    
    // 安全的顏色球結構
    const colorBoxes = result.colors.map(hex => ({
        type: "box",
        layout: "vertical",
        backgroundColor: hex,
        width: "16px", height: "16px", cornerRadius: "16px",
        margin: "sm", borderColor: "#dddddd", borderWidth: "1px"
    }));

    const flexMsg = {
        type: "flex",
        altText: `電阻計算結果：${result.displayVal}`,
        contents: {
            type: "bubble",
            size: "kilo",
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    { type: "text", text: "五環電阻計算器", weight: "bold", color: "#06c755", size: "xs" },
                    { type: "text", text: result.displayVal, weight: "bold", size: "3xl", margin: "md" },
                    { type: "text", text: `誤差 ±${result.tol}%`, size: "sm", color: "#888888", margin: "xs" },
                    { type: "separator", margin: "lg" },
                    {
                        type: "box",
                        layout: "horizontal",
                        margin: "lg",
                        justifyContent: "center",
                        contents: colorBoxes
                    }
                ]
            },
            footer: {
                type: "box",
                layout: "vertical",
                contents: [{
                    type: "button",
                    action: { type: "uri", label: "我也要算", uri: "https://liff.line.me/" + LIFF_ID },
                    style: "primary",
                    color: "#06c755",
                    height: "sm"
                }]
            }
        }
    };

    try {
        const res = await liff.shareTargetPicker([flexMsg]);
        if (res) alert("Flex 卡片分享成功！");
    } catch (err) {
        alert("分享失敗: " + err.message);
    }
}

// ========== 功能 2: 原生圖片分享 (Native Share) ==========
async function nativeShareImage() {
    const btn = els.btnImg;
    const originalText = btn.innerHTML;
    btn.innerHTML = '處理中...';
    btn.disabled = true;

    try {
        const canvas = await html2canvas(els.captureArea, { scale: 3, backgroundColor: "#ffffff" });
        canvas.toBlob(async (blob) => {
            if (!blob) throw new Error("圖片產生失敗");

            const file = new File([blob], "resistor.png", { type: "image/png" });
            const shareData = {
                files: [file],
                title: '電阻計算結果',
                text: `${els.val.textContent}`
            };

            if (navigator.canShare && navigator.canShare(shareData)) {
                try {
                    await navigator.share(shareData);
                    btn.innerHTML = '分享完成';
                } catch (err) {
                    console.log("分享取消"); // 使用者取消不報錯
                }
            } else {
                // 電腦版 Fallback: 下載
                const link = document.createElement('a');
                link.download = 'resistor.png';
                link.href = canvas.toDataURL();
                link.click();
                alert("已為您下載圖片");
            }

            setTimeout(() => { btn.innerHTML = originalText; btn.disabled = false; }, 2000);
        }, 'image/png');
    } catch (err) {
        alert("錯誤: " + err.message);
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// 綁定事件
els.btnFlex.addEventListener('click', shareFlexMsg);
els.btnImg.addEventListener('click', nativeShareImage);

window.onload = () => {
    initControls();
    calculate();
    initLiff();
};

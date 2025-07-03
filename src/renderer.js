// DOM 元素
const elements = {
    // 文件选择
    inputPath: document.getElementById('inputPath'),
    outputPath: document.getElementById('outputPath'),
    selectInputBtn: document.getElementById('selectInputBtn'),
    selectOutputBtn: document.getElementById('selectOutputBtn'),
    
    // 参数配置
    method: document.getElementById('method'),
    backend: document.getElementById('backend'),
    lang: document.getElementById('lang'),
    url: document.getElementById('url'),
    start: document.getElementById('start'),
    end: document.getElementById('end'),
    formula: document.getElementById('formula'),
    table: document.getElementById('table'),
    device: document.getElementById('device'),
    vram: document.getElementById('vram'),
    source: document.getElementById('source'),
    
    // 操作按钮
    executeBtn: document.getElementById('executeBtn'),
    saveSettingsBtn: document.getElementById('saveSettingsBtn'),
    loadSettingsBtn: document.getElementById('loadSettingsBtn'),
    clearLogBtn: document.getElementById('clearLogBtn'),
    openOutputFolderBtn: document.getElementById('openOutputFolderBtn'),
    cancelBtn: document.getElementById('cancelBtn'),
    installCondaBtn: document.getElementById('installCondaBtn'),
    
    // 状态和日志
    statusIndicator: document.getElementById('statusIndicator'),
    logOutput: document.getElementById('logOutput'),
    loadingOverlay: document.getElementById('loadingOverlay')
};

// 应用状态
let isExecuting = false;
let currentOutputPath = '';

// 初始化应用
async function initializeApp() {
    // 检查 MinerU 是否安装
    await checkMinerUStatus();
    
    // 加载保存的设置
    await loadSettings();
    
    // 绑定事件监听器
    bindEventListeners();
    
    // 监听 MinerU 输出
    window.electronAPI.onMinerUOutput((event, data) => {
        appendLog(data.data, data.type);
    });
}

// 检查 MinerU 状态
async function checkMinerUStatus() {
    const statusDot = elements.statusIndicator.querySelector('.status-dot');
    const statusText = elements.statusIndicator.querySelector('.status-text');
    const installCondaBtn = elements.installCondaBtn;
    
    try {
        const result = await window.electronAPI.checkMinerUInstalled();
        
        if (result.installed) {
            statusDot.className = 'status-dot connected';
            statusText.textContent = 'MinerU 已就绪';
            installCondaBtn.style.display = 'none';
            updateExecuteButtonState();
        } else if (result.needsCondaInstall) {
            statusDot.className = 'status-dot error';
            statusText.textContent = 'Conda 未安装';
            installCondaBtn.style.display = 'block';
            elements.executeBtn.disabled = true;
            appendLog('错误: 未检测到 Conda 安装。请先安装 Conda。', 'error');
        } else {
            statusDot.className = 'status-dot error';
            statusText.textContent = 'MinerU 未安装';
            installCondaBtn.style.display = 'none';
            elements.executeBtn.disabled = true;
            appendLog('错误: 未检测到 MinerU 安装。请先安装 MinerU。', 'error');
        }
    } catch (error) {
        statusDot.className = 'status-dot error';
        statusText.textContent = '状态检查失败';
        installCondaBtn.style.display = 'none';
        elements.executeBtn.disabled = true;
        appendLog(`状态检查失败: ${error.message}`, 'error');
    }
}

// 绑定事件监听器
function bindEventListeners() {
    // 文件选择
    elements.selectInputBtn.addEventListener('click', selectInputPath);
    elements.selectOutputBtn.addEventListener('click', selectOutputPath);
    
    // 操作按钮
    elements.executeBtn.addEventListener('click', executeMinerU);
    elements.saveSettingsBtn.addEventListener('click', saveSettings);
    elements.loadSettingsBtn.addEventListener('click', loadSettings);
    elements.clearLogBtn.addEventListener('click', clearLog);
    elements.openOutputFolderBtn.addEventListener('click', openOutputFolder);
    elements.cancelBtn.addEventListener('click', cancelExecution);
    elements.installCondaBtn.addEventListener('click', installConda);
    
    // 输入变化监听
    elements.inputPath.addEventListener('change', updateExecuteButtonState);
    elements.outputPath.addEventListener('change', updateExecuteButtonState);
    
    // 后端变化监听（显示/隐藏 URL 输入）
    elements.backend.addEventListener('change', handleBackendChange);
    
    // Conda 安装进度监听
    window.electronAPI.onCondaInstallProgress((event, data) => {
        handleCondaInstallProgress(data);
    });
}

// 选择输入路径
async function selectInputPath() {
    try {
        const paths = await window.electronAPI.selectInputPath();
        if (paths && paths.length > 0) {
            elements.inputPath.value = paths.join(', ');
            updateExecuteButtonState();
        }
    } catch (error) {
        appendLog(`选择输入文件失败: ${error.message}`, 'error');
    }
}

// 选择输出路径
async function selectOutputPath() {
    try {
        const path = await window.electronAPI.selectOutputPath();
        if (path) {
            elements.outputPath.value = path;
            currentOutputPath = path;
            updateExecuteButtonState();
            elements.openOutputFolderBtn.disabled = false;
        }
    } catch (error) {
        appendLog(`选择输出目录失败: ${error.message}`, 'error');
    }
}

// 更新执行按钮状态
function updateExecuteButtonState() {
    const hasInput = elements.inputPath.value.trim() !== '';
    const hasOutput = elements.outputPath.value.trim() !== '';
    const statusConnected = elements.statusIndicator.querySelector('.status-dot').classList.contains('connected');
    
    elements.executeBtn.disabled = !hasInput || !hasOutput || !statusConnected || isExecuting;
}

// 处理后端变化
function handleBackendChange() {
    const urlGroup = elements.url.closest('.input-group');
    if (elements.backend.value === 'vlm-sglang-client') {
        urlGroup.style.display = 'flex';
    } else {
        urlGroup.style.display = 'none';
        elements.url.value = '';
    }
}

// 执行 MinerU
async function executeMinerU() {
    if (isExecuting) return;
    
    isExecuting = true;
    elements.loadingOverlay.style.display = 'flex';
    elements.executeBtn.disabled = true;
    
    // 清除之前的日志
    clearLog();
    
    // 收集参数
    const options = {
        inputPath: elements.inputPath.value.split(', ')[0], // 如果是多个文件，暂时只处理第一个
        outputPath: elements.outputPath.value,
        method: elements.method.value,
        backend: elements.backend.value,
        lang: elements.lang.value,
        url: elements.url.value,
        start: elements.start.value ? parseInt(elements.start.value) : undefined,
        end: elements.end.value ? parseInt(elements.end.value) : undefined,
        formula: elements.formula.checked,
        table: elements.table.checked,
        device: elements.device.value,
        vram: elements.vram.value ? parseInt(elements.vram.value) : undefined,
        source: elements.source.value
    };
    
    appendLog('开始执行 MinerU...', 'info');
    appendLog(`输入文件: ${options.inputPath}`, 'info');
    appendLog(`输出目录: ${options.outputPath}`, 'info');
    appendLog(`解析方法: ${options.method}`, 'info');
    appendLog(`后端: ${options.backend}`, 'info');
    appendLog('-------------------', 'info');
    
    try {
        const result = await window.electronAPI.executeMinerU(options);
        
        if (result.success) {
            appendLog('-------------------', 'success');
            appendLog('✅ 执行完成！', 'success');
            elements.openOutputFolderBtn.disabled = false;
        } else {
            appendLog('-------------------', 'error');
            appendLog(`❌ 执行失败: ${result.error}`, 'error');
        }
    } catch (error) {
        appendLog('-------------------', 'error');
        appendLog(`❌ 执行出错: ${error.error || error.message}`, 'error');
        
        if (error.stderr) {
            appendLog('错误详情:', 'error');
            appendLog(error.stderr, 'stderr');
        }
    } finally {
        isExecuting = false;
        elements.loadingOverlay.style.display = 'none';
        updateExecuteButtonState();
    }
}

// 取消执行
function cancelExecution() {
    // 注意：这里只是隐藏加载遮罩，实际的进程取消需要在主进程中实现
    isExecuting = false;
    elements.loadingOverlay.style.display = 'none';
    updateExecuteButtonState();
    appendLog('用户取消了执行', 'info');
}

// 保存设置
async function saveSettings() {
    const settings = {
        method: elements.method.value,
        backend: elements.backend.value,
        lang: elements.lang.value,
        url: elements.url.value,
        formula: elements.formula.checked,
        table: elements.table.checked,
        device: elements.device.value,
        source: elements.source.value
    };
    
    try {
        await window.electronAPI.saveSettings(settings);
        appendLog('✅ 设置已保存', 'success');
    } catch (error) {
        appendLog(`保存设置失败: ${error.message}`, 'error');
    }
}

// 加载设置
async function loadSettings() {
    try {
        const settings = await window.electronAPI.loadSettings();
        
        if (settings) {
            elements.method.value = settings.method || 'auto';
            elements.backend.value = settings.backend || 'pipeline';
            elements.lang.value = settings.lang || 'ch';
            elements.url.value = settings.url || '';
            elements.formula.checked = settings.formula !== undefined ? settings.formula : true;
            elements.table.checked = settings.table !== undefined ? settings.table : true;
            elements.device.value = settings.device || '';
            elements.source.value = settings.source || 'huggingface';
            
            // 触发后端变化处理
            handleBackendChange();
            
            appendLog('✅ 设置已加载', 'success');
        }
    } catch (error) {
        appendLog(`加载设置失败: ${error.message}`, 'error');
    }
}

// 添加日志
function appendLog(message, type = 'stdout') {
    const logLine = document.createElement('div');
    logLine.className = `log-line log-${type}`;
    
    // 添加时间戳
    const timestamp = new Date().toLocaleTimeString();
    logLine.textContent = `[${timestamp}] ${message}`;
    
    elements.logOutput.appendChild(logLine);
    elements.logOutput.scrollTop = elements.logOutput.scrollHeight;
}

// 清除日志
function clearLog() {
    elements.logOutput.innerHTML = '';
}

// 打开输出文件夹
async function openOutputFolder() {
    if (currentOutputPath) {
        try {
            await window.electronAPI.openOutputFolder(currentOutputPath);
        } catch (error) {
            appendLog(`打开输出文件夹失败: ${error.message}`, 'error');
        }
    }
}

// 安装 Conda
async function installConda() {
    const installBtn = elements.installCondaBtn;
    const originalText = installBtn.textContent;
    
    try {
        // 禁用按钮并显示安装中状态
        installBtn.disabled = true;
        installBtn.textContent = '安装中...';
        
        appendLog('开始安装 Conda...', 'info');
        
        const result = await window.electronAPI.installConda();
        
        if (result.success) {
            appendLog('Conda 安装成功！正在重新检查 MinerU 状态...', 'success');
            installBtn.style.display = 'none';
            
            // 等待一下再重新检查状态
            setTimeout(async () => {
                await checkMinerUStatus();
            }, 2000);
        } else {
            appendLog(`Conda 安装失败: ${result.error}`, 'error');
            installBtn.disabled = false;
            installBtn.textContent = originalText;
        }
    } catch (error) {
        appendLog(`Conda 安装出错: ${error.message}`, 'error');
        installBtn.disabled = false;
        installBtn.textContent = originalText;
    }
}

// 处理 Conda 安装进度
function handleCondaInstallProgress(data) {
    const { type, message } = data;
    
    switch (type) {
        case 'info':
            appendLog(message, 'info');
            break;
        case 'success':
            appendLog(message, 'success');
            break;
        case 'error':
            appendLog(message, 'error');
            break;
        default:
            appendLog(message, 'info');
    }
}

// 应用启动时初始化
document.addEventListener('DOMContentLoaded', initializeApp);

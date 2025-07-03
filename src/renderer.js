// DOM 元素
const elements = {
    // 文件选择
    outputPath: document.getElementById('outputPath'),
    selectInputBtn: document.getElementById('selectInputBtn'),
    selectOutputBtn: document.getElementById('selectOutputBtn'),
    
    // 队列管理
    queueCount: document.getElementById('queueCount'),
    queueEmpty: document.getElementById('queueEmpty'),
    queueList: document.getElementById('queueList'),
    queueStatus: document.getElementById('queueStatus'),
    pendingCount: document.getElementById('pendingCount'),
    completedCount: document.getElementById('completedCount'),
    errorCount: document.getElementById('errorCount'),
    currentProcessingFile: document.getElementById('currentProcessingFile'),
    
    // 队列操作按钮
    clearQueueBtn: document.getElementById('clearQueueBtn'),
    startProcessingBtn: document.getElementById('startProcessingBtn'),
    stopProcessingBtn: document.getElementById('stopProcessingBtn'),
    
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
    saveSettingsBtn: document.getElementById('saveSettingsBtn'),
    loadSettingsBtn: document.getElementById('loadSettingsBtn'),
    clearLogBtn: document.getElementById('clearLogBtn'),
    openOutputFolderBtn: document.getElementById('openOutputFolderBtn'),
    installCondaBtn: document.getElementById('installCondaBtn'),
    installMinerUBtn: document.getElementById('installMinerUBtn'),
    
    // 状态和日志
    statusIndicator: document.getElementById('statusIndicator'),
    logOutput: document.getElementById('logOutput')
};

// 应用状态
let fileQueue = [];
let isProcessing = false;
let currentOutputPath = '';

// 初始化应用
async function initializeApp() {
    // 检查 MinerU 是否安装
    await checkMinerUStatus();
    
    // 加载保存的设置
    await loadSettings();
    
    // 加载文件队列
    await loadFileQueue();
    
    // 绑定事件监听器
    bindEventListeners();
    
    // 监听队列相关事件
    setupQueueEventListeners();
}

// 检查 MinerU 状态
async function checkMinerUStatus() {
    const statusDot = elements.statusIndicator.querySelector('.status-dot');
    const statusText = elements.statusIndicator.querySelector('.status-text');
    const installCondaBtn = elements.installCondaBtn;
    const installMinerUBtn = elements.installMinerUBtn;
    
    try {
        const result = await window.electronAPI.checkMinerUInstalled();
        
        if (result.installed) {
            statusDot.className = 'status-dot connected';
            statusText.textContent = 'MinerU 已就绪';
            installCondaBtn.style.display = 'none';
            installMinerUBtn.style.display = 'none';
            updateProcessingButtonState();
        } else if (result.needsCondaInstall) {
            statusDot.className = 'status-dot error';
            statusText.textContent = 'Conda 未安装';
            installCondaBtn.style.display = 'block';
            installMinerUBtn.style.display = 'none';
            elements.startProcessingBtn.disabled = true;
            appendLog('错误: 未检测到 Conda 安装。请先安装 Conda。', 'error');
        } else if (result.needsMinerUInstall) {
            statusDot.className = 'status-dot error';
            statusText.textContent = 'MinerU 未安装';
            installCondaBtn.style.display = 'none';
            installMinerUBtn.style.display = 'block';
            elements.startProcessingBtn.disabled = true;
            appendLog('错误: 未检测到 MinerU 安装。请先安装 MinerU。', 'error');
        } else {
            statusDot.className = 'status-dot error';
            statusText.textContent = 'MinerU 未安装';
            installCondaBtn.style.display = 'none';
            installMinerUBtn.style.display = 'none';
            elements.startProcessingBtn.disabled = true;
            appendLog('错误: 未检测到 MinerU 安装。请先安装 MinerU。', 'error');
        }
    } catch (error) {
        statusDot.className = 'status-dot error';
        statusText.textContent = '状态检查失败';
        installCondaBtn.style.display = 'none';
        installMinerUBtn.style.display = 'none';
        elements.startProcessingBtn.disabled = true;
        appendLog(`状态检查失败: ${error.message}`, 'error');
    }
}

// 绑定事件监听器
function bindEventListeners() {
    // 文件选择
    elements.selectInputBtn.addEventListener('click', selectInputFiles);
    elements.selectOutputBtn.addEventListener('click', selectOutputPath);
    
    // 队列操作
    elements.clearQueueBtn.addEventListener('click', clearQueue);
    elements.startProcessingBtn.addEventListener('click', startQueueProcessing);
    elements.stopProcessingBtn.addEventListener('click', stopQueueProcessing);
    
    // 操作按钮
    elements.saveSettingsBtn.addEventListener('click', saveSettings);
    elements.loadSettingsBtn.addEventListener('click', loadSettings);
    elements.clearLogBtn.addEventListener('click', clearLog);
    elements.openOutputFolderBtn.addEventListener('click', openOutputFolder);
    elements.installCondaBtn.addEventListener('click', installConda);
    elements.installMinerUBtn.addEventListener('click', installMinerU);
    
    // 输入变化监听
    elements.outputPath.addEventListener('change', updateProcessingButtonState);
    
    // 后端变化监听（显示/隐藏 URL 输入）
    elements.backend.addEventListener('change', handleBackendChange);
    
    // Conda 安装进度监听
    window.electronAPI.onCondaInstallProgress((event, data) => {
        handleCondaInstallProgress(data);
    });
    
    // MinerU 安装进度监听
    window.electronAPI.onMinerUInstallProgress((event, data) => {
        handleMinerUInstallProgress(data);
    });
}

// 设置队列事件监听器
function setupQueueEventListeners() {
    window.electronAPI.onQueueUpdated((event, queue) => {
        fileQueue = queue;
        updateQueueDisplay();
    });
    
    window.electronAPI.onFileProcessingStarted((event, fileItem) => {
        appendLog(`开始处理: ${fileItem.fileName}`, 'info');
        updateProcessingStatus();
    });
    
    window.electronAPI.onFileProcessingCompleted((event, fileItem) => {
        if (fileItem.status === 'completed') {
            appendLog(`✅ 完成: ${fileItem.fileName}`, 'success');
        } else {
            appendLog(`❌ 失败: ${fileItem.fileName} - ${fileItem.error}`, 'error');
        }
        updateProcessingStatus();
    });
    
    window.electronAPI.onFileProgressUpdated((event, data) => {
        updateFileProgress(data.fileId, data.progress);
    });
    
    window.electronAPI.onQueueProcessingFinished((event) => {
        isProcessing = false;
        appendLog('🎉 队列处理完成！', 'success');
        updateProcessingButtonsDisplay();
        updateProcessingStatus();
    });
    
    window.electronAPI.onProcessingStopped((event) => {
        isProcessing = false;
        appendLog('⏹️ 处理已停止', 'info');
        updateProcessingButtonsDisplay();
        updateProcessingStatus();
    });
    
    window.electronAPI.onMinerUOutput((event, data) => {
        const prefix = data.fileName ? `[${data.fileName}] ` : '';
        appendLog(prefix + data.data, data.type);
    });
}

// 选择输入文件
async function selectInputFiles() {
    try {
        const newItems = await window.electronAPI.selectInputPath();
        if (newItems && newItems.length > 0) {
            appendLog(`添加了 ${newItems.length} 个文件到队列`, 'success');
            updateProcessingButtonState();
        }
    } catch (error) {
        appendLog(`选择文件失败: ${error.message}`, 'error');
    }
}

// 选择输出路径
async function selectOutputPath() {
    try {
        const path = await window.electronAPI.selectOutputPath();
        if (path) {
            elements.outputPath.value = path;
            currentOutputPath = path;
            updateProcessingButtonState();
            elements.openOutputFolderBtn.disabled = false;
        }
    } catch (error) {
        appendLog(`选择输出目录失败: ${error.message}`, 'error');
    }
}

// 加载文件队列
async function loadFileQueue() {
    try {
        const queue = await window.electronAPI.getFileQueue();
        fileQueue = queue;
        updateQueueDisplay();
    } catch (error) {
        appendLog(`加载队列失败: ${error.message}`, 'error');
    }
}

// 更新队列显示
function updateQueueDisplay() {
    elements.queueCount.textContent = fileQueue.length;
    
    if (fileQueue.length === 0) {
        elements.queueEmpty.style.display = 'flex';
        elements.queueList.style.display = 'none';
        elements.queueStatus.style.display = 'none';
    } else {
        elements.queueEmpty.style.display = 'none';
        elements.queueList.style.display = 'block';
        elements.queueStatus.style.display = 'flex';
        
        // 更新统计信息
        const pendingCount = fileQueue.filter(item => item.status === 'pending').length;
        const completedCount = fileQueue.filter(item => item.status === 'completed').length;
        const errorCount = fileQueue.filter(item => item.status === 'error').length;
        
        elements.pendingCount.textContent = pendingCount;
        elements.completedCount.textContent = completedCount;
        elements.errorCount.textContent = errorCount;
        
        // 渲染队列列表
        renderQueueList();
    }
    
    updateProcessingButtonState();
}

// 渲染队列列表
function renderQueueList() {
    elements.queueList.innerHTML = '';
    
    fileQueue.forEach(item => {
        const queueItemElement = createQueueItemElement(item);
        elements.queueList.appendChild(queueItemElement);
    });
}

// 创建队列项元素
function createQueueItemElement(item) {
    const div = document.createElement('div');
    div.className = `queue-item ${item.status}`;
    div.setAttribute('data-file-id', item.id);
    
    const statusText = {
        pending: '等待中',
        processing: '处理中',
        completed: '已完成',
        error: '出错'
    };
    
    div.innerHTML = `
        <div class="queue-item-info">
            <div class="queue-item-name" title="${item.filePath}">${item.fileName}</div>
            <div class="queue-item-status">
                <span class="status-badge ${item.status}">${statusText[item.status]}</span>
                <span class="queue-item-time">${new Date(item.addedAt).toLocaleTimeString()}</span>
                ${item.status === 'processing' ? `
                    <div class="queue-item-progress">
                        <div class="progress-bar" style="width: ${item.progress}%"></div>
                    </div>
                ` : ''}
            </div>
            ${item.error ? `<div class="queue-item-error">错误: ${item.error}</div>` : ''}
        </div>
        <div class="queue-item-actions">
            ${item.status === 'completed' && item.outputPath ? `
                <button class="btn btn-view" onclick="openFileOutput('${item.outputPath}')">查看结果</button>
            ` : ''}
            ${item.status !== 'processing' ? `
                <button class="btn btn-remove" onclick="removeFromQueue('${item.id}')">删除</button>
            ` : ''}
        </div>
    `;
    
    return div;
}

// 更新文件进度
function updateFileProgress(fileId, progress) {
    const queueItem = document.querySelector(`[data-file-id="${fileId}"]`);
    if (queueItem) {
        const progressBar = queueItem.querySelector('.progress-bar');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
    }
}

// 从队列中删除文件
async function removeFromQueue(fileId) {
    try {
        const result = await window.electronAPI.removeFromQueue(fileId);
        if (result.success) {
            appendLog('文件已从队列中删除', 'info');
        } else {
            appendLog(`删除失败: ${result.message}`, 'error');
        }
    } catch (error) {
        appendLog(`删除文件失败: ${error.message}`, 'error');
    }
}

// 清空队列
async function clearQueue() {
    if (isProcessing) {
        appendLog('正在处理中，无法清空队列', 'error');
        return;
    }
    
    try {
        const result = await window.electronAPI.clearQueue();
        if (result.success) {
            appendLog('队列已清空', 'info');
        } else {
            appendLog(`清空队列失败: ${result.message}`, 'error');
        }
    } catch (error) {
        appendLog(`清空队列失败: ${error.message}`, 'error');
    }
}

// 开始队列处理
async function startQueueProcessing() {
    if (isProcessing) return;
    
    const outputPath = elements.outputPath.value.trim();
    if (!outputPath) {
        appendLog('请先选择输出目录', 'error');
        return;
    }
    
    const pendingFiles = fileQueue.filter(item => item.status === 'pending');
    if (pendingFiles.length === 0) {
        appendLog('没有待处理的文件', 'error');
        return;
    }
    
    // 收集参数
    const options = {
        outputPath: outputPath,
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
    
    try {
        isProcessing = true;
        clearLog();
        appendLog(`开始批量处理 ${pendingFiles.length} 个文件...`, 'info');
        appendLog('-------------------', 'info');
        
        const result = await window.electronAPI.startQueueProcessing(options);
        if (result.success) {
            updateProcessingButtonsDisplay();
            updateProcessingStatus();
        } else {
            isProcessing = false;
            appendLog(`启动失败: ${result.message}`, 'error');
        }
    } catch (error) {
        isProcessing = false;
        appendLog(`启动批量处理失败: ${error.message}`, 'error');
    }
}

// 停止队列处理
async function stopQueueProcessing() {
    try {
        await window.electronAPI.stopQueueProcessing();
        appendLog('正在停止处理...', 'info');
    } catch (error) {
        appendLog(`停止处理失败: ${error.message}`, 'error');
    }
}

// 更新处理按钮状态
function updateProcessingButtonState() {
    const hasOutput = elements.outputPath.value.trim() !== '';
    const hasPendingFiles = fileQueue.filter(item => item.status === 'pending').length > 0;
    const statusConnected = elements.statusIndicator.querySelector('.status-dot').classList.contains('connected');
    
    elements.startProcessingBtn.disabled = !hasOutput || !hasPendingFiles || !statusConnected || isProcessing;
}

// 更新处理按钮显示
function updateProcessingButtonsDisplay() {
    if (isProcessing) {
        elements.startProcessingBtn.style.display = 'none';
        elements.stopProcessingBtn.style.display = 'inline-flex';
    } else {
        elements.startProcessingBtn.style.display = 'inline-flex';
        elements.stopProcessingBtn.style.display = 'none';
    }
}

// 更新处理状态
async function updateProcessingStatus() {
    try {
        const status = await window.electronAPI.getProcessingStatus();
        elements.currentProcessingFile.textContent = status.currentFile ? status.currentFile.fileName : '无';
    } catch (error) {
        console.error('获取处理状态失败:', error);
    }
}

// 打开文件输出目录
function openFileOutput(outputPath) {
    window.electronAPI.openOutputFolder(outputPath);
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
        installBtn.disabled = true;
        installBtn.textContent = '安装中...';
        
        appendLog('开始安装 Conda...', 'info');
        
        const result = await window.electronAPI.installConda();
        
        if (result.success) {
            appendLog('Conda 安装成功！正在重新检查 MinerU 状态...', 'success');
            installBtn.style.display = 'none';
            
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

// 安装 MinerU
async function installMinerU() {
    const installBtn = elements.installMinerUBtn;
    const originalText = installBtn.textContent;
    
    try {
        installBtn.disabled = true;
        installBtn.textContent = '安装中...';
        
        appendLog('开始安装 MinerU...', 'info');
        
        const result = await window.electronAPI.installMinerU();
        
        if (result.success) {
            appendLog('MinerU 安装成功！正在重新检查状态...', 'success');
            installBtn.style.display = 'none';
            
            setTimeout(async () => {
                await checkMinerUStatus();
            }, 2000);
        } else {
            appendLog(`MinerU 安装失败: ${result.error}`, 'error');
            installBtn.disabled = false;
            installBtn.textContent = originalText;
        }
    } catch (error) {
        appendLog(`MinerU 安装出错: ${error.message}`, 'error');
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

// 处理 MinerU 安装进度
function handleMinerUInstallProgress(data) {
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
        case 'stdout':
            appendLog(message, 'stdout');
            break;
        case 'stderr':
            appendLog(message, 'stderr');
            break;
        default:
            appendLog(message, 'info');
    }
}

// 添加日志
function appendLog(message, type = 'stdout') {
    const logLine = document.createElement('div');
    logLine.className = `log-line log-${type}`;
    
    const timestamp = new Date().toLocaleTimeString();
    logLine.textContent = `[${timestamp}] ${message}`;
    
    elements.logOutput.appendChild(logLine);
    elements.logOutput.scrollTop = elements.logOutput.scrollHeight;
}

// 应用启动时初始化
document.addEventListener('DOMContentLoaded', initializeApp);

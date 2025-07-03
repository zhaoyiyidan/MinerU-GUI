const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 文件选择
  selectInputPath: () => ipcRenderer.invoke('select-input-path'),
  selectOutputPath: () => ipcRenderer.invoke('select-output-path'),
  
  // 队列管理
  getFileQueue: () => ipcRenderer.invoke('get-file-queue'),
  removeFromQueue: (fileId) => ipcRenderer.invoke('remove-from-queue', fileId),
  clearQueue: () => ipcRenderer.invoke('clear-queue'),
  
  // 批量处理
  startQueueProcessing: (options) => ipcRenderer.invoke('start-queue-processing', options),
  stopQueueProcessing: () => ipcRenderer.invoke('stop-queue-processing'),
  getProcessingStatus: () => ipcRenderer.invoke('get-processing-status'),
  
  // MinerU 执行
  executeMinerU: (options) => ipcRenderer.invoke('execute-mineru', options),
  onMinerUOutput: (callback) => ipcRenderer.on('mineru-output', callback),
  
  // 队列事件监听
  onQueueUpdated: (callback) => ipcRenderer.on('queue-updated', callback),
  onFileProcessingStarted: (callback) => ipcRenderer.on('file-processing-started', callback),
  onFileProcessingCompleted: (callback) => ipcRenderer.on('file-processing-completed', callback),
  onFileProgressUpdated: (callback) => ipcRenderer.on('file-progress-updated', callback),
  onQueueProcessingFinished: (callback) => ipcRenderer.on('queue-processing-finished', callback),
  onProcessingStopped: (callback) => ipcRenderer.on('processing-stopped', callback),
  
  // 设置管理
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  
  // 工具函数
  openOutputFolder: (folderPath) => ipcRenderer.invoke('open-output-folder', folderPath),
  checkMinerUInstalled: () => ipcRenderer.invoke('check-mineru-installed'),
  
  // Conda 管理
  checkCondaExists: () => ipcRenderer.invoke('check-conda-exists'),
  installConda: () => ipcRenderer.invoke('install-conda'),
  onCondaInstallProgress: (callback) => ipcRenderer.on('conda-install-progress', callback),
  
  // MinerU 管理
  installMinerU: () => ipcRenderer.invoke('install-mineru'),
  onMinerUInstallProgress: (callback) => ipcRenderer.on('mineru-install-progress', callback)
});

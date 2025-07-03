const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 文件选择
  selectInputPath: () => ipcRenderer.invoke('select-input-path'),
  selectOutputPath: () => ipcRenderer.invoke('select-output-path'),
  
  // MinerU 执行
  executeMinerU: (options) => ipcRenderer.invoke('execute-mineru', options),
  onMinerUOutput: (callback) => ipcRenderer.on('mineru-output', callback),
  
  // 设置管理
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  
  // 工具函数
  openOutputFolder: (folderPath) => ipcRenderer.invoke('open-output-folder', folderPath),
  checkMinerUInstalled: () => ipcRenderer.invoke('check-mineru-installed')
});

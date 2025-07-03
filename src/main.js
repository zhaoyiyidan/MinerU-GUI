const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const Store = require('electron-store');
const fs = require('fs');
const os = require('os');

// 创建配置存储
const store = new Store();

// 添加队列管理状态
let fileQueue = [];
let isProcessing = false;
let currentProcessingFile = null;
let shouldStop = false;

// 辅助函数：获取conda的路径
function getCondaPath() {
  // 获取常见的conda安装路径
  const homeDir = os.homedir();
  const possibleCondaPaths = [
    '/opt/miniconda3/bin/conda',
    '/opt/anaconda3/bin/conda',
    '/usr/local/miniconda3/bin/conda',
    '/usr/local/anaconda3/bin/conda',
    `${homeDir}/miniconda3/bin/conda`,
    `${homeDir}/anaconda3/bin/conda`,
    `${homeDir}/miniforge3/bin/conda`,
    '/usr/bin/conda',
    '/usr/local/bin/conda'
  ];
  
  // 尝试从环境变量中获取conda路径
  if (process.env.CONDA_EXE) {
    return { path: process.env.CONDA_EXE, found: true };
  }
  
  // 尝试找到conda的实际路径
  for (const path of possibleCondaPaths) {
    if (fs.existsSync(path)) {
      return { path: path, found: true };
    }
  }
  
  // 如果都找不到，返回默认的conda命令但标记为未找到
  return { path: 'conda', found: false };
}

// 辅助函数：安装conda
async function installConda() {
  return new Promise((resolve, reject) => {
    const homeDir = os.homedir();
    const platform = process.platform;
    const arch = process.arch;
    
    let installerUrl, installerPath, installPath;
    
    // 根据平台和架构确定下载URL
    if (platform === 'darwin') {
      if (arch === 'arm64') {
        installerUrl = 'https://repo.anaconda.com/miniconda/Miniconda3-latest-MacOSX-arm64.sh';
        installerPath = `${homeDir}/Miniconda3-latest-MacOSX-arm64.sh`;
      } else {
        installerUrl = 'https://repo.anaconda.com/miniconda/Miniconda3-latest-MacOSX-x86_64.sh';
        installerPath = `${homeDir}/Miniconda3-latest-MacOSX-x86_64.sh`;
      }
      installPath = `${homeDir}/miniconda3`;
    } else if (platform === 'linux') {
      if (arch === 'arm64' || arch === 'aarch64') {
        installerUrl = 'https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-aarch64.sh';
        installerPath = `${homeDir}/Miniconda3-latest-Linux-aarch64.sh`;
      } else {
        installerUrl = 'https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh';
        installerPath = `${homeDir}/Miniconda3-latest-Linux-x86_64.sh`;
      }
      installPath = `${homeDir}/miniconda3`;
    } else if (platform === 'win32') {
      // Windows 需要不同的处理方式
      reject(new Error('Windows平台的Conda安装暂未支持，请手动安装Miniconda'));
      return;
    } else {
      reject(new Error(`不支持的平台: ${platform}`));
      return;
    }
    
    console.log('Starting conda installation...', { platform, arch, installerUrl });
    
    // 检查是否已经下载了安装器
    if (fs.existsSync(installerPath)) {
      console.log('Installer already exists, proceeding with installation...');
      executeInstaller();
    } else {
      console.log('Downloading conda installer...');
      downloadInstaller();
    }
    
    function downloadInstaller() {
      // 下载miniconda安装器
      const downloadCommand = `curl -o "${installerPath}" "${installerUrl}"`;
      
      const downloadChild = spawn('sh', ['-c', downloadCommand], {
        stdio: 'pipe',
        shell: true
      });
      
      let downloadProgress = '';
      
      downloadChild.stderr.on('data', (data) => {
        downloadProgress += data.toString();
        console.log('Download progress:', data.toString());
      });
      
      downloadChild.on('close', (code) => {
        if (code === 0) {
          console.log('Download completed, starting installation...');
          executeInstaller();
        } else {
          reject(new Error(`Failed to download conda installer, exit code: ${code}`));
        }
      });
      
      downloadChild.on('error', (error) => {
        reject(new Error(`Download error: ${error.message}`));
      });
    }
    
    function executeInstaller() {
      // 执行安装
      const installCommand = `bash "${installerPath}" -b -p "${installPath}"`;
      
      const installChild = spawn('sh', ['-c', installCommand], {
        stdio: 'pipe',
        shell: true
      });
      
      let installOutput = '';
      
      installChild.stdout.on('data', (data) => {
        installOutput += data.toString();
        console.log('Install output:', data.toString());
      });
      
      installChild.stderr.on('data', (data) => {
        installOutput += data.toString();
        console.log('Install stderr:', data.toString());
      });
      
      installChild.on('close', (code) => {
        if (code === 0) {
          console.log('Conda installation completed successfully');
          // 清理安装器文件
          try {
            fs.unlinkSync(installerPath);
          } catch (e) {
            console.log('Warning: Could not delete installer file');
          }
          resolve({
            success: true,
            condaPath: `${installPath}/bin/conda`,
            message: 'Conda installed successfully'
          });
        } else {
          reject(new Error(`Installation failed with exit code: ${code}. Output: ${installOutput}`));
        }
      });
      
      installChild.on('error', (error) => {
        reject(new Error(`Installation error: ${error.message}`));
      });
    }
  });
}

// 辅助函数：获取扩展的环境变量
function getExtendedEnv() {
  const homeDir = os.homedir();
  return { 
    ...process.env,
    PATH: process.env.PATH + ':/opt/miniconda3/bin:/opt/anaconda3/bin:/usr/local/miniconda3/bin:/usr/local/anaconda3/bin:' + homeDir + '/miniconda3/bin:' + homeDir + '/anaconda3/bin:' + homeDir + '/miniforge3/bin'
  };
}

let mainWindow;

function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    titleBarStyle: 'default',
    show: false
  });

  // 加载应用的 index.html
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // 当窗口准备好时显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 在开发模式下打开开发者工具
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

// 当 Electron 完成初始化并准备创建浏览器窗口时调用此方法
app.whenReady().then(createWindow);

// 当所有窗口都关闭时退出应用
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC 处理程序

// 选择输入文件/文件夹 - 修改为添加到队列
ipcMain.handle('select-input-path', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'PDF Files', extensions: ['pdf'] },
      { name: 'Image Files', extensions: ['png', 'jpg', 'jpeg'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (!result.canceled) {
    // 为每个文件创建队列项
    const newItems = result.filePaths.map(filePath => ({
      id: Date.now() + Math.random(),
      filePath,
      fileName: path.basename(filePath),
      status: 'pending', // pending, processing, completed, error
      progress: 0,
      output: '',
      error: null,
      addedAt: new Date().toISOString()
    }));
    
    fileQueue.push(...newItems);
    
    // 通知渲染进程队列已更新
    mainWindow.webContents.send('queue-updated', fileQueue);
    
    return newItems;
  }
  return null;
});

// 选择输出目录
ipcMain.handle('select-output-path', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });

  if (!result.canceled) {
    return result.filePaths[0];
  }
  return null;
});

// 获取文件队列
ipcMain.handle('get-file-queue', async () => {
  return fileQueue;
});

// 从队列中删除文件
ipcMain.handle('remove-from-queue', async (event, fileId) => {
  const index = fileQueue.findIndex(item => item.id === fileId);
  if (index !== -1) {
    // 如果正在处理这个文件，不允许删除
    if (fileQueue[index].status === 'processing') {
      return { success: false, message: '正在处理的文件无法删除' };
    }
    
    fileQueue.splice(index, 1);
    mainWindow.webContents.send('queue-updated', fileQueue);
    return { success: true };
  }
  return { success: false, message: '文件不存在' };
});

// 清空队列
ipcMain.handle('clear-queue', async () => {
  if (isProcessing) {
    return { success: false, message: '正在处理中，无法清空队列' };
  }
  
  fileQueue = [];
  mainWindow.webContents.send('queue-updated', fileQueue);
  return { success: true };
});

// 开始批量处理队列
ipcMain.handle('start-queue-processing', async (event, options) => {
  if (isProcessing) {
    return { success: false, message: '已在处理中' };
  }
  
  const pendingFiles = fileQueue.filter(item => item.status === 'pending');
  if (pendingFiles.length === 0) {
    return { success: false, message: '没有待处理的文件' };
  }
  
  isProcessing = true;
  shouldStop = false;
  
  // 开始处理队列
  processQueue(options);
  
  return { success: true, message: `开始处理 ${pendingFiles.length} 个文件` };
});

// 停止队列处理
ipcMain.handle('stop-queue-processing', async () => {
  shouldStop = true;
  if (currentProcessingFile) {
    // 这里可以添加取消当前处理的逻辑
    const fileIndex = fileQueue.findIndex(item => item.id === currentProcessingFile.id);
    if (fileIndex !== -1) {
      fileQueue[fileIndex].status = 'pending';
      fileQueue[fileIndex].progress = 0;
    }
  }
  isProcessing = false;
  currentProcessingFile = null;
  
  mainWindow.webContents.send('queue-updated', fileQueue);
  mainWindow.webContents.send('processing-stopped');
  
  return { success: true };
});

// 获取处理状态
ipcMain.handle('get-processing-status', async () => {
  return {
    isProcessing,
    currentFile: currentProcessingFile,
    queueLength: fileQueue.length,
    pendingCount: fileQueue.filter(item => item.status === 'pending').length,
    completedCount: fileQueue.filter(item => item.status === 'completed').length,
    errorCount: fileQueue.filter(item => item.status === 'error').length
  };
});

// 队列处理函数
async function processQueue(options) {
  while (!shouldStop && isProcessing) {
    const nextFile = fileQueue.find(item => item.status === 'pending');
    
    if (!nextFile) {
      // 没有更多待处理文件
      break;
    }
    
    currentProcessingFile = nextFile;
    nextFile.status = 'processing';
    nextFile.progress = 0;
    
    mainWindow.webContents.send('queue-updated', fileQueue);
    mainWindow.webContents.send('file-processing-started', nextFile);
    
    try {
      // 为每个文件创建单独的输出目录
      const outputDir = options.outputPath;
      const fileOutputDir = path.join(outputDir, path.parse(nextFile.fileName).name);
      
      // 确保输出目录存在
      if (!fs.existsSync(fileOutputDir)) {
        fs.mkdirSync(fileOutputDir, { recursive: true });
      }
      
      const fileOptions = {
        ...options,
        inputPath: nextFile.filePath,
        outputPath: fileOutputDir
      };
      
      const result = await processSingleFile(fileOptions, nextFile);
      
      if (result.success) {
        nextFile.status = 'completed';
        nextFile.progress = 100;
        nextFile.output = result.stdout;
        nextFile.outputPath = fileOutputDir;
      } else {
        nextFile.status = 'error';
        nextFile.error = result.error || result.stderr;
      }
      
    } catch (error) {
      nextFile.status = 'error';
      nextFile.error = error.message;
    }
    
    mainWindow.webContents.send('queue-updated', fileQueue);
    mainWindow.webContents.send('file-processing-completed', nextFile);
    
    currentProcessingFile = null;
    
    // 短暂延迟，避免过快处理
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  isProcessing = false;
  currentProcessingFile = null;
  mainWindow.webContents.send('queue-processing-finished');
}

// 处理单个文件的函数
function processSingleFile(options, fileItem) {
  return new Promise((resolve, reject) => {
    const { inputPath, outputPath, method, backend, lang, url, start, end, formula, table, device, vram, source } = options;
    
    // 构建命令参数
    const args = [
      '-p', inputPath,
      '-o', outputPath
    ];
    
    if (method && method !== 'auto') {
      args.push('-m', method);
    }

    if (backend && backend !== 'pipeline') {
      args.push('-b', backend);
    }

    if (lang && lang !== 'ch') {
      args.push('-l', lang);
    }

    if (url) {
      args.push('-u', url);
    }

    if (start !== undefined && start !== '') {
      args.push('-s', start.toString());
    }

    if (end !== undefined && end !== '') {
      args.push('-e', end.toString());
    }

    if (formula !== undefined) {
      args.push('-f', formula.toString());
    }

    if (table !== undefined) {
      args.push('-t', table.toString());
    }

    if (device) {
      args.push('-d', device);
    }

    if (vram !== undefined && vram !== '') {
      args.push('--vram', vram.toString());
    }

    if (source && source !== 'huggingface') {
      args.push('--source', source);
    }

    const condaInfo = getCondaPath();
    const env = getExtendedEnv();
    
    const finalArgs = [
      'run',
      '-n',
      'MinerU',
      'mineru',
      ...args
    ];
    
    console.log('Processing file:', fileItem.fileName, 'with command:', condaInfo.path, finalArgs.join(' '));
    
    const child = spawn(condaInfo.path, finalArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: env,
      shell: false
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      
      // 更新文件处理进度（可以根据输出内容估算进度）
      updateFileProgress(fileItem, output);
      
      // 发送实时输出，包含文件信息
      mainWindow.webContents.send('mineru-output', { 
        type: 'stdout', 
        data: output,
        fileId: fileItem.id,
        fileName: fileItem.fileName
      });
    });

    child.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      
      // 发送实时错误输出
      mainWindow.webContents.send('mineru-output', { 
        type: 'stderr', 
        data: output,
        fileId: fileItem.id,
        fileName: fileItem.fileName
      });
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({
          success: true,
          stdout,
          stderr,
          code
        });
      } else {
        reject({
          success: false,
          stdout,
          stderr,
          code,
          error: `Process exited with code ${code}`
        });
      }
    });

    child.on('error', (error) => {
      reject({
        success: false,
        error: error.message,
        stdout,
        stderr
      });
    });
  });
}

// 更新文件处理进度
function updateFileProgress(fileItem, output) {
  // 简单的进度估算逻辑，可以根据实际输出内容优化
  if (output.includes('Processing')) {
    fileItem.progress = Math.min(fileItem.progress + 10, 90);
  } else if (output.includes('Completed') || output.includes('Done')) {
    fileItem.progress = 100;
  }
  
  // 通知渲染进程更新进度
  mainWindow.webContents.send('file-progress-updated', {
    fileId: fileItem.id,
    progress: fileItem.progress
  });
}

// 修改原有的执行函数，保持向后兼容
ipcMain.handle('execute-mineru', async (event, options) => {
  // 如果队列为空或只有一个文件，使用原有逻辑
  if (fileQueue.length <= 1) {
    return processSingleFile(options, { id: 'single', fileName: 'single-file' });
  } else {
    // 否则提示使用队列处理
    return {
      success: false,
      error: '请使用队列处理功能来处理多个文件'
    };
  }
});

// 保存设置
ipcMain.handle('save-settings', async (event, settings) => {
  store.set('settings', settings);
  return true;
});

// 加载设置
ipcMain.handle('load-settings', async () => {
  return store.get('settings', {
    method: 'auto',
    backend: 'pipeline',
    lang: 'ch',
    formula: true,
    table: true,
    source: 'huggingface'
  });
});

// 打开输出文件夹
ipcMain.handle('open-output-folder', async (event, folderPath) => {
  shell.showItemInFolder(folderPath);
});

// 检查 MinerU 是否安装
ipcMain.handle('check-mineru-installed', async () => {
  return new Promise(async (resolve) => {
    const condaInfo = getCondaPath();
    const env = getExtendedEnv();
    
    console.log('Using conda path:', condaInfo.path, 'Found:', condaInfo.found);
    
    // 如果没有找到conda，提示用户安装
    if (!condaInfo.found) {
      resolve({ 
        installed: false, 
        condaFound: false, 
        needsCondaInstall: true,
        message: 'Conda not found. Please install conda first.' 
      });
      return;
    }
    
    // 使用 'conda run' 在指定环境中执行命令
    const child = spawn(condaInfo.path, ['run', '-n', 'MinerU', 'mineru', '--version'], {
      stdio: 'pipe',
      shell: true,
      env: env
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      console.log('check-mineru-installed result:', { code, stdout, stderr });
      resolve({ 
        installed: code === 0, 
        condaFound: true, 
        needsCondaInstall: false,
        stdout, 
        stderr 
      });
    });

    child.on('error', (error) => {
      console.log('check-mineru-installed error:', error.message);
      resolve({ 
        installed: false, 
        condaFound: true, 
        needsCondaInstall: false,
        error: error.message 
      });
    });
  });
});

// 安装 Conda
ipcMain.handle('install-conda', async (event) => {
  try {
    console.log('Starting conda installation process...');
    event.sender.send('conda-install-progress', { 
      type: 'info', 
      message: 'Starting conda installation...' 
    });
    
    const result = await installConda();
    
    event.sender.send('conda-install-progress', { 
      type: 'success', 
      message: 'Conda installation completed successfully!' 
    });
    
    return result;
  } catch (error) {
    console.error('Conda installation failed:', error);
    
    event.sender.send('conda-install-progress', { 
      type: 'error', 
      message: `Installation failed: ${error.message}` 
    });
    
    return {
      success: false,
      error: error.message
    };
  }
});

// 检查 Conda 是否存在（不检查 MinerU）
ipcMain.handle('check-conda-exists', async () => {
  const condaInfo = getCondaPath();
  return {
    found: condaInfo.found,
    path: condaInfo.path
  };
});

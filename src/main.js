const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const Store = require('electron-store');
const fs = require('fs');
const os = require('os');

// 创建配置存储
const store = new Store();

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

// 选择输入文件/文件夹
ipcMain.handle('select-input-path', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'openDirectory', 'multiSelections'],
    filters: [
      { name: 'PDF Files', extensions: ['pdf'] },
      { name: 'Image Files', extensions: ['png', 'jpg', 'jpeg'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (!result.canceled) {
    return result.filePaths;
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

// 执行 MinerU 命令
ipcMain.handle('execute-mineru', async (event, options) => {
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
    

    // 步骤 2: 构建最终要传递给 spawn 的命令和参数
    const condaInfo = getCondaPath();
    const env = getExtendedEnv();
    
    // 我们要传递给 'conda' 的参数是 'run -n <环境名> <要执行的命令> ...<命令的参数>'
    const finalArgs = [
      'run',
      '-n',
      'MinerU', // 你的 Conda 环境名称
      'mineru', // 要在环境中执行的命令
      ...args // 使用展开语法 (...) 将所有 mineru 的参数附加在后面
    ];
    console.log('Executing command:', condaInfo.path, finalArgs.join(' '));
    // 步骤 3: 使用 spawn 执行命令
    const child = spawn(condaInfo.path, finalArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: env,
      shell: true
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      // 实时发送输出到渲染进程
      event.sender.send('mineru-output', { type: 'stdout', data: output });
    });

    child.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      // 实时发送错误输出到渲染进程
      event.sender.send('mineru-output', { type: 'stderr', data: output });
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

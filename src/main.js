const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const Store = require('electron-store');

// 创建配置存储
const store = new Store();

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
    /*
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
    */
   
    // 步骤 2: 构建最终要传递给 spawn 的命令和参数
    // 我们要执行的命令是 'conda'
    const command = 'conda';
    // 我们要传递给 'conda' 的参数是 'run -n <环境名> <要执行的命令> ...<命令的参数>'
    const finalArgs = [
      'run',
      '-n',
      'MinerU', // 你的 Conda 环境名称
      'mineru', // 要在环境中执行的命令
      ...args // 使用展开语法 (...) 将所有 mineru 的参数附加在后面
    ];
    console.log('Executing command:', command, finalArgs.join(' '));
    // 步骤 3: 使用 spawn 执行命令
    const child = spawn(command, finalArgs, {
      stdio: ['pipe', 'pipe', 'pipe']
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
  return new Promise((resolve) => {
    // 使用 'conda run' 在指定环境中执行命令
    // 命令: conda
    // 参数: ['run', '-n', 'MinerU', 'mineru', '--version']
    // 这相当于在终端执行 `conda run -n MinerU mineru --version`
    const child = spawn('conda', ['run', '-n', 'MinerU', 'mineru', '--version'], {
      stdio: 'pipe',
      // 在某些系统上，特别是Windows，可能需要shell:true
      // 但最好先在没有它的情况下尝试
      // shell: true 
    });
    
    child.on('close', (code) => {
      resolve(code === 0);
    });

    child.on('error', () => {
      resolve(false);
    });
  });
});

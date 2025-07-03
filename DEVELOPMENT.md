# MinerU Desktop 开发指南

## 项目结构

```
app/
├── src/                    # 源代码目录
│   ├── main.js            # Electron 主进程
│   ├── preload.js         # 预加载脚本
│   ├── index.html         # 主界面 HTML
│   ├── styles.css         # 样式文件
│   └── renderer.js        # 渲染进程脚本
├── assets/                # 资源文件
│   ├── icon.png          # 应用图标
│   ├── icon.svg          # SVG 图标源文件
│   └── ICON_README.md    # 图标说明文档
├── package.json          # 项目配置
├── build.sh             # 构建脚本
├── README.md            # 项目说明
└── DEVELOPMENT.md       # 开发指南
```

## 开发环境设置

### 系统要求
- Node.js 16+ 
- npm 或 yarn
- 已安装 MinerU (`pip install mineru`)

### 安装依赖
```bash
npm install
```

### 开发模式运行
```bash
npm run dev
```

### 生产模式运行
```bash
npm start
```

## 应用架构

### 主进程 (main.js)
- 创建和管理窗口
- 处理 IPC 通信
- 执行 MinerU 命令
- 管理文件对话框
- 配置存储

### 渲染进程 (renderer.js)
- 用户界面逻辑
- 表单处理
- 日志显示
- 与主进程通信

### 预加载脚本 (preload.js)
- 安全的 API 暴露
- 主进程和渲染进程的桥梁

## 主要功能模块

### 1. 文件选择
- 支持单文件和多文件选择
- 文件类型过滤 (PDF, PNG, JPG)
- 目录选择

### 2. 参数配置
- MinerU 所有命令行参数的可视化配置
- 设置保存和加载
- 参数验证

### 3. 命令执行
- 异步执行 MinerU 命令
- 实时输出显示
- 错误处理和状态管理

### 4. 用户界面
- 响应式设计
- 现代化界面
- 深色主题支持

## 开发调试

### 启用开发者工具
```bash
npm run dev
```
或在主进程中设置：
```javascript
if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
}
```

### 日志调试
在渲染进程中使用 `console.log`，在主进程中使用 `console.log` 或 Node.js 调试工具。

### 错误处理
- 主进程错误：检查终端输出
- 渲染进程错误：检查开发者工具控制台
- IPC 通信错误：检查两端的错误处理

## 构建和打包

### 单平台构建
```bash
# macOS
npm run build-mac

# Windows  
npm run build-win

# Linux
npm run build-linux
```

### 多平台构建
```bash
npm run build
```

### 使用构建脚本
```bash
./build.sh
```

## 配置文件说明

### package.json 构建配置
- `build.appId`: 应用 ID
- `build.productName`: 产品名称
- `build.directories.output`: 输出目录
- `build.files`: 打包的文件
- `build.mac/win/linux`: 平台特定配置

### Electron Builder 配置
详细配置请参考 [electron-builder 文档](https://www.electron.build/)

## 常见问题

### 1. MinerU 未找到
确保系统 PATH 中包含 MinerU 可执行文件路径，或者系统已正确安装 MinerU。

### 2. 图标不显示
确保 `assets/` 目录下有相应的图标文件：
- macOS: `icon.icns`
- Windows: `icon.ico` 
- Linux: `icon.png`

### 3. 构建失败
- 检查 Node.js 版本
- 清理 `node_modules` 重新安装
- 检查网络连接

### 4. 权限问题
在 macOS 上可能需要在"系统偏好设置"中允许应用运行。

## 扩展开发

### 添加新参数
1. 在 `index.html` 中添加 UI 控件
2. 在 `renderer.js` 中添加事件处理
3. 在 `main.js` 中添加参数处理逻辑

### 添加新功能
1. 在主进程中添加 IPC 处理器
2. 在预加载脚本中暴露 API
3. 在渲染进程中调用 API

### 样式定制
修改 `styles.css` 文件，使用 CSS 变量便于主题切换。

## 发布流程

1. 测试应用功能
2. 更新版本号 (`package.json`)
3. 构建所有平台的安装包
4. 测试安装包
5. 发布到相应平台

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 发起 Pull Request

## 技术栈

- **Electron**: 跨平台桌面应用框架
- **Node.js**: JavaScript 运行时
- **HTML/CSS/JavaScript**: 前端技术
- **electron-builder**: 应用打包工具
- **electron-store**: 配置存储

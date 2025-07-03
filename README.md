# MinerU Desktop

一个基于 Electron 的桌面应用程序，为 MinerU PDF 解析工具提供可视化界面。

## 功能特性

- 🎯 可视化文件选择界面
- ⚙️ 完整的参数配置选项
- 📝 实时执行日志显示
- 💾 设置保存和加载
- 📂 一键打开输出文件夹
- 🎨 现代化的用户界面
- 📱 响应式设计

## 系统要求

- Node.js 16 或更高版本
- 已安装 MinerU 命令行工具

## 安装

1. 克隆或下载项目文件
2. 安装依赖：
   ```bash
   npm install
   ```

## 开发

启动开发模式：
```bash
npm run dev
```

## 构建

构建应用程序：

### macOS
```bash
npm run build-mac
```

### Windows
```bash
npm run build-win
```

### Linux
```bash
npm run build-linux
```

### 全平台
```bash
npm run build
```

构建完成后，安装包将在 `dist` 目录中生成。

## 使用说明

1. **文件选择**：点击"浏览"按钮选择要解析的 PDF 或图像文件
2. **输出目录**：选择解析结果的输出目录
3. **参数配置**：根据需要调整解析参数
4. **执行解析**：点击"开始解析"按钮开始处理
5. **查看结果**：解析完成后可以一键打开输出文件夹

## 支持的文件格式

- PDF (.pdf)
- 图像文件 (.png, .jpg, .jpeg)

## 参数说明

### 解析方法
- **自动检测**：根据文件类型自动选择解析方法
- **文本提取**：使用文本提取方法
- **OCR 识别**：使用 OCR 方法处理基于图像的 PDF

### 后端选项
- **Pipeline**：通用后端，兼容性最好
- **VLM Transformers**：基于 Transformers 的视觉语言模型
- **VLM SGLang Engine**：SGLang 引擎模式（更快）
- **VLM SGLang Client**：SGLang 客户端模式（更快）

### 语言选项
支持中文、英文、韩文、日文等多种语言的 OCR 识别。

### 高级选项
- **页面范围**：指定解析的起始和结束页面
- **公式解析**：启用数学公式识别
- **表格解析**：启用表格结构识别
- **设备配置**：选择 CPU、GPU 等计算设备
- **显存限制**：设置 GPU 显存使用上限

## 故障排除

### MinerU 未安装
如果应用显示"MinerU 未安装"，请先安装 MinerU：
```bash
pip install mineru
```

### 权限问题
在 macOS 上，首次运行时可能需要在"系统偏好设置 > 安全性与隐私"中允许应用运行。

### 依赖问题
如果遇到依赖问题，尝试重新安装：
```bash
rm -rf node_modules
npm install
```

## 开发者信息

基于 Electron 框架开发，使用现代 Web 技术构建跨平台桌面应用。

## 许可证

MIT License

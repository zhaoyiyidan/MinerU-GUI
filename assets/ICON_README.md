# 图标文件说明

## 所需图标文件

为了完整的应用打包，您需要准备以下格式的图标文件：

### macOS (.icns)
- `assets/icon.icns` - macOS 应用图标文件

### Windows (.ico)
- `assets/icon.ico` - Windows 应用图标文件

### Linux (.png)
- `assets/icon.png` - Linux 应用图标文件（建议 512x512 像素）

## 生成图标文件

您可以使用提供的 `icon.svg` 文件生成各种格式的图标：

### 使用在线工具
1. 访问 https://cloudconvert.com/ 或类似的在线转换工具
2. 上传 `icon.svg` 文件
3. 转换为所需格式（icns, ico, png）

### 使用命令行工具

#### 安装 imagemagick (macOS)
```bash
brew install imagemagick
```

#### 生成 PNG 图标
```bash
convert assets/icon.svg -resize 512x512 assets/icon.png
```

#### 生成 ICO 图标 (Windows)
```bash
convert assets/icon.svg -resize 256x256 assets/icon.ico
```

#### 生成 ICNS 图标 (macOS)
需要使用 macOS 的 iconutil 工具：
```bash
# 创建 iconset 目录
mkdir icon.iconset

# 生成不同尺寸的图标
convert assets/icon.svg -resize 16x16 icon.iconset/icon_16x16.png
convert assets/icon.svg -resize 32x32 icon.iconset/icon_16x16@2x.png
convert assets/icon.svg -resize 32x32 icon.iconset/icon_32x32.png
convert assets/icon.svg -resize 64x64 icon.iconset/icon_32x32@2x.png
convert assets/icon.svg -resize 128x128 icon.iconset/icon_128x128.png
convert assets/icon.svg -resize 256x256 icon.iconset/icon_128x128@2x.png
convert assets/icon.svg -resize 256x256 icon.iconset/icon_256x256.png
convert assets/icon.svg -resize 512x512 icon.iconset/icon_256x256@2x.png
convert assets/icon.svg -resize 512x512 icon.iconset/icon_512x512.png
convert assets/icon.svg -resize 1024x1024 icon.iconset/icon_512x512@2x.png

# 生成 icns 文件
iconutil -c icns icon.iconset -o assets/icon.icns

# 清理临时文件
rm -rf icon.iconset
```

## 注意事项

- 如果没有提供相应的图标文件，electron-builder 会使用默认图标
- 图标文件应该放在 `assets/` 目录下
- 建议图标设计简洁明了，在小尺寸下也能清晰识别

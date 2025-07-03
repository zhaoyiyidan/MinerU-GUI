#!/bin/bash

# MinerU Desktop 应用构建脚本

echo "🚀 开始构建 MinerU Desktop 应用..."

# 检查依赖是否安装
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi

# 清理之前的构建
echo "🧹 清理之前的构建..."
rm -rf dist/

# 检查操作系统并构建相应的包
OS="$(uname -s)"
case "${OS}" in
    Linux*)     
        echo "🐧 检测到 Linux 系统，构建 AppImage..."
        npm run build-linux
        ;;
    Darwin*)    
        echo "🍎 检测到 macOS 系统，构建 DMG..."
        npm run build-mac
        ;;
    CYGWIN*|MINGW32*|MSYS*|MINGW*)
        echo "🪟 检测到 Windows 系统，构建 NSIS 安装包..."
        npm run build-win
        ;;
    *)          
        echo "❓ 未知操作系统，构建所有平台..."
        npm run build
        ;;
esac

echo "✅ 构建完成！"
echo "📁 安装包位置: dist/"

# 列出生成的文件
if [ -d "dist" ]; then
    echo ""
    echo "📋 生成的文件:"
    ls -la dist/
fi

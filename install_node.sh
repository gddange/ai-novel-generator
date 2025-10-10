#!/bin/bash

echo "🚀 Node.js 安装脚本"
echo "===================="

# 检查系统架构
ARCH=$(uname -m)
echo "系统架构: $ARCH"

# 检查是否已安装Node.js
if command -v node &> /dev/null; then
    echo "✅ Node.js 已安装，版本: $(node --version)"
    exit 0
fi

echo "📦 开始安装 Node.js..."

# 方法1: 尝试使用已有的包管理器
if command -v brew &> /dev/null; then
    echo "🍺 使用 Homebrew 安装..."
    brew install node
elif command -v port &> /dev/null; then
    echo "🚢 使用 MacPorts 安装..."
    sudo port install nodejs18
else
    # 方法2: 直接下载安装包
    echo "📥 直接下载 Node.js 安装包..."
    
    if [ "$ARCH" = "arm64" ]; then
        NODE_URL="https://nodejs.org/dist/v20.10.0/node-v20.10.0-darwin-arm64.tar.gz"
        NODE_FILE="node-v20.10.0-darwin-arm64.tar.gz"
        NODE_DIR="node-v20.10.0-darwin-arm64"
    else
        NODE_URL="https://nodejs.org/dist/v20.10.0/node-v20.10.0-darwin-x64.tar.gz"
        NODE_FILE="node-v20.10.0-darwin-x64.tar.gz"
        NODE_DIR="node-v20.10.0-darwin-x64"
    fi
    
    # 创建临时目录
    TEMP_DIR="/tmp/nodejs_install"
    mkdir -p "$TEMP_DIR"
    cd "$TEMP_DIR"
    
    # 下载Node.js
    echo "下载中: $NODE_URL"
    if curl -L -o "$NODE_FILE" "$NODE_URL"; then
        echo "✅ 下载完成"
        
        # 解压
        echo "📂 解压文件..."
        tar -xzf "$NODE_FILE"
        
        # 安装到系统目录
        echo "📦 安装到 /usr/local..."
        sudo cp -R "$NODE_DIR"/* /usr/local/
        
        # 清理临时文件
        cd /
        rm -rf "$TEMP_DIR"
        
        echo "✅ Node.js 安装完成!"
    else
        echo "❌ 下载失败，请检查网络连接"
        
        # 方法3: 使用NVM安装
        echo "🔄 尝试使用 NVM 安装..."
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
        
        # 重新加载shell配置
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        
        # 安装最新LTS版本
        nvm install --lts
        nvm use --lts
    fi
fi

# 验证安装
echo ""
echo "🔍 验证安装..."
if command -v node &> /dev/null; then
    echo "✅ Node.js 版本: $(node --version)"
    echo "✅ npm 版本: $(npm --version)"
    echo ""
    echo "🎉 安装成功! 现在可以运行项目了。"
else
    echo "❌ 安装失败"
    echo ""
    echo "📋 手动安装建议:"
    echo "1. 访问 https://nodejs.org/"
    echo "2. 下载适合你系统的安装包"
    echo "3. 运行安装程序"
    echo "4. 重新打开终端"
    exit 1
fi
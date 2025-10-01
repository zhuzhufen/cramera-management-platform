#!/bin/bash

# 相机租赁管理平台 Docker 启动脚本

echo "🚀 启动相机租赁管理平台..."

# 检查是否已安装 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    exit 1
fi

# 检查是否已安装 Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose 未安装，请先安装 Docker Compose"
    exit 1
fi

# 检查是否存在 .env 文件，如果不存在则复制示例文件
if [ ! -f .env ]; then
    echo "📝 创建环境配置文件..."
    cp .env.example .env
    echo "✅ 已创建 .env 文件，请根据需要修改数据库配置"
fi

# 构建并启动服务
echo "🔨 构建和启动 Docker 容器..."
docker-compose up -d

# 等待数据库启动
echo "⏳ 等待数据库启动..."
sleep 10

# 检查服务状态
echo "🔍 检查服务状态..."
docker-compose ps

echo ""
echo "✅ 相机租赁管理平台已启动！"
echo ""
echo "📱 访问地址: http://localhost:3000/cam"
echo ""
echo "📊 默认数据:"
echo "   - 5台相机（Canon、Sony、Nikon等品牌）"
echo "   - 3位客户信息"
echo "   - 3条租赁记录"
echo ""
echo "🔧 管理命令:"
echo "   - 查看日志: docker-compose logs -f"
echo "   - 停止服务: docker-compose down"
echo "   - 重启服务: docker-compose restart"
echo ""
echo "💡 自定义配置:"
echo "   修改 .env 文件中的数据库配置后，运行: docker-compose up -d"

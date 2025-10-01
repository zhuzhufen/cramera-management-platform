# 相机租赁管理平台

一个专为独立开发者设计的移动端相机租赁管理平台，通过相机编码进行管理，支持租赁状态查询和租赁日历显示。

## 功能特性

- 📱 **移动端优化** - 响应式设计，完美适配手机和平板
- 📷 **相机管理** - 通过相机编码进行相机信息管理
- 🔍 **智能搜索** - 根据相机编码快速搜索相机
- 📅 **租赁日历** - 可视化显示相机的租赁时间安排
- 📊 **状态管理** - 实时更新相机租赁状态（可租赁、已租赁、维护中、已预订）
- 👥 **客户管理** - 客户信息记录和管理
- 💰 **自动计费** - 根据租赁天数自动计算租赁费用
- 🐳 **Docker支持** - 支持容器化部署，自定义数据库配置

## 技术栈

- **前端**: HTML5, CSS3, JavaScript (原生)
- **后端**: Node.js + Express
- **数据库**: PostgreSQL
- **样式**: 移动端优先的响应式设计
- **部署**: Docker + Docker Compose

## 快速开始

### 方式一：Docker部署（推荐）

#### 环境要求
- Docker
- Docker Compose

#### 一键启动
```bash
# 使用启动脚本（推荐）
chmod +x start-docker.sh
./start-docker.sh

# 或手动启动
docker-compose up -d
```

#### 自定义配置
1. 复制环境配置文件：
   ```bash
   cp .env.example .env
   ```

2. 修改 `.env` 文件中的数据库配置：
   ```env
   # 数据库配置
   DB_HOST=127.0.0.1
   DB_PORT=5432
   DB_NAME=camera_rental_management
   DB_USER=postgres
   DB_PASSWORD=your_password
   ```

3. 重新启动服务：
   ```bash
   docker-compose up -d
   ```

#### 访问应用
打开浏览器访问: http://localhost:3000/cam

### 方式二：传统部署

#### 环境要求
- Node.js 14+
- PostgreSQL 12+

#### 安装步骤

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd data_platform
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **设置数据库**
   ```bash
   npm run setup-db
   ```

4. **启动应用**
   ```bash
   npm start
   ```

5. **访问应用**
   打开浏览器访问: http://localhost:3000/cam

### 一键启动（传统部署）
```bash
npm run setup
```

## 默认数据

系统包含完整的示例数据：
- 5台相机（Canon、Sony、Nikon等品牌）
- 3位客户信息
- 3条租赁记录

## Docker管理命令

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 查看日志
docker-compose logs -f

# 重启服务
docker-compose restart

# 查看服务状态
docker-compose ps

# 重新构建镜像
docker-compose build
```

## 项目结构

```
camera-rental-platform/
├── Dockerfile             # Docker镜像构建文件
├── docker-compose.yml     # Docker Compose配置
├── .env.example           # 环境变量示例
├── start-docker.sh        # Docker启动脚本
├── package.json           # 项目依赖配置
├── server.js              # 后端服务器
├── database/
│   └── init.sql           # 数据库初始化脚本
├── public/
│   ├── index.html         # 主页面
│   ├── styles.css         # 样式文件
│   ├── app.js             # 前端JavaScript
│   └── config.js          # 全局配置
└── README.md              # 项目说明
```

## API接口

### 相机管理
- `GET /cam/api/cameras` - 获取所有相机
- `GET /cam/api/cameras/search?code={code}` - 搜索相机
- `GET /cam/api/cameras/:id` - 获取相机详情
- `POST /cam/api/cameras` - 添加新相机
- `PUT /cam/api/cameras/:id/status` - 更新相机状态

### 租赁管理
- `GET /cam/api/rentals/calendar?month={month}&year={year}` - 获取租赁日历数据
- `POST /cam/api/rentals` - 创建租赁记录
- `GET /cam/api/rentals/check-conflict` - 检查时间冲突

### 客户管理
- `GET /cam/api/customers` - 获取所有客户
- `POST /cam/api/customers` - 添加新客户

## 使用说明

### 相机管理
1. 在"相机管理"标签页查看所有相机
2. 使用搜索框根据相机编码搜索特定相机
3. 点击"添加相机"按钮添加新相机
4. 点击相机卡片上的"详情"查看完整信息
5. 对于可租赁的相机，点击"租赁"按钮创建租赁记录

### 租赁日历
1. 在"租赁日历"标签页查看月度租赁安排
2. 使用左右箭头切换月份
3. 选择特定相机查看其租赁情况
4. 每个日期显示当天租赁的相机编码和客户姓名
5. 颜色区分：空闲显示绿色，租赁显示黄色

### 租赁记录
1. 在"租赁记录"标签页查看所有租赁历史
2. 显示相机信息、客户信息、租赁日期和状态

## 相机状态说明

- **可租赁**: 相机可用，可以创建新的租赁
- **已租赁**: 相机正在租赁中
- **维护中**: 相机正在进行维护，不可租赁
- **已预订**: 相机已被预订

## 租赁状态说明

- **进行中**: 租赁正在进行
- **已完成**: 租赁已完成
- **已取消**: 租赁已取消
- **逾期**: 租赁已逾期

## 环境变量配置

通过环境变量可以自定义数据库配置：

```env
# 数据库配置
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=camera_rental_management
DB_USER=postgres
DB_PASSWORD=your_password

# 应用配置
NODE_ENV=production
```

## 注意事项

1. Docker部署会自动创建数据库和初始化数据
2. 数据库数据会持久化存储在Docker卷中
3. 应用默认使用3000端口
4. 数据库默认使用5432端口
5. 如需修改端口，请更新docker-compose.yml文件

## 许可证

MIT License

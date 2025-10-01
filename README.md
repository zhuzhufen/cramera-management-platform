# 相机租赁管理平台

一个基于Node.js和PostgreSQL的移动端相机租赁管理系统，支持多用户权限管理和租赁日历功能。

## 项目简介

相机租赁管理平台是一个专为相机租赁业务设计的Web应用，提供完整的相机管理、租赁管理、用户管理和日历视图功能。系统支持管理员和代理人两种角色，具有完善的权限控制机制。

## 功能特性

### 🔧 核心功能
- **相机管理**: 添加、编辑、删除相机信息，支持相机状态管理
- **租赁管理**: 创建租赁记录，检查时间冲突，管理租赁状态
- **日历视图**: 可视化展示相机租赁日历，支持按月份和相机筛选
- **用户管理**: 多用户系统，支持管理员和代理人角色
- **权限控制**: 基于JWT的认证授权，不同角色拥有不同权限

### 🎯 特色功能
- **移动端优化**: 响应式设计，完美适配移动设备
- **时间冲突检测**: 智能检查租赁时间冲突，避免重复租赁
- **动态状态管理**: 根据租赁时间动态更新相机可用状态
- **搜索筛选**: 支持按相机编码、代理人、客户姓名等多维度搜索
- **数据统计**: 提供租赁记录统计和活跃租赁数量显示

## 技术栈

### 后端
- **Node.js** - 运行时环境
- **Express.js** - Web框架
- **PostgreSQL** - 数据库
- **JWT** - 身份认证
- **bcrypt** - 密码加密
- **CORS** - 跨域支持

### 前端
- **HTML5/CSS3** - 页面结构及样式
- **JavaScript (ES6+)** - 客户端逻辑
- **Bootstrap** - UI框架
- **jQuery** - DOM操作
- **Bootstrap Datepicker** - 日期选择组件

### 部署
- **Docker** - 容器化部署
- **Docker Compose** - 服务编排

## 快速开始

### 环境要求
- Node.js 14+
- PostgreSQL 12+
- 或使用Docker环境

### 安装步骤

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd camera-rental-platform
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置数据库**
   - 创建PostgreSQL数据库 `camera_rental_management`
   - 执行数据库初始化脚本：
   ```bash
   psql -d camera_rental_management -f database/migrations/init.sql
   ```

4. **配置环境变量**
   复制 `.env.example` 为 `.env` 并修改数据库连接配置：
   ```env
   DB_HOST=127.0.0.1
   DB_PORT=5432
   DB_NAME=camera_rental_management
   DB_USER=postgres
   DB_PASSWORD=123456
   ```

5. **启动应用**
   ```bash
   # 开发模式
   npm run dev
   
   # 生产模式
   npm start
   ```

6. **访问应用**
   打开浏览器访问 `http://localhost:3000/cam`

### Docker部署

1. **构建镜像**
   ```bash
   docker build -t camera-rental-platform .
   ```

2. **启动服务**
   ```bash
   docker-compose up -d
   ```

## 数据库结构

### 主要数据表

#### users (用户表)
- `id` - 主键
- `username` - 用户名
- `password` - 加密密码
- `role` - 角色 (admin/agent)
- `agent_name` - 代理人姓名
- `created_at` - 创建时间
- `updated_at` - 更新时间

#### cameras (相机表)
- `id` - 主键
- `camera_code` - 相机编码
- `brand` - 品牌
- `model` - 型号
- `serial_number` - 序列号
- `agent` - 代理人
- `status` - 状态 (available/unavailable)
- `description` - 描述
- `created_at` - 创建时间
- `updated_at` - 更新时间

#### rentals (租赁记录表)
- `id` - 主键
- `camera_id` - 相机ID
- `customer_name` - 客户姓名
- `customer_phone` - 客户手机号
- `rental_date` - 租赁开始日期
- `return_date` - 租赁结束日期
- `actual_return_date` - 实际归还日期
- `status` - 状态 (active/completed/cancelled/overdue)
- `created_at` - 创建时间
- `updated_at` - 更新时间

## API接口

### 认证相关
- `POST /cam/api/auth/login` - 用户登录
- `GET /cam/api/auth/me` - 获取当前用户信息
- `POST /cam/api/auth/change-password` - 修改密码

### 相机管理
- `GET /cam/api/cameras` - 获取相机列表
- `GET /cam/api/cameras/search` - 搜索相机
- `GET /cam/api/cameras/:id` - 获取相机详情
- `POST /cam/api/cameras` - 添加相机
- `PUT /cam/api/cameras/:id` - 更新相机信息
- `PUT /cam/api/cameras/:id/status` - 更新相机状态
- `DELETE /cam/api/cameras/:id` - 删除相机

### 租赁管理
- `GET /cam/api/rentals` - 获取租赁记录
- `GET /cam/api/rentals/calendar` - 获取租赁日历数据
- `GET /cam/api/rentals/check-conflict` - 检查时间冲突
- `POST /cam/api/rentals` - 创建租赁记录
- `DELETE /cam/api/rentals/:id` - 删除租赁记录

### 用户管理
- `GET /cam/api/users` - 获取用户列表
- `GET /cam/api/users/:id` - 获取用户详情
- `POST /cam/api/users` - 添加用户
- `PUT /cam/api/users/:id` - 更新用户信息
- `DELETE /cam/api/users/:id` - 删除用户

## 权限说明

### 管理员权限
- 管理所有相机和租赁记录
- 管理所有用户账户
- 查看系统所有数据

### 代理人权限
- 只能管理自己名下的相机
- 只能查看自己相机的租赁记录
- 无法管理其他用户

## 默认账户

系统预置一个管理员账户：
- **用户名**: admin
- **密码**: admin123
- **角色**: 管理员

## 项目结构

```
camera-rental-platform/
├── database/                 # 数据库相关
│   └── migrations/          # 数据库迁移脚本
├── public/                  # 前端静态文件
│   ├── css/                # 样式文件
│   ├── js/                 # JavaScript文件
│   ├── lib/                # 第三方库
│   └── *.html              # 页面文件
├── server.js               # 服务器主文件
├── package.json            # 项目配置
├── Dockerfile              # Docker构建文件
├── docker-compose.yml      # Docker编排文件
└── README.md               # 项目说明
```

## 开发指南

### 添加新功能
1. 在 `server.js` 中添加新的API路由
2. 在前端对应页面中添加交互逻辑
3. 如有需要，更新数据库结构
4. 测试功能完整性

### 数据库迁移
数据库迁移脚本位于 `database/migrations/` 目录，按时间顺序执行：
1. `init.sql` - 初始数据库结构
2. `update_rentals_table.sql` - 租赁表更新

## 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查PostgreSQL服务是否运行
   - 验证数据库连接配置
   - 确认数据库用户权限

2. **JWT认证失败**
   - 检查请求头中的Authorization字段
   - 验证JWT令牌是否过期
   - 确认JWT密钥配置

3. **时间冲突检测异常**
   - 检查日期格式是否正确
   - 验证租赁时间段逻辑
   - 确认数据库时区设置

## 贡献指南

欢迎提交Issue和Pull Request来改进项目。

## 许可证

MIT License

## 联系方式

如有问题或建议，请通过以下方式联系：
- 提交GitHub Issue
- 发送邮件至项目维护者

---

**注意**: 生产环境部署时请务必修改默认密码和JWT密钥，确保系统安全。

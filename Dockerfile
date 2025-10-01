# 使用官方 Node.js 运行时作为基础镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm install --production

# 复制应用源代码
COPY . .

# 暴露端口
EXPOSE 3000

# 设置环境变量默认值
ENV DB_HOST=127.0.0.1
ENV DB_PORT=5432
ENV DB_NAME=camera_rental_management
ENV DB_USER=postgres
ENV DB_PASSWORD=123456
ENV NODE_ENV=production

# 启动应用
CMD ["node", "server.js"]

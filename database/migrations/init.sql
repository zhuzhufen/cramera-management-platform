-- 创建相机租赁管理数据库
-- 注意：PostgreSQL中CREATE DATABASE IF NOT EXISTS语法在较新版本中支持
-- 如果报错，请先手动创建数据库：CREATE DATABASE camera_rental_management;

-- 使用数据库
-- \c camera_rental_management;  -- 在psql中执行时使用

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'agent' CHECK (role IN ('admin', 'agent')),
    agent_name VARCHAR(100), -- 代理人姓名，与相机表中的agent字段对应
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建相机表
CREATE TABLE IF NOT EXISTS cameras (
    id SERIAL PRIMARY KEY,
    camera_code VARCHAR(50) UNIQUE NOT NULL,
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    serial_number VARCHAR(100),
    agent VARCHAR(100), -- 代理人字段，与users表中的agent_name对应
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'unavailable')),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建租赁记录表（最新结构）
CREATE TABLE IF NOT EXISTS rentals (
    id SERIAL PRIMARY KEY,
    camera_id INTEGER REFERENCES cameras(id),
    customer_name VARCHAR(100) NOT NULL, -- 直接存储客户姓名
    customer_phone VARCHAR(20) NOT NULL, -- 直接存储客户手机号
    rental_date DATE NOT NULL,
    return_date DATE NOT NULL,
    actual_return_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'overdue')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_cameras_code ON cameras(camera_code);
CREATE INDEX IF NOT EXISTS idx_cameras_status ON cameras(status);
CREATE INDEX IF NOT EXISTS idx_rentals_dates ON rentals(rental_date, return_date);
CREATE INDEX IF NOT EXISTS idx_rentals_camera_id ON rentals(camera_id);
CREATE INDEX IF NOT EXISTS idx_rentals_status ON rentals(status);


-- 插入超级管理员用户
-- 密码: admin123 (bcrypt加密)
INSERT INTO users (username, password, role, agent_name) VALUES
('admin', '$2b$10$8K1p/a0dRT1R3J5J5Q5Q5O5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q', 'admin', '系统管理员');

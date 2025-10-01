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

-- 创建客户表
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    id_card VARCHAR(50),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建租赁记录表
CREATE TABLE IF NOT EXISTS rentals (
    id SERIAL PRIMARY KEY,
    camera_id INTEGER REFERENCES cameras(id),
    customer_id INTEGER REFERENCES customers(id),
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


-- 插入示例数据
INSERT INTO cameras (camera_code, brand, model, serial_number, agent, description, status) VALUES
('CAM001', 'Canon', 'EOS R5', 'CR5-2023001', '张三', '全画幅专业微单相机', 'available'),
('CAM002', 'Sony', 'A7IV', 'SA7-2023002', '李四', '全画幅微单相机', 'available'),
('CAM003', 'Nikon', 'Z9', 'NZ9-2023003', '王五', '旗舰级无反相机', 'available'),
('CAM004', 'Fujifilm', 'X-T5', 'FXT-2023004', '张三', 'APS-C画幅复古相机', 'available'),
('CAM005', 'Canon', 'EOS R6', 'CR6-2023005', '李四', '全画幅微单相机', 'available');

INSERT INTO customers (name, phone, email, id_card) VALUES
('张三', '13800138001', 'zhangsan@email.com', '110101199001011234'),
('李四', '13800138002', 'lisi@email.com', '110101199002021234'),
('王五', '13800138003', 'wangwu@email.com', '110101199003031234');

-- 插入示例租赁记录
INSERT INTO rentals (camera_id, customer_id, rental_date, return_date, total_amount, status) VALUES
(1, 1, '2024-01-15', '2024-01-20', 750.00, 'completed'),
(2, 2, '2024-01-18', '2024-01-25', 840.00, 'active'),
(3, 3, '2024-01-22', '2024-01-29', 1400.00, 'active');

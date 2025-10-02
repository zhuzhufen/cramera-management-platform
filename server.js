const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const CryptoUtils = require('./utils/crypto-utils');

const app = express();
const port = 3000;
const JWT_SECRET = 'camera_rental_secret_key'; // 生产环境应该使用环境变量

// 中间件
app.use(cors({
    origin: function(origin, callback) {
        // 允许所有来源（生产环境应该限制为特定域名）
        callback(null, true);
    },
    credentials: true
}));
app.use(bodyParser.json());
app.use('/cam', express.static('public'));

// JWT认证中间件
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: '访问令牌缺失' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: '令牌无效' });
        }
        req.user = user;
        next();
    });
};

// 管理员权限检查中间件
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: '需要管理员权限' });
    }
    next();
};

// 获取当前用户信息中间件
const getCurrentUser = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (!err) {
                req.user = user;
            }
        });
    }
    next();
};

// PostgreSQL 数据库连接配置
const pool = new Pool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'camera_rental_management',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '123456',
    // 设置时区为 Asia/Shanghai，避免日期转换问题
    types: {
        getTypeParser: () => (val) => val // 返回原始值，避免时区转换
    }
});

// 测试数据库连接
pool.connect((err, client, release) => {
    if (err) {
        console.error('数据库连接失败:', err);
    } else {
        console.log('数据库连接成功');
        release();
    }
});

// 获取所有相机
app.get('/cam/api/cameras', async (req, res) => {
    try {
        const { rental_date, return_date, agent, status } = req.query;
        
        let query = `
            SELECT c.*, 
                   COUNT(r.id) FILTER (WHERE r.status = 'active') as active_rentals
            FROM cameras c
            LEFT JOIN rentals r ON c.id = r.camera_id
        `;
        
        const whereConditions = [];
        const params = [];
        let paramCount = 0;
        
        // 如果提供了状态筛选，先不在这里筛选，而是在动态状态计算后筛选
        
        // 如果提供了代理人筛选
        if (agent) {
            paramCount++;
            whereConditions.push(`c.agent ILIKE $${paramCount}`);
            params.push(`%${agent}%`);
        }
        
        // 添加WHERE条件
        if (whereConditions.length > 0) {
            query += ` WHERE ` + whereConditions.join(' AND ');
        }
        
        query += ` GROUP BY c.id ORDER BY c.camera_code`;
        
        const result = await pool.query(query, params);
        
        // 如果提供了租赁时间段，检查时间冲突并动态更新状态
        if (rental_date && return_date) {
            const camerasWithDynamicStatus = await Promise.all(
                result.rows.map(async (camera) => {
                    // 检查该相机在指定时间段是否有冲突
                    const conflictCheck = await pool.query(`
                        SELECT COUNT(*) as conflict_count
                        FROM rentals 
                        WHERE camera_id = $1 
                        AND status IN ('active', 'reserved')
                        AND (
                            (rental_date <= $2 AND return_date >= $2) OR
                            (rental_date <= $3 AND return_date >= $3) OR
                            (rental_date >= $2 AND return_date <= $3)
                        )
                    `, [camera.id, rental_date, return_date]);
                    
                    const hasConflict = parseInt(conflictCheck.rows[0].conflict_count) > 0;
                    
                    // 如果相机原本可用但有时间冲突，则动态设置为不可用
                    if (camera.status === 'available' && hasConflict) {
                        return {
                            ...camera,
                            dynamic_status: 'unavailable',
                            dynamic_status_reason: '该时间段已被租赁'
                        };
                    }
                    
                    // 否则保持原有状态
                    return {
                        ...camera,
                        dynamic_status: camera.status,
                        dynamic_status_reason: null
                    };
                })
            );
            
            // 应用状态筛选（如果有）
            let filteredCameras = camerasWithDynamicStatus;
            if (status) {
                filteredCameras = camerasWithDynamicStatus.filter(camera => 
                    camera.dynamic_status === status
                );
            }
            
            res.json(filteredCameras);
        } else {
            // 没有提供租赁时间段，返回原有状态
            const camerasWithDefaultStatus = result.rows.map(camera => ({
                ...camera,
                dynamic_status: camera.status,
                dynamic_status_reason: null
            }));
            
            // 应用状态筛选（如果有）
            let filteredCameras = camerasWithDefaultStatus;
            if (status) {
                filteredCameras = camerasWithDefaultStatus.filter(camera => 
                    camera.dynamic_status === status
                );
            }
            
            res.json(filteredCameras);
        }
    } catch (err) {
        console.error('获取相机列表失败:', err);
        res.status(500).json({ error: '获取相机列表失败' });
    }
});

// 根据相机编码搜索相机
app.get('/cam/api/cameras/search', async (req, res) => {
    try {
        const { code } = req.query;
        const result = await pool.query(`
            SELECT c.*, 
                   COUNT(r.id) FILTER (WHERE r.status = 'active') as active_rentals
            FROM cameras c
            LEFT JOIN rentals r ON c.id = r.camera_id
            WHERE c.camera_code ILIKE $1
            GROUP BY c.id
            ORDER BY c.camera_code
        `, [`%${code}%`]);
        res.json(result.rows);
    } catch (err) {
        console.error('搜索相机失败:', err);
        res.status(500).json({ error: '搜索相机失败' });
    }
});

// 获取相机详情
app.get('/cam/api/cameras/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT c.*, 
                   json_agg(
                       json_build_object(
                           'id', r.id,
                           'customer_name', r.customer_name,
                           'rental_date', r.rental_date,
                           'return_date', r.return_date,
                           'status', r.status
                       )
                   ) FILTER (WHERE r.id IS NOT NULL) as rental_history
            FROM cameras c
            LEFT JOIN rentals r ON c.id = r.camera_id
            WHERE c.id = $1
            GROUP BY c.id
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: '相机未找到' });
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error('获取相机详情失败:', err);
        res.status(500).json({ error: '获取相机详情失败' });
    }
});

// 更新相机信息
app.put('/cam/api/cameras/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { camera_code, brand, model, serial_number, agent, status, description } = req.body;
        
        // 检查相机是否存在
        const cameraCheck = await pool.query('SELECT * FROM cameras WHERE id = $1', [id]);
        if (cameraCheck.rows.length === 0) {
            return res.status(404).json({ error: '相机未找到' });
        }
        
        // 检查相机编码是否重复（排除当前相机）
        const codeCheck = await pool.query(
            'SELECT id FROM cameras WHERE camera_code = $1 AND id != $2',
            [camera_code, id]
        );
        
        if (codeCheck.rows.length > 0) {
            return res.status(400).json({ error: '相机编码已存在' });
        }
        
        // 更新相机信息
        const result = await pool.query(`
            UPDATE cameras 
            SET camera_code = $1, brand = $2, model = $3, serial_number = $4, 
                agent = $5, status = $6, description = $7, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $8 
            RETURNING *
        `, [camera_code, brand, model, serial_number, agent, status, description, id]);
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error('更新相机信息失败:', err);
        res.status(500).json({ error: '更新相机信息失败' });
    }
});

// 获取租赁日历数据
app.get('/cam/api/rentals/calendar', async (req, res) => {
    try {
        const { month, year, camera_id } = req.query;
        
        // 构建月份的开始和结束日期
        const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
        const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // 月份的最后一天
        
        
        let query = `
            SELECT 
                r.rental_date,
                r.return_date,
                c.camera_code,
                c.brand,
                c.model,
                c.agent,
                c.id as camera_id,
                r.customer_name,
                r.customer_phone,
                r.status
            FROM rentals r
            JOIN cameras c ON r.camera_id = c.id
            WHERE (
                -- 租赁开始日期在当前月份内
                (r.rental_date >= $1 AND r.rental_date <= $2)
                -- 租赁结束日期在当前月份内
                OR (r.return_date >= $1 AND r.return_date <= $2)
                -- 租赁跨越当前月份（开始日期在月份前，结束日期在月份后）
                OR (r.rental_date <= $1 AND r.return_date >= $2)
                -- 租赁在当前月份内有任何一天
                OR (r.rental_date <= $2 AND r.return_date >= $1)
            )
        `;
        
        const params = [startDate, endDate];
        
        if (camera_id) {
            query += ` AND c.id = $3`;
            params.push(camera_id);
        }
        
        query += ` ORDER BY r.rental_date`;
        
        const result = await pool.query(query, params);
        
        // 手动处理日期格式，避免时区转换问题
        const processedRentals = result.rows.map(rental => {
            // 如果日期是字符串格式，直接返回
            if (typeof rental.rental_date === 'string') {
                return rental;
            }
            
            // 如果是Date对象，转换为本地日期字符串
            return {
                ...rental,
                rental_date: rental.rental_date.toISOString().split('T')[0],
                return_date: rental.return_date.toISOString().split('T')[0]
            };
        });
        
        res.json(processedRentals);
    } catch (err) {
        console.error('获取租赁日历失败:', err);
        res.status(500).json({ error: '获取租赁日历失败' });
    }
});

// 获取所有租赁记录（用于租赁记录页面筛选）
app.get('/cam/api/rentals', async (req, res) => {
    try {
        const { camera_code, agent, customer_name, start_date, end_date } = req.query;
        
        let query = `
            SELECT 
                r.id,
                r.rental_date,
                r.return_date,
                c.camera_code,
                c.brand,
                c.model,
                c.agent,
                c.id as camera_id,
                r.customer_name,
                r.customer_phone,
                r.status
            FROM rentals r
            JOIN cameras c ON r.camera_id = c.id
            WHERE 1=1
        `;
        
        const params = [];
        let paramCount = 0;
        
        // 相机编码筛选
        if (camera_code) {
            paramCount++;
            query += ` AND c.camera_code ILIKE $${paramCount}`;
            params.push(`%${camera_code}%`);
        }
        
        // 代理人筛选
        if (agent) {
            paramCount++;
            query += ` AND c.agent ILIKE $${paramCount}`;
            params.push(`%${agent}%`);
        }
        
        // 租赁人筛选
        if (customer_name) {
            paramCount++;
            query += ` AND r.customer_name ILIKE $${paramCount}`;
            params.push(`%${customer_name}%`);
        }
        
        // 租赁开始日期筛选
        if (start_date) {
            paramCount++;
            query += ` AND r.rental_date >= $${paramCount}`;
            params.push(start_date);
        }
        
        // 租赁结束日期筛选
        if (end_date) {
            paramCount++;
            query += ` AND r.return_date <= $${paramCount}`;
            params.push(end_date);
        }
        
        query += ` ORDER BY r.rental_date DESC`;
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('获取租赁记录失败:', err);
        res.status(500).json({ error: '获取租赁记录失败' });
    }
});

// 检查租赁时间冲突
app.get('/cam/api/rentals/check-conflict', async (req, res) => {
    try {
        const { camera_id, rental_date, return_date, exclude_rental_id } = req.query;
        
        let query = `
            SELECT COUNT(*) as conflict_count
            FROM rentals 
            WHERE camera_id = $1 
            AND status IN ('active', 'reserved')
            AND (
                (rental_date <= $2 AND return_date >= $2) OR
                (rental_date <= $3 AND return_date >= $3) OR
                (rental_date >= $2 AND return_date <= $3)
            )
        `;
        
        const params = [camera_id, rental_date, return_date];
        
        if (exclude_rental_id) {
            query += ` AND id != $4`;
            params.push(exclude_rental_id);
        }
        
        const result = await pool.query(query, params);
        const hasConflict = parseInt(result.rows[0].conflict_count) > 0;
        
        res.json({ hasConflict });
    } catch (err) {
        console.error('检查时间冲突失败:', err);
        res.status(500).json({ error: '检查时间冲突失败' });
    }
});

// 创建新的租赁记录
app.post('/cam/api/rentals', async (req, res) => {
    try {
        const { 
            camera_id, 
            customer_name, 
            customer_phone, 
            rental_date, 
            return_date 
        } = req.body;
        
        // 验证必填字段
        if (!customer_name || !customer_phone) {
            return res.status(400).json({ error: '客户姓名和手机号码不能为空' });
        }
        
        // 检查时间冲突
        const conflictCheck = await pool.query(`
            SELECT COUNT(*) as conflict_count
            FROM rentals 
            WHERE camera_id = $1 
            AND status IN ('active', 'reserved')
            AND (
                (rental_date <= $2 AND return_date >= $2) OR
                (rental_date <= $3 AND return_date >= $3) OR
                (rental_date >= $2 AND return_date <= $3)
            )
        `, [camera_id, rental_date, return_date]);
        
        const hasConflict = parseInt(conflictCheck.rows[0].conflict_count) > 0;
        
        if (hasConflict) {
            return res.status(400).json({ error: '所选时间段与已有租赁记录冲突' });
        }
        
        // 创建租赁记录，直接存储客户信息
        const result = await pool.query(`
            INSERT INTO rentals (camera_id, customer_name, customer_phone, rental_date, return_date)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [camera_id, customer_name, customer_phone, rental_date, return_date]);
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error('创建租赁记录失败:', err);
        res.status(500).json({ error: '创建租赁记录失败' });
    }
});


// 添加新相机
app.post('/cam/api/cameras', async (req, res) => {
    try {
        const { camera_code, brand, model, serial_number, agent, description } = req.body;
        
        const result = await pool.query(`
            INSERT INTO cameras (camera_code, brand, model, serial_number, agent, description)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [camera_code, brand, model, serial_number, agent, description]);
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error('添加相机失败:', err);
        res.status(500).json({ error: '添加相机失败' });
    }
});

// 更新相机状态
app.put('/cam/api/cameras/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        const result = await pool.query(`
            UPDATE cameras 
            SET status = $1, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $2 
            RETURNING *
        `, [status, id]);
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error('更新相机状态失败:', err);
        res.status(500).json({ error: '更新相机状态失败' });
    }
});

// 删除租赁记录
app.delete('/cam/api/rentals/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // 检查租赁记录是否存在
        const rentalCheck = await pool.query('SELECT * FROM rentals WHERE id = $1', [id]);
        if (rentalCheck.rows.length === 0) {
            return res.status(404).json({ error: '租赁记录未找到' });
        }
        
        // 删除租赁记录
        const result = await pool.query('DELETE FROM rentals WHERE id = $1 RETURNING *', [id]);
        
        res.json({ 
            message: '租赁记录删除成功',
            deletedRental: result.rows[0]
        });
    } catch (err) {
        console.error('删除租赁记录失败:', err);
        res.status(500).json({ error: '删除租赁记录失败' });
    }
});

// 用户登录
app.post('/cam/api/auth/login', async (req, res) => {
    try {
        const { username, password, encrypted_password } = req.body;
        
        if (!username || (!password && !encrypted_password)) {
            return res.status(400).json({ error: '用户名和密码不能为空' });
        }
        
        // 查询用户
        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1',
            [username]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }
        
        const user = result.rows[0];
        
        let plainPassword;
        
        // 如果提供了加密密码，先解密
        if (encrypted_password) {
            try {
                plainPassword = CryptoUtils.decryptPassword(encrypted_password);
            } catch (decryptError) {
                console.error('密码解密失败:', decryptError);
                return res.status(400).json({ error: '密码格式错误' });
            }
        } else {
            plainPassword = password;
        }
        
        // 验证密码
        const isValidPassword = await bcrypt.compare(plainPassword, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }
        
        // 生成JWT令牌
        const token = jwt.sign(
            { 
                id: user.id, 
                username: user.username, 
                role: user.role,
                agent_name: user.agent_name 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({
            message: '登录成功',
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                agent_name: user.agent_name
            }
        });
    } catch (err) {
        console.error('登录失败:', err);
        res.status(500).json({ error: '登录失败' });
    }
});

// 获取当前用户信息
app.get('/cam/api/auth/me', authenticateToken, (req, res) => {
    res.json({
        user: {
            id: req.user.id,
            username: req.user.username,
            role: req.user.role,
            agent_name: req.user.agent_name
        }
    });
});

// 修改所有API端点，添加权限控制
// 获取所有相机（添加权限控制）
app.get('/cam/api/cameras', getCurrentUser, async (req, res) => {
    try {
        const { rental_date, return_date, agent, status } = req.query;
        
        let query = `
            SELECT c.*, 
                   COUNT(r.id) FILTER (WHERE r.status = 'active') as active_rentals
            FROM cameras c
            LEFT JOIN rentals r ON c.id = r.camera_id
        `;
        
        const whereConditions = [];
        const params = [];
        let paramCount = 0;
        
        // 如果是代理人，只能看到自己的相机
        if (req.user && req.user.role === 'agent' && req.user.agent_name) {
            paramCount++;
            whereConditions.push(`c.agent = $${paramCount}`);
            params.push(req.user.agent_name);
        }
        
        // 如果提供了状态筛选
        if (status) {
            paramCount++;
            whereConditions.push(`c.status = $${paramCount}`);
            params.push(status);
        }
        
        // 如果提供了租赁时间段，筛选可用相机
        if (rental_date && return_date) {
            // 只有当没有指定状态筛选时才应用时间冲突检查
            if (!status) {
                paramCount++;
                whereConditions.push(`
                    c.status = 'available'
                    AND c.id NOT IN (
                        SELECT DISTINCT camera_id 
                        FROM rentals 
                        WHERE status IN ('active', 'reserved')
                        AND (
                            (rental_date <= $${paramCount} AND return_date >= $${paramCount}) OR
                            (rental_date <= $${paramCount + 1} AND return_date >= $${paramCount + 1}) OR
                            (rental_date >= $${paramCount} AND return_date <= $${paramCount + 1})
                        )
                    )
                `);
                params.push(rental_date, return_date);
                paramCount++; // 增加第二个日期参数
            }
        }
        
        // 如果提供了代理人筛选（管理员专用）
        if (agent && req.user && req.user.role === 'admin') {
            paramCount++;
            whereConditions.push(`c.agent ILIKE $${paramCount}`);
            params.push(`%${agent}%`);
        }
        
        // 添加WHERE条件
        if (whereConditions.length > 0) {
            query += ` WHERE ` + whereConditions.join(' AND ');
        }
        
        query += ` GROUP BY c.id ORDER BY c.camera_code`;
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('获取相机列表失败:', err);
        res.status(500).json({ error: '获取相机列表失败' });
    }
});

// 获取所有租赁记录（添加权限控制）
app.get('/cam/api/rentals', getCurrentUser, async (req, res) => {
    try {
        const { camera_code, agent, customer_name, start_date, end_date } = req.query;
        
        let query = `
            SELECT 
                r.id,
                r.rental_date,
                r.return_date,
                c.camera_code,
                c.brand,
                c.model,
                c.agent,
                c.id as camera_id,
                r.customer_name,
                r.customer_phone,
                r.status
            FROM rentals r
            JOIN cameras c ON r.camera_id = c.id
            WHERE 1=1
        `;
        
        const params = [];
        let paramCount = 0;
        
        // 如果是代理人，只能看到自己相机的租赁记录
        if (req.user && req.user.role === 'agent' && req.user.agent_name) {
            paramCount++;
            query += ` AND c.agent = $${paramCount}`;
            params.push(req.user.agent_name);
        }
        
        // 相机编码筛选
        if (camera_code) {
            paramCount++;
            query += ` AND c.camera_code ILIKE $${paramCount}`;
            params.push(`%${camera_code}%`);
        }
        
        // 代理人筛选（管理员专用）
        if (agent && req.user && req.user.role === 'admin') {
            paramCount++;
            query += ` AND c.agent ILIKE $${paramCount}`;
            params.push(`%${agent}%`);
        }
        
        // 租赁人筛选
        if (customer_name) {
            paramCount++;
            query += ` AND r.customer_name ILIKE $${paramCount}`;
            params.push(`%${customer_name}%`);
        }
        
        // 租赁开始日期筛选
        if (start_date) {
            paramCount++;
            query += ` AND r.rental_date >= $${paramCount}`;
            params.push(start_date);
        }
        
        // 租赁结束日期筛选
        if (end_date) {
            paramCount++;
            query += ` AND r.return_date <= $${paramCount}`;
            params.push(end_date);
        }
        
        query += ` ORDER BY r.rental_date DESC`;
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('获取租赁记录失败:', err);
        res.status(500).json({ error: '获取租赁记录失败' });
    }
});

// 添加新相机（需要管理员权限）
app.post('/cam/api/cameras', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { camera_code, brand, model, serial_number, agent, description } = req.body;
        
        const result = await pool.query(`
            INSERT INTO cameras (camera_code, brand, model, serial_number, agent, description)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [camera_code, brand, model, serial_number, agent, description]);
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error('添加相机失败:', err);
        res.status(500).json({ error: '添加相机失败' });
    }
});

// 更新相机状态（需要管理员权限）
app.put('/cam/api/cameras/:id/status', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        const result = await pool.query(`
            UPDATE cameras 
            SET status = $1, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $2 
            RETURNING *
        `, [status, id]);
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error('更新相机状态失败:', err);
        res.status(500).json({ error: '更新相机状态失败' });
    }
});

// 删除租赁记录（需要管理员权限）
app.delete('/cam/api/rentals/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        // 检查租赁记录是否存在
        const rentalCheck = await pool.query('SELECT * FROM rentals WHERE id = $1', [id]);
        if (rentalCheck.rows.length === 0) {
            return res.status(404).json({ error: '租赁记录未找到' });
        }
        
        // 删除租赁记录
        const result = await pool.query('DELETE FROM rentals WHERE id = $1 RETURNING *', [id]);
        
        res.json({ 
            message: '租赁记录删除成功',
            deletedRental: result.rows[0]
        });
    } catch (err) {
        console.error('删除租赁记录失败:', err);
        res.status(500).json({ error: '删除租赁记录失败' });
    }
});

// 删除相机（需要管理员权限）
app.delete('/cam/api/cameras/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        // 检查相机是否存在
        const cameraCheck = await pool.query('SELECT * FROM cameras WHERE id = $1', [id]);
        if (cameraCheck.rows.length === 0) {
            return res.status(404).json({ error: '相机未找到' });
        }
        
        // 检查相机是否有活跃的租赁记录
        const activeRentalsCheck = await pool.query(`
            SELECT COUNT(*) as active_count 
            FROM rentals 
            WHERE camera_id = $1 AND status IN ('active', 'reserved')
        `, [id]);
        
        const hasActiveRentals = parseInt(activeRentalsCheck.rows[0].active_count) > 0;
        if (hasActiveRentals) {
            return res.status(400).json({ error: '该相机有租赁记录，无法删除' });
        }
        
        // 删除相机
        const result = await pool.query('DELETE FROM cameras WHERE id = $1 RETURNING *', [id]);
        
        res.json({ 
            message: '相机删除成功',
            deletedCamera: result.rows[0]
        });
    } catch (err) {
        console.error('删除相机失败:', err);
        res.status(500).json({ error: '删除相机失败' });
    }
});

// 用户管理API
// 获取所有用户（需要管理员权限）
app.get('/cam/api/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { username, role, agent_name } = req.query;
        
        let query = 'SELECT id, username, role, agent_name, created_at, updated_at FROM users WHERE 1=1';
        const params = [];
        let paramCount = 0;
        
        // 用户名筛选
        if (username) {
            paramCount++;
            query += ` AND username ILIKE $${paramCount}`;
            params.push(`%${username}%`);
        }
        
        // 角色筛选
        if (role) {
            paramCount++;
            query += ` AND role = $${paramCount}`;
            params.push(role);
        }
        
        // 代理人姓名筛选
        if (agent_name) {
            paramCount++;
            query += ` AND agent_name ILIKE $${paramCount}`;
            params.push(`%${agent_name}%`);
        }
        
        query += ' ORDER BY username';
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('获取用户列表失败:', err);
        res.status(500).json({ error: '获取用户列表失败' });
    }
});

// 获取单个用户信息（需要管理员权限）
app.get('/cam/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            'SELECT id, username, role, agent_name, created_at, updated_at FROM users WHERE id = $1',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: '用户未找到' });
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error('获取用户信息失败:', err);
        res.status(500).json({ error: '获取用户信息失败' });
    }
});

// 添加新用户（需要管理员权限）
app.post('/cam/api/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { username, password, encrypted_password, role, agent_name } = req.body;
        
        if (!username || (!password && !encrypted_password) || !role || !agent_name) {
            return res.status(400).json({ error: '用户名、密码、角色和姓名不能为空' });
        }
        
        // 检查用户名是否已存在
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE username = $1',
            [username]
        );
        
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: '用户名已存在' });
        }
        
        // 验证角色
        if (!['admin', 'agent'].includes(role)) {
            return res.status(400).json({ error: '角色必须是admin或agent' });
        }
        
        let plainPassword;
        
        // 如果提供了加密密码，先解密
        if (encrypted_password) {
            try {
                plainPassword = CryptoUtils.decryptPassword(encrypted_password);
            } catch (decryptError) {
                console.error('密码解密失败:', decryptError);
                return res.status(400).json({ error: '密码格式错误' });
            }
        } else {
            plainPassword = password;
        }
        
        // 加密密码
        const hashedPassword = await bcrypt.hash(plainPassword, 10);
        
        const result = await pool.query(`
            INSERT INTO users (username, password, role, agent_name)
            VALUES ($1, $2, $3, $4)
            RETURNING id, username, role, agent_name, created_at
        `, [username, hashedPassword, role, agent_name]);
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error('添加用户失败:', err);
        res.status(500).json({ error: '添加用户失败' });
    }
});

// 更新用户信息（需要管理员权限）
app.put('/cam/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { role, agent_name, password, encrypted_password } = req.body;
        
        // 检查用户是否存在
        const userCheck = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: '用户未找到' });
        }
        
        // 验证角色
        if (role && !['admin', 'agent'].includes(role)) {
            return res.status(400).json({ error: '角色必须是admin或agent' });
        }
        
        // 构建更新字段
        const updateFields = [];
        const params = [];
        let paramCount = 0;
        
        if (role) {
            paramCount++;
            updateFields.push(`role = $${paramCount}`);
            params.push(role);
        }
        
        if (agent_name !== undefined) {
            paramCount++;
            updateFields.push(`agent_name = $${paramCount}`);
            params.push(agent_name);
        }
        
        if (password || encrypted_password) {
            paramCount++;
            let plainPassword;
            
            // 如果提供了加密密码，先解密
            if (encrypted_password) {
                try {
                    plainPassword = CryptoUtils.decryptPassword(encrypted_password);
                } catch (decryptError) {
                    console.error('密码解密失败:', decryptError);
                    return res.status(400).json({ error: '密码格式错误' });
                }
            } else {
                plainPassword = password;
            }
            
            const hashedPassword = await bcrypt.hash(plainPassword, 10);
            updateFields.push(`password = $${paramCount}`);
            params.push(hashedPassword);
        }
        
        // 如果没有要更新的字段
        if (updateFields.length === 0) {
            return res.status(400).json({ error: '没有提供要更新的字段' });
        }
        
        paramCount++;
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        params.push(id);
        
        const query = `
            UPDATE users 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramCount}
            RETURNING id, username, role, agent_name, updated_at
        `;
        
        const result = await pool.query(query, params);
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error('更新用户失败:', err);
        res.status(500).json({ error: '更新用户失败' });
    }
});

// 删除用户（需要管理员权限）
app.delete('/cam/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        // 检查用户是否存在
        const userCheck = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: '用户未找到' });
        }
        
        // 不能删除自己
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ error: '不能删除自己的账户' });
        }
        
        // 删除用户
        const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
        
        res.json({ 
            message: '用户删除成功',
            deletedUser: {
                id: result.rows[0].id,
                username: result.rows[0].username,
                role: result.rows[0].role
            }
        });
    } catch (err) {
        console.error('删除用户失败:', err);
        res.status(500).json({ error: '删除用户失败' });
    }
});

// 获取加密密钥
app.get('/cam/api/auth/encryption-key', (req, res) => {
    // 生产环境应该从环境变量或密钥管理服务获取
    const encryptionKey = process.env.ENCRYPTION_KEY || 'camera_rental_encryption_key_2024';
    const salt = process.env.ENCRYPTION_SALT || 'camera_rental_salt';
    
    res.json({
        key: encryptionKey,
        salt: salt
    });
});

// 修改密码
app.post('/cam/api/auth/change-password', authenticateToken, async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        const userId = req.user.id;
        
        if (!current_password || !new_password) {
            return res.status(400).json({ error: '当前密码和新密码不能为空' });
        }
        
        // 验证新密码强度
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
        if (!passwordRegex.test(new_password)) {
            return res.status(400).json({ 
                error: '密码强度不足，必须包含大小写字母、数字和特殊字符，且长度至少8位' 
            });
        }
        
        // 获取当前用户信息
        const userResult = await pool.query(
            'SELECT * FROM users WHERE id = $1',
            [userId]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: '用户未找到' });
        }
        
        const user = userResult.rows[0];
        
        // 验证当前密码
        const isValidCurrentPassword = await bcrypt.compare(current_password, user.password);
        if (!isValidCurrentPassword) {
            return res.status(401).json({ error: '当前密码错误' });
        }
        
        // 加密新密码
        const hashedNewPassword = await bcrypt.hash(new_password, 10);
        
        // 更新密码
        await pool.query(
            'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [hashedNewPassword, userId]
        );
        
        res.json({ message: '密码修改成功' });
    } catch (err) {
        console.error('修改密码失败:', err);
        res.status(500).json({ error: '修改密码失败' });
    }
});

app.listen(port, () => {
    console.log(`相机租赁管理平台服务器运行在 http://localhost:${port}`);
});

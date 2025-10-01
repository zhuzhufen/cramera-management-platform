// 用户管理模块

// 加载用户列表
async function loadUsers() {
    try {
        const tableBody = document.getElementById('users-table-body');
        tableBody.innerHTML = '<tr><td colspan="5" class="loading">加载中</td></tr>';

        const response = await authFetch(CONFIG.buildUrl(CONFIG.USER.LIST));
        if (!response.ok) throw new Error('加载用户列表失败');

        const users = await response.json();
        renderUsersTable(users);
    } catch (error) {
        const tableBody = document.getElementById('users-table-body');
        tableBody.innerHTML = `<tr><td colspan="5" class="error">加载用户列表失败: ${error.message}</td></tr>`;
    }
}

// 渲染用户表格
function renderUsersTable(users) {
    const tableBody = document.getElementById('users-table-body');
    
    if (users.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="loading">没有用户数据</td></tr>';
        return;
    }

    tableBody.innerHTML = users.map(user => `
        <tr>
            <td>${user.username}</td>
            <td>${user.role === 'admin' ? '管理员' : '代理人'}</td>
            <td>${user.agent_name || '无'}</td>
            <td>${user.created_at ? formatDate(user.created_at) : '未知'}</td>
            <td>
                <button onclick="editUserModal(${user.id})" class="btn-blue">修改</button>
                <button onclick="deleteUser(${user.id})" class="btn-red">删除</button>
            </td>
        </tr>
    `).join('');
}

// 搜索用户
async function searchUsers() {
    const usernameInput = document.getElementById('users-username-input');
    const agentInput = document.getElementById('users-agent-input');
    const roleSelect = document.getElementById('users-role-select');
    const statusSelect = document.getElementById('users-status-select');
    
    const usernameTerm = usernameInput.value.trim();
    const agentTerm = agentInput.value.trim();
    const roleValue = roleSelect.value;
    const statusValue = statusSelect.value;

    try {
        const tableBody = document.getElementById('users-table-body');
        tableBody.innerHTML = '<tr><td colspan="5" class="loading">搜索中</td></tr>';

        // 构建查询参数
        const queryParams = {};
        if (usernameTerm) queryParams.username = usernameTerm;
        if (agentTerm) queryParams.agent_name = agentTerm;
        if (roleValue) queryParams.role = roleValue;
        if (statusValue) queryParams.status = statusValue;
        
        const queryString = CONFIG.buildQueryString(queryParams);
        const response = await authFetch(CONFIG.buildUrl(CONFIG.USER.LIST) + queryString);
        if (!response.ok) throw new Error('搜索失败');

        const users = await response.json();
        renderUsersTable(users);
    } catch (error) {
        const tableBody = document.getElementById('users-table-body');
        tableBody.innerHTML = `<tr><td colspan="5" class="error">搜索失败: ${error.message}</td></tr>`;
    }
}

// 清除用户筛选
function clearUsersFilters() {
    document.getElementById('users-username-input').value = '';
    document.getElementById('users-agent-input').value = '';
    document.getElementById('users-role-select').value = '';
    document.getElementById('users-status-select').value = '';
    loadUsers();
}

// 切换用户筛选区域显示
function toggleUsersFilters() {
    const filters = document.getElementById('users-search-filters');
    const toggleBtn = document.getElementById('users-toggle-filters-btn');
    
    if (filters.style.display === 'none') {
        filters.style.display = 'grid';
        toggleBtn.textContent = '收起';
    } else {
        filters.style.display = 'none';
        toggleBtn.textContent = '展开';
    }
}

// 添加用户
async function addUser(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const userData = {
        username: formData.get('username'),
        password: formData.get('password'),
        agent_name: formData.get('agent_name'),
        role: formData.get('role'),
        status: formData.get('status')
    };

    try {
        const response = await authFetch(CONFIG.buildUrl(CONFIG.USER.CREATE), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '添加用户失败');
        }

        const newUser = await response.json();
        closeModal('add-user-modal');
        event.target.reset();
        loadUsers();
        
        Message.success('用户添加成功！');
    } catch (error) {
        Message.error('添加用户失败: ' + error.message);
    }
}

// 显示编辑用户模态框
async function editUserModal(userId) {
    try {
        const response = await authFetch(CONFIG.buildUrl(CONFIG.USER.DETAIL, { id: userId }));
        if (!response.ok) throw new Error('获取用户信息失败');

        const user = await response.json();
        
        // 填充表单数据
        document.querySelector('#edit-user-form input[name="username"]').value = user.username;
        document.querySelector('#edit-user-form input[name="agent_name"]').value = user.agent_name || '';
        document.querySelector('#edit-user-form select[name="role"]').value = user.role;
        
        // 设置用户ID
        document.querySelector('#edit-user-form').dataset.editingId = userId;
        
        showModal('edit-user-modal');
    } catch (error) {
        Message.error('获取用户信息失败: ' + error.message);
    }
}

// 编辑用户
async function editUser(event) {
    event.preventDefault();
    
    const userId = event.target.dataset.editingId;
    if (!userId) {
        Message.error('用户ID不存在');
        return;
    }
    
    const formData = new FormData(event.target);
    const userData = {
        username: formData.get('username'),
        agent_name: formData.get('agent_name'),
        role: formData.get('role')
    };
    
    // 如果有新密码，则更新密码
    const newPassword = formData.get('password');
    if (newPassword) {
        userData.password = newPassword;
    }

    try {
        const response = await authFetch(CONFIG.buildUrl(CONFIG.USER.UPDATE, { id: userId }), {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '修改用户失败');
        }

        const updatedUser = await response.json();
        closeModal('edit-user-modal');
        event.target.reset();
        loadUsers();
        
        Message.success('用户修改成功！');
    } catch (error) {
        Message.error('修改用户失败: ' + error.message);
    }
}

// 删除用户
async function deleteUser(userId) {
    const confirmed = await Message.confirm('确定要删除这个用户吗？此操作不可恢复。');
    if (!confirmed) {
        return;
    }
    
    try {
        const response = await authFetch(CONFIG.buildUrl(CONFIG.USER.DELETE, { id: userId }), {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '删除失败');
        }
        
        const result = await response.json();
        Message.success(result.message || '用户删除成功！');
        
        // 刷新用户列表
        loadUsers();
        
    } catch (error) {
        Message.error('删除用户失败: ' + error.message);
    }
}

// 更新代理人选择器
async function updateAgentSelector() {
    try {
        const response = await authFetch(CONFIG.buildUrl(CONFIG.USER.LIST));
        if (!response.ok) throw new Error('加载用户列表失败');

        const users = await response.json();
        const agentSelect = document.getElementById('agent-select');
        
        // 提取所有有姓名的用户（包括管理员和代理人）并去重
        const agents = [...new Set(users
            .filter(user => user.agent_name) // 只要有姓名的用户
            .map(user => user.agent_name)
        )];
        
        agentSelect.innerHTML = '<option value="">选择代理人</option>' +
            agents.map(agent => `
                <option value="${agent}">${agent}</option>
            `).join('');
    } catch (error) {
        // 如果失败，保持当前的选择器状态
    }
}

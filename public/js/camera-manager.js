// 相机管理模块

// 加载相机列表
async function loadCameras() {
    try {
        const camerasList = document.getElementById('cameras-list');
        camerasList.innerHTML = '<div class="loading">加载中</div>';

        // 获取当前筛选条件
        const statusSelect = document.getElementById('status-select');
        const statusValue = statusSelect ? statusSelect.value : '';
        
        // 构建查询参数
        const queryParams = {};
        if (statusValue) queryParams.status = statusValue;
        
        // 如果是代理人，自动筛选自己的相机
        if (currentUser.role === 'agent' && currentUser.agent_name) {
            queryParams.agent = currentUser.agent_name;
        }
        
        const queryString = CONFIG.buildQueryString(queryParams);
        const response = await fetch(CONFIG.buildUrl(CONFIG.CAMERA.LIST) + queryString);
        if (!response.ok) throw new Error('网络响应不正常');

        const cameras = await response.json();
        currentCameras = cameras;
        renderCameras(cameras);
    } catch (error) {
        document.getElementById('cameras-list').innerHTML = `
            <div class="error">加载相机失败: ${error.message}</div>
        `;
    }
}

// 渲染相机列表
function renderCameras(cameras) {
    const camerasList = document.getElementById('cameras-list');
    
    if (cameras.length === 0) {
        camerasList.innerHTML = '<div class="loading">没有找到相机</div>';
        return;
    }

    // 获取当前状态筛选值
    const statusSelect = document.getElementById('status-select');
    const statusValue = statusSelect ? statusSelect.value : '';
    
    // 过滤相机列表（考虑状态筛选）
    const filteredCameras = cameras.filter(camera => {
        if (!statusValue) return true; // 没有状态筛选，显示所有
        
        // 使用动态状态（如果存在），否则使用原始状态
        const displayStatus = camera.dynamic_status || camera.status;
        return displayStatus === statusValue;
    });

    if (filteredCameras.length === 0) {
        camerasList.innerHTML = '<div class="loading">没有找到符合条件的相机</div>';
        return;
    }

    camerasList.innerHTML = filteredCameras.map(camera => {
        // 使用动态状态（如果存在），否则使用原始状态
        const displayStatus = camera.dynamic_status || camera.status;
        const statusText = getStatusText(displayStatus);
        const statusClass = `status-${displayStatus}`;
        
        // 状态提示信息
        const statusHint = camera.dynamic_status_reason ? 
            `<div class="status-hint">${camera.dynamic_status_reason}</div>` : '';
        
        return `
        <div class="camera-card">
            <div class="camera-header">
                <div class="camera-code">${camera.camera_code}</div>
                <div class="status-badge ${statusClass}">
                    ${statusText}
                </div>
            </div>
            <div class="camera-info">
                <p><strong>${camera.brand} ${camera.model}</strong></p>
                <p>序列号: ${camera.serial_number || '无'}</p>
                <p>代理人: ${camera.agent || '无'}</p>
                ${camera.description ? `<p>描述: ${camera.description}</p>` : ''}
                ${statusHint}
            </div>
            <div class="camera-actions">
                <button onclick="deleteCamera(${camera.id})" class="btn-red">删除</button>
                <button onclick="editCamera(${camera.id})" class="btn-blue">修改</button>
                ${displayStatus === 'available' ? 
                    `<button onclick="showCreateRentalModal(${camera.id})" class="btn-green">租赁</button>` : 
                    `<button disabled class="btn-disabled">不可租赁</button>`
                }
            </div>
        </div>
        `;
    }).join('');
}

// 搜索相机
async function searchCameras() {
    const searchInput = document.getElementById('search-input');
    const serialNumberInput = document.getElementById('serial-number-input');
    const agentInput = document.getElementById('agent-input');
    const statusSelect = document.getElementById('status-select');
    const rentalDateInput = document.getElementById('rental-date');
    const returnDateInput = document.getElementById('return-date');
    
    const searchTerm = searchInput.value.trim();
    const serialNumberTerm = serialNumberInput.value.trim();
    const agentTerm = agentInput.value.trim();
    const statusValue = statusSelect.value;
    const rentalDate = rentalDateInput.value;
    const returnDate = returnDateInput.value;

    try {
        const camerasList = document.getElementById('cameras-list');
        camerasList.innerHTML = '<div class="loading">搜索中</div>';

        // 构建查询参数
        const queryParams = {};
        if (searchTerm) queryParams.code = searchTerm;
        if (serialNumberTerm) queryParams.serial_number = serialNumberTerm;
        if (statusValue) queryParams.status = statusValue;
        if (rentalDate) queryParams.rental_date = rentalDate;
        if (returnDate) queryParams.return_date = returnDate;
        
        // 代理人只能搜索自己的相机
        if (currentUser.role === 'agent') {
            queryParams.agent = currentUser.agent_name;
        } else if (agentTerm) {
            // 管理员可以搜索指定代理人的相机
            queryParams.agent = agentTerm;
        }
        
        const queryString = CONFIG.buildQueryString(queryParams);
        const response = await fetch(CONFIG.buildUrl(CONFIG.CAMERA.LIST) + queryString);

        if (!response.ok) throw new Error('搜索失败');

        const cameras = await response.json();
        renderCameras(cameras);
    } catch (error) {
        document.getElementById('cameras-list').innerHTML = `
            <div class="error">搜索失败: ${error.message}</div>
        `;
    }
}


// 添加新相机
async function addCamera(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const cameraData = {
        camera_code: formData.get('camera_code'),
        brand: formData.get('brand'),
        model: formData.get('model'),
        serial_number: formData.get('serial_number'),
        agent: formData.get('agent'),
        status: formData.get('status'),
        description: formData.get('description')
    };

    // 检查是添加还是修改
    const editingId = form.dataset.editingId;
    
    try {
        let response;
        if (editingId) {
            // 修改相机
            response = await authFetch(CONFIG.buildUrl(CONFIG.CAMERA.DETAIL, { id: editingId }), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(cameraData)
            });
        } else {
            // 添加相机
            response = await authFetch(CONFIG.buildUrl(CONFIG.CAMERA.CREATE), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(cameraData)
            });
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || (editingId ? '修改相机失败' : '添加相机失败'));
        }

        const result = await response.json();
        closeModal('add-camera-modal');
        resetCameraForm();
        loadCameras();
        
        Message.success(editingId ? '相机修改成功！' : '相机添加成功！');
    } catch (error) {
        Message.error((editingId ? '修改相机失败: ' : '添加相机失败: ') + error.message);
    }
}

// 重置相机表单
function resetCameraForm() {
    const form = document.getElementById('add-camera-form');
    form.reset();
    form.dataset.editingId = '';
    document.querySelector('#add-camera-modal h3').textContent = '添加新相机';
    
    // 强制重新加载代理人选择器
    forceUpdateAgentSelector();
}

// 强制更新代理人选择器
function forceUpdateAgentSelector() {
    const agentSelect = document.getElementById('agent-select');
    if (!agentSelect) {
        console.log('代理人选择器未找到');
        return;
    }
    
    console.log('强制更新代理人选择器，当前用户:', currentUser);
    
    // 如果是代理人，直接设置代理人名称
    if (currentUser && currentUser.role === 'agent' && currentUser.agent_name) {
        console.log('代理人模式，直接设置代理人:', currentUser.agent_name);
        agentSelect.innerHTML = `<option value="${currentUser.agent_name}">${currentUser.agent_name}</option>`;
        agentSelect.value = currentUser.agent_name;
        console.log('代理人选择器强制设置完成，当前值:', agentSelect.value);
    } else {
        // 管理员模式，调用原有的更新函数
        updateAgentSelector();
    }
}

// 修改相机
async function editCamera(cameraId) {
    try {
        const response = await fetch(CONFIG.buildUrl(CONFIG.CAMERA.DETAIL, { id: cameraId }));
        if (!response.ok) throw new Error('获取相机信息失败');

        const camera = await response.json();
        
        // 填充表单数据
        document.querySelector('#add-camera-form input[name="camera_code"]').value = camera.camera_code;
        document.querySelector('#add-camera-form input[name="brand"]').value = camera.brand;
        document.querySelector('#add-camera-form input[name="model"]').value = camera.model;
        document.querySelector('#add-camera-form input[name="serial_number"]').value = camera.serial_number || '';
        document.querySelector('#add-camera-form select[name="status"]').value = camera.status;
        document.querySelector('#add-camera-form textarea[name="description"]').value = camera.description || '';
        
        // 使用强制更新代理人选择器，避免权限问题
        forceUpdateAgentSelector();
        const agentSelect = document.getElementById('agent-select');
        if (camera.agent) {
            agentSelect.value = camera.agent;
        }
        
        // 修改表单标题和提交行为
        document.querySelector('#add-camera-modal h3').textContent = '修改相机信息';
        document.querySelector('#add-camera-form').dataset.editingId = cameraId;
        
        showModal('add-camera-modal');
    } catch (error) {
        Message.error('获取相机信息失败: ' + error.message);
    }
}

// 清除所有筛选
function clearAllFilters() {
    document.getElementById('search-input').value = '';
    document.getElementById('serial-number-input').value = '';
    document.getElementById('agent-input').value = '';
    document.getElementById('status-select').value = '';
    document.getElementById('rental-date').value = '';
    document.getElementById('return-date').value = '';
    loadCameras();
}

// 切换筛选区域显示
function toggleFilters() {
    const filters = document.getElementById('search-filters');
    const toggleBtn = document.getElementById('toggle-filters-btn');
    
    if (filters.style.display === 'none') {
        filters.style.display = 'grid';
        toggleBtn.textContent = '收起';
    } else {
        filters.style.display = 'none';
        toggleBtn.textContent = '展开';
    }
}

// 更新代理人选择器
async function updateAgentSelector() {
    try {
        const agentSelect = document.getElementById('agent-select');
        if (!agentSelect) {
            console.log('代理人选择器未找到');
            return;
        }
        
        console.log('更新代理人选择器，当前用户:', currentUser);
        
        // 如果是代理人，自动设置自己的代理人名称
        if (currentUser && currentUser.role === 'agent') {
            console.log('代理人模式，设置代理人:', currentUser.agent_name);
            agentSelect.innerHTML = `<option value="${currentUser.agent_name}">${currentUser.agent_name}</option>`;
            // 设置选择器的值为当前代理人
            agentSelect.value = currentUser.agent_name;
            console.log('代理人选择器设置完成，当前值:', agentSelect.value);
            return;
        }
        
        // 管理员需要获取所有代理人列表
        console.log('管理员模式，获取代理人列表');
        const response = await authFetch(CONFIG.buildUrl(CONFIG.USER.LIST));
        if (!response.ok) throw new Error('获取用户列表失败');
        
        const users = await response.json();
        const agents = users.filter(user => user.role === 'agent' && user.agent_name);
        
        console.log('获取到的代理人列表:', agents);
        
        // 清空现有选项
        agentSelect.innerHTML = '<option value="">请选择代理人</option>';
        
        // 添加代理人选项
        agents.forEach(agent => {
            const option = document.createElement('option');
            option.value = agent.agent_name;
            option.textContent = agent.agent_name;
            agentSelect.appendChild(option);
        });
        
        console.log('代理人选择器更新完成，选项数量:', agentSelect.options.length);
        
    } catch (error) {
        console.error('更新代理人选择器失败:', error);
        // 如果获取失败，至少显示当前用户的代理人名称
        const agentSelect = document.getElementById('agent-select');
        if (currentUser && currentUser.role === 'agent' && currentUser.agent_name) {
            agentSelect.innerHTML = `<option value="${currentUser.agent_name}">${currentUser.agent_name}</option>`;
            agentSelect.value = currentUser.agent_name;
        } else {
            agentSelect.innerHTML = '<option value="">获取代理人失败</option>';
        }
    }
}


// 删除相机
async function deleteCamera(cameraId) {
    // 确认删除
    const confirmed = await Message.confirm('确定要删除这个相机吗？此操作不可恢复。');
    if (!confirmed) {
        return;
    }

    try {
        const response = await authFetch(CONFIG.buildUrl(CONFIG.CAMERA.DELETE, { id: cameraId }), {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '删除相机失败');
        }

        const result = await response.json();
        Message.success('相机删除成功！');
        loadCameras(); // 重新加载相机列表
    } catch (error) {
        Message.error('删除相机失败: ' + error.message);
    }
}

// 将函数暴露到全局作用域
window.deleteCamera = deleteCamera;
window.editCamera = editCamera;
window.showCreateRentalModal = showCreateRentalModal;

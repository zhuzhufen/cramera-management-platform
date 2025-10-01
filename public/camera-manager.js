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
        console.error('加载相机失败:', error);
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

    camerasList.innerHTML = cameras.map(camera => `
        <div class="camera-card">
            <div class="camera-header">
                <div class="camera-code">${camera.camera_code}</div>
                <div class="status-badge status-${camera.status}">
                    ${getStatusText(camera.status)}
                </div>
            </div>
            <div class="camera-info">
                <p><strong>${camera.brand} ${camera.model}</strong></p>
                <p>序列号: ${camera.serial_number || '无'}</p>
                <p>代理人: ${camera.agent || '无'}</p>
                ${camera.description ? `<p>描述: ${camera.description}</p>` : ''}
            </div>
            <div class="camera-actions">
                <button onclick="showCameraDetail(${camera.id})" class="btn-white">详情</button>
                <button onclick="editCamera(${camera.id})" class="btn-blue">修改</button>
                ${camera.status === 'available' ? 
                    `<button onclick="showCreateRentalModal(${camera.id})" class="btn-green">租赁</button>` : 
                    `<button disabled class="btn-disabled">不可租赁</button>`
                }
            </div>
        </div>
    `).join('');
}

// 搜索相机
async function searchCameras() {
    const searchInput = document.getElementById('search-input');
    const agentInput = document.getElementById('agent-input');
    const statusSelect = document.getElementById('status-select');
    const rentalDateInput = document.getElementById('rental-date');
    const returnDateInput = document.getElementById('return-date');
    
    const searchTerm = searchInput.value.trim();
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
        console.error('搜索相机失败:', error);
        document.getElementById('cameras-list').innerHTML = `
            <div class="error">搜索失败: ${error.message}</div>
        `;
    }
}

// 显示相机详情
async function showCameraDetail(cameraId) {
    try {
        const response = await fetch(CONFIG.buildUrl(CONFIG.CAMERA.DETAIL, { id: cameraId }));
        if (!response.ok) throw new Error('获取相机详情失败');

        const camera = await response.json();
        
        // 检查权限：代理人只能查看自己相机的详情
        if (currentUser.role === 'agent' && camera.agent !== currentUser.agent_name) {
            alert('您没有权限查看此相机的详情');
            return;
        }
        
        const detailContent = document.getElementById('camera-detail-content');
        detailContent.innerHTML = `
            <div class="camera-info">
                <p><strong>相机编码:</strong> ${camera.camera_code}</p>
                <p><strong>品牌型号:</strong> ${camera.brand} ${camera.model}</p>
                <p><strong>序列号:</strong> ${camera.serial_number || '无'}</p>
                <p><strong>代理人:</strong> ${camera.agent || '无'}</p>
                <p><strong>描述:</strong> ${camera.description || '无'}</p>
            </div>
            ${camera.rental_history ? `
                <div class="rental-history">
                    <h4>租赁历史</h4>
                    <div class="rental-table-container">
                        <table class="rental-table">
                            <thead>
                                <tr>
                                    <th>客户</th>
                                    <th>租赁日期</th>
                                    <th>归还日期</th>
                                    <th>状态</th>
                                </tr>
                            </thead>
                            <tbody id="rental-table-body">
                                ${camera.rental_history.slice(0, 5).map(rental => {
                                    const currentStatus = calculateRentalStatus(rental);
                                    return `
                                        <tr>
                                            <td>${rental.customer_name}</td>
                                            <td>${formatDate(rental.rental_date)}</td>
                                            <td>${formatDate(rental.return_date)}</td>
                                            <td>
                                                <span class="status-badge status-${currentStatus}">
                                                    ${getRentalStatusText(currentStatus)}
                                                </span>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                    ${camera.rental_history.length > 5 ? `
                        <div class="pagination-controls">
                            <div class="pagination-info">
                                显示 1-5 条，共 ${camera.rental_history.length} 条记录
                            </div>
                            <div class="pagination-buttons">
                                <button class="pagination-btn" onclick="showRentalPage(1, ${cameraId})" disabled>1</button>
                                ${camera.rental_history.length > 10 ? `<button class="pagination-btn" onclick="showRentalPage(2, ${cameraId})">2</button>` : ''}
                                ${camera.rental_history.length > 15 ? `<button class="pagination-btn" onclick="showRentalPage(3, ${cameraId})">3</button>` : ''}
                                ${camera.rental_history.length > 20 ? `<button class="pagination-btn" onclick="showRentalPage(4, ${cameraId})">4</button>` : ''}
                                ${camera.rental_history.length > 25 ? `<button class="pagination-btn" onclick="showRentalPage(5, ${cameraId})">5</button>` : ''}
                            </div>
                        </div>
                    ` : ''}
                </div>
            ` : ''}
        `;

        showModal('camera-detail-modal');
    } catch (error) {
        console.error('显示相机详情失败:', error);
        alert('获取相机详情失败: ' + error.message);
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
        
        alert(editingId ? '相机修改成功！' : '相机添加成功！');
    } catch (error) {
        console.error(editingId ? '修改相机失败:' : '添加相机失败:', error);
        alert((editingId ? '修改相机失败: ' : '添加相机失败: ') + error.message);
    }
}

// 重置相机表单
function resetCameraForm() {
    const form = document.getElementById('add-camera-form');
    form.reset();
    form.dataset.editingId = '';
    document.querySelector('#add-camera-modal h3').textContent = '添加新相机';
    
    // 重新加载代理人选择器
    updateAgentSelector();
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
        
        // 更新代理人选择器并设置值
        await updateAgentSelector();
        const agentSelect = document.getElementById('agent-select');
        if (camera.agent) {
            agentSelect.value = camera.agent;
        }
        
        // 修改表单标题和提交行为
        document.querySelector('#add-camera-modal h3').textContent = '修改相机信息';
        document.querySelector('#add-camera-form').dataset.editingId = cameraId;
        
        showModal('add-camera-modal');
    } catch (error) {
        console.error('获取相机信息失败:', error);
        alert('获取相机信息失败: ' + error.message);
    }
}

// 清除所有筛选
function clearAllFilters() {
    document.getElementById('search-input').value = '';
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
        if (!agentSelect) return;
        
        // 如果是代理人，自动设置自己的代理人名称
        if (currentUser.role === 'agent') {
            agentSelect.innerHTML = `<option value="${currentUser.agent_name}">${currentUser.agent_name}</option>`;
            return;
        }
        
        // 管理员需要获取所有代理人列表
        const response = await authFetch(CONFIG.buildUrl(CONFIG.USER.LIST));
        if (!response.ok) throw new Error('获取用户列表失败');
        
        const users = await response.json();
        const agents = users.filter(user => user.role === 'agent' && user.agent_name);
        
        // 清空现有选项
        agentSelect.innerHTML = '<option value="">请选择代理人</option>';
        
        // 添加代理人选项
        agents.forEach(agent => {
            const option = document.createElement('option');
            option.value = agent.agent_name;
            option.textContent = agent.agent_name;
            agentSelect.appendChild(option);
        });
        
    } catch (error) {
        console.error('更新代理人选择器失败:', error);
        // 如果获取失败，至少显示当前用户的代理人名称
        const agentSelect = document.getElementById('agent-select');
        if (currentUser.role === 'agent' && currentUser.agent_name) {
            agentSelect.innerHTML = `<option value="${currentUser.agent_name}">${currentUser.agent_name}</option>`;
        } else {
            agentSelect.innerHTML = '<option value="">获取代理人失败</option>';
        }
    }
}

// 显示租赁历史分页
async function showRentalPage(page, cameraId) {
    try {
        const response = await fetch(CONFIG.buildUrl(CONFIG.CAMERA.DETAIL, { id: cameraId }));
        if (!response.ok) throw new Error('获取相机详情失败');

        const camera = await response.json();
        const pageSize = 5;
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const pageRentals = camera.rental_history.slice(startIndex, endIndex);
        
        const tableBody = document.getElementById('rental-table-body');
        tableBody.innerHTML = pageRentals.map(rental => {
            const currentStatus = calculateRentalStatus(rental);
            return `
                <tr>
                    <td>${rental.customer_name}</td>
                    <td>${formatDate(rental.rental_date)}</td>
                    <td>${formatDate(rental.return_date)}</td>
                    <td>
                        <span class="status-badge status-${currentStatus}">
                            ${getRentalStatusText(currentStatus)}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
        
        // 更新分页信息
        const totalPages = Math.ceil(camera.rental_history.length / pageSize);
        const paginationInfo = document.querySelector('.pagination-info');
        const paginationButtons = document.querySelector('.pagination-buttons');
        
        paginationInfo.textContent = `显示 ${startIndex + 1}-${Math.min(endIndex, camera.rental_history.length)} 条，共 ${camera.rental_history.length} 条记录`;
        
        // 更新按钮状态
        paginationButtons.innerHTML = '';
        for (let i = 1; i <= totalPages; i++) {
            paginationButtons.innerHTML += `
                <button class="pagination-btn ${i === page ? 'active' : ''}" onclick="showRentalPage(${i}, ${cameraId})">
                    ${i}
                </button>
            `;
        }
    } catch (error) {
        console.error('切换分页失败:', error);
        alert('切换分页失败: ' + error.message);
    }
}

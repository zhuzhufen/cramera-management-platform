// 租赁管理模块

// 加载租赁记录
async function loadRentals() {
    try {
        const tableBody = document.getElementById('rentals-table-body');
        tableBody.innerHTML = '<tr><td colspan="9" class="loading">加载中</td></tr>';

        const response = await fetch(CONFIG.buildUrl(CONFIG.RENTAL.LIST));
        if (!response.ok) throw new Error('加载租赁记录失败');

        const rentals = await response.json();
        renderRentalsTable(rentals);
    } catch (error) {
        const tableBody = document.getElementById('rentals-table-body');
        tableBody.innerHTML = `<tr><td colspan="9" class="error">加载租赁记录失败: ${error.message}</td></tr>`;
    }
}

// 渲染租赁记录表格
function renderRentalsTable(rentals) {
    const tableBody = document.getElementById('rentals-table-body');
    
    if (rentals.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="9" class="loading">没有租赁记录</td></tr>';
        return;
    }

    tableBody.innerHTML = rentals.map(rental => {
        const currentStatus = calculateRentalStatus(rental);
        return `
            <tr>
                <td>${rental.camera_code}</td>
                <td>${rental.brand} ${rental.model}</td>
                <td>${rental.agent || '无'}</td>
                <td>${rental.customer_name}</td>
                <td>${rental.customer_phone || '无'}</td>
                <td>${formatDate(rental.rental_date)}</td>
                <td>${formatDate(rental.return_date)}</td>
                <td>
                    <span class="status-badge status-${currentStatus}">
                        ${getRentalStatusText(currentStatus)}
                    </span>
                </td>
                <td>
                    <button onclick="deleteRental(${rental.id})" class="btn-red">删除</button>
                </td>
            </tr>
        `;
    }).join('');
}

// 搜索租赁记录
async function searchRentals() {
    const cameraInput = document.getElementById('rentals-camera-input');
    const agentInput = document.getElementById('rentals-agent-input');
    const customerInput = document.getElementById('rentals-customer-input');
    const startDateInput = document.getElementById('rentals-start-date');
    const endDateInput = document.getElementById('rentals-end-date');
    const statusSelect = document.getElementById('rentals-status-select');
    
    const cameraTerm = cameraInput.value.trim();
    const agentTerm = agentInput.value.trim();
    const customerTerm = customerInput.value.trim();
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;
    const statusValue = statusSelect.value;

    try {
        const tableBody = document.getElementById('rentals-table-body');
        tableBody.innerHTML = '<tr><td colspan="9" class="loading">搜索中</td></tr>';

        // 构建查询参数
        const queryParams = {};
        if (cameraTerm) queryParams.camera_code = cameraTerm;
        if (agentTerm) queryParams.agent = agentTerm;
        if (customerTerm) queryParams.customer_name = customerTerm;
        if (startDate) queryParams.start_date = startDate;
        if (endDate) queryParams.end_date = endDate;
        
        const queryString = CONFIG.buildQueryString(queryParams);
        const response = await fetch(CONFIG.buildUrl(CONFIG.RENTAL.LIST) + queryString);
        if (!response.ok) throw new Error('搜索失败');

        let rentals = await response.json();
        
        // 客户端状态筛选（因为后端接口没有状态筛选）
        if (statusValue) {
            rentals = rentals.filter(rental => {
                const currentStatus = calculateRentalStatus(rental);
                return currentStatus === statusValue;
            });
        }

        renderRentalsTable(rentals);
    } catch (error) {
        const tableBody = document.getElementById('rentals-table-body');
        tableBody.innerHTML = `<tr><td colspan="9" class="error">搜索失败: ${error.message}</td></tr>`;
    }
}

// 清除租赁记录筛选
function clearRentalsFilters() {
    document.getElementById('rentals-camera-input').value = '';
    document.getElementById('rentals-agent-input').value = '';
    document.getElementById('rentals-customer-input').value = '';
    document.getElementById('rentals-start-date').value = '';
    document.getElementById('rentals-end-date').value = '';
    document.getElementById('rentals-status-select').value = '';
    loadRentals();
}

// 切换租赁记录筛选区域显示
function toggleRentalsFilters() {
    const filters = document.getElementById('rentals-search-filters');
    const toggleBtn = document.getElementById('rentals-toggle-filters-btn');
    
    if (filters.style.display === 'none') {
        filters.style.display = 'grid';
        toggleBtn.textContent = '收起';
    } else {
        filters.style.display = 'none';
        toggleBtn.textContent = '展开';
    }
}

// 删除租赁记录
async function deleteRental(rentalId) {
    if (!confirm('确定要删除这条租赁记录吗？此操作不可恢复。')) {
        return;
    }
    
    try {
        const response = await fetch(CONFIG.buildUrl(CONFIG.RENTAL.DELETE, { id: rentalId }), {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '删除失败');
        }
        
        const result = await response.json();
        alert(result.message || '租赁记录删除成功！');
        
        // 刷新租赁记录列表
        loadRentals();
        // 刷新日历显示
        loadCalendar();
        // 刷新相机列表（可能影响相机状态）
        loadCameras();
        
    } catch (error) {
        alert('删除租赁记录失败: ' + error.message);
    }
}

// 显示创建租赁模态框
async function showCreateRentalModal(cameraId) {
    // 如果 currentCameras 未定义或为空，重新加载相机列表
    if (!currentCameras || currentCameras.length === 0) {
        try {
            const response = await fetch(CONFIG.buildUrl(CONFIG.CAMERA.LIST));
            if (!response.ok) throw new Error('加载相机列表失败');
            currentCameras = await response.json();
        } catch (error) {
            alert('相机信息加载失败: ' + error.message);
            return;
        }
    }
    
    selectedCameraForRental = currentCameras.find(c => c.id == cameraId);
    
    if (!selectedCameraForRental) {
        alert('相机信息加载失败');
        return;
    }

    // 显示相机信息
    document.getElementById('rental-camera-info').textContent = 
        `${selectedCameraForRental.camera_code} - ${selectedCameraForRental.brand} ${selectedCameraForRental.model}`;

    // 加载客户列表
    try {
        const response = await fetch(CONFIG.buildUrl(CONFIG.CUSTOMER.LIST));
        if (!response.ok) throw new Error('加载客户列表失败');

        const customers = await response.json();
        const customerSelect = document.querySelector('#create-rental-form select[name="customer_id"]');
        
        customerSelect.innerHTML = '<option value="">选择客户</option>' +
            customers.map(customer => `
                <option value="${customer.id}">${customer.name} - ${customer.phone}</option>
            `).join('');

        // 设置默认日期
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
        
        document.querySelector('#create-rental-form input[name="rental_date"]').value = today;
        document.querySelector('#create-rental-form input[name="return_date"]').value = tomorrow;
        
        // 检查时间冲突
        updateRentalButtonState();

        showModal('create-rental-modal');
    } catch (error) {
        alert('加载客户列表失败: ' + error.message);
    }
}

// 检查租赁时间冲突
async function checkRentalConflict() {
    const rentalDate = document.querySelector('#create-rental-form input[name="rental_date"]').value;
    const returnDate = document.querySelector('#create-rental-form input[name="return_date"]').value;
    
    if (!rentalDate || !returnDate || !selectedCameraForRental) {
        return false;
    }
    
    try {
        const queryString = CONFIG.buildQueryString({ 
            camera_id: selectedCameraForRental.id, 
            rental_date: rentalDate, 
            return_date: returnDate 
        });
        const response = await fetch(CONFIG.buildUrl(CONFIG.RENTAL.CHECK_CONFLICT) + queryString);
        if (!response.ok) throw new Error('检查时间冲突失败');
        
        const result = await response.json();
        return result.hasConflict;
    } catch (error) {
        return false;
    }
}

// 检查时间冲突并更新按钮状态
async function updateRentalButtonState() {
    const rentalDate = document.querySelector('#create-rental-form input[name="rental_date"]').value;
    const returnDate = document.querySelector('#create-rental-form input[name="return_date"]').value;
    
    if (rentalDate && returnDate && selectedCameraForRental) {
        // 检查时间冲突
        const hasConflict = await checkRentalConflict();
        const submitButton = document.querySelector('#create-rental-form button[type="submit"]');
        
        if (hasConflict) {
            submitButton.disabled = true;
            submitButton.textContent = '时间冲突，无法创建租赁';
            submitButton.style.background = '#dc3545';
        } else {
            submitButton.disabled = false;
            submitButton.textContent = '创建租赁';
            submitButton.style.background = '';
        }
    }
}

// 创建租赁
async function createRental(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const newCustomerForm = document.getElementById('new-customer-form');
    const isNewCustomer = newCustomerForm.style.display === 'block';
    
    let customerId = parseInt(formData.get('customer_id'));
    
    // 如果是新增客户，先创建客户
    if (isNewCustomer) {
        const newCustomerData = {
            name: formData.get('new_customer_name'),
            phone: formData.get('new_customer_phone'),
            email: formData.get('new_customer_email'),
            id_card: formData.get('new_customer_id_card'),
            address: formData.get('new_customer_address')
        };
        
        // 验证必填字段
        if (!newCustomerData.name || !newCustomerData.phone) {
            alert('请填写客户姓名和手机号码');
            return;
        }
        
        try {
            const customerResponse = await fetch(CONFIG.buildUrl(CONFIG.CUSTOMER.CREATE), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newCustomerData)
            });
            
            if (!customerResponse.ok) throw new Error('创建客户失败');
            
            const newCustomer = await customerResponse.json();
            customerId = newCustomer.id;
        } catch (error) {
            alert('创建客户失败: ' + error.message);
            return;
        }
    }
    
    // 验证客户选择
    if (!customerId) {
        alert('请选择客户或新增客户');
        return;
    }
    
    const rentalData = {
        camera_id: selectedCameraForRental.id,
        customer_id: customerId,
        rental_date: formData.get('rental_date'),
        return_date: formData.get('return_date')
    };

    try {
        const response = await fetch(CONFIG.buildUrl(CONFIG.RENTAL.CREATE), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(rentalData)
        });

        if (!response.ok) throw new Error('创建租赁失败');

        const newRental = await response.json();
        closeModal('create-rental-modal');
        event.target.reset();
        
        // 重置客户选择状态
        toggleNewCustomerForm();
        
        // 刷新相关数据
        loadCameras();
        loadCalendar();
        loadRentals();
        
        alert('租赁创建成功！');
    } catch (error) {
        alert('创建租赁失败: ' + error.message);
    }
}

// 切换新增客户表单显示
function toggleNewCustomerForm() {
    const newCustomerForm = document.getElementById('new-customer-form');
    const customerSelect = document.querySelector('#create-rental-form select[name="customer_id"]');
    const addCustomerBtn = document.getElementById('add-customer-btn');
    
    if (newCustomerForm.style.display === 'none') {
        // 显示新增客户表单
        newCustomerForm.style.display = 'block';
        customerSelect.disabled = true;
        addCustomerBtn.textContent = '选择现有客户';
        addCustomerBtn.style.background = '#6c757d';
        
        // 清空表单
        document.querySelectorAll('#new-customer-form input, #new-customer-form textarea').forEach(input => {
            input.value = '';
        });
    } else {
        // 隐藏新增客户表单
        newCustomerForm.style.display = 'none';
        customerSelect.disabled = false;
        addCustomerBtn.textContent = '新增客户';
        addCustomerBtn.style.background = '';
    }
}

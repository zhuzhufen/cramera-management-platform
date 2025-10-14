// 租赁管理模块

// 加载租赁记录
async function loadRentals() {
    try {
        const tableBody = document.getElementById('rentals-table-body');
        tableBody.innerHTML = '<tr><td colspan="9" class="loading">加载中</td></tr>';

        const response = await authFetch(CONFIG.buildUrl(CONFIG.RENTAL.LIST));
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
                    <div class="action-buttons">
                        <button onclick="showExtendRentalModal(${rental.id})" class="btn-orange">延期</button>
                        <button onclick="showModifyDatesModal(${rental.id})" class="btn-blue">修改日期</button>
                        <button onclick="deleteRental(${rental.id})" class="btn-red">删除</button>
                    </div>
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
        const response = await authFetch(CONFIG.buildUrl(CONFIG.RENTAL.LIST) + queryString);
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
    const confirmed = await Message.confirm('确定要删除这条租赁记录吗？此操作不可恢复。');
    if (!confirmed) {
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
        Message.success(result.message || '租赁记录删除成功！');
        
        // 刷新租赁记录列表
        loadRentals();
        // 刷新日历显示
        loadCalendar();
        // 刷新相机列表（可能影响相机状态）
        loadCameras();
        
    } catch (error) {
        Message.error('删除租赁记录失败: ' + error.message);
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
            Message.error('相机信息加载失败: ' + error.message);
            return;
        }
    }
    
    selectedCameraForRental = currentCameras.find(c => c.id == cameraId);
    
    if (!selectedCameraForRental) {
        Message.error('相机信息加载失败');
        return;
    }

    // 显示相机信息
    document.getElementById('rental-camera-info').textContent = 
        `${selectedCameraForRental.camera_code} - ${selectedCameraForRental.brand} ${selectedCameraForRental.model}`;

    // 设置默认日期
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    
    document.querySelector('#create-rental-form input[name="rental_date"]').value = today;
    document.querySelector('#create-rental-form input[name="return_date"]').value = tomorrow;
    
    // 清空客户信息表单
    document.querySelector('#create-rental-form input[name="customer_name"]').value = '';
    document.querySelector('#create-rental-form input[name="customer_phone"]').value = '';
    
    // 强制重新初始化日期选择器
    setTimeout(() => {
        const rentalDateInput = $('input[name="rental_date"]');
        const returnDateInput = $('input[name="return_date"]');
        
        if (rentalDateInput.length && returnDateInput.length) {
            // 重新初始化日期选择器
            rentalDateInput.datepicker('destroy');
            returnDateInput.datepicker('destroy');
            
            // 租赁日期选择器
            rentalDateInput.datepicker({
                format: 'yyyy-mm-dd',
                language: 'zh-CN',
                autoclose: true,
                todayHighlight: true
            }).on('changeDate', function(e) {
                console.log('租赁日期变更:', e.date);
                updateRentalButtonState();
            });
            
            // 归还日期选择器
            returnDateInput.datepicker({
                format: 'yyyy-mm-dd',
                language: 'zh-CN',
                autoclose: true,
                todayHighlight: true
            }).on('changeDate', function(e) {
                console.log('归还日期变更:', e.date);
                updateRentalButtonState();
            });
            
            // 添加input事件监听器
            rentalDateInput.on('input', function() {
                setTimeout(updateRentalButtonState, 100);
            });
            
            returnDateInput.on('input', function() {
                setTimeout(updateRentalButtonState, 100);
            });
        }
    }, 100);
    
    // 检查时间冲突
    updateRentalButtonState();

    showModal('create-rental-modal');
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
    
    // 获取客户信息
    const customerName = formData.get('customer_name');
    const customerPhone = formData.get('customer_phone');
    
    // 验证必填字段
    if (!customerName || !customerPhone) {
        Message.warning('请填写客户姓名和手机号码');
        return;
    }
    
    const rentalData = {
        camera_id: selectedCameraForRental.id,
        customer_name: customerName,
        customer_phone: customerPhone,
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
        
        // 刷新相关数据
        loadCameras();
        loadCalendar();
        loadRentals();
        
        Message.success('租赁创建成功！');
    } catch (error) {
        Message.error('创建租赁失败: ' + error.message);
    }
}

// 显示延期租赁模态框
async function showExtendRentalModal(rentalId) {
    try {
        // 获取租赁记录详情
        const response = await authFetch(CONFIG.buildUrl(CONFIG.RENTAL.LIST));
        if (!response.ok) throw new Error('获取租赁记录失败');
        
        const rentals = await response.json();
        const rental = rentals.find(r => r.id == rentalId);
        
        if (!rental) {
            Message.error('租赁记录未找到');
            return;
        }
        
        // 设置模态框内容
        document.getElementById('extend-rental-info').textContent = 
            `${rental.camera_code} - ${rental.brand} ${rental.model} (${rental.customer_name})`;
        
        document.getElementById('extend-current-return-date').textContent = 
            formatDate(rental.return_date);
        
        // 设置新的归还日期（默认为当前归还日期+1天）
        const currentReturnDate = new Date(rental.return_date);
        const newReturnDate = new Date(currentReturnDate);
        newReturnDate.setDate(newReturnDate.getDate() + 1);
        
        const newReturnDateInput = document.getElementById('extend-new-return-date');
        newReturnDateInput.value = newReturnDate.toISOString().split('T')[0];
        newReturnDateInput.min = new Date(currentReturnDate.getTime() + 86400000).toISOString().split('T')[0]; // 至少比当前日期晚一天
        
        // 初始化日期选择器
        setTimeout(() => {
            const dateInput = $('#extend-new-return-date');
            if (dateInput.length) {
                dateInput.datepicker('destroy');
                dateInput.datepicker({
                    format: 'yyyy-mm-dd',
                    language: 'zh-CN',
                    autoclose: true,
                    todayHighlight: true,
                    startDate: new Date(currentReturnDate.getTime() + 86400000) // 至少比当前日期晚一天
                });
            }
        }, 100);
        
        // 存储当前租赁ID
        document.getElementById('extend-rental-modal').dataset.rentalId = rentalId;
        
        showModal('extend-rental-modal');
    } catch (error) {
        Message.error('加载租赁信息失败: ' + error.message);
    }
}

// 延期租赁
async function extendRental(event) {
    event.preventDefault();
    
    const rentalId = document.getElementById('extend-rental-modal').dataset.rentalId;
    const newReturnDate = document.getElementById('extend-new-return-date').value;
    
    if (!newReturnDate) {
        Message.warning('请选择新的归还日期');
        return;
    }
    
    try {
        const token = localStorage.getItem('authToken');
        if (!token) {
            Message.error('请先登录');
            return;
        }
        
        const response = await fetch(CONFIG.buildUrl(CONFIG.RENTAL.EXTEND, { id: rentalId }), {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                new_return_date: newReturnDate
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '延期失败');
        }
        
        const result = await response.json();
        closeModal('extend-rental-modal');
        
        // 刷新相关数据
        loadRentals();
        loadCalendar();
        loadCameras();
        
        Message.success(result.message || '租赁延期成功！');
    } catch (error) {
        if (error.message.includes('冲突')) {
            Message.error('延期失败: ' + error.message);
        } else {
            Message.error('延期失败: ' + error.message);
        }
    }
}

// 显示修改日期模态框
async function showModifyDatesModal(rentalId) {
    try {
        // 获取租赁记录详情
        const response = await authFetch(CONFIG.buildUrl(CONFIG.RENTAL.LIST));
        if (!response.ok) throw new Error('获取租赁记录失败');
        
        const rentals = await response.json();
        const rental = rentals.find(r => r.id == rentalId);
        
        if (!rental) {
            Message.error('租赁记录未找到');
            return;
        }
        
        // 设置模态框内容
        document.getElementById('modify-dates-rental-info').textContent = 
            `${rental.camera_code} - ${rental.brand} ${rental.model} (${rental.customer_name})`;
        
        document.getElementById('modify-dates-current-rental-date').textContent = 
            formatDate(rental.rental_date);
        document.getElementById('modify-dates-current-return-date').textContent = 
            formatDate(rental.return_date);
        
        // 设置新的日期
        const newRentalDateInput = document.getElementById('modify-dates-new-rental-date');
        const newReturnDateInput = document.getElementById('modify-dates-new-return-date');
        
        newRentalDateInput.value = rental.rental_date;
        newReturnDateInput.value = rental.return_date;
        
        // 初始化日期选择器
        setTimeout(() => {
            const rentalDateInput = $('#modify-dates-new-rental-date');
            const returnDateInput = $('#modify-dates-new-return-date');
            
            if (rentalDateInput.length && returnDateInput.length) {
                rentalDateInput.datepicker('destroy');
                returnDateInput.datepicker('destroy');
                
                rentalDateInput.datepicker({
                    format: 'yyyy-mm-dd',
                    language: 'zh-CN',
                    autoclose: true,
                    todayHighlight: true
                });
                
                returnDateInput.datepicker({
                    format: 'yyyy-mm-dd',
                    language: 'zh-CN',
                    autoclose: true,
                    todayHighlight: true
                });
            }
        }, 100);
        
        // 存储当前租赁ID
        document.getElementById('modify-dates-modal').dataset.rentalId = rentalId;
        
        showModal('modify-dates-modal');
    } catch (error) {
        Message.error('加载租赁信息失败: ' + error.message);
    }
}

// 修改租赁日期
async function modifyRentalDates(event) {
    event.preventDefault();
    
    const rentalId = document.getElementById('modify-dates-modal').dataset.rentalId;
    const newRentalDate = document.getElementById('modify-dates-new-rental-date').value;
    const newReturnDate = document.getElementById('modify-dates-new-return-date').value;
    
    if (!newRentalDate || !newReturnDate) {
        Message.warning('请选择新的租赁日期和归还日期');
        return;
    }
    
    if (newRentalDate >= newReturnDate) {
        Message.warning('归还日期必须晚于租赁日期');
        return;
    }
    
    try {
        const token = localStorage.getItem('authToken');
        if (!token) {
            Message.error('请先登录');
            return;
        }
        
        const response = await fetch(CONFIG.buildUrl(CONFIG.RENTAL.UPDATE_DATES, { id: rentalId }), {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                new_rental_date: newRentalDate,
                new_return_date: newReturnDate
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '修改日期失败');
        }
        
        const result = await response.json();
        closeModal('modify-dates-modal');
        
        // 刷新相关数据
        loadRentals();
        loadCalendar();
        loadCameras();
        
        Message.success(result.message || '租赁日期修改成功！');
    } catch (error) {
        if (error.message.includes('冲突')) {
            Message.error('修改日期失败: ' + error.message);
        } else {
            Message.error('修改日期失败: ' + error.message);
        }
    }
}

// 将函数暴露到全局作用域
window.showCreateRentalModal = showCreateRentalModal;
window.deleteRental = deleteRental;
window.showExtendRentalModal = showExtendRentalModal;
window.showModifyDatesModal = showModifyDatesModal;
window.extendRental = extendRental;
window.modifyRentalDates = modifyRentalDates;

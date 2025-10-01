// 日历管理模块

// 加载租赁日历
async function loadCalendar() {
    try {
        const queryParams = { month: currentMonth, year: currentYear };
        if (selectedCameraId) {
            queryParams.camera_id = selectedCameraId;
        }
        
        const queryString = CONFIG.buildQueryString(queryParams);
        const response = await fetch(CONFIG.buildUrl(CONFIG.RENTAL.CALENDAR) + queryString);
        if (!response.ok) throw new Error('加载日历数据失败');

        const rentals = await response.json();
        
        // 保存租赁数据到全局变量，供后续使用
        window.currentRentals = rentals;
        
        renderCalendar(rentals);
        
        // 更新相机选择器
        updateCameraSelector();
    } catch (error) {
        console.error('加载日历失败:', error);
        document.getElementById('calendar').innerHTML = `
            <div class="error">加载日历失败: ${error.message}</div>
        `;
    }
}

// 更新相机选择器
function updateCameraSelector() {
    const calendarCameraSelect = document.getElementById('calendar-camera-select');
    const calendarAgentSelect = document.getElementById('calendar-agent-select');
    
    if (currentCameras.length > 0) {
        const cameraOptions = '<option value="">所有相机</option>' +
            currentCameras.map(camera => `
                <option value="${camera.id}" ${selectedCameraId == camera.id ? 'selected' : ''}>
                    ${camera.agent ? `【${camera.agent}】` : ''}${camera.camera_code} - ${camera.brand} ${camera.model}
                </option>
            `).join('');
        
        calendarCameraSelect.innerHTML = cameraOptions;
        
        // 更新代理人选择器 - 从相机列表中提取代理人并去重
        const agents = [...new Set(currentCameras.map(camera => camera.agent).filter(agent => agent))];
        const agentOptions = '<option value="">所有代理人</option>' +
            agents.map(agent => `
                <option value="${agent}">${agent}</option>
            `).join('');
        
        calendarAgentSelect.innerHTML = agentOptions;
    } else {
        calendarCameraSelect.innerHTML = '<option value="">没有找到相机</option>';
        calendarAgentSelect.innerHTML = '<option value="">没有找到代理人</option>';
    }
}

// 渲染日历
function renderCalendar(rentals) {
    const calendarElement = document.getElementById('calendar');
    const firstDay = new Date(currentYear, currentMonth - 1, 1);
    const lastDay = new Date(currentYear, currentMonth, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    // 更新月份显示
    document.getElementById('current-month').textContent = 
        `${currentYear}年${currentMonth}月`;

    let calendarHTML = `
        <div class="calendar-weekdays">
            <div class="weekday">日</div>
            <div class="weekday">一</div>
            <div class="weekday">二</div>
            <div class="weekday">三</div>
            <div class="weekday">四</div>
            <div class="weekday">五</div>
            <div class="weekday">六</div>
        </div>
        <div class="calendar-days">
    `;

    // 添加空白日期
    for (let i = 0; i < startingDay; i++) {
        calendarHTML += `<div class="calendar-day empty"></div>`;
    }

    // 添加日期
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const currentDate = new Date(dateStr);
        
        // 修复日期比较逻辑：处理时区问题，确保正确比较日期
        const dayRentals = rentals.filter(rental => {
            // 将日期转换为本地日期字符串进行比较，避免时区问题
            const rentalStart = new Date(rental.rental_date);
            const rentalEnd = new Date(rental.return_date);
            
            // 转换为本地日期字符串进行比较
            const currentDateStr = currentDate.toISOString().split('T')[0];
            const rentalStartStr = rentalStart.toISOString().split('T')[0];
            const rentalEndStr = rentalEnd.toISOString().split('T')[0];
            
            // 检查当前日期是否在租赁期间内（包含开始和结束日期）
            return currentDateStr >= rentalStartStr && currentDateStr <= rentalEndStr;
        });

        // 根据租赁状态设置不同的样式类
        let dayClass = 'calendar-day';
        let hasRental = false;
        
        if (dayRentals.length > 0) {
            hasRental = true;
            // 检查租赁状态
            const hasActiveRental = dayRentals.some(rental => rental.status === 'active');
            const hasCompletedRental = dayRentals.some(rental => rental.status === 'completed');
            
            if (hasActiveRental) {
                dayClass += ' active-rental'; // 进行中的租赁 - 绿色
            } else if (hasCompletedRental) {
                dayClass += ' completed-rental'; // 已完成的租赁 - 浅绿色
            } else {
                dayClass += ' rented'; // 其他状态的租赁 - 红色
            }
        }

        calendarHTML += `
            <div class="${dayClass}" data-day="${day}" data-date="${dateStr}">
                <div class="day-number">${day}</div>
                <div class="rental-content">
                    ${renderDayRentals(dayRentals, dateStr)}
                </div>
            </div>
        `;
    }

    calendarHTML += '</div>';
    calendarElement.innerHTML = calendarHTML;
    
    // 添加点击事件监听器
    addCalendarEventListeners();
}

// 渲染每日租赁记录
function renderDayRentals(dayRentals, dateStr) {
    if (dayRentals.length === 0) {
        return '';
    }
    
    // 如果有租赁记录，只显示"+数字"格式
    const rentalCount = dayRentals.length;
    
    return `
        <div class="rental-more" data-date="${dateStr}">
            +${rentalCount}
        </div>
    `;
}

// 添加日历事件监听器
function addCalendarEventListeners() {
    // 点击"+数字"显示具体记录
    document.querySelectorAll('.rental-more').forEach(element => {
        element.addEventListener('click', function(e) {
            e.stopPropagation();
            const dateStr = this.getAttribute('data-date');
            showRentalsForDate(dateStr);
        });
    });
    
    // 点击租赁记录显示详情
    document.querySelectorAll('.rental-event').forEach(element => {
        element.addEventListener('click', function(e) {
            e.stopPropagation();
            const rentalId = this.getAttribute('data-rental-id');
            if (rentalId) {
                showRentalDetail(rentalId);
            }
        });
    });
}

// 显示指定日期的所有租赁记录
function showRentalsForDate(dateStr) {
    const date = new Date(dateStr);
    const formattedDate = formatDate(dateStr);
    
    // 获取该日期的所有租赁记录
    const dayRentals = getAllRentalsForDate(dateStr);
    
    if (dayRentals.length === 0) {
        Message.info(`${formattedDate} 没有租赁记录`);
        return;
    }
    
    // 创建模态框内容
    const modalContent = `
        <div class="date-rentals-modal">
            <h3>${formattedDate} 租赁记录</h3>
            <div class="rentals-list">
                ${dayRentals.map(rental => {
                    const agentCameraText = rental.agent ? `${rental.agent}-${rental.camera_code}` : rental.camera_code;
                    const customerText = rental.customer_name ? `${rental.customer_name}-${rental.customer_phone || ''}` : '';
                    const statusText = getRentalStatusText(rental.status);
                    
                    return `
                        <div class="rental-item" data-rental-id="${rental.id}">
                            <div class="rental-info">
                                <div class="rental-line">${agentCameraText}</div>
                                <div class="rental-line">${customerText}</div>
                                <div class="rental-status">${statusText}</div>
                            </div>
                            <button class="btn-view-detail" onclick="showRentalDetail(${rental.id})">查看详情</button>
                        </div>
                    `;
                }).join('')}
            </div>
            <div class="modal-actions">
                <button class="btn-secondary" onclick="closeModal('date-rentals-modal')">关闭</button>
            </div>
        </div>
    `;
    
    // 创建并显示模态框
    showCustomModal('date-rentals-modal', modalContent);
}

// 获取指定日期的所有租赁记录
function getAllRentalsForDate(dateStr) {
    // 这里需要从服务器获取该日期的所有租赁记录
    // 由于当前实现中rentals数据已经加载，我们可以从全局变量中获取
    // 在实际应用中，可能需要调用API获取更准确的数据
    return window.currentRentals ? window.currentRentals.filter(rental => {
        const rentalStart = new Date(rental.rental_date);
        const rentalEnd = new Date(rental.return_date);
        const currentDate = new Date(dateStr);
        
        const currentDateStr = currentDate.toISOString().split('T')[0];
        const rentalStartStr = rentalStart.toISOString().split('T')[0];
        const rentalEndStr = rentalEnd.toISOString().split('T')[0];
        
        return currentDateStr >= rentalStartStr && currentDateStr <= rentalEndStr;
    }) : [];
}

// 显示租赁详情
function showRentalDetail(rentalId) {
    // 这里可以调用现有的租赁详情显示功能
    // 由于当前代码中没有直接的租赁详情显示功能，我们可以显示一个简单的详情模态框
    // 在实际应用中，可以调用现有的租赁详情API
    
    // 获取租赁记录
    const rental = window.currentRentals ? window.currentRentals.find(r => r.id == rentalId) : null;
    
    if (!rental) {
        Message.error('未找到租赁记录');
        return;
    }
    
    const modalContent = `
        <div class="rental-detail-modal">
            <h3>租赁详情</h3>
            <div class="rental-detail-content">
                <div class="detail-row">
                    <label>相机信息:</label>
                    <span>${rental.camera_code} - ${rental.brand} ${rental.model}</span>
                </div>
                <div class="detail-row">
                    <label>代理人:</label>
                    <span>${rental.agent || '无'}</span>
                </div>
                <div class="detail-row">
                    <label>租赁人:</label>
                    <span>${rental.customer_name}</span>
                </div>
                <div class="detail-row">
                    <label>联系方式:</label>
                    <span>${rental.customer_phone || '无'}</span>
                </div>
                <div class="detail-row">
                    <label>租赁日期:</label>
                    <span>${formatDate(rental.rental_date)}</span>
                </div>
                <div class="detail-row">
                    <label>归还日期:</label>
                    <span>${formatDate(rental.return_date)}</span>
                </div>
                <div class="detail-row">
                    <label>状态:</label>
                    <span class="status-badge status-${rental.status}">${getRentalStatusText(rental.status)}</span>
                </div>
            </div>
            <div class="modal-actions">
                <button class="btn-secondary" onclick="closeModal('rental-detail-modal')">关闭</button>
            </div>
        </div>
    `;
    
    showCustomModal('rental-detail-modal', modalContent);
}

// 显示自定义模态框
function showCustomModal(modalId, content) {
    // 检查是否已存在模态框
    let modal = document.getElementById(modalId);
    if (!modal) {
        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="modal-content">
            ${content}
        </div>
    `;
    
    showModal(modalId);
}

// 日历导航
function navigateMonth(direction) {
    currentMonth += direction;
    
    if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
    } else if (currentMonth < 1) {
        currentMonth = 12;
        currentYear--;
    }
    
    loadCalendar();
}

// 日历筛选功能
async function searchCalendarCameras() {
    const cameraSelect = document.getElementById('calendar-camera-select');
    const agentSelect = document.getElementById('calendar-agent-select');
    
    const cameraId = cameraSelect.value;
    const agentValue = agentSelect.value;

    try {
        // 构建查询参数
        const queryParams = {};
        if (cameraId) queryParams.id = cameraId;
        if (agentValue) queryParams.agent = agentValue;
        
        const queryString = CONFIG.buildQueryString(queryParams);
        const response = await fetch(CONFIG.buildUrl(CONFIG.CAMERA.LIST) + queryString);

        if (!response.ok) throw new Error('搜索失败');

        const cameras = await response.json();
        
        // 更新日历相机选择器
        updateCalendarCameraSelector(cameras);
        
        // 保持当前选择的相机
        // selectedCameraId 保持不变
        
        // 重新加载日历
        loadCalendar();
    } catch (error) {
        console.error('搜索相机失败:', error);
        Message.error('搜索失败: ' + error.message);
    }
}

// 更新日历页面的相机选择器
function updateCalendarCameraSelector(cameras) {
    const calendarCameraSelect = document.getElementById('calendar-camera-select');
    if (cameras.length > 0) {
        calendarCameraSelect.innerHTML = '<option value="">所有相机</option>' +
            cameras.map(camera => `
                <option value="${camera.id}" ${selectedCameraId == camera.id ? 'selected' : ''}>
                    ${camera.camera_code} - ${camera.brand} ${camera.model}
                </option>
            `).join('');
    } else {
        calendarCameraSelect.innerHTML = '<option value="">没有找到相机</option>';
    }
}

// 代理人联动相机功能
function updateCameraSelectorByAgent(agentValue) {
    const cameraSelect = document.getElementById('calendar-camera-select');
    
    if (!agentValue) {
        // 如果没有选择代理人，显示所有相机
        updateCameraSelector();
        return;
    }
    
    // 根据代理人筛选相机
    const filteredCameras = currentCameras.filter(camera => camera.agent === agentValue);
    
    if (filteredCameras.length > 0) {
        cameraSelect.innerHTML = '<option value="">所有相机</option>' +
            filteredCameras.map(camera => `
                <option value="${camera.id}" ${selectedCameraId == camera.id ? 'selected' : ''}>
                    ${camera.camera_code} - ${camera.brand} ${camera.model}
                </option>
            `).join('');
    } else {
        cameraSelect.innerHTML = '<option value="">没有找到相机</option>';
    }
}

// 清除日历筛选
function clearCalendarFilters() {
    document.getElementById('calendar-camera-select').value = '';
    document.getElementById('calendar-agent-select').value = '';
    
    // 重置相机选择器
    updateCameraSelector();
    selectedCameraId = '';
    
    // 重新加载日历
    loadCalendar();
}

// 切换日历筛选区域显示
function toggleCalendarFilters() {
    const filters = document.getElementById('calendar-search-filters');
    const toggleBtn = document.getElementById('calendar-toggle-filters-btn');
    
    if (filters.style.display === 'none') {
        filters.style.display = 'grid';
        toggleBtn.textContent = '收起';
    } else {
        filters.style.display = 'none';
        toggleBtn.textContent = '展开';
    }
}

// 格式化日期
function formatDate(dateString) {
    const date = new Date(dateString);
    return `${date.getFullYear()}年${(date.getMonth() + 1).toString().padStart(2, '0')}月${date.getDate().toString().padStart(2, '0')}日`;
}

// 获取租赁状态文本
function getRentalStatusText(status) {
    const statusMap = {
        'active': '租赁中',
        'completed': '已结束',
        'cancelled': '已取消',
        'upcoming': '即将开始'
    };
    return statusMap[status] || status;
}

// 计算租赁状态
function calculateRentalStatus(rental) {
    const today = new Date();
    const rentalStart = new Date(rental.rental_date);
    const rentalEnd = new Date(rental.return_date);
    
    if (rental.status === 'cancelled') {
        return 'cancelled';
    }
    
    if (today < rentalStart) {
        return 'upcoming';
    } else if (today > rentalEnd) {
        return 'completed';
    } else {
        return 'active';
    }
}

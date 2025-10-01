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
            <div class="${dayClass}" data-day="${day}">
                <div class="day-number">${day}</div>
                ${dayRentals.map(rental => {
                    // 构建显示文本，过滤掉undefined和空值
                    const agentCameraParts = [];
                    if (rental.agent) agentCameraParts.push(`${rental.agent}-`);
                    if (rental.camera_code) agentCameraParts.push(rental.camera_code);
                    
                    const customerParts = [];
                    if (rental.customer_name) customerParts.push(`${rental.customer_name}-`);
                    if (rental.customer_phone) customerParts.push(rental.customer_phone);
                    
                    const agentCameraText = agentCameraParts.join(' ');
                    const customerText = customerParts.join(' ');
                    const titleText = `${agentCameraParts.join(' ')} - ${customerParts.join(' ')} (${getRentalStatusText(rental.status)})`;
                    
                    return `
                        <div class="rental-event" title="${titleText}">
                            ${agentCameraText ? `<div class="rental-line">${agentCameraText}</div>` : ''}
                            ${customerText ? `<div class="rental-line">${customerText}</div>` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    calendarHTML += '</div>';
    calendarElement.innerHTML = calendarHTML;
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

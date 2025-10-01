// 主应用入口文件
// 全局变量
let currentCameras = [];
let currentMonth = new Date().getMonth() + 1;
let currentYear = new Date().getFullYear();
let selectedCameraForRental = null;
let selectedCameraId = ''; // 用于日历筛选
let currentUser = null;
let authToken = localStorage.getItem('authToken');

// DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// 初始化应用
async function initializeApp() {
    setupEventListeners();
    
    // 检查登录状态
    if (authToken) {
        try {
            await checkAuth();
        } catch (error) {
            console.error('认证检查失败:', error);
            logout();
        }
    } else {
        showLogin();
    }
}

// 检查认证状态
async function checkAuth() {
    try {
        const response = await fetch(CONFIG.buildUrl('/auth/me'), {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error('认证失败');
        }
        
        const data = await response.json();
        currentUser = data.user;
        showApp();
    } catch (error) {
        throw error;
    }
}

// 显示登录界面
function showLogin() {
    document.getElementById('login-container').style.display = 'flex';
    document.getElementById('app-container').style.display = 'none';
}

// 显示主应用界面
function showApp() {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('app-container').style.display = 'block';
    
    // 更新用户信息 - 显示姓名（手机号）-角色
    const roleText = currentUser.role === 'admin' ? '管理员' : '代理人';
    document.getElementById('current-user').textContent = 
        `${currentUser.agent_name || currentUser.username} (${currentUser.username})-${roleText}`;
    
    // 根据用户角色调整界面
    adjustUIForUserRole();
    
    // 根据屏幕尺寸设置筛选区域默认状态
    initializeFiltersState();
    
    // 加载数据
    loadCameras();
    loadCalendar();
    loadRentals();
}

// 根据用户角色调整界面
function adjustUIForUserRole() {
    const addCameraBtn = document.getElementById('add-camera-btn');
    const agentInput = document.getElementById('agent-input');
    const rentalsAgentInput = document.getElementById('rentals-agent-input');
    const usersTab = document.querySelector('[data-tab="users"]');
    
    if (currentUser.role === 'agent') {
        // 代理人只能看到自己的数据
        if (addCameraBtn) addCameraBtn.style.display = 'none';
        if (agentInput) agentInput.style.display = 'none';
        if (rentalsAgentInput) rentalsAgentInput.style.display = 'none';
        if (usersTab) usersTab.style.display = 'none';
        
        // 隐藏代理人筛选标签
        const agentLabels = document.querySelectorAll('label[for*="agent"]');
        agentLabels.forEach(label => {
            if (label.textContent.includes('代理人')) {
                label.style.display = 'none';
            }
        });
    } else {
        // 管理员可以看到所有功能
        if (addCameraBtn) addCameraBtn.style.display = 'block';
        if (agentInput) agentInput.style.display = 'block';
        if (rentalsAgentInput) rentalsAgentInput.style.display = 'block';
        if (usersTab) usersTab.style.display = 'block';
    }
}

// 设置事件监听器
function setupEventListeners() {
    // 登录表单提交
    document.getElementById('login-form').addEventListener('submit', login);
    
    // 退出按钮
    document.getElementById('logout-btn').addEventListener('click', logout);
    
    // 标签页切换
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            switchTab(this.dataset.tab);
        });
    });

    // 搜索功能
    document.getElementById('search-btn').addEventListener('click', searchCameras);
    document.getElementById('search-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchCameras();
        }
    });

    // 添加相机按钮
    document.getElementById('add-camera-btn').addEventListener('click', function() {
        resetCameraForm();
        showModal('add-camera-modal');
    });

    // 添加相机表单提交
    document.getElementById('add-camera-form').addEventListener('submit', addCamera);

    // 创建租赁表单提交
    document.getElementById('create-rental-form').addEventListener('submit', createRental);

    // 日历导航
    document.getElementById('prev-month').addEventListener('click', function() {
        navigateMonth(-1);
    });
    document.getElementById('next-month').addEventListener('click', function() {
        navigateMonth(1);
    });

    // 日历相机筛选
    document.getElementById('calendar-camera-select').addEventListener('change', function() {
        selectedCameraId = this.value;
        loadCalendar();
    });

    // 新增客户按钮
    document.getElementById('add-customer-btn').addEventListener('click', function() {
        toggleNewCustomerForm();
    });

    // 清除筛选功能
    document.getElementById('clear-filter-btn').addEventListener('click', clearAllFilters);

    // 筛选区域折叠功能
    document.getElementById('toggle-filters-btn').addEventListener('click', toggleFilters);

    // 日历筛选功能
    document.getElementById('calendar-search-btn').addEventListener('click', searchCalendarCameras);
    document.getElementById('calendar-clear-filter-btn').addEventListener('click', clearCalendarFilters);
    document.getElementById('calendar-toggle-filters-btn').addEventListener('click', toggleCalendarFilters);
    
    // 代理人联动相机功能
    document.getElementById('calendar-agent-select').addEventListener('change', function() {
        updateCameraSelectorByAgent(this.value);
    });

    // 租赁记录筛选功能
    document.getElementById('rentals-search-btn').addEventListener('click', searchRentals);
    document.getElementById('rentals-clear-filter-btn').addEventListener('click', clearRentalsFilters);
    document.getElementById('rentals-toggle-filters-btn').addEventListener('click', toggleRentalsFilters);

    // 用户管理功能
    document.getElementById('users-search-btn').addEventListener('click', searchUsers);
    document.getElementById('users-clear-filter-btn').addEventListener('click', clearUsersFilters);
    document.getElementById('users-toggle-filters-btn').addEventListener('click', toggleUsersFilters);
    document.getElementById('add-user-btn').addEventListener('click', function() {
        showModal('add-user-modal');
    });

    // 用户表单提交
    document.getElementById('add-user-form').addEventListener('submit', addUser);
    document.getElementById('edit-user-form').addEventListener('submit', editUser);

    // 修改密码功能
    document.getElementById('change-password-btn').addEventListener('click', function() {
        showModal('change-password-modal');
    });
    document.getElementById('change-password-form').addEventListener('submit', changePassword);
    document.getElementById('new-password').addEventListener('input', checkPasswordStrength);
}

// 用户登录
async function login(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch(CONFIG.buildUrl('/auth/login'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '登录失败');
        }
        
        const data = await response.json();
        authToken = data.token;
        currentUser = data.user;
        
        // 保存token到localStorage
        localStorage.setItem('authToken', authToken);
        
        // 显示主应用界面
        showApp();
        
    } catch (error) {
        console.error('登录失败:', error);
        alert('登录失败: ' + error.message);
    }
}

// 用户退出
function logout() {
    currentUser = null;
    authToken = null;
    localStorage.removeItem('authToken');
    showLogin();
}

// 添加认证头部的fetch函数
async function authFetch(url, options = {}) {
    const headers = {
        'Authorization': `Bearer ${authToken}`,
        ...options.headers
    };
    
    return fetch(url, { ...options, headers });
}

// 切换标签页
function switchTab(tabName) {
    // 更新激活的标签按钮
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // 显示对应的内容
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');

    // 根据标签页加载数据
    switch(tabName) {
        case 'cameras':
            loadCameras();
            break;
        case 'calendar':
            loadCalendar();
            break;
        case 'rentals':
            loadRentals();
            break;
        case 'users':
            if (currentUser.role === 'admin') {
                loadUsers();
            } else {
                // 代理人不能访问用户管理，自动切换到相机管理
                switchTab('cameras');
                alert('您没有权限访问用户管理界面');
            }
            break;
    }
}

// 初始化筛选区域状态
function initializeFiltersState() {
    const filters = document.getElementById('search-filters');
    const toggleBtn = document.getElementById('toggle-filters-btn');
    const calendarFilters = document.getElementById('calendar-search-filters');
    const calendarToggleBtn = document.getElementById('calendar-toggle-filters-btn');
    const rentalsFilters = document.getElementById('rentals-search-filters');
    const rentalsToggleBtn = document.getElementById('rentals-toggle-filters-btn');
    const usersFilters = document.getElementById('users-search-filters');
    const usersToggleBtn = document.getElementById('users-toggle-filters-btn');
    
    // 检查是否为移动端（屏幕宽度小于768px）
    const isMobile = window.innerWidth < 768;
    
    if (isMobile) {
        // 移动端默认收拢
        filters.style.display = 'none';
        toggleBtn.textContent = '展开';
        calendarFilters.style.display = 'none';
        calendarToggleBtn.textContent = '展开';
        rentalsFilters.style.display = 'none';
        rentalsToggleBtn.textContent = '展开';
        usersFilters.style.display = 'none';
        usersToggleBtn.textContent = '展开';
    } else {
        // PC端默认展开
        filters.style.display = 'grid';
        toggleBtn.textContent = '收起';
        calendarFilters.style.display = 'grid';
        calendarToggleBtn.textContent = '收起';
        rentalsFilters.style.display = 'grid';
        rentalsToggleBtn.textContent = '收起';
        usersFilters.style.display = 'grid';
        usersToggleBtn.textContent = '收起';
    }
}

// 工具函数
function getStatusText(status) {
    const statusMap = {
        'available': '可用',
        'unavailable': '不可用'
    };
    return statusMap[status] || status;
}

function getRentalStatusText(status) {
    const statusMap = {
        'active': '进行中',
        'completed': '已完成',
        'cancelled': '已取消',
        'overdue': '逾期',
        'upcoming': '即将开始',
        'unknown': '未知'
    };
    return statusMap[status] || status;
}

// 格式化日期为年/月/日
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
}

// 根据时间自动计算租赁状态
function calculateRentalStatus(rental) {
    const today = new Date();
    const rentalDate = new Date(rental.rental_date);
    const returnDate = new Date(rental.return_date);
    
    // 如果租赁已经取消
    if (rental.status === 'cancelled') {
        return 'cancelled';
    }
    
    // 如果租赁已经完成
    if (rental.status === 'completed') {
        return 'completed';
    }
    
    // 如果今天在租赁日期之前
    if (today < rentalDate) {
        return 'upcoming'; // 即将开始
    }
    
    // 如果今天在租赁期间内
    if (today >= rentalDate && today <= returnDate) {
        return 'active'; // 进行中
    }
    
    // 如果今天超过归还日期，改为已结束
    if (today > returnDate) {
        return 'completed'; // 已结束（原逾期）
    }
    
    return rental.status || 'unknown';
}

function showModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// 点击模态框外部关闭
document.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
});

// 为日期输入添加事件监听器，检查时间冲突
document.addEventListener('DOMContentLoaded', function() {
    const rentalForm = document.getElementById('create-rental-form');
    if (rentalForm) {
        const rentalDateInput = rentalForm.querySelector('input[name="rental_date"]');
        const returnDateInput = rentalForm.querySelector('input[name="return_date"]');
        
        if (rentalDateInput && returnDateInput) {
            rentalDateInput.addEventListener('change', updateRentalButtonState);
            returnDateInput.addEventListener('change', updateRentalButtonState);
        }
    }
});

// 检查密码强度
function checkPasswordStrength() {
    const password = document.getElementById('new-password').value;
    const strengthFill = document.getElementById('strength-fill');
    const strengthText = document.getElementById('strength-text');
    
    // 密码要求检查
    const hasLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    
    // 更新要求列表
    updateRequirement('req-length', hasLength);
    updateRequirement('req-uppercase', hasUppercase);
    updateRequirement('req-lowercase', hasLowercase);
    updateRequirement('req-number', hasNumber);
    updateRequirement('req-special', hasSpecial);
    
    // 计算强度分数
    let strength = 0;
    if (hasLength) strength++;
    if (hasUppercase) strength++;
    if (hasLowercase) strength++;
    if (hasNumber) strength++;
    if (hasSpecial) strength++;
    
    // 更新强度显示
    strengthFill.className = 'strength-fill';
    switch(strength) {
        case 0:
        case 1:
            strengthFill.classList.add('weak');
            strengthText.textContent = '密码强度: 弱';
            break;
        case 2:
            strengthFill.classList.add('fair');
            strengthText.textContent = '密码强度: 一般';
            break;
        case 3:
            strengthFill.classList.add('good');
            strengthText.textContent = '密码强度: 良好';
            break;
        case 4:
        case 5:
            strengthFill.classList.add('strong');
            strengthText.textContent = '密码强度: 强';
            break;
    }
}

// 更新密码要求显示
function updateRequirement(elementId, isValid) {
    const element = document.getElementById(elementId);
    if (isValid) {
        element.classList.add('valid');
        element.classList.remove('invalid');
    } else {
        element.classList.add('invalid');
        element.classList.remove('valid');
    }
}

// 修改密码
async function changePassword(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const currentPassword = formData.get('current_password');
    const newPassword = formData.get('new_password');
    const confirmPassword = formData.get('confirm_password');
    
    // 验证密码强度
    if (!validatePasswordStrength(newPassword)) {
        alert('密码强度不足，请确保密码包含大小写字母、数字和特殊字符，且长度至少8位');
        return;
    }
    
    // 验证确认密码
    if (newPassword !== confirmPassword) {
        alert('新密码和确认密码不一致');
        return;
    }
    
    try {
        const response = await authFetch(CONFIG.buildUrl(CONFIG.AUTH.CHANGE_PASSWORD), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '修改密码失败');
        }
        
        const data = await response.json();
        closeModal('change-password-modal');
        event.target.reset();
        
        // 重置密码强度显示
        document.getElementById('strength-fill').className = 'strength-fill';
        document.getElementById('strength-text').textContent = '密码强度: 弱';
        
        alert('密码修改成功！');
        
    } catch (error) {
        console.error('修改密码失败:', error);
        alert('修改密码失败: ' + error.message);
    }
}

// 验证密码强度
function validatePasswordStrength(password) {
    const hasLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    
    return hasLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;
}

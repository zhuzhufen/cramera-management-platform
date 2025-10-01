// 全局配置
const CONFIG = {
    // API基础路径
    API_BASE_URL: '/cam/api',
    
    // 相机相关API路径
    CAMERA: {
        LIST: '/cameras',
        SEARCH: '/cameras/search',
        DETAIL: '/cameras/:id',
        CREATE: '/cameras',
        UPDATE_STATUS: '/cameras/:id/status',
        DELETE: '/cameras/:id'
    },
    
    // 客户相关API路径
    CUSTOMER: {
        LIST: '/customers',
        CREATE: '/customers'
    },
    
    // 租赁相关API路径
    RENTAL: {
        LIST: '/rentals',
        CALENDAR: '/rentals/calendar',
        CREATE: '/rentals',
        CHECK_CONFLICT: '/rentals/check-conflict',
        DELETE: '/rentals/:id'
    },
    
    // 认证相关API路径
    AUTH: {
        LOGIN: '/auth/login',
        ME: '/auth/me',
        CHANGE_PASSWORD: '/auth/change-password'
    },
    
    // 用户管理相关API路径
    USER: {
        LIST: '/users',
        DETAIL: '/users/:id',
        CREATE: '/users',
        UPDATE: '/users/:id',
        DELETE: '/users/:id'
    },
    
    // 构建完整API URL
    buildUrl: function(path, params = {}) {
        let url = this.API_BASE_URL + path;
        
        // 替换路径参数
        for (const [key, value] of Object.entries(params)) {
            url = url.replace(`:${key}`, value);
        }
        
        return url;
    },
    
    // 构建查询字符串
    buildQueryString: function(params = {}) {
        const queryParams = new URLSearchParams();
        
        for (const [key, value] of Object.entries(params)) {
            if (value !== null && value !== undefined && value !== '') {
                queryParams.append(key, value);
            }
        }
        
        const queryString = queryParams.toString();
        return queryString ? `?${queryString}` : '';
    }
};

// 消息提示工具
const Message = {
    // 显示成功消息
    success: function(message, duration = 3000) {
        this.show(message, 'success', duration);
    },
    
    // 显示错误消息
    error: function(message, duration = 5000) {
        this.show(message, 'danger', duration);
    },
    
    // 显示警告消息
    warning: function(message, duration = 4000) {
        this.show(message, 'warning', duration);
    },
    
    // 显示信息消息
    info: function(message, duration = 3000) {
        this.show(message, 'info', duration);
    },
    
    // 显示确认对话框
    confirm: function(message, confirmText = '确认', cancelText = '取消') {
        return new Promise((resolve) => {
            const modalId = 'confirm-modal-' + Date.now();
            
            // 创建模态窗口HTML
            const modalHtml = `
                <div id="${modalId}" class="modal">
                    <div class="modal-content">
                        <h3>确认操作</h3>
                        <div class="modal-body">
                            <p style="text-align: center; margin: 1rem 0; font-size: 1rem; color: #555;">${message}</p>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn-secondary" id="cancel-btn">${cancelText}</button>
                            <button type="button" class="btn-primary" id="confirm-btn">${confirmText}</button>
                        </div>
                    </div>
                </div>
            `;
            
            // 插入模态窗口到页面
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            const modal = document.getElementById(modalId);
            const confirmBtn = modal.querySelector('#confirm-btn');
            const cancelBtn = modal.querySelector('#cancel-btn');
            
            // 显示模态窗口
            setTimeout(() => {
                modal.classList.add('active');
            }, 10);
            
            const cleanup = () => {
                if (document.body.contains(modal)) {
                    modal.classList.remove('active');
                    setTimeout(() => {
                        if (document.body.contains(modal)) {
                            document.body.removeChild(modal);
                        }
                    }, 300);
                }
            };
            
            const handleConfirm = () => {
                cleanup();
                resolve(true);
            };
            
            const handleCancel = () => {
                cleanup();
                resolve(false);
            };
            
            confirmBtn.onclick = handleConfirm;
            cancelBtn.onclick = handleCancel;
            
            // 点击背景关闭
            modal.onclick = (e) => {
                if (e.target === modal) {
                    handleCancel();
                }
            };
            
            // 添加键盘事件支持
            const handleKeydown = (e) => {
                if (e.key === 'Escape') {
                    handleCancel();
                } else if (e.key === 'Enter') {
                    handleConfirm();
                }
            };
            
            document.addEventListener('keydown', handleKeydown);
            
            // 清理函数
            const enhancedCleanup = () => {
                document.removeEventListener('keydown', handleKeydown);
                cleanup();
            };
            
            // 更新事件处理函数使用增强的清理
            confirmBtn.onclick = () => {
                enhancedCleanup();
                resolve(true);
            };
            
            cancelBtn.onclick = () => {
                enhancedCleanup();
                resolve(false);
            };
            
            modal.onclick = (e) => {
                if (e.target === modal) {
                    enhancedCleanup();
                    resolve(false);
                }
            };
        });
    },
    
    // 显示Toast消息
    show: function(message, type = 'info', duration = 3000) {
        const toastId = 'toast-' + Date.now();
        const toastHtml = `
            <div id="${toastId}" class="toast align-items-center text-bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                    <div class="toast-body">
                        <i class="bi ${this.getIcon(type)} me-2"></i>
                        ${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            </div>
        `;
        
        const container = document.getElementById('toast-container');
        container.insertAdjacentHTML('beforeend', toastHtml);
        
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement, {
            delay: duration,
            autohide: true
        });
        
        toast.show();
        
        // 自动清理DOM
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    },
    
    // 获取图标类名
    getIcon: function(type) {
        const icons = {
            success: 'bi-check-circle-fill',
            danger: 'bi-exclamation-triangle-fill',
            warning: 'bi-exclamation-circle-fill',
            info: 'bi-info-circle-fill'
        };
        return icons[type] || 'bi-info-circle-fill';
    }
};

// 导出配置
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}

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

// 导出配置
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}

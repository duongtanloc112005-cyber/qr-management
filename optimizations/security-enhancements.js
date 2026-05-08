// 🛡️ SECURITY ENHANCEMENTS FOR QR MANAGEMENT SYSTEM
// Tối ưu hóa bảo mật và xử lý lỗi

class SecurityManager {
    constructor() {
        this.rateLimiter = new Map();
        this.suspiciousActivity = new Map();
        this.maxRequestsPerMinute = 100;
        this.maxRequestsPerHour = 1000;
    }

    // Input validation và sanitization
    validateInput(data, schema) {
        const errors = [];
        
        for (const [field, rules] of Object.entries(schema)) {
            const value = data[field];
            
            // Required check
            if (rules.required && (!value || value.toString().trim() === '')) {
                errors.push(`${field} là bắt buộc`);
                continue;
            }
            
            if (!value) continue;
            
            // Type check
            if (rules.type && typeof value !== rules.type) {
                errors.push(`${field} phải là ${rules.type}`);
                continue;
            }
            
            // Length check
            if (rules.maxLength && value.toString().length > rules.maxLength) {
                errors.push(`${field} không được vượt quá ${rules.maxLength} ký tự`);
                continue;
            }
            
            // Enum check
            if (rules.enum && !rules.enum.includes(value)) {
                errors.push(`${field} phải là một trong: ${rules.enum.join(', ')}`);
                continue;
            }
            
            // Pattern check
            if (rules.pattern && !rules.pattern.test(value.toString())) {
                errors.push(`${field} không đúng định dạng`);
                continue;
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // Sanitize input để ngăn XSS
    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        return input
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
            .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
            .replace(/<embed\b[^<]*>/gi, '')
            .replace(/<link\b[^<]*>/gi, '')
            .replace(/<meta\b[^<]*>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .trim();
    }

    // Rate limiting
    checkRateLimit(identifier, action = 'default') {
        const key = `${identifier}:${action}`;
        const now = Date.now();
        const minuteWindow = 60000; // 1 phút
        const hourWindow = 3600000; // 1 giờ
        
        if (!this.rateLimiter.has(key)) {
            this.rateLimiter.set(key, {
                minute: [],
                hour: []
            });
        }
        
        const data = this.rateLimiter.get(key);
        
        // Clean old entries
        data.minute = data.minute.filter(time => now - time < minuteWindow);
        data.hour = data.hour.filter(time => now - time < hourWindow);
        
        // Check limits
        if (data.minute.length >= this.maxRequestsPerMinute) {
            this.logSuspiciousActivity(identifier, 'Rate limit exceeded (minute)');
            return { allowed: false, reason: 'Quá nhiều yêu cầu trong 1 phút' };
        }
        
        if (data.hour.length >= this.maxRequestsPerHour) {
            this.logSuspiciousActivity(identifier, 'Rate limit exceeded (hour)');
            return { allowed: false, reason: 'Quá nhiều yêu cầu trong 1 giờ' };
        }
        
        // Add current request
        data.minute.push(now);
        data.hour.push(now);
        
        return { allowed: true };
    }

    // Log suspicious activity
    logSuspiciousActivity(identifier, activity) {
        const now = Date.now();
        const key = identifier;
        
        if (!this.suspiciousActivity.has(key)) {
            this.suspiciousActivity.set(key, []);
        }
        
        const activities = this.suspiciousActivity.get(key);
        activities.push({
            activity: activity,
            timestamp: now,
            ip: this.getClientIP()
        });
        
        // Keep only last 10 activities
        if (activities.length > 10) {
            activities.splice(0, activities.length - 10);
        }
        
        console.warn(`🚨 Suspicious activity from ${identifier}: ${activity}`);
    }

    // Get client IP (simplified)
    getClientIP() {
        // Trong môi trường thực tế, cần lấy từ request headers
        return 'unknown';
    }

    // Validate product data
    validateProductData(product) {
        const schema = {
            maGoc: { 
                type: 'string', 
                maxLength: 200, 
                required: true,
                pattern: /^[a-zA-Z0-9\s\-_=]+$/
            },
            trangThai: { 
                type: 'string', 
                required: true,
                enum: ['Bàn giao', 'In & thêu', 'Hoàn thiện', 'Đang xử lý', 'Đợi file', 'Thiếu hàng', 'Xử lý lỗi', 'Hoàn thành', 'Nhận hàng']
            },
            ghiChu: { 
                type: 'string', 
                maxLength: 1000,
                required: false
            },
            dotHang: { 
                type: 'string', 
                maxLength: 50,
                required: false
            },
            loaiHang: { 
                type: 'string', 
                maxLength: 100,
                required: false
            },
            loaiSX: { 
                type: 'string', 
                maxLength: 50,
                required: false
            }
        };
        
        return this.validateInput(product, schema);
    }

    // Clean up old rate limit data
    cleanup() {
        const now = Date.now();
        const maxAge = 3600000; // 1 giờ
        
        for (const [key, data] of this.rateLimiter.entries()) {
            data.minute = data.minute.filter(time => now - time < maxAge);
            data.hour = data.hour.filter(time => now - time < maxAge);
            
            if (data.minute.length === 0 && data.hour.length === 0) {
                this.rateLimiter.delete(key);
            }
        }
        
        // Clean suspicious activity
        for (const [key, activities] of this.suspiciousActivity.entries()) {
            const recentActivities = activities.filter(activity => 
                now - activity.timestamp < maxAge
            );
            
            if (recentActivities.length === 0) {
                this.suspiciousActivity.delete(key);
            } else {
                this.suspiciousActivity.set(key, recentActivities);
            }
        }
    }
}

// Error handling class
class ErrorHandler {
    constructor() {
        this.errorLog = [];
        this.maxLogSize = 1000;
    }

    // Log error với context
    logError(error, context = {}) {
        const errorEntry = {
            message: error.message || error.toString(),
            stack: error.stack,
            context: context,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        this.errorLog.push(errorEntry);
        
        // Giữ log size trong giới hạn
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog.splice(0, this.errorLog.length - this.maxLogSize);
        }
        
        // Gửi lên server nếu có WebSocket
        if (window.websocket && window.websocket.readyState === WebSocket.OPEN) {
            window.websocket.send(JSON.stringify({
                type: 'error_log',
                error: errorEntry
            }));
        }
        
        console.error('Error logged:', errorEntry);
    }

    // Handle WebSocket errors
    handleWebSocketError(error, context) {
        this.logError(error, {
            ...context,
            type: 'websocket_error'
        });
        
        // Show user-friendly message
        this.showUserError('Lỗi kết nối. Vui lòng thử lại.');
    }

    // Handle data processing errors
    handleDataError(error, context) {
        this.logError(error, {
            ...context,
            type: 'data_error'
        });
        
        this.showUserError('Lỗi xử lý dữ liệu. Vui lòng kiểm tra lại thông tin.');
    }

    // Show user-friendly error message
    showUserError(message) {
        // Tạo notification element
        const notification = document.createElement('div');
        notification.className = 'error-notification';
        notification.innerHTML = `
            <div class="error-content">
                <span class="error-icon">⚠️</span>
                <span class="error-message">${message}</span>
                <button class="error-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f8d7da;
            color: #721c24;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            max-width: 400px;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    // Get error statistics
    getErrorStats() {
        const now = Date.now();
        const last24Hours = this.errorLog.filter(error => 
            now - new Date(error.timestamp).getTime() < 86400000
        );
        
        const errorTypes = {};
        last24Hours.forEach(error => {
            const type = error.context.type || 'unknown';
            errorTypes[type] = (errorTypes[type] || 0) + 1;
        });
        
        return {
            totalErrors: this.errorLog.length,
            last24Hours: last24Hours.length,
            errorTypes: errorTypes
        };
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SecurityManager, ErrorHandler };
} else {
    window.SecurityManager = SecurityManager;
    window.ErrorHandler = ErrorHandler;
}


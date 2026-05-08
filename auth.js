// 🔐 Authentication System for QR Management

// Mapping module name to role
const MODULE_ROLE_MAP = {
    'khophoi': 'kho_phoi',
    'sanxuat': 'san_xuat',
    'thanhpham': 'thanh_pham',
    'donghang': 'dong_hang',
    'hangsan': 'hang_san',
    'hangton': 'hang_ton',
    'tonghop': 'admin',  // Tổng Hợp là admin
    'donhang': 'don_hang'  // Đơn Hàng
};

// Danh sách user/pass - sẽ được load từ server
let usersList = [];

// Load users từ server
async function loadUsers() {
    try {
        const response = await fetch('/users.json');
        usersList = await response.json();
        return usersList;
    } catch (error) {
        console.error('Error loading users:', error);
        // Fallback: default users
        usersList = [
            { username: "admin", password: "123", role: "admin", display: "Quản lý" },
            { username: "kho", password: "123", role: "kho_phoi", display: "Kho Phôi" },
            { username: "sx", password: "123", role: "san_xuat", display: "Sản Xuất" },
            { username: "tp", password: "123", role: "thanh_pham", display: "Thành Phẩm" },
            { username: "dong", password: "123", role: "dong_hang", display: "Đóng Hàng" },
            { username: "hangsan", password: "123", role: "hang_san", display: "Hàng Sẵn" },
            { username: "hangton", password: "123", role: "hang_ton", display: "Hàng Tồn" },
            { username: "donhang", password: "123", role: "don_hang", display: "Đơn Hàng" }
        ];
        return usersList;
    }
}

// Kiểm tra đăng nhập (async để có thể gọi API)
async function checkLogin(moduleName) {
    // BẮT BUỘC đăng nhập cho tất cả module, kể cả Tổng Hợp
    const role = MODULE_ROLE_MAP[moduleName];
    if (!role) {
        console.error('Unknown module:', moduleName);
        return false;
    }
    
    // Đối với Tổng Hợp: kiểm tra sessionStorage (sẽ mất khi reload)
    // Các module khác: kiểm tra localStorage (session 24h)
    const storage = moduleName === 'tonghop' ? sessionStorage : localStorage;
    const savedLogin = storage.getItem(`login_${moduleName}`);
    if (savedLogin) {
        try {
            const loginData = JSON.parse(savedLogin);
            
            // Đối với Tổng Hợp: chỉ cần kiểm tra authenticated flag
            if (moduleName === 'tonghop') {
                if (loginData.authenticated && loginData.username) {
                    return true;
                }
                return false;
            }
            
            // Các module khác: cho phép session trong 24h
            if (loginData.authenticated && loginData.timestamp) {
                const age = Date.now() - loginData.timestamp;
                const maxAge = 24 * 60 * 60 * 1000; // 24 giờ
                
                if (age < maxAge && loginData.username) {
                    // Session còn hợp lệ, không cần verify lại
                    return true;
                }
            }
            
            // Nếu có username và password (backward compatibility)
            if (loginData.username && loginData.password) {
                // Verify với server
                try {
                    const response = await fetch('/api/auth/check', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            username: loginData.username,
                            password: loginData.password,
                            moduleName: moduleName
                        })
                    });
                    
                    const result = await response.json();
                    if (result.success) {
                        // Update storage với format mới
                        if (moduleName === 'tonghop') {
                            sessionStorage.setItem(`login_${moduleName}`, JSON.stringify({ 
                                username: loginData.username,
                                authenticated: true
                            }));
                        } else {
                            localStorage.setItem(`login_${moduleName}`, JSON.stringify({ 
                                username: loginData.username,
                                authenticated: true,
                                timestamp: Date.now()
                            }));
                        }
                        return true;
                    }
                } catch (error) {
                    console.error('Error checking auth:', error);
                }
            }
        } catch (error) {
            console.error('Error parsing saved login:', error);
        }
    }
    
    return false;
}

// Hiển thị form đăng nhập
function showLoginForm(moduleName) {
    console.log('🔓 showLoginForm called for:', moduleName);
    const role = MODULE_ROLE_MAP[moduleName];
    if (!role) {
        console.error('❌ Invalid module name:', moduleName);
        return;
    }
    
    // Hiển thị body để form có thể hiển thị
    document.body.style.display = 'block';
    // Form login với position:fixed và z-index cao sẽ hiển thị trên cùng
    // Không cần ẩn các phần tử khác vì overlay sẽ che phủ
    
    // Kiểm tra xem form đã tồn tại chưa
    const existingForm = document.getElementById('loginOverlay');
    if (existingForm) {
        console.log('ℹ️ Login form already exists, removing...');
        existingForm.remove();
    }
    
    const loginHTML = `
        <div id="loginOverlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:10000;display:flex;align-items:center;justify-content:center;">
            <div style="background:white;padding:40px;border-radius:15px;box-shadow:0 10px 30px rgba(0,0,0,0.3);max-width:400px;width:90%;">
                <h2 style="margin-top:0;color:#1976D2;text-align:center;">🔐 Đăng Nhập</h2>
                <p style="text-align:center;color:#666;margin-bottom:20px;">Module: ${getModuleDisplayName(moduleName)}</p>
                <div style="margin-bottom:15px;">
                    <label style="display:block;margin-bottom:5px;font-weight:bold;">Tên đăng nhập:</label>
                    <input type="text" id="loginUsername" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:5px;font-size:16px;" autofocus>
                </div>
                <div style="margin-bottom:20px;">
                    <label style="display:block;margin-bottom:5px;font-weight:bold;">Mật khẩu:</label>
                    <input type="password" id="loginPassword" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:5px;font-size:16px;">
                </div>
                <div id="loginError" style="color:red;margin-bottom:15px;text-align:center;display:none;"></div>
                <button onclick="doLogin('${moduleName}')" style="width:100%;padding:12px;background:#2196F3;color:white;border:none;border-radius:5px;font-size:16px;font-weight:bold;cursor:pointer;">Đăng Nhập</button>
                <p style="text-align:center;margin-top:15px;font-size:12px;color:#999;">Liên hệ admin để lấy tài khoản</p>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('afterbegin', loginHTML);
    console.log('✅ Login form added to DOM');
    
    // Focus vào input username
    const usernameInput = document.getElementById('loginUsername');
    if (usernameInput) {
        usernameInput.focus();
        console.log('✅ Username input focused');
    }
    
    // Xử lý Enter key
    const passwordInput = document.getElementById('loginPassword');
    if (passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                doLogin(moduleName);
            }
        });
    }
}

// Thực hiện đăng nhập (sử dụng API server)
async function doLogin(moduleName) {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!username || !password) {
        showLoginError('Vui lòng nhập đầy đủ thông tin!');
        return;
    }
    
    try {
        // Gọi API để authenticate
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: password,
                moduleName: moduleName
            })
        });
        
        // Kiểm tra response status
        if (!response.ok) {
            // Nếu response không OK, thử parse error message
            try {
                const errorResult = await response.json();
                showLoginError(errorResult.error || `Lỗi ${response.status}: ${response.statusText}`);
            } catch (e) {
                showLoginError(`Lỗi kết nối: ${response.status} ${response.statusText}`);
            }
            return;
        }
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Login successful for:', username);
            // Lưu thông tin đăng nhập (không lưu password)
            // Đối với Tổng Hợp: lưu vào sessionStorage (sẽ mất khi reload/đóng tab)
            // Các module khác: lưu vào localStorage với timestamp để session kéo dài 24h
            if (moduleName === 'tonghop') {
                sessionStorage.setItem(`login_${moduleName}`, JSON.stringify({ 
                    username: username,
                    authenticated: true
                }));
            } else {
                localStorage.setItem(`login_${moduleName}`, JSON.stringify({ 
                    username: username,
                    authenticated: true,
                    timestamp: Date.now()
                }));
            }
            
            // Ẩn form đăng nhập
            const loginOverlay = document.getElementById('loginOverlay');
            if (loginOverlay) {
                loginOverlay.remove();
            }
            
            // Hiển thị lại tất cả nội dung
            document.body.style.display = 'block';
            
            // Đánh dấu đã đăng nhập để cho phép load dữ liệu
            if (typeof window !== 'undefined') {
                window.isAuthenticated = true;
                // Đồng bộ với biến local nếu có
                if (typeof window.isAuthenticated !== 'undefined') {
                    try {
                        // Tìm và set biến local isAuthenticated nếu có
                        const scripts = document.querySelectorAll('script');
                        scripts.forEach(script => {
                            if (script.textContent && script.textContent.includes('let isAuthenticated')) {
                                // Biến đã được khai báo, sẽ được set qua window
                            }
                        });
                    } catch (e) {
                        console.log('Note: isAuthenticated variable sync');
                    }
                }
            }
            
            // Thêm nút đăng xuất
            addLogoutButton(moduleName, username);
            
            // Nếu là tonghop và có hàm initWebSocket, khởi tạo lại
            if (moduleName === 'tonghop') {
                // Đợi một chút để đảm bảo DOM đã sẵn sàng
                setTimeout(() => {
                    // Set biến local nếu có
                    try {
                        if (typeof isAuthenticated !== 'undefined') {
                            isAuthenticated = true;
                        }
                    } catch (e) {}
                    
                    if (typeof initWebSocket === 'function') {
                        initWebSocket();
                    }
                    if (typeof loadPresenceMaps === 'function' && typeof hienThi === 'function') {
                        loadPresenceMaps().then(() => {
                            hienThi();
                            // Gọi thống kê sau khi hiển thị
                            if (typeof thongKe === 'function') {
                                thongKe();
                            }
                        });
                    }
                }, 100);
            }
            
            console.log('✅ Content should now be visible');
        } else {
            showLoginError(result.error || 'Sai tên đăng nhập hoặc mật khẩu!');
            document.getElementById('loginPassword').value = '';
            document.getElementById('loginPassword').focus();
        }
    } catch (error) {
        console.error('❌ Login error:', error);
        showLoginError('Lỗi kết nối server. Vui lòng thử lại!');
    }
}

// Hiển thị lỗi đăng nhập
function showLoginError(message) {
    const errorDiv = document.getElementById('loginError');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 3000);
}

// Đăng xuất
function logout(moduleName) {
    // Xóa cả localStorage và sessionStorage
    localStorage.removeItem(`login_${moduleName}`);
    sessionStorage.removeItem(`login_${moduleName}`);
    location.reload();
}

// Lấy tên hiển thị của module
function getModuleDisplayName(moduleName) {
    const names = {
        'khophoi': 'Kho Phôi',
        'sanxuat': 'Sản Xuất',
        'thanhpham': 'Thành Phẩm',
        'donghang': 'Đóng Hàng',
        'hangsan': 'Hàng Sẵn',
        'hangton': 'Hàng Tồn',
        'tonghop': 'Tổng Hợp',
        'donhang': 'Đơn Hàng'
    };
    return names[moduleName] || moduleName;
}

// Kiểm tra và yêu cầu đăng nhập khi trang load
async function requireLogin(moduleName) {
    console.log('🔐 requireLogin called for module:', moduleName);
    
    // Đợi DOM sẵn sàng
    if (document.readyState === 'loading') {
        console.log('⏳ Waiting for DOM...');
        document.addEventListener('DOMContentLoaded', () => {
            requireLogin(moduleName);
        });
        return;
    }
    
    try {
        console.log('✅ DOM ready, starting auth check...');
        
        // Ẩn nội dung cho đến khi đăng nhập thành công
        document.body.style.display = 'none';
        
        // Load users
        console.log('📥 Loading users...');
        await loadUsers();
        console.log('✅ Users loaded:', usersList.length);
        
        // Kiểm tra đăng nhập (async)
        const isLoggedIn = await checkLogin(moduleName);
        console.log('🔍 Login check result:', isLoggedIn);
        
        if (!isLoggedIn) {
            console.log('🔓 Not logged in, showing login form...');
            showLoginForm(moduleName);
        } else {
            // Đã đăng nhập, hiển thị nội dung
            console.log('✅ Already logged in, showing content...');
            document.body.style.display = 'block';
            
            // Hiển thị tên user và nút đăng xuất
            try {
                const storage = moduleName === 'tonghop' ? sessionStorage : localStorage;
                const savedLogin = JSON.parse(storage.getItem(`login_${moduleName}`));
                if (savedLogin && savedLogin.username) {
                    addLogoutButton(moduleName, savedLogin.username);
                }
            } catch (e) {
                console.error('Error parsing saved login:', e);
            }
        }
    } catch (error) {
        console.error('❌ Error in requireLogin:', error);
        // KHÔNG hiển thị trang khi có lỗi - bắt buộc phải đăng nhập
        // Chỉ hiển thị form đăng nhập
        document.body.style.display = 'none';
        showLoginForm(moduleName);
        showLoginError('Lỗi xác thực: ' + error.message);
    }
}

// Thêm nút đăng xuất
function addLogoutButton(moduleName, username) {
    const header = document.querySelector('h2');
    if (header) {
        // Kiểm tra xem đã có nút đăng xuất chưa (tránh thêm trùng)
        const existingLogout = header.querySelector('button[onclick*="logout"]');
        if (existingLogout) {
            return; // Đã có nút đăng xuất, không thêm nữa
        }
        
        const userInfo = document.createElement('span');
        userInfo.style.cssText = 'float:right;font-size:14px;margin-top:5px;';
        // Đối với tonghop, sử dụng logoutTongHop() nếu có, nếu không thì dùng logout()
        const logoutFunction = (moduleName === 'tonghop' && typeof logoutTongHop === 'function') 
            ? 'logoutTongHop()' 
            : `logout('${moduleName}')`;
        userInfo.innerHTML = `
            <span style="color:#666;">👤 ${username}</span>
            <button onclick="${logoutFunction}" style="margin-left:10px;padding:5px 10px;background:#f44336;color:white;border:none;border-radius:3px;cursor:pointer;font-size:12px;">Đăng xuất</button>
        `;
        header.appendChild(userInfo);
    }
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { loadUsers, checkLogin, requireLogin, logout };
}


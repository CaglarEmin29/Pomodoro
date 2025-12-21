// API Base URL
const API_BASE_URL = 'http://localhost:5000';

// DOM Elementleri
const registerForm = document.getElementById('registerForm');
const loginForm = document.getElementById('loginForm');
const googleAuthBtn = document.getElementById('googleAuth');

// Utility Functions
function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        const inputElement = document.getElementById(elementId.replace('Error', ''));
        if (inputElement) {
            inputElement.classList.add('error');
        }
    }
}

function clearError(elementId) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = '';
        const inputElement = document.getElementById(elementId.replace('Error', ''));
        if (inputElement) {
            inputElement.classList.remove('error');
        }
    }
}

function clearAllErrors() {
    const errorElements = document.querySelectorAll('.error-message');
    errorElements.forEach(element => {
        element.textContent = '';
    });
    
    const inputElements = document.querySelectorAll('input.error');
    inputElements.forEach(element => {
        element.classList.remove('error');
    });
}

function showMessage(message, type = 'success') {
    // Önceki mesajları temizle
    const existingMessage = document.querySelector('.message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    const form = document.querySelector('.auth-form');
    form.insertBefore(messageDiv, form.firstChild);
    
    // 5 saniye sonra mesajı kaldır
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 5000);
}

function setButtonLoading(button, loading = true) {
    if (loading) {
        button.classList.add('loading');
        button.disabled = true;
    } else {
        button.classList.remove('loading');
        button.disabled = false;
    }
}

// Form Validation
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePassword(password) {
    return password.length >= 6;
}

function validateRegisterForm(formData) {
    let isValid = true;
    
    // Email validation
    if (!formData.email) {
        showError('emailError', 'E-posta adresi gerekli');
        isValid = false;
    } else if (!validateEmail(formData.email)) {
        showError('emailError', 'Geçerli bir e-posta adresi girin');
        isValid = false;
    } else {
        clearError('emailError');
    }
    
    // Password validation
    if (!formData.password) {
        showError('passwordError', 'Şifre gerekli');
        isValid = false;
    } else if (!validatePassword(formData.password)) {
        showError('passwordError', 'Şifre en az 6 karakter olmalı');
        isValid = false;
    } else {
        clearError('passwordError');
    }
    
    // Confirm password validation
    if (!formData.confirmPassword) {
        showError('confirmPasswordError', 'Şifre tekrarı gerekli');
        isValid = false;
    } else if (formData.password !== formData.confirmPassword) {
        showError('confirmPasswordError', 'Şifreler eşleşmiyor');
        isValid = false;
    } else {
        clearError('confirmPasswordError');
    }
    
    return isValid;
}

function validateLoginForm(formData) {
    let isValid = true;
    
    // Email validation
    if (!formData.email) {
        showError('emailError', 'E-posta adresi gerekli');
        isValid = false;
    } else if (!validateEmail(formData.email)) {
        showError('emailError', 'Geçerli bir e-posta adresi girin');
        isValid = false;
    } else {
        clearError('emailError');
    }
    
    // Password validation
    if (!formData.password) {
        showError('passwordError', 'Şifre gerekli');
        isValid = false;
    } else {
        clearError('passwordError');
    }
    
    return isValid;
}

// API Functions
async function registerUser(formData) {
    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                email: formData.email,
                password: formData.password
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Kayıt başarılı! Ana sayfaya yönlendiriliyorsunuz...');
            // Cookie'lerin kaydedilmesi için biraz bekle
            setTimeout(() => {
                window.location.href = 'anasayfa.html';
            }, 1500);
        } else {
            showMessage(data.message || 'Kayıt sırasında hata oluştu', 'error');
        }
    } catch (error) {
        console.error('Register error:', error);
        showMessage('Bağlantı hatası. Lütfen tekrar deneyin.', 'error');
    }
}

async function loginUser(formData) {
    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                email: formData.email,
                password: formData.password,
                remember: formData.remember || false
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Giriş başarılı! Ana sayfaya yönlendiriliyorsunuz...');
            // Cookie'lerin kaydedilmesi için biraz bekle
            setTimeout(() => {
                window.location.href = 'anasayfa.html';
            }, 1500);
        } else {
            showMessage(data.message || 'Giriş sırasında hata oluştu', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage('Bağlantı hatası. Lütfen tekrar deneyin.', 'error');
    }
}

// Event Listeners
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearAllErrors();
        
        const formData = {
            email: document.getElementById('email').value.trim(),
            password: document.getElementById('password').value,
            confirmPassword: document.getElementById('confirmPassword').value
        };
        
        if (!validateRegisterForm(formData)) {
            return;
        }
        
        const submitButton = registerForm.querySelector('button[type="submit"]');
        setButtonLoading(submitButton, true);
        
        try {
            await registerUser(formData);
        } finally {
            setButtonLoading(submitButton, false);
        }
    });
}

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearAllErrors();
        
        const formData = {
            email: document.getElementById('email').value.trim(),
            password: document.getElementById('password').value,
            remember: document.getElementById('remember').checked
        };
        
        if (!validateLoginForm(formData)) {
            return;
        }
        
        const submitButton = loginForm.querySelector('button[type="submit"]');
        setButtonLoading(submitButton, true);
        
        try {
            await loginUser(formData);
        } finally {
            setButtonLoading(submitButton, false);
        }
    });
}

if (googleAuthBtn) {
    googleAuthBtn.addEventListener('click', () => {
        // Backend'e yönlendir, callback otomatik olarak dashboard'a yönlendirecek
        window.location.href = `${API_BASE_URL}/auth/google`;
    });
}

// URL'den hata parametrelerini kontrol et
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    
    if (error === 'oauth_failed') {
        showMessage('Google girişi başarısız oldu. Lütfen tekrar deneyin.', 'error');
    } else if (error === 'no_email') {
        showMessage('Google hesabınızdan email adresi alınamadı.', 'error');
    }
});

// Input event listeners for real-time validation
document.addEventListener('DOMContentLoaded', () => {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    
    if (emailInput) {
        emailInput.addEventListener('blur', () => {
            const email = emailInput.value.trim();
            if (email && !validateEmail(email)) {
                showError('emailError', 'Geçerli bir e-posta adresi girin');
            } else {
                clearError('emailError');
            }
        });
    }
    
    if (passwordInput) {
        passwordInput.addEventListener('blur', () => {
            const password = passwordInput.value;
            if (password && !validatePassword(password)) {
                showError('passwordError', 'Şifre en az 6 karakter olmalı');
            } else {
                clearError('passwordError');
            }
        });
    }
    
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('blur', () => {
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;
            if (confirmPassword && password !== confirmPassword) {
                showError('confirmPasswordError', 'Şifreler eşleşmiyor');
            } else {
                clearError('confirmPasswordError');
            }
        });
    }
});

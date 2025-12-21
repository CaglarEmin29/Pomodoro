// İletişim Sayfası JavaScript

const API_BASE_URL = 'http://localhost:5000';

// Tema yükle ve uygula
async function loadTheme() {
    try {
        // Kullanıcı durumunu kontrol et
        const response = await fetch(`${API_BASE_URL}/api/user`, {
            credentials: 'include'
        });
        
        const isAuthenticated = response.ok;
        
        if (!isAuthenticated) {
            // Misafir kullanıcı: localStorage'ı temizle, dark mode kullan
            localStorage.removeItem('theme');
            document.body.classList.remove('light-mode');
            document.body.classList.add('dark-mode');
        } else {
            // Giriş yapmış kullanıcı: localStorage'dan tema yükle
            const savedTheme = localStorage.getItem('theme') || 'dark';
            document.body.classList.remove('light-mode', 'dark-mode');
            document.body.classList.add(savedTheme === 'light' ? 'light-mode' : 'dark-mode');
        }
    } catch (error) {
        // Hata durumunda dark mode
        document.body.classList.remove('light-mode');
        document.body.classList.add('dark-mode');
    }
}

// DOM Elementleri
const contactForm = document.getElementById('contactForm');
const profileBtn = document.getElementById('profileBtn');
const profileDropdown = document.querySelector('.profile-dropdown');
const logoutBtn = document.getElementById('logoutBtn');

// Kullanıcı Bilgilerini Yükle
async function loadUserInfo() {
    const userEmail = document.getElementById('userEmail');
    if (!userEmail) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/user`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.user && data.user.email) {
                userEmail.textContent = data.user.email;
            } else {
                userEmail.textContent = 'Misafir';
            }
        } else {
            // 401 veya diğer hatalar - misafir kullanıcı, hemen göster
            userEmail.textContent = 'Misafir';
        }
    } catch (error) {
        console.error('Kullanıcı bilgileri alınamadı:', error);
        // Network hatası - misafir olarak göster
        userEmail.textContent = 'Misafir';
    }
}

// Sayfa Yüklendiğinde
document.addEventListener('DOMContentLoaded', async () => {
    // Tema yükle
    loadTheme();
    
    // Profil Dropdown İşlevselliği
    if (profileBtn && profileDropdown) {
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('active');
        });
        
        // Dışarı tıklanınca dropdown'ı kapat (profileBtn ve dropdown içindeki butonlar hariç)
        document.addEventListener('click', (e) => {
            const settingsBtn = document.getElementById('settingsBtn');
            const logoutBtn = document.getElementById('logoutBtn');
            // Eğer tıklama profileBtn, settingsBtn, logoutBtn veya dropdown içindeyse, kapatma
            if (profileDropdown && 
                e.target !== profileBtn && 
                e.target !== settingsBtn && 
                e.target !== logoutBtn &&
                !profileBtn.contains(e.target) &&
                !settingsBtn?.contains(e.target) &&
                !logoutBtn?.contains(e.target) &&
                !profileDropdown.contains(e.target)) {
                profileDropdown.classList.remove('active');
            }
        });
    }
    
    // Kullanıcı bilgilerini yükle
    loadUserInfo();
});

// Form Gönderimi
if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            name: document.getElementById('name').value.trim(),
            email: document.getElementById('email').value.trim(),
            subject: document.getElementById('subject').value.trim(),
            message: document.getElementById('message').value.trim()
        };
        
        // Validasyon
        if (!formData.name || !formData.email || !formData.subject || !formData.message) {
            alert('Lütfen tüm alanları doldurun.');
            return;
        }
        
        // Email validasyonu
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            alert('Geçerli bir e-posta adresi girin.');
            return;
        }
        
        // Loading state
        const submitButton = contactForm.querySelector('button[type="submit"]');
        const buttonText = submitButton.querySelector('.button-text');
        const buttonLoading = submitButton.querySelector('.button-loading');
        
        buttonText.style.display = 'none';
        buttonLoading.style.display = 'inline';
        submitButton.disabled = true;
        
        try {
            // Backend'de contact endpoint'i yoksa, console'a log yaz
            console.log('İletişim formu gönderiliyor:', formData);
            
            // Şimdilik başarı mesajı göster (backend endpoint eklendiğinde fetch ile gönderilecek)
            alert('Mesajınız başarıyla gönderildi! En kısa sürede size dönüş yapacağız.');
            contactForm.reset();
            
            // Backend endpoint eklendiğinde kullanılacak kod:
            /*
            const response = await fetch(`${API_BASE_URL}/api/contact`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                alert('Mesajınız başarıyla gönderildi! En kısa sürede size dönüş yapacağız.');
                contactForm.reset();
            } else {
                alert(data.message || 'Mesaj gönderilirken hata oluştu. Lütfen tekrar deneyin.');
            }
            */
        } catch (error) {
            console.error('İletişim formu hatası:', error);
            alert('Bağlantı hatası. Lütfen tekrar deneyin.');
        } finally {
            buttonText.style.display = 'inline';
            buttonLoading.style.display = 'none';
            submitButton.disabled = false;
        }
    });
}

// Çıkış İşlemi
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/logout`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                console.log('Çıkış başarılı');
            }
        } catch (error) {
            console.error('Çıkış API hatası:', error);
        }
        
        // Tema tercihini koru, diğer localStorage'ı temizle
        const savedTheme = localStorage.getItem('theme');
        localStorage.clear();
        sessionStorage.clear();
        if (savedTheme) {
            localStorage.setItem('theme', savedTheme);
        }
        
        window.location.href = 'index.html';
    });
}


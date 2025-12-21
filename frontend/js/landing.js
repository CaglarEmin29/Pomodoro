// API Base URL
const API_BASE_URL = 'http://localhost:5000';

// DOM Elementleri
const guestView = document.getElementById('guestView');
const loadingSpinner = document.getElementById('loadingSpinner');

// Sayfa Yüklendiğinde
document.addEventListener('DOMContentLoaded', async () => {
    showLoading(true);
    
    try {
        // Kullanıcı durumunu kontrol et
        const userStatus = await checkUserStatus();
        
        if (userStatus.isAuthenticated) {
            // Giriş yapmış kullanıcıyı dashboard'a yönlendir
            console.log('Kullanıcı giriş yapmış, dashboard\'a yönlendiriliyor...');
            window.location.href = 'anasayfa.html';
        } else {
            // Misafir kullanıcı için landing page göster
            console.log('Misafir kullanıcı, landing page gösteriliyor...');
            showGuestView();
        }
    } catch (error) {
        console.error('Kullanıcı durumu kontrol edilemedi:', error);
        // API hatası durumunda landing page göster
        console.log('API hatası, landing page gösteriliyor...');
        showGuestView();
    } finally {
        showLoading(false);
    }
});

// Kullanıcı Durumu Kontrolü
async function checkUserStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/user`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            return {
                isAuthenticated: true,
                user: data.user
            };
        } else {
            return { isAuthenticated: false };
        }
    } catch (error) {
        console.error('API hatası:', error);
        return { isAuthenticated: false };
    }
}

// Görünümleri Göster/Gizle
function showGuestView() {
    guestView.style.display = 'flex';
}

function showLoading(show) {
    loadingSpinner.style.display = show ? 'flex' : 'none';
}

// Ayarlar Modal JavaScript

// DOM Elementleri
let settingsBtn = null;
let settingsModal = null;
let settingsCloseBtn = null;
let settingsOverlay = null;
let notificationsEnabled = null;
let soundVolume = null;
let soundVolumeValue = null;
let themeRadios = null;

// Tema uygula (body class olarak)
function applyTheme(theme) {
    document.body.classList.remove('light-mode', 'dark-mode');
    document.body.classList.add(theme === 'light' ? 'light-mode' : 'dark-mode');
}

// Ayarları Yükle
function loadSettings() {
    // LocalStorage'dan ayarları yükle
    const savedTheme = localStorage.getItem('theme') || 'dark';
    const savedNotifications = localStorage.getItem('notificationsEnabled') === 'true';
    const savedVolume = parseInt(localStorage.getItem('soundVolume'));
    const finalVolume = (!isNaN(savedVolume) && savedVolume >= 0 && savedVolume <= 100) ? savedVolume : 50;
    
    // Tema ayarını uygula
    if (themeRadios) {
        themeRadios.forEach(radio => {
            if (radio.value === savedTheme) {
                radio.checked = true;
            }
        });
    }
    
    // Tema'yı body'ye uygula
    applyTheme(savedTheme);
    
    // Bildirim ayarını uygula
    if (notificationsEnabled) {
        notificationsEnabled.checked = savedNotifications;
    }
    
    // Ses seviyesini uygula
    if (soundVolume && soundVolumeValue) {
        soundVolume.value = finalVolume;
        soundVolumeValue.textContent = `${finalVolume}%`;
    }
}

// Ayarları Kaydet
function saveSettings() {
    const selectedTheme = document.querySelector('input[name="theme"]:checked')?.value || 'dark';
    const notifications = notificationsEnabled?.checked || false;
    // 0 değerini de kabul etmek için kontrol et (string '0' da geçerli bir değer)
    let volume = 50; // varsayılan
    if (soundVolume && soundVolume.value !== undefined && soundVolume.value !== null && soundVolume.value !== '') {
        const parsedVolume = parseInt(soundVolume.value);
        if (!isNaN(parsedVolume) && parsedVolume >= 0 && parsedVolume <= 100) {
            volume = parsedVolume;
        }
    }
    
    localStorage.setItem('theme', selectedTheme);
    localStorage.setItem('notificationsEnabled', notifications);
    localStorage.setItem('soundVolume', volume);
}

// Modal Aç
function openSettingsModal() {
    if (settingsModal) {
        settingsModal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Scroll'u engelle
        loadSettings();
    }
}

// Modal Kapat
function closeSettingsModal() {
    if (settingsModal) {
        settingsModal.classList.remove('active');
        document.body.style.overflow = ''; // Scroll'u geri getir
        saveSettings();
    }
}

// Event Listeners'ı Başlat
function initSettings() {
    // DOM Elementlerini seç
    settingsBtn = document.getElementById('settingsBtn');
    settingsModal = document.getElementById('settingsModal');
    settingsCloseBtn = document.getElementById('settingsCloseBtn');
    settingsOverlay = document.querySelector('.settings-modal-overlay');
    notificationsEnabled = document.getElementById('notificationsEnabled');
    soundVolume = document.getElementById('soundVolume');
    soundVolumeValue = document.getElementById('soundVolumeValue');
    themeRadios = document.querySelectorAll('input[name="theme"]');
    
    // Ayarlar butonuna tıklama
    if (settingsBtn) {
        settingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Ayarlar butonuna tıklandı');
            // Dropdown'ı kapat
            const profileDropdown = document.querySelector('.profile-dropdown');
            if (profileDropdown) {
                profileDropdown.classList.remove('active');
            }
            openSettingsModal();
        });
    } else {
        console.error('Ayarlar butonu bulunamadı!');
    }
    
    // Kapat butonuna tıklama
    if (settingsCloseBtn) {
        settingsCloseBtn.addEventListener('click', closeSettingsModal);
    }
    
    // Overlay'e tıklama
    if (settingsOverlay) {
        settingsOverlay.addEventListener('click', closeSettingsModal);
    }
    
    // ESC tuşu ile kapat
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && settingsModal && settingsModal.classList.contains('active')) {
            closeSettingsModal();
        }
    });
    
    // Ses seviyesi değiştiğinde
    if (soundVolume) {
        soundVolume.addEventListener('input', (e) => {
            if (soundVolumeValue) {
                soundVolumeValue.textContent = `${e.target.value}%`;
            }
            saveSettings();
            // Ses seviyesi değiştiğinde global event dispatch et (diğer scriptler için)
            window.dispatchEvent(new CustomEvent('soundVolumeChanged', { detail: { volume: e.target.value } }));
        });
    }
    
    // Bildirim ayarı değiştiğinde
    if (notificationsEnabled) {
        notificationsEnabled.addEventListener('change', saveSettings);
    }
    
    // Tema değiştiğinde
    if (themeRadios) {
        themeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                saveSettings();
                const selectedTheme = e.target.value;
                applyTheme(selectedTheme);
                // Tema değişikliği event'i gönder (grafikler için)
                window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: selectedTheme } }));
            });
        });
    }
    
    // Sayfa yüklendiğinde ayarları yükle
    loadSettings();
}

// Sayfa yüklendiğinde başlat
document.addEventListener('DOMContentLoaded', () => {
    initSettings();
});


// API Base URL
const API_BASE_URL = 'http://localhost:5000';

// Ses dosyaları
const startSound = new Audio('../audio/basla.mp3');
const completeSound = new Audio('../audio/pomodoro_tamamlandi.mp3');

// Web Audio API için context ve gain node'lar
let audioContext = null;
let startSoundGainNode = null;
let completeSoundGainNode = null;
let audioInitialized = false;

// Ses seviyesini hesapla: 0→0, 50→1 (normal), 100→2 (2 kat)
function getSoundVolume() {
    const savedVolumeStr = localStorage.getItem('soundVolume');
    const savedVolume = (savedVolumeStr !== null && savedVolumeStr !== undefined) ? parseInt(savedVolumeStr) : 50;
    // 0 değerini de kabul etmek için kontrol
    const volume = (!isNaN(savedVolume) && savedVolume >= 0 && savedVolume <= 100) ? savedVolume : 50;
    // 0-100 slider'ı 0-2 gain değerine çevir
    // 0 → 0, 50 → 1, 100 → 2
    return volume / 50;
}

// Audio context ve gain node'ları başlat
function initAudioNodes() {
    if (audioInitialized) return;
    
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Start sound için gain node oluştur
        startSoundGainNode = audioContext.createGain();
        const startSource = audioContext.createMediaElementSource(startSound);
        startSource.connect(startSoundGainNode);
        startSoundGainNode.connect(audioContext.destination);
        
        // Complete sound için gain node oluştur
        completeSoundGainNode = audioContext.createGain();
        const completeSource = audioContext.createMediaElementSource(completeSound);
        completeSource.connect(completeSoundGainNode);
        completeSoundGainNode.connect(audioContext.destination);
        
        audioInitialized = true;
        updateSoundGain();
    } catch (error) {
        console.log('Web Audio API başlatılamadı, fallback kullanılıyor:', error);
        // Fallback: Normal Audio API kullan (max 1.0)
    }
}

// Gain node'ların ses seviyesini güncelle
function updateSoundGain() {
    const volume = getSoundVolume();
    
    if (startSoundGainNode) {
        startSoundGainNode.gain.value = volume;
    } else {
        // Fallback: Normal Audio API (max 1.0, bu yüzden 100'de 2x olamaz)
        startSound.volume = Math.min(volume, 1.0);
    }
    
    if (completeSoundGainNode) {
        completeSoundGainNode.gain.value = volume;
    } else {
        // Fallback: Normal Audio API (max 1.0)
        completeSound.volume = Math.min(volume, 1.0);
    }
}

// Ses çalarken ses seviyesini uygula
function playSoundWithVolume(audio) {
    // İlk kullanıcı etkileşiminde audio context'i başlat
    if (!audioInitialized) {
        initAudioNodes();
    }
    
    // Ses seviyesini güncel tut
    updateSoundGain();
    
    // Audio context'i resume et (suspend olmuşsa)
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    audio.currentTime = 0;
    audio.play().catch(err => console.log('Ses çalınamadı:', err));
}

// Ses seviyesi değiştiğinde güncelle (settings.js'den gelen event)
window.addEventListener('soundVolumeChanged', () => {
    updateSoundGain();
});

// Sayfa yüklendiğinde ilk kullanıcı etkileşimini bekle
document.addEventListener('DOMContentLoaded', () => {
    // İlk tıklamada audio context'i başlat
    const initAudioOnInteraction = () => {
        initAudioNodes();
        document.removeEventListener('click', initAudioOnInteraction);
        document.removeEventListener('touchstart', initAudioOnInteraction);
    };
    document.addEventListener('click', initAudioOnInteraction, { once: true });
    document.addEventListener('touchstart', initAudioOnInteraction, { once: true });
});

// DOM Elementleri
const userEmail = document.getElementById('userEmail');
const logoutBtn = document.getElementById('logoutBtn');

// Timer Elementleri
const timerDisplay = document.getElementById('timerDisplay');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const finishBtn = document.getElementById('finishBtn');
const pomodoroBtn = document.getElementById('pomodoroBtn');
const shortBreakBtn = document.getElementById('shortBreakBtn');
const longBreakBtn = document.getElementById('longBreakBtn');

// Task Elementleri
const taskInput = document.getElementById('taskInput');
const addTaskBtn = document.getElementById('addTaskBtn');
const taskList = document.getElementById('taskList');

// Stats Elementleri
const fullPomodoros = document.getElementById('fullPomodoros');
const halfPomodoros = document.getElementById('halfPomodoros');
const todayTime = document.getElementById('todayTime');

// Timer Değişkenleri
let timerInterval = null;
let currentTime = 25 * 60; // 25 dakika (saniye cinsinden)
let isRunning = false;
let currentMode = 'work'; // 'work', 'shortBreak', 'longBreak'
let startTime = null; // Pomodoro başlangıç zamanı
let elapsedSeconds = 0; // Geçen süre (saniye)
let currentSessionId = null; // Aktif pomodoro session ID
let selectedTaskId = null; // Seçili görev ID

// Profil Dropdown İşlevselliği
let anasayfaProfileDropdownInitialized = false;

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

// Sayfa Yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
    // Tema yükle
    loadTheme();
    
    // Profil Dropdown İşlevselliği
    const profileBtn = document.getElementById('profileBtn');
    const profileDropdown = document.querySelector('.profile-dropdown');
    
    if (profileBtn && profileDropdown && !anasayfaProfileDropdownInitialized) {
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isActive = profileDropdown.classList.contains('active');
            profileDropdown.classList.toggle('active');
            console.log('Profil butonuna tıklandı, dropdown aktif:', !isActive);
        });
        
        // Dışarı tıklanınca dropdown'ı kapat
        document.addEventListener('click', (e) => {
            if (profileDropdown && !profileDropdown.contains(e.target) && !profileBtn.contains(e.target)) {
                profileDropdown.classList.remove('active');
            }
        });
        
        anasayfaProfileDropdownInitialized = true;
    }
    
    // Kullanıcı bilgilerini al
    loadUserInfo();
    
    // Görevleri backend'den yükle
    loadTasks();
    
    // İstatistikleri backend'den yükle
    loadStatistics();
    
    // Timer'ı başlat
    updateTimerDisplay();
    
    if (stopBtn) {
        stopBtn.disabled = true;
    }
    
    if (finishBtn) {
        finishBtn.disabled = true;
    }
    
    if (startBtn) {
        startBtn.disabled = false;
    }
    
    if (pomodoroBtn && currentMode === 'work') {
        pomodoroBtn.classList.add('active');
    }
});

// Kullanıcı bilgilerini yükle
async function loadUserInfo() {
    const userEmailElement = document.getElementById('userEmail');
    if (!userEmailElement) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/user`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.user && data.user.email) {
                userEmailElement.textContent = data.user.email;
            } else {
                userEmailElement.textContent = 'Misafir';
            }
        } else {
            // 401 veya diğer hatalar - misafir kullanıcı, hemen göster
            userEmailElement.textContent = 'Misafir';
        }
    } catch (error) {
        console.error('Kullanıcı bilgileri alınamadı:', error);
        // Network hatası - misafir olarak göster
        userEmailElement.textContent = 'Misafir';
    }
}

// Çıkış İşlemi
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        console.log('Çıkış butonuna basıldı...');
        
        try {
            // Backend'e çıkış isteği gönder
            const response = await fetch(`${API_BASE_URL}/logout`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                console.log('Çıkış başarılı, session temizlendi');
            } else {
                console.log('Çıkış API hatası:', response.status);
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
        
        // Ana sayfaya yönlendir
        console.log('Ana sayfaya yönlendiriliyor...');
        window.location.href = 'tanitim.html';
    });
}

// Timer Fonksiyonları
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function updateTimerDisplay() {
    if (timerDisplay) {
        timerDisplay.textContent = formatTime(currentTime);
    }
}

async function startTimer() {
    if (isRunning) return;
    
    // Çalışma modu için görev kontrolü
    if (currentMode === 'work') {
        // En az bir tamamlanmamış görev olmalı
        const activeTasks = tasks.filter(t => !t.completed);
        if (activeTasks.length === 0) {
            showNotification('Lütfen önce en az bir görev ekleyin!', 'error');
            return;
        }
        
        // Görev seçilmemişse uyarı ver
        if (!selectedTaskId) {
            showNotification('Lütfen çalışmak istediğiniz görevi seçin!', 'error');
            return;
        }
    }
    
    // Backend'e pomodoro başlatma isteği gönder
    try {
        const response = await fetch(`${API_BASE_URL}/api/pomodoro/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                session_type: currentMode,
                task_id: currentMode === 'work' ? selectedTaskId : null
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            currentSessionId = data.session.id;
            startTime = new Date();
            elapsedSeconds = 0;
            
            // Başla sesini çal (ses seviyesi ile birlikte)
            playSoundWithVolume(startSound);
            
            isRunning = true;
            if (startBtn) {
                startBtn.disabled = true;
            }
            if (stopBtn) {
                stopBtn.disabled = false;
            }
            if (finishBtn) {
                finishBtn.disabled = false;
            }
            
            timerInterval = setInterval(() => {
                currentTime--;
                elapsedSeconds++;
                updateTimerDisplay();
                
                if (currentTime <= 0) {
                    stopTimer();
                    handleTimerComplete();
                }
            }, 1000);
        } else {
            const data = await response.json();
            showNotification(data.message || 'Pomodoro başlatılamadı', 'error');
        }
    } catch (error) {
        console.error('Pomodoro başlatılırken hata:', error);
        showNotification('Bağlantı hatası. Lütfen tekrar deneyin.', 'error');
    }
}

function stopTimer() {
    isRunning = false;
    
    if (startBtn) {
        startBtn.disabled = false;
    }
    
    if (stopBtn) {
        stopBtn.disabled = true;
    }
    
    // Bitir butonu sadece başlatılmış pomodoro varsa aktif kalmalı
    // stopTimer sadece durdurur, bitirmez
    
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function resetTimer() {
    // Sadece timer'ı durdur, session'ı bitirme
    isRunning = false;
    
    if (startBtn) {
        startBtn.disabled = false;
    }
    
    if (stopBtn) {
        stopBtn.disabled = true;
    }
    
    // finishBtn'un durumu currentSessionId'ye bağlı
    // resetTimer çağrıldığında session yoksa disabled, varsa aktif kalmalı
    if (finishBtn) {
        finishBtn.disabled = !currentSessionId;
    }
    
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    currentTime = getTimerDuration();
    elapsedSeconds = 0;
    updateTimerDisplay();
}

function getTimerDuration() {
    switch (currentMode) {
        case 'work': return 25 * 60; // 25 dakika
        case 'shortBreak': return 5 * 60; // 5 dakika
        case 'longBreak': return 15 * 60; // 15 dakika
        default: return 25 * 60;
    }
}

function setTimerMode(mode) {
    currentMode = mode;
    resetTimer();
    
    // Buton durumlarını güncelle
    document.querySelectorAll('.break-options .btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (mode === 'work' && pomodoroBtn) {
        pomodoroBtn.classList.add('active');
    } else if (mode === 'shortBreak' && shortBreakBtn) {
        shortBreakBtn.classList.add('active');
    } else if (mode === 'longBreak' && longBreakBtn) {
        longBreakBtn.classList.add('active');
    }
}

async function handleTimerComplete() {
    // Timer tamamlandığında süreyi kaydet
    await endPomodoroSession();
    
    // Timer tamamlandığında yapılacak işlemler
    if (currentMode === 'work') {
        // Çalışma seansı tamamlandı
        // Pomodoro tamamlandı sesini çal (ses seviyesi ile birlikte)
        playSoundWithVolume(completeSound);
        
        showNotification('Pomodoro tamamlandı! Mola zamanı!', 'success');
        
        // İstatistikleri güncelle
        loadStatistics();
        
        // Otomatik olarak kısa mola başlat
        setTimeout(() => {
            setTimerMode('shortBreak');
            startTimer();
        }, 2000);
    } else {
        // Mola tamamlandı
        showNotification('Mola bitti! Çalışmaya devam edin!', 'info');
        
        // İstatistikleri güncelle
        loadStatistics();
        
        // Otomatik olarak çalışma moduna geç
        setTimeout(() => {
            setTimerMode('work');
        }, 2000);
    }
}

// Pomodoro oturumunu bitir ve süreyi kaydet
async function endPomodoroSession() {
    if (!currentSessionId) return;
    
    // Geçen süreyi hesapla (dakika cinsinden)
    const durationMinutes = elapsedSeconds / 60;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/pomodoro/end`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                session_id: currentSessionId,
                duration_minutes: durationMinutes
            })
        });
        
        if (response.ok) {
            console.log('Pomodoro oturumu kaydedildi:', durationMinutes, 'dakika');
            currentSessionId = null;
            startTime = null;
            elapsedSeconds = 0;
        } else {
            console.error('Pomodoro oturumu kaydedilemedi');
        }
    } catch (error) {
        console.error('Pomodoro oturumu kaydedilirken hata:', error);
    }
}

// Bitir butonu işlevi
async function finishPomodoro() {
    if (!currentSessionId) {
        showNotification('Aktif bir pomodoro oturumu yok', 'error');
        return;
    }
    
    // Timer çalışıyorsa durdur
    if (isRunning) {
        stopTimer();
    }
    
    // Süreyi kaydet
    await endPomodoroSession();
    
    // İstatistikleri güncelle
    loadStatistics();
    
    // Pomodoro tamamlandı sesini çal (bitir butonuna basıldığında, sadece çalışma modunda)
    if (currentMode === 'work') {
        playSoundWithVolume(completeSound);
    }
    
    showNotification('Pomodoro oturumu tamamlandı', 'success');
    
    // Butonları sıfırla
    if (finishBtn) {
        finishBtn.disabled = true;
    }
    
    // Timer'ı sıfırla
    resetTimer();
}

// Bitir butonu event listener
if (finishBtn) {
    finishBtn.addEventListener('click', finishPomodoro);
}

// Timer Event Listeners
if (startBtn) {
    startBtn.addEventListener('click', startTimer);
}

if (stopBtn) {
    stopBtn.addEventListener('click', stopTimer);
}

if (pomodoroBtn) {
    pomodoroBtn.addEventListener('click', () => {
        setTimerMode('work');
    });
}

if (shortBreakBtn) {
    shortBreakBtn.addEventListener('click', () => {
        setTimerMode('shortBreak');
    });
}

if (longBreakBtn) {
    longBreakBtn.addEventListener('click', () => {
        setTimerMode('longBreak');
    });
}

// Görev Yönetimi
let tasks = [];

// Görevleri backend'den yükle
async function loadTasks() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/tasks`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            tasks = data.tasks || [];
            renderTasks();
        } else {
            // Kullanıcı giriş yapmamış, misafir modunda çalış
            tasks = [];
            renderTasks();
        }
    } catch (error) {
        console.error('Görevler yüklenemedi:', error);
        tasks = [];
        renderTasks();
    }
}

function renderTasks() {
    if (!taskList) return;
    
    taskList.innerHTML = '';
    
    if (tasks.length === 0) {
        taskList.innerHTML = '<p style="text-align: center; color: #888; padding: 1rem;">Henüz görev eklenmemiş</p>';
        return;
    }
    
    tasks.forEach((task) => {
        const taskElement = document.createElement('div');
        const isSelected = selectedTaskId === task.id;
        taskElement.className = `task-item ${task.completed ? 'task-completed' : ''} ${isSelected ? 'task-selected' : ''}`;
        
        // Tamamlanmamış görevler için tıklanabilir yap
        if (!task.completed) {
            taskElement.style.cursor = 'pointer';
            taskElement.addEventListener('click', (e) => {
                // Butonlara tıklanırsa seçim yapma
                if (e.target.closest('.task-actions')) {
                    return;
                }
                e.stopPropagation();
                selectTask(task.id);
            });
        }
        
        taskElement.innerHTML = `
            <span class="task-text">${task.text}</span>
            <div class="task-actions">
                ${!task.completed ? `<button class="btn btn-outline complete-btn" data-task-id="${task.id}" title="Tamamla">✓</button>` : ''}
                <button class="btn btn-outline delete-btn" data-task-id="${task.id}" title="Sil">×</button>
            </div>
        `;
        
        // Buton event listener'larını ekle
        const completeBtn = taskElement.querySelector('.complete-btn');
        if (completeBtn) {
            completeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                completeTask(task.id);
            });
        }
        
        const deleteBtn = taskElement.querySelector('.delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteTask(task.id);
            });
        }
        
        taskList.appendChild(taskElement);
    });
}

async function addTask() {
    if (!taskInput) return;
    
    const text = taskInput.value.trim();
    if (!text) {
        showNotification('Görev metni boş olamaz', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ text: text })
        });
        
        if (response.ok) {
            const data = await response.json();
            tasks.push(data.task);
            taskInput.value = '';
            renderTasks();
            showNotification('Görev eklendi', 'success');
        } else {
            const data = await response.json();
            showNotification(data.message || 'Görev eklenirken hata oluştu', 'error');
        }
    } catch (error) {
        console.error('Görev eklenirken hata:', error);
        showNotification('Bağlantı hatası. Lütfen tekrar deneyin.', 'error');
    }
}

async function completeTask(taskId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ completed: true })
        });
        
        if (response.ok) {
            const data = await response.json();
            const index = tasks.findIndex(t => t.id === taskId);
            if (index !== -1) {
                tasks[index] = data.task;
                if (selectedTaskId === taskId) {
                    selectedTaskId = null;
                }
                renderTasks();
            }
        }
    } catch (error) {
        console.error('Görev tamamlanırken hata:', error);
    }
}

async function deleteTask(taskId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (response.ok) {
            tasks = tasks.filter(t => t.id !== taskId);
            if (selectedTaskId === taskId) {
                selectedTaskId = null;
            }
            renderTasks();
        }
    } catch (error) {
        console.error('Görev silinirken hata:', error);
    }
}

function selectTask(taskId) {
    // Sadece tamamlanmamış görevler seçilebilir
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.completed) {
        return;
    }
    
    // Görevi seç (eğer aynı görev seçiliyse seçimi kaldırma, başka görev seçilince değişir)
    selectedTaskId = taskId;
    renderTasks();
    
    console.log('Görev seçildi:', task.text, 'ID:', taskId);
}

// Global scope'a fonksiyonları ekle (onclick için)
window.completeTask = completeTask;
window.deleteTask = deleteTask;
window.selectTask = selectTask;

if (addTaskBtn) {
    addTaskBtn.addEventListener('click', addTask);
}

if (taskInput) {
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTask();
        }
    });
}

// İstatistikler
async function loadStatistics() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/pomodoro/statistics?period=daily`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            updateStats(data.statistics);
        } else {
            // Varsayılan değerler
            updateStats({
                total_pomodoros: 0,
                total_work_minutes: 0,
                full_pomodoros: 0,
                half_pomodoros: 0
            });
        }
    } catch (error) {
        console.error('İstatistikler yüklenemedi:', error);
        updateStats({
            total_pomodoros: 0,
            total_work_minutes: 0,
            full_pomodoros: 0,
            half_pomodoros: 0
        });
    }
}

function updateStats(stats) {
    if (!stats) {
        stats = { 
            total_pomodoros: 0, 
            total_work_minutes: 0,
            full_pomodoros: 0,
            half_pomodoros: 0
        };
    }
    
    // Tam pomodoro sayısı
    if (fullPomodoros) {
        fullPomodoros.textContent = stats.full_pomodoros || 0;
    }
    
    // Eksik (yarım) pomodoro sayısı
    if (halfPomodoros) {
        halfPomodoros.textContent = stats.half_pomodoros || 0;
    }
    
    // Toplam çalışma süresi
    if (todayTime) {
        // Toplam dakikayı saniyeye çevir
        const totalSeconds = Math.round((stats.total_work_minutes || 0) * 60);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        
        // Format: "1dk 03sn" veya sadece "45sn" (dakika yoksa)
        if (minutes > 0) {
            todayTime.textContent = `${minutes}dk ${seconds.toString().padStart(2, '0')}sn`;
        } else {
            todayTime.textContent = `${seconds}sn`;
        }
    }
}

// Bildirim Gösterme
function showNotification(message, type = 'info') {
    // Mevcut bildirimleri kaldır
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notif => notif.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        padding: 1rem 2rem;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 10000;
        animation: slideIn 0.3s ease;
        font-family: 'Inter', sans-serif;
        font-weight: 500;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// CSS Animasyonları
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { 
            transform: translateX(100%); 
            opacity: 0; 
        }
        to { 
            transform: translateX(0); 
            opacity: 1; 
        }
    }
    
    @keyframes slideOut {
        from { 
            transform: translateX(0); 
            opacity: 1; 
        }
        to { 
            transform: translateX(100%); 
            opacity: 0; 
        }
    }
`;
document.head.appendChild(style);


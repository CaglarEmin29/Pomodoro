// API Base URL
const API_BASE_URL = 'http://localhost:5000';

// DOM Elementleri
const guestView = document.getElementById('guestView');
const userView = document.getElementById('userView');
const loadingSpinner = document.getElementById('loadingSpinner');
const userEmail = document.getElementById('userEmail');
const logoutBtn = document.getElementById('logoutBtn');

// Timer Elementleri
const timerDisplay = document.getElementById('timerDisplay');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const shortBreakBtn = document.getElementById('shortBreakBtn');
const longBreakBtn = document.getElementById('longBreakBtn');

// Task Elementleri
const taskInput = document.getElementById('taskInput');
const addTaskBtn = document.getElementById('addTaskBtn');
const taskList = document.getElementById('taskList');

// Stats Elementleri
const todayPomodoros = document.getElementById('todayPomodoros');
const todayTime = document.getElementById('todayTime');

// Timer Değişkenleri
let timerInterval = null;
let currentTime = 25 * 60; // 25 dakika (saniye cinsinden)
let isRunning = false;
let currentMode = 'work'; // 'work', 'shortBreak', 'longBreak'

// Sayfa Yüklendiğinde
document.addEventListener('DOMContentLoaded', async () => {
    showLoading(true);
    
    try {
        // Kullanıcı durumunu kontrol et
        const userStatus = await checkUserStatus();
        
        if (userStatus.isAuthenticated) {
            showUserView(userStatus.user);
        } else {
            showGuestView();
        }
    } catch (error) {
        console.error('Kullanıcı durumu kontrol edilemedi:', error);
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
    userView.style.display = 'none';
}

function showUserView(user) {
    guestView.style.display = 'none';
    userView.style.display = 'flex';
    
    if (user && user.email) {
        userEmail.textContent = user.email;
    }
}

function showLoading(show) {
    loadingSpinner.style.display = show ? 'flex' : 'none';
}

// Çıkış İşlemi
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/logout`, {
                method: 'GET',
                credentials: 'include'
            });
            
            if (response.ok) {
                showGuestView();
            }
        } catch (error) {
            console.error('Çıkış hatası:', error);
        }
    });
}

// Timer Fonksiyonları
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function updateTimerDisplay() {
    timerDisplay.textContent = formatTime(currentTime);
}

function startTimer() {
    if (isRunning) return;
    
    isRunning = true;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    
    timerInterval = setInterval(() => {
        currentTime--;
        updateTimerDisplay();
        
        if (currentTime <= 0) {
            stopTimer();
            handleTimerComplete();
        }
    }, 1000);
}

function stopTimer() {
    isRunning = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function resetTimer() {
    stopTimer();
    currentTime = getTimerDuration();
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
    
    if (mode === 'shortBreak') {
        shortBreakBtn.classList.add('active');
    } else if (mode === 'longBreak') {
        longBreakBtn.classList.add('active');
    }
}

function handleTimerComplete() {
    // Timer tamamlandığında yapılacak işlemler
    if (currentMode === 'work') {
        // Çalışma seansı tamamlandı
        incrementPomodoroCount();
        showNotification('Pomodoro tamamlandı! Mola zamanı!', 'success');
        
        // Otomatik olarak kısa mola başlat
        setTimeout(() => {
            setTimerMode('shortBreak');
            startTimer();
        }, 2000);
    } else {
        // Mola tamamlandı
        showNotification('Mola bitti! Çalışmaya devam edin!', 'info');
        
        // Otomatik olarak çalışma moduna geç
        setTimeout(() => {
            setTimerMode('work');
        }, 2000);
    }
}

// Timer Event Listeners
if (startBtn) {
    startBtn.addEventListener('click', startTimer);
}

if (stopBtn) {
    stopBtn.addEventListener('click', stopTimer);
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
let tasks = JSON.parse(localStorage.getItem('pomodoroTasks')) || [];

function renderTasks() {
    taskList.innerHTML = '';
    
    tasks.forEach((task, index) => {
        const taskElement = document.createElement('div');
        taskElement.className = 'task-item';
        taskElement.innerHTML = `
            <span class="task-text">${task.text}</span>
            <div class="task-actions">
                <button class="btn btn-outline" onclick="completeTask(${index})">✓</button>
                <button class="btn btn-outline" onclick="deleteTask(${index})">×</button>
            </div>
        `;
        taskList.appendChild(taskElement);
    });
}

function addTask() {
    const text = taskInput.value.trim();
    if (!text) return;
    
    const task = {
        id: Date.now(),
        text: text,
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    tasks.push(task);
    localStorage.setItem('pomodoroTasks', JSON.stringify(tasks));
    taskInput.value = '';
    renderTasks();
}

function completeTask(index) {
    tasks[index].completed = true;
    tasks[index].completedAt = new Date().toISOString();
    localStorage.setItem('pomodoroTasks', JSON.stringify(tasks));
    renderTasks();
}

function deleteTask(index) {
    tasks.splice(index, 1);
    localStorage.setItem('pomodoroTasks', JSON.stringify(tasks));
    renderTasks();
}

// Task Event Listeners
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
let pomodoroCount = parseInt(localStorage.getItem('todayPomodoros')) || 0;

function incrementPomodoroCount() {
    pomodoroCount++;
    localStorage.setItem('todayPomodoros', pomodoroCount.toString());
    updateStats();
}

function updateStats() {
    if (todayPomodoros) {
        todayPomodoros.textContent = pomodoroCount;
    }
    
    if (todayTime) {
        const totalMinutes = pomodoroCount * 25;
        todayTime.textContent = `${totalMinutes}dk`;
    }
}

// Bildirimler
function showNotification(message, type = 'info') {
    // Basit bir bildirim sistemi
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
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Sayfa yüklendiğinde görevleri ve istatistikleri yükle
document.addEventListener('DOMContentLoaded', () => {
    renderTasks();
    updateStats();
    updateTimerDisplay();
});

// CSS animasyonu ekle
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    .btn.active {
        background: rgba(255, 255, 255, 0.2) !important;
        border-color: rgba(255, 255, 255, 0.5) !important;
    }
`;
document.head.appendChild(style);

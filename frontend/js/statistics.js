// İstatistikler Sayfası JavaScript

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
const filterButtons = document.querySelectorAll('.filter-btn');
const totalTimeChart = document.getElementById('totalTimeChart');
const totalPomodorosChart = document.getElementById('totalPomodorosChart');
let totalTimeChartInstance = null;
let totalPomodorosChartInstance = null;


filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const period = btn.dataset.period;
        
       
        document.body.className = document.body.className.replace(/period-\w+/g, '');
        document.body.classList.add(`period-${period}`);
        
        loadStatistics(period);
    });
});

// İstatistikleri Yükle
async function loadStatistics(period = 'daily') {
    try {
        showLoading(true);
        
        // API'den veri çek
        const response = await fetch(`${API_BASE_URL}/api/pomodoro/statistics?period=${period}`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            const stats = data.statistics;
            const sessions = stats.sessions || [];
            
            
            const chartData = buildChartDataFromSessions(sessions, period);
            
           
            updateSummary(stats, period);
            
            
            requestAnimationFrame(() => {
                updateCharts(chartData, period, stats);
            });
            
           
            updateCompletedList(stats.task_statistics || []);
        } else {
           
            console.warn('Backend API hatası, mock data kullanılıyor');
            const mockData = generateMockData(period);
            updateCharts(mockData.chartData, period);
            updateSummary(mockData.summary, period);
            updateCompletedList(mockData.completed);
        }
        
    } catch (error) {
        console.error('İstatistikler yüklenirken hata:', error);
        // Hata durumunda da mock data göster
        const mockData = generateMockData(period);
        updateCharts(mockData.chartData, period);
        updateSummary(mockData.summary, period);
        updateCompletedList(mockData.completed);
    } finally {
        showLoading(false);
    }
}

// Sessions verisinden chart data oluştur
function buildChartDataFromSessions(sessions, period) {
    const chartData = {
        labels: [],
        fullData: [],
        halfData: [],
        timeData: [] // Toplam çalışma süresi (dakika cinsinden, ondalık)
    };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (period === 'daily') {
        // Günlük: Bugünün verileri
        // Backend'den gelen sessions zaten bugünün verileri (period'a göre filtrelenmiş)
        const todayLabel = today.toLocaleDateString('tr-TR', { 
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });
        chartData.labels.push(todayLabel);
        
        // Backend'den gelen tüm sessions bugünün verileri, sadece work session'ları filtrele
        const workSessions = sessions.filter(s => s.session_type === 'work');
        
        let fullCount = 0;
        let halfCount = 0;
        let totalMinutes = 0;
        workSessions.forEach(s => {
            const duration = s.duration_minutes || 0;
            totalMinutes += duration;
            if (duration >= 25.0) {
                fullCount++;
            } else if (duration > 0) {
                halfCount++;
            }
        });
        
        chartData.fullData.push(fullCount);
        chartData.halfData.push(halfCount);
        chartData.timeData.push(totalMinutes); // Ondalık dakika değeri
        
    } else if (period === 'weekly') {
        // Haftalık: Son 7 gün (bugün dahil)
        const dayDataArray = [];
        
        // 7 gün için boş veri yapısı oluştur
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD formatı
            
            const label = date.toLocaleDateString('tr-TR', { 
                weekday: 'short',
                day: 'numeric',
                month: 'short'
            });
            chartData.labels.push(label);
            dayDataArray.push({ dateKey, full: 0, half: 0, minutes: 0 });
        }
        
        // Sessions'ları günlere göre grupla
        sessions.forEach(s => {
            if (!s.ended_at || s.session_type !== 'work') return;
            
            const sessionDate = new Date(s.ended_at);
            sessionDate.setHours(0, 0, 0, 0);
            const dateKey = sessionDate.toISOString().split('T')[0];
            
            const dayData = dayDataArray.find(d => d.dateKey === dateKey);
            if (dayData) {
                const duration = s.duration_minutes || 0;
                dayData.minutes += duration;
                if (duration >= 25.0) {
                    dayData.full++;
                } else if (duration > 0) {
                    dayData.half++;
                }
            }
        });
        
        // Verileri sırayla ekle
        dayDataArray.forEach(dayData => {
            chartData.fullData.push(dayData.full);
            chartData.halfData.push(dayData.half);
            chartData.timeData.push(dayData.minutes); // Ondalık dakika değeri
        });
    } else if (period === 'monthly') {
        // Aylık: Son 12 ay
        const monthDataArray = [];
        
        // Son 12 ay için boş veri yapısı oluştur
        for (let i = 11; i >= 0; i--) {
            const date = new Date(today);
            date.setMonth(date.getMonth() - i);
            const year = date.getFullYear();
            const month = date.getMonth(); // 0-11 arası
            
            // Ay anahtarı (YYYY-MM formatı)
            const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
            
            // Ay etiketi
            const label = date.toLocaleDateString('tr-TR', { 
                month: 'short',
                year: 'numeric'
            });
            
            chartData.labels.push(label);
            monthDataArray.push({ 
                monthKey, 
                year, 
                month, 
                full: 0, 
                half: 0, 
                minutes: 0 
            });
        }
        
        // Sessions'ları aylara göre grupla
        sessions.forEach(s => {
            if (!s.ended_at || s.session_type !== 'work') return;
            
            const sessionDate = new Date(s.ended_at);
            const year = sessionDate.getFullYear();
            const month = sessionDate.getMonth();
            const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
            
            const monthData = monthDataArray.find(d => d.monthKey === monthKey);
            if (monthData) {
                const duration = s.duration_minutes || 0;
                monthData.minutes += duration;
                if (duration >= 25.0) {
                    monthData.full++;
                } else if (duration > 0) {
                    monthData.half++;
                }
            }
        });
        
        // Verileri sırayla ekle
        monthDataArray.forEach(monthData => {
            chartData.fullData.push(monthData.full);
            chartData.halfData.push(monthData.half);
            chartData.timeData.push(monthData.minutes); // Ondalık dakika değeri
        });
    }
    
    return chartData;
}

// Mock Data Üret (Test için)
function generateMockData(period) {
    const chartData = {
        labels: [],
        fullData: [],
        halfData: [],
        timeData: [] // Toplam çalışma süresi (dakika cinsinden)
    };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (period === 'daily') {
        // Günlük: Sadece bugünün verileri
        const todayLabel = today.toLocaleDateString('tr-TR', { 
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });
        chartData.labels.push(todayLabel);
        chartData.fullData.push(5); // Mock: 5 tam pomodoro
        chartData.halfData.push(3); // Mock: 3 eksik pomodoro
        chartData.timeData.push((5 * 25) + (3 * 15)); // Mock: Toplam dakika (5*25 + 3*15 = 170dk)
        
    } else if (period === 'weekly') {
        // Haftalık: Son 7 gün (bugün dahil)
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            
            const label = date.toLocaleDateString('tr-TR', { 
                weekday: 'short',
                day: 'numeric',
                month: 'short'
            });
            chartData.labels.push(label);
            const full = Math.floor(Math.random() * 3) + 1;
            const half = Math.floor(Math.random() * 3);
            chartData.fullData.push(full);
            chartData.halfData.push(half);
            chartData.timeData.push((full * 25) + (half * 15)); // Mock: Toplam dakika
        }
    } else if (period === 'monthly') {
        // Aylık: Son 12 ay
        for (let i = 11; i >= 0; i--) {
            const date = new Date(today);
            date.setMonth(date.getMonth() - i);
            
            const label = date.toLocaleDateString('tr-TR', { 
                month: 'short',
                year: 'numeric'
            });
            chartData.labels.push(label);
            
            const full = Math.floor(Math.random() * 20) + 5;
            const half = Math.floor(Math.random() * 10) + 2;
            chartData.fullData.push(full);
            chartData.halfData.push(half);
            chartData.timeData.push((full * 25) + (half * 15)); // Mock: Toplam dakika
        }
    }
    
    const totalFull = chartData.fullData.reduce((a, b) => a + b, 0);
    const totalHalf = chartData.halfData.reduce((a, b) => a + b, 0);
    const totalPomodoros = totalFull + totalHalf;
    const totalTime = chartData.timeData.reduce((a, b) => a + b, 0);
    const days = period === 'daily' ? 1 : period === 'weekly' ? 7 : period === 'monthly' ? 30 : chartData.labels.length;
    
    // En verimli günü bul
    const maxIndex = chartData.fullData.indexOf(Math.max(...chartData.fullData));
    const bestDay = chartData.labels[maxIndex] || '-';
    
    // Tamamlanan pomodorolar listesi (filtreye göre)
    const completed = [];
    if (period === 'daily') {
        // Bugün tamamlananlar
        completed.push({
            title: 'Matematik Ders Çalışması',
            date: today.toLocaleDateString('tr-TR'),
            duration: '25 dk',
            pomodoros: 1
        });
    } else if (period === 'weekly') {
        // Son 7 günün tamamlananları
        for (let i = 0; i < 3; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            completed.push({
                title: i === 0 ? 'Matematik Ders Çalışması' : i === 1 ? 'Proje Geliştirme' : 'Kitap Okuma',
                date: date.toLocaleDateString('tr-TR'),
                duration: `${(i + 1) * 25} dk`,
                pomodoros: i + 1
            });
        }
    }
    
    return {
        chartData,
        summary: {
            totalTime,
            full_pomodoros: totalFull,
            half_pomodoros: totalHalf,
            total_pomodoros: totalPomodoros,
            avgTime: days > 0 ? Math.round(totalTime / days) : 0,
            bestDay: bestDay
        },
        completed: completed
    };
}

// Tüm Grafikleri Güncelle
function updateCharts(data, period = 'daily', stats = null) {
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js yüklenmedi');
        return;
    }
    
    // Renkler: Her zaman turuncu/yeşil
    const colors = {
        time: { bg: 'rgba(249, 115, 22, 0.6)', border: 'rgba(249, 115, 22, 1)' }, // Turuncu
        pomodoros: { bg: 'rgba(34, 197, 94, 0.6)', border: 'rgba(34, 197, 94, 1)' } // Yeşil
    };
    
    // Toplam Çalışma Süresi Grafiği - Backend'den gelen gerçek dakika verileri
    updateTimeChart(totalTimeChart, data, colors.time, period);
    
    // Tamamlanan Pomodoro Grafiği - Stacked bar chart
    updatePomodoroChart(totalPomodorosChart, data, period);
}

// Toplam Çalışma Süresi Grafiği Güncelle
function updateTimeChart(canvas, data, colors, period) {
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Önceki grafiği yok et
    if (totalTimeChartInstance) {
        totalTimeChartInstance.destroy();
    }
    
    // Backend'den gelen gerçek dakika verilerini kullan
    const chartData = (data.timeData || []).map(val => val || 0);
    
    // Eğer veri yoksa veya boşsa, boş bir değer ekle (grafik görünür olsun)
    if (chartData.length === 0 && data.labels && data.labels.length > 0) {
        data.labels.forEach(() => chartData.push(0));
    }
    
    // Light mode kontrolü
    const isLightMode = document.body.classList.contains('light-mode');
    const textColor = isLightMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)';
    const gridColor = isLightMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)';
    
    const newChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels || [],
            datasets: [{
                label: 'Dakika',
                data: chartData,
                backgroundColor: colors.bg,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 4,
                barThickness: period === 'daily' ? 30 : 20,
                maxBarThickness: period === 'daily' ? 40 : 30
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 800,
                easing: 'easeOutCubic'
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: true,
                    callbacks: {
                        label: function(context) {
                            const totalMinutes = context.parsed.y || 0;
                            const minutes = Math.floor(totalMinutes);
                            const seconds = Math.round((totalMinutes - minutes) * 60);
                            if (minutes > 0 && seconds > 0) {
                                return `${minutes}dk ${seconds}sn`;
                            } else if (minutes > 0) {
                                return `${minutes}dk`;
                            } else {
                                return `${seconds}sn`;
                            }
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    stacked: false,
                    ticks: {
                        color: textColor,
                        font: {
                            size: 11
                        }
                    },
                    grid: {
                        color: gridColor
                    }
                },
                x: {
                    stacked: false,
                    ticks: {
                        color: textColor,
                        font: {
                            size: 11
                        },
                        maxRotation: (period === 'weekly' || period === 'monthly') ? 45 : 0,
                        minRotation: (period === 'weekly' || period === 'monthly') ? 45 : 0
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
    
    // Chart instance'ı kaydet
    totalTimeChartInstance = newChart;
}

// Pomodoro Grafiği Güncelle (Stacked Bar Chart)
function updatePomodoroChart(canvas, data, period) {
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Önceki grafiği yok et
    if (totalPomodorosChartInstance) {
        totalPomodorosChartInstance.destroy();
    }
    
    // Veriyi hazırla
    const fullData = data.fullData || [];
    const halfData = data.halfData || [];
    
    // Light mode kontrolü
    const isLightMode = document.body.classList.contains('light-mode');
    const textColor = isLightMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)';
    const gridColor = isLightMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)';
    
    const newChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [
                {
                    label: 'Tam Pomodoro',
                    data: fullData,
                    backgroundColor: 'rgba(34, 197, 94, 0.8)', // Yeşil
                    borderColor: 'rgba(34, 197, 94, 1)',
                    borderWidth: 1,
                    borderRadius: 0,
                    barThickness: period === 'daily' ? 30 : 20,
                    maxBarThickness: period === 'daily' ? 40 : 30
                },
                {
                    label: 'Eksik Pomodoro',
                    data: halfData,
                    backgroundColor: 'rgba(251, 191, 36, 0.8)', // Sarı
                    borderColor: 'rgba(251, 191, 36, 1)',
                    borderWidth: 1,
                    borderRadius: 4,
                    barThickness: period === 'daily' ? 30 : 20,
                    maxBarThickness: period === 'daily' ? 40 : 30
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 800,
                easing: 'easeOutCubic'
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: true,
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            return label + ': ' + context.parsed.y;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    stacked: true,
                    ticks: {
                        color: textColor,
                        font: {
                            size: 11
                        },
                        stepSize: 1,
                        callback: function(value) {
                            // Sadece tam sayıları göster
                            if (Number.isInteger(value)) {
                                return value;
                            }
                            return '';
                        }
                    },
                    grid: {
                        color: gridColor
                    }
                },
                x: {
                    stacked: true,
                    ticks: {
                        color: textColor,
                        font: {
                            size: 11
                        },
                        maxRotation: (period === 'weekly' || period === 'monthly') ? 45 : 0,
                        minRotation: (period === 'weekly' || period === 'monthly') ? 45 : 0
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
    
    // Chart instance'ı kaydet
    totalPomodorosChartInstance = newChart;
}

// Özet Bilgileri Güncelle
function updateSummary(summary, period = 'daily') {
    const totalTimeEl = document.getElementById('totalTime');
    const fullPomodorosEl = document.getElementById('fullPomodoros');
    const halfPomodorosEl = document.getElementById('halfPomodoros');
    const avgTimeEl = document.getElementById('avgTime');
    const bestDayEl = document.getElementById('bestDay');
    const bestDayLabelEl = document.querySelector('#bestDayItemSummary .summary-label');
    
    // Aylık görünümde label'ı "En Verimli Ay" olarak değiştir
    if (bestDayLabelEl) {
        if (period === 'monthly') {
            bestDayLabelEl.textContent = 'En Verimli Ay';
        } else {
            bestDayLabelEl.textContent = 'En Verimli Gün';
        }
    } else {
        // Eğer querySelector çalışmadıysa, label'ı başka şekilde bul
        const bestDayItem = document.getElementById('bestDayItemSummary');
        if (bestDayItem) {
            const labelEl = bestDayItem.querySelector('.summary-label');
            if (labelEl) {
                if (period === 'monthly') {
                    labelEl.textContent = 'En Verimli Ay';
                } else {
                    labelEl.textContent = 'En Verimli Gün';
                }
            }
        }
    }
    
    // Backend'den gelen total_work_minutes kullan
    if (totalTimeEl) {
        const totalMinutes = summary.total_work_minutes || 0;
        const totalSeconds = Math.round(totalMinutes * 60);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        if (minutes > 0) {
            totalTimeEl.textContent = `${minutes}dk ${seconds.toString().padStart(2, '0')}sn`;
        } else {
            totalTimeEl.textContent = `${seconds}sn`;
        }
    }
    
    if (fullPomodorosEl) fullPomodorosEl.textContent = summary.full_pomodoros || 0;
    if (halfPomodorosEl) halfPomodorosEl.textContent = summary.half_pomodoros || 0;
    
    // Ortalama çalışma süresi hesapla
    // Günlük: Toplam süre / 1 gün
    // Haftalık: Toplam süre / 7 gün
    // Aylık: Toplam süre / 12 ay (ay başına ortalama)
    if (avgTimeEl) {
        let avgMinutes = 0;
        if (period === 'daily') {
            avgMinutes = Math.round((summary.total_work_minutes || 0) / 1);
        } else if (period === 'weekly') {
            avgMinutes = Math.round((summary.total_work_minutes || 0) / 7);
        } else if (period === 'monthly') {
            avgMinutes = Math.round((summary.total_work_minutes || 0) / 12);
        }
        avgTimeEl.textContent = `${avgMinutes} dk`;
    }
    
    // En verimli günü/ayı bul
    if (bestDayEl && summary.sessions && summary.sessions.length > 0) {
        const workSessions = summary.sessions.filter(s => s.session_type === 'work');
        if (workSessions.length > 0) {
            if (period === 'monthly') {
                // Aylık görünüm: En verimli ayı bul (en çok pomodoro yapılan ay)
                const monthCounts = {};
                workSessions.forEach(s => {
                    if (s.ended_at) {
                        const date = new Date(s.ended_at);
                        const monthKey = date.toLocaleDateString('tr-TR', { 
                            month: 'short',
                            year: 'numeric'
                        });
                        monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
                    }
                });
                const bestMonthKeys = Object.keys(monthCounts);
                if (bestMonthKeys.length > 0) {
                    const bestMonth = bestMonthKeys.reduce((a, b) => monthCounts[a] > monthCounts[b] ? a : b);
                    bestDayEl.textContent = bestMonth;
                } else {
                    bestDayEl.textContent = '-';
                }
            } else {
                // Günlük ve Haftalık görünüm: En verimli günü bul
                const dayCounts = {};
                workSessions.forEach(s => {
                    if (s.ended_at) {
                        const date = new Date(s.ended_at);
                        const dateKey = date.toLocaleDateString('tr-TR', { 
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short'
                        });
                        dayCounts[dateKey] = (dayCounts[dateKey] || 0) + 1;
                    }
                });
                const bestDayKeys = Object.keys(dayCounts);
                if (bestDayKeys.length > 0) {
                    const bestDay = bestDayKeys.reduce((a, b) => dayCounts[a] > dayCounts[b] ? a : b);
                    bestDayEl.textContent = bestDay;
                } else {
                    bestDayEl.textContent = '-';
                }
            }
        } else {
            bestDayEl.textContent = '-';
        }
    } else {
        if (bestDayEl) bestDayEl.textContent = '-';
    }
}

// Tamamlanan Listesini Güncelle
function updateCompletedList(taskStatistics) {
    const listContainer = document.getElementById('completedList');
    
    if (!taskStatistics || taskStatistics.length === 0) {
        listContainer.innerHTML = '<div class="empty-state"><p>Henüz tamamlanan pomodoro yok.</p></div>';
        return;
    }
    
    listContainer.innerHTML = taskStatistics.map(task => {
        // Süreyi formatla
        const totalSeconds = Math.round(task.total_minutes * 60);
        const totalMinutes = Math.floor(totalSeconds / 60);
        const totalSecs = totalSeconds % 60;
        const totalTimeStr = totalMinutes > 0 
            ? `${totalMinutes}dk ${totalSecs.toString().padStart(2, '0')}sn`
            : `${totalSecs}sn`;
        
        // Tam pomodoro dakikası
        const fullSeconds = Math.round(task.full_minutes * 60);
        const fullMinutes = Math.floor(fullSeconds / 60);
        const fullSecs = fullSeconds % 60;
        const fullTimeStr = fullMinutes > 0 
            ? `${fullMinutes}dk ${fullSecs.toString().padStart(2, '0')}sn`
            : `${fullSecs}sn`;
        
        // Eksik pomodoro dakikası
        const halfSeconds = Math.round(task.half_minutes * 60);
        const halfMinutes = Math.floor(halfSeconds / 60);
        const halfSecs = halfSeconds % 60;
        const halfTimeStr = halfMinutes > 0 
            ? `${halfMinutes}dk ${halfSecs.toString().padStart(2, '0')}sn`
            : `${halfSecs}sn`;
        
        const fullCount = task.full_pomodoros || 0;
        const halfCount = task.half_pomodoros || 0;
        
        return `
            <div class="completed-item">
                <div class="completed-item-header">
                    <div class="completed-item-title">${task.task_text}</div>
                </div>
                
                <div class="completed-item-grid">
                    <div class="stat-box full-box">
                        <div class="stat-box-header full-header">
                            <span class="stat-box-icon">✓</span>
                            <span class="stat-box-title">Tam Pomodoro</span>
                        </div>
                        <div class="stat-box-content">
                            <div class="stat-box-value full-value">${fullCount}</div>
                            <div class="stat-box-subtitle">Pomodoro</div>
                            <div class="stat-box-time">${fullTimeStr}</div>
                        </div>
                    </div>
                    
                    <div class="stat-box half-box">
                        <div class="stat-box-header half-header">
                            <span class="stat-box-icon">!</span>
                            <span class="stat-box-title">Eksik Pomodoro</span>
                        </div>
                        <div class="stat-box-content">
                            <div class="stat-box-value half-value">${halfCount}</div>
                            <div class="stat-box-subtitle">Pomodoro</div>
                            <div class="stat-box-time">${halfTimeStr}</div>
                        </div>
                    </div>
                    
                    <div class="stat-box total-box">
                        <div class="stat-box-header total-header">
                            <span class="stat-box-icon">⏱️</span>
                            <span class="stat-box-title">Toplam Süre</span>
                        </div>
                        <div class="stat-box-content">
                            <div class="stat-box-value total-value">${totalTimeStr}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Loading Fonksiyonu
function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        if (show) {
            spinner.style.display = 'flex';
        } else {
            spinner.style.display = 'none';
        }
    }
}

// Profil Dropdown İşlevselliği
function initProfileDropdown() {
    const profileBtn = document.getElementById('profileBtn');
    const profileDropdown = document.querySelector('.profile-dropdown');
    const logoutBtn = document.getElementById('logoutBtn');
    const userEmail = document.getElementById('userEmail');
    
    if (profileBtn && profileDropdown) {
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isActive = profileDropdown.classList.contains('active');
            profileDropdown.classList.toggle('active');
            console.log('Profil butonuna tıklandı, dropdown aktif:', !isActive);
        });
        
        // Dışarı tıklanınca dropdown'ı kapat
        document.addEventListener('click', (e) => {
            if (!profileDropdown.contains(e.target)) {
                profileDropdown.classList.remove('active');
            }
        });
    } else {
        console.error('Profil butonu veya dropdown bulunamadı!', { profileBtn, profileDropdown });
    }
    
    // Çıkış İşlemi
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            console.log('Çıkış butonuna basıldı...');
            
            try {
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
            
            window.location.href = 'tanitim.html';
        });
    }
    
}

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
        console.error('Kullanıcı bilgileri yüklenemedi:', error);
        // Network hatası - misafir olarak göster
        userEmail.textContent = 'Misafir';
    }
}


document.addEventListener('DOMContentLoaded', () => {
    
    loadTheme();
    
    
    initProfileDropdown();
    
    
    loadUserInfo();
    
    
    document.body.classList.add('period-daily');
    loadStatistics('daily');
    
    
    window.addEventListener('themeChanged', () => {
        const activePeriod = document.querySelector('.filter-btn.active')?.dataset.period || 'daily';
        loadStatistics(activePeriod);
    });
    
    
    if (typeof Chart === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
        script.onload = () => {
            loadStatistics('daily');
        };
        document.head.appendChild(script);
    }
});


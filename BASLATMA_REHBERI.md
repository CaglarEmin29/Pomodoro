# 🚀 Pomodoro Uygulaması Başlatma Rehberi

## ⚠️ ÖNEMLİ: İki sunucu çalıştırmanız gerekiyor!

Bu uygulama **Frontend** ve **Backend** olmak üzere iki ayrı sunucu kullanır.

---

## 📋 Gereksinimler

- Python 3.7 veya üzeri
- Backend için gerekli Python paketleri (requirements.txt)

---

## 🔧 1. BACKEND SUNUCUSUNU BAŞLATMA

### Adım 1: Backend klasörüne gidin
```bash
cd kodlar/backend
```

### Adım 2: Virtual environment'ı aktif edin (varsa)
**Windows:**
```bash
venv\Scripts\activate
```

**Linux/Mac:**
```bash
source venv/bin/activate
```

### Adım 3: Gerekli paketleri yükleyin (eğer yüklü değilse)
```bash
pip install -r requirements.txt
```

### Adım 4: Backend sunucusunu başlatın
```bash
python app.py
```

✅ **Başarılı olursa şunu göreceksiniz:**
```
 * Running on http://0.0.0.0:5000
 * Debug mode: on
Veritabanı tabloları oluşturuldu.
Google Client ID: ✓ (veya ✗)
```

**Backend sunucusu `http://localhost:5000` adresinde çalışıyor olmalı.**

---

## 🌐 2. FRONTEND SUNUCUSUNU BAŞLATMA

**Yeni bir terminal/komut satırı penceresi açın!** (Backend sunucusu çalışırken)

### Adım 1: Frontend klasörüne gidin
```bash
cd kodlar/frontend
```

### Adım 2: Frontend sunucusunu başlatın
```bash
python server.py
```

✅ **Başarılı olursa şunu göreceksiniz:**
```
Frontend sunucusu http://localhost:3000 adresinde çalışıyor
Tarayıcıda otomatik açılıyor...
```

**Frontend sunucusu `http://localhost:3000` adresinde çalışıyor olmalı.**

---

## ✅ DOĞRULAMA

### 1. Backend Kontrolü
Tarayıcınızda şu adresi açın:
```
http://localhost:5000
```

Şöyle bir JSON yanıtı görmelisiniz:
```json
{
  "message": "Pomodoro Uygulaması Backend API",
  "version": "1.0.0",
  "endpoints": {...}
}
```

### 2. Frontend Kontrolü
Tarayıcınızda şu adresi açın:
```
http://localhost:3000/html/index.html
```

Ana sayfa görünmelidir.

---

## 🎯 KULLANIM

1. **Frontend sunucusu** çalışırken tarayıcıda `http://localhost:3000/html/index.html` adresine gidin
2. Kayıt olun veya giriş yapın
3. Uygulamayı kullanmaya başlayın!

---

## ⚠️ SORUN GİDERME

### Backend çalışmıyor?
- Virtual environment aktif mi kontrol edin
- Port 5000 başka bir uygulama tarafından kullanılıyor olabilir
- `pip install -r requirements.txt` komutunu çalıştırın

### Frontend çalışmıyor?
- Port 3000 başka bir uygulama tarafından kullanılıyor olabilir
- `server.py` dosyasının `kodlar/frontend/` klasöründe olduğundan emin olun

### API bağlantı hatası?
- Backend sunucusunun çalıştığından emin olun
- `http://localhost:5000` adresine tarayıcıdan erişebiliyor musunuz kontrol edin
- CORS hatası alıyorsanız backend'in `localhost:3000` için ayarlandığından emin olun

### Veritabanı hatası?
- `kodlar/backend/instance/pomodoro.db` dosyası otomatik oluşturulur
- Sorun devam ederse `instance` klasörünü silip tekrar deneyin

---

## 🛑 SUNUCULARI DURDURMA

Her iki terminalde de `Ctrl + C` tuşlarına basın.

---

## 📝 NOTLAR

- **Backend** sunucusu (`localhost:5000`) API isteklerini işler
- **Frontend** sunucusu (`localhost:3000`) HTML/CSS/JS dosyalarını sunar
- İkisi de **aynı anda** çalışmalıdır
- Backend sunucusu durursa, frontend'den API istekleri başarısız olur

---

## 🎉 HAZIRSINIZ!

Her iki sunucu da çalıştığında, uygulamanızı kullanmaya başlayabilirsiniz!


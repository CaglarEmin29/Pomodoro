# Pomodoro Uygulaması - Backend

Bu proje, Pomodoro Tekniğini dijital ortamda uygulayabileceğiniz bir web uygulamasının backend kısmıdır.

## Özellikler

- ✅ Kullanıcı kayıt ve giriş sistemi
- ✅ Google OAuth entegrasyonu
- ✅ SQLite veritabanı
- ✅ Flask web framework
- ✅ Güvenli şifre hashleme
- ✅ Session yönetimi

## Kurulum

### 1. Gereksinimler

- Python 3.8 veya üzeri
- pip (Python paket yöneticisi)

### 2. Projeyi İndirin

```bash
git clone <repository-url>
cd kodlar/backend
```

### 3. Sanal Ortam Oluşturun

```bash
python -m venv venv
```

### 4. Sanal Ortamı Aktifleştirin

**Windows:**
```bash
venv\Scripts\activate
```

**macOS/Linux:**
```bash
source venv/bin/activate
```

### 5. Bağımlılıkları Yükleyin

```bash
pip install -r requirements.txt
```

### 6. Çevre Değişkenlerini Ayarlayın

1. `env.example` dosyasını `.env` olarak kopyalayın:
```bash
copy env.example .env
```

2. `.env` dosyasını düzenleyin ve gerekli değerleri girin:
   - `SECRET_KEY`: Güvenli bir rastgele anahtar
   - `GOOGLE_CLIENT_ID`: Google OAuth Client ID
   - `GOOGLE_CLIENT_SECRET`: Google OAuth Client Secret

### 7. Google OAuth Ayarları

1. [Google Cloud Console](https://console.cloud.google.com/)'a gidin
2. Yeni bir proje oluşturun veya mevcut projeyi seçin
3. "APIs & Services" > "Credentials" bölümüne gidin
4. "Create Credentials" > "OAuth 2.0 Client IDs" seçin
5. Application type olarak "Web application" seçin
6. Authorized redirect URIs'ye şunu ekleyin:
   ```
   http://localhost:5000/auth/google/callback
   ```
7. Client ID ve Client Secret'i `.env` dosyasına ekleyin

### 8. Uygulamayı Çalıştırın

```bash
python app.py
```

Uygulama `http://localhost:5000` adresinde çalışacaktır.

## API Endpoints

### Kimlik Doğrulama

- `POST /register` - Email ve şifre ile kayıt
- `POST /login` - Email ve şifre ile giriş
- `GET /logout` - Çıkış yap
- `GET /auth/google` - Google OAuth ile giriş
- `GET /auth/google/callback` - Google OAuth callback

### Kullanıcı

- `GET /api/user` - Giriş yapmış kullanıcı bilgileri

## Örnek Kullanım

### Kayıt Olma

```bash
curl -X POST http://localhost:5000/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "123456"}'
```

### Giriş Yapma

```bash
curl -X POST http://localhost:5000/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "123456"}'
```

## Proje Yapısı

```
backend/
├── app.py              # Ana Flask uygulaması
├── models.py           # Veritabanı modelleri
├── auth.py             # Kimlik doğrulama route'ları
├── config.py           # Yapılandırma ayarları
├── requirements.txt    # Python bağımlılıkları
└── pomodoro.db         # SQLite veritabanı (otomatik oluşur)
```

## Geliştirme Notları

- Veritabanı tabloları uygulama ilk çalıştırıldığında otomatik oluşturulur
- Debug modu aktif olduğunda detaylı hata mesajları gösterilir
- Şifreler bcrypt ile güvenli şekilde hashlenir
- Session'lar 1 saat süreyle geçerlidir

## Sonraki Adımlar

- [ ] Pomodoro timer endpoint'leri
- [ ] Görev yönetimi sistemi
- [ ] İstatistik ve raporlama
- [ ] Frontend entegrasyonu

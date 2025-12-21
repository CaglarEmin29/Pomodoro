import os
from dotenv import load_dotenv

# .env dosyasını yükle
load_dotenv()

class Config:
    """Uygulama yapılandırma sınıfı"""
    
    # Veritabanı ayarları
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///pomodoro.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Güvenlik ayarları
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
    # Session ayarları
    PERMANENT_SESSION_LIFETIME = 3600  # 1 saat
    
    # Google OAuth ayarları
    GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
    GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET')
    GOOGLE_REDIRECT_URI = os.environ.get('GOOGLE_REDIRECT_URI', 'http://localhost:5000/auth/google/callback')
    
    # Debug: OAuth credentials kontrolü
    @classmethod
    def print_oauth_status(cls):
        print(f"Google Client ID: {'✓' if cls.GOOGLE_CLIENT_ID else '✗'}")
        print(f"Google Client Secret: {'✓' if cls.GOOGLE_CLIENT_SECRET else '✗'}")
        if cls.GOOGLE_CLIENT_ID:
            print(f"Client ID: {cls.GOOGLE_CLIENT_ID[:20]}...")
    
    # OAuth ayarları
    OAUTH_CREDENTIALS = {
        'google': {
            'id': GOOGLE_CLIENT_ID,
            'secret': GOOGLE_CLIENT_SECRET
        }
    }

from flask import Flask, jsonify
from flask_login import LoginManager
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from config import Config
from models import db, User

def create_app():
    """Flask uygulamasını oluştur ve yapılandır"""
    
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Session ayarları
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
    app.config['SESSION_COOKIE_SECURE'] = False  # Development için
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    
    # CORS ayarları (frontend için)
    CORS(app, 
         origins=['http://localhost:3000', 'http://127.0.0.1:3000'],
         supports_credentials=True,
         allow_headers=['Content-Type', 'Authorization'],
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
    
    # Veritabanı başlatma
    db.init_app(app)
    
    # Flask-Login yapılandırması
    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'
    login_manager.login_message = 'Bu sayfaya erişmek için giriş yapmalısınız.'
    login_manager.login_message_category = 'info'
    
    # Bcrypt başlatma
    bcrypt = Bcrypt(app)
    
    @login_manager.user_loader
    def load_user(user_id):
        """Kullanıcı yükleme fonksiyonu"""
        return User.query.get(int(user_id))
    
    # Ana sayfa route'u
    @app.route('/')
    def index():
        """Ana sayfa - hoş geldiniz mesajı"""
        return jsonify({
            'message': 'Pomodoro Uygulaması Backend API',
            'version': '1.0.0',
            'endpoints': {
                'auth': {
                    'register': 'POST /register',
                    'login': 'POST /login',
                    'logout': 'GET /logout',
                    'google_auth': 'GET /auth/google',
                    'google_callback': 'GET /auth/google/callback'
                },
                'user': {
                    'profile': 'GET /api/user'
                }
            }
        })
    
    # Frontend sayfaları için route'lar
    @app.route('/register')
    def register_page():
        """Kayıt sayfası"""
        return app.send_static_file('register.html')
    
    @app.route('/login')
    def login_page():
        """Giriş sayfası"""
        return app.send_static_file('login.html')
    
    # Kullanıcı bilgisi endpoint'i
    @app.route('/api/user')
    def get_user():
        """Giriş yapmış kullanıcının bilgilerini döndür"""
        from flask_login import current_user
        
        if current_user.is_authenticated:
            return jsonify({
                'success': True,
                'user': current_user.to_dict()
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Giriş yapmamış kullanıcı'
            }), 401
    
    # Auth blueprint'ini kaydet
    from auth import auth_bp, init_auth
    app.register_blueprint(auth_bp, url_prefix='/')
    
    # Pomodoro blueprint'ini kaydet
    from pomodoro import pomodoro_bp
    app.register_blueprint(pomodoro_bp, url_prefix='/')
    
    # OAuth durumunu kontrol et
    Config.print_oauth_status()
    init_auth(app)
    
    # Veritabanı tablolarını oluştur
    with app.app_context():
        db.create_all()
        print("Veritabanı tabloları oluşturuldu.")
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)

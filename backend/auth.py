from flask import Blueprint, request, jsonify, redirect, url_for, session
from flask_login import login_user, logout_user, login_required, current_user
from flask_bcrypt import Bcrypt
from authlib.integrations.flask_client import OAuth
from models import db, User
from config import Config
import secrets

# Blueprint oluştur
auth_bp = Blueprint('auth', __name__)

# Bcrypt ve OAuth başlatma
bcrypt = Bcrypt()
oauth = OAuth()

def init_auth(app):
    """Auth modülünü Flask uygulaması ile başlat"""
    bcrypt.init_app(app)
    oauth.init_app(app)
    
    # Google OAuth yapılandırması
    if Config.GOOGLE_CLIENT_ID and Config.GOOGLE_CLIENT_SECRET:
        try:
            # Standart OAuth yapılandırması
            oauth.register(
                name='google',
                client_id=Config.GOOGLE_CLIENT_ID,
                client_secret=Config.GOOGLE_CLIENT_SECRET,
                server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
                client_kwargs={
                    'scope': 'openid email profile',
                    'prompt': 'select_account'
                }
            )
            print("Google OAuth yapılandırıldı")
        except Exception as e:
            print(f"Google OAuth hatası: {e}")
            # Fallback: Manuel yapılandırma
            oauth.register(
                name='google',
                client_id=Config.GOOGLE_CLIENT_ID,
                client_secret=Config.GOOGLE_CLIENT_SECRET,
                access_token_url='https://oauth2.googleapis.com/token',
                authorize_url='https://accounts.google.com/o/oauth2/v2/auth',
                api_base_url='https://www.googleapis.com/oauth2/v1/',
                client_kwargs={
                    'scope': 'openid email profile',
                    'prompt': 'select_account'
                },
                jwks_uri='https://www.googleapis.com/oauth2/v3/certs'
            )
            print("Google OAuth yapılandırıldı (Fallback)")
    else:
        print("Google OAuth credentials bulunamadı!")

@auth_bp.route('/register', methods=['POST'])
def register():
    """Email ve şifre ile kullanıcı kaydı"""
    try:
        data = request.get_json()
        
        if not data or not data.get('email') or not data.get('password'):
            return jsonify({
                'success': False,
                'message': 'Email ve şifre gerekli'
            }), 400
        
        email = data['email'].lower().strip()
        password = data['password']
        
        # Email format kontrolü
        if '@' not in email or '.' not in email:
            return jsonify({
                'success': False,
                'message': 'Geçerli bir email adresi girin'
            }), 400
        
        # Şifre uzunluk kontrolü
        if len(password) < 6:
            return jsonify({
                'success': False,
                'message': 'Şifre en az 6 karakter olmalı'
            }), 400
        
        # Kullanıcı zaten var mı kontrol et
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return jsonify({
                'success': False,
                'message': 'Bu email adresi zaten kayıtlı'
            }), 409
        
        # Yeni kullanıcı oluştur
        password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
        new_user = User(
            email=email,
            password_hash=password_hash
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        # Kullanıcıyı otomatik giriş yap
        login_user(new_user, remember=True)
        
        return jsonify({
            'success': True,
            'message': 'Kayıt başarılı',
            'user': new_user.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Kayıt sırasında hata oluştu'
        }), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """Email ve şifre ile giriş"""
    try:
        data = request.get_json()
        
        if not data or not data.get('email') or not data.get('password'):
            return jsonify({
                'success': False,
                'message': 'Email ve şifre gerekli'
            }), 400
        
        email = data['email'].lower().strip()
        password = data['password']
        
        # Kullanıcıyı bul
        user = User.query.filter_by(email=email).first()
        
        if not user or not user.password_hash:
            return jsonify({
                'success': False,
                'message': 'Geçersiz email veya şifre'
            }), 401
        
        # Şifre kontrolü
        if not bcrypt.check_password_hash(user.password_hash, password):
            return jsonify({
                'success': False,
                'message': 'Geçersiz email veya şifre'
            }), 401
        
        # Kullanıcıyı giriş yap
        login_user(user, remember=data.get('remember', False))
        
        return jsonify({
            'success': True,
            'message': 'Giriş başarılı',
            'user': user.to_dict()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Giriş sırasında hata oluştu'
        }), 500

@auth_bp.route('/logout', methods=['GET', 'POST'])
def logout():
    """Kullanıcı çıkışı"""
    try:
        # Kullanıcı email'ini al (logout_user'dan önce)
        user_email = current_user.email if current_user.is_authenticated and hasattr(current_user, 'email') else 'Bilinmeyen'
        
        # Kullanıcı giriş yapmışsa çıkış yap
        if current_user.is_authenticated:
            logout_user()
            print(f"Kullanıcı çıkış yaptı: {user_email}")
        
        # Session'ı tamamen temizle
        session.clear()
        
        # Response oluştur
        response = jsonify({
            'success': True,
            'message': 'Çıkış başarılı'
        })
        
        # Cookie'leri temizle
        response.set_cookie('session', '', expires=0, path='/')
        response.set_cookie('remember_token', '', expires=0, path='/')
        
        return response
        
    except Exception as e:
        print(f"Çıkış hatası: {e}")
        return jsonify({
            'success': False,
            'message': 'Çıkış sırasında hata oluştu'
        }), 500

@auth_bp.route('/auth/google')
def google_auth():
    """Google OAuth ile giriş başlat"""
    try:
        redirect_uri = url_for('auth.google_callback', _external=True)
        return oauth.google.authorize_redirect(redirect_uri)
    except Exception as e:
        print(f"Google OAuth hatası: {e}")
        import traceback
        traceback.print_exc()
        return redirect('/login.html?error=oauth_failed')

@auth_bp.route('/auth/google/callback')
def google_callback():
    """Google OAuth callback"""
    try:
        # Token al
        token = oauth.google.authorize_access_token()
        
        # Kullanıcı bilgilerini al - token içinde userinfo var
        user_info = token.get('userinfo')
        
        if not user_info:
            # Eğer token'da yoksa manuel çağır
            import requests
            resp = requests.get(
                'https://www.googleapis.com/oauth2/v1/userinfo',
                headers={'Authorization': f"Bearer {token['access_token']}"}
            )
            user_info = resp.json()
        
        email = user_info.get('email')
        google_id = user_info.get('sub') or user_info.get('id')
        
        if not email:
            return redirect('http://localhost:3000/html/login.html?error=no_email')
        
        # Kullanıcıyı bul veya oluştur
        user = User.query.filter_by(email=email).first()
        
        if not user:
            # Yeni kullanıcı oluştur
            user = User(
                email=email,
                google_id=google_id
            )
            db.session.add(user)
            db.session.commit()
        elif not user.google_id:
            # Mevcut kullanıcıya Google ID ekle
            user.google_id = google_id
            db.session.commit()
        
        # Kullanıcıyı giriş yap
        login_user(user, remember=True)
        
        # Dashboard'a yönlendir (frontend URL'i)
        return redirect('http://localhost:3000/html/anasayfa.html')
        
    except Exception as e:
        print(f"Google callback hatası: {e}")
        import traceback
        traceback.print_exc()
        return redirect('http://localhost:3000/html/login.html?error=oauth_failed')

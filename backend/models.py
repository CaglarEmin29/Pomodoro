from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime

db = SQLAlchemy()

class User(UserMixin, db.Model):
    """Kullanıcı modeli"""
    
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(128), nullable=True)  # Google OAuth kullanıcıları için nullable
    google_id = db.Column(db.String(50), unique=True, nullable=True, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # İlişkiler
    tasks = db.relationship('Task', backref='user', lazy=True, cascade='all, delete-orphan')
    pomodoro_sessions = db.relationship('PomodoroSession', backref='user', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<User {self.email}>'
    
    def to_dict(self):
        """Kullanıcı bilgilerini dictionary olarak döndür"""
        return {
            'id': self.id,
            'email': self.email,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'has_google_auth': bool(self.google_id)
        }


class Task(db.Model):
    """Görev modeli"""
    
    __tablename__ = 'tasks'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    text = db.Column(db.String(500), nullable=False)
    completed = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # İlişkiler
    pomodoro_sessions = db.relationship('PomodoroSession', backref='task', lazy=True)
    
    def __repr__(self):
        return f'<Task {self.id}: {self.text[:50]}>'
    
    def to_dict(self):
        """Görev bilgilerini dictionary olarak döndür"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'text': self.text,
            'completed': self.completed,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class PomodoroSession(db.Model):
    """Pomodoro çalışma oturumu modeli"""
    
    __tablename__ = 'pomodoro_sessions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    task_id = db.Column(db.Integer, db.ForeignKey('tasks.id'), nullable=True, index=True)  # Mola için nullable
    session_type = db.Column(db.String(20), nullable=False, index=True)  # 'work', 'shortBreak', 'longBreak'
    duration_minutes = db.Column(db.Float, nullable=False)  # Dakika cinsinden süre (ondalıklı olabilir)
    started_at = db.Column(db.DateTime, nullable=False)
    ended_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    def __repr__(self):
        return f'<PomodoroSession {self.id}: {self.session_type} - {self.duration_minutes}dk>'
    
    def to_dict(self):
        """Oturum bilgilerini dictionary olarak döndür"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'task_id': self.task_id,
            'session_type': self.session_type,
            'duration_minutes': self.duration_minutes,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'ended_at': self.ended_at.isoformat() if self.ended_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

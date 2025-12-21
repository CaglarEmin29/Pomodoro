from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from models import db, Task, PomodoroSession
from datetime import datetime, timedelta

# Blueprint oluştur
pomodoro_bp = Blueprint('pomodoro', __name__)


# ==================== GÖREVLER (TASKS) ====================

@pomodoro_bp.route('/api/tasks', methods=['GET'])
@login_required
def get_tasks():
    """Kullanıcının görevlerini listele"""
    try:
        tasks = Task.query.filter_by(user_id=current_user.id).order_by(Task.created_at.desc()).all()
        
        return jsonify({
            'success': True,
            'tasks': [task.to_dict() for task in tasks]
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Görevler alınamadı'
        }), 500


@pomodoro_bp.route('/api/tasks', methods=['POST'])
@login_required
def create_task():
    """Yeni görev oluştur"""
    try:
        data = request.get_json()
        
        if not data or not data.get('text'):
            return jsonify({
                'success': False,
                'message': 'Görev metni gerekli'
            }), 400
        
        text = data['text'].strip()
        if not text:
            return jsonify({
                'success': False,
                'message': 'Görev metni boş olamaz'
            }), 400
        
        # Yeni görev oluştur
        new_task = Task(
            user_id=current_user.id,
            text=text,
            completed=False
        )
        
        db.session.add(new_task)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Görev eklendi',
            'task': new_task.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Görev eklenirken hata oluştu'
        }), 500


@pomodoro_bp.route('/api/tasks/<int:task_id>', methods=['PUT'])
@login_required
def update_task(task_id):
    """Görevi güncelle (tamamlandı/aktif durumu)"""
    try:
        task = Task.query.filter_by(id=task_id, user_id=current_user.id).first()
        
        if not task:
            return jsonify({
                'success': False,
                'message': 'Görev bulunamadı'
            }), 404
        
        data = request.get_json()
        
        # Tamamlanma durumunu güncelle
        if 'completed' in data:
            task.completed = bool(data['completed'])
        
        # Metni güncelle
        if 'text' in data and data['text']:
            task.text = data['text'].strip()
        
        task.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Görev güncellendi',
            'task': task.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Görev güncellenirken hata oluştu'
        }), 500


@pomodoro_bp.route('/api/tasks/<int:task_id>', methods=['DELETE'])
@login_required
def delete_task(task_id):
    """Görevi sil"""
    try:
        task = Task.query.filter_by(id=task_id, user_id=current_user.id).first()
        
        if not task:
            return jsonify({
                'success': False,
                'message': 'Görev bulunamadı'
            }), 404
        
        db.session.delete(task)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Görev silindi'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Görev silinirken hata oluştu'
        }), 500


# ==================== POMODORO OTURUMLARI ====================

@pomodoro_bp.route('/api/pomodoro/start', methods=['POST'])
@login_required
def start_pomodoro():
    """Pomodoro oturumu başlat"""
    try:
        data = request.get_json()
        
        if not data or 'session_type' not in data:
            return jsonify({
                'success': False,
                'message': 'Oturum tipi gerekli (work, shortBreak, longBreak)'
            }), 400
        
        session_type = data['session_type']
        
        if session_type not in ['work', 'shortBreak', 'longBreak']:
            return jsonify({
                'success': False,
                'message': 'Geçersiz oturum tipi'
            }), 400
        
        # Çalışma oturumu için görev zorunlu
        task_id = data.get('task_id')
        if session_type == 'work':
            if not task_id:
                return jsonify({
                    'success': False,
                    'message': 'Çalışma oturumu için görev seçilmesi gerekiyor'
                }), 400
            
            # Görevin kullanıcıya ait olduğunu kontrol et
            task = Task.query.filter_by(id=task_id, user_id=current_user.id).first()
            if not task:
                return jsonify({
                    'success': False,
                    'message': 'Görev bulunamadı'
                }), 404
        
        # Aktif oturum var mı kontrol et (opsiyonel - birden fazla aktif oturum olmasın)
        # Şimdilik kullanıcı isterse birden fazla başlatabilir, ama bitirmeden yeni başlatamaz mantığı yok
        
        # Yeni oturum oluştur
        new_session = PomodoroSession(
            user_id=current_user.id,
            task_id=task_id if session_type == 'work' else None,
            session_type=session_type,
            duration_minutes=0.0,  # Henüz bitmedi
            started_at=datetime.utcnow()
        )
        
        db.session.add(new_session)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Pomodoro oturumu başlatıldı',
            'session': new_session.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Pomodoro oturumu başlatılırken hata oluştu'
        }), 500


@pomodoro_bp.route('/api/pomodoro/end', methods=['POST'])
@login_required
def end_pomodoro():
    """Pomodoro oturumunu bitir ve süreyi kaydet"""
    try:
        data = request.get_json()
        
        if not data or 'session_id' not in data:
            return jsonify({
                'success': False,
                'message': 'Oturum ID gerekli'
            }), 400
        
        session_id = data['session_id']
        duration_minutes = data.get('duration_minutes', 0)  # Dakika cinsinden
        
        if duration_minutes < 0:
            return jsonify({
                'success': False,
                'message': 'Geçersiz süre'
            }), 400
        
        # Oturumu bul
        session = PomodoroSession.query.filter_by(
            id=session_id, 
            user_id=current_user.id
        ).first()
        
        if not session:
            return jsonify({
                'success': False,
                'message': 'Oturum bulunamadı'
            }), 404
        
        # Oturumu güncelle
        session.duration_minutes = duration_minutes
        session.ended_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Pomodoro oturumu tamamlandı',
            'session': session.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Pomodoro oturumu bitirilirken hata oluştu'
        }), 500


# ==================== İSTATİSTİKLER ====================

@pomodoro_bp.route('/api/pomodoro/statistics', methods=['GET'])
@login_required
def get_statistics():
    """Kullanıcının pomodoro istatistiklerini getir"""
    try:
        # Zaman filtresi (varsayılan: bugün)
        period = request.args.get('period', 'daily')  # daily, weekly, monthly
        
        now = datetime.utcnow()
        
        if period == 'daily':
            start_date = datetime(now.year, now.month, now.day)
        elif period == 'weekly':
            # Bu haftanın başlangıcı (Pazartesi)
            days_since_monday = now.weekday()
            start_date = datetime(now.year, now.month, now.day) - timedelta(days=days_since_monday)
        elif period == 'monthly':
            start_date = datetime(now.year, now.month, 1)
        else:
            start_date = datetime(now.year, now.month, now.day)
        
        # Oturumları getir
        sessions = PomodoroSession.query.filter(
            PomodoroSession.user_id == current_user.id,
            PomodoroSession.ended_at.isnot(None),
            PomodoroSession.ended_at >= start_date
        ).all()
        
        # İstatistikleri hesapla
        total_work_minutes = sum(
            s.duration_minutes for s in sessions if s.session_type == 'work'
        )
        total_short_break_minutes = sum(
            s.duration_minutes for s in sessions if s.session_type == 'shortBreak'
        )
        total_long_break_minutes = sum(
            s.duration_minutes for s in sessions if s.session_type == 'longBreak'
        )
        
        # Tam ve yarım pomodoro sayılarını hesapla
        work_sessions = [s for s in sessions if s.session_type == 'work']
        full_pomodoros = len([s for s in work_sessions if s.duration_minutes >= 25.0])
        half_pomodoros = len([s for s in work_sessions if s.duration_minutes > 0 and s.duration_minutes < 25.0])
        total_pomodoros = len(work_sessions)
        
        # Görev bazlı istatistikler
        task_stats = {}
        for session in sessions:
            if session.session_type == 'work' and session.task_id:
                task_id = session.task_id
                if task_id not in task_stats:
                    task_stats[task_id] = {
                        'task_id': task_id,
                        'task_text': session.task.text if session.task else 'Bilinmeyen',
                        'total_minutes': 0,
                        'full_pomodoros': 0,
                        'half_pomodoros': 0,
                        'full_minutes': 0,  # Tam pomodorolardan gelen toplam dakika
                        'half_minutes': 0   # Eksik pomodorolardan gelen toplam dakika
                    }
                
                duration = session.duration_minutes
                task_stats[task_id]['total_minutes'] += duration
                
                # Tam veya eksik pomodoro kontrolü
                if duration >= 25.0:
                    task_stats[task_id]['full_pomodoros'] += 1
                    task_stats[task_id]['full_minutes'] += duration
                elif duration > 0:
                    task_stats[task_id]['half_pomodoros'] += 1
                    task_stats[task_id]['half_minutes'] += duration
        
        return jsonify({
            'success': True,
            'statistics': {
                'period': period,
                'total_work_minutes': total_work_minutes,
                'total_short_break_minutes': total_short_break_minutes,
                'total_long_break_minutes': total_long_break_minutes,
                'total_pomodoros': total_pomodoros,
                'full_pomodoros': full_pomodoros,
                'half_pomodoros': half_pomodoros,
                'task_statistics': list(task_stats.values()),
                'sessions': [s.to_dict() for s in sessions]
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'İstatistikler alınamadı'
        }), 500


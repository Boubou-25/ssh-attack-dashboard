"""
SSH Attack Dashboard - API Routes
Compatible avec le frontend JS existant (1500 lignes)
"""

from flask import Blueprint, jsonify, request
from datetime import datetime
from ..database import (
    init_db,
    get_dashboard_stats,
    get_all_attacks,
    get_top_countries,
    get_top_ips,
    get_critical_ips_for_ban,
    get_attacks_timeline,
    mark_ip_as_banned,
    get_attack_by_ip,
    get_db_size
)
from ..ssh_parser import parse_and_store_ssh_logs

api = Blueprint('api', __name__)

# Initialise BDD au démarrage
init_db()

# ============================================
# ENDPOINT PRINCIPAL (COMPATIBLE JS)
# ============================================

@api.route('/api/stats', methods=['GET'])
def get_stats():
    """
    Endpoint principal appelé par le JS frontend.
    Retourne TOUTES les données nécessaires au dashboard.
    """
    # Parse nouveaux logs SSH + stocke en BDD
    parse_and_store_ssh_logs()
    
    # Récupère stats depuis BDD
    stats = get_dashboard_stats()
    top_ips_data = get_top_ips(limit=10)
    top_countries_data = get_top_countries(limit=5)
    
    # Calcul peak attack (heure avec le plus d'attaques)
    timeline = get_attacks_timeline(hours=24)
    peak_hour = '--h'
    peak_attempts = 0
    if timeline:
        peak_data = max(timeline, key=lambda x: x['attempts'])
        peak_hour = peak_data['hour'].split(' ')[1] if ' ' in peak_data['hour'] else peak_data['hour']
        peak_attempts = peak_data['attempts']
    
    # Formate pour correspondre au format attendu par JS
    response = {
        # Stats globales
        'total_attempts': stats.get('total_attempts', 0),
        'unique_ips': stats.get('unique_ips', 0),
        'last_update': stats.get('last_update', datetime.now().strftime('%H:%M:%S')),
        
        # Top IPs (format simplifié pour JS)
        'top_ips': [
            {
                'ip': ip['ip'],
                'attempts': ip['total_attempts'],
                'country': ip.get('country_name', 'Unknown'),
                'threat_level': ip.get('threat_level', 'Modéré')
            }
            for ip in top_ips_data
        ],
        
        # Top pays
        'top_countries': [
            {
                'country': c.get('country_name', 'Unknown'),
                'country_code': c.get('country', 'XX'),
                'ip_count': c.get('ip_count', 0),
                'total_attempts': c.get('total_attempts', 0)
            }
            for c in top_countries_data
        ],
        
        # Répartition menaces (pour graphique camembert)
        'threat_distribution': {
            'critical': stats.get('critical_count', 0),
            'high': stats.get('high_count', 0),
            'moderate': stats.get('moderate_count', 0)
        },
        
        # Données pour calculs JS
        'critical_count': stats.get('critical_count', 0),
        'high_count': stats.get('high_count', 0),
        'moderate_count': stats.get('moderate_count', 0),
        'banned_count': stats.get('banned_count', 0),
        
        # Peak attack (pour widget "Pic d'attaque")
        'peak_hour': peak_hour,
        'peak_attempts': peak_attempts,
        
        # Tendance 24h (calcul simple pour l'instant)
        'trend_24h': 0  # TODO: implémenter comparaison avec hier
    }
    
    return jsonify(response)


# ============================================
# GÉOLOCALISATION (APPELÉ PAR JS)
# ============================================

@api.route('/api/geolocate/<ip>', methods=['GET'])
def geolocate_ip(ip):
    """
    Endpoint géolocalisation appelé par updateTableWithGeo()
    Format attendu par JS ligne 350 :
    {
        "success": true,
        "country": "France",
        "country_code": "FR",
        "flag": "🇫🇷",
        "city": "Paris"
    }
    """
    # Récupère IP depuis BDD (déjà géolocalisée lors du parsing)
    attack = get_attack_by_ip(ip)
    
    if attack and attack.get('country_name'):
        # Flag emoji depuis code pays
        flag = get_flag_emoji(attack.get('country', ''))
        
        return jsonify({
            'success': True,
            'country': attack['country_name'],
            'country_code': attack.get('country', 'XX'),
            'flag': flag,
            'city': attack.get('city', 'Unknown'),
            'isp': attack.get('isp', 'Unknown')
        })
    else:
        # Fallback si pas de géoloc en BDD
        return jsonify({
            'success': False,
            'country': 'Unknown',
            'country_code': 'XX',
            'flag': '🏴',
            'city': 'Unknown',
            'isp': 'Unknown'
        })

def get_flag_emoji(country_code):
    """Convertit code pays en emoji drapeau"""
    if not country_code or len(country_code) != 2:
        return '🏴'
    
    # Convertit FR → 🇫🇷
    # ASCII A-Z = 65-90, Regional Indicator Symbol = 127462-127487
    return ''.join(chr(127462 + ord(c) - 65) for c in country_code.upper())

# ============================================
# AUTO-BAN (BONUS POUR TON JS)
# ============================================

@api.route('/api/generate-ban-script', methods=['GET'])
def generate_ban_script():
    """
    Génère script bash pour bannir IPs critiques.
    Appelé par openBanModal() dans ton JS ligne 1420.
    """
    critical_ips = get_critical_ips_for_ban()
    
    if not critical_ips or len(critical_ips) == 0:
        return jsonify({
            'success': False,
            'error': 'Aucune IP critique détectée',
            'count': 0
        })
    
    # Génère script bash
    script_lines = [
        '#!/bin/bash',
        '# SSH Attack Dashboard - Auto-ban Script',
        f'# Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}',
        f'# IPs to ban: {len(critical_ips)}',
        '',
        'echo "🔥 Banning malicious IPs..."',
        ''
    ]
    
    for ip_data in critical_ips:
        ip = ip_data['ip']
        attempts = ip_data['total_attempts']
        script_lines.append(f'# {ip} - {attempts} attempts')
        script_lines.append(f'iptables -A INPUT -s {ip} -j DROP')
        script_lines.append(f'echo "✅ Banned {ip}"')
        script_lines.append('')
    
    script_lines.extend([
        'echo "💾 Saving iptables rules..."',
        'iptables-save > /etc/iptables/rules.v4',
        f'echo "✅ Done! Banned {len(critical_ips)} IPs"'
    ])
    
    script = '\n'.join(script_lines)
    
    return jsonify({
        'success': True,
        'count': len(critical_ips),
        'ips': [ip['ip'] for ip in critical_ips],
        'script': script
    })

# ============================================
# HISTORIQUE (BONUS)
# ============================================

@api.route('/api/history', methods=['GET'])
def get_attack_history():
    """Timeline 24h pour graphique Chart.js"""
    hours = request.args.get('hours', default=24, type=int)
    timeline = get_attacks_timeline(hours=hours)
    
    labels = [t['hour'] for t in timeline]
    data = [t['attempts'] for t in timeline]
    
    return jsonify({
        'success': True,
        'labels': labels,
        'data': data
    })

# ============================================
# HEALTH CHECK
# ============================================

@api.route('/api/health', methods=['GET'])
def health_check():
    """Monitoring production"""
    stats = get_dashboard_stats()
    
    return jsonify({
        'status': 'healthy',
        'database': {
            'size': get_db_size(),
            'unique_ips': stats.get('unique_ips', 0),
            'total_attacks': stats.get('total_attempts', 0)
        },
        'timestamp': datetime.now().isoformat()
    })

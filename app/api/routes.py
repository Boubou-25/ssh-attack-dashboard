from flask import Blueprint, jsonify, render_template
import json
from pathlib import Path
from datetime import datetime, timedelta
import requests


api_bp = Blueprint('api', __name__)


def get_ssh_stats():
    """
    Lit les statistiques depuis le fichier JSON généré par le parser
    Si vide ou inexistant, retourne des données mock pour démo
    """
    json_path = Path('/tmp/ssh_stats.json')
    
    # Données mock pour démo (macOS sans logs SSH réels)
    MOCK_DATA = {
        'timestamp': datetime.now().isoformat(),
        'total_attempts': 245,
        'unique_ips': 8,
        'top_ips': [
            {'ip': '192.168.1.100', 'attempts': 56},
            {'ip': '10.0.0.50', 'attempts': 48},
            {'ip': '45.142.212.61', 'attempts': 42},
            {'ip': '185.220.101.34', 'attempts': 35},
            {'ip': '123.45.67.89', 'attempts': 28},
            {'ip': '203.0.113.45', 'attempts': 15},
            {'ip': '198.51.100.22', 'attempts': 12},
            {'ip': '172.16.0.88', 'attempts': 9}
        ]
    }
    
    # Vérifie que le fichier existe
    if not json_path.exists():
        print("[INFO] JSON non trouvé, données mock utilisées")
        return MOCK_DATA
    
    try:
        # Lit le fichier JSON
        with open(json_path, 'r') as f:
            data = json.load(f)
        
        # Si aucune tentative détectée, utilise les données mock
        if data.get('total_attempts', 0) == 0:
            print("[INFO] Aucune donnée réelle, données mock utilisées")
            return MOCK_DATA
        
        # Vérifie que les données ne sont pas trop anciennes (>5 min)
        if 'timestamp' in data:
            try:
                timestamp = datetime.fromisoformat(data['timestamp'])
                age = datetime.now() - timestamp
                
                if age > timedelta(minutes=5):
                    print(f"[WARN] Données JSON anciennes ({age.seconds}s)")
            except:
                pass
        
        print(f"[INFO] {data['total_attempts']} tentatives détectées")
        return data
        
    except Exception as e:
        print(f"[ERROR] Impossible de lire le JSON: {e}")
        return MOCK_DATA


def get_flag_emoji(country_code):
    """
    Convertit un code pays (ex: FR) en emoji drapeau (ex: 🇫🇷)
    Utilise les Regional Indicator Symbols Unicode
    """
    if not country_code or len(country_code) != 2:
        return '🏴'  # Drapeau noir par défaut
    
    try:
        # Conversion en emoji Unicode
        # A = U+1F1E6, B = U+1F1E7, etc.
        return ''.join(chr(127397 + ord(c)) for c in country_code.upper())
    except:
        return '🏴'


@api_bp.route('/')
def index():
    """Page principale du dashboard"""
    return render_template('index.html')


@api_bp.route('/api/stats')
def stats():
    """
    Endpoint : statistiques globales SSH
    Retourne total tentatives, IPs uniques, top 10 IPs
    """
    data = get_ssh_stats()
    return jsonify(data)


@api_bp.route('/api/top-ips')
def top_ips():
    """
    Endpoint : top 10 IPs suspectes
    Retourne uniquement la liste des IPs
    """
    data = get_ssh_stats()
    return jsonify(data.get('top_ips', []))


@api_bp.route('/api/geolocate/<ip>')
def geolocate_ip(ip):
    """
    Endpoint : géolocalisation d'une IP
    Utilise l'API gratuite ip-api.com (150 req/min)
    
    Retourne:
        - country: Nom du pays
        - country_code: Code ISO (FR, US, etc.)
        - city: Ville
        - flag: Emoji du drapeau
    """
    try:
        # Validation basique de l'IP
        if not ip or ip == 'localhost' or ip.startswith('127.'):
            return jsonify({
                'success': False,
                'country': 'Local',
                'country_code': 'XX',
                'city': 'Localhost',
                'flag': '🏠'
            })
        
        # Appel API ip-api.com (gratuit, pas de clé)
        response = requests.get(
            f'http://ip-api.com/json/{ip}',
            params={
                'fields': 'status,country,countryCode,city,message'
            },
            timeout=3  # Timeout 3 secondes
        )
        
        if response.status_code == 200:
            data = response.json()
            
            # Succès
            if data.get('status') == 'success':
                country_code = data.get('countryCode', 'XX')
                
                return jsonify({
                    'success': True,
                    'country': data.get('country', 'Unknown'),
                    'country_code': country_code,
                    'city': data.get('city', 'Unknown'),
                    'flag': get_flag_emoji(country_code)
                })
            
            # Échec API (IP privée, invalide, etc.)
            else:
                error_msg = data.get('message', 'Unknown error')
                print(f"Erreur API pour {ip}: {error_msg}")
                
                return jsonify({
                    'success': False,
                    'country': 'Unknown',
                    'country_code': 'XX',
                    'city': 'Unknown',
                    'flag': '🏴',
                    'error': error_msg
                })
        
        # Erreur HTTP
        else:
            print(f"HTTP {response.status_code} pour {ip}")
            return jsonify({
                'success': False,
                'country': 'Unknown',
                'country_code': 'XX',
                'city': 'Unknown',
                'flag': '🏴'
            })
    
    except requests.Timeout:
        print(f"Timeout géolocalisation pour {ip}")
        return jsonify({
            'success': False,
            'country': 'Timeout',
            'country_code': 'XX',
            'city': 'Unknown',
            'flag': '⏱️'
        })
    
    except Exception as e:
        print(f"Erreur géolocalisation {ip}: {str(e)}")
        return jsonify({
            'success': False,
            'country': 'Error',
            'country_code': 'XX',
            'city': 'Unknown',
            'flag': '❌',
            'error': str(e)
        })


@api_bp.route('/api/generate-ban-script')
def generate_ban_script():
    """
    Génère un script bash pour bannir les IPs critiques (≥50 tentatives)
    Retourne le script avec les commandes iptables
    """
    try:
        data = get_ssh_stats()
        
        if not data or not data.get('top_ips'):
            return jsonify({
                'success': False,
                'error': 'Aucune donnée disponible'
            }), 400
        
        # Filtre les IPs critiques (≥50 tentatives)
        critical_ips = [
            item['ip'] for item in data['top_ips'] 
            if item.get('attempts', 0) >= 50
        ]
        
        if not critical_ips:
            return jsonify({
                'success': False,
                'error': 'Aucune IP critique à bannir'
            }), 400
        
        # Génère le script bash
        script_lines = [
            "#!/bin/bash",
            "# Script d'auto-bannissement généré par SSH Attack Dashboard",
            f"# Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            f"# Nombre d'IPs: {len(critical_ips)}",
            "",
            "echo 'Bannissement des IPs critiques...'",
            ""
        ]
        
        for ip in critical_ips:
            script_lines.append(f"# Bannir {ip}")
            script_lines.append(f"iptables -A INPUT -s {ip} -j DROP")
            script_lines.append(f"echo '✓ {ip} bannie'")
            script_lines.append("")
        
        script_lines.extend([
            "# Sauvegarde des règles iptables",
            "iptables-save > /etc/iptables/rules.v4",
            "",
            "echo 'Bannissement terminé !'",
            f"echo '{len(critical_ips)} IP(s) bloquée(s)'"
        ])
        
        script_content = "\n".join(script_lines)
        
        return jsonify({
            'success': True,
            'script': script_content,
            'ips': critical_ips,
            'count': len(critical_ips)
        })
        
    except Exception as e:
        print(f"[ERROR] Génération script ban: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@api_bp.route('/api/health')
def health():
    """
    Endpoint : health check
    Vérifie que l'API est opérationnelle
    """
    return jsonify({
        'status': 'ok',
        'service': 'SSH Attack Dashboard',
        'version': '1.0.0'
    })

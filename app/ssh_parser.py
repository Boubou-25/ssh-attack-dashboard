"""
SSH Attack Dashboard - Log Parser
Parse journalctl (Linux) ou génère mock data (macOS)
"""

import subprocess
import re
import platform
from collections import defaultdict
from typing import List, Dict
from .database import bulk_upsert_attacks

# ============================================
# PARSING LOGS SSH
# ============================================

def parse_and_store_ssh_logs() -> Dict:
    """
    Parse logs SSH + stocke en BDD en un seul appel.
    
    Returns:
        Stats de parsing : {parsed_ips, stored_ips, source}
    """
    # Détection OS
    if platform.system() == "Darwin":  # macOS
        return generate_and_store_mock_data()
    
    try:
        # Parse journalctl (Linux uniquement)
        ip_data = _parse_journalctl()
        
        # Enrichit avec géolocalisation (optionnel)
        enriched_data = []
        for ip, attempts in ip_data.items():
            # Pour l'instant, on skip la géoloc (API rate limit)
            # Tu peux décommenter après si besoin
            # geo = get_ip_geolocation(ip)
            enriched_data.append({
                'ip': ip,
                'attempts': attempts,
                # 'country': geo.get('countryCode'),
                # 'country_name': geo.get('country'),
                # 'city': geo.get('city'),
                # 'isp': geo.get('isp')
            })
        
        # Bulk upsert en BDD
        count = bulk_upsert_attacks(enriched_data)
        
        print(f"✅ Parsed {len(ip_data)} IPs, stored {count} in database")
        
        return {
            'parsed_ips': len(ip_data),
            'stored_ips': count,
            'source': 'journalctl'
        }
        
    except Exception as e:
        print(f"❌ Error parsing logs: {e}")
        return {'error': str(e), 'source': 'error'}

def _parse_journalctl() -> Dict[str, int]:
    """
    Parse journalctl pour extraire failed SSH attempts.
    
    Returns:
        {ip: attempts_count}
    """
    # Commande journalctl (24h de logs)
    result = subprocess.run(
        [
            'journalctl',
            '-u', 'ssh',
            '-u', 'sshd',
            '--since', '24 hours ago',
            '--no-pager'
        ],
        capture_output=True,
        text=True,
        timeout=10
    )
    
    # Regex pour Failed password
    # Exemple log : "Failed password for root from 192.168.1.100 port 52134 ssh2"
    pattern = r'Failed password for .* from (\d+\.\d+\.\d+\.\d+)'
    
    # Compte attempts par IP
    ip_counts = defaultdict(int)
    for line in result.stdout.splitlines():
        match = re.search(pattern, line)
        if match:
            ip = match.group(1)
            ip_counts[ip] += 1
    
    return dict(ip_counts)

# ============================================
# GÉOLOCALISATION (OPTIONNEL)
# ============================================

def get_ip_geolocation(ip: str) -> Dict:
    """
    Géolocalise IP via API ip-api.com (45 req/min gratuit).
    
    ⚠️ Désactivé par défaut pour éviter rate limit en dev.
    Active uniquement en production avec cache Redis.
    
    Returns:
        {country, countryCode, city, isp, lat, lon}
    """
    try:
        import requests
        
        response = requests.get(
            f'http://ip-api.com/json/{ip}',
            timeout=3
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'success':
                return {
                    'country': data.get('country'),
                    'countryCode': data.get('countryCode'),
                    'city': data.get('city'),
                    'isp': data.get('isp'),
                    'lat': data.get('lat'),
                    'lon': data.get('lon')
                }
        
        return {}
        
    except Exception as e:
        print(f"⚠️  Geolocation failed for {ip}: {e}")
        return {}

# ============================================
# MOCK DATA (DÉVELOPPEMENT MACOS)
# ============================================

def generate_and_store_mock_data() -> Dict:
    """
    Génère mock data réaliste MAIS ne les réinsère pas si déjà présents.
    """
    from .database import get_attack_by_ip, upsert_attack
    
    mock_attacks = [
        {
            'ip': '192.168.1.100',
            'attempts': 5,  # ← RÉDUIT à 5 au lieu de 89
            'country': 'FR',
            'country_name': 'France',
            'city': 'Paris',
            'isp': 'OVH SAS'
        },
        {
            'ip': '203.0.113.45',
            'attempts': 5,
            'country': 'CN',
            'country_name': 'China',
            'city': 'Beijing',
            'isp': 'China Telecom'
        },
        {
            'ip': '198.51.100.78',
            'attempts': 5,
            'country': 'RU',
            'country_name': 'Russia',
            'city': 'Moscow',
            'isp': 'Rostelecom'
        },
        {
            'ip': '185.220.101.42',
            'attempts': 5,
            'country': 'NL',
            'country_name': 'Netherlands',
            'city': 'Amsterdam',
            'isp': 'M247 Europe'
        },
        {
            'ip': '45.142.214.89',
            'attempts': 5,
            'country': 'US',
            'country_name': 'United States',
            'city': 'Los Angeles',
            'isp': 'DigitalOcean'
        }
    ]
    
    # Vérifie si déjà en BDD (évite incrémentation infinie)
    count = 0
    for attack in mock_attacks:
        existing = get_attack_by_ip(attack['ip'])
        if not existing:
            # Insère seulement si nouveau
            upsert_attack(
                ip=attack['ip'],
                attempts=attack['attempts'],
                country=attack.get('country'),
                country_name=attack.get('country_name'),
                city=attack.get('city'),
                isp=attack.get('isp')
            )
            count += 1
    
    print(f"✅ Mock data: {count} nouvelles IPs ajoutées (5 total en BDD)")
    
    return {
        'parsed_ips': len(mock_attacks),
        'stored_ips': count,
        'source': 'mock_data'
    }


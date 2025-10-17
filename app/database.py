"""
SSH Attack Dashboard - Database Layer
Gère toutes les interactions SQLite avec pattern UPSERT
"""

import sqlite3
from datetime import datetime, timedelta
import os
from typing import List, Dict, Optional

# Chemin BDD (dans app/)
DATABASE_PATH = os.path.join(os.path.dirname(__file__), 'ssh_attacks.db')

# ============================================
# CONNEXION & INITIALISATION
# ============================================

def get_db_connection():
    """
    Crée connexion SQLite avec row_factory pour accès dict-like.
    
    row_factory = permet d'accéder aux colonnes par nom :
    row['ip'] au lieu de row[0]
    """
    conn = sqlite3.connect(DATABASE_PATH, timeout=10.0)
    conn.row_factory = sqlite3.Row
    
    # Optimisations SQLite pour performance
    conn.execute('PRAGMA journal_mode=WAL')      # Write-Ahead Logging
    conn.execute('PRAGMA synchronous=NORMAL')    # Balance perf/sécurité
    conn.execute('PRAGMA cache_size=-64000')     # 64MB cache
    conn.execute('PRAGMA temp_store=MEMORY')     # Tables temp en RAM
    
    return conn

def init_db(force_reset: bool = False):
    """
    Initialise BDD avec schema.sql.
    
    Args:
        force_reset: Si True, supprime BDD existante (DEV ONLY!)
    """
    schema_path = os.path.join(os.path.dirname(__file__), 'schema.sql')
    
    if force_reset and os.path.exists(DATABASE_PATH):
        os.remove(DATABASE_PATH)
        print(f"⚠️  Database reset: {DATABASE_PATH}")
    
    if not os.path.exists(DATABASE_PATH):
        print(f"🔧 Initializing database at {DATABASE_PATH}...")
        
        with open(schema_path, 'r') as f:
            schema_sql = f.read()
        
        conn = get_db_connection()
        conn.executescript(schema_sql)
        conn.commit()
        conn.close()
        
        print(f"✅ Database initialized successfully")
    else:
        print(f"ℹ️  Database already exists: {DATABASE_PATH}")

# ============================================
# CRUD - ATTACKS
# ============================================

def upsert_attack(
    ip: str,
    attempts: int = 1,
    country: Optional[str] = None,
    country_name: Optional[str] = None,
    city: Optional[str] = None,
    isp: Optional[str] = None
) -> Dict:
    """UPSERT : Insert nouvelle IP OU incrémente attempts si existante."""
    
    conn = get_db_connection()
    
    try:
        # Vérifie si IP existe déjà
        existing = conn.execute('SELECT total_attempts FROM attacks WHERE ip = ?', (ip,)).fetchone()
        
        if existing:
            # IP existe → calcul threat_level sur TOTAL (existant + nouveau)
            new_total = existing['total_attempts'] + attempts
            threat_level = _calculate_threat_level(new_total)
        else:
            # Nouvelle IP → calcul sur attempts fournis
            threat_level = _calculate_threat_level(attempts)
        
        # UPSERT
        cursor = conn.execute('''
            INSERT INTO attacks (
                ip, total_attempts, country, country_name, city, isp, threat_level
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            
            ON CONFLICT(ip) DO UPDATE SET
                total_attempts = total_attempts + excluded.total_attempts,
                last_seen = CURRENT_TIMESTAMP,
                threat_level = excluded.threat_level,
                country = COALESCE(excluded.country, country),
                country_name = COALESCE(excluded.country_name, country_name),
                city = COALESCE(excluded.city, city),
                isp = COALESCE(excluded.isp, isp)
        ''', (ip, attempts, country, country_name, city, isp, threat_level))
        
        conn.commit()
        
        # Récupère row mise à jour
        result = conn.execute('SELECT * FROM attacks WHERE ip = ?', (ip,)).fetchone()
        return dict(result) if result else {}
        
    except sqlite3.Error as e:
        print(f"❌ Database error upserting {ip}: {e}")
        conn.rollback()
        return {}
    finally:
        conn.close()

def bulk_upsert_attacks(attacks: List[Dict]) -> int:
    """
    UPSERT en batch pour performance (évite N connexions).
    
    Args:
        attacks: Liste de dicts avec clés ip, attempts, country...
    
    Returns:
        Nombre d'IPs traitées
    """
    if not attacks:
        return 0
    
    conn = get_db_connection()
    count = 0
    
    try:
        for attack in attacks:
            threat_level = _calculate_threat_level(attack.get('attempts', 1))
            
            conn.execute('''
                INSERT INTO attacks (
                    ip, total_attempts, country, country_name, city, isp, threat_level
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                
                ON CONFLICT(ip) DO UPDATE SET
                    total_attempts = total_attempts + excluded.total_attempts,
                    last_seen = CURRENT_TIMESTAMP,
                    threat_level = excluded.threat_level,
                    country = COALESCE(excluded.country, country),
                    country_name = COALESCE(excluded.country_name, country_name),
                    city = COALESCE(excluded.city, city),
                    isp = COALESCE(excluded.isp, isp)
            ''', (
                attack['ip'],
                attack.get('attempts', 1),
                attack.get('country'),
                attack.get('country_name'),
                attack.get('city'),
                attack.get('isp'),
                threat_level
            ))
            count += 1
        
        conn.commit()
        print(f"✅ Bulk upserted {count} attacks")
        
    except sqlite3.Error as e:
        print(f"❌ Bulk upsert error: {e}")
        conn.rollback()
        count = 0
    finally:
        conn.close()
    
    return count

def get_all_attacks(
    limit: int = 100,
    offset: int = 0,
    threat_filter: Optional[str] = None,
    country_filter: Optional[str] = None
) -> List[Dict]:
    """
    Récupère attaques avec pagination et filtres.
    
    Args:
        limit: Nombre max de résultats
        offset: Offset pour pagination
        threat_filter: Filtre par 'Critique', 'Élevé', 'Modéré'
        country_filter: Filtre par code pays (FR, CN...)
    """
    conn = get_db_connection()
    
    query = 'SELECT * FROM attacks WHERE 1=1'
    params = []
    
    if threat_filter:
        query += ' AND threat_level = ?'
        params.append(threat_filter)
    
    if country_filter:
        query += ' AND country = ?'
        params.append(country_filter)
    
    query += ' ORDER BY last_seen DESC LIMIT ? OFFSET ?'
    params.extend([limit, offset])
    
    attacks = conn.execute(query, params).fetchall()
    conn.close()
    
    return [dict(attack) for attack in attacks]

def get_attack_by_ip(ip: str) -> Optional[Dict]:
    """Récupère une IP spécifique."""
    conn = get_db_connection()
    attack = conn.execute('SELECT * FROM attacks WHERE ip = ?', (ip,)).fetchone()
    conn.close()
    
    return dict(attack) if attack else None

# ============================================
# STATISTIQUES DASHBOARD
# ============================================

def get_dashboard_stats() -> Dict:
    """
    Stats globales via vue optimisée.
    
    Returns:
        {unique_ips, total_attempts, critical_count, high_count...}
    """
    conn = get_db_connection()
    stats = conn.execute('SELECT * FROM v_dashboard_stats').fetchone()
    conn.close()
    
    return dict(stats) if stats else {}

def get_top_countries(limit: int = 5) -> List[Dict]:
    """Top pays par nombre total d'attaques."""
    conn = get_db_connection()
    
    countries = conn.execute('''
        SELECT 
            country,
            country_name,
            COUNT(*) as ip_count,
            SUM(total_attempts) as total_attempts
        FROM attacks 
        WHERE country_name IS NOT NULL
        GROUP BY country, country_name
        ORDER BY total_attempts DESC 
        LIMIT ?
    ''', (limit,)).fetchall()
    
    conn.close()
    return [dict(c) for c in countries]

def get_top_ips(limit: int = 10, critical_only: bool = False) -> List[Dict]:
    """
    Top IPs par nombre de tentatives.
    
    Args:
        critical_only: Si True, filtre seulement Critique
    """
    conn = get_db_connection()
    
    query = '''
        SELECT * FROM attacks
        WHERE 1=1
    '''
    
    if critical_only:
        query += " AND threat_level = 'Critique'"
    
    query += ' ORDER BY total_attempts DESC LIMIT ?'
    
    ips = conn.execute(query, (limit,)).fetchall()
    conn.close()
    
    return [dict(ip) for ip in ips]

def get_critical_ips_for_ban() -> List[Dict]:
    """
    Récupère IPs critiques non bannies (pour auto-ban).
    
    Utilise index composite idx_attacks_critical pour perf.
    """
    conn = get_db_connection()
    
    ips = conn.execute('''
        SELECT ip, total_attempts, country_name
        FROM attacks 
        WHERE threat_level = 'Critique' 
          AND is_banned = 0
        ORDER BY total_attempts DESC
    ''').fetchall()
    
    conn.close()
    return [dict(ip) for ip in ips]

def mark_ip_as_banned(ip: str):
    """Marque IP comme bannie (évite de proposer 2x)."""
    conn = get_db_connection()
    
    conn.execute('''
        UPDATE attacks 
        SET is_banned = 1, ban_date = CURRENT_TIMESTAMP
        WHERE ip = ?
    ''', (ip,))
    
    conn.commit()
    conn.close()

# ============================================
# HISTORIQUE TEMPOREL
# ============================================

def get_attacks_timeline(hours: int = 24) -> List[Dict]:
    """
    Attaques des X dernières heures pour graphique Chart.js.
    
    Groupe par heure pour éviter trop de points sur graphique.
    """
    conn = get_db_connection()
    
    # SQLite : datetime('now', '-24 hours')
    attacks = conn.execute('''
        SELECT 
            strftime('%Y-%m-%d %H:00', last_seen) as hour,
            COUNT(*) as ip_count,
            SUM(total_attempts) as attempts
        FROM attacks 
        WHERE last_seen >= datetime('now', '-' || ? || ' hours')
        GROUP BY hour
        ORDER BY hour ASC
    ''', (hours,)).fetchall()
    
    conn.close()
    return [dict(a) for a in attacks]

def save_history_snapshot():
    """
    Sauvegarde snapshot actuel pour historique long-terme.
    À appeler via cron/scheduler toutes les heures.
    """
    stats = get_dashboard_stats()
    top_country = get_top_countries(limit=1)
    
    conn = get_db_connection()
    
    conn.execute('''
        INSERT INTO attack_history (
            total_attacks, unique_ips, critical_count, top_country
        ) VALUES (?, ?, ?, ?)
    ''', (
        stats.get('total_attempts', 0),
        stats.get('unique_ips', 0),
        stats.get('critical_count', 0),
        top_country[0]['country_name'] if top_country else None
    ))
    
    conn.commit()
    conn.close()

# ============================================
# UTILS INTERNES
# ============================================

def _calculate_threat_level(attempts: int) -> str:
    """
    Calcule threat_level selon seuil.
    
    Modifie ces valeurs selon ton contexte :
    - Critique: ≥50 tentatives (bannissement immédiat)
    - Élevé: 20-49 tentatives (surveillance)
    - Modéré: <20 tentatives (normal)
    """
    if attempts >= 50:
        return 'Critique'
    elif attempts >= 20:
        return 'Élevé'
    else:
        return 'Modéré'

def get_db_size() -> str:
    """Retourne taille BDD en MB (pour monitoring)."""
    if os.path.exists(DATABASE_PATH):
        size_bytes = os.path.getsize(DATABASE_PATH)
        size_mb = size_bytes / (1024 * 1024)
        return f"{size_mb:.2f} MB"
    return "0 MB"

def vacuum_database():
    """
    Compacte BDD pour récupérer espace (exécuter manuellement).
    VACUUM recrée entièrement la BDD → peut prendre du temps.
    """
    conn = get_db_connection()
    conn.execute('VACUUM')
    conn.close()
    print("✅ Database vacuumed")

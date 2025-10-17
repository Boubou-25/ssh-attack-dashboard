-- ============================================
-- SSH Attack Dashboard - Database Schema
-- ============================================

-- Supprime tables existantes (dev only)
DROP TABLE IF EXISTS attacks;
DROP TABLE IF EXISTS attack_history;

-- ============================================
-- Table principale : attacks
-- ============================================
CREATE TABLE attacks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Identification IP (UNIQUE = pas de doublons)
    ip TEXT NOT NULL UNIQUE,
    
    -- Compteurs
    total_attempts INTEGER DEFAULT 1,
    
    -- Timestamps
    first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Géolocalisation (peut être NULL si API fail)
    country TEXT,                         -- Code ISO (FR, CN, RU...)
    country_name TEXT,                    -- Nom complet
    city TEXT,
    isp TEXT,
    
    -- Classification menace (calculé automatiquement)
    threat_level TEXT DEFAULT 'Modéré',   -- Critique/Élevé/Modéré
    
    -- Métadata
    is_banned BOOLEAN DEFAULT 0,          -- Marqueur si IP a été ban
    ban_date TIMESTAMP,
    
    -- Contraintes
    CHECK (threat_level IN ('Critique', 'Élevé', 'Modéré')),
    CHECK (total_attempts >= 1)
);

-- ============================================
-- Index pour performance
-- ============================================

-- Index sur IP pour recherches rapides
CREATE INDEX idx_attacks_ip ON attacks(ip);

-- Index sur last_seen pour trier par date DESC
CREATE INDEX idx_attacks_last_seen ON attacks(last_seen DESC);

-- Index sur threat_level pour filtres dashboard
CREATE INDEX idx_attacks_threat ON attacks(threat_level);

-- Index composite pour requêtes "top IPs critiques"
CREATE INDEX idx_attacks_critical ON attacks(threat_level, total_attempts DESC) 
    WHERE threat_level = 'Critique';

-- ============================================
-- Table historique : attack_history (bonus)
-- ============================================
-- Stocke snapshots horaires pour graphique temporel

CREATE TABLE attack_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_attacks INTEGER,
    unique_ips INTEGER,
    critical_count INTEGER,
    top_country TEXT
);

-- Index pour requêtes temporelles
CREATE INDEX idx_history_timestamp ON attack_history(timestamp DESC);

-- ============================================
-- Vue pour dashboard (performance)
-- ============================================

CREATE VIEW v_dashboard_stats AS
SELECT 
    COUNT(DISTINCT ip) as unique_ips,
    SUM(total_attempts) as total_attempts,
    MAX(last_seen) as last_update,
    COUNT(CASE WHEN threat_level = 'Critique' THEN 1 END) as critical_count,
    COUNT(CASE WHEN threat_level = 'Élevé' THEN 1 END) as high_count,
    COUNT(CASE WHEN threat_level = 'Modéré' THEN 1 END) as moderate_count,
    COUNT(CASE WHEN is_banned = 1 THEN 1 END) as banned_count
FROM attacks;

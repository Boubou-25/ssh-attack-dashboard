# 🛡️ SSH Attack Dashboard

Dashboard de visualisation et analyse d'attaques SSH en temps réel avec géolocalisation, notifications intelligentes et auto-bannissement.

## ✨ Fonctionnalités

### Dashboard temps réel

- Statistiques dynamiques (tentatives, IPs uniques, dernière mise à jour)
- Sparklines animées pour visualiser les tendances
- Auto-refresh toutes les 10 secondes
- Mode dark/light avec persistance localStorage

### Géolocalisation avancée

- API ip-api.com pour localiser les IPs malveillantes
- Drapeaux emoji par pays
- Top 5 pays les plus actifs avec graphiques
- Timeline avec localisation complète

### Notifications intelligentes

- Toast animations (slide-in depuis la droite)
- Badge compteur dans la navbar
- Dropdown historique des 10 dernières alertes
- Alertes sonores activables/désactivables
- Détection automatique des nouvelles IPs critiques (≥50 tentatives)

### Statistiques avancées

- Score de sécurité 0-100 avec jauge circulaire animée
- Graphique camembert (répartition Critique/Élevé/Modéré)
- Pic d'attaque avec heure de pointe
- Tendance comparative (↑/↓ vs hier)

### Auto-bannissement

- Bouton avec badge compteur d'IPs critiques
- Modal de preview avec liste des IPs à bannir
- Génération de script bash iptables téléchargeable
- Sécurité : validation par checkbox avant téléchargement

### Recherche et filtres

- Recherche par IP en temps réel
- Filtres par pays
- Filtres par niveau de menace (Critique/Élevé/Modéré)
- Compteur de résultats dynamique

### Exports

- Export JSON complet
- Export CSV pour analyse Excel
- Export logs formatés

## 🚀 Installation

git clone https://github.com/TON-USERNAME/ssh-attack-dashboard.git
cd ssh-attack-dashboard
pip install -r requirements.txt
python run.py

Accède au dashboard sur http://127.0.0.1:5000

## 🛠️ Stack technique

Backend : Flask (Python 3.8+)
Frontend : Vanilla JavaScript, Bootstrap 5, Chart.js
API externe : ip-api.com (géolocalisation gratuite)
Design : CSS custom inspiré Linear/Notion
Graphiques : Chart.js pour visualisations interactives

## 📦 Structure du projet

ssh-attack-dashboard/
├── app/
│ ├── api/
│ │ ├── **init**.py
│ │ └── routes.py # Endpoints API Flask
│ ├── static/
│ │ ├── css/
│ │ │ └── style.css # Design moderne personnalisé
│ │ └── js/
│ │ └── app.js # Logique frontend complète
│ ├── templates/
│ │ └── index.html # Dashboard principal
│ ├── **init**.py
│ └── ssh_parser.py # Parser logs SSH auth.log
├── .gitignore
├── README.md
├── requirements.txt # Dépendances Python
└── run.py # Point d'entrée application

## 🎯 Utilisation

1. Configuration des logs SSH
   Par défaut, le parser lit /var/log/auth.log (Linux). Configure le chemin dans ssh_parser.py si nécessaire.

2. Lancement du dashboard
   python run.py

3. Analyse en temps réel
   Le dashboard affiche automatiquement les attaques SSH détectées avec géolocalisation et statistiques.

4. Notifications
   Active les notifications sonores via le bouton 🔊 dans la navbar. Les toasts s'affichent automatiquement pour les nouvelles IPs critiques.

5. Auto-bannissement
   Clique sur le bouton "Auto-ban" rouge, vérifie la liste des IPs, coche la confirmation et télécharge le script bash. Exécute ensuite sur ton serveur avec sudo bash script-name.sh

## 🔧 Configuration avancée

Modifier le seuil d'alerte critique
Dans app.js, change la valeur 50 dans la fonction checkForNewThreats() pour ajuster le seuil de tentatives avant alerte.

Changer l'intervalle de refresh
Modifie la valeur 10000 (10s) dans setInterval(loadData, 10000) dans app.js.

API de géolocalisation alternative
Si ip-api.com est limité (45 requêtes/minute), remplace par ipapi.co dans routes.py fonction get_ip_info().

## 📝 Fonctionnalités techniques détaillées

Parser SSH
Regex avancé pour extraire IPs, ports, utilisateurs des logs auth.log
Gestion des Failed password et Invalid user
Comptage des tentatives par IP avec agrégation

Système de cache
Cache des géolocalisations pour réduire les appels API
LocalStorage pour persistance des notifications et préférences
Cache des IPs connues pour éviter les alertes en double

Sécurité
Script de bannissement généré côté serveur (pas d'exécution automatique)
Validation obligatoire par l'utilisateur avant téléchargement
Logs horodatés pour traçabilité

Performance
Chargement asynchrone des données via Fetch API
Animations CSS optimisées (GPU acceleration)
Throttling des mises à jour Chart.js

## 🎨 Personnalisation du design

Le dashboard utilise des variables CSS pour faciliter la personnalisation. Modifie style.css :

:root {
--bg-primary: #ffffff;
--accent-primary: #2563eb;
--danger: #dc2626;
/_ ... autres variables _/
}

[data-theme="dark"] {
--bg-primary: #0a0a0a;
/_ ... _/
}

## 🐛 Troubleshooting

Aucune donnée affichée
Vérifie que auth.log existe et contient des tentatives SSH récentes
Vérifie les permissions de lecture du fichier de logs
Regarde la console Flask pour les erreurs de parsing

API géolocalisation bloquée
ip-api.com limite à 45 requêtes/minute en gratuit
Attends 1 minute ou configure une clé API payante
Alternative : utilise ipapi.co ou ipinfo.io

Notifications ne s'affichent pas
Vide le cache navigateur (Cmd+Shift+R)
Vérifie la console JavaScript pour erreurs
Vérifie que le CSS est bien chargé

Mode dark ne fonctionne pas
Vérifie que localStorage est activé dans ton navigateur
Force le thème avec toggleTheme() dans la console

## 📊 Exemples de données

Le dashboard inclut des données de démonstration (MOCK_DATA) si auth.log est vide. Voici un exemple de sortie JSON :

{
"total_attempts": 245,
"unique_ips": 8,
"last_update": "2025-10-17 00:15:32",
"top_ips": [
{
"ip": "192.168.1.100",
"attempts": 89,
"country": "France",
"country_code": "FR",
"city": "Paris",
"isp": "OVH SAS"
}
]
}

## 🚀 Améliorations futures possibles

Intégration Fail2Ban pour bannissement automatique
Webhooks Discord/Slack pour alertes temps réel
Historique des attaques sur 30 jours avec graphiques temporels
Export PDF avec rapport complet
Intégration VirusTotal pour réputation des IPs
Dashboard multi-serveurs avec agrégation
Authentification pour sécuriser l'accès au dashboard
Mode cluster pour analyse de plusieurs serveurs simultanément

## 📄 Licence

MIT License - Libre d'utilisation pour projets personnels et commerciaux

## 👤 Auteur

Développé dans le cadre d'un projet portfolio cybersécurité pour démontrer compétences en Python, Flask, JavaScript, API REST, et visualisation de données.

## 🙏 Remerciements

ip-api.com pour l'API de géolocalisation gratuite
Chart.js pour les graphiques interactifs
Bootstrap 5 pour le framework CSS
Font Awesome pour les icônes

## 📞 Contact

📧 benjaminbouhier@proton.me  
🔗 [Portfolio GitHub](https://github.com/Boubou-25/cybersecurity-portfolio)  
🏆 [Root-Me Profile](https://www.root-me.org/Boubouu)

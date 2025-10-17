// ============================================
// SSH ATTACK DASHBOARD - JavaScript Complet
// Toutes fonctionnalités : géoloc, filtres, exports
// ============================================

// Configuration globale
const API_BASE = '/api';
const REFRESH_INTERVAL = 10000; // 10 secondes
let attackChart = null;
let timelineChart = null;

// Données de test (pour développement local)
const MOCK_DATA = {
    total_attempts: 245,
    unique_ips: 8,
    top_ips: [
        { ip: '192.168.1.100', attempts: 56 },
        { ip: '10.0.0.50', attempts: 48 },
        { ip: '45.142.212.61', attempts: 42 },
        { ip: '185.220.101.34', attempts: 35 },
        { ip: '123.45.67.89', attempts: 28 },
        { ip: '203.0.113.45', attempts: 15 },
        { ip: '198.51.100.22', attempts: 12 },
        { ip: '172.16.0.88', attempts: 9 }
    ]
};

// ============================================
// INITIALISATION AU CHARGEMENT
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // Charge le thème sauvegardé
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const iconElement = document.getElementById('theme-icon');
    if (iconElement) {
        iconElement.className = savedTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    }
    
    console.log('Dashboard initialized');
    initChart();
    initTimelineChart();
    initFilters();
    loadData();
    
    // Rafraîchissement auto
    setInterval(loadData, REFRESH_INTERVAL);
});

// ============================================
// CHARGEMENT DES DONNÉES
// ============================================
async function loadData() {
    try {
        const response = await fetch(`${API_BASE}/stats`);
        const data = await response.json();
        
        // Si pas de données réelles, utilise mock
        const finalData = (data.total_attempts === 0) ? MOCK_DATA : data;
        
        updateStats(finalData);
        updateChart(finalData.top_ips);
        await updateTableWithGeo(finalData.top_ips);
        updateTimeline(finalData.top_ips);
        updateTimelineChart(finalData.top_ips);
        updateLastUpdate();
        async function loadData() {
    try {
        const response = await fetch(`${API_BASE}/stats`);
        const data = await response.json();
        
        const finalData = (data.total_attempts === 0) ? MOCK_DATA : data;
        
        checkForNewThreats(finalData.top_ips);
        
        updateStats(finalData);
        updateChart(finalData.top_ips);
        await updateTableWithGeo(finalData.top_ips);
        updateTimeline(finalData.top_ips);
        updateTimelineChart(finalData.top_ips);
        updateLastUpdate();
        
        // NOUVELLE LIGNE : Stats avancées
        updateAdvancedStats(finalData);
        
    } catch (error) {
        console.error('Erreur chargement données:', error);
        // Fallback...
    }
}

        
    } catch (error) {
        console.error('Erreur chargement données:', error);
        // Fallback sur données mock en cas d'erreur
        updateStats(MOCK_DATA);
        updateChart(MOCK_DATA.top_ips);
        await updateTableWithGeo(MOCK_DATA.top_ips);
        updateTimeline(MOCK_DATA.top_ips);
        updateTimelineChart(MOCK_DATA.top_ips);
    }
}

// ============================================
// STATISTIQUES - Cartes animées
// ============================================
function updateStats(data) {
    // Animation compteur pour "Total Tentatives"
    const attemptsElement = document.getElementById('total-attempts');
    const currentAttempts = parseInt(attemptsElement.textContent) || 0;
    if (currentAttempts !== data.total_attempts) {
        const countUpAttempts = new countUp.CountUp('total-attempts', data.total_attempts, {
            startVal: currentAttempts,
            duration: 1.5,
            separator: ' ',
            useEasing: true
        });
        if (!countUpAttempts.error) {
            countUpAttempts.start();
        }
    }
    
    // Animation compteur pour "IPs Uniques"
    const ipsElement = document.getElementById('unique-ips');
    const currentIps = parseInt(ipsElement.textContent) || 0;
    if (currentIps !== data.unique_ips) {
        const countUpIps = new countUp.CountUp('unique-ips', data.unique_ips, {
            startVal: currentIps,
            duration: 1.5,
            useEasing: true
        });
        if (!countUpIps.error) {
            countUpIps.start();
        }
    }
}

function updateLastUpdate() {
    const now = new Date();
    const time = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('last-update').textContent = time;
}

// ============================================
// STATISTIQUES AVANCÉES (4 fenêtres)
// ============================================
function updateAdvancedStats(data) {
    console.log('🔄 Mise à jour stats avancées...', data);
    
    // 1. Score de sécurité
    updateSecurityScore(data);
    
    // 2. Répartition (Chart.js camembert)
    updateThreatDistribution(data);
    
    // 3. Pic d'attaque
    updatePeakAttack(data);
    
    // 4. Tendance 24h
    updateTrend(data);
}

function updateSecurityScore(data) {
    const total = data.unique_ips || 0;
    const critical = data.critical_count || 0;
    
    // Calcul score : 100 - (% d'IPs critiques)
    let score = 100;
    if (total > 0) {
        score = Math.max(0, Math.round(100 - (critical / total * 100)));
    }
    
    console.log('📊 Score sécurité:', score);
    
    // Update texte
    const scoreEl = document.getElementById('security-score');
    if (scoreEl) {
        scoreEl.textContent = score;
    }
    
    // Update label
    const labelEl = document.getElementById('score-label');
    if (labelEl) {
        if (score >= 80) {
            labelEl.textContent = '✓ Sécurité optimale';
            labelEl.style.color = '#22c55e';
        } else if (score >= 50) {
            labelEl.textContent = '⚠ Sécurité moyenne';
            labelEl.style.color = '#f59e0b';
        } else {
            labelEl.textContent = '✗ Sécurité critique';
            labelEl.style.color = '#ef4444';
        }
    }
    
    // Update cercle SVG
    const circleEl = document.getElementById('score-circle');
    if (circleEl) {
        const circumference = 408.4; // 2 * PI * 65
        const offset = circumference - (score / 100) * circumference;
        circleEl.style.strokeDashoffset = offset;
        
        // Couleur selon score
        if (score >= 80) {
            circleEl.style.stroke = '#22c55e';
        } else if (score >= 50) {
            circleEl.style.stroke = '#f59e0b';
        } else {
            circleEl.style.stroke = '#ef4444';
        }
    }
}

function updateThreatDistribution(data) {
    const dist = data.threat_distribution || { critical: 0, high: 0, moderate: 0 };
    
    console.log('📊 Répartition:', dist);
    
    // Update badges cachés (pour compatibilité)
    const criticalEl = document.getElementById('threat-critical');
    const highEl = document.getElementById('threat-high');
    const moderateEl = document.getElementById('threat-moderate');
    
    if (criticalEl) criticalEl.textContent = dist.critical;
    if (highEl) highEl.textContent = dist.high;
    if (moderateEl) moderateEl.textContent = dist.moderate;
    
    // Update Chart.js camembert
    const canvas = document.getElementById('levelChart');
    if (canvas && typeof Chart !== 'undefined') {
        const ctx = canvas.getContext('2d');
        
        // Détruit ancien chart si existe
        if (canvas.chart) {
            canvas.chart.destroy();
        }
        
        canvas.chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Critique', 'Élevé', 'Modéré'],
                datasets: [{
                    data: [dist.critical, dist.high, dist.moderate],
                    backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6'],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: 'var(--text-primary)',
                            font: { size: 12 }
                        }
                    }
                }
            }
        });
    }
}

function updatePeakAttack(data) {
    const peakHour = data.peak_hour || '--h';
    const peakAttempts = data.peak_attempts || 0;
    
    console.log('📊 Pic attaque:', peakHour, peakAttempts);
    
    const hourEl = document.getElementById('peak-hour');
    const attemptsEl = document.getElementById('peak-attempts');
    
    if (hourEl) hourEl.textContent = peakHour;
    if (attemptsEl) attemptsEl.textContent = `${peakAttempts} tentatives`;
}

function updateTrend(data) {
    const trend = data.trend_24h || 0;
    
    console.log('📊 Tendance:', trend);
    
    const trendEl = document.getElementById('trend-value');
    
    if (trendEl) {
        let icon = 'fa-minus';
        let color = 'var(--text-primary)';
        
        if (trend > 0) {
            icon = 'fa-arrow-up';
            color = '#ef4444'; // Rouge = hausse attaques
        } else if (trend < 0) {
            icon = 'fa-arrow-down';
            color = '#22c55e'; // Vert = baisse attaques
        }
        
        trendEl.innerHTML = `<i class="fas ${icon}"></i> ${Math.abs(trend)}%`;
        trendEl.style.color = color;
    }
}


// ============================================
// GRAPHIQUES CHART.JS
// ============================================
function initChart() {
    if (attackChart) {
        attackChart.destroy();
    }
    
    const ctx = document.getElementById('attackChart').getContext('2d');
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const textColor = isDark ? '#e9ecef' : '#212529';
    
    attackChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Tentatives de connexion',
                data: [],
                backgroundColor: 'rgba(220, 53, 69, 0.7)',
                borderColor: 'rgba(220, 53, 69, 1)',
                borderWidth: 2,
                borderRadius: 8,
                hoverBackgroundColor: 'rgba(220, 53, 69, 0.9)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { 
                        stepSize: null,      // ← MODIFIÉ : Auto au lieu de 10 fixe
                        precision: 0,        // ← AJOUTÉ : Pas de décimales
                        color: textColor 
                    },
                    grid: { color: gridColor }
                },
                x: {
                    ticks: { color: textColor },
                    grid: { color: gridColor }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: { color: textColor, font: { size: 14, weight: 'bold' } }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'rgba(220, 53, 69, 1)',
                    borderWidth: 2
                }
            }
        }
    });
}


function updateChart(topIps) {
    if (!attackChart) return;
    attackChart.data.labels = topIps.map(item => item.ip);
    attackChart.data.datasets[0].data = topIps.map(item => item.attempts);
    attackChart.update();
}

function initTimelineChart() {
    if (timelineChart) {
        timelineChart.destroy();
    }
    
    const ctx = document.getElementById('timelineChart').getContext('2d');
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const textColor = isDark ? '#e9ecef' : '#212529';
    
    timelineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Tentatives par heure',
                data: [],
                borderColor: 'rgba(245, 87, 108, 1)',
                backgroundColor: 'rgba(245, 87, 108, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointHoverRadius: 7,
                pointBackgroundColor: 'rgba(245, 87, 108, 1)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 5, color: textColor },
                    grid: { color: gridColor }
                },
                x: {
                    ticks: { color: textColor },
                    grid: { color: gridColor, display: false }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: { color: textColor, font: { size: 14, weight: 'bold' } }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'rgba(245, 87, 108, 1)',
                    borderWidth: 2,
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y + ' tentatives';
                        }
                    }
                }
            }
        }
    });
}

function updateTimelineChart(topIps) {
    if (!timelineChart) {
        initTimelineChart();
    }
    
    const now = new Date();
    const labels = [];
    const data = [];
    
    for (let i = 23; i >= 0; i--) {
        const hour = new Date(now - i * 3600000);
        const hourLabel = hour.getHours() + 'h';
        labels.push(hourLabel);
        
        let attempts = 0;
        if (topIps && topIps.length > 0) {
            const hourOfDay = hour.getHours();
            const baseAttempts = Math.floor(Math.random() * 15) + 5;
            
            if (hourOfDay >= 0 && hourOfDay <= 6) {
                attempts = baseAttempts * 1.5;
            } else if (hourOfDay >= 20 && hourOfDay <= 23) {
                attempts = baseAttempts * 1.8;
            } else {
                attempts = baseAttempts;
            }
            
            attempts = Math.floor(attempts);
        }
        
        data.push(attempts);
    }
    
    timelineChart.data.labels = labels;
    timelineChart.data.datasets[0].data = data;
    timelineChart.update();
}

// ============================================
// GÉOLOCALISATION DES IPS
// ============================================
const GEO_CACHE_KEY = 'ssh_dashboard_geo_cache';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 jours

function getGeoCache() {
    try {
        const cache = localStorage.getItem(GEO_CACHE_KEY);
        return cache ? JSON.parse(cache) : {};
    } catch {
        return {};
    }
}

function setGeoCache(ip, data) {
    try {
        const cache = getGeoCache();
        cache[ip] = {
            data: data,
            timestamp: Date.now()
        };
        localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
        console.log('Cache géo plein, nettoyage...');
        localStorage.removeItem(GEO_CACHE_KEY);
    }
}

async function geolocateIP(ip) {
    const cache = getGeoCache();
    if (cache[ip] && (Date.now() - cache[ip].timestamp) < CACHE_DURATION) {
        return cache[ip].data;
    }
    
    try {
        const response = await fetch(`/api/geolocate/${ip}`);
        const data = await response.json();
        
        if (data.success) {
            setGeoCache(ip, data);
        }
        
        return data;
    } catch (error) {
        console.error(`Erreur géoloc ${ip}:`, error);
        return {
            success: false,
            country: 'Unknown',
            country_code: 'XX',
            flag: '🏴'
        };
    }
}

// Met à jour le tableau avec géolocalisation
async function updateTableWithGeo(topIps) {
    const tbody = document.getElementById('ip-tbody');
    tbody.innerHTML = '';
    
    if (topIps.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Aucune IP suspecte détectée</td></tr>';
        return;
    }
    
    const countriesCount = {};
    const countriesSet = new Set();
    
    for (let index = 0; index < topIps.length; index++) {
        const item = topIps[index];
        const level = getAlertLevel(item.attempts);
        const geo = await geolocateIP(item.ip);
        
        const countryKey = geo.country || 'Unknown';
        countriesCount[countryKey] = (countriesCount[countryKey] || 0) + 1;
        countriesSet.add(countryKey);
        
        const row = document.createElement('tr');
        row.className = 'fade-in';
        row.style.animationDelay = `${index * 0.05}s`;
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${item.ip}</strong></td>
            <td>
                <span class="country-info" title="${geo.country} - ${geo.city}">
                    ${geo.flag} ${geo.country}
                </span>
            </td>
            <td>${item.attempts}</td>
            <td><span class="badge ${level.class}">${level.text}</span></td>
            <td>
                <button class="btn btn-sm btn-danger btn-ban" onclick="generateBanCommand('${item.ip}')">
                    <i class="fas fa-ban"></i> Bannir
                </button>
            </td>
        `;
        tbody.appendChild(row);
    }
    
    // Peuple le filtre pays
    populateCountryFilter(Array.from(countriesSet).sort());
    
    // Met à jour top pays
    updateTopCountries(countriesCount);
    
    setTimeout(() => {
        updateResultsCount(topIps.length, topIps.length);
    }, 100);
}

// Peuple le dropdown pays
function populateCountryFilter(countries) {
    const select = document.getElementById('filter-country');
    if (!select) return;
    
    select.innerHTML = '<option value="all">Tous pays</option>';
    
    countries.forEach(country => {
        const option = document.createElement('option');
        option.value = country.toLowerCase();
        option.textContent = country;
        select.appendChild(option);
    });
    
    console.log('Pays ajoutés au filtre:', countries);
}

function updateTopCountries(countriesCount) {
    const container = document.getElementById('top-countries');
    
    const sorted = Object.entries(countriesCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    if (sorted.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">Aucune donnée disponible</p>';
        return;
    }
    
    let html = '<div class="countries-list">';
    
    sorted.forEach(([country, count], index) => {
        const percentage = Math.round((count / Object.values(countriesCount).reduce((a, b) => a + b, 0)) * 100);
        
        html += `
            <div class="country-item" style="animation-delay: ${index * 0.1}s">
                <div class="country-header">
                    <span class="country-name">${country}</span>
                    <span class="country-count">${count} attaque${count > 1 ? 's' : ''}</span>
                </div>
                <div class="country-bar-wrapper">
                    <div class="country-bar" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}
// ============================================
// TIMELINE DES ATTAQUES
// ============================================
function updateTimeline(topIps) {
    const timeline = document.getElementById('attack-timeline');
    const countBadge = document.getElementById('timeline-count');
    
    timeline.innerHTML = '';
    
    if (!topIps || topIps.length === 0) {
        timeline.innerHTML = '<p class="text-center text-muted">Aucune attaque récente détectée</p>';
        countBadge.textContent = '0';
        return;
    }
    
    const now = new Date();
    const attacks = [];
    
    topIps.forEach((item, index) => {
        const numAttacks = Math.min(3, Math.ceil(item.attempts / 10));
        
        for (let i = 0; i < numAttacks; i++) {
            const minutesAgo = Math.floor(Math.random() * 60) + (index * 5);
            const timestamp = new Date(now - minutesAgo * 60000);
            
            attacks.push({
                ip: item.ip,
                attempts: Math.floor(Math.random() * 10) + 1,
                timestamp: timestamp,
                minutesAgo: minutesAgo
            });
        }
    });
    
    attacks.sort((a, b) => b.timestamp - a.timestamp);
    const recentAttacks = attacks.slice(0, 10);
    countBadge.textContent = recentAttacks.length;
    
    recentAttacks.forEach((attack, index) => {
        const level = getAlertLevel(attack.attempts);
        const timeAgo = formatTimeAgo(attack.minutesAgo);
        
        const item = document.createElement('div');
        item.className = `timeline-item ${level.class.includes('danger') ? 'critical' : level.class.includes('warning') ? 'warning' : 'info'}`;
        item.style.animationDelay = `${index * 0.1}s`;
        
        item.innerHTML = `
            <div class="timeline-header">
                <span class="timeline-ip">${attack.ip}</span>
                <span class="timeline-time">
                    <i class="fas fa-clock"></i> ${timeAgo}
                </span>
            </div>
            <div class="timeline-details">
                <i class="fas fa-bug"></i> ${attack.attempts} tentative${attack.attempts > 1 ? 's' : ''} échouée${attack.attempts > 1 ? 's' : ''}
                <span class="badge ${level.class}">${level.text}</span>
            </div>
        `;
        
        timeline.appendChild(item);
    });
}

function formatTimeAgo(minutes) {
    if (minutes < 1) return "À l'instant";
    if (minutes === 1) return "Il y a 1 min";
    if (minutes < 60) return `Il y a ${minutes} min`;
    
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return "Il y a 1h";
    if (hours < 24) return `Il y a ${hours}h`;
    
    const days = Math.floor(hours / 24);
    return `Il y a ${days}j`;
}

// ============================================
// RECHERCHE & FILTRAGE
// ============================================
function initFilters() {
    const searchInput = document.getElementById('search-ip');
    const countryFilter = document.getElementById('filter-country');
    const levelFilter = document.getElementById('filter-level');
    const attemptsFilter = document.getElementById('filter-attempts');
    const resetBtn = document.getElementById('reset-filters');
    const clearSearchBtn = document.getElementById('clear-search');
    
    if (!searchInput) return;
    
    searchInput.addEventListener('input', function() {
        applyFilters();
        toggleClearButton();
    });
    
    countryFilter.addEventListener('change', applyFilters);
    levelFilter.addEventListener('change', applyFilters);
    attemptsFilter.addEventListener('change', applyFilters);
    
    resetBtn.addEventListener('click', resetFilters);
    
    clearSearchBtn.addEventListener('click', function() {
        searchInput.value = '';
        applyFilters();
        toggleClearButton();
    });
}

function toggleClearButton() {
    const searchInput = document.getElementById('search-ip');
    const clearBtn = document.getElementById('clear-search');
    
    if (searchInput.value.length > 0) {
        clearBtn.style.display = 'block';
    } else {
        clearBtn.style.display = 'none';
    }
}

function applyFilters() {
    const searchValue = document.getElementById('search-ip').value.toLowerCase();
    const countryValue = document.getElementById('filter-country').value.toLowerCase();
    const levelValue = document.getElementById('filter-level').value;
    const attemptsValue = parseInt(document.getElementById('filter-attempts').value);
    
    const tbody = document.getElementById('ip-tbody');
    const rows = tbody.getElementsByTagName('tr');
    
    let visibleCount = 0;
    
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.getElementsByTagName('td');
        
        if (cells.length === 0) continue;
        
        const ip = cells[1].textContent.toLowerCase();
        const country = cells[2].textContent.toLowerCase();
        const attempts = parseInt(cells[3].textContent);
        const levelBadge = cells[4].querySelector('.badge');
        const level = levelBadge ? levelBadge.textContent.toLowerCase() : '';
        
        const matchesSearch = ip.includes(searchValue);
        const matchesCountry = countryValue === 'all' || country.includes(countryValue);
        const matchesLevel = levelValue === 'all' || level.includes(levelValue);
        const matchesAttempts = attemptsValue === 'all' || isNaN(attemptsValue) || attempts >= attemptsValue;
        
        if (matchesSearch && matchesCountry && matchesLevel && matchesAttempts) {
            row.classList.remove('filtered-out');
            row.classList.add('fade-in-filter');
            visibleCount++;
        } else {
            row.classList.add('filtered-out');
            row.classList.remove('fade-in-filter');
        }
    }
    
    updateResultsCount(visibleCount, rows.length);
}

function updateResultsCount(filtered, total) {
    document.getElementById('filtered-count').textContent = filtered;
    document.getElementById('total-count').textContent = total;
}

function resetFilters() {
    document.getElementById('search-ip').value = '';
    document.getElementById('filter-country').value = 'all';
    document.getElementById('filter-level').value = 'all';
    document.getElementById('filter-attempts').value = 'all';
    
    applyFilters();
    toggleClearButton();
}

// ============================================
// UTILITAIRES
// ============================================
function getAlertLevel(attempts) {
    if (attempts >= 50) {
        return { class: 'badge-danger-custom', text: 'CRITIQUE' };
    } else if (attempts >= 20) {
        return { class: 'badge-warning-custom', text: 'ÉLEVÉ' };
    } else {
        return { class: 'badge-info-custom', text: 'MODÉRÉ' };
    }
}

function generateBanCommand(ip) {
    const command = `sudo iptables -A INPUT -s ${ip} -j DROP`;
    
    navigator.clipboard.writeText(command).then(() => {
        alert(`Commande copiée dans le presse-papier:\n\n${command}\n\nExécutez-la sur votre serveur SSH.`);
    }).catch(() => {
        alert(`Commande à exécuter:\n\n${command}`);
    });
}

// ============================================
// MODE DARK/LIGHT
// ============================================
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    const icon = document.getElementById('theme-icon');
    
    html.setAttribute('data-theme', newTheme);
    icon.className = newTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    
    updateChartTheme();
    
    localStorage.setItem('theme', newTheme);
}

function updateChartTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const textColor = isDark ? '#e9ecef' : '#212529';
    
    if (attackChart) {
        attackChart.options.scales.y.ticks.color = textColor;
        attackChart.options.scales.y.grid.color = gridColor;
        attackChart.options.scales.x.ticks.color = textColor;
        attackChart.options.scales.x.grid.color = gridColor;
        attackChart.options.plugins.legend.labels.color = textColor;
        attackChart.update();
    }
    
    if (timelineChart) {
        timelineChart.options.scales.y.ticks.color = textColor;
        timelineChart.options.scales.y.grid.color = gridColor;
        timelineChart.options.scales.x.ticks.color = textColor;
        timelineChart.options.plugins.legend.labels.color = textColor;
        timelineChart.update();
    }
}

// ============================================
// EXPORTS JSON/CSV
// ============================================
function downloadFile(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 100);
}

function getTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}${month}${day}_${hours}${minutes}`;
}

async function exportJSON() {
    try {
        const response = await fetch(`${API_BASE}/stats`);
        const data = await response.json();
        
        const finalData = (data.total_attempts === 0) ? MOCK_DATA : data;
        
        const exportData = {
            timestamp: new Date().toISOString(),
            server_ip: window.location.hostname,
            total_attempts: finalData.total_attempts,
            unique_ips: finalData.unique_ips,
            top_ips: finalData.top_ips
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        
        const timestamp = getTimestamp();
        const hostname = window.location.hostname.replace('localhost', 'local');
        const filename = `ssh-attacks_${timestamp}_${hostname}.json`;
        
        downloadFile(blob, filename);
        console.log('Export JSON réussi:', filename);
    } catch (error) {
        console.error('Erreur export JSON:', error);
        alert('Erreur lors de l\'export JSON: ' + error.message);
    }
}

async function exportCSV() {
    try {
        const response = await fetch(`${API_BASE}/stats`);
        const data = await response.json();
        
        const finalData = (data.total_attempts === 0) ? MOCK_DATA : data;
        
        const BOM = '\uFEFF';
        let csv = BOM + 'Adresse IP,Tentatives,Niveau\n';
        
        if (finalData.top_ips && Array.isArray(finalData.top_ips)) {
            finalData.top_ips.forEach(item => {
                const level = getAlertLevel(item.attempts).text;
                csv += `${item.ip},${item.attempts},${level}\n`;
            });
        }
        
        csv += `\n`;
        csv += `Date export,${new Date().toLocaleString('fr-FR')}\n`;
        csv += `Serveur,${window.location.hostname}\n`;
        csv += `Total tentatives,${finalData.total_attempts}\n`;
        csv += `IPs uniques,${finalData.unique_ips}\n`;
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        
        const timestamp = getTimestamp();
        const hostname = window.location.hostname.replace('localhost', 'local');
        const filename = `ssh-attacks_${timestamp}_${hostname}.csv`;
        
        downloadFile(blob, filename);
        console.log('Export CSV réussi:', filename);
    } catch (error) {
        console.error('Erreur export CSV:', error);
        alert('Erreur lors de l\'export CSV: ' + error.message);
    }
}

// ============================================
// SYSTÈME DE NOTIFICATIONS
// ============================================

// État global des notifications
let notificationsHistory = [];
let unreadCount = 0;
let lastKnownIPs = new Set();
let soundEnabled = localStorage.getItem('notifications_sound') !== 'false'; // Activé par défaut

// Initialise le système de notifications
function initNotifications() {
    // Charge les IPs déjà connues depuis le localStorage
    const stored = localStorage.getItem('known_ips');
    if (stored) {
        lastKnownIPs = new Set(JSON.parse(stored));
    }
    
    // Met à jour l'icône du son
    updateSoundIcon();
    
    // Ferme le dropdown si clic en dehors
    document.addEventListener('click', function(event) {
        const dropdown = document.getElementById('notification-dropdown');
        const btn = document.getElementById('notification-btn');
        
        if (dropdown && !dropdown.contains(event.target) && !btn.contains(event.target)) {
            dropdown.style.display = 'none';
        }
    });
    
    console.log('Système de notifications initialisé');
}

// Détecte les nouvelles IPs critiques
function checkForNewThreats(topIps) {
    if (!topIps || topIps.length === 0) return;
    
    topIps.forEach(item => {
        const isNew = !lastKnownIPs.has(item.ip);
        const level = getAlertLevel(item.attempts);
        
        // Alerte uniquement pour les nouvelles IPs critiques ou élevées
        if (isNew && item.attempts >= 20) {
            const type = item.attempts >= 50 ? 'danger' : 'warning';
            const title = item.attempts >= 50 ? 'IP Critique Détectée' : 'IP Élevée Détectée';
            const message = `${item.ip} - ${item.attempts} tentatives`;
            
            // Affiche toast + ajoute à l'historique
            showToast(type, title, message);
            addToHistory(type, title, message);
            
            // Joue le son si activé et critique
            if (soundEnabled && item.attempts >= 50) {
                playNotificationSound();
            }
        }
        
        // Ajoute l'IP aux IPs connues
        lastKnownIPs.add(item.ip);
    });
    
    // Sauvegarde les IPs connues
    localStorage.setItem('known_ips', JSON.stringify([...lastKnownIPs]));
}

// Affiche un toast (notification temporaire)
function showToast(type, title, message) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 12px;
            max-width: 400px;
            pointer-events: none;
        `;
        document.body.appendChild(container);
    }

    const existingToasts = container.querySelectorAll('.toast');
    if (existingToasts.length >= 3) {
        existingToasts[0].remove();
    }

    const icons = {
        danger: 'fa-exclamation-triangle',
        warning: 'fa-exclamation-circle',
        success: 'fa-check-circle',
        info: 'fa-info-circle'
    };

    const colors = {
        danger: '#dc2626',
        warning: '#d97706',
        success: '#059669',
        info: '#0891b2'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.style.cssText = `
        background: white;
        border: 1px solid #e5e5e5;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        padding: 16px;
        display: flex;
        align-items: flex-start;
        gap: 12px;
        position: relative;
        pointer-events: auto;
        animation: none;
        transform: translateX(100px);
        opacity: 0;
        transition: all 0.4s ease;
        margin-bottom: 8px;
    `;

    toast.innerHTML = `
        <div class="toast-icon" style="font-size: 20px; min-width: 24px; color: ${colors[type]};">
            <i class="fas ${icons[type]}"></i>
        </div>
        <div class="toast-content" style="flex: 1;">
            <div class="toast-title" style="font-weight: 600; font-size: 14px; color: #0a0a0a; margin-bottom: 4px;">${title}</div>
            <div class="toast-message" style="font-size: 13px; color: #525252; line-height: 1.4;">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()" style="background: transparent; border: none; color: #737373; font-size: 16px; cursor: pointer; padding: 0; width: 20px; height: 20px;">
            <i class="fas fa-times"></i>
        </button>
    `;

    container.appendChild(toast);

    // Animation (slide in right)
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
        toast.style.opacity = '1';
    }, 10);

    // Auto-hide après 5s
    setTimeout(() => {
        toast.style.transform = 'translateX(100px)';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 400);
    }, 5000);
}


// Ajoute une notification à l'historique
function addToHistory(type, title, message) {
    const notification = {
        type: type,
        title: title,
        message: message,
        timestamp: Date.now()
    };
    
    notificationsHistory.unshift(notification);
    
    // Garde max 50 notifications
    if (notificationsHistory.length > 50) {
        notificationsHistory = notificationsHistory.slice(0, 50);
    }
    
    // Incrémente le compteur non lu
    unreadCount++;
    updateNotificationBadge();
    updateNotificationList();
}

// Met à jour le badge de la navbar
function updateNotificationBadge() {
    const badge = document.getElementById('notification-badge');
    
    if (unreadCount > 0) {
        badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        badge.style.display = 'block';
    } else {
        badge.style.display = 'none';
    }
}

// Toggle le dropdown des notifications
function toggleNotifications() {
    const dropdown = document.getElementById('notification-dropdown');
    const isVisible = dropdown.style.display === 'block';
    
    if (isVisible) {
        dropdown.style.display = 'none';
    } else {
        dropdown.style.display = 'block';
        markAllAsRead();
    }
}

// Marque toutes les notifications comme lues
function markAllAsRead() {
    unreadCount = 0;
    updateNotificationBadge();
}

// Met à jour la liste dans le dropdown
function updateNotificationList() {
    const list = document.getElementById('notification-list');
    
    if (notificationsHistory.length === 0) {
        list.innerHTML = '<p class="text-muted text-center py-3">Aucune notification</p>';
        return;
    }
    
    list.innerHTML = '';
    
    notificationsHistory.slice(0, 10).forEach(notif => {
        const item = document.createElement('div');
        item.className = 'notification-item';
        
        const timeAgo = formatNotificationTime(notif.timestamp);
        
        item.innerHTML = `
            <div class="notification-item-header">
                <span class="notification-type ${notif.type}">
                    ${notif.title}
                </span>
                <span class="notification-time">${timeAgo}</span>
            </div>
            <div class="notification-message">${notif.message}</div>
        `;
        
        list.appendChild(item);
    });
}

// Formate le temps relatif
function formatNotificationTime(timestamp) {
    const now = Date.now();
    const diff = Math.floor((now - timestamp) / 1000); // en secondes
    
    if (diff < 60) return 'À l\'instant';
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
    return `Il y a ${Math.floor(diff / 86400)}j`;
}

// Toggle le son des notifications
function toggleSound() {
    soundEnabled = !soundEnabled;
    localStorage.setItem('notifications_sound', soundEnabled);
    updateSoundIcon();
    
    // Feedback visuel
    showToast('info', 'Paramètres', `Son ${soundEnabled ? 'activé' : 'désactivé'}`);
}

// Met à jour l'icône du son
function updateSoundIcon() {
    const icon = document.getElementById('sound-icon');
    if (!icon) return;
    
    if (soundEnabled) {
        icon.className = 'fas fa-volume-up';
    } else {
        icon.className = 'fas fa-volume-mute';
    }
}

// Joue un son de notification
function playNotificationSound() {
    if (!soundEnabled) return;
    
    try {
        // Méthode 1 : Audio simple (marche mieux sur Safari)
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSA0PVqzn77BdGAg+ltryxnMpBSuAzPLaizsIGGS57OihUBELTKXh8bllHAU2jdXyzn0vBSh+zPHaizsKF2K46+mjUBEMS6Li8bllHAY1jNXyz34wBSh9y/HbizsKGGK46+mjTxELTKPi8bllHAY1jNXyzoAwBSh9y/HbizsKGGK46+mjTxEMTKPi8bllHAY1jNXyzoAwBSd9y/HbizsKGGK46+mjTxEMTKPi8bllHAY1jNXyzoAwBSd9y/HbizsKGGK46+mjTxEMTKPi8bllHAY1jNXyzoAwBSd9y/HbizsKGGK46+mjTxEMTKPi8bllHAY1jNXyzoAwBSd9y/HbizsKGGK46+mjTxEMTKPi8bllHAY1jNXyzoAwBSd9y/HbizsKGGK46+mjTxEMTKPi8bllHAY1jNXyzoAwBSd9y/HbizsKGGK46+mjTxEMTKPi8bllHAY1jNXyzoAwBSd9y/HbizsKGGK46+mjTxEMTKPi8bllHAY1jNXyzoAwBSd9y/HbizsKGGK46+mjTxEMTKPi8bllHAY1jNXyzoAwBSd9y/HbizsKGGK46+mjTxEMTKPi8bllHAY1jNXyzoAwBSd9y/HbizsKGGK46+mjTxEMTKPi8bllHAY1jNXyzoAwBSd9y/HbizsKGGK46+mjTxEMTKPi8bllHAY1jNXyzoAwBSd9y/HbizsKGGK46+mjTxEMTKPi8bllHAY1jNXyzoAwBSd9y/HbizsKGGK46+mjTxEMTKPi8bllHAY1jNXyzoAwBSd9y/HbizsKGGK46+mjTxEMTKPi8bllHAY1jNXyzoAwBSd9y/HbizsKGGK46+mjTxEMTKPi8bllHAY1jNXyzoAwBSd9y/HbizsKGGK46+mjTxEMTKPi8bllHAY1jNXyzoAwBSd9y/HbizsKGGK46+mjTxEMTKPi8bllHAY1jNXyzoAwBSd9y/HbizsKGGK46+mjTxEMTKPi8bllHAY1jNXyzoAwBSd9y/HbizsKGGK46+mjTxEMTKPi8bllHAY1jNXyzoAwBSd9y/HbizsKGGK46+mjTxEMTKPi8bllHAY1jNXyzoAwBSd9y/HbizsKGGK46+mjTxEMTKPi8bllHAY1jNXyzoAwBSd9y/HbizsKGGK46+mjTxEMTKPi8bllHAY1jNXyzoAwBSd9y/HbizsKGGK46+mjTxEMTKPi8bllHA==');
        audio.volume = 0.3;
        audio.play().catch(e => console.log('Son bloqué:', e));
    } catch (error) {
        console.log('Erreur son:', error);
    }
}


// Efface toutes les notifications
function clearAllNotifications() {
    notificationsHistory = [];
    unreadCount = 0;
    updateNotificationBadge();
    updateNotificationList();
    
    showToast('success', 'Notifications', 'Historique effacé');
}

// Modifie la fonction loadData() existante pour ajouter la détection
const originalLoadData = loadData;
loadData = async function() {
    try {
        const response = await fetch(`${API_BASE}/stats`);
        const data = await response.json();
        
        const finalData = (data.total_attempts === 0) ? MOCK_DATA : data;
        
        // Détecte les nouvelles menaces AVANT de mettre à jour
        checkForNewThreats(finalData.top_ips);
        
        updateStats(finalData);
        updateChart(finalData.top_ips);
        await updateTableWithGeo(finalData.top_ips);
        updateTimeline(finalData.top_ips);
        updateTimelineChart(finalData.top_ips);
        updateLastUpdate();
        
    } catch (error) {
        console.error('Erreur chargement données:', error);
        updateStats(MOCK_DATA);
        updateChart(MOCK_DATA.top_ips);
        await updateTableWithGeo(MOCK_DATA.top_ips);
        updateTimeline(MOCK_DATA.top_ips);
        updateTimelineChart(MOCK_DATA.top_ips);
    }
};

// Initialise le système de notifications au démarrage
document.addEventListener('DOMContentLoaded', function() {
    // ... (code existant)
    initNotifications();
});

// ============================================
// STATISTIQUES AVANCÉES
// ============================================

let levelChart = null;

// Initialise le graphique camembert
function initLevelChart() {
    const ctx = document.getElementById('levelChart');
    if (!ctx) return;
    
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#e9ecef' : '#212529';
    
    if (levelChart) {
        levelChart.destroy();
    }
    
    levelChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Critique', 'Élevé', 'Modéré'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: [
                    'rgba(220, 38, 38, 0.8)',   // Rouge
                    'rgba(217, 119, 6, 0.8)',   // Orange
                    'rgba(8, 145, 178, 0.8)'    // Bleu
                ],
                borderColor: [
                    'rgba(220, 38, 38, 1)',
                    'rgba(217, 119, 6, 1)',
                    'rgba(8, 145, 178, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        color: textColor,
                        font: { size: 11 },
                        padding: 8
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + context.parsed + ' IP(s)';
                        }
                    }
                }
            }
        }
    });
}

// Calcule le score de sécurité (0-100)
function calculateSecurityScore(data) {
    if (!data || !data.top_ips || data.top_ips.length === 0) {
        return 100; // Score parfait si aucune attaque
    }
    
    const totalAttempts = data.total_attempts || 0;
    const uniqueIps = data.unique_ips || 1;
    
    // Compte les IPs par niveau
    let criticalCount = 0;
    let highCount = 0;
    let moderateCount = 0;
    
    data.top_ips.forEach(item => {
        if (item.attempts >= 50) criticalCount++;
        else if (item.attempts >= 20) highCount++;
        else moderateCount++;
    });
    
    // Calcul du score (plus il y a d'attaques, moins bon le score)
    let score = 100;
    
    // Pénalités
    score -= Math.min(totalAttempts / 10, 30);     // Max -30 pour tentatives
    score -= criticalCount * 15;                    // -15 par IP critique
    score -= highCount * 8;                         // -8 par IP élevée
    score -= moderateCount * 3;                     // -3 par IP modérée
    
    // Bonus si peu d'IPs uniques (attaques ciblées = plus facile à bloquer)
    if (uniqueIps <= 3) score += 5;
    
    // Arrondi entre 0 et 100
    return Math.max(0, Math.min(100, Math.round(score)));
}

// Met à jour le score de sécurité
function updateSecurityScore(data) {
    const score = calculateSecurityScore(data);
    const scoreElement = document.getElementById('security-score');
    const labelElement = document.getElementById('score-label');
    const circleElement = document.getElementById('score-circle');
    
    if (!scoreElement || !labelElement || !circleElement) return;
    
    // Animation du chiffre
    const currentScore = parseInt(scoreElement.textContent) || 0;
    const counter = new countUp.CountUp('security-score', score, {
        startVal: currentScore,
        duration: 1.5,
        useEasing: true
    });
    if (!counter.error) {
        counter.start();
    }
    
    // Animation du cercle (circumference = 2 * PI * radius = 283)
    const circumference = 283;
    const offset = circumference - (score / 100) * circumference;
    circleElement.style.strokeDashoffset = offset;
    
    // Couleur selon le score
    circleElement.classList.remove('warning', 'danger');
    if (score < 40) {
        circleElement.classList.add('danger');
        labelElement.textContent = 'Sécurité compromise';
    } else if (score < 70) {
        circleElement.classList.add('warning');
        labelElement.textContent = 'Vigilance requise';
    } else {
        labelElement.textContent = 'Sécurité correcte';
    }
}

// Met à jour le graphique de répartition
function updateLevelChart(data) {
    if (!levelChart || !data || !data.top_ips) return;
    
    let criticalCount = 0;
    let highCount = 0;
    let moderateCount = 0;
    
    data.top_ips.forEach(item => {
        if (item.attempts >= 50) criticalCount++;
        else if (item.attempts >= 20) highCount++;
        else moderateCount++;
    });
    
    levelChart.data.datasets[0].data = [criticalCount, highCount, moderateCount];
    levelChart.update();
}

// Calcule le pic d'attaque (heure avec le plus de tentatives)
function updatePeakHour(data) {
    const peakHourElement = document.getElementById('peak-hour');
    const peakAttemptsElement = document.getElementById('peak-attempts');
    
    if (!peakHourElement || !peakAttemptsElement) return;
    
    if (!data || !data.top_ips || data.top_ips.length === 0) {
        peakHourElement.textContent = '--h';
        peakAttemptsElement.textContent = '0 tentatives';
        return;
    }
    
    // Simule une distribution sur 24h (en production, ça viendrait des vrais logs)
    const hours = Array(24).fill(0);
    
    data.top_ips.forEach(item => {
        // Répartit les tentatives sur plusieurs heures aléatoires
        const numHours = Math.min(5, Math.ceil(item.attempts / 10));
        for (let i = 0; i < numHours; i++) {
            const hour = Math.floor(Math.random() * 24);
            hours[hour] += Math.floor(item.attempts / numHours);
        }
    });
    
    // Trouve l'heure de pointe
    let maxAttempts = 0;
    let peakHour = 0;
    
    hours.forEach((attempts, hour) => {
        if (attempts > maxAttempts) {
            maxAttempts = attempts;
            peakHour = hour;
        }
    });
    
    peakHourElement.textContent = `${peakHour}h`;
    peakAttemptsElement.textContent = `${maxAttempts} tentatives`;
}

// Met à jour la tendance (simulée)
function updateTrend(data) {
    const trendValueElement = document.getElementById('trend-value');
    const trendLabelElement = document.getElementById('trend-label');
    
    if (!trendValueElement || !trendLabelElement) return;
    
    // Simule une tendance basée sur le nombre d'attaques
    const totalAttempts = data?.total_attempts || 0;
    let trendPercent = 0;
    
    if (totalAttempts > 0) {
        // Simule un changement entre -50% et +50%
        trendPercent = Math.floor((Math.random() * 100) - 50);
    }
    
    // Icône et couleur
    trendValueElement.classList.remove('up', 'down', 'neutral');
    let icon = 'fa-minus';
    let className = 'neutral';
    
    if (trendPercent > 0) {
        icon = 'fa-arrow-up';
        className = 'up';
    } else if (trendPercent < 0) {
        icon = 'fa-arrow-down';
        className = 'down';
    }
    
    trendValueElement.classList.add(className);
    trendValueElement.innerHTML = `<i class="fas ${icon}"></i> ${Math.abs(trendPercent)}%`;
}

// Fonction principale : met à jour toutes les stats avancées
function updateAdvancedStats(data) {
    updateSecurityScore(data);
    updateLevelChart(data);
    updatePeakHour(data);
    updateTrend(data);
}

// Initialise les stats avancées au chargement
document.addEventListener('DOMContentLoaded', function() {
    initLevelChart();
});

// ============================================
// SYSTÈME AUTO-BANNISSEMENT
// ============================================

let banScriptData = null;

// Ouvre le modal auto-ban
async function openBanModal() {
    try {
        // Appelle l'API pour générer le script
        const response = await fetch(`${API_BASE}/generate-ban-script`);
        const data = await response.json();
        
        if (!data.success) {
            showToast('warning', 'Aucune IP à bannir', data.error || 'Aucune IP critique détectée');
            return;
        }
        
        // Stocke les données
        banScriptData = data;
        
        // Met à jour le modal
        document.getElementById('ban-modal-count').textContent = data.count;
        
        // Affiche la liste des IPs
        const ipListHtml = data.ips.map(ip => `
            <div style="padding: 8px; background: var(--bg-tertiary); border-radius: 6px; margin-bottom: 8px; font-family: monospace;">
                <i class="fas fa-ban text-danger"></i> ${ip}
            </div>
        `).join('');
        document.getElementById('ban-ip-list').innerHTML = ipListHtml;
        
        // Affiche le script
        document.getElementById('ban-script-preview').textContent = data.script;
        
        // Ouvre le modal
        const modal = new bootstrap.Modal(document.getElementById('banModal'));
        modal.show();
        
    } catch (error) {
        console.error('Erreur ouverture modal ban:', error);
        showToast('danger', 'Erreur', 'Impossible de générer le script de bannissement');
    }
}

// Télécharge le script bash
function downloadBanScript() {
    if (!banScriptData || !banScriptData.script) {
        showToast('danger', 'Erreur', 'Aucun script disponible');
        return;
    }
    
    // Crée un blob avec le script
    const blob = new Blob([banScriptData.script], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    // Crée un lien de téléchargement
    const a = document.createElement('a');
    a.href = url;
    a.download = `ban-ips-${new Date().toISOString().split('T')[0]}.sh`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Notification
    showToast('success', 'Script téléchargé', `Fichier : ${a.download}`);
    
    // Ferme le modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('banModal'));
    if (modal) modal.hide();
    
    // Affiche les instructions
    showToast('info', 'Prochaine étape', 'Exécutez le script sur votre serveur avec : sudo bash ' + a.download);
}

// Active/désactive le bouton de téléchargement selon la checkbox
document.addEventListener('DOMContentLoaded', function() {
    const checkbox = document.getElementById('ban-confirm-check');
    const downloadBtn = document.getElementById('download-ban-script');
    
    if (checkbox && downloadBtn) {
        checkbox.addEventListener('change', function() {
            downloadBtn.disabled = !this.checked;
        });
    }
});

// Met à jour le compteur d'IPs critiques dans le badge
function updateBanCount(data) {
    if (!data || !data.top_ips) return;
    
    const criticalCount = data.top_ips.filter(item => item.attempts >= 50).length;
    const badgeElement = document.getElementById('ban-count');
    
    if (badgeElement) {
        badgeElement.textContent = criticalCount;
        
        // Change la couleur du badge selon le nombre
        if (criticalCount > 0) {
            badgeElement.classList.remove('bg-light', 'text-dark');
            badgeElement.classList.add('bg-warning', 'text-dark');
        } else {
            badgeElement.classList.remove('bg-warning');
            badgeElement.classList.add('bg-light', 'text-dark');
        }
    }
}

// Ajoute updateBanCount dans loadData()
// (Cette modification sera faite dans l'étape suivante)



// ============================================
// FIN DU FICHIER
// ============================================

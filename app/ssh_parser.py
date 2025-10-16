import subprocess
import re
from datetime import datetime

def parse_ssh_logs():
    """Parse SSH logs depuis journalctl"""
    try:
        cmd = ["journalctl", "-u", "ssh", "-n", "5000", "--no-pager"]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        
        if result.returncode != 0:
            print("❌ journalctl failed")
            return []
        
        log_content = result.stdout
        failed_pattern = re.compile(r'Failed password for .* from (\d+\.\d+\.\d+\.\d+)', re.IGNORECASE)
        failed_ips = failed_pattern.findall(log_content)
        
        if not failed_ips:
            print("⚠️ No failed SSH attempts found")
            return []
        
        ip_counts = {}
        for ip in failed_ips:
            ip_counts[ip] = ip_counts.get(ip, 0) + 1
        
        attacks = []
        for ip, count in sorted(ip_counts.items(), key=lambda x: x[1], reverse=True):
            attacks.append({
                'ip': ip,
                'attempts': count,
                'last_seen': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            })
        
        print(f"✅ Found {len(attacks)} attacking IPs")
        return attacks
        
    except Exception as e:
        print(f"❌ Error parsing logs: {e}")
        return []

def get_stats():
    """Retourne les stats formatées pour l'API"""
    attacks = parse_ssh_logs()
    
    return {
        'timestamp': datetime.now().isoformat(),
        'total_attempts': sum(a['attempts'] for a in attacks),
        'unique_ips': len(attacks),
        'top_ips': attacks
    }

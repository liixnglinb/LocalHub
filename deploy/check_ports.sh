#!/bin/bash
echo "====PORTS===="
ss -tlnp 2>/dev/null | grep -E ':80 |:443 |:3001 |:18880 '
echo "====TCP-LISTEN-80 (hex)===="
cat /proc/net/tcp | awk '{print $2, $4}' | grep -i ':0050'
echo "====CLOUDFLARED===="
ps aux | grep -i cloudflared | grep -v grep | head
echo "====NGINX-MAIN-80===="
grep -rn 'listen 80' /www/server/nginx/conf/nginx.conf 2>/dev/null
grep -rn 'listen\s*80' /www/server/nginx/conf/ 2>/dev/null | head
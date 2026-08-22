#!/bin/bash
CONF=/www/server/panel/vhost/nginx/47.96.39.156.conf
python3 << 'PYEOF'
path = "/www/server/panel/vhost/nginx/47.96.39.156.conf"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

lb_locations = """    # ===== LocalHub 云端反向代理 (HTTPS 域名块) =====

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        add_header Cache-Control "no-store, no-cache, must-revalidate" always;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }

    location /lb/ {
        alias /var/www/html/lb/;
        try_files $uri $uri/ /lb/index.html;
    }

    location /mindmap-app/ {
        alias /var/www/html/mindmap-app/;
        try_files $uri $uri/ /mindmap-app/index.html;
    }
"""

marker = "    # ===== LocalHub 云端反向代理 (HTTPS 域名块) =====\n"
cnt = content.count(lb_locations)
if cnt == 0:
    content = content.replace(marker, lb_locations, 1)
    print("已插入 443 块反代")
else:
    print("已存在，跳过")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
PYEOF

nginx -t 2>&1
if [ $? -ne 0 ]; then
  echo "配置失败"
  exit 1
fi
systemctl reload nginx
echo "=== nginx 已重载 ==="
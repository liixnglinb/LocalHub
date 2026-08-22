import re
f = "/www/server/panel/vhost/nginx/47.96.39.156.conf"
s = open(f).read()

# 先删除已插入的反代块（HTTP 80 和 HTTPS 域名块）
s = re.sub(r"\n\s*# ===== LocalHub 云端反向代理.*?(?=location / \{)",
           "\n", s, flags=re.S)
s = re.sub(r"\n\s*# ===== LocalHub 云端反向代理 \(HTTPS 域名块\).*?(?=location / \{)",
           "\n", s, flags=re.S)

# 新反代块（含 no-cache 头，避免 Cloudflare 缓存）
block = """
    # ===== LocalHub 云端反向代理 =====
    location /hub/ {
        proxy_pass http://127.0.0.1:3001/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 300s;
        add_header Cache-Control "no-store, no-cache, must-revalidate" always;
        add_header X-Cloudflare-Bypass "1" always;
    }
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        add_header Cache-Control "no-store, no-cache, must-revalidate" always;
    }
    location /lb/ {
        proxy_pass http://127.0.0.1:3001/lb/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        add_header Cache-Control "no-store, no-cache, must-revalidate" always;
    }
    location /mindmap-app/ {
        proxy_pass http://127.0.0.1:18880/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        client_max_body_size 100m;
        add_header Cache-Control "no-store, no-cache, must-revalidate" always;
    }
"""

# 对每一个 "location / {" 之前插入（多个 server 块）
# 用循环在所有 "location / {\n" 前插入，但跳过已存在的
count = 0
result = []
pos = 0
while True:
    loc = s.find("    location / {\n", pos)
    if loc == -1:
        break
    result.append(s[pos:loc])
    result.append(block)
    pos = loc
    count += 1
result.append(s[pos:])
s = "".join(result)
open(f, "w").write(s)
print(f"INSERTED_IN_ALL_SERVERS count={count}")
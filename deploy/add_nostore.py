#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""直接在 proxy_pass 行后加 Cache-Control: no-store 头"""
import io

CONF = "/www/server/panel/vhost/nginx/47.96.39.156.conf"

with io.open(CONF, "r", encoding="utf-8") as f:
    lines = f.readlines()

markers = [
    "proxy_pass http://127.0.0.1:3001/;",
    "proxy_pass http://127.0.0.1:3001;",
    "proxy_pass http://127.0.0.1:3001/lb/;",
    "proxy_pass http://127.0.0.1:18880/;",
    "proxy_pass http://127.0.0.1:3721/;",
]

HEADER = '        add_header Cache-Control "no-store, no-cache, must-revalidate" always;\n'

out = []
count = 0
for line in lines:
    out.append(line)
    stripped = line.strip()
    if any(stripped == m or stripped == m.rstrip(";") + ";" for m in markers):
        # 检查下一条是否已有 add_header no-store
        if not any("no-store" in l for l in out[-3:]):
            out.append(HEADER)
            count += 1

with io.open(CONF, "w", encoding="utf-8") as f:
    f.writelines(out)

print("patched:", count)
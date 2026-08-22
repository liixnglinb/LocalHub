#!/bin/bash
echo "=== 源站 443 用 openssl 握手 lxlrwxs.top ==="
echo | openssl s_client -connect 127.0.0.1:443 -servername lxlrwxs.top 2>&1 | grep -E "Verify|subject|issuer|ALPN|SSL-Session|Protocol|Cipher" | head -12
echo ""
echo "=== 源站 443 握手 www ==="
echo | openssl s_client -connect 127.0.0.1:443 -servername www.lxlrwxs.top 2>&1 | grep -E "subject=|Verify return" | head -4
echo ""
echo "=== 证书文件存在性 ==="
ls -la /etc/letsencrypt/live/lxlrwxs.top/ 2>&1
echo ""
echo "=== 确认 SSL 模式相关：443 是否有多个 server 冲突 ==="
nginx -T 2>/dev/null | grep -c "listen 443 ssl"
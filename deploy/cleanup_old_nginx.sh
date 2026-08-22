#!/bin/bash
# 清理旧 LocalHub 反代配置（指向已停止的 3001/18880 端口）
CONF=/www/server/panel/vhost/nginx/47.96.39.156.conf
BAK=/www/server/panel/vhost/nginx/47.96.39.156.conf.bak_before_cleanup

# 1. 备份
cp "$CONF" "$BAK"
echo "已备份到 $BAK"

# 2. 用 python 删除旧反代 location 块（index.py 逻辑）
python3 << 'PYEOF'
import re
path = "/www/server/panel/vhost/nginx/47.96.39.156.conf"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 删除指向 127.0.0.1:3001 或 127.0.0.1:18880 的 location 块（含空行）
# 匹配 location 块直到下一个 location 或闭合 }
pattern = re.compile(
    r'location\s+[^\{]*\{[^}]*?proxy_pass\s+http://127\.0\.0\.1:(3001|18880)[^}]*\}',
    re.DOTALL
)
content, n1 = pattern.subn('', content)
# 清理多余空行
content = re.sub(r'\n\s*\n+', '\n\n', content)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print(f"已删除 {n1} 个旧反代 location 块")
PYEOF

# 3. 测试配置
echo "=== nginx -t ==="
nginx -t 2>&1
if [ $? -ne 0 ]; then
  echo "配置测试失败，回滚备份"
  cp "$BAK" "$CONF"
  exit 1
fi

# 4. 重载
systemctl reload nginx
echo "=== nginx 已重载 ==="
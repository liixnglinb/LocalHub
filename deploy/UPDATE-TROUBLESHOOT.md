# ============================================================
# LocalHub 云端 · 更新与排错命令
# ============================================================

# ============================================================
# 一、后续代码更新流程（scp 上传，不走 git）
# ============================================================
# 本地（Windows）执行：

# 1. 后端更新
cd cloud/server
npm install
npm run build                  # 重新编译 dist
scp -r dist root@47.96.39.156:/www/wwwroot/localhub-web/cloud/server/

# 2. 前端更新
cd cloud/web
npm install
npm run build
scp -r dist/* root@47.96.39.156:/var/www/html/

# 3. 服务器端重启后端
ssh root@47.96.39.156 "export PATH=/usr/local/node22/bin:\$PATH && cd /www/wwwroot/localhub-web/cloud/server && pm2 restart localhub-nest"

# 前端静态无需重启，刷新浏览器即可。

# ============================================================
# 二、排错命令
# ============================================================

# ---- pm2 日志（后端） ----
pm2 status                              # 查看进程状态
pm2 logs localhub-nest                  # 实时日志
tail -f /www/wwwroot/localhub-web/logs/nest-out.log     # stdout
tail -f /www/wwwroot/localhub-web/logs/nest-err.log     # stderr
pm2 restart localhub-nest               # 重启

# ---- Nginx 日志 ----
tail -f /var/log/nginx/tools.lxlrwxs.top.error.log      # 错误日志
tail -f /var/log/nginx/tools.lxlrwxs.top.log            # 访问日志
nginx -t                                # 配置语法检查
systemctl reload nginx                  # 重载配置

# ---- 后端 API 直接测试（服务器本机） ----
curl -i http://127.0.0.1:3000/api/auth/init
curl -i -X POST http://127.0.0.1:3000/api/auth/login -H "Content-Type: application/json" -d '{"password":"localhub"}'
curl -i http://127.0.0.1:3000/api/config                      # 排行榜配置
curl -i http://127.0.0.1:3000/api/leaderboard/overall         # 综合总榜

# ---- 经 Nginx 测试 ----
curl -i http://127.0.0.1/api/auth/init
curl -i https://tools.lxlrwxs.top/api/auth/init

# ---- 数据库（Prisma） ----
npx prisma migrate status               # 查看迁移状态
npx prisma migrate deploy               # 应用未执行的迁移
npx prisma studio                       # 可视化查看数据

# ============================================================
# 三、常见问题
# ============================================================
# 1. API 返回 401 → 未登录，前端会触发登录流程，正常。
# 2. /api 被缓存 → 确认 Cloudflare Cache Rules 已配 /api 绕过缓存。
# 3. 数据库连接失败 → 检查 .env 的 DATABASE_URL / DIRECT_URL 是否正确。
# 4. 3000 端口公网访问 → 确认 pm2 用 HOST=127.0.0.1，安全组不开放 3000。
# 5. 前端白屏 → 检查 Nginx root 是否指向 dist，且 /assets 路径正确。
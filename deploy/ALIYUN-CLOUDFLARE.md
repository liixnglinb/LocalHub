# ============================================================
# LocalHub 云端 · 阿里云 + Cloudflare 配置技巧
# 内含：取消旧配置、新配置、Cloudflare 最佳实践
# ============================================================

# ============================================================
# 一、阿里云：取消旧配置（你之前部署的 LocalHub 网页版）
# 服务器: 47.96.39.156 (Alibaba Cloud Linux 3 + 宝塔)
# ============================================================

## 1. 停止并删除旧 PM2 进程
# 旧进程：localhub-web (3001, Express) + localhub-mindmap (18880, 思维导图)
pm2 delete localhub-web
pm2 delete localhub-mindmap
pm2 save                 # 保存删除后的进程列表

# 若还想完全清理 pm2 列表
pm2 delete all

## 2. 停止并禁用旧 PM2 开机自启
pm2 unstartup            # 按提示执行输出的命令即可

## 3. 删除旧 Nginx 站点配置中的反代块
# 旧配置在 /www/server/panel/vhost/nginx/47.96.39.156.conf
# 其中有这些反代块需要删除（旧 LocalHub 相关）：
#   location /hub/        → 127.0.0.1:3001
#   location /api/        → 127.0.0.1:3001   （博客的旧 API，若不再用）
#   location /lb/         → 127.0.0.1:3001/lb/
#   location /mindmap-app/→ 127.0.0.1:18880
# 注意：location /update/ (3721) 是学习通更新的，若不用也一并删。

# 建议先备份
cp /www/server/panel/vhost/nginx/47.96.39.156.conf /www/server/panel/vhost/nginx/47.96.39.156.conf.bak_before_cleanup

# 手动编辑，或用宝塔面板 → 网站 → 对应站点 → 配置文件 里删除
nano /www/server/panel/vhost/nginx/47.96.39.156.conf
# 删除上述 location 块后保存

# 重载 nginx
nginx -t && systemctl reload nginx

## 4. 删除旧 cloud 目录（可选，备份后）
# mv /www/wwwroot/localhub-web /www/wwwroot/localhub-web.bak_remove

## 5. 阿里云安全组
# 确认仅开放 80（HTTP）。3000/3001/18880 等内部端口不开放公网。
# 控制台 → ECS → 实例 → 安全组 → 入方向规则
# 只保留 80 (HTTP)、22 (SSH)、443 可选（Cloudflare 会转发到 80）

## 6. 清理旧域名解析（若不在用）
# 若 lxlrwxs.top 之前的 A 记录指向还留着，保留（博客在用）；若不用可删。

# ============================================================
# 二、阿里云：新配置（tools.lxlrwxs.top）
# ============================================================

## 1. 安全组放行
# 入方向：80 (HTTP) 必需；22 (SSH) 保持。443 可不开（Cloudflare 终止 HTTPS）。

## 2. 部署代码（见 DEPLOY.md）
# 后端 NestJS 跑在 127.0.0.1:3000（仅本机）
# 前端静态在 /var/www/html
# Nginx 监听 80，/api 反代到 127.0.0.1:3000

# ============================================================
# 三、Cloudflare：配置技巧（tools.lxlrwxs.top）
# ============================================================

## 1. DNS 记录
# 进入 Cloudflare → 域名 lxlrwxs.top → DNS → Records
# 添加：
#   类型: A      名称: tools      内容: 47.96.39.156      代理: 橙云(Proxied)
# 橙云必须开启，否则无 HTTPS。

## 2. SSL/TLS 模式（关键）
# SSL/TLS → Overview → 选择 "Full"
# 原因：服务器只有 HTTP(80)，无本地证书。
# - Full: 浏览器↔Cloudflare HTTPS，Cloudflare→服务器 HTTP(80)
# - 不要选 Full(strict)，那需要服务器有可信证书

## 3. Always Use HTTPS
# SSL/TLS → Edge Certificates → 开启 "Always Use HTTPS"
# 强制所有 HTTP 访问跳转 HTTPS。

## 4. 缓存规则（防止 /api 被缓存）
# Caching → Cache Rules → Create rule
#   规则名: api-no-cache
#   匹配: Hostname = tools.lxlrwxs.top 且 URI Path starts with /api
#   缓存: Bypass cache
#   浏览器 TTL: No Store
# 否则登录/数据读写会命中 Cloudflare 旧缓存。

## 5. 页面规则（可选，替代缓存规则）
# 或用 Page Rules:
#   URL: tools.lxlrwxs.top/api/*
#   设置: Cache Level = Bypass

## 6. 安全建议
# - Security → Bots → 开启 Bot Fight Mode
# - Security → Settings → 开启 Always Use HTTPS
# - 限制 API 仅 HTTPS（在服务器 nginx 判断 X-Forwarded-Proto）
# - 定期轮换 Supabase 密码 + JWT_SECRET

## 7. 验证
# https://tools.lxlrwxs.top/             → 前端
# https://tools.lxlrwxs.top/api/auth/init → {"initialized":...}

# ============================================================
# 四、Supabase：迁移（用 npm 方式，即 prisma migrate deploy）
# ============================================================
# Prisma 会用 DIRECT_URL(session-mode, 5432 端口) 执行迁移。
# 在服务器 cloud/server 目录执行：
export PATH=/usr/local/node22/bin:$PATH
npm run prisma:migrate
# 等价于: npx prisma migrate deploy
# 它会读取 prisma/schema.prisma 和 migrations 目录，自动建表
# （kv, settings）。若没 migrations 目录，则先:
npx prisma migrate dev --name init
# 之后每次 schema 变更用:
npx prisma migrate dev --name <说明>
# 生产环境用:
npm run prisma:migrate
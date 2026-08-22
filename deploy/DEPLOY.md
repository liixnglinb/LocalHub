# ============================================================
# LocalHub 云端 · 部署总览（NestJS + Prisma + Supabase）
# 服务器: 47.96.39.156 (Alibaba Cloud Linux 3), Node22 于 /usr/local/node22
# 域名:   tools.lxlrwxs.top (Cloudflare 中转 HTTPS)
# 架构:   前端静态(React) 由 Nginx 托管, 后端 NestJS 于 127.0.0.1:3000
# ============================================================

# ============================================================
# 一、本地需要做的（Windows）
# ============================================================
# 1. 构建前端
cd cloud/web
npm install
npm run build          # 生成 dist/

# 2. 上传后端代码到服务器（scp）
REMOTE_API=/www/wwwroot/localhub-web/cloud/server
scp -r cloud/server/dist        root@47.96.39.156:$REMOTE_API/
scp -r cloud/server/prisma      root@47.96.39.156:$REMOTE_API/
scp    cloud/server/package.json root@47.96.39.156:$REMOTE_API/
scp    cloud/server/ecosystem.config.js root@47.96.39.156:$REMOTE_API/
scp    cloud/server/deploy-server.sh root@47.96.39.156:$REMOTE_API/

# 3. 上传前端到 Nginx 静态目录
scp -r cloud/web/dist/* root@47.96.39.156:/var/www/html/

# 4. 上传 Nginx 配置
scp    cloud/deploy/tools-nginx.conf root@47.96.39.156:/etc/nginx/conf.d/tools.conf

# 5. 上传 Supabase 数据文件（排行榜）
scp    cloud/server/data/models.json root@47.96.39.156:$REMOTE_API/data/

# ============================================================
# 二、服务器端需要做的（SSH）
# ============================================================
ssh root@47.96.39.156

# 1. 配置 .env（先复制模板再编辑）
cd /www/wwwroot/localhub-web/cloud/server
cp .env.example .env
nano .env
#   填入 DATABASE_URL / DIRECT_URL / JWT_SECRET / LH_PASSWORD

# 2. 安装依赖 + Prisma + 迁移
export PATH=/usr/local/node22/bin:$PATH
npm install
npm run prisma:generate
npm run prisma:migrate     # 或到 Supabase SQL Editor 执行 prisma/midtwo/0001_init.sql

# 3. 构建 + pm2 启动
npm run build
pm2 start ecosystem.config.js
pm2 save
pm2 startup              # 按提示执行输出的命令，实现开机自启

# 4. Nginx 配置 + 重载
cp /etc/nginx/conf.d/tools.conf /etc/nginx/conf.d/tools.conf  # 已上传
nginx -t && systemctl reload nginx

# ============================================================
# 三、Cloudflare（见 cloudflare-setup.md）
# ============================================================
# DNS: tools A 47.96.39.156 (橙云)
# SSL: Full
# Cache Rules: /api 绕过缓存

# ============================================================
# 四、验证
# ============================================================
curl -i http://127.0.0.1:3000/api/auth/init
curl -i https://tools.lxlrwxs.top/api/auth/init
curl -i https://tools.lxlrwxs.top/
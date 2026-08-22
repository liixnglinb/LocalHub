#!/bin/bash
# ============================================================
# LocalHub 云端 · NestJS 后端部署脚本（服务器端执行）
# 服务器：Alibaba Cloud Linux 3 (OpenAnolis)，node22 于 /usr/local/node22
# 前置：本地已用 scp 上传 cloud/server 到 /www/wwwroot/localhub-web/cloud/server
# ============================================================
set -e

REMOTE=/www/wwwroot/localhub-web/cloud/server
NODE=/usr/local/node22/bin/node
NPM=/usr/local/node22/bin/npm
export PATH=/usr/local/node22/bin:$PATH

echo "[1/5] 配置 .env"
if [ ! -f $REMOTE/.env ]; then
  cp $REMOTE/.env.example $REMOTE/.env
  echo "已创建 .env，请编辑填入 DATABASE_URL 和 JWT_SECRET："
  echo "  nano $REMOTE/.env"
  exit 1
fi

echo "[2/5] 安装后端依赖"
cd $REMOTE
$NPM install

echo "[3/5] 生成 Prisma Client 并应用迁移"
$NPM run prisma:generate
# 方式A：用 DIRECT_URL 自动迁移（需网络可达 Supabase）
$NPM run prisma:migrate || echo "迁移失败，可改在 Supabase SQL Editor 手动执行 prisma/midtwo/0001_init.sql"

echo "[4/5] 构建 NestJS"
$NPM run build

echo "[5/5] PM2 启动"
# 若旧 Express 版 localhub-web 还在跑 3001，先停掉（避免冲突；新版用 3000）
pm2 delete localhub-web 2>/dev/null || true
pm2 start $REMOTE/ecosystem.config.js
pm2 save
pm2 startup 2>/dev/null || pm2 startup systemd

echo "完成！请检查：pm2 logs localhub-nest"
echo "Nginx 需新增 tools.lxlrwxs.top 站点，/api 反代到 127.0.0.1:3000"
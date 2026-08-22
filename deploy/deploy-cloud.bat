@echo off
rem ============================================================
rem  LocalHub 云端 · 本地上传部署脚本（Windows 执行）
rem  1. 构建前端 cloud/web -> dist
rem  2. 上传前端 dist 到 /var/www/html
rem  3. 上传 NestJS 后端到 /www/wwwroot/localhub-web/cloud/server
rem  4. 服务器端执行 deploy-server.sh
rem ============================================================
chcp 65001 >nul
set SCRIPT_DIR=%~dp0
set CLOUD=%SCRIPT_DIR%..
set KEY=%USERPROFILE%\.ssh\id_ed25519_bt
set HOST=root@47.96.39.156
set REMOTE_API=/www/wwwroot/localhub-web/cloud/server
set REMOTE_WEB=/var/www/html

echo [1/4] 构建前端...
cd /d "%CLOUD%\web"
call npm run build
if errorlevel 1 ( echo 前端构建失败 & pause & exit /b 1 )

echo [2/4] 上传后端到服务器...
scp -i "%KEY%" -o StrictHostKeyChecking=no -r "%CLOUD%\server\dist" %HOST%:%REMOTE_API%/
scp -i "%KEY%" -o StrictHostKeyChecking=no -r "%CLOUD%\server\prisma" %HOST%:%REMOTE_API%/
scp -i "%KEY%" -o StrictHostKeyChecking=no "%CLOUD%\server\package.json" %HOST%:%REMOTE_API%/
scp -i "%KEY%" -o StrictHostKeyChecking=no "%CLOUD%\server\ecosystem.config.js" %HOST%:%REMOTE_API%/
scp -i "%KEY%" -o StrictHostKeyChecking=no "%CLOUD%\server\deploy-server.sh" %HOST%:%REMOTE_API%/

echo [3/4] 上传前端到服务器...
scp -i "%KEY%" -o StrictHostKeyChecking=no -r "%CLOUD%\web\dist\*" %HOST%:%REMOTE_WEB%/

echo [4/4] 服务器端执行部署...
ssh -i "%KEY%" -o StrictHostKeyChecking=no %HOST% "chmod +x %REMOTE_API%/deploy-server.sh && bash %REMOTE_API%/deploy-server.sh"

echo 完成！请检查 Nginx 配置 /etc/nginx/conf.d/tools.conf 与 pm2 状态
pause
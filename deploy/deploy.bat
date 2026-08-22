@echo off
rem ============================================================
rem  LocalHub 云端部署脚本（Windows 本地执行）
rem  1. 构建前端
rem  2. 上传到云服务器 /www/wwwroot/localhub-web
rem  3. SSH 执行安装 & 启动
rem ============================================================
chcp 65001 >nul
set SCRIPT_DIR=%~dp0
set CLOUD=%SCRIPT_DIR%..
set KEY=%USERPROFILE%\.ssh\id_ed25519_bt
set HOST=root@47.96.39.156
set REMOTE=/www/wwwroot/localhub-web

echo [1/4] 构建 LocalHub 前端...
cd /d "%CLOUD%\web"
call npm run build
if errorlevel 1 ( echo 构建失败 & pause & exit /b 1 )

echo [2/4] 上传代码到服务器...
scp -i "%KEY%" -o StrictHostKeyChecking=no -r "%CLOUD%\server" %HOST%:%REMOTE%/
scp -i "%KEY%" -o StrictHostKeyChecking=no -r "%CLOUD%\web\dist" %HOST%:%REMOTE%/cloud/web/
scp -i "%KEY%" -o StrictHostKeyChecking=no -r "%CLOUD%\web\public\lb" %HOST%:%REMOTE%/cloud/web/dist_lb/
scp -i "%KEY%" -o StrictHostKeyChecking=no -r "%CLOUD%\mindmap" %HOST%:%REMOTE%/cloud/mindmap/
scp -i "%KEY%" -o StrictHostKeyChecking=no "%CLOUD%\ecosystem.config.js" %HOST%:%REMOTE%/

echo [3/4] 服务器端安装依赖并启动...
ssh -i "%KEY%" -o StrictHostKeyChecking=no %HOST% "cd %REMOTE%/cloud/server && export PATH=/usr/local/node22/bin:\$PATH && npm install && cd %REMOTE%/cloud/mindmap && pm2 start %REMOTE%/ecosystem.config.js && pm2 save"

echo [4/4] 完成！请检查 Nginx 配置 /www/server/panel/vhost/nginx/lxlrwxs.top.conf
pause
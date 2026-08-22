/* ============================================================
   PM2 进程配置 — LocalHub 云端 NestJS 后端
   进程: localhub-nest → NestJS API (127.0.0.1:3000)
   ============================================================ */
module.exports = {
  apps: [
    {
      name: 'localhub-nest',
      script: 'dist/main.js',
      cwd: '/www/wwwroot/localhub-web/cloud/server',
      interpreter: '/usr/local/node22/bin/node',
      // 用 Node22 的 --env-file 加载 .env（DATABASE_URL / LH_PASSWORD / PORT 等）
      // 敏感值不硬编码在配置里，统一从 .env 读取
      args: '--env-file=.env',
      env: {
        PORT: '3000',
        HOST: '127.0.0.1',
        DATA_DIR: '/www/wwwroot/localhub-web/cloud/server/data',
        LB_DATA_FILE: '/www/wwwroot/localhub-web/cloud/server/data/models.json'
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '300M',
      max_restarts: 10,
      restart_delay: 3000,
      out_file: '/www/wwwroot/localhub-web/logs/nest-out.log',
      error_file: '/www/wwwroot/localhub-web/logs/nest-err.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    }
  ]
};
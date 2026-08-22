# ============================================================
# LocalHub 云端 · Git 上传步骤
# 目标：把 cloud/（NestJS 后端 + React 前端）推到独立 GitHub 仓库
# ============================================================

# ============================================================
# 一、创建独立仓库（网页或 gh）
# ============================================================
# 方式A：GitHub 网页
#   打开 https://github.com/new
#   仓库名: localhub-cloud
#   可见性: Private（私有，含业务代码）
#   描述:   LocalHub 云端版：NestJS + Prisma + Supabase 后端 + React/Vite 前端
#   点 Create repository

# 方式B：gh CLI（若已授权）
gh repo create localhub-cloud --private --description "LocalHub 云端版"

# ============================================================
# 二、推送 cloud/ 代码（在本地执行）
# ============================================================
# 定位到 cloud 目录
cd "C:\Users\李星历\AppData\Roaming\TRAE SOLO CN\ModularData\ai-agent\work-mode-projects\6a7d7138c64239a73804deef\cloud"

# 初始化 git（cloud 目录当前不是 git 仓库）
git init

# 查看本地 git 配置的用户名邮箱（若未设置需先设置）
git config user.name
git config user.email

# 添加远程仓库（替换为你的实际仓库地址）
git remote add origin https://github.com/liixnglinb/localhub-cloud.git

# 添加文件（注意：node_modules/dist/.env 已被各目录 .gitignore 排除）
git add .

# 检查哪些文件会被提交（确认没有 .env、node_modules、dist）
git status

# 若误加了敏感文件，用 .gitignore 排除后重新 add
git rm --cached -r . 2>/dev/null; git add .

# 首次提交
git commit -m "feat: LocalHub 云端版 - NestJS+Prisma+Supabase 后端 + React 前端"

# 推送
git push -u origin master   # 或 main（取决于仓库默认分支）

# ============================================================
# 三、.gitignore 检查（确保不提交敏感信息）
# ============================================================
# cloud/server/.gitignore 已含：
#   node_modules/  dist/  .env  *.log  data/localhub.db  data/.token
#
# 提交前务必确认 git status 中没有 .env 和真实密码。
# 若要更安全，可对 server 再执行：
#   git add cloud/server/.env.example   （只提交模板，不提交 .env）

# ============================================================
# 四、后续更新（部署走 SCP，Git 仅作代码备份）
# ============================================================
cd cloud
git add .
git commit -m "chore: 更新"
git push
# 部署仍按 DEPLOY.md 走 scp 上传，Git 用于版本备份与回滚。
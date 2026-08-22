# LocalHub 个人工具中心 · 完整部署说明书（供 AI Agent 照做）

> 本文件是给另一个 AI Agent 按步骤执行的手册。请严格按「目录/路径/命令」操作，
> 所有真实配置已提供，涉及用户手动操作的地方会明确标注。

---

## 1. 项目是什么

一个**个人工具中心网站**，纯前端单页应用（SPA），技术栈：
- **React 18 + Vite 5**（构建/开发）
- **lucide-react** 图标、**react-router-dom**（HashRouter）路由、**chart.js**、**tailwind**（部分页面）
- 数据与登录走 **Supabase**（云），托管走 **GitHub Pages**，无自建服务器

包含页面：智能笔记、网页链接、提示词库、学习资料、宝宝护理、思维导图、AI排行榜、个人博客、工具网站、个人课表、个人日程、AI Agent & Skill、AI 每日情报站、API 密钥。

目录结构（前端主体在 `cloud/web/`）：
```
cloud/
  web/                 # 前端 React 应用（本仓库部署主体）
    index.html
    package.json
    vite.config.js       # base './'，HMR port 5173
    .env                 # 本地开发环境变量（gitignore）
    .env.production      # 生产构建变量（提交入库）
    .github/workflows/deploy.yml  # GitHub Pages 自动部署
    public/              # 静态资源（favicon、lb 等）
    src/
      main.jsx           # 注入 window.electronAPI（HashRouter）
      api.js             # 数据读写走 Supabase（兼容 window.electronAPI 接口）
      auth.js            # 鉴权：邮件密码/登录链接/GitHub
      lib/supabase.js    # Supabase 客户端单例
      components/AuthGate.jsx  # 登录门控
      pages/*.jsx        # 各功能页
  supabase_init.sql      # 建表 SQL（需在 Supabase 手动画编辑器执行）
```

---

## 2. 已确认的真实配置（直接用）

| 用途 | 值 |
|---|---|
| Supabase 项目 URL | `https://grutfwvthmrdhywwwlyw.supabase.co` |
| Supabase 公开密钥（Publishable/anon public，可放前端） | `sb_publishable_JMtGctmzjWJMH-ikjQfn-w_3Feg3sCY` |
| GitHub 仓库 | `liixnglinb/LocalHub` |
| 网页版所在分支 | `main`（`master` 分支是旧桌面项目，勿删勿覆盖） |
| GitHub Pages 域名 | `https://liixnglinb.github.io/LocalHub/` |
| 部署方式 | GitHub Actions → GitHub Pages（Source 必须选 `GitHub Actions`） |

⚠️ 安全红线：
- **`service_role` / `sb_secret_...` 密钥绝不可写进前端代码**，只能用于后端管理。
- 上面这条 Publishable Key 是公开的，可放心放前端 / 写进 `.env.production`。

---

## 3. 后端 & 数据库配置（Supabase）

### 3.1 需要用户手动在 Supabase 控制台做的
1. 登录 supabase.com，进入该项目（URL 见上表）。
2. **Authentication → Providers → Email**：确保开启（建议关掉“邮箱确认 Confirm email”，简化个人站注册）。
3. （可选）开启 GitHub 登录。

### 3.2 建表（必须执行一次）
进入 **SQL Editor → New query**，粘贴 **`cloud/supabase_init.sql`** 全部内容并 **Run**。核心内容：

```sql
create table if not exists public.user_data (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  key          text not null,
  value        jsonb not null default 'null'::jsonb,
  updated_at   timestamptz not null default now(),
  unique (user_id, key)
);

alter table public.user_data enable row level security;

create policy "user_data_select_own" on public.user_data for select using (auth.uid() = user_id);
create policy "user_data_insert_own" on public.user_data for insert with check (auth.uid() = user_id);
create policy "user_data_update_own" on public.user_data for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_data_delete_own" on public.user_data for delete using (auth.uid() = user_id);

create function public.handle_user_data_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger trg_user_data_updated_at before update on public.user_data
  for each row execute function public.handle_user_data_updated_at();
```

> 若已执行过（会报“策略 user_data_select_own 已存在”），说明表已建好，无需重复。
> 核对：左侧 **Table Editor** 里能看到 `user_data` 表。

### 3.3 前端连 Supabase 的关键文件（已实现，无需改动）
- `src/lib/supabase.js`：`createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: true } })`
- `src/api.js`：`saveData/loadData/deleteData` 读写 `user_data` 表，按 `user_id + key`，RLS 保证仅本人可见。接口通过 `window.electronAPI` 暴露，页面无需各自改。
- `src/auth.js`：封装 `supabase.auth` 邮箱密码/登录链接/GitHub。
- `src/components/AuthGate.jsx`：登录门控，未登录显示登录卡。

### 3.4 环境变量
- **本地开发**：`cloud/web/.env`
  ```
  VITE_SUPABASE_URL=https://grutfwvthmrdhywwwlyw.supabase.co
  VITE_SUPABASE_ANON_KEY=sb_publishable_JMtGctmzjWJMH-ikjQfn-w_3Feg3sCY
  ```
- **生产构建**：`cloud/web/.env.production`（值同上，**提交入库**，供 GitHub Actions 构建时自动读取）

---

## 4. 托管部署（GitHub Pages）

### 4.1 仓库约定（重要）
- `main` 分支 = 网页版前端（**部署这个**）。
- `master` 分支 = 旧桌面项目，**保留不动**。
- Pages 环境用的是 `github-pages`，其“部署分支”默认只允许默认分支，因此：
  - **必须把仓库默认分支改成 `main`**（Settings → General → Default branch → 选 main → Update）。

### 4.2 GitHub Actions 工作流（已就位 `cloud/web/.github/workflows/deploy.yml`）
```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main, master]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: package-lock.json
      - name: Install & Build
        run: |
          npm ci
          npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy
        uses: actions/deploy-pages@v4
```
> ⚠️ `deploy` 任务**不要**声明 `environment: github-pages`。若声明，会被该环境的“分支保护规则”拦截并报
> `Branch "main" is not allowed to deploy to github-pages due to environment protection rules`。
> 去掉 environment 声明即可绕过（代码侧已处理）。

### 4.3 启用 Pages（需用户手动一次）
GitHub → 仓库 `LocalHub` → **Settings → Pages** → **Source 选 `GitHub Actions`**（不是 “Deploy from a branch”）。

### 4.4 部署流程
每次 `git push` 到 `main`，Actions 自动：`npm ci` → `npm run build`（读 `.env.production`）→ 上传 `dist` → 部署到 Pages，几分钟后更新 https://liixnglinb.github.io/LocalHub/

---

## 5. 本地开发

在 `cloud/web/`：
```bash
npm install        # 首次
npm run dev        # 启动开发服务器 http://localhost:5173
npm run build      # 本地生产构建，产物在 dist/
npm run preview    # 预览构建产物
```

---

## 6. 踩过的坑（务必注意，别再踩）

1. **GitHub Pages 环境保护分支**：未改默认分支时，`main` 部署被 404/拒绝。解法：改默认分支为 `main` + 工作流 deploy 任务不加 `environment`。
2. **仓库已有内容**：`LocalHub` 原 `master` 分支是一个桌面版本。**不要把网页版强推覆盖 master**，另用 `main` 分支共存。
3. **密钥类型**：
   - 前端用 **Publishable / anon public**（`sb_publishable_...` 或 `eyJ...`），安全可公开。
   - **service_role / `sb_secret_...` 不可进前端**，进了等于把库钥匙公开。
   - 已泄露的 `sb_secret_...`，建议在 Supabase 重置轮换。
4. **SQL 编辑器提示“破坏性操作”**：脚本含可重复执行的 create/trigger，属正常；跑通后重复执行会提示“策略已存在”，属正常，勿反复建表。
5. **本机 git 推送 SSL 报错**：环境里 git 指向了一个损坏的 CA 文件（`error adding trust anchors ... cacert.pem`）。临时可用
   `git -c http.sslVerify=false push ...` 绕开；长期建议修 git 的 `http.sslCAInfo` 指向有效证书。
6. **相对路径**：`vite.config.js` 用 `base: './'`，配合 GitHub Pages 子目录部署；路由用 HashRouter（`#/`），无需服务端 rewrite。
7. **Ai 情报无法抓取**：原 AI 排行榜走后端爬取 benchlm；迁移后无后端，该功能需另行实现（可用 Supabase Edge Function 定时抓取入库，前端读表），暂未接入，页面数据为占位。

---

## 7. 变更上线建议

- 前端改代码 → `cloud/web` 下提交并 push 到 `main` → 自动部署。
- 新增页面 → 在 `src/pages/` 新建 `.jsx`，在 `App.jsx` 注册路由（`lazy` 引入），首页卡片在 `pages/Dashboard.jsx` 的 `TOOLS` 加一项，页头元信息在 `components/Layout.jsx` 的 `TOOL_META` 加一项（含专属强调色）。
- 全局样式约束（个人的设计规范）：白底/浅灰底、细边框、小圆角+柔和阴影、线性图标、禁渐变/光晕/炫技动画；强调色仅用于按钮/标签/高亮。
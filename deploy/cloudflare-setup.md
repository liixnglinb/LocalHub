# ============================================================
# LocalHub 云端 · Cloudflare 配置步骤（tools.lxlrwxs.top）
# 目标：域名未备案，通过 Cloudflare CDN 中转实现 HTTPS
# 前提：已有一个 Cloudflare 账号并已添加 lxlrwxs.top 主域
# ============================================================

## 1. DNS 设置
进入 Cloudflare 控制台 → 选择 lxlrwxs.top → DNS → Records → 添加：

  类型: A
  名称: tools
  内容: 47.96.39.156   （服务器公网 IP）
  代理状态: 开启（橙云，Proxied）   ← 必须开启，否则无 HTTPS
  TTL: Auto

## 2. SSL/TLS 模式
左侧 SSL/TLS → Overview → 模式选择 **Full**（不是 Full strict）

  - 原因：服务器 Nginx 只监听 80（HTTP），没有本地证书。
  - Full 模式：Cloudflare 负责浏览器侧 HTTPS，回源走 HTTP 到服务器 80。
  - 若服务器已有自签证书可试 Full (strict)，但当前方案用 Full 即可。

## 3. 回源协议
SSL/TLS → Edge Certificates → Always Use HTTPS 开启（可选但推荐）。
Cloudflare 回源到服务器 80 端口，Nginx 无需配置 443。

## 4. 缓存规则（重要，避免 /api 被缓存）
左侧 Caching → Cache Rules → Create rule：

  规则名: api-no-cache
  匹配条件: Hostname equals tools.lxlrwxs.top  AND  URI Path starts with /api
  缓存: Bypass cache（绕过缓存）
  浏览器 TTL: No Store

  原因：后端 API 不应被 CDN 缓存，否则登录/数据读写会拿到旧响应。

## 5. 安全建议
- 开启 Bot Fight Mode（Security → Bots）
- 限制 /api 仅 HTTPS：Cloudflare → Rules → 或 nginx 判断 X-Forwarded-Proto
- 定期轮换 Supabase 密码与 JWT_SECRET
- 服务器安全组只开放 80；3000 端口仅绑定 127.0.0.1，不暴露公网

## 验证
部署完成后访问：
  https://tools.lxlrwxs.top/            → 前端页
  https://tools.lxlrwxs.top/api/auth/init → 返回 {"initialized":...}
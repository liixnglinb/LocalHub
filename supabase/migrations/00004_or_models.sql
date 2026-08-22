-- ============================================================
-- LocalHub · OpenRouter 免费模型快照表 + RLS + 定时同步（每天两次）
-- 在 Supabase → SQL Editor 新建查询，整体执行一次即可。
-- 重复执行时表/策略已存在为正常，可忽略。
-- ============================================================

-- 1) 快照表：id 固定为 1，payload 存免费模型列表（含抓取时间）
create table if not exists public.or_models (
  id           int primary key check (id = 1),
  payload      jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now()
);

-- 2) 行级安全：匿名与登录用户都可读（公开数据）；写入只走 service_role（Edge Function 使用）
alter table public.or_models enable row level security;

drop policy if exists "or_models_read_anon" on public.or_models;
create policy "or_models_read_anon" on public.or_models
  for select using (true);

drop policy if exists "or_models_read_authed" on public.or_models;
create policy "or_models_read_authed" on public.or_models
  for select using (true);

-- 3) 授权：确保 Edge Function 的 service_role 能写，匿名可读
grant select on public.or_models to anon, authenticated;
grant all on public.or_models to service_role;

-- 4) 定时同步：每天 08:00 与 20:00 各抓取一次
--    前置：Database → Extensions 开启 pg_cron 与 pg_net。
--    <project-ref> 替换为项目引用（本仓库为 grutfwvthmrdhywwwlyw）。
--    函数以 --verify-jwt=false 部署，pg_cron 直接调用无需鉴权。
--    卸载任务：select cron.unschedule('or-sync-daily');
select cron.unschedule('or-sync-daily') where exists (
  select 1 from cron.job where jobname = 'or-sync-daily'
);

select cron.schedule (
  'or-sync-daily',
  '0 8,20 * * *',
  $$
  select net.http_post (
    url := 'https://grutfwvthmrdhywwwlyw.functions.supabase.co/openrouter-models?sync=1',
    headers := '{"content-type":"application/json"}'
  ) as request_id;
  $$
);
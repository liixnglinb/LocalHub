-- ============================================================
-- LocalHub · AI 排行榜数据表 + RLS + 定时同步
-- 在 Supabase → SQL Editor 里新建查询，整体执行一次即可。
-- 之后若重复执行（表/策略已存在），属正常，可忽略提示。
-- ============================================================

-- 1) 快照表：id 固定为 1，payload 存完整排行榜 JSON（VENDORS + LEADERBOARD + 静态配置）
create table if not exists public.lb_data (
  id           int primary key check (id = 1),
  payload      jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now()
);

-- 2) 行级安全：匿名与登录用户都可读（个人站点公开榜单）；写入只走 service_role（Edge Function 使用）
alter table public.lb_data enable row level security;

drop policy if exists "lb_data_read_anon" on public.lb_data;
create policy "lb_data_read_anon" on public.lb_data
  for select using (true);

drop policy if exists "lb_data_read_authed" on public.lb_data;
create policy "lb_data_read_authed" on public.lb_data
  for select using (true);

-- 3) 定时同步（每天 08:00 抓取一次 BenchLM）
--    前置：确保已启用扩展
--      Database → Extensions → 开启 pg_cron；pg_net 默认已启用，若没有也一起开启。
--    把下方 <project-ref> 替换为你的项目引用：本仓库为 grutfwvthmrdhywwwlyw
--    函数以 --verify-jwt=false 部署，因此无需鉴权头，pg_cron 可直接调用。
--    如需卸载任务：select cron.unschedule('lb-sync-daily');
select cron.unschedule('lb-sync-daily') where exists (
  select 1 from cron.job where jobname = 'lb-sync-daily'
);

select cron.schedule (
  'lb-sync-daily',
  '0 8 * * *',
  $$
  select net.http_post (
    url := 'https://grutfwvthmrdhywwwlyw.functions.supabase.co/leaderboard?sync=1',
    headers := '{"content-type":"application/json"}'
  ) as request_id;
  $$
);
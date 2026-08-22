/**
 * Supabase 客户端单例
 * 连接配置来自 supabase-config.js（公开配置，无需 .env，保证 CI 构建可用）。
 */
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from './supabase-config';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

export { isSupabaseConfigured };

/** 当前登录用户 id（未登录为 null） */
export const currentUserId = () => supabase.auth.getUser()
  .then(({ data }) => data?.user?.id || null)
  .catch(() => null);
/**
 * Supabase 客户端单例
 * 通过 .env 注入项目 URL 与 anon public key（均可公开，无风险）。
 *
 * 所需环境变量：
 *   VITE_SUPABASE_URL       项目 URL，如 https://grutfwvthmrdhywwwlyw.supabase.co
 *   VITE_SUPABASE_ANON_KEY  anon / public 的 apikey（eyJ... 开头），放在纯前端安全
 *
 * 注意：service_role 密钥绝不可放进这里，只能用于后端管理。
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

/** 是否已配置 Supabase（URL 和 anon key 都非空） */
export const isSupabaseConfigured = () => !!SUPABASE_URL && !!SUPABASE_ANON_KEY;

/** 当前登录用户 id（未登录为 null） */
export const currentUserId = () => supabase.auth.getUser()
  .then(({ data }) => data?.user?.id || null)
  .catch(() => null);
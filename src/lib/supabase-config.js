/**
 * Supabase 公开连接配置（URL + anon/publishable key 均为公开信息，可安全提交）
 *
 * 为什么用常量文件而不是 .env：
 *  本地构建依赖 .env，但 CI（GitHub Pages）不会自动注入该文件，
 *  导致线上 createClient('','') 报"网络连接失败"。
 *  这里直接写死公开配置，保证任何环境下构建都能正常连接。
 */
export const SUPABASE_URL = 'https://grutfwvthmrdhywwwlyw.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_JMtGctmzjWJMH-ikjQfn-w_3Feg3sCY';

/** 是否已配置（URL 和 key 都非空） */
export const isSupabaseConfigured = () => !!SUPABASE_URL && !!SUPABASE_ANON_KEY;
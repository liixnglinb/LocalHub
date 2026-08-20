/* ============================================================
   LocalHub 云端前端 · API 层（Supabase 登录版）
   数据读写走 Supabase user_data 表（按用户隔离，RLS 保证仅本人可见）。
   接口签名与原 electronAPI 保持一致，页面代码无需改动。
   ============================================================ */
import { supabase } from './lib/supabase';

// ============ 数据读写（saveData / loadData / deleteData） ============
async function requireUid() {
  const { data } = await supabase.auth.getSession();
  if (!data?.session?.user?.id) throw new Error('未登录');
  return data.session.user.id;
}

export async function saveData(key, value) {
  const uid = await requireUid();
  const { error } = await supabase
    .from('user_data')
    .upsert({ user_id: uid, key, value }, { onConflict: 'user_id,key' });
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function loadData(key) {
  const uid = await requireUid();
  const { data, error } = await supabase
    .from('user_data')
    .select('value')
    .eq('user_id', uid)
    .eq('key', key)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? data.value : null;
}

export async function deleteData(key) {
  const uid = await requireUid();
  const { error } = await supabase
    .from('user_data')
    .delete()
    .eq('user_id', uid)
    .eq('key', key);
  if (error) throw new Error(error.message);
  return { ok: true };
}

// ============ 外部链接（浏览器新标签打开） ============
export async function openExternal(url) {
  if (!url) return null;
  window.open(url, '_blank', 'noopener,noreferrer');
  return null;
}

// ============ 网站图标（第三方 favicon 服务，国内可达） ============
export async function fetchFavicon(url) {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    const domain = u.hostname;
    return { ok: true, data: `https://favicon.im/${domain}?larger=true` };
  } catch {
    return null;
  }
}

// ============ 系统信息（云端版本简化为浏览器信息） ============
export async function systemInfo() {
  const cpus = navigator.hardwareConcurrency || 4;
  const mem = (navigator && navigator.deviceMemory) || 8;
  return {
    electronVersion: 'web',
    cpus,
    freemem: mem * 1024 ** 3,
    platform: navigator.platform || 'web',
  };
}

// ============ 云端不可用能力（原 Electron 专属） ============
export async function detectFfmpeg() { return null; }
export async function getVideoWorkflowPath() { return null; }
export async function openFolderDialog() { return null; }
export async function openFilesDialog() { return null; }
export async function saveFileDialog() { return null; }

// ============ 思维导图 / 排行榜（浏览器直接访问独立前端文件） ============
export async function mindmapStart() { return { ready: true, port: -1, url: '/mindmap-app/' }; }
export async function mindmapStatus() { return { ready: true, port: -1, url: '/mindmap-app/' }; }
export async function leaderboardStart() { return { ready: true, port: -1, url: '/lb/' }; }
export async function leaderboardStatus() { return { ready: true, port: -1, url: '/lb/' }; }
export async function canvasStatus() { return { ready: true, port: -1, url: '/canvas' }; }

// 统一导出为 electronAPI 兼容对象，便于页面直接替换
export const electronAPI = {
  saveData, loadData, deleteData, openExternal, fetchFavicon,
  systemInfo, detectFfmpeg, getVideoWorkflowPath,
  openFolderDialog, openFilesDialog, saveFileDialog,
  mindmapStart, mindmapStatus, leaderboardStart, leaderboardStatus, canvasStatus,
};

export default electronAPI;
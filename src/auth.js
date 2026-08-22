/**
 * LocalHub 云端前端 · 鉴权模块（Supabase Auth 版）
 * 登录/注册/退出全部基于 Supabase Auth：
 *  - 邮箱 + 密码
 *  - 邮箱登录链接 / 验证码（signInWithOtp）
 *  - GitHub OAuth
 * 会话由 supabase-js 自动持久化到 localStorage。
 */
import { supabase } from './lib/supabase';

// ---------- 错误信息中文化 ----------
// Supabase 返回英文错误，这里统一映射成用户能看懂的中文。
const ERROR_ZH = [
  ['email not confirmed', '该邮箱尚未验证，请先查收邮件确认账号后再登录'],
  ['user already registered', '该邮箱已注册，请直接登录'],
  ['already registered', '该邮箱已注册，请直接登录'],
  ['invalid login credentials', '邮箱或密码错误'],
  ['invalid credentials', '邮箱或密码错误'],
  ['invalid email', '邮箱格式不正确，请检查后重试'],
  ['password should be at least', '密码至少需要 6 位'],
  ['at least 6 characters', '密码至少需要 6 位'],
  ['email rate limit exceeded', '验证码发送太频繁，请稍后再试'],
  ['for security purposes', '操作为了安全原因被限制，请稍后再试'],
  ['signups not allowed for this instance', '当前暂未开放注册'],
  ['token has expired or is invalid', '验证码已过期或无效，请重新获取'],
  ['otp has expired', '验证码已过期，请重新获取'],
  ['invalid otp', '验证码错误，请重新输入'],
  ['failed to fetch', '网络连接失败，请检查网络后重试'],
  ['network error', '网络连接失败，请检查网络后重试'],
  ['auth session missing', '登录会话已失效，请重新登录'],
  ['new password should be different', '新密码不能与旧密码相同'],
  ['username already taken', '该昵称已被使用'],
  ['profile not found', '账号信息不存在'],
];

/** 把 Supabase 错误转成中文提示；无法识别的错误也给出友好中文兜底 */
export function authErrorMessage(error) {
  const msg = (error && (error.message || error.context || error)) || '';
  const lower = String(msg).toLowerCase();
  for (const [en, zh] of ERROR_ZH) {
    if (lower.includes(en)) return zh;
  }
  // 兜底：无法映射时也不直接展示英文，而是提示联系客服/重试
  if (!msg) return '操作失败，请稍后再试';
  return /[\u4e00-\u9fa5]/.test(msg) ? msg : '操作失败，请稍后再试';
}

// ---------- 会话 / 状态 ----------
export function getSession() {
  return supabase.auth.getSession();
}

export function onAuthStateChange(cb) {
  return supabase.auth.onAuthStateChange((_event, session) => cb(session));
}

export function getToken() {
  const { data } = supabase.auth.getSession();
  return data?.session?.access_token || null;
}

/** 把 Supabase 用户映射为与旧版一致的 {email, displayName, avatarUrl, id} */
function mapUser(u) {
  if (!u) return null;
  const meta = u.user_metadata || {};
  const identities = u.identities || [];
  const gh = identities.find((i) => i.provider === 'github');
  const avatar = gh?.identity_data?.avatar_url || meta.avatar_url || null;
  const name = meta.name || gh?.identity_data?.name || (u.email ? u.email.split('@')[0] : '用户');
  return { id: u.id, email: u.email || '', displayName: name, avatarUrl: avatar };
}

export function getUser() {
  const { data } = supabase.auth.getSession();
  return mapUser(data?.session?.user || null);
}

export async function isLoggedIn() {
  const { data } = await supabase.auth.getSession();
  return !!data.session;
}

// ---------- 邮箱密码 ----------
export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(authErrorMessage(error));
  return { user: mapUser(data.user) };
}

export async function register(email, password) {
  // 邮箱密码注册：发送确认邮件后自动登录（若项目未开启邮箱确认则直接登录）
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw new Error(authErrorMessage(error));
  return { user: mapUser(data.user) };
}

export async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + window.location.pathname,
  });
  if (error) throw new Error(authErrorMessage(error));
  return { ok: true };
}

// ---------- 邮箱登录链接 / 验证码 ----------
export async function sendCode(email) {
  // 发送 6 位验证码（需在 Supabase Auth 设置中开启 OTP 邮件；也可关闭后自动退化为登录链接）
  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) throw new Error(authErrorMessage(error));
  return { ok: true };
}

export async function loginWithCode(email, code) {
  // 用收到的验证码登录（OTP）
  const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
  if (error) throw new Error(authErrorMessage(error));
  return { user: mapUser(data.user) };
}

// ---------- GitHub OAuth ----------
export async function signInWithGitHub() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo: window.location.origin + window.location.pathname },
  });
  if (error) throw new Error(authErrorMessage(error));
}

// ---------- 更新资料 / 密码 ----------
export async function updateProfile(meta) {
  // meta: { name?, avatar_url? }
  const { data, error } = await supabase.auth.updateUser({ data: meta });
  if (error) throw new Error(authErrorMessage(error));
  return { user: mapUser(data.user) };
}

export async function changePassword(newPassword) {
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(authErrorMessage(error));
  return { user: mapUser(data.user) };
}

// ---------- 退出 / 清理 ----------
export async function logout() {
  await supabase.auth.signOut();
}

export function clearToken() { logout(); }

// ---------- 状态检查（兼容旧调用） ----------
export async function checkInit() { return { initialized: true, githubEnabled: true }; }

export async function fetchMe() { return getUser(); }

export async function completeGitHubLogin() {
  const { data } = await supabase.auth.getSession();
  return data?.session ? true : false;
}

/** 供 AuthGate 使用的便捷回调 */
export function subscribeAuth(cb) {
  return onAuthStateChange((session) => cb(session ? mapUser(session.user) : null));
}

export default {
  getSession, onAuthStateChange, getToken, getUser, isLoggedIn,
  login, register, resetPassword, sendCode, loginWithCode,
  signInWithGitHub, logout, clearToken, checkInit, fetchMe,
  updateProfile, changePassword,
  completeGitHubLogin, subscribeAuth, authErrorMessage,
};
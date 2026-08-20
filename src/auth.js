/**
 * LocalHub 云端前端 · 鉴权模块（Supabase Auth 版）
 * 登录/注册/退出全部基于 Supabase Auth：
 *  - 邮箱 + 密码
 *  - 邮箱登录链接 / 验证码（signInWithOtp）
 *  - GitHub OAuth
 * 会话由 supabase-js 自动持久化到 localStorage。
 */
import { supabase } from './lib/supabase';

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
  if (error) {
    throw new Error(error.message === 'Invalid login credentials' ? '邮箱或密码错误' : error.message);
  }
  return { user: mapUser(data.user) };
}

export async function register(email, password) {
  // 邮箱密码注册：发送确认邮件后自动登录（若项目未开启邮箱确认则直接登录）
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw new Error(error.message);
  return { user: mapUser(data.user) };
}

export async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + window.location.pathname,
  });
  if (error) throw new Error(error.message);
  return { ok: true };
}

// ---------- 邮箱登录链接 / 验证码 ----------
export async function sendCode(email) {
  // 发送 6 位验证码（需在 Supabase Auth 设置中开启 OTP 邮件；也可关闭后自动退化为登录链接）
  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function loginWithCode(email, code) {
  // 用收到的验证码登录（OTP）
  const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
  if (error) throw new Error(error.message);
  return { user: mapUser(data.user) };
}

// ---------- GitHub OAuth ----------
export async function signInWithGitHub() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo: window.location.origin + window.location.pathname },
  });
  if (error) throw new Error(error.message);
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
  completeGitHubLogin, subscribeAuth,
};
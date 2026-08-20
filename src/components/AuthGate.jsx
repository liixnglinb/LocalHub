import React, { useState, useEffect } from 'react';
import {
  subscribeAuth, getSession, login, register, resetPassword,
  sendCode, loginWithCode, signInWithGitHub, logout,
} from '../auth';
import {
  Mail, Lock, ArrowRight, ShieldCheck, Github, UserRound,
  Eye, EyeOff, Link2,
} from 'lucide-react';

/** LocalHub 登录门控（Supabase Auth 版）：极简白色居中登录卡
 *  登录方式：邮箱密码 / 邮箱登录链接 / GitHub。
 *  配合 Supabase「关闭公开注册」，仅已存在的账号可登录。
 */

export default function AuthGate({ children }) {
  const [authed, setAuthed] = useState(false);
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('password'); // 'password' | 'link'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [showPw, setShowPw] = useState(false);
  const [mode, setMode] = useState('login'); // 'login' | 'register'

  useEffect(() => {
    getSession().then(({ data }) => {
      if (data?.session?.user) { setUser(mapLocal(data.session.user)); setAuthed(true); }
    });
    const unsub = subscribeAuth((u) => {
      setUser(u);
      setAuthed(!!u);
      if (!u) { setEmail(''); setPassword(''); setConfirm(''); setErr(''); }
    });
    return () => { if (unsub && unsub.data) unsub.data.subscription.unsubscribe(); };
  }, []);

  function mapLocal(u) {
    return {
      id: u.id, email: u.email || '',
      displayName: u.user_metadata?.name || u.email?.split('@')[0] || '用户',
      avatarUrl: u.user_metadata?.avatar_url || null,
    };
  }

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const validateEmail = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErr('请先输入正确的邮箱'); return false; }
    return true;
  };

  const doSendLink = async () => {
    setErr(''); setMsg('');
    if (!validateEmail()) return;
    setSending(true);
    try {
      await sendCode(email);
      setMsg('登录链接已发送到邮箱，请查收并点击链接登录');
      setCountdown(60);
    } catch (ex) { setErr(ex.message || '发送失败'); }
    finally { setSending(false); }
  };

  const doSubmit = async (e) => {
    e.preventDefault();
    setErr(''); setMsg('');
    if (mode === 'register') {
      if (!validateEmail()) return;
      if (password.length < 6) { setErr('密码至少 6 位'); return; }
      if (password !== confirm) { setErr('两次输入的密码不一致'); return; }
      setBusy(true);
      try {
        const data = await register(email, password);
        if (data.user) { setAuthed(true); setUser(data.user); }
        else { setMsg('注册成功，请查看邮箱完成确认后登录'); }
      } catch (ex) { setErr(ex.message || '注册失败'); }
      finally { setBusy(false); }
      return;
    }
    if (!validateEmail()) return;
    if (tab === 'password') {
      if (!password) { setErr('请输入密码'); return; }
      setBusy(true);
      try { await login(email, password); }
      catch (ex) { setErr(ex.message || '登录失败'); }
      finally { setBusy(false); }
    } else {
      await doSendLink();
    }
  };

  const handleForget = async () => {
    setErr(''); setMsg('');
    if (!validateEmail()) return;
    setBusy(true);
    try { await resetPassword(email); setMsg('重置密码邮件已发送，请查收'); }
    catch (ex) { setErr(ex.message || '发送失败'); }
    finally { setBusy(false); }
  };

  const handleGitHub = async () => {
    setErr('');
    try { await signInWithGitHub(); }
    catch (ex) { setErr(ex.message || 'GitHub 登录失败'); }
  };

  const handleLogout = async () => {
    await logout();
    setAuthed(false); setUser(null);
  };

  const switchTab = (t) => { setTab(t); setErr(''); setMsg(''); setShowPw(false); };
  const switchMode = (m) => { setMode(m); setErr(''); setMsg(''); setShowPw(false); };

  if (!authed) {
    return (
      <div className="min-root">
        <style>{`
          *, *::before, *::after { box-sizing: border-box; }
          .min-root {
            min-height: 100vh; width: 100%;
            display: flex; align-items: center; justify-content: center;
            padding: 24px; background: #FFFFFF;
            font-family: Inter, "SF Pro Display", "PingFang SC", system-ui, -apple-system, sans-serif;
          }
          .min-card { width: 100%; max-width: 400px; display: flex; flex-direction: column; align-items: center; text-align: center; }
          .min-brand { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; }
          .min-brand-ico { width: 40px; height: 40px; border-radius: 11px; background: #111113; color: #FFFFFF; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 18px -6px rgba(17,17,19,0.35); }
          .min-brand-txt { font: 800 19px/1 Inter, system-ui, sans-serif; color: #111113; letter-spacing: -.02em; }
          .min-title { margin: 0; font: 700 25px/1.2 Inter, "SF Pro Display", system-ui, sans-serif; color: #111113; letter-spacing: -.02em; }
          .min-sub { margin: 8px 0 0; font: 500 14px/1.5 Inter, system-ui, sans-serif; color: #9CA1AB; }
          .min-tabs { display: flex; gap: 4px; width: 100%; margin: 28px 0 22px; padding: 4px; border-radius: 12px; background: #F4F4F5; border: 1px solid #ECECEF; }
          .min-tab { flex: 1; appearance: none; border: none; cursor: pointer; padding: 10px 0; border-radius: 9px; background: transparent; color: #9CA1AB; font: 600 13px/1 Inter, "PingFang SC", system-ui, sans-serif; transition: all .3s ease; }
          .min-tab.on { background: #FFFFFF; color: #111113; box-shadow: 0 2px 8px -2px rgba(17,17,19,0.12); }
          .min-form { width: 100%; display: flex; flex-direction: column; gap: 16px; text-align: left; }
          .min-field { display: flex; flex-direction: column; gap: 7px; }
          .min-label-row { display: flex; justify-content: space-between; align-items: center; }
          .min-label { font: 600 12.5px/1 Inter, "PingFang SC", system-ui, sans-serif; color: #52525B; }
          .min-forget { appearance: none; border: none; background: none; padding: 0; cursor: pointer; font: 600 12px/1 Inter, system-ui, sans-serif; color: #7C5CFF; transition: color .3s ease; }
          .min-forget:hover { color: #5b3ff0; }
          .min-input-wrap { position: relative; display: flex; align-items: center; }
          .min-input-ico { position: absolute; left: 14px; z-index: 1; color: #A1A1AA; transition: color .3s ease; }
          .min-input-wrap:focus-within .min-input-ico { color: #7C5CFF; }
          .min-input { width: 100%; height: 48px; padding: 0 44px; border-radius: 11px; border: 1.5px solid #E4E4E7; background: #FCFCFD; color: #111113; font: 500 14.5px/1 Inter, "PingFang SC", system-ui, sans-serif; outline: none; transition: all .3s ease; box-sizing: border-box; }
          .min-input:hover { border-color: #D4D4D8; }
          .min-input:focus { border-color: #7C5CFF; box-shadow: 0 0 0 3px rgba(124,92,255,0.14); background: #FFFFFF; }
          .min-input::placeholder { color: #B8BCC4; }
          .min-toggle-pw { position: absolute; right: 10px; z-index: 2; width: 28px; height: 28px; border-radius: 8px; border: none; background: transparent; color: #A1A1AA; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
          .min-toggle-pw:hover { background: #F4F4F5; color: #111113; }
          .min-send-link { width: 100%; height: 46px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; border-radius: 11px; border: 1.5px solid #E4E4E7; background: #FFFFFF; color: #111113; font: 700 14px/1 Inter, "PingFang SC", system-ui, sans-serif; cursor: pointer; transition: all .3s ease; }
          .min-send-link:hover:not(:disabled) { border-color: #7C5CFF; color: #7C5CFF; }
          .min-send-link:disabled { opacity: .5; cursor: not-allowed; }
          .min-code-msg { font-size: 12px; color: #10B981; font-weight: 600; }
          .min-error { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 11px; background: #FEF2F2; border: 1px solid #FECACA; color: #DC2626; font: 600 12.5px/1.4 Inter, "PingFang SC", system-ui, sans-serif; }
          .min-submit { position: relative; width: 100%; height: 48px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 0 22px; border: none; cursor: pointer; border-radius: 11px; color: #FFFFFF; font: 700 14.5px/1 Inter, "PingFang SC", system-ui, sans-serif; background: #111113; transition: all .3s ease; }
          .min-submit:hover:not(:disabled) { background: #7C5CFF; }
          .min-submit:disabled { opacity: .5; cursor: not-allowed; }
          .min-submit .min-spinner { width: 16px; height: 16px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.35); border-top-color: #FFFFFF; animation: minspin .7s linear infinite; }
          @keyframes minspin { to { transform: rotate(360deg); } }
          .min-divider { display: flex; align-items: center; gap: 12px; color: #A1A1AA; font-size: 11.5px; font-weight: 600; letter-spacing: .04em; margin-top: 4px; }
          .min-divider::before, .min-divider::after { content: ''; flex: 1; height: 1px; background: #ECECEF; }
          .min-github { width: 100%; height: 46px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; border-radius: 11px; border: 1.5px solid #E4E4E7; background: #FFFFFF; color: #111113; font: 700 14px/1 Inter, "PingFang SC", system-ui, sans-serif; cursor: pointer; transition: all .3s ease; }
          .min-github:hover { border-color: #111113; background: #FAFAFA; transform: translateY(-1px); }
          .min-switch { margin-top: 16px; appearance: none; border: none; background: none; padding: 6px 10px; cursor: pointer; font: 600 13px/1 Inter, "PingFang SC", system-ui, sans-serif; color: #7C5CFF; transition: color .3s ease; }
          .min-switch:hover { color: #5b3ff0; text-decoration: underline; }
        `}</style>

        <div className="min-card">
          <div className="min-brand">
            <div className="min-brand-ico"><UserRound size={19} strokeWidth={2} /></div>
            <div className="min-brand-txt">LocalHub</div>
          </div>
          <h2 className="min-title">欢迎登录</h2>
          <p className="min-sub">登录后可同步你的全部个人工具数据</p>

          <div className="min-tabs">
            <button type="button" className={'min-tab ' + (tab === 'password' ? 'on' : '')} onClick={() => switchTab('password')}>邮箱密码</button>
            <button type="button" className={'min-tab ' + (tab === 'link' ? 'on' : '')} onClick={() => switchTab('link')}>邮箱登录链接</button>
          </div>

          <form onSubmit={doSubmit} className="min-form">
            <div className="min-field">
              <label className="min-label">邮箱地址</label>
              <div className="min-input-wrap">
                <Mail className="min-input-ico" size={16} strokeWidth={1.8} />
                <input type="email" value={email} autoComplete="email" onChange={(e) => { setEmail(e.target.value); if (err) setErr(''); }} placeholder="you@example.com" className="min-input" autoFocus />
              </div>
            </div>

            {tab === 'password' ? (
              <div className="min-field">
                <div className="min-label-row">
                  <label className="min-label">密码</label>
                  <button type="button" className="min-forget" onClick={handleForget}>忘记密码？</button>
                </div>
                <div className="min-input-wrap">
                  <Lock className="min-input-ico" size={16} strokeWidth={1.8} />
                  <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => { setPassword(e.target.value); if (err) setErr(''); }} placeholder="请输入密码" className="min-input" autoComplete="current-password" />
                  <button type="button" className="min-toggle-pw" onClick={() => setShowPw((v) => !v)} tabIndex={-1} aria-label={showPw ? '隐藏密码' : '显示密码'}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            ) : (
              <div className="min-field">
                <label className="min-label">登录方式</label>
                <div className="min-input-wrap" style={{ color: '#52525B', fontSize: 13, lineHeight: 1.5, paddingLeft: 2 }}>
                  <Link2 size={15} style={{ marginRight: 6, verticalAlign: -2 }} color="#7C5CFF" />
                  输入邮箱后，我们会发送一条安全登录链接到您的收件箱
                </div>
              </div>
            )}

            {err && <div className="min-error"><ShieldCheck size={14} strokeWidth={1.8} /><span>{err}</span></div>}
            {msg && <span className="min-code-msg">{msg}</span>}

            {tab === 'password' ? (
              <button type="submit" disabled={busy || !email || !password} className="min-submit">
                {busy ? (<><span className="min-spinner" /><span>登录中…</span></>) : (<><span>登录</span><ArrowRight size={17} strokeWidth={2.2} /></>)}
              </button>
            ) : (
              <button type="submit" disabled={sending || countdown > 0 || !email} className="min-send-link">
                <Link2 size={16} strokeWidth={2} />
                {sending ? '发送中…' : countdown > 0 ? `${countdown}s 后可重发` : '发送登录链接'}
              </button>
            )}

            <div className="min-divider"><span>或使用第三方登录</span></div>
            <button type="button" className="min-github" onClick={handleGitHub}>
              <Github size={18} strokeWidth={1.9} /><span>使用 GitHub 登录</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return children({ onLogout: handleLogout, user });
}
import React, { useState, useEffect } from 'react';
import {
  subscribeAuth, getSession, login, register, resetPassword,
  sendCode, loginWithCode, signInWithGitHub, logout,
} from '../auth';
import {
  Mail, Lock, ShieldCheck, Github, Eye, EyeOff, KeyRound,
  UserPlus, LogIn, Sparkles,
} from 'lucide-react';

export default function AuthGate({ children }) {
  const [authed, setAuthed] = useState(false);
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState('login');       // 'login' | 'register'
  const [tab, setTab] = useState('password');       // 'password' | 'otp'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [otp, setOtp] = useState('');
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showPw, setShowPw] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const [pwStrength, setPwStrength] = useState(0);

  useEffect(() => {
    getSession().then(({ data }) => {
      if (data?.session?.user) { setUser(mapLocal(data.session.user)); setAuthed(true); }
    });
    const unsub = subscribeAuth((u) => {
      setUser(u);
      setAuthed(!!u);
      if (!u) { setEmail(''); setPassword(''); setConfirm(''); setOtp(''); setErr(''); }
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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErr('请输入正确的邮箱地址'); return false; }
    return true;
  };

  const doSendOtp = async () => {
    setErr(''); setMsg('');
    if (!validateEmail()) return;
    setSending(true);
    try {
      await sendCode(email);
      setMsg('验证码已发送到邮箱，请查收');
      setCountdown(60);
    } catch (ex) { setErr(ex.message || '发送失败，请稍后再试'); }
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
      } catch (ex) { setErr(regErrText(ex)); }
      finally { setBusy(false); }
      return;
    }

    if (tab === 'password') {
      if (!validateEmail()) return;
      if (!password) { setErr('请输入密码'); return; }
      setBusy(true);
      try { await login(email, password); }
      catch (ex) { setErr(ex.message || '登录失败'); }
      finally { setBusy(false); }
    } else {
      if (!validateEmail()) return;
      if (otp.length < 6) { setErr('请输入 6 位验证码'); return; }
      setBusy(true);
      try { await loginWithCode(email, otp); }
      catch (ex) { setErr(ex.message || '验证码错误或已过期'); }
      finally { setBusy(false); }
    }
  };

  const regErrText = (ex) => {
    const m = ex.message || '';
    if (/already registered|已注册|exists/i.test(m)) return '该邮箱已注册，请直接登录';
    if (/password/i.test(m)) return '密码强度不足，请使用至少 6 位字符';
    return m;
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

  const switchMode = (m) => { setMode(m); setErr(''); setMsg(''); setShowPw(false); setOtp(''); };
  const switchTab = (t) => { setTab(t); setErr(''); setMsg(''); setShowPw(false); };

  const chgPw = (v) => {
    setPassword(v); if (err) setErr('');
    let s = 0;
    if (v.length >= 6) s++;
    if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++;
    if (/\d/.test(v)) s++;
    if (/[^A-Za-z0-9]/.test(v)) s++;
    setPwStrength(v ? s : 0);
  };

  if (!authed) {
    return (
      <div className="lg-root">
        <style>{`
          *, *::before, *::after { box-sizing: border-box; }
          .lg-root {
            min-height: 100vh; width: 100%;
            display: flex; align-items: center; justify-content: center;
            padding: 24px;
            background: #FAFAFB;
            font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Segoe UI", system-ui, sans-serif;
            -webkit-font-smoothing: antialiased;
          }
          .lg-card {
            width: 100%; max-width: 400px;
            background: #FFFFFF;
            border: 1px solid rgba(20, 24, 33, 0.08);
            border-radius: 20px;
            box-shadow: 0 1px 2px rgba(16, 20, 30, 0.04), 0 24px 48px -24px rgba(16, 20, 30, 0.18);
            padding: 36px 32px 28px;
            animation: lgUp 0.26s cubic-bezier(0.2, 0.7, 0.2, 1) both;
          }
          @keyframes lgUp { 0% { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

          .lg-brand { display: flex; align-items: center; gap: 10px; margin-bottom: 26px; }
          .lg-brand-ico {
            width: 34px; height: 34px; border-radius: 9px;
            background: linear-gradient(135deg, #7C5CFF, #5A3DF0);
            color: #FFFFFF; display: flex; align-items: center; justify-content: center;
            box-shadow: 0 4px 12px -6px rgba(124, 92, 255, 0.7);
            flex-shrink: 0;
          }
          .lg-brand-txt { font-weight: 700; font-size: 18px; color: #1A1D24; letter-spacing: -0.01em; }

          .lg-tabs { display: flex; gap: 2px; width: 100%; margin: 22px 0 22px; padding: 3px; border-radius: 11px; background: #F1F2F5; }
          .lg-tab { flex: 1; appearance: none; border: none; cursor: pointer; padding: 8px 0; border-radius: 8px; background: transparent; color: #8A8F99; font: 600 12.5px/1 "PingFang SC", system-ui, sans-serif; transition: all .18s ease; }
          .lg-tab.lg-on { background: #FFFFFF; color: #212529; box-shadow: 0 1px 3px rgba(16, 20, 30, .12); }

          .lg-form { width: 100%; display: flex; flex-direction: column; gap: 16px; }
          .lg-field { display: flex; flex-direction: column; gap: 7px; }
          .lg-label-row { display: flex; justify-content: space-between; align-items: center; }
          .lg-label { font: 600 12.5px/1 "PingFang SC", system-ui, sans-serif; color: #4A4E57; }
          .lg-link { appearance: none; border: none; background: none; padding: 0; cursor: pointer; font: 600 12px/1 "PingFang SC", system-ui, sans-serif; color: #6A4BFF; transition: color .18s ease; }
          .lg-link:hover { color: #5A3DF0; }
          .lg-input-wrap { position: relative; display: flex; align-items: center; }
          .lg-ico { position: absolute; left: 13px; z-index: 1; color: #A6ABB4; transition: color .18s ease; pointer-events: none; }
          .lg-input-wrap:focus-within .lg-ico { color: #7C5CFF; }
          .lg-input {
            width: 100%; height: 44px; padding: 0 40px; margin: 0;
            border-radius: 10px; border: 1px solid rgba(20, 24, 33, 0.12);
            background: #FFFFFF; color: #1A1D24;
            font: 500 14px/1 "PingFang SC", system-ui, sans-serif; outline: none;
            transition: all .18s ease;
          }
          .lg-input:hover { border-color: rgba(20, 24, 33, 0.22); }
          .lg-input:focus { border-color: rgba(124, 92, 255, 0.55); box-shadow: 0 0 0 3px rgba(124, 92, 255, 0.12); }
          .lg-input::placeholder { color: #B4B8C0; }
          .lg-otp-input { padding: 0 13px; letter-spacing: .35em; font-variant-numeric: tabular-nums; font-weight: 600; text-align: center; }
          .lg-toggle-pw { position: absolute; right: 8px; z-index: 2; width: 30px; height: 30px; border-radius: 8px; border: none; background: transparent; color: #A6ABB4; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
          .lg-toggle-pw:hover { background: #F1F2F5; color: #1A1D24; }
          .lg-caps { position: absolute; right: 44px; z-index: 2; color: #F59E0B; display: inline-flex; }
          .lg-send { height: 44px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 0 16px; border-radius: 10px; border: 1px solid rgba(20, 24, 33, 0.12); background: #FFFFFF; color: #1A1D24; font: 700 13px/1 "PingFang SC", system-ui, sans-serif; cursor: pointer; transition: all .18s ease; }
          .lg-send:hover:not(:disabled) { border-color: #7C5CFF; color: #7C5CFF; }
          .lg-send:disabled { opacity: .5; cursor: not-allowed; }
          .lg-otp-row { display: flex; gap: 10px; align-items: center; }
          .lg-otp-row .lg-input-wrap { flex: 1; }
          .lg-strength { height: 3px; border-radius: 999px; background: #F1F2F5; overflow: hidden; margin-top: 2px; }
          .lg-strength i { display: block; height: 100%; border-radius: 999px; transition: width .2s ease, background .2s ease; }
          .lg-msg { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 10px; background: #EFFAF4; border: 1px solid #C6F0DA; color: #16A34A; font: 600 12.5px/1.4 "PingFang SC", system-ui, sans-serif; }
          .lg-error { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 10px; background: #FDF1F1; border: 1px solid #FBC6C6; color: #DC2626; font: 600 12.5px/1.4 "PingFang SC", system-ui, sans-serif; }
          .lg-submit { position: relative; width: 100%; height: 46px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 0 22px; border: none; cursor: pointer; border-radius: 10px; color: #FFFFFF; font: 700 14px/1 "PingFang SC", system-ui, sans-serif; background: #1A1D24; transition: all .18s ease; }
          .lg-submit:hover:not(:disabled) { background: #2A2E38; }
          .lg-submit:active:not(:disabled) { background: #111318; }
          .lg-submit:disabled { opacity: .45; cursor: not-allowed; }
          .lg-spinner { width: 16px; height: 16px; border-radius: 50%; border: 2px solid rgba(255,255,255,.3); border-top-color: #FFFFFF; animation: lgspin .7s linear infinite; }
          @keyframes lgspin { to { transform: rotate(360deg); } }
          .lg-row { display: flex; align-items: center; justify-content: space-between; }
          .lg-check { display: inline-flex; align-items: center; gap: 7px; cursor: pointer; font-size: 12.5px; color: #4A4E57; font-weight: 500; }
          .lg-check input { width: 15px; height: 15px; accent-color: #7C5CFF; margin: 0; cursor: pointer; }
          .lg-divider { display: flex; align-items: center; gap: 12px; color: #B4B8C0; font-size: 11.5px; font-weight: 600; letter-spacing: .04em; margin: 2px 0; }
          .lg-divider::before, .lg-divider::after { content: ''; flex: 1; height: 1px; background: #ECEEF2; }
          .lg-github { width: 100%; height: 44px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; border-radius: 10px; border: 1px solid rgba(20, 24, 33, 0.14); background: #FFFFFF; color: #1A1D24; font: 700 13.5px/1 "PingFang SC", system-ui, sans-serif; cursor: pointer; transition: all .18s ease; }
          .lg-github:hover { background: #F7F8FA; border-color: rgba(20, 24, 33, 0.24); }
          .lg-switch { margin-top: 18px; appearance: none; border: none; background: none; padding: 6px 10px; cursor: pointer; font: 600 13px/1 "PingFang SC", system-ui, sans-serif; color: #6A4BFF; transition: color .18s ease; }
          .lg-switch:hover { color: #5A3DF0; text-decoration: underline; }
        `}</style>

        <div className="lg-card">
          <div className="lg-brand">
            <div className="lg-brand-ico"><Sparkles size={17} strokeWidth={1.9} /></div>
            <div className="lg-brand-txt">LocalHub</div>
          </div>

          {mode === 'login' ? (
            <h2 style={{ margin: 0, fontWeight: 700, fontSize: 22, color: '#1A1D24', letterSpacing: '-0.02em' }}>欢迎回来</h2>
          ) : (
            <h2 style={{ margin: 0, fontWeight: 700, fontSize: 22, color: '#1A1D24', letterSpacing: '-0.02em' }}>创建账号</h2>
          )}
          <p style={{ margin: '8px 0 0', fontWeight: 500, fontSize: 13, color: '#8A8F99' }}>
            {mode === 'login' ? '登录后同步你的全部个人工具数据' : '注册一个账号，数据随账号在云端保存'}
          </p>

          {mode === 'login' && (
            <div className="lg-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={tab === 'password'} className={'lg-tab ' + (tab === 'password' ? 'lg-on' : '')} onClick={() => switchTab('password')}>邮箱密码</button>
              <button type="button" role="tab" aria-selected={tab === 'otp'} className={'lg-tab ' + (tab === 'otp' ? 'lg-on' : '')} onClick={() => switchTab('otp')}>验证码登录</button>
            </div>
          )}

          <form onSubmit={doSubmit} className="lg-form">
            <div className="lg-field">
              <label className="lg-label">邮箱地址</label>
              <div className="lg-input-wrap">
                <Mail className="lg-ico" size={16} strokeWidth={1.8} />
                <input type="email" value={email} autoComplete="email" onChange={(e) => { setEmail(e.target.value); if (err) setErr(''); }} placeholder="you@example.com" className="lg-input" autoFocus />
              </div>
            </div>

            {mode === 'register' ? (<>
              <div className="lg-field">
                <label className="lg-label">密码</label>
                <div className="lg-input-wrap">
                  <Lock className="lg-ico" size={16} strokeWidth={1.8} />
                  <input type={showPw ? 'text' : 'password'} value={password} autoComplete="new-password" onChange={(e) => { chgPw(e.target.value); }} onKeyUp={(e) => setCapsOn(e.getModifierState && e.getModifierState('CapsLock'))} onKeyDown={(e) => setCapsOn(e.getModifierState && e.getModifierState('CapsLock'))} onBlur={() => setCapsOn(false)} placeholder="至少 6 位" className="lg-input" />
                  {capsOn && <span className="lg-caps"><KeyRound size={15} /></span>}
                  <button type="button" className="lg-toggle-pw" onClick={() => setShowPw((v) => !v)} tabIndex={-1} aria-label={showPw ? '隐藏密码' : '显示密码'}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {password && <div className="lg-strength"><i style={{ width: (pwStrength / 4) * 100 + '%', background: pwStrength <= 1 ? '#EF4444' : pwStrength === 2 ? '#F59E0B' : pwStrength === 3 ? '#16A34A' : '#22C55E' }} /></div>}
              </div>
              <div className="lg-field">
                <label className="lg-label">确认密码</label>
                <div className="lg-input-wrap">
                  <Lock className="lg-ico" size={16} strokeWidth={1.8} />
                  <input type={showPw ? 'text' : 'password'} value={confirm} autoComplete="new-password" onChange={(e) => { setConfirm(e.target.value); if (err) setErr(''); }} placeholder="再次输入密码" className="lg-input" />
                  <button type="button" className="lg-toggle-pw" onClick={() => setShowPw((v) => !v)} tabIndex={-1} aria-label={showPw ? '隐藏密码' : '显示密码'}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </>) : tab === 'password' ? (<>
              <div className="lg-field">
                <div className="lg-label-row">
                  <label className="lg-label">密码</label>
                  <button type="button" className="lg-link" onClick={handleForget}>忘记密码？</button>
                </div>
                <div className="lg-input-wrap">
                  <Lock className="lg-ico" size={16} strokeWidth={1.8} />
                  <input type={showPw ? 'text' : 'password'} value={password} autoComplete="current-password" onChange={(e) => { setPassword(e.target.value); if (err) setErr(''); }} onKeyUp={(e) => setCapsOn(e.getModifierState && e.getModifierState('CapsLock'))} onKeyDown={(e) => setCapsOn(e.getModifierState && e.getModifierState('CapsLock'))} onBlur={() => setCapsOn(false)} placeholder="请输入密码" className="lg-input" />
                  {capsOn && <span className="lg-caps"><KeyRound size={15} /></span>}
                  <button type="button" className="lg-toggle-pw" onClick={() => setShowPw((v) => !v)} tabIndex={-1} aria-label={showPw ? '隐藏密码' : '显示密码'}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </>) : (<>
              <div className="lg-field">
                <label className="lg-label">登录方式</label>
                <div className="lg-otp-row">
                  <div className="lg-input-wrap">
                    <Mail className="lg-ico" size={16} strokeWidth={1.8} />
                    <input type="text" inputMode="numeric" maxLength={6} value={otp} autoComplete="one-time-code" onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '')); if (err) setErr(''); }} placeholder="邮箱中的 6 位验证码" className="lg-input lg-otp-input" />
                  </div>
                  <button type="button" className="lg-send" style={{ flexShrink: 0 }} disabled={sending || countdown > 0} onClick={doSendOtp}>
                    {sending ? '发送中…' : countdown > 0 ? `${countdown}s` : '发送'}
                  </button>
                </div>
              </div>
            </>)}

            {err && <div className="lg-error"><ShieldCheck size={14} strokeWidth={1.8} /><span>{err}</span></div>}
            {msg && <div className="lg-msg"><ShieldCheck size={14} strokeWidth={1.8} /><span>{msg}</span></div>}

            {mode === 'register' ? (
              <button type="submit" disabled={busy || !email || !password || !confirm} className="lg-submit">
                {busy ? (<><span className="lg-spinner" /><span>注册中…</span></>) : (<><UserPlus size={16} strokeWidth={2} /><span>创建账号</span></>)}
              </button>
            ) : tab === 'password' ? (<>
              <div className="lg-row">
                <label className="lg-check"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /><span>记住我</span></label>
              </div>
              <button type="submit" disabled={busy || !email || !password} className="lg-submit">
                {busy ? (<><span className="lg-spinner" /><span>登录中…</span></>) : (<><LogIn size={16} strokeWidth={2} /><span>登录</span></>)}
              </button>
            </>) : (
              <button type="submit" disabled={busy || otp.length < 6 || !email} className="lg-submit">
                {busy ? (<><span className="lg-spinner" /><span>验证中…</span></>) : (<><LogIn size={16} strokeWidth={2} /><span>验证并登录</span></>)}
              </button>
            )}

            <div className="lg-divider"><span>或使用第三方登录</span></div>
            <button type="button" className="lg-github" onClick={handleGitHub}>
              <Github size={17} strokeWidth={1.9} /><span>使用 GitHub 登录</span>
            </button>
          </form>

          {mode === 'login' ? (
            <button type="button" className="lg-switch" onClick={() => switchMode('register')}>没有账号？立即注册</button>
          ) : (
            <button type="button" className="lg-switch" onClick={() => switchMode('login')}>已有账号？直接登录</button>
          )}
        </div>
      </div>
    );
  }

  return children({ onLogout, user });
}
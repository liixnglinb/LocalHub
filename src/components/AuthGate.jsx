import React, { useState, useEffect } from 'react';
import {
  subscribeAuth, getSession, login, register, resetPassword,
  sendCode, loginWithCode, signInWithGitHub, logout,
} from '../auth';
import {
  Mail, Lock, ArrowRight, ShieldCheck, Github, UserRound,
  Eye, EyeOff, KeyRound, UserPlus, LogIn, Sparkles,
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
      <div className="a-root">
        <style>{`
          *, *::before, *::after { box-sizing: border-box; }
          .a-root {
            min-height: 100vh; width: 100%;
            display: flex; align-items: center; justify-content: center;
            padding: 24px; background: #F7F8FA;
            font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Segoe UI", system-ui, sans-serif;
          }
          .a-card { width: 100%; max-width: 404px; display: flex; flex-direction: column; align-items: center; text-align: center; }
          .a-brand { display: flex; align-items: center; gap: 10px; margin-bottom: 26px; }
          .a-brand-ico {
            width: 42px; height: 42px; border-radius: 12px;
            background: #7C5CFF; color: #FFFFFF; display: flex; align-items: center; justify-content: center;
            box-shadow: 0 6px 16px -8px rgba(124,92,255,0.6);
          }
          .a-brand-txt { font-weight: 700; font-size: 20px; color: #1A1D24; letter-spacing: -0.01em; }
          .a-title { margin: 0; font-weight: 700; font-size: 24px; color: #1A1D24; letter-spacing: -0.02em; }
          .a-sub { margin: 8px 0 0; font-weight: 500; font-size: 13.5px; color: #8A8F99; }

          .a-mode-seg { display: flex; gap: 4px; width: 100%; margin: 26px 0 20px; padding: 4px; border-radius: 10px; background: #F1F2F5; border: 1px solid #ECEEF2; }
          .a-mode-seg button { flex: 1; appearance: none; border: none; cursor: pointer; padding: 9px 0; margin: 0; border-radius: 8px; background: transparent; color: #8A8F99; font: 600 13px/1 -apple-system, "PingFang SC", system-ui, sans-serif; transition: all .18s ease; display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
          .a-mode-seg button.a-on { background: #FFFFFF; color: #212529; box-shadow: 0 1px 3px rgba(16,20,30,.10); }

          .a-tabs { display: flex; gap: 4px; width: 100%; margin: 0 0 20px; padding: 4px; border-radius: 10px; background: #F1F2F5; border: 1px solid #ECEEF2; }
          .a-tab { flex: 1; appearance: none; border: none; cursor: pointer; padding: 8px 0; border-radius: 8px; background: transparent; color: #8A8F99; font: 600 12.5px/1 "PingFang SC", system-ui, sans-serif; transition: all .18s ease; }
          .a-tab.a-on { background: #FFFFFF; color: #212529; box-shadow: 0 1px 3px rgba(16,20,30,.10); }

          .a-form { width: 100%; display: flex; flex-direction: column; gap: 16px; text-align: left; }
          .a-field { display: flex; flex-direction: column; gap: 7px; }
          .a-label-row { display: flex; justify-content: space-between; align-items: center; }
          .a-label { font: 600 12.5px/1 "PingFang SC", system-ui, sans-serif; color: #4A4E57; }
          .a-link { appearance: none; border: none; background: none; padding: 0; cursor: pointer; font: 600 12px/1 Inter, system-ui, sans-serif; color: #6A4BFF; transition: color .18s ease; }
          .a-link:hover { color: #5A3DF0; }
          .a-input-wrap { position: relative; display: flex; align-items: center; }
          .a-ico { position: absolute; left: 13px; z-index: 1; color: #A6ABB4; transition: color .18s ease; pointer-events: none; }
          .a-input-wrap:focus-within .a-ico { color: #7C5CFF; }
          .a-input { width: 100%; height: 46px; padding: 0 40px; margin: 0; border-radius: 10px; border: 1px solid rgba(20,24,33,.12); background: #FFFFFF; color: #1A1D24; font: 500 14px/1 "PingFang SC", system-ui, sans-serif; outline: none; transition: all .18s ease; }
          .a-input:hover { border-color: rgba(20,24,33,.22); }
          .a-input:focus { border-color: rgba(124,92,255,.55); box-shadow: 0 0 0 3px rgba(124,92,255,.12); }
          .a-input::placeholder { color: #B4B8C0; }
          .a-otp-input { padding: 0 13px; letter-spacing: .35em; font-variant-numeric: tabular-nums; font-weight: 600; text-align: center; }
          .a-toggle-pw { position: absolute; right: 8px; z-index: 2; width: 30px; height: 30px; border-radius: 8px; border: none; background: transparent; color: #A6ABB4; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
          .a-toggle-pw:hover { background: #F1F2F5; color: #1A1D24; }
          .a-caps { position: absolute; right: 44px; z-index: 2; color: #F59E0B; display: inline-flex; }
          .a-send { width: 100%; height: 44px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; border-radius: 10px; border: 1px solid rgba(20,24,33,.12); background: #FFFFFF; color: #1A1D24; font: 700 13.5px/1 "PingFang SC", system-ui, sans-serif; cursor: pointer; transition: all .18s ease; }
          .a-send:hover:not(:disabled) { border-color: #7C5CFF; color: #7C5CFF; }
          .a-send:disabled { opacity: .5; cursor: not-allowed; }
          .a-otp-row { display: flex; gap: 10px; align-items: center; }
          .a-otp-row .a-input-wrap { flex: 1; }
          .a-strength { height: 3px; border-radius: 999px; background: #F1F2F5; overflow: hidden; margin-top: 2px; }
          .a-strength i { display: block; height: 100%; border-radius: 999px; transition: width .2s ease, background .2s ease; }
          .a-msg { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 10px; background: #EFFAF4; border: 1px solid #C6F0DA; color: #16A34A; font: 600 12.5px/1.4 "PingFang SC", system-ui, sans-serif; }
          .a-error { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 10px; background: #FDF1F1; border: 1px solid #FBC6C6; color: #DC2626; font: 600 12.5px/1.4 "PingFang SC", system-ui, sans-serif; }
          .a-submit { position: relative; width: 100%; height: 47px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 0 22px; border: none; cursor: pointer; border-radius: 10px; color: #FFFFFF; font: 700 14px/1 "PingFang SC", system-ui, sans-serif; background: #1A1D24; transition: all .18s ease; }
          .a-submit:hover:not(:disabled) { background: #2A2E38; }
          .a-submit:active:not(:disabled) { background: #111318; }
          .a-submit-danger:hover:not(:disabled) { background: #DC2626; }
          .a-submit:disabled { opacity: .45; cursor: not-allowed; }
          .a-spinner { width: 16px; height: 16px; border-radius: 50%; border: 2px solid rgba(255,255,255,.3); border-top-color: #FFFFFF; animation: aspin .7s linear infinite; }
          @keyframes aspin { to { transform: rotate(360deg); } }
          .a-row { display: flex; align-items: center; justify-content: space-between; }
          .a-check { display: inline-flex; align-items: center; gap: 7px; cursor: pointer; font-size: 12.5px; color: #4A4E57; font-weight: 500; }
          .a-check input { width: 15px; height: 15px; accent-color: #7C5CFF; margin: 0; cursor: pointer; }
          .a-divider { display: flex; align-items: center; gap: 12px; color: #B4B8C0; font-size: 11.5px; font-weight: 600; letter-spacing: .04em; margin: 2px 0; }
          .a-divider::before, .a-divider::after { content: ''; flex: 1; height: 1px; background: #ECEEF2; }
          .a-github { width: 100%; height: 44px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; border-radius: 10px; border: 1px solid rgba(20,24,33,.14); background: #FFFFFF; color: #1A1D24; font: 700 13.5px/1 "PingFang SC", system-ui, sans-serif; cursor: pointer; transition: all .18s ease; }
          .a-github:hover { background: #F7F8FA; border-color: rgba(20,24,33,.24); }
          .a-switch { margin-top: 14px; appearance: none; border: none; background: none; padding: 6px 10px; cursor: pointer; font: 600 13px/1 "PingFang SC", system-ui, sans-serif; color: #6A4BFF; transition: color .18s ease; }
          .a-switch:hover { color: #5A3DF0; text-decoration: underline; }
          .a-foot { margin-top: 4px; font-size: 11.5px; color: #B4B8C0; }
        `}</style>

        <div className="a-card">
          <div className="a-brand">
            <div className="a-brand-ico"><Sparkles size={20} strokeWidth={1.8} /></div>
            <div className="a-brand-txt">LocalHub</div>
          </div>

          {mode === 'login' ? (<>
            <h2 className="a-title">欢迎回来</h2>
            <p className="a-sub">登录后同步你的全部个人工具数据</p>
          </>) : (<>
            <h2 className="a-title">创建账号</h2>
            <p className="a-sub">注册一个账号，数据随账号在云端保存</p>
          </>)}

          {mode === 'login' && (
            <div className="a-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={tab === 'password'} className={'a-tab ' + (tab === 'password' ? 'a-on' : '')} onClick={() => switchTab('password')}>邮箱密码</button>
              <button type="button" role="tab" aria-selected={tab === 'otp'} className={'a-tab ' + (tab === 'otp' ? 'a-on' : '')} onClick={() => switchTab('otp')}>验证码登录</button>
            </div>
          )}

          <form onSubmit={doSubmit} className="a-form">
            <div className="a-field">
              <label className="a-label">邮箱地址</label>
              <div className="a-input-wrap">
                <Mail className="a-ico" size={16} strokeWidth={1.8} />
                <input type="email" value={email} autoComplete="email" onChange={(e) => { setEmail(e.target.value); if (err) setErr(''); }} placeholder="you@example.com" className="a-input" autoFocus />
              </div>
            </div>

            {mode === 'register' ? (<>
              <div className="a-field">
                <label className="a-label">密码</label>
                <div className="a-input-wrap">
                  <Lock className="a-ico" size={16} strokeWidth={1.8} />
                  <input type={showPw ? 'text' : 'password'} value={password} autoComplete="new-password" onChange={(e) => { chgPw(e.target.value); }} onKeyUp={(e) => setCapsOn(e.getModifierState && e.getModifierState('CapsLock'))} onKeyDown={(e) => setCapsOn(e.getModifierState && e.getModifierState('CapsLock'))} onBlur={() => setCapsOn(false)} placeholder="至少 6 位" className="a-input" />
                  {capsOn && <span className="a-caps"><KeyRound size={15} /></span>}
                  <button type="button" className="a-toggle-pw" onClick={() => setShowPw((v) => !v)} tabIndex={-1} aria-label={showPw ? '隐藏密码' : '显示密码'}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {password && <div className="a-strength"><i style={{ width: (pwStrength / 4) * 100 + '%', background: pwStrength <= 1 ? '#EF4444' : pwStrength === 2 ? '#F59E0B' : pwStrength === 3 ? '#16A34A' : '#22C55E' }} /></div>}
              </div>
              <div className="a-field">
                <label className="a-label">确认密码</label>
                <div className="a-input-wrap">
                  <Lock className="a-ico" size={16} strokeWidth={1.8} />
                  <input type={showPw ? 'text' : 'password'} value={confirm} autoComplete="new-password" onChange={(e) => { setConfirm(e.target.value); if (err) setErr(''); }} placeholder="再次输入密码" className="a-input" />
                  <button type="button" className="a-toggle-pw" onClick={() => setShowPw((v) => !v)} tabIndex={-1} aria-label={showPw ? '隐藏密码' : '显示密码'}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </>) : tab === 'password' ? (<>
              <div className="a-field">
                <div className="a-label-row">
                  <label className="a-label">密码</label>
                  <button type="button" className="a-link" onClick={handleForget}>忘记密码？</button>
                </div>
                <div className="a-input-wrap">
                  <Lock className="a-ico" size={16} strokeWidth={1.8} />
                  <input type={showPw ? 'text' : 'password'} value={password} autoComplete="current-password" onChange={(e) => { setPassword(e.target.value); if (err) setErr(''); }} onKeyUp={(e) => setCapsOn(e.getModifierState && e.getModifierState('CapsLock'))} onKeyDown={(e) => setCapsOn(e.getModifierState && e.getModifierState('CapsLock'))} onBlur={() => setCapsOn(false)} placeholder="请输入密码" className="a-input" />
                  {capsOn && <span className="a-caps"><KeyRound size={15} /></span>}
                  <button type="button" className="a-toggle-pw" onClick={() => setShowPw((v) => !v)} tabIndex={-1} aria-label={showPw ? '隐藏密码' : '显示密码'}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </>) : (<>
              <div className="a-field">
                <label className="a-label">登录方式</label>
                <div className="a-otp-row">
                  <div className="a-input-wrap">
                    <Mail className="a-ico" size={16} strokeWidth={1.8} />
                    <input type="text" inputMode="numeric" maxLength={6} value={otp} autoComplete="one-time-code" onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '')); if (err) setErr(''); }} placeholder="邮箱中的 6 位验证码" className="a-input a-otp-input" />
                  </div>
                  <button type="button" className="a-send" style={{ flexShrink: 0, height: 46 }} disabled={sending || countdown > 0} onClick={doSendOtp}>
                    {sending ? '发送中…' : countdown > 0 ? `${countdown}s` : '发送验证码'}
                  </button>
                </div>
              </div>
            </>)}

            {err && <div className="a-error"><ShieldCheck size={14} strokeWidth={1.8} /><span>{err}</span></div>}
            {msg && <div className="a-msg"><ShieldCheck size={14} strokeWidth={1.8} /><span>{msg}</span></div>}

            {mode === 'register' ? (
              <button type="submit" disabled={busy || !email || !password || !confirm} className="a-submit">
                {busy ? (<><span className="a-spinner" /><span>注册中…</span></>) : (<><UserPlus size={16} strokeWidth={2} /><span>创建账号</span></>)}
              </button>
            ) : tab === 'password' ? (<>
              <div className="a-row">
                <label className="a-check"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /><span>记住我</span></label>
              </div>
              <button type="submit" disabled={busy || !email || !password} className="a-submit">
                {busy ? (<><span className="a-spinner" /><span>登录中…</span></>) : (<><LogIn size={16} strokeWidth={2} /><span>登录</span></>)}
              </button>
            </>) : (
              <button type="submit" disabled={busy || otp.length < 6 || !email} className="a-submit">
                {busy ? (<><span className="a-spinner" /><span>验证中…</span></>) : (<><LogIn size={16} strokeWidth={2} /><span>验证并登录</span></>)}
              </button>
            )}

            <div className="a-divider"><span>或使用第三方登录</span></div>
            <button type="button" className="a-github" onClick={handleGitHub}>
              <Github size={17} strokeWidth={1.9} /><span>使用 GitHub 登录</span>
            </button>
          </form>

          {mode === 'login' ? (
            <button type="button" className="a-switch" onClick={() => switchMode('register')}>没有账号？立即注册</button>
          ) : (
            <button type="button" className="a-switch" onClick={() => switchMode('login')}>已有账号？直接登录</button>
          )}
        </div>
      </div>
    );
  }

  return children({ onLogout, user });
}
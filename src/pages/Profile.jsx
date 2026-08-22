import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserRound, Mail, LogOut, ShieldCheck, KeyRound, Check, Lock,
} from 'lucide-react';

/** 个人中心页：账号信息 / 改昵称 / 改密码 / 退出登录 */

export default function Profile({ user, onLogout }) {
  const nav = useNavigate();
  const [name, setName] = useState(user?.displayName || '');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [tab, setTab] = useState('profile');   // 'profile' | 'password'
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const done = (m) => { setMsg(m); setErr(''); };
  const fail = (m) => { setErr(m); setMsg(''); };

  const saveName = async () => {
    if (!name.trim()) return fail('昵称不能为空');
    setBusy(true);
    try {
      const { updateProfile } = await import('../auth');
      await updateProfile({ name: name.trim() });
      done('昵称已更新');
    } catch (e) { fail(e.message || '更新失败'); }
    finally { setBusy(false); }
  };

  const changePw = async () => {
    if (newPw.length < 6) return fail('新密码至少 6 位');
    if (newPw !== confirmPw) return fail('两次输入的新密码不一致');
    setBusy(true);
    try {
      const { changePassword } = await import('../auth');
      await changePassword(newPw);
      setNewPw(''); setConfirmPw('');
      done('密码已修改，下次登录使用新密码');
    } catch (e) { fail(e.message || '修改失败'); }
    finally { setBusy(false); }
  };

  const doLogout = async () => {
    if (!onLogout) { nav('/'); return; }
    await onLogout();
    nav('/');
  };

  const display = user?.displayName || user?.email?.split('@')[0] || '用户';

  return (
    <div>
      <style>{`
        .pf-wrap { max-width: 560px; margin: 0 auto; display: flex; flex-direction: column; gap: 18px; }
        .pf-box { background: #fff; border: 1px solid rgba(20,24,33,.09); border-radius: 14px; box-shadow: 0 1px 2px rgba(16,20,30,.04); padding: 22px 24px; }
        .pf-head { display: flex; align-items: center; gap: 16px; }
        .pf-avatar { width: 58px; height: 58px; border-radius: 50%; background: #F1F2F5; border: 1px solid #ECEEF2; display: flex; align-items: center; justify-content: center; color: #4A4E57; flex-shrink: 0; }
        .pf-name { font-size: 18px; font-weight: 700; color: #1A1D24; letter-spacing: -0.01em; display: flex; align-items: center; gap: 8px; }
        .pf-dot-ok { width: 7px; height: 7px; border-radius: 50%; background: #22C55E; box-shadow: 0 0 6px rgba(34,197,94,.4); }
        .pf-mail { font-size: 13px; color: #8A8F99; display: flex; align-items: center; gap: 6px; margin-top: 4px; }
        .pf-tabs { display: flex; gap: 4px; padding: 4px; border-radius: 10px; background: #F1F2F5; border: 1px solid #ECEEF2; width: fit-content; margin: 18px 0 2px; }
        .pf-tab { appearance: none; border: none; cursor: pointer; padding: 8px 16px; border-radius: 8px; background: transparent; color: #8A8F99; font: 600 12.5px/1 "PingFang SC", system-ui, sans-serif; transition: all .18s ease; display: inline-flex; align-items: center; gap: 6px; }
        .pf-tab.on { background: #FFFFFF; color: #212529; box-shadow: 0 1px 3px rgba(16,20,30,.10); }
        .pf-field { display: flex; flex-direction: column; gap: 7px; margin-top: 16px; }
        .pf-label { font: 600 12.5px/1 "PingFang SC", system-ui, sans-serif; color: #4A4E57; }
        .pf-input { width: 100%; height: 44px; padding: 0 13px; border-radius: 10px; border: 1px solid rgba(20,24,33,.12); background: #fff; color: #1A1D24; font: 500 14px/1 "PingFang SC", system-ui, sans-serif; outline: none; transition: all .18s ease; box-sizing: border-box; }
        .pf-input:focus { border-color: rgba(124,92,255,.55); box-shadow: 0 0 0 3px rgba(124,92,255,.12); }
        .pf-input:disabled { background: #F7F8FA; color: #A6ABB4; }
        .pf-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 0 18px; height: 42px; border-radius: 10px; border: none; cursor: pointer; font: 700 13.5px/1 "PingFang SC", system-ui, sans-serif; transition: all .18s ease; }
        .pf-btn-dark { background: #1A1D24; color: #fff; } .pf-btn-dark:hover:not(:disabled) { background: #2A2E38; }
        .pf-btn-ghost { background: transparent; color: #4A4E57; border: 1px solid rgba(20,24,33,.14); } .pf-btn-ghost:hover { background: #F7F8FA; }
        .pf-btn-danger { background: #FDF1F1; color: #DC2626; } .pf-btn-danger:hover { background: #F9DDDD; }
        .pf-btn:disabled { opacity: .45; cursor: not-allowed; }
        .pf-row { display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px; }
        .pf-err { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 10px; background: #FDF1F1; border: 1px solid #FBC6C6; color: #DC2626; font: 600 12.5px/1.4 "PingFang SC", system-ui, sans-serif; margin-top: 14px; }
        .pf-msg { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 10px; background: #EFFAF4; border: 1px solid #C6F0DA; color: #16A34A; font: 600 12.5px/1.4 "PingFang SC", system-ui, sans-serif; margin-top: 14px; }
        .pf-hint { font-size: 12px; color: #A6ABB4; margin-top: 6px; }
      `}</style>

      <div className="pf-wrap">
        {/* 账号信息卡 */}
        <div className="pf-box">
          <div className="pf-head">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="avatar" className="pf-avatar" style={{ objectFit: 'cover' }} />
            ) : (
              <div className="pf-avatar"><UserRound size={28} strokeWidth={1.6} /></div>
            )}
            <div>
              <div className="pf-name">{display} <span className="pf-dot-ok" title="已登录" /></div>
              <div className="pf-mail"><Mail size={13} strokeWidth={1.8} />{user?.email || '—'}</div>
            </div>
          </div>
        </div>

        {/* 操作卡 */}
        <div className="pf-box">
          <div className="pf-tabs">
            <button type="button" className={'pf-tab ' + (tab === 'profile' ? 'on' : '')} onClick={() => { setTab('profile'); setMsg(''); setErr(''); }}>
              <UserRound size={14} strokeWidth={1.8} />账号资料
            </button>
            <button type="button" className={'pf-tab ' + (tab === 'password' ? 'on' : '')} onClick={() => { setTab('password'); setMsg(''); setErr(''); }}>
              <KeyRound size={14} strokeWidth={1.8} />修改密码
            </button>
          </div>

          {tab === 'profile' ? (
            <div>
              <div className="pf-field">
                <label className="pf-label">显示昵称</label>
                <input className="pf-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="输入你的昵称" maxLength={24} />
              </div>
              <div className="pf-field">
                <label className="pf-label">登录邮箱</label>
                <input className="pf-input" value={user?.email || ''} disabled />
                <div className="pf-hint">邮箱用于登录与找回账号，目前不可在线更改</div>
              </div>
              <div className="pf-row">
                <button type="button" className="pf-btn pf-btn-dark" disabled={busy} onClick={saveName}>
                  {busy ? '保存中…' : (<><Check size={15} strokeWidth={2} />保存修改</>)}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="pf-field">
                <label className="pf-label">新密码</label>
                <input className="pf-input" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="至少 6 位" autoComplete="new-password" />
              </div>
              <div className="pf-field">
                <label className="pf-label">确认新密码</label>
                <input className="pf-input" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="再次输入新密码" autoComplete="new-password" />
              </div>
              <div className="pf-row">
                <button type="button" className="pf-btn pf-btn-dark" disabled={busy || !newPw || !confirmPw} onClick={changePw}>
                  {busy ? '修改中…' : (<><Lock size={15} strokeWidth={2} />修改密码</>)}
                </button>
              </div>
            </div>
          )}

          {err && <div className="pf-err"><ShieldCheck size={14} /><span>{err}</span></div>}
          {msg && <div className="pf-msg"><ShieldCheck size={14} /><span>{msg}</span></div>}
        </div>

        {/* 退出卡 */}
        <div className="pf-box">
          <button type="button" className="pf-btn pf-btn-danger" style={{ width: '100%' }} onClick={doLogout}>
            <LogOut size={16} strokeWidth={2} />退出登录
          </button>
        </div>
      </div>
    </div>
  );
}
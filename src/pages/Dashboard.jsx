import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, FolderKanban, ArrowRight, KeyRound } from 'lucide-react';
import {
  NotebookPen, Link, Lightbulb, BookOpen, Baby, Share2, Trophy, Globe,
  Wrench, CalendarDays, CalendarClock, Bot, Newspaper,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

/* ============================================================
   首页 Dashboard · 经典简约商务白底风
   - 纯白/浅灰底，白卡片，细边框，14px 圆角，柔和阴影
   - 三级灰文字，主题色点缀图标
   - 去掉渐变 / 光晕 / 弹跳动画
   - 响应式：桌面 4 列 / 平板 2 列 / 移动 1 列
   ============================================================ */
const TOOLS = [
  { to: '/smart-notes', label: '智能笔记', desc: '随手记录，灵感沉淀', icon: NotebookPen, accent: '#7C5CFF' },
  { to: '/web-links',   label: '网页链接', desc: '收藏常用网页，分类管理', icon: Link,      accent: '#0891B2' },
  { to: '/prompts',     label: '提示词库', desc: '管理 AI 提示词模板', icon: Lightbulb,   accent: '#D97706' },
  { to: '/learning',    label: '学习资料', desc: '笔记与学习资料管理', icon: BookOpen,     accent: '#059669' },
  { to: '/baby-care',   label: '宝宝护理', desc: '宝宝成长记录与护理', icon: Baby,        accent: '#F97316' },
  { to: '/mindmap',     label: '思维导图', desc: '独立思维导图工作台', icon: Share2,      accent: '#8B5CF6' },
  { to: '/leaderboard', label: 'AI排行榜', desc: '大模型 Benchmark 榜单', icon: Trophy,   accent: '#3B5BFF' },
  { to: '/blog',        label: '个人博客', desc: '阅读与思考的空间', icon: Globe,         accent: '#0EA5E9' },
  { to: '/tools',       label: '工具网站', desc: '金融与效率工具导航', icon: Wrench,      accent: '#0CA678' },
  { to: '/schedule',    label: '个人课表', desc: '课程安排，按周自动提醒', icon: CalendarDays, accent: '#6366F1' },
  { to: '/planner',     label: '个人日程', desc: '日历与假期，日程一目了然', icon: CalendarClock, accent: '#0EA5E9' },
  { to: '/agents',      label: 'AI Agent', desc: 'Agent 与 Skill 资源聚合', icon: Bot,       accent: '#7C5CFF' },
  { to: '/news',        label: 'AI 情报', desc: 'AI 五大类每日资讯速览', icon: Newspaper, accent: '#3B5BFF' },
];

export default function Dashboard({ onLogout, user }) {
  const navigate = useNavigate();
  const [pwdNote, setPwdNote] = useState('');
  const displayName = user?.displayName || user?.email?.split('@')[0] || '用户';
  const avatarUrl = user?.avatarUrl || null;

  // 设置密码：直接调用 Supabase updateUser（需登录态）
  const handleSetPassword = async () => {
    setPwdNote('');
    const p1 = window.prompt('请输入新密码（至少 6 位）：');
    if (!p1) return;
    if (p1.length < 6) { setPwdNote('密码至少 6 位'); return; }
    const p2 = window.prompt('请再次输入新密码确认：');
    if (p1 !== p2) { setPwdNote('两次输入的密码不一致'); return; }
    const { error } = await supabase.auth.updateUser({ password: p1 });
    setPwdNote(error ? ('设置失败：' + error.message) : '密码已设置，下次可用邮箱密码登录');
    setTimeout(() => setPwdNote(''), 5000);
  };

  return (
    <div className="home-wrap">
      {/* 内容层 */}
      <div className="home-inner">
        {/* 顶部：品牌 + 用户信息 + 退出 */}
        <header className="home-head">
          <div className="home-brand">
            <div className="brand-mini">
              <FolderKanban size={22} strokeWidth={1.7} />
            </div>
            <div className="brand-copy">
              <h1 className="home-title">个人工具中心</h1>
              <p className="home-sub">云端一站式创作与效率平台 · {displayName}，欢迎回来</p>
            </div>
          </div>

          <div className="home-user">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="user-avatar" referrerPolicy="no-referrer" />
            ) : (
              <span className="user-avatar user-avatar-fallback">{displayName.charAt(0).toUpperCase()}</span>
            )}
            <span className="user-name">{displayName}</span>
            <button onClick={handleSetPassword} title="设置密码" className="logout-btn">
              <KeyRound size={14} strokeWidth={1.8} />
              <span>设密码</span>
            </button>
            {pwdNote && <span style={{ fontSize: 12, color: '#0CA678' }}>{pwdNote}</span>}
            {onLogout && (
              <button onClick={onLogout} title="退出登录" className="logout-btn">
                <LogOut size={14} strokeWidth={1.8} />
                <span>退出</span>
              </button>
            )}
          </div>
        </header>

        {/* 工具卡片栅格 */}
        <div className="dashboard-grid">
          {TOOLS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.to}
                onClick={() => navigate(t.to)}
                className="dash-card"
                style={{ '--acc': t.accent }}
              >
                <div className="dash-card-top">
                  <span className="dash-icon">
                    <Icon size={22} strokeWidth={1.8} />
                  </span>
                  <span className="dash-arrow">
                    <span>进入</span>
                    <ArrowRight size={15} strokeWidth={2} />
                  </span>
                </div>
                <div className="dash-label">{t.label}</div>
                <div className="dash-desc">{t.desc}</div>
              </button>
            );
          })}
        </div>

        {/* 底部小标语 */}
        <div className="home-foot">
          <span className="dot" />
          <span>所有数据已加密同步至云端</span>
        </div>
      </div>

      <style>{`
        .home-wrap {
          min-height: 100vh;
          width: 100%;
          background: #f8f9fa;
          display: flex;
          align-items: stretch;
        }
        .home-inner {
          width: 100%;
          max-width: 1180px;
          margin: 0 auto;
          padding: 36px 32px 28px;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
        }

        /* ===== 顶部品牌 ===== */
        .home-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding-bottom: 28px;
        }
        .home-brand { display: flex; align-items: center; gap: 14px; min-width: 0; }
        .brand-mini {
          width: 44px; height: 44px;
          border-radius: 12px;
          background: #fff;
          border: 1px solid rgba(20,24,33,.08);
          box-shadow: 0 1px 2px rgba(16,20,30,.05);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #7C5CFF;
          flex-shrink: 0;
        }
        .brand-copy { display: flex; flex-direction: column; min-width: 0; }
        .home-title {
          margin: 0;
          font-size: 26px;
          font-weight: 700;
          letter-spacing: -0.01em;
          color: #212529;
          white-space: nowrap;
        }
        .home-sub {
          margin: 5px 0 0;
          font-size: 13.5px;
          color: #6c757d;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* ===== 用户信息 ===== */
        .home-user {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 5px 5px 5px 8px;
          border-radius: 999px;
          background: #fff;
          border: 1px solid rgba(20,24,33,.08);
          box-shadow: 0 1px 2px rgba(16,20,30,.04);
          flex-shrink: 0;
        }
        .user-avatar {
          width: 28px; height: 28px;
          border-radius: 50%;
          object-fit: cover;
          flex-shrink: 0;
        }
        .user-avatar-fallback {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #7C5CFF;
          color: #fff;
          font-size: 13px;
          font-weight: 700;
        }
        .user-name {
          font-size: 13px;
          font-weight: 600;
          color: #212529;
          max-width: 110px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .logout-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid rgba(20,24,33,.09);
          background: #fff;
          color: #6c757d;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: all .2s ease;
        }
        .logout-btn:hover {
          background: #f8f9fa;
          color: #212529;
          border-color: rgba(20,24,33,.16);
        }
        .logout-btn:active { transform: scale(0.98); }

        /* ===== 工具栅格 ===== */
        .dashboard-grid {
          flex: 1;
          min-height: 0;
          display: grid;
          grid-template-columns: repeat(1, 1fr);
          grid-auto-rows: auto;
          align-content: center;
          gap: 18px;
          padding: 8px 0;
        }
        @media (min-width: 640px) { .dashboard-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 1024px) { .dashboard-grid { grid-template-columns: repeat(4, 1fr); } }

        .dash-card {
          display: flex;
          flex-direction: column;
          text-align: left;
          background: #ffffff;
          border: 1px solid rgba(20,24,33,.08);
          border-radius: 14px;
          padding: 20px;
          min-height: 158px;
          cursor: pointer;
          box-shadow: 0 1px 2px rgba(16,20,30,.04);
          transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease;
          font-family: inherit;
        }
        .dash-card:hover {
          transform: translateY(-3px);
          border-color: rgba(20,24,33,.16);
          box-shadow: 0 12px 28px -16px rgba(16,20,30,.18);
        }
        .dash-card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
        }
        .dash-icon {
          width: 46px; height: 46px;
          border-radius: 12px;
          background: #f4f6fb;
          border: 1px solid rgba(20,24,33,.06);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--acc, #7C5CFF);
        }
        .dash-arrow {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 600;
          color: #adb5bd;
          transform: translateX(20px);
          opacity: 0;
          transition: all .25s ease;
        }
        .dash-card:hover .dash-arrow {
          transform: translateX(0);
          opacity: 1;
          color: var(--acc, #7C5CFF);
        }
        .dash-label {
          color: #212529;
          font-size: 16px;
          font-weight: 600;
          margin-top: 16px;
        }
        .dash-desc {
          color: #6c757d;
          font-size: 13px;
          margin-top: 6px;
          line-height: 1.55;
        }

        /* ===== 底部 ===== */
        .home-foot {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding-top: 26px;
          font-size: 12px;
          color: #adb5bd;
          font-weight: 500;
        }
        .home-foot .dot {
          width: 6px; height: 6px; border-radius: 999px;
          background: #22C55E;
        }
      `}</style>
    </div>
  );
}
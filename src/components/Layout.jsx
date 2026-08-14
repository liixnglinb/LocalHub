import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home, NotebookPen, Baby, KeyRound, Link, Lightbulb, BookOpen,
  ClipboardCheck, Video, Share2, Trophy,
} from 'lucide-react';

/* 导航分组（还原自 release10 安装包） */
const NAV_ITEMS = [
  { to: '/',              label: '首页',     icon: Home,           group: 'main'  },
  { to: '/smart-notes',   label: '智能笔记', icon: NotebookPen,    group: 'main'  },
  { to: '/baby-care',     label: '宝宝护理', icon: Baby,           group: 'tools' },
  { to: '/api-keys',      label: 'API 密钥', icon: KeyRound,       group: 'data'  },
  { to: '/web-links',     label: '网页链接', icon: Link,           group: 'data'  },
  { to: '/prompts',       label: '提示词库', icon: Lightbulb,      group: 'data'  },
  { to: '/learning',      label: '学习资料', icon: BookOpen,       group: 'data'  },
  { to: '/check-in',      label: '学习通签到', icon: ClipboardCheck, group: 'tools' },
  { to: '/video-workflow', label: '视频工作流', icon: Video,       group: 'tools' },
  { to: '/mindmap',       label: '思维导图', icon: Share2,         group: 'tools' },
  { to: '/leaderboard',   label: 'AI排行榜', icon: Trophy,         group: 'tools' },
];

const GROUP_LABELS = { main: '总览', data: '数据', tools: '工具' };
const GROUP_ORDER = ['main', 'data', 'tools'];

export default function Layout({ children }) {
  const { pathname } = useLocation();
  const fullWidth = pathname === '/video-workflow' || pathname === '/mindmap' || pathname === '/leaderboard';

  return (
    <div className="flex h-screen" style={{ background: 'var(--bg-0)', color: 'var(--text-1)' }}>
      {/* 顶部拖拽区 */}
      <div className="drag-region fixed top-0 left-0 right-0 h-8 z-50 flex items-center px-4 text-[11px] select-none pointer-events-none">
        <span className="title-display tracking-wide text-white/85">LocalHub</span>
      </div>

      {/* 左侧边栏 */}
      <aside
        className="flex flex-col"
        style={{
          width: '232px',
          background: 'linear-gradient(180deg, var(--surface-1), var(--surface-2)), rgba(18,18,20,0.72)',
          borderRight: '1px solid var(--line)',
          backdropFilter: 'blur(14px) saturate(120%)',
          WebkitBackdropFilter: 'blur(14px) saturate(120%)',
        }}
      >
        {/* 品牌区 */}
        <div className="px-4 pt-11 pb-4">
          <div className="flex items-center gap-2.5">
            <div
              className="h-8 w-8 rounded-[9px] flex items-center justify-center shrink-0"
              style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.10)', boxShadow: 'var(--elev-1)' }}
            >
              <svg viewBox="0 0 512 512" className="h-4 w-4 text-white" fill="none">
                <path d="M120 120 L392 120 L392 240 L260 240 L260 392 L120 392 Z" fill="currentColor" />
                <rect x="280" y="260" width="112" height="112" fill="currentColor" />
              </svg>
            </div>
            <div className="leading-tight">
              <div className="title-display text-[14px] tracking-tight">LocalHub</div>
              <div className="text-[10px] text-white/35 font-medium tracking-[0.12em] mt-0.5">v1.13.6 · 个人中心</div>
            </div>
          </div>
        </div>

        {/* 分组导航 */}
        <nav className="flex-1 px-2 pt-1 pb-3 space-y-3 overflow-y-auto">
          {GROUP_ORDER.map((group) => {
            const items = NAV_ITEMS.filter((i) => i.group === group);
            if (items.length === 0) return null;
            return (
              <div key={group}>
                <div className="px-3 mb-1 text-[10px] text-white/35 uppercase tracking-[0.16em] font-semibold">
                  {GROUP_LABELS[group]}
                </div>
                <div className="space-y-px">
                  {items.map(({ to, label, icon: Icon }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={to === '/'}
                      className={({ isActive }) =>
                        `group relative flex items-center gap-2.5 rounded-[8px] pl-3 pr-2 py-[6px] text-[12.5px] font-medium no-drag transition-all duration-160 ${
                          isActive ? 'text-white' : 'text-white/55 hover:text-white'
                        }`
                      }
                      style={({ isActive }) => ({
                        background: isActive ? 'var(--sel)' : 'transparent',
                        boxShadow: isActive ? 'inset 0 1px 0 rgba(255,255,255,0.06)' : 'none',
                      })}
                      onMouseEnter={(e) => {
                        if (!e.currentTarget.classList.contains('text-white')) {
                          e.currentTarget.style.background = 'var(--hover)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!e.currentTarget.classList.contains('text-white')) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && <span className="selected-indicator" />}
                          <Icon
                            className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-white' : 'text-white/45 group-hover:text-white/70'}`}
                            strokeWidth={1.6}
                          />
                          <span className="relative">{label}</span>
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* 底部状态 */}
        <div className="border-t border-white/[0.07] px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10.5px] text-white/40">
              <div className="status-dot ok" />
              <span>本地 · 离线可用</span>
            </div>
            <div className="text-[10px] text-white/30 font-mono num">D:\</div>
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 overflow-auto pt-8 pb-6" style={{ position: 'relative', background: 'var(--bg-0)' }}>
        <div
          className="pointer-events-none absolute inset-0 canvas-dots"
          style={{ opacity: 0.35, animation: 'gridBreathe 6s ease-in-out infinite' }}
        />
        <div
          className={`animate-fade-in min-h-full ${fullWidth ? '' : 'px-7 max-w-[1380px] mx-auto'}`}
          style={{ position: 'relative' }}
        >
          {children}
        </div>
      </main>
    </div>
  );
}

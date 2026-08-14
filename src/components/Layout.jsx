import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  Home, KeyRound, Link, Lightbulb, BookOpen,
  Video, ClipboardCheck, Network, Layers, Baby,
} from 'lucide-react';

const nav = [
  { path: '/',              end: true,  label: '首页',       icon: Home },
  { path: '/api-keys',      end: false, label: 'API 密钥',   icon: KeyRound },
  { path: '/web-links',     end: false, label: '网页链接',   icon: Link },
  { path: '/prompts',       end: false, label: '提示词',     icon: Lightbulb },
  { path: '/learning',      end: false, label: '学习资料',   icon: BookOpen },
  { path: '/video-workflow',end: false, label: '视频工作流', icon: Video },
  { path: '/check-in',      end: false, label: '学习通签到', icon: ClipboardCheck },
  { path: '/mindmap',       end: false, label: '思维导图',   icon: Network },
  { path: '/baby-care',     end: false, label: '宝宝护理',   icon: Baby },
];

export default function Layout() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-4 py-2.5 border-b border-white/10 sticky top-0 z-40"
              style={{
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                background: 'rgba(16,16,20,0.75)',
              }}>
        <div className="max-w-[1200px] mx-auto flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-[9px] flex items-center justify-center"
                 style={{
                   background: 'linear-gradient(140deg, #3AD4E4, #1BABB9)',
                   boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 6px 18px -6px rgba(34,195,214,0.55)',
                   color: '#04252B',
                 }}>
              <Layers className="h-4 w-4" strokeWidth={2.1} />
            </div>
            <div className="font-semibold text-[13.5px] tracking-tight">LocalHub</div>
          </div>

          <nav className="flex items-center gap-1 ml-4 flex-wrap">
            {nav.map(({ path, end, label, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                end={end}
                onClick={(e) => { if (e.currentTarget.matches('.active')) { e.preventDefault(); navigate(path); } }}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                    isActive
                      ? 'text-white bg-white/[0.085]'
                      : 'text-white/55 hover:text-white hover:bg-white/[0.04]'
                  }`
                }
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.6} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto text-[11px] text-white/40 font-mono hidden sm:block tabular-nums">
            {new Date().getMonth() + 1}月{new Date().getDate()}日
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1200px] mx-auto p-5">
        <Outlet />
      </main>
    </div>
  );
}

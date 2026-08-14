import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  KeyRound, Link, Lightbulb, BookOpen, ClipboardCheck, Video, Network,
  ArrowRight, Database, Cpu, HardDrive,
} from 'lucide-react';

const statCards = [
  { key: 'api-keys',           label: 'API 密钥', icon: KeyRound,     route: '/api-keys' },
  { key: 'web-links',          label: '网页链接', icon: Link,         route: '/web-links' },
  { key: 'prompts',            label: '提示词',   icon: Lightbulb,    route: '/prompts' },
  { key: 'learning-materials', label: '学习资料', icon: BookOpen,     route: '/learning' },
];

const quickCards = [
  { to: '/api-keys',       label: 'API 密钥',       desc: '集中存储各大模型 API',         icon: KeyRound },
  { to: '/web-links',      label: '网页链接',       desc: '收藏常用网页，分类管理',        icon: Link },
  { to: '/check-in',       label: '学习通签到',     desc: '调用本地签到引擎',              icon: ClipboardCheck },
  { to: '/video-workflow', label: '视频工作流',     desc: '基于 FFmpeg 的真实处理',        icon: Video },
  { to: '/mindmap',        label: '思维导图',       desc: '源站 1:1 还原 · 独立服务',     icon: Network },
  { to: '/prompts',        label: '提示词库',       desc: '管理 AI 提示词模板',            icon: Lightbulb },
  { to: '/learning',       label: '学习资料',       desc: '笔记 + 思维导图',               icon: BookOpen },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ 'api-keys': 0, 'web-links': 0, 'prompts': 0, 'learning-materials': 0 });
  const [loaded, setLoaded] = useState(false);
  const [ffmpeg, setFfmpeg] = useState(null);
  const [checkinEngine, setCheckinEngine] = useState(null);
  const [sysInfo, setSysInfo] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const keys = Object.keys(stats);
        const results = await Promise.all(keys.map((k) => window.electronAPI.loadData(k).catch(() => null)));
        const next = {};
        keys.forEach((k, i) => { next[k] = Array.isArray(results[i]) ? results[i].length : 0; });
        setStats(next);
      } catch (err) { console.error('stats failed:', err); }
      finally { setLoaded(true); }
      try {
        const [ff, ce, si] = await Promise.all([
          window.electronAPI.detectFfmpeg().catch(() => null),
          window.electronAPI.getCheckinEnginePath().catch(() => null),
          window.electronAPI.systemInfo().catch(() => null),
        ]);
        setFfmpeg(ff); setCheckinEngine(ce); setSysInfo(si);
      } catch {}
    })();
  }, []);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 6) return '夜深了';
    if (h < 11) return '早上好';
    if (h < 14) return '中午好';
    if (h < 18) return '下午好';
    if (h < 22) return '晚上好';
    return '夜深了';
  })();

  return (
    <div className="space-y-5 pb-10">
      {/* Hero */}
      <section className="glass-static p-5 animate-slide-up">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="title-display text-[22px] tracking-tight leading-tight">{greeting}</h1>
            <p className="mt-1 text-white/50 text-[12.5px] leading-relaxed">
              你的个人本地全能中心 · 数据存放 D 盘 · 离线可用
            </p>
          </div>
          <div className="hidden md:flex items-center gap-3 text-[10.5px] text-white/35">
            <div className="flex items-center gap-1.5">
              <Database className="h-3 w-3" /><span className="font-mono">D:\LocalHub\data</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Cpu className="h-3 w-3" /><span>v{sysInfo?.electronVersion}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <HardDrive className="h-3 w-3" />
              <span>{sysInfo ? `${(sysInfo.freemem / 1024 ** 3).toFixed(0)}GB` : '—'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 统计卡 */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {statCards.map(({ key, label, icon: Icon, route }, idx) => (
          <div
            key={key}
            onClick={() => navigate(route)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate(route)}
            className="glass glass-hover p-4 cursor-pointer group animate-slide-up"
            style={{ animationDelay: `${0.04 + idx * 0.04}s` }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-[0.14em] font-semibold">{label}</p>
                <p className="mt-1.5 title-display text-[22px] tracking-tight leading-none">
                  {loaded ? stats[key] : <span className="inline-block skeleton w-8 h-6" />}
                </p>
              </div>
              <Icon className="h-4 w-4 text-white/35 group-hover:text-white/60 transition-colors" strokeWidth={1.6} />
            </div>
          </div>
        ))}
      </section>

      {/* 快捷入口 */}
      <section>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="title-display text-[13px] tracking-tight">快捷入口</h2>
          <span className="text-[10px] text-white/30 uppercase tracking-[0.14em]">{quickCards.length} 项</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {quickCards.map(({ to, label, desc, icon: Icon }, idx) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="glass glass-hover p-3.5 text-left animate-slide-up group flex items-center gap-3"
              style={{ animationDelay: `${0.2 + idx * 0.03}s` }}
            >
              <Icon className="h-4 w-4 text-white/55 group-hover:text-white shrink-0" strokeWidth={1.6} />
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-semibold text-white/90">{label}</div>
                <div className="text-[11px] text-white/40 truncate">{desc}</div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-white/25 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all shrink-0" strokeWidth={1.8} />
            </button>
          ))}
        </div>
      </section>

      {/* 系统状态 */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div className="glass glass-hover p-3.5 animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-[10px] text-white/40 uppercase tracking-[0.14em] font-semibold">FFmpeg</div>
              <div className="mt-1 text-[12.5px] font-medium">
                {ffmpeg ? <span className="text-emerald-300/90">已就绪</span> : <span className="text-amber-300/90">未检测</span>}
              </div>
              <div className="text-[10px] text-white/35 mt-0.5 truncate" title={ffmpeg?.path || ''}>
                {ffmpeg ? ffmpeg.version : '视频工作流需要 ffmpeg'}
              </div>
            </div>
            <div className={`status-dot ${ffmpeg ? 'ok' : 'err'}`} />
          </div>
        </div>
        <div className="glass glass-hover p-3.5 animate-slide-up" style={{ animationDelay: '0.45s' }}>
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-[10px] text-white/40 uppercase tracking-[0.14em] font-semibold">签到引擎</div>
              <div className="mt-1 text-[12.5px] font-medium">
                {checkinEngine ? <span className="text-emerald-300/90">已发现</span> : <span className="text-amber-300/90">未发现</span>}
              </div>
              <div className="text-[10px] text-white/35 mt-0.5 truncate" title={checkinEngine || ''}>
                {checkinEngine ? checkinEngine.replace(/^[A-Z]:\\/, '') : '需放置 superstar-checkin'}
              </div>
            </div>
            <div className={`status-dot ${checkinEngine ? 'ok' : 'warn'}`} />
          </div>
        </div>
        <div className="glass glass-hover p-3.5 animate-slide-up" style={{ animationDelay: '0.5s' }}>
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-[10px] text-white/40 uppercase tracking-[0.14em] font-semibold">数据存储</div>
              <div className="mt-1 text-[12.5px] font-mono font-medium text-cyan-300/80">D:\LocalHub\data</div>
              <div className="text-[10px] text-white/35 mt-0.5">
                {sysInfo ? `${sysInfo.cpus} 核 CPU` : '加载中…'}
              </div>
            </div>
            <HardDrive className="h-4 w-4 text-white/35" strokeWidth={1.6} />
          </div>
        </div>
      </section>
    </div>
  );
}

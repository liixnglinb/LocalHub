import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, ArrowRight } from 'lucide-react';
import claude from '../assets/logos/claude.png';
import openai from '../assets/logos/openai.png';
import deepseek from '../assets/logos/deepseek.png';
import qwen from '../assets/logos/qwen.png';
import kimi from '../assets/logos/kimi.png';

/**
 * LeaderboardFrame — AI 大模型排行榜（本地独立服务，BenchLM 数据）
 * 交互：
 * 1. 点侧边栏"AI排行榜" → 显示极简入口封面（含主流模型高清图标）
 * 2. 点击入口 → 懒启动 leaderboard 服务
 * 3. 单条横线加载动画 → iframe 缩放淡入
 */
const FEATURED_MODELS = [
  { src: claude, name: 'Claude' },
  { src: openai, name: 'ChatGPT' },
  { src: deepseek, name: 'DeepSeek' },
  { src: qwen, name: 'Qwen' },
  { src: kimi, name: 'Kimi' },
];

export default function LeaderboardFrame() {
  const [entered, setEntered] = useState(false);
  const [status, setStatus] = useState({ ready: false, port: 18881, url: null });
  const [frameLoaded, setFrameLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const iframeRef = useRef(null);
  const enteredAtRef = useRef(0);
  const mountedRef = useRef(false);

  const focusFrame = useCallback(() => {
    const w = iframeRef.current?.contentWindow;
    if (w) { try { w.focus(); } catch {} }
  }, []);

  const handleEnter = async () => {
    enteredAtRef.current = Date.now();
    setEntered(true);
    try {
      const s = await window.electronAPI?.leaderboardStart?.();
      if (s) setStatus(s);
    } catch {}
  };

  useEffect(() => {
    mountedRef.current = true;
    if (!entered || status.ready) return;
    const poll = setInterval(async () => {
      try {
        const s = await window.electronAPI?.leaderboardStatus?.();
        if (s) setStatus(s);
        if (s?.ready) clearInterval(poll);
      } catch {}
    }, 600);
    const timer = setTimeout(() => clearInterval(poll), 30000);
    return () => {
      mountedRef.current = false;
      clearInterval(poll);
      clearTimeout(timer);
    };
  }, [entered, status.ready]);

  const handleFrameLoad = () => {
    const elapsed = Date.now() - enteredAtRef.current;
    const wait = Math.max(0, 1200 - elapsed);
    setTimeout(() => {
      if (mountedRef.current) { setFrameLoaded(true); focusFrame(); }
    }, wait);
  };

  useEffect(() => {
    if (!frameLoaded) return;
    const t = setTimeout(() => focusFrame(), 160);
    return () => clearTimeout(t);
  }, [frameLoaded, focusFrame]);

  /* ① 入口封面 */
  if (!entered) {
    return (
      <div
        className="relative flex flex-col items-center justify-center overflow-hidden cursor-pointer select-none"
        style={{ height: 'calc(100vh - 56px)', minHeight: 500, background: 'var(--bg-0)' }}
        onClick={handleEnter}
        title="点击进入 AI 排行榜"
      >
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{
          background: 'repeating-linear-gradient(-45deg, transparent, transparent 40px, rgba(255,255,255,0.3) 40px, rgba(255,255,255,0.3) 41px)',
        }} />
        <div className="relative flex flex-col items-center px-10 py-12 transition-all duration-300" style={{ animation: 'fadeIn 0.4s ease both' }}>
          {/* 主流模型高清图标 */}
          <div className="flex items-center justify-center gap-3 mb-6 flex-wrap">
            {FEATURED_MODELS.map((m) => (
              <div
                key={m.name}
                title={m.name}
                className="flex items-center justify-center transition-transform duration-300"
                style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--bg-2)', border: '1px solid var(--line-hair)', boxShadow: 'var(--elev-1)', overflow: 'hidden' }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.borderColor = 'rgba(34,195,214,0.3)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = 'var(--line-hair)'; }}
              >
                <img src={m.src} alt={m.name} className="h-8 w-8 object-contain" />
              </div>
            ))}
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-white/90 mb-2">AI 大模型排行榜</h2>
          <p className="text-[13px] text-white/45 text-center max-w-xs leading-relaxed mb-8">
            本地独立服务 · 综合 / 代码 / 数学 / Agent / 推理 / 知识 / 多模态能力榜
          </p>
          <div
            className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-[13px] font-medium transition-all duration-200"
            style={{ background: 'var(--bg-2)', border: '1px solid var(--line-hair)', color: 'var(--text-1)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-2)'; e.currentTarget.style.borderColor = 'var(--line-hair)'; }}
          >
            <span>点击进入</span>
            <ArrowRight className="h-3.5 w-3.5 text-white/40" strokeWidth={1.8} />
          </div>
        </div>
        <div className="pointer-events-none absolute left-1/4 right-1/4 bottom-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--line), transparent)' }} />
      </div>
    );
  }

  /* ② 启动失败 */
  if (loadFailed && !status.ready) {
    return (
      <div className="glass flex flex-col items-center justify-center py-20 animate-fade-in" style={{ minHeight: 420 }}>
        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/5">
          <RefreshCw className="h-6 w-6 text-white/40" strokeWidth={1.6} />
        </div>
        <div className="text-[13px] font-medium text-white/80">AI 排行榜服务启动失败</div>
        <button onClick={() => { setLoadFailed(false); handleEnter(); }} className="btn btn-default text-xs mt-4">
          <RefreshCw className="h-3 w-3" /> 重试
        </button>
      </div>
    );
  }

  /* ③ 加载中 + 画布 */
  return (
    <div
      className="overflow-hidden relative"
      style={{ height: 'calc(100vh - 56px)', minHeight: 500, background: 'var(--bg-0)' }}
      onPointerDown={() => { if (frameLoaded) focusFrame(); }}
    >
      <iframe
        ref={iframeRef}
        src={status.url || 'about:blank'}
        title="AI 大模型排行榜"
        sandbox="allow-scripts allow-same-origin allow-popups"
        style={{
          width: '100%', height: '100%', border: 'none', display: 'block', background: 'var(--bg-0)',
          opacity: frameLoaded ? 1 : 0, transform: frameLoaded ? 'scale(1)' : 'scale(0.985)',
          transition: 'opacity 0.45s cubic-bezier(0.2, 0.7, 0.2, 1), transform 0.55s cubic-bezier(0.2, 0.7, 0.2, 1)',
        }}
        onLoad={handleFrameLoad}
      />
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ background: 'var(--bg-0)', opacity: frameLoaded ? 0 : 1, transition: 'opacity 0.4s cubic-bezier(0.2, 0.7, 0.2, 1) 0.1s', zIndex: 10, pointerEvents: frameLoaded ? 'none' : 'auto' }}
      >
        <div className="h-[3px] w-56 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div style={{ width: '42%', height: '100%', background: 'linear-gradient(90deg, transparent, #22C3D6, transparent)', animation: 'canvas-bar 1.6s ease-in-out infinite' }} />
        </div>
        <div className="mt-4 text-[12px] text-white/45">正在加载 AI 排行榜…</div>
      </div>
    </div>
  );
}
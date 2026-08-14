import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PanelsTopLeft, RefreshCw, Play, ArrowRight } from 'lucide-react';

/**
 * CanvasFrame — 嵌入本地 canvas-app 视频工作流画布（1:1 保真，不改 UI/逻辑）
 * 交互（2026-08-05 优化）：
 * 1. 点侧边栏"视频工作流" → 右侧显示极简入口封面
 * 2. 点击入口 → 开始轮询本地画布服务并加载 iframe
 * 3. 加载动画：单条横线向右流动
 */
export default function CanvasFrame() {
  const [entered, setEntered] = useState(false);
  const [status, setStatus] = useState({ ready: false, port: 0, url: null, dataDir: '' });
  const [checked, setChecked] = useState(false);
  const [frameLoaded, setFrameLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const pollRef = useRef(null);
  const iframeRef = useRef(null);
  const mountedRef = useRef(false);

  const focusCanvas = useCallback(() => {
    const w = iframeRef.current?.contentWindow;
    if (w) { try { w.focus(); } catch {} }
  }, []);

  const pollStatus = useCallback(async () => {
    try {
      const s = await window.electronAPI?.canvasStatus?.();
      if (s) {
        setStatus(s);
        setChecked(true);
        return s.ready;
      }
      setChecked(true);
      return false;
    } catch {
      setChecked(true);
      return false;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (!entered) return;
    pollStatus();
    pollRef.current = setInterval(async () => {
      const ready = await pollStatus();
      if (ready) clearInterval(pollRef.current);
    }, 800);
    const timer = setTimeout(() => { if (pollRef.current) clearInterval(pollRef.current); }, 30000);
    return () => {
      mountedRef.current = false;
      if (pollRef.current) clearInterval(pollRef.current);
      clearTimeout(timer);
    };
  }, [entered, pollStatus]);

  const handleRetry = () => { setChecked(false); setFrameLoaded(false); setLoadFailed(false); pollStatus(); };

  const enteredAtRef = useRef(0);
  const handleEnter = () => {
    enteredAtRef.current = Date.now();
    setEntered(true);
  };
  const handleFrameLoad = (_e) => {
    const elapsed = Date.now() - enteredAtRef.current;
    const wait = Math.max(0, 1200 - elapsed);
    setTimeout(() => {
      if (mountedRef.current) { setFrameLoaded(true); focusCanvas(); }
    }, wait);
  };

  useEffect(() => {
    if (!frameLoaded) return;
    const t = setTimeout(() => focusCanvas(), 160);
    return () => clearTimeout(t);
  }, [frameLoaded, focusCanvas]);

  useEffect(() => {
    if (!entered || !status.ready || frameLoaded) return;
    const t = setTimeout(() => { if (!frameLoaded) setLoadFailed(true); }, 15000);
    return () => clearTimeout(t);
  }, [entered, status.ready, frameLoaded]);

  /* ① 入口封面：简约大方 */
  if (!entered) {
    return (
      <div
        className="relative flex flex-col items-center justify-center overflow-hidden cursor-pointer select-none"
        style={{ height: 'calc(100vh - 56px)', minHeight: 500, background: 'var(--bg-0)' }}
        onClick={handleEnter}
        title="点击进入画布"
      >
        {/* 极简背景装饰：两道极淡的斜向线条 */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{
          background: `repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(255,255,255,0.3) 40px, rgba(255,255,255,0.3) 41px)`,
        }} />

        {/* 入口卡片 */}
        <div
          className="relative flex flex-col items-center px-10 py-12 transition-all duration-300"
          style={{ animation: 'fadeIn 0.4s ease both' }}
        >
          {/* 图标容器 */}
          <div
            className="flex items-center justify-center mb-6 transition-transform duration-300"
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: 'var(--bg-2)',
              border: '1px solid var(--line-hair)',
              boxShadow: 'var(--elev-1)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.borderColor = 'rgba(34,195,214,0.3)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = 'var(--line-hair)'; }}
          >
            <Play className="h-7 w-7 text-white/80" strokeWidth={1.5} fill="currentColor" />
          </div>

          {/* 标题 */}
          <h2 className="text-xl font-semibold tracking-tight text-white/90 mb-2">视频工作流</h2>

          {/* 描述 */}
          <p className="text-[13px] text-white/45 text-center max-w-xs leading-relaxed mb-8">
            本地画布服务 · AI 视频生成工作台
          </p>

          {/* 进入按钮 */}
          <div
            className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-[13px] font-medium transition-all duration-200"
            style={{
              background: 'var(--bg-2)',
              border: '1px solid var(--line-hair)',
              color: 'var(--text-1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--hover)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--bg-2)';
              e.currentTarget.style.borderColor = 'var(--line-hair)';
            }}
          >
            <span>点击进入</span>
            <ArrowRight className="h-3.5 w-3.5 text-white/40" strokeWidth={1.8} />
          </div>
        </div>

        {/* 底部极细装饰线 */}
        <div className="pointer-events-none absolute left-1/4 right-1/4 bottom-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--line), transparent)' }} />
      </div>
    );
  }

  if (!checked) {
    return (
      <div className="glass flex flex-col items-center justify-center py-24 animate-fade-in" style={{ minHeight: 420 }}>
        <div className="spinner mb-4" />
        <div className="text-[13px] text-white/70">正在连接本地画布服务…</div>
        <div className="mt-1 text-[11px] text-white/35">服务启动中，请稍候</div>
      </div>
    );
  }

  if (!status.ready || !status.url) {
    return (
      <div className="glass flex flex-col items-center justify-center py-20 animate-fade-in" style={{ minHeight: 420 }}>
        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/5">
          <PanelsTopLeft className="h-6 w-6 text-white/40" strokeWidth={1.6} />
        </div>
        <div className="text-[13px] font-medium text-white/80">本地画布服务未就绪</div>
        <div className="mt-1 text-[11px] text-white/35 max-w-sm text-center">
          服务启动超时或异常，请重试；若持续失败请重启应用
        </div>
        <button onClick={handleRetry} className="btn btn-default text-xs mt-4">
          <RefreshCw className="h-3 w-3" /> 重试
        </button>
      </div>
    );
  }

  if (loadFailed && !frameLoaded) {
    return (
      <div className="glass flex flex-col items-center justify-center py-20 animate-fade-in" style={{ minHeight: 420 }}>
        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/5">
          <PanelsTopLeft className="h-6 w-6 text-white/40" strokeWidth={1.6} />
        </div>
        <div className="text-[13px] font-medium text-white/80">画布页面加载异常</div>
        <div className="mt-1 text-[11px] text-white/35 max-w-sm text-center">
          服务已启动但页面响应超时，请重试；若持续失败请重启应用
        </div>
        <button onClick={handleRetry} className="btn btn-default text-xs mt-4">
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
      onPointerDown={() => { if (frameLoaded) focusCanvas(); }}
    >
      <iframe
        ref={iframeRef}
        src={status.url}
        title="Canvas 视频工作流"
        sandbox="allow-scripts allow-same-origin allow-popups"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
          background: 'var(--bg-0)',
          opacity: frameLoaded ? 1 : 0,
          transform: frameLoaded ? 'scale(1)' : 'scale(0.985)',
          transition: 'opacity 0.45s cubic-bezier(0.2, 0.7, 0.2, 1), transform 0.55s cubic-bezier(0.2, 0.7, 0.2, 1)',
        }}
        onLoad={handleFrameLoad}
      />

      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{
          background: 'var(--bg-0)',
          opacity: frameLoaded ? 0 : 1,
          transition: 'opacity 0.4s cubic-bezier(0.2, 0.7, 0.2, 1) 0.1s',
          zIndex: 10,
          pointerEvents: frameLoaded ? 'none' : 'auto',
        }}
      >
        <div className="h-[3px] w-56 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div
            style={{
              width: '42%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, #22C3D6, transparent)',
              animation: 'canvas-bar 1.6s ease-in-out infinite',
            }}
          />
        </div>
        <div className="mt-4 text-[12px] text-white/45">正在加载画布…</div>
      </div>
    </div>
  );
}
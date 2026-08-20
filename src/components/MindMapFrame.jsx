import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * MindMapFrame — 独立思维导图（全屏嵌入 /mindmap-app/）
 * 进入即自动加载，无需点击进入。
 */
export default function MindMapFrame() {
  const [status, setStatus] = useState({ ready: false, port: 18880, url: null });
  const [frameLoaded, setFrameLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const iframeRef = useRef(null);
  const mountedRef = useRef(false);

  /* 进入即获取地址 */
  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      try {
        const s = await window.electronAPI?.mindmapStatus?.();
        if (s) setStatus(s);
      } catch {}
    })();
    return () => { mountedRef.current = false; };
  }, []);

  /* 未就绪时轮询 */
  useEffect(() => {
    if (status.ready) return;
    const poll = setInterval(async () => {
      try {
        const s = await window.electronAPI?.mindmapStatus?.();
        if (s) setStatus(s);
        if (s?.ready) clearInterval(poll);
      } catch {}
    }, 600);
    const timer = setTimeout(() => clearInterval(poll), 30000);
    return () => { clearInterval(poll); clearTimeout(timer); };
  }, [status.ready]);

  const handleFrameLoad = () => {
    if (mountedRef.current) setFrameLoaded(true);
  };

  if (loadFailed && !status.ready) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF' }}>
        <div style={{ color: '#111111', fontSize: 14, fontWeight: 500 }}>思维导图服务启动失败</div>
        <button
          onClick={() => { setLoadFailed(false); window.location.reload(); }}
          style={{ marginTop: 16, padding: '8px 16px', borderRadius: 10, border: '1px solid #ECECF0', background: '#FFFFFF', color: '#111111', fontSize: 13, cursor: 'pointer' }}
        >
          <RefreshCw size={14} /> 重试
        </button>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', width: '100%', position: 'relative', background: '#FFFFFF' }}>
      <iframe
        ref={iframeRef}
        src={status.url || 'about:blank'}
        title="思维导图"
        sandbox="allow-scripts allow-same-origin allow-popups"
        style={{
          width: '100%', height: '100%', border: 'none', display: 'block',
          opacity: frameLoaded ? 1 : 0,
          transition: 'opacity 0.4s ease',
        }}
        onLoad={handleFrameLoad}
      />
      {!frameLoaded && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF' }}>
          <div style={{ color: '#9A9AA3', fontSize: 13 }}>正在加载思维导图…</div>
        </div>
      )}
    </div>
  );
}
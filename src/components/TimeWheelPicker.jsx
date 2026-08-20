import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Clock, ChevronUp, ChevronDown } from 'lucide-react';

/**
 * TimeWheelPicker — 自定义滚轮式时间选择器（高保真深色版）
 * 规范（用户指定）：
 * - 触发按钮：时钟图标 + 深黑底白字，等宽数字
 * - 下拉面板：纯黑背景 rgba(16,16,18,0.96) + 深灰边框 + 青色环境光晕，悬浮层次感
 * - 时/分两列垂直滚轮：未选中数字带轻微运动模糊（触控滚轮质感），当前选中值品牌紫高亮 + 发光
 * - 白色无衬线字体；上下箭头微调；点击数字跳转；确定后生效
 */
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const ACCENT = 'var(--accent)';      // 品牌紫

function parseTime(v) {
  const [h = 8, m = 0] = String(v || '08:00').split(':').map((n) => parseInt(n, 10) || 0);
  return { h: Math.max(0, Math.min(23, h)), m: Math.max(0, Math.min(59, m)) };
}

function WheelColumn({ values, index, onChange, pad = false }) {
  const rowH = 40;              // 每行高度
  const visible = 5;            // 可见行数
  const center = 2;             // 中间行下标
  const accumRef = useRef(0);

  const handleWheel = (e) => {
    e.preventDefault();
    accumRef.current += e.deltaY;
    const step = Math.round(accumRef.current / 48);
    if (step !== 0) {
      accumRef.current = 0;
      const next = Math.max(0, Math.min(values.length - 1, index + step));
      if (next !== index) onChange(next);
    }
  };

  return (
    <div
      className="relative select-none overflow-hidden"
      style={{ height: rowH * visible, width: 58 }}
      onWheel={handleWheel}
    >
      {/* 滚动的数字列表（整体位移，模拟真实滚轮滑动） */}
      <div
        style={{
          transform: `translateY(${center * rowH - index * rowH}px)`,
          transition: 'transform 0.18s cubic-bezier(0.2, 0.7, 0.2, 1)',
        }}
      >
        {values.map((v, i) => {
          const dist = Math.abs(i - index);
          const isSel = i === index;
          // 运动模糊质感：离选中越远越模糊、越透明
          let blur = 0, opacity = 0.42, fontSize = 13;
          if (dist === 1) { blur = 0.8; opacity = 0.55; fontSize = 13.5; }
          if (dist === 2) { blur = 1.8; opacity = 0.28; fontSize = 12.5; }
          return (
            <div
              key={v}
              onClick={() => onChange(i)}
              style={{
                height: rowH,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isSel ? 18 : fontSize,
                fontWeight: isSel ? 700 : 400,
                color: isSel ? 'var(--text-1)' : 'var(--text-3)',   // 选中：主文字色，清晰可读
                opacity,
                filter: `blur(${blur}px)`,
                fontVariantNumeric: 'tabular-nums',
                cursor: 'pointer',
                textShadow: isSel ? `0 0 8px rgba(124,92,255,0.45)` : 'none', // 单层小范围微光，不糊字
                transition: 'all 0.18s cubic-bezier(0.2, 0.7, 0.2, 1)',
              }}
            >
              {pad ? String(v).padStart(2, '0') : String(v)}
            </div>
          );
        })}
      </div>
      {/* 中间选中行高亮条（电光蓝描边） */}
      <div
        className="pointer-events-none absolute left-0 right-0"
        style={{
          top: center * rowH,
          height: rowH,
          background: 'rgba(124,92,255,0.07)',
          borderRadius: 10,
          borderTop: `1px solid rgba(124,92,255,0.30)`,
          borderBottom: `1px solid rgba(124,92,255,0.30)`,
          boxShadow: 'inset 0 0 18px -6px rgba(124,92,255,0.35)',
        }}
      />
      {/* 上/下箭头 */}
      <button
        type="button"
        onClick={() => onChange(Math.max(0, index - 1))}
        className="absolute left-0 right-0 flex items-center justify-center text-[var(--text-3)] hover:text-[var(--accent)] transition-colors"
        style={{ top: 0, height: rowH - 10, background: 'transparent' }}
        tabIndex={-1}
      >
        <ChevronUp className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
      <button
        type="button"
        onClick={() => onChange(Math.min(values.length - 1, index + 1))}
        className="absolute left-0 right-0 flex items-center justify-center text-[var(--text-3)] hover:text-[var(--accent)] transition-colors"
        style={{ bottom: 0, height: rowH - 10, background: 'transparent' }}
        tabIndex={-1}
      >
        <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
    </div>
  );
}

export default function TimeWheelPicker({ value, onChange, width = '100%' }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const [draft, setDraft] = useState({ h: 8, m: 0 });
  const wrapRef = useRef(null);
  const popupRef = useRef(null);

  const openMenu = () => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setDraft(parseTime(value));
    const estH = 5 * 40 + 62; // 滚轮区 + 标题 + 底部按钮
    setPos({
      left: Math.max(8, r.right - 208),
      top: Math.max(8, r.top - estH - 8),
    });
    setOpen(true);
  };

  const commit = () => {
    const v = `${String(draft.h).padStart(2, '0')}:${String(draft.m).padStart(2, '0')}`;
    onChange?.(v);
    setOpen(false);
  };

  // 点击外部关闭
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (popupRef.current?.contains(e.target)) return;
      if (wrapRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const { h, m } = parseTime(value);

  return (
    <div ref={wrapRef} className="relative inline-block" style={{ width }}>
      {/* 触发按钮：时钟图标 + 深黑底白字 */}
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openMenu())}
        className="flex items-center justify-center gap-2 px-3 py-2 text-[14px] text-[var(--text-1)] transition-all"
        style={{
          background: 'var(--bg-1)',
          border: '1px solid var(--line)',
          borderRadius: 10,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '0.08em',
          cursor: 'pointer',
          width: '100%',
          boxShadow: 'var(--shadow-inset)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(124,92,255,0.5)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; }}
      >
        <Clock className="h-3.5 w-3.5" strokeWidth={1.8} style={{ color: ACCENT }} />
        {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}
      </button>

      {/* 下拉面板：纯黑 + 深灰边框 + 青色环境光晕 */}
      {open && pos && (
        <div
          ref={popupRef}
          style={{
            position: 'fixed',
            left: pos.left,
            top: pos.top,
            width: 208,
            background: 'var(--bg-1)',
            backdropFilter: 'blur(20px) saturate(120%)',
            WebkitBackdropFilter: 'blur(20px) saturate(120%)',
            borderRadius: 16,
            border: '1px solid var(--line)',
            boxShadow:
              'var(--shadow-modal), 0 0 26px -8px rgba(124,92,255,0.25), inset 0 1px 0 rgba(255,255,255,0.6)',
            zIndex: 9999,
            padding: '14px 14px 10px',
          }}
          className="animate-scale-in"
        >
          {/* 标题 */}
          <div className="mb-2 flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-[0.22em] font-semibold" style={{ color: 'var(--text-3)' }}>
            <Clock className="h-3 w-3" style={{ color: ACCENT }} strokeWidth={1.8} />
            选择时间
          </div>

          {/* 时 : 分 滚轮 */}
          <div className="flex items-center justify-center">
            <WheelColumn values={HOURS} index={draft.h} onChange={(i) => setDraft((d) => ({ ...d, h: i }))} pad />
            <span className="text-[17px] font-semibold mx-1" style={{ color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>:</span>
            <WheelColumn values={MINUTES} index={draft.m} onChange={(i) => setDraft((d) => ({ ...d, m: i }))} pad />
          </div>

          {/* 操作按钮 */}
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 py-1.5 rounded-[8px] text-[12px] text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors"
              style={{ background: 'var(--hover)' }}
            >
              取消
            </button>
            <button
              type="button"
              onClick={commit}
              className="flex-1 py-1.5 rounded-[8px] text-[12px] font-medium text-[var(--text-btn)] transition-colors"
              style={{ background: 'var(--accent)' }}
            >
              确定
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar, Clock } from 'lucide-react';

/**
 * DateTimePicker — 自定义滚轮式日期时间选择器
 * - mode: 'datetime' | 'date' （date 模式只选年月日，datetime 再增强时分）
 * - 触发按钮：图标 + 主题色，等宽数字
 * - 下拉面板：明亮浅色玻璃背景 + 柔边框 + 主题色环境光晕
 * - 多列滚轮：以 draft 为唯一数据源；选中项深蓝灰高亮，未选中浅灰弱化
 *
 * 设计要点（修复旧版问题）：
 *   a. 滚轮列的选中索引一律基于 draft，而非外部 value，避免显示与实际脱节；
 *   b. 切换年/月时自动把日 clamp 到当月实际天数，杜绝 2/31 这类非法日期；
 *   c. 每个滚动列的原生 wheel 监听只绑定一次，用 ref 持有最新状态，避免频繁重复绑定；
 *   d. 输出字符统一成 "YYYY-MM-DD[THH:MM]"。
 */

function pad(n) { return String(n).padStart(2, '0'); }

/** 解析 value（YYYY-MM-DD 或 YYYY-MM-DDTHH:MM）到 {y,m,d,h,min} */
function parseValue(v) {
  const str = String(v || '');
  const dt = new Date(str);
  const base = !Number.isNaN(dt.getTime()) ? dt : new Date();
  return {
    y: base.getFullYear(),
    m: base.getMonth() + 1,
    d: base.getDate(),
    h: base.getHours(),
    min: base.getMinutes(),
  };
}

function daysInMonth(y, m) { return new Date(y, m, 0).getDate(); }

/** 把 draft 的 day 收紧到当月合法范围 */
function normalizeDraft(d) {
  const max = daysInMonth(d.y, d.m);
  return { ...d, d: Math.min(d.d, max) };
}

/**
 * 滚轮列
 * - values: 候选值数组
 * - selected: 当前选中的值（value 而非 index，由外部 draft 决定）
 * - onSelect(nextValue): 用户把该列滚到 / 点到新值时回调
 */
function WheelColumn({ values, selected, onSelect, padZero = false, narrow = false }) {
  const rowH = 40;
  const visible = 5;
  const center = 2;
  const elRef = useRef(null);
  const accum = useRef(0);
  // 渲染期间持续更新最新引用，供一次性绑定的原生监听读取（避免闭包过期）
  const stateRef = useRef({});
  stateRef.current = { values, selected, onSelect };

  const selIdx = Math.max(0, values.indexOf(selected));

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const { values: vs, selected: sel, onSelect: cb } = stateRef.current;
      let idx = vs.indexOf(sel);
      if (idx < 0) idx = 0;
      accum.current += e.deltaY;
      const step = Math.round(accum.current / 48);
      if (step === 0) return;
      accum.current = 0;
      const next = Math.max(0, Math.min(vs.length - 1, idx + step));
      if (next !== idx) cb(vs[next]);
    };
    const onKey = (e) => {
      const { values: vs, selected: sel, onSelect: cb } = stateRef.current;
      let idx = vs.indexOf(sel);
      if (idx < 0) idx = 0;
      let next = -1;
      if (e.key === 'ArrowUp') next = Math.max(0, idx - 1);
      else if (e.key === 'ArrowDown') next = Math.min(vs.length - 1, idx + 1);
      if (next === idx) { e.preventDefault(); cb(vs[next]); }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('keydown', onKey);
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('keydown', onKey);
    };
  }, []);

  const width = narrow ? 46 : 58;

  return (
    <div
      ref={elRef}
      tabIndex={0}
      className="relative select-none overflow-hidden outline-none"
      style={{ height: rowH * visible, width }}
    >
      {/* 每一行绝对定位，仅凭容器位移把选中行带到中心，行数再多也稳定 */}
      <div
        className="absolute left-0 right-0 top-0"
        style={{
          transform: `translateY(${center * rowH - selIdx * rowH}px)`,
          willChange: 'transform',
          zIndex: 1,
          transition: 'transform .18s cubic-bezier(.2,.7,.2,1)',
        }}
      >
        {values.map((v, i) => {
          const dist = Math.abs(i - selIdx);
          const isSel = i === selIdx;
          let blur = 0, opacity = 0.4, fontSize = 13;
          if (isSel) { opacity = 1; blur = 0; }
          else if (dist === 1) { blur = 0.7; opacity = 0.5; fontSize = 13.2; }
          else if (dist === 2) { blur = 1.4; opacity = 0.28; fontSize = 12.5; }
          return (
            <div
              key={i}
              onClick={() => onSelect(v)}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: i * rowH,
                height: rowH,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isSel ? 18 : fontSize,
                fontWeight: isSel ? 700 : 400,
                color: isSel ? '#2B3A4B' : '#AAB7C4',
                opacity,
                filter: `blur(${blur}px)`,
                fontVariantNumeric: 'tabular-nums',
                cursor: 'pointer',
                textShadow: 'none',
              }}
            >
              {padZero ? pad(v) : String(v)}
            </div>
          );
        })}
      </div>
      {/* 选中条（浅蓝，不拦截点击） */}
      <div
        className="pointer-events-none absolute left-0 right-0"
        style={{
          top: center * rowH,
          height: rowH,
          background: 'linear-gradient(180deg, #F0F6FF 0%, #E8F0FF 100%)',
          borderRadius: 10,
          borderTop: '1px solid #E0E6ED',
          borderBottom: '1px solid #E0E6ED',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}
      />
      {/* 上/下渐变遮罩（不拦截点击） */}
      <div
        className="pointer-events-none absolute left-0 right-0"
        style={{ top: 0, height: rowH - 30, background: 'linear-gradient(180deg, #F5F7FA 0%, rgba(245,247,250,0) 100%)' }}
      />
      <div
        className="pointer-events-none absolute left-0 right-0"
        style={{ bottom: 0, height: rowH - 30, background: 'linear-gradient(0deg, #F5F7FA 0%, rgba(245,247,250,0) 100%)' }}
      />
    </div>
  );
}

export default function DateTimePicker({ value, onChange, mode = 'datetime', width = '100%' }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const [draft, setDraft] = useState(() => normalizeDraft(parseValue(value)));
  const wrapRef = useRef(null);
  const popupRef = useRef(null);
  const onRef = useRef(onChange);
  onRef.current = onChange;

  const isDate = mode === 'date';

  const years = useMemo(() => {
    const now = new Date().getFullYear();
    return Array.from({ length: 11 }, (_, i) => now - 5 + i); // 今年往前5年 → 往后5年
  }, []);
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
  const days = useMemo(() => Array.from({ length: daysInMonth(draft.y, draft.m) }, (_, i) => i + 1), [draft.y, draft.m]);
  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);

  const openMenu = () => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setDraft(normalizeDraft(parseValue(value)));
    const cols = isDate ? 3 : 5;
    const estW = cols * 58 + 40;
    const estH = 5 * 40 + 62;
    // 优先在上方展开，空间不足才转向下方
    let top = r.top - estH - 8;
    if (top < 8) top = r.bottom + 8;
    setPos({
      left: Math.max(8, r.right - estW),
      top: Math.max(8, top),
      width: estW,
    });
    setOpen(true);
  };

  const commit = () => {
    const d = normalizeDraft(draft);
    const base = isDate
      ? `${d.y}-${pad(d.m)}-${pad(d.d)}`
      : `${d.y}-${pad(d.m)}-${pad(d.d)}T${pad(d.h)}:${pad(d.min)}`;
    onRef.current?.(base);
    setOpen(false);
  };

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

  const cur = parseValue(value);
  const display = isDate
    ? `${cur.y}-${pad(cur.m)}-${pad(cur.d)}`
    : `${cur.m}/${cur.d} ${pad(cur.h)}:${pad(cur.min)}`;

  return (
    <div ref={wrapRef} className="relative inline-block" style={{ width }}>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openMenu())}
        className="flex items-center justify-between gap-2 px-3 py-2 text-[14px] text-[var(--text-1)] transition-all"
        style={{
          background: 'var(--bg-1)',
          border: '1px solid var(--line)',
          borderRadius: 10,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '0.04em',
          cursor: 'pointer',
          width: '100%',
          boxShadow: 'var(--shadow-inset)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(124,92,255,0.5)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; }}
      >
        <span className="truncate">{display}</span>
        {isDate
          ? <Calendar className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} style={{ color: 'var(--accent)' }} />
          : <Clock className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} style={{ color: 'var(--accent)' }} />}
      </button>

      {open && pos && (
        <div
          ref={popupRef}
          style={{
            position: 'fixed',
            left: pos.left,
            top: pos.top,
            width: pos.width,
            background: 'var(--bg-1)',
            backdropFilter: 'blur(20px) saturate(120%)',
            WebkitBackdropFilter: 'blur(20px) saturate(120%)',
            borderRadius: 16,
            border: '1px solid var(--line)',
            boxShadow: 'var(--shadow-modal), 0 0 26px -8px rgba(124,92,255,0.25), inset 0 1px 0 rgba(255,255,255,0.6)',
            zIndex: 9999,
            padding: '14px 14px 10px',
          }}
          className="animate-scale-in"
        >
          <div className="mb-2 flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-[0.22em] font-semibold" style={{ color: 'var(--text-3)' }}>
            {isDate
              ? <><Calendar className="h-3 w-3" style={{ color: 'var(--accent)' }} strokeWidth={1.8} />选择日期</>
              : <><Clock className="h-3 w-3" style={{ color: 'var(--accent)' }} strokeWidth={1.8} />选择日期与时间</>}
          </div>

          <div
            className="flex items-center justify-center"
            style={{ background: '#F5F7FA', borderRadius: 12, border: '1px solid #E0E6ED', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: '4px 8px' }}
          >
            <WheelColumn
              values={years}
              selected={draft.y}
              onSelect={(y) => setDraft((d) => normalizeDraft({ ...d, y, d: Math.min(d.d, daysInMonth(y, d.m)) }))}
            />
            <span className="text-[15px] font-semibold mx-0.5" style={{ color: 'rgba(15,23,42,0.18)', fontVariantNumeric: 'tabular-nums' }}>/</span>
            <WheelColumn
              values={months}
              selected={draft.m}
              onSelect={(m) => setDraft((d) => ({ ...d, m, d: Math.min(d.d, daysInMonth(d.y, m)) }))}
              padZero
              narrow
            />
            <span className="text-[15px] font-semibold mx-0.5" style={{ color: 'rgba(15,23,42,0.18)', fontVariantNumeric: 'tabular-nums' }}>/</span>
            <WheelColumn
              values={days}
              selected={draft.d}
              onSelect={(d) => setDraft((x) => ({ ...x, d }))}
              padZero
              narrow
            />

            {!isDate && (
              <>
                <span className="text-[15px] font-semibold mx-1" style={{ color: 'rgba(15,23,42,0.18)', fontVariantNumeric: 'tabular-nums' }}>·</span>
                <WheelColumn
                  values={hours}
                  selected={draft.h}
                  onSelect={(h) => setDraft((x) => ({ ...x, h }))}
                  padZero
                  narrow
                />
                <span className="text-[15px] font-semibold mx-0.5" style={{ color: 'rgba(15,23,42,0.18)', fontVariantNumeric: 'tabular-nums' }}>:</span>
                <WheelColumn
                  values={minutes}
                  selected={draft.min}
                  onSelect={(min) => setDraft((x) => ({ ...x, min }))}
                  padZero
                  narrow
                />
              </>
            )}
          </div>

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
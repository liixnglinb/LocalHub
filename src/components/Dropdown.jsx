import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Check, Lock, ChevronDown } from 'lucide-react';

// 全局 Dropdown 互斥：打开一个时自动关闭其他
const dropdownCloseEvents = new Set();
export function addDropdownCloseListener(fn) {
  dropdownCloseEvents.add(fn);
  return () => dropdownCloseEvents.delete(fn);
}
export function closeAllDropdowns(excludeFn) {
  dropdownCloseEvents.forEach((fn) => { if (fn !== excludeFn) fn(); });
}

/**
 * Dropdown 下拉菜单（LocalHub 统一组件）
 * 规范：
 * - 浮层：大圆角矩形，深色磨砂毛玻璃半透明 rgba(22,22,26,0.85) + 轻微模糊，无外发光、无过重阴影
 * - 浮层紧贴触发按钮下方（或上方，自动检测视口空间），禁止居中
 * - 条目垂直排列，无分割线；常态深色底白色文字；选中项右侧对勾√
 * - hover：整行浅灰高亮 rgba(255,255,255,0.12)，文字保持白色
 * - 交互：点击外部关闭；点击选项选择后关闭；滚动/窗口大小变化时自动关闭
 */
export default function Dropdown({
  value,
  options = [],           // [{ value, label, lock? }]
  onChange,
  placeholder = '请选择',
  className = '',
  width,                  // 触发按钮宽度（如 '160px'）
  popupWidth,             // 浮层宽度（默认跟随触发按钮）
  disabled = false,
  direction = 'down',       // 'down' 按钮正下方展开（默认） | 'up' 向上弹出
  trigger,                // 自定义触发元素（替代默认按钮）
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null); // { left, top, width }
  const wrapRef = useRef(null);
  const popupRef = useRef(null);
  const cleanupRef = useRef(null);

  const current = options.find((o) => o.value === value);

  // 关闭浮层
  const close = useCallback(() => setOpen(false), []);

  // 计算浮层位置
  const openMenu = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    // 打开前关闭其他 Dropdown 浮层（互斥）
    closeAllDropdowns(cleanupRef.current);
    const r = el.getBoundingClientRect();
    const estH = Math.min(320, options.length * 36 + 12);
    const pw = popupWidth ? parseInt(popupWidth, 10) : r.width;
    let left = Math.max(8, r.right - pw);
    let top;
    const dir = direction === 'down' ? 'down' : 'up';
    if (dir === 'down') {
      top = r.bottom + 6;
      if (top + estH > window.innerHeight - 8) {
        top = r.top - estH - 6; // 下方放不下 → 翻到上方
      }
    } else {
      top = r.top - estH - 6;
      if (top < 8) top = r.bottom + 6; // 上方放不下 → 翻到下方
    }
    setPos({
      left: Math.max(8, Math.min(left, window.innerWidth - pw - 8)),
      top: Math.max(8, top),
      width: pw,
    });
    setOpen(true);
  }, [options, popupWidth, direction]);

  // 注册/注销全局互斥监听器
  useEffect(() => {
    cleanupRef.current = addDropdownCloseListener(() => setOpen(false));
    return () => {
      if (cleanupRef.current) cleanupRef.current();
    };
  }, []);

  // 打开时监听滚动和 resize，自动关闭浮层
  useEffect(() => {
    if (!open) return;
    const onScroll = () => setOpen(false);
    const onResize = () => setOpen(false);
    // 监听所有可滚动容器的 scroll 事件
    window.addEventListener('scroll', onScroll, true); // 捕获阶段，捕获所有滚动
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  // 点击外部关闭
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (popupRef.current && popupRef.current.contains(e.target)) return;
      if (wrapRef.current && wrapRef.current.contains(e.target)) return;
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

  return (
    <div ref={wrapRef} className={`relative inline-block ${className}`} style={{ width: width || undefined }}>
      {/* 触发按钮（支持自定义 trigger） */}
      {trigger ? (
        <span
          onClick={() => (open ? setOpen(false) : openMenu())}
          className="inline-flex items-center justify-center cursor-pointer"
          style={{ color: 'inherit' }}
        >
          {trigger}
        </span>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => (open ? setOpen(false) : openMenu())}
          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-[13px] text-white/85 transition-colors disabled:opacity-42"
          style={{
            background: 'var(--bg-6)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            outline: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        >
          <span className="truncate">{current ? current.label : placeholder}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-white/40" strokeWidth={1.8} />
        </button>
      )}

      {/* 浮层（fixed 定位，紧贴触发按钮） */}
      {open && pos && (
        <div
          ref={popupRef}
          style={{
            position: 'fixed',
            left: pos.left,
            top: pos.top,
            width: pos.width,
            background: 'var(--bg-2)',
            backdropFilter: 'blur(18px) saturate(120%)',
            WebkitBackdropFilter: 'blur(18px) saturate(120%)',
            borderRadius: '14px',
            border: '1px solid var(--line-hair)',
            boxShadow: 'var(--elev-2)',
            zIndex: 9999,
            padding: '5px',
            maxHeight: '320px',
            overflowY: 'auto',
          }}
          className={`${direction === 'up' ? 'animate-slide-up' : 'animate-slide-down'}`}
        >
          {options.map((opt) => {
            const selected = opt.value === value;
            return (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`flex w-full items-center gap-2 rounded-[8px] px-3 py-[9px] text-left text-[13px] transition-colors ${
                  opt.danger ? 'text-red-300' : 'text-white'
                }`}
                style={{ background: 'transparent', minHeight: 38 }}
                onMouseEnter={(e) => { e.currentTarget.style.background = opt.danger ? 'rgba(255,90,90,0.12)' : 'rgba(255,255,255,0.10)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                {/* 锁图标（会员专属） */}
                {opt.lock && <Lock className="h-3.5 w-3.5 shrink-0 text-white/50" strokeWidth={1.8} />}
                <span className="flex-1 truncate">{opt.label}</span>
                {/* 选中对勾 */}
                {selected && <Check className="h-4 w-4 shrink-0 text-white" strokeWidth={2} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

import React, { useEffect } from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';

/**
 * ConfirmDialog — 深色高级质感确认弹窗（仿高端 SaaS / IDE）
 * 规范：
 * - 弹窗容器：var(--bg-3)（避免纯黑）+ 圆角 12px + var(--shadow-modal) + 细边框
 * - 标题 var(--text-1) 白色粗体；正文 var(--text-3) 左对齐
 * - 底部按钮右对齐："取消"幽灵按钮（var(--hover)）；"删除"柔和红 #ef4444 白字
 * - 点遮罩 / 取消 = 仅关闭；确认 = 关闭 + 执行回调（不可逆操作）
 */
export default function ConfirmDialog({
  open,
  title = '确认操作',
  message = '此操作不可恢复，确定继续吗？',
  confirmText = '删除',
  cancelText = '取消',
  danger = true,
  onConfirm,
  onCancel,
}) {
  // Esc 关闭
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onCancel?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onCancel} style={{ zIndex: 600, background: 'rgba(10,10,12,0.62)', backdropFilter: 'blur(6px)' }}>
      <div
        className="relative w-full max-w-[380px] animate-scale-in"
        style={{
          background: 'var(--bg-3)',
          borderRadius: 'var(--r-3)',
          border: '1px solid var(--line-hair)',
          boxShadow: 'var(--shadow-modal), inset 0 1px 0 rgba(255,255,255,0.05)',
          padding: '20px 22px 18px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 右上角关闭 */}
        <button
          onClick={onCancel}
          className="absolute top-3.5 right-3.5 p-1 rounded-md transition-colors"
          style={{ color: 'var(--text-3)', background: 'transparent' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-1)'; e.currentTarget.style.background = 'var(--hover-2)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = 'transparent'; }}
          title="关闭"
        >
          <X className="h-4 w-4" strokeWidth={1.8} />
        </button>

        {/* 图标 + 标题 */}
        <div className="flex items-start gap-3">
          <div
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
            style={{ background: danger ? 'rgba(239,68,68,0.12)' : 'rgba(34,195,214,0.10)', border: danger ? '1px solid rgba(239,68,68,0.28)' : '1px solid rgba(34,195,214,0.28)' }}
          >
            {danger ? (
              <Trash2 className="h-4 w-4" strokeWidth={1.8} style={{ color: '#ef4444' }} />
            ) : (
              <AlertTriangle className="h-4 w-4" strokeWidth={1.8} style={{ color: '#22c3d6' }} />
            )}
          </div>
          <div className="min-w-0 pt-0.5">
            <h3 className="text-[15px] font-semibold" style={{ color: 'var(--text-1)' }}>{title}</h3>
            <p className="mt-1.5 text-[12.5px] leading-relaxed" style={{ color: 'var(--text-3)' }}>{message}</p>
          </div>
        </div>

        {/* 底部按钮（右对齐） */}
        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            onClick={onCancel}
            className="px-4 py-[7px] rounded-[8px] text-[12.5px] font-medium transition-colors"
            style={{ background: 'var(--hover)', color: 'var(--text-1)', border: '1px solid var(--line)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover-2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--hover)'; }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            autoFocus
            className="px-4 py-[7px] rounded-[8px] text-[12.5px] font-semibold text-white transition-all"
            style={{
              background: '#ef4444',
              boxShadow: '0 2px 10px -2px rgba(239,68,68,0.5)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#f05252'; e.currentTarget.style.boxShadow = '0 2px 14px -2px rgba(239,68,68,0.65)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.boxShadow = '0 2px 10px -2px rgba(239,68,68,0.5)'; }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

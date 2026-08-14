import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  NotebookPen,
  Sparkles,
  Lightbulb,
  Save,
  Trash2,
  Check,
  CalendarDays,
  FileText,
  Clock,
  Wand2,
  ListTodo,
  BookOpen,
  Link2,
  CircleDot,
} from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';

// 笔记类型（内容种类丰富）
const NOTE_TYPES = [
  { id: 'thought', label: '想法', icon: Lightbulb, color: 'bg-amber-500/15 text-amber-300 border-amber-400/30' },
  { id: 'todo', label: '待办', icon: ListTodo, color: 'bg-sky-500/15 text-sky-300 border-sky-400/30' },
  { id: 'inspiration', label: '灵感', icon: Sparkles, color: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-400/30' },
  { id: 'knowledge', label: '知识', icon: BookOpen, color: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30' },
  { id: 'link', label: '链接', icon: Link2, color: 'bg-cyan-500/15 text-cyan-300 border-cyan-400/30' },
  { id: 'other', label: '其它', icon: CircleDot, color: 'bg-slate-500/15 text-slate-300 border-slate-400/30' },
];
const NOTE_TYPE_MAP = Object.fromEntries(NOTE_TYPES.map((t) => [t.id, t]));

const STORAGE_KEYS = {
  notes: 'smart-notes',
  daily: 'daily-thoughts',
};

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtTime(ts) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function SmartNotes() {
  const [activeTab, setActiveTab] = useState('assistant'); // assistant | daily

  /* ===== 智能笔记助手 ===== */
  const [drafts, setDrafts] = useState([]);        // 碎片想法列表（草稿）
  const [notes, setNotes] = useState([]);          // 已整理的结构化笔记
  const [draftInput, setDraftInput] = useState(''); // 当前输入框
  const [noteInput, setNoteInput] = useState('');   // 智能笔记输入（整理用）
  const [noteType, setNoteType] = useState('thought'); // 当前选择笔记类型

  /* ===== 每日想法 ===== */
  const [dailyInput, setDailyInput] = useState('');
  const [dailyList, setDailyList] = useState([]);   // 全部想法
  const [dailyDate, setDailyDate] = useState(todayStr());

  const saveOkRef = useRef(null);
  const flashTipRef = useRef(null);
  const [savedTip, setSavedTip] = useState(null);
  // 删除确认弹窗（与全站一致）：{ type, id? } | null
  const [confirmAction, setConfirmAction] = useState(null);

  // 打开删除确认
  const askDelete = (type, id) => setConfirmAction({ type, id });

  // 确认后执行
  const handleConfirmDelete = () => {
    const act = confirmAction;
    setConfirmAction(null);
    if (!act) return;
    switch (act.type) {
      case 'draft': handleDeleteDraft(act.id); break;
      case 'note': handleDeleteNote(act.id); break;
      case 'daily': handleDeleteDaily(act.id); break;
      case 'clear-drafts': setDrafts([]); persist('smart-notes', []); break;
      case 'clear-notes': setNotes([]); persist('smart-notes-structured', []); break;
      default: break;
    }
  };

  // 加载本地数据
  useEffect(() => {
    (async () => {
      try {
        const [d, n, di] = await Promise.all([
          window.electronAPI?.loadData?.('smart-notes'),
          window.electronAPI?.loadData?.('smart-notes-structured'),
          window.electronAPI?.loadData?.('daily-thoughts'),
        ]);
        if (Array.isArray(d)) setDrafts(d);
        if (Array.isArray(n)) setNotes(n);
        if (Array.isArray(di)) setDailyList(di);
      } catch {}
    })();
    return () => {
      if (flashTipRef.current) clearTimeout(flashTipRef.current);
    };
  }, []);

  const persist = useCallback(async (key, next) => {
    try { await window.electronAPI?.saveData?.(key, next); } catch {}
  }, []);

  const flashTip = (text) => {
    setSavedTip(text);
    if (flashTipRef.current) clearTimeout(flashTipRef.current);
    flashTipRef.current = setTimeout(() => setSavedTip(null), 1800);
  };

  /* ===== 智能笔记助手逻辑 ===== */
  // 保存碎片想法（草稿）
  const handleSaveDraft = async () => {
    const text = draftInput.trim();
    if (!text) return;
    const entry = { id: Date.now().toString(), text, createdAt: Date.now(), organized: false };
    const next = [entry, ...drafts];
    setDrafts(next);
    persist('smart-notes', next);
    setDraftInput('');
    flashTip('碎片想法已保存');
  };

  // 删除碎片
  const handleDeleteDraft = async (id) => {
    const next = drafts.filter((d) => d.id !== id);
    setDrafts(next);
    persist('smart-notes', next);
  };

  // 将某条碎片标记为已整理（结构化笔记）
  const handleOrganize = async (draft) => {
    const now = Date.now();
    const note = {
      id: now.toString(),
      title: draft.text.slice(0, 30) + (draft.text.length > 30 ? '…' : ''),
      content: draft.text,
      type: noteType,
      sourceDraftId: draft.id,
      createdAt: now,
    };
    const nextNotes = [note, ...notes];
    setNotes(nextNotes);
    persist('smart-notes-structured', nextNotes);
    // 标记草稿为已整理
    const nextDrafts = drafts.map((d) => (d.id === draft.id ? { ...d, organized: true } : d));
    setDrafts(nextDrafts);
    persist('smart-notes', nextDrafts);
    flashTip('已整理成笔记');
  };

  // 手动添加一条结构化笔记
  const handleAddNote = async () => {
    const text = noteInput.trim();
    if (!text) return;
    const note = {
      id: Date.now().toString(),
      title: text.split('\n')[0].slice(0, 40),
      content: text,
      type: noteType,
      createdAt: Date.now(),
    };
    const next = [note, ...notes];
    setNotes(next);
    persist('smart-notes-structured', next);
    setNoteInput('');
    flashTip('笔记已保存');
  };

  // 删除笔记
  const handleDeleteNote = async (id) => {
    const next = notes.filter((n) => n.id !== id);
    setNotes(next);
    persist('smart-notes-structured', next);
  };

  /* ===== 每日想法逻辑 ===== */
  const filteredDaily = useMemo(
    () => dailyList.filter((d) => d.date === dailyDate).sort((a, b) => a.createdAt - b.createdAt),
    [dailyList, dailyDate]
  );

  const handleSaveDaily = async () => {
    const text = dailyInput.trim();
    if (!text) return;
    const entry = { id: Date.now().toString(), date: dailyDate, text, createdAt: Date.now() };
    const next = [...dailyList, entry];
    setDailyList(next);
    persist('daily-thoughts', next);
    setDailyInput('');
    flashTip('今日想法已保存');
  };

  const handleDeleteDaily = async (id) => {
    const next = dailyList.filter((d) => d.id !== id);
    setDailyList(next);
    persist('daily-thoughts', next);
  };

  const today = todayStr();
  const todayCount = useMemo(() => dailyList.filter((d) => d.date === today).length, [dailyList, today]);

  return (
    <div className="space-y-5 pb-10">
      {/* 标题 */}
      <div className="flex items-end justify-between animate-slide-up">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-[10px] flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid var(--line)' }}>
            <NotebookPen className="h-5 w-5 text-white/85" strokeWidth={1.6} />
          </div>
          <div>
            <h1 className="title-display text-[22px] tracking-tight">智能笔记</h1>
            <p className="text-[12.5px] text-white/50 mt-0.5">碎片想法整理 · 每日想法记录</p>
          </div>
        </div>
        {savedTip && (
          <span className="text-[12px] text-emerald-300 animate-slide-down flex items-center gap-1">
            <Check className="h-3.5 w-3.5" /> {savedTip}
          </span>
        )}
      </div>

      {/* Tab 切换 */}
      <div className="inline-flex p-0.5 rounded-[8px] gap-0.5 animate-slide-up" style={{ background: 'var(--bg-1)', border: '1px solid var(--line)' }}>
        {[['assistant', '智能笔记助手', Sparkles], ['daily', `每日想法${todayCount ? ` (${todayCount})` : ''}`, CalendarDays]].map(([k, l, I]) => (
          <button
            key={k}
            onClick={() => setActiveTab(k)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-[7px] text-[12.5px] font-medium transition-colors ${
              activeTab === k ? 'bg-white/[0.12] text-white' : 'text-white/55 hover:text-white/80'
            }`}
          >
            <I className="h-3.5 w-3.5" strokeWidth={1.6} />
            {l}
          </button>
        ))}
      </div>

      {/* ===== 智能笔记助手 ===== */}
      {activeTab === 'assistant' && (
        <div className="space-y-4 animate-fade-in">
          {/* 输入区：碎片想法 */}
          <div className="glass p-5">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-4 w-4 text-amber-300" strokeWidth={1.6} />
              <h2 className="text-[14px] font-semibold">碎片想法快速记录</h2>
              <span className="text-[10.5px] text-white/35 ml-1">想到什么先记下来，稍后一键整理</span>
            </div>
            <textarea
              value={draftInput}
              onChange={(e) => setDraftInput(e.target.value)}
              placeholder="突然想到的点子、灵感、待办、一句话想法……先记下来"
              rows={4}
              className="w-full resize-none text-[13px] leading-relaxed"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSaveDraft();
              }}
            />
            <div className="mt-2.5 flex items-center justify-between">
              <span className="text-[10.5px] text-white/35">Ctrl + Enter 快捷保存</span>
              <button onClick={handleSaveDraft} disabled={!draftInput.trim()} className="btn btn-primary">
                <Save className="h-3.5 w-3.5" />
                保存碎片
              </button>
            </div>
          </div>

          {/* 已保存的碎片想法 */}
          {drafts.length > 0 && (
            <div className="glass p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-white/60" strokeWidth={1.6} />
                  <h2 className="text-[14px] font-semibold">碎片列表</h2>
                  <span className="text-[10.5px] text-white/35">{drafts.length} 条</span>
                </div>
                <button
                  onClick={() => askDelete('clear-drafts')}
                  className="text-[11px] text-white/40 hover:text-red-300 flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" /> 清空
                </button>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {drafts.map((d) => (
                  <div key={d.id} className="flex items-start gap-3 px-3 py-2.5 rounded-[8px] bg-white/[0.02] hover:bg-white/[0.05] group">
                    <span className="text-white/35 text-[10.5px] font-mono w-10 shrink-0 mt-0.5">{fmtTime(d.createdAt)}</span>
                    <p className={`flex-1 text-[12.5px] leading-relaxed min-w-0 ${d.organized ? 'text-white/40 line-through' : 'text-white/80'}`}>{d.text}</p>
                    <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleOrganize(d)} disabled={d.organized} className="p-1.5 rounded-[6px] bg-white/[0.06] text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-30" title="整理成笔记">
                        <Wand2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => askDelete('draft', d.id)} className="p-1.5 rounded-[6px] bg-white/[0.06] text-white/50 hover:bg-red-500/15 hover:text-red-300" title="删除">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 智能笔记：手动整理输入 */}
          <div className="glass p-5">
            <div className="flex items-center gap-2 mb-3">
              <Wand2 className="h-4 w-4 text-cyan-300" strokeWidth={1.6} />
              <h2 className="text-[14px] font-semibold">智能笔记整理</h2>
              <span className="text-[10.5px] text-white/35 ml-1">把零散内容整理成一条结构化笔记</span>
            </div>
            <textarea
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="粘贴或输入零散内容，点保存后成为一条结构化笔记（标题自动取第一行）"
              rows={5}
              className="w-full resize-none text-[13px] leading-relaxed"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAddNote();
              }}
            />
            {/* 类型选择 */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-[10.5px] text-white/40 mr-1">笔记类型：</span>
              {NOTE_TYPES.map((t) => {
                const Icon = t.icon;
                const active = noteType === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setNoteType(t.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-[7px] text-[11px] font-medium transition-colors border ${
                      active ? t.color : 'bg-white/[0.04] text-white/45 border-white/[0.08] hover:bg-white/[0.06] hover:text-white/70'
                    }`}
                  >
                    <Icon className="h-3 w-3" strokeWidth={1.8} />
                    {t.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-2.5 flex items-center justify-between">
              <span className="text-[10.5px] text-white/35">Ctrl + Enter 快捷保存</span>
              <button onClick={handleAddNote} disabled={!noteInput.trim()} className="btn btn-primary">
                <Save className="h-3.5 w-3.5" />
                保存笔记
              </button>
            </div>
          </div>

          {/* 已整理的笔记列表 */}
          {notes.length > 0 && (
            <div className="glass p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <NotebookPen className="h-4 w-4 text-white/60" strokeWidth={1.6} />
                  <h2 className="text-[14px] font-semibold">已整理笔记</h2>
                  <span className="text-[10.5px] text-white/35">{notes.length} 条</span>
                </div>
                <div className="flex items-center gap-1">
                  {NOTE_TYPES.slice(0, 4).map((t) => {
                    const cnt = notes.filter((n) => (n.type || 'thought') === t.id).length;
                    if (!cnt) return null;
                    const Icon = t.icon;
                    return (
                      <span key={t.id} className={`chip ${t.color}`}>
                        <Icon className="h-3 w-3" /> {cnt}
                      </span>
                    );
                  })}
                  <button
                    onClick={() => askDelete('clear-notes')}
                    className="text-[11px] text-white/40 hover:text-red-300 flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" /> 清空
                  </button>
                </div>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {notes.map((n) => {
                  const meta = NOTE_TYPE_MAP[n.type] || NOTE_TYPE_MAP.thought;
                  const Icon = meta.icon;
                  return (
                    <div key={n.id} className="px-3 py-2.5 rounded-[8px] bg-white/[0.02] hover:bg-white/[0.05] group">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-[12.5px] font-semibold text-white/90 truncate flex-1">{n.title}</h3>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`chip ${meta.color}`}>
                            <Icon className="h-3 w-3" /> {meta.label}
                          </span>
                          <span className="text-[10px] text-white/35 font-mono">{fmtTime(n.createdAt)}</span>
                          <button onClick={() => askDelete('note', n.id)} className="p-1 rounded text-white/40 hover:text-red-300 opacity-0 group-hover:opacity-100">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-[12px] text-white/60 mt-1 leading-relaxed whitespace-pre-wrap">{n.content}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== 每日想法 ===== */}
      {activeTab === 'daily' && (
        <div className="space-y-4 animate-fade-in">
          {/* 输入区 */}
          <div className="glass p-5">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays className="h-4 w-4 text-sky-300" strokeWidth={1.6} />
              <h2 className="text-[14px] font-semibold">记录今日想法</h2>
              <span className="text-[10.5px] text-white/35 ml-1">每天记录一点，回头看看成长</span>
            </div>
            <textarea
              value={dailyInput}
              onChange={(e) => setDailyInput(e.target.value)}
              placeholder="今天有什么想法、收获、感悟？写下来……"
              rows={5}
              className="w-full resize-none text-[13px] leading-relaxed"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSaveDaily();
              }}
            />
            <div className="mt-2.5 flex items-center justify-between">
              <span className="text-[10.5px] text-white/35 flex items-center gap-1.5">
                <Clock className="h-3 w-3" /> {today} · Ctrl + Enter 快捷保存
              </span>
              <button onClick={handleSaveDaily} disabled={!dailyInput.trim()} className="btn btn-primary">
                <Save className="h-3.5 w-3.5" />
                保存今日想法
              </button>
            </div>
          </div>

          {/* 历史想法：按日期查看 */}
          <div className="glass p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-white/60" strokeWidth={1.6} />
                <h2 className="text-[14px] font-semibold">想法记录</h2>
              </div>
              <input
                type="date"
                value={dailyDate}
                onChange={(e) => setDailyDate(e.target.value || todayStr())}
                className="text-xs py-1.5 px-2"
              />
            </div>

            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] text-white/45">
                {dailyDate === today ? '今天' : dailyDate} · {filteredDaily.length} 条想法
              </span>
            </div>

            {filteredDaily.length === 0 ? (
              <p className="text-[12px] text-white/35 text-center py-8">
                这天还没有想法 · 在上方记录一条吧
              </p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {filteredDaily.map((d) => (
                  <div key={d.id} className="flex items-start gap-3 px-3 py-2.5 rounded-[8px] bg-white/[0.02] hover:bg-white/[0.05] group">
                    <span className="text-white/35 text-[10.5px] font-mono w-10 shrink-0 mt-0.5">{fmtTime(d.createdAt)}</span>
                    <p className="flex-1 text-[12.5px] leading-relaxed text-white/80 whitespace-pre-wrap min-w-0">{d.text}</p>
                    <button onClick={() => askDelete('daily', d.id)} className="p-1.5 rounded-[6px] bg-white/[0.06] text-white/50 hover:bg-red-500/15 hover:text-red-300 shrink-0 opacity-0 group-hover:opacity-100" title="删除">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 删除确认弹窗（与全站一致） */}
      <ConfirmDialog
        open={!!confirmAction}
        title={
          confirmAction?.type === 'clear-drafts' ? '清空碎片想法'
            : confirmAction?.type === 'clear-notes' ? '清空所有笔记'
            : confirmAction?.type === 'draft' ? '删除碎片想法'
            : confirmAction?.type === 'note' ? '删除笔记'
            : '删除今日想法'
        }
        message={
          confirmAction?.type === 'clear-drafts'
            ? `将清空全部 ${drafts.length} 条碎片想法，此操作无法恢复。`
            : confirmAction?.type === 'clear-notes'
              ? `将清空全部 ${notes.length} 条笔记，此操作无法恢复。`
              : '删除后该内容将无法恢复。请确认是否继续删除？'
        }
        confirmText="删除"
        cancelText="取消"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
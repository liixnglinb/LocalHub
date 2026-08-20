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
  { id: 'thought', label: '想法', icon: Lightbulb, color: '#D97706' },
  { id: 'todo', label: '待办', icon: ListTodo, color: '#0EA5E9' },
  { id: 'inspiration', label: '灵感', icon: Sparkles, color: '#a855f7' },
  { id: 'knowledge', label: '知识', icon: BookOpen, color: '#16A34A' },
  { id: 'link', label: '链接', icon: Link2, color: '#0891B2' },
  { id: 'other', label: '其它', icon: CircleDot, color: '#6c757d' },
];
const NOTE_TYPE_MAP = Object.fromEntries(NOTE_TYPES.map((t) => [t.id, t]));

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtTime(ts) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// 主题色
const ACCENT = '#7C5CFF';

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

  const flashTipRef = useRef(null);
  const [savedTip, setSavedTip] = useState(null);
  // 删除确认弹窗
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

  const handleDeleteDraft = async (id) => {
    const next = drafts.filter((d) => d.id !== id);
    setDrafts(next);
    persist('smart-notes', next);
  };

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
    const nextDrafts = drafts.map((d) => (d.id === draft.id ? { ...d, organized: true } : d));
    setDrafts(nextDrafts);
    persist('smart-notes', nextDrafts);
    flashTip('已整理成笔记');
  };

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
    <div className="sn-wrap">
      {/* 标题 + Tab */}
      <div className="sn-head">
        <div className="sn-title">智能笔记</div>
        <div className="sn-tabs">
          <button onClick={() => setActiveTab('assistant')} className={`sn-tab ${activeTab === 'assistant' ? 'active' : ''}`}>
            <Sparkles className="sn-tab-ic" /> 智能笔记助手
          </button>
          <button onClick={() => setActiveTab('daily')} className={`sn-tab ${activeTab === 'daily' ? 'active' : ''}`}>
            <CalendarDays className="sn-tab-ic" /> 每日想法{todayCount ? ` (${todayCount})` : ''}
          </button>
        </div>
        {savedTip && (
          <span className="sn-toast"><Check className="sn-toast-ic" /> {savedTip}</span>
        )}
      </div>

      {/* ===== 智能笔记助手 · 双栏 ===== */}
      {activeTab === 'assistant' && (
        <div className="sn-grid">
          {/* 左栏：碎片想法 */}
          <div className="sn-col">
            {/* 快速记录 */}
            <div className="sn-card">
              <div className="sn-card-title">
                <span className="sn-ic"><Lightbulb className="luc" /></span>
                碎片想法快速记录
                <span className="sn-sub">想到什么先记下来，稍后一键整理</span>
              </div>
              <textarea
                value={draftInput}
                onChange={(e) => setDraftInput(e.target.value)}
                placeholder="突然想到的点子、灵感、待办、一句话想法……先记下来"
                rows={4}
                className="sn-textarea"
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSaveDraft(); }}
              />
              <div className="sn-row">
                <span className="sn-sub">Ctrl + Enter 快捷保存</span>
                <button onClick={handleSaveDraft} disabled={!draftInput.trim()} className="sn-btn-primary">
                  <Save className="luc" /> 保存碎片
                </button>
              </div>
            </div>

            {/* 已保存碎片 */}
            {drafts.length > 0 && (
              <div className="sn-card">
                <div className="sn-card-title">
                  <span className="sn-ic"><FileText className="luc" /></span>
                  碎片列表
                  <span className="sn-badge">{drafts.length}</span>
                  <button onClick={() => askDelete('clear-drafts')} className="sn-btn-ghost"><Trash2 className="luc sm" /> 清空</button>
                </div>
                <div className="sn-list">
                  {drafts.map((d) => (
                    <div key={d.id} className="sn-item">
                      <span className="sn-time">{fmtTime(d.createdAt)}</span>
                      <p className={`sn-item-text ${d.organized ? 'done' : ''}`}>{d.text}</p>
                      <div className="sn-item-act">
                        <button onClick={() => handleOrganize(d)} disabled={d.organized} className="sn-icobtn" title="整理成笔记"><Wand2 className="luc" /></button>
                        <button onClick={() => askDelete('draft', d.id)} className="sn-icobtn danger" title="删除"><Trash2 className="luc" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 右栏：结构化笔记 */}
          <div className="sn-col">
            <div className="sn-card">
              <div className="sn-card-title">
                <span className="sn-ic"><Wand2 className="luc" /></span>
                智能笔记整理
                <span className="sn-sub">把零散内容整理成一条结构化笔记</span>
              </div>
              <textarea
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="粘贴或输入零散内容，点保存后成为一条结构化笔记（标题自动取第一行）"
                rows={5}
                className="sn-textarea"
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAddNote(); }}
              />
              <div className="sn-types">
                <span className="sn-sub">笔记类型：</span>
                {NOTE_TYPES.map((t) => {
                  const Icon = t.icon;
                  const active = noteType === t.id;
                  return (
                    <button key={t.id} onClick={() => setNoteType(t.id)} className={`sn-type ${active ? 'active' : ''}`} style={active ? { borderColor: t.color, color: t.color, background: `${t.color}1a` } : undefined}>
                      <Icon className="luc" /> {t.label}
                    </button>
                  );
                })}
              </div>
              <div className="sn-row">
                <span className="sn-sub">Ctrl + Enter 快捷保存</span>
                <button onClick={handleAddNote} disabled={!noteInput.trim()} className="sn-btn-primary">
                  <Save className="luc" /> 保存笔记
                </button>
              </div>
            </div>

            {notes.length > 0 && (
              <div className="sn-card">
                <div className="sn-card-title">
                  <span className="sn-ic"><NotebookPen className="luc" /></span>
                  已整理笔记
                  <span className="sn-badge">{notes.length}</span>
                  <button onClick={() => askDelete('clear-notes')} className="sn-btn-ghost"><Trash2 className="luc sm" /> 清空</button>
                </div>
                <div className="sn-list">
                  {notes.map((n) => {
                    const meta = NOTE_TYPE_MAP[n.type] || NOTE_TYPE_MAP.thought;
                    const Icon = meta.icon;
                    return (
                      <div key={n.id} className="sn-note">
                        <div className="sn-note-top">
                          <span className="sn-type-pill" style={{ color: meta.color, background: `${meta.color}1a` }}><Icon className="luc" /> {meta.label}</span>
                          <h3 className="sn-note-title">{n.title}</h3>
                          <span className="sn-time">{fmtTime(n.createdAt)}</span>
                          <button onClick={() => askDelete('note', n.id)} className="sn-icobtn danger" title="删除"><Trash2 className="luc" /></button>
                        </div>
                        <p className="sn-note-content">{n.content}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== 每日想法 · 双栏 ===== */}
      {activeTab === 'daily' && (
        <div className="sn-grid">
          <div className="sn-col">
            <div className="sn-card">
              <div className="sn-card-title">
                <span className="sn-ic"><CalendarDays className="luc" /></span>
                记录今日想法
                <span className="sn-sub">每天记录一点，回头看看成长</span>
              </div>
              <textarea
                value={dailyInput}
                onChange={(e) => setDailyInput(e.target.value)}
                placeholder="今天有什么想法、收获、感悟？写下来……"
                rows={5}
                className="sn-textarea"
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSaveDaily(); }}
              />
              <div className="sn-row">
                <span className="sn-sub"><Clock className="luc sm" /> {today} · Ctrl + Enter 快捷保存</span>
                <button onClick={handleSaveDaily} disabled={!dailyInput.trim()} className="sn-btn-primary">
                  <Save className="luc" /> 保存今日想法
                </button>
              </div>
            </div>
          </div>

          <div className="sn-col">
            <div className="sn-card">
              <div className="sn-card-title">
                <span className="sn-ic"><FileText className="luc" /></span>
                想法记录
                <input type="date" value={dailyDate} onChange={(e) => setDailyDate(e.target.value || todayStr())} className="sn-date" />
              </div>
              <p className="sn-sub mb">{dailyDate === today ? '今天' : dailyDate} · {filteredDaily.length} 条想法</p>
              {filteredDaily.length === 0 ? (
                <p className="sn-empty">这天还没有想法 · 在上方记录一条吧</p>
              ) : (
                <div className="sn-list">
                  {filteredDaily.map((d) => (
                    <div key={d.id} className="sn-item">
                      <span className="sn-time">{fmtTime(d.createdAt)}</span>
                      <p className="sn-item-text pre">{d.text}</p>
                      <button onClick={() => askDelete('daily', d.id)} className="sn-icobtn danger" title="删除"><Trash2 className="luc" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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

      <style>{`
        /* ===== 智能笔记 · 简约商务 · 紫色主题 ===== */
        .sn-wrap { display: flex; flex-direction: column; gap: 16px; }
        .sn-head { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
        .sn-title { font-size: 20px; font-weight: 700; color: #212529; }
        .sn-toast { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; color: #16A34A; font-weight: 600; }
        .sn-tabs { display: inline-flex; background: #f8f9fa; border: 1px solid rgba(20,24,33,.09); border-radius: 10px; padding: 3px; gap: 2px; }
        .sn-tab { display: inline-flex; align-items: center; gap: 6px; padding: 7px 16px; border: 0; background: transparent; border-radius: 8px; color: #6c757d; font-size: 13px; font-weight: 600; cursor: pointer; }
        .sn-tab:hover { color: #212529; }
        .sn-tab.active { background: #fff; color: ${ACCENT}; box-shadow: 0 1px 3px rgba(16,20,30,.1); }
        .sn-tab-ic { width: 15px; height: 15px; }
        .sn-toast-ic { width: 14px; height: 14px; }

        .sn-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
        @media (max-width: 900px) { .sn-grid { grid-template-columns: 1fr; } }
        .sn-col { display: flex; flex-direction: column; gap: 16px; min-width: 0; }

        .sn-card { background: #fff; border: 1px solid rgba(20,24,33,.09); border-radius: 14px; padding: 18px; box-shadow: 0 1px 2px rgba(16,20,30,.04); }
        .sn-card-title { display: flex; align-items: center; gap: 8px; font-size: 14.5px; font-weight: 600; color: #212529; margin-bottom: 13px; flex-wrap: wrap; }
        .sn-ic { display: inline-flex; width: 28px; height: 28px; border-radius: 8px; align-items: center; justify-content: center; color: ${ACCENT}; flex-shrink: 0; }
        .luc { width: 15px; height: 15px; }
        .luc.sm { width: 12px; height: 12px; }

        .sn-textarea { width: 100%; resize: none; font-size: 13px; line-height: 1.6; color: #212529; background: #fff; border: 1px solid rgba(20,24,33,.12); border-radius: 10px; padding: 11px 13px; font-family: inherit; }
        .sn-textarea:focus { border-color: ${ACCENT}; box-shadow: 0 0 0 3px rgba(124,92,255,.12); outline: none; }

        .sn-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 13px; }
        .sn-sub { font-size: 11.5px; color: #8a8f98; }
        .sn-btn-ghost { display: inline-flex; align-items: center; gap: 4px; margin-left: 4px; background: transparent; border: none; cursor: pointer; font-size: 11.5px; color: #8a8f98; padding: 4px 7px; border-radius: 6px; }
        .sn-btn-ghost:hover { color: #EF4444; background: rgba(239,68,68,.08); }
        .sn-btn-primary { display: inline-flex; align-items: center; gap: 6px; background: ${ACCENT}; color: #fff; border: 1px solid ${ACCENT}; border-radius: 8px; font-size: 13px; font-weight: 600; padding: 8px 15px; cursor: pointer; }
        .sn-btn-primary:hover:not(:disabled) { background: #6A4BFF; }
        .sn-btn-primary:disabled { opacity: .45; cursor: not-allowed; }

        .sn-badge { display: inline-flex; align-items: center; font-size: 11px; font-weight: 700; color: ${ACCENT}; background: #f0edff; padding: 2px 8px; border-radius: 999px; }
        .sn-badge:empty { display: none; }

        .sn-list { max-height: 420px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
        .sn-item { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; border-radius: 10px; background: #f8f9fa; border: 1px solid rgba(20,24,33,.05); }
        .sn-item:hover { background: #f4f5f7; }
        .sn-item-text { flex: 1; min-width: 0; font-size: 12.5px; line-height: 1.6; color: #212529; word-break: break-word; margin: 0; }
        .sn-item-text.done { color: #adb5bd; text-decoration: line-through; }
        .sn-item-text.pre { white-space: pre-wrap; }
        .sn-time { font-family: var(--font-mono); font-size: 10.5px; color: #adb5bd; flex-shrink: 0; white-space: nowrap; margin-top: 2px; }
        .sn-item-act { display: flex; gap: 6px; flex-shrink: 0; }
        .sn-icobtn { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 7px; background: #fff; border: 1px solid rgba(20,24,33,.09); color: #8a8f98; cursor: pointer; transition: all .15s ease; }
        .sn-icobtn:hover { color: ${ACCENT}; border-color: rgba(124,92,255,.5); background: #f5f2ff; }
        .sn-icobtn:disabled { opacity: .3; cursor: not-allowed; }
        .sn-icobtn.danger:hover { color: #EF4444; border-color: rgba(239,68,68,.4); background: #fef2f2; }

        .sn-type { display: inline-flex; align-items: center; gap: 5px; padding: 6px 11px; border-radius: 999px; font-size: 11.5px; font-weight: 600; transition: all .15s ease; border: 1px solid rgba(20,24,33,.12); background: #fff; color: #6c757d; cursor: pointer; }
        .sn-type:hover { background: #f8f9fa; }

        .sn-note { background: #f8f9fa; border: 1px solid rgba(20,24,33,.05); border-radius: 10px; padding: 12px 14px; }
        .sn-note:hover { background: #f4f5f7; }
        .sn-note-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .sn-note-title { font-size: 12.5px; font-weight: 600; color: #212529; flex: 1; min-width: 0; margin: 0; }
        .sn-type-pill { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 999px; font-size: 10.5px; font-weight: 600; }
        .sn-note-content { margin: 7px 0 0; font-size: 12px; line-height: 1.6; color: #495057; white-space: pre-wrap; word-break: break-word; }

        .sn-date { font-size: 12px; padding: 5px 8px; border: 1px solid rgba(20,24,33,.12); border-radius: 8px; color: #212529; margin-left: auto; }
        .sn-sub.mb { margin-bottom: 10px; }
        .sn-empty { text-align: center; color: #adb5bd; font-size: 12.5px; padding: 30px 0; }
      `}</style>
    </div>
  );
}
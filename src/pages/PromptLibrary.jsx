import React, { useState, useEffect, useMemo } from 'react';
import { Search, Star, Copy, Plus, Edit3, Trash2, Filter, Check, Lightbulb, X } from 'lucide-react';
import Dropdown from '../components/Dropdown';
import ConfirmDialog from '../components/ConfirmDialog';

const DEFAULT_CATEGORIES = ['编程开发', '写作创作', '学习辅导', '工作效率', '角色扮演', '图像生成'];

const CATEGORY_COLORS = {
  编程开发: 'bg-[rgba(59,130,246,0.12)] text-[var(--info)] border-[rgba(59,130,246,0.3)]',
  写作创作: 'bg-[rgba(34,197,94,0.12)] text-[var(--success-fg)] border-[rgba(34,197,94,0.3)]',
  学习辅导: 'bg-[rgba(245,158,11,0.12)] text-[var(--warn)] border-[rgba(245,158,11,0.3)]',
  工作效率: 'bg-[var(--accent-soft)] text-[var(--accent)] border-[rgba(124,92,255,0.3)]',
  角色扮演: 'bg-[rgba(236,72,153,0.12)] text-[#DB2777] border-[rgba(236,72,153,0.3)]',
  图像生成: 'bg-[var(--accent-soft)] text-[var(--accent)] border-[rgba(124,92,255,0.3)]',
};

export default function PromptLibrary() {
  const [prompts, setPrompts] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [formData, setFormData] = useState({ title: '', category: DEFAULT_CATEGORIES[0], content: '', tags: '' });
  const [copySuccessId, setCopySuccessId] = useState(null);
  // 删除确认弹窗（与 API 密钥同款深色质感）：{ type: 'prompt', id } | { type: 'category', cat } | null
  const [confirmAction, setConfirmAction] = useState(null);

  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      window.electronAPI?.loadData('prompts'),
      window.electronAPI?.loadData('prompt-categories'),
    ]).then(([p, c]) => {
      if (Array.isArray(p)) setPrompts(p);
      if (Array.isArray(c) && c.length) setCategories(c);
    }).catch((e) => console.warn('load prompts failed:', e)).finally(() => setLoaded(true));
  }, []);

  const persistPrompts = (next) => { setPrompts(next); window.electronAPI?.saveData?.('prompts', next); };
  const persistCategories = (next) => { setCategories(next); window.electronAPI?.saveData?.('prompt-categories', next); };

  // 删除确认（打开弹窗）
  const confirmDeleteCategory = (cat) => setConfirmAction({ type: 'category', cat });
  const confirmDeletePrompt = (id) => setConfirmAction({ type: 'prompt', id });

  const doDeleteCategory = (cat) => {
    // 把该分类下的提示词归到默认分类（保持显示不孤儿）
    const fallback = DEFAULT_CATEGORIES[0];
    persistPrompts(prompts.map((p) => p.category === cat ? { ...p, category: fallback } : p));
    persistCategories(categories.filter((c) => c !== cat));
    if (selectedCategory === cat) setSelectedCategory('全部');
  };

  const openAddModal = () => {
    setEditingPrompt(null);
    setFormData({ title: '', category: categories[0] || DEFAULT_CATEGORIES[0], content: '', tags: '' });
    setShowModal(true);
  };

  const openEditModal = (prompt) => {
    setEditingPrompt(prompt);
    setFormData({
      title: prompt.title,
      category: prompt.category,
      content: prompt.content,
      tags: (prompt.tags || []).join(', '),
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formData.title.trim() || !formData.content.trim()) return;
    const tags = formData.tags.split(',').map((t) => t.trim()).filter(Boolean);
    if (editingPrompt) {
      persistPrompts(prompts.map((p) => p.id === editingPrompt.id
        ? { ...p, title: formData.title.trim(), category: formData.category, content: formData.content.trim(), tags, updatedAt: Date.now() }
        : p));
    } else {
      persistPrompts([
        { id: Date.now().toString(), title: formData.title.trim(), category: formData.category, content: formData.content.trim(), tags, favorite: false, createdAt: Date.now(), updatedAt: Date.now() },
        ...prompts,
      ]);
    }
    setShowModal(false);
    setEditingPrompt(null);
  };

  const doDeletePrompt = (id) => {
    persistPrompts(prompts.filter((p) => p.id !== id));
  };

  // 确认弹窗确认回调
  const handleConfirmDelete = () => {
    const act = confirmAction;
    setConfirmAction(null);
    if (!act) return;
    if (act.type === 'prompt') doDeletePrompt(act.id);
    else if (act.type === 'category') doDeleteCategory(act.cat);
  };

  const handleToggleFavorite = (id) => {
    persistPrompts(prompts.map((p) => p.id === id ? { ...p, favorite: !p.favorite } : p));
  };

  const handleCopy = async (prompt) => {
    try {
      await navigator.clipboard.writeText(prompt.content);
      setCopySuccessId(prompt.id);
      setTimeout(() => setCopySuccessId(null), 1500);
    } catch {}
  };

  const filteredPrompts = useMemo(() => {
    return prompts.filter((p) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q) || (p.tags || []).some((t) => t.toLowerCase().includes(q));
      const matchesCategory = selectedCategory === '全部' || p.category === selectedCategory;
      const matchesFavorite = showFavoritesOnly ? p.favorite : true;
      return matchesSearch && matchesCategory && matchesFavorite;
    });
  }, [prompts, searchQuery, selectedCategory, showFavoritesOnly]);

  return (
    <div className="pl-inner flex gap-5 pb-8">
      <style>{`
        .pl-gold { --t-gold: #D97706; --t-gold-soft: rgba(217,119,6,.10); --t-gold-line: rgba(217,119,6,.28); }
        /* 左侧分类 */
        .pl-gold .pl-sidebar { background: #fff; border: 1px solid var(--line-soft); border-radius: 14px; padding: 14px 12px; }
        .pl-gold .pl-cat-item { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 10px; border-radius: 9px; font-size: 13px; color: var(--text-2); transition: all .15s ease; }
        .pl-gold .pl-cat-item:hover { background: var(--hover); color: var(--text-1); }
        .pl-gold .pl-cat-item.pl-cat-active { background: var(--t-gold-soft); color: var(--t-gold); font-weight: 600; }
        .pl-gold .pl-cat-count { font-size: 11px; color: var(--text-3); }
        .pl-gold .pl-cat-active .pl-cat-count { color: var(--t-gold); }
        .pl-gold .pl-add-cat-btn { width: 100%; display: flex; align-items: center; gap: 6px; justify-content: center; margin-top: 10px; padding: 8px 10px; border-radius: 9px; font-size: 13px; color: var(--t-gold); background: var(--t-gold-soft); border: 1px dashed var(--t-gold-line); transition: all .15s ease; }
        .pl-gold .pl-add-cat-btn:hover { background: var(--t-gold); color: #fff; }
        /* 搜索框 */
        .pl-gold .pl-search { display: flex; align-items: center; gap: 8px; background: #fff; border: 1px solid var(--line); border-radius: 10px; padding: 9px 12px; color: var(--text-3); transition: border-color .15s ease; }
        .pl-gold .pl-search:focus-within { border-color: var(--t-gold); box-shadow: 0 0 0 3px var(--t-gold-soft); }
        .pl-gold .pl-search input { background: transparent; border: none; outline: none; font-size: 13px; color: var(--text-1); }
        .pl-gold .pl-btn { display: inline-flex; align-items: center; gap: 6px; border-radius: 10px; font-size: 13px; font-weight: 500; padding: 9px 14px; transition: all .15s ease; cursor: pointer; }
        .pl-gold .pl-btn-default { background: #fff; border: 1px solid var(--line); color: var(--text-2); }
        .pl-gold .pl-btn-default:hover { border-color: var(--t-gold); color: var(--t-gold); }
        .pl-gold .pl-btn-gold { background: var(--t-gold); border: 1px solid var(--t-gold); color: #fff; }
        .pl-gold .pl-btn-gold:hover { background: #B45F06; }
        .pl-gold .pl-btn-gold:disabled { opacity: .5; cursor: not-allowed; }
        /* 卡片 */
        .pl-gold .pl-card { position: relative; display: flex; flex-direction: column; background: #fff; border: 1px solid var(--line-soft); border-radius: 14px; padding: 18px; transition: all .18s ease; animation: slideUp .4s ease both; }
        .pl-gold .pl-card:hover { border-color: var(--t-gold-line); box-shadow: 0 6px 20px -10px rgba(217,119,6,.25); }
        .pl-gold .pl-title { font-size: 15px; font-weight: 700; color: var(--text-1); line-height: 1.35; }
        .pl-gold .pl-gold-bar { width: 3px; border-radius: 2px; background: var(--t-gold); flex-shrink: 0; }
        .pl-gold .pl-chip { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; border: 1px solid; }
        .pl-gold .pl-tag { font-size: 11px; color: var(--t-gold); font-weight: 600; }
        .pl-gold .pl-content { font-size: 12px; color: var(--text-2); line-height: 1.7; white-space: pre-wrap; font-family: var(--font-mono); background: var(--t-gold-soft); border-radius: 10px; padding: 12px 14px; }
        .pl-gold .pl-action { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 8px; background: #fff; border: 1px solid var(--line-soft); color: var(--text-3); transition: all .15s ease; }
        .pl-gold .pl-action:hover { border-color: var(--t-gold); color: var(--t-gold); }
        .pl-gold .pl-action-danger:hover { border-color: var(--danger); color: var(--danger); }
        .pl-gold .pl-action-success:hover { border-color: var(--success); color: var(--success); }
        .pl-gold .pl-star { color: #FBBF24; }
        .pl-gold .pl-empty { background: #fff; border: 1px dashed var(--line); border-radius: 14px; padding: 56px 20px; text-align: center; }
        .pl-gold .pl-toast { display: inline-flex; align-items: center; gap: 4px; color: var(--success); font-size: 11px; font-weight: 600; }
        .pl-gold .pl-expand { color: var(--t-gold); font-size: 11px; font-weight: 600; }
        .pl-gold .pl-expand:hover { color: #B45F06; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* 左侧分类 */}
      <aside className="w-56 shrink-0 pl-gold">
        <div className="pl-sidebar sticky top-2">
          <div className="px-2 pb-2 flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: 'var(--t-gold)' }} />
            <span className="text-[11px] text-[var(--text-3)] uppercase tracking-widest font-semibold">分类</span>
          </div>
          <div className="space-y-1">
            <button onClick={() => setSelectedCategory('全部')} className={`pl-cat-item ${selectedCategory === '全部' ? 'pl-cat-active' : ''}`}>
              <span>全部</span>
              <span className="pl-cat-count">{prompts.length}</span>
            </button>
            {categories.map((cat) => (
              <div key={cat} className="group relative">
                <button onClick={() => setSelectedCategory(cat)} className={`pl-cat-item ${selectedCategory === cat ? 'pl-cat-active' : ''}`}>
                  <span className="truncate">{cat}</span>
                  <span className="pl-cat-count">{prompts.filter((p) => p.category === cat).length}</span>
                </button>
                {!DEFAULT_CATEGORIES.includes(cat) && (
                  <button onClick={() => confirmDeleteCategory(cat)} className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded text-[var(--text-4)] hover:text-[var(--danger)] opacity-0 group-hover:opacity-100" title="删除分类">
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {showAddCategory ? (
            <div className="mt-2 animate-slide-down">
              <input type="text" placeholder="分类名称" value={newCategoryInput} onChange={(e) => setNewCategoryInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { if (newCategoryInput.trim() && !categories.includes(newCategoryInput.trim())) persistCategories([...categories, newCategoryInput.trim()]); setNewCategoryInput(''); setShowAddCategory(false); } }} className="w-full text-sm" autoFocus />
              <div className="flex gap-1.5 mt-2">
                <button onClick={() => { if (newCategoryInput.trim() && !categories.includes(newCategoryInput.trim())) persistCategories([...categories, newCategoryInput.trim()]); setNewCategoryInput(''); setShowAddCategory(false); }} className="flex-1 pl-btn pl-btn-gold text-xs py-1.5 justify-center">添加</button>
                <button onClick={() => { setShowAddCategory(false); setNewCategoryInput(''); }} className="flex-1 pl-btn pl-btn-default text-xs py-1.5 justify-center">取消</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAddCategory(true)} className="pl-add-cat-btn">
              <Plus className="h-3.5 w-3.5" />
              添加分类
            </button>
          )}
        </div>
      </aside>

      {/* 右侧 */}
      <div className="flex-1 min-w-0 space-y-5 pl-gold">
        <div className="flex items-end justify-between animate-slide-up" style={{ animationDelay: '0.05s' }}>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              <span style={{ color: 'var(--t-gold)' }}>AI</span> 提示词工具箱
            </h1>
            <p className="mt-1.5 text-[var(--text-3)] text-sm">管理与收藏你的提示词模板</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="pl-search w-52">
              <Search className="h-3.5 w-3.5" />
              <input type="text" placeholder="搜索提示词..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 min-w-0" />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="clear-btn" title="清空">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <button onClick={() => setShowFavoritesOnly(!showFavoritesOnly)} className={`pl-btn ${showFavoritesOnly ? 'pl-btn-gold' : 'pl-btn-default'}`}>
              <Filter className="h-3.5 w-3.5" />
              仅收藏
            </button>
            <button onClick={openAddModal} className="pl-btn pl-btn-gold">
              <Plus className="h-4 w-4" />
              添加提示词
            </button>
          </div>
        </div>

        {!loaded ? (
          <div className="pl-empty animate-slide-up">
            <p style={{ color: 'var(--t-gold)' }} className="text-sm font-medium">加载中...</p>
          </div>
        ) : filteredPrompts.length === 0 ? (
          <div className="pl-empty animate-slide-up">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'var(--t-gold-soft)' }}>
              <Lightbulb className="h-7 w-7" style={{ color: 'var(--t-gold)' }} />
            </div>
            <p className="text-base font-medium">{showFavoritesOnly ? '没有收藏的提示词' : '还没有提示词'}</p>
            <p className="mt-1 text-sm text-[var(--text-3)]">{showFavoritesOnly ? '点击星标收藏你喜欢的提示词' : '点击"添加提示词"开始创建'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPrompts.map((prompt, idx) => {
              const isExpanded = expandedId === prompt.id;
              const isLong = prompt.content.length > 120;
              const preview = isLong && !isExpanded ? prompt.content.slice(0, 120) + '…' : prompt.content;
              return (
                <div key={prompt.id} className="pl-card group" style={{ animationDelay: `${idx * 0.03}s` }}>
                  <div className="flex items-start gap-3">
                    <span className="pl-gold-bar self-stretch" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2.5">
                        <h3 className="pl-title">{prompt.title}</h3>
                        <button onClick={(e) => { e.stopPropagation(); handleToggleFavorite(prompt.id); }} className={`p-1 rounded transition-all shrink-0 ${prompt.favorite ? 'pl-star' : 'text-[var(--text-4)] hover:text-[var(--t-gold)]'}`} title={prompt.favorite ? '取消收藏' : '收藏'}>
                          <Star className="h-4 w-4" fill={prompt.favorite ? 'currentColor' : 'none'} />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <span className={`pl-chip ${CATEGORY_COLORS[prompt.category] || 'bg-[var(--bg-2)] text-[var(--text-2)] border-[var(--line)]'}`}>{prompt.category}</span>
                        {(prompt.tags || []).slice(0, 3).map((tag) => <span key={tag} className="pl-tag">#{tag}</span>)}
                        {(prompt.tags || []).length > 3 && <span className="text-[11px] text-[var(--text-4)]">+{prompt.tags.length - 3}</span>}
                      </div>

                      <div className="pl-content">{preview}</div>

                      <div className="mt-3 pt-3 border-t border-[var(--line-soft)] flex items-center justify-between">
                        <span className="text-[11px] text-[var(--text-3)]">{formatDate(prompt.updatedAt || prompt.createdAt)}</span>
                        <div className="flex items-center gap-2">
                          {copySuccessId === prompt.id && <span className="pl-toast"><Check className="h-3 w-3" />已复制</span>}
                          {isLong && <button onClick={() => setExpandedId(isExpanded ? null : prompt.id)} className="pl-expand">{isExpanded ? '收起' : '展开'}</button>}
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-2 border-t border-[var(--line-soft)] pt-3">
                        <button onClick={() => handleCopy(prompt)} className="pl-action pl-action-success" title="复制">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => openEditModal(prompt)} className="pl-action" title="编辑">
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => confirmDeletePrompt(prompt.id)} className="pl-action pl-action-danger" title="删除">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 添加/编辑模态框 */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card mx-4 w-full max-w-lg p-6 pl-gold" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-5">{editingPrompt ? '编辑提示词' : '添加提示词'}</h2>
            <div className="space-y-3.5">
              <div>
                <label className="mb-1.5 block text-[12px] text-[var(--text-2)] font-medium">标题</label>
                <input type="text" placeholder="提示词标题" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full" />
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] text-[var(--text-2)] font-medium">分类</label>
                <Dropdown
                  value={formData.category}
                  options={categories.map((cat) => ({ value: cat, label: cat }))}
                  onChange={(v) => setFormData({ ...formData, category: v })}
                  width="100%"
                  direction="down"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] text-[var(--text-2)] font-medium">提示词内容</label>
                <textarea placeholder="输入提示词..." value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} rows={8} className="w-full resize-none mono text-xs" style={{ fontFamily: 'var(--font-mono)' }} />
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] text-[var(--text-2)] font-medium">标签（逗号分隔）</label>
                <input type="text" placeholder="例如：GPT, 代码生成, 调试" value={formData.tags} onChange={(e) => setFormData({ ...formData, tags: e.target.value })} className="w-full" />
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button onClick={() => { setShowModal(false); setEditingPrompt(null); }} className="btn btn-default">取消</button>
              <button onClick={handleSave} disabled={!formData.title.trim() || !formData.content.trim()} className="btn btn-primary">
                {editingPrompt ? '保存修改' : '添加提示词'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 删除确认弹窗（与 API 密钥同款深色质感） */}
      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction?.type === 'category' ? '删除分类' : '删除提示词'}
        message={
          confirmAction?.type === 'category'
            ? `删除分类「${confirmAction.cat}」后，该分类下的提示词会被标记为「${DEFAULT_CATEGORIES[0]}」。此操作无法恢复。`
            : '删除后该提示词将无法恢复。请确认是否继续删除？'
        }
        confirmText="删除"
        cancelText="取消"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
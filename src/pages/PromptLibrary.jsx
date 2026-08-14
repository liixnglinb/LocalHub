import React, { useState, useEffect, useMemo } from 'react';
import { Search, Star, Copy, Plus, Edit3, Trash2, Filter, Check, Lightbulb, X } from 'lucide-react';
import Dropdown from '../components/Dropdown';
import ConfirmDialog from '../components/ConfirmDialog';

const DEFAULT_CATEGORIES = ['编程开发', '写作创作', '学习辅导', '工作效率', '角色扮演', '图像生成'];

const CATEGORY_COLORS = {
  编程开发: 'bg-blue-500/15 text-blue-300 border-blue-400/30',
  写作创作: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
  学习辅导: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
  工作效率: 'bg-cyan-500/15 text-cyan-300 border-cyan-400/30',
  角色扮演: 'bg-pink-500/15 text-pink-300 border-pink-400/30',
  图像生成: 'bg-cyan-500/15 text-cyan-300 border-cyan-400/30',
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

  useEffect(() => {
    Promise.all([
      window.electronAPI?.loadData('prompts'),
      window.electronAPI?.loadData('prompt-categories'),
    ]).then(([p, c]) => {
      if (Array.isArray(p)) setPrompts(p);
      if (Array.isArray(c) && c.length) setCategories(c);
    }).catch((e) => console.warn('load prompts failed:', e));
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
    <div className="flex gap-5 pb-8">
      {/* 左侧分类 */}
      <aside className="w-48 shrink-0 animate-slide-up">
        <div className="glass p-4 sticky top-2">
          <div className="text-[10px] text-white/40 uppercase tracking-widest font-semibold mb-3 px-2">分类</div>
          <nav className="space-y-0.5">
            <button onClick={() => setSelectedCategory('全部')} className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[13px] transition-all ${selectedCategory === '全部' ? 'bg-cyan-500/15 text-cyan-200 font-medium' : 'text-white/55 hover:text-white hover:bg-white/[0.04]'}`}>
              <span>全部</span>
              <span className="text-[10px] text-white/35">{prompts.length}</span>
            </button>
            {categories.map((cat) => (
              <div key={cat} className="group relative">
                <button onClick={() => setSelectedCategory(cat)} className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[13px] transition-all ${selectedCategory === cat ? 'bg-cyan-500/15 text-cyan-200 font-medium' : 'text-white/55 hover:text-white hover:bg-white/[0.04]'}`}>
                  <span className="truncate">{cat}</span>
                  <span className="text-[10px] text-white/35">{prompts.filter((p) => p.category === cat).length}</span>
                </button>
                {!DEFAULT_CATEGORIES.includes(cat) && (
                  <button onClick={() => confirmDeleteCategory(cat)} className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded text-white/30 hover:text-red-300 opacity-0 group-hover:opacity-100">
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </nav>
          {showAddCategory ? (
            <div className="mt-3 animate-slide-down">
              <input type="text" placeholder="分类名称" value={newCategoryInput} onChange={(e) => setNewCategoryInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { if (newCategoryInput.trim() && !categories.includes(newCategoryInput.trim())) persistCategories([...categories, newCategoryInput.trim()]); setNewCategoryInput(''); setShowAddCategory(false); } }} className="w-full text-sm" autoFocus />
              <div className="flex gap-1.5 mt-2">
                <button onClick={() => { if (newCategoryInput.trim() && !categories.includes(newCategoryInput.trim())) persistCategories([...categories, newCategoryInput.trim()]); setNewCategoryInput(''); setShowAddCategory(false); }} className="flex-1 btn btn-primary text-xs py-1">添加</button>
                <button onClick={() => { setShowAddCategory(false); setNewCategoryInput(''); }} className="flex-1 btn btn-default text-xs py-1">取消</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAddCategory(true)} className="mt-3 w-full flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] text-white/40 hover:text-white hover:bg-white/[0.04] transition-all">
              <Plus className="h-3.5 w-3.5" />
              添加分类
            </button>
          )}
        </div>
      </aside>

      {/* 右侧 */}
      <div className="flex-1 min-w-0 space-y-5">
        <div className="flex items-end justify-between animate-slide-up" style={{ animationDelay: '0.05s' }}>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AI 提示词库</h1>
            <p className="mt-1.5 text-white/45 text-sm">管理与收藏你的提示词模板</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="search-box w-44">
              <Search className="h-3.5 w-3.5" />
              <input type="text" placeholder="搜索提示词..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 min-w-0" />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="clear-btn" title="清空">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <button onClick={() => setShowFavoritesOnly(!showFavoritesOnly)} className={`btn ${showFavoritesOnly ? 'btn-primary' : 'btn-default'}`}>
              <Filter className="h-3.5 w-3.5" />
              仅收藏
            </button>
            <button onClick={openAddModal} className="btn btn-primary">
              <Plus className="h-4 w-4" />
              添加提示词
            </button>
          </div>
        </div>

        {filteredPrompts.length === 0 ? (
          <div className="glass py-20 text-center animate-slide-up">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5">
              <Lightbulb className="h-7 w-7 text-white/30" />
            </div>
            <p className="text-base font-medium">{showFavoritesOnly ? '没有收藏的提示词' : '还没有提示词'}</p>
            <p className="mt-1 text-sm text-white/40">{showFavoritesOnly ? '点击星标收藏你喜欢的提示词' : '点击"添加提示词"开始创建'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredPrompts.map((prompt, idx) => {
              const isExpanded = expandedId === prompt.id;
              const isLong = prompt.content.length > 120;
              const preview = isLong && !isExpanded ? prompt.content.slice(0, 120) + '…' : prompt.content;
              return (
                <div key={prompt.id} className="glass p-4 hover:bg-white/[0.05] transition-all animate-slide-up relative group" style={{ animationDelay: `${idx * 0.03}s` }}>
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button onClick={() => handleCopy(prompt)} className="p-1.5 rounded-lg bg-black/30 text-white/50 hover:text-emerald-300" title="复制">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => openEditModal(prompt)} className="p-1.5 rounded-lg bg-black/30 text-white/50 hover:text-white" title="编辑">
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => confirmDeletePrompt(prompt.id)} className="p-1.5 rounded-lg bg-black/30 text-white/50 hover:text-red-300" title="删除">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex items-start justify-between mb-2 pr-20">
                    <h3 className="text-[14px] font-semibold">{prompt.title}</h3>
                    <button onClick={(e) => { e.stopPropagation(); handleToggleFavorite(prompt.id); }} className={`p-1 rounded transition-all ${prompt.favorite ? 'text-amber-300' : 'text-white/30 hover:text-amber-300'}`} title={prompt.favorite ? '取消收藏' : '收藏'}>
                      <Star className="h-3.5 w-3.5" fill={prompt.favorite ? 'currentColor' : 'none'} />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                    <span className={`chip ${CATEGORY_COLORS[prompt.category] || 'bg-white/10 text-white/70 border-white/15'}`}>{prompt.category}</span>
                    {(prompt.tags || []).slice(0, 3).map((tag) => <span key={tag} className="text-[10.5px] text-white/40">#{tag}</span>)}
                    {(prompt.tags || []).length > 3 && <span className="text-[10.5px] text-white/30">+{prompt.tags.length - 3}</span>}
                  </div>

                  <div className="text-[12px] text-white/65 leading-relaxed mono whitespace-pre-wrap" style={{ fontFamily: 'var(--font-mono)' }}>{preview}</div>

                  <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[10.5px] text-white/40">
                    <span>{formatDate(prompt.updatedAt || prompt.createdAt)}</span>
                    <div className="flex items-center gap-2">
                      {copySuccessId === prompt.id && <span className="text-emerald-300 flex items-center gap-1"><Check className="h-3 w-3" />已复制</span>}
                      {isLong && <button onClick={() => setExpandedId(isExpanded ? null : prompt.id)} className="text-cyan-300 hover:text-cyan-200">{isExpanded ? '收起' : '展开'}</button>}
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
          <div className="modal-card mx-4 w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-5">{editingPrompt ? '编辑提示词' : '添加提示词'}</h2>
            <div className="space-y-3.5">
              <div>
                <label className="mb-1.5 block text-[12px] text-white/55 font-medium">标题</label>
                <input type="text" placeholder="提示词标题" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full" />
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] text-white/55 font-medium">分类</label>
                <Dropdown
                  value={formData.category}
                  options={categories.map((cat) => ({ value: cat, label: cat }))}
                  onChange={(v) => setFormData({ ...formData, category: v })}
                  width="100%"
                  direction="down"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] text-white/55 font-medium">提示词内容</label>
                <textarea placeholder="输入提示词..." value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} rows={8} className="w-full resize-none mono text-xs" style={{ fontFamily: 'var(--font-mono)' }} />
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] text-white/55 font-medium">标签（逗号分隔）</label>
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
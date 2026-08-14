import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Plus, Trash2, X, Search, Edit3, ExternalLink, Globe, RefreshCw, Copy } from 'lucide-react';
import Dropdown from '../components/Dropdown';
import ConfirmDialog from '../components/ConfirmDialog';

const CATEGORIES = ['工作', '学习', '娱乐', '工具', '开发', '其他'];

const CATEGORY_COLORS = {
  工作: 'bg-sky-500/15 text-sky-300 border-sky-400/30',
  学习: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
  娱乐: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-400/30',
  工具: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
  开发: 'bg-cyan-500/15 text-cyan-300 border-cyan-400/30',
  其他: 'bg-slate-500/15 text-slate-300 border-slate-400/30',
};

// 内置 favicon 兜底（用 SVG 生成纯色首字母方块）
function fallbackFaviconSvg(name) {
  const ch = (name || '?').trim().charAt(0).toUpperCase();
  const colors = ['#8b5cf6', '#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
  const c = colors[(name || '').charCodeAt(0) % colors.length];
  return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='${c}'/><text x='16' y='22' text-anchor='middle' font-family='Arial' font-weight='bold' font-size='18' fill='white'>${ch}</text></svg>`;
}

// favicon 源：favicon.im（国内可达，已验证），失败切站点自身 favicon.ico，再失败切首字母方块
function getFaviconUrl(url, name) {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    const host = u.hostname;
    return `https://favicon.im/${host}?larger=true`;
  } catch {
    return fallbackFaviconSvg(name);
  }
}

function getSiteFaviconUrl(url, name) {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    const host = u.hostname;
    return `https://${host}/favicon.ico`;
  } catch {
    return fallbackFaviconSvg(name);
  }
}

const DEFAULT_FORM = { name: '', url: '', description: '', category: '工具' };

export default function WebLinks() {
  const [links, setLinks] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('全部');
  const [formData, setFormData] = useState({ ...DEFAULT_FORM });
  const [urlError, setUrlError] = useState('');
  // favicon 回退等级：0=favicon.im → 1=站点自身 favicon.ico → 2=首字母方块
  const [faviconFallback, setFaviconFallback] = useState({});
  // 已缓存 favicon 的链接 id（防止重复请求）
  const cachedRef = useRef(new Set());
  // 正在拉取中的链接 id
  const fetchingRef = useRef(new Set());
  // 缓存失败过的 favicon URL，避免反复重试
  const failedFaviconsRef = useRef(new Set());

  // 获取 favicon 并缓存到链接数据（base64 持久化，之后不再请求网络）
  const cacheFavicon = useCallback(async (link) => {
    if (!link || cachedRef.current.has(link.id) || fetchingRef.current.has(link.id)) return;
    if (failedFaviconsRef.current.has(link.url)) return;
    if (link.favicon) { cachedRef.current.add(link.id); return; }
    fetchingRef.current.add(link.id);
    try {
      const r = await window.electronAPI?.fetchFavicon?.(link.url);
      if (r && r.ok && r.data) {
        setLinks((prev) => {
          const next = prev.map((l) => (l.id === link.id ? { ...l, favicon: r.data } : l));
          window.electronAPI?.saveData?.('web-links', next);
          return next;
        });
        cachedRef.current.add(link.id);
      }
    } catch {
      failedFaviconsRef.current.add(link.url);
    }
    fetchingRef.current.delete(link.id);
  }, []);

  // 加载链接后：对未缓存的链接逐个拉取 favicon 并缓存
  useEffect(() => {
    if (!loaded || !links.length) return;
    links.forEach((l) => { if (!l.favicon) cacheFavicon(l); });
  }, [loaded]); // 只在加载完成后跑一轮（首次渲染用在线源，后台悄悄缓存）

  const handleFaviconError = (id) => {
    setFaviconFallback((prev) => {
      const cur = prev[id] ?? 0;
      if (cur >= 2) return prev;
      return { ...prev, [id]: cur + 1 };
    });
  };

  // 刷新图标：清缓存 + 清回退等级 + 重新拉取
  const handleRefreshFavicon = (link) => {
    const next = links.map((l) => (l.id === link.id ? { ...l, favicon: undefined } : l));
    setLinks(next);
    window.electronAPI?.saveData?.('web-links', next);
    cachedRef.current.delete(link.id);
    setFaviconFallback((p) => { const n = { ...p }; delete n[link.id]; return n; });
    cacheFavicon({ ...link, favicon: undefined });
  };

  const getFaviconSrc = (link) => {
    // 优先用已缓存的 base64（不再请求网络）
    if (link.favicon) return link.favicon;
    const lvl = faviconFallback[link.id] ?? 0;
    if (lvl === 0) return getFaviconUrl(link.url, link.name);
    if (lvl === 1) return getSiteFaviconUrl(link.url, link.name);
    return fallbackFaviconSvg(link.name);
  };
  useEffect(() => {
    window.electronAPI?.loadData('web-links').then((data) => {
      if (data && Array.isArray(data)) setLinks(data);
    }).catch((e) => console.warn('load web-links failed:', e)).finally(() => setLoaded(true));
  }, []);

  const persistLinks = (newLinks) => {
    setLinks(newLinks);
    window.electronAPI?.saveData('web-links', newLinks);
  };

  const validateUrl = (url) => {
    if (!url.trim()) return '请输入网址';
    try {
      const u = url.startsWith('http') ? url : `https://${url}`;
      const parsed = new URL(u);
      if (!['http:', 'https:'].includes(parsed.protocol)) return '请使用 http:// 或 https:// 开头的网址';
      return '';
    } catch {
      return '请输入有效的网址';
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setFormData({ ...DEFAULT_FORM });
    setUrlError('');
    setShowModal(true);
  };

  const openEdit = (link) => {
    setEditingId(link.id);
    setFormData({ name: link.name, url: link.url, description: link.description || '', category: link.category });
    setUrlError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({ ...DEFAULT_FORM });
    setUrlError('');
  };

  const handleSave = () => {
    const err = validateUrl(formData.url);
    if (err) { setUrlError(err); return; }
    const url = formData.url.startsWith('http') ? formData.url.trim() : `https://${formData.url.trim()}`;
    const old = editingId ? links.find((l) => l.id === editingId) : null;
    const entry = {
      id: editingId || Date.now().toString(),
      name: formData.name.trim() || url,
      url,
      description: formData.description.trim(),
      category: formData.category,
      favicon: old?.favicon, // 编辑时保留已缓存的图标
      createdAt: old?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
    if (editingId) {
      persistLinks(links.map((l) => (l.id === editingId ? entry : l)));
    } else {
      persistLinks([entry, ...links]);
    }
    closeModal();
    // 添加/编辑后：后台自动抓取该网站图标并缓存到本地（成功后下次秒开）
    setTimeout(() => cacheFavicon(entry), 300);
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState(null); // 待删除链接 id（确认弹窗）

  const doDelete = (id) => {
    persistLinks(links.filter((l) => l.id !== id));
  };

  const handleDelete = (id) => setConfirmDeleteId(id);

  const handleOpen = (url) => window.electronAPI?.openExternal?.(url);

  const filteredLinks = useMemo(() => {
    return links.filter((link) => {
      const matchesSearch = !searchQuery.trim() ||
        link.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (link.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        link.url.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === '全部' || link.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [links, searchQuery, categoryFilter]);

  const categoryCounts = useMemo(() => {
    const m = { 全部: links.length };
    CATEGORIES.forEach((c) => { m[c] = links.filter((l) => l.category === c).length; });
    return m;
  }, [links]);

  return (
    <div className="space-y-6 pb-8">
      {/* 页面标题 */}
      <div className="flex items-end justify-between animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">网页链接</h1>
          <p className="mt-1.5 text-white/45 text-sm">收藏常用网页 · 点击直达</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="search-box w-44">
            <Search className="h-3.5 w-3.5" />
            <input
              type="text"
              placeholder="搜索链接..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 min-w-0"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="clear-btn"
                title="清空"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <Dropdown
            value={categoryFilter}
            options={[{ value: '全部', label: `全部分类 · ${categoryCounts['全部']}` }, ...CATEGORIES.map((cat) => ({ value: cat, label: `${cat} · ${categoryCounts[cat]}` }))]}
            onChange={setCategoryFilter}
            width="148px"
          />
          <button onClick={openAdd} className="btn btn-primary">
            <Plus className="h-4 w-4" />
            添加链接
          </button>
        </div>
      </div>

      {/* 链接网格 */}
      {loaded && filteredLinks.length === 0 ? (
        <div className="glass py-20 text-center animate-slide-up">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5">
            <Globe className="h-7 w-7 text-white/30" />
          </div>
          <p className="text-base font-medium">{searchQuery || categoryFilter !== '全部' ? '没有匹配的链接' : '还没有添加任何链接'}</p>
          <p className="mt-1 text-sm text-white/40">点击右上角"添加链接"开始收藏</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredLinks.map((link, idx) => {
            return (
              <div
                key={link.id}
                className="group glass p-4 hover:bg-white/[0.05] hover:-translate-y-0.5 transition-all duration-300 animate-slide-up relative"
                style={{ animationDelay: `${idx * 0.025}s` }}
              >
                {/* 操作按钮 */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button onClick={(e) => { e.stopPropagation(); handleRefreshFavicon(link); }} className="p-1.5 rounded-lg bg-black/30 text-white/50 hover:text-sky-300" title="刷新图标">
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); openEdit(link); }} className="p-1.5 rounded-lg bg-black/30 text-white/50 hover:text-white" title="编辑">
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(link.id); }} className="p-1.5 rounded-lg bg-black/30 text-white/50 hover:text-red-300" title="删除">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div onClick={() => handleOpen(link.url)} className="cursor-pointer">
                  {/* Header: favicon + name + open */}
                  <div className="flex items-start gap-3 mb-2.5">
                    <img
                      src={getFaviconSrc(link)}
                      alt={link.name}
                      className="h-9 w-9 rounded-lg bg-white/10 shrink-0 object-contain p-0.5"
                      onError={() => handleFaviconError(link.id)}
                      style={{ imageRendering: 'auto' }}
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[13.5px] font-semibold truncate">{link.name}</h3>
                      <div className="flex items-center gap-1 mt-0.5">
                        <p className="text-[11px] text-white/40 truncate flex-1 min-w-0">{link.url.replace(/^https?:\/\//, '')}</p>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(link.url); }}
                          className="p-0.5 rounded-[4px] text-white/25 hover:text-white hover:bg-white/[0.08] transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                          title="复制链接"
                        >
                          <Copy className="h-3 w-3" strokeWidth={1.8} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 描述 */}
                  {link.description && (
                    <p className="text-[11.5px] text-white/55 line-clamp-2 mb-2.5 min-h-[2.4em]">{link.description}</p>
                  )}

                  <div className="flex items-center justify-between mt-2">
                    <span className={`chip ${CATEGORY_COLORS[link.category] || CATEGORY_COLORS['其他']}`}>
                      {link.category}
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 text-white/30 group-hover:text-cyan-300 transition-colors" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 添加/编辑模态框 */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-card mx-4 w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{editingId ? '编辑链接' : '添加链接'}</h2>
              <button onClick={closeModal} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="mb-1.5 block text-[12px] text-white/55 font-medium">网站名称</label>
                <input type="text" placeholder="例如：GitHub" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full" />
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] text-white/55 font-medium">网站 URL</label>
                <input type="text" placeholder="https://github.com" value={formData.url} onChange={(e) => { setFormData({ ...formData, url: e.target.value }); setUrlError(''); }} className={`w-full ${urlError ? 'border-red-500/50' : ''}`} />
                {urlError && <p className="mt-1 text-[11px] text-red-300">{urlError}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] text-white/55 font-medium">功能描述</label>
                <textarea placeholder="简要描述..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full resize-none" />
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] text-white/55 font-medium">分类</label>
                <Dropdown
                  value={formData.category}
                  options={CATEGORIES.map((cat) => ({ value: cat, label: cat }))}
                  onChange={(v) => setFormData({ ...formData, category: v })}
                  width="100%"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button onClick={closeModal} className="btn btn-default">取消</button>
              <button onClick={handleSave} disabled={!formData.url.trim() || !formData.name.trim()} className="btn btn-primary">
                {editingId ? '保存修改' : '添加链接'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认弹窗（与全站一致） */}
      <ConfirmDialog
        open={!!confirmDeleteId}
        title="删除链接"
        message="删除后该链接将无法恢复。请确认是否继续删除？"
        confirmText="删除"
        cancelText="取消"
        onConfirm={() => { const id = confirmDeleteId; setConfirmDeleteId(null); if (id) doDelete(id); }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus, Eye, EyeOff, X, Save, Copy, Search, Edit3, ExternalLink, KeyRound, Layers,
  ShieldCheck, Trash2, Check,
} from 'lucide-react';
import COMPANY_LOGOS from '../assets/companyLogos';
import ConfirmDialog from '../components/ConfirmDialog';

const COMPANY_OPTIONS = Object.keys(COMPANY_LOGOS).filter((k) => k !== '自定义');
const COMPANY_OPTIONS_ALL = Object.keys(COMPANY_LOGOS);

const DEFAULT_FORM = {
  company: '',
  customCompany: '',
  keyName: '',
  apiKey: '',
  baseUrl: '',
  note: '',
};

function maskApiKey(key) {
  if (!key) return '';
  if (key.length <= 8) return key.slice(0, 4) + '••••';
  return key.slice(0, 6) + '••••' + key.slice(-4);
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ApiKeys() {
  const [keys, setKeys] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [showKey, setShowKey] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleKeyId, setVisibleKeyId] = useState(null); // 明文展示的密钥 id
  const [toast, setToast] = useState(null);               // 顶部提示

  useEffect(() => {
    (async () => {
      try {
        const data = await window.electronAPI?.loadData?.('api-keys');
        if (Array.isArray(data)) setKeys(data);
      } catch (err) {
        console.error('Failed to load api-keys:', err);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const persist = async (next) => {
    setKeys(next);
    try {
      await window.electronAPI?.saveData?.('api-keys', next);
    } catch (err) {
      console.error('Failed to save api-keys:', err);
    }
  };

  const openAdd = (company = '') => {
    setEditingId(null);
    setForm({ ...DEFAULT_FORM, company: company || COMPANY_OPTIONS[0] || '' });
    setShowKey(false);
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setForm({
      company: COMPANY_OPTIONS.includes(item.company) ? item.company : '自定义',
      customCompany: COMPANY_OPTIONS.includes(item.company) ? '' : item.company,
      keyName: item.keyName || '',
      apiKey: item.apiKey,
      baseUrl: item.baseUrl || '',
      note: item.note || '',
    });
    setShowKey(false);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm({ ...DEFAULT_FORM });
    setShowKey(false);
  };

  const handleSave = () => {
    const company = form.company === '自定义' ? (form.customCompany.trim() || '自定义') : form.company;
    if (!company.trim() || !form.apiKey.trim()) return;

    const entry = {
      id: editingId || Date.now().toString(),
      company,
      keyName: form.keyName.trim(),
      apiKey: form.apiKey.trim(),
      baseUrl: form.baseUrl.trim(),
      note: form.note.trim(),
      createdAt: editingId
        ? keys.find((k) => k.id === editingId)?.createdAt || new Date().toISOString()
        : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const next = editingId
      ? keys.map((k) => (k.id === editingId ? entry : k))
      : [entry, ...keys];

    persist(next);
    closeModal();
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState(null); // 待删除的密钥 id（弹确认框）

  const handleDelete = async (id) => {
    const next = keys.filter((k) => k.id !== id);
    await persist(next);
    showToast('已删除 · 此操作不可逆');
  };

  // 确认弹窗：删除后关闭并提示不可逆
  const handleConfirmDelete = async () => {
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    if (id) await handleDelete(id);
  };

  const toastTimer = useRef(null);

  const showToast = (text) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(text);
    toastTimer.current = setTimeout(() => {
      setToast(null);
      toastTimer.current = null;
    }, 1600);
  };

  const handleCopy = async (item) => {
    try {
      await navigator.clipboard.writeText(item.apiKey);
      showToast('已复制完整密钥');
    } catch {}
  };

  const handleCopyUrl = async (url, label) => {
    try {
      await navigator.clipboard.writeText(url);
      showToast(`已复制${label}`);
    } catch {}
  };

  const handleOpenConsole = (company) => {
    const meta = COMPANY_LOGOS[company];
    if (meta?.console) window.electronAPI?.openExternal?.(meta.console);
    else if (meta?.site) window.electronAPI?.openExternal?.(meta.site);
  };

  const filteredKeys = useMemo(() => {
    if (!searchQuery.trim()) return keys;
    const q = searchQuery.toLowerCase();
    return keys.filter(
      (k) => k.company.toLowerCase().includes(q) || (k.keyName || '').toLowerCase().includes(q) || (k.note || '').toLowerCase().includes(q) || (k.baseUrl || '').toLowerCase().includes(q)
    );
  }, [keys, searchQuery]);

  // 按供应商分组（保持添加顺序）
  const groupedKeys = useMemo(() => {
    const groups = new Map();
    for (const k of filteredKeys) {
      if (!groups.has(k.company)) groups.set(k.company, []);
      groups.get(k.company).push(k);
    }
    return Array.from(groups, ([company, items]) => ({ company, items }));
  }, [filteredKeys]);

  return (
    <div className="space-y-6 pb-10">
      {/* 页面标题 */}
      <div className="flex items-end justify-between animate-slide-up">
        <div>
          <h1 className="title-display text-[22px] tracking-tight">API 密钥管理</h1>
          <p className="mt-1.5 text-white/50 text-[12.5px]">覆盖全部国内 AI 平台 · 官方图标 · 本地加密保存</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="search-box w-44">
            <Search className="h-3.5 w-3.5" />
            <input
              type="text"
              placeholder="搜索..."
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
          <button onClick={openAdd} className="btn btn-primary">
            <Plus className="h-4 w-4" />
            添加密钥
          </button>
        </div>
      </div>

      {/* 空状态 */}
      {loaded && filteredKeys.length === 0 ? (
        <div className="glass py-20 text-center animate-slide-up">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04]" style={{ border: '1px solid var(--line)' }}>
            <KeyRound className="h-8 w-8 text-white/25" strokeWidth={1.5} />
          </div>
          <p className="text-[15px] font-medium text-white/70">{searchQuery ? '没有匹配的密钥' : '暂无 API 密钥'}</p>
          <p className="mt-1 text-[12.5px] text-white/40">{searchQuery ? '试试别的关键词' : '添加你的第一个密钥，开始使用 AI 平台'}</p>
          {!searchQuery && (
            <button onClick={() => openAdd()} className="btn btn-primary mt-5">
              <Plus className="h-4 w-4" />
              添加新密钥
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {groupedKeys.map((group) => {
            const meta = COMPANY_LOGOS[group.company] || COMPANY_LOGOS['自定义'];
            const Logo = meta.icon;
            return (
              <div key={group.company} className="animate-slide-up">
                {/* 供应商分组头 */}
                <div className="flex items-center gap-2.5 px-1 pb-2.5">
                  <Logo size={28} />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[13.5px] font-semibold">{group.company}</h3>
                    <p className="text-[10.5px] text-white/40 mt-0.5 flex items-center gap-1">
                      <Layers className="h-3 w-3" /> {group.items.length} 个密钥
                      {meta?.models && <span className="text-white/30"> · {meta.models}</span>}
                    </p>
                  </div>
                  <button onClick={() => handleOpenConsole(group.company)} className="btn btn-default text-xs shrink-0">
                    <ExternalLink className="h-3 w-3" /> 控制台
                  </button>
                  <button onClick={() => openAdd(group.company)} className="btn btn-primary text-xs shrink-0">
                    <Plus className="h-3 w-3" /> 添加密钥
                  </button>
                </div>

                {/* 密钥卡片列表（卡片式 + 夹线） */}
                <div className="space-y-2">
                  {group.items.map((item) => {
                    const isVisible = visibleKeyId === item.id;
                    return (
                      <div
                        key={item.id}
                        className="group flex items-center gap-4 rounded-[10px] px-4 py-3 transition-colors duration-150"
                        style={{
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.07)',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}
                      >
                        {/* 左侧：状态/类型区（盾牌 = 安全） */}
                        <div className="w-12 shrink-0 flex items-center justify-center">
                          <span
                            className="inline-flex items-center justify-center transition-transform duration-200"
                            style={{ transform: 'scale(1)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.12)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                          >
                            <ShieldCheck className="h-[18px] w-[18px] text-white/45 group-hover:text-cyan-300" strokeWidth={1.7} />
                          </span>
                        </div>

                        {/* 中间：信息展示区（不触发复制） */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[15px] font-semibold text-white/90 truncate">
                              {item.keyName || '未命名'}
                            </span>
                            {item.note && <span className="text-[10.5px] text-white/35 truncate hidden sm:inline">· {item.note}</span>}
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <code
                              className="text-[13px] text-[#888888] font-mono tracking-tight truncate"
                              style={{ fontFamily: 'var(--font-mono)' }}
                            >
                              {isVisible ? item.apiKey : maskApiKey(item.apiKey)}
                            </code>
                            <span className="text-[9.5px] text-white/25 shrink-0">{formatDate(item.updatedAt || item.createdAt)}</span>
                            {item.baseUrl && <span className="text-[9.5px] text-white/25 truncate max-w-[110px] shrink-0" title={item.baseUrl}>🔗 {item.baseUrl}</span>}
                          </div>
                        </div>

                        {/* 右侧：操作区（复制 / 查看 / 删除） */}
                        <div className="w-[120px] shrink-0 flex items-center justify-end gap-0.5">
                          <button
                            onClick={() => handleCopy(item)}
                            className="p-1.5 rounded-[7px] text-[#CCCCCC] hover:text-white hover:bg-white/[0.08] transition-colors"
                            title="复制完整密钥"
                          >
                            <Copy className="h-3.5 w-3.5" strokeWidth={1.8} />
                          </button>
                          <button
                            onClick={() => setVisibleKeyId(isVisible ? null : item.id)}
                            className="p-1.5 rounded-[7px] text-[#CCCCCC] hover:text-white hover:bg-white/[0.08] transition-colors"
                            title={isVisible ? '隐藏密钥' : '查看密钥'}
                          >
                            {isVisible ? <EyeOff className="h-3.5 w-3.5" strokeWidth={1.8} /> : <Eye className="h-3.5 w-3.5" strokeWidth={1.8} />}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(item.id)}
                            className="p-1.5 rounded-[7px] text-[#CCCCCC] hover:text-red-300 hover:bg-red-500/10 transition-colors"
                            title="删除密钥"
                          >
                            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 顶部 Toast（黑底白字） */}
      {toast && (
        <div
          className="fixed top-5 left-1/2 -translate-x-1/2 z-[10000] flex items-center gap-2 px-4 py-2 rounded-[10px] animate-slide-down"
          style={{
            background: 'rgba(18,18,20,0.96)',
            border: '1px solid rgba(255,255,255,0.14)',
            boxShadow: '0 12px 32px -8px rgba(0,0,0,0.7), 0 2px 8px -2px rgba(0,0,0,0.5)',
            color: '#F4F4F5',
            fontSize: 12.5,
          }}
        >
          <Check className="h-3.5 w-3.5" style={{ color: '#7FD8A8' }} strokeWidth={2.2} />
          {toast}
        </div>
      )}

      {/* 添加/编辑模态框 */}
      {/* 删除确认弹窗（深色高级质感） */}
      <ConfirmDialog
        open={!!confirmDeleteId}
        title="删除 API key"
        message="删除后该密钥将立即被禁用，且此操作无法恢复。请确认是否继续删除？"
        confirmText="删除"
        cancelText="取消"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />

      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className="modal-card mx-4 w-full max-w-lg flex flex-col"
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: '85vh' }}
          >
            {/* 固定头部 */}
            <div className="shrink-0 px-6 pt-6 pb-0">
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-semibold">{editingId ? '编辑密钥' : '添加密钥'}</h2>
                <button onClick={closeModal} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06]">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* 可滚动内容区 */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4" style={{ minHeight: 0 }}>
              {/* 公司选择（官方图标） */}
              <div>
                <label className="mb-2 block text-[12px] text-white/55 font-medium">选择平台</label>
                <div className="grid grid-cols-4 gap-2">
                  {COMPANY_OPTIONS_ALL.map((name) => {
                    const meta = COMPANY_LOGOS[name];
                    const Logo = meta.icon;
                    const selected = form.company === name;
                    const isCustom = name === '自定义';
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setForm({ ...form, company: name, customCompany: '' })}
                        className={`relative flex flex-col items-center gap-1 p-2 rounded-[10px] transition-colors duration-150 ${
                          selected
                            ? isCustom
                              ? 'bg-black/40 border border-white/[0.08] shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]'
                              : 'bg-white/[0.14] border border-white/[0.18]'
                            : isCustom
                              ? 'bg-black/25 border border-white/[0.04] shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)] hover:bg-black/35'
                              : 'bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.12]'
                        }`}
                      >
                        <Logo size={28} />
                        <span className={`text-[10px] truncate w-full text-center transition-colors ${
                          selected ? (isCustom ? 'text-white/70 font-medium' : 'text-white font-medium') : (isCustom ? 'text-white/45' : 'text-white/65')
                        }`}>{name}</span>
                        {selected && !isCustom && (
                          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 选中的平台信息 + 控制台直达 + 官方链接 */}
              {form.company && form.company !== '自定义' && COMPANY_LOGOS[form.company] && (
                <div className="p-3 rounded-[8px] bg-white/[0.03] border border-white/[0.06] animate-slide-down">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[12px] font-medium text-white/80">{COMPANY_LOGOS[form.company].name}</div>
                      <div className="text-[10.5px] text-white/45 mt-0.5 truncate">{COMPANY_LOGOS[form.company].models}</div>
                      {COMPANY_LOGOS[form.company].note && (
                        <div className="text-[10.5px] text-white/35 mt-0.5">{COMPANY_LOGOS[form.company].note}</div>
                      )}
                    </div>
                    <button onClick={() => handleOpenConsole(form.company)} className="btn btn-default text-xs shrink-0">
                      <ExternalLink className="h-3 w-3" />
                      控制台
                    </button>
                  </div>

                  {/* 官方链接：官网 + 控制台，每行带复制按钮 */}
                  <div className="mt-2.5 pt-2 border-t border-white/[0.06] space-y-1">
                    {COMPANY_LOGOS[form.company].site && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => window.electronAPI?.openExternal?.(COMPANY_LOGOS[form.company].site)}
                          className="flex items-center gap-1.5 text-[11px] text-white/40 hover:text-cyan-300 transition-colors flex-1 min-w-0 text-left"
                        >
                          <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                          </svg>
                          <span className="truncate">{COMPANY_LOGOS[form.company].site}</span>
                          <svg className="h-2.5 w-2.5 shrink-0 ml-auto opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M7 17L17 7" /><path d="M7 7H17V17" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleCopyUrl(COMPANY_LOGOS[form.company].site, '官网')}
                          className="p-1 rounded-[6px] text-white/30 hover:text-white hover:bg-white/[0.08] transition-colors shrink-0"
                          title="复制官网链接"
                        >
                          <Copy className="h-3 w-3" strokeWidth={1.8} />
                        </button>
                      </div>
                    )}
                    {COMPANY_LOGOS[form.company].console && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenConsole(form.company)}
                          className="flex items-center gap-1.5 text-[11px] text-white/40 hover:text-cyan-300 transition-colors flex-1 min-w-0 text-left"
                        >
                          <ExternalLink className="h-3 w-3 shrink-0" />
                          <span className="truncate">{COMPANY_LOGOS[form.company].console}</span>
                          <svg className="h-2.5 w-2.5 shrink-0 ml-auto opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M7 17L17 7" /><path d="M7 7H17V17" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleCopyUrl(COMPANY_LOGOS[form.company].console, '控制台')}
                          className="p-1 rounded-[6px] text-white/30 hover:text-white hover:bg-white/[0.08] transition-colors shrink-0"
                          title="复制控制台链接"
                        >
                          <Copy className="h-3 w-3" strokeWidth={1.8} />
                        </button>
                      </div>
                    )}
                  </div>

                  {(() => {
                    const cnt = keys.filter((k) => k.company === form.company).length;
                    if (cnt > 0) {
                      return (
                        <div className="mt-2 pt-2 border-t border-white/[0.06] text-[10.5px] text-white/45 flex items-center gap-1.5">
                          <Layers className="h-3 w-3" />
                          该平台已配置 <span className="text-white/80 font-medium">{cnt}</span> 个密钥，可以再添加一个（如不同项目 / 不同用途）
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}

              {/* 自定义公司名称 */}
              {form.company === '自定义' && (
                <div className="animate-slide-down">
                  <label className="mb-1.5 block text-[12px] text-white/55 font-medium">自定义名称</label>
                  <input
                    type="text"
                    value={form.customCompany}
                    onChange={(e) => setForm({ ...form, customCompany: e.target.value })}
                    placeholder="输入公司名称"
                    className="w-full"
                  />
                </div>
              )}

              {/* 用途名称（区分同一供应商的多个密钥） */}
              <div>
                <label className="mb-1.5 block text-[12px] text-white/55 font-medium">
                  用途名称 <span className="text-white/35">(可选，如"项目A"、"测试账号")</span>
                </label>
                <input
                  type="text"
                  value={form.keyName}
                  onChange={(e) => setForm({ ...form, keyName: e.target.value })}
                  placeholder="例如：个人开发 / 项目A / 备用"
                  className="w-full"
                />
              </div>

              {/* API Key */}
              <div>
                <label className="mb-1.5 block text-[12px] text-white/55 font-medium">API Key</label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={form.apiKey}
                    onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                    placeholder="sk-..."
                    className="w-full pr-10 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Base URL */}
              <div>
                <label className="mb-1.5 block text-[12px] text-white/55 font-medium">
                  Base URL <span className="text-white/35">(可选，默认官方地址)</span>
                </label>
                <input
                  type="text"
                  value={form.baseUrl}
                  onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                  placeholder="留空使用官方默认"
                  className="w-full"
                />
              </div>

              {/* 备注 */}
              <div>
                <label className="mb-1.5 block text-[12px] text-white/55 font-medium">
                  备注 <span className="text-white/35">(可选)</span>
                </label>
                <input
                  type="text"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="例如：个人开发账号"
                  className="w-full"
                />
              </div>
            </div>

            {/* 固定底部按钮 */}
            <div className="shrink-0 px-6 pb-6 pt-2">
              <div className="flex items-center justify-end gap-2">
                <button onClick={closeModal} className="btn btn-default">取消</button>
                <button
                  onClick={handleSave}
                  disabled={!form.company || (form.company === '自定义' && !form.customCompany.trim()) || !form.apiKey.trim()}
                  className="btn btn-primary"
                >
                  <Save className="h-4 w-4" />
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

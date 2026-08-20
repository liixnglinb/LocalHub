import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  BookOpen, Plus, Edit3, Trash2, Search, Filter, GitBranch,
  Share2, Check, Globe, Move,
  FileText, Copy, X, Download, Eye, Wand2,
} from 'lucide-react';
import Dropdown from '../components/Dropdown';
import ConfirmDialog from '../components/ConfirmDialog';

const SUBJECTS = ['数学', '英语', '编程', '物理', '化学', '历史', '其他'];

const SUBJECT_COLORS = {
  数学: 'bg-blue-500/12 text-blue-600 border-blue-400/30',
  英语: 'bg-emerald-500/12 text-emerald-600 border-emerald-400/30',
  编程: 'bg-cyan-500/12 text-cyan-600 border-cyan-400/30',
  物理: 'bg-orange-500/12 text-orange-600 border-orange-400/30',
  化学: 'bg-rose-500/12 text-rose-600 border-rose-400/30',
  历史: 'bg-amber-500/12 text-amber-600 border-amber-400/30',
  其他: 'bg-slate-500/12 text-slate-600 border-slate-400/30',
};

const NODE_PALETTE = ['#8b5cf6', '#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];

/* ============================================================
 * 思维导图数据模型（draw.io 风格：节点带坐标 + 树结构）
 * ============================================================ */
const NODE_W = 150;
const NODE_H = 40;
const H_GAP = 90;   // 父子水平间距
const V_GAP = 26;   // 兄弟垂直间距

function buildNode(id, text) {
  return { id, text, children: [], x: 0, y: 0, note: '', noteType: 'text' };
}

// 水平树自动布局：根在左，子向右展开
function layoutTree(root) {
  const calc = (node, depth) => {
    node.x = depth * (NODE_W + H_GAP);
    if (!node.children || node.children.length === 0) {
      node.y = 0;
      return { y: 0, h: NODE_H };
    }
    let totalH = 0;
    const spans = [];
    for (const c of node.children) {
      const s = calc(c, depth + 1);
      spans.push(s);
      totalH += s.h + V_GAP;
    }
    totalH -= V_GAP;
    let cursor = -totalH / 2;
    for (let i = 0; i < node.children.length; i++) {
      const s = spans[i];
      node.children[i].y = cursor + s.h / 2;
      cursor += s.h + V_GAP;
    }
    node.y = 0;
    return { y: node.y, h: Math.max(NODE_H, totalH) };
  };
  calc(root, 0);
  return root;
}

// 收集所有节点（扁平列表，用于渲染）
function flatten(nodes, out = []) {
  for (const n of nodes) { out.push(n); if (n.children) flatten(n.children, out); }
  return out;
}

/* ============================================================
 * 思维导图画布（参考 video-workflow 风格）
 * 坐标系：root 在 (0,0)，渲染时整体偏移到视口中心 + pan
 * 交互：编辑模式可拖拽节点+点击编辑；阅读模式只可平移/缩放/点击查看
 * 点击节点 → 弹出固定大小编辑框（屏幕坐标，自动上下翻转保证可见）
 * ============================================================ */
function MindMapCanvas({
  mindmap, selectedId, onSelect, zoom, setZoom, onCommitLive,
  mode,           // 'edit' | 'read'
  onRename,       // (nodeId, text) => void
  onDelete,       // (nodeId) => void
  onAddChild,     // (nodeId) => void
  onOpenNote,     // (nodeId) => void
}) {
  const wrapRef = useRef(null);
  const [size, setSize] = useState({ w: 800, h: 500 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  // 弹出编辑框（画布坐标定位，显示在节点下方并跟随节点）
  const [popup, setPopup] = useState(null); // { nodeId, x, y, boxW, boxH, below }
  const [popupText, setPopupText] = useState('');
  // 重命名子模式：true 时 popup 内显示输入框
  const [renameMode, setRenameMode] = useState(false);

  // 测量视口 + 首次居中
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setSize({ w: r.width, h: r.height });
      setPan((p) => {
        if (p._init) return p;
        return { _init: true, x: r.width / 2 - NODE_W / 2, y: r.height / 2 - NODE_H / 2 };
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Hooks 全部在条件 return 之前调用（遵守 React Hooks 规则）
  const movedRef = useRef(false);
  const mmRoot = mindmap ? mindmap.root : null;
  const allNodes = useMemo(() => (mmRoot ? flatten([mmRoot]) : []), [mmRoot]);
  const links = useMemo(() => {
    if (!mmRoot) return [];
    const out = [];
    const collect = (node) => {
      if (node.children) for (const c of node.children) { out.push({ from: node, to: c }); collect(c); }
    };
    collect(mmRoot);
    return out;
  }, [mmRoot]);

  if (!mindmap) return null;
  const root = mindmap.root;

  const offsetX = pan.x;
  const offsetY = pan.y;

  const onWrapPointerDown = (e) => {
    if (e.target.closest('.mm-node') || e.target.closest('.mm-popup')) return;
    setPopup(null);
    setPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onWrapPointerMove = (e) => {
    if (panning) setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    if (dragging && mode === 'edit') {
      setDragOffset({
        x: (e.clientX - dragging.startX) / zoom,
        y: (e.clientY - dragging.startY) / zoom,
      });
    }
  };
  const onWrapPointerUp = () => {
    if (panning) setPanning(false);
    if (dragging && mode === 'edit') {
      const moved = Math.abs(dragOffset.x) > 0.5 || Math.abs(dragOffset.y) > 0.5;
      if (moved) {
        movedRef.current = true;
        const copy = JSON.parse(JSON.stringify(mindmap));
        const t = flatten([copy.root]).find((n) => n.id === dragging.id);
        if (t) { t.x = Math.round(dragging.baseX + dragOffset.x); t.y = Math.round(dragging.baseY + dragOffset.y); }
        onCommitLive(copy);
      }
      // 松开后：若拖的是编辑框所在节点，在新位置下方重新显示编辑框
      if (dragging.restorePopup) {
        const node = flatten([root]).find((n) => n.id === dragging.id);
        if (node) showPopupAt(node, { x: dragging.baseX + dragOffset.x - node.x, y: dragging.baseY + dragOffset.y - node.y });
        else setPopup(null);
      }
      setDragging(null);
      setDragOffset({ x: 0, y: 0 });
    }
  };

  // 在节点下方显示跟随编辑框（画布坐标；下方放不下时自动移到上方）
  const showPopupAt = (node, offset = { x: 0, y: 0 }) => {
    const boxW = mode === 'edit' ? 168 : 240;
    const boxH = mode === 'edit' ? 104 : 120;
    const nx = node.x + (offset.x || 0);
    const ny = node.y + (offset.y || 0);
    const canvasW = (size.w || 800) / zoom;
    const canvasH = (size.h || 500) / zoom;
    let px = nx + NODE_W / 2 - boxW / 2;
    let below = true;
    let py = ny + NODE_H + 10;
    if (py + boxH > canvasH) { below = false; py = ny - boxH - 10; } // 下方放不下 → 上方
    px = Math.max(4, Math.min(px, Math.max(4, canvasW - boxW - 4)));
    setPopup({ nodeId: node.id, x: px, y: py, boxW, boxH, below, mode });
    setPopupText(node.text);
  };

  // 点击节点（编辑模式=弹菜单；阅读模式=弹查看框），均跟随节点下方
  const handleNodeClick = (e, node) => {
    e.stopPropagation();
    if (movedRef.current) { movedRef.current = false; return; } // 刚拖拽过，不弹框
    onSelect(node.id);
    showPopupAt(node);
  };

  // 节点拖拽（仅编辑模式）：拖动时编辑框消失，松开后重新出现
  const onNodePointerDown = (e, node) => {
    e.stopPropagation();
    if (mode !== 'edit') return;
    onSelect(node.id);
    // 记住是否正在显示该节点的编辑框（拖完要恢复）
    const restore = popup && popup.nodeId === node.id;
    setDragging({ id: node.id, startX: e.clientX, startY: e.clientY, baseX: node.x, baseY: node.y, restorePopup: restore });
    setPopup(null);        // 拖动时编辑框消失
    setRenameMode(false);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleWheel = (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setZoom(Math.max(0.3, Math.min(2, zoom + delta)));
  };

  // 圆点网格（CSS 背景）
  const gridStyle = {
    position: 'absolute',
    left: 0, top: 0, right: 0, bottom: 0,
    backgroundImage: 'radial-gradient(circle, rgba(20,24,33,0.12) 1.1px, transparent 1.1px)',
    backgroundSize: `${30 * zoom}px ${30 * zoom}px`,
    backgroundPosition: `${offsetX % (30 * zoom)}px ${offsetY % (30 * zoom)}px`,
    pointerEvents: 'none',
  };

  const savePopup = () => {
    if (popup && popupText.trim()) onRename(popup.nodeId, popupText.trim());
    setPopup(null);
  };

  return (
    <div
      ref={wrapRef}
      onPointerDown={onWrapPointerDown}
      onPointerMove={onWrapPointerMove}
      onPointerUp={onWrapPointerUp}
      onWheel={handleWheel}
      className="relative overflow-hidden select-none"
      style={{
        height: '65vh', minHeight: 480,
        cursor: mode === 'edit' ? (panning ? 'grabbing' : 'grab') : 'default',
        background: 'var(--bg-2)',
        borderRadius: 'var(--r-2)',
        border: '1px solid var(--line)',
      }}
    >
      {/* 圆点网格 */}
      <div style={gridStyle} />

      {/* 节点 + 连线层 */}
      <div className="absolute" style={{ left: 0, top: 0, width: 0, height: 0, transform: `translate(${offsetX}px, ${offsetY}px) scale(${zoom})`, transformOrigin: '0 0' }}>
        {/* SVG 连线（视频流风格：灰色细线 + 圆角贝塞尔） */}
        <svg style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', width: 0, height: 0 }}>
          {links.map(({ from, to }, i) => {
            const x1 = from.x + NODE_W;
            const y1 = from.y + NODE_H / 2;
            const x2 = to.x;
            const y2 = to.y + NODE_H / 2;
            const dx = Math.max(24, Math.abs(x2 - x1) * 0.5);
            const path = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
            return <path key={i} d={path} fill="none" stroke="rgba(20,24,33,0.2)" strokeWidth="1.8" strokeLinecap="round" />;
          })}
        </svg>

        {/* 节点层 */}
        {allNodes.map((node) => {
          const isSelected = selectedId === node.id;
          const isDragging = dragging && dragging.id === node.id;
          const depth = getDepth(node, root);
          const color = NODE_PALETTE[depth % NODE_PALETTE.length];
          const hasNote = !!node.note && node.note.trim().length > 0;
          const noteType = node.noteType || 'text';
          const nx = node.x + (isDragging ? dragOffset.x : 0);
          const ny = node.y + (isDragging ? dragOffset.y : 0);
          return (
            <div
              key={node.id}
              className="mm-node group absolute flex items-center justify-center px-3 rounded-[8px]"
              style={{
                left: nx,
                top: ny,
                width: NODE_W,
                height: NODE_H,
                background: isSelected ? 'var(--sel)' : 'var(--bg-1)',
                border: `1.5px solid ${isSelected ? color : 'var(--line)'}`,
                boxShadow: isSelected ? `0 0 14px -2px ${color}66` : 'none',
                zIndex: isDragging ? 10 : 1,
                cursor: mode === 'edit' ? 'move' : 'pointer',
              }}
              onPointerDown={(e) => onNodePointerDown(e, node)}
              onClick={(e) => handleNodeClick(e, node)}
              title={hasNote ? '点击查看/编辑' : '点击编辑'}
            >
              <span className="text-[12.5px] font-medium text-[var(--text-1)] truncate w-full text-center">{node.text}</span>
              {hasNote && (
                <span className="absolute top-0.5 right-1 text-[9px] rounded px-1 py-px font-semibold"
                  style={{
                    color: noteType === 'python' ? 'var(--info)' : noteType === 'matlab' ? 'var(--warn)' : 'var(--success)',
                    background: noteType === 'python' ? 'rgba(59,130,246,0.12)' : noteType === 'matlab' ? 'rgba(245,158,11,0.12)' : 'rgba(34,197,94,0.12)',
                  }}
                >
                  {noteType === 'python' ? 'Py' : noteType === 'matlab' ? 'ML' : '📄'}
                </span>
              )}
              {/* 编辑模式下的子节点快捷按钮 */}
              {mode === 'edit' && (
                <button
                  onClick={(e) => { e.stopPropagation(); onAddChild(node.id); }}
                  className="absolute -right-2 -top-2 h-5 w-5 rounded-full flex items-center justify-center text-white bg-[var(--accent)] hover:bg-[var(--accent-2)] shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  title="添加子节点"
                >
                  <Plus className="h-3 w-3" strokeWidth={2.5} />
                </button>
              )}
            </div>
          );
        })}

      {/* 点击节点弹出的编辑/查看框（画布坐标，跟随节点下方） */}
      {popup && (
        <div
          className="mm-popup absolute z-50 rounded-[12px] animate-scale-in"
          style={{
            width: popup.boxW,
            left: popup.x,
            top: popup.y,
            background: 'var(--bg-1)',
            border: '1px solid var(--line)',
            boxShadow: 'var(--elev-2)',
            padding: '10px 12px',
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* 小三角指示（节点下方 → 三角朝上；上方 → 三角朝下） */}
          <div
            className="absolute w-0 h-0"
            style={{
              left: Math.min(popup.boxW - 26, Math.max(12, popup.boxW / 2 - 6)),
              top: popup.below ? 'auto' : -6,
              bottom: popup.below ? -6 : 'auto',
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: popup.below ? 'none' : '6px solid var(--line-strong)',
              borderBottom: popup.below ? '6px solid var(--line-strong)' : 'none',
            }}
          />
          {mode === 'edit' && renameMode ? (
            <>
              {/* 重命名输入框 */}
              <input
                type="text"
                value={popupText}
                onChange={(e) => setPopupText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { if (popupText.trim()) onRename(popup.nodeId, popupText.trim()); setPopup(null); setRenameMode(false); } if (e.key === 'Escape') { setPopup(null); setRenameMode(false); } }}
                className="w-full text-[12.5px] px-2.5 py-1.5 rounded-[7px] border border-[var(--line)] outline-none focus:border-[var(--accent)] text-[var(--text-1)]"
                autoFocus
                placeholder="输入新节点名称"
              />
              <div className="mt-2 flex items-center justify-end gap-1.5">
                <button onClick={() => setPopup(null)} className="text-[11px] text-[var(--text-3)] hover:text-[var(--text-1)] px-2 py-1">取消</button>
                <button onClick={() => { if (popupText.trim()) onRename(popup.nodeId, popupText.trim()); setPopup(null); setRenameMode(false); }} disabled={!popupText.trim()} className="btn btn-primary text-xs py-1 px-3">
                  <Check className="h-3 w-3" /> 保存
                </button>
              </div>
            </>
          ) : mode === 'edit' ? (
            <>
              {/* 菜单：编辑节点名称 / 添加内容 */}
              <button
                onClick={() => { setRenameMode(true); }}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-[8px] text-[12.5px] text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors"
                style={{ background: 'transparent' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover-2)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <Edit3 className="h-3.5 w-3.5 text-[var(--text-3)]" strokeWidth={1.6} />
                编辑节点名称
              </button>
              <button
                onClick={() => { onOpenNote(popup.nodeId); setPopup(null); }}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-[8px] text-[12.5px] text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors"
                style={{ background: 'transparent' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover-2)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <FileText className="h-3.5 w-3.5 text-[var(--text-3)]" strokeWidth={1.6} />
                添加内容
              </button>
            </>
          ) : (
            <>
              <div className="text-[12.5px] font-semibold text-[var(--text-1)] truncate pr-6">{popupText}</div>
              {(() => {
                const n = allNodes.find((x) => x.id === popup.nodeId);
                const nt = n?.noteType || 'text';
                if (n?.note) {
                  return nt !== 'text' ? (
                    <pre className="mt-1.5 text-[11px] text-[var(--text-2)] leading-relaxed max-h-24 overflow-y-auto whitespace-pre-wrap rounded-md p-2"
                      style={{ fontFamily: 'var(--font-mono)', background: 'var(--bg-2)', border: '1px solid var(--line-soft)' }}>
                      {n.note}
                    </pre>
                  ) : (
                    <p className="mt-1.5 text-[11px] text-[var(--text-2)] leading-relaxed max-h-16 overflow-y-auto whitespace-pre-wrap">{n.note}</p>
                  );
                }
                return <p className="mt-1.5 text-[11px] text-[var(--text-4)]">（无文档内容）</p>;
              })()}
              <div className="mt-2 flex items-center justify-end">
                <button onClick={() => setPopup(null)} className="btn btn-default text-xs py-1.5 px-3">
                  <X className="h-3 w-3" /> 关闭
                </button>
              </div>
            </>
          )}
        </div>
      )}
      </div>

      {/* 画布提示（左下角） */}
      <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 text-[10.5px] text-[var(--text-3)] bg-[var(--bg-1)] border border-[var(--line)] rounded-[6px] px-2 py-1 pointer-events-none">
        <Move className="h-3 w-3" />
        {mode === 'edit' ? '拖节点移动 · 点击节点编辑 · Ctrl+滚轮缩放' : '阅读模式 · 点击节点查看 · Ctrl+滚轮缩放'}
      </div>
    </div>
  );
}

function getDepth(node, root, d = 0) {
  if (node.id === root.id) return 0;
  const find = (n, depth) => {
    if (n.id === node.id) return depth;
    if (n.children) for (const c of n.children) { const r = find(c, depth + 1); if (r !== -1) return r; }
    return -1;
  };
  return find(root, 0);
}

/* ============================================================
 * 主组件
 * ============================================================ */
export default function LearningHub() {
  const [activeTab, setActiveTab] = useState('list');
  const [materials, setMaterials] = useState([]);
  const [mindmaps, setMindmaps] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('全部');
  const [showModal, setShowModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [detailMaterial, setDetailMaterial] = useState(null);
  const [detailCopied, setDetailCopied] = useState(false);
  const [formData, setFormData] = useState({ title: '', subject: SUBJECTS[0], content: '', tags: '', format: 'text' });
  const [currentMindmapId, setCurrentMindmapId] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [showNodeModal, setShowNodeModal] = useState(false);
  const [nodeModalMode, setNodeModalMode] = useState('add');
  const [nodeModalText, setNodeModalText] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportText, setExportText] = useState('');
  const [copied, setCopied] = useState(false);
  const [webQuery, setWebQuery] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      window.electronAPI?.loadData('learning-materials'),
      window.electronAPI?.loadData('mindmaps'),
    ]).then(([m, mm]) => {
      if (Array.isArray(m)) setMaterials(m);
      if (mm && typeof mm === 'object') {
        // 兼容旧数据：无坐标的导图自动布局
        const fixed = {};
        Object.entries(mm).forEach(([k, v]) => {
          if (v && v.root && v.root.children) {
            fixed[k] = { ...v, root: layoutTree(JSON.parse(JSON.stringify(v.root))) };
          } else {
            fixed[k] = v;
          }
        });
        setMindmaps(fixed);
      }
    }).catch((e) => console.warn('load learning-hub failed:', e)).finally(() => setLoaded(true));
  }, []);

  const persistMaterials = useCallback((next) => { setMaterials(next); window.electronAPI?.saveData?.('learning-materials', next); }, []);
  const persistMindmaps = useCallback((next) => { setMindmaps(next); window.electronAPI?.saveData?.('mindmaps', next); }, []);

  /* ---------- 资料 CRUD ---------- */
  const openAddModal = () => { setEditingMaterial(null); setFormData({ title: '', subject: SUBJECTS[0], content: '', tags: '', format: 'text' }); setShowModal(true); };
  const openEditModal = (m) => { setEditingMaterial(m); setFormData({ title: m.title, subject: m.subject, content: m.content, tags: (m.tags || []).join(', '), format: m.format || 'text' }); setShowModal(true); };

  const handleSaveMaterial = () => {
    if (!formData.title.trim() || !formData.content.trim()) return;
    const tags = formData.tags.split(',').map((t) => t.trim()).filter(Boolean);
    if (editingMaterial) {
      persistMaterials(materials.map((m) => m.id === editingMaterial.id
        ? { ...m, title: formData.title.trim(), subject: formData.subject, content: formData.content.trim(), tags, format: formData.format || 'text', updatedAt: Date.now() }
        : m));
    } else {
      persistMaterials([
        { id: Date.now().toString(), title: formData.title.trim(), subject: formData.subject, content: formData.content.trim(), tags, format: formData.format || 'text', createdAt: Date.now(), updatedAt: Date.now() },
        ...materials,
      ]);
    }
    setShowModal(false);
    setEditingMaterial(null);
  };

  const [confirmDelete, setConfirmDelete] = useState(null); // { type: 'material'|'mindmap'|'node', id }
  const handleDeleteMaterial = (id) => setConfirmDelete({ type: 'material', id });

  const doDeleteMaterial = (id) => {
    persistMaterials(materials.filter((m) => m.id !== id));
    const newMm = { ...mindmaps };
    delete newMm[id];
    persistMindmaps(newMm);
    if (currentMindmapId === id) { setCurrentMindmapId(null); setSelectedNodeId(null); }
  };

  /* 复制资料内容到剪贴板 */
  const handleDetailCopy = async () => {
    try {
      await navigator.clipboard.writeText(detailMaterial?.content || '');
      setDetailCopied(true);
      setTimeout(() => setDetailCopied(false), 1500);
    } catch { /* 剪贴板不可用时静默 */ }
  };

  /* ---------- 网上搜索（Bing 国内可用，直接打开搜索页） ---------- */
  const openWebSearch = (q) => {
    const query = String(q || '').trim().slice(0, 200);
    if (!query) return;
    const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
    window.electronAPI?.openExternal?.(url);
  };

  const searchWeb = (q = webQuery) => openWebSearch(q);

  /* ---------- 思维导图 ---------- */
  const getCurrentMindmap = () => currentMindmapId ? mindmaps[currentMindmapId] || null : null;

  const generateMindmap = (material) => {
    const root = buildNode('root', material.title);
    const newMindmap = { id: material.id, root: layoutTree(root) };
    persistMindmaps({ ...mindmaps, [material.id]: newMindmap });
    setCurrentMindmapId(material.id);
    setSelectedNodeId('root');
    setActiveTab('mindmap');
  };

  const openMindmap = (id) => { setCurrentMindmapId(id); setSelectedNodeId('root'); setZoomLevel(1); };

  const findNode = (node, id) => {
    if (node.id === id) return node;
    if (node.children) for (const c of node.children) { const f = findNode(c, id); if (f) return f; }
    return null;
  };

  const addRootNode = () => {
    const newId = 'mm_' + Date.now().toString(36);
    const newMindmap = { id: newId, root: layoutTree(buildNode('root', '新思维导图')) };
    persistMindmaps({ ...mindmaps, [newId]: newMindmap });
    setCurrentMindmapId(newId);
    setSelectedNodeId('root');
  };

  const openAddChild = () => { const mm = getCurrentMindmap(); if (!mm || !selectedNodeId) return; setNodeModalMode('add'); setNodeModalText(''); setShowNodeModal(true); };
  const openEditNode = (nodeId) => { const mm = getCurrentMindmap(); if (!mm || !nodeId) return; const n = findNode(mm.root, nodeId); if (!n) return; setSelectedNodeId(nodeId); setNodeModalMode('edit'); setNodeModalText(n.text); setShowNodeModal(true); };

  // ===== 思维导图新模式：直接添加子节点 / 一键整理 / 编辑·阅读模式 =====
  const [mmMode, setMmMode] = useState('edit'); // 'edit' | 'read'

  // 直接添加子节点（不弹窗）：加"新节点"，自动布局，选中
  const addChildDirect = (parentId) => {
    const mm = getCurrentMindmap(); if (!mm || !parentId) return;
    const newRoot = JSON.parse(JSON.stringify(mm.root));
    const p = findNode(newRoot, parentId);
    if (!p) return;
    p.children = p.children || [];
    const id = 'n_' + Date.now().toString(36);
    p.children.push(buildNode(id, '新节点'));
    const relaid = layoutTree(newRoot);
    persistMindmaps({ ...mindmaps, [currentMindmapId]: { ...mm, root: relaid } });
    setSelectedNodeId(id);
  };

  // 一键自动整理（重新布局所有节点）
  const autoLayout = () => {
    const mm = getCurrentMindmap(); if (!mm) return;
    const newRoot = layoutTree(JSON.parse(JSON.stringify(mm.root)));
    persistMindmaps({ ...mindmaps, [currentMindmapId]: { ...mm, root: newRoot } });
  };

  // 重命名节点（点击节点弹出框保存）
  const renameNode = (nodeId, text) => {
    const mm = getCurrentMindmap(); if (!mm || !nodeId || !text.trim()) return;
    const newRoot = JSON.parse(JSON.stringify(mm.root));
    const n = findNode(newRoot, nodeId);
    if (n) n.text = text.trim();
    persistMindmaps({ ...mindmaps, [currentMindmapId]: { ...mm, root: newRoot } });
  };

  // 节点文档（点击"添加内容"打开查看/编辑，支持文字/Python/MATLAB）
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteNodeId, setNoteNodeId] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [noteType, setNoteType] = useState('text'); // text | python | matlab
  const openNodeNote = (nodeId) => {
    const mm = getCurrentMindmap(); if (!mm || !nodeId) return;
    const n = findNode(mm.root, nodeId); if (!n) return;
    setSelectedNodeId(nodeId);
    setNoteNodeId(nodeId);
    setNoteText(n.note || '');
    setNoteType(n.noteType || 'text');
    setNoteModalOpen(true);
  };
  const saveNodeNote = () => {
    const mm = getCurrentMindmap(); if (!mm || !noteNodeId) return;
    const newRoot = JSON.parse(JSON.stringify(mm.root));
    const n = findNode(newRoot, noteNodeId);
    if (n) { n.note = noteText; n.noteType = noteType; }
    persistMindmaps({ ...mindmaps, [currentMindmapId]: { ...mm, root: newRoot } });
    setNoteModalOpen(false);
  };

  const handleNodeConfirm = () => {
    if (!nodeModalText.trim()) return;
    const mm = getCurrentMindmap(); if (!mm) return;
    const newRoot = JSON.parse(JSON.stringify(mm.root));
    if (nodeModalMode === 'add') {
      const p = findNode(newRoot, selectedNodeId);
      if (p) {
        p.children = p.children || [];
        const id = 'n_' + Date.now().toString(36);
        p.children.push(buildNode(id, nodeModalText.trim()));
        // 重新布局
        const relaid = layoutTree(newRoot);
        persistMindmaps({ ...mindmaps, [currentMindmapId]: { ...mm, root: relaid } });
        setSelectedNodeId(id);
      }
    } else {
      const n = findNode(newRoot, selectedNodeId);
      if (n) n.text = nodeModalText.trim();
      persistMindmaps({ ...mindmaps, [currentMindmapId]: { ...mm, root: newRoot } });
    }
    setShowNodeModal(false);
    setNodeModalText('');
  };

  const handleDeleteNode = () => {
    const mm = getCurrentMindmap(); if (!mm || !selectedNodeId) return;
    if (selectedNodeId === 'root') {
      setConfirmDelete({ type: 'mindmap', id: currentMindmapId });
      return;
    }
    setConfirmDelete({ type: 'node', id: selectedNodeId });
  };

  // 删除确认执行
  const doConfirmDelete = () => {
    const c = confirmDelete; setConfirmDelete(null);
    if (!c) return;
    if (c.type === 'material') { doDeleteMaterial(c.id); return; }
    if (c.type === 'mindmap') {
      const newMm = { ...mindmaps }; delete newMm[c.id];
      persistMindmaps(newMm); setCurrentMindmapId(null); setSelectedNodeId(null); return;
    }
    if (c.type === 'node') {
      const mm = getCurrentMindmap(); if (!mm) return;
      const remove = (n, id) => {
        if (!n.children) return false;
        const idx = n.children.findIndex((x) => x.id === id);
        if (idx !== -1) { n.children.splice(idx, 1); return true; }
        for (const ch of n.children) if (remove(ch, id)) return true;
        return false;
      };
      const newRoot = JSON.parse(JSON.stringify(mm.root));
      remove(newRoot, c.id);
      persistMindmaps({ ...mindmaps, [currentMindmapId]: { ...mm, root: layoutTree(newRoot) } });
      setSelectedNodeId('root');
    }
  };

  const commitMindmap = (live) => {
    if (!currentMindmapId) return;
    persistMindmaps({ ...mindmaps, [currentMindmapId]: live });
  };

  const handleExportMindmap = () => {
    const mm = getCurrentMindmap(); if (!mm) return;
    const ser = (n, indent = 0) => {
      let s = (indent === 0 ? '' : '  '.repeat(indent) + '- ') + n.text + '\n';
      if (n.children) for (const c of n.children) s += ser(c, indent + 1);
      return s;
    };
    setExportText(ser(mm.root));
    setShowExportModal(true);
    setCopied(false);
  };

  const handleCopyExport = async () => {
    try { await navigator.clipboard.writeText(exportText); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };

  // 真实下载：导出为 .md 文件（Blob + a[download]）
  const handleDownloadExport = () => {
    if (!exportText) return;
    const blob = new Blob(['\ufeff' + exportText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const mm = getCurrentMindmap();
    const base = currentMindmapId ? (materials.find((x) => x.id === currentMindmapId)?.title || mm?.root?.text || '思维导图') : '思维导图';
    a.href = url;
    a.download = `${base}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      const q = searchQuery.toLowerCase();
      const matchS = !q || m.title.toLowerCase().includes(q) || m.content.toLowerCase().includes(q) || (m.tags || []).some((t) => t.toLowerCase().includes(q));
      const matchC = subjectFilter === '全部' || m.subject === subjectFilter;
      return matchS && matchC;
    });
  }, [materials, searchQuery, subjectFilter]);

  const renderTopBar = () => (
    <div className="flex items-center gap-3.5 animate-slide-up">
      <div className="h-11 w-11 rounded-[12px] flex items-center justify-center shrink-0" style={{ background: 'rgba(5,150,105,.10)', border: '1px solid rgba(5,150,105,0.18)' }}>
        <BookOpen className="h-5 w-5 text-[#059669]" strokeWidth={1.6} />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="title-display text-[22px] tracking-tight text-[var(--text-1)]">学习资料库</h1>
          <span className="text-[10.5px] font-medium rounded-full px-2 py-0.5 shrink-0" style={{ background: 'rgba(5,150,105,.10)', color: '#059669' }}>知识卡片墙</span>
        </div>
        <p className="text-[12.5px] text-[var(--text-3)] mt-0.5">个人知识库 · 学科分类 · 联网搜索 · draw.io 式思维导图</p>
      </div>
    </div>
  );

  return (
    <div className="learning-hub space-y-5 pb-10">
      <style>{`
        .learning-hub {
          --accent: #059669;
          --accent-2: #047857;
          --accent-3: #10b981;
          --accent-soft: rgba(5, 150, 105, 0.10);
          --sel: rgba(5, 150, 105, 0.10);
        }
        .learning-hub .btn-primary { background: #059669; color: #fff; }
        .learning-hub .btn-primary:hover:not(:disabled) { background: #047857; }
        .learning-hub .btn-primary:active:not(:disabled) { background: #065f46; }
        .learning-hub .btn:focus-visible { outline-color: rgba(5, 150, 105, 0.5); }
        .learning-hub .search-box:focus-within { border-color: rgba(5, 150, 105, 0.5); box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.12); }
        .learning-hub .search-box:focus-within svg { color: #059669; }
        .learning-hub input:focus, .learning-hub textarea:focus, .learning-hub select:focus {
          border-color: rgba(5, 150, 105, 0.5);
          box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.12);
        }
        .learning-hub ::selection { background: rgba(5, 150, 105, 0.25); }
      `}</style>

      {renderTopBar()}

      {/* ===== 页签切换：资料列表 / 思维导图 ===== */}
      <div className="inline-flex p-1 rounded-full gap-1 animate-slide-up" style={{ background: 'var(--bg-1)', border: '1px solid var(--line)' }}>
        {[['list', '资料列表', BookOpen], ['mindmap', '思维导图', GitBranch]].map(([k, l, I]) => (
          <button
            key={k}
            onClick={() => setActiveTab(k)}
            style={activeTab === k ? { background: '#059669', color: '#fff' } : undefined}
            className={`flex items-center gap-1.5 px-5 py-2 rounded-full text-[12.5px] font-medium transition-colors ${activeTab === k ? 'shadow-sm' : 'text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--hover)]'}`}
          >
            <I className="h-3.5 w-3.5" strokeWidth={1.8} />
            {l}
          </button>
        ))}
      </div>

      {/* ===== 资料列表 ===== */}
      {activeTab === 'list' && (
        <div className="space-y-4 animate-fade-in">
          {/* 工具栏 */}
          <div className="flex flex-col md:flex-row gap-2.5">
            <div className="search-box flex-1 max-w-md">
              <Search className="h-3.5 w-3.5" />
              <input type="text" placeholder="搜索本地资料..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 min-w-0" />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="clear-btn" title="清空">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-[var(--text-3)]" />
              <Dropdown
                value={subjectFilter}
                options={[{ value: '全部', label: '全部分类' }, ...SUBJECTS.map((s) => ({ value: s, label: s }))]}
                onChange={setSubjectFilter}
                width="110px"
              />
            </div>
            <button onClick={openAddModal} className="btn btn-primary md:ml-auto">
              <Plus className="h-3.5 w-3.5" />
              添加资料
            </button>
          </div>

          {/* 联网搜索 */}
          <div className="rounded-[14px] p-4" style={{ background: 'rgba(5,150,105,.06)', border: '1px solid rgba(5,150,105,0.16)' }}>
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-[9px] flex items-center justify-center shrink-0" style={{ background: 'rgba(5,150,105,.12)', color: '#059669' }}>
                <Globe className="h-4 w-4" strokeWidth={1.6} />
              </div>
              <input
                type="text"
                placeholder="联网搜索学习资料 / 论文 / 教程..."
                value={webQuery}
                onChange={(e) => setWebQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchWeb()}
                className="flex-1"
              />
              <button onClick={() => searchWeb()} disabled={!webQuery.trim()} className="btn btn-primary">
                <Search className="h-3.5 w-3.5" />
                搜索
              </button>
            </div>
            <p className="mt-2 ml-[42px] text-[11.5px] text-[var(--text-3)]">将在浏览器新标签页打开 Bing 搜索结果</p>
          </div>

          {/* 资料卡片 */}
          {!loaded ? (
            <div className="rounded-[14px] bg-[var(--bg-1)] border border-[var(--line)] py-16 text-center">
              <p className="text-[13px] text-[var(--text-3)]">加载中...</p>
            </div>
          ) : filteredMaterials.length === 0 ? (
            <div className="rounded-[14px] bg-[var(--bg-1)] border border-[var(--line)] py-16 text-center">
              <div className="h-12 w-12 mx-auto rounded-[14px] flex items-center justify-center mb-3" style={{ background: 'rgba(5,150,105,.10)' }}>
                <BookOpen className="h-6 w-6 text-[#059669]" strokeWidth={1.5} />
              </div>
              <p className="text-[14px] font-medium text-[var(--text-1)]">{searchQuery || subjectFilter !== '全部' ? '没有匹配的资料' : '还没有学习资料'}</p>
              <p className="mt-1 text-[12px] text-[var(--text-3)]">点击"添加资料"开始记录你的第一张知识卡片</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMaterials.map((m, idx) => {
                const preview = m.content.length > 140 ? m.content.slice(0, 140) + '…' : m.content;
                const hasMm = !!mindmaps[m.id];
                const fmt = m.format || 'text';
                return (
                  <div key={m.id} className="relative group cursor-pointer transition-all select-none rounded-[14px] bg-[var(--bg-1)] border border-[var(--line)] hover:border-[#059669]/45 hover:shadow-[var(--elev-1)] animate-slide-up" style={{ animationDelay: `${idx * 0.03}s` }} onDoubleClick={() => setDetailMaterial(m)} title="双击查看详情">
                    {/* 左侧书签脊 */}
                    <div className="absolute left-0 top-0 bottom-0 w-[5px] rounded-l-[14px] bg-[#059669]" />
                    <div className="pl-4 pr-4 pt-4 pb-3.5">
                      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <button onClick={(e) => { e.stopPropagation(); openWebSearch(m.title); }} onDoubleClick={(e) => e.stopPropagation()} className="p-1.5 rounded-[6px] bg-[var(--bg-2)] text-[var(--text-3)] hover:text-[#059669]" title="网上搜索该主题">
                          <Globe className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); openEditModal(m); }} onDoubleClick={(e) => e.stopPropagation()} className="p-1.5 rounded-[6px] bg-[var(--bg-2)] text-[var(--text-3)] hover:text-[var(--text-1)]" title="编辑">
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteMaterial(m.id); }} onDoubleClick={(e) => e.stopPropagation()} className="p-1.5 rounded-[6px] bg-[var(--bg-2)] text-[var(--text-3)] hover:text-[var(--danger)]" title="删除">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {/* 标题行：文档图标 + 标题 */}
                      <div className="flex items-center gap-2.5 pr-20">
                        <div className="h-9 w-9 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: 'rgba(5,150,105,.10)', color: '#059669' }}>
                          <FileText className="h-4 w-4" strokeWidth={1.6} />
                        </div>
                        <h3 className="text-[14px] font-semibold text-[var(--text-1)] truncate">{m.title}</h3>
                      </div>
                      <div className="mt-2.5 flex items-center gap-2 flex-wrap pl-1">
                        <span className={`chip ${SUBJECT_COLORS[m.subject] || SUBJECT_COLORS['其他']}`}>{m.subject}</span>
                        {fmt !== 'text' && (
                          <span className="chip px-1.5 py-px text-[10px] font-semibold"
                            style={{
                              color: fmt === 'python' ? '#0ea5e9' : '#d97706',
                              background: fmt === 'python' ? 'rgba(14,165,233,0.12)' : 'rgba(217,119,6,0.12)',
                              borderColor: fmt === 'python' ? 'rgba(14,165,233,0.3)' : 'rgba(217,119,6,0.3)',
                            }}
                          >{fmt === 'python' ? '🐍 Python' : '🧮 MATLAB'}</span>
                        )}
                        {(m.tags || []).slice(0, 3).map((t) => <span key={t} className="text-[10.5px] text-[var(--text-3)]">#{t}</span>)}
                      </div>
                      {fmt !== 'text' ? (
                        <pre className="mt-2 text-[11px] text-[var(--text-2)] leading-relaxed rounded-md p-2.5 overflow-hidden whitespace-pre-wrap"
                          style={{ fontFamily: 'var(--font-mono)', background: 'var(--bg-2)', border: '1px solid var(--line-soft)', maxHeight: 72 }}>
                          {preview}
                        </pre>
                      ) : (
                        <p className="mt-2 text-[12px] text-[var(--text-2)] leading-relaxed line-clamp-3 min-h-[3.5em] pl-1">{preview}</p>
                      )}
                      <div className="mt-3 pt-3 border-t border-[var(--line-soft)] flex items-center justify-between pl-1">
                        <span className="text-[10.5px] text-[var(--text-3)]">{formatDate(m.updatedAt || m.createdAt)}</span>
                        <button onClick={(e) => { e.stopPropagation(); hasMm ? openMindmap(m.id) : generateMindmap(m); }} onDoubleClick={(e) => e.stopPropagation()} className="btn text-xs py-1.5 px-3" style={{ color: '#059669', border: '1px solid rgba(5,150,105,0.25)', background: 'rgba(5,150,105,0.06)' }}>
                          <GitBranch className="h-3 w-3" />
                          {hasMm ? '查看导图' : '生成导图'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== 思维导图 ===== */}
      {activeTab === 'mindmap' && (
        <div className="space-y-4 animate-fade-in">
          {/* 工具栏 */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex p-1 rounded-full gap-1" style={{ background: 'var(--bg-1)', border: '1px solid var(--line)' }}>
              {[['edit', '编辑模式', Edit3], ['read', '阅读模式', Eye]].map(([k, l, I]) => (
                <button
                  key={k}
                  onClick={() => setMmMode(k)}
                  style={mmMode === k ? { background: '#059669', color: '#fff' } : undefined}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[12px] font-medium transition-colors ${mmMode === k ? 'shadow-sm' : 'text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--hover)]'}`}
                >
                  <I className="h-3.5 w-3.5" strokeWidth={1.8} /> {l}
                </button>
              ))}
            </div>
            <div className="flex-1" />
            <button onClick={addRootNode} className="btn btn-primary text-xs"><Plus className="h-3 w-3" /> 新建导图</button>
            <button onClick={autoLayout} disabled={!currentMindmapId} className="btn btn-default text-xs"><Wand2 className="h-3 w-3" /> 一键整理</button>
            <button onClick={handleExportMindmap} disabled={!currentMindmapId} className="btn btn-default text-xs"><Download className="h-3 w-3" /> 导出</button>
            <button onClick={handleDeleteNode} disabled={!currentMindmapId} className="btn btn-default text-xs" style={{ color: 'var(--danger)' }}><Trash2 className="h-3 w-3" /> 删除</button>
          </div>

          {currentMindmapId && mindmaps[currentMindmapId] ? (
            <div className="rounded-[16px] bg-[var(--bg-1)] border border-[var(--line)] p-1.5">
              <MindMapCanvas
                mindmap={mindmaps[currentMindmapId]}
                selectedId={selectedNodeId}
                onSelect={setSelectedNodeId}
                zoom={zoomLevel}
                setZoom={setZoomLevel}
                onCommitLive={commitMindmap}
                mode={mmMode}
                onRename={renameNode}
                onDelete={handleDeleteNode}
                onAddChild={addChildDirect}
                onOpenNote={openNodeNote}
              />
            </div>
          ) : (
            <div className="rounded-[14px] bg-[var(--bg-1)] border border-[var(--line)] py-16 text-center">
              <div className="h-12 w-12 mx-auto rounded-[14px] flex items-center justify-center mb-3" style={{ background: 'rgba(5,150,105,.10)' }}>
                <GitBranch className="h-6 w-6 text-[#059669]" strokeWidth={1.5} />
              </div>
              <p className="text-[14px] font-medium text-[var(--text-1)]">还没有思维导图</p>
              <p className="mt-1 text-[12px] text-[var(--text-3)]">在资料列表点击"生成导图"，或点下方按钮新建</p>
              <button onClick={addRootNode} className="btn btn-primary text-xs mt-4"><Plus className="h-3 w-3" /> 新建导图</button>
            </div>
          )}
        </div>
      )}


      {/* 添加/编辑资料模态框 */}
      {showModal && (
        <div className="modal-overlay" onClick={() => { if (!formData.title.trim() && !formData.content.trim()) setShowModal(false); }}>
          <div className="modal-card mx-4 w-full max-w-lg p-5" style={{ borderTop: '3px solid #059669' }} onClick={(e) => e.stopPropagation()}>
            <h2 className="text-[15px] font-semibold mb-4 flex items-center gap-2">
              <span className="h-3.5 w-[3px] rounded-full bg-[#059669]" />
              {editingMaterial ? '编辑资料' : '添加资料'}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[11.5px] text-[var(--text-2)] font-medium">标题</label>
                <input type="text" placeholder="资料标题" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full" />
              </div>
              <div>
                <label className="mb-1 block text-[11.5px] text-[var(--text-2)] font-medium">学科</label>
                <Dropdown
                  value={formData.subject}
                  options={SUBJECTS.map((s) => ({ value: s, label: s }))}
                  onChange={(v) => setFormData({ ...formData, subject: v })}
                  width="100%"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11.5px] text-[var(--text-2)] font-medium">格式</label>
                <div className="flex items-center gap-1.5">
                  {[
                    { v: 'text', label: '📝 文字', cls: 'text-[var(--text-1)]' },
                    { v: 'python', label: '🐍 Python', cls: 'text-[var(--info)]' },
                    { v: 'matlab', label: '🧮 MATLAB', cls: 'text-[var(--warn)]' },
                  ].map((f) => (
                    <button
                      key={f.v}
                      type="button"
                      onClick={() => setFormData({ ...formData, format: f.v })}
                      className={`px-2.5 py-1.5 rounded-[6px] text-[11.5px] font-medium transition-colors ${f.cls}`}
                      style={{
                        background: formData.format === f.v ? 'var(--sel)' : 'var(--bg-2)',
                        border: `1px solid ${formData.format === f.v ? 'var(--line-hair)' : 'var(--line)'}`,
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[11.5px] text-[var(--text-2)] font-medium">内容</label>
                <textarea placeholder={formData.format === 'text' ? '学习笔记...' : `输入${formData.format === 'python' ? 'Python' : 'MATLAB'} 代码...`} value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} rows={8} className="w-full resize-none" style={formData.format !== 'text' ? { fontFamily: 'var(--font-mono)', background: 'var(--bg-2)', fontSize: '12.5px' } : undefined} spellCheck={false} />
              </div>
              <div>
                <label className="mb-1 block text-[11.5px] text-[var(--text-2)] font-medium">标签（逗号分隔）</label>
                <input type="text" placeholder="例如：笔记, 重点" value={formData.tags} onChange={(e) => setFormData({ ...formData, tags: e.target.value })} className="w-full" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button onClick={() => { setShowModal(false); setEditingMaterial(null); }} className="btn btn-default">取消</button>
              <button onClick={handleSaveMaterial} disabled={!formData.title.trim() || !formData.content.trim()} className="btn btn-primary">{editingMaterial ? '保存修改' : '添加资料'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 资料详情模态框（点击卡片打开，占屏幕大部分区域） */}
      {detailMaterial && (
        <div className="modal-overlay" onClick={() => setDetailMaterial(null)}>
          <div className="modal-card mx-4 w-full max-w-3xl p-0 overflow-hidden flex flex-col" style={{ maxHeight: '88vh', borderTop: '3px solid #059669' }} onClick={(e) => e.stopPropagation()}>
            {/* 头部 */}
            <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3 border-b border-[var(--line-soft)]">
              <div className="min-w-0">
                <h2 className="text-[17px] font-semibold tracking-tight break-words flex items-center gap-2">
                  <span className="h-4 w-[3px] rounded-full bg-[#059669] shrink-0" />
                  <span className="break-words">{detailMaterial.title}</span>
                </h2>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span className={`chip ${SUBJECT_COLORS[detailMaterial.subject] || SUBJECT_COLORS['其他']}`}>{detailMaterial.subject}</span>
                  {detailMaterial.format !== 'text' && (
                    <span className="chip px-1.5 py-px text-[10px] font-semibold"
                      style={{
                        color: detailMaterial.format === 'python' ? '#0ea5e9' : '#d97706',
                        background: detailMaterial.format === 'python' ? 'rgba(14,165,233,0.12)' : 'rgba(217,119,6,0.12)',
                        borderColor: detailMaterial.format === 'python' ? 'rgba(14,165,233,0.3)' : 'rgba(217,119,6,0.3)',
                      }}
                    >{detailMaterial.format === 'python' ? '🐍 Python' : '🧮 MATLAB'}</span>
                  )}
                  {(detailMaterial.tags || []).map((t) => <span key={t} className="text-[10.5px] text-[var(--text-3)]">#{t}</span>)}
                  <span className="text-[10.5px] text-[var(--text-4)]">{formatDate(detailMaterial.updatedAt || detailMaterial.createdAt)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={handleDetailCopy}
                  className="btn btn-primary text-xs py-1.5 px-3"
                  title="复制全部内容"
                >
                  {detailCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {detailCopied ? '已复制' : '复制内容'}
                </button>
                <button onClick={() => setDetailMaterial(null)} className="p-2 rounded-[8px] text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--hover)] transition-colors" title="关闭">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            {/* 内容区 */}
            <div className="px-5 py-4 overflow-y-auto" style={{ fontFamily: 'var(--font-sans)' }}>
              {detailMaterial.format !== 'text' ? (
                <pre
                  className="rounded-[10px] p-4 text-[12.5px] leading-relaxed whitespace-pre-wrap break-all select-text"
                  style={{ fontFamily: 'var(--font-mono)', background: 'var(--bg-2)', border: '1px solid var(--line-soft)', color: 'var(--text-1)' }}
                >{detailMaterial.content}</pre>
              ) : (
                <p className="text-[13.5px] text-[var(--text-2)] leading-relaxed whitespace-pre-wrap break-words select-text">{detailMaterial.content}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 节点编辑模态框 */}
      {showNodeModal && (
        <div className="modal-overlay" onClick={() => setShowNodeModal(false)}>
          <div className="modal-card mx-4 w-full max-w-md p-5" style={{ borderTop: '3px solid #059669' }} onClick={(e) => e.stopPropagation()}>
            <h2 className="text-[15px] font-semibold mb-3 flex items-center gap-2">
              <span className="h-3.5 w-[3px] rounded-full bg-[#059669]" />
              {nodeModalMode === 'add' ? '添加子节点' : '编辑节点名称'}
            </h2>
            <input type="text" placeholder="节点内容" value={nodeModalText} onChange={(e) => setNodeModalText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleNodeConfirm()} className="w-full" autoFocus />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button onClick={() => setShowNodeModal(false)} className="btn btn-default">取消</button>
              <button onClick={handleNodeConfirm} disabled={!nodeModalText.trim()} className="btn btn-primary">{nodeModalMode === 'add' ? '添加' : '保存'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 节点内容模态框（添加内容：支持文字 / Python / MATLAB 代码） */}
      {noteModalOpen && (
        <div className="modal-overlay" onClick={() => setNoteModalOpen(false)}>
          <div className="modal-card mx-4 w-full max-w-2xl p-5" style={{ borderTop: '3px solid #059669' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-[15px] font-semibold flex items-center gap-2">
                <span className="h-3.5 w-[3px] rounded-full bg-[#059669]" />
                📄 节点内容
              </h2>
              <button onClick={() => setNoteModalOpen(false)} className="p-1.5 rounded-lg text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--hover)]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[11.5px] text-[var(--text-3)] mb-3">记录该节点的详细内容，支持文字与代码（Python / MATLAB）</p>

            {/* 格式选择（文字 / Python / MATLAB） */}
            <div className="mb-3 flex items-center gap-1.5">
              {[
                { v: 'text', label: '📝 文字', cls: 'text-[var(--text-1)]' },
                { v: 'python', label: '🐍 Python', cls: 'text-[var(--info)]' },
                { v: 'matlab', label: '🧮 MATLAB', cls: 'text-[var(--warn)]' },
              ].map((f) => (
                <button
                  key={f.v}
                  onClick={() => setNoteType(f.v)}
                  className={`px-3 py-1.5 rounded-[7px] text-[12px] font-medium transition-colors ${f.cls}`}
                  style={{
                    background: noteType === f.v ? 'var(--sel)' : 'var(--bg-2)',
                    border: `1px solid ${noteType === f.v ? 'var(--line-hair)' : 'var(--line)'}`,
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* 内容编辑区（代码模式用等宽字体 + 深色底） */}
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder={noteType === 'text' ? '写下这个节点的详细内容...' : `输入${noteType === 'python' ? 'Python' : 'MATLAB'} 代码...`}
              rows={12}
              className="w-full resize-none text-[13px] leading-relaxed"
              style={noteType !== 'text' ? { fontFamily: 'var(--font-mono)', background: 'var(--bg-2)', fontSize: '12.5px' } : undefined}
              autoFocus
              spellCheck={false}
            />

            <div className="mt-4 flex items-center justify-between">
              <span className="text-[11px] text-[var(--text-4)]">
                {noteType === 'text' ? '按 Ctrl+Enter 保存' : `${noteType === 'python' ? 'Python' : 'MATLAB'} 代码 · 按 Ctrl+Enter 保存`}
              </span>
              <div className="flex gap-2">
                <button onClick={() => setNoteModalOpen(false)} className="btn btn-default">取消</button>
                <button onClick={saveNodeNote} className="btn btn-primary">保存内容</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 导出模态框 */}
      {showExportModal && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="modal-card mx-4 w-full max-w-lg p-5" style={{ borderTop: '3px solid #059669' }} onClick={(e) => e.stopPropagation()}>
            <h2 className="text-[15px] font-semibold mb-3 flex items-center gap-2">
              <span className="h-3.5 w-[3px] rounded-full bg-[#059669]" />
              导出思维导图
            </h2>
            <pre className="w-full p-4 rounded-[8px] bg-[var(--bg-2)] border border-[var(--line)] text-[var(--text-2)] text-[12px] mono whitespace-pre-wrap max-h-80 overflow-auto mb-4" style={{ fontFamily: 'var(--font-mono)' }}>{exportText}</pre>
            <div className="flex items-center justify-end gap-2">
              <button onClick={handleDownloadExport} className="btn btn-default" title="下载为 Markdown 文件">
                <Download className="h-3.5 w-3.5" /> 下载 .md
              </button>
              <button onClick={handleCopyExport} className="btn btn-default">
                {copied ? <Check className="h-3.5 w-3.5 text-[var(--success)]" /> : <Share2 className="h-3.5 w-3.5" />}
                {copied ? '已复制' : '复制'}
              </button>
              <button onClick={() => setShowExportModal(false)} className="btn btn-primary">关闭</button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认弹窗（与全站一致） */}
      <ConfirmDialog
        open={!!confirmDelete}
        title={confirmDelete?.type === 'material' ? '删除资料' : confirmDelete?.type === 'mindmap' ? '删除思维导图' : '删除节点'}
        message={
          confirmDelete?.type === 'material'
            ? '删除后该资料将无法恢复，关联的思维导图也会一并删除。请确认是否继续？'
            : confirmDelete?.type === 'mindmap'
              ? '删除后整张思维导图将无法恢复。请确认是否继续？'
              : '删除后该节点及其所有子节点将无法恢复。请确认是否继续？'
        }
        confirmText="删除"
        cancelText="取消"
        onConfirm={doConfirmDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
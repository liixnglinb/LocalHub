import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, X, Copy, Check, ChevronDown, ChevronRight, Download, Globe,
  Terminal, ExternalLink, Star, Trophy, Github, Radio, Bot, Cpu, Wrench,
  Newspaper, Sparkles, Clock, Zap, BookOpen,
} from 'lucide-react';

/* =====================================================================
   AI 每日情报站 · 5 大类资讯聚合
   以下 NEWS / SKILL_RANK 等均为「占位示例数据」——
   ★ 真实资讯请在对应数组内按字段替换，并更新注释里的说明 ★
   结构、交互、筛选、折叠、复制均已完成，只需填充数据即可使用。
   ===================================================================== */

const ACCENT = '#3B5BFF';

const TAXONOMY = {
  agent: { label: 'AI Agent', color: '#7C5CFF', bg: '#F1EEFF' },
  model: { label: '新发布模型', color: '#1971C2', bg: '#E7F5FF' },
  tool:  { label: 'AI 软件工具', color: '#0CA678', bg: '#E6FCF5' },
  industry: { label: 'AI 行业大事', color: '#E8590C', bg: '#FFF1E6' },
  skill: { label: '优质 Skill', color: '#F59E0B', bg: '#FFF8E6' },
};

/* --------------- 占位示例数据（请替换为真实资讯） --------------- */
/*
  字段说明：
  - id       唯一标识
  - cat      'agent'|'model'|'tool'|'industry'|'skill'
  - title    标题
  - summary  简短摘要
  - source   来源（媒体/平台）
  - url      原文跳转链接
  - time     发布时间文本
  - bucket   'today'|'yesterday'  用于「今日/昨日」时间筛选
  - importance 1-3 （3 最重要，用于重要程度标记）
  - agent 型：type=download/web/local + deploy/steps/deps
  - model 型：version/highlight/weightUrl/reportUrl
  - tool 型：publishTime/downloadUrl
  - skill 型：repo/stars/scene/install
*/
const NEWS = [
  // ---- AI Agent（演示占位）----
  { id: 1, cat: 'agent', type: 'local', bucket: 'today', time: '09:20', importance: 3,
    title: 'Claude Code', summary: 'Anthropic 官方终端 AI 编程 Agent，能力全面（占位示例）',
    source: 'Anthropic', url: 'https://example.com/claude-code',
    deploy: 'npm install -g @anthropic-ai/claude-code',
    steps: ['安装 Node.js 18+', '执行上方 npm 命令', '配置 ANTHROPIC_API_KEY', '运行 claude'],
    deps: ['Node.js ≥ 18', '可访问 Anthropic 的网络'] },
  { id: 2, cat: 'agent', type: 'download', bucket: 'yesterday', time: '16:00', importance: 2,
    title: 'Ollama', summary: '本地一键运行开源大模型（占位示例）',
    source: 'Ollama', url: 'https://example.com/ollama-download', downloadUrl: 'https://example.com/ollama-download',
    deploy: 'curl -fsSL https://ollama.com/install.sh | sh\nollama run qwen2.5',
    steps: ['官网下载或脚本安装', 'ollama run qwen2.5'],
    deps: ['macOS / Linux / Windows'] },
  { id: 3, cat: 'agent', type: 'web', bucket: 'today', time: '08:10', importance: 1,
    title: 'Trae', summary: '字节跳动 AI 编程 IDE，国内可直访（占位示例）',
    source: '字节跳动', url: 'https://example.com/trae',
    deploy: '访问网页版或下载桌面客户端',
    steps: ['网页版直接使用'], deps: ['国内网络'] },

  // ---- 新发布模型（演示占位）----
  { id: 4, cat: 'model', bucket: 'today', time: '11:30', importance: 3,
    title: 'Qwen3-235B-A22B', summary: '阿里开源旗舰级 MoE 模型（占位示例）',
    version: 'Qwen3-235B-A22B', highlight: '推理能力对标全球一线，中文表现突出',
    source: '阿里通义', url: 'https://example.com/qwen3',
    weightUrl: 'https://example.com/qwen3-weights', reportUrl: 'https://example.com/qwen3-report' },
  { id: 5, cat: 'model', bucket: 'yesterday', time: '14:00', importance: 2,
    title: 'DeepSeek-V3', summary: '国产开源大模型，长文本与推理出色（占位示例）',
    version: 'DeepSeek-V3', highlight: '性价比高、支持 DeepSeek Coder',
    source: '深度求索', url: 'https://example.com/deepseek',
    weightUrl: 'https://example.com/deepseek-weights', reportUrl: 'https://example.com/deepseek-report' },

  // ---- AI 软件工具（演示占位）----
  { id: 6, cat: 'tool', bucket: 'today', time: '10:05', importance: 2,
    title: 'fastmcp', summary: 'TypeScript 快速构建 MCP 服务（占位示例）', publishTime: '占位-发布', 
    source: 'punkpeye', url: 'https://example.com/fastmcp', downloadUrl: 'https://example.com/fastmcp' },
  { id: 7, cat: 'tool', bucket: 'yesterday', time: '17:20', importance: 1,
    title: 'Dsyfusion 消息工具', summary: 'AI 智能消息处理小工具（占位示例）', publishTime: '占位-发布',
    source: '第三方', url: 'https://example.com/tool', downloadUrl: 'https://example.com/tool' },

  // ---- AI 行业大事（演示占位）----
  { id: 8, cat: 'industry', bucket: 'today', time: '07:50', importance: 3,
    title: '某大厂发布新一代 AI 战略', summary: '宣布大模型与 Agent 全栈投入（占位示例）',
    source: '综合科技媒体', url: 'https://example.com/news1' },
  { id: 9, cat: 'industry', bucket: 'yesterday', time: '20:00', importance: 2,
    title: '政策：推进 AI 应用落地', summary: '行业主管部门发布发展指导意见（占位示例）',
    source: '官方发布', url: 'https://example.com/news2' },

  // ---- 优质 Skill（演示占位）----
  { id: 10, cat: 'skill', bucket: 'today', time: '09:00', importance: 2,
    title: 'awesome-chatgpt-prompts', summary: '海量即用提示词模板（占位示例）', repo: 'f/awesome-chatgpt-prompts', stars: 120000, scene: '日常提示词快速参考',
    source: 'GitHub', url: 'https://github.com/f/awesome-chatgpt-prompts',
    install: 'git clone https://github.com/f/awesome-chatgpt-prompts.git /skills/prompts' },
  { id: 11, cat: 'skill', bucket: 'yesterday', time: '18:30', importance: 2,
    title: 'fastmcp', summary: 'TypeScript 构建 MCP 的轻量框架（占位示例）', repo: 'punkpeye/fastmcp', stars: 11000, scene: '快速开发自定义 MCP',
    source: 'GitHub', url: 'https://github.com/punkpeye/fastmcp',
    install: 'npm install -g fastmcp' },
];

/* Skill 排行榜（Star 降序，占位示例） */
const SKILL_RANK = [
  { repo: 'f/awesome-chatgpt-prompts', stars: 120000, desc: '海量提示词模板（占位）' },
  { repo: 'anthropics/skills',         stars: 44000,  desc: 'Anthropic 官方 Skills（占位）' },
  { repo: 'punkpeye/fastmcp',          stars: 11000,  desc: 'TypeScript MCP 框架（占位）' },
].sort((a, b) => b.stars - a.stars);

function formatStars(n) { return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n); }

/* 占位加载骨架 */
function Skeleton() {
  return (
    <div className="nw-card" aria-hidden="true">
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div className="nw-sk" style={{ width: 46, height: 46, borderRadius: 10 }} />
        <div style={{ flex: 1 }}>
          <div className="nw-sk" style={{ width: '45%', height: 12 }} />
          <div className="nw-sk" style={{ width: '30%', height: 10, marginTop: 8 }} />
        </div>
      </div>
      <div className="nw-sk" style={{ width: '100%', height: 12, marginTop: 14 }} />
      <div className="nw-sk" style={{ width: '85%', height: 12, marginTop: 6 }} />
    </div>
  );
}

export default function AINews() {
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('all');          // 分类筛选
  const [time, setTime] = useState('all');         // 全部/今日/昨日
  const [openFold, setOpenFold] = useState({});    // 折叠面板
  const [copied, setCopied] = useState('');

  // 模拟加载中状态
  useEffect(() => { const t = setTimeout(() => setLoading(false), 650); return () => clearTimeout(t); }, []);

  const copy = async (id, text) => {
    try { await navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(''), 1600); } catch { /* ignore */ }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return NEWS.filter((n) => {
      const okCat = cat === 'all' || n.cat === cat;
      const okTime = time === 'all' || n.bucket === time;
      const okQ = !q ||
        (n.title || '').toLowerCase().includes(q) ||
        (n.summary || '').toLowerCase().includes(q) ||
        (n.repo || '').toLowerCase().includes(q);
      return okCat && okTime && okQ;
    });
  }, [query, cat, time]);

  const cats = [['all', '全部'], ['agent', 'AI Agent'], ['model', '新模型'], ['tool', 'AI软件'], ['industry', '行业大事'], ['skill', '优质Skill']];
  const times = [['all', '全部时间'], ['today', '今日资讯'], ['yesterday', '昨日资讯']];

  // 卡片渲染：按分类字段
  const renderCard = (n) => {
    const tx = TAXONOMY[n.cat];
    const Tag = n.cat === 'agent' ? Bot : n.cat === 'model' ? Cpu : n.cat === 'tool' ? Wrench : n.cat === 'industry' ? Newspaper : Sparkles;

    // Agent 折叠（国内本地部署）
    if (n.cat === 'agent') {
      const isLocal = n.type === 'local';
      const open = openFold[n.id];
      const badge = n.type === 'download' ? ['可下载软件', '#0CA678', '#E6FCF5'] : n.type === 'web' ? ['网页版', '#1971C2', '#E7F5FF'] : ['国内本地部署', '#E8590C', '#FFF1E6'];
      return (
        <div className="nw-card">
          <div className="nw-top">
            <div className="nw-ico" style={{ background: `${tx.color}1A`, color: tx.color }}><Tag size={18} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="nw-title">{n.title} <span className="nw-badge txt" style={{ color: badge[1], background: badge[2] }}>{badge[0]}</span></div>
              <div className="nw-sum">{n.summary}</div>
            </div>
            <Importance n={n} />
          </div>
          <div className="nw-actions">
            {n.type === 'download' && <a className="nw-btn solid" href={n.downloadUrl} target="_blank" rel="noopener noreferrer"><Download size={14} />下载</a>}
            {n.type === 'web' && <a className="nw-btn solid" href={n.url} target="_blank" rel="noopener noreferrer"><Globe size={14} />访问</a>}
            {isLocal && (
              <button className="nw-btn" onClick={() => setOpenFold((p) => ({ ...p, [n.id]: !open }))}>
                {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}{open ? '收起部署' : '本地部署'}
              </button>
            )}
            <button className="nw-btn" onClick={() => copy('a' + n.id, n.deploy)}>
              {copied === 'a' + n.id ? <Check size={14} style={{ color: '#0CA678' }} /> : <Copy size={14} />}
              {copied === 'a' + n.id ? '已复制' : '复制脚本'}
            </button>
          </div>
          {isLocal && open && (
            <div className="nw-fold">
              <div className="nw-fold-h"><Terminal size={13} />一键配置脚本</div>
              <pre className="nw-pre"><code>{n.deploy}</code></pre>
              <div className="nw-steps"><b>VSCode 部署步骤</b><ol>{n.steps.map((s, i) => <li key={i}>{s}</li>)}</ol></div>
              <div className="nw-steps"><b>环境依赖</b><ul>{n.deps.map((d, i) => <li key={i}>{d}</li>)}</ul></div>
            </div>
          )}
          <Meta n={n} />
        </div>
      );
    }

    // 新发布模型
    if (n.cat === 'model') {
      return (
        <div className="nw-card">
          <div className="nw-top">
            <div className="nw-ico"><Tag size={18} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="nw-title">{n.title} <span className="nw-badge txt">{n.version}</span></div>
              <div className="nw-sum">{n.summary}<br /><b style={{ color: tx.color }}>亮点：</b>{n.highlight}</div>
            </div>
            <Importance n={n} />
          </div>
          <div className="nw-actions">
            <a className="nw-btn" href={n.weightUrl} target="_blank" rel="noopener noreferrer"><Download size={14} />权重下载</a>
            <a className="nw-btn" href={n.reportUrl} target="_blank" rel="noopener noreferrer"><BookOpen size={14} />技术报告</a>
          </div>
          <Meta n={n} />
        </div>
      );
    }

    // AI 软件工具
    if (n.cat === 'tool') {
      return (
        <div className="nw-card">
          <div className="nw-top">
            <div className="nw-ico"><Tag size={18} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="nw-title">{n.title}</div>
              <div className="nw-sum">{n.summary}</div>
            </div>
            <Importance n={n} />
          </div>
          <div className="nw-meta-row"><span>发布时间：{n.publishTime}</span></div>
          <div className="nw-actions">
            <a className="nw-btn solid" href={n.downloadUrl} target="_blank" rel="noopener noreferrer"><Download size={14} />下载 / 访问</a>
            {n.url && <a className="nw-btn" href={n.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} />原文</a>}
          </div>
          <Meta n={n} />
        </div>
      );
    }

    // 行业大事（时间线样式）
    if (n.cat === 'industry') {
      return (
        <div className="nw-card nw-tl">
          <div className="nw-tl-dot" style={{ background: tx.color }} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="nw-top">
              <div className="nw-title">{n.title}</div>
              <Importance n={n} />
            </div>
            <div className="nw-sum">{n.summary}</div>
            <div className="nw-actions" style={{ marginTop: 8 }}>
              <a className="nw-btn" href={n.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} />阅读原文</a>
            </div>
            <Meta n={n} />
          </div>
        </div>
      );
    }

    // 优质 Skill
    return (
      <div className="nw-card">
        <div className="nw-top">
          <div className="nw-ico"><Tag size={18} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="nw-title">{n.title} <span className="nw-badge txt"><Star size={12} />{formatStars(n.stars)}</span></div>
            <div className="nw-sum">{n.summary}</div>
            <div className="nw-meta-row" style={{ color: '#6c757d' }}>· 适用：{n.scene}</div>
          </div>
          <Importance n={n} />
        </div>
        <div className="nw-actions">
          <a className="nw-btn" href={n.url} target="_blank" rel="noopener noreferrer"><Github size={14} />查看 GitHub</a>
          <button className="nw-btn" onClick={() => copy('s' + n.id, n.install)}>
            {copied === 's' + n.id ? <Check size={14} style={{ color: '#0CA678' }} /> : <Copy size={14} />}
            {copied === 's' + n.id ? '已复制' : '复制安装脚本'}
          </button>
        </div>
        <Meta n={n} />
      </div>
    );
  };

  const Importance = ({ n }) => (
    <span className={`nw-imp lv${n.importance || 1}`}>重点{n.importance || 1}</span>
  );

  const Meta = ({ n }) => (
    <div className="nw-meta">
      <span><Clock size={12} />{n.time}</span>
      <span className="nw-source"><Zap size={12} />{n.source || '占位-来源'}</span>
      <span style={{ marginLeft: 'auto' }}><a className="nw-link" href={n.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={12} />原文</a></span>
    </div>
  );

  return (
    <div className="nw-page">
      <style>{`
        .nw-page { display:flex;flex-direction:column;gap:16px; }
        .nw-bar { background:#fff;border:1px solid rgba(20,24,33,.09);border-radius:14px;padding:16px 18px;box-shadow:0 1px 2px rgba(16,20,30,.04); }
        .nw-bar-top { display:flex;align-items:center;gap:12px;flex-wrap:wrap; }
        .nw-logo { width:40px;height:40px;border-radius:10px;background:${ACCENT}1A;color:${ACCENT};display:flex;align-items:center;justify-content:center; }
        .nw-bar-title { font-size:18px;font-weight:800;color:#212529; }
        .nw-bar-sub { font-size:12px;color:#6c757d; }
        .nw-sp { flex:1; }
        .nw-search { display:flex;align-items:center;gap:8px;border:1px solid rgba(20,24,33,.13);border-radius:10px;padding:8px 12px;min-width:220px;background:#fff; }
        .nw-search input { border:0;outline:0;font-size:13px;flex:1;min-width:0;background:transparent; }
        .nw-rows { display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;align-items:center; }
        .nw-chip { border:1px solid rgba(20,24,33,.12);background:#fff;color:#495057;border-radius:999px;font-size:12.5px;font-weight:600;padding:6px 14px;cursor:pointer;transition:all .15s ease; }
        .nw-chip:hover { border-color:${ACCENT}88;color:${ACCENT}; }
        .nw-chip.on { background:${ACCENT};border-color:${ACCENT};color:#fff; }
        .nw-divider { width:1px;height:20px;background:rgba(20,24,33,.12); }
        .nw-count { font-size:12px;color:#adb5bd; }
        .nw-list { display:flex;flex-direction:column;gap:12px; }
        .nw-card { background:#fff;border:1px solid rgba(20,24,33,.09);border-radius:12px;padding:14px 16px;box-shadow:0 1px 2px rgba(16,20,30,.04);transition:border-color .2s ease,box-shadow .2s ease; }
        .nw-card:hover { border-color:${ACCENT}66;box-shadow:0 6px 16px -10px rgba(59,91,255,.25); }
        .nw-top { display:flex;gap:12px;align-items:flex-start; }
        .nw-ico { width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0; }
        .nw-title { font-size:14.5px;font-weight:700;color:#212529;display:flex;align-items:center;gap:8px;flex-wrap:wrap; }
        .nw-sum { font-size:12.5px;color:#6c757d;line-height:1.6;margin-top:4px; }
        .nw-badge.txt { display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;border-radius:999px;padding:2px 9px; }
        .nw-actions { display:flex;gap:8px;margin-top:10px;flex-wrap:wrap; }
        .nw-btn { display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(20,24,33,.12);background:#fff;color:#495057;border-radius:9px;font-size:12.5px;font-weight:600;padding:7px 12px;cursor:pointer;text-decoration:none;transition:all .15s ease; }
        .nw-btn:hover { border-color:${ACCENT}88;color:${ACCENT}; }
        .nw-btn.solid { background:${ACCENT};border-color:${ACCENT};color:#fff; }
        .nw-btn.solid:hover { opacity:.92;color:#fff; }
        .nw-fold { border:1px solid rgba(20,24,33,.09);border-radius:10px;background:#FBFAFF;margin-top:10px; }
        .nw-fold-h { display:flex;align-items:center;gap:8px;padding:9px 12px;font-size:12.5px;font-weight:700;color:${ACCENT}; }
        .nw-pre { margin:0;padding:12px;background:#1e1e2e;color:#e6e6f0;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre-wrap; }
        .nw-steps { padding:8px 14px 12px;font-size:12.5px;color:#495057; }
        .nw-steps ol,.nw-steps ul { margin:4px 0 0;padding-left:18px;line-height:1.9; }
        .nw-meta { display:flex;align-items:center;gap:14px;margin-top:12px;font-size:11.5px;color:#adb5bd;border-top:1px dashed rgba(20,24,33,.1);padding-top:10px; }
        .nw-source { display:inline-flex;align-items:center;gap:4px; }
        .nw-link { display:inline-flex;align-items:center;gap:4px;color:${ACCENT};text-decoration:none;font-weight:600; }
        .nw-imp { font-size:10.5px;font-weight:700;border-radius:999px;padding:2px 8px;flex-shrink:0; }
        .nw-imp.lv3 { color:#fff;background:#E5484D; }
        .nw-imp.lv2 { color:#B45309;background:#FFF1E6; }
        .nw-imp.lv1 { color:#6c757d;background:#F1F3F5; }
        .nw-meta-row { font-size:12px;color:#adb5bd;margin-top:4px; }
        .nw-tl { position:relative;padding-left:22px; }
        .nw-tl-dot { position:absolute;left:8px;top:20px;width:8px;height:8px;border-radius:999px; }
        .nw-sk { background:linear-gradient(90deg,#f1f3f5 25%,#f8f9fa 50%,#f1f3f5 75%);background-size:200% 100%;animation:sh 1.2s infinite;border-radius:6px; }
        @keyframes sh { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .nw-empty { text-align:center;padding:48px 0;color:#adb5bd;font-size:14px;background:#fff;border:1px dashed rgba(20,24,33,.15);border-radius:12px; }
        /* 排行榜 */
        .nw-rank { display:flex;flex-direction:column;gap:8px; }
        .nw-rank-row { display:flex;align-items:center;gap:12px;border:1px solid rgba(20,24,33,.08);border-radius:10px;padding:11px 13px;background:#fff; }
        .nw-rank-no { width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff;flex-shrink:0; }
      `}</style>

      {/* 顶部导航区 */}
      <div className="nw-bar">
        <div className="nw-bar-top">
          <div className="nw-logo"><Radio size={20} /></div>
          <div>
            <div className="nw-bar-title">AI 每日情报站</div>
            <div className="nw-bar-sub">Agent · 模型 · 工具 · 行业 · Skill 一站式速览</div>
          </div>
          <div className="nw-sp" />
          <div className="nw-search">
            <Search size={14} color="#adb5bd" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="全局检索资讯..." />
            {query && <button onClick={() => setQuery('')} style={{ border: 0, background: 'transparent', cursor: 'pointer' }}><X size={13} /></button>}
          </div>
        </div>

        <div className="nw-rows">
          {cats.map(([k, l]) => (
            <button key={k} className={`nw-chip${cat === k ? ' on' : ''}`} onClick={() => setCat(k)}>{l}</button>
          ))}
          <span className="nw-divider" />
          {times.map(([k, l]) => (
            <button key={k} className={`nw-chip${time === k ? ' on' : ''}`} onClick={() => setTime(k)}>{l}</button>
          ))}
          <span className="nw-sp" />
          <span className="nw-count">{filtered.length} 条</span>
        </div>
      </div>

      {/* 资讯主列表 */}
      <div className="nw-list">
        {loading ? (
          [1, 2, 3, 4].map((i) => <Skeleton key={i} />)
        ) : filtered.length === 0 ? (
          <div className="nw-empty">暂无匹配资讯（可在 NEWS 数组中填充占位数据）</div>
        ) : filtered.map((n) => <div key={n.id}>{renderCard(n)}</div>)}
      </div>

      {/* Skill 排行榜子模块 */}
      <div className="nw-bar">
        <div className="nw-bar-top" style={{ marginBottom: 12 }}>
          <div className="nw-logo"><Trophy size={18} /></div>
          <div className="nw-bar-title" style={{ fontSize: 15 }}>GitHub Skill 排行榜</div>
          <span className="nw-count">按 Star 降序（占位示例）</span>
        </div>
        <div className="nw-rank">
          {SKILL_RANK.map((s, idx) => (
            <div key={s.repo} className="nw-rank-row">
              <span className="nw-rank-no" style={{ background: ['#F59E0B', '#94A3B8', '#CD7F32'][idx] || ACCENT }}>{idx + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#212529' }}><Star size={13} color="#F59E0B" style={{ verticalAlign: -2 }} /> {formatStars(s.stars)} · {s.repo}</div>
                <div style={{ fontSize: 12, color: '#6c757d' }}>{s.desc}</div>
              </div>
              <a className="nw-btn" href={`https://github.com/${s.repo}`} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0 }}><Github size={14} />GitHub</a>
            </div>
          ))}
        </div>
      </div>

      <p style={{ fontSize: 12, color: '#adb5bd', margin: 0 }}>
        说明：当前资讯为演示占位，请在 AINews.jsx 的 NEWS / SKILL_RANK 数组中按要求字段替换为真实内容即可。
      </p>
    </div>
  );
}
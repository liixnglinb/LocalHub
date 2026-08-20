import React, { useState } from 'react';
import {
  Bot, Copy, Check, Download, Globe, Terminal, ChevronDown, ChevronRight,
  Github, Star, Trophy, Search, X, Sparkles,
} from 'lucide-react';

/* ============================================================
   AI Agent & Skill 资源聚合页
   - 模块1：主流 AI Agent 列表（软件下载 / 网页版 / 国内需本地部署）
   - 模块2：Skill 资源卡片 + GitHub Star 排行榜
   ============================================================ */

const ACCENT = '#7C5CFF';

/* ---------- 模块1：Agent 数据 ---------- */
/* type: download=可下载软件 / web=网页版 / local=国内需本地部署 */
const AGENTS = [
  {
    name: 'Cursor', type: 'download',
    desc: 'AI 原生代码编辑器，多文件智能补全与对话式编程',
    url: 'https://www.cursor.com/download', downloadUrl: 'https://www.cursor.com/download',
    deploy: '下载并安装 Cursor 桌面版，登录账号即可使用，支持 Windows/macOS/Linux。',
    steps: ['前往官网下载对应系统安装包', '安装后登录账号', '直接开始 AI 编程'],
    deps: ['官网下载可能需可访问海外网络'],
  },
  {
    name: 'Trae', type: 'web',
    desc: '字节跳动 AI 编程 IDE，界面简洁，国内可直访',
    url: 'https://www.trae.com.cn',
    deploy: '访问网页版直接使用，也可下载桌面客户端，国内网络即可。',
    steps: ['打开网页版 Trac CE 在线编写', '或下载桌面客户端'],
    deps: ['国内网络可用'],
  },
  {
    name: 'Claude Code', type: 'local',
    desc: 'Anthropic 官方终端 AI 编程 Agent，能力全面',
    url: '',
    deploy: 'npm install -g @anthropic-ai/claude-code',
    steps: ['安装 Node.js 18+（建议 WSL/Linux/Mac 终端）', '执行上方 npm 命令全局安装', '配置密钥：export ANTHROPIC_API_KEY=你的Key', '在项目目录运行 claude 启动', 'VSCode 中可在集成终端直接使用 claude'],
    deps: ['Node.js ≥ 18', '需要能访问 Anthropic 的网络环境'],
  },
  {
    name: 'OpenAI Codex CLI', type: 'local',
    desc: 'OpenAI 官方命令行 Agent，可接管终端任务',
    url: '',
    deploy: 'npm install -g @openai/codex',
    steps: ['安装 Node.js 18+', '执行上方 npm 命令全局安装', '登录 OpenAI 账号并授权', '在终端运行 codex 开始对话'],
    deps: ['Node.js ≥ 18', 'OpenAI 账号 / API Key'],
  },
  {
    name: 'Cline', type: 'local',
    desc: '开源 VSCode AI 编程插件，支持多种模型',
    url: '',
    deploy: "code --install-extension saoudrizwan.claude-dev",
    steps: ['VSCode 安装 Node.js 运行环境', '执行上方 extension 安装命令', '在 VSCode 扩展里打开 Cline', '配置你的 LLM API Key 后使用'],
    deps: ['VSCode ≥ 1.79', '任一 LLM API Key'],
  },
  {
    name: 'Roo Code', type: 'local',
    desc: 'Cline 分支，多角色 AI 结对编程插件',
    url: '',
    deploy: "code --install-extension rooveterinaryinc.roo-cline",
    steps: ['VSCode 安装 Node.js 运行环境', '执行上方 extension 安装命令', '配置模型与 API Key', '开启多角色编程'],
    deps: ['VSCode ≥ 1.79', '任一 LLM API Key'],
  },
  {
    name: 'Ollama', type: 'download',
    desc: '本地一键运行开源大模型（Llama / Qwen 等）',
    url: 'https://ollama.com/download', downloadUrl: 'https://ollama.com/download',
    deploy: "curl -fsSL https://ollama.com/install.sh | sh\nollama run qwen2.5",
    steps: ['官网下载安装包或使用 install 脚本', '执行 ollama run qwen2.5 拉取并启动', '可选 ollama serve 启动本地 API'],
    deps: ['macOS / Linux / Windows', '建议 8GB+ 内存'],
  },
  {
    name: 'Dify', type: 'web',
    desc: '开源 LLM 应用开发平台，可视化编排 Agent 工作流',
    url: 'https://dify.ai/zh',
    deploy: "git clone https://github.com/langgenius/dify.git && cd dify && docker compose up -d",
    steps: ['访问网页版试用', '或 git clone 官方仓库自托管', '安装 Docker 后 docker compose up -d'],
    deps: ['网页版占国内可访问', '自托管需 Docker'],
  },
  {
    name: 'n8n', type: 'download',
    desc: '可视化的 AI 工作流自动化平台',
    url: 'https://n8n.io', downloadUrl: 'https://n8n.io/download',
    deploy: 'npm install -g n8n\nn8n start',
    steps: ['安装 Node.js', '执行上方命令全局安装', '运行 n8n start 启动编辑器'],
    deps: ['Node.js ≥ 18'],
  },
  {
    name: 'Open Interpreter', type: 'local',
    desc: '自然语言驱动本地代码执行的通用工具',
    url: '',
    deploy: 'pip install open-interpreter',
    steps: ['安装 Python 3.10+', '执行上方 pip 命令', '运行 interpreter 开始对话'],
    deps: ['Python ≥ 3.10', '任一 LLM API Key'],
  },
  {
    name: 'Aider', type: 'local',
    desc: '终端里的 AI 结对编程助手，可直接读写你的代码',
    url: '',
    deploy: 'pip install aider-chat',
    steps: ['安装 Python 3.10+', '执行上方 pip 命令', '配置 LLM API Key', 'cd 到项目后运行 aider'],
    deps: ['Python ≥ 3.10', '任一 LLM API Key'],
  },
  {
    name: 'llama.cpp', type: 'local',
    desc: '高性能本地推理引擎，运行 GGUF 开源模型',
    url: '',
    deploy: 'git clone https://github.com/ggerganov/llama.cpp && cd llama.cpp && cmake -B build && cmake --build build --config Release',
    steps: ['克隆仓库', '安装 cmake 与 C++ 编译器', '执行上方构建命令', '用 build/bin 下的工具加载模型'],
    deps: ['cmake / C++ 编译器', 'GGUF 格式模型文件'],
  },
];

/* ---------- 模块2：Skill 数据 ---------- */
/* star 为发布时估值，以 GitHub 实时为准 */
const SKILLS = [
  { area: '通用提示词', name: 'awesome-chatgpt-prompts', repo: 'f/awesome-chatgpt-prompts', stars: 120000, desc: '海量即用提示词模板，覆盖写作、编程、角色扮演等', scene: '日常提示词的快速参考与套用', install: 'git clone https://github.com/f/awesome-chatgpt-prompts.git /skills/prompts' },
  { area: '提示工程', name: 'Prompt-Engineering-Guide', repo: 'dair-ai/Prompt-Engineering-Guide', stars: 52000, desc: 'Prompt 工程系统教程与最佳实践', scene: '系统学习如何设计高质量 Prompt', install: 'git clone https://github.com/dair-ai/Prompt-Engineering-Guide.git /skills/prompt-guide' },
  { area: 'Agent 技能', name: 'anthropics/skills', repo: 'anthropics/skills', stars: 44000, desc: 'Anthropic 官方 Skills 集合与编写规范', scene: 'Claude/Claude Code 技能导入与自定义', install: 'git clone https://github.com/anthropics/skills.git /skills/anthropic' },
  { area: 'MCP 服务', name: 'modelcontextprotocol/servers', repo: 'modelcontextprotocol/servers', stars: 58000, desc: '官方 MCP 服务器参考实现（GitHub、文件、数据库等）', scene: '为 Agent 接入文件/代码/数据库等外部工具', install: 'git clone https://github.com/modelcontextprotocol/servers.git /skills/mcp' },
  { area: 'MCP 框架', name: 'fastmcp', repo: 'punkpeye/fastmcp', stars: 11000, desc: 'TypeScript 快速构建 MCP Server 的轻量框架', scene: '快速开发自定义 MCP 工具', install: 'npm install -g fastmcp' },
  { area: 'Agent 增强', name: 'superpowers', repo: 'obra/superpowers', stars: 17000, desc: '为 Claude Code 注入系统化技能与工作流', scene: '提升 Claude Code 在复杂项目中的表现', install: 'git clone https://github.com/obra/superpowers.git /skills/superpowers' },
  { area: 'Agent 开发', name: 'langchain', repo: 'langchain-ai/langchain', stars: 105000, desc: '最流行的 LLM 应用开发框架', scene: '构建企业级 Agent 与 RAG 应用', install: 'pip install langchain' },
  { area: 'RAG 检索', name: 'LlamaIndex', repo: 'run-llama/llama_index', stars: 48000, desc: '面向知识库与 RAG 的数据框架', scene: '构建文档问答与检索增强应用', install: 'pip install llama-index' },
];
const RANKED = [...SKILLS].sort((a, b) => b.stars - a.stars);

function stripOwner(repo) { return repo.split('/')[1] || repo; }
function ghUrl(repo) { return `https://github.com/${repo}`; }

export default function AgentSkills() {
  const [filter, setFilter] = useState('all'); // all/download/web/local
  const [query, setQuery] = useState('');
  const [openLocal, setOpenLocal] = useState({}); // 折叠面板
  const [copied, setCopied] = useState('');

  const copy = async (id, text) => {
    try { await navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(''), 1600); } catch { /* ignore */ }
  };

  const filteredAgents = AGENTS.filter((a) => {
    const mf = filter === 'all' || a.type === filter;
    const q = query.trim().toLowerCase();
    const mq = !q || a.name.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q);
    return mf && mq;
  });

  const TYPE_META = {
    download: { icon: Download, label: '可下载软件', color: '#0CA678', bg: '#E6FCF5' },
    web: { icon: Globe, label: '网页版', color: '#1971C2', bg: '#E7F5FF' },
    local: { icon: Terminal, label: '国内需本地部署', color: '#E8590C', bg: '#FFF1E6' },
  };

  const FILTERS = [
    { key: 'all', label: '全部' },
    { key: 'download', label: '软件下载' },
    { key: 'web', label: '网页访问' },
    { key: 'local', label: '本地命令行部署' },
  ];

  return (
    <div className="ag-page">
      <style>{`
        .ag-page { display:flex; flex-direction:column; gap:20px; }
        .ag-sec { background:#fff;border:1px solid rgba(20,24,33,.09);border-radius:14px;box-shadow:0 1px 2px rgba(16,20,30,.04);padding:18px 20px; }
        .ag-head { display:flex;align-items:center;gap:10px;margin-bottom:14px; }
        .ag-head h2 { margin:0;font-size:16px;font-weight:700;color:#212529; }
        .ag-ico { width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:${ACCENT}1A;color:${ACCENT}; }
        .ag-sp { flex:1; }
        /* 筛选 + 搜索 */
        .ag-toolbar { display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:14px; }
        .ag-chip { border:1px solid rgba(20,24,33,.12);background:#fff;color:#495057;border-radius:999px;font-size:12.5px;font-weight:600;padding:6px 14px;cursor:pointer;transition:all .15s ease; }
        .ag-chip:hover { border-color:${ACCENT}88;color:${ACCENT}; }
        .ag-chip.on { background:${ACCENT};border-color:${ACCENT};color:#fff; }
        .ag-search { display:flex;align-items:center;gap:8px;border:1px solid rgba(20,24,33,.13);border-radius:9px;padding:7px 11px;background:#fff; }
        .ag-search input { border:0;outline:0;font-size:13px;min-width:150px; }
        /* Agent card */
        .ag-card { border:1px solid rgba(20,24,33,.09);border-radius:12px;padding:14px 16px;display:flex;flex-direction:column;gap:10px;background:#fff; }
        .ag-card:hover { border-color:${ACCENT}66; }
        .ag-card-top { display:flex;align-items:flex-start;gap:10px; }
        .ag-name { font-size:15px;font-weight:700;color:#212529; }
        .ag-desc { font-size:12px;color:#6c757d;line-height:1.55;margin-top:3px; }
        .ag-badge { display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;border-radius:999px;padding:3px 10px;white-space:nowrap; }
        .ag-actions { display:flex;gap:8px;margin-top:6px;flex-wrap:wrap; }
        .ag-btn { display:inline-flex;align-items:center;gap:6px;border-radius:9px;font-size:12.5px;font-weight:600;padding:8px 13px;cursor:pointer;border:1px solid rgba(20,24,33,.12);color:#495057;background:#fff;transition:all .15s ease; }
        .ag-btn:hover { border-color:${ACCENT}88;color:${ACCENT}; }
        .ag-btn.solid { background:${ACCENT};border-color:${ACCENT};color:#fff; }
        .ag-btn.solid:hover { opacity:.92;color:#fff; }
        .ag-btn.danger:hover { color:#E8590C;border-color:rgba(232,89,12,.5); }
        .ag-fold { border:1px solid rgba(20,24,33,.09);border-radius:10px;background:#FBFAFF; }
        .ag-fold-h { display:flex;align-items:center;gap:8px;width:100%;padding:10px 12px;background:transparent;border:0;cursor:pointer;font-size:12.5px;font-weight:700;color:${ACCENT};text-align:left; }
        .ag-pre { margin:0;padding:12px;background:#1e1e2e;color:#e6e6f0;border-radius:0 0 10px 10px;font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre-wrap; }
        .ag-steps { padding:10px 14px 12px;font-size:12.5px;color:#495057; }
        .ag-steps ol { margin:0;padding-left:18px;line-height:1.9; }
        .ag-deps { padding:0 14px 12px; }
        .ag-deps li { font-size:12px;color:#6c757d; }
        /* Skill */
        .ag-grid { display:grid;grid-template-columns:repeat(1,1fr);gap:12px; }
        @media (min-width:640px){ .ag-grid { grid-template-columns:repeat(2,1fr); } }
        @media (min-width:1000px){ .ag-grid { grid-template-columns:repeat(2,1fr); } }
        .ag-skill { border:1px solid rgba(20,24,33,.09);border-radius:12px;padding:14px 16px;background:#fff;display:flex;flex-direction:column;gap:8px; }
        .ag-skill:hover { border-color:${ACCENT}66; }
        .ag-area { align-self:flex-start;font-size:11px;font-weight:700;color:${ACCENT};background:${ACCENT}1A;border-radius:999px;padding:2px 10px; }
        .ag-skill-name { font-size:14px;font-weight:700;color:#212529;word-break:break-all; }
        .ag-skill-desc { font-size:12px;color:#6c757d;line-height:1.55; }
        .ag-skill-scene { font-size:12px;color:#495057; }
        .ag-skill-scene b { color:${ACCENT};font-weight:700; }
        .ag-skill-meta { display:flex;align-items:center;gap:6px;font-size:12px;color:#adb5bd; }
        .ag-skill-star { color:#F59E0B;display:inline-flex;align-items:center;gap:4px;font-weight:700; }
        .ag-rank { display:flex;flex-direction:column;gap:8px;margin-top:14px; }
        .ag-rank-row { display:flex;align-items:center;gap:10px;border:1px solid rgba(20,24,33,.08);border-radius:10px;padding:10px 12px; }
        .ag-rank-no { width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff;flex-shrink:0; }
        .ag-empty { text-align:center;padding:30px 0;color:#adb5bd;font-size:13px; }
        .ag-note { font-size:11.5px;color:#adb5bd;margin-top:12px; }
      `}</style>

      {/* ============ 模块1：AI Agent ============ */}
      <div className="ag-sec">
        <div className="ag-head">
          <div className="ag-ico"><Bot size={18} /></div>
          <h2>主流 AI Agent 聚合</h2>
          <span className="ag-note" style={{ margin: 0 }}>{filteredAgents.length} 个</span>
        </div>

        <div className="ag-toolbar">
          {FILTERS.map((f) => (
            <button key={f.key} className={`ag-chip${filter === f.key ? ' on' : ''}`} onClick={() => setFilter(f.key)}>{f.label}</button>
          ))}
          <div className="ag-search">
            <Search size={14} color="#adb5bd" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索 Agent..." />
            {query && <button onClick={() => setQuery('')} style={{ border: 0, background: 'transparent', cursor: 'pointer' }}><X size={13} /></button>}
          </div>
        </div>

        <div className="ag-grid">
          {filteredAgents.length === 0 ? (
            <div className="ag-empty">没有匹配的 Agent</div>
          ) : filteredAgents.map((a) => {
            const meta = TYPE_META[a.type];
            const MIcon = meta.icon;
            const isLocal = a.type === 'local';
            const open = !!openLocal[a.name];
            return (
              <div key={a.name} className="ag-card">
                <div className="ag-card-top">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="ag-name">{a.name}</div>
                    <div className="ag-desc">{a.desc}</div>
                  </div>
                  <span className="ag-badge" style={{ color: meta.color, background: meta.bg }}><MIcon size={12} />{meta.label}</span>
                </div>

                <div className="ag-actions">
                  {a.type === 'download' && a.downloadUrl && (
                    <a href={a.downloadUrl} target="_blank" rel="noopener noreferrer" className="ag-btn solid"><Download size={14} />官方下载</a>
                  )}
                  {a.type === 'web' && a.url && (
                    <a href={a.url} target="_blank" rel="noopener noreferrer" className="ag-btn solid"><Globe size={14} />访问网页版</a>
                  )}
                  {isLocal && (
                    <button className="ag-btn danger" onClick={() => setOpenLocal((p) => ({ ...p, [a.name]: !open }))}>
                      {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      {open ? '收起部署' : '本地部署说明'}
                    </button>
                  )}
                  <button className="ag-btn" onClick={() => copy('a-' + a.name, a.deploy)}>
                    {copied === 'a-' + a.name ? <Check size={14} style={{ color: '#0CA678' }} /> : <Copy size={14} />}
                    {copied === 'a-' + a.name ? '已复制' : '复制脚本'}
                  </button>
                </div>

                {isLocal && open && (
                  <div className="ag-fold">
                    <div className="ag-fold-h"><Terminal size={13} />一键配置脚本（已格式化，可一键复制）</div>
                    <pre className="ag-pre"><code>{a.deploy}</code></pre>
                    <div className="ag-steps">
                      <b style={{ fontSize: 12 }}>VSCode / 本地部署步骤</b>
                      <ol>{a.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
                    </div>
                    <div className="ag-deps">
                      <b style={{ fontSize: 11.5, color: '#6c757d' }}>环境依赖说明：</b>
                      <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{a.deps.map((d, i) => <li key={i}>{d}</li>)}</ul>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="ag-note">提示：优先使用「软件下载 / 网页版」，本地部署类需自行准备运行环境与模型/API Key。</p>
      </div>

      {/* ============ 模块2：Skill ============ */}
      <div className="ag-sec">
        <div className="ag-head">
          <div className="ag-ico"><Sparkles size={18} /></div>
          <h2>高分 Skill 资源库</h2>
          <div className="ag-sp" />
          <span className="ag-note" style={{ margin: 0 }}>各领域 Skill 卡片 · 可复制安装脚本</span>
        </div>

        <div className="ag-grid">
          {SKILLS.map((s) => (
            <div key={s.repo} className="ag-skill">
              <span className="ag-area">{s.area}</span>
              <div className="ag-skill-name">{s.name}</div>
              <div className="ag-skill-desc">{s.desc}</div>
              <div className="ag-skill-scene"><b>适用：</b>{s.scene}</div>
              <div className="ag-skill-meta">
                <Github size={12} />{s.repo}
                <span className="ag-skill-star"><Star size={12} />{(s.stars / 1000).toFixed(1)}k</span>
              </div>
              <div className="ag-actions" style={{ margin: 0 }}>
                <a href={ghUrl(s.repo)} target="_blank" rel="noopener noreferrer" className="ag-btn"><Github size={14} />查看 GitHub</a>
                <button className="ag-btn" onClick={() => copy('s-' + s.repo, s.install)}>
                  {copied === 's-' + s.repo ? <Check size={14} style={{ color: '#0CA678' }} /> : <Copy size={14} />}
                  {copied === 's-' + s.repo ? '已复制' : '复制脚本'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ============ 模块2续：GitHub Skill 排行榜 ============ */}
      <div className="ag-sec">
        <div className="ag-head">
          <div className="ag-ico"><Trophy size={18} /></div>
          <h2>GitHub Skill 排行榜</h2>
          <div className="ag-sp" />
          <span className="ag-note" style={{ margin: 0 }}>按仓库 Star 降序</span>
        </div>
        <div className="ag-rank">
          {RANKED.map((s, idx) => (
            <div key={s.repo} className="ag-rank-row">
              <span className="ag-rank-no" style={{ background: ['#F59E0B', '#94A3B8', '#CD7F32'][idx] || '#7C5CFF' }}>{idx + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#212529', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Star size={13} color="#F59E0B" />
                  <span>{(s.stars / 1000).toFixed(1)}k</span>
                  <span style={{ color: '#495057', fontWeight: 600 }}>{s.repo}</span>
                </div>
                <div style={{ fontSize: 12, color: '#6c757d' }}>{s.desc}</div>
              </div>
              <a href={ghUrl(s.repo)} target="_blank" rel="noopener noreferrer" className="ag-btn" style={{ flexShrink: 0 }}>
                <Github size={14} />前往 GitHub
              </a>
            </div>
          ))}
        </div>
        <p className="ag-note">Star 为发布时估值，以 GitHub 实时数据为准。</p>
      </div>
    </div>
  );
}
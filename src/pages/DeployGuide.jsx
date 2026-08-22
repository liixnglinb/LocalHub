import React, { useState } from 'react';
import { Book, ExternalLink, ChevronDown, ChevronRight, Copy, Check, Terminal, AlertTriangle, Shield, Server, Github, Database, Globe, Lock, Key } from 'lucide-react';

const sections = [
  { id: 'summary', icon: Book, label: '一句话摘要' },
  { id: 'tech', icon: Server, label: '技术栈' },
  { id: 'layout', icon: Database, label: '仓库布局' },
  { id: 'config', icon: Key, label: '真实配置' },
  { id: 'pages', icon: Globe, label: '功能页面' },
  { id: 'data', icon: Database, label: '数据层（Supabase）' },
  { id: 'leaderboard', icon: Terminal, label: 'AI 排行榜' },
  { id: 'deploy', icon: Github, label: '部署上线' },
  { id: 'new-page', icon: Copy, label: '新增功能页' },
  { id: 'design', icon: Shield, label: '设计规范' },
  { id: 'troubleshoot', icon: AlertTriangle, label: '排障速查' },
  { id: 'pitfalls', icon: Lock, label: '踩坑记录' },
  { id: 'status', icon: Check, label: '当前状态' },
  { id: 'forbidden', icon: Shield, label: '禁止事项' },
];

const codeStyle = {
  background: '#f5f5f5', padding: '12px 16px', borderRadius: '8px',
  fontSize: '13px', fontFamily: "'JetBrains Mono','Fira Code',monospace",
  overflowX: 'auto', lineHeight: 1.7, border: '1px solid #e5e5e5', margin: '12px 0'
};

const tableStyle = {
  width: '100%', borderCollapse: 'collapse', fontSize: '14px', margin: '12px 0'
};

const thStyle = { background: '#f5f5f5', padding: '10px 12px', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid #e5e5e5' };
const tdStyle = { padding: '10px 12px', borderBottom: '1px solid #e5e5e5', verticalAlign: 'top' };

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return (
    <button onClick={copy} style={{ background: 'none', border: '1px solid #ddd', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 8 }}>
      {copied ? <Check size={14} color="#059669" /> : <Copy size={14} />}
      {copied ? '已复制' : '复制'}
    </button>
  );
}

export default function DeployGuide() {
  const [activeSection, setActiveSection] = useState(null);

  const toggleSection = (id) => setActiveSection(activeSection === id ? null : id);

  const Section = ({ id, title, children, icon: Icon }) => (
    <div style={{ border: '1px solid #e5e5e5', borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}>
      <button
        onClick={() => toggleSection(id)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px',
          background: activeSection === id ? '#f8f8f8' : '#fff', border: 'none', cursor: 'pointer',
          fontSize: 15, fontWeight: 600, textAlign: 'left', transition: 'background 0.2s'
        }}
      >
        {Icon && <Icon size={18} strokeWidth={1.8} color="#3B5BFF" />}
        <span style={{ flex: 1 }}>{title}</span>
        {activeSection === id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
      </button>
      {activeSection === id && <div style={{ padding: '16px 18px', borderTop: '1px solid #e5e5e5', fontSize: 14, lineHeight: 1.8, color: '#333' }}>{children}</div>}
    </div>
  );

  return (
    <div style={{ maxWidth: 840, margin: '0 auto', padding: '20px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Book size={28} strokeWidth={1.8} color="#3B5BFF" />
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>LocalHub 部署与使用指南</h1>
          <p style={{ fontSize: 14, color: '#888', margin: '4px 0 0' }}>架构 · 部署 · 排障 · 给 AI 改代码的完整参考</p>
        </div>
        <a href="https://liixnglinb.github.io/LocalHub/" target="_blank" rel="noopener noreferrer"
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#3B5BFF', textDecoration: 'none', border: '1px solid #d0d7ff', borderRadius: 6, padding: '6px 12px' }}>
          <ExternalLink size={14} /> 线上地址
        </a>
      </div>

      <div style={{ background: '#f0f4ff', border: '1px solid #d0d7ff', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#3B5BFF' }}>
        <strong>⚠️ 红线：</strong>service_role / sb_secret_... 密钥绝不可写进前端代码。管理令牌泄露需立即轮换。
      </div>

      <Section id="summary" icon={Book} title="一句话摘要">
        <p>一个个人工具中心网站：把笔记、链接、提示词、日程、宝宝护理、AI排行榜等十几类个人工具收进一个带登录门控的网页。纯前端 SPA，数据存云（Supabase），托管在 GitHub Pages，无自建服务器（除一个 Supabase Edge Function 用于排行榜定时抓取）。</p>
        <p style={{ marginTop: 12 }}>
          <strong>线上地址：</strong>
          <a href="https://liixnglinb.github.io/LocalHub/" target="_blank" rel="noopener noreferrer" style={{ color: '#3B5BFF' }}>https://liixnglinb.github.io/LocalHub/</a>
        </p>
      </Section>

      <Section id="tech" icon={Server} title="技术栈">
        <ul style={{ paddingLeft: 20, lineHeight: 2.2 }}>
          <li><strong>React 18 + Vite 5</strong>（@vitejs/plugin-react）</li>
          <li><strong>react-router-dom v6</strong>（HashRouter，路由含 #/ 前缀）</li>
          <li><strong>@supabase/supabase-js v2</strong>（数据 + 登录鉴权）</li>
          <li>lucide-react（线性图标）、chart.js（图表）、jsqr（二维码）、tailwindcss v3（部分页面）</li>
          <li><strong>Supabase Edge Function</strong>（Deno / TypeScript）—— 仅用于「AI 排行榜」定时抓取</li>
          <li><strong>托管：GitHub Pages</strong>，由 GitHub Actions（deploy.yml）自动构建部署</li>
        </ul>
      </Section>

      <Section id="config" icon={Key} title="真实配置">
        <table style={tableStyle}>
          <thead><tr><th style={thStyle}>用途</th><th style={thStyle}>值</th></tr></thead>
          <tbody>
            <tr><td style={tdStyle}>Supabase 项目 URL</td><td style={{...tdStyle, fontFamily: 'monospace', fontSize: 13}}>https://grutfwvthmrdhywwwlyw.supabase.co</td></tr>
            <tr><td style={tdStyle}>Supabase 公开密钥（anon）</td><td style={{...tdStyle, fontFamily: 'monospace', fontSize: 13}}>sb_publishable_JMtGctmzjWJMH-ikjQfn-w_3Feg3sCY</td></tr>
            <tr><td style={tdStyle}>Edge Function 地址</td><td style={{...tdStyle, fontFamily: 'monospace', fontSize: 13}}>https://grutfwvthmrdhywwwlyw.functions.supabase.co/leaderboard</td></tr>
            <tr><td style={tdStyle}>GitHub 仓库</td><td style={{...tdStyle, fontFamily: 'monospace', fontSize: 13}}>liixnglinb/LocalHub（默认分支 main）</td></tr>
            <tr><td style={tdStyle}>GitHub Pages</td><td style={{...tdStyle, fontFamily: 'monospace', fontSize: 13}}>https://liixnglinb.github.io/LocalHub/</td></tr>
            <tr><td style={tdStyle}>Supabase 项目 ref</td><td style={{...tdStyle, fontFamily: 'monospace', fontSize: 13}}>grutfwvthmrdhywwwlyw</td></tr>
            <tr><td style={tdStyle}>Supabase 管理令牌</td><td style={{...tdStyle, fontFamily: 'monospace', fontSize: 13}}>sbp_xxxxxxxxxxxxx（你自己的令牌，切勿公开）</td></tr>
          </tbody>
        </table>
      </Section>

      <Section id="leaderboard" icon={Terminal} title="AI 排行榜">
        <p>唯一含服务端逻辑的页面（Supabase Edge Function，非自建后端）。</p>
        <h4 style={{ margin: '16px 0 8px' }}>数据链路</h4>
        <div style={codeStyle}>
          每天 08:00 pg_cron 触发 → Edge Function ?sync=1 → 抓取 BenchLM 各榜单<br />
          → 解析、去重、合并 → 写进 lb_data (id=1)<br />
          → 用户访问 ?config=1 拿配置 / ?tab=xxx 拿某榜数据
        </div>
        <p style={{ marginTop: 12 }}>当前一次抓到 <strong>524 条</strong>真实数据。支持 tab：overall / math / code / agent / reasoning / knowledge / multimodal / multilingual / instruction。</p>
        <h4 style={{ margin: '16px 0 8px' }}>部署 Edge Function</h4>
        <div style={codeStyle}>
          cd D:\LocalHub\supabase<br />
          supabase functions deploy leaderboard --verify-jwt=false
        </div>
      </Section>

      <Section id="deploy" icon={Github} title="部署上线">
        <div style={{ background: '#f0f4ff', border: '1px solid #d0d7ff', borderRadius: 6, padding: '12px 16px', marginBottom: 12, fontSize: 13 }}>
          <strong>日常上线一句话：</strong>
        </div>
        <div style={codeStyle}>
          cd D:\LocalHub<br />
          npm run build &amp;&amp; git add -A &amp;&amp; git commit -m "描述改动" &amp;&amp; git push origin main
        </div>
        <p style={{ marginTop: 12 }}>几分钟后 GitHub Actions 自动构建并部署到 Pages。</p>
        <h4 style={{ margin: '16px 0 8px' }}>Edge Function 部署（Management API）</h4>
        <div style={codeStyle}>
          $TOKEN="sbp_your_token_here"<br />
          $REF="grutfwvthmrdhywwwlyw"<br />
          $FN="D:\LocalHub\supabase\functions\leaderboard\index.ts"<br /><br />
          curl.exe -X POST "https://api.supabase.com/v1/projects/$REF/functions/deploy?slug=leaderboard" `<br />
          &nbsp;&nbsp;--header "Authorization: Bearer $TOKEN" `<br />
          &nbsp;&nbsp;--form "file=@$FN;type=text/typescript"
        </div>
        <h4 style={{ margin: '16px 0 8px' }}>首次从零部署</h4>
        <div style={codeStyle}>
          git clone https://github.com/liixnglinb/LocalHub.git<br />
          cd LocalHub &amp;&amp; git checkout main &amp;&amp; npm install<br />
          npm run dev &nbsp;&nbsp;# http://localhost:5173
        </div>
      </Section>

      <Section id="troubleshoot" icon={AlertTriangle} title="部署排障速查">
        <table style={tableStyle}>
          <thead><tr><th style={thStyle}>现象</th><th style={thStyle}>原因</th><th style={thStyle}>处理</th></tr></thead>
          <tbody>
            <tr><td style={tdStyle}>push 报证书错误</td><td style={tdStyle}>全局 git sslcainfo 指向损坏 certifi</td><td style={tdStyle}>已修复为 schannel。若再出现：<code>git config --global http.sslbackend schannel</code></td></tr>
            <tr><td style={tdStyle}>构建失败</td><td style={tdStyle}>依赖缺失</td><td style={tdStyle}>删 node_modules + package-lock.json，重新 npm install</td></tr>
            <tr><td style={tdStyle}>线上没更新</td><td style={tdStyle}>Actions 未触发</td><td style={tdStyle}>确认 push 到 main；确认 Pages Source 为 GitHub Actions</td></tr>
            <tr><td style={tdStyle}>排行榜无数据</td><td style={tdStyle}>Edge Function 未部署</td><td style={tdStyle}>重新部署 leaderboard function</td></tr>
          </tbody>
        </table>
      </Section>

      <Section id="forbidden" icon={Shield} title="部署禁止事项（红线）">
        <ul style={{ paddingLeft: 20, lineHeight: 2.2, color: '#c0392b' }}>
          <li><strong>永不</strong>把 service_role / sb_secret_... 写入 src/、public/、.github/ 或任何提交文件</li>
          <li><strong>永不</strong> git push master 覆盖旧桌面版</li>
          <li>不要把含本手册的文件推到公开仓库</li>
          <li>前端只用公开的 Publishable Key</li>
          <li>管理令牌 sbp_... 若失效，去 Supabase dashboard 重新生成</li>
          <li>任何密码/令牌在对话中泄露过就应视为已泄露并及时轮换</li>
        </ul>
      </Section>

      <Section id="status" icon={Check} title="当前状态（快照）">
        <ul style={{ paddingLeft: 20, lineHeight: 2.2 }}>
          <li>✅ 排行榜：Edge Function 已部署（v4，ACTIVE）、lb_data 已建并授权、pg_cron 已挂、已抓到并落库 <strong>524 条</strong>真实 BenchLM 数据</li>
          <li>✅ 前端 public/lb/app.js 已指向 Edge Function</li>
          <li>✅ supabase/ 在唯一仓库 D:\LocalHub（main）；git 证书已修复（schannel），push 免绕过</li>
          <li>✅ 旧后端 server/ 与 deploy/ 已移除，架构收敛为纯 Supabase</li>
          <li>⏭️ 后续任何改动：照部署流程改 → push 上线</li>
        </ul>
      </Section>

      <div style={{ textAlign: 'center', marginTop: 40, padding: '20px 0', borderTop: '1px solid #e5e5e5', fontSize: 13, color: '#999' }}>
        LocalHub · 部署指南 · 最后更新 2026-08
      </div>
    </div>
  );
}
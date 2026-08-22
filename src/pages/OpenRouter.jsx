import React, { useState, useEffect } from 'react';
import {
  Search, Copy, Check, RefreshCw, Boxes, Cpu, Layers, ShieldCheck, Database, Wifi,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

/* ============================================================
   OpenRouter 免费模型站 · 白底简约商务风
   - 数据来自 Supabase 快照表 or_models（Edge Function 定时抓取，每天两次）
   - 搜索 / 厂商筛选 / 上下文筛选 / 一键复制模型 ID
   ============================================================ */

const fmtCtx = (n) => {
  const v = n || 0;
  if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
  if (v >= 1000) return Math.round(v / 1000) + 'K';
  return String(v);
};

function tagOf(modality) {
  const m = modality || '';
  const list = [];
  if (/image/.test(m)) list.push({ t: '多模态', c: '#7C5CFF' });
  if (/text/.test(m) && /image/.test(m)) {} else if (/text/.test(m)) list.push({ t: '文本', c: '#0891B2' });
  if (/\bvideo/.test(m)) list.push({ t: '视频', c: '#D97706' });
  if (/audio|music/.test(m)) list.push({ t: '音频', c: '#059669' });
  return list;
}

export default function OpenRouter() {
  const [data, setData] = useState(null);      // { generated_at, models:[...] }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [vendor, setVendor] = useState('all');
  const [ctx, setCtx] = useState('all');
  const [copiedId, setCopiedId] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const { data: row, error: er } = await supabase
        .from('or_models').select('payload').eq('id', 1).maybeSingle();
      if (er) throw new Error(er.message);
      setData(row?.payload || null);
    } catch (e) {
      setError(e.message || '加载失败');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const models = data?.models || [];
  const vendors = ['all', ...new Set(models.map((m) => (m.vendor || '').replace(/^.*\/(\w+)$/, '$1') || m.vendor))].filter(Boolean);

  const filtered = models.filter((m) => {
    const name = (m.name || '').toLowerCase();
    const id = (m.id || '').toLowerCase();
    const ven = (m.vendor || '').toLowerCase();
    if (q && !(name.includes(q) || id.includes(q) || ven.includes(q))) return false;
    if (vendor !== 'all' && ven !== vendor) return false;
    if (ctx === '128K' && (m.context_length || 0) < 128000) return false;
    if (ctx === '256K' && (m.context_length || 0) < 256000) return false;
    if (ctx === '1M' && (m.context_length || 0) < 1000000) return false;
    return true;
  });

  const totalCtx = models.reduce((s, m) => s + (m.context_length || 0), 0);

  const copyId = async (id) => {
    try { await navigator.clipboard.writeText(id); setCopiedId(id); setTimeout(() => setCopiedId(''), 1600); }
    catch {}
  };

  return (
    <div>
      <style>{`
        .orm-head { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; }
        .orm-count { font-size: 25px; font-weight: 700; color: #1A1D24; letter-spacing: -0.01em; }
        .orm-count em { font-style: normal; color: #7C5CFF; }
        .orm-stat { margin-left: auto; display: flex; gap: 12px; }
        .orm-stat-ic { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px; background: #F4F6FB; border: 1px solid rgba(20,24,33,.07); color: #4A4E57; font-size: 12px; font-weight: 500; white-space: nowrap; }

        .orm-toolbar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin: 18px 0 16px; }
        .orm-search { position: relative; flex: 1; min-width: 200px; }
        .orm-search svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #A6ABB4; }
        .orm-search input { width: 100%; height: 40px; padding: 0 12px 0 36px; border-radius: 10px; border: 1px solid rgba(20,24,33,.12); background: #fff; color: #1A1D24; font: 500 13.5px/1 "PingFang SC", system-ui, sans-serif; outline: none; transition: all .18s ease; }
        .orm-search input:focus { border-color: rgba(124,92,255,.55); box-shadow: 0 0 0 3px rgba(124,92,255,.12); }
        .orm-sels { display: flex; gap: 10px; align-items: center; }
        .orm-sel { appearance: none; height: 40px; padding: 0 30px 0 12px; border-radius: 10px; border: 1px solid rgba(20,24,33,.12); background: #fff url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238A8F99' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m6 9 6 6 6-6'/></svg>") no-repeat right 12px center; color: #1A1D24; font: 600 12.5px/1 "PingFang SC", system-ui, sans-serif; cursor: pointer; outline: none; }
        .orm-sel:focus { border-color: rgba(124,92,255,.5); }

        .orm-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 14px; }
        .orm-card { display: flex; flex-direction: column; background: #fff; border: 1px solid rgba(20,24,33,.09); border-radius: 14px; padding: 16px 16px 14px; box-shadow: 0 1px 2px rgba(16,20,30,.04); transition: border-color .2s ease, box-shadow .2s ease, transform .2s ease; }
        .orm-card:hover { border-color: rgba(20,24,33,.18); box-shadow: 0 8px 20px -12px rgba(16,20,30,.16); transform: translateY(-2px); }
        .orm-card-top { display: flex; flex-direction: column; gap: 8px; }
        .orm-ven { display: inline-flex; align-items: center; width: fit-content; padding: 3px 9px; border-radius: 999px; background: #7C5CFF; color: #fff; font-size: 11px; font-weight: 700; letter-spacing: .03em; }
        .orm-name { font-size: 15px; font-weight: 650; color: #1A1D24; line-height: 1.35; word-break: break-word; }
        .orm-id { margin-top: 2px; font-size: 11.5px; color: #A6ABB4; font-family: "JetBrains Mono", Consolas, monospace; word-break: break-all; }
        .orm-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
        .orm-tag { display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px; border-radius: 8px; font-size: 11.5px; font-weight: 600; }
        .orm-card-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 14px; padding-top: 12px; border-top: 1px solid rgba(20,24,33,.07); }
        .orm-ctx { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; color: #4A4E57; font-weight: 600; }
        .orm-copy { display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: 9px; border: 1px solid rgba(20,24,33,.12); background: #fff; color: #4A4E57; font: 600 12px/1 "PingFang SC", system-ui, sans-serif; cursor: pointer; transition: all .16s ease; }
        .orm-copy:hover { border-color: #7C5CFF; color: #7C5CFF; }
        .orm-copy.ok { border-color: #22C55E; color: #16A34A; background: #EFFAF4; }

        .orm-empty { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 70px 20px; color: #A6ABB4; }
        .orm-empty b { font-size: 14px; color: #6c757d; }
        .orm-load { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; min-height: 260px; color: #8A8F99; }
        .orm-spin { width: 22px; height: 22px; border-radius: 50%; border: 2px solid rgba(124,92,255,.2); border-top-color: #7C5CFF; animation: ormspin .7s linear infinite; }
        @keyframes ormspin { to { transform: rotate(360deg); } }
        .orm-foot { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 22px; font-size: 12px; color: #B4B8C0; }
      `}</style>

      <div className="orm-head">
        <div className="orm-count">OpenRouter 免费模型 <em>{models.length}</em> 个</div>
        <div className="orm-stat">
          <span className="orm-stat-ic"><Database size={13} />约 {Math.round(totalCtx / 1000000)}M 上下文</span>
          <span className="orm-stat-ic" title="Edge Function 每天 08:00 / 20:00 自动抓取"><Wifi size={13} />每日 2 次更新</span>
        </div>
      </div>

      <div className="orm-toolbar">
        <div className="orm-search">
          <Search size={16} strokeWidth={1.8} />
          <input value={q} onChange={(e) => setQ(e.target.value.toLowerCase())} placeholder="搜索模型名称 / 厂商 / ID…" />
        </div>
        <div className="orm-sels">
          <select className="orm-sel" value={vendor} onChange={(e) => setVendor(e.target.value)}>
            {vendors.map((v) => <option key={v} value={v}>{v === 'all' ? '全部厂商' : v}</option>)}
          </select>
          <select className="orm-sel" value={ctx} onChange={(e) => setCtx(e.target.value)}>
            <option value="all">全部上下文</option>
            <option value="128K">≥ 128K</option>
            <option value="256K">≥ 256K</option>
            <option value="1M">≥ 1M</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="orm-load"><div className="orm-spin" />正在加载免费模型…</div>
      ) : error ? (
        <div className="orm-empty"><ShieldCheck size={30} strokeWidth={1.5} /><b>加载失败</b><span>{error}</span></div>
      ) : !models.length ? (
        <div className="orm-empty">
          <Boxes size={30} strokeWidth={1.5} />
          <b>暂无数据</b>
          <span>后台定时任务尚未同步，请稍后再来，或点右上角刷新。</span>
        </div>
      ) : !filtered.length ? (
        <div className="orm-empty"><Search size={30} strokeWidth={1.5} /><b>没有匹配的模型</b><span>换个关键词或放宽筛选条件试试。</span></div>
      ) : (
        <div className="orm-grid">
          {filtered.map((m) => {
            const tags = tagOf(m.modality);
            const isFree = m.isFree || /:free$/.test(m.id || '');
            return (
              <div className="orm-card" key={m.id}>
                <div className="orm-card-top">
                  <span className="orm-ven">{(m.vendor || 'or').split('/').pop()}</span>
                  <div className="orm-name">{m.name}</div>
                  <div className="orm-id">{m.id}</div>
                </div>
                <div className="orm-tags">
                  {isFree && <span className="orm-tag" style={{ background: 'rgba(34,197,94,.12)', color: '#16A34A' }}>免费</span>}
                  <span className="orm-tag" style={{ background: 'rgba(124,92,255,.1)', color: '#6A4BFF' }}><Layers size={12} />{fmtCtx(m.context_length)} 上下文</span>
                  {tags.map((x) => <span key={x.t} className="orm-tag" style={{ background: 'rgba(20,24,33,.05)', color: x.c }}>{x.t}</span>)}
                </div>
                <div className="orm-card-foot">
                  <span className="orm-ctx"><Cpu size={13} />{(m.architecture && m.architecture.model_size) || '—'} 参数</span>
                  <button className={'orm-copy ' + (copiedId === m.id ? 'ok' : '')} onClick={() => copyId(m.id)}>
                    {copiedId === m.id ? (<><Check size={13} />已复制</>) : (<><Copy size={13} />复制ID</>)}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="orm-foot">
        <span className="dot" style={{ width: 6, height: 6, borderRadius: 999, background: '#22C55E' }} />
        <span>{data?.generated_at ? '数据更新于 ' + new Date(data.generated_at).toLocaleString('zh-CN') : '尚未同步'}</span>
      </div>
    </div>
  );
}
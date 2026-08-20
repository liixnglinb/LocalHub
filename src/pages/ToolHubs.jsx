import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, X, ExternalLink, Compass, Copy } from 'lucide-react';

/* ============================================================
   工具网站集成 · 精选网站导航
   - 内置高质量工具网站目录，按领域分组，一键直达
   - 金融行情 / 投资决策 / 宏观数据 / AI 助手 / 开发 / 文档效率 / 设计素材
   - 白底商务卡片，浅色分类标，favicon 自动加载 + 首字母兜底
   ============================================================ */

const ACCENT = '#0CA678';
const ACCENT_SOFT = 'rgba(12,166,120,.10)';
const ACCENT_LINE = 'rgba(12,166,120,.28)';

const CATEGORIES = [
  { key: '金融行情', color: '#E8590C', bg: '#FFF4E6' },
  { key: '投资决策', color: '#1971C2', bg: '#E7F5FF' },
  { key: '宏观数据', color: '#0CA678', bg: '#E6FCF5' },
  { key: 'AI·国内',   color: '#6741D9', bg: '#F3F0FF' },
  { key: 'AI·国外',   color: '#5F3DC4', bg: '#F1EEFF' },
  { key: '开发社区', color: '#495057', bg: '#F1F3F5' },
  { key: '门户资讯', color: '#2F9E44', bg: '#EBFBEE' },
  { key: '办公效率', color: '#E64980', bg: '#FFF0F6' },
  { key: '设计素材', color: '#F08C00', bg: '#FFF4E6' },
];

const SITES = [
  /* ---- 金融行情（国内访问量最大的财经平台） ---- */
  { name: '东方财富', desc: '国内访问量最大的财经门户，行情/资讯/数据全覆盖', url: 'https://www.eastmoney.com', cat: '金融行情' },
  { name: '同花顺', desc: '头部炒股行情软件在线版，亿万股民使用', url: 'https://www.10jqka.com.cn', cat: '金融行情' },
  { name: '新浪财经', desc: '门户级财经资讯与全球行情', url: 'https://finance.sina.com.cn', cat: '金融行情' },
  { name: '凤凰网财经', desc: '高流量财经资讯与评论', url: 'https://finance.ifeng.com', cat: '金融行情' },
  { name: '网易财经', desc: '门户级财经频道，行情与原创报道', url: 'https://money.163.com', cat: '金融行情' },
  { name: '腾讯自选股', desc: '腾讯股票工具，海量股民自选与盯盘', url: 'https://gu.qq.com', cat: '金融行情' },
  { name: '金十数据', desc: '外汇/贵金属实时资讯直播，交易者密度极高', url: 'https://www.jin10.com', cat: '金融行情' },
  { name: '英为财情', desc: '全球行情，外汇/期货/加密货币高流量数据站', url: 'https://cn.investing.com', cat: '金融行情' },
  { name: '东方财富数据中心', desc: '资金流向、板块与宏观数据海量查询', url: 'https://data.eastmoney.com', cat: '金融行情' },

  /* ---- 投资决策 ---- */
  { name: '雪球', desc: '全国最大的投资者交流社区', url: 'https://xueqiu.com', cat: '投资决策' },
  { name: '天天基金', desc: '国内访问量最大的基金平台', url: 'https://fund.eastmoney.com', cat: '投资决策' },
  { name: '金融界', desc: '高流量财经网站，股票基金综合', url: 'https://www.jrj.com.cn', cat: '投资决策' },
  { name: '中金在线', desc: '老牌高流量财经综合门户', url: 'https://www.cnfol.com', cat: '投资决策' },
  { name: '和讯网', desc: '大型财经资讯与投资数据网站', url: 'https://www.hexun.com', cat: '投资决策' },

  /* ---- 宏观数据 ---- */
  { name: '国家统计局', desc: '国民经济运行权威官方数据', url: 'https://www.stats.gov.cn', cat: '宏观数据' },
  { name: '中国人民银行', desc: '货币政策、利率与汇率官方数据', url: 'https://www.pbc.gov.cn', cat: '宏观数据' },
  { name: '中证指数', desc: '指数编制官方平台与指数数据', url: 'https://www.csindex.com.cn', cat: '宏观数据' },

  /* ---- AI·国外（海外主流大模型官方入口） ---- */
  { name: 'ChatGPT', desc: 'OpenAI 官方，全球访问量最大的 AI 助手', url: 'https://chatgpt.com', cat: 'AI·国外' },
  { name: 'Claude', desc: 'Anthropic 官方 AI 助手', url: 'https://claude.ai', cat: 'AI·国外' },
  { name: 'Gemini', desc: 'Google 官方多模态大模型助手', url: 'https://gemini.google.com', cat: 'AI·国外' },
  { name: 'Grok', desc: 'xAI 官方（伊隆·马斯克）', url: 'https://x.ai', cat: 'AI·国外' },
  { name: 'Microsoft Copilot', desc: '微软官方 AI 助手', url: 'https://copilot.microsoft.com', cat: 'AI·国外' },
  { name: 'Meta AI', desc: 'Meta 官方 Llama 系列 AI 助手', url: 'https://www.meta.ai', cat: 'AI·国外' },
  { name: 'Perplexity', desc: '全球热门的 AI 搜索引擎', url: 'https://www.perplexity.ai', cat: 'AI·国外' },
  { name: 'Mistral', desc: 'Mistral AI 官方聊天助手', url: 'https://chat.mistral.ai', cat: 'AI·国外' },
  { name: 'Google AI Studio', desc: 'Google 官方 Gemini 调试与 API 平台', url: 'https://aistudio.google.com', cat: 'AI·国外' },
  { name: 'NotebookLM', desc: 'Google 官方 AI 长文档助手', url: 'https://notebooklm.google.com', cat: 'AI·国外' },
  { name: 'Poe', desc: 'Quora 官方多模型聚合助手', url: 'https://poe.com', cat: 'AI·国外' },
  { name: 'Groq', desc: '极速推理 API 平台', url: 'https://groq.com', cat: 'AI·国外' },
  { name: 'Hugging Face', desc: '全球最大开源模型社区', url: 'https://huggingface.co', cat: 'AI·国外' },
  { name: 'OpenRouter', desc: 'AI 模型路由聚合（你提供的站点）', url: 'https://openrouter.ai', cat: 'AI·国外' },

  /* ---- AI·国内（国产主流大模型官方入口） ---- */
  { name: '豆包', desc: '字节跳动官方 AI 助手', url: 'https://www.doubao.com', cat: 'AI·国内' },
  { name: '文心一言', desc: '百度官方大模型助手', url: 'https://yiyan.baidu.com', cat: 'AI·国内' },
  { name: '通义千问', desc: '阿里官方大模型助手', url: 'https://tongyi.aliyun.com', cat: 'AI·国内' },
  { name: 'Kimi', desc: '月之暗面官方长文本助手', url: 'https://kimi.moonshot.cn', cat: 'AI·国内' },
  { name: 'DeepSeek', desc: '深度求索官方大模型助手', url: 'https://chat.deepseek.com', cat: 'AI·国内' },
  { name: '智谱清言', desc: '智谱 AI 官方 ChatGLM 助手', url: 'https://chatglm.cn', cat: 'AI·国内' },
  { name: '讯飞星火', desc: '科大讯飞官方大模型', url: 'https://xinghuo.xfyun.cn', cat: 'AI·国内' },
  { name: '腾讯元宝', desc: '腾讯官方混元大模型助手', url: 'https://yuanbao.tencent.com', cat: 'AI·国内' },
  { name: '天工 AI', desc: '昆仑万维官方大模型助手', url: 'https://www.tiangong.cn', cat: 'AI·国内' },
  { name: '商量', desc: '商汤科技官方 SenseChat', url: 'https://chat.sensetime.com', cat: 'AI·国内' },
  { name: '海螺 AI', desc: 'MiniMax 官方助手', url: 'https://hailuoai.com', cat: 'AI·国内' },
  { name: '360 智脑', desc: '360 官方大模型助手', url: 'https://chat.360.cn', cat: 'AI·国内' },
  { name: '跃问', desc: '阶跃星辰官方大模型助手', url: 'https://yuewen.cn', cat: 'AI·国内' },
  { name: '秘塔 AI 搜索', desc: '秘塔科技官方 AI 搜索', url: 'https://metaso.cn', cat: 'AI·国内' },
  { name: '夸克', desc: '阿里官方全能 AI 搜索', url: 'https://quark.cn', cat: 'AI·国内' },
  { name: '纳米 AI', desc: '360 官方 AI 智能体', url: 'https://www.n.cn', cat: 'AI·国内' },
  { name: '百小应', desc: '百川智能官方大模型助手', url: 'https://ying.baichuan-ai.com', cat: 'AI·国内' },
  { name: '万知', desc: '零一万物官方 AI 助手', url: 'https://www.wanzhi.com', cat: 'AI·国内' },
  { name: 'WPS 灵犀', desc: '金山官方办公智能助手', url: 'https://copilot.wps.cn', cat: 'AI·国内' },

  /* ---- 开发社区（程序员访问量最大的站点） ---- */
  { name: 'GitHub', desc: '全球最大代码托管平台', url: 'https://github.com', cat: '开发社区' },
  { name: 'Stack Overflow', desc: '全球最火程序员问答社区', url: 'https://stackoverflow.com', cat: '开发社区' },
  { name: '知乎', desc: '高流量中文知识问答社区', url: 'https://www.zhihu.com', cat: '开发社区' },
  { name: '掘金', desc: '中文人气极高的技术社区', url: 'https://juejin.cn', cat: '开发社区' },
  { name: 'CSDN', desc: '国内程序员用户量最大的技术社区', url: 'https://www.csdn.net', cat: '开发社区' },
  { name: 'MDN', desc: 'Web 开发官方权威文档', url: 'https://developer.mozilla.org', cat: '开发社区' },
  { name: 'Uiverse', desc: '社区免费 UI 组件库（你提供的站点）', url: 'https://uiverse.io', cat: '开发社区' },

  /* ---- 门户资讯（访问量最大的门户/资讯站） ---- */
  { name: '百度', desc: '中国访问量最大的搜索引擎', url: 'https://www.baidu.com', cat: '门户资讯' },
  { name: '腾讯网', desc: '头部综合门户，资讯/娱乐全覆盖', url: 'https://www.qq.com', cat: '门户资讯' },
  { name: '新浪', desc: '老牌高流量综合门户', url: 'https://www.sina.com.cn', cat: '门户资讯' },
  { name: '网易', desc: '高流量综合门户与社区', url: 'https://www.163.com', cat: '门户资讯' },
  { name: '搜狐', desc: '老牌综合门户', url: 'https://www.sohu.com', cat: '门户资讯' },
  { name: '今日头条', desc: '国民级资讯应用', url: 'https://www.toutiao.com', cat: '门户资讯' },
  { name: '微博', desc: '中国最大的社交媒体平台', url: 'https://weibo.com', cat: '门户资讯' },

  /* ---- 办公效率 ---- */
  { name: '百度网盘', desc: '国内用户量最大的云存储', url: 'https://pan.baidu.com', cat: '办公效率' },
  { name: '腾讯文档', desc: '腾讯在线办公协作平台', url: 'https://docs.qq.com', cat: '办公效率' },
  { name: '钉钉', desc: '国内企业办公用户量最大的平台', url: 'https://www.dingtalk.com', cat: '办公效率' },
  { name: '飞书', desc: '字节跳动办公协作平台', url: 'https://www.feishu.cn', cat: '办公效率' },
  { name: '语雀', desc: '阿里巴巴云端知识库', url: 'https://www.yuque.com', cat: '办公效率' },
  { name: 'MinerU', desc: 'PDF 转结构化 Markdown（你提供的站点）', url: 'https://mineru.net', cat: '办公效率' },

  /* ---- 设计素材 ---- */
  { name: 'Canva', desc: '全球用户量最大的在线设计平台', url: 'https://www.canva.cn', cat: '设计素材' },
  { name: '站酷', desc: '国内访问量最大的设计社区', url: 'https://www.zcool.com.cn', cat: '设计素材' },
  { name: 'Unsplash', desc: '全球最火免费高清图库', url: 'https://unsplash.com', cat: '设计素材' },
  { name: 'Figma', desc: '全球最热协作设计工具', url: 'https://www.figma.com', cat: '设计素材' },
  { name: 'Pexels', desc: '全球高流量免费图库', url: 'https://www.pexels.com', cat: '设计素材' },
  { name: 'Iconify', desc: '海量开源图标集合', url: 'https://iconify.design', cat: '设计素材' },
];

const CAT_META = Object.fromEntries(CATEGORIES.map((c) => [c.key, c]));

function fallbackFavicon(name) {
  const ch = (name || '?').trim().charAt(0).toUpperCase();
  const colors = ['#0CA678', '#1971C2', '#E8590C', '#6741D9', '#E64980', '#2F9E44', '#F08C00', '#F03E3E'];
  const c = colors[Math.abs((name || '?').toUpperCase().charCodeAt(0)) % colors.length];
  return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7' fill='${c}'/><text x='16' y='22' text-anchor='middle' font-family='Arial' font-weight='bold' font-size='18' fill='white'>${ch}</text></svg>`;
}

function faviconUrl(url) {
  try {
    return `https://favicon.im/${new URL(url).hostname}?larger=true`;
  } catch {
    return '';
  }
}

export default function ToolHubs() {
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('全部');
  // favicon 缓存：首次显示字母色块（本地零等待），真实图标后台加载后缓存到 localStorage，二次秒显
  const [favs, setFavs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('toolhubs-favs') || '{}') || {}; } catch { return {}; }
  });
  const pendingRef = useRef(new Set());
  const failedRef = useRef(new Set());
  const saveFav = (name, url) => {
    setFavs((prev) => {
      const n = { ...(prev || {}), [name]: url };
      try { localStorage.setItem('toolhubs-favs', JSON.stringify(n)); } catch { /* 忽略 */ }
      return n;
    });
  };
  const dropFav = (name) => {
    setFavs((prev) => {
      const n = { ...(prev || {}) };
      delete n[name];
      try { localStorage.setItem('toolhubs-favs', JSON.stringify(n)); } catch { /* 忽略 */ }
      return n;
    });
  };
  // 后台异步预取真实 favicon（命中缓存则跳过），成功后写入 localStorage
  useEffect(() => {
    SITES.forEach((s) => {
      if (favs[s.name] || pendingRef.current.has(s.name) || failedRef.current.has(s.name)) return;
      const url = faviconUrl(s.url);
      if (!url) return;
      pendingRef.current.add(s.name);
      const img = new Image();
      img.onload = () => { pendingRef.current.delete(s.name); saveFav(s.name, url); };
      img.onerror = () => { pendingRef.current.delete(s.name); failedRef.current.add(s.name); };
      img.src = url;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SITES.filter((s) => {
      const matchCat = cat === '全部' || s.cat === cat;
      const matchQ = !q ||
        s.name.toLowerCase().includes(q) ||
        s.url.toLowerCase().includes(q) ||
        s.desc.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [query, cat]);

  const open = (url) => window.open(url, '_blank', 'noopener,noreferrer');
  const copy = async (url) => {
    try { await navigator.clipboard.writeText(url); } catch { /* ignore */ }
  };

  const counts = useMemo(() => {
    const m = { 全部: SITES.length };
    CATEGORIES.forEach((c) => { m[c.key] = SITES.filter((s) => s.cat === c.key).length; });
    return m;
  }, []);

  return (
    <div className="hub-page">
      <style>{`
        .hub-page .hub-top {
          display: flex; align-items: flex-end; justify-content: space-between;
          gap: 16px; flex-wrap: wrap;
        }
        .hub-page .hub-head-title { display: flex; align-items: center; gap: 12px; }
        .hub-page .hub-logo {
          width: 46px; height: 46px; border-radius: 12px;
          background: ${ACCENT_SOFT}; color: ${ACCENT};
          display: flex; align-items: center; justify-content: center;
        }
        .hub-page h1 { margin: 0; font-size: 22px; font-weight: 700; color: #212529; }
        .hub-page .hub-sub { margin: 4px 0 0; font-size: 13px; color: #6c757d; }
        .hub-page .hub-search {
          display: flex; align-items: center; gap: 8px;
          background: #fff; border: 1px solid rgba(20,24,33,.12);
          border-radius: 10px; padding: 8px 12px; width: 240px;
        }
        .hub-page .hub-search input { flex: 1; min-width: 0; border: 0; outline: 0; font-size: 13px; background: transparent; }
        .hub-page .hub-search svg { color: #adb5bd; flex-shrink: 0; }
        .hub-page .hub-cats { display: flex; flex-wrap: wrap; gap: 8px; }
        .hub-page .hub-chip {
          border: 1px solid rgba(20,24,33,.1); background: #fff;
          padding: 7px 14px; border-radius: 999px;
          font-size: 12.5px; font-weight: 600; color: #6c757d; cursor: pointer;
          transition: all .15s ease;
        }
        .hub-page .hub-chip:hover { color: #212529; border-color: rgba(20,24,33,.22); }
        .hub-page .hub-chip.on {
          background: ${ACCENT}; border-color: ${ACCENT}; color: #fff;
          box-shadow: 0 3px 10px ${ACCENT_LINE};
        }
        .hub-page .hub-grid {
          display: grid; grid-template-columns: repeat(1, 1fr); gap: 14px;
          margin-top: 4px;
        }
        @media (min-width: 560px) { .hub-page .hub-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 980px) { .hub-page .hub-grid { grid-template-columns: repeat(3, 1fr); } }
        .hub-page .hub-box {
          position: relative;
          background: #fff; border: 1px solid rgba(20,24,33,.09);
          border-radius: 14px; padding: 16px 16px 14px; cursor: pointer;
          transition: box-shadow .2s ease, transform .2s ease, border-color .2s ease;
        }
        .hub-page .hub-box:hover {
          border-color: ${ACCENT_LINE};
          box-shadow: 0 12px 22px -12px rgba(12,166,120,.25);
          transform: translateY(-2px);
        }
        .hub-page .hub-box-head { display: flex; align-items: center; gap: 12px; }
        .hub-page .hub-favicon {
          width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
          background: #f4f6fb; border: 1px solid rgba(20,24,33,.06);
          object-fit: contain; padding: 6px;
        }
        .hub-page .hub-name { font-size: 14.5px; font-weight: 600; color: #212529; }
        .hub-page .hub-domain { font-size: 11px; color: #adb5bd; margin-top: 2px; word-break: break-all; }
        .hub-page .hub-desc {
          margin-top: 10px; padding-top: 10px; border-top: 1px dashed rgba(20,24,33,.12);
          font-size: 12px; color: #6c757d; line-height: 1.55; min-height: 2.5em;
        }
        .hub-page .hub-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; }
        .hub-page .hub-tag {
          font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 999px;
          color: ${ACCENT}; background: ${ACCENT_SOFT};
        }
        .hub-page .hub-open { color: #adb5bd; transition: color .15s ease; }
        .hub-page .hub-box:hover .hub-open { color: ${ACCENT}; }
        .hub-page .hub-copy {
          color: #adb5bd; padding: 2px; border-radius: 6px; transition: all .15s ease;
        }
        .hub-page .hub-copy:hover { color: #212529; background: #f1f3f5; }
        .hub-page .hub-empty { text-align: center; padding: 60px 0; color: #adb5bd; font-size: 14px; }
      `}</style>

      <div className="hub-top">
        <div className="hub-head-title">
          <div className="hub-logo"><Compass size={22} strokeWidth={1.8} /></div>
          <div>
            <h1>工具网站集成</h1>
            <p className="hub-sub">金融 · AI · 开发 · 效率 · 设计 精选工具导航 · 共 {SITES.length} 个站点</p>
          </div>
        </div>
        <div className="hub-search">
          <Search size={15} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索工具网站..." />
          {query && (
            <button onClick={() => setQuery('')} style={{ border: 0, background: 'transparent', cursor: 'pointer' }}>
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="hub-cats">
        {[{ key: '全部' }, ...CATEGORIES].map(({ key }) => (
          <button
            key={key}
            onClick={() => setCat(key)}
            className={`hub-chip ${cat === key ? 'on' : ''}`}
          >
            {key} · {counts[key]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="hub-empty">没有匹配的工具网站，换个关键词试试</div>
      ) : (
        <div className="hub-grid">
          {filtered.map((s) => {
            const m = CAT_META[s.cat] || { color: ACCENT, bg: ACCENT_SOFT };
            // 有缓存/已加载则显示真实图标，否则先用本地字母色块（零等待）
            const real = !!favs[s.name];
            const fav = real ? faviconUrl(s.url) : fallbackFavicon(s.name);
            return (
              <div key={s.url} className="hub-box" onClick={() => open(s.url)}>
                <div className="hub-box-head">
                  <img
                    src={fav}
                    alt={s.name}
                    className="hub-favicon"
                    style={{ transition: 'opacity .3s ease', opacity: real ? 1 : 0.9 }}
                    onError={() => { if (real) { failedRef.current.add(s.name); dropFav(s.name); } }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div className="hub-name">{s.name}</div>
                    <div className="hub-domain">{s.url.replace(/^https?:\/\//, '')}</div>
                  </div>
                </div>
                <p className="hub-desc">{s.desc}</p>
                <div className="hub-foot">
                  <span className="hub-tag" style={{ color: m.color, background: `${m.color}1A` }}>
                    {s.cat}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); copy(s.url); }}
                      className="hub-copy"
                      title="复制链接"
                    >
                      <Copy size={14} />
                    </button>
                    <ExternalLink size={15} className="hub-open" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
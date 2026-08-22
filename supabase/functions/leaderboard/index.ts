/* ============================================================
   LocalHub · AI 大模型排行榜 Supabase Edge Function
   ------------------------------------------------------------
   职责：替代原 NestJS 后端的 leaderboard 接口
     - 定时（pg_cron）抓取 BenchLM 数据 → 解析 → 写入 lb_data 快照表
     - 对外提供 /config、/leaderboard/:tab /sync 等价接口
   调用方式（部署时 --verify-jwt=false，可匿名访问）
     GET  /leaderboard?config=1                  → 返回配置
     GET  /leaderboard?tab=overall&search=xxx    → 返回某榜单（含搜索/按分排序+rank）
     POST /leaderboard?sync=1                    → 立即抓取一次（同定时任务）
   ============================================================ */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-lb-sync-key",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// ---- 静态配置（来自 models.json，与旧前端约定一致） ----
const STRENGTHS = [
  { id: "low", label: "低强度", eng: "Non-Think" },
  { id: "mid", label: "中强度", eng: "Think High" },
  { id: "high", label: "高强度", eng: "Think Max" },
];
const DEFAULT_STRENGTH = "high";
const AXIS_RANGE = { min: 0, max: 100, step: 10 };

// 各榜单 Tab（含数据源字段映射；不含无数据源的 openclaw）
const TABS = [
  { id: "overall", label: "综合总榜", source: "items",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>' },
  { id: "math", label: "数学推理榜", source: "categories.math",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 7V5a1 1 0 0 0-1-1H6.5a.5.5 0 0 0-.4.8l4.5 6a2 2 0 0 1 0 2.4l-4.5 6a.5.5 0 0 0 .4.8H17a1 1 0 0 0 1-1v-2"/></svg>' },
  { id: "code", label: "代码编程榜", source: "categories.coding",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg>' },
  { id: "agent", label: "Agent 榜", source: "categories.agentic",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>' },
  { id: "reasoning", label: "推理思考榜", source: "categories.reasoning",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/></svg>' },
  { id: "knowledge", label: "知识能力榜", source: "categories.knowledge",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>' },
  { id: "multimodal", label: "多模态榜", source: "categories.multimodalGrounded",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>' },
  { id: "multilingual", label: "多语言榜", source: "categories.multilingual",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>' },
  { id: "instruction", label: "指令遵循榜", source: "categories.instructionFollowing",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/></svg>' },
];

// ---- BenchLM 数据源 ----
const LEADERBOARD_URL = "https://benchlm.ai/data/leaderboard.json";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  Accept: "application/json",
};

// 国内厂商 key（用于 lang 判断 & 配色）
const CN_VENDORS = new Set([
  "deepseek", "alibaba", "moonshot", "zhipu", "baidu", "tencent",
  "bytedance", "minimax", "yi", "baichuan", "stepfun", "xunfei", "sense",
  "xiaomi", "inclusion",
]);
const CN_COLOR = ["#4D6BFE", "#615CED", "#7C5CFF", "#165DFF", "#2932E1", "#006EFF", "#00AEEC", "#FF6B81", "#E22C39", "#FF6A00", "#0BB6B4", "#00468B", "#0066CC"];
const EN_COLOR = ["#CC5500", "#0E8347", "#1A73E8", "#111111", "#0866FF", "#F7A600", "#39594D", "#FF9900"];

// ---- 工具函数 ----
function getByPath(obj, field) {
  return field.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function mapVendorByCreator(creator) {
  const o = String(creator || "").toLowerCase();
  if (/anthropic/.test(o)) return "anthropic";
  if (/open\s?ai|gpt/.test(o)) return "openai";
  if (/google|deep\s?mind|gemini|^bard/.test(o)) return "google";
  if (/x\s?ai|grok/.test(o)) return "xai";
  if (/meta|facebook/.test(o)) return "meta";
  if (/mistral/.test(o)) return "mistral";
  if (/cohere/.test(o)) return "cohere";
  if (/amazon|aws/.test(o)) return "amazon";
  if (/deepseek/.test(o)) return "deepseek";
  if (/alibaba|qwen|tongyi/.test(o)) return "alibaba";
  if (/moonshot|kimi/.test(o)) return "moonshot";
  if (/z\.?ai|zhipu|glm/.test(o)) return "zhipu";
  if (/baidu|ernie|wenxin/.test(o)) return "baidu";
  if (/tencent|hunyuan/.test(o)) return "tencent";
  if (/bytedance|byte|doubao|seed/.test(o)) return "bytedance";
  if (/minimax/.test(o)) return "minimax";
  if (/zero\s?one|01\.ai|(^|\b)yi(\b|$)/.test(o)) return "yi";
  if (/baichuan/.test(o)) return "baichuan";
  if (/step/.test(o)) return "stepfun";
  if (/iflytek|讯飞|spark|xfyun/.test(o)) return "xunfei";
  if (/sense/.test(o)) return "sense";
  if (/xiaomi|mi\s?mo/.test(o)) return "xiaomi";
  if (/inclusion/.test(o)) return "inclusion";
  return null;
}

function vendorInfo(key) {
  const isCn = CN_VENDORS.has(key);
  const palette = isCn ? CN_COLOR : EN_COLOR;
  const idx = [...CN_VENDORS].indexOf(key);
  return {
    label: key.slice(0, 2).toUpperCase(),
    name: key,
    country: isCn ? "中国" : "海外",
    color: palette[idx >= 0 ? idx : 0],
    domain: "",
  };
}

const cleanName = (name) => String(name || "").trim().replace(/\s+/g, " ");
const num = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
const round1 = (v) => Math.round(v * 10) / 10;

function parseRow(it) {
  const vendor = mapVendorByCreator(it.creator);
  if (!vendor) return null;
  const score = num(it.displayScore);
  if (score <= 0) return null;
  const iv = it.scoreInterval90 || {};
  const detail = {
    "BenchAlign": round1(score),
    "置信区间": `${iv.lower ?? "-"}–${iv.upper ?? "-"}`,
    "证据状态": it.evidenceStatus || "-",
    "推理类型": it.reasoningType || "-",
    "上下文": it.contextWindow || "-",
  };
  return {
    vendor,
    name: cleanName(it.model),
    open: /open/i.test(it.sourceType || ""),
    lang: CN_VENDORS.has(vendor) ? "zh" : "en",
    released: "",
    scores: { low: round1(score), mid: round1(score), high: round1(score) },
    detail,
  };
}

const keyOf = (m) => String(m.vendor) + "|" + String(m.name);

function mergeInto(existing, additions) {
  const map = new Map(existing.map((m) => [keyOf(m), m]));
  let added = 0, updated = 0;
  for (const add of additions) {
    const k = keyOf(add);
    if (map.has(k)) {
      const cur = map.get(k);
      const merged = Object.assign({}, add.detail, cur.detail);
      let changed = false;
      if (add.released && !cur.released) { cur.released = add.released; changed = true; }
      if (JSON.stringify(merged) !== JSON.stringify(cur.detail)) { cur.detail = merged; changed = true; }
      if (changed) updated++;
      continue;
    }
    map.set(k, add);
    added++;
  }
  return { list: [...map.values()], added, updated };
}

// ---- Supabase 客户端（service_role：读快照 + 写落库）----
function supabase() {
  return createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
}

async function load() {
  const { data } = await supabase()
    .from("lb_data").select("payload").eq("id", 1).maybeSingle();
  if (data?.payload) return data.payload;
  return {
    TABS: TABS.map((t) => ({ id: t.id, label: t.label, icon: t.icon })),
    STRENGTHS, DEFAULT_STRENGTH, AXIS_RANGE, VENDORS: {}, LEADERBOARD: {},
  };
}

async function persist(payload) {
  const { error } = await supabase()
    .from("lb_data")
    .upsert({ id: 1, payload, generated_at: new Date().toISOString() }, { onConflict: "id" });
  if (error) throw new Error("写入 lb_data 失败: " + error.message);
}

// GET /config 等价
function configOf(payload) {
  return {
    tabs: (payload.TABS || []).map((t) => ({ id: t.id, label: t.label, icon: t.icon })),
    strengths: payload.STRENGTHS || [],
    defaultStrength: payload.DEFAULT_STRENGTH || "high",
    axis: payload.AXIS_RANGE || AXIS_RANGE,
    vendors: Object.fromEntries(
      Object.entries(payload.VENDORS || {}).map(([k, v]) => [k, { label: v.label, name: v.name, country: v.country, color: v.color, domain: v.domain }])
    ),
    generatedAt: new Date().toISOString(),
  };
}

// GET /leaderboard/:tab 等价
function tabOf(payload, tabId, search) {
  const data = (payload.LEADERBOARD || {})[tabId];
  if (!Array.isArray(data)) return { tabId, total: 0, strengths: payload.STRENGTHS || [], list: [] };
  const q = (search || "").trim().toLowerCase();
  let list = data;
  if (q) {
    list = data.filter((m) => {
      const ven = (payload.VENDORS || {})[m.vendor || ""];
      return (m.name || "").toLowerCase().includes(q) ||
        (ven && (ven.name || "").toLowerCase().includes(q)) ||
        (ven && (ven.label || "").toLowerCase().includes(q));
    });
  }
  const rows = list.map((m) => {
    const s = m.scores || {};
    const score = Math.max(s.low || 0, s.mid || 0, s.high || 0);
    const ven = (payload.VENDORS || {})[m.vendor || ""] || { label: "?", name: m.vendor, country: "", color: "#888", domain: "" };
    return {
      id: `${tabId}-${m.vendor}-${m.name}`, rank: 0, score,
      strengthId: "mid", strengthLabel: "综合", strengthEng: "BenchAlign",
      name: m.name, open: m.open, lang: m.lang, released: m.released,
      detail: m.detail,
      vendor: { key: m.vendor, label: ven.label, name: ven.name, country: ven.country, color: ven.color, domain: ven.domain },
    };
  });
  rows.sort((a, b) => b.score - a.score).forEach((r, i) => { r.rank = i + 1; });
  return { tabId, total: rows.length, strengths: payload.STRENGTHS || [], list: rows };
}

// POST /sync 等价：抓取 → 解析 → 合并 → 落库
async function sync(payload) {
  const res = await fetch(LEADERBOARD_URL, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${LEADERBOARD_URL}`);
  const lb = await res.json();
  const VEND = Object.assign({}, payload.VENDORS);
  const report = { fetchedAt: new Date().toISOString(), sources: [], addedTotal: 0, updatedTotal: 0 };
  for (const t of TABS) {
    const rows = getByPath(lb, t.source) || [];
    const additions = [];
    for (const it of rows) { const m = parseRow(it); if (m) additions.push(m); }
    for (const a of additions) { if (!VEND[a.vendor]) VEND[a.vendor] = vendorInfo(a.vendor); }
    const { list, added, updated } = mergeInto(payload.LEADERBOARD[t.id] || [], additions);
    payload.LEADERBOARD[t.id] = list;
    report.addedTotal += added; report.updatedTotal += updated;
    report.sources.push({ tab: t.id, ok: true, parsed: additions.length, added, updated, total: list.length });
  }
  payload.VENDORS = VEND;
  await persist(payload);
  return { ok: true, report };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url);
  const params = url.searchParams;

  if (params.has("sync") && req.method === "POST") {
    try {
      const p = await load();
      return json(await sync(p));
    } catch (e) {
      return json({ ok: false, error: "同步失败: " + e.message }, 500);
    }
  }

  let payload = await load();

  if (params.has("config")) return json(configOf(payload));

  const tabId = params.get("tab");
  if (tabId) {
    if (!Object.keys(payload.LEADERBOARD || {}).length) {
      try { await sync(payload); payload = await load(); }
      catch (e) {
        return json({ tabId, total: 0, strengths: payload.STRENGTHS || [], list: [], _warn: e.message });
      }
    }
    return json(tabOf(payload, tabId, params.get("search") || ""));
  }

  return json({ ok: true, endpoints: ["?config=1", "?tab=overall&search=x", "POST ?sync=1"] });
});
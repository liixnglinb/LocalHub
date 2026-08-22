/* ============================================================
   LocalHub · OpenRouter 免费模型 Supabase Edge Function
   ------------------------------------------------------------
   职责：抓取 OpenRouter 全量模型列表 → 筛选免费模型 → 写入 or_models 快照表
    - 定时（pg_cron，每天两次）调用 ?sync=1 完成抓取
    - 对外提供 GET 读取 & POST ?sync=1 立即同步
   调用方式（部署时 --verify-jwt=false，可匿名访问）
     GET  /openrouter-models            → 返回当前快照 payload
     POST /openrouter-models?sync=1     → 立即抓取一次（同定时任务）
   免费判定：pricing.prompt 与 pricing.completion 均为 0
   ============================================================ */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-or-sync-key",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const MODELS_URL = "https://openrouter.ai/api/v1/models";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  Accept: "application/json",
};

function supabase() {
  return createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
}

async function load() {
  const { data } = await supabase()
    .from("or_models").select("payload").eq("id", 1).maybeSingle();
  return data?.payload || null;
}

async function persist(payload) {
  const { error } = await supabase()
    .from("or_models")
    .upsert({ id: 1, payload, generated_at: new Date().toISOString() }, { onConflict: "id" });
  if (error) throw new Error("写入 or_models 失败: " + error.message);
}

const num = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };

async function sync() {
  const res = await fetch(MODELS_URL, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${MODELS_URL}`);
  const body = await res.json();
  const list = body?.data || [];

  const models = [];
  for (const m of list) {
    const p = m.pricing || {};
    const prompt = num(p.prompt);
    const completion = num(p.completion);
    const isFree = prompt === 0 && completion === 0;
    if (!isFree) continue;
    const id = String(m.id || "");
    const slash = id.indexOf("/");
    models.push({
      id,
      vendor: slash > 0 ? id.slice(0, slash) : id,
      name: String(m.name || id),
      context_length: m.context_length || 0,
      modality: m.architecture?.modality || "text->text",
      architectures: m.architecture || {},
      isFree,
      created: m.created || null,
    });
  }
  // 按厂商分桶后排序：名称分组，上下文降序，便于前端阅读
  models.sort((a, b) => {
    const vcmp = String(a.vendor).localeCompare(String(b.vendor));
    if (vcmp !== 0) return vcmp;
    return (b.context_length || 0) - (a.context_length || 0);
  });

  const payload = {
    fetched_at: new Date().toISOString(),
    total: models.length,
    source: MODELS_URL,
    models,
  };
  await persist(payload);
  return { ok: true, total: models.length, fetched_at: payload.fetched_at };
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

  if (url.searchParams.has("sync") && req.method === "POST") {
    try { return json(await sync()); }
    catch (e) { return json({ ok: false, error: "同步失败: " + e.message }, 500); }
  }

  const payload = await load();
  return json({ ok: true, data: payload });
});
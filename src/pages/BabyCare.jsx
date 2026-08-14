import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Milk, Droplets, Moon, Thermometer, Scale, Sun, HeartPulse, Frown,
  Baby, ClipboardPlus, BarChart3, Sparkles, History, Settings2, Zap,
  Clock, TrendingUp, Info, Trash2, X, Check,
} from 'lucide-react';
import DateTimePicker from '../components/DateTimePicker';
import TrendChart from '../components/TrendChart';

/* ================= 常量（还原自 release10 安装包） ================= */
const LS_KEY = 'baby-care';
const HOUR_MS = 36e5;

const TYPES = {
  milk:     { name: '喂奶', icon: Milk,        color: '#7C6FBF' },
  poop:     { name: '排便', icon: Droplets,    color: '#4CAF8A' },
  pee:      { name: '排尿', icon: Droplets,    color: '#4A90D9' },
  sleep:    { name: '睡眠', icon: Moon,        color: '#E0A458' },
  temp:     { name: '体温', icon: Thermometer, color: '#E06A6A' },
  weight:   { name: '体重', icon: Scale,       color: '#B88A5C' },
  jaundice: { name: '黄疸', icon: Sun,         color: '#D9C44A' },
  care:     { name: '护理', icon: HeartPulse,  color: '#8A8AD9' },
  cry:      { name: '哭闹', icon: Frown,       color: '#E08A6A' },
};

const DEFAULT_SETTINGS = { name: '宝宝', birth: '', weight: '', height: '' };

const SHAPE_MAP = { unknown: '不知道', normal: '正常', meconium: '胎便', gold: '金黄糊状', paste: '膏状', watery: '稀水样', hard: '干硬', egg: '蛋花汤' };
const COLOR_MAP = { unknown: '不知道', blackgreen: '黑绿', gold: '金黄', yellowgreen: '黄绿', green: '绿色', gray: '灰色', red: '红色' };

/* ================= 工具函数 ================= */
const pad = (n) => String(n).padStart(2, '0');

function isToday(s) {
  const t = new Date(s), e = new Date();
  return t.getFullYear() === e.getFullYear() && t.getMonth() === e.getMonth() && t.getDate() === e.getDate();
}
function withinDays(s, t) {
  return new Date(s).getTime() >= Date.now() - t * 864e5;
}
function ageDaysPlus(s) {
  return s ? Math.floor((Date.now() - new Date(s).getTime()) / 864e5) + 1 : 0;
}
function median(arr) {
  if (!arr.length) return null;
  const t = [...arr].sort((a, b) => a - b), e = Math.floor(t.length / 2);
  return t.length % 2 ? t[e] : (t[e - 1] + t[e]) / 2;
}
function mad(arr) {
  const t = median(arr);
  if (t == null) return 0;
  const e = arr.slice().map((i) => Math.abs(i - t)).sort((a, b) => a - b);
  return median(e) || 0;
}
function ewma(arr, t) {
  if (!arr.length) return null;
  let e = +arr[0];
  for (let i = 1; i < arr.length; i++) e = t * +arr[i] + (1 - t) * e;
  return e;
}
function isDay(s) {
  const t = new Date(s).getHours();
  return t >= 6 && t < 22;
}
function intervals(records, type) {
  const e = records.filter((a) => a.type === type).map((a) => new Date(a.time).getTime()).sort((a, b) => a - b);
  const i = [], n = [], o = [];
  for (let a = 1; a < e.length; a++) {
    const r = e[a] - e[a - 1];
    o.push(r), (isDay(e[a]) ? i : n).push(r);
  }
  return { day: i, night: n, all: o };
}
function predictInterval(records, type, ts) {
  const i = intervals(records, type), n = isDay(ts) ? i.day : i.night;
  const o = n.length >= 2 ? n : i.all.length >= 2 ? i.all : n.length ? n : i.all;
  let a = ewma(o.slice(-4), 0.5);
  if (a == null && (a = ewma(i.all, 0.5)), a == null) return null;
  const r = type === 'pee' || type === 'poop';
  const l = Math.max(mad(o) || 0, r ? 2 * HOUR_MS : 6 * HOUR_MS);
  const c = r ? 4 * HOUR_MS : 8 * HOUR_MS;
  const h = r ? 12 * HOUR_MS : 36 * HOUR_MS;
  const u = Math.min(Math.max(1.5 * l, c), h);
  return { gap: a, lo: Math.max(30 * 6e4, a - u), hi: a + u };
}
function ageDays(s) {
  return s ? Math.floor((Date.now() - new Date(s).getTime()) / 864e5) : null;
}
function refTable(days) {
  const t = days ?? 30;
  let e, i, n, o, a;
  if (t <= 28) { e = [2, 3.5]; i = [2, 10]; n = [6, 10]; o = [15, 18]; a = [60, 120]; }
  else if (t <= 60) { e = [2.5, 4]; i = [1, 6]; n = [6, 10]; o = [14, 17]; a = [45, 120]; }
  else if (t <= 120) { e = [3, 4.5]; i = [1, 4]; n = [6, 10]; o = [13, 16]; a = [20, 80]; }
  else if (t <= 180) { e = [3, 4.5]; i = [1, 3]; n = [6, 9]; o = [12, 15]; a = [15, 60]; }
  else { e = [3.5, 5]; i = [0.5, 3]; n = [6, 9]; o = [11, 14]; a = [10, 40]; }
  return { milkGap: e, milkCount: [Math.round(24 / e[1]), Math.round(24 / e[0])], poop: i, pee: n, sleep: o, cry: a };
}
function weightFactor(w) {
  const t = +(w || 0);
  if (!t || t <= 0) return 1;
  let e;
  if (t < 2500) { e = 0.6 + (t - 1500) / 1e3 * 0.25; e = t <= 1500 ? 0.6 : e; }
  else if (t <= 4000) { e = 0.9 + (t - 2500) / 1500 * 0.1; }
  else { e = 1 + (t - 4000) / 1e3 * 0.15; e = Math.min(e, 1.15); }
  return Math.max(0.6, Math.min(1.15, e));
}
function sleepWindows(records) {
  const t = records.filter((f) => f.type === 'sleep' && withinDays(f.time, 7));
  if (!t.length) return null;
  const e = {}, i = {};
  t.forEach((f) => {
    const x = new Date(f.time), p = +f.duration || 0;
    if (p <= 0) return;
    i[x.toDateString()] = 1;
    const g = x.getHours() + x.getMinutes() / 60;
    for (let m = 0; m < Math.ceil(p * 2); m++) {
      const b = Math.floor(((g + m * 0.5) % 24 + 24) % 24);
      e[b] = (e[b] || 0) + 1;
    }
  });
  const n = Object.keys(i).length || 1, o = Math.max(1, Math.round(n * 0.5)), a = [];
  for (let f = 0; f < 24; f++) a[f] = (e[f] || 0) >= o;
  let r = [], l = null;
  for (let f = 0; f < 24; f++) a[f] ? l ? l.e = f : l = { s: f, e: f } : l && (r.push(l), l = null);
  if (l && r.push(l), !r.length) return null;
  const c = r[0], h = r[r.length - 1];
  if (c.s === 0 && h.e === 23 && (r = [{ s: h.s, e: c.e, isCross: true }].concat(r.slice(1, r.length - 1))));
  r = r.filter((f) => (f.isCross ? f.e + 24 - f.s + 1 : f.e - f.s + 1) >= 2);
  if (!r.length) return null;
  const u = (f) => (f = (f % 24 + 24) % 24, pad(f) + ':00');
  return r.map((f) => f.isCross ? `${u(f.s)}-次日${u(f.e + 1)}` : `${u(f.s)}-${u(f.e + 1)}`).join(' · ');
}
function predict(records, settings) {
  const e = [];
  const i = settings.birth;
  const n = records.filter((p) => p.type === 'milk').map((p) => new Date(p.time).getTime()).sort((p, g) => g - p);
  if (n.length >= 2) {
    const p = predictInterval(records, 'milk', n[0]);
    if (p) {
      const g = weightFactor(settings.weight), m = refTable(ageDays(i)).milkGap;
      const b = m[0] * HOUR_MS / g, w = m[1] * HOUR_MS / g;
      const j = Math.max(b, Math.min(p.lo / g, w)), S = Math.min(w, Math.max(p.hi / g, b));
      const v = new Date(n[0] + j), T = new Date(n[0] + S);
      const _ = g >= 0.9 && g <= 1 ? '' : `（体重${settings.weight} g，间隔${Math.round(g * 100)}%）`;
      e.push({ n: '下次喂奶', s: '昼夜加权 EWMA + 月龄区间 + 出生体重' + _, v: formatRange(v.getTime(), T.getTime()), lv: 'ok' });
    }
  }
  const o = records.filter((p) => p.type === 'pee').map((p) => new Date(p.time).getTime()).sort((p, g) => g - p);
  if (o.length) {
    const p = predictInterval(records, 'pee', o[0]);
    if (p) {
      const g = new Date(o[0] + p.lo), m = new Date(o[0] + p.hi);
      e.push({ n: '下次排尿', s: '排尿间隔 EWMA 估算', v: formatRange(g.getTime(), m.getTime()), lv: 'ok' });
    }
  }
  const r = records.filter((p) => p.type === 'poop').map((p) => new Date(p.time).getTime()).sort((p, g) => g - p)[0];
  if (r !== undefined) {
    const p = ageDaysPlus(i), g = p <= 7 ? 12 : p <= 28 ? 24 : 48;
    const m = (Date.now() - r) / HOUR_MS, b = predictInterval(records, 'poop', r);
    if (b) {
      const w = new Date(r + b.lo), j = new Date(r + b.hi);
      e.push({ n: '下次排便', s: '间隔 EWMA 估算', v: formatRange(w.getTime(), j.getTime()), lv: 'ok' });
    }
    m > g && e.push({ n: '排便预警', s: `已 ${m.toFixed(0)} 小时未排便（${p}天阈值 ${g}h）`, tag: m > g * 2 ? '尽快就医' : '请关注', lv: m > g * 2 ? 'danger' : 'warn' });
  }
  const l = sleepWindows(records);
  l && e.push({ n: '建议睡眠时段', s: '近7天规律性睡眠窗口', v: l, lv: 'ok' });
  const c = {};
  records.filter((p) => p.type === 'milk' && p.amount).forEach((p) => {
    const g = new Date(p.time).toDateString();
    c[g] = (c[g] || 0) + +p.amount;
  });
  const h = Object.values(c).sort((p, g) => p - g), u = c[new Date().toDateString()] || 0;
  if (h.length >= 3) {
    const p = ewma(h.slice(-7), 0.5);
    u > 0 && u < (p || 0) * 0.7 && e.push({ n: '奶量预警', s: `今日 ${u}ml < 均值 ${Math.round(p)}ml 的70%`, tag: '📉', lv: 'warn' });
  }
  const f = records.filter((p) => p.type === 'temp').map((p) => ({ t: new Date(p.time).getTime(), v: +p.value })).sort((p, g) => g.t - p.t)[0];
  if (f) {
    const p = f.v;
    p >= 38 ? e.push({ n: '体温预警', s: `体温 ${p}℃，已超38℃`, tag: '尽快就医', lv: 'danger' }) : p >= 37.5 && e.push({ n: '体温预警', s: `体温 ${p}℃，接近发热`, tag: '关注', lv: 'warn' });
  }
  const x = records.filter((p) => p.type === 'pee' && new Date(p.time).getTime() >= Date.now() - 864e5).length;
  i && x < 6 && e.push({ n: '排尿预警', s: `24h仅 ${x || 0} 次（<6次可能脱水）`, tag: '关注', lv: 'warn' });
  return e;
}
function summarize(s) {
  switch (s.type) {
    case 'milk': return `${({ breast: '亲喂', bottle: '瓶喂', formula: '配方' }[s.kind] || '')} ${s.amount ? s.amount + 'ml' : ''}`.trim();
    case 'poop': return `${SHAPE_MAP[s.shape] || ''} ${COLOR_MAP[s.color] || ''} ${s.abnormal && s.abnormal.length ? '⚠️' + s.abnormal.join('、') : ''}`.trim();
    case 'pee': return `${s.amount || ''} ${s.color || ''}`.trim();
    case 'sleep': return `${s.duration || 0} 小时${s.quality ? ' · ' + s.quality : ''}`;
    case 'temp': return `${s.value}℃ (${s.site || '腋温'})`;
    case 'weight': return `${s.value} kg`;
    case 'jaundice': return `${s.value} mg/dL (${s.site || '额头'})`;
    case 'care': return `${({ cord: '脐带', touch: '抚触', bath: '洗澡', medicine: '用药', event: '异常事件' }[s.careType] || '')} ${s.detail || ''}`.trim();
    case 'cry': return `${s.duration || 0} 分钟${s.level ? ' · ' + s.level : ''}${s.cause && s.cause.length ? ' (' + s.cause.join('、') + ')' : ''}`;
    default: return '';
  }
}
function toggle(arr, item) {
  const e = arr || [];
  return e.includes(item) ? e.filter((i) => i !== item) : [...e, item];
}
function formatTime(s) {
  const t = new Date(s);
  return `${pad(t.getHours())}:${pad(t.getMinutes())}`;
}
function formatDateTime(s) {
  const t = new Date(s);
  return `${t.getMonth() + 1}/${t.getDate()} ${pad(t.getHours())}:${pad(t.getMinutes())}`;
}
function formatRange(from, to) {
  const e = new Date(from), i = new Date(to);
  return e.toDateString() !== i.toDateString()
    ? `${formatTime(e.toISOString())}-次日${formatTime(i.toISOString())}`
    : `${formatTime(e.toISOString())}-${formatTime(i.toISOString())}`;
}
function nowISO() {
  const s = new Date();
  return `${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(s.getDate())}T${pad(s.getHours())}:${pad(s.getMinutes())}`;
}

/* ================= 小组件 ================= */
function SectionHeader({ icon: Icon, title, right, accent }) {
  return (
    <div className="mb-3.5 flex items-center justify-between gap-3">
      <h3 className="flex items-center gap-2 text-[13px] font-semibold text-white/85">
        <span className="flex h-[22px] w-[22px] items-center justify-center rounded-[7px]"
              style={{ background: `${accent || 'var(--accent)'}1A`, color: accent || 'var(--accent)' }}>
          <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
        </span>
        {title}
      </h3>
      {right}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px] text-white/55 font-medium">{label}</label>
      {children}
    </div>
  );
}

/* ================= 快捷记录弹窗 ================= */
function QuickModal({ type, onClose, onSave, settings }) {
  const [time, setTime] = useState(nowISO());
  const [kind, setKind] = useState('breast');
  const [amount, setAmount] = useState('');
  const [shape, setShape] = useState('normal');
  const [abnormal, setAbnormal] = useState(new Set());
  const [uamount, setUamount] = useState('正常');
  const [color, setColor] = useState('正常');
  const info = TYPES[type];

  const submit = () => {
    const _ = { id: Date.now(), type, time: new Date(time).toISOString() };
    if (type === 'milk') { _.kind = kind; _.amount = amount; _.weight = settings.weight || null; }
    if (type === 'poop') { _.shape = shape; _.abnormal = [...abnormal].filter((D) => D !== '正常'); _.color = 'gold'; }
    if (type === 'pee') { _.amount = uamount; _.color = color; }
    if (type === 'sleep') { _.duration = amount; }
    onSave(_);
  };

  const onToggle = (item) => setAbnormal((D) => {
    const k = new Set(D);
    if (item === '正常') return new Set();
    k.has(item) ? k.delete(item) : k.add(item);
    return k;
  });

  const chip = (active) => `px-3 py-1.5 rounded-full text-[12px] font-medium border cursor-pointer transition-all ${
    active ? 'bg-white/[0.12] text-white border-white/20' : 'bg-white/[0.04] text-white/60 border-white/10 hover:bg-white/[0.08]'
  }`;
  const labelCls = 'mb-1.5 block text-[12px] text-white/55 font-medium';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card mx-4 w-full max-w-md p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-[9px]"
                  style={{ background: `${info.color}22`, color: info.color }}>
              <info.icon className="h-4 w-4" strokeWidth={1.8} />
            </span>
            <h2 className="text-[15px] font-semibold">{info.name}记录</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <Field label="时间">
            <DateTimePicker value={time} onChange={setTime} />
          </Field>

          {type === 'milk' && (
            <>
              <Field label="喂养方式">
                <div className="flex gap-2 flex-wrap">
                  {[['breast', '亲喂母乳'], ['bottle', '瓶喂母乳'], ['formula', '配方奶粉']].map(([v, l]) => (
                    <button key={v} onClick={() => setKind(v)} className={chip(kind === v)}>{l}</button>
                  ))}
                </div>
              </Field>
              <Field label="奶量 (ml)">
                <input type="number" placeholder="自动预测" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full no-spin" min="0" />
              </Field>
            </>
          )}

          {type === 'poop' && (
            <>
              <Field label="性状">
                <div className="flex gap-2 flex-wrap">
                  {[['normal', '正常'], ['meconium', '胎便'], ['gold', '金黄糊状'], ['paste', '膏状'], ['watery', '稀水样'], ['hard', '干硬']].map(([v, l]) => (
                    <button key={v} onClick={() => setShape(v)} className={chip(shape === v)}>{l}</button>
                  ))}
                </div>
              </Field>
              <Field label="异常">
                <div className="flex gap-2 flex-wrap">
                  {['正常', '带血丝', '带粘液', '泡沫多'].map((v) => (
                    <button key={v} onClick={() => onToggle(v)} className={chip(abnormal.has(v))}>{v}</button>
                  ))}
                </div>
              </Field>
            </>
          )}

          {type === 'pee' && (
            <>
              <Field label="尿量">
                <div className="flex gap-2 flex-wrap">
                  {['正常', '少量', '中等', '大量'].map((v) => (
                    <button key={v} onClick={() => setUamount(v)} className={chip(uamount === v)}>{v}</button>
                  ))}
                </div>
              </Field>
              <Field label="颜色">
                <div className="flex gap-2 flex-wrap">
                  {['正常', '清亮', '深黄', '偏红'].map((v) => (
                    <button key={v} onClick={() => setColor(v)} className={chip(color === v)}>{v}</button>
                  ))}
                </div>
              </Field>
            </>
          )}

          {type === 'sleep' && (
            <Field label="睡眠时长 (小时)">
              <input type="number" placeholder="1" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full no-spin" min="0" step="0.5" />
            </Field>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button onClick={onClose} className="btn btn-default">取消</button>
          <button onClick={submit} className="btn btn-primary"><Check className="h-4 w-4" />保存</button>
        </div>
      </div>
    </div>
  );
}

/* ================= 添加记录页 ================= */
function RecordPage({ records, settings, onAdd }) {
  const [type, setType] = useState('milk');
  const [form, setForm] = useState({});
  const [careType, setCareType] = useState('cord');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const chip = (active) => `px-3 py-1.5 rounded-full text-[12px] font-medium border cursor-pointer transition-all ${
    active ? 'bg-white/[0.12] text-white border-white/20' : 'bg-white/[0.04] text-white/60 border-white/10 hover:bg-white/[0.08]'
  }`;
  const typeKeys = Object.keys(TYPES);
  const now = nowISO();

  const submit = () => {
    const g = form.time || now;
    const m = { id: Date.now(), type, time: new Date(g).toISOString() };
    if (type === 'milk') { m.kind = form.kind || 'breast'; m.amount = form.amount; m.weight = settings.weight || null; }
    if (type === 'poop') { m.shape = form.shape || 'normal'; m.color = form.color || 'gold'; m.abnormal = (form.abnormal || []).filter((b) => b !== '正常'); }
    if (type === 'pee') { m.amount = form.uamount || '正常'; m.color = form.color || '正常'; }
    if (type === 'sleep') { m.duration = form.duration; m.quality = form.quality; }
    if (type === 'temp') { m.value = form.value; m.site = form.site; }
    if (type === 'weight') { m.value = form.value; }
    if (type === 'jaundice') { m.value = form.value; m.site = form.site; }
    if (type === 'care') { m.careType = careType; m.detail = form.detail; m.duration = form.duration; }
    if (type === 'cry') { m.duration = form.duration; m.level = form.level; m.soothe = form.soothe; m.cause = (form.cause || []).filter((b) => b !== '正常'); }
    m.note = form.note;
    onAdd(m);
    setForm({});
  };

  const typeTab = (key) => {
    const Icon = TYPES[key].icon;
    const active = type === key;
    return (
      <button
        key={key}
        onClick={() => setType(key)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-[9px] text-[12.5px] font-medium transition-all ${active ? 'text-white' : 'text-white/55 hover:text-white/80'}`}
        style={active ? { background: 'var(--sel)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' } : {}}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={1.7} style={{ color: active ? TYPES[key].color : undefined }} />
        {TYPES[key].name}
      </button>
    );
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="inline-flex p-1 rounded-[10px] gap-1 flex-wrap" style={{ background: 'rgba(255,255,255,0.045)', border: '1px solid var(--line)' }}>
        {typeKeys.map(typeTab)}
      </div>

      <div className="glass p-6 max-w-2xl">
        <SectionHeader icon={TYPES[type].icon} title={`记录${TYPES[type].name}`} accent={TYPES[type].color} />
        <div className="space-y-4">
          <Field label="时间">
            <DateTimePicker value={form.time || now} onChange={(v) => set('time', v)} width="14rem" />
          </Field>

          {type === 'milk' && (
            <>
              <Field label="喂养方式">
                <div className="flex gap-2 flex-wrap">
                  {[['breast', '亲喂母乳'], ['bottle', '瓶喂母乳'], ['formula', '配方奶粉']].map(([v, l]) => (
                    <button key={v} onClick={() => set('kind', v)} className={chip(form.kind === v)}>{l}</button>
                  ))}
                </div>
              </Field>
              <Field label="奶量 (ml)">
                <input type="number" value={form.amount || ''} onChange={(e) => set('amount', e.target.value)} placeholder="自动预测" className="w-full no-spin" min="0" />
              </Field>
            </>
          )}

          {type === 'poop' && (
            <>
              <Field label="性状">
                <div className="flex gap-2 flex-wrap">
                  {[['normal', '正常'], ['unknown', '不知道'], ['meconium', '胎便'], ['gold', '金黄糊状'], ['paste', '膏状'], ['watery', '稀水样'], ['hard', '干硬'], ['egg', '蛋花汤']].map(([v, l]) => (
                    <button key={v} onClick={() => set('shape', v)} className={chip(form.shape === v)}>{l}</button>
                  ))}
                </div>
              </Field>
              <Field label="颜色">
                <div className="flex gap-2 flex-wrap">
                  {[['gold', '金黄'], ['blackgreen', '黑绿'], ['yellowgreen', '黄绿'], ['green', '绿色'], ['gray', '灰色'], ['red', '红色'], ['unknown', '不知道']].map(([v, l]) => (
                    <button key={v} onClick={() => set('color', v)} className={chip(form.color === v)}>{l}</button>
                  ))}
                </div>
              </Field>
              <Field label="异常标记">
                <div className="flex gap-2 flex-wrap">
                  {['正常', '带血丝', '带粘液', '泡沫多', '奶瓣多'].map((v) => (
                    <button key={v} onClick={() => set('abnormal', toggle(form.abnormal, v))} className={chip((form.abnormal || []).includes(v))}>{v}</button>
                  ))}
                </div>
              </Field>
            </>
          )}

          {type === 'pee' && (
            <>
              <Field label="尿量">
                <div className="flex gap-2 flex-wrap">
                  {['正常', '少量', '中等', '大量'].map((v) => (
                    <button key={v} onClick={() => set('uamount', v)} className={chip(form.uamount === v)}>{v}</button>
                  ))}
                </div>
              </Field>
              <Field label="颜色">
                <div className="flex gap-2 flex-wrap">
                  {['正常', '清亮', '深黄', '偏红'].map((v) => (
                    <button key={v} onClick={() => set('color', v)} className={chip(form.color === v)}>{v}</button>
                  ))}
                </div>
              </Field>
            </>
          )}

          {type === 'sleep' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="开始时间（选填）"><DateTimePicker value={form.time || ''} onChange={(v) => set('time', v)} /></Field>
                <Field label="结束时间（选填）"><DateTimePicker value={form.endTime || ''} onChange={(v) => set('endTime', v)} /></Field>
              </div>
              <Field label="睡眠时长 (小时)">
                <input type="number" value={form.duration || ''} onChange={(e) => set('duration', e.target.value)} placeholder="自动计算" className="w-full no-spin" min="0" step="0.5" />
              </Field>
              <Field label="睡眠质量">
                <div className="flex gap-2 flex-wrap">
                  {['安稳', '易醒', '哭闹'].map((v) => (
                    <button key={v} onClick={() => set('quality', v)} className={chip(form.quality === v)}>{v}</button>
                  ))}
                </div>
              </Field>
            </>
          )}

          {type === 'temp' && (
            <>
              <Field label="体温 (℃)"><input type="number" value={form.value || ''} onChange={(e) => set('value', e.target.value)} placeholder="36.5" className="w-full no-spin" min="33" max="43" step="0.1" /></Field>
              <Field label="测量部位">
                <div className="flex gap-2 flex-wrap">
                  {['腋温', '额温', '肛温'].map((v) => (
                    <button key={v} onClick={() => set('site', v)} className={chip(form.site === v)}>{v}</button>
                  ))}
                </div>
              </Field>
            </>
          )}

          {type === 'weight' && (
            <Field label="体重 (kg)"><input type="number" value={form.value || ''} onChange={(e) => set('value', e.target.value)} placeholder="3.20" className="w-full no-spin" min="0" step="0.01" /></Field>
          )}

          {type === 'jaundice' && (
            <>
              <Field label="经皮黄疸值 (mg/dL)"><input type="number" value={form.value || ''} onChange={(e) => set('value', e.target.value)} placeholder="8.0" className="w-full no-spin" min="0" step="0.1" /></Field>
              <Field label="测量部位">
                <div className="flex gap-2 flex-wrap">
                  {['额头', '胸部', '腹部', '腿部'].map((v) => (
                    <button key={v} onClick={() => set('site', v)} className={chip(form.site === v)}>{v}</button>
                  ))}
                </div>
              </Field>
            </>
          )}

          {type === 'care' && (
            <>
              <Field label="护理类型">
                <div className="flex gap-2 flex-wrap">
                  {[['cord', '脐带护理'], ['touch', '抚触/排气操'], ['bath', '洗澡'], ['medicine', '用药'], ['event', '异常事件']].map(([v, l]) => (
                    <button key={v} onClick={() => setCareType(v)} className={chip(careType === v)}>{l}</button>
                  ))}
                </div>
              </Field>
              <Field label="时长 (分钟)"><input type="number" value={form.duration || ''} onChange={(e) => set('duration', e.target.value)} className="w-full no-spin" min="0" /></Field>
              <Field label="详情"><input type="text" value={form.detail || ''} onChange={(e) => set('detail', e.target.value)} placeholder="如：脐部干燥无异常" className="w-full" /></Field>
            </>
          )}

          {type === 'cry' && (
            <>
              <Field label="哭闹时长 (分钟)"><input type="number" value={form.duration || ''} onChange={(e) => set('duration', e.target.value)} className="w-full no-spin" min="0" /></Field>
              <Field label="可能原因">
                <div className="flex gap-2 flex-wrap">
                  {['饿了', '尿湿', '肠胀气', '困倦', '要抱抱', '不明原因'].map((v) => (
                    <button key={v} onClick={() => set('cause', toggle(form.cause, v))} className={chip((form.cause || []).includes(v))}>{v}</button>
                  ))}
                </div>
              </Field>
              <Field label="程度">
                <div className="flex gap-2 flex-wrap">
                  {['轻度', '中等', '剧烈'].map((v) => (
                    <button key={v} onClick={() => set('level', v)} className={chip(form.level === v)}>{v}</button>
                  ))}
                </div>
              </Field>
              <Field label="安抚方式">
                <div className="flex gap-2 flex-wrap">
                  {['喂奶', '拍嗝', '抱哄', '萝卜蹲', '白噪音'].map((v) => (
                    <button key={v} onClick={() => set('soothe', v)} className={chip(form.soothe === v)}>{v}</button>
                  ))}
                </div>
              </Field>
            </>
          )}

          <Field label="备注"><input type="text" value={form.note || ''} onChange={(e) => set('note', e.target.value)} placeholder="备注" className="w-full" /></Field>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2 border-t border-white/[0.06] pt-4">
          <button onClick={submit} className="btn btn-primary"><Check className="h-4 w-4" />保存记录</button>
        </div>
      </div>
    </div>
  );
}

/* ================= 主页面 ================= */
export default function BabyCare() {
  const [page, setPage] = useState('home');
  const [records, setRecords] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState(null);
  const [quickType, setQuickType] = useState(null);
  const [activeForm, setActiveForm] = useState('');
  const [historyType, setHistoryType] = useState('');
  const [historyFrom, setHistoryFrom] = useState('');
  const [historyTo, setHistoryTo] = useState('');
  const toastRef = useRef(null);

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 1800);
  };

  useEffect(() => {
    window.electronAPI?.loadData(LS_KEY)
      .then((M) => {
        if (!M) return;
        if (Array.isArray(M.records)) setRecords(M.records);
        if (M.settings) setSettings({ ...DEFAULT_SETTINGS, ...M.settings });
      })
      .catch((M) => console.warn('load baby-care failed:', M))
      .finally(() => setLoaded(true));
  }, []);

  const save = useCallback((rec, set) => {
    if (rec) setRecords(rec);
    if (set) setSettings(set);
    window.electronAPI?.saveData(LS_KEY, { records: rec ?? records, settings: set ?? settings });
  }, [records, settings]);

  const addRecord = (rec) => {
    const M = [...records, rec];
    save(M);
    setQuickType(null);
    showToast('已保存');
  };
  const removeRecord = (id) => {
    const M = records.filter((A) => A.id !== id);
    save(M);
    showToast('已删除');
  };
  const saveSettings = () => {
    save(null, settings);
    showToast('设置已保存');
  };

  const today = useMemo(() => records.filter((r) => isToday(r.time)), [records]);
  const predictions = useMemo(() => predict(records, settings), [records, settings]);

  const kMilk = today.filter((r) => r.type === 'milk');
  const kPoop = today.filter((r) => r.type === 'poop');
  const kPee = today.filter((r) => r.type === 'pee');
  const kSleep = today.filter((r) => r.type === 'sleep');
  const sleepTotal = kSleep.reduce((s, r) => s + (+r.duration || 0), 0);
  const nightSleep = kSleep.filter((r) => !isDay(r.time)).reduce((s, r) => s + (+r.duration || 0), 0);

  /* KPI 卡片（渐变卡） */
  const KpiCard = ({ type, label, value, sub, color, onClick }) => {
    const Icon = TYPES[type].icon;
    return (
      <button
        onClick={onClick}
        className="relative overflow-hidden text-left w-full rounded-2xl border p-4 transition-all duration-300 group hover:-translate-y-1"
        style={{
          background: `linear-gradient(160deg, ${color}1F 0%, ${color}0D 45%, rgba(18,18,20,0.72) 100%)`,
          borderColor: 'rgba(255,255,255,0.10)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 24px -12px rgba(0,0,0,0.7)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = `${color}55`;
          e.currentTarget.style.boxShadow = `inset 0 1px 0 rgba(255,255,255,0.08), 0 16px 36px -14px ${color}44`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)';
          e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 24px -12px rgba(0,0,0,0.7)';
        }}
      >
        <span className="absolute -right-3 -top-3 h-16 w-16 rounded-full opacity-30 blur-2xl transition-opacity duration-300 group-hover:opacity-50" style={{ background: color }} />
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
               style={{ background: `linear-gradient(150deg, ${color}33, ${color}14)`, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.12), 0 4px 12px -4px ${color}55` }}>
            <Icon className="h-5 w-5" strokeWidth={1.8} style={{ color }} />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-white/45">{label}</div>
            <div className="text-2xl font-bold tabular-nums leading-tight" style={{ color }}>{value}</div>
            <div className="text-[11px] text-white/40 truncate">{sub}</div>
          </div>
        </div>
      </button>
    );
  };

  const TABS = [
    { id: 'home',     label: '今日首页', icon: Baby },
    { id: 'record',   label: '添加记录', icon: ClipboardPlus },
    { id: 'trend',    label: '趋势统计', icon: BarChart3 },
    { id: 'predict',  label: '预测提醒', icon: Sparkles },
    { id: 'history',  label: '历史记录', icon: History },
    { id: 'settings', label: '系统设置', icon: Settings2 },
  ];

  const milkTrend = useMemo(() => {
    const y = {};
    for (let M = 6; M >= 0; M--) {
      const A = new Date(); A.setDate(A.getDate() - M); y[A.toDateString()] = 0;
    }
    records.filter((M) => M.type === 'milk').forEach((M) => {
      const A = new Date(M.time);
      y[A.toDateString()] !== undefined && (y[A.toDateString()] += +(M.amount || 0));
    });
    return Object.values(y);
  }, [records]);

  const typeCountTrend = (type) => {
    const M = {};
    for (let A = 6; A >= 0; A--) {
      const kt = new Date(); kt.setDate(kt.getDate() - A); M[kt.toDateString()] = 0;
    }
    records.filter((A) => A.type === type).forEach((A) => {
      const kt = new Date(A.time);
      M[kt.toDateString()] !== undefined && (M[kt.toDateString()] += 1);
    });
    return Object.values(M);
  };

  const sleepTrend = useMemo(() => {
    const y = {};
    for (let M = 6; M >= 0; M--) {
      const A = new Date(); A.setDate(A.getDate() - M); y[A.toDateString()] = 0;
    }
    records.filter((M) => M.type === 'sleep').forEach((M) => {
      const A = new Date(M.time);
      y[A.toDateString()] !== undefined && (y[A.toDateString()] += +M.duration || 0);
    });
    return Object.values(y);
  }, [records]);

  const historyList = useMemo(() => {
    let list = [...records].sort((M, A) => new Date(A.time) - new Date(M.time));
    if (historyFrom) {
      const M = new Date(historyFrom);
      list = list.filter((A) => new Date(A.time) >= M);
    }
    if (historyTo) {
      const M = new Date(historyTo);
      M.setDate(M.getDate() + 1);
      list = list.filter((A) => new Date(A.time) < M);
    }
    return historyType ? list.filter((M) => M.type === historyType) : list;
  }, [records, historyFrom, historyTo, historyType]);

  const timeline = useMemo(() => today.slice().sort((y, M) => new Date(y.time) - new Date(M.time)), [today]);
  const ref = useMemo(() => (settings.birth ? refTable(ageDays(settings.birth)) : null), [settings.birth]);

  /* 预测条目渲染：有 v 显示值，否则 tag 徽章 */
  const renderPredItem = (y) => y.v
    ? <span className="text-[13px] font-medium text-white/90 tabular-nums">{y.v}</span>
    : <span className={`px-2 py-0.5 rounded-full text-[11px] ${y.lv === 'danger' ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'}`}>{y.tag}</span>;

  const PredRow = (y, M) => (
    <div key={y.n} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.05] hover:border-white/[0.14] transition-all">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[13px] font-semibold">
          {y.n}
          {y.lv === 'danger' && <span className="status-dot err" />}
          {y.lv === 'warn' && <span className="status-dot warn" />}
        </div>
        <div className="text-[11px] text-white/45 truncate">{y.s}</div>
      </div>
      {M(y)}
    </div>
  );

  return (
    <div className="space-y-5 pb-10">
      {/* ===== Hero ===== */}
      <section className="glass-static p-5 animate-slide-up">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-[12px] flex items-center justify-center shrink-0"
                 style={{ background: 'linear-gradient(150deg, rgba(34,195,214,0.16), rgba(34,195,214,0.05))', border: '1px solid rgba(34,195,214,0.22)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 6px 18px -8px rgba(34,195,214,0.5)' }}>
              <Baby className="h-5 w-5" strokeWidth={1.7} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="title-display text-[22px] tracking-tight">宝宝护理</h1>
                <span className="chip" style={{ color: 'var(--accent)', borderColor: 'rgba(34,195,214,0.3)', background: 'rgba(34,195,214,0.08)' }}>婴儿养护</span>
              </div>
              <p className="mt-1 text-white/50 text-[12.5px]">
                {settings.name || '宝宝'} · 出生第 <b className="text-white/85 tabular-nums font-semibold">{ageDaysPlus(settings.birth)}</b> 天
                {settings.birth ? ` · ${Math.floor(ageDays(settings.birth) / 30.44)} 个月` : ''}
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <div className="glass-inset px-3 py-1.5 flex items-center gap-1.5">
              <span className="text-[10px] text-white/40">今日记录</span>
              <span className="text-[13px] font-semibold tabular-nums text-white/85">{today.length}</span>
            </div>
            <div className="glass-inset px-3 py-1.5 flex items-center gap-1.5">
              <span className="text-[10px] text-white/40">今日睡眠</span>
              <span className="text-[13px] font-semibold tabular-nums text-white/85">{sleepTotal.toFixed(1)}h</span>
            </div>
            <div className="glass-inset px-3 py-1.5 flex items-center gap-1.5">
              <span className="text-[10px] text-white/40">今日奶量</span>
              <span className="text-[13px] font-semibold tabular-nums text-white/85">{kMilk.reduce((y, M) => y + (+M.amount || 0), 0)}ml</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Tab 导航 ===== */}
      <div className="inline-flex p-1 rounded-[10px] gap-1 animate-slide-up flex-wrap" style={{ background: 'rgba(255,255,255,0.045)', border: '1px solid var(--line)', backdropFilter: 'blur(8px)' }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setPage(id)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-[8px] text-[12.5px] font-medium transition-all ${page === id ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
            style={page === id ? { background: 'var(--sel)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' } : {}}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={1.6} style={{ color: page === id ? 'var(--accent)' : undefined }} />
            {label}
          </button>
        ))}
      </div>

      {/* ===== 今日首页 ===== */}
      {page === 'home' && (
        <div className="space-y-5 animate-fade-in">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard type="milk"  label="今日喂奶" value={`${kMilk.length} 次`} sub={`共 ${kMilk.reduce((y, M) => y + (+M.amount || 0), 0)}ml`} color={TYPES.milk.color} onClick={() => setQuickType('milk')} />
            <KpiCard type="poop"  label="今日排便" value={`${kPoop.length} 次`} sub={kPoop.length ? summarize(kPoop[kPoop.length - 1]) : '—'} color={TYPES.poop.color} onClick={() => setQuickType('poop')} />
            <KpiCard type="pee"   label="今日排尿" value={`${kPee.length} 片`} sub="—" color={TYPES.pee.color} onClick={() => setQuickType('pee')} />
            <KpiCard type="sleep" label="今日睡眠" value={`${sleepTotal.toFixed(1)} h`} sub={`夜间 ${nightSleep.toFixed(1)}h`} color={TYPES.sleep.color} onClick={() => setQuickType('sleep')} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="glass p-5 lg:col-span-3">
              <SectionHeader
                icon={Zap}
                title="快捷记录"
                accent="#7C6FBF"
                right={<span className="text-[10px] text-white/30 uppercase tracking-[0.14em] font-semibold">{Object.keys(TYPES).length} 项</span>}
              />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.keys(TYPES).map((y) => {
                  const Icon = TYPES[y].icon;
                  return (
                    <button
                      key={y}
                      onClick={() => setQuickType(y)}
                      className="group flex items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.07] hover:border-white/[0.16] hover:-translate-y-0.5 transition-all"
                    >
                      <span className="h-8 w-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105"
                            style={{ background: `${TYPES[y].color}22`, color: TYPES[y].color }}>
                        <Icon className="h-4 w-4" strokeWidth={1.7} />
                      </span>
                      <span className="text-[12.5px] font-medium text-white/85">{TYPES[y].name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="glass p-5 lg:col-span-2">
              <SectionHeader
                icon={Sparkles}
                title="智能预测"
                accent="#22C3D6"
                right={<span className="text-[10px] text-white/30 uppercase tracking-[0.14em] font-semibold">{predictions.length} 条</span>}
              />
              <div className="space-y-2">
                {predictions.slice(0, 4).map((y) => PredRow(y, renderPredItem))}
                {predictions.length === 0 && <div className="py-8 text-center text-white/40 text-sm">记录后自动生成预测</div>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="glass p-5">
              <SectionHeader
                icon={Clock}
                title="今日作息时间轴"
                accent="#4CAF8A"
                right={<span className="text-[10px] text-white/30 uppercase tracking-[0.14em] font-semibold">{timeline.length} 条</span>}
              />
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                {timeline.map((y) => (
                  <div key={y.id} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white/[0.02] border-l-2 hover:bg-white/[0.04] transition-colors" style={{ borderColor: TYPES[y.type].color }}>
                    <span className="text-[11px] text-white/50 tabular-nums w-11 shrink-0 font-mono">{formatTime(y.time)}</span>
                    <span className="h-6 w-6 rounded-md flex items-center justify-center shrink-0" style={{ background: `${TYPES[y.type].color}22` }}>
                      {(() => {
                        const Icon = TYPES[y.type].icon;
                        return <Icon className="h-3.5 w-3.5" style={{ color: TYPES[y.type].color }} />;
                      })()}
                    </span>
                    <span className="text-[12.5px] text-white/80 truncate">{summarize(y)}</span>
                  </div>
                ))}
                {timeline.length === 0 && <div className="py-8 text-center text-white/40 text-sm">今天还没有记录</div>}
              </div>
            </div>

            <div className="glass p-5">
              <SectionHeader icon={TrendingUp} title="近 7 天奶量趋势" accent="#22C3D6" />
              <TrendChart data={milkTrend} color="#22C3D6" unit="ml" />
            </div>
          </div>
        </div>
      )}

      {/* ===== 添加记录 ===== */}
      {page === 'record' && <RecordPage records={records} settings={settings} onAdd={addRecord} />}

      {/* ===== 趋势统计 ===== */}
      {page === 'trend' && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="glass p-5">
              <SectionHeader icon={TrendingUp} title="每日总奶量" accent="#22C3D6" />
              <TrendChart data={milkTrend} color="#22C3D6" unit="ml" />
            </div>
            <div className="glass p-5">
              <SectionHeader icon={Moon} title="每日睡眠时长" accent="#E0A458" />
              <TrendChart data={sleepTrend} color="#E0A458" unit="h" />
            </div>
            <div className="glass p-5">
              <SectionHeader icon={Droplets} title="每日排便次数" accent="#4CAF8A" />
              <TrendChart data={typeCountTrend('poop')} color="#4CAF8A" unit="次" />
            </div>
            <div className="glass p-5">
              <SectionHeader icon={BarChart3} title="周期数据汇总" accent="#8A8AD9" />
              <div className="grid grid-cols-3 gap-3">
                <div className="glass-inset p-3 text-center hover:bg-white/[0.03] transition-colors">
                  <div className="text-2xl font-bold text-white/60 tabular-nums">{kMilk.length}</div>
                  <div className="text-[11px] text-white/45 mt-0.5">今日喂奶(次)</div>
                </div>
                <div className="glass-inset p-3 text-center hover:bg-white/[0.03] transition-colors">
                  <div className="text-2xl font-bold text-emerald-300 tabular-nums">{kPoop.length}</div>
                  <div className="text-[11px] text-white/45 mt-0.5">今日排便(次)</div>
                </div>
                <div className="glass-inset p-3 text-center hover:bg-white/[0.03] transition-colors">
                  <div className="text-2xl font-bold text-amber-300 tabular-nums">{sleepTotal.toFixed(1)}</div>
                  <div className="text-[11px] text-white/45 mt-0.5">今日睡眠(h)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== 预测提醒 ===== */}
      {page === 'predict' && (
        <div className="space-y-4 animate-fade-in">
          <div className="glass p-5">
            <SectionHeader
              icon={Sparkles}
              title="喂养 / 护理预测"
              accent="#22C3D6"
              right={<span className="text-[10px] text-white/30 uppercase tracking-[0.14em] font-semibold">{predictions.length} 条</span>}
            />
            <div className="space-y-2">
              {predictions.map((y) => PredRow(y, renderPredItem))}
              {predictions.length === 0 && <div className="py-8 text-center text-white/40 text-sm">记录越多，预测越准</div>}
            </div>
          </div>

          <div className="glass p-5">
            <SectionHeader icon={Scale} title="月龄参考对比" accent="#8A8AD9" />
            {ref ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[['喂奶间隔', `${ref.milkGap[0]}~${ref.milkGap[1]} 小时`], ['每日排便', `${ref.poop[0]}~${ref.poop[1]} 次`], ['每日排尿', `${ref.pee[0]}~${ref.pee[1]} 次`], ['每日睡眠', `${ref.sleep[0]}~${ref.sleep[1]} 小时`]].map(([y, M]) => (
                  <div key={y} className="glass-inset p-3 hover:bg-white/[0.03] transition-colors">
                    <div className="text-[11px] text-white/45">{y}</div>
                    <div className="text-[15px] font-semibold text-white/90 mt-0.5 tabular-nums">{M}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-white/40 text-sm">先在「系统设置」填写宝宝出生日期</div>
            )}
          </div>

          <div className="glass p-5">
            <SectionHeader icon={Info} title="预测说明" accent="#B88A5C" />
            <div className="space-y-2 text-[12px] text-white/55">
              {[
                ['喂奶预测', '昼夜加权 EWMA + 月龄参考区间校正，白天与夜间分别建模。'],
                ['排便预警', '0-7天超12h、8-28天超24h、满月后超48h未排便即提醒。'],
                ['奶量预警', '当日总奶量低于近7天均值70%时提醒。'],
                ['体温预警', '≥37.5℃黄警，≥38℃红警。'],
                ['排尿预警', '24小时少于6次提示可能脱水。'],
              ].map(([y, M]) => (
                <div key={y} className="flex gap-2.5 items-start">
                  <span className="h-1.5 w-1.5 rounded-full mt-1.5 shrink-0" style={{ background: 'var(--accent)', boxShadow: '0 0 5px rgba(34,195,214,0.5)' }} />
                  <p><b className="text-white/80 font-semibold">{y}</b>：{M}</p>
                </div>
              ))}
              <p className="text-white/40 pt-1 border-t border-white/[0.06] mt-2">所有预测仅供参考，不能替代医生判断。</p>
            </div>
          </div>
        </div>
      )}

      {/* ===== 历史记录 ===== */}
      {page === 'history' && (
        <div className="glass p-5 animate-fade-in">
          <SectionHeader
            icon={History}
            title="历史记录"
            accent="#4A90D9"
            right={<span className="text-[10px] text-white/30 uppercase tracking-[0.14em] font-semibold">{historyList.length} 条</span>}
          />
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <DateTimePicker mode="date" value={historyFrom} onChange={setHistoryFrom} width="10.5rem" />
            <span className="text-white/40 text-[12px]">至</span>
            <DateTimePicker mode="date" value={historyTo} onChange={setHistoryTo} width="10.5rem" />
            <div className="flex gap-1 flex-wrap ml-1">
              <button onClick={() => setHistoryType('')} className={`px-2.5 py-1 rounded-lg text-[12px] transition-colors ${historyType === '' ? 'bg-white/[0.12] text-white' : 'text-white/55 hover:text-white hover:bg-white/[0.05]'}`}>全部</button>
              {Object.keys(TYPES).map((y) => (
                <button key={y} onClick={() => setHistoryType(y)} className={`px-2.5 py-1 rounded-lg text-[12px] transition-colors ${historyType === y ? 'bg-white/[0.12] text-white' : 'text-white/55 hover:text-white hover:bg-white/[0.05]'}`}>{TYPES[y].name}</button>
              ))}
            </div>
          </div>

          <div className="overflow-y-auto max-h-[60vh] rounded-xl border border-white/[0.06]">
            <table className="w-full text-[12.5px]">
              <thead className="sticky top-0" style={{ background: 'rgba(18,18,20,0.95)', backdropFilter: 'blur(8px)' }}>
                <tr className="text-left text-white/45 border-b border-white/10">
                  <th className="py-2.5 px-3 font-medium">时间</th>
                  <th className="py-2.5 px-3 font-medium">类型</th>
                  <th className="py-2.5 px-3 font-medium">详情</th>
                  <th className="py-2.5 px-3 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {historyList.map((y) => (
                  <tr key={y.id} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
                    <td className="py-2.5 px-3 text-white/60 tabular-nums font-mono">{formatDateTime(y.time)}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ background: `${TYPES[y.type].color}22`, color: TYPES[y.type].color }}>{TYPES[y.type].name}</span>
                    </td>
                    <td className="py-2.5 px-3 text-white/80">{summarize(y)}</td>
                    <td className="py-2.5 px-3 text-right">
                      <button onClick={() => removeRecord(y.id)} className="p-1.5 rounded-lg text-white/30 hover:text-red-300 hover:bg-red-500/10 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {historyList.length === 0 && (
                  <tr><td colSpan="4" className="py-10 text-center text-white/40">没有符合条件的记录</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== 系统设置 ===== */}
      {page === 'settings' && (
        <div className="space-y-4 animate-fade-in">
          <div className="glass p-5">
            <SectionHeader icon={Baby} title="宝宝信息" accent="#22C3D6" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="宝宝昵称"><input type="text" value={settings.name} onChange={(y) => setSettings({ ...settings, name: y.target.value })} placeholder="宝宝" className="w-full" /></Field>
              <Field label="出生日期（精确到时分）"><DateTimePicker value={settings.birth} onChange={(y) => setSettings({ ...settings, birth: y })} /></Field>
              <Field label="出生体重 (g)"><input type="number" value={settings.weight} onChange={(y) => setSettings({ ...settings, weight: y.target.value })} placeholder="3200" className="w-full no-spin" min="0" /></Field>
              <Field label="出生身长 (cm)"><input type="number" value={settings.height} onChange={(y) => setSettings({ ...settings, height: y.target.value })} placeholder="50" className="w-full no-spin" min="0" step="0.1" /></Field>
            </div>
            <div className="mt-5 flex items-center gap-2 border-t border-white/[0.06] pt-4">
              <button onClick={saveSettings} className="btn btn-primary"><Check className="h-4 w-4" />保存设置</button>
              <span className="text-[11px] text-white/35">当前共 {records.length} 条记录</span>
            </div>
          </div>
        </div>
      )}

      {/* 快捷记录弹窗 */}
      {quickType && <QuickModal type={quickType} onClose={() => setQuickType(null)} onSave={addRecord} settings={settings} />}

      {/* Toast */}
      {toast && <div className="toast toast-success">{toast}</div>}
    </div>
  );
}

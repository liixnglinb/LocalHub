import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Milk, Droplets, Moon, Thermometer, Scale, Sun, HeartPulse, Frown,
  Baby, ClipboardPlus, BarChart3, Sparkles, History, Zap,
  Clock, TrendingUp, Info, Trash2, X, Check, Search, Wand2,
  UserRound, Heart,
} from 'lucide-react';
import DateTimePicker from '../components/DateTimePicker';
import TrendChart from '../components/TrendChart';
import {
  ProfilePage, MomPage, BabyDailyPage, DiaperPage, FeedPage, ImportPanel, importPaperData,
} from './babycare-modules';

/* ================= 常量（还原自 release10 安装包） ================= */
const LS_KEY = 'baby-care';
const HOUR_MS = 36e5;

/* ================= 柔感专业风 · 设计系统 ================= */
const ACCENT = '#5B8DEF';        // 主色 · 安心蓝
const ACCENT_SOFT = '#E8F0FF';   // 主色浅背景（导航选中）
const BG_PAGE = '#F7F8FA';       // 页面背景
const CARD = '#FFFFFF';          // 卡片背景
const TEXT_1 = '#333F51';        // 一级文字
const TEXT_2 = '#86909C';        // 二级文字
const LINE = '#E5E6EB';          // 分割线/边框

const TYPES = {
  milk:     { name: '喂奶', icon: Milk,        color: '#FFD8A8' },
  poop:     { name: '排便', icon: Droplets,    color: '#B7E4C7' },
  pee:      { name: '排尿', icon: Droplets,    color: '#B7E4C7' },
  sleep:    { name: '睡眠', icon: Moon,        color: '#C7D2FE' },
  temp:     { name: '体温', icon: Thermometer, color: '#F8B4B4' },
  weight:   { name: '体重', icon: Scale,       color: '#D9C7F0' },
  jaundice: { name: '黄疸', icon: Sun,         color: '#FFF0C2' },
  care:     { name: '护理', icon: HeartPulse,  color: '#BFE3EF' },
  cry:      { name: '哭闹', icon: Frown,       color: '#F0C7C7' },
};

/* 各记录类型 · 填写提示（填充添加记录页右侧） */
const TYPE_HELP = {
  milk:    '记录喂奶方式与奶量，系统将据此结合月龄与出生体重预测下次喂奶时间。',
  poop:    '观察并记录大便性状与颜色，异常标记便于日后就医参考。',
  pee:     '记录尿量与颜色，24 小时内少于 6 次会提示可能脱水。',
  sleep:   '填写睡眠时长与质量，用于统计昼夜睡眠规律与建议睡眠时段。',
  temp:    '体温很关键：≥37.5℃ 黄警、≥38℃ 红警，请及时关注。',
  weight:  '定期记录体重，评估生长发育趋势，预测使用出生体重校正。',
  jaundice:'记录经皮黄疸值，数值变化供医生判断参考。',
  care:    '记录脐带护理、抚触、洗澡等日常照护动作与详情。',
  cry:     '记录哭闹时长与安抚方式，帮助判断宝宝的真实需求。',
};

const DEFAULT_SETTINGS = { name: '宝宝', birth: '', weight: '', height: '' };

/* 从「宝宝档案」导出宝宝基础信息（出生信息统一以档案为准，供预测/导入/奶量使用） */
function babyInfoFrom(profile) {
  const p = profile || {};
  return {
    name: p.name || '宝宝',
    birth: p.birthTime || '',
    weight: p.birthWeight || '',
    height: p.height || '',
  };
}
/* 仅迁移一次：把旧的系统设置数据补进档案（档案信息优先，缺失字段才用旧值补齐） */
function migrateSettingsToProfile(profile, oldSettings) {
  const o = oldSettings || {};
  const p = profile
    ? { ...profile }
    : { id: '', name: '', gender: '', birthTime: '', admitTime: '', birthWeight: '', height: '', assessment: {} };
  let changed = false;
  if (!p.birthTime && o.birth) { p.birthTime = o.birth; changed = true; }
  if (!p.birthWeight && o.weight) { p.birthWeight = o.weight; changed = true; }
  if (!p.height && o.height) { p.height = o.height; changed = true; }
  if (!p.name && o.name) { p.name = o.name; changed = true; }
  return { profile: p, changed };
}

/* KPI 卡片（柔感专业风，模块级组件避免每次渲染重建） */
function KpiCard({ type, label, value, sub, color, onClick }) {
  const Icon = TYPES[type].icon;
  return (
    <button onClick={onClick} className="bc-kpi group">
      <div className="bc-kpi-icon" style={{ background: `${color}33`, color }}>
        <Icon className="h-5 w-5" strokeWidth={1.9} />
      </div>
      <div className="min-w-0">
        <div className="bc-kpi-label">{label}</div>
        <div className="bc-kpi-value">{value}</div>
        <div className="bc-kpi-sub">{sub}</div>
      </div>
    </button>
  );
}

const SHAPE_MAP = { unknown: '不知道', normal: '正常', meconium: '胎便', gold: '金黄糊状', paste: '膏状', watery: '稀水样', hard: '干硬', egg: '蛋花汤' };
const COLOR_MAP = { unknown: '不知道', blackgreen: '黑绿', gold: '金黄', yellowgreen: '黄绿', green: '绿色', gray: '灰色', red: '红色' };

/* 月龄参考对比 · 进度条（展示当前值在参考区间内的位置） */
function RefBar({ label, cur, range, unit }) {
  const [min, max] = range;
  const pct = Math.max(0, Math.min(1, (cur - min) / (max - min || 1)));
  const inRange = cur >= min && cur <= max;
  const color = inRange ? '#5B8DEF' : cur < min ? '#F59E0B' : '#E85D5D';
  const mark = Math.round(pct * 100);
  return (
    <div className="mb-5 last:mb-0">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[12px] text-[var(--text-3)]">{label}</span>
        <span className="text-[12px] font-semibold tabular-nums" style={{ color }}>
          {cur}{unit}
          <span className="text-[var(--text-4)] font-normal ml-1.5">参考 {min}~{max}{unit}</span>
        </span>
      </div>
      <div className="relative h-2 rounded-full bg-[#EFF1F5]">
        <div className="absolute left-0 top-0 h-full rounded-full" style={{ width: `${mark}%`, background: color }} />
        <div className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full border-2 bg-white shadow-sm" style={{ left: `calc(${mark}% - 7px)`, borderColor: color }} />
      </div>
      <div className="flex justify-between text-[11px] text-[var(--text-4)] mt-1">
        <span>{min}</span><span>{max}</span>
      </div>
    </div>
  );
}

/* ================= 文字一键导入 · 解析逻辑 ================= */
const KW = {
  milk:    ['喂奶', '母乳', '奶粉', '吃奶', '喝奶', '奶'],
  poop:    ['大便', '便便', '排便', '办便', '拉'],
  pee:     ['小便', '排尿', '尿'],
  sleep:   ['睡觉', '睡眠', '入睡', '睡了', '睡'],
  temp:    ['体温', '发烧', '发热', '℃', '度'],
  weight:  ['体重'],
  jaundice:['黄疸'],
  care:    ['脐带', '抚触', '排气操', '洗澡', '用药', '异常'],
  cry:     ['哭闹', '大哭', '哭'],
};

/* 从一行文字中解析时间（支持 3点 / 3点15 / 14:30 / 下午3点 / 昨天 / 凌晨 等） */
function parseTime(line, now) {
  const n = new Date(now);
  let hour = -1, minute = 0, dayShift = 0;
  const hm = line.match(/(\d{1,2})\s*[：:]\s*(\d{1,2})/);
  if (hm) { hour = +hm[1]; minute = +hm[2]; }
  else {
    const t = line.match(/(\d{1,2})\s*点(?:\s*(\d{1,2})\s*分?)?/);
    if (t) { hour = +t[1]; minute = +(t[2] || 0); }
  }
  if (/前天/.test(line)) dayShift = -2;
  else if (/昨天|昨日/.test(line)) dayShift = -1;

  if (hour === -1) {
    hour = n.getHours(); minute = n.getMinutes();
  } else {
    if (/凌晨|深夜|半夜|凌晨/.test(line) && hour >= 12 && hour < 24) hour -= 12;
    if (/中午/.test(line)) hour = 12;
    if (/下午|傍晚/.test(line) && hour >= 0 && hour < 12) hour += 12;
    if (/晚上|夜晚|夜里|晚间/.test(line) && hour >= 0 && hour < 12) hour += 12;
  }
  const d = new Date(n);
  d.setDate(d.getDate() + dayShift);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

/* 根据类型与一行文字构建记录对象 */
function buildRecord(type, line, now) {
  const rec = { id: Date.now() + Math.floor(Math.random() * 1e5), type, time: parseTime(line, now) };
  switch (type) {
    case 'milk': {
      const m = line.match(/(\d+)\s*ml/i);
      if (m) rec.amount = +m[1];
      rec.kind = /奶粉|配方/.test(line) ? 'formula' : /瓶喂|奶瓶/.test(line) ? 'bottle' : 'breast';
      rec.weight = null;
      break;
    }
    case 'poop': {
      rec.shape = /硬|干/.test(line) ? 'hard' : /稀|水样|腹泻|泻/.test(line) ? 'watery' : /胎便/.test(line) ? 'meconium' : /金黄|糊/.test(line) ? 'gold' : 'normal';
      rec.abnormal = [];
      if (/血丝/.test(line)) rec.abnormal.push('带血丝');
      if (/粘液/.test(line)) rec.abnormal.push('带粘液');
      if (/泡沫/.test(line)) rec.abnormal.push('泡沫多');
      rec.color = /红/.test(line) ? 'red' : /绿/.test(line) ? 'green' : /黑|胎便/.test(line) ? 'blackgreen' : 'gold';
      break;
    }
    case 'pee': {
      rec.amount = /少/.test(line) ? '少量' : /多|频繁/.test(line) ? '大量' : '正常';
      rec.color = /深黄/.test(line) ? '深黄' : /红/.test(line) ? '偏红' : '正常';
      break;
    }
    case 'sleep': {
      const d = line.match(/(\d+(?:\.\d+)?)\s*小时/);
      rec.duration = d ? +d[1] : '';
      rec.quality = /易醒/.test(line) ? '易醒' : /哭/.test(line) ? '哭闹' : '安稳';
      break;
    }
    case 'temp': {
      const v = line.match(/(\d+(?:\.\d+)?)\s*[℃度]/);
      rec.value = v ? +v[1] : '';
      rec.site = '腋温';
      break;
    }
    case 'weight': {
      const w = line.match(/(\d+(?:\.\d+)?)\s*kg/i);
      rec.value = w ? +w[1] : '';
      break;
    }
    case 'jaundice': {
      const j = line.match(/(\d+(?:\.\d+)?)/);
      rec.value = j ? +j[1] : '';
      rec.site = '额头';
      break;
    }
    case 'care': {
      rec.careType = /脐/.test(line) ? 'cord' : /抚触|排气/.test(line) ? 'touch' : /洗|澡/.test(line) ? 'bath' : /药/.test(line) ? 'medicine' : 'event';
      rec.detail = line.replace(/[\d\s:：.点分晚上下午凌晨中午上午夜晚昨今前天夜里多小时℃度mlMLkg]+/g, '').trim();
      rec.duration = '';
      break;
    }
    case 'cry': {
      const c = line.match(/(\d+)\s*分/);
      rec.duration = c ? +c[1] : '';
      rec.level = /剧烈/.test(line) ? '剧烈' : /中/.test(line) ? '中等' : '轻度';
      rec.soothe = '';
      rec.cause = [];
      break;
    }
    default: break;
  }
  return rec;
}

/* 解析一行是否为"日期/天数"分组标题：返回 { kind:'gregorian'|'index'|'none', date?, n? } */
function parseDayHeader(seg) {
  let m = seg.match(/(\d{4})\s*[-/年.]\s*(\d{1,2})\s*[-/月.]\s*(\d{1,2})\s*[日号]?/);
  if (m) {
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    if (!isNaN(d)) return { kind: 'gregorian', date: d };
  }
  m = seg.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]/);
  if (m) {
    const n = new Date();
    const d = new Date(n.getFullYear(), +m[1] - 1, +m[2]);
    if (!isNaN(d)) return { kind: 'gregorian', date: d };
  }
  m = seg.match(/(?:出生)?\s*第\s*(\d{1,3})\s*天/);
  if (m) return { kind: 'index', n: +m[1] };
  return { kind: 'none' };
}

/* "第N天"按出生日期换算：返回 Date / null */
function dayIndexToDate(n, birth) {
  if (!birth) return null;
  const b = new Date(birth);
  if (isNaN(b)) return null;
  const d = new Date(b);
  d.setDate(d.getDate() + (n - 1));
  return d;
}

/* 整段文字解析：支持"第N天/日期"大标题分组，其下记录沿用该日期 */
function parseText(text, now, birth) {
  const segments = text.split(/[\n;；。]+/).map((s) => s.trim()).filter(Boolean);
  const out = [];
  let dayRef = null; // 最近一组分组标题的日期（Date | null）
  for (const seg of segments) {
    const h = parseDayHeader(seg);
    if (h.kind === 'gregorian') dayRef = h.date;
    else if (h.kind === 'index') {
      const d = dayIndexToDate(h.n, birth);
      if (d) dayRef = d;
    }
    let type = null;
    for (const [t, kws] of Object.entries(KW)) {
      if (kws.some((k) => seg.includes(k))) { type = t; break; }
    }
    if (!type) continue; // 分组标题行（无类型关键词）只更新日期，不生成记录
    const rec = buildRecord(type, seg, now);
    if (dayRef) {
      const t = new Date(rec.time);
      const base = new Date(dayRef);
      base.setHours(t.getHours(), t.getMinutes(), 0, 0);
      rec.time = base.toISOString();
    }
    out.push(rec);
  }
  return out;
}

/* ================= 文字一键导入 · UI 组件 ================= */
const AI_PROMPT = `请识别图片中的宝宝护理记录，并严格按下面的纯文本格式输出，便于程序自动导入。不要输出任何解释、序号、项目符号或表头，也不要合并两条记录到一行。

一、日期标题（有则单独一行，放在所在记录的前面）：
- 第N天 / 出生第N天 / X月X日；例如：出生第10天、7月10日

二、每条记录一行，开头写时间，然后是类型与数值（用中文关键词标明）：
- 喂奶：喂奶120ml / 亲喂母乳 / 奶粉60ml / 瓶喂母乳
- 排便：排便 正常 / 大便稀水样、带血丝、奶瓣多
- 排尿：排尿 正常 / 尿偏黄、少量
- 睡眠：8点睡2小时（时间 + 睡 + 小时数）
- 体温：体温36.8
- 体重：体重3.20
- 黄疸：黄疸8.5
- 护理：脐带护理 正常 / 洗澡 / 抚触
- 哭闹：哭闹10分钟 / 大哭5分钟

三、时间写法支持：14:30、8点15、下午3点、上午9点、凌晨5点、昨天。
图片里没有的信息不要编造，不要补全。请直接分行输出全部记录文本。`;

function TextImport({ onImport, birth }) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(true);
  const [showAI, setShowAI] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(AI_PROMPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* 剪贴板不可用时静默 */ }
  };
  const parsed = useMemo(() => parseText(text, new Date().toISOString(), birth), [text, birth]);

  return (
    <div className="bc-card bc-card-hover p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="flex items-center gap-2 text-[16px] font-medium text-[#333F51]">
          <span className="bc-title-icon" style={{ background: `${ACCENT}26`, color: ACCENT }}>
            <Wand2 className="h-4 w-4" strokeWidth={1.8} />
          </span>
          文字一键导入
        </span>
        <button type="button" onClick={() => setOpen((v) => !v)} className="text-[12px] text-[#86909C] hover:text-[#333F51] transition-colors">
          {open ? '收起' : '展开'}
        </button>
      </div>
      {open && (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder={'粘贴一段文字，自动识别后一键导入，例如：\n第10天\n上午9点 喂奶120ml\n中午喂奶120ml 排便正常\n8点睡2小时'}
            className="w-full resize-none p-3 rounded-[8px] border border-[#E5E6EB] text-[12.5px] text-[#333F51] placeholder:text-[#B4B8C0] bg-[#FBFBFD] focus:border-[#5B8DEF] focus:outline-none transition-colors"
          />
          <p className="mt-2 text-[11px] leading-relaxed text-[#86909C]">
            支持「第N天 / 出生第N天 / 7月10日」大标题，其下记录自动沿用该日期；重复的记录导入时会自动去重。
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[11px] text-[#86909C]">已识别 {parsed.length} 条记录</span>
            <span className="flex-1" />
            <button
              type="button"
              onClick={() => setShowAI((v) => !v)}
              className="inline-flex items-center gap-1 text-[11px] text-[#5B8DEF] hover:text-[#4a7ee0] transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />AI 提示词
            </button>
            <button
              type="button"
              onClick={copyPrompt}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-[6px] text-[11px] font-medium text-[#5B8DEF] border border-[#C6D9F6] bg-white hover:bg-[#EEF4FF] transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <ClipboardPlus className="h-3.5 w-3.5" />}
              {copied ? '已复制' : '复制'}
            </button>
          </div>

          {showAI && (
            <div className="mt-2 rounded-[8px] border border-[#E5E6EB] bg-[#FBFBFD] p-3 text-[11.5px] leading-relaxed text-[#5A6474] whitespace-pre-wrap">
              {AI_PROMPT}
            </div>
          )}
          <div className="mt-1.5 space-y-1 max-h-[140px] overflow-y-auto pr-1">
            {parsed.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-[12px] p-1.5 rounded-md bg-[#F7F8FA]">
                <span className="px-1.5 rounded shrink-0" style={{ background: `${TYPES[r.type].color}22`, color: TYPES[r.type].color }}>{TYPES[r.type].name}</span>
                <span className="text-[var(--text-3)] tabular-nums shrink-0">{formatDateTime(r.time)}</span>
                <span className="truncate text-[var(--text-1)]">{summarize(r) || '记录'}</span>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => onImport(parsed)} disabled={!parsed.length} className="bc-btn-primary mt-3 w-full" style={{ padding: '9px 12px' }}>
            导入 {parsed.length || '0'} 条记录
          </button>
        </>
      )}
    </div>
  );
}

/* ================= 工具函数 ================= */
const pad = (n) => String(n).padStart(2, '0');

/* 生成记录的规范化去重键：时间精确到分钟、字段排序、数组排序，忽略 id */
function normKey(rec) {
  if (!rec) return '';
  const t = new Date(rec.time);
  const p2 = (n) => String(n).padStart(2, '0');
  const timeKey = Number.isNaN(t.getTime())
    ? String(rec.time)
    : `${t.getFullYear()}-${p2(t.getMonth() + 1)}-${p2(t.getDate())}T${p2(t.getHours())}:${p2(t.getMinutes())}`;
  const stable = {};
  Object.keys(rec).sort().forEach((k) => {
    if (k === 'id' || rec[k] === undefined || rec[k] === null) return;
    const v = rec[k];
    stable[k] = Array.isArray(v) ? [...v].sort() : (typeof v === 'string' ? v.trim() : v);
  });
  return timeKey + JSON.stringify(stable);
}

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
  const c = accent || ACCENT;
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h3 className="flex items-center gap-2 text-[16px] font-medium text-[#333F51]">
        <span className="bc-title-icon" style={{ background: `${c}26`, color: c }}>
          <Icon className="h-4 w-4" strokeWidth={1.8} />
        </span>
        {title}
      </h3>
      {right}
    </div>
  );
}

/* 图表单位徽标 */
function UnitTag({ color, children }) {
  return (
    <span className="px-2 py-0.5 rounded-[6px] text-[11px] font-medium tabular-nums" style={{ background: `${color}22`, color }}>
      {children}
    </span>
  );
}

/* 周期汇总 · 迷你 KPI 数字卡（浅色底 + 主题色数值，层次清晰） */
function KpiMini({ color, bg, value, label, unit }) {
  return (
    <div className="rounded-[10px] px-4 py-3.5 border" style={{ background: bg, borderColor: `${color}33` }}>
      <div className="text-[26px] font-semibold leading-none tabular-nums" style={{ color }}>
        {value}
        <span className="text-[12px] font-normal text-[var(--text-2)] ml-1">{unit}</span>
      </div>
      <div className="text-[12px] text-[var(--text-2)] mt-2">{label}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px] text-[var(--text-2)] font-medium">{label}</label>
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

  const chip = (active) => `px-3 py-1.5 rounded-[8px] text-[12px] font-medium border cursor-pointer transition-all ${
    active ? 'bg-[var(--sel)] text-[var(--text-1)] border-[var(--line-hair)]' : 'bg-[var(--bg-2)] text-[var(--text-2)] border-[var(--line)] hover:bg-[var(--hover)] hover:text-[var(--text-1)]'
  }`;
  const labelCls = 'mb-1.5 block text-[12px] text-[var(--text-2)] font-medium';

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
          <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--hover)] transition-colors">
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
          <button onClick={submit} className="bc-btn-primary"><Check className="h-4 w-4" />保存</button>
        </div>
      </div>
    </div>
  );
}

/* ================= 添加记录页 ================= */
function RecordPage({ records, settings, onAdd, onImport }) {
  const [type, setType] = useState('milk');
  const [form, setForm] = useState({});
  const [careType, setCareType] = useState('cord');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const chip = (active) => `px-3 py-1.5 rounded-[8px] text-[12px] font-medium border cursor-pointer transition-all ${
    active ? 'bg-[var(--sel)] text-[var(--text-1)] border-[var(--line-hair)]' : 'bg-[var(--bg-2)] text-[var(--text-2)] border-[var(--line)] hover:bg-[var(--hover)] hover:text-[var(--text-1)]'
  }`;
  const typeKeys = Object.keys(TYPES);
  const now = nowISO();
  // 当前类型最近同类记录（填充右侧栏）
  const recent = records
    .filter((r) => r.type === type)
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 5);

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
        className="flex items-center justify-center gap-2 px-4 py-2 rounded-[9px] text-[13px] font-medium transition-all cursor-pointer whitespace-nowrap"
        style={{
          color: active ? ACCENT : '#5A6474',
          background: active ? '#FFF6EC' : '#F1F3F7',
          border: active ? `1px solid ${ACCENT}66` : '1px solid #E5E6EB',
          boxShadow: 'none',
        }}
      >
        <Icon className="h-4 w-4 shrink-0" strokeWidth={1.9} style={{ color: TYPES[key].color }} />
        {TYPES[key].name}
        {active && <span className="w-1.5 h-1.5 rounded-full ml-0.5 shrink-0" style={{ background: TYPES[key].color }} />}
      </button>
    );
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* 顶部：9 个记录分类标签，保持单行不换行 */}
      <div className="bc-card flex items-center gap-2.5 flex-nowrap">
        {typeKeys.map(typeTab)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
      <div className="bc-card bc-card-hover p-5 relative overflow-hidden lg:col-span-2 flex flex-col">
        {/* 顶部类型色条：识别当前记录类型 */}
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: TYPES[type].color }} />
        <SectionHeader icon={TYPES[type].icon} title={`记录${TYPES[type].name}`} accent={TYPES[type].color} right={
          <span className="bc-chip" style={{ background: `${TYPES[type].color}22`, color: TYPES[type].color }}>
            共 {Object.keys(TYPES).length} 种类型
          </span>
        } />
        <div className="space-y-5">
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
      </div>

      {/* 右侧信息栏：填满右侧空白 */}
      <div className="space-y-4 lg:col-span-1 flex flex-col">
        {/* 文字一键导入 */}
        <TextImport onImport={onImport} birth={settings.birth} />

        {/* 填写提示 */}
        <div className="bc-card bc-card-hover p-5">
          <SectionHeader icon={Info} title="填写提示" accent={TYPES[type].color} />
          <p className="text-[13px] leading-relaxed text-[var(--text-2)]">{TYPE_HELP[type]}</p>
          <div className="mt-3 pt-3 border-t border-[#E5E6EB] flex items-center gap-2 text-[12px] text-[var(--text-3)]">
            <span className="w-2 h-2 rounded-full" style={{ background: TYPES[type].color }} />
            当前类型：{TYPES[type].name}
          </div>
        </div>

        {/* 最近同类记录 */}
        <div className="bc-card bc-card-hover p-5">
          <SectionHeader icon={Clock} title="最近同类记录" right={<span className="text-[12px] text-[#86909C]">{recent.length} 条</span>} />
          {recent.length ? (
            <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
              {recent.map((r) => (
                <div key={r.id} className="flex items-center gap-2 p-2 rounded-lg bg-[#F7F8FA] border-l-[3px]" style={{ borderColor: TYPES[type].color }}>
                  <span className="text-[11px] text-[var(--text-3)] tabular-nums w-11 shrink-0 font-mono">{formatTime(r.time)}</span>
                  <span className="text-[12px] text-[var(--text-1)] truncate">{summarize(r)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-[var(--text-3)] text-sm">还没有同类记录</div>
          )}
        </div>
      </div>
      </div>

      {/* 底部通栏保存操作栏（横跨全部内容宽度） */}
      <div className="bc-card flex items-center justify-between gap-3">
        <span className="text-[12px] text-[#86909C]">填写完成后点击保存，数据将同步到本机</span>
        <button
          onClick={submit}
          className="bc-btn-primary shrink-0"
          style={{ minWidth: 120, boxShadow: '0 4px 12px rgba(91,141,239,.28)' }}
        >
          <Check className="h-4 w-4" />保存记录
        </button>
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
  const [showRules, setShowRules] = useState(false);
  const [profile, setProfile] = useState(null);
  const [momDaily, setMomDaily] = useState([]);
  const [babyDaily, setBabyDaily] = useState([]);
  const [diaper, setDiaper] = useState([]);
  const [feed, setFeed] = useState([]);
  const toastRef = useRef(null);
  // 统一数据快照（localStorage 持久化，避免各实体互相覆盖）
  const dataRef = useRef({ records: [], settings: DEFAULT_SETTINGS, profile: null, momDaily: [], babyDaily: [], diaper: [], feed: [] });

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 1800);
  };

  useEffect(() => {
    window.electronAPI?.loadData(LS_KEY)
      .then((M) => {
        if (!M) return;
        const d = { ...dataRef.current, ...M };
        dataRef.current = d;
        if (Array.isArray(M.records)) {
          // 自动清理历史重复记录（时间精确到分钟 + 内容一致）
          const seen = new Set();
          const deduped = M.records.filter((r) => {
            const k = normKey(r);
            if (!k || seen.has(k)) return false;
            seen.add(k);
            return true;
          });
          setRecords(deduped);
          if (deduped.length < M.records.length) {
            dataRef.current = { ...dataRef.current, records: deduped };
            window.electronAPI?.saveData(LS_KEY, dataRef.current);
          }
        }
        // 宝宝信息以「宝宝档案」为准；旧系统设置数据迁移一次补进档案
        const mig = migrateSettingsToProfile(M.profile || null, M.settings);
        if (mig.changed) {
          dataRef.current = { ...dataRef.current, profile: mig.profile, settings: undefined };
          window.electronAPI?.saveData(LS_KEY, dataRef.current);
        }
        if (mig.profile) setProfile(mig.profile);
        setSettings(babyInfoFrom(mig.profile));
        if (Array.isArray(M.momDaily)) setMomDaily(M.momDaily);
        if (Array.isArray(M.babyDaily)) setBabyDaily(M.babyDaily);
        if (Array.isArray(M.diaper)) setDiaper(M.diaper);
        if (Array.isArray(M.feed)) setFeed(M.feed);
      })
      .catch((M) => console.warn('load baby-care failed:', M))
      .finally(() => setLoaded(true));
  }, []);

  // 统一存盘：以 dataRef 为唯一真源写入 localStorage
  const save = useCallback((rec, set) => {
    const next = { ...dataRef.current };
    if (rec) { next.records = rec; setRecords(rec); }
    if (set) { next.settings = set; setSettings(set); }
    dataRef.current = next;
    window.electronAPI?.saveData(LS_KEY, next);
  }, []);

  // 更新任意实体并持久化
  const updateEntities = (patch) => {
    const next = { ...dataRef.current, ...patch };
    dataRef.current = next;
    if ('profile' in patch) setProfile(patch.profile);
    if ('momDaily' in patch) setMomDaily(patch.momDaily);
    if ('babyDaily' in patch) setBabyDaily(patch.babyDaily);
    if ('diaper' in patch) setDiaper(patch.diaper);
    if ('feed' in patch) setFeed(patch.feed);
    window.electronAPI?.saveData(LS_KEY, next);
  };

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
  // 删除指定日期的全部记录（历史记录页「全部删除」）
  const removeRecordsByDate = (dateStr) => {
    const ids = records.filter((r) => String(r.time).slice(0, 10) === dateStr).map((r) => r.id);
    const idSet = new Set(ids);
    const M = records.filter((r) => !idSet.has(r.id));
    save(M);
    showToast(`已删除 ${ids.length} 条记录`);
  };
  // 文字一键导入：合并并自动去重（时间精确到分钟 + 内容字段完全一致视为重复）
  const importRecords = (list) => {
    if (!Array.isArray(list) || !list.length) return;
    const seen = new Set(records.map(normKey));
    const fresh = [];
    const batch = new Set();
    for (const r of list) {
      const k = normKey(r);
      if (k === '' || seen.has(k) || batch.has(k)) continue;
      fresh.push(r);
      batch.add(k);
    }
    if (!fresh.length) { showToast('均为重复记录，未新增'); return; }
    const skipped = list.length - fresh.length;
    save([...records, ...fresh]);
    showToast(skipped ? `已导入 ${fresh.length} 条，跳过 ${skipped} 条重复` : `已导入 ${fresh.length} 条记录`);
  };

  /* ---- 母婴台账 handlers ---- */
  // 档案保存后，同步刷新宝宝的出生信息（预测/导入/奶量统一读取）
  const saveProfile = (p) => {
    updateEntities({ profile: p });
    setSettings(babyInfoFrom(p));
    showToast('档案已保存');
  };
  const addMom = (r) => { updateEntities({ momDaily: [...momDaily, r] }); showToast('妈妈记录已保存'); };
  const delMom = (id) => { updateEntities({ momDaily: momDaily.filter((x) => x.id !== id) }); showToast('已删除'); };
  const addBaby = (r) => { updateEntities({ babyDaily: [...babyDaily, r] }); showToast('宝宝记录已保存'); };
  const delBaby = (id) => { updateEntities({ babyDaily: babyDaily.filter((x) => x.id !== id) }); showToast('已删除'); };
  const addDiaper = (r) => { updateEntities({ diaper: [...diaper, r] }); showToast('已保存换尿布记录'); };
  const delDiaper = (id) => { updateEntities({ diaper: diaper.filter((x) => x.id !== id) }); showToast('已删除'); };
  const addFeed = (r) => { updateEntities({ feed: [...feed, r] }); showToast('已保存进食记录'); };
  const delFeed = (id) => { updateEntities({ feed: feed.filter((x) => x.id !== id) }); showToast('已删除'); };
  const doImport = () => {
    const { profile: p, momDaily: m, babyDaily: b, diaper: d, feed: f } = importPaperData();
    updateEntities({
      profile: profile || p,
      momDaily: [...momDaily, ...m],
      babyDaily: [...babyDaily, ...b],
      diaper: [...diaper, ...d],
      feed: [...feed, ...f],
    });
    showToast(`已导入档案、${m.length} 条妈妈记录、${b.length} 条宝宝记录、${d.length} 条换尿布、${f.length} 条进食`);
  };

  const today = useMemo(() => records.filter((r) => isToday(r.time)), [records]);
  const predictions = useMemo(() => predict(records, settings), [records, settings]);

  const kMilk = today.filter((r) => r.type === 'milk');
  const kPoop = today.filter((r) => r.type === 'poop');
  const kPee = today.filter((r) => r.type === 'pee');
  const kSleep = today.filter((r) => r.type === 'sleep');
  const sleepTotal = kSleep.reduce((s, r) => s + (+r.duration || 0), 0);
  const nightSleep = kSleep.filter((r) => !isDay(r.time)).reduce((s, r) => s + (+r.duration || 0), 0);

  /* KPI 卡片（渐变卡）在模块级定义 */

  const NAV = [
  { group: '日常', items: [
    { id: 'home',     label: '今日首页', icon: Baby },
    { id: 'record',   label: '添加记录', icon: ClipboardPlus },
    { id: 'trend',    label: '趋势统计', icon: BarChart3 },
    { id: 'predict',  label: '预测提醒', icon: Sparkles },
    { id: 'history',  label: '历史记录', icon: History },
  ] },
  { group: '母婴台账', items: [
    { id: 'profile',  label: '宝宝档案', icon: UserRound },
    { id: 'mom',      label: '妈妈护理', icon: Heart },
    { id: 'baby',     label: '宝宝每日', icon: Sun },
    { id: 'diaper',   label: '换尿布', icon: Droplets },
    { id: 'feed',     label: '进食记录', icon: Sparkles },
  ] },
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

  // 近 7 天的具体日期标签（图例横轴，由旧到新）
  const trendLabels = useMemo(() => {
    const out = [];
    for (let M = 6; M >= 0; M--) {
      const A = new Date();
      A.setDate(A.getDate() - M);
      out.push(`${A.getMonth() + 1}/${A.getDate()}`);
    }
    return out;
  }, []);

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

  // 历史记录按日期分组（倒序），供「全部删除」一键清空当天
  const historyGroups = useMemo(() => {
    const m = new Map();
    for (const r of historyList) {
      const k = String(r.time).slice(0, 10);
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(r);
    }
    return [...m.entries()].map(([date, items]) => ({ date, items }));
  }, [historyList]);

  const dayTitle = (fullDate) => {
    const d = new Date(`${fullDate}T00:00:00`);
    if (Number.isNaN(d.getTime())) return fullDate;
    const week = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
    return `${d.getMonth() + 1}月${d.getDate()}日 周${week}`;
  };

  const timeline = useMemo(() => today.slice().sort((y, M) => new Date(y.time) - new Date(M.time)), [today]);
  const ref = useMemo(() => (settings.birth ? refTable(ageDays(settings.birth)) : null), [settings.birth]);

  /* 预测条目渲染：有 v 显示值，否则 tag 徽章 */
  const renderPredItem = (y) => y.v
    ? <span className="text-[13px] font-medium text-[var(--text-1)] tabular-nums">{y.v}</span>
    : <span className={`px-2 py-0.5 rounded-full text-[11px] ${y.lv === 'danger' ? 'bg-[var(--danger-soft)] text-[var(--danger)]' : 'bg-[rgba(245,158,11,0.18)] text-[var(--warn)]'}`}>{y.tag}</span>;

  const PredRow = (y, M) => (
    <div key={y.n} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[var(--bg-2)] border border-[var(--line)] hover:bg-[var(--bg-3)] hover:border-[var(--line-hover)] transition-all">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[13px] font-semibold">
          {y.n}
          {y.lv === 'danger' && <span className="status-dot err" />}
          {y.lv === 'warn' && <span className="status-dot warn" />}
        </div>
        <div className="text-[11px] text-[var(--text-3)] truncate">{y.s}</div>
      </div>
      {M(y)}
    </div>
  );

  return (
    <div className="bc-layout">
      {/* ===== 柔感专业风主题样式（中性边框 + 安心蓝点缀） ===== */}
      <style>{`
        /* ===== 柔感专业风 · 设计系统变量 ===== */
        .bc-layout {
          display: flex;
          gap: 20px;
          align-items: flex-start;
          min-height: 100%;
          width: 100%;
          max-width: 1560px;
          margin: 0 auto;
          box-sizing: border-box;
          font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Segoe UI", system-ui, sans-serif;
          color: ${TEXT_1};
          /* 覆盖全局选中态为安心蓝，统一柔感专业风 */
          --sel: rgba(91, 141, 239, 0.14);
        }

        /* ===== 左侧固定竖导航（220px，白底+右侧分割线） ===== */
        .bc-sidenav {
          width: 220px;
          flex-shrink: 0;
          background: #fff;
          border: 1px solid ${LINE};
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          padding: 18px 12px;
          position: sticky;
          top: 0;
          box-sizing: border-box;
        }
        .bc-nav-greet {
          text-align: center;
          padding: 6px 4px 16px;
          border-bottom: 1px solid ${LINE};
          margin-bottom: 12px;
        }
        .bc-nav-icon {
          width: 46px; height: 46px; margin: 0 auto 10px;
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          background: ${ACCENT_SOFT}; color: ${ACCENT};
        }
        .bc-nav-name { font-size: 16px; font-weight: 600; color: ${TEXT_1}; }
        .bc-nav-sub { font-size: 12px; color: ${TEXT_2}; margin-top: 4px; }
        .bc-nav { display: flex; flex-direction: column; gap: 4px; }
        .bc-nav-item {
          display: flex; align-items: center; gap: 10px;
          width: 100%; height: 48px; padding: 0 14px;
          border: 0; background: transparent;
          border-radius: 8px; cursor: pointer;
          font-size: 14px; font-weight: 400; color: ${TEXT_2};
          text-align: left; font-family: inherit;
          transition: background .18s ease, color .18s ease;
        }
        .bc-nav-item:hover { background: #F2F4F7; color: ${TEXT_1}; }
        .bc-nav-item.active { background: ${ACCENT_SOFT}; color: ${ACCENT}; font-weight: 600; }
        .bc-nav-ic { width: 18px; height: 18px; flex-shrink: 0; }
        .bc-nav-group { display: flex; flex-direction: column; gap: 2px; }
        .bc-nav-group-title { padding: 10px 14px 4px; font-size: 11px; font-weight: 600; color: #A8ADB6; letter-spacing: .04em; }
        .bc-nav-group + .bc-nav-group { margin-top: 10px; border-top: 1px solid ${LINE}; padding-top: 8px; }

        .bc-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 20px; }
        .bc-page-title { font-size: 20px; font-weight: 600; color: ${TEXT_1}; }
        @media (max-width: 820px) {
          .bc-layout { flex-direction: column; }
          .bc-sidenav { width: 100%; position: static; }
          .bc-nav { flex-direction: row; flex-wrap: wrap; }
          .bc-nav-greet { display: none; }
          .bc-nav-item { flex: 1; justify-content: center; }
        }

        /* ===== 卡片：12px 圆角 + 轻阴影 + 内边距 20px ===== */
        .bc-card {
          background: ${CARD};
          border: 1px solid ${LINE};
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          padding: 20px;
          box-sizing: border-box;
        }
        .bc-card-hover { transition: border-color .2s ease, box-shadow .2s ease; }
        .bc-card-hover:hover { border-color: ${ACCENT}55; box-shadow: 0 4px 14px rgba(91,141,239,.10); }

        /* ===== KPI 卡片 ===== */
        .bc-kpi {
          display: flex; flex-direction: column; justify-content: space-between;
          text-align: left; height: 100%;
          background: ${CARD}; border: 1px solid ${LINE}; border-radius: 12px;
          padding: 20px; cursor: pointer; min-height: 120px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          transition: border-color .2s ease, box-shadow .2s ease;
        }
        .bc-kpi:hover { border-color: ${ACCENT}88; box-shadow: 0 6px 18px rgba(91,141,239,.12); }
        .bc-kpi-icon {
          width: 42px; height: 42px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 12px;
        }
        .bc-kpi-label { font-size: 12px; font-weight: 400; color: ${TEXT_2}; }
        .bc-kpi-value { font-size: 26px; font-weight: 600; color: ${TEXT_1}; font-variant-numeric: tabular-nums; line-height: 1.2; margin-top: 2px; }
        .bc-kpi-sub { font-size: 12px; color: ${TEXT_2}; margin-top: 6px; }

        /* ===== 区块标题 ===== */
        .bc-title-icon {
          display: flex; align-items: center; justify-content: center;
          height: 26px; width: 26px; border-radius: 8px;
        }
        .bc-section-title { font-size: 16px; font-weight: 500; color: ${TEXT_1}; }

        /* ===== 主按钮（实心安心蓝） ===== */
        .bc-btn-primary {
          display: inline-flex; align-items: center; justify-content: center; gap: 6px;
          padding: 10px 20px; border-radius: 8px;
          background: ${ACCENT}; color: #fff; font-size: 14px; font-weight: 500;
          border: 0; cursor: pointer;
          transition: background .2s ease, opacity .2s ease;
        }
        .bc-btn-primary:hover { background: #4a7ee0; }
        .bc-btn-primary:disabled { opacity: .5; cursor: not-allowed; }

        /* ===== 次要按钮（轮廓） ===== */
        .bc-btn-secondary {
          display: inline-flex; align-items: center; justify-content: center; gap: 6px;
          padding: 10px 20px; border-radius: 8px;
          background: #fff; color: ${ACCENT}; font-size: 14px; font-weight: 500;
          border: 1px solid ${ACCENT}66; cursor: pointer;
          transition: background .2s ease, border-color .2s ease;
        }
        .bc-btn-secondary:hover { background: ${ACCENT_SOFT}; border-color: ${ACCENT}; }
        .bc-btn-secondary:disabled { opacity: .5; cursor: not-allowed; }

        /* ===== 表单控件（柔感统一：圆角8px，聚焦柔和蓝描边） ===== */
        input[type=text], input[type=password], input[type=time], input[type=number],
        input[type=date], input[type=search], textarea, select {
          border-radius: 8px;
          background: #FBFBFD;
          transition: border-color .18s ease, box-shadow .18s ease, background .18s ease;
        }
        input:hover, textarea:hover, select:hover {
          border-color: ${ACCENT}66;
          background: #FDFDFE;
        }
        input:focus, textarea:focus, select:focus {
          border-color: ${ACCENT};
          background: #FFFFFF;
          box-shadow: 0 0 0 3px rgba(91,141,239,.13);
        }

        /* ===== 记录类型标签 ===== */
        .bc-quick {
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
          padding: 14px 8px; border-radius: 10px;
          background: #fff; border: 1px solid ${LINE};
          cursor: pointer; text-align: center;
          transition: border-color .2s ease, background .2s ease;
        }
        .bc-quick:hover { border-color: ${ACCENT}88; background: ${ACCENT_SOFT}; }
        .bc-quick-icon {
          width: 44px; height: 44px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          background: ${ACCENT_SOFT}; color: ${ACCENT};
        }
        .bc-quick-name { font-size: 12px; font-weight: 500; color: ${TEXT_1}; }

        /* ===== 统计卡 ===== */
        .bc-stat {
          background: #fff; border: 1px solid ${LINE};
          border-radius: 10px; padding: 10px 12px;
        }
        .bc-sel {
          background: ${ACCENT_SOFT} !important; color: ${ACCENT} !important;
          border-color: ${ACCENT}88 !important;
        }
        .bc-chip {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 4px 12px; border-radius: 999px;
          font-size: 12px; font-weight: 500;
        }
        .bc-row:hover { background: ${ACCENT_SOFT}; }
      `}</style>

      {/* ===== 左侧竖列导航 ===== */}
      <aside className="bc-sidenav">
        <div className="bc-nav-greet">
          <div className="bc-nav-icon">
            <Baby className="h-6 w-6" strokeWidth={1.8} />
          </div>
          <div className="bc-nav-name">{settings.name || '宝宝'}</div>
          <div className="bc-nav-sub">出生第 {ageDaysPlus(settings.birth)} 天</div>
        </div>
        <nav className="bc-nav">
          {NAV.map(({ group, items }) => (
            <div key={group} className="bc-nav-group">
              <div className="bc-nav-group-title">{group}</div>
              {items.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setPage(id)}
                  className={`bc-nav-item ${page === id ? 'active' : ''}`}
                >
                  <Icon className="bc-nav-ic" strokeWidth={1.7} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {/* ===== 右侧内容区 ===== */}
      <main className="bc-main">

      {/* ===== 今日首页 ===== */}
      {page === 'home' && (
        <div className="space-y-5 animate-fade-in">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard type="milk"  label="今日喂奶" value={`${kMilk.length} 次`} sub={`共 ${kMilk.reduce((y, M) => y + (+M.amount || 0), 0)}ml`} color={TYPES.milk.color} onClick={() => setQuickType('milk')} />
            <KpiCard type="poop"  label="今日排便" value={`${kPoop.length} 次`} sub={kPoop.length ? summarize(kPoop[kPoop.length - 1]) : '—'} color={TYPES.poop.color} onClick={() => setQuickType('poop')} />
            <KpiCard type="pee"   label="今日排尿" value={`${kPee.length} 片`} sub="—" color={TYPES.pee.color} onClick={() => setQuickType('pee')} />
            <KpiCard type="sleep" label="今日睡眠" value={`${sleepTotal.toFixed(1)} h`} sub={`夜间 ${nightSleep.toFixed(1)}h`} color={TYPES.sleep.color} onClick={() => setQuickType('sleep')} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-stretch">
            <div className="bc-card bc-card-hover lg:col-span-3 flex flex-col">
              <SectionHeader
                icon={Zap}
                title="快捷记录"
                right={<span className="text-[12px] text-[#86909C]">{Object.keys(TYPES).length} 项</span>}
              />
              <div className="grid grid-cols-3 gap-3 mt-2">
                {Object.keys(TYPES).map((y) => {
                  const Icon = TYPES[y].icon;
                  return (
                    <button
                      key={y}
                      onClick={() => setQuickType(y)}
                      className="bc-quick"
                    >
                      <span className="bc-quick-icon" style={{ background: `${TYPES[y].color}66` }}>
                        <Icon className="h-5 w-5" strokeWidth={1.8} />
                      </span>
                      <span className="bc-quick-name">{TYPES[y].name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bc-card bc-card-hover lg:col-span-2 flex flex-col">
              <SectionHeader
                icon={Sparkles}
                title="智能预测"
                right={<span className="text-[12px] text-[#86909C]">{predictions.length} 条</span>}
              />
              <div className="space-y-2 mt-2 flex-1">
                {predictions.slice(0, 4).map((y) => PredRow(y, renderPredItem))}
                {predictions.length === 0 && <div className="py-8 text-center text-[#86909C] text-sm">记录后自动生成预测</div>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
            <div className="bc-card bc-card-hover lg:col-span-1 flex flex-col">
              <SectionHeader icon={Clock} title="今日作息时间轴" right={<span className="text-[12px] text-[#86909C]">{timeline.length} 条</span>} />
              <div className="flex-1 min-h-0 mt-2 overflow-y-auto pr-1 space-y-1.5">
                {timeline.map((y) => (
                  <div key={y.id} className="bc-row flex items-center gap-2.5 p-2.5 rounded-lg bg-[#f8f9fa] border-l-[3px] hover:bg-[#f1f3f5] transition-colors" style={{ borderColor: TYPES[y.type].color }}>
                    <span className="text-[11px] text-[var(--text-3)] tabular-nums w-11 shrink-0 font-mono">{formatTime(y.time)}</span>
                    <span className="h-6 w-6 rounded-md flex items-center justify-center shrink-0" style={{ background: `${TYPES[y.type].color}22`, color: TYPES[y.type].color }}>
                      {(() => {
                        const Icon = TYPES[y.type].icon;
                        return <Icon className="h-3.5 w-3.5" />;
                      })()}
                    </span>
                    <span className="text-[12.5px] text-[var(--text-1)] truncate">{summarize(y)}</span>
                  </div>
                ))}
                {timeline.length === 0 && <div className="py-8 text-center text-[var(--text-3)] text-sm">今天还没有记录</div>}
              </div>
            </div>

            <div className="bc-card bc-card-hover lg:col-span-1 flex flex-col">
              <SectionHeader icon={TrendingUp} title="近 7 天奶量趋势" />
              <div className="flex-1 min-h-[240px] mt-2">
                <TrendChart data={milkTrend} color={ACCENT} unit="ml" fill />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== 添加记录 ===== */}
      {page === 'record' && <RecordPage records={records} settings={settings} onAdd={addRecord} onImport={importRecords} />}

      {/* ===== 母婴台账：宝宝档案 / 妈妈护理 / 宝宝每日 / 换尿布 / 进食记录 ===== */}
      {page === 'profile' && (
        <div className="space-y-4 animate-fade-in">
          <ImportPanel
            onImport={doImport}
            hasData={!!(momDaily.length || babyDaily.length || diaper.length || feed.length || records.length)}
          />
          <ProfilePage profile={profile} onSave={saveProfile} />
        </div>
      )}
      {page === 'mom' && <MomPage momDaily={momDaily} onAdd={addMom} onDelete={delMom} />}
      {page === 'baby' && <BabyDailyPage babyDaily={babyDaily} onAdd={addBaby} onDelete={delBaby} />}
      {page === 'diaper' && <DiaperPage diaper={diaper} onAdd={addDiaper} onDelete={delDiaper} />}
      {page === 'feed' && <FeedPage feed={feed} onAdd={addFeed} onDelete={delFeed} />}

      {/* ===== 趋势统计 ===== */}
      {page === 'trend' && (
        <div className="space-y-5 animate-fade-in">
          {/* 上方：三张趋势图卡片横向等宽排列 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="bc-card bc-card-hover p-5">
              <SectionHeader icon={TrendingUp} title="每日总奶量" right={<UnitTag color={ACCENT}>ml</UnitTag>} />
              <TrendChart data={milkTrend} labels={trendLabels} color={ACCENT} unit="ml" height={210} />
            </div>
            <div className="bc-card bc-card-hover p-5">
              <SectionHeader icon={Moon} title="每日睡眠时长" right={<UnitTag color="#C7D2FE">h</UnitTag>} />
              <TrendChart data={sleepTrend} labels={trendLabels} color="#C7D2FE" unit="h" height={210} />
            </div>
            <div className="bc-card bc-card-hover p-5">
              <SectionHeader icon={Droplets} title="每日排便次数" right={<UnitTag color="#B7E4C7">次</UnitTag>} />
              <TrendChart data={typeCountTrend('poop')} labels={trendLabels} color="#B7E4C7" unit="次" height={210} />
            </div>
          </div>

          {/* 下方：周期数据汇总区（四色区分，层次清晰） */}
          <div className="bc-card bc-card-hover p-5">
            <SectionHeader icon={BarChart3} title="周期数据汇总" right={<span className="text-[12px] text-[#86909C]">今日</span>} />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <KpiMini color="#5B8DEF" bg="#EEF4FF" value={kMilk.length} label="今日喂奶" unit="次" />
              <KpiMini color="#40B57D" bg="#EAF6F1" value={kPoop.length} label="今日排便" unit="次" />
              <KpiMini color="#0CA678" bg="#E7F7F2" value={kPee.length} label="今日排尿" unit="片" />
              <KpiMini color="#7048E8" bg="#F0ECFC" value={sleepTotal.toFixed(1)} label="今日睡眠" unit="h" />
            </div>
          </div>
        </div>
      )}

      {/* ===== 预测提醒 ===== */}
      {page === 'predict' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bc-card bc-card-hover p-5">
            <SectionHeader icon={Sparkles} title="喂养 / 护理预测" right={<span className="text-[12px] text-[#86909C]">{predictions.length} 条</span>} />
            <div className="space-y-2">
              {predictions.map((y) => PredRow(y, renderPredItem))}
              {predictions.length === 0 && <div className="py-8 text-center text-[var(--text-3)] text-sm">记录越多，预测越准</div>}
            </div>
          </div>

          <div className="bc-card bc-card-hover p-5">
            <SectionHeader icon={Scale} title="月龄参考对比" />
            {ref ? (
              <div>
                <RefBar label="每日喂奶" cur={kMilk.length} range={ref.milkCount} unit="次" />
                <RefBar label="每日睡眠" cur={sleepTotal} range={ref.sleep} unit="h" />
                <RefBar label="每日排便" cur={kPoop.length} range={ref.poop} unit="次" />
                <RefBar label="每日排尿" cur={kPee.length} range={ref.pee} unit="片" />
              </div>
            ) : (
              <div className="py-6 text-center text-[var(--text-3)] text-sm">先在「宝宝档案」填写宝宝出生日期</div>
            )}
          </div>

          {/* 预测规则说明 · 折叠面板（默认收起） */}
          <div className="bc-card bc-card-hover p-0 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowRules((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#F7F8FA] transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2 text-[16px] font-medium text-[#333F51]">
                <span className="bc-title-icon" style={{ background: `${ACCENT}26`, color: ACCENT }}>
                  <Info className="h-4 w-4" strokeWidth={1.8} />
                </span>
                预测规则说明
              </span>
              <span className="text-[#86909C] text-[13px] transition-transform duration-200" style={{ transform: showRules ? 'rotate(180deg)' : 'none' }}>▾</span>
            </button>
            {showRules && (
              <div className="px-5 pb-5 space-y-2 text-[12px] text-[var(--text-2)]">
                {[
                  ['喂奶预测', '昼夜加权 EWMA + 月龄参考区间校正，白天与夜间分别建模。'],
                  ['排便预警', '0-7天超12h、8-28天超24h、满月后超48h未排便即提醒。'],
                  ['奶量预警', '当日总奶量低于近7天均值70%时提醒。'],
                  ['体温预警', '≥37.5℃黄警，≥38℃红警。'],
                  ['排尿预警', '24小时少于6次提示可能脱水。'],
                ].map(([y, M]) => (
                  <div key={y} className="flex gap-2.5 items-start">
                    <span className="h-1.5 w-1.5 rounded-full mt-1.5 shrink-0" style={{ background: ACCENT }} />
                    <p><b className="text-[var(--text-1)] font-semibold">{y}</b>：{M}</p>
                  </div>
                ))}
                <p className="text-[var(--text-3)] pt-1 border-t border-[#E5E6EB] mt-2">所有预测仅供参考，不能替代医生判断。</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== 历史记录 ===== */}
      {page === 'history' && (
        <div className="bc-card bc-card-hover animate-fade-in">
          <SectionHeader
            icon={History}
            title="历史记录"
            right={<span className="text-[12px] text-[#86909C]">{historyList.length} 条</span>}
          />
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <DateTimePicker mode="date" value={historyFrom} onChange={setHistoryFrom} width="10.5rem" />
            <span className="text-[var(--text-3)] text-[12px]">至</span>
            <DateTimePicker mode="date" value={historyTo} onChange={setHistoryTo} width="10.5rem" />
            <div className="flex gap-1 flex-wrap ml-1">
              <button onClick={() => setHistoryType('')} className={`px-2.5 py-1 rounded-lg text-[12px] transition-colors ${historyType === '' ? 'bc-sel' : 'text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--hover)]'}`}>全部</button>
              {Object.keys(TYPES).map((y) => (
                <button key={y} onClick={() => setHistoryType(y)} className={`px-2.5 py-1 rounded-lg text-[12px] transition-colors ${historyType === y ? 'bc-sel' : 'text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--hover)]'}`}>{TYPES[y].name}</button>
              ))}
            </div>
            <button className="bc-btn-primary ml-1" style={{ padding: '8px 16px' }}>
              <Search className="h-4 w-4" strokeWidth={1.9} />查询
            </button>
          </div>

          <div className="overflow-y-auto max-h-[60vh] rounded-xl border border-[#E5E6EB]">
            {historyGroups.length === 0 && (
              <div className="py-12 text-center text-[var(--text-3)]">没有符合条件的记录</div>
            )}
            {historyGroups.map((g) => (
              <div key={g.date} className="border-b border-[#EDEFF3] last:border-b-0">
                {/* 日期分组标题 + 全部删除 */}
                <div className="flex items-center justify-between gap-3 px-4 py-2.5" style={{ background: '#F7F8FA' }}>
                  <span className="flex items-center gap-3">
                    <span className="text-[13px] font-semibold text-[#333F51]">{dayTitle(g.date)}</span>
                    <span className="text-[11px] text-[#86909C]">{g.items.length} 条</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeRecordsByDate(g.date)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[7px] text-[12px] font-medium text-[#86909C] border border-[#E5E6EB] bg-white hover:text-[#E5484D] hover:border-[#F3C1C4] hover:bg-[#FDF3F3] transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />全部删除
                  </button>
                </div>
                {/* 该日期下的每条记录：hover 即现删除按钮 */}
                {g.items.map((y) => (
                  <div
                    key={y.id}
                    className="group flex items-center gap-3 px-4 py-2.5 border-t border-[#F1F3F6] hover:bg-[#FAFBFC] transition-colors"
                  >
                    <span className="text-[12px] text-[var(--text-2)] tabular-nums font-mono shrink-0">{formatDateTime(y.time)}</span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0" style={{ background: `${TYPES[y.type].color}22`, color: TYPES[y.type].color }}>{TYPES[y.type].name}</span>
                    <span className="flex-1 min-w-0 text-[12.5px] text-[var(--text-1)] truncate">{summarize(y)}</span>
                    <button
                      type="button"
                      onClick={() => removeRecord(y.id)}
                      className="shrink-0 p-1.5 rounded-lg text-[var(--text-4)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-colors lg:opacity-0 lg:group-hover:opacity-100"
                      title="删除"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 快捷记录弹窗 */}
      {quickType && <QuickModal type={quickType} onClose={() => setQuickType(null)} onSave={addRecord} settings={settings} />}

      {/* Toast */}
      {toast && <div className="toast toast-success">{toast}</div>}

      </main>
    </div>
  );
}

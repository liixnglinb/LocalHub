import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Baby, Milk, Droplets, Moon, Thermometer, Scale, Sun, HeartPulse,
  Frown, Plus, Trash2, X, Sparkles, Calendar, Clock, TrendingUp,
  History, Settings2, Check, Zap, BarChart3, CalendarDays,
  ChevronRight, Home as HomeIcon, NotebookPen, Baby as BabyIcon,
  Download, AlertTriangle,
} from 'lucide-react';
import TrendChart from '../components/TrendChart';
import DateTimePicker from '../components/DateTimePicker';

/* ================= 配置与常量 ================= */
const LS_KEY = 'baby-care';

const TYPES = {
  milk:    { name: '喂奶', icon: Milk,     color: '#9B8AFF' },
  poop:    { name: '排便', icon: Droplets, color: '#4ADE9A' },
  pee:     { name: '排尿', icon: Droplets, color: '#6EC5FF' },
  sleep:   { name: '睡眠', icon: Moon,     color: '#FFC38A' },
  temp:    { name: '体温', icon: Thermometer, color: '#FF8FA3' },
  weight:  { name: '体重', icon: Scale,    color: '#E5B983' },
  jaundice:{ name: '黄疸', icon: Sun,      color: '#F5DE6A' },
  care:    { name: '护理', icon: HeartPulse, color: '#8E9EFF' },
  cry:     { name: '哭闹', icon: Frown,    color: '#FFA58A' },
};

const DEFAULT_SETTINGS = { name: '宝宝', birth: '', weight: '', height: '' };

const SHAPE_MAP = { unknown:'不知道', normal:'正常', meconium:'胎便', gold:'金黄糊状', paste:'膏状', watery:'稀水样', hard:'干硬', egg:'蛋花汤' };

const TABS = [
  { id: 'home',     label: '今日',     icon: HomeIcon },
  { id: 'record',   label: '记录',     icon: NotebookPen },
  { id: 'trend',    label: '趋势',     icon: TrendingUp },
  { id: 'predict',  label: '预测',     icon: Sparkles },
  { id: 'history',  label: '历史',     icon: History },
  { id: 'settings', label: '设置',     icon: Settings2 },
];

const QUICK_TYPES = ['milk','poop','pee','sleep','temp','weight','jaundice','care','cry'];

/* ================= 纯函数工具 ================= */
const pad = (n) => String(n).padStart(2, '0');
const fmtDateTime = (t) => {
  if (!t) return '';
  const d = new Date(t);
  if (isNaN(d)) return '';
  return `${d.getMonth()+1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fmtTime = (t) => {
  if (!t) return '--:--';
  const d = new Date(t); if (isNaN(d)) return '--:--';
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const isSameDay = (a, b) => {
  const x = new Date(a), y = new Date(b);
  return x.getFullYear()===y.getFullYear() && x.getMonth()===y.getMonth() && x.getDate()===y.getDate();
};
const ageDays = (birth) => {
  if (!birth) return null;
  const b = new Date(birth); if (isNaN(b)) return null;
  return Math.floor((Date.now() - b.getTime()) / 86400000);
};
const ageLabel = (birth) => {
  const d = ageDays(birth);
  if (d == null) return '宝宝';
  if (d < 30) return `${d} 天`;
  if (d < 365) return `${Math.floor(d/30)} 个月${d%30>0?` ${d%30} 天`:''}`;
  return `${Math.floor(d/365)} 岁`;
};

/* 参考月龄对照表（WHO 简化版） */
const refTable = (days) => {
  const d = Math.max(0, Math.min(days, 365));
  if (d < 7) return { milk: [50, 80, 8], milkCount: [8, 12], sleep: [16, 20] };
  if (d < 30) return { milk: [80, 120, 8], milkCount: [7, 9], sleep: [15, 18] };
  if (d < 90) return { milk: [120, 150, 7.5], milkCount: [6, 8], sleep: [14, 17] };
  if (d < 180) return { milk: [150, 200, 7], milkCount: [5, 6], sleep: [13, 15] };
  if (d < 365) return { milk: [200, 250, 5], milkCount: [4, 5], sleep: [12, 14] };
  return { milk: [250, 300, 4], milkCount: [3, 5], sleep: [11, 13] };
};

/* ================= 小组件（SectionHeader / KPI / RecordField 等） ================= */
function SectionHeader({ icon: Icon, title, subtitle, right, accent = '#6EC5FF' }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className="h-8 w-8 rounded-[10px] flex items-center justify-center shrink-0"
          style={{
            background: `${accent}1F`,
            border: `1px solid ${accent}36`,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.05)`,
          }}
        >
          <Icon className="h-4 w-4" strokeWidth={1.7} style={{ color: accent }} />
        </div>
        <div className="min-w-0">
          <div className="text-[13.5px] font-semibold bc-text tracking-tight truncate">{title}</div>
          {subtitle && <div className="text-[10.5px] text-white/40 leading-snug mt-0.5 truncate">{subtitle}</div>}
        </div>
      </div>
      {right}
    </div>
  );
}

function KpiCard({ label, value, unit, sub, accent = '#6EC5FF', large = false }) {
  return (
    <div
      className="bc-card p-4 relative overflow-hidden transition-all hover:-translate-y-[1px]"
      style={{ '--bc-card-accent': accent + '1A', '--bc-card-border': accent + '33' }}
    >
      <span aria-hidden className="absolute -right-10 -top-10 h-24 w-24 rounded-full blur-2xl pointer-events-none"
            style={{ background: `radial-gradient(closest-side, ${accent}33, transparent 70%)` }} />
      <div className="relative">
        <div className="text-[10px] uppercase tracking-[0.16em] font-semibold" style={{ color: accent }}>{label}</div>
        <div className="mt-2 flex items-baseline gap-1">
          <div
            className={`font-bold bc-number tracking-tight leading-none ${large ? 'text-[40px]' : 'text-[30px]'}`}
            style={{ color: accent }}
          >
            {value}
          </div>
          {unit && <div className="text-[12px] font-medium text-white/50">{unit}</div>}
        </div>
        {sub && <div className="mt-2 text-[11px] text-white/45 leading-snug">{sub}</div>}
      </div>
    </div>
  );
}

function RecordField({ label, children }) {
  return (
    <div>
      <label className="block text-[11px] text-white/50 font-medium mb-1.5">{label}</label>
      {children}
    </div>
  );
}

/* ================= 预测逻辑 ================= */
function predictNext({ milkRecords, sleepRecords, birth }) {
  const now = Date.now();
  // 下次喂奶：基于最近 3 次喂奶间隔预测
  const lasts = milkRecords.slice(-3);
  let nextMilk = null, nextMilkConfidence = 0;
  if (lasts.length >= 2) {
    const intervals = [];
    for (let i = 1; i < lasts.length; i++) intervals.push(lasts[i].time - lasts[i-1].time);
    const avg = intervals.reduce((a,b) => a+b, 0) / intervals.length;
    const last = lasts[lasts.length-1].time;
    nextMilk = last + avg;
    nextMilkConfidence = lasts.length >= 3 ? 0.82 : 0.62;
  } else if (birth) {
    const ref = refTable(ageDays(birth));
    const hours = 24 / ((ref.milkCount[0] + ref.milkCount[1]) / 2);
    nextMilk = now + hours * 3600_000;
    nextMilkConfidence = 0.5;
  }
  // 下次睡眠：
  let nextSleep = null, nextSleepConfidence = 0;
  const lastSleepEnd = sleepRecords.at(-1)?.endTime || sleepRecords.at(-1)?.time;
  if (lastSleepEnd) {
    nextSleep = new Date(lastSleepEnd).getTime() + 2.2 * 3600_000;
    nextSleepConfidence = 0.6;
  }
  return { nextMilk, nextMilkConfidence, nextSleep, nextSleepConfidence };
}

/* ================= 快速记录弹窗（QuickModal） ================= */
function QuickModal({ type, onClose, onSave, settings }) {
  const info = TYPES[type];
  const Icon = info.icon;
  const [form, setForm] = useState({ time: Date.now(), type });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const chip = (active) => `btn ${active ? 'btn-primary' : 'btn-default'} !py-[6px] !px-[11px] !text-[11.5px]`;

  const submit = () => {
    if (type === 'sleep') {
      if (!form.duration && form.endTime && form.time) {
        const ms = new Date(form.endTime) - new Date(form.time);
        if (ms > 0) set('duration', +(ms / 3600_000).toFixed(2));
      }
    }
    onSave(form);
    onClose();
  };

  const title = {
    milk:   { items: [['breast','亲喂'],['bottle','瓶喂母乳'],['formula','配方奶']], amt: true },
    poop:   { shapes: [['gold','金黄'],['paste','膏状'],['watery','稀水'],['hard','干硬'],['egg','蛋花汤'],['unknown','未知']] },
    pee:    { amounts: ['正常','少量','中等','大量'], colors: ['正常','清亮','深黄','偏红'] },
    sleep:  { qualities: ['安稳','易醒','哭闹'], duration: true },
    temp:   { temp: true, sites: ['腋温','额温','肛温'] },
    weight: { weight: true },
    jaundice: { j: true, sites: ['额头','胸部','腹部','腿部'] },
    care:   { kinds: [['cord','脐带'],['touch','抚触'],['bath','洗澡'],['medicine','用药'],['event','事件']], detail: true },
    cry:    { dur: true, causes: ['饿了','尿湿','肠胀气','困倦','要抱抱'], levels: ['轻度','中等','剧烈'], soothes: ['喂奶','拍嗝','抱哄','白噪音','萝卜蹲'] },
  }[type];

  const content = () => {
    switch (type) {
      case 'milk':
        return (
          <>
            <div className="grid grid-cols-1 gap-3">
              <RecordField label="喂养方式">
                <div className="flex gap-2 flex-wrap">{title.items.map(([v,l]) =>
                  <button key={v} onClick={()=>set('kind',v)} className={chip(form.kind===v)}>{l}</button>)}
                </div>
              </RecordField>
              <RecordField label="奶量（ml）">
                <input type="number" min="0" value={form.amount ?? ''}
                       onChange={(e)=>set('amount',e.target.value)}
                       placeholder="自动预测值可改" className="w-full no-spin" />
              </RecordField>
            </div>
          </>
        );
      case 'poop':
        return (
          <>
            <RecordField label="性状">
              <div className="flex gap-2 flex-wrap">{title.shapes.map(([v,l]) =>
                <button key={v} onClick={()=>set('shape',v)} className={chip(form.shape===v)}>{l}</button>)}
              </div>
            </RecordField>
          </>
        );
      case 'pee':
        return (
          <>
            <RecordField label="尿量">
              <div className="flex gap-2 flex-wrap">{title.amounts.map(v =>
                <button key={v} onClick={()=>set('uamount',v)} className={chip(form.uamount===v)}>{v}</button>)}
              </div>
            </RecordField>
            <RecordField label="颜色">
              <div className="flex gap-2 flex-wrap">{title.colors.map(v =>
                <button key={v} onClick={()=>set('color',v)} className={chip(form.color===v)}>{v}</button>)}
              </div>
            </RecordField>
          </>
        );
      case 'sleep':
        return (
          <>
            <div className="grid grid-cols-2 gap-3">
              <RecordField label="开始时间"><DateTimePicker value={form.time || ''} onChange={v=>set('time',v)} /></RecordField>
              <RecordField label="结束时间（选填）"><DateTimePicker value={form.endTime || ''} onChange={v=>set('endTime',v)} /></RecordField>
            </div>
            <RecordField label="睡眠时长（h）">
              <input type="number" value={form.duration ?? ''}
                     onChange={(e)=>set('duration',e.target.value)}
                     className="w-full no-spin" step="0.5" placeholder="留空自动计算" />
            </RecordField>
            <RecordField label="睡眠质量">
              <div className="flex gap-2 flex-wrap">{title.qualities.map(v =>
                <button key={v} onClick={()=>set('quality',v)} className={chip(form.quality===v)}>{v}</button>)}
              </div>
            </RecordField>
          </>
        );
      case 'temp':
        return (
          <>
            <RecordField label="体温（℃）">
              <input type="number" value={form.value ?? ''} step="0.1" className="w-full no-spin"
                     placeholder="36.5" onChange={(e)=>set('value',e.target.value)} />
            </RecordField>
            <RecordField label="测量部位">
              <div className="flex gap-2 flex-wrap">{title.sites.map(v =>
                <button key={v} onClick={()=>set('site',v)} className={chip(form.site===v)}>{v}</button>)}
              </div>
            </RecordField>
          </>
        );
      case 'weight':
        return (
          <RecordField label="体重（kg）">
            <input type="number" value={form.value ?? ''} step="0.01" className="w-full no-spin"
                   placeholder={settings.weight || '3.20'}
                   onChange={(e)=>set('value',e.target.value)} />
          </RecordField>
        );
      case 'jaundice':
        return (
          <>
            <RecordField label="黄疸值（mg/dL）">
              <input type="number" value={form.value ?? ''} step="0.1" className="w-full no-spin"
                     placeholder="8.0" onChange={(e)=>set('value',e.target.value)} />
            </RecordField>
            <RecordField label="测量部位">
              <div className="flex gap-2 flex-wrap">{title.sites.map(v =>
                <button key={v} onClick={()=>set('site',v)} className={chip(form.site===v)}>{v}</button>)}
              </div>
            </RecordField>
          </>
        );
      case 'care':
        return (
          <>
            <RecordField label="护理类型">
              <div className="flex gap-2 flex-wrap">{title.kinds.map(([v,l]) =>
                <button key={v} onClick={()=>set('careKind',v)} className={chip(form.careKind===v)}>{l}</button>)}
              </div>
            </RecordField>
            <RecordField label="详情">
              <input type="text" value={form.detail || ''}
                     onChange={(e)=>set('detail',e.target.value)}
                     placeholder="如：脐带干燥无异常" className="w-full" />
            </RecordField>
          </>
        );
      case 'cry':
        return (
          <>
            <RecordField label="哭闹时长（分钟）">
              <input type="number" value={form.duration ?? ''} className="w-full no-spin"
                     onChange={(e)=>set('duration',e.target.value)} />
            </RecordField>
            <RecordField label="可能原因">
              <div className="flex gap-2 flex-wrap">{title.causes.map(v =>
                <button key={v} onClick={()=>set('cause',v)} className={chip(form.cause===v)}>{v}</button>)}
              </div>
            </RecordField>
            <RecordField label="程度">
              <div className="flex gap-2 flex-wrap">{title.levels.map(v =>
                <button key={v} onClick={()=>set('level',v)} className={chip(form.level===v)}>{v}</button>)}
              </div>
            </RecordField>
            <RecordField label="安抚方式">
              <div className="flex gap-2 flex-wrap">{title.soothes.map(v =>
                <button key={v} onClick={()=>set('soothe',v)} className={chip(form.soothe===v)}>{v}</button>)}
              </div>
            </RecordField>
          </>
        );
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bc-modal-bg animate-fadeIn"
         onClick={onClose}>
      <div
        className="bc-modal-card animate-scale-in w-full sm:w-[460px] rounded-t-[22px] sm:rounded-[22px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ '--bc-modal-accent': info.color }}
      >
        {/* 顶部彩色头部 */}
        <div className="px-5 py-4 flex items-center gap-3 bc-modal-head">
          <div className="h-10 w-10 rounded-[12px] flex items-center justify-center shrink-0"
               style={{
                 background: `${info.color}22`,
                 border: `1px solid ${info.color}40`,
                 boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), 0 0 20px -6px ${info.color}55`,
               }}>
            <Icon className="h-5 w-5" strokeWidth={1.7} style={{ color: info.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-semibold bc-text">快速记录 · {info.name}</div>
            <div className="text-[10.5px] text-white/45 mt-0.5">填写信息并保存</div>
          </div>
          <button onClick={onClose}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.06] transition">
            <X className="h-4 w-4" strokeWidth={1.8} />
          </button>
        </div>
        {/* 内容区 */}
        <div className="p-5 space-y-3.5">
          <RecordField label="发生时间"><DateTimePicker value={form.time || Date.now()} onChange={v=>set('time',v)} width="100%" /></RecordField>
          {content()}
          <div className="flex gap-2 pt-2 border-t border-white/[0.06] mt-2">
            <button onClick={onClose} className="btn btn-default flex-1">取消</button>
            <button onClick={submit} className="btn btn-primary flex-1"><Check className="h-4 w-4" />保存</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= 主页面组件 ================= */
export default function BabyCare() {
  const [records, setRecords] = useState(() => {
    try { const raw = localStorage.getItem(LS_KEY); if (raw) return JSON.parse(raw); } catch {}
    return [];
  });
  const [settings, setSettings] = useState(() => {
    try { const raw = localStorage.getItem(LS_KEY + ':settings'); if (raw) return JSON.parse(raw); } catch {}
    return DEFAULT_SETTINGS;
  });
  const [toast, setToast] = useState(null);
  const [page, setPage] = useState('home');
  const [quickType, setQuickType] = useState(null);
  const [historyDate, setHistoryDate] = useState('');

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(records)); } catch {}
  }, [records]);
  useEffect(() => {
    try { localStorage.setItem(LS_KEY + ':settings', JSON.stringify(settings)); } catch {}
  }, [settings]);

  const showToast = useCallback((msg, kind='success') => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 2200);
  }, []);

  /* ================= 数据衍生 ================= */
  const today = useMemo(() => {
    const start = new Date(); start.setHours(0,0,0,0);
    const end = new Date(); end.setHours(23,59,59,999);
    return records.filter(r => r.time >= start.getTime() && r.time <= end.getTime())
                  .sort((a,b) => b.time - a.time);
  }, [records]);

  const kMilk   = today.filter(r => r.type==='milk');
  const kPoop   = today.filter(r => r.type==='poop');
  const kPee    = today.filter(r => r.type==='pee');
  const sleepH  = today.filter(r => r.type==='sleep' && +r.duration>0).reduce((s,r)=>s+(+r.duration||0),0);
  const totalMilk = kMilk.reduce((s,r) => s + (+r.amount || 0), 0);

  const ref = useMemo(() => refTable(ageDays(settings.birth) || 30), [settings.birth]);
  const milkPredAmount = Math.round((ref.milk[0] + ref.milk[1]) / 2);

  /* ================= 趋势数据 ================= */
  const trendMeta = useMemo(() => {
    const labels = [], dataMilk = [], dataSleep = [], dataPoop = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      labels.push(`${d.getMonth()+1}/${d.getDate()}`);
      const s = new Date(d); s.setHours(0,0,0,0);
      const e = new Date(d); e.setHours(23,59,59,999);
      const day = records.filter(r => r.time >= s.getTime() && r.time <= e.getTime());
      dataMilk.push(Math.round(day.filter(r=>r.type==='milk').reduce((s,r)=>s+(+r.amount||0),0)));
      dataSleep.push(+day.filter(r=>r.type==='sleep' && +r.duration>0).reduce((s,r)=>s+(+r.duration||0),0).toFixed(1));
      dataPoop.push(day.filter(r=>r.type==='poop').length);
    }
    return { labels, dataMilk, dataSleep, dataPoop };
  }, [records]);

  const prediction = useMemo(() => predictNext({
    milkRecords: records.filter(r => r.type==='milk').sort((a,b)=>a.time-b.time),
    sleepRecords: records.filter(r => r.type==='sleep').sort((a,b)=>a.time-b.time),
    birth: settings.birth,
  }), [records, settings.birth]);

  const historyList = useMemo(() => {
    let list = records.slice().sort((a,b)=>b.time-a.time);
    if (historyDate) {
      const s = new Date(historyDate); s.setHours(0,0,0,0);
      const e = new Date(historyDate); e.setHours(23,59,59,999);
      list = list.filter(r => r.time >= s.getTime() && r.time <= e.getTime());
    }
    return list;
  }, [records, historyDate]);

  /* ================= 业务操作 ================= */
  const addRecord = useCallback((draft) => {
    const r = { id: Date.now() + '-' + Math.random().toString(36).slice(2,6), ...draft };
    if (!r.time) r.time = Date.now();
    setRecords((xs) => [r, ...xs]);
    showToast('记录已保存');
  }, [showToast]);

  const removeRecord = useCallback((id) => {
    setRecords((xs) => xs.filter(r => r.id !== id));
    showToast('已删除一条记录', 'error');
  }, [showToast]);

  /* ================= 渲染：快速记录按钮 ================= */
  const QuickButton = ({ t }) => {
    const info = TYPES[t];
    const I = info.icon;
    return (
      <button
        onClick={() => setQuickType(t)}
        className="bc-card p-3.5 text-left flex items-start gap-3 hover:-translate-y-[1px] transition-all group"
        style={{ '--bc-card-accent': info.color + '15', '--bc-card-border': info.color + '28' }}
      >
        <div className="h-9 w-9 rounded-[10px] flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 group-hover:-rotate-3"
             style={{
               background: `${info.color}1A`,
               border: `1px solid ${info.color}33`,
               boxShadow: `inset 0 1px 0 rgba(255,255,255,0.05), 0 0 16px -6px ${info.color}33`,
             }}>
          <I className="h-[18px] w-[18px]" strokeWidth={1.7} style={{ color: info.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12.5px] font-semibold bc-text">{info.name}</div>
          <div className="text-[10.5px] text-white/40 mt-0.5">一键记录</div>
        </div>
        <Plus className="h-4 w-4 shrink-0 text-white/25 group-hover:text-white/60 transition-colors" strokeWidth={1.8} />
      </button>
    );
  };

  /* ================= 记录页 ================= */
  const [activeForm, setActiveForm] = useState('milk');
  const [form, setForm] = useState({
    type: 'milk', time: Date.now(),
    kind: 'breast', amount: '',
    shape: 'normal', color: 'gold', abnormal: [],
    uamount: '正常',
    endTime: '', duration: '', quality: '安稳',
    value: '', site: '',
    cause: '', level: '', soothe: '',
    careKind: 'cord', detail: '',
    note: '',
  });
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleArr = (k, item) => setForm(f => {
    const arr = f[k] || []; const next = arr.includes(item) ? arr.filter(x=>x!==item) : [...arr, item];
    return { ...f, [k]: next };
  });
  const submitForm = () => {
    if (form.type === 'sleep' && !form.duration && form.endTime && form.time) {
      const ms = new Date(form.endTime) - new Date(form.time);
      if (ms > 0) setF('duration', +(ms / 3600_000).toFixed(2));
    }
    addRecord({ ...form, amount: form.type==='milk' && !form.amount ? milkPredAmount : form.amount });
    // 重置常用字段
    setForm((f) => ({
      ...f,
      time: Date.now(), endTime: '', duration: '',
      abnormal: [], note: '', detail: '', cause: '', soothe: '',
    }));
  };

  const formChip = (active) => `btn ${active ? 'btn-primary' : 'btn-default'} !py-[6px] !px-[11px] !text-[11.5px]`;

  /* ================= Tab 栏样式（胶囊） ================= */
  const renderTabs = () => (
    <div className="bc-tabs flex-wrap">
      {TABS.map(({ id, label, icon: Icon }) => {
        const active = page === id;
        return (
          <button
            key={id}
            onClick={() => setPage(id)}
            className={`bc-tab ${active ? 'active' : ''}`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.6} />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );

  /* ================= 页面切换 ================= */
  const PageHome = () => (
    <div className="space-y-4 animate-fade-in">
      {/* 顶部 4 KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="今日总奶量" value={totalMilk} unit="ml"
                 accent="#9B8AFF" large
                 sub={`参考 ${ref.milk[0]*((ref.milkCount[0]+ref.milkCount[1])/2).toFixed(0)}–${ref.milk[1]*Math.ceil((ref.milkCount[0]+ref.milkCount[1])/2)} ml`} />
        <KpiCard label="今日喂奶" value={kMilk.length} unit="次"
                 accent="#6EC5FF"
                 sub={`推荐每日 ${ref.milkCount[0]}–${ref.milkCount[1]} 次`} />
        <KpiCard label="今日睡眠" value={sleepH.toFixed(1)} unit="h"
                 accent="#FFC38A"
                 sub={`推荐每日 ${ref.sleep[0]}–${ref.sleep[1]} 小时`} />
        <KpiCard label="今日排便" value={kPoop.length} unit="次"
                 accent="#4ADE9A"
                 sub={`${kPee.length} 次排尿`} />
      </div>

      {/* 两列：快捷记录（3/5）+ 智能预测（2/5） */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        <div className="bc-card p-5 lg:col-span-3">
          <SectionHeader icon={Zap} title="快捷记录" accent="#6EC5FF"
            right={<div className="text-[10px] text-white/35 uppercase tracking-[0.16em] font-semibold">{QUICK_TYPES.length} 项</div>}
          />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
            {QUICK_TYPES.map(t => <QuickButton key={t} t={t} />)}
          </div>
        </div>
        <div className="bc-card p-5 lg:col-span-2">
          <SectionHeader icon={Sparkles} title="智能预测" accent="#FFB6C1" />
          <div className="space-y-2.5">
            <div className="bc-forecast">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="bc-dot" style={{ background: '#9B8AFF', boxShadow: '0 0 10px #9B8AFF88' }} />
                  <div className="text-[11.5px] text-white/70">下次喂奶</div>
                </div>
                {prediction.nextMilkConfidence > 0 && (
                  <span className="text-[10px] text-white/40 font-medium">置信 {Math.round(prediction.nextMilkConfidence*100)}%</span>
                )}
              </div>
              <div className="mt-1 text-[18px] font-bold bc-number" style={{ color: '#9B8AFF' }}>
                {prediction.nextMilk ? fmtDateTime(prediction.nextMilk) : <span className="text-white/40 text-[13px] font-medium">需更多数据</span>}
              </div>
            </div>
            <div className="bc-forecast">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="bc-dot" style={{ background: '#FFC38A', boxShadow: '0 0 10px #FFC38A88' }} />
                  <div className="text-[11.5px] text-white/70">下次睡眠</div>
                </div>
                {prediction.nextSleepConfidence > 0 && (
                  <span className="text-[10px] text-white/40 font-medium">置信 {Math.round(prediction.nextSleepConfidence*100)}%</span>
                )}
              </div>
              <div className="mt-1 text-[18px] font-bold bc-number" style={{ color: '#FFC38A' }}>
                {prediction.nextSleep ? fmtDateTime(prediction.nextSleep) : <span className="text-white/40 text-[13px] font-medium">需更多数据</span>}
              </div>
            </div>
            <div className="glass-inset p-3 text-[11px] text-white/50 leading-relaxed rounded-[10px]">
              预测基于最近 3 次事件的间隔，并结合月龄参考区间；数据越多越准。
            </div>
          </div>
        </div>
      </div>

      {/* 今日事件时间轴 + 趋势 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        <div className="bc-card p-5 lg:col-span-3">
          <SectionHeader icon={Clock} title="今日事件时间轴" accent="#6EC5FF"
            right={<div className="chip">{today.length} 条</div>} />
          {today.length === 0 ? (
            <div className="text-[12px] text-white/40 text-center py-14 leading-relaxed">
              今天还没有记录<br />
              <span className="text-white/25">用上方「快捷记录」点一下就添加</span>
            </div>
          ) : (
            <div className="relative pl-5 border-l border-white/[0.06] space-y-4">
              {today.map(r => {
                const info = TYPES[r.type];
                const I = info.icon;
                return (
                  <div key={r.id} className="relative group">
                    <span className="absolute -left-[22px] top-0 h-2.5 w-2.5 rounded-full"
                          style={{
                            background: info.color,
                            boxShadow: `0 0 12px ${info.color}88`,
                          }} />
                    <div className="bc-timeline-item p-3.5 flex items-start gap-3">
                      <div className="h-8 w-8 rounded-[9px] flex items-center justify-center shrink-0"
                           style={{ background: `${info.color}1A`, border: `1px solid ${info.color}30` }}>
                        <I className="h-4 w-4" strokeWidth={1.6} style={{ color: info.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="text-[12.5px] font-semibold bc-text">{info.name}</div>
                          <span className="text-[10.5px] text-white/40 font-mono tabular-nums">{fmtTime(r.time)}</span>
                          {r.amount && <span className="text-[11px] text-white/60 tabular-nums">奶量 {r.amount} ml</span>}
                          {r.duration && <span className="text-[11px] text-white/60 tabular-nums">时长 {r.duration} h</span>}
                          {r.value && <span className="text-[11px] text-white/60 tabular-nums">数值 {r.value}</span>}
                          {r.quality && <span className="text-[11px] text-white/50">{r.quality}</span>}
                        </div>
                        {r.note && <div className="mt-0.5 text-[11px] text-white/45 leading-snug">备注：{r.note}</div>}
                      </div>
                      <button onClick={() => removeRecord(r.id)}
                              className="h-7 w-7 rounded-md flex items-center justify-center text-white/25 hover:text-rose-300 hover:bg-rose-300/[0.08] opacity-0 group-hover:opacity-100 transition">
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.7} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bc-card p-5 lg:col-span-2">
          <SectionHeader icon={TrendingUp} title="近 7 天奶量趋势" accent="#6EC5FF" />
          <TrendChart
            data={trendMeta.dataMilk}
            labels={trendMeta.labels}
            color="#9B8AFF"
            unit="ml"
            height={150}
          />
        </div>
      </div>
    </div>
  );

  const PageRecord = () => {
    const info = TYPES[activeForm];
    return (
      <div className="space-y-4 animate-fade-in">
        {/* 类型标签 */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(TYPES).map(([k, info]) => {
            const Icon = info.icon; const active = activeForm === k;
            return (
              <button key={k} onClick={() => { setActiveForm(k); setF('type', k); }}
                      className={`flex items-center gap-1.5 px-3 py-[7px] rounded-[10px] text-[12px] font-medium transition-all ${
                        active ? '' : 'glass-inset hover:bg-white/[0.08] text-white/65'
                      }`}
                      style={active ? {
                        background: `${info.color}1F`,
                        color: info.color,
                        border: `1px solid ${info.color}38`,
                        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.05), 0 0 20px -8px ${info.color}44`,
                      } : {}}>
                <Icon className="h-3.5 w-3.5" strokeWidth={1.6} />
                {info.name}
              </button>
            );
          })}
        </div>

        <div className="bc-card p-[22px] max-w-2xl">
          <SectionHeader icon={info.icon} title={`记录${info.name}`} accent={info.color} />
          <div className="space-y-4">
            <RecordField label="发生时间"><DateTimePicker value={form.time || Date.now()} onChange={v=>setF('time',v)} width="100%" /></RecordField>

            {activeForm === 'milk' && (
              <>
                <RecordField label="喂养方式">
                  <div className="flex gap-2 flex-wrap">{[['breast','亲喂母乳'],['bottle','瓶喂母乳'],['formula','配方奶粉']].map(([v,l]) =>
                    <button key={v} onClick={()=>setF('kind',v)} className={formChip(form.kind===v)}>{l}</button>)}
                  </div>
                </RecordField>
                <RecordField label="奶量（ml）">
                  <input type="number" value={form.amount ?? ''} className="w-full no-spin" min="0"
                         onChange={(e)=>setF('amount',e.target.value)}
                         placeholder={`参考量 ${milkPredAmount} ml`} />
                </RecordField>
              </>
            )}
            {activeForm === 'poop' && (
              <>
                <RecordField label="性状">
                  <div className="flex gap-2 flex-wrap">{[['unknown','未知'],['normal','正常'],['meconium','胎便'],['gold','金黄'],['paste','膏状'],['watery','稀水'],['hard','干硬'],['egg','蛋花汤']].map(([v,l]) =>
                    <button key={v} onClick={()=>setF('shape',v)} className={formChip(form.shape===v)}>{l}</button>)}
                  </div>
                </RecordField>
                <RecordField label="异常标记">
                  <div className="flex gap-2 flex-wrap">{['正常','带血丝','带粘液','泡沫多','奶瓣多'].map(v =>
                    <button key={v} onClick={()=>toggleArr('abnormal',v)} className={formChip((form.abnormal||[]).includes(v))}>{v}</button>)}
                  </div>
                </RecordField>
              </>
            )}
            {activeForm === 'pee' && (
              <>
                <RecordField label="尿量"><div className="flex gap-2 flex-wrap">{['正常','少量','中等','大量'].map(v =>
                  <button key={v} onClick={()=>setF('uamount',v)} className={formChip(form.uamount===v)}>{v}</button>)}</div></RecordField>
                <RecordField label="颜色"><div className="flex gap-2 flex-wrap">{['正常','清亮','深黄','偏红'].map(v =>
                  <button key={v} onClick={()=>setF('color',v)} className={formChip(form.color===v)}>{v}</button>)}</div></RecordField>
              </>
            )}
            {activeForm === 'sleep' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <RecordField label="开始时间"><DateTimePicker value={form.time || ''} onChange={v=>setF('time',v)} /></RecordField>
                  <RecordField label="结束时间（选填）"><DateTimePicker value={form.endTime || ''} onChange={v=>setF('endTime',v)} /></RecordField>
                </div>
                <RecordField label="睡眠时长（h）">
                  <input type="number" value={form.duration ?? ''} step="0.5" className="w-full no-spin"
                         onChange={(e)=>setF('duration',e.target.value)} placeholder="留空自动计算" />
                </RecordField>
                <RecordField label="睡眠质量"><div className="flex gap-2 flex-wrap">{['安稳','易醒','哭闹'].map(v =>
                  <button key={v} onClick={()=>setF('quality',v)} className={formChip(form.quality===v)}>{v}</button>)}</div></RecordField>
              </>
            )}
            {activeForm === 'temp' && (
              <>
                <RecordField label="体温（℃）"><input type="number" value={form.value ?? ''} step="0.1" className="w-full no-spin" min="33" max="43"
                       placeholder="36.5" onChange={(e)=>setF('value',e.target.value)} /></RecordField>
                <RecordField label="测量部位"><div className="flex gap-2 flex-wrap">{['腋温','额温','肛温'].map(v =>
                  <button key={v} onClick={()=>setF('site',v)} className={formChip(form.site===v)}>{v}</button>)}</div></RecordField>
              </>
            )}
            {activeForm === 'weight' && (
              <RecordField label="体重（kg）">
                <input type="number" value={form.value ?? ''} step="0.01" className="w-full no-spin"
                       placeholder={settings.weight || '3.20'}
                       onChange={(e)=>setF('value',e.target.value)} />
              </RecordField>
            )}
            {activeForm === 'jaundice' && (
              <>
                <RecordField label="黄疸值（mg/dL）"><input type="number" value={form.value ?? ''} step="0.1" className="w-full no-spin"
                       placeholder="8.0" onChange={(e)=>setF('value',e.target.value)} /></RecordField>
                <RecordField label="测量部位"><div className="flex gap-2 flex-wrap">{['额头','胸部','腹部','腿部'].map(v =>
                  <button key={v} onClick={()=>setF('site',v)} className={formChip(form.site===v)}>{v}</button>)}</div></RecordField>
              </>
            )}
            {activeForm === 'care' && (
              <>
                <RecordField label="护理类型">
                  <div className="flex gap-2 flex-wrap">{[['cord','脐带护理'],['touch','抚触/排气操'],['bath','洗澡'],['medicine','用药'],['event','事件']].map(([v,l]) =>
                    <button key={v} onClick={()=>setF('careKind',v)} className={formChip(form.careKind===v)}>{l}</button>)}
                  </div>
                </RecordField>
                <RecordField label="详情/备注"><input type="text" className="w-full" value={form.detail||''}
                       placeholder="如：脐部干燥无异常"
                       onChange={(e)=>setF('detail',e.target.value)} /></RecordField>
              </>
            )}
            {activeForm === 'cry' && (
              <>
                <RecordField label="哭闹时长（分钟）"><input type="number" value={form.duration??''} className="w-full no-spin"
                       onChange={(e)=>setF('duration',e.target.value)} /></RecordField>
                <RecordField label="可能原因"><div className="flex gap-2 flex-wrap">{['饿了','尿湿','肠胀气','困倦','要抱抱','不明原因'].map(v =>
                  <button key={v} onClick={()=>setF('cause',v)} className={formChip(form.cause===v)}>{v}</button>)}</div></RecordField>
                <RecordField label="程度"><div className="flex gap-2 flex-wrap">{['轻度','中等','剧烈'].map(v =>
                  <button key={v} onClick={()=>setF('level',v)} className={formChip(form.level===v)}>{v}</button>)}</div></RecordField>
                <RecordField label="安抚方式"><div className="flex gap-2 flex-wrap">{['喂奶','拍嗝','抱哄','萝卜蹲','白噪音'].map(v =>
                  <button key={v} onClick={()=>setF('soothe',v)} className={formChip(form.soothe===v)}>{v}</button>)}</div></RecordField>
              </>
            )}

            <RecordField label="备注"><input type="text" value={form.note||''}
                   placeholder="如：母乳亲喂状态良好" className="w-full"
                   onChange={(e)=>setF('note',e.target.value)} /></RecordField>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2 border-t border-white/[0.06] pt-4">
            <button onClick={submitForm} className="btn btn-primary"><Check className="h-4 w-4" />保存记录</button>
          </div>
        </div>
      </div>
    );
  };

  const PageTrend = () => (
    <div className="space-y-3 animate-fade-in">
      <div className="bc-card p-5">
        <SectionHeader icon={TrendingUp} title="每日总奶量" accent="#9B8AFF" />
        <TrendChart data={trendMeta.dataMilk} labels={trendMeta.labels} color="#9B8AFF" unit="ml" height={190} />
      </div>
      <div className="bc-card p-5">
        <SectionHeader icon={Moon} title="每日睡眠时长" accent="#FFC38A" />
        <TrendChart data={trendMeta.dataSleep} labels={trendMeta.labels} color="#FFC38A" unit="h" height={190} />
      </div>
      <div className="bc-card p-5">
        <SectionHeader icon={Droplets} title="每日排便次数" accent="#4ADE9A" />
        <TrendChart data={trendMeta.dataPoop} labels={trendMeta.labels} color="#4ADE9A" unit="次" height={190} />
      </div>
      <div className="bc-card p-5">
        <SectionHeader icon={BarChart3} title="周期数据汇总" accent="#6EC5FF" />
        <div className="grid grid-cols-3 gap-3">
          <div className="glass-inset p-3 text-center rounded-[11px]">
            <div className="text-[24px] font-bold tabular-nums bc-number" style={{ color: '#9B8AFF' }}>{kMilk.length}</div>
            <div className="text-[11px] text-white/45 mt-0.5">今日喂奶（次）</div>
          </div>
          <div className="glass-inset p-3 text-center rounded-[11px]">
            <div className="text-[24px] font-bold tabular-nums bc-number" style={{ color: '#4ADE9A' }}>{kPoop.length}</div>
            <div className="text-[11px] text-white/45 mt-0.5">今日排便（次）</div>
          </div>
          <div className="glass-inset p-3 text-center rounded-[11px]">
            <div className="text-[24px] font-bold tabular-nums bc-number" style={{ color: '#FFC38A' }}>{sleepH.toFixed(1)}</div>
            <div className="text-[11px] text-white/45 mt-0.5">今日睡眠（h）</div>
          </div>
        </div>
      </div>
    </div>
  );

  const PagePredict = () => {
    const days = ageDays(settings.birth) ?? 60;
    const days90 = Math.max(0, Math.min(days, 365));
    const ref = refTable(days90);
    return (
      <div className="space-y-3 animate-fade-in">
        <div className="bc-card p-5">
          <SectionHeader icon={Sparkles} title="智能预测" accent="#FFB6C1" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bc-forecast p-4 rounded-[12px]">
              <div className="flex items-center gap-2 mb-1"><span className="bc-dot" style={{ background:'#9B8AFF' }} /><span className="text-[11.5px] text-white/65">下次喂奶</span></div>
              <div className="text-[26px] font-bold bc-number mt-1" style={{ color: '#9B8AFF' }}>
                {prediction.nextMilk ? fmtDateTime(prediction.nextMilk) : '--'}
              </div>
              <div className="text-[11px] text-white/40 mt-1">基于最近喂奶间隔 + 月龄参考</div>
            </div>
            <div className="bc-forecast p-4 rounded-[12px]">
              <div className="flex items-center gap-2 mb-1"><span className="bc-dot" style={{ background:'#FFC38A' }} /><span className="text-[11.5px] text-white/65">下次睡眠</span></div>
              <div className="text-[26px] font-bold bc-number mt-1" style={{ color: '#FFC38A' }}>
                {prediction.nextSleep ? fmtDateTime(prediction.nextSleep) : '--'}
              </div>
              <div className="text-[11px] text-white/40 mt-1">基于上次结束 + 2.2h 预估</div>
            </div>
          </div>
        </div>
        <div className="bc-card p-5">
          <SectionHeader icon={BabyIcon} title="月龄参考标准" accent="#6EC5FF"
            right={<span className="chip">{settings.name} · {ageLabel(settings.birth)}</span>} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="glass-inset p-4 rounded-[12px]">
              <div className="text-[10px] uppercase tracking-[0.16em] font-semibold" style={{ color:'#9B8AFF' }}>每次奶量</div>
              <div className="text-[22px] font-bold bc-number mt-1 text-white/90 tabular-nums">
                {ref.milk[0]}–{ref.milk[1]}<span className="text-[13px] text-white/45 font-normal ml-1">ml</span>
              </div>
            </div>
            <div className="glass-inset p-4 rounded-[12px]">
              <div className="text-[10px] uppercase tracking-[0.16em] font-semibold" style={{ color:'#6EC5FF' }}>每日次数</div>
              <div className="text-[22px] font-bold bc-number mt-1 text-white/90 tabular-nums">
                {ref.milkCount[0]}–{ref.milkCount[1]}<span className="text-[13px] text-white/45 font-normal ml-1">次</span>
              </div>
            </div>
            <div className="glass-inset p-4 rounded-[12px]">
              <div className="text-[10px] uppercase tracking-[0.16em] font-semibold" style={{ color:'#FFC38A' }}>每日睡眠</div>
              <div className="text-[22px] font-bold bc-number mt-1 text-white/90 tabular-nums">
                {ref.sleep[0]}–{ref.sleep[1]}<span className="text-[13px] text-white/45 font-normal ml-1">h</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const PageHistory = () => (
    <div className="space-y-3 animate-fade-in">
      <div className="bc-card p-5">
        <SectionHeader icon={History} title="历史记录" accent="#6EC5FF"
          right={
            <div className="flex items-center gap-2">
              <CalendarDays className="h-3.5 w-3.5 text-white/40" strokeWidth={1.6} />
              <input
                type="date"
                value={historyDate}
                onChange={(e)=>setHistoryDate(e.target.value)}
                className="!py-1.5 !px-2.5 text-[11.5px] w-[150px]"
                placeholder="选择日期"
              />
              {historyDate &&
                <button onClick={()=>setHistoryDate('')} className="btn btn-default !py-1 !px-2 !text-[10.5px]">清除</button>}
            </div>
          }
        />
        <div className="overflow-hidden rounded-[12px] border border-white/[0.05]">
          <table className="w-full text-[12px]">
            <thead className="sticky top-0">
              <tr className="text-left text-white/40 text-[10.5px] uppercase tracking-[0.08em]"
                  style={{ background:'rgba(0,0,0,0.35)' }}>
                <th className="py-2.5 px-3 font-semibold">时间</th>
                <th className="py-2.5 px-3 font-semibold">类型</th>
                <th className="py-2.5 px-3 font-semibold">数值</th>
                <th className="py-2.5 px-3 font-semibold">质量/备注</th>
                <th className="py-2.5 px-3 font-semibold w-10"></th>
              </tr>
            </thead>
            <tbody>
              {historyList.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-14 text-white/40 text-[12px] leading-relaxed">
                  {historyDate ? '所选日期没有记录' : '还没有任何记录'}
                </td></tr>
              ) : historyList.map(r => {
                const info = TYPES[r.type];
                const I = info.icon;
                const vals = [];
                if (r.amount) vals.push(`${r.amount} ml`);
                if (r.duration) vals.push(`${r.duration} h`);
                if (r.value) vals.push(`${r.value}`);
                const metas = [];
                if (r.kind) metas.push(r.kind);
                if (r.quality) metas.push(r.quality);
                if (r.site) metas.push(r.site);
                if (r.cause) metas.push(r.cause);
                if (r.soothe) metas.push(r.soothe);
                if (r.careKind) metas.push(r.careKind);
                if (r.shape) metas.push(r.shape);
                if (r.note || r.detail) metas.push((r.note||'') + (r.detail ? ' ' + r.detail : ''));
                return (
                  <tr key={r.id} className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors group">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-white/60 tabular-nums whitespace-nowrap">
                      {fmtDateTime(r.time)}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full shrink-0"
                              style={{ background: info.color, boxShadow: `0 0 8px ${info.color}88` }} />
                        <I className="h-3.5 w-3.5 shrink-0" strokeWidth={1.6} style={{ color: info.color }} />
                        <span className="text-white/85 text-[12px]">{info.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-white/75 tabular-nums">{vals.join(' · ') || '—'}</td>
                    <td className="py-2.5 px-3 text-white/50 text-[11.5px] leading-snug max-w-xs truncate"
                        title={metas.join(' · ')}>{metas.join(' · ') || '—'}</td>
                    <td className="py-2.5 px-3 text-right">
                      <button onClick={()=>removeRecord(r.id)}
                              className="h-7 w-7 rounded-md inline-flex items-center justify-center text-white/20 hover:text-rose-300 hover:bg-rose-300/[0.08] opacity-0 group-hover:opacity-100 transition">
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.7} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const PageSettings = () => {
    const setS = (k, v) => setSettings(s => ({ ...s, [k]: v }));
    const resetAll = () => {
      if (!confirm('确定删除所有宝宝护理记录？此操作无法撤销。')) return;
      setRecords([]);
      showToast('已清空全部记录', 'error');
    };
    const exportJSON = () => {
      const data = { settings, records, exportedAt: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `baby-care-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      showToast('已导出 JSON 文件');
    };
    return (
      <div className="space-y-3 animate-fade-in max-w-2xl">
        <div className="bc-card p-5">
          <SectionHeader icon={BabyIcon} title="宝宝资料" accent="#6EC5FF" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RecordField label="宝宝姓名 / 昵称">
              <input type="text" value={settings.name || ''}
                     onChange={(e)=>setS('name',e.target.value)} className="w-full" placeholder="宝宝" />
            </RecordField>
            <RecordField label="出生日期">
              <input type="date" value={settings.birth || ''}
                     onChange={(e)=>setS('birth',e.target.value)} className="w-full" />
            </RecordField>
            <RecordField label="出生体重（kg）">
              <input type="number" step="0.01" value={settings.weight || ''}
                     onChange={(e)=>setS('weight',e.target.value)} className="w-full no-spin" />
            </RecordField>
            <RecordField label="出生身高（cm）">
              <input type="number" step="0.1" value={settings.height || ''}
                     onChange={(e)=>setS('height',e.target.value)} className="w-full no-spin" />
            </RecordField>
          </div>
          <div className="mt-5 pt-4 border-t border-white/[0.06] text-[11px] text-white/45 leading-relaxed">
            <AlertTriangle className="h-3 w-3 inline mr-1 align-[-2px] text-amber-300/80" />
            资料仅本地 LocalHub 保存，用于月龄参考与智能预测，不会上传。
          </div>
        </div>

        <div className="bc-card p-5">
          <SectionHeader icon={Settings2} title="数据管理" accent="#FFB6C1" />
          <div className="flex flex-wrap gap-2">
            <button onClick={exportJSON} className="btn btn-default">
              <Download className="h-4 w-4" />导出 JSON
            </button>
            <button onClick={resetAll} className="btn btn-danger">
              <Trash2 className="h-4 w-4" />清空全部记录
            </button>
          </div>
        </div>
      </div>
    );
  };

  /* ================= 主渲染：bc-root 作用域 + Hero + Tabs + 页内容 ================= */
  const accentColor = '#6EC5FF'; // 主基调：婴儿蓝（会被 bc-root 继承）
  const secondaryAccent = '#FFB6C1'; // 婴儿粉
  return (
    <div className="bc-root">
      {/* 顶部 Hero */}
      <section className="bc-hero mb-4 animate-slide-up">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="min-w-0 max-w-[560px]">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="bc-chip bc-chip-accent">
                <Sparkles className="h-3 w-3 mr-1" strokeWidth={2} />
                Aurora Baby
              </span>
              <span className="bc-chip">{ageLabel(settings.birth)}</span>
              {settings.birth && ageDays(settings.birth) != null && (
                <span className="bc-chip">出生第 {ageDays(settings.birth)} 天</span>
              )}
            </div>
            <h1 className="bc-title">
              你好，<span className="bc-title-grad">{settings.name || '宝宝'}</span>
              <span className="text-white/70">。</span>
            </h1>
            <p className="bc-subtitle">
              柔软极光主题 · 所有记录本地安全存储 · 预测与趋势基于 WHO 月龄参考
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 min-w-[220px]">
            <div className="flex items-center gap-2 text-[10.5px] text-white/50 font-mono tabular-nums">
              <Calendar className="h-3.5 w-3.5" style={{ color: accentColor }} />
              <span>{new Date().getMonth()+1}月{new Date().getDate()}日 · {['周日','周一','周二','周三','周四','周五','周六'][new Date().getDay()]}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="bc-mini-stat">
                <BabyIcon className="h-3.5 w-3.5" strokeWidth={1.6} style={{ color: accentColor }} />
                <span className="bc-mini-stat-text">今日记录 <b>{today.length}</b></span>
              </div>
              <div className="bc-mini-stat">
                <Moon className="h-3.5 w-3.5" strokeWidth={1.6} style={{ color: '#FFC38A' }} />
                <span className="bc-mini-stat-text">睡眠 <b>{sleepH.toFixed(1)}h</b></span>
              </div>
              <div className="bc-mini-stat">
                <Milk className="h-3.5 w-3.5" strokeWidth={1.6} style={{ color: '#9B8AFF' }} />
                <span className="bc-mini-stat-text">奶量 <b>{totalMilk}ml</b></span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tab 栏 */}
      {renderTabs()}

      {/* 页内容 */}
      <div className="mt-4 pb-10">
        {page === 'home' && <PageHome />}
        {page === 'record' && <PageRecord />}
        {page === 'trend' && <PageTrend />}
        {page === 'predict' && <PagePredict />}
        {page === 'history' && <PageHistory />}
        {page === 'settings' && <PageSettings />}
      </div>

      {/* 快速记录弹窗 */}
      {quickType && (
        <QuickModal
          type={quickType}
          onClose={() => setQuickType(null)}
          onSave={addRecord}
          settings={settings}
        />
      )}

      {/* Toast */}
      {toast && <div className={`toast toast-${toast.kind}`}>{toast.msg}</div>}
    </div>
  );
}

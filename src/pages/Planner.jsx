import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  CalendarDays, ChevronLeft, ChevronRight, Plus, Trash2, Check,
  GraduationCap, Sun, FlaskConical, Star, PartyPopper, CalendarPlus,
} from 'lucide-react';

/* ============================================================
   个人日程表 · Planner
   - 月历视图：自动植入本学期(2026)法定节假日 + 调休补班
   - 自定义日程：开学/放假/考试/活动/自定义，精确到几月几日几点
   - 数据本地存储
   ============================================================ */

const LS_KEY = 'PlannerData';
const ACCENT = '#0EA5E9';
const ACCENT_SOFT = 'rgba(14,165,233,.10)';
const ACCENT_LINE = 'rgba(14,165,233,.30)';

const WEEK = ['一', '二', '三', '四', '五', '六', '日'];

/* 2026 法定节假日（来源：国务院办公厅 国办发明电〔2025〕7号） */
const HOLIDAYS = [
  { name: '元旦',   from: '2026-01-01', to: '2026-01-03' },
  { name: '春节',   from: '2026-02-15', to: '2026-02-23' },
  { name: '清明',   from: '2026-04-04', to: '2026-04-06' },
  { name: '劳动节', from: '2026-05-01', to: '2026-05-05' },
  { name: '端午节', from: '2026-06-19', to: '2026-06-21' },
  { name: '中秋节', from: '2026-09-25', to: '2026-09-27' },
  { name: '国庆节', from: '2026-10-01', to: '2026-10-07' },
];
const WORKDAYS = ['2026-01-04', '2026-02-14', '2026-02-28', '2026-05-09', '2026-09-20', '2026-10-10'];

/* 日程分类 */
const CATS = {
  开学: { color: '#0CA678', icon: GraduationCap },
  放假: { color: '#F59E0B', icon: Sun },
  考试: { color: '#EF4444', icon: FlaskConical },
  活动: { color: '#6366F1', icon: PartyPopper },
  自定义: { color: '#6c757d', icon: Star },
};

const pad = (n) => String(n).padStart(2, '0');
const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/* 把一段日期展开为数组 */
function range(from, to) {
  const out = [];
  const d = new Date(from + 'T00:00:00');
  const end = new Date(to + 'T00:00:00');
  while (d <= end) { out.push(fmt(d)); d.setDate(d.getDate() + 1); }
  return out;
}
/* 某日命中的公假名（可多个） */
function holidayName(date) {
  return HOLIDAYS.filter((h) => range(h.from, h.to).includes(date)).map((h) => h.name);
}

export default function Planner() {
  const today = new Date();
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() + 1 });
  const [selected, setSelected] = useState(fmt(today));
  const [events, setEvents] = useState([]);
  const [loaded, setLoaded] = useState(false);
  // 添加表单
  const [form, setForm] = useState({
    date: fmt(today), time: '12:00', title: '', cat: '自定义', note: '',
  });
  const [toast, setToast] = useState('');
  const toastRef = useRef(null);
  const say = (m) => { setToast(m); clearTimeout(toastRef.current); toastRef.current = setTimeout(() => setToast(''), 1800); };

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
      if (raw && Array.isArray(raw)) setEvents(raw);
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  const persist = (next) => {
    setEvents(next);
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  const byDate = useMemo(() => {
    const m = {};
    events.forEach((e) => { (m[e.date] = m[e.date] || []).push(e); });
    Object.values(m).forEach((arr) => arr.sort((a, b) => (a.time < b.time ? -1 : 1)));
    return m;
  }, [events]);

  /* 当月所有可渲染的天（含上月/下月补齐） */
  const cells = useMemo(() => {
    const first = new Date(view.y, view.m - 1, 1);
    const offset = (first.getDay() + 6) % 7; // 周一为本周第一
    const daysInMonth = new Date(view.y, view.m, 0).getDate();
    const out = [];
    const prevMonthDays = new Date(view.y, view.m - 1, 0).getDate();
    for (let i = 0; i < offset; i++) {
      const d = new Date(view.y, view.m - 2, prevMonthDays - offset + 1 + i);
      out.push({ date: fmt(d), day: d.getDate(), inMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) out.push({ date: `${view.y}-${pad(view.m)}-${pad(d)}`, day: d, inMonth: true });
    let total = out.length;
    let next = 1;
    while (total % 7 !== 0) { out.push({ date: '', day: next++, inMonth: false }); total++; }
    return out;
  }, [view]);

  const move = (delta) => {
    const m0 = (view.m - 1 + delta + 12) % 12;
    const y = view.y + Math.floor((view.m - 1 + delta) / 12);
    setView({ y, m: m0 + 1 });
  };

  const todayStr = fmt(today);
  const selWeekday = WEEK[(new Date(selected + 'T00:00:00').getDay() + 6) % 7];
  const selHolidays = holidayName(selected);
  const selEvents = byDate[selected] || [];
  const isWorkday = WORKDAYS.includes(selected);

  const addEvent = () => {
    if (!form.title.trim()) { say('请填写具体事项'); return; }
    const e = { id: Date.now() + Math.random().toString(36).slice(2, 6), ...form, title: form.title.trim(), note: form.note.trim() };
    persist([...events, e]);
    say('已添加日程');
    setForm({ date: selected, time: form.time, title: '', cat: form.cat, note: '' });
  };
  const removeEvent = (id) => { persist(events.filter((e) => e.id !== id)); say('已删除'); };
  const clearAll = () => { persist([]); say('已清空自定义日程'); };

  return (
    <div className="pl-page">
      <style>{`
        .pl-page { display:flex; flex-direction:column; gap:18px; }
        .pl-card { background:#fff;border:1px solid rgba(20,24,33,.09);border-radius:14px;box-shadow:0 1px 2px rgba(16,20,30,.04);padding:18px 20px; }
        .pl-top { display:flex;align-items:center;gap:10px; }
        .pl-top h3 { margin:0;font-size:15px;font-weight:700;color:#212529; }
        .pl-ico { width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:${ACCENT_SOFT};color:${ACCENT}; }
        .pl-sp { flex:1; }
        .pl-btn { display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(20,24,33,.12);background:#fff;color:#495057;border-radius:9px;font-size:13px;font-weight:600;padding:8px 13px;cursor:pointer;transition:all .15s ease; }
        .pl-btn:hover { border-color:${ACCENT_LINE};color:${ACCENT}; }
        .pl-btn.primary { background:${ACCENT};border-color:${ACCENT};color:#fff; }
        .pl-btn.primary:hover { opacity:.92; }
        .pl-btn.danger:hover { color:#EF4444;border-color:rgba(239,68,68,.4); }
        .pl-input { border:1px solid rgba(20,24,33,.13);border-radius:9px;padding:8px 11px;font-size:13px;background:#fff;color:#212529;outline:none; }
        .pl-input:focus { border-color:${ACCENT}; }
        .pl-label { font-size:12px;color:#6c757d;font-weight:600;display:block;margin-bottom:5px; }
        .pl-mbar { display:flex;align-items:center;gap:10px; }
        .pl-mbar b { font-size:16px; }
        /* 日历 */
        .pl-grid { display:grid;grid-template-columns:repeat(7,1fr);gap:5px;margin-top:12px; }
        .pl-dow { text-align:center;font-size:11.5px;color:#adb5bd;font-weight:700;padding-bottom:6px; }
        .pl-cell { border:1px solid rgba(20,24,33,.07);border-radius:9px;min-height:78px;padding:6px;cursor:pointer;background:#FCFCFD;position:relative;transition:border-color .15s ease; }
        .pl-cell:hover { border-color:${ACCENT_LINE}; }
        .pl-cell.sel { border:2px solid ${ACCENT}; }
        .pl-cell.off { opacity:.4; }
        .pl-cell .num { font-size:12px;font-weight:700;color:#495057; }
        .pl-cell.holiday { background:#FFF6EE; }
        .pl-cell.holiday .num { color:#E8590C; }
        .pl-cell.workday { background:#FBF7E9; }
        .pl-cell.today .num { color:${ACCENT}; }
        .pl-cell .hol { font-size:10px;color:#E8590C;font-weight:700;margin-top:2px;line-height:1.3; }
        .pl-cell .ev { font-size:10.5px;color:#212529;background:#fff;border-radius:5px;padding:1px 4px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border-left:3px solid #0CA678; }
        .pl-cell .ev2 { border-left-color:#6366F1; }
        .pl-cell .more { font-size:10px;color:#adb5bd;margin-top:2px; }
        /* 右栏 */
        .pl-detail { display:flex;flex-direction:column;gap:10px; }
        .pl-ev { display:flex;align-items:center;gap:10px;padding:9px 11px;border-radius:9px;background:#F8F9FA;border:1px solid rgba(20,24,33,.07); }
        .pl-ev .title { font-size:13px;font-weight:700;color:#212529; }
        .pl-ev .meta { font-size:11px;color:#6c757d; }
        .pl-cat { display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px; }
        .pl-toast { position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#212529;color:#fff;padding:9px 16px;border-radius:999px;font-size:12.5px;z-index:99; }
      `}</style>

      {/* 顶部导航 + 月历 */}
      <div className="pl-card">
        <div className="pl-top">
          <div className="pl-ico"><CalendarDays size={18} /></div>
          <div className="pl-mbar">
            <button className="pl-btn" onClick={() => move(-1)}><ChevronLeft size={15} /></button>
            <b>{view.y} 年 {view.m} 月</b>
            <button className="pl-btn" onClick={() => move(1)}><ChevronRight size={15} /></button>
            <button className="pl-btn" onClick={() => { const n = new Date(); setView({ y: n.getFullYear(), m: n.getMonth() + 1 }); setSelected(fmt(n)); }}>今天</button>
          </div>
          <div className="pl-sp" />
          <span className="pl-label" style={{ margin: 0 }}><span style={{ color: '#E8590C' }}>■ 公假</span>　<span style={{ color: '#AD8B00' }}>■ 补班</span></span>
        </div>

        <div className="pl-grid">
          {WEEK.map((w) => <div key={w} className="pl-dow">周{w}</div>)}
          {cells.map((c, i) => {
            if (!c.date) return <div key={i} className="pl-cell off" />;
            const hols = holidayName(c.date);
            const evs = byDate[c.date] || [];
            const isHoliday = hols.length > 0;
            const isWork = WORKDAYS.includes(c.date);
            return (
              <div
                key={i}
                onClick={() => setSelected(c.date)}
                className={`pl-cell${c.date === selected ? ' sel' : ''}${!c.inMonth ? ' off' : ''}${isHoliday ? ' holiday' : ''}${isWork ? ' workday' : ''}${c.date === todayStr ? ' today' : ''}`}
              >
                <div className="num">{c.day}</div>
                {isHoliday && <div className="hol">{hols.slice(0, 2).join('·')}{hols.length > 2 ? '等' : ''}</div>}
                {isWork && <div className="hol" style={{ color: '#AD8B00' }}>补班</div>}
                {evs.slice(0, 2).map((e, ei) => (
                  <div key={e.id} className={`ev${ei === 1 ? ' ev2' : ''}`} style={{ borderLeftColor: CATS[e.cat]?.color || '#0CA678' }}>
                    {e.time.slice(0, 5)} {e.title}
                  </div>
                ))}
                {evs.length > 2 && <div className="more">+{evs.length - 2} 条</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* 选中日期详情 + 添加 */}
      <div className="pl-card">
        <div className="pl-top">
          <div className="pl-ico"><CalendarDays size={18} /></div>
          <h3>周{selWeekday} · {selected.slice(0, 4)}年{+selected.slice(5, 7)}月{+selected.slice(8, 10)}日</h3>
          <div className="pl-sp" />
          {(selHolidays.length > 0 || isWorkday) && (
            <span className="pl-cat" style={{ color: selHolidays.length ? '#E8590C' : '#AD8B00', background: selHolidays.length ? '#FFF1E6' : '#FBF7E9' }}>
              {selHolidays.join('·') || '调休补班'}
            </span>
          )}
        </div>
        <div className="pl-detail">
          {selEvents.length === 0 ? (
            <p style={{ fontSize: 13, color: '#adb5bd', margin: 0 }}>这一天还没有自定义日程</p>
          ) : selEvents.map((e) => {
            const cat = CATS[e.cat] || CATS['自定义'];
            const Icon = cat.icon;
            return (
              <div key={e.id} className="pl-ev">
                <span className="pl-cat" style={{ color: cat.color, background: `${cat.color}1A` }}><Icon size={12} />{e.cat}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="title">{e.title}</div>
                  <div className="meta">{e.time} 时点 · {e.note || '无备注'}</div>
                </div>
                <button className="pl-btn danger" onClick={() => removeEvent(e.id)}><Trash2 size={14} /></button>
              </div>
            );
          })}

          <div style={{ borderTop: '1px dashed rgba(20,24,33,.14)', marginTop: 6, paddingTop: 14 }}>
            <div className="pl-top" style={{ marginBottom: 10 }}>
              <div className="pl-ico" style={{ width: 28, height: 28 }}><CalendarPlus size={15} /></div>
              <h3 style={{ fontSize: 14 }}>添加 {selected.slice(5, 7)}月{selected.slice(8, 10)}日 的日程</h3>
            </div>
            <div className="pl-detail">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <div>
                  <div className="pl-label">几点</div>
                  <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="pl-input" />
                </div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div className="pl-label">具体事项</div>
                  <input className="pl-input" style={{ width: '100%' }} placeholder="例如：开学报到 / 放假回家 / 期末考试" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div>
                  <div className="pl-label">类型</div>
                  <select className="pl-input" value={form.cat} onChange={(e) => setForm({ ...form, cat: e.target.value })}>
                    {Object.keys(CATS).map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <div className="pl-label">备注（选填）</div>
                <input className="pl-input" style={{ width: '100%' }} placeholder="补充说明" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              </div>
              <div className="pl-top">
                <button className="pl-btn primary" onClick={addEvent}><Plus size={15} />添加日程</button>
                <button className="pl-btn danger" onClick={clearAll}>清空全部自定义日程</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p style={{ fontSize: 12, color: '#6c757d', margin: 0 }}>
        公假与补班依据《国务院办公厅关于2026年部分节假日安排的通知》（国办发明电〔2025〕7号）自动植入；你添加的开学 / 放假等自定义日程保存在本机。
      </p>
      {toast && <div className="pl-toast">{toast}</div>}
    </div>
  );
}
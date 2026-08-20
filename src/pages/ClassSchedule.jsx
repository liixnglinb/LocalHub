import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  GraduationCap, Plus, Trash2, Copy, Check, ChevronLeft, ChevronRight,
  Upload, CalendarDays, User, Clock, CalendarRange, Wand2, RefreshCw, Moon,
} from 'lucide-react';

/* ============================================================
   个人课表 · ClassSchedule
   - 大学课表：以「两节连堂」为节次单位，并内置晚自习块
   - 节次块：1-2 / 3-4 / 5-6 / 7-8 / 晚自习1 / 晚自习2
   - 展示：课程名 / 上课时间 / 节次块 / 第几周到第几周 / 授课老师
   - 周自动定位 + 文本识别导入 + 复制导入模板
   ============================================================ */

const LS_KEY = 'ClassScheduleData';
const ACCENT = '#6366F1';
const ACCENT_SOFT = 'rgba(99,102,241,.10)';
const ACCENT_LINE = 'rgba(99,102,241,.30)';

const WEEKDAY = ['一', '二', '三', '四', '五', '六', '日'];
const MAX_WEEK = 20;

/* 连堂节次块（大学课表按此组织，含晚自习） */
const SLOTS = [
  { key: '1-2',    label: '1-2 节',   time: '08:00-09:45', start: 1,  night: false },
  { key: '3-4',    label: '3-4 节',   time: '10:00-11:45', start: 3,  night: false },
  { key: '5-6',    label: '5-6 节',   time: '13:30-15:15', start: 5,  night: false },
  { key: '7-8',    label: '7-8 节',   time: '15:30-17:15', start: 7,  night: false },
  { key: '晚自习1', label: '晚自习 1', time: '19:00-20:40', start: 9,  night: true },
  { key: '晚自习2', label: '晚自习 2', time: '20:50-22:15', start: 11, night: true },
];
const SLOT_BY_START = Object.fromEntries(SLOTS.map((s) => [s.start, s.key]));
const SLOT_META = Object.fromEntries(SLOTS.map((s) => [s.key, s]));

const INC = { every: '每周', odd: '单周', even: '双周' };

/* 把节次起始号映射到连堂块（含晚自习识别） */
function slotForPeriod(start) {
  return SLOT_BY_START[start] || '1-2';
}

/* 导入模板（复制按钮内容），与解析器一致 */
const IMPORT_TEMPLATE = `请按下面的文本格式填写课表，每门课用「课程」开头的一段，课程之间用空行隔开，粘贴到导入框即可自动识别：

【高等数学】
课程：高等数学
星期：周一
节次：1-2节
周次：1-16周
老师：王老师

【大学英语】
课程：大学英语
星期：周三
节次：3-4节
周次：1-16周（单周）
老师：李老师

【晚自习·自习】
课程：晚自习
星期：周二
节次：晚自习1
周次：第3周至第16周
老师：（自习/辅导）

填写说明：
· 星期：周一 或 星期一到星期日
· 节次：可直接写连堂块名 —— 1-2节 / 3-4节 / 5-6节 / 7-8节 / 晚自习1 / 晚自习2
· 周次：1-16周（第几周到第几周），可加（单周）/（双周）限定单双周
· 老师：授课教师姓名（晚自习可留空）
· 课程：课程名称（也可用【】标题作为课程名）`;

/* ---------- 解析器 ---------- */
const reKey = /(课程|名称)[:：]\s*([^\n【】]+)/;
const reTitle = /【\s*([^【】\n]+)\s*】/;
const reWeekday = /(?:星期|周)([一二三四五六日天])/;
const reNight = /晚自习\s*(\d)?/;
const rePeriod = /(?:第)?\s*(\d{1,2})\s*[-~至到—–]\s*(\d{1,2})\s*节|(?:第)?\s*(\d{1,2})\s*节/;
const reWeek = /(?:第)?\s*(\d{1,2})\s*[-~至到—–]\s*(\d{1,2})\s*周|第\s*(\d{1,2})\s*周/;
const reOddEven = /[（(](单|双)周?[)）]|(单|双)周/;
const reTeacher = /(?:授课老师|老师|教师)[:：]\s*([^\n,，;；]+)/;

const WD = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 7, 天: 7 };

function parseImport(text) {
  const blocks = String(text)
    .split(/\n\s*\n|\r\n\s*\r\n/)
    .map((b) => b.trim())
    .filter(Boolean);
  const out = [];
  for (const raw of blocks) {
    const title = raw.match(reTitle);
    const mKey = raw.match(reKey);
    const name = (mKey && mKey[2] ? mKey[2].trim() : '') || (title ? title[1].trim() : '');
    const d = raw.match(reWeekday);
    const day = d ? WD[d[1]] : null;

    // 晚自习 → 晚自习1/2；否则映射到连堂块
    let slot = null;
    const night = raw.match(reNight);
    if (night) {
      slot = night[1] ? `晚自习${night[1]}` : '晚自习1';
      if (!SLOT_META[slot]) slot = '晚自习1';
    } else {
      const per = raw.match(rePeriod);
      const start = per ? (per[1] ? +per[1] : +per[3]) : 1;
      slot = slotForPeriod(start);
    }

    const week = raw.match(reWeek);
    const f = week ? (week[1] ? +week[1] : +week[3]) : 1;
    const t = week ? (week[1] ? +week[2] : +week[3]) : 16;
    const oe = raw.match(reOddEven);
    const type = oe ? (oe[1] || oe[2]) === '单' ? 'odd' : 'even' : 'every';
    const tch = raw.match(reTeacher);
    const teacher = tch ? tch[1].trim() : '';

    if (name && day) {
      out.push({
        id: Date.now() + Math.random().toString(36).slice(2, 7),
        name, teacher, day, slot, f, t, type,
        weeksText: `${f}-${t}周${type !== 'every' ? `（${INC[type]}）` : ''}`,
      });
    }
  }
  return out;
}

function inWeek(c, w) {
  if (w < c.f || w > c.t) return false;
  if (c.type === 'odd') return w % 2 === 1;
  if (c.type === 'even') return w % 2 === 0;
  return true;
}

export default function ClassSchedule() {
  const [courses, setCourses] = useState([]);
  const [settings, setSettings] = useState({ startDate: '', overrideWeek: null });
  const [showSettings, setShowSettings] = useState(false);
  const [importText, setImportText] = useState('');
  const [parsed, setParsed] = useState([]);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState('');
  const [form, setForm] = useState({ name: '', teacher: '', day: 1, slot: '1-2', f: 1, t: 16, type: 'every' });
  const toastRef = useRef(null);

  const say = (msg) => { setToast(msg); clearTimeout(toastRef.current); toastRef.current = setTimeout(() => setToast(''), 1800); };

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
      if (raw) { setCourses(raw.courses || []); setSettings(raw.settings || { startDate: '', overrideWeek: null }); }
    } catch { /* ignore */ }
  }, []);

  const persist = (nextCourses, nextSettings) => {
    const c = nextCourses ?? courses;
    const s = nextSettings ?? settings;
    setCourses(c); setSettings(s);
    try { localStorage.setItem(LS_KEY, JSON.stringify({ courses: c, settings: s })); } catch { /* ignore */ }
  };

  const autoWeek = useMemo(() => {
    if (!settings.startDate) return 1;
    const start = new Date(settings.startDate + 'T00:00:00');
    if (Number.isNaN(start.getTime())) return 1;
    return Math.max(1, Math.min(MAX_WEEK, Math.floor((new Date() - start) / 864e5 / 7) + 1));
  }, [settings.startDate]);
  const currentWeek = settings.overrideWeek != null ? settings.overrideWeek : autoWeek;

  const weekCourses = useMemo(() => courses.filter((c) => inWeek(c, currentWeek)), [courses, currentWeek]);
  const grid = useMemo(() => {
    const m = {};
    weekCourses.forEach((c) => {
      if (!m[c.day]) m[c.day] = {};
      if (!m[c.day][c.slot]) m[c.day][c.slot] = c;
    });
    return m;
  }, [weekCourses]);

  const goWeek = (step) => persist(null, { ...settings, overrideWeek: Math.max(1, Math.min(MAX_WEEK, currentWeek + step)) });
  const setWeekInput = (v) => persist(null, { ...settings, overrideWeek: Math.max(1, Math.min(MAX_WEEK, +v || 1)) });

  const reparse = () => setParsed(parseImport(importText));
  const addParsed = () => {
    if (!parsed.length) { say('未识别到有效课程'); return; }
    persist([...courses, ...parsed], null);
    setImportText(''); setParsed([]);
    say(`已导入 ${parsed.length} 门课程`);
  };
  const addOne = () => {
    if (!form.name.trim()) { say('请填写课程名称'); return; }
    const c = {
      id: Date.now() + Math.random().toString(36).slice(2, 5),
      name: form.name.trim(), teacher: form.teacher.trim(),
      day: +form.day, slot: form.slot, f: +form.f, t: +form.t,
      type: form.type,
      weeksText: `${form.f}-${form.t}周${form.type !== 'every' ? `（${INC[form.type]}）` : ''}`,
    };
    persist([...courses, c], null);
    setForm({ ...form, name: '', teacher: '' });
    say('已添加课程');
  };
  const remove = (id) => { persist(courses.filter((c) => c.id !== id), null); say('已删除'); };
  const clearAll = () => { persist([], null); say('已清空课表'); };
  const copyTemplate = async () => {
    try { await navigator.clipboard.writeText(IMPORT_TEMPLATE); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* ignore */ }
  };

  return (
    <div className="cs-page">
      <style>{`
        .cs-page { display:flex; flex-direction:column; gap:18px; }
        .cs-card { background:#fff;border:1px solid rgba(20,24,33,.09);border-radius:14px;box-shadow:0 1px 2px rgba(16,20,30,.04);padding:18px 20px; }
        .cs-h { display:flex;align-items:center;gap:10px;margin-bottom:14px; }
        .cs-h h3 { margin:0;font-size:15px;font-weight:700;color:#212529; }
        .cs-h .ico { width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:${ACCENT_SOFT};color:${ACCENT}; }
        .cs-h .sp { flex:1; }
        .cs-row { display:flex;gap:8px;flex-wrap:wrap;align-items:center; }
        .cs-btn { display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(20,24,33,.12);background:#fff;color:#495057;border-radius:9px;font-size:13px;font-weight:600;padding:8px 13px;cursor:pointer;transition:all .15s ease; }
        .cs-btn:hover { border-color:${ACCENT_LINE};color:${ACCENT}; }
        .cs-btn.primary { background:${ACCENT};border-color:${ACCENT};color:#fff; }
        .cs-btn.primary:hover { opacity:.92; }
        .cs-btn.danger:hover { border-color:rgba(239,68,68,.4);color:#EF4444; }
        .cs-chip { display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;font-size:12.5px;font-weight:600;background:${ACCENT_SOFT};color:${ACCENT}; }
        .cs-input { border:1px solid rgba(20,24,33,.13);border-radius:9px;padding:8px 11px;font-size:13px;background:#fff;color:#212529;outline:none; }
        .cs-input:focus { border-color:${ACCENT}; }
        label.cs-l { font-size:12px;color:#6c757d;font-weight:600;display:block;margin-bottom:5px; }
        .cs-field { display:flex;flex-direction:column; }
        .cs-grid { overflow-x:auto; }
        .cs-grid table { width:100%;border-collapse:collapse;table-layout:fixed; }
        .cs-grid th,.cs-grid td { border:1px solid rgba(20,24,33,.09); }
        .cs-grid th { background:#F7F8FA;color:#6c757d;font-size:12px;font-weight:700;padding:7px 4px; }
        .cs-grid .per { background:#FBFBFC;color:#7b7f89;font-size:11.5px;width:86px;text-align:center;padding:5px;line-height:1.5; }
        .cs-grid .per b { display:block;font-size:12.5px;color:#212529; }
        .cs-grid td.empty { background:#FCFCFD; }
        .cs-cell { background:${ACCENT_SOFT};border:1px solid ${ACCENT_LINE};border-radius:8px;height:100%;padding:9px;display:flex;flex-direction:column;justify-content:center;min-height:52px; }
        .cs-cell .n { font-size:13px;font-weight:700;color:${ACCENT};line-height:1.3; }
        .cs-cell .t { font-size:11px;color:#7b7f89;margin-top:3px; }
        .cs-cell.night { background:rgba(99,102,241,.06);border-style:dashed; }
        .cs-empty { text-align:center;padding:26px 0;color:#adb5bd;font-size:13px; }
        .cs-list-row { display:flex;align-items:center;gap:12px;border-top:1px solid rgba(20,24,33,.07);padding:10px 4px;flex-wrap:wrap; }
        .cs-tag { display:inline-flex;align-items:center;gap:4px;font-size:11.5px;font-weight:600;color:#495057;background:#F1F3F5;border-radius:7px;padding:4px 9px; }
        .cs-tag.night { color:#5F3DC4;background:#F1EEFF; }
        .cs-review { border:1px dashed ${ACCENT_LINE};border-radius:10px;background:${ACCENT_SOFT};padding:10px 12px;margin-top:10px; }
        .cs-review-item { display:inline-flex;align-items:center;gap:8px;background:#fff;border-radius:8px;padding:6px 10px;margin:4px 4px 0 0;font-size:12px; }
        .cs-toast { position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#212529;color:#fff;padding:9px 16px;border-radius:999px;font-size:12.5px;z-index:99; }
      `}</style>

      {/* 顶部：当前周边 + 操作 */}
      <div className="cs-card">
        <div className="cs-h">
          <div className="ico"><CalendarDays size={18} /></div>
          <h3>第 {currentWeek} 周</h3>
          <span className="cs-chip">{settings.overrideWeek != null ? '手动指定' : settings.startDate ? '自动更新' : '待设置'}</span>
          <div className="sp" />
          <div className="cs-row">
            <button className="cs-btn" onClick={() => goWeek(-1)}><ChevronLeft size={15} />上一周</button>
            <input type="number" min={1} max={MAX_WEEK} value={currentWeek} onChange={(e) => setWeekInput(e.target.value)} className="cs-input" style={{ width: 68 }} />
            <button className="cs-btn" onClick={() => goWeek(1)}>下一周<ChevronRight size={15} /></button>
            <button className="cs-btn" onClick={() => setShowSettings((v) => !v)}><RefreshCw size={14} />周次设置</button>
          </div>
        </div>
        {showSettings && (
          <div className="cs-card" style={{ boxShadow: 'none', borderColor: 'rgba(20,24,33,.12)' }}>
            <div className="cs-row">
              <div className="cs-field">
                <label className="cs-l">学期开学（周一）日期</label>
                <input type="date" value={settings.startDate} onChange={(e) => persist(null, { ...settings, startDate: e.target.value })} className="cs-input" />
              </div>
              <div className="cs-field">
                <label className="cs-l">手动指定当前周（留空=自动推算）</label>
                <input type="number" min={1} max={MAX_WEEK} value={settings.overrideWeek ?? ''}
                  onChange={(e) => persist(null, { ...settings, overrideWeek: e.target.value === '' ? null : Math.max(1, Math.min(MAX_WEEK, +e.target.value)) })}
                  placeholder="自动" className="cs-input" style={{ width: 120 }} />
              </div>
              <div className="cs-field" style={{ alignSelf: 'flex-end' }}><button className="cs-btn" onClick={() => say(`当前自动为第 ${autoWeek} 周`)}>校验</button></div>
              <p style={{ margin: '2px 0 0', width: '100%', fontSize: 12, color: '#6c757d' }}>
                首次使用请在“手动指定当前周”输入现在是第几周；“自动更新”模式下将按开学日期随日期自动推进。
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 周网格课表 */}
      <div className="cs-card">
        <div className="cs-h">
          <div className="ico"><CalendarRange size={18} /></div>
          <h3>第 {currentWeek} 周课表</h3>
          <div className="sp" />
          <button className="cs-btn danger" onClick={clearAll}><Trash2 size={14} />清空课表</button>
        </div>
        <div className="cs-grid">
          <table>
            <thead>
              <tr>
                <th className="per">节次</th>
                {WEEKDAY.map((w) => <th key={w}>周{w}</th>)}
              </tr>
            </thead>
            <tbody>
              {SLOTS.map((slot) => (
                <tr key={slot.key}>
                  <td className="per"><b>{slot.label}</b>{slot.time}</td>
                  {WEEKDAY.map((_, di) => {
                    const d = di + 1;
                    const c = grid[d]?.[slot.key];
                    if (c) {
                      return (
                        <td key={d}>
                          <div className={`cs-cell${slot.night ? ' night' : ''}`}>
                            <div className="n">{c.name}</div>
                            <div className="t">{c.teacher || '未填老师'}</div>
                          </div>
                        </td>
                      );
                    }
                    return <td key={d} className="empty">{(slot.night && <Moon size={13} style={{ opacity: .4 }} />) || ''}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {weekCourses.length === 0 && <div className="cs-empty">本周暂无课程，请先导入课表</div>}
      </div>

      {/* 本周课程列表 */}
      <div className="cs-card">
        <div className="cs-h">
          <div className="ico"><GraduationCap size={18} /></div>
          <h3>第 {currentWeek} 周课程明细</h3>
          <span className="cs-chip">{weekCourses.length} 门</span>
        </div>
        {weekCourses.length === 0 ? (
          <div className="cs-empty">本周没有开课</div>
        ) : (
          weekCourses.map((c) => {
            const meta = SLOT_META[c.slot];
            return (
              <div key={c.id} className="cs-list-row">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#212529' }}>{c.name}</div>
                  <span className="cs-tag" style={{ marginTop: 5, display: 'inline-flex' }}>{c.weeksText}</span>
                </div>
                <span className="cs-tag"><CalendarDays size={12} />周{WEEKDAY[c.day - 1]}</span>
                <span className={`cs-tag${meta.night ? ' night' : ''}`}><Clock size={12} />{meta.label}</span>
                <span className="cs-tag"><Clock size={12} />{meta.time}</span>
                <span className="cs-tag"><User size={12} />{c.teacher || '未填老师'}</span>
                <button className="cs-btn danger" onClick={() => remove(c.id)}><Trash2 size={14} />删除</button>
              </div>
            );
          })
        )}
      </div>

      {/* 导入 */}
      <div className="cs-card">
        <div className="cs-h">
          <div className="ico"><Upload size={18} /></div>
          <h3>文本自动识别导入</h3>
          <div className="sp" />
          <button className="cs-btn" onClick={copyTemplate}>
            {copied ? <Check size={15} style={{ color: ACCENT }} /> : <Copy size={15} />}
            {copied ? '已复制' : '复制导入模板'}
          </button>
        </div>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          rows={6}
          placeholder={'粘贴课程文本，例如：\n【高等数学】\n课程：高等数学\n星期：周一\n节次：1-2节\n周次：1-16周\n老师：王老师\n\n【晚自习】\n星期：周二\n节次：晚自习1'}
          className="cs-input" style={{ width: '100%', resize: 'vertical', lineHeight: 1.6 }}
        />
        <div className="cs-row" style={{ marginTop: 10 }}>
          <button className="cs-btn primary" onClick={reparse}><Wand2 size={14} />识别并预览</button>
          <button className="cs-btn" onClick={() => { setImportText(''); setParsed([]); }}>清空</button>
          <button className="cs-btn" onClick={addParsed} disabled={!parsed.length} style={parsed.length ? {} : { opacity: .5, cursor: 'not-allowed' }}>
            <Upload size={14} />导入 {parsed.length ? `${parsed.length} 门` : ''}
          </button>
        </div>
        {parsed.length > 0 && (
          <div className="cs-review">
            <div style={{ fontSize: 12, fontWeight: 700, color: ACCENT, marginBottom: 4 }}>识别到 {parsed.length} 门课程：</div>
            {parsed.map((c) => (
              <span key={c.id} className="cs-review-item">
                {c.name} · 周{WEEKDAY[c.day - 1]} · {SLOT_META[c.slot]?.label} · {c.f}-{c.t}周{c.type !== 'every' ? `(${INC[c.type]})` : ''} · {c.teacher || '—'}
              </span>
            ))}
          </div>
        )}
        <p style={{ margin: '10px 0 0', fontSize: 12.5, color: '#6c757d' }}>
          支持连堂块：1-2节 / 3-4节 / 5-6节 / 7-8节 / 晚自习1 / 晚自习2；晚自习也可单独开设（有时有课）。点击「复制导入模板」查看完整格式。
        </p>
      </div>

      {/* 手动新增 */}
      <div className="cs-card">
        <div className="cs-h"><div className="ico"><Plus size={18} /></div><h3>手动添加课程</h3></div>
        <div className="cs-row">
          <div className="cs-field"><label className="cs-l">课程名称</label><input className="cs-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="高等数学" /></div>
          <div className="cs-field"><label className="cs-l">老师</label><input className="cs-input" value={form.teacher} onChange={(e) => setForm({ ...form, teacher: e.target.value })} placeholder="王老师" /></div>
          <div className="cs-field"><label className="cs-l">星期</label>
            <select className="cs-input" value={form.day} onChange={(e) => setForm({ ...form, day: +e.target.value })}>
              {WEEKDAY.map((w, i) => <option key={w} value={i + 1}>周{w}</option>)}
            </select></div>
          <div className="cs-field"><label className="cs-l">节次（连堂块）</label>
            <select className="cs-input" value={form.slot} onChange={(e) => setForm({ ...form, slot: e.target.value })}>
              {SLOTS.map((s) => <option key={s.key} value={s.key}>{s.label}（{s.time}）{s.night ? '晚自习' : ''}</option>)}
            </select></div>
          <div className="cs-field"><label className="cs-l">周次</label>
            <div className="cs-row">
              <input type="number" className="cs-input" style={{ width: 64 }} value={form.f} onChange={(e) => setForm({ ...form, f: Math.max(1, +e.target.value || 1) })} />周~
              <input type="number" className="cs-input" style={{ width: 64 }} value={form.t} onChange={(e) => setForm({ ...form, t: Math.max(1, +e.target.value || 1) })} />周
            </div></div>
          <div className="cs-field"><label className="cs-l">单双周</label>
            <select className="cs-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="every">每周</option><option value="odd">单周</option><option value="even">双周</option>
            </select></div>
          <div className="cs-field" style={{ alignSelf: 'flex-end' }}><button className="cs-btn primary" onClick={addOne}><Plus size={14} />添加</button></div>
        </div>
      </div>

      {toast && <div className="cs-toast">{toast}</div>}
    </div>
  );
}
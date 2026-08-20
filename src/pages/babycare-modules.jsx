import React, { useState, useMemo } from 'react';
import {
  UserRound, Heart, Stethoscope, CloudSun, Droplet, FileText,
  Sun, Sparkles, Trash2, Check, ChevronLeft, ChevronRight, ChevronDown, Milk, Moon,
} from 'lucide-react';
import DateTimePicker from '../components/DateTimePicker';

/* ============ 母婴台账 · 数据模型 / 模拟纸质数据 / 通用 UI ============ */

const ACCENT = '#5B8DEF';
const ACCENT_SOFT = '#E8F0FF';
const TEXT_1 = '#333F51';
const TEXT_2 = '#86909C';
const LINE = '#E5E6EB';

/* ---- 宝宝基础档案（空白模板） ---- */
export const EMPTY_PROFILE = {
  name: '', gender: '', birthTime: '', admitTime: '', birthWeight: '', height: '',
  assessment: { face: '', trunk: '', limbs: '', routine: '', vaccine: '', toileting: '', cry: '' },
};

/* ---- 妈妈每日护理记录（空白模板） ---- */
export const EMPTY_MOM = {
  date: '', admitDay: '', postpartumDay: '', emotion: '', diet: '', sleep: '', feeding: '',
  temp: '', bp: '', hr: '', breath: '', breastCare: '', perineum: '', abdomen: '',
  poopTimes: '', peeTimes: '',
};

/* ---- 宝宝每日护理记录（空白模板，字段与纸质档案一一对应） ---- */
export const EMPTY_BABY = {
  date: '', admitDay: '', birthDay: '', temp: '',
  eyes: '', skin: '', nails: '', vulva: '', excretion: '',
  cord: '', passive: '', feedingSituation: '', spitup: '',
  bathTime: '', swimTime: '', massageTime: '', sunTime: '',
  jaundiceAM: '', jaundicePM: '', sleep: '', special: '',
};

const pad = (n) => String(n).padStart(2, '0');
export const fmtDate = (s) => { if (!s) return ''; const d = new Date(s); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
export const fmtTime = (s) => { if (!s) return ''; const d = new Date(s); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
export const fmtDateTime = (s) => { if (!s) return ''; const d = new Date(s); return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };

/* 相对今天偏移 n 天的 YYYY-MM-DD */
function day(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
/* 相对今天偏移 n 天的 datetime-local 值 */
function dayTime(n, hh, mm) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hh, mm, 0, 0);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(hh)}:${pad(mm)}`;
}

/* 判定某条时间戳是否属于今天 */
function isTodayISO(s) {
  const t = new Date(s);
  const n = new Date();
  return t.getFullYear() === n.getFullYear() && t.getMonth() === n.getMonth() && t.getDate() === n.getDate();
}
/* 判定 YYYY-MM-DD 字符串是否等于今天 */
function isTodayDate(s) {
  return String(s || '').slice(0, 10) === day(0);
}

/* 通用「今日汇总」小统计卡 */
function StatBox({ value, label, unit, color, bg }) {
  return (
    <div className="rounded-[10px] border px-4 py-3 flex items-baseline gap-1" style={{ background: bg, borderColor: `${color}33` }}>
      <span className="text-[24px] font-semibold leading-none tabular-nums" style={{ color }}>{value}</span>
      <span className="text-[12px] text-[#86909C] shrink-0">{unit}</span>
      <span className="text-[12px] text-[#5A6474] ml-auto whitespace-nowrap">{label}</span>
    </div>
  );
}

/* 通用信息芯片（用于备忘录式历史展示） */
function Chip({ icon: Icon, color, children }) {
  const c = color || '#5B8DEF';
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] text-[11.5px] font-medium" style={{ background: `${c}1F`, color }}>
      {Icon && <Icon className="h-3 w-3" strokeWidth={2} />}
      {children}
    </span>
  );
}

/* 生成一份完整模拟纸质档案（真实纸质数据提供后可直接替换此处的数据数组） */
export function importPaperData() {
  const profile = {
    name: '宝宝', gender: '女',
    birthTime: dayTime(-6, 8, 12),
    admitTime: dayTime(-5, 10, 30),
    birthWeight: '3200',
    height: '50',
    assessment: {
      face: '面貌正常，无畸形', trunk: '躯干对称，四肢活动自如', limbs: '四肢肌张力可',
      routine: '心肺听诊无异常', vaccine: '卡介苗已接种', toileting: '出生后12h内已排胎便', cry: '哭声洪亮',
    },
  };

  const momDaily = [];
  for (let i = 5; i >= 0; i--) {
    momDaily.push({
      id: Date.now() + i + '_m',
      date: day(-i), admitDay: String(i + 1), postpartumDay: String(i + 2),
      emotion: i % 2 ? '平稳' : '良好', diet: '清淡饮食，食欲可', sleep: '间断睡眠约6小时',
      feeding: '母乳亲喂，奶量充足', temp: '36.8', bp: '110/70', hr: '78', breath: '18',
      breastCare: '已实施，乳房无胀痛', perineum: '切口愈合良好', abdomen: '无异常',
      poopTimes: '2', peeTimes: '6',
    });
  }

  const babyDaily = [];
  for (let i = 5; i >= 0; i--) {
    babyDaily.push({
      id: Date.now() + i + '_b',
      date: day(-i), admitDay: String(i + 1), birthDay: String(i + 2),
      temp: '36.9', eyes: '眼部分泌物少，已清洁', skin: '皮肤干燥，勤换尿布', nails: '已修剪',
      vulva: '会阴清洁干燥', excretion: '', cord: '脐部干燥，无渗血', passive: '每日1次被动操',
      feedingSituation: '按需喂养，含接良好', spitup: '偶有溢奶',
      bathTime: '09:00', swimTime: '—', massageTime: '10:00', sunTime: '08:00',
      jaundiceAM: '10.2', jaundicePM: '10.5', sleep: '白天3次，夜间睡眠可', special: '无',
    });
  }

  /* 换尿布记录：多条，倒序展示。time 精确到分 */
  const diaper = [];
  const diaperSeed = [
    ['m', -1, 6, 10, 1, 1], ['m', -1, 9, 5, 1, 0], ['m', -1, 12, 40, 1, 1], ['m', -1, 15, 20, 1, 0], ['m', -1, 18, 0, 1, 1], ['m', -1, 21, 30, 1, 0], ['m', -1, 23, 55, 0, 1],
    ['m', 0, 7, 0, 1, 0], ['m', 0, 10, 15, 1, 0], ['m', 0, 13, 10, 1, 1], ['m', 0, 16, 35, 1, 0], ['m', 0, 19, 5, 1, 0], ['m', 0, 22, 20, 1, 1],
  ];
  diaperSeed.forEach(([k, dn, hh, mm, pee, poop], i) => {
    diaper.push({ id: Date.now() + i + '_d', time: dayTime(dn, hh, mm), pee: !!pee, poop: !!poop });
  });

  /* 进食记录 */
  const feed = [];
  const feedSeed = [
    ['m', -1, 6, 0, 20, 0, 0], ['m', -1, 9, 30, 15, 30, 10], ['m', -1, 12, 0, 18, 0, 5], ['m', -1, 15, 15, 12, 40, 0], ['m', -1, 18, 20, 16, 0, 8], ['m', -1, 21, 40, 20, 0, 0],
    ['m', 0, 6, 30, 18, 0, 0], ['m', 0, 9, 0, 14, 35, 10], ['m', 0, 12, 30, 16, 0, 0], ['m', 0, 16, 0, 12, 25, 5], ['m', 0, 19, 10, 18, 0, 0], ['m', 0, 22, 0, 15, 20, 0],
  ];
  feedSeed.forEach(([k, dn, hh, mm, breast, formula, water], i) => {
    feed.push({ id: Date.now() + i + '_f', time: dayTime(dn, hh, mm), breastMin: String(breast), formulaMl: String(formula), waterMl: String(water) });
  });

  return { profile, momDaily, babyDaily, diaper, feed };
}

/* ---------------- 通用 UI 小组件（复用 baby-care 页面内的 bc-* 样式类） ---------------- */

export function Field({ label, hint, children }) {
  return (
    <div className="min-w-0">
      <label className="mb-1.5 block text-[12px] text-[#86909C] font-medium">
        {label}{hint ? <span className="text-[#B4B8C0] ml-1">({hint})</span> : null}
      </label>
      {children}
    </div>
  );
}

export const inputCls = `w-full px-3 py-2 rounded-[8px] border text-[13px] text-[#333F51] bg-white
  placeholder:text-[#B4B8C0] transition-colors focus:outline-none
  border-[#E5E6EB] focus:border-[#5B8DEF]`;

export function PrimaryButton({ children, disabled, onClick, ...rest }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-[8px] text-[13.5px] font-medium text-white bg-[#5B8DEF] hover:bg-[#4a7ee0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      {...rest}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[8px] text-[12px] text-[#86909C] hover:text-[#333F51] hover:bg-[#F2F4F7] transition-colors"
    >
      {children}
    </button>
  );
}

function CardTitle({ icon: Icon, title, right, color }) {
  const c = color || ACCENT;
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h3 className="flex items-center gap-2 text-[16px] font-medium text-[#333F51]">
        <span className="flex items-center justify-center h-[26px] w-[26px] rounded-[8px]" style={{ background: `${c}26`, color: c }}>
          <Icon className="h-4 w-4" strokeWidth={1.8} />
        </span>
        {title}
      </h3>
      {right}
    </div>
  );
}

/* 通用分页列表（时间倒序） */
export function PaginatedList({ items, pageSize = 8, renderRow, empty = '暂无记录' }) {
  const [page, setPage] = useState(1);
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const cur = Math.min(page, pages);
  const slice = items.slice((cur - 1) * pageSize, cur * pageSize);
  return (
    <div>
      {slice.length ? (
        <div className="space-y-1.5">{slice.map((it) => renderRow(it))}</div>
      ) : (
        <div className="py-8 text-center text-[13px] text-[#B4B8C0]">{empty}</div>
      )}
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-[12px] text-[#86909C]">共 {total} 条 · 第 {cur}/{pages} 页</span>
          <div className="flex items-center gap-1.5">
            <button type="button" disabled={cur <= 1} onClick={() => setPage(cur - 1)}
              className="p-1.5 rounded-lg border border-[#E5E6EB] text-[#86909C] hover:text-[#333F51] disabled:opacity-40 disabled:pointer-events-none"><ChevronLeft className="h-4 w-4" /></button>
            <button type="button" disabled={cur >= pages} onClick={() => setPage(cur + 1)}
              className="p-1.5 rounded-lg border border-[#E5E6EB] text-[#86909C] hover:text-[#333F51] disabled:opacity-40 disabled:pointer-events-none"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}

/* 折叠卡片（用于导入说明等） */
export function Collapse({ open, onToggle, title, children }) {
  return (
    <div className="border border-[#E5E6EB] rounded-[12px] bg-white overflow-hidden">
      <button type="button" onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#F7F8FA] transition-colors">
        <span className="text-[13.5px] font-medium text-[#333F51]">{title}</span>
        <ChevronDown className="h-4 w-4 text-[#86909C] transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

/* ---------------- 宝宝基础档案页 ---------------- */
export function ProfilePage({ profile, onSave }) {
  const [form, setForm] = useState(profile || EMPTY_PROFILE);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setA = (k, v) => setForm((f) => ({ ...f, assessment: { ...(f.assessment || {}), [k]: v } }));
  const items = [
    ['face', '五官'], ['trunk', '躯干'], ['limbs', '四肢'], ['routine', '常规检查'], ['vaccine', '疫苗'], ['toileting', '大小便初评'], ['cry', '哭声'],
  ];
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="rounded-[12px] border border-[#E5E6EB] bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardTitle icon={UserRound} title="宝宝基础档案" right={<span className="text-[12px] text-[#B4B8C0]">出生信息用于预测与导入换算，请填写完整</span>} />
        <div className="grid grid-cols-2 gap-4 max-w-3xl">
          <Field label="姓名"><input className={inputCls} value={form.name || ''} onChange={(e) => set('name', e.target.value)} placeholder="宝宝" /></Field>
          <Field label="性别">
            <div className="flex gap-2">
              {['男', '女'].map((g) => (
                <button key={g} type="button" onClick={() => set('gender', g)}
                  className={`px-3 py-2 rounded-[8px] text-[12.5px] border transition-colors ${form.gender === g ? 'bg-[#E8F0FF] text-[#5B8DEF] border-[#5B8DEF]/50' : 'bg-[#F7F8FA] text-[#86909C] border-[#E5E6EB] hover:text-[#333F51]'}`}>{g}</button>
              ))}
            </div>
          </Field>
          <Field label="出生时间"><DateTimePicker value={form.birthTime || ''} onChange={(v) => set('birthTime', v)} /></Field>
          <Field label="入住时间"><DateTimePicker value={form.admitTime || ''} onChange={(v) => set('admitTime', v)} /></Field>
          <Field label="出生体重" hint="g"><input type="number" className={inputCls + ' no-spin'} value={form.birthWeight || ''} onChange={(e) => set('birthWeight', e.target.value)} placeholder="3200" /></Field>
          <Field label="出生身长" hint="cm"><input type="number" className={inputCls + ' no-spin'} value={form.height || ''} onChange={(e) => set('height', e.target.value)} placeholder="50" /></Field>
        </div>
      </div>

      <div className="rounded-[12px] border border-[#E5E6EB] bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardTitle icon={Stethoscope} title="入院评估" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map(([k, l]) => (
            <div key={k}>
              <Field label={l}><input className={inputCls} value={(form.assessment || {})[k] || ''} onChange={(e) => setA(k, e.target.value)} /></Field>
            </div>
          ))}
        </div>
        <div className="mt-5 flex gap-2">
          <PrimaryButton onClick={() => onSave(form)}><Check className="h-4 w-4" />保存档案</PrimaryButton>
        </div>
      </div>
    </div>
  );
}

/* ---------------- 妈妈每日护理记录页 ---------------- */
export function MomPage({ momDaily, onAdd, onDelete }) {
  const [form, setForm] = useState({ ...EMPTY_MOM, date: new Date().toISOString().slice(0, 10) });
  const [open, setOpen] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const sorted = useMemo(() => [...momDaily].sort((a, b) => (b.date || '').localeCompare(a.date || '')), [momDaily]);
  const rows = [
    ['emotion', '情绪', 'text', ''], ['diet', '饮食', 'text', ''], ['sleep', '睡眠', 'text', ''],
    ['feeding', '哺乳情况', 'text', ''], ['temp', '体温', 'number', ''], ['bp', '血压', 'text', '120/80'],
    ['hr', '心率', 'number', ''], ['breath', '呼吸', 'number', ''], ['breastCare', '乳房护理', 'text', ''],
    ['perineum', '会阴切口', 'text', ''], ['abdomen', '腹部切口', 'text', ''], ['poopTimes', '大便次数', 'number', ''],
    ['peeTimes', '小便次数', 'number', ''],
  ];
  const save = () => { if (!form.date) return; onAdd({ ...form, id: Date.now() }); setForm({ ...EMPTY_MOM, date: form.date }); };
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="rounded-[12px] border border-[#E5E6EB] bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardTitle icon={Heart} title="新增妈妈每日记录"
          right={<GhostButton onClick={() => setOpen((v) => !v)}>{open ? '收起' : '展开'} <ChevronDown className="h-4 w-4" style={{ transform: open ? 'rotate(180deg)' : 'none' }} /></GhostButton>} />
        {open && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label="日期"><DateTimePicker mode="date" value={form.date} onChange={(v) => set('date', v)} /></Field>
              <Field label="入住天数"><input type="number" className={inputCls + ' no-spin'} value={form.admitDay} onChange={(e) => set('admitDay', e.target.value)} /></Field>
              <Field label="生产天数"><input type="number" className={inputCls + ' no-spin'} value={form.postpartumDay} onChange={(e) => set('postpartumDay', e.target.value)} /></Field>
              {rows.map(([k, l, type, ph]) => (
                <Field key={k} label={l}><input type={type} className={inputCls + (type === 'number' ? ' no-spin' : '')} placeholder={ph} value={form[k] || ''} onChange={(e) => set(k, e.target.value)} /></Field>
              ))}
            </div>
            <div className="mt-4"><PrimaryButton onClick={save}><Check className="h-4 w-4" />保存妈妈记录</PrimaryButton></div>
          </>
        )}
      </div>

      <div className="rounded-[12px] border border-[#E5E6EB] bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardTitle icon={FileText} title="妈妈记录历史" right={<span className="text-[12px] text-[#86909C]">{sorted.length} 条</span>} />
        <PaginatedList items={sorted} pageSize={6} renderRow={(r) => (
          <div className="p-3 rounded-lg bg-[#F7F8FA] border-l-[3px] border-[#F97316]">
            <div className="flex items-center gap-3">
              <span className="text-[12px] text-[#86909C] tabular-nums shrink-0 w-[86px]">{fmtDate(r.date)}</span>
              <span className="text-[12px] text-[#5A6474] flex-1">入住 {r.admitDay || '-'} 天 · 生产 {r.postpartumDay || '-'} 天</span>
              <GhostButton onClick={() => onDelete(r.id)}><Trash2 className="h-3.5 w-3.5 text-[#EF4444]" /></GhostButton>
            </div>
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              <Chip icon={Heart} color="#5B8DEF">情绪 {r.emotion || '—'}</Chip>
              <Chip color="#40B57D">体温 {r.temp || '—'}℃</Chip>
              <Chip color="#7048E8">BP {r.bp || '—'}</Chip>
              <Chip color="#0CA678">HR {r.hr || '—'}</Chip>
              <Chip icon={Moon} color="#FF9F43">睡眠 {r.sleep || '—'}</Chip>
              <Chip color="#4C6EF5">便 {r.poopTimes || '0'} 次</Chip>
              <Chip color="#12B8A6">尿 {r.peeTimes || '0'} 次</Chip>
            </div>
          </div>
        )} empty="还没有妈妈记录，点击上方「展开」新增" />
      </div>
    </div>
  );
}

/* ---------------- 宝宝每日护理记录页 ---------------- */
export function BabyDailyPage({ babyDaily, onAdd, onDelete }) {
  const [form, setForm] = useState({ ...EMPTY_BABY, date: new Date().toISOString().slice(0, 10) });
  const [open, setOpen] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const sorted = useMemo(() => [...babyDaily].sort((a, b) => (b.date || '').localeCompare(a.date || '')), [babyDaily]);
  const save = () => { if (!form.date) return; onAdd({ ...form, id: Date.now() }); setForm({ ...EMPTY_BABY, date: form.date }); };
  const rows = [
    ['temp', '体温(℃)', 'number'], ['eyes', '五官护理', 'text'], ['skin', '皮肤护理', 'text'],
    ['nails', '指甲护理', 'text'], ['vulva', '外阴护理', 'text'], ['excretion', '排泄护理', 'text'],
    ['cord', '脐带护理', 'text'], ['passive', '被动操', 'text'], ['feedingSituation', '吃奶情况', 'text'],
    ['spitup', '溢奶/吐奶/呛奶', 'text'], ['bathTime', '洗澡时间', 'text'], ['swimTime', '游泳时间', 'text'],
    ['massageTime', '抚触时间', 'text'], ['sunTime', '日光浴时间', 'text'], ['jaundiceAM', '黄疸-上午', 'number'],
    ['jaundicePM', '黄疸-下午', 'number'], ['sleep', '睡眠情况', 'text'], ['special', '特殊处理', 'text'],
  ];
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="rounded-[12px] border border-[#E5E6EB] bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardTitle icon={Sun} title="新增宝宝每日记录"
          right={<GhostButton onClick={() => setOpen((v) => !v)}>{open ? '收起' : '展开'} <ChevronDown className="h-4 w-4" style={{ transform: open ? 'rotate(180deg)' : 'none' }} /></GhostButton>} />
        {open && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label="日期"><DateTimePicker mode="date" value={form.date} onChange={(v) => set('date', v)} /></Field>
              <Field label="入住天数"><input type="number" className={inputCls + ' no-spin'} value={form.admitDay} onChange={(e) => set('admitDay', e.target.value)} /></Field>
              <Field label="出生天数"><input type="number" className={inputCls + ' no-spin'} value={form.birthDay} onChange={(e) => set('birthDay', e.target.value)} /></Field>
              {rows.map(([k, l, type]) => (
                <Field key={k} label={l}><input type={type} className={inputCls + (type === 'number' ? ' no-spin' : '')} value={form[k] || ''} onChange={(e) => set(k, e.target.value)} /></Field>
              ))}
            </div>
            <div className="mt-4"><PrimaryButton onClick={save}><Check className="h-4 w-4" />保存宝宝记录</PrimaryButton></div>
          </>
        )}
      </div>

      <div className="rounded-[12px] border border-[#E5E6EB] bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardTitle icon={FileText} title="宝宝记录历史" right={<span className="text-[12px] text-[#86909C]">{sorted.length} 条</span>} />
        <PaginatedList items={sorted} pageSize={5} renderRow={(r) => (
          <div className="p-3 rounded-lg bg-[#F7F8FA] border-l-[3px] border-[#5B8DEF]">
            <div className="flex items-center gap-3">
              <span className="text-[12px] text-[#86909C] tabular-nums shrink-0 w-[86px]">{fmtDate(r.date)}</span>
              <span className="text-[12px] text-[#5A6474] flex-1">入住 {r.admitDay || '-'} 天 · 出生 {r.birthDay || '-'} 天</span>
              <GhostButton onClick={() => onDelete(r.id)}><Trash2 className="h-3.5 w-3.5 text-[#EF4444]" /></GhostButton>
            </div>
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              <Chip color="#40B57D">体温 {r.temp || '—'}℃</Chip>
              <Chip color="#FF9F43">黄疸 {r.jaundiceAM || '—'}/{r.jaundicePM || '—'}</Chip>
              <Chip color="#4C6EF5">脐带 {r.cord ? (r.cord === '正常' || r.cord === '已脱落' || r.cord === '干燥' ? r.cord : '已护理') : '—'}</Chip>
              <Chip icon={Moon} color="#7048E8">睡眠 {r.sleep || '—'}</Chip>
              <Chip color="#12B8A6">吐奶 {r.spitup || '—'}</Chip>
              {r.special && <Chip color="#EF4444">特殊：{r.special}</Chip>}
            </div>
          </div>
        )} empty="还没有宝宝记录，点击上方「展开」新增" />
      </div>
    </div>
  );
}

/* ---------------- 换尿布记录页 ---------------- */
export function DiaperPage({ diaper, onAdd, onDelete }) {
  const [time, setTime] = useState(() => {
    const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [pee, setPee] = useState(true);
  const [poop, setPoop] = useState(false);
  const sorted = useMemo(() => [...diaper].sort((a, b) => new Date(b.time) - new Date(a.time)), [diaper]);
  // 今日汇总
  const todayD = useMemo(() => sorted.filter((r) => isTodayISO(r.time)), [sorted]);
  const tCount = todayD.length;
  const tPee = todayD.filter((r) => r.pee).length;
  const tPoop = todayD.filter((r) => r.poop).length;
  const save = () => { onAdd({ id: Date.now(), time: new Date(time).toISOString(), pee, poop }); };
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="rounded-[12px] border border-[#E5E6EB] bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardTitle icon={Droplet} title="新增换尿布" />
        <div className="flex flex-wrap items-end gap-4 max-w-xl">
          <Field label="时间" hint="精确到分"><DateTimePicker value={time} onChange={setTime} /></Field>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPee(!pee)} className={`px-3 py-2 rounded-[8px] text-[12.5px] border transition-colors ${pee ? 'bg-[#C7D2FE] text-[#4C6EF5] border-[#C7D2FE]' : 'bg-[#F7F8FA] text-[#86909C] border-[#E5E6EB]'}`}>小便 {pee ? '✓' : ''}</button>
            <button type="button" onClick={() => setPoop(!poop)} className={`px-3 py-2 rounded-[8px] text-[12.5px] border transition-colors ${poop ? 'bg-[#B7E4C7] text-[#2F9E44] border-[#B7E4C7]' : 'bg-[#F7F8FA] text-[#86909C] border-[#E5E6EB]'}`}>大便 {poop ? '✓' : ''}</button>
          </div>
          <PrimaryButton onClick={save}><Check className="h-4 w-4" />保存</PrimaryButton>
        </div>
      </div>

      {/* 今日汇总 */}
      <div className="rounded-[12px] border border-[#E5E6EB] bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardTitle icon={Droplet} title="今日换尿布" right={<span className="text-[12px] text-[#86909C]">{tCount} 次</span>} />
        <div className="grid grid-cols-2 gap-3">
          <StatBox value={tCount} label="今日合计" unit="次" color="#5B8DEF" bg="#EEF4FF" />
          <StatBox value={tPee} label="小便" unit="次" color="#0CA678" bg="#E7F7F2" />
          <StatBox value={tPoop} label="大便" unit="次" color="#40B57D" bg="#EAF6F1" />
        </div>
      </div>

      <div className="rounded-[12px] border border-[#E5E6EB] bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardTitle icon={FileText} title="换尿布记录" right={<span className="text-[12px] text-[#86909C]">共 {sorted.length} 条</span>} />
        <PaginatedList items={sorted} pageSize={10} renderRow={(r) => (
          <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[#F7F8FA] border-l-[3px] border-[#B7E4C7]">
            <span className="text-[13px] text-[#333F51] tabular-nums w-[120px] shrink-0">{fmtDateTime(r.time)}</span>
            <span className="flex items-center gap-1.5">
              {r.pee ? <Chip icon={Droplet} color="#4C6EF5">小便</Chip> : null}
              {r.poop ? <Chip color="#2F9E44">大便</Chip> : null}
              {!r.pee && !r.poop && <span className="text-[12px] text-[#B4B8C0]">仅更换</span>}
            </span>
            <span className="flex-1" />
            <GhostButton onClick={() => onDelete(r.id)}><Trash2 className="h-3.5 w-3.5 text-[#EF4444]" /></GhostButton>
          </div>
        )} empty="还没有换尿布记录" />
      </div>
    </div>
  );
}

/* ---------------- 进食记录页 ---------------- */
export function FeedPage({ feed, onAdd, onDelete }) {
  const [time, setTime] = useState(() => {
    const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [form, setForm] = useState({ breastMin: '', formulaMl: '', waterMl: '' });
  const sorted = useMemo(() => [...feed].sort((a, b) => new Date(b.time) - new Date(a.time)), [feed]);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  // 今日营养汇总
  const todayF = useMemo(() => sorted.filter((r) => isTodayISO(r.time)), [sorted]);
  const fCount = todayF.length;
  const fBreast = todayF.reduce((s, r) => s + (+r.breastMin || 0), 0);
  const fFormula = todayF.reduce((s, r) => s + (+r.formulaMl || 0), 0);
  const fWater = todayF.reduce((s, r) => s + (+r.waterMl || 0), 0);
  const save = () => {
    onAdd({ id: Date.now(), time: new Date(time).toISOString(), breastMin: form.breastMin, formulaMl: form.formulaMl, waterMl: form.waterMl });
    setForm({ breastMin: '', formulaMl: '', waterMl: '' });
  };
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="rounded-[12px] border border-[#E5E6EB] bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardTitle icon={Sparkles} title="新增进食记录" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl">
          <Field label="进食时间"><DateTimePicker value={time} onChange={setTime} /></Field>
          <Field label="母乳吸吮时长" hint="分钟"><input type="number" className={inputCls + ' no-spin'} value={form.breastMin} onChange={(e) => set('breastMin', e.target.value)} placeholder="15" /></Field>
          <Field label="配方奶" hint="ml"><input type="number" className={inputCls + ' no-spin'} value={form.formulaMl} onChange={(e) => set('formulaMl', e.target.value)} placeholder="60" /></Field>
          <Field label="饮水量" hint="ml"><input type="number" className={inputCls + ' no-spin'} value={form.waterMl} onChange={(e) => set('waterMl', e.target.value)} placeholder="0" /></Field>
        </div>
        <div className="mt-4"><PrimaryButton onClick={save}><Check className="h-4 w-4" />保存进食记录</PrimaryButton></div>
      </div>

      {/* 今日营养汇总 */}
      <div className="rounded-[12px] border border-[#E5E6EB] bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardTitle icon={Sparkles} title="今日营养摄入" right={<span className="text-[12px] text-[#86909C]">{fCount} 次</span>} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatBox value={fBreast} label="母乳吸吮" unit="min" color="#5B8DEF" bg="#EEF4FF" />
          <StatBox value={fFormula} label="配方奶" unit="ml" color="#FFA94D" bg="#FFF3E6" />
          <StatBox value={fWater} label="饮水" unit="ml" color="#0CA678" bg="#E7F7F2" />
          <StatBox value={fCount} label="次数" unit="次" color="#7048E8" bg="#F0ECFC" />
        </div>
      </div>

      <div className="rounded-[12px] border border-[#E5E6EB] bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardTitle icon={FileText} title="进食记录" right={<span className="text-[12px] text-[#86909C]">共 {sorted.length} 条</span>} />
        <PaginatedList items={sorted} pageSize={8} renderRow={(r) => (
          <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[#F7F8FA] border-l-[3px] border-[#FFD8A8]">
            <span className="text-[13px] text-[#333F51] tabular-nums w-[120px] shrink-0">{fmtDateTime(r.time)}</span>
            <div className="flex items-center gap-1.5 flex-wrap flex-1">
              {r.breastMin != null && r.breastMin !== '' && <Chip icon={Milk} color="#5B8DEF">吸吮 {r.breastMin}min</Chip>}
              {r.formulaMl != null && r.formulaMl !== '' && <Chip icon={Droplet} color="#FF9F43">配方 {r.formulaMl}ml</Chip>}
              {r.waterMl != null && r.waterMl !== '' && <Chip icon={Droplet} color="#12B8A6">水 {r.waterMl}ml</Chip>}
              {!r.breastMin && !r.formulaMl && !r.waterMl && <span className="text-[12px] text-[#B4B8C0]">无记录值</span>}
            </div>
            <GhostButton onClick={() => onDelete(r.id)}><Trash2 className="h-3.5 w-3.5 text-[#EF4444]" /></GhostButton>
          </div>
        )} empty="还没有进食记录" />
      </div>
    </div>
  );
}

/* ---------------- 导入历史纸质数据面板 ---------------- */
export function ImportPanel({ onImport, hasData }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const doImport = () => {
    onImport();
    setConfirm(false);
    setOpen(false);
  };
  return (
    <div className="border border-[#E5E6EB] rounded-[12px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between px-4 py-3">
        <span className="flex items-center gap-2 text-[13.5px] font-medium text-[#333F51]">
          <CloudSun className="h-4 w-4 text-[#5B8DEF]" />导入历史纸质数据
        </span>
        <ChevronDown className="h-4 w-4 text-[#86909C] transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-[12px] text-[#86909C] leading-relaxed">
            导入宝宝档案、妈妈每日记录、宝宝每日记录、换尿布记录与进食记录全部纸质条目。
            {hasData ? '当前已有数据，导入会<b>追加</b>合并（不会清除已有记录）。' : '当前为空，可直接导入。'}
          </p>
          {!confirm ? (
            <PrimaryButton onClick={() => setConfirm(true)}>一键导入全部纸质数据</PrimaryButton>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[12px] color-[#EF4444] text-[#EF4444]">确认追加导入？</span>
              <button type="button" onClick={doImport} className="px-3 py-1.5 rounded-[8px] text-[12.5px] bg-[#5B8DEF] text-white">确认导入</button>
              <button type="button" onClick={() => setConfirm(false)} className="px-3 py-1.5 rounded-[8px] text-[12.5px] border border-[#E5E6EB] text-[#86909C]">取消</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
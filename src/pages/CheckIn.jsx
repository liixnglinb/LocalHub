import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ClipboardCheck,
  Play,
  Square,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  QrCode,
  Bot,
  FolderOpen,
  Save,
  Trash2,
  Users,
  MapPin,
  Bell,
  Eye,
  EyeOff,
  Plus,
  FileCode,
  Settings2,
  Activity,
  Info,
  BookOpen,
  ChevronRight,
  ChevronDown,
  History,
  ClipboardList,
  Clock,
} from 'lucide-react';
import jsQR from 'jsqr';
import Dropdown from '../components/Dropdown';
import TimeWheelPicker from '../components/TimeWheelPicker';
import ConfirmDialog from '../components/ConfirmDialog';

const TABS = [
  { id: 'engine', label: '引擎控制', icon: Activity },
  { id: 'courses', label: '课程活动', icon: BookOpen },
  { id: 'accounts', label: '账号管理', icon: Users },
  { id: 'location', label: '位置预设', icon: MapPin },
  { id: 'notify', label: '通知设置', icon: Bell },
  { id: 'advanced', label: '高级配置', icon: Settings2 },
];

const emptyAccount = { username: '', password: '' };
const emptyGeo = { courseId: '', lat: '', lon: '', address: '', onlyOnWeekdays: [] };
const WEEK_NAMES = ['日', '一', '二', '三', '四', '五', '六'];

// 签到/活动类型辅助
function typeName(t) {
  const map = { qr: '二维码', gesture: '手势', location: '位置', photo: '拍照', normal: '普通', 0: '签到', 1: '投票', 2: '问卷', 3: '讨论', 4: '抢答', 5: '通知' };
  return map[t] || map[String(t)] || String(t || '其他');
}
function typeChip(t) {
  const s = String(t);
  if (s === 'qr' || s === '0') return 'bg-sky-500/15 text-sky-300 border-sky-400/30';
  if (s === 'location' || s === '4') return 'bg-amber-500/15 text-amber-300 border-amber-400/30';
  if (s === 'gesture' || s === '3') return 'bg-pink-500/15 text-pink-300 border-pink-400/30';
  if (s === 'photo' || s === '1') return 'bg-cyan-500/15 text-cyan-300 border-cyan-400/30';
  return 'bg-white/10 text-white/60 border-white/15';
}
function formatAidTime(ts) {
  if (!ts) return '';
  const n = Number(ts);
  if (!n) return ts;
  const d = new Date(n);
  if (isNaN(d)) return ts;
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function CheckIn() {
  const [activeTab, setActiveTab] = useState('engine');
  const [enginePath, setEnginePath] = useState(null);
  const [status, setStatus] = useState({ running: false, pid: null });
  const [logs, setLogs] = useState([]);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const [loginMsg, setLoginMsg] = useState(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const [qrInput, setQrInput] = useState('');
  const [qrSubmitting, setQrSubmitting] = useState(false);
  const [qrMsg, setQrMsg] = useState(null);
  const [qrRecognizing, setQrRecognizing] = useState(false);
  const [qrPreview, setQrPreview] = useState(null);
  const [history, setHistory] = useState([]);
  const [configPreview, setConfigPreview] = useState(null);
  const logsEndRef = useRef(null);

  // 配置状态（对应引擎 config.yaml 全字段）
  const [cfg, setCfg] = useState({
    accounts: [{ ...emptyAccount }],
    pushplusToken: '',
    webPort: 3456,
    ocrSecretId: '',
    ocrSecretKey: '',
    ignoreCourses: '',
    geoLocations: [],
    checkinTime: '08:00',           // 兼容旧字段
    checkinTimeStart: '08:00',      // 每日签到时间段：开始
    checkinTimeEnd: '12:00',        // 每日签到时间段：结束
  });

  // 课程/活动状态
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [coursesMsg, setCoursesMsg] = useState(null);
  const [expandedCourse, setExpandedCourse] = useState(null);
  const [activities, setActivities] = useState([]);
  const [actsLoading, setActsLoading] = useState(false);
  const [queryAid, setQueryAid] = useState('');
  const [queryResult, setQueryResult] = useState(null);
  const [engineHistory, setEngineHistory] = useState([]);
  const [engineStats, setEngineStats] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // 加载课程列表
  const loadCourses = useCallback(async () => {
    setCoursesLoading(true);
    setCoursesMsg(null);
    try {
      const r = await window.electronAPI?.checkinCourses?.();
      if (r && r.ok) {
        setCourses(r.courses || []);
        if (!r.courses || !r.courses.length) setCoursesMsg({ ok: false, text: '未获取到课程，请确认账号已登录（先启动引擎完成一次登录）' });
      } else {
        setCoursesMsg({ ok: false, text: r?.msg || '获取课程失败' });
      }
    } catch (e) {
      setCoursesMsg({ ok: false, text: '获取课程失败：' + e.message });
    } finally {
      setCoursesLoading(false);
    }
  }, []);

  // 切到"位置预设"Tab 且尚未加载课程时，自动拉取一次课程列表（供选择对应课程）
  useEffect(() => {
    if (activeTab === 'location' && courses.length === 0 && !coursesLoading && !coursesMsg?.ok) {
      loadCourses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // 展开课程 → 加载活动
  const toggleCourse = async (courseId, classId) => {
    if (expandedCourse === courseId) { setExpandedCourse(null); setActivities([]); return; }
    setExpandedCourse(courseId);
    setActsLoading(true);
    try {
      const r = await window.electronAPI?.checkinActivities?.({ courseId, classId });
      if (r && r.ok) setActivities(r.activities || []);
      else setActivities([]);
    } catch {
      setActivities([]);
    } finally {
      setActsLoading(false);
    }
  };

  // 查询活动（aid → 类型）
  const handleQueryAid = async () => {
    if (!queryAid.trim()) return;
    setQueryResult(null);
    try {
      const r = await window.electronAPI?.checkinQuery?.(queryAid.trim());
      if (r && r.ok) setQueryResult({ ok: true, info: r.info });
      else setQueryResult({ ok: false, text: r?.msg || '查询失败' });
    } catch (e) {
      setQueryResult({ ok: false, text: e.message });
    }
  };

  // 加载引擎完整历史 + 统计
  const loadEngineHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const r = await window.electronAPI?.checkinEngineHistory?.();
      if (r && r.ok) {
        setEngineHistory(r.records || []);
        setEngineStats(r.stats || null);
      }
    } catch {} finally {
      setHistoryLoading(false);
    }
  }, []);

  // 加载
  useEffect(() => {
    (async () => {
      try {
        const saved = await window.electronAPI?.loadData?.('checkin-config');
        if (saved && typeof saved === 'object') {
          setCfg((c) => ({
            ...c,
            ...saved,
            accounts: saved.accounts && saved.accounts.length ? saved.accounts : [{ ...emptyAccount }],
            geoLocations: saved.geoLocations || [],
          }));
        }
        const rec = await window.electronAPI?.loadData?.('checkin-history');
        if (Array.isArray(rec)) setHistory(rec.slice(0, 50));
      } catch {}
      try {
        const p = await window.electronAPI?.getCheckinEnginePath?.();
        setEnginePath(p || null);
      } catch {}
      refreshStatus();
    })();
  }, []);

  // 日志订阅
  useEffect(() => {
    if (!window.electronAPI?.onCheckinLog) return;
    const off = window.electronAPI.onCheckinLog((chunk) => {
      // 主进程节流合并，可能含多行，按行拆分追加
      setLogs((prev) => {
        const lines = String(chunk).split('\n').filter((l) => l.trim());
        if (!lines.length) return prev;
        return [...prev, ...lines].slice(-400);
      });
    });
    const offExit = window.electronAPI.onCheckinExit(() => {
      setStatus((s) => ({ ...s, running: false, pid: null }));
    });
    return () => { off && off(); offExit && offExit(); };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const s = await window.electronAPI?.checkinStatus?.();
        if (s && Array.isArray(s.logs) && s.logs.length) {
          setLogs((prev) => (prev.length === 0 ? s.logs : prev));
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (logsEndRef.current) logsEndRef.current.scrollTop = logsEndRef.current.scrollHeight;
  }, [logs]);

  const refreshStatus = useCallback(async () => {
    try {
      const s = await window.electronAPI?.checkinStatus?.();
      if (s) setStatus({ running: !!s.running, pid: s.pid || null });
    } catch {}
  }, []);

  /* ---------- 配置操作 ---------- */
  const persistCfg = async (next) => {
    setCfg(next);
    await window.electronAPI?.saveData?.('checkin-config', next);
  };

  const handleSaveConfig = async (showMsg = true) => {
    setSaving(true);
    setSaveMsg(null);
    try {
      await persistCfg(cfg);
      // 同时写入引擎 config.yaml
      const r = await window.electronAPI?.checkinWriteConfig?.(cfg);
      if (r && !r.ok) {
        setSaveMsg({ ok: false, text: '已保存本地，但写入引擎配置失败：' + r.msg });
      } else if (showMsg) {
        setSaveMsg({ ok: true, text: '✅ 配置已保存并写入引擎 config.yaml' });
        if (r?.preview) setConfigPreview(r.preview);
      }
      setTimeout(() => setSaveMsg(null), 3500);
    } finally {
      setSaving(false);
    }
  };

  const handlePreviewConfig = async () => {
    const r = await window.electronAPI?.checkinWriteConfig?.(cfg);
    if (r && r.preview) setConfigPreview(r.preview);
  };

  /* ---------- 账号管理 ---------- */
  const updateAccount = (idx, field, val) => {
    const next = { ...cfg, accounts: cfg.accounts.map((a, i) => (i === idx ? { ...a, [field]: val } : a)) };
    persistCfg(next);
  };
  const addAccount = () => {
    const next = { ...cfg, accounts: [...cfg.accounts, { ...emptyAccount }] };
    persistCfg(next);
  };
  const removeAccount = (idx) => {
    if (cfg.accounts.length <= 1) return;
    const next = { ...cfg, accounts: cfg.accounts.filter((_, i) => i !== idx) };
    persistCfg(next);
  };

  /* 登录账号并且保存：保存配置 → 真实调用学习通登录 → cookie 写入引擎 → 刷新课程 */
  const handleLoginAndSave = async () => {
    const acc = cfg.accounts[0];
    if (!acc?.username?.trim() || !acc?.password) {
      setLoginMsg({ ok: false, text: '请先填写学习通账号和密码' });
      setTimeout(() => setLoginMsg(null), 3500);
      return;
    }
    setLoggingIn(true);
    setLoginMsg(null);
    try {
      await persistCfg(cfg);
      const r = await window.electronAPI?.checkinWriteConfig?.(cfg);
      const lr = await window.electronAPI?.checkinLogin?.({ username: acc.username.trim(), password: acc.password });
      if (lr && lr.ok) {
        setLoginMsg({ ok: true, text: `✅ 登录成功${lr.name ? '（' + lr.name + '）' : ''}，凭据已保存，正在刷新课程…` });
        loadCourses();
      } else {
        setLoginMsg({ ok: false, text: (lr?.msg || '登录失败，请检查账号密码') + (r && !r.ok ? '（配置写入引擎失败：' + r.msg + '）' : '') });
      }
    } catch (e) {
      setLoginMsg({ ok: false, text: '登录异常：' + e.message });
    } finally {
      setLoggingIn(false);
      setTimeout(() => setLoginMsg(null), 5000);
    }
  };

  /* ---------- 位置预设 ---------- */
  const updateGeo = (idx, field, val) => {
    const next = { ...cfg, geoLocations: cfg.geoLocations.map((g, i) => (i === idx ? { ...g, [field]: val } : g)) };
    persistCfg(next);
  };
  const addGeo = () => {
    // 新位置预设：优先用第一门课作为默认对应课程（有课程列表时）
    const firstCourse = courses[0];
    const next = {
      ...cfg,
      geoLocations: [
        ...cfg.geoLocations,
        firstCourse
          ? { ...emptyGeo, courseId: String(firstCourse.courseId), address: firstCourse.name || '' }
          : { ...emptyGeo },
      ],
    };
    persistCfg(next);
  };
  const removeGeo = (idx) => {
    const next = { ...cfg, geoLocations: cfg.geoLocations.filter((_, i) => i !== idx) };
    persistCfg(next);
  };
  const toggleWeekday = (idx, day) => {
    const g = cfg.geoLocations[idx];
    const has = (g.onlyOnWeekdays || []).includes(day);
    const next = { ...cfg, geoLocations: cfg.geoLocations.map((gg, i) => (i === idx
      ? { ...gg, onlyOnWeekdays: has ? (gg.onlyOnWeekdays || []).filter((d) => d !== day) : [...(gg.onlyOnWeekdays || []), day].sort() }
      : gg)) };
    persistCfg(next);
  };

  /* ---------- 引擎控制 ---------- */
  const handleStart = async () => {
    setStarting(true);
    try {
      const r = await window.electronAPI?.checkinStart?.();
      if (r && !r.ok) alert('启动失败：' + r.msg);
      setTimeout(refreshStatus, 1500);
    } finally {
      setStarting(false);
    }
  };
  const handleStop = async () => {
    setStopping(true);
    try {
      await window.electronAPI?.checkinStop?.();
      setTimeout(refreshStatus, 1000);
    } finally {
      setStopping(false);
    }
  };
  const handleOpenEngineDir = () => {
    if (enginePath) window.electronAPI?.openPath?.(enginePath);
  };

  /* ---------- QR 签到 ---------- */
  // 处理二维码图片文件（文件选择器 + 拖拽上传共用）→ 本地 jsQR 解码 → 自动填入
  const processQrFile = (file) => {
    if (!file) return;
    if (!file.type || !file.type.startsWith('image/')) {
      setQrMsg({ ok: false, text: '❌ 请拖入图片文件（jpg/png 等）' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        setQrPreview(reader.result);
        setQrRecognizing(true);
        setQrMsg(null);
        try {
          // 绘制到 canvas 解码
          const canvas = document.createElement('canvas');
          const scale = Math.min(1, 1024 / img.width);
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(data.data, data.width, data.height, { inversionAttempts: 'dontInvert' });
          if (code && code.data) {
            const text = code.data.trim();
            setQrInput(text);
            setQrMsg({ ok: true, text: '✅ 识别成功！已填入下方，点"提交签到"即可' });
          } else {
            // 尝试反色再识别一次
            const code2 = jsQR(data.data, data.width, data.height, { inversionAttempts: 'attemptBoth' });
            if (code2 && code2.data) {
              setQrInput(code2.data.trim());
              setQrMsg({ ok: true, text: '✅ 识别成功！已填入下方，点"提交签到"即可' });
            } else {
              setQrMsg({ ok: false, text: '❌ 未能识别出二维码，请换更清晰的图片' });
            }
          }
        } catch (err) {
          setQrMsg({ ok: false, text: '识别失败：' + err.message });
        } finally {
          setQrRecognizing(false);
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  // 文件选择器上传
  const handleQrImage = (e) => {
    processQrFile(e.target.files && e.target.files[0]);
    e.target.value = '';
  };

  // 拖拽上传
  const [qrDragOver, setQrDragOver] = useState(false);
  const handleQrDragOver = (e) => { e.preventDefault(); setQrDragOver(true); };
  const handleQrDragLeave = () => setQrDragOver(false);
  const handleQrDrop = (e) => {
    e.preventDefault();
    setQrDragOver(false);
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    processQrFile(file);
  };

  const handleQrSubmit = async () => {
    if (!qrInput.trim()) return;
    setQrSubmitting(true);
    setQrMsg(null);
    try {
      const r = await window.electronAPI?.checkinQr?.(qrInput.trim());
      const entry = {
        time: new Date().toLocaleString('zh-CN'),
        input: qrInput.trim().slice(0, 80),
        ok: r?.ok,
        msg: r?.msg || r?.data || '',
      };
      const next = [entry, ...history].slice(0, 50);
      setHistory(next);
      await window.electronAPI?.saveData?.('checkin-history', next);
      setQrMsg({ ok: r?.ok, text: r?.msg || r?.data || '已发送' });
      if (r?.ok) setQrInput('');
    } catch (e) {
      setQrMsg({ ok: false, text: e.message });
    } finally {
      setQrSubmitting(false);
    }
  };

  const [confirmClearHistory, setConfirmClearHistory] = useState(false);

  const handleClearHistory = async () => {
    setHistory([]);
    await window.electronAPI?.saveData?.('checkin-history', []);
  };

  const stateColor = status.running ? 'ok' : 'idle';

  return (
    <div className="space-y-5 pb-10">
      {/* 标题 */}
      <div className="flex items-center justify-between animate-slide-up">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-[10px] flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid var(--line)' }}>
            <ClipboardCheck className="h-5 w-5 text-white/85" strokeWidth={1.6} />
          </div>
          <div>
            <h1 className="title-display text-[22px] tracking-tight">学习通自动签到</h1>
            <p className="text-[12.5px] text-white/50 mt-0.5">完整迁移 superstar-checkin 全部功能</p>
          </div>
        </div>
        <button onClick={() => handleSaveConfig()} disabled={saving} className="btn btn-primary">
          {saving ? <span className="spinner" /> : <Save className="h-3.5 w-3.5" />}
          {saving ? '保存中…' : '保存并生效'}
        </button>
      </div>

      {/* 保存反馈 */}
      {saveMsg && (
        <div className={`p-3 rounded-[8px] text-[12.5px] animate-slide-down ${saveMsg.ok ? 'bg-emerald-500/10 text-emerald-200 border border-emerald-500/20' : 'bg-red-500/10 text-red-200 border border-red-500/20'}`}>
          {saveMsg.text}
        </div>
      )}

      {/* Tab 切换 */}
      <div className="inline-flex p-0.5 rounded-[8px] gap-0.5 animate-slide-up" style={{ background: 'var(--bg-1)', border: '1px solid var(--line)' }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-[7px] text-[12.5px] font-medium transition-colors ${
              activeTab === id ? 'bg-white/[0.12] text-white' : 'text-white/55 hover:text-white/80'
            }`}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={1.6} />
            {label}
          </button>
        ))}
      </div>

      {/* ===== 引擎控制 ===== */}
      {activeTab === 'engine' && (
        <div className="space-y-4 animate-fade-in">
          <div className="glass p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div
                  className="h-7 w-7 rounded-[9px] flex items-center justify-center shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, rgba(34,195,214,0.20), rgba(127,216,168,0.08))',
                    border: '1px solid rgba(34,195,214,0.35)',
                    boxShadow: '0 0 14px -2px rgba(34,195,214,0.45), inset 0 1px 0 rgba(255,255,255,0.08)',
                  }}
                >
                  <Bot className="h-4 w-4 text-cyan-300" strokeWidth={1.8} />
                </div>
                <h2 className="text-[14px] font-semibold">签到引擎</h2>
              </div>
              <button onClick={refreshStatus} className="btn btn-ghost p-1.5" title="刷新">
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div className="p-3.5 rounded-[8px] bg-white/[0.03] border border-white/[0.06]">
                <div className="text-[10px] text-white/40 uppercase tracking-wider font-semibold mb-1.5">引擎位置</div>
                <div className="text-[12px] font-mono truncate" title={enginePath || ''}>{enginePath ? enginePath.replace(/^[A-Z]:\\/, '') : '未发现'}</div>
                {enginePath && (
                  <button onClick={handleOpenEngineDir} className="mt-2 text-[11px] text-cyan-300 hover:text-cyan-200 flex items-center gap-1">
                    <FolderOpen className="h-3 w-3" /> 打开目录
                  </button>
                )}
              </div>
              <div className="p-3.5 rounded-[8px] bg-white/[0.03] border border-white/[0.06]">
                <div className="text-[10px] text-white/40 uppercase tracking-wider font-semibold mb-1.5">运行状态</div>
                <div className="flex items-center gap-2">
                  <span className={`status-dot ${stateColor} ${status.running ? 'animate-pulse-glow' : ''}`} />
                  <span className={`text-[13px] font-medium ${status.running ? 'text-emerald-300' : 'text-white/55'}`}>
                    {status.running ? '运行中' : '未启动'}
                  </span>
                </div>
                {status.running && status.pid && (
                  <div className="mt-1 text-[10px] text-white/35 font-mono">PID {status.pid}</div>
                )}
              </div>
              <div className="p-3.5 rounded-[8px] bg-white/[0.03] border border-white/[0.06]">
                <div className="text-[10px] text-white/40 uppercase tracking-wider font-semibold mb-1.5">操作</div>
                <div className="flex gap-2">
                  {!status.running ? (
                    <button onClick={handleStart} disabled={starting || !enginePath} className="btn btn-primary flex-1">
                      {starting ? <span className="spinner" /> : <Play className="h-3.5 w-3.5" />}
                      {starting ? '启动中' : '启动服务'}
                    </button>
                  ) : (
                    <button onClick={handleStop} disabled={stopping} className="btn btn-danger flex-1">
                      {stopping ? <span className="spinner" /> : <Square className="h-3.5 w-3.5" />}
                      停止服务
                    </button>
                  )}
                </div>
              </div>
            </div>

            {!enginePath && (
              <div className="p-3 rounded-[8px] bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-300 shrink-0 mt-0.5" />
                <div className="text-[12px] text-amber-200/85">
                  未检测到签到引擎。请将 <code className="px-1 py-0.5 bg-black/30 rounded text-amber-100">superstar-checkin</code> 项目放到{' '}
                  <code className="px-1 py-0.5 bg-black/30 rounded text-amber-100">D:\Claude code\superstar-checkin</code>，并先执行{' '}
                  <code className="px-1 py-0.5 bg-black/30 rounded text-amber-100">npm install && npm run build</code>。
                </div>
              </div>
            )}

            {/* 实时日志 */}
            <div className="mt-4">
              <div className="text-[10px] text-white/40 uppercase tracking-wider font-semibold mb-2">实时日志</div>
              <div ref={logsEndRef} className="bg-[#0a0a0d] rounded-[8px] p-3 max-h-64 overflow-y-auto border border-white/[0.06]">
                {logs.length === 0 ? (
                  <p className="text-[12px] text-white/30 text-center py-6">暂无日志 · 启动服务后查看</p>
                ) : (
                  logs.slice(-120).map((line, i) => (
                    <div key={i} className="log-line">{line.trim()}</div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* QR 签到 */}
          <div className="glass p-5">
            <div className="flex items-center gap-2 mb-2">
              <QrCode className="h-4 w-4 text-emerald-300" strokeWidth={1.6} />
              <h2 className="text-[14px] font-semibold">二维码签到</h2>
            </div>
            <p className="text-[12px] text-white/45 mb-4">
              上传学习通签到二维码图片，软件自动识别并提交；也可以直接粘贴
              <code className="px-1 bg-black/30 rounded">aid=...&enc=...</code>
            </p>
            <div className="space-y-3">
              {/* 上传识别：点击选择 或 直接拖拽图片进来 */}
              <div
                className="rounded-[10px] p-3 transition-all"
                style={{
                  border: qrDragOver ? '1.5px dashed rgba(34,195,214,0.8)' : '1px dashed rgba(255,255,255,0.14)',
                  background: qrDragOver ? 'rgba(34,195,214,0.08)' : 'rgba(255,255,255,0.02)',
                }}
                onDragOver={handleQrDragOver}
                onDragLeave={handleQrDragLeave}
                onDrop={handleQrDrop}
              >
                <div className="flex items-center gap-2">
                  <label className={`btn ${qrDragOver ? 'btn-primary' : 'btn-default'} flex-1 cursor-pointer justify-center`}>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleQrImage}
                    />
                    {qrRecognizing ? '识别中...' : '点击上传 或 拖拽图片到这里'}
                  </label>
                  {qrPreview && (
                    <img src={qrPreview} alt="二维码预览" className="h-10 w-10 rounded-[6px] object-contain border border-white/15" />
                  )}
                </div>
              </div>

              <textarea
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                placeholder='识别结果会自动填入这里，也可手动粘贴：aid=123&enc=ABCDEF'
                rows={3}
                className="w-full resize-none font-mono text-xs"
              />
              <div className="flex gap-2">
                <button onClick={handleQrSubmit} disabled={qrSubmitting || !status.running} className="btn btn-primary flex-1">
                  {qrSubmitting ? <span className="spinner" /> : <QrCode className="h-3.5 w-3.5" />}
                  {qrSubmitting ? '提交中...' : '提交签到'}
                </button>
              </div>
              {!status.running && <p className="text-[11px] text-amber-300/80">⚠ 需要先启动签到引擎</p>}
              {qrMsg && (
                <div className={`p-3 rounded-lg text-[12px] ${qrMsg.ok ? 'bg-emerald-500/10 text-emerald-200 border border-emerald-500/20' : 'bg-red-500/10 text-red-200 border border-red-500/20'}`}>
                  {qrMsg.text}
                </div>
              )}
            </div>
          </div>

          {/* 历史记录 */}
          <div className="glass p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[14px] font-semibold">签到历史</h2>
              {history.length > 0 && (
                <button onClick={() => setConfirmClearHistory(true)} className="text-[11px] text-white/40 hover:text-red-300 flex items-center gap-1">
                  <Trash2 className="h-3 w-3" /> 清空
                </button>
              )}
            </div>
            {history.length === 0 ? (
              <p className="text-[12px] text-white/35 text-center py-8">暂无签到记录</p>
            ) : (
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {history.map((h, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-[8px] bg-white/[0.02] hover:bg-white/[0.05] text-[12px]">
                    <span className={`status-dot ${h.ok ? 'ok' : 'err'}`} />
                    <span className="text-white/45 font-mono w-36 shrink-0">{h.time}</span>
                    <span className="flex-1 truncate text-white/70" title={h.input}>{h.input}</span>
                    <span className={`text-[11px] ${h.ok ? 'text-emerald-300' : 'text-red-300'}`}>{h.ok ? '✅ 成功' : '❌ 失败'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== 课程活动 ===== */}
      {activeTab === 'courses' && (
        <div className="space-y-4 animate-fade-in">
          {/* 课程列表 */}
          <div className="glass p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-white/60" strokeWidth={1.6} />
                <h2 className="text-[14px] font-semibold">我的课程</h2>
              </div>
              <button onClick={loadCourses} disabled={coursesLoading} className="btn btn-default text-xs">
                {coursesLoading ? <span className="spinner" /> : <RefreshCw className="h-3 w-3" />}
                {coursesLoading ? '加载中...' : '刷新课程'}
              </button>
            </div>
            <p className="text-[11.5px] text-white/45 mb-3">从学习通拉取课程列表，展开查看最近签到/活动（需要账号已登录）</p>

            {coursesMsg && (
              <div className={`p-3 rounded-[8px] text-[12px] mb-3 ${coursesMsg.ok ? 'bg-emerald-500/10 text-emerald-200 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-200 border border-amber-500/20'}`}>
                {coursesMsg.text}
              </div>
            )}

            {courses.length === 0 && !coursesLoading ? (
              <div className="py-8 text-center">
                <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-40" strokeWidth={1.5} />
                <p className="text-[12.5px] text-white/40">点"刷新课程"拉取课程列表</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[55vh] overflow-y-auto">
                {courses.map((c) => (
                  <div key={c.courseId} className="rounded-[8px] bg-white/[0.03] border border-white/[0.06] overflow-hidden">
                    <button
                      onClick={() => toggleCourse(c.courseId, c.classId)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-white/[0.04] transition-colors"
                    >
                      {expandedCourse === c.courseId ? <ChevronDown className="h-3.5 w-3.5 text-white/40 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-white/40 shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <div className="text-[12.5px] font-medium text-white/85 truncate">{c.name}</div>
                        <div className="text-[10.5px] text-white/40 mt-0.5">课程ID {c.courseId}{c.teacher ? ' · ' + c.teacher : ''}</div>
                      </div>
                      {actsLoading && expandedCourse === c.courseId && <span className="spinner" />}
                    </button>
                    {expandedCourse === c.courseId && (
                      <div className="px-3 pb-3 space-y-1.5 border-t border-white/[0.05] pt-2">
                        {activities.length === 0 ? (
                          <p className="text-[11px] text-white/35 text-center py-2">暂无活动记录</p>
                        ) : (
                          activities.map((a, i) => (
                            <div key={i} className="flex items-center gap-2 px-2.5 py-2 rounded-[6px] bg-white/[0.02] hover:bg-white/[0.05]">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded chip ${typeChip(a.type)}`}>{a.typeName || typeName(a.type)}</span>
                              <span className="flex-1 min-w-0 text-[11.5px] text-white/70 truncate" title={a.name}>{a.name}</span>
                              {a.startTime && <span className="text-[10px] text-white/35 shrink-0">{formatAidTime(a.startTime)}</span>}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 手动查询签到 */}
          <div className="glass p-5">
            <div className="flex items-center gap-2 mb-3">
              <QrCode className="h-4 w-4 text-cyan-300" strokeWidth={1.6} />
              <h2 className="text-[14px] font-semibold">按签到码查询</h2>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={queryAid}
                onChange={(e) => setQueryAid(e.target.value)}
                placeholder="输入活动 aid（如 221234567）"
                className="flex-1 font-mono text-xs"
                onKeyDown={(e) => e.key === 'Enter' && handleQueryAid()}
              />
              <button onClick={handleQueryAid} disabled={!queryAid.trim()} className="btn btn-primary shrink-0">
                <ClipboardList className="h-3.5 w-3.5" />
                查询
              </button>
            </div>
            {queryResult && (
              <div className="mt-3 p-3 rounded-[8px] text-[12px] bg-white/[0.03] border border-white/[0.08] animate-slide-down">
                {queryResult.ok ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white/85">签到类型：</span>
                      <span className={`chip ${typeChip(queryResult.info.type)}`}>{typeName(queryResult.info.type)}</span>
                    </div>
                    {queryResult.info.title && <div className="text-white/60">标题：{queryResult.info.title}</div>}
                    {queryResult.info.locationText && <div className="text-white/60">位置：{queryResult.info.locationText}（精度 {queryResult.info.locationRange} 米）</div>}
                    <div className="text-[11px] text-white/40 pt-1 border-t border-white/[0.05] mt-1">
                      {queryResult.info.type === 'qr'
                        ? '→ 二维码签到：去"引擎控制"Tab 上传二维码图片'
                        : '→ 引擎运行时会在收到签到通知后自动完成此签到'}
                    </div>
                  </div>
                ) : (
                  <div className="text-amber-200">{queryResult.text}</div>
                )}
              </div>
            )}
          </div>

          {/* 完整签到历史 */}
          <div className="glass p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-white/60" strokeWidth={1.6} />
                <h2 className="text-[14px] font-semibold">签到历史（完整）</h2>
              </div>
              <button onClick={loadEngineHistory} disabled={historyLoading} className="btn btn-default text-xs">
                {historyLoading ? <span className="spinner" /> : <RefreshCw className="h-3 w-3" />}
                刷新
              </button>
            </div>

            {engineStats && (
              <div className="grid grid-cols-4 gap-2 mb-3">
                <div className="p-2 rounded-[6px] bg-white/[0.03] border border-white/[0.06] text-center">
                  <div className="text-[16px] font-semibold text-white/90">{engineStats.total}</div>
                  <div className="text-[9.5px] text-white/40">总签到</div>
                </div>
                <div className="p-2 rounded-[6px] bg-emerald-500/[0.08] border border-emerald-500/20 text-center">
                  <div className="text-[16px] font-semibold text-emerald-300">{engineStats.success}</div>
                  <div className="text-[9.5px] text-white/40">成功</div>
                </div>
                <div className="p-2 rounded-[6px] bg-red-500/[0.08] border border-red-500/20 text-center">
                  <div className="text-[16px] font-semibold text-red-300">{engineStats.fail}</div>
                  <div className="text-[9.5px] text-white/40">失败</div>
                </div>
                <div className="p-2 rounded-[6px] bg-white/[0.03] border border-white/[0.06] text-center">
                  <div className="text-[16px] font-semibold text-cyan-300">{Object.keys(engineStats.byType || {}).length}</div>
                  <div className="text-[9.5px] text-white/40">类型数</div>
                </div>
              </div>
            )}

            {engineHistory.length === 0 ? (
              <p className="text-[12px] text-white/35 text-center py-6">{historyLoading ? '加载中...' : '暂无签到历史（引擎签到后自动记录）'}</p>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {engineHistory.slice(0, 50).map((h, i) => (
                  <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-[6px] bg-white/[0.02] hover:bg-white/[0.04] text-[11.5px]">
                    <span className="text-white/40 w-32 shrink-0">{h.time}</span>
                    <span className="text-white/70 flex-1 min-w-0 truncate" title={h.result}>{h.courseName || '未知课程'}</span>
                    <span className={`chip ${typeChip(h.type)}`}>{typeName(h.type)}</span>
                    <span className={`text-[11px] shrink-0 ${(h.result || '').includes('成功') ? 'text-emerald-300' : 'text-red-300'}`}>
                      {(h.result || '').includes('成功') ? '✅' : '❌'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== 账号管理 ===== */}
      {activeTab === 'accounts' && (
        <div className="glass p-5 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[14px] font-semibold">账号管理</h2>
              <p className="text-[11.5px] text-white/40 mt-0.5">支持多账号，第一个账号用于获取签到信息</p>
            </div>
            <button onClick={addAccount} className="btn btn-default text-xs">
              <Plus className="h-3.5 w-3.5" /> 添加账号
            </button>
          </div>
          <div className="space-y-2.5">
            {cfg.accounts.map((acc, idx) => (
              <div key={idx} className="p-3.5 rounded-[8px] bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[11px] text-white/45 font-medium">账号 {idx + 1}{idx === 0 ? '（主账号）' : ''}</span>
                  {cfg.accounts.length > 1 && (
                    <button onClick={() => removeAccount(idx)} className="text-white/35 hover:text-red-300">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  <div>
                    <label className="mb-1 block text-[11px] text-white/50">学习通账号</label>
                    <input type="text" value={acc.username} onChange={(e) => updateAccount(idx, 'username', e.target.value)} placeholder="学号 / 手机号" className="w-full" />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-white/50">密码</label>
                    <input type="password" value={acc.password} onChange={(e) => updateAccount(idx, 'password', e.target.value)} placeholder="登录密码" className="w-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-col items-end gap-2">
            <button onClick={handleLoginAndSave} disabled={loggingIn || saving} className="btn btn-primary">
              {loggingIn ? <span className="spinner" /> : <Save className="h-3.5 w-3.5" />}
              {loggingIn ? '登录中…' : '登录账号并且保存'}
            </button>
            {loginMsg && (
              <div className={`text-[11.5px] px-3 py-2 rounded-[8px] border ${loginMsg.ok ? 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20' : 'bg-red-500/10 text-red-200 border-red-500/20'}`}>
                {loginMsg.text}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== 位置预设 ===== */}
      {activeTab === 'location' && (
        <div className="glass p-5 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[14px] font-semibold">位置预设</h2>
              <p className="text-[11.5px] text-white/40 mt-0.5">
                每个位置可指定对应课程（courseId 为 <code className="px-1 bg-black/30 rounded">*</code> 表示兜底）· 可选限定星期
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={loadCourses} disabled={coursesLoading} className="btn btn-default text-xs" title="拉取课程列表供选择">
                {coursesLoading ? <span className="spinner" /> : <RefreshCw className="h-3 w-3" />}
                刷新课程
              </button>
              <button onClick={addGeo} className="btn btn-primary text-xs">
                <Plus className="h-3.5 w-3.5" /> 添加位置
              </button>
            </div>
          </div>
          {coursesMsg && !coursesMsg.ok && (
            <div className="p-2.5 rounded-[8px] text-[11.5px] mb-3 bg-amber-500/10 text-amber-200 border border-amber-500/20">
              {coursesMsg.text} —— 也可以手动输入课程 ID
            </div>
          )}
          {cfg.geoLocations.length === 0 ? (
            <p className="text-[12px] text-white/35 text-center py-8">暂无位置预设 · 引擎将使用智能定位（地理编码/三角定位）</p>
          ) : (
            <div className="space-y-2.5">
              {cfg.geoLocations.map((g, idx) => (
                <div key={idx} className="p-3.5 rounded-[8px] bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[11px] text-white/45 font-medium">位置 {idx + 1}</span>
                    <button onClick={() => removeGeo(idx)} className="text-white/35 hover:text-red-300">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    <div>
                      <label className="mb-1 block text-[11px] text-white/50">对应课程（选择或手动填 ID）</label>
                      <Dropdown
                        value={g.courseId === '*' ? '*' : String(g.courseId || '')}
                        options={[
                          { value: '*', label: '* 兜底坐标（所有课）' },
                          ...courses.map((c) => ({ value: String(c.courseId), label: `${c.name}（ID ${c.courseId}）` })),
                        ]}
                        onChange={(v) => {
                          const course = courses.find((c) => String(c.courseId) === v);
                          updateGeo(idx, 'courseId', v === '*' ? '*' : v);
                          if (course && !g.address) updateGeo(idx, 'address', course.name || '');
                        }}
                        width="100%"
                        popupWidth="320px"
                      />
                      {courses.length === 0 && (
                        <p className="mt-1 text-[10px] text-white/35">未加载课程？去「课程活动」Tab 点"刷新课程"，或直接手动输入 ID</p>
                      )}
                      <input
                        type="text"
                        value={String(g.courseId || '')}
                        onChange={(e) => updateGeo(idx, 'courseId', e.target.value)}
                        placeholder="手动输入课程 ID，* 为兜底"
                        className="w-full mt-1.5"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-white/50">纬度 lat</label>
                      <input type="text" value={g.lat} onChange={(e) => updateGeo(idx, 'lat', e.target.value)} placeholder="27.712786" className="w-full" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-white/50">经度 lon</label>
                      <input type="text" value={g.lon} onChange={(e) => updateGeo(idx, 'lon', e.target.value)} placeholder="112.006406" className="w-full" />
                    </div>
                  </div>
                  <div className="mt-2.5">
                    <label className="mb-1 block text-[11px] text-white/50">地址</label>
                    <input type="text" value={g.address} onChange={(e) => updateGeo(idx, 'address', e.target.value)} placeholder="例如：湖南人文科技学院" className="w-full" />
                  </div>
                  <div className="mt-2.5">
                    <label className="mb-1 block text-[11px] text-white/50">限定星期（不选 = 每天）</label>
                    <div className="flex gap-1.5">
                      {WEEK_NAMES.map((w, di) => (
                        <button
                          key={di}
                          onClick={() => toggleWeekday(idx, di)}
                          className={`w-7 h-7 rounded-[6px] text-[12px] transition-colors ${
                            (g.onlyOnWeekdays || []).includes(di) ? 'bg-white/[0.2] text-white font-semibold' : 'bg-white/[0.04] text-white/40 hover:bg-white/[0.06]'
                          }`}
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <button onClick={() => handleSaveConfig()} disabled={saving} className="btn btn-primary">
              <Save className="h-3.5 w-3.5" /> 保存位置
            </button>
          </div>
        </div>
      )}

      {/* ===== 通知设置 ===== */}
      {activeTab === 'notify' && (
        <div className="glass p-5 animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-4 w-4 text-white/60" strokeWidth={1.6} />
            <h2 className="text-[14px] font-semibold">通知设置</h2>
          </div>
          <div className="space-y-4 max-w-md">
            {/* 每日签到时间段（开始 ~ 结束） */}
            <div className="glass-inset p-3.5 rounded-[10px]">
              <label className="mb-2 flex items-center gap-1.5 text-[11px] font-medium" style={{ color: 'var(--text-2)' }}>
                <Clock className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} strokeWidth={1.6} />
                每日签到时间段
              </label>
              <div className="flex items-center gap-2">
                <TimeWheelPicker
                  value={cfg.checkinTimeStart || '08:00'}
                  onChange={(v) => persistCfg({ ...cfg, checkinTimeStart: v, checkinTime: v })}
                />
                <span className="text-[11px] text-white/35 shrink-0">至</span>
                <TimeWheelPicker
                  value={cfg.checkinTimeEnd || '12:00'}
                  onChange={(v) => persistCfg({ ...cfg, checkinTimeEnd: v })}
                />
              </div>
              <p className="mt-1.5 text-[10.5px]" style={{ color: 'var(--text-4)' }}>
                引擎在此时间段内监听并自动签到，其余时间待命
              </p>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium" style={{ color: 'var(--text-2)' }}>
                PushPlus Token <span style={{ color: 'var(--text-4)' }}>(微信推送)</span>
              </label>
              <input type="text" value={cfg.pushplusToken} onChange={(e) => persistCfg({ ...cfg, pushplusToken: e.target.value })} placeholder="在 pushplus.plus 注册获取" className="w-full font-mono text-xs" />
              <p className="mt-1 text-[10.5px]" style={{ color: 'var(--text-4)' }}>签到成功 / 二维码识别结果会推送到你的微信</p>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button onClick={() => handleSaveConfig()} disabled={saving} className="btn btn-primary">
              <Save className="h-3.5 w-3.5" /> 保存设置
            </button>
          </div>
        </div>
      )}

      {/* ===== 高级配置 ===== */}
      {activeTab === 'advanced' && (
        <div className="glass p-5 animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <Settings2 className="h-4 w-4 text-white/60" strokeWidth={1.6} />
            <h2 className="text-[14px] font-semibold">高级配置</h2>
          </div>
          <div className="space-y-3 max-w-md">
            <div>
              <label className="mb-1 block text-[11px] text-white/50">Web 端口（QR API）</label>
              <div className="flex items-stretch gap-1.5">
                <button
                  onClick={() => persistCfg({ ...cfg, webPort: Math.max(1, (cfg.webPort || 3456) - 1) })}
                  className="btn btn-default px-3"
                  title="减少"
                >−</button>
                <input
                  type="number"
                  value={cfg.webPort}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val >= 1 && val <= 65535) {
                      persistCfg({ ...cfg, webPort: val });
                    } else if (e.target.value === '' || isNaN(val)) {
                      persistCfg({ ...cfg, webPort: 3456 });
                    }
                  }}
                  className="no-spin w-full text-center font-mono"
                />
                <button
                  onClick={() => persistCfg({ ...cfg, webPort: Math.min(65535, (cfg.webPort || 3456) + 1) })}
                  className="btn btn-default px-3"
                  title="增加"
                >+</button>
              </div>
              <p className="mt-1 text-[10.5px] text-white/35">端口用于二维码签到 API（默认 3456）</p>
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-white/50">忽略课程 ID（逗号分隔）</label>
              <input type="text" value={cfg.ignoreCourses} onChange={(e) => persistCfg({ ...cfg, ignoreCourses: e.target.value })} placeholder="例如：123456,789012" className="w-full" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-white/50">腾讯云 OCR SecretId（二维码签到用）</label>
              <input type="text" value={cfg.ocrSecretId} onChange={(e) => persistCfg({ ...cfg, ocrSecretId: e.target.value })} placeholder="选填" className="w-full font-mono text-xs" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-white/50">腾讯云 OCR SecretKey</label>
              <input type="text" value={cfg.ocrSecretKey} onChange={(e) => persistCfg({ ...cfg, ocrSecretKey: e.target.value })} placeholder="选填" className="w-full font-mono text-xs" />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={() => handlePreviewConfig()} className="btn btn-default">
              <FileCode className="h-3.5 w-3.5" /> 预览配置
            </button>
            <button onClick={() => handleSaveConfig()} disabled={saving} className="btn btn-primary">
              <Save className="h-3.5 w-3.5" /> 保存并写入
            </button>
          </div>

          {/* 配置预览 */}
          {configPreview && (
            <div className="mt-4">
              <div className="text-[10px] text-white/40 uppercase tracking-wider font-semibold mb-2">config.yaml 预览</div>
              <pre className="w-full p-4 rounded-[8px] bg-[#0a0a0d] border border-white/[0.06] text-[11.5px] text-white/70 mono whitespace-pre-wrap max-h-80 overflow-auto">
                {configPreview}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* 说明 */}
      <div className="glass p-4 animate-slide-up">
        <div className="flex items-start gap-2 mb-2">
          <Info className="h-4 w-4 text-amber-300 mt-0.5 shrink-0" strokeWidth={1.6} />
          <h2 className="text-[14px] font-semibold">使用说明</h2>
        </div>
        <ul className="text-[12px] text-white/55 space-y-1.5 list-disc list-inside leading-relaxed">
          <li>「保存并生效」会把你在本页的全部配置写入引擎的 <code className="px-1 bg-black/30 rounded text-cyan-200">config.yaml</code>，然后点「启动服务」即可。</li>
          <li>「课程活动」Tab：拉取学习通课程列表 → 展开看签到/活动 → 查询任意签到码类型；完整签到历史 + 成功/失败统计。</li>
          <li>支持多账号签到、PushPlus 微信推送、位置预设（含星期限定）、忽略课程、二维码签到、智能定位（地理编码 → 三角定位 → 坐标记忆）。</li>
          <li>二维码签到：上传二维码图片自动识别（jsQR 本地解码）或粘贴字符串提交。</li>
          <li>引擎服务启动后，收到老师发起的签到会自动完成（含 20~35 秒随机延迟、多账号依次签到、微信推送结果）。</li>
          <li>本工具仅供学习交流使用，使用者自行承担相应后果。</li>
        </ul>
      </div>

      {/* 清空签到历史确认（与全站一致） */}
      <ConfirmDialog
        open={confirmClearHistory}
        title="清空签到历史"
        message="将清空全部签到历史记录，此操作无法恢复。请确认是否继续？"
        confirmText="清空"
        cancelText="取消"
        onConfirm={() => { setConfirmClearHistory(false); handleClearHistory(); }}
        onCancel={() => setConfirmClearHistory(false)}
      />
    </div>
  );
}
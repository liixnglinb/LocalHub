const { app, BrowserWindow, ipcMain, shell, dialog, Notification, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const os = require('os');
const http = require('http');
const https = require('https');
const net = require('net');
const querystring = require('querystring');
const { spawn, exec, execSync, fork } = require('child_process');

// ============== 路径与状态 ==============
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const APP_NAME = 'LocalHub';

// 数据目录：放 D 盘 LocalHub/data 下（用户要求转移到 D 盘）
const DATA_DIR = (() => {
  const defaultDir = path.join('D:', 'LocalHub', 'data');
  try {
    if (!fs.existsSync(defaultDir)) fs.mkdirSync(defaultDir, { recursive: true });
    return defaultDir;
  } catch {
    return app.getPath('userData');
  }
})();

// 学习通签到引擎目录（用户本地真实系统）
const CHECKIN_ENGINE = (() => {
  const candidates = [
    'D:\\Claude code\\superstar-checkin',
    path.join('D:', 'Claude code', 'superstar-checkin'),
  ];
  for (const c of candidates) {
    try { if (fs.existsSync(c)) return c; } catch {}
  }
  return null;
})();

// 视频工作流前端目录
const VIDEO_WORKFLOW_DIR = (() => {
  const candidates = [
    'C:\\Users\\李星历\\Documents\\Default Project\\video-workflow',
    path.join(process.env.USERPROFILE || '', 'Documents', 'Default Project', 'video-workflow'),
  ];
  for (const c of candidates) {
    try { if (fs.existsSync(c)) return c; } catch {}
  }
  return null;
})();

// ============== 安全校验：路径白名单 ==============
// 安全的输出目录列表
const SAFE_OUTPUT_DIRS = [
  DATA_DIR,
  path.join(os.homedir(), 'Desktop'),
  path.join(os.homedir(), 'Videos'),
  path.join(os.homedir(), 'Downloads'),
];
if (isDev) {
  SAFE_OUTPUT_DIRS.push(path.join(path.dirname(DATA_DIR), 'dev'));
}

function isPathInSafeDir(targetPath) {
  try {
    const resolved = path.resolve(targetPath);
    return SAFE_OUTPUT_DIRS.some((dir) => resolved.startsWith(dir + path.sep) || resolved === dir);
  } catch { return false; }
}

function isPathInSafeInputDir(targetPath) {
  try {
    const resolved = path.resolve(targetPath);
    const allowedPrefixes = [
      DATA_DIR,
      os.homedir(),
      'D:\\LocalHub',
    ];
    return allowedPrefixes.some((p) => resolved.toLowerCase().startsWith(p.toLowerCase()));
  } catch { return false; }
}

// ============== 检测 ffmpeg 路径 ==============
function detectFfmpeg() {
  const candidates = [
    // 优先使用绝对路径，避免 PATH 劫持
    'C:\\Users\\李星历\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.2-full_build\\bin\\ffmpeg.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Packages', 'Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe', 'ffmpeg-8.1.2-full_build', 'bin', 'ffmpeg.exe'),
    // 最后才从 PATH 查找（兜底）
    'ffmpeg',
  ];
  for (const cmd of candidates) {
    try {
      const out = execSync(`"${cmd}" -version`, { stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 }).toString();
      if (out && /ffmpeg version/i.test(out)) {
        const m = out.match(/ffmpeg version ([^\s]+)/);
        return { path: cmd, version: m ? m[1] : 'unknown' };
      }
    } catch {}
  }
  return null;
}

// ============== 学习通签到状态 ==============
let checkinProcess = null;
let checkinLogs = [];
function pushCheckinLog(msg) {
  // 过滤已知无伤大雅的兼容性错误（环信 IM SDK 在新 Node 上的 a.open 报错，不影响签到）
  if (/a\.open is not a function|TypeError.*Easemob|imConnect/.test(msg)) return;
  const entry = `[${new Date().toLocaleString('zh-CN')}] ${msg}`;
  checkinLogs.push(entry);
  if (checkinLogs.length > 200) checkinLogs = checkinLogs.slice(-200);
  return entry;
}

// ============== 窗口 ==============
let mainWindow;
let tray = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    icon: path.join(__dirname, '../build/icons/icon.ico'),
    backgroundColor: '#0a0a0d',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0a0a0d',
      symbolColor: '#9a9aa3',
      height: 32,
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

function createTray() {
  try {
    const icon = nativeImage.createFromPath(path.join(__dirname, '../build/icons/icon-32.png'));
    tray = new Tray(icon);
    tray.setToolTip(APP_NAME);
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: '打开主界面', click: () => { if (mainWindow) mainWindow.show(); else createWindow(); } },
      { type: 'separator' },
      { label: '退出', click: () => app.quit() },
    ]));
  } catch (e) {
    console.warn('Tray init failed:', e.message);
  }
}

// ============== IPC: 数据存取（基于 D 盘 DATA_DIR） ==============
function filePath(key) {
  return path.join(DATA_DIR, `${key}.json`);
}

// ============== 敏感数据加密存储 ==============
// 哪些数据文件需要加密
const SENSITIVE_KEYS = new Set(['api-keys', 'checkin-config']);

// 加密密钥文件路径
const ENC_KEY_FILE = path.join(DATA_DIR, '.master.key');

function getOrCreateEncKey() {
  try {
    if (fs.existsSync(ENC_KEY_FILE)) return fs.readFileSync(ENC_KEY_FILE);
  } catch {}
  const key = crypto.randomBytes(32);
  fs.writeFileSync(ENC_KEY_FILE, key, { mode: 0o600 });
  return key;
}

function encryptData(plaintext) {
  const key = getOrCreateEncKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return JSON.stringify({ v: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), ct: ciphertext.toString('base64') });
}

function decryptData(encoded) {
  try {
    const { v, iv, tag, ct } = JSON.parse(encoded);
    if (v !== 1 || !iv || !tag || !ct) return null;
    const key = getOrCreateEncKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(ct, 'base64')), decipher.final()]).toString('utf8');
  } catch { return null; }
}

ipcMain.handle('save-data', async (e, key, value) => {
  const p = filePath(key);
  const tmp = p + '.tmp';
  const data = JSON.stringify(value, null, 2);
  if (SENSITIVE_KEYS.has(key)) {
    fs.writeFileSync(tmp, encryptData(data), 'utf-8');
  } else {
    fs.writeFileSync(tmp, data, 'utf-8');
  }
  fs.renameSync(tmp, p);
  return true;
});
ipcMain.handle('load-data', async (e, key) => {
  const p = filePath(key);
  if (!fs.existsSync(p)) return null;
  try {
    const raw = fs.readFileSync(p, 'utf-8');
    let data;
    if (SENSITIVE_KEYS.has(key)) {
      const decrypted = decryptData(raw);
      if (decrypted === null) return null;
      data = JSON.parse(decrypted);
    } else {
      data = JSON.parse(raw);
    }
    return data;
  } catch { return null; }
});
ipcMain.handle('delete-data', async (e, key) => {
  const p = filePath(key);
  if (fs.existsSync(p)) fs.unlinkSync(p);
  return true;
});
// 下载 favicon 为 base64（供 WebLinks 缓存，避免每次加载网络请求）
// 支持 3xx 重定向跟随（favicon.im 等会 302 到实际图源），并校验响应为图片
ipcMain.handle('fetch-favicon', async (e, url) => {
  try {
    const u = new URL(String(url || '').startsWith('http') ? url : `https://${url}`);
    const host = u.hostname;
    const sources = [
      `https://favicon.im/${host}?larger=true`,
      `https://${host}/favicon.ico`,
      `https://www.google.com/s2/favicons?domain=${host}&sz=128`,
    ];
    // 带重定向跟随 + 内容类型校验的下载
    const download = (srcUrl, hops = 0) => new Promise((resolve, reject) => {
      const req = https.get(srcUrl, { timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
        const code = res.statusCode || 0;
        if (code >= 300 && code < 400 && res.headers.location && hops < 3) {
          res.resume();
          const next = new URL(res.headers.location, srcUrl).toString();
          return resolve(download(next, hops + 1));
        }
        if (code >= 400) { res.resume(); return reject(new Error('HTTP ' + code)); }
        const mime = (res.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
        // 只接受图片内容（favicon.im 抓不到时可能返回 HTML 占位页）
        if (mime && !mime.startsWith('image/')) { res.resume(); return reject(new Error('not image: ' + mime)); }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          if (!buf.length || buf.length > 512 * 1024) return reject(new Error('empty or too large'));
          resolve({ data: `data:${mime || 'image/png'};base64,${buf.toString('base64')}` });
        });
      });
      req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
      req.on('error', (err) => reject(err));
    });
    for (const src of sources) {
      try {
        const r = await download(src);
        if (r && r.data) return { ok: true, data: r.data };
      } catch {}
    }
    return { ok: false, msg: 'favicon 获取失败' };
  } catch {
    return { ok: false, msg: 'URL 无效' };
  }
});
ipcMain.handle('open-external', async (e, url) => {
  // 安全校验：只允许 https 和 mailto 协议
  const u = String(url || '');
  if (!u.startsWith('https://') && !u.startsWith('mailto:')) {
    console.warn('[security] open-external blocked:', u.slice(0, 100));
    return false;
  }
  await shell.openExternal(u);
  return true;
});
ipcMain.handle('open-path', async (e, p) => {
  try {
    const resolved = path.resolve(String(p || ''));
    if (!resolved.startsWith(DATA_DIR + path.sep) && resolved !== DATA_DIR) {
      console.warn('[security] open-path blocked:', resolved);
      return false;
    }
    await shell.openPath(resolved);
    return true;
  } catch { return false; }
});
ipcMain.handle('reveal-path', async (e, p) => {
  try {
    const resolved = path.resolve(String(p || ''));
    if (!resolved.startsWith(DATA_DIR + path.sep) && resolved !== DATA_DIR) {
      console.warn('[security] reveal-path blocked:', resolved);
      return false;
    }
    shell.showItemInFolder(resolved);
    return true;
  } catch { return false; }
});

// 选择目录 / 文件对话框
ipcMain.handle('dialog-open-folder', async () => {
  const r = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
  return r.canceled ? null : r.filePaths[0];
});
ipcMain.handle('dialog-open-files', async (e, opts = {}) => {
  const r = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: opts.filters || [{ name: 'Video', extensions: ['mp4','mkv','avi','mov','flv','wmv','webm'] }],
  });
  return r.canceled ? [] : r.filePaths;
});
ipcMain.handle('dialog-save-file', async (e, opts) => {
  // opts 兼容两种调用：字符串默认名 或 { defaultPath, filters }
  const defaultPath = typeof opts === 'string' ? opts : (opts && opts.defaultPath) || 'output.mp4';
  const r = await dialog.showSaveDialog(mainWindow, { defaultPath, filters: (opts && opts.filters) || undefined });
  return { canceled: r.canceled, filePath: r.filePath || null };
});

// ============== IPC: 环境探测 ==============
ipcMain.handle('detect-ffmpeg', async () => detectFfmpeg());
// 探测视频时长（ffprobe）
ipcMain.handle('ffprobe-duration', async (e, filePath) => {
  // 安全校验：探测时长的文件必须在允许的目录下
  if (!isPathInSafeInputDir(filePath)) {
    return { duration: null };
  }
  return new Promise((resolve) => {
    try {
      const info = detectFfmpeg();
      if (!info) return resolve({ duration: null });
      // 由 ffmpeg 路径推导 ffprobe：兼容 PATH 名（'ffmpeg'/'ffmpeg.exe'）与完整路径两种
      const base = info.path.replace(/ffmpeg\.exe$/i, 'ffmpeg');
      const dir = path.dirname(base);
      const name = path.basename(base);
      const isBareName = dir === '.' || !info.path.includes('\\') && !info.path.includes('/');
      const ffprobePath = isBareName
        ? (process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe')
        : path.join(dir, name.replace(/^ffmpeg$/i, 'ffprobe') + (process.platform === 'win32' ? '.exe' : ''));
      const p = spawn(ffprobePath, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'json', filePath], { windowsHide: true });
      let out = '';
      p.stdout.on('data', (d) => out += d);
      p.on('close', (code) => {
        try {
          if (code === 0) {
            const j = JSON.parse(out);
            const dur = parseFloat(j.format?.duration);
            resolve({ duration: isNaN(dur) ? null : dur });
          } else resolve({ duration: null });
        } catch { resolve({ duration: null }); }
      });
      p.on('error', () => resolve({ duration: null }));
    } catch { resolve({ duration: null }); }
  });
});
ipcMain.handle('get-checkin-engine-path', async () => CHECKIN_ENGINE);
ipcMain.handle('get-video-workflow-path', async () => VIDEO_WORKFLOW_DIR);
ipcMain.handle('get-data-dir', async () => DATA_DIR);
ipcMain.handle('system-info', async () => ({
  platform: process.platform,
  arch: process.arch,
  nodeVersion: process.versions.node,
  electronVersion: process.versions.electron,
  hostname: os.hostname(),
  totalmem: os.totalmem(),
  freemem: os.freemem(),
  cpus: os.cpus().length,
  release: os.release(),
}));

// ============== IPC: 真实 ffmpeg 执行 ==============
const runningProcs = new Map(); // jobId -> { proc, logs: [] }

ipcMain.handle('ffmpeg-run', async (e, params) => {
  // params: { inputPaths: string[], outputPath: string, params: string, jobId: string }
  const ffmpegInfo = detectFfmpeg();
  if (!ffmpegInfo) return { ok: false, msg: '未检测到 ffmpeg，请先安装 ffmpeg 并加入 PATH' };
  const { inputPaths = [], outputPath, params: extraParams = '', jobId = Date.now().toString() } = params;

  // 安全校验：输出路径必须在安全目录下
  if (!isPathInSafeDir(outputPath)) {
    return { ok: false, msg: '输出路径不在允许的安全目录中' };
  }
  // 安全校验：输入文件必须在允许的目录下
  for (const ip of inputPaths) {
    if (!isPathInSafeInputDir(ip)) {
      return { ok: false, msg: '输入文件路径不在允许的目录中: ' + ip };
    }
  }

  if (!outputPath) return { ok: false, msg: '请指定输出路径' };
  if (inputPaths.length === 0) return { ok: false, msg: '请指定至少一个输入文件' };

  // 拼接 ffmpeg 参数：ffmpeg -y -i input1 [-i input2 ...] {extraParams} output
  const args = ['-y'];
  for (const ip of inputPaths) args.push('-i', ip);
  if (Array.isArray(extraParams)) {
    // 数组参数：精确控制，避免空格拆分问题（超分滤镜用）
    args.push(...extraParams);
  } else if (extraParams && extraParams.trim()) {
    // 简单按空格拆分（够用；用户编辑时已是合法字符串）
    args.push(...extraParams.trim().split(/\s+/));
  } else {
    args.push('-c:v', 'libx264', '-preset', 'medium', '-c:a', 'aac');
  }
  args.push(outputPath);

  let proc;
  try {
    proc = spawn(ffmpegInfo.path, args, { windowsHide: true });
  } catch (err) {
    return { ok: false, msg: '启动 ffmpeg 失败：' + err.message };
  }

  const logs = [];
  runningProcs.set(jobId, { proc, logs });

  proc.stdout.on('data', (chunk) => {
    const line = chunk.toString();
    logs.push(line);
    if (logs.length > 500) logs.shift();
    if (mainWindow) mainWindow.webContents.send('ffmpeg-log', { jobId, stream: 'stdout', data: line });
  });
  proc.stderr.on('data', (chunk) => {
    const line = chunk.toString();
    logs.push(line);
    if (logs.length > 500) logs.shift();
    // ffmpeg 进度信息在 stderr
    if (mainWindow) mainWindow.webContents.send('ffmpeg-log', { jobId, stream: 'stderr', data: line });
  });
  proc.on('error', (err) => {
    runningProcs.delete(jobId);
    if (mainWindow) mainWindow.webContents.send('ffmpeg-done', { jobId, ok: false, msg: err.message, logs });
  });
  proc.on('close', (code) => {
    runningProcs.delete(jobId);
    if (mainWindow) mainWindow.webContents.send('ffmpeg-done', { jobId, ok: code === 0, code, logs });
  });

  return { ok: true, jobId, pid: proc.pid, args };
});

ipcMain.handle('ffmpeg-cancel', async (e, jobId) => {
  const item = runningProcs.get(jobId);
  if (item && item.proc) {
    try { item.proc.kill('SIGTERM'); } catch {}
    runningProcs.delete(jobId);
    return { ok: true };
  }
  return { ok: false, msg: '未找到任务' };
});

// ============== IPC: 学习通签到引擎 ==============
ipcMain.handle('checkin-status', async () => ({
  enginePath: CHECKIN_ENGINE,
  running: checkinProcess !== null && checkinProcess.exitCode === null,
  pid: checkinProcess?.pid || null,
  logs: checkinLogs.slice(-50),
}));

ipcMain.handle('checkin-start', async () => {
  if (checkinProcess && checkinProcess.exitCode === null) {
    return { ok: false, msg: '签到服务已在运行' };
  }
  if (!CHECKIN_ENGINE) {
    return { ok: false, msg: '未发现签到引擎目录：' + 'D:\\Claude code\\superstar-checkin' };
  }
  const buildIndex = path.join(CHECKIN_ENGINE, 'build', 'index.js');
  if (!fs.existsSync(buildIndex)) {
    return { ok: false, msg: '未找到 build/index.js，请先在引擎目录执行 npm run build' };
  }

  pushCheckinLog('启动签到服务…');
  try {
    checkinProcess = spawn('node', [buildIndex], {
      cwd: CHECKIN_ENGINE,
      windowsHide: true,
      env: { ...process.env, NODE_ENV: 'production' },
    });
  } catch (err) {
    pushCheckinLog('启动失败：' + err.message);
    return { ok: false, msg: err.message };
  }

  // 日志节流：攒批 80ms 合并推送，避免启动时日志洪峰卡 UI
  let logBuffer = [];
  let logTimer = null;
  const flushLogs = () => {
    if (!logBuffer.length) { logTimer = null; return; }
    const batch = logBuffer.join('\n');
    logBuffer = [];
    logTimer = null;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('checkin-log', batch);
    }
  };
  const pushLog = (line) => {
    if (!pushCheckinLog(line.trim())) return;
    logBuffer.push(line);
    if (!logTimer) logTimer = setTimeout(flushLogs, 80);
  };
  checkinProcess.stdout.on('data', (d) => pushLog(d.toString()));
  checkinProcess.stderr.on('data', (d) => pushLog('[err] ' + d.toString()));
  checkinProcess.on('exit', (code) => {
    pushCheckinLog(`签到服务退出，code=${code}`);
    if (logTimer) { clearTimeout(logTimer); flushLogs(); }
    checkinProcess = null;
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('checkin-exit', code);
  });

  return { ok: true, pid: checkinProcess.pid, msg: '签到服务已启动，请等待 5-10 秒完成初始化' };
});

ipcMain.handle('checkin-stop', async () => {
  if (!checkinProcess) return { ok: false, msg: '签到服务未运行' };
  try {
    checkinProcess.kill('SIGTERM');
    setTimeout(() => { try { checkinProcess && checkinProcess.kill('SIGKILL'); } catch {} }, 3000);
    return { ok: true };
  } catch (err) {
    return { ok: false, msg: err.message };
  }
});

// 调用 QR API 签到（通过 HTTP，内置 net 模块，不依赖系统 curl）
ipcMain.handle('checkin-qr', async (e, qrData) => {
  // 端口从 config.yaml 读取（UI 可配置 webPort），默认 3456
  let port = 3456;
  if (CHECKIN_ENGINE) {
    try {
      const configPath = path.join(CHECKIN_ENGINE, 'config.yaml');
      if (fs.existsSync(configPath)) {
        const raw = fs.readFileSync(configPath, 'utf-8');
        const m = raw.match(/^\s*port:\s*(\d+)/m);
        if (m) port = parseInt(m[1], 10);
      }
    } catch {}
  }
  return new Promise((resolve) => {
    const payload = JSON.stringify({ qrdata: String(qrData || '').trim() });
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path: '/api/sign',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
      timeout: 15000,
    }, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(body);
          resolve({ ok: !!j.ok, msg: j.msg || body });
        } catch {
          resolve({ ok: false, msg: body || '签到服务响应异常' });
        }
      });
    });
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, msg: '签到服务响应超时，请确认已启动' }); });
    req.on('error', (err) => resolve({ ok: false, msg: '无法连接签到服务（' + err.code + '），请先启动引擎' }));
    req.write(payload);
    req.end();
  });
});

// ============== 课程列表 / 活动列表 / 手动签到（学习通 API 直连，不依赖引擎） ==============
// 从引擎数据文件读取 cookie
function readEngineAccountCookie() {
  if (!CHECKIN_ENGINE) return null;
  const dataFile = path.join(CHECKIN_ENGINE, 'data', 'superstar-data.json');
  try {
    if (!fs.existsSync(dataFile)) return null;
    const data = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
    // 键格式：cookie_<username>
    const key = Object.keys(data).find((k) => k.startsWith('cookie_'));
    if (key && data[key]) return { cookie: data[key], username: key.replace('cookie_', '') };
  } catch {}
  return null;
}

// 学习通真实登录（复用引擎 build/requests/login.js 的接口）：POST passport2-api 拿 cookie
function chaoxingLogin(username, password) {
  return new Promise((resolve) => {
    const body = querystring.stringify({ uname: String(username).trim(), code: String(password) });
    const req = https.request({
      hostname: 'passport2-api.chaoxing.com',
      path: '/v11/loginregister',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Referer': 'https://passport.chaoxing.com/',
      },
      timeout: 20000,
    }, (res) => {
      const setCookies = res.headers['set-cookie'] || [];
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(body);
          if (j && j.status) {
            // 收集 Set-Cookie 中的键值对（不含过期/域等属性）
            const parts = [];
            for (const sc of setCookies) {
              const p = sc.split(';')[0].trim();
              if (p.includes('=') && !parts.includes(p)) parts.push(p);
            }
            const getVal = (k) => { const c = parts.find((p) => p.startsWith(k + '=')); return c ? c.split('=')[1] : null; };
            resolve({ ok: true, cookie: parts.join('; '), uid: getVal('UID'), fid: getVal('fid'), name: j.name || '' });
          } else {
            resolve({ ok: false, msg: (j && j.mes) || '登录失败：账号或密码错误' });
          }
        } catch {
          resolve({ ok: false, msg: '登录响应解析失败' });
        }
      });
    });
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, msg: '登录超时，请检查网络' }); });
    req.on('error', (err) => resolve({ ok: false, msg: '网络错误：' + err.message }));
    req.write(body);
    req.end();
  });
}

// 登录并保存：真实登录 → 把 cookie 写入引擎数据文件（与 readEngineAccountCookie 格式一致）
ipcMain.handle('checkin-login', async (e, { username, password }) => {
  if (!CHECKIN_ENGINE) return { ok: false, msg: '未发现签到引擎目录，无法保存登录凭据' };
  if (!String(username || '').trim() || !String(password || '')) return { ok: false, msg: '请输入账号和密码' };
  const r = await chaoxingLogin(username, password);
  if (!r.ok) return r;
  const dataFile = path.join(CHECKIN_ENGINE, 'data', 'superstar-data.json');
  let data = {};
  try { if (fs.existsSync(dataFile)) data = JSON.parse(fs.readFileSync(dataFile, 'utf-8')); } catch {}
  data['cookie_' + String(username).trim()] = r.cookie;
  try {
    fs.mkdirSync(path.dirname(dataFile), { recursive: true });
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    return { ok: false, msg: '登录成功但写入凭据失败：' + err.message };
  }
  return { ok: true, username: String(username).trim(), uid: r.uid, fid: r.fid, name: r.name || '' };
});

// 协议感知请求：https 地址用 https 模块（http.get 请求 https 会抛 ERR_INVALID_PROTOCOL）
function httpGetAny(url, opts, cb) {
  return url.startsWith('https:') ? https.get(url, opts, cb) : http.get(url, opts, cb);
}

function httpGetJson(url, cookie) {
  return new Promise((resolve) => {
    const req = httpGetAny(url, {
      headers: {
        'Cookie': cookie,
        'User-Agent': 'Mozilla/5.0 (Linux; Android 11; SM-G9910) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.104 Mobile Safari/537.36',
        'Referer': 'https://mooc2-ans.chaoxing.com/',
      },
      timeout: 15000,
    }, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => {
        try { resolve({ ok: true, data: JSON.parse(body) }); }
        catch { resolve({ ok: false, raw: body.slice(0, 300) }); }
      });
    });
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, msg: '请求超时' }); });
    req.on('error', (err) => resolve({ ok: false, msg: err.code || err.message }));
    req.end();
  });
}

// 获取课程列表
ipcMain.handle('checkin-courses', async () => {
  const acc = readEngineAccountCookie();
  if (!acc) return { ok: false, msg: '未找到已登录的账号凭据。请先启动签到引擎完成一次登录，或检查 superstar-data.json' };
  const url = 'https://mooc2-ans.chaoxing.com/mooc2-ans/visit/courselistdata?courseType=1&courseFolderId=0&courseFolderSize=0&clazzId=&_time=' + Date.now();
  // 课程页返回 HTML，用正则解析课程卡片
  const html = await new Promise((resolve) => {
    const req = httpGetAny(url, {
      headers: {
        'Cookie': acc.cookie,
        'User-Agent': 'Mozilla/5.0 (Linux; Android 11; SM-G9910) AppleWebKit/537.36 Mobile Safari/537.36',
        'Referer': 'https://mooc2-ans.chaoxing.com/',
      },
      timeout: 15000,
    }, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => resolve(body));
    });
    req.on('timeout', () => { req.destroy(); resolve(''); });
    req.on('error', () => resolve(''));
    req.end();
  });
  if (!html || html.length < 200) return { ok: false, msg: '课程页面获取失败，请确认账号已登录（先启动引擎完成一次登录）' };

  try {
    const courses = [];
    // 匹配课程链接：courseid=xxx&clazzid=yyy ... 课程名
    const re = /stucoursemiddle\?[^"]*?courseid=(\d+)[^"]*?clazzid=(\d+)[^"]*?".*?title="([^"]+)"/gs;
    let m;
    const seen = new Set();
    while ((m = re.exec(html)) && courses.length < 100) {
      const courseId = m[1];
      const classId = m[2];
      const name = m[3].trim();
      const key = courseId + '_' + classId;
      if (seen.has(key)) continue;
      seen.add(key);
      courses.push({ courseId, classId, name, teacher: '' });
    }
    // 兜底：匹配 title="课程名" 前面的链接
    if (!courses.length) {
      const re2 = /title="([^"]{2,60})"/g;
      while ((m = re2.exec(html)) && courses.length < 100) {
        const name = m[1].trim();
        if (name.includes('课程') || name.includes('设计') || name.includes('原理') || name.includes('实验') || name.includes('导论') || name.includes('概论') || name.includes('英语') || name.includes('编程')) {
          const key = 'n_' + name;
          if (seen.has(key)) continue;
          seen.add(key);
          courses.push({ courseId: '0', classId: '0', name, teacher: '' });
        }
      }
    }
    if (!courses.length) return { ok: false, msg: '未解析到课程（可能页面结构变化或暂无课程）' };
    return { ok: true, courses, username: acc.username };
  } catch (e) {
    return { ok: false, msg: '解析失败：' + e.message };
  }
});

// 获取某课程的活动列表（签到/通知等）
ipcMain.handle('checkin-activities', async (e, { courseId, classId }) => {
  const acc = readEngineAccountCookie();
  if (!acc) return { ok: false, msg: '未找到已登录的账号凭据' };
  const url = `https://mobilelearn.chaoxing.com/v2/apis/active/activelist?courseId=${courseId}&classId=${classId}&activeType=0&_time=${Date.now()}`;
  const r = await httpGetJson(url, acc.cookie);
  if (!r.ok) return { ok: false, msg: r.msg || '获取活动失败' };
  try {
    const list = r.data.data?.activeList || r.data.activeList || [];
    const acts = list.map((a) => ({
      activeId: a.id,
      name: a.nameOne || a.name || '',
      type: a.activeType, // 0=签到 1=投票 2=问卷 3=讨论 4=抢答 5=通知
      typeName: a.typeName || a.nameOne || '',
      startTime: a.startTime || '',
      endTime: a.endTime || '',
      status: a.status || 0,
    }));
    return { ok: true, activities: acts };
  } catch (e) {
    return { ok: false, msg: '解析失败：' + e.message };
  }
});

// 手动签到（任意 aid，引擎服务在运行时调用 /api/sign 兼容普通签到由引擎命令行处理）
// 这里提供：直接用学习通 API 查询签到详情并返回类型，引导用户用 QR 或普通签到
ipcMain.handle('checkin-query', async (e, aid) => {
  const acc = readEngineAccountCookie();
  if (!acc) return { ok: false, msg: '未找到已登录的账号凭据' };
  const url = `https://mobilelearn.chaoxing.com/v2/apis/active/getPPTActiveInfo?activeId=${aid}`;
  const r = await httpGetJson(url, acc.cookie);
  if (!r.ok) return { ok: false, msg: r.msg || '查询失败' };
  try {
    const d = r.data.data || {};
    let type = 'normal';
    switch (d.otherId) {
      case 2: type = 'qr'; break;
      case 3: type = 'gesture'; break;
      case 4: type = 'location'; break;
      default: type = d.ifphoto ? 'photo' : 'normal';
    }
    return {
      ok: true,
      info: {
        activeId: aid,
        type,
        locationText: d.locationText || '',
        locationRange: d.locationRange || '',
        ifOpen: d.ifopenAddress !== undefined ? !!d.ifopenAddress : null,
        teacher: d.teacherName || '',
        title: d.name || '',
      },
    };
  } catch (e) {
    return { ok: false, msg: '解析失败：' + e.message };
  }
});

// 读取引擎的完整签到历史 + 统计
ipcMain.handle('checkin-engine-history', async () => {
  if (!CHECKIN_ENGINE) return { ok: false, msg: '未发现引擎目录' };
  const hFile = path.join(CHECKIN_ENGINE, 'data', 'checkin-history.json');
  try {
    if (!fs.existsSync(hFile)) return { ok: true, records: [], stats: null };
    const records = JSON.parse(fs.readFileSync(hFile, 'utf-8'));
    const reversed = [...records].reverse();
    const total = records.length;
    const success = records.filter((r) => (r.result || '').includes('成功')).length;
    const byType = {};
    for (const r of records) byType[r.type] = (byType[r.type] || 0) + 1;
    return { ok: true, records: reversed, stats: { total, success, fail: total - success, byType } };
  } catch (e) {
    return { ok: false, msg: '读取历史失败：' + e.message };
  }
});

// ============== 签到配置生成（全功能迁移：多账号/推送/位置/忽略课程/OCR） ==============
function yamlStr(v) {
  if (typeof v === 'number') return String(v);
  return '"' + String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}
function yamlArr(arr, indent = '') {
  if (!arr || arr.length === 0) return `${indent}[]`;
  const lines = arr.map((item) => {
    if (typeof item === 'object' && item !== null) {
      return `${indent}- ${yamlObj(item, `${indent}  `)}`;
    }
    return `${indent}- ${yamlStr(item)}`;
  });
  return lines.join('\n');
}
function yamlObj(obj, indent = '') {
  if (!obj || typeof obj !== 'object') return yamlStr(obj);
  const entries = Object.entries(obj).filter(([, v]) => v !== undefined && v !== null);
  if (entries.length === 0) return '{}';
  return entries.map(([k, v]) => {
    const key = k.includes(' ') ? '"' + k + '"' : k;
    if (Array.isArray(v)) return `${indent}${key}: ${yamlArr(v, indent)}`;
    if (typeof v === 'object') return `${indent}${key}:\n${yamlObj(v, indent + '  ')}`;
    if (typeof v === 'boolean') return `${indent}${key}: ${v}`;
    return `${indent}${key}: ${yamlStr(v)}`;
  }).join('\n');
}

ipcMain.handle('checkin-write-config', async (e, cfg) => {
  if (!CHECKIN_ENGINE) return { ok: false, msg: '未发现签到引擎目录' };
  const configPath = path.join(CHECKIN_ENGINE, 'config.yaml');
  try {
    // 构造与 config.example.yaml 一致的完整配置
    const out = [];
    out.push('bot:');
    out.push('  uin: disabled');
    out.push('  data_dir: ./data');
    if (cfg.pushplusToken) {
      out.push('pushplus:');
      out.push(`  token: ${yamlStr(cfg.pushplusToken)}`);
    }
    // 每日签到时间段（LocalHub 侧记录；引擎为实时监听模式，不依赖此字段）
    out.push(`checkinTimeStart: ${yamlStr(cfg.checkinTimeStart || cfg.checkinTime || '08:00')}`);
    out.push(`checkinTimeEnd: ${yamlStr(cfg.checkinTimeEnd || '12:00')}`);
    out.push('web:');
    out.push(`  port: ${cfg.webPort || 3456}`);
    if (cfg.ocrSecretId) {
      out.push('ocr:');
      out.push(`  secretId: ${yamlStr(cfg.ocrSecretId)}`);
      out.push(`  secretKey: ${yamlStr(cfg.ocrSecretKey || '')}`);
    } else {
      out.push('ocr:');
      out.push('  secretId: ""');
      out.push('  secretKey: ""');
    }
    // ignoreCourses 可能是数组或逗号分隔字符串（UI 输入为字符串）
    const ic = cfg.ignoreCourses;
    let ignoreStr = '[]';
    if (Array.isArray(ic) && ic.length) {
      ignoreStr = '[' + ic.join(', ') + ']';
    } else if (typeof ic === 'string' && ic.trim()) {
      ignoreStr = '[' + ic.split(/[,，\s]+/).filter(Boolean).join(', ') + ']';
    }
    out.push(`ignoreCourses: ${ignoreStr}`);
    out.push('geoLocations:');
    if (cfg.geoLocations && cfg.geoLocations.length) {
      for (const g of cfg.geoLocations) {
        out.push(`  - courseId: ${typeof g.courseId === 'number' ? g.courseId : yamlStr(g.courseId || '*')}`);
        out.push(`    lat: ${g.lat}`);
        out.push(`    lon: ${g.lon}`);
        out.push(`    address: ${yamlStr(g.address || '')}`);
        if (g.onlyOnWeekdays && g.onlyOnWeekdays.length) {
          out.push('    onlyOnWeekdays: [' + g.onlyOnWeekdays.join(', ') + ']');
        }
      }
    } else {
      out.push('  # 未配置位置预设，签到引擎将使用智能定位');
    }
    out.push('accounts:');
    if (cfg.accounts && cfg.accounts.length) {
      for (const a of cfg.accounts) {
        out.push(`  - username: ${yamlStr(a.username)}`);
        out.push(`    password: ${yamlStr(a.password)}`);
      }
    } else {
      out.push('  - username: ""');
      out.push('    password: ""');
    }
    const yamlText = out.join('\n') + '\n';
    fs.writeFileSync(configPath, yamlText, 'utf-8');
    pushCheckinLog('已写入签到配置 config.yaml');
    return { ok: true, path: configPath, preview: yamlText };
  } catch (err) {
    return { ok: false, msg: '写入配置失败：' + err.message };
  }
});

ipcMain.handle('checkin-read-config', async () => {
  if (!CHECKIN_ENGINE) return { ok: false, msg: '未发现签到引擎目录' };
  const configPath = path.join(CHECKIN_ENGINE, 'config.yaml');
  try {
    if (!fs.existsSync(configPath)) return { ok: true, exists: false };
    const raw = fs.readFileSync(configPath, 'utf-8');
    return { ok: true, exists: true, raw };
  } catch (err) {
    return { ok: false, msg: err.message };
  }
});

// 通知
ipcMain.handle('notify', async (e, { title, body }) => {
  try {
    if (Notification.isSupported()) {
      new Notification({ title: title || APP_NAME, body: body || '' }).show();
      return true;
    }
  } catch {}
  return false;
});

// ============== Canvas 视频工作流服务（内嵌 server.js） ==============
// 端口：探测空闲端口（不写死 8765，避免与本机已有服务冲突）
// 数据目录：userData/canvas-data，首次运行迁移旧数据
let canvasServerChild = null;
let canvasPort = 0;
let canvasReady = false;

const CANVAS_DIR = app.isPackaged
  ? path.join(process.resourcesPath, 'canvas-app')   // 打包后：resources/canvas-app（extraResources）
  : path.join(__dirname, 'canvas-app');              // 开发时：electron/canvas-app
const CANVAS_SERVER = path.join(CANVAS_DIR, 'server.js');
const CANVAS_DATA_DIR = path.join(app.getPath('userData'), 'canvas-data');
const LEGACY_CANVAS_DIRS = [
  'C:\\Users\\李星历\\Documents\\Default Project\\canvas-app\\.canvas-data',
  'C:\\Users\\李星历\\Documents\\Default Project\\canvas-app.canvas-data',
];

function findFreePort() {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', () => resolve(0));
    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
  });
}

function waitForCanvas(port, timeoutMs = 30000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const probe = () => {
      const req = http.get({ host: '127.0.0.1', port, path: '/', timeout: 2000 }, (res) => {
        res.resume();
        if (res.statusCode === 200) return resolve(true);
        retry();
      });
      req.on('timeout', () => { req.destroy(); retry(); });
      req.on('error', () => retry());
    };
    const retry = () => {
      if (Date.now() - start > timeoutMs) return resolve(false);
      setTimeout(probe, 250);
    };
    probe();
  });
}

async function migrateCanvasData() {
  try {
    if (fs.existsSync(CANVAS_DATA_DIR)) return; // 已有数据
    for (const legacy of LEGACY_CANVAS_DIRS) {
      if (fs.existsSync(legacy)) {
        fs.mkdirSync(path.dirname(CANVAS_DATA_DIR), { recursive: true });
        fs.cpSync(legacy, CANVAS_DATA_DIR, { recursive: true });
        console.log(`[canvas] 已迁移旧数据: ${legacy} -> ${CANVAS_DATA_DIR}`);
        return;
      }
    }
    console.log('[canvas] 未发现旧数据，全新初始化');
  } catch (err) {
    console.error('[canvas] 数据迁移失败:', err.message);
  }
}

async function startCanvasServer() {
  try {
    if (!fs.existsSync(CANVAS_SERVER)) { console.warn('[canvas] server.js 不存在，跳过启动'); return; }
    canvasPort = await findFreePort();
    if (!canvasPort) throw new Error('无法分配空闲端口');
    await migrateCanvasData();
    // 关键：Electron 主进程 fork 必须用 execPath + ELECTRON_RUN_AS_NODE=1，
    // 否则子进程会按 Electron 应用启动而非纯 Node，server.js 的 http 服务不会运行
    canvasServerChild = fork(CANVAS_SERVER, [], {
      execPath: process.execPath,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', CANVAS_PORT: String(canvasPort), CANVAS_DATA_DIR },
      // 关键：fork 必须包含 'ipc' 通道，否则抛 ERR_CHILD_PROCESS_IPC_REQUIRED
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });
    canvasServerChild.stdout?.on('data', (d) => process.stdout.write(`[canvas] ${d}`));
    canvasServerChild.stderr?.on('data', (d) => process.stderr.write(`[canvas] ${d}`));
    canvasServerChild.on('exit', (code) => { console.log(`[canvas] 服务退出 code=${code}`); canvasServerChild = null; canvasReady = false; });
    const ok = await waitForCanvas(canvasPort);
    canvasReady = ok;
    console.log(`[canvas] 服务就绪 http://127.0.0.1:${canvasPort} ready=${ok} data=${CANVAS_DATA_DIR}`);
  } catch (err) {
    console.error('[canvas] 启动失败:', err.message);
    canvasReady = false;
  }
}

function stopCanvasServer() {
  if (canvasServerChild && !canvasServerChild.killed) {
    try { canvasServerChild.kill(); } catch {}
    canvasServerChild = null;
  }
}

// 渲染进程查询 canvas 服务状态
ipcMain.handle('canvas-status', async () => ({
  ready: canvasReady,
  port: canvasPort,
  url: canvasReady ? `http://127.0.0.1:${canvasPort}/` : null,
  dataDir: CANVAS_DATA_DIR,
}));

// ============== Mindmap 独立服务（思维导图，18880 固定端口，与视频流完全隔离） ==============
let mindmapReady = false;
let mindmapChild = null;
let mindmapStarting = false;
let MINDMAP_PORT = 18880;
const MINDMAP_DIR = app.isPackaged
  ? path.join(process.resourcesPath, 'mindmap')   // 打包后：resources/mindmap（extraResources）
  : path.join(__dirname, 'mindmap');              // 开发时：electron/mindmap
const MINDMAP_SERVER = path.join(MINDMAP_DIR, 'server.js');
const MINDMAP_DATA_DIR = 'D:\\LocalHub\\dev\\mindmap-data'; // 独立数据目录（与原视频流 shot-data 隔离）

async function startMindmapServer() {
  try {
    if (!fs.existsSync(MINDMAP_SERVER)) { console.warn('[mindmap] server.js 不存在，跳过启动'); return; }
    fs.mkdirSync(MINDMAP_DATA_DIR, { recursive: true });
    // 检测 18880 是否可用，不可用时动态分配（避免端口冲突）
    const portAvailable = await new Promise((resolve) => {
      const srv = net.createServer();
      srv.unref();
      srv.on('error', () => resolve(false));
      srv.listen(MINDMAP_PORT, '127.0.0.1', () => { srv.close(() => resolve(true)); });
    });
    if (!portAvailable) {
      console.warn(`[mindmap] 端口 ${MINDMAP_PORT} 被占用，动态分配空闲端口`);
      MINDMAP_PORT = await findFreePort();
      if (!MINDMAP_PORT) throw new Error('无法分配空闲端口');
    }
    // 与 canvas 相同的关键姿势：execPath + ELECTRON_RUN_AS_NODE=1 + stdio 含 'ipc'
    mindmapChild = fork(MINDMAP_SERVER, [], {
      execPath: process.execPath,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', MINDMAP_PORT: String(MINDMAP_PORT), MINDMAP_DATA_DIR },
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });
    mindmapChild.stdout?.on('data', (d) => process.stdout.write(`[mindmap] ${d}`));
    mindmapChild.stderr?.on('data', (d) => process.stderr.write(`[mindmap] ${d}`));
    mindmapChild.on('exit', (code) => { console.log(`[mindmap] 服务退出 code=${code}`); mindmapChild = null; mindmapReady = false; });
    const ok = await waitForCanvas(MINDMAP_PORT);
    mindmapReady = ok;
    console.log(`[mindmap] 服务就绪 http://127.0.0.1:${MINDMAP_PORT} ready=${ok} data=${MINDMAP_DATA_DIR}`);
  } catch (err) {
    console.error('[mindmap] 启动失败:', err.message);
    mindmapReady = false;
  }
}

function stopMindmapServer() {
  if (mindmapChild && !mindmapChild.killed) {
    try { mindmapChild.kill(); } catch {}
    mindmapChild = null;
  }
  mindmapReady = false;
}

// 渲染进程：点击"思维导图"入口时启动服务（懒启动，返回状态）
ipcMain.handle('mindmap-start', async () => {
  if (mindmapReady) return { ready: true, port: MINDMAP_PORT, url: `http://127.0.0.1:${MINDMAP_PORT}/`, dataDir: MINDMAP_DATA_DIR };
  if (!mindmapChild && !mindmapStarting) {
    mindmapStarting = true;
    await startMindmapServer();
    mindmapStarting = false;
  }
  return { ready: mindmapReady, port: MINDMAP_PORT, url: mindmapReady ? `http://127.0.0.1:${MINDMAP_PORT}/` : null, dataDir: MINDMAP_DATA_DIR };
});
ipcMain.handle('mindmap-status', async () => ({
  ready: mindmapReady,
  port: MINDMAP_PORT,
  url: mindmapReady ? `http://127.0.0.1:${MINDMAP_PORT}/` : null,
  dataDir: MINDMAP_DATA_DIR,
}));
// ============== Leaderboard 独立服务（AI 模型排行榜，18881 固定端口） ==============
let leaderboardReady = false;
let leaderboardChild = null;
let leaderboardStarting = false;
let LB_PORT = 18881;
const LB_DIR = app.isPackaged
  ? path.join(process.resourcesPath, 'leaderboard')
  : path.join(__dirname, 'leaderboard');
const LB_SERVER = path.join(LB_DIR, 'server.js');
const LB_DATA_DIR = 'D:\\LocalHub\\dev\\leaderboard-data';

async function startLeaderboardServer() {
  try {
    if (!fs.existsSync(LB_SERVER)) { console.warn('[leaderboard] server.js 不存在，跳过启动'); return; }
    fs.mkdirSync(LB_DATA_DIR, { recursive: true });
    const portAvailable = await new Promise((resolve) => {
      const srv = net.createServer();
      srv.unref();
      srv.on('error', () => resolve(false));
      srv.listen(LB_PORT, '127.0.0.1', () => { srv.close(() => resolve(true)); });
    });
    if (!portAvailable) { LB_PORT = await findFreePort(); if (!LB_PORT) throw new Error('无法分配空闲端口'); }
    leaderboardChild = fork(LB_SERVER, [], {
      execPath: process.execPath,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', LB_PORT: String(LB_PORT), LB_DATA_DIR },
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });
    leaderboardChild.stdout?.on('data', (d) => process.stdout.write('[leaderboard] ' + d));
    leaderboardChild.stderr?.on('data', (d) => process.stderr.write('[leaderboard] ' + d));
    leaderboardChild.on('exit', (code) => { console.log('[leaderboard] 服务退出 code=' + code); leaderboardChild = null; leaderboardReady = false; });
    const ok = await waitForCanvas(LB_PORT);
    leaderboardReady = ok;
    console.log('[leaderboard] 服务就绪 http://127.0.0.1:' + LB_PORT + ' ready=' + ok + ' data=' + LB_DATA_DIR);
  } catch (err) {
    console.error('[leaderboard] 启动失败:', err.message);
    leaderboardReady = false;
  }
}

function stopLeaderboardServer() {
  if (leaderboardChild && !leaderboardChild.killed) { try { leaderboardChild.kill(); } catch {} leaderboardChild = null; }
  leaderboardReady = false;
}

ipcMain.handle('leaderboard-start', async () => {
  if (leaderboardReady) return { ready: true, port: LB_PORT, url: 'http://127.0.0.1:' + LB_PORT + '/', dataDir: LB_DATA_DIR };
  if (!leaderboardChild && !leaderboardStarting) {
    leaderboardStarting = true;
    await startLeaderboardServer();
    leaderboardStarting = false;
  }
  return { ready: leaderboardReady, port: LB_PORT, url: leaderboardReady ? 'http://127.0.0.1:' + LB_PORT + '/' : null, dataDir: LB_DATA_DIR };
});
ipcMain.handle('leaderboard-status', async () => ({
  ready: leaderboardReady,
  port: LB_PORT,
  url: leaderboardReady ? 'http://127.0.0.1:' + LB_PORT + '/' : null,
  dataDir: LB_DATA_DIR,
}));


// ============== App 生命周期 ==============
app.whenReady().then(async () => {
  // 拉起内嵌 canvas 服务（异步，不阻塞窗口）
  startCanvasServer();
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (checkinProcess) try { checkinProcess.kill('SIGTERM'); } catch {}
    stopCanvasServer();
    stopMindmapServer();
    stopLeaderboardServer();
    app.quit();
  }
});
app.on('before-quit', () => { stopCanvasServer(); stopMindmapServer(); stopLeaderboardServer(); });
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// 单实例锁（避免重复启动）
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
  });
}
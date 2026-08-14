/**
 * mindmap/server.js — 思维导图本地服务
 *
 * 源站：从 canvas-app/server.js 1:1 复制而来（同一套视频工作流后端）
 * 与 canvas-app/server.js 的关键区别：
 *   - 运行在独立进程中，由 Electron main.js 的 startMindmapServer() fork 启动
 *   - 端口通过环境变量 MINDMAP_PORT 传入（默认为 18880，由 main.js 决定）
 *   - 数据目录通过环境变量 MINDMAP_DATA_DIR 传入（D:/LocalHub/dev/mindmap-data）
 *   除此外服务端代码完全一致（API 路由、加密、归档等均复用）
 *   如果后端逻辑需要改动，两个 server.js 要同步修改。
 */

const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');

const HOST = '127.0.0.1';
const PORT = Number(process.env.MINDMAP_PORT || 18880);
const ROOT = __dirname;
const DATA_DIR = process.env.MINDMAP_DATA_DIR || path.join(ROOT, '.mindmap-data');
const MEDIA_DIR = path.join(DATA_DIR, 'media');
const KEY_FILE = path.join(DATA_DIR, 'master.key');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.enc.json');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');
const WORKFLOW_FILE = path.join(DATA_DIR, 'workflow.json');
const MAX_ARCHIVE_BYTES = 1024 * 1024 * 1024;
const MAX_REQUEST_BODY_BYTES = 20 * 1024 * 1024;
let activeBodyReads = 0;
const MAX_CONCURRENT_BODY_READS = 10;
const MAX_CONCURRENT_PROVIDER_REQUESTS = 4;
let activeProviderRequests = 0;
const PROVIDER_HOSTS = Object.freeze({
  siliconflow: ['api.siliconflow.cn'],
  dashscope: ['dashscope.aliyuncs.com'],
  zhipu: ['open.bigmodel.cn'],
  minimax: ['api.minimaxi.com'],
  deepseek: ['api.deepseek.com']
});

// 可信来源：主应用加载来源（生产环境 file://，开发环境 localhost:5173）
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'file://',
  'file://null',
];

function corsHeaders(request) {
  const origin = request.headers['origin'] || '';
  if (ALLOWED_ORIGINS.some((a) => origin.startsWith(a))) {
    return { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Max-Age': '86400' };
  }
  return {};
}

function json(response, status, value, request) {
  const cors = request ? corsHeaders(request) : {};
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors });
  response.end(JSON.stringify(value));
}

function contentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return {
    '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.webp': 'image/webp', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.mp3': 'audio/mpeg', '.wav': 'audio/wav'
  }[extension] || 'application/octet-stream';
}

async function ensureStorage() {
  await fsp.mkdir(MEDIA_DIR, { recursive: true });
  try { await fsp.access(HISTORY_FILE); } catch { await writeJson(HISTORY_FILE, []); }
  try { await fsp.access(WORKFLOW_FILE); } catch { await writeJson(WORKFLOW_FILE, { nodes: [], edges: [] }); }
}

async function writeJson(filePath, value) {
  const temporary = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fsp.writeFile(temporary, JSON.stringify(value, null, 2), { encoding: 'utf8', mode: 0o600 });
  await fsp.rename(temporary, filePath);
}

async function readJson(filePath, fallback) {
  try { return JSON.parse(await fsp.readFile(filePath, 'utf8')); } catch { return fallback; }
}

async function masterKey() {
  try { return await fsp.readFile(KEY_FILE); } catch {
    const key = crypto.randomBytes(32);
    await fsp.writeFile(KEY_FILE, key, { mode: 0o600 });
    return key;
  }
}

async function encrypt(value) {
  const key = await masterKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return { version: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), ciphertext: ciphertext.toString('base64') };
}

async function decrypt(value) {
  if (!value?.iv || !value?.tag || !value?.ciphertext) return {};
  const key = await masterKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(value.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(value.tag, 'base64'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(value.ciphertext, 'base64')), decipher.final()]).toString('utf8'));
}

async function readSettings() {
  try { return await decrypt(JSON.parse(await fsp.readFile(SETTINGS_FILE, 'utf8'))); } catch { return {}; }
}

async function writeSettings(value) {
  await writeJson(SETTINGS_FILE, await encrypt(value));
}

function safeName(value) {
  return String(value || '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 160);
}

function extensionFor(type, responseType, sourceUrl) {
  const byType = type === 'video' ? '.mp4' : type === 'audio' ? '.mp3' : '.png';
  const byMime = { 'video/webm': '.webm', 'video/quicktime': '.mov', 'audio/wav': '.wav', 'audio/mpeg': '.mp3', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/png': '.png' }[String(responseType || '').split(';')[0]];
  const fromUrl = path.extname(new URL(sourceUrl).pathname).toLowerCase();
  return byMime || (/^\.(mp4|webm|mov|mp3|wav|png|jpg|jpeg|webp)$/.test(fromUrl) ? fromUrl : byType);
}

async function archiveRemoteMedia(sourceUrl, type, recordId) {
  if (!/^https?:\/\//i.test(sourceUrl)) return { archived: false, error: '仅可归档 http(s) 生成结果' };
  // SSRF 防护：阻止请求内网地址
  try {
    const u = new URL(sourceUrl);
    const host = u.hostname;
    if (/^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|0\.0\.0\.0$|\[::1\]$|localhost$)/i.test(host)) {
      return { archived: false, error: '不允许归档内网地址' };
    }
  } catch { return { archived: false, error: '无效的 URL' }; }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5 * 60 * 1000);
  try {
    const remote = await fetch(sourceUrl, { signal: controller.signal, redirect: 'follow' });
    if (!remote.ok || !remote.body) throw new Error(`下载失败 (${remote.status})`);
    const length = Number(remote.headers.get('content-length') || 0);
    if (length > MAX_ARCHIVE_BYTES) throw new Error('文件超过 1 GB 归档上限');
    const filename = `${recordId}${extensionFor(type, remote.headers.get('content-type'), sourceUrl)}`;
    const target = path.join(MEDIA_DIR, filename);
    const temporary = `${target}.part`;
    let bytes = 0;
    const limiter = new (require('node:stream').Transform)({
      transform(chunk, encoding, callback) {
        bytes += chunk.length;
        if (bytes > MAX_ARCHIVE_BYTES) return callback(new Error('文件超过 1 GB 归档上限'));
        callback(null, chunk);
      }
    });
    await pipeline(Readable.fromWeb(remote.body), limiter, fs.createWriteStream(temporary, { mode: 0o600 }));
    await fsp.rename(temporary, target);
    return { archived: true, url: `/media/${filename}`, bytes };
  } catch (error) {
    return { archived: false, error: error.message || '归档失败' };
  } finally { clearTimeout(timeout); }
}

async function readBody(request) {
  if (activeBodyReads >= MAX_CONCURRENT_BODY_READS) throw new Error('请求过于频繁');
  activeBodyReads++;
  const chunks = [];
  let size = 0;
  try {
    for await (const chunk of request) {
      size += chunk.length;
      if (size > MAX_REQUEST_BODY_BYTES) throw new Error('请求内容超过 20 MB 限制');
      chunks.push(chunk);
    }
    return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
  } finally {
    activeBodyReads = Math.max(0, activeBodyReads - 1);
  }
}

function isAllowedProviderTarget(provider, target) {
  return target.protocol === 'https:' && (PROVIDER_HOSTS[provider] || []).includes(target.hostname);
}

async function forwardProviderRequest(payload) {
  if (activeProviderRequests >= MAX_CONCURRENT_PROVIDER_REQUESTS) {
    return { status: 429, data: { error: '请求过于频繁，请稍后再试' } };
  }
  const provider = String(payload.provider || '');
  const method = String(payload.method || 'POST').toUpperCase();
  if (!['GET', 'POST'].includes(method)) return { status: 400, data: { error: '不支持的请求方法' } };

  let target;
  try { target = new URL(String(payload.url || '')); } catch { return { status: 400, data: { error: '无效的模型接口地址' } }; }
  if (!isAllowedProviderTarget(provider, target)) return { status: 403, data: { error: '该模型接口地址不在允许范围内' } };

  const settings = await readSettings();
  const key = String(settings.keys?.[provider] || '');
  if (!key) return { status: 400, data: { error: `请先保存 ${provider} API Key` } };

  activeProviderRequests++;
  const headers = { Authorization: `Bearer ${key}` };
  if (method === 'POST') headers['Content-Type'] = 'application/json';
  if (provider === 'dashscope' && payload.headers?.dashscopeAsync === true) headers['X-DashScope-Async'] = 'enable';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);
  try {
    const options = { method, headers, signal: controller.signal };
    if (method === 'POST' && payload.body !== undefined) options.body = JSON.stringify(payload.body);
    const remote = await fetch(target, options);
    const text = await remote.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text || `HTTP ${remote.status}` }; }
    return { status: remote.status, data };
  } catch (error) {
    const message = error?.name === 'AbortError' ? '上游模型请求超时' : (error.message || '上游模型请求失败');
    return { status: 502, data: { error: message } };
  } finally {
    clearTimeout(timeout);
    activeProviderRequests = Math.max(0, activeProviderRequests - 1);
  }
}

function safeStaticPath(requestPath) {
  const target = requestPath === '/' ? '/index.html' : requestPath;
  const resolved = path.resolve(ROOT, `.${decodeURIComponent(target)}`);
  return resolved.startsWith(`${ROOT}${path.sep}`) ? resolved : null;
}

async function serveStatic(requestPath, response, request) {
  const filePath = safeStaticPath(requestPath);
  if (!filePath) return json(response, 403, { error: '禁止访问' }, request);
  try {
    const stat = await fsp.stat(filePath);
    if (!stat.isFile()) return json(response, 404, { error: '未找到文件' }, request);
    const cors = request ? corsHeaders(request) : {};
    response.writeHead(200, { 'Content-Type': contentType(filePath), 'Cache-Control': filePath.endsWith('.html') ? 'no-store' : 'public, max-age=3600', ...cors });
    fs.createReadStream(filePath).pipe(response);
  } catch { json(response, 404, { error: '未找到文件' }, request); }
}

async function serveMedia(filename, response, request) {
  const filePath = path.resolve(MEDIA_DIR, safeName(filename));
  if (!filePath.startsWith(`${MEDIA_DIR}${path.sep}`)) return json(response, 403, { error: '禁止访问' }, request);
  try {
    const stat = await fsp.stat(filePath);
    const cors = request ? corsHeaders(request) : {};
    response.writeHead(200, { 'Content-Type': contentType(filePath), 'Content-Length': stat.size, 'Cache-Control': 'private, max-age=31536000, immutable', ...cors });
    fs.createReadStream(filePath).pipe(response);
  } catch { json(response, 404, { error: '历史文件不存在' }, request); }
}

async function handleApi(request, response, url) {
  // Origin 校验：非浏览器请求可能没有 Origin，拒绝
  const origin = request.headers['origin'] || '';
  const isAllowed = !origin || ALLOWED_ORIGINS.some((a) => origin.startsWith(a));
  if (!isAllowed) return json(response, 403, { error: '请求来源不被允许' }, request);
  if (url.pathname === '/api/provider-request' && request.method === 'POST') {
    const result = await forwardProviderRequest(await readBody(request));
    return json(response, result.status, result.data, request);
  }
  if (url.pathname === '/api/download' && request.method === 'GET') {
    let target;
    try { target = new URL(String(url.searchParams.get('url') || '')); } catch { return json(response, 400, { error: '无效的下载地址' }, request); }
    if (!['http:', 'https:'].includes(target.protocol)) return json(response, 400, { error: '仅支持 http/https 下载地址' }, request);
    // SSRF 防护：阻止下载内网地址
    const downloadHost = target.hostname;
    if (/^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|0\.0\.0\.0$|\[::1\]$|localhost$)/i.test(downloadHost)) {
      return json(response, 403, { error: '不允许下载内网地址' }, request);
    }
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 60_000);
      const remote = await fetch(target, { signal: controller.signal });
      clearTimeout(timer);
      if (!remote.ok || !remote.body) return json(response, 502, { error: '下载失败，上游返回 ' + remote.status }, request);
      const base = (target.pathname || '').split('/').filter(Boolean).pop() || 'media';
      const extMatch = base.match(/\.([a-z0-9]+)$/i);
      const ext = extMatch ? extMatch[1].toLowerCase() : 'bin';
      const stem = (extMatch ? base.slice(0, base.length - extMatch[0].length) : base).slice(0, 60) || 'media';
      const safeName = stem.replace(/[^\w\u4e00-\u9fa5-]+/g, '_') + '.' + ext;
      const cors = corsHeaders(request);
      const headers = {
        'Content-Type': remote.headers.get('content-type') || contentType('.' + ext),
        'Content-Disposition': "attachment; filename*=UTF-8''" + encodeURIComponent(safeName),
        'Cache-Control': 'no-store',
        ...cors
      };
      const length = remote.headers.get('content-length');
      if (length) headers['Content-Length'] = length;
      response.writeHead(200, headers);
      Readable.fromWeb(remote.body).pipe(response);
      return;
    } catch (error) {
      return json(response, 502, { error: '下载失败：' + (error.message || '未知错误') }, request);
    }
  }
  if (url.pathname === '/api/workflow' && request.method === 'GET') return json(response, 200, await readJson(WORKFLOW_FILE, { nodes: [], edges: [] }), request);
  if (url.pathname === '/api/workflow' && request.method === 'PUT') {
    const body = await readBody(request);
    if (!Array.isArray(body.nodes) || !Array.isArray(body.edges)) return json(response, 400, { error: '无效工作流数据' }, request);
    await writeJson(WORKFLOW_FILE, { nodes: body.nodes, edges: body.edges, savedAt: new Date().toISOString() });
    return json(response, 200, { ok: true }, request);
  }
  if (url.pathname === '/api/settings' && request.method === 'GET') return json(response, 200, await readSettings(), request);
  if (url.pathname === '/api/settings' && request.method === 'PUT') {
    const body = await readBody(request);
    await writeSettings({ keys: body.keys || {}, proxy: String(body.proxy || ''), timeout: Number(body.timeout || 60), providerSettings: body.providerSettings || {}, savedAt: new Date().toISOString() });
    return json(response, 200, { ok: true }, request);
  }
  if (url.pathname === '/api/history' && request.method === 'GET') return json(response, 200, await readJson(HISTORY_FILE, []), request);
  if (url.pathname === '/api/history' && request.method === 'DELETE') {
    await writeJson(HISTORY_FILE, []);
    return json(response, 200, { ok: true }, request);
  }
  if (url.pathname === '/api/history' && request.method === 'POST') {
    const body = await readBody(request);
    if (!['video', 'image', 'audio'].includes(body.type) || typeof body.url !== 'string' || !body.url) return json(response, 400, { error: '无效历史记录' }, request);
    const history = await readJson(HISTORY_FILE, []);
    const record = { id: crypto.randomUUID(), clientId: String(body.clientId || ''), nodeId: Number(body.nodeId) || null, type: body.type, model: String(body.model || ''), prompt: String(body.prompt || '').slice(0, 10000), sourceUrl: body.url, url: body.url, createdAt: body.createdAt || new Date().toISOString(), archived: false };
    if (body.type === 'video') {
      const archive = await archiveRemoteMedia(record.sourceUrl, record.type, record.id);
      record.archived = archive.archived;
      if (archive.url) record.url = archive.url;
      if (archive.bytes) record.bytes = archive.bytes;
      if (archive.error) record.archiveError = archive.error;
    }
    history.unshift(record);
    await writeJson(HISTORY_FILE, history.slice(0, 1000));
    return json(response, 201, record, request);
  }
  return json(response, 404, { error: '接口不存在' }, request);
}

async function requestHandler(request, response) {
  const url = new URL(request.url, `http://${HOST}:${PORT}`);
  // 预检请求
  if (request.method === 'OPTIONS') {
    const cors = corsHeaders(request);
    response.writeHead(204, { 'Content-Length': '0', ...cors });
    return response.end();
  }
  try {
    if (url.pathname.startsWith('/api/')) return await handleApi(request, response, url);
    if (url.pathname.startsWith('/media/')) return await serveMedia(url.pathname.slice('/media/'.length), response, request);
    return await serveStatic(url.pathname, response, request);
  } catch (error) {
    console.error(error);
    return json(response, 500, { error: error.message || '本地服务错误' }, request);
  }
}

ensureStorage().then(() => {
  http.createServer(requestHandler).listen(PORT, HOST, () => {
    console.log(`Canvas local service: http://${HOST}:${PORT}`);
    console.log(`Persistent data: ${DATA_DIR}`);
  });
}).catch(error => { console.error(error); process.exitCode = 1; });

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 数据
  saveData: (key, value) => ipcRenderer.invoke('save-data', key, value),
  loadData: (key) => ipcRenderer.invoke('load-data', key),
  deleteData: (key) => ipcRenderer.invoke('delete-data', key),

  // 系统
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  openPath: (p) => ipcRenderer.invoke('open-path', p),
  revealPath: (p) => ipcRenderer.invoke('reveal-path', p),
  notify: (opts) => ipcRenderer.invoke('notify', opts),
  fetchFavicon: (url) => ipcRenderer.invoke('fetch-favicon', url),
  canvasStatus: () => ipcRenderer.invoke('canvas-status'),
  mindmapStart: () => ipcRenderer.invoke('mindmap-start'),
  mindmapStatus: () => ipcRenderer.invoke('mindmap-status'),
  leaderboardStart: () => ipcRenderer.invoke('leaderboard-start'),
  leaderboardStatus: () => ipcRenderer.invoke('leaderboard-status'),

  // 对话框
  openFolderDialog: () => ipcRenderer.invoke('dialog-open-folder'),
  openFilesDialog: (opts) => ipcRenderer.invoke('dialog-open-files', opts),
  openFileDialog: (opts) => ipcRenderer.invoke('dialog-open-files', opts),
  saveFileDialog: (defaultName) => ipcRenderer.invoke('dialog-save-file', defaultName),

  // 环境
  detectFfmpeg: () => ipcRenderer.invoke('detect-ffmpeg'),
  ffprobeDuration: (filePath) => ipcRenderer.invoke('ffprobe-duration', filePath),
  getCheckinEnginePath: () => ipcRenderer.invoke('get-checkin-engine-path'),
  getVideoWorkflowPath: () => ipcRenderer.invoke('get-video-workflow-path'),
  getDataDir: () => ipcRenderer.invoke('get-data-dir'),
  systemInfo: () => ipcRenderer.invoke('system-info'),

  // ffmpeg
  ffmpegRun: (params) => ipcRenderer.invoke('ffmpeg-run', params),
  ffmpegCancel: (jobId) => ipcRenderer.invoke('ffmpeg-cancel', jobId),
  onFfmpegLog: (cb) => {
    const h = (_e, payload) => cb(payload);
    ipcRenderer.on('ffmpeg-log', h);
    return () => ipcRenderer.removeListener('ffmpeg-log', h);
  },
  onFfmpegDone: (cb) => {
    const h = (_e, payload) => cb(payload);
    ipcRenderer.on('ffmpeg-done', h);
    return () => ipcRenderer.removeListener('ffmpeg-done', h);
  },

  // 学习通签到
  checkinStatus: () => ipcRenderer.invoke('checkin-status'),
  checkinStart: () => ipcRenderer.invoke('checkin-start'),
  checkinStop: () => ipcRenderer.invoke('checkin-stop'),
  checkinQr: (qrdata) => ipcRenderer.invoke('checkin-qr', qrdata),
  checkinWriteConfig: (cfg) => ipcRenderer.invoke('checkin-write-config', cfg),
  checkinReadConfig: () => ipcRenderer.invoke('checkin-read-config'),
  checkinLogin: (params) => ipcRenderer.invoke('checkin-login', params),
  checkinCourses: () => ipcRenderer.invoke('checkin-courses'),
  checkinActivities: (params) => ipcRenderer.invoke('checkin-activities', params),
  checkinQuery: (aid) => ipcRenderer.invoke('checkin-query', aid),
  checkinEngineHistory: () => ipcRenderer.invoke('checkin-engine-history'),
  onCheckinLog: (cb) => {
    const h = (_e, payload) => cb(payload);
    ipcRenderer.on('checkin-log', h);
    return () => ipcRenderer.removeListener('checkin-log', h);
  },
  onCheckinExit: (cb) => {
    const h = (_e, payload) => cb(payload);
    ipcRenderer.on('checkin-exit', h);
    return () => ipcRenderer.removeListener('checkin-exit', h);
  },
});
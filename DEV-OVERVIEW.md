# LocalHub 项目文件总览（供 AI 检测 / 修复用）

> 生成时间：2026-08-05 · 项目根：`D:\LocalHub`
> Electron + React 18 + Vite 5 + Tailwind 的个人本地工具中心
> 本文档列出全部关键文件位置、职责、服务架构与验证方法，供其他 AI 按图索骥。

---

## 一、项目结构总览

```
D:\LocalHub\
├── package.json              # 版本、脚本、electron-builder 配置（extraResources 含 canvas-app/mindmap）
├── vite.config.js
├── index.html
├── electron\
│   ├── main.js               # 主进程：窗口、IPC、签到引擎 fork、canvas/mindmap 服务管理
│   ├── preload.js            # contextBridge 暴露 window.electronAPI
│   ├── canvas-app\           # 视频工作流（独立小网站，未动）
│   │   ├── index.html
│   │   └── server.js
│   └── mindmap\              # ★ 思维导图（1.13.6 新增，源站 1:1 复制）
│       ├── index.html        # 思维导图 v3 单文件（458KB，含全部 UI/JS，勿改 UI）
│       └── server.js         # 本地服务（静态 + /api/workflow、/api/settings、/api/history）
├── src\
│   ├── App.jsx               # 路由（/mindmap → MindMap 页）
│   ├── index.css             # 全局样式（modal/search-box/btn 等）
│   ├── components\
│   │   ├── Layout.jsx        # 侧边栏导航（含"思维导图"入口）+ 顶栏版本号
│   │   ├── CanvasFrame.jsx   # 视频工作流嵌入（iframe + 入口封面 + 加载动画）
│   │   ├── MindMapFrame.jsx  # ★ 思维导图嵌入（1.13.6 新增）
│   │   ├── ConfirmDialog.jsx # 全站删除确认弹窗
│   │   ├── Dropdown.jsx      # 下拉（默认正下方）
│   │   ├── TimeWheelPicker.jsx # 时间轮盘
│   │   └── ...
│   ├── pages\
│   │   ├── MindMap.jsx       # ★ 思维导图页（1.13.6 新增，薄壳→MindMapFrame）
│   │   ├── VideoWorkflow.jsx # 视频工作流页
│   │   ├── CheckIn.jsx       # 学习通签到（引擎控制/位置预设/二维码）
│   │   ├── ApiKeys.jsx       # API 密钥（平台图标 COMPANY_LOGOS）
│   │   ├── LearningHub.jsx   # 学习资料（旧思维导图 tab 已移除，保留资料列表）
│   │   ├── PromptLibrary.jsx / WebLinks.jsx / SmartNotes.jsx / Dashboard.jsx
│   ├── assets\
│   │   ├── companyLogos.jsx  # 平台信息 + 图标（LogoImg 徽章式渲染）
│   │   └── logos\*.png       # 16 个平台官网高清图标（256×256 透明底）
├── dev\
│   ├── shot-data\            # 视频工作流数据（现配置为 userData/canvas-data，见下）
│   └── mindmap-data\         # ★ 思维导图独立数据目录（18880 服务写入）
└── release\
    ├── LocalHub-x.x.x-Setup.exe        # 只保留最近两次
    └── win-unpacked\resources\
        ├── canvas-app\       # 打包后的视频工作流
        └── mindmap\          # ★ 打包后的思维导图（index.html + server.js）
```

---

## 二、服务架构（两个独立本地服务）

| | 视频工作流（canvas） | 思维导图（mindmap） |
|---|---|---|
| 前端目录 | `electron/canvas-app/` | `electron/mindmap/`（★新增） |
| 打包资源 | `resources/canvas-app/` | `resources/mindmap/`（★新增） |
| 端口 | 动态空闲端口（findFreePort） | **固定 18880** |
| 数据目录 | `userData/canvas-data`（main.js:836） | **`D:/LocalHub/dev/mindmap-data`** |
| 启动时机 | app.whenReady 即启动 | **点击入口懒启动**（mindmap-start IPC） |
| 环境变量 | CANVAS_PORT / CANVAS_DATA_DIR | 同左（fork 注入） |
| IPC | `canvas-status` | `mindmap-start` / `mindmap-status`（★新增） |
| fork 关键姿势 | execPath + ELECTRON_RUN_AS_NODE=1 + stdio 含 'ipc' | 同左（缺一不可，否则服务不运行/抛 IPC_REQUIRED） |

---

## 三、本次（1.13.6 思维导图接入）新增/修改文件

### 新增
| 文件 | 作用 |
|---|---|
| `electron/mindmap/index.html` | 源站思维导图 v3 原样复制（458KB），**UI/功能勿改** |
| `electron/mindmap/server.js` | 源 server.js + 1 行改动：`DATA_DIR = process.env.CANVAS_DATA_DIR \|\| path.join(ROOT,'.canvas-data')`（第 12 行） |
| `src/components/MindMapFrame.jsx` | 思维导图嵌入组件：全屏封面入口 → 点击调 `mindmapStart` 懒启动 → 轮询 `mindmapStatus` → 单条横线加载（≥1.2s）→ iframe 缩放淡入 |
| `src/pages/MindMap.jsx` | 路由页薄壳（渲染 MindMapFrame） |

### 修改
| 文件 | 改动点 |
|---|---|
| `electron/main.js` | ★ 新增 mindmap 服务段（约 940-1000 行）：MINDMAP_PORT=18880、MINDMAP_DATA_DIR、startMindmapServer/stopMindmapServer、`mindmap-start`/`mindmap-status` IPC；window-all-closed 与 before-quit 加 stopMindmapServer() |
| `electron/preload.js` | 暴露 `mindmapStart` / `mindmapStatus`（canvasStatus 旁） |
| `src/App.jsx` | lazy 引入 MindMap + 路由 `/mindmap` |
| `src/components/Layout.jsx` | navItems 加 `{ to:'/mindmap', label:'思维导图', icon:Network, group:'tools' }`；isFullCanvas 含 `/mindmap`；版本号 v1.13.6 |
| `src/pages/LearningHub.jsx` | 移除"思维导图"tab 按钮（renderTabs 只留资料列表）+ 删除思维导图渲染块（原 917-1021 行，`{activeTab==='mindmap' && ...}` 已删；MindMapCanvas 函数/组件定义保留未挂载） |
| `package.json` | version 1.13.6；extraResources 新增 `{from:'electron/mindmap', to:'mindmap'}` |

---

## 四、关键验证方法

1. **服务可启动**：
   ```
   cd D:\LocalHub\electron\mindmap
   CANVAS_PORT=18880 CANVAS_DATA_DIR="D:/LocalHub/dev/mindmap-data" node server.js
   → 浏览器开 http://127.0.0.1:18880/ 应显示思维导图（标题含"思维导图"）
   ```
2. **语法检查**：`node --check electron/main.js`；各 jsx 用 `npx esbuild <file> --bundle --external:react --external:react-dom --external:lucide-react --loader:.js=jsx --outfile=/dev/null` 查 ERROR
3. **打包**：`cd D:\LocalHub && NODE_OPTIONS= GITHUB_TOKEN= GH_TOKEN= npm run pack:nsis`（三个环境变量清空是硬性要求，否则构建失败）
4. **打包资源**：`D:\LocalHub\release\win-unpacked\resources\mindmap\` 应含 index.html + server.js

---

## 五、已知注意事项（检测时留意）

- **不要动** `electron/canvas-app/`（视频工作流，用户要求保持原样）
- **不要改** `electron/mindmap/index.html` 的 UI/功能（源站 1:1，用户硬性要求）
- **mindmap 端口固定 18880**：若被占用会启动失败，需处理端口冲突（当前未做自动换端口，与 canvas 的动态端口策略不同——这是已知设计差异）
- LearningHub 保留了大量未挂载的旧思维导图函数/组件（MindMapCanvas 等死代码），属预期（1.13.6 为安全未删除定义）
- 安装包规则：release 只保留最近两次（最新 + 前一个）
- 本机打包三坑：NODE_OPTIONS 安全删除 shim、GITHUB_TOKEN 需清空、孤儿进程抢 win-unpacked（见记忆）

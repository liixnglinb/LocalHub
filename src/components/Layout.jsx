import React from 'react';
import { useLocation } from 'react-router-dom';
import {
  NotebookPen, Link, Lightbulb, BookOpen, Baby, KeyRound, Wrench, CalendarDays, CalendarClock, Bot, Newspaper, UserRound,
} from 'lucide-react';

/**
 * Layout — 页面布局壳（经典简约商务白底风）
 *  - / 首页：全屏（Dashboard 自控）
 *  - /mindmap /leaderboard /blog：全屏 iframe 铺满
 *  - 其他工具页：统一"浅灰白背景 + 白卡片页头 + 内容居中容器"外壳
 *    无渐变 / 无光晕 / 无玻璃 / 无弹跳动画
 */

const FULLSCREEN_PATHS = ['/', '/mindmap', '/leaderboard', '/blog', '/baby-care', '/jianlai'];

const TOOL_META = {
  '/smart-notes': {
    label: '智能笔记', sub: '随手记录灵感，沉淀结构化知识', Icon: NotebookPen, accent: '#7C5CFF',
  },
  '/web-links': {
    label: '网页链接', sub: '收藏与管理常用网页，分类快速访问', Icon: Link, accent: '#0891B2',
  },
  '/prompts': {
    label: '提示词库', sub: '管理 AI 提示词模板，随用随取', Icon: Lightbulb, accent: '#D97706',
  },
  '/learning': {
    label: '学习资料', sub: '学科笔记与资料，知识体系一目了然', Icon: BookOpen, accent: '#059669',
  },
  '/baby-care': {
    label: '宝宝护理', sub: '记录宝宝成长，护理数据可视化', Icon: Baby, accent: '#5B8DEF',
  },
  '/api-keys': {
    label: 'API 密钥', sub: '统一管理 API Key，安全加密存储', Icon: KeyRound, accent: '#4F46E5',
  },
  '/tools': {
    label: '工具网站集成', sub: '金融与效率工具导航，精选网站一站直达', Icon: Wrench, accent: '#0CA678',
  },
  '/schedule': {
    label: '个人课表', sub: '课程安排一目了然，按周自动同步更新', Icon: CalendarDays, accent: '#6366F1',
  },
  '/planner': {
    label: '个人日程', sub: '日历假期与自定义日程，精准到点', Icon: CalendarClock, accent: '#0EA5E9',
  },
  '/agents': {
    label: 'AI Agent & Skill', sub: '主流 Agent 聚合与高分 Skill 资源', Icon: Bot, accent: '#7C5CFF',
  },
  '/news': {
    label: 'AI 每日情报站', sub: 'Agent · 模型 · 工具 · 行业 · Skill 一站式速览', Icon: Newspaper, accent: '#3B5BFF',
  },
  '/profile': {
    label: '个人中心', sub: '账号信息 · 修改昵称密码', Icon: UserRound, accent: '#7C5CFF',
  },
};

function getMeta(pathname) {
  // 匹配精确前缀即可（以后 query/hash 不影响）
  for (const [p, meta] of Object.entries(TOOL_META)) {
    if (pathname === p || pathname.startsWith(p + '/')) return meta;
  }
  return null;
}

export default function Layout({ children }) {
  const { pathname } = useLocation();
  // '/' 精确匹配首页；其余子路径按前缀匹配，避免 '/' 误伤所有工具页
  const isFullscreen = FULLSCREEN_PATHS.some(
    (p) => p === '/' ? pathname === '/' : (pathname === p || pathname.startsWith(p + '/'))
  );
  const meta = getMeta(pathname);

  if (isFullscreen) {
    // '/baby-care'：宝宝护理作为独立全屏应用铺满视口，背景浅灰护眼
    const isBabyCare = pathname === '/baby-care';
    return (
      <div
        style={{
          height: '100vh',
          overflow: 'hidden',
          background: isBabyCare ? '#F7F8FA' : '#FFFFFF',
          color: '#111111',
        }}
      >
        <div style={{ height: '100%', overflow: 'auto', padding: isBabyCare ? 16 : 0 }}>
          {children}
        </div>
      </div>
    );
  }

  // ===== 工具页：统一外壳（简约商务白底） =====
  return (
    <div className="tool-wrap">
      <div className="tool-inner">
        {/* 页头：白卡片 */}
        {meta && (() => {
          const { label, sub, Icon, accent } = meta;
          return (
            <header className="tool-head">
              <div className="tool-head-left">
                <div className="tool-icon" style={{ color: accent, background: '#fff', border: `1px solid ${accent}33` }}>
                  <Icon size={24} strokeWidth={1.8} />
                </div>
                <div className="tool-head-copy">
                  <h1 className="tool-title">{label}</h1>
                  <p className="tool-sub">{sub}</p>
                </div>
              </div>
              <div className="tool-head-right">
                <span className="tool-dot" />
                <span>已连接本地存储</span>
              </div>
            </header>
          );
        })()}

        {/* 内容区：浅底白卡片 */}
        <div className="tool-content">
          {children}
        </div>
      </div>

      <style>{`
        .tool-wrap {
          position: relative;
          min-height: 100vh;
          width: 100%;
          background: #f8f9fa;
          color: #212529;
        }

        /* 内容层 */
        .tool-inner {
          position: relative;
          height: 100vh;
          max-width: 1180px;
          margin: 0 auto;
          padding: 24px 24px 12px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-sizing: border-box;
        }

        /* 页头 */
        .tool-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          background: #fff;
          border: 1px solid rgba(20,24,33,.08);
          border-radius: 14px;
          box-shadow: 0 1px 2px rgba(16,20,30,.04);
          padding: 16px 20px;
        }
        .tool-head-left {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
        }
        .tool-icon {
          width: 46px; height: 46px;
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .tool-head-copy { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .tool-title {
          margin: 0;
          font-size: 21px;
          font-weight: 700;
          letter-spacing: -0.01em;
          line-height: 1.1;
          color: #212529;
          white-space: nowrap;
        }
        .tool-sub {
          margin: 0;
          font-size: 12.5px;
          font-weight: 500;
          color: #6c757d;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .tool-head-right {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 999px;
          background: #f8f9fa;
          border: 1px solid rgba(20,24,33,.07);
          color: #6c757d;
          font-size: 11.5px;
          font-weight: 600;
          flex-shrink: 0;
        }
        .tool-dot {
          width: 6px; height: 6px; border-radius: 999px;
          background: #22C55E;
        }

        /* 内容区 */
        .tool-content {
          flex: 1;
          min-height: 0;
          overflow: auto;
          background: #fff;
          border: 1px solid rgba(20,24,33,.07);
          border-radius: 14px;
          box-shadow: 0 1px 2px rgba(16,20,30,.04);
          padding: 28px 30px 32px;
          color: #212529;
          --content-accent: #7C5CFF;
          --content-accent-soft: rgba(124,92,255,0.08);
          --content-danger: #EF4444;
          --content-success: #16A34A;
          --content-warn: #F59E0B;
        }
        /* 所有工具页统一：内容不贴边 */
        .tool-content > *:last-child { margin-bottom: 12px; }
        .tool-content td, .tool-content th { padding: 12px 16px; }

        /* ======= 通用卡片：白底细边框小圆角 ======= */
        .tool-content [class*="card"]:not([class*="grid"]),
        .tool-content [class*="Card"]:not([class*="grid"]),
        .tool-content [class*="note-item"],
        .tool-content [class*="note-card"],
        .tool-content [class*="link-item"],
        .tool-content [class*="link-card"],
        .tool-content [class*="prompt-item"],
        .tool-content [class*="prompt-card"],
        .tool-content [class*="material-item"],
        .tool-content [class*="material-card"],
        .tool-content [class*="record-item"],
        .tool-content [class*="record-card"],
        .tool-content [class*="key-item"],
        .tool-content [class*="key-card"],
        .tool-content [class*="draft-item"],
        .tool-content [class*="draft-card"] {
          background: #fff !important;
          border: 1px solid rgba(20,24,33,.09) !important;
          border-radius: 14px !important;
          box-shadow: 0 1px 2px rgba(16,20,30,.04) !important;
          padding: 16px 18px !important;
          transition: border-color .2s ease, box-shadow .2s ease;
        }
        .tool-content [class*="item"]:hover,
        .tool-content [class*="card"]:hover {
          border-color: rgba(20,24,33,.16) !important;
          box-shadow: 0 4px 12px -6px rgba(16,20,30,.12) !important;
        }

        /* ======= 表格 ======= */
        .tool-content tbody tr { transition: background .15s ease; }
        .tool-content tbody tr:hover { background: #f8f9fa !important; }
        .tool-content thead th {
          background: #f8f9fa;
          color: #6c757d !important;
          border-bottom: 1px solid rgba(20,24,33,.08) !important;
          font-weight: 600;
        }

        /* ======= Tab（页签白底灰边） ======= */
        .tool-content [role="tablist"],
        .tool-content [class*="tablist"],
        .tool-content [class*="seg-"],
        .tool-content [class*="filter-row"],
        .tool-content [class*="category-row"] {
          border: 1px solid rgba(20,24,33,.09) !important;
          border-radius: 10px !important;
          background: #f8f9fa !important;
          display: inline-flex !important;
          gap: 2px !important;
          padding: 3px !important;
        }
        .tool-content [role="tab"],
        .tool-content [class*="tablist"] button,
        .tool-content [class*="category-row"] button:not([class*="p-1"]):not([class*="p-2"]) {
          padding: 7px 16px !important;
          border-radius: 8px !important;
          border: 0 !important;
          background: transparent !important;
          color: #6c757d !important;
          font-size: 13px !important;
          font-weight: 600 !important;
          box-shadow: none !important;
        }
        .tool-content [role="tab"]:hover,
        .tool-content [class*="tablist"] button:hover { color: #212529 !important; }
        .tool-content [role="tab"][aria-selected="true"],
        .tool-content [class*="tablist"] button[class*="active"],
        .tool-content [class*="category-row"] button[class*="active"] {
          background: #fff !important;
          color: #212529 !important;
          box-shadow: 0 1px 3px rgba(16,20,30,.1) !important;
        }

        /* ======= 模态框 ======= */
        body [class*="modal"]:not([class*="backdrop"]),
        body [class*="Modal"]:not([class*="backdrop"]) {
          border-radius: 14px !important;
          background: #fff !important;
          border: 1px solid rgba(20,24,33,.1) !important;
          box-shadow: 0 20px 50px -20px rgba(16,20,30,.3) !important;
          padding: 22px 24px !important;
        }
        body [class*="modal-overlay"],
        body [class*="backdrop"] {
          background: rgba(20,24,33,.35) !important;
        }

        /* ======= 滚动条细腻化 ======= */
        .tool-content::-webkit-scrollbar { width: 10px; height: 10px; }
        .tool-content::-webkit-scrollbar-thumb {
          background: #C9CDD6;
          border-radius: 999px;
          border: 2px solid transparent;
          background-clip: content-box;
        }
        .tool-content::-webkit-scrollbar-thumb:hover { background: #AAB0BC; background-clip: content-box; }
        .tool-content::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
}

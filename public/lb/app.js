/* ============================================================
   AI 大模型排行榜 · 前端逻辑
   - 从后端 API 拉取数据：/api/config, /api/leaderboard/:tabId
   - 支持 Tab 切换、搜索、思考强度选择、实时刷新、行展开、深浅色切换
   ============================================================ */

(function () {
  "use strict";

  // ---- DOM 引用 ----
  const tabsEl = document.getElementById("tabs");
  const rowsEl = document.getElementById("rows");
  const axisEl = document.getElementById("axis");
  const searchInput = document.getElementById("searchInput");
  const refreshBtn = document.getElementById("refreshBtn");
  const summaryLeft = document.getElementById("summaryLeft");
  const summaryRight = document.getElementById("summaryRight");
  const footnote = document.getElementById("footnote");

  // ---- 状态 ----
  let CONFIG = null;         // 后端返回的配置（tabs、strengths、vendors、axis）
  let activeTab = "overall";
  let selectedId = null;     // 当前展开行 id
  let lastList = [];         // 最近一次榜单数据（供同步/刷新后复用）

  // 默认深色模式
  document.body.classList.add("dark");

  // ---- Tab 渲染（首次建按钮；后续切换只更新 active，不重建，避免整页闪烁）----
  function renderTabs() {
    const tabs = (CONFIG && CONFIG.tabs) || [];
    // 首次或数量变化时才重建
    if (tabsEl.children.length !== tabs.length) {
      tabsEl.innerHTML = "";
      tabs.forEach((tab) => {
        const btn = document.createElement("button");
        btn.className = "tab";
        btn.setAttribute("role", "tab");
        btn.dataset.tabId = tab.id;
        btn.innerHTML = (tab.icon || "") + "<span>" + tab.label + "</span>";
        btn.addEventListener("click", () => {
          if (activeTab === tab.id) return;
          activeTab = tab.id;
          selectedId = null;
          renderTabs();
          fetchAndRender();
        });
        tabsEl.appendChild(btn);
      });
    }
    // 仅更新 active 类
    Array.from(tabsEl.children).forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tabId === activeTab);
    });
  }

  // ---- 搜索 ----
  let searchTimer = null;
  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(fetchAndRender, 120);
  });

  // ---- Tab 栏：鼠标悬停时，上下滚轮 → 左右横向滚动 Tab 栏 ----
  tabsEl.addEventListener("wheel", (e) => {
    const delta = e.deltaY !== 0 ? e.deltaY : e.deltaX;
    if (Math.abs(delta) > 0) {
      e.preventDefault();
      tabsEl.scrollLeft += delta;
    }
  }, { passive: false });

  // ---- 实时刷新按钮（带旋转反馈）----
  refreshBtn.addEventListener("click", () => {
    const svg = refreshBtn.querySelector("svg");
    svg.classList.remove("spin");
    void svg.offsetWidth; // 重启动画
    svg.classList.add("spin");
    fetchAndRender().then(() => {
      setTimeout(() => svg.classList.remove("spin"), 600);
    });
  });

  // ---- 从 DataLearner 同步数据 ----
  const syncBtn = document.getElementById("syncBtn");
  syncBtn.addEventListener("click", async () => {
    const span = syncBtn.querySelector("span");
    const svg = syncBtn.querySelector("svg");
    const origText = span.textContent;
    syncBtn.disabled = true;
    svg.classList.add("spin");
    span.textContent = "同步中…";
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error((j && j.error) || "同步失败 " + res.status);
      // 重新拉取配置 + 当前榜单
      await fetchConfig();
      renderTabs();
      renderAxis();
      await fetchAndRender();
      const r = j.report;
      const detail = (r.sources || [])
        .filter((s) => s.ok)
        .map((s) => `${s.tab}+${s.added}`)
        .join(" ");
      showToast(`已同步 BenchLM：新增 ${r.addedTotal} 条 · 更新 ${r.updatedTotal} 条（${detail}）`, "ok");
    } catch (e) {
      showToast("同步失败：" + e.message, "err");
    } finally {
      syncBtn.disabled = false;
      svg.classList.remove("spin");
      span.textContent = origText;
    }
  });

  // ============================================================
  // 数据请求 + 渲染
  // ============================================================
  async function fetchConfig() {
    const res = await fetch("/api/config");
    if (!res.ok) throw new Error("配置接口错误 " + res.status);
    CONFIG = await res.json();
  }

  async function fetchAndRender() {
    selectedId = null; // 全量渲染时不保留展开态（详情由局部展开单独管理）
    const params = new URLSearchParams({
      search: searchInput.value.trim(),
    }).toString();

    let payload;
    try {
      const res = await fetch(`/api/leaderboard/${activeTab}?${params}`);
      if (!res.ok) throw new Error("榜单接口错误 " + res.status);
      payload = await res.json();
    } catch (err) {
      rowsEl.innerHTML = `
        <div class="row" style="grid-template-columns:1fr;">
          <div style="color:#e07b68;padding:40px;text-align:center;">
            加载失败：${err.message}。请确认后端服务已启动（node server.js）
          </div>
        </div>`;
      return;
    }

    lastList = payload.list;
    renderSummary(payload);
    renderRows(payload);
    renderAxis();
    renderFootnote();
  }

  // 顶部统计
  function renderSummary(payload) {
    const tab = (CONFIG && CONFIG.tabs.find((t) => t.id === activeTab)) || { label: "" };
    const searching = searchInput.value.trim() ? "已筛选" : "全部模型";

    summaryLeft.innerHTML = `
      <b>${tab.label}</b> · 共 <b>${payload.total}</b> 条模型 · ${searching}
      <span style="margin-left:10px;opacity:.6;">· 数据源 BenchLM</span>`;

    summaryRight.innerHTML = "";
  }

  // 行渲染
  function renderRows(payload) {
    rowsEl.innerHTML = "";
    const list = payload.list;

    if (!list.length) {
      rowsEl.innerHTML = `
        <div class="empty-state">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>
          </svg>
          <div>没有匹配的模型，请尝试其他关键词或筛选条件。</div>
        </div>`;
      return;
    }

    // 条形图归一化：用当前榜单最大分作为 100%
    const maxScore = Math.max(...list.map((r) => r.score));

    list.forEach((rowData) => {
      const { id, rank, vendor, name, score, open, lang, released, detail, strengthLabel } = rowData;

      // 主行
      const row = document.createElement("div");
      row.className = "row";
      row.dataset.id = id;

      // 1 排名
      const rk = document.createElement("div");
      rk.className = "rank";
      rk.textContent = rank;
      row.appendChild(rk);

      // 2 厂商 logo：优先加载本地预存图标（public/vendors/{key}.png），失败回退文字缩写
      const logo = document.createElement("div");
      logo.className = "logo";
      logo.title = vendor.name;
      const img = document.createElement("img");
      img.className = "logo-img";
      img.src = "vendors/" + encodeURIComponent(vendor.key) + ".png";
      img.alt = vendor.label || "";
      img.referrerPolicy = "no-referrer";
      img.addEventListener("error", () => {
        logo.classList.remove("has-img");
        logo.textContent = vendor.label || "?";
        logo.style.background = vendor.color || "#888";
      });
      logo.classList.add("has-img");
      logo.style.background = "#fff";
      logo.appendChild(img);
      row.appendChild(logo);

      // 3 模型名 + 子信息（仅保留厂商公司名 + 国家/地区）
      const nm = document.createElement("div");
      nm.className = "name";
      const countryBadge = vendor.country ? `<span>${vendor.country}</span>` : "";
      nm.innerHTML = `
        <div class="name-main">${escapeHtml(name)}</div>
        <div class="name-sub">
          <span>${escapeHtml(vendor.name || "")}</span>
          ${countryBadge ? `<span class="sep">·</span>` + countryBadge : ""}
        </div>`;
      row.appendChild(nm);

      // 4 进度条
      const barWrap = document.createElement("div");
      barWrap.className = "bar-wrap";
      const bar = document.createElement("div");
      bar.className = "bar";
      const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
      bar.style.width = pct + "%";
      barWrap.appendChild(bar);
      row.appendChild(barWrap);

      // 5 分数
      const sc = document.createElement("div");
      sc.className = "score";
      sc.innerHTML = `${formatScore(score)}<span class="unit">分</span>`;
      row.appendChild(sc);

      // 点击：局部展开/收起详情，不重载整页
      row.addEventListener("click", () => {
        toggleRow(row, id, rowData);
      });

      rowsEl.appendChild(row);
    });

    // 行逐个弹出动画（切榜/首次加载时从上方依次落下）
    const rowEls = rowsEl.querySelectorAll(".row");
    rowEls.forEach((r, i) => {
      r.style.animationDelay = i * 22 + "ms";
      r.classList.add("row-enter");
    });

    // 刻度需要和当前行的进度条宽度完全对齐，由 JS 动态设置 margin-left
    positionAxis();
  }

  // 局部展开/收起详情（不重新请求、不重绘其他行）
  function toggleRow(row, id, rowData) {
    const isOpen = row.classList.contains("selected");
    closeAllRows();
    if (isOpen) {
      selectedId = null;
      return;
    }
    selectedId = id;
    row.classList.add("selected");
    const wrap = document.createElement("div");
    wrap.className = "row-detail-wrap open";
    wrap.innerHTML = buildDetail(
      rowData.vendor, rowData.released, rowData.detail,
      rowData.open, rowData.lang, rowData.strengthLabel, rowData.strengthEng
    );
    row.insertAdjacentElement("afterend", wrap);
    // 展开后逐个弹出详情项，丝滑过渡
    requestAnimationFrame(() => animateDetail(wrap));
  }

  // 收起所有已展开的行与详情
  function closeAllRows() {
    rowsEl.querySelectorAll(".row.selected").forEach((r) => r.classList.remove("selected"));
    rowsEl.querySelectorAll(".row-detail-wrap").forEach((w) => w.remove());
  }

  // 详情项逐个淡入（微错峰）
  function animateDetail(wrap) {
    const items = wrap.querySelectorAll(".detail-item");
    items.forEach((el, i) => {
      el.style.animationDelay = i * 40 + "ms";
      el.classList.add("pop-in");
    });
  }

  // 构造详情（精简中文信息卡：仅 上下文 / 价格 / 国家 / 厂商 / 思考强度 / 发布时间）
  function buildDetail(vendor, released, detail, open, lang, strengthLabel, strengthEng) {
    const d = detail || {};

    // 上下文
    const context = d["上下文"] || "-";

    // 价格：优先 "价格"，其次 "输入价格/输出价格"，都没有则显示暂无数据
    let price = null;
    if (d["价格"]) price = String(d["价格"]);
    else if (d["输入价格"] || d["输出价格"]) {
      const parts = [];
      if (d["输入价格"]) parts.push("输入 " + d["输入价格"]);
      if (d["输出价格"]) parts.push("输出 " + d["输出价格"]);
      price = parts.join("　");
    }

    const items = [
      ["厂商", vendor.name],
      ["国家 / 地区", vendor.country || "-"],
      ["思考强度", strengthLabel || "-"],
      ["上下文", context],
      ["价格", price || "暂无数据"],
      ["发布时间", released || "-"],
    ];
    const basics = items
      .map(([k, v]) => `<div class="detail-item"><span class="k">${k}</span><span class="v">${escapeHtml(String(v))}</span></div>`)
      .join("");

    return `<div class="row-detail"><div class="row-detail-inner">${basics}</div></div>`;
  }

  // 底部横轴刻度
  function renderAxis() {
    const axis = CONFIG && CONFIG.axis;
    if (!axis) return;
    axisEl.innerHTML = "";
    const min = axis.min, max = axis.max, step = axis.step;
    for (let v = min; v <= max; v += step) {
      const pct = max > min ? ((v - min) / (max - min)) * 100 : 0;
      const tick = document.createElement("div");
      tick.className = "tick";
      tick.style.left = pct + "%";
      tick.innerHTML = `<span class="line"></span><span class="text">${v}</span>`;
      axisEl.appendChild(tick);
    }
    // 动态与条形图对齐
    requestAnimationFrame(positionAxis);
  }

  // 让刻度容器左边缘与「进度条起始位置」对齐
  function positionAxis() {
    // 取第一行的进度条元素
    const firstBarWrap = rowsEl.querySelector(".row .bar-wrap");
    const firstRow = rowsEl.querySelector(".row");
    if (!firstRow || !firstBarWrap) return;
    const containerLeft = firstRow.getBoundingClientRect().left;
    const barLeft = firstBarWrap.getBoundingClientRect().left;
    const offset = barLeft - containerLeft;
    axisEl.style.marginLeft = offset + "px";
  }

  function renderFootnote() {
    footnote.innerHTML = `
      <div>
        数据来源：Artificial Analysis · LMArena · SWE-bench Verified · GPQA Diamond · AIME · MMMU · 中文聚合评测
        <br>仅用于技术研究参考，分数口径为综合换算结果，具体排名请以官方发布为准。
      </div>
      <div>© 2026 AI 排行榜 · 全量榜单共 ${(CONFIG && CONFIG.tabs) ? CONFIG.tabs.length : 0} 个维度</div>`;
  }

  // ============================================================
  // 工具
  // ============================================================
  function formatScore(n) {
    if (typeof n !== "number") return String(n);
    if (Number.isInteger(n)) return n.toString();
    return n.toFixed(1);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]);
  }

  // 轻量提示（右上角浮出，自动消失）
  function showToast(text, type) {
    let el = document.getElementById("toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      el.className = "toast";
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.className = "toast show " + (type || "");
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.className = "toast"; }, 4000);
  }

  // ============================================================
  // 启动
  // ============================================================
  (async function bootstrap() {
    try {
      await fetchConfig();
      renderTabs();
      renderAxis();
      await fetchAndRender();
    } catch (err) {
      rowsEl.innerHTML = `
        <div class="empty-state" style="color:#c00;">
          <div><b>初始化失败</b>：${escapeHtml(err.message)}</div>
          <div style="margin-top:8px;font-size:12px;">
            请在项目根目录运行 <code>npm install</code>，再运行 <code>npm start</code> 启动后端。
          </div>
        </div>`;
    }

    // 窗口尺寸变化时重新对齐刻度
    window.addEventListener("resize", () => positionAxis());
  })();
})();
/**
 * TimelineApp Class
 * Handles state, data logic, and rendering for the history timeline and UI.
 */
class TimelineApp {
  constructor() {
    // Constants
    this.CONSTANTS = {
      DEFAULT_TIMELINES: {
        left: ["世界史", "技術", "学問", "偉業", "悲劇", "作品"],
        right: ["日本", "フランス", "Fate"],
      },
      COLOR_PALETTE: [
        "#4f46e5",
        "#f59e0b",
        "#10b981",
        "#ec4899",
        "#1e40af",
        "#ef4444",
        "#f97316",
        "#84cc16",
        "#db2777",
        "#14b8a6",
        "#0ea5e9",
        "#8b5cf6",
      ],
      PIXELS_PER_YEAR: 1.5,
      MAX_PIXEL_GAP: 150,
      OMISSION_THRESHOLD_YEARS: 500,
      CARD_MARGIN: 15,
      MARKER_MIN_DISTANCE: 32,
    };

    // State
    this.state = {
      data: {},
      activeTimelines: { left: [], right: [] },
      colorIndex: 0,
    };

    // DOM Elements
    this.dom = {
      container: document.getElementById("timeline-container"),
      // PC
      pcLeftAdd: document.getElementById("pc-left-add"),
      pcRightAdd: document.getElementById("pc-right-add"),
      pcLeftTags: document.getElementById("pc-left-tags"),
      pcRightTags: document.getElementById("pc-right-tags"),
      btnEditPc: document.getElementById("btn-edit-pc"),
      // Mobile
      fab: document.getElementById("fabBtn"),
      overlay: document.getElementById("menuOverlay"),
      closeBtn: document.getElementById("closeMenuBtn"),
      mobileBadgesLeft: document.getElementById("mobileBadgesLeft"),
      mobileListLeft: document.getElementById("mobileListLeft"),
      mobileBadgesRight: document.getElementById("mobileBadgesRight"),
      mobileListRight: document.getElementById("mobileListRight"),
      btnEditMobile: document.getElementById("btn-edit-mobile"),
      // Editor
      jsonInput: document.getElementById("json-input"),
      modal: document.getElementById("editor-modal"),
      btnCancel: document.getElementById("btn-cancel"),
      btnSave: document.getElementById("btn-save"),
    };

    this.resizeTimer = null;
  }

  init() {
    this.bindEvents();
    this.fetchData();
  }

  bindEvents() {
    // PC Dropdowns
    this.dom.pcLeftAdd.addEventListener("change", (e) =>
      this.handleAddTimeline("left", e.target.value, e.target)
    );
    this.dom.pcRightAdd.addEventListener("change", (e) =>
      this.handleAddTimeline("right", e.target.value, e.target)
    );

    // Editor
    const openEditor = () => this.openEditor();
    this.dom.btnEditPc.addEventListener("click", openEditor);
    this.dom.btnEditMobile.addEventListener("click", () => {
      this.dom.overlay.classList.remove("active"); // Close mobile menu first
      openEditor();
    });
    this.dom.btnCancel.addEventListener("click", () => this.closeEditor());
    this.dom.btnSave.addEventListener("click", () => this.saveData());

    // Mobile Menu interactions
    this.dom.fab.addEventListener("click", () => {
      this.renderMobileMenu();
      this.dom.overlay.classList.add("active");
    });
    this.dom.closeBtn.addEventListener("click", () => {
      this.dom.overlay.classList.remove("active");
    });
    this.dom.overlay.addEventListener("click", (e) => {
      if (e.target === this.dom.overlay) {
        this.dom.overlay.classList.remove("active");
      }
    });

    // Mobile List/Badge delegation
    document.addEventListener("click", (e) => {
      // Remove Badge
      if (e.target.closest(".badge-remove")) {
        const t = e.target.closest(".badge-remove");
        const s = t.dataset.side;
        const idx = parseInt(t.dataset.idx, 10);
        this.removeTimeline(s, idx);
        return;
      }
      // Add Option
      if (
        e.target.closest(".option-item") &&
        !e.target.classList.contains("disabled")
      ) {
        const t = e.target.closest(".option-item");
        const s = t.dataset.side;
        const v = t.dataset.val;
        if (s && v) {
          this.addTimeline(s, v);
        }
      }
    });

    window.addEventListener("resize", () => {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => this.render(), 200);
    });
  }

  fetchData() {
    const url = "https://gist.githubusercontent.com/dodonium/9509a9f7ce8457861396058148193f5c/raw/history.json";
    fetch(`${url}?t=${Date.now()}`)
      .then((res) => res.json())
      .then((data) => {
        this.state.data = data;
        this.initDefaults();
      })
      .catch(() => {
        this.initDefaults(); // Fallback if no file
      });
  }

  initDefaults() {
    this.populatePcSelects();

    // Add defaults based on config
    ["left", "right"].forEach((side) => {
      this.CONSTANTS.DEFAULT_TIMELINES[side].forEach((key) => {
        if (this.state.data[key]) this.addTimeline(side, key);
      });
    });

    // Fallback if empty
    const keys = Object.keys(this.state.data);
    if (
      !this.state.activeTimelines.left.length &&
      !this.state.activeTimelines.right.length &&
      keys.length > 0
    ) {
      [0, 1, 2].forEach((i) => {
        if (keys[i]) this.addTimeline("left", keys[i]);
      });
      if (keys[3]) this.addTimeline("right", keys[3]);
    }

    this.updateUI();
  }

  /* --- Data & State Management --- */

  getNextColor() {
    const color =
      this.CONSTANTS.COLOR_PALETTE[
        this.state.colorIndex % this.CONSTANTS.COLOR_PALETTE.length
      ];
    this.state.colorIndex++;
    return color;
  }

  addTimeline(side, key) {
    if (!key || this.state.activeTimelines[side].some((t) => t.key === key))
      return;

    this.state.activeTimelines[side].push({
      key,
      color: this.getNextColor(),
    });
    this.updateUI();
  }

  removeTimeline(side, index) {
    this.state.activeTimelines[side].splice(index, 1);
    this.updateUI();
  }

  handleAddTimeline(side, value, targetEl) {
    this.addTimeline(side, value);
    if (targetEl) targetEl.value = "";
  }

  /* --- UI Updates (Unified) --- */

  updateUI() {
    this.updatePcTags("left");
    this.updatePcTags("right");
    // If mobile menu is open, it will re-render on interactions,
    // but we also re-render here to ensure sync if called from PC logic (though unlikely to happen simultaneously)
    if (this.dom.overlay.classList.contains("active")) {
      this.renderMobileMenu();
    }
    this.render(); // Render Timeline
  }

  populatePcSelects() {
    const keys = Object.keys(this.state.data);
    const setup = (el, text) => {
      el.innerHTML = `<option value="" disabled selected>${text}</option>`;
      keys.forEach((k) => {
        const opt = document.createElement("option");
        opt.value = k;
        opt.innerText = k;
        el.appendChild(opt);
      });
    };
    setup(this.dom.pcLeftAdd, "＋ 左に追加");
    setup(this.dom.pcRightAdd, "＋ 右に追加");
  }

  updatePcTags(side) {
    const container =
      side === "left" ? this.dom.pcLeftTags : this.dom.pcRightTags;
    container.innerHTML = "";
    this.state.activeTimelines[side].forEach((item, index) => {
      const tag = document.createElement("div");
      tag.className = "history-tag";
      tag.style.backgroundColor = item.color;
      tag.innerHTML = `${item.key}`;
      const btn = document.createElement("button");
      btn.textContent = "×";
      btn.onclick = () => this.removeTimeline(side, index);
      tag.appendChild(btn);
      container.appendChild(tag);
    });
  }

  renderMobileMenu() {
    this.renderMobileColumn(
      "left",
      this.dom.mobileBadgesLeft,
      this.dom.mobileListLeft
    );
    this.renderMobileColumn(
      "right",
      this.dom.mobileBadgesRight,
      this.dom.mobileListRight
    );
  }

  renderMobileColumn(side, badgesEl, listEl) {
    const currentList = this.state.activeTimelines[side];
    const allKeys = Object.keys(this.state.data);

    // Badges
    badgesEl.innerHTML = "";
    currentList.forEach((item, idx) => {
      const span = document.createElement("span");
      span.className = "badge";
      // Applied dynamic background color here
      span.style.backgroundColor = item.color;
      span.innerHTML = `${item.key} <span class="badge-remove" data-side="${side}" data-idx="${idx}">×</span>`;
      badgesEl.appendChild(span);
    });

    // Options List
    listEl.innerHTML = "";
    allKeys.forEach((key) => {
      const li = document.createElement("li");
      li.className = "option-item";
      const isActive = currentList.some((t) => t.key === key);

      if (isActive) {
        li.classList.add("disabled");
        li.innerText = key;
      } else {
        li.innerText = key;
        li.dataset.side = side;
        li.dataset.val = key;
      }
      listEl.appendChild(li);
    });
  }

  formatYear(year) {
    if (year >= -10000) return year < 0 ? `BC${Math.abs(year)}` : `${year}年`;
    const abs = Math.abs(year);
    if (abs >= 100000000)
      return `約${parseFloat((abs / 100000000).toPrecision(2))}億年前`;
    if (abs >= 10000)
      return `約${parseFloat((abs / 10000).toPrecision(2))}万年前`;
    return `約${abs}年前`;
  }

  /* --- Rendering Engine (Timeline) --- */

/* --- Rendering Engine (Optimized) --- */
  render() {
    // コンテナのリセット
    this.dom.container.innerHTML = '<div class="axis-line"></div>';

    // 1. データ準備（フラット化とソート）
    const allEvents = [];
    ["left", "right"].forEach((side) => {
      this.state.activeTimelines[side].forEach((item) => {
        (this.state.data[item.key] || []).forEach((ev) => {
          allEvents.push({ ...ev, side, color: item.color, source: item.key });
        });
      });
    });
    allEvents.sort((a, b) => a.year - b.year);

    // 2. 年ごとのグループ化
    const yearsMap = new Map();
    allEvents.forEach((ev) => {
      if (!yearsMap.has(ev.year)) {
        yearsMap.set(ev.year, { left: [], right: [], marker: null, year: ev.year });
      }
      yearsMap.get(ev.year)[ev.side].push(ev);
    });
    const sortedGroups = Array.from(yearsMap.values()).sort((a, b) => a.year - b.year);

    // --- Phase 1: DOM生成と仮配置 ---
    // ここではまだ座標計算せず、とりあえずDOMツリーに追加してブラウザにレンダリングさせる
    const fragment = document.createDocumentFragment();
    
    sortedGroups.forEach((group) => {
      // マーカー生成
      group.markerEl = this.createMarker(group.year, group);
      fragment.appendChild(group.markerEl);

      // カード生成
      ["left", "right"].forEach((side) => {
        group[side].forEach((ev) => {
          ev.el = this.createCard(ev, side === "left" ? "event-left" : "event-right");
          fragment.appendChild(ev.el);
        });
      });
    });
    
    this.dom.container.appendChild(fragment);

    // --- Phase 2: 計測 (Batch Read) ---
    // DOMに追加された状態で一気に高さを測る。これならリフローは1回で済む。
    sortedGroups.forEach(group => {
        group.markerHeight = group.markerEl.offsetHeight;
        ["left", "right"].forEach(side => {
            group[side].forEach(ev => {
                ev.height = ev.el.offsetHeight;
            });
        });
    });

    // --- Phase 3: 座標計算 (Pure Math) ---
    // 読み取った高さを使って座標を計算する。DOM操作は一切しない。
    
    let lastLeftBottom = 0;
    let lastRightBottom = 0;
    let prevYear = null;
    let prevY = -100;
    let currentBaseY = 50;
    const omissionThreshold = this.CONSTANTS.OMISSION_THRESHOLD_YEARS;
    
    // 省略記号を配置するためのリスト
    const omissions = [];

    sortedGroups.forEach((group, index) => {
      const year = group.year;

      // A. 時間軸ベースの基準位置計算
      if (index > 0) {
        const diff = year - prevYear;
        const gap = Math.min(
          diff * this.CONSTANTS.PIXELS_PER_YEAR,
          this.CONSTANTS.MAX_PIXEL_GAP
        );
        
        // 省略記号が必要かチェック
        if (diff > omissionThreshold) {
            omissions.push({ top: prevY + gap / 2 });
        }

        const timeStackedY = prevY + gap;
        const minPhysDistY = prevY + this.CONSTANTS.MARKER_MIN_DISTANCE; // マーカー同士の最低距離
        currentBaseY = Math.max(timeStackedY, minPhysDistY);
      } else {
        currentBaseY = 50;
      }

      // B. 物理的な衝突回避計算
      const hasLeft = group.left.length > 0;
      const hasRight = group.right.length > 0;

      // 前のカードとの衝突回避位置
      const safeLeftY = hasLeft ? lastLeftBottom + this.CONSTANTS.CARD_MARGIN : -Infinity;
      const safeRightY = hasRight ? lastRightBottom + this.CONSTANTS.CARD_MARGIN : -Infinity;

      // 一番上のカード（index 0）の中心とマーカーを合わせる
      const minCenterLeft = hasLeft ? safeLeftY + group.left[0].height / 2 : -Infinity;
      const minCenterRight = hasRight ? safeRightY + group.right[0].height / 2 : -Infinity;

      // 最終的なY座標の決定（時間軸 vs 左の物理限界 vs 右の物理限界）
      const requiredY = Math.max(currentBaseY, minCenterLeft, minCenterRight);

      // 計算結果をgroupオブジェクトに保存
      group.top = requiredY;

      // C. 各要素の最終配置座標の計算
      
      // 左側カード配置
      if (hasLeft) {
        // スタックの中心が requiredY に来るように開始位置(startTop)を逆算
        let currentTop = requiredY - group.left[0].height / 2;
        group.left.forEach(ev => {
            ev.top = currentTop;
            currentTop += ev.height + this.CONSTANTS.CARD_MARGIN;
        });
        lastLeftBottom = currentTop - this.CONSTANTS.CARD_MARGIN; // 最後のマージン分を戻す
      }

      // 右側カード配置
      if (hasRight) {
        // 変更：一番上のカードの中心が requiredY に来るように逆算
        let currentTop = requiredY - group.right[0].height / 2;
        group.right.forEach(ev => {
            ev.top = currentTop;
            currentTop += ev.height + this.CONSTANTS.CARD_MARGIN;
        });
        lastRightBottom = currentTop - this.CONSTANTS.CARD_MARGIN;
      }

      prevYear = year;
      prevY = requiredY;
    });

    // --- Phase 4: 反映 (Batch Write) ---
    // 計算済みの値をDOMに適用する
    
    sortedGroups.forEach(group => {
        group.markerEl.style.top = `${group.top}px`;
        ["left", "right"].forEach(side => {
            group[side].forEach(ev => {
                ev.el.style.top = `${ev.top}px`;
            });
        });
    });

    // 省略記号の生成と配置
    omissions.forEach(om => {
        this.createOmissionMarker(om.top);
    });

    // コンテナの高さ調整
    this.dom.container.style.height = `${Math.max(lastLeftBottom, lastRightBottom) + 100}px`;
  }

  createCard(item, className) {
    const card = document.createElement("div");
    card.className = `event-card ${className}`;
    card.style.borderLeftColor = item.color;

    const leadHtml = item.lead
      ? `<div class="event-lead">${item.lead}</div>`
      : "";

    card.innerHTML = `
      <div class="event-header">
        <span class="event-source-label" style="background-color: ${
          item.color
        }">${item.source}</span>
        <span class="event-year-sub">${this.formatYear(item.year)}</span>
      </div>
      <h3>${item.title}</h3>
      ${leadHtml}
      <div class="event-desc">${item.desc}</div>
    `;
    return card;
  }

  createMarker(year, group) {
    const marker = document.createElement("div");
    marker.className = "year-marker";
    let html = `<div class="year-badge">${this.formatYear(year)}</div>`;
    if (group.left.length)
      html += `<div class="connector-line connector-left" style="background-color:${group.left[0].color}"></div>`;
    if (group.right.length)
      html += `<div class="connector-line connector-right" style="background-color:${group.right[0].color}"></div>`;
    marker.innerHTML = html;
    const badge = marker.querySelector(".year-badge");
    if (group.left.length && group.right.length) {
      badge.style.background = `linear-gradient(90deg, ${group.left[0].color}, ${group.right[0].color})`;
    } else if (group.left.length) {
      badge.style.backgroundColor = group.left[0].color;
    } else if (group.right.length) {
      badge.style.backgroundColor = group.right[0].color;
    }
    return marker;
  }

  createOmissionMarker(topY) {
    const el = document.createElement("div");
    el.className = "omission-marker";
    el.innerText = "≈";
    el.style.top = `${topY - 10}px`;
    this.dom.container.appendChild(el);
  }

  /* --- Modal Operations --- */

  openEditor() {
    this.dom.jsonInput.value = JSON.stringify(this.state.data, null, 4);
    this.dom.modal.style.display = "flex";
  }

  closeEditor() {
    this.dom.modal.style.display = "none";
  }

  saveData() {
    try {
      const newData = JSON.parse(this.dom.jsonInput.value);
      if (typeof newData !== "object" || Array.isArray(newData)) {
        throw new Error("ルート要素はオブジェクトである必要があります。");
      }
      this.state.data = newData;
      this.state.activeTimelines = { left: [], right: [] };
      this.state.colorIndex = 0;
      this.populatePcSelects();
      this.updateUI();
      this.closeEditor();
    } catch (e) {
      alert("JSONの解析に失敗しました。\n" + e.message);
    }
  }
}

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
  new TimelineApp().init();
});
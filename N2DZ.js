/* =========================================================
   N2DZ HUB - MARU STYLE
   Cre: Nam2Dz
   ========================================================= */

(() => {
  "use strict";

  if (window.N2DZ_LOCAL?.destroy) {
    window.N2DZ_LOCAL.destroy();
  }

  const AVATAR =
    "https://i.postimg.cc/bw6dt64V/channels4-profile.jpg";

  const state = {
    aura: false,
    aim: false,
    shop: false,
    left: false,
    right: false,
    lag: false,
    effects: false,
    menu: true
  };

  const cfg = {
    range: 150,
    fov: 250,
    leftDelay: 100,
    rightDelay: 150
  };

  let running = true;
  let leftTimer = null;
  let rightTimer = null;
  let infoTimer = null;
  let pingTimer = null;
  let startTime = Date.now();
  let hidden = [];

  /* =========================================================
     GAME ADAPTER
     ========================================================= */

  const GAME = {
    player() {
      return (
        document.querySelector("#player") ||
        document.querySelector(".player") ||
        document.querySelector("[data-player]") ||
        document.querySelector(".character")
      );
    },

    targets() {
      return [
        ...document.querySelectorAll(
          ".enemy,.target,.opponent,[data-enemy]"
        )
      ];
    },

    attack(target) {
      if (typeof window.attack === "function") {
        window.attack(target);
        return true;
      }

      if (!target) return false;

      target.dispatchEvent(
        new CustomEvent("n2dz-attack", {
          bubbles: true,
          detail: {
            target,
            source: "N2DZ"
          }
        })
      );

      return true;
    },

    right() {
      if (typeof window.useRight === "function") {
        window.useRight();
        return true;
      }

      document.dispatchEvent(
        new CustomEvent("n2dz-right-action", {
          bubbles: true,
          detail: {
            source: "N2DZ"
          }
        })
      );

      return true;
    }
  };

  /* =========================================================
     CSS
     ========================================================= */

  const css = document.createElement("style");

  css.textContent = `
  #N2DZ_MENU,
  #N2DZ_MENU * {
    box-sizing:border-box;
  }

  #N2DZ_MENU {
    position:fixed;
    left:50%;
    top:50%;
    transform:translate(-50%,-50%);

    width:650px;
    height:450px;

    display:flex;
    overflow:hidden;

    z-index:2147483646;

    color:#e9faff;

    background:
      linear-gradient(
        135deg,
        #071a27,
        #092f45
      );

    border:1px solid #087c9e;
    border-radius:12px;

    font:13px Arial,sans-serif;

    box-shadow:
      0 25px 80px rgba(0,0,0,.8),
      0 0 35px rgba(0,190,255,.12);
  }

  #N2DZ_TOP {
    position:absolute;
    left:0;
    right:0;
    top:0;
    height:45px;

    display:flex;
    align-items:center;

    padding:0 13px;

    background:#071923;

    border-bottom:1px solid #0a4358;

    z-index:10;

    cursor:move;
  }

  #N2DZ_TITLE {
    flex:1;
    color:#dff9ff;
    font-weight:bold;
    font-size:13px;
  }

  #N2DZ_TITLE span {
    color:#43bcd9;
    font-weight:normal;
  }

  .N2DZ_TOPBTN {
    width:30px;
    height:28px;

    display:flex;
    align-items:center;
    justify-content:center;

    border:0;
    border-radius:5px;

    color:#7897a2;
    background:transparent;

    cursor:pointer;
    font-size:15px;
  }

  .N2DZ_TOPBTN:hover {
    color:white;
    background:#104456;
  }

  #N2DZ_CLOSE:hover {
    background:#a93636;
  }

  #N2DZ_SIDE {
    position:absolute;
    left:0;
    top:45px;
    bottom:0;

    width:180px;

    padding:15px 10px;

    background:#061923;

    border-right:1px solid #0a4358;
  }

  #N2DZ_LOGOBOX {
    height:100px;

    display:flex;
    align-items:center;
    justify-content:center;
  }

  #N2DZ_LOGO {
    width:70px;
    height:70px;

    object-fit:cover;

    border-radius:50%;
    border:2px solid #00bddd;

    box-shadow:
      0 0 20px rgba(0,210,255,.25);
  }

  .N2DZ_NAV {
    width:100%;
    height:40px;

    display:flex;
    align-items:center;

    gap:10px;

    padding:0 12px;
    margin:4px 0;

    color:#70919d;
    background:transparent;

    border:0;
    border-radius:6px;

    text-align:left;

    cursor:pointer;
    font-weight:bold;
  }

  .N2DZ_NAV:hover {
    color:#eaffff;
    background:#0a3445;
  }

  .N2DZ_NAV.active {
    color:#fff;
    background:#0a4055;
    box-shadow:inset 3px 0 #00cfff;
  }

  #N2DZ_CONTENT {
    position:absolute;

    left:180px;
    right:0;
    top:45px;
    bottom:0;

    padding:18px 22px;

    overflow:auto;
  }

  #N2DZ_CONTENT::-webkit-scrollbar {
    width:5px;
  }

  #N2DZ_CONTENT::-webkit-scrollbar-thumb {
    background:#14566c;
    border-radius:10px;
  }

  .N2DZ_PAGE {
    display:none;
  }

  .N2DZ_PAGE.active {
    display:block;
  }

  .N2DZ_PAGE_TITLE {
    color:#e8fbff;
    font-size:23px;
    font-weight:bold;
  }

  .N2DZ_PAGE_SUB {
    color:#6093a2;
    font-size:10px;
    margin:4px 0 15px;
  }

  #N2DZ_STATUS {
    padding:10px;
    margin-bottom:12px;

    background:#061f2d;

    border:1px solid #0b4b61;
    border-radius:7px;
  }

  #N2DZ_STATUS_TITLE {
    color:#4bd3f2;
    font-size:9px;
    font-weight:bold;
    letter-spacing:1px;
    margin-bottom:7px;
  }

  #N2DZ_STATUS_GRID {
    display:grid;
    grid-template-columns:repeat(3,1fr);
    gap:6px;
  }

  .N2DZ_STAT {
    padding:6px;
    background:#041722;
    border-radius:5px;
  }

  .N2DZ_STAT small {
    display:block;
    color:#4b7c89;
    font-size:8px;
  }

  .N2DZ_STAT b {
    display:block;
    color:#d8f9ff;
    margin-top:2px;
    font-size:10px;
  }

  .N2DZ_FEATURE {
    min-height:55px;

    display:flex;
    align-items:center;

    padding:10px;

    margin:7px 0;

    background:#082532;

    border:1px solid #0b4052;
    border-radius:7px;
  }

  .N2DZ_FEATURE:hover {
    background:#0b3040;
    border-color:#11677e;
  }

  .N2DZ_TEXT {
    flex:1;
  }

  .N2DZ_NAME {
    color:#e9faff;
    font-weight:bold;
    font-size:12px;
  }

  .N2DZ_DESC {
    color:#57818d;
    font-size:9px;
    margin-top:3px;
  }

  .N2DZ_SWITCH {
    position:relative;

    width:43px;
    height:23px;

    border-radius:20px;

    background:#153541;

    border:1px solid #225363;

    cursor:pointer;
  }

  .N2DZ_SWITCH:after {
    content:"";

    position:absolute;

    left:2px;
    top:2px;

    width:17px;
    height:17px;

    border-radius:50%;

    background:#58727a;

    transition:.15s;
  }

  .N2DZ_SWITCH.on {
    background:#00a9d0;
    border-color:#29dcff;
  }

  .N2DZ_SWITCH.on:after {
    left:22px;
    background:#05202a;
  }

  .N2DZ_SLIDER {
    padding:11px;
    margin:7px 0;

    background:#082532;

    border:1px solid #0b4052;
    border-radius:7px;
  }

  .N2DZ_SLIDER_HEAD {
    display:flex;
    justify-content:space-between;

    color:#ccecf2;
    font-size:10px;

    margin-bottom:8px;
  }

  #N2DZ_CONTENT input[type=range] {
    width:100%;
    accent-color:#00cfff;
  }

  .N2DZ_SHOP {
    display:grid;
    grid-template-columns:repeat(2,1fr);
    gap:8px;
  }

  .N2DZ_ITEM {
    padding:13px;

    color:#d8f8ff;
    background:#082532;

    border:1px solid #0b4052;
    border-radius:7px;

    cursor:pointer;
  }

  .N2DZ_ITEM:hover {
    background:#0d3547;
  }

  #N2DZ_AVATAR {
    position:fixed;

    right:20px;
    top:20px;

    width:62px;
    height:62px;

    object-fit:cover;

    z-index:2147483647;

    border-radius:50%;
    border:3px solid #00d9ff;

    cursor:grab;
    user-select:none;

    box-shadow:
      0 0 12px #00cfff,
      0 0 28px rgba(0,210,255,.3);
  }

  #N2DZ_TOAST {
    position:fixed;

    right:20px;
    top:95px;

    min-width:290px;

    z-index:2147483647;

    padding:13px 16px;

    color:white;

    background:
      linear-gradient(
        135deg,
        #073448,
        #008ab4
      );

    border:1px solid #20dcff;
    border-radius:8px;

    font-family:Arial,sans-serif;

    box-shadow:
      0 10px 35px rgba(0,0,0,.6),
      0 0 20px rgba(0,210,255,.25);

    animation:N2DZ_IN .3s ease;
  }

  #N2DZ_TOAST b {
    display:block;
    font-size:13px;
  }

  #N2DZ_TOAST span {
    display:block;
    margin-top:4px;
    color:#9deafa;
    font-size:10px;
  }

  #N2DZ_FOV {
    position:fixed;

    left:50%;
    top:50%;

    transform:translate(-50%,-50%);

    width:250px;
    height:250px;

    border:1px solid rgba(0,220,255,.5);
    border-radius:50%;

    pointer-events:none;

    display:none;

    z-index:2147483645;
  }

  .N2DZ_TARGET {
    outline:3px solid #00eaff !important;
    outline-offset:4px !important;
  }

  .N2DZ_NO_EFFECTS,
  .N2DZ_NO_EFFECTS * {
    animation:none !important;
    transition:none !important;
    filter:none !important;
    box-shadow:none !important;
  }

  @keyframes N2DZ_IN {
    from {
      opacity:0;
      transform:translateX(30px);
    }

    to {
      opacity:1;
      transform:translateX(0);
    }
  }
  `;

  document.head.appendChild(css);

  /* =========================================================
     MENU HTML
     ========================================================= */

  const menu = document.createElement("div");

  menu.id = "N2DZ_MENU";

  menu.innerHTML = `
    <div id="N2DZ_TOP">

      <div id="N2DZ_TITLE">
        N2DZ HUB
        <span>• Cre: Nam2Dz</span>
      </div>

      <button
        class="N2DZ_TOPBTN"
        id="N2DZ_MIN"
      >−</button>

      <button
        class="N2DZ_TOPBTN"
        id="N2DZ_CLOSE"
      >×</button>

    </div>

    <div id="N2DZ_SIDE">

      <div id="N2DZ_LOGOBOX">
        <img
          id="N2DZ_LOGO"
          src="${AVATAR}"
        >
      </div>

      <button
        class="N2DZ_NAV active"
        data-page="combat"
      >
        ⚔️ Combat
      </button>

      <button
        class="N2DZ_NAV"
        data-page="farm"
      >
        🌾 Setting Farm
      </button>

      <button
        class="N2DZ_NAV"
        data-page="main"
      >
        🏠 Main
      </button>

      <button
        class="N2DZ_NAV"
        data-page="shop"
      >
        🛒 BSHOP
      </button>

      <button
        class="N2DZ_NAV"
        data-page="settings"
      >
        ⚙️ Settings
      </button>

    </div>

    <div id="N2DZ_CONTENT">

      <section
        class="N2DZ_PAGE active"
        id="page-combat"
      >

        <div class="N2DZ_PAGE_TITLE">
          Combat
        </div>

        <div class="N2DZ_PAGE_SUB">
          N2DZ HUB • Cre: Nam2Dz
        </div>

        <div id="N2DZ_STATUS">
          <div id="N2DZ_STATUS_TITLE">
            STATUS • LIVE
          </div>

          <div id="N2DZ_STATUS_GRID">

            <div class="N2DZ_STAT">
              <small>FPS</small>
              <b id="nFPS">--</b>
            </div>

            <div class="N2DZ_STAT">
              <small>PING</small>
              <b id="nPING">--</b>
            </div>

            <div class="N2DZ_STAT">
              <small>TIME</small>
              <b id="nUSED">00:00:00</b>
            </div>

            <div class="N2DZ_STAT">
              <small>DATE</small>
              <b id="nDATE">--</b>
            </div>

            <div class="N2DZ_STAT">
              <small>CLOCK</small>
              <b id="nCLOCK">--</b>
            </div>

            <div class="N2DZ_STAT">
              <small>REGION</small>
              <b id="nREGION">--</b>
            </div>

          </div>
        </div>

        ${feature(
          "nAura",
          "⚔️ Kill Aura",
          "Tự động chọn mục tiêu gần nhất"
        )}

        ${feature(
          "nAim",
          "🎯 Aim Bot",
          "Đánh dấu mục tiêu trong FOV"
        )}

        ${feature(
          "nLeft",
          "🖱️ Auto Click LEFT",
          "Tự động tấn công"
        )}

        ${feature(
          "nRight",
          "🖱️ Auto Click RIGHT",
          "Tự động sử dụng hành động phải"
        )}

      </section>

      <section
        class="N2DZ_PAGE"
        id="page-farm"
      >

        <div class="N2DZ_PAGE_TITLE">
          Setting Farm
        </div>

        <div class="N2DZ_PAGE_SUB">
          Farming settings
        </div>

        ${feature(
          "nLag",
          "⚡ Fix Lag",
          "Giảm animation và hiệu ứng"
        )}

        ${feature(
          "nEffects",
          "✨ Remove Effects",
          "Ẩn hiệu ứng trên màn hình"
        )}

        ${slider(
          "range",
          "⚔️ Range",
          "rangeValue",
          "150",
          30,
          500
        )}

        ${slider(
          "fov",
          "🎯 FOV",
          "fovValue",
          "250",
          50,
          600
        )}

      </section>

      <section
        class="N2DZ_PAGE"
        id="page-main"
      >

        <div class="N2DZ_PAGE_TITLE">
          Main
        </div>

        <div class="N2DZ_PAGE_SUB">
          Main settings
        </div>

        ${slider(
          "leftDelay",
          "🖱️ Left Delay",
          "leftValue",
          "100 ms",
          20,
          1000
        )}

        ${slider(
          "rightDelay",
          "🖱️ Right Delay",
          "rightValue",
          "150 ms",
          20,
          1000
        )}

        ${feature(
          "nMenu",
          "📱 Menu",
          "Ẩn / hiện menu"
        )}

      </section>

      <section
        class="N2DZ_PAGE"
        id="page-shop"
      >

        <div class="N2DZ_PAGE_TITLE">
          BSHOP
        </div>

        <div class="N2DZ_PAGE_SUB">
          Buy items
        </div>

        <div class="N2DZ_SHOP">

          ${item("sword","⚔️ Sword")}
          ${item("armor","🛡️ Armor")}
          ${item("block","🧱 Block")}
          ${item("potion","🧪 Potion")}

        </div>

      </section>

      <section
        class="N2DZ_PAGE"
        id="page-settings"
      >

        <div class="N2DZ_PAGE_TITLE">
          Settings
        </div>

        <div class="N2DZ_PAGE_SUB">
          N2DZ HUB • Cre: Nam2Dz
        </div>

        ${feature(
          "nReset",
          "🔄 Reset",
          "Đưa tất cả cài đặt về mặc định"
        )}

        ${feature(
          "nNewAccount",
          "👤 Tài khoản mới",
          "Xóa cookie phiên hiện tại và tải lại trang"
        )}

        <div
          id="N2DZ_MESSAGE"
          style="
            margin-top:12px;
            padding:10px;
            background:#061f2d;
            border:1px solid #0b4b61;
            border-radius:7px;
            color:#73d9ef;
            font-size:10px;
          "
        >
          🌊 N2DZ Ready.
        </div>

      </section>

    </div>
  `;

  function feature(id, name, desc) {
    return `
      <div class="N2DZ_FEATURE">

        <div class="N2DZ_TEXT">

          <div class="N2DZ_NAME">
            ${name}
          </div>

          <div class="N2DZ_DESC">
            ${desc}
          </div>

        </div>

        <div
          class="N2DZ_SWITCH"
          id="${id}"
        ></div>

      </div>
    `;
  }

  function slider(
    id,
    name,
    valueId,
    value,
    min,
    max
  ) {
    return `
      <div class="N2DZ_SLIDER">

        <div class="N2DZ_SLIDER_HEAD">

          <span>${name}</span>

          <b id="${valueId}">
            ${value}
          </b>

        </div>

        <input
          id="${id}"
          type="range"
          min="${min}"
          max="${max}"
          value="${parseInt(value)}"
        >

      </div>
    `;
  }

  function item(id, name) {
    return `
      <button
        class="N2DZ_ITEM"
        data-item="${id}"
      >
        ${name}
      </button>
    `;
  }

  document.body.appendChild(menu);

  /* =========================================================
     AVATAR
     ========================================================= */

  const avatar =
    document.createElement("img");

  avatar.id = "N2DZ_AVATAR";
  avatar.src = AVATAR;
  avatar.title =
    "Click: Menu • Kéo: Di chuyển";

  document.body.appendChild(avatar);

  /* =========================================================
     TOAST
     ========================================================= */

  const toast =
    document.createElement("div");

  toast.id = "N2DZ_TOAST";

  toast.innerHTML = `
    <b>🌊 N2DZ HUB ĐÃ ĐƯỢC BẬT</b>
    <span>
      Chúc anh em chơi vui vẻ • Cre: Nam2Dz
    </span>
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    if (!toast.isConnected) return;

    toast.style.transition =
      ".4s ease";

    toast.style.opacity = "0";

    setTimeout(
      () => toast.remove(),
      450
    );
  }, 3500);

  /* =========================================================
     HELPER
     ========================================================= */

  const $ = id =>
    document.getElementById(id);

  function message(text) {
    if ($("N2DZ_MESSAGE")) {
      $("N2DZ_MESSAGE").textContent =
        text;
    }
  }

  function toggle(id, on) {
    const el = $(id);

    if (el) {
      el.classList.toggle(
        "on",
        on
      );
    }
  }

  /* =========================================================
     NAVIGATION
     ========================================================= */

  document
    .querySelectorAll(".N2DZ_NAV")
    .forEach(btn => {

      btn.onclick = () => {

        document
          .querySelectorAll(".N2DZ_NAV")
          .forEach(x =>
            x.classList.remove("active")
          );

        document
          .querySelectorAll(".N2DZ_PAGE")
          .forEach(x =>
            x.classList.remove("active")
          );

        btn.classList.add("active");

        const page =
          $("page-" + btn.dataset.page);

        if (page) {
          page.classList.add("active");
        }
      };

    });

  /* =========================================================
     TARGET
     ========================================================= */

  function center(el) {
    const r =
      el.getBoundingClientRect();

    return {
      x:r.left + r.width / 2,
      y:r.top + r.height / 2
    };
  }

  function dist(a,b) {
    return Math.hypot(
      a.x-b.x,
      a.y-b.y
    );
  }

  function closest(checkFov) {

    const player =
      GAME.player();

    if (!player)
      return null;

    const pc =
      center(player);

    const screen = {
      x:innerWidth/2,
      y:innerHeight/2
    };

    let best = null;
    let scoreBest = Infinity;

    for (
      const target of
      GAME.targets()
    ) {

      if (
        target === player ||
        !target.isConnected
      )
        continue;

      const tc =
        center(target);

      const d =
        dist(pc,tc);

      if (
        d >
        cfg.range
      )
        continue;

      if (checkFov) {

        const f =
          dist(screen,tc);

        if (
          f >
          cfg.fov
        )
          continue;
      }

      const score =
        checkFov
          ? dist(screen,tc)
          : d;

      if (
        score <
        scoreBest
      ) {

        scoreBest = score;
        best = target;

      }
    }

    return best;
  }

  /* =========================================================
     KILL AURA
     ========================================================= */

  function auraLoop() {

    if (!state.aura)
      return;

    const target =
      closest(false);

    if (target)
      GAME.attack(target);
  }

  $("nAura").onclick = () => {

    state.aura =
      !state.aura;

    toggle(
      "nAura",
      state.aura
    );

    message(
      state.aura
        ? "⚔️ Kill Aura ON"
        : "⚔️ Kill Aura OFF"
    );
  };

  /* =========================================================
     AIM
     ========================================================= */

  const fov =
    document.createElement("div");

  fov.id = "N2DZ_FOV";

  document.body.appendChild(fov);

  function aimLoop() {

    GAME.targets()
      .forEach(x =>
        x.classList.remove(
          "N2DZ_TARGET"
        )
      );

    if (!state.aim)
      return;

    const target =
      closest(true);

    if (target) {
      target.classList.add(
        "N2DZ_TARGET"
      );
    }
  }

  $("nAim").onclick = () => {

    state.aim =
      !state.aim;

    toggle(
      "nAim",
      state.aim
    );

    fov.style.display =
      state.aim
        ? "block"
        : "none";
  };

  /* =========================================================
     LEFT
     ========================================================= */

  function stopLeft() {

    if (
      leftTimer !== null
    ) {

      clearInterval(
        leftTimer
      );

      leftTimer = null;
    }
  }

  function startLeft() {

    stopLeft();

    const attack = () => {

      if (!state.left)
        return;

      const target =
        closest(false);

      if (target)
        GAME.attack(target);
    };

    attack();

    leftTimer =
      setInterval(
        attack,
        cfg.leftDelay
      );
  }

  $("nLeft").onclick = () => {

    state.left =
      !state.left;

    toggle(
      "nLeft",
      state.left
    );

    if (state.left)
      startLeft();
    else
      stopLeft();
  };

  /* =========================================================
     RIGHT
     ========================================================= */

  function stopRight() {

    if (
      rightTimer !== null
    ) {

      clearInterval(
        rightTimer
      );

      rightTimer = null;
    }
  }

  function startRight() {

    stopRight();

    GAME.right();

    rightTimer =
      setInterval(
        () => {

          if (
            state.right
          ) {
            GAME.right();
          }

        },
        cfg.rightDelay
      );
  }

  $("nRight").onclick = () => {

    state.right =
      !state.right;

    toggle(
      "nRight",
      state.right
    );

    if (state.right)
      startRight();
    else
      stopRight();
  };

  /* =========================================================
     EFFECTS
     ========================================================= */

  const effects = [
    ".particle",
    ".particles",
    ".particle-system",
    ".particleSystem",
    ".effect",
    ".effects",
    ".vfx",
    ".VFX",
    ".smoke",
    ".fire",
    ".spark",
    ".sparks",
    ".post-processing",
    ".postprocess",
    ".screen-effect",
    ".screen-effects"
  ];

  function removeEffects() {

    hidden = [];

    document
      .querySelectorAll(
        effects.join(",")
      )
      .forEach(el => {

        if (
          menu.contains(el) ||
          el === avatar
        )
          return;

        hidden.push({
          el,
          display:
            el.style.display
        });

        el.style.display =
          "none";

      });

    document.documentElement
      .classList.add(
        "N2DZ_NO_EFFECTS"
      );
  }

  function restoreEffects() {

    hidden.forEach(x => {

      if (
        x.el &&
        x.el.isConnected
      ) {

        x.el.style.display =
          x.display;
      }

    });

    hidden = [];

    document.documentElement
      .classList.remove(
        "N2DZ_NO_EFFECTS"
      );
  }

  $("nEffects").onclick = () => {

    state.effects =
      !state.effects;

    toggle(
      "nEffects",
      state.effects
    );

    if (state.effects) {

      removeEffects();

      message(
        "✨ Effects removed"
      );

    } else {

      if (!state.lag)
        restoreEffects();

      message(
        "✨ Effects restored"
      );
    }
  };

  /* =========================================================
     FIX LAG
     ========================================================= */

  $("nLag").onclick = () => {

    state.lag =
      !state.lag;

    toggle(
      "nLag",
      state.lag
    );

    if (state.lag) {

      document.documentElement
        .classList.add(
          "N2DZ_NO_EFFECTS"
        );

      removeEffects();

      message(
        "⚡ Fix Lag ON"
      );

    } else {

      document.documentElement
        .classList.remove(
          "N2DZ_NO_EFFECTS"
        );

      if (!state.effects)
        restoreEffects();

      message(
        "⚡ Fix Lag OFF"
      );
    }
  };

  /* =========================================================
     SLIDERS
     ========================================================= */

  $("range").oninput =
    e => {

      cfg.range =
        Number(e.target.value);

      $("rangeValue")
        .textContent =
        cfg.range;
    };

  $("fov").oninput =
    e => {

      cfg.fov =
        Number(e.target.value);

      $("fovValue")
        .textContent =
        cfg.fov;

      fov.style.width =
        cfg.fov + "px";

      fov.style.height =
        cfg.fov + "px";
    };

  $("leftDelay").oninput =
    e => {

      cfg.leftDelay =
        Number(e.target.value);

      $("leftValue")
        .textContent =
        cfg.leftDelay + " ms";

      if (state.left)
        startLeft();
    };

  $("rightDelay").oninput =
    e => {

      cfg.rightDelay =
        Number(e.target.value);

      $("rightValue")
        .textContent =
        cfg.rightDelay + " ms";

      if (state.right)
        startRight();
    };

  /* =========================================================
     SHOP
     ========================================================= */

  document
    .querySelectorAll(
      ".N2DZ_ITEM"
    )
    .forEach(btn => {

      btn.onclick = () => {

        const item =
          btn.dataset.item;

        window.dispatchEvent(
          new CustomEvent(
            "n2dz-buy",
            {
              detail:{
                item,
                source:"N2DZ"
              }
            }
          )
        );

        message(
          "🛒 BSHOP: " + item
        );
      };

    });

  /* =========================================================
     MENU
     ========================================================= */

  function setMenu(on) {

    state.menu = on;

    menu.style.display =
      on
        ? "flex"
        : "none";

    toggle(
      "nMenu",
      on
    );
  }

  $("nMenu").onclick = () => {
    setMenu(!state.menu);
  };

  $("N2DZ_MIN").onclick = () => {
    setMenu(false);
  };

  $("N2DZ_CLOSE").onclick = () => {
    if (
      window.N2DZ_LOCAL
    ) {
      window.N2DZ_LOCAL.destroy();
    }
  };

  /* =========================================================
     F2
     ========================================================= */

  function keydown(e) {

    if (
      e.key === "F2"
    ) {

      setMenu(
        !state.menu
      );
    }
  }

  window.addEventListener(
    "keydown",
    keydown
  );

  /* =========================================================
     DRAG MENU
     ========================================================= */

  let drag = false;
  let dx = 0;
  let dy = 0;

  $("N2DZ_TOP")
    .addEventListener(
      "mousedown",
      e => {

        if (
          e.target.closest(
            ".N2DZ_TOPBTN"
          )
        )
          return;

        drag = true;

        const r =
          menu.getBoundingClientRect();

        dx =
          e.clientX-r.left;

        dy =
          e.clientY-r.top;

        menu.style.transform =
          "none";
      }
    );

  window.addEventListener(
    "mousemove",
    e => {

      if (!drag)
        return;

      menu.style.left =
        e.clientX-dx+"px";

      menu.style.top =
        e.clientY-dy+"px";
    }
  );

  window.addEventListener(
    "mouseup",
    () => {
      drag = false;
    }
  );

  /* =========================================================
     DRAG AVATAR
     ========================================================= */

  let avatarDrag = false;
  let avatarMove = false;
  let ax = 0;
  let ay = 0;

  avatar.addEventListener(
    "mousedown",
    e => {

      avatarDrag = true;
      avatarMove = false;

      const r =
        avatar.getBoundingClientRect();

      ax =
        e.clientX-r.left;

      ay =
        e.clientY-r.top;

      e.preventDefault();
    }
  );

  window.addEventListener(
    "mousemove",
    e => {

      if (!avatarDrag)
        return;

      avatarMove = true;

      avatar.style.left =
        e.clientX-ax+"px";

      avatar.style.top =
        e.clientY-ay+"px";

      avatar.style.right =
        "auto";
    }
  );

  window.addEventListener(
    "mouseup",
    () => {
      avatarDrag = false;
    }
  );

  avatar.addEventListener(
    "click",
    () => {

      if (avatarMove) {
        avatarMove = false;
        return;
      }

      setMenu(
        !state.menu
      );
    }
  );

  /* =========================================================
     FPS
     ========================================================= */

  let frames = 0;
  let fpsTime = performance.now();

  function fpsLoop(now) {

    frames++;

    if (
      now-fpsTime >= 1000
    ) {

      $("nFPS").textContent =
        frames;

      frames = 0;
      fpsTime = now;
    }

    if (running)
      requestAnimationFrame(
        fpsLoop
      );
  }

  requestAnimationFrame(
    fpsLoop
  );

  /* =========================================================
     DATE / TIME / REGION
     ========================================================= */

  function updateInfo() {

    const now =
      new Date();

    $("nDATE").textContent =
      now.toLocaleDateString(
        "vi-VN"
      );

    $("nCLOCK").textContent =
      now.toLocaleTimeString(
        "vi-VN"
      );

    const seconds =
      Math.floor(
        (Date.now()-startTime)/1000
      );

    const h =
      String(
        Math.floor(seconds/3600)
      ).padStart(2,"0");

    const m =
      String(
        Math.floor(
          seconds%3600/60
        )
      ).padStart(2,"0");

    const s =
      String(
        seconds%60
      ).padStart(2,"0");

    $("nUSED").textContent =
      `${h}:${m}:${s}`;

    const zone =
      Intl.DateTimeFormat()
        .resolvedOptions()
        .timeZone ||
        "Unknown";

    $("nREGION").textContent =
      zone;
  }

  updateInfo();

  infoTimer =
    setInterval(
      updateInfo,
      1000
    );

  /* =========================================================
     PING
     ========================================================= */

  async function ping() {

    try {

      const t =
        performance.now();

      await fetch(
        location.href,
        {
          method:"HEAD",
          cache:"no-store"
        }
      );

      $("nPING").textContent =
        Math.round(
          performance.now()-t
        )+" ms";

    } catch {

      $("nPING").textContent =
        "N/A";
    }
  }

  ping();

  pingTimer =
    setInterval(
      ping,
      5000
    );

  /* =========================================================
     RESET
     ========================================================= */

  $("nReset").onclick =
    () => {

      state.aura = false;
      state.aim = false;
      state.left = false;
      state.right = false;
      state.lag = false;
      state.effects = false;

      stopLeft();
      stopRight();

      restoreEffects();

      [
        "nAura",
        "nAim",
        "nLeft",
        "nRight",
        "nLag",
        "nEffects"
      ].forEach(
        id => toggle(id,false)
      );

      fov.style.display =
        "none";

      GAME.targets()
        .forEach(
          x =>
            x.classList.remove(
              "N2DZ_TARGET"
            )
        );

      cfg.range = 150;
      cfg.fov = 250;
      cfg.leftDelay = 100;
      cfg.rightDelay = 150;

      $("range").value = 150;
      $("fov").value = 250;
      $("leftDelay").value = 100;
      $("rightDelay").value = 150;

      $("rangeValue")
        .textContent = "150";

      $("fovValue")
        .textContent = "250";

      $("leftValue")
        .textContent = "100 ms";

      $("rightValue")
        .textContent = "150 ms";

      message(
        "🔄 Reset complete."
      );
    };

  /* =========================================================
     TÀI KHOẢN MỚI
     ========================================================= */

  $("nNewAccount").onclick = () => {

    if (!confirm(
      "Bạn có chắc chắn muốn đặt lại phiên làm việc và tạo tài khoản mới không?"
    )) {
      return;
    }

    const cookies = document.cookie.split(";");

    for (let i = 0; i < cookies.length; i++) {

      const cookie = cookies[i].trim();
      const eqPos = cookie.indexOf("=");

      const name =
        eqPos > -1
          ? cookie.substring(0, eqPos)
          : cookie;

      document.cookie =
        name +
        "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    }

    message("👤 Đang đặt lại phiên và tải lại...");

    setTimeout(() => {
      location.reload();
    }, 150);
  };

  /* =========================================================
     MAIN LOOP
     ========================================================= */

  function loop() {

    if (!running)
      return;

    auraLoop();
    aimLoop();

    requestAnimationFrame(
      loop
    );
  }

  loop();

  /* =========================================================
     CLEANUP
     ========================================================= */

  window.N2DZ_LOCAL = {

    state,
    cfg,
    GAME,

    destroy() {

      running = false;

      stopLeft();
      stopRight();

      clearInterval(
        infoTimer
      );

      clearInterval(
        pingTimer
      );

      restoreEffects();

      window.removeEventListener(
        "keydown",
        keydown
      );

      GAME.targets()
        .forEach(
          x =>
            x.classList.remove(
              "N2DZ_TARGET"
            )
        );

      css.remove();
      menu.remove();
      avatar.remove();
      fov.remove();

      if (
        toast &&
        toast.isConnected
      ) {
        toast.remove();
      }

      console.log(
        "[N2DZ] Destroyed"
      );
    }
  };

  console.log(
    "%c[N2DZ HUB ĐÃ ĐƯỢC BẬT - Cre: Nam2Dz]",
    "color:#00d9ff;font-size:16px;font-weight:bold"
  );

  /* =========================================================
     N2DZ HUB READY
     ========================================================= */

  message(
    "🌊 N2DZ HUB Ready • Cre: Nam2Dz"
  );

  function stopLeft() {
    if (leftTimer !== null) {
      clearInterval(leftTimer);
      leftTimer = null;
    }
  }

  function stopRight() {
    if (rightTimer !== null) {
      clearInterval(rightTimer);
      rightTimer = null;
    }
  }

})();

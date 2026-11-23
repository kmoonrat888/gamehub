// ======================================================================
//  ระบบอันดับคะแนนสูงสุด (Supabase) — ใช้ร่วมกันทุกเกม
//  ใช้คู่กับ supabase-config.js (ไฟล์นี้ vite.config.js สร้างจาก env ตอน build) และ auth.js:
//    <script src="supabase-config.js"></script>
//    <script src="auth.js"></script>
//    <script src="leaderboard.js"></script>
//
//  Leaderboard.show(กล่อง, {
//    game:    "math-fun",          // รหัสเกม (ตรงกับ id ในเว็บรวมเกม)
//    board:   "บวก · ง่าย · ปกติ",  // ตารางย่อย แยกตามโหมด/ระดับ ให้แข่งกันอย่างยุติธรรม
//    score:   8,                   // คะแนน (มากกว่า = ดีกว่า)
//    timeMs:  45000,               // เวลาที่ใช้ (น้อยกว่า = ดีกว่า ใช้ตัดสินเมื่อคะแนนเท่ากัน) ไม่มีใส่ null
//    detail:  "ถูก 8/10 · 0:45",   // ข้อความที่แสดงในตาราง
//    session: "...",               // (ไม่บังคับ) กันบันทึกซ้ำเมื่อเปิดหน้าผลเดิมอีกครั้ง
//    name:    "...",               // (ไม่บังคับ) ชื่อตั้งต้นสำหรับผู้เล่นที่ไม่ได้ Log in
//  })
//
//  Log in อยู่ → บันทึกในบัญชีด้วยชื่อเล่นของบัญชี · ไม่ได้ Log in → พิมพ์ชื่อเล่นเอง
// ======================================================================
(function () {
  const TABLE = "scores";
  const TOP = 10;
  const NAME_KEY = "gamehub-nickname";
  const SAVED_KEY = "gamehub-saved-scores";
  const MEDALS = ["🥇", "🥈", "🥉"];
  const LOGIN_URL = "../#/login?from=game";

  const auth = () => window.GameHubAuth || null;
  const currentUser = () => (auth() ? auth().getUser() : null);

  const config = () => {
    const c = window.SUPABASE_CONFIG || {};
    return c.url && c.publishableKey ? { url: c.url.replace(/\/+$/, ""), key: c.publishableKey } : null;
  };

  const nameKey = (name) => String(name || "").trim().toLowerCase();
  const playerKey = (r) => (r.user_id ? `u:${r.user_id}` : `n:${nameKey(r.player_name)}`);

  // คนเดียวกันเล่นหลายรอบ แสดงเฉพาะคะแนนที่ดีที่สุดของคนนั้น (บัญชีเดียวกัน หรือชื่อเดียวกัน)
  function bestPerPlayer(rows, limit) {
    const seen = new Set();
    const out = [];
    for (const r of rows) {
      const k = playerKey(r);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(r);
      if (out.length >= limit) break;
    }
    return out;
  }

  async function fetchTop(game, board, limit = TOP) {
    const cfg = config();
    if (!cfg) throw new Error("not-configured");
    const q = new URLSearchParams({
      select: "id,player_name,score,time_ms,detail,created_at,user_id",
      game_id: `eq.${game}`,
      board: `eq.${board}`,
      order: "score.desc,time_ms.asc.nullslast,created_at.asc",
      limit: "200",
    });
    const res = await fetch(`${cfg.url}/rest/v1/${TABLE}?${q}`, { headers: { apikey: cfg.key } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return bestPerPlayer(await res.json(), limit);
  }

  // บันทึกคะแนน (Log in อยู่ → ผูกกับบัญชีอัตโนมัติ)
  async function submit(entry) {
    if (!config()) throw new Error("not-configured");
    const opts = { method: "POST", body: entry, headers: { Prefer: "return=minimal" } };
    if (auth()) return auth().rest(TABLE, opts);
    const cfg = config();
    const res = await fetch(`${cfg.url}/rest/v1/${TABLE}`, {
      method: "POST",
      headers: { apikey: cfg.key, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(entry),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      const err = new Error(`HTTP ${res.status}`);
      err.code = d.message === "name_taken" ? "name_taken" : "";
      throw err;
    }
  }

  // ---------- จำชื่อเล่น / รอบที่บันทึกแล้ว ----------
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
    },
  };
  const savedSessions = () => store.get(SAVED_KEY, []);
  function markSaved(session) {
    store.set(SAVED_KEY, [session, ...savedSessions().filter((s) => s !== session)].slice(0, 60));
  }

  // ---------- หน้าตา ----------
  const CSS = `
  .lb { margin: 16px auto 4px; max-width: 460px; width: 100%; box-sizing: border-box; text-align: left;
    background: #fff; color: #2b2b3c; border-radius: 20px; padding: 14px 14px 12px;
    box-shadow: 0 6px 20px rgba(40, 40, 90, .14); border: 3px solid #ffd76a; font-size: 16px; }
  .lb * { box-sizing: border-box; }
  .lb-head { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
  .lb-title { font-size: 19px; font-weight: 800; }
  .lb-board { font-size: 13px; color: #7a7a90; }
  .lb-form { display: flex; gap: 8px; margin-bottom: 6px; }
  .lb-form input { flex: 1; min-width: 0; font: inherit; font-size: 17px; padding: 10px 12px; border-radius: 14px;
    border: 2px solid #c9c9e6; outline: none; background: #fbfbff; color: inherit; }
  .lb-form input:focus { border-color: #4d8dff; }
  .lb-form button, .lb-retry { font: inherit; font-weight: 800; font-size: 16px; border: none; border-radius: 14px;
    padding: 10px 14px; cursor: pointer; background: linear-gradient(180deg, #ffb347, #ff7a59); color: #fff;
    box-shadow: 0 3px 0 #d9573a; white-space: nowrap; }
  .lb-form button:disabled { opacity: .6; cursor: default; }
  .lb-account { flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 14px;
    background: #eef9f2; border: 2px solid #b9e6c9; font-weight: 700; }
  .lb-account span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .lb-msg { min-height: 20px; font-size: 14px; color: #5a5a72; margin-bottom: 4px; }
  .lb-msg.good { color: #1f9a5c; font-weight: 700; }
  .lb-msg.bad { color: #d6334a; }
  .lb-login { font-size: 14px; color: #5a5a72; margin: -2px 0 6px; }
  .lb-login a { color: #3b6fe0; font-weight: 800; }
  .lb-list { list-style: none; margin: 0; padding: 0; }
  .lb-row { display: grid; grid-template-columns: 34px 1fr auto; align-items: center; gap: 8px;
    padding: 7px 8px; border-radius: 12px; }
  .lb-row:nth-child(odd) { background: #f5f6ff; }
  .lb-row.me { background: #fff1c2; outline: 2px solid #ffc93c; }
  .lb-no { text-align: center; font-weight: 800; color: #7a7a90; font-size: 15px; }
  .lb-no.medal { font-size: 22px; }
  .lb-name { font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .lb-check { color: #1f9a5c; font-size: 13px; margin-left: 4px; }
  .lb-detail { font-size: 14px; color: #4a4a62; text-align: right; white-space: nowrap; }
  .lb-empty { text-align: center; color: #7a7a90; padding: 10px 0 4px; font-size: 15px; }
  .lb-retry { display: block; margin: 6px auto 0; padding: 6px 14px; font-size: 14px; }
  @media (max-width: 420px) { .lb { padding: 12px 10px 10px; } .lb-detail { font-size: 13px; } }
  `;

  function injectCss() {
    if (document.getElementById("lb-css")) return;
    const s = document.createElement("style");
    s.id = "lb-css";
    s.textContent = CSS;
    document.head.append(s);
  }

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // แถวไหนเป็นของเรา: บัญชีเดียวกัน หรือ (ไม่ได้ Log in) ชื่อเดียวกัน
  function isMine(r, me) {
    if (me.userId) return r.user_id === me.userId;
    return !!me.name && !r.user_id && nameKey(r.player_name) === nameKey(me.name);
  }

  function renderRows(list, rows, me) {
    list.innerHTML = "";
    if (!rows.length) {
      list.append(el("li", "lb-empty", "ยังไม่มีใครบันทึกคะแนน มาเป็นคนแรกกัน! 🌟"));
      return;
    }
    rows.forEach((r, i) => {
      const li = el("li", "lb-row" + (isMine(r, me) ? " me" : ""));
      const name = el("span", "lb-name", r.player_name);
      if (r.user_id) {
        const check = el("span", "lb-check", "✔");
        check.title = "สมาชิก";
        name.append(check);
      }
      li.append(el("span", "lb-no" + (i < 3 ? " medal" : ""), i < 3 ? MEDALS[i] : String(i + 1)), name, el("span", "lb-detail", r.detail || String(r.score)));
      list.append(li);
    });
  }

  function show(container, opts) {
    if (!container) return;
    if (container._lbOff) container._lbOff();
    container.innerHTML = "";
    // ยังไม่ได้ตั้งค่า Supabase: ไม่แสดงอะไรในเกม (เด็กไม่ต้องเห็นข้อความเทคนิค)
    if (!config()) return console.info("Leaderboard: ยังไม่ได้ตั้งค่า env ของ Supabase");
    injectCss();
    const box = el("div", "lb");
    const head = el("div", "lb-head");
    head.append(el("span", "lb-title", "🏆 อันดับคะแนนสูงสุด"));
    if (opts.board) head.append(el("span", "lb-board", opts.board));
    box.append(head);
    container.append(box);

    const session = opts.session || `${opts.game}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const formArea = el("div");
    const msg = el("div", "lb-msg");
    const list = el("ol", "lb-list");
    box.append(formArea, msg, list);

    const guestName = () => (opts.name || store.get(NAME_KEY, "") || "").slice(0, 20);
    const me = () => {
      const u = currentUser();
      return u ? { userId: u.id, name: u.displayName } : { userId: null, name: guestName() };
    };
    let rows = [];
    let saving = false;

    const setMsg = (text, cls) => {
      msg.className = "lb-msg" + (cls ? " " + cls : "");
      msg.textContent = text;
    };

    async function save(name, controls) {
      saving = true;
      controls.forEach((c) => (c.disabled = true));
      setMsg("กำลังบันทึก...");
      const user = currentUser();
      try {
        await submit({
          game_id: opts.game,
          board: opts.board || "",
          player_name: user ? user.displayName || name : name,
          score: Math.max(0, Math.round(opts.score || 0)),
          time_ms: opts.timeMs == null ? null : Math.max(0, Math.round(opts.timeMs)),
          detail: (opts.detail || "").slice(0, 120),
        });
        markSaved(session);
        if (!user) store.set(NAME_KEY, name);
        saving = false;
        formArea.innerHTML = "";
        rows = await fetchTop(opts.game, opts.board || "");
        const rank = rows.findIndex((r) => isMine(r, me()));
        const shown = user ? user.displayName || name : name;
        setMsg(rank >= 0 ? `บันทึกแล้ว! ${shown} อยู่อันดับที่ ${rank + 1} 🎉` : "บันทึกแล้ว! ยังไม่ติด 10 อันดับ ลองใหม่นะ 💪", "good");
        renderRows(list, rows, me());
      } catch (err) {
        saving = false;
        if (savedSessions().includes(session)) {
          // บันทึกสำเร็จแล้ว แค่โหลดตารางใหม่ไม่ได้
          formArea.innerHTML = "";
          setMsg("บันทึกแล้ว ✅ (โหลดตารางไม่ได้ ลองใหม่ภายหลัง)", "good");
          return;
        }
        controls.forEach((c) => (c.disabled = false));
        if (user && !currentUser()) setMsg("หมดเวลาการเข้าสู่ระบบ ลองเข้าสู่ระบบใหม่", "bad");
        else if (err.code === "name_taken") setMsg(`ชื่อ "${name}" มีเจ้าของบัญชีแล้ว ลองชื่ออื่น หรือเข้าสู่ระบบ`, "bad");
        else if (err.code === "session_expired" || err.status === 401) setMsg("หมดเวลาการเข้าสู่ระบบ ลองเข้าสู่ระบบใหม่", "bad");
        else setMsg("บันทึกไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง", "bad");
        renderForm(true);
      }
    }

    // ฟอร์มบันทึก: เปลี่ยนตามสถานะ Log in (เข้าสู่ระบบจากแท็บอื่นแล้วกล่องนี้เปลี่ยนเอง)
    function renderForm(keepMsg) {
      formArea.innerHTML = "";
      const canSave = opts.score > 0 || opts.timeMs != null;
      if (!canSave) return setMsg("ทำคะแนนให้ได้อย่างน้อย 1 คะแนน เพื่อบันทึกอันดับ");
      if (savedSessions().includes(session)) return keepMsg || setMsg("บันทึกคะแนนรอบนี้แล้ว ✅");

      const user = currentUser();
      const form = el("form", "lb-form");
      const btn = el("button", "", "💾 บันทึก");
      btn.type = "submit";
      if (user) {
        const acc = el("div", "lb-account");
        acc.append("👤", el("span", "", user.displayName || user.email));
        form.append(acc, btn);
        formArea.append(form);
        if (!keepMsg) setMsg("บันทึกคะแนนนี้ไว้ในบัญชีของคุณ");
        form.addEventListener("submit", (e) => {
          e.preventDefault();
          if (!saving) save(user.displayName || "", [btn]);
        });
      } else {
        const input = el("input");
        input.maxLength = 20;
        input.placeholder = "พิมพ์ชื่อเล่น";
        input.value = guestName();
        input.setAttribute("aria-label", "ชื่อเล่น");
        form.append(input, btn);
        formArea.append(form);
        if (auth() && auth().configured()) {
          const login = el("div", "lb-login");
          const a = el("a", "", "🔑 เข้าสู่ระบบ");
          a.href = LOGIN_URL;
          a.target = "_blank";
          login.append("มีบัญชีแล้ว? ", a, " เพื่อเก็บคะแนนไว้ในบัญชี");
          formArea.append(login);
        }
        if (!keepMsg) setMsg("พิมพ์ชื่อเล่นแล้วกดบันทึก เพื่อขึ้นตารางอันดับ");
        form.addEventListener("submit", (e) => {
          e.preventDefault();
          if (saving) return;
          const name = input.value.replace(/\s+/g, " ").trim().slice(0, 20);
          if (!name) {
            setMsg("พิมพ์ชื่อเล่นก่อนนะ ✏️", "bad");
            input.focus();
            return;
          }
          save(name, [btn, input]);
        });
      }
    }

    renderForm();

    if (auth()) {
      // ต่ออายุ token ก็แจ้งเปลี่ยน · วาดใหม่เฉพาะเมื่อเปลี่ยนคนหรือเปลี่ยนชื่อ
      let shownAs = JSON.stringify(me());
      container._lbOff = auth().onChange(() => {
        const now = JSON.stringify(me());
        if (now === shownAs) return;
        shownAs = now;
        if (!saving) renderForm();
        renderRows(list, rows, me());
      });
    }

    const load = () => {
      list.innerHTML = "";
      list.append(el("li", "lb-empty", "กำลังโหลดอันดับ..."));
      fetchTop(opts.game, opts.board || "")
        .then((r) => {
          rows = r;
          renderRows(list, rows, me());
        })
        .catch(() => {
          list.innerHTML = "";
          const li = el("li", "lb-empty", "โหลดอันดับไม่ได้ (ไม่มีอินเทอร์เน็ต?)");
          const retry = el("button", "lb-retry", "🔄 ลองใหม่");
          retry.type = "button";
          retry.addEventListener("click", load);
          li.append(retry);
          list.append(li);
        });
    };
    load();
  }

  // แปลงมิลลิวินาทีเป็น ม:วว
  function fmtTime(ms) {
    const s = Math.max(0, Math.round(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  window.Leaderboard = { show, fetchTop, submit, fmtTime };
})();

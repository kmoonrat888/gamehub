// ======================================================================
//  บัญชีผู้เล่น (Supabase Auth: อีเมล + รหัสผ่าน) — ใช้ร่วมกันทั้งเว็บรวมเกมและทุกเกม
//  ใช้คู่กับ supabase-config.js:
//    <script src="supabase-config.js"></script>
//    <script src="auth.js"></script>
//
//  เก็บ session ไว้ใน localStorage ที่เดียว ("gamehub-auth") หน้าเว็บกับเกมใน iframe
//  จึงเห็นสถานะ Log in ตรงกัน และต่ออายุ token ให้อัตโนมัติ
// ======================================================================
(function () {
  if (window.GameHubAuth) return;

  const KEY = "gamehub-auth";
  const REFRESH_EARLY_MS = 60 * 1000;

  const config = () => {
    const c = window.SUPABASE_CONFIG || {};
    return c.url && c.publishableKey ? { url: c.url.replace(/\/+$/, ""), key: c.publishableKey } : null;
  };

  // ---------- ข้อผิดพลาด → ข้อความภาษาไทย ----------
  const MESSAGES = {
    invalid_credentials: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
    invalid_grant: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
    user_already_exists: "อีเมลนี้สมัครไว้แล้ว ลองเข้าสู่ระบบแทน",
    email_exists: "อีเมลนี้สมัครไว้แล้ว ลองเข้าสู่ระบบแทน",
    weak_password: "รหัสผ่านง่ายเกินไป ใช้อย่างน้อย 6 ตัว",
    same_password: "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม",
    email_address_invalid: "รูปแบบอีเมลไม่ถูกต้อง",
    validation_failed: "กรอกข้อมูลไม่ครบหรือรูปแบบไม่ถูกต้อง",
    email_not_confirmed: "บัญชีนี้ยังไม่ได้ยืนยันอีเมล",
    email_address_not_authorized: "ระบบยังเปิดการยืนยันอีเมลอยู่ ผู้ดูแลเว็บต้องปิด Confirm email ใน Supabase ก่อน",
    over_email_send_rate_limit: "ระบบยังเปิดการยืนยันอีเมลอยู่ ผู้ดูแลเว็บต้องปิด Confirm email ใน Supabase ก่อน",
    signup_disabled: "ตอนนี้ปิดรับสมัครสมาชิกอยู่",
    email_provider_disabled: "ตอนนี้ปิดการเข้าสู่ระบบด้วยอีเมลอยู่",
    over_request_rate_limit: "ลองบ่อยเกินไป รอสักครู่แล้วลองใหม่",
    reauthentication_needed: "ต้องยืนยันตัวตนก่อนเปลี่ยนรหัสผ่าน ลองออกจากระบบแล้วเข้าใหม่",
    session_expired: "หมดเวลาการเข้าสู่ระบบ กรุณาเข้าสู่ระบบใหม่",
    name_taken: "ชื่อเล่นนี้มีคนใช้แล้ว ลองชื่ออื่นนะ",
    not_configured: "ยังไม่ได้เชื่อมต่อ Supabase",
    network: "เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่",
  };

  class AuthError extends Error {
    constructor(code, status, detail) {
      super(MESSAGES[code] || detail || "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง");
      this.code = code;
      this.status = status || 0;
    }
  }

  async function request(path, { method = "GET", body, token, headers } = {}) {
    const cfg = config();
    if (!cfg) throw new AuthError("not_configured");
    const h = Object.assign({ apikey: cfg.key }, headers);
    if (token) h.Authorization = `Bearer ${token}`;
    if (body !== undefined) h["Content-Type"] = "application/json";
    let res;
    try {
      res = await fetch(cfg.url + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
    } catch (e) {
      throw new AuthError("network");
    }
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) {}
    if (!res.ok) {
      const d = data || {};
      let code = d.error_code || d.error || (d.code === "23505" ? "name_taken" : "") || d.message || `http_${res.status}`;
      if (d.message === "name_taken") code = "name_taken";
      if (res.status === 429 && !MESSAGES[code]) code = "over_request_rate_limit";
      throw new AuthError(code, res.status, d.msg || d.error_description || d.message);
    }
    return data;
  }

  // ---------- เก็บ session ----------
  let cachedRaw;
  let cachedSession = null;
  let cachedUser = null;

  function read() {
    let raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) {}
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      try { cachedSession = raw ? JSON.parse(raw) : null; } catch (e) { cachedSession = null; }
      const s = cachedSession;
      cachedUser = s && s.user ? { id: s.user.id, email: s.user.email, displayName: s.displayName || "" } : null;
    }
    return cachedSession;
  }

  const listeners = new Set();
  const emit = () => {
    read();
    listeners.forEach((fn) => { try { fn(cachedUser); } catch (e) {} });
  };

  function write(session) {
    try {
      if (session) localStorage.setItem(KEY, JSON.stringify(session));
      else localStorage.removeItem(KEY);
    } catch (e) {}
    emit();
  }

  // หน้าอื่น/iframe อื่นเปลี่ยน session → แจ้งหน้านี้ด้วย
  window.addEventListener("storage", (e) => {
    if (e.key === KEY || e.key === null) emit();
  });

  function fromTokenResponse(data, displayName) {
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at || Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
      user: { id: data.user.id, email: data.user.email },
      displayName: displayName || "",
    };
  }

  // ต่ออายุ token ครั้งละที่เดียว (หน้าเว็บกับเกมอาจเรียกพร้อมกัน)
  const withLock = (fn) =>
    navigator.locks && navigator.locks.request ? navigator.locks.request("gamehub-auth-refresh", fn) : fn();

  const fresh = (s) => s && s.expires_at * 1000 - Date.now() > REFRESH_EARLY_MS;

  async function validSession() {
    const s = read();
    if (!s) return null;
    if (fresh(s)) return s;
    return withLock(async () => {
      const cur = read();
      if (!cur) return null;
      if (fresh(cur)) return cur;
      try {
        const data = await request("/auth/v1/token?grant_type=refresh_token", {
          method: "POST",
          body: { refresh_token: cur.refresh_token },
        });
        const next = fromTokenResponse(data, cur.displayName);
        write(next);
        return next;
      } catch (e) {
        // token ใช้ไม่ได้แล้ว → ออกจากระบบ · ถ้าแค่เน็ตหลุด เก็บไว้ลองใหม่ทีหลัง
        if (e.code !== "network" && e.status && e.status < 500 && e.status !== 429) {
          write(null);
          return null;
        }
        return cur;
      }
    });
  }

  // เรียก REST API ของ Supabase ในนามผู้เล่น (ไม่ได้ Log in = สิทธิ์ทั่วไป)
  async function rest(path, opts = {}) {
    const s = await validSession();
    return request(`/rest/v1/${path}`, Object.assign({}, opts, { token: s ? s.access_token : undefined }));
  }

  async function loadDisplayName(session) {
    const rows = await request(`/rest/v1/profiles?select=display_name&id=eq.${session.user.id}`, {
      token: session.access_token,
    });
    return (rows && rows[0] && rows[0].display_name) || "";
  }

  // ---------- คำสั่งที่หน้าเว็บ/เกมเรียกใช้ ----------
  const cleanName = (name) => String(name || "").replace(/\s+/g, " ").trim().slice(0, 20).trim();

  async function signIn(email, password) {
    const data = await request("/auth/v1/token?grant_type=password", {
      method: "POST",
      body: { email: String(email).trim(), password },
    });
    const session = fromTokenResponse(data);
    session.displayName = await loadDisplayName(session).catch(() => "");
    write(session);
    return cachedUser;
  }

  // คืนค่า user เมื่อสมัครแล้วเข้าสู่ระบบทันที · คืน null เมื่อ Supabase ยังเปิดยืนยันอีเมล
  async function signUp(email, password, displayName) {
    const name = cleanName(displayName);
    if (!name) throw new AuthError("validation_failed");
    if (await isNameTaken(name)) throw new AuthError("name_taken");
    const data = await request("/auth/v1/signup", {
      method: "POST",
      body: { email: String(email).trim(), password, data: { display_name: name } },
    });
    if (!data || !data.access_token) {
      // ถ้าเปิด Confirm email อยู่ Supabase คืน user ปลอมโดยไม่บอกว่าอีเมลซ้ำ จึงแจ้งแบบกลาง ๆ
      return null;
    }
    const session = fromTokenResponse(data, name);
    session.displayName = (await loadDisplayName(session).catch(() => "")) || name;
    write(session);
    return cachedUser;
  }

  async function signOut() {
    const s = read();
    write(null);
    if (s) {
      try {
        await request("/auth/v1/logout?scope=local", { method: "POST", token: s.access_token });
      } catch (e) {}
    }
  }

  async function isNameTaken(name) {
    return !!(await request("/rest/v1/rpc/display_name_taken", { method: "POST", body: { name: cleanName(name) } }));
  }

  async function saveDisplayName(displayName) {
    const name = cleanName(displayName);
    if (!name) throw new AuthError("validation_failed");
    const s = await validSession();
    if (!s) throw new AuthError("session_expired");
    const prefer = { Prefer: "return=representation" };
    let rows = await request(`/rest/v1/profiles?id=eq.${s.user.id}&select=display_name`, {
      method: "PATCH",
      token: s.access_token,
      body: { display_name: name },
      headers: prefer,
    });
    if (!rows || !rows.length) {
      // บัญชีที่ยังไม่มีโปรไฟล์ (สมัครก่อนติดตั้งระบบ) → สร้างใหม่
      rows = await request("/rest/v1/profiles?select=display_name", {
        method: "POST",
        token: s.access_token,
        body: { id: s.user.id, display_name: name },
        headers: prefer,
      });
    }
    const saved = (rows && rows[0] && rows[0].display_name) || name;
    const cur = read();
    if (cur) write(Object.assign({}, cur, { displayName: saved }));
    return saved;
  }

  async function changePassword(password) {
    const s = await validSession();
    if (!s) throw new AuthError("session_expired");
    await request("/auth/v1/user", { method: "PUT", token: s.access_token, body: { password } });
  }

  // ตอนเปิดเว็บ: ต่ออายุ token และอัปเดตชื่อเล่นล่าสุด (เผื่อเปลี่ยนจากเครื่องอื่น)
  async function refreshProfile() {
    const s = await validSession();
    if (!s) return null;
    try {
      const name = await loadDisplayName(s);
      const cur = read();
      if (cur && name && name !== cur.displayName) write(Object.assign({}, cur, { displayName: name }));
    } catch (e) {
      if (e.status === 401) write(null);
    }
    read();
    return cachedUser;
  }

  function onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  read();

  window.GameHubAuth = {
    configured: () => !!config(),
    getUser: () => (read(), cachedUser),
    validSession,
    rest,
    signIn,
    signUp,
    signOut,
    isNameTaken,
    saveDisplayName,
    changePassword,
    refreshProfile,
    onChange,
    cleanName,
    AuthError,
  };
})();

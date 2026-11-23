import { useEffect, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import Header from "../components/Header.jsx";
import { auth, useUser } from "../lib/auth.js";

// ปิดรับสมัครสมาชิกไว้ก่อน (ซ่อนแท็บ "สมัครสมาชิก") · จะเปิดให้สมัครเอง เปลี่ยนเป็น true
// ระหว่างนี้สร้างบัญชีให้ได้ที่ Supabase → Authentication → Users → Add user
const SIGNUP_ENABLED = false;

// เปิดไฟล์เกมตรง ๆ แล้วถูกพามาเข้าสู่ระบบ: รับเฉพาะไฟล์เกมในเว็บนี้ (กันลิงก์พาไปเว็บอื่น)
const gameBack = (value) => (/^games\/[\w-]+\.html(\?[\w=&%-]*)?$/.test(value || "") ? value : null);

function BackToGame({ href }) {
  useEffect(() => {
    window.location.replace(href);
  }, [href]);
  return null;
}

export default function Login() {
  const user = useUser();
  const [params] = useSearchParams();
  const fromGame = params.get("from") === "game";
  const back = gameBack(params.get("back"));
  const next = params.get("next");
  const toPlay = !!back || (next || "").startsWith("/play/");
  const [mode, setMode] = useState(SIGNUP_ENABLED && params.get("mode") === "signup" ? "signup" : "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [done, setDone] = useState(null); // "login" | "signup"

  const signup = mode === "signup";

  useEffect(() => {
    document.title = `${signup ? "สมัครสมาชิก" : "เข้าสู่ระบบ"} · บ้านเกมเรียนรู้`;
  }, [signup]);

  if (!auth.configured()) {
    return (
      <div className="page">
        <Header />
        <section className="auth-card">
          <h1>🔑 เข้าสู่ระบบ</h1>
          <p className="auth-note">ยังไม่ได้เชื่อมต่อ Supabase (ตั้งค่า VITE_SUPABASE_URL และ VITE_SUPABASE_PUBLISHABLE_KEY)</p>
        </section>
      </div>
    );
  }

  if (user && back) return <BackToGame href={back} />;

  // เปิดจากเกม: เข้าสู่ระบบแล้วให้กลับไปแท็บเกมเพื่อบันทึกคะแนน
  if (user && (fromGame || done === "signup")) {
    return (
      <div className="page">
        <Header />
        <section className="auth-card auth-done">
          <div className="big-emoji" aria-hidden="true">🎉</div>
          <h1>สวัสดี {user.displayName || "เพื่อนใหม่"}!</h1>
          {fromGame ? (
            <>
              <p className="auth-note">เข้าสู่ระบบแล้ว กลับไปที่แท็บเกม แล้วกด 💾 บันทึก ได้เลย</p>
              <button type="button" className="btn auth-submit" onClick={() => window.close()}>
                ✖ ปิดแท็บนี้
              </button>
            </>
          ) : (
            <>
              <p className="auth-note">สมัครสมาชิกเรียบร้อย เล่นเกมจบแล้วกดบันทึก คะแนนจะเก็บไว้ในบัญชีนี้</p>
              <Link to="/" className="btn auth-submit">
                🎮 ไปเล่นเกม
              </Link>
            </>
          )}
          <Link to="/account" className="auth-link">
            ดูบัญชีของฉัน
          </Link>
        </section>
      </div>
    );
  }
  // เข้าสู่ระบบแล้ว: ไปหน้าที่ตั้งใจไว้ (เช่น เกมที่กดเล่น) · เปิดหน้านี้ตอน Log in อยู่แล้ว → หน้าบัญชี
  if (user) return <Navigate to={next || (done === "login" ? "/" : "/account")} replace />;

  const switchMode = (next) => {
    setMode(next);
    setError("");
    setNotice("");
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    const cleanName = auth.cleanName(name);
    if (signup && !cleanName) return setError("ตั้งชื่อเล่นก่อนนะ ✏️");
    if (password.length < 6) return setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัว");
    setBusy(true);
    // ตั้งไว้ก่อน: session ถูกบันทึกระหว่างรอ แล้วหน้านี้จะวาดใหม่ทันทีที่ Log in สำเร็จ
    setDone(mode);
    try {
      if (signup) {
        const u = await auth.signUp(email, password, cleanName);
        if (!u) {
          setDone(null);
          setNotice("สมัครแล้ว! ตรวจอีเมลเพื่อยืนยันบัญชี แล้วกลับมาเข้าสู่ระบบ (ถ้าไม่ได้รับอีเมล ผู้ดูแลเว็บต้องปิด Confirm email ใน Supabase)");
          setMode("login");
        }
      } else {
        await auth.signIn(email, password);
      }
    } catch (err) {
      setDone(null);
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <Header />
      <section className="auth-card">
        {SIGNUP_ENABLED ? (
          <div className="auth-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={!signup} className={!signup ? "active" : ""} onClick={() => switchMode("login")}>
              🔑 เข้าสู่ระบบ
            </button>
            <button type="button" role="tab" aria-selected={signup} className={signup ? "active" : ""} onClick={() => switchMode("signup")}>
              ✨ สมัครสมาชิก
            </button>
          </div>
        ) : (
          <h1>🔑 เข้าสู่ระบบ</h1>
        )}

        <p className="auth-intro">
          {signup
            ? "สมัครครั้งเดียว คะแนนทุกเกมจะเก็บไว้ในบัญชี และขึ้นตารางอันดับด้วยชื่อเล่นของคุณ"
            : fromGame
              ? "เข้าสู่ระบบแล้วกลับไปที่แท็บเกม เพื่อบันทึกคะแนนรอบนี้ไว้ในบัญชี"
              : toPlay
                ? "เข้าสู่ระบบก่อนนะ แล้วไปเล่นเกมกันเลย 🎮"
                : "เข้าสู่ระบบเพื่อเล่นเกม และเก็บคะแนนไว้ในบัญชีของคุณ"}
        </p>

        <form className="auth-form" onSubmit={submit}>
          {signup && (
            <label>
              <span>ชื่อเล่น (แสดงบนตารางอันดับ)</span>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} placeholder="เช่น น้องมิว" autoComplete="nickname" required />
              <small>ใช้ชื่อเล่น ไม่ต้องใส่ชื่อจริงหรือนามสกุล</small>
            </label>
          )}
          <label>
            <span>อีเมล</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required />
          </label>
          <label>
            <span>รหัสผ่าน{signup && " (อย่างน้อย 6 ตัว)"}</span>
            <div className="auth-password">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                autoComplete={signup ? "new-password" : "current-password"}
                required
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}>
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </label>

          {error && <p className="auth-msg bad">{error}</p>}
          {notice && <p className="auth-msg good">{notice}</p>}

          <button type="submit" className="btn auth-submit" disabled={busy}>
            {busy ? "กำลังดำเนินการ..." : signup ? "✨ สมัครสมาชิก" : "🔑 เข้าสู่ระบบ"}
          </button>
        </form>

        {SIGNUP_ENABLED && (
        <p className="auth-foot">
          {signup ? (
            <>
              มีบัญชีแล้ว?{" "}
              <button type="button" className="auth-link" onClick={() => switchMode("login")}>
                เข้าสู่ระบบ
              </button>
            </>
          ) : (
            <>
              ยังไม่มีบัญชี?{" "}
              <button type="button" className="auth-link" onClick={() => switchMode("signup")}>
                สมัครสมาชิก
              </button>
            </>
          )}
        </p>
        )}
        <p className="auth-small">
          {SIGNUP_ENABLED
            ? "👨‍👩‍👧 ต้องเข้าสู่ระบบก่อนจึงจะเล่นเกมได้ · ผู้ปกครองหรือคุณครูสมัครให้เด็กได้"
            : "👨‍👩‍👧 ต้องเข้าสู่ระบบก่อนจึงจะเล่นเกมได้ · ยังไม่มีบัญชี? ขอให้ผู้ปกครองหรือคุณครูสร้างให้"}
        </p>
      </section>
    </div>
  );
}

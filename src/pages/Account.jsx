import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import Header from "../components/Header.jsx";
import { findGame } from "../data/games.js";
import { auth, useUser } from "../lib/auth.js";
import { fetchMyScores } from "../lib/leaderboard.js";

const dateText = (iso) => new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });

function NameForm({ user }) {
  const [name, setName] = useState(user.displayName);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const changed = auth.cleanName(name) !== user.displayName;

  const submit = async (e) => {
    e.preventDefault();
    if (!auth.cleanName(name)) return setMsg({ bad: true, text: "ตั้งชื่อเล่นก่อนนะ ✏️" });
    setBusy(true);
    setMsg(null);
    try {
      const saved = await auth.saveDisplayName(name);
      setName(saved);
      setMsg({ text: "เปลี่ยนชื่อแล้ว คะแนนเก่าในบัญชีใช้ชื่อใหม่ด้วย ✅" });
    } catch (err) {
      setMsg({ bad: true, text: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={submit}>
      <label>
        <span>ชื่อเล่นบนตารางอันดับ</span>
        <div className="auth-inline">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} required />
          <button type="submit" className="btn auth-submit" disabled={busy || !changed}>
            {busy ? "..." : "บันทึก"}
          </button>
        </div>
        <small>ใช้ชื่อเล่น ไม่ต้องใส่ชื่อจริงหรือนามสกุล</small>
      </label>
      {msg && <p className={`auth-msg${msg.bad ? " bad" : " good"}`}>{msg.text}</p>}
    </form>
  );
}

function PasswordForm() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <button type="button" className="auth-link" onClick={() => setOpen(true)}>
        🔒 เปลี่ยนรหัสผ่าน
      </button>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 6) return setMsg({ bad: true, text: "รหัสผ่านต้องมีอย่างน้อย 6 ตัว" });
    setBusy(true);
    setMsg(null);
    try {
      await auth.changePassword(password);
      setPassword("");
      setMsg({ text: "เปลี่ยนรหัสผ่านแล้ว ✅" });
    } catch (err) {
      setMsg({ bad: true, text: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={submit}>
      <label>
        <span>รหัสผ่านใหม่ (อย่างน้อย 6 ตัว)</span>
        <div className="auth-inline">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} autoComplete="new-password" required />
          <button type="submit" className="btn auth-submit" disabled={busy}>
            {busy ? "..." : "เปลี่ยน"}
          </button>
        </div>
      </label>
      {msg && <p className={`auth-msg${msg.bad ? " bad" : " good"}`}>{msg.text}</p>}
    </form>
  );
}

function MyScores({ userId }) {
  const [state, setState] = useState({ status: "loading", items: [] });

  const load = useCallback(() => {
    let cancelled = false;
    setState({ status: "loading", items: [] });
    fetchMyScores(userId)
      .then((items) => !cancelled && setState({ status: "ok", items }))
      .catch(() => !cancelled && setState({ status: "error", items: [] }));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(load, [load]);

  const { status, items } = state;
  if (status === "loading") return <p className="rank-note">กำลังโหลดคะแนน...</p>;
  if (status === "error")
    return (
      <p className="rank-note">
        โหลดคะแนนไม่ได้ (ไม่มีอินเทอร์เน็ต?){" "}
        <button type="button" className="btn rank-retry" onClick={load}>
          🔄 ลองใหม่
        </button>
      </p>
    );
  if (!items.length) return <p className="rank-note">ยังไม่มีคะแนนในบัญชีนี้ เล่นเกมจบแล้วกด 💾 บันทึก นะ 🌟</p>;

  return (
    <ul className="my-scores">
      {items.map((it) => {
        const game = findGame(it.gameId);
        return (
          <li key={`${it.gameId}|${it.board}`} style={{ "--accent": game?.color || "#8a7fc0" }}>
            <Link to={`/ranking/${it.gameId}`} className="my-score">
              <span className="my-emoji" aria-hidden="true">{game?.emoji || "🎮"}</span>
              <span className="my-main">
                <strong>{game?.title || it.gameId}</strong>
                {it.board && <small>{it.board}</small>}
              </span>
              <span className="my-best">
                <strong>{it.best.detail || it.best.score}</strong>
                <small>
                  เล่น {it.plays} ครั้ง · {dateText(it.lastPlayed)}
                </small>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function Account() {
  const user = useUser();
  const navigate = useNavigate();
  const leaving = useRef(false);

  useEffect(() => {
    document.title = "บัญชีของฉัน · บ้านเกมเรียนรู้";
  }, []);

  if (!user) return leaving.current ? null : <Navigate to="/login?next=/account" replace />;

  // กดออกจากระบบ → กลับหน้าแรก (ไม่ใช่เด้งไปหน้าเข้าสู่ระบบ)
  const logout = () => {
    leaving.current = true;
    navigate("/", { replace: true });
    auth.signOut();
  };

  return (
    <div className="page">
      <Header />
      <section className="auth-card account-card">
        <div className="account-head">
          <div className="account-avatar" aria-hidden="true">👤</div>
          <div className="account-who">
            <h1>{user.displayName || "บัญชีของฉัน"}</h1>
            <p>{user.email}</p>
          </div>
          <button type="button" className="btn logout-btn" onClick={logout}>
            🚪 ออกจากระบบ
          </button>
        </div>
        <NameForm key={user.id} user={user} />
        <PasswordForm />
      </section>

      <section className="rank-card my-card" style={{ "--accent": "#2fb874" }}>
        <div className="rank-head">
          <h2>⭐ คะแนนของฉัน</h2>
          <Link to="/" className="btn play-btn" style={{ background: "#2fb874" }}>
            🎮 เล่นเกม
          </Link>
        </div>
        <MyScores userId={user.id} />
      </section>
    </div>
  );
}

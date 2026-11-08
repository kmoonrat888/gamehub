import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header.jsx";
import { GAMES, findGame } from "../data/games.js";
import { NotConfiguredError, fetchGameBoards } from "../lib/leaderboard.js";

const MEDALS = ["🥇", "🥈", "🥉"];
const dateText = (iso) => new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short" });

export default function Ranking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const game = findGame(id) || GAMES[0];
  const [state, setState] = useState({ status: "loading", boards: [] });
  const [boardName, setBoardName] = useState(null);

  const navRef = useRef(null);

  useEffect(() => {
    document.title = `อันดับ ${game.title} · บ้านเกมเรียนรู้`;
    // มือถือ: แถบเกมเลื่อนแนวนอน ให้เกมที่เลือกอยู่ในจอ
    const nav = navRef.current;
    const active = nav?.querySelector(".active");
    if (nav && active) nav.scrollLeft = active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2;
  }, [game]);

  const load = useCallback(() => {
    let cancelled = false;
    setState({ status: "loading", boards: [] });
    setBoardName(null);
    fetchGameBoards(game.id)
      .then((boards) => !cancelled && setState({ status: "ok", boards }))
      .catch((err) => !cancelled && setState({ status: err instanceof NotConfiguredError ? "setup" : "error", boards: [] }));
    return () => {
      cancelled = true;
    };
  }, [game.id]);

  useEffect(load, [load]);

  const { status, boards } = state;
  const current = boards.find((b) => b.board === boardName) || boards[0];

  return (
    <div className="page">
      <Header />

      <section className="hero ranking-hero">
        <h1>🏆 อันดับคะแนนสูงสุด</h1>
        <p>เลือกเกมเพื่อดูว่าใครทำคะแนนได้มากที่สุด · เล่นจบแล้วพิมพ์ชื่อเล่นเพื่อขึ้นตาราง</p>
      </section>

      <nav className="rank-games" aria-label="เลือกเกม" ref={navRef}>
        {GAMES.map((g) => (
          <button
            key={g.id}
            type="button"
            className={`rank-game${g.id === game.id ? " active" : ""}`}
            style={{ "--accent": g.color }}
            onClick={() => navigate(`/ranking/${g.id}`, { replace: true })}
          >
            <span aria-hidden="true">{g.emoji}</span> {g.title}
          </button>
        ))}
      </nav>

      <section className="rank-card" style={{ "--accent": game.color }}>
        <div className="rank-head">
          <h2>
            <span aria-hidden="true">{game.emoji}</span> {game.title}
          </h2>
          <Link to={`/play/${game.id}`} className="btn play-btn" style={{ background: game.color }}>
            ▶ เล่นเกมนี้
          </Link>
        </div>

        {status === "loading" && <p className="rank-note">กำลังโหลดอันดับ...</p>}
        {status === "setup" && <p className="rank-note">ยังไม่ได้เชื่อมต่อระบบอันดับ (ตั้งค่า VITE_SUPABASE_URL และ VITE_SUPABASE_PUBLISHABLE_KEY)</p>}
        {status === "error" && (
          <p className="rank-note">
            โหลดอันดับไม่ได้ (ไม่มีอินเทอร์เน็ต?){" "}
            <button type="button" className="btn rank-retry" onClick={load}>
              🔄 ลองใหม่
            </button>
          </p>
        )}
        {status === "ok" && !current && <p className="rank-note">ยังไม่มีใครบันทึกคะแนนเกมนี้ ไปเล่นแล้วเป็นคนแรกกัน! 🌟</p>}

        {current && (
          <>
            {boards.length > 1 && (
              <div className="rank-boards" role="tablist" aria-label="เลือกโหมด">
                {boards.map((b) => (
                  <button
                    key={b.board}
                    type="button"
                    role="tab"
                    aria-selected={b === current}
                    className={`rank-board${b === current ? " active" : ""}`}
                    onClick={() => setBoardName(b.board)}
                  >
                    {b.board || "ทั่วไป"} <small>{b.players} คน</small>
                  </button>
                ))}
              </div>
            )}
            {boards.length === 1 && current.board && <p className="rank-board-name">{current.board}</p>}
            <ol className="rank-list">
              {current.rows.map((r, i) => (
                <li key={r.id} className={`rank-row${i < 3 ? " top" : ""}`}>
                  <span className="rank-no">{i < 3 ? MEDALS[i] : i + 1}</span>
                  <span className="rank-name">{r.player_name}</span>
                  <span className="rank-detail">{r.detail || r.score}</span>
                  <span className="rank-date">{dateText(r.created_at)}</span>
                </li>
              ))}
            </ol>
          </>
        )}
      </section>
    </div>
  );
}

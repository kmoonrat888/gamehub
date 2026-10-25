import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header.jsx";
import GameCard from "../components/GameCard.jsx";
import { CATEGORIES, GAMES, findGame } from "../data/games.js";
import { useRecentGames } from "../hooks/useRecentGames.js";

export default function Home() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const { recent } = useRecentGames();

  useEffect(() => {
    document.title = "บ้านเกมเรียนรู้";
  }, []);

  const games = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GAMES.filter((game) => {
      const inCategory = category === "all" || game.categories.includes(category);
      const text = [game.title, game.description, game.grade, ...game.features].join(" ").toLowerCase();
      return inCategory && (!q || text.includes(q));
    });
  }, [query, category]);

  const recentGames = recent.map(findGame).filter(Boolean);

  return (
    <div className="page">
      <Header />

      <section className="hero">
        <h1>เรียนสนุก เล่นได้ทุกวัน 🎉</h1>
        <p>รวมเกมฝึกคณิตศาสตร์และภาษาอังกฤษสำหรับเด็ก เล่นฟรีบนคอมพิวเตอร์ แท็บเล็ต และมือถือ</p>
        <input
          type="search"
          className="search"
          placeholder="🔎 ค้นหาเกม เช่น คูณ, สัตว์, ป.2"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="ค้นหาเกม"
        />
      </section>

      {recentGames.length > 0 && (
        <section className="recent" aria-label="เล่นล่าสุด">
          <h2>⏱️ เล่นล่าสุด</h2>
          <div className="recent-list">
            {recentGames.map((game) => (
              <Link key={game.id} to={`/play/${game.id}`} className="recent-item" style={{ "--accent": game.color }}>
                <span aria-hidden="true">{game.emoji}</span> {game.title}
              </Link>
            ))}
          </div>
        </section>
      )}

      <nav className="categories" aria-label="หมวดเกม">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`chip ${category === c.id ? "selected" : ""}`}
            onClick={() => setCategory(c.id)}
            aria-pressed={category === c.id}
          >
            <span aria-hidden="true">{c.emoji}</span> {c.label}
          </button>
        ))}
      </nav>

      {games.length > 0 ? (
        <section className="game-grid">
          {games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </section>
      ) : (
        <p className="empty">ไม่พบเกมที่ค้นหา 🙈 ลองคำอื่นดูนะ</p>
      )}

      <footer className="site-footer">
        มีทั้งหมด {GAMES.length} เกม · สร้างด้วย React + Vite · รูปสัตว์จาก Wikimedia Commons
      </footer>
    </div>
  );
}

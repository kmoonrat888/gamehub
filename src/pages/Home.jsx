import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header.jsx";
import GameCard from "../components/GameCard.jsx";
import CategoryPopup from "../components/CategoryPopup.jsx";
import { CATEGORIES, GAMES, findCategory, findGame, gamesIn } from "../data/games.js";
import { useRecentGames } from "../hooks/useRecentGames.js";

export default function Home() {
  const { catId } = useParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const { recent } = useRecentGames();
  const openCategory = catId ? findCategory(catId) : null;

  useEffect(() => {
    document.title = openCategory ? `หมวด${openCategory.label} · บ้านเกมเรียนรู้` : "บ้านเกมเรียนรู้";
  }, [openCategory]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return GAMES.filter((game) => {
      const cat = findCategory(game.category);
      const text = [game.title, game.description, game.grade, cat?.label, ...game.features].join(" ").toLowerCase();
      return text.includes(q);
    });
  }, [query]);

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
          placeholder="🔎 ค้นหาเกม เช่น คูณ, สี, ร่างกาย, ป.2"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="ค้นหาเกม"
        />
      </section>

      {results ? (
        <section aria-label="ผลการค้นหา">
          <h2 className="section-title">🔎 ผลการค้นหา ({results.length} เกม)</h2>
          {results.length > 0 ? (
            <div className="game-grid">
              {results.map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          ) : (
            <p className="empty">ไม่พบเกมที่ค้นหา 🙈 ลองคำอื่นดูนะ</p>
          )}
        </section>
      ) : (
        <>
          <nav className="category-grid" aria-label="หมวดเกม">
            {CATEGORIES.map((c) => (
              <Link key={c.id} to={`/c/${c.id}`} className="category-btn" style={{ "--accent": c.color }}>
                <span className="cat-emoji" aria-hidden="true">{c.emoji}</span>
                <span className="cat-label">{c.label}</span>
                <span className="cat-desc">{c.description}</span>
                <span className="cat-count">{gamesIn(c.id).length} เกม</span>
              </Link>
            ))}
          </nav>

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
        </>
      )}

      <footer className="site-footer">
        มีทั้งหมด {GAMES.length} เกม · สร้างด้วย React + Vite · รูปถ่ายจาก Wikimedia Commons
      </footer>

      {openCategory && <CategoryPopup key={openCategory.id} category={openCategory} onClose={() => navigate("/")} />}
    </div>
  );
}

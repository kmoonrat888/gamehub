import { useEffect, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { findGame } from "../data/games.js";
import { useRecentGames } from "../hooks/useRecentGames.js";
import NotFound from "./NotFound.jsx";

export default function Play() {
  const { id } = useParams();
  const game = findGame(id);
  const stageRef = useRef(null);
  const { addRecent } = useRecentGames();

  useEffect(() => {
    if (!game) return;
    document.title = `${game.title} · บ้านเกมเรียนรู้`;
    addRecent(game.id);
  }, [game, addRecent]);

  if (!game) return <NotFound />;

  const src = `${import.meta.env.BASE_URL}games/${game.file}`;

  const goFullscreen = () => {
    const stage = stageRef.current;
    if (stage?.requestFullscreen) stage.requestFullscreen().catch(() => {});
  };

  return (
    <div className="play-page">
      <header className="play-bar" style={{ "--accent": game.color }}>
        <Link to="/" className="btn bar-btn">
          ◀ <span className="hide-sm">รวมเกม</span>
        </Link>
        <h1>
          <span aria-hidden="true">{game.emoji}</span> {game.title}
        </h1>
        <button type="button" className="btn bar-btn" onClick={goFullscreen} title="เต็มจอ">
          ⛶ <span className="hide-sm">เต็มจอ</span>
        </button>
        <a href={src} target="_blank" rel="noopener" className="btn bar-btn" title="เปิดในแท็บใหม่">
          ↗ <span className="hide-sm">แท็บใหม่</span>
        </a>
      </header>
      <div className="stage" ref={stageRef}>
        <iframe key={game.id} src={src} title={game.title} allow="fullscreen; autoplay" />
      </div>
    </div>
  );
}

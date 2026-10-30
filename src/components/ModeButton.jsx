import { Link } from "react-router-dom";

// ปุ่มโหมดใน Popup: แสดงแค่ไอคอนและชื่อโหมด กดแล้วเข้าเล่นเลย
export default function ModeButton({ game }) {
  return (
    <Link to={`/play/${game.id}`} className="mode-btn" style={{ "--accent": game.color }} aria-label={`เล่น ${game.title}`}>
      <span className="mode-emoji" aria-hidden="true">{game.emoji}</span>
      <span className="mode-title">{game.title}</span>
      <span className="mode-play" aria-hidden="true">▶</span>
    </Link>
  );
}

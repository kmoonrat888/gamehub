import { useEffect, useRef } from "react";
import ModeButton from "./ModeButton.jsx";
import { gamesIn } from "../data/games.js";

// Popup ใช้ <dialog> ของเบราว์เซอร์: ปิดด้วย Esc, ปุ่ม ✕ หรือคลิกพื้นที่มืดรอบ ๆ
export default function CategoryPopup({ category, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const games = gamesIn(category.id);

  return (
    <dialog
      ref={ref}
      className="category-popup"
      style={{ "--accent": category.color }}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // คลิกพื้นหลัง
      }}
      aria-labelledby="popup-title"
    >
      <div className="popup-inner">
        <header className="popup-head">
          <h2 id="popup-title">
            <span aria-hidden="true">{category.emoji}</span> หมวด{category.label}
            <small>{games.length} เกม</small>
          </h2>
          <button type="button" className="popup-close" onClick={onClose} aria-label="ปิด">
            ✕
          </button>
        </header>
        <div className="mode-list">
          {games.map((game) => (
            <ModeButton key={game.id} game={game} />
          ))}
        </div>
      </div>
    </dialog>
  );
}

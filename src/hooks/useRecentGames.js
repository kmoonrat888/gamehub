import { useCallback, useState } from "react";

const KEY = "game-hub-recent";
const MAX_RECENT = 4;

function read() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

// จำเกมที่เล่นล่าสุดไว้ในเบราว์เซอร์นี้ (ใช้ไม่ได้ก็แค่ไม่แสดงแถว "เล่นล่าสุด")
export function useRecentGames() {
  const [recent, setRecent] = useState(read);

  const addRecent = useCallback((id) => {
    setRecent((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, MAX_RECENT);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // เก็บไม่ได้ (เช่น โหมดไม่ระบุตัวตน) — ไม่เป็นไร
      }
      return next;
    });
  }, []);

  return { recent, addRecent };
}

// อ่านอันดับคะแนนจาก Supabase (ตั้งค่าใน .env.local และ Environment Variables ของ Vercel)
import { auth } from "./auth.js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const cfg = url && key ? { url: url.replace(/\/+$/, ""), key } : null;

export class NotConfiguredError extends Error {}

const ORDER = "score.desc,time_ms.asc.nullslast,created_at.asc";
// คนเดียวกัน = บัญชีเดียวกัน หรือ (ไม่ได้ Log in) ชื่อเดียวกัน
const playerKey = (row) => (row.user_id ? `u:${row.user_id}` : `n:${row.player_name.trim().toLowerCase()}`);

// คืนค่า [{ board, rows, players }] เรียงตารางตามจำนวนผู้เล่น · แต่ละคนแสดงเฉพาะคะแนนที่ดีที่สุด
export async function fetchGameBoards(gameId, top = 10) {
  if (!cfg) throw new NotConfiguredError();
  const q = new URLSearchParams({
    select: "id,board,player_name,score,time_ms,detail,created_at,user_id",
    game_id: `eq.${gameId}`,
    order: ORDER,
    limit: "1000",
  });
  const res = await fetch(`${cfg.url}/rest/v1/scores?${q}`, {
    headers: { apikey: cfg.key },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const boards = new Map();
  for (const row of await res.json()) {
    let b = boards.get(row.board);
    if (!b) boards.set(row.board, (b = { board: row.board, rows: [], seen: new Set(), players: 0 }));
    const k = playerKey(row);
    if (b.seen.has(k)) continue;
    b.seen.add(k);
    b.players++;
    if (b.rows.length < top) b.rows.push(row);
  }
  return [...boards.values()].sort((a, b) => b.players - a.players).map(({ board, rows, players }) => ({ board, rows, players }));
}

// คะแนนของบัญชีที่ Log in อยู่: [{ gameId, board, best, plays, lastPlayed }] เรียงจากเล่นล่าสุด
export async function fetchMyScores(userId) {
  if (!cfg) throw new NotConfiguredError();
  const q = new URLSearchParams({
    select: "game_id,board,score,time_ms,detail,created_at",
    user_id: `eq.${userId}`,
    order: ORDER,
    limit: "1000",
  });
  const rows = await auth.rest(`scores?${q}`);
  const groups = new Map();
  for (const row of rows || []) {
    const k = `${row.game_id}\u0000${row.board}`;
    let g = groups.get(k);
    if (!g) groups.set(k, (g = { gameId: row.game_id, board: row.board, best: row, plays: 0, lastPlayed: row.created_at }));
    g.plays++;
    if (row.created_at > g.lastPlayed) g.lastPlayed = row.created_at;
  }
  return [...groups.values()].sort((a, b) => (a.lastPlayed < b.lastPlayed ? 1 : -1));
}

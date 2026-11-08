// อ่านอันดับคะแนนจาก Supabase (ตั้งค่าที่เดียวกับเกม: public/games/supabase-config.js)
let configPromise;

function loadConfig() {
  if (!configPromise) {
    configPromise = new Promise((resolve) => {
      if (window.SUPABASE_CONFIG) return resolve(window.SUPABASE_CONFIG);
      const script = document.createElement("script");
      script.src = `${import.meta.env.BASE_URL}games/supabase-config.js`;
      script.onload = () => resolve(window.SUPABASE_CONFIG || {});
      script.onerror = () => resolve({});
      document.head.append(script);
    }).then((c) => (c.url && c.publishableKey ? { url: c.url.replace(/\/+$/, ""), key: c.publishableKey } : null));
  }
  return configPromise;
}

export class NotConfiguredError extends Error {}

// คืนค่า [{ board, rows }] เรียงตารางตามจำนวนผู้เล่น · แต่ละชื่อแสดงเฉพาะคะแนนที่ดีที่สุด
export async function fetchGameBoards(gameId, top = 10) {
  const cfg = await loadConfig();
  if (!cfg) throw new NotConfiguredError();
  const q = new URLSearchParams({
    select: "id,board,player_name,score,time_ms,detail,created_at",
    game_id: `eq.${gameId}`,
    order: "score.desc,time_ms.asc.nullslast,created_at.asc",
    limit: "1000",
  });
  const res = await fetch(`${cfg.url}/rest/v1/scores?${q}`, {
    headers: { apikey: cfg.key },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const boards = new Map();
  for (const row of await res.json()) {
    let b = boards.get(row.board);
    if (!b) boards.set(row.board, (b = { board: row.board, rows: [], names: new Set(), players: 0 }));
    const name = row.player_name.trim().toLowerCase();
    if (b.names.has(name)) continue;
    b.names.add(name);
    b.players++;
    if (b.rows.length < top) b.rows.push(row);
  }
  return [...boards.values()].sort((a, b) => b.players - a.players).map(({ board, rows, players }) => ({ board, rows, players }));
}

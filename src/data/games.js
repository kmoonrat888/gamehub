// รายการเกมทั้งหมด — เพิ่มเกมใหม่: วางไฟล์ใน public/games แล้วเพิ่ม 1 รายการด้านล่าง
// thumb: รูปตัวอย่างใน public/thumbs (ถ้าไม่มี การ์ดจะแสดง emoji แทน)

export const CATEGORIES = [
  { id: "all", label: "ทั้งหมด", emoji: "🌈" },
  { id: "math", label: "คณิตศาสตร์", emoji: "🔢" },
  { id: "english", label: "ภาษาอังกฤษ", emoji: "🔤" },
  { id: "exam", label: "แบบทดสอบ", emoji: "📝" },
  { id: "puzzle", label: "ฝึกสมอง", emoji: "🧩" },
  { id: "adventure", label: "ผจญภัย", emoji: "🗺️" },
];

export const GAMES = [
  {
    id: "forest-adventure",
    title: "ผจญภัยป่าคณิต",
    file: "forest-math-adventure.html",
    thumb: "forest-adventure.png",
    emoji: "🌲",
    color: "#2fb874",
    categories: ["math", "adventure"],
    grade: "ป.1–ป.4",
    description: "เลือกตัวละคร เดินผ่านป่า ตอบโจทย์คณิตให้ถูกเพื่อใช้ค้อนปราบสัตว์ประหลาด 10 ด่าน",
    features: ["10 ด่าน", "เลือกตัวละคร", "พลุตอนจบ"],
  },
  {
    id: "spot-difference",
    title: "เกมจับผิดภาพ",
    file: "spot-difference-game.html",
    thumb: "spot-difference.png",
    emoji: "🔍",
    color: "#9a6cff",
    categories: ["puzzle", "math"],
    grade: "ป.1–ป.4",
    description: "หาจุดต่าง 5 จุดในภาพ แล้วตอบคำถามคณิต 3 ข้อเพื่อผ่านไปด่านต่อไป",
    features: ["5 ด่าน", "คำใบ้", "คำถามคณิต"],
  },
  {
    id: "math-fun",
    title: "เกมคณิตแสนสนุก",
    file: "addition-game.html",
    thumb: "math-fun.png",
    emoji: "🦁",
    color: "#ff7a59",
    categories: ["math"],
    grade: "ป.1–ป.4",
    description: "ฝึกบวก ลบ คูณ หาร มีหลักร้อย หลักพัน โหมดจับเวลา และเปลี่ยนรูปพื้นหลังได้",
    features: ["+ − × ÷", "จับเวลา", "หลักร้อย/พัน"],
  },
  {
    id: "animal-words",
    title: "ทายศัพท์สัตว์ภาษาอังกฤษ",
    file: "animal-words-game.html",
    thumb: "animal-words.png",
    emoji: "🐼",
    color: "#4d8dff",
    categories: ["english"],
    grade: "อนุบาล–ป.6",
    description: "ดูรูปสัตว์จริง ทายคำศัพท์ สะกดคำ และฟังเสียงอ่านภาษาอังกฤษ 70 คำ",
    features: ["รูปสัตว์จริง", "สะกดคำ", "ฟังเสียง"],
  },
  {
    id: "p2-final-exam",
    title: "ข้อสอบปลายภาค คณิต ป.2",
    file: "p2-math-final-exam.html",
    thumb: "p2-final-exam.png",
    emoji: "📝",
    color: "#ffb020",
    categories: ["math", "exam"],
    grade: "ป.2",
    description: "แบบทดสอบ 60 ข้อ โหมดสอบจริง/ฝึกทำ จับเวลาได้ ดูคะแนนแยกตามตัวชี้วัด และพิมพ์ผลสอบ",
    features: ["60 ข้อ", "พิมพ์ผลสอบ", "ฟังโจทย์"],
  },
];

export const findGame = (id) => GAMES.find((game) => game.id === id);

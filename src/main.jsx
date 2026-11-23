import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { auth } from "./lib/auth.js";

// เปิดเว็บ: ต่ออายุการเข้าสู่ระบบ และอัปเดตชื่อเล่นล่าสุด (เผื่อเปลี่ยนจากเครื่องอื่น)
auth.refreshProfile().catch(() => {});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);

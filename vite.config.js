import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// เกมเป็น HTML ใน public/ ซึ่ง Vite ไม่แทนค่า env ให้ จึงสร้าง games/supabase-config.js จาก env แทน
function supabaseConfig(env) {
  const fileName = "games/supabase-config.js";
  const config = { url: env.VITE_SUPABASE_URL || "", publishableKey: env.VITE_SUPABASE_PUBLISHABLE_KEY || "" };
  const source = `window.SUPABASE_CONFIG = ${JSON.stringify(config)};\n`;
  return {
    name: "supabase-config",
    configureServer(server) {
      server.middlewares.use(`/${fileName}`, (req, res) => {
        res.setHeader("Content-Type", "text/javascript; charset=utf-8");
        res.end(source);
      });
    },
    generateBundle() {
      if (!config.url || !config.publishableKey) this.warn("ยังไม่ได้ตั้งค่า VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY ระบบอันดับจะไม่ทำงาน");
      this.emitFile({ type: "asset", fileName, source });
    },
  };
}

// base: "./" ทำให้นำโฟลเดอร์ dist ไปวางไว้ที่ไหนของโฮสต์ก็ได้ (ใช้คู่กับ HashRouter)
export default defineConfig(({ mode }) => ({
  plugins: [react(), supabaseConfig(loadEnv(mode, process.cwd(), "VITE_"))],
  base: "./",
}));

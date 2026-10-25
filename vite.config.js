import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" ทำให้นำโฟลเดอร์ dist ไปวางไว้ที่ไหนของโฮสต์ก็ได้ (ใช้คู่กับ HashRouter)
export default defineConfig({
  plugins: [react()],
  base: "./",
});

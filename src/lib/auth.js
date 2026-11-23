// บัญชีผู้เล่น: ตัวจัดการจริงอยู่ที่ public/games/auth.js (โหลดใน index.html) เพื่อให้เว็บกับทุกเกมใช้ session เดียวกัน
import { useSyncExternalStore } from "react";

const noop = () => {};
const missing = {
  configured: () => false,
  getUser: () => null,
  onChange: () => noop,
  refreshProfile: async () => null,
};

export const auth = typeof window !== "undefined" && window.GameHubAuth ? window.GameHubAuth : missing;

// ผู้เล่นที่ Log in อยู่ ({ id, email, displayName }) หรือ null · อัปเดตเองเมื่อเข้า/ออกจากระบบจากแท็บหรือเกมไหนก็ได้
export function useUser() {
  return useSyncExternalStore(auth.onChange, auth.getUser, () => null);
}

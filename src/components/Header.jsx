import { Link } from "react-router-dom";
import { auth, useUser } from "../lib/auth.js";

export default function Header() {
  const user = useUser();

  return (
    <header className="site-header">
      <Link to="/" className="logo">
        <span className="logo-icon" aria-hidden="true">🎮</span>
        <span>บ้านเกมเรียนรู้</span>
      </Link>
      <nav className="header-links">
        <Link to="/ranking" className="btn rank-link">
          🏆 <span className="hide-sm">อันดับ</span>
        </Link>
        {user ? (
          <Link to="/account" className="btn account-link" title="บัญชีของฉัน">
            👤 <span className="account-name">{user.displayName || "บัญชีของฉัน"}</span>
          </Link>
        ) : (
          auth.configured() && (
            <Link to="/login" className="btn account-link">
              🔑 <span>เข้าสู่ระบบ</span>
            </Link>
          )
        )}
      </nav>
    </header>
  );
}

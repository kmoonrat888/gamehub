import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header className="site-header">
      <Link to="/" className="logo">
        <span className="logo-icon" aria-hidden="true">🎮</span>
        <span>บ้านเกมเรียนรู้</span>
      </Link>
    </header>
  );
}

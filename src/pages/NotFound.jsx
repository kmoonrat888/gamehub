import { useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header.jsx";

export default function NotFound() {
  useEffect(() => {
    document.title = "ไม่พบหน้านี้ · บ้านเกมเรียนรู้";
  }, []);

  return (
    <div className="page">
      <Header />
      <section className="not-found">
        <div className="big-emoji" aria-hidden="true">🙈</div>
        <h1>ไม่พบหน้านี้</h1>
        <p>เกมหรือหน้าที่ค้นหาอาจถูกย้ายหรือไม่มีอยู่แล้ว</p>
        <Link to="/" className="btn play-btn">🏠 กลับหน้ารวมเกม</Link>
      </section>
    </div>
  );
}

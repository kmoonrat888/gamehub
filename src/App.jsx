import { HashRouter, Route, Routes } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Play from "./pages/Play.jsx";
import NotFound from "./pages/NotFound.jsx";

// HashRouter (#/play/...) ใช้กับโฮสต์ static ได้ทุกเจ้า ไม่ต้องตั้งค่า rewrite ฝั่งเซิร์ฟเวอร์
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/c/:catId" element={<Home />} />
        <Route path="/play/:id" element={<Play />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </HashRouter>
  );
}

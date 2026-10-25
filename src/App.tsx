import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RoomsPage from "./pages/RoomsPage";

// The office pulls in the 3D engine, so it is only downloaded when someone joins a room.
const OfficePage = lazy(() => import("./pages/OfficePage"));

function OfficeLoading() {
  return (
    <div style={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", background: "#14261f", color: "#f4efe2", fontFamily: "DM Sans, sans-serif" }}>
      Opening the office…
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/rooms" element={<RoomsPage />} />
        <Route
          path="/office"
          element={
            <Suspense fallback={<OfficeLoading />}>
              <OfficePage />
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

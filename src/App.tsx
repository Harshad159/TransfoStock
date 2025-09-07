import React, { useEffect, useState } from "react";
import { HashRouter, Routes, Route, Link } from "react-router-dom";
import { InventoryProvider } from "./context/InventoryContext";
import Dashboard from "./screens/Dashboard";
import Inward from "./screens/Inward";
import Outward from "./screens/Outward";
import Overview from "./screens/Overview";   // used as Stock
import Reports from "./screens/Reports";
import Return from "./screens/Return";
import Alerts from "./screens/Alerts";
import BottomNav from "./components/BottomNav";
import Splash from "./components/Splash";

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 1200);
    return () => clearTimeout(t);
  }, []);

  return (
    <InventoryProvider>
      <HashRouter>
        {showSplash && <Splash />}
        <div className="pb-20">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/inward" element={<Inward />} />
            <Route path="/outward" element={<Outward />} />
            <Route path="/return" element={<Return />} />
            <Route path="/stock" element={<Overview />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/reports" element={<Reports />} />
            <Route
              path="*"
              element={
                <div className="p-6">
                  Not Found.{" "}
                  <Link className="text-blue-700" to="/">
                    Go Home
                  </Link>
                </div>
              }
            />
          </Routes>
          <BottomNav />
        </div>
      </HashRouter>
    </InventoryProvider>
  );
}

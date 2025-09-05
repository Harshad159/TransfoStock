import React from "react";
import { HashRouter, Routes, Route, Link } from "react-router-dom";
import { InventoryProvider } from "./context/InventoryContext";
import Dashboard from "./screens/Dashboard";
import Inward from "./screens/Inward";
import Outward from "./screens/Outward";
import Overview from "./screens/Overview";
import Reports from "./screens/Reports";
import BottomNav from "./components/BottomNav";

export default function App() {
  return (
    <InventoryProvider>
      <HashRouter>
        <div className="pb-16">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/inward" element={<Inward />} />
            <Route path="/outward" element={<Outward />} />
            <Route path="/overview" element={<Overview />} />
            <Route path="/reports" element={<Reports />} />
            <Route
              path="*"
              element={
                <div className="p-6">
                  Not Found. <Link className="text-blue-700" to="/">Go Home</Link>
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

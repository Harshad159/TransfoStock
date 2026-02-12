import React, { useMemo, useState } from "react";
import { HashRouter, Routes, Route, Link } from "react-router-dom";
import { InventoryProvider } from "./context/InventoryContext";

// Screens (match your actual files)
import Dashboard from "./screens/Dashboard";
import Inward from "./screens/Inward";
import Outward from "./screens/Outward";
import Return from "./screens/Return";
import Overview from "./screens/Overview"; // <-- IMPORTANT: use Overview here
import Alerts from "./screens/Alerts";
import Reports from "./screens/Reports";
import Login from "./screens/Login";

import BottomNav from "./components/BottomNav";

const AUTH_KEY = "transfostock_role";
type Role = "ADMIN" | "STOREKEEPER";

export default function App() {
  const [role, setRole] = useState<Role | null>(() => {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw === "ADMIN" || raw === "STOREKEEPER" ? raw : null;
  });

  const loginView = useMemo(
    () => <Login onLogin={(r: Role) => {
      localStorage.setItem(AUTH_KEY, r);
      setRole(r);
    }} />,
    []
  );

  return (
    <InventoryProvider>
      <HashRouter>
        {role ? (
          <div className="pb-20">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/inward" element={<Inward />} />
              <Route path="/outward" element={<Outward />} />
              <Route path="/return" element={<Return />} />
              <Route path="/stock" element={<Overview />} /> {/* Stock tab -> Overview */}
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
            <BottomNav
              onLogout={() => {
                localStorage.removeItem(AUTH_KEY);
                setRole(null);
              }}
            />
          </div>
        ) : (
          loginView
        )}
      </HashRouter>
    </InventoryProvider>
  );
}

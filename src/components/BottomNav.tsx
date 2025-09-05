import React from "react";
import { Link, useLocation } from "react-router-dom";

const tabs = [
  { to: "/", label: "Dashboard" },
  { to: "/inward", label: "Inward" },
  { to: "/outward", label: "Outward" },
  { to: "/overview", label: "Stock" },
  { to: "/reports", label: "Reports" },
];

export default function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
      <div className="max-w-4xl mx-auto grid grid-cols-5">
        {tabs.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className={"text-center py-3 text-sm " + (pathname === t.to ? "text-blue-700 font-medium" : "text-gray-600")}
          >
            {t.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

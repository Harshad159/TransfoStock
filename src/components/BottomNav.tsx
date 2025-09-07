import React from "react";
import { Link, useLocation } from "react-router-dom";

const tabs = [
  { to: "/", label: "Dashboard", icon: "home" },
  { to: "/inward", label: "Inward", icon: "login" },
  { to: "/outward", label: "Outward", icon: "logout" },
  { to: "/return", label: "Return", icon: "undo" },
  { to: "/stock", label: "Stock", icon: "menu" },
  { to: "/alerts", label: "Alerts", icon: "warning" },
  { to: "/reports", label: "Reports", icon: "sentiment_satisfied" },
];

export default function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
      <div className="max-w-6xl mx-auto grid grid-cols-7">
        {tabs.map((t) => {
          const active = pathname === t.to;
          return (
            <Link
              key={t.to}
              to={t.to}
              className={
                "flex flex-col items-center justify-center py-2 text-xs " +
                (active ? "text-orange-600 font-semibold" : "text-gray-600")
              }
            >
              <span className="material-icons mb-0.5">{t.icon}</span>
              <span>{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

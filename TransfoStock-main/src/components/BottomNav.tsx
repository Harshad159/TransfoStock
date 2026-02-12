import React from "react";
import { NavLink } from "react-router-dom";

type Item = {
  to: string;
  label: string;
  icon: string; // Material Symbols name
};

const items: Item[] = [
  { to: "/", label: "Dashboard", icon: "home" },
  { to: "/inward", label: "Inward", icon: "login" },
  { to: "/outward", label: "Outward", icon: "logout" },
  { to: "/return", label: "Return", icon: "undo" },
  { to: "/stock", label: "Stock", icon: "menu" },
  { to: "/alerts", label: "Alerts", icon: "warning" },
  { to: "/reports", label: "Reports", icon: "pending_actions" },
];

type BottomNavProps = {
  onLogout?: () => void;
};

export default function BottomNav({ onLogout }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/75 border-t border-slate-200">
      <div className="max-w-6xl mx-auto px-1 sm:px-2">
        <div className="grid grid-cols-8">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.to === "/"}
              className={({ isActive }) =>
                [
                  "flex flex-col items-center justify-center py-2.5 gap-1 text-[11px] font-medium transition-colors",
                  isActive ? "text-[#f97316]" : "text-slate-500 hover:text-slate-700",
                ].join(" ")
              }
            >
              <span className="material-symbols-rounded text-[22px] leading-none">
                {it.icon}
              </span>
              {it.label}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={onLogout}
            className="flex flex-col items-center justify-center py-2.5 gap-1 text-[11px] font-medium transition-colors text-slate-500 hover:text-slate-700"
          >
            <span className="material-symbols-rounded text-[22px] leading-none">
              logout
            </span>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

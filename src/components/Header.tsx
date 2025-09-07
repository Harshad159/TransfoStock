import React from "react";
import { useLocation } from "react-router-dom";

/**
 * Premium App Bar
 * - Gradient brand background (keeps your blue identity)
 * - Safe-area top padding for iOS
 * - Subtle elevation and tighter typography (Inter)
 */
export default function Header({ title }: { title: string }) {
  const location = useLocation();

  // Optional: derive nicer title from path if not provided
  const resolved =
    title ||
    ({
      "/": "Dashboard",
      "/inward": "Inward",
      "/outward": "Outward",
      "/return": "Return",
      "/stock": "Stock",
      "/alerts": "Alerts",
      "/reports": "Reports",
    } as Record<string, string>)[location.pathname] ||
    "TransfoStock";

  return (
    <header className="appbar safe-top sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4">
        <div className="h-16 flex items-center justify-between">
          <h1 className="text-white font-semibold tracking-tight text-xl sm:text-2xl">
            {resolved}
          </h1>

          {/* Brand name on the right, lighter opacity for elegance */}
          <div className="text-white/80 font-semibold tracking-wide text-base">
            TransfoStock
          </div>
        </div>
      </div>
    </header>
  );
}

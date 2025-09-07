import React, { useMemo, useState } from "react";
import Header from "./components/Header"; // blue app bar from previous message
import BottomNav from "./components/BottomNav";

// Screens
import Dashboard from "./screens/Dashboard";
import Inward from "./screens/Inward";
import Outward from "./screens/Outward";
import Return from "./screens/Return";
import Stock from "./screens/Stock";
import Alerts from "./screens/Alerts";
import Reports from "./screens/Reports";

// Context
import { InventoryProvider } from "./context/InventoryContext";

// Tabs we support
type Tab =
  | "dashboard"
  | "inward"
  | "outward"
  | "return"
  | "stock"
  | "alerts"
  | "reports";

const TAB_LABEL: Record<Tab, string> = {
  dashboard: "Dashboard",
  inward: "Inward",
  outward: "Outward",
  return: "Return",
  stock: "Stock",
  alerts: "Alerts",
  reports: "Reports",
};

const App: React.FC = () => {
  const [tab, setTab] = useState<Tab>("dashboard");

  const content = useMemo(() => {
    switch (tab) {
      case "inward":
        return <Inward />;
      case "outward":
        return <Outward />;
      case "return":
        return <Return />;
      case "stock":
        return <Stock />;
      case "alerts":
        return <Alerts />;
      case "reports":
        return <Reports />;
      default:
        return <Dashboard />;
    }
  }, [tab]);

  return (
    <InventoryProvider>
      <div className="min-h-screen flex flex-col bg-gray-50">
        {/* Top App Bar */}
        <Header />

        {/* Quick Action bars */}
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-4 space-y-3">
          <div
            className="w-full rounded-xl bg-green-500 text-white shadow-md cursor-pointer select-none"
            onClick={() => setTab("inward")}
            role="button"
            aria-label="Go to Inward"
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="material-symbols-rounded text-white">add</span>
              <span className="font-semibold">+ Inward</span>
            </div>
          </div>

          <div
            className="w-full rounded-xl bg-orange-500 text-white shadow-md cursor-pointer select-none"
            onClick={() => setTab("outward")}
            role="button"
            aria-label="Go to Outward"
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="material-symbols-rounded text-white">remove</span>
              <span className="font-semibold">- Outward</span>
            </div>
          </div>
        </div>

        {/* Title row (matches the selected tab) */}
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-3">
          <h2 className="sr-only">{TAB_LABEL[tab]}</h2>
        </div>

        {/* Main content */}
        <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-4 mb-24">
          {content}
        </main>

        {/* Bottom navigation
            If your BottomNav already controls navigation internally, just render it as <BottomNav />.
            If you want this App to drive it, you can update your BottomNav to accept props:
            <BottomNav active={tab} onChange={(t: Tab) => setTab(t)} />
        */}
        <div className="fixed z-20 bottom-0 inset-x-0 bg-white border-t border-gray-200">
          <BottomNav />
        </div>
      </div>
    </InventoryProvider>
  );
};

export default App;

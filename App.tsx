
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { InventoryProvider } from './context/InventoryContext';

import SplashScreen from './components/SplashScreen';
import BottomNav from './components/BottomNav';
import DashboardScreen from './screens/DashboardScreen';
import InwardEntryScreen from './screens/InwardEntryScreen';
import OutwardEntryScreen from './screens/OutwardEntryScreen';
import StockOverviewScreen from './screens/StockOverviewScreen';
import ReportsScreen from './screens/ReportsScreen';
import SettingsScreen from './screens/SettingsScreen';

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <SplashScreen />;
  }

  return (
    <InventoryProvider>
      <HashRouter>
        <div className="min-h-screen max-w-lg mx-auto flex flex-col font-sans bg-background">
          <main className="flex-grow pb-20">
            <Routes>
              <Route path="/" element={<DashboardScreen />} />
              <Route path="/inward" element={<InwardEntryScreen />} />
              <Route path="/outward" element={<OutwardEntryScreen />} />
              <Route path="/overview" element={<StockOverviewScreen />} />
              <Route path="/reports" element={<ReportsScreen />} />
              <Route path="/settings" element={<SettingsScreen />} />
            </Routes>
          </main>
          <BottomNav />
        </div>
      </HashRouter>
    </InventoryProvider>
  );
};

export default App;

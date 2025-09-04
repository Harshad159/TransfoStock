
import React from 'react';

const TransformerIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-primary animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3" />
      <path d="M6 4H3a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h3" />
      <path d="M12 6V4" />
      <path d="M12 20v-2" />
      <path d="M12 12V9" />
      <path d="M12 15v-3" />
      <path d="M4 9h4" />
      <path d="M4 15h4" />
      <path d="M16 9h4" />
      <path d="M16 15h4" />
    </svg>
);


const SplashScreen: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-surface">
      <div className="flex flex-col items-center justify-center animate-fade-in-scale">
        <TransformerIcon />
        <h1 className="text-4xl font-bold text-primary mt-4">TransfoStock</h1>
        <p className="text-text-secondary mt-2">Inventory Management</p>
      </div>
      <style>{`
        @keyframes fade-in-scale {
          0% {
            opacity: 0;
            transform: scale(0.9);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in-scale {
          animation: fade-in-scale 1.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;

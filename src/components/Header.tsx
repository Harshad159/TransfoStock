import React from "react";

const Header: React.FC = () => {
  return (
    <header className="w-full bg-blue-600 shadow-md">
      <div className="max-w-7xl mx-auto flex justify-between items-center px-4 py-3">
        {/* Section Title */}
        <h1 className="text-lg md:text-xl font-bold text-white">
          Dashboard
        </h1>

        {/* App Name */}
        <span className="text-base md:text-lg font-semibold tracking-wide text-white/90">
          TransfoStock
        </span>
      </div>
    </header>
  );
};

export default Header;

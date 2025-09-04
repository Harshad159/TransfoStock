
import React from 'react';

interface HeaderProps {
  title: string;
  children?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({ title, children }) => {
  return (
    <header className="bg-surface shadow-sm sticky top-0 z-10 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-primary">{title}</h1>
        <div>{children}</div>
      </div>
    </header>
  );
};

export default Header;

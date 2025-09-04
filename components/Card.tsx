
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '', title }) => {
  return (
    <div className={`bg-surface rounded-lg shadow-md p-4 ${className}`}>
      {title && <h2 className="text-lg font-bold text-text-primary mb-3 border-b pb-2">{title}</h2>}
      {children}
    </div>
  );
};

export default Card;

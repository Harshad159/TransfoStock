import React from "react";
export default function Header({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-10 bg-blue-900 text-white border-b border-blue-800">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold">{title}</h1>
        <div className="text-xs opacity-80">TransfoStock</div>
      </div>
    </header>
  );
}

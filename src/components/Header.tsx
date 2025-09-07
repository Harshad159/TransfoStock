// /src/components/Header.tsx
import React from "react";

// Simple page header. Pass the current page title via `title`.
interface HeaderProps {
  title: string;
  rightSlot?: React.ReactNode; // optional controls/actions placed on the right
}

export default function Header({ title, rightSlot }: HeaderProps) {
  return (
    <header className="bg-blue-900 text-white px-4 py-3 flex items-center justify-between">
      <h1 className="text-lg font-semibold">{title}</h1>
      <div className="text-sm font-medium">{rightSlot ?? "TransfoStock"}</div>
    </header>
  );
}

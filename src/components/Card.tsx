import React from "react";
export default function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">{children}</div>;
}

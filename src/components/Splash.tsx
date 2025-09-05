import React from "react";

/**
 * Fullscreen splash shown briefly before the app UI loads.
 * Uses the repo base URL so it works in Vite dev and GitHub Pages.
 */
export default function Splash() {
  const logo = `${import.meta.env.BASE_URL}icons/icon-512.png`; // resolves to /TransfoStock/icons/icon-512.png on Pages

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <img
          src={logo}
          alt="TransfoStock"
          width={120}
          height={120}
          className="rounded-2xl"
        />
        <h1 className="text-2xl font-semibold text-blue-900">TransfoStock</h1>
        <p className="text-gray-500 text-sm">loading…</p>
      </div>
    </div>
  );
}

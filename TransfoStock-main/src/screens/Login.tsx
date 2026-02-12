import React, { useMemo, useState } from "react";

type Role = "ADMIN" | "STOREKEEPER";

type LoginProps = {
  onLogin: (role: Role) => void;
};

type RoleCard = {
  id: Role;
  title: string;
  subtitle: string;
  icon: string;
};

const ROLES: RoleCard[] = [
  {
    id: "ADMIN",
    title: "Administrator",
    subtitle: "Stock, Dispatch & Reports",
    icon: "shield",
  },
  {
    id: "STOREKEEPER",
    title: "Store Keeper",
    subtitle: "Inward & Outward Manifest",
    icon: "inventory_2",
  },
];

const PASSWORDS: Record<Role, string> = {
  ADMIN: "6600",
  STOREKEEPER: "7125",
};

export default function Login({ onLogin }: LoginProps) {
  const [selected, setSelected] = useState<Role | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const logo = useMemo(
    () => `${import.meta.env.BASE_URL}icons/narsinha-logo.png`,
    []
  );

  function chooseRole(role: Role) {
    setSelected(role);
    setPassword("");
    setError("");
  }

  function submit() {
    if (!selected) return;
    if (password !== PASSWORDS[selected]) {
      setError("Incorrect password.");
      return;
    }
    onLogin(selected);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex flex-col items-center text-center gap-4">
          <img
            src={logo}
            alt="Narsinha Engineering Works"
            width={88}
            height={88}
            className="rounded-2xl"
          />
          <div>
            <div className="text-3xl font-extrabold tracking-tight">
              Narsinha
            </div>
            <div className="text-xs font-semibold tracking-[0.35em] text-blue-700 uppercase">
              Operations Terminal
            </div>
          </div>
          <div className="text-sm text-slate-500 font-semibold uppercase tracking-[0.25em] mt-6">
            Select Access Level
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-5">
          {ROLES.map((role) => {
            const isActive = selected === role.id;
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => chooseRole(role.id)}
                className={
                  "w-full flex items-center justify-between rounded-3xl border px-6 py-5 shadow-sm transition " +
                  (isActive
                    ? "border-blue-500 bg-white shadow-md"
                    : "border-slate-200 bg-white hover:border-slate-300")
                }
              >
                <div className="flex items-center gap-4">
                  <div
                    className={
                      "h-14 w-14 rounded-2xl flex items-center justify-center " +
                      (role.id === "ADMIN" ? "bg-orange-50" : "bg-blue-50")
                    }
                  >
                    <span
                      className={
                        "material-symbols-rounded text-3xl " +
                        (role.id === "ADMIN" ? "text-orange-500" : "text-blue-500")
                      }
                    >
                      {role.icon}
                    </span>
                  </div>
                  <div className="text-left">
                    <div className="text-xl font-bold uppercase tracking-wide">
                      {role.title}
                    </div>
                    <div className="text-sm text-slate-500 font-semibold">
                      {role.subtitle}
                    </div>
                  </div>
                </div>

                <span className="material-symbols-rounded text-3xl text-slate-300">
                  chevron_right
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-8 max-w-md mx-auto">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-slate-600 mb-2">
              {selected ? `Enter ${selected === "ADMIN" ? "Administrator" : "Store Keeper"} Password` : "Choose a role to continue"}
            </div>
            <input
              type="password"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={!selected}
            />
            {error && (
              <div className="mt-2 text-sm text-red-600 font-semibold">{error}</div>
            )}
            <button
              type="button"
              onClick={submit}
              disabled={!selected || !password}
              className="mt-4 w-full rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-semibold py-3"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

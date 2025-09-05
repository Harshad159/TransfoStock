import React from "react";
export default function NumberField({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm text-gray-700">{label}</span>
      <input
        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
        type="number"
        value={Number.isFinite(value) ? value : ""}
        step={step}
        min={min}
        onChange={(e) => onChange(parseFloat(e.target.value || "0"))}
      />
    </label>
  );
}

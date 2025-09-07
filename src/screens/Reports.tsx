// /src/screens/Reports.tsx
import React, { useMemo, useState } from "react";
import Header from "../components/Header";
import Card from "../components/Card";
import { useInventory } from "../context/InventoryContext";
import type { InventoryItem, StockMovement } from "../types";

/**
 * We flatten each item's history into rows the report can display/filter/export.
 * Movement types expected in this app:
 *  - "INWARD"
 *  - "OUTWARD_SITE"
 *  - "OUTWARD_FACTORY"
 *  - "RETURN"
 */

type FlatRow = {
  id: string;
  date: string; // ISO string
  itemName: string;
  unit: string;
  type: "INWARD" | "OUTWARD_SITE" | "OUTWARD_FACTORY" | "RETURN";
  quantity: number;
  // freeform details string (whatever was saved in the note)
  details: string;
};

// Parse a movement.note into separate columns To/Labor/WO/Scheme when present
function parseSiteDetails(details: string) {
  // examples we try to support:
  // "To: XYZ | Labor: John | WO: 44 | Scheme: IPDS"
  // "To XYZ (Labor Jane) WO 44 Scheme IPDS"
  const out = { to: "", labor: "", wo: "", scheme: "" };

  const norm = details.replace(/\s+/g, " ").trim();

  const mTo = norm.match(/(?:^|\b)to[:\s]\s*([^|()]+?)(?=\s*(?:\(|\||$))/i);
  if (mTo) out.to = mTo[1].trim();

  const mLabor = norm.match(/labor[:\s]\s*([^|()]+?)(?=\s*(?:\(|\||$))/i);
  if (mLabor) out.labor = mLabor[1].trim();

  const mWO = norm.match(/\bwo[:\s]\s*([A-Za-z0-9\-_/]+)/i);
  if (mWO) out.wo = mWO[1].trim();

  const mScheme = norm.match(/scheme[:\s]\s*([^|()]+?)(?=\s*(?:\(|\||$))/i);
  if (mScheme) out.scheme = mScheme[1].trim();

  return out;
}

export default function Reports() {
  const { state } = useInventory();

  // Build flat rows from item histories
  const allRows: FlatRow[] = useMemo(() => {
    const rows: FlatRow[] = [];
    state.items.forEach((item: InventoryItem) => {
      (item.history || []).forEach((mv: StockMovement) => {
        rows.push({
          id: mv.id,
          date: mv.date, // ISO
          itemName: item.name,
          unit: item.unit,
          type: mv.type as FlatRow["type"],
          quantity: mv.quantity || 0,
          details: mv.note || "",
        });
      });
    });
    // sort newest first
    rows.sort((a, b) => (a.date < b.date ? 1 : -1));
    return rows;
  }, [state.items]);

  // Report filters
  const FILTERS = [
    "All Transactions",
    "Inward",
    "Outward (All)",
    "Site Material Issued",
    "Factory Material Issued",
    "Return",
    "Low Stock Report",
  ] as const;
  type FilterType = (typeof FILTERS)[number];

  const [filter, setFilter] = useState<FilterType>("Site Material Issued");
  const [laborFilter, setLaborFilter] = useState<string>("All Labors");

  // Create a unique list of labors found in OUTWARD_SITE rows
  const laborOptions = useMemo(() => {
    const set = new Set<string>();
    allRows
      .filter((r) => r.type === "OUTWARD_SITE")
      .forEach((r) => {
        const { labor } = parseSiteDetails(r.details);
        if (labor) set.add(labor);
      });
    return ["All Labors", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [allRows]);

  // Apply filters
  const viewRows = useMemo(() => {
    let base = allRows;

    switch (filter) {
      case "Inward":
        base = base.filter((r) => r.type === "INWARD");
        break;
      case "Outward (All)":
        base = base.filter(
          (r) => r.type === "OUTWARD_SITE" || r.type === "OUTWARD_FACTORY"
        );
        break;
      case "Site Material Issued":
        base = base.filter((r) => r.type === "OUTWARD_SITE");
        if (laborFilter !== "All Labors") {
          base = base.filter(
            (r) => parseSiteDetails(r.details).labor === laborFilter
          );
        }
        break;
      case "Factory Material Issued":
        base = base.filter((r) => r.type === "OUTWARD_FACTORY");
        break;
      case "Return":
        base = base.filter((r) => r.type === "RETURN");
        break;
      case "Low Stock Report":
        // handled separately below
        break;
    }

    return base;
  }, [allRows, filter, laborFilter]);

  // Low stock data
  const lowStock = useMemo(() => {
    if (filter !== "Low Stock Report") return [];
    return state.items
      .filter(
        (i) => (i.currentStock ?? 0) <= (i.reorderLevel ?? 0)
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [filter, state.items]);

  // CSV export
  function exportCSV() {
    if (filter === "Low Stock Report") {
      const rows = [
        ["Item Name", "Unit", "Current Stock", "Reorder Level"],
        ...lowStock.map((i) => [
          i.name,
          i.unit,
          String(i.currentStock ?? 0),
          String(i.reorderLevel ?? 0),
        ]),
      ];
      downloadCSV(rows, "low_stock_report.csv");
      return;
    }

    // For site issued, include separate columns
    if (filter === "Site Material Issued") {
      const rows = [
        ["Date", "Item Name", "Quantity", "Unit", "To", "Labor", "WO", "Scheme"],
        ...viewRows.map((r) => {
          const { to, labor, wo, scheme } = parseSiteDetails(r.details);
          return [
            new Date(r.date).toLocaleDateString(),
            r.itemName,
            String(r.quantity),
            r.unit,
            to,
            labor,
            wo,
            scheme,
          ];
        }),
      ];
      downloadCSV(rows, "site_material_issued.csv");
      return;
    }

    // Generic export for other filters
    const rows = [
      ["Date", "Item Name", "Type", "Quantity", "Unit", "Details"],
      ...viewRows.map((r) => [
        new Date(r.date).toLocaleDateString(),
        r.itemName,
        r.type,
        String(r.quantity),
        r.unit,
        r.details.replace(/\n/g, " "),
      ]),
    ];
    downloadCSV(rows, "transfostock_reports.csv");
  }

  function downloadCSV(rows: (string | number)[][], filename: string) {
    const csv = rows
      .map((r) =>
        r
          .map((cell) => {
            const s = String(cell ?? "");
            const needsQuote = /[",\n]/.test(s);
            const safe = s.replace(/"/g, '""');
            return needsQuote ? `"${safe}"` : safe;
          })
          .join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const showLaborDropdown = filter === "Site Material Issued";

  return (
    <div className="pb-24">
      <Header title="Reports" />
      <div className="max-w-6xl mx-auto p-4">
        <Card>
          {/* Top toolbar */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <h2 className="text-2xl font-semibold">Reports</h2>

            <div className="flex flex-col md:flex-row gap-3">
              {/* Main filter */}
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
              >
                {(
                  [
                    "All Transactions",
                    "Inward",
                    "Outward (All)",
                    "Site Material Issued",
                    "Factory Material Issued",
                    "Return",
                    "Low Stock Report",
                  ] as FilterType[]
                ).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>

              {/* Labor dropdown only for Site Material Issued */}
              <select
                value={laborFilter}
                onChange={(e) => setLaborFilter(e.target.value)}
                disabled={!showLaborDropdown}
                className={`bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none ${
                  !showLaborDropdown ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {laborOptions.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>

              <button
                onClick={exportCSV}
                className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium"
              >
                Export
              </button>
            </div>
          </div>

          {/* CONTENT */}
          {filter === "Low Stock Report" ? (
            // ---------- LOW STOCK TABLE ----------
            <div className="overflow-x-auto">
              <div className="min-w-[620px]">
                <div className="grid grid-cols-12 bg-rose-100 text-rose-900 font-semibold rounded-md px-4 py-3 text-sm">
                  <div className="col-span-5">ITEM NAME</div>
                  <div className="col-span-2">UNIT</div>
                  <div className="col-span-2">CURRENT STOCK</div>
                  <div className="col-span-3">REORDER LEVEL</div>
                </div>

                {lowStock.length === 0 ? (
                  <div className="text-center py-10 text-green-600 font-semibold">
                    All Good! No items are currently below their reorder level.
                  </div>
                ) : (
                  <div className="divide-y">
                    {lowStock.map((i) => (
                      <div
                        key={i.id}
                        className="grid grid-cols-12 px-4 py-3 text-sm"
                      >
                        <div className="col-span-5 truncate font-medium">
                          {i.name}
                        </div>
                        <div className="col-span-2">{i.unit}</div>
                        <div className="col-span-2">
                          {i.currentStock ?? 0}
                        </div>
                        <div className="col-span-3 text-red-600 font-semibold">
                          {i.reorderLevel ?? 0}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            // ---------- MOVEMENTS TABLE ----------
            <div className="overflow-x-auto">
              <div className="min-w-[740px]">
                <div className="grid grid-cols-12 bg-gray-200 text-gray-800 font-semibold rounded-md px-4 py-3 text-sm">
                  <div className="col-span-2">DATE</div>
                  <div className="col-span-3">ITEM NAME</div>
                  <div className="col-span-2">TYPE</div>
                  <div className="col-span-2">QUANTITY</div>
                  {filter === "Site Material Issued" ? (
                    <>
                      <div className="col-span-3">DETAILS (To / Labor / WO / Scheme)</div>
                    </>
                  ) : (
                    <div className="col-span-3">DETAILS</div>
                  )}
                </div>

                {viewRows.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">
                    No entries.
                  </div>
                ) : (
                  <div className="divide-y">
                    {viewRows.map((r) => {
                      const d = new Date(r.date).toLocaleDateString();
                      const site = parseSiteDetails(r.details);
                      return (
                        <div
                          key={r.id}
                          className="grid grid-cols-12 px-4 py-3 text-sm"
                        >
                          <div className="col-span-2">{d}</div>
                          <div className="col-span-3 truncate font-medium">
                            {r.itemName}
                          </div>
                          <div className="col-span-2">
                            {r.type.replace("OUTWARD_", "OUTWARD ")}
                          </div>
                          <div className="col-span-2">
                            {r.quantity} {r.unit}
                          </div>
                          <div className="col-span-3 truncate">
                            {filter === "Site Material Issued"
                              ? [
                                  site.to && `To: ${site.to}`,
                                  site.labor && `Labor: ${site.labor}`,
                                  site.wo && `WO: ${site.wo}`,
                                  site.scheme && `Scheme: ${site.scheme}`,
                                ]
                                  .filter(Boolean)
                                  .join(" | ") || r.details
                              : r.details}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

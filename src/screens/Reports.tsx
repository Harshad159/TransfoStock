import React, { useMemo, useState } from "react";
import Header from "../components/Header";
import Card from "../components/Card";
import { useInventory } from "../context/InventoryContext";
import type { StockMovement } from "../types";

// --------- helpers ----------
function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString();
}

type View =
  | "ALL"
  | "INWARD"
  | "OUTWARD_ALL"
  | "OUTWARD_SITE"
  | "OUTWARD_FACTORY"
  | "RETURN"
  | "LOW_STOCK";

function parseSiteNote(note: string | undefined) {
  // expected from Outward.tsx: "Site Issue | Given To: <site> | Work Order: <wo> | Labor: <labor> | Scheme: <scheme>"
  const obj: Record<string, string> = {};
  if (!note || !note.startsWith("Site Issue")) return obj;
  const parts = note.split("|").map((s) => s.trim());
  for (const p of parts.slice(1)) {
    const [k, ...rest] = p.split(":");
    obj[k.trim()] = rest.join(":").trim();
  }
  return obj; // { 'Given To': 'Site A', 'Work Order': 'WO-1', 'Labor': 'John', 'Scheme': 'IPDS' }
}

function isSiteOutward(m: StockMovement) {
  return m.type === "OUTWARD" && (m.note || "").startsWith("Site Issue");
}
function isFactoryOutward(m: StockMovement) {
  return m.type === "OUTWARD" && (m.note || "").startsWith("Factory Issue");
}

function exportCSV(rows: string[][], filename: string) {
  const csv = rows
    .map((r) =>
      r
        .map((cell) => {
          const s = String(cell ?? "");
          const needs = /[",\n]/.test(s);
          return needs ? `"${s.replace(/"/g, '""')}"` : s;
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

// --------- component ----------
export default function Reports() {
  const { state } = useInventory();

  const [view, setView] = useState<View>("OUTWARD_SITE"); // default as your screenshot
  const [laborFilter, setLaborFilter] = useState<string>("__ALL__");

  const movementsSorted = useMemo(
    () =>
      [...state.movements].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [state.movements]
  );

  // Collect all labor names from site outward notes (for dropdown)
  const allLaborNames = useMemo(() => {
    const set = new Set<string>();
    for (const m of movementsSorted) {
      if (isSiteOutward(m)) {
        const meta = parseSiteNote(m.note);
        const lb = meta["Labor"];
        if (lb) set.add(lb);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [movementsSorted]);

  // Filtered rows for the table
  const rows = useMemo(() => {
    if (view === "LOW_STOCK") return []; // handled separately

    let list = movementsSorted.filter((m) => {
      switch (view) {
        case "ALL":
          return true;
        case "INWARD":
          return m.type === "INWARD" || m.type === "RETURN";
        case "RETURN":
          return m.type === "RETURN";
        case "OUTWARD_ALL":
          return m.type === "OUTWARD";
        case "OUTWARD_SITE":
          return isSiteOutward(m);
        case "OUTWARD_FACTORY":
          return isFactoryOutward(m);
        default:
          return true;
      }
    });

    if (view === "OUTWARD_SITE" && laborFilter !== "__ALL__") {
      list = list.filter((m) => parseSiteNote(m.note)["Labor"] === laborFilter);
    }

    // Build display rows with derived fields
    return list.map((m) => {
      const typeBadge =
        m.type === "INWARD"
          ? "INWARD"
          : m.type === "RETURN"
          ? "RETURN"
          : isSiteOutward(m)
          ? "OUTWARD (SITE)"
          : isFactoryOutward(m)
          ? "OUTWARD (FACTORY)"
          : "OUTWARD";

      const meta = parseSiteNote(m.note);
      const detailsSite =
        meta["Given To"] || meta["Labor"] || meta["Work Order"] || meta["Scheme"];

      let details = m.note || "";
      if (isSiteOutward(m)) {
        const line1 = `To: ${meta["Given To"] || "-"}` + (meta["Labor"] ? ` (Labor: ${meta["Labor"]})` : "");
        const line2 =
          (meta["Work Order"] ? `WO: ${meta["Work Order"]}` : "") +
          (meta["Scheme"] ? `${meta["Work Order"] ? " | " : ""}Scheme: ${meta["Scheme"]}` : "");
        details = line1 + (line2 ? `\n${line2}` : "");
      }

      return {
        date: fmtDate(m.date),
        itemName: (m as any).itemName || "—",
        typeBadge,
        qty: m.quantity,
        details,
      };
    });
  }, [movementsSorted, view, laborFilter]);

  const showLabor = view === "OUTWARD_SITE";

  function doExport() {
    if (view === "LOW_STOCK") {
      const rows = [
        ["Item Name", "Unit", "Current Stock", "Reorder Level"],
        ...state.items
          .filter((i) => (i.currentStock ?? 0) <= (i.reorderLevel ?? -1))
          .map((i) => [i.name, i.unit, String(i.currentStock ?? 0), String(i.reorderLevel ?? 0)]),
      ];
      exportCSV(rows, "low_stock_report.csv");
      return;
    }

    const header = ["Date", "Item Name", "Type", "Quantity", "Details"];
    const data = rows.map((r) => [r.date, r.itemName, r.typeBadge, String(r.qty), r.details.replace(/\n/g, " | ")]);
    exportCSV([header, ...data], "transactions_report.csv");
  }

  return (
    <div className="pb-24">
      <Header title="Reports" />
      <div className="max-w-6xl mx-auto p-4">
        <Card>
          {/* toolbar */}
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <h2 className="text-2xl font-semibold">Reports</h2>

            <div className="flex items-center gap-3">
              {/* main filter */}
              <select
                className="bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                value={view}
                onChange={(e) => {
                  setView(e.target.value as View);
                  setLaborFilter("__ALL__");
                }}
              >
                <option value="ALL">All Transactions</option>
                <option value="INWARD">Inward</option>
                <option value="OUTWARD_ALL">Outward (All)</option>
                <option value="OUTWARD_SITE">Site Material Issued</option>
                <option value="OUTWARD_FACTORY">Factory Material Issued</option>
                <option value="RETURN">Return</option>
                <option value="LOW_STOCK">Low Stock Report</option>
              </select>

              {/* labor filter (only for Site Material Issued) */}
              {showLabor ? (
                <select
                  className="bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                  value={laborFilter}
                  onChange={(e) => setLaborFilter(e.target.value)}
                >
                  <option value="__ALL__">All Labors</option>
                  {allLaborNames.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              ) : null}

              <button
                onClick={doExport}
                className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium"
              >
                Export
              </button>
            </div>
          </div>

          {/* header row */}
          <div className="grid grid-cols-12 bg-gray-200 text-gray-800 font-semibold rounded-md px-4 py-3">
            <div className="col-span-2">DATE</div>
            <div className="col-span-4">ITEM NAME</div>
            <div className="col-span-2">TYPE</div>
            <div className="col-span-2">QUANTITY</div>
            <div className="col-span-2">DETAILS</div>
          </div>

          {/* content */}
          {view === "LOW_STOCK" ? (
            <div className="divide-y">
              {state.items
                .filter((i) => (i.currentStock ?? 0) <= (i.reorderLevel ?? -1))
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((i) => (
                  <div key={i.id} className="grid grid-cols-12 px-4 py-3">
                    <div className="col-span-2">—</div>
                    <div className="col-span-4 font-medium">{i.name}</div>
                    <div className="col-span-2 text-red-700 font-semibold">LOW STOCK</div>
                    <div className="col-span-2">
                      {i.currentStock ?? 0} / ≤ {i.reorderLevel ?? 0}
                    </div>
                    <div className="col-span-2 truncate">{i.unit}</div>
                  </div>
                ))}
              {state.items.filter((i) => (i.currentStock ?? 0) <= (i.reorderLevel ?? -1)).length === 0 && (
                <div className="px-4 py-6 text-gray-600">No low stock items.</div>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {rows.map((r, idx) => (
                <div key={idx} className="grid grid-cols-12 px-4 py-3">
                  <div className="col-span-2">{r.date}</div>
                  <div className="col-span-4 font-medium">{r.itemName}</div>
                  <div className="col-span-2">
                    <span
                      className={
                        "px-2 py-1 rounded-full text-xs font-semibold " +
                        (r.typeBadge.includes("OUTWARD")
                          ? "bg-orange-100 text-orange-700"
                          : r.typeBadge === "INWARD"
                          ? "bg-green-100 text-green-700"
                          : r.typeBadge === "RETURN"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-700")
                      }
                    >
                      {r.typeBadge}
                    </span>
                  </div>
                  <div className="col-span-2 font-semibold">{r.qty}</div>
                  <div className="col-span-2 whitespace-pre-line truncate">{r.details}</div>
                </div>
              ))}
              {rows.length === 0 && <div className="px-4 py-6 text-gray-600">No entries.</div>}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

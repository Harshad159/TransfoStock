import React, { useMemo, useState } from "react";
import Header from "../components/Header";
import Card from "../components/Card";
import { useInventory } from "../context/InventoryContext";

/**
 * We read movements directly from state.movements.
 * This component assumes each movement looks like (shape is flexible):
 * {
 *   id: string
 *   type: "INWARD" | "OUTWARD_FACTORY" | "OUTWARD_SITE" | "RETURN"
 *   date: string (ISO)    // the *transaction* date (e.g. inward date or outward date)
 *   quantity: number
 *   note?: string
 *   itemId?: string
 *   unit?: string  (optional; if not, we derive from item)
 *   meta?: {
 *      // Inward extras
 *      purchaser?: string; billNo?: string; billDate?: string; pricePerUnit?: number;
 *      // Outward (site)
 *      toSite?: string; laborName?: string; workOrder?: string; scheme?: string;
 *      // Outward (factory)
 *      toDept?: string; issueEmployee?: string;
 *   }
 * }
 */

function fmt(d: string) {
  try {
    const x = new Date(d);
    return x.toLocaleDateString(undefined, { year: "numeric", month: "numeric", day: "numeric" });
  } catch {
    return d;
  }
}

type View =
  | "ALL"
  | "INWARD"
  | "OUTWARD_ALL"
  | "OUTWARD_SITE"
  | "OUTWARD_FACTORY"
  | "RETURN";

export default function Reports() {
  const { state } = useInventory();

  const [view, setView] = useState<View>("ALL");
  const [laborFilter, setLaborFilter] = useState<string>("__ALL__");

  // Build a map itemId -> item for quick lookups
  const itemById = useMemo(() => {
    const m = new Map<string, any>();
    for (const it of state.items as any[]) m.set(it.id, it);
    return m;
  }, [state.items]);

  // Unique labors list for Site Material Issued
  const allLabors = useMemo(() => {
    const set = new Set<string>();
    for (const mv of state.movements as any[]) {
      if (mv.type === "OUTWARD_SITE" && mv?.meta?.laborName) set.add(mv.meta.laborName);
    }
    return ["__ALL__", ...Array.from(set)];
  }, [state.movements]);

  const rows = useMemo(() => {
    const data = (state.movements as any[]).slice();

    // Filter by view
    let filtered = data;
    switch (view) {
      case "INWARD":
        filtered = data.filter((m) => m.type === "INWARD");
        break;
      case "RETURN":
        filtered = data.filter((m) => m.type === "RETURN");
        break;
      case "OUTWARD_ALL":
        filtered = data.filter((m) => m.type === "OUTWARD_SITE" || m.type === "OUTWARD_FACTORY");
        break;
      case "OUTWARD_SITE":
        filtered = data.filter((m) => m.type === "OUTWARD_SITE");
        break;
      case "OUTWARD_FACTORY":
        filtered = data.filter((m) => m.type === "OUTWARD_FACTORY");
        break;
      default:
        // ALL
        filtered = data;
    }

    // Labor filter (only for site)
    if ((view === "OUTWARD_SITE" || view === "OUTWARD_ALL") && laborFilter !== "__ALL__") {
      filtered = filtered.filter(
        (m) => m.type !== "OUTWARD_SITE" || m?.meta?.laborName === laborFilter
      );
    }

    // Normalize to a renderable row
    return filtered
      .map((m) => {
        const item = m.itemId ? itemById.get(m.itemId) : undefined;
        return {
          id: m.id,
          date: m.date,
          itemName: item?.name ?? "",
          unit: (m.unit ?? item?.unit) || "",
          qty: m.quantity ?? 0,
          type: m.type,
          meta: m.meta || {},
          note: m.note || "",
        };
      })
      .sort((a, b) => (a.date > b.date ? -1 : 1)); // latest first
  }, [state.movements, itemById, view, laborFilter]);

  // Export CSV according to current view
  function exportCSV() {
    let header: string[] = [];
    let matrix: string[][] = [];

    if (view === "INWARD") {
      header = [
        "Inward Date",
        "Item Name",
        "Unit",
        "Qty",
        "Price per Unit",
        "Purchaser",
        "Bill No.",
        "Bill Date",
      ];
      matrix = rows.map((r) => [
        fmt(r.date),
        r.itemName,
        r.unit,
        String(r.qty),
        String(r.meta?.pricePerUnit ?? ""),
        String(r.meta?.purchaser ?? ""),
        String(r.meta?.billNo ?? ""),
        String(r.meta?.billDate ?? ""),
      ]);
    } else if (view === "OUTWARD_SITE") {
      header = ["Date", "Item Name", "Unit", "Qty", "To / Site", "Labor", "WO", "Scheme"];
      matrix = rows.map((r) => [
        fmt(r.date),
        r.itemName,
        r.unit,
        String(r.qty),
        String(r.meta?.toSite ?? ""),
        String(r.meta?.laborName ?? ""),
        String(r.meta?.workOrder ?? ""),
        String(r.meta?.scheme ?? ""),
      ]);
    } else if (view === "OUTWARD_FACTORY") {
      header = ["Date", "Item Name", "Unit", "Qty", "Dept", "Issue To Employee"];
      matrix = rows.map((r) => [
        fmt(r.date),
        r.itemName,
        r.unit,
        String(r.qty),
        String(r.meta?.toDept ?? ""),
        String(r.meta?.issueEmployee ?? ""),
      ]);
    } else if (view === "RETURN") {
      header = ["Date", "Item Name", "Unit", "Qty", "Returned From / Note"];
      matrix = rows.map((r) => [fmt(r.date), r.itemName, r.unit, String(r.qty), String(r.note)]);
    } else if (view === "OUTWARD_ALL") {
      header = ["Date", "Item Name", "Unit", "Qty", "Type", "To / Dept / Site", "Labor / WO / Scheme"];
      matrix = rows.map((r) => [
        fmt(r.date),
        r.itemName,
        r.unit,
        String(r.qty),
        r.type,
        r.type === "OUTWARD_FACTORY" ? String(r.meta?.toDept ?? "") : String(r.meta?.toSite ?? ""),
        r.type === "OUTWARD_SITE"
          ? `${r.meta?.laborName ?? ""} | ${r.meta?.workOrder ?? ""} | ${r.meta?.scheme ?? ""}`
          : String(r.meta?.issueEmployee ?? ""),
      ]);
    } else {
      // ALL
      header = ["Date", "Item Name", "Unit", "Qty", "Type / Note"];
      matrix = rows.map((r) => [fmt(r.date), r.itemName, r.unit, String(r.qty), r.type]);
    }

    const csv =
      [header, ...matrix]
        .map((row) =>
          row
            .map((cell) => {
              const s = String(cell ?? "");
              return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
            })
            .join(",")
        )
        .join("\n") + "\n";

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "reports_export.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="pb-24">
      <Header title="Reports" />
      <div className="max-w-6xl mx-auto p-4">
        <Card>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <select
              className="bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
              value={view}
              onChange={(e) => setView(e.target.value as View)}
            >
              <option value="ALL">All Transactions</option>
              <option value="INWARD">Inward</option>
              <option value="OUTWARD_ALL">Outward (All)</option>
              <option value="OUTWARD_SITE">Site Material Issued</option>
              <option value="OUTWARD_FACTORY">Factory Material Issued</option>
              <option value="RETURN">Return</option>
            </select>

            {(view === "OUTWARD_SITE" || view === "OUTWARD_ALL") && (
              <select
                className="bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                value={laborFilter}
                onChange={(e) => setLaborFilter(e.target.value)}
              >
                {allLabors.map((lb) => (
                  <option key={lb} value={lb}>
                    {lb === "__ALL__" ? "All Labors" : lb}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={exportCSV}
              className="ml-auto px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium"
            >
              Export
            </button>
          </div>

          {/* Table header — responsive, non-overlapping */}
          <div className="grid grid-cols-12 bg-gray-200 text-gray-800 font-semibold rounded-md px-4 py-3">
            <div className="col-span-2">DATE</div>
            <div className="col-span-4">ITEM NAME</div>
            <div className="col-span-1">UNIT</div>
            <div className="col-span-1">QTY</div>
            <div className="col-span-4">
              {view === "INWARD"
                ? "PRICE / PURCHASER / BILL"
                : view === "OUTWARD_SITE"
                ? "TO / LABOR / WO / SCHEME"
                : view === "OUTWARD_FACTORY"
                ? "DEPT / EMPLOYEE"
                : view === "RETURN"
                ? "NOTE"
                : "TYPE / NOTE"}
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="text-gray-600 text-center py-16">No entries.</div>
          ) : (
            <div className="divide-y">
              {rows.map((r) => (
                <div key={r.id} className="grid grid-cols-12 px-4 py-3 items-center">
                  <div className="col-span-2 truncate">{fmt(r.date)}</div>
                  <div className="col-span-4 truncate">{r.itemName}</div>
                  <div className="col-span-1 truncate">{r.unit}</div>
                  <div className="col-span-1 truncate">{r.qty}</div>
                  <div className="col-span-4">
                    {view === "INWARD" ? (
                      <div className="space-y-0.5">
                        <div className="truncate">Price: {r.meta?.pricePerUnit ?? "—"}</div>
                        <div className="truncate">Purchaser: {r.meta?.purchaser ?? "—"}</div>
                        <div className="truncate">
                          Bill: {r.meta?.billNo ?? "—"} ({r.meta?.billDate ? fmt(r.meta.billDate) : "—"})
                        </div>
                      </div>
                    ) : view === "OUTWARD_SITE" ? (
                      <div className="space-y-0.5">
                        <div className="truncate">To: {r.meta?.toSite ?? "—"}</div>
                        <div className="truncate">Labor: {r.meta?.laborName ?? "—"}</div>
                        <div className="truncate">
                          WO / Scheme: {r.meta?.workOrder ?? "—"} / {r.meta?.scheme ?? "—"}
                        </div>
                      </div>
                    ) : view === "OUTWARD_FACTORY" ? (
                      <div className="space-y-0.5">
                        <div className="truncate">Dept: {r.meta?.toDept ?? "—"}</div>
                        <div className="truncate">Employee: {r.meta?.issueEmployee ?? "—"}</div>
                      </div>
                    ) : view === "RETURN" ? (
                      <div className="truncate">{r.note || "—"}</div>
                    ) : (
                      <div className="truncate">{r.type}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

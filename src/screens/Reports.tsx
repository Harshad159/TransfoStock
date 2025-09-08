import React, { useMemo, useState } from "react";
import Header from "../components/Header";
import Card from "../components/Card";
import { useInventory } from "../context/InventoryContext";

// ----- Types (soft, to compile even if your context types differ slightly)
type MovementType = "INWARD" | "OUTWARD_SITE" | "OUTWARD_FACTORY" | "RETURN";

type HistoryEntry = {
  id: string;
  type: MovementType;
  date: string; // ISO
  quantity: number;
  note?: string;
  meta?: {
    // Inward
    purchaser?: string;
    billNo?: string;
    billDate?: string; // ISO or display string
    pricePerUnit?: number;
    // Outward – site
    givenTo?: string; // "To" / Site
    laborName?: string;
    workOrder?: string;
    scheme?: string;
    // Outward – factory
    department?: string;
    issuedTo?: string; // employee
  };
};

type ItemRow = {
  itemId: string;
  itemName: string;
  unit: string;
  h: HistoryEntry;
};

type ReportKind =
  | "ALL"
  | "INWARD"
  | "OUTWARD_ALL"
  | "OUTWARD_SITE"
  | "OUTWARD_FACTORY"
  | "RETURN"
  | "LOW_STOCK"; // optional, you can hide this if unused

// ----- Utils
function niceDate(s?: string) {
  if (!s) return "";
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return d.toLocaleDateString();
  } catch {
    return s;
  }
}

function csvEscapeCell(v: unknown) {
  const s = String(v ?? "");
  const needsQuote = /[",\n]/.test(s);
  const safe = s.replace(/"/g, '""');
  return needsQuote ? `"${safe}"` : safe;
}

function downloadCSV(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map(csvEscapeCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ----- Component
export default function Reports() {
  const { state } = useInventory();

  const [kind, setKind] = useState<ReportKind>("OUTWARD_SITE");
  const [laborFilter, setLaborFilter] = useState<string>("__ALL__");

  // Flatten history with item info
  const flat = useMemo<ItemRow[]>(() => {
    const rows: ItemRow[] = [];
    for (const it of state.items) {
      const hist: HistoryEntry[] = Array.isArray((it as any).history)
        ? (it as any).history
        : [];
      for (const h of hist) {
        rows.push({
          itemId: it.id,
          itemName: it.name,
          unit: it.unit,
          h,
        });
      }
    }
    // Sort newest first
    rows.sort((a, b) => (b.h.date || "").localeCompare(a.h.date || ""));
    return rows;
  }, [state.items]);

  // Collect labor list (for Site outward)
  const allLabors = useMemo(() => {
    const set = new Set<string>();
    for (const r of flat) {
      if (r.h.type === "OUTWARD_SITE") {
        const labor = r.h.meta?.laborName?.trim();
        if (labor) set.add(labor);
      }
    }
    return ["__ALL__", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [flat]);

  // Filtered rows per report kind
  const filtered = useMemo(() => {
    switch (kind) {
      case "INWARD":
        return flat.filter((r) => r.h.type === "INWARD");

      case "OUTWARD_ALL":
        // include BOTH site + factory
        return flat.filter(
          (r) => r.h.type === "OUTWARD_SITE" || r.h.type === "OUTWARD_FACTORY"
        );

      case "OUTWARD_SITE":
        return flat.filter(
          (r) =>
            r.h.type === "OUTWARD_SITE" &&
            (laborFilter === "__ALL__" ||
              (r.h.meta?.laborName || "") === laborFilter)
        );

      case "OUTWARD_FACTORY":
        return flat.filter((r) => r.h.type === "OUTWARD_FACTORY");

      case "RETURN":
        return flat.filter((r) => r.h.type === "RETURN");

      case "LOW_STOCK":
        // not exported here, but you can choose to compute it differently
        return [];

      case "ALL":
      default:
        return flat;
    }
  }, [flat, kind, laborFilter]);

  // Export button handler – builds the right CSV per report
  function onExport() {
    if (kind === "INWARD") {
      // Inward export with Purchaser, Bill No., Bill Date, Price/Unit
      const rows: (string | number)[][] = [
        [
          "Date",
          "Item Name",
          "Unit",
          "Quantity",
          "Price per Unit",
          "Purchaser",
          "Bill No.",
          "Bill Date",
        ],
      ];
      for (const r of filtered) {
        const m = r.h.meta || {};
        rows.push([
          niceDate(r.h.date),
          r.itemName,
          r.unit,
          r.h.quantity,
          m.pricePerUnit ?? "",
          m.purchaser ?? "",
          m.billNo ?? "",
          niceDate(m.billDate),
        ]);
      }
      downloadCSV("inward_report.csv", rows);
      return;
    }

    if (kind === "OUTWARD_SITE") {
      // Columns separated for To | Labor | WO | Scheme
      const rows: (string | number)[][] = [
        ["Date", "Item Name", "Unit", "Quantity", "To", "Labor", "WO", "Scheme"],
      ];
      for (const r of filtered) {
        const m = r.h.meta || {};
        rows.push([
          niceDate(r.h.date),
          r.itemName,
          r.unit,
          r.h.quantity,
          m.givenTo ?? "",
          m.laborName ?? "",
          m.workOrder ?? "",
          m.scheme ?? "",
        ]);
      }
      downloadCSV("site_material_issued.csv", rows);
      return;
    }

    if (kind === "OUTWARD_FACTORY") {
      const rows: (string | number)[][] = [
        ["Date", "Item Name", "Unit", "Quantity", "Department", "Issued To"],
      ];
      for (const r of filtered) {
        const m = r.h.meta || {};
        rows.push([
          niceDate(r.h.date),
          r.itemName,
          r.unit,
          r.h.quantity,
          m.department ?? "",
          m.issuedTo ?? "",
        ]);
      }
      downloadCSV("factory_material_issued.csv", rows);
      return;
    }

    if (kind === "OUTWARD_ALL") {
      const rows: (string | number)[][] = [
        [
          "Date",
          "Item Name",
          "Unit",
          "Type",
          "Quantity",
          "To/Dept",
          "Labor",
          "WO",
          "Scheme",
        ],
      ];
      for (const r of filtered) {
        const m = r.h.meta || {};
        const isSite = r.h.type === "OUTWARD_SITE";
        rows.push([
          niceDate(r.h.date),
          r.itemName,
          r.unit,
          isSite ? "SITE" : "FACTORY",
          r.h.quantity,
          isSite ? (m.givenTo ?? "") : (m.department ?? ""),
          isSite ? (m.laborName ?? "") : "",
          isSite ? (m.workOrder ?? "") : "",
          isSite ? (m.scheme ?? "") : "",
        ]);
      }
      downloadCSV("outward_all.csv", rows);
      return;
    }

    if (kind === "RETURN") {
      const rows: (string | number)[][] = [
        ["Date", "Item Name", "Unit", "Quantity", "Note"],
      ];
      for (const r of filtered) {
        rows.push([
          niceDate(r.h.date),
          r.itemName,
          r.unit,
          r.h.quantity,
          r.h.note ?? "",
        ]);
      }
      downloadCSV("return_report.csv", rows);
      return;
    }

    // Default (ALL)
    const rows: (string | number)[][] = [
      ["Date", "Item Name", "Unit", "Type", "Quantity"],
    ];
    for (const r of filtered) {
      rows.push([
        niceDate(r.h.date),
        r.itemName,
        r.unit,
        r.h.type,
        r.h.quantity,
      ]);
    }
    downloadCSV("transactions.csv", rows);
  }

  // Render a compact, scrollable table that matches the export
  function Table() {
    // Configure columns per report kind
    if (kind === "INWARD") {
      return (
        <div className="overflow-x-auto">
          <div className="min-w-[860px]">
            <div className="grid grid-cols-12 gap-2 bg-gray-200 text-gray-800 font-semibold rounded-md px-3 py-2 text-[13px] md:text-sm">
              <div className="col-span-2">DATE</div>
              <div className="col-span-3">ITEM NAME</div>
              <div className="col-span-1">UNIT</div>
              <div className="col-span-2">QTY</div>
              <div className="col-span-1">PRICE/UNIT</div>
              <div className="col-span-1">BILL #</div>
              <div className="col-span-2">PURCHASER / BILL DATE</div>
            </div>
            <div className="divide-y">
              {filtered.length === 0 ? (
                <div className="px-3 py-6 text-gray-500">No entries.</div>
              ) : (
                filtered.map((r) => {
                  const m = r.h.meta || {};
                  return (
                    <div
                      key={r.h.id}
                      className="grid grid-cols-12 gap-2 px-3 py-2 text-[13px] md:text-sm"
                    >
                      <div className="col-span-2">{niceDate(r.h.date)}</div>
                      <div className="col-span-3 truncate">{r.itemName}</div>
                      <div className="col-span-1">{r.unit}</div>
                      <div className="col-span-2">{r.h.quantity}</div>
                      <div className="col-span-1">
                        {m.pricePerUnit ?? ""}
                      </div>
                      <div className="col-span-1">{m.billNo ?? ""}</div>
                      <div className="col-span-2">
                        <div className="truncate">{m.purchaser ?? ""}</div>
                        <div className="text-gray-500">
                          {niceDate(m.billDate)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      );
    }

    if (kind === "OUTWARD_SITE") {
      return (
        <div className="overflow-x-auto">
          <div className="min-w-[880px]">
            <div className="grid grid-cols-12 gap-2 bg-gray-200 text-gray-800 font-semibold rounded-md px-3 py-2 text-[13px] md:text-sm">
              <div className="col-span-2">DATE</div>
              <div className="col-span-3">ITEM NAME</div>
              <div className="col-span-1">UNIT</div>
              <div className="col-span-1">QTY</div>
              <div className="col-span-2">TO / SITE</div>
              <div className="col-span-1">LABOR</div>
              <div className="col-span-2">WO / SCHEME</div>
            </div>
            <div className="divide-y">
              {filtered.length === 0 ? (
                <div className="px-3 py-6 text-gray-500">No entries.</div>
              ) : (
                filtered.map((r) => {
                  const m = r.h.meta || {};
                  return (
                    <div
                      key={r.h.id}
                      className="grid grid-cols-12 gap-2 px-3 py-2 text-[13px] md:text-sm"
                    >
                      <div className="col-span-2">{niceDate(r.h.date)}</div>
                      <div className="col-span-3 truncate">{r.itemName}</div>
                      <div className="col-span-1">{r.unit}</div>
                      <div className="col-span-1">{r.h.quantity}</div>
                      <div className="col-span-2 truncate">{m.givenTo ?? ""}</div>
                      <div className="col-span-1 truncate">
                        {m.laborName ?? ""}
                      </div>
                      <div className="col-span-2">
                        <div className="truncate">{m.workOrder ?? ""}</div>
                        <div className="text-gray-500 truncate">
                          {m.scheme ?? ""}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      );
    }

    if (kind === "OUTWARD_FACTORY") {
      return (
        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-12 gap-2 bg-gray-200 text-gray-800 font-semibold rounded-md px-3 py-2 text-[13px] md:text-sm">
              <div className="col-span-2">DATE</div>
              <div className="col-span-4">ITEM NAME</div>
              <div className="col-span-1">UNIT</div>
              <div className="col-span-1">QTY</div>
              <div className="col-span-2">DEPARTMENT</div>
              <div className="col-span-2">ISSUED TO</div>
            </div>
            <div className="divide-y">
              {filtered.length === 0 ? (
                <div className="px-3 py-6 text-gray-500">No entries.</div>
              ) : (
                filtered.map((r) => {
                  const m = r.h.meta || {};
                  return (
                    <div
                      key={r.h.id}
                      className="grid grid-cols-12 gap-2 px-3 py-2 text-[13px] md:text-sm"
                    >
                      <div className="col-span-2">{niceDate(r.h.date)}</div>
                      <div className="col-span-4 truncate">{r.itemName}</div>
                      <div className="col-span-1">{r.unit}</div>
                      <div className="col-span-1">{r.h.quantity}</div>
                      <div className="col-span-2 truncate">
                        {m.department ?? ""}
                      </div>
                      <div className="col-span-2 truncate">
                        {m.issuedTo ?? ""}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      );
    }

    if (kind === "OUTWARD_ALL") {
      return (
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-12 gap-2 bg-gray-200 text-gray-800 font-semibold rounded-md px-3 py-2 text-[13px] md:text-sm">
              <div className="col-span-2">DATE</div>
              <div className="col-span-3">ITEM NAME</div>
              <div className="col-span-1">UNIT</div>
              <div className="col-span-1">TYPE</div>
              <div className="col-span-1">QTY</div>
              <div className="col-span-2">TO / DEPT</div>
              <div className="col-span-2">LABOR / WO / SCHEME</div>
            </div>
            <div className="divide-y">
              {filtered.length === 0 ? (
                <div className="px-3 py-6 text-gray-500">No entries.</div>
              ) : (
                filtered.map((r) => {
                  const m = r.h.meta || {};
                  const isSite = r.h.type === "OUTWARD_SITE";
                  return (
                    <div
                      key={r.h.id}
                      className="grid grid-cols-12 gap-2 px-3 py-2 text-[13px] md:text-sm"
                    >
                      <div className="col-span-2">{niceDate(r.h.date)}</div>
                      <div className="col-span-3 truncate">{r.itemName}</div>
                      <div className="col-span-1">{r.unit}</div>
                      <div className="col-span-1">{isSite ? "SITE" : "FACT"}</div>
                      <div className="col-span-1">{r.h.quantity}</div>
                      <div className="col-span-2 truncate">
                        {isSite ? m.givenTo ?? "" : m.department ?? ""}
                      </div>
                      <div className="col-span-2">
                        <div className="truncate">
                          {isSite ? m.laborName ?? "" : ""}
                        </div>
                        <div className="text-gray-500 truncate">
                          {isSite
                            ? [m.workOrder, m.scheme].filter(Boolean).join(" · ")
                            : ""}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      );
    }

    // RETURN or ALL: simple generic
    return (
      <div className="overflow-x-auto">
        <div className="min-w-[680px]">
          <div className="grid grid-cols-12 gap-2 bg-gray-200 text-gray-800 font-semibold rounded-md px-3 py-2 text-[13px] md:text-sm">
            <div className="col-span-2">DATE</div>
            <div className="col-span-5">ITEM NAME</div>
            <div className="col-span-1">UNIT</div>
            <div className="col-span-1">QTY</div>
            <div className="col-span-3">TYPE / NOTE</div>
          </div>
          <div className="divide-y">
            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-gray-500">No entries.</div>
            ) : (
              filtered.map((r) => (
                <div
                  key={r.h.id}
                  className="grid grid-cols-12 gap-2 px-3 py-2 text-[13px] md:text-sm"
                >
                  <div className="col-span-2">{niceDate(r.h.date)}</div>
                  <div className="col-span-5 truncate">{r.itemName}</div>
                  <div className="col-span-1">{r.unit}</div>
                  <div className="col-span-1">{r.h.quantity}</div>
                  <div className="col-span-3 truncate">
                    {r.h.type}
                    {r.h.note ? ` · ${r.h.note}` : ""}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <Header title="Reports" />
      <div className="max-w-6xl mx-auto p-4">
        <Card>
          {/* Controls */}
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-4">
            <h2 className="text-2xl font-semibold">Reports</h2>
            <div className="flex flex-col md:flex-row gap-3 md:items-center">
              <select
                className="bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                value={kind}
                onChange={(e) => setKind(e.target.value as ReportKind)}
              >
                <option value="ALL">All Transactions</option>
                <option value="INWARD">Inward</option>
                <option value="OUTWARD_ALL">Outward (All)</option>
                <option value="OUTWARD_SITE">Site Material Issued</option>
                <option value="OUTWARD_FACTORY">Factory Material Issued</option>
                <option value="RETURN">Return</option>
              </select>

              {/* Only show when Site report is selected */}
              {kind === "OUTWARD_SITE" && (
                <select
                  className="bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                  value={laborFilter}
                  onChange={(e) => setLaborFilter(e.target.value)}
                >
                  {allLabors.map((lab) => (
                    <option key={lab} value={lab}>
                      {lab === "__ALL__" ? "All Labors" : lab}
                    </option>
                  ))}
                </select>
              )}

              <button
                onClick={onExport}
                className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium whitespace-nowrap"
              >
                Export
              </button>
            </div>
          </div>

          {/* Table */}
          <Table />
        </Card>
      </div>
    </div>
  );
}

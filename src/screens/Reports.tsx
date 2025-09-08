import React, { useEffect, useMemo, useState } from "react";
import Header from "../components/Header";
import Card from "../components/Card";
import { useInventory } from "../context/InventoryContext";

// ---------- helpers ----------
const fmt = (iso?: string) => {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "numeric", day: "numeric" });
  } catch {
    return iso;
  }
};

// Treat anything with "OUTWARD" in type (or exactly "OUTWARD") as outward
const isOutward = (m: any) =>
  typeof m?.type === "string" &&
  (m.type.toUpperCase().includes("OUTWARD") || m.type.toUpperCase() === "OUTWARD");

// Infer SITE vs FACTORY by metadata when type alone is not reliable
const isOutwardSite = (m: any) =>
  isOutward(m) &&
  !!(m?.meta?.toSite || m?.meta?.laborName || m?.meta?.workOrder || m?.meta?.scheme);

const isOutwardFactory = (m: any) =>
  isOutward(m) && !!(m?.meta?.toDept || m?.meta?.issueEmployee || m?.meta?.department);

type View =
  | "ALL"
  | "INWARD"
  | "OUTWARD_ALL"
  | "OUTWARD_SITE"
  | "OUTWARD_FACTORY"
  | "RETURN";

const PAGE_SIZE = 15;

// ---------- component ----------
export default function Reports() {
  const { state } = useInventory();

  const [view, setView] = useState<View>("ALL");
  const [laborFilter, setLaborFilter] = useState<string>("__ALL__");
  const [page, setPage] = useState<number>(1);

  // Reset page when filters/view change
  useEffect(() => setPage(1), [view, laborFilter]);

  // itemId -> item lookup
  const itemById = useMemo(() => {
    const m = new Map<string, any>();
    for (const it of state.items as any[]) m.set(it.id, it);
    return m;
  }, [state.items]);

  // All movements normalized
  const baseRows = useMemo(() => {
    const data = (state.movements as any[]).slice();

    // filter by view
    let filtered = data;
    switch (view) {
      case "INWARD":
        filtered = data.filter((m) => String(m?.type).toUpperCase() === "INWARD");
        break;
      case "RETURN":
        filtered = data.filter((m) => String(m?.type).toUpperCase() === "RETURN");
        break;
      case "OUTWARD_ALL":
        filtered = data.filter((m) => isOutward(m));
        break;
      case "OUTWARD_SITE":
        filtered = data.filter((m) => isOutwardSite(m));
        break;
      case "OUTWARD_FACTORY":
        filtered = data.filter((m) => isOutwardFactory(m));
        break;
      default:
        filtered = data; // ALL
    }

    // labor filter for site views
    if ((view === "OUTWARD_SITE" || view === "OUTWARD_ALL") && laborFilter !== "__ALL__") {
      filtered = filtered.filter((m) => !isOutwardSite(m) || m?.meta?.laborName === laborFilter);
    }

    // normalize to renderable rows
    const rows = filtered.map((m) => {
      const item = m.itemId ? itemById.get(m.itemId) : undefined;
      return {
        id: m.id,
        date: m.date,
        itemName: item?.name ?? "",
        unit: (m.unit ?? item?.unit) || "",
        qty: m.quantity ?? 0,
        type: String(m?.type || ""),
        meta: m.meta || {},
        note: m.note || "",
      };
    });

    // latest first
    rows.sort((a, b) => (a.date > b.date ? -1 : 1));
    return rows;
  }, [state.movements, itemById, view, laborFilter]);

  // Labors list (only for Site Material Issued)
  const allLabors = useMemo(() => {
    const set = new Set<string>();
    for (const m of state.movements as any[]) {
      if (isOutwardSite(m) && m?.meta?.laborName) set.add(m.meta.laborName);
    }
    return ["__ALL__", ...Array.from(set)];
  }, [state.movements]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(baseRows.length / PAGE_SIZE));
  const pagedRows = baseRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // CSV export (exports ALL filtered rows, not just current page)
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
      matrix = baseRows.map((r) => [
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
      matrix = baseRows.map((r) => [
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
      matrix = baseRows.map((r) => [
        fmt(r.date),
        r.itemName,
        r.unit,
        String(r.qty),
        String(r.meta?.toDept ?? r.meta?.department ?? ""),
        String(r.meta?.issueEmployee ?? ""),
      ]);
    } else if (view === "RETURN") {
      header = ["Date", "Item Name", "Unit", "Qty", "Returned From / Note"];
      matrix = baseRows.map((r) => [fmt(r.date), r.itemName, r.unit, String(r.qty), String(r.note)]);
    } else if (view === "OUTWARD_ALL") {
      header = ["Date", "Item Name", "Unit", "Qty", "Type", "To / Dept / Site", "Labor / WO / Scheme"];
      matrix = baseRows.map((r) => [
        fmt(r.date),
        r.itemName,
        r.unit,
        String(r.qty),
        r.type,
        isOutwardFactory(r)
          ? String(r.meta?.toDept ?? r.meta?.department ?? "")
          : String(r.meta?.toSite ?? ""),
        isOutwardSite(r)
          ? `${r.meta?.laborName ?? ""} | ${r.meta?.workOrder ?? ""} | ${r.meta?.scheme ?? ""}`
          : String(r.meta?.issueEmployee ?? ""),
      ]);
    } else {
      // ALL
      header = ["Date", "Item Name", "Unit", "Qty", "Type / Note"];
      matrix = baseRows.map((r) => [fmt(r.date), r.itemName, r.unit, String(r.qty), r.type]);
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
          {/* Filters */}
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

            {/* Labor dropdown only for Site Material Issued */}
            {view === "OUTWARD_SITE" && (
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

          {/* Table header */}
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

          {/* Rows */}
          {pagedRows.length === 0 ? (
            <div className="text-gray-600 text-center py-16">No entries.</div>
          ) : (
            <div className="divide-y">
              {pagedRows.map((r) => (
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
                        <div className="truncate">Dept: {r.meta?.toDept ?? r.meta?.department ?? "—"}</div>
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

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">
              Showing{" "}
              <strong>
                {(page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, baseRows.length)}
              </strong>{" "}
              of <strong>{baseRows.length}</strong>
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className={`px-3 py-1 rounded border ${
                  page <= 1 ? "text-gray-400 border-gray-200" : "hover:bg-gray-50"
                }`}
              >
                Prev
              </button>
              <span className="text-sm text-gray-700">
                Page {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className={`px-3 py-1 rounded border ${
                  page >= totalPages ? "text-gray-400 border-gray-200" : "hover:bg-gray-50"
                }`}
              >
                Next
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

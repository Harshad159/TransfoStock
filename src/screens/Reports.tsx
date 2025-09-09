import React, { useMemo, useState } from "react";
import Header from "../components/Header";
import Card from "../components/Card";
import { useInventory } from "../context/InventoryContext";

/**
 * This file keeps your existing behavior:
 * - Modes: Inward, Outward (All), Site Material Issued, Factory Material Issued
 * - Date filtering (from/to)
 * - Labor filter appears ONLY for Site Material Issued
 * - Pagination: 15 rows per page
 * - Export to CSV respects the current filter + mode
 *
 * Layout fix:
 * - Tables are wrapped in `overflow-x-auto` with a conservative `min-w-[...]`
 *   so headers/columns never overlap on mobile — users can horizontally scroll.
 */

type Mode = "inward" | "out_all" | "site" | "factory";

const PAGE_SIZE = 15;

function fmt(d?: string) {
  if (!d) return "";
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString();
  } catch {
    return d;
  }
}

export default function Reports() {
  const { state } = useInventory();

  // --------- FILTERS / UI STATE ----------
  const [mode, setMode] = useState<Mode>("inward");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [laborFilter, setLaborFilter] = useState<string>("__ALL__");
  const [page, setPage] = useState<number>(1);

  // unique labors for dropdown (site mode only)
  const allLabors = useMemo(() => {
    const set = new Set<string>();
    for (const m of state.movements as any[]) {
      if (m?.type === "OUTWARD") {
        const labor = m?.meta?.labor || m?.labor || "";
        if (labor) set.add(String(labor));
      }
    }
    return ["__ALL__", ...Array.from(set)];
  }, [state.movements]);

  // map items by id for name/unit lookup
  const itemById = useMemo(() => {
    const map = new Map<string, any>();
    for (const it of state.items as any[]) map.set(it.id, it);
    return map;
  }, [state.items]);

  // --------- BUILD ROWS ACCORDING TO MODE ----------
  const rows: any[] = useMemo(() => {
    const within = (iso?: string) => {
      if (!iso) return false;
      const t = new Date(iso).getTime();
      if (fromDate) {
        const ft = new Date(fromDate).setHours(0, 0, 0, 0);
        if (t < ft) return false;
      }
      if (toDate) {
        const tt = new Date(toDate).setHours(23, 59, 59, 999);
        if (t > tt) return false;
      }
      return true;
    };

    // helper to shape basic row with item lookup
    const baseRow = (m: any) => {
      const it = m?.item || itemById.get(m?.itemId) || {};
      const name = it?.name ?? m?.itemName ?? "";
      const unit = it?.unit ?? m?.unit ?? "";
      return { name, unit };
    };

    const all = state.movements as any[];
    const outRows: any[] = [];
    const inRows: any[] = [];

    for (const m of all) {
      if (!within(m?.date)) continue;

      if (m?.type === "INWARD") {
        // inward fields (kept tolerant)
        const { name, unit } = baseRow(m);
        inRows.push({
          id: m.id,
          date: m?.date,
          itemName: name,
          unit,
          qty: m?.quantity ?? m?.qty ?? 0,
          purchaser: m?.meta?.purchaser ?? "",
          billNo: m?.meta?.billNo ?? "",
          billDate: m?.meta?.billDate ?? "",
        });
      } else if (m?.type === "OUTWARD") {
        // outward fields (site/factory/all)
        const { name, unit } = baseRow(m);
        outRows.push({
          id: m.id,
          date: m?.date,
          itemName: name,
          unit,
          qty: m?.quantity ?? m?.qty ?? 0,
          toSite: m?.meta?.toSite ?? m?.meta?.site ?? m?.toSite ?? "",
          dept: m?.meta?.department ?? m?.meta?.dept ?? m?.department ?? "",
          labor: m?.meta?.labor ?? m?.labor ?? "",
          workOrder: m?.meta?.workOrder ?? m?.wo ?? "",
          scheme: m?.meta?.scheme ?? "",
          issueToEmployee:
            m?.meta?.issueToEmployee ?? m?.issueToEmployee ?? "",
          challan: m?.meta?.challan ?? m?.challan ?? "", // if you added challan
          outwardType:
            m?.meta?.outwardType ??
            (m?.meta?.toSite ? "SITE" : m?.meta?.department ? "FACTORY" : ""),
        });
      }
    }

    // now filter per mode
    if (mode === "inward") {
      return inRows.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    }

    // outward combined
    let outs = outRows;

    if (mode === "site") {
      outs = outs.filter(
        (r) =>
          String(r.outwardType || "").toUpperCase() === "SITE" ||
          (!!r.toSite && !r.dept)
      );
      if (laborFilter !== "__ALL__") {
        outs = outs.filter((r) => String(r.labor || "") === laborFilter);
      }
    } else if (mode === "factory") {
      outs = outs.filter(
        (r) =>
          String(r.outwardType || "").toUpperCase() === "FACTORY" ||
          (!!r.dept && !r.toSite)
      );
    }

    return outs.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [state.movements, state.items, itemById, mode, fromDate, toDate, laborFilter]);

  // --------- PAGINATION ----------
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageSafe = Math.min(Math.max(page, 1), pageCount);
  const start = (pageSafe - 1) * PAGE_SIZE;
  const pagedRows = rows.slice(start, start + PAGE_SIZE);

  // reset page when filters change
  React.useEffect(() => {
    setPage(1);
  }, [mode, fromDate, toDate, laborFilter]);

  // --------- EXPORT ----------
  function exportCSV() {
    const headIn = ["Date", "Item", "Unit", "Qty", "Purchaser", "Bill No", "Bill Date"];
    const headOutAll = [
      "Date",
      "Item",
      "Unit",
      "Qty",
      "To / Site",
      "Labor",
      "Work Order",
      "Scheme",
      "Department",
      "Issue To Employee",
      "Challan",
    ];
    const headFactory = [
      "Date",
      "Item",
      "Unit",
      "Qty",
      "Department",
      "Issue To Employee",
    ];
    const headSite = [
      "Date",
      "Item",
      "Unit",
      "Qty",
      "To / Site",
      "Labor",
      "Work Order",
      "Scheme",
      "Challan",
    ];

    const data = rows.map((r) => ({
      ...r,
      dateFmt: fmt(r.date),
      billDateFmt: fmt(r.billDate),
    }));

    let rowsOut: string[][] = [];
    if (mode === "inward") {
      rowsOut = [
        headIn,
        ...data.map((r) => [
          r.dateFmt,
          r.itemName ?? "",
          r.unit ?? "",
          String(r.qty ?? 0),
          r.purchaser ?? "",
          r.billNo ?? "",
          r.billDateFmt ?? "",
        ]),
      ];
    } else if (mode === "site") {
      rowsOut = [
        headSite,
        ...data.map((r) => [
          r.dateFmt,
          r.itemName ?? "",
          r.unit ?? "",
          String(r.qty ?? 0),
          r.toSite ?? "",
          r.labor ?? "",
          r.workOrder ?? "",
          r.scheme ?? "",
          r.challan ?? "",
        ]),
      ];
    } else if (mode === "factory") {
      rowsOut = [
        headFactory,
        ...data.map((r) => [
          r.dateFmt,
          r.itemName ?? "",
          r.unit ?? "",
          String(r.qty ?? 0),
          r.dept ?? "",
          r.issueToEmployee ?? "",
        ]),
      ];
    } else {
      rowsOut = [
        headOutAll,
        ...data.map((r) => [
          r.dateFmt,
          r.itemName ?? "",
          r.unit ?? "",
          String(r.qty ?? 0),
          r.toSite ?? "",
          r.labor ?? "",
          r.workOrder ?? "",
          r.scheme ?? "",
          r.dept ?? "",
          r.issueToEmployee ?? "",
          r.challan ?? "",
        ]),
      ];
    }

    const csv = rowsOut
      .map((line) =>
        line
          .map((cell) => {
            const s = String(cell ?? "");
            const needsQuote = /[",\n]/.test(s);
            const escaped = s.replace(/"/g, '""');
            return needsQuote ? `"${escaped}"` : escaped;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const name =
      mode === "inward"
        ? "inward.csv"
        : mode === "site"
        ? "site_material_issued.csv"
        : mode === "factory"
        ? "factory_material_issued.csv"
        : "outward_all.csv";
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="pb-24">
      <Header title="Reports" />
      <div className="max-w-6xl mx-auto p-4">
        <Card>
          {/* Toolbar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <select
                className="bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                value={mode}
                onChange={(e) => setMode(e.target.value as Mode)}
              >
                <option value="inward">Inward</option>
                <option value="out_all">Outward (All)</option>
                <option value="site">Site Material Issued</option>
                <option value="factory">Factory Material Issued</option>
              </select>

              {/* Date range */}
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  className="bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  placeholder="from"
                />
                <span className="text-gray-400">to</span>
                <input
                  type="date"
                  className="bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  placeholder="to"
                />
              </div>

              {/* Labor filter only for site */}
              {mode === "site" && (
                <select
                  className="bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                  value={laborFilter}
                  onChange={(e) => setLaborFilter(e.target.value)}
                >
                  {allLabors.map((l) => (
                    <option key={l} value={l}>
                      {l === "__ALL__" ? "All Labors" : l}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <button
              onClick={exportCSV}
              className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium"
            >
              Export
            </button>
          </div>

          {/* ====== TABLE (responsively scrollable) ====== */}
          <div className="overflow-x-auto">
            <div className="min-w-[980px] sm:min-w-0">
              {/* Header */}
              <div className="grid grid-cols-12 bg-gray-200 text-gray-800 font-semibold rounded-md px-4 py-3 text-xs sm:text-sm whitespace-nowrap">
                <div className="col-span-2">DATE</div>
                <div className="col-span-3">ITEM NAME</div>
                <div className="col-span-1">UNIT</div>

                {mode === "inward" ? (
                  <>
                    <div className="col-span-1">QTY</div>
                    <div className="col-span-2">PURCHASER</div>
                    <div className="col-span-2">BILL NO</div>
                    <div className="col-span-1">BILL DATE</div>
                  </>
                ) : mode === "site" ? (
                  <>
                    <div className="col-span-1">QTY</div>
                    <div className="col-span-2">TO / SITE</div>
                    <div className="col-span-1">LABOR</div>
                    <div className="col-span-2">WORK ORDER</div>
                    <div className="col-span-1">SCHEME</div>
                    <div className="col-span-1">CHALLAN</div>
                  </>
                ) : mode === "factory" ? (
                  <>
                    <div className="col-span-1">QTY</div>
                    <div className="col-span-3">DEPARTMENT</div>
                    <div className="col-span-3">ISSUE TO EMPLOYEE</div>
                  </>
                ) : (
                  // outward (all)
                  <>
                    <div className="col-span-1">QTY</div>
                    <div className="col-span-2">TO / SITE</div>
                    <div className="col-span-1">LABOR</div>
                    <div className="col-span-2">WORK ORDER</div>
                    <div className="col-span-1">SCHEME</div>
                    <div className="col-span-1">DEPARTMENT</div>
                    <div className="col-span-1">ISSUE TO</div>
                    <div className="col-span-1">CHALLAN</div>
                  </>
                )}
              </div>

              {/* Rows */}
              {pagedRows.length === 0 ? (
                <div className="px-4 py-10 text-center text-gray-500">
                  No entries.
                </div>
              ) : (
                <div className="divide-y">
                  {pagedRows.map((r) => (
                    <div
                      key={r.id}
                      className="grid grid-cols-12 px-4 py-3 hover:bg-gray-50 text-sm"
                    >
                      <div className="col-span-2">{fmt(r.date)}</div>
                      <div className="col-span-3 truncate">{r.itemName}</div>
                      <div className="col-span-1">{r.unit}</div>

                      {mode === "inward" ? (
                        <>
                          <div className="col-span-1">{r.qty ?? 0}</div>
                          <div className="col-span-2 truncate">
                            {r.purchaser || "—"}
                          </div>
                          <div className="col-span-2 truncate">
                            {r.billNo || "—"}
                          </div>
                          <div className="col-span-1">{fmt(r.billDate)}</div>
                        </>
                      ) : mode === "site" ? (
                        <>
                          <div className="col-span-1">{r.qty ?? 0}</div>
                          <div className="col-span-2 truncate">
                            {r.toSite || "—"}
                          </div>
                          <div className="col-span-1 truncate">
                            {r.labor || "—"}
                          </div>
                          <div className="col-span-2 truncate">
                            {r.workOrder || "—"}
                          </div>
                          <div className="col-span-1 truncate">
                            {r.scheme || "—"}
                          </div>
                          <div className="col-span-1 truncate">
                            {r.challan || "—"}
                          </div>
                        </>
                      ) : mode === "factory" ? (
                        <>
                          <div className="col-span-1">{r.qty ?? 0}</div>
                          <div className="col-span-3 truncate">
                            {r.dept || "—"}
                          </div>
                          <div className="col-span-3 truncate">
                            {r.issueToEmployee || "—"}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="col-span-1">{r.qty ?? 0}</div>
                          <div className="col-span-2 truncate">
                            {r.toSite || "—"}
                          </div>
                          <div className="col-span-1 truncate">
                            {r.labor || "—"}
                          </div>
                          <div className="col-span-2 truncate">
                            {r.workOrder || "—"}
                          </div>
                          <div className="col-span-1 truncate">
                            {r.scheme || "—"}
                          </div>
                          <div className="col-span-1 truncate">
                            {r.dept || "—"}
                          </div>
                          <div className="col-span-1 truncate">
                            {r.issueToEmployee || "—"}
                          </div>
                          <div className="col-span-1 truncate">
                            {r.challan || "—"}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-sm text-gray-600 mt-4">
            <div>
              Showing {rows.length === 0 ? 0 : start + 1}–{Math.min(start + PAGE_SIZE, rows.length)} of {rows.length}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50"
                disabled={pageSafe <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </button>
              <div>
                Page {pageSafe} / {pageCount}
              </div>
              <button
                className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50"
                disabled={pageSafe >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
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

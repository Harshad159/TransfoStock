import React, { useMemo, useState, useEffect } from "react";
import Header from "../components/Header";
import Card from "../components/Card";
import { useInventory } from "../context/InventoryContext";

type Mode = "INWARD" | "OUTWARD_ALL" | "SITE" | "FACTORY";

const PAGE_SIZE = 15;

// --- utils ---
function toYMD(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function inRange(iso: string, from?: string, to?: string) {
  const d = toYMD(iso);
  if (!d) return false;
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}
function downloadCSV(filename: string, rows: (string | number)[][]) {
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
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const { state } = useInventory();

  const [mode, setMode] = useState<Mode>("INWARD");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  // Site-only labor filter
  const [laborFilter, setLaborFilter] = useState<string>("__ALL__");

  // Pagination
  const [page, setPage] = useState<number>(1);
  useEffect(() => setPage(1), [mode, fromDate, toDate, laborFilter]);

  // Map for quick item lookup
  const itemById = useMemo(() => {
    const m = new Map<string, any>();
    (state.items as any[]).forEach((it) => m.set(it.id, it));
    return m;
  }, [state.items]);

  // Build rows per mode (REALTIME from state.movements)
  const rows = useMemo(() => {
    const src = (state.movements as any[]).filter((mv) =>
      inRange(mv.date, fromDate || undefined, toDate || undefined)
    );

    if (mode === "INWARD") {
      const inward = src
        .filter((m) => m.type === "INWARD")
        .map((m) => {
          const it = itemById.get(m.itemId) || {};
          return {
            id: m.id,
            date: toYMD(m.date),
            itemName: it.name ?? m.itemName ?? "",
            unit: it.unit ?? m.unit ?? "",
            qty: Number(m.quantity ?? 0),
            purchaser: m.meta?.purchaser ?? "",
            billNo: m.meta?.billNo ?? "",
            billDate: m.meta?.billDate ? toYMD(m.meta.billDate) : "",
            pricePerUnit: m.meta?.pricePerUnit ?? "",
          };
        })
        .sort((a, b) => (a.date < b.date ? 1 : -1));
      return inward;
    }

    if (mode === "OUTWARD_ALL") {
      const outAll = src
        .filter((m) => m.type === "OUTWARD")
        .map((m) => {
          const it = itemById.get(m.itemId) || {};
          const kind = m.meta?.outwardKind || "";
          const note =
            kind === "SITE"
              ? `Site Issue | Given To: ${m.meta?.toSite ?? ""} | Labor: ${m.meta?.laborName ?? ""}`
              : kind === "FACTORY"
              ? `Factory Issue | Dept: ${m.meta?.department ?? ""} | Employee: ${m.meta?.issueToEmployee ?? ""}`
              : (m.note ?? "");
          return {
            id: m.id,
            date: toYMD(m.date),
            itemName: it.name ?? m.itemName ?? "",
            unit: it.unit ?? m.unit ?? "",
            qty: Number(m.quantity ?? 0),
            note,
          };
        })
        .sort((a, b) => (a.date < b.date ? 1 : -1));
      return outAll;
    }

    if (mode === "SITE") {
      let site = src
        .filter((m) => m.type === "OUTWARD" && m.meta?.outwardKind === "SITE")
        .map((m) => {
          const it = itemById.get(m.itemId) || {};
          return {
            id: m.id,
            date: toYMD(m.date),
            itemName: it.name ?? m.itemName ?? "",
            unit: it.unit ?? m.unit ?? "",
            qty: Number(m.quantity ?? 0),
            toSite: m.meta?.toSite ?? "",
            labor: m.meta?.laborName ?? "", // ✅ real-time Labor
            workOrder: m.meta?.workOrder ?? "",
            scheme: m.meta?.scheme ?? "",
            challan: m.meta?.deliveryChallan ?? "", // ✅ real-time Delivery Challan No.
          };
        });

      if (laborFilter !== "__ALL__") {
        site = site.filter((r) => r.labor === laborFilter);
      }

      site.sort((a, b) => (a.date < b.date ? 1 : -1));
      return site;
    }

    // FACTORY
    const factory = src
      .filter((m) => m.type === "OUTWARD" && m.meta?.outwardKind === "FACTORY")
      .map((m) => {
        const it = itemById.get(m.itemId) || {};
        return {
          id: m.id,
          date: toYMD(m.date),
          itemName: it.name ?? m.itemName ?? "",
          unit: it.unit ?? m.unit ?? "",
          qty: Number(m.quantity ?? 0),
          dept: m.meta?.department ?? "",
          employee: m.meta?.issueToEmployee ?? "",
        };
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1));
    return factory;
  }, [state.movements, itemById, mode, fromDate, toDate, laborFilter]);

  // Labor options (from current movements; site-only)
  const laborOptions = useMemo(() => {
    if (mode !== "SITE") return [];
    const s = new Set<string>();
    (state.movements as any[]).forEach((m) => {
      if (m.type === "OUTWARD" && m.meta?.outwardKind === "SITE") {
        const n = (m.meta?.laborName || "").trim();
        if (n) s.add(n);
      }
    });
    return ["__ALL__", ...Array.from(s).sort()];
  }, [mode, state.movements]);

  // Pagination slice
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(page, 1), pageCount);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageRows = rows.slice(start, start + PAGE_SIZE);

  // Export (keeps your existing formats; Site includes Labor & Challan)
  function exportCSV() {
    if (mode === "INWARD") {
      const header = ["Date", "Item", "Unit", "Qty", "Purchaser", "Bill No.", "Bill Date", "Price per Unit"];
      const data = rows.map((r: any) => [
        r.date, r.itemName, r.unit, r.qty, r.purchaser, r.billNo, r.billDate, r.pricePerUnit,
      ]);
      downloadCSV("inward.csv", [header, ...data]);
      return;
    }
    if (mode === "OUTWARD_ALL") {
      const header = ["Date", "Item", "Unit", "Qty", "Note"];
      const data = rows.map((r: any) => [r.date, r.itemName, r.unit, r.qty, r.note || ""]);
      downloadCSV("outward_all.csv", [header, ...data]);
      return;
    }
    if (mode === "SITE") {
      // ✅ includes Labor and Challan
      const header = ["Date", "Item", "Unit", "Qty", "To / Site", "Labor", "Work Order", "Scheme", "Challan"];
      const data = rows.map((r: any) => [
        r.date, r.itemName, r.unit, r.qty, r.toSite, r.labor, r.workOrder, r.scheme, r.challan,
      ]);
      downloadCSV("site_material_issued.csv", [header, ...data]);
      return;
    }
    // FACTORY
    const header = ["Date", "Item", "Unit", "Qty", "Department", "Issue To Employee"];
    const data = rows.map((r: any) => [r.date, r.itemName, r.unit, r.qty, r.dept, r.employee]);
    downloadCSV("factory_material_issued.csv", [header, ...data]);
  }

  return (
    <div className="pb-24">
      <Header title="Reports" />
      <div className="max-w-6xl mx-auto p-4">
        <Card>
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <select
              className="bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
              value={mode}
              onChange={(e) => setMode(e.target.value as Mode)}
            >
              <option value="INWARD">Inward</option>
              <option value="OUTWARD_ALL">Outward (All)</option>
              <option value="SITE">Site Material Issued</option>
              <option value="FACTORY">Factory Material Issued</option>
            </select>

            {/* Date range */}
            <input
              type="date"
              className="bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              className="bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />

            {/* Labor filter (Site only) */}
            {mode === "SITE" && (
              <select
                className="bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                value={laborFilter}
                onChange={(e) => setLaborFilter(e.target.value)}
              >
                {laborOptions.map((l) => (
                  <option key={l} value={l}>
                    {l === "__ALL__" ? "All Labors" : l}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={exportCSV}
              className="ml-auto px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium"
            >
              Export
            </button>
          </div>

          {/* TABLE (mobile-safe, no text overlap) */}
          <div className="overflow-x-auto">
            {/* Header */}
            <div className={
              "grid grid-cols-12 bg-gray-200 text-gray-800 font-semibold rounded-md px-4 py-3 text-xs sm:text-sm whitespace-nowrap " +
              (mode === "SITE" ? "min-w-[1050px]" : mode === "INWARD" ? "min-w-[980px]" : "min-w-[900px]")
            }>
              <div className="col-span-2">DATE</div>
              <div className="col-span-3">ITEM NAME</div>
              <div className="col-span-1">UNIT</div>

              {mode === "INWARD" && (
                <>
                  <div className="col-span-1">QTY</div>
                  <div className="col-span-2">PURCHASER</div>
                  <div className="col-span-1">BILL NO.</div>
                  <div className="col-span-1">BILL DATE</div>
                  <div className="col-span-1">PRICE/UNIT</div>
                </>
              )}

              {mode === "OUTWARD_ALL" && (
                <>
                  <div className="col-span-1">QTY</div>
                  <div className="col-span-5">NOTE</div>
                </>
              )}

              {mode === "SITE" && (
                <>
                  <div className="col-span-1">QTY</div>
                  <div className="col-span-2">TO / SITE</div>
                  <div className="col-span-1">LABOR</div>        {/* ✅ Labor */}
                  <div className="col-span-1">WORK ORD</div>
                  <div className="col-span-1">SCHEME</div>
                  <div className="col-span-1">CHALLAN</div>      {/* ✅ Challan */}
                </>
              )}

              {mode === "FACTORY" && (
                <>
                  <div className="col-span-1">QTY</div>
                  <div className="col-span-5">DEPARTMENT / ISSUE TO EMPLOYEE</div>
                </>
              )}
            </div>

            {/* Rows */}
            {pageRows.length === 0 ? (
              <div className="px-4 py-10 text-center text-gray-500">No entries.</div>
            ) : (
              <div className="divide-y">
                {pageRows.map((r: any) => (
                  <div
                    key={r.id}
                    className={
                      "grid grid-cols-12 px-4 py-3 hover:bg-gray-50 text-sm " +
                      (mode === "SITE" ? "min-w-[1050px]" : mode === "INWARD" ? "min-w-[980px]" : "min-w-[900px]")
                    }
                  >
                    <div className="col-span-2 whitespace-nowrap">{r.date}</div>
                    <div className="col-span-3 truncate">{r.itemName}</div>
                    <div className="col-span-1 whitespace-nowrap">{r.unit}</div>

                    {mode === "INWARD" && (
                      <>
                        <div className="col-span-1 whitespace-nowrap">{r.qty}</div>
                        <div className="col-span-2 truncate">{r.purchaser || "—"}</div>
                        <div className="col-span-1 whitespace-nowrap">{r.billNo || "—"}</div>
                        <div className="col-span-1 whitespace-nowrap">{r.billDate || "—"}</div>
                        <div className="col-span-1 whitespace-nowrap">
                          {r.pricePerUnit !== "" ? r.pricePerUnit : "—"}
                        </div>
                      </>
                    )}

                    {mode === "OUTWARD_ALL" && (
                      <>
                        <div className="col-span-1 whitespace-nowrap">{r.qty}</div>
                        <div className="col-span-5 truncate">{r.note || "—"}</div>
                      </>
                    )}

                    {mode === "SITE" && (
                      <>
                        <div className="col-span-1 whitespace-nowrap">{r.qty}</div>
                        <div className="col-span-2 truncate">{r.toSite || "—"}</div>
                        <div className="col-span-1 truncate">{r.labor || "—"}</div>      {/* ✅ */}
                        <div className="col-span-1 whitespace-nowrap">{r.workOrder || "—"}</div>
                        <div className="col-span-1 whitespace-nowrap">{r.scheme || "—"}</div>
                        <div className="col-span-1 whitespace-nowrap">{r.challan || "—"}</div> {/* ✅ */}
                      </>
                    )}

                    {mode === "FACTORY" && (
                      <>
                        <div className="col-span-1 whitespace-nowrap">{r.qty}</div>
                        <div className="col-span-5 truncate">
                          {(r.dept || "—") + (r.employee ? ` | ${r.employee}` : "")}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
            <div>
              Showing {rows.length === 0 ? 0 : start + 1}–{Math.min(start + PAGE_SIZE, rows.length)} of {rows.length}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </button>
              <div>
                Page {safePage} / {pageCount}
              </div>
              <button
                className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50"
                disabled={safePage >= pageCount}
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

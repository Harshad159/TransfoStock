import React, { useMemo, useState } from "react";
import Header from "../components/Header";
import Card from "../components/Card";
import { useInventory } from "../context/InventoryContext";

type ReportKind =
  | "all"
  | "inward"
  | "outwardAll"
  | "siteIssued"
  | "factoryIssued"
  | "return";

const PER_PAGE = 15;

function fmtDate(iso?: string) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString();
  } catch {
    return "—";
  }
}

export default function Reports() {
  const { state } = useInventory();

  const [report, setReport] = useState<ReportKind>("outwardAll");
  const [laborFilter, setLaborFilter] = useState<string>("__ALL__");
  const [page, setPage] = useState(1);

  // find item meta by id for name/unit
  const itemById = useMemo(() => {
    const map = new Map<string, { name: string; unit: string }>();
    state.items.forEach((i) =>
      map.set(i.id, { name: i.name, unit: i.unit || "Nos" })
    );
    return map;
  }, [state.items]);

  // helpers to classify outward kinds
  const isOutwardSite = (m: any) =>
    m?.type === "OUTWARD" &&
    !!(
      m?.meta?.toSite ||
      m?.meta?.laborName ||
      m?.meta?.workOrder ||
      m?.meta?.scheme
    );

  const isOutwardFactory = (m: any) =>
    m?.type === "OUTWARD" &&
    !!(m?.meta?.toDept || m?.meta?.department || m?.meta?.issueEmployee);

  // base filtered rows for chosen report
  const baseRows = useMemo(() => {
    let rows = state.movements.slice().sort((a, b) => {
      // newest first
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    switch (report) {
      case "inward":
        rows = rows.filter((m) => m.type === "INWARD");
        break;
      case "outwardAll":
        rows = rows.filter((m) => m.type === "OUTWARD");
        break;
      case "siteIssued":
        rows = rows.filter(isOutwardSite);
        break;
      case "factoryIssued":
        rows = rows.filter(isOutwardFactory);
        break;
      case "return":
        rows = rows.filter((m) => m.type === "RETURN");
        break;
      case "all":
      default:
        // keep as is
        break;
    }

    // augment with item name / unit
    return rows.map((m) => {
      const itemMeta = itemById.get(m.itemId || "");
      return {
        ...m,
        _itemName: m.meta?.itemName || itemMeta?.name || "—",
        _unit: m.meta?.unit || itemMeta?.unit || "—",
      };
    });
  }, [state.movements, report, itemById]);

  // labor list only for siteIssued
  const laborOptions = useMemo(() => {
    if (report !== "siteIssued") return [];
    const set = new Set<string>();
    baseRows.forEach((m) => {
      const name = m.meta?.laborName?.trim();
      if (name) set.add(name);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [baseRows, report]);

  // apply labor filter (site only)
  const filteredRows = useMemo(() => {
    if (report !== "siteIssued") return baseRows;
    if (laborFilter === "__ALL__") return baseRows;
    return baseRows.filter((m) => (m.meta?.laborName || "") === laborFilter);
  }, [baseRows, report, laborFilter]);

  // pagination
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice(
    (currentPage - 1) * PER_PAGE,
    currentPage * PER_PAGE
  );

  // Title
  const title = useMemo(() => {
    switch (report) {
      case "all":
        return "Reports";
      case "inward":
        return "Inward Report";
      case "outwardAll":
        return "Outward (All) Report";
      case "siteIssued":
        return "Site Material Issued";
      case "factoryIssued":
        return "Factory Material Issued";
      case "return":
        return "Return Report";
      default:
        return "Reports";
    }
  }, [report]);

  function onChangeReport(val: string) {
    // reset page & labor filter when view changes
    setPage(1);
    setLaborFilter("__ALL__");
    setReport(val as ReportKind);
  }

  function exportCSV() {
    // export ALL (unpaginated) of current filter
    const rows = filteredRows;

    let headers: string[] = [];
    let mapRow: (r: any) => (string | number)[] = () => [];

    if (report === "siteIssued") {
      headers = ["Date", "Item", "Unit", "Qty", "To Site", "Labor", "WO", "Scheme"];
      mapRow = (r) => [
        fmtDate(r.date),
        r._itemName,
        r._unit,
        r.quantity ?? 0,
        r.meta?.toSite || "—",
        r.meta?.laborName || "—",
        r.meta?.workOrder || "—",
        r.meta?.scheme || "—",
      ];
    } else if (report === "factoryIssued") {
      headers = ["Date", "Item", "Unit", "Qty", "Department", "Issue To Employee"];
      mapRow = (r) => [
        fmtDate(r.date),
        r._itemName,
        r._unit,
        r.quantity ?? 0,
        r.meta?.toDept || r.meta?.department || "—",
        r.meta?.issueEmployee || "—",
      ];
    } else if (report === "outwardAll") {
      headers = [
        "Date",
        "Item",
        "Unit",
        "Type",
        "Qty",
        "To / Dept",
        "Labor / WO / Scheme",
      ];
      mapRow = (r) => [
        fmtDate(r.date),
        r._itemName,
        r._unit,
        r.type,
        r.quantity ?? 0,
        r.meta?.toSite || r.meta?.toDept || r.meta?.department || "—",
        [
          r.meta?.laborName ? `Labor: ${r.meta?.laborName}` : "",
          r.meta?.workOrder ? `WO: ${r.meta?.workOrder}` : "",
          r.meta?.scheme ? `Scheme: ${r.meta?.scheme}` : "",
        ]
          .filter(Boolean)
          .join(" | ") || "—",
      ];
    } else if (report === "inward") {
      headers = [
        "Inward Date",
        "Item",
        "Unit",
        "Qty",
        "Purchaser",
        "Bill No.",
        "Bill Date",
        "Price per Unit",
      ];
      mapRow = (r) => [
        fmtDate(r.date), // movement date = inward date
        r._itemName,
        r._unit,
        r.quantity ?? 0,
        r.meta?.purchaser || "—",
        r.meta?.billNo || "—",
        fmtDate(r.meta?.billDate),
        r.meta?.pricePerUnit ?? "—",
      ];
    } else if (report === "return") {
      headers = ["Date", "Item", "Unit", "Qty", "Returned From", "Note"];
      mapRow = (r) => [
        fmtDate(r.date),
        r._itemName,
        r._unit,
        r.quantity ?? 0,
        r.meta?.returnedFrom || "—",
        r.note || "—",
      ];
    } else {
      // "all"
      headers = ["Date", "Item", "Unit", "Type", "Qty", "Note"];
      mapRow = (r) => [
        fmtDate(r.date),
        r._itemName,
        r._unit,
        r.type,
        r.quantity ?? 0,
        r.note || "—",
      ];
    }

    const matrix = [headers, ...rows.map(mapRow)];
    const csv = matrix
      .map((row) =>
        row
          .map((cell) => {
            const s = String(cell ?? "");
            const needQ = /[",\n]/.test(s);
            return needQ ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const filenameBase =
      report === "siteIssued"
        ? "site_material_issued"
        : report === "factoryIssued"
        ? "factory_material_issued"
        : report === "outwardAll"
        ? "outward_all"
        : report === "inward"
        ? "inward"
        : report === "return"
        ? "return"
        : "all_transactions";
    a.href = url;
    a.download = `${filenameBase}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="pb-24">
      <Header title={title} />
      <div className="max-w-6xl mx-auto p-4">
        <Card>
          {/* Top toolbar */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <select
                className="bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                value={report}
                onChange={(e) => onChangeReport(e.target.value)}
              >
                <option value="all">All Transactions</option>
                <option value="inward">Inward</option>
                <option value="outwardAll">Outward (All)</option>
                <option value="siteIssued">Site Material Issued</option>
                <option value="factoryIssued">Factory Material Issued</option>
                <option value="return">Return</option>
              </select>

              {report === "siteIssued" && (
                <select
                  className="bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                  value={laborFilter}
                  onChange={(e) => {
                    setPage(1);
                    setLaborFilter(e.target.value);
                  }}
                >
                  <option value="__ALL__">All Labors</option>
                  {laborOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <button
              onClick={exportCSV}
              className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium self-start md:self-auto"
            >
              Export
            </button>
          </div>

          {/* Table header depends on report */}
          {report === "siteIssued" ? (
            <div className="grid grid-cols-12 bg-gray-200 text-gray-800 font-semibold rounded-md px-4 py-3">
              <div className="col-span-2">DATE</div>
              <div className="col-span-4">ITEM NAME</div>
              <div className="col-span-1">UNIT</div>
              <div className="col-span-1">QTY</div>
              <div className="col-span-2">TO / SITE</div>
              <div className="col-span-2">LABOR / WO / SCHEME</div>
            </div>
          ) : report === "factoryIssued" ? (
            <div className="grid grid-cols-12 bg-gray-200 text-gray-800 font-semibold rounded-md px-4 py-3">
              <div className="col-span-2">DATE</div>
              <div className="col-span-5">ITEM NAME</div>
              <div className="col-span-1">UNIT</div>
              <div className="col-span-1">QTY</div>
              <div className="col-span-3">DEPARTMENT / ISSUE TO</div>
            </div>
          ) : report === "outwardAll" ? (
            <div className="grid grid-cols-12 bg-gray-200 text-gray-800 font-semibold rounded-md px-4 py-3">
              <div className="col-span-2">DATE</div>
              <div className="col-span-4">ITEM NAME</div>
              <div className="col-span-1">UNIT</div>
              <div className="col-span-1">TYPE</div>
              <div className="col-span-1">QTY</div>
              <div className="col-span-3">TO / DEPT &amp; LABOR / WO / SCHEME</div>
            </div>
          ) : report === "inward" ? (
            <div className="grid grid-cols-12 bg-gray-200 text-gray-800 font-semibold rounded-md px-4 py-3">
              <div className="col-span-2">INWARD DATE</div>
              <div className="col-span-3">ITEM NAME</div>
              <div className="col-span-1">UNIT</div>
              <div className="col-span-1">QTY</div>
              <div className="col-span-2">PURCHASER</div>
              <div className="col-span-1">BILL NO.</div>
              <div className="col-span-2">BILL DATE</div>
            </div>
          ) : report === "return" ? (
            <div className="grid grid-cols-12 bg-gray-200 text-gray-800 font-semibold rounded-md px-4 py-3">
              <div className="col-span-2">DATE</div>
              <div className="col-span-5">ITEM NAME</div>
              <div className="col-span-1">UNIT</div>
              <div className="col-span-1">QTY</div>
              <div className="col-span-3">RETURNED FROM / NOTE</div>
            </div>
          ) : (
            <div className="grid grid-cols-12 bg-gray-200 text-gray-800 font-semibold rounded-md px-4 py-3">
              <div className="col-span-2">DATE</div>
              <div className="col-span-5">ITEM NAME</div>
              <div className="col-span-1">UNIT</div>
              <div className="col-span-1">TYPE</div>
              <div className="col-span-3">QTY / NOTE</div>
            </div>
          )}

          {/* Rows */}
          {pageRows.length === 0 ? (
            <div className="px-4 py-10 text-gray-500">No entries.</div>
          ) : (
            <div className="divide-y">
              {pageRows.map((r) => {
                if (report === "siteIssued") {
                  return (
                    <div key={r.id} className="grid grid-cols-12 px-4 py-3">
                      <div className="col-span-2">{fmtDate(r.date)}</div>
                      <div className="col-span-4 truncate font-medium">
                        {r._itemName}
                      </div>
                      <div className="col-span-1">{r._unit}</div>
                      <div className="col-span-1">{r.quantity ?? 0}</div>
                      <div className="col-span-2">{r.meta?.toSite || "—"}</div>
                      <div className="col-span-2 truncate">
                        {[
                          r.meta?.laborName ? `Labor: ${r.meta?.laborName}` : "",
                          r.meta?.workOrder ? `WO: ${r.meta?.workOrder}` : "",
                          r.meta?.scheme ? `Scheme: ${r.meta?.scheme}` : "",
                        ]
                          .filter(Boolean)
                          .join(" | ") || "—"}
                      </div>
                    </div>
                  );
                }

                if (report === "factoryIssued") {
                  return (
                    <div key={r.id} className="grid grid-cols-12 px-4 py-3">
                      <div className="col-span-2">{fmtDate(r.date)}</div>
                      <div className="col-span-5 truncate font-medium">
                        {r._itemName}
                      </div>
                      <div className="col-span-1">{r._unit}</div>
                      <div className="col-span-1">{r.quantity ?? 0}</div>
                      <div className="col-span-3 truncate">
                        {(r.meta?.toDept || r.meta?.department || "—") +
                          (r.meta?.issueEmployee
                            ? ` | Issue To: ${r.meta?.issueEmployee}`
                            : "")}
                      </div>
                    </div>
                  );
                }

                if (report === "outwardAll") {
                  return (
                    <div key={r.id} className="grid grid-cols-12 px-4 py-3">
                      <div className="col-span-2">{fmtDate(r.date)}</div>
                      <div className="col-span-4 truncate font-medium">
                        {r._itemName}
                      </div>
                      <div className="col-span-1">{r._unit}</div>
                      <div className="col-span-1">{r.type}</div>
                      <div className="col-span-1">{r.quantity ?? 0}</div>
                      <div className="col-span-3 truncate">
                        {[
                          r.meta?.toSite || r.meta?.toDept || r.meta?.department || "",
                          r.meta?.laborName ? `Labor: ${r.meta?.laborName}` : "",
                          r.meta?.workOrder ? `WO: ${r.meta?.workOrder}` : "",
                          r.meta?.scheme ? `Scheme: ${r.meta?.scheme}` : "",
                        ]
                          .filter(Boolean)
                          .join(" | ") || "—"}
                      </div>
                    </div>
                  );
                }

                if (report === "inward") {
                  return (
                    <div key={r.id} className="grid grid-cols-12 px-4 py-3">
                      <div className="col-span-2">{fmtDate(r.date)}</div>
                      <div className="col-span-3 truncate font-medium">
                        {r._itemName}
                      </div>
                      <div className="col-span-1">{r._unit}</div>
                      <div className="col-span-1">{r.quantity ?? 0}</div>
                      <div className="col-span-2">{r.meta?.purchaser || "—"}</div>
                      <div className="col-span-1">{r.meta?.billNo || "—"}</div>
                      <div className="col-span-2">{fmtDate(r.meta?.billDate)}</div>
                    </div>
                  );
                }

                if (report === "return") {
                  return (
                    <div key={r.id} className="grid grid-cols-12 px-4 py-3">
                      <div className="col-span-2">{fmtDate(r.date)}</div>
                      <div className="col-span-5 truncate font-medium">
                        {r._itemName}
                      </div>
                      <div className="col-span-1">{r._unit}</div>
                      <div className="col-span-1">{r.quantity ?? 0}</div>
                      <div className="col-span-3 truncate">
                        {(r.meta?.returnedFrom || "—") +
                          (r.note ? ` | ${r.note}` : "")}
                      </div>
                    </div>
                  );
                }

                // all
                return (
                  <div key={r.id} className="grid grid-cols-12 px-4 py-3">
                    <div className="col-span-2">{fmtDate(r.date)}</div>
                    <div className="col-span-5 truncate font-medium">
                      {r._itemName}
                    </div>
                    <div className="col-span-1">{r._unit}</div>
                    <div className="col-span-1">{r.type}</div>
                    <div className="col-span-3">
                      {(r.quantity ?? 0) + (r.note ? ` | ${r.note}` : "")}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-500">
              Showing {(currentPage - 1) * PER_PAGE + 1}–
              {Math.min(currentPage * PER_PAGE, filteredRows.length)} of{" "}
              {filteredRows.length}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50"
              >
                Prev
              </button>
              <div className="text-sm">
                Page {currentPage} / {totalPages}
              </div>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50"
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

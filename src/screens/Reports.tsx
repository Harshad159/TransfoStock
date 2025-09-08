import React, { useMemo, useState } from "react";
import Header from "../components/Header";
import Card from "../components/Card";
import { useInventory } from "../context/InventoryContext";

const T_IN = "INWARD";
const T_OUT = "OUTWARD";
const T_OUT_SITE = "OUTWARD_SITE";
const T_OUT_FACTORY = "OUTWARD_FACTORY";
const T_RETURN = "RETURN";

type Mode =
  | "ALL"
  | "INWARD"
  | "OUTWARD_ALL"
  | "OUTWARD_SITE"
  | "OUTWARD_FACTORY";

const MODE_LABEL: Record<Mode, string> = {
  ALL: "All Transactions",
  INWARD: "Inward",
  OUTWARD_ALL: "Outward (All)",
  OUTWARD_SITE: "Site Material Issued",
  OUTWARD_FACTORY: "Factory Material Issued",
};

function formatDateISO(d: string | number | Date) {
  try {
    const dd = new Date(d);
    return dd.toLocaleDateString();
  } catch {
    return "";
  }
}

function asDisplayDate(s?: string) {
  if (!s) return "";
  const t = Date.parse(s);
  return Number.isFinite(t) ? formatDateISO(t) : s;
}

function num(n: unknown) {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

/** Parse “Purchaser: … | Bill: … | Bill Date: … | Price: …” */
function parseInwardFromNote(note?: string) {
  const res: {
    purchaser?: string;
    billNo?: string;
    billDate?: string;
    pricePerUnit?: number;
  } = {};
  if (!note) return res;
  const parts = note.split("|").map((s) => s.trim());
  for (const p of parts) {
    const [kRaw, ...rest] = p.split(":");
    if (!kRaw || rest.length === 0) continue;
    const k = kRaw.trim().toLowerCase();
    const v = rest.join(":").trim();
    if (k.startsWith("purchaser")) res.purchaser = v;
    else if (k === "bill" || k.startsWith("bill no")) res.billNo = v;
    else if (k.startsWith("bill date")) res.billDate = v;
    else if (k.startsWith("price"))
      res.pricePerUnit = Number(v.replace(/[^0-9.]/g, ""));
  }
  return res;
}

/** Parse outward note (site/factory) */
function parseOutwardFromNote(note?: string) {
  const res: {
    toDept?: string;
    laborName?: string;
    workOrder?: string;
    scheme?: string;
    employeeName?: string; // factory
  } = {};
  if (!note) return res;
  const parts = note.split("|").map((s) => s.trim());
  for (const p of parts) {
    const [kRaw, ...rest] = p.split(":");
    if (!kRaw || rest.length === 0) continue;
    const k = kRaw.trim().toLowerCase();
    const v = rest.join(":").trim();
    if (k.startsWith("given to") || k === "to" || k.includes("dept") || k.includes("site"))
      res.toDept = v;
    else if (k.startsWith("labor")) res.laborName = v;
    else if (k === "wo" || k.startsWith("work order")) res.workOrder = v;
    else if (k.startsWith("scheme")) res.scheme = v;
    else if (k.includes("employee") || k.startsWith("issued to"))
      res.employeeName = v;
  }
  return res;
}

function useNormalizedRows() {
  const { state } = useInventory();

  return useMemo(() => {
    const rows: Array<{
      id: string;
      date: string;            // transaction date ISO (NOT bill date)
      dateDisplay: string;     // formatted txn date
      itemId: string;
      itemName: string;
      unit: string;
      qty: number;
      rawType: string;
      niceType: string;

      purchaser?: string;
      billNo?: string;
      billDate?: string;
      billDateDisplay?: string;
      pricePerUnit?: number;

      toDept?: string;
      laborName?: string;
      workOrder?: string;
      scheme?: string;
      employeeName?: string;

      note?: string;
    }> = [];

    for (const item of state.items) {
      for (const mv of item.history || []) {
        const rawType = String(mv.type || "").toUpperCase();

        // choose outward label
        let niceType = rawType;
        if (rawType === T_OUT_SITE) niceType = "OUTWARD (Site)";
        else if (rawType === T_OUT_FACTORY) niceType = "OUTWARD (Factory)";
        else if (rawType === T_OUT) {
          const n = (mv.note || "").toLowerCase();
          if (n.includes("site issue")) niceType = "OUTWARD (Site)";
          else if (n.includes("factory")) niceType = "OUTWARD (Factory)";
          else niceType = "OUTWARD";
        }

        // IMPORTANT: transaction date (never bill date)
        const txnDateIso: string =
          (mv as any).txnDate ||
          (mv as any).createdAt ||
          (mv as any).created_at ||
          (mv as any).timestamp ||
          mv.date ||                          // last resort
          new Date().toISOString();

        const base: any = {
          id: mv.id || crypto.randomUUID(),
          date: txnDateIso,
          dateDisplay: formatDateISO(txnDateIso),
          itemId: item.id,
          itemName: item.name,
          unit: item.unit,
          qty: num(mv.quantity),
          rawType,
          niceType,
          note: mv.note || "",
        };

        // structured fields if present
        if ((mv as any).purchaser) base.purchaser = (mv as any).purchaser;
        if ((mv as any).billNo) base.billNo = (mv as any).billNo;
        if ((mv as any).billDate) base.billDate = (mv as any).billDate;
        if ((mv as any).pricePerUnit != null)
          base.pricePerUnit = Number((mv as any).pricePerUnit);

        if ((mv as any).toDept) base.toDept = (mv as any).toDept;
        if ((mv as any).laborName) base.laborName = (mv as any).laborName;
        if ((mv as any).workOrder) base.workOrder = (mv as any).workOrder;
        if ((mv as any).scheme) base.scheme = (mv as any).scheme;
        if ((mv as any).employeeName) base.employeeName = (mv as any).employeeName;

        // Fallback parse from note
        if (rawType === T_IN) {
          const p = parseInwardFromNote(mv.note);
          base.purchaser ??= p.purchaser;
          base.billNo ??= p.billNo;
          base.billDate ??= p.billDate; // used only as bill date, not txn date
          if (base.pricePerUnit == null && p.pricePerUnit != null)
            base.pricePerUnit = p.pricePerUnit;
        } else if (
          rawType === T_OUT ||
          rawType === T_OUT_SITE ||
          rawType === T_OUT_FACTORY
        ) {
          const p = parseOutwardFromNote(mv.note);
          base.toDept ??= p.toDept;
          base.laborName ??= p.laborName;
          base.workOrder ??= p.workOrder;
          base.scheme ??= p.scheme;
          base.employeeName ??= p.employeeName;
        }

        base.billDateDisplay = asDisplayDate(base.billDate);

        rows.push(base);
      }
    }

    rows.sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0));
    return rows;
  }, [state.items]);
}

function toCSV(rows: string[][]) {
  return rows
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
}

export default function Reports() {
  const rows = useNormalizedRows();
  const [mode, setMode] = useState<Mode>("ALL");
  const [laborFilter, setLaborFilter] = useState<string>("All Labors");

  const filtered = useMemo(() => {
    let list = rows;
    switch (mode) {
      case "INWARD":
        list = rows.filter((r) => r.rawType === T_IN);
        break;
      case "OUTWARD_ALL":
        list = rows.filter(
          (r) =>
            r.rawType === T_OUT ||
            r.rawType === T_OUT_SITE ||
            r.rawType === T_OUT_FACTORY
        );
        break;
      case "OUTWARD_SITE":
        list = rows.filter(
          (r) =>
            r.rawType === T_OUT_SITE ||
            (r.rawType === T_OUT && r.niceType.includes("(Site)"))
        );
        break;
      case "OUTWARD_FACTORY":
        list = rows.filter(
          (r) =>
            r.rawType === T_OUT_FACTORY ||
            (r.rawType === T_OUT && r.niceType.includes("(Factory)"))
        );
        break;
      default:
        list = rows;
    }
    if (mode === "OUTWARD_SITE" && laborFilter !== "All Labors") {
      list = list.filter((r) => (r.laborName || "") === laborFilter);
    }
    return list;
  }, [rows, mode, laborFilter]);

  const siteLabors = useMemo(() => {
    if (mode !== "OUTWARD_SITE") return [];
    const set = new Set<string>();
    filtered.forEach((r) => r.laborName && set.add(r.laborName));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [filtered, mode]);

  function onExport() {
    let header: string[] = [];
    const out: string[][] = [];

    if (mode === "INWARD") {
      header = [
        "Date",
        "Item Name",
        "Unit",
        "Qty",
        "Price per Unit",
        "Purchaser",
        "Bill No.",
        "Bill Date",
      ];
      filtered.forEach((r) => {
        out.push([
          r.dateDisplay,
          r.itemName,
          r.unit,
          String(r.qty),
          r.pricePerUnit != null ? String(r.pricePerUnit) : "",
          r.purchaser || "",
          r.billNo || "",
          r.billDateDisplay || "",
        ]);
      });
    } else if (mode === "OUTWARD_ALL") {
      header = ["Date", "Item Name", "Unit", "Type", "Qty", "To / Dept"];
      filtered.forEach((r) => {
        out.push([
          r.dateDisplay,
          r.itemName,
          r.unit,
          r.niceType,
          String(r.qty),
          r.toDept || "",
        ]);
      });
    } else if (mode === "OUTWARD_SITE") {
      header = ["Date", "Item Name", "Unit", "Qty", "To / Site", "Labor", "WO", "Scheme"];
      filtered.forEach((r) => {
        out.push([
          r.dateDisplay,
          r.itemName,
          r.unit,
          String(r.qty),
          r.toDept || "",
          r.laborName || "",
          r.workOrder || "",
          r.scheme || "",
        ]);
      });
    } else if (mode === "OUTWARD_FACTORY") {
      header = ["Date", "Item Name", "Unit", "Qty", "Department", "Issue to Employee"];
      filtered.forEach((r) => {
        out.push([
          r.dateDisplay,
          r.itemName,
          r.unit,
          String(r.qty),
          r.toDept || "",
          r.employeeName || "",
        ]);
      });
    } else {
      header = ["Date", "Item Name", "Unit", "Qty", "Type / Note"];
      filtered.forEach((r) => {
        out.push([
          r.dateDisplay,
          r.itemName,
          r.unit,
          String(r.qty),
          r.niceType + (r.note ? ` | ${r.note}` : ""),
        ]);
      });
    }

    const csv = toCSV([header, ...out]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const fileName =
      mode === "INWARD"
        ? "inward_report.csv"
        : mode === "OUTWARD_SITE"
        ? "site_material_issued.csv"
        : mode === "OUTWARD_FACTORY"
        ? "factory_material_issued.csv"
        : mode === "OUTWARD_ALL"
        ? "outward_all.csv"
        : "all_transactions.csv";
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="pb-24">
      <Header title="Reports" />
      <div className="max-w-6xl mx-auto p-4">
        <Card>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div className="flex gap-3">
              <select
                className="bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                value={mode}
                onChange={(e) => {
                  const next = e.target.value as Mode;
                  setMode(next);
                  setLaborFilter("All Labors");
                }}
              >
                <option value="ALL">{MODE_LABEL.ALL}</option>
                <option value="INWARD">{MODE_LABEL.INWARD}</option>
                <option value="OUTWARD_ALL">{MODE_LABEL.OUTWARD_ALL}</option>
                <option value="OUTWARD_SITE">{MODE_LABEL.OUTWARD_SITE}</option>
                <option value="OUTWARD_FACTORY">{MODE_LABEL.OUTWARD_FACTORY}</option>
              </select>

              {mode === "OUTWARD_SITE" && (
                <select
                  className="bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                  value={laborFilter}
                  onChange={(e) => setLaborFilter(e.target.value)}
                >
                  <option>All Labors</option>
                  {siteLabors.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <button
              onClick={onExport}
              className="min-w-[110px] px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium"
            >
              Export
            </button>
          </div>

          {/* header rows */}
          {mode === "INWARD" ? (
            <div className="grid grid-cols-12 bg-gray-200 text-gray-800 font-semibold rounded-md px-4 py-3">
              <div className="col-span-2">DATE</div>
              <div className="col-span-3">ITEM NAME</div>
              <div className="col-span-1">UNIT</div>
              <div className="col-span-1">QTY</div>
              <div className="col-span-1">PRICE/UNIT</div>
              <div className="col-span-2">PURCHASER</div>
              <div className="col-span-1">BILL NO.</div>
              <div className="col-span-1">BILL DATE</div>
            </div>
          ) : mode === "OUTWARD_ALL" ? (
            <div className="grid grid-cols-12 bg-gray-200 text-gray-800 font-semibold rounded-md px-4 py-3">
              <div className="col-span-2">DATE</div>
              <div className="col-span-3">ITEM NAME</div>
              <div className="col-span-1">UNIT</div>
              <div className="col-span-2">TYPE</div>
              <div className="col-span-1">QTY</div>
              <div className="col-span-3">TO / DEPT</div>
            </div>
          ) : mode === "OUTWARD_SITE" ? (
            <div className="grid grid-cols-12 bg-gray-200 text-gray-800 font-semibold rounded-md px-4 py-3">
              <div className="col-span-2">DATE</div>
              <div className="col-span-3">ITEM NAME</div>
              <div className="col-span-1">UNIT</div>
              <div className="col-span-1">QTY</div>
              <div className="col-span-2">TO / SITE</div>
              <div className="col-span-1">LABOR</div>
              <div className="col-span-1">WO</div>
              <div className="col-span-1">SCHEME</div>
            </div>
          ) : mode === "OUTWARD_FACTORY" ? (
            <div className="grid grid-cols-12 bg-gray-200 text-gray-800 font-semibold rounded-md px-4 py-3">
              <div className="col-span-2">DATE</div>
              <div className="col-span-3">ITEM NAME</div>
              <div className="col-span-1">UNIT</div>
              <div className="col-span-1">QTY</div>
              <div className="col-span-3">DEPARTMENT</div>
              <div className="col-span-2">ISSUE TO EMPLOYEE</div>
            </div>
          ) : (
            <div className="grid grid-cols-12 bg-gray-200 text-gray-800 font-semibold rounded-md px-4 py-3">
              <div className="col-span-2">DATE</div>
              <div className="col-span-4">ITEM NAME</div>
              <div className="col-span-1">UNIT</div>
              <div className="col-span-1">QTY</div>
              <div className="col-span-4">TYPE / NOTE</div>
            </div>
          )}

          {/* rows */}
          {filtered.length === 0 ? (
            <div className="text-gray-600 px-4 py-8">No entries.</div>
          ) : (
            <div className="divide-y">
              {filtered.map((r) => {
                if (mode === "INWARD") {
                  return (
                    <div key={r.id} className="grid grid-cols-12 px-4 py-3">
                      <div className="col-span-2">{r.dateDisplay}</div>
                      <div className="col-span-3 truncate">{r.itemName}</div>
                      <div className="col-span-1">{r.unit}</div>
                      <div className="col-span-1">{r.qty}</div>
                      <div className="col-span-1">{r.pricePerUnit ?? ""}</div>
                      <div className="col-span-2 truncate">{r.purchaser || ""}</div>
                      <div className="col-span-1 truncate">{r.billNo || ""}</div>
                      <div className="col-span-1 truncate">{r.billDateDisplay || ""}</div>
                    </div>
                  );
                } else if (mode === "OUTWARD_ALL") {
                  return (
                    <div key={r.id} className="grid grid-cols-12 px-4 py-3">
                      <div className="col-span-2">{r.dateDisplay}</div>
                      <div className="col-span-3 truncate">{r.itemName}</div>
                      <div className="col-span-1">{r.unit}</div>
                      <div className="col-span-2">{r.niceType}</div>
                      <div className="col-span-1">{r.qty}</div>
                      <div className="col-span-3 truncate">{r.toDept || ""}</div>
                    </div>
                  );
                } else if (mode === "OUTWARD_SITE") {
                  return (
                    <div key={r.id} className="grid grid-cols-12 px-4 py-3">
                      <div className="col-span-2">{r.dateDisplay}</div>
                      <div className="col-span-3 truncate">{r.itemName}</div>
                      <div className="col-span-1">{r.unit}</div>
                      <div className="col-span-1">{r.qty}</div>
                      <div className="col-span-2 truncate">{r.toDept || ""}</div>
                      <div className="col-span-1 truncate">{r.laborName || ""}</div>
                      <div className="col-span-1 truncate">{r.workOrder || ""}</div>
                      <div className="col-span-1 truncate">{r.scheme || ""}</div>
                    </div>
                  );
                } else if (mode === "OUTWARD_FACTORY") {
                  return (
                    <div key={r.id} className="grid grid-cols-12 px-4 py-3">
                      <div className="col-span-2">{r.dateDisplay}</div>
                      <div className="col-span-3 truncate">{r.itemName}</div>
                      <div className="col-span-1">{r.unit}</div>
                      <div className="col-span-1">{r.qty}</div>
                      <div className="col-span-3 truncate">{r.toDept || ""}</div>
                      <div className="col-span-2 truncate">{r.employeeName || ""}</div>
                    </div>
                  );
                } else {
                  return (
                    <div key={r.id} className="grid grid-cols-12 px-4 py-3">
                      <div className="col-span-2">{r.dateDisplay}</div>
                      <div className="col-span-4 truncate">{r.itemName}</div>
                      <div className="col-span-1">{r.unit}</div>
                      <div className="col-span-1">{r.qty}</div>
                      <div className="col-span-4 truncate">
                        {r.niceType}
                        {r.note ? ` | ${r.note}` : ""}
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

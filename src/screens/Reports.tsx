import React, { useMemo, useState } from "react";
import Header from "../components/Header";
import Card from "../components/Card";
import { useInventory } from "../context/InventoryContext";

// ---- Types (as used across app) ------------------------------------
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
  | "OUTWARD_FACTORY"
  | "RETURN";

const MODE_LABEL: Record<Mode, string> = {
  ALL: "All Transactions (Ledger)",
  INWARD: "Inward",
  OUTWARD_ALL: "Outward (All)",
  OUTWARD_SITE: "Site Material Issued",
  OUTWARD_FACTORY: "Factory Material Issued",
  RETURN: "Return",
};

// ---- Helpers --------------------------------------------------------
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

function toNumber(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
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

/** Extract structured fields from inward “note” if used previously */
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

/** Extract structured fields from outward “note” if used previously */
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

// ---- Normalization: build a flattened ledger from context ----------
function useLedgerRows() {
  const { state } = useInventory();

  return useMemo(() => {
    const rows: Array<{
      id: string;
      // dates
      dateISO: string;          // transaction date (created/recorded) -> used as first column
      dateDisplay: string;
      billDate?: string;
      billDateDisplay?: string;

      // item
      itemId: string;
      itemName: string;
      unit: string;
      qty: number;
      rate: number;             // use item.purchasePrice or inward pricePerUnit if available
      amount: number;

      // type
      rawType: string;
      typeLabel: string;

      // inward details
      purchaser?: string;
      billNo?: string;

      // outward/site/factory details
      toDept?: string;          // Dept or Site
      laborName?: string;       // site
      workOrder?: string;       // site
      scheme?: string;          // site
      employeeName?: string;    // factory

      // returns
      returnedFrom?: string;

      // original note if any
      note?: string;
    }> = [];

    for (const item of state.items) {
      const baseRate =
        toNumber(item.purchasePrice, 0); // fallback for outward/return
      for (const mv of item.history || []) {
        const rawType = String(mv.type || "").toUpperCase();

        // map outward generic to sublabels
        let typeLabel = rawType;
        if (rawType === T_OUT_SITE) typeLabel = "OUTWARD · Site Issue";
        else if (rawType === T_OUT_FACTORY) typeLabel = "OUTWARD · Factory Issue";
        else if (rawType === T_OUT) {
          const n = (mv.note || "").toLowerCase();
          if (n.includes("site issue")) typeLabel = "OUTWARD · Site Issue";
          else if (n.includes("factory")) typeLabel = "OUTWARD · Factory Issue";
          else typeLabel = "OUTWARD";
        } else if (rawType === T_IN) {
          typeLabel = "INWARD";
        } else if (rawType === T_RETURN) {
          typeLabel = "RETURN";
        }

        // transaction date (strictly the recorded date, NOT bill date)
        const txnISO: string =
          (mv as any).txnDate ||
          (mv as any).createdAt ||
          (mv as any).created_at ||
          (mv as any).timestamp ||
          mv.date ||
          new Date().toISOString();

        const r: any = {
          id: mv.id || crypto.randomUUID(),
          dateISO: txnISO,
          dateDisplay: formatDateISO(txnISO),
          billDate: (mv as any).billDate,
          billDateDisplay: asDisplayDate((mv as any).billDate),
          itemId: item.id,
          itemName: item.name,
          unit: item.unit,
          qty: toNumber(mv.quantity, 0),
          rate: baseRate,
          amount: 0,
          rawType,
          typeLabel,
          note: mv.note || "",
        };

        // Possible structured fields
        if ((mv as any).pricePerUnit != null)
          r.rate = toNumber((mv as any).pricePerUnit, baseRate);

        if (rawType === T_IN) {
          r.purchaser = (mv as any).purchaser ?? undefined;
          r.billNo = (mv as any).billNo ?? undefined;
          // parse from note if needed
          if (!r.purchaser || !r.billNo || !r.billDate || !(mv as any).pricePerUnit) {
            const p = parseInwardFromNote(mv.note);
            r.purchaser ??= p.purchaser;
            r.billNo ??= p.billNo;
            r.billDate ??= p.billDate;
            r.billDateDisplay = asDisplayDate(r.billDate);
            if ((mv as any).pricePerUnit == null && p.pricePerUnit != null) {
              r.rate = toNumber(p.pricePerUnit, baseRate);
            }
          }
        } else if (
          rawType === T_OUT ||
          rawType === T_OUT_SITE ||
          rawType === T_OUT_FACTORY
        ) {
          r.toDept = (mv as any).toDept ?? undefined;
          r.laborName = (mv as any).laborName ?? undefined;
          r.workOrder = (mv as any).workOrder ?? undefined;
          r.scheme = (mv as any).scheme ?? undefined;
          r.employeeName = (mv as any).employeeName ?? undefined;

          // parse from note as fallback
          if (!r.toDept || !r.laborName || !r.workOrder || !r.scheme || !r.employeeName) {
            const p = parseOutwardFromNote(mv.note);
            r.toDept ??= p.toDept;
            r.laborName ??= p.laborName;
            r.workOrder ??= p.workOrder;
            r.scheme ??= p.scheme;
            r.employeeName ??= p.employeeName;
          }
        } else if (rawType === T_RETURN) {
          // if note contains return source
          const nm = (mv.note || "");
          const m = nm.match(/Returned from\s+(.+)/i);
          if (m) r.returnedFrom = m[1].trim();
        }

        r.amount = +(r.qty * r.rate).toFixed(2);
        rows.push(r);
      }
    }

    // newest first
    rows.sort((a, b) => (a.dateISO > b.dateISO ? -1 : a.dateISO < b.dateISO ? 1 : 0));
    return rows;
  }, [state.items]);
}

// ---- Main component -------------------------------------------------
export default function Reports() {
  const rows = useLedgerRows();
  const [mode, setMode] = useState<Mode>("ALL");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState<string>(""); // yyyy-mm-dd
  const [to, setTo] = useState<string>("");     // yyyy-mm-dd
  const [laborFilter, setLaborFilter] = useState<string>("All Labors");

  const filtered = useMemo(() => {
    // base filter by mode
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
            (r.rawType === T_OUT && r.typeLabel.includes("Site"))
        );
        break;
      case "OUTWARD_FACTORY":
        list = rows.filter(
          (r) =>
            r.rawType === T_OUT_FACTORY ||
            (r.rawType === T_OUT && r.typeLabel.includes("Factory"))
        );
        break;
      case "RETURN":
        list = rows.filter((r) => r.rawType === T_RETURN);
        break;
      default:
        list = rows;
    }

    // labor filter (Site Material Issued)
    if (mode === "OUTWARD_SITE" && laborFilter !== "All Labors") {
      list = list.filter((r) => (r.laborName || "") === laborFilter);
    }

    // date range
    const fromTs = from ? Date.parse(from) : undefined;
    const toTs = to ? Date.parse(to) : undefined;
    if (fromTs || toTs) {
      list = list.filter((r) => {
        const t = Date.parse(r.dateISO);
        if (fromTs && t < fromTs) return false;
        if (toTs && t > toTs + 24 * 3600 * 1000 - 1) return false;
        return true;
      });
    }

    // search (item/purchaser/toDept etc.)
    const needle = q.trim().toLowerCase();
    if (needle) {
      list = list.filter((r) => {
        return (
          r.itemName.toLowerCase().includes(needle) ||
          (r.purchaser || "").toLowerCase().includes(needle) ||
          (r.billNo || "").toLowerCase().includes(needle) ||
          (r.toDept || "").toLowerCase().includes(needle) ||
          (r.laborName || "").toLowerCase().includes(needle) ||
          (r.employeeName || "").toLowerCase().includes(needle)
        );
      });
    }

    return list;
  }, [rows, mode, q, from, to, laborFilter]);

  const siteLabors = useMemo(() => {
    if (mode !== "OUTWARD_SITE") return [];
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.rawType === T_OUT_SITE || r.typeLabel.includes("Site")) {
        if (r.laborName) set.add(r.laborName);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows, mode]);

  const totals = useMemo(() => {
    const tQty = filtered.reduce((s, r) => s + r.qty, 0);
    const tAmt = filtered.reduce((s, r) => s + r.amount, 0);
    return { qty: tQty, amount: +tAmt.toFixed(2) };
  }, [filtered]);

  // ---- Export -------------------------------------------------------
  function exportCSV() {
    let header: string[] = [];
    const body: string[][] = [];

    const pushAllLedger = () => {
      header = [
        "Date",
        "Item Name",
        "Unit",
        "Qty",
        "Type",
        "Rate",
        "Amount",
        "Purchaser",
        "Bill No.",
        "Bill Date",
        "To / Dept / Site",
        "Labor",
        "WO",
        "Scheme",
        "Issue to Employee",
        "Return From",
        "Note",
      ];
      filtered.forEach((r) => {
        body.push([
          r.dateDisplay,
          r.itemName,
          r.unit,
          String(r.qty),
          r.typeLabel,
          r.rate ? r.rate.toString() : "",
          r.amount ? r.amount.toString() : "",
          r.purchaser || "",
          r.billNo || "",
          r.billDateDisplay || "",
          r.toDept || "",
          r.laborName || "",
          r.workOrder || "",
          r.scheme || "",
          r.employeeName || "",
          r.returnedFrom || "",
          r.note || "",
        ]);
      });
    };

    if (mode === "INWARD") {
      header = [
        "Date",
        "Item Name",
        "Unit",
        "Qty",
        "Price per Unit",
        "Amount",
        "Purchaser",
        "Bill No.",
        "Bill Date",
      ];
      filtered.forEach((r) => {
        body.push([
          r.dateDisplay,
          r.itemName,
          r.unit,
          String(r.qty),
          r.rate ? r.rate.toString() : "",
          r.amount ? r.amount.toString() : "",
          r.purchaser || "",
          r.billNo || "",
          r.billDateDisplay || "",
        ]);
      });
    } else if (mode === "OUTWARD_ALL") {
      header = ["Date", "Item Name", "Unit", "Qty", "Type", "To / Dept", "Rate", "Amount"];
      filtered.forEach((r) => {
        body.push([
          r.dateDisplay,
          r.itemName,
          r.unit,
          String(r.qty),
          r.typeLabel,
          r.toDept || "",
          r.rate ? r.rate.toString() : "",
          r.amount ? r.amount.toString() : "",
        ]);
      });
    } else if (mode === "OUTWARD_SITE") {
      header = [
        "Date",
        "Item Name",
        "Unit",
        "Qty",
        "To / Site",
        "Labor",
        "WO",
        "Scheme",
        "Rate",
        "Amount",
      ];
      filtered.forEach((r) => {
        body.push([
          r.dateDisplay,
          r.itemName,
          r.unit,
          String(r.qty),
          r.toDept || "",
          r.laborName || "",
          r.workOrder || "",
          r.scheme || "",
          r.rate ? r.rate.toString() : "",
          r.amount ? r.amount.toString() : "",
        ]);
      });
    } else if (mode === "OUTWARD_FACTORY") {
      header = [
        "Date",
        "Item Name",
        "Unit",
        "Qty",
        "Department",
        "Issue to Employee",
        "Rate",
        "Amount",
      ];
      filtered.forEach((r) => {
        body.push([
          r.dateDisplay,
          r.itemName,
          r.unit,
          String(r.qty),
          r.toDept || "",
          r.employeeName || "",
          r.rate ? r.rate.toString() : "",
          r.amount ? r.amount.toString() : "",
        ]);
      });
    } else if (mode === "RETURN") {
      header = ["Date", "Item Name", "Unit", "Qty", "Returned From", "Rate", "Amount"];
      filtered.forEach((r) => {
        body.push([
          r.dateDisplay,
          r.itemName,
          r.unit,
          String(r.qty),
          r.returnedFrom || "",
          r.rate ? r.rate.toString() : "",
          r.amount ? r.amount.toString() : "",
        ]);
      });
    } else {
      pushAllLedger();
    }

    // Totals row
    body.push([]);
    body.push(["", "", "", "TOTAL QTY", String(totals.qty), "", "TOTAL AMOUNT", String(totals.amount)]);

    const csv = toCSV([header, ...body]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const file =
      mode === "INWARD"
        ? "inward_report.csv"
        : mode === "OUTWARD_SITE"
        ? "site_material_issued.csv"
        : mode === "OUTWARD_FACTORY"
        ? "factory_material_issued.csv"
        : mode === "OUTWARD_ALL"
        ? "outward_all.csv"
        : mode === "RETURN"
        ? "returns.csv"
        : "ledger_all.csv";
    a.download = file;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ---- UI -----------------------------------------------------------
  return (
    <div className="pb-24">
      <Header title="Reports" />
      <div className="max-w-6xl mx-auto p-4">
        <Card>
          {/* Filters */}
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <select
                className="bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                value={mode}
                onChange={(e) => {
                  setMode(e.target.value as Mode);
                  setLaborFilter("All Labors");
                }}
              >
                <option value="ALL">{MODE_LABEL.ALL}</option>
                <option value="INWARD">{MODE_LABEL.INWARD}</option>
                <option value="OUTWARD_ALL">{MODE_LABEL.OUTWARD_ALL}</option>
                <option value="OUTWARD_SITE">{MODE_LABEL.OUTWARD_SITE}</option>
                <option value="OUTWARD_FACTORY">{MODE_LABEL.OUTWARD_FACTORY}</option>
                <option value="RETURN">{MODE_LABEL.RETURN}</option>
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

              <input
                type="date"
                placeholder="From"
                className="bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
              <input
                type="date"
                placeholder="To"
                className="bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
              <input
                placeholder="Search (item, purchaser, site, dept, labor...)"
                className="w-64 bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-600">
                <span className="font-medium">Total Qty:</span> {totals.qty} &nbsp;·&nbsp;
                <span className="font-medium">Amount:</span> {totals.amount.toFixed(2)}
              </div>
              <button
                onClick={exportCSV}
                className="min-w-[110px] px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium"
              >
                Export
              </button>
            </div>
          </div>

          {/* Table headers responsive by mode */}
          {/* We keep columns tight so they don't overlap on mobile */}
          {mode === "INWARD" ? (
            <div className="grid grid-cols-12 bg-gray-200 text-gray-800 font-semibold rounded-md px-3 py-2 text-sm md:text-base">
              <div className="col-span-2">DATE</div>
              <div className="col-span-3">ITEM</div>
              <div className="col-span-1">UNIT</div>
              <div className="col-span-1">QTY</div>
              <div className="col-span-1">RATE</div>
              <div className="col-span-1">AMOUNT</div>
              <div className="col-span-2">PURCHASER</div>
              <div className="col-span-1">BILL</div>
              <div className="col-span-0 md:col-span-1 hidden md:block">BILL DATE</div>
            </div>
          ) : mode === "OUTWARD_ALL" ? (
            <div className="grid grid-cols-12 bg-gray-200 text-gray-800 font-semibold rounded-md px-3 py-2 text-sm md:text-base">
              <div className="col-span-2">DATE</div>
              <div className="col-span-3">ITEM</div>
              <div className="col-span-1">UNIT</div>
              <div className="col-span-1">QTY</div>
              <div className="col-span-2">TYPE</div>
              <div className="col-span-2">TO / DEPT</div>
              <div className="col-span-1">RATE</div>
              <div className="col-span-0 md:col-span-1 hidden md:block">AMT</div>
            </div>
          ) : mode === "OUTWARD_SITE" ? (
            <div className="grid grid-cols-12 bg-gray-200 text-gray-800 font-semibold rounded-md px-3 py-2 text-sm md:text-base">
              <div className="col-span-2">DATE</div>
              <div className="col-span-3">ITEM</div>
              <div className="col-span-1">UNIT</div>
              <div className="col-span-1">QTY</div>
              <div className="col-span-2">SITE</div>
              <div className="col-span-1">LABOR</div>
              <div className="col-span-1">WO</div>
              <div className="col-span-1">SCHEME</div>
              <div className="col-span-0 md:col-span-1 hidden md:block">AMT</div>
            </div>
          ) : mode === "OUTWARD_FACTORY" ? (
            <div className="grid grid-cols-12 bg-gray-200 text-gray-800 font-semibold rounded-md px-3 py-2 text-sm md:text-base">
              <div className="col-span-2">DATE</div>
              <div className="col-span-3">ITEM</div>
              <div className="col-span-1">UNIT</div>
              <div className="col-span-1">QTY</div>
              <div className="col-span-3">DEPARTMENT</div>
              <div className="col-span-2">ISSUE TO EMPLOYEE</div>
              <div className="col-span-0 md:col-span-0 md:hidden"></div>
            </div>
          ) : mode === "RETURN" ? (
            <div className="grid grid-cols-12 bg-gray-200 text-gray-800 font-semibold rounded-md px-3 py-2 text-sm md:text-base">
              <div className="col-span-2">DATE</div>
              <div className="col-span-4">ITEM</div>
              <div className="col-span-1">UNIT</div>
              <div className="col-span-1">QTY</div>
              <div className="col-span-4">RETURNED FROM</div>
            </div>
          ) : (
            // ALL (Ledger)
            <div className="grid grid-cols-12 bg-gray-200 text-gray-800 font-semibold rounded-md px-3 py-2 text-sm md:text-base">
              <div className="col-span-2">DATE</div>
              <div className="col-span-4">ITEM</div>
              <div className="col-span-1">UNIT</div>
              <div className="col-span-1">QTY</div>
              <div class

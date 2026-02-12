import React, { useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import Header from "../components/Header";
import Card from "../components/Card";
import { useInventory } from "../context/InventoryContext";

type Mode = "SITE" | "FACTORY";

type LineItem = {
  id: string;
  itemId: string;
  qty: string; // keep as string to avoid leading zero issues; parse on save
};

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function Outward() {
  const { state, dispatch } = useInventory();

  const [mode, setMode] = useState<Mode>("SITE");
  const [date, setDate] = useState<string>(todayISO());

  // Shared meta (applies to all lines in this outward batch)
  // ---- Site meta
  const [toSite, setToSite] = useState("");
  const [labor, setLabor] = useState("");
  const [workOrder, setWorkOrder] = useState("");
  const [scheme, setScheme] = useState("");
  const [deliveryChallan, setDeliveryChallan] = useState("");
  // ---- Factory meta
  const [department, setDepartment] = useState("");
  const [employee, setEmployee] = useState("");

  // Multiple line items
  const [lines, setLines] = useState<LineItem[]>([
    { id: crypto.randomUUID(), itemId: "", qty: "" },
  ]);

  const CHALLAN_PREFIX = "NEWN-DC-";
  const COMPANY = {
    name: "Narsinha Engineering Works",
    address: "E-35, MIDC, Nanded-431603",
    phone: "",
    gst: "27AAJFN9635R1Z8",
  };
  const logoUrl = `${import.meta.env.BASE_URL}icons/narsinha-logo.png`;

  // Items sorted for dropdowns
  const items = useMemo(
    () => [...state.items].sort((a, b) => a.name.localeCompare(b.name)),
    [state.items]
  );

  const outwardEntries = useMemo(
    () =>
      (state.movements as any[])
        .filter((m) => m.type === "OUTWARD")
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [state.movements]
  );

  const challanByNumber = useMemo(() => {
    const map = new Map<string, any>();
    const challans = (state as any).challans || [];
    for (const c of challans) map.set(String(c.number || ""), c);
    return map;
  }, [state]);

  function nextChallanNumber() {
    const existing = (state as any).challans || [];
    let max = 0;
    for (const c of existing) {
      const n = String(c?.number || "");
      if (!n.startsWith(CHALLAN_PREFIX)) continue;
      const raw = n.slice(CHALLAN_PREFIX.length);
      const parsed = parseInt(raw, 10);
      if (Number.isFinite(parsed)) max = Math.max(max, parsed);
    }
    const next = max + 1;
    return `${CHALLAN_PREFIX}${String(next).padStart(3, "0")}`;
  }

  function formatShortDate(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString();
  }

  function getCopyLabels(modeValue: Mode) {
    return modeValue === "SITE"
      ? ["Transport Copy", "Office Copy"]
      : ["Labor Copy", "Office Copy"];
  }

  async function loadLogoData(url: string): Promise<string | null> {
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("read failed"));
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  function renderCopy(
    doc: jsPDF,
    yStart: number,
    challan: any,
    label: string,
    logoData: string | null
  ) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 12;
    let y = yStart;

    if (logoData) {
      doc.addImage(logoData, "PNG", margin, y, 16, 16);
    }

    const textX = logoData ? margin + 20 : margin;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(COMPANY.name, textX, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    if (COMPANY.address) doc.text(COMPANY.address, textX, y + 11);
    if (COMPANY.gst) doc.text(`GST: ${COMPANY.gst}`, textX, y + 15);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Delivery Challan", pageWidth - margin, y + 6, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`No: ${challan.number}`, pageWidth - margin, y + 11, { align: "right" });
    doc.text(`Date: ${formatShortDate(challan.date)}`, pageWidth - margin, y + 15, {
      align: "right",
    });
    doc.text(`Mode: ${challan.mode}`, pageWidth - margin, y + 19, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.text(label, pageWidth - margin, y + 24, { align: "right" });

    const meta = challan.meta || {};
    const basePairs =
      challan.mode === "SITE"
        ? [
            ["To / Site", meta.toSite || "—"],
            ["Labor", meta.laborName || "—"],
            ["Work Order", meta.workOrder || "—"],
            ["Scheme", meta.scheme || "—"],
          ]
        : [
            ["Department", meta.department || "—"],
            ["Issue To", meta.issueToEmployee || "—"],
          ];
    const pairs = [...basePairs, ["Challan No.", challan.number || "—"]];

    const leftX = margin;
    const rightX = pageWidth / 2 + 4;
    const rowHeight = 6;
    let metaY = y + 30;
    pairs.forEach(([labelText, value], idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const x = col === 0 ? leftX : rightX;
      const yRow = metaY + row * rowHeight;
      doc.setFont("helvetica", "bold");
      doc.text(`${labelText}:`, x, yRow);
      doc.setFont("helvetica", "normal");
      doc.text(String(value || "—"), x + 28, yRow);
    });

    const tableY = metaY + Math.ceil(pairs.length / 2) * rowHeight + 4;
    autoTable(doc, {
      startY: tableY,
      head: [["S.No", "Item", "Unit", "Qty"]],
      body: (challan.items || []).map((it: any, idx: number) => [
        String(idx + 1),
        String(it.itemName || ""),
        String(it.unit || ""),
        String(it.quantity || 0),
      ]),
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42] },
      columnStyles: {
        0: { cellWidth: 12 },
        2: { cellWidth: 24 },
        3: { cellWidth: 18, halign: "right" },
      },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || tableY + 20;
    const sigY = finalY + 8;
    doc.setDrawColor(148, 163, 184);
    doc.line(leftX, sigY, leftX + 60, sigY);
    doc.line(pageWidth / 2 + 4, sigY, pageWidth / 2 + 64, sigY);
    doc.setFont("helvetica", "normal");
    doc.text("Issued By", leftX, sigY + 4);
    doc.text("Received By", pageWidth / 2 + 4, sigY + 4);
  }

  async function createChallanPdf(challan: any) {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const logoData = await loadLogoData(logoUrl);
    const labels = getCopyLabels(challan.mode);
    const topY = 12;
    const bottomY = 148;

    renderCopy(doc, topY, challan, labels[0], logoData);
    doc.setDrawColor(226, 232, 240);
    doc.line(12, 142, doc.internal.pageSize.getWidth() - 12, 142);
    renderCopy(doc, bottomY, challan, labels[1], logoData);

    return doc;
  }

  async function downloadAndPrintPdf(challan: any) {
    try {
      const doc = await createChallanPdf(challan);
      const filename = `${String(challan.number || "delivery-challan")}.pdf`;
      doc.save(filename);

      const blobUrl = doc.output("bloburl");
      const printWindow = window.open(blobUrl, "_blank", "noopener,noreferrer");
      if (!printWindow) {
        alert("Popup blocked. The PDF was downloaded.");
        return;
      }
      printWindow.focus();
    } catch {
      alert("Failed to generate PDF. Please try again.");
    }
  }

  function printByNumber(number: string) {
    const key = String(number || "").trim();
    if (!key) return alert("No delivery challan number found.");
    const challan = challanByNumber.get(key);
    if (!challan) return alert("Delivery challan not found for this entry.");
    downloadAndPrintPdf(challan);
  }

  function addLine() {
    setLines((prev) => [...prev, { id: crypto.randomUUID(), itemId: "", qty: "" }]);
  }
  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }
  function updateLine(id: string, patch: Partial<LineItem>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function reset() {
    setDate(todayISO());
    setToSite("");
    setLabor("");
    setWorkOrder("");
    setScheme("");
    setDeliveryChallan("");
    setDepartment("");
    setEmployee("");
    setLines([{ id: crypto.randomUUID(), itemId: "", qty: "" }]);
  }

  async function save() {
    // Basic validation
    const errors: string[] = [];
    const prepared: Array<{
      itemId: string;
      itemName: string;
      unit: string;
      qty: number;
      currentStock: number;
    }> = [];

    if (lines.length === 0) {
      errors.push("Please add at least one item.");
    }

    for (const [idx, ln] of lines.entries()) {
      const rowNo = idx + 1;
      if (!ln.itemId) {
        errors.push(`Row ${rowNo}: Select an item.`);
        continue;
      }
      const item = items.find((i) => i.id === ln.itemId);
      if (!item) {
        errors.push(`Row ${rowNo}: Invalid item.`);
        continue;
      }
      const nQty = Number(ln.qty || "0");
      if (!Number.isFinite(nQty) || nQty <= 0) {
        errors.push(`Row ${rowNo}: Quantity must be greater than 0.`);
        continue;
      }
      const stock = item.currentStock ?? 0;
      if (nQty > stock) {
        errors.push(
          `Row ${rowNo}: "${item.name}" has only ${stock} ${item.unit || ""} in stock.`
        );
        continue;
      }

      prepared.push({
        itemId: item.id,
        itemName: item.name,
        unit: item.unit || "",
        qty: nQty,
        currentStock: stock,
      });
    }

    if (errors.length) {
      alert(errors.join("\n"));
      return;
    }

    // Dispatch one OUTWARD movement per prepared line
    const challanNumber = deliveryChallan.trim() || nextChallanNumber();
    const commonMeta =
      mode === "SITE"
        ? {
            outwardKind: "SITE" as const,
            toSite: toSite || undefined,
            laborName: labor || undefined,
            workOrder: workOrder || undefined,
            scheme: scheme || undefined,
            deliveryChallan: challanNumber,
          }
        : {
            outwardKind: "FACTORY" as const,
            department: department || undefined,
            issueToEmployee: employee || undefined,
            deliveryChallan: challanNumber,
          };

    for (const p of prepared) {
      const movement = {
        id:
          (crypto as any)?.randomUUID?.() ||
          `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        itemId: p.itemId,
        itemName: p.itemName,
        unit: p.unit,
        type: "OUTWARD" as const,
        date: new Date(date).toISOString(),
        quantity: p.qty,
        note:
          mode === "SITE"
            ? [
                "Site Issue",
                toSite ? `Given To: ${toSite}` : null,
                labor ? `Labor: ${labor}` : null,
                workOrder ? `WO: ${workOrder}` : null,
                scheme ? `Scheme: ${scheme}` : null,
                deliveryChallan ? `Delivery Challan: ${deliveryChallan}` : null,
              ]
                .filter(Boolean)
                .join(" | ")
            : [
                "Factory Issue",
                department ? `Dept: ${department}` : null,
                employee ? `Employee: ${employee}` : null,
              ]
                .filter(Boolean)
                .join(" | "),
        meta: commonMeta,
      };

      dispatch({
        type: "OUTWARD",
        payload: {
          itemId: p.itemId,
          quantity: p.qty,
          movement,
        },
      });
    }

    const challan = {
      id:
        (crypto as any)?.randomUUID?.() ||
        `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      number: challanNumber,
      date: new Date(date).toISOString(),
      mode,
      items: prepared.map((p) => ({
        itemId: p.itemId,
        itemName: p.itemName,
        unit: p.unit,
        quantity: p.qty,
      })),
      meta: commonMeta,
      createdAt: new Date().toISOString(),
    };

    dispatch({ type: "ADD_CHALLAN", payload: { challan } });
    await downloadAndPrintPdf(challan);

    alert("Outward saved ✅");
    reset();
  }

  return (
    <div className="pb-24">
      <Header title="Outward Entry" />
      <div className="max-w-6xl mx-auto p-4">
        <Card>
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Outward Entry</h2>
            <p className="text-gray-500 text-sm">
              Issue multiple items to Site or Factory in one go.
            </p>
          </div>

          {/* Mode toggle */}
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setMode("SITE")}
              className={
                "px-3 py-1 rounded-lg border " +
                (mode === "SITE"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300")
              }
            >
              Site Material Issued
            </button>
            <button
              type="button"
              onClick={() => setMode("FACTORY")}
              className={
                "px-3 py-1 rounded-lg border " +
                (mode === "FACTORY"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300")
              }
            >
              Factory Material Issued
            </button>
          </div>

          {/* Shared date */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <label className="block">
              <div className="text-sm font-medium text-gray-700 mb-1">Date</div>
              <input
                type="date"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
          </div>

          {/* Mode-specific meta (shared across lines) */}
          {mode === "SITE" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <label className="block">
                <div className="text-sm font-medium text-gray-700 mb-1">Given To (Site)</div>
                <input
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                  placeholder="e.g. TALNI"
                  value={toSite}
                  onChange={(e) => setToSite(e.target.value)}
                />
              </label>

              <label className="block">
                <div className="text-sm font-medium text-gray-700 mb-1">Labor</div>
                <input
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                  placeholder="e.g. NANDI"
                  value={labor}
                  onChange={(e) => setLabor(e.target.value)}
                />
              </label>

              <label className="block">
                <div className="text-sm font-medium text-gray-700 mb-1">Work Order (WO)</div>
                <input
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                  placeholder="e.g. WO-44"
                  value={workOrder}
                  onChange={(e) => setWorkOrder(e.target.value)}
                />
              </label>

              <label className="block">
                <div className="text-sm font-medium text-gray-700 mb-1">Scheme</div>
                <input
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                  placeholder="e.g. IPDS"
                  value={scheme}
                  onChange={(e) => setScheme(e.target.value)}
                />
              </label>

              <label className="block md:col-span-2">
                <div className="text-sm font-medium text-gray-700 mb-1">Delivery Challan No.</div>
                <input
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                  placeholder="e.g. DC-12345"
                  value={deliveryChallan}
                  onChange={(e) => setDeliveryChallan(e.target.value)}
                />
              </label>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <label className="block">
                <div className="text-sm font-medium text-gray-700 mb-1">Department / Issue To</div>
                <input
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                  placeholder="e.g. Winding"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                />
              </label>

              <label className="block">
                <div className="text-sm font-medium text-gray-700 mb-1">Issue To Employee</div>
                <input
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                  placeholder="e.g. Jane Doe"
                  value={employee}
                  onChange={(e) => setEmployee(e.target.value)}
                />
              </label>
            </div>
          )}

          {/* Lines table */}
          <div className="overflow-x-auto">
            <div className="min-w-[860px] sm:min-w-0">
              <div className="grid grid-cols-12 bg-gray-200 text-gray-800 font-semibold rounded-md px-4 py-3 text-xs sm:text-sm whitespace-nowrap">
                <div className="col-span-5">ITEM</div>
                <div className="col-span-2">UNIT</div>
                <div className="col-span-2">CURRENT STOCK</div>
                <div className="col-span-2">QTY</div>
                <div className="col-span-1 text-center">ACTION</div>
              </div>

              <div className="divide-y">
                {lines.map((ln, idx) => {
                  const item = items.find((i) => i.id === ln.itemId);
                  const unit = item?.unit || "";
                  const stock = item?.currentStock ?? 0;

                  return (
                    <div
                      key={ln.id}
                      className="grid grid-cols-12 px-4 py-3 items-center text-sm"
                    >
                      {/* ITEM */}
                      <div className="col-span-5">
                        <select
                          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                          value={ln.itemId}
                          onChange={(e) => updateLine(ln.id, { itemId: e.target.value })}
                        >
                          <option value="">-- Select Item --</option>
                          {items.map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* UNIT (read-only) */}
                      <div className="col-span-2">
                        <input
                          disabled
                          className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 outline-none"
                          value={unit}
                          placeholder="—"
                        />
                      </div>

                      {/* CURRENT STOCK (read-only) */}
                      <div className="col-span-2">
                        <input
                          disabled
                          className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 outline-none"
                          value={ln.itemId ? String(stock) : ""}
                          placeholder="—"
                        />
                      </div>

                      {/* QTY */}
                      <div className="col-span-2">
                        <input
                          type="number"
                          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                          placeholder="e.g. 10"
                          value={ln.qty}
                          onChange={(e) => updateLine(ln.id, { qty: e.target.value })}
                          min={0}
                        />
                      </div>

                      {/* ACTION */}
                      <div className="col-span-1 flex justify-center">
                        {lines.length > 1 ? (
                          <button
                            type="button"
                            className="px-3 py-1 rounded bg-red-500 hover:bg-red-600 text-white"
                            onClick={() => removeLine(ln.id)}
                          >
                            Remove
                          </button>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between items-center mt-3">
                <button
                  type="button"
                  className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-800"
                  onClick={addLine}
                >
                  + Add another item
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
              type="button"
              onClick={reset}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium"
              type="button"
              onClick={save}
            >
              Save Outward
            </button>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Outward Entries</h2>
            <div className="text-sm text-gray-500">Total: {outwardEntries.length}</div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[980px] sm:min-w-0">
              <div className="grid grid-cols-12 bg-gray-200 text-gray-800 font-semibold rounded-md px-4 py-3 text-xs sm:text-sm whitespace-nowrap">
                <div className="col-span-2">DATE</div>
                <div className="col-span-3">ITEM</div>
                <div className="col-span-1">QTY</div>
                <div className="col-span-1">UNIT</div>
                <div className="col-span-3">NOTE</div>
                <div className="col-span-2 text-center">DC</div>
              </div>

              {outwardEntries.length === 0 ? (
                <div className="px-4 py-10 text-center text-gray-500">No outward entries yet.</div>
              ) : (
                <div className="divide-y">
                  {outwardEntries.map((m) => (
                    <div
                      key={m.id}
                      className="grid grid-cols-12 px-4 py-3 text-sm items-center"
                    >
                      <div className="col-span-2 whitespace-nowrap">
                        {new Date(m.date).toLocaleDateString()}
                      </div>
                      <div className="col-span-3 truncate">{m.itemName || "—"}</div>
                      <div className="col-span-1 whitespace-nowrap">{m.quantity}</div>
                      <div className="col-span-1 whitespace-nowrap">{m.unit || "—"}</div>
                      <div className="col-span-3 truncate">{m.note || "—"}</div>
                      <div className="col-span-2 flex justify-center">
                        {m.meta?.deliveryChallan ? (
                          <button
                            type="button"
                            className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => printByNumber(m.meta.deliveryChallan)}
                          >
                            Download/Print DC
                          </button>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

import React, { useMemo, useState } from "react";
import Header from "../components/Header";
import Card from "../components/Card";
import { useInventory } from "../context/InventoryContext";

const PAGE_SIZE = 15;
const DELETE_PASSWORD = "Narsinha@123";

type EditPatch = {
  unit?: string;
  reorderLevel?: number;
  purchasePrice?: number;
  description?: string;
};

export default function Stock() {
  const { state, dispatch } = useInventory();
  const [q, setQ] = useState("");

  // ---- EDIT MODAL STATE ----
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUnit, setEditUnit] = useState<string>("");
  const [editReorder, setEditReorder] = useState<string>("");
  const [editPrice, setEditPrice] = useState<string>("");
  const [editDesc, setEditDesc] = useState<string>("");

  const items = useMemo(() => {
    const base = [...(state.items as any[])].sort((a, b) =>
      String(a?.name ?? "").localeCompare(String(b?.name ?? ""))
    );
    if (!q.trim()) return base;
    const needle = q.trim().toLowerCase();
    return base.filter(
      (i) =>
        String(i?.name ?? "").toLowerCase().includes(needle) ||
        String(i?.description ?? "").toLowerCase().includes(needle)
    );
  }, [state.items, q]);

  // pagination
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const pageSafe = Math.min(Math.max(page, 1), pageCount);
  const start = (pageSafe - 1) * PAGE_SIZE;
  const paged = items.slice(start, start + PAGE_SIZE);

  React.useEffect(() => {
    setPage(1);
  }, [q, state.items]);

  function exportCSV() {
    const rows = [
      ["Item Name", "Unit", "Current Stock", "Reorder Level", "Price", "Description"],
      ...(state.items as any[]).map((i) => [
        i?.name ?? "",
        i?.unit ?? "",
        String(i?.currentStock ?? 0),
        String(i?.reorderLevel ?? 0),
        String(i?.purchasePrice ?? 0),
        String(i?.description ?? "").replace(/\n/g, " "),
      ]),
    ];
    const csv = rows
      .map((r) =>
        r
          .map((cell) => {
            const s = String(cell);
            const needsQuote = /[",\n]/.test(s);
            const esc = s.replace(/"/g, '""');
            return needsQuote ? `"${esc}"` : esc;
          })
          .join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stock_export.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // ---- EDIT / DELETE HANDLERS ----

  function openEdit(item: any) {
    setEditingId(item.id);
    setEditUnit(String(item?.unit ?? ""));
    setEditReorder(String(item?.reorderLevel ?? ""));
    setEditPrice(String(item?.purchasePrice ?? ""));
    setEditDesc(String(item?.description ?? ""));
  }

  function closeEdit() {
    setEditingId(null);
    setEditUnit("");
    setEditReorder("");
    setEditPrice("");
    setEditDesc("");
  }

  function saveEdit() {
    if (!editingId) return;

    const patch: EditPatch = {
      unit: editUnit.trim(),
      reorderLevel: editReorder === "" ? undefined : Number(editReorder),
      purchasePrice: editPrice === "" ? undefined : Number(editPrice),
      description: editDesc,
    };

    // Basic guards
    if (
      patch.reorderLevel !== undefined &&
      (isNaN(patch.reorderLevel) || patch.reorderLevel < 0)
    ) {
      alert("Reorder Level must be a non-negative number.");
      return;
    }
    if (
      patch.purchasePrice !== undefined &&
      (isNaN(patch.purchasePrice) || patch.purchasePrice < 0)
    ) {
      alert("Price must be a non-negative number.");
      return;
    }

    dispatch({ type: "UPDATE_ITEM", payload: { id: editingId, patch } });
    closeEdit();
  }

  function deleteItem(item: any) {
    const pwd = window.prompt(
      `Delete "${item?.name}"?\n\nEnter password to confirm:`
    );
    if (pwd === null) return; // cancelled
    if (pwd !== DELETE_PASSWORD) {
      alert("Incorrect password. Deletion cancelled.");
      return;
    }
    dispatch({ type: "DELETE_ITEM", payload: { id: item.id } });
  }

  return (
    <div className="pb-24">
      <Header title="Stock List" />
      <div className="max-w-6xl mx-auto p-4">
        <Card>
          {/* Top toolbar */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Stock List</h2>
            <div className="flex items-center gap-3">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search items..."
                className="w-64 bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
              />
              <button
                onClick={exportCSV}
                className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium"
              >
                Export
              </button>
            </div>
          </div>

          {/* ====== TABLE (responsively scrollable) ====== */}
          <div className="overflow-x-auto">
            <div className="min-w-[900px] sm:min-w-0">
              {/* Header */}
              <div className="grid grid-cols-12 bg-gray-200 text-gray-800 font-semibold rounded-md px-4 py-3 text-xs sm:text-sm whitespace-nowrap">
                <div className="col-span-3">ITEM NAME</div>
                <div className="col-span-1">UNIT</div>
                <div className="col-span-2">CURRENT STOCK</div>
                <div className="col-span-2">REORDER LEVEL</div>
                <div className="col-span-1">PRICE</div>
                <div className="col-span-2">DESCRIPTION</div>
                <div className="col-span-1 text-center">ACTIONS</div>
              </div>

              {/* Rows */}
              {paged.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center text-gray-600">
                  <span className="material-icons text-5xl text-gray-400 mb-3">
                    inventory_2
                  </span>
                  <div className="text-xl font-semibold mb-1">
                    No Items in Stock
                  </div>
                  <div className="text-gray-500">
                    Add items using the &apos;Inward&apos; page to get started.
                  </div>
                </div>
              ) : (
                <div className="divide-y">
                  {paged.map((i: any) => (
                    <div
                      key={i.id}
                      className="grid grid-cols-12 px-4 py-3 hover:bg-gray-50 text-sm items-center"
                    >
                      <div className="col-span-3 truncate font-medium">
                        {i?.name ?? ""}
                      </div>
                      <div className="col-span-1">{i?.unit ?? ""}</div>
                      <div className="col-span-2">{i?.currentStock ?? 0}</div>
                      <div
                        className={
                          "col-span-2 " +
                          ((i?.currentStock ?? 0) <= (i?.reorderLevel ?? 0)
                            ? "text-red-600 font-semibold"
                            : "")
                        }
                      >
                        {i?.reorderLevel ?? 0}
                      </div>
                      <div className="col-span-1">
                        {(i?.purchasePrice ?? 0).toFixed
                          ? (i?.purchasePrice ?? 0).toFixed(2)
                          : String(i?.purchasePrice ?? 0)}
                      </div>
                      <div className="col-span-2 truncate">
                        {i?.description || "—"}
                      </div>

                      <div className="col-span-1 flex justify-center gap-2">
                        <button
                          className="px-3 py-1 rounded bg-blue-500 hover:bg-blue-600 text-white"
                          onClick={() => openEdit(i)}
                        >
                          Edit
                        </button>
                        <button
                          className="px-3 py-1 rounded bg-red-500 hover:bg-red-600 text-white"
                          onClick={() => deleteItem(i)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-sm text-gray-600 mt-4">
            <div>
              Showing {items.length === 0 ? 0 : start + 1}–{Math.min(start + PAGE_SIZE, items.length)} of {items.length}
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

      {/* ===== EDIT MODAL ===== */}
      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-xl">
            <div className="px-5 py-4 border-b font-semibold text-lg">
              Edit Item Details
            </div>
            <div className="p-5 grid grid-cols-1 gap-4">
              <label className="block">
                <div className="text-sm font-medium text-gray-700 mb-1">
                  Unit
                </div>
                <input
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                  value={editUnit}
                  onChange={(e) => setEditUnit(e.target.value)}
                  placeholder="e.g. Nos / Kg / Litre / Bundles / Bobbins"
                />
              </label>

              <label className="block">
                <div className="text-sm font-medium text-gray-700 mb-1">
                  Reorder Level
                </div>
                <input
                  type="number"
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                  value={editReorder}
                  onChange={(e) => setEditReorder(e.target.value)}
                  placeholder="e.g. 20"
                />
              </label>

              <label className="block">
                <div className="text-sm font-medium text-gray-700 mb-1">
                  Price (Average Cost)
                </div>
                <input
                  type="number"
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  placeholder="e.g. 25.50"
                />
              </label>

              <label className="block">
                <div className="text-sm font-medium text-gray-700 mb-1">
                  Description
                </div>
                <textarea
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Item details…"
                />
              </label>
            </div>

            <div className="px-5 py-4 border-t flex items-center justify-end gap-3">
              <button
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                onClick={closeEdit}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium"
                onClick={saveEdit}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

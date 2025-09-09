import React, { useMemo, useState } from "react";
import Header from "../components/Header";
import Card from "../components/Card";
import { useInventory } from "../context/InventoryContext";

const PAGE_SIZE = 15;
const DELETE_PASSWORD = "Narsinha@123";

type EditForm = {
  id: string;
  name: string;
  unit: string;
  reorderLevel: string; // keep as string for input
  description: string;
};

export default function Stock() {
  const { state, dispatch } = useInventory();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  // Edit modal state
  const [editing, setEditing] = useState<EditForm | null>(null);

  // Filter + sort
  const filtered = useMemo(() => {
    const base = [...state.items].sort((a, b) => a.name.localeCompare(b.name));
    const needle = q.trim().toLowerCase();
    if (!needle) return base;
    return base.filter(
      (i) =>
        i.name.toLowerCase().includes(needle) ||
        (i.description || "").toLowerCase().includes(needle)
    );
  }, [state.items, q]);

  // Pagination
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  // Export CSV (unchanged columns per your spec)
  function exportCSV() {
    const rows = [
      ["Item Name", "Unit", "Current Stock", "Reorder Level", "Price", "Description"],
      ...state.items.map((i) => [
        i.name,
        i.unit,
        String(i.currentStock ?? 0),
        String(i.reorderLevel ?? 0),
        (i.purchasePrice ?? 0).toString(),
        (i.description ?? "").replace(/\n/g, " "),
      ]),
    ];
    const csv = rows
      .map((r) =>
        r
          .map((cell) => {
            const s = String(cell);
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
    a.download = "transfostock_export.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // Open edit modal
  function openEdit(id: string) {
    const it = state.items.find((i) => i.id === id);
    if (!it) return;
    setEditing({
      id: it.id,
      name: it.name,
      unit: it.unit,
      reorderLevel: String(it.reorderLevel ?? 0),
      description: it.description ?? "",
    });
  }

  function saveEdit() {
    if (!editing) return;
    const patch = {
      name: editing.name.trim(),
      unit: editing.unit.trim(),
      reorderLevel: Number(editing.reorderLevel || "0"),
      description: editing.description.trim(),
    };
    if (!patch.name) return alert("Item name is required.");
    if (!patch.unit) return alert("Unit is required.");

    dispatch({ type: "UPDATE_ITEM", payload: { id: editing.id, patch } });
    setEditing(null);
  }

  function cancelEdit() {
    setEditing(null);
  }

  // Delete (with password)
  function requestDelete(id: string) {
    const it = state.items.find((x) => x.id === id);
    if (!it) return;
    const sure = confirm(
      `Delete "${it.name}" permanently?\nThis removes the item and its history from this device.`
    );
    if (!sure) return;

    const pwd = prompt("Enter delete password:");
    if (pwd !== DELETE_PASSWORD) {
      alert("Incorrect password.");
      return;
    }
    dispatch({ type: "DELETE_ITEM", payload: { id } });
  }

  // Keep page in range when filtering changes
  React.useEffect(() => {
    setPage(1);
  }, [q]);

  return (
    <div className="pb-24">
      <Header title="Stock List" />
      <div className="max-w-6xl mx-auto p-4">
        <Card>
          {/* Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
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

          {/* Header row */}
          <div className="grid grid-cols-12 bg-gray-200 text-gray-800 font-semibold rounded-md px-4 py-3">
            <div className="col-span-4">ITEM NAME</div>
            <div className="col-span-1">UNIT</div>
            <div className="col-span-2">CURRENT STOCK</div>
            <div className="col-span-2">REORDER LEVEL</div>
            <div className="col-span-1">PRICE</div>
            <div className="col-span-2">ACTIONS</div>
          </div>

          {/* Body */}
          {pageItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center text-gray-600">
              <span className="material-icons text-5xl text-gray-400 mb-3">inventory_2</span>
              <div className="text-xl font-semibold mb-1">No Items in Stock</div>
              <div className="text-gray-500">Add items using the ‘Inward’ page to get started.</div>
            </div>
          ) : (
            <div className="divide-y">
              {pageItems.map((i) => (
                <div key={i.id} className="grid grid-cols-12 px-4 py-3 hover:bg-gray-50">
                  <div className="col-span-4 truncate font-medium">{i.name}</div>
                  <div className="col-span-1">{i.unit}</div>
                  <div className="col-span-2">{i.currentStock ?? 0}</div>
                  <div
                    className={
                      "col-span-2 " +
                      ((i.currentStock ?? 0) <= (i.reorderLevel ?? 0)
                        ? "text-red-600 font-semibold"
                        : "")
                    }
                  >
                    {i.reorderLevel ?? 0}
                  </div>
                  <div className="col-span-1">{(i.purchasePrice ?? 0).toFixed(2)}</div>
                  <div className="col-span-2 flex gap-2">
                    <button
                      onClick={() => openEdit(i.id)}
                      className="px-3 py-1 rounded bg-blue-500 hover:bg-blue-600 text-white text-sm"
                      title="Edit"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => requestDelete(i.id)}
                      className="px-3 py-1 rounded bg-red-500 hover:bg-red-600 text-white text-sm"
                      title="Delete (password required)"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
            <div>
              Showing {filtered.length === 0 ? 0 : start + 1}–
              {Math.min(start + PAGE_SIZE, filtered.length)} of {filtered.length}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="px-3 py-1 rounded border disabled:opacity-50"
              >
                Prev
              </button>
              <div>
                Page {safePage} / {pageCount}
              </div>
              <button
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={safePage >= pageCount}
                className="px-3 py-1 rounded border disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center px-4">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-lg p-5">
            <div className="text-xl font-semibold mb-4">Edit Item</div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <div className="text-sm text-gray-700 mb-1">Item Name</div>
                <input
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </label>

              <label className="block">
                <div className="text-sm text-gray-700 mb-1">Unit</div>
                <input
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                  value={editing.unit}
                  onChange={(e) => setEditing({ ...editing, unit: e.target.value })}
                  placeholder="e.g. Nos, Kg, Litre, Bundles, Bobbins"
                />
              </label>

              <label className="block">
                <div className="text-sm text-gray-700 mb-1">Reorder Level</div>
                <input
                  type="number"
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                  value={editing.reorderLevel}
                  onChange={(e) => setEditing({ ...editing, reorderLevel: e.target.value })}
                />
              </label>

              <label className="block md:col-span-2">
                <div className="text-sm text-gray-700 mb-1">Description</div>
                <textarea
                  rows={3}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 outline-none"
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={cancelEdit}
                className="px-4 py-2 rounded border border-gray-300 bg-white"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
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

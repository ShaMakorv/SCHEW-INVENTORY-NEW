import { useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Edit3,
  PauseCircle,
  PlayCircle,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type { Item, ItemInput, ItemStatus, UserRole } from '../types/inventory';
import {
  ITEM_CATEGORIES,
  ITEM_UNITS,
  filterItems,
  formatRupiah,
  isLowStock,
  validateItemInput,
} from '../utils/inventoryLogic';
import { ConfirmModal } from './ConfirmModal';

interface ItemsViewProps {
  items: Item[];
  userRole: UserRole;
  initialStatusFilter?: 'all' | 'active' | 'inactive' | 'low-stock';
  onCreateItem: (input: ItemInput) => Promise<void>;
  onUpdateItem: (id: string, input: ItemInput) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
}

const EMPTY_FORM: ItemInput = {
  sku: '',
  name: '',
  category: ITEM_CATEGORIES[0],
  unit: ITEM_UNITS[0],
  buyPrice: 0,
  sellPrice: 0,
  currentStock: 0,
  minStock: 10,
  status: 'active',
  notes: '',
};

export function ItemsView({
  items,
  userRole,
  initialStatusFilter = 'all',
  onCreateItem,
  onUpdateItem,
  onDeleteItem,
}: ItemsViewProps) {
  const isAdmin = userRole === 'admin';

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'low-stock'>(
    initialStatusFilter,
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [form, setForm] = useState<ItemInput>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filteredItems = filterItems(items, {
    search,
    category: categoryFilter,
    statusFilter,
  });

  const openCreateModal = () => {
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setModalOpen(true);
  };

  const openEditModal = (item: Item) => {
    setEditingItem(item);
    setForm({
      sku: item.sku,
      name: item.name,
      category: item.category,
      unit: item.unit,
      buyPrice: item.buyPrice,
      sellPrice: item.sellPrice,
      currentStock: item.currentStock,
      minStock: item.minStock,
      status: item.status,
      notes: item.notes,
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleToggleStatus = async (item: Item) => {
    if (!isAdmin) return;
    const nextStatus: ItemStatus = item.status === 'active' ? 'inactive' : 'active';
    await onUpdateItem(item.id, {
      sku: item.sku,
      name: item.name,
      category: item.category,
      unit: item.unit,
      buyPrice: item.buyPrice,
      sellPrice: item.sellPrice,
      currentStock: item.currentStock,
      minStock: item.minStock,
      status: nextStatus,
      notes: item.notes,
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validation = validateItemInput(form, items, editingItem?.id);
    if (!validation.valid) {
      setFormErrors(validation.errors);
      return;
    }

    setSubmitting(true);
    try {
      if (editingItem) {
        await onUpdateItem(editingItem.id, form);
      } else {
        await onCreateItem(form);
      }
      setModalOpen(false);
    } catch (err) {
      if (err && typeof err === 'object' && 'fieldErrors' in err && err.fieldErrors) {
        setFormErrors(err.fieldErrors as Record<string, string>);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await onDeleteItem(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <label htmlFor="items-search" className="sr-only">
              Cari SKU atau nama barang
            </label>
            <input
              id="items-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kode SKU, nama barang, catatan..."
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/15"
            />
          </div>

          <div>
            <label htmlFor="items-category-filter" className="sr-only">
              Filter kategori
            </label>
            <select
              id="items-category-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-700 focus:outline-none"
            >
              <option value="all">Semua Kategori</option>
              {ITEM_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div
            role="group"
            aria-label="Filter status barang"
            className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1"
          >
            {[
              { id: 'all', label: 'Semua' },
              { id: 'active', label: 'Aktif' },
              { id: 'low-stock', label: 'Stok Menipis' },
              { id: 'inactive', label: 'Nonaktif' },
            ].map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() =>
                    setStatusFilter(tab.id as 'all' | 'active' | 'inactive' | 'low-stock')
                  }
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {isAdmin ? (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Barang</span>
          </button>
        ) : (
          <p className="text-xs text-slate-500 whitespace-nowrap">
            Mode Staff: Lihat daftar & stok barang (kelola master khusus Admin)
          </p>
        )}
      </div>

      {/* Items Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {filteredItems.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-800">
              Tidak ada barang yang sesuai dengan filter saat ini.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Ubah kata kunci pencarian atau reset filter kategori dan status.
            </p>
            {isAdmin && items.length === 0 && (
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Tambah Barang Pertama</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                  <th className="px-3 py-3">SKU</th>
                  <th className="px-3 py-3">Nama Barang & Catatan</th>
                  <th className="px-3 py-3">Kategori</th>
                  <th className="px-3 py-3 text-right">Harga Beli</th>
                  <th className="px-3 py-3 text-right">Harga Jual</th>
                  <th className="px-3 py-3 text-right">Stok</th>
                  <th className="px-3 py-3 text-right">Min.</th>
                  <th className="px-3 py-3">Status</th>
                  {isAdmin && <th className="px-3 py-3 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => {
                  const low = isLowStock(item);
                  const empty = item.status === 'active' && item.currentStock === 0;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 ${
                        item.status === 'inactive' ? 'opacity-65' : ''
                      }`}
                    >
                      <td className="px-3 py-3 font-mono text-xs font-semibold text-slate-700 whitespace-nowrap">
                        {item.sku}
                      </td>
                      <td className="px-3 py-3 max-w-[260px]">
                        <p className="truncate font-medium text-slate-900" title={item.name}>
                          {item.name}
                        </p>
                        {item.notes && (
                          <p className="mt-0.5 truncate text-xs text-slate-500" title={item.notes}>
                            {item.notes}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-600 whitespace-nowrap">
                        {item.category}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                        {formatRupiah(item.buyPrice)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-xs font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                        {formatRupiah(item.sellPrice)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-sm font-bold tabular-nums whitespace-nowrap">
                        <span
                          className={
                            empty
                              ? 'text-red-700'
                              : low
                                ? 'text-amber-700'
                                : 'text-slate-900'
                          }
                        >
                          {item.currentStock}
                        </span>{' '}
                        <span className="text-xs font-normal text-slate-500">{item.unit}</span>
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-xs text-slate-500 tabular-nums whitespace-nowrap">
                        {item.minStock}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {item.status === 'inactive' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                            <PauseCircle className="h-3.5 w-3.5" />
                            <span>Nonaktif</span>
                          </span>
                        ) : empty ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span>Habis</span>
                          </span>
                        ) : low ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span>Menipis</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Aman</span>
                          </span>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="px-3 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-0.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              aria-label={`Edit barang ${item.name}`}
                              className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-blue-700"
                              title="Edit Barang"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(item)}
                              aria-label={
                                item.status === 'active'
                                  ? `Nonaktifkan ${item.name}`
                                  : `Aktifkan ${item.name}`
                              }
                              title={item.status === 'active' ? 'Nonaktifkan Barang' : 'Aktifkan Barang'}
                              className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                            >
                              {item.status === 'active' ? (
                                <PauseCircle className="h-4 w-4" />
                              ) : (
                                <PlayCircle className="h-4 w-4 text-emerald-700" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(item)}
                              aria-label={`Hapus barang ${item.name}`}
                              className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-700"
                              title="Hapus Permanen"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Item Modal */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="item-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
        >
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 id="item-modal-title" className="text-lg font-bold text-slate-900">
                  {editingItem ? 'Edit Data Master Barang' : 'Tambah Barang Grosir Baru'}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Lengkapi detail SKU, harga grosir, satuan, dan batas stok minimum.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Tutup modal barang"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="item-sku" className="block text-xs font-semibold text-slate-700">
                    Kode / SKU <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="item-sku"
                    type="text"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    placeholder="Contoh: SCW-TS-24S-WHT"
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm uppercase text-slate-900 focus:border-blue-700 focus:outline-none"
                  />
                  {formErrors.sku && (
                    <p className="mt-1 text-xs text-red-600">{formErrors.sku}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="item-name" className="block text-xs font-semibold text-slate-700">
                    Nama Barang <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="item-name"
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Contoh: Kaos Oversize Heavyweight Putih"
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
                  />
                  {formErrors.name && (
                    <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="item-category"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Kategori <span className="text-red-600">*</span>
                  </label>
                  <select
                    id="item-category"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
                  >
                    {ITEM_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="item-unit" className="block text-xs font-semibold text-slate-700">
                    Satuan <span className="text-red-600">*</span>
                  </label>
                  <select
                    id="item-unit"
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
                  >
                    {ITEM_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="item-buy-price"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Harga Beli (Rp)
                  </label>
                  <input
                    id="item-buy-price"
                    type="number"
                    min={0}
                    value={form.buyPrice}
                    onChange={(e) => setForm({ ...form, buyPrice: Number(e.target.value) })}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
                  />
                  {formErrors.buyPrice && (
                    <p className="mt-1 text-xs text-red-600">{formErrors.buyPrice}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="item-sell-price"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Harga Jual Grosir (Rp)
                  </label>
                  <input
                    id="item-sell-price"
                    type="number"
                    min={0}
                    value={form.sellPrice}
                    onChange={(e) => setForm({ ...form, sellPrice: Number(e.target.value) })}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
                  />
                  {formErrors.sellPrice && (
                    <p className="mt-1 text-xs text-red-600">{formErrors.sellPrice}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="item-current-stock"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Stok Saat Ini
                  </label>
                  <input
                    id="item-current-stock"
                    type="number"
                    min={0}
                    value={form.currentStock}
                    onChange={(e) => setForm({ ...form, currentStock: Number(e.target.value) })}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
                  />
                  {formErrors.currentStock && (
                    <p className="mt-1 text-xs text-red-600">{formErrors.currentStock}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="item-min-stock"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Stok Minimum (Batas Alert)
                  </label>
                  <input
                    id="item-min-stock"
                    type="number"
                    min={0}
                    value={form.minStock}
                    onChange={(e) => setForm({ ...form, minStock: Number(e.target.value) })}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
                  />
                  {formErrors.minStock && (
                    <p className="mt-1 text-xs text-red-600">{formErrors.minStock}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="item-status"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Status Barang
                  </label>
                  <select
                    id="item-status"
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value as ItemStatus })
                    }
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Nonaktif</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="item-notes" className="block text-xs font-semibold text-slate-700">
                    Catatan
                  </label>
                  <textarea
                    id="item-notes"
                    rows={2}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Keterangan lokasi rak, seri ukuran, atau minimal order grosir..."
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {submitting
                    ? 'Menyimpan...'
                    : editingItem
                      ? 'Simpan Perubahan'
                      : 'Simpan Barang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Hapus Barang Permanen"
        description={`Apakah Anda yakin ingin menghapus "${deleteTarget?.name ?? ''}" (${deleteTarget?.sku ?? ''}) dari master barang? Riwayat mutasi lama tetap tersimpan, tetapi barang akan dihapus dari daftar aktif.`}
        confirmLabel="Ya, Hapus Barang"
        destructive
        busy={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

import { useState, type FormEvent } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Edit3,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import type {
  CashflowInput,
  CashflowTransaction,
  CashflowType,
  StockTransaction,
  UserRole,
} from '../types/inventory';
import {
  CASHFLOW_CATEGORIES,
  calculateCashflowSummary,
  filterCashflows,
  formatDateId,
  formatRupiah,
  getTodayIsoDate,
  validateCashflowInput,
} from '../utils/inventoryLogic';
import { ConfirmModal } from './ConfirmModal';

interface CashflowViewProps {
  cashflows: CashflowTransaction[];
  stockTransactions: StockTransaction[];
  userRole: UserRole;
  onCreateCashflow: (input: CashflowInput) => Promise<void>;
  onUpdateCashflow: (id: string, input: CashflowInput) => Promise<void>;
  onDeleteCashflow: (id: string) => Promise<void>;
}

export function CashflowView({
  cashflows,
  stockTransactions,
  userRole,
  onCreateCashflow,
  onUpdateCashflow,
  onDeleteCashflow,
}: CashflowViewProps) {
  const isAdmin = userRole === 'admin';

  // Form State
  const [type, setType] = useState<CashflowType>('income');
  const [category, setCategory] = useState<string>(CASHFLOW_CATEGORIES.income[0]);
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(getTodayIsoDate());
  const [stockRefId, setStockRefId] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Edit Modal State (Admin)
  const [editingEntry, setEditingEntry] = useState<CashflowTransaction | null>(null);
  const [editForm, setEditForm] = useState<CashflowInput>({
    type: 'income',
    category: CASHFLOW_CATEGORIES.income[0],
    amount: 0,
    date: getTodayIsoDate(),
    description: '',
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete State (Admin)
  const [deleteTarget, setDeleteTarget] = useState<CashflowTransaction | null>(null);
  const [deleting, setDeleting] = useState(false);

  // List Filters
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const allSummary = calculateCashflowSummary(cashflows);
  const filteredCashflows = filterCashflows(cashflows, {
    search,
    type: filterType,
    dateFrom,
    dateTo,
  });

  const handleTypeSwitch = (nextType: CashflowType) => {
    setType(nextType);
    setCategory(CASHFLOW_CATEGORIES[nextType][0]);
    setFormErrors({});
  };

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const matchedStock = stockTransactions.find((st) => st.id === stockRefId);
    const input: CashflowInput = {
      type,
      category,
      amount: Number(amount),
      date,
      stockRefId: matchedStock?.id,
      stockRefLabel: matchedStock
        ? `${matchedStock.id} · ${matchedStock.itemSku} (${matchedStock.type === 'in' ? '+' : '-'}${matchedStock.quantity} ${matchedStock.itemUnit})`
        : undefined,
      description,
    };

    const validation = validateCashflowInput(input);
    if (!validation.valid) {
      setFormErrors(validation.errors);
      return;
    }

    setFormErrors({});
    setSubmitting(true);
    try {
      await onCreateCashflow(input);
      setAmount('');
      setStockRefId('');
      setDescription('');
    } catch (err) {
      if (err && typeof err === 'object' && 'fieldErrors' in err && err.fieldErrors) {
        setFormErrors(err.fieldErrors as Record<string, string>);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (entry: CashflowTransaction) => {
    setEditingEntry(entry);
    setEditForm({
      type: entry.type,
      category: entry.category,
      amount: entry.amount,
      date: entry.date,
      stockRefId: entry.stockRefId,
      stockRefLabel: entry.stockRefLabel,
      description: entry.description,
    });
    setEditErrors({});
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;
    const validation = validateCashflowInput(editForm);
    if (!validation.valid) {
      setEditErrors(validation.errors);
      return;
    }

    setSavingEdit(true);
    try {
      await onUpdateCashflow(editingEntry.id, editForm);
      setEditingEntry(null);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await onDeleteCashflow(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cashflow Summary Strip */}
      <section aria-label="Rekapitulasi kas operasional" className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Total Pemasukan</p>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-emerald-700 tabular-nums">
            {formatRupiah(allSummary.totalIncome)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Penjualan grosir, reseller & pelunasan</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Total Pengeluaran</p>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-red-700 tabular-nums">
            {formatRupiah(allSummary.totalExpense)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Pembelian stok & biaya operasional</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Selisih / Saldo Kas</p>
            <Wallet className="h-4 w-4 text-blue-700" />
          </div>
          <p
            className={`mt-2 font-mono text-2xl font-bold tabular-nums ${
              allSummary.balance >= 0 ? 'text-slate-900' : 'text-red-700'
            }`}
          >
            {formatRupiah(allSummary.balance)}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            Dari {allSummary.transactionCount} transaksi kas tercatat
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Form */}
        <section
          aria-labelledby="cashflow-form-heading"
          className="rounded-xl border border-slate-200 bg-white p-5 xl:col-span-4 xl:self-start"
        >
          <div className="border-b border-slate-200 pb-4">
            <h2 id="cashflow-form-heading" className="text-base font-bold text-slate-900">
              Catat Pemasukan / Pengeluaran
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Catat penerimaan penjualan maupun biaya operasional harian toko grosir.
            </p>
          </div>

          <div
            role="group"
            aria-label="Jenis transaksi kas"
            className="mt-4 grid grid-cols-2 gap-1.5 rounded-lg bg-slate-100 p-1"
          >
            <button
              type="button"
              onClick={() => handleTypeSwitch('income')}
              className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
                type === 'income'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowDownLeft className="h-3.5 w-3.5" />
              <span>Pemasukan</span>
            </button>
            <button
              type="button"
              onClick={() => handleTypeSwitch('expense')}
              className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
                type === 'expense'
                  ? 'bg-red-700 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>Pengeluaran</span>
            </button>
          </div>

          <form onSubmit={handleCreateSubmit} noValidate className="mt-4 space-y-4">
            <div>
              <label htmlFor="cf-category" className="block text-xs font-semibold text-slate-700">
                Kategori <span className="text-red-600">*</span>
              </label>
              <select
                id="cf-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
              >
                {CASHFLOW_CATEGORIES[type].map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="cf-amount" className="block text-xs font-semibold text-slate-700">
                  Nominal (Rp) <span className="text-red-600">*</span>
                </label>
                <input
                  id="cf-amount"
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Contoh: 1500000"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
                />
                {formErrors.amount && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.amount}</p>
                )}
              </div>

              <div>
                <label htmlFor="cf-date" className="block text-xs font-semibold text-slate-700">
                  Tanggal <span className="text-red-600">*</span>
                </label>
                <input
                  id="cf-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
                />
                {formErrors.date && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.date}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="cf-stock-ref" className="block text-xs font-semibold text-slate-700">
                Referensi Mutasi Stok (Opsional)
              </label>
              <select
                id="cf-stock-ref"
                value={stockRefId}
                onChange={(e) => setStockRefId(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 focus:border-blue-700 focus:outline-none"
              >
                <option value="">-- Tidak terkait mutasi stok tertentu --</option>
                {stockTransactions.slice(0, 20).map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.id} · {st.itemSku} ({st.type === 'in' ? '+' : '-'}
                    {st.quantity}) · {st.counterparty}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="cf-description" className="block text-xs font-semibold text-slate-700">
                Keterangan <span className="text-red-600">*</span>
              </label>
              <textarea
                id="cf-description"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Contoh: Pembayaran invoice grosir Toko Abadi Jakarta"
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
              />
              {formErrors.description && (
                <p className="mt-1 text-xs text-red-600">{formErrors.description}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${
                type === 'income'
                  ? 'bg-emerald-700 hover:bg-emerald-800'
                  : 'bg-red-700 hover:bg-red-800'
              }`}
            >
              {submitting
                ? 'Menyimpan...'
                : type === 'income'
                  ? 'Simpan Pemasukan'
                  : 'Simpan Pengeluaran'}
            </button>
          </form>
        </section>

        {/* Ledger Table */}
        <section aria-labelledby="cashflow-ledger-heading" className="space-y-4 xl:col-span-8">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="cashflow-ledger-heading" className="text-base font-bold text-slate-900">
                  Buku Kas Operasional
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Menampilkan {filteredCashflows.length} dari {cashflows.length} transaksi kas.
                </p>
              </div>

              <div
                role="group"
                aria-label="Filter jenis kas"
                className="flex items-center gap-1 rounded-lg bg-slate-100 p-1"
              >
                {[
                  { id: 'all', label: 'Semua' },
                  { id: 'income', label: 'Pemasukan' },
                  { id: 'expense', label: 'Pengeluaran' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilterType(tab.id as 'all' | 'income' | 'expense')}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                      filterType === tab.id
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <label htmlFor="cf-search" className="sr-only">
                  Cari transaksi kas
                </label>
                <input
                  id="cf-search"
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari keterangan, kategori, ref..."
                  className="w-full rounded-lg border border-slate-300 py-1.5 pl-8 pr-2.5 text-xs text-slate-900 focus:border-blue-700 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="cf-date-from" className="sr-only">
                  Dari tanggal
                </label>
                <input
                  id="cf-date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-xs text-slate-700 focus:border-blue-700 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="cf-date-to" className="sr-only">
                  Sampai tanggal
                </label>
                <input
                  id="cf-date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-xs text-slate-700 focus:border-blue-700 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {filteredCashflows.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-slate-500">
                Tidak ada transaksi kas yang cocok dengan filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                      <th className="px-4 py-3">Tanggal & ID</th>
                      <th className="px-4 py-3">Jenis & Kategori</th>
                      <th className="px-4 py-3">Keterangan & Referensi</th>
                      <th className="px-4 py-3 text-right">Nominal</th>
                      <th className="px-4 py-3">Pencatat</th>
                      {isAdmin && <th className="px-4 py-3 text-right">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCashflows.map((cf) => {
                      const isIncome = cf.type === 'income';
                      return (
                        <tr key={cf.id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <p className="font-mono text-xs font-medium text-slate-900">
                              {formatDateId(cf.date)}
                            </p>
                            <p className="font-mono text-[11px] text-slate-400">{cf.id}</p>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <p
                              className={`text-xs font-semibold ${
                                isIncome ? 'text-emerald-700' : 'text-red-700'
                              }`}
                            >
                              {isIncome ? 'Pemasukan' : 'Pengeluaran'}
                            </p>
                            <p className="text-xs text-slate-600">{cf.category}</p>
                          </td>
                          <td className="px-4 py-3 min-w-[220px]">
                            <p className="text-sm text-slate-900">{cf.description}</p>
                            {cf.stockRefLabel && (
                              <p className="mt-0.5 font-mono text-[11px] text-blue-700">
                                Ref: {cf.stockRefLabel}
                              </p>
                            )}
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-mono text-sm font-bold tabular-nums whitespace-nowrap ${
                              isIncome ? 'text-emerald-700' : 'text-red-700'
                            }`}
                          >
                            {isIncome ? '+' : '-'}
                            {formatRupiah(cf.amount)}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                            {cf.recordedBy}
                          </td>
                          {isAdmin && (
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEditModal(cf)}
                                  aria-label={`Edit transaksi kas ${cf.id}`}
                                  className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-700"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteTarget(cf)}
                                  aria-label={`Hapus transaksi kas ${cf.id}`}
                                  className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-700"
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
        </section>
      </div>

      {/* Edit Cashflow Modal (Admin) */}
      {editingEntry && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-cf-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
        >
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h3 id="edit-cf-title" className="text-base font-bold text-slate-900">
                Edit Transaksi Kas ({editingEntry.id})
              </h3>
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                aria-label="Tutup modal edit kas"
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} noValidate className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit-cf-type" className="block text-xs font-semibold text-slate-700">
                    Jenis
                  </label>
                  <select
                    id="edit-cf-type"
                    value={editForm.type}
                    onChange={(e) => {
                      const nextType = e.target.value as CashflowType;
                      setEditForm({
                        ...editForm,
                        type: nextType,
                        category: CASHFLOW_CATEGORIES[nextType][0],
                      });
                    }}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="income">Pemasukan</option>
                    <option value="expense">Pengeluaran</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="edit-cf-category"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Kategori
                  </label>
                  <select
                    id="edit-cf-category"
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    {CASHFLOW_CATEGORIES[editForm.type].map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="edit-cf-amount" className="block text-xs font-semibold text-slate-700">
                    Nominal (Rp)
                  </label>
                  <input
                    id="edit-cf-amount"
                    type="number"
                    min={1}
                    value={editForm.amount}
                    onChange={(e) => setEditForm({ ...editForm, amount: Number(e.target.value) })}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                  />
                  {editErrors.amount && (
                    <p className="mt-1 text-xs text-red-600">{editErrors.amount}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="edit-cf-date" className="block text-xs font-semibold text-slate-700">
                    Tanggal
                  </label>
                  <input
                    id="edit-cf-date"
                    type="date"
                    value={editForm.date}
                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="edit-cf-desc" className="block text-xs font-semibold text-slate-700">
                  Keterangan
                </label>
                <textarea
                  id="edit-cf-desc"
                  rows={2}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                {editErrors.description && (
                  <p className="mt-1 text-xs text-red-600">{editErrors.description}</p>
                )}
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingEntry(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {savingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Hapus Catatan Kas"
        description={`Hapus catatan kas ${deleteTarget?.id ?? ''} (${formatRupiah(deleteTarget?.amount ?? 0)})? Saldo kas operasional akan dihitung ulang secara otomatis.`}
        confirmLabel="Ya, Hapus Catatan"
        destructive
        busy={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
} from 'lucide-react';
import type {
  Item,
  StockTransaction,
  StockTransactionInput,
  StockTransactionType,
} from '../types/inventory';
import {
  filterStockTransactions,
  formatDateId,
  getTodayIsoDate,
  validateAndApplyStockTransaction,
} from '../utils/inventoryLogic';

interface StockTransactionsViewProps {
  items: Item[];
  transactions: StockTransaction[];
  currentUserName: string;
  preselectedItemId?: string;
  preselectedType?: StockTransactionType;
  onCreateStockTransaction: (input: StockTransactionInput) => Promise<void>;
}

export function StockTransactionsView({
  items,
  transactions,
  currentUserName,
  preselectedItemId,
  preselectedType,
  onCreateStockTransaction,
}: StockTransactionsViewProps) {
  const activeItems = items.filter((item) => item.status === 'active');

  const [txType, setTxType] = useState<StockTransactionType>(preselectedType ?? 'in');
  const [itemId, setItemId] = useState<string>(preselectedItemId || activeItems[0]?.id || '');
  const [quantity, setQuantity] = useState<string>('1');
  const [date, setDate] = useState<string>(getTodayIsoDate());
  const [counterparty, setCounterparty] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // History Filters
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'in' | 'out'>('all');
  const [filterItemId, setFilterItemId] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    if (preselectedItemId) {
      setItemId(preselectedItemId);
    }
    if (preselectedType) {
      setTxType(preselectedType);
    }
  }, [preselectedItemId, preselectedType]);

  const selectedItem = items.find((it) => it.id === itemId);
  const parsedQty = Number(quantity);
  const projectedStock =
    selectedItem && Number.isFinite(parsedQty) && parsedQty > 0
      ? txType === 'in'
        ? selectedItem.currentStock + parsedQty
        : selectedItem.currentStock - parsedQty
      : null;

  const filteredHistory = filterStockTransactions(transactions, {
    search,
    type: filterType,
    itemId: filterItemId,
    dateFrom,
    dateTo,
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const input: StockTransactionInput = {
      itemId,
      type: txType,
      quantity: Number(quantity),
      date,
      counterparty,
      notes,
    };

    const validation = validateAndApplyStockTransaction(items, input, currentUserName);
    if (!validation.ok) {
      setFormErrors(validation.errors);
      return;
    }

    setFormErrors({});
    setSubmitting(true);
    try {
      await onCreateStockTransaction(input);
      setQuantity('1');
      setCounterparty('');
      setNotes('');
    } catch (err) {
      if (err && typeof err === 'object' && 'fieldErrors' in err && err.fieldErrors) {
        setFormErrors(err.fieldErrors as Record<string, string>);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      {/* Left: Stock In / Out Recording Form */}
      <section
        aria-labelledby="stock-form-heading"
        className="rounded-xl border border-slate-200 bg-white p-5 xl:col-span-4 xl:self-start"
      >
        <div className="border-b border-slate-200 pb-4">
          <h2 id="stock-form-heading" className="text-base font-bold text-slate-900">
            Catat Mutasi Stok Baru
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Pilih jenis transaksi untuk menambah atau mengurangi saldo stok secara otomatis.
          </p>
        </div>

        {/* Segmented Type Selector */}
        <div
          role="group"
          aria-label="Jenis mutasi stok"
          className="mt-4 grid grid-cols-2 gap-1.5 rounded-lg bg-slate-100 p-1"
        >
          <button
            type="button"
            onClick={() => {
              setTxType('in');
              setFormErrors({});
            }}
            className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
              txType === 'in'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowDownLeft className="h-3.5 w-3.5" />
            <span>Stok Masuk</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTxType('out');
              setFormErrors({});
            }}
            className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
              txType === 'out'
                ? 'bg-red-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span>Stok Keluar</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
          <div>
            <label htmlFor="stock-item-select" className="block text-xs font-semibold text-slate-700">
              Pilih Barang <span className="text-red-600">*</span>
            </label>
            <select
              id="stock-item-select"
              value={itemId}
              onChange={(e) => {
                setItemId(e.target.value);
                setFormErrors({});
              }}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
            >
              <option value="">-- Pilih barang aktif --</option>
              {activeItems.map((it) => (
                <option key={it.id} value={it.id}>
                  [{it.sku}] {it.name} (Stok: {it.currentStock} {it.unit})
                </option>
              ))}
            </select>
            {formErrors.itemId && (
              <p className="mt-1 text-xs text-red-600">{formErrors.itemId}</p>
            )}
          </div>

          {selectedItem && (
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs">
              <span className="text-slate-600">Stok tersedia saat ini:</span>
              <span className="font-mono font-bold text-slate-900 tabular-nums">
                {selectedItem.currentStock} {selectedItem.unit}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="stock-qty" className="block text-xs font-semibold text-slate-700">
                Jumlah {txType === 'in' ? 'Masuk' : 'Keluar'} <span className="text-red-600">*</span>
              </label>
              <input
                id="stock-qty"
                type="number"
                min={1}
                step={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="stock-date" className="block text-xs font-semibold text-slate-700">
                Tanggal <span className="text-red-600">*</span>
              </label>
              <input
                id="stock-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
              />
            </div>
          </div>

          {formErrors.quantity && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{formErrors.quantity}</span>
            </div>
          )}
          {formErrors.date && <p className="text-xs text-red-600">{formErrors.date}</p>}

          {selectedItem && projectedStock !== null && !formErrors.quantity && (
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Proyeksi saldo setelah mutasi:</span>
              <span
                className={`font-mono font-bold tabular-nums ${
                  projectedStock < 0
                    ? 'text-red-700'
                    : projectedStock <= selectedItem.minStock
                      ? 'text-amber-700'
                      : 'text-emerald-700'
                }`}
              >
                {projectedStock} {selectedItem.unit}
              </span>
            </div>
          )}

          <div>
            <label
              htmlFor="stock-counterparty"
              className="block text-xs font-semibold text-slate-700"
            >
              {txType === 'in' ? 'Supplier / Sumber Barang' : 'Tujuan / Pembeli Grosir'}{' '}
              <span className="text-red-600">*</span>
            </label>
            <input
              id="stock-counterparty"
              type="text"
              value={counterparty}
              onChange={(e) => setCounterparty(e.target.value)}
              placeholder={
                txType === 'in'
                  ? 'Contoh: Konveksi Sandang Bandung'
                  : 'Contoh: Distro Urban Yogyakarta'
              }
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
            />
            {formErrors.counterparty && (
              <p className="mt-1 text-xs text-red-600">{formErrors.counterparty}</p>
            )}
          </div>

          <div>
            <label htmlFor="stock-notes" className="block text-xs font-semibold text-slate-700">
              Catatan Mutasi
            </label>
            <textarea
              id="stock-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Nomor PO, ekspedisi, atau keterangan tambahan..."
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${
              txType === 'in'
                ? 'bg-emerald-700 hover:bg-emerald-800'
                : 'bg-red-700 hover:bg-red-800'
            }`}
          >
            {submitting
              ? 'Memproses Mutasi...'
              : txType === 'in'
                ? 'Simpan Stok Masuk'
                : 'Simpan Stok Keluar'}
          </button>
        </form>
      </section>

      {/* Right: Stock Mutation History Table */}
      <section
        aria-labelledby="stock-history-heading"
        className="space-y-4 xl:col-span-8"
      >
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="stock-history-heading" className="text-base font-bold text-slate-900">
                Riwayat Mutasi Stok Lengkap
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Menampilkan {filteredHistory.length} dari {transactions.length} catatan mutasi.
              </p>
            </div>

            <div
              role="group"
              aria-label="Filter jenis mutasi"
              className="flex items-center gap-1 rounded-lg bg-slate-100 p-1"
            >
              {[
                { id: 'all', label: 'Semua' },
                { id: 'in', label: 'Masuk' },
                { id: 'out', label: 'Keluar' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setFilterType(t.id as 'all' | 'in' | 'out')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    filterType === t.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <label htmlFor="stock-history-search" className="sr-only">
                Cari mutasi stok
              </label>
              <input
                id="stock-history-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari SKU, supplier, pembeli..."
                className="w-full rounded-lg border border-slate-300 py-1.5 pl-8 pr-2.5 text-xs text-slate-900 focus:border-blue-700 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="stock-history-item" className="sr-only">
                Filter barang
              </label>
              <select
                id="stock-history-item"
                value={filterItemId}
                onChange={(e) => setFilterItemId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-700 focus:outline-none"
              >
                <option value="all">Semua Barang</option>
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.sku} — {it.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="stock-date-from" className="sr-only">
                Dari tanggal
              </label>
              <input
                id="stock-date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                title="Dari tanggal"
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-xs text-slate-700 focus:border-blue-700 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="stock-date-to" className="sr-only">
                Sampai tanggal
              </label>
              <input
                id="stock-date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                title="Sampai tanggal"
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-xs text-slate-700 focus:border-blue-700 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {filteredHistory.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-slate-500">
              Tidak ada riwayat mutasi stok yang sesuai dengan filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                    <th className="px-3 py-3">Tanggal & ID</th>
                    <th className="px-3 py-3">Jenis</th>
                    <th className="px-3 py-3">Barang</th>
                    <th className="px-3 py-3 text-right">Jumlah</th>
                    <th className="px-3 py-3 text-right">Saldo</th>
                    <th className="px-3 py-3">Sumber / Tujuan & Pencatat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistory.map((tx) => {
                    const isIn = tx.type === 'in';
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/70">
                        <td className="px-3 py-3 whitespace-nowrap">
                          <p className="font-mono text-xs font-medium text-slate-900">
                            {formatDateId(tx.date)}
                          </p>
                          <p className="font-mono text-[11px] text-slate-400">{tx.id}</p>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-semibold ${
                              isIn ? 'text-emerald-700' : 'text-red-700'
                            }`}
                          >
                            {isIn ? (
                              <ArrowDownLeft className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            )}
                            <span>{isIn ? 'Masuk' : 'Keluar'}</span>
                          </span>
                        </td>
                        <td className="px-3 py-3 max-w-[220px]">
                          <p className="truncate font-medium text-slate-900" title={tx.itemName}>
                            {tx.itemName}
                          </p>
                          <p className="font-mono text-[11px] text-slate-500">{tx.itemSku}</p>
                        </td>
                        <td
                          className={`px-3 py-3 text-right font-mono text-sm font-bold tabular-nums whitespace-nowrap ${
                            isIn ? 'text-emerald-700' : 'text-red-700'
                          }`}
                        >
                          {isIn ? '+' : '-'}
                          {tx.quantity} {tx.itemUnit}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                          {tx.stockBefore} → <span className="font-semibold text-slate-900">{tx.stockAfter}</span>
                        </td>
                        <td className="px-3 py-3 max-w-[210px]">
                          <p className="truncate text-xs font-medium text-slate-800" title={tx.counterparty}>
                            {tx.counterparty}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] text-slate-500" title={tx.notes || tx.recordedBy}>
                            {tx.recordedBy}
                            {tx.notes ? ` · ${tx.notes}` : ''}
                          </p>
                        </td>
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
  );
}

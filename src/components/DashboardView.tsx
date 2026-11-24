import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Box,
  Boxes,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type {
  AppSection,
  CashflowTransaction,
  Item,
  StockTransaction,
} from '../types/inventory';
import {
  calculateDashboardSummary,
  formatDateId,
  formatRupiah,
  isLowStock,
} from '../utils/inventoryLogic';

interface DashboardViewProps {
  items: Item[];
  stockTransactions: StockTransaction[];
  cashflows: CashflowTransaction[];
  onNavigate: (section: AppSection) => void;
  onQuickRestock: (itemId: string) => void;
  onViewLowStockItems: () => void;
}

export function DashboardView({
  items,
  stockTransactions,
  cashflows,
  onNavigate,
  onQuickRestock,
  onViewLowStockItems,
}: DashboardViewProps) {
  const summary = calculateDashboardSummary(items, cashflows);
  const lowStockItems = items
    .filter(isLowStock)
    .sort((a, b) => a.currentStock - b.currentStock);

  const recentStock = stockTransactions.slice(0, 5);
  const recentCashflows = cashflows.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* 5 Summary KPI Cards */}
      <section aria-label="Ringkasan operasional">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500">Total Jenis Barang</p>
              <Box className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {summary.totalItemTypes}
            </p>
            <p className="mt-1 text-xs text-slate-500 tabular-nums">
              {summary.activeItemTypes} SKU berstatus aktif
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500">Total Unit Stok</p>
              <Boxes className="h-4 w-4 text-blue-700" />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {summary.totalStockUnits.toLocaleString('id-ID')}
            </p>
            <p className="mt-1 text-xs text-slate-500 tabular-nums">
              Nilai modal {formatRupiah(summary.inventoryBuyValue)}
            </p>
          </div>

          <button
            type="button"
            onClick={onViewLowStockItems}
            className="rounded-xl border border-slate-200 bg-white p-5 text-left transition-colors hover:border-amber-300 hover:bg-amber-50/30 focus-visible:outline-2 focus-visible:outline-blue-700"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500">Barang Stok Menipis</p>
              <AlertTriangle
                className={`h-4 w-4 ${
                  summary.lowStockCount > 0 ? 'text-amber-600' : 'text-slate-400'
                }`}
              />
            </div>
            <p
              className={`mt-2 font-mono text-2xl font-bold tracking-tight tabular-nums ${
                summary.lowStockCount > 0 ? 'text-amber-700' : 'text-slate-900'
              }`}
            >
              {summary.lowStockCount}
            </p>
            <p className="mt-1 text-xs text-slate-500 tabular-nums">
              {summary.outOfStockCount > 0
                ? `${summary.outOfStockCount} SKU stok habis (0 unit)`
                : 'Di bawah atau sama batas minimum'}
            </p>
          </button>

          <div className="rounded-xl border border-slate-200 bg-white p-4 xl:p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500">Total Pemasukan</p>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-2 font-mono text-lg font-bold tracking-tight text-emerald-700 tabular-nums whitespace-nowrap xl:text-[18px] 2xl:text-xl">
              {formatRupiah(summary.totalIncome)}
            </p>
            <p className="mt-1 text-xs text-slate-500 tabular-nums">
              Saldo kas bersih {formatRupiah(summary.cashBalance)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 xl:p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500">Total Pengeluaran</p>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </div>
            <p className="mt-2 font-mono text-lg font-bold tracking-tight text-red-700 tabular-nums whitespace-nowrap xl:text-[18px] 2xl:text-xl">
              {formatRupiah(summary.totalExpense)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Belanja stok & biaya operasional
            </p>
          </div>
        </div>
      </section>

      {/* Low Stock Alert Table */}
      <section
        aria-labelledby="low-stock-heading"
        className="rounded-xl border border-slate-200 bg-white"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 id="low-stock-heading" className="text-base font-semibold text-slate-900">
              Peringatan Stok Menipis (Di Bawah Batas Minimum)
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Barang aktif yang memerlukan pengadaan ulang agar pengiriman grosir tidak terhambat.
            </p>
          </div>
          <button
            type="button"
            onClick={onViewLowStockItems}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800 whitespace-nowrap shrink-0"
          >
            <span>Lihat di Master Barang</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {lowStockItems.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-500">
            Seluruh barang aktif saat ini memiliki stok di atas batas minimum.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                  <th className="px-5 py-3">Kode / SKU</th>
                  <th className="px-5 py-3">Nama Barang</th>
                  <th className="px-5 py-3">Kategori</th>
                  <th className="px-5 py-3 text-right">Stok Saat Ini</th>
                  <th className="px-5 py-3 text-right">Stok Min.</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lowStockItems.map((item) => {
                  const isEmpty = item.currentStock === 0;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80">
                      <td className="px-5 py-3 font-mono text-xs font-medium text-slate-700 whitespace-nowrap">
                        {item.sku}
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-900">{item.name}</td>
                      <td className="px-5 py-3 text-xs text-slate-600 whitespace-nowrap">
                        {item.category}
                      </td>
                      <td className="px-5 py-3 text-right font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                        {item.currentStock} {item.unit}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-xs text-slate-500 tabular-nums whitespace-nowrap">
                        {item.minStock} {item.unit}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                            isEmpty ? 'text-red-700' : 'text-amber-700'
                          }`}
                        >
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>{isEmpty ? 'Stok Habis' : 'Menipis'}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onQuickRestock(item.id)}
                          aria-label={`Restok ${item.name}`}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:border-blue-700 hover:text-blue-700"
                        >
                          Catat Stok Masuk
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Two-Column Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Stock Mutations */}
        <section
          aria-labelledby="recent-stock-heading"
          className="rounded-xl border border-slate-200 bg-white"
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 id="recent-stock-heading" className="text-base font-semibold text-slate-900">
              Mutasi Stok Terbaru
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('stock')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800 whitespace-nowrap shrink-0"
            >
              <span>Semua Mutasi</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {recentStock.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-slate-500">
              Belum ada mutasi stok tercatat.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentStock.map((tx) => {
                const isIn = tx.type === 'in';
                return (
                  <div
                    key={tx.id}
                    className="flex items-start justify-between gap-4 px-5 py-3.5 hover:bg-slate-50/70"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
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
                        <span className="text-slate-300" aria-hidden="true">
                          ·
                        </span>
                        <span className="font-mono text-xs text-slate-500">{tx.itemSku}</span>
                      </div>
                      <p className="mt-0.5 truncate text-sm font-medium text-slate-900">
                        {tx.itemName}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {tx.counterparty} · {formatDateId(tx.date)}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p
                        className={`font-mono text-sm font-bold tabular-nums ${
                          isIn ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {isIn ? '+' : '-'}
                        {tx.quantity} {tx.itemUnit}
                      </p>
                      <p className="mt-0.5 font-mono text-[11px] text-slate-400 tabular-nums">
                        {tx.stockBefore} → {tx.stockAfter}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Recent Cashflow Activity */}
        <section
          aria-labelledby="recent-cashflow-heading"
          className="rounded-xl border border-slate-200 bg-white"
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 id="recent-cashflow-heading" className="text-base font-semibold text-slate-900">
              Arus Kas Operasional Terbaru
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('cashflow')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800 whitespace-nowrap shrink-0"
            >
              <span>Semua Transaksi Kas</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {recentCashflows.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-slate-500">
              Belum ada transaksi kas operasional tercatat.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentCashflows.map((cf) => {
                const isIncome = cf.type === 'income';
                return (
                  <div
                    key={cf.id}
                    className="flex items-start justify-between gap-4 px-5 py-3.5 hover:bg-slate-50/70"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span
                          className={`font-semibold ${
                            isIncome ? 'text-emerald-700' : 'text-red-700'
                          }`}
                        >
                          {isIncome ? 'Pemasukan' : 'Pengeluaran'}
                        </span>
                        <span className="text-slate-300" aria-hidden="true">
                          ·
                        </span>
                        <span className="truncate text-slate-500">{cf.category}</span>
                      </div>
                      <p className="mt-0.5 truncate text-sm font-medium text-slate-900">
                        {cf.description}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatDateId(cf.date)} · {cf.recordedBy}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p
                        className={`font-mono text-sm font-bold tabular-nums ${
                          isIncome ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {isIncome ? '+' : '-'}
                        {formatRupiah(cf.amount)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

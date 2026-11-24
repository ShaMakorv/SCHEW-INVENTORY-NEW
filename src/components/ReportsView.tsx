import { useState } from 'react';
import { Download, FileJson, Printer } from 'lucide-react';
import type { CashflowTransaction, Item, StockTransaction } from '../types/inventory';
import {
  calculateCashflowSummary,
  calculateDashboardSummary,
  filterCashflows,
  filterStockTransactions,
  formatDateId,
  formatRupiah,
  isLowStock,
  toCsvString,
} from '../utils/inventoryLogic';

interface ReportsViewProps {
  items: Item[];
  stockTransactions: StockTransaction[];
  cashflows: CashflowTransaction[];
  onExportFeedback: (label: string) => void;
}

type ReportTab = 'stock-summary' | 'stock-mutations' | 'cashflow-summary';

function triggerDownload(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function ReportsView({
  items,
  stockTransactions,
  cashflows,
  onExportFeedback,
}: ReportsViewProps) {
  const [activeTab, setActiveTab] = useState<ReportTab>('stock-summary');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filteredStock = filterStockTransactions(stockTransactions, { dateFrom, dateTo });
  const filteredCashflows = filterCashflows(cashflows, { dateFrom, dateTo });

  const stockSummary = calculateDashboardSummary(items, cashflows);
  const cashPeriodSummary = calculateCashflowSummary(filteredCashflows);

  const totalUnitsIn = filteredStock
    .filter((tx) => tx.type === 'in')
    .reduce((sum, tx) => sum + tx.quantity, 0);
  const totalUnitsOut = filteredStock
    .filter((tx) => tx.type === 'out')
    .reduce((sum, tx) => sum + tx.quantity, 0);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    if (activeTab === 'stock-summary') {
      const headers = [
        'Kode SKU',
        'Nama Barang',
        'Kategori',
        'Satuan',
        'Harga Beli',
        'Harga Jual',
        'Stok Saat Ini',
        'Stok Minimum',
        'Nilai Modal',
        'Status',
      ];
      const rows = items.map((it) => [
        it.sku,
        it.name,
        it.category,
        it.unit,
        it.buyPrice,
        it.sellPrice,
        it.currentStock,
        it.minStock,
        it.currentStock * it.buyPrice,
        it.status === 'inactive'
          ? 'Nonaktif'
          : it.currentStock === 0
            ? 'Habis'
            : isLowStock(it)
              ? 'Menipis'
              : 'Aman',
      ]);
      triggerDownload(`schew-laporan-stok-${stamp}.csv`, toCsvString(headers, rows), 'text/csv;charset=utf-8;');
      onExportFeedback('CSV Laporan Stok Terkini');
    } else if (activeTab === 'stock-mutations') {
      const headers = [
        'ID Mutasi',
        'Tanggal',
        'Jenis',
        'SKU',
        'Nama Barang',
        'Jumlah',
        'Satuan',
        'Stok Sebelum',
        'Stok Sesudah',
        'Sumber/Tujuan',
        'Pencatat',
        'Catatan',
      ];
      const rows = filteredStock.map((tx) => [
        tx.id,
        tx.date,
        tx.type === 'in' ? 'Masuk' : 'Keluar',
        tx.itemSku,
        tx.itemName,
        tx.quantity,
        tx.itemUnit,
        tx.stockBefore,
        tx.stockAfter,
        tx.counterparty,
        tx.recordedBy,
        tx.notes,
      ]);
      triggerDownload(`schew-mutasi-stok-${stamp}.csv`, toCsvString(headers, rows), 'text/csv;charset=utf-8;');
      onExportFeedback('CSV Laporan Mutasi Stok');
    } else {
      const headers = [
        'ID Kas',
        'Tanggal',
        'Jenis',
        'Kategori',
        'Nominal (Rp)',
        'Referensi Stok',
        'Keterangan',
        'Pencatat',
      ];
      const rows = filteredCashflows.map((cf) => [
        cf.id,
        cf.date,
        cf.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
        cf.category,
        cf.amount,
        cf.stockRefLabel ?? '-',
        cf.description,
        cf.recordedBy,
      ]);
      triggerDownload(`schew-rekap-kas-${stamp}.csv`, toCsvString(headers, rows), 'text/csv;charset=utf-8;');
      onExportFeedback('CSV Rekapitulasi Kas');
    }
  };

  const handleExportJson = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    const payload = {
      generatedAt: new Date().toISOString(),
      period: {
        from: dateFrom || 'Semua Tanggal',
        to: dateTo || 'Semua Tanggal',
      },
      reportType: activeTab,
      data:
        activeTab === 'stock-summary'
          ? { summary: stockSummary, items }
          : activeTab === 'stock-mutations'
            ? { totalUnitsIn, totalUnitsOut, transactions: filteredStock }
            : { summary: cashPeriodSummary, cashflows: filteredCashflows },
    };
    triggerDownload(
      `schew-${activeTab}-${stamp}.json`,
      JSON.stringify(payload, null, 2),
      'application/json;charset=utf-8;',
    );
    onExportFeedback('JSON Laporan Terstruktur');
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar (hidden when printing) */}
      <div className="no-print flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="tablist"
          aria-label="Jenis laporan"
          className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1"
        >
          {[
            { id: 'stock-summary', label: 'Stok Terkini' },
            { id: 'stock-mutations', label: 'Mutasi Stok' },
            { id: 'cashflow-summary', label: 'Rekapitulasi Kas' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id as ReportTab)}
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2">
            <label htmlFor="report-date-from" className="text-xs font-medium text-slate-600">
              Periode:
            </label>
            <input
              id="report-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-xs text-slate-700"
            />
            <span className="text-xs text-slate-400">s.d.</span>
            <input
              id="report-date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-xs text-slate-700"
            />
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Ekspor CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <FileJson className="h-3.5 w-3.5" />
            <span>Ekspor JSON</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 whitespace-nowrap shrink-0"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Cetak Laporan</span>
          </button>
        </div>
      </div>

      {/* Printable Report Surface */}
      <div className="print-container rounded-xl border border-slate-200 bg-white p-6">
        {/* Official Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              SCHEW / SCHEW ID · Sistem Manajemen Stok Grosir
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">
              {activeTab === 'stock-summary'
                ? 'Laporan Posisi Stok Barang Terkini'
                : activeTab === 'stock-mutations'
                  ? 'Laporan Riwayat Mutasi Stok Masuk & Keluar'
                  : 'Laporan Rekapitulasi Pemasukan & Pengeluaran Kas'}
            </h2>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>
              Periode:{' '}
              <span className="font-mono font-medium text-slate-800">
                {dateFrom ? formatDateId(dateFrom) : 'Awal'} —{' '}
                {dateTo ? formatDateId(dateTo) : 'Sekarang'}
              </span>
            </p>
            <p className="mt-0.5">
              Dicetak: <span className="font-mono">{formatDateId(new Date().toISOString().slice(0, 10))}</span>
            </p>
          </div>
        </div>

        {/* Report Body */}
        {activeTab === 'stock-summary' && (
          <div className="mt-5 space-y-5">
            <div className="grid grid-cols-2 gap-4 border-b border-slate-200 pb-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-slate-500">Jenis Barang Aktif</p>
                <p className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums">
                  {stockSummary.activeItemTypes} SKU
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Unit Tersedia</p>
                <p className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums">
                  {stockSummary.totalStockUnits.toLocaleString('id-ID')} unit
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Valuasi Modal Stok</p>
                <p className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums">
                  {formatRupiah(stockSummary.inventoryBuyValue)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Potensi Nilai Jual Grosir</p>
                <p className="mt-1 font-mono text-lg font-bold text-emerald-700 tabular-nums">
                  {formatRupiah(stockSummary.inventorySellValue)}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="px-3 py-2.5">SKU</th>
                    <th className="px-3 py-2.5">Nama Barang</th>
                    <th className="px-3 py-2.5">Kategori</th>
                    <th className="px-3 py-2.5 text-right">Stok</th>
                    <th className="px-3 py-2.5 text-right">Min.</th>
                    <th className="px-3 py-2.5 text-right">Harga Beli</th>
                    <th className="px-3 py-2.5 text-right">Nilai Modal</th>
                    <th className="px-3 py-2.5">Kondisi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((it) => (
                    <tr key={it.id}>
                      <td className="px-3 py-2.5 font-mono text-xs text-slate-700">{it.sku}</td>
                      <td className="px-3 py-2.5 font-medium text-slate-900">{it.name}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-600">{it.category}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold tabular-nums">
                        {it.currentStock} {it.unit}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs text-slate-500 tabular-nums">
                        {it.minStock}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums">
                        {formatRupiah(it.buyPrice)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs font-semibold tabular-nums">
                        {formatRupiah(it.currentStock * it.buyPrice)}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-medium">
                        {it.status === 'inactive' ? (
                          <span className="text-slate-500">Nonaktif</span>
                        ) : it.currentStock === 0 ? (
                          <span className="text-red-700">Habis</span>
                        ) : isLowStock(it) ? (
                          <span className="text-amber-700">Menipis</span>
                        ) : (
                          <span className="text-emerald-700">Aman</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'stock-mutations' && (
          <div className="mt-5 space-y-5">
            <div className="grid grid-cols-1 gap-4 border-b border-slate-200 pb-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-slate-500">Total Transaksi Mutasi</p>
                <p className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums">
                  {filteredStock.length} transaksi
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Akumulasi Unit Masuk</p>
                <p className="mt-1 font-mono text-lg font-bold text-emerald-700 tabular-nums">
                  +{totalUnitsIn.toLocaleString('id-ID')} unit
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Akumulasi Unit Keluar</p>
                <p className="mt-1 font-mono text-lg font-bold text-red-700 tabular-nums">
                  -{totalUnitsOut.toLocaleString('id-ID')} unit
                </p>
              </div>
            </div>

            {filteredStock.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                Tidak ada mutasi stok pada rentang tanggal ini.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                      <th className="px-3 py-2.5">Tanggal</th>
                      <th className="px-3 py-2.5">ID</th>
                      <th className="px-3 py-2.5">Jenis</th>
                      <th className="px-3 py-2.5">SKU & Barang</th>
                      <th className="px-3 py-2.5 text-right">Jumlah</th>
                      <th className="px-3 py-2.5 text-right">Sebelum → Sesudah</th>
                      <th className="px-3 py-2.5">Sumber / Tujuan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStock.map((tx) => (
                      <tr key={tx.id}>
                        <td className="px-3 py-2.5 font-mono text-xs">{formatDateId(tx.date)}</td>
                        <td className="px-3 py-2.5 font-mono text-xs text-slate-500">{tx.id}</td>
                        <td
                          className={`px-3 py-2.5 text-xs font-semibold ${
                            tx.type === 'in' ? 'text-emerald-700' : 'text-red-700'
                          }`}
                        >
                          {tx.type === 'in' ? 'Masuk' : 'Keluar'}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="font-mono text-xs text-slate-500">{tx.itemSku}</span>{' '}
                          <span className="font-medium text-slate-900">{tx.itemName}</span>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-semibold tabular-nums">
                          {tx.type === 'in' ? '+' : '-'}
                          {tx.quantity} {tx.itemUnit}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums">
                          {tx.stockBefore} → {tx.stockAfter}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-slate-700">{tx.counterparty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'cashflow-summary' && (
          <div className="mt-5 space-y-5">
            <div className="grid grid-cols-1 gap-4 border-b border-slate-200 pb-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-slate-500">Total Pemasukan Periode</p>
                <p className="mt-1 font-mono text-lg font-bold text-emerald-700 tabular-nums">
                  {formatRupiah(cashPeriodSummary.totalIncome)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Pengeluaran Periode</p>
                <p className="mt-1 font-mono text-lg font-bold text-red-700 tabular-nums">
                  {formatRupiah(cashPeriodSummary.totalExpense)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Selisih / Saldo Bersih Periode</p>
                <p
                  className={`mt-1 font-mono text-lg font-bold tabular-nums ${
                    cashPeriodSummary.balance >= 0 ? 'text-slate-900' : 'text-red-700'
                  }`}
                >
                  {formatRupiah(cashPeriodSummary.balance)}
                </p>
              </div>
            </div>

            {filteredCashflows.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                Tidak ada transaksi kas pada rentang tanggal ini.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                      <th className="px-3 py-2.5">Tanggal</th>
                      <th className="px-3 py-2.5">ID</th>
                      <th className="px-3 py-2.5">Jenis</th>
                      <th className="px-3 py-2.5">Kategori</th>
                      <th className="px-3 py-2.5">Keterangan</th>
                      <th className="px-3 py-2.5 text-right">Nominal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCashflows.map((cf) => (
                      <tr key={cf.id}>
                        <td className="px-3 py-2.5 font-mono text-xs">{formatDateId(cf.date)}</td>
                        <td className="px-3 py-2.5 font-mono text-xs text-slate-500">{cf.id}</td>
                        <td
                          className={`px-3 py-2.5 text-xs font-semibold ${
                            cf.type === 'income' ? 'text-emerald-700' : 'text-red-700'
                          }`}
                        >
                          {cf.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-slate-700">{cf.category}</td>
                        <td className="px-3 py-2.5 text-xs text-slate-900">{cf.description}</td>
                        <td
                          className={`px-3 py-2.5 text-right font-mono font-semibold tabular-nums ${
                            cf.type === 'income' ? 'text-emerald-700' : 'text-red-700'
                          }`}
                        >
                          {cf.type === 'income' ? '+' : '-'}
                          {formatRupiah(cf.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

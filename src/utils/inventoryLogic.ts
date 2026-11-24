import type {
  CashflowInput,
  CashflowSummary,
  CashflowTransaction,
  DashboardSummary,
  Item,
  ItemInput,
  StockTransaction,
  StockTransactionInput,
} from '../types/inventory';

export const ITEM_CATEGORIES = [
  'Kaos & Atasan',
  'Hoodie & Outerwear',
  'Celana & Bawahan',
  'Tas & Aksesoris',
  'Kemasan & Perlengkapan',
] as const;

export const ITEM_UNITS = ['pcs', 'pack', 'lusin', 'dus/karton'] as const;

export const CASHFLOW_CATEGORIES = {
  income: [
    'Penjualan Grosir',
    'Penjualan Reseller',
    'Pelunasan Piutang Toko',
    'Pendapatan Lain-lain',
  ],
  expense: [
    'Pembelian Stok Barang',
    'Ongkos Kirim & Ekspedisi',
    'Gaji & Upah Karyawan',
    'Sewa Gudang & Utilitas',
    'Kemasan & Perlengkapan',
    'Operasional Lain-lain',
  ],
} as const;

export function formatRupiah(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const sign = safe < 0 ? '-' : '';
  const abs = Math.round(Math.abs(safe));
  return `${sign}Rp ${abs.toLocaleString('id-ID')}`;
}

export function formatDateId(isoDate: string): string {
  if (!isoDate) return '-';
  const parts = isoDate.slice(0, 10).split('-');
  if (parts.length !== 3) return isoDate;
  const [year, month, day] = parts;
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'Mei',
    'Jun',
    'Jul',
    'Agu',
    'Sep',
    'Okt',
    'Nov',
    'Des',
  ];
  const mIdx = Number(month) - 1;
  const mName = months[mIdx] ?? month;
  return `${Number(day)} ${mName} ${year}`;
}

export function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isLowStock(item: Pick<Item, 'currentStock' | 'minStock' | 'status'>): boolean {
  return item.status === 'active' && item.currentStock <= item.minStock;
}

export function calculateDashboardSummary(
  items: Item[],
  cashflows: CashflowTransaction[],
): DashboardSummary {
  const activeItems = items.filter((item) => item.status === 'active');
  const totalStockUnits = activeItems.reduce((sum, item) => sum + item.currentStock, 0);
  const lowStockCount = activeItems.filter((item) => item.currentStock <= item.minStock).length;
  const outOfStockCount = activeItems.filter((item) => item.currentStock === 0).length;

  const inventoryBuyValue = activeItems.reduce(
    (sum, item) => sum + item.currentStock * item.buyPrice,
    0,
  );
  const inventorySellValue = activeItems.reduce(
    (sum, item) => sum + item.currentStock * item.sellPrice,
    0,
  );

  const cashSummary = calculateCashflowSummary(cashflows);

  return {
    totalItemTypes: items.length,
    activeItemTypes: activeItems.length,
    totalStockUnits,
    lowStockCount,
    outOfStockCount,
    totalIncome: cashSummary.totalIncome,
    totalExpense: cashSummary.totalExpense,
    cashBalance: cashSummary.balance,
    inventoryBuyValue,
    inventorySellValue,
  };
}

export function calculateCashflowSummary(cashflows: CashflowTransaction[]): CashflowSummary {
  let totalIncome = 0;
  let totalExpense = 0;
  for (const cf of cashflows) {
    if (cf.type === 'income') {
      totalIncome += cf.amount;
    } else if (cf.type === 'expense') {
      totalExpense += cf.amount;
    }
  }
  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    transactionCount: cashflows.length,
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateItemInput(
  input: ItemInput,
  existingItems: Item[],
  editingId?: string,
): ValidationResult {
  const errors: Record<string, string> = {};
  const skuClean = input.sku.trim().toUpperCase();
  const nameClean = input.name.trim();

  if (!skuClean) {
    errors.sku = 'Kode/SKU wajib diisi.';
  } else {
    const duplicate = existingItems.find(
      (it) => it.sku.trim().toUpperCase() === skuClean && it.id !== editingId,
    );
    if (duplicate) {
      errors.sku = `Kode/SKU "${skuClean}" sudah digunakan oleh barang lain.`;
    }
  }

  if (!nameClean) {
    errors.name = 'Nama barang wajib diisi.';
  }

  if (!input.category.trim()) {
    errors.category = 'Kategori wajib dipilih.';
  }

  if (!input.unit.trim()) {
    errors.unit = 'Satuan wajib dipilih.';
  }

  if (!Number.isFinite(input.buyPrice) || input.buyPrice < 0) {
    errors.buyPrice = 'Harga beli tidak boleh bernilai negatif.';
  }

  if (!Number.isFinite(input.sellPrice) || input.sellPrice < 0) {
    errors.sellPrice = 'Harga jual tidak boleh bernilai negatif.';
  }

  if (!Number.isFinite(input.currentStock) || input.currentStock < 0) {
    errors.currentStock = 'Stok saat ini harus berupa angka 0 atau lebih.';
  }

  if (!Number.isFinite(input.minStock) || input.minStock < 0) {
    errors.minStock = 'Stok minimum harus berupa angka 0 atau lebih.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export interface StockMutationResult {
  ok: boolean;
  errors: Record<string, string>;
  updatedItem?: Item;
  transaction?: StockTransaction;
}

export function validateAndApplyStockTransaction(
  items: Item[],
  input: StockTransactionInput,
  recordedBy: string,
  nowIso = new Date().toISOString(),
  newTxId = `STK-${Date.now()}`,
): StockMutationResult {
  const errors: Record<string, string> = {};
  const targetItem = items.find((item) => item.id === input.itemId);

  if (!input.itemId || !targetItem) {
    errors.itemId = 'Pilih barang yang valid terlebih dahulu.';
  } else if (targetItem.status !== 'active') {
    errors.itemId = 'Barang berstatus nonaktif tidak dapat menerima transaksi stok.';
  }

  if (!Number.isFinite(input.quantity) || input.quantity <= 0 || !Number.isInteger(input.quantity)) {
    errors.quantity = 'Jumlah mutasi harus berupa bilangan bulat lebih dari 0.';
  }

  if (!input.date || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    errors.date = 'Tanggal transaksi wajib diisi dengan format yang valid.';
  }

  if (!input.counterparty.trim()) {
    errors.counterparty =
      input.type === 'in'
        ? 'Nama supplier / sumber stok wajib diisi.'
        : 'Nama tujuan / pembeli grosir wajib diisi.';
  }

  if (
    targetItem &&
    input.type === 'out' &&
    Number.isFinite(input.quantity) &&
    input.quantity > 0 &&
    input.quantity > targetItem.currentStock
  ) {
    errors.quantity = `Stok tidak mencukupi. Jumlah keluar (${input.quantity} ${targetItem.unit}) melebihi stok tersedia (${targetItem.currentStock} ${targetItem.unit}).`;
  }

  if (Object.keys(errors).length > 0 || !targetItem) {
    return { ok: false, errors };
  }

  const stockBefore = targetItem.currentStock;
  const stockAfter =
    input.type === 'in' ? stockBefore + input.quantity : stockBefore - input.quantity;

  const updatedItem: Item = {
    ...targetItem,
    currentStock: stockAfter,
    updatedAt: nowIso,
  };

  const transaction: StockTransaction = {
    id: newTxId,
    itemId: targetItem.id,
    itemSku: targetItem.sku,
    itemName: targetItem.name,
    itemUnit: targetItem.unit,
    type: input.type,
    quantity: input.quantity,
    stockBefore,
    stockAfter,
    date: input.date,
    counterparty: input.counterparty.trim(),
    notes: input.notes.trim(),
    recordedBy,
    createdAt: nowIso,
  };

  return {
    ok: true,
    errors: {},
    updatedItem,
    transaction,
  };
}

export function validateCashflowInput(input: CashflowInput): ValidationResult {
  const errors: Record<string, string> = {};

  if (input.type !== 'income' && input.type !== 'expense') {
    errors.type = 'Jenis transaksi kas harus Pemasukan atau Pengeluaran.';
  }

  if (!input.category.trim()) {
    errors.category = 'Kategori transaksi wajib dipilih.';
  }

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    errors.amount = 'Nominal harus lebih besar dari Rp 0.';
  }

  if (!input.date || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    errors.date = 'Tanggal transaksi wajib diisi.';
  }

  if (!input.description.trim()) {
    errors.description = 'Keterangan transaksi wajib diisi.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export interface ItemFilterOptions {
  search?: string;
  category?: string;
  statusFilter?: 'all' | 'active' | 'inactive' | 'low-stock';
}

export function filterItems(items: Item[], options: ItemFilterOptions): Item[] {
  const query = (options.search ?? '').trim().toLowerCase();
  const category = options.category ?? 'all';
  const statusFilter = options.statusFilter ?? 'all';

  return items.filter((item) => {
    if (query) {
      const matchesQuery =
        item.sku.toLowerCase().includes(query) ||
        item.name.toLowerCase().includes(query) ||
        item.notes.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query);
      if (!matchesQuery) return false;
    }

    if (category !== 'all' && item.category !== category) {
      return false;
    }

    if (statusFilter === 'active' && item.status !== 'active') return false;
    if (statusFilter === 'inactive' && item.status !== 'inactive') return false;
    if (statusFilter === 'low-stock' && !isLowStock(item)) return false;

    return true;
  });
}

export interface StockFilterOptions {
  search?: string;
  type?: 'all' | 'in' | 'out';
  itemId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function filterStockTransactions(
  transactions: StockTransaction[],
  options: StockFilterOptions,
): StockTransaction[] {
  const query = (options.search ?? '').trim().toLowerCase();
  const type = options.type ?? 'all';
  const itemId = options.itemId ?? 'all';
  const dateFrom = options.dateFrom ?? '';
  const dateTo = options.dateTo ?? '';

  return transactions.filter((tx) => {
    if (type !== 'all' && tx.type !== type) return false;
    if (itemId !== 'all' && tx.itemId !== itemId) return false;
    if (dateFrom && tx.date < dateFrom) return false;
    if (dateTo && tx.date > dateTo) return false;

    if (query) {
      const match =
        tx.itemSku.toLowerCase().includes(query) ||
        tx.itemName.toLowerCase().includes(query) ||
        tx.counterparty.toLowerCase().includes(query) ||
        tx.notes.toLowerCase().includes(query) ||
        tx.id.toLowerCase().includes(query);
      if (!match) return false;
    }

    return true;
  });
}

export interface CashflowFilterOptions {
  search?: string;
  type?: 'all' | 'income' | 'expense';
  category?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function filterCashflows(
  cashflows: CashflowTransaction[],
  options: CashflowFilterOptions,
): CashflowTransaction[] {
  const query = (options.search ?? '').trim().toLowerCase();
  const type = options.type ?? 'all';
  const category = options.category ?? 'all';
  const dateFrom = options.dateFrom ?? '';
  const dateTo = options.dateTo ?? '';

  return cashflows.filter((cf) => {
    if (type !== 'all' && cf.type !== type) return false;
    if (category !== 'all' && cf.category !== category) return false;
    if (dateFrom && cf.date < dateFrom) return false;
    if (dateTo && cf.date > dateTo) return false;

    if (query) {
      const match =
        cf.description.toLowerCase().includes(query) ||
        cf.category.toLowerCase().includes(query) ||
        (cf.stockRefLabel ?? '').toLowerCase().includes(query) ||
        cf.id.toLowerCase().includes(query);
      if (!match) return false;
    }

    return true;
  });
}

export function escapeCsvCell(value: string | number | boolean | undefined | null): string {
  const str = String(value ?? '');
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsvString(
  headers: string[],
  rows: Array<Array<string | number | boolean | undefined | null>>,
): string {
  const headerLine = headers.map(escapeCsvCell).join(',');
  const bodyLines = rows.map((row) => row.map(escapeCsvCell).join(','));
  return '\uFEFF' + [headerLine, ...bodyLines].join('\r\n');
}

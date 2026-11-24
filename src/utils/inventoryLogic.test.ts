import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCashflowSummary,
  calculateDashboardSummary,
  filterCashflows,
  filterItems,
  filterStockTransactions,
  formatRupiah,
  toCsvString,
  validateAndApplyStockTransaction,
  validateCashflowInput,
  validateItemInput,
} from './inventoryLogic';
import type { CashflowTransaction, Item, StockTransaction } from '../types/inventory';

const sampleItems: Item[] = [
  {
    id: 'item-1',
    sku: 'SCW-TS-001',
    name: 'Kaos Oversize Heavyweight 24s Hitam',
    category: 'Kaos & Atasan',
    unit: 'pcs',
    buyPrice: 48000,
    sellPrice: 68000,
    currentStock: 120,
    minStock: 40,
    status: 'active',
    notes: 'Best seller grosir',
    updatedAt: '2026-11-20T08:00:00.000Z',
  },
  {
    id: 'item-2',
    sku: 'SCW-HD-002',
    name: 'Hoodie Boxy Fleece 330gsm Abu',
    category: 'Hoodie & Outerwear',
    unit: 'pcs',
    buyPrice: 115000,
    sellPrice: 155000,
    currentStock: 15,
    minStock: 20,
    status: 'active',
    notes: 'Perlu restok konveksi',
    updatedAt: '2026-11-20T08:00:00.000Z',
  },
  {
    id: 'item-3',
    sku: 'SCW-OLD-099',
    name: 'Topi Corduroy Edisi Lama',
    category: 'Tas & Aksesoris',
    unit: 'pcs',
    buyPrice: 28000,
    sellPrice: 42000,
    currentStock: 5,
    minStock: 10,
    status: 'inactive',
    notes: 'Discontinued',
    updatedAt: '2026-11-10T08:00:00.000Z',
  },
];

const sampleCashflows: CashflowTransaction[] = [
  {
    id: 'CF-1',
    type: 'income',
    category: 'Penjualan Grosir',
    amount: 5500000,
    date: '2026-11-20',
    description: 'Order Toko Distro Bandung',
    recordedBy: 'Admin',
    createdAt: '2026-11-20T09:00:00.000Z',
  },
  {
    id: 'CF-2',
    type: 'expense',
    category: 'Ongkos Kirim & Ekspedisi',
    amount: 450000,
    date: '2026-11-21',
    description: 'Kargo Indah Cargo',
    recordedBy: 'Staff',
    createdAt: '2026-11-21T10:00:00.000Z',
  },
];

test('calculateDashboardSummary computes active stock units, low-stock count, and cash balance', () => {
  const summary = calculateDashboardSummary(sampleItems, sampleCashflows);
  assert.equal(summary.totalItemTypes, 3);
  assert.equal(summary.activeItemTypes, 2);
  assert.equal(summary.totalStockUnits, 135); // 120 + 15 (inactive ignored)
  assert.equal(summary.lowStockCount, 1); // item-2 (15 <= 20), inactive item-3 excluded
  assert.equal(summary.totalIncome, 5500000);
  assert.equal(summary.totalExpense, 450000);
  assert.equal(summary.cashBalance, 5050000);
});

test('validateItemInput rejects duplicate SKU and negative prices', () => {
  const res = validateItemInput(
    {
      sku: 'scw-ts-001',
      name: '',
      category: 'Kaos & Atasan',
      unit: 'pcs',
      buyPrice: -100,
      sellPrice: 50000,
      currentStock: -1,
      minStock: 10,
      status: 'active',
      notes: '',
    },
    sampleItems,
  );
  assert.equal(res.valid, false);
  assert.ok(res.errors.sku);
  assert.ok(res.errors.name);
  assert.ok(res.errors.buyPrice);
  assert.ok(res.errors.currentStock);
});

test('validateAndApplyStockTransaction adds stock on "in" and blocks "out" exceeding stock', () => {
  const inResult = validateAndApplyStockTransaction(
    sampleItems,
    {
      itemId: 'item-2',
      type: 'in',
      quantity: 25,
      date: '2026-11-23',
      counterparty: 'Konveksi Jaya Mandiri',
      notes: 'Restok batch 4',
    },
    'Admin SCHEW',
    '2026-11-23T10:00:00.000Z',
    'STK-TEST-1',
  );
  assert.equal(inResult.ok, true);
  assert.equal(inResult.updatedItem?.currentStock, 40);
  assert.equal(inResult.transaction?.stockBefore, 15);
  assert.equal(inResult.transaction?.stockAfter, 40);

  const outExceedResult = validateAndApplyStockTransaction(
    sampleItems,
    {
      itemId: 'item-2',
      type: 'out',
      quantity: 20, // currentStock is 15
      date: '2026-11-23',
      counterparty: 'Reseller Jakarta',
      notes: 'Order kilat',
    },
    'Staff Gudang',
  );
  assert.equal(outExceedResult.ok, false);
  assert.match(outExceedResult.errors.quantity, /melebihi stok tersedia/);

  const outValidResult = validateAndApplyStockTransaction(
    sampleItems,
    {
      itemId: 'item-1',
      type: 'out',
      quantity: 30,
      date: '2026-11-23',
      counterparty: 'Toko Grosir Surabaya',
      notes: 'Packing 2 karung',
    },
    'Staff Gudang',
  );
  assert.equal(outValidResult.ok, true);
  assert.equal(outValidResult.updatedItem?.currentStock, 90);
});

test('validateCashflowInput rejects zero/negative amounts and missing description', () => {
  const res = validateCashflowInput({
    type: 'expense',
    category: 'Pembelian Stok Barang',
    amount: 0,
    date: '2026-11-23',
    description: '   ',
  });
  assert.equal(res.valid, false);
  assert.ok(res.errors.amount);
  assert.ok(res.errors.description);
});

test('filter helpers filter items, stock transactions, and cashflows accurately', () => {
  assert.equal(filterItems(sampleItems, { statusFilter: 'low-stock' }).length, 1);
  assert.equal(filterItems(sampleItems, { search: 'Heavyweight' }).length, 1);

  const stockTxs: StockTransaction[] = [
    {
      id: 'STK-1',
      itemId: 'item-1',
      itemSku: 'SCW-TS-001',
      itemName: 'Kaos Oversize Heavyweight 24s Hitam',
      itemUnit: 'pcs',
      type: 'in',
      quantity: 50,
      stockBefore: 70,
      stockAfter: 120,
      date: '2026-11-18',
      counterparty: 'Konveksi A',
      notes: '',
      recordedBy: 'Admin',
      createdAt: '2026-11-18T10:00:00.000Z',
    },
    {
      id: 'STK-2',
      itemId: 'item-2',
      itemSku: 'SCW-HD-002',
      itemName: 'Hoodie Boxy Fleece 330gsm Abu',
      itemUnit: 'pcs',
      type: 'out',
      quantity: 10,
      stockBefore: 25,
      stockAfter: 15,
      date: '2026-11-22',
      counterparty: 'Reseller B',
      notes: '',
      recordedBy: 'Staff',
      createdAt: '2026-11-22T10:00:00.000Z',
    },
  ];

  assert.equal(
    filterStockTransactions(stockTxs, { type: 'out', dateFrom: '2026-11-20' }).length,
    1,
  );
  assert.equal(
    filterCashflows(sampleCashflows, { type: 'income', dateTo: '2026-11-20' }).length,
    1,
  );
  assert.equal(calculateCashflowSummary(sampleCashflows).balance, 5050000);
});

test('toCsvString and formatRupiah format cleanly for Excel export and UI display', () => {
  const csv = toCsvString(['SKU', 'Nama'], [['SCW-1', 'Kaos "Boxy", Hitam']]);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.match(csv, /"Kaos ""Boxy"", Hitam"/);
  assert.equal(formatRupiah(1250000), 'Rp 1.250.000');
});

export type UserRole = 'admin' | 'staff';

export type ItemStatus = 'active' | 'inactive';

export type StockTransactionType = 'in' | 'out';

export type CashflowType = 'income' | 'expense';

export type AppSection =
  | 'dashboard'
  | 'items'
  | 'stock'
  | 'cashflow'
  | 'reports'
  | 'users';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
}

export interface StoredUser extends UserAccount {
  passwordHash: string;
  passwordSalt: string;
}

export interface Item {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  buyPrice: number;
  sellPrice: number;
  currentStock: number;
  minStock: number;
  status: ItemStatus;
  notes: string;
  updatedAt: string;
}

export interface ItemInput {
  sku: string;
  name: string;
  category: string;
  unit: string;
  buyPrice: number;
  sellPrice: number;
  currentStock: number;
  minStock: number;
  status: ItemStatus;
  notes: string;
}

export interface StockTransaction {
  id: string;
  itemId: string;
  itemSku: string;
  itemName: string;
  itemUnit: string;
  type: StockTransactionType;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  date: string;
  counterparty: string; // supplier (in) or wholesale buyer/destination (out)
  notes: string;
  recordedBy: string;
  createdAt: string;
}

export interface StockTransactionInput {
  itemId: string;
  type: StockTransactionType;
  quantity: number;
  date: string;
  counterparty: string;
  notes: string;
}

export interface CashflowTransaction {
  id: string;
  type: CashflowType;
  category: string;
  amount: number;
  date: string;
  stockRefId?: string;
  stockRefLabel?: string;
  description: string;
  recordedBy: string;
  createdAt: string;
}

export interface CashflowInput {
  type: CashflowType;
  category: string;
  amount: number;
  date: string;
  stockRefId?: string;
  stockRefLabel?: string;
  description: string;
}

export interface DashboardSummary {
  totalItemTypes: number;
  activeItemTypes: number;
  totalStockUnits: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalIncome: number;
  totalExpense: number;
  cashBalance: number;
  inventoryBuyValue: number;
  inventorySellValue: number;
}

export interface CashflowSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  transactionCount: number;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}

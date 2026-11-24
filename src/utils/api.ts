import type {
  CashflowInput,
  CashflowTransaction,
  Item,
  ItemInput,
  StockTransaction,
  StockTransactionInput,
  UserAccount,
  UserRole,
} from '../types/inventory';

export class ApiError extends Error {
  status: number;
  fieldErrors?: Record<string, string>;

  constructor(message: string, status: number, fieldErrors?: Record<string, string>) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

let memoryAuthToken: string | null = null;

export function setMemoryAuthToken(token: string | null): void {
  memoryAuthToken = token;
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'X-Requested-With': 'XMLHttpRequest',
    ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    ...(memoryAuthToken ? { Authorization: `Bearer ${memoryAuthToken}` } : {}),
  };

  const res = await fetch(url, {
    ...init,
    credentials: 'include',
    headers: {
      ...headers,
      ...(init?.headers as Record<string, string> | undefined),
    },
  });

  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    errors?: Record<string, string>;
  } & T;

  if (!res.ok) {
    throw new ApiError(
      data.error || `Permintaan gagal (${res.status})`,
      res.status,
      data.errors,
    );
  }
  return data;
}

export const api = {
  login: async (email: string, password: string) => {
    const res = await requestJson<{ user: UserAccount; token?: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.token) {
      setMemoryAuthToken(res.token);
    }
    return res;
  },

  logout: async () => {
    try {
      return await requestJson<{ ok: boolean }>('/api/auth/logout', {
        method: 'POST',
      });
    } finally {
      setMemoryAuthToken(null);
    }
  },

  me: () => requestJson<{ user: UserAccount | null }>('/api/auth/me'),

  getItems: () => requestJson<{ items: Item[] }>('/api/items'),

  createItem: (input: ItemInput) =>
    requestJson<{ item: Item }>('/api/items', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  updateItem: (id: string, input: ItemInput) =>
    requestJson<{ item: Item }>(`/api/items/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  deleteItem: (id: string) =>
    requestJson<{ ok: boolean }>(`/api/items/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  getStockTransactions: () =>
    requestJson<{ transactions: StockTransaction[] }>('/api/stock-transactions'),

  createStockTransaction: (input: StockTransactionInput) =>
    requestJson<{ transaction: StockTransaction; item: Item }>('/api/stock-transactions', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  getCashflows: () => requestJson<{ cashflows: CashflowTransaction[] }>('/api/cashflows'),

  createCashflow: (input: CashflowInput) =>
    requestJson<{ cashflow: CashflowTransaction }>('/api/cashflows', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  updateCashflow: (id: string, input: CashflowInput) =>
    requestJson<{ cashflow: CashflowTransaction }>(`/api/cashflows/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  deleteCashflow: (id: string) =>
    requestJson<{ ok: boolean }>(`/api/cashflows/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  getUsers: () => requestJson<{ users: UserAccount[] }>('/api/users'),

  createUser: (payload: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    active: boolean;
  }) =>
    requestJson<{ user: UserAccount }>('/api/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateUser: (
    id: string,
    payload: {
      name: string;
      email: string;
      password?: string;
      role: UserRole;
      active: boolean;
    },
  ) =>
    requestJson<{ user: UserAccount }>(`/api/users/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  resetDemo: () =>
    requestJson<{
      items: Item[];
      stockTransactions: StockTransaction[];
      cashflows: CashflowTransaction[];
      users: UserAccount[];
    }>('/api/admin/reset-demo', {
      method: 'POST',
    }),
};

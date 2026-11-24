import { useCallback, useEffect, useState } from 'react';
import { ArrowLeftRight, Menu } from 'lucide-react';
import { CashflowView } from './components/CashflowView';
import { DashboardView } from './components/DashboardView';
import { ItemsView } from './components/ItemsView';
import { LoginView } from './components/LoginView';
import { ReportsView } from './components/ReportsView';
import { Sidebar } from './components/Sidebar';
import { StockTransactionsView } from './components/StockTransactionsView';
import { ToastContainer } from './components/ToastContainer';
import { UsersView } from './components/UsersView';
import type {
  AppSection,
  CashflowInput,
  CashflowTransaction,
  Item,
  ItemInput,
  StockTransaction,
  StockTransactionInput,
  StockTransactionType,
  ToastMessage,
  UserAccount,
  UserRole,
} from './types/inventory';
import { ApiError, api } from './utils/api';
import { isLowStock } from './utils/inventoryLogic';

const SECTION_META: Record<AppSection, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Dashboard Ringkasan',
    subtitle: 'Pantau ketersediaan stok grosir, peringatan stok minimum, dan arus kas operasional.',
  },
  items: {
    title: 'Manajemen Master Barang',
    subtitle: 'Daftar lengkap SKU grosir, harga beli/jual, stok berjalan, dan status produk.',
  },
  stock: {
    title: 'Transaksi Stok Masuk & Keluar',
    subtitle: 'Catat penerimaan barang dari supplier dan pengiriman pesanan grosir.',
  },
  cashflow: {
    title: 'Pencatatan Kas Operasional',
    subtitle: 'Kelola pemasukan penjualan grosir dan pengeluaran operasional toko.',
  },
  reports: {
    title: 'Laporan & Rekapitulasi',
    subtitle: 'Cetak laporan siap arsip atau ekspor ke format CSV (Excel) dan JSON.',
  },
  users: {
    title: 'Pengguna & Hak Akses',
    subtitle: 'Atur akun Admin dan Staff Operator yang mengakses sistem inventaris.',
  },
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);

  const [activeSection, setActiveSection] = useState<AppSection>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [items, setItems] = useState<Item[]>([]);
  const [stockTransactions, setStockTransactions] = useState<StockTransaction[]>([]);
  const [cashflows, setCashflows] = useState<CashflowTransaction[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);

  // Cross-view contextual shortcuts
  const [itemsInitialFilter, setItemsInitialFilter] = useState<
    'all' | 'active' | 'inactive' | 'low-stock'
  >('all');
  const [preselectedStockItemId, setPreselectedStockItemId] = useState<string | undefined>(
    undefined,
  );
  const [preselectedStockType, setPreselectedStockType] = useState<
    StockTransactionType | undefined
  >(undefined);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const pushToast = useCallback(
    (type: ToastMessage['type'], title: string, message?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, type, title, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4200);
    },
    [],
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const loadWorkspaceData = useCallback(
    async (user: UserAccount) => {
      setDataLoading(true);
      try {
        const [itemsRes, stockRes, cfRes] = await Promise.all([
          api.getItems(),
          api.getStockTransactions(),
          api.getCashflows(),
        ]);
        setItems(itemsRes.items);
        setStockTransactions(stockRes.transactions);
        setCashflows(cfRes.cashflows);

        if (user.role === 'admin') {
          const usersRes = await api.getUsers();
          setUsers(usersRes.users);
        } else {
          setUsers([]);
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          setCurrentUser(null);
        }
        const msg = err instanceof ApiError ? err.message : 'Gagal memuat data inventaris.';
        pushToast('error', 'Gagal Memuat Data', msg);
      } finally {
        setDataLoading(false);
      }
    },
    [pushToast],
  );

  useEffect(() => {
    let active = true;
    async function bootstrapSession() {
      try {
        const { user } = await api.me();
        if (!active) return;
        if (user) {
          setCurrentUser(user);
          await loadWorkspaceData(user);
        } else {
          const params = new URLSearchParams(window.location.search);
          if (params.get('autostart') === '1') {
            try {
              const loginRes = await api.login('admin@schew.id', 'admin123');
              if (!active) return;
              setCurrentUser(loginRes.user);
              await loadWorkspaceData(loginRes.user);
            } catch {
              // Stay on login screen if autostart login fails
            }
          }
        }
      } catch {
        // Ignore transient bootstrap error and show login
      } finally {
        if (active) setAuthChecking(false);
      }
    }
    bootstrapSession();
    return () => {
      active = false;
    };
  }, [loadWorkspaceData]);

  const handleLoginSuccess = async (user: UserAccount) => {
    setCurrentUser(user);
    setActiveSection('dashboard');
    await loadWorkspaceData(user);
    pushToast('success', `Selamat datang, ${user.name}`, `Masuk sebagai ${user.role === 'admin' ? 'Admin' : 'Staff / Operator'}.`);
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } finally {
      setCurrentUser(null);
      setItems([]);
      setStockTransactions([]);
      setCashflows([]);
      setUsers([]);
      setActiveSection('dashboard');
    }
  };

  const handleNavigate = (section: AppSection) => {
    if (section === 'users' && currentUser?.role !== 'admin') {
      pushToast('error', 'Akses Terbatas', 'Halaman Pengguna & Role hanya dapat diakses oleh Admin.');
      return;
    }
    if (section !== 'items') {
      setItemsInitialFilter('all');
    }
    if (section !== 'stock') {
      setPreselectedStockItemId(undefined);
      setPreselectedStockType(undefined);
    }
    setActiveSection(section);
  };

  // Master Items Handlers
  const handleCreateItem = async (input: ItemInput) => {
    try {
      const { item } = await api.createItem(input);
      setItems((prev) => [item, ...prev]);
      pushToast('success', 'Barang Ditambahkan', `${item.sku} — ${item.name} berhasil disimpan.`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal menambah barang.';
      pushToast('error', 'Gagal Menyimpan Barang', msg);
      throw err;
    }
  };

  const handleUpdateItem = async (id: string, input: ItemInput) => {
    try {
      const { item } = await api.updateItem(id, input);
      setItems((prev) => prev.map((it) => (it.id === id ? item : it)));
      pushToast('success', 'Barang Diperbarui', `Data ${item.sku} berhasil diperbarui.`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal memperbarui barang.';
      pushToast('error', 'Gagal Memperbarui', msg);
      throw err;
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await api.deleteItem(id);
      setItems((prev) => prev.filter((it) => it.id !== id));
      pushToast('success', 'Barang Dihapus', 'Data barang telah dihapus dari master.');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal menghapus barang.';
      pushToast('error', 'Gagal Menghapus', msg);
      throw err;
    }
  };

  // Stock Transaction Handler
  const handleCreateStockTransaction = async (input: StockTransactionInput) => {
    try {
      const { transaction, item } = await api.createStockTransaction(input);
      setItems((prev) => prev.map((it) => (it.id === item.id ? item : it)));
      setStockTransactions((prev) => [transaction, ...prev]);
      pushToast(
        'success',
        transaction.type === 'in' ? 'Stok Masuk Tercatat' : 'Stok Keluar Tercatat',
        `${transaction.itemSku}: ${transaction.type === 'in' ? '+' : '-'}${transaction.quantity} ${transaction.itemUnit} (Saldo: ${transaction.stockAfter}).`,
      );
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal mencatat mutasi stok.';
      pushToast('error', 'Mutasi Stok Gagal', msg);
      throw err;
    }
  };

  // Cashflow Handlers
  const handleCreateCashflow = async (input: CashflowInput) => {
    try {
      const { cashflow } = await api.createCashflow(input);
      setCashflows((prev) => [cashflow, ...prev]);
      pushToast(
        'success',
        cashflow.type === 'income' ? 'Pemasukan Tercatat' : 'Pengeluaran Tercatat',
        `${cashflow.category} berhasil disimpan ke buku kas.`,
      );
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal mencatat transaksi kas.';
      pushToast('error', 'Gagal Mencatat Kas', msg);
      throw err;
    }
  };

  const handleUpdateCashflow = async (id: string, input: CashflowInput) => {
    try {
      const { cashflow } = await api.updateCashflow(id, input);
      setCashflows((prev) => prev.map((cf) => (cf.id === id ? cashflow : cf)));
      pushToast('success', 'Transaksi Kas Diperbarui', `${cashflow.id} berhasil diperbarui.`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal memperbarui transaksi kas.';
      pushToast('error', 'Gagal Memperbarui Kas', msg);
      throw err;
    }
  };

  const handleDeleteCashflow = async (id: string) => {
    try {
      await api.deleteCashflow(id);
      setCashflows((prev) => prev.filter((cf) => cf.id !== id));
      pushToast('success', 'Catatan Kas Dihapus', 'Saldo kas telah dihitung ulang.');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal menghapus catatan kas.';
      pushToast('error', 'Gagal Menghapus Kas', msg);
      throw err;
    }
  };

  // Users Handlers
  const handleCreateUser = async (payload: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    active: boolean;
  }) => {
    try {
      const { user } = await api.createUser(payload);
      setUsers((prev) => [...prev, user]);
      pushToast('success', 'Pengguna Ditambahkan', `${user.name} (${user.role}) berhasil dibuat.`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal menambah pengguna.';
      pushToast('error', 'Gagal Menambah Pengguna', msg);
      throw err;
    }
  };

  const handleUpdateUser = async (
    id: string,
    payload: {
      name: string;
      email: string;
      password?: string;
      role: UserRole;
      active: boolean;
    },
  ) => {
    try {
      const { user } = await api.updateUser(id, payload);
      setUsers((prev) => prev.map((u) => (u.id === id ? user : u)));
      pushToast('success', 'Pengguna Diperbarui', `Data akun ${user.name} berhasil disimpan.`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal memperbarui pengguna.';
      pushToast('error', 'Gagal Memperbarui Pengguna', msg);
      throw err;
    }
  };

  const handleResetDemoData = async () => {
    try {
      const data = await api.resetDemo();
      setItems(data.items);
      setStockTransactions(data.stockTransactions);
      setCashflows(data.cashflows);
      setUsers(data.users);
      pushToast('success', 'Data Demo Direset', 'Seluruh data kembali ke kondisi awal SCHEW ID.');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal mereset data demo.';
      pushToast('error', 'Gagal Reset Data', msg);
    }
  };

  if (authChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        <div className="text-center">
          <p className="font-display text-base font-bold text-slate-900">SCHEW Inventory</p>
          <p className="mt-1 text-xs text-slate-500">Memuat sesi sistem...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <>
        <LoginView onLoginSuccess={handleLoginSuccess} />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  const lowStockCount = items.filter(isLowStock).length;
  const meta = SECTION_META[activeSection];

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <Sidebar
        currentUser={currentUser}
        activeSection={activeSection}
        lowStockCount={lowStockCount}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Header */}
        <header className="no-print sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Buka menu navigasi"
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <div className="hidden items-center gap-2 text-xs text-slate-500 sm:flex">
                <span className="truncate">SCHEW Inventory</span>
                <span aria-hidden="true">/</span>
                <span className="truncate font-medium text-slate-800">{meta.title}</span>
              </div>
              <h1 className="truncate font-display text-base font-bold tracking-tight text-slate-900 sm:text-xl">
                {meta.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden text-xs text-slate-500 md:inline">
              {currentUser.role === 'admin' ? 'Admin' : 'Staff'} · {currentUser.name}
            </span>
            {activeSection !== 'stock' && (
              <button
                type="button"
                onClick={() => handleNavigate('stock')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 whitespace-nowrap shrink-0 sm:px-3.5"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
                <span className="sm:hidden">Mutasi</span>
                <span className="hidden sm:inline">Catat Mutasi Stok</span>
              </button>
            )}
          </div>
        </header>

        {/* Main Workspace */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <p className="no-print mb-5 text-sm text-slate-600">{meta.subtitle}</p>

          {dataLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white"
                  />
                ))}
              </div>
              <div className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white" />
            </div>
          ) : (
            <>
              {activeSection === 'dashboard' && (
                <DashboardView
                  items={items}
                  stockTransactions={stockTransactions}
                  cashflows={cashflows}
                  onNavigate={handleNavigate}
                  onQuickRestock={(itemId) => {
                    setPreselectedStockItemId(itemId);
                    setPreselectedStockType('in');
                    setActiveSection('stock');
                  }}
                  onViewLowStockItems={() => {
                    setItemsInitialFilter('low-stock');
                    setActiveSection('items');
                  }}
                />
              )}

              {activeSection === 'items' && (
                <ItemsView
                  key={itemsInitialFilter}
                  items={items}
                  userRole={currentUser.role}
                  initialStatusFilter={itemsInitialFilter}
                  onCreateItem={handleCreateItem}
                  onUpdateItem={handleUpdateItem}
                  onDeleteItem={handleDeleteItem}
                />
              )}

              {activeSection === 'stock' && (
                <StockTransactionsView
                  items={items}
                  transactions={stockTransactions}
                  currentUserName={currentUser.name}
                  preselectedItemId={preselectedStockItemId}
                  preselectedType={preselectedStockType}
                  onCreateStockTransaction={handleCreateStockTransaction}
                />
              )}

              {activeSection === 'cashflow' && (
                <CashflowView
                  cashflows={cashflows}
                  stockTransactions={stockTransactions}
                  userRole={currentUser.role}
                  onCreateCashflow={handleCreateCashflow}
                  onUpdateCashflow={handleUpdateCashflow}
                  onDeleteCashflow={handleDeleteCashflow}
                />
              )}

              {activeSection === 'reports' && (
                <ReportsView
                  items={items}
                  stockTransactions={stockTransactions}
                  cashflows={cashflows}
                  onExportFeedback={(label) =>
                    pushToast('success', 'Ekspor Berhasil', `File ${label} telah diunduh.`)
                  }
                />
              )}

              {activeSection === 'users' && currentUser.role === 'admin' && (
                <UsersView
                  users={users}
                  currentUserId={currentUser.id}
                  onCreateUser={handleCreateUser}
                  onUpdateUser={handleUpdateUser}
                  onResetDemoData={handleResetDemoData}
                />
              )}
            </>
          )}
        </main>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

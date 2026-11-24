import {
  ArrowLeftRight,
  Box,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  PackageCheck,
  Shield,
  User as UserIcon,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import type { AppSection, UserAccount } from '../types/inventory';

interface SidebarProps {
  currentUser: UserAccount;
  activeSection: AppSection;
  lowStockCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onNavigate: (section: AppSection) => void;
  onLogout: () => void;
}

interface NavItemConfig {
  id: AppSection;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItemConfig[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'items', label: 'Master Barang', icon: Box },
  { id: 'stock', label: 'Transaksi Stok', icon: ArrowLeftRight },
  { id: 'cashflow', label: 'Kas Operasional', icon: Wallet },
  { id: 'reports', label: 'Laporan & Ekspor', icon: FileSpreadsheet },
  { id: 'users', label: 'Pengguna & Role', icon: Users, adminOnly: true },
];

export function Sidebar({
  currentUser,
  activeSection,
  lowStockCount,
  mobileOpen,
  onCloseMobile,
  onNavigate,
  onLogout,
}: SidebarProps) {
  const isAdmin = currentUser.role === 'admin';
  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  const navContent = (
    <div className="flex h-full flex-col justify-between bg-white">
      <div>
        {/* Brand Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
              <PackageCheck className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="font-display truncate text-sm font-bold tracking-tight text-slate-900">
                SCHEW Inventory
              </p>
              <p className="truncate text-[11px] text-slate-500">Grosir & Gudang Pusat</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Tutup menu navigasi"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav aria-label="Navigasi utama" className="space-y-1 p-3">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onNavigate(item.id);
                  onCloseMobile();
                }}
                aria-current={active ? 'page' : undefined}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${active ? 'text-white' : 'text-slate-500'}`}
                  />
                  <span>{item.label}</span>
                </span>
                {item.id === 'items' && lowStockCount > 0 && (
                  <span
                    className={`font-mono text-xs tabular-nums ${
                      active ? 'text-amber-300' : 'text-amber-700 font-semibold'
                    }`}
                    title={`${lowStockCount} barang stok menipis`}
                  >
                    {lowStockCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Account & Logout */}
      <div className="border-t border-slate-200 p-4">
        <div className="mb-3 flex items-start gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700">
            {isAdmin ? <Shield className="h-4 w-4 text-blue-700" /> : <UserIcon className="h-4 w-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{currentUser.name}</p>
            <p className="truncate text-xs text-slate-500">
              {isAdmin ? 'Admin' : 'Staff / Operator'} · {currentUser.email}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Keluar Akun</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="no-print hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block">
        <div className="sticky top-0 h-screen">{navContent}</div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="no-print fixed inset-0 z-40 flex lg:hidden">
          <div
            onClick={onCloseMobile}
            aria-hidden="true"
            className="fixed inset-0 bg-slate-900/40"
          />
          <aside className="relative z-50 w-72 max-w-[85vw] border-r border-slate-200 bg-white shadow-xl">
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}

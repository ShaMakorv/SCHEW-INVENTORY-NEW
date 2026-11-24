import { useState, type FormEvent } from 'react';
import {
  CheckCircle2,
  Edit3,
  PauseCircle,
  Plus,
  RotateCcw,
  Shield,
  UserCheck,
  X,
} from 'lucide-react';
import type { UserAccount, UserRole } from '../types/inventory';
import { formatDateId } from '../utils/inventoryLogic';
import { ConfirmModal } from './ConfirmModal';

interface UsersViewProps {
  users: UserAccount[];
  currentUserId: string;
  onCreateUser: (payload: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    active: boolean;
  }) => Promise<void>;
  onUpdateUser: (
    id: string,
    payload: {
      name: string;
      email: string;
      password?: string;
      role: UserRole;
      active: boolean;
    },
  ) => Promise<void>;
  onResetDemoData: () => Promise<void>;
}

export function UsersView({
  users,
  currentUserId,
  onCreateUser,
  onUpdateUser,
  onResetDemoData,
}: UsersViewProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('staff');
  const [active, setActive] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const openCreate = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('staff');
    setActive(true);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (user: UserAccount) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setPassword('');
    setRole(user.role);
    setActive(user.active);
    setErrors({});
    setModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = 'Nama lengkap wajib diisi.';
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = 'Format email tidak valid.';
    }
    if (!editingUser && password.length < 6) {
      nextErrors.password = 'Kata sandi minimal 6 karakter.';
    }
    if (editingUser && password && password.length < 6) {
      nextErrors.password = 'Kata sandi baru minimal 6 karakter.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    try {
      if (editingUser) {
        await onUpdateUser(editingUser.id, {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password: password || undefined,
          role,
          active,
        });
      } else {
        await onCreateUser({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
          active,
        });
      }
      setModalOpen(false);
    } catch (err) {
      if (err && typeof err === 'object' && 'fieldErrors' in err && err.fieldErrors) {
        setErrors(err.fieldErrors as Record<string, string>);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmReset = async () => {
    setResetting(true);
    try {
      await onResetDemoData();
      setResetModalOpen(false);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Manajemen Pengguna & Hak Akses</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Kelola akun Admin dan Staff Operator gudang grosir SCHEW ID.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setResetModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Data Demo Awal</span>
          </button>

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Pengguna</span>
          </button>
        </div>
      </div>

      {/* Role Permissions Matrix */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Shield className="h-4 w-4 text-blue-700" />
            <span>Peran Admin (Akses Penuh)</span>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
            Mengelola master barang (tambah, edit, nonaktifkan, hapus), mencatat mutasi stok & kas,
            mengedit/menghapus catatan kas, mengelola akun pengguna & role, serta mencetak dan
            mengekspor seluruh laporan.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <UserCheck className="h-4 w-4 text-emerald-700" />
            <span>Peran Staff / Operator (Operasional Harian)</span>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
            Melihat dashboard & daftar stok barang, mencatat transaksi stok masuk & stok keluar,
            mencatat transaksi pemasukan & pengeluaran operasional, serta melihat/mengekspor laporan.
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                <th className="px-4 py-3">Nama Lengkap</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Peran (Role)</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Terdaftar</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => {
                const isSelf = user.id === currentUserId;
                return (
                  <tr key={user.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {user.name}{' '}
                      {isSelf && (
                        <span className="text-xs font-normal text-blue-700">(Akun Anda)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{user.email}</td>
                    <td className="px-4 py-3 text-xs font-semibold">
                      {user.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1.5 text-blue-700">
                          <Shield className="h-3.5 w-3.5" />
                          <span>Admin</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-slate-700">
                          <UserCheck className="h-3.5 w-3.5" />
                          <span>Staff / Operator</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium">
                      {user.active ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Aktif</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-slate-500">
                          <PauseCircle className="h-3.5 w-3.5" />
                          <span>Nonaktif</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {formatDateId(user.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(user)}
                        aria-label={`Edit pengguna ${user.name}`}
                        className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-blue-700"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        <span>Kelola</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit User Modal */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h3 id="user-modal-title" className="text-base font-bold text-slate-900">
                {editingUser ? 'Edit Pengguna & Role' : 'Tambah Pengguna Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Tutup modal pengguna"
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
              <div>
                <label htmlFor="user-name" className="block text-xs font-semibold text-slate-700">
                  Nama Lengkap <span className="text-red-600">*</span>
                </label>
                <input
                  id="user-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Dimas Putra (Staff)"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
              </div>

              <div>
                <label htmlFor="user-email" className="block text-xs font-semibold text-slate-700">
                  Email <span className="text-red-600">*</span>
                </label>
                <input
                  id="user-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@schew.id"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
              </div>

              <div>
                <label
                  htmlFor="user-password"
                  className="block text-xs font-semibold text-slate-700"
                >
                  {editingUser ? 'Kata Sandi Baru (Kosongkan jika tidak diubah)' : 'Kata Sandi'}{' '}
                  {!editingUser && <span className="text-red-600">*</span>}
                </label>
                <input
                  id="user-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="user-role" className="block text-xs font-semibold text-slate-700">
                    Peran (Role)
                  </label>
                  <select
                    id="user-role"
                    value={role}
                    disabled={editingUser?.id === currentUserId}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
                  >
                    <option value="admin">Admin</option>
                    <option value="staff">Staff / Operator</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="user-status"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Status Akun
                  </label>
                  <select
                    id="user-status"
                    value={active ? 'active' : 'inactive'}
                    disabled={editingUser?.id === currentUserId}
                    onChange={(e) => setActive(e.target.value === 'active')}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Nonaktif</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Pengguna'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={resetModalOpen}
        title="Reset ke Data Demo Awal?"
        description="Seluruh perubahan barang, mutasi stok, transaksi kas, dan pengguna tambahan akan dikembalikan ke dataset awal SCHEW ID. Lanjutkan?"
        confirmLabel="Ya, Reset Data Demo"
        destructive
        busy={resetting}
        onConfirm={handleConfirmReset}
        onCancel={() => setResetModalOpen(false)}
      />
    </div>
  );
}

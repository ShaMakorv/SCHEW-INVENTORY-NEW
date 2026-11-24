import { useState, type FormEvent } from 'react';
import { AlertCircle, ArrowRight, Eye, EyeOff, KeyRound, Lock, Mail, PackageCheck, ShieldCheck, UserCheck } from 'lucide-react';
import type { UserAccount } from '../types/inventory';
import { ApiError, api } from '../utils/api';

interface LoginViewProps {
  onLoginSuccess: (user: UserAccount) => void;
}

export function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const handleQuickFill = (role: 'admin' | 'staff') => {
    setError('');
    if (role === 'admin') {
      setEmail('admin@schew.id');
      setPassword('admin123');
    } else {
      setEmail('staff@schew.id');
      setPassword('staff123');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setError('Email dan kata sandi wajib diisi sebelum masuk.');
      return;
    }

    setSubmitting(true);
    try {
      const { user } = await api.login(cleanEmail, password);
      onLoginSuccess(user);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Gagal terhubung ke server autentikasi. Silakan coba lagi.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="grid min-h-screen grid-cols-1 items-stretch lg:grid-cols-12">
        {/* Left Visual Showcase Panel */}
        <div className="relative hidden flex-col justify-between overflow-hidden border-r border-slate-200 bg-slate-900 p-10 text-white lg:col-span-5 lg:flex">
          {!imgFailed ? (
            <img
              src="/src/assets/images/schew_wholesale_studio_1795455710424.jpg"
              alt="Gudang stok grosir pakaian SCHEW ID dengan rak tertata rapi"
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="absolute inset-0 h-full w-full object-cover opacity-55"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/55 to-slate-950/75" />

          <div className="relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-950">
                <PackageCheck className="h-5 w-5" />
              </div>
              <span className="font-display text-lg font-bold tracking-tight text-white">
                SCHEW Inventory
              </span>
            </div>
            <p className="mt-3 text-xs font-medium tracking-wide text-slate-300">
              SCHEW / SCHEW ID · Operasional Gudang & Grosir
            </p>
          </div>

          <div className="relative z-10 space-y-6">
            <div>
              <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-white [text-wrap:balance]">
                Kendali Stok Grosir dan Arus Kas dalam Satu Sistem Terpadu
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-slate-200">
                Menggantikan pencatatan Excel manual menjadi pencatatan mutasi stok masuk/keluar,
                pemantauan batas stok minimum, kas operasional, serta laporan siap cetak.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 border-t border-white/15 pt-5 text-xs text-slate-200">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" />
                <div>
                  <span className="font-semibold text-white">Peran Admin</span>
                  <span className="text-slate-300">
                    {' '}
                    — Akses penuh master barang, mutasi stok, kas, pengguna & role, dan laporan.
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                <div>
                  <span className="font-semibold text-white">Peran Staff / Operator</span>
                  <span className="text-slate-300">
                    {' '}
                    — Operasional harian cek stok, catat barang masuk/keluar, dan catat transaksi kas.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Login Form Panel */}
        <div className="flex flex-col justify-center px-6 py-10 sm:px-12 lg:col-span-7 lg:px-16">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 flex items-center gap-2.5 lg:hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
                <PackageCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="font-display text-base font-bold text-slate-900">SCHEW Inventory</p>
                <p className="text-xs text-slate-500">Sistem Manajemen Stok Toko Grosir</p>
              </div>
            </div>

            <div className="mb-7">
              <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900">
                Masuk ke Sistem Inventaris
              </h2>
              <p className="mt-1.5 text-sm text-slate-600">
                Gunakan akun terdaftar atau pilih opsi quick-fill demo di bawah untuk menguji hak
                akses Admin dan Staff.
              </p>
            </div>

            {/* Quick-Fill Demo Account Controls */}
            <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <KeyRound className="h-3.5 w-3.5 text-blue-700" />
                  Quick-Fill Akun Demo Pengujian
                </span>
                <span className="text-xs text-slate-400">1-klik isi form</span>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => handleQuickFill('admin')}
                  aria-label="Isi Akun Demo Admin"
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-left transition-colors hover:border-blue-300 hover:bg-blue-50/60 focus-visible:outline-2 focus-visible:outline-blue-700"
                >
                  <div>
                    <p className="text-xs font-semibold text-slate-900">Isi Akun Demo Admin</p>
                    <p className="font-mono text-[11px] text-slate-500">admin@schew.id</p>
                  </div>
                  <ShieldCheck className="h-4 w-4 shrink-0 text-blue-700" />
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickFill('staff')}
                  aria-label="Isi Akun Demo Staff"
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50/60 focus-visible:outline-2 focus-visible:outline-blue-700"
                >
                  <div>
                    <p className="text-xs font-semibold text-slate-900">Isi Akun Demo Staff</p>
                    <p className="font-mono text-[11px] text-slate-500">staff@schew.id</p>
                  </div>
                  <UserCheck className="h-4 w-4 shrink-0 text-emerald-700" />
                </button>
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} noValidate className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label htmlFor="login-email" className="block text-sm font-medium text-slate-700">
                  Alamat Email
                </label>
                <div className="relative mt-1.5">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@schew.id"
                    className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/15"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="block text-sm font-medium text-slate-700">
                  Kata Sandi
                </label>
                <div className="relative mt-1.5">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi"
                    className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/15"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-60"
              >
                <span>{submitting ? 'Memverifikasi...' : 'Masuk ke Dashboard'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <p className="mt-5 text-center text-xs text-slate-500">
              SCHEW Inventory · Sistem Informasi Manajemen Stok Toko Grosir Berbasis Web
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

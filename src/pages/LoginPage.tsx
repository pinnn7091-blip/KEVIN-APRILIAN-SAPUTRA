import React, {useEffect, useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {AlertCircle, ArrowLeft, CheckCircle2, Database, Eye, EyeOff, Loader2, Lock, Mail, UserPlus} from 'lucide-react';
import DatabaseRelationModal from '../components/DatabaseRelationModal';
import {useAuth} from '../context/AuthContext';

const LOGIN_BACKDROP_IMG = '/src/assets/images/login_campus_backdrop_1795061375024.jpg';

export default function LoginPage() {
  const navigate = useNavigate();
  const {session, profile, config, loading: authLoading, syncError, signIn} = useAuth();

  const [mode, setMode] = useState<'login' | 'first-admin'>('login');
  const [hasUsers, setHasUsers] = useState<boolean>(true);
  const [checkingBootstrap, setCheckingBootstrap] = useState<boolean>(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [nip, setNip] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);
  const [dbModalOpen, setDbModalOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && session && profile) {
      navigate('/app', {replace: true});
    }
  }, [authLoading, session, profile, navigate]);

  useEffect(() => {
    let active = true;
    async function checkBootstrap() {
      try {
        const res = await fetch('/api/auth/bootstrap-status');
        if (res.ok && active) {
          const data = await res.json();
          setHasUsers(Boolean(data.hasUsers));
          if (data.configured && data.hasServiceRole && data.hasUsers === false) {
            setMode('first-admin');
          }
        }
      } catch {
        // Default to standard login
      } finally {
        if (active) setCheckingBootstrap(false);
      }
    }
    checkBootstrap();
    return () => {
      active = false;
    };
  }, []);

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim() || !password) {
      setErrorMsg('Email dan kata sandi wajib diisi.');
      return;
    }

    setSubmitting(true);
    const {error} = await signIn(email, password);
    setSubmitting(false);

    if (error) {
      setErrorMsg(
        error === 'Invalid login credentials'
          ? 'Email atau kata sandi tidak sesuai.'
          : error,
      );
      return;
    }

    navigate('/app', {replace: true});
  }

  async function handleFirstAdminSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!fullName.trim() || !email.trim() || !password) {
      setErrorMsg('Nama lengkap, email, dan kata sandi wajib diisi.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Kata sandi minimal 6 karakter.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/register-first-admin', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          password,
          nip: nip.trim() || null,
        }),
      });
      const payload = await res.json();

      if (!res.ok) {
        setErrorMsg(payload.error || 'Gagal mendaftarkan Administrator pertama.');
        setSubmitting(false);
        return;
      }

      // Immediately sign in after creating first admin
      const {error: loginErr} = await signIn(email, password);
      setSubmitting(false);
      if (loginErr) {
        setSuccessMsg('Akun Administrator berhasil dibuat. Silakan login.');
        setMode('login');
        setHasUsers(true);
        return;
      }

      navigate('/app', {replace: true});
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal menghubungi server.');
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white grid grid-cols-1 lg:grid-cols-12">
      {/* Left Visual Column */}
      <div className="hidden lg:block lg:col-span-5 relative bg-neutral-950 overflow-hidden">
        {!imgFailed ? (
          <img
            src={LOGIN_BACKDROP_IMG}
            alt="Atrium Perpustakaan SMK Prima Unggul"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover opacity-85"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-red-900 via-neutral-900 to-neutral-950" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/20" />
        <div className="absolute inset-x-0 bottom-0 p-10 text-white">
          <div className="inline-flex items-center gap-2.5 mb-4">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-red-700 text-white text-xs font-bold">
              PU
            </span>
            <span className="text-base font-bold tracking-tight">SMK Prima Unggul</span>
          </div>
          <h2 className="text-2xl font-extrabold leading-snug mb-2">
            Sistem Absensi Siswa &amp; Karyawan Terpadu
          </h2>
          <p className="text-sm text-neutral-300 leading-relaxed max-w-md">
            Masuk menggunakan akun resmi sekolah untuk melakukan presensi harian, pencatatan kehadiran siswa, serta rekapitulasi data.
          </p>
        </div>
      </div>

      {/* Right Authentication Form Column */}
      <div className="lg:col-span-7 flex flex-col justify-between p-6 sm:p-10 lg:p-16">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-red-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Beranda</span>
          </Link>

          <button
            type="button"
            onClick={() => setDbModalOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-red-700 transition-colors cursor-pointer"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Skema &amp; Relasi Database</span>
          </button>
        </div>

        <div className="w-full max-w-md mx-auto my-10">
          <div className="mb-8">
            <p className="text-xs font-semibold text-red-700 mb-2">Otentikasi Terintegrasi Supabase</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900">
              {mode === 'first-admin' ? 'Aktivasi Administrator Pertama' : 'Masuk ke Portal Absensi'}
            </h1>
            <p className="text-sm text-neutral-600 mt-2">
              {mode === 'first-admin'
                ? 'Belum ada akun terdaftar di Supabase Authentication. Pengguna pertama otomatis memperoleh hak akses Administrator.'
                : 'Gunakan email dan kata sandi akun SMK Prima Unggul Anda.'}
            </p>
          </div>

          {/* Configuration Warning if Supabase env vars missing */}
          {config && !config.configured && (
            <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 text-red-900 text-sm">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Konfigurasi Supabase Belum Lengkap</p>
                  <p className="text-xs text-red-800 mt-1 leading-relaxed">
                    Variabel lingkungan berikut perlu diatur pada Secrets / file <code className="font-mono">.env</code> sebelum login dapat digunakan:{' '}
                    <span className="font-mono font-semibold">{config.missingVars.join(', ')}</span>.
                    Setelah itu jalankan skema <code className="font-mono">supabase/schema.sql</code> di SQL Editor Supabase Anda.
                  </p>
                  <button
                    type="button"
                    onClick={() => setDbModalOpen(true)}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-red-700 hover:underline cursor-pointer"
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>Buka Skema SQL &amp; Peta Relasi Supabase</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {syncError && (
            <div className="mb-6 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs leading-relaxed flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>{syncError}</span>
            </div>
          )}

          {errorMsg && (
            <div className="mb-6 p-3.5 rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-3.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {!checkingBootstrap && !hasUsers && config?.configured && config?.hasServiceRole && (
            <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-lg mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('first-admin');
                  setErrorMsg(null);
                }}
                className={`flex-1 py-2 px-3 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  mode === 'first-admin'
                    ? 'bg-red-700 text-white'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Daftar Admin Pertama
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                }}
                className={`flex-1 py-2 px-3 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  mode === 'login'
                    ? 'bg-red-700 text-white'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Sudah Punya Akun
              </button>
            </div>
          )}

          {mode === 'first-admin' ? (
            <form onSubmit={handleFirstAdminSubmit} className="space-y-4">
              <div>
                <label htmlFor="admin-name" className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  Nama Lengkap
                </label>
                <input
                  id="admin-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Contoh: Budi Santoso, S.Kom"
                  className="w-full px-3.5 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-700"
                  required
                />
              </div>

              <div>
                <label htmlFor="admin-nip" className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  NIP / NUPTK (Opsional)
                </label>
                <input
                  id="admin-nip"
                  type="text"
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                  placeholder="198501012010011001"
                  className="w-full px-3.5 py-2.5 text-sm font-mono border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-700"
                />
              </div>

              <div>
                <label htmlFor="admin-email" className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  Email Administrator
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="admin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@smkprimaunggul.sch.id"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-700"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="admin-password" className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  Kata Sandi (Min. 6 Karakter)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-700"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !config?.configured}
                className="w-full mt-2 py-2.5 px-4 bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                <span>{submitting ? 'Membuat Akun...' : 'Buat Akun Administrator & Masuk'}</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label htmlFor="login-email" className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  Alamat Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@smkprimaunggul.sch.id"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-700"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  Kata Sandi
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-700"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !config?.configured}
                className="w-full mt-2 py-2.5 px-4 bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{submitting ? 'Memverifikasi...' : 'Masuk ke Aplikasi'}</span>
              </button>
            </form>
          )}
        </div>

        <p className="text-xs text-neutral-400 text-center">
          SMK Prima Unggul · Sistem Informasi Absensi Siswa &amp; Karyawan
        </p>
      </div>

      <DatabaseRelationModal open={dbModalOpen} onClose={() => setDbModalOpen(false)} />
    </div>
  );
}

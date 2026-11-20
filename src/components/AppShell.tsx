import React, {useState} from 'react';
import {Link, NavLink, useLocation, useNavigate} from 'react-router-dom';
import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Database,
  LayoutDashboard,
  LogOut,
  Menu,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import {useAuth} from '../context/AuthContext';
import {ROLE_LABELS} from '../types/app';

interface AppShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function AppShell({title, subtitle, children}: AppShellProps) {
  const {profile, signOut} = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [rekapOpen, setRekapOpen] = useState(
    location.pathname.startsWith('/app/rekap'),
  );
  const [loggingOut, setLoggingOut] = useState(false);

  const role = profile?.role ?? 'tenaga_kependidikan';

  async function handleLogout() {
    setLoggingOut(true);
    await signOut();
    navigate('/login', {replace: true});
  }

  const navLinkClass = ({isActive}: {isActive: boolean}) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
      isActive
        ? 'bg-red-700 text-white'
        : 'text-neutral-700 hover:bg-red-50 hover:text-red-800'
    }`;

  const subLinkClass = ({isActive}: {isActive: boolean}) =>
    `flex items-center gap-2.5 pl-10 pr-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
      isActive
        ? 'bg-red-50 text-red-800'
        : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
    }`;

  const renderSidebarNav = (onNavigate?: () => void) => (
    <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
      <NavLink to="/app" end className={navLinkClass} onClick={onNavigate}>
        <LayoutDashboard className="w-4 h-4 shrink-0" />
        <span>Dashboard</span>
      </NavLink>

      {/* Semua role adalah karyawan -> menu Absensi Karyawan tersedia untuk Admin, Guru, dan Tenaga Kependidikan */}
      <NavLink
        to="/app/absensi-karyawan"
        className={navLinkClass}
        onClick={onNavigate}
      >
        <UserCheck className="w-4 h-4 shrink-0" />
        <span>Absensi Karyawan</span>
      </NavLink>

      {/* Admin & Guru: Absensi Siswa */}
      {(role === 'admin' || role === 'guru') && (
        <NavLink
          to="/app/absensi-siswa"
          className={navLinkClass}
          onClick={onNavigate}
        >
          <ClipboardCheck className="w-4 h-4 shrink-0" />
          <span>Absensi Siswa</span>
        </NavLink>
      )}

      {/* Admin & Guru: Rekap Absensi (Submenu berbeda per role) */}
      {(role === 'admin' || role === 'guru') && (
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setRekapOpen((prev) => !prev)}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
              location.pathname.startsWith('/app/rekap')
                ? 'text-red-800 bg-red-50/70'
                : 'text-neutral-700 hover:bg-red-50 hover:text-red-800'
            }`}
          >
            <span className="flex items-center gap-3">
              <BarChart3 className="w-4 h-4 shrink-0" />
              <span>Rekap Absensi</span>
            </span>
            {rekapOpen ? (
              <ChevronDown className="w-4 h-4 shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 shrink-0" />
            )}
          </button>

          {rekapOpen && (
            <div className="mt-1 space-y-1">
              {role === 'admin' && (
                <NavLink
                  to="/app/rekap/karyawan"
                  className={subLinkClass}
                  onClick={onNavigate}
                >
                  <span>Absensi Karyawan</span>
                </NavLink>
              )}
              <NavLink
                to="/app/rekap/siswa"
                className={subLinkClass}
                onClick={onNavigate}
              >
                <span>Absensi Siswa</span>
              </NavLink>
            </div>
          )}
        </div>
      )}

      {/* Admin Only: Data Siswa & User Management */}
      {role === 'admin' && (
        <>
          <NavLink
            to="/app/data-siswa"
            className={navLinkClass}
            onClick={onNavigate}
          >
            <Database className="w-4 h-4 shrink-0" />
            <span>Data Siswa</span>
          </NavLink>

          <NavLink
            to="/app/user-management"
            className={navLinkClass}
            onClick={onNavigate}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>User Management</span>
          </NavLink>
        </>
      )}
    </nav>
  );

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-neutral-200 z-20">
        <div className="h-16 px-5 border-b border-neutral-200 flex items-center">
          <Link to="/" className="flex items-center gap-2.5 whitespace-nowrap">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-red-700 text-white text-xs font-bold">
              PU
            </span>
            <span className="text-base font-extrabold tracking-tight text-neutral-900">
              SMK Prima Unggul
            </span>
          </Link>
        </div>

        {renderSidebarNav()}

        <div className="p-4 border-t border-neutral-200 bg-neutral-50/70">
          <p className="text-xs font-bold text-neutral-900 truncate">
            {profile?.full_name || 'Pengguna'}
          </p>
          <p className="text-xs text-red-700 font-semibold mt-0.5">
            {ROLE_LABELS[role]}
          </p>
          {profile?.nip && (
            <p className="text-[11px] font-mono text-neutral-500 mt-0.5 tabular-nums">
              NIP: {profile.nip}
            </p>
          )}
        </div>
      </aside>

      {/* Mobile Drawer Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] bg-white h-full flex flex-col border-r border-neutral-200 z-50">
            <div className="h-16 px-5 border-b border-neutral-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-red-700 text-white text-xs font-bold">
                  PU
                </span>
                <span className="text-base font-extrabold tracking-tight text-neutral-900">
                  SMK Prima Unggul
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Tutup menu"
                className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderSidebarNav(() => setMobileMenuOpen(false))}
            <div className="p-4 border-t border-neutral-200 bg-neutral-50">
              <p className="text-xs font-bold text-neutral-900 truncate">
                {profile?.full_name}
              </p>
              <p className="text-xs text-red-700 font-semibold mt-0.5">
                {ROLE_LABELS[role]}
              </p>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Wrapper */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Bar with Logout button on Top Right */}
        <header className="sticky top-0 z-10 h-16 bg-white border-b border-neutral-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Buka menu navigasi"
              className="lg:hidden p-2 rounded-lg text-neutral-600 hover:bg-neutral-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-neutral-900 truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs text-neutral-500 truncate hidden sm:block">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-bold text-neutral-900 whitespace-nowrap">
                {profile?.full_name || 'Pengguna'}
              </p>
              <p className="text-[11px] text-neutral-500 whitespace-nowrap">
                {ROLE_LABELS[role]}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-700 hover:text-white border border-red-200 hover:border-red-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{loggingOut ? 'Keluar...' : 'Logout'}</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

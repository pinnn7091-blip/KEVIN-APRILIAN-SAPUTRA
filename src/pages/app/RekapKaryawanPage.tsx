import {useCallback, useEffect, useMemo, useState} from 'react';
import {AlertCircle, Download, Search} from 'lucide-react';
import AppShell from '../../components/AppShell';
import {useAuth} from '../../context/AuthContext';
import {
  downloadCSV,
  formatShortDate,
  formatTimeOnly,
  getMonthStartISO,
  getTodayDateISO,
} from '../../lib/date';
import {ROLE_LABELS, type EmployeeAttendance, type UserRole} from '../../types/app';

export default function RekapKaryawanPage() {
  const {supabase} = useAuth();
  const [startDate, setStartDate] = useState(getMonthStartISO());
  const [endDate, setEndDate] = useState(getTodayDateISO());
  const [roleFilter, setRoleFilter] = useState<'Semua' | UserRole>('Semua');
  const [search, setSearch] = useState('');
  const [records, setRecords] = useState<EmployeeAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadRecords = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setErrorMsg(null);

    const {data, error} = await supabase
      .from('employee_attendance')
      .select('*, profiles(full_name, email, nip, role, jabatan)')
      .gte('tanggal', startDate)
      .lte('tanggal', endDate)
      .order('tanggal', {ascending: false});

    if (error) {
      setErrorMsg(error.message);
      setRecords([]);
    } else {
      setRecords((data ?? []) as EmployeeAttendance[]);
    }
    setLoading(false);
  }, [supabase, startDate, endDate]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      const p = r.profiles;
      const matchesRole = roleFilter === 'Semua' || p?.role === roleFilter;
      const matchesQuery =
        !q ||
        (p?.full_name ?? '').toLowerCase().includes(q) ||
        (p?.email ?? '').toLowerCase().includes(q) ||
        (p?.nip ?? '').toLowerCase().includes(q);
      return matchesRole && matchesQuery;
    });
  }, [records, roleFilter, search]);

  const summary = useMemo(() => {
    return {
      hadir: filtered.filter((r) => r.status === 'Hadir').length,
      terlambat: filtered.filter((r) => r.status === 'Terlambat').length,
      izin: filtered.filter((r) => r.status === 'Izin').length,
      sakit: filtered.filter((r) => r.status === 'Sakit').length,
      alpa: filtered.filter((r) => r.status === 'Alpa').length,
    };
  }, [filtered]);

  function handleExport() {
    downloadCSV(
      `rekap-absensi-karyawan-${startDate}-sd-${endDate}.csv`,
      ['Tanggal', 'Nama', 'NIP', 'Role', 'Jam Masuk', 'Jam Keluar', 'Status', 'Keterangan'],
      filtered.map((r) => [
        r.tanggal,
        r.profiles?.full_name ?? '-',
        r.profiles?.nip ?? '-',
        r.profiles?.role ? ROLE_LABELS[r.profiles.role] : '-',
        formatTimeOnly(r.jam_masuk),
        formatTimeOnly(r.jam_keluar),
        r.status,
        r.keterangan ?? '',
      ]),
    );
  }

  return (
    <AppShell
      title="Rekap Absensi Karyawan"
      subtitle="Laporan kehadiran Admin, Guru, dan Tenaga Kependidikan"
    >
      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        <div className="bg-white border border-neutral-200 rounded-xl p-4">
          <p className="text-xs text-neutral-500 font-medium">Hadir</p>
          <p className="text-2xl font-extrabold text-emerald-700 mt-1 tabular-nums">{summary.hadir}</p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-4">
          <p className="text-xs text-neutral-500 font-medium">Terlambat</p>
          <p className="text-2xl font-extrabold text-amber-700 mt-1 tabular-nums">{summary.terlambat}</p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-4">
          <p className="text-xs text-neutral-500 font-medium">Izin</p>
          <p className="text-2xl font-extrabold text-neutral-900 mt-1 tabular-nums">{summary.izin}</p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-4">
          <p className="text-xs text-neutral-500 font-medium">Sakit</p>
          <p className="text-2xl font-extrabold text-neutral-900 mt-1 tabular-nums">{summary.sakit}</p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-4 col-span-2 sm:col-span-1">
          <p className="text-xs text-neutral-500 font-medium">Alpa</p>
          <p className="text-2xl font-extrabold text-red-700 mt-1 tabular-nums">{summary.alpa}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div>
            <label htmlFor="rk-start" className="block text-xs font-semibold text-neutral-700 mb-1.5">
              Dari Tanggal
            </label>
            <input
              id="rk-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-red-700"
            />
          </div>

          <div>
            <label htmlFor="rk-end" className="block text-xs font-semibold text-neutral-700 mb-1.5">
              Sampai Tanggal
            </label>
            <input
              id="rk-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-red-700"
            />
          </div>

          <div>
            <label htmlFor="rk-role" className="block text-xs font-semibold text-neutral-700 mb-1.5">
              Filter Role
            </label>
            <select
              id="rk-role"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as 'Semua' | UserRole)}
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white focus:outline-none focus:border-red-700"
            >
              <option value="Semua">Semua Role</option>
              <option value="admin">Administrator</option>
              <option value="guru">Guru</option>
              <option value="tenaga_kependidikan">Tenaga Kependidikan</option>
            </select>
          </div>

          <div>
            <label htmlFor="rk-search" className="block text-xs font-semibold text-neutral-700 mb-1.5">
              Cari Karyawan
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="rk-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nama atau NIP..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-red-700"
              />
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={handleExport}
              disabled={filtered.length === 0}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-neutral-900">Data Kehadiran Karyawan</h2>
          <span className="text-xs text-neutral-500 tabular-nums">{filtered.length} baris</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold text-neutral-500">
                <th className="py-3 px-6">Tanggal</th>
                <th className="py-3 px-4">Nama Karyawan</th>
                <th className="py-3 px-4">NIP / Role</th>
                <th className="py-3 px-4">Jam Masuk</th>
                <th className="py-3 px-4">Jam Keluar</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-6">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-neutral-400">
                    Memuat rekap karyawan...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-neutral-500">
                    Tidak ada catatan absensi karyawan pada rentang tanggal ini.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-neutral-50/70">
                    <td className="py-3 px-6 font-medium text-neutral-900 tabular-nums whitespace-nowrap">
                      {formatShortDate(row.tanggal)}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-neutral-900">{row.profiles?.full_name || '—'}</p>
                      <p className="text-xs text-neutral-500">{row.profiles?.email}</p>
                    </td>
                    <td className="py-3 px-4 text-xs text-neutral-600">
                      <p className="font-semibold">
                        {row.profiles?.role ? ROLE_LABELS[row.profiles.role] : '—'}
                      </p>
                      {row.profiles?.nip && (
                        <p className="font-mono text-neutral-500 tabular-nums">{row.profiles.nip}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-neutral-700 tabular-nums">
                      {formatTimeOnly(row.jam_masuk)}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-neutral-700 tabular-nums">
                      {formatTimeOnly(row.jam_keluar)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs font-semibold ${
                          row.status === 'Hadir'
                            ? 'text-emerald-700'
                            : row.status === 'Terlambat'
                              ? 'text-amber-700'
                              : 'text-red-700'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-xs text-neutral-500">
                      {row.keterangan || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}

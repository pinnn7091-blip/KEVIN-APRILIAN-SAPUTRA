import {useCallback, useEffect, useMemo, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import {AlertCircle, Download, Search} from 'lucide-react';
import AppShell from '../../components/AppShell';
import {useAuth} from '../../context/AuthContext';
import {
  downloadCSV,
  formatShortDate,
  getMonthStartISO,
  getTodayDateISO,
} from '../../lib/date';
import type {StudentAttendance} from '../../types/app';

export default function RekapSiswaPage() {
  const {kelas: kelasParam} = useParams<{kelas?: string}>();
  const navigate = useNavigate();
  const {supabase} = useAuth();

  const [startDate, setStartDate] = useState(getMonthStartISO());
  const [endDate, setEndDate] = useState(getTodayDateISO());
  const [selectedKelas, setSelectedKelas] = useState<string>(
    kelasParam ? decodeURIComponent(kelasParam) : 'Semua',
  );
  const [search, setSearch] = useState('');
  const [records, setRecords] = useState<StudentAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (kelasParam) {
      setSelectedKelas(decodeURIComponent(kelasParam));
    }
  }, [kelasParam]);

  const loadRecords = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setErrorMsg(null);

    const {data, error} = await supabase
      .from('student_attendance')
      .select(
        '*, students(nis, nama, kelas, jurusan), recorder:profiles!student_attendance_recorded_by_fkey(full_name, role)',
      )
      .gte('tanggal', startDate)
      .lte('tanggal', endDate)
      .order('tanggal', {ascending: false});

    if (error) {
      setErrorMsg(error.message);
      setRecords([]);
    } else {
      setRecords((data ?? []) as StudentAttendance[]);
    }
    setLoading(false);
  }, [supabase, startDate, endDate]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const classList = useMemo(() => {
    const set = new Set<string>();
    for (const r of records) {
      if (r.students?.kelas) set.add(r.students.kelas);
    }
    return ['Semua', ...Array.from(set).sort()];
  }, [records]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      const s = r.students;
      const matchesClass = selectedKelas === 'Semua' || s?.kelas === selectedKelas;
      const matchesQuery =
        !q ||
        (s?.nama ?? '').toLowerCase().includes(q) ||
        (s?.nis ?? '').toLowerCase().includes(q) ||
        (s?.kelas ?? '').toLowerCase().includes(q);
      return matchesClass && matchesQuery;
    });
  }, [records, selectedKelas, search]);

  const summary = useMemo(() => {
    return {
      hadir: filtered.filter((r) => r.status === 'Hadir').length,
      izin: filtered.filter((r) => r.status === 'Izin').length,
      sakit: filtered.filter((r) => r.status === 'Sakit').length,
      alpa: filtered.filter((r) => r.status === 'Alpa').length,
    };
  }, [filtered]);

  function handleKelasChange(nextKelas: string) {
    setSelectedKelas(nextKelas);
    if (nextKelas === 'Semua') {
      navigate('/app/rekap/siswa');
    } else {
      navigate(`/app/rekap/siswa/${encodeURIComponent(nextKelas)}`);
    }
  }

  function handleExport() {
    downloadCSV(
      `rekap-absensi-siswa-${startDate}-sd-${endDate}.csv`,
      ['Tanggal', 'NIS', 'Nama Siswa', 'Kelas', 'Jurusan', 'Status', 'Dicatat Oleh', 'Keterangan'],
      filtered.map((r) => [
        r.tanggal,
        r.students?.nis ?? '-',
        r.students?.nama ?? '-',
        r.students?.kelas ?? '-',
        r.students?.jurusan ?? '-',
        r.status,
        r.recorder?.full_name ?? '-',
        r.keterangan ?? '',
      ]),
    );
  }

  return (
    <AppShell
      title="Rekap Absensi Siswa"
      subtitle="Laporan kehadiran siswa per periode dan kelas"
    >
      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-neutral-200 rounded-xl p-4">
          <p className="text-xs text-neutral-500 font-medium">Hadir</p>
          <p className="text-2xl font-extrabold text-emerald-700 mt-1 tabular-nums">{summary.hadir}</p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-4">
          <p className="text-xs text-neutral-500 font-medium">Izin</p>
          <p className="text-2xl font-extrabold text-amber-700 mt-1 tabular-nums">{summary.izin}</p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-4">
          <p className="text-xs text-neutral-500 font-medium">Sakit</p>
          <p className="text-2xl font-extrabold text-neutral-900 mt-1 tabular-nums">{summary.sakit}</p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-4">
          <p className="text-xs text-neutral-500 font-medium">Alpa</p>
          <p className="text-2xl font-extrabold text-red-700 mt-1 tabular-nums">{summary.alpa}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div>
            <label htmlFor="rs-start" className="block text-xs font-semibold text-neutral-700 mb-1.5">
              Dari Tanggal
            </label>
            <input
              id="rs-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-red-700"
            />
          </div>

          <div>
            <label htmlFor="rs-end" className="block text-xs font-semibold text-neutral-700 mb-1.5">
              Sampai Tanggal
            </label>
            <input
              id="rs-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-red-700"
            />
          </div>

          <div>
            <label htmlFor="rs-kelas" className="block text-xs font-semibold text-neutral-700 mb-1.5">
              Kelas
            </label>
            <select
              id="rs-kelas"
              value={selectedKelas}
              onChange={(e) => handleKelasChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white focus:outline-none focus:border-red-700"
            >
              {classList.map((k) => (
                <option key={k} value={k}>
                  {k === 'Semua' ? 'Semua Kelas' : k}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="rs-search" className="block text-xs font-semibold text-neutral-700 mb-1.5">
              Cari Siswa
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="rs-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="NIS atau Nama..."
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
          <h2 className="text-sm font-bold text-neutral-900">Riwayat Kehadiran Siswa</h2>
          <span className="text-xs text-neutral-500 tabular-nums">{filtered.length} baris</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold text-neutral-500">
                <th className="py-3 px-6">Tanggal</th>
                <th className="py-3 px-4">NIS</th>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Dicatat Oleh</th>
                <th className="py-3 px-6">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-neutral-400">
                    Memuat rekap absensi siswa...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-neutral-500">
                    Tidak ada catatan absensi siswa pada rentang tanggal ini.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-neutral-50/70">
                    <td className="py-3 px-6 font-medium text-neutral-900 tabular-nums whitespace-nowrap">
                      {formatShortDate(row.tanggal)}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-neutral-700 tabular-nums whitespace-nowrap">
                      {row.students?.nis || '—'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-neutral-900">
                      {row.students?.nama || '—'}
                    </td>
                    <td className="py-3 px-4 text-xs text-neutral-600 whitespace-nowrap">
                      {row.students ? `${row.students.kelas} · ${row.students.jurusan}` : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs font-semibold ${
                          row.status === 'Hadir'
                            ? 'text-emerald-700'
                            : row.status === 'Alpa'
                              ? 'text-red-700'
                              : 'text-amber-700'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-neutral-600">
                      {row.recorder?.full_name || '—'}
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

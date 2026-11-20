import {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowRight, ClipboardCheck, Database, UserCheck, Users} from 'lucide-react';
import AppShell from '../../components/AppShell';
import {useAuth} from '../../context/AuthContext';
import {formatIndonesianDate, formatShortDate, formatTimeOnly, getTodayDateISO} from '../../lib/date';
import {ROLE_LABELS, type EmployeeAttendance} from '../../types/app';

interface DashboardStats {
  totalStudents: number;
  totalEmployees: number;
  employeesPresentToday: number;
  studentsPresentToday: number;
  studentsRecordedToday: number;
}

export default function DashboardPage() {
  const {supabase, profile} = useAuth();
  const [todaySelf, setTodaySelf] = useState<EmployeeAttendance | null>(null);
  const [recentSelf, setRecentSelf] = useState<EmployeeAttendance[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalEmployees: 0,
    employeesPresentToday: 0,
    studentsPresentToday: 0,
    studentsRecordedToday: 0,
  });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const todayISO = getTodayDateISO();
  const role = profile?.role ?? 'tenaga_kependidikan';

  useEffect(() => {
    let active = true;
    async function loadDashboard() {
      if (!supabase || !profile) return;
      setLoading(true);
      setErrorMsg(null);

      try {
        // 1. Personal attendance today & recent history
        const {data: myHistory, error: myErr} = await supabase
          .from('employee_attendance')
          .select('*')
          .eq('user_id', profile.id)
          .order('tanggal', {ascending: false})
          .limit(7);

        if (myErr) throw myErr;

        if (!active) return;
        const rows = (myHistory ?? []) as EmployeeAttendance[];
        setRecentSelf(rows);
        setTodaySelf(rows.find((r) => r.tanggal === todayISO) ?? null);

        // 2. Role-specific aggregates
        const nextStats: DashboardStats = {
          totalStudents: 0,
          totalEmployees: 0,
          employeesPresentToday: 0,
          studentsPresentToday: 0,
          studentsRecordedToday: 0,
        };

        if (role === 'admin' || role === 'guru') {
          const [studentsCountRes, todayStudentAttRes] = await Promise.all([
            supabase.from('students').select('id', {count: 'exact', head: true}),
            supabase.from('student_attendance').select('status').eq('tanggal', todayISO),
          ]);

          nextStats.totalStudents = studentsCountRes.count ?? 0;
          const stRows = todayStudentAttRes.data ?? [];
          nextStats.studentsRecordedToday = stRows.length;
          nextStats.studentsPresentToday = stRows.filter((s) => s.status === 'Hadir').length;
        }

        if (role === 'admin') {
          const [empCountRes, todayEmpAttRes] = await Promise.all([
            supabase.from('profiles').select('id', {count: 'exact', head: true}),
            supabase.from('employee_attendance').select('status').eq('tanggal', todayISO),
          ]);

          nextStats.totalEmployees = empCountRes.count ?? 0;
          const empRows = todayEmpAttRes.data ?? [];
          nextStats.employeesPresentToday = empRows.filter(
            (e) => e.status === 'Hadir' || e.status === 'Terlambat',
          ).length;
        }

        if (active) setStats(nextStats);
      } catch (err: any) {
        if (active) {
          setErrorMsg(
            err?.code === '42P01'
              ? 'Tabel database belum tersedia di Supabase. Jalankan file supabase/schema.sql di SQL Editor Supabase Anda.'
              : err?.message || 'Gagal memuat ringkasan dashboard.',
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      active = false;
    };
  }, [supabase, profile, role, todayISO]);

  return (
    <AppShell
      title="Dashboard"
      subtitle={`${formatIndonesianDate(todayISO)} · ${ROLE_LABELS[role]}`}
    >
      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm">
          {errorMsg}
        </div>
      )}

      {/* Greeting & Today's Self-Attendance Banner */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6 mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <p className="text-xs font-semibold text-red-700 mb-1">
            Ringkasan Hari Ini · {formatIndonesianDate(todayISO)}
          </p>
          <h2 className="text-2xl font-extrabold text-neutral-900">
            Selamat bertugas, {profile?.full_name}
          </h2>
          <p className="text-sm text-neutral-600 mt-1">
            {todaySelf
              ? `Status presensi karyawan Anda hari ini: ${todaySelf.status} (Masuk: ${formatTimeOnly(todaySelf.jam_masuk)}, Pulang: ${formatTimeOnly(todaySelf.jam_keluar)}).`
              : 'Anda belum mencatat kehadiran karyawan untuk hari ini.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            to="/app/absensi-karyawan"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg transition-colors whitespace-nowrap"
          >
            <UserCheck className="w-4 h-4" />
            <span>{todaySelf ? 'Lihat Absensi Karyawan' : 'Isi Absensi Karyawan'}</span>
          </Link>

          {(role === 'admin' || role === 'guru') && (
            <Link
              to="/app/absensi-siswa"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors whitespace-nowrap"
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>Absen Siswa</span>
            </Link>
          )}
        </div>
      </div>

      {/* Role-Specific Metric Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-white border border-neutral-200 rounded-xl p-5">
          <p className="text-xs font-semibold text-neutral-500">Status Presensi Pribadi</p>
          <p className="text-2xl font-extrabold text-neutral-900 mt-2">
            {loading ? '...' : todaySelf?.status ?? 'Belum Absen'}
          </p>
          <p className="text-xs text-neutral-500 mt-1 font-mono tabular-nums">
            Masuk: {formatTimeOnly(todaySelf?.jam_masuk)}
          </p>
        </div>

        {(role === 'admin' || role === 'guru') && (
          <>
            <div className="bg-white border border-neutral-200 rounded-xl p-5">
              <p className="text-xs font-semibold text-neutral-500">Total Siswa Terdaftar</p>
              <p className="text-2xl font-extrabold text-neutral-900 mt-2 tabular-nums">
                {loading ? '...' : stats.totalStudents}
              </p>
              <p className="text-xs text-neutral-500 mt-1">Seluruh kelas &amp; jurusan</p>
            </div>

            <div className="bg-white border border-neutral-200 rounded-xl p-5">
              <p className="text-xs font-semibold text-neutral-500">Siswa Hadir Hari Ini</p>
              <p className="text-2xl font-extrabold text-red-700 mt-2 tabular-nums">
                {loading ? '...' : stats.studentsPresentToday}
              </p>
              <p className="text-xs text-neutral-500 mt-1 tabular-nums">
                Dari {stats.studentsRecordedToday} siswa yang diabsen
              </p>
            </div>
          </>
        )}

        {role === 'admin' && (
          <div className="bg-white border border-neutral-200 rounded-xl p-5">
            <p className="text-xs font-semibold text-neutral-500">Karyawan Hadir Hari Ini</p>
            <p className="text-2xl font-extrabold text-neutral-900 mt-2 tabular-nums">
              {loading ? '...' : `${stats.employeesPresentToday} / ${stats.totalEmployees}`}
            </p>
            <p className="text-xs text-neutral-500 mt-1">Admin, Guru &amp; Tendik</p>
          </div>
        )}
      </div>

      {/* Quick Actions & Recent Self Attendance Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white border border-neutral-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-900">
              Riwayat Kehadiran Pribadi Terbaru
            </h3>
            <Link
              to="/app/absensi-karyawan"
              className="text-xs font-semibold text-red-700 hover:text-red-800 inline-flex items-center gap-1"
            >
              <span>Selengkapnya</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold text-neutral-500">
                  <th className="py-3 px-5">Tanggal</th>
                  <th className="py-3 px-4">Jam Masuk</th>
                  <th className="py-3 px-4">Jam Keluar</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-5">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-neutral-400 text-xs">
                      Memuat data kehadiran...
                    </td>
                  </tr>
                ) : recentSelf.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-neutral-500 text-xs">
                      Belum ada catatan kehadiran pribadi.
                    </td>
                  </tr>
                ) : (
                  recentSelf.map((row) => (
                    <tr key={row.id} className="hover:bg-neutral-50/70">
                      <td className="py-3 px-5 font-medium text-neutral-900 tabular-nums whitespace-nowrap">
                        {formatShortDate(row.tanggal)}
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
                      <td className="py-3 px-5 text-xs text-neutral-500">
                        {row.keterangan || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-neutral-200 rounded-xl p-5">
            <h3 className="text-sm font-bold text-neutral-900 mb-3">Akses Cepat Sesuai Role</h3>
            <div className="space-y-2.5">
              <Link
                to="/app/absensi-karyawan"
                className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 hover:border-red-700 hover:bg-red-50/40 transition-colors"
              >
                <span className="flex items-center gap-2.5 text-sm font-semibold text-neutral-800">
                  <UserCheck className="w-4 h-4 text-red-700" />
                  <span>Absensi Karyawan</span>
                </span>
                <ArrowRight className="w-4 h-4 text-neutral-400" />
              </Link>

              {(role === 'admin' || role === 'guru') && (
                <>
                  <Link
                    to="/app/absensi-siswa"
                    className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 hover:border-red-700 hover:bg-red-50/40 transition-colors"
                  >
                    <span className="flex items-center gap-2.5 text-sm font-semibold text-neutral-800">
                      <ClipboardCheck className="w-4 h-4 text-red-700" />
                      <span>Absensi Siswa</span>
                    </span>
                    <ArrowRight className="w-4 h-4 text-neutral-400" />
                  </Link>
                  <Link
                    to="/app/rekap/siswa"
                    className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 hover:border-red-700 hover:bg-red-50/40 transition-colors"
                  >
                    <span className="flex items-center gap-2.5 text-sm font-semibold text-neutral-800">
                      <Database className="w-4 h-4 text-red-700" />
                      <span>Rekap Absensi Siswa</span>
                    </span>
                    <ArrowRight className="w-4 h-4 text-neutral-400" />
                  </Link>
                </>
              )}

              {role === 'admin' && (
                <>
                  <Link
                    to="/app/data-siswa"
                    className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 hover:border-red-700 hover:bg-red-50/40 transition-colors"
                  >
                    <span className="flex items-center gap-2.5 text-sm font-semibold text-neutral-800">
                      <Database className="w-4 h-4 text-red-700" />
                      <span>Kelola Data Siswa</span>
                    </span>
                    <ArrowRight className="w-4 h-4 text-neutral-400" />
                  </Link>
                  <Link
                    to="/app/user-management"
                    className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 hover:border-red-700 hover:bg-red-50/40 transition-colors"
                  >
                    <span className="flex items-center gap-2.5 text-sm font-semibold text-neutral-800">
                      <Users className="w-4 h-4 text-red-700" />
                      <span>User Management</span>
                    </span>
                    <ArrowRight className="w-4 h-4 text-neutral-400" />
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

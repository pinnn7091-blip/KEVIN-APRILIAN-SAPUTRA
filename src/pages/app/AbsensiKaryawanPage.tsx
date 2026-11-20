import React, {useCallback, useEffect, useState} from 'react';
import {AlertCircle, CheckCircle2, Clock, Loader2, LogIn, LogOut as LogOutIcon} from 'lucide-react';
import AppShell from '../../components/AppShell';
import {useAuth} from '../../context/AuthContext';
import {
  formatIndonesianDate,
  formatShortDate,
  formatTimeOnly,
  getTodayDateISO,
} from '../../lib/date';
import type {EmployeeAttendance, EmployeeAttendanceStatus} from '../../types/app';

export default function AbsensiKaryawanPage() {
  const {supabase, profile} = useAuth();
  const [clock, setClock] = useState(() => new Date());
  const [history, setHistory] = useState<EmployeeAttendance[]>([]);
  const [todayRecord, setTodayRecord] = useState<EmployeeAttendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [leaveStatus, setLeaveStatus] = useState<'Izin' | 'Sakit'>('Izin');
  const [leaveReason, setLeaveReason] = useState('');
  const [feedback, setFeedback] = useState<{type: 'success' | 'error'; text: string} | null>(null);

  const todayISO = getTodayDateISO();

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadAttendance = useCallback(async () => {
    if (!supabase || !profile) return;
    setLoading(true);
    const {data, error} = await supabase
      .from('employee_attendance')
      .select('*')
      .eq('user_id', profile.id)
      .order('tanggal', {ascending: false})
      .limit(30);

    if (error) {
      setFeedback({
        type: 'error',
        text: error.message,
      });
    } else {
      const rows = (data ?? []) as EmployeeAttendance[];
      setHistory(rows);
      setTodayRecord(rows.find((r) => r.tanggal === todayISO) ?? null);
    }
    setLoading(false);
  }, [supabase, profile, todayISO]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  async function handleCheckIn() {
    if (!supabase || !profile) return;
    setSubmitting(true);
    setFeedback(null);

    const now = new Date();
    const isLate = now.getHours() > 7 || (now.getHours() === 7 && now.getMinutes() > 30);
    const status: EmployeeAttendanceStatus = isLate ? 'Terlambat' : 'Hadir';

    const {error} = await supabase.from('employee_attendance').upsert(
      {
        user_id: profile.id,
        tanggal: todayISO,
        jam_masuk: now.toISOString(),
        status,
        keterangan: isLate ? 'Masuk melewati batas pukul 07:30' : 'Absen masuk tepat waktu',
      },
      {onConflict: 'user_id,tanggal'},
    );

    setSubmitting(false);
    if (error) {
      setFeedback({type: 'error', text: error.message});
      return;
    }

    setFeedback({
      type: 'success',
      text: `Absen masuk tercatat pada ${formatTimeOnly(now.toISOString())} dengan status ${status}.`,
    });
    await loadAttendance();
  }

  async function handleCheckOut() {
    if (!supabase || !profile || !todayRecord) return;
    setSubmitting(true);
    setFeedback(null);

    const now = new Date();
    const {error} = await supabase
      .from('employee_attendance')
      .update({jam_keluar: now.toISOString()})
      .eq('id', todayRecord.id)
      .eq('user_id', profile.id);

    setSubmitting(false);
    if (error) {
      setFeedback({type: 'error', text: error.message});
      return;
    }

    setFeedback({
      type: 'success',
      text: `Absen pulang tercatat pada ${formatTimeOnly(now.toISOString())}.`,
    });
    await loadAttendance();
  }

  async function handleLeaveSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !profile) return;
    if (!leaveReason.trim()) {
      setFeedback({type: 'error', text: 'Mohon isi alasan izin atau sakit.'});
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    const {error} = await supabase.from('employee_attendance').upsert(
      {
        user_id: profile.id,
        tanggal: todayISO,
        jam_masuk: null,
        jam_keluar: null,
        status: leaveStatus,
        keterangan: leaveReason.trim(),
      },
      {onConflict: 'user_id,tanggal'},
    );

    setSubmitting(false);
    if (error) {
      setFeedback({type: 'error', text: error.message});
      return;
    }

    setLeaveReason('');
    setFeedback({
      type: 'success',
      text: `Pengajuan ${leaveStatus} untuk hari ini berhasil disimpan.`,
    });
    await loadAttendance();
  }

  const formattedClock = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(clock);

  const canCheckOut =
    todayRecord &&
    (todayRecord.status === 'Hadir' || todayRecord.status === 'Terlambat') &&
    todayRecord.jam_masuk &&
    !todayRecord.jam_keluar;

  return (
    <AppShell
      title="Absensi Karyawan"
      subtitle="Pencatatan kehadiran mandiri harian untuk seluruh pegawai SMK Prima Unggul"
    >
      {feedback && (
        <div
          className={`mb-6 p-4 rounded-xl border text-sm flex items-start gap-2.5 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Top Action Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Live Clock & Primary Check-In/Out Card */}
        <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-4 pb-5 border-b border-neutral-200">
              <div>
                <p className="text-xs font-semibold text-red-700">Waktu Kehadiran Saat Ini</p>
                <p className="text-sm font-medium text-neutral-600 mt-1">
                  {formatIndonesianDate(todayISO)}
                </p>
              </div>
              <div className="flex items-center gap-2 text-2xl sm:text-3xl font-mono font-bold text-neutral-900 tabular-nums">
                <Clock className="w-5 h-5 text-red-700" />
                <span>{formattedClock}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 py-5">
              <div>
                <p className="text-xs text-neutral-500">Status Hari Ini</p>
                <p className="text-base font-bold text-neutral-900 mt-1">
                  {loading ? '...' : todayRecord?.status ?? 'Belum Absen'}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Jam Masuk</p>
                <p className="text-base font-mono font-bold text-neutral-900 mt-1 tabular-nums">
                  {formatTimeOnly(todayRecord?.jam_masuk)}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Jam Keluar</p>
                <p className="text-base font-mono font-bold text-neutral-900 mt-1 tabular-nums">
                  {formatTimeOnly(todayRecord?.jam_keluar)}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-200 flex flex-wrap items-center gap-3">
            {!todayRecord && (
              <button
                type="button"
                disabled={loading || submitting}
                onClick={handleCheckIn}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                <span>Absen Masuk Sekarang</span>
              </button>
            )}

            {canCheckOut && (
              <button
                type="button"
                disabled={submitting}
                onClick={handleCheckOut}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LogOutIcon className="w-4 h-4" />
                )}
                <span>Absen Pulang Sekarang</span>
              </button>
            )}

            {todayRecord && !canCheckOut && (
              <p className="text-xs font-medium text-neutral-600">
                Presensi hari ini telah lengkap tercatat ({todayRecord.status}).
              </p>
            )}
          </div>
        </div>

        {/* Izin / Sakit Form */}
        <div className="lg:col-span-5 bg-white border border-neutral-200 rounded-xl p-6">
          <h2 className="text-base font-bold text-neutral-900 mb-1">
            Pengajuan Izin / Sakit Hari Ini
          </h2>
          <p className="text-xs text-neutral-500 mb-4">
            Gunakan formulir ini apabila berhalangan hadir dan belum melakukan absen masuk.
          </p>

          <form onSubmit={handleLeaveSubmit} className="space-y-4">
            <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-lg">
              {(['Izin', 'Sakit'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  disabled={Boolean(todayRecord)}
                  onClick={() => setLeaveStatus(type)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    leaveStatus === type
                      ? 'bg-red-700 text-white'
                      : 'text-neutral-600 hover:text-neutral-900'
                  } disabled:opacity-50`}
                >
                  {type}
                </button>
              ))}
            </div>

            <div>
              <label htmlFor="leave-reason" className="block text-xs font-semibold text-neutral-700 mb-1.5">
                Keterangan
              </label>
              <textarea
                id="leave-reason"
                rows={3}
                disabled={Boolean(todayRecord)}
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                placeholder="Tuliskan alasan izin atau keterangan sakit..."
                className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-700 disabled:bg-neutral-100"
              />
            </div>

            <button
              type="submit"
              disabled={Boolean(todayRecord) || submitting}
              className="w-full py-2.5 px-4 bg-white border border-neutral-300 hover:border-red-700 hover:text-red-700 disabled:opacity-50 text-neutral-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Simpan Keterangan {leaveStatus}
            </button>
          </form>
        </div>
      </div>

      {/* Personal Attendance History Table */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-neutral-900">
            Riwayat Absensi Pribadi (30 Hari Terakhir)
          </h3>
          <span className="text-xs text-neutral-500 tabular-nums">
            Total {history.length} catatan
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold text-neutral-500">
                <th className="py-3 px-6">Tanggal</th>
                <th className="py-3 px-4">Jam Masuk</th>
                <th className="py-3 px-4">Jam Keluar</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-6">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-xs text-neutral-400">
                    Memuat riwayat absensi...
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-xs text-neutral-500">
                    Belum ada riwayat absensi karyawan untuk akun ini.
                  </td>
                </tr>
              ) : (
                history.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-50/70">
                    <td className="py-3 px-6 font-medium text-neutral-900 tabular-nums whitespace-nowrap">
                      {formatShortDate(item.tanggal)}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-neutral-700 tabular-nums">
                      {formatTimeOnly(item.jam_masuk)}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-neutral-700 tabular-nums">
                      {formatTimeOnly(item.jam_keluar)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs font-semibold ${
                          item.status === 'Hadir'
                            ? 'text-emerald-700'
                            : item.status === 'Terlambat'
                              ? 'text-amber-700'
                              : 'text-red-700'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-xs text-neutral-500">
                      {item.keterangan || '—'}
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

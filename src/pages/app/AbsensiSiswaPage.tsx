import {useCallback, useEffect, useMemo, useState} from 'react';
import {Link, useNavigate, useParams} from 'react-router-dom';
import {AlertCircle, CheckCircle2, Loader2, Save, Search} from 'lucide-react';
import AppShell from '../../components/AppShell';
import {useAuth} from '../../context/AuthContext';
import {formatIndonesianDate, getTodayDateISO} from '../../lib/date';
import type {Student, StudentAttendanceStatus} from '../../types/app';

interface AttendanceDraft {
  status: StudentAttendanceStatus;
  keterangan: string;
}

const STATUS_OPTIONS: StudentAttendanceStatus[] = ['Hadir', 'Izin', 'Sakit', 'Alpa'];

export default function AbsensiSiswaPage() {
  const {kelas: kelasParam} = useParams<{kelas?: string}>();
  const navigate = useNavigate();
  const {supabase, profile} = useAuth();

  const [tanggal, setTanggal] = useState(getTodayDateISO());
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedKelas, setSelectedKelas] = useState<string>(
    kelasParam ? decodeURIComponent(kelasParam) : 'Semua',
  );
  const [search, setSearch] = useState('');
  const [drafts, setDrafts] = useState<Record<string, AttendanceDraft>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{type: 'success' | 'error'; text: string} | null>(null);

  useEffect(() => {
    if (kelasParam) {
      setSelectedKelas(decodeURIComponent(kelasParam));
    }
  }, [kelasParam]);

  const loadStudentsAndAttendance = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setFeedback(null);

    try {
      const [studentsRes, attendanceRes] = await Promise.all([
        supabase.from('students').select('*').order('kelas').order('nama'),
        supabase.from('student_attendance').select('*').eq('tanggal', tanggal),
      ]);

      if (studentsRes.error) throw studentsRes.error;
      if (attendanceRes.error) throw attendanceRes.error;

      const studentRows = (studentsRes.data ?? []) as Student[];
      const attMap = new Map(
        (attendanceRes.data ?? []).map((row: any) => [row.student_id, row]),
      );

      const initialDrafts: Record<string, AttendanceDraft> = {};
      for (const s of studentRows) {
        const existing = attMap.get(s.id);
        initialDrafts[s.id] = {
          status: (existing?.status as StudentAttendanceStatus) ?? 'Hadir',
          keterangan: existing?.keterangan ?? '',
        };
      }

      setStudents(studentRows);
      setDrafts(initialDrafts);
    } catch (err: any) {
      setFeedback({type: 'error', text: err?.message || 'Gagal memuat data siswa.'});
    } finally {
      setLoading(false);
    }
  }, [supabase, tanggal]);

  useEffect(() => {
    loadStudentsAndAttendance();
  }, [loadStudentsAndAttendance]);

  const availableClasses = useMemo(() => {
    const set = new Set(students.map((s) => s.kelas));
    return ['Semua', ...Array.from(set).sort()];
  }, [students]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      const matchesClass = selectedKelas === 'Semua' || s.kelas === selectedKelas;
      const matchesQuery =
        !q ||
        s.nama.toLowerCase().includes(q) ||
        s.nis.toLowerCase().includes(q) ||
        s.kelas.toLowerCase().includes(q);
      return matchesClass && matchesQuery;
    });
  }, [students, selectedKelas, search]);

  function handleKelasChange(nextKelas: string) {
    setSelectedKelas(nextKelas);
    if (nextKelas === 'Semua') {
      navigate('/app/absensi-siswa');
    } else {
      navigate(`/app/absensi-siswa/${encodeURIComponent(nextKelas)}`);
    }
  }

  function updateDraft(studentId: string, patch: Partial<AttendanceDraft>) {
    setDrafts((prev) => ({
      ...prev,
      [studentId]: {
        status: prev[studentId]?.status ?? 'Hadir',
        keterangan: prev[studentId]?.keterangan ?? '',
        ...patch,
      },
    }));
  }

  function markAllFilteredPresent() {
    setDrafts((prev) => {
      const next = {...prev};
      for (const s of filteredStudents) {
        next[s.id] = {
          status: 'Hadir',
          keterangan: next[s.id]?.keterangan ?? '',
        };
      }
      return next;
    });
  }

  async function handleSaveAttendance() {
    if (!supabase || !profile || filteredStudents.length === 0) return;
    setSaving(true);
    setFeedback(null);

    const payload = filteredStudents.map((s) => ({
      student_id: s.id,
      recorded_by: profile.id,
      tanggal,
      status: drafts[s.id]?.status ?? 'Hadir',
      keterangan: drafts[s.id]?.keterangan?.trim() || null,
    }));

    const {error} = await supabase
      .from('student_attendance')
      .upsert(payload, {onConflict: 'student_id,tanggal'});

    setSaving(false);
    if (error) {
      setFeedback({type: 'error', text: error.message});
      return;
    }

    setFeedback({
      type: 'success',
      text: `Berhasil menyimpan absensi untuk ${payload.length} siswa pada ${formatIndonesianDate(tanggal)}.`,
    });
  }

  return (
    <AppShell
      title="Absensi Siswa"
      subtitle="Input kehadiran siswa per kelas oleh Guru dan Administrator"
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

      {/* Filter & Action Toolbar */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div>
            <label htmlFor="att-date" className="block text-xs font-semibold text-neutral-700 mb-1.5">
              Tanggal Absensi
            </label>
            <input
              id="att-date"
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-700"
            />
          </div>

          <div>
            <label htmlFor="att-kelas" className="block text-xs font-semibold text-neutral-700 mb-1.5">
              Filter Kelas
            </label>
            <select
              id="att-kelas"
              value={selectedKelas}
              onChange={(e) => handleKelasChange(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-700"
            >
              {availableClasses.map((k) => (
                <option key={k} value={k}>
                  {k === 'Semua' ? 'Semua Kelas' : k}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="att-search" className="block text-xs font-semibold text-neutral-700 mb-1.5">
              Cari NIS / Nama Siswa
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="att-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari siswa..."
                className="w-full pl-9 pr-3.5 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-700"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={markAllFilteredPresent}
              disabled={filteredStudents.length === 0}
              className="px-3.5 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              Semua Hadir
            </button>
            <button
              type="button"
              onClick={handleSaveAttendance}
              disabled={saving || filteredStudents.length === 0}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Simpan Absensi</span>
            </button>
          </div>
        </div>
      </div>

      {/* Students Attendance Table */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-neutral-900">
            Daftar Presensi Siswa · {formatIndonesianDate(tanggal)}
          </h2>
          <span className="text-xs text-neutral-500 tabular-nums">
            Menampilkan {filteredStudents.length} siswa
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold text-neutral-500">
                <th className="py-3 px-6">NIS</th>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Status Kehadiran</th>
                <th className="py-3 px-6">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-neutral-400">
                    Memuat daftar siswa...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-neutral-500">
                    {students.length === 0 ? (
                      <div className="space-y-2">
                        <p>Belum ada data siswa yang terdaftar di sistem.</p>
                        {profile?.role === 'admin' && (
                          <Link
                            to="/app/data-siswa"
                            className="inline-block text-red-700 font-semibold hover:underline"
                          >
                            Tambahkan Data Siswa di sini
                          </Link>
                        )}
                      </div>
                    ) : (
                      'Tidak ada siswa yang sesuai dengan filter.'
                    )}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const draft = drafts[student.id] ?? {status: 'Hadir', keterangan: ''};
                  return (
                    <tr key={student.id} className="hover:bg-neutral-50/60">
                      <td className="py-3 px-6 font-mono text-xs text-neutral-700 tabular-nums whitespace-nowrap">
                        {student.nis}
                      </td>
                      <td className="py-3 px-4 font-semibold text-neutral-900">
                        {student.nama}
                      </td>
                      <td className="py-3 px-4 text-xs text-neutral-600 whitespace-nowrap">
                        {student.kelas} · {student.jurusan}
                      </td>
                      <td className="py-3 px-4">
                        <div className="inline-flex items-center gap-1 p-1 bg-neutral-100 rounded-lg">
                          {STATUS_OPTIONS.map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => updateDraft(student.id, {status: st})}
                              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                                draft.status === st
                                  ? st === 'Hadir'
                                    ? 'bg-emerald-700 text-white'
                                    : st === 'Alpa'
                                      ? 'bg-red-700 text-white'
                                      : 'bg-amber-600 text-white'
                                  : 'text-neutral-600 hover:text-neutral-900'
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-6">
                        <input
                          type="text"
                          value={draft.keterangan}
                          onChange={(e) =>
                            updateDraft(student.id, {keterangan: e.target.value})
                          }
                          placeholder="Catatan opsional..."
                          className="w-full min-w-[160px] px-2.5 py-1.5 text-xs border border-neutral-200 rounded-md focus:outline-none focus:border-red-700"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}

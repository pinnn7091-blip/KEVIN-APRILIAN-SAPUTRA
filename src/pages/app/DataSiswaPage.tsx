import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Link, useNavigate, useParams} from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Database,
  Edit3,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import AppShell from '../../components/AppShell';
import DatabaseRelationModal from '../../components/DatabaseRelationModal';
import {useAuth} from '../../context/AuthContext';
import {formatShortDate} from '../../lib/date';
import {
  JURUSAN_LIST,
  type JurusanCode,
  type Student,
  type StudentAttendance,
} from '../../types/app';

export default function DataSiswaPage() {
  const {id: studentIdParam} = useParams<{id?: string}>();
  const navigate = useNavigate();
  const {supabase, session} = useAuth();

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [jurusanFilter, setJurusanFilter] = useState<'Semua' | JurusanCode>('Semua');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [nis, setNis] = useState('');
  const [nama, setNama] = useState('');
  const [kelas, setKelas] = useState('');
  const [jurusan, setJurusan] = useState<JurusanCode>('TKJ');
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [feedback, setFeedback] = useState<{type: 'success' | 'error'; text: string} | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [dbModalOpen, setDbModalOpen] = useState(false);

  // Detail route state (/app/data-siswa/:id)
  const [detailHistory, setDetailHistory] = useState<StudentAttendance[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  async function handleSeedStudents() {
    if (!session) return;
    setSeeding(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/seed-students', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const payload = await res.json();
      if (!res.ok) {
        setFeedback({type: 'error', text: payload.error || 'Gagal mengisi contoh data siswa.'});
      } else {
        setFeedback({
          type: 'success',
          text: `${payload.inserted} data siswa awal (TKJ, DKV, BC, AK, MPLB, BD) berhasil disinkronkan ke Supabase.`,
        });
        await loadStudents();
      }
    } catch (err: any) {
      setFeedback({type: 'error', text: err?.message || 'Gagal menghubungi server.'});
    } finally {
      setSeeding(false);
    }
  }

  const loadStudents = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const {data, error} = await supabase
      .from('students')
      .select('*')
      .order('kelas')
      .order('nama');

    if (error) {
      setFeedback({type: 'error', text: error.message});
    } else {
      setStudents((data ?? []) as Student[]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  useEffect(() => {
    let active = true;
    async function loadDetailHistory() {
      if (!supabase || !studentIdParam) return;
      setDetailLoading(true);
      const {data} = await supabase
        .from('student_attendance')
        .select('*')
        .eq('student_id', studentIdParam)
        .order('tanggal', {ascending: false})
        .limit(30);

      if (active) {
        setDetailHistory((data ?? []) as StudentAttendance[]);
        setDetailLoading(false);
      }
    }
    loadDetailHistory();
    return () => {
      active = false;
    };
  }, [supabase, studentIdParam]);

  const selectedDetailStudent = useMemo(
    () => (studentIdParam ? students.find((s) => s.id === studentIdParam) ?? null : null),
    [students, studentIdParam],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      const matchesJurusan = jurusanFilter === 'Semua' || s.jurusan === jurusanFilter;
      const matchesQ =
        !q ||
        s.nis.toLowerCase().includes(q) ||
        s.nama.toLowerCase().includes(q) ||
        s.kelas.toLowerCase().includes(q);
      return matchesJurusan && matchesQ;
    });
  }, [students, jurusanFilter, search]);

  function openCreateModal() {
    setEditingStudent(null);
    setNis('');
    setNama('');
    setKelas('');
    setJurusan('TKJ');
    setModalOpen(true);
  }

  function openEditModal(student: Student) {
    setEditingStudent(student);
    setNis(student.nis);
    setNama(student.nama);
    setKelas(student.kelas);
    setJurusan(student.jurusan);
    setModalOpen(true);
  }

  async function handleSaveStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;

    if (!nis.trim() || !nama.trim() || !kelas.trim()) {
      setFeedback({type: 'error', text: 'NIS, Nama, dan Kelas wajib diisi.'});
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    const payload = {
      nis: nis.trim(),
      nama: nama.trim(),
      kelas: kelas.trim().toUpperCase(),
      jurusan,
      updated_at: new Date().toISOString(),
    };

    const result = editingStudent
      ? await supabase.from('students').update(payload).eq('id', editingStudent.id)
      : await supabase.from('students').insert(payload);

    setSubmitting(false);

    if (result.error) {
      setFeedback({
        type: 'error',
        text: result.error.message.includes('unique')
          ? `NIS ${nis.trim()} sudah terdaftar.`
          : result.error.message,
      });
      return;
    }

    setModalOpen(false);
    setFeedback({
      type: 'success',
      text: editingStudent
        ? `Data siswa ${nama.trim()} berhasil diperbarui.`
        : `Siswa baru ${nama.trim()} berhasil ditambahkan.`,
    });
    await loadStudents();
  }

  async function handleConfirmDelete() {
    if (!supabase || !deleteTarget) return;
    setSubmitting(true);
    const {error} = await supabase.from('students').delete().eq('id', deleteTarget.id);
    setSubmitting(false);

    if (error) {
      setFeedback({type: 'error', text: error.message});
    } else {
      setFeedback({type: 'success', text: `Data siswa ${deleteTarget.nama} berhasil dihapus.`});
      if (studentIdParam === deleteTarget.id) {
        navigate('/app/data-siswa', {replace: true});
      }
      await loadStudents();
    }
    setDeleteTarget(null);
  }

  // Dynamic Route Detail View (/app/data-siswa/:id)
  if (studentIdParam) {
    return (
      <AppShell
        title="Detail Data Siswa"
        subtitle="Informasi akademik dan riwayat kehadiran siswa"
      >
        <div className="mb-6">
          <Link
            to="/app/data-siswa"
            className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-600 hover:text-red-700"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Daftar Siswa</span>
          </Link>
        </div>

        {loading ? (
          <div className="bg-white border border-neutral-200 rounded-xl p-10 text-center text-sm text-neutral-500">
            Memuat data siswa...
          </div>
        ) : !selectedDetailStudent ? (
          <div className="bg-white border border-neutral-200 rounded-xl p-10 text-center text-sm text-neutral-500">
            Data siswa tidak ditemukan.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white border border-neutral-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-mono font-semibold text-red-700 tabular-nums">
                  NIS {selectedDetailStudent.nis} · {selectedDetailStudent.jurusan}
                </p>
                <h2 className="text-2xl font-extrabold text-neutral-900 mt-1">
                  {selectedDetailStudent.nama}
                </h2>
                <p className="text-sm text-neutral-600 mt-1">
                  Kelas {selectedDetailStudent.kelas}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEditModal(selectedDetailStudent)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-neutral-700 border border-neutral-300 rounded-lg hover:border-red-700 hover:text-red-700 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-200">
                <h3 className="text-sm font-bold text-neutral-900">
                  Riwayat Kehadiran (30 Catatan Terakhir)
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold text-neutral-500">
                      <th className="py-3 px-6">Tanggal</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-6">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-sm">
                    {detailLoading ? (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-xs text-neutral-400">
                          Memuat riwayat...
                        </td>
                      </tr>
                    ) : detailHistory.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-xs text-neutral-500">
                          Belum ada catatan kehadiran untuk siswa ini.
                        </td>
                      </tr>
                    ) : (
                      detailHistory.map((h) => (
                        <tr key={h.id}>
                          <td className="py-3 px-6 font-medium text-neutral-900 tabular-nums">
                            {formatShortDate(h.tanggal)}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`text-xs font-semibold ${
                                h.status === 'Hadir'
                                  ? 'text-emerald-700'
                                  : h.status === 'Alpa'
                                    ? 'text-red-700'
                                    : 'text-amber-700'
                              }`}
                            >
                              {h.status}
                            </span>
                          </td>
                          <td className="py-3 px-6 text-xs text-neutral-500">
                            {h.keterangan || '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Data Siswa"
      subtitle="Kelola master data NIS, nama siswa, kelas, dan jurusan SMK Prima Unggul"
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

      {/* Toolbar */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari NIS, nama siswa, atau kelas..."
              className="w-full pl-9 pr-3.5 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-red-700"
            />
          </div>

          <select
            value={jurusanFilter}
            onChange={(e) => setJurusanFilter(e.target.value as 'Semua' | JurusanCode)}
            className="px-3.5 py-2 text-sm border border-neutral-300 rounded-lg bg-white focus:outline-none focus:border-red-700"
          >
            <option value="Semua">Semua Jurusan</option>
            {JURUSAN_LIST.map((j) => (
              <option key={j.code} value={j.code}>
                {j.code} — {j.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setDbModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 border border-neutral-300 hover:border-red-700 text-neutral-700 hover:text-red-700 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Database className="w-4 h-4" />
            <span>Relasi DB</span>
          </button>

          {students.length === 0 && (
            <button
              type="button"
              disabled={seeding}
              onClick={handleSeedStudents}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              {seeding && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Isi 12 Contoh Siswa</span>
            </button>
          )}

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-700 hover:bg-red-800 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Data Siswa</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-neutral-900">Daftar Siswa Terdaftar</h2>
          <span className="text-xs text-neutral-500 tabular-nums">{filtered.length} siswa</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold text-neutral-500">
                <th className="py-3 px-6">NIS</th>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Jurusan</th>
                <th className="py-3 px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-neutral-400">
                    Memuat data siswa...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-neutral-500">
                    Belum ada data siswa. Klik &quot;Tambah Data Siswa&quot; untuk menambahkan.
                  </td>
                </tr>
              ) : (
                filtered.map((student) => (
                  <tr key={student.id} className="hover:bg-neutral-50/70">
                    <td className="py-3 px-6 font-mono text-xs text-neutral-700 tabular-nums whitespace-nowrap">
                      {student.nis}
                    </td>
                    <td className="py-3 px-4">
                      <Link
                        to={`/app/data-siswa/${student.id}`}
                        className="font-semibold text-neutral-900 hover:text-red-700 transition-colors"
                      >
                        {student.nama}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-sm text-neutral-700 whitespace-nowrap">
                      {student.kelas}
                    </td>
                    <td className="py-3 px-4 text-xs font-semibold text-red-700">
                      {student.jurusan}
                    </td>
                    <td className="py-3 px-6 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(student)}
                          className="p-1.5 text-neutral-500 hover:text-neutral-900 rounded-md hover:bg-neutral-100 cursor-pointer"
                          title="Edit siswa"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(student)}
                          className="p-1.5 text-neutral-500 hover:text-red-700 rounded-md hover:bg-red-50 cursor-pointer"
                          title="Hapus siswa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="bg-white rounded-xl border border-neutral-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-neutral-900">
                {editingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-md text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="p-6 space-y-4">
              <div>
                <label htmlFor="st-nis" className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  NIS (Nomor Induk Siswa)
                </label>
                <input
                  id="st-nis"
                  type="text"
                  value={nis}
                  onChange={(e) => setNis(e.target.value)}
                  placeholder="Contoh: 20261001"
                  className="w-full px-3.5 py-2 text-sm font-mono border border-neutral-300 rounded-lg focus:outline-none focus:border-red-700"
                  required
                />
              </div>

              <div>
                <label htmlFor="st-nama" className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  Nama Lengkap Siswa
                </label>
                <input
                  id="st-nama"
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Contoh: Siti Rahmawati"
                  className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-red-700"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="st-kelas" className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    Kelas
                  </label>
                  <input
                    id="st-kelas"
                    type="text"
                    value={kelas}
                    onChange={(e) => setKelas(e.target.value)}
                    placeholder="Contoh: X TKJ 1"
                    className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-red-700"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="st-jurusan" className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    Jurusan
                  </label>
                  <select
                    id="st-jurusan"
                    value={jurusan}
                    onChange={(e) => setJurusan(e.target.value as JurusanCode)}
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white focus:outline-none focus:border-red-700"
                  >
                    {JURUSAN_LIST.map((j) => (
                      <option key={j.code} value={j.code}>
                        {j.code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg cursor-pointer"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingStudent ? 'Simpan Perubahan' : 'Tambahkan Siswa'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="bg-white rounded-xl border border-neutral-200 w-full max-w-sm p-6">
            <h3 className="text-base font-bold text-neutral-900">Hapus Data Siswa?</h3>
            <p className="text-sm text-neutral-600 mt-2">
              Siswa <strong>{deleteTarget.nama}</strong> ({deleteTarget.nis}) beserta riwayat absensinya akan dihapus.
            </p>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                {submitting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      <DatabaseRelationModal open={dbModalOpen} onClose={() => setDbModalOpen(false)} />
    </AppShell>
  );
}

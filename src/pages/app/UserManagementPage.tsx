import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import AppShell from '../../components/AppShell';
import {useAuth} from '../../context/AuthContext';
import {formatShortDate} from '../../lib/date';
import {ROLE_LABELS, type ManagedUser, type UserRole} from '../../types/app';

export default function UserManagementPage() {
  const {session, profile: currentProfile, config} = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'Semua' | UserRole>('Semua');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nip, setNip] = useState('');
  const [role, setRole] = useState<UserRole>('guru');
  const [jabatan, setJabatan] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null);
  const [feedback, setFeedback] = useState<{type: 'success' | 'error'; text: string} | null>(null);

  const loadUsers = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const payload = await res.json();
      if (!res.ok) {
        setFeedback({type: 'error', text: payload.error || 'Gagal memuat daftar user.'});
        setUsers([]);
      } else {
        setUsers((payload.users ?? []) as ManagedUser[]);
      }
    } catch (err: any) {
      setFeedback({type: 'error', text: err?.message || 'Gagal terhubung ke server.'});
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const matchesRole = roleFilter === 'Semua' || u.role === roleFilter;
      const matchesQ =
        !q ||
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.nip ?? '').toLowerCase().includes(q);
      return matchesRole && matchesQ;
    });
  }, [users, roleFilter, search]);

  function openCreateModal() {
    setEditingUser(null);
    setFullName('');
    setEmail('');
    setPassword('');
    setNip('');
    setRole('guru');
    setJabatan('');
    setModalOpen(true);
  }

  function openEditModal(u: ManagedUser) {
    setEditingUser(u);
    setFullName(u.full_name);
    setEmail(u.email);
    setPassword('');
    setNip(u.nip ?? '');
    setRole(u.role);
    setJabatan(u.jabatan ?? '');
    setModalOpen(true);
  }

  async function handleSaveUser(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;

    if (!fullName.trim() || !email.trim()) {
      setFeedback({type: 'error', text: 'Nama lengkap dan email wajib diisi.'});
      return;
    }

    if (!editingUser && password.length < 6) {
      setFeedback({type: 'error', text: 'Kata sandi wajib diisi (minimal 6 karakter).'});
      return;
    }

    if (editingUser && password.length > 0 && password.length < 6) {
      setFeedback({type: 'error', text: 'Kata sandi baru minimal 6 karakter.'});
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const endpoint = editingUser
        ? `/api/admin/users/${editingUser.id}`
        : '/api/admin/users';
      const method = editingUser ? 'PATCH' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          password: password || undefined,
          nip: nip.trim() || null,
          role,
          jabatan: jabatan.trim() || null,
        }),
      });

      const payload = await res.json();
      if (!res.ok) {
        setFeedback({type: 'error', text: payload.error || 'Gagal menyimpan user.'});
        setSubmitting(false);
        return;
      }

      setModalOpen(false);
      setFeedback({
        type: 'success',
        text: editingUser
          ? `Akun ${fullName.trim()} berhasil diperbarui dan disinkronkan ke Supabase Authentication.`
          : `Akun ${fullName.trim()} berhasil ditambahkan ke Supabase Authentication.`,
      });
      await loadUsers();
    } catch (err: any) {
      setFeedback({type: 'error', text: err?.message || 'Gagal menghubungi server.'});
    } finally {
      setSubmitting(false);
    }
  }

  async function handleHardDelete() {
    if (!session || !deleteTarget) return;
    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const payload = await res.json();
      if (!res.ok) {
        setFeedback({type: 'error', text: payload.error || 'Gagal menghapus user.'});
      } else {
        setFeedback({
          type: 'success',
          text: `User ${deleteTarget.full_name} (${deleteTarget.email}) berhasil dihapus permanen hingga ke Supabase Authentication.`,
        });
        await loadUsers();
      }
    } catch (err: any) {
      setFeedback({type: 'error', text: err?.message || 'Gagal menghubungi server.'});
    } finally {
      setSubmitting(false);
      setDeleteTarget(null);
    }
  }

  return (
    <AppShell
      title="User Management"
      subtitle="Kelola akun Admin, Guru, dan Tenaga Kependidikan tersinkronisasi penuh dengan Supabase Authentication"
    >
      {config && !config.hasServiceRole && (
        <div className="mb-6 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-sm flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <span>
            <code className="font-mono font-semibold">SUPABASE_SERVICE_ROLE_KEY</code> belum diatur di server. Penambahan, perubahan, dan penghapusan permanen user di Supabase Authentication membutuhkan Service Role Key pada environment server.
          </span>
        </div>
      )}

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
              placeholder="Cari nama, email, atau NIP..."
              className="w-full pl-9 pr-3.5 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-red-700"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as 'Semua' | UserRole)}
            className="px-3.5 py-2 text-sm border border-neutral-300 rounded-lg bg-white focus:outline-none focus:border-red-700"
          >
            <option value="Semua">Semua Role</option>
            <option value="admin">Administrator</option>
            <option value="guru">Guru</option>
            <option value="tenaga_kependidikan">Tenaga Kependidikan</option>
          </select>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-700 hover:bg-red-800 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah User Baru</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-neutral-900">Daftar Akun Pengguna</h2>
          <span className="text-xs text-neutral-500 tabular-nums">{filtered.length} akun</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold text-neutral-500">
                <th className="py-3 px-6">Nama &amp; Email</th>
                <th className="py-3 px-4">NIP</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Jabatan</th>
                <th className="py-3 px-4">Terdaftar</th>
                <th className="py-3 px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-neutral-400">
                    Memuat daftar user dari Supabase Authentication...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-neutral-500">
                    Tidak ada user yang ditemukan.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => {
                  const isSelf = u.id === currentProfile?.id;
                  return (
                    <tr key={u.id} className="hover:bg-neutral-50/70">
                      <td className="py-3 px-6">
                        <p className="font-semibold text-neutral-900">
                          {u.full_name}
                          {isSelf && (
                            <span className="ml-2 text-[11px] font-semibold text-red-700">
                              (Anda)
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-neutral-500">{u.email}</p>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-neutral-600 tabular-nums">
                        {u.nip || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-xs font-semibold ${
                            u.role === 'admin'
                              ? 'text-red-700'
                              : u.role === 'guru'
                                ? 'text-neutral-900'
                                : 'text-neutral-600'
                          }`}
                        >
                          {ROLE_LABELS[u.role]}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-neutral-600">
                        {u.jabatan || '—'}
                      </td>
                      <td className="py-3 px-4 text-xs text-neutral-500 tabular-nums whitespace-nowrap">
                        {formatShortDate(u.created_at)}
                      </td>
                      <td className="py-3 px-6 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(u)}
                            className="p-1.5 text-neutral-500 hover:text-neutral-900 rounded-md hover:bg-neutral-100 cursor-pointer"
                            title="Edit user"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => setDeleteTarget(u)}
                            className="p-1.5 text-neutral-500 hover:text-red-700 disabled:opacity-30 rounded-md hover:bg-red-50 cursor-pointer disabled:cursor-not-allowed"
                            title={isSelf ? 'Tidak dapat menghapus akun sendiri' : 'Hapus permanen user'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit User Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="bg-white rounded-xl border border-neutral-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-neutral-900">
                {editingUser ? 'Edit Data User' : 'Tambah User Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-md text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              <div>
                <label htmlFor="um-name" className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  Nama Lengkap
                </label>
                <input
                  id="um-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Contoh: Ahmad Hidayat, S.Pd"
                  className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-red-700"
                  required
                />
              </div>

              <div>
                <label htmlFor="um-email" className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  Email (Sinkron Supabase Auth)
                </label>
                <input
                  id="um-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ahmad@smkprimaunggul.sch.id"
                  className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-red-700"
                  required
                />
              </div>

              <div>
                <label htmlFor="um-password" className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  {editingUser ? 'Kata Sandi Baru (Kosongkan jika tidak diubah)' : 'Kata Sandi (Min. 6 Karakter)'}
                </label>
                <input
                  id="um-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-red-700"
                  required={!editingUser}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="um-role" className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    Role Akses
                  </label>
                  <select
                    id="um-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white focus:outline-none focus:border-red-700"
                  >
                    <option value="admin">Administrator</option>
                    <option value="guru">Guru</option>
                    <option value="tenaga_kependidikan">Tenaga Kependidikan</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="um-nip" className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    NIP / NUPTK
                  </label>
                  <input
                    id="um-nip"
                    type="text"
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    placeholder="Opsional"
                    className="w-full px-3 py-2 text-sm font-mono border border-neutral-300 rounded-lg focus:outline-none focus:border-red-700"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="um-jabatan" className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  Jabatan / Keterangan Tugas
                </label>
                <input
                  id="um-jabatan"
                  type="text"
                  value={jabatan}
                  onChange={(e) => setJabatan(e.target.value)}
                  placeholder="Contoh: Guru Produktif TKJ / Staf Tata Usaha"
                  className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-red-700"
                />
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
                  <span>{editingUser ? 'Simpan Perubahan' : 'Buat User'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hard Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="bg-white rounded-xl border border-neutral-200 w-full max-w-md p-6">
            <h3 className="text-base font-bold text-neutral-900">
              Hapus Permanen User dari Supabase Authentication?
            </h3>
            <p className="text-sm text-neutral-600 mt-2 leading-relaxed">
              Akun <strong>{deleteTarget.full_name}</strong> ({deleteTarget.email}) akan dihapus permanen (hard delete) dari tabel profil sekaligus dari <strong>Supabase Authentication</strong>. Tindakan ini tidak dapat dibatalkan.
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
                onClick={handleHardDelete}
                className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                {submitting ? 'Menghapus Permanen...' : 'Hapus Permanen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

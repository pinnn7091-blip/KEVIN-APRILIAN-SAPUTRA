import {useEffect, useState} from 'react';
import {Check, CheckCircle2, Copy, Database, Download, RefreshCw, X, XCircle} from 'lucide-react';

interface TableStatus {
  name: string;
  relation: string;
  exists: boolean;
  count: number;
  error?: string;
}

interface DbStatusResponse {
  envReady: boolean;
  configured: boolean;
  hasServiceRole: boolean;
  missingVars: string[];
  schemaReady: boolean;
  tables: TableStatus[];
}

interface DatabaseRelationModalProps {
  open: boolean;
  onClose: () => void;
}

export default function DatabaseRelationModal({open, onClose}: DatabaseRelationModalProps) {
  const [status, setStatus] = useState<DbStatusResponse | null>(null);
  const [schemaSql, setSchemaSql] = useState('');
  const [seedSql, setSeedSql] = useState('');
  const [activeTab, setActiveTab] = useState<'relations' | 'schema' | 'seed'>('relations');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function fetchAll() {
    setLoading(true);
    try {
      const [statusRes, sqlRes] = await Promise.all([
        fetch('/api/db/status'),
        fetch('/api/db/schema'),
      ]);
      if (statusRes.ok) {
        setStatus(await statusRes.json());
      }
      if (sqlRes.ok) {
        const sqlData = await sqlRes.json();
        setSchemaSql(sqlData.schemaSql ?? '');
        setSeedSql(sqlData.seedSql ?? '');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) {
      fetchAll();
    }
  }, [open]);

  if (!open) return null;

  const displayedSql = activeTab === 'seed' ? seedSql : schemaSql;

  async function handleCopy() {
    if (!displayedSql) return;
    await navigator.clipboard.writeText(displayedSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload(filename: string, content: string) {
    const blob = new Blob([content], {type: 'text/sql;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl border border-neutral-200 w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-red-700" />
            <div>
              <h2 className="text-base font-bold text-neutral-900">
                Skema &amp; Relasi Database Supabase
              </h2>
              <p className="text-xs text-neutral-500">
                Struktur relasional PostgreSQL terhubung ke Supabase Authentication
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-3 border-b border-neutral-200 flex items-center justify-between gap-4 bg-neutral-50">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('relations')}
              className={`px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === 'relations'
                  ? 'border-red-700 text-red-700'
                  : 'border-transparent text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Status &amp; Relasi Tabel
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('schema')}
              className={`px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === 'schema'
                  ? 'border-red-700 text-red-700'
                  : 'border-transparent text-neutral-600 hover:text-neutral-900'
              }`}
            >
              SQL Schema (schema.sql)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('seed')}
              className={`px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === 'seed'
                  ? 'border-red-700 text-red-700'
                  : 'border-transparent text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Seed Data Siswa (seed.sql)
            </button>
          </div>

          <button
            type="button"
            onClick={fetchAll}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 mb-1 text-xs font-semibold text-neutral-700 hover:text-red-700 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Periksa Ulang</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {activeTab === 'relations' ? (
            <>
              <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50 text-xs text-neutral-700 space-y-1.5">
                <p className="font-bold text-neutral-900 text-sm">Peta Relasi Foreign Key (ERD)</p>
                <p className="font-mono">auth.users(id) &lt;── 1:1 ── public.profiles(id)</p>
                <p className="font-mono">public.profiles(id) &lt;── 1:N ── public.employee_attendance(user_id)</p>
                <p className="font-mono">public.majors(code) &lt;── 1:N ── public.classes(jurusan_code)</p>
                <p className="font-mono">public.majors(code) &amp; public.classes(id) &lt;── 1:N ── public.students(jurusan, class_id)</p>
                <p className="font-mono">public.students(id) &amp; public.profiles(id) &lt;── 1:N ── public.student_attendance(student_id, recorded_by)</p>
              </div>

              {status && !status.envReady && (
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-xs text-amber-900">
                  <p className="font-bold">Environment Variable Belum Terpasang</p>
                  <p className="mt-1">
                    Variabel yang dibutuhkan di Secrets / <code className="font-mono">.env</code>:{' '}
                    <span className="font-mono font-semibold">{status.missingVars.join(', ')}</span>.
                  </p>
                </div>
              )}

              <div className="border border-neutral-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-semibold">
                      <th className="py-2.5 px-4">Tabel Supabase</th>
                      <th className="py-2.5 px-4">Relasi Utama</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4 text-right">Baris</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {(status?.tables ?? []).map((tbl) => (
                      <tr key={tbl.name}>
                        <td className="py-2.5 px-4 font-mono font-semibold text-neutral-900">
                          public.{tbl.name}
                        </td>
                        <td className="py-2.5 px-4 text-neutral-600">{tbl.relation}</td>
                        <td className="py-2.5 px-4">
                          {tbl.exists ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Terhubung</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-semibold text-red-700">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Belum Ada</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-neutral-700">
                          {tbl.exists ? tbl.count : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-neutral-600">
                  Salin lalu jalankan di <strong>Supabase Dashboard &rarr; SQL Editor</strong>.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Tersalin' : 'Salin SQL'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleDownload(
                        activeTab === 'seed' ? 'seed.sql' : 'schema.sql',
                        displayedSql,
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-neutral-300 hover:border-red-700 text-neutral-700 hover:text-red-700 text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh .sql</span>
                  </button>
                </div>
              </div>

              <pre className="p-4 rounded-xl bg-neutral-950 text-neutral-100 text-xs font-mono overflow-x-auto max-h-[48vh] leading-relaxed">
                {displayedSql || 'Memuat SQL...'}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

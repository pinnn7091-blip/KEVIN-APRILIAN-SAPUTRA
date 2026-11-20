import {useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowRight, Building2, CheckCircle2, Clock, GraduationCap, Monitor, ShieldCheck} from 'lucide-react';
import {JURUSAN_LIST} from '../types/app';

const CAMPUS_HERO_IMG = '/src/assets/images/hero_campus_smk_clean_1795061389274.jpg';
const LAB_TKJ_DKV_IMG = '/src/assets/images/lab_tkj_dkv_1795061375130.jpg';
const STUDIO_BC_AK_IMG = '/src/assets/images/studio_bc_ak_1795061374619.jpg';

type BidangFilter = 'Semua' | 'Teknologi Informasi & Komunikasi' | 'Bisnis & Manajemen' | 'Seni & Produksi Media';

const BIDANG_KEAHLIAN = [
  {
    index: '01',
    title: 'Teknologi Informasi & Komunikasi',
    majors: 'TKJ · DKV',
    description:
      'Menyiapkan tenaga ahli infrastruktur jaringan komputer, server, keamanan siber dasar, serta perancang komunikasi visual dan antarmuka digital.',
  },
  {
    index: '02',
    title: 'Bisnis & Manajemen',
    majors: 'AK · MPLB · BD',
    description:
      'Membentuk profesional tata kelola keuangan entitas usaha, administrasi perkantoran modern, layanan pelanggan, serta strategi pemasaran digital.',
  },
  {
    index: '03',
    title: 'Seni & Produksi Media',
    majors: 'BC',
    description:
      'Mengembangkan kompetensi sinematografi, produksi penyiaran multi-kamera, tata cahaya studio, dan penyuntingan audio-video standar industri.',
  },
];

export default function LandingPage() {
  const [selectedBidang, setSelectedBidang] = useState<BidangFilter>('Semua');
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [labImgFailed, setLabImgFailed] = useState(false);
  const [studioImgFailed, setStudioImgFailed] = useState(false);

  const filteredJurusan =
    selectedBidang === 'Semua'
      ? JURUSAN_LIST
      : JURUSAN_LIST.filter((j) => j.bidang === selectedBidang);

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      {/* Top Navigation Bar - Strict 3-zone contract */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <Link
            to="/"
            className="text-lg font-extrabold tracking-tight text-neutral-900 whitespace-nowrap shrink-0 flex items-center gap-2.5"
          >
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-red-700 text-white text-xs font-bold">
              PU
            </span>
            <span>SMK Prima Unggul</span>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-neutral-600">
            <a href="#profil" className="hover:text-red-700 transition-colors whitespace-nowrap shrink-0">
              Profil Sekolah
            </a>
            <a href="#jurusan" className="hover:text-red-700 transition-colors whitespace-nowrap shrink-0">
              Program Keahlian
            </a>
            <a href="#fasilitas" className="hover:text-red-700 transition-colors whitespace-nowrap shrink-0">
              Fasilitas
            </a>
            <a href="#sistem-absensi" className="hover:text-red-700 transition-colors whitespace-nowrap shrink-0">
              Sistem Absensi
            </a>
          </nav>

          <div className="shrink-0">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-700 rounded-lg hover:bg-red-800 transition-colors whitespace-nowrap shrink-0"
            >
              <span>Portal Absensi</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="border-b border-neutral-200 bg-neutral-50/50">
        <div className="max-w-7xl mx-auto px-6 py-14 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-neutral-500 mb-5">
                <span className="text-red-700 font-semibold">Sekolah Menengah Kejuruan</span>
                <span aria-hidden="true">·</span>
                <span>Terakreditasi A</span>
                <span aria-hidden="true">·</span>
                <span>3 Bidang &amp; 6 Kompetensi Keahlian</span>
              </div>

              <h1
                className="text-4xl lg:text-[3.25rem] font-extrabold tracking-tight text-neutral-900 leading-[1.1] mb-6"
                style={{textWrap: 'balance'}}
              >
                Mencetak Lulusan Vokasi Siap Kerja, Kreatif, dan Berkarakter Unggul.
              </h1>

              <p className="text-base lg:text-lg text-neutral-600 leading-relaxed mb-8 max-w-xl">
                SMK Prima Unggul memadukan pembelajaran praktik industri pada jurusan{' '}
                <strong className="font-semibold text-neutral-900">TKJ, DKV, AK, BC, MPLB, dan BD</strong>{' '}
                dengan tata kelola kedisiplinan digital yang terintegrasi untuk seluruh siswa, guru, dan tenaga kependidikan.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2.5 px-6 py-3 text-sm font-semibold text-white bg-red-700 rounded-lg hover:bg-red-800 transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Masuk Portal Absensi</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="#jurusan"
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-neutral-800 bg-white border border-neutral-300 rounded-lg hover:border-red-700 hover:text-red-700 transition-colors whitespace-nowrap shrink-0"
                >
                  Lihat Program Keahlian
                </a>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="h-full min-h-[320px] lg:min-h-[420px] rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100">
                {!heroImgFailed ? (
                  <img
                    src={CAMPUS_HERO_IMG}
                    alt="Gedung Kampus Modern SMK Prima Unggul"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-red-50 via-white to-neutral-100">
                    <Building2 className="w-12 h-12 text-red-700 mb-3" />
                    <p className="text-sm font-semibold text-neutral-800">Kampus SMK Prima Unggul</p>
                    <p className="text-xs text-neutral-500 mt-1">Pendidikan Vokasi Berbasis Industri</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4-column Institutional Strip below Hero */}
          <div className="mt-12 pt-10 border-t border-neutral-200 grid grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <p className="text-3xl font-extrabold text-red-700 tabular-nums">3 Bidang</p>
              <p className="text-sm font-medium text-neutral-700 mt-1">Rumpun Jurusan Utama</p>
              <p className="text-xs text-neutral-500 mt-0.5">Teknologi, Bisnis, dan Media</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-neutral-900 tabular-nums">6 Jurusan</p>
              <p className="text-sm font-medium text-neutral-700 mt-1">Kompetensi Keahlian Aktif</p>
              <p className="text-xs text-neutral-500 mt-0.5">TKJ, DKV, AK, BC, MPLB, BD</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-neutral-900 tabular-nums">70%</p>
              <p className="text-sm font-medium text-neutral-700 mt-1">Porsi Praktik Kejuruan</p>
              <p className="text-xs text-neutral-500 mt-0.5">Studio &amp; Lab Berstandar Industri</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-neutral-900 tabular-nums">3 Peran</p>
              <p className="text-sm font-medium text-neutral-700 mt-1">Akses Portal Kehadiran</p>
              <p className="text-xs text-neutral-500 mt-0.5">Admin, Guru, Tenaga Kependidikan</p>
            </div>
          </div>
        </div>
      </section>

      {/* Profil Sekolah & 3 Bidang Keahlian */}
      <section id="profil" className="py-16 lg:py-24 border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-14">
            <div className="lg:col-span-5">
              <p className="text-xs font-semibold text-red-700 tracking-wide mb-3">
                Profil SMK Prima Unggul
              </p>
              <h2
                className="text-3xl font-extrabold tracking-tight text-neutral-900 leading-tight"
                style={{textWrap: 'balance'}}
              >
                Pendidikan Kejuruan Terstruktur dalam 3 Bidang Keahlian Strategis.
              </h2>
            </div>
            <div className="lg:col-span-7 flex flex-col justify-center">
              <p className="text-base text-neutral-600 leading-relaxed">
                SMK Prima Unggul adalah lembaga pendidikan menengah kejuruan yang berfokus pada penguasaan keterampilan teknis, etos kerja profesional, dan kesiapan berwirausaha. Seluruh proses belajar mengajar disusun dalam 3 rumpun bidang keahlian yang menaungi 6 kompetensi keahlian unggulan agar siswa mendapatkan pendampingan intensif sesuai minat karier masing-masing.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {BIDANG_KEAHLIAN.map((item) => (
              <div
                key={item.index}
                className="p-7 rounded-xl border border-neutral-200 bg-white flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-neutral-500 mb-4">
                    <span className="text-red-700 tabular-nums">{item.index}.</span>
                    <span>{item.majors}</span>
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900 mb-3">{item.title}</h3>
                  <p className="text-sm text-neutral-600 leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6 Program Keahlian (TKJ, DKV, AK, BC, MPLB, BD) */}
      <section id="jurusan" className="py-16 lg:py-24 bg-neutral-50/70 border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
            <div>
              <p className="text-xs font-semibold text-red-700 mb-2">Kompetensi Keahlian</p>
              <h2 className="text-3xl font-extrabold tracking-tight text-neutral-900">
                Enam Jurusan Unggulan SMK Prima Unggul
              </h2>
            </div>

            {/* Interactive Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-neutral-200/70 rounded-lg">
              {(
                [
                  'Semua',
                  'Teknologi Informasi & Komunikasi',
                  'Bisnis & Manajemen',
                  'Seni & Produksi Media',
                ] as BidangFilter[]
              ).map((bidang) => (
                <button
                  key={bidang}
                  type="button"
                  onClick={() => setSelectedBidang(bidang)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    selectedBidang === bidang
                      ? 'bg-red-700 text-white'
                      : 'text-neutral-700 hover:text-neutral-900'
                  }`}
                >
                  {bidang === 'Teknologi Informasi & Komunikasi'
                    ? 'Teknologi Informasi'
                    : bidang === 'Seni & Produksi Media'
                      ? 'Seni & Media'
                      : bidang}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredJurusan.map((jurusan) => (
              <div
                key={jurusan.code}
                className="p-6 rounded-xl border border-neutral-200 bg-white flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs text-neutral-500 mb-3">
                    <span className="font-mono font-bold text-red-700">{jurusan.code}</span>
                    <span aria-hidden="true">·</span>
                    <span className="truncate">{jurusan.bidang}</span>
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900 mb-2.5">{jurusan.name}</h3>
                  <p className="text-sm text-neutral-600 leading-relaxed">{jurusan.summary}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fasilitas Praktik */}
      <section id="fasilitas" className="py-16 lg:py-24 border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-12">
            <p className="text-xs font-semibold text-red-700 mb-2">Fasilitas Pembelajaran</p>
            <h2 className="text-3xl font-extrabold tracking-tight text-neutral-900 mb-3">
              Lingkungan Praktik yang Menyerupai Dunia Kerja Nyata
            </h2>
            <p className="text-base text-neutral-600">
              Setiap kompetensi keahlian dilengkapi ruang praktik khusus, perangkat kerja mutakhir, dan pendampingan instruktur berpengalaman.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="rounded-xl border border-neutral-200 overflow-hidden bg-white">
              <div className="aspect-[4/3] bg-neutral-100 overflow-hidden">
                {!labImgFailed ? (
                  <img
                    src={LAB_TKJ_DKV_IMG}
                    alt="Laboratorium Komputer TKJ dan Studio Desain DKV SMK Prima Unggul"
                    referrerPolicy="no-referrer"
                    onError={() => setLabImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-neutral-100">
                    <Monitor className="w-10 h-10 text-red-700 mb-2" />
                    <span className="text-sm font-semibold text-neutral-700">
                      Laboratorium TKJ &amp; Studio DKV
                    </span>
                  </div>
                )}
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 text-xs text-neutral-500 mb-2">
                  <span className="text-red-700 font-semibold">TKJ · DKV · BD</span>
                  <span aria-hidden="true">·</span>
                  <span>Gedung Inovasi Lantai 2</span>
                </div>
                <h3 className="text-lg font-bold text-neutral-900 mb-2">
                  Laboratorium Jaringan, Desain Grafis, dan Bisnis Digital
                </h3>
                <p className="text-sm text-neutral-600 leading-relaxed">
                  Dilengkapi ruang server terpisah, stasiun kerja grafis berlayar lebar, serta perangkat simulasi topologi jaringan perusahaan.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-neutral-200 overflow-hidden bg-white">
              <div className="aspect-[4/3] bg-neutral-100 overflow-hidden">
                {!studioImgFailed ? (
                  <img
                    src={STUDIO_BC_AK_IMG}
                    alt="Studio Broadcasting dan Produksi Media SMK Prima Unggul"
                    referrerPolicy="no-referrer"
                    onError={() => setStudioImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-neutral-100">
                    <GraduationCap className="w-10 h-10 text-red-700 mb-2" />
                    <span className="text-sm font-semibold text-neutral-700">
                      Studio Broadcasting &amp; Bisnis
                    </span>
                  </div>
                )}
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 text-xs text-neutral-500 mb-2">
                  <span className="text-red-700 font-semibold">BC · AK · MPLB</span>
                  <span aria-hidden="true">·</span>
                  <span>Gedung Vokasi Terpadu</span>
                </div>
                <h3 className="text-lg font-bold text-neutral-900 mb-2">
                  Studio Penyiaran Multi-Kamera &amp; Perkantoran Mini
                </h3>
                <p className="text-sm text-neutral-600 leading-relaxed">
                  Ruang produksi kedap suara dengan tata cahaya studio profesional serta laboratorium simulasi administrasi perkantoran dan akuntansi.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sistem Absensi Digital */}
      <section id="sistem-absensi" className="py-16 lg:py-24 bg-neutral-950 text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7">
              <p className="text-xs font-semibold text-red-400 mb-3">
                Sistem Informasi Kehadiran
              </p>
              <h2
                className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight mb-5"
                style={{textWrap: 'balance'}}
              >
                Portal Absensi Siswa dan Karyawan Terintegrasi dalam Satu Sistem.
              </h2>
              <p className="text-base text-neutral-300 leading-relaxed mb-8 max-w-2xl">
                Dirancang khusus untuk tata kelola harian SMK Prima Unggul dengan pemisahan hak akses yang jelas bagi Administrator, Guru, dan Tenaga Kependidikan.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
                <div className="p-4 rounded-lg border border-neutral-800 bg-neutral-900/70">
                  <ShieldCheck className="w-5 h-5 text-red-400 mb-2.5" />
                  <h3 className="text-sm font-bold text-white mb-1">Administrator</h3>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Kelola user terhubung autentikasi, master data siswa, dan rekap kehadiran lengkap.
                  </p>
                </div>
                <div className="p-4 rounded-lg border border-neutral-800 bg-neutral-900/70">
                  <CheckCircle2 className="w-5 h-5 text-red-400 mb-2.5" />
                  <h3 className="text-sm font-bold text-white mb-1">Guru</h3>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Absensi mandiri harian, pencatatan presensi siswa per kelas, dan rekap absensi siswa.
                  </p>
                </div>
                <div className="p-4 rounded-lg border border-neutral-800 bg-neutral-900/70">
                  <Clock className="w-5 h-5 text-red-400 mb-2.5" />
                  <h3 className="text-sm font-bold text-white mb-1">Tenaga Kependidikan</h3>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Pencatatan jam masuk, jam pulang, dan riwayat kehadiran pribadi secara mandiri.
                  </p>
                </div>
              </div>

              <Link
                to="/login"
                className="inline-flex items-center gap-2.5 px-6 py-3 text-sm font-semibold text-white bg-red-700 rounded-lg hover:bg-red-600 transition-colors whitespace-nowrap shrink-0"
              >
                <span>Masuk ke Portal /app</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="lg:col-span-5">
              <div className="p-7 rounded-xl border border-neutral-800 bg-neutral-900">
                <h3 className="text-base font-bold text-white mb-4">Alur Operasional Harian</h3>
                <ol className="space-y-4 text-sm text-neutral-300">
                  <li className="flex gap-3">
                    <span className="font-mono text-xs font-bold text-red-400 mt-0.5 tabular-nums">01</span>
                    <div>
                      <p className="font-semibold text-white">Autentikasi Akun Terotorisasi</p>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Pengguna masuk melalui halaman /login sesuai role yang ditetapkan Administrator.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-mono text-xs font-bold text-red-400 mt-0.5 tabular-nums">02</span>
                    <div>
                      <p className="font-semibold text-white">Absensi Mandiri Karyawan</p>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Seluruh role (Admin, Guru, Tenaga Kependidikan) mencatat kehadiran harian secara mandiri.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-mono text-xs font-bold text-red-400 mt-0.5 tabular-nums">03</span>
                    <div>
                      <p className="font-semibold text-white">Presensi Siswa &amp; Rekapitulasi</p>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Guru mencatat kehadiran siswa per kelas dan mengunduh rekap absensi kapan saja.
                      </p>
                    </div>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="bg-white border-t border-neutral-200 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-neutral-500">
          <div>
            <p className="font-bold text-neutral-900 text-sm">SMK Prima Unggul</p>
            <p className="mt-1">
              Kompetensi Keahlian: TKJ · DKV · AK · BC · MPLB · BD
            </p>
          </div>
          <div className="flex items-center gap-6">
            <a href="#profil" className="hover:text-neutral-900">Profil</a>
            <a href="#jurusan" className="hover:text-neutral-900">Jurusan</a>
            <Link to="/login" className="text-red-700 font-semibold hover:text-red-800">
              Masuk Portal
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

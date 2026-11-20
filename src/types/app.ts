export type UserRole = 'admin' | 'guru' | 'tenaga_kependidikan';

export type JurusanCode = 'TKJ' | 'DKV' | 'AK' | 'BC' | 'MPLB' | 'BD';

export type EmployeeAttendanceStatus = 'Hadir' | 'Terlambat' | 'Izin' | 'Sakit' | 'Alpa';

export type StudentAttendanceStatus = 'Hadir' | 'Izin' | 'Sakit' | 'Alpa';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  nip: string | null;
  role: UserRole;
  jabatan: string | null;
  created_at: string;
  updated_at?: string;
}

export interface ManagedUser extends UserProfile {
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
}

export interface Student {
  id: string;
  nis: string;
  nama: string;
  kelas: string;
  jurusan: JurusanCode;
  created_at: string;
  updated_at?: string;
}

export interface EmployeeAttendance {
  id: string;
  user_id: string;
  tanggal: string;
  jam_masuk: string | null;
  jam_keluar: string | null;
  status: EmployeeAttendanceStatus;
  keterangan: string | null;
  created_at: string;
  profiles?: Pick<UserProfile, 'full_name' | 'email' | 'nip' | 'role' | 'jabatan'>;
}

export interface StudentAttendance {
  id: string;
  student_id: string;
  recorded_by: string | null;
  tanggal: string;
  status: StudentAttendanceStatus;
  keterangan: string | null;
  created_at: string;
  students?: Pick<Student, 'nis' | 'nama' | 'kelas' | 'jurusan'>;
  recorder?: Pick<UserProfile, 'full_name' | 'role'> | null;
}

export interface AppRuntimeConfig {
  configured: boolean;
  hasServiceRole: boolean;
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
  missingVars: string[];
}

export const JURUSAN_LIST: {
  code: JurusanCode;
  name: string;
  bidang: string;
  summary: string;
}[] = [
  {
    code: 'TKJ',
    name: 'Teknik Komputer dan Jaringan',
    bidang: 'Teknologi Informasi & Komunikasi',
    summary: 'Administrasi server, infrastruktur jaringan fiber optik, keamanan siber dasar, dan layanan cloud.',
  },
  {
    code: 'DKV',
    name: 'Desain Komunikasi Visual',
    bidang: 'Teknologi Informasi & Komunikasi',
    summary: 'Identitas merek, tipografi editorial, ilustrasi vektor, fotografi komersial, dan desain antarmuka digital.',
  },
  {
    code: 'BC',
    name: 'Broadcasting dan Perfilman',
    bidang: 'Seni & Produksi Media',
    summary: 'Tata kamera sinematografi, penyutradaraan, penyiaran studio multi-kamera, dan penyuntingan pascaproduksi.',
  },
  {
    code: 'AK',
    name: 'Akuntansi',
    bidang: 'Bisnis & Manajemen',
    summary: 'Pembukuan keuangan entitas usaha, perpajakan terapan, audit internal dasar, dan sistem akuntansi komputer.',
  },
  {
    code: 'MPLB',
    name: 'Manajemen Perkantoran dan Layanan Bisnis',
    bidang: 'Bisnis & Manajemen',
    summary: 'Korespondensi eksekutif, kearsipan digital, tata kelola administrasi terpadu, dan layanan pelanggan profesional.',
  },
  {
    code: 'BD',
    name: 'Bisnis Digital',
    bidang: 'Bisnis & Manajemen',
    summary: 'Strategi perdagangan elektronik, analitik pemasaran digital, pengelolaan katalog, dan pengembangan usaha rintisan.',
  },
];

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  guru: 'Guru',
  tenaga_kependidikan: 'Tenaga Kependidikan',
};

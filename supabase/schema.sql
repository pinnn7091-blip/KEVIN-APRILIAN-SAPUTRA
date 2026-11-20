-- ============================================================================
-- SMK PRIMA UNGGUL - SKEMA DATABASE RELASIONAL SUPABASE
-- Jalankan seluruh script ini pada Supabase Dashboard -> SQL Editor
-- ============================================================================

create extension if not exists pgcrypto;

-- 1. Tabel Master Bidang & Kompetensi Keahlian (Jurusan)
create table if not exists public.majors (
  code text primary key check (code in ('TKJ', 'DKV', 'AK', 'BC', 'MPLB', 'BD')),
  name text not null,
  bidang text not null,
  created_at timestamptz not null default now()
);

insert into public.majors (code, name, bidang) values
  ('TKJ', 'Teknik Komputer dan Jaringan', 'Teknologi Informasi & Komunikasi'),
  ('DKV', 'Desain Komunikasi Visual', 'Teknologi Informasi & Komunikasi'),
  ('BC', 'Broadcasting dan Perfilman', 'Seni & Produksi Media'),
  ('AK', 'Akuntansi', 'Bisnis & Manajemen'),
  ('MPLB', 'Manajemen Perkantoran dan Layanan Bisnis', 'Bisnis & Manajemen'),
  ('BD', 'Bisnis Digital', 'Bisnis & Manajemen')
on conflict (code) do update
set
  name = excluded.name,
  bidang = excluded.bidang;

-- 2. Tabel Profil Karyawan / User (Relasi 1:1 dengan auth.users Supabase)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  nip text,
  role text not null default 'tenaga_kependidikan'
    check (role in ('admin', 'guru', 'tenaga_kependidikan')),
  jabatan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Tabel Kelas (Berelasi ke majors dan optional wali_kelas di profiles)
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  nama_kelas text not null unique,
  jurusan_code text not null references public.majors(code) on update cascade on delete restrict,
  wali_kelas_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 4. Tabel Data Siswa (Berelasi ke majors dan classes)
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  nis text not null unique,
  nama text not null,
  kelas text not null,
  jurusan text not null references public.majors(code) on update cascade on delete restrict,
  class_id uuid references public.classes(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.students
  add column if not exists class_id uuid references public.classes(id) on delete set null;

-- 5. Tabel Absensi Karyawan (Berelasi N:1 ke profiles)
create table if not exists public.employee_attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tanggal date not null default current_date,
  jam_masuk timestamptz,
  jam_keluar timestamptz,
  status text not null default 'Hadir'
    check (status in ('Hadir', 'Terlambat', 'Izin', 'Sakit', 'Alpa')),
  keterangan text,
  created_at timestamptz not null default now(),
  unique(user_id, tanggal)
);

-- 6. Tabel Absensi Siswa (Berelasi N:1 ke students & recorded_by ke profiles)
create table if not exists public.student_attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  recorded_by uuid references public.profiles(id) on delete set null,
  tanggal date not null default current_date,
  status text not null default 'Hadir'
    check (status in ('Hadir', 'Izin', 'Sakit', 'Alpa')),
  keterangan text,
  created_at timestamptz not null default now(),
  unique(student_id, tanggal)
);

-- ============================================================================
-- INDEXES UNTUK PERFORMA QUERY RELASIONAL
-- ============================================================================
create index if not exists idx_students_kelas on public.students(kelas);
create index if not exists idx_students_jurusan on public.students(jurusan);
create index if not exists idx_students_class_id on public.students(class_id);
create index if not exists idx_emp_att_user_date on public.employee_attendance(user_id, tanggal desc);
create index if not exists idx_emp_att_date on public.employee_attendance(tanggal desc);
create index if not exists idx_stu_att_student_date on public.student_attendance(student_id, tanggal desc);
create index if not exists idx_stu_att_date on public.student_attendance(tanggal desc);
create index if not exists idx_stu_att_recorder on public.student_attendance(recorded_by);

-- ============================================================================
-- TRIGGER RELASI OTOMATIS: Sinkronisasi Kelas saat Insert/Update Siswa
-- ============================================================================
create or replace function public.sync_student_class()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_class_id uuid;
begin
  new.kelas := upper(trim(new.kelas));

  insert into public.classes (nama_kelas, jurusan_code)
  values (new.kelas, new.jurusan)
  on conflict (nama_kelas) do update
  set jurusan_code = excluded.jurusan_code
  returning id into resolved_class_id;

  new.class_id := resolved_class_id;
  return new;
end;
$$;

drop trigger if exists trg_sync_student_class on public.students;
create trigger trg_sync_student_class
  before insert or update on public.students
  for each row execute function public.sync_student_class();

-- ============================================================================
-- TRIGGER OTOMATIS: User Pertama di Supabase Auth Menjadi Role 'admin'
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_count integer;
  assigned_role text;
begin
  select count(*) into existing_count from public.profiles;

  if existing_count = 0 then
    assigned_role := 'admin';
  else
    assigned_role := coalesce(
      nullif(new.raw_user_meta_data ->> 'role', ''),
      'tenaga_kependidikan'
    );
  end if;

  if assigned_role not in ('admin', 'guru', 'tenaga_kependidikan') then
    assigned_role := 'tenaga_kependidikan';
  end if;

  insert into public.profiles (id, email, full_name, nip, role, jabatan)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(coalesce(new.email, 'User'), '@', 1)),
    nullif(new.raw_user_meta_data ->> 'nip', ''),
    assigned_role,
    nullif(new.raw_user_meta_data ->> 'jabatan', '')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    role = case when public.profiles.role = 'admin' and existing_count = 0 then 'admin' else excluded.role end,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- VIEWS RELASIONAL UNTUK PELAPORAN LANGSUNG
-- ============================================================================
create or replace view public.v_rekap_absensi_karyawan as
select
  ea.id,
  ea.tanggal,
  ea.jam_masuk,
  ea.jam_keluar,
  ea.status,
  ea.keterangan,
  p.id as user_id,
  p.full_name,
  p.email,
  p.nip,
  p.role,
  p.jabatan
from public.employee_attendance ea
join public.profiles p on p.id = ea.user_id;

create or replace view public.v_rekap_absensi_siswa as
select
  sa.id,
  sa.tanggal,
  sa.status,
  sa.keterangan,
  s.id as student_id,
  s.nis,
  s.nama as nama_siswa,
  s.kelas,
  s.jurusan,
  m.name as nama_jurusan,
  m.bidang as bidang_keahlian,
  rec.full_name as dicatat_oleh,
  rec.role as role_pencatat
from public.student_attendance sa
join public.students s on s.id = sa.student_id
join public.majors m on m.code = s.jurusan
left join public.profiles rec on rec.id = sa.recorded_by;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) HELPERS & POLICIES
-- ============================================================================
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

alter table public.majors enable row level security;
alter table public.classes enable row level security;
alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.employee_attendance enable row level security;
alter table public.student_attendance enable row level security;

-- Policies: majors (dapat dibaca oleh seluruh user terautentikasi)
drop policy if exists "Authenticated users can read majors" on public.majors;
create policy "Authenticated users can read majors"
  on public.majors for select
  to authenticated
  using (true);

-- Policies: classes
drop policy if exists "Authenticated staff can read classes" on public.classes;
create policy "Authenticated staff can read classes"
  on public.classes for select
  to authenticated
  using (public.current_user_role() in ('admin', 'guru'));

drop policy if exists "Admin can manage classes" on public.classes;
create policy "Admin can manage classes"
  on public.classes for all
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- Policies: profiles
drop policy if exists "Authenticated users can read profiles" on public.profiles;
create policy "Authenticated users can read profiles"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "Admin can manage all profiles" on public.profiles;
create policy "Admin can manage all profiles"
  on public.profiles for all
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

drop policy if exists "Users can update own profile name" on public.profiles;
drop policy if exists "Users can update own profile without changing role" on public.profiles;
create policy "Users can update own profile without changing role"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id and role = public.current_user_role());

-- Policies: students
drop policy if exists "Authenticated staff can read students" on public.students;
create policy "Authenticated staff can read students"
  on public.students for select
  to authenticated
  using (public.current_user_role() in ('admin', 'guru'));

drop policy if exists "Admin can manage students" on public.students;
create policy "Admin can manage students"
  on public.students for all
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- Policies: employee_attendance
drop policy if exists "Users can view own or admin views all employee attendance" on public.employee_attendance;
create policy "Users can view own or admin views all employee attendance"
  on public.employee_attendance for select
  to authenticated
  using (user_id = auth.uid() or public.current_user_role() = 'admin');

drop policy if exists "Users can insert own employee attendance" on public.employee_attendance;
create policy "Users can insert own employee attendance"
  on public.employee_attendance for insert
  to authenticated
  with check (user_id = auth.uid() or public.current_user_role() = 'admin');

drop policy if exists "Users can update own employee attendance" on public.employee_attendance;
create policy "Users can update own employee attendance"
  on public.employee_attendance for update
  to authenticated
  using (user_id = auth.uid() or public.current_user_role() = 'admin')
  with check (user_id = auth.uid() or public.current_user_role() = 'admin');

drop policy if exists "Admin can delete employee attendance" on public.employee_attendance;
create policy "Admin can delete employee attendance"
  on public.employee_attendance for delete
  to authenticated
  using (public.current_user_role() = 'admin');

-- Policies: student_attendance
drop policy if exists "Admin and guru can read student attendance" on public.student_attendance;
create policy "Admin and guru can read student attendance"
  on public.student_attendance for select
  to authenticated
  using (public.current_user_role() in ('admin', 'guru'));

drop policy if exists "Admin and guru can insert student attendance" on public.student_attendance;
create policy "Admin and guru can insert student attendance"
  on public.student_attendance for insert
  to authenticated
  with check (public.current_user_role() in ('admin', 'guru'));

drop policy if exists "Admin and guru can update student attendance" on public.student_attendance;
create policy "Admin and guru can update student attendance"
  on public.student_attendance for update
  to authenticated
  using (public.current_user_role() in ('admin', 'guru'))
  with check (public.current_user_role() in ('admin', 'guru'));

drop policy if exists "Admin can delete student attendance" on public.student_attendance;
create policy "Admin can delete student attendance"
  on public.student_attendance for delete
  to authenticated
  using (public.current_user_role() = 'admin');

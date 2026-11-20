-- ============================================================================
-- DATA AWAL (SEED) SISWA SMK PRIMA UNGGUL (6 JURUSAN: TKJ, DKV, AK, BC, MPLB, BD)
-- Jalankan setelah supabase/schema.sql dieksekusi
-- ============================================================================

insert into public.students (nis, nama, kelas, jurusan) values
  ('20261001', 'Ahmad Fauzan', 'X TKJ 1', 'TKJ'),
  ('20261002', 'Nadia Putri Pratama', 'X TKJ 1', 'TKJ'),
  ('20261003', 'Rizky Ramadhan', 'X DKV 1', 'DKV'),
  ('20261004', 'Siti Aisyah Lestari', 'X DKV 1', 'DKV'),
  ('20261005', 'Dimas Aditya', 'X BC 1', 'BC'),
  ('20261006', 'Kirana Maharani', 'X BC 1', 'BC'),
  ('20261007', 'Bagas Saputra', 'X AK 1', 'AK'),
  ('20261008', 'Dewi Anggraini', 'X AK 1', 'AK'),
  ('20261009', 'Fajar Nugroho', 'X MPLB 1', 'MPLB'),
  ('20261010', 'Rani Kusumawardani', 'X MPLB 1', 'MPLB'),
  ('20261011', 'Yoga Pratama', 'X BD 1', 'BD'),
  ('20261012', 'Tania Salsabila', 'X BD 1', 'BD')
on conflict (nis) do update
set
  nama = excluded.nama,
  kelas = excluded.kelas,
  jurusan = excluded.jurusan;

import 'dotenv/config';
import express, {type NextFunction, type Request, type Response} from 'express';
import {createClient, type SupabaseClient, type User} from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

function getSupabaseEnv() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  const missingVars: string[] = [];
  if (!supabaseUrl) missingVars.push('SUPABASE_URL');
  if (!supabaseAnonKey) missingVars.push('SUPABASE_ANON_KEY');
  if (!supabaseServiceRoleKey) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');

  return {
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceRoleKey,
    configured: Boolean(supabaseUrl && supabaseAnonKey),
    hasServiceRole: Boolean(supabaseUrl && supabaseServiceRoleKey),
    missingVars,
  };
}

function createSupabaseAdmin(): SupabaseClient | null {
  const {supabaseUrl, supabaseServiceRoleKey} = getSupabaseEnv();
  if (!supabaseUrl || !supabaseServiceRoleKey) return null;
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7).trim();
}

interface AuthenticatedRequest extends Request {
  authUser?: User;
  authRole?: string;
}

async function requireAuthenticatedUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const supabaseAdmin = createSupabaseAdmin();
  if (!supabaseAdmin) {
    res.status(503).json({
      error: 'Konfigurasi SUPABASE_SERVICE_ROLE_KEY belum tersedia di server.',
    });
    return;
  }

  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({error: 'Sesi otentikasi tidak ditemukan.'});
    return;
  }

  const {data, error} = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({error: 'Token sesi tidak valid atau sudah kedaluwarsa.'});
    return;
  }

  req.authUser = data.user;
  next();
}

async function requireAdminUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  await requireAuthenticatedUser(req, res, async () => {
    const supabaseAdmin = createSupabaseAdmin();
    if (!supabaseAdmin || !req.authUser) return;

    const {data: profile, error} = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', req.authUser.id)
      .maybeSingle();

    if (error) {
      res.status(500).json({error: error.message});
      return;
    }

    if (!profile || profile.role !== 'admin') {
      res.status(403).json({error: 'Akses ditolak. Fitur ini khusus Administrator.'});
      return;
    }

    req.authRole = profile.role;
    next();
  });
}

async function listAllAuthUsers(supabaseAdmin: SupabaseClient): Promise<User[]> {
  const allUsers: User[] = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const {data, error} = await supabaseAdmin.auth.admin.listUsers({page, perPage});
    if (error) throw error;
    const batch = data?.users || [];
    allUsers.push(...batch);
    if (batch.length < perPage) break;
    page += 1;
  }

  return allUsers;
}

async function createAppServer() {
  const app = express();
  app.use(express.json());

  // 1. Public Runtime Config (never returns service role key)
  app.get('/api/config', (_req, res) => {
    const env = getSupabaseEnv();
    res.json({
      configured: env.configured,
      hasServiceRole: env.hasServiceRole,
      supabaseUrl: env.supabaseUrl || null,
      supabaseAnonKey: env.supabaseAnonKey || null,
      missingVars: env.missingVars,
    });
  });

  // 2. Check whether first user has been registered in Supabase Auth
  app.get('/api/auth/bootstrap-status', async (_req, res) => {
    const env = getSupabaseEnv();
    const supabaseAdmin = createSupabaseAdmin();
    if (!env.configured || !supabaseAdmin) {
      res.json({
        configured: env.configured,
        hasServiceRole: env.hasServiceRole,
        hasUsers: true,
      });
      return;
    }

    try {
      const {data, error} = await supabaseAdmin.auth.admin.listUsers({page: 1, perPage: 1});
      if (error) {
        res.json({configured: true, hasServiceRole: true, hasUsers: true});
        return;
      }
      res.json({
        configured: true,
        hasServiceRole: true,
        hasUsers: (data?.users?.length ?? 0) > 0,
      });
    } catch {
      res.json({configured: true, hasServiceRole: true, hasUsers: true});
    }
  });

  // 3. Register the very first Admin user (only allowed if 0 users exist in Supabase Auth)
  app.post('/api/auth/register-first-admin', async (req, res) => {
    const supabaseAdmin = createSupabaseAdmin();
    if (!supabaseAdmin) {
      res.status(503).json({
        error: 'SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY harus dikonfigurasi terlebih dahulu.',
      });
      return;
    }

    const {email, password, full_name, nip} = req.body ?? {};
    if (!email || !password || !full_name) {
      res.status(400).json({error: 'Nama lengkap, email, dan kata sandi wajib diisi.'});
      return;
    }

    if (String(password).length < 6) {
      res.status(400).json({error: 'Kata sandi minimal 6 karakter.'});
      return;
    }

    try {
      const {data: existing, error: listErr} = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1,
      });
      if (listErr) throw listErr;

      if ((existing?.users?.length ?? 0) > 0) {
        res.status(403).json({
          error: 'User pertama sudah terdaftar. Silakan login atau hubungi Administrator.',
        });
        return;
      }

      const {data: created, error: createErr} = await supabaseAdmin.auth.admin.createUser({
        email: String(email).trim(),
        password: String(password),
        email_confirm: true,
        user_metadata: {
          full_name: String(full_name).trim(),
          nip: nip ? String(nip).trim() : null,
          role: 'admin',
          jabatan: 'Administrator Utama',
        },
      });

      if (createErr || !created.user) {
        res.status(400).json({error: createErr?.message || 'Gagal membuat akun admin pertama.'});
        return;
      }

      const {error: profileErr} = await supabaseAdmin.from('profiles').upsert({
        id: created.user.id,
        email: created.user.email ?? String(email).trim(),
        full_name: String(full_name).trim(),
        nip: nip ? String(nip).trim() : null,
        role: 'admin',
        jabatan: 'Administrator Utama',
      });

      if (profileErr) {
        res.status(500).json({
          error: `Akun Auth dibuat tetapi gagal menyimpan tabel profiles: ${profileErr.message}. Pastikan supabase/schema.sql sudah dijalankan.`,
        });
        return;
      }

      res.status(201).json({
        message: 'Akun Administrator pertama berhasil dibuat.',
        userId: created.user.id,
      });
    } catch (err: any) {
      res.status(500).json({error: err?.message || 'Terjadi kesalahan server.'});
    }
  });

  // 4. Sync authenticated user's profile & enforce first-user-is-admin rule
  app.post('/api/auth/sync-profile', requireAuthenticatedUser, async (req: AuthenticatedRequest, res) => {
    const supabaseAdmin = createSupabaseAdmin();
    const user = req.authUser;
    if (!supabaseAdmin || !user) return;

    try {
      const {data: existingProfile, error: fetchErr} = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (fetchErr) {
        res.status(500).json({
          error: `Gagal membaca tabel profiles: ${fetchErr.message}. Pastikan schema.sql sudah dijalankan di Supabase.`,
          code: fetchErr.code,
        });
        return;
      }

      if (existingProfile) {
        res.json({profile: existingProfile});
        return;
      }

      // Check if this user is the very first user created in Supabase Authentication
      const authUsers = await listAllAuthUsers(supabaseAdmin);
      const sortedUsers = [...authUsers].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
      const isFirstAuthUser = sortedUsers.length > 0 && sortedUsers[0].id === user.id;

      const {count: profileCount} = await supabaseAdmin
        .from('profiles')
        .select('id', {count: 'exact', head: true});

      const resolvedRole =
        isFirstAuthUser || (profileCount ?? 0) === 0
          ? 'admin'
          : (user.user_metadata?.role as string) || 'tenaga_kependidikan';

      const validRole = ['admin', 'guru', 'tenaga_kependidikan'].includes(resolvedRole)
        ? resolvedRole
        : 'tenaga_kependidikan';

      const newProfile = {
        id: user.id,
        email: user.email ?? '',
        full_name:
          (user.user_metadata?.full_name as string) ||
          (user.email ? user.email.split('@')[0] : 'Pengguna'),
        nip: (user.user_metadata?.nip as string) || null,
        role: validRole,
        jabatan:
          (user.user_metadata?.jabatan as string) ||
          (validRole === 'admin' ? 'Administrator Utama' : null),
      };

      const {data: inserted, error: insertErr} = await supabaseAdmin
        .from('profiles')
        .upsert(newProfile)
        .select()
        .single();

      if (insertErr) {
        res.status(500).json({error: insertErr.message});
        return;
      }

      res.json({profile: inserted});
    } catch (err: any) {
      res.status(500).json({error: err?.message || 'Gagal menyinkronkan profil pengguna.'});
    }
  });

  // 5. Admin User Management - List all users (merged Auth + Profiles)
  app.get('/api/admin/users', requireAdminUser, async (_req, res) => {
    const supabaseAdmin = createSupabaseAdmin();
    if (!supabaseAdmin) return;

    try {
      const [authUsers, profilesResult] = await Promise.all([
        listAllAuthUsers(supabaseAdmin),
        supabaseAdmin.from('profiles').select('*').order('created_at', {ascending: true}),
      ]);

      if (profilesResult.error) throw profilesResult.error;

      const profileMap = new Map(
        (profilesResult.data ?? []).map((p) => [p.id, p]),
      );

      const merged = authUsers
        .map((u) => {
          const profile = profileMap.get(u.id);
          return {
            id: u.id,
            email: u.email ?? profile?.email ?? '',
            full_name:
              profile?.full_name ??
              (u.user_metadata?.full_name as string) ??
              (u.email ? u.email.split('@')[0] : 'Tanpa Nama'),
            nip: profile?.nip ?? (u.user_metadata?.nip as string) ?? null,
            role: profile?.role ?? (u.user_metadata?.role as string) ?? 'tenaga_kependidikan',
            jabatan: profile?.jabatan ?? (u.user_metadata?.jabatan as string) ?? null,
            created_at: profile?.created_at ?? u.created_at,
            last_sign_in_at: u.last_sign_in_at ?? null,
            email_confirmed_at: u.email_confirmed_at ?? null,
          };
        })
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      res.json({users: merged});
    } catch (err: any) {
      res.status(500).json({error: err?.message || 'Gagal memuat daftar user.'});
    }
  });

  // 6. Admin User Management - Create user in Supabase Auth & Profiles
  app.post('/api/admin/users', requireAdminUser, async (req, res) => {
    const supabaseAdmin = createSupabaseAdmin();
    if (!supabaseAdmin) return;

    const {email, password, full_name, nip, role, jabatan} = req.body ?? {};
    if (!email || !password || !full_name || !role) {
      res.status(400).json({error: 'Email, kata sandi, nama lengkap, dan role wajib diisi.'});
      return;
    }

    if (!['admin', 'guru', 'tenaga_kependidikan'].includes(role)) {
      res.status(400).json({error: 'Role tidak valid.'});
      return;
    }

    if (String(password).length < 6) {
      res.status(400).json({error: 'Kata sandi minimal 6 karakter.'});
      return;
    }

    try {
      const {data: authData, error: authErr} = await supabaseAdmin.auth.admin.createUser({
        email: String(email).trim(),
        password: String(password),
        email_confirm: true,
        user_metadata: {
          full_name: String(full_name).trim(),
          nip: nip ? String(nip).trim() : null,
          role,
          jabatan: jabatan ? String(jabatan).trim() : null,
        },
      });

      if (authErr || !authData.user) {
        res.status(400).json({error: authErr?.message || 'Gagal membuat user di Supabase Auth.'});
        return;
      }

      const {data: profile, error: profileErr} = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: authData.user.id,
          email: String(email).trim(),
          full_name: String(full_name).trim(),
          nip: nip ? String(nip).trim() : null,
          role,
          jabatan: jabatan ? String(jabatan).trim() : null,
        })
        .select()
        .single();

      if (profileErr) {
        // Rollback auth user if profile insert fails
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        res.status(500).json({error: profileErr.message});
        return;
      }

      res.status(201).json({
        user: {
          ...profile,
          last_sign_in_at: authData.user.last_sign_in_at ?? null,
          email_confirmed_at: authData.user.email_confirmed_at ?? null,
        },
      });
    } catch (err: any) {
      res.status(500).json({error: err?.message || 'Gagal menambahkan user baru.'});
    }
  });

  // 7. Admin User Management - Update user in Supabase Auth & Profiles
  app.patch('/api/admin/users/:id', requireAdminUser, async (req: AuthenticatedRequest, res) => {
    const supabaseAdmin = createSupabaseAdmin();
    if (!supabaseAdmin) return;

    const targetId = req.params.id;
    const {email, password, full_name, nip, role, jabatan} = req.body ?? {};

    if (!full_name || !email || !role) {
      res.status(400).json({error: 'Nama lengkap, email, dan role wajib diisi.'});
      return;
    }

    if (!['admin', 'guru', 'tenaga_kependidikan'].includes(role)) {
      res.status(400).json({error: 'Role tidak valid.'});
      return;
    }

    if (targetId === req.authUser?.id && role !== 'admin') {
      res.status(400).json({error: 'Anda tidak dapat menurunkan role akun Anda sendiri.'});
      return;
    }

    if (password && String(password).length < 6) {
      res.status(400).json({error: 'Kata sandi baru minimal 6 karakter.'});
      return;
    }

    try {
      const updatePayload: {
        email?: string;
        password?: string;
        email_confirm?: boolean;
        user_metadata: Record<string, any>;
      } = {
        email: String(email).trim(),
        email_confirm: true,
        user_metadata: {
          full_name: String(full_name).trim(),
          nip: nip ? String(nip).trim() : null,
          role,
          jabatan: jabatan ? String(jabatan).trim() : null,
        },
      };

      if (password && String(password).trim().length > 0) {
        updatePayload.password = String(password);
      }

      const {data: authData, error: authErr} = await supabaseAdmin.auth.admin.updateUserById(
        targetId,
        updatePayload,
      );

      if (authErr || !authData.user) {
        res.status(400).json({error: authErr?.message || 'Gagal memperbarui user di Supabase Auth.'});
        return;
      }

      const {data: profile, error: profileErr} = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: targetId,
          email: String(email).trim(),
          full_name: String(full_name).trim(),
          nip: nip ? String(nip).trim() : null,
          role,
          jabatan: jabatan ? String(jabatan).trim() : null,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (profileErr) {
        res.status(500).json({error: profileErr.message});
        return;
      }

      res.json({
        user: {
          ...profile,
          last_sign_in_at: authData.user.last_sign_in_at ?? null,
          email_confirmed_at: authData.user.email_confirmed_at ?? null,
        },
      });
    } catch (err: any) {
      res.status(500).json({error: err?.message || 'Gagal memperbarui user.'});
    }
  });

  // 8. Admin User Management - Hard Delete user down to Supabase Authentication
  app.delete('/api/admin/users/:id', requireAdminUser, async (req: AuthenticatedRequest, res) => {
    const supabaseAdmin = createSupabaseAdmin();
    if (!supabaseAdmin) return;

    const targetId = req.params.id;
    if (targetId === req.authUser?.id) {
      res.status(400).json({error: 'Anda tidak dapat menghapus akun yang sedang digunakan.'});
      return;
    }

    try {
      // Delete profile first (or cascade from auth.users)
      await supabaseAdmin.from('profiles').delete().eq('id', targetId);

      // Hard delete from Supabase Auth (shouldSoftDelete = false)
      const {error: deleteErr} = await supabaseAdmin.auth.admin.deleteUser(targetId, false);
      if (deleteErr) {
        res.status(400).json({error: deleteErr.message});
        return;
      }

      res.json({deleted: true, id: targetId});
    } catch (err: any) {
      res.status(500).json({error: err?.message || 'Gagal menghapus user secara permanen.'});
    }
  });

  // 9. Database Relation & Table Readiness Diagnostics
  app.get('/api/db/status', async (_req, res) => {
    const env = getSupabaseEnv();
    const supabaseAdmin = createSupabaseAdmin();

    const tableMeta = [
      {name: 'majors', relation: 'Master 6 jurusan (TKJ, DKV, AK, BC, MPLB, BD)'},
      {name: 'profiles', relation: '1:1 dengan auth.users(id)'},
      {name: 'classes', relation: 'N:1 ke majors(code) & profiles(id)'},
      {name: 'students', relation: 'N:1 ke majors(code) & classes(id)'},
      {name: 'employee_attendance', relation: 'N:1 ke profiles(id)'},
      {name: 'student_attendance', relation: 'N:1 ke students(id) & profiles(id)'},
    ];

    if (!env.configured || !supabaseAdmin) {
      res.json({
        envReady: false,
        configured: env.configured,
        hasServiceRole: env.hasServiceRole,
        missingVars: env.missingVars,
        schemaReady: false,
        tables: tableMeta.map((t) => ({...t, exists: false, count: 0})),
      });
      return;
    }

    const tables = await Promise.all(
      tableMeta.map(async (meta) => {
        const {count, error} = await supabaseAdmin
          .from(meta.name)
          .select('*', {count: 'exact', head: true});
        if (error) {
          return {...meta, exists: false, count: 0, error: error.message};
        }
        return {...meta, exists: true, count: count ?? 0};
      }),
    );

    res.json({
      envReady: true,
      configured: true,
      hasServiceRole: true,
      missingVars: [],
      schemaReady: tables.every((t) => t.exists),
      tables,
    });
  });

  // 10. Serve raw SQL schema & seed scripts for one-click copy/download
  app.get('/api/db/schema', (_req, res) => {
    try {
      const schemaPath = path.resolve(__dirname, 'supabase', 'schema.sql');
      const seedPath = path.resolve(__dirname, 'supabase', 'seed.sql');
      const schemaSql = fs.existsSync(schemaPath) ? fs.readFileSync(schemaPath, 'utf-8') : '';
      const seedSql = fs.existsSync(seedPath) ? fs.readFileSync(seedPath, 'utf-8') : '';
      res.json({schemaSql, seedSql});
    } catch (err: any) {
      res.status(500).json({error: err?.message || 'Gagal membaca file SQL.'});
    }
  });

  // 11. Admin-only helper to seed initial 12 students across all 6 majors
  app.post('/api/admin/seed-students', requireAdminUser, async (_req, res) => {
    const supabaseAdmin = createSupabaseAdmin();
    if (!supabaseAdmin) return;

    const initialStudents = [
      {nis: '20261001', nama: 'Ahmad Fauzan', kelas: 'X TKJ 1', jurusan: 'TKJ'},
      {nis: '20261002', nama: 'Nadia Putri Pratama', kelas: 'X TKJ 1', jurusan: 'TKJ'},
      {nis: '20261003', nama: 'Rizky Ramadhan', kelas: 'X DKV 1', jurusan: 'DKV'},
      {nis: '20261004', nama: 'Siti Aisyah Lestari', kelas: 'X DKV 1', jurusan: 'DKV'},
      {nis: '20261005', nama: 'Dimas Aditya', kelas: 'X BC 1', jurusan: 'BC'},
      {nis: '20261006', nama: 'Kirana Maharani', kelas: 'X BC 1', jurusan: 'BC'},
      {nis: '20261007', nama: 'Bagas Saputra', kelas: 'X AK 1', jurusan: 'AK'},
      {nis: '20261008', nama: 'Dewi Anggraini', kelas: 'X AK 1', jurusan: 'AK'},
      {nis: '20261009', nama: 'Fajar Nugroho', kelas: 'X MPLB 1', jurusan: 'MPLB'},
      {nis: '20261010', nama: 'Rani Kusumawardani', kelas: 'X MPLB 1', jurusan: 'MPLB'},
      {nis: '20261011', nama: 'Yoga Pratama', kelas: 'X BD 1', jurusan: 'BD'},
      {nis: '20261012', nama: 'Tania Salsabila', kelas: 'X BD 1', jurusan: 'BD'},
    ];

    try {
      const {data, error} = await supabaseAdmin
        .from('students')
        .upsert(initialStudents, {onConflict: 'nis'})
        .select();

      if (error) {
        res.status(400).json({error: error.message});
        return;
      }

      res.json({inserted: data?.length ?? initialStudents.length});
    } catch (err: any) {
      res.status(500).json({error: err?.message || 'Gagal mengisi data awal siswa.'});
    }
  });

  // Vite Dev Middleware or Static Production Build
  if (!isProduction) {
    const {createServer: createViteServer} = await import('vite');
    const vite = await createViteServer({
      server: {middlewareMode: true},
      appType: 'custom',
    });
    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      if (req.originalUrl.startsWith('/api/')) {
        next();
        return;
      }
      try {
        const indexPath = path.resolve(__dirname, 'index.html');
        let html = fs.readFileSync(indexPath, 'utf-8');
        html = await vite.transformIndexHtml(req.originalUrl, html);
        res.status(200).set({'Content-Type': 'text/html'}).end(html);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (req, res, next) => {
      if (req.originalUrl.startsWith('/api/')) {
        next();
        return;
      }
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server SMK Prima Unggul berjalan di http://localhost:${PORT}`);
  });
}

createAppServer();

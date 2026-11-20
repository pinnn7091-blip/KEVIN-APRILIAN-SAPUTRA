import {BrowserRouter, Navigate, Route, Routes} from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import {AuthProvider} from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import AbsensiKaryawanPage from './pages/app/AbsensiKaryawanPage';
import AbsensiSiswaPage from './pages/app/AbsensiSiswaPage';
import DashboardPage from './pages/app/DashboardPage';
import DataSiswaPage from './pages/app/DataSiswaPage';
import RekapKaryawanPage from './pages/app/RekapKaryawanPage';
import RekapSiswaPage from './pages/app/RekapSiswaPage';
import UserManagementPage from './pages/app/UserManagementPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Portal Aplikasi (/app) dengan Dynamic Routing & Role-Based Guard */}
          <Route
            path="/app"
            element={
              <ProtectedRoute allowedRoles={['admin', 'guru', 'tenaga_kependidikan']}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/app/absensi-karyawan"
            element={
              <ProtectedRoute allowedRoles={['admin', 'guru', 'tenaga_kependidikan']}>
                <AbsensiKaryawanPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/app/absensi-siswa"
            element={
              <ProtectedRoute allowedRoles={['admin', 'guru']}>
                <AbsensiSiswaPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/absensi-siswa/:kelas"
            element={
              <ProtectedRoute allowedRoles={['admin', 'guru']}>
                <AbsensiSiswaPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/app/rekap/karyawan"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <RekapKaryawanPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/app/rekap/siswa"
            element={
              <ProtectedRoute allowedRoles={['admin', 'guru']}>
                <RekapSiswaPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/rekap/siswa/:kelas"
            element={
              <ProtectedRoute allowedRoles={['admin', 'guru']}>
                <RekapSiswaPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/app/data-siswa"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DataSiswaPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/data-siswa/:id"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DataSiswaPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/app/user-management"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <UserManagementPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

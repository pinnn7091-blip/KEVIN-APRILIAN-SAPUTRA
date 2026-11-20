import React from 'react';
import {Navigate} from 'react-router-dom';
import {Loader2} from 'lucide-react';
import {useAuth} from '../context/AuthContext';
import type {UserRole} from '../types/app';

interface ProtectedRouteProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export default function ProtectedRoute({allowedRoles, children}: ProtectedRouteProps) {
  const {session, profile, loading} = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-6">
        <Loader2 className="w-7 h-7 text-red-700 animate-spin mb-3" />
        <p className="text-sm font-medium text-neutral-600">Memverifikasi sesi pengguna...</p>
      </div>
    );
  }

  if (!session || !profile) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(profile.role)) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Array<'admin' | 'manager' | 'driver'>;
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (allowedRoles && userData && !allowedRoles.includes(userData.role)) {
        // Redirect based on role
        switch (userData.role) {
          case 'admin':
            router.push('/dashboard/mainadmin');
            break;
          case 'manager':
            router.push('/dashboard/admin');
            break;
          case 'driver':
            router.push('/dashboard/driver');
           
        }
      }
    }
  }, [user, userData, loading, router, allowedRoles]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (allowedRoles && userData && !allowedRoles.includes(userData.role)) {
    return null;
  }

  return <>{children}</>;
}
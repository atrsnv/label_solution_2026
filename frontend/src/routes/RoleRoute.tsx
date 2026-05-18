import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuthStore, type UserRole } from '../store/authStore';

interface RoleRouteProps {
  role: UserRole;
  children: ReactNode;
}

export function RoleRoute({ role, children }: RoleRouteProps) {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  if (!token || !user) {
    return <Navigate to="/login?tab=login" replace />;
  }

  if (user.role !== role) {
    return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/artist'} replace />;
  }

  return children;
}
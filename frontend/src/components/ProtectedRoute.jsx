import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../context/authStore';

export default function ProtectedRoute({ role, children }) {
  const { token, user } = useAuthStore();
  if (!token || !user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    const fallback = user.role === 'ADMIN' ? '/admin/dashboard' : '/artist/dashboard';
    return <Navigate to={fallback} replace />;
  }
  return children;
}

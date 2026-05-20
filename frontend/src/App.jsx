import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuthStore } from './context/authStore';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';

import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminArtists from './pages/admin/Artists';
import AdminTracks from './pages/admin/Tracks';
import AdminFinance from './pages/admin/Finance';

import ArtistLayout from './layouts/ArtistLayout';
import ArtistDashboard from './pages/artist/Dashboard';
import ArtistTracks from './pages/artist/MyTracks';
import ArtistInvites from './pages/artist/Invites';
import ArtistWallet from './pages/artist/Wallet';

function NotFoundRedirect() {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/" replace />;
  return <Navigate to={user.role === 'ADMIN' ? '/admin/dashboard' : '/artist/dashboard'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute role="ADMIN">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="artists" element={<AdminArtists />} />
        <Route path="tracks" element={<AdminTracks />} />
        <Route path="finance" element={<AdminFinance />} />
      </Route>

      <Route
        path="/artist"
        element={
          <ProtectedRoute role="ARTIST">
            <ArtistLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<ArtistDashboard />} />
        <Route path="tracks" element={<ArtistTracks />} />
        <Route path="invites" element={<ArtistInvites />} />
        <Route path="wallet" element={<ArtistWallet />} />
      </Route>

      <Route path="/" element={<Landing />} />
      <Route path="*" element={<NotFoundRedirect />} />
    </Routes>
  );
}

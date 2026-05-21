import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import MainLayout from './layouts/MainLayout';
import AdminLayout from './layouts/AdminLayout';
import ArtistLayout from './layouts/ArtistLayout';

import HomePage from './pages/HomePage/HomePage';
import Login from './pages/Login/Login';

import ArtistsPage from './pages/ArtistsPage';
import ReleasesPage from './pages/ReleasesPage/ReleasesPage';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminArtistsRegistry from './pages/admin/AdminArtistsRegistry';
import AdminReleasesRegistry from './pages/admin/AdminReleasesRegistry';
import AdminFinanceCenter from './pages/admin/AdminFinanceCenter';
import AdminPayouts from './pages/admin/AdminPayouts';
import AdminDeals from './pages/admin/AdminDeals';

import ArtistDashboard from './pages/artist/ArtistDashboard';
import ArtistTracksRepository from './pages/artist/ArtistTracksRepository';
import ArtistUploadRelease from './pages/artist/ArtistUploadRelease';
import ArtistInvites from './pages/artist/ArtistInvites';
import ArtistDeals from './pages/artist/ArtistDeals';

import { RoleRoute } from './routes/RoleRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/artists" element={<ArtistsPage />} />
          <Route path="/releases" element={<ReleasesPage />} />
          <Route path="/login" element={<Login />} />
        </Route>

        <Route element={<AdminLayout />}>
          <Route
            path="/admin"
            element={
              <RoleRoute role="ADMIN">
                <AdminDashboard />
              </RoleRoute>
            }
          />

          <Route
            path="/admin/artists"
            element={
              <RoleRoute role="ADMIN">
                <AdminArtistsRegistry />
              </RoleRoute>
            }
          />

          <Route
            path="/admin/releases"
            element={
              <RoleRoute role="ADMIN">
                <AdminReleasesRegistry />
              </RoleRoute>
            }
          />

          <Route
            path="/admin/finance"
            element={
              <RoleRoute role="ADMIN">
                <AdminFinanceCenter />
              </RoleRoute>
            }
          />

          <Route
            path="/admin/payouts"
            element={
              <RoleRoute role="ADMIN">
                <AdminPayouts />
              </RoleRoute>
            }
          />

          <Route
            path="/admin/deals"
            element={
              <RoleRoute role="ADMIN">
                <AdminDeals />
              </RoleRoute>
            }
          />
        </Route>

        <Route element={<ArtistLayout />}>
          <Route
            path="/artist"
            element={
              <RoleRoute role="ARTIST">
                <ArtistDashboard />
              </RoleRoute>
            }
          />

          <Route
            path="/artist/tracks"
            element={
              <RoleRoute role="ARTIST">
                <ArtistTracksRepository />
              </RoleRoute>
            }
          />

          <Route
            path="/artist/upload"
            element={
              <RoleRoute role="ARTIST">
                <ArtistUploadRelease />
              </RoleRoute>
            }
          />

          <Route
            path="/artist/invites"
            element={
              <RoleRoute role="ARTIST">
                <ArtistInvites />
              </RoleRoute>
            }
          />

          <Route
            path="/artist/deals"
            element={
              <RoleRoute role="ARTIST">
                <ArtistDeals />
              </RoleRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
import api from './api';

export const adminApi = {
  dashboardSummary: () => api.get('/admin/dashboard/summary').then((r) => r.data),
  analytics: () => api.get('/admin/analytics').then((r) => r.data),

  listArtists: () => api.get('/admin/artists').then((r) => r.data),
  getArtist: (id) => api.get(`/admin/artists/${id}`).then((r) => r.data),
  updateArtist: (id, data) => api.patch(`/admin/artists/${id}`, data).then((r) => r.data),
  createArtist: (data) => api.post('/admin/artists', data).then((r) => r.data),
  createInvite: (data) => api.post('/admin/artists/invite', data).then((r) => r.data),

  listAllTracks: () => api.get('/admin/tracks').then((r) => r.data),

  importReport: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api
      .post('/admin/finance/import', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },
  listReports: () => api.get('/admin/finance/reports').then((r) => r.data),
  getReport: (id) => api.get(`/admin/finance/reports/${id}`).then((r) => r.data),
};

import api from './api';

export const tracksApi = {
  create: (data) => api.post('/tracks', data).then((r) => r.data),
  get: (id) => api.get(`/tracks/${id}`).then((r) => r.data),
  respond: (id, action) =>
    api.post(`/tracks/${id}/splits/respond`, { action }).then((r) => r.data),
};

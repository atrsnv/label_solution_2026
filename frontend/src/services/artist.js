import api from './api';

export const artistApi = {
  dashboard: () => api.get('/artist/dashboard').then((r) => r.data),
  analytics: () => api.get('/artist/analytics').then((r) => r.data),
  myTracks: () => api.get('/artist/tracks').then((r) => r.data),
  myInvites: () => api.get('/artist/invites').then((r) => r.data),
  wallet: () => api.get('/artist/wallet').then((r) => r.data),
  withdraw: (amount) =>
    api.post('/artist/wallet/withdraw', { amount }).then((r) => r.data),
};

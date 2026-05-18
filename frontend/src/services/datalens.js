import api from './api';

export const datalensApi = {
  embed: async () => {
    const { data } = await api.get('/datalens/embed', {
      params: { t: Date.now() },
    });
    return data;
  },
};

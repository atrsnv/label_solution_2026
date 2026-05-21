import { api } from './api';

export interface Deal {
  id: string;
  artistId: string;
  organization: string;
  totalAmount: number;
  artistPercent: number;
  artistAmount: number;
  labelAmount: number;
  comment: string | null;
  createdAt: string;
  artist?: { id: string; name: string; email: string };
}

export interface CreateDealPayload {
  artistId: string;
  organization: string;
  totalAmount: number;
  artistPercent: number;
  comment?: string;
}

export const dealService = {
  listDeals: async (): Promise<{ deals: Deal[] }> => {
    const response = await api.get<{ deals: Deal[] }>('/admin/deals');
    return response.data;
  },

  createDeal: async (data: CreateDealPayload): Promise<{ deal: Deal }> => {
    const response = await api.post<{ deal: Deal }>('/admin/deals', data);
    return response.data;
  },

  myDeals: async (): Promise<{ deals: Deal[] }> => {
    const response = await api.get<{ deals: Deal[] }>('/artist/deals');
    return response.data;
  },
};

import { api } from './api';

export type DatalensEmbedResponse = {
  configured: boolean;
  url: string | null;
  expiresAt: number | null;
  entryId: string | null;
  embedId: string | null;
  adminEntryId: string | null;
  artistEntryId: string | null;
  privateKeyConfigured: boolean;
  publicUrlConfigured: boolean;
  orgId: string | null;
  labelId: string | null;
  labelParam: string | null;
  artistParam: string | null;
  paramsEnabled: boolean;
  mode: string;
  message: string | null;
};

export const datalensService = {
  getEmbed: async (): Promise<DatalensEmbedResponse> => {
    const response = await api.get<DatalensEmbedResponse>('/datalens/embed', {
      params: {
        t: Date.now(),
      },
    });

    return response.data;
  },
};
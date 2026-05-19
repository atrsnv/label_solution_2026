import { api } from './api';
import type { SplitStatus, TrackStatus } from './adminService';

export interface ArtistDashboardResponse {
  balance: number;
  labelShare: number;
  tracksCount: number;
  approvedCount: number;
  totalEarned: number;
  totalStreams: number;
  datalensArtist?: {
    artistId: string;
    artistName: string;
  } | null;
  source?: {
    mode: string;
    dashboardTitle?: string;
    entryId?: string | null;
    dataUrlConfigured?: boolean;
    fallbackReason?: string;
    apiStatus?: string;
  };
  lastEarnings: Array<{
    id: string;
    amount: number;
    period?: string | null;
    source?: string | null;
    createdAt: string;
    track?: {
      id: string;
      title: string;
    };
  }>;
}

export interface ArtistTrack {
  id: string;
  title: string;
  coverUrl?: string | null;
  releaseDate: string;
  status: TrackStatus;
  labelShare: number;
  createdAt: string;
  source?: string;
  datalensTrackId?: string | null;
  splits: Array<{
    id: string;
    share: number;
    status: SplitStatus;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
}

export const artistService = {
  getDashboard: async (): Promise<ArtistDashboardResponse> => {
    const response = await api.get<ArtistDashboardResponse>('/artist/dashboard');

    return response.data;
  },

  getTracks: async (): Promise<{ tracks: ArtistTrack[] }> => {
    const response = await api.get<{ tracks: ArtistTrack[] }>('/artist/tracks');

    return response.data;
  },

  getInvites: async () => {
    const response = await api.get('/artist/invites');

    return response.data;
  },

  getWallet: async () => {
    const response = await api.get('/artist/wallet');

    return response.data;
  },

  withdraw: async (amount: number) => {
    const response = await api.post('/artist/wallet/withdraw', { amount });

    return response.data;
  },
};

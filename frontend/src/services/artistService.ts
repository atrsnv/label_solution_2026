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
    message?: string;
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

export interface ArtistCollaborator {
  id: string;
  name: string;
  email: string;
  role?: string;
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
  owner?: ArtistCollaborator;
  collaborators?: ArtistCollaborator[];
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

  getPayouts: async (): Promise<{ payouts: ArtistPayout[] }> => {
    const response = await api.get<{ payouts: ArtistPayout[] }>('/artist/wallet/payouts');

    return response.data;
  },

  getProfile: async (): Promise<{ profile: ArtistProfile }> => {
    const response = await api.get<{ profile: ArtistProfile }>('/artist/profile');

    return response.data;
  },

  updateProfile: async (payoutDetails: PayoutDetails): Promise<{ profile: ArtistProfile }> => {
    const response = await api.patch<{ profile: ArtistProfile }>('/artist/profile', { payoutDetails });

    return response.data;
  },

  withdraw: async (data: { amount: number; details?: PayoutDetails }) => {
    const response = await api.post('/artist/wallet/withdraw', data);

    return response.data;
  },
};

export type PayoutDetailsBank = {
  type: 'bank';
  fullName: string;
  bank: string;
  bik: string;
  account: string;
};

export type PayoutDetailsSbp = {
  type: 'sbp';
  fullName: string;
  phone: string;
};

export type PayoutDetails = PayoutDetailsBank | PayoutDetailsSbp;

export interface ArtistProfile {
  id: string;
  name: string;
  email: string;
  payoutDetails: PayoutDetails | null;
}

export interface ArtistPayout {
  id: string;
  amount: number;
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED';
  details: PayoutDetails | null;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

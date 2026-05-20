import { api } from './api';

export type TrackStatus = 'PENDING' | 'APPROVED' | 'ERROR';
export type SplitStatus = 'PENDING' | 'ACCEPTED' | 'DISPUTED';

export interface AdminSummary {
  artistsCount: number;
  tracksCount: number;
  approvedTracks: number;
  totalEarnings: number;
  pendingPayouts: number;
  topArtists: Array<{
    id: string;
    name: string;
    balance: number;
  }>;
}

export interface AdminArtist {
  id: string;
  email: string;
  name: string;
  labelShare: number;
  balance: number;
  createdAt?: string;
  source?: string;
  hasAccount?: boolean;
  datalensArtistId?: string | null;
  _count?: {
    ownedTracks: number;
  };
}

export interface AdminTrack {
  id: string;
  title: string;
  coverUrl?: string | null;
  releaseDate: string;
  status: TrackStatus;
  labelShare: number;
  createdAt: string;
  source?: string;
  datalensTrackId?: string | null;
  owner: {
    id: string;
    name: string;
    email: string;
  };
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

export interface AdminDatalensDashboard {
  title: string;
  source: string | {
    mode: string;
    dashboardTitle?: string;
    entryId?: string | null;
    dataUrlConfigured?: boolean;
    fallbackReason?: string;
    apiStatus?: string;
  };
  summary: {
    totalTurnover: number;
    labelProfit: number;
    artistPayouts: number;
    totalStreams: number;
    tracksCount: number;
    artistsCount: number;
  };
  byArtist: Array<{ artistId: string; artistName: string; amount: number }>;
  byTrack: Array<{ trackId: string; trackTitle: string; amount: number }>;
  byPeriod: Array<{ period: string; amount: number }>;
  bySource: Array<{ source: string; streams: number; amount: number }>;
  byIncomeType: Array<{ incomeType: string; amount: number }>;
  distribution: Array<{ name: string; amount: number }>;
  profitability: Array<{
    trackId: string;
    trackTitle: string;
    labelProfit: number;
    artistPayouts: number;
    total: number;
    labelSharePercent: number;
  }>;
}

export interface AdminPayout {
  id: string;
  amount: number;
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED';
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  details: {
    type: 'bank';
    fullName: string;
    bank: string;
    bik: string;
    account: string;
  } | {
    type: 'sbp';
    fullName: string;
    phone: string;
  } | null;
  user: { id: string; name: string; email: string };
}

export const adminService = {
  getDashboardSummary: async (): Promise<AdminSummary> => {
    const response = await api.get<AdminSummary>('/admin/dashboard/summary');

    return response.data;
  },

  getArtists: async (): Promise<{ artists: AdminArtist[] }> => {
    const response = await api.get<{ artists: AdminArtist[] }>('/admin/artists');

    return response.data;
  },

  getArtist: async (id: string): Promise<{ artist: AdminArtist }> => {
    const response = await api.get<{ artist: AdminArtist }>(`/admin/artists/${id}`);

    return response.data;
  },

  updateArtist: async (
    id: string,
    data: Partial<Pick<AdminArtist, 'name' | 'datalensArtistId'>>,
  ): Promise<{ artist: AdminArtist }> => {
    const response = await api.patch<{ artist: AdminArtist }>(`/admin/artists/${id}`, data);

    return response.data;
  },

  deleteArtist: async (id: string): Promise<{ ok: boolean }> => {
    const response = await api.delete<{ ok: boolean }>(`/admin/artists/${id}`);

    return response.data;
  },

  createArtist: async (data: {
    email: string;
    name: string;
    password: string;
  }): Promise<{ artist: AdminArtist }> => {
    const response = await api.post<{ artist: AdminArtist }>('/admin/artists', data);

    return response.data;
  },

  createInvite: async (data: { email?: string }) => {
    const response = await api.post('/admin/artists/invite', data);

    return response.data;
  },

  getTracks: async (): Promise<{ tracks: AdminTrack[] }> => {
    const response = await api.get<{ tracks: AdminTrack[] }>('/admin/tracks');

    return response.data;
  },

  getDatalensDashboard: async (): Promise<AdminDatalensDashboard> => {
    const response = await api.get<AdminDatalensDashboard>('/admin/datalens-dashboard');

    return response.data;
  },

  importReport: async (file: File): Promise<{ ok: boolean; filename: string; rowsCount: number; totalAmount: number }> => {
    const formData = new FormData();

    formData.append('file', file);

    const response = await api.post<{ ok: boolean; filename: string; rowsCount: number; totalAmount: number }>(
      '/admin/finance/import',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );

    return response.data;
  },

  getReports: async () => {
    const response = await api.get('/admin/finance/reports');

    return response.data;
  },

  getReport: async (id: string) => {
    const response = await api.get(`/admin/finance/reports/${id}`);

    return response.data;
  },

  getPayouts: async (): Promise<{ payouts: AdminPayout[] }> => {
    const response = await api.get<{ payouts: AdminPayout[] }>('/admin/payouts');

    return response.data;
  },

  resolvePayout: async (id: string, status: 'APPROVED' | 'REJECTED', comment: string): Promise<{ payout: AdminPayout }> => {
    const response = await api.patch<{ payout: AdminPayout }>(`/admin/payouts/${id}`, { status, comment });

    return response.data;
  },
};

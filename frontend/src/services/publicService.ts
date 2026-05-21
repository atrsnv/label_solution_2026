import { api } from './api';

export interface PublicTrack {
  id: string;
  title: string;
  releaseDate: string | null;
  coverUrl: string | null;
  createdAt: string;
  collaborators: Array<{ name: string; role?: string; percent?: number }>;
  artist: { id: string; name: string } | null;
}

export interface PublicArtist {
  id: string;
  name: string;
  createdAt: string;
  tracksCount: number;
  tracks: Array<Omit<PublicTrack, 'artist'>>;
}

export const publicService = {
  getArtists: async (): Promise<{ artists: PublicArtist[] }> => {
    const response = await api.get<{ artists: PublicArtist[] }>('/public/artists');
    return response.data;
  },

  getArtist: async (id: string): Promise<{ artist: PublicArtist }> => {
    const response = await api.get<{ artist: PublicArtist }>(`/public/artists/${id}`);
    return response.data;
  },

  getTracks: async (): Promise<{ tracks: PublicTrack[] }> => {
    const response = await api.get<{ tracks: PublicTrack[] }>('/public/tracks');
    return response.data;
  },

  getTrack: async (id: string): Promise<{ track: PublicTrack }> => {
    const response = await api.get<{ track: PublicTrack }>(`/public/tracks/${id}`);
    return response.data;
  },
};

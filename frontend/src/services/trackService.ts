import { api } from './api';
import type { ArtistTrack } from './artistService';

export interface CreateTrackPayload {
  title: string;
  coverUrl?: string | null;
  releaseDate: string;
  splits: Array<{
    userId?: string;
    email?: string;
    share: number;
  }>;
}

export const trackService = {
  createTrack: async (data: CreateTrackPayload): Promise<{ track: ArtistTrack }> => {
    const response = await api.post<{ track: ArtistTrack }>('/tracks', data);

    return response.data;
  },

  getTrack: async (id: string): Promise<{ track: ArtistTrack }> => {
    const response = await api.get<{ track: ArtistTrack }>(`/tracks/${id}`);

    return response.data;
  },

  respondToSplit: async (
    id: string,
    action: 'accept' | 'dispute',
  ): Promise<{ track: ArtistTrack }> => {
    const response = await api.post<{ track: ArtistTrack }>(`/tracks/${id}/splits/respond`, {
      action,
    });

    return response.data;
  },
};
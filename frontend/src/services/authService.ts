import { api } from './api';
import type { AuthUser } from '../store/authStore';

interface LoginPayload {
  email: string;
  password: string;
}

interface RegisterPayload {
  token: string;
  name: string;
  email?: string;
  password: string;
}

interface AuthResponse {
  token: string;
  user: AuthUser;
}

interface MeResponse {
  user: AuthUser;
}

export const authService = {
  login: async (data: LoginPayload): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', data);

    return response.data;
  },

  register: async (data: RegisterPayload): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', data);

    return response.data;
  },

  me: async (): Promise<MeResponse> => {
    const response = await api.get<MeResponse>('/auth/me');

    return response.data;
  },
};
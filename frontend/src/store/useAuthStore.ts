import { create } from 'zustand';
import type {
  User,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  UpdateUserRequest,
} from '../types/auth';
import { api } from '../api/client';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;

  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  updateProfile: (data: UpdateUserRequest) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('animaflow_token'),
  isLoading: false,
  error: null,
  isAuthenticated: !!localStorage.getItem('animaflow_token'),

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.post<AuthResponse>('/api/auth/login', credentials);
      localStorage.setItem('animaflow_token', data.access_token);
      set({
        user: data.user,
        token: data.access_token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Login failed',
        isLoading: false,
      });
      throw err;
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const authData = await api.post<AuthResponse>('/api/auth/register', data);
      localStorage.setItem('animaflow_token', authData.access_token);
      set({
        user: authData.user,
        token: authData.access_token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Registration failed',
        isLoading: false,
      });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('animaflow_token');
    set({ user: null, token: null, isAuthenticated: false });
  },

  fetchMe: async () => {
    const token = get().token;
    if (!token) return;
    try {
      const user = await api.get<User>('/api/auth/me');
      set({ user, isAuthenticated: true });
    } catch {
      get().logout();
    }
  },

  updateProfile: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const updatedUser = await api.put<User>('/api/auth/me', data);
      set({ user: updatedUser, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Update failed',
        isLoading: false,
      });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));

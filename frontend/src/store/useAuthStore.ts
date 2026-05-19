import { create } from 'zustand';
import type {
  User,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  UpdateUserRequest,
  ApiKeyEntry,
  ApiKeyCreateRequest,
  UserLLMSettings,
  UserLLMSettingsUpdate,
} from '../types/auth';
import { api } from '../api/client';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;

  // API Keys
  apiKeys: ApiKeyEntry[];
  apiKeysLoading: boolean;
  llmSettings: UserLLMSettings | null;
  llmSettingsLoading: boolean;

  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  updateProfile: (data: UpdateUserRequest) => Promise<void>;
  clearError: () => void;

  // API Key actions
  fetchApiKeys: () => Promise<void>;
  createApiKey: (data: ApiKeyCreateRequest) => Promise<void>;
  deleteApiKey: (id: string) => Promise<void>;
  fetchLLMSettings: () => Promise<void>;
  updateLLMSettings: (data: UserLLMSettingsUpdate) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('animaflow_token'),
  isLoading: false,
  error: null,
  isAuthenticated: !!localStorage.getItem('animaflow_token'),

  // API Keys initial state
  apiKeys: [],
  apiKeysLoading: false,
  llmSettings: null,
  llmSettingsLoading: false,

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

  // -----------------------------------------------------------------------
  // API Keys
  // -----------------------------------------------------------------------
  fetchApiKeys: async () => {
    set({ apiKeysLoading: true });
    try {
      const keys = await api.get<ApiKeyEntry[]>('/api/api-keys/');
      set({ apiKeys: keys, apiKeysLoading: false });
    } catch {
      set({ apiKeysLoading: false });
    }
  },

  createApiKey: async (data: ApiKeyCreateRequest) => {
    await api.post<ApiKeyEntry>('/api/api-keys/', data);
    // Refresh keys after creation
    await get().fetchApiKeys();
  },

  deleteApiKey: async (id: string) => {
    await api.delete(`/api/api-keys/${id}`);
    // Remove from local state immediately for responsive UI
    set((state) => ({
      apiKeys: state.apiKeys.filter((k) => k.id !== id),
    }));
  },

  // -----------------------------------------------------------------------
  // LLM Settings
  // -----------------------------------------------------------------------
  fetchLLMSettings: async () => {
    set({ llmSettingsLoading: true });
    try {
      const settings = await api.get<UserLLMSettings>('/api/api-keys/me/settings');
      set({ llmSettings: settings, llmSettingsLoading: false });
    } catch {
      set({ llmSettingsLoading: false });
    }
  },

  updateLLMSettings: async (data: UserLLMSettingsUpdate) => {
    const updated = await api.put<UserLLMSettings>('/api/api-keys/me/settings', data);
    set({ llmSettings: updated });
  },
}));

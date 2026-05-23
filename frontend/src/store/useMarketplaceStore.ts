import { create } from 'zustand';
import { api } from '../api/client';

export interface MarketplaceComponent {
  id: string;
  name: string;
  description?: string;
  format: 'json' | 'tsx';
  category?: string;
  tags?: string[];
  preview_url?: string;
  status: string;
  author_name?: string;
  downloads: number;
  likes: number;
  created_at: string;
  approved_at?: string;
  content?: string; // JSON spec for native conversion
}

interface MarketplaceStore {
  // Estado
  components: MarketplaceComponent[];
  pendingComponents: MarketplaceComponent[];
  loading: boolean;
  error: string | null;

  // Acciones
  fetchApproved: (category?: string, search?: string) => Promise<void>;
  fetchPending: () => Promise<void>;
  fetchComponentDetail: (id: string) => Promise<MarketplaceComponent | null>;
  approveComponent: (id: string) => Promise<void>;
  rejectComponent: (id: string, reason?: string) => Promise<void>;
  publishComponent: (data: {
    name: string;
    description?: string;
    content: string;
    format?: string;
    category?: string;
  }) => Promise<void>;
  likeComponent: (id: string) => Promise<void>;
}

export const useMarketplaceStore = create<MarketplaceStore>((set, get) => ({
  components: [],
  pendingComponents: [],
  loading: false,
  error: null,

  fetchApproved: async (category?: string, search?: string) => {
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      if (search) params.set('search', search);

      const data = await api.get<MarketplaceComponent[]>(
        `/api/components/marketplace?${params}`,
      );
      set({ components: data, loading: false });
    } catch (err: unknown) {
      set({
        error: err instanceof Error ? err.message : 'Failed to fetch components',
        loading: false,
      });
    }
  },

  fetchPending: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.get<{ components: MarketplaceComponent[] }>(
        '/api/components/admin/all?status_filter=pending',
      );
      set({ pendingComponents: data.components, loading: false });
    } catch (err: unknown) {
      set({
        error: err instanceof Error ? err.message : 'Failed to fetch pending components',
        loading: false,
      });
    }
  },

  fetchComponentDetail: async (id: string) => {
    try {
      const data = await api.get<MarketplaceComponent>(
        `/api/components/admin/${id}`,
      );
      return data;
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : 'Failed to fetch component detail' });
      return null;
    }
  },

  approveComponent: async (id: string) => {
    try {
      await api.post(`/api/components/admin/${id}/approve`);
      // Refetch pending list
      get().fetchPending();
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : 'Failed to approve' });
    }
  },

  rejectComponent: async (id: string, reason?: string) => {
    try {
      const params = reason ? `?reason=${encodeURIComponent(reason)}` : '';
      await api.post(`/api/components/admin/${id}/reject${params}`);
      get().fetchPending();
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : 'Failed to reject' });
    }
  },

  publishComponent: async (data) => {
    try {
      const result = await api.post<MarketplaceComponent>(
        '/api/components/publish',
        data,
      );
      return result;
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : 'Failed to publish' });
      throw err;
    }
  },

  likeComponent: async (id: string) => {
    try {
      await api.post(`/api/components/${id}/like`);
      // Update local state optimistically
      set((state) => ({
        components: state.components.map((c) =>
          c.id === id ? { ...c, likes: c.likes + 1 } : c,
        ),
      }));
    } catch {
      // Silently fail for likes
    }
  },
}));

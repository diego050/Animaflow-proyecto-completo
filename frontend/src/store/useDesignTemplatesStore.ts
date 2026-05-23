import { create } from 'zustand';
import { api } from '../api/client';

export interface DesignTemplate {
  id: string;
  name: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface DesignTemplatesState {
  templates: DesignTemplate[];
  loading: boolean;
  error: string | null;
  fetchTemplates: () => Promise<void>;
  createTemplate: (name: string, content: string) => Promise<DesignTemplate>;
  updateTemplate: (id: string, name: string, content: string) => Promise<DesignTemplate>;
  deleteTemplate: (id: string) => Promise<void>;
}

export const useDesignTemplatesStore = create<DesignTemplatesState>((set, get) => ({
  templates: [],
  loading: false,
  error: null,

  fetchTemplates: async () => {
    set({ loading: true, error: null });
    try {
      const templates = await api.get<DesignTemplate[]>('/api/design-templates');
      set({ templates, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createTemplate: async (name: string, content: string) => {
    set({ loading: true, error: null });
    try {
      const newTemplate = await api.post<DesignTemplate>('/api/design-templates', { name, content });
      set((state) => ({ templates: [...state.templates, newTemplate], loading: false }));
      return newTemplate;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateTemplate: async (id: string, name: string, content: string) => {
    set({ loading: true, error: null });
    try {
      const updatedTemplate = await api.put<DesignTemplate>(`/api/design-templates/${id}`, { name, content });
      set((state) => ({
        templates: state.templates.map((t) => (t.id === id ? updatedTemplate : t)),
        loading: false,
      }));
      return updatedTemplate;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  deleteTemplate: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/api/design-templates/${id}`);
      set((state) => ({
        templates: state.templates.filter((t) => t.id !== id),
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },
}));

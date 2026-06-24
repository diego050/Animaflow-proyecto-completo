import { create } from 'zustand';
import type {
  AdminStats,
  AdminUserDetail,
  AdminJobDetail,
  SystemHealth,
  AdminSettingsConfig,
  AdminSettingsUpdate,
  PaginatedUsersResponse,
  PaginatedJobsResponse,
} from '../types/admin';
import { api } from '../api/client';

interface AdminState {
  stats: AdminStats | null;
  statsLoading: boolean;

  users: AdminUserDetail[];
  usersLoading: boolean;
  usersPage: number;
  usersTotal: number;
  usersPerPage: number;

  jobs: AdminJobDetail[];
  jobsLoading: boolean;
  jobsPage: number;
  jobsTotal: number;
  jobsPerPage: number;

  systemHealth: SystemHealth | null;
  systemHealthLoading: boolean;

  settings: AdminSettingsConfig | null;
  settingsLoading: boolean;

  fetchStats: () => Promise<void>;
  fetchUsers: (page?: number, search?: string) => Promise<void>;
  fetchJobs: (page?: number, status?: string) => Promise<void>;
  fetchSystemHealth: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  updateSettings: (data: AdminSettingsUpdate) => Promise<void>;
  createUser: (data: { email: string; password: string; name: string; role: string }) => Promise<void>;
  toggleUserStatus: (userId: string, isActive: boolean) => Promise<void>;
  changeUserRole: (userId: string, role: string) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  retryJob: (jobId: string) => Promise<void>;
  cancelJob: (jobId: string) => Promise<void>;
  deleteJob: (jobId: string) => Promise<void>;
}

export const useAdminStore = create<AdminState>((set) => ({
  stats: null,
  statsLoading: false,
  users: [],
  usersLoading: false,
  usersPage: 1,
  usersTotal: 0,
  usersPerPage: 20,
  jobs: [],
  jobsLoading: false,
  jobsPage: 1,
  jobsTotal: 0,
  jobsPerPage: 20,
  systemHealth: null,
  systemHealthLoading: false,
  settings: null,
  settingsLoading: false,

  fetchStats: async () => {
    set({ statsLoading: true });
    try {
      const stats = await api.get<AdminStats>('/api/admin/stats');
      set({ stats, statsLoading: false });
    } catch {
      set({ statsLoading: false });
    }
  },

  fetchUsers: async (page = 1, search = '') => {
    set({ usersLoading: true, usersPage: page });
    try {
      const params = new URLSearchParams({ page: String(page), per_page: '20' });
      if (search) params.set('search', search);
      const data = await api.get<PaginatedUsersResponse>(
        `/api/admin/users?${params.toString()}`,
      );
      set({ users: data.users, usersTotal: data.total, usersPerPage: data.per_page, usersLoading: false });
    } catch {
      set({ usersLoading: false });
    }
  },

  createUser: async (data) => {
    set({ usersLoading: true });
    try {
      const newUser = await api.post<AdminUserDetail>('/api/admin/users', data);
      set((state) => ({
        users: [newUser, ...state.users],
        usersTotal: state.usersTotal + 1,
        usersLoading: false,
      }));
    } catch (err) {
      set({ usersLoading: false });
      throw err;
    }
  },

  fetchJobs: async (page = 1, status = '') => {
    set({ jobsLoading: true, jobsPage: page });
    try {
      const params = new URLSearchParams({ page: String(page), per_page: '20' });
      if (status) params.set('status', status);
      const data = await api.get<PaginatedJobsResponse>(
        `/api/admin/jobs?${params.toString()}`,
      );
      set({ jobs: data.jobs, jobsTotal: data.total, jobsPerPage: data.per_page, jobsLoading: false });
    } catch {
      set({ jobsLoading: false });
    }
  },

  fetchSystemHealth: async () => {
    set({ systemHealthLoading: true });
    try {
      const health = await api.get<SystemHealth>('/api/admin/system/health');
      set({ systemHealth: health, systemHealthLoading: false });
    } catch {
      set({ systemHealthLoading: false });
    }
  },

  fetchSettings: async () => {
    set({ settingsLoading: true });
    try {
      const settings = await api.get<AdminSettingsConfig>('/api/admin/settings');
      set({ settings, settingsLoading: false });
    } catch {
      set({ settingsLoading: false });
    }
  },

  updateSettings: async (data: AdminSettingsUpdate) => {
    set({ settingsLoading: true });
    try {
      const updated = await api.put<AdminSettingsConfig>('/api/admin/settings', data);
      set({ settings: updated, settingsLoading: false });
    } catch (err) {
      set({ settingsLoading: false });
      throw err;
    }
  },

  toggleUserStatus: async (userId: string, isActive: boolean) => {
    await api.put(`/api/admin/users/${userId}/toggle`);
    set((state) => ({
      users: state.users.map((u) =>
        u.id === userId ? { ...u, is_active: !isActive } : u,
      ),
    }));
  },

  changeUserRole: async (userId: string, role: string) => {
    await api.put(`/api/admin/users/${userId}/role`, { role });
    set((state) => ({
      users: state.users.map((u) => (u.id === userId ? { ...u, role: role as AdminUserDetail['role'] } : u)),
    }));
  },

  deleteUser: async (userId: string) => {
    await api.delete(`/api/admin/users/${userId}`);
    set((state) => ({
      users: state.users.filter((u) => u.id !== userId),
      usersTotal: state.usersTotal - 1,
    }));
  },

  retryJob: async (jobId: string) => {
    await api.post(`/api/admin/jobs/${jobId}/retry`);
    set((state) => ({
      jobs: state.jobs.map((j) =>
        j.job_id === jobId ? { ...j, status: 'pending' } : j,
      ),
    }));
  },

  cancelJob: async (jobId: string) => {
    await api.post(`/api/admin/jobs/${jobId}/cancel`);
    set((state) => ({
      jobs: state.jobs.map((j) =>
        j.job_id === jobId ? { ...j, status: 'cancelled' } : j,
      ),
    }));
  },

  deleteJob: async (jobId: string) => {
    await api.delete(`/api/admin/jobs/${jobId}`);
    set((state) => ({
      jobs: state.jobs.filter((j) => j.job_id !== jobId),
      jobsTotal: state.jobsTotal - 1,
    }));
  },
}));

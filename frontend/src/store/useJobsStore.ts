import { create } from 'zustand';
import type {
  JobSummary,
  JobDetail,
  TimelineSpec,
} from '../types/job';
import { isTerminalStatus } from '../types/job';
import { api } from '../api/client';
import { useToastStore } from './useToastStore';

export interface JobsState {
  jobs: JobSummary[];
  jobsLoading: boolean;
  jobsError: string | null;
  selectedJob: JobDetail | null;
  selectedJobLoading: boolean;
  pollingJobId: string | null;

  fetchJobs: () => Promise<void>;
  selectJob: (jobId: string) => Promise<void>;
  createJob: (
    scriptText: string,
    aspectRatio: string,
    voiceId?: string,
    model?: string | null,
  ) => Promise<string>;
  generateScript: (info: string) => Promise<string>;
  deleteJob: (jobId: string) => Promise<void>;
  triggerRender: (jobId: string) => Promise<void>;
  triggerAEExport: (jobId: string) => Promise<void>;
  regenerateAEExport: (jobId: string) => Promise<void>;
  regenerateScene: (
    jobId: string,
    sceneIndex: number,
    mediaQuery: string,
    text: string,
  ) => Promise<TimelineSpec | null>;
  startPolling: (jobId: string) => void;
  stopPolling: () => void;
  refreshSelectedJob: () => Promise<void>;
}

let pollingInterval: ReturnType<typeof setInterval> | null = null;

export const useJobsStore = create<JobsState>((set, get) => ({
  jobs: [],
  jobsLoading: false,
  jobsError: null,
  selectedJob: null,
  selectedJobLoading: false,
  pollingJobId: null,

  fetchJobs: async () => {
    set({ jobsLoading: true, jobsError: null });
    try {
      const data = await api.get<JobSummary[]>('/api/jobs');
      set({ jobs: data, jobsLoading: false });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error fetching jobs';
      set({ jobsError: message, jobsLoading: false });
    }
  },

  selectJob: async (jobId: string) => {
    set({ selectedJobLoading: true });
    try {
      const data = await api.get<JobDetail>(`/api/jobs/${jobId}`);
      set({ selectedJob: data, selectedJobLoading: false });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error loading job detail';
      set({ selectedJobLoading: false });
      useToastStore.getState().addToast('error', message);
    }
  },

  refreshSelectedJob: async () => {
    const { selectedJob } = get();
    if (!selectedJob) return;
    await get().selectJob(selectedJob.job_id);
  },

  createJob: async (
    scriptText: string,
    aspectRatio: string,
    _voiceId?: string,
    model?: string | null,
  ) => {
    void _voiceId;
    const body: Record<string, unknown> = {
      script_text: scriptText,
      aspect_ratio: aspectRatio,
    };
    if (model) {
      body.model = model;
    }
    const data = await api.post<{ job_id: string; status: string }>(
      '/api/jobs/',
      body,
    );
    await get().fetchJobs();
    return data.job_id;
  },

  generateScript: async (info: string) => {
    const data = await api.post<{ script_text: string }>(
      '/api/jobs/generate-script',
      { info },
    );
    return data.script_text;
  },

  deleteJob: async (jobId: string) => {
    await api.delete(`/api/jobs/${jobId}`);
    await get().fetchJobs();
    const { selectedJob } = get();
    if (selectedJob?.job_id === jobId) {
      set({ selectedJob: null });
    }
  },

  triggerRender: async (jobId: string) => {
    await api.post(`/api/jobs/${jobId}/render`);
    await get().refreshSelectedJob();
    await get().fetchJobs();
  },

  triggerAEExport: async (jobId: string) => {
    await api.post(`/api/jobs/${jobId}/export/after-effects`);
    await get().refreshSelectedJob();
  },

  regenerateAEExport: async (jobId: string) => {
    await api.post(`/api/jobs/${jobId}/export/after-effects?force=true`);
    await get().refreshSelectedJob();
  },

  regenerateScene: async (
    jobId: string,
    sceneIndex: number,
    mediaQuery: string,
    text: string,
  ) => {
    const data = await api.post<{
      status: string;
      result_spec: TimelineSpec | null;
    }>(`/api/jobs/${jobId}/scenes/${sceneIndex}/regenerate`, {
      media_query: mediaQuery,
      text,
    });
    if (data.result_spec) {
      set((state) => ({
        selectedJob: state.selectedJob
          ? { ...state.selectedJob, result_spec: data.result_spec }
          : null,
      }));
    }
    return data.result_spec;
  },

  startPolling: (jobId: string) => {
    get().stopPolling();
    set({ pollingJobId: jobId });

    pollingInterval = setInterval(async () => {
      const { pollingJobId: currentPollingId } = get();
      if (currentPollingId !== jobId) {
        get().stopPolling();
        return;
      }

      try {
        const data = await api.get<JobDetail>(`/api/jobs/${jobId}`);

        const { selectedJob } = get();
        if (selectedJob?.job_id === jobId) {
          set({ selectedJob: data });
        }

        set((state) => ({
          jobs: state.jobs.map((j) =>
            j.job_id === jobId ? { ...j, status: data.status } : j,
          ),
        }));

        if (isTerminalStatus(data.status)) {
          get().stopPolling();
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Error de polling';
        useToastStore
          .getState()
          .addToast('error', `Error actualizando estado: ${message}`);
      }
    }, 3000);
  },

  stopPolling: () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
    set({ pollingJobId: null });
  },
}));

import { create } from 'zustand';
import type { JobSummary, JobDetail, SceneData } from '../types/job';
import type { TimelineSpec } from '../types/spec';
import { isTerminalStatus } from '../types/job';
import { api } from '../api/client';
import { useToastStore } from './useToastStore';
import { useSettingsStore } from './useSettingsStore';

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
  generateScript: (
    info: string,
    templateId?: string,
    customPrompt?: string | null,
  ) => Promise<string>;
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
  reformatJob: (
    jobId: string,
    payload: {
      aspect_ratio: string;
      scene_selection: 'all' | 'selected' | 'current';
      scene_indices?: number[];
      current_scene_index?: number;
    },
  ) => Promise<void>;
  approveScenes: (
    jobId: string,
    scenes: SceneData[],
  ) => Promise<{
    job_id: string;
    status: string;
    result_spec: Record<string, unknown> | null;
  }>;
  startPolling: (jobId: string) => void;
  stopPolling: () => void;
  refreshSelectedJob: () => Promise<void>;
}

let pollingInterval: ReturnType<typeof setTimeout> | null = null;
let abortController: AbortController | null = null;
let visibilityHandler: (() => void) | null = null;

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
    const settings = useSettingsStore.getState().settings;
    const body: Record<string, unknown> = {
      script_text: scriptText,
      aspect_ratio: aspectRatio,
      tts_provider: settings.ttsProvider || 'local_piper',
      tts_voice_id: settings.ttsVoiceId || 'es_ES-carlfm-x_low',
    };
    if (model) {
      body.model = model;
    }
    if (settings.ttsApiKey) {
      body.tts_api_key = settings.ttsApiKey;
    }
    const data = await api.post<{ job_id: string; status: string }>(
      '/api/jobs/',
      body,
    );
    await get().fetchJobs();
    return data.job_id;
  },

  generateScript: async (
    info: string,
    templateId?: string,
    customPrompt?: string | null,
  ) => {
    const body: Record<string, unknown> = { info };
    if (templateId) {
      body.template_id = templateId;
    }
    if (customPrompt) {
      body.custom_prompt = customPrompt;
    }
    const data = await api.post<{ script_text: string }>(
      '/api/jobs/generate-script',
      body,
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

  reformatJob: async (
    jobId: string,
    payload: {
      aspect_ratio: string;
      scene_selection: 'all' | 'selected' | 'current';
      scene_indices?: number[];
      current_scene_index?: number;
    },
  ) => {
    try {
      await api.post(`/api/jobs/${jobId}/reformat`, payload);
      useToastStore
        .getState()
        .addToast('success', `Proyecto reformateado a ${payload.aspect_ratio}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error al reformatear';
      useToastStore.getState().addToast('error', message);
      throw err;
    }
  },

  approveScenes: async (jobId: string, scenes: SceneData[]) => {
    const data = await api.post<{
      job_id: string;
      status: string;
      result_spec: Record<string, unknown> | null;
    }>(`/api/jobs/${jobId}/approve-scenes`, {
      scenes,
    });
    await get().refreshSelectedJob();
    await get().fetchJobs();
    return data;
  },

  startPolling: (jobId: string) => {
    get().stopPolling();
    set({ pollingJobId: jobId });

    let backoffMs = 3000;
    const maxBackoffMs = 30000;

    const poll = async () => {
      if (abortController) abortController.abort();
      abortController = new AbortController();

      try {
        const data = await api.get<JobDetail>(`/api/jobs/${jobId}`, {
          signal: abortController.signal,
        });

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
          return;
        }

        // Reset backoff on success
        backoffMs = 3000;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        // Increase backoff on error
        backoffMs = Math.min(backoffMs * 2, maxBackoffMs);
      }

      // Schedule next poll with dynamic backoff
      pollingInterval = setTimeout(() => {
        const { pollingJobId: currentId } = get();
        if (currentId === jobId) {
          poll();
        }
      }, backoffMs);
    };

    // Start immediately
    poll();

    // Pause when tab hidden
    visibilityHandler = () => {
      if (document.hidden) {
        get().stopPolling();
      } else {
        poll();
      }
    };
    document.addEventListener('visibilitychange', visibilityHandler);
  },

  stopPolling: () => {
    if (pollingInterval) {
      clearTimeout(pollingInterval);
      pollingInterval = null;
    }
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    if (visibilityHandler) {
      document.removeEventListener('visibilitychange', visibilityHandler);
      visibilityHandler = null;
    }
    set({ pollingJobId: null });
  },
}));

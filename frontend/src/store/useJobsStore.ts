import { create } from 'zustand';
import type { JobSummary, JobDetail, SceneData } from '../types/job';
import type { TimelineSpec } from '../types/spec';
import { isTerminalStatus } from '../types/job';
import { api } from '../api/client';
import { useToastStore } from './useToastStore';
import { useSettingsStore } from './useSettingsStore';
import { subscribeToJob, type JobStreamEvent } from '../api/jobStream';

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
    scenes?: any[],
    designMd?: string | null,
    systemPrompt?: string | null,
    animationOnly?: boolean,
    designTemplateId?: string | null,
  ) => Promise<string>;
  saveDraft: (
    jobId: string | null,
    draftData: Record<string, any>,
  ) => Promise<{ job_id: string; status: string }>;
  generateScript: (
    info: string,
    templateId?: string,
    customPrompt?: string | null,
    targetDurationSeconds?: number,
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

let unsubscribeStream: (() => void) | null = null;

export const useJobsStore = create<JobsState>((set, get) => ({
  jobs: [],
  jobsLoading: true,
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
    scenes?: any[],
    designMd?: string | null,
    systemPrompt?: string | null,
    animationOnly?: boolean,
    designTemplateId?: string | null,
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
    if (scenes && scenes.length > 0) {
      body.scenes = scenes;
    }
    if (designMd) {
      body.design_md = designMd;
    }
    if (systemPrompt) {
      body.system_prompt = systemPrompt;
    }
    if (animationOnly) {
      body.animation_only = true;
    }
    if (designTemplateId) {
      body.design_template_id = designTemplateId;
    }
    
    const data = await api.post<{ job_id: string; status: string }>(
      '/api/jobs/',
      body,
    );
    await get().fetchJobs();
    return data.job_id;
  },

  saveDraft: async (jobId: string | null, draftData: Record<string, any>) => {
    let data;
    if (jobId) {
      data = await api.put<{ job_id: string; status: string }>(
        `/api/jobs/${jobId}/draft`,
        { draft_data: draftData }
      );
    } else {
      data = await api.post<{ job_id: string; status: string }>(
        '/api/jobs/draft',
        { draft_data: draftData }
      );
    }
    await get().fetchJobs();
    return data;
  },

  generateScript: async (
    info: string,
    templateId?: string,
    customPrompt?: string | null,
    targetDurationSeconds?: number,
  ) => {
    const body: Record<string, unknown> = { info };
    if (templateId) {
      body.template_id = templateId;
    }
    if (customPrompt) {
      body.custom_prompt = customPrompt;
    }
    if (targetDurationSeconds) {
      body.target_duration_seconds = targetDurationSeconds;
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
    if (get().pollingJobId === jobId) return;
    
    get().stopPolling();
    set({ pollingJobId: jobId });

    unsubscribeStream = subscribeToJob(jobId, {
      onStatusChange: (data: JobStreamEvent) => {
        set((state) => {
          const newSelectedJob = state.selectedJob?.job_id === jobId 
            ? { ...state.selectedJob, status: data.status, video_url: data.video_url || state.selectedJob.video_url, error_message: data.error_message || state.selectedJob.error_message } 
            : state.selectedJob;
            
          const newJobs = state.jobs.map((j) =>
            j.job_id === jobId ? { ...j, status: data.status, video_url: data.video_url || j.video_url } : j,
          );

          return { selectedJob: newSelectedJob, jobs: newJobs };
        });

        // When status becomes 'segmented', fetch full job data (includes result_spec with scenes)
        if (data.status === 'segmented') {
          get().selectJob(jobId);
        }
      },
      onComplete: () => {
        get().refreshSelectedJob();
        get().stopPolling();
      },
      onError: (errMessage: string) => {
        useToastStore.getState().addToast('error', `Stream error: ${errMessage}`);
        get().stopPolling();
      }
    });
  },

  stopPolling: () => {
    if (unsubscribeStream) {
      unsubscribeStream();
      unsubscribeStream = null;
    }
    set({ pollingJobId: null });
  },
}));

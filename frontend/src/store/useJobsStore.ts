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
  formats: Array<{ job_id: string; aspect_ratio: string; status: string; name: string | null; is_current: boolean }>;

  fetchJobs: () => Promise<void>;
  selectJob: (jobId: string) => Promise<void>;
  fetchFormats: (jobId: string) => Promise<void>;
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
    model?: string | null,
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
  editSceneCode: (
    jobId: string,
    sceneIndex: number,
    instruction: string,
  ) => Promise<string>;
  regenerateSceneCode: (jobId: string, sceneIndex: number) => Promise<string>;
  revertSceneCode: (jobId: string, sceneIndex: number, versionId: string) => Promise<string>;
  applyJobSpec: (spec: TimelineSpec) => void;
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
  retryJob: (jobId: string) => Promise<void>;
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
  formats: [],

  fetchJobs: async () => {
    set({ jobsLoading: true, jobsError: null });
    try {
      const data = await api.get<{ jobs: JobSummary[]; total: number; page: number; per_page: number; total_pages: number }>('/api/jobs');
      set({ jobs: data.jobs, jobsLoading: false });
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

  fetchFormats: async (jobId: string) => {
    try {
      const data = await api.get<Array<{ job_id: string; aspect_ratio: string; status: string; name: string | null; is_current: boolean }>>(
        `/api/jobs/${jobId}/formats`
      );
      set({ formats: data });
    } catch {
      // Ignore errors silently
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
    model?: string | null,
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
    if (model) {
      body.model = model;
    }
    const data = await api.post<{ script_text: string }>(
      '/api/jobs/generate-script',
      body,
      { timeoutMs: 90000 },
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

  editSceneCode: async (
    jobId: string,
    sceneIndex: number,
    instruction: string,
  ) => {
    // Edición quirúrgica del componente code-gen de la escena. Solo actualiza el código
    // (el preview se recompila en vivo). NO renderiza mp4 — eso es on-demand.
    const data = await api.post<{
      scene_index: number;
      custom_code: string;
      valid: boolean;
    }>(`/api/jobs/${jobId}/scenes/${sceneIndex}/edit-code`, { instruction });
    set((state) => {
      const spec = state.selectedJob?.result_spec;
      if (!spec) return {};
      const scenes = spec.scenes.map((s, i) =>
        i === sceneIndex ? { ...s, custom_code: data.custom_code } : s,
      );
      return {
        selectedJob: state.selectedJob
          ? { ...state.selectedJob, result_spec: { ...spec, scenes } }
          : null,
      };
    });
    return data.custom_code;
  },

  regenerateSceneCode: async (jobId: string, sceneIndex: number) => {
    // "Hazlo distinto": versión nueva del componente. Solo actualiza el código (preview
    // en vivo). NO renderiza mp4.
    const data = await api.post<{
      scene_index: number;
      custom_code: string;
      valid: boolean;
    }>(`/api/jobs/${jobId}/scenes/${sceneIndex}/regenerate-code`, {});
    set((state) => {
      const spec = state.selectedJob?.result_spec;
      if (!spec) return {};
      const scenes = spec.scenes.map((s, i) =>
        i === sceneIndex ? { ...s, custom_code: data.custom_code } : s,
      );
      return {
        selectedJob: state.selectedJob
          ? { ...state.selectedJob, result_spec: { ...spec, scenes } }
          : null,
      };
    });
    return data.custom_code;
  },

  applyJobSpec: (spec: TimelineSpec) => {
    set((state) => ({
      selectedJob: state.selectedJob
        ? { ...state.selectedJob, result_spec: spec }
        : null,
    }));
  },

  revertSceneCode: async (jobId: string, sceneIndex: number, versionId: string) => {
    // Restaura una versión anterior del código de la escena (checkpoint). Sin mp4.
    const data = await api.post<{ scene_index: number; custom_code: string }>(
      `/api/jobs/${jobId}/scenes/${sceneIndex}/revert`, { version_id: versionId },
    );
    set((state) => {
      const spec = state.selectedJob?.result_spec;
      if (!spec) return {};
      const scenes = spec.scenes.map((s, i) =>
        i === sceneIndex ? { ...s, custom_code: data.custom_code } : s,
      );
      return {
        selectedJob: state.selectedJob
          ? { ...state.selectedJob, result_spec: { ...spec, scenes } }
          : null,
      };
    });
    return data.custom_code;
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
      // Refrescar la lista de formatos para que el nuevo aparezca en el switcher.
      await get().fetchFormats(jobId);
      useToastStore
        .getState()
        .addToast('success', `Proyecto reformateado a ${payload.aspect_ratio}. Cámbialo en el selector de formato.`);
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

  retryJob: async (jobId: string) => {
    try {
      const data = await api.post<{
        job_id: string;
        status: string;
        result_spec: Record<string, unknown> | null;
        error_message: string | null;
      }>(`/api/jobs/${jobId}/retry`);
      
      // Update selected job in store
      set((state) => ({
        selectedJob: state.selectedJob?.job_id === jobId
          ? { ...state.selectedJob, status: data.status, error_message: data.error_message ?? undefined, result_spec: data.result_spec as TimelineSpec | null }
          : state.selectedJob,
        jobs: state.jobs.map((j) =>
          j.job_id === jobId ? { ...j, status: data.status, error_message: data.error_message ?? undefined } : j,
        ),
      }));
      
      useToastStore.getState().addToast('success', 'Proceso reintentado exitosamente');
      
      // Restart polling if the job is now in a non-terminal state
      const { startPolling } = get();
      startPolling(jobId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al reintentar';
      useToastStore.getState().addToast('error', message);
      throw err;
    }
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

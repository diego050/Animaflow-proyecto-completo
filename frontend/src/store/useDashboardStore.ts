import { create } from 'zustand';
import type {
  JobSummary,
  JobDetail,
  TimelineSpec,
  Voice,
  Script,
  UserSettings,
} from '../types/job';
import { isTerminalStatus, mapBackendVoice } from '../types/job';
import type { BackendVoice, VoicePreviewResponse } from '../types/auth';
import { api, apiUpload, API_BASE } from '../api/client';

// ---------------------------------------------------------------------------
// Store interfaces
// ---------------------------------------------------------------------------

interface WizardData {
  info: string;
  script: string;
  aspectRatio: string;
  voiceId: string | null;
  generatedJobId: string | null;
}

interface DashboardState {
  // Projects list
  jobs: JobSummary[];
  jobsLoading: boolean;
  jobsError: string | null;

  // Selected project detail
  selectedJob: JobDetail | null;
  selectedJobLoading: boolean;

  // Wizard state (for new project flow)
  wizardStep: number;
  wizardData: WizardData;

  // Polling
  pollingJobId: string | null;

  // Voices (Sprint 3)
  voices: Voice[];
  selectedVoiceId: string | null;
  voicesLoading: boolean;

  // Scripts (Sprint 3)
  scripts: Script[];
  scriptsLoading: boolean;

  // Settings (Sprint 4)
  settings: UserSettings;

  // Actions — Projects
  fetchJobs: () => Promise<void>;
  selectJob: (jobId: string) => Promise<void>;
  createJob: (scriptText: string, aspectRatio: string, voiceId?: string) => Promise<string>;
  generateScript: (info: string) => Promise<string>;
  deleteJob: (jobId: string) => Promise<void>;
  triggerRender: (jobId: string) => Promise<void>;
  triggerAEExport: (jobId: string) => Promise<void>;
  regenerateScene: (
    jobId: string,
    sceneIndex: number,
    mediaQuery: string,
    text: string,
  ) => Promise<TimelineSpec | null>;
  startPolling: (jobId: string) => void;
  stopPolling: () => void;

  // Actions — Wizard
  setWizardStep: (step: number) => void;
  setWizardData: (data: Partial<WizardData>) => void;
  resetWizard: () => void;
  refreshSelectedJob: () => Promise<void>;

  // Actions — Voices (Sprint 3)
  fetchVoices: () => Promise<void>;
  createVoice: (data: {
    name: string;
    gender: string;
    language: string;
    is_default?: boolean;
  }) => Promise<Voice>;
  updateVoice: (id: string, data: Partial<BackendVoice>) => Promise<Voice>;
  deleteVoice: (voiceId: string) => Promise<void>;
  uploadVoiceSample: (id: string, file: File) => Promise<Voice>;
  previewVoice: (
    id: string,
    text: string,
  ) => Promise<{ audio_url: string; duration: number }>;
  setVoice: (voiceId: string) => void;

  // Actions — Scripts (Sprint 3)
  fetchScripts: () => void;
  addScript: (script: Omit<Script, 'id' | 'createdAt'>) => void;
  updateScript: (id: string, data: Partial<Script>) => void;
  deleteScript: (id: string) => void;

  // Actions — Settings (Sprint 4)
  loadSettings: () => void;
  updateSettings: (settings: Partial<UserSettings>) => void;

  // Actions — Downloads (Sprint 3)
  downloadAEExport: (jobId: string) => Promise<void>;
  downloadSpecJson: (jobId: string) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Default settings
// ---------------------------------------------------------------------------

const DEFAULT_SETTINGS: UserSettings = {
  defaultAspectRatio: '9:16',
  defaultVoiceId: 'kokoro-es',
  language: 'es',
  theme: 'dark',
  name: '',
  email: '',
};

function loadSettingsFromStorage(): UserSettings {
  try {
    const stored = localStorage.getItem('animaflow-settings');
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch {
    // ignore parse errors
  }
  return { ...DEFAULT_SETTINGS };
}

function saveSettingsToStorage(settings: UserSettings): void {
  try {
    localStorage.setItem('animaflow-settings', JSON.stringify(settings));
  } catch {
    // ignore storage errors
  }
}

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

let pollingInterval: ReturnType<typeof setInterval> | null = null;

export const useDashboardStore = create<DashboardState>((set, get) => ({
  // Initial state
  jobs: [],
  jobsLoading: false,
  jobsError: null,
  selectedJob: null,
  selectedJobLoading: false,
  wizardStep: 1,
  wizardData: {
    info: '',
    script: '',
    aspectRatio: '9:16',
    voiceId: null,
    generatedJobId: null,
  },
  pollingJobId: null,

  // Voices initial state
  voices: [],
  selectedVoiceId: null,
  voicesLoading: false,

  // Scripts initial state
  scripts: [],
  scriptsLoading: false,

  // Settings initial state
  settings: loadSettingsFromStorage(),

  // -----------------------------------------------------------------------
  // Fetch all jobs
  // -----------------------------------------------------------------------
  fetchJobs: async () => {
    set({ jobsLoading: true, jobsError: null });
    try {
      const data = await api.get<JobSummary[]>('/api/jobs');
      set({ jobs: data, jobsLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error fetching jobs';
      set({ jobsError: message, jobsLoading: false });
    }
  },

  // -----------------------------------------------------------------------
  // Select a job and fetch its detail
  // -----------------------------------------------------------------------
  selectJob: async (jobId: string) => {
    set({ selectedJobLoading: true });
    try {
      const data = await api.get<JobDetail>(`/api/jobs/${jobId}`);
      set({ selectedJob: data, selectedJobLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error loading job detail';
      set({ selectedJobLoading: false });
      console.error(message);
    }
  },

  // -----------------------------------------------------------------------
  // Refresh the currently selected job
  // -----------------------------------------------------------------------
  refreshSelectedJob: async () => {
    const { selectedJob } = get();
    if (!selectedJob) return;
    await get().selectJob(selectedJob.job_id);
  },

  // -----------------------------------------------------------------------
  // Create a new job
  // -----------------------------------------------------------------------
  createJob: async (scriptText: string, aspectRatio: string, _voiceId?: string) => {
    // TODO: voiceId will be sent to backend when TTS voice selection is implemented
    void _voiceId;
    const data = await api.post<{ job_id: string; status: string }>('/api/jobs/', {
      script_text: scriptText,
      aspect_ratio: aspectRatio,
    });
    // Refresh job list
    await get().fetchJobs();
    return data.job_id;
  },

  // -----------------------------------------------------------------------
  // Generate script via AI
  // -----------------------------------------------------------------------
  generateScript: async (info: string) => {
    const data = await api.post<{ script_text: string }>('/api/jobs/generate-script', {
      info,
    });
    return data.script_text;
  },

  // -----------------------------------------------------------------------
  // Delete a job
  // -----------------------------------------------------------------------
  deleteJob: async (jobId: string) => {
    await api.delete(`/api/jobs/${jobId}`);
    // Refresh job list
    await get().fetchJobs();
    // If the deleted job was selected, clear it
    const { selectedJob } = get();
    if (selectedJob?.job_id === jobId) {
      set({ selectedJob: null });
    }
  },

  // -----------------------------------------------------------------------
  // Trigger render for a job
  // -----------------------------------------------------------------------
  triggerRender: async (jobId: string) => {
    await api.post(`/api/jobs/${jobId}/render`);
    // Refresh selected job
    await get().refreshSelectedJob();
    await get().fetchJobs();
  },

  // -----------------------------------------------------------------------
  // Trigger After Effects export
  // -----------------------------------------------------------------------
  triggerAEExport: async (jobId: string) => {
    await api.post(`/api/jobs/${jobId}/export/after-effects`);
    await get().refreshSelectedJob();
  },

  // -----------------------------------------------------------------------
  // Regenerate a specific scene
  // -----------------------------------------------------------------------
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

  // -----------------------------------------------------------------------
  // Start polling a job for status updates
  // -----------------------------------------------------------------------
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
        console.error('Polling error:', err);
      }
    }, 3000);
  },

  // -----------------------------------------------------------------------
  // Stop polling
  // -----------------------------------------------------------------------
  stopPolling: () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
    set({ pollingJobId: null });
  },

  // -----------------------------------------------------------------------
  // Wizard actions
  // -----------------------------------------------------------------------
  setWizardStep: (step: number) => set({ wizardStep: step }),

  setWizardData: (data: Partial<WizardData>) =>
    set((state) => ({
      wizardData: { ...state.wizardData, ...data },
    })),

  resetWizard: () => {
    const { settings } = get();
    set({
      wizardStep: 1,
      wizardData: {
        info: '',
        script: '',
        aspectRatio: settings.defaultAspectRatio || '9:16',
        voiceId: settings.defaultVoiceId || null,
        generatedJobId: null,
      },
    });
  },

  // -----------------------------------------------------------------------
  // Sprint 3: Voices — real API integration
  // -----------------------------------------------------------------------
  fetchVoices: async () => {
    set({ voicesLoading: true });
    try {
      const data = await api.get<BackendVoice[]>('/api/voices/');
      const mapped = data.map(mapBackendVoice);
      set({ voices: mapped, voicesLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error fetching voices';
      console.error(message);
      set({ voicesLoading: false });
    }
  },

  createVoice: async (data) => {
    const backendVoice = await api.post<BackendVoice>('/api/voices/', data);
    const mapped = mapBackendVoice(backendVoice);
    set((state) => ({ voices: [...state.voices, mapped] }));
    return mapped;
  },

  updateVoice: async (id, data) => {
    const backendVoice = await api.put<BackendVoice>(`/api/voices/${id}`, data);
    const mapped = mapBackendVoice(backendVoice);
    set((state) => ({
      voices: state.voices.map((v) => (v.id === id ? mapped : v)),
    }));
    return mapped;
  },

  deleteVoice: async (voiceId) => {
    await api.delete(`/api/voices/${voiceId}`);
    set((state) => ({
      voices: state.voices.filter((v) => v.id !== voiceId),
      selectedVoiceId:
        state.selectedVoiceId === voiceId ? null : state.selectedVoiceId,
    }));
  },

  uploadVoiceSample: async (id, file) => {
    const backendVoice = await apiUpload<BackendVoice>(
      `/api/voices/${id}/upload-sample`,
      file,
    );
    const mapped = mapBackendVoice(backendVoice);
    set((state) => ({
      voices: state.voices.map((v) => (v.id === id ? mapped : v)),
    }));
    return mapped;
  },

  previewVoice: async (id, text) => {
    const response = await api.post<VoicePreviewResponse>(
      `/api/voices/${id}/preview`,
      { text },
    );
    return response;
  },

  setVoice: (voiceId: string) => {
    set({ selectedVoiceId: voiceId });
  },

  // -----------------------------------------------------------------------
  // Sprint 3: Scripts
  // -----------------------------------------------------------------------
  fetchScripts: () => {
    // Derive scripts from completed jobs + any manually created ones
    const { jobs } = get();
    const derivedScripts: Script[] = jobs
      .filter((j) => j.status === 'completed' || j.status === 'completed_video')
      .map((j) => ({
        id: `script-${j.job_id}`,
        name: j.script_text.slice(0, 40) + (j.script_text.length > 40 ? '...' : ''),
        content: j.script_text,
        scenes: 1, // Will be updated when we have result_spec
        aspectRatio: j.aspect_ratio || '9:16',
        createdAt: j.created_at,
        sourceJobId: j.job_id,
      }));

    set(() => ({
      scripts: derivedScripts,
      scriptsLoading: false,
    }));
  },

  addScript: (script) => {
    const newScript: Script = {
      ...script,
      id: `script-manual-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ scripts: [...state.scripts, newScript] }));
  },

  updateScript: (id: string, data: Partial<Script>) => {
    set((state) => ({
      scripts: state.scripts.map((s) =>
        s.id === id ? { ...s, ...data } : s,
      ),
    }));
  },

  deleteScript: (id: string) => {
    set((state) => ({
      scripts: state.scripts.filter((s) => s.id !== id),
    }));
  },

  // -----------------------------------------------------------------------
  // Sprint 4: Settings
  // -----------------------------------------------------------------------
  loadSettings: () => {
    set({ settings: loadSettingsFromStorage() });
  },

  updateSettings: (partial: Partial<UserSettings>) => {
    set((state) => {
      const updated = { ...state.settings, ...partial };
      saveSettingsToStorage(updated);
      return { settings: updated };
    });
  },

  // -----------------------------------------------------------------------
  // Sprint 3: Download helpers
  // -----------------------------------------------------------------------
  downloadAEExport: async (jobId: string) => {
    // Trigger the export first
    await api.post(`/api/jobs/${jobId}/export/after-effects`);
    // Then open download in new tab
    window.open(
      `${API_BASE}/api/jobs/${jobId}/export/after-effects/download`,
      '_blank',
    );
  },

  downloadSpecJson: async (jobId: string) => {
    window.open(
      `${API_BASE}/api/jobs/${jobId}/export/spec-json`,
      '_blank',
    );
  },
}));

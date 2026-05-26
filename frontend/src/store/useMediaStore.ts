import { create } from 'zustand';
import type { JobSummary, Script } from '../types/job';
import { api, API_BASE } from '../api/client';
import { useJobsStore } from './useJobsStore';

export interface MediaState {
  scripts: Script[];
  scriptsLoading: boolean;

  fetchScripts: (jobsOverride?: JobSummary[]) => void;
  addScript: (script: Omit<Script, 'id' | 'createdAt'>) => void;
  updateScript: (id: string, data: Partial<Script>) => void;
  deleteScript: (id: string) => void;
  downloadAEExport: (jobId: string) => Promise<void>;
  downloadSpecJson: (jobId: string) => Promise<void>;
}

export const useMediaStore = create<MediaState>((set) => ({
  scripts: [],
  scriptsLoading: true,

  fetchScripts: (jobsOverride?: JobSummary[]) => {
    set({ scriptsLoading: true });
    const jobs = jobsOverride ?? useJobsStore.getState().jobs;
    const derivedScripts: Script[] = jobs
      .filter(
        (j) => j.status === 'completed' || j.status === 'completed_video',
      )
      .map((j) => ({
        id: `script-${j.job_id}`,
        name:
          j.script_text.slice(0, 60) +
          (j.script_text.length > 60 ? '...' : ''),
        content: j.script_text,
        scenes: 1,
        aspectRatio: j.aspect_ratio || '9:16',
        createdAt: j.created_at,
        sourceJobId: j.job_id,
        // JobSummary doesn't include result_spec, so use script_text as the
        // creative-direction prompt. If full media_query is needed later,
        // fetchScripts should call /api/jobs/{id} for each completed job.
        prompt: j.script_text,
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

  downloadAEExport: async (jobId: string) => {
    await api.post(`/api/jobs/${jobId}/export/after-effects`);
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

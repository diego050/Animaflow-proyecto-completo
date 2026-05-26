import { apiFetch } from './client';

export interface SceneEditChange {
  field_path: string;
  value: unknown;
}

export interface SceneEditRequest {
  mode: 'manual' | 'conversational';
  changes?: SceneEditChange[];
  prompt?: string;
}

export interface SceneEditResponse {
  success: boolean;
  intent: 'query' | 'edit' | 'recommend';
  // For query responses
  answer?: string;
  // For recommend responses
  recommendations?: Array<{
    description: string;
    operations: Array<{ type: string; path: string; value?: unknown }>;
  }>;
  // For edit responses
  explanation?: string;
  applied_changes?: Array<{ field_path: string; new_value: unknown }>;
  // Common
  warnings: string[];
  updated_scene?: Record<string, unknown>;
  changes_applied?: boolean;
}

export interface HistoryMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, unknown>;
}

export async function getHistory(jobId: string): Promise<HistoryMessage[]> {
  const token = localStorage.getItem('animaflow_token');
  const res = await fetch(`/api/jobs/${jobId}/history`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    return []; // Return empty array on error (chat will just be empty)
  }

  const data = await res.json();
  return data.messages || [];
}

export async function editScene(
  jobId: string,
  sceneIndex: number,
  request: SceneEditRequest,
): Promise<SceneEditResponse> {
  return apiFetch<SceneEditResponse>(
    `/api/jobs/${jobId}/scenes/${sceneIndex}/edit`,
    {
      method: 'PATCH',
      body: JSON.stringify(request),
    },
  );
}

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
  explanation: string;
  applied_changes: Array<{ field_path: string; new_value: unknown }>;
  warnings: string[];
  updated_scene: Record<string, unknown>;
}

export async function editScene(
  jobId: string,
  sceneIndex: number,
  request: SceneEditRequest,
): Promise<SceneEditResponse> {
  return apiFetch<SceneEditResponse>(
    `/jobs/${jobId}/scenes/${sceneIndex}/edit`,
    {
      method: 'PATCH',
      body: JSON.stringify(request),
    },
  );
}

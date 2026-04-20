export interface WorkspaceRuntimeStatus {
  project_id: number;
  status: string;
  preview_url: string;
  frontend_port?: number | null;
  backend_port?: number | null;
}

export function buildPreviewUrl(previewUrl: string): string {
  return previewUrl;
}

export async function ensureWorkspaceRuntime(projectId: number): Promise<WorkspaceRuntimeStatus> {
  const response = await fetch(`/api/v1/workspace-runtime/projects/${projectId}/ensure`, { method: "POST" });
  if (!response.ok) {
    throw new Error(`Failed to ensure runtime: ${response.status}`);
  }
  return response.json();
}

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface UserRead {
  id: string;
  email: string | null;
}

export interface PendingConnectionRead {
  id: string;
  user_id: string;
  connection_code: string;
  bot_username: string;
  dm_link: string;
  expires_at: string;
  created_at: string;
}

export interface ConnectedInstagramRead {
  id: string;
  user_id: string;
  instagram_scoped_id: string;
  display_username: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface SavedItemRead {
  id: string;
  user_id: string;
  connected_instagram_id: string | null;
  platform: string;
  source_url: string;
  provider_item_id: string | null;
  source_event_id: string | null;
  caption: string | null;
  creator_username: string | null;
  thumbnail_url: string | null;
  processing_status: string;
  raw_metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

async function request<T>(
  path: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  if (options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Request failed with status ${response.status}`
    );
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return response.json();
}

export async function fetchAuthMe(token: string): Promise<UserRead> {
  return request<UserRead>('/api/v1/auth/me', token);
}

export async function createPendingInstagramConnection(
  token: string
): Promise<PendingConnectionRead> {
  return request<PendingConnectionRead>(
    '/api/v1/instagram/connections/pending',
    token,
    {
      method: 'POST',
    }
  );
}

export async function getConnectedInstagramAccounts(
  token: string
): Promise<ConnectedInstagramRead[]> {
  return request<ConnectedInstagramRead[]>(
    '/api/v1/instagram/connections',
    token
  );
}

export async function disconnectInstagramAccount(
  token: string,
  connectionId: string
): Promise<void> {
  return request<void>(`/api/v1/instagram/connections/${connectionId}`, token, {
    method: 'DELETE',
  });
}

export async function getSavedItems(
  token: string,
  limit = 50
): Promise<SavedItemRead[]> {
  return request<SavedItemRead[]>(`/api/v1/saved-items?limit=${limit}`, token);
}

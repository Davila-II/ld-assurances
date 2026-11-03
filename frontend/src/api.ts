import { clearToken, getToken } from './auth';
import type {
  Category,
  FormDefinition,
  FormType,
  LoginResult,
  Paginated,
  SubmissionDetail,
  SubmissionFilters,
  SubmissionResult,
  SubmissionStatus,
  SubmissionSummary,
} from './types';

const API_URL = import.meta.env.VITE_API_URL as string;
const TIMEOUT_MS = 60000;

type ErrorPayload = {
  message?: string;
  errors?: Record<string, string[]>;
};

export class ApiError extends Error {
  status: number;
  errors: Record<string, string[]>;

  constructor(message: string, status = 0, errors: Record<string, string[]> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

function messageFor(status: number, serverMessage?: string): string {
  switch (status) {
    case 404:
      return 'Ressource introuvable.';
    case 413:
      return 'Les fichiers envoyés sont trop volumineux.';
    case 422:
      return serverMessage || 'Certaines informations sont invalides.';
    case 429:
      return 'Trop de tentatives. Patientez une minute puis réessayez.';
    default:
      return status >= 500
        ? 'Une erreur est survenue sur le serveur. Réessayez plus tard.'
        : serverMessage || 'Une erreur est survenue.';
  }
}

function redirectToLogin(): void {
  clearToken();
  window.location.assign('/admin/login');
}

async function rawFetch(path: string, init: RequestInit = {}, auth = false): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');

  if (auth) {
    const token = getToken();
    if (!token) {
      redirectToLogin();
      throw new ApiError('Session expirée. Veuillez vous reconnecter.', 401);
    }
    headers.set('Authorization', `Bearer ${token}`);
  }

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('Le serveur met trop de temps à répondre. Réessayez dans un instant.');
    }
    throw new ApiError('Impossible de joindre le serveur. Vérifiez votre connexion internet.');
  } finally {
    window.clearTimeout(timer);
  }

  if (auth && response.status === 401) {
    redirectToLogin();
    throw new ApiError('Session expirée. Veuillez vous reconnecter.', 401);
  }

  return response;
}

async function request<T>(path: string, init: RequestInit = {}, auth = false): Promise<T> {
  const response = await rawFetch(path, init, auth);
  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const payload =
      typeof data === 'object' && data !== null ? (data as ErrorPayload) : undefined;
    throw new ApiError(
      messageFor(response.status, payload?.message),
      response.status,
      payload?.errors ?? {}
    );
  }

  return data as T;
}

export const getCategories = () => request<Category[]>('/categories');

export const getForm = (slug: string, type: FormType = 'claim') =>
  request<FormDefinition>(`/categories/${encodeURIComponent(slug)}/form?type=${type}`);

export const submitForm = (formData: FormData) =>
  request<SubmissionResult>('/submissions', { method: 'POST', body: formData });

export const adminLogin = (email: string, password: string) =>
  request<LoginResult>('/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

export const adminLogout = () =>
  request<{ message: string }>('/admin/logout', { method: 'POST' }, true);

export const getSubmissions = (filters: SubmissionFilters) => {
  const query = new URLSearchParams();
  if (filters.status) query.set('status', filters.status);
  if (filters.form_type) query.set('form_type', filters.form_type);
  if (filters.category) query.set('category', filters.category);
  if (filters.q) query.set('q', filters.q);
  if (filters.page && filters.page > 1) query.set('page', String(filters.page));

  const queryString = query.toString();
  return request<Paginated<SubmissionSummary>>(
    `/admin/submissions${queryString ? `?${queryString}` : ''}`,
    {},
    true
  );
};

export const getSubmission = (id: string | number) =>
  request<SubmissionDetail>(`/admin/submissions/${encodeURIComponent(id)}`, {}, true);

export const updateSubmissionStatus = (id: number, status: SubmissionStatus) =>
  request<{ id: number; status: SubmissionStatus }>(
    `/admin/submissions/${id}/status`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    },
    true
  );

export async function downloadAttachment(id: number, filename: string): Promise<void> {
  const response = await rawFetch(`/admin/attachments/${id}/download`, {}, true);

  if (!response.ok) {
    throw new ApiError(
      response.status === 404 ? 'Fichier introuvable.' : messageFor(response.status),
      response.status
    );
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

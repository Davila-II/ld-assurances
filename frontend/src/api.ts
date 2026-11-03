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

// Envoie la requête, gère le jeton, le délai d'attente et les erreurs réseau
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
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers, signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError('Le serveur met trop de temps à répondre. Réessayez dans un instant.');
    }
    throw new ApiError('Impossible de joindre le serveur. Vérifiez votre connexion internet.');
  } finally {
    clearTimeout(timer);
  }

  // Jeton refusé ou expiré : retour à la page de connexion
  if (auth && res.status === 401) {
    redirectToLogin();
    throw new ApiError('Session expirée. Veuillez vous reconnecter.', 401);
  }

  return res;
}

async function request<T>(path: string, init: RequestInit = {}, auth = false): Promise<T> {
  const res = await rawFetch(path, init, auth);
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(messageFor(res.status, data?.message), res.status, data?.errors ?? {});
  }

  return data as T;
}

// --- Public ---

export const getCategories = () => request<Category[]>('/categories');

export const getForm = (slug: string, type: FormType = 'claim') =>
  request<FormDefinition>(`/categories/${encodeURIComponent(slug)}/form?type=${type}`);

export const submitForm = (formData: FormData) =>
  request<SubmissionResult>('/submissions', { method: 'POST', body: formData });

// --- Administration ---

export const adminLogin = (email: string, password: string) =>
  request<LoginResult>('/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

export const adminLogout = () =>
  request<{ message: string }>('/admin/logout', { method: 'POST' }, true);

export const getSubmissions = (filters: SubmissionFilters) => {
  const qs = new URLSearchParams();
  if (filters.status) qs.set('status', filters.status);
  if (filters.form_type) qs.set('form_type', filters.form_type);
  if (filters.category) qs.set('category', filters.category);
  if (filters.q) qs.set('q', filters.q);
  if (filters.page && filters.page > 1) qs.set('page', String(filters.page));

  const query = qs.toString();
  return request<Paginated<SubmissionSummary>>(
    `/admin/submissions${query ? `?${query}` : ''}`,
    {},
    true
  );
};

export const getSubmission = (id: string | number) =>
  request<SubmissionDetail>(`/admin/submissions/${id}`, {}, true);

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

// Télécharge une pièce jointe en envoyant le jeton, puis propose le fichier au navigateur
export async function downloadAttachment(id: number, filename: string): Promise<void> {
  const res = await rawFetch(`/admin/attachments/${id}/download`, {}, true);

  if (!res.ok) {
    throw new ApiError(
      res.status === 404 ? 'Fichier introuvable.' : messageFor(res.status),
      res.status
    );
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
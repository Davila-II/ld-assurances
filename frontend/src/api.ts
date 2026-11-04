import { clearToken, getToken } from './auth';
import type {
  AdminStats,
  BuilderCategory,
  BuilderField,
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
  TrackResult,
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

// Avec un type, seules les catégories qui ont un formulaire de ce type sont renvoyées
export const getCategories = (type?: FormType) =>
  request<Category[]>(type ? `/categories?type=${type}` : '/categories');

export const getForm = (slug: string, type: FormType = 'claim') =>
  request<FormDefinition>(`/categories/${encodeURIComponent(slug)}/form?type=${type}`);

export const submitForm = (formData: FormData) =>
  request<SubmissionResult>('/submissions', { method: 'POST', body: formData });

export const trackSubmission = (reference: string) =>
  request<TrackResult>(`/track/${encodeURIComponent(reference)}`);

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
  if (filters.type) qs.set('type', filters.type);
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

export const getStats = () => request<AdminStats>('/admin/stats', {}, true);

// --- Constructeur de formulaires ---

export const getBuilderCategories = () =>
  request<BuilderCategory[]>('/admin/form-builder/categories', {}, true);

export const createBuilderCategory = (name: string) =>
  request<BuilderCategory>(
    '/admin/form-builder/categories',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) },
    true
  );

export const updateBuilderCategory = (id: number, data: Partial<{ name: string; is_active: boolean }>) =>
  request<BuilderCategory>(
    `/admin/form-builder/categories/${id}`,
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) },
    true
  );

export const getBuilderFields = (categoryId: number, type: FormType) =>
  request<BuilderField[]>(`/admin/form-builder/categories/${categoryId}/fields?type=${type}`, {}, true);

export const createBuilderField = (categoryId: number, data: Record<string, unknown>) =>
  request<BuilderField>(
    `/admin/form-builder/categories/${categoryId}/fields`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) },
    true
  );

export const updateBuilderField = (fieldId: number, data: Record<string, unknown>) =>
  request<BuilderField>(
    `/admin/form-builder/fields/${fieldId}`,
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) },
    true
  );

export const deleteBuilderField = (fieldId: number) =>
  request<{ id: number; is_active: boolean }>(`/admin/form-builder/fields/${fieldId}`, { method: 'DELETE' }, true);

export const reorderBuilderFields = (categoryId: number, formType: FormType, fieldIds: number[]) =>
  request<{ message: string }>(
    `/admin/form-builder/categories/${categoryId}/fields/reorder`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ form_type: formType, field_ids: fieldIds }),
    },
    true
  );

export const updateSubmissionNotes = (id: number, notes: string) =>
  request<{ id: number; notes: string | null }>(
    `/admin/submissions/${id}/notes`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    },
    true
  );

export const replyToSubmission = (id: number, message: string) =>
  request<{ message: string }>(
    `/admin/submissions/${id}/reply`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
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

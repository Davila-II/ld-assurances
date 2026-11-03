import type { Category, FormDefinition, FormType, SubmissionResult } from './types';

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

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { Accept: 'application/json', ...init.headers },
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError('Le serveur met trop de temps à répondre. Réessayez dans un instant.');
    }
    throw new ApiError('Impossible de joindre le serveur. Vérifiez votre connexion internet.');
  } finally {
    clearTimeout(timer);
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(messageFor(res.status, data?.message), res.status, data?.errors ?? {});
  }

  return data as T;
}

export const getCategories = () => request<Category[]>('/categories');

export const getForm = (slug: string, type: FormType = 'claim') =>
  request<FormDefinition>(`/categories/${encodeURIComponent(slug)}/form?type=${type}`);

export const submitForm = (formData: FormData) =>
  request<SubmissionResult>('/submissions', { method: 'POST', body: formData });
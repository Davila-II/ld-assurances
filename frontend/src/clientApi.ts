import { ApiError } from './api';
import { clearClientToken, getClientToken } from './clientAuth';
import type { ClientAuthResult, ClientPage, ClientSubmission, ClientUser } from './clientTypes';

const API_URL = import.meta.env.VITE_API_URL as string;
const TIMEOUT_MS = 30000;

async function call<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');

  if (typeof init.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  if (auth) {
    const token = getClientToken();
    if (!token) {
      throw new ApiError('Session expirée. Veuillez vous reconnecter.', 401);
    }
    headers.set('Authorization', `Bearer ${token}`);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${API_URL}/client${path}`, { ...init, headers, signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError('Le serveur met trop de temps à répondre. Réessayez dans un instant.');
    }
    throw new ApiError('Impossible de joindre le serveur. Vérifiez votre connexion internet.');
  } finally {
    clearTimeout(timer);
  }

  const data = await res.json().catch(() => null);

  // Jeton refusé ou expiré : retour à la connexion
  if (auth && res.status === 401) {
    clearClientToken();
    window.location.assign('/espace-client/connexion');
    throw new ApiError('Session expirée. Veuillez vous reconnecter.', 401);
  }

  if (!res.ok) {
    const message =
      res.status === 429
        ? 'Trop de tentatives. Patientez une minute puis réessayez.'
        : data?.message || 'Une erreur est survenue.';
    throw new ApiError(message, res.status, data?.errors ?? {});
  }

  return data as T;
}

const send = (method: string, payload: unknown): RequestInit => ({
  method,
  body: JSON.stringify(payload),
});

// Message à afficher : la première erreur de champ si elle existe, sinon le message général
export function clientErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const first = Object.values(err.errors ?? {})[0];
    if (first && first[0]) return first[0];
    return err.message;
  }
  return err instanceof Error ? err.message : 'Erreur inattendue.';
}

// --- Sans connexion ---

export const clientRegister = (payload: {
  name: string;
  email: string;
  phone: string;
  password: string;
  password_confirmation: string;
}) => call<ClientAuthResult>('/register', send('POST', payload), false);

export const clientLogin = (email: string, password: string) =>
  call<ClientAuthResult>('/login', send('POST', { email, password }), false);

export const clientForgot = (email: string) =>
  call<{ message: string }>('/forgot-password', send('POST', { email }), false);

export const clientReset = (payload: {
  token: string;
  email: string;
  password: string;
  password_confirmation: string;
}) => call<{ message: string }>('/reset-password', send('POST', payload), false);

// --- Connecté ---

export const clientMe = () => call<ClientUser>('/me');

export const clientLogout = () => call<{ message: string }>('/logout', { method: 'POST' });

export const clientVerify = (code: string) =>
  call<{ message: string; user: ClientUser; linked: number }>('/email/verify', send('POST', { code }));

export const clientResend = () => call<{ message: string }>('/email/resend', { method: 'POST' });

export const clientUpdateProfile = (payload: { name: string; phone: string }) =>
  call<ClientUser>('/profile', send('PATCH', payload));

export const clientChangePassword = (payload: {
  current_password: string;
  password: string;
  password_confirmation: string;
}) => call<{ message: string }>('/password', send('POST', payload));

export const getMySubmissions = (type?: 'claim' | 'quote') =>
  call<ClientPage<ClientSubmission>>(`/submissions${type ? `?type=${type}` : ''}`);

export const updateMySubmission = (reference: string, answers: Record<string, unknown>) =>
  call<{ reference: string; status: string; updated_at: string }>(
    `/submissions/${encodeURIComponent(reference)}`,
    { method: 'PUT', body: JSON.stringify({ answers }) },
  );

/**
 * Télécharge le PDF d'une soumission du client et l'ouvre dans un nouvel onglet.
 * Utilise directement fetch pour récupérer le binaire sans JSON parsing.
 */
export const downloadSubmissionPdf = async (reference: string): Promise<void> => {
  const token = getClientToken();
  if (!token) throw new ApiError('Session expirée. Veuillez vous reconnecter.', 401);

  const API_URL = import.meta.env.VITE_API_URL as string;
  const res = await fetch(`${API_URL}/client/submissions/${encodeURIComponent(reference)}/pdf`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/pdf',
    },
  });

  if (!res.ok) throw new ApiError('Le téléchargement du PDF a échoué.', res.status);

  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href     = url;
  link.download = `${reference}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
};
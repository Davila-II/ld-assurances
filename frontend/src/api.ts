import { clearToken, getToken } from './auth';
import { getClientToken } from './clientAuth';
import type {
  AdminClient,
  AdminStats,
  BuilderCategory,
  BuilderField,
  Category,
  FormDefinition,
  FormType,
  LoginResult,
  Paginated,
  PricingRule,
  QuoteCalculation,
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

export const submitForm = (formData: FormData) => {
  const token = getClientToken();

  return request<SubmissionResult>('/submissions', {
    method: 'POST',
    body: formData,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
};

export const trackSubmission = (reference: string, email: string) =>
  request<TrackResult>('/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reference, email }),
  });

export const updateTrackSubmission = (reference: string, email: string, answers: Record<string, unknown>) =>
  request<{ reference: string; status: string; updated_at: string }>('/track', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reference, email, answers }),
  });

export const downloadTrackPdf = async (reference: string, email: string): Promise<void> => {
  const res = await rawFetch('/track/pdf', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/pdf',
    },
    body: JSON.stringify({ reference, email }),
  });

  if (!res.ok) {
    throw new ApiError('Impossible de télécharger le PDF.', res.status);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${reference}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const downloadTrackAttachment = async (
  reference: string,
  email: string,
  attachmentId: number,
  filename: string
): Promise<void> => {
  const res = await rawFetch('/track/attachment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reference, email, attachment_id: attachmentId }),
  });

  if (!res.ok) {
    throw new ApiError('Impossible de télécharger la pièce jointe.', res.status);
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
};

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

export const updateSubmissionStatus = (
  id: number | string,
  status: SubmissionStatus,
  rejection_reason?: string
) =>
  request<{ id: number; status: SubmissionStatus; rejection_reason?: string | null }>(
    `/admin/submissions/${id}/status`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, rejection_reason: rejection_reason || undefined }),
    },
    true
  );

export const getClients = (params: { q?: string; page?: number } = {}) => {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.page && params.page > 1) qs.set('page', String(params.page));
  const query = qs.toString();
  return request<Paginated<AdminClient>>(`/admin/clients${query ? `?${query}` : ''}`, {}, true);
};

export const createClient = (data: {
  name: string;
  email: string;
  phone?: string;
  password?: string;
}) =>
  request<{ message: string; user: AdminClient; temporary_password?: string }>(
    '/admin/clients',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    },
    true
  );

export const getStats = () => request<AdminStats>('/admin/stats', {}, true);

// --- Constructeur de formulaires ---

export const getBuilderCategories = (formType?: FormType) =>
  request<BuilderCategory[]>(
    `/admin/form-builder/categories${formType ? `?form_type=${formType}` : ''}`,
    {},
    true
  );

export const createBuilderCategory = (data: {
  name: string;
  name_en?: string;
  form_type?: FormType;
  pricing_rule_id?: number | null;
  new_pricing_rule?: Partial<PricingRule>;
}) =>
  request<BuilderCategory>(
    '/admin/form-builder/categories',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) },
    true
  );

export const updateBuilderCategory = (
  id: number,
  data: Partial<{
    name: string;
    name_en?: string;
    form_type?: FormType;
    is_active: boolean;
    sort_order: number;
    pricing_rule_id: number | null;
  }>
) =>
  request<BuilderCategory>(
    `/admin/form-builder/categories/${id}`,
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) },
    true
  );

// --- Règles de tarification & Calculs de devis ---

export const getPricingRules = () =>
  request<PricingRule[]>('/admin/pricing-rules', {}, true);

export const getPricingRule = (id: number) =>
  request<PricingRule>(`/admin/pricing-rules/${id}`, {}, true);

export const createPricingRule = (data: Partial<PricingRule>) =>
  request<PricingRule>(
    '/admin/pricing-rules',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) },
    true
  );

export const updatePricingRule = (id: number, data: Partial<PricingRule>) =>
  request<PricingRule>(
    `/admin/pricing-rules/${id}`,
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) },
    true
  );

export const deletePricingRule = (id: number) =>
  request<{ message: string }>(`/admin/pricing-rules/${id}`, { method: 'DELETE' }, true);

export const testPricingRule = (
  id: number,
  data: { answers: Record<string, unknown>; parameters?: Record<string, unknown> }
) =>
  request<QuoteCalculation | { has_calculation: false }>(
    `/admin/pricing-rules/${id}/test`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) },
    true
  );

// Simulation / calcul direct public d'un devis
export const calculateQuote = (categorySlug: string, answers: Record<string, unknown>) =>
  request<{
    calculated: boolean;
    category?: string;
    pricing_rule?: PricingRule;
    calculation: QuoteCalculation | null;
    message?: string;
  }>('/quotes/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category: categorySlug, answers }),
  });

// Simulation / calcul direct public de l'indemnisation d'un sinistre (Code CIMA)
export const calculateClaim = (categorySlug: string, answers: Record<string, unknown>) =>
  request<{
    calculated?: boolean;
    has_calculation?: boolean;
    category?: string;
    calculation?: QuoteCalculation | null;
    indemnisation_estimee?: number;
    indemnisation_estimee_formatted?: string;
    franchise?: number;
    franchise_formatted?: string;
    montant_brut?: number;
    montant_brut_formatted?: string;
    regle_appliquee?: string;
    regle_appliquee_en?: string;
    notes_explicatives?: string;
    notes_explicatives_en?: string;
    breakdown?: Array<{ label: string; label_en?: string; amount: number; formatted: string }>;
    message?: string;
  }>('/claims/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category: categorySlug, answers }),
  });

export const deleteBuilderCategory = (id: number) =>
  request<{ message: string }>(`/admin/form-builder/categories/${id}`, { method: 'DELETE' }, true);

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

export async function replyToSubmission(id: number, message: string, attachments?: File[]): Promise<{ message: string }> {
  const formData = new FormData();
  formData.append('message', message);
  if (attachments && attachments.length > 0) {
    attachments.forEach((file) => formData.append('attachments[]', file));
  }
  // Ne pas setter Content-Type : le navigateur le fait automatiquement avec le boundary multipart
  const res = await rawFetch(`/admin/submissions/${id}/reply`, { method: 'POST', body: formData }, true);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError((body as { message?: string }).message ?? messageFor(res.status), res.status);
  }
  return res.json() as Promise<{ message: string }>;
}

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

// Télécharge le récapitulatif PDF d'une soumission (Admin)
export async function downloadSubmissionPdfAdmin(submissionId: number, filename: string): Promise<void> {
  const res = await rawFetch(`/admin/submissions/${submissionId}/pdf`, {}, true);

  if (!res.ok) {
    throw new ApiError(
      res.status === 404 ? 'Dossier introuvable.' : messageFor(res.status),
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

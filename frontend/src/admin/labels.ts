import type { FormType, SubmissionAnswer, SubmissionStatus } from '../types';

export const STATUS_LABELS: Record<SubmissionStatus, string> = {
  received: 'Reçu',
  in_progress: 'En cours',
  answered: 'Répondu',
  closed: 'Clôturé',
};

export const STATUSES: SubmissionStatus[] = Object.keys(STATUS_LABELS) as SubmissionStatus[];

export const FORM_TYPE_LABELS: Record<FormType, string> = {
  claim: 'Sinistre',
  quote: 'Devis',
};

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Douala',
  });
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function formatAnswer(value: SubmissionAnswer['value']): string {
  if (value === null || value === undefined || value === '') return 'Non renseigné';
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Erreur inattendue.';
}

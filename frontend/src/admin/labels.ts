import type { FormType, SubmissionAnswer, SubmissionStatus } from '../types';

export const STATUS_LABELS: Record<SubmissionStatus, string> = {
  received: 'Reçu',
  in_progress: 'En cours',
  answered: 'Répondu',
  closed: 'Clôturé',
  rejected: 'Rejeté',
};

export const STATUSES: SubmissionStatus[] = Object.keys(STATUS_LABELS) as SubmissionStatus[];

export const FORM_TYPE_LABELS: Record<FormType, string> = {
  claim: 'Sinistre',
  quote: 'Devis',
};

// Types de sinistre possibles (définis dans InsuranceFormSeeder)
export const SINISTRE_TYPES = [
  'Automobile',
  'Habitation',
  'Santé',
  'Responsabilité civile',
  'Transport',
  'Agricole',
  'Entreprise',
  'Autre',
];

export const FIELD_TYPES = ['text', 'textarea', 'number', 'date', 'select', 'multiselect', 'checkbox', 'file'];

export const FIELD_TYPE_LABELS: Record<string, string> = {
  text: 'Texte',
  textarea: 'Zone de texte',
  number: 'Nombre',
  date: 'Date',
  select: 'Liste déroulante',
  multiselect: 'Choix multiple',
  checkbox: 'Case à cocher',
  file: 'Fichier',
};

export const FIELD_TYPE_LABELS_EN: Record<string, string> = {
  text: 'Text',
  textarea: 'Text area',
  number: 'Number',
  date: 'Date',
  select: 'Dropdown list',
  multiselect: 'Multiple choice',
  checkbox: 'Checkbox',
  file: 'File upload',
};

export function getFieldTypeLabel(type: string, lang: 'fr' | 'en' = 'fr'): string {
  if (lang === 'en') {
    return FIELD_TYPE_LABELS_EN[type] || FIELD_TYPE_LABELS[type] || type;
  }
  return FIELD_TYPE_LABELS[type] || type;
}

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

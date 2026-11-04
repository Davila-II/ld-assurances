export type FormType = 'claim' | 'quote';

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'file';

export interface Category {
  id: number;
  name: string;
  slug: string;
}

export interface FieldCondition {
  field: string;
  equals: string;
}

export interface FormField {
  id: number;
  name: string;
  label: string;
  placeholder: string | null;
  section: string | null;
  field_type: FieldType;
  is_required: boolean;
  options: string[] | null;
  condition: FieldCondition | null;
  sort_order: number;
}

export interface FormDefinition {
  category: Category;
  form_type: FormType;
  fields: FormField[];
}

export type AnswerValue = string | boolean | string[] | FileList | null | undefined;
export type Answers = Record<string, AnswerValue>;

export interface SubmissionResult {
  message: string;
  reference: string;
}

export interface TrackResult {
  reference: string;
  form_type: FormType;
  status: SubmissionStatus;
  status_label: string;
  category: string | null;
  created_at: string;
  updated_at: string;
}

// --- Administration ---

export type SubmissionStatus = 'received' | 'in_progress' | 'answered' | 'closed';

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface LoginResult {
  token: string;
  user: AdminUser;
}

export interface SubmissionSummary {
  id: number;
  reference: string;
  form_type: FormType;
  status: SubmissionStatus;
  email: string;
  category: string | null;
  attachments_count: number;
  created_at: string;
}

export interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
  from: number | null;
  to: number | null;
}

export interface SubmissionFilters {
  status?: string;
  form_type?: string;
  category?: string;
  q?: string;
  page?: number;
}

export interface SubmissionAnswer {
  label: string;
  type: FieldType;
  value: string | number | boolean | string[] | null;
}

export interface AttachmentInfo {
  id: number;
  original_name: string;
  mime_type: string;
  size: number;
}

export interface SubmissionDetail {
  id: number;
  reference: string;
  form_type: FormType;
  status: SubmissionStatus;
  email: string;
  category: string | null;
  created_at: string;
  answers: SubmissionAnswer[];
  attachments: AttachmentInfo[];
}
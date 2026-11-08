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
  name_en?: string | null;
  slug: string;
  form_type?: FormType | null;
  pricing_rule_id?: number | null;
  pricing_rule?: PricingRule | null;
  has_pricing_calculator?: boolean;
}

export type PricingDriver =
  | 'automobile'
  | 'voyage'
  | 'habitation'
  | 'sante'
  | 'professionnelle'
  | 'responsabilite_civile'
  | 'autres'
  | 'sinistre_auto'
  | 'sinistre_habitation'
  | 'sinistre_sante'
  | 'sinistre_rc'
  | 'sinistre_professionnelle'
  | 'sinistre_voyage'
  | 'sinistre_agricole'
  | 'sinistre_autres'
  | 'custom';

export interface QuoteBreakdownItem {
  key: string;
  label: string;
  label_en?: string;
  amount: number;
  formatted: string;
  detail?: string;
}

export interface QuoteCalculation {
  driver?: string;
  type?: 'quote' | 'claim';
  rule_id?: number | null;
  rule_name?: string | null;
  prime_nette?: number;
  prime_nette_formatted?: string;
  accessoires?: number;
  accessoires_formatted?: string;
  taxe_unique?: number;
  taxe_unique_formatted?: string;
  prime_ttc: number;
  prime_ttc_formatted: string;
  breakdown: QuoteBreakdownItem[];
  currency: string;
  calculated_at?: string;
  // Champs spécifiques à l'indemnisation de sinistre
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
}

export interface PricingRule {
  id: number;
  name: string;
  name_en?: string | null;
  code: string;
  description?: string | null;
  driver: PricingDriver;
  parameters: Record<string, unknown>;
  formula_code?: string | null;
  is_active: boolean;
  categories_count?: number;
}

export interface FieldCondition {
  field: string;
  equals: string;
}

export interface FormField {
  id: number;
  name: string;
  label: string;
  label_en?: string | null;
  placeholder: string | null;
  placeholder_en?: string | null;
  section: string | null;
  section_en?: string | null;
  field_type: FieldType;
  is_required: boolean;
  options: string[] | null;
  options_en?: string[] | null;
  condition: FieldCondition | null;
  sort_order: number;
}

export interface FormDefinition {
  category: Category;
  form_type: FormType;
  fields: FormField[];
  pricing_rule?: PricingRule | null;
  has_pricing_calculator?: boolean;
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
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
  taken_at?: string | null;
  processed_at?: string | null;
  quote_calculation?: QuoteCalculation | null;
  answers?: Record<string, unknown> | null;
  form_snapshot?: Array<{ name: string; label: string; field_type: string }> | null;
  admin_attachments?: Array<{
    id: number;
    original_name: string;
    mime_type: string;
    size: number;
  }>;
}

// --- Administration ---

export type SubmissionStatus = 'received' | 'in_progress' | 'answered' | 'closed' | 'rejected';

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
  type: string | null;
  attachments_count: number;
  created_at: string;
  processed_at?: string | null;
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
  type?: string;
  q?: string;
  page?: number;
}

export interface AdminStats {
  total: number;
  by_status: Record<SubmissionStatus, number>;
  by_form_type: Record<FormType, number>;
  recent: Array<{
    id: number;
    reference: string;
    form_type: FormType;
    status: SubmissionStatus;
    category: string | null;
    created_at: string;
  }>;
}

export interface BuilderCategory {
  id: number;
  name: string;
  name_en?: string | null;
  slug: string;
  form_type?: FormType | null;
  is_active: boolean;
  sort_order: number;
  quote_count: number;
  claim_count: number;
  pricing_rule_id?: number | null;
  pricing_rule?: PricingRule | null;
}

export interface BuilderField {
  id: number;
  name: string;
  label: string;
  label_en?: string | null;
  placeholder: string | null;
  placeholder_en?: string | null;
  section: string | null;
  section_en?: string | null;
  field_type: FieldType;
  is_required: boolean;
  options: string[] | null;
  options_en?: string[] | null;
  condition: FieldCondition | null;
  sort_order: number;
  is_active: boolean;
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
  source?: 'client' | 'admin';
}

export interface SubmissionDetail {
  id: number;
  reference: string;
  form_type: FormType;
  status: SubmissionStatus;
  email: string;
  category: string | null;
  type: string | null;
  notes: string | null;
  rejection_reason?: string | null;
  created_at: string;
  processed_at?: string | null;
  taken_at?: string | null;
  closed_at?: string | null;
  answers: SubmissionAnswer[];
  attachments: AttachmentInfo[];
  quote_calculation?: QuoteCalculation | null;
}

export interface AdminClient {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  submissions_count: number;
  created_at: string;
}
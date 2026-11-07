export interface ClientUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  email_verified: boolean;
}

export interface ClientAuthResult {
  token: string;
  user: ClientUser;
}

export interface ClientSubmission {
  reference: string;
  form_type: 'claim' | 'quote';
  status: string;
  status_label: string;
  category: string | null;
  category_en?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
  processed_at?: string | null;
}

export interface ClientPage<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
}
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

export interface AdminAttachment {
  id: number;
  original_name: string;
  mime_type: string;
  size: number;
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
  taken_at?: string | null;
  closed_at?: string | null;
  admin_attachments?: AdminAttachment[];
}

export interface ClientPage<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
}
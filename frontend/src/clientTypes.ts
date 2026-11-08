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

export interface SubmissionReplyItem {
  id: number;
  message: string;
  created_at: string;
  is_read?: boolean;
  read_at?: string | null;
  attachments?: AdminAttachment[];
}

export interface ClientNotificationItem {
  id: number;
  submission_reference: string;
  form_type: 'claim' | 'quote';
  category?: string | null;
  category_en?: string | null;
  message: string;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
  attachments?: AdminAttachment[];
}

export interface ClientNotificationsResponse {
  unread_count: number;
  notifications: ClientNotificationItem[];
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
  quote_calculation?: import('./types').QuoteCalculation | null;
  admin_attachments?: AdminAttachment[];
  replies_count?: number;
  unread_replies_count?: number;
  replies?: SubmissionReplyItem[];
}

export interface ClientPage<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
}
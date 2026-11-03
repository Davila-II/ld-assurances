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
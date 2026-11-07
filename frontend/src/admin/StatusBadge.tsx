import { useLanguage } from '../i18n/LanguageContext';
import type { SubmissionStatus } from '../types';
import { STATUS_LABELS } from './labels';

export default function StatusBadge({ status }: { status: SubmissionStatus }) {
  const { t } = useLanguage();
  const label = t(`status.${status}` as const) || STATUS_LABELS[status];
  return <span className={`badge badge-${status}`}>{label}</span>;
}

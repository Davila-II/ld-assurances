import type { SubmissionStatus } from '../types';
import { STATUS_LABELS } from './labels';

export default function StatusBadge({ status }: { status: SubmissionStatus }) {
  return <span className={`badge badge-${status}`}>{STATUS_LABELS[status]}</span>;
}

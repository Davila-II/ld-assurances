import type { ReactNode } from 'react';

interface Props {
  icon: ReactNode;
  title: string;
  message: string;
  action?: ReactNode;
}

export default function EmptyState({ icon, title, message, action }: Props) {
  return (
    <div className="client-empty">
      {icon}
      <h2>{title}</h2>
      <p>{message}</p>
      {action}
    </div>
  );
}

import { FileCheck } from 'lucide-react';
import EmptyState from './EmptyState';

export default function ContractsPage() {
  return (
    <div className="client-content-inner">
      <h1 className="client-page-title">Mes contrats</h1>
      <p className="client-page-subtitle">
        Consultez vos contrats d'assurance et attestations.
      </p>

      <EmptyState
        icon={<FileCheck size={40} />}
        title="Aucun contrat"
        message="Vos contrats et attestations apparaîtront ici une fois vos demandes validées."
      />
    </div>
  );
}

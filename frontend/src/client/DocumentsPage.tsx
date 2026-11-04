import { FolderOpen } from 'lucide-react';
import EmptyState from './EmptyState';

export default function DocumentsPage() {
  return (
    <div className="client-content-inner">
      <h1 className="client-page-title">Mes documents</h1>
      <p className="client-page-subtitle">
        Téléchargez vos attestations, devis et documents liés à vos dossiers.
      </p>

      <EmptyState
        icon={<FolderOpen size={40} />}
        title="Aucun document"
        message="Aucun document n'est disponible pour le moment."
      />
    </div>
  );
}

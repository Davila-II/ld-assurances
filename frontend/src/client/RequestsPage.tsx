import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import EmptyState from './EmptyState';

export default function RequestsPage() {
  return (
    <div className="client-content-inner">
      <h1 className="client-page-title">Mes demandes</h1>
      <p className="client-page-subtitle">
        Suivez ici vos demandes de devis et leur état d'avancement.
      </p>

      <EmptyState
        icon={<FileText size={40} />}
        title="Aucune demande de devis"
        message="Vous n'avez pas encore effectué de demande. Lancez votre première demande de devis."
        action={
          <Link className="btn" to="/?service=devis">
            Demander un devis
          </Link>
        }
      />
    </div>
  );
}

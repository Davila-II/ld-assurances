import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import EmptyState from './EmptyState';

export default function ClaimsPage() {
  return (
    <div className="client-content-inner">
      <h1 className="client-page-title">Mes sinistres</h1>
      <p className="client-page-subtitle">
        Retrouvez vos déclarations de sinistre et suivez leur traitement.
      </p>

      <EmptyState
        icon={<ShieldAlert size={40} />}
        title="Aucun sinistre déclaré"
        message="Vous n'avez pas encore déclaré de sinistre depuis votre espace client."
        action={
          <Link className="btn btn-danger" to="/?service=sinistre">
            Déclarer un sinistre
          </Link>
        }
      />
    </div>
  );
}

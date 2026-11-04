import { Link } from 'react-router-dom';
import { AlertTriangle, FileCheck, FileText, FolderOpen, ShieldAlert } from 'lucide-react';

const STATS = [
  { label: 'Mes demandes de devis', value: 0, icon: <FileText size={22} /> },
  { label: 'Mes sinistres', value: 0, icon: <ShieldAlert size={22} /> },
  { label: 'Mes contrats', value: 0, icon: <FileCheck size={22} /> },
  { label: 'Mes documents', value: 0, icon: <FolderOpen size={22} /> },
];

export default function DashboardPage() {
  return (
    <div className="client-content-inner">
      <h1 className="client-page-title">Tableau de bord</h1>
      <p className="client-page-subtitle">
        Bienvenue dans votre espace client. Retrouvez ici toutes vos demandes et documents.
      </p>

      <div className="client-stats">
        {STATS.map((stat) => (
          <div className="client-stat" key={stat.label}>
            {stat.icon}
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </div>

      <div className="client-actions">
        <Link className="client-action-card" to="/?service=devis">
          <FileText size={24} />
          <strong>Demander un devis</strong>
          <span>Obtenez un devis personnalisé en quelques minutes.</span>
        </Link>

        <Link className="client-action-card" to="/?service=sinistre">
          <AlertTriangle size={24} />
          <strong>Déclarer un sinistre</strong>
          <span>Déclarez un sinistre et suivez son traitement.</span>
        </Link>
      </div>
    </div>
  );
}

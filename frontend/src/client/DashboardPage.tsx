import { Link } from 'react-router-dom';
import { AlertTriangle, FileText, ShieldAlert } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export default function DashboardPage() {
  const { t } = useLanguage();

  const stats = [
    { label: t('client.stat_quotes'), value: 0, icon: <FileText size={22} /> },
    { label: t('client.stat_claims'), value: 0, icon: <ShieldAlert size={22} /> },
  ];

  return (
    <div className="client-content-inner">
      <h1 className="client-page-title">{t('client.dashboard')}</h1>
      <p className="client-page-subtitle">{t('client.welcome_sub')}</p>

      <div className="client-stats">
        {stats.map((stat) => (
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
          <strong>{t('client.action_quote_title')}</strong>
          <span>{t('client.action_quote_desc')}</span>
        </Link>

        <Link className="client-action-card" to="/?service=sinistre">
          <AlertTriangle size={24} />
          <strong>{t('client.action_claim_title')}</strong>
          <span>{t('client.action_claim_desc')}</span>
        </Link>
      </div>
    </div>
  );
}

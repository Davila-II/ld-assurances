import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import EmptyState from './EmptyState';
import { useLanguage } from '../i18n/LanguageContext';

export default function ClaimsPage() {
  const { t } = useLanguage();

  return (
    <div className="client-content-inner">
      <h1 className="client-page-title">{t('client.my_claims')}</h1>
      <p className="client-page-subtitle">{t('client.claims_sub')}</p>

      <EmptyState
        icon={<ShieldAlert size={40} />}
        title={t('client.empty_claims_title')}
        message={t('client.empty_claims_desc')}
        action={
          <Link className="btn btn-danger" to="/?service=sinistre">
            {t('client.action_claim_title')}
          </Link>
        }
      />
    </div>
  );
}

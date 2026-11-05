import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import EmptyState from './EmptyState';
import { useLanguage } from '../i18n/LanguageContext';

export default function RequestsPage() {
  const { t } = useLanguage();

  return (
    <div className="client-content-inner">
      <h1 className="client-page-title">{t('client.my_requests')}</h1>
      <p className="client-page-subtitle">{t('client.requests_sub')}</p>

      <EmptyState
        icon={<FileText size={40} />}
        title={t('client.empty_quotes_title')}
        message={t('client.empty_quotes_desc')}
        action={
          <Link className="btn" to="/?service=devis">
            {t('client.action_quote_title')}
          </Link>
        }
      />
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getCategories } from '../api';
import DynamicForm from '../components/DynamicForm';
import { PRODUCTS } from '../products';
import { CONTACT_URL, SITE, telHref } from '../siteConfig';
import type { Category, FormType } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

// Vue « devis » : une carte par type d'assurance.
function QuoteHub() {
  const { t } = useLanguage();

  return (
    <main className="page hub">
      <h1 className="hub-title">{t('quotes.title')}</h1>
      <p className="hub-subtitle">{t('quotes.subtitle')}</p>

      <div className="hub-grid">
        {PRODUCTS.map((product) => {
          const label = product.labelKey ? t(product.labelKey) : product.label;
          const desc = product.descKey ? t(product.descKey) : product.description;

          const inner = (
            <>
              <span className="hub-icon">{product.icon}</span>
              <span className="hub-name">{label}</span>
              <span className="hub-desc">{desc}</span>
            </>
          );

          return product.mainQuoteUrl ? (
            <a
              key={product.key}
              href={product.mainQuoteUrl}
              className={`hub-card tone-${product.tone}`}
            >
              {inner}
            </a>
          ) : (
            <Link
              key={product.key}
              to={`/devis/${product.key}`}
              className={`hub-card tone-${product.tone}`}
            >
              {inner}
            </Link>
          );
        })}
      </div>

      <section className="hub-contact">
        <h2>{t('quotes.cant_find_title')}</h2>
        <p>{t('quotes.cant_find_desc')}</p>
        <a className="hub-contact-btn" href={CONTACT_URL}>
          {t('quotes.contact_us')}
        </a>
      </section>
    </main>
  );
}

// Vue « sinistre » : un seul formulaire général, qui s'adapte au type choisi
function ClaimFlow() {
  const { t } = useLanguage();
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getCategories('claim')
      .then((categories) =>
        setCategory(categories.find((c) => c.slug === 'sinistre') ?? categories[0] ?? null)
      )
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Erreur inattendue.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="page">
      <h1 className="page-title accent">{t('claims.title')}</h1>
      <p className="page-subtitle">{t('claims.subtitle')}</p>

      <p className="urgent-note">
        {t('site.emergency')}{' '}
        <a href={telHref(SITE.emergencyPhone)}>{SITE.emergencyPhone}</a>
      </p>
      <p className="deadline-note">{t('site.deadline')}</p>

      {error && <p className="alert">{error}</p>}
      {loading && <p className="center">{t('claims.loading')}</p>}

      {category && (
        <div className="form-wrap">
          <DynamicForm key={`${category.slug}-claim`} category={category} formType="claim" />
        </div>
      )}
    </main>
  );
}

export default function PublicPage() {
  const [params] = useSearchParams();
  const formType: FormType = params.get('service') === 'devis' ? 'quote' : 'claim';

  if (formType === 'quote') return <QuoteHub />;
  return <ClaimFlow />;
}

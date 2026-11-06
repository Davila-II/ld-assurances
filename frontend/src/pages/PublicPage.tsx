import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Briefcase, Car, FileText, HeartPulse, House, Plane, Shield, Sprout } from 'lucide-react';
import { getCategories } from '../api';
import DynamicForm from '../components/DynamicForm';
import { PRODUCTS } from '../products';
import { CONTACT_URL, SITE, telHref } from '../siteConfig';
import type { Category } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import type { TranslationKey } from '../i18n/translations';

interface ClaimItem {
  key: string;
  type: string;
  titleKey: TranslationKey;
  descKey: TranslationKey;
  icon: React.ReactNode;
  tone: string;
}

const CLAIM_ITEMS: ClaimItem[] = [
  {
    key: 'auto',
    type: 'Automobile',
    titleKey: 'claims.auto_title',
    descKey: 'claims.auto_desc',
    icon: <Car size={32} />,
    tone: 'blue',
  },
  {
    key: 'habitation',
    type: 'Habitation',
    titleKey: 'claims.habitation_title',
    descKey: 'claims.habitation_desc',
    icon: <House size={32} />,
    tone: 'green',
  },
  {
    key: 'sante',
    type: 'Santé',
    titleKey: 'claims.sante_title',
    descKey: 'claims.sante_desc',
    icon: <HeartPulse size={32} />,
    tone: 'red',
  },
  {
    key: 'professionnel',
    type: 'Entreprise',
    titleKey: 'claims.pro_title',
    descKey: 'claims.pro_desc',
    icon: <Briefcase size={32} />,
    tone: 'purple',
  },
  {
    key: 'responsabilite-civile',
    type: 'Responsabilité civile',
    titleKey: 'claims.rc_title',
    descKey: 'claims.rc_desc',
    icon: <Shield size={32} />,
    tone: 'yellow',
  },
  {
    key: 'transport',
    type: 'Transport',
    titleKey: 'claims.transport_title',
    descKey: 'claims.transport_desc',
    icon: <Plane size={32} />,
    tone: 'cyan',
  },
  {
    key: 'agricole',
    type: 'Agricole',
    titleKey: 'claims.agricole_title',
    descKey: 'claims.agricole_desc',
    icon: <Sprout size={32} />,
    tone: 'green',
  },
  {
    key: 'autre',
    type: 'Autre',
    titleKey: 'claims.autre_title',
    descKey: 'claims.autre_desc',
    icon: <FileText size={32} />,
    tone: 'gray',
  },
];

// Vue « devis » : une carte par type d'assurance
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

          return (
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

// Vue « hub sinistres » : choix du type de sinistre à déclarer
function ClaimHub() {
  const { t } = useLanguage();

  return (
    <main className="page hub">
      <h1 className="hub-title">{t('claims.title')}</h1>
      <p className="hub-subtitle">{t('claims.subtitle')}</p>

      <div className="urgent-banner" style={{ marginBottom: '32px' }}>
        <p className="urgent-note" style={{ margin: 0 }}>
          {t('site.emergency')}{' '}
          <a href={telHref(SITE.emergencyPhone)}>{SITE.emergencyPhone}</a>
        </p>
        <p className="deadline-note" style={{ margin: '6px 0 0' }}>{t('site.deadline')}</p>
      </div>

      <div className="hub-grid">
        {CLAIM_ITEMS.map((item) => (
          <Link
            key={item.key}
            to={`/?service=sinistre&type=${encodeURIComponent(item.type)}`}
            className={`hub-card tone-${item.tone}`}
          >
            <span className="hub-icon">{item.icon}</span>
            <span className="hub-name">{t(item.titleKey)}</span>
            <span className="hub-desc">{t(item.descKey)}</span>
          </Link>
        ))}
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

// Vue « formulaire de sinistre » pour le type sélectionné
function ClaimFlow({ selectedType }: { selectedType?: string }) {
  const { t } = useLanguage();
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const currentItem = CLAIM_ITEMS.find(
    (item) => item.type.toLowerCase() === (selectedType ?? '').toLowerCase()
  );

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
      <Link className="back-btn" to="/?service=sinistre">
        <ArrowLeft size={16} /> {t('claims.back_to_hub')}
      </Link>

      <h1 className="page-title accent">
        {t('claims.title')}{currentItem ? ` - ${t(currentItem.titleKey)}` : ''}
      </h1>
      <p className="page-subtitle">{t('claims.form_subtitle')}</p>

      <p className="urgent-note">
        {t('site.emergency')}{' '}
        <a href={telHref(SITE.emergencyPhone)}>{SITE.emergencyPhone}</a>
      </p>
      <p className="deadline-note">{t('site.deadline')}</p>

      {error && <p className="alert">{error}</p>}
      {loading && <p className="center">{t('claims.loading')}</p>}

      {category && (
        <div className="form-wrap">
          <DynamicForm
            key={`${category.slug}-claim-${selectedType ?? 'general'}`}
            category={category}
            formType="claim"
            presetAnswers={selectedType ? { sinistre_type: selectedType } : undefined}
          />
        </div>
      )}
    </main>
  );
}

export default function PublicPage() {
  const [params] = useSearchParams();
  const routeParams = useParams();

  const isQuoteService = params.get('service') === 'devis';
  const claimTypeParam = params.get('type');
  const routeSlug = routeParams.slug;

  // Si on est sur une route /sinistre/:slug
  const matchedClaimFromSlug = routeSlug
    ? CLAIM_ITEMS.find((c) => c.key === routeSlug)?.type
    : undefined;

  const selectedClaimType = claimTypeParam || matchedClaimFromSlug;

  if (isQuoteService) {
    return <QuoteHub />;
  }

  // Si aucun type de sinistre précis n'a été cliqué, afficher d'abord le hub des sinistres
  if (!selectedClaimType) {
    return <ClaimHub />;
  }

  return <ClaimFlow selectedType={selectedClaimType} />;
}

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getCategories } from '../api';
import DynamicForm from '../components/DynamicForm';
import { PRODUCTS } from '../products';
import type { Category } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

export default function QuotePage() {
  const { slug = '' } = useParams();
  const { t } = useLanguage();
  const product = PRODUCTS.find((p) => p.key === slug || p.slug === slug);

  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Devis géré sur le site principal : on redirige vers son formulaire
  useEffect(() => {
    if (product?.mainQuoteUrl) {
      window.location.replace(product.mainQuoteUrl);
    }
  }, [product]);

  useEffect(() => {
    if (product?.mainQuoteUrl) return;

    let cancelled = false;
    getCategories('quote')
      .then((categories) => {
        if (cancelled) return;
        const targetSlug = product ? product.slug : slug;
        const found = categories.find((c) => c.slug === targetSlug || c.slug === slug) ?? null;
        setCategory(found);
        if (!found) setError("Ce devis n'est pas encore disponible.");
      })
      .catch(() => {
        if (!cancelled) setError('Impossible de charger le formulaire.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [product, slug]);

  if (product?.mainQuoteUrl) {
    return (
      <main className="page">
        <p className="center">Redirection…</p>
      </main>
    );
  }

  const label = product
    ? (product.labelKey ? t(product.labelKey) : product.label)
    : (category?.name ?? slug);

  return (
    <main className="page">
      <Link className="back-btn" to="/?service=devis">
        <ArrowLeft size={16} /> {t('quotes.title')}
      </Link>

      <h1 className="page-title accent">
        {t('quotes.title')} - {label}
      </h1>
      <p className="page-subtitle">{t('quotes.subtitle')}</p>

      {loading && <p className="center">Chargement du formulaire…</p>}
      {error && !loading && <p className="alert">{error}</p>}

      {category && (
        <div className="form-wrap">
          <DynamicForm key={`${category.slug}-quote`} category={category} formType="quote" />
        </div>
      )}
    </main>
  );
}

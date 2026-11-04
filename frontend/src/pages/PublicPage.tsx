import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { getCategories } from '../api';
import type { Category, FormType } from '../types';
import DynamicForm from '../components/DynamicForm';
import { getCategoryMeta } from '../components/categoryMeta';
import { MAIN_QUOTE_URL, QUOTE_ON_MAIN_SITE, SITE, telHref } from '../siteConfig';

export default function PublicPage() {
  const [params, setParams] = useSearchParams();
  const formType: FormType = params.get('service') === 'devis' ? 'quote' : 'claim';
  const isClaim = formType === 'claim';

  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Erreur inattendue.'))
      .finally(() => setLoading(false));
  }, []);

  // Le devis de cette catégorie existe déjà sur le site principal
  const quoteOnMainSite = (category: Category) =>
    !isClaim && QUOTE_ON_MAIN_SITE.includes(category.slug);

  const current = selected && !quoteOnMainSite(selected) ? selected : null;

  const switchService = (type: FormType) => {
    setSelected(null);
    setParams({ service: type === 'quote' ? 'devis' : 'sinistre' });
  };

  // Vue 2 : le formulaire
  if (current) {
    return (
      <main className="page">
        <button type="button" className="back-btn" onClick={() => setSelected(null)}>
          <ArrowLeft size={16} /> Retour au choix du type d'assurance
        </button>

        <h1 className="page-title accent">
          {isClaim ? 'Déclaration de sinistre' : 'Demande de devis'} - {current.name}
        </h1>
        <p className="page-subtitle">
          {isClaim
            ? 'Remplissez le formulaire ci-dessous pour déclarer votre sinistre.'
            : 'Remplissez le formulaire ci-dessous pour obtenir votre devis personnalisé.'}
        </p>

        <div className="form-wrap">
          <DynamicForm key={`${current.slug}-${formType}`} category={current} formType={formType} />
        </div>
      </main>
    );
  }

  // Vue 1 : choix du service et de la catégorie
  return (
    <main className="page">
      <h1 className="page-title">
        {isClaim ? 'Déclarez votre sinistre en ligne' : 'Demandez votre devis en ligne'}
      </h1>
      <p className="page-subtitle">
        {isClaim
          ? "Sélectionnez le type d'assurance concerné par votre sinistre."
          : "Sélectionnez le type d'assurance qui vous intéresse."}
      </p>

      <div className="service-tabs">
        <button
          type="button"
          className={isClaim ? 'active' : ''}
          aria-pressed={isClaim}
          onClick={() => switchService('claim')}
        >
          Déclarer un sinistre
        </button>
        <button
          type="button"
          className={!isClaim ? 'active' : ''}
          aria-pressed={!isClaim}
          onClick={() => switchService('quote')}
        >
          Demander un devis
        </button>
      </div>

      {isClaim && (
        <p className="urgent-note">
          En cas d'urgence, appelez notre ligne 24h/24 :{' '}
          <a href={telHref(SITE.emergencyPhone)}>{SITE.emergencyPhone}</a>
        </p>
      )}

      {error && <p className="alert">{error}</p>}
      {loading && <p className="center">Chargement…</p>}

      <div className="cat-grid">
        {categories.map((category) => {
          const meta = getCategoryMeta(category.slug);
          const external = quoteOnMainSite(category);

          const content = (
            <>
              <span className="cat-icon">{meta.icon}</span>
              <span className="cat-name">{category.name}</span>
              <span className="cat-desc">{meta.description}</span>
              {external && (
                <span className="cat-note">
                  Devis disponible sur le site principal <ExternalLink size={12} />
                </span>
              )}
            </>
          );

          return external ? (
            <a key={category.id} href={MAIN_QUOTE_URL} className={`cat-card tone-${meta.tone}`}>
              {content}
            </a>
          ) : (
            <button
              key={category.id}
              type="button"
              className={`cat-card tone-${meta.tone}`}
              onClick={() => setSelected(category)}
            >
              {content}
            </button>
          );
        })}
      </div>
    </main>
  );
}
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getCategories } from '../api';
import DynamicForm from '../components/DynamicForm';
import { PRODUCTS } from '../products';
import { CONTACT_URL, SITE, telHref } from '../siteConfig';
import type { Category, FormType } from '../types';

// Vue « devis » : une carte par type d'assurance.
// Les devis déjà gérés sur le site principal (auto, voyage, professionnelle)
// sont des liens sortants ; les autres ouvrent leur propre page locale.
function QuoteHub() {
  return (
    <main className="page hub">
      <h1 className="hub-title">Demandez votre devis en ligne</h1>
      <p className="hub-subtitle">Sélectionnez le type d'assurance qui vous intéresse</p>

      <div className="hub-grid">
        {PRODUCTS.map((product) => {
          const inner = (
            <>
              <span className="hub-icon">{product.icon}</span>
              <span className="hub-name">{product.label}</span>
              <span className="hub-desc">{product.description}</span>
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
        <h2>Vous ne trouvez pas ce que vous cherchez ?</h2>
        <p>Notre équipe est à votre disposition pour répondre à toutes vos demandes spécifiques.</p>
        <a className="hub-contact-btn" href={CONTACT_URL}>
          Nous contacter
        </a>
      </section>
    </main>
  );
}

// Vue « sinistre » : un seul formulaire général, qui s'adapte au type choisi
function ClaimFlow() {
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
      <h1 className="page-title accent">Déclaration de sinistre</h1>
      <p className="page-subtitle">
        Remplissez le formulaire ci-dessous. Il s'adaptera au type de sinistre que vous choisirez.
      </p>

      <p className="urgent-note">
        En cas d'urgence, appelez notre ligne 24h/24 :{' '}
        <a href={telHref(SITE.emergencyPhone)}>{SITE.emergencyPhone}</a>
      </p>
      <p className="deadline-note">
        Délai de déclaration : 5 jours ouvrés après le sinistre (48h en cas de vol).
      </p>

      {error && <p className="alert">{error}</p>}
      {loading && <p className="center">Chargement…</p>}

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

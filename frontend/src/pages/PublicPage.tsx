import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { getCategories } from '../api';
import DynamicForm from '../components/DynamicForm';
import { PRODUCTS } from '../products';
import type { Product } from '../products';
import { CONTACT_URL, SITE, telHref } from '../siteConfig';
import type { Category, FormType } from '../types';

// Carte par défaut pour une catégorie absente de products.tsx
function genericProduct(category: Category): Product {
  return {
    key: category.slug,
    label: category.name,
    description: "Découvrez cette solution d'assurance",
    icon: <FileText size={32} />,
    tone: 'gray',
    slug: category.slug,
  };
}

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

// Vue « sinistre » : choix de la catégorie puis formulaire intégré
function ClaimFlow() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getCategories('claim')
      .then(setCategories)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Erreur inattendue.'))
      .finally(() => setLoading(false));
  }, []);

  if (selected) {
    return (
      <main className="page">
        <button type="button" className="back-btn" onClick={() => setSelected(null)}>
          <ArrowLeft size={16} /> Retour au choix du type d'assurance
        </button>

        <h1 className="page-title accent">Déclaration de sinistre - {selected.name}</h1>
        <p className="page-subtitle">
          Remplissez le formulaire ci-dessous pour déclarer votre sinistre.
        </p>

        <div className="form-wrap">
          <DynamicForm key={`${selected.slug}-claim`} category={selected} formType="claim" />
        </div>
      </main>
    );
  }

  const bySlug = new Map(categories.map((c) => [c.slug, c]));
  const knownSlugs = new Set(PRODUCTS.map((p) => p.slug).filter((s): s is string => s !== null));

  const items: { product: Product; category: Category }[] = [];
  PRODUCTS.forEach((product) => {
    const category = product.slug ? bySlug.get(product.slug) : undefined;
    if (category) items.push({ product, category });
  });

  categories
    .filter((c) => !knownSlugs.has(c.slug))
    .forEach((c) => items.push({ product: genericProduct(c), category: c }));

  return (
    <main className="page hub">
      <h1 className="hub-title">Déclarez votre sinistre en ligne</h1>
      <p className="hub-subtitle">
        Sélectionnez le type d'assurance concerné par votre sinistre
      </p>

      <p className="urgent-note">
        En cas d'urgence, appelez notre ligne 24h/24 :{' '}
        <a href={telHref(SITE.emergencyPhone)}>{SITE.emergencyPhone}</a>
      </p>

      {error && <p className="alert">{error}</p>}
      {loading && <p className="center">Chargement…</p>}

      {!loading && items.length === 0 && !error && (
        <p className="center">Aucun formulaire disponible pour le moment.</p>
      )}

      {!loading && items.length > 0 && (
        <div className="hub-grid">
          {items.map(({ product, category }) => (
            <button
              key={product.key}
              type="button"
              className={`hub-card tone-${product.tone}`}
              onClick={() => category && setSelected(category)}
            >
              <span className="hub-icon">{product.icon}</span>
              <span className="hub-name">{product.label}</span>
              <span className="hub-desc">{product.description}</span>
            </button>
          ))}
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
